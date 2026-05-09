/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, DataSourceManager, UrlManager, getAppStore } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import { Button } from 'jimu-ui'
import { createPortal } from 'react-dom'
import type { IMConfig, TabConfig } from '../config'
import { defaultConfig, DEFAULT_FIELD_LAYOUTS } from '../config'
import AnteprimaPanel from './anteprima-panel'

type MsgKind = 'info' | 'ok' | 'err'
type Msg = { kind: MsgKind; text: string }

type SelState = {
  ds: any
  oid: number | null
  idFieldName: string
  data: any | null
  sig: string
  layerUrl?: string
}

function unwrapJsapiLayer (maybe: any) {
  return (maybe && (maybe.layer || maybe)) || null
}

function pickAttrCI (obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined
  const low = new Map<string, any>()
  Object.keys(obj).forEach((k) => low.set(String(k).toLowerCase(), (obj as any)[k]))
  for (const k of keys) {
    const kk = String(k || '').toLowerCase()
    if (low.has(kk)) return low.get(kk)
  }
  return undefined
}


function normalizeFeatureLayerUrl (raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    const u = new URL(s)
    if (!/^https?:$/i.test(u.protocol)) return ''
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

// Assicura che la URL di un FeatureLayer termini con l'indice del layer (es. /0).
// Se la URL punta al FeatureServer senza indice, appende /0 come default.
// Questo è necessario per costruire URL REST valide tipo /{oid}/addAttachment.
function ensureLayerIndex (url: string, layer?: any): string {
  if (!url) return url
  // Se termina già con /digits è OK
  if (/\/\d+$/.test(url)) return url
  // Prova a leggere layerId dal layer JSAPI
  const layerId = layer?.layerId ?? layer?.layerIndex
  if (layerId != null && Number.isFinite(Number(layerId))) return `${url}/${Number(layerId)}`
  // Default: /0
  if (/\/(FeatureServer|MapServer)\s*$/i.test(url)) return `${url}/0`
  return url
}



function getRequestedEditSection (opts?: { skipUrl?: boolean }): 'anagrafica' | 'violazione' | 'dati_tecnici' | 'nota_spese' | 'allegati' | 'anteprima' | null {
  const normalize = (raw: any): string => String(raw || '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const parseFrom = (raw: string): string => {
    const text = String(raw || '')
    if (!text) return ''
    const qPos = text.indexOf('?')
    if (qPos < 0) return ''
    const query = text.slice(qPos + 1)
    const hashPos = query.indexOf('#')
    const clean = hashPos >= 0 ? query.slice(0, hashPos) : query
    try {
      return new URLSearchParams(clean).get('section') || ''
    } catch {
      return ''
    }
  }
  const mapSection = (raw: any): 'anagrafica' | 'violazione' | 'dati_tecnici' | 'nota_spese' | 'allegati' | 'anteprima' | null => {
    switch (normalize(raw)) {
      case 'anagrafica': return 'anagrafica'
      case 'violazione': return 'violazione'
      case 'dati-tecnici':
      case 'luoghi':
      case 'luoghi-e-dati-tecnici':
      case 'luoghi-dati-tecnici':
      case 'localizzazione-e-dati-tecnici':
        return 'dati_tecnici'
      case 'nota-spese': return 'nota_spese'
      case 'allegati': return 'allegati'
      case 'anteprima': return 'anteprima'
      default: return null
    }
  }
  if (!opts?.skipUrl) {
    try {
      const fromUrl = mapSection(parseFrom(window.location.search || '') || parseFrom(window.location.hash || '') || parseFrom(window.location.href || ''))
      if (fromUrl) {
        try {
          const url = new URL(window.location.href)
          if (url.searchParams.has('section')) {
            url.searchParams.delete('section')
            window.history.replaceState(null, '', url.toString())
          }
        } catch {}
        return fromUrl
      }
    } catch {}
  }
  try {
    const fromNav = mapSection(window.sessionStorage.getItem('GII_NAV_SECTION'))
    if (fromNav) { try { window.sessionStorage.removeItem('GII_NAV_SECTION') } catch {} return fromNav }
  } catch {}
  try {
    const fromRequested = mapSection(window.sessionStorage.getItem('GII_REQUESTED_EDIT_SECTION'))
    if (fromRequested) { try { window.sessionStorage.removeItem('GII_REQUESTED_EDIT_SECTION') } catch {} return fromRequested }
  } catch {}
  return null
}

function getGlobalOverlayHost (): HTMLElement | null {
  try {
    const topBody = (window as any)?.top?.document?.body
    if (topBody) return topBody as HTMLElement
  } catch {}
  try {
    if (typeof document !== 'undefined' && document.body) return document.body as HTMLElement
  } catch {}
  return null
}

function getGlobalOverlayDocument (): Document | null {
  const host = getGlobalOverlayHost()
  return (host?.ownerDocument || (typeof document !== 'undefined' ? document : null)) as Document | null
}


type GiiLockRect = {
  key: string
  left: number
  top: number
  width: number
  height: number
}

function findGiiWidgetElement (doc: Document, widgetId: string): HTMLElement | null {
  const id = String(widgetId || '').trim()
  if (!id) return null
  const selectors = [
    `[data-widgetid="${id}"]`,
    `[data-widget-id="${id}"]`,
    `[widgetid="${id}"]`,
    `[id="${id}"]`,
    `#${id}`
  ]
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel) as HTMLElement | null
      if (el) return el
    } catch {}
  }
  return null
}

function getVisibleLockRect (el: HTMLElement, key: string, viewW: number, viewH: number, win: Window): GiiLockRect | null {
  try {
    if (!el || !el.isConnected) return null
    const st = win.getComputedStyle?.(el)
    if (st && (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0')) return null
    const r = el.getBoundingClientRect()
    const left = Math.max(0, Math.floor(r.left))
    const top = Math.max(0, Math.floor(r.top))
    const right = Math.min(viewW, Math.ceil(r.right))
    const bottom = Math.min(viewH, Math.ceil(r.bottom))
    const width = Math.max(0, right - left)
    const height = Math.max(0, bottom - top)
    if (width < 2 || height < 2) return null
    return { key, left, top, width, height }
  } catch {
    return null
  }
}

function DirtyNavigationLockOverlay (props: { active: boolean; targetRef: React.RefObject<HTMLElement | null> }) {
  const { active, targetRef } = props
  const [rects, setRects] = React.useState<GiiLockRect[]>([])

  const computeRects = React.useCallback(() => {
    if (!active) { setRects([]); return }
    const host = getGlobalOverlayHost()
    if (!host) { setRects([]); return }
    const doc = host.ownerDocument || document
    const win = doc.defaultView || window
    const viewW = Math.max(0, win.innerWidth || doc.documentElement?.clientWidth || 0)
    const viewH = Math.max(0, win.innerHeight || doc.documentElement?.clientHeight || 0)

    // La maschera non dipende più da un'area libera calcolata a pixel.
    // Oscura solo gli elementi che devono essere bloccati:
    // - header GII;
    // - navigazione sinistra principale delle pagine Nuovo/Modifica rapporto.
    // Il pulsante della barra laterale resta libero perché non oscuriamo il widget sidebar,
    // ma solo il widget gii-nav contenuto nel suo primo pannello.
    const idsToMask = [
      'widget_840',  // GII Header
      'widget_1319', // GII Navigazione - Nuovo Rapporto
      'widget_1371'  // GII Navigazione - Modifica Rapporto
    ]

    const next: GiiLockRect[] = []
    for (const id of idsToMask) {
      const el = findGiiWidgetElement(doc, id)
      const rect = el ? getVisibleLockRect(el, id, viewW, viewH, win) : null
      if (rect) next.push(rect)
    }

    // Fallback prudente: se per qualche motivo gli id ExB non sono reperibili,
    // blocca almeno la fascia alta e la parte sinistra fino all'inizio del widget editing.
    if (next.length === 0 && targetRef.current) {
      try {
        const r = targetRef.current.getBoundingClientRect()
        const headerH = Math.max(0, Math.floor(r.top))
        const leftW = Math.max(0, Math.floor(r.left))
        if (headerH > 0) next.push({ key: 'fallback-header', left: 0, top: 0, width: viewW, height: headerH })
        if (leftW > 0) next.push({ key: 'fallback-left', left: 0, top: headerH, width: leftW, height: Math.max(0, viewH - headerH) })
      } catch {}
    }

    setRects(next)
  }, [active, targetRef])

  React.useEffect(() => {
    if (!active) { setRects([]); return }
    const host = getGlobalOverlayHost()
    const doc = host?.ownerDocument || document
    const win = doc.defaultView || window
    let raf = 0
    const schedule = () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { raf = win.requestAnimationFrame(computeRects) } catch { computeRects() }
    }

    schedule()

    let ro: ResizeObserver | null = null
    try {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(schedule)
        const observed = new Set<Element>()
        for (const id of ['widget_840', 'widget_1319', 'widget_1371']) {
          const el = findGiiWidgetElement(doc, id)
          if (el && !observed.has(el)) {
            observed.add(el)
            ro.observe(el)
          }
        }
        if (targetRef.current && !observed.has(targetRef.current)) ro.observe(targetRef.current)
      }
    } catch { ro = null }

    win.addEventListener('resize', schedule, true)
    win.addEventListener('scroll', schedule, true)
    const id = win.setInterval(schedule, 300)

    return () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { ro?.disconnect() } catch {}
      try { win.removeEventListener('resize', schedule, true) } catch {}
      try { win.removeEventListener('scroll', schedule, true) } catch {}
      try { win.clearInterval(id) } catch {}
    }
  }, [active, computeRects, targetRef])


  if (!active || rects.length === 0) return null

  const host = getGlobalOverlayHost()
  if (!host) return null

  const stop = (e: any) => {
    try { e.preventDefault() } catch {}
    try { e.stopPropagation() } catch {}
  }
  const maskBase: React.CSSProperties = {
    position: 'fixed',
    zIndex: 2147483000,
    background: 'rgba(0,0,0,0.52)',
    pointerEvents: 'auto',
    touchAction: 'none'
  }
  const mask = (rect: GiiLockRect) => (
    <div
      key={rect.key}
      data-gii-dirty-lock-mask='1'
      aria-hidden='true'
      style={{ ...maskBase, left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={stop}
      onDoubleClick={stop}
      onWheel={stop}
      onTouchStart={stop}
    />
  )

  return createPortal(
    <>
      {rects.map(mask)}
    </>,
    host
  )
}

// Caricamento moduli ArcGIS JS API (AMD) senza dipendenze extra.
function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) {
      reject(new Error('AMD require non disponibile'))
      return
    }
    try {
      req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
    } catch (e) {
      reject(e)
    }
  })
}

/** Normalizza un token rimuovendo trattini/spazi per confronto fuzzy slug↔label */
function normPageToken (s: string): string {
  return s.toLowerCase().replace(/[-_\s]+/g, '')
}

/** Risolve un page token (slug/name/id/label) al pageId reale ExB — pattern condiviso con gii-nav */
function resolvePageId (pageTokenRaw: string): string | null {
  const tok0 = (pageTokenRaw || '').trim()
  if (!tok0) return null
  let tok = tok0.replace(/^#+\/?/, '').replace(/^\/+/, '')
  if (tok.startsWith('page/')) tok = tok.slice(5)
  try {
    const state: any = getAppStore()?.getState?.()
    const appConfig: any = state?.appConfig
    const rawPages: any = appConfig?.pages ?? {}
    const pagesMap: Record<string, any> =
      rawPages?.asMutable ? rawPages.asMutable({ deep: true }) :
      rawPages?.toJS ? rawPages.toJS() :
      rawPages
    if (pagesMap && pagesMap[tok]) return tok
    const hist = appConfig?.historyLabels?.page || {}
    const tokNorm = normPageToken(tok)
    for (const [pageId, pg] of Object.entries(pagesMap || {})) {
      if (!pg) continue
      if ((pg as any).name === tok) return pageId
      if (hist && hist[pageId] === tok) return pageId
      if ((pg as any).label === tok || (pg as any).title === tok) return pageId
      // Match normalizzato: slug URL (trattini) ↔ label (spazi)
      if (normPageToken((pg as any).label || '') === tokNorm) return pageId
      if (normPageToken((pg as any).title || '') === tokNorm) return pageId
    }
  } catch { /* ignore */ }
  return null
}

// In Experience Builder, una Data View / Output Data Source può non esporre direttamente un FeatureLayer.
// Questa funzione prova più strade (DS corrente, DS da manager, DS padre) e, se serve, crea un FeatureLayer dal URL.
async function resolveFeatureLayerForAttachments (ds: any, preferredUrl?: string | null): Promise<any | null> {
  if (!ds) return null

  const candidates: any[] = []
  const push = (x: any) => {
    if (x && !candidates.includes(x)) candidates.push(x)
  }

  push(ds)

  try {
    const dm = DataSourceManager.getInstance()
    const byId = ds?.id ? dm.getDataSource(ds.id) : null
    push(byId)
    const belongId = ds?.belongToDataSource
    if (typeof belongId === 'string' && belongId) push(dm.getDataSource(belongId))
  } catch {
    // ignore
  }

  const urls: string[] = []
  const pushUrl = (u: any) => {
    const s = normalizeFeatureLayerUrl(u)
    if (s && !urls.includes(s)) urls.push(s)
  }

  pushUrl(preferredUrl)

  for (const c of candidates) {
    const cAny: any = c
    const l = unwrapJsapiLayer(
      (typeof cAny.getLayer === 'function' ? cAny.getLayer() : null) ??
      (typeof cAny.getJsApiLayer === 'function' ? cAny.getJsApiLayer() : null) ??
      (typeof cAny.getJSAPILayer === 'function' ? cAny.getJSAPILayer() : null) ??
      cAny.layer
    ) as any
    pushUrl(l?.url)
    pushUrl(cAny?.getDataSourceJson?.()?.url ?? cAny?.dataSourceJson?.url)
  }

  // 1) Prova prima i layer già esistenti nei candidati (più affidabili perché già caricati da ExB/mappa)
  for (const c of candidates) {
    const cAny: any = c
    const l = unwrapJsapiLayer(
      (typeof cAny.getLayer === 'function' ? cAny.getLayer() : null) ??
      (typeof cAny.getJsApiLayer === 'function' ? cAny.getJsApiLayer() : null) ??
      (typeof cAny.getJSAPILayer === 'function' ? cAny.getJSAPILayer() : null) ??
      cAny.layer
    ) as any
    if (l && typeof l.queryAttachments === 'function' && (typeof l.addAttachment === 'function' || l.url)) return l
  }

  // 2) Se nessun candidato ha un layer pronto, crea un FeatureLayer dagli URL noti.
  //    Controlla loadStatus === 'loaded' per evitare di restituire layer "rotti"
  //    il cui load è fallito silenziosamente.
  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    for (const url of urls) {
      try {
        const fl = new FeatureLayer({ url })
        if (typeof fl?.load === 'function') await fl.load()
        if (fl && (fl.loadStatus === 'loaded' || fl.loaded === true) && typeof fl.queryAttachments === 'function') return fl
      } catch {
        // Questo URL non funziona, prova il prossimo
      }
    }
  } catch {
    // loadEsriModule fallito
  }

  // 3) Ultima risorsa: ripeti la scansione candidati per layer con solo url (senza queryAttachments verificato)
  pushUrl(preferredUrl)
  for (const c of candidates) {
    const cAny: any = c
    const l = unwrapJsapiLayer(
      (typeof cAny.getLayer === 'function' ? cAny.getLayer() : null) ??
      (typeof cAny.getJsApiLayer === 'function' ? cAny.getJsApiLayer() : null) ??
      (typeof cAny.getJSAPILayer === 'function' ? cAny.getJSAPILayer() : null) ??
      cAny.layer
    ) as any
    if (l && l.url && (typeof l.addAttachment === 'function' || typeof l.queryAttachments === 'function')) return l
  }

  return null
}


function getAttachmentOidFieldName (layer: any, ds?: any): string {
  const fromLayer = layer?.objectIdField ? String(layer.objectIdField) : ''
  const fromDs = (typeof ds?.getIdField === 'function' ? String(ds.getIdField() || '') : '')
  return fromLayer || fromDs || 'OBJECTID'
}

async function queryFeatureAttachments (layer: any, oid: number, ds?: any, preferredUrl?: string | null): Promise<any[]> {
  if (!layer || !oid) return []

  const pullInfos = (obj: any): any[] => {
    if (!obj) return []
    if (Array.isArray(obj)) return obj
    if (Array.isArray(obj.attachmentInfos)) return obj.attachmentInfos
    if (Array.isArray(obj.attachments)) return obj.attachments
    return []
  }

  const oidField = getAttachmentOidFieldName(layer, ds)

  try {
    if (typeof layer.queryAttachments === 'function') {
      const featureRef = { attributes: { [oidField]: oid } }
      let res: any = null
      try {
        res = await layer.queryAttachments(featureRef, { returnMetadata: true, returnUrl: true })
      } catch {
        res = await layer.queryAttachments(featureRef)
      }
      if (Array.isArray(res)) {
        for (const g of res) {
          const pid = (g && g.parentObjectId != null) ? g.parentObjectId : (g && g.objectId != null ? g.objectId : null)
          if (pid === oid) return pullInfos(g)
        }
      } else if (res && typeof res === 'object') {
        if (Array.isArray(res.attachmentGroups)) {
          for (const g of res.attachmentGroups) {
            const pid = (g && g.parentObjectId != null) ? g.parentObjectId : (g && g.objectId != null ? g.objectId : null)
            if (pid === oid) return pullInfos(g)
          }
        } else if ((res as any)[oid]) {
          return pullInfos((res as any)[oid])
        } else if ((res as any)[String(oid)]) {
          return pullInfos((res as any)[String(oid)])
        } else if ((res as any).attachmentInfos) {
          return pullInfos(res)
        }
      }
    }
  } catch {
    // fallback REST sotto
  }

  const layerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(preferredUrl) || normalizeFeatureLayerUrl(layer?.url), layer)
  if (!layerUrl) return []
  let token = ''
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(layerUrl) || IdentityManager?.findCredential?.(layerUrl.replace(/\/\d+$/, ''))
    token = cred?.token ? String(cred.token) : ''
  } catch {}
  try {
    const qs = new URLSearchParams({ f: 'json', objectIds: String(oid), returnMetadata: 'true', returnUrl: 'true' })
    if (token) qs.set('token', token)
    const url = `${layerUrl}/queryAttachments?${qs.toString()}`
    const resp = await fetch(url)
    const json: any = await resp.json()
    if (Array.isArray(json?.attachmentGroups)) {
      for (const g of json.attachmentGroups) {
        const pid = (g && g.parentObjectId != null) ? g.parentObjectId : (g && g.objectId != null ? g.objectId : null)
        if (pid === oid) return pullInfos(g)
      }
    }
    if (json && typeof json === 'object') {
      if ((json as any)[oid]) return pullInfos((json as any)[oid])
      if ((json as any)[String(oid)]) return pullInfos((json as any)[String(oid)])
      if ((json as any).attachmentInfos) return pullInfos(json)
    }
  } catch {
    // ignore
  }

  return []
}

async function uploadFilesToFeatureAttachments (ds: any, oid: number, files: File[], preferredUrl?: string | null): Promise<Array<{ id: number; name?: string; size?: number; contentType?: string; url?: string }>> {
  if (!oid || !Array.isArray(files) || files.length === 0) return []
  const layer = await resolveFeatureLayerForAttachments(ds, preferredUrl)
  if (!layer) throw new Error('Non riesco a risalire al FeatureLayer per caricare gli allegati.')

  const oidField = getAttachmentOidFieldName(layer, ds)
  const featureRef = { attributes: { [oidField]: oid } }
  const layerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(preferredUrl) || normalizeFeatureLayerUrl(layer?.url), layer)
  let token = ''
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(layerUrl) || IdentityManager?.findCredential?.(layerUrl.replace(/\/\d+$/, ''))
    token = cred?.token ? String(cred.token) : ''
  } catch {}
  const buildUrl = (attId: any) => {
    const base = layerUrl && attId != null ? `${layerUrl}/${oid}/attachments/${attId}` : ''
    if (!base) return undefined
    if (!token) return base
    return `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  }
  const out: Array<{ id: number; name?: string; size?: number; contentType?: string; url?: string }> = []

  if (typeof layer.addAttachment === 'function') {
    try {
      for (const file of files) {
        const res = await layer.addAttachment(featureRef, file)
        const attId = Number(res?.attachmentId ?? res?.objectId ?? res?.id)
        out.push({
          id: !isNaN(attId) ? attId : -Date.now(),
          name: file.name,
          size: file.size,
          contentType: file.type || undefined,
          url: !isNaN(attId) ? buildUrl(attId) : undefined
        })
      }
      return out
    } catch {
      // fallback REST sotto
    }
  }

  if (layerUrl) {
    for (const file of files) {
      const fd = new FormData()
      fd.append('attachment', file)
      fd.append('f', 'json')
      if (token) fd.append('token', token)
      const res = await fetch(`${layerUrl}/${oid}/addAttachment`, {
        method: 'POST',
        body: fd
      })
      const j = await res.json().catch(() => ({}))
      const addRes = j?.addAttachmentResult || j
      if (!res.ok || addRes?.error) {
        const msg = addRes?.error?.message || j?.error?.message || `HTTP ${res.status}`
        throw new Error(String(msg))
      }
      const attId = Number(addRes?.objectId ?? addRes?.attachmentId ?? addRes?.id)
      out.push({
        id: !isNaN(attId) ? attId : -Date.now(),
        name: file.name,
        size: file.size,
        contentType: file.type || undefined,
        url: !isNaN(attId) ? buildUrl(attId) : undefined
      })
    }
    return out
  }

  throw new Error('URL del FeatureLayer non disponibile per il caricamento allegati.')
}

async function deleteFeatureAttachmentsFromFeature (ds: any, oid: number, attachmentIds: number[], preferredUrl?: string | null): Promise<number[]> {
  const ids = Array.isArray(attachmentIds) ? attachmentIds.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0) : []
  if (!oid || ids.length === 0) return []
  const layer = await resolveFeatureLayerForAttachments(ds, preferredUrl)
  if (!layer && !preferredUrl) throw new Error('Non riesco a risalire al FeatureLayer per eliminare gli allegati.')

  const oidField = getAttachmentOidFieldName(layer, ds)
  const featureRef = { attributes: { [oidField]: oid } }
  const layerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(preferredUrl) || normalizeFeatureLayerUrl(layer?.url), layer)
  let token = ''
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(layerUrl) || IdentityManager?.findCredential?.(layerUrl.replace(/\/\d+$/, ''))
    token = cred?.token ? String(cred.token) : ''
  } catch {}

  if (layer && typeof layer.deleteAttachments === 'function') {
    try {
      const res = await layer.deleteAttachments(featureRef, ids)
      const list = Array.isArray(res) ? res : (Array.isArray((res as any)?.deleteAttachmentResults) ? (res as any).deleteAttachmentResults : [])
      const okIds = list
        .filter((r: any) => !(r?.error) && (r?.success === true || r?.success == null))
        .map((r: any) => Number(r?.objectId ?? r?.attachmentId ?? r?.id))
        .filter((v: number) => Number.isFinite(v) && v > 0)
      if (okIds.length > 0) return okIds
    } catch {
      // fallback REST sotto
    }
  }

  if (layerUrl) {
    const fd = new FormData()
    fd.append('f', 'json')
    fd.append('attachmentIds', ids.join(','))
    if (token) fd.append('token', token)
    const res = await fetch(`${layerUrl}/${oid}/deleteAttachments`, { method: 'POST', body: fd })
    const j = await res.json().catch(() => ({}))
    const list = Array.isArray(j?.deleteAttachmentResults) ? j.deleteAttachmentResults : []
    const err = j?.error
    if (!res.ok || err) {
      const msg = err?.message || `HTTP ${res.status}`
      throw new Error(String(msg))
    }
    return list
      .filter((r: any) => !(r?.error) && (r?.success === true || r?.success == null))
      .map((r: any) => Number(r?.objectId ?? r?.attachmentId ?? r?.id))
      .filter((v: number) => Number.isFinite(v) && v > 0)
  }

  throw new Error('URL del FeatureLayer non disponibile per eliminare gli allegati.')
}


function buildAttachmentRawUrl (att: any, oid: number, preferredUrl?: string | null): string {
  const attId = Number(att?.id)
  const layerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(preferredUrl))
  const rawCandidate = typeof att?.url === 'string' ? String(att.url).trim() : ''
  if (rawCandidate) {
    if (/^(blob:|data:|https?:)/i.test(rawCandidate)) return rawCandidate
    if (rawCandidate.startsWith('/')) {
      try {
        const origin = typeof window !== 'undefined' ? String(window.location?.origin || '').trim() : ''
        if (origin) return `${origin}${rawCandidate}`
      } catch {}
    }
    if (/^[^\s]+$/i.test(rawCandidate)) return rawCandidate
  }
  if (layerUrl && oid != null && !isNaN(attId) && attId > 0) return `${layerUrl}/${oid}/attachments/${attId}`
  return ''
}

async function openAttachmentInNewTab (att: any, oid: number, preferredUrl?: string | null): Promise<void> {
  const layerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(preferredUrl))
  const rawUrl = buildAttachmentRawUrl(att, oid, preferredUrl)
  if (!rawUrl) throw new Error('URL allegato non disponibile.')

  let token = ''
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const baseForCred = layerUrl || rawUrl
    const cred = IdentityManager?.findCredential?.(baseForCred) || IdentityManager?.findCredential?.(baseForCred.replace(/\/\d+$/, ''))
    token = cred?.token ? String(cred.token) : ''
  } catch {}

  let finalUrl = rawUrl
  if (token && !/[?&]token=/.test(finalUrl) && /^https?:/i.test(finalUrl)) {
    finalUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  }

  const resp = await fetch(finalUrl, { credentials: 'same-origin' })
  if (!resp.ok) throw new Error(`Apertura allegato fallita (HTTP ${resp.status}).`)
  const blob = await resp.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => {
    try { URL.revokeObjectURL(blobUrl) } catch {}
  }, 60000)
}



type SelectedFeatureCacheEntry = {
  layerUrl: string
  oid: number
  idFieldName: string
  data: any
  ts: number
  source: 'edit' | 'list' | 'detail' | 'azioni'
}

function getSelectedFeatureCacheBucket (): Record<string, SelectedFeatureCacheEntry> {
  try {
    const w: any = window as any
    w.__giiSelectedFeatureCache = w.__giiSelectedFeatureCache || {}
    return w.__giiSelectedFeatureCache
  } catch {
    return {}
  }
}

function getSelectedFeatureCacheKey (layerUrl: string, oid: any): string {
  return `${String(layerUrl || '').trim()}::${Number(oid)}`
}

function readSelectedFeatureCache (layerUrl: string, oid: any): SelectedFeatureCacheEntry | null {
  try {
    const key = getSelectedFeatureCacheKey(layerUrl, oid)
    const bucket = getSelectedFeatureCacheBucket()
    const e: any = bucket[key]
    if (!e || !e.layerUrl || !Number.isFinite(Number(e.oid))) return null
    return e as SelectedFeatureCacheEntry
  } catch {
    return null
  }
}

function writeSelectedFeatureCache (
  layerUrl: string,
  oid: any,
  idFieldName: string,
  data: any,
  source: 'edit' | 'list' | 'detail' | 'azioni'
): SelectedFeatureCacheEntry | null {
  try {
    const oidNum = Number(oid)
    const url = String(layerUrl || '').trim()
    if (!url || !Number.isFinite(oidNum) || !data || typeof data !== 'object') return null
    const key = getSelectedFeatureCacheKey(url, oidNum)
    const bucket = getSelectedFeatureCacheBucket()
    const prev: any = bucket[key]
    const now = Date.now()
    const holdMs = 15000
    let nextData = { ...(data || {}) }
    let nextSource: 'edit' | 'list' | 'detail' | 'azioni' = source
    let nextTs = now
    if (prev && prev.source === 'edit' && source !== 'edit' && (now - Number(prev.ts || 0) < holdMs)) {
      nextData = { ...(data || {}), ...(prev.data || {}) }
      nextSource = 'edit'
      nextTs = Number(prev.ts || now)
    }
    const next: SelectedFeatureCacheEntry = {
      layerUrl: url,
      oid: oidNum,
      idFieldName: String(idFieldName || prev?.idFieldName || 'OBJECTID') || 'OBJECTID',
      data: nextData,
      ts: nextTs,
      source: nextSource
    }
    bucket[key] = next
    return next
  } catch {
    return null
  }
}

function invalidateRuntimeProxyCache (layerUrl?: string | null) {
  try {
    const url = String(layerUrl || '').trim()
    if (!url) {
      try { delete (window as any).__giiRuntimeDsProxyCache } catch {}
      return
    }
    try {
      const bucket = (window as any).__giiRuntimeDsProxyCache
      if (bucket && typeof bucket === 'object') delete bucket[url]
    } catch {}
  } catch {}
}
function isFiniteNum (n: any): boolean {
  return typeof n === 'number' && Number.isFinite(n)
}

function isValidOfficePoint (lon: any, lat: any): boolean {
  if (!isFiniteNum(lon) || !isFiniteNum(lat)) return false
  // evita default 0,0 (non configurato)
  if (Number(lon) === 0 && Number(lat) === 0) return false
  // range WGS84
  if (Number(lon) < -180 || Number(lon) > 180) return false
  if (Number(lat) < -90 || Number(lat) > 90) return false
  return true
}

function makeWgs84Point (lon: number, lat: number): any {
  return { x: lon, y: lat, spatialReference: { wkid: 4326 } }
}

/** Converte un plain WGS84 {x,y} in un vero esri/geometry/Point nella SR del layer (riproiettando se serve) */
async function toLayerPoint (wgs84: any, layer: any): Promise<any | null> {
  if (!wgs84 || !isFiniteNum(wgs84.x) || !isFiniteNum(wgs84.y)) return null
  try {
    const Point = await loadEsriModule<any>('esri/geometry/Point')
    const pt4326 = new Point({ longitude: Number(wgs84.x), latitude: Number(wgs84.y), spatialReference: { wkid: 4326 } })

    // Determina la SR del layer
    const layerSr = layer?.spatialReference?.wkid || layer?.sourceJSON?.spatialReference?.wkid || 4326
    if (layerSr === 4326) return pt4326

    // Web Mercator
    if (layerSr === 3857 || layerSr === 102100) {
      try {
        const wmu = await loadEsriModule<any>('esri/geometry/support/webMercatorUtils')
        return wmu?.geographicToWebMercator?.(pt4326) || pt4326
      } catch { return pt4326 }
    }

    // Altro SR: usa projection
    try {
      const SpatialReference = await loadEsriModule<any>('esri/geometry/SpatialReference')
      const projection = await loadEsriModule<any>('esri/geometry/projection')
      if (projection?.load) await projection.load()
      return projection?.project?.(pt4326, new SpatialReference({ wkid: layerSr })) || pt4326
    } catch { return pt4326 }
  } catch {
    return wgs84  // fallback al plain object
  }
}

async function toWgs84Point (mapPoint: any): Promise<any | null> {
  if (!mapPoint) return null
  const sr = mapPoint?.spatialReference?.wkid
  if (sr === 4326) {
    const lon = isFiniteNum(mapPoint.longitude) ? mapPoint.longitude : mapPoint.x
    const lat = isFiniteNum(mapPoint.latitude) ? mapPoint.latitude : mapPoint.y
    if (!isFiniteNum(lon) || !isFiniteNum(lat)) return null
    return makeWgs84Point(Number(lon), Number(lat))
  }

  // WebMercator (3857/102100)
  if (sr === 3857 || sr === 102100) {
    try {
      const webMercatorUtils = await loadEsriModule<any>('esri/geometry/support/webMercatorUtils')
      const g = webMercatorUtils?.webMercatorToGeographic?.(mapPoint)
      if (g) return makeWgs84Point(Number(g.x), Number(g.y))
    } catch { /* ignore */ }
  }

  // Fallback: projection
  try {
    const SpatialReference = await loadEsriModule<any>('esri/geometry/SpatialReference')
    const projection = await loadEsriModule<any>('esri/geometry/projection')
    if (projection?.load) await projection.load()
    const out = projection?.project?.(mapPoint, new SpatialReference({ wkid: 4326 }))
    if (out) return makeWgs84Point(Number(out.x), Number(out.y))
  } catch { /* ignore */ }

  return null
}


function pickOidFromData (data: any, idFieldName: string) {
  if (!data) return null
  if (idFieldName && data[idFieldName] != null) return data[idFieldName]
  return data.OBJECTID ?? data.ObjectId ?? data.objectid ?? data.objectId ?? null
}

function norm (v: any): string {
  return String(v ?? '').trim().toLowerCase()
}



function normKey (v: any): string {
  // lowercase + remove diacritics + replace non-alphanum with spaces
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}


// Survey (XLS) — req_point
const NORMA3_REQ_POINT = new Set([
  'Art12','Art27','Art28','Art30','Art31','Art32','Art33','Art34','Art35','Art36','Art37','Art39'
])

function parseMultiSelect (val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map(String)
  // Survey123 salva select_multiple spesso come stringa separata da spazio
  return String(val).split(/\s+/).filter(Boolean)
}

function computeReqPoint (attrs: Record<string, any>): 0 | 1 {
  const p = String(attrs?.norma15_parziale ?? '')
  const t = String(attrs?.norma15_totale ?? '')
  if (p === 'Art15.1' || p === 'Art15.2') return 1
  if (t === 'Art15.3' || t === 'Art15.4') return 1

  const norma3 = parseMultiSelect(attrs?.norma_violata3)
  if (norma3.some(v => NORMA3_REQ_POINT.has(v))) return 1
  return 0
}


function isEmptyValue (v: any): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

function escRe (s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasToken (hay: string, token: string): boolean {
  const h = normKey(hay)
  const t = normKey(token)
  if (!t) return false
  const re = new RegExp(`(^| )${escRe(t)}( |$)`)
  return re.test(h)
}

function normalizeAreaCode (v: any): 'AGR' | 'TEC' | 'AMM' | '' {
  const s = String(v ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === '2' || s === 'AGR' || s === 'AGRICOLA' || s === 'AGRICOLTURA') return 'AGR'
  if (s === '3' || s === 'TEC' || s === 'TECNICA' || s === 'TECNICO') return 'TEC'
  if (s === '1' || s === 'AMM' || s === 'AMMINISTRATIVA' || s === 'AMMINISTRAZIONE') return 'AMM'
  return ''
}

function normalizeSettoreCode (area: string, v: any): string {
  const s = String(v ?? '').trim().toUpperCase()
  if (!s) return ''
  if (area === 'AGR') {
    if (/^[1-6]$/.test(s)) return `D${s}`
    const m = s.match(/^D?\s*([1-6])$/)
    if (m) return `D${m[1]}`
    const md = s.match(/(?:DISTRETTO|SETTORE|DISTR\.)\s*D?\s*([1-6])/)
    if (md) return `D${md[1]}`
  }
  if (area === 'TEC') {
    if (s === 'DS' || s === 'D S') return 'DS'
  }
  if (area === 'AMM') {
    if (s === 'CR' || s === 'C R') return 'CR'
    if (s === 'ALL' || s === 'TUTTI' || s === 'TUTTE') return 'ALL'
  }
  return s
}

function firstMeaningfulValue (...vals: any[]): any {
  for (const v of vals) {
    if (v == null) continue
    if (typeof v === 'string') {
      if (v.trim() !== '') return v
      continue
    }
    if (Array.isArray(v)) {
      if (v.length) return v
      continue
    }
    return v
  }
  return undefined
}

function inferSettoreCodeFromUsername (area: string, usernameRaw: any): string {
  const u = String(usernameRaw ?? '').trim().toUpperCase()
  if (!u) return ''
  if (area === 'AGR') {
    const m = u.match(/(?:^|[_\-\s])D([1-6])(?:$|[_\-\s])/)
    if (m) return `D${m[1]}`
  }
  if (area === 'TEC') {
    if (/(?:^|[_\-\s])DS(?:$|[_\-\s])/.test(u)) return 'DS'
  }
  if (area === 'AMM') {
    if (/(?:^|[_\-\s])CR(?:$|[_\-\s])/.test(u)) return 'CR'
  }
  return ''
}

function readGiiUserContext (): { username: string, role: string, area: string, settore: string, areaRaw: any, settoreRaw: any } {
  const w: any = window as any
  const roleObj: any = w.__giiUserRole || {}
  const userObj: any = w.__giiUser || {}
  const areaObj: any = w.__giiArea || {}
  const settoreObj: any = w.__giiSettore || w.__giiSector || {}

  const username = String(firstMeaningfulValue(
    w.__giiUsername,
    userObj.username, userObj.userName, userObj.userId,
    roleObj.username, roleObj.userName, roleObj.userId
  ) || '').trim()

  const role = String(firstMeaningfulValue(
    w.__giiRuolo, w.__giiRole,
    userObj.ruoloCod, userObj.ruoloCode, userObj.ruolo,
    roleObj.ruoloCod, roleObj.ruoloCode, roleObj.ruolo,
    userObj.ruoloLabel, roleObj.ruoloLabel
  ) || '').trim()

  const areaRaw = firstMeaningfulValue(
    w.__giiAreaCode,
    userObj.area_cod, userObj.areaCode, userObj.area,
    roleObj.area_cod, roleObj.areaCode, roleObj.area,
    areaObj.cod, areaObj.code, areaObj.name,
    w.__giiAreaLabel,
    userObj.areaLabel, roleObj.areaLabel, areaObj.label,
    typeof areaObj === 'string' ? areaObj : undefined
  )
  const area = normalizeAreaCode(areaRaw)

  const settoreRawPrimary = firstMeaningfulValue(
    w.__giiSettoreCode, w.__giiSectorCode,
    userObj.settore_cod, userObj.settoreCode, userObj.settore,
    roleObj.settore_cod, roleObj.settoreCode, roleObj.settore,
    settoreObj.cod, settoreObj.code, settoreObj.name,
    w.__giiSettoreLabel, w.__giiSectorLabel,
    userObj.settoreLabel, roleObj.settoreLabel, settoreObj.label,
    typeof settoreObj === 'string' ? settoreObj : undefined
  )
  const settoreFromPrimary = normalizeSettoreCode(area, settoreRawPrimary)
  const settoreFromUsername = inferSettoreCodeFromUsername(area, username)
  const settore = settoreFromUsername || settoreFromPrimary
  const settoreRaw = settoreFromUsername || settoreRawPrimary

  return { username, role, area, settore, areaRaw, settoreRaw }
}

function normalizeIntOrNull (v: any): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function shortRoleLabel (roleRaw: any, usernameRaw?: any): string {
  const role = String(roleRaw ?? '').trim().toUpperCase()
  if (/(^|[^A-Z])TI([^A-Z]|$)/.test(role)) return 'TI'
  if (/(^|[^A-Z])TR([^A-Z]|$)/.test(role)) return 'TR'
  if (/(^|[^A-Z])RZ([^A-Z]|$)/.test(role)) return 'RZ'
  if (/(^|[^A-Z])RI([^A-Z]|$)/.test(role)) return 'RI'
  const username = String(usernameRaw ?? '').trim().toUpperCase()
  if (/(^|[_\-\s])TI([_\-\s]|$)/.test(username)) return 'TI'
  if (/(^|[_\-\s])TR([_\-\s]|$)/.test(username)) return 'TR'
  if (/(^|[_\-\s])RZ([_\-\s]|$)/.test(username)) return 'RZ'
  if (/(^|[_\-\s])RI([_\-\s]|$)/.test(username)) return 'RI'
  return ''
}

function getCreateOfficeFallback (area: string, settore: string): { id: number | null, label: string } {
  if (area === 'AGR' && settore === 'D1') return { id: 2, label: 'Quartucciu (loc. Is Forreddus)' }
  return { id: null, label: '' }
}

function pickMostCommonText (values: any[]): string {
  const counts = new Map<string, number>()
  for (const v of values || []) {
    const s = String(v ?? '').trim()
    if (!s) continue
    counts.set(s, (counts.get(s) || 0) + 1)
  }
  let best = ''
  let bestCount = 0
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  })
  return best
}

function pickMostCommonInt (values: any[]): number | null {
  const counts = new Map<number, number>()
  for (const v of values || []) {
    const n = normalizeIntOrNull(v)
    if (n == null) continue
    counts.set(n, (counts.get(n) || 0) + 1)
  }
  let best: number | null = null
  let bestCount = 0
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  })
  return best
}

async function resolveCreateSurveyLikeDefaults (layer: any, ctx: { username: string, role: string, area: string, settore: string }): Promise<{ tecnicoRilevatore: string, ufficioZona: string, idUfficio: number | null }> {
  const w: any = window as any
  const roleShort = shortRoleLabel(ctx.role, ctx.username)
  const tecnicoFromRole = roleShort && ctx.settore ? `${roleShort} ${ctx.settore}` : (roleShort || String(ctx.username || '').trim())
  let tecnicoRilevatore = tecnicoFromRole

  let ufficioZona = String(firstMeaningfulValue(
    w.__giiUfficioLabel, w.__giiOfficeLabel,
    w.__giiUser?.ufficio_zona, w.__giiUser?.ufficioZona, w.__giiUser?.ufficio,
    w.__giiUserRole?.ufficio_zona, w.__giiUserRole?.ufficioZona, w.__giiUserRole?.ufficio
  ) || '').trim()

  let idUfficio = normalizeIntOrNull(firstMeaningfulValue(
    w.__giiUfficioId, w.__giiOfficeId,
    w.__giiUser?.id_ufficio, w.__giiUser?.ufficio_id,
    w.__giiUserRole?.id_ufficio, w.__giiUserRole?.ufficio_id
  ))

  try {
    if (layer?.queryFeatures) {
      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = '1=1'
      q.outFields = ['tecnico_rilevatore', 'ufficio_zona', 'id_ufficio', 'area_cod', 'settore_cod']
      q.returnGeometry = false
      q.num = 50
      const res = await layer.queryFeatures(q)
      const attrsList = (res?.features || []).map((f: any) => f?.attributes || {})
      const scoped = attrsList.filter((attrs: any) => {
        const areaOk = !ctx.area || normalizeAreaCode(attrs?.area_cod) === ctx.area
        const settoreOk = !ctx.settore || normalizeSettoreCode(ctx.area, attrs?.settore_cod) === ctx.settore
        return areaOk && settoreOk
      })
      const officeTextFromData = pickMostCommonText(scoped.map((attrs: any) => attrs?.ufficio_zona))
      const officeIdFromData = pickMostCommonInt(scoped.map((attrs: any) => attrs?.id_ufficio))
      const numericOfficeText = normalizeIntOrNull(ufficioZona)
      if (!ufficioZona && officeTextFromData) {
        ufficioZona = officeTextFromData
      } else if (officeTextFromData && numericOfficeText != null) {
        if (idUfficio == null) idUfficio = numericOfficeText
        ufficioZona = officeTextFromData
      }
      if (idUfficio == null && officeIdFromData != null) idUfficio = officeIdFromData
      if (!tecnicoRilevatore) {
        const tecnicoFromData = pickMostCommonText(scoped.map((attrs: any) => attrs?.tecnico_rilevatore))
        if (tecnicoFromData) tecnicoRilevatore = tecnicoFromData
      }
    }
  } catch {
    // fallback sotto
  }

  const fallback = getCreateOfficeFallback(ctx.area, ctx.settore)
  const numericOfficeText = normalizeIntOrNull(ufficioZona)
  if ((!ufficioZona || numericOfficeText != null) && fallback.label) {
    if (idUfficio == null && numericOfficeText != null) idUfficio = numericOfficeText
    ufficioZona = fallback.label
  }
  if (idUfficio == null && fallback.id != null) idUfficio = fallback.id

  return {
    tecnicoRilevatore: tecnicoRilevatore || String(ctx.username || '').trim(),
    ufficioZona,
    idUfficio
  }
}

function parseOfficeCoord (v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').trim().replace(',', '.')
  if (!s) return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function buildTiCreateViewServiceNames (areaRaw: any, settoreRaw: any): string[] {
  const area = normalizeAreaCode(areaRaw)
  const settore = normalizeSettoreCode(area, settoreRaw)
  if (area === 'AGR' && /^D[1-6]$/.test(settore)) return [`GII_VIEW_EB_AGR_${settore}`]
  if (area === 'TEC' && settore === 'DS') return ['GII_VIEW_EB_TEC_DS']
  if (area === 'AMM') {
    if (settore === 'CR') return ['GII_VIEW_EB_AMM_CR', 'GII_VIEW_EB_AMM_ALL']
    return ['GII_VIEW_EB_AMM_ALL']
  }
  return []
}

function replaceServiceNameInLayerUrl (layerUrl: string, serviceName: string): string | null {
  const m = String(layerUrl || '').match(/^(https?:\/\/.+?\/services\/)([^/]+)(\/FeatureServer\/\d+.*)$/i)
  if (!m) return null
  return `${m[1]}${serviceName}${m[3]}`
}

function findTipoSoggettoFieldName (ds: any): string | null {
  try {
    const schema = ds?.getSchema?.()
    const fields = schema?.fields || {}
    const names = Object.keys(fields)
    if (!names.length) return null

    const directCandidates = [
      'tipo_soggetto', 'TIPO_SOGGETTO',
      'tipoSoggetto', 'TipoSoggetto',
      'tipo_sogg', 'TIPO_SOGG',
      'tipo', 'TIPO'
    ]
    for (const c of directCandidates) {
      if (c && fields[c]) return c
    }

    // Cerca per alias/label
    for (const n of names) {
      const f = fields[n]
      const alias = norm(f?.alias || f?.label || f?.title || '')
      const nn = norm(n)
      if ((nn.includes('tipo') && nn.includes('sogg')) || alias.includes('tipo soggetto') || alias.includes('tipologia soggetto')) return n
    }

    // Fallback: primo campo che contiene entrambe le parole
    const loose = names.find(n => {
      const nn = norm(n)
      return nn.includes('tipo') && nn.includes('sogg')
    })
    return loose || null
  } catch {
    return null
  }
}

function resolveCodedValueLabel (ds: any, fieldName: string, raw: any): string | null {
  try {
    const schema = ds?.getSchema?.()
    const f = schema?.fields?.[fieldName]
    const coded = f?.domain?.codedValues
    if (!coded || !Array.isArray(coded)) return null
    for (const cv of coded) {
      const code = cv?.code
      // confronto "loose" (numero/stringa)
      if (code == raw) return String(cv?.name ?? '')
      if (String(code) === String(raw)) return String(cv?.name ?? '')
    }
    return null
  } catch {
    return null
  }
}

function classifyTipoSoggettoRobusto (raw: any, labelFromDomain: any): 'PF' | 'PG' | null {
  const sLabel = norm(labelFromDomain)
  const sRaw = norm(raw)

  // Priorità: label del dominio (se presente)
  const s = sLabel || sRaw
  if (!s) return null

  if (s.includes('fisica') || s == 'pf' || s.startsWith('pf ')) return 'PF'
  if (s.includes('giurid') || s == 'pg' || s.startsWith('pg ')) return 'PG'

  // Codici numerici comuni: 1=PF, 2=PG
  if (sRaw == '1') return 'PF'
  if (sRaw == '2') return 'PG'

  return null
}


function filterAttrsToLayerFields (attrs: Record<string, any>, layer: any) {
  const fields = (layer?.fields || []) as Array<{ name: string }>
  if (!fields.length) return attrs
  const allow = new Set(fields.map(f => String(f.name)))
  const out: Record<string, any> = {}
  for (const k of Object.keys(attrs)) {
    if (allow.has(k)) out[k] = attrs[k]
  }
  return out
}

async function refreshRootAndDerived (ds: any) {
  if (!ds) return
  let root = ds
  try { while (root && root.belongToDataSource) root = root.belongToDataSource } catch {}

  const list: any[] = []
  if (root) list.push(root)

  try {
    const derived = root?.getAllDerivedDataSources ? root.getAllDerivedDataSources() : []
    if (derived && derived.length) list.push(...derived)
  } catch {}

  for (const d of list) {
    try {
      const q = d.getCurrentQueryParams ? d.getCurrentQueryParams() : null
      if (d.clearSourceRecords) d.clearSourceRecords()
      if (d.addVersion) d.addVersion()
      if (d.load) {
        if (q) await d.load(q)
        else await d.load()
      }
    } catch {}
  }
}

function msgStyle (kind: MsgKind, fontSize: number): React.CSSProperties {
  const base: React.CSSProperties = { fontSize, lineHeight: 1.35, whiteSpace: 'normal' }
  if (kind === 'ok') return { ...base, color: '#1a7f37' }
  if (kind === 'err') return { ...base, color: '#b42318' }
  return { ...base, color: '#4b5563' }
}

function getUdsKey (uds: any, idx: number) {
  return String(
    uds?.dataSourceId ??
    uds?.mainDataSourceId ??
    uds?.rootDataSourceId ??
    uds?.outputDataSourceId ??
    `ds_${idx}`
  )
}

function DataSourceSelectionBridge (props: {
  widgetId: string
  uds: any
  dsKey: string
  watchFields: string[]
  onUpdate: (dsKey: string, state: SelState) => void
}) {
  const { widgetId, uds, dsKey, watchFields, onUpdate } = props

  // onDataSourceCreated: fornisce il DS appena disponibile, prima di qualsiasi selezione
  const onDsCreated = React.useCallback((ds: any) => {
    if (!ds) return
    const idFieldName = ds?.getIdField ? ds.getIdField() : 'OBJECTID'
    onUpdate(dsKey, { ds, oid: null, idFieldName, data: null, sig: 'ds_ready' })
  }, [dsKey, onUpdate])

  return (
    <DataSourceComponent
      useDataSource={uds}
      widgetId={widgetId}
      onDataSourceCreated={onDsCreated}
    >
      {(ds: any) => (
        <SelectionWatcher
          ds={ds}
          dsKey={dsKey}
          watchFields={watchFields}
          onUpdate={onUpdate}
        />
      )}
    </DataSourceComponent>
  )
}

function SelectionWatcher (props: {
  ds: any
  dsKey: string
  watchFields: string[]
  onUpdate: (dsKey: string, state: SelState) => void
}): any {
  const { ds, dsKey, watchFields, onUpdate } = props

  React.useEffect(() => {
    try { ds?.setListenSelection?.(true) } catch {}
  }, [ds])

  const selected = ds?.getSelectedRecords?.() || []
  const r0 = selected.length ? selected[0] : null
  // Nota: in ExB il record selezionato può avere un subset di campi.
// Per il filtro PF/PG dobbiamo avere SEMPRE la tipologia soggetto: la ricaviamo in modo robusto dallo schema/dominio.
let data: any = r0?.getData ? r0.getData() : null

const tipoField = findTipoSoggettoFieldName(ds)
let tipoRaw: any = null
let tipoLabel: any = null
let tipoKind: any = null
try {
  if (tipoField && r0?.getFieldValue) tipoRaw = r0.getFieldValue(tipoField)
} catch {}

try {
  if (tipoField && tipoRaw != null) tipoLabel = resolveCodedValueLabel(ds, tipoField, tipoRaw)
} catch {}

tipoKind = classifyTipoSoggettoRobusto(tipoRaw, tipoLabel)

if (tipoField) {
  data = {
    ...(data || {}),
    __tipo_soggetto_field: tipoField,
    __tipo_soggetto_raw: tipoRaw,
    __tipo_soggetto_label: tipoLabel,
    __tipo_soggetto_kind: tipoKind
  }
}

  const idFieldName = ds?.getIdField ? ds.getIdField() : 'OBJECTID'
  const oidRaw = pickOidFromData(data, idFieldName)
  const oid = oidRaw != null ? Number(oidRaw) : null

  const sigParts: string[] = []
  sigParts.push(String(oid ?? ''))
  for (const f of watchFields) sigParts.push(String(data?.[f] ?? ''))
  const sig = sigParts.join('|')

  React.useEffect(() => {
    onUpdate(dsKey, {
      ds,
      oid: (oid != null && Number.isFinite(oid)) ? oid : null,
      idFieldName,
      data: (oid != null && Number.isFinite(oid)) ? data : null,
      sig
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsKey, ds, idFieldName, sig])

  return null
}

function DetailRow (props: { label: string; value: any; labelSize: number; valueSize: number; labelColor?: string }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '200px 1fr', 
      gap: 12, 
      alignItems: 'baseline' 
    }}>
      <div style={{ fontSize: props.labelSize, color: props.labelColor || '#6b7280', textAlign: 'left' }}>
        {props.label}
      </div>
      <div style={{ fontSize: props.valueSize, fontWeight: 600, wordBreak: 'break-word' }}>
        {props.value != null && props.value !== '' ? String(props.value) : '—'}
      </div>
    </div>
  )
}

/**
 * Dropdown custom zebrato:
 * - rende il menu in portal su <body> (non viene tagliato dal widget)
 * - decide automaticamente se aprire sopra o sotto
 * - applica la zebra dalle impostazioni
 */
function ZebraDropdown (props: {
  value: string
  options: string[]
  placeholder?: string
  disabled?: boolean
  onChange: (v: string) => void
  evenBg: string
  oddBg: string
  borderColor: string
  borderWidth: number
  radius: number
  fontSize: number
  // error highlight
  isError?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [pos, setPos] = React.useState<any>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const safeOptions = Array.isArray(props.options) ? props.options : []
  const currentLabel = props.value ? props.value : (props.placeholder || '— seleziona —')

  const bw = Math.max(0, Number(props.borderWidth) || 0)
  const bc = props.borderColor || 'rgba(0,0,0,0.10)'
  const rowBorder = `${bw}px solid ${bc}`

  const computePos = React.useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const btn = el.querySelector('button') as HTMLButtonElement | null
    const rect = (btn || el).getBoundingClientRect()

    const margin = 8
    const maxMenu = 280
    const below = window.innerHeight - rect.bottom - margin
    const above = rect.top - margin

    const openUp = below < 180 && above > below
    const maxHeightRaw = Math.min(maxMenu, Math.max(140, (openUp ? above : below) - 12))

    setPos({
      left: rect.left,
      width: rect.width,
      openUp,
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      maxHeight: maxHeightRaw
    })
  }, [])

  React.useEffect(() => {
    if (!open) return
    computePos()

    const onDown = (e: any) => {
      const root = rootRef.current
      const menu = menuRef.current
      if (!root || !menu) return
      const t = e.target as any
      if (!root.contains(t) && !menu.contains(t)) setOpen(false)
    }
    const onKey = (e: any) => { if (e?.key === 'Escape') setOpen(false) }
    const onResize = () => computePos()
    const onScroll = () => computePos()

    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize, true)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onResize, true)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, computePos])

  const menu = open && !props.disabled && pos
    ? createPortal(
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          left: pos.left,
          width: pos.width,
          top: pos.openUp ? 'auto' : pos.top,
          bottom: pos.openUp ? pos.bottom : 'auto',
          zIndex: 200000,
          border: rowBorder,
          borderRadius: Math.max(0, Number(props.radius) || 0),
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          background: '#ffffff',
          maxHeight: pos.maxHeight,
          overflowY: 'auto'
        }}
      >
        <div
          onClick={() => { props.onChange(''); setOpen(false) }}
          style={{
            padding: '8px 10px',
            cursor: 'pointer',
            fontSize: props.fontSize,
            backgroundColor: props.evenBg || '#ffffff',
            borderBottom: rowBorder,
            opacity: 0.9
          }}
          title='Svuota selezione'
        >
          — seleziona —
        </div>

        {safeOptions.map((opt: string, idx: number) => {
          const isEven = idx % 2 === 0
          const bg = isEven ? (props.evenBg || '#f6f7f9') : (props.oddBg || '#ffffff')
          const isSel = String(opt) === String(props.value || '')
          return (
            <div
              key={`${opt}-${idx}`}
              onClick={() => { props.onChange(String(opt)); setOpen(false) }}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                fontSize: props.fontSize,
                backgroundColor: bg,
                borderBottom: (idx === safeOptions.length - 1) ? 'none' : rowBorder,
                fontWeight: isSel ? 700 : 400
              }}
            >
              {String(opt)}
            </div>
          )
        })}
      </div>,
      document.body
    )
    : null

  const border = props.isError ? '1px solid #b42318' : '1px solid rgba(0,0,0,0.20)'

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type='button'
        disabled={!!props.disabled}
        onClick={() => {
          if (props.disabled) return
          setOpen(v => {
            const next = !v
            if (next) computePos()
            return next
          })
        }}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 8,
          border,
          background: props.disabled ? '#f3f4f6' : '#ffffff',
          color: props.disabled ? '#9ca3af' : '#111827',
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <span style={{ flex: 1, fontSize: props.fontSize }}>{currentLabel}</span>
        <span style={{ fontSize: props.fontSize, opacity: 0.75 }}>▾</span>
      </button>
      {menu}
    </div>
  )
}

// domini (numeri come da tua nota)
const PRESA_DA_PRENDERE = 1

// ─────────────────────────── OVERLAY EDITING INLINE ──────────────────────────
// Versione semplificata dell'overlay di editing che vive dentro il widget Azioni.
// Per la versione completa (con mappa e tutte le tab) usare il widget gii-editing-ti
// sulla pagina dedicata.

function filterAttrsForLayer(attrs: Record<string, any>, layer: any): Record<string, any> {
  const fields = (layer?.fields || []) as Array<{ name: string }>
  if (!fields.length) return attrs
  const nameMap = new Map<string, string>()
  for (const f of fields) nameMap.set(String(f.name).toLowerCase(), String(f.name))
  const out: Record<string, any> = {}
  for (const k of Object.keys(attrs)) {
    const realName = nameMap.get(k.toLowerCase())
    if (realName) out[realName] = attrs[k]
  }
  return out
}

async function resolveLayerForEdit(ds: any): Promise<any | null> {
  if (!ds) return null
  try {
    const raw = (ds as any)?.getLayer?.() || (ds as any)?.getJSAPILayer?.() || (ds as any)?.getJsApiLayer?.() || (ds as any)?.layer || null
    const resolved = await Promise.resolve(raw)
    const layer = (resolved && (resolved.layer || resolved)) || null
    if (layer && typeof layer.applyEdits === 'function') return layer
  } catch { }
  try {
    const dm = DataSourceManager.getInstance()
    const cds = ds?.id ? dm.getDataSource(ds.id) : null
    if (cds) {
      const raw = (cds as any)?.getLayer?.() || (cds as any)?.layer || null
      const resolved = await Promise.resolve(raw)
      const layer = (resolved && (resolved.layer || resolved)) || null
      if (layer && typeof layer.applyEdits === 'function') return layer
    }
  } catch { }
  return null
}

async function refreshDs(ds: any): Promise<void> {
  if (!ds) return
  let root = ds
  try { while (root?.belongToDataSource) root = root.belongToDataSource } catch { }
  const list: any[] = root ? [root] : []
  try {
    const derived = root?.getAllDerivedDataSources?.() || []
    if (derived?.length) list.push(...derived)
  } catch { }
  for (const d of list) {
    try {
      const q = d.getCurrentQueryParams?.() || null
      if (d.clearSourceRecords) d.clearSourceRecords()
      if (d.addVersion) d.addVersion()
      if (d.load) { if (q) await d.load(q); else await d.load() }
    } catch { }
  }
}


async function trySelectOid (ds: any, oid: number): Promise<void> {
  if (!ds || oid == null) return
  const id = Number(oid)
  const methods: Array<[string, any]> = [
    ['selectRecordsByIds', [ [id] ]],
    ['selectRecordById', [ id ]],
    ['setSelectedRecordIds', [ [id] ]],
    ['setSelectedIds', [ [id] ]]
  ]
  for (const [m, args] of methods) {
    try {
      if (typeof (ds as any)[m] === 'function') {
        await (ds as any)[m](...args)
        return
      }
    } catch { /* ignore */ }
  }
  // fallback: SelectionManager (best-effort)
  try {
    const sm = (DataSourceManager as any).getInstance?.()?.getSelectionManager?.()
    if (sm?.selectRecordByIds && ds?.id) sm.selectRecordByIds(ds.id, [id])
  } catch { /* ignore */ }
}


function InlineEditOverlay(props: {
  oid: number
  data: any
  ds: any
  idFieldName: string
  cfg: any   // editConfig
  ui: any
  onClose: (saved: boolean) => void
}) {
  const { oid, data, ds, idFieldName, cfg, ui, onClose } = props
  const _flColor = String(ui?.formLabelColor || '#6b7280')
  const _flSize = Number.isFinite(Number(ui?.formLabelFontSize)) ? Number(ui.formLabelFontSize) : 12

  // Alias e schema dal DS (caricati una volta sola)
  const [aliasMap, setAliasMap] = React.useState<Record<string, string>>({})
  const [layerFields, setLayerFields] = React.useState<Array<{ name: string; type: string; domain?: any }>>([])
  const [aliasReady, setAliasReady] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      // Schema dal DS
      try {
        const schema = ds?.getSchema?.()
        const fobj = schema?.fields || {}
        const am: Record<string, string> = {}
        for (const name of Object.keys(fobj)) {
          const f = fobj[name]
          am[name] = String(f?.alias || f?.label || f?.title || name)
        }
        if (!cancelled && Object.keys(am).length) setAliasMap(am)
      } catch { }
      // Layer JSAPI per tipi e domini
      try {
        const raw = ds?.getLayer?.() || ds?.getJSAPILayer?.() || ds?.layer || null
        const resolved = await Promise.resolve(raw)
        const layer = (resolved && (resolved.layer || resolved)) || null
        const fields = (layer?.fields || []) as any[]
        if (fields.length && !cancelled) {
          const am: Record<string, string> = {}
          const lf: typeof layerFields = []
          for (const f of fields) {
            if (!f?.name) continue
            am[f.name] = String(f?.alias || f.name)
            lf.push({ name: f.name, type: f.type || '', domain: f.domain || null })
          }
          setAliasMap(am)
          setLayerFields(lf)
        }
      } catch { }
      if (!cancelled) setAliasReady(true)
    }
    load()
    return () => { cancelled = true }
  }, [ds])

  // Draft editing
  const [draft, setDraft] = React.useState<Record<string, any>>({ ...data })
  const [saving, setSaving] = React.useState(false)
  const [saveMsg, setSaveMsg] = React.useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [confirmCancel, setConfirmCancel] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'anagrafica' | 'violazione'>('anagrafica')

  const updateDraft = (field: string, value: any) => setDraft(prev => ({ ...prev, [field]: value }))

  const handleCancel = () => {
    setDraft({ ...(data || {}) })
    setSaveMsg(null)
    setActiveTab('anagrafica')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const layer = await resolveLayerForEdit(ds)
      if (!layer?.applyEdits) throw new Error('Layer non raggiungibile.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch { } }

      const attrs: Record<string, any> = { [idFieldName]: oid }
      for (const [k, v] of Object.entries(draft)) {
        if (!k.startsWith('__')) attrs[k] = v
      }
      const cleanAttrs = filterAttrsForLayer(attrs, layer)
      const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
      const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
      const err = upd?.error
      const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
      if (!ok) {
        const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
        throw new Error(detail)
      }
      await refreshDs(ds)
      setSaveMsg({ kind: 'ok', text: 'Salvato.' })
      setSaving(false)
      window.setTimeout(() => onClose(true), 1000)
    } catch (e: any) {
      setSaving(false)
      setSaveMsg({ kind: 'err', text: `Errore: ${e?.message || String(e)}` })
    }
  }

  // Campi per tab (presi dalla config editConfig o auto-rilevati)
  const anagraficaFields: string[] = []
  const violazioneFields: string[] = []
  // Auto-rilevamento: usa tutti i campi del draft non-sistema
  const allKeys = Object.keys(data || {}).filter(k =>
    !k.startsWith('__') &&
    !/^objectid$/i.test(k) &&
    !/^globalid$/i.test(k) &&
    !/^shape/i.test(k) &&
    !/^stato_/i.test(k) &&
    !/^esito_/i.test(k) &&
    !/^presa_in_carico/i.test(k) &&
    !/^dt_/i.test(k) &&
    !/^GII_/i.test(k) &&
    !/^origine_pratica$/i.test(k)
  )
  const anagraficaRe = /ditta|denom|ragione|nome|cognome|cf|cod.*fisc|piva|partita|indir|via|cap|comune|prov|telefono|cell|mail|pec|tipologia_sogg|tipo_sogg/i
  const violazioneRe = /viol|infraz|descr|art|norm|tipo_preliev|sanz|acqua|volume|turno|utenza|contatore|circostanz|fatti|ufficio|settore|area_cod/i
  for (const k of allKeys) {
    if (anagraficaRe.test(k)) anagraficaFields.push(k)
    else if (violazioneRe.test(k)) violazioneFields.push(k)
  }
  // residui non classificati → li mettiamo in violazione
  const classified = new Set([...anagraficaFields, ...violazioneFields])
  for (const k of allKeys) {
    if (!classified.has(k)) violazioneFields.push(k)
  }

  const renderField = (fieldName: string) => {
    if (!aliasReady) return null
    const lf = layerFields.find(f => f.name === fieldName)
    const alias = aliasMap[fieldName] || fieldName
    const type = lf?.type || 'esriFieldTypeString'
    const domain = lf?.domain || null
    const val = draft[fieldName]
    const isDate = type.toLowerCase().includes('date')
    const isNum = type.toLowerCase().includes('integer') || type.toLowerCase().includes('double')
    const hasCoded = domain?.codedValues && Array.isArray(domain.codedValues)

    if (hasCoded) {
      return (
        <div key={fieldName} style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: _flSize, color: _flColor }}>{alias}</div>
          <select
            value={val ?? ''}
            disabled={saving}
            onChange={e => updateDraft(fieldName, (e.target as HTMLSelectElement).value === '' ? null : (isNum ? Number((e.target as HTMLSelectElement).value) : (e.target as HTMLSelectElement).value))}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.20)', fontSize: 13, width: '100%', background: saving ? '#f3f4f6' : '#fff' }}
          >
            <option value=''>— seleziona —</option>
            {domain.codedValues.map((cv: any) => (
              <option key={String(cv.code)} value={String(cv.code)}>{cv.name}</option>
            ))}
          </select>
        </div>
      )
    }
    if (isDate) {
      const toInputVal = (v: any) => {
        if (!v) return ''
        try {
          const n = Number(v)
          const d = Number.isFinite(n) && n > 0 ? new Date(n) : new Date(String(v))
          if (Number.isNaN(d.getTime())) return ''
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        } catch { return '' }
      }
      return (
        <div key={fieldName} style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: _flSize, color: _flColor }}>{alias}</div>
          <input type='date' value={toInputVal(val)} disabled={saving}
            onChange={e => {
              const d = new Date((e.target as HTMLInputElement).value)
              updateDraft(fieldName, Number.isNaN(d.getTime()) ? null : d.getTime())
            }}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.20)', fontSize: 13, width: '100%', background: saving ? '#f3f4f6' : '#fff' }}
          />
        </div>
      )
    }
    const isMultiline = /descr|note|fatti|circostanz/i.test(fieldName)
    return (
      <div key={fieldName} style={{ display: 'grid', gap: 4 }}>
        <div style={{ fontSize: _flSize, color: _flColor }}>{alias}</div>
        {isMultiline
          ? <textarea value={val != null ? String(val) : ''} disabled={saving} rows={3}
            onChange={e => updateDraft(fieldName, (e.target as HTMLTextAreaElement).value || null)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.20)', fontSize: 13, width: '100%', resize: 'vertical', background: saving ? '#f3f4f6' : '#fff', boxSizing: 'border-box' }}
          />
          : <input type='text' value={val != null ? String(val) : ''} disabled={saving}
            onChange={e => updateDraft(fieldName, (e.target as HTMLInputElement).value === '' ? null : (isNum ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value))}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.20)', fontSize: 13, width: '100%', background: saving ? '#f3f4f6' : '#fff', boxSizing: 'border-box' }}
          />
        }
      </div>
    )
  }

  const praticaCode = (() => {
    const op = data?.origine_pratica ?? data?.Origine_pratica
    return `${(op === 2 || op === '2') ? 'TI' : 'TR'}-${oid}`
  })()

  const overlay = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#fff', borderRadius: 12,
        width: '88vw', maxWidth: 860,
        height: '85vh', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ flex: '0 0 auto', padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            ✏️ Modifica pratica&nbsp;<span style={{ color: '#2f6fed' }}>{praticaCode}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {saveMsg && (
              <span style={{ fontSize: 13, color: saveMsg.kind === 'ok' ? '#1a7f37' : '#b42318' }}>
                {saveMsg.text}
              </span>
            )}
            <button type='button' disabled={saving} onClick={handleSave}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: saving ? '#e5e7eb' : '#1a7f37', color: saving ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Salvataggio…' : '💾 Salva'}
            </button>
            <button type='button' disabled={saving} onClick={() => setConfirmCancel(true)}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d13438', background: '#fff', color: '#d13438', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
              ✕ Annulla
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ flex: '0 0 auto', display: 'flex', gap: 8, padding: '10px 20px', borderBottom: '1px solid #e5e7eb' }}>
          {(['anagrafica', 'violazione'] as const).map(t => (
            <button key={t} type='button' disabled={saving} onClick={() => setActiveTab(t)}
              style={{
                padding: '8px 14px', borderRadius: 10, border: `1px solid ${activeTab === t ? '#2f6fed' : 'rgba(0,0,0,0.12)'}`,
                background: activeTab === t ? '#eaf2ff' : 'rgba(0,0,0,0.02)',
                color: activeTab === t ? '#1d4ed8' : '#111827',
                fontWeight: 700, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer'
              }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <div style={{ fontSize: 12, color: '#9ca3af', alignSelf: 'center', marginLeft: 8 }}>
            Per localizzazione e allegati usa "Modifica (pagina)"
          </div>
        </div>

        {/* Contenuto scrollabile */}
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>
          {!aliasReady
            ? <div style={{ color: '#6b7280', fontSize: 13 }}>Caricamento schema campi…</div>
            : (
              <div style={{ display: 'grid', gap: 14 }}>
                {activeTab === 'anagrafica' && (
                  anagraficaFields.length
                    ? anagraficaFields.map(f => renderField(f))
                    : <div style={{ color: '#6b7280', fontSize: 13 }}>Nessun campo rilevato automaticamente. Usare la pagina di editing completa.</div>
                )}
                {activeTab === 'violazione' && (
                  violazioneFields.length
                    ? violazioneFields.map(f => renderField(f))
                    : <div style={{ color: '#6b7280', fontSize: 13 }}>Nessun campo rilevato automaticamente. Usare la pagina di editing completa.</div>
                )}
              </div>
            )
          }
        </div>
      </div>

      {/* Dialog conferma annulla */}
      {confirmCancel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Annullare le modifiche?</div>
            <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 20 }}>Le modifiche non salvate andranno perse.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type='button' onClick={() => { setConfirmCancel(false); onClose(false) }}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#d13438', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Sì, annulla
              </button>
              <button type='button' onClick={() => setConfirmCancel(false)}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#111827', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Torna all'editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(overlay, document.body)
}


const PRESA_IN_CARICO = 2

const STATO_DA_PRENDERE = 1
const STATO_PRESA_IN_CARICO = 2
const STATO_INTEGRAZIONE = 3
const STATO_APPROVATA = 4
const STATO_RESPINTA = 5

const ESITO_INTEGRAZIONE = 1
const ESITO_APPROVATA = 2
const ESITO_RESPINTA = 3

function mapEsitoToStato (esito: number): number | null {
  if (esito === ESITO_INTEGRAZIONE) return STATO_INTEGRAZIONE
  if (esito === ESITO_APPROVATA) return STATO_APPROVATA
  if (esito === ESITO_RESPINTA) return STATO_RESPINTA
  return null
}

type ButtonColors = {
  take: string
  integrazione: string
  approva: string
  respingi: string
  trasmetti: string
}

function isValidHexColor (s: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((s || '').trim())
}

function normalizeHexColor (maybe: any, fallback: string): string {
  const s = String(maybe ?? '').trim()
  if (!s) return fallback
  if (isValidHexColor(s)) return s
  return fallback
}

function actionButtonStyle (bg: string, disabled: boolean, ui?: { btnBorderRadius?: number; btnFontSize?: number; btnFontWeight?: number; btnPaddingX?: number; btnPaddingY?: number }): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: ui?.btnBorderRadius ?? 8,
    fontSize: ui?.btnFontSize ?? 13,
    fontWeight: ui?.btnFontWeight ?? 600,
    padding: `${ui?.btnPaddingY ?? 8}px ${ui?.btnPaddingX ?? 16}px`
  }
  if (disabled) {
    return { ...base, backgroundColor: '#e5e7eb', borderColor: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }
  }
  return { ...base, backgroundColor: bg, borderColor: bg, color: '#ffffff' }
}

type Pending = null | 'TAKE' | 'INTEGRAZIONE' | 'APPROVA' | 'RESPINGI' | 'TRASMETTI'

function ActionsPanel (props: {
  active: { key: string; state: SelState } | null
  roleCode: string
  buttonText: string
  buttonColors: ButtonColors
  ui: {
    panelBg: string
    panelBorderColor: string
    panelBorderWidth: number
    panelBorderRadius: number
    panelPadding: number
    dividerColor: string
    titleFontSize: number
    statusFontSize: number
    msgFontSize: number

    rejectReasons: string[]
    reasonsZebraOddBg: string
    reasonsZebraEvenBg: string
    reasonsRowBorderColor: string
    reasonsRowBorderWidth: number
    reasonsRowRadius: number
    btnBorderRadius: number
    btnFontSize: number
    btnFontWeight: number
    btnPaddingX: number
    btnPaddingY: number
  }
  editConfig: {
    show: boolean
    overlayColor: string
    pageColor: string
    pageId: string
    fieldStatoTI: string
    fieldPresaTI: string
    minStato: number
    maxStato: number
    presaRequiredVal: number
  }
  motherLayerUrl?: string
}) {
  const { active, roleCode, buttonText, buttonColors, ui } = props
  const role = String(roleCode || 'DT').trim().toUpperCase()

  // scorciatoie (usate spesso nel render)
  const titleFontSize = ui.titleFontSize
  const msgFontSize = ui.msgFontSize

  const presaField = `presa_in_carico_${role}`
  const dtPresaField = `dt_presa_in_carico_${role}`

  const statoField = `stato_${role}`
  const dtStatoField = `dt_stato_${role}`

  const esitoField = `esito_${role}`
  const dtEsitoField = `dt_esito_${role}`

  const noteField = `note_${role}`

  const statoDAField = 'stato_DA'
  const dtStatoDAField = 'dt_stato_DA'
  const presaDAField = 'presa_in_carico_DA'
  const dtPresaDAField = 'dt_presa_in_carico_DA'

  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg] = React.useState<Msg | null>({ kind: 'info', text: 'Selezionare una riga.' })

  // lock procedura: solo quando parte un’azione (pending) o quando salvo (loading)
  const [pending, setPending] = React.useState<Pending>(null)

  // validazioni “soft”: si attivano solo dopo tentativo di conferma
  const [confirmAttempted, setConfirmAttempted] = React.useState(false)

  // note / motivazione
  const [noteDraft, setNoteDraft] = React.useState('')
  const [rejectReason, setRejectReason] = React.useState('')
  const noteOrigRef = React.useRef<string>('')
  const noteRef = React.useRef<HTMLTextAreaElement | null>(null)

  // textarea: max ~5 righe, poi scrollbar
  const NOTE_MIN_H = 42
  const NOTE_MAX_H = 118
  const autoResizeNote = React.useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return
    try {
      el.style.height = 'auto'
      const next = Math.min(el.scrollHeight || NOTE_MIN_H, NOTE_MAX_H)
      el.style.height = `${next}px`
      el.style.overflowY = (el.scrollHeight > NOTE_MAX_H) ? 'auto' : 'hidden'
    } catch {}
  }, [])

  const selectionKey = active?.state?.oid != null ? `${active.key}:${active.state.oid}` : null
  const selectionKeyRef = React.useRef<string | null>(selectionKey)
  React.useEffect(() => { selectionKeyRef.current = selectionKey }, [selectionKey])

  const ds = active?.state?.ds
  const data = active?.state?.data || null
  const oid = active?.state?.oid ?? null
  const idFieldNameFromSel = active?.state?.idFieldName || 'OBJECTID'
  const hasSel = oid != null && Number.isFinite(oid)

  // --- Editing TI ---
  const ec = props.editConfig
  const [editOverlayOpen, setEditOverlayOpen] = React.useState(false)

  // Determina se il pulsante Modifica è abilitato
  const statoTIVal = data ? data[ec.fieldStatoTI] : null
  const presaTIVal = data ? data[ec.fieldPresaTI] : null
  const statoTINum = statoTIVal != null && String(statoTIVal) !== '' ? Number(statoTIVal) : null
  const presaTINum = presaTIVal != null && String(presaTIVal) !== '' ? Number(presaTIVal) : null
  const currentTiUsername = String((window as any).__giiUserRole?.username || (window as any).__giiUser?.username || '').trim().toLowerCase()
  const assignedTiUsername = String(pickAttrCI(data, ['ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato']) || '').trim().toLowerCase()
  const isAssignedToCurrentTi = !!currentTiUsername && !!assignedTiUsername && currentTiUsername === assignedTiUsername
  const inChargeByTi =
    presaTINum === PRESA_IN_CARICO ||
    statoTINum === STATO_PRESA_IN_CARICO
  const isMeaningfulAudit = (v: any): boolean => !(v === null || v === undefined || v === '' || v === 0 || v === '0')
  const tiClosedOrForwarded =
    isMeaningfulAudit(pickAttrCI(data, ['esito_TI', 'esito_ti', 'ESITO_TI'])) ||
    (statoTINum === STATO_APPROVATA) ||
    (statoTINum === STATO_RESPINTA) ||
    (statoTINum != null && statoTINum > STATO_PRESA_IN_CARICO)

  const canEdit =
    hasSel &&
    !loading &&
    pending === null &&
    ec.show &&
    isAssignedToCurrentTi &&
    inChargeByTi &&
    !tiClosedOrForwarded

  const handleEditOverlay = () => {
    if (!canEdit) return
    // Scrive i dati nel canale globale per il widget Editing TI
    try {
      (window as any).__giiEdit = {
        oid,
        data: { ...data },
        idFieldName: active?.state?.idFieldName || 'OBJECTID',
        dsId: active?.state?.ds?.id ?? null,
        ts: Date.now()
      }
    } catch { }
    setEditOverlayOpen(true)
  }

  const handleEditPage = () => {
    if (!canEdit) return
    try {
      (window as any).__giiEdit = {
        oid,
        data: { ...data },
        idFieldName: active?.state?.idFieldName || 'OBJECTID',
        dsId: active?.state?.ds?.id ?? null,
        ts: Date.now()
      }
    } catch { }
    // Navigazione ExB: usa l'API history/routing di ExB se disponibile,
    // altrimenti fallback su hash navigation
    try {
      const pageId = String(ec.pageId || 'editing-ti').trim()
      const getAppStore = (window as any).jimuCore?.getAppStore
      if (getAppStore) {
        const store = getAppStore()
        store?.dispatch?.({ type: 'APP_NAVIGATE', uri: pageId })
        return
      }
    } catch { }
    try {
      const pageId = String(ec.pageId || 'editing-ti').trim()
      window.location.hash = `#${pageId}`
    } catch { }
  }

  const presaVal = data ? data[presaField] : null
  const statoVal = data ? data[statoField] : null
  const esitoVal = data ? data[esitoField] : null
  const statoDAVal = data ? data[statoDAField] : null

  const presaNum = (presaVal != null && String(presaVal) !== '') ? Number(presaVal) : null
  const statoNum = (statoVal != null && String(statoVal) !== '') ? Number(statoVal) : null
  const statoDANum = (statoDAVal != null && String(statoDAVal) !== '') ? Number(statoDAVal) : null
  const origineVal = data ? data['origine_pratica'] : null
  const origineNum = (origineVal != null && String(origineVal) !== '') ? Number(origineVal) : null

  // blocca DT se già trasmesso a DA (DA ha uno stato valorizzato)
  const lockedByTransmit = (role === 'DT') && (statoDANum != null && statoDANum >= 1)

  // quando cambio selezione: torno libero (nessuna memoria)
  React.useEffect(() => {
    if (!selectionKey) {
      setMsg({ kind: 'info', text: 'Selezionare una riga.' })
      setPending(null)
      setLoading(false)
      setConfirmAttempted(false)
      noteOrigRef.current = ''
      setNoteDraft('')
      setRejectReason('')
      return
    }

    setMsg(null)
    setPending(null)
    setLoading(false)
    setConfirmAttempted(false)

    const v = (data && data[noteField] != null) ? String(data[noteField]) : ''
    noteOrigRef.current = v
    setNoteDraft(v)
    setRejectReason('')

    window.setTimeout(() => autoResizeNote(noteRef.current), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey])

  React.useEffect(() => {
    const t = window.setTimeout(() => autoResizeNote(noteRef.current), 0)
    return () => window.clearTimeout(t)
  }, [noteDraft, autoResizeNote])

  const isLocked = pending != null || loading
  const showOverlay = isLocked && hasSel

  // ── computeNodoAttivo: determina quale ruolo deve agire ora sulla pratica ───
  // Replica la logica di computeSintetico del widget Elenco.
  // Scansiona i ruoli dal più avanzato (DA) al meno avanzato (TR) e
  // restituisce il primo con dati valorizzati → quello è il nodo corrente.
  // Se nessuno ha dati, usa origine_pratica: 1→'RZ', 2→'TI'.
  const computeNodoAttivo = (d: any): string => {
    if (!d) return ''
    const scanOrder = ['DA', 'DT', 'RI', 'RZ', 'TI', 'TR']
    const hasData = (role: string) => {
      const p = d[`presa_in_carico_${role}`]
      const s = d[`stato_${role}`]
      const e = d[`esito_${role}`]
      return (p !== null && p !== undefined && p !== '')
          || (s !== null && s !== undefined && s !== '')
          || (e !== null && e !== undefined && e !== '')
    }
    for (const r of scanOrder) {
      if (!hasData(r)) continue
      // Trovato il nodo più avanzato con dati
      const presaRaw = d[`presa_in_carico_${r}`]
      const statoRaw = d[`stato_${r}`]
      const esitoRaw = d[`esito_${r}`]
      const presaNum = presaRaw !== null && presaRaw !== undefined && presaRaw !== '' ? Number(presaRaw) : null
      const statoNum = statoRaw !== null && statoRaw !== undefined && statoRaw !== '' ? Number(statoRaw) : null
      const esitoNum = esitoRaw !== null && esitoRaw !== undefined && esitoRaw !== '' ? Number(esitoRaw) : null
      // esito → pratica trasmessa al ruolo successivo o chiusa: non è più questo ruolo ad agire
      // (lascia passare: il successivo nel scanOrder prenderà)
      if (esitoNum !== null && Number.isFinite(esitoNum)) {
        // esito presente → questo ruolo ha già agito, il nodo attivo è il SUCCESSORE
        // (ma non abbiamo un "successore" esplicito — restituiamo questo ruolo
        //  per sicurezza; canStartTakeInCharge lo bloccherà comunque perché
        //  esito != null significa che la pratica è già stata processata)
        return r
      }
      // presa=1 (trasmessa, da prendere) o presa=2 (in carico) o stato valorizzato → questo è il nodo
      if (presaNum !== null || statoNum !== null) return r
      return r
    }
    // Nessun dato: pratica nuova
    const op = d['origine_pratica']
    const opNum = op !== null && op !== undefined && op !== '' ? Number(op) : null
    return opNum === 2 ? 'TI' : 'RZ'
  }

  // Il ruolo che deve agire ORA sulla pratica selezionata
  const nodoAttivo = data ? computeNodoAttivo(data) : ''
  // L'utente loggato può agire solo se è il nodo attivo
  const isMyTurn = nodoAttivo === role

  // TI non deve poter "prendere in carico" una pratica nata da gestionale (origine=2)
  // se non ha ancora workflow: quella pratica è già sua. "Prendi in carico" ha senso
  // per TI SOLO quando RZ gliela rimanda per integrazione (presaNum === PRESA_DA_PRENDERE).
  const isTiOwningOrigin2 = role === 'TI' && origineNum === 2 && presaNum == null

  const canStartTakeInCharge =
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    pending === null &&
    isMyTurn &&
    !isTiOwningOrigin2 &&
    (presaNum == null || presaNum === PRESA_DA_PRENDERE) &&
    (statoNum == null || statoNum === STATO_DA_PRENDERE)

  const canStartEsito =
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    pending === null &&
    isMyTurn &&
    presaNum === PRESA_IN_CARICO &&
    statoNum === STATO_PRESA_IN_CARICO

  const canStartTrasmetti =
    role === 'DT' &&
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    pending === null &&
    isMyTurn &&
    (statoNum === STATO_INTEGRAZIONE || statoNum === STATO_APPROVATA || statoNum === STATO_RESPINTA) &&
    (statoDANum == null || statoDANum === 0)

  // NOTE: compare solo per integrazione/respinta
  const showNote = pending === 'INTEGRAZIONE' || pending === 'RESPINGI'
  const noteEnabled = showNote && hasSel && !loading && !lockedByTransmit

  const noteTrim = String(noteDraft ?? '').trim()
  const reasonTrim = String(rejectReason ?? '').trim()
  const isAltro = /\baltro\b/i.test(reasonTrim)

  // obblighi:
  const noteIsRequired =
    (pending === 'INTEGRAZIONE') ||
    (pending === 'RESPINGI' && isAltro)

  const reasonIsRequired = pending === 'RESPINGI'

  const reasonInvalid = reasonIsRequired && !reasonTrim
  const noteInvalid = noteIsRequired && !noteTrim

  const reasonReqErr = confirmAttempted && reasonInvalid
  const noteReqErr = confirmAttempted && noteInvalid

  const onAnnulla = () => {
    setPending(null)
    setLoading(false)
    setMsg(null)
    setConfirmAttempted(false)
    setNoteDraft(noteOrigRef.current)
    setRejectReason('')
  }

  const startAction = (p: Pending) => {
    if (!hasSel) return
    if (lockedByTransmit) return
    if (p === 'TAKE' && !canStartTakeInCharge) return
    if (p !== 'TAKE' && p !== 'TRASMETTI' && !canStartEsito) return
    if (p === 'TRASMETTI' && !canStartTrasmetti) return

    setPending(p)
    setMsg(null)
    setConfirmAttempted(false)
    setRejectReason('')

    if (p === 'INTEGRAZIONE') {
      window.setTimeout(() => {
        try { noteRef.current?.focus?.() } catch {}
        autoResizeNote(noteRef.current)
      }, 0)
    }
  }

  const getRootDs = (maybeDs: any) => {
    let root = maybeDs
    try { while (root?.belongToDataSource) root = root.belongToDataSource } catch {}
    return root || maybeDs
  }

  const resolveLayer = async (maybeDs: any) => {
    const root = getRootDs(maybeDs)
    const raw =
      root?.getLayer?.() ||
      root?.getJSAPILayer?.() ||
      root?.layer ||
      root?.createJSAPILayerByDataSource?.() ||
      maybeDs?.getLayer?.() ||
      maybeDs?.getJSAPILayer?.() ||
      maybeDs?.layer ||
      maybeDs?.createJSAPILayerByDataSource?.() ||
      null
    const resolved = await Promise.resolve(raw as any)
    const layer = unwrapJsapiLayer(resolved)
    return { root, layer }
  }

  // Chiama applyEdits/updateFeatures direttamente via REST (fetch).
  // Bypassa completamente il JS API layer e le sue capability-check.
  // Richiede: URL del FeatureServer layer + token AGOL + attributi da aggiornare.
  const applyEditsViaRest = async (layerUrl: string, attrs: Record<string, any>): Promise<void> => {
    // Prendi il token dall'IdentityManager (già loggato via OAuth)
    let token = ''
    try {
      const esriId = await loadEsriModule<any>('esri/identity/IdentityManager')
      // serverInfo può essere null se l'URL non è ancora registrato: usiamo getCredential
      const cred = await esriId.getCredential(layerUrl)
      token = cred?.token || ''
    } catch { /* se fallisce procediamo senza token: vedremo l'errore REST */ }

    const featureJson = JSON.stringify({ attributes: attrs })
    const body = new URLSearchParams({
      f: 'json',
      features: `[${featureJson}]`,
      rollbackOnFailure: 'true',
      ...(token ? { token } : {})
    })

    const url = `${layerUrl.replace(/\/$/, '')}/updateFeatures`
    const resp = await fetch(url, { method: 'POST', body })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()

    if (json.error) {
      throw new Error(`REST error: code=${json.error.code} – ${json.error.message}`)
    }
    const upd = json.updateResults?.[0]
    if (upd && !upd.success) {
      const e = upd.error
      throw new Error(e ? `code=${e.code} – ${e.description || e.message}` : JSON.stringify(upd))
    }
  }

  const runApplyEdits = async (attributesIn: Record<string, any>, okText: string) => {
    if (!ds) throw new Error('DataSource non disponibile.')
    if (!hasSel || oid == null) throw new Error('Selezione non valida.')

    const startKey = selectionKeyRef.current
    setLoading(true)
    setMsg({ kind: 'info', text: 'Aggiorno…' })

    try {
      const motherUrl = props.motherLayerUrl ? String(props.motherLayerUrl).trim() : ''
      const root = getRootDs(ds)

      if (motherUrl) {
        // ── Via REST diretta sul FS madre ─────────────────────────────────────
        const idFieldName = idFieldNameFromSel || 'OBJECTID'
        const attrs = { [idFieldName]: oid, ...attributesIn }
        await applyEditsViaRest(motherUrl, attrs)
      } else {
        // ── Fallback: JS API layer (viste con editing abilitato) ──────────────
        const { layer } = await resolveLayer(ds)

        if (!layer?.applyEdits) {
          throw new Error('Layer non disponibile (applyEdits).')
        }
        if (typeof layer.load === 'function') {
          try { await layer.load() } catch {}
        }

        const idFieldName =
          (getRootDs(ds)?.getIdField ? getRootDs(ds).getIdField() : null) ||
          (ds?.getIdField ? ds.getIdField() : null) ||
          layer.objectIdField ||
          idFieldNameFromSel ||
          'OBJECTID'

        const fullAttrs = { [idFieldName]: oid, ...attributesIn }
        const attrs = filterAttrsToLayerFields(fullAttrs, layer)

        const res = await layer.applyEdits({ updateFeatures: [{ attributes: attrs }] })

        const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
        const err = upd?.error
        const ok =
          !err &&
          (upd?.success === true || upd?.objectId != null || upd?.globalId != null || upd?.success == null)

        if (!ok) {
          const detail = err
            ? `code=${err.code ?? ''} name=${err.name ?? ''} message=${err.message ?? ''}`
            : JSON.stringify(res || upd)
          throw new Error(detail)
        }
      }

      // se la selezione è cambiata nel frattempo: niente messaggi “appesi”
      if (selectionKeyRef.current !== startKey) {
        setMsg(null)
        setLoading(false)
        return
      }

      setMsg({ kind: 'ok', text: okText })

      // refresh root + derived + ds corrente (per sicurezza)
      await refreshRootAndDerived(root)
      await refreshRootAndDerived(ds)

      window.setTimeout(() => {
        if (selectionKeyRef.current === startKey) setMsg(null)
      }, 4500)

      setLoading(false)
    } catch (e) {
      setLoading(false)
      throw e
    }
  }

  const onConfirmTakeInCharge = async () => {
    try {
      await runApplyEdits(
        {
          [presaField]: PRESA_IN_CARICO,
          [dtPresaField]: Date.now(),
          [statoField]: STATO_PRESA_IN_CARICO,
          [dtStatoField]: Date.now()
        },
        'Presa in carico salvata.'
      )
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmIntegrazione = async () => {
    setConfirmAttempted(true)
    if (!noteTrim) return

    try {
      const stato = mapEsitoToStato(ESITO_INTEGRAZIONE) // => 3
      await runApplyEdits(
        {
          [esitoField]: ESITO_INTEGRAZIONE,
          [dtEsitoField]: Date.now(),
          [statoField]: stato ?? STATO_INTEGRAZIONE,
          [dtStatoField]: Date.now(),
          [noteField]: noteTrim
        },
        'Integrazione richiesta salvata.'
      )
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmEsito = async (esito: number, label: string) => {
    try {
      const stato = mapEsitoToStato(esito)
      const upd: Record<string, any> = {
        [esitoField]: esito,
        [dtEsitoField]: Date.now()
      }
      if (stato != null) {
        upd[statoField] = stato
        upd[dtStatoField] = Date.now()
      }
      await runApplyEdits(upd, `Esito salvato: ${label}.`)
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmRespinta = async () => {
    setConfirmAttempted(true)
    if (!reasonTrim) return
    if (noteIsRequired && !noteTrim) return

    try {
      const stato = mapEsitoToStato(ESITO_RESPINTA)
      const finalNote = isAltro
        ? `Motivazione: ${reasonTrim}\n\n${noteTrim}`
        : `Motivazione: ${reasonTrim}` + (noteTrim ? `\n\n${noteTrim}` : '')

      const upd: Record<string, any> = {
        [esitoField]: ESITO_RESPINTA,
        [dtEsitoField]: Date.now(),
        [noteField]: finalNote
      }

      if (stato != null) {
        upd[statoField] = stato
        upd[dtStatoField] = Date.now()
      }

      await runApplyEdits(upd, 'Esito salvato: Respinta.')
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmTrasmetti = async () => {
    try {
      await runApplyEdits(
        {
          [statoDAField]: STATO_DA_PRENDERE,
          [dtStatoDAField]: Date.now(),
          [presaDAField]: PRESA_DA_PRENDERE,
          [dtPresaDAField]: null
        },
        'Trasmesso a DA.'
      )
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const labelReqStyle = (isRequired: boolean, isError: boolean): React.CSSProperties => {
    if (!isRequired) return { display: 'none' }
    return { fontSize: ui.statusFontSize, color: isError ? '#b42318' : '#6b7280' }
  }

  const panelStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1001,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  minHeight: 0
}

  return (
    <div>
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.10)',
            zIndex: 1000
          }}
        />
      )}

      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Azioni ({role})</div>
          {msg && <div style={msgStyle(msg.kind, msgFontSize)} title={msg.text}>{msg.text}</div>}
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <DetailRow label='N.pratica (OID)' value={oid} labelSize={ui.statusFontSize} valueSize={titleFontSize} labelColor={(ui as any).formLabelColor} />
          <DetailRow label={presaField} value={presaVal} labelSize={ui.statusFontSize} valueSize={titleFontSize} labelColor={(ui as any).formLabelColor} />
          <DetailRow label={statoField} value={statoVal} labelSize={ui.statusFontSize} valueSize={titleFontSize} labelColor={(ui as any).formLabelColor} />
          <DetailRow label={esitoField} value={esitoVal} labelSize={ui.statusFontSize} valueSize={titleFontSize} labelColor={(ui as any).formLabelColor} />
          <DetailRow label={statoDAField} value={statoDAVal} labelSize={ui.statusFontSize} valueSize={titleFontSize} labelColor={(ui as any).formLabelColor} />
        </div>

        <div style={{ height: 1, background: ui.dividerColor, margin: '2px 0' }} />

        {/* Etichetta “Azioni” solo quando mostro i tasti azione */}
        {pending === null && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Azioni</div>
          </div>
        )}

        {/* BOTTONI AZIONE */}
        {pending === null && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              type='primary'
              onClick={() => startAction('TAKE')}
              disabled={!canStartTakeInCharge}
              style={actionButtonStyle(buttonColors.take, !canStartTakeInCharge, ui)}
            >
              {buttonText}
            </Button>

            <Button
              type='primary'
              onClick={() => startAction('INTEGRAZIONE')}
              disabled={!canStartEsito}
              style={actionButtonStyle(buttonColors.integrazione, !canStartEsito, ui)}
            >
              Integrazione
            </Button>

            <Button
              type='primary'
              onClick={() => startAction('APPROVA')}
              disabled={!canStartEsito}
              style={actionButtonStyle(buttonColors.approva, !canStartEsito, ui)}
            >
              Approva
            </Button>

            <Button
              type='primary'
              onClick={() => startAction('RESPINGI')}
              disabled={!canStartEsito}
              style={actionButtonStyle(buttonColors.respingi, !canStartEsito, ui)}
            >
              Respingi
            </Button>

            {role === 'DT' && (
              <Button
                type='primary'
                onClick={() => startAction('TRASMETTI')}
                disabled={!canStartTrasmetti}
                style={actionButtonStyle(buttonColors.trasmetti, !canStartTrasmetti, ui)}
              >
                Trasmetti a DA
              </Button>
            )}

            {/* PULSANTI MODIFICA TI — visibili solo se configurati */}
            {ec.show && (
              <>
                <div style={{ width: '100%', height: 1, background: ui.dividerColor, margin: '4px 0' }} />
                <button
                  type='button'
                  disabled={!canEdit}
                  onClick={handleEditOverlay}
                  title={canEdit ? 'Apre il pannello di editing nella pagina corrente' : 'Modifica non disponibile: verifica stato e presa in carico TI'}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: canEdit ? ec.overlayColor : '#e5e7eb',
                    color: canEdit ? '#fff' : '#9ca3af',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: canEdit ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  ✏️ Modifica (overlay)
                </button>
                <button
                  type='button'
                  disabled={!canEdit}
                  onClick={handleEditPage}
                  title={canEdit ? `Apre la pagina di editing: ${ec.pageId}` : 'Modifica non disponibile: verifica stato e presa in carico TI'}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: `2px solid ${canEdit ? ec.pageColor : '#e5e7eb'}`,
                    background: '#fff',
                    color: canEdit ? ec.pageColor : '#9ca3af',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: canEdit ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  ↗ Modifica (pagina)
                </button>
              </>
            )}
          </div>
        )}

        {/* OVERLAY EDITING INLINE (aperto da "Modifica overlay") */}
        {editOverlayOpen && hasSel && oid != null && data != null && (
          <InlineEditOverlay
            oid={oid}
            data={data}
            ds={ds}
            idFieldName={idFieldNameFromSel}
            cfg={ec}
            ui={ui}
            onClose={(saved) => {
              setEditOverlayOpen(false)
              if (saved) {
                setMsg({ kind: 'ok', text: 'Pratica modificata.' })
                window.setTimeout(() => setMsg(null), 4000)
              }
            }}
          />
        )}

        {/* SEZIONE CONFERMA: Conferma + Annulla stanno sempre in fondo */}
        {pending !== null && (
          <div style={{ display: 'grid', gap: 10 }}>
            {/* Motivazione (solo respinta) */}
            {pending === 'RESPINGI' && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Motivazione</div>
                  <div style={labelReqStyle(true, reasonReqErr)}>(obbligatoria)</div>
                </div>

                <ZebraDropdown
                  value={rejectReason}
                  options={ui.rejectReasons || []}
                  placeholder='— seleziona —'
                  disabled={loading || !hasSel || lockedByTransmit}
                  onChange={(v) => {
                    const vv = String(v ?? '')
                    setRejectReason(vv)
                    if (confirmAttempted) setConfirmAttempted(false) // ricalcolo “rosso” su nuova interazione
                  }}
                  evenBg={ui.reasonsZebraEvenBg}
                  oddBg={ui.reasonsZebraOddBg}
                  borderColor={ui.reasonsRowBorderColor}
                  borderWidth={ui.reasonsRowBorderWidth}
                  radius={ui.reasonsRowRadius}
                  fontSize={ui.statusFontSize}
                  isError={reasonReqErr}
                />
              </div>
            )}

            {/* NOTE (solo integrazione/respinta) */}
            {showNote && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Note</div>

                  {pending === 'INTEGRAZIONE' && (
                    <div style={labelReqStyle(true, noteReqErr)}>(obbligatoria)</div>
                  )}

                  {pending === 'RESPINGI' && noteIsRequired && (
                    <div style={labelReqStyle(true, noteReqErr)}>(obbligatoria)</div>
                  )}
                </div>

                <textarea
                  ref={noteRef}
                  value={noteDraft}
                  onChange={(e) => {
                    const v = String((e.target as HTMLTextAreaElement).value ?? '')
                    setNoteDraft(v)
                    autoResizeNote(e.target as HTMLTextAreaElement)
                  }}
                  placeholder={
                    pending === 'INTEGRAZIONE'
                      ? 'Scrivi la richiesta di integrazione…'
                      : (noteIsRequired
                          ? 'Specifica il motivo (Altro)…'
                          : 'Nota facoltativa (eventuali dettagli)…')
                  }
                  style={{
                    width: '100%',
                    minHeight: NOTE_MIN_H,
                    maxHeight: NOTE_MAX_H,
                    overflowY: 'hidden',
                    resize: 'none',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: noteReqErr ? '1px solid #b42318' : '1px solid rgba(0,0,0,0.20)',
                    fontSize: ui.statusFontSize,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  disabled={!noteEnabled}
                />
              </div>
            )}

            {/* BOTTONI (sempre in fondo) */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {pending === 'TAKE' && (
                <Button
                  type='primary'
                  onClick={onConfirmTakeInCharge}
                  disabled={loading}
                  style={actionButtonStyle(buttonColors.take, !!loading, ui)}
                >
                  {loading ? 'Aggiorno…' : 'Conferma presa in carico'}
                </Button>
              )}

              {pending === 'INTEGRAZIONE' && (
                <Button
                  type='primary'
                  onClick={onConfirmIntegrazione}
                  disabled={loading}
                  style={actionButtonStyle(buttonColors.integrazione, !!loading, ui)}
                >
                  {loading ? 'Aggiorno…' : 'Conferma integrazione'}
                </Button>
              )}

              {pending === 'APPROVA' && (
                <Button
                  type='primary'
                  onClick={() => onConfirmEsito(ESITO_APPROVATA, 'Approvata')}
                  disabled={loading}
                  style={actionButtonStyle(buttonColors.approva, !!loading, ui)}
                >
                  {loading ? 'Aggiorno…' : 'Conferma approvazione'}
                </Button>
              )}

              {pending === 'RESPINGI' && (
                <Button
                  type='primary'
                  onClick={onConfirmRespinta}
                  disabled={loading}
                  style={actionButtonStyle(buttonColors.respingi, !!loading, ui)}
                >
                  {loading ? 'Aggiorno…' : 'Conferma respinta'}
                </Button>
              )}

              {pending === 'TRASMETTI' && (
                <Button
                  type='primary'
                  onClick={onConfirmTrasmetti}
                  disabled={loading}
                  style={actionButtonStyle(buttonColors.trasmetti, !!loading, ui)}
                >
                  {loading ? 'Aggiorno…' : 'Conferma trasmissione'}
                </Button>
              )}

              <Button
                type='default'
                onClick={onAnnulla}
                disabled={loading}
              >
                Annulla
              </Button>
            </div>
          </div>
        )}

        {lockedByTransmit && hasSel && (
          <div style={{ ...msgStyle('info', msgFontSize), marginTop: 4 }}>
            Pratica già trasmessa a DA: azioni non disponibili.
          </div>
        )}
      </div>
    </div>
  )
}


type TabFields = {
  anagrafica: string[]
  violazione: string[]
  allegati: string[]
  iterExtra: string[]
}

function formatDateSafe (v: any): string {
  if (v == null || v === '') return '—'
  try {
    // ArcGIS può restituire epoch ms o ISO
    const n = Number(v)
    const d = Number.isFinite(n) && n > 0 ? new Date(n) : new Date(String(v))
    if (Number.isNaN(d.getTime())) return String(v)
    // formato IT: gg/mm/aaaa hh:mm
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear())
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yy} ${hh}:${mi}`
  } catch {
    return String(v)
  }
}

function normalizeFieldList (arr: any): string[] {
  if (!arr) return []
  const js = (arr as any)?.asMutable ? (arr as any).asMutable({ deep: true }) : arr
  const a = Array.isArray(js) ? js : []
  return a.map(x => String(x)).filter(Boolean)
}

function autoPickFields (data: any, kind: string): string[] {
  if (!data) return []
  const keys = Object.keys(data).filter(k => !/^objectid$/i.test(k) && !/^globalid$/i.test(k) && !/^shape/i.test(k))
  const pickBy = (re: RegExp) => keys.filter(k => re.test(k))
  if (kind === 'ANAGRAFICA') {
    const a = pickBy(/ditta|denom|ragione|nome|cognome|cf|cod.*fisc|piva|partita|indir|via|cap|comune|prov|telefono|cell|mail|pec/i)
    return a.slice(0, 16)
  }
  if (kind === 'VIOLAZIONE') {
    const a = pickBy(/viol|infraz|descr|art|norm|tipo|sanz|import|acqua|volume|turno|utenza|contatore/i)
    return a.slice(0, 16)
  }
  if (kind === 'ALLEGATI') {
    const a = pickBy(/alleg|foto|doc|file|url|link|pdf|jpg|png/i)
    return a.slice(0, 16)
  }
  // ITER: lasciamo vuoto, perché ha già blocchi DT/DA
  return []
}

// Migra dai vecchi tabFields alle nuove tab
function migrateTabs(tabFields: TabFields, tabs: TabConfig[] | undefined): TabConfig[] {
  let result: TabConfig[] = []
  
  // Se ha già tabs, usa quelle
  if (Array.isArray(tabs) && tabs.length > 0) {
    result = tabs
  } else {
    // Altrimenti migra dai vecchi tabFields
    result = [
      {
        id: 'anagrafica',
        label: 'Anagrafica',
        fields: tabFields?.anagrafica || []
      },
      {
        id: 'violazione',
        label: 'Violazione',
        fields: tabFields?.violazione || []
      },
      {
        id: 'iter',
        label: 'Iter',
        fields: tabFields?.iterExtra || [],
        isIterTab: true
      },
      {
        id: 'allegati',
        label: 'Allegati',
        fields: tabFields?.allegati || []
      },
      {
        id: 'azioni',
        label: 'Azioni',
        fields: []
      }
    ]
  }
  
  // Normalizza hideEmpty per tab (retrocompatibilità)
  return result.map(tab => {
    const normalizedHideEmpty =
      (tab as any).hideEmpty != null
        ? Boolean((tab as any).hideEmpty)
        : (tab.id === 'violazione' || tab.id === 'allegati')

    if (tab.id === 'azioni') {
      const { locked, ...rest } = tab as any
      return { ...rest, hideEmpty: false } as any
    }
    return { ...(tab as any), hideEmpty: normalizedHideEmpty } as any
  })
}

function TabButton (props: { active: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  const bg = props.active ? '#eaf2ff' : 'rgba(0,0,0,0.02)'
  const bd = props.active ? '#2f6fed' : 'rgba(0,0,0,0.12)'
  const col = props.active ? '#1d4ed8' : '#111827'
  return (
    <button
      type='button'
      disabled={!!props.disabled}
      onClick={props.onClick}
      style={{
        padding: '8px 10px',
        borderRadius: 10,
        border: `1px solid ${bd}`,
        background: bg,
        color: col,
        fontWeight: 700,
        fontSize: 12,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.55 : 1
      }}
    >
      {props.label}
    </button>
  )
}

function ReadOnlyPanel (props: {
  title: string
  ui?: any
  rows: Array<{ label: string; value: any }>
  emptyText?: string
}) {
    const ui = props.ui ?? {}
    const titleFontSize = Number.isFinite(Number(ui.titleFontSize)) ? Number(ui.titleFontSize) : 14
    const msgFontSize = Number.isFinite(Number(ui.msgFontSize)) ? Number(ui.msgFontSize) : 12
    const statusFontSize = Number.isFinite(Number(ui.statusFontSize)) ? Number(ui.statusFontSize) : 12
    const _rlColor = String(ui.formLabelColor || '#6b7280')
    const _rlSize = Number.isFinite(Number(ui.formLabelFontSize)) ? Number(ui.formLabelFontSize) : 12
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}
    >
      <div style={{ fontWeight: 800, fontSize: titleFontSize, marginBottom: 10 }}>
        {props.title}
      </div>

      {!props.rows.length
        ? <div style={{ ...msgStyle('info', msgFontSize) }}>{props.emptyText || 'Configura i campi nelle impostazioni.'}</div>
        : (
          <div style={{ display: 'grid', gap: 8 }}>
            {props.rows.map((r, i) => (
              <DetailRow
                key={i}
                label={r.label}
                value={r.value}
                labelSize={_rlSize}
                valueSize={13}
                labelColor={_rlColor}
              />
            ))}
          </div>
          )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// NUOVA PRATICA TI — form che segue la struttura del survey XLS
// Mostrato quando nessun record è selezionato (hasSel=false).
// ══════════════════════════════════════════════════════════════════════════════

const CHOICES = {
  tipo_soggetto: [{ v: 'PF', l: 'Persona fisica' }, { v: 'PG', l: 'Persona giuridica' }],
  ufficio: ['Cagliari','Iglesias','Masainas','Quartucciu','San Gavino Monreale','San Giovanni Suergiu','San Sperate','Senorbì','Serramanna'].map(v=>({v,l:v})),
  tipo_abuso: [{ v: 'parziale', l: 'Parziale' }, { v: 'totale', l: 'Totale' }],
  art15_parziale: [{ v: 'Art15.1', l: 'Prima contestazione' }, { v: 'Art15.2', l: 'Recidiva' }],
  art15_totale:   [{ v: 'Art15.3', l: 'Prima contestazione' }, { v: 'Art15.4', l: 'Recidiva' }],
  art16_17: [
    { v: 'Art16', l: 'Art. 16 – Comunicazione di irrigazione tardiva' },
    { v: 'Art17', l: 'Art. 17 – Comunicazione di variazione o di rinuncia tardiva' },
  ],
  art17_tipo: [{ v: 'Art17.1', l: 'Variazione tardiva' }, { v: 'Art17.2', l: 'Rinuncia tardiva' }],
  presenza: [{ v: 'sì', l: 'Sì' }, { v: 'no', l: 'No' }],
  grado: [{ v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }, { v: '4', l: '4' }],
  norma3: [
    { v: 'Art8',  l: 'Art. 8 - Violazione servizio reperibilità' },
    { v: 'Art12', l: 'Art. 12 - Negato accesso ai fondi (al personale consortile)' },
    { v: 'Art27', l: 'Art. 27 – Spreco d\'acqua/uso negligente risorsa idrica' },
    { v: 'Art28', l: 'Art. 28 - Violazione prescrizioni del consorzio' },
    { v: 'Art29', l: 'Art. 29 - Violazione termini restituzione attrezzature' },
    { v: 'Art30', l: 'Art. 30 - Danneggiamento e/o perdita attrezzature' },
    { v: 'Art31', l: 'Art. 31 - Mancata segnalazione guasti' },
    { v: 'Art32', l: 'Art. 32 - Negato accesso ai fondi (al consorziato)' },
    { v: 'Art33', l: 'Art. 33 - Inosservanza limiti temporali di prelievo' },
    { v: 'Art34', l: 'Art. 34 - Interferenze' },
    { v: 'Art35', l: 'Art. 35 - Manomissione reti di dispensa e allaccio aspirazione' },
    { v: 'Art36', l: 'Art. 36 - Uso attrezzature non autorizzate' },
    { v: 'Art37', l: 'Art. 37 - Uso sistemi di irrigazione incompatibili' },
    { v: 'Art39', l: 'Art. 39 - Danni strutture irrigue' },
  ],
  qualifica_fondo: [
    { v: '1', l: 'Proprietario' },
    { v: '2', l: 'Affittuario' },
    { v: '3', l: 'Conduttore' },
    { v: '4', l: 'Concessionario' },
    { v: '5', l: 'Altro' }
  ],
  si_no: [{ v: '1', l: 'Sì' }, { v: '0', l: 'No' }],
  rl_carica: [
    { v: 'Legale rappresentante', l: 'Legale rappresentante' },
    { v: 'Amministratore unico', l: 'Amministratore unico' },
    { v: 'Amministratore delegato', l: 'Amministratore delegato' },
    { v: 'Presidente', l: 'Presidente' },
    { v: 'Socio amministratore', l: 'Socio amministratore' },
    { v: 'Titolare', l: 'Titolare' },
    { v: 'Altro', l: 'Altro' }
  ]
} as const

// campi v_art* associati alle scelte norma3
const NORMA3_TO_VFIELD: Record<string, string> = {
  Art8: 'v_art08', Art12: 'v_art12', Art27: 'v_art27', Art28: 'v_art28',
  Art29: 'v_art29', Art30: 'v_art30', Art31: 'v_art31', Art32: 'v_art32',
  Art33: 'v_art33', Art34: 'v_art34', Art35: 'v_art35', Art36: 'v_art36',
  Art37: 'v_art37', Art39: 'v_art39'
}

const _defaultFormStyle = {
  labelColor: '#6b7280', labelFontSize: 12,
  hdrColor: '#1d4ed8', hdrFontSize: 11,
  divColor: '#bfdbfe', divWidth: 2,
  fieldFontSize: 13
}
const FormStyleCtx = React.createContext(_defaultFormStyle)

const S: Record<string, React.CSSProperties> = {
  wrap:   { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', padding: '0 2px' },
  hdr:    { fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '2px solid #bfdbfe', paddingBottom: 4, marginBottom: 12, marginTop: 20 },
  lbl:    { fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' },
  inp:    { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.18)', fontSize: 13, boxSizing: 'border-box' as const, background: '#fff' },
  inpDis: { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.10)', fontSize: 13, boxSizing: 'border-box' as const, background: '#f3f4f6', color: '#6b7280' },
  sel:    { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.18)', fontSize: 13, boxSizing: 'border-box' as const, background: '#fff', cursor: 'pointer' },
  row2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  row3:   { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  fld:    { marginBottom: 10 },
  hint:   { fontSize: 11, color: '#9ca3af', marginTop: 3 },
}

function NpField(p: { label: string; children: React.ReactNode; hint?: string }) {
  const fs = React.useContext(FormStyleCtx)
  return (
    <div style={S.fld}>
      <label style={{ ...S.lbl, color: fs.labelColor, fontSize: fs.labelFontSize }}>{p.label}</label>
      {p.children}
      {p.hint && <div style={S.hint}>{p.hint}</div>}
    </div>
  )
}

function NpSel(p: { value: string; onChange: (v: string) => void; options: readonly {v:string;l:string}[]; disabled?: boolean }) {
  const fs = React.useContext(FormStyleCtx)
  return (
    <select value={p.value} onChange={e => p.onChange(e.target.value)} style={{ ...(p.disabled ? S.inpDis : S.sel), fontSize: fs.fieldFontSize }} disabled={p.disabled}>
      <option value=''>— seleziona —</option>
      {p.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}

function NpText(p: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; disabled?: boolean; maxLength?: number }) {
  const fs = React.useContext(FormStyleCtx)
  const st = { ...(p.disabled ? S.inpDis : S.inp), fontSize: fs.fieldFontSize }
  if (p.multiline) return (
    <textarea value={p.value} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder}
      rows={3} style={{ ...st, resize: 'vertical' }} disabled={p.disabled} maxLength={p.maxLength}/>
  )
  return <input type='text' value={p.value} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder} style={st} disabled={p.disabled} maxLength={p.maxLength}/>
}

function NpInt(p: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const fs = React.useContext(FormStyleCtx)
  return <input type='number' value={p.value} onChange={e => p.onChange(e.target.value)} style={{ ...(p.disabled ? S.inpDis : S.inp), fontSize: fs.fieldFontSize }} disabled={p.disabled}/>
}

function NpDate(p: { value: string; onChange: (v: string) => void; withTime?: boolean; disabled?: boolean }) {
  const fs = React.useContext(FormStyleCtx)
  return <input type={p.withTime ? 'datetime-local' : 'date'} value={p.value} onChange={e => p.onChange(e.target.value)} style={{ ...(p.disabled ? S.inpDis : S.inp), fontSize: fs.fieldFontSize }} disabled={p.disabled}/>
}

type NpDraft = Record<string, string>




type NsCategory = 'AT' | 'PR' | 'RU' | 'SL' | 'PF'
type NsSummary = {
  totaleAT: number
  totalePR: number
  totaleRU: number
  totaleSL: number
  totalePF: number
  percentualeSpeseGenerali: number
  importoSpeseGenerali: number
  totaleComplessivo: number
}

type NsSource = 'REGIONE' | 'INTERNO' | 'NUOVI PREZZI'

type NsDetailRow = {
  objectid: number
  categoria_costo: NsCategory
  origine_voce_snapshot: NsSource
  codice_voce_snapshot: string
  descrizione_snapshot: string
  unita_misura_snapshot: string
  prezzo_unitario_snapshot: number
  quantita: number
  importo_riga: number
  anno_prezzario_snapshot?: number | null
  ordine: number
  note: string
}

type NsManagerProps = {
  category: NsCategory
  title: string
  rows: NsDetailRow[]
  onRowsChange: (rows: NsDetailRow[]) => void
  onDirtyChange?: (dirty: boolean) => void
  resetKey?: number
}

const NS_CATEGORIES: readonly NsCategory[] = ['AT', 'PR', 'RU', 'SL', 'PF'] as const
const NS_CATEGORY_LABELS: Record<NsCategory, string> = {
  AT: 'Attrezzature e trasporti',
  PR: 'Materiali da costruzione',
  RU: 'Risorse umane',
  SL: 'Semilavorati',
  PF: 'Prodotti finiti'
}

const NS_SOURCES: readonly NsSource[] = ['REGIONE', 'INTERNO', 'NUOVI PREZZI'] as const
const NS_SOURCE_LABELS: Record<NsSource, string> = {
  REGIONE: 'Regionale',
  INTERNO: 'Interno',
  'NUOVI PREZZI': 'Nuovi prezzi'
}

function nsSourceShort (source: NsSource): string {
  if (source === 'INTERNO') return 'INT'
  if (source === 'NUOVI PREZZI') return 'NP'
  return 'REG'
}

function nsNormalizeSource (v: any): NsSource {
  const s = String(v || '').trim().toUpperCase().replace(/_/g, ' ')
  if (s === 'INTERNO') return 'INTERNO'
  if (s === 'NUOVI PREZZI') return 'NUOVI PREZZI'
  return 'REGIONE'
}

function nsMaybeNormalizeSource (v: any): NsSource | null {
  const s = String(v || '').trim()
  return s ? nsNormalizeSource(s) : null
}

const EMPTY_NS_SUMMARY: NsSummary = {
  totaleAT: 0,
  totalePR: 0,
  totaleRU: 0,
  totaleSL: 0,
  totalePF: 0,
  percentualeSpeseGenerali: 0,
  importoSpeseGenerali: 0,
  totaleComplessivo: 0
}

const EMPTY_NS_ROWS_BY_CATEGORY: Record<NsCategory, NsDetailRow[]> = {
  AT: [],
  PR: [],
  RU: [],
  SL: [],
  PF: []
}

function nsCloneRow (row: NsDetailRow): NsDetailRow {
  return {
    objectid: row.objectid,
    categoria_costo: row.categoria_costo,
    origine_voce_snapshot: row.origine_voce_snapshot,
    codice_voce_snapshot: row.codice_voce_snapshot,
    descrizione_snapshot: row.descrizione_snapshot,
    unita_misura_snapshot: row.unita_misura_snapshot,
    prezzo_unitario_snapshot: nsRound(nsSafeNum(row.prezzo_unitario_snapshot, 0), 4),
    quantita: nsRound(nsSafeNum(row.quantita, 0), 4),
    importo_riga: nsRound(nsSafeNum(row.importo_riga, 0), 2),
    anno_prezzario_snapshot: row.anno_prezzario_snapshot != null ? Math.trunc(nsSafeNum(row.anno_prezzario_snapshot, 0)) : null,
    ordine: Math.trunc(nsSafeNum(row.ordine, 0)),
    note: String(row.note || '').trim()
  }
}

function nsCloneRowsByCategory (src?: Record<NsCategory, NsDetailRow[]> | null): Record<NsCategory, NsDetailRow[]> {
  const out: Record<NsCategory, NsDetailRow[]> = {
    AT: [],
    PR: [],
    RU: [],
    SL: [],
    PF: []
  }
  NS_CATEGORIES.forEach((cat) => {
    out[cat] = Array.isArray(src?.[cat]) ? src![cat].map(nsCloneRow) : []
  })
  return out
}

function nsRowsByCategoryToFlat (src?: Record<NsCategory, NsDetailRow[]> | null): NsDetailRow[] {
  const out: NsDetailRow[] = []
  NS_CATEGORIES.forEach((cat) => {
    ;(src?.[cat] || []).forEach((row) => out.push(nsCloneRow(row)))
  })
  return out
}

function nsRowsFromFlat (rows: NsDetailRow[]): Record<NsCategory, NsDetailRow[]> {
  const out = nsCloneRowsByCategory(EMPTY_NS_ROWS_BY_CATEGORY)
  ;(rows || []).forEach((row) => {
    const cat = nsNormalizeCategory(row.categoria_costo) || 'PR'
    out[cat].push(nsCloneRow({ ...row, categoria_costo: cat }))
  })
  NS_CATEGORIES.forEach((cat) => {
    out[cat] = out[cat].sort((a, b) => {
      const ao = Math.trunc(nsSafeNum(a.ordine, 0))
      const bo = Math.trunc(nsSafeNum(b.ordine, 0))
      return ao !== bo ? ao - bo : Math.trunc(nsSafeNum(a.objectid, 0)) - Math.trunc(nsSafeNum(b.objectid, 0))
    })
  })
  return out
}

function nsRowSignature (row: NsDetailRow): string {
  return JSON.stringify({
    objectid: Math.trunc(nsSafeNum(row.objectid, 0)),
    categoria_costo: row.categoria_costo,
    origine_voce_snapshot: row.origine_voce_snapshot,
    codice_voce_snapshot: String(row.codice_voce_snapshot || '').trim(),
    descrizione_snapshot: String(row.descrizione_snapshot || '').trim(),
    unita_misura_snapshot: String(row.unita_misura_snapshot || '').trim(),
    prezzo_unitario_snapshot: nsRound(nsSafeNum(row.prezzo_unitario_snapshot, 0), 4),
    quantita: nsRound(nsSafeNum(row.quantita, 0), 4),
    importo_riga: nsRound(nsSafeNum(row.importo_riga, 0), 2),
    anno_prezzario_snapshot: row.anno_prezzario_snapshot != null ? Math.trunc(nsSafeNum(row.anno_prezzario_snapshot, 0)) : null,
    ordine: Math.trunc(nsSafeNum(row.ordine, 0))
  })
}

function nsRowsByCategoryEqual (a?: Record<NsCategory, NsDetailRow[]> | null, b?: Record<NsCategory, NsDetailRow[]> | null): boolean {
  for (const cat of NS_CATEGORIES) {
    const aa = a?.[cat] || []
    const bb = b?.[cat] || []
    if (aa.length !== bb.length) return false
    for (let i = 0; i < aa.length; i++) {
      if (nsRowSignature(aa[i]) !== nsRowSignature(bb[i])) return false
    }
  }
  return true
}

function nsComputeSummaryFromRows (rows: NsDetailRow[], perc: number): NsSummary {
  const sumBy = (cat: NsCategory) => nsRound((rows || []).filter(r => r.categoria_costo === cat).reduce((s, r) => s + nsSafeNum(r.importo_riga, 0), 0), 2)
  const totaleAT = sumBy('AT')
  const totalePR = sumBy('PR')
  const totaleRU = sumBy('RU')
  const totaleSL = sumBy('SL')
  const totalePF = sumBy('PF')
  const base = nsRound(totaleAT + totalePR + totaleRU + totaleSL + totalePF, 2)
  const percentualeSpeseGenerali = nsRound(nsSafeNum(perc, 0), 2)
  const importoSpeseGenerali = nsRound(base * percentualeSpeseGenerali / 100, 2)
  const totaleComplessivo = nsRound(base + importoSpeseGenerali, 2)
  return {
    totaleAT,
    totalePR,
    totaleRU,
    totaleSL,
    totalePF,
    percentualeSpeseGenerali,
    importoSpeseGenerali,
    totaleComplessivo
  }
}

const __giiNsLayerCache: Record<string, any> = {}

function nsSafeNum (v: any, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function nsRound (v: number, decimals = 2): number {
  const f = Math.pow(10, decimals)
  return Math.round((Number(v) + Number.EPSILON) * f) / f
}

function nsEscapeSqlString (v: string): string {
  return String(v || '').replace(/'/g, "''")
}

function nsNormalizeCategory (v: any): NsCategory | null {
  const s = String(v || '').trim().toUpperCase()
  if (s === 'AT') return 'AT'
  if (s === 'PR') return 'PR'
  if (s === 'RU') return 'RU'
  if (s === 'SL') return 'SL'
  if (s === 'PF') return 'PF'
  return null
}

function nsToCategoryLabel (c: NsCategory): string {
  return NS_CATEGORY_LABELS[c] || c
}

function nsToDateInputValue (v: any): string {
  if (v == null || v === '') return ''
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

async function getFeatureLayerByUrl (rawUrl: any): Promise<any> {
  const url = ensureLayerIndex(normalizeFeatureLayerUrl(rawUrl))
  if (!url) throw new Error('URL layer/tabella non configurata.')
  if (__giiNsLayerCache[url]) return __giiNsLayerCache[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url })
  try { if (typeof fl.load === 'function') await fl.load() } catch {}
  __giiNsLayerCache[url] = fl
  return fl
}

async function queryTableAttributes (rawUrl: any, where = '1=1', orderByFields = ''): Promise<any[]> {
  const fl = await getFeatureLayerByUrl(rawUrl)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = where || '1=1'
  q.outFields = ['*']
  q.returnGeometry = false
  if (orderByFields) q.orderByFields = [orderByFields]
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((f: any) => f?.attributes || {})
}

async function saveTableAttributes (rawUrl: any, attrs: Record<string, any>, objectid?: number | null): Promise<void> {
  const fl = await getFeatureLayerByUrl(rawUrl)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const fieldNames = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  const attributes: any = {}
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === oidField || fieldNames.has(k)) attributes[k] = v
  }
  if (objectid != null) attributes[oidField] = Number(objectid)
  const payload = objectid != null
    ? { updateFeatures: [{ attributes }] }
    : { addFeatures: [{ attributes }] }
  const res = await fl.applyEdits(payload as any)
  const editResult = objectid != null ? res?.updateFeatureResults?.[0] : res?.addFeatureResults?.[0]
  if (editResult?.error) throw new Error(editResult.error.message || 'Salvataggio non riuscito.')
}

async function deleteTableObjectId (rawUrl: any, objectid: number): Promise<void> {
  const fl = await getFeatureLayerByUrl(rawUrl)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const Graphic = await loadEsriModule<any>('esri/Graphic')
  const g = new Graphic({ attributes: { [oidField]: Number(objectid) } })
  const res = await fl.applyEdits({ deleteFeatures: [g] } as any)
  const r = res?.deleteFeatureResults?.[0]
  if (r?.error) throw new Error(r.error.message || 'Eliminazione non riuscita.')
}

async function loadRecordGlobalIdByOid (rawUrl: any, oidFieldName: string, oid: number): Promise<string> {
  const fl = await getFeatureLayerByUrl(rawUrl)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = `${oidFieldName} = ${Number(oid)}`
  q.outFields = ['GlobalID']
  q.returnGeometry = false
  q.num = 1
  const res = await fl.queryFeatures(q)
  const attrs = res?.features?.[0]?.attributes || {}
  return String(pickAttrCI(attrs, ['GlobalID', 'globalid']) || '').trim()
}

async function getNsPercentuale (rawUrl: any, codice: string): Promise<number> {
  const code = String(codice || 'SPESE_GENERALI_PERC').trim() || 'SPESE_GENERALI_PERC'
  const rows = await queryTableAttributes(rawUrl, `codice_parametro = '${nsEscapeSqlString(code)}'`, 'attivo DESC, anno_riferimento DESC, data_validita_da DESC, OBJECTID DESC')
  const row = rows.find((r: any) => nsSafeNum(r?.attivo, 1) === 1) || rows[0] || null
  return row ? nsRound(nsSafeNum((row as any).valore_num, 0), 2) : 0
}

async function getActivePrezzario (rawUrl: any): Promise<{ codice: string; anno: number; descrizione: string } | null> {
  const rows = await queryTableAttributes(rawUrl, `stato_prezzario = 1`, 'anno_prezzario DESC, OBJECTID DESC')
  const row = rows[0] || null
  if (!row) return null
  return {
    codice: String(row?.codice_prezzario || row?.prezzario_codice || '').trim(),
    anno: Math.trunc(nsSafeNum(row?.anno_prezzario, 0)),
    descrizione: String((row as any)?.titolo_prezzario || '').trim()
  }
}

function nsMapCartOrigine (codicePrezzario: string): NsSource {
  const s = String(codicePrezzario || '').trim().toUpperCase().replace(/_/g, ' ')
  if (s === 'INTERNO') return 'INTERNO'
  if (s === 'NUOVI PREZZI') return 'NUOVI PREZZI'
  return 'REGIONE'
}

async function queryNotaSpeseRows (detailUrl: string, parentGlobalId: string, category?: NsCategory): Promise<NsDetailRow[]> {
  const clauses = [`parent_globalid = '${nsEscapeSqlString(parentGlobalId)}'`]
  if (category) clauses.push(`categoria_costo = '${nsEscapeSqlString(category)}'`)
  const rows = await queryTableAttributes(detailUrl, clauses.join(' AND '), 'ordine ASC, OBJECTID ASC')
  return rows.map((r: any) => ({
    objectid: nsSafeNum(pickAttrCI(r, ['OBJECTID', 'objectid']), 0),
    categoria_costo: (nsNormalizeCategory(r?.categoria_costo) || category || 'PR') as NsCategory,
    origine_voce_snapshot: nsNormalizeSource(r?.origine_voce_snapshot || 'REGIONE'),
    codice_voce_snapshot: String(r?.codice_voce_snapshot || '').trim(),
    descrizione_snapshot: String(r?.descrizione_snapshot || '').trim(),
    unita_misura_snapshot: String(r?.unita_misura_snapshot || '').trim(),
    prezzo_unitario_snapshot: nsRound(nsSafeNum(r?.prezzo_unitario_snapshot ?? r?.costo_unitario_snapshot, 0), 4),
    quantita: nsRound(nsSafeNum(r?.quantita, 0), 4),
    importo_riga: nsRound(nsSafeNum(r?.importo_riga, 0), 2),
    anno_prezzario_snapshot: r?.anno_prezzario_snapshot != null ? Math.trunc(nsSafeNum(r?.anno_prezzario_snapshot, 0)) : null,
    ordine: Math.trunc(nsSafeNum(r?.ordine, 0)),
    note: String(r?.note || '').trim()
  }))
}


async function syncNotaSpeseDraftToTable (detailUrl: string, parentGlobalId: string, baselineRowsByCategory: Record<NsCategory, NsDetailRow[]>, draftRowsByCategory: Record<NsCategory, NsDetailRow[]>): Promise<void> {
  const fl = await getFeatureLayerByUrl(detailUrl)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const fieldNames = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  const toAttrs = (row: NsDetailRow, objectid?: number | null) => {
    const attrs: any = {}
    const put = (k: string, v: any) => { if (fieldNames.has(k)) attrs[k] = v }
    if (objectid != null && objectid > 0) attrs[oidField] = Number(objectid)
    if ((objectid == null || objectid <= 0) && parentGlobalId) put('parent_globalid', parentGlobalId)
    put('categoria_costo', row.categoria_costo)
    put('origine_voce_snapshot', row.origine_voce_snapshot)
    put('codice_voce_snapshot', row.codice_voce_snapshot)
    put('descrizione_snapshot', row.descrizione_snapshot)
    put('unita_misura_snapshot', row.unita_misura_snapshot)
    put('prezzo_unitario_snapshot', nsRound(nsSafeNum(row.prezzo_unitario_snapshot, 0), 4))
    put('quantita', nsRound(nsSafeNum(row.quantita, 0), 4))
    put('importo_riga', nsRound(nsSafeNum(row.importo_riga, 0), 2))
    put('anno_prezzario_snapshot', row.anno_prezzario_snapshot != null ? Math.trunc(nsSafeNum(row.anno_prezzario_snapshot, 0)) : null)
    put('ordine', Math.trunc(nsSafeNum(row.ordine, 0)))
    return attrs
  }
  const baseline = nsRowsByCategoryToFlat(baselineRowsByCategory)
  const draft = nsRowsByCategoryToFlat(draftRowsByCategory)
  const baselineByOid = new Map<number, NsDetailRow>()
  const draftByOid = new Map<number, NsDetailRow>()
  baseline.forEach((row) => { const oid = Math.trunc(nsSafeNum(row.objectid, 0)); if (oid > 0) baselineByOid.set(oid, nsCloneRow(row)) })
  draft.forEach((row) => { const oid = Math.trunc(nsSafeNum(row.objectid, 0)); if (oid > 0) draftByOid.set(oid, nsCloneRow(row)) })
  const addFeatures = draft.filter((row) => Math.trunc(nsSafeNum(row.objectid, 0)) <= 0).map((row) => ({ attributes: toAttrs(row, null) }))
  const updateFeatures = draft.filter((row) => {
    const oid = Math.trunc(nsSafeNum(row.objectid, 0))
    if (oid <= 0) return false
    const base = baselineByOid.get(oid)
    return !!base && nsRowSignature(base) !== nsRowSignature(row)
  }).map((row) => ({ attributes: toAttrs(row, row.objectid) }))
  const deleteIds = Array.from(baselineByOid.keys()).filter((oid) => !draftByOid.has(oid))
  const payload: any = {}
  if (addFeatures.length > 0) payload.addFeatures = addFeatures
  if (updateFeatures.length > 0) payload.updateFeatures = updateFeatures
  if (deleteIds.length > 0) {
    const Graphic = await loadEsriModule<any>('esri/Graphic')
    payload.deleteFeatures = deleteIds.map((oid) => new Graphic({ attributes: { [oidField]: oid } }))
  }
  if (!payload.addFeatures && !payload.updateFeatures && !payload.deleteFeatures) return
  const res = await fl.applyEdits(payload)
  const errs: string[] = []
  ;(res?.addFeatureResults || []).forEach((r: any) => { if (r?.error) errs.push(String(r.error.message || 'Errore add nota spese')) })
  ;(res?.updateFeatureResults || []).forEach((r: any) => { if (r?.error) errs.push(String(r.error.message || 'Errore update nota spese')) })
  ;(res?.deleteFeatureResults || []).forEach((r: any) => { if (r?.error) errs.push(String(r.error.message || 'Errore delete nota spese')) })
  if (errs.length > 0) throw new Error(errs.join(' | '))
}

async function recomputeAndPersistNotaSpeseSummary (opts: {
  parentLayerUrl: string
  parentObjectId: number
  parentIdFieldName: string
  parentGlobalId: string
  detailTableUrl: string
  parametriUrl: string
  parametroCode: string
}): Promise<NsSummary> {
  const rows = await queryNotaSpeseRows(opts.detailTableUrl, opts.parentGlobalId)
  const sumBy = (cat: NsCategory) => nsRound(rows.filter(r => r.categoria_costo === cat).reduce((s, r) => s + nsSafeNum(r.importo_riga, 0), 0), 2)
  const totaleAT = sumBy('AT')
  const totalePR = sumBy('PR')
  const totaleRU = sumBy('RU')
  const totaleSL = sumBy('SL')
  const totalePF = sumBy('PF')
  const base = nsRound(totaleAT + totalePR + totaleRU + totaleSL + totalePF, 2)
  const perc = await getNsPercentuale(opts.parametriUrl, opts.parametroCode)
  const importoSpeseGenerali = nsRound(base * nsSafeNum(perc, 0) / 100, 2)
  const totaleComplessivo = nsRound(base + importoSpeseGenerali, 2)
  const summary: NsSummary = {
    totaleAT,
    totalePR,
    totaleRU,
    totaleSL,
    totalePF,
    percentualeSpeseGenerali: nsRound(perc, 2),
    importoSpeseGenerali,
    totaleComplessivo
  }

  const fl = await getFeatureLayerByUrl(opts.parentLayerUrl)
  const oidField = String(fl?.objectIdField || opts.parentIdFieldName || 'OBJECTID')
  const fieldNames = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '').toLowerCase()))
  const attrs: any = { [oidField]: Number(opts.parentObjectId) }
  const put = (name: string, value: any) => { if (fieldNames.has(name.toLowerCase())) attrs[name] = value }
  put('ns_totale_attrezzature_trasporti', summary.totaleAT)
  put('ns_totale_materiali_costruzione', summary.totalePR)
  put('ns_totale_manodopera', summary.totaleRU)
  put('ns_totale_semilavorati', summary.totaleSL)
  put('ns_totale_prodotti_finiti', summary.totalePF)
  put('ns_spese_generali_perc', summary.percentualeSpeseGenerali)
  put('ns_importo_spese_generali', summary.importoSpeseGenerali)
  put('ns_totale_complessivo', summary.totaleComplessivo)
  put('ns_ricalcolata_il', Date.now())
  const res = await fl.applyEdits({ updateFeatures: [{ attributes: attrs }] } as any)
  const r = res?.updateFeatureResults?.[0]
  if (r?.error) throw new Error(r.error.message || 'Aggiornamento totali nota spese non riuscito.')
  return summary
}

function NoteSpeseManager (props: NsManagerProps) {
  const rows = React.useMemo(() => (props.rows || []).map(nsCloneRow), [props.rows])
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [editIdx, setEditIdx] = React.useState<number | null>(null)
  const [editQty, setEditQty] = React.useState('')
  const [confirmDeleteIdx, setConfirmDeleteIdx] = React.useState<number | null>(null)

  React.useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), 5000); return () => window.clearTimeout(t) }, [msg])
  React.useEffect(() => { setEditIdx(null); setEditQty('') }, [props.resetKey])

  const money = (n: any) => nsSafeNum(n, 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const categoryTotal = React.useMemo(() => nsRound(rows.reduce((s, r) => s + nsSafeNum(r.importo_riga, 0), 0), 2), [rows])

  const startEdit = (idx: number) => {
    setEditIdx(idx)
    setEditQty(String(rows[idx]?.quantita ?? ''))
  }

  const cancelEdit = () => { setEditIdx(null); setEditQty('') }

  const saveEdit = () => {
    if (editIdx == null || editIdx < 0 || editIdx >= rows.length) return
    const qty = nsRound(nsSafeNum(String(editQty).replace(',', '.'), 0), 4)
    const nextRows = rows.map((r, i) => {
      if (i !== editIdx) return nsCloneRow(r)
      const updated = nsCloneRow(r)
      updated.quantita = qty
      updated.importo_riga = nsRound(qty * nsSafeNum(r.prezzo_unitario_snapshot, 0), 2)
      return updated
    })
    props.onRowsChange(nextRows)
    setEditIdx(null)
    setEditQty('')
  }

  const onDelete = (idx: number) => {
    const row = rows[idx]
    if (!row) return
    setConfirmDeleteIdx(idx)
  }

  const doDelete = () => {
    const idx = confirmDeleteIdx
    setConfirmDeleteIdx(null)
    if (idx == null || idx < 0 || idx >= rows.length) return
    const nextRows = rows.filter((_, i) => i !== idx).map(nsCloneRow)
    props.onRowsChange(nextRows)
    if (editIdx === idx) { setEditIdx(null); setEditQty('') }
    setMsg({ ok: true, text: 'Riga rimossa dalla bozza.' })
  }

  const thS: React.CSSProperties = { background: '#1F4E79', color: '#fff', padding: '7px 8px', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, fontSize: 12, whiteSpace: 'nowrap' }
  const tdS = (idx: number): React.CSSProperties => ({ padding: '6px 8px', borderBottom: '1px solid #e0eaf4', background: idx % 2 === 0 ? '#f5f9ff' : '#fff', fontSize: 12 })

  return (
    <div style={{ border: '1px solid #c5d9f1', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div style={{ background: '#1F4E79', color: '#fff', padding: '8px 10px', fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{props.title}</span>
        <span style={{ fontSize: 12, opacity: 0.9 }}>{money(categoryTotal)} €</span>
      </div>
      <div style={{ padding: 10, display: 'grid', gap: 8 }}>
        {msg && (
          <div style={{ padding: '7px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700, border: `1px solid ${msg.ok ? '#b8d4b0' : '#f5b8b8'}`, background: msg.ok ? '#e2efda' : '#fce4e4', color: msg.ok ? '#375623' : '#c00' }}>{msg.text}</div>
        )}
        {editIdx != null && editIdx >= 0 && editIdx < rows.length && (
          <div style={{ padding: 8, border: '1px solid #aac4e0', borderRadius: 6, background: '#f5f9ff', display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, color: '#1F4E79', fontWeight: 700 }}>Modifica quantità — {rows[editIdx].codice_voce_snapshot}</div>
            <div style={{ fontSize: 12, color: '#444' }}>{rows[editIdx].descrizione_snapshot}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type='text' inputMode='decimal' value={editQty} onChange={(e) => setEditQty(e.target.value.replace(',', '.'))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} style={{ width: 100, padding: '5px 8px', border: '1px solid #aac4e0', borderRadius: 4, fontSize: 13 }} autoFocus />
              <span style={{ fontSize: 12, color: '#6b7280' }}>{rows[editIdx].unita_misura_snapshot || 'u.m.'}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>×</span>
              <span style={{ fontSize: 12, color: '#375623', fontWeight: 700 }}>{money(rows[editIdx].prezzo_unitario_snapshot)}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>=</span>
              <span style={{ fontSize: 12, color: '#1F4E79', fontWeight: 700 }}>{money(nsRound(nsSafeNum(String(editQty).replace(',', '.'), 0) * nsSafeNum(rows[editIdx].prezzo_unitario_snapshot, 0), 2))}</span>
              <button type='button' onClick={saveEdit} style={{ padding: '4px 14px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#1F4E79', color: '#fff', cursor: 'pointer' }}>Aggiorna</button>
              <button type='button' onClick={cancelEdit} style={{ padding: '4px 14px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#e0e0e0', color: '#333', cursor: 'pointer' }}>Annulla</button>
            </div>
          </div>
        )}
        <div style={{ border: '1px solid #c5d9f1', borderRadius: 6, minHeight: 60, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 52 }} />
              <col />
              <col style={{ width: 100 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 70 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thS}>Orig.</th>
                <th style={thS}>Voce</th>
                <th style={thS}>Q.tà</th>
                <th style={{ ...thS, textAlign: 'right' }}>Prezzo (€)</th>
                <th style={{ ...thS, textAlign: 'right' }}>Importo (€)</th>
                <th style={thS}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>Nessuna riga.</td></tr>
              ) : rows.map((r, idx) => {
                const noQty = nsSafeNum(r.quantita, 0) <= 0
                return (
                <tr key={`${r.objectid || 'tmp'}-${idx}`}>
                  <td style={tdS(idx)}><div style={{ whiteSpace: 'pre-line', lineHeight: 1.1 }}>{`${nsSourceShort(nsNormalizeSource(r.origine_voce_snapshot))}${r.anno_prezzario_snapshot ? `\n${r.anno_prezzario_snapshot}` : ''}`}</div></td>
                  <td style={{ ...tdS(idx), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${r.codice_voce_snapshot} — ${r.descrizione_snapshot}`}><b>{r.codice_voce_snapshot}</b> — {r.descrizione_snapshot}</td>
                  <td style={{ ...tdS(idx), ...(noQty ? { background: '#fff3cd', fontWeight: 700, color: '#856404' } : {}) }}>{noQty ? '—' : `${nsSafeNum(r.quantita, 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 })} ${r.unita_misura_snapshot || ''}`}</td>
                  <td style={{ ...tdS(idx), textAlign: 'right' }}>{money(r.prezzo_unitario_snapshot)}</td>
                  <td style={{ ...tdS(idx), textAlign: 'right' }}>{money(r.importo_riga)}</td>
                  <td style={{ ...tdS(idx), whiteSpace: 'nowrap' }}>
                    <button type='button' onClick={() => startEdit(idx)} style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 3, border: 'none', marginRight: 4, fontWeight: 700, background: '#1B6584', color: '#fff' }}>✎</button>
                    <button type='button' onClick={() => onDelete(idx)} style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 3, border: 'none', fontWeight: 700, background: '#c00', color: '#fff' }}>✕</button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
      {confirmDeleteIdx != null && confirmDeleteIdx >= 0 && confirmDeleteIdx < rows.length && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Eliminare la riga?</div>
            <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 20 }}>{rows[confirmDeleteIdx].codice_voce_snapshot} — {rows[confirmDeleteIdx].descrizione_snapshot}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type='button' onClick={doDelete} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#d13438', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Sì, elimina</button>
              <button type='button' onClick={() => setConfirmDeleteIdx(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#111827', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Annulla</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const GII_NS_CART_KEY = 'GII_NS_CART'

const LOG_EVENTI_CICLI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'
const DRAFT_DATE_FIELDS = new Set(['data_rilevazione', 'data_firma'])

function toDraftDate (v: any): string {
  if (v == null || v === '') return ''
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

function draftFromRecord (rec: any): NpDraft {
  const out: NpDraft = {}
  if (!rec || typeof rec !== 'object') return out
  for (const k of Object.keys(rec)) {
    const lk = k.toLowerCase()
    const v = rec[k]
    if (v == null) out[lk] = ''
    else if (DRAFT_DATE_FIELDS.has(lk)) out[lk] = toDraftDate(v)
    else out[lk] = String(v)
  }
  if (out.dom_notifica_uguale == null || out.dom_notifica_uguale === '') out.dom_notifica_uguale = '1'
  if (out.rl_dom_notifica == null || out.rl_dom_notifica === '') out.rl_dom_notifica = '0'
  return out
}

function normalizeLogValue (v: any): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : String(v.getTime())
  return String(v).trim()
}

function draftsEqual (a: NpDraft, b: NpDraft): boolean {
  const keys = Array.from(new Set([...(Object.keys(a || {})), ...(Object.keys(b || {}))]))
  for (const k of keys) {
    if (normalizeLogValue(a?.[k]) !== normalizeLogValue(b?.[k])) return false
  }
  return true
}

function buildPraticaCodeFromData (data: any, oid: number | null | undefined): string {
  if (oid == null || !Number.isFinite(Number(oid))) return ''
  const op = data?.origine_pratica ?? data?.Origine_pratica ?? data?.ORIGINE_PRATICA
  let prefix = 'TR'
  if (op === 2 || op === '2' || String(op || '').toUpperCase() === 'TI') prefix = 'TI'
  else if (op === 1 || op === '1' || String(op || '').toUpperCase() === 'TR') prefix = 'TR'
  return `${prefix}-${Number(oid)}`
}


function NuovaPraticaForm (p: {
  ds: any
  cfg: any
  showDatiGenerali: boolean
  clickedPointWgs84: any | null
  existingGeomWgs84?: any | null
  onClearPoint: () => void
  onGeomSaved?: (geom: any) => void
  mapClickEnabled?: boolean
  onToggleMapClick?: (on: boolean) => void
  onSaved?: (oid: number, savedData?: any) => void
  mode?: 'create' | 'edit'
  initialData?: any | null
  editOid?: number | null
  editIdFieldName?: string
  editLayerUrl?: string
  titleText?: string
  saveText?: string
  onDirtyChange?: (dirty: boolean) => void
  onTabChange?: (tab: string) => void
}) {
  const { ds, cfg } = p
  const mode = p.mode === 'edit' ? 'edit' : 'create'
  const editOid = p.editOid != null ? Number(p.editOid) : null
  const editIdFieldName = String(p.editIdFieldName || ds?.getIdField?.() || 'OBJECTID')

  const [draft, setDraft] = React.useState<NpDraft>(() => draftFromRecord(p.initialData || {}))
  const [baselineDraft, setBaselineDraft] = React.useState<NpDraft>(() => draftFromRecord(p.initialData || {}))
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [showCreateSuccessPopup, setShowCreateSuccessPopup] = React.useState(false)
  const [noteSpeseDraftDirty, setNoteSpeseDraftDirty] = React.useState(false)
  const [noteSpeseFormDirtyByCategory, setNoteSpeseFormDirtyByCategory] = React.useState<Record<NsCategory, boolean>>({
    AT: false,
    PR: false,
    RU: false,
    SL: false,
    PF: false
  })
  const [noteSpeseManagerResetKey, setNoteSpeseManagerResetKey] = React.useState(0)
  const [createSuccessPraticaCode, setCreateSuccessPraticaCode] = React.useState('')
  const [createdRecordInfo, setCreatedRecordInfo] = React.useState<{ oid: number; layerUrl: string; data: any } | null>(null)
  const createdRecordInfoRef = React.useRef<{ oid: number; layerUrl: string; data: any } | null>(null)
  const [validationPopup, setValidationPopup] = React.useState<{ title: string; text: string } | null>(null)
  const [cancelUnsavedPopupOpen, setCancelUnsavedPopupOpen] = React.useState(false)
  const validationPopupOkId = React.useMemo(() => `gii-val-ok-${Math.random().toString(36).slice(2)}`, [])
  const validationPopupBackdropId = React.useMemo(() => `gii-val-backdrop-${Math.random().toString(36).slice(2)}`, [])
  const successPopupOkId = React.useMemo(() => `gii-success-ok-${Math.random().toString(36).slice(2)}`, [])
  const successPopupBackdropId = React.useMemo(() => `gii-success-backdrop-${Math.random().toString(36).slice(2)}`, [])

  // Layer fields con domini (caricati una volta)
  const [npLayerFields, setNpLayerFields] = React.useState<Array<{ name: string; type: string; domain?: any }>>([])
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = ds?.getLayer?.() || ds?.getJSAPILayer?.() || ds?.layer || null
        const resolved = await Promise.resolve(raw)
        const layer = (resolved && (resolved.layer || resolved)) || null
        if (typeof layer?.load === 'function') try { await layer.load() } catch {}
        const fields = (layer?.fields || []) as any[]
        if (fields.length && !cancelled) {
          setNpLayerFields(fields.map((f: any) => ({ name: f.name, type: f.type || '', domain: f.domain || null })))
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [ds])

  /** Legge le opzioni da un dominio AGOL; se assente restituisce fallback */
  const domainOpts = React.useCallback((fieldName: string, fallback?: ReadonlyArray<{ readonly v: string; readonly l: string }>): ReadonlyArray<{ readonly v: string; readonly l: string }> => {
    const f = npLayerFields.find(lf => lf.name === fieldName)
    const coded = f?.domain?.codedValues
    if (coded && Array.isArray(coded) && coded.length) {
      return coded.map((cv: any) => ({ v: String(cv.code), l: String(cv.name) }))
    }
    return fallback || []
  }, [npLayerFields])

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Se un popup è aperto, blocca Escape per mantenere la modalità
      if (validationPopup || showCreateSuccessPopup || cancelUnsavedPopupOpen) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [validationPopup, showCreateSuccessPopup, cancelUnsavedPopupOpen])


  React.useEffect(() => {
    if (!validationPopup) return
    const doc = getGlobalOverlayDocument()
    if (!doc) return
    const btn = doc.getElementById(validationPopupOkId)
    const close = () => setValidationPopup(null)
    btn?.addEventListener('click', close, true)
    return () => {
      btn?.removeEventListener('click', close, true)
    }
  }, [validationPopup, validationPopupOkId])

  const [npTab, setNpTab] = React.useState<'anagrafica' | 'violazione' | 'dati_tecnici' | 'nota_spese' | 'allegati' | 'anteprima'>('anagrafica')
  const [isExternalNavMode, setIsExternalNavMode] = React.useState<boolean>(true)
  const skipNpTabSyncRef = React.useRef(false)
  const tabResetFirstRef = React.useRef(true)

  // Pulisci la sezione persistita al mount per evitare che il reload riapra l'ultimo tab
  React.useEffect(() => {
    try { window.sessionStorage.removeItem('GII_NAV_SECTION') } catch {}
    try { window.sessionStorage.removeItem('GII_REQUESTED_EDIT_SECTION') } catch {}
  }, [])

  React.useEffect(() => {
    if (tabResetFirstRef.current) {
      tabResetFirstRef.current = false
      return
    }
    const requested = getRequestedEditSection()
    setNpTab(requested || 'anagrafica')
  }, [mode, editOid])

  // Notifica il parent del cambio tab
  React.useEffect(() => { p.onTabChange?.(npTab) }, [npTab])

  const npTabSyncElRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (skipNpTabSyncRef.current) { skipNpTabSyncRef.current = false; return }
    try { sessionStorage.setItem('GII_EDIT_TAB', npTab) } catch {}
    const el = npTabSyncElRef.current?.closest?.('[data-gii-editing-root]') as HTMLElement | null
    const isVisible = !!(el && el.offsetWidth > 0 && el.offsetHeight > 0)
    if (isVisible) {
      try { window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: npTab } })) } catch {}
    }
  }, [npTab])

  React.useEffect(() => {
    const applyRequestedSection = (forcedSection?: any) => {
      const requested = (() => {
        const raw = String(forcedSection || '').trim()
        if (raw) {
          const normalized = raw.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
          switch (normalized) {
            case 'anagrafica': return 'anagrafica' as const
            case 'violazione': return 'violazione' as const
            case 'dati-tecnici':
            case 'luoghi':
            case 'luoghi-e-dati-tecnici':
            case 'luoghi-dati-tecnici':
            case 'localizzazione-e-dati-tecnici':
              return 'dati_tecnici' as const
            case 'nota-spese': return 'nota_spese' as const
            case 'allegati': return 'allegati' as const
            case 'anteprima': return 'anteprima' as const
            default: return null
          }
        }
        return getRequestedEditSection()
      })()
      if (!requested) return
      try { sessionStorage.setItem('GII_REQUESTED_EDIT_SECTION', requested) } catch {}
      try { sessionStorage.setItem('GII_EDIT_TAB', requested) } catch {}
      setIsExternalNavMode(true)
      setNpTab((prev) => (prev === requested ? prev : requested))
    }
    const onExternalSectionChange = (evt: any) => applyRequestedSection(evt?.detail?.section)
    const onUrlChange = () => applyRequestedSection()
    window.addEventListener('hashchange', onUrlChange)
    window.addEventListener('popstate', onUrlChange)
    window.addEventListener('gii:edit-section-change', onExternalSectionChange as EventListener)
    return () => {
      window.removeEventListener('hashchange', onUrlChange)
      window.removeEventListener('popstate', onUrlChange)
      window.removeEventListener('gii:edit-section-change', onExternalSectionChange as EventListener)
    }
  }, [])


  const navigateToEditAfterCreate = React.useCallback(() => {
    const info = createdRecordInfoRef.current
    if (!info) return
    const ei: EditIntentInfo = { oid: info.oid, layerUrl: info.layerUrl, idFieldName: 'OBJECTID', data: info.data, ts: Date.now() }
    writeEditIntent(ei)
    try { ;(window as any).__giiEdit = { ...ei, dsId: null } } catch {}
    writeDynamicSelection({ oid: info.oid, layerUrl: info.layerUrl, idFieldName: 'OBJECTID', data: info.data })
    // Segnala al widget edit (se già montato) che c'è un nuovo intent
    try { window.dispatchEvent(new CustomEvent('gii-edit-intent-changed')) } catch {}
    try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: info.oid, layerUrl: info.layerUrl } })) } catch {}
    // Reset form per quando l'utente torna alla pagina create
    createdRecordInfoRef.current = null
    setCreatedRecordInfo(null)
    setDraft({})
    setBaselineDraft({})
    setMsg(null)
    skipNpTabSyncRef.current = true
    setNpTab('anagrafica')
    const pageToken = String(cfg.editPageId || 'page_32').trim()
    const pageId = resolvePageId(pageToken) || resolvePageId('Modifica Rapporto')
    if (pageId) {
      UrlManager.getInstance().changePage(pageId)
    }
  }, [cfg.editPageId])

  React.useEffect(() => {
    if (!showCreateSuccessPopup) return
    const doc = getGlobalOverlayDocument()
    if (!doc) return
    const btn = doc.getElementById(successPopupOkId)
    const close = () => { setShowCreateSuccessPopup(false); setCreateSuccessPraticaCode(''); navigateToEditAfterCreate() }
    btn?.addEventListener('click', close, true)
    return () => {
      btn?.removeEventListener('click', close, true)
    }
  }, [showCreateSuccessPopup, successPopupOkId, navigateToEditAfterCreate])
  const createStartedAtRef = React.useRef<number>(Date.now())
  const [attachmentFiles, setAttachmentFiles] = React.useState<File[]>([])
  const [attachmentInputKey, setAttachmentInputKey] = React.useState(0)
  const [attachments, setAttachments] = React.useState<Array<{ id: number; name?: string; size?: number; contentType?: string; url?: string }>>([])
  const [attachmentsForOid, setAttachmentsForOid] = React.useState<number | null>(null)
  const [attachmentsLoading, setAttachmentsLoading] = React.useState(false)
  const [attachmentsUploading, setAttachmentsUploading] = React.useState(false)
  const [attachmentsError, setAttachmentsError] = React.useState<string | null>(null)
  const [pendingDeleteAttachmentIds, setPendingDeleteAttachmentIds] = React.useState<number[]>([])
  const [pendingReplaceAttachments, setPendingReplaceAttachments] = React.useState<Record<number, File>>({})
  const [attachmentConfirm, setAttachmentConfirm] = React.useState<null | { type: 'delete' | 'replace'; attachment: { id: number; name?: string }; file?: File }>(null)
  const [replaceTargetAttachment, setReplaceTargetAttachment] = React.useState<{ id: number; name?: string } | null>(null)
  const replaceInputRef = React.useRef<HTMLInputElement | null>(null)
  const [replaceInputKey, setReplaceInputKey] = React.useState(0)

  // Anteprima allegato selezionato
  const [previewAttachment, setPreviewAttachment] = React.useState<{ id: number; name?: string; contentType?: string } | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = React.useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const prevBlobRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (mode === 'create') createStartedAtRef.current = Date.now()
    const nextBase = draftFromRecord(p.initialData || {})
    setDraft(nextBase)
    setBaselineDraft(nextBase)
    setAttachmentFiles([])
    setAttachmentInputKey(k => k + 1)
    setPendingDeleteAttachmentIds([])
    setPendingReplaceAttachments({})
    setAttachmentConfirm(null)
    setReplaceTargetAttachment(null)
    setReplaceInputKey(k => k + 1)
    setAttachmentsError(null)
    setPreviewAttachment(null)
    setMsg(null)
  }, [mode, editOid, p.initialData])

  React.useEffect(() => {
    if (mode !== 'create') return
    const giiCtx = readGiiUserContext()
    const roleShort = shortRoleLabel(giiCtx.role, giiCtx.username)
    const officeFallback = getCreateOfficeFallback(giiCtx.area, giiCtx.settore)
    const today = toDraftDate(Date.now())
    const withCreateDefaults = (prev: NpDraft): NpDraft => {
      const next: NpDraft = { ...prev }
      if (!String(next.tecnico_rilevatore || '').trim()) {
        const label = roleShort && giiCtx.settore ? `${roleShort} ${giiCtx.settore}` : (roleShort || String(giiCtx.username || '').trim())
        if (label) next.tecnico_rilevatore = label
      }
      if (!String(next.ufficio_zona || '').trim() && officeFallback.label) {
        next.ufficio_zona = officeFallback.label
      }
      if (!String(next.data_rilevazione || '').trim()) {
        next.data_rilevazione = today
      }
      return next
    }
    setDraft(prev => withCreateDefaults(prev))
    setBaselineDraft(prev => withCreateDefaults(prev))
  }, [mode])

  const hasPendingAttachments = attachmentFiles.length > 0
  const hasPendingAttachmentDeletes = pendingDeleteAttachmentIds.length > 0
  const hasPendingAttachmentReplacements = Object.keys(pendingReplaceAttachments).length > 0
  const isDirty = React.useMemo(() => !draftsEqual(draft, baselineDraft) || !!p.clickedPointWgs84 || hasPendingAttachments || hasPendingAttachmentDeletes || hasPendingAttachmentReplacements || noteSpeseDraftDirty, [draft, baselineDraft, p.clickedPointWgs84, hasPendingAttachments, hasPendingAttachmentDeletes, hasPendingAttachmentReplacements, noteSpeseDraftDirty])
  React.useEffect(() => {
    p.onDirtyChange?.(isDirty)
  }, [isDirty, p.onDirtyChange])

  const set = (k: string, v: any) => setDraft(prev => ({ ...prev, [k]: v }))
  const g = (k: string) => draft[k] ?? ''
  const getOidFromAny = React.useCallback((obj: any): number | null => {
    if (!obj || typeof obj !== 'object') return null
    const candidates = [
      editIdFieldName,
      'OBJECTID',
      'ObjectID',
      'ObjectId',
      'objectid',
      'oid',
      'OID'
    ].filter(Boolean)
    for (const key of candidates) {
      const raw = (obj as any)?.[key as any]
      if (raw == null || raw === '') continue
      const n = Number(raw)
      if (Number.isFinite(n) && n > 0) return n
    }
    return null
  }, [editIdFieldName])
  const currentOid = React.useMemo(() => {
    if (mode !== 'edit') return null
    if (editOid != null && Number.isFinite(Number(editOid)) && Number(editOid) > 0) return Number(editOid)
    return getOidFromAny(p.initialData)
  }, [mode, editOid, getOidFromAny, p.initialData])
  const currentLayerUrl = React.useMemo(() => {
    return ensureLayerIndex(normalizeFeatureLayerUrl(p.editLayerUrl) || normalizeFeatureLayerUrl(readDynamicSelection().layerUrl))
  }, [p.editLayerUrl])

  // Effect anteprima allegato (richiede currentOid e currentLayerUrl)
  React.useEffect(() => {
    if (prevBlobRef.current) { try { URL.revokeObjectURL(prevBlobRef.current) } catch {} prevBlobRef.current = null }
    if (!previewAttachment || !currentOid) { setPreviewBlobUrl(null); return }
    const ct = String(previewAttachment.contentType || '').toLowerCase()
    const canPreview = ct.startsWith('image/') || ct === 'application/pdf'
    if (!canPreview) { setPreviewBlobUrl(null); return }
    let cancelled = false
    setPreviewLoading(true)
    ;(async () => {
      try {
        const rawUrl = buildAttachmentRawUrl(previewAttachment, Number(currentOid), currentLayerUrl)
        if (!rawUrl) { setPreviewLoading(false); return }
        let token = ''
        try {
          const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
          const baseForCred = ensureLayerIndex(normalizeFeatureLayerUrl(currentLayerUrl)) || rawUrl
          const cred = IdentityManager?.findCredential?.(baseForCred) || IdentityManager?.findCredential?.(baseForCred.replace(/\/\d+$/, ''))
          token = cred?.token ? String(cred.token) : ''
        } catch {}
        let finalUrl = rawUrl
        if (token && !/[?&]token=/.test(finalUrl)) finalUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
        const resp = await fetch(finalUrl, { credentials: 'same-origin' })
        if (!resp.ok || cancelled) { setPreviewLoading(false); return }
        const blob = await resp.blob()
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        prevBlobRef.current = url
        setPreviewBlobUrl(url)
      } catch { if (!cancelled) setPreviewBlobUrl(null) }
      if (!cancelled) setPreviewLoading(false)
    })()
    return () => { cancelled = true }
  }, [previewAttachment, currentOid, currentLayerUrl])

const [currentGlobalId, setCurrentGlobalId] = React.useState<string>('')
const [noteSpeseSummary, setNoteSpeseSummary] = React.useState<NsSummary>(EMPTY_NS_SUMMARY)
const [noteSpeseBusy, setNoteSpeseBusy] = React.useState(false)
const [noteSpeseMsg, setNoteSpeseMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
const [activePrezzario, setActivePrezzario] = React.useState<{ codice: string; anno: number; descrizione: string } | null>(null)
const [noteSpesePercent, setNoteSpesePercent] = React.useState<number>(0)
const [noteSpeseRowsBaseline, setNoteSpeseRowsBaseline] = React.useState<Record<NsCategory, NsDetailRow[]>>(nsCloneRowsByCategory(EMPTY_NS_ROWS_BY_CATEGORY))
const [noteSpeseRowsDraft, setNoteSpeseRowsDraft] = React.useState<Record<NsCategory, NsDetailRow[]>>(nsCloneRowsByCategory(EMPTY_NS_ROWS_BY_CATEGORY))

const noteSpeseCfg = React.useMemo(() => ({
  importPrezzariUrl: String((cfg as any).nsImportPrezzariUrl || (cfg as any).nsPrezzariUrl || '').trim(),
  regionaleArticoliUrl: String((cfg as any).nsPrezzarioRegionaleArticoliUrl || (cfg as any).nsPrezzarioVociUrl || '').trim(),
  internoArticoliUrl: String((cfg as any).nsPrezzarioInternoArticoliUrl || (cfg as any).nsPrezzarioInternoUrl || '').trim(),
  nuoviPrezziUrl: String((cfg as any).nsNuoviPrezziUrl || '').trim(),
  detailUrl: String(cfg.nsNotaSpeseDettaglioUrl || '').trim(),
  parametriUrl: String(cfg.nsParametriUrl || '').trim(),
  parametroCode: String(cfg.nsParametroCode || 'SPESE_GENERALI_PERC').trim() || 'SPESE_GENERALI_PERC'
}), [(cfg as any).nsImportPrezzariUrl, (cfg as any).nsPrezzariUrl, (cfg as any).nsPrezzarioRegionaleArticoliUrl, (cfg as any).nsPrezzarioVociUrl, (cfg as any).nsPrezzarioInternoArticoliUrl, (cfg as any).nsPrezzarioInternoUrl, (cfg as any).nsNuoviPrezziUrl, cfg.nsNotaSpeseDettaglioUrl, cfg.nsParametriUrl, cfg.nsParametroCode])

const noteSpeseMissing = React.useMemo(() => {
  const missing: string[] = []
  if (!noteSpeseCfg.importPrezzariUrl) missing.push('Tabella import prezzari')
  if (!noteSpeseCfg.regionaleArticoliUrl) missing.push('Tabella articoli prezzario regionale')
  if (!noteSpeseCfg.internoArticoliUrl) missing.push('Tabella articoli prezzario interno')
  if (!noteSpeseCfg.nuoviPrezziUrl) missing.push('Tabella Nuovi Prezzi')
  if (!noteSpeseCfg.detailUrl) missing.push('Tabella dettaglio nota spese')
  if (!noteSpeseCfg.parametriUrl) missing.push('Tabella parametri')
  return missing
}, [noteSpeseCfg])


React.useEffect(() => {
  let cancelled = false
  const run = async () => {
    if (mode !== 'edit' || currentOid == null) { setCurrentGlobalId(''); return }
    const direct = String(pickAttrCI(p.initialData || {}, ['GlobalID', 'globalid']) || '').trim()
    if (direct) { if (!cancelled) setCurrentGlobalId(direct); return }
    const fallbackUrl = currentLayerUrl || String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()
    if (!fallbackUrl) { if (!cancelled) setCurrentGlobalId(''); return }
    try {
      const gid = await loadRecordGlobalIdByOid(fallbackUrl, editIdFieldName, Number(currentOid))
      if (!cancelled) setCurrentGlobalId(String(gid || '').trim())
    } catch {
      if (!cancelled) setCurrentGlobalId('')
    }
  }
  void run()
  return () => { cancelled = true }
}, [mode, currentOid, currentLayerUrl, cfg.schemaLayerUrl, cfg.motherLayerUrl, editIdFieldName, p.initialData])

React.useEffect(() => {
  let cancelled = false
  const run = async () => {
    if (!noteSpeseCfg.importPrezzariUrl) { if (!cancelled) setActivePrezzario(null); return }
    try {
      const row = await getActivePrezzario(noteSpeseCfg.importPrezzariUrl)
      if (!cancelled) setActivePrezzario(row)
    } catch {
      if (!cancelled) setActivePrezzario(null)
    }
  }
  void run()
  return () => { cancelled = true }
}, [noteSpeseCfg.importPrezzariUrl])

const loadNotaSpeseDraft = React.useCallback(async () => {
  if (mode !== 'edit' || currentOid == null || !currentGlobalId || noteSpeseMissing.length > 0) return
  setNoteSpeseBusy(true)
  try {
    const [rows, perc] = await Promise.all([
      queryNotaSpeseRows(noteSpeseCfg.detailUrl, currentGlobalId),
      getNsPercentuale(noteSpeseCfg.parametriUrl, noteSpeseCfg.parametroCode)
    ])
    const grouped = nsRowsFromFlat(rows)
    setNoteSpeseRowsBaseline(grouped)
    let draft = nsCloneRowsByCategory(grouped)
    let raw: string | null = null
    try { raw = sessionStorage.getItem(GII_NS_CART_KEY) } catch {}
    if (raw) {
      try { sessionStorage.removeItem(GII_NS_CART_KEY) } catch {}
      let cartItems: any[] = []
      try { cartItems = JSON.parse(raw) } catch { cartItems = [] }
      if (Array.isArray(cartItems) && cartItems.length > 0) {
        const existingCodes = new Set<string>()
        NS_CATEGORIES.forEach((cat) => { ;(draft[cat] || []).forEach((r) => { if (r.codice_voce_snapshot) existingCodes.add(r.codice_voce_snapshot) }) })
        let maxOrdine = 0
        NS_CATEGORIES.forEach((cat) => { ;(draft[cat] || []).forEach((r) => { maxOrdine = Math.max(maxOrdine, Math.trunc(nsSafeNum(r.ordine, 0))) }) })
        let added = 0
        cartItems.forEach((item: any) => {
          if (!item?.codice_voce || !item?.famiglia) return
          if (existingCodes.has(item.codice_voce)) return
          const cat = nsNormalizeCategory(item.famiglia)
          if (!cat) return
          maxOrdine += 10
          draft[cat].push({
            objectid: 0,
            categoria_costo: cat,
            origine_voce_snapshot: nsMapCartOrigine(item.codice_prezzario || ''),
            codice_voce_snapshot: String(item.codice_voce || ''),
            descrizione_snapshot: String(item.descrizione || ''),
            unita_misura_snapshot: String(item.unita_misura || ''),
            prezzo_unitario_snapshot: nsRound(nsSafeNum(item.prezzo_unitario, 0), 4),
            quantita: 0,
            importo_riga: 0,
            anno_prezzario_snapshot: nsSafeNum(item.anno_riferimento, 0) > 0 ? Math.trunc(nsSafeNum(item.anno_riferimento, 0)) : null,
            ordine: maxOrdine,
            note: ''
          })
          existingCodes.add(item.codice_voce)
          added++
        })
        if (added > 0) {
          setNoteSpeseMsg({ ok: true, text: `${added} ${added === 1 ? 'voce aggiunta' : 'voci aggiunte'} dal prezzario. Compila le quantità e salva.` })
        }
      }
    }
    setNoteSpeseRowsDraft(draft)
    setNoteSpesePercent(perc)
    setNoteSpeseSummary(nsComputeSummaryFromRows(rows, perc))
    if (!raw) setNoteSpeseMsg(null)
  } catch (e: any) {
    setNoteSpeseMsg({ ok: false, text: e?.message || String(e) })
  } finally {
    setNoteSpeseBusy(false)
  }
}, [mode, currentOid, currentGlobalId, noteSpeseMissing.length, noteSpeseCfg])

const refreshNotaSpeseSummary = React.useCallback(async () => {
  const rows = nsRowsByCategoryToFlat(noteSpeseRowsDraft)
  setNoteSpeseSummary(nsComputeSummaryFromRows(rows, noteSpesePercent))
}, [noteSpeseRowsDraft, noteSpesePercent])

React.useEffect(() => {
  if (mode === 'edit' && currentOid != null && currentGlobalId && noteSpeseMissing.length === 0) {
    void loadNotaSpeseDraft()
  }
}, [mode, currentOid, currentGlobalId, noteSpeseMissing.length, loadNotaSpeseDraft])

React.useEffect(() => {
  if (mode !== 'edit' || currentOid == null || !currentGlobalId) return
  const id = window.setInterval(() => {
    let raw: string | null = null
    try { raw = sessionStorage.getItem(GII_NS_CART_KEY) } catch {}
    if (!raw) return
    try { sessionStorage.removeItem(GII_NS_CART_KEY) } catch {}
    let cartItems: any[] = []
    try { cartItems = JSON.parse(raw) } catch { return }
    if (!Array.isArray(cartItems) || cartItems.length === 0) return
    setNoteSpeseRowsDraft((prev) => {
      const existingCodes = new Set<string>()
      NS_CATEGORIES.forEach((cat) => { ;(prev[cat] || []).forEach((r) => { if (r.codice_voce_snapshot) existingCodes.add(r.codice_voce_snapshot) }) })
      let maxOrdine = 0
      NS_CATEGORIES.forEach((cat) => { ;(prev[cat] || []).forEach((r) => { maxOrdine = Math.max(maxOrdine, Math.trunc(nsSafeNum(r.ordine, 0))) }) })
      const draft = nsCloneRowsByCategory(prev)
      let added = 0
      cartItems.forEach((item: any) => {
        if (!item?.codice_voce || !item?.famiglia) return
        if (existingCodes.has(item.codice_voce)) return
        const cat = nsNormalizeCategory(item.famiglia)
        if (!cat) return
        maxOrdine += 10
        draft[cat].push({
          objectid: 0, categoria_costo: cat,
          origine_voce_snapshot: nsMapCartOrigine(item.codice_prezzario || ''),
          codice_voce_snapshot: String(item.codice_voce || ''),
          descrizione_snapshot: String(item.descrizione || ''),
          unita_misura_snapshot: String(item.unita_misura || ''),
          prezzo_unitario_snapshot: nsRound(nsSafeNum(item.prezzo_unitario, 0), 4),
          quantita: 0, importo_riga: 0,
          anno_prezzario_snapshot: nsSafeNum(item.anno_riferimento, 0) > 0 ? Math.trunc(nsSafeNum(item.anno_riferimento, 0)) : null,
          ordine: maxOrdine, note: ''
        })
        existingCodes.add(item.codice_voce)
        added++
      })
      if (added > 0) {
        setNoteSpeseMsg({ ok: true, text: `${added} ${added === 1 ? 'voce aggiunta' : 'voci aggiunte'} dal prezzario. Compila le quantità e salva.` })
        return draft
      }
      return prev
    })
  }, 500)
  return () => window.clearInterval(id)
}, [mode, currentOid, currentGlobalId])

React.useEffect(() => {
  setNoteSpeseSummary(nsComputeSummaryFromRows(nsRowsByCategoryToFlat(noteSpeseRowsDraft), noteSpesePercent))
}, [noteSpeseRowsDraft, noteSpesePercent])

const noteSpeseRowsDirty = React.useMemo(() => !nsRowsByCategoryEqual(noteSpeseRowsDraft, noteSpeseRowsBaseline), [noteSpeseRowsDraft, noteSpeseRowsBaseline])
const noteSpeseFormsDirty = React.useMemo(() => NS_CATEGORIES.some((cat) => !!noteSpeseFormDirtyByCategory[cat]), [noteSpeseFormDirtyByCategory])

React.useEffect(() => {
  setNoteSpeseDraftDirty(noteSpeseRowsDirty || noteSpeseFormsDirty)
}, [noteSpeseRowsDirty, noteSpeseFormsDirty])


  React.useEffect(() => {
    if (mode !== 'edit' || currentOid == null) {
      setAttachments([])
      setAttachmentsForOid(null)
      setAttachmentsLoading(false)
      return
    }
    setAttachments([])
    setAttachmentsForOid(null)
  }, [mode, currentOid])

  const formatBytesLocal = React.useCallback((n?: number) => {
    if (n == null || isNaN(Number(n))) return ''
    const num = Number(n)
    if (num < 1024) return `${num} B`
    const kb = num / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(1)} GB`
  }, [])

  const mapAttachmentInfos = React.useCallback((infos: any[]) => {
    return (infos || []).map((a: any) => ({
      id: Number(a.id),
      name: a.name,
      size: a.size,
      contentType: a.contentType,
      url: a.url
    })).filter((a: any) => a && !isNaN(a.id))
  }, [])

  const loadCurrentAttachments = React.useCallback(async () => {
    if (currentOid == null) return
    const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))
    try {
      setAttachmentsLoading(true)
      setAttachmentsError(null)
      const layer = await resolveFeatureLayerForAttachments(ds as any, currentLayerUrl)
      if (!layer && !currentLayerUrl) throw new Error('Non riesco a risalire al FeatureLayer per leggere gli allegati.')
      let lastErr: any = null
      for (let i = 0; i < 4; i++) {
        try {
          const infos = await queryFeatureAttachments(layer, currentOid, ds as any, currentLayerUrl)
          const clean = mapAttachmentInfos(infos || [])
          setAttachments(clean)
          setAttachmentsForOid(currentOid)
          return
        } catch (err) {
          lastErr = err
          if (i < 3) await wait(350)
        }
      }
      throw lastErr || new Error('Lettura allegati non riuscita.')
    } catch (e: any) {
      setAttachmentsForOid(currentOid)
      setAttachments(prev => (attachmentsForOid === currentOid ? prev : []))
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsLoading(false)
    }
  }, [currentOid, currentLayerUrl, ds, mapAttachmentInfos, attachmentsForOid])

  const refreshCurrentAttachmentsAfterUpload = React.useCallback(async (opts?: { optimistic?: Array<{ id: number; name?: string; size?: number; contentType?: string; url?: string }>; expectedCount?: number | null }) => {
    if (currentOid == null) return
    const optimistic = Array.isArray(opts?.optimistic) ? opts!.optimistic : []
    const expectedCount = Number.isFinite(Number(opts?.expectedCount)) ? Math.max(0, Number(opts?.expectedCount)) : null
    if (optimistic.length > 0) setAttachments(optimistic)
    setAttachmentsLoading(true)
    setAttachmentsError(null)
    const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))
    try {
      const layer = await resolveFeatureLayerForAttachments(ds as any, currentLayerUrl)
      if (!layer && !currentLayerUrl) throw new Error('Non riesco a risalire al FeatureLayer per leggere gli allegati.')
      let best: any[] = []
      for (let i = 0; i < 8; i++) {
        const infos = await queryFeatureAttachments(layer, currentOid, ds as any, currentLayerUrl)
        const clean = mapAttachmentInfos(infos || [])
        best = clean
        if (expectedCount == null || clean.length === expectedCount) {
          setAttachments(clean)
          return
        }
        if (i < 7) await wait(500)
      }
      setAttachments(best.length > 0 || expectedCount === 0 ? best : optimistic)
    } catch (e: any) {
      if (optimistic.length > 0 || expectedCount === 0) setAttachments(optimistic)
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsLoading(false)
    }
  }, [currentOid, currentLayerUrl, ds, mapAttachmentInfos])

  const getAttachmentPreferredUrl = React.useCallback(async (): Promise<string> => {
    const layer = await resolveFeatureLayerForAttachments(ds as any, currentLayerUrl)
    const url = ensureLayerIndex(normalizeFeatureLayerUrl(layer?.url) || normalizeFeatureLayerUrl(currentLayerUrl), layer)
    if (!url) throw new Error('URL del FeatureLayer non disponibile per gli allegati.')
    return url
  }, [ds, currentLayerUrl])

  const uploadCurrentAttachments = React.useCallback(async (filesArg?: File[]) => {
    const files = Array.isArray(filesArg) ? filesArg : attachmentFiles
    if (currentOid == null || files.length === 0) return
    try {
      setAttachmentsUploading(true)
      setAttachmentsError(null)
      const preferredUrl = await getAttachmentPreferredUrl()
      const uploaded = await uploadFilesToFeatureAttachments(ds as any, currentOid, files, preferredUrl)
      const optimistic = [
        ...(Array.isArray(attachments) ? attachments : []),
        ...uploaded.map((a, idx) => ({ id: Number(a?.id) || -(idx + 1), name: a?.name, size: a?.size, contentType: a?.contentType, url: a?.url }))
      ]
      setAttachmentFiles([])
      setAttachmentInputKey(k => k + 1)
      setAttachments(optimistic)
      await refreshCurrentAttachmentsAfterUpload({ optimistic, expectedCount: optimistic.length })
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsUploading(false)
    }
  }, [currentOid, attachmentFiles, ds, attachments, refreshCurrentAttachmentsAfterUpload, getAttachmentPreferredUrl])

  const openReplacePicker = React.useCallback((att: { id: number; name?: string }) => {
    setAttachmentsError(null)
    setReplaceTargetAttachment({ id: Number(att.id), name: att.name })
    window.setTimeout(() => {
      try { replaceInputRef.current?.click() } catch {}
    }, 0)
  }, [])

  const confirmAttachmentAction = React.useCallback(async () => {
    if (!attachmentConfirm || currentOid == null) return
    try {
      setAttachmentsUploading(true)
      setAttachmentsError(null)
      const preferredUrl = await getAttachmentPreferredUrl()
      if (attachmentConfirm.type === 'delete') {
        const id = Number(attachmentConfirm.attachment?.id)
        if (Number.isFinite(id) && id > 0) {
          const optimistic = (Array.isArray(attachments) ? attachments : []).filter((a: any) => Number(a?.id) !== id)
          setAttachments(optimistic)
          await deleteFeatureAttachmentsFromFeature(ds as any, currentOid, [id], preferredUrl)
          await refreshCurrentAttachmentsAfterUpload({ optimistic, expectedCount: optimistic.length })
        }
      } else if (attachmentConfirm.type === 'replace' && attachmentConfirm.file) {
        const id = Number(attachmentConfirm.attachment?.id)
        if (Number.isFinite(id) && id > 0) {
          const uploaded = await uploadFilesToFeatureAttachments(ds as any, currentOid, [attachmentConfirm.file], preferredUrl)
          await deleteFeatureAttachmentsFromFeature(ds as any, currentOid, [id], preferredUrl)
          const optimistic = [
            ...(Array.isArray(attachments) ? attachments : []).filter((a: any) => Number(a?.id) !== id),
            ...uploaded.map((a, idx) => ({ id: Number(a?.id) || -(idx + 1), name: a?.name, size: a?.size, contentType: a?.contentType, url: a?.url }))
          ]
          setAttachments(optimistic)
          await refreshCurrentAttachmentsAfterUpload({ optimistic, expectedCount: optimistic.length })
        }
      }
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentConfirm(null)
      setReplaceTargetAttachment(null)
      setReplaceInputKey(k => k + 1)
      setAttachmentsUploading(false)
    }
  }, [attachmentConfirm, currentOid, ds, attachments, refreshCurrentAttachmentsAfterUpload, getAttachmentPreferredUrl])

  const cancelAttachmentAction = React.useCallback(() => {
    setAttachmentConfirm(null)
    setReplaceTargetAttachment(null)
    setReplaceInputKey(k => k + 1)
  }, [])

  React.useEffect(() => {
    if (mode === 'edit' && npTab === 'allegati' && currentOid != null) {
      void loadCurrentAttachments()
    }
  }, [mode, npTab, currentOid, loadCurrentAttachments])

  // Norma violata 3 — select_multiple come Set (stringa separata da spazio)
  const norma3Set = React.useMemo(() => new Set(String(g('norma_violata3') || '').split(' ').filter(Boolean)), [draft.norma_violata3])
  const norma3SelectedLabels = React.useMemo(() => CHOICES.norma3.filter(o => norma3Set.has(o.v)).map(o => o.l), [norma3Set])
  const toggleNorma3 = (v: string) => {
    const s = new Set(norma3Set)
    if (s.has(v)) s.delete(v); else s.add(v)
    set('norma_violata3', Array.from(s).join(' '))
  }

  // Derived
  const tipoSogg   = g('tipologia_soggetto')
  const tipoAbuso  = g('tipo_abuso')
  const norma1516  = g('norma16_17')
  const art17tipo  = g('art17_tipo')
  const n3parziale = g('norma15_parziale')
  const n3totale   = g('norma15_totale')

  const showSup15 = (tipoAbuso === 'parziale' && (n3parziale === 'Art15.1' || n3parziale === 'Art15.2')) ||
                    (tipoAbuso === 'totale'   && (n3totale   === 'Art15.3' || n3totale   === 'Art15.4'))
  const hasTipoAbuso15 = tipoAbuso === 'parziale' || tipoAbuso === 'totale'

  const reqPoint = React.useMemo(() => computeReqPoint({
    norma15_parziale: n3parziale,
    norma15_totale: n3totale,
    norma_violata3: g('norma_violata3')
  }), [n3parziale, n3totale, draft.norma_violata3])

  // Quando la violazione cambia e reqPoint passa a 0, cancella il punto cliccato manualmente
  const prevReqPointRef = React.useRef(reqPoint)
  React.useEffect(() => {
    if (prevReqPointRef.current === 1 && reqPoint === 0) {
      p.onClearPoint()
      p.onToggleMapClick?.(false)
    }
    prevReqPointRef.current = reqPoint
  }, [reqPoint])

  const officeLon = parseOfficeCoord(cfg.officeLonWgs84)
  const officeLat = parseOfficeCoord(cfg.officeLatWgs84)
  const hasOffice = isValidOfficePoint(officeLon, officeLat)

  // View editabile TI/RZ per la creazione (mai layer madre)
  const motherRef = React.useRef<any | null>(null)
  const getLayerForCreate = React.useCallback(async () => {
    const schemaUrl = ensureLayerIndex(normalizeFeatureLayerUrl(String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()))
    const dsUrl = ensureLayerIndex(normalizeFeatureLayerUrl((ds as any)?.getDataSourceJson?.()?.url || (ds as any)?.dataSourceJson?.url || (ds as any)?.layer?.url || (ds as any)?.url || ''))
    const ctx = readGiiUserContext()
    const serviceNames = buildTiCreateViewServiceNames(ctx.areaRaw, ctx.settoreRaw)

    if (!serviceNames.length) {
      throw new Error(`View editabile TI non risolta dal contesto utente (utente=${ctx.username || '∅'}; area=${String(ctx.areaRaw ?? '') || '∅'}; settore=${String(ctx.settoreRaw ?? '') || '∅'}).`)
    }

    const baseUrl = dsUrl || schemaUrl
    if (!baseUrl) throw new Error('URL schema non configurata per la creazione del rapporto.')

    const candidateUrls = serviceNames
      .map((name) => replaceServiceNameInLayerUrl(baseUrl, name))
      .filter((u): u is string => !!u)
      .map((u) => ensureLayerIndex(normalizeFeatureLayerUrl(u)))
      .filter(Boolean)

    if (!candidateUrls.length) {
      throw new Error(`Impossibile costruire la view di creazione dal contesto utente (utente=${ctx.username || '∅'}; area=${ctx.area || String(ctx.areaRaw || '')}; settore=${ctx.settore || String(ctx.settoreRaw || '')}).`)
    }

    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    for (const url of candidateUrls) {
      try {
        if (motherRef.current && String((motherRef.current as any)?.url || '') === url) return motherRef.current
        const fl = new FeatureLayer({ url })
        if (fl && (typeof fl.applyEdits === 'function' || typeof fl.url === 'string')) {
          motherRef.current = fl
          return fl
        }
      } catch {
        // prova il candidato successivo
      }
    }

    throw new Error(`View editabile TI non disponibile per il contesto utente corrente (${candidateUrls.join(', ')}).`)
  }, [cfg.schemaLayerUrl, cfg.motherLayerUrl, ds])

  const toTs = (v: string) => {
    if (!v) return null
    try { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.getTime() } catch { return null }
  }
  const toInt = (v: any) => {
    const n = typeof v === 'number' ? v : parseInt(String(v), 10)
    return Number.isNaN(n) ? null : n
  }

  const logLayerRef = React.useRef<any | null>(null)
  const getLogLayer = React.useCallback(async () => {
    if (logLayerRef.current) return logLayerRef.current
    try {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const fl = new FeatureLayer({ url: LOG_EVENTI_CICLI_URL })
      if (typeof fl?.load === 'function') { try { await fl.load() } catch {} }
      logLayerRef.current = fl
      return fl
    } catch {
      return null
    }
  }, [])

  const isSubstantiveField = React.useCallback((fieldName: string): boolean => {
    const k = String(fieldName || '').trim().toLowerCase()
    if (!k) return false
    if (k === 'objectid' || k === 'globalid') return false
    if (k === 'creationdate' || k === 'creator' || k === 'editdate' || k === 'editor') return false
    if (k === 'origine_pratica' || k === 'utente_loggato' || k === 'area_cod' || k === 'settore_cod' || k === 'req_point') return false
    if (k === 'id_ufficio' || k === 'start' || k === 'end') return false
    if (k.startsWith('stato_') || k.startsWith('dt_stato_')) return false
    if (k.startsWith('presa_in_carico_') || k.startsWith('dt_presa_in_carico_')) return false
    if (k.startsWith('esito_') || k.startsWith('dt_esito_')) return false
    if (k.startsWith('ti_assegnato_') || k.startsWith('dt_assegnazione_')) return false
    if (k.startsWith('ri_assegnato_') || k.startsWith('dt_assegnazione_ri')) return false
    if (k.startsWith('note_')) return false
    if (/^v_art\d+$/i.test(k)) return false
    if (k.startsWith('dt_') && k !== 'data_rilevazione' && k !== 'data_firma') return false
    return true
  }, [])

  const normalizeDateOnly = React.useCallback((v: any): string => {
    if (v == null || v === '') return ''
    try {
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) return ''
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    } catch {
      return ''
    }
  }, [])

  const formatStoredDateTime = React.useCallback((v: any, withTime = true): string => {
    if (v == null || v === '') return ''
    try {
      const n = Number(v)
      const d = Number.isFinite(n) && n > 0 ? new Date(n) : new Date(String(v))
      if (Number.isNaN(d.getTime())) return ''
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yy = String(d.getFullYear())
      if (!withTime) return `${dd}/${mm}/${yy}`
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      return `${dd}/${mm}/${yy} ${hh}:${mi}:${ss}`
    } catch {
      return ''
    }
  }, [])

  const normalizeFieldComparable = React.useCallback((fieldName: string, v: any): string => {
    const k = String(fieldName || '').trim().toLowerCase()
    if (DRAFT_DATE_FIELDS.has(k)) return normalizeDateOnly(v)
    if (/^v_art\d+$/i.test(k)) {
      if (v === 1 || v === true || v === '1' || String(v).toLowerCase() === 'true') return '1'
      return ''
    }
    if (k === 'norma_violata3') {
      return String(v ?? '').split(/\s+/).filter(Boolean).sort().join(' ')
    }
    if (v == null) return ''
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
    if (typeof v === 'boolean') return v ? '1' : '0'
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : String(v.getTime())
    return String(v).trim()
  }, [normalizeDateOnly])

  const toStoredFieldValue = React.useCallback((fieldName: string, v: any): any => {
    const k = String(fieldName || '').trim().toLowerCase()
    if (DRAFT_DATE_FIELDS.has(k)) return formatStoredDateTime(v, false)
    if (/^v_art\d+$/i.test(k)) return normalizeFieldComparable(k, v) === '1' ? 1 : ''
    if (k === 'norma_violata3') return normalizeFieldComparable(k, v)
    if (v == null) return ''
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : formatStoredDateTime(v, true)
    if (typeof v === 'number') {
      // non convertire i numeri ordinari; se il nome campo suggerisce una data, serializza in forma leggibile
      if (k.includes('data') || k.endsWith('_date') || k.startsWith('dt_')) {
        const formatted = formatStoredDateTime(v, true)
        return formatted || (Number.isFinite(v) ? v : '')
      }
      return Number.isFinite(v) ? v : ''
    }
    return String(v).trim()
  }, [formatStoredDateTime, normalizeFieldComparable])

  const parseJsonObject = React.useCallback((v: any): Record<string, any> => {
    if (!v) return {}
    if (typeof v === 'object' && !Array.isArray(v)) return { ...(v as any) }
    try {
      const parsed = JSON.parse(String(v))
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }, [])

  const sqlQuote = React.useCallback((v: any): string => `'${String(v ?? '').replace(/'/g, "''")}'`, [])

  const buildDeltaMaps = React.useCallback((prevAttrs: Record<string, any>, nextAttrs: Record<string, any>) => {
    const fields = Array.from(new Set([...Object.keys(prevAttrs || {}), ...Object.keys(nextAttrs || {})]))
      .filter((k) => isSubstantiveField(k))
    const oldMap: Record<string, any> = {}
    const newMap: Record<string, any> = {}
    for (const field of fields) {
      const prevVal = prevAttrs?.[field]
      const nextVal = nextAttrs?.[field]
      if (normalizeFieldComparable(field, prevVal) === normalizeFieldComparable(field, nextVal)) continue
      oldMap[field] = toStoredFieldValue(field, prevVal)
      newMap[field] = toStoredFieldValue(field, nextVal)
    }
    return { oldMap, newMap }
  }, [isSubstantiveField, normalizeFieldComparable, toStoredFieldValue])

  const mergeCycleMaps = React.useCallback((baseOld: Record<string, any>, baseNew: Record<string, any>, deltaOld: Record<string, any>, deltaNew: Record<string, any>) => {
    const oldMap: Record<string, any> = { ...(baseOld || {}) }
    const newMap: Record<string, any> = { ...(baseNew || {}) }
    const changedKeys = Array.from(new Set([...Object.keys(deltaOld || {}), ...Object.keys(deltaNew || {})]))
    for (const field of changedKeys) {
      if (!(field in oldMap)) oldMap[field] = deltaOld[field]
      newMap[field] = deltaNew[field]
      if (normalizeFieldComparable(field, oldMap[field]) === normalizeFieldComparable(field, newMap[field])) {
        delete oldMap[field]
        delete newMap[field]
      }
    }
    const finalFields = Object.keys(newMap).sort((a, b) => a.localeCompare(b))
    return { oldMap, newMap, fields: finalFields }
  }, [normalizeFieldComparable])

  const findOpenTiCycle = React.useCallback(async (parentGlobalId: string) => {
    if (!parentGlobalId) return null
    const logLayer = await getLogLayer()
    if (!logLayer?.queryFeatures) return null
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `parent_globalid = ${sqlQuote(parentGlobalId)} AND ruolo_competente = 'TI' AND stato_record = 'APERTO'`
    q.outFields = ['*']
    q.returnGeometry = false
    q.num = 1
    q.orderByFields = ['numero_ciclo_ruolo DESC', 'ObjectId DESC']
    const res = await logLayer.queryFeatures(q)
    return res?.features?.[0] || null
  }, [getLogLayer, sqlQuote])

  const getNextTiCycleNumber = React.useCallback(async (parentGlobalId: string): Promise<number> => {
    if (!parentGlobalId) return 1
    const logLayer = await getLogLayer()
    if (!logLayer?.queryFeatures) return 1
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `parent_globalid = ${sqlQuote(parentGlobalId)} AND ruolo_competente = 'TI'`
    q.outFields = ['numero_ciclo_ruolo']
    q.returnGeometry = false
    q.num = 1
    q.orderByFields = ['numero_ciclo_ruolo DESC', 'ObjectId DESC']
    try {
      const res = await logLayer.queryFeatures(q)
      const lastNum = Number(res?.features?.[0]?.attributes?.numero_ciclo_ruolo || 0)
      return Number.isFinite(lastNum) && lastNum > 0 ? lastNum + 1 : 1
    } catch {
      return 1
    }
  }, [getLogLayer, sqlQuote])

  const upsertTiCycleAudit = React.useCallback(async (prevAttrs: Record<string, any>, nextAttrs: Record<string, any>) => {
    const parentGlobalId = String(p.initialData?.GlobalID || p.initialData?.globalid || p.initialData?.GLOBALID || '')
    if (!parentGlobalId || editOid == null) return 0
    const delta = buildDeltaMaps(prevAttrs, nextAttrs)
    if (Object.keys(delta.oldMap).length === 0) return 0
    const logLayer = await getLogLayer()
    if (!logLayer?.applyEdits) return 0
    const giiCtx = readGiiUserContext()
    const area = giiCtx.area
    const settore = giiCtx.settore
    const username = String(giiCtx.username || '').trim()
    const sessionId = `ti-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    let openFeature = await findOpenTiCycle(parentGlobalId)
    if (!openFeature?.attributes) {
      const nextNum = await getNextTiCycleNumber(parentGlobalId)
      const addAttrs = filterAttrsForLayer({
        parent_globalid: parentGlobalId,
        parent_objectid: editOid,
        numero_ciclo_ruolo: nextNum,
        ruolo_competente: 'TI',
        utente_operatore: username,
        stato_record: 'APERTO',
        evento_apertura: 'PRESA_IN_CARICO',
        dt_apertura: Date.now(),
        area,
        settore,
        fase: 'TI',
        session_id: sessionId,
        num_campi_modificati: 0,
        campi_modificati: '',
        valori_prima_json: '',
        valori_dopo_json: '',
        riepilogo_ciclo: ''
      }, logLayer)
      try {
        await logLayer.applyEdits({ addFeatures: [{ attributes: addAttrs }] })
      } catch {}
      openFeature = await findOpenTiCycle(parentGlobalId)
    }

    if (!openFeature?.attributes) return 0
    const attrs = openFeature.attributes || {}
    const existingOld = parseJsonObject(attrs.valori_prima_json)
    const existingNew = parseJsonObject(attrs.valori_dopo_json)
    const merged = mergeCycleMaps(existingOld, existingNew, delta.oldMap, delta.newMap)
    const num = merged.fields.length
    const updAttrs = filterAttrsForLayer({
      ObjectId: attrs.ObjectId ?? attrs.objectid,
      utente_operatore: username || attrs.utente_operatore || '',
      area: area || attrs.area || '',
      settore: settore || attrs.settore || '',
      session_id: sessionId,
      num_campi_modificati: num,
      campi_modificati: merged.fields.join(', '),
      valori_prima_json: num > 0 ? JSON.stringify(merged.oldMap) : '',
      valori_dopo_json: num > 0 ? JSON.stringify(merged.newMap) : ''
    }, logLayer)
    try {
      await logLayer.applyEdits({ updateFeatures: [{ attributes: updAttrs }] })
      return num
    } catch {
      return 0
    }
  }, [buildDeltaMaps, editOid, findOpenTiCycle, getLogLayer, getNextTiCycleNumber, mergeCycleMaps, p.initialData, parseJsonObject])

  const processAttachmentChanges = React.useCallback(async (_oid: number, _preferredUrl?: string | null) => {
    // Gli allegati vengono gestiti immediatamente (allega/sostituisci/elimina), non al Salva del rapporto.
    setAttachmentFiles([])
    setAttachmentInputKey(k => k + 1)
    setPendingDeleteAttachmentIds([])
    setPendingReplaceAttachments({})
    setAttachmentConfirm(null)
    setReplaceTargetAttachment(null)
    setReplaceInputKey(k => k + 1)
  }, [])

  const performCancel = () => {
    setDraft({ ...baselineDraft })
    setNoteSpeseRowsDraft(nsCloneRowsByCategory(noteSpeseRowsBaseline))
    setNoteSpeseSummary(nsComputeSummaryFromRows(nsRowsByCategoryToFlat(noteSpeseRowsBaseline), noteSpesePercent))
    setNoteSpeseFormDirtyByCategory({ AT: false, PR: false, RU: false, SL: false, PF: false })
    setNoteSpeseManagerResetKey(k => k + 1)
    setNoteSpeseMsg(null)
    setAttachmentFiles([])
    setAttachmentInputKey(k => k + 1)
    setPendingDeleteAttachmentIds([])
    setPendingReplaceAttachments({})
    setAttachmentConfirm(null)
    setReplaceTargetAttachment(null)
    setReplaceInputKey(k => k + 1)
    setAttachmentsError(null)
    setMsg(null)
    p.onClearPoint()
  }

  const handleCancel = () => {
    if (!isDirty || saving) return
    setCancelUnsavedPopupOpen(true)
  }

  const handleSave = async () => {
    if (!isDirty) {
      setMsg({ kind: 'ok', text: mode === 'edit' ? 'Nessuna modifica da salvare.' : 'Compila almeno un campo prima di salvare.' })
      return
    }

    const cfRaw = String(g('codice_fiscale') || '').trim()
    const pivaRaw = String(g('piva') || '').trim()
    const cfLen = cfRaw.replace(/\s+/g, '').length
    const pivaLen = pivaRaw.replace(/\s+/g, '').length

    if (tipoSogg === 'PF' && cfRaw && cfLen < 16) {
      setValidationPopup({
        title: 'Codice fiscale non valido',
        text: `Il codice fiscale deve contenere 16 caratteri. Attualmente ne risultano inseriti ${cfLen}.`
      })
      return
    }

    if (tipoSogg === 'PG' && pivaRaw && pivaLen < 11) {
      setValidationPopup({
        title: 'Partita IVA non valida',
        text: `La partita IVA deve contenere 11 caratteri. Attualmente ne risultano inseriti ${pivaLen}.`
      })
      return
    }

    if (tipoAbuso === 'parziale') {
      const dich = Number(g('sup_dichiarata_art15')) || 0
      const irr = Number(g('sup_irrigata_art15')) || 0
      if (irr > 0 && irr < dich) {
        setValidationPopup({
          title: 'Superficie irrigata non valida',
          text: 'La superficie irrigata non può essere inferiore a quella dichiarata per l\'Art. 15 (abuso parziale).'
        })
        return
      }
    }

    setSaving(true); setMsg(null)
    try {
      const layer = mode === 'edit' ? await resolveLayerForEdit(ds) : await getLayerForCreate()
      if (!layer?.applyEdits) throw new Error('Layer non raggiungibile (applyEdits non disponibile).')

      let geomWgs84: any | null = null
      if (reqPoint === 1 && p.clickedPointWgs84) {
        geomWgs84 = p.clickedPointWgs84
      } else if (reqPoint === 0) {
        // Nessuna localizzazione richiesta: resetta a (0,0) — AGOL ignora null su layer Point
        geomWgs84 = makeWgs84Point(0, 0)
      }

      // reqPoint=1: blocca il salvataggio se non c'è nessun punto (né cliccato né già salvato nel record)
      if (reqPoint === 1 && !geomWgs84) {
        const hasValidExisting = p.existingGeomWgs84 && (Number(p.existingGeomWgs84.x) !== 0 || Number(p.existingGeomWgs84.y) !== 0)
        if (!hasValidExisting) {
          throw new Error('Localizzazione obbligatoria: fai click in mappa per impostare il punto.')
        }
      }

      // Converte il plain WGS84 in un vero esri/geometry/Point nella SR del layer
      const geom = geomWgs84 ? await toLayerPoint(geomWgs84, layer) : null

      const normaV1 = tipoAbuso === 'parziale' ? n3parziale : (tipoAbuso === 'totale' ? n3totale : '')
      const normaV2 = norma1516 === 'Art16' ? 'Art16' : (norma1516 === 'Art17' && art17tipo ? art17tipo : norma1516)
      const supDich16_17 = norma1516 === 'Art16' ? (draft.sup_dichiarata_art16 ?? null) : (art17tipo === 'Art17.1' ? (draft.sup_dichiarata_art17_1 ?? null) : (draft.sup_dichiarata_art17_2 ?? null))
      const supIrr16_17  = norma1516 === 'Art16' || art17tipo === 'Art17.2' ? (draft.sup_irrigata_art16_17_2 ?? null) : (art17tipo === 'Art17.1' ? (draft.sup_irrigata_art17_1 ?? null) : null)

      const vArtAttrs: Record<string, number | null> = {}
      for (const [art, field] of Object.entries(NORMA3_TO_VFIELD)) {
        vArtAttrs[field] = norma3Set.has(art) ? 1 : null
      }

      const giiCtx = readGiiUserContext()
      const roleAreaLabel = giiCtx.area
      const roleSettoreLabel = giiCtx.settore
      const nowTs = Date.now()
      const createStartTs = mode === 'create' ? createStartedAtRef.current : null
      const createSurveyDefaults = mode === 'create' ? await resolveCreateSurveyLikeDefaults(layer, giiCtx) : null
      const initialAreaLabel = normalizeAreaCode(p.initialData?.area_cod ?? p.initialData?.['Area (codice)'] ?? p.initialData?.AREA_COD)
      const initialSettoreLabel = normalizeSettoreCode(initialAreaLabel || roleAreaLabel, p.initialData?.settore_cod ?? p.initialData?.['Settore (codice)'] ?? p.initialData?.SETTORE_COD)
      const attrs: Record<string, any> = {
        start: mode === 'create' ? (createStartTs || nowTs) : (p.initialData?.start ?? p.initialData?.Start ?? p.initialData?.START ?? null),
        end: mode === 'create' ? nowTs : (p.initialData?.end ?? p.initialData?.End ?? p.initialData?.END ?? null),
        origine_pratica: mode === 'create' ? 2 : (p.initialData?.origine_pratica ?? p.initialData?.Origine_pratica ?? p.initialData?.ORIGINE_PRATICA ?? 2),
        stato_TI: mode === 'create' ? STATO_PRESA_IN_CARICO : (p.initialData?.stato_TI ?? p.initialData?.Stato_TI ?? p.initialData?.STATO_TI ?? null),
        presa_in_carico_TI: mode === 'create' ? PRESA_IN_CARICO : (p.initialData?.presa_in_carico_TI ?? p.initialData?.Presa_in_carico_TI ?? p.initialData?.PRESA_IN_CARICO_TI ?? null),
        dt_stato_TI: mode === 'create' ? nowTs : (p.initialData?.dt_stato_TI ?? p.initialData?.Dt_stato_TI ?? p.initialData?.DT_STATO_TI ?? null),
        dt_presa_in_carico_TI: mode === 'create' ? nowTs : (p.initialData?.dt_presa_in_carico_TI ?? p.initialData?.Dt_presa_in_carico_TI ?? p.initialData?.DT_PRESA_IN_CARICO_TI ?? null),
        ti_assegnato_username: mode === 'create' ? String(giiCtx.username || '') : (p.initialData?.ti_assegnato_username ?? p.initialData?.Ti_assegnato_username ?? p.initialData?.TI_ASSEGNATO_USERNAME ?? null),
        dt_assegnazione_ti: mode === 'create' ? nowTs : (p.initialData?.dt_assegnazione_ti ?? p.initialData?.Dt_assegnazione_ti ?? p.initialData?.DT_ASSEGNAZIONE_TI ?? null),
        ti_assegnato_da: mode === 'create' ? String(giiCtx.username || '') : (p.initialData?.ti_assegnato_da ?? p.initialData?.Ti_assegnato_da ?? p.initialData?.TI_ASSEGNATO_DA ?? null),
        utente_loggato: String(giiCtx.username || p.initialData?.utente_loggato || ''),
        area_cod: String((mode === 'create' ? roleAreaLabel : (initialAreaLabel || roleAreaLabel)) || ''),
        settore_cod: String((mode === 'create' ? roleSettoreLabel : (initialSettoreLabel || roleSettoreLabel)) || ''),
        tecnico_rilevatore: mode === 'create' ? (createSurveyDefaults?.tecnicoRilevatore || g('tecnico_rilevatore') || null) : (g('tecnico_rilevatore') || null),
        ufficio_zona: mode === 'create' ? (createSurveyDefaults?.ufficioZona || g('ufficio_zona') || null) : (g('ufficio_zona') || null),
        id_ufficio: mode === 'create' ? (createSurveyDefaults?.idUfficio ?? null) : (normalizeIntOrNull(p.initialData?.id_ufficio ?? p.initialData?.['ID ufficio'] ?? p.initialData?.ID_UFFICIO)),
        data_rilevazione: mode === 'create' ? nowTs : toTs(g('data_rilevazione')),
        tipologia_soggetto: tipoSogg || null,
        nome: (tipoSogg === 'PF' ? g('nome') : null) || null,
        cognome: (tipoSogg === 'PF' ? g('cognome') : null) || null,
        ragione_sociale: (tipoSogg === 'PG' ? g('ragione_sociale') : null) || null,
        codice_fiscale: (tipoSogg === 'PF' ? g('codice_fiscale') : null) || null,
        piva: (tipoSogg === 'PG' ? g('piva') : null) || null,
        via: g('via') || null,
        civico: g('civico') || null,
        citta: g('citta') || null,
        cap: g('cap') || null,
        email: g('email') || null,
        pec: g('pec') || null,
        telefono: g('telefono') || null,
        cellulare: g('cellulare') || null,
        tipo_abuso: tipoAbuso || null,
        norma15_parziale: (tipoAbuso === 'parziale' ? n3parziale : null) || null,
        norma15_totale: (tipoAbuso === 'totale' ? n3totale : null) || null,
        norma_violata1: normaV1 || null,
        sup_dichiarata_art15: tipoAbuso === 'totale' ? 0 : (hasTipoAbuso15 ? toInt(g('sup_dichiarata_art15')) : null),
        sup_irrigata_art15: hasTipoAbuso15 ? toInt(g('sup_irrigata_art15')) : null,
        norma16_17: norma1516 || null,
        art17_tipo: (norma1516 === 'Art17' ? art17tipo : null) || null,
        norma_violata2: normaV2 || null,
        sup_dichiarata_art17_1: norma1516 === 'Art17' && art17tipo === 'Art17.1' ? toInt(g('sup_dichiarata_art17_1')) : null,
        sup_dichiarata_art16: norma1516 === 'Art16' ? toInt(g('sup_dichiarata_art16')) : null,
        sup_dichiarata_art17_2: norma1516 === 'Art17' && art17tipo === 'Art17.2' ? toInt(g('sup_dichiarata_art17_2')) : null,
        sup_irrigata_art16_17_2: norma1516 === 'Art16' ? 0 : (art17tipo === 'Art17.2' ? 0 : null),
        sup_irrigata_art17_1: art17tipo === 'Art17.1' ? toInt(g('sup_irrigata_art17_1')) : null,
        sup_dichiarata_art16_17: toInt(supDich16_17 as any),
        sup_irrigata_art16_17: toInt(supIrr16_17 as any),
        norma_violata3: g('norma_violata3') || null,
        ...vArtAttrs,
        descrizione_fatti: g('descrizione_fatti') || null,
        circostanze: g('circostanze') || null,
        presenza_trasgressore: g('presenza_trasgressore') || null,
        descrizione_luogo: g('descrizione_luogo') || null,
        data_firma: toTs(g('data_firma')),
        req_point: reqPoint,
        // Anagrafica — nuovi campi
        qualifica_fondo: toInt(g('qualifica_fondo')),
        dom_notifica_uguale: toInt(g('dom_notifica_uguale')),
        dom_notifica_via: g('dom_notifica_via') || null,
        dom_notifica_civico: g('dom_notifica_civico') || null,
        dom_notifica_citta: g('dom_notifica_citta') || null,
        dom_notifica_cap: g('dom_notifica_cap') || null,
        rl_nome: (tipoSogg === 'PG' ? g('rl_nome') : null) || null,
        rl_cognome: (tipoSogg === 'PG' ? g('rl_cognome') : null) || null,
        rl_cf: (tipoSogg === 'PG' ? g('rl_cf') : null) || null,
        rl_carica: (tipoSogg === 'PG' ? g('rl_carica') : null) || null,
        rl_dom_notifica: tipoSogg === 'PG' ? toInt(g('rl_dom_notifica')) : null,
        rl_dom_via: (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? g('rl_dom_via') : null) || null,
        rl_dom_civico: (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? g('rl_dom_civico') : null) || null,
        rl_dom_citta: (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? g('rl_dom_citta') : null) || null,
        rl_dom_cap: (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? g('rl_dom_cap') : null) || null,
        note_anagrafica: g('note_anagrafica') || null,
        // Violazione — grado (era mancante)
        grado: toInt(g('grado')),
        // Dati tecnici (erano mancanti)
        distretto: g('distretto') || null,
        comizio: toInt(g('comizio')),
        idrante: toInt(g('idrante')),
        matricola_contatore: g('matricola_contatore') || null,
        matricola_tessera: g('matricola_tessera') || null
      }

      const cleanAttrs = filterAttrsForLayer(attrs, layer)

      if (mode === 'edit') {
        if (editOid == null) throw new Error('Nessuna pratica selezionata per la modifica.')
        const prevAttrs = filterAttrsForLayer(p.initialData || {}, layer)
        const changedFields = Object.keys(cleanAttrs).filter((k) => normalizeLogValue(prevAttrs?.[k]) !== normalizeLogValue(cleanAttrs[k]))
        const hasAttachmentOps = attachmentFiles.length > 0 || pendingDeleteAttachmentIds.length > 0 || Object.keys(pendingReplaceAttachments).length > 0
        const hasNoteSpeseOps = noteSpeseDraftDirty
        if (changedFields.length === 0 && !geom && !hasAttachmentOps && !hasNoteSpeseOps) {
          setSaving(false)
          setMsg({ kind: 'ok', text: 'Nessuna modifica da salvare.' })
          return
        }
        if (changedFields.length === 0 && !geom) {
          if (hasAttachmentOps) {
            await processAttachmentChanges(editOid, String(layer?.url || currentLayerUrl || ''))
          }
          if (hasNoteSpeseOps && currentGlobalId && noteSpeseMissing.length === 0) {
            await syncNotaSpeseDraftToTable(noteSpeseCfg.detailUrl, currentGlobalId, noteSpeseRowsBaseline, noteSpeseRowsDraft)
            const parentUrl = currentLayerUrl || String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()
            if (parentUrl) {
              const summary = await recomputeAndPersistNotaSpeseSummary({
                parentLayerUrl: parentUrl,
                parentObjectId: Number(editOid),
                parentIdFieldName: editIdFieldName,
                parentGlobalId: currentGlobalId,
                detailTableUrl: noteSpeseCfg.detailUrl,
                parametriUrl: noteSpeseCfg.parametriUrl,
                parametroCode: noteSpeseCfg.parametroCode
              })
              setNoteSpeseSummary(summary)
            }
            await loadNotaSpeseDraft()
            setNoteSpeseFormDirtyByCategory({ AT: false, PR: false, RU: false, SL: false, PF: false })
            setNoteSpeseManagerResetKey(k => k + 1)
          }
          setBaselineDraft(draftFromRecord(p.initialData || {}))
          setDraft(draftFromRecord(p.initialData || {}))
          setMsg({ kind: 'ok', text: hasAttachmentOps && !hasNoteSpeseOps ? 'Allegati salvati.' : 'Pratica salvata.' })
          setSaving(false)
          window.setTimeout(() => setMsg(null), 2500)
          p.onSaved?.(editOid, p.initialData || {})
          return
        }
        const upd: any = { attributes: { ...cleanAttrs, [editIdFieldName]: editOid } }
        if (geom) upd.geometry = geom
        const res = await layer.applyEdits({ updateFeatures: [upd] })
        const updated = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
        const err = updated?.error
        const ok = !err && (updated?.objectId != null || updated?.success === true || updated?.success == null)
        if (!ok) throw new Error(err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res))

        const nextSavedData = { ...(p.initialData || {}), ...cleanAttrs, [editIdFieldName]: editOid }
        if (hasAttachmentOps) {
          await processAttachmentChanges(editOid, String(layer?.url || currentLayerUrl || ''))
        }
        if (noteSpeseDraftDirty && currentGlobalId && noteSpeseMissing.length === 0) {
          await syncNotaSpeseDraftToTable(noteSpeseCfg.detailUrl, currentGlobalId, noteSpeseRowsBaseline, noteSpeseRowsDraft)
          const parentUrl = currentLayerUrl || String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()
          if (parentUrl) {
            const nsSummary = await recomputeAndPersistNotaSpeseSummary({
              parentLayerUrl: parentUrl,
              parentObjectId: Number(editOid),
              parentIdFieldName: editIdFieldName,
              parentGlobalId: currentGlobalId,
              detailTableUrl: noteSpeseCfg.detailUrl,
              parametriUrl: noteSpeseCfg.parametriUrl,
              parametroCode: noteSpeseCfg.parametroCode
            })
            setNoteSpeseSummary(nsSummary)
          }
          await loadNotaSpeseDraft()
          setNoteSpeseFormDirtyByCategory({ AT: false, PR: false, RU: false, SL: false, PF: false })
          setNoteSpeseManagerResetKey(k => k + 1)
        }
        await upsertTiCycleAudit(prevAttrs, cleanAttrs)
        const nextLayerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(layer?.url) || normalizeFeatureLayerUrl(readDynamicSelection().layerUrl), layer)
        writeSelectedFeatureCache(nextLayerUrl, editOid, editIdFieldName, nextSavedData, 'edit')
        invalidateRuntimeProxyCache(nextLayerUrl)
        writeDynamicSelection({ oid: editOid, layerUrl: nextLayerUrl, idFieldName: editIdFieldName, data: nextSavedData })
        try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: editOid, layerUrl: nextLayerUrl } })) } catch {}
        const nextIntent: EditIntentInfo = { oid: editOid, layerUrl: nextLayerUrl, idFieldName: editIdFieldName, data: nextSavedData, ts: Date.now() }
        try { ;(window as any).__giiEdit = nextIntent } catch {}
        writeEditIntent(nextIntent)
        setBaselineDraft(draftFromRecord(nextSavedData))
        setDraft(draftFromRecord(nextSavedData))
        if (p.onGeomSaved) { p.onGeomSaved(reqPoint === 0 ? null : (geomWgs84 || p.existingGeomWgs84 || null)) } else { p.onClearPoint() }
        setMsg({ kind: 'ok', text: 'Pratica salvata.' })
        setSaving(false)
        window.setTimeout(() => setMsg(null), 2500)
        p.onSaved?.(editOid, nextSavedData)
        return
      }

      const res = await layer.applyEdits({ addFeatures: [{ attributes: cleanAttrs, geometry: geom }] })
      const added = res?.addFeatureResults?.[0] || res?.addResults?.[0] || null
      const err = added?.error
      const ok = !err && (added?.objectId != null || added?.success === true || added?.success == null)
      if (!ok) throw new Error(err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res))

      const newOid = Number(added.objectId)
      
      // Leggi il ruoloLabel dal cw header per il prefisso del codice pratica
      const cwRoleLabel = String((window as any).__giiUserRole?.ruoloLabel || '').trim() || 'TI'
      const newPraticaCode = `${cwRoleLabel}-${newOid}`

      // In create mode NON aggiornare la datasource schema/base e NON provare a selezionare il nuovo OID:
      // queste due operazioni possono riattivare il banner credenziali quando la pagina usa solo lo schema.
      const createdLayerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(layer?.url || ''))
      const recordInfo = { oid: newOid, layerUrl: createdLayerUrl, data: { ...cleanAttrs } }
      setCreatedRecordInfo(recordInfo)
      createdRecordInfoRef.current = recordInfo
      setMsg({ kind: 'ok', text: 'Pratica creata.' })
      setSaving(false)
      setCreateSuccessPraticaCode(newPraticaCode)
      setShowCreateSuccessPopup(true)
      p.onSaved?.(newOid)
    } catch (e: any) {
      setSaving(false)
      setMsg({ kind: 'err', text: `Errore: ${e?.message || String(e)}` })
    }
  }


  
  const showDatiGen = p.showDatiGenerali

  const NP_TABS = [
    { id: 'anagrafica', label: 'Anagrafica' },
    { id: 'violazione', label: 'Violazione' },
    { id: 'dati_tecnici', label: 'Luoghi e dati tecnici' },
    { id: 'nota_spese', label: 'Nota spese' },
    { id: 'allegati', label: 'Allegati' }
  ] as const

  const btnBase: React.CSSProperties = {
    padding: '7px 16px', borderRadius: 8, border: 'none',
    fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer'
  }

  const tabBtn = (id: string, label: string) => (
    <button key={id} type='button' onClick={() => { setIsExternalNavMode(false); setNpTab(id as any) }} style={{
      padding: '6px 14px', borderRadius: 10, border: `1px solid ${npTab === id ? '#2f6fed' : 'rgba(0,0,0,0.12)'}`,
      background: npTab === id ? '#eaf2ff' : 'rgba(0,0,0,0.02)',
      color: npTab === id ? '#1d4ed8' : '#374151',
      fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
    }}>{label}</button>
  )

  const geomStatus = React.useMemo(() => {
    if (reqPoint === 0) {
      if (p.clickedPointWgs84) return { kind: 'ok' as const, text: 'Punto impostato manualmente (facoltativo per questa violazione).' }
      return { kind: 'info' as const, text: 'Localizzazione non richiesta per questa violazione.' }
    }
    // reqPoint === 1
    if (p.clickedPointWgs84) return { kind: 'ok' as const, text: 'Punto impostato da click in mappa.' }
    if (p.existingGeomWgs84 && (Number(p.existingGeomWgs84.x) !== 0 || Number(p.existingGeomWgs84.y) !== 0)) {
      return { kind: 'ok' as const, text: 'Punto già presente nel rapporto.' }
    }
    return { kind: 'err' as const, text: 'Localizzazione obbligatoria: fai click in mappa.' }
  }, [p.clickedPointWgs84, p.existingGeomWgs84, reqPoint])

  const editPraticaCode = React.useMemo(() => {
    if (mode !== 'edit') return ''
    return buildPraticaCodeFromData(p.initialData || {}, editOid)
  }, [mode, p.initialData, editOid])

  const toolbarTitleInfo = React.useMemo(() => {
    const baseTitle = String(p.titleText || (mode === 'edit' ? 'Modifica rapporto' : 'Nuovo rapporto'))
    if (mode !== 'edit' || !editPraticaCode) return { baseTitle, praticaCode: '' }
    if (baseTitle.includes(editPraticaCode)) return { baseTitle: baseTitle.replace(editPraticaCode, '').trim(), praticaCode: editPraticaCode }
    return { baseTitle, praticaCode: editPraticaCode }
  }, [p.titleText, mode, editPraticaCode])

  const formStyle = React.useMemo(() => ({
    labelColor: String((cfg as any).formLabelColor || _defaultFormStyle.labelColor),
    labelFontSize: Number.isFinite(Number((cfg as any).formLabelFontSize)) ? Number((cfg as any).formLabelFontSize) : _defaultFormStyle.labelFontSize,
    hdrColor: String((cfg as any).sectionHeaderColor || _defaultFormStyle.hdrColor),
    hdrFontSize: Number.isFinite(Number((cfg as any).sectionHeaderFontSize)) ? Number((cfg as any).sectionHeaderFontSize) : _defaultFormStyle.hdrFontSize,
    divColor: String((cfg as any).sectionDividerColor || _defaultFormStyle.divColor),
    divWidth: Number.isFinite(Number((cfg as any).sectionDividerWidth)) ? Number((cfg as any).sectionDividerWidth) : _defaultFormStyle.divWidth,
    fieldFontSize: Number.isFinite(Number((cfg as any).formFieldFontSize)) ? Number((cfg as any).formFieldFontSize) : _defaultFormStyle.fieldFontSize
  }), [cfg])

  const sHdr: React.CSSProperties = React.useMemo(() => ({
    ...S.hdr,
    fontSize: formStyle.hdrFontSize,
    color: formStyle.hdrColor,
    borderBottom: `${formStyle.divWidth}px solid ${formStyle.divColor}`
  }), [formStyle])

  const safePx = React.useCallback((value: any, fallback = 0, min = 0, max = 80): number => {
    const n = Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.max(min, Math.min(max, n))
  }, [])

  const anteprimaPadding = React.useMemo(() => {
    const outer = safePx((cfg as any).maskOuterOffset, 0, 0, 80)
    return {
      top: safePx((cfg as any).anteprimaPdfPaddingTop, 0, 0, 80),
      x: safePx((cfg as any).anteprimaPdfPaddingX, 0, 0, 80),
      bottom: safePx((cfg as any).anteprimaPdfPaddingBottom, 0, 0, 80),
      bottomRadius: safePx((cfg as any).anteprimaPdfBottomRadius, 10, 0, 40),
      outer
    }
  }, [cfg, safePx])

  const tabContentStyle: React.CSSProperties = React.useMemo(() => {
    const base: React.CSSProperties = {
      flex: '1 1 auto',
      minHeight: 0
    }

    if (npTab === 'anteprima') {
      return {
        ...base,
        overflow: 'hidden',
        padding: 0,
        marginTop: anteprimaPadding.top,
        marginLeft: anteprimaPadding.x - anteprimaPadding.outer,
        marginRight: anteprimaPadding.x - anteprimaPadding.outer,
        marginBottom: anteprimaPadding.bottom - anteprimaPadding.outer,
        borderBottomLeftRadius: anteprimaPadding.bottomRadius,
        borderBottomRightRadius: anteprimaPadding.bottomRadius
      }
    }

    if (npTab === 'allegati') {
      return {
        ...base,
        overflow: 'hidden',
        padding: '12px 2px',
        display: 'flex',
        flexDirection: 'column' as const
      }
    }

    return {
      ...base,
      overflowY: 'auto',
      padding: '12px 2px'
    }
  }, [npTab, anteprimaPadding])

  // ── Layout engine ──────────────────────────────────────────────────
  type FldR = { el: React.ReactNode; label: string; hint?: string }

  const renderFieldControl = (name: string): FldR | null => {
    switch (name) {
      // Anagrafica — Dati generali
      case 'tecnico_rilevatore': return showDatiGen ? { label: 'Tecnico istruttore', el: <NpText value={g('tecnico_rilevatore')} onChange={() => {}} disabled/> } : null
      case 'ufficio_zona': return showDatiGen ? { label: 'Ufficio di Zona', el: <NpText value={g('ufficio_zona')} onChange={() => {}} disabled/> } : null
      case 'data_rilevazione': return showDatiGen ? { label: 'Data rilevazione', el: <NpText value={g('data_rilevazione')} onChange={() => {}} disabled/> } : null
      // Anagrafica — Trasgressore
      case 'tipologia_soggetto': return { label: 'Tipologia soggetto', el: <NpSel value={tipoSogg} onChange={v => set('tipologia_soggetto', v)} options={CHOICES.tipo_soggetto} disabled={saving}/> }
      case 'nome': return tipoSogg === 'PF' ? { label: 'Nome', el: <NpText value={g('nome')} onChange={v => set('nome', v)} disabled={saving}/> } : null
      case 'cognome': return tipoSogg === 'PF' ? { label: 'Cognome', el: <NpText value={g('cognome')} onChange={v => set('cognome', v)} disabled={saving}/> } : null
      case 'codice_fiscale': return tipoSogg === 'PF' ? { label: 'Codice fiscale', hint: 'Massimo 16 caratteri', el: <NpText value={g('codice_fiscale')} onChange={v => set('codice_fiscale', v)} disabled={saving} maxLength={16}/> } : null
      case 'ragione_sociale': return tipoSogg === 'PG' ? { label: 'Ragione sociale', el: <NpText value={g('ragione_sociale')} onChange={v => set('ragione_sociale', v)} disabled={saving}/> } : null
      case 'piva': return tipoSogg === 'PG' ? { label: 'P. IVA', hint: 'Massimo 11 caratteri', el: <NpText value={g('piva')} onChange={v => set('piva', v)} disabled={saving} maxLength={11}/> } : null
      // Anagrafica — Indirizzo
      case 'via': return { label: 'Via', el: <NpText value={g('via')} onChange={v => set('via', v)} disabled={saving}/> }
      case 'civico': return { label: 'N. civico', el: <NpText value={g('civico')} onChange={v => set('civico', v)} disabled={saving}/> }
      case 'citta': return { label: 'Città', el: <NpText value={g('citta')} onChange={v => set('citta', v)} disabled={saving}/> }
      case 'cap': return { label: 'CAP', el: <NpText value={g('cap')} onChange={v => set('cap', v)} disabled={saving}/> }
      case 'telefono': return { label: 'Telefono', el: <NpText value={g('telefono')} onChange={v => set('telefono', v)} disabled={saving}/> }
      case 'cellulare': return { label: 'Cellulare', el: <NpText value={g('cellulare')} onChange={v => set('cellulare', v)} disabled={saving}/> }
      case 'email': return { label: 'E-mail', el: <NpText value={g('email')} onChange={v => set('email', v)} disabled={saving}/> }
      case 'pec': return { label: 'PEC', el: <NpText value={g('pec')} onChange={v => set('pec', v)} disabled={saving}/> }
      // Anagrafica — Qualifica
      case 'qualifica_fondo': return { label: 'Qualifica rispetto al fondo', el: <NpSel value={g('qualifica_fondo')} onChange={v => set('qualifica_fondo', v)} options={domainOpts('qualifica_fondo', CHOICES.qualifica_fondo)} disabled={saving}/> }
      // Anagrafica — Domicilio notifiche
      case 'dom_notifica_uguale': return { label: 'Coincide con residenza/sede legale', el: <NpSel value={g('dom_notifica_uguale')} onChange={v => set('dom_notifica_uguale', v)} options={domainOpts('dom_notifica_uguale', CHOICES.si_no)} disabled={saving}/> }
      case 'dom_notifica_via': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'Via', el: <NpText value={g('dom_notifica_via')} onChange={v => set('dom_notifica_via', v)} disabled={saving}/> } : null
      case 'dom_notifica_civico': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'N. civico', el: <NpText value={g('dom_notifica_civico')} onChange={v => set('dom_notifica_civico', v)} disabled={saving}/> } : null
      case 'dom_notifica_citta': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'Città', el: <NpText value={g('dom_notifica_citta')} onChange={v => set('dom_notifica_citta', v)} disabled={saving}/> } : null
      case 'dom_notifica_cap': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'CAP', el: <NpText value={g('dom_notifica_cap')} onChange={v => set('dom_notifica_cap', v)} disabled={saving}/> } : null
      // Anagrafica — Rappresentante legale (PG only)
      case 'rl_nome': return tipoSogg === 'PG' ? { label: 'Nome', el: <NpText value={g('rl_nome')} onChange={v => set('rl_nome', v)} disabled={saving}/> } : null
      case 'rl_cognome': return tipoSogg === 'PG' ? { label: 'Cognome', el: <NpText value={g('rl_cognome')} onChange={v => set('rl_cognome', v)} disabled={saving}/> } : null
      case 'rl_cf': return tipoSogg === 'PG' ? { label: 'Codice fiscale', hint: 'Massimo 16 caratteri', el: <NpText value={g('rl_cf')} onChange={v => set('rl_cf', v)} disabled={saving} maxLength={16}/> } : null
      case 'rl_carica': return tipoSogg === 'PG' ? { label: 'Carica', el: <NpSel value={g('rl_carica')} onChange={v => set('rl_carica', v)} options={domainOpts('rl_carica', CHOICES.rl_carica)} disabled={saving}/> } : null
      case 'rl_dom_notifica': return tipoSogg === 'PG' ? { label: 'Domicilio notifiche del rappresentante', el: <NpSel value={g('rl_dom_notifica')} onChange={v => set('rl_dom_notifica', v)} options={domainOpts('rl_dom_notifica', CHOICES.si_no)} disabled={saving}/> } : null
      case 'rl_dom_via': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'Via', el: <NpText value={g('rl_dom_via')} onChange={v => set('rl_dom_via', v)} disabled={saving}/> } : null
      case 'rl_dom_civico': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'N. civico', el: <NpText value={g('rl_dom_civico')} onChange={v => set('rl_dom_civico', v)} disabled={saving}/> } : null
      case 'rl_dom_citta': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'Città', el: <NpText value={g('rl_dom_citta')} onChange={v => set('rl_dom_citta', v)} disabled={saving}/> } : null
      case 'rl_dom_cap': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'CAP', el: <NpText value={g('rl_dom_cap')} onChange={v => set('rl_dom_cap', v)} disabled={saving}/> } : null
      // Anagrafica — Note
      case 'note_anagrafica': return { label: 'Note anagrafica', el: <NpText value={g('note_anagrafica')} onChange={v => set('note_anagrafica', v)} multiline disabled={saving}/> }
      // Violazione — Art. 15
      case 'tipo_abuso': return { label: 'Tipo di abuso', el: <NpSel value={tipoAbuso} onChange={v => { set('tipo_abuso', v); set('norma15_parziale', ''); set('norma15_totale', '') }} options={CHOICES.tipo_abuso} disabled={saving}/> }
      case 'norma15_sel': {
        const ur = (window as any).__giiUserRole || {}
        const isRiAgrTec = Number(ur.ruolo) === 4 && (Number(ur.area) === 2 || Number(ur.area) === 3)
        const canEdit = isRiAgrTec && hasTipoAbuso15 && !saving
        if (tipoAbuso === 'parziale') return { label: 'Occorrenza', el: <NpSel value={n3parziale} onChange={v => set('norma15_parziale', v)} options={CHOICES.art15_parziale} disabled={!canEdit}/> }
        if (tipoAbuso === 'totale') return { label: 'Occorrenza', el: <NpSel value={n3totale} onChange={v => set('norma15_totale', v)} options={CHOICES.art15_totale} disabled={!canEdit}/> }
        return { label: 'Occorrenza', el: <NpSel value={''} onChange={() => {}} options={[]} disabled/> }
      }
      case 'sup_dichiarata_art15': {
        if (!hasTipoAbuso15) return null
        const locked = tipoAbuso === 'totale'
        return { label: 'Superficie dichiarata (ha)', el: <NpText value={locked ? '0' : g('sup_dichiarata_art15')} onChange={v => set('sup_dichiarata_art15', v)} disabled={saving || locked}/> }
      }
      case 'sup_irrigata_art15': {
        if (!hasTipoAbuso15) return null
        const dichVal = tipoAbuso === 'totale' ? 0 : Number(g('sup_dichiarata_art15')) || 0
        const irrVal = Number(g('sup_irrigata_art15')) || 0
        const warn = hasTipoAbuso15 && irrVal > 0 && irrVal < dichVal
        return { label: 'Superficie irrigata (ha)', hint: warn ? 'La superficie irrigata non può essere inferiore a quella dichiarata' : undefined, el: <NpText value={g('sup_irrigata_art15')} onChange={v => set('sup_irrigata_art15', v)} disabled={saving}/> }
      }
      // Violazione — Artt. 16 e 17
      case 'norma16_17': return { label: 'Tipo di inosservanza', el: <NpSel value={norma1516} onChange={v => { set('norma16_17', v); set('art17_tipo', '') }} options={CHOICES.art16_17} disabled={saving}/> }
      case 'art17_tipo': return norma1516 === 'Art17' ? { label: 'Seleziona violazione Art. 17', el: <NpSel value={art17tipo} onChange={v => set('art17_tipo', v)} options={CHOICES.art17_tipo} disabled={saving}/> } : null
      case 'sup_dichiarata_art16': return norma1516 === 'Art16' ? { label: 'Superficie dichiarata (ha)', el: <NpText value={g('sup_dichiarata_art16')} onChange={v => set('sup_dichiarata_art16', v)} disabled={saving}/> } : null
      case 'sup_irrigata_art16': return norma1516 === 'Art16' ? { label: 'Superficie irrigata (ha)', el: <NpText value={'0'} onChange={() => {}} disabled/> } : null
      case 'sup_dichiarata_art17_1': return (norma1516 === 'Art17' && art17tipo === 'Art17.1') ? { label: 'Superficie dichiarata (ha)', el: <NpText value={g('sup_dichiarata_art17_1')} onChange={v => set('sup_dichiarata_art17_1', v)} disabled={saving}/> } : null
      case 'sup_irrigata_art17_1': return (norma1516 === 'Art17' && art17tipo === 'Art17.1') ? { label: 'Superficie variata (ha)', el: <NpText value={g('sup_irrigata_art17_1')} onChange={v => set('sup_irrigata_art17_1', v)} disabled={saving}/> } : null
      case 'sup_dichiarata_art17_2': return (norma1516 === 'Art17' && art17tipo === 'Art17.2') ? { label: 'Superficie dichiarata (ha)', el: <NpText value={g('sup_dichiarata_art17_2')} onChange={v => set('sup_dichiarata_art17_2', v)} disabled={saving}/> } : null
      case 'sup_irrigata_art17_2': return (norma1516 === 'Art17' && art17tipo === 'Art17.2') ? { label: 'Superficie irrigata (ha)', el: <NpText value={'0'} onChange={() => {}} disabled/> } : null
      // Violazione — Grado
      case 'grado': { const ur = (window as any).__giiUserRole || {}; const en = Number(ur.ruolo) === 4 && (Number(ur.area) === 2 || Number(ur.area) === 3); return { label: 'Grado', el: <NpSel value={g('grado')} onChange={v => set('grado', v)} options={CHOICES.grado} disabled={saving || !en}/> } }
      // Violazione — Descrizione
      case 'descrizione_fatti': return { label: 'Descrizione dettagliata della violazione', el: <NpText value={g('descrizione_fatti')} onChange={v => set('descrizione_fatti', v)} multiline disabled={saving}/> }
      case 'circostanze': return { label: 'Circostanze rilevanti', el: <NpText value={g('circostanze')} onChange={v => set('circostanze', v)} multiline disabled={saving}/> }
      case 'presenza_trasgressore': return { label: 'Il trasgressore era presente?', el: <NpSel value={g('presenza_trasgressore')} onChange={v => set('presenza_trasgressore', v)} options={CHOICES.presenza} disabled={saving}/> }
      case 'descrizione_luogo': return { label: 'Descrizione del luogo', el: <NpText value={g('descrizione_luogo')} onChange={v => set('descrizione_luogo', v)} multiline disabled={saving}/> }
      case 'data_firma': return { label: 'Data e ora di compilazione', el: <NpDate value={g('data_firma')} onChange={v => set('data_firma', v)} withTime disabled={saving}/> }
      // Dati tecnici
      case 'distretto': return { label: 'Distretto', el: <NpText value={g('distretto')} onChange={v => set('distretto', v)} disabled={saving}/> }
      case 'comizio': return { label: 'Comizio', el: <NpText value={g('comizio')} onChange={v => set('comizio', v)} disabled={saving}/> }
      case 'idrante': return { label: 'Idrante', el: <NpText value={g('idrante')} onChange={v => set('idrante', v)} disabled={saving}/> }
      case 'matricola_contatore': return { label: 'Matricola contatore', el: <NpText value={g('matricola_contatore')} onChange={v => set('matricola_contatore', v)} disabled={saving}/> }
      case 'matricola_tessera': return { label: 'Matricola tessera', el: <NpText value={g('matricola_tessera')} onChange={v => set('matricola_tessera', v)} disabled={saving}/> }
      default: return null
    }
  }

  const renderSpecial = (id: string): React.ReactNode => {
    switch (id) {
      case '_dati_gen_label':
        return showDatiGen ? (
          <div style={{ marginBottom: 2 }}>
            <span style={{ fontSize: formStyle.labelFontSize + 1, color: formStyle.labelColor }}>Dati generali (automatici)</span>
          </div>
        ) : null
      case '_localizzazione':
        return (
          <div style={{ padding: 10, borderRadius: 10, border: `1px solid ${p.mapClickEnabled ? '#2563eb' : 'rgba(0,0,0,0.10)'}`, background: p.mapClickEnabled ? 'rgba(37,99,235,0.04)' : 'rgba(0,0,0,0.02)', marginBottom: 12, transition: 'all 0.2s' }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#374151', marginBottom: 6 }}>Localizzazione (req_point = {reqPoint})</div>
            <div style={{ fontSize: 12, color: geomStatus.kind === 'ok' ? '#1a7f37' : (geomStatus.kind === 'err' ? '#b42318' : '#6b7280') }}>{geomStatus.text}</div>
            {reqPoint === 1 && (() => {
              const ep = p.clickedPointWgs84 || p.existingGeomWgs84
              const isReal = ep && (Number(ep.x) !== 0 || Number(ep.y) !== 0)
              return isReal ? (
                <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Lon: {Number(ep.x).toFixed(6)} — Lat: {Number(ep.y).toFixed(6)}</span>
                </div>
              ) : null
            })()}
            {reqPoint === 1 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {!p.mapClickEnabled ? (
                  <>
                    <button type='button' disabled={saving} onClick={() => p.onToggleMapClick?.(true)} style={{
                      padding: '5px 12px', borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: '#fff',
                      fontSize: 11, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1
                    }}>
                      {p.clickedPointWgs84 || (p.existingGeomWgs84 && (Number(p.existingGeomWgs84.x) !== 0 || Number(p.existingGeomWgs84.y) !== 0)) ? '📍 Modifica punto' : '📍 Imposta punto in mappa'}
                    </button>
                    {p.clickedPointWgs84 && (
                      <button type='button' onClick={() => { p.onClearPoint(); p.onToggleMapClick?.(false) }} style={{
                        padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.14)', background: '#fff', color: '#374151',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer'
                      }}>{p.existingGeomWgs84 && (Number(p.existingGeomWgs84.x) !== 0 || Number(p.existingGeomWgs84.y) !== 0) ? 'Ripristina posizione originale' : 'Annulla'}</button>
                    )}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>⏳ Clicca sulla mappa per impostare il punto…</span>
                    <button type='button' onClick={() => p.onToggleMapClick?.(false)} style={{
                      padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.14)', background: '#fff', color: '#374151',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer'
                    }}>Annulla</button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      case '_checkboxes_norma3':
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {CHOICES.norma3.map(o => (
                <label key={o.v} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12,
                  color: '#374151', cursor: saving ? 'not-allowed' : 'pointer', padding: '4px 0' }}>
                  <input type='checkbox' checked={norma3Set.has(o.v)} onChange={() => !saving && toggleNorma3(o.v)} style={{ marginTop: 2, flexShrink: 0 }}/>
                  {o.l}
                </label>
              ))}
            </div>
            {norma3SelectedLabels.length > 0 && (
              <div style={{ fontSize: 12, color: '#374151', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px' }}>
                {norma3SelectedLabels.join(' • ')}
              </div>
            )}
          </>
        )
      case '_header_rappresentante_legale':
        return tipoSogg === 'PG' ? <div style={sHdr}>Rappresentante legale</div> : null
      default: return null
    }
  }

  const renderLayoutTab = (tabId: string): React.ReactNode => {
    const cfgLayouts = cfg.fieldLayouts || {}
    const layout: any[] = (cfgLayouts as any)[tabId] || DEFAULT_FIELD_LAYOUTS[tabId] || []
    const defaultGap = Number(cfg.fieldGap) || 12
    return (
      <div>
        {layout.map((row: any, ri: number) => {
          if (row.type === 'header') return <div key={ri} style={sHdr}>{row.label}</div>
          if (row.type === 'special') {
            const sp = renderSpecial(row.id)
            return sp != null ? <React.Fragment key={ri}>{sp}</React.Fragment> : null
          }
          const cells: any[] = row.cells || []
          const results = cells.map((c: any) => c?.field ? renderFieldControl(c.field) : null)
          const hasField = cells.some((c: any) => c?.field)
          const anyVisible = results.some((r: any) => r !== null)
          if (hasField && !anyVisible) return null
          return (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: row.columns || '1fr', gap: row.gap ?? defaultGap }}>
              {cells.map((cell: any, ci: number) => {
                if (!cell?.field) return <div key={ci}/>
                const fld = results[ci]
                if (!fld) return <div key={ci}/>
                return <NpField key={ci} label={cell.label || fld.label} hint={fld.hint}>{fld.el}</NpField>
              })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
  <FormStyleCtx.Provider value={formStyle}>
    <div ref={npTabSyncElRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* ── Toolbar ── */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          {toolbarTitleInfo.baseTitle}
          {toolbarTitleInfo.praticaCode ? <> <span style={{ color: '#0b5fff' }}>{toolbarTitleInfo.praticaCode}</span></> : null}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 12, color: msg.kind === 'ok' ? '#1a7f37' : '#b42318' }}>{msg.text}</span>}
          <button type='button' disabled={saving || !isDirty} onClick={handleSave}
            style={{
              ...btnBase,
              border: '1px solid rgba(0,0,0,0.18)',
              background: (saving || !isDirty) ? '#e5e7eb' : '#1a7f37',
              color: (saving || !isDirty) ? '#9ca3af' : '#fff',
              cursor: (saving || !isDirty) ? 'not-allowed' : 'pointer'
            }}>
            {saving ? 'Salvataggio…' : (p.saveText || 'Salva')}
          </button>
          <button type='button' disabled={saving || !isDirty} onClick={handleCancel}
            style={{
              ...btnBase,
              border: '1px solid rgba(0,0,0,0.24)',
              background: (saving || !isDirty) ? '#e5e7eb' : '#d92d20',
              color: (saving || !isDirty) ? '#9ca3af' : '#fff',
              cursor: (saving || !isDirty) ? 'not-allowed' : 'pointer'
            }}>
            Annulla
          </button>
        </div>
      </div>

      {/* ── Contenuto tab (scrollabile) ── */}
      <div style={tabContentStyle}>

        {/* ANAGRAFICA */}
        {npTab === 'anagrafica' && renderLayoutTab('anagrafica')}

        {/* VIOLAZIONE */}
        {npTab === 'violazione' && renderLayoutTab('violazione')}

        {/* DATI TECNICI */}
        {npTab === 'dati_tecnici' && renderLayoutTab('dati_tecnici')}


{/* NOTA SPESE */}
{npTab === 'nota_spese' && (
  mode !== 'edit' || currentOid == null ? (
    <div style={{ padding: 12, borderRadius: 10, border: '1px dashed rgba(0,0,0,0.18)', background: 'rgba(0,0,0,0.01)' }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Nota spese</div>
      <div style={{ fontSize: formStyle.labelFontSize, color: formStyle.labelColor, lineHeight: 1.5 }}>
        La nota spese si gestisce <b>dopo il salvataggio</b> della pratica, quando il rapporto dispone del <b>GlobalID</b> necessario per collegare le righe di personale, mezzi e materiali.
      </div>
    </div>
  ) : noteSpeseMissing.length > 0 ? (
    <div style={{ padding: 12, borderRadius: 10, border: '1px solid #f5b8b8', background: '#fce4e4', color: '#7a1c1c' }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Nota spese non configurata</div>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>Completa nel setting del widget i seguenti URL:</div>
      <div style={{ marginTop: 8, fontSize: 12 }}>{noteSpeseMissing.join(' • ')}</div>
    </div>
  ) : !currentGlobalId ? (
    <div style={{ padding: 12, borderRadius: 10, border: '1px solid #f5b8b8', background: '#fce4e4', color: '#7a1c1c' }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>GlobalID pratica non disponibile</div>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>Il widget non riesce a leggere il GlobalID del rapporto selezionato. Verifica che il layer/view usato per l’editing esponga il campo <b>GlobalID</b>.</div>
    </div>
  ) : (
    <div style={{ display: 'grid', gap: 12 }}>
      {noteSpeseMsg && (
        <div style={{ padding: '7px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700, border: `1px solid ${noteSpeseMsg.ok ? '#b8d4b0' : '#f5b8b8'}`, background: noteSpeseMsg.ok ? '#e2efda' : '#fce4e4', color: noteSpeseMsg.ok ? '#375623' : '#c00' }}>
          {noteSpeseMsg.text}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {([
          ['Attrezz./Trasp.', noteSpeseSummary.totaleAT],
          ['Mat. costruz.', noteSpeseSummary.totalePR],
          ['Risorse umane', noteSpeseSummary.totaleRU],
          ['Semilavorati', noteSpeseSummary.totaleSL],
          ['Prod. finiti', noteSpeseSummary.totalePF],
          [`Spese gen. (${noteSpeseSummary.percentualeSpeseGenerali.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`, noteSpeseSummary.importoSpeseGenerali],
          ['Totale', noteSpeseSummary.totaleComplessivo]
        ] as [string, number][]).map(([label, value], idx) => (
          <div key={idx} style={{ background: idx === 6 ? '#1F4E79' : '#f5f9ff', border: '1px solid #c5d9f1', borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: idx === 6 ? 'rgba(255,255,255,0.8)' : '#1F4E79', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: idx === 6 ? '#fff' : '#16375a' }}>{nsSafeNum(value, 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
<button type='button' onClick={() => { try { const pg = resolvePageId('browser-nota-spese'); if (pg) { try { const curPage = getAppStore()?.getState()?.appRuntimeInfo?.currentPageId || ''; sessionStorage.setItem('GII_NS_RETURN_PAGE', curPage) } catch {} UrlManager.getInstance().changePage(pg) } else { setNoteSpeseMsg({ ok: false, text: 'Pagina "browser-nota-spese" non trovata. Configura una pagina ExB con il widget consultazione prezzario e il widget gii-ns-carrello.' }) } } catch (e: any) { setNoteSpeseMsg({ ok: false, text: e?.message || String(e) }) } }} disabled={noteSpeseBusy || noteSpeseDraftDirty} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #1ed9dc', background: '#0f7375', color: '#fff', fontWeight: 800, fontSize: 14, cursor: (noteSpeseBusy || noteSpeseDraftDirty) ? 'not-allowed' : 'pointer', opacity: (noteSpeseBusy || noteSpeseDraftDirty) ? 0.5 : 1, letterSpacing: '0.3px' }}>📋 Sfoglia prezzario</button>
          {noteSpeseDraftDirty && <span style={{ fontSize: 11, color: '#856404' }}>Salva le modifiche prima di sfogliare il prezzario.</span>}
      </div>
      <NoteSpeseManager category='AT' title='Attrezzature e trasporti' rows={noteSpeseRowsDraft['AT']} onRowsChange={(nextRows) => setNoteSpeseRowsDraft((prev) => ({ ...prev, AT: nextRows.map(nsCloneRow) }))} onDirtyChange={(dirty) => setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, AT: dirty }))} resetKey={noteSpeseManagerResetKey} />
      <NoteSpeseManager category='PR' title='Materiali da costruzione' rows={noteSpeseRowsDraft['PR']} onRowsChange={(nextRows) => setNoteSpeseRowsDraft((prev) => ({ ...prev, PR: nextRows.map(nsCloneRow) }))} onDirtyChange={(dirty) => setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, PR: dirty }))} resetKey={noteSpeseManagerResetKey} />
      <NoteSpeseManager category='RU' title='Risorse umane' rows={noteSpeseRowsDraft['RU']} onRowsChange={(nextRows) => setNoteSpeseRowsDraft((prev) => ({ ...prev, RU: nextRows.map(nsCloneRow) }))} onDirtyChange={(dirty) => setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, RU: dirty }))} resetKey={noteSpeseManagerResetKey} />
      <NoteSpeseManager category='SL' title='Semilavorati' rows={noteSpeseRowsDraft['SL']} onRowsChange={(nextRows) => setNoteSpeseRowsDraft((prev) => ({ ...prev, SL: nextRows.map(nsCloneRow) }))} onDirtyChange={(dirty) => setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, SL: dirty }))} resetKey={noteSpeseManagerResetKey} />
      <NoteSpeseManager category='PF' title='Prodotti finiti' rows={noteSpeseRowsDraft['PF']} onRowsChange={(nextRows) => setNoteSpeseRowsDraft((prev) => ({ ...prev, PF: nextRows.map(nsCloneRow) }))} onDirtyChange={(dirty) => setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, PF: dirty }))} resetKey={noteSpeseManagerResetKey} />
    </div>
  )
)}

{/* ALLEGATI */}
{npTab === 'allegati' && (

          mode !== 'edit' || currentOid == null ? (
            <div style={{ padding: 12, borderRadius: 10, border: '1px dashed rgba(0,0,0,0.18)', background: 'rgba(0,0,0,0.01)' }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Allegati</div>
              <div style={{ fontSize: formStyle.labelFontSize, color: formStyle.labelColor, lineHeight: 1.5 }}>
                Gli allegati si gestiscono <b>dopo il salvataggio</b> della pratica (serve l&apos;OBJECTID).
                Dopo aver creato la pratica, comparirà nell&apos;Elenco: selezionala e usa la tab <b>Allegati</b> in modalità modifica.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: '1 1 auto', minHeight: 0 }}>
            {/* Colonna sinistra: lista allegati */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Allegati</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{
                    minHeight: 36, height: 36, boxSizing: 'border-box',
                    padding: '0 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#111827',
                    fontSize: 12, fontWeight: 600, cursor: attachmentsUploading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, whiteSpace: 'nowrap'
                  }}>
                    Scegli file
                    <input
                      key={attachmentInputKey}
                      type='file'
                      multiple
                      style={{ display: 'none' }}
                      disabled={attachmentsUploading}
                      onChange={(e) => {
                        setAttachmentsError(null)
                        const files = Array.from((e.target as HTMLInputElement).files || [])
                        setAttachmentFiles(files)
                        if (files.length > 0) void uploadCurrentAttachments(files)
                      }}
                    />
                  </label>
                  <input
                    key={replaceInputKey}
                    ref={replaceInputRef}
                    type='file'
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = Array.from((e.target as HTMLInputElement).files || [])[0]
                      if (file && replaceTargetAttachment) {
                        setAttachmentConfirm({ type: 'replace', attachment: { id: replaceTargetAttachment.id, name: replaceTargetAttachment.name }, file })
                      }
                    }}
                  />
                </div>
              </div>

              {attachmentFiles.length > 0 && (
                <div style={{ fontSize: 12, color: '#374151' }}>
                  File selezionati: {attachmentFiles.map(f => f.name).join(', ')}
                </div>
              )}

              {attachmentsError && (
                <div style={{ fontSize: 12, color: '#b42318' }}>{attachmentsError}</div>
              )}

              {attachmentsLoading ? (
                <div style={{ opacity: 0.75, fontSize: 12 }}>Caricamento allegati…</div>
              ) : attachments.length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {attachments.map(a => (
                    <div key={a.id} onClick={() => setPreviewAttachment(previewAttachment?.id === a.id ? null : { id: a.id, name: a.name, contentType: a.contentType })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${previewAttachment?.id === a.id ? '#2563eb' : 'rgba(0,0,0,0.08)'}`, borderRadius: 10, padding: '8px 10px', background: previewAttachment?.id === a.id ? '#eff6ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#111827', wordBreak: 'break-word' }}>{a.name || `Allegato #${a.id}`}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{formatBytesLocal(a.size)}{a.contentType ? ` • ${a.contentType}` : ''}</div>

                      </div>
                      {Number(a?.id) > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              void openAttachmentInNewTab(a, Number(currentOid), currentLayerUrl).catch((err: any) => {
                                setAttachmentsError(err?.message || String(err))
                              })
                            }}
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#1d4ed8',
                              whiteSpace: 'nowrap',
                              background: '#fff',
                              border: '1px solid rgba(29,78,216,0.18)',
                              borderRadius: 8,
                              padding: '6px 10px',
                              cursor: 'pointer'
                            }}
                          >
                            Apri
                          </button>
                          <button
                            type='button'
                            disabled={attachmentsUploading}
                            onClick={() => openReplacePicker({ id: Number(a.id), name: a.name })}
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#1d4ed8',
                              whiteSpace: 'nowrap',
                              background: '#fff',
                              border: '1px solid rgba(29,78,216,0.18)',
                              borderRadius: 8,
                              padding: '6px 10px',
                              cursor: attachmentsUploading ? 'not-allowed' : 'pointer',
                              opacity: attachmentsUploading ? 0.6 : 1
                            }}
                          >
                            Sostituisci
                          </button>
                          <button
                            type='button'
                            disabled={attachmentsUploading}
                            onClick={() => setAttachmentConfirm({ type: 'delete', attachment: { id: Number(a.id), name: a.name } })}
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#d92d20',
                              whiteSpace: 'nowrap',
                              background: '#fff',
                              border: '1px solid rgba(217,45,32,0.24)',
                              borderRadius: 8,
                              padding: '6px 10px',
                              cursor: attachmentsUploading ? 'not-allowed' : 'pointer',
                              opacity: attachmentsUploading ? 0.6 : 1
                            }}
                          >
                            Elimina
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ opacity: 0.75, fontSize: 12 }}>Nessun allegato.</div>
              )}
            </div>
            {/* Colonna destra: anteprima */}
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, background: '#282828', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: previewAttachment ? 'flex-start' : 'center', overflow: 'hidden', minHeight: 0 }}>
              {!previewAttachment ? (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>Seleziona un allegato per visualizzare l&apos;anteprima</div>
              ) : previewLoading ? (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Caricamento anteprima…</div>
              ) : previewBlobUrl ? (() => {
                const ct = String(previewAttachment.contentType || '').toLowerCase()
                if (ct.startsWith('image/')) return <img src={previewBlobUrl} alt={previewAttachment.name || ''} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 6, objectFit: 'contain', flex: '1 1 auto', minHeight: 0 }}/>
                if (ct === 'application/pdf') return <iframe src={previewBlobUrl} title={previewAttachment.name || 'PDF'} style={{ width: '100%', flex: '1 1 auto', minHeight: 0, border: 'none', borderRadius: 6 }}/>
                return <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Anteprima non disponibile per questo tipo di file.</div>
              })() : (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Anteprima non disponibile per questo tipo di file.</div>
              )}
              {previewAttachment && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.78)', textAlign: 'center', wordBreak: 'break-word' }}>
                  {previewAttachment.name || `Allegato #${previewAttachment.id}`}
                  {previewAttachment.contentType ? ` • ${previewAttachment.contentType}` : ''}
                </div>
              )}
            </div>
            </div>
          )
        )}

{/* ANTEPRIMA */}
{npTab === 'anteprima' && (
  <AnteprimaPanel data={draft} mode={mode} />
)}

      </div>

      {cancelUnsavedPopupOpen && createPortal(
        <div
          data-gii-global-popup-root='1'
          style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <div
            role='dialog'
            aria-modal='true'
            data-gii-global-popup-dialog='1'
            style={{ width: 'min(92vw, 520px)', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#d92d20', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              Annullare le modifiche?
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 500, padding: 10, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, color: '#7c2d12' }}>
                Tutte le modifiche non salvate andranno perse.
              </div>
              <div>Confermi di voler annullare?</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type='button'
                onClick={() => { setCancelUnsavedPopupOpen(false); performCancel() }}
                style={{ ...btnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#d92d20', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                Sì, annulla
              </button>
              <button
                type='button'
                onClick={() => setCancelUnsavedPopupOpen(false)}
                style={{ ...btnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', color: '#111827', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                No, resta in modifica
              </button>
            </div>
          </div>
        </div>,
        getGlobalOverlayHost() || document.body
      )}

      {attachmentConfirm && createPortal(
        <div
          data-gii-global-popup-root='1'
          style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <div
            role='dialog'
            aria-modal='true'
            data-gii-global-popup-dialog='1'
            style={{ width: 'min(92vw, 460px)', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              {attachmentConfirm.type === 'delete' ? 'Confermare l’eliminazione?' : 'Confermare la sostituzione?'}
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 14 }}>
              {attachmentConfirm.type === 'delete'
                ? <>L’allegato <b>{attachmentConfirm.attachment?.name || `Allegato #${attachmentConfirm.attachment?.id}`}</b> verrà eliminato subito.</>
                : <>L’allegato <b>{attachmentConfirm.attachment?.name || `Allegato #${attachmentConfirm.attachment?.id}`}</b> verrà sostituito subito con <b>{attachmentConfirm.file?.name || 'il nuovo file selezionato'}</b>.</>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type='button' onClick={confirmAttachmentAction} style={{ ...btnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#1a7f37', color: '#fff', cursor: 'pointer' }}>Conferma</button>
              <button type='button' onClick={cancelAttachmentAction} style={{ ...btnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#d92d20', color: '#fff', cursor: 'pointer' }}>Annulla</button>
            </div>
          </div>
        </div>,
        getGlobalOverlayHost() || document.body
      )}

      {validationPopup && createPortal(
        <div
          id={validationPopupBackdropId}
          data-gii-global-popup-root='1'
          style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <div
            role='dialog'
            aria-modal='true'
            style={{ width: 'min(92vw, 520px)', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              {validationPopup.title}
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 500, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#7f1d1d' }}>
                {validationPopup.text}
              </div>
              <div>Correggi il valore e riprova.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                id={validationPopupOkId}
                type='button'
                onClick={() => setValidationPopup(null)}
                style={{ ...btnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#dc2626', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        getGlobalOverlayHost() || document.body
      )}

      {showCreateSuccessPopup && createPortal(
        <div
          id={successPopupBackdropId}
          data-gii-global-popup-root='1'
          style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <div
            role='dialog'
            aria-modal='true'
            data-gii-global-popup-dialog='1'
            style={{ width: 'min(92vw, 520px)', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#1a7f37', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>✓</span>
              Rapporto inserito correttamente
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 14, display: 'grid', gap: 10 }}>
              <div>Il rapporto è stato salvato correttamente nel sistema.</div>
              {createSuccessPraticaCode && (
                <div style={{ fontWeight: 600, color: '#1f2937', padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                  Numero rapporto assegnato: <span style={{ color: '#15803d', fontSize: 14, fontFamily: 'monospace' }}>{createSuccessPraticaCode}</span>
                </div>
              )}
              <div>Clicca <b>OK</b> per aprire il rapporto in modalità modifica.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                id={successPopupOkId}
                type='button'
                onClick={() => { setShowCreateSuccessPopup(false); setCreateSuccessPraticaCode(''); navigateToEditAfterCreate() }}
                style={{ ...btnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#1a7f37', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        getGlobalOverlayHost() || document.body
      )}
    </div>
  </FormStyleCtx.Provider>
  )
}


function DetailTabsPanel (props: {
  active: { key: string; state: SelState } | null
  anyDs: any
  showDatiGenerali: boolean
  roleCode: string
  buttonText: string
  buttonColors: ButtonColors
  ui: any
  tabFields: TabFields
  tabs: TabConfig[]
  editConfig: any
  motherLayerUrl?: string
}) {
  const { active, ui } = props

  // Migra e normalizza tabs
  const tabs = React.useMemo(() => {
    return migrateTabs(props.tabFields, props.tabs)
  }, [props.tabs, props.tabFields])

  const selectionKey = active?.state?.oid != null ? `${active.key}:${active.state.oid}` : null
  const ds = active?.state?.ds
  const data = active?.state?.data || null
  const oid = active?.state?.oid ?? null
  const hasSel = oid != null && Number.isFinite(oid)

  // Codice pratica per il titolo
  const praticaCode = React.useMemo(() => {
    if (!hasSel || !data) return ''
    const op = data.origine_pratica ?? data.Origine_pratica ?? data.ORIGINE_PRATICA
    let prefix = 'TR'
    if (op === 2 || op === '2' || String(op).toUpperCase() === 'TI') prefix = 'TI'
    else if (op === 1 || op === '1' || String(op).toUpperCase() === 'TR') prefix = 'TR'
    return `${prefix}-${oid}`
  }, [hasSel, data, oid])

  const [tab, setTab] = React.useState<string>(tabs[0]?.id || 'anagrafica')


  // Allegati (attachments) — caricati solo quando la tab "Allegati" è attiva
  const selectedOid = (hasSel && oid != null) ? Number(oid) : null
  const [attachmentsForOid, setAttachmentsForOid] = React.useState<number | null>(null)
  const [attachments, setAttachments] = React.useState<Array<{ id: number; name?: string; size?: number; contentType?: string; url?: string }>>([])
  const [attachmentsLoading, setAttachmentsLoading] = React.useState<boolean>(false)
  const [attachmentsError, setAttachmentsError] = React.useState<string | null>(null)
  const [attachmentsUploading, setAttachmentsUploading] = React.useState<boolean>(false)
  const [attachmentFiles, setAttachmentFiles] = React.useState<File[]>([])

  const formatBytes = React.useCallback((n?: number) => {
    if (n == null || isNaN(Number(n))) return ''
    const num = Number(n)
    if (num < 1024) return `${num} B`
    const kb = num / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(1)} GB`
  }, [])

  const loadAttachments = React.useCallback(async () => {
    if (!selectedOid) return
    try {
      setAttachmentsLoading(true)
      setAttachmentsError(null)

      const dsAny: any = ds as any
      const layer = await resolveFeatureLayerForAttachments(dsAny)

      if (!layer) {
        setAttachments([])
        setAttachmentsForOid(selectedOid)
        setAttachmentsError('Non riesco a risalire al FeatureLayer per leggere gli allegati (datasource/vista non espone il layer JS API).')
        return
      }
      const infos: any[] = await queryFeatureAttachments(layer, selectedOid, dsAny)

      const clean = (infos || []).map((a: any) => ({
        id: Number(a.id),
        name: a.name,
        size: a.size,
        contentType: a.contentType,
        url: a.url
      })).filter((a: any) => a && !isNaN(a.id))

      setAttachments(clean)
      setAttachmentsForOid(selectedOid)
    } catch (e: any) {
      setAttachments([])
      setAttachmentsForOid(selectedOid)
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsLoading(false)
    }
  }, [ds, selectedOid])


  const uploadAttachments = React.useCallback(async () => {
    if (!selectedOid || attachmentFiles.length === 0) return
    try {
      setAttachmentsUploading(true)
      setAttachmentsError(null)
      await uploadFilesToFeatureAttachments(ds as any, selectedOid, attachmentFiles)
      setAttachmentFiles([])
      await loadAttachments()
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsUploading(false)
    }
  }, [ds, selectedOid, attachmentFiles, loadAttachments])

  React.useEffect(() => {
    if (tab === 'allegati' && selectedOid != null && attachmentsForOid !== selectedOid) {
      loadAttachments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedOid, attachmentsForOid])

  // RIMOSSO: Non resettare la tab quando cambia selezione
  // React.useEffect(() => {
  //   // reset tab quando cambia selezione (UX più prevedibile)
  //   setTab(tabs[0]?.id || 'anagrafica')
  // }, [selectionKey, tabs])

  // alias map dai campi layer (se disponibile)
  const [aliasMap, setAliasMap] = React.useState<Record<string, string>>({})
  const [aliasesReady, setAliasesReady] = React.useState<boolean>(false)

  React.useEffect(() => {
    let cancelled = false
    setAliasesReady(false)

    // 1) Prova subito dallo schema del datasource (di solito è pronto prima del JSAPI layer)
    try {
      const schema = ds?.getSchema?.()
      const fobj = schema?.fields || {}
      const mapFromSchema: Record<string, string> = {}
      for (const name of Object.keys(fobj)) {
        const f = fobj[name]
        const alias = String(f?.alias || f?.label || f?.title || name)
        mapFromSchema[name] = alias
      }
      if (!cancelled && Object.keys(mapFromSchema).length) {
        setAliasMap(mapFromSchema)
        setAliasesReady(true)
      }
    } catch {}

    // 2) In parallelo: prova dal layer JSAPI (aggiorna/raffina)
    const loadAliases = async () => {
      if (!ds) { if (!cancelled) { setAliasMap({}); setAliasesReady(true) } return }
      try {
        const raw =
          ds?.getLayer?.() ||
          ds?.getJSAPILayer?.() ||
          ds?.layer ||
          ds?.createJSAPILayerByDataSource?.() ||
          null

        const resolved = await Promise.resolve(raw as any)
        const layer = unwrapJsapiLayer(resolved)
        const fields = (layer?.fields || []) as any[]
        const map: Record<string, string> = {}
        for (const f of fields) {
          const name = String(f?.name || '')
          if (!name) continue
          map[name] = String(f?.alias || f?.label || f?.title || name)
        }
        if (!cancelled) {
          if (Object.keys(map).length) setAliasMap(map)
          setAliasesReady(true)
        }
      } catch {
        if (!cancelled) { setAliasesReady(true) }
      }
    }

    loadAliases()
    return () => { cancelled = true }
  }, [ds])

  const toLabel = React.useCallback((fieldName: string) => {
    const a = aliasMap?.[fieldName]
    // Evita il “flash” del nome campo: se gli alias non sono pronti, non mostrare il nome tecnico.
    if (!aliasesReady) return ''
    return a ? `${a}` : fieldName
  }, [aliasMap, aliasesReady])

// --- Condizionamento campi anagrafica per tipo_soggetto (PF/PG)
  const classifyTipoSoggetto = React.useCallback((raw: any, labelFromDomain?: any): 'PF' | 'PG' | null => {
    return classifyTipoSoggettoRobusto(raw, labelFromDomain)
  }, [])

  
const isPfOnlyField = React.useCallback((fieldName: string) => {
  const nameKey = normKey(fieldName)
  const aliasKey = normKey(aliasMap?.[fieldName] || '')
  const combined = `${nameKey} ${aliasKey}`.trim()

  // Evita falsi positivi tipo "denominazione" (contiene "nome" come substring)
  const isNome = hasToken(combined, 'nome') || combined.startsWith('nome ')
  const isCognome = hasToken(combined, 'cognome') || combined.startsWith('cognome ')
  const isCf =
    hasToken(combined, 'cf') ||
    hasToken(combined, 'c f') ||
    hasToken(combined, 'c f ') ||
    hasToken(combined, 'codice fiscale') ||
    (combined.includes('cod') && combined.includes('fisc'))

  return Boolean(isNome || isCognome || isCf)
}, [aliasMap])

const isPgOnlyField = React.useCallback((fieldName: string) => {
  const nameKey = normKey(fieldName)
  const aliasKey = normKey(aliasMap?.[fieldName] || '')
  const combined = `${nameKey} ${aliasKey}`.trim()

  const isRagSoc =
    hasToken(combined, 'ragione sociale') ||
    hasToken(combined, 'denominazione') ||
    (combined.includes('ragione') && combined.includes('social'))

  const isPiva =
    hasToken(combined, 'partita iva') ||
    hasToken(combined, 'p iva') ||
    hasToken(combined, 'piva') ||
    (combined.includes('partita') && combined.includes('iva'))

  return Boolean(isRagSoc || isPiva)
}, [aliasMap])

  const makeRows = React.useCallback((fields: string[], kind: string, hideEmpty: boolean) => {
    const rawList = (fields && fields.length) ? fields : []  // Se nessun campo configurato, mostra lista vuota (usare il setting per configurare)
    const tipoRaw = (data && (data as any).__tipo_soggetto_raw != null) ? (data as any).__tipo_soggetto_raw : ((data && (data as any).tipo_soggetto != null) ? (data as any).tipo_soggetto : null)
    const tipoLabel = (data && (data as any).__tipo_soggetto_label != null) ? (data as any).__tipo_soggetto_label : null
    const sogg = (kind === 'ANAGRAFICA') ? classifyTipoSoggetto(tipoRaw, tipoLabel) : null
    const list = (kind === 'ANAGRAFICA' && sogg)
      ? rawList.filter(fn => {
          if (!fn) return false
          if (sogg === 'PF' && isPgOnlyField(fn)) return false
          if (sogg === 'PG' && isPfOnlyField(fn)) return false
          return true
        })
      : rawList
    const rows: Array<{ label: string; value: any }> = []
    for (const f of list) {
      if (!f) continue
      let vv = data ? (data as any)[f] : null
      if (String(f).toLowerCase() === 'norma_violata3') {
        const codes = String(vv || '').split(/\s+/).filter(Boolean)
        vv = codes.map(code => {
          const m = CHOICES.norma3.find(o => o.v === code)
          return m ? m.l : code
        }).join('\n')
      }
      if (String(f).toLowerCase() === 'presenza_trasgressore') {
        const sv = String(vv || '').trim().toLowerCase()
        if (sv === 'si' || sv === 'sì') vv = 'Sì'
        else if (sv === 'no') vv = 'No'
      }
      if (hideEmpty && isEmptyValue(vv)) continue
      rows.push({ label: toLabel(f), value: vv })
    }
    return rows
  }, [data, toLabel, classifyTipoSoggetto, isPfOnlyField, isPgOnlyField])
// Iter: sempre blocchi DT/DA + extra selezionati
  const presaDT = data ? data.presa_in_carico_DT : null
  const dtPresaDT = data ? data.dt_presa_in_carico_DT : null
  const statoDT = data ? data.stato_DT : null
  const dtStatoDT = data ? data.dt_stato_DT : null
  const esitoDT = data ? data.esito_DT : null
  const dtEsitoDT = data ? data.dt_esito_DT : null
  const noteDT = data ? data.note_DT : null

  const presaDA = data ? data.presa_in_carico_DA : null
  const dtPresaDA = data ? data.dt_presa_in_carico_DA : null
  const statoDA = data ? data.stato_DA : null
  const dtStatoDA = data ? data.dt_stato_DA : null
  const esitoDA = data ? data.esito_DA : null
  const dtEsitoDA = data ? data.dt_esito_DA : null
  const noteDA = data ? data.note_DA : null

  const TabsBar = (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: 8, 
      padding: '8px 12px',
      alignItems: 'center',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      background: 'var(--bs-body-bg, #fff)',
      marginTop: -ui.panelPadding,
      marginLeft: -ui.panelPadding,
      marginRight: -ui.panelPadding,
      width: `calc(100% + ${ui.panelPadding * 2}px)`,
      borderTopLeftRadius: ui.panelBorderRadius,
      borderTopRightRadius: ui.panelBorderRadius
    }}>
      {hasSel && tabs.map((t) => (
        <TabButton 
          key={t.id}
          active={tab === t.id} 
          label={t.label} 
          onClick={() => setTab(t.id)} 
        />
      ))}
    </div>
  )

  const outerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  boxSizing: 'border-box'
}

const frameStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  boxSizing: 'border-box',
  background: ui.panelBg,
  border: `${ui.panelBorderWidth}px solid ${ui.panelBorderColor}`,
  borderRadius: ui.panelBorderRadius,
  padding: ui.panelPadding
}

const tabsStyle: React.CSSProperties = {
  flex: '0 0 auto'
}

const contentStyle: React.CSSProperties = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto'
}

let content: React.ReactNode = null

if (!hasSel) {
  // In questo pannello (modalità UPDATE/legacy) una selezione è necessaria.
  // La creazione senza selezione viene gestita nel runtime principale quando enableCreateWithoutSelection è ON.
  content = (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', minHeight:200, fontSize:13, color:'rgba(0,0,0,0.45)' }}>
      Seleziona una pratica dall&apos;Elenco.
    </div>
  )
} else {
  const activeTab = tabs.find(t => t.id === tab)
  
  if (activeTab?.id === 'azioni') {
    content = (
      <ActionsPanel
        active={active}
        roleCode={props.roleCode}
        buttonText={props.buttonText}
        buttonColors={props.buttonColors}
        ui={props.ui}
        editConfig={props.editConfig}
        motherLayerUrl={props.motherLayerUrl}
      />
    )
  } else if (activeTab?.isIterTab) {
    // Tab Iter con campi DT/DA fissi + extra
    const iterRows: Array<{ label: string; value: any }> = []
    iterRows.push({ label: 'DT - Presa in carico', value: presaDT })
    iterRows.push({ label: 'DT - Data presa in carico', value: formatDateSafe(dtPresaDT) })
    iterRows.push({ label: 'DT - Stato', value: statoDT })
    iterRows.push({ label: 'DT - Data stato', value: formatDateSafe(dtStatoDT) })
    iterRows.push({ label: 'DT - Esito', value: esitoDT })
    iterRows.push({ label: 'DT - Data esito', value: formatDateSafe(dtEsitoDT) })
    iterRows.push({ label: 'DT - Note', value: noteDT })

    iterRows.push({ label: 'DA - Presa in carico', value: presaDA })
    iterRows.push({ label: 'DA - Data presa in carico', value: formatDateSafe(dtPresaDA) })
    iterRows.push({ label: 'DA - Stato', value: statoDA })
    iterRows.push({ label: 'DA - Data stato', value: formatDateSafe(dtStatoDA) })
    iterRows.push({ label: 'DA - Esito', value: esitoDA })
    iterRows.push({ label: 'DA - Data esito', value: formatDateSafe(dtEsitoDA) })
    iterRows.push({ label: 'DA - Note', value: noteDA })

    // Aggiungi campi extra configurati
    const iterExtraRows = aliasesReady ? makeRows(activeTab.fields, activeTab.id.toUpperCase(), Boolean((activeTab as any).hideEmpty)) : []
    iterExtraRows.forEach(r => iterRows.push(r))
    
    content = <ReadOnlyPanel title={activeTab.label} ui={ui} rows={iterRows} />
  } else if (activeTab) {
    // Tab normale con campi configurabili
    const rows = aliasesReady ? makeRows(activeTab.fields, activeTab.id.toUpperCase(), Boolean((activeTab as any).hideEmpty)) : []

    if (activeTab.id === 'allegati') {
      // Pannello Allegati: elenco attachments (se presenti) + (opzionale) attributi della tab
      const dsAny: any = ds as any
      const layer = unwrapJsapiLayer(
        (dsAny && (typeof dsAny.getLayer === 'function') ? dsAny.getLayer() : null) ||
        (dsAny && (typeof dsAny.getJsApiLayer === 'function') ? dsAny.getJsApiLayer() : null) ||
        (dsAny && dsAny.layer) ||
        dsAny
      ) as any
      const layerUrl = normalizeFeatureLayerUrl(layer && layer.url ? String(layer.url) : '')

      const getOpenUrl = (att: any): string | null => {
        if (att && att.url) return String(att.url)
        if (layerUrl && selectedOid != null && att && att.id != null) return `${layerUrl}/${selectedOid}/attachments/${att.id}`
        return null
      }

      content = (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Allegati</div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#111827', fontSize: 12, fontWeight: 600, cursor: !hasSel || attachmentsUploading ? 'not-allowed' : 'pointer' }}>
                Scegli file
                <input
                  type='file'
                  multiple
                  style={{ display: 'none' }}
                  disabled={!hasSel || attachmentsUploading}
                  onChange={(e) => {
                    const files = Array.from((e.target as HTMLInputElement).files || [])
                    setAttachmentFiles(files)
                  }}
                />
              </label>
              <button
                type='button'
                onClick={() => void uploadAttachments()}
                disabled={!hasSel || attachmentsUploading || attachmentFiles.length === 0}
                style={{
                  minHeight: 34, height: 34, boxSizing: 'border-box',
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid #15803d',
                  background: '#16a34a',
                  color: '#fff',
                  cursor: (!hasSel || attachmentsUploading || attachmentFiles.length === 0) ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: (!hasSel || attachmentsUploading || attachmentFiles.length === 0) ? 0.6 : 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                }}
              >
                {attachmentsUploading ? 'Carico…' : 'Allega'}
              </button>
          </div>
          </div>

          {!hasSel && (
            <div style={{ opacity: 0.75, fontSize: 12 }}>Selezionare un rapporto per vedere gli allegati.</div>
          )}

          {hasSel && attachmentFiles.length > 0 && (
            <div style={{ fontSize: 12, color: '#374151' }}>File selezionati: {attachmentFiles.map(f => f.name).join(', ')}</div>
          )}

          {hasSel && attachmentsLoading && (
            <div style={{ opacity: 0.75, fontSize: 12 }}>Caricamento allegati…</div>
          )}

          {hasSel && !attachmentsLoading && attachmentsError && (
            <div style={{ color: '#b00020', fontSize: 12 }}>{attachmentsError}</div>
          )}

          {hasSel && !attachmentsLoading && !attachmentsError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(attachments && attachments.length) ? (
                attachments.map((a) => {
                  const url = getOpenUrl(a)
                  const meta = [a.contentType, formatBytes(a.size)].filter(Boolean).join(' • ')
                  return (
                    <div
                      key={a.id}
                      style={{
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 12,
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.name || `Allegato #${a.id}`}
                        </div>
                        {meta ? <div style={{ opacity: 0.7, fontSize: 11 }}>{meta}</div> : null}
                      </div>
                      {url ? (
                        <a
                          href={url}
                          target='_blank'
                          rel='noreferrer'
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#eaf2ff'
                            e.currentTarget.style.borderColor = '#2f6fed'
                            e.currentTarget.style.color = '#1d4ed8'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff'
                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
                            e.currentTarget.style.color = '#111827'
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 10,
                            border: '1px solid rgba(0,0,0,0.12)',
                            background: '#fff',
                            color: '#111827',
                            textDecoration: 'none',
                            fontSize: 12,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Apri
                        </a>
                      ) : (
                        <span style={{ opacity: 0.6, fontSize: 12, whiteSpace: 'nowrap' }}>URL non disponibile</span>
                      )}
                    </div>
                  )
                })
              ) : (
                <div style={{ opacity: 0.75, fontSize: 12 }}>Nessun allegato.</div>
              )}
            </div>
          )}

          {rows && rows.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Attributi</div>
              <ReadOnlyPanel
                title={activeTab.label}
                rows={rows}
                emptyText={hasSel ? 'Nessun campo configurato per questa tab.' : 'Selezionare un rapporto.'}
              />
            </div>
          )}
        </div>
      )
    } else {
      content = (
        <ReadOnlyPanel
          title={activeTab.label}
          rows={rows}
          emptyText={hasSel ? 'Nessun campo configurato per questa tab.' : 'Selezionare un rapporto.'}
        />
      )
    }
  }
}

return (
  <div style={outerStyle}>
    {/* Titolo pratica - sopra l'area bianca */}
    <div style={{
      height: ui.detailTitleHeight ?? 28,
      paddingBottom: ui.detailTitlePaddingBottom ?? 10,
      paddingLeft: ui.detailTitlePaddingLeft ?? 0,
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
      flex: '0 0 auto',
      background: (ui as any).detailTitleBg && (ui as any).detailTitleBg !== 'transparent' ? (ui as any).detailTitleBg : undefined
    }}>
      <span style={{
        fontSize: ui.detailTitleFontSize ?? 14,
        fontWeight: ui.detailTitleFontWeight ?? 600,
        color: hasSel && praticaCode
          ? (ui.detailTitleColor ?? 'rgba(0,0,0,0.85)')
          : 'rgba(0,0,0,0.40)'
      }}>
        {String(ui.detailTitlePrefix ?? 'Dettaglio rapporto n.')} {hasSel && praticaCode ? praticaCode : '–'}
      </span>
    </div>
    <div style={frameStyle}>
      <div style={tabsStyle}>{TabsBar}</div>
      <div style={contentStyle}>{content}</div>
    </div>
  </div>
)

}



type DynamicSelectionInfo = {
  oid: number | null
  layerUrl: string
  idFieldName: string
  data?: any | null
}

function makeRecordProxy (attrs: any, idFieldName: string) {
  const oid = attrs?.[idFieldName] ?? attrs?.OBJECTID ?? attrs?.ObjectId ?? attrs?.objectid ?? attrs?.objectId ?? null
  return {
    getData: () => attrs || {},
    getId: () => String(oid ?? ''),
    id: oid
  }
}

function getServiceNameFromUrl (url: string): string {
  try {
    const part = String(url || '').split('/rest/services/')[1] || ''
    return (part.split('/FeatureServer')[0] || '').trim()
  } catch {
    return ''
  }
}

function readDynamicSelection (): DynamicSelectionInfo {
  try {
    const w: any = window as any
    const sel: any = w.__giiSelection || {}
    const rawOid = sel?.oid ?? sessionStorage.getItem('GII_SELECTED_OID')
    const oidNum = rawOid != null && rawOid !== '' ? Number(rawOid) : NaN
    const layerUrl = normalizeFeatureLayerUrl(sel?.layerUrl || sessionStorage.getItem('GII_SELECTED_LAYER_URL') || '')
    const idFieldName = String(sel?.idFieldName || sessionStorage.getItem('GII_SELECTED_IDFIELD') || 'OBJECTID').trim() || 'OBJECTID'
    const cache = (layerUrl && Number.isFinite(oidNum)) ? readSelectedFeatureCache(layerUrl, oidNum) : null
    return {
      oid: Number.isFinite(oidNum) ? oidNum : null,
      layerUrl,
      idFieldName,
      data: cache?.data || null
    }
  } catch {
    return { oid: null, layerUrl: '', idFieldName: 'OBJECTID', data: null }
  }
}

function writeDynamicSelection (
  sel: { oid?: number | null, layerUrl?: string, idFieldName?: string, data?: any | null },
  opts?: { dispatch?: boolean }
) {
  try {
    const prev: any = (window as any).__giiSelection || {}
    const next: any = {
      ...prev,
      oid: sel.oid !== undefined ? sel.oid : prev.oid,
      layerUrl: sel.layerUrl !== undefined ? sel.layerUrl : prev.layerUrl,
      idFieldName: sel.idFieldName !== undefined ? sel.idFieldName : prev.idFieldName,
      ts: Date.now()
    }
    try { delete next.data } catch {}
    ;(window as any).__giiSelection = next
    if (next.oid != null && Number.isFinite(Number(next.oid))) sessionStorage.setItem('GII_SELECTED_OID', String(Number(next.oid)))
    else sessionStorage.removeItem('GII_SELECTED_OID')
    if (next.layerUrl) sessionStorage.setItem('GII_SELECTED_LAYER_URL', String(next.layerUrl))
    else sessionStorage.removeItem('GII_SELECTED_LAYER_URL')
    if (next.idFieldName) sessionStorage.setItem('GII_SELECTED_IDFIELD', String(next.idFieldName))
    else sessionStorage.removeItem('GII_SELECTED_IDFIELD')
    if (sel.data && next.layerUrl && next.oid != null && Number.isFinite(Number(next.oid))) {
      try { writeSelectedFeatureCache(String(next.layerUrl), Number(next.oid), String(next.idFieldName || 'OBJECTID'), sel.data, 'edit') } catch {}
      try { sessionStorage.setItem('GII_SELECTED_DATA', JSON.stringify(sel.data)) } catch {}
    } else {
      try { sessionStorage.removeItem('GII_SELECTED_DATA') } catch {}
    }
    if (opts?.dispatch !== false) {
      window.dispatchEvent(new CustomEvent('gii-selection-changed'))
    }
  } catch {}
}

type EditIntentInfo = { oid: number | null, layerUrl: string, idFieldName: string, data: any | null, ts: number }

function readEditIntent (): EditIntentInfo | null {
  try {
    const raw = sessionStorage.getItem('GII_EDIT_INTENT')
    if (!raw) return null
    const j: any = JSON.parse(raw)
    const oidNum = j?.oid != null && j?.oid !== '' ? Number(j.oid) : NaN
    const layerUrl = normalizeFeatureLayerUrl(j?.layerUrl || '')
    const idFieldName = String(j?.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
    const ts = Number(j?.ts || 0)
    const ageMs = Math.abs(Date.now() - (Number.isFinite(ts) ? ts : 0))
    if (!layerUrl || !Number.isFinite(oidNum)) return null
    // evita che un vecchio intento di modifica resti appiccicato quando si entra da Nav > Nuova pratica
    if (!Number.isFinite(ts) || ageMs > 15000) return null
    return { oid: Number(oidNum), layerUrl, idFieldName, data: j?.data || null, ts: Number.isFinite(ts) ? ts : 0 }
  } catch {
    return null
  }
}

function clearEditIntent () {
  try { sessionStorage.removeItem('GII_EDIT_INTENT') } catch {}
}

function selectionToIntent (): EditIntentInfo | null {
  try {
    const sel = readDynamicSelection()
    const oidNum = sel?.oid != null ? Number(sel.oid) : NaN
    const layerUrl = normalizeFeatureLayerUrl(sel?.layerUrl || '')
    const idFieldName = String(sel?.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
    if (!layerUrl || !Number.isFinite(oidNum)) return null
    return { oid: Number(oidNum), layerUrl, idFieldName, data: sel?.data || null, ts: Date.now() }
  } catch {
    return null
  }
}

function writeEditIntent (ei: EditIntentInfo | null) {
  try {
    if (!ei || ei.oid == null || !ei.layerUrl) {
      clearEditIntent()
      return
    }
    sessionStorage.setItem('GII_EDIT_INTENT', JSON.stringify({ ...ei, ts: Date.now() }))
  } catch {}
}

function findMapHostElement (mapWidgetId?: string | null): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const id = String(mapWidgetId || '').trim()
  const selectors = [
    id ? `[data-widgetid="${id}"]` : '',
    id ? `[widgetid="${id}"]` : '',
    id ? `#${id}` : '',
    '.jimu-widget-map',
    '.jimu-widget.jimu-widget-map',
    '.esri-view-root',
    '.esri-view',
    '.esri-view-surface'
  ].filter(Boolean)
  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) continue
    const host = el.closest?.('.jimu-widget-map, .jimu-widget.jimu-widget-map, [data-widgetid], [widgetid]') as HTMLElement | null
    return host || el
  }
  return null
}

function normalizeLayerTitleForMatch (raw: any): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function getTrailingLayerIdFromUrl (raw: any): string {
  const m = String(raw || '').trim().match(/\/(\d+)\/?(?:[?#].*)?$/)
  return m ? m[1] : ''
}

function normalizeMapLayerUrlForMatch (raw: any, layer?: any): string {
  const url = ensureLayerIndex(normalizeFeatureLayerUrl(raw), layer)
  return String(url || '').replace(/\/+$/, '').toLowerCase()
}

function stripLayerIndexForMatch (url: string): string {
  return String(url || '').replace(/\/\d+$/, '')
}

function getLayerRestIdCandidates (layer: any): string[] {
  const vals = [layer?.layerId, layer?.layerIndex, layer?.sourceJSON?.layerId, layer?.sourceJSON?.layerIndex, getTrailingLayerIdFromUrl(layer?.url)]
  return Array.from(new Set(vals.map(v => String(v ?? '').trim()).filter(Boolean)))
}

function getLayerIdCandidates (layer: any): string[] {
  const vals = [layer?.id, layer?.uid, layer?.sourceJSON?.id, layer?.sourceJSON?.layerId, layer?.sourceJSON?.jimuChildId]
  return Array.from(new Set(vals.map(v => String(v ?? '').trim()).filter(Boolean)))
}

function collectFeatureLayersFromView (view: any): any[] {
  try {
    const raw = view?.map?.allLayers?.toArray?.() || view?.map?.allLayers || []
    const arr = Array.isArray(raw) ? raw : (raw?.toArray?.() || [])
    return arr.filter((fl: any) => fl?.type === 'feature')
  } catch {
    return []
  }
}

function matchesLayerByConfiguredIds (layer: any, cfg: any): boolean {
  const configuredId = String(cfg?.mapLayerId || '').trim()
  const configuredLayerId = String(cfg?.mapLayerLayerId || '').trim()
  const configuredUrl = normalizeMapLayerUrlForMatch(cfg?.mapLayerUrl || '')
  const layerUrl = normalizeMapLayerUrlForMatch(layer?.url || '', layer)
  const layerIds = getLayerIdCandidates(layer)
  const restIds = getLayerRestIdCandidates(layer)

  if (configuredId && layerIds.includes(configuredId)) return true
  if (configuredLayerId && restIds.includes(configuredLayerId)) return true
  if (configuredUrl && layerUrl && configuredUrl === layerUrl) return true

  if (configuredUrl && layerUrl) {
    const sameService = stripLayerIndexForMatch(configuredUrl) === stripLayerIndexForMatch(layerUrl)
    const configuredUrlLayerId = getTrailingLayerIdFromUrl(configuredUrl)
    if (sameService && configuredUrlLayerId && restIds.includes(configuredUrlLayerId)) return true
    if (sameService && configuredLayerId && restIds.includes(configuredLayerId)) return true
  }

  return false
}

function matchesLayerByConfiguredTitle (layer: any, cfg: any): boolean {
  const configuredTitle = normalizeLayerTitleForMatch(cfg?.mapLayerTitle || '')
  if (!configuredTitle) return false
  const title = normalizeLayerTitleForMatch(layer?.title || layer?.sourceJSON?.title || layer?.sourceJSON?.name || '')
  return !!title && title === configuredTitle
}

function matchesLegacyRapportiLayer (layer: any): boolean {
  const title = normalizeLayerTitleForMatch(layer?.title || layer?.sourceJSON?.title || layer?.sourceJSON?.name || '')
  return title.includes('rapporto') && title.includes('infrazioni')
}

function findRapportiLayers (view: any, cfg: any): any[] {
  const layers = collectFeatureLayersFromView(view)
  const byIds = layers.filter(layer => matchesLayerByConfiguredIds(layer, cfg))
  if (byIds.length > 0) return byIds

  const byTitle = layers.filter(layer => matchesLayerByConfiguredTitle(layer, cfg))
  if (byTitle.length > 0) return byTitle

  return layers.filter(matchesLegacyRapportiLayer)
}

function getMapLayerRuntimeKey (layer: any): string {
  const url = normalizeMapLayerUrlForMatch(layer?.url || '', layer)
  const ids = getLayerIdCandidates(layer).join(',')
  const restIds = getLayerRestIdCandidates(layer).join(',')
  const title = normalizeLayerTitleForMatch(layer?.title || layer?.sourceJSON?.title || layer?.sourceJSON?.name || '')
  return `${ids}|${restIds}|${url}|${title}`
}

function buildSchemaOnlyDsProxy (args: { url?: string, label?: string, schemaFields?: Array<{ name?: string, alias?: string, type?: string }> }): any {
  const url = String(args?.url || '').trim()
  const label = String(args?.label || getServiceNameFromUrl(url) || 'GII schema locale')
  const fieldsArr = Array.isArray(args?.schemaFields) ? args.schemaFields : []
  const schemaFields: Record<string, any> = {}
  let idFieldName = 'OBJECTID'

  for (const f of fieldsArr) {
    const name = String((f as any)?.name || '').trim()
    if (!name) continue
    const alias = String((f as any)?.alias || name)
    const type = String((f as any)?.type || '')
    schemaFields[name] = { alias, label: alias, title: alias, type, domain: null }
  }

  for (const name of Object.keys(schemaFields)) {
    const nk = normKey(name)
    if (nk === 'objectid' || nk === 'objectid_1' || nk === 'objectidfield') {
      idFieldName = name
      break
    }
  }

  const proxy: any = {
    id: `gii-schema-${encodeURIComponent(url || label).slice(-48)}`,
    layer: null,
    async getLayer (): Promise<any> { return null },
    async getJSAPILayer (): Promise<any> { return null },
    async getJsApiLayer (): Promise<any> { return null },
    getDataSourceJson () { return { url } },
    dataSourceJson: { url },
    getLabel () { return label },
    getIdField () { return idFieldName },
    getSchema () { return { idField: idFieldName, fields: schemaFields } },
    async query (_q: any): Promise<{ records: any[] }> { return { records: [] as any[] } },
    clearSelection () {}
  }

  return proxy
}

async function buildDynamicDsProxy (layerUrl: string, label?: string): Promise<any | null> {
  const url = String(layerUrl || '').trim()
  if (!url) return null
  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url, outFields: ['*'] })
    if (typeof fl?.load === 'function') await fl.load().catch(() => {})
    const idFieldName = String(fl?.objectIdField || 'OBJECTID')
    const schemaFields: Record<string, any> = {}
    ;((fl?.fields || []) as any[]).forEach((f: any) => {
      if (!f?.name) return
      schemaFields[String(f.name)] = {
        alias: String(f.alias || f.name),
        label: String(f.alias || f.name),
        title: String(f.alias || f.name),
        type: String(f.type || ''),
        domain: f.domain || null
      }
    })
    const proxy: any = {
      id: `gii-dynamic-${encodeURIComponent(url).slice(-48)}`,
      layer: fl,
      async getLayer () { return fl },
      async getJSAPILayer () { return fl },
      async getJsApiLayer () { return fl },
      getDataSourceJson () { return { url } },
      dataSourceJson: { url },
      getLabel () { return String(label || getServiceNameFromUrl(url) || 'GII view dinamica') },
      getIdField () { return idFieldName },
      getSchema () { return { idField: idFieldName, fields: schemaFields } },
      async query (q: any) {
        const qq: any = {
          where: String(q?.where || '1=1'),
          outFields: Array.isArray(q?.outFields) && q.outFields.length ? q.outFields : ['*'],
          returnGeometry: !!q?.returnGeometry
        }
        if (Number.isFinite(Number(q?.num))) qq.num = Number(q.num)
        else if (Number.isFinite(Number(q?.pageSize))) qq.num = Number(q.pageSize)
        const res: any = await fl.queryFeatures(qq)
        const feats: any[] = Array.isArray(res?.features) ? res.features : []
        return { records: feats.map((ft: any) => makeRecordProxy(ft?.attributes || {}, idFieldName)) }
      },
      async selectRecordsByIds (ids: any[]) {
        const oid = Array.isArray(ids) && ids.length ? Number(ids[0]) : null
        writeDynamicSelection({ oid, layerUrl: url, idFieldName })
      },
      async selectRecordById (id: any) {
        const oid = id != null ? Number(id) : null
        writeDynamicSelection({ oid, layerUrl: url, idFieldName })
      },
      async setSelectedRecordIds (ids: any[]) {
        const oid = Array.isArray(ids) && ids.length ? Number(ids[0]) : null
        writeDynamicSelection({ oid, layerUrl: url, idFieldName })
      },
      async setSelectedIds (ids: any[]) {
        const oid = Array.isArray(ids) && ids.length ? Number(ids[0]) : null
        writeDynamicSelection({ oid, layerUrl: url, idFieldName })
      },
      clearSelection () {
        const cur = readDynamicSelection()
        if (cur.layerUrl === url) writeDynamicSelection({ oid: null, layerUrl: url, idFieldName, data: null })
      }
    }
    return proxy
  } catch {
    return null
  }
}

function useDynamicActiveSelection (queryFields: string[], label?: string, enabled: boolean = true) {
  const [active, setActive] = React.useState<{ key: string; state: SelState } | null>(null)
  const reqRef = React.useRef(0)

  React.useEffect(() => {
    if (!enabled) {
      setActive(null)
      return
    }
    const refresh = () => {
      const req = ++reqRef.current
      const sel = readDynamicSelection()
      if (sel.oid == null || !sel.layerUrl) {
        setActive(null)
        return
      }
      ;(async () => {
        const ds = await buildDynamicDsProxy(sel.layerUrl, label)
        if (!ds) {
          if (req === reqRef.current) setActive(null)
          return
        }
        const idFieldName = String(sel.idFieldName || ds.getIdField?.() || 'OBJECTID')
        let data = sel.data || null
        try {
          if (!data || Number(data?.[idFieldName] ?? data?.OBJECTID ?? null) !== Number(sel.oid)) {
            const res: any = await ds.query({ where: `${idFieldName}=${Number(sel.oid)}`, outFields: queryFields, returnGeometry: false })
            const rec0: any = res?.records?.[0] || null
            data = rec0?.getData?.() || null
          }
        } catch {
          data = null
        }
        if (req !== reqRef.current) return
        if (!data) {
          setActive(null)
          return
        }
        setActive({
          key: sel.layerUrl,
          state: {
            ds,
            oid: Number(sel.oid),
            idFieldName,
            data,
            sig: `${sel.layerUrl}:${Number(sel.oid)}:${Date.now()}`,
            layerUrl: String(sel.layerUrl || '')
          }
        })
      })().catch(() => {
        if (req === reqRef.current) setActive(null)
      })
    }
    refresh()
    const h = () => refresh()
    window.addEventListener('gii-selection-changed', h as any)
    window.addEventListener('gii-force-refresh-selection', h as any)
    return () => {
      window.removeEventListener('gii-selection-changed', h as any)
      window.removeEventListener('gii-force-refresh-selection', h as any)
    }
  }, [enabled, label, queryFields.join('|')])

  return active
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfgMutable: any = (props.config && (props.config as any).asMutable)
    ? (props.config as any).asMutable({ deep: true })
    : (props.config as any || {})
  const cfg: any = { ...defaultConfig, ...cfgMutable }

  const [detectedRole, setDetectedRole] = React.useState<string>('')
  React.useEffect(() => {
    const readRole = () => {
      try {
        const r = (window as any).__giiUserRole?.ruoloLabel
        setDetectedRole(r && r !== 'ADMIN' ? String(r).toUpperCase() : '')
      } catch { }
    }
    readRole()
    window.addEventListener('gii:userLoaded', readRole)
    return () => window.removeEventListener('gii:userLoaded', readRole)
  }, [])

  const showDatiGenerali = cfg.showDatiGenerali === true
  const roleCode = detectedRole || String(cfg.roleCode || 'DT').toUpperCase()
  const buttonText = String(cfg.buttonText || 'Prendi in carico')
  const buttonColors: ButtonColors = {
    take: normalizeHexColor(cfg.takeColor, defaultConfig.takeColor),
    integrazione: normalizeHexColor(cfg.integrazioneColor, defaultConfig.integrazioneColor),
    approva: normalizeHexColor(cfg.approvaColor, defaultConfig.approvaColor),
    respingi: normalizeHexColor(cfg.respingiColor, defaultConfig.respingiColor),
    trasmetti: normalizeHexColor(cfg.trasmettiColor, defaultConfig.trasmettiColor)
  }

  const ui = {
    panelBg: String((cfg as any).maskBg ?? cfg.panelBg ?? (defaultConfig as any).maskBg ?? defaultConfig.panelBg),
    panelBorderColor: String((cfg as any).maskBorderColor ?? cfg.panelBorderColor ?? (defaultConfig as any).maskBorderColor ?? defaultConfig.panelBorderColor),
    panelBorderWidth: Number.isFinite(Number((cfg as any).maskBorderWidth ?? cfg.panelBorderWidth)) ? Number((cfg as any).maskBorderWidth ?? cfg.panelBorderWidth) : ((defaultConfig as any).maskBorderWidth ?? defaultConfig.panelBorderWidth),
    panelBorderRadius: Number.isFinite(Number((cfg as any).maskBorderRadius ?? cfg.panelBorderRadius)) ? Number((cfg as any).maskBorderRadius ?? cfg.panelBorderRadius) : ((defaultConfig as any).maskBorderRadius ?? defaultConfig.panelBorderRadius),
    panelPadding: Number.isFinite(Number((cfg as any).maskInnerPadding ?? cfg.panelPadding)) ? Number((cfg as any).maskInnerPadding ?? cfg.panelPadding) : ((defaultConfig as any).maskInnerPadding ?? defaultConfig.panelPadding),
    dividerColor: String(cfg.dividerColor ?? defaultConfig.dividerColor),
    titleFontSize: Number.isFinite(Number(cfg.titleFontSize)) ? Number(cfg.titleFontSize) : defaultConfig.titleFontSize,
    statusFontSize: Number.isFinite(Number(cfg.statusFontSize)) ? Number(cfg.statusFontSize) : defaultConfig.statusFontSize,
    msgFontSize: Number.isFinite(Number(cfg.msgFontSize)) ? Number(cfg.msgFontSize) : defaultConfig.msgFontSize,
    rejectReasons: Array.isArray(cfg.rejectReasons) ? cfg.rejectReasons.map((x: any) => String(x)) : defaultConfig.rejectReasons,
    reasonsZebraOddBg: String(cfg.reasonsZebraOddBg ?? defaultConfig.reasonsZebraOddBg),
    reasonsZebraEvenBg: String(cfg.reasonsZebraEvenBg ?? defaultConfig.reasonsZebraEvenBg),
    reasonsRowBorderColor: String(cfg.reasonsRowBorderColor ?? defaultConfig.reasonsRowBorderColor),
    reasonsRowBorderWidth: Number.isFinite(Number(cfg.reasonsRowBorderWidth)) ? Number(cfg.reasonsRowBorderWidth) : defaultConfig.reasonsRowBorderWidth,
    reasonsRowRadius: Number.isFinite(Number(cfg.reasonsRowRadius)) ? Number(cfg.reasonsRowRadius) : defaultConfig.reasonsRowRadius,
    detailTitlePrefix: String(cfg.detailTitlePrefix ?? defaultConfig.detailTitlePrefix),
    detailTitleHeight: Number.isFinite(Number(cfg.detailTitleHeight)) ? Number(cfg.detailTitleHeight) : defaultConfig.detailTitleHeight,
    detailTitlePaddingBottom: Number.isFinite(Number(cfg.detailTitlePaddingBottom)) ? Number(cfg.detailTitlePaddingBottom) : defaultConfig.detailTitlePaddingBottom,
    detailTitlePaddingLeft: Number.isFinite(Number(cfg.detailTitlePaddingLeft)) ? Number(cfg.detailTitlePaddingLeft) : defaultConfig.detailTitlePaddingLeft,
    detailTitleFontSize: Number.isFinite(Number(cfg.detailTitleFontSize)) ? Number(cfg.detailTitleFontSize) : defaultConfig.detailTitleFontSize,
    detailTitleFontWeight: Number.isFinite(Number(cfg.detailTitleFontWeight)) ? Number(cfg.detailTitleFontWeight) : defaultConfig.detailTitleFontWeight,
    detailTitleColor: String(cfg.detailTitleColor ?? defaultConfig.detailTitleColor),
    detailTitleBg: String(cfg.detailTitleBg ?? defaultConfig.detailTitleBg ?? 'transparent'),
    btnBorderRadius: Number.isFinite(Number(cfg.btnBorderRadius)) ? Number(cfg.btnBorderRadius) : defaultConfig.btnBorderRadius ?? 8,
    btnFontSize: Number.isFinite(Number(cfg.btnFontSize)) ? Number(cfg.btnFontSize) : defaultConfig.btnFontSize ?? 13,
    btnFontWeight: Number.isFinite(Number(cfg.btnFontWeight)) ? Number(cfg.btnFontWeight) : defaultConfig.btnFontWeight ?? 600,
    btnPaddingX: Number.isFinite(Number(cfg.btnPaddingX)) ? Number(cfg.btnPaddingX) : defaultConfig.btnPaddingX ?? 16,
    btnPaddingY: Number.isFinite(Number(cfg.btnPaddingY)) ? Number(cfg.btnPaddingY) : defaultConfig.btnPaddingY ?? 8,
    formLabelColor: String((cfg as any).formLabelColor || defaultConfig.formLabelColor),
    formLabelFontSize: Number.isFinite(Number((cfg as any).formLabelFontSize)) ? Number((cfg as any).formLabelFontSize) : defaultConfig.formLabelFontSize,
    sectionHeaderColor: String((cfg as any).sectionHeaderColor || defaultConfig.sectionHeaderColor),
    sectionHeaderFontSize: Number.isFinite(Number((cfg as any).sectionHeaderFontSize)) ? Number((cfg as any).sectionHeaderFontSize) : defaultConfig.sectionHeaderFontSize,
    sectionDividerColor: String((cfg as any).sectionDividerColor || defaultConfig.sectionDividerColor),
    sectionDividerWidth: Number.isFinite(Number((cfg as any).sectionDividerWidth)) ? Number((cfg as any).sectionDividerWidth) : defaultConfig.sectionDividerWidth
  }

  const tabFields: TabFields = {
    anagrafica: normalizeFieldList((cfg as any).anagraficaFields),
    violazione: normalizeFieldList((cfg as any).violazioneFields),
    allegati: normalizeFieldList((cfg as any).allegatiFields),
    iterExtra: normalizeFieldList((cfg as any).iterExtraFields)
  }
  const migratedTabs = migrateTabs(tabFields, cfg.tabs || [])
  const editConfig = {
    show: cfg.showEditButtons !== false,
    overlayColor: normalizeHexColor(cfg.editOverlayColor, '#7c3aed'),
    pageColor: normalizeHexColor(cfg.editPageColor, '#5b21b6'),
    pageId: String(cfg.editPageId || 'editing-ti'),
    fieldStatoTI: String(cfg.fieldStatoTI || 'stato_TI'),
    fieldPresaTI: String(cfg.fieldPresaTI || 'presa_in_carico_TI'),
    minStato: Number.isFinite(Number(cfg.editMinStato)) ? Number(cfg.editMinStato) : 2,
    maxStato: Number.isFinite(Number(cfg.editMaxStato)) ? Number(cfg.editMaxStato) : 2,
    presaRequiredVal: Number.isFinite(Number(cfg.editPresaRequiredVal)) ? Number(cfg.editPresaRequiredVal) : 2
  }

  const watchFields = [
    'presa_in_carico_DT', 'dt_presa_in_carico_DT', 'stato_DT', 'dt_stato_DT', 'esito_DT', 'dt_esito_DT', 'note_DT',
    'presa_in_carico_DA', 'dt_presa_in_carico_DA', 'stato_DA', 'dt_stato_DA', 'esito_DA', 'dt_esito_DA', 'note_DA'
  ]

  const isCreatePage = cfg.enableCreateWithoutSelection === true
  const [editIntent, setEditIntent] = React.useState<EditIntentInfo | null>(null)
  const [editDs, setEditDs] = React.useState<any | null>(null)
  const [editRecordData, setEditRecordData] = React.useState<any | null>(null)
  const [selectionIntent, setSelectionIntent] = React.useState<EditIntentInfo | null>(null)

  React.useEffect(() => {
    if (isCreatePage) {
      setEditIntent(null)
      setEditDs(null)
      setEditRecordData(null)
      return
    }

    const syncIntent = () => {
      const fromStorage = readEditIntent()
      const fromWindow: any = (window as any).__giiEdit || null
      const fallback = fromWindow && fromWindow.oid != null && fromWindow.layerUrl
        ? { oid: Number(fromWindow.oid), layerUrl: String(fromWindow.layerUrl), idFieldName: String(fromWindow.idFieldName || 'OBJECTID'), data: fromWindow.data || null, ts: Number(fromWindow.ts || Date.now()) }
        : null
      const next = fromStorage || fallback || null
      if (next) {
        setEditIntent(next)
        clearEditIntent()
      }
    }

    syncIntent()
    const onIntent = () => { syncIntent() }
    window.addEventListener('gii-edit-intent-changed', onIntent as EventListener)
    window.addEventListener('focus', onIntent as EventListener)
    window.addEventListener('hashchange', onIntent as EventListener)
    document.addEventListener('visibilitychange', onIntent as EventListener)
    return () => {
      window.removeEventListener('gii-edit-intent-changed', onIntent as EventListener)
      window.removeEventListener('focus', onIntent as EventListener)
      window.removeEventListener('hashchange', onIntent as EventListener)
      document.removeEventListener('visibilitychange', onIntent as EventListener)
    }
  }, [isCreatePage])

  React.useEffect(() => {
    if (isCreatePage) {
      setSelectionIntent(null)
      return
    }
    const syncSel = () => {
      setSelectionIntent(selectionToIntent())
    }
    syncSel()
    window.addEventListener('gii-selection-changed', syncSel as EventListener)
    window.addEventListener('focus', syncSel as EventListener)
    return () => {
      window.removeEventListener('gii-selection-changed', syncSel as EventListener)
      window.removeEventListener('focus', syncSel as EventListener)
    }
  }, [isCreatePage])

  const effectiveIntent = !isCreatePage ? (editIntent || selectionIntent) : null

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!effectiveIntent || isCreatePage) {
        setEditDs(null)
        setEditRecordData(null)
        return
      }
      const dsProxy = await buildDynamicDsProxy(String(effectiveIntent.layerUrl || '').trim(), 'GII view dinamica')
      if (cancelled) return
      setEditDs(dsProxy)
      try {
        const fl: any = dsProxy?.layer || await dsProxy?.getLayer?.() || null
        if (fl && typeof fl.queryFeatures === 'function') {
          const where = `${effectiveIntent.idFieldName} = ${Number(effectiveIntent.oid)}`
          const res: any = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: true, num: 1 })
          const feat = res?.features?.[0] || null
          if (!cancelled) setEditRecordData(feat?.attributes ? { ...feat.attributes } : (effectiveIntent.data || null))
        } else if (!cancelled) {
          setEditRecordData(effectiveIntent.data || null)
        }
      } catch {
        if (!cancelled) setEditRecordData(effectiveIntent.data || null)
      }
    })().catch(() => {})
    return () => { cancelled = true }
  }, [effectiveIntent?.oid, effectiveIntent?.layerUrl, effectiveIntent?.idFieldName, isCreatePage])

  const activeGate = useDynamicActiveSelection(['*'], 'GII view dinamica', !isCreatePage && !!effectiveIntent)
  const [intentEditDs, setIntentEditDs] = React.useState<any | null>(null)
  React.useEffect(() => {
    let cancelled = false
    if (!effectiveIntent?.layerUrl) {
      setIntentEditDs(null)
      return
    }
    ;(async () => {
      const ds = await buildDynamicDsProxy(normalizeFeatureLayerUrl(effectiveIntent.layerUrl), 'GII view dinamica')
      if (!cancelled) setIntentEditDs(ds)
    })().catch(() => {
      if (!cancelled) setIntentEditDs(null)
    })
    return () => { cancelled = true }
  }, [effectiveIntent?.layerUrl])

  const mapWidgetId = Array.isArray(cfg.useMapWidgetIds) ? cfg.useMapWidgetIds[0] : null
  const [mapView, setMapView] = React.useState<any>(null)
  const [formTab, setFormTab] = React.useState<string>('anagrafica')
  const [clickedPointWgs84, setClickedPointWgs84] = React.useState<any | null>(null)
  const [existingGeomWgs84, setExistingGeomWgs84] = React.useState<any | null>(null)
  const [mapClickEnabled, setMapClickEnabled] = React.useState(false)
  const mapClickEnabledRef = React.useRef(false)
  React.useEffect(() => { mapClickEnabledRef.current = mapClickEnabled }, [mapClickEnabled])

  // Carica la geometria esistente quando si entra in edit mode
  React.useEffect(() => {
    if (isCreatePage) { setExistingGeomWgs84(null); return }
    if (!effectiveIntent?.oid || !effectiveIntent?.layerUrl) { setExistingGeomWgs84(null); return }
    let cancelled = false
    ;(async () => {
      try {
        const dsProxy = await buildDynamicDsProxy(String(effectiveIntent.layerUrl).trim(), 'GII geom loader')
        const fl: any = dsProxy?.layer || await dsProxy?.getLayer?.() || null
        if (!fl || typeof fl.queryFeatures !== 'function') return
        const where = `${effectiveIntent.idFieldName} = ${Number(effectiveIntent.oid)}`
        const res: any = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: true, num: 1 })
        const feat = res?.features?.[0]
        const geom = feat?.geometry || null
        if (cancelled) return

        // Calcola reqPoint dagli attributi: se 0, non caricare la geometria
        const attrs = feat?.attributes || {}
        const rp = computeReqPoint(attrs)

        if (rp !== 1) {
          setExistingGeomWgs84(null)
        } else if (geom) {
          const wgs = await toWgs84Point(geom)
          if (!cancelled) setExistingGeomWgs84(wgs)
        } else {
          // Fallback: se geometry è null ma gli attributi hanno coordinate
          const attrLat = Number(attrs.latitude ?? attrs.lat ?? attrs.y ?? 0)
          const attrLon = Number(attrs.longitude ?? attrs.lon ?? attrs.x ?? 0)
          if (attrLat !== 0 && attrLon !== 0) {
            if (!cancelled) setExistingGeomWgs84({ x: attrLon, y: attrLat })
          } else {
            setExistingGeomWgs84(null)
          }
        }
      } catch { if (!cancelled) setExistingGeomWgs84(null) }
    })()
    return () => { cancelled = true }
  }, [effectiveIntent?.oid, effectiveIntent?.layerUrl, effectiveIntent?.idFieldName, isCreatePage])
  React.useEffect(() => {
    const view: any = mapView
    if (!view || typeof view.on !== 'function') return
    const h = view.on('click', (e: any) => {
      if (!mapClickEnabledRef.current) return  // click sulla mappa ignorato se non abilitato
      ;(async () => {
        const pt = await toWgs84Point(e?.mapPoint)
        if (pt) {
          setClickedPointWgs84(pt)
          setMapClickEnabled(false)  // disabilita dopo il click
        }
      })().catch(() => {})
    })
    return () => { try { h?.remove?.() } catch {} }
  }, [mapView])

  // ── Marker visivo sulla mappa per il punto (cliccato o esistente) ──
  const markerGraphicRef = React.useRef<any>(null)
  const effectiveMarkerPoint = (() => {
    const ep = clickedPointWgs84 || existingGeomWgs84
    if (!ep || !isFiniteNum(ep.x) || !isFiniteNum(ep.y)) return null
    if (Number(ep.x) === 0 && Number(ep.y) === 0) return null  // (0,0) = nessuna localizzazione reale
    return ep
  })()
  React.useEffect(() => {
    const view: any = mapView
    if (!view) return

    // Rimuovi marker precedente
    try {
      if (markerGraphicRef.current && view.graphics) {
        view.graphics.remove(markerGraphicRef.current)
        markerGraphicRef.current = null
      }
    } catch { /* ignore */ }

    if (!effectiveMarkerPoint || !isFiniteNum(effectiveMarkerPoint.x) || !isFiniteNum(effectiveMarkerPoint.y)) return

    let cancelled = false
    ;(async () => {
      try {
        const [Graphic, Point] = await Promise.all([
          loadEsriModule<any>('esri/Graphic'),
          loadEsriModule<any>('esri/geometry/Point')
        ])
        if (cancelled) return
        const pt = new Point({ longitude: Number(effectiveMarkerPoint.x), latitude: Number(effectiveMarkerPoint.y), spatialReference: { wkid: 4326 } })
        const graphic = new Graphic({
          geometry: pt,
          symbol: {
            type: 'simple-marker',
            style: 'circle',
            color: [220, 38, 38, 200],       // rosso semitrasparente
            size: 10,
            outline: { color: [255, 255, 255, 255], width: 2.0 }
          }
        })
        if (cancelled) return
        view.graphics.add(graphic)
        markerGraphicRef.current = graphic
      } catch { /* ignore */ }
    })()

    return () => {
      cancelled = true
      try {
        if (markerGraphicRef.current && view?.graphics) {
          view.graphics.remove(markerGraphicRef.current)
          markerGraphicRef.current = null
        }
      } catch { /* ignore */ }
    }
  }, [mapView, effectiveMarkerPoint])

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  // Contatore che si incrementa ogni volta che il widget diventa visibile (= ingresso nella pagina ExB)
  const [pageVisitCount, setPageVisitCount] = React.useState(0)
  const wasVisibleRef = React.useRef(false)
  React.useEffect(() => {
    const check = () => {
      const el = rootRef.current
      const isVisible = !!(el && el.offsetWidth > 0 && el.offsetHeight > 0)
      if (isVisible && !wasVisibleRef.current) {
        setPageVisitCount(c => c + 1)
        // Reset punti ad ogni ingresso nella pagina
        setClickedPointWgs84(null)
        setMapClickEnabled(false)
        // Re-sync edit intent da sessionStorage (per il caso in cui l'evento viene perso perché il widget non era montato)
        if (!isCreatePage) {
          const fromStorage = readEditIntent()
          if (fromStorage) {
            setEditIntent(fromStorage)
            clearEditIntent()
          }
        }
        // Re-dispatch tab corrente per aggiornare lo stato attivo del nav orizzontale
        try {
          const currentTab = sessionStorage.getItem('GII_EDIT_TAB')
          if (currentTab) {
            window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: currentTab } }))
          }
        } catch {}
      }
      wasVisibleRef.current = isVisible
    }
    const id = setInterval(check, 300)
    check()
    return () => clearInterval(id)
  }, [])
  const [formDirty, setFormDirty] = React.useState(false)
  const uiLocked = formDirty
  const [createDs, setCreateDs] = React.useState<any | null>(null)
  React.useEffect(() => {
    const schemaUrl = String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()
    const schemaLabel = String(cfg.schemaLayerLabel || 'GII schema locale')
    const schemaFields = Array.isArray(cfg.schemaFields) ? cfg.schemaFields : []
    const ds = buildSchemaOnlyDsProxy({ url: schemaUrl, label: schemaLabel, schemaFields })
    setCreateDs(ds)
  }, [cfg.schemaLayerUrl, cfg.schemaLayerLabel, cfg.motherLayerUrl, JSON.stringify(cfg.schemaFields || [])])

  const editSelectionMatchesIntent = !!effectiveIntent && !!activeGate?.state && Number(activeGate.state.oid) === Number(effectiveIntent.oid) && String((activeGate.state.ds as any)?.getDataSourceJson?.()?.url || (activeGate.state.ds as any)?.dataSourceJson?.url || (activeGate.state.ds as any)?.layer?.url || '').trim() === String(effectiveIntent.layerUrl || '').trim()
  const inCreateMode = isCreatePage
  const currentEditDs = !inCreateMode ? ((editSelectionMatchesIntent ? activeGate?.state?.ds : null) || intentEditDs || editDs || null) : null
  const anyDs = inCreateMode ? createDs : currentEditDs
  const initialEditData = !inCreateMode ? (editRecordData || effectiveIntent?.data || activeGate?.state?.data || null) : null
  const editOid = !inCreateMode && effectiveIntent ? Number(effectiveIntent.oid) : null
  const editIdFieldName = !inCreateMode ? String(effectiveIntent?.idFieldName || activeGate?.state?.idFieldName || currentEditDs?.getIdField?.() || 'OBJECTID') : undefined

  const modeBg = inCreateMode
    ? String(cfg.modeBgCreate || defaultConfig.modeBgCreate)
    : String(cfg.modeBgEdit   || defaultConfig.modeBgEdit)

  // reqPoint calcolato dai dati del record corrente (per decidere se mostrare il punto in mappa)
  const editReqPoint = React.useMemo(() => {
    if (!initialEditData) return 0
    return computeReqPoint(initialEditData)
  }, [initialEditData])

  // ── Gestione mappa: featureEffect, zoom ──
  const mapFeatureLayerViewsRef = React.useRef<any[]>([])
  const mapFeatureLayerViewsKeyRef = React.useRef<string>('')
  const mapDefaultViewpointRef = React.useRef<any>(null)

  React.useEffect(() => {
    const view: any = mapView
    if (!view?.map) return

    // Se il widget è nascosto (altra pagina ExB), non toccare la mappa
    const el = rootRef.current
    if (!el || (el.offsetWidth === 0 && el.offsetHeight === 0)) return

    // Viewpoint di default: usa quello del Builder (initialViewProperties), fallback a view.viewpoint al primo accesso
    if (!mapDefaultViewpointRef.current) {
      const builderVp = view.map.initialViewProperties?.viewpoint
      mapDefaultViewpointRef.current = builderVp ? builderVp.clone() : (view.viewpoint ? view.viewpoint.clone() : null)
    }

    // Anti-lampeggio: al primo accesso nascondi il container mappa finché il featureEffect non è applicato
    const mapContainer = view.container as HTMLElement | null
    const needsBlind = !mapFeatureLayerViewsRef.current.length
    if (needsBlind && mapContainer) {
      mapContainer.style.opacity = '0'
      mapContainer.style.transition = 'none'
    }
    // Se c'è un layerView precedente, nascondi subito i punti su quello
    try {
      mapFeatureLayerViewsRef.current.forEach((lv: any) => {
        lv.featureEffect = { filter: { where: '1=0' }, excludedEffect: 'opacity(0)' }
      })
    } catch {}

    // Trova tutti i layer rapporti compatibili, dando priorità ai valori configurati nel setting.
    const rapportiLayers = findRapportiLayers(view, cfg)
    const rapportiLayersKey = rapportiLayers.map(getMapLayerRuntimeKey).join('||')
    const isEdit = !inCreateMode && editOid != null && Number.isFinite(editOid)
    const idField = editIdFieldName || 'OBJECTID'
    const resolveRapportiLayerViews = async (): Promise<any[]> => {
      if (mapFeatureLayerViewsKeyRef.current === rapportiLayersKey && mapFeatureLayerViewsRef.current.length > 0) {
        return mapFeatureLayerViewsRef.current
      }
      const settled = await Promise.all(rapportiLayers.map(async layer => {
        try { return await view.whenLayerView(layer) } catch { return null }
      }))
      const layerViews = settled.filter(Boolean)
      mapFeatureLayerViewsRef.current = layerViews
      mapFeatureLayerViewsKeyRef.current = rapportiLayersKey
      return layerViews
    }
    const queryRapportoFeature = async (): Promise<any | null> => {
      const layer = rapportiLayers.find((l: any) => typeof l?.queryFeatures === 'function')
      if (!layer) return null
      try {
        const res = await layer.queryFeatures({ where: `${idField} = ${editOid}`, returnGeometry: true, outFields: [idField], num: 1 })
        return res?.features?.[0] || null
      } catch {
        return null
      }
    }
    let cancelled = false
    const showMap = () => { if (needsBlind && mapContainer) mapContainer.style.opacity = '1' }

    // ── CREATE MODE ──
    if (!isEdit) {
      // Zoom al default del Builder
      if (mapDefaultViewpointRef.current) {
        view.goTo(mapDefaultViewpointRef.current, { duration: 400 }).catch(() => {})
      }

      if (rapportiLayers.length > 0) {
        ;(async () => {
          const layerViews = await resolveRapportiLayerViews()
          if (cancelled) { showMap(); return }
          layerViews.forEach((lv: any) => { lv.featureEffect = { filter: { where: '1=0' }, excludedEffect: 'opacity(0)' } })
          showMap()
        })()
      } else {
        showMap()
      }

      return () => { cancelled = true }
    }

    // ── EDIT MODE ──
    // Se reqPoint=0, zoom al default
    if (editReqPoint === 0 && mapDefaultViewpointRef.current) {
      view.goTo(mapDefaultViewpointRef.current, { duration: 400 }).catch(() => {})
    }

    if (rapportiLayers.length > 0) {
      ;(async () => {
        try {
          const layerViews = await resolveRapportiLayerViews()
          if (cancelled) { showMap(); return }

          // Una sola query sul primo layer compatibile: evita tentativi multipli e outFields pesanti.
          const feat = await queryRapportoFeature()
          if (!feat || cancelled) {
            layerViews.forEach((lv: any) => { lv.featureEffect = { filter: { where: '1=0' }, excludedEffect: 'opacity(0)' } })
            showMap()
            return
          }

          const g = feat.geometry
          const gx = g ? (g.x ?? g.longitude ?? 0) : 0
          const gy = g ? (g.y ?? g.latitude ?? 0) : 0
          const gValid = !!g && !(Number(gx) === 0 && Number(gy) === 0)

          // Costruisci targetGeom: geometry reale oppure fallback da dati già caricati del record.
          let targetGeom: any = gValid ? g : null
          if (!targetGeom && initialEditData) {
            const attrLat = Number((initialEditData as any).latitude ?? (initialEditData as any).lat ?? (initialEditData as any).y ?? 0)
            const attrLon = Number((initialEditData as any).longitude ?? (initialEditData as any).lon ?? (initialEditData as any).x ?? 0)
            if (attrLat !== 0 && attrLon !== 0) {
              targetGeom = { type: 'point', longitude: attrLon, latitude: attrLat, spatialReference: { wkid: 4326 } }
            }
          }

          if (targetGeom && editReqPoint === 1) {
            layerViews.forEach((lv: any) => { lv.featureEffect = { filter: { where: `${idField} = ${editOid}` }, excludedEffect: 'opacity(0)' } })
            view.goTo({ target: targetGeom, zoom: Math.max(view.zoom || 15, 15) }, { duration: 600 }).catch(() => {})
          } else {
            layerViews.forEach((lv: any) => { lv.featureEffect = { filter: { where: '1=0' }, excludedEffect: 'opacity(0)' } })
          }
        } catch {}
        showMap()
      })()
    } else {
      showMap()
    }

    return () => { cancelled = true }
  }, [mapView, editOid, editIdFieldName, inCreateMode, editReqPoint, pageVisitCount, cfg.mapLayerId, cfg.mapLayerUrl, cfg.mapLayerLayerId, cfg.mapLayerTitle])

  return (
    <div ref={rootRef} data-gii-editing-root='1' style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', padding: Number.isFinite(Number((cfg as any).maskOuterOffset ?? 0)) ? Number((cfg as any).maskOuterOffset) : 0, position: 'relative', zIndex: uiLocked ? 1001 : 'auto', background: modeBg, transition: 'background 0.3s' }}>
      {/* Mappa esterna ExB (fallback legacy) — nascosta, solo per agganciare la view */}
      {mapWidgetId && (
        <div style={{ display: 'none' }}>
          <JimuMapViewComponent
            useMapWidgetId={mapWidgetId}
            onActiveViewChange={(jmv: JimuMapView) => { setMapView(jmv?.view || null) }}
          />
        </div>
      )}

      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'row', minHeight: 0 }}>
        {/* Form */}
        <div style={{ flex: '1 1 100%', minHeight: 0, overflow: formTab === 'anteprima' ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', transition: 'flex 0.25s' }}>
          {anyDs ? (
            <NuovaPraticaForm
              ds={anyDs}
              cfg={cfg}
              showDatiGenerali={showDatiGenerali}
              clickedPointWgs84={clickedPointWgs84}
              existingGeomWgs84={existingGeomWgs84}
              onClearPoint={() => setClickedPointWgs84(null)}
              onGeomSaved={(geom: any) => { setExistingGeomWgs84(geom); setClickedPointWgs84(null) }}
              mapClickEnabled={mapClickEnabled}
              onToggleMapClick={(on: boolean) => setMapClickEnabled(on)}
              mode={inCreateMode ? 'create' : 'edit'}
              initialData={initialEditData}
              editOid={editOid}
              editIdFieldName={editIdFieldName}
              editLayerUrl={!inCreateMode ? ensureLayerIndex(normalizeFeatureLayerUrl(effectiveIntent?.layerUrl || activeGate?.state?.layerUrl || readDynamicSelection().layerUrl || '')) : ''}
              titleText={inCreateMode ? 'Nuovo rapporto' : 'Modifica rapporto'}
              saveText={'Salva'}
              onDirtyChange={(dirty: boolean) => setFormDirty(dirty)}
              onTabChange={(tab: string) => setFormTab(tab)}
              onSaved={(savedOid: number, savedData?: any) => {
                if (inCreateMode) {
                  setClickedPointWgs84(null)
                  return
                }
                const nextLayerUrl = ensureLayerIndex(normalizeFeatureLayerUrl((anyDs as any)?.layer?.url || (anyDs as any)?.url || effectiveIntent?.layerUrl || readDynamicSelection().layerUrl || ''), (anyDs as any)?.layer)
                const nextIdFieldName = editIdFieldName || anyDs?.getIdField?.() || 'OBJECTID'
                const nextData = savedData || editRecordData || effectiveIntent?.data || activeGate?.state?.data || null
                const nextIntentObj: EditIntentInfo = { oid: savedOid, layerUrl: nextLayerUrl, idFieldName: nextIdFieldName, data: nextData, ts: Date.now() }
                setEditRecordData(nextData)
                setEditIntent(nextIntentObj)
                setSelectionIntent(nextIntentObj)
                try { ;(window as any).__giiEdit = nextIntentObj } catch {}
                writeEditIntent(nextIntentObj)
                if (nextData && typeof nextData === 'object') {
                  writeSelectedFeatureCache(nextLayerUrl, savedOid, nextIdFieldName, nextData, 'edit')
                }
                invalidateRuntimeProxyCache(nextLayerUrl)
                writeDynamicSelection({ oid: savedOid, layerUrl: nextLayerUrl, idFieldName: nextIdFieldName, data: nextData })
                try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: savedOid, layerUrl: nextLayerUrl } })) } catch {}
              }}
            />
          ) : (
            <div style={{ padding: 12 }}>{!inCreateMode ? "Record di modifica non disponibile: torna all'elenco e riapri Modifica." : 'Datasource dinamica non pronta: configura il layer schema oppure seleziona una pratica.'}</div>
          )}
        </div>

      </div>
      <DirtyNavigationLockOverlay active={formDirty} targetRef={rootRef} />
    </div>
  )
}

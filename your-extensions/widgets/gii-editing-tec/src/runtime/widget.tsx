/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, DataSourceManager, UrlManager, getAppStore } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import { createPortal } from 'react-dom'
import type { IMConfig, TabConfig } from '../config'
import { defaultConfig, DEFAULT_FIELD_LAYOUTS } from '../config'
import AnteprimaPanel, { clearGiiAnteprimaDocumentMemory } from '../../../_shared/gii-anteprime/anteprima-panel'
import { NORMA3_REQ_POINT, parseNorma3Codes, computeReqPoint } from '../../../_shared/gii-anteprime/req-point'
import GiiAttachmentViewer, { type GiiAttachmentViewerItem, filterGiiAttachmentsForTechnicalRoles } from '../../../_shared/gii-anteprime/allegati/gii-attachment-viewer'
import { getGiiPracticeContextStamp, isGiiPracticeContextStampCurrent, isGiiPracticePayloadCurrent, isGiiPracticeSelectionContextCurrent, stampGiiPracticePayload, writeGiiPracticeSelectionContext, type GiiPracticeContextStamp } from '../../../_shared/gii-selection/practice-context'

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




type RegolamentoArticolo = {
  codice_articolo: string
  numero_articolo: any
  titolo_articolo: string
  testo_articolo: string
  atto_regolamento: string
  anno_riferimento: any
  data_validita_da: any
  data_validita_a: any
  attivo: any
  note: string
}

type RegolamentoArticoliState = {
  loading: boolean
  error: string
  urlsReady: boolean
  byKey: Map<string, RegolamentoArticolo>
}

function normalizeLookupTableUrl (raw: any): string {
  return ensureLayerIndex(normalizeFeatureLayerUrl(raw))
}

function normalizeRegolamentoArticleKey (raw: any): string {
  const s = String(raw ?? '').trim().toUpperCase()
  if (!s) return ''
  const m = s.match(/(?:ART(?:ICOLO)?\.?\s*)?0*(\d{1,2})(?:\.\d+)?/i)
  return m ? `ART${Number(m[1])}` : s.replace(/[\s._-]+/g, '')
}

function normalizeRegolamentoArticleNumber (raw: any): string {
  const m = String(raw ?? '').match(/(\d{1,2})(?:\.\d+)?/)
  return m ? String(Number(m[1])) : ''
}

function formatRegolamentoArticleCode (raw: any): string {
  const key = normalizeRegolamentoArticleKey(raw)
  const m = key.match(/^ART(\d+)$/)
  return m ? `Art. ${Number(m[1])}` : String(raw || '').trim().toUpperCase()
}

function normalizeRegolamentoArticle (row: any): RegolamentoArticolo {
  return {
    codice_articolo: String(pickAttrCI(row, ['codice_articolo']) || '').trim().toUpperCase(),
    numero_articolo: pickAttrCI(row, ['numero_articolo']),
    titolo_articolo: String(pickAttrCI(row, ['titolo_articolo']) || '').trim(),
    testo_articolo: String(pickAttrCI(row, ['testo_articolo']) || '').trim(),
    atto_regolamento: String(pickAttrCI(row, ['atto_regolamento']) || '').trim(),
    anno_riferimento: pickAttrCI(row, ['anno_riferimento']),
    data_validita_da: pickAttrCI(row, ['data_validita_da']),
    data_validita_a: pickAttrCI(row, ['data_validita_a']),
    attivo: pickAttrCI(row, ['attivo']),
    note: String(pickAttrCI(row, ['note']) || '').trim()
  }
}

function dateMsForRegolamento (v: any): number | null {
  if (v == null || v === '') return null
  try {
    const n = Number(v)
    const d = Number.isFinite(n) && n > 0 ? new Date(n) : new Date(String(v))
    return Number.isNaN(d.getTime()) ? null : d.getTime()
  } catch {
    return null
  }
}

function isRegolamentoArticleUsable (article: RegolamentoArticolo, refMs = Date.now()): boolean {
  const key = normalizeRegolamentoArticleKey(article.codice_articolo || article.numero_articolo)
  if (!key) return false
  const attivo = String(article.attivo ?? '').trim().toLowerCase()
  if (attivo && !['1', 'true', 'sì', 'si', 'yes'].includes(attivo)) return false
  const from = dateMsForRegolamento(article.data_validita_da)
  const to = dateMsForRegolamento(article.data_validita_a)
  if (from != null && from > refMs) return false
  if (to != null && to < refMs) return false
  return true
}

function buildRegolamentoArticleMap (articles: RegolamentoArticolo[]): Map<string, RegolamentoArticolo> {
  const map = new Map<string, RegolamentoArticolo>()
  ;(articles || []).forEach(article => {
    const keys = [article.codice_articolo, article.numero_articolo, normalizeRegolamentoArticleNumber(article.numero_articolo)]
      .map(normalizeRegolamentoArticleKey)
      .filter(Boolean)
    keys.forEach(key => { if (!map.has(key)) map.set(key, article) })
  })
  return map
}

function getRegolamentoArticle (state: RegolamentoArticoliState, code: any): RegolamentoArticolo | null {
  const key = normalizeRegolamentoArticleKey(code)
  return key ? (state.byKey.get(key) || null) : null
}

function resolveRegolamentoArticoliUrl (cfg: any): string {
  // Ogni istanza del widget deve usare esclusivamente la propria configurazione.
  // Non recuperare l'URL da altri widget dell'app: una seconda istanza o il widget
  // amministrativo potrebbero conservare un riferimento obsoleto e sovrascrivere
  // di fatto la configurazione corretta dell'istanza corrente.
  return normalizeLookupTableUrl(
    cfg?.regolamentoArticoliUrl ||
    cfg?.regolamentoIrriguoArticoliUrl ||
    cfg?.regolamentoArticoliLayerUrl ||
    ''
  )
}

function useRegolamentoArticoliState (cfg: any): RegolamentoArticoliState {
  const articoliUrl = React.useMemo(
    () => resolveRegolamentoArticoliUrl(cfg || {}),
    [cfg?.regolamentoArticoliUrl, cfg?.regolamentoIrriguoArticoliUrl, cfg?.regolamentoArticoliLayerUrl]
  )
  const [state, setState] = React.useState<RegolamentoArticoliState>({ loading: false, error: '', urlsReady: !!articoliUrl, byKey: new Map() })

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!articoliUrl) {
        setState({ loading: false, error: '', urlsReady: false, byKey: new Map() })
        return
      }
      setState({ loading: true, error: '', urlsReady: true, byKey: new Map() })
      try {
        const rows = await queryTableAttributes(articoliUrl, '1=1', 'numero_articolo ASC')
        const refMs = Date.now()
        const articles = rows.map(normalizeRegolamentoArticle).filter(a => isRegolamentoArticleUsable(a, refMs))
        if (!cancelled) setState({ loading: false, error: '', urlsReady: true, byKey: buildRegolamentoArticleMap(articles) })
      } catch (e: any) {
        if (!cancelled) setState({ loading: false, error: e?.message || String(e), urlsReady: true, byKey: new Map() })
      }
    }
    load()
    return () => { cancelled = true }
  }, [articoliUrl])

  return state
}

function getRequestedEditSection (opts?: { skipUrl?: boolean }): 'dati_generali' | 'trasgressore' | 'violazione' | 'dati_tecnici' | 'nota_spese' | 'allegati' | 'anteprima' | null {
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
  const mapSection = (raw: any): 'dati_generali' | 'trasgressore' | 'violazione' | 'dati_tecnici' | 'nota_spese' | 'allegati' | 'anteprima' | null => {
    switch (normalize(raw)) {
      case 'dati-generali': return 'dati_generali'
      case 'trasgressore': return 'trasgressore'
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

const VALID_EDIT_SECTIONS = new Set(['dati_generali', 'trasgressore', 'violazione', 'dati_tecnici', 'nota_spese', 'allegati', 'anteprima'])
function isValidEditSection (raw: any): boolean {
  return VALID_EDIT_SECTIONS.has(String(raw || '').trim())
}

function resetInvalidEditSectionStorage (fallback: string = 'trasgressore'): string {
  const next = isValidEditSection(fallback) ? fallback : 'trasgressore'
  try {
    const current = window.sessionStorage.getItem('GII_EDIT_TAB')
    if (!isValidEditSection(current)) window.sessionStorage.setItem('GII_EDIT_TAB', next)
  } catch {}
  return next
}

function getStoredValidEditSection (): string | null {
  try {
    const current = window.sessionStorage.getItem('GII_EDIT_TAB')
    return isValidEditSection(current) ? String(current) : null
  } catch {
    return null
  }
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

function isExperienceBuilderDesignMode (): boolean {
  const isBuilderUrl = (raw: any): boolean => {
    const s = String(raw || '').toLowerCase()
    return /\/builder(?:[/?#]|$)/.test(s) ||
      s.includes('/experiencebuilder/builder') ||
      s.includes('mode=builder') ||
      s.includes('appmode=builder') ||
      s.includes('jimu-builder')
  }

  try {
    if (typeof window !== 'undefined') {
      if (isBuilderUrl(window.location?.href)) return true
      const topWin = (window as any).top
      if (topWin && topWin !== window && isBuilderUrl(topWin.location?.href)) return true
    }
  } catch {}

  try {
    const st: any = getAppStore?.().getState?.() || {}
    if (st?.appStateInBuilder) return true
    if (st?.builderState || st?.widgetsRuntimeInfoInBuilder) return true
    const appMode = String(st?.appRuntimeInfo?.appMode || st?.appContext?.appMode || st?.appMode || '').toLowerCase()
    if (appMode.includes('builder') || appMode.includes('design')) return true
  } catch {}

  try {
    const doc = (window as any)?.top?.document || document
    const body = doc?.body
    const classes = body?.classList ? Array.from(body.classList).join(' ').toLowerCase() : ''
    if (classes.includes('builder') || classes.includes('jimu-builder')) return true
    if (doc?.querySelector?.('[data-testid="builder"], .builder-header, .jimu-builder')) return true
  } catch {}

  return false
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
    if (!active || isExperienceBuilderDesignMode()) { setRects([]); return }
    const host = getGlobalOverlayHost()
    if (!host) { setRects([]); return }
    const doc = host.ownerDocument || document
    const win = doc.defaultView || window
    const viewW = Math.max(0, win.innerWidth || doc.documentElement?.clientWidth || 0)
    const viewH = Math.max(0, win.innerHeight || doc.documentElement?.clientHeight || 0)

    // La maschera non dipende più da un'area libera calcolata a pixel.
    // Oscura solo gli elementi che devono essere bloccati:
    // - header GII;
    // - navigazione sinistra principale delle pagine Nuova/Modifica pratica.
    // Il pulsante della barra laterale resta libero perché non oscuriamo il widget sidebar,
    // ma solo il widget gii-nav contenuto nel suo primo pannello.
    const idsToMask = [
      'widget_840',  // GII Header
      'widget_1319', // GII Navigazione - Nuova pratica
      'widget_1371'  // GII Navigazione - Modifica pratica
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
    if (!active || isExperienceBuilderDesignMode()) { setRects([]); return }
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


  if (!active || isExperienceBuilderDesignMode() || rects.length === 0) return null

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

function SpotlightInteractionLockOverlay (props: { active: boolean; targetRef: React.RefObject<HTMLElement | null> }) {
  const { active, targetRef } = props
  const [rect, setRect] = React.useState<GiiLockRect | null>(null)

  const computeRect = React.useCallback(() => {
    if (!active || isExperienceBuilderDesignMode()) { setRect(null); return }
    const host = getGlobalOverlayHost()
    const target = targetRef.current
    if (!host || !target || !target.isConnected) { setRect(null); return }
    const doc = host.ownerDocument || document
    const win = doc.defaultView || window
    const viewW = Math.max(0, win.innerWidth || doc.documentElement?.clientWidth || 0)
    const viewH = Math.max(0, win.innerHeight || doc.documentElement?.clientHeight || 0)
    try {
      const r = target.getBoundingClientRect()
      const pad = 4
      const left = Math.max(0, Math.floor(r.left) - pad)
      const top = Math.max(0, Math.floor(r.top) - pad)
      const right = Math.min(viewW, Math.ceil(r.right) + pad)
      const bottom = Math.min(viewH, Math.ceil(r.bottom) + pad)
      if (right <= left || bottom <= top) { setRect(null); return }
      setRect({ key: 'spotlight-target', left, top, width: right - left, height: bottom - top })
    } catch { setRect(null) }
  }, [active, targetRef])

  React.useEffect(() => {
    if (!active || isExperienceBuilderDesignMode()) { setRect(null); return }
    const host = getGlobalOverlayHost()
    const doc = host?.ownerDocument || document
    const win = doc.defaultView || window
    let raf = 0
    const schedule = () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { raf = win.requestAnimationFrame(computeRect) } catch { computeRect() }
    }
    schedule()
    let ro: ResizeObserver | null = null
    try {
      if (typeof ResizeObserver !== 'undefined' && targetRef.current) {
        ro = new ResizeObserver(schedule)
        ro.observe(targetRef.current)
      }
    } catch { ro = null }
    win.addEventListener('resize', schedule, true)
    win.addEventListener('scroll', schedule, true)
    const id = win.setInterval(schedule, 250)
    return () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { ro?.disconnect() } catch {}
      try { win.removeEventListener('resize', schedule, true) } catch {}
      try { win.removeEventListener('scroll', schedule, true) } catch {}
      try { win.clearInterval(id) } catch {}
    }
  }, [active, computeRect, targetRef])

  if (!active || isExperienceBuilderDesignMode() || !rect) return null
  const host = getGlobalOverlayHost()
  if (!host) return null
  const doc = host.ownerDocument || document
  const win = doc.defaultView || window
  const viewW = Math.max(0, win.innerWidth || doc.documentElement?.clientWidth || 0)
  const viewH = Math.max(0, win.innerHeight || doc.documentElement?.clientHeight || 0)
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  const stop = (e: any) => {
    try { e.preventDefault() } catch {}
    try { e.stopPropagation() } catch {}
  }
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 2147483200,
    background: 'rgba(0,0,0,0.58)',
    pointerEvents: 'auto',
    touchAction: 'none'
  }
  const masks: React.ReactNode[] = []
  if (rect.top > 0) masks.push(<div key='top' style={{ ...base, left: 0, top: 0, width: viewW, height: rect.top }} onPointerDown={stop} onMouseDown={stop} onClick={stop} onDoubleClick={stop} onWheel={stop} onTouchStart={stop} />)
  if (rect.left > 0) masks.push(<div key='left' style={{ ...base, left: 0, top: rect.top, width: rect.left, height: rect.height }} onPointerDown={stop} onMouseDown={stop} onClick={stop} onDoubleClick={stop} onWheel={stop} onTouchStart={stop} />)
  if (right < viewW) masks.push(<div key='right' style={{ ...base, left: right, top: rect.top, width: viewW - right, height: rect.height }} onPointerDown={stop} onMouseDown={stop} onClick={stop} onDoubleClick={stop} onWheel={stop} onTouchStart={stop} />)
  if (bottom < viewH) masks.push(<div key='bottom' style={{ ...base, left: 0, top: bottom, width: viewW, height: viewH - bottom }} onPointerDown={stop} onMouseDown={stop} onClick={stop} onDoubleClick={stop} onWheel={stop} onTouchStart={stop} />)
  return createPortal(<>{masks}</>, host)
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

async function updateFeatureAttachmentOnFeature (ds: any, oid: number, attachmentId: number, file: File, preferredUrl?: string | null): Promise<void> {
  if (!oid || !Number.isFinite(Number(attachmentId)) || Number(attachmentId) <= 0 || !file) return
  const layer = await resolveFeatureLayerForAttachments(ds, preferredUrl)
  if (!layer && !preferredUrl) throw new Error('Non riesco a risalire al FeatureLayer per aggiornare l’allegato.')

  const oidField = getAttachmentOidFieldName(layer, ds)
  const featureRef = { attributes: { [oidField]: oid } }
  const layerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(preferredUrl) || normalizeFeatureLayerUrl(layer?.url), layer)
  let token = ''
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(layerUrl) || IdentityManager?.findCredential?.(layerUrl.replace(/\/\d+$/, ''))
    token = cred?.token ? String(cred.token) : ''
  } catch {}

  if (layer && typeof layer.updateAttachment === 'function') {
    try {
      const res = await layer.updateAttachment(featureRef, Number(attachmentId), file)
      const err = (res as any)?.error
      if (!err) return
      throw new Error(String(err?.message || err))
    } catch {
      // fallback REST sotto
    }
  }

  if (layerUrl) {
    const fd = new FormData()
    fd.append('f', 'json')
    fd.append('attachmentId', String(Number(attachmentId)))
    fd.append('attachment', file)
    if (token) fd.append('token', token)
    const res = await fetch(`${layerUrl}/${oid}/updateAttachment`, { method: 'POST', body: fd })
    const j = await res.json().catch(() => ({}))
    const updRes = j?.updateAttachmentResult || j
    const err = updRes?.error || j?.error
    if (!res.ok || err || updRes?.success === false) {
      const msg = err?.message || `HTTP ${res.status}`
      throw new Error(String(msg))
    }
    return
  }

  throw new Error('URL del FeatureLayer non disponibile per aggiornare l’allegato.')
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

async function fetchAttachmentBlobForEdit (att: any, oid: number, preferredUrl?: string | null): Promise<Blob> {
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
  if (!resp.ok) throw new Error(`Lettura allegato fallita (HTTP ${resp.status}).`)
  return await resp.blob()
}

function canvasToBlobForEdit (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Rotazione immagine non riuscita.'))
      }, type, quality)
    } catch (ex) {
      reject(ex)
    }
  })
}

async function rotateImageAttachmentFile (blob: Blob, fileName: string, rotationDeg: number): Promise<File> {
  const contentType = String(blob.type || '').toLowerCase()
  const lowerName = String(fileName || '').toLowerCase()
  const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)$/i.test(lowerName)
  const isPng = contentType.includes('png') || /\.png$/i.test(lowerName)
  if (!isJpeg && !isPng) throw new Error('La rotazione è disponibile solo per immagini JPEG o PNG.')
  if (typeof document === 'undefined') throw new Error('Rotazione immagine non disponibile in questo ambiente.')

  let source: any = null
  let sourceUrl = ''
  let closeSource = () => {}
  try {
    const createBitmap = (window as any)?.createImageBitmap
    if (typeof createBitmap === 'function') {
      source = await createBitmap(blob, { imageOrientation: 'from-image' }).catch((): null => null)
      if (source) closeSource = () => { try { source.close?.() } catch {} }
    }
    if (!source) {
      sourceUrl = URL.createObjectURL(blob)
      source = await new Promise<HTMLImageElement | null>(resolve => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = sourceUrl
      })
      closeSource = () => { try { if (sourceUrl) URL.revokeObjectURL(sourceUrl) } catch {} }
    }
    if (!source) throw new Error('Immagine non leggibile.')

    const srcW = Math.max(1, Math.round(Number(source.width || source.naturalWidth) || 0))
    const srcH = Math.max(1, Math.round(Number(source.height || source.naturalHeight) || 0))
    if (!srcW || !srcH) throw new Error('Dimensioni immagine non valide.')

    const normalizedRotation = ((Math.round(rotationDeg / 90) * 90) % 360 + 360) % 360
    if (normalizedRotation === 0) {
      return new File([blob], fileName || `allegato.${isJpeg ? 'jpg' : 'png'}`, { type: isJpeg ? 'image/jpeg' : 'image/png' })
    }

    const canvas = document.createElement('canvas')
    const swap = normalizedRotation === 90 || normalizedRotation === 270
    canvas.width = swap ? srcH : srcW
    canvas.height = swap ? srcW : srcH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Rotazione immagine non disponibile.')
    if (normalizedRotation === 90) {
      ctx.translate(canvas.width, 0)
      ctx.rotate(Math.PI / 2)
    } else if (normalizedRotation === 180) {
      ctx.translate(canvas.width, canvas.height)
      ctx.rotate(Math.PI)
    } else if (normalizedRotation === 270) {
      ctx.translate(0, canvas.height)
      ctx.rotate(-Math.PI / 2)
    }
    ctx.drawImage(source, 0, 0, srcW, srcH)

    const outType = isJpeg ? 'image/jpeg' : 'image/png'
    const rotatedBlob = await canvasToBlobForEdit(canvas, outType, isJpeg ? 0.92 : undefined)
    return new File([rotatedBlob], fileName || `allegato_ruotato.${isJpeg ? 'jpg' : 'png'}`, { type: outType })
  } finally {
    closeSource()
  }
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


// Survey (XLS) — req_point: logica centralizzata, vedi _shared/gii-anteprime/req-point.ts

function normalizeNorma3Value (val: any): string {
  return parseNorma3Codes(val).join(' ')
}

function normalizeRoleCode (v: any): 'TR' | 'IT' | 'CS' | 'RIT' | 'DT' | 'DA' | 'ADMIN' | '' {
  const s = String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (!s) return ''
  // Questo widget è tecnico: i ruoli amministrativi non devono mai ricadere nei match generici IT/RIT.
  if (s === 'IA' || s === 'RIA') return ''
  if (s === 'TR' || s === 'TECNICO_RILEVATORE') return 'TR'
  if (s === 'IT' || s === 'ISTRUTTORE_TECNICO') return 'IT'
  if (s === 'CS' || s === 'CAPO_SETTORE') return 'CS'
  if (s === 'RIT' || s === 'RESPONSABILE_ISTRUTTORIA_TECNICA') return 'RIT'
  if (s === 'DT' || s === 'DIRETTORE_TECNICO') return 'DT'
  if (s === 'DA' || s === 'DIRETTORE_AMMINISTRATIVO') return 'DA'
  if (s === 'ADMIN' || s === 'AMMINISTRATORE') return 'ADMIN'
  return ''
}

function normalizeAreaCode (v: any): 'AGR' | 'TEC' | 'AMM' | '' {
  const s = String(v ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === '2' || s === 'AGR' || s === 'AGRARIA' || s === 'AGRICOLA' || s === 'AGRICOLTURA') return 'AGR'
  if (s === '3' || s === 'TEC' || s === 'TECNICA' || s === 'TECNICO') return 'TEC'
  if (s === '1' || s === 'AMM' || s === 'AMMINISTRATIVA' || s === 'AMMINISTRAZIONE' || s.includes('AFFARI GENERALI')) return 'AMM'
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
    if (s === 'DS' || s === 'D S' || s.includes('DRENO')) return 'DS'
  }
  if (area === 'AMM') {
    if (s === 'CR' || s === 'C R' || s.includes('CATASTO')) return 'CR'
    if (s === 'ALL' || s === 'TUTTI' || s === 'TUTTE') return 'ALL'
  }
  if (s === 'GI' || s.includes('GESTIONE IRRIGUA')) return 'GI'
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

function readSelectedOperationalRole (): string {
  try {
    const w: any = window as any
    const fromMemory = normalizeRoleCode(w.__giiSelection?.operationalRole)
    if (fromMemory) return fromMemory
    const fromStorage = normalizeRoleCode(sessionStorage.getItem('GII_SELECTED_OPERATIONAL_ROLE'))
    if (fromStorage) return fromStorage
  } catch {}
  return ''
}

function readGiiUserContext (useOperationalRole = false): { username: string, role: string, area: string, settore: string, areaRaw: any, settoreRaw: any, ufficio: number | null, ufficioLabel: string, gruppo: string } {
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

  const roleRaw = firstMeaningfulValue(
    roleObj.profiloCod, roleObj.profilo_cod,
    roleObj.ruoloCod, roleObj.ruolo_cod, roleObj.ruoloCode,
    userObj.profiloCod, userObj.profilo_cod,
    userObj.ruoloCod, userObj.ruolo_cod, userObj.ruoloCode,
    w.__giiRuoloCod, w.__giiRoleCode
  )
  const profileRole = normalizeRoleCode(roleRaw) || String(roleRaw || '').trim()
  const operationalRole = useOperationalRole ? readSelectedOperationalRole() : ''
  const role = operationalRole || profileRole

  const areaRaw = firstMeaningfulValue(
    roleObj.areaCod, roleObj.area_cod, roleObj.areaCode,
    userObj.areaCod, userObj.area_cod, userObj.areaCode,
    w.__giiAreaCod, w.__giiAreaCode,
    roleObj.area, userObj.area,
    areaObj.cod, areaObj.code, areaObj.name,
    w.__giiAreaLabel,
    roleObj.areaLabel, userObj.areaLabel, areaObj.label,
    typeof areaObj === 'string' ? areaObj : undefined
  )
  const area = normalizeAreaCode(areaRaw)

  const settoreRawPrimary = firstMeaningfulValue(
    roleObj.settoreCod, roleObj.settore_cod, roleObj.settoreCode,
    userObj.settoreCod, userObj.settore_cod, userObj.settoreCode,
    w.__giiSettoreCod, w.__giiSettoreCode, w.__giiSectorCode,
    roleObj.settore, userObj.settore,
    settoreObj.cod, settoreObj.code, settoreObj.name,
    w.__giiSettoreLabel, w.__giiSectorLabel,
    roleObj.settoreLabel, userObj.settoreLabel, settoreObj.label,
    typeof settoreObj === 'string' ? settoreObj : undefined
  )
  const settoreFromPrimary = normalizeSettoreCode(area, settoreRawPrimary)
  const settore = settoreFromPrimary
  const settoreRaw = settoreFromPrimary || settoreRawPrimary

  const ufficio = normalizeIntOrNull(firstMeaningfulValue(
    roleObj.ufficio, roleObj.id_ufficio, roleObj.ufficio_id,
    userObj.ufficio, userObj.id_ufficio, userObj.ufficio_id
  ))
  const ufficioLabel = String(firstMeaningfulValue(
    roleObj.ufficioLabel, roleObj.ufficio_label, roleObj.ufficioZona, roleObj.ufficio_zona,
    userObj.ufficioLabel, userObj.ufficio_label, userObj.ufficioZona, userObj.ufficio_zona
  ) || '').trim()
  const gruppo = String(firstMeaningfulValue(roleObj.gruppo, userObj.gruppo) || '').trim()

  return { username, role, area, settore, areaRaw, settoreRaw, ufficio, ufficioLabel, gruppo }
}

type GiiUserContext = ReturnType<typeof readGiiUserContext>

type CreateItAssignment = {
  key: string
  area: string
  areaFull: string
  settore: string
  settoreFull: string
  ufficio: number | null
  ufficioLabel: string
  gruppo: string
}

function readCreateItAssignments (): CreateItAssignment[] {
  try {
    const cached: any = (window as any).__giiUserRole || {}
    const rawAssignments = Array.isArray(cached.assignments) && cached.assignments.length
      ? cached.assignments
      : [cached]
    const out: CreateItAssignment[] = []
    const seen = new Set<string>()

    for (const assignment of rawAssignments) {
      const role = normalizeRoleCode(firstMeaningfulValue(
        assignment?.profiloCod, assignment?.profilo_cod,
        assignment?.ruoloCod, assignment?.ruolo_cod
      ))
      if (role !== 'IT') continue

      const area = normalizeAreaCode(firstMeaningfulValue(assignment?.areaCod, assignment?.area_cod, assignment?.area))
      const settore = normalizeSettoreCode(area, firstMeaningfulValue(assignment?.settoreCod, assignment?.settore_cod, assignment?.settore))
      if (!area || !settore) continue

      const ufficio = normalizeIntOrNull(firstMeaningfulValue(assignment?.ufficio, assignment?.id_ufficio, assignment?.ufficio_id))
      const ufficioLabel = String(firstMeaningfulValue(
        assignment?.ufficioLabel, assignment?.ufficio_label, assignment?.ufficioZona, assignment?.ufficio_zona
      ) || '').trim()
      const gruppo = String(assignment?.gruppo || '').trim()
      const areaFull = String(firstMeaningfulValue(assignment?.areaFull, assignment?.area_full, area) || area).trim()
      const settoreFull = String(firstMeaningfulValue(assignment?.settoreFull, assignment?.settore_full, settore) || settore).trim()
      const key = [area, settore, ufficio ?? '', gruppo].join('|')
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ key, area, areaFull, settore, settoreFull, ufficio, ufficioLabel, gruppo })
    }

    return out.sort((a, b) => {
      const byArea = a.area.localeCompare(b.area)
      if (byArea) return byArea
      const bySector = a.settore.localeCompare(b.settore, undefined, { numeric: true })
      if (bySector) return bySector
      return String(a.ufficioLabel || '').localeCompare(String(b.ufficioLabel || ''))
    })
  } catch {
    return []
  }
}

function createItAssignmentsIdentityKey (items: CreateItAssignment[]): string {
  return (items || []).map(item => item.key).join('||')
}

function useReactiveCreateItAssignments (): CreateItAssignment[] {
  const [items, setItems] = React.useState<CreateItAssignment[]>(() => readCreateItAssignments())
  React.useEffect(() => {
    const refresh = () => {
      const next = readCreateItAssignments()
      setItems(prev => createItAssignmentsIdentityKey(prev) === createItAssignmentsIdentityKey(next) ? prev : next)
    }
    refresh()
    window.addEventListener('gii:userLoaded', refresh)
    window.addEventListener('gii-practice-context-reset', refresh)
    return () => {
      window.removeEventListener('gii:userLoaded', refresh)
      window.removeEventListener('gii-practice-context-reset', refresh)
    }
  }, [])
  return items
}

function giiUserContextIdentityKey (ctx: GiiUserContext): string {
  return [
    String(ctx?.username || '').trim().toLowerCase(),
    String(normalizeRoleCode(ctx?.role) || ctx?.role || '').trim().toUpperCase(),
    String(ctx?.area || '').trim().toUpperCase(),
    String(ctx?.settore || '').trim().toUpperCase(),
    String(ctx?.areaRaw ?? '').trim().toUpperCase(),
    String(ctx?.settoreRaw ?? '').trim().toUpperCase(),
    String(ctx?.ufficio ?? ''),
    String(ctx?.ufficioLabel || '').trim().toUpperCase(),
    String(ctx?.gruppo || '').trim().toUpperCase()
  ].join('|')
}

function useReactiveGiiUserContext (useOperationalRole = false): GiiUserContext {
  const [ctx, setCtx] = React.useState<GiiUserContext>(() => readGiiUserContext(useOperationalRole))

  React.useEffect(() => {
    const refresh = () => {
      const next = readGiiUserContext(useOperationalRole)
      setCtx((prev) => giiUserContextIdentityKey(prev) === giiUserContextIdentityKey(next) ? prev : next)
    }
    refresh()
    window.addEventListener('gii:userLoaded', refresh)
    window.addEventListener('gii-practice-context-reset', refresh)
    if (useOperationalRole) {
      window.addEventListener('gii-selection-changed', refresh as EventListener)
      window.addEventListener('gii-selection-cleared', refresh as EventListener)
      window.addEventListener('gii-force-refresh-selection', refresh as EventListener)
    }
    return () => {
      window.removeEventListener('gii:userLoaded', refresh)
      window.removeEventListener('gii-practice-context-reset', refresh)
      if (useOperationalRole) {
        window.removeEventListener('gii-selection-changed', refresh as EventListener)
        window.removeEventListener('gii-selection-cleared', refresh as EventListener)
        window.removeEventListener('gii-force-refresh-selection', refresh as EventListener)
      }
    }
  }, [useOperationalRole])

  return ctx
}

function isRitAgrTecContext (ctx: GiiUserContext): boolean {
  const role = normalizeRoleCode(ctx?.role)
  const area = normalizeAreaCode(ctx?.area || ctx?.areaRaw)
  return role === 'RIT' && (area === 'AGR' || area === 'TEC')
}

function normalizeIntOrNull (v: any): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function shortRoleLabel (roleRaw: any): string {
  const normalizedRole = normalizeRoleCode(roleRaw)
  if (normalizedRole) return normalizedRole === 'ADMIN' ? '' : normalizedRole
  const role = String(roleRaw ?? '').trim().toUpperCase()
  if (/(^|[^A-Z])IT([^A-Z]|$)/.test(role)) return 'IT'
  if (/(^|[^A-Z])TR([^A-Z]|$)/.test(role)) return 'TR'
  if (/(^|[^A-Z])CS([^A-Z]|$)/.test(role)) return 'CS'
  if (/(^|[^A-Z])RIT([^A-Z]|$)/.test(role)) return 'RIT'
  if (/(^|[^A-Z])DT([^A-Z]|$)/.test(role)) return 'DT'
  if (/(^|[^A-Z])DA([^A-Z]|$)/.test(role)) return 'DA'
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

function getCurrentGiiUserDisplayName (usernameFallback: any): string {
  const w: any = window as any
  const roleObj: any = w.__giiUserRole || {}
  const userObj: any = w.__giiUser || {}
  return String(firstMeaningfulValue(
    roleObj.full_name, roleObj.fullName, roleObj.nome_completo, roleObj.nomeCompleto, roleObj.nome,
    userObj.full_name, userObj.fullName, userObj.nome_completo, userObj.nomeCompleto, userObj.nome,
    w.__giiFullName, w.__giiFull_name,
    usernameFallback
  ) || '').trim()
}

async function resolveCreateSurveyLikeDefaults (layer: any, ctx: GiiUserContext): Promise<{ tecnicoRilevatore: string, ufficioZona: string, idUfficio: number | null }> {
  const w: any = window as any
  const roleShort = shortRoleLabel(ctx.role)
  const tecnicoFromRole = roleShort && ctx.settore ? `${roleShort} ${ctx.settore}` : (roleShort || String(ctx.username || '').trim())
  let tecnicoRilevatore = getCurrentGiiUserDisplayName(ctx.username) || String(ctx.username || '').trim() || tecnicoFromRole

  let ufficioZona = String(firstMeaningfulValue(
    ctx.ufficioLabel,
    w.__giiUfficioLabel, w.__giiOfficeLabel,
    w.__giiUser?.ufficio_zona, w.__giiUser?.ufficioZona, w.__giiUser?.ufficio,
    w.__giiUserRole?.ufficio_zona, w.__giiUserRole?.ufficioZona, w.__giiUserRole?.ufficio
  ) || '').trim()

  let idUfficio = normalizeIntOrNull(firstMeaningfulValue(
    ctx.ufficio,
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

function buildItCreateViewServiceNames (areaRaw: any, settoreRaw: any): string[] {
  const area = normalizeAreaCode(areaRaw)
  const settore = normalizeSettoreCode(area, settoreRaw)
  if (area === 'AGR' && /^D[1-6]$/.test(settore)) return [`GII_VIEW_AGR_${settore}`]
  if (area === 'TEC' && settore === 'DS') return ['GII_VIEW_TEC_DS']
  if (area === 'AMM') {
    return ['GII_VIEW_AMM_ALL']
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

// domini (numeri come da tua nota)
const PRESA_DA_PRENDERE = 1

// ─────────────────────────── OVERLAY EDITING INLINE ──────────────────────────
// Versione semplificata dell'overlay di editing che vive dentro il widget Azioni.
// Per la versione completa (con mappa e tutte le tab) usare il widget gii-editing-tec
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


const PRESA_IN_CARICO = 2

const STATO_DA_PRENDERE = 1
const STATO_PRESA_IN_CARICO = 2
const STATO_INTEGRAZIONE = 3
const STATO_APPROVATA = 4
const STATO_RESPINTA = 5

const ESITO_INTEGRAZIONE = 1
const ESITO_APPROVATA = 2
const ESITO_RESPINTA = 3

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


type TabFields = {
  trasgressore: string[]
  violazione: string[]
  allegati: string[]
  iterExtra: string[]
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
  if (kind === 'TRASGRESSORE') {
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
    result = tabs.map((tab: any) => {
      const id = String(tab?.id || '').trim().toLowerCase()
      if (id === 'anagrafica') {
        const label = String(tab?.label || '').trim()
        return { ...tab, id: 'trasgressore', label: !label || label.toLowerCase() === 'anagrafica' ? 'Trasgressore' : tab.label }
      }
      return tab
    })
  } else {
    // Altrimenti migra dai vecchi tabFields
    result = [
      {
        id: 'trasgressore',
        label: 'Trasgressore',
        fields: tabFields?.trasgressore || []
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
  // Inietta dati_generali come primo tab se mancante
  if (!result.find(t => t.id === 'dati_generali')) {
    result = [{ id: 'dati_generali', label: 'Dati generali', fields: ['area_cod', 'settore_cod', 'ufficio_zona', 'tecnico_rilevatore', 'data_rilevazione', 'it_assegnato_nome', 'dt_trasmissione_capo_settore'], hideEmpty: false }, ...result]
  }
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


// ══════════════════════════════════════════════════════════════════════════════
// NUOVA PRATICA IT — form che segue la struttura del survey XLS
// Mostrato quando nessun record è selezionato (hasSel=false).
// ══════════════════════════════════════════════════════════════════════════════

const CHOICES = {
  tipo_soggetto: [{ v: 'PF', l: 'Persona fisica' }, { v: 'PG', l: 'Persona giuridica' }],
  ufficio: ['Cagliari','Iglesias','Masainas','Quartucciu','San Gavino Monreale','San Giovanni Suergiu','San Sperate','Senorbì','Serramanna'].map(v=>({v,l:v})),
  tipo_abuso: [{ v: 'parziale', l: 'Parziale' }, { v: 'totale', l: 'Totale' }],
  art15_parziale: [{ v: 'Art15.1', l: 'Prima contestazione' }, { v: 'Art15.2', l: 'Recidiva' }],
  art15_totale:   [{ v: 'Art15.3', l: 'Prima contestazione' }, { v: 'Art15.4', l: 'Recidiva' }],
  occorrenza: [{ v: '1', l: 'Prima contestazione' }, { v: '2', l: 'Recidiva' }],
  art16_17: [
    { v: 'Art16', l: 'Art. 16 - Presentazione tardiva comunicazione di irrigazione' },
    { v: 'Art17', l: 'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia' },
  ],
  art17_tipo: [{ v: 'Art17.1', l: 'Variazione tardiva' }, { v: 'Art17.2', l: 'Rinuncia tardiva' }],
  presenza: [{ v: 'sì', l: 'Sì' }, { v: 'no', l: 'No' }],
  grado: [{ v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }, { v: '4', l: '4' }],
  norma3: [
    { v: 'Art8',  l: 'Art. 8 - Violazione servizio di reperibilità' },
    { v: 'Art12', l: 'Art. 12 - Negato accesso ai fondi (al personale consortile)' },
    { v: 'Art27', l: 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica' },
    { v: 'Art28', l: 'Art. 28 - Violazione prescrizioni del consorzio' },
    { v: 'Art29', l: 'Art. 29 - Violazione termini restituzione attrezzature' },
    { v: 'Art30', l: 'Art. 30 - Danneggiamento e/o perdita attrezzature' },
    { v: 'Art31', l: 'Art. 31 - Mancata segnalazione guasti' },
    { v: 'Art32', l: 'Art. 32 - Negato accesso ai fondi (al consorziato)' },
    { v: 'Art33', l: 'Art. 33 - Inosservanza limiti temporali di prelievo' },
    { v: 'Art34', l: 'Art. 34 - Interferenze' },
    { v: 'Art35', l: 'Art. 35 - Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante' },
    { v: 'Art36', l: 'Art. 36 - Uso attrezzature non autorizzate' },
    { v: 'Art37', l: 'Art. 37 - Uso sistemi di irrigazione incompatibili' },
    { v: 'Art39', l: 'Art. 39 - Danni alle strutture irrigue' },
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

const RIT_GRADO_ART_CODES = ['12', '27', '28', '31', '32', '33', '34', '35', '36', '37'] as const
function normalizeArtCode (raw: any): string {
  const s = String(raw ?? '').trim().replace(/^art\.?\s*/i, '').replace(/^0+/, '')
  return s
}

function parseGradiViolazioni (raw: any): Record<string, string> {
  const out: Record<string, string> = {}
  const text = String(raw ?? '').trim()
  if (!text) return out
  for (const part of text.split(';')) {
    const m = part.trim().match(/^Art?\.?\s*(\d{1,2})\s*[-:=]\s*([1-4])$/i) || part.trim().match(/^(\d{1,2})\s*[-:=]\s*([1-4])$/)
    if (!m) continue
    const art = normalizeArtCode(m[1])
    const grado = String(m[2])
    if (RIT_GRADO_ART_CODES.includes(art as any)) out[art] = grado
  }
  return out
}

function buildGradiViolazioni (map: Record<string, string>, selectedArts: string[]): string {
  return selectedArts
    .map(art => {
      const code = normalizeArtCode(art)
      const grado = String(map[code] ?? '').trim()
      return /^[1-4]$/.test(grado) ? `${code}-${grado}` : ''
    })
    .filter(Boolean)
    .join(';')
}

function getRitGradoSelectedArts (attrs: Record<string, any>): string[] {
  const selected = new Set(parseNorma3Codes(attrs?.norma_violata3))
  const out: string[] = []
  for (const artCode of RIT_GRADO_ART_CODES) {
    const art = `Art${artCode}`
    if (selected.has(art)) out.push(artCode)
  }
  return out
}

function isSelectedFlag (v: any): boolean {
  if (v === 1 || v === true) return true
  const s = String(v ?? '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'sì' || s === 'si' || s === 'yes'
}

function modernColor (value: any, modernFallback: string, legacyValues: string[] = []): string {
  const raw = String(value ?? '').trim()
  const normalized = raw.toLowerCase().replace(/\s+/g, '')
  const legacy = legacyValues.map(v => String(v).trim().toLowerCase().replace(/\s+/g, ''))
  if (!raw || legacy.includes(normalized)) return modernFallback
  return raw
}

const _defaultFormStyle = {
  labelColor: '#334155', labelFontSize: 12, labelFontWeight: 600, labelMarginBottom: 3,
  hdrColor: '#0f4c81', hdrFontSize: 11,
  divColor: '#93c5fd', divWidth: 2,
  fieldColor: '#0f172a', fieldFontSize: 13, fieldHeight: 32, fieldPaddingX: 9,
  fieldBorderColor: '#bfcede', fieldBorderWidth: 1, fieldBorderRadius: 7, fieldBg: '#f8fbff',
  fieldDisabledBg: '#e8edf3', fieldDisabledColor: '#1f2937',
  sectionGap: 10,
  cardBg: '#f8fbff', cardBorderColor: '#c6d7ea', cardBorderWidth: 1, cardBorderRadius: 8, cardShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
  cardHeaderBg: 'linear-gradient(90deg, #0d3b66, #155e9d)', cardHeaderColor: '#ffffff', cardHeaderFontSize: 11,
  cardHeaderFontWeight: 800, cardHeaderPaddingX: 10, cardHeaderPaddingY: 7, cardBodyPadding: 10,
  norma3FontSize: 12, norma3GradeColumnWidth: 142, norma3RowGap: 0,
  violazioneLeftPercent: 58, violazioneMinLeftPx: 520, violazioneMinRightPx: 360, violazioneSplitterWidth: 14, violazioneSplitterColor: '#94a3b8',
  violazioneDescrizioneRows: 5, violazioneCircostanzeRows: 4
}
const FormStyleCtx = React.createContext(_defaultFormStyle)

const REGOLAMENTO_VIOLATA_STYLE = {
  cardBg: '#eff6ff',
  borderColor: '#93c5fd',
  borderWidth: 1,
  headerBg: '#dbeafe',
  headerTextColor: '#0f172a',
  arrowColor: '#1d4ed8',
  bodyBg: '#ffffff',
  articleTitleColor: '#111827',
  articleTextColor: '#374151',
  articleMetaColor: '#6b7280'
}

function RegolamentoArticleDetailsTi (props: { articleState: RegolamentoArticoliState, articleCode: string }) {
  const st = REGOLAMENTO_VIOLATA_STYLE
  const article = getRegolamentoArticle(props.articleState, props.articleCode)

  if (!props.articleState.urlsReady) {
    return <div style={{ color: st.articleMetaColor, fontSize: 12 }}>Tabella articoli del regolamento non configurata.</div>
  }
  if (props.articleState.loading) {
    return <div style={{ color: st.articleMetaColor, fontSize: 12 }}>Caricamento testo regolamentare…</div>
  }
  if (props.articleState.error) {
    return <div style={{ color: '#991b1b', fontSize: 12 }}>Errore caricamento regolamento: {props.articleState.error}</div>
  }
  if (!article) {
    return <div style={{ color: st.articleMetaColor, fontSize: 12 }}>Testo regolamentare non disponibile nelle tabelle configurate.</div>
  }

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {article.testo_articolo && <div style={{ color: st.articleTextColor, fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{article.testo_articolo}</div>}
      {(article.atto_regolamento || article.anno_riferimento) && <div style={{ color: st.articleMetaColor, fontSize: 11 }}>{[article.atto_regolamento, article.anno_riferimento ? `Anno ${article.anno_riferimento}` : ''].filter(Boolean).join(' · ')}</div>}
    </div>
  )
}

function RegolamentoChoiceToggleTi (props: {
  articleState: RegolamentoArticoliState
  articleCode: string
  title: string
  checkbox?: React.ReactNode
  textStyle?: React.CSSProperties
  disabled?: boolean
  fill?: boolean
}) {
  const fs = React.useContext(FormStyleCtx)
  const [open, setOpen] = React.useState(false)
  const st = REGOLAMENTO_VIOLATA_STYLE
  const title = String(props.title || '').trim() || '—'
  const targetHeight = Math.max(24, Number(fs.fieldHeight) || 32)
  const headerHeight = Math.max(22, targetHeight - (Number(st.borderWidth || 1) * 2))
  const toggleOpen = (evt?: any) => {
    try { evt?.preventDefault?.() } catch {}
    try { evt?.stopPropagation?.() } catch {}
    setOpen(v => !v)
  }

  return (
    <div style={{ border: `${Number(st.borderWidth || 1)}px solid ${st.borderColor}`, background: st.cardBg, borderRadius: 7, overflow: 'hidden', minWidth: 0, width: props.fill === false ? undefined : '100%', boxSizing: 'border-box' }}>
      <div style={{ minHeight: headerHeight, background: st.headerBg, color: st.headerTextColor, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', boxSizing: 'border-box' }}>
        <button
          type='button'
          onClick={toggleOpen}
          aria-expanded={open}
          title={open ? 'Nascondi testo regolamento' : 'Mostra testo regolamento'}
          style={{ border: 0, background: 'transparent', color: st.arrowColor, width: 14, minWidth: 14, height: headerHeight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, fontSize: 11, fontWeight: 900, lineHeight: 1 }}
        >{open ? '▼' : '▶'}</button>
        {props.checkbox && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, minWidth: 14, height: headerHeight, lineHeight: 1 }}>{props.checkbox}</span>}
        <button
          type='button'
          onClick={toggleOpen}
          aria-expanded={open}
          style={{ border: 0, background: 'transparent', color: st.headerTextColor, display: 'flex', alignItems: 'center', minHeight: headerHeight, padding: 0, textAlign: 'left', cursor: 'pointer', minWidth: 0, flex: '1 1 auto', fontSize: fs.norma3FontSize, fontWeight: 900, lineHeight: 1.25, ...props.textStyle }}
        ><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span></button>
      </div>
      {open && (
        <div style={{ padding: '8px 10px', borderTop: `1px solid ${st.borderColor}`, background: st.bodyBg }}>
          <RegolamentoArticleDetailsTi articleState={props.articleState} articleCode={props.articleCode} />
        </div>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  wrap:   { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', padding: '0 2px' },
  hdr:    { fontSize: 11, fontWeight: 700, color: '#0f4c81', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '2px solid #93c5fd', paddingBottom: 4, marginBottom: 12, marginTop: 20 },
  lbl:    { fontSize: 12, color: '#334155', marginBottom: 3, display: 'block' },
  inp:    { width: '100%', padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.18)', fontSize: 13, boxSizing: 'border-box' as const, background: '#f8fbff' },
  inpDis: { width: '100%', padding: '5px 9px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' as const, background: '#e8edf3', color: '#1f2937', opacity: 1, WebkitTextFillColor: '#1f2937' as any },
  sel:    { width: '100%', height: 32, minHeight: 32, padding: '0 9px', lineHeight: '32px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.18)', fontSize: 13, boxSizing: 'border-box' as const, background: '#f8fbff', cursor: 'pointer', verticalAlign: 'middle' },
  row2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  row3:   { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  fld:    { marginBottom: 6, minWidth: 0, maxWidth: '100%' },
  hint:   { fontSize: 11, color: '#9ca3af', marginTop: 3 },
}

function fieldBaseStyle(fs: any, disabled?: boolean): React.CSSProperties {
  const h = Math.max(24, Number(fs.fieldHeight) || 32)
  const normalColor = String(fs.fieldColor || '#111827')
  const disabledColor = String(fs.fieldDisabledColor || '#1f2937')
  const normalBg = String(fs.fieldBg || '#fff')
  const disabledBg = String(fs.fieldDisabledBg || '#e8edf3')
  const normalBorder = String(fs.fieldBorderColor || 'transparent')
  const disabledBorder = String(fs.fieldDisabledBorderColor || '#cbd5e1')
  return {
    width: '100%',
    height: h,
    minHeight: h,
    padding: `0 ${Number(fs.fieldPaddingX) || 0}px`,
    borderRadius: Number(fs.fieldBorderRadius) || 0,
    border: `${Number(fs.fieldBorderWidth) || 0}px solid ${disabled ? disabledBorder : normalBorder}`,
    fontSize: Number(fs.fieldFontSize) || 13,
    lineHeight: `${h}px`,
    boxSizing: 'border-box' as const,
    background: disabled ? disabledBg : normalBg,
    color: disabled ? disabledColor : normalColor,
    opacity: 1,
    WebkitTextFillColor: disabled ? disabledColor : normalColor,
    verticalAlign: 'middle',
    cursor: disabled ? 'default' : undefined
  }
}

function renderSurfaceUnitLabel(label: React.ReactNode): React.ReactNode {
  if (typeof label !== 'string') return label
  const normalized = label.replace(/\(ha\.aa\.ca\)/g, '(ha.a.ca)')
  const unit = '(ha.a.ca)'
  const idx = normalized.indexOf(unit)
  if (idx < 0) return normalized
  const main = normalized.slice(0, idx).trimEnd()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap', lineHeight: 1.15 }}>
      <span>{main}</span>
      <span style={{ fontSize: '0.72em', fontWeight: 'inherit', marginLeft: 3, lineHeight: 1 }}>{unit}</span>
    </span>
  )
}

function NpField(p: { label: React.ReactNode; children: React.ReactNode; hint?: string }) {
  const fs = React.useContext(FormStyleCtx)
  return (
    <div style={S.fld}>
      <label style={{ ...S.lbl, color: fs.labelColor, fontSize: fs.labelFontSize, fontWeight: fs.labelFontWeight as any, marginBottom: fs.labelMarginBottom }}>{renderSurfaceUnitLabel(p.label)}</label>
      {p.children}
      {p.hint && <div style={S.hint}>{p.hint}</div>}
    </div>
  )
}

function NpSel(p: { value: string; onChange: (v: string) => void; options: readonly {v:string;l:string}[]; disabled?: boolean; allowEmpty?: boolean; attention?: boolean; attentionTitle?: string; centerText?: boolean }) {
  const fs = React.useContext(FormStyleCtx)
  const st = fieldBaseStyle(fs, p.disabled)
  const attention = !!p.attention && !p.disabled
  const allowEmpty = p.allowEmpty !== false
  const centeredOptionStyle = p.centerText
    ? { textAlign: 'center' as const, textAlignLast: 'center' as any }
    : undefined
  return (
    <select
      value={p.value}
      onChange={e => p.onChange(e.target.value)}
      title={attention ? (p.attentionTitle || 'Campo da valorizzare') : undefined}
      style={{
        ...st,
        paddingTop: 0,
        paddingBottom: 0,
        cursor: p.disabled ? 'not-allowed' : 'pointer',
        ...(p.centerText ? {
          textAlign: 'center' as const,
          textAlignLast: 'center' as any,
          paddingLeft: 0,
          paddingRight: 0
        } : {}),
        ...(attention ? {
          border: '1px solid #dc2626',
          background: '#fff',
          color: '#7f1d1d'
        } : {})
      }}
      disabled={p.disabled}
    >
      {allowEmpty && <option value='' style={centeredOptionStyle}>— seleziona —</option>}
      {p.options.map(o => <option key={o.v} value={o.v} style={centeredOptionStyle}>{o.l}</option>)}
    </select>
  )
}

function NpText(p: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; disabled?: boolean; maxLength?: number; minRows?: number; uppercase?: boolean; lowercase?: boolean }) {
  const fs = React.useContext(FormStyleCtx)
  const st = fieldBaseStyle(fs, p.disabled)
  const normalizeText = (v: any): string => {
    const raw = String(v ?? '')
    if (p.lowercase === true) return raw.toLocaleLowerCase('it-IT')
    if (p.uppercase === false) return raw
    return raw.toLocaleUpperCase('it-IT')
  }
  if (p.multiline) {
    const rows = p.minRows != null ? Math.max(3, Number(p.minRows) || 3) : 3
    return (
      <textarea value={p.value} onChange={e => p.onChange(normalizeText(e.target.value))} placeholder={p.placeholder}
        rows={rows} style={{ ...st, height: 'auto', minHeight: (Number(fs.fieldHeight) || 32) * rows, lineHeight: 1.35, paddingTop: 6, paddingBottom: 6, resize: 'vertical' }} disabled={p.disabled} maxLength={p.maxLength}/>
    )
  }
  return <input type='text' value={p.value} onChange={e => p.onChange(normalizeText(e.target.value))} placeholder={p.placeholder} style={st} disabled={p.disabled} maxLength={p.maxLength}/>
}

function NpDerivedText (p: { value: string; maxLength?: number; disabled?: boolean }) {
  const fs = React.useContext(FormStyleCtx)
  const value = String(p.value || '')
  const hasValue = value.trim() !== ''
  const disabled = !!p.disabled || !hasValue
  const st = fieldBaseStyle(fs, disabled)
  return (
    <input
      type='text'
      value={value}
      onChange={() => {}}
      readOnly
      disabled={disabled}
      maxLength={p.maxLength}
      style={{ ...st, cursor: 'default' }}
    />
  )
}




const GII_COMUNI_ISTAT_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_COMUNI_ISTAT_IMPORT/FeatureServer/0'
const GII_COMUNI_CAP_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_COMUNI_CAP_IMPORT/FeatureServer/0'

type ComuneIstatOption = {
  denominazione_comune: string
  sigla_provincia: string
  stato: string
  regione: string
  codice_comune_alfanumerico: string
  codice_catastale: string
}

type ComuneCapOption = {
  cap: string
  codice_comune_alfanumerico: string
  codice_comune_numerico: string
  codice_catastale: string
  denominazione_comune: string
  sigla_provincia: string
  stato: string
}

const __giiComuniIstatSearchCache: Record<string, ComuneIstatOption[]> = {}
const __giiComuniCapCache: Record<string, ComuneCapOption[]> = {}

function comuneIstatText (v: any): string {
  return String(v ?? '').trim().toLocaleUpperCase('it-IT')
}

function comuneIstatSearchKey (v: any): string {
  return comuneIstatText(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function comuneIstatSqlText (v: any): string {
  return comuneIstatText(v).replace(/'/g, "''")
}

function comuneIstatFromAttrs (a: any): ComuneIstatOption | null {
  const attivo = String(a?.attivo ?? '1').trim()
  if (attivo && attivo !== '1' && attivo.toLowerCase() !== 'true') return null
  const comune = comuneIstatText(a?.denominazione_comune || a?.denominazione_comune_it)
  const provincia = comuneIstatText(a?.sigla_provincia).slice(0, 2)
  if (!comune) return null
  return {
    denominazione_comune: comune,
    sigla_provincia: provincia,
    stato: comuneIstatText(a?.stato || 'ITALIA') || 'ITALIA',
    regione: comuneIstatText(a?.regione),
    codice_comune_alfanumerico: String(a?.codice_comune_alfanumerico ?? '').trim(),
    codice_catastale: comuneIstatText(a?.codice_catastale)
  }
}

async function queryComuniIstat (rawTerm: string, exact = false): Promise<ComuneIstatOption[]> {
  const term = comuneIstatText(rawTerm)
  if (term.length < 2) return []
  const cacheKey = `${exact ? 'exact' : 'like'}:${term}`
  if (__giiComuniIstatSearchCache[cacheKey]) return __giiComuniIstatSearchCache[cacheKey]

  const fl = await getFeatureLayerByUrl(GII_COMUNI_ISTAT_URL)
  const sqlTerm = comuneIstatSqlText(term)
  const q = fl.createQuery ? fl.createQuery() : {}
  const activeWhere = '(attivo = 1 OR attivo IS NULL)'
  q.where = exact
    ? `${activeWhere} AND (denominazione_comune = '${sqlTerm}' OR denominazione_comune_it = '${sqlTerm}')`
    : `${activeWhere} AND (denominazione_comune LIKE '%${sqlTerm}%' OR denominazione_comune_it LIKE '%${sqlTerm}%' OR sigla_provincia LIKE '${sqlTerm}%')`
  q.outFields = [
    'denominazione_comune',
    'denominazione_comune_it',
    'sigla_provincia',
    'stato',
    'regione',
    'codice_comune_alfanumerico',
    'codice_catastale',
    'attivo'
  ]
  q.returnGeometry = false
  q.orderByFields = ['denominazione_comune ASC', 'sigla_provincia ASC']
  q.start = 0
  q.num = exact ? 50 : 40
  const res = await fl.queryFeatures(q)
  const seen = new Set<string>()
  const out: ComuneIstatOption[] = []
  for (const f of (res?.features || [])) {
    const opt = comuneIstatFromAttrs(f?.attributes || {})
    if (!opt) continue
    const key = `${opt.denominazione_comune}|${opt.sigla_provincia}|${opt.codice_comune_alfanumerico}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(opt)
  }
  out.sort((a, b) => {
    const c = a.denominazione_comune.localeCompare(b.denominazione_comune, 'it')
    return c !== 0 ? c : a.sigla_provincia.localeCompare(b.sigla_provincia, 'it')
  })
  __giiComuniIstatSearchCache[cacheKey] = out
  return out
}

function comuneCapFromAttrs (a: any): ComuneCapOption | null {
  const attivo = String(a?.attivo ?? '1').trim()
  if (attivo && attivo !== '1' && attivo.toLowerCase() !== 'true') return null
  const cap = String(a?.cap ?? '').trim()
  if (!cap) return null
  return {
    cap,
    codice_comune_alfanumerico: String(a?.codice_comune_alfanumerico ?? '').trim(),
    codice_comune_numerico: String(a?.codice_comune_numerico ?? '').trim(),
    codice_catastale: comuneIstatText(a?.codice_catastale),
    denominazione_comune: comuneIstatText(a?.denominazione_comune),
    sigla_provincia: comuneIstatText(a?.sigla_provincia).slice(0, 2),
    stato: comuneIstatText(a?.stato || 'ITALIA') || 'ITALIA'
  }
}

async function queryCapForComuneIstat (comune: ComuneIstatOption): Promise<ComuneCapOption[]> {
  const codice = String(comune?.codice_comune_alfanumerico ?? '').trim()
  const cat = comuneIstatText(comune?.codice_catastale)
  const nome = comuneIstatText(comune?.denominazione_comune)
  const provincia = comuneIstatText(comune?.sigla_provincia).slice(0, 2)
  if (!codice && !cat && (!nome || !provincia)) return []

  const cacheKey = `${codice || ''}|${cat || ''}|${nome}|${provincia}`
  if (__giiComuniCapCache[cacheKey]) return __giiComuniCapCache[cacheKey]

  const fl = await getFeatureLayerByUrl(GII_COMUNI_CAP_URL)
  const q = fl.createQuery ? fl.createQuery() : {}
  const activeWhere = '(attivo = 1 OR attivo IS NULL)'
  const clauses: string[] = []
  if (codice) clauses.push(`codice_comune_alfanumerico = '${comuneIstatSqlText(codice)}'`)
  if (cat) clauses.push(`codice_catastale = '${comuneIstatSqlText(cat)}'`)
  if (nome && provincia) clauses.push(`(denominazione_comune = '${comuneIstatSqlText(nome)}' AND sigla_provincia = '${comuneIstatSqlText(provincia)}')`)
  q.where = `${activeWhere} AND (${clauses.join(' OR ')})`
  q.outFields = [
    'codice_comune_alfanumerico',
    'codice_comune_numerico',
    'codice_catastale',
    'denominazione_comune',
    'sigla_provincia',
    'cap',
    'stato',
    'attivo'
  ]
  q.returnGeometry = false
  q.orderByFields = ['cap ASC']
  q.start = 0
  q.num = 100

  const res = await fl.queryFeatures(q)
  const seen = new Set<string>()
  const out: ComuneCapOption[] = []
  for (const f of (res?.features || [])) {
    const opt = comuneCapFromAttrs(f?.attributes || {})
    if (!opt) continue
    const key = `${opt.cap}|${opt.codice_comune_alfanumerico}|${opt.codice_catastale}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(opt)
  }
  out.sort((a, b) => a.cap.localeCompare(b.cap, 'it'))
  __giiComuniCapCache[cacheKey] = out
  return out
}

function CapIstatInput (p: { value: string; onChange: (v: string) => void; options?: ComuneCapOption[]; disabled?: boolean }) {
  const fs = React.useContext(FormStyleCtx)
  const opts = Array.isArray(p.options) ? p.options : []
  const value = String(p.value || '').trim()
  const hasCurrentValueInOptions = opts.some(o => String(o.cap || '').trim() === value)
  const disabled = !!p.disabled || opts.length === 0
  const st = fieldBaseStyle(fs, disabled)
  return (
    <select
      value={value}
      onChange={e => p.onChange(String(e.target.value || '').trim())}
      style={{ ...st, paddingTop: 0, paddingBottom: 0, cursor: disabled ? 'not-allowed' : 'pointer' }}
      disabled={disabled}
    >
      <option value=''>{disabled ? '' : '— seleziona CAP —'}</option>
      {value && !hasCurrentValueInOptions ? <option value={value}>{value}</option> : null}
      {opts.map(o => <option key={`${o.cap}-${o.codice_comune_alfanumerico}-${o.codice_catastale}`} value={o.cap}>{o.cap}</option>)}
    </select>
  )
}

function ComuneIstatInput (p: {
  value: string
  disabled?: boolean
  placeholder?: string
  onManualChange: (v: string) => void
  onSelect: (comune: ComuneIstatOption) => void
}) {
  const fs = React.useContext(FormStyleCtx)
  const st = fieldBaseStyle(fs, p.disabled)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [options, setOptions] = React.useState<ComuneIstatOption[]>([])
  const [err, setErr] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [menuPos, setMenuPos] = React.useState<{ left: number, top: number, width: number, maxHeight: number } | null>(null)

  const term = comuneIstatSearchKey(p.value)

  const computeMenuPos = React.useCallback(() => {
    try {
      const el = rootRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const margin = 8
      const gap = 2
      const below = Math.max(0, window.innerHeight - r.bottom - margin)
      const above = Math.max(0, r.top - margin)
      const preferred = 190
      const openAbove = below < 180 && above > below
      const maxHeight = Math.max(120, Math.min(preferred, openAbove ? above - gap : below - gap))
      const top = openAbove ? Math.max(margin, r.top - gap - maxHeight) : Math.min(window.innerHeight - margin, r.bottom + gap)
      setMenuPos({
        left: Math.max(margin, r.left),
        top,
        width: Math.max(180, Math.min(r.width, window.innerWidth - margin - Math.max(margin, r.left))),
        maxHeight
      })
    } catch {
      // ignora: al prossimo focus/resize viene ricalcolato
    }
  }, [])

  React.useEffect(() => {
    if (!open) return
    computeMenuPos()
    const onMove = () => computeMenuPos()
    try { window.addEventListener('resize', onMove, true) } catch {}
    try { window.addEventListener('scroll', onMove, true) } catch {}
    return () => {
      try { window.removeEventListener('resize', onMove, true) } catch {}
      try { window.removeEventListener('scroll', onMove, true) } catch {}
    }
  }, [open, computeMenuPos, options.length, loading, err])

  React.useEffect(() => {
    if (p.disabled || term.length < 2) {
      setLoading(false)
      setOptions([])
      setErr(false)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setErr(false)
      ;(async () => {
        try {
          const rows = await queryComuniIstat(term, false)
          if (!cancelled) setOptions(rows)
        } catch {
          if (!cancelled) {
            setOptions([])
            setErr(true)
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 180)
    return () => {
      cancelled = true
      try { window.clearTimeout(timer) } catch {}
    }
  }, [p.disabled, term])

  const selectComune = React.useCallback((opt: ComuneIstatOption) => {
    p.onSelect(opt)
    setOpen(false)
  }, [p])

  const applyExactIfUnique = React.useCallback(() => {
    const v = comuneIstatSearchKey(p.value)
    if (!v) return
    const exact = options.filter(o => comuneIstatSearchKey(o.denominazione_comune) === v)
    if (exact.length === 1) selectComune(exact[0])
  }, [options, p.value, selectComune])

  const menuVisible = !p.disabled && open && term.length >= 2 && (loading || options.length > 0 || err)
  const menu = menuVisible && menuPos
    ? createPortal(
        <div
          style={{
            position: 'fixed',
            left: menuPos.left,
            top: menuPos.top,
            width: menuPos.width,
            zIndex: 2147483000,
            maxHeight: menuPos.maxHeight,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #aac4e0',
            borderRadius: 8,
            boxShadow: '0 8px 18px rgba(15, 23, 42, 0.16)'
          }}
          onMouseDown={e => e.preventDefault()}
        >
          {loading && <div style={{ padding: '8px 10px', fontSize: 14, color: '#64748b' }}>Caricamento Comuni…</div>}
          {!loading && err && <div style={{ padding: '8px 10px', fontSize: 14, color: '#b42318' }}>Comuni non disponibili. Inserire manualmente.</div>}
          {!loading && !err && options.map((o, idx) => (
            <button
              key={`${o.codice_comune_alfanumerico || o.denominazione_comune}-${o.sigla_provincia}-${idx}`}
              type='button'
              onMouseDown={e => { e.preventDefault(); selectComune(o) }}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                borderBottom: idx < options.length - 1 ? '1px solid #e5eef8' : 'none',
                background: idx % 2 === 0 ? '#f8fbff' : '#fff',
                padding: '7px 10px',
                cursor: 'pointer',
                fontSize: 14,
                color: '#1f2937'
              }}
              title={`${o.denominazione_comune} (${o.sigla_provincia})${o.regione ? ` — ${o.regione}` : ''}`}
            >
              <span style={{ fontWeight: 700 }}>{o.denominazione_comune}</span>
              {o.sigla_provincia && <span style={{ color: '#64748b' }}> ({o.sigla_provincia})</span>}
              {o.regione && <span style={{ color: '#94a3b8' }}> — {o.regione}</span>}
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type='text'
        value={p.value}
        onChange={e => {
          setOpen(true)
          p.onManualChange(comuneIstatText(e.target.value))
          window.setTimeout(computeMenuPos, 0)
        }}
        onFocus={() => { setOpen(true); window.setTimeout(computeMenuPos, 0) }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
          applyExactIfUnique()
        }}
        placeholder={p.placeholder || 'Comune italiano o località estera'}
        style={st}
        disabled={p.disabled}
        autoComplete='off'
      />
      {menu}
    </div>
  )
}

function parseSurfaceCentiareText(v: any): string {
  const digits = String(v ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const n = parseInt(digits, 10)
  return Number.isNaN(n) ? '' : String(n)
}

function surfaceToCentiareNumber(v: any): number {
  const raw = parseSurfaceCentiareText(v)
  if (!raw) return 0
  const n = parseInt(raw, 10)
  return Number.isNaN(n) ? 0 : n
}

function draftHasArt15Selection (draft: any): boolean {
  const hasTextValue = ['tipo_abuso', 'norma15_parziale', 'norma15_totale', 'occorrenza']
    .some(field => String(draft?.[field] ?? '').trim() !== '')
  return hasTextValue ||
    surfaceToCentiareNumber(draft?.sup_dichiarata_art15) > 0 ||
    surfaceToCentiareNumber(draft?.sup_irrigata_art15) > 0
}

function formatSurfaceHaAaCa(v: any): string {
  const raw = parseSurfaceCentiareText(v)
  if (!raw) return ''
  const total = parseInt(raw, 10)
  if (Number.isNaN(total)) return ''
  const ha = Math.floor(total / 10000)
  const aa = Math.floor((total % 10000) / 100)
  const ca = total % 100
  return `${ha}.${String(aa).padStart(2, '0')}.${String(ca).padStart(2, '0')}`
}

function NpSurfaceText(p: { value: string; onChange: (v: string) => void; disabled?: boolean; attention?: boolean; attentionTitle?: string }) {
  const fs = React.useContext(FormStyleCtx)
  const st = fieldBaseStyle(fs, p.disabled)
  const attention = !!p.attention && !p.disabled
  return (
    <input
      type='text'
      inputMode='numeric'
      value={formatSurfaceHaAaCa(p.value)}
      onChange={e => p.onChange(parseSurfaceCentiareText(e.target.value))}
      title={attention ? (p.attentionTitle || 'Campo da valorizzare') : undefined}
      style={{
        ...st,
        textAlign: 'right',
        ...(attention ? { border: '1px solid #dc2626', background: '#fff', color: '#7f1d1d' } : {})
      }}
      disabled={p.disabled}
    />
  )
}

type NpDraft = Record<string, string>

const UPPERCASE_TEXT_FIELDS = new Set([
  'nome', 'cognome', 'codice_fiscale',
  'ragione_sociale', 'piva',
  'via', 'civico', 'citta', 'provincia', 'cap', 'stato', 'telefono', 'cellulare', 'email', 'pec',
  'dom_notifica_via', 'dom_notifica_civico', 'dom_notifica_citta', 'dom_notifica_provincia', 'dom_notifica_cap', 'dom_notifica_stato',
  'rl_nome', 'rl_cognome', 'rl_cf',
  'rl_dom_via', 'rl_dom_civico', 'rl_dom_citta', 'rl_dom_provincia', 'rl_dom_cap', 'rl_dom_stato',
  'distretto', 'comizio', 'idrante', 'matricola_contatore', 'matricola_tessera'
])

function normalizeUppercaseTextFieldValue (fieldName: string, value: any): any {
  if (typeof value !== 'string') return value
  const key = String(fieldName || '').trim().toLowerCase()
  if (!UPPERCASE_TEXT_FIELDS.has(key)) return value
  return value.toLocaleUpperCase('it-IT')
}




type NsCategory = 'AT' | 'PR' | 'RU' | 'SL' | 'PF' | 'RA'
type NsSummary = {
  totaleAT: number
  totalePR: number
  totaleRU: number
  totaleSL: number
  totalePF: number
  totaleRA: number
  percentualeSpeseGenerali: number
  importoSpeseGenerali: number
  totaleComplessivo: number
}

type NsSource = 'REGIONE' | 'INTERNO' | 'NUOVI PREZZI' | 'PARAMETRO'

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
  codice_casistica?: string | null
  riferimento_attrezzatura_id?: string | null
  matricola_snapshot?: string | null
  cauzione_decurtata?: boolean
}

type NsManagerProps = {
  category: NsCategory
  title: string
  rows: NsDetailRow[]
  onRowsChange: (rows: NsDetailRow[]) => void
  onDirtyChange?: (dirty: boolean) => void
  resetKey?: number
  readonly?: boolean
  // Solo per category='RA': valore unitario della cauzione, per calcolare l'importo netto
  // quando la riga è una tessera elettronica con "Cauzione decurtata" spuntata.
  cauzioneUnitaria?: number
  // Conteggio globale nella pratica, usato per impedire matricole duplicate tra tessere
  // recuperabili e non recuperabili.
  matricolaUsageCount?: (matricola: string) => number
}

const NS_CATEGORIES: readonly NsCategory[] = ['AT', 'PR', 'RU', 'SL', 'PF', 'RA'] as const
const NS_CATEGORY_LABELS: Record<NsCategory, string> = {
  AT: 'Attrezzature e trasporti',
  PR: 'Materiali da costruzione',
  RU: 'Risorse umane',
  SL: 'Semilavorati',
  PF: 'Prodotti finiti',
  RA: 'Attrezzature'
}

const NS_SOURCES: readonly NsSource[] = ['REGIONE', 'INTERNO', 'NUOVI PREZZI', 'PARAMETRO'] as const
const NS_SOURCE_LABELS: Record<NsSource, string> = {
  REGIONE: 'Regionale',
  INTERNO: 'Interno',
  'NUOVI PREZZI': 'Nuovi prezzi',
  PARAMETRO: 'Parametro'
}

function nsSourceShort (source: NsSource): string {
  if (source === 'INTERNO') return 'INT'
  if (source === 'NUOVI PREZZI') return 'NP'
  if (source === 'PARAMETRO') return 'PAR'
  return 'REG'
}

function nsNormalizeSource (v: any): NsSource {
  const s = String(v || '').trim().toUpperCase().replace(/_/g, ' ')
  if (s === 'INTERNO') return 'INTERNO'
  if (s === 'NUOVI PREZZI') return 'NUOVI PREZZI'
  if (s === 'PARAMETRO') return 'PARAMETRO'
  return 'REGIONE'
}

const EMPTY_NS_SUMMARY: NsSummary = {
  totaleAT: 0,
  totalePR: 0,
  totaleRU: 0,
  totaleSL: 0,
  totalePF: 0,
  totaleRA: 0,
  percentualeSpeseGenerali: 0,
  importoSpeseGenerali: 0,
  totaleComplessivo: 0
}

const EMPTY_NS_ROWS_BY_CATEGORY: Record<NsCategory, NsDetailRow[]> = {
  AT: [],
  PR: [],
  RU: [],
  SL: [],
  PF: [],
  RA: []
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
    note: String(row.note || '').trim(),
    codice_casistica: String(row.codice_casistica || '').trim() || null,
    riferimento_attrezzatura_id: String(row.riferimento_attrezzatura_id || '').trim() || null,
    matricola_snapshot: row.matricola_snapshot != null ? String(row.matricola_snapshot).trim() || null : null,
    cauzione_decurtata: !!row.cauzione_decurtata
  }
}

function nsCloneRowsByCategory (src?: Record<NsCategory, NsDetailRow[]> | null): Record<NsCategory, NsDetailRow[]> {
  const out: Record<NsCategory, NsDetailRow[]> = {
    AT: [],
    PR: [],
    RU: [],
    SL: [],
    PF: [],
    RA: []
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
    const cat = nsNormalizeCategory(row.categoria_costo)
    if (!cat) return // categoria non tra le 5 gestite qui (es. RA): esclusa, non forzata a PR
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
    ordine: Math.trunc(nsSafeNum(row.ordine, 0)),
    codice_casistica: String(row.codice_casistica || '').trim(),
    riferimento_attrezzatura_id: String(row.riferimento_attrezzatura_id || '').trim(),
    matricola_snapshot: String(row.matricola_snapshot || '').trim(),
    cauzione_decurtata: !!row.cauzione_decurtata
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
  const totaleRA = sumBy('RA') // risarcimento attrezzature Art.30: nessun markup spese generali, si somma netto
  const base = nsRound(totaleAT + totalePR + totaleRU + totaleSL + totalePF, 2)
  const percentualeSpeseGenerali = nsRound(nsSafeNum(perc, 0), 2)
  const importoSpeseGenerali = nsRound(base * percentualeSpeseGenerali / 100, 2)
  const totaleComplessivo = nsRound(base + importoSpeseGenerali + totaleRA, 2)
  return {
    totaleAT,
    totalePR,
    totaleRU,
    totaleSL,
    totalePF,
    totaleRA,
    percentualeSpeseGenerali,
    importoSpeseGenerali,
    totaleComplessivo
  }
}


type NsCasisticaOption = { codice: string; art: number; label: string }

const NS_CASISTICHE_BY_ART: NsCasisticaOption[] = [
  { codice: 'C100_REPERIBILITA', art: 8, label: 'Art. 8 - Violazione servizio di reperibilità' },
  { codice: 'C101_SPRECO_ACQUA', art: 27, label: 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica' },
  { codice: 'C104_ATTREZZATURE_DANNEGGIATE', art: 30, label: 'Art. 30 - Danneggiamento e/o perdita attrezzature' },
  { codice: 'C113_DANNI_STRUTTURE_IRRIGUE', art: 39, label: 'Art. 39 - Danni alle strutture irrigue' }
]

function hasArtSelected (attrs: Record<string, any>, art: number): boolean {
  const code = `Art${art}`
  const multi = new Set(parseNorma3Codes(attrs?.norma_violata3))
  return multi.has(code)
}

function getNotaSpeseCasistiche (attrs: Record<string, any>): NsCasisticaOption[] {
  return NS_CASISTICHE_BY_ART.filter(opt => hasArtSelected(attrs, opt.art)).sort((a, b) => a.art - b.art)
}

function getNotaSpeseCasisticaByArtCode (artCode: string): NsCasisticaOption | null {
  const art = Number(String(artCode || '').replace(/[^0-9]/g, ''))
  if (!Number.isFinite(art) || art <= 0) return null
  return NS_CASISTICHE_BY_ART.find(opt => opt.art === art) || null
}

function hasNotaSpeseRowsForCasistica (rowsByCategory: Record<NsCategory, NsDetailRow[]> | null | undefined, codice: string): boolean {
  const code = String(codice || '').trim()
  if (!code) return false
  return nsRowsByCategoryToFlat(rowsByCategory || EMPTY_NS_ROWS_BY_CATEGORY).some(row => String(row.codice_casistica || '').trim() === code)
}

// Conta quante note spese DISTINTE esistono davvero per una violazione, non solo se ne esiste
// almeno una. Una nota condivisa (righe senza riferimento_attrezzatura_id — es. Art.30 "non
// recuperabile", che può raggruppare più attrezzature in un'unica nota) conta come 1. Ogni
// riferimento_attrezzatura_id distinto (es. Art.30 "recuperabile", una nota per attrezzatura)
// conta come nota separata. Per le violazioni senza attrezzatura di riferimento, si riduce
// naturalmente al vecchio comportamento binario (0 o 1).
function countNotaSpeseEntriesForCasistica (rowsByCategory: Record<NsCategory, NsDetailRow[]> | null | undefined, codice: string): number {
  const rows = getNotaSpeseFlatRowsForCasistica(rowsByCategory, codice)
  const hasSharedEntry = rows.some(row => !String(row.riferimento_attrezzatura_id || '').trim())
  const distinctRiferimenti = new Set(rows.map(row => String(row.riferimento_attrezzatura_id || '').trim()).filter(Boolean))
  return (hasSharedEntry ? 1 : 0) + distinctRiferimenti.size
}

function getNotaSpeseTotalForCasistica (rowsByCategory: Record<NsCategory, NsDetailRow[]> | null | undefined, codice: string, perc: number): number {
  const code = String(codice || '').trim()
  if (!code) return 0
  const filtered = filterRowsByCasistica(rowsByCategory || EMPTY_NS_ROWS_BY_CATEGORY, code)
  return nsComputeSummaryFromRows(nsRowsByCategoryToFlat(filtered), perc).totaleComplessivo
}

function getNotaSpeseFlatRowsForCasistica (rowsByCategory: Record<NsCategory, NsDetailRow[]> | null | undefined, codice: string): NsDetailRow[] {
  const code = String(codice || '').trim()
  if (!code) return []
  const filtered = filterRowsByCasistica(rowsByCategory || EMPTY_NS_ROWS_BY_CATEGORY, code)
  return nsRowsByCategoryToFlat(filtered)
}

// La matricola di una tessera elettronica deve avere esattamente 5 cifre numeriche.
function isValidTesseraMatricola (value: any): boolean {
  return /^\d{5}$/.test(String(value || '').trim())
}

// Riga tecnica interna usata per associare matricola e cauzione alla singola tessera
// RECUPERABILE. Usa campi già presenti in GII_NOTA_SPESE_DETTAGLIO: nessun nuovo campo FL.
const NS_RECUPERABLE_TESSERA_META_CODE = '__GII_TESSERA_RECUPERABILE__'

function isRecuperableTesseraMetaRow (row: NsDetailRow | null | undefined): boolean {
  return String(row?.codice_voce_snapshot || '').trim() === NS_RECUPERABLE_TESSERA_META_CODE &&
    String(row?.codice_casistica || '').trim() === 'C104_ATTREZZATURE_DANNEGGIATE' &&
    !!String(row?.riferimento_attrezzatura_id || '').trim()
}

function isTesseraNotaSpeseRow (row: NsDetailRow | null | undefined): boolean {
  if (!row) return false
  if (isRecuperableTesseraMetaRow(row)) return true
  return row.categoria_costo === 'RA' && attrezzaturaTipo(row.descrizione_snapshot)?.key === 'TESSERA_ELETTRONICA'
}

function getTesseraMatricolaUsageCount (rowsByCategory: Record<NsCategory, NsDetailRow[]> | null | undefined, matricola: any): number {
  const value = String(matricola || '').trim()
  if (!value) return 0
  return nsRowsByCategoryToFlat(rowsByCategory || EMPTY_NS_ROWS_BY_CATEGORY)
    .filter(isTesseraNotaSpeseRow)
    .filter(row => String(row.matricola_snapshot || '').trim() === value)
    .length
}

function getDuplicateTesseraMatricole (rowsByCategory: Record<NsCategory, NsDetailRow[]> | null | undefined): string[] {
  const counts = new Map<string, number>()
  nsRowsByCategoryToFlat(rowsByCategory || EMPTY_NS_ROWS_BY_CATEGORY).filter(isTesseraNotaSpeseRow).forEach(row => {
    const value = String(row.matricola_snapshot || '').trim()
    if (!value) return
    counts.set(value, (counts.get(value) || 0) + 1)
  })
  return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([value]) => value).sort()
}

// Una riga è "incompleta" (non salvabile/da segnalare) se: per una tessera elettronica in
// RA manca la matricola o la matricola non ha esattamente 5 cifre; per qualunque altra riga
// (incluse le altre attrezzature RA) la quantità non è valorizzata.
function nsRowIncompleteReason (row: NsDetailRow): 'matricola' | 'quantita' | null {
  if (isTesseraNotaSpeseRow(row)) {
    return isValidTesseraMatricola(row.matricola_snapshot) ? null : 'matricola'
  }
  return nsSafeNum(row.quantita, 0) <= 0 ? 'quantita' : null
}

function nsRowIsIncomplete (row: NsDetailRow): boolean {
  return nsRowIncompleteReason(row) != null
}

function hasNotaSpeseIncompleteRowsForCasistica (rowsByCategory: Record<NsCategory, NsDetailRow[]> | null | undefined, codice: string): boolean {
  return getNotaSpeseFlatRowsForCasistica(rowsByCategory, codice).some(nsRowIsIncomplete)
}

function getNotaSpeseCasisticheWithExistingRows (attrs: Record<string, any>, rowsByCategory: Record<NsCategory, NsDetailRow[]> | null | undefined): NsCasisticaOption[] {
  const byCode = new Map<string, NsCasisticaOption>()
  getNotaSpeseCasistiche(attrs).forEach(opt => byCode.set(opt.codice, opt))
  NS_CASISTICHE_BY_ART.forEach(opt => {
    if (hasNotaSpeseRowsForCasistica(rowsByCategory, opt.codice)) byCode.set(opt.codice, opt)
  })
  return Array.from(byCode.values()).sort((a, b) => a.art - b.art)
}

function getSelectedViolazioniCount (attrs: Record<string, any>, art15Selected?: boolean): number {
  const seen = new Set<string>()
  const add = (code: string) => { if (code) seen.add(code) }
  if (art15Selected || String(attrs?.norma15_parziale || '').trim() || String(attrs?.norma15_totale || '').trim()) add('Art15')
  if (String(attrs?.norma16_17 || '').trim()) add(String(attrs?.norma16_17).trim())
  parseNorma3Codes(attrs?.norma_violata3).forEach(add)
  return seen.size
}

function filterRowsByCasistica (src: Record<NsCategory, NsDetailRow[]>, codice: string, riferimentoId?: string): Record<NsCategory, NsDetailRow[]> {
  const out = nsCloneRowsByCategory(EMPTY_NS_ROWS_BY_CATEGORY)
  const code = String(codice || '').trim()
  const ref = String(riferimentoId || '').trim()
  NS_CATEGORIES.forEach((cat) => {
    out[cat] = (src?.[cat] || [])
      .filter(r => String(r.codice_casistica || '').trim() === code && (!ref || String(r.riferimento_attrezzatura_id || '').trim() === ref))
      .map(nsCloneRow)
  })
  return out
}

function mergeCategoryRowsForCasistica (src: Record<NsCategory, NsDetailRow[]>, cat: NsCategory, codice: string, rows: NsDetailRow[], riferimentoId?: string): Record<NsCategory, NsDetailRow[]> {
  const code = String(codice || '').trim()
  const ref = String(riferimentoId || '').trim()
  const out = nsCloneRowsByCategory(src)
  const unchanged = (out[cat] || []).filter(r => !(String(r.codice_casistica || '').trim() === code && (!ref || String(r.riferimento_attrezzatura_id || '').trim() === ref))).map(nsCloneRow)
  const updated = (rows || []).map(r => nsCloneRow({ ...r, categoria_costo: cat, codice_casistica: code, riferimento_attrezzatura_id: ref || null }))
  out[cat] = [...unchanged, ...updated].sort((a, b) => {
    const ao = Math.trunc(nsSafeNum(a.ordine, 0))
    const bo = Math.trunc(nsSafeNum(b.ordine, 0))
    return ao !== bo ? ao - bo : Math.trunc(nsSafeNum(a.objectid, 0)) - Math.trunc(nsSafeNum(b.objectid, 0))
  })
  return out
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
  if (s === 'RA') return 'RA'
  return null
}

async function getFeatureLayerByUrl (rawUrl: any): Promise<any> {
  const url = ensureLayerIndex(normalizeFeatureLayerUrl(rawUrl))
  if (!url) throw new Error('URL layer/tabella non configurata.')
  if (__giiNsLayerCache[url]) return __giiNsLayerCache[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url })
  if (typeof fl.load === 'function') await fl.load()
  __giiNsLayerCache[url] = fl
  return fl
}

function requiresExplicitJsonQuery (rawUrl: any): boolean {
  const url = ensureLayerIndex(normalizeFeatureLayerUrl(rawUrl))
  return /\/(?:GII_VIEW_EB_NOTA_SPESE_DETTAGLIO|GII_VIEW_EB_REGOLAMENTO_ARTICOLI)\/FeatureServer\/\d+$/i.test(url)
}

async function queryFeatureLayerAttributesJson (rawUrl: any, where = '1=1', orderByFields = ''): Promise<any[]> {
  const url = ensureLayerIndex(normalizeFeatureLayerUrl(rawUrl))
  if (!url) throw new Error('URL layer/tabella non configurata.')
  const esriRequest = await loadEsriModule<any>('esri/request')
  const response = await esriRequest(`${url}/query`, {
    query: {
      f: 'json',
      where: where || '1=1',
      outFields: '*',
      returnGeometry: false,
      ...(orderByFields ? { orderByFields } : {})
    },
    responseType: 'json'
  })
  const data = response?.data || response || {}
  if (data?.error) {
    throw new Error(String(data.error?.message || 'Errore nella query JSON.'))
  }
  return (Array.isArray(data?.features) ? data.features : []).map((f: any) => f?.attributes || {})
}

async function queryTableAttributes (rawUrl: any, where = '1=1', orderByFields = ''): Promise<any[]> {
  if (requiresExplicitJsonQuery(rawUrl)) {
    return await queryFeatureLayerAttributesJson(rawUrl, where, orderByFields)
  }
  const fl = await getFeatureLayerByUrl(rawUrl)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = where || '1=1'
  q.outFields = ['*']
  q.returnGeometry = false
  if (orderByFields) q.orderByFields = [orderByFields]
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((f: any) => f?.attributes || {})
}

function getLayerFieldName (fl: any, name: string): string {
  const needle = String(name || '').toLowerCase()
  const field = ((fl?.fields || []) as any[]).find((f: any) => String(f?.name || '').toLowerCase() === needle)
  return String(field?.name || name)
}

function getExistingLayerFieldName (fl: any, name: string): string {
  const needle = String(name || '').toLowerCase()
  const field = ((fl?.fields || []) as any[]).find((f: any) => String(f?.name || '').toLowerCase() === needle)
  return String(field?.name || '')
}

function art30ParameterOutFields (fl: any): string[] {
  const wanted = [
    'categoria_parametro',
    'codice_parametro',
    'descrizione',
    'valore_testo',
    'valore_num',
    'data_validita_da',
    'data_validita_a',
    'attivo',
    String(fl?.objectIdField || 'OBJECTID')
  ]
  const out = wanted
    .map(name => getExistingLayerFieldName(fl, name))
    .filter(Boolean)
  return out.length > 0 ? Array.from(new Set(out)) : ['*']
}

async function queryArt30ParameterRows (rawUrl: any): Promise<any[]> {
  const fl = await getFeatureLayerByUrl(rawUrl)
  const categoryField = getExistingLayerFieldName(fl, 'categoria_parametro')
  const dateField = getExistingLayerFieldName(fl, 'data_validita_da')
  const objectIdField = getLayerFieldName(fl, String(fl?.objectIdField || 'OBJECTID'))
  const outFields = art30ParameterOutFields(fl)

  const run = async (where: string): Promise<any[]> => {
    const q = fl.createQuery ? fl.createQuery() : {}
    q.where = where || '1=1'
    q.outFields = outFields
    q.returnGeometry = false
    q.orderByFields = [
      ...(dateField ? [`${dateField} DESC`] : []),
      `${objectIdField} DESC`
    ]
    const res = await fl.queryFeatures(q)
    return (res?.features || []).map((f: any) => f?.attributes || {})
  }

  if (categoryField) {
    try {
      const filtered = await run(`UPPER(${categoryField}) IN ('ATTREZZATURA', 'CAUZIONE')`)
      if (filtered.length > 0) return filtered
    } catch {}
  }

  return await run('1=1')
}

const __giiArt30ParameterRowsCache: Record<string, Promise<any[]>> = {}

function loadArt30ParameterRows (rawUrl: any): Promise<any[]> {
  const url = ensureLayerIndex(normalizeFeatureLayerUrl(rawUrl))
  if (!url) return Promise.reject(new Error('URL layer/tabella non configurata.'))
  if (!__giiArt30ParameterRowsCache[url]) {
    __giiArt30ParameterRowsCache[url] = queryArt30ParameterRows(url).catch((err) => {
      delete __giiArt30ParameterRowsCache[url]
      throw err
    })
  }
  return __giiArt30ParameterRowsCache[url].then((rows) => {
    if (!rows || rows.length === 0) delete __giiArt30ParameterRowsCache[url]
    return rows
  })
}


type AttrezzaturaParametro = {
  codice: string
  descrizione: string
  valoreUnitario: number
}

function attrezzaturaKey (value: any): string {
  return String(value ?? '')
    .trim()
    .toLocaleUpperCase('it-IT')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// ID di istanza di un'attrezzatura recuperabile: <codiceTipoCatalogo>::<suffisso univoco>.
// Più istanze dello stesso tipo (es. due curve di derivazione) hanno lo stesso prefisso ma
// suffissi diversi — così restano righe di Nota spese separate. Il suffisso NON va mai usato
// per confronti: il matching delle righe resta sempre sull'ID intero (già garantito dagli
// helper generici filterRowsByCasistica/mergeCategoryRowsForCasistica). Questo helper serve
// solo a costruire un nuovo ID e a risalire al tipo per l'etichetta "Curva 1/2/..." in Combo 3.
function buildAttrezzaturaInstanceId (tipoCode: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `${tipoCode}::${suffix}`
}

function attrezzaturaInstanceTipoCode (instanceId: string): string {
  const idx = String(instanceId || '').indexOf('::')
  return idx >= 0 ? instanceId.slice(0, idx) : String(instanceId || '')
}

type AttrezzaturaTipo = {
  key: 'TESSERA_ELETTRONICA' | 'PARATOIA' | 'CURVA_DERIVAZIONE' | 'SIFONE'
  label: string
  order: number
}

function attrezzaturaTipo (value: any): AttrezzaturaTipo | null {
  const key = attrezzaturaKey(value)
  if (!key) return null
  if (key.includes('TESSERA')) return { key: 'TESSERA_ELETTRONICA', label: 'Tessera elettronica', order: 0 }
  if (key.includes('CURV')) return { key: 'CURVA_DERIVAZIONE', label: 'Curva di derivazione', order: 1 }
  if (key.includes('SIFON')) return { key: 'SIFONE', label: 'Sifone', order: 2 }
  if (key.includes('PARATOIA')) return { key: 'PARATOIA', label: 'Paratoia', order: 3 }
  return null
}

function isTruthyParameterFlag (value: any): boolean {
  if (value === 1 || value === true) return true
  const s = String(value ?? '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'si' || s === 'sì' || s === 'yes'
}

function parameterDateTs (value: any): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  if (Number.isFinite(n) && n > 0) return n
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

function buildAttrezzatureParametersFromRows (rows: any[], referenceDate?: any): AttrezzaturaParametro[] {
  const refTs = parameterDateTs(referenceDate) ?? Date.now()

  const candidates = rows
    .filter(row => {
      const categoria = attrezzaturaKey(row?.categoria_parametro)
      // La vista può essere già filtrata sulle attrezzature e non esporre la categoria.
      return !categoria || categoria === 'ATTREZZATURA'
    })
    .filter(row => row?.attivo == null || row?.attivo === '' || isTruthyParameterFlag(row?.attivo))
    .map(row => {
      const codice = String(row?.codice_parametro ?? '').trim()
      const descrizioneOrigine = String(row?.descrizione ?? row?.valore_testo ?? row?.codice_parametro ?? '').trim()
      const tipo = attrezzaturaTipo(`${codice} ${descrizioneOrigine}`)
      const valoreUnitario = Number(row?.valore_num)
      const from = parameterDateTs(row?.data_validita_da)
      const to = parameterDateTs(row?.data_validita_a)
      const vigente = (from == null || from <= refTs) && (to == null || to >= refTs)
      return { codice, descrizione: tipo?.label || '', valoreUnitario, tipo, vigente }
    })
    .filter(row => !!row.tipo && Number.isFinite(row.valoreUnitario) && row.valoreUnitario >= 0)

  const tipi: AttrezzaturaTipo[] = [
    { key: 'TESSERA_ELETTRONICA', label: 'Tessera elettronica', order: 0 },
    { key: 'CURVA_DERIVAZIONE', label: 'Curva di derivazione', order: 1 },
    { key: 'SIFONE', label: 'Sifone', order: 2 },
    { key: 'PARATOIA', label: 'Paratoia', order: 3 }
  ]

  return tipi.flatMap(tipo => {
    const perTipo = candidates.filter(row => row.tipo?.key === tipo.key)
    // Si preferisce il prezzo vigente alla data della rilevazione. Se manca,
    // si conserva comunque la tipologia usando l'ultima voce attiva disponibile,
    // evitando che Curva di derivazione o Sifone spariscano dal popup.
    const selected = perTipo.find(row => row.vigente) || perTipo[0]
    if (!selected) return []
    return [{ codice: selected.codice, descrizione: tipo.label, valoreUnitario: selected.valoreUnitario }]
  })
}


function buildCauzioneParameterFromRows (rows: any[], referenceDate?: any): number {
  const refTs = parameterDateTs(referenceDate) ?? Date.now()
  const candidates = rows
    .filter(row => String(row?.categoria_parametro ?? '').trim().toUpperCase() === 'CAUZIONE')
    .filter(row => row?.attivo == null || row?.attivo === '' || isTruthyParameterFlag(row?.attivo))
    .filter(row => {
      const from = parameterDateTs(row?.data_validita_da)
      const to = parameterDateTs(row?.data_validita_a)
      return (from == null || from <= refTs) && (to == null || to >= refTs)
    })
    .map(row => ({
      valore: Number(row?.valore_num),
      chiave: attrezzaturaKey(`${row?.codice_parametro ?? ''} ${row?.descrizione ?? ''}`)
    }))
    .filter(row => Number.isFinite(row.valore) && row.valore >= 0)

  const preferred = candidates.find(row => row.chiave.includes('CAUZIONE') && row.chiave.includes('TESSERA'))
    || candidates.find(row => row.chiave.includes('CAUZIONE'))
    || candidates[0]
  return preferred ? Math.round(preferred.valore * 100) / 100 : 0
}

async function loadArt30ParametersBundle (rawUrl: any, referenceDate?: any): Promise<{ attrezzature: AttrezzaturaParametro[]; cauzione: number }> {
  const rows = await loadArt30ParameterRows(rawUrl)
  return {
    attrezzature: buildAttrezzatureParametersFromRows(rows, referenceDate),
    cauzione: buildCauzioneParameterFromRows(rows, referenceDate)
  }
}

async function loadRecordAttrsByOid (rawUrl: any, oidFieldName: string, oid: number): Promise<Record<string, any>> {
  const fl = await getFeatureLayerByUrl(rawUrl)
  const q = fl.createQuery ? fl.createQuery() : {}
  const idField = String(fl?.objectIdField || oidFieldName || 'OBJECTID')
  q.where = `${idField} = ${Number(oid)}`
  q.outFields = ['*']
  q.returnGeometry = false
  q.num = 1
  const res = await fl.queryFeatures(q)
  return res?.features?.[0]?.attributes || {}
}

async function loadRecordGlobalIdByOid (rawUrl: any, oidFieldName: string, oid: number): Promise<string> {
  const attrs = await loadRecordAttrsByOid(rawUrl, oidFieldName, oid)
  return String(pickAttrCI(attrs, ['GlobalID', 'globalid', 'GLOBALID']) || '').trim()
}

async function getNsPercentuale (rawUrl: any, codice: string): Promise<number> {
  const code = String(codice || 'SPESE_GENERALI_PERC').trim() || 'SPESE_GENERALI_PERC'
  const rows = await queryTableAttributes(rawUrl, `codice_parametro = '${nsEscapeSqlString(code)}'`, 'attivo DESC, anno_riferimento DESC, data_validita_da DESC, OBJECTID DESC')
  const row = rows.find((r: any) => nsSafeNum(r?.attivo, 1) === 1) || rows[0] || null
  return row ? nsRound(nsSafeNum((row as any).valore_num, 0), 2) : 0
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
  return rows.map((r: any) => {
    const cat = nsNormalizeCategory(r?.categoria_costo) || category || null
    if (!cat) return null // categoria non tra le 5 gestite qui (es. RA): esclusa, non forzata a PR
    return {
      objectid: nsSafeNum(pickAttrCI(r, ['OBJECTID', 'objectid']), 0),
      categoria_costo: cat as NsCategory,
      origine_voce_snapshot: nsNormalizeSource(r?.origine_voce_snapshot || 'REGIONE'),
      codice_voce_snapshot: String(r?.codice_voce_snapshot || '').trim(),
      descrizione_snapshot: String(r?.descrizione_snapshot || '').trim(),
      unita_misura_snapshot: String(r?.unita_misura_snapshot || '').trim(),
      prezzo_unitario_snapshot: nsRound(nsSafeNum(r?.prezzo_unitario_snapshot ?? r?.costo_unitario_snapshot, 0), 4),
      quantita: nsRound(nsSafeNum(r?.quantita, 0), 4),
      importo_riga: nsRound(nsSafeNum(r?.importo_riga, 0), 2),
      anno_prezzario_snapshot: r?.anno_prezzario_snapshot != null ? Math.trunc(nsSafeNum(r?.anno_prezzario_snapshot, 0)) : null,
      ordine: Math.trunc(nsSafeNum(r?.ordine, 0)),
      note: String(r?.note || '').trim(),
      codice_casistica: String(r?.codice_casistica || '').trim() || null,
      riferimento_attrezzatura_id: String(r?.riferimento_attrezzatura_id || '').trim() || null,
      matricola_snapshot: r?.matricola_snapshot != null ? String(r.matricola_snapshot).trim() || null : null,
      cauzione_decurtata: !!r?.cauzione_decurtata
    }
  }).filter((row) => row !== null) as NsDetailRow[]
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
    put('codice_casistica', String(row.codice_casistica || '').trim() || null)
    put('riferimento_attrezzatura_id', String(row.riferimento_attrezzatura_id || '').trim() || null)
    put('matricola_snapshot', row.matricola_snapshot != null ? String(row.matricola_snapshot).trim() || null : null)
    put('cauzione_decurtata', row.cauzione_decurtata ? 1 : 0)
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
  const totaleRA = sumBy('RA') // risarcimento attrezzature Art.30: nessun markup, si somma netto
  const base = nsRound(totaleAT + totalePR + totaleRU + totaleSL + totalePF, 2)
  const perc = await getNsPercentuale(opts.parametriUrl, opts.parametroCode)
  const importoSpeseGenerali = nsRound(base * nsSafeNum(perc, 0) / 100, 2)
  const totaleComplessivo = nsRound(base + importoSpeseGenerali + totaleRA, 2)
  const summary: NsSummary = {
    totaleAT,
    totalePR,
    totaleRU,
    totaleSL,
    totalePF,
    totaleRA,
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
  const formStyle = React.useContext(FormStyleCtx)
  const rows = React.useMemo(() => (props.rows || []).map(nsCloneRow), [props.rows])
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [editIdx, setEditIdx] = React.useState<number | null>(null)
  const [editQty, setEditQty] = React.useState('')
  const [editMatricola, setEditMatricola] = React.useState('')
  const [editCauzione, setEditCauzione] = React.useState(false)
  const [confirmDeleteIdx, setConfirmDeleteIdx] = React.useState<number | null>(null)
  const editCardRef = React.useRef<HTMLDivElement | null>(null)

  const isTesseraRow = (r: NsDetailRow) => props.category === 'RA' && !isRecuperableTesseraMetaRow(r) && attrezzaturaTipo(r.descrizione_snapshot)?.key === 'TESSERA_ELETTRONICA'
  // La colonna Matricola ha senso solo per la tabella Risarcimento attrezzatura (Art.30):
  // nelle altre categorie di spesa non esiste alcuna tessera/matricola da mostrare.
  const showMatricola = props.category === 'RA'
  // Elenco ordinato per codice attrezzatura (solo per la visualizzazione): conserva l'indice
  // originale della riga in "rows", indispensabile per Modifica/Elimina che operano su quell'array.
  const sortedRowsForDisplay = React.useMemo(() => {
    return rows
      .map((row, idx) => ({ row, idx }))
      .sort((a, b) => String(a.row.codice_voce_snapshot || '').localeCompare(String(b.row.codice_voce_snapshot || ''), 'it', { numeric: true, sensitivity: 'base' }))
  }, [rows])

  React.useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), 5000); return () => window.clearTimeout(t) }, [msg])
  React.useEffect(() => { setEditIdx(null); setEditQty(''); setEditMatricola(''); setEditCauzione(false) }, [props.resetKey])

  const money = (n: any) => nsSafeNum(n, 0).toLocaleString('it-IT', { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const categoryTotal = React.useMemo(() => nsRound(rows.reduce((s, r) => s + nsSafeNum(r.importo_riga, 0), 0), 2), [rows])
  const cardRadius = Math.max(0, Number(formStyle.cardBorderRadius) || 0)

  const startEdit = (idx: number) => {
    if (props.readonly) return
    setEditIdx(idx)
    const r = rows[idx]
    if (isTesseraRow(r)) {
      setEditMatricola(String(r?.matricola_snapshot || ''))
      setEditCauzione(!!r?.cauzione_decurtata)
    } else {
      setEditQty(String(r?.quantita ?? ''))
    }
  }

  const cancelEdit = () => { setEditIdx(null); setEditQty(''); setEditMatricola(''); setEditCauzione(false) }

  const saveEdit = () => {
    if (props.readonly) return
    if (editIdx == null || editIdx < 0 || editIdx >= rows.length) return
    const editingTessera = isTesseraRow(rows[editIdx])
    if (editingTessera && !isValidTesseraMatricola(editMatricola)) {
      setMsg({ ok: false, text: 'La matricola deve avere esattamente 5 cifre numeriche.' })
      return
    }
    if (editingTessera) {
      const value = editMatricola.trim()
      const currentValue = String(rows[editIdx]?.matricola_snapshot || '').trim()
      const used = props.matricolaUsageCount ? props.matricolaUsageCount(value) : 0
      const usedByOtherRows = used - (currentValue === value ? 1 : 0)
      if (usedByOtherRows > 0) {
        setMsg({ ok: false, text: `La matricola ${value} risulta già associata a un’altra tessera della stessa pratica.` })
        return
      }
    }
    if (!editingTessera) {
      const qtyCheck = nsRound(nsSafeNum(String(editQty).replace(',', '.'), 0), 4)
      if (qtyCheck <= 0) {
        setMsg({ ok: false, text: 'La quantità deve essere maggiore di zero.' })
        return
      }
    }
    const nextRows = rows.map((r, i) => {
      if (i !== editIdx) return nsCloneRow(r)
      const updated = nsCloneRow(r)
      if (isTesseraRow(r)) {
        const cauzioneUnit = Number(props.cauzioneUnitaria) || 0
        updated.quantita = 1
        updated.matricola_snapshot = editMatricola.trim() || null
        updated.cauzione_decurtata = editCauzione
        updated.importo_riga = nsRound(nsSafeNum(r.prezzo_unitario_snapshot, 0) - (editCauzione ? cauzioneUnit : 0), 2)
      } else {
        const qty = nsRound(nsSafeNum(String(editQty).replace(',', '.'), 0), 4)
        updated.quantita = qty
        updated.importo_riga = nsRound(qty * nsSafeNum(r.prezzo_unitario_snapshot, 0), 2)
      }
      return updated
    })
    props.onRowsChange(nextRows)
    setEditIdx(null)
    setEditQty('')
    setEditMatricola('')
    setEditCauzione(false)
  }

  const onDelete = (idx: number) => {
    if (props.readonly) return
    const row = rows[idx]
    if (!row) return
    setConfirmDeleteIdx(idx)
  }

  const doDelete = () => {
    if (props.readonly) { setConfirmDeleteIdx(null); return }
    const idx = confirmDeleteIdx
    setConfirmDeleteIdx(null)
    if (idx == null || idx < 0 || idx >= rows.length) return
    const nextRows = rows.filter((_, i) => i !== idx).map(nsCloneRow)
    props.onRowsChange(nextRows)
    if (editIdx === idx) { setEditIdx(null); setEditQty('') }
    setMsg({ ok: true, text: 'Riga rimossa dalla nota spese.' })
  }

  const thS: React.CSSProperties = { background: '#eef5fc', color: formStyle.hdrColor, padding: '7px 8px', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1, fontSize: 12, whiteSpace: 'nowrap', borderBottom: '1px solid #c5d9f1' }
  const tdS = (idx: number): React.CSSProperties => ({ padding: '6px 8px', borderBottom: '1px solid #e0eaf4', background: idx % 2 === 0 ? '#f5f9ff' : '#fff', fontSize: 12 })

  return (
    <div style={{ border: '1px solid #b9d1ea', borderRadius: cardRadius, overflow: 'hidden', background: '#fff' }}>
      <div style={{ background: formStyle.cardHeaderBg, color: formStyle.cardHeaderColor, padding: `${formStyle.cardHeaderPaddingY}px ${formStyle.cardHeaderPaddingX}px`, fontSize: formStyle.cardHeaderFontSize, fontWeight: formStyle.cardHeaderFontWeight as any, letterSpacing: 0.25, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }}>
        <span>{String(props.title || '').toLocaleUpperCase('it-IT')}</span>
        <span style={{ fontSize: formStyle.cardHeaderFontSize, opacity: 0.9 }}>{money(categoryTotal)} €</span>
      </div>
      <div style={{ padding: 0, display: 'grid', gap: 0 }}>
        {msg && (props.readonly || editIdx == null || editIdx < 0 || editIdx >= rows.length) && (
          <div style={{ margin: '8px 10px', padding: '7px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700, border: `1px solid ${msg.ok ? '#b8d4b0' : '#f5b8b8'}`, background: msg.ok ? '#e2efda' : '#fce4e4', color: msg.ok ? '#375623' : '#c00' }}>{msg.text}</div>
        )}
        {!props.readonly && editIdx != null && editIdx >= 0 && editIdx < rows.length && (
          <div ref={editCardRef} style={{ margin: '8px 10px', padding: 8, border: '1px solid #aac4e0', borderRadius: 8, background: '#f5f9ff', display: 'grid', gap: 6 }}>
            {msg && (
              <div style={{ padding: '7px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700, border: `1px solid ${msg.ok ? '#b8d4b0' : '#f5b8b8'}`, background: msg.ok ? '#e2efda' : '#fce4e4', color: msg.ok ? '#375623' : '#c00' }}>{msg.text}</div>
            )}
            {isTesseraRow(rows[editIdx]) ? (
              <>
                <div style={{ fontSize: 12, color: '#1F4E79', fontWeight: 700 }}>Tessera elettronica</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#444' }}>Matricola (5 cifre)</span>
                  <input type='text' inputMode='numeric' value={editMatricola} onChange={(e) => setEditMatricola(e.target.value.replace(/\D/g, '').slice(0, 5))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} maxLength={5} placeholder='00000' style={{ width: 70, padding: '5px 8px', border: '1px solid #aac4e0', borderRadius: 4, fontSize: 13, textAlign: 'right' }} autoFocus />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#444', cursor: 'pointer', margin: 0 }}>
                    <input type='checkbox' checked={editCauzione} onChange={(e) => setEditCauzione(e.target.checked)} style={{ margin: 0 }} />
                    Decurtazione cauzione
                  </label>
                  <span style={{ fontSize: 12, color: '#375623', fontWeight: 700 }}>{money(editCauzione ? (Number(props.cauzioneUnitaria) || 0) : 0)} €</span>
                  <button type='button' onClick={saveEdit} style={{ padding: '4px 14px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#1F4E79', color: '#fff', cursor: 'pointer' }}>Aggiorna</button>
                  <button type='button' onClick={cancelEdit} style={{ padding: '4px 14px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#e0e0e0', color: '#333', cursor: 'pointer' }}>Annulla</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: '#1F4E79', fontWeight: 700 }}>Modifica quantità — {rows[editIdx].codice_voce_snapshot}</div>
                <div style={{ fontSize: 12, color: '#444' }}>{rows[editIdx].descrizione_snapshot}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type='text' inputMode='decimal' value={editQty} onChange={(e) => setEditQty(e.target.value.replace(',', '.'))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} style={{ width: 100, padding: '5px 8px', border: '1px solid #aac4e0', borderRadius: 4, fontSize: 13 }} autoFocus />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{rows[editIdx].unita_misura_snapshot || 'u.m.'}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>×</span>
                  <span style={{ fontSize: 12, color: '#375623', fontWeight: 700 }}>{money(rows[editIdx].prezzo_unitario_snapshot)}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>=</span>
                  <span style={{ fontSize: 12, color: '#1F4E79', fontWeight: 700 }}>{money(nsRound(nsSafeNum(String(editQty).replace(',', '.'), 0) * nsSafeNum(rows[editIdx].prezzo_unitario_snapshot, 0), 2))}</span>
                  <button type='button' onClick={saveEdit} style={{ padding: '4px 14px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#1F4E79', color: '#fff', cursor: 'pointer' }}>Aggiorna</button>
                  <button type='button' onClick={cancelEdit} style={{ padding: '4px 14px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#e0e0e0', color: '#333', cursor: 'pointer' }}>Annulla</button>
                </div>
              </>
            )}
          </div>
        )}
        <div style={{ border: 'none', borderRadius: 0, minHeight: 60, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 52 }} />
              <col />
              {showMatricola && <col style={{ width: 85 }} />}
              {showMatricola && <col style={{ width: 70 }} />}
              <col style={{ width: 70 }} />
              <col style={{ width: 85 }} />
              <col style={{ width: 85 }} />
              <col style={{ width: 85 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thS}>Orig.</th>
                <th style={thS}>Voce</th>
                {showMatricola && <th style={{ ...thS, textAlign: 'right' }}>Matricola</th>}
                {showMatricola && <th style={{ ...thS, textAlign: 'center' }}>Cauzione</th>}
                <th style={{ ...thS, textAlign: 'right' }}>Quantità</th>
                <th style={{ ...thS, textAlign: 'right' }}>Prezzo (€)</th>
                <th style={{ ...thS, textAlign: 'right' }}>Importo (€)</th>
                <th style={{ ...thS, textAlign: 'center' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={showMatricola ? 8 : 6} style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12 }}>Nessuna riga.</td></tr>
              ) : sortedRowsForDisplay.map(({ row: r, idx }, displayIdx) => {
                const noQty = nsSafeNum(r.quantita, 0) <= 0
                const tessera = isTesseraRow(r)
                const matricolaInvalid = tessera && !isValidTesseraMatricola(r.matricola_snapshot)
                return (
                <tr key={`${r.objectid || 'tmp'}-${idx}`}>
                  <td style={tdS(displayIdx)}><div style={{ whiteSpace: 'pre-line', lineHeight: 1.1 }}>{`${nsSourceShort(nsNormalizeSource(r.origine_voce_snapshot))}${r.anno_prezzario_snapshot ? `\n${r.anno_prezzario_snapshot}` : ''}`}</div></td>
                  <td style={{ ...tdS(displayIdx), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${r.codice_voce_snapshot} — ${r.descrizione_snapshot}`}><b>{r.codice_voce_snapshot}</b> — {r.descrizione_snapshot}</td>
                  {showMatricola && (
                    <td style={{ ...tdS(displayIdx), textAlign: 'right', ...(matricolaInvalid ? { background: '#fff3cd', fontWeight: 700, color: '#856404' } : {}) }}>{tessera ? (r.matricola_snapshot || '—') : '—'}</td>
                  )}
                  {showMatricola && (
                    <td style={{ ...tdS(displayIdx), textAlign: 'center' }}>{tessera ? (r.cauzione_decurtata ? 'Sì' : 'No') : '—'}</td>
                  )}
                  <td style={{ ...tdS(displayIdx), textAlign: 'right', ...((!tessera && noQty) ? { background: '#fff3cd', fontWeight: 700, color: '#856404' } : {}) }}>{noQty ? '—' : `${nsSafeNum(r.quantita, 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 })} ${r.unita_misura_snapshot || ''}`}</td>
                  <td style={{ ...tdS(displayIdx), textAlign: 'right' }}>{money(r.prezzo_unitario_snapshot)}</td>
                  <td style={{ ...tdS(displayIdx), textAlign: 'right' }}>{money(tessera ? nsRound(nsSafeNum(r.prezzo_unitario_snapshot, 0) * nsSafeNum(r.quantita, 0), 2) : r.importo_riga)}</td>
                  <td style={{ ...tdS(displayIdx), whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {!props.readonly ? (
                      <>
                        <button type='button' onClick={() => startEdit(idx)} title='Modifica riga' aria-label='Modifica riga' style={{ border: 'none', background: 'transparent', color: '#0d3b66', cursor: 'pointer', padding: 4, marginRight: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
                            <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
                            <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
                          </svg>
                        </button>
                        <button type='button' onClick={() => onDelete(idx)} title='Elimina riga' aria-label='Elimina riga' style={{ border: 'none', background: 'transparent', color: '#b42318', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
                            <path d='M3 6h18'/>
                            <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
                            <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
                            <path d='M10 11v6'/>
                            <path d='M14 11v6'/>
                          </svg>
                        </button>
                      </>
                    ) : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                </tr>
              )})}
              {showMatricola && (() => {
                const cauzioneRows = rows.filter(r => isTesseraRow(r) && r.cauzione_decurtata)
                if (cauzioneRows.length === 0) return null
                const cauzioneUnit = Number(props.cauzioneUnitaria) || 0
                const cauzioneTotale = cauzioneRows.reduce((sum, r) => sum + nsRound(nsSafeNum(r.prezzo_unitario_snapshot, 0) - nsSafeNum(r.importo_riga, 0), 2), 0)
                const idx = rows.length
                return (
                  <tr>
                    <td style={tdS(idx)}></td>
                    <td style={tdS(idx)}>Decurtazione cauzione</td>
                    <td style={{ ...tdS(idx), textAlign: 'right' }}>—</td>
                    <td style={{ ...tdS(idx), textAlign: 'center' }}>—</td>
                    <td style={{ ...tdS(idx), textAlign: 'right' }}>{cauzioneRows.length} pz</td>
                    <td style={{ ...tdS(idx), textAlign: 'right' }}>{money(cauzioneUnit)}</td>
                    <td style={{ ...tdS(idx), textAlign: 'right', color: '#b42318', fontWeight: 700 }}>{cauzioneTotale > 0 ? `- ${money(cauzioneTotale)}` : money(0)}</td>
                    <td style={tdS(idx)}></td>
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>
      </div>
      <SpotlightInteractionLockOverlay active={!props.readonly && editIdx != null && editIdx >= 0 && editIdx < rows.length} targetRef={editCardRef} />
      {confirmDeleteIdx != null && confirmDeleteIdx >= 0 && confirmDeleteIdx < rows.length && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#f8fbff', borderRadius: 12, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Eliminare la riga?</div>
            <div style={{ fontSize: 15, color: '#4b5563', marginBottom: 20 }}>{rows[confirmDeleteIdx].codice_voce_snapshot} — {rows[confirmDeleteIdx].descrizione_snapshot}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type='button' onClick={doDelete} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#d13438', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Sì, elimina</button>
              <button type='button' onClick={() => setConfirmDeleteIdx(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', background: '#f8fbff', color: '#111827', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Annulla</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const GII_NS_CART_KEY = 'GII_NS_CART'
const GII_NS_DRAFT_KEY_PREFIX = 'GII_NS_DRAFT'

function nsDraftStorageKey (oid: any, globalId: any): string {
  return `${GII_NS_DRAFT_KEY_PREFIX}:${String(oid || '').trim()}:${String(globalId || '').trim()}`
}

function nsReadDraftSnapshot (key: string): { rows: NsDetailRow[]; activeCasistica?: string } | null {
  if (!key) return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const rows = (Array.isArray(parsed?.rows) ? parsed.rows : []) as NsDetailRow[]
    return { rows, activeCasistica: String(parsed?.activeCasistica || '').trim() }
  } catch {
    return null
  }
}

function nsWriteDraftSnapshot (key: string, rowsByCategory: Record<NsCategory, NsDetailRow[]>, activeCasistica: string): void {
  if (!key) return
  try {
    sessionStorage.setItem(key, JSON.stringify({
      ts: Date.now(),
      activeCasistica: String(activeCasistica || '').trim(),
      rows: nsRowsByCategoryToFlat(rowsByCategory)
    }))
  } catch {}
}

function nsClearDraftSnapshot (key: string): void {
  if (!key) return
  try { sessionStorage.removeItem(key) } catch {}
}

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
  // Campo binario Sì/No: per persona giuridica il domicilio notifiche del rappresentante
  // parte da No, lasciando comunque all'operatore la possibilità di scegliere Sì.
  if (out.rl_dom_notifica == null || out.rl_dom_notifica === '') out.rl_dom_notifica = '0'
  if (out.norma_violata3 != null && out.norma_violata3 !== '') out.norma_violata3 = normalizeNorma3Value(out.norma_violata3)
  return out
}

function normalizeLogValue (v: any): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : String(v.getTime())
  return String(v).trim()
}

function normalizeDraftComparableValue (fieldName: string, v: any): string {
  const k = String(fieldName || '').trim().toLowerCase()

  // I flag v_artXX possono arrivare dal layer come null/0/stringa vuota.
  // Nel draft, selezionando e poi deselezionando una violazione, il valore diventa 0.
  // Ai fini del dirty-state, tutti i valori non selezionati devono quindi equivalere a vuoto,
  // altrimenti Salva/Annulla restano attivi anche dopo il ripristino della selezione iniziale.
  if (/^v_art\d+$/i.test(k)) {
    const s = String(v ?? '').trim().toLowerCase()
    return (v === 1 || v === true || s === '1' || s === 'true' || s === 'sì' || s === 'si') ? '1' : ''
  }

  if (k === 'norma_violata3') {
    return parseNorma3Codes(v).sort().join(' ')
  }

  return normalizeLogValue(v)
}

function draftsEqual (a: NpDraft, b: NpDraft): boolean {
  const keys = Array.from(new Set([...(Object.keys(a || {})), ...(Object.keys(b || {}))]))
  for (const k of keys) {
    if (normalizeDraftComparableValue(k, a?.[k]) !== normalizeDraftComparableValue(k, b?.[k])) return false
  }
  return true
}

function getRapportoTecnicoNumberFromData (data: any): string {
  const d = data || {}
  return String(
    d?.numero_rapporto_tecnico ?? d?.Numero_rapporto_tecnico ?? d?.NUMERO_RAPPORTO_TECNICO ??
    d?.numero_rapporto ?? d?.Numero_rapporto ?? d?.NUMERO_RAPPORTO ??
    d?.codice_rapporto ?? d?.Codice_rapporto ?? d?.CODICE_RAPPORTO ??
    d?.n_rapporto ?? d?.N_RAPPORTO ?? ''
  ).trim()
}

function buildPraticaCodeFromData (data: any, oid: number | null | undefined): string {
  const rapportoTecnico = getRapportoTecnicoNumberFromData(data)
  if (rapportoTecnico) return rapportoTecnico

  if (oid == null || !Number.isFinite(Number(oid))) return ''
  const op = data?.origine_pratica ?? data?.Origine_pratica ?? data?.ORIGINE_PRATICA
  let prefix = 'TR'
  if (op === 2 || op === '2' || String(op || '').toUpperCase() === 'IT') prefix = 'IT'
  else if (op === 1 || op === '1' || String(op || '').toUpperCase() === 'TR') prefix = 'TR'

  const settoreRaw = data?.settore_cod ?? data?.Settore_cod ?? data?.SETTORE_COD ?? data?.settore ?? data?.Settore ?? data?.SETTORE
  const settore = String(settoreRaw || '').trim().toUpperCase()
  const settoreSuffix = settore ? `-${settore}` : ''

  return `${Number(oid)}-${prefix}${settoreSuffix}`
}

function buildFascicoloDocumentaleTitleParts (data: any, oid: number | null | undefined): { prefix: string, code: string, full: string } {
  const d = data || {}
  const rapportoTecnico = getRapportoTecnicoNumberFromData(d)
  if (rapportoTecnico) {
    const prefix = 'Fascicolo documentale della pratica relativa al Rapporto tecnico n. '
    return { prefix, code: rapportoTecnico, full: `${prefix}${rapportoTecnico}` }
  }

  const rilevazione = buildPraticaCodeFromData(d, oid)
  if (rilevazione) {
    const prefix = 'Fascicolo documentale della pratica relativa alla Rilevazione n. '
    return { prefix, code: rilevazione, full: `${prefix}${rilevazione}` }
  }

  const prefix = 'Fascicolo documentale della pratica'
  return { prefix, code: '', full: prefix }
}

function giiReadLayoutSidebarBoundaryX (host: HTMLElement | null): number | null {
  if (!host) return null
  try {
    let cur: HTMLElement | null = host.parentElement
    while (cur && cur !== document.body) {
      if ((cur.className || '').includes('widget-sidebar-layout')) {
        const inner = cur.children[0] as HTMLElement
        const normal = Array.from(inner?.children || []).find(c => c.className.includes('side-normal')) as HTMLElement | undefined
        // Verifica che questo pannello contenga il widget editing
        if (normal?.contains(host)) {
          const collapsable = Array.from(inner?.children || []).find(c => c.className.includes('side-collapsable')) as HTMLElement | undefined
          if (collapsable) {
            const r = cur.getBoundingClientRect()
            const nr = normal.getBoundingClientRect()
            return nr.right
          }
        }
      }
      cur = cur.parentElement
    }
  } catch {}
  return null
}

function giiReadLayoutSidebarDefaultBoundaryX (host: HTMLElement | null): number | null {
  if (!host) return null
  try {
    let cur: HTMLElement | null = host.parentElement
    while (cur && cur !== document.body) {
      if ((cur.className || '').includes('widget-sidebar-layout')) {
        const inner = cur.children[0] as HTMLElement | undefined
        const normal = Array.from(inner?.children || []).find(c => c.className.includes('side-normal')) as HTMLElement | undefined
        if (!normal?.contains(host)) { cur = cur.parentElement; continue }
        const r = cur.getBoundingClientRect()
        if (!Number.isFinite(r.left) || !Number.isFinite(r.width) || r.width <= 0) return null
        // Default del Builder: 50% della Sidebar orizzontale.
        return r.left + (r.width / 2)
      }
      cur = cur.parentElement
    }
  } catch {}
  return null
}

function giiMoveNearestLayoutSidebarToX (host: HTMLElement | null, targetX: number | null): void {
  if (!host || targetX == null || !Number.isFinite(Number(targetX))) return
  try {
    const currentX = giiReadLayoutSidebarBoundaryX(host)
    if (currentX != null && Number.isFinite(Number(currentX)) && Math.abs(Number(currentX) - Number(targetX)) <= 2) return
    let cur: HTMLElement | null = host.parentElement
    while (cur && cur !== document.body) {
      if ((cur.className || '').includes('widget-sidebar-layout')) {
        const inner = cur.children[0] as HTMLElement | undefined
        if (!inner) { cur = cur.parentElement; continue }
        const normal = Array.from(inner.children).find(c => c.className.includes('side-normal')) as HTMLElement | undefined
        if (!normal?.contains(host)) { cur = cur.parentElement; continue }
        const divider = inner.children[1] as HTMLElement | undefined
        if (!divider) return
        const dr = divider.getBoundingClientRect()
        const startX = dr.left + dr.width / 2
        const y = dr.top + dr.height / 2
        const fire = (target: EventTarget, type: string, x: number, buttons: number) => {
          const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons }
          try {
            if (typeof PointerEvent !== 'undefined') {
              target.dispatchEvent(new PointerEvent(type, { ...opts, pointerId: 1, pointerType: 'mouse', isPrimary: true }))
            } else {
              target.dispatchEvent(new MouseEvent(type.replace('pointer', 'mouse'), opts))
            }
          } catch {}
        }
        fire(divider, 'pointerdown', startX, 1)
        const steps = 12
        for (let i = 1; i <= steps; i++) {
          const x = startX + ((Number(targetX) - startX) * i / steps)
          // L'evento deve avere come target il divisore reale. Facendolo partire da
          // document, il DnD di ExB riceve un target privo di rettangolo e può
          // fallire con "Cannot read properties of undefined (reading 'left')".
          fire(divider, 'pointermove', x, 1)
        }
        fire(divider, 'pointerup', Number(targetX), 0)
        return
      }
      cur = cur.parentElement
    }
  } catch {}
}

function giiPlainObject<T = any> (value: any): T {
  try {
    if (value?.asMutable) return value.asMutable({ deep: true }) as T
    if (value?.toJS) return value.toJS() as T
  } catch {}
  return value as T
}

function giiResolveMapWidgetWebMapInfo (mapWidgetId: any): { mapWidgetId: string; mapDataSourceId: string; webMapItemId: string; webMapPortalUrl: string } {
  const id = String(mapWidgetId || '').trim()
  if (!id) return { mapWidgetId: '', mapDataSourceId: '', webMapItemId: '', webMapPortalUrl: '' }
  try {
    const state: any = getAppStore?.()?.getState?.() || {}
    const appConfig: any = state?.appConfig || state?.appStateInBuilder?.appConfig || null
    const widgets = giiPlainObject<Record<string, any>>(appConfig?.widgets || {})
    const dataSources = giiPlainObject<Record<string, any>>(appConfig?.dataSources || {})
    const widget = giiPlainObject<any>(widgets?.[id] || {})
    const wcfg = giiPlainObject<any>(widget?.config || {})
    const useDataSources = Array.isArray(wcfg?.useDataSources) ? wcfg.useDataSources : []
    const dsId = String(
      wcfg?.initialMapDataSourceID ||
      useDataSources?.[0]?.dataSourceId ||
      useDataSources?.[0]?.mainDataSourceId ||
      ''
    ).trim()
    const ds = giiPlainObject<any>(dataSources?.[dsId] || {})
    return {
      mapWidgetId: id,
      mapDataSourceId: dsId,
      webMapItemId: String(ds?.itemId || ds?.portalItemId || ds?.item?.id || '').trim(),
      webMapPortalUrl: String(ds?.portalUrl || ds?.portal?.url || '').trim()
    }
  } catch {
    return { mapWidgetId: id, mapDataSourceId: '', webMapItemId: '', webMapPortalUrl: '' }
  }
}

function giiNormalizeEditSection (raw: any): string {
  return String(raw || '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
}

function giiActivateExternalLayoutForEditSection (sectionRaw: any): void {
  const targetSection = giiNormalizeEditSection(sectionRaw)
  if (!targetSection) return
  try {
    const store: any = getAppStore?.()
    const state: any = store?.getState?.() || {}
    const currentPageId = String(state?.appRuntimeInfo?.currentPageId || '').trim()
    const appConfig: any = state?.appConfig || state?.appStateInBuilder?.appConfig || null
    const widgets = giiPlainObject<Record<string, any>>(appConfig?.widgets || {})
    let best: { sectionId: string; viewId: string; sidebarWidgetId: string; collapseSidebar: boolean; score: number } | null = null

    Object.entries(widgets || {}).forEach(([widgetId, widget]: [string, any]) => {
      const uri = String(widget?.uri || widget?.manifest || '').toLowerCase()
      const cfg = giiPlainObject<any>(widget?.config || {})
      if (!uri.includes('gii-nav-orizzontale') && !cfg?.items) return
      const items = Array.isArray(cfg?.items) ? cfg.items : []
      for (const item of items) {
        const section = giiNormalizeEditSection(item?.section)
        if (section !== targetSection) continue
        const sectionId = String(cfg?.sectionId || '').trim()
        const viewId = String(item?.viewId || '').trim()
        const sidebarWidgetId = String(cfg?.sidebarWidgetId || '').trim()
        if (!sectionId && !sidebarWidgetId) continue
        const hashPage = String(item?.hashPage || '').trim()
        const score = (hashPage && currentPageId && hashPage === currentPageId) ? 100 : (hashPage ? 10 : 0)
        if (!best || score > best.score) {
          best = { sectionId, viewId, sidebarWidgetId, collapseSidebar: item?.collapseSidebar === true, score }
        }
      }
    })

    if (!best) return
    if (best.sectionId && best.viewId) {
      try {
        store.dispatch({
          type: 'SECTION_NAV_INFO_CHANGED',
          sectionId: best.sectionId,
          navInfo: { currentViewId: best.viewId, previousViewId: '', progress: 1 }
        })
      } catch {}
    }
    if (best.sidebarWidgetId) {
      try {
        store.dispatch({
          type: 'WIDGET_STATE_PROP_CHANGE',
          widgetId: best.sidebarWidgetId,
          propKey: 'collapse',
          value: best.collapseSidebar
        })
      } catch {}
    }
  } catch {}
}

function giiActivateDatiTecniciExternalLayout (): void {
  giiActivateExternalLayoutForEditSection('dati-tecnici')
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
  mapView?: any | null
  mapConfig?: any
  onSaved?: (oid: number, savedData?: any, originStamp?: GiiPracticeContextStamp) => void
  onCloseEdit?: () => void
  mode?: 'create' | 'edit'
  initialData?: any | null
  editOid?: number | null
  editIdFieldName?: string
  editLayerUrl?: string
  titleText?: string
  saveText?: string
  readOnly?: boolean
  readOnlyMessage?: string
  onDirtyChange?: (dirty: boolean) => void
  onTabChange?: (tab: string) => void
  userContext: GiiUserContext
}) {
  const { ds, cfg } = p
  const mode = p.mode === 'edit' ? 'edit' : 'create'
  const editOid = p.editOid != null ? Number(p.editOid) : null
  const editIdFieldName = String(p.editIdFieldName || ds?.getIdField?.() || 'OBJECTID')
  const currentUserContext = p.userContext
  const currentUserContextKey = giiUserContextIdentityKey(currentUserContext)
  const currentProfileRole = normalizeRoleCode(currentUserContext.role)
  const isPureConsultationRole = mode === 'edit' && (currentProfileRole === 'CS' || currentProfileRole === 'DT')
  const isReadOnly = mode === 'edit' && (p.readOnly === true || isPureConsultationRole)
  const readOnlyBannerText = String(p.readOnlyMessage || 'Pratica aperta in consultazione. Le modifiche sono consentite solo nei casi previsti dal ruolo e dallo stato istruttorio.')
  const [readOnlyBannerMounted, setReadOnlyBannerMounted] = React.useState(false)
  const [readOnlyBannerOpen, setReadOnlyBannerOpen] = React.useState(false)
  const readOnlyBannerTimersRef = React.useRef<number[]>([])
  const clearReadOnlyBannerTimers = React.useCallback(() => {
    readOnlyBannerTimersRef.current.forEach(id => { try { window.clearTimeout(id) } catch {} })
    readOnlyBannerTimersRef.current = []
  }, [])
  const showReadOnlyBanner = React.useCallback(() => {
    clearReadOnlyBannerTimers()
    if (!isReadOnly) {
      setReadOnlyBannerOpen(false)
      setReadOnlyBannerMounted(false)
      return
    }
    setReadOnlyBannerMounted(true)
    const openTimer = window.setTimeout(() => setReadOnlyBannerOpen(true), 20)
    const closeTimer = window.setTimeout(() => setReadOnlyBannerOpen(false), 4000)
    readOnlyBannerTimersRef.current = [openTimer, closeTimer]
  }, [clearReadOnlyBannerTimers, isReadOnly])
  React.useEffect(() => {
    if (isReadOnly) showReadOnlyBanner()
    else {
      clearReadOnlyBannerTimers()
      setReadOnlyBannerOpen(false)
      setReadOnlyBannerMounted(false)
    }
    return clearReadOnlyBannerTimers
  }, [isReadOnly, readOnlyBannerText, showReadOnlyBanner, clearReadOnlyBannerTimers])
  const readOnlyInfoButton = isReadOnly ? (
    <button
      type='button'
      title='Informazioni sulla modifica dati'
      aria-label='Informazioni sulla modifica dati'
      onClick={() => {
        if (readOnlyBannerOpen) {
          clearReadOnlyBannerTimers()
          setReadOnlyBannerOpen(false)
        } else showReadOnlyBanner()
      }}
      style={{
        flex: '0 0 22px',
        width: 22,
        height: 22,
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: '#b42318',
        cursor: 'pointer',
        padding: 0,
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg width='22' height='22' viewBox='0 0 512 512' aria-hidden='true' focusable='false' style={{ display: 'block' }}>
        <path fill='#b42318' d='M256,0C114.6,0,0,114.6,0,256s114.6,256,256,256,256-114.6,256-256S397.4,0,256,0Z' />
        <path fill='#ffffff' d='M306.5,195.8l-112.2,10.9-4,14.4,22.1,3.1c14.4,2.7,17.3,6.6,14.1,17.8l-36.1,131.5c-9.5,34,5.2,50,39.7,50s57.7-9.6,71.8-22.6l4.3-15.8c-9.8,6.6-24.2,9.4-33.7,9.4-13.5,0-18.4-7.3-14.9-20.3l49-178.4h-.1Z' />
        <path fill='#ffffff' d='M268.6,84.7c-24.7,0-44.6,19.9-44.6,44.6s19.9,44.6,44.6,44.6,44.6-19.9,44.6-44.6-19.9-44.6-44.6-44.6Z' />
      </svg>
    </button>
  ) : null
  const isRitAgrTecLimitedEdit = mode === 'edit' && !isReadOnly && isRitAgrTecContext(currentUserContext)
  const ritAgrTecEditableUiFields = React.useMemo(() => new Set(['grado', 'norma15_sel', 'occorrenza']), [])
  const ritAgrTecEditableDraftFields = React.useMemo(() => new Set(['gradi_violazioni', 'occorrenza']), [])
  const ritAgrTecEditableSaveFields = React.useMemo(() => new Set(['gradi_violazioni', 'occorrenza']), [])
  const canEditFieldForCurrentProfile = React.useCallback((fieldName: string): boolean => {
    if (isReadOnly) return false
    if (!isRitAgrTecLimitedEdit) return true
    return ritAgrTecEditableUiFields.has(fieldName)
  }, [isReadOnly, isRitAgrTecLimitedEdit, ritAgrTecEditableUiFields])

  const [draft, setDraft] = React.useState<NpDraft>(() => draftFromRecord(p.initialData || {}))
  const [baselineDraft, setBaselineDraft] = React.useState<NpDraft>(() => draftFromRecord(p.initialData || {}))
  const [art15SelectedUi, setArt15SelectedUi] = React.useState<boolean>(() => draftHasArt15Selection(draftFromRecord(p.initialData || {})))
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [showCreateSuccessPopup, setShowCreateSuccessPopup] = React.useState(false)
  const [noteSpeseDraftDirty, setNoteSpeseDraftDirty] = React.useState(false)
  const [noteSpeseFormDirtyByCategory, setNoteSpeseFormDirtyByCategory] = React.useState<Record<NsCategory, boolean>>({
    AT: false,
    PR: false,
    RU: false,
    SL: false,
    PF: false,
    RA: false
  })
  const [noteSpeseManagerResetKey, setNoteSpeseManagerResetKey] = React.useState(0)
  const [createSuccessPraticaCode, setCreateSuccessPraticaCode] = React.useState('')
  const [createdRecordInfo, setCreatedRecordInfo] = React.useState<({ oid: number; layerUrl: string; data: any } & GiiPracticeContextStamp) | null>(null)
  const createdRecordInfoRef = React.useRef<({ oid: number; layerUrl: string; data: any } & GiiPracticeContextStamp) | null>(null)
  const [validationPopup, setValidationPopup] = React.useState<{ title: string; text: string } | null>(null)
  const [generalErrorPopup, setGeneralErrorPopup] = React.useState<{ title: string; text: string } | null>(null)
  const [cancelUnsavedPopupOpen, setCancelUnsavedPopupOpen] = React.useState(false)
  const [missingMapPointPopupOpen, setMissingMapPointPopupOpen] = React.useState(false)
  const [notaSpeseLinkedViolationPopup, setNotaSpeseLinkedViolationPopup] = React.useState<null | { codice: string; art: number; label?: string }>(null)
  // Combo 2 (scheda Nota spese, casistica Art.30): recuperabile (righe AT/PR/RU/SL/PF collegate
  // a un tipo di attrezzatura) oppure non recuperabile (righe RA dal carrello attrezzature).
  const [art30RecuperoMode, setArt30RecuperoMode] = React.useState<'recuperabile' | 'non_recuperabile'>('recuperabile')
  const [attrezzatureNuovoPickerOpen, setAttrezzatureNuovoPickerOpen] = React.useState(false)
  // Catalogo tipi attrezzatura (Combo 3 in modalità recuperabile, e prezzi/cauzione per RA),
  // caricato dalla vista parametri Art. 30 (GII_PARAMETRI_SANZIONI, categoria ATTREZZATURA/CAUZIONE).
  const [attrezzatureCatalog, setAttrezzatureCatalog] = React.useState<AttrezzaturaParametro[]>([])
  // Valore unitario della cauzione per singola tessera, letto dalla vista parametri Art. 30.
  const [attrezzatureCauzioneUnitaria, setAttrezzatureCauzioneUnitaria] = React.useState<number>(0)
  const validationPopupOkId = React.useMemo(() => `gii-val-ok-${Math.random().toString(36).slice(2)}`, [])
  const validationPopupBackdropId = React.useMemo(() => `gii-val-backdrop-${Math.random().toString(36).slice(2)}`, [])
  const successPopupOkId = React.useMemo(() => `gii-success-ok-${Math.random().toString(36).slice(2)}`, [])
  const successPopupBackdropId = React.useMemo(() => `gii-success-backdrop-${Math.random().toString(36).slice(2)}`, [])

  const showGeneralErrorPopup = React.useCallback((title: string, text: string) => {
    setMsg(null)
    setGeneralErrorPopup({ title, text })
  }, [])

  const defaultViolazioneColumnPercents = React.useMemo<[number, number]>(() => {
    const raw = Number((cfg as any).violazioneLayoutLeftPercent)
    const left = Math.max(30, Math.min(80, Number.isFinite(raw) ? raw : 58))
    return [left, 100 - left]
  }, [cfg])
  const [violazioneColumnPercents, setViolazioneColumnPercents] = React.useState<[number, number]>(defaultViolazioneColumnPercents)
  const [draggingViolazioneSplitter, setDraggingViolazioneSplitter] = React.useState(false)
  const violazioneGridRef = React.useRef<HTMLDivElement | null>(null)
  const violazioneColumnsDirty = Math.abs(violazioneColumnPercents[0] - defaultViolazioneColumnPercents[0]) > 0.05
    || Math.abs(violazioneColumnPercents[1] - defaultViolazioneColumnPercents[1]) > 0.05

  const defaultTrasgressoreColumnPercents = React.useMemo<[number, number]>(() => {
    const raw = Number((cfg as any).trasgressoreLayoutLeftPercent ?? (cfg as any).violazioneLayoutLeftPercent)
    const left = Math.max(35, Math.min(85, Number.isFinite(raw) ? raw : 65))
    return [left, 100 - left]
  }, [cfg])
  const [trasgressoreColumnPercents, setTrasgressoreColumnPercents] = React.useState<[number, number]>(defaultTrasgressoreColumnPercents)
  const [draggingTrasgressoreSplitter, setDraggingTrasgressoreSplitter] = React.useState(false)
  const trasgressoreGridRef = React.useRef<HTMLDivElement | null>(null)
  const trasgressoreColumnsDirty = Math.abs(trasgressoreColumnPercents[0] - defaultTrasgressoreColumnPercents[0]) > 0.05
    || Math.abs(trasgressoreColumnPercents[1] - defaultTrasgressoreColumnPercents[1]) > 0.05

  React.useEffect(() => {
    setViolazioneColumnPercents(defaultViolazioneColumnPercents)
  }, [defaultViolazioneColumnPercents])

  React.useEffect(() => {
    setTrasgressoreColumnPercents(defaultTrasgressoreColumnPercents)
  }, [defaultTrasgressoreColumnPercents])

  const resetViolazioneColumns = React.useCallback(() => {
    setViolazioneColumnPercents(defaultViolazioneColumnPercents)
  }, [defaultViolazioneColumnPercents])

  const resetTrasgressoreColumns = React.useCallback(() => {
    setTrasgressoreColumnPercents(defaultTrasgressoreColumnPercents)
  }, [defaultTrasgressoreColumnPercents])

  const handleViolazioneColumnsReset = React.useCallback((evt: React.SyntheticEvent<HTMLButtonElement>) => {
    evt.preventDefault()
    evt.stopPropagation()
    setDraggingViolazioneSplitter(false)
    resetViolazioneColumns()
  }, [resetViolazioneColumns])

  const handleTrasgressoreColumnsReset = React.useCallback((evt: React.SyntheticEvent<HTMLButtonElement>) => {
    evt.preventDefault()
    evt.stopPropagation()
    setDraggingTrasgressoreSplitter(false)
    resetTrasgressoreColumns()
  }, [resetTrasgressoreColumns])

  const startViolazioneResize = React.useCallback((evt: React.MouseEvent<HTMLDivElement>) => {
    evt.preventDefault()
    evt.stopPropagation()
    const host = violazioneGridRef.current
    if (!host) return
    const startX = evt.clientX
    const startCols = [...violazioneColumnPercents] as [number, number]
    const splitterW = Math.max(6, Math.min(40, Number((cfg as any).violazioneSplitterWidth) || 14))
    const hostWidth = Math.max(host.getBoundingClientRect().width - splitterW, 300)
    const clamp = (v: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, v))
    const round2 = (v: number) => Math.round(v * 100) / 100
    const onMove = (moveEvt: MouseEvent) => {
      const startLeftPx = (startCols[0] / 100) * hostWidth
      const nextLeftPx = startLeftPx + (moveEvt.clientX - startX)
      const nextLeft = clamp((nextLeftPx / hostWidth) * 100, 0, 100)
      const nextRight = 100 - nextLeft
      setViolazioneColumnPercents([round2(nextLeft), round2(nextRight)])
    }
    const onUp = () => {
      setDraggingViolazioneSplitter(false)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    setDraggingViolazioneSplitter(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [violazioneColumnPercents, cfg])

  const startTrasgressoreResize = React.useCallback((evt: React.MouseEvent<HTMLDivElement>) => {
    evt.preventDefault()
    evt.stopPropagation()
    const host = trasgressoreGridRef.current
    if (!host) return
    const startX = evt.clientX
    const startCols = [...trasgressoreColumnPercents] as [number, number]
    const splitterW = Math.max(6, Math.min(40, Number((cfg as any).violazioneSplitterWidth) || 14))
    const hostWidth = Math.max(host.getBoundingClientRect().width - splitterW, 300)
    const clamp = (v: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, v))
    const round2 = (v: number) => Math.round(v * 100) / 100
    const onMove = (moveEvt: MouseEvent) => {
      const startLeftPx = (startCols[0] / 100) * hostWidth
      const nextLeftPx = startLeftPx + (moveEvt.clientX - startX)
      const nextLeft = clamp((nextLeftPx / hostWidth) * 100, 0, 100)
      const nextRight = 100 - nextLeft
      setTrasgressoreColumnPercents([round2(nextLeft), round2(nextRight)])
    }
    const onUp = () => {
      setDraggingTrasgressoreSplitter(false)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    setDraggingTrasgressoreSplitter(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [trasgressoreColumnPercents, cfg])

  React.useEffect(() => {
    return () => {
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
  }, [])

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
      if (validationPopup || showCreateSuccessPopup || cancelUnsavedPopupOpen || missingMapPointPopupOpen) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [validationPopup, showCreateSuccessPopup, cancelUnsavedPopupOpen, missingMapPointPopupOpen])


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

  const [npTab, setNpTab] = React.useState<'dati_generali' | 'trasgressore' | 'violazione' | 'dati_tecnici' | 'nota_spese' | 'allegati' | 'anteprima'>(() => getRequestedEditSection({ skipUrl: true }) || 'trasgressore')
  const [isExternalNavMode, setIsExternalNavMode] = React.useState<boolean>(true)
  const skipNpTabSyncRef = React.useRef(false)
  const tabResetFirstRef = React.useRef(true)

  // Pulisci solo le richieste one-shot, conservando l'eventuale scheda richiesta in apertura.
  React.useEffect(() => {
    try { window.sessionStorage.removeItem('GII_NAV_SECTION') } catch {}
    try { window.sessionStorage.removeItem('GII_REQUESTED_EDIT_SECTION') } catch {}
    resetInvalidEditSectionStorage(npTab)
  }, [])

  React.useEffect(() => {
    if (tabResetFirstRef.current) {
      tabResetFirstRef.current = false
      return
    }
    const requested = getRequestedEditSection()
    setNpTab(requested || 'trasgressore')
  }, [mode, editOid])

  // Notifica il parent del cambio tab
  React.useEffect(() => { p.onTabChange?.(npTab) }, [npTab])

  const npTabSyncElRef = React.useRef<HTMLDivElement | null>(null)

  // Eleva il ramo del widget editing solo mentre è attiva la scheda Luoghi e dati.
  // Non modifica larghezze/flex della Sidebar ExB: serve solo a non far coprire il reset dalla mappa.
  React.useEffect(() => {
    if (npTab !== 'dati_tecnici') return
    const touched: Array<{ el: HTMLElement; zIndex: string; overflow: string; overflowX: string; overflowY: string; position: string }> = []
    const touch = (el: HTMLElement) => {
      try {
        const st = window.getComputedStyle(el)
        touched.push({
          el,
          zIndex: el.style.zIndex,
          overflow: el.style.overflow,
          overflowX: el.style.overflowX,
          overflowY: el.style.overflowY,
          position: el.style.position
        })
        if (st.position === 'static') el.style.position = 'relative'
        el.style.setProperty('z-index', '2147483000', 'important')
        el.style.setProperty('overflow', 'visible', 'important')
        el.style.setProperty('overflow-x', 'visible', 'important')
        el.style.setProperty('overflow-y', 'visible', 'important')
      } catch {}
    }
    try {
      let cur = npTabSyncElRef.current?.parentElement ?? null
      while (cur && cur !== document.body) {
        const cls = String(cur.className || '')
        // Non oltrepassare il contenitore Sidebar: altrimenti si alterano anche altri rami della pagina.
        if (cls.includes('widget-sidebar-layout')) break
        touch(cur)
        cur = cur.parentElement
      }
    } catch {}
    return () => {
      for (const item of touched.reverse()) {
        try {
          item.el.style.zIndex = item.zIndex
          item.el.style.overflow = item.overflow
          item.el.style.overflowX = item.overflowX
          item.el.style.overflowY = item.overflowY
          item.el.style.position = item.position
        } catch {}
      }
    }
  }, [npTab])

  const [datiTecniciSidebarDirty, setDatiTecniciSidebarDirty] = React.useState(false)
  const datiTecniciBaselineXRef = React.useRef<number | null>(null)
  const datiTecniciDefaultBoundaryXRef = React.useRef<number | null>(null)
  const datiTecniciAutoResettingRef = React.useRef(false)
  const datiTecniciUserDraggingRef = React.useRef(false)
  const datiTecniciSidebarElRef = React.useRef<{ left: HTMLElement; right: HTMLElement } | null>(null)
  const datiTecniciDividerRef = React.useRef<HTMLElement | null>(null)

  // Trova i pannelli della Sidebar solo quando serve la scheda Luoghi e dati.
  React.useEffect(() => {
    if (npTab !== 'dati_tecnici') {
      datiTecniciSidebarElRef.current = null
      datiTecniciDividerRef.current = null
      return
    }
    let dividerEl: HTMLElement | null = null
    const onPointerDown = () => { datiTecniciUserDraggingRef.current = true }
    const onPointerUp = () => { datiTecniciUserDraggingRef.current = false }
    let oldDividerZ = ''
    let oldDividerPosition = ''
    let oldDividerPointerEvents = ''
    let oldDividerCursor = ''

    const findPanels = () => {
      try {
        let cur = npTabSyncElRef.current?.parentElement ?? null
        while (cur && cur !== document.body) {
          if ((cur.className || '').includes('widget-sidebar-layout')) {
            const inner = cur.children[0] as HTMLElement
            const normal = Array.from(inner?.children || []).find(c => c.className.includes('side-normal')) as HTMLElement | undefined
            const collapsable = Array.from(inner?.children || []).find(c => c.className.includes('side-collapsable')) as HTMLElement | undefined
            const divider = inner?.children[1] as HTMLElement | undefined
            if (normal?.contains(npTabSyncElRef.current) && collapsable && divider) {
              datiTecniciSidebarElRef.current = { left: normal, right: collapsable }
              datiTecniciDividerRef.current = divider
              dividerEl = divider
              oldDividerZ = divider.style.zIndex
              oldDividerPosition = divider.style.position
              oldDividerPointerEvents = divider.style.pointerEvents
              oldDividerCursor = divider.style.cursor
              divider.style.setProperty('z-index', '2147483646', 'important')
              divider.style.setProperty('position', 'relative', 'important')
              // Il divisore nativo della Sidebar ExB resta il destinatario degli eventi
              // sintetici usati dall'overlay, ma non deve più partecipare all'hit-test:
              // altrimenti il cursore/maniglia nativa rimane sopra al pulsante reset.
              divider.style.setProperty('pointer-events', 'none', 'important')
              divider.style.setProperty('cursor', 'default', 'important')
              divider.addEventListener('pointerdown', onPointerDown)
              window.addEventListener('pointerup', onPointerUp)
            }
            return true
          }
          cur = cur.parentElement
        }
      } catch {}
      return false
    }

    const found = findPanels()
    const t1 = found ? 0 : window.setTimeout(findPanels, 300)
    const t2 = found ? 0 : window.setTimeout(findPanels, 1000)
    return () => {
      if (t1) window.clearTimeout(t1)
      if (t2) window.clearTimeout(t2)
      try { dividerEl?.removeEventListener('pointerdown', onPointerDown) } catch {}
      try { window.removeEventListener('pointerup', onPointerUp) } catch {}
      try {
        if (dividerEl) {
          dividerEl.style.zIndex = oldDividerZ
          dividerEl.style.position = oldDividerPosition
          dividerEl.style.pointerEvents = oldDividerPointerEvents
          dividerEl.style.cursor = oldDividerCursor
        }
      } catch {}
      datiTecniciSidebarElRef.current = null
      datiTecniciDividerRef.current = null
    }
  }, [npTab])

  React.useEffect(() => {
    if (npTab !== 'dati_tecnici') {
      setDatiTecniciSidebarDirty(false)
      return
    }

    let cancelled = false
    const readX = () => giiReadLayoutSidebarBoundaryX(npTabSyncElRef.current)
    const defaultX = () => giiReadLayoutSidebarDefaultBoundaryX(npTabSyncElRef.current)

    const syncDefault = (): number | null => {
      const target = defaultX()
      if (target == null || !Number.isFinite(Number(target))) return null
      datiTecniciDefaultBoundaryXRef.current = Number(target)
      datiTecniciBaselineXRef.current = Number(target)
      return Number(target)
    }

    const resetToDefault = (updateState = true) => {
      const target = syncDefault()
      if (target == null || !Number.isFinite(Number(target))) return false
      datiTecniciAutoResettingRef.current = true
      giiMoveNearestLayoutSidebarToX(npTabSyncElRef.current, target)
      window.setTimeout(() => {
        datiTecniciAutoResettingRef.current = false
        if (updateState && !cancelled) setDatiTecniciSidebarDirty(false)
      }, 450)
      return true
    }

    const initOrReset = () => {
      if (cancelled) return
      const target = syncDefault()
      const x = readX()
      if (target == null || x == null) return

      // Default del Builder: 50% della Sidebar. Al rientro in Luoghi e dati
      // la Sidebar viene sempre riportata al 50%, come reset automatico.
      if (Math.abs(Number(x) - Number(target)) > 2) {
        resetToDefault()
      } else {
        setDatiTecniciSidebarDirty(false)
      }
    }

    const check = () => {
      if (cancelled || datiTecniciAutoResettingRef.current) return
      const target = syncDefault()
      const x = readX()
      if (target == null || x == null) return
      setDatiTecniciSidebarDirty(Math.abs(Number(x) - Number(target)) > 2)
    }

    // Lascia il tempo alla Sidebar ExB di assestarsi prima di leggere/ripristinare.
    const t0 = window.setTimeout(initOrReset, 120)
    const t1 = window.setTimeout(initOrReset, 450)
    const id = window.setInterval(check, 300)

    return () => {
      cancelled = true
      window.clearTimeout(t0)
      window.clearTimeout(t1)
      window.clearInterval(id)
      // Uscendo dalla scheda, ripristina il default del Builder (50%) così il
      // ridimensionamento della mappa non si ripercuote sulle altre schede.
      if (!datiTecniciUserDraggingRef.current) resetToDefault(false)
      setDatiTecniciSidebarDirty(false)
    }
  }, [npTab])

  React.useEffect(() => {
    if (skipNpTabSyncRef.current) { skipNpTabSyncRef.current = false; return }
    try { sessionStorage.setItem('GII_EDIT_TAB', npTab) } catch {}
    const el = npTabSyncElRef.current?.closest?.('[data-gii-editing-root]') as HTMLElement | null
    const isVisible = !!(el && el.offsetWidth > 0 && el.offsetHeight > 0)
    if (isVisible) {
      try { window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: npTab.replace(/_/g, '-') } })) } catch {}
    }
  }, [npTab])

  React.useEffect(() => {
    const syncExternalLayout = () => {
      const el = npTabSyncElRef.current?.closest?.('[data-gii-editing-root]') as HTMLElement | null
      const isVisible = !!(el && el.offsetWidth > 0 && el.offsetHeight > 0)
      if (!isVisible) return
      // La mappa deve essere visibile solo nella scheda Luoghi e dati tecnici.
      // Al rientro da Elenco/Azioni, o quando si apre un'altra pratica restando già
      // sulla scheda Trasgressore, la Sidebar ExB può conservare lo stato aperto
      // precedente: riallineo quindi sempre la Sidebar alla scheda corrente.
      giiActivateExternalLayoutForEditSection(npTab.replace(/_/g, '-'))
    }
    syncExternalLayout()
    const t1 = window.setTimeout(syncExternalLayout, 120)
    const t2 = window.setTimeout(syncExternalLayout, 420)
    const t3 = window.setTimeout(syncExternalLayout, 900)
    const t4 = window.setTimeout(syncExternalLayout, 1500)
    return () => {
      try { window.clearTimeout(t1) } catch {}
      try { window.clearTimeout(t2) } catch {}
      try { window.clearTimeout(t3) } catch {}
      try { window.clearTimeout(t4) } catch {}
    }
  }, [npTab, mode, editOid])

  React.useEffect(() => {
    const applyRequestedSection = (forcedSection?: any) => {
      const requested = (() => {
        const raw = String(forcedSection || '').trim()
        if (raw) {
          const normalized = raw.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
          switch (normalized) {
            case 'dati-generali': return 'dati_generali' as const
            case 'trasgressore': return 'trasgressore' as const
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
    if (!isGiiPracticeContextStampCurrent(info)) return
    writeEditIntent(ei, info)
    try { ;(window as any).__giiEdit = stampGiiPracticePayload({ ...ei, dsId: null }, info) } catch {}
    writeDynamicSelection({ oid: info.oid, layerUrl: info.layerUrl, idFieldName: 'OBJECTID', data: info.data }, undefined, info)
    // Segnala al widget edit (se già montato) che c'è un nuovo intent
    try { window.dispatchEvent(new CustomEvent('gii-edit-intent-changed')) } catch {}
    try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: info.oid, layerUrl: info.layerUrl } })) } catch {}
    // Reset form per quando l'utente torna alla pagina create
    createdRecordInfoRef.current = null
    setCreatedRecordInfo(null)
    setDraft({})
    setBaselineDraft({})
    setArt15SelectedUi(false)
    setMsg(null)
    skipNpTabSyncRef.current = true
    setNpTab('trasgressore')
    const pageToken = String(cfg.editPageId || 'page_45').trim()
    const pageId = resolvePageId(pageToken)
    if (!pageId) {
      showGeneralErrorPopup(
        'Pagina Modifica pratica non trovata',
        `Pagina Modifica pratica non trovata: ${pageToken || '(vuota)'}. Correggere editPageId nel setting del widget: valore atteso page_45.`
      )
      return
    }
    UrlManager.getInstance().changePage(pageId)
  }, [cfg.editPageId, showGeneralErrorPopup])

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
  const createStartedAtRef = React.useRef<number>(Date.now())
  const [attachmentFiles, setAttachmentFiles] = React.useState<File[]>([])
  const [attachmentInputKey, setAttachmentInputKey] = React.useState(0)
  const [attachments, setAttachments] = React.useState<Array<{ id: number; name?: string; size?: number; contentType?: string; url?: string; keywords?: string }>>([])
  const [attachmentsForOid, setAttachmentsForOid] = React.useState<number | null>(null)
  const [attachmentsLoading, setAttachmentsLoading] = React.useState(false)
  const [attachmentsUploading, setAttachmentsUploading] = React.useState(false)
  const [attachmentsError, setAttachmentsError] = React.useState<string | null>(null)
  const attachmentReadSeqRef = React.useRef(0)
  const attachmentTargetRef = React.useRef<{ oid: number | null; layerUrl: string; contextKey: string }>({ oid: null, layerUrl: '', contextKey: '' })
  attachmentTargetRef.current = {
    oid: currentOid == null ? null : Number(currentOid),
    layerUrl: normalizeFeatureLayerUrl(currentLayerUrl),
    contextKey: currentUserContextKey
  }
  const captureAttachmentOperation = React.useCallback(() => ({
    oid: currentOid == null ? null : Number(currentOid),
    layerUrl: normalizeFeatureLayerUrl(currentLayerUrl),
    contextKey: currentUserContextKey,
    stamp: getGiiPracticeContextStamp()
  }), [currentOid, currentLayerUrl, currentUserContextKey])
  const isAttachmentOperationCurrent = React.useCallback((origin: { oid: number | null; layerUrl: string; contextKey: string; stamp: GiiPracticeContextStamp } | null | undefined) => {
    if (!origin || !isGiiPracticeContextStampCurrent(origin.stamp)) return false
    const current = attachmentTargetRef.current
    return current.oid === origin.oid &&
      current.layerUrl === origin.layerUrl &&
      current.contextKey === origin.contextKey
  }, [])
  const visibleTechnicalAttachments = React.useMemo(() => filterGiiAttachmentsForTechnicalRoles((Array.isArray(attachments) ? attachments : []) as any), [attachments])

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
  const [previewRotationDeg, setPreviewRotationDeg] = React.useState(0)
  const prevBlobRef = React.useRef<string | null>(null)
  const lastInitSignatureRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    // ExB puo' consegnare p.initialData due volte di seguito per lo stesso
    // identico record (tipicamente dopo un F5, per via del doppio mount di
    // mappa/datasource). Se e' lo stesso record della volta precedente non
    // dobbiamo azzerare di nuovo il form: lo faremmo perdere dati gia'
    // caricati nel frattempo (es. il catalogo attrezzature Art.30) senza che
    // nulla li ricarichi.
    // Guardia limitata alla modalita' 'edit': solo li' editOid+GlobalID
    // identificano in modo univoco lo stesso rapporto. In 'create' l'OID e'
    // sempre null e puo' mancare il GlobalID, quindi qui si mantiene il
    // comportamento originale (reset sempre) per non rischiare di confondere
    // due sessioni di creazione distinte.
    if (mode === 'edit') {
      const recordGlobalId = String(pickAttrCI(p.initialData || {}, ['GlobalID', 'globalid', 'GLOBALID']) || '').trim()
      const signature = `edit|${editOid}|${recordGlobalId}`
      if (lastInitSignatureRef.current === signature) return
      lastInitSignatureRef.current = signature
    } else {
      lastInitSignatureRef.current = null
    }
    if (mode === 'create') createStartedAtRef.current = Date.now()
    const nextBase = draftFromRecord(p.initialData || {})
    setDraft(nextBase)
    setBaselineDraft(nextBase)
    setArt15SelectedUi(draftHasArt15Selection(nextBase))
    setAttrezzatureCauzioneUnitaria(0)
    setAttrezzatureCatalog([])
    setArt30RecuperoMode('recuperabile')
    setAttachmentFiles([])
    setAttachmentInputKey(k => k + 1)
    setPendingDeleteAttachmentIds([])
    setPendingReplaceAttachments({})
    setAttachmentConfirm(null)
    setReplaceTargetAttachment(null)
    setReplaceInputKey(k => k + 1)
    setAttachmentsError(null)
    setPreviewAttachment(null)
    setPreviewRotationDeg(0)
    setMsg(null)
  }, [mode, editOid, p.initialData])

  React.useEffect(() => {
    if (mode !== 'create') return
    const giiCtx = currentUserContext
    const roleShort = shortRoleLabel(giiCtx.role)
    const officeFallback = getCreateOfficeFallback(giiCtx.area, giiCtx.settore)
    const createOfficeLabel = String(giiCtx.ufficioLabel || officeFallback.label || '').trim()
    const currentUserDisplayName = getCurrentGiiUserDisplayName(giiCtx.username)
    const today = toDraftDate(Date.now())
    const withCreateDefaults = (prev: NpDraft): NpDraft => {
      const next: NpDraft = { ...prev }
      if (!String(next.area_cod || '').trim() && giiCtx.area) next.area_cod = giiCtx.area
      if (!String(next.settore_cod || '').trim() && giiCtx.settore) next.settore_cod = giiCtx.settore
      if (!String(next.it_assegnato_nome || '').trim() && currentUserDisplayName) next.it_assegnato_nome = currentUserDisplayName
      if (!String(next.tecnico_rilevatore || '').trim()) {
        const label = roleShort && giiCtx.settore ? `${roleShort} ${giiCtx.settore}` : (roleShort || String(giiCtx.username || '').trim())
        if (label) next.tecnico_rilevatore = label
      }
      if (!String(next.ufficio_zona || '').trim() && createOfficeLabel) {
        next.ufficio_zona = createOfficeLabel
      }
      if (!String(next.data_rilevazione || '').trim()) {
        next.data_rilevazione = today
      }
      if (!String(next.stato || '').trim()) next.stato = 'ITALIA'
      if (!String(next.dom_notifica_stato || '').trim()) next.dom_notifica_stato = 'ITALIA'
      if (!String(next.rl_dom_stato || '').trim()) next.rl_dom_stato = 'ITALIA'
      return next
    }
    setDraft(prev => withCreateDefaults(prev))
    setBaselineDraft(prev => withCreateDefaults(prev))
  }, [mode, currentUserContextKey])

  const hasPendingAttachments = attachmentFiles.length > 0
  const hasPendingAttachmentDeletes = pendingDeleteAttachmentIds.length > 0
  const hasPendingAttachmentReplacements = Object.keys(pendingReplaceAttachments).length > 0
  const baselineArt15Selected = React.useMemo(() => draftHasArt15Selection(baselineDraft), [baselineDraft])
  const art15SelectionDirty = art15SelectedUi !== baselineArt15Selected
  const isDirty = React.useMemo(() => {
    if (isReadOnly) return false
    const draftDirty = !draftsEqual(draft, baselineDraft)
    if (isRitAgrTecLimitedEdit) return draftDirty
    return draftDirty || art15SelectionDirty || !!p.clickedPointWgs84 || hasPendingAttachments || hasPendingAttachmentDeletes || hasPendingAttachmentReplacements || noteSpeseDraftDirty
  }, [isReadOnly, draft, baselineDraft, art15SelectionDirty, isRitAgrTecLimitedEdit, p.clickedPointWgs84, hasPendingAttachments, hasPendingAttachmentDeletes, hasPendingAttachmentReplacements, noteSpeseDraftDirty])
  React.useEffect(() => {
    p.onDirtyChange?.(isDirty)
  }, [isDirty, p.onDirtyChange])

  const set = (k: string, v: any) => {
    if (isReadOnly) return
    if (isRitAgrTecLimitedEdit && !ritAgrTecEditableDraftFields.has(k.toLowerCase())) return
    setDraft(prev => ({ ...prev, [k]: normalizeUppercaseTextFieldValue(k, v) }))
  }
  const g = (k: string) => draft[k] ?? ''
  const [capOptionsByAddress, setCapOptionsByAddress] = React.useState<Record<'main' | 'dom' | 'rl', ComuneCapOption[]>>({ main: [], dom: [], rl: [] })

  const resetCapOptions = React.useCallback((kind: 'main' | 'dom' | 'rl') => {
    setCapOptionsByAddress(prev => ({ ...prev, [kind]: [] }))
  }, [])

  const applyComuneToAddress = React.useCallback((kind: 'main' | 'dom' | 'rl', comune: ComuneIstatOption) => {
    const prefix = kind === 'main' ? '' : (kind === 'dom' ? 'dom_notifica_' : 'rl_dom_')
    const cityField = `${prefix}citta`
    const provField = `${prefix}provincia`
    const capField = `${prefix}cap`
    const stateField = `${prefix}stato`
    set(cityField, comune.denominazione_comune)
    set(provField, comune.sigla_provincia)
    set(stateField, comune.stato || 'ITALIA')
    setCapOptionsByAddress(prev => ({ ...prev, [kind]: [] }))
    ;(async () => {
      try {
        const caps = await queryCapForComuneIstat(comune)
        setCapOptionsByAddress(prev => ({ ...prev, [kind]: caps }))
        if (caps.length === 1) set(capField, caps[0].cap)
        else if (caps.length > 1) set(capField, '')
      } catch {
        setCapOptionsByAddress(prev => ({ ...prev, [kind]: [] }))
      }
    })()
  }, [set])
  const isSystemAdmin = currentProfileRole === 'ADMIN'

  React.useEffect(() => {
    setPreviewRotationDeg(0)
  }, [previewAttachment?.id])

  React.useEffect(() => {
    if (npTab !== 'allegati') return
    if (attachmentsLoading) return
    const list = Array.isArray(visibleTechnicalAttachments) ? visibleTechnicalAttachments : []
    if (list.length === 0) {
      if (previewAttachment) setPreviewAttachment(null)
      return
    }
    const selectedStillExists = !!previewAttachment && list.some((a: any) => Number(a?.id) === Number(previewAttachment.id))
    if (selectedStillExists) return
    const first = list[0]
    if (!first || first.id == null) return
    setPreviewAttachment({
      id: Number(first.id),
      name: first.name,
      contentType: first.contentType
    })
  }, [npTab, visibleTechnicalAttachments, attachmentsLoading, previewAttachment?.id])

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
        finalUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}giiPreviewTs=${Date.now()}`
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
const [activeNotaSpeseCasistica, setActiveNotaSpeseCasistica] = React.useState<string>('')
  // Solo per la casistica Art.30 (C104_ATTREZZATURE_DANNEGGIATE): riferimento (persistentId)
  // dell'attrezzatura recuperabile per cui si sta compilando la nota spese. Ogni attrezzatura
  // recuperabile ha la propria nota spese separata, non una cumulativa.
  const [activeAttrezzaturaRiferimentoId, setActiveAttrezzaturaRiferimentoId] = React.useState<string>('')
  // Mantiene il riferimento attivo disponibile ai caricamenti asincroni senza rendere la
  // semplice selezione di un'attrezzatura una causa di ricaricamento dell'intero draft.
  const activeAttrezzaturaRiferimentoIdRef = React.useRef<string>('')
  React.useEffect(() => {
    activeAttrezzaturaRiferimentoIdRef.current = activeAttrezzaturaRiferimentoId
  }, [activeAttrezzaturaRiferimentoId])
  // Messaggio di validazione dei dati identificativi della tessera recuperabile attiva.
  const [pendingAttrezzaturaMsg, setPendingAttrezzaturaMsg] = React.useState<string>('')
  // Editing protetto dei dati della tessera recuperabile: finché non si conferma o annulla,
  // gli altri comandi della Nota spese restano bloccati per evitare modifiche accidentali.
  const [recuperableTesseraEdit, setRecuperableTesseraEdit] = React.useState<null | {
    ref: string
    isNew: boolean
    matricola: string
    cauzioneDecurtata: boolean
  }>(null)
  const recuperableTesseraCardRef = React.useRef<HTMLDivElement | null>(null)
  const recuperableTesseraMatricolaInputRef = React.useRef<HTMLInputElement | null>(null)
const [noteSpeseRowsLoadedKey, setNoteSpeseRowsLoadedKey] = React.useState<string>('')
const noteSpeseDraftStorageKey = React.useMemo(() => {
  return mode === 'edit' && currentOid != null && currentGlobalId ? nsDraftStorageKey(currentOid, currentGlobalId) : ''
}, [mode, currentOid, currentGlobalId])

const noteSpeseCfg = React.useMemo(() => ({
  importPrezzariUrl: String((cfg as any).nsImportPrezzariUrl || (cfg as any).nsPrezzariUrl || '').trim(),
  regionaleArticoliUrl: String((cfg as any).nsPrezzarioRegionaleArticoliUrl || (cfg as any).nsPrezzarioVociUrl || '').trim(),
  internoArticoliUrl: String((cfg as any).nsPrezzarioInternoArticoliUrl || (cfg as any).nsPrezzarioInternoUrl || '').trim(),
  nuoviPrezziUrl: String((cfg as any).nsNuoviPrezziUrl || '').trim(),
  detailUrl: String(cfg.nsNotaSpeseDettaglioUrl || '').trim(),
  detailUrlWrite: String((cfg as any).nsNotaSpeseDettaglioUrlWrite || cfg.nsNotaSpeseDettaglioUrl || '').trim(),
  parametriUrl: String(cfg.nsParametriUrl || '').trim(),
  parametroCode: String(cfg.nsParametroCode || 'SPESE_GENERALI_PERC').trim() || 'SPESE_GENERALI_PERC',
  attrezzatureParametriUrl: String((cfg as any).attrezzatureParametriUrl || '').trim()
}), [(cfg as any).nsImportPrezzariUrl, (cfg as any).nsPrezzariUrl, (cfg as any).nsPrezzarioRegionaleArticoliUrl, (cfg as any).nsPrezzarioVociUrl, (cfg as any).nsPrezzarioInternoArticoliUrl, (cfg as any).nsPrezzarioInternoUrl, (cfg as any).nsNuoviPrezziUrl, cfg.nsNotaSpeseDettaglioUrl, (cfg as any).nsNotaSpeseDettaglioUrlWrite, cfg.nsParametriUrl, cfg.nsParametroCode, (cfg as any).attrezzatureParametriUrl])

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

const regolamentoArticoliState = useRegolamentoArticoliState(cfg)

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
  // Non caricare automaticamente la tabella import prezzari in apertura.
  // Il caricamento preventivo può richiedere credenziali a profili che stanno solo
  // consultando/validando la pratica e non stanno compilando la nota spese.
  setActivePrezzario(null)
}, [noteSpeseCfg.importPrezzariUrl])

const noteSpeseExpectedCodesKeyForRestore = React.useMemo(() => getNotaSpeseCasistiche(draft).map(c => c.codice).sort().join('|'), [draft])

const loadNotaSpeseDraft = React.useCallback(async () => {
  if (mode !== 'edit' || currentOid == null || !currentGlobalId || noteSpeseMissing.length > 0) return
  setNoteSpeseBusy(true)
  try {
    const [rows, perc] = await Promise.all([
      queryNotaSpeseRows(noteSpeseCfg.detailUrlWrite, currentGlobalId),
      getNsPercentuale(noteSpeseCfg.parametriUrl, noteSpeseCfg.parametroCode)
    ])
    const grouped = nsRowsFromFlat(rows)
    const currentActiveAttrezzaturaRiferimentoId = String(activeAttrezzaturaRiferimentoIdRef.current || '').trim()
    setNoteSpeseRowsBaseline(grouped)
    let draft = nsCloneRowsByCategory(grouped)
    const savedDraftSnapshot = (!isReadOnly && !isRitAgrTecLimitedEdit && noteSpeseDraftStorageKey) ? nsReadDraftSnapshot(noteSpeseDraftStorageKey) : null
    const effectiveNotaSpeseCasistica = activeNotaSpeseCasistica || String(savedDraftSnapshot?.activeCasistica || '').trim()
    if (savedDraftSnapshot && Array.isArray(savedDraftSnapshot.rows)) {
      // La bozza locale può essere più vecchia dei dati server: se nel frattempo
      // sono state aggiunte righe per una casistica che la bozza non copriva
      // (es. da un'altra sessione/browser), non vanno nascoste. Si integrano dal
      // server solo le casistiche assenti dalla bozza; quelle già coperte restano
      // come da bozza locale, per non perdere modifiche non salvate in corso.
      const serverFlat = nsRowsByCategoryToFlat(grouped)
      const snapshotFlat = savedDraftSnapshot.rows
      const casisticheOf = (list: NsDetailRow[]) => new Set(list.map(r => String(r.codice_casistica || '').trim()).filter(Boolean))
      const snapshotCasistiche = casisticheOf(snapshotFlat)
      const missingFromSnapshot = [...casisticheOf(serverFlat)].filter(c => !snapshotCasistiche.has(c))
      const mergedFlat = missingFromSnapshot.length === 0
        ? snapshotFlat
        : [...snapshotFlat, ...serverFlat.filter(r => missingFromSnapshot.includes(String(r.codice_casistica || '').trim()))]
      draft = nsRowsFromFlat(mergedFlat)
      const noteSpeseExpectedCodesForRestore = new Set(noteSpeseExpectedCodesKeyForRestore.split('|').filter(Boolean))
      if (!activeNotaSpeseCasistica && effectiveNotaSpeseCasistica && noteSpeseExpectedCodesForRestore.has(effectiveNotaSpeseCasistica)) setActiveNotaSpeseCasistica(effectiveNotaSpeseCasistica)
    }
    let raw: string | null = null
    try { raw = sessionStorage.getItem(GII_NS_CART_KEY) } catch {}
    if (raw) {
      try { sessionStorage.removeItem(GII_NS_CART_KEY) } catch {}
      const isArt30Effective = effectiveNotaSpeseCasistica === 'C104_ATTREZZATURE_DANNEGGIATE'
      const requiresRiferimentoEffective = isArt30Effective && art30RecuperoMode !== 'non_recuperabile'
      if (!effectiveNotaSpeseCasistica) {
        setNoteSpeseMsg({ ok: false, text: 'Le voci del prezzario non sono state aggiunte: seleziona prima una nota spese collegata a una violazione.' })
      } else if (requiresRiferimentoEffective && !currentActiveAttrezzaturaRiferimentoId) {
        setNoteSpeseMsg({ ok: false, text: "Le voci del prezzario non sono state aggiunte: seleziona prima l'attrezzatura a cui si riferisce questa nota spese." })
      } else {
      const effectiveRiferimentoId = requiresRiferimentoEffective ? currentActiveAttrezzaturaRiferimentoId : ''
      let cartItems: any[] = []
      try { cartItems = JSON.parse(raw) } catch { cartItems = [] }
      if (Array.isArray(cartItems) && cartItems.length > 0) {
        const existingCodes = new Set<string>()
        const activeCasisticaCode = String(effectiveNotaSpeseCasistica || '').trim()
        NS_CATEGORIES.forEach((cat) => {
          ;(draft[cat] || []).forEach((r) => {
            const codice = String(r.codice_voce_snapshot || '').trim()
            const matchesCasistica = String(r.codice_casistica || '').trim() === activeCasisticaCode
            const matchesRiferimento = String(r.riferimento_attrezzatura_id || '').trim() === effectiveRiferimentoId
            if (matchesCasistica && matchesRiferimento && codice) existingCodes.add(codice)
          })
        })
        let maxOrdine = 0
        NS_CATEGORIES.forEach((cat) => { ;(draft[cat] || []).forEach((r) => { maxOrdine = Math.max(maxOrdine, Math.trunc(nsSafeNum(r.ordine, 0))) }) })
        let added = 0
        cartItems.forEach((item: any) => {
          const codiceVoce = String(item?.codice_voce || '').trim()
          if (!codiceVoce || !item?.famiglia) return
          const cat = nsNormalizeCategory(item.famiglia)
          if (!cat) return
          const isTesseraCartItem = cat === 'RA' && attrezzaturaTipo(item.descrizione)?.key === 'TESSERA_ELETTRONICA'
          if (existingCodes.has(codiceVoce) && !isTesseraCartItem) return
          const prezzoCart = nsRound(nsSafeNum(item.prezzo_unitario, 0), 4)
          maxOrdine += 10
          draft[cat].push({
            objectid: 0,
            categoria_costo: cat,
            origine_voce_snapshot: nsMapCartOrigine(item.codice_prezzario || ''),
            codice_voce_snapshot: codiceVoce,
            descrizione_snapshot: String(item.descrizione || ''),
            unita_misura_snapshot: String(item.unita_misura || ''),
            prezzo_unitario_snapshot: prezzoCart,
            quantita: isTesseraCartItem ? 1 : 0,
            importo_riga: isTesseraCartItem ? prezzoCart : 0,
            anno_prezzario_snapshot: nsSafeNum(item.anno_riferimento, 0) > 0 ? Math.trunc(nsSafeNum(item.anno_riferimento, 0)) : null,
            ordine: maxOrdine,
            note: '',
            riferimento_attrezzatura_id: effectiveRiferimentoId || null,
            codice_casistica: effectiveNotaSpeseCasistica
          })
          if (!isTesseraCartItem) existingCodes.add(codiceVoce)
          added++
        })
        if (added > 0) {
          setNoteSpeseMsg({ ok: true, text: `${added} ${added === 1 ? 'voce aggiunta' : 'voci aggiunte'} dal prezzario. Compila le quantità e salva.` })
        }
      }
      }
    }
    setNoteSpeseRowsDraft(draft)
    setNoteSpesePercent(perc)
    setNoteSpeseSummary(nsComputeSummaryFromRows(rows, perc))
    setNoteSpeseRowsLoadedKey(`${Number(currentOid)}|${String(currentGlobalId || '').trim()}`)
    if (!raw) setNoteSpeseMsg(null)
  } catch (e: any) {
    console.error('[GII] Errore caricamento righe nota spese:', e?.message || String(e), e)
    setNoteSpeseRowsLoadedKey(`${Number(currentOid)}|${String(currentGlobalId || '').trim()}`)
    setNoteSpeseMsg({ ok: false, text: e?.message || String(e) })
  } finally {
    setNoteSpeseBusy(false)
  }
}, [mode, currentOid, currentGlobalId, noteSpeseMissing.length, noteSpeseCfg, activeNotaSpeseCasistica, art30RecuperoMode, noteSpeseDraftStorageKey, isReadOnly, isRitAgrTecLimitedEdit, noteSpeseExpectedCodesKeyForRestore])

const refreshNotaSpeseSummary = React.useCallback(async () => {
  const rows = nsRowsByCategoryToFlat(noteSpeseRowsDraft)
  setNoteSpeseSummary(nsComputeSummaryFromRows(rows, noteSpesePercent))
}, [noteSpeseRowsDraft, noteSpesePercent])

React.useEffect(() => {
  if (mode !== 'edit' || currentOid == null) {
    setNoteSpeseRowsLoadedKey('')
    return
  }
  if (!currentGlobalId || noteSpeseMissing.length > 0) {
    setNoteSpeseRowsLoadedKey('')
    return
  }
  void loadNotaSpeseDraft()
}, [mode, currentOid, currentGlobalId, noteSpeseMissing.length, loadNotaSpeseDraft])

React.useEffect(() => {
  if (mode !== 'edit' || currentOid == null || !currentGlobalId) return
  const id = window.setInterval(() => {
    let raw: string | null = null
    try { raw = sessionStorage.getItem(GII_NS_CART_KEY) } catch {}
    if (!raw) return
    try { sessionStorage.removeItem(GII_NS_CART_KEY) } catch {}
    if (!activeNotaSpeseCasistica) {
      setNoteSpeseMsg({ ok: false, text: 'Le voci del prezzario non sono state aggiunte: seleziona prima una nota spese collegata a una violazione.' })
      return
    }
    const isArt30Active = activeNotaSpeseCasistica === 'C104_ATTREZZATURE_DANNEGGIATE'
    const requiresRiferimentoActive = isArt30Active && art30RecuperoMode !== 'non_recuperabile'
    if (requiresRiferimentoActive && !activeAttrezzaturaRiferimentoId) {
      setNoteSpeseMsg({ ok: false, text: "Le voci del prezzario non sono state aggiunte: seleziona prima l'attrezzatura a cui si riferisce questa nota spese." })
      return
    }
    const effectiveRiferimentoId = requiresRiferimentoActive ? activeAttrezzaturaRiferimentoId : ''
    let cartItems: any[] = []
    try { cartItems = JSON.parse(raw) } catch { return }
    if (!Array.isArray(cartItems) || cartItems.length === 0) return
    setNoteSpeseRowsDraft((prev) => {
      const existingCodes = new Set<string>()
      const activeCasisticaCode = String(activeNotaSpeseCasistica || '').trim()
      NS_CATEGORIES.forEach((cat) => {
        ;(prev[cat] || []).forEach((r) => {
          const codice = String(r.codice_voce_snapshot || '').trim()
          const matchesCasistica = String(r.codice_casistica || '').trim() === activeCasisticaCode
          const matchesRiferimento = String(r.riferimento_attrezzatura_id || '').trim() === effectiveRiferimentoId
          if (matchesCasistica && matchesRiferimento && codice) existingCodes.add(codice)
        })
      })
      let maxOrdine = 0
      NS_CATEGORIES.forEach((cat) => { ;(prev[cat] || []).forEach((r) => { maxOrdine = Math.max(maxOrdine, Math.trunc(nsSafeNum(r.ordine, 0))) }) })
      const draft = nsCloneRowsByCategory(prev)
      let added = 0
      cartItems.forEach((item: any) => {
        const codiceVoce = String(item?.codice_voce || '').trim()
        if (!codiceVoce || !item?.famiglia) return
        const cat = nsNormalizeCategory(item.famiglia)
        if (!cat) return
        const isTesseraCartItem = cat === 'RA' && attrezzaturaTipo(item.descrizione)?.key === 'TESSERA_ELETTRONICA'
        if (existingCodes.has(codiceVoce) && !isTesseraCartItem) return
        const prezzoCart = nsRound(nsSafeNum(item.prezzo_unitario, 0), 4)
        maxOrdine += 10
        draft[cat].push({
          objectid: 0, categoria_costo: cat,
          origine_voce_snapshot: nsMapCartOrigine(item.codice_prezzario || ''),
          codice_voce_snapshot: codiceVoce,
          descrizione_snapshot: String(item.descrizione || ''),
          unita_misura_snapshot: String(item.unita_misura || ''),
          prezzo_unitario_snapshot: prezzoCart,
          quantita: isTesseraCartItem ? 1 : 0, importo_riga: isTesseraCartItem ? prezzoCart : 0,
          anno_prezzario_snapshot: nsSafeNum(item.anno_riferimento, 0) > 0 ? Math.trunc(nsSafeNum(item.anno_riferimento, 0)) : null,
          ordine: maxOrdine, note: '',
          codice_casistica: activeNotaSpeseCasistica,
          riferimento_attrezzatura_id: effectiveRiferimentoId || null
        })
        if (!isTesseraCartItem) existingCodes.add(codiceVoce)
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
}, [mode, currentOid, currentGlobalId, activeNotaSpeseCasistica, activeAttrezzaturaRiferimentoId, art30RecuperoMode])

React.useEffect(() => {
  setNoteSpeseSummary(nsComputeSummaryFromRows(nsRowsByCategoryToFlat(noteSpeseRowsDraft), noteSpesePercent))
}, [noteSpeseRowsDraft, noteSpesePercent])

React.useEffect(() => {
  setNoteSpeseManagerResetKey(k => k + 1)
}, [activeNotaSpeseCasistica])

const noteSpeseRowsDirty = React.useMemo(() => !nsRowsByCategoryEqual(noteSpeseRowsDraft, noteSpeseRowsBaseline), [noteSpeseRowsDraft, noteSpeseRowsBaseline])
const noteSpeseFormsDirty = React.useMemo(() => NS_CATEGORIES.some((cat) => !!noteSpeseFormDirtyByCategory[cat]), [noteSpeseFormDirtyByCategory])

React.useEffect(() => {
  setNoteSpeseDraftDirty(noteSpeseRowsDirty || noteSpeseFormsDirty)
}, [noteSpeseRowsDirty, noteSpeseFormsDirty])

React.useEffect(() => {
  if (!noteSpeseDraftStorageKey || isReadOnly || isRitAgrTecLimitedEdit) return
  if (!noteSpeseDraftDirty) return
  nsWriteDraftSnapshot(noteSpeseDraftStorageKey, noteSpeseRowsDraft, activeNotaSpeseCasistica)
}, [noteSpeseDraftStorageKey, noteSpeseDraftDirty, noteSpeseRowsDraft, activeNotaSpeseCasistica, isReadOnly, isRitAgrTecLimitedEdit])


  React.useEffect(() => {
    attachmentReadSeqRef.current += 1
    if (mode !== 'edit' || currentOid == null) {
      setAttachments([])
      setAttachmentsForOid(null)
      setAttachmentsLoading(false)
      setAttachmentsUploading(false)
      setAttachmentsError(null)
      setAttachmentFiles([])
      setPendingDeleteAttachmentIds([])
      setPendingReplaceAttachments({})
      setAttachmentConfirm(null)
      setReplaceTargetAttachment(null)
      setPreviewAttachment(null)
      setPreviewRotationDeg(0)
      return
    }
    setAttachments([])
    setAttachmentsForOid(null)
    setAttachmentsLoading(false)
    setAttachmentsUploading(false)
    setAttachmentsError(null)
    setAttachmentConfirm(null)
    setReplaceTargetAttachment(null)
    setPreviewAttachment(null)
    setPreviewRotationDeg(0)
  }, [mode, currentOid, currentLayerUrl, currentUserContextKey])

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
      url: a.url,
      keywords: a.keywords
    })).filter((a: any) => a && !isNaN(a.id))
  }, [])

  const loadCurrentAttachments = React.useCallback(async () => {
    const origin = captureAttachmentOperation()
    if (origin.oid == null || !isAttachmentOperationCurrent(origin)) return
    const seq = ++attachmentReadSeqRef.current
    const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))
    try {
      setAttachmentsLoading(true)
      setAttachmentsError(null)
      const layer = await resolveFeatureLayerForAttachments(ds as any, origin.layerUrl)
      if (!isAttachmentOperationCurrent(origin) || seq !== attachmentReadSeqRef.current) return
      if (!layer && !origin.layerUrl) throw new Error('Non riesco a risalire al FeatureLayer per leggere gli allegati.')
      let lastErr: any = null
      for (let i = 0; i < 4; i++) {
        try {
          const infos = await queryFeatureAttachments(layer, origin.oid, ds as any, origin.layerUrl)
          if (!isAttachmentOperationCurrent(origin) || seq !== attachmentReadSeqRef.current) return
          const clean = mapAttachmentInfos(infos || [])
          setAttachments(clean)
          setAttachmentsForOid(origin.oid)
          return
        } catch (err) {
          lastErr = err
          if (i < 3) await wait(350)
          if (!isAttachmentOperationCurrent(origin) || seq !== attachmentReadSeqRef.current) return
        }
      }
      throw lastErr || new Error('Lettura allegati non riuscita.')
    } catch (e: any) {
      if (!isAttachmentOperationCurrent(origin) || seq !== attachmentReadSeqRef.current) return
      setAttachmentsForOid(origin.oid)
      setAttachmentsError(e?.message || String(e))
    } finally {
      if (isAttachmentOperationCurrent(origin) && seq === attachmentReadSeqRef.current) setAttachmentsLoading(false)
    }
  }, [captureAttachmentOperation, isAttachmentOperationCurrent, ds, mapAttachmentInfos])

  const refreshCurrentAttachmentsAfterUpload = React.useCallback(async (opts?: { optimistic?: Array<{ id: number; name?: string; size?: number; contentType?: string; url?: string }>; expectedCount?: number | null; origin?: ReturnType<typeof captureAttachmentOperation> }) => {
    const origin = opts?.origin || captureAttachmentOperation()
    if (origin.oid == null || !isAttachmentOperationCurrent(origin)) return []
    const seq = ++attachmentReadSeqRef.current
    const optimistic = Array.isArray(opts?.optimistic) ? opts!.optimistic : []
    const expectedCount = Number.isFinite(Number(opts?.expectedCount)) ? Math.max(0, Number(opts?.expectedCount)) : null
    if (optimistic.length > 0) setAttachments(optimistic)
    setAttachmentsLoading(true)
    setAttachmentsError(null)
    const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))
    try {
      const layer = await resolveFeatureLayerForAttachments(ds as any, origin.layerUrl)
      if (!isAttachmentOperationCurrent(origin) || seq !== attachmentReadSeqRef.current) return []
      if (!layer && !origin.layerUrl) throw new Error('Non riesco a risalire al FeatureLayer per leggere gli allegati.')
      let best: any[] = []
      for (let i = 0; i < 8; i++) {
        const infos = await queryFeatureAttachments(layer, origin.oid, ds as any, origin.layerUrl)
        if (!isAttachmentOperationCurrent(origin) || seq !== attachmentReadSeqRef.current) return []
        const clean = mapAttachmentInfos(infos || [])
        best = clean
        if (expectedCount == null || clean.length === expectedCount) {
          setAttachments(clean)
          setAttachmentsForOid(origin.oid)
          return clean
        }
        if (i < 7) await wait(500)
        if (!isAttachmentOperationCurrent(origin) || seq !== attachmentReadSeqRef.current) return []
      }
      const next = best.length > 0 || expectedCount === 0 ? best : optimistic
      setAttachments(next)
      setAttachmentsForOid(origin.oid)
      return next
    } catch (e: any) {
      if (!isAttachmentOperationCurrent(origin) || seq !== attachmentReadSeqRef.current) return []
      if (optimistic.length > 0 || expectedCount === 0) setAttachments(optimistic)
      setAttachmentsError(e?.message || String(e))
      return optimistic
    } finally {
      if (isAttachmentOperationCurrent(origin) && seq === attachmentReadSeqRef.current) setAttachmentsLoading(false)
    }
  }, [captureAttachmentOperation, isAttachmentOperationCurrent, ds, mapAttachmentInfos])

  const getAttachmentPreferredUrl = React.useCallback(async (origin?: ReturnType<typeof captureAttachmentOperation>): Promise<string> => {
    const activeOrigin = origin || captureAttachmentOperation()
    if (!isAttachmentOperationCurrent(activeOrigin)) throw new Error('Il contesto della pratica è cambiato.')
    const layer = await resolveFeatureLayerForAttachments(ds as any, activeOrigin.layerUrl)
    if (!isAttachmentOperationCurrent(activeOrigin)) throw new Error('Il contesto della pratica è cambiato.')
    const url = ensureLayerIndex(normalizeFeatureLayerUrl(layer?.url) || activeOrigin.layerUrl, layer)
    if (!url) throw new Error('URL del FeatureLayer non disponibile per gli allegati.')
    return url
  }, [captureAttachmentOperation, isAttachmentOperationCurrent, ds])

  const uploadCurrentAttachments = React.useCallback(async (filesArg?: File[]) => {
    const files = Array.isArray(filesArg) ? filesArg : attachmentFiles
    const origin = captureAttachmentOperation()
    if (origin.oid == null || files.length === 0 || !isAttachmentOperationCurrent(origin)) return
    try {
      setAttachmentsUploading(true)
      setAttachmentsError(null)
      const preferredUrl = await getAttachmentPreferredUrl(origin)
      if (!isAttachmentOperationCurrent(origin)) return
      const uploaded = await uploadFilesToFeatureAttachments(ds as any, origin.oid, files, preferredUrl)
      if (!isAttachmentOperationCurrent(origin)) return
      const optimistic = [
        ...(Array.isArray(attachments) ? attachments : []),
        ...uploaded.map((a, idx) => ({ id: Number(a?.id) || -(idx + 1), name: a?.name, size: a?.size, contentType: a?.contentType, url: a?.url }))
      ]
      setAttachmentFiles([])
      setAttachmentInputKey(k => k + 1)
      setAttachments(optimistic)
      await refreshCurrentAttachmentsAfterUpload({ optimistic, expectedCount: optimistic.length, origin })
    } catch (e: any) {
      if (isAttachmentOperationCurrent(origin)) setAttachmentsError(e?.message || String(e))
    } finally {
      if (isAttachmentOperationCurrent(origin)) setAttachmentsUploading(false)
    }
  }, [attachmentFiles, captureAttachmentOperation, isAttachmentOperationCurrent, ds, attachments, refreshCurrentAttachmentsAfterUpload, getAttachmentPreferredUrl])

  const openReplacePicker = React.useCallback((att: { id: number; name?: string }) => {
    const origin = captureAttachmentOperation()
    if (!isAttachmentOperationCurrent(origin)) return
    setAttachmentsError(null)
    setReplaceTargetAttachment({ id: Number(att.id), name: att.name })
    window.setTimeout(() => {
      if (!isAttachmentOperationCurrent(origin)) return
      try { replaceInputRef.current?.click() } catch {}
    }, 0)
  }, [captureAttachmentOperation, isAttachmentOperationCurrent])

  const canRotateAttachments = mode === 'edit' && currentProfileRole === 'IT' && !isReadOnly && !isRitAgrTecLimitedEdit

  const buildItAttachmentPreviewUrl = React.useCallback(async (att: GiiAttachmentViewerItem): Promise<string | null> => {
    const origin = captureAttachmentOperation()
    if (!att || origin.oid == null || !isAttachmentOperationCurrent(origin)) return null
    const ct = String(att.contentType || '').toLowerCase()
    const name = String(att.name || '').toLowerCase()
    const hasDerivedPdfPreview = !!String((att as any).previewUrl || '').trim()
    const canPreviewDirect = hasDerivedPdfPreview || ct.startsWith('image/') || ct === 'application/pdf' || /\.(pdf|jpe?g|png|gif|webp|bmp|tif?f)$/i.test(name)
    if (!canPreviewDirect) return null
    const rawUrl = hasDerivedPdfPreview ? String((att as any).previewUrl || '').trim() : buildAttachmentRawUrl(att, origin.oid, origin.layerUrl)
    if (!rawUrl) return null
    let token = ''
    try {
      const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
      if (!isAttachmentOperationCurrent(origin)) return null
      const baseForCred = ensureLayerIndex(normalizeFeatureLayerUrl(origin.layerUrl)) || rawUrl
      const cred = IdentityManager?.findCredential?.(baseForCred) || IdentityManager?.findCredential?.(baseForCred.replace(/\/\d+$/, ''))
      token = cred?.token ? String(cred.token) : ''
    } catch {}
    if (!isAttachmentOperationCurrent(origin)) return null
    let finalUrl = rawUrl
    if (token && !/[?&]token=/.test(finalUrl)) finalUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
    finalUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}giiPreviewTs=${Date.now()}`
    const resp = await fetch(finalUrl, { credentials: 'same-origin' })
    if (!resp.ok) throw new Error(`Caricamento allegato fallito (HTTP ${resp.status}).`)
    const blob = await resp.blob()
    if (!isAttachmentOperationCurrent(origin)) return null
    return URL.createObjectURL(blob)
  }, [captureAttachmentOperation, isAttachmentOperationCurrent])

  const isRotatableAttachment = React.useCallback((att: { name?: string; contentType?: string }) => {
    const ct = String(att?.contentType || '').toLowerCase()
    const name = String(att?.name || '').toLowerCase()
    return ct.includes('jpeg') || ct.includes('jpg') || ct.includes('png') || /\.(jpe?g|png)$/i.test(name)
  }, [])

  const savePreviewRotation = React.useCallback(async () => {
    const normalizedRotation = ((Math.round(previewRotationDeg / 90) * 90) % 360 + 360) % 360
    const origin = captureAttachmentOperation()
    if (!canRotateAttachments || origin.oid == null || !previewAttachment || normalizedRotation === 0 || !isAttachmentOperationCurrent(origin)) return
    const selectedAttachment = (Array.isArray(visibleTechnicalAttachments) ? visibleTechnicalAttachments : []).find((a: any) => Number(a?.id) === Number(previewAttachment.id)) || previewAttachment
    if (!isRotatableAttachment(selectedAttachment)) return
    try {
      setAttachmentsUploading(true)
      setAttachmentsError(null)
      const preferredUrl = await getAttachmentPreferredUrl(origin)
      if (!isAttachmentOperationCurrent(origin)) return
      const blob = await fetchAttachmentBlobForEdit(selectedAttachment, origin.oid, preferredUrl || origin.layerUrl)
      if (!isAttachmentOperationCurrent(origin)) return
      const file = await rotateImageAttachmentFile(blob, selectedAttachment.name || `allegato_${selectedAttachment.id}.jpg`, normalizedRotation)
      if (!isAttachmentOperationCurrent(origin)) return
      await updateFeatureAttachmentOnFeature(ds as any, origin.oid, Number(selectedAttachment.id), file, preferredUrl)
      if (!isAttachmentOperationCurrent(origin)) return
      if (prevBlobRef.current) { try { URL.revokeObjectURL(prevBlobRef.current) } catch {} prevBlobRef.current = null }
      setPreviewBlobUrl(null)
      setPreviewLoading(true)
      setPreviewRotationDeg(0)
      const refreshedAttachments = await refreshCurrentAttachmentsAfterUpload({ expectedCount: Array.isArray(attachments) ? attachments.length : null, origin })
      if (!isAttachmentOperationCurrent(origin)) return
      const refreshedAttachment = (Array.isArray(refreshedAttachments) ? refreshedAttachments : []).find((a: any) => Number(a?.id) === Number(selectedAttachment.id)) || selectedAttachment
      setPreviewAttachment({
        id: Number(selectedAttachment.id),
        name: refreshedAttachment?.name || selectedAttachment.name,
        contentType: refreshedAttachment?.contentType || file.type || selectedAttachment.contentType
      })
    } catch (e: any) {
      if (isAttachmentOperationCurrent(origin)) setAttachmentsError(e?.message || String(e))
    } finally {
      if (isAttachmentOperationCurrent(origin)) setAttachmentsUploading(false)
    }
  }, [visibleTechnicalAttachments, canRotateAttachments, captureAttachmentOperation, isAttachmentOperationCurrent, ds, getAttachmentPreferredUrl, isRotatableAttachment, previewAttachment, previewRotationDeg, refreshCurrentAttachmentsAfterUpload, attachments])

  const confirmAttachmentAction = React.useCallback(async () => {
    const action = attachmentConfirm
    const origin = captureAttachmentOperation()
    if (!action || origin.oid == null || !isAttachmentOperationCurrent(origin)) return
    try {
      setAttachmentsUploading(true)
      setAttachmentsError(null)
      const preferredUrl = await getAttachmentPreferredUrl(origin)
      if (!isAttachmentOperationCurrent(origin)) return
      if (action.type === 'delete') {
        const id = Number(action.attachment?.id)
        if (Number.isFinite(id) && id > 0) {
          const optimistic = (Array.isArray(attachments) ? attachments : []).filter((a: any) => Number(a?.id) !== id)
          await deleteFeatureAttachmentsFromFeature(ds as any, origin.oid, [id], preferredUrl)
          if (!isAttachmentOperationCurrent(origin)) return
          setAttachments(optimistic)
          await refreshCurrentAttachmentsAfterUpload({ optimistic, expectedCount: optimistic.length, origin })
        }
      } else if (action.type === 'replace' && action.file) {
        const id = Number(action.attachment?.id)
        if (Number.isFinite(id) && id > 0) {
          await updateFeatureAttachmentOnFeature(ds as any, origin.oid, id, action.file, preferredUrl)
          if (!isAttachmentOperationCurrent(origin)) return
          const optimistic = (Array.isArray(attachments) ? attachments : []).map((a: any) => (
            Number(a?.id) === id
              ? { ...a, name: action.file?.name || a?.name, size: action.file?.size || a?.size, contentType: action.file?.type || a?.contentType }
              : a
          ))
          setAttachments(optimistic)
          setPreviewAttachment(null)
          await refreshCurrentAttachmentsAfterUpload({ optimistic, expectedCount: optimistic.length, origin })
        }
      }
    } catch (e: any) {
      if (isAttachmentOperationCurrent(origin)) setAttachmentsError(e?.message || String(e))
    } finally {
      if (isAttachmentOperationCurrent(origin)) {
        setAttachmentConfirm(null)
        setReplaceTargetAttachment(null)
        setReplaceInputKey(k => k + 1)
        setAttachmentsUploading(false)
      }
    }
  }, [attachmentConfirm, captureAttachmentOperation, isAttachmentOperationCurrent, ds, attachments, refreshCurrentAttachmentsAfterUpload, getAttachmentPreferredUrl])

  const cancelAttachmentAction = React.useCallback(() => {
    setAttachmentConfirm(null)
    setReplaceTargetAttachment(null)
    setReplaceInputKey(k => k + 1)
  }, [])

  React.useEffect(() => {
    // Carica subito gli allegati della pratica in apertura, non solo quando
    // l'operatore entra nella tab Allegati. In questo modo il badge della tab
    // mostra il conteggio reale fin dal caricamento del widget.
    if (mode === 'edit' && currentOid != null && attachmentsForOid !== currentOid) {
      void loadCurrentAttachments()
    }
  }, [mode, currentOid, attachmentsForOid, loadCurrentAttachments])

  const attrezzatureParametriUrl = String((cfg as any).attrezzatureParametriUrl || '').trim()

  // Catalogo attrezzature (Combo 3 in modalità recuperabile; prezzo/cauzione per le righe RA)
  // caricato una volta quando la casistica attiva è Art.30, non all'apertura della pratica.
  React.useEffect(() => {
    let cancelled = false
    if (activeNotaSpeseCasistica !== 'C104_ATTREZZATURE_DANNEGGIATE' || !attrezzatureParametriUrl) {
      setAttrezzatureCatalog([])
      setAttrezzatureCauzioneUnitaria(0)
      return () => { cancelled = true }
    }
    void (async () => {
      try {
        const bundle = await loadArt30ParametersBundle(attrezzatureParametriUrl, g('data_rilevazione'))
        if (cancelled) return
        setAttrezzatureCatalog(bundle.attrezzature)
        setAttrezzatureCauzioneUnitaria(bundle.cauzione)
      } catch {
        if (!cancelled) { setAttrezzatureCatalog([]); setAttrezzatureCauzioneUnitaria(0) }
      }
    })()
    return () => { cancelled = true }
  }, [activeNotaSpeseCasistica, attrezzatureParametriUrl, draft.data_rilevazione])

  // Norma violata 3 — select_multiple come Set (stringa separata da spazio)
  const norma3Set = React.useMemo(() => new Set(parseNorma3Codes(g('norma_violata3'))), [draft.norma_violata3])
  const norma3SelectedLabels = React.useMemo(() => CHOICES.norma3.filter(o => norma3Set.has(o.v)).map(o => o.l), [norma3Set])

  const toggleNorma3 = (v: string) => {
    const s = new Set(norma3Set)
    const isRemoving = s.has(v)
    const nsOpt = isRemoving ? getNotaSpeseCasisticaByArtCode(v) : null
    if (isRemoving && nsOpt && hasNotaSpeseRowsForCasistica(noteSpeseRowsDraft, nsOpt.codice)) {
      setMsg(null)
      setNotaSpeseLinkedViolationPopup({ codice: nsOpt.codice, art: nsOpt.art, label: nsOpt.label })
      return
    }
    if (isRemoving) s.delete(v); else s.add(v)
    const nextNorma3 = Array.from(s).join(' ')
    const vField = NORMA3_TO_VFIELD[v]
    const artCode = normalizeArtCode(v)
    setDraft(prev => {
      if (isRitAgrTecLimitedEdit && !ritAgrTecEditableDraftFields.has('norma_violata3')) return prev
      const next: any = { ...prev, norma_violata3: nextNorma3 }
      // Mantiene sincronizzati anche i campi flag v_artXX del FL madre: senza questo
      // il badge Violazione restava agganciato al valore salvato fino al successivo salvataggio.
      if (vField) next[vField] = isRemoving ? 0 : 1
      if (isRemoving && artCode) {
        const gradi = parseGradiViolazioni(next.gradi_violazioni)
        if (gradi[artCode] != null) {
          delete gradi[artCode]
          next.gradi_violazioni = buildGradiViolazioni(gradi, Array.from(s).map(normalizeArtCode).filter(code => RIT_GRADO_ART_CODES.includes(code as any)))
        }
      }
      return next
    })
  }

  // Derived
  const tipoSogg   = g('tipologia_soggetto')
  const tipoAbuso  = g('tipo_abuso')
  const norma1516  = g('norma16_17')
  const art17tipo  = g('art17_tipo')
  const n3parziale = g('norma15_parziale')
  const n3totale   = g('norma15_totale')

  const hasTipoAbuso15 = tipoAbuso === 'parziale' || tipoAbuso === 'totale'
  const art15Selected = art15SelectedUi || draftHasArt15Selection(draft)

  const reqPoint = React.useMemo(() => computeReqPoint({
    norma15_parziale: n3parziale,
    norma15_totale: n3totale,
    norma_violata3: g('norma_violata3'),
    attrezzature_risarcimento_dettaglio: g('attrezzature_risarcimento_dettaglio')
  }), [n3parziale, n3totale, draft.norma_violata3, draft.attrezzature_risarcimento_dettaglio])

  const ritGradoSelectedArts = React.useMemo(() => getRitGradoSelectedArts(draft), [draft])
  const ritGradiViolazioniMap = React.useMemo(() => parseGradiViolazioni(g('gradi_violazioni')), [draft.gradi_violazioni])
  const ritGradoTriggerViolations = ritGradoSelectedArts.length > 0
  const setRitGradoForArt = React.useCallback((art: string, grado: string) => {
    const next = parseGradiViolazioni(draft.gradi_violazioni)
    const artCode = normalizeArtCode(art)
    if (/^[1-4]$/.test(String(grado || '').trim())) next[artCode] = String(grado).trim()
    else delete next[artCode]
    set('gradi_violazioni', buildGradiViolazioni(next, ritGradoSelectedArts))
  }, [draft.gradi_violazioni, ritGradoSelectedArts])

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

  // View editabile IT/CS per la creazione (mai layer madre)
  const motherRef = React.useRef<any | null>(null)
  const getLayerForCreate = React.useCallback(async () => {
    const schemaUrl = ensureLayerIndex(normalizeFeatureLayerUrl(String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()))
    const dsUrl = ensureLayerIndex(normalizeFeatureLayerUrl((ds as any)?.getDataSourceJson?.()?.url || (ds as any)?.dataSourceJson?.url || (ds as any)?.layer?.url || (ds as any)?.url || ''))
    const ctx = currentUserContext
    const serviceNames = buildItCreateViewServiceNames(ctx.areaRaw, ctx.settoreRaw)

    if (!serviceNames.length) {
      throw new Error(`View di creazione non risolta dal contesto utente (utente=${ctx.username || '∅'}; area=${String(ctx.areaRaw ?? '') || '∅'}; settore=${String(ctx.settoreRaw ?? '') || '∅'}).`)
    }

    const baseUrl = dsUrl || schemaUrl
    if (!baseUrl) throw new Error('URL schema non configurata per la creazione della pratica.')

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

    throw new Error(`View di creazione non disponibile per il contesto utente corrente (${candidateUrls.join(', ')}).`)
  }, [cfg.schemaLayerUrl, cfg.motherLayerUrl, ds, currentUserContextKey])

  const toTs = (v: string) => {
    if (!v) return null
    try { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.getTime() } catch { return null }
  }
  const toInt = (v: any) => {
    const n = typeof v === 'number' ? v : parseInt(String(v), 10)
    return Number.isNaN(n) ? null : n
  }
  const toSurfaceInt = (v: any) => {
    const raw = parseSurfaceCentiareText(v)
    if (!raw) return null
    const n = parseInt(raw, 10)
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
    if (k.startsWith('it_assegnato_') || k.startsWith('dt_assegnazione_')) return false
    if (k.startsWith('ri_assegnato_') || k.startsWith('dt_assegnazione_ri')) return false
    if (k.startsWith('note_')) return false
    if (k.startsWith('ns_')) return false
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

  const AUDIT_MAP_POINT_FIELD = 'coordinate_punto_mappa'

  const formatAuditMapPoint = React.useCallback((pt: any): string => {
    if (!pt) return ''
    const lon = Number(pt.x ?? pt.longitude)
    const lat = Number(pt.y ?? pt.latitude)
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return ''
    if (Math.abs(lon) < 0.0000005 && Math.abs(lat) < 0.0000005) return ''
    return `Lon ${lon.toFixed(6)} - Lat ${lat.toFixed(6)}`
  }, [])

  const buildMapPointAuditDelta = React.useCallback((prevPoint: any, nextPoint: any): null | { before: string; after: string } => {
    const before = formatAuditMapPoint(prevPoint)
    const after = formatAuditMapPoint(nextPoint)
    return before === after ? null : { before, after }
  }, [formatAuditMapPoint])

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

  const globalIdVariantsForLog = React.useCallback((raw: any): string[] => {
    const s = String(raw ?? '').trim()
    if (!s) return []
    const clean = s.replace(/[{}]/g, '').trim()
    const variants = [s]
    if (clean) {
      variants.push(clean)
      variants.push(`{${clean}}`)
    }
    return Array.from(new Set(variants.filter(Boolean)))
  }, [])

  const parentGlobalIdWhereForLog = React.useCallback((raw: any): string => {
    const variants = globalIdVariantsForLog(raw)
    return variants.length
      ? variants.map(g => `parent_globalid = ${sqlQuote(g)}`).join(' OR ')
      : '1=0'
  }, [globalIdVariantsForLog, sqlQuote])

  const getLogObjectIdValue = React.useCallback((attrs: any, layer?: any): any => {
    const oidField = String(layer?.objectIdField || 'OBJECTID')
    return pickAttrCI(attrs, [oidField, 'OBJECTID', 'ObjectID', 'ObjectId', 'objectId', 'objectid'])
  }, [])

  const getAuditRole = React.useCallback((): string => {
    const r = String(currentUserContext.role || '').trim().toUpperCase()
    return (r === 'IT' || r === 'RIT') ? r : ''
  }, [currentUserContext.role])

  const findOpenRoleCycle = React.useCallback(async (parentGlobalId: string, ruoloCompetente: string) => {
    if (!parentGlobalId || !ruoloCompetente) return null
    const logLayer = await getLogLayer()
    if (!logLayer?.queryFeatures) return null
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `(${parentGlobalIdWhereForLog(parentGlobalId)}) AND ruolo_competente = ${sqlQuote(ruoloCompetente)} AND stato_record = 'APERTO'`
    q.outFields = ['*']
    q.returnGeometry = false
    q.num = 1
    const oidField = String(logLayer.objectIdField || 'OBJECTID')
    q.orderByFields = ['numero_ciclo_ruolo DESC', `${oidField} DESC`]
    const res = await logLayer.queryFeatures(q)
    return res?.features?.[0] || null
  }, [getLogLayer, parentGlobalIdWhereForLog, sqlQuote])

  const getNextRoleCycleNumber = React.useCallback(async (parentGlobalId: string, ruoloCompetente: string): Promise<number> => {
    if (!parentGlobalId || !ruoloCompetente) return 1
    const logLayer = await getLogLayer()
    if (!logLayer?.queryFeatures) return 1
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `(${parentGlobalIdWhereForLog(parentGlobalId)}) AND ruolo_competente = ${sqlQuote(ruoloCompetente)}`
    q.outFields = ['numero_ciclo_ruolo']
    q.returnGeometry = false
    q.num = 1
    const oidField = String(logLayer.objectIdField || 'OBJECTID')
    q.orderByFields = ['numero_ciclo_ruolo DESC', `${oidField} DESC`]
    try {
      const res = await logLayer.queryFeatures(q)
      const lastNum = Number(res?.features?.[0]?.attributes?.numero_ciclo_ruolo || 0)
      return Number.isFinite(lastNum) && lastNum > 0 ? lastNum + 1 : 1
    } catch {
      return 1
    }
  }, [getLogLayer, parentGlobalIdWhereForLog, sqlQuote])

  const upsertCurrentRoleCycleAudit = React.useCallback(async (prevAttrs: Record<string, any>, nextAttrs: Record<string, any>) => {
    const roleForLog = getAuditRole()
    if (!roleForLog) return 0
    const parentGlobalId = String(currentGlobalId || p.initialData?.GlobalID || p.initialData?.globalid || p.initialData?.GLOBALID || '')
    if (!parentGlobalId || editOid == null) {
      console.warn('[GII_LOG_EVENTI_CICLI] Audit ciclo saltato: parent_globalid non disponibile.', { roleForLog, editOid })
      return 0
    }
    const delta = buildDeltaMaps(prevAttrs, nextAttrs)
    if (Object.keys(delta.oldMap).length === 0) return 0
    const logLayer = await getLogLayer()
    if (!logLayer?.applyEdits) return 0
    const giiCtx = currentUserContext
    const practiceArea = normalizeAreaCode(pickAttrCI(p.initialData || {}, ['area_cod', 'AREA_COD', 'area']))
    const area = practiceArea || giiCtx.area
    const practiceSettore = normalizeSettoreCode(area, pickAttrCI(p.initialData || {}, ['settore_cod', 'SETTORE_COD', 'settore']))
    const settore = practiceSettore || giiCtx.settore
    const username = String(giiCtx.username || '').trim()
    const sessionId = `${roleForLog.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    let openFeature = await findOpenRoleCycle(parentGlobalId, roleForLog)
    if (!openFeature?.attributes) {
      const nextNum = await getNextRoleCycleNumber(parentGlobalId, roleForLog)
      const addAttrs = filterAttrsForLayer({
        parent_globalid: parentGlobalId,
        parent_objectid: editOid,
        numero_ciclo_ruolo: nextNum,
        ruolo_competente: roleForLog,
        utente_operatore: username,
        stato_record: 'APERTO',
        evento_apertura: 'PRESA_IN_CARICO',
        dt_apertura: Date.now(),
        area,
        settore,
        fase: roleForLog,
        session_id: sessionId,
        num_campi_modificati: 0,
        campi_modificati: '',
        valori_prima_json: '',
        valori_dopo_json: '',
        riepilogo_ciclo: ''
      }, logLayer)
      try {
        const addRes = await logLayer.applyEdits({ addFeatures: [{ attributes: addAttrs }] })
        const add = addRes?.addFeatureResults?.[0] || addRes?.addResults?.[0] || null
        if (add?.error) throw new Error(add.error.message || JSON.stringify(add.error))
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Errore creazione ciclo audit:', e)
      }
      openFeature = await findOpenRoleCycle(parentGlobalId, roleForLog)
    }

    if (!openFeature?.attributes) return 0
    const attrs = openFeature.attributes || {}
    const existingOld = parseJsonObject(attrs.valori_prima_json)
    const existingNew = parseJsonObject(attrs.valori_dopo_json)
    const merged = mergeCycleMaps(existingOld, existingNew, delta.oldMap, delta.newMap)
    const num = merged.fields.length
    const updAttrs = filterAttrsForLayer({
      [String(logLayer.objectIdField || 'OBJECTID')]: getLogObjectIdValue(attrs, logLayer),
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
      const updRes = await logLayer.applyEdits({ updateFeatures: [{ attributes: updAttrs }] })
      const upd = updRes?.updateFeatureResults?.[0] || updRes?.updateResults?.[0] || null
      if (upd?.error) throw new Error(upd.error.message || JSON.stringify(upd.error))
      try { window.dispatchEvent(new CustomEvent('gii-log-eventi-cicli-changed', { detail: { source: 'gii-editing-tec', oid: editOid, role: roleForLog, ts: Date.now() } })) } catch {}
      return num
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Errore aggiornamento audit ciclo:', e)
      return 0
    }
  }, [buildDeltaMaps, currentGlobalId, editOid, findOpenRoleCycle, getAuditRole, getLogLayer, getLogObjectIdValue, getNextRoleCycleNumber, mergeCycleMaps, p.initialData, parseJsonObject, currentUserContextKey])

  const processAttachmentChanges = React.useCallback(async (_oid: number, _preferredUrl?: string | null) => {
    // Gli allegati vengono gestiti immediatamente (allega/sostituisci/elimina), non al Salva della pratica.
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
    setArt15SelectedUi(draftHasArt15Selection(baselineDraft))
    setNoteSpeseRowsDraft(nsCloneRowsByCategory(noteSpeseRowsBaseline))
    setNoteSpeseSummary(nsComputeSummaryFromRows(nsRowsByCategoryToFlat(noteSpeseRowsBaseline), noteSpesePercent))
    setNoteSpeseFormDirtyByCategory({ AT: false, PR: false, RU: false, SL: false, PF: false, RA: false })
    setNoteSpeseManagerResetKey(k => k + 1)
    if (noteSpeseDraftStorageKey) nsClearDraftSnapshot(noteSpeseDraftStorageKey)
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
    if (isReadOnly || !isDirty || saving) return
    setCancelUnsavedPopupOpen(true)
  }

  const handleCloseEdit = () => {
    if (saving || isDirty) return
    p.onCloseEdit?.()
  }

  const handleSave = async () => {
    if (isReadOnly) return
    const saveContextStamp = getGiiPracticeContextStamp()
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

    const duplicateTesseraMatricole = getDuplicateTesseraMatricole(noteSpeseRowsDraft)
    if (duplicateTesseraMatricole.length > 0) {
      setValidationPopup({
        title: 'Matricola tessera duplicata',
        text: `Le matricole delle tessere devono essere univoche nella stessa pratica. Matricola${duplicateTesseraMatricole.length > 1 ? 'e' : ''} duplicata${duplicateTesseraMatricole.length > 1 ? 'e' : ''}: ${duplicateTesseraMatricole.join(', ')}.`
      })
      return
    }


    const art15HasData = !!String(n3parziale || n3totale || '').trim() ||
      !!String(g('occorrenza') || '').trim() ||
      surfaceToCentiareNumber(g('sup_dichiarata_art15')) > 0 ||
      surfaceToCentiareNumber(g('sup_irrigata_art15')) > 0

    if (!hasTipoAbuso15 && (art15Selected || art15HasData)) {
      setValidationPopup({
        title: 'Tipo di abuso obbligatorio',
        text: "Per l'Art. 15, selezionare il tipo di abuso: Parziale oppure Totale."
      })
      return
    }

    if (tipoAbuso === 'parziale') {
      const dich = surfaceToCentiareNumber(g('sup_dichiarata_art15'))
      const irr = surfaceToCentiareNumber(g('sup_irrigata_art15'))
      if (dich <= 0) {
        setValidationPopup({
          title: 'Superficie dichiarata non valida',
          text: 'Per l\'Art. 15 (abuso parziale), la superficie dichiarata deve essere compilata e maggiore di 0. Se la superficie dichiarata è pari a 0, selezionare il tipo di abuso Totale.'
        })
        return
      }
      if (irr <= 0) {
        setValidationPopup({
          title: 'Superficie irrigata non valida',
          text: 'Per l\'Art. 15 (abuso parziale), la superficie irrigata deve essere compilata e maggiore di 0.'
        })
        return
      }
      if (irr <= dich) {
        setValidationPopup({
          title: 'Superficie irrigata non valida',
          text: 'La superficie irrigata deve essere superiore a quella dichiarata per l\'Art. 15 (abuso parziale).'
        })
        return
      }
    }

    if (tipoAbuso === 'totale') {
      const irr = surfaceToCentiareNumber(g('sup_irrigata_art15'))
      if (irr <= 0) {
        setValidationPopup({
          title: 'Superficie irrigata non valida',
          text: 'Per l\'Art. 15 (abuso totale), la superficie irrigata deve essere compilata e maggiore di 0.'
        })
        return
      }
    }

    if (norma1516 === 'Art16') {
      const dich = surfaceToCentiareNumber(g('sup_dichiarata_art16'))
      if (dich <= 0) {
        setValidationPopup({
          title: 'Superficie dichiarata non valida',
          text: 'Per l\'Art. 16, la superficie dichiarata deve essere compilata e maggiore di 0.'
        })
        return
      }
    }

    if (norma1516 === 'Art17') {
      if (!art17tipo) {
        setValidationPopup({
          title: 'Tipo comunicazione obbligatorio',
          text: 'Per l\'Art. 17, selezionare il tipo di comunicazione: Variazione tardiva oppure Rinuncia tardiva.'
        })
        return
      }

      if (art17tipo === 'Art17.1') {
        const dich = surfaceToCentiareNumber(g('sup_dichiarata_art17_1'))
        const variata = surfaceToCentiareNumber(g('sup_irrigata_art17_1'))
        if (dich <= 0) {
          setValidationPopup({
            title: 'Superficie dichiarata non valida',
            text: 'Per l\'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia (variazione tardiva), la superficie dichiarata deve essere compilata e maggiore di 0.'
          })
          return
        }
        if (variata <= 0) {
          setValidationPopup({
            title: 'Superficie variata non valida',
            text: 'Per l\'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia (variazione tardiva), la superficie variata deve essere compilata e maggiore di 0. Se la superficie variata è pari a 0, selezionare il tipo di comunicazione Rinuncia tardiva.'
          })
          return
        }
      }

      if (art17tipo === 'Art17.2') {
        const dich = surfaceToCentiareNumber(g('sup_dichiarata_art17_2'))
        if (dich <= 0) {
          setValidationPopup({
            title: 'Superficie dichiarata non valida',
            text: 'Per l\'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia (rinuncia tardiva), la superficie dichiarata deve essere compilata e maggiore di 0.'
          })
          return
        }
      }
    }

    if (selectedViolazioniCount > 0 && !String(g('presenza_trasgressore') || '').trim()) {
      setValidationPopup({
        title: 'Presenza trasgressore obbligatoria',
        text: 'Indicare se il trasgressore era presente al momento del rilevamento.'
      })
      return
    }

    const hasValidExistingMapPoint = !!(p.existingGeomWgs84 && (Number(p.existingGeomWgs84.x) !== 0 || Number(p.existingGeomWgs84.y) !== 0))
    if (reqPoint === 1 && !p.clickedPointWgs84 && !hasValidExistingMapPoint) {
      setMsg(null)
      setMissingMapPointPopupOpen(true)
      return
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
          setSaving(false)
          setMsg(null)
          setMissingMapPointPopupOpen(true)
          return
        }
      }

      // Converte il plain WGS84 in un vero esri/geometry/Point nella SR del layer
      const geom = isRitAgrTecLimitedEdit ? null : (geomWgs84 ? await toLayerPoint(geomWgs84, layer) : null)

      const normaV1 = tipoAbuso === 'parziale' ? n3parziale : (tipoAbuso === 'totale' ? n3totale : '')
      const normaV2 = norma1516 === 'Art16' ? 'Art16' : (norma1516 === 'Art17' && art17tipo ? art17tipo : norma1516)
      const supDich16_17 = norma1516 === 'Art16' ? (draft.sup_dichiarata_art16 ?? null) : (art17tipo === 'Art17.1' ? (draft.sup_dichiarata_art17_1 ?? null) : (draft.sup_dichiarata_art17_2 ?? null))
      const supIrr16_17  = norma1516 === 'Art16' || art17tipo === 'Art17.2' ? (draft.sup_irrigata_art16_17_2 ?? null) : (art17tipo === 'Art17.1' ? (draft.sup_irrigata_art17_1 ?? null) : null)

      const vArtAttrs: Record<string, number | null> = {}
      for (const [art, field] of Object.entries(NORMA3_TO_VFIELD)) {
        vArtAttrs[field] = norma3Set.has(art) ? 1 : null
      }

      const giiCtx = currentUserContext
      const roleAreaLabel = giiCtx.area
      const roleSettoreLabel = giiCtx.settore
      const nowTs = Date.now()
      const createStartTs = mode === 'create' ? createStartedAtRef.current : null
      const createSurveyDefaults = mode === 'create' ? await resolveCreateSurveyLikeDefaults(layer, giiCtx) : null
      const currentGiiUserDisplayName = mode === 'create' ? getCurrentGiiUserDisplayName(giiCtx.username) : ''
      const initialAreaLabel = normalizeAreaCode(p.initialData?.area_cod ?? p.initialData?.['Area (codice)'] ?? p.initialData?.AREA_COD)
      const initialSettoreLabel = normalizeSettoreCode(initialAreaLabel || roleAreaLabel, p.initialData?.settore_cod ?? p.initialData?.['Settore (codice)'] ?? p.initialData?.SETTORE_COD)
      const attrs: Record<string, any> = {
        start: mode === 'create' ? (createStartTs || nowTs) : (p.initialData?.start ?? p.initialData?.Start ?? p.initialData?.START ?? null),
        end: mode === 'create' ? nowTs : (p.initialData?.end ?? p.initialData?.End ?? p.initialData?.END ?? null),
        origine_pratica: mode === 'create' ? 2 : (p.initialData?.origine_pratica ?? p.initialData?.Origine_pratica ?? p.initialData?.ORIGINE_PRATICA ?? 2),
        stato_IT: mode === 'create' ? STATO_PRESA_IN_CARICO : (p.initialData?.stato_IT ?? p.initialData?.Stato_IT ?? p.initialData?.STATO_IT ?? null),
        dt_stato_IT: mode === 'create' ? nowTs : (p.initialData?.dt_stato_IT ?? p.initialData?.Dt_stato_IT ?? p.initialData?.DT_STATO_IT ?? null),
        dt_presa_in_carico_IT: mode === 'create' ? nowTs : (p.initialData?.dt_presa_in_carico_IT ?? p.initialData?.Dt_presa_in_carico_IT ?? p.initialData?.DT_PRESA_IN_CARICO_IT ?? null),
        it_assegnato_username: mode === 'create' ? String(giiCtx.username || '') : (p.initialData?.it_assegnato_username ?? p.initialData?.It_assegnato_username ?? p.initialData?.IT_ASSEGNATO_USERNAME ?? null),
        it_assegnato_nome: mode === 'create' ? currentGiiUserDisplayName : (p.initialData?.it_assegnato_nome ?? p.initialData?.It_assegnato_nome ?? p.initialData?.IT_ASSEGNATO_NOME ?? null),
        dt_assegnazione_it: mode === 'create' ? nowTs : (p.initialData?.dt_assegnazione_it ?? p.initialData?.Dt_assegnazione_it ?? p.initialData?.DT_ASSEGNAZIONE_IT ?? null),
        it_assegnato_da: mode === 'create' ? String(giiCtx.username || '') : (p.initialData?.it_assegnato_da ?? p.initialData?.It_assegnato_da ?? p.initialData?.IT_ASSEGNATO_DA ?? null),
        utente_loggato: String(giiCtx.username || p.initialData?.utente_loggato || ''),
        area_cod: String((mode === 'create' ? roleAreaLabel : (initialAreaLabel || roleAreaLabel)) || ''),
        settore_cod: String((mode === 'create' ? roleSettoreLabel : (initialSettoreLabel || roleSettoreLabel)) || ''),
        tecnico_rilevatore: mode === 'create' ? (currentGiiUserDisplayName || createSurveyDefaults?.tecnicoRilevatore || g('tecnico_rilevatore') || null) : (g('tecnico_rilevatore') || null),
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
        provincia: g('provincia') || null,
        cap: g('cap') || null,
        stato: g('stato') || 'ITALIA',
        email: String(g('email') || '').trim().toLocaleLowerCase('it-IT') || null,
        pec: String(g('pec') || '').trim().toLocaleLowerCase('it-IT') || null,
        telefono: g('telefono') || null,
        cellulare: g('cellulare') || null,
        tipo_abuso: tipoAbuso || null,
        norma15_parziale: (tipoAbuso === 'parziale' ? n3parziale : null) || null,
        norma15_totale: (tipoAbuso === 'totale' ? n3totale : null) || null,
        norma_violata1: normaV1 || null,
        sup_dichiarata_art15: tipoAbuso === 'totale' ? 0 : (hasTipoAbuso15 ? toSurfaceInt(g('sup_dichiarata_art15')) : null),
        sup_irrigata_art15: hasTipoAbuso15 ? toSurfaceInt(g('sup_irrigata_art15')) : null,
        norma16_17: norma1516 || null,
        art17_tipo: (norma1516 === 'Art17' ? art17tipo : null) || null,
        norma_violata2: normaV2 || null,
        sup_dichiarata_art17_1: norma1516 === 'Art17' && art17tipo === 'Art17.1' ? toSurfaceInt(g('sup_dichiarata_art17_1')) : null,
        sup_dichiarata_art16: norma1516 === 'Art16' ? toSurfaceInt(g('sup_dichiarata_art16')) : null,
        sup_dichiarata_art17_2: norma1516 === 'Art17' && art17tipo === 'Art17.2' ? toSurfaceInt(g('sup_dichiarata_art17_2')) : null,
        sup_irrigata_art16_17_2: norma1516 === 'Art16' ? 0 : (art17tipo === 'Art17.2' ? 0 : null),
        sup_irrigata_art17_1: art17tipo === 'Art17.1' ? toSurfaceInt(g('sup_irrigata_art17_1')) : null,
        sup_dichiarata_art16_17: toSurfaceInt(supDich16_17 as any),
        sup_irrigata_art16_17: toSurfaceInt(supIrr16_17 as any),
        norma_violata3: g('norma_violata3') || null,
        ...vArtAttrs,
        descrizione_fatti: g('descrizione_fatti') || null,
        circostanze: g('circostanze') || null,
        presenza_trasgressore: g('presenza_trasgressore') || null,
        descrizione_luogo: g('descrizione_luogo') || null,
        data_firma: mode === 'create' ? nowTs : toTs(g('data_firma')),
        req_point: reqPoint,
        // Trasgressore — nuovi campi
        qualifica_fondo: toInt(g('qualifica_fondo')),
        dom_notifica_uguale: toInt(g('dom_notifica_uguale')),
        dom_notifica_via: String(g('dom_notifica_uguale')) !== '1' ? (g('dom_notifica_via') || null) : null,
        dom_notifica_civico: String(g('dom_notifica_uguale')) !== '1' ? (g('dom_notifica_civico') || null) : null,
        dom_notifica_citta: String(g('dom_notifica_uguale')) !== '1' ? (g('dom_notifica_citta') || null) : null,
        dom_notifica_provincia: String(g('dom_notifica_uguale')) !== '1' ? (g('dom_notifica_provincia') || null) : null,
        dom_notifica_cap: String(g('dom_notifica_uguale')) !== '1' ? (g('dom_notifica_cap') || null) : null,
        dom_notifica_stato: String(g('dom_notifica_uguale')) !== '1' ? (g('dom_notifica_stato') || 'ITALIA') : null,
        rl_nome: (tipoSogg === 'PG' ? g('rl_nome') : null) || null,
        rl_cognome: (tipoSogg === 'PG' ? g('rl_cognome') : null) || null,
        rl_cf: (tipoSogg === 'PG' ? g('rl_cf') : null) || null,
        rl_carica: (tipoSogg === 'PG' ? g('rl_carica') : null) || null,
        rl_dom_notifica: tipoSogg === 'PG' ? toInt(g('rl_dom_notifica')) : null,
        rl_dom_via: (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? g('rl_dom_via') : null) || null,
        rl_dom_civico: (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? g('rl_dom_civico') : null) || null,
        rl_dom_citta: (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? g('rl_dom_citta') : null) || null,
        rl_dom_provincia: (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? g('rl_dom_provincia') : null) || null,
        rl_dom_cap: (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? g('rl_dom_cap') : null) || null,
        rl_dom_stato: tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1' ? (g('rl_dom_stato') || 'ITALIA') : null,
        note_anagrafica: g('note_anagrafica') || null,
        // Valutazione RIT: gradi puntuali per articolo e occorrenza Art. 15
        gradi_violazioni: g('gradi_violazioni') || null,
        occorrenza: toInt(g('occorrenza')),
        // Dati tecnici (erano mancanti)
        distretto: g('distretto') || null,
        comizio: toInt(g('comizio')),
        idrante: toInt(g('idrante')),
        matricola_contatore: g('matricola_contatore') || null,
        matricola_tessera: g('matricola_tessera') || null,
        // Art. 30 — snapshot del rimborso attrezzature selezionato dall'IT AGR/TEC.
        // Il rimborso spese per manodopera/mezzi/materiali resta invece nella Nota spese.
        attrezzature_risarcimento_dettaglio: g('attrezzature_risarcimento_dettaglio') || null,
        attrezzature_risarcimento_importo: String(g('attrezzature_risarcimento_importo') || '').trim() ? Number(g('attrezzature_risarcimento_importo')) : null,
        attrezzature_cauzione_presente: isSelectedFlag(g('attrezzature_cauzione_presente')) ? 1 : 0,
        attrezzature_cauzione_decurtata: String(g('attrezzature_cauzione_decurtata') || '').trim() ? Number(g('attrezzature_cauzione_decurtata')) : null,
        attrezzature_importo_netto: String(g('attrezzature_importo_netto') || '').trim() ? Number(g('attrezzature_importo_netto')) : null
      }

      const cleanAttrsAll = filterAttrsForLayer(attrs, layer)
      const ritAgrTecEffectiveSaveFields = new Set(Array.from(ritAgrTecEditableSaveFields).map(k => String(k).toLowerCase()))
      if (!ritGradoTriggerViolations) ritAgrTecEffectiveSaveFields.delete('gradi_violazioni')
      if (!hasTipoAbuso15) ritAgrTecEffectiveSaveFields.delete('occorrenza')
      const cleanAttrs = (mode === 'edit' && isRitAgrTecLimitedEdit)
        ? Object.fromEntries(Object.entries(cleanAttrsAll).filter(([k]) => ritAgrTecEffectiveSaveFields.has(String(k).toLowerCase())))
        : cleanAttrsAll

      if (mode === 'edit') {
        if (editOid == null) throw new Error('Nessuna pratica selezionata per la modifica.')
        const auditFallbackUrl = currentLayerUrl || String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()
        let prevAttrs = filterAttrsForLayer(p.initialData || {}, layer)
        if (auditFallbackUrl && editOid != null) {
          try {
            const liveAttrs = await loadRecordAttrsByOid(auditFallbackUrl, editIdFieldName, Number(editOid))
            if (liveAttrs && Object.keys(liveAttrs).length) prevAttrs = filterAttrsForLayer(liveAttrs, layer)
          } catch (e) {
            console.warn('[GII_LOG_EVENTI_CICLI] Impossibile rileggere il record prima del salvataggio:', e)
          }
        }
        const changedFields = Object.keys(cleanAttrs).filter((k) => normalizeLogValue(prevAttrs?.[k]) !== normalizeLogValue(cleanAttrs[k]))
        const hasAttachmentOps = !isRitAgrTecLimitedEdit && (attachmentFiles.length > 0 || pendingDeleteAttachmentIds.length > 0 || Object.keys(pendingReplaceAttachments).length > 0)
        const hasNoteSpeseOps = !isRitAgrTecLimitedEdit && noteSpeseDraftDirty
        if (changedFields.length === 0 && !geom && !hasAttachmentOps && !hasNoteSpeseOps) {
          setSaving(false)
          setMsg({ kind: 'ok', text: 'Nessuna modifica da salvare.' })
          return
        }
        if (changedFields.length === 0 && !geom) {
          if (!isGiiPracticeContextStampCurrent(saveContextStamp)) { setSaving(false); return }
          if (hasAttachmentOps) {
            await processAttachmentChanges(editOid, String(layer?.url || currentLayerUrl || ''))
          }
          if (hasNoteSpeseOps && currentGlobalId && noteSpeseMissing.length === 0) {
            await syncNotaSpeseDraftToTable(noteSpeseCfg.detailUrlWrite, currentGlobalId, noteSpeseRowsBaseline, noteSpeseRowsDraft)
            const parentUrl = currentLayerUrl || String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()
            if (parentUrl) {
              const summary = await recomputeAndPersistNotaSpeseSummary({
                parentLayerUrl: parentUrl,
                parentObjectId: Number(editOid),
                parentIdFieldName: editIdFieldName,
                parentGlobalId: currentGlobalId,
                detailTableUrl: noteSpeseCfg.detailUrlWrite,
                parametriUrl: noteSpeseCfg.parametriUrl,
                parametroCode: noteSpeseCfg.parametroCode
              })
              setNoteSpeseSummary(summary)
            }
            if (noteSpeseDraftStorageKey) nsClearDraftSnapshot(noteSpeseDraftStorageKey)
            await loadNotaSpeseDraft()
            setNoteSpeseFormDirtyByCategory({ AT: false, PR: false, RU: false, SL: false, PF: false, RA: false })
            setNoteSpeseManagerResetKey(k => k + 1)
          }
          if (!isGiiPracticeContextStampCurrent(saveContextStamp)) { setSaving(false); return }
          setBaselineDraft(draftFromRecord(p.initialData || {}))
          setDraft(draftFromRecord(p.initialData || {}))
          setMsg({ kind: 'ok', text: hasAttachmentOps && !hasNoteSpeseOps ? 'Allegati salvati.' : 'Pratica salvata.' })
          setSaving(false)
          window.setTimeout(() => setMsg(null), 2500)
          p.onSaved?.(editOid, p.initialData || {}, saveContextStamp)
          return
        }
        const upd: any = { attributes: { ...cleanAttrs, [editIdFieldName]: editOid } }
        if (geom) upd.geometry = geom
        if (!isGiiPracticeContextStampCurrent(saveContextStamp)) { setSaving(false); return }
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
          await syncNotaSpeseDraftToTable(noteSpeseCfg.detailUrlWrite, currentGlobalId, noteSpeseRowsBaseline, noteSpeseRowsDraft)
          const parentUrl = currentLayerUrl || String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()
          if (parentUrl) {
            const nsSummary = await recomputeAndPersistNotaSpeseSummary({
              parentLayerUrl: parentUrl,
              parentObjectId: Number(editOid),
              parentIdFieldName: editIdFieldName,
              parentGlobalId: currentGlobalId,
              detailTableUrl: noteSpeseCfg.detailUrlWrite,
              parametriUrl: noteSpeseCfg.parametriUrl,
              parametroCode: noteSpeseCfg.parametroCode
            })
            setNoteSpeseSummary(nsSummary)
          }
          if (noteSpeseDraftStorageKey) nsClearDraftSnapshot(noteSpeseDraftStorageKey)
          await loadNotaSpeseDraft()
          setNoteSpeseFormDirtyByCategory({ AT: false, PR: false, RU: false, SL: false, PF: false, RA: false })
          setNoteSpeseManagerResetKey(k => k + 1)
        }
        const mapPointAuditDelta = geom ? buildMapPointAuditDelta(p.existingGeomWgs84, geomWgs84) : null
        const auditPrevAttrs = mapPointAuditDelta ? { ...prevAttrs, [AUDIT_MAP_POINT_FIELD]: mapPointAuditDelta.before } : prevAttrs
        const auditNextAttrs = mapPointAuditDelta
          ? { ...prevAttrs, ...cleanAttrs, [AUDIT_MAP_POINT_FIELD]: mapPointAuditDelta.after }
          : { ...prevAttrs, ...cleanAttrs }
        await upsertCurrentRoleCycleAudit(auditPrevAttrs, auditNextAttrs)
        if (!isGiiPracticeContextStampCurrent(saveContextStamp)) { setSaving(false); return }
        const nextLayerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(layer?.url) || normalizeFeatureLayerUrl(readDynamicSelection().layerUrl), layer)
        writeSelectedFeatureCache(nextLayerUrl, editOid, editIdFieldName, nextSavedData, 'edit')
        invalidateRuntimeProxyCache(nextLayerUrl)
        writeDynamicSelection({ oid: editOid, layerUrl: nextLayerUrl, idFieldName: editIdFieldName, data: nextSavedData }, undefined, saveContextStamp)
        try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: editOid, layerUrl: nextLayerUrl } })) } catch {}
        const nextIntent: EditIntentInfo = { oid: editOid, layerUrl: nextLayerUrl, idFieldName: editIdFieldName, data: nextSavedData, ts: Date.now() }
        try { ;(window as any).__giiEdit = stampGiiPracticePayload(nextIntent, saveContextStamp) } catch {}
        writeEditIntent(nextIntent, saveContextStamp)
        setBaselineDraft(draftFromRecord(nextSavedData))
        setDraft(draftFromRecord(nextSavedData))
        if (p.onGeomSaved) { p.onGeomSaved(reqPoint === 0 ? null : (geomWgs84 || p.existingGeomWgs84 || null)) } else { p.onClearPoint() }
        setMsg({ kind: 'ok', text: 'Pratica salvata.' })
        setSaving(false)
        window.setTimeout(() => setMsg(null), 2500)
        p.onSaved?.(editOid, nextSavedData, saveContextStamp)
        return
      }

      if (!isGiiPracticeContextStampCurrent(saveContextStamp)) { setSaving(false); return }
      const res = await layer.applyEdits({ addFeatures: [{ attributes: cleanAttrs, geometry: geom }] })
      const added = res?.addFeatureResults?.[0] || res?.addResults?.[0] || null
      const err = added?.error
      const ok = !err && (added?.objectId != null || added?.success === true || added?.success == null)
      if (!ok) throw new Error(err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res))

      const newOid = Number(added.objectId)
      if (!isGiiPracticeContextStampCurrent(saveContextStamp)) { setSaving(false); return }
      
      // Numero della rilevazione: OBJECTID-TR/IT-settore.
      const newPraticaCode = buildPraticaCodeFromData(cleanAttrs, newOid)

      // In create mode NON aggiornare la datasource schema/base e NON provare a selezionare il nuovo OID:
      // queste due operazioni possono riattivare il banner credenziali quando la pagina usa solo lo schema.
      const createdLayerUrl = ensureLayerIndex(normalizeFeatureLayerUrl(layer?.url || ''))
      const recordInfo = { oid: newOid, layerUrl: createdLayerUrl, data: { ...cleanAttrs }, ...saveContextStamp }
      setCreatedRecordInfo(recordInfo)
      createdRecordInfoRef.current = recordInfo
      setMsg({ kind: 'ok', text: 'Rilevazione creata.' })
      setSaving(false)
      setCreateSuccessPraticaCode(newPraticaCode)
      setShowCreateSuccessPopup(true)
      p.onSaved?.(newOid, undefined, saveContextStamp)
    } catch (e: any) {
      setSaving(false)
      showGeneralErrorPopup(
        'Errore salvataggio',
        `Si è verificato un errore durante il salvataggio della pratica.

${e?.message || String(e)}`
      )
    }
  }


  
  const showDatiGen = p.showDatiGenerali

  const selectedViolazioniCount = React.useMemo(() => getSelectedViolazioniCount(draft, art15Selected), [draft, art15Selected])
  const prevSelectedViolazioniCountRef = React.useRef(selectedViolazioniCount)
  React.useEffect(() => {
    const prev = prevSelectedViolazioniCountRef.current
    prevSelectedViolazioniCountRef.current = selectedViolazioniCount
    if (!isRitAgrTecLimitedEdit && prev > 0 && selectedViolazioniCount === 0 && String(g('presenza_trasgressore') || '').trim()) {
      set('presenza_trasgressore', '')
    }
  }, [selectedViolazioniCount])
  const noteSpeseExpectedCasistiche = React.useMemo(() => getNotaSpeseCasistiche(draft), [draft])
  const noteSpeseCasistiche = React.useMemo(() => getNotaSpeseCasisticheWithExistingRows(draft, noteSpeseRowsDraft), [draft, noteSpeseRowsDraft])
  const noteSpeseExpectedCount = noteSpeseExpectedCasistiche.length
  const noteSpeseCompiledCount = React.useMemo(() => {
    // Numeratore badge Nota spese: somma, per ciascuna violazione attesa, il numero di note
    // spese DISTINTE effettivamente esistenti (non solo se ne esiste almeno una). Per la
    // maggior parte delle violazioni questo vale 0 o 1; per Art.30 può superare 1 se esistono
    // sia la nota condivisa "non recuperabile" sia una o più note "recuperabile" (una per
    // attrezzatura). Il numeratore può quindi legittimamente superare il denominatore.
    return noteSpeseExpectedCasistiche.reduce((sum, opt) => sum + countNotaSpeseEntriesForCasistica(noteSpeseRowsDraft, opt.codice), 0)
  }, [noteSpeseExpectedCasistiche, noteSpeseRowsDraft])
  const noteSpeseIncompleteCasistiche = React.useMemo(() => {
    return noteSpeseCasistiche.filter(opt => hasNotaSpeseIncompleteRowsForCasistica(noteSpeseRowsDraft, opt.codice))
  }, [noteSpeseCasistiche, noteSpeseRowsDraft])
  const noteSpeseIncompleteCount = noteSpeseIncompleteCasistiche.length
  const noteSpeseMissingCount = Math.max(0, noteSpeseExpectedCount - noteSpeseCompiledCount)
  const noteSpeseBadgeReady = React.useMemo(() => {
    if (mode !== 'edit' || currentOid == null) return true
    if (noteSpeseMissing.length > 0) return true
    const key = `${Number(currentOid)}|${String(currentGlobalId || '').trim()}`
    return !!currentGlobalId && noteSpeseRowsLoadedKey === key
  }, [mode, currentOid, currentGlobalId, noteSpeseMissing.length, noteSpeseRowsLoadedKey])
  const allegatiCount = React.useMemo(() => {
    if (mode !== 'edit' || currentOid == null) return 0
    const existingCount = attachmentsForOid === currentOid && Array.isArray(visibleTechnicalAttachments) ? visibleTechnicalAttachments.length : 0
    const pendingCount = Array.isArray(attachmentFiles) ? attachmentFiles.length : 0
    return Math.max(0, existingCount + pendingCount)
  }, [mode, currentOid, attachmentsForOid, visibleTechnicalAttachments, attachmentFiles])

  React.useEffect(() => {
    if (noteSpeseCasistiche.length === 0) {
      if (activeNotaSpeseCasistica) setActiveNotaSpeseCasistica('')
      return
    }
    if (!activeNotaSpeseCasistica || !noteSpeseCasistiche.some(opt => opt.codice === activeNotaSpeseCasistica)) {
      setActiveNotaSpeseCasistica(noteSpeseCasistiche[0].codice)
    }
  }, [noteSpeseCasistiche, activeNotaSpeseCasistica])

  React.useEffect(() => {
    if (activeNotaSpeseCasistica !== 'C104_ATTREZZATURE_DANNEGGIATE' || art30RecuperoMode !== 'recuperabile') {
      if (activeAttrezzaturaRiferimentoId) setActiveAttrezzaturaRiferimentoId('')
      setAttrezzatureNuovoPickerOpen(false)
      setPendingAttrezzaturaMsg('')
      return
    }
    if (activeAttrezzaturaRiferimentoId && !attrezzatureCatalog.some(opt => opt.codice === attrezzaturaInstanceTipoCode(activeAttrezzaturaRiferimentoId))) {
      setActiveAttrezzaturaRiferimentoId('')
    }
  }, [activeNotaSpeseCasistica, art30RecuperoMode, activeAttrezzaturaRiferimentoId, attrezzatureCatalog])

  const isArt30NotaSpeseCasistica = activeNotaSpeseCasistica === 'C104_ATTREZZATURE_DANNEGGIATE'
  // Combo 3: un'opzione per ogni ISTANZA di attrezzatura recuperabile con almeno una riga
  // reale (AT-PF, Art.30) — non per tipo: due curve di derivazione restano due voci separate
  // ("Curva di derivazione 1", "Curva di derivazione 2"). La numerazione è dinamica: si
  // ricalcola dalle righe presenti ad ogni render, quindi si rinumera da sola se un'istanza
  // viene eliminata. Include anche l'istanza appena creata dal mini-selettore "+ Nuova
  // attrezzatura" anche se non ha ancora righe (resta visibile/selezionata in coda).
  const attrezzatureIstanzeOptions = React.useMemo(() => {
    const instanceMinOrdine = new Map<string, number>()
    const repairCats: NsCategory[] = ['AT', 'PR', 'RU', 'SL', 'PF', 'RA']
    repairCats.forEach((cat) => {
      (noteSpeseRowsDraft[cat] || []).forEach((r) => {
        if (String(r.codice_casistica || '').trim() !== 'C104_ATTREZZATURE_DANNEGGIATE') return
        const ref = String(r.riferimento_attrezzatura_id || '').trim()
        if (!ref) return
        const ord = Math.trunc(nsSafeNum(r.ordine, 0))
        const cur = instanceMinOrdine.get(ref)
        if (cur == null || ord < cur) instanceMinOrdine.set(ref, ord)
      })
    })
    if (activeAttrezzaturaRiferimentoId && !instanceMinOrdine.has(activeAttrezzaturaRiferimentoId)) {
      instanceMinOrdine.set(activeAttrezzaturaRiferimentoId, Number.MAX_SAFE_INTEGER)
    }
    const catalogByCode = new Map(attrezzatureCatalog.map(c => [c.codice, c.descrizione]))
    const metadataByRef = new Map<string, NsDetailRow>()
    ;(noteSpeseRowsDraft.RA || []).filter(isRecuperableTesseraMetaRow).forEach(row => {
      const ref = String(row.riferimento_attrezzatura_id || '').trim()
      if (ref) metadataByRef.set(ref, row)
    })
    const byTipo = new Map<string, string[]>()
    Array.from(instanceMinOrdine.entries())
      .sort((a, b) => a[1] - b[1])
      .forEach(([instanceId]) => {
        const tipoCode = attrezzaturaInstanceTipoCode(instanceId)
        const list = byTipo.get(tipoCode) || []
        list.push(instanceId)
        byTipo.set(tipoCode, list)
      })
    const options: Array<{ id: string; label: string }> = []
    Array.from(byTipo.entries())
      .sort(([tipoA], [tipoB]) => (catalogByCode.get(tipoA) || '').localeCompare(catalogByCode.get(tipoB) || '', 'it'))
      .forEach(([tipoCode, instanceIds]) => {
        const baseLabel = String(catalogByCode.get(tipoCode) || '').trim()
        if (!baseLabel) return
        instanceIds.forEach((instanceId, idx) => {
          const meta = metadataByRef.get(instanceId)
          const matricola = String(meta?.matricola_snapshot || '').trim()
          const label = matricola
            ? `${baseLabel} - matricola ${matricola}`
            : (instanceIds.length > 1 ? `${baseLabel} ${idx + 1}` : baseLabel)
          options.push({ id: instanceId, label })
        })
      })
    return options
  }, [noteSpeseRowsDraft, attrezzatureCatalog, activeAttrezzaturaRiferimentoId])

  const activeRecuperableTesseraMeta = React.useMemo(() => {
    if (!activeAttrezzaturaRiferimentoId) return null
    return (noteSpeseRowsDraft.RA || []).find(row => isRecuperableTesseraMetaRow(row) && String(row.riferimento_attrezzatura_id || '').trim() === activeAttrezzaturaRiferimentoId) || null
  }, [noteSpeseRowsDraft, activeAttrezzaturaRiferimentoId])

  const activeAttrezzaturaCatalogItem = React.useMemo(() => {
    const tipoCode = attrezzaturaInstanceTipoCode(activeAttrezzaturaRiferimentoId)
    return tipoCode ? (attrezzatureCatalog.find(c => c.codice === tipoCode) || null) : null
  }, [activeAttrezzaturaRiferimentoId, attrezzatureCatalog])

  const activeAttrezzaturaIsTessera = React.useMemo(() => {
    if (!activeAttrezzaturaCatalogItem) return false
    return attrezzaturaTipo(`${activeAttrezzaturaCatalogItem.codice} ${activeAttrezzaturaCatalogItem.descrizione}`)?.key === 'TESSERA_ELETTRONICA'
  }, [activeAttrezzaturaCatalogItem])

  const addRecuperableAttrezzatura = React.useCallback((tipoCode: string) => {
    const catalogItem = attrezzatureCatalog.find(c => c.codice === tipoCode)
    if (!catalogItem) return
    const tipo = attrezzaturaTipo(`${catalogItem.codice} ${catalogItem.descrizione}`)
    const isTessera = tipo?.key === 'TESSERA_ELETTRONICA'
    const ref = buildAttrezzaturaInstanceId(tipoCode)
    if (isTessera) {
      const allRows = nsRowsByCategoryToFlat(noteSpeseRowsDraft)
      const nextOrder = allRows.reduce((max, row) => Math.max(max, Math.trunc(nsSafeNum(row.ordine, 0))), 0) + 1
      const cauzione = nsRound(Number(attrezzatureCauzioneUnitaria) || 0, 2)
      const meta: NsDetailRow = {
        objectid: 0,
        categoria_costo: 'RA',
        origine_voce_snapshot: 'PARAMETRO',
        codice_voce_snapshot: NS_RECUPERABLE_TESSERA_META_CODE,
        descrizione_snapshot: 'Tessera elettronica',
        unita_misura_snapshot: 'pz',
        prezzo_unitario_snapshot: cauzione,
        quantita: 1,
        importo_riga: 0,
        anno_prezzario_snapshot: null,
        ordine: nextOrder,
        note: '',
        codice_casistica: 'C104_ATTREZZATURE_DANNEGGIATE',
        riferimento_attrezzatura_id: ref,
        matricola_snapshot: null,
        cauzione_decurtata: false
      }
      setNoteSpeseRowsDraft(prev => ({ ...prev, RA: [...(prev.RA || []).map(nsCloneRow), meta] }))
      setRecuperableTesseraEdit({ ref, isNew: true, matricola: '', cauzioneDecurtata: false })
    } else {
      setRecuperableTesseraEdit(null)
    }
    setActiveAttrezzaturaRiferimentoId(ref)
    setPendingAttrezzaturaMsg('')
    setAttrezzatureNuovoPickerOpen(false)
  }, [attrezzatureCatalog, noteSpeseRowsDraft, attrezzatureCauzioneUnitaria])

  const updateActiveRecuperableTesseraMeta = React.useCallback((patch: { matricola?: string; cauzioneDecurtata?: boolean }) => {
    const ref = String(activeAttrezzaturaRiferimentoId || '').trim()
    if (!ref || !activeAttrezzaturaIsTessera) return
    setNoteSpeseRowsDraft(prev => {
      const next = nsCloneRowsByCategory(prev)
      const existingIdx = (next.RA || []).findIndex(row => isRecuperableTesseraMetaRow(row) && String(row.riferimento_attrezzatura_id || '').trim() === ref)
      const current = existingIdx >= 0 ? next.RA[existingIdx] : null
      const cauzione = nsRound(Number(attrezzatureCauzioneUnitaria) || nsSafeNum(current?.prezzo_unitario_snapshot, 0), 2)
      const cauzioneDecurtata = patch.cauzioneDecurtata != null ? !!patch.cauzioneDecurtata : !!current?.cauzione_decurtata
      const matricola = patch.matricola != null ? (String(patch.matricola).trim() || null) : (current?.matricola_snapshot || null)
      if (current) {
        next.RA[existingIdx] = nsCloneRow({
          ...current,
          matricola_snapshot: matricola,
          prezzo_unitario_snapshot: cauzione,
          cauzione_decurtata: cauzioneDecurtata,
          importo_riga: cauzioneDecurtata ? -cauzione : 0
        })
      } else {
        const allRows = nsRowsByCategoryToFlat(next)
        const nextOrder = allRows.reduce((max, row) => Math.max(max, Math.trunc(nsSafeNum(row.ordine, 0))), 0) + 1
        next.RA.push({
          objectid: 0,
          categoria_costo: 'RA',
          origine_voce_snapshot: 'PARAMETRO',
          codice_voce_snapshot: NS_RECUPERABLE_TESSERA_META_CODE,
          descrizione_snapshot: 'Tessera elettronica',
          unita_misura_snapshot: 'pz',
          prezzo_unitario_snapshot: cauzione,
          quantita: 1,
          importo_riga: cauzioneDecurtata ? -cauzione : 0,
          anno_prezzario_snapshot: null,
          ordine: nextOrder,
          note: '',
          codice_casistica: 'C104_ATTREZZATURE_DANNEGGIATE',
          riferimento_attrezzatura_id: ref,
          matricola_snapshot: matricola,
          cauzione_decurtata: cauzioneDecurtata
        })
      }
      return next
    })
  }, [activeAttrezzaturaRiferimentoId, activeAttrezzaturaIsTessera, attrezzatureCauzioneUnitaria])

  const beginActiveRecuperableTesseraEdit = React.useCallback(() => {
    const ref = String(activeAttrezzaturaRiferimentoId || '').trim()
    if (!ref || !activeAttrezzaturaIsTessera) return
    setRecuperableTesseraEdit({
      ref,
      isNew: false,
      matricola: String(activeRecuperableTesseraMeta?.matricola_snapshot || '').trim(),
      cauzioneDecurtata: !!activeRecuperableTesseraMeta?.cauzione_decurtata
    })
    setPendingAttrezzaturaMsg('')
    setAttrezzatureNuovoPickerOpen(false)
  }, [activeAttrezzaturaRiferimentoId, activeAttrezzaturaIsTessera, activeRecuperableTesseraMeta])

  const confirmRecuperableTesseraEdit = React.useCallback(() => {
    const edit = recuperableTesseraEdit
    if (!edit) return
    const matricola = String(edit.matricola || '').trim()
    if (!isValidTesseraMatricola(matricola)) {
      setPendingAttrezzaturaMsg('Inserire una matricola di 5 cifre prima di aggiornare la tessera.')
      return
    }
    const duplicate = nsRowsByCategoryToFlat(noteSpeseRowsDraft)
      .filter(isTesseraNotaSpeseRow)
      .some(row => String(row.matricola_snapshot || '').trim() === matricola && String(row.riferimento_attrezzatura_id || '').trim() !== edit.ref)
    if (duplicate) {
      setPendingAttrezzaturaMsg(`La matricola ${matricola} risulta già associata a un’altra tessera della stessa pratica.`)
      return
    }
    updateActiveRecuperableTesseraMeta({ matricola, cauzioneDecurtata: edit.cauzioneDecurtata })
    setRecuperableTesseraEdit(null)
    setPendingAttrezzaturaMsg('')
  }, [recuperableTesseraEdit, noteSpeseRowsDraft, updateActiveRecuperableTesseraMeta])

  const cancelRecuperableTesseraEdit = React.useCallback(() => {
    const edit = recuperableTesseraEdit
    if (!edit) return
    if (edit.isNew) {
      setNoteSpeseRowsDraft(prev => {
        const next = nsCloneRowsByCategory(prev)
        NS_CATEGORIES.forEach(cat => {
          next[cat] = (next[cat] || []).filter(row => String(row.riferimento_attrezzatura_id || '').trim() !== edit.ref).map(nsCloneRow)
        })
        return next
      })
      if (String(activeAttrezzaturaRiferimentoId || '').trim() === edit.ref) setActiveAttrezzaturaRiferimentoId('')
    }
    setRecuperableTesseraEdit(null)
    setPendingAttrezzaturaMsg('')
    window.requestAnimationFrame(() => {
      recuperableTesseraMatricolaInputRef.current?.blur()
    })
  }, [recuperableTesseraEdit, activeAttrezzaturaRiferimentoId])

  React.useEffect(() => {
    if (!recuperableTesseraEdit) return
    if (String(activeAttrezzaturaRiferimentoId || '').trim() !== recuperableTesseraEdit.ref) {
      setRecuperableTesseraEdit(null)
      setPendingAttrezzaturaMsg('')
    }
  }, [activeAttrezzaturaRiferimentoId, recuperableTesseraEdit])

  React.useEffect(() => {
    if (!recuperableTesseraEdit?.ref) return
    const raf = window.requestAnimationFrame(() => {
      const input = recuperableTesseraMatricolaInputRef.current
      if (!input) return
      input.focus()
    })
    return () => window.cancelAnimationFrame(raf)
  }, [recuperableTesseraEdit?.ref])

  const removeActiveRecuperableAttrezzatura = React.useCallback(() => {
    const ref = String(activeAttrezzaturaRiferimentoId || '').trim()
    if (!ref) return
    const existedInBaseline = NS_CATEGORIES.some(cat => (noteSpeseRowsBaseline[cat] || []).some(row => String(row.riferimento_attrezzatura_id || '').trim() === ref))
    setNoteSpeseRowsDraft(prev => {
      const next = nsCloneRowsByCategory(prev)
      NS_CATEGORIES.forEach(cat => {
        next[cat] = (next[cat] || []).filter(row => String(row.riferimento_attrezzatura_id || '').trim() !== ref).map(nsCloneRow)
      })
      return next
    })
    if (existedInBaseline) {
      setNoteSpeseFormDirtyByCategory(prev => ({ ...prev, RA: true }))
    }
    setActiveAttrezzaturaRiferimentoId('')
    setRecuperableTesseraEdit(null)
    setPendingAttrezzaturaMsg('')
  }, [activeAttrezzaturaRiferimentoId, noteSpeseRowsBaseline])

  const activeAttrezzaturaRiferimentoRequired = isArt30NotaSpeseCasistica && art30RecuperoMode === 'recuperabile' && !activeAttrezzaturaRiferimentoId
  const activeNotaSpeseRows = React.useMemo(() => {
    // Art.30/recuperabile senza attrezzatura ancora selezionata: nessuna riga va mostrata (né
    // sommata), altrimenti si vedrebbe erroneamente il cumulo di tutte le attrezzature insieme.
    if (activeAttrezzaturaRiferimentoRequired) return nsCloneRowsByCategory(EMPTY_NS_ROWS_BY_CATEGORY)
    if (isArt30NotaSpeseCasistica && art30RecuperoMode === 'non_recuperabile') {
      // Non recuperabile: solo le righe RA, non il cumulo delle riparazioni di altri tipi.
      const raOnly = nsCloneRowsByCategory(EMPTY_NS_ROWS_BY_CATEGORY)
      raOnly.RA = filterRowsByCasistica(noteSpeseRowsDraft, activeNotaSpeseCasistica).RA
        .filter(row => !String(row.riferimento_attrezzatura_id || '').trim() && !isRecuperableTesseraMetaRow(row))
      return raOnly
    }
    return filterRowsByCasistica(noteSpeseRowsDraft, activeNotaSpeseCasistica, isArt30NotaSpeseCasistica ? activeAttrezzaturaRiferimentoId : undefined)
  }, [noteSpeseRowsDraft, activeNotaSpeseCasistica, activeAttrezzaturaRiferimentoId, isArt30NotaSpeseCasistica, art30RecuperoMode, activeAttrezzaturaRiferimentoRequired])
  const activeNotaSpeseSummary = React.useMemo(() => nsComputeSummaryFromRows(nsRowsByCategoryToFlat(activeNotaSpeseRows), noteSpesePercent), [activeNotaSpeseRows, noteSpesePercent])
  const activeNotaSpeseOption = React.useMemo(() => noteSpeseCasistiche.find(opt => opt.codice === activeNotaSpeseCasistica) || null, [noteSpeseCasistiche, activeNotaSpeseCasistica])
  const activeNotaSpeseIncompleteBreakdown = React.useMemo(() => {
    if (!activeNotaSpeseCasistica) return { matricola: [] as NsDetailRow[], quantita: [] as NsDetailRow[] }
    const rows = nsRowsByCategoryToFlat(activeNotaSpeseRows)
    return {
      matricola: rows.filter(r => nsRowIncompleteReason(r) === 'matricola'),
      quantita: rows.filter(r => nsRowIncompleteReason(r) === 'quantita')
    }
  }, [activeNotaSpeseRows, activeNotaSpeseCasistica])
  const activeNotaSpeseIncompleteRowsCount = activeNotaSpeseIncompleteBreakdown.matricola.length + activeNotaSpeseIncompleteBreakdown.quantita.length
  const noteSpeseBrowseDisabled = isReadOnly || isRitAgrTecLimitedEdit || noteSpeseBusy || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || noteSpeseCasistiche.length === 0 ||
    (activeNotaSpeseCasistica === 'C104_ATTREZZATURE_DANNEGGIATE' && art30RecuperoMode === 'recuperabile' && !activeAttrezzaturaRiferimentoId)
  // La combo seleziona soltanto quale nota spese consultare: resta attiva anche in sola consultazione.
  // Non va disabilitata quando c'e' una sola violazione selezionabile: se quella
  // violazione e' l'Art.30, il blocco si propagava anche alle combo attrezzatura
  // (che leggono lo stesso flag), impedendo di scegliere tipo/attrezzatura.
  const noteSpeseCasisticaDisabled = noteSpeseBusy || !!recuperableTesseraEdit

  React.useEffect(() => {
    // Evita il lampeggio arancione iniziale senza nascondere il badge:
    // finché le righe già salvate non sono caricate, pubblichiamo uno stato
    // provvisorio neutro, mostrato dal nav come …/n.
    const noteSpeseLoadingForBadge = noteSpeseExpectedCount > 0 && !noteSpeseBadgeReady
    const noteSpeseDoneForBadge = noteSpeseLoadingForBadge ? 0 : noteSpeseCompiledCount
    const noteSpeseWarningForBadge = noteSpeseLoadingForBadge ? 0 : noteSpeseMissingCount
    const counts = {
      violazione: selectedViolazioniCount,
      'nota-spese': noteSpeseExpectedCount,
      nota_spese: noteSpeseExpectedCount,
      allegati: allegatiCount
    }
    const badgeDetails = {
      'nota-spese': { total: noteSpeseExpectedCount, done: noteSpeseDoneForBadge, warning: noteSpeseWarningForBadge, loading: noteSpeseLoadingForBadge },
      nota_spese: { total: noteSpeseExpectedCount, done: noteSpeseDoneForBadge, warning: noteSpeseWarningForBadge, loading: noteSpeseLoadingForBadge }
    }
    try { ;(window as any).__giiEditSectionCounts = counts } catch {}
    try { ;(window as any).__giiEditSectionBadgeDetails = badgeDetails } catch {}
    try { window.dispatchEvent(new CustomEvent('gii:edit-section-counts', { detail: { counts, badgeDetails } })) } catch {}
  }, [selectedViolazioniCount, noteSpeseBadgeReady, noteSpeseExpectedCount, noteSpeseCompiledCount, noteSpeseMissingCount, allegatiCount])

  const NP_TABS = [
    { id: 'dati_generali', label: 'Dati generali' },
    { id: 'trasgressore', label: 'Trasgressore' },
    { id: 'violazione', label: 'Violazione' },
    { id: 'dati_tecnici', label: 'Luoghi e dati tecnici' },
    { id: 'nota_spese', label: 'Nota spese' },
    { id: 'allegati', label: 'Allegati' }
  ] as const

  const btnBase: React.CSSProperties = {
    padding: '7px 16px', borderRadius: 8, border: 'none',
    fontWeight: 700, fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    boxSizing: 'border-box',
    lineHeight: 'normal',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: saving ? 'not-allowed' : 'pointer'
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
      return { kind: 'info' as const, text: 'Non è stata selezionata alcuna violazione che richieda la localizzazione nella mappa.' }
    }
    // reqPoint === 1
    if (p.clickedPointWgs84) return { kind: 'ok' as const, text: 'Punto impostato da click in mappa.' }
    if (p.existingGeomWgs84 && (Number(p.existingGeomWgs84.x) !== 0 || Number(p.existingGeomWgs84.y) !== 0)) {
      return { kind: 'ok' as const, text: 'Punto già presente nella pratica.' }
    }
    return { kind: 'err' as const, text: 'Localizzazione obbligatoria: fai click in mappa.' }
  }, [p.clickedPointWgs84, p.existingGeomWgs84, reqPoint])

  const editPraticaCode = React.useMemo(() => {
    if (mode !== 'edit') return ''
    return buildPraticaCodeFromData(p.initialData || {}, editOid)
  }, [mode, p.initialData, editOid])

  const toolbarTitleInfo = React.useMemo(() => {
    if (mode === 'edit') {
      const titleParts = buildFascicoloDocumentaleTitleParts(p.initialData || {}, editOid)
      return { baseTitle: titleParts.prefix, praticaCode: titleParts.code }
    }
    return { baseTitle: String(p.titleText || 'Nuova rilevazione'), praticaCode: '' }
  }, [p.titleText, mode, editOid, p.initialData])

  const numCfg = React.useCallback((key: string, fallback: number, min?: number, max?: number): number => {
    const n = Number((cfg as any)[key])
    const v = Number.isFinite(n) ? n : fallback
    return Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v))
  }, [cfg])


  const formStyle = React.useMemo(() => ({
    maskBg: modernColor((cfg as any).maskBg, '#eef4fb', ['#ffffff']),
    maskBorderColor: modernColor((cfg as any).maskBorderColor, '#cbd8e6', ['#e5e7eb']),
    maskBorderWidth: numCfg('maskBorderWidth', 1, 0, 8),
    maskBorderRadius: numCfg('maskBorderRadius', 10, 0, 40),
    maskInnerPadding: numCfg('maskInnerPadding', 12, 0, 40),
    labelColor: modernColor((cfg as any).formLabelColor, _defaultFormStyle.labelColor, ['#6b7280']),
    labelFontSize: numCfg('formLabelFontSize', _defaultFormStyle.labelFontSize, 8, 24),
    labelFontWeight: numCfg('formLabelFontWeight', _defaultFormStyle.labelFontWeight, 300, 900),
    labelMarginBottom: numCfg('formLabelMarginBottom', _defaultFormStyle.labelMarginBottom, 0, 20),
    hdrColor: modernColor((cfg as any).sectionHeaderColor, _defaultFormStyle.hdrColor, ['#1d4ed8']),
    hdrFontSize: numCfg('sectionHeaderFontSize', _defaultFormStyle.hdrFontSize, 8, 24),
    divColor: modernColor((cfg as any).sectionDividerColor, _defaultFormStyle.divColor, ['#bfdbfe']),
    divWidth: numCfg('sectionDividerWidth', _defaultFormStyle.divWidth, 0, 10),
    fieldColor: modernColor((cfg as any).formFieldColor, _defaultFormStyle.fieldColor, ['#111827']),
    fieldFontSize: numCfg('formFieldFontSize', _defaultFormStyle.fieldFontSize, 8, 24),
    fieldHeight: numCfg('formFieldHeight', _defaultFormStyle.fieldHeight, 24, 60),
    fieldPaddingX: numCfg('formFieldPaddingX', _defaultFormStyle.fieldPaddingX, 0, 30),
    fieldBorderColor: modernColor((cfg as any).formFieldBorderColor, _defaultFormStyle.fieldBorderColor, ['rgba(0,0,0,0.18)', '#d1d5db']),
    fieldBorderWidth: numCfg('formFieldBorderWidth', _defaultFormStyle.fieldBorderWidth, 0, 8),
    fieldBorderRadius: numCfg('formFieldBorderRadius', _defaultFormStyle.fieldBorderRadius, 0, 30),
    fieldBg: modernColor((cfg as any).formFieldBg, _defaultFormStyle.fieldBg, ['#ffffff']),
    fieldDisabledBg: modernColor((cfg as any).formFieldDisabledBg, _defaultFormStyle.fieldDisabledBg, ['#f3f4f6']),
    fieldDisabledColor: modernColor((cfg as any).formFieldDisabledColor, _defaultFormStyle.fieldDisabledColor, ['#6b7280']),
    sectionGap: numCfg('formSectionGap', _defaultFormStyle.sectionGap, 0, 40),
    cardBg: modernColor((cfg as any).formCardBg, _defaultFormStyle.cardBg, ['#ffffff']),
    cardBorderColor: modernColor((cfg as any).formCardBorderColor, _defaultFormStyle.cardBorderColor, ['#dbeafe']),
    cardBorderWidth: numCfg('formCardBorderWidth', _defaultFormStyle.cardBorderWidth, 0, 8),
    cardBorderRadius: numCfg('formCardBorderRadius', _defaultFormStyle.cardBorderRadius, 0, 40),
    cardShadow: modernColor((cfg as any).formCardShadow, _defaultFormStyle.cardShadow, ['0 1px 3px rgba(15, 23, 42, 0.08)']),
    cardHeaderBg: modernColor((cfg as any).formCardHeaderBg, _defaultFormStyle.cardHeaderBg, ['linear-gradient(90deg, #0f4c81, #2563eb)']),
    cardHeaderColor: String((cfg as any).formCardHeaderColor || _defaultFormStyle.cardHeaderColor),
    cardHeaderFontSize: numCfg('formCardHeaderFontSize', _defaultFormStyle.cardHeaderFontSize, 8, 24),
    cardHeaderFontWeight: numCfg('formCardHeaderFontWeight', _defaultFormStyle.cardHeaderFontWeight, 300, 900),
    cardHeaderPaddingX: numCfg('formCardHeaderPaddingX', _defaultFormStyle.cardHeaderPaddingX, 0, 30),
    cardHeaderPaddingY: numCfg('formCardHeaderPaddingY', _defaultFormStyle.cardHeaderPaddingY, 0, 24),
    cardBodyPadding: numCfg('formCardBodyPadding', _defaultFormStyle.cardBodyPadding, 0, 30),
    norma3FontSize: numCfg('norma3FontSize', _defaultFormStyle.norma3FontSize, 8, 24),
    norma3GradeColumnWidth: numCfg('norma3GradeColumnWidth', _defaultFormStyle.norma3GradeColumnWidth, 80, 260),
    norma3RowGap: numCfg('norma3RowGap', _defaultFormStyle.norma3RowGap, 0, 20),
    violazioneLeftPercent: numCfg('violazioneLayoutLeftPercent', _defaultFormStyle.violazioneLeftPercent, 30, 80),
    violazioneMinLeftPx: numCfg('violazioneLayoutMinLeftPx', _defaultFormStyle.violazioneMinLeftPx, 260, 900),
    violazioneMinRightPx: numCfg('violazioneLayoutMinRightPx', _defaultFormStyle.violazioneMinRightPx, 220, 800),
    violazioneSplitterWidth: numCfg('violazioneSplitterWidth', _defaultFormStyle.violazioneSplitterWidth, 6, 40),
    violazioneSplitterColor: modernColor((cfg as any).violazioneSplitterColor, _defaultFormStyle.violazioneSplitterColor, ['#3d77c9']),
    violazioneDescrizioneRows: numCfg('violazioneDescrizioneRows', _defaultFormStyle.violazioneDescrizioneRows, 2, 12),
    violazioneCircostanzeRows: numCfg('violazioneCircostanzeRows', _defaultFormStyle.violazioneCircostanzeRows, 2, 12),
    titleFontSize: numCfg('titleFontSize', 14, 9, 28),
    msgFontSize: numCfg('msgFontSize', 12, 9, 24)
  }), [cfg, numCfg])

  const popupBodyFontSize = Math.max(15, Number(formStyle.fieldFontSize) || 15)
  const popupTitleFontSize = Math.max(18, Number(formStyle.titleFontSize) || 18)
  const popupBtnBase: React.CSSProperties = { ...btnBase, fontSize: popupBodyFontSize }

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

    if (npTab === 'anteprima' && mode === 'edit' && currentOid != null) {
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

    return {
      ...base,
      overflowY: 'auto',
      overflowX: 'hidden',
      scrollbarGutter: 'stable',
      padding: '12px 2px 2px 2px'
    }
  }, [npTab, anteprimaPadding, mode, currentOid])

  // ── Layout engine ──────────────────────────────────────────────────
  type FldR = { el: React.ReactNode; label: React.ReactNode; hint?: string }

  const AREA_LABELS: Record<string, string> = { AGR: 'AGRARIA', TEC: 'TECNICA', AMM: 'AFFARI GENERALI E PROGRAMMAZIONE FINANZIARIA' }
  const SETTORE_LABELS: Record<string, string> = {
    D1: 'DISTRETTO 1 \u2013 SAN SPERATE', D2: 'DISTRETTO 2 \u2013 SERRAMANNA/PIMPISU', D3: 'DISTRETTO 3 \u2013 SAN GAVINO/VILLACIDRO',
    D4: 'DISTRETTO 4 \u2013 BASSO SULCIS', D5: 'DISTRETTO 5 \u2013 SENORB\u00CC', D6: 'DISTRETTO 6 \u2013 CIXERRI',
    DS: 'MANUTENZIONE OPERE DI DRENO E DI SCOLO', CR: 'CATASTO, RUOLI E SERVIZI TERRITORIALI', GI: 'GESTIONE IRRIGUA'
  }
  const fmtDateDMY = (v: any): string => {
    if (!v) return ''
    const d = new Date(typeof v === 'number' ? v : String(v))
    if (isNaN(d.getTime())) return String(v)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getItTransmissionToCapoSettoreDate = (): any => {
    const src = p.initialData || {}
    const statoIt = normalizeIntOrNull(firstMeaningfulValue(
      pickAttrCI(src, ['stato_IT', 'stato_it', 'STATO_IT']),
      g('stato_IT')
    ))
    if (statoIt !== STATO_APPROVATA) return null
    return firstMeaningfulValue(
      pickAttrCI(src, ['dt_stato_IT', 'dt_stato_it', 'DT_STATO_IT']),
      g('dt_stato_IT')
    )
  }

  const renderFieldControl = (name: string): FldR | null => {
    switch (name) {
      // Dati generali (read-only)
      case 'area_cod': { const areaCode = normalizeAreaCode(g('area_cod') || g('area')); return { label: 'Area', el: <NpText value={AREA_LABELS[areaCode] || areaCode || g('area_cod')} onChange={() => {}} disabled/> } }
      case 'settore_cod': { const areaCode = normalizeAreaCode(g('area_cod') || g('area')); const settoreCode = normalizeSettoreCode(areaCode, g('settore_cod') || g('settore')); return { label: 'Settore', el: <NpText value={SETTORE_LABELS[settoreCode] || settoreCode || g('settore_cod')} onChange={() => {}} disabled/> } }
      case 'tecnico_rilevatore': return { label: 'Tecnico rilevatore', el: <NpText value={g('tecnico_rilevatore')} onChange={() => {}} disabled/> }
      case 'ufficio_zona': return { label: 'Ufficio di zona', el: <NpText value={g('ufficio_zona')} onChange={() => {}} disabled/> }
      case 'data_rilevazione': return { label: 'Data rilevazione', el: <NpText value={fmtDateDMY(g('data_rilevazione'))} onChange={() => {}} disabled/> }
      case 'it_assegnato_nome': return { label: 'Istruttore tecnico', el: <NpText value={g('it_assegnato_nome')} onChange={() => {}} disabled/> }
      case 'dt_trasmissione_capo_settore': return { label: 'Data trasmissione al Capo Settore', el: <NpText value={fmtDateDMY(getItTransmissionToCapoSettoreDate()) || '—'} onChange={() => {}} disabled/> }
      // Trasgressore — dati principali
      case 'tipologia_soggetto': return { label: 'Tipologia soggetto', el: <NpSel value={tipoSogg} onChange={v => {
        set('tipologia_soggetto', v)
        if (!g('dom_notifica_uguale')) set('dom_notifica_uguale', '1')
        if (v === 'PG' && !g('rl_dom_notifica')) set('rl_dom_notifica', '0')
      }} options={CHOICES.tipo_soggetto} disabled={saving}/> }
      case 'nome': return tipoSogg === 'PF' ? { label: 'Nome', el: <NpText value={g('nome')} onChange={v => set('nome', v)} disabled={saving}/> } : null
      case 'cognome': return tipoSogg === 'PF' ? { label: 'Cognome', el: <NpText value={g('cognome')} onChange={v => set('cognome', v)} disabled={saving}/> } : null
      case 'codice_fiscale': return tipoSogg === 'PF' ? { label: 'Codice fiscale', hint: 'Massimo 16 caratteri', el: <NpText value={g('codice_fiscale')} onChange={v => set('codice_fiscale', v)} disabled={saving} maxLength={16}/> } : null
      case 'ragione_sociale': return tipoSogg === 'PG' ? { label: 'Ragione sociale', el: <NpText value={g('ragione_sociale')} onChange={v => set('ragione_sociale', v)} disabled={saving}/> } : null
      case 'piva': return tipoSogg === 'PG' ? { label: 'P. IVA', hint: 'Massimo 11 caratteri', el: <NpText value={g('piva')} onChange={v => set('piva', v)} disabled={saving} maxLength={11}/> } : null
      // Trasgressore — indirizzo
      case 'via': return { label: 'Via/Piazza/Località', el: <NpText value={g('via')} onChange={v => set('via', v)} disabled={saving}/> }
      case 'civico': return { label: 'N. civico', el: <NpText value={g('civico')} onChange={v => set('civico', v)} disabled={saving}/> }
      case 'citta': return { label: 'Città', el: <ComuneIstatInput value={g('citta')} onManualChange={v => { set('citta', v); set('provincia', ''); resetCapOptions('main') }} onSelect={o => applyComuneToAddress('main', o)} disabled={saving}/> }
      case 'provincia': return { label: 'Provincia', el: <NpDerivedText value={g('provincia')} maxLength={2}/> }
      case 'cap': return { label: 'CAP', el: <CapIstatInput value={g('cap')} onChange={v => set('cap', v)} options={capOptionsByAddress.main} disabled={saving}/> }
      case 'stato': return { label: 'Stato', el: <NpText value={g('stato') || 'ITALIA'} onChange={v => set('stato', v)} disabled={saving}/> }
      case 'telefono': return { label: 'Telefono', el: <NpText value={g('telefono')} onChange={v => set('telefono', v)} disabled={saving}/> }
      case 'cellulare': return { label: 'Cellulare', el: <NpText value={g('cellulare')} onChange={v => set('cellulare', v)} disabled={saving}/> }
      case 'email': return { label: 'E-mail', el: <NpText value={String(g('email') || '').toLocaleLowerCase('it-IT')} onChange={v => set('email', String(v || '').toLocaleLowerCase('it-IT'))} lowercase disabled={saving}/> }
      case 'pec': return { label: 'PEC', el: <NpText value={String(g('pec') || '').toLocaleLowerCase('it-IT')} onChange={v => set('pec', String(v || '').toLocaleLowerCase('it-IT'))} lowercase disabled={saving}/> }
      // Trasgressore — qualifica
      case 'qualifica_fondo': return { label: 'Qualifica rispetto al fondo', el: <NpSel value={g('qualifica_fondo')} onChange={v => set('qualifica_fondo', v)} options={domainOpts('qualifica_fondo', CHOICES.qualifica_fondo)} disabled={saving}/> }
      // Trasgressore — domicilio notifiche
      case 'dom_notifica_uguale': return { label: 'Coincide con residenza/sede legale', el: <NpSel value={g('dom_notifica_uguale') || '1'} onChange={v => set('dom_notifica_uguale', v)} options={domainOpts('dom_notifica_uguale', CHOICES.si_no)} disabled={saving} allowEmpty={false}/> }
      case 'dom_notifica_via': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'Via/Piazza/Località', el: <NpText value={g('dom_notifica_via')} onChange={v => set('dom_notifica_via', v)} disabled={saving}/> } : null
      case 'dom_notifica_civico': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'N. civico', el: <NpText value={g('dom_notifica_civico')} onChange={v => set('dom_notifica_civico', v)} disabled={saving}/> } : null
      case 'dom_notifica_citta': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'Città', el: <ComuneIstatInput value={g('dom_notifica_citta')} onManualChange={v => { set('dom_notifica_citta', v); set('dom_notifica_provincia', ''); resetCapOptions('dom') }} onSelect={o => applyComuneToAddress('dom', o)} disabled={saving}/> } : null
      case 'dom_notifica_provincia': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'Provincia', el: <NpDerivedText value={g('dom_notifica_provincia')} maxLength={2}/> } : null
      case 'dom_notifica_cap': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'CAP', el: <CapIstatInput value={g('dom_notifica_cap')} onChange={v => set('dom_notifica_cap', v)} options={capOptionsByAddress.dom} disabled={saving}/> } : null
      case 'dom_notifica_stato': return String(g('dom_notifica_uguale')) !== '1' ? { label: 'Stato', el: <NpText value={g('dom_notifica_stato') || 'ITALIA'} onChange={v => set('dom_notifica_stato', v)} disabled={saving}/> } : null
      // Trasgressore — rappresentante legale (PG only)
      case 'rl_nome': return tipoSogg === 'PG' ? { label: 'Nome', el: <NpText value={g('rl_nome')} onChange={v => set('rl_nome', v)} disabled={saving}/> } : null
      case 'rl_cognome': return tipoSogg === 'PG' ? { label: 'Cognome', el: <NpText value={g('rl_cognome')} onChange={v => set('rl_cognome', v)} disabled={saving}/> } : null
      case 'rl_cf': return tipoSogg === 'PG' ? { label: 'Codice fiscale', hint: 'Massimo 16 caratteri', el: <NpText value={g('rl_cf')} onChange={v => set('rl_cf', v)} disabled={saving} maxLength={16}/> } : null
      case 'rl_carica': return tipoSogg === 'PG' ? { label: 'Carica', el: <NpSel value={g('rl_carica')} onChange={v => set('rl_carica', v)} options={domainOpts('rl_carica', CHOICES.rl_carica)} disabled={saving}/> } : null
      case 'rl_dom_notifica': return tipoSogg === 'PG' ? { label: 'Domicilio notifiche del rappresentante', el: <NpSel value={g('rl_dom_notifica') || '0'} onChange={v => set('rl_dom_notifica', v)} options={domainOpts('rl_dom_notifica', CHOICES.si_no)} disabled={saving} allowEmpty={false}/> } : null
      case 'rl_dom_via': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'Via/Piazza/Località', el: <NpText value={g('rl_dom_via')} onChange={v => set('rl_dom_via', v)} disabled={saving}/> } : null
      case 'rl_dom_civico': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'N. civico', el: <NpText value={g('rl_dom_civico')} onChange={v => set('rl_dom_civico', v)} disabled={saving}/> } : null
      case 'rl_dom_citta': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'Città', el: <ComuneIstatInput value={g('rl_dom_citta')} onManualChange={v => { set('rl_dom_citta', v); set('rl_dom_provincia', ''); resetCapOptions('rl') }} onSelect={o => applyComuneToAddress('rl', o)} disabled={saving}/> } : null
      case 'rl_dom_provincia': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'Provincia', el: <NpDerivedText value={g('rl_dom_provincia')} maxLength={2}/> } : null
      case 'rl_dom_cap': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'CAP', el: <CapIstatInput value={g('rl_dom_cap')} onChange={v => set('rl_dom_cap', v)} options={capOptionsByAddress.rl} disabled={saving}/> } : null
      case 'rl_dom_stato': return (tipoSogg === 'PG' && String(g('rl_dom_notifica')) === '1') ? { label: 'Stato', el: <NpText value={g('rl_dom_stato') || 'ITALIA'} onChange={v => set('rl_dom_stato', v)} disabled={saving}/> } : null
      // Trasgressore — note
      case 'note_anagrafica': return { label: 'Note', el: <NpText value={g('note_anagrafica')} onChange={v => set('note_anagrafica', v)} multiline uppercase={false} disabled={saving}/> }
      // Violazione — Art. 15
      case 'tipo_abuso': return { label: 'Tipo di abuso', el: <NpSel value={tipoAbuso} onChange={v => { set('tipo_abuso', v); set('norma15_parziale', ''); set('norma15_totale', '') }} options={CHOICES.tipo_abuso} disabled={saving || !art15Selected}/> }
      case 'norma15_sel': {
        const canEdit = isRitAgrTecContext(currentUserContext) && hasTipoAbuso15 && !saving
        const occurrencePending = canEdit && !String(g('occorrenza') || '').trim()
        return { label: 'Occorrenza', el: <NpSel value={g('occorrenza')} onChange={v => set('occorrenza', v)} options={CHOICES.occorrenza} disabled={!canEdit} attention={occurrencePending} attentionTitle='Occorrenza da valorizzare'/> }
      }
      case 'sup_dichiarata_art15': {
        if (!hasTipoAbuso15) return null
        const locked = tipoAbuso === 'totale'
        return { label: 'Superficie dichiarata (ha.a.ca)', el: <NpSurfaceText value={locked ? '0' : g('sup_dichiarata_art15')} onChange={v => set('sup_dichiarata_art15', v)} disabled={saving || locked}/> }
      }
      case 'sup_irrigata_art15': {
        if (!hasTipoAbuso15) return null
        const dichVal = tipoAbuso === 'totale' ? 0 : surfaceToCentiareNumber(g('sup_dichiarata_art15'))
        const irrVal = surfaceToCentiareNumber(g('sup_irrigata_art15'))
        const warn = hasTipoAbuso15 && irrVal > 0 && irrVal < dichVal
        return { label: 'Superficie irrigata (ha.a.ca)', hint: warn ? 'La superficie irrigata non può essere inferiore a quella dichiarata' : undefined, el: <NpSurfaceText value={g('sup_irrigata_art15')} onChange={v => set('sup_irrigata_art15', v)} disabled={saving}/> }
      }
      // Violazione — Artt. 16 e 17
      case 'norma16_17': return { label: 'Tipo di inosservanza', el: <NpSel value={norma1516} onChange={v => { set('norma16_17', v); set('art17_tipo', '') }} options={CHOICES.art16_17} disabled={saving}/> }
      case 'art17_tipo': return norma1516 === 'Art17' ? { label: 'Seleziona violazione Art. 17', el: <NpSel value={art17tipo} onChange={v => set('art17_tipo', v)} options={CHOICES.art17_tipo} disabled={saving}/> } : null
      case 'sup_dichiarata_art16': return norma1516 === 'Art16' ? { label: 'Superficie dichiarata (ha.a.ca)', el: <NpSurfaceText value={g('sup_dichiarata_art16')} onChange={v => set('sup_dichiarata_art16', v)} disabled={saving}/> } : null
      case 'sup_irrigata_art16': return norma1516 === 'Art16' ? { label: 'Superficie irrigata (ha.a.ca)', el: <NpSurfaceText value={'0'} onChange={() => {}} disabled/> } : null
      case 'sup_dichiarata_art17_1': return (norma1516 === 'Art17' && art17tipo === 'Art17.1') ? { label: 'Superficie dichiarata (ha.a.ca)', el: <NpSurfaceText value={g('sup_dichiarata_art17_1')} onChange={v => set('sup_dichiarata_art17_1', v)} disabled={saving}/> } : null
      case 'sup_irrigata_art17_1': return (norma1516 === 'Art17' && art17tipo === 'Art17.1') ? { label: 'Superficie variata (ha.a.ca)', el: <NpSurfaceText value={g('sup_irrigata_art17_1')} onChange={v => set('sup_irrigata_art17_1', v)} disabled={saving}/> } : null
      case 'sup_dichiarata_art17_2': return (norma1516 === 'Art17' && art17tipo === 'Art17.2') ? { label: 'Superficie dichiarata (ha.a.ca)', el: <NpSurfaceText value={g('sup_dichiarata_art17_2')} onChange={v => set('sup_dichiarata_art17_2', v)} disabled={saving}/> } : null
      case 'sup_irrigata_art17_2': return (norma1516 === 'Art17' && art17tipo === 'Art17.2') ? { label: 'Superficie irrigata (ha.a.ca)', el: <NpSurfaceText value={'0'} onChange={() => {}} disabled/> } : null
      // Violazione — Gravità
      case 'grado': {
        const en = isRitAgrTecContext(currentUserContext) && ritGradoTriggerViolations
        const el = !ritGradoTriggerViolations
          ? <NpSel value={''} onChange={() => {}} options={CHOICES.grado} disabled/>
          : (
            <div style={{ display: 'grid', gap: 8 }}>
              {ritGradoSelectedArts.map(art => {
                const gradeValue = ritGradiViolazioniMap[art] || ''
                const gradePending = en && !gradeValue
                return (
                  <div key={art} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Art. {art}</div>
                    <NpSel
                      value={gradeValue}
                      onChange={v => setRitGradoForArt(art, v)}
                      options={CHOICES.grado}
                      centerText
                      disabled={saving || !en}
                      attention={gradePending}
                      attentionTitle='Grado da valorizzare'
                    />
                  </div>
                )
              })}
            </div>
          )
        return { label: 'Gravità', el }
      }
      // Violazione — Descrizione
      case 'descrizione_fatti': return { label: 'Descrizione dettagliata della violazione', el: <NpText value={g('descrizione_fatti')} onChange={v => set('descrizione_fatti', v)} multiline uppercase={false} disabled={saving}/> }
      case 'circostanze': return { label: 'Circostanze rilevanti', el: <NpText value={g('circostanze')} onChange={v => set('circostanze', v)} multiline uppercase={false} disabled={saving}/> }
      case 'presenza_trasgressore': {
        const presenzaPending = selectedViolazioniCount > 0 && !String(g('presenza_trasgressore') || '').trim()
        return { label: <span style={{ whiteSpace: 'nowrap' }}>Il trasgressore era presente?</span>, el: <NpSel value={g('presenza_trasgressore')} onChange={v => set('presenza_trasgressore', v)} options={CHOICES.presenza} disabled={saving} attention={presenzaPending} attentionTitle='Campo obbligatorio se è selezionata almeno una violazione'/> }
      }
      case 'descrizione_luogo': return { label: 'Descrizione del luogo', el: <NpText value={g('descrizione_luogo')} onChange={v => set('descrizione_luogo', v)} multiline uppercase={false} disabled={saving}/> }
      // Dati tecnici
      case 'distretto': return { label: 'Distretto', el: <NpText value={g('distretto')} onChange={v => set('distretto', v)} disabled={saving}/> }
      case 'comizio': return { label: 'Comizio', el: <NpText value={g('comizio')} onChange={v => set('comizio', v)} disabled={saving}/> }
      case 'idrante': return { label: 'Idrante', el: <NpText value={g('idrante')} onChange={v => set('idrante', v)} disabled={saving}/> }
      case 'matricola_contatore': return { label: 'Matricola contatore', el: <NpText value={g('matricola_contatore')} onChange={v => set('matricola_contatore', v)} disabled={saving}/> }
      case 'matricola_tessera': return { label: 'Matricola tessera', el: <NpText value={g('matricola_tessera')} onChange={v => set('matricola_tessera', v)} disabled={saving}/> }
      default: return null
    }
  }

  const renderRiAgrTecProtectedControl = (fieldName: string, node: React.ReactNode): React.ReactNode => {
    if (canEditFieldForCurrentProfile(fieldName)) return node
    if (React.isValidElement(node)) {
      return React.cloneElement(node as React.ReactElement<any>, { disabled: true })
    }
    return <div style={{ pointerEvents: 'none', opacity: 0.72 }}>{node}</div>
  }

  const editCardStyle: React.CSSProperties = {
    background: formStyle.cardBg,
    border: `${formStyle.cardBorderWidth}px solid ${formStyle.cardBorderColor}`,
    borderRadius: formStyle.cardBorderRadius,
    overflow: 'hidden',
    boxShadow: formStyle.cardShadow || 'none'
  }
  const editCardHeaderStyle: React.CSSProperties = {
    background: formStyle.cardHeaderBg,
    color: formStyle.cardHeaderColor,
    borderTopLeftRadius: formStyle.cardBorderRadius,
    borderTopRightRadius: formStyle.cardBorderRadius,
    padding: `${formStyle.cardHeaderPaddingY}px ${formStyle.cardHeaderPaddingX}px`,
    fontSize: formStyle.cardHeaderFontSize,
    fontWeight: formStyle.cardHeaderFontWeight as any,
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  }
  const editCardBodyStyle: React.CSSProperties = { padding: formStyle.cardBodyPadding }
  const editPanelStyle: React.CSSProperties = {
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: formStyle.cardBorderRadius,
    padding: 10,
    minWidth: 0
  }
  const editMutedHeaderStyle: React.CSSProperties = {
    color: formStyle.hdrColor,
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: readOnlyBannerOpen ? 8 : 0
  }
  const renderEditCard = (
    title: string,
    body: React.ReactNode,
    right?: React.ReactNode,
    cardStyle?: React.CSSProperties,
    bodyStyle?: React.CSSProperties,
    headerStyle?: React.CSSProperties
  ) => (
    <section style={{ ...editCardStyle, ...cardStyle }}>
      <div style={{ ...editCardHeaderStyle, ...headerStyle }}>
        <span>{title}</span>
        {right}
      </div>
      <div style={{ ...editCardBodyStyle, ...bodyStyle }}>{body}</div>
    </section>
  )

  const renderFullHeightEditCard = (title: string, body: React.ReactNode, right?: React.ReactNode) => renderEditCard(
    title,
    body,
    right,
    { height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' },
    { flex: '1 1 auto', minHeight: 0, overflow: 'auto' }
  )

  const fitGridColumns = (columns?: string): string => {
    const raw = String(columns || '1fr').trim()
    if (!raw) return '1fr'
    if (/^(repeat|minmax|fit-content|calc)\(/i.test(raw)) return raw

    const parts = raw.split(/\s+/).filter(Boolean)
    if (!parts.length) return '1fr'

    const pct = parts.map(part => {
      const m = part.match(/^([0-9]+(?:\.[0-9]+)?)%$/)
      return m ? Number(m[1]) : NaN
    })
    if (pct.every(Number.isFinite)) {
      return pct.map(v => `minmax(0, ${Math.max(1, v)}fr)`).join(' ')
    }

    const fr = parts.map(part => {
      const m = part.match(/^([0-9]+(?:\.[0-9]+)?)fr$/)
      return m ? Number(m[1]) : NaN
    })
    if (fr.every(Number.isFinite)) {
      return fr.map(v => `minmax(0, ${Math.max(0.01, v)}fr)`).join(' ')
    }

    return raw
  }

  const selectedNorma3TextStyle: React.CSSProperties = { color: '#374151', fontWeight: 400, opacity: 1 }

  const mapPointEditDisabled = saving || isReadOnly || isRitAgrTecLimitedEdit

  const renderReadonlyCheckboxTi = (selected: boolean, style?: React.CSSProperties): React.ReactNode => {
    const disabledTextColor = String(formStyle.fieldDisabledColor || '#1f2937')
    const disabledBgColor = String(formStyle.fieldDisabledBg || '#e8edf3')
    const checkSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M2.09 9.23L6.23 11.87L13.93 4.13' fill='none' stroke='${disabledTextColor}' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>`
    return (
      <input
        type='checkbox'
        checked={selected}
        readOnly
        aria-disabled='true'
        tabIndex={-1}
        aria-label={selected ? 'Selezionato' : 'Non selezionato'}
        title={selected ? 'Selezionato' : 'Non selezionato'}
        onClick={evt => { evt.preventDefault(); evt.stopPropagation() }}
        onKeyDown={evt => { evt.preventDefault(); evt.stopPropagation() }}
        style={{
          margin: 0,
          padding: 0,
          flexShrink: 0,
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          boxSizing: 'border-box',
          width: 13,
          height: 13,
          borderRadius: 1.5,
          border: `1px solid ${disabledTextColor}`,
          backgroundColor: disabledBgColor,
          backgroundImage: selected ? `url("data:image/svg+xml,${encodeURIComponent(checkSvg)}")` : 'none',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 1,
          cursor: 'default',
          pointerEvents: 'none',
          ...style
        }}
      />
    )
  }

  const renderNorma3Checkbox = (selected: boolean, onChange: () => void, style?: React.CSSProperties): React.ReactNode => {
    const disabled = saving || isReadOnly || isRitAgrTecLimitedEdit
    if (disabled) return renderReadonlyCheckboxTi(selected, style)
    return (
      <input
        type='checkbox'
        checked={selected}
        disabled={disabled}
        onChange={() => { if (!disabled) onChange() }}
        style={{ margin: 0, flexShrink: 0, accentColor: '#0f4c81', ...style }}
      />
    )
  }

  const norma3ReadonlyTextStyle = (selected: boolean): React.CSSProperties => {
    if (isReadOnly || isRitAgrTecLimitedEdit) {
      return { color: String(formStyle.fieldDisabledColor || '#1f2937'), fontWeight: 400, opacity: 1 }
    }
    return {
      color: selected ? selectedNorma3TextStyle.color : '#334155',
      fontWeight: selected ? selectedNorma3TextStyle.fontWeight : 400,
      opacity: selected ? selectedNorma3TextStyle.opacity : 1
    }
  }

  const renderSpecial = (id: string): React.ReactNode => {
    switch (id) {
      case '_dati_gen_label':
        return showDatiGen ? (
          <div style={{ marginBottom: 2 }}>
            <span style={{ fontSize: formStyle.labelFontSize + 1, color: formStyle.hdrColor }}>Dati generali (automatici)</span>
          </div>
        ) : null
      case '_localizzazione':
        return (
          <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${p.mapClickEnabled ? '#2563eb' : 'rgba(0,0,0,0.10)'}`, background: p.mapClickEnabled ? 'rgba(37,99,235,0.04)' : 'rgba(0,0,0,0.02)', marginBottom: 12, transition: 'all 0.2s' }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: formStyle.hdrColor, marginBottom: 6 }}>Localizzazione{isSystemAdmin ? ` (req_point = ${reqPoint})` : ''}</div>
            <div style={{ fontSize: 12, color: geomStatus.kind === 'ok' ? '#1a7f37' : (geomStatus.kind === 'err' ? '#b42318' : '#6b7280') }}>{geomStatus.text}</div>
            {reqPoint === 1 && (() => {
              const ep = p.clickedPointWgs84 || p.existingGeomWgs84
              const isReal = ep && (Number(ep.x) !== 0 || Number(ep.y) !== 0)
              return isReal ? (
                <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Lon: {Number(ep.x).toFixed(6)} — Lat: {Number(ep.y).toFixed(6)}</span>
                </div>
              ) : null
            })()}
            {reqPoint === 1 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {!p.mapClickEnabled ? (
                  <>
                    <button type='button' disabled={mapPointEditDisabled} onClick={() => { if (mapPointEditDisabled) return; p.onToggleMapClick?.(true) }} style={{
                      padding: '5px 12px', borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: '#fff',
                      fontSize: 11, fontWeight: 700, cursor: mapPointEditDisabled ? 'not-allowed' : 'pointer', opacity: mapPointEditDisabled ? 0.5 : 1
                    }}>
                      {p.clickedPointWgs84 || (p.existingGeomWgs84 && (Number(p.existingGeomWgs84.x) !== 0 || Number(p.existingGeomWgs84.y) !== 0)) ? '📍 Modifica punto' : '📍 Imposta punto in mappa'}
                    </button>
                    {p.clickedPointWgs84 && (
                      <button type='button' disabled={mapPointEditDisabled} onClick={() => { if (mapPointEditDisabled) return; p.onClearPoint(); p.onToggleMapClick?.(false) }} style={{
                        padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.14)', background: '#f8fbff', color: '#374151',
                        fontSize: 11, fontWeight: 700, cursor: mapPointEditDisabled ? 'not-allowed' : 'pointer', opacity: mapPointEditDisabled ? 0.5 : 1
                      }}>{p.existingGeomWgs84 && (Number(p.existingGeomWgs84.x) !== 0 || Number(p.existingGeomWgs84.y) !== 0) ? 'Ripristina posizione originale' : 'Annulla'}</button>
                    )}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>⏳ Clicca sulla mappa per impostare il punto…</span>
                    <button type='button' disabled={isRitAgrTecLimitedEdit} onClick={() => { if (isRitAgrTecLimitedEdit) return; p.onToggleMapClick?.(false) }} style={{
                      padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.14)', background: '#f8fbff', color: '#374151',
                      fontSize: 11, fontWeight: 700, cursor: mapPointEditDisabled ? 'not-allowed' : 'pointer', opacity: mapPointEditDisabled ? 0.5 : 1
                    }}>Annulla</button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      case '_trasgressore_due_colonne': {
        const defaultGap = Number(cfg.fieldGap) || 12
        const noteFieldName = 'note_anagrafica'
        const layout: any[] = ((cfg.fieldLayouts || {}) as any).trasgressore || DEFAULT_FIELD_LAYOUTS.trasgressore || []
        const sectionTitleForTipoSoggetto = (raw: any): string => {
          const title = String(raw || '').trim()
          const normalized = title.toLocaleLowerCase('it-IT').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ')
          const isMainAddressTitle = normalized === 'indirizzo / sede legale' || normalized === 'residenza / sede legale'
          if (!isMainAddressTitle) return title
          if (tipoSogg === 'PG') return 'Sede legale'
          if (tipoSogg === 'PF') return 'Residenza'
          return 'Residenza / Sede legale'
        }

        const renderLayoutRowContent = (row: any, key: React.Key): React.ReactNode => {
          if (row.type === 'special') {
            const sp = renderSpecial(row.id)
            return sp != null ? <React.Fragment key={key}>{sp}</React.Fragment> : null
          }
          const cells: any[] = (row.cells || []).map((cell: any) => String(cell?.field || '') === noteFieldName ? {} : cell)
          const results = cells.map((c: any) => c?.field ? renderFieldControl(c.field) : null)
          const hasField = cells.some((c: any) => c?.field)
          const anyVisible = results.some((r: any) => r !== null)
          if (hasField && !anyVisible) return null
          return (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: fitGridColumns(row.columns), gap: row.gap ?? defaultGap, minWidth: 0, maxWidth: '100%' }}>
              {cells.map((cell: any, ci: number) => {
                if (!cell?.field) return <div key={ci}/>
                const fld = results[ci]
                if (!fld) return <div key={ci}/>
                return <NpField key={ci} label={cell.label || fld.label} hint={fld.hint}>{renderRiAgrTecProtectedControl(String(cell.field), fld.el)}</NpField>
              })}
            </div>
          )
        }

        const sections: Array<{ title: string; rows: any[] }> = []
        let current: { title: string; rows: any[] } = { title: 'Trasgressore', rows: [] }
        const pushCurrent = () => {
          if (current.rows.length) sections.push(current)
          current = { title: '', rows: [] }
        }

        layout.forEach((row: any) => {
          if (row.type === 'header') {
            const title = sectionTitleForTipoSoggetto(row.label)
            if (title.toLowerCase().startsWith('note')) {
              pushCurrent()
              current = { title: '', rows: [] }
              return
            }
            pushCurrent()
            current = { title: title || 'Trasgressore', rows: [] }
            return
          }
          if (row.type === 'special' && row.id === '_header_rappresentante_legale') {
            if (tipoSogg === 'PG') {
              pushCurrent()
              current = { title: 'Rappresentante legale', rows: [] }
            }
            return
          }
          if (row.type === 'fields' && (row.cells || []).some((cell: any) => String(cell?.field || '') === noteFieldName)) {
            const remainingCells = (row.cells || []).filter((cell: any) => String(cell?.field || '') !== noteFieldName)
            if (!remainingCells.some((cell: any) => cell?.field)) return
            if (!current.title) current.title = 'Trasgressore'
            current.rows.push({ ...row, cells: remainingCells })
            return
          }
          if (!current.title) current.title = 'Trasgressore'
          current.rows.push(row)
        })
        pushCurrent()

        const trasgressoreSectionNodes = sections.map((section, si) => {
          const nodes = section.rows.map((row, ri) => renderLayoutRowContent(row, `${si}-${ri}`)).filter(Boolean)
          if (!nodes.length) return null
          return renderEditCard(section.title || 'Trasgressore', <div style={{ display: 'grid', gap: defaultGap }}>{nodes}</div>)
        }).filter(Boolean)
        const trasgressoreGridRows = trasgressoreSectionNodes.length > 1
          ? `${Array(Math.max(0, trasgressoreSectionNodes.length - 1)).fill('auto').join(' ')} minmax(0, 1fr)`
          : 'minmax(0, 1fr)'

        const leftColumn = (
          <div style={{ display: 'grid', gap: formStyle.sectionGap, minWidth: 0, minHeight: '100%', gridTemplateRows: trasgressoreGridRows }}>
            {trasgressoreSectionNodes}
          </div>
        )

        const noteFld = renderFieldControl(noteFieldName)
        const noteBody = noteFld ? (
          <NpField label={noteFld.label} hint={noteFld.hint}>
            {renderRiAgrTecProtectedControl(noteFieldName,
              <NpText
                value={g(noteFieldName)}
                onChange={v => set(noteFieldName, v)}
                multiline
                uppercase={false}
                minRows={10}
                disabled={saving}
              />
            )}
          </NpField>
        ) : (
          <div style={{ color: '#64748b', fontSize: 12 }}>Campo note non disponibile.</div>
        )

        const rightColumn = (
          <section style={{ ...editCardStyle, minHeight: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={editCardHeaderStyle}><span>Annotazioni dell’istruttore tecnico</span></div>
            <div style={{ ...editCardBodyStyle, flex: '1 1 auto', minHeight: 0 }}>{noteBody}</div>
          </section>
        )

        const splitterStyle: React.CSSProperties = {
          position: 'relative',
          minWidth: formStyle.violazioneSplitterWidth,
          width: formStyle.violazioneSplitterWidth,
          cursor: 'col-resize',
          userSelect: 'none',
          touchAction: 'none'
        }
        const splitterDragZoneStyle: React.CSSProperties = {
          position: 'absolute',
          inset: 0,
          cursor: 'col-resize',
          userSelect: 'none',
          touchAction: 'none',
          zIndex: 1
        }
        const splitterLineStyle: React.CSSProperties = {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 1,
          borderRadius: 999,
          background: draggingTrasgressoreSplitter ? '#c5d9f1' : formStyle.violazioneSplitterColor
        }
        const resetBtnStyle: React.CSSProperties = {
          position: 'absolute',
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 28,
          height: 28,
          borderRadius: 999,
          border: `1px solid ${trasgressoreColumnsDirty ? '#ffd700' : '#aac4e0'}`,
          background: trasgressoreColumnsDirty ? '#ffd700' : '#fff',
          color: trasgressoreColumnsDirty ? '#000' : '#8aa4bf',
          cursor: trasgressoreColumnsDirty ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          lineHeight: 1,
          padding: 0,
          opacity: trasgressoreColumnsDirty ? 1 : 0.75,
          zIndex: 2
        }
        return (
          <div
            ref={trasgressoreGridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `minmax(0, ${trasgressoreColumnPercents[0].toFixed(2)}%) ${formStyle.violazioneSplitterWidth}px minmax(0, 1fr)`,
              gap: 0,
              alignItems: 'stretch',
              columnGap: 0,
              minHeight: '100%'
            }}
          >
            <div style={{ minWidth: 0, minHeight: '100%', paddingRight: 6 }}>{leftColumn}</div>
            <div
              style={splitterStyle}
              title='Ridimensiona colonne della scheda Trasgressore'
            >
              <div style={splitterDragZoneStyle} onMouseDown={startTrasgressoreResize}>
                <div style={splitterLineStyle} />
              </div>
              <button
                type='button'
                style={resetBtnStyle}
                onPointerDown={e => { if (trasgressoreColumnsDirty) handleTrasgressoreColumnsReset(e) }}
                onMouseDown={e => { if (trasgressoreColumnsDirty) handleTrasgressoreColumnsReset(e) }}
                onClick={e => { if (trasgressoreColumnsDirty) handleTrasgressoreColumnsReset(e) }}
                disabled={!trasgressoreColumnsDirty}
                title='Ripristina larghezza colonne'
                aria-label='Ripristina larghezza colonne'
              >↔</button>
            </div>
            <div style={{ minWidth: 0, minHeight: '100%', paddingLeft: 6 }}>{rightColumn}</div>
          </div>
        )
      }

      case '_violazione_due_colonne': {
        const fieldNode = (fieldName: string, label?: string) => {
          const fld = renderFieldControl(fieldName)
          if (!fld) return null
          const protectedFieldName = fieldName === 'norma15_sel' ? 'occorrenza' : (fieldName === 'grado' ? 'gradi_violazioni' : fieldName)
          return (
            <NpField key={fieldName} label={label || fld.label} hint={fld.hint}>
              {renderRiAgrTecProtectedControl(protectedFieldName, fld.el)}
            </NpField>
          )
        }
        const fieldGrid = (columns: string, fields: Array<string | { field: string; label?: string }>, gap = 10) => {
          const nodes = fields.map((item) => {
            const fieldName = typeof item === 'string' ? item : item.field
            const label = typeof item === 'string' ? undefined : item.label
            return fieldNode(fieldName, label)
          }).filter(Boolean)
          if (!nodes.length) return null
          return <div style={{ display: 'grid', gridTemplateColumns: columns, gap }}>{nodes}</div>
        }
        const canEditRegularField = (fieldName: string, enabled = true) => enabled && !saving && !isRitAgrTecLimitedEdit && canEditFieldForCurrentProfile(fieldName)
        const surfaceTextField = (fieldName: string, label: string, value: string, onChange: (v: string) => void, enabled: boolean, lockedValue?: string, attentionTitle?: string) => {
          const editable = canEditRegularField(fieldName, enabled) && lockedValue == null
          const pending = !!attentionTitle && editable && surfaceToCentiareNumber(value) <= 0
          return (
            <NpField label={label}>
              <NpSurfaceText
                value={lockedValue != null ? lockedValue : value}
                onChange={onChange}
                disabled={!editable}
                attention={pending}
                attentionTitle={attentionTitle}
              />
            </NpField>
          )
        }
        const selectField = (fieldName: string, label: string, value: string, onChange: (v: string) => void, options: readonly {v:string;l:string}[], enabled = true, attentionTitle?: string) => (
          <NpField label={label}>
            <NpSel value={value} onChange={onChange} options={options} disabled={!canEditRegularField(fieldName, enabled)} attention={!!attentionTitle && enabled && !value} attentionTitle={attentionTitle}/>
          </NpField>
        )
        const choiceBox = (value: 'Art16' | 'Art17', title: string) => {
          const active = norma1516 === value
          const disabled = saving || isRitAgrTecLimitedEdit || !canEditFieldForCurrentProfile('norma16_17')
          const checkbox = disabled ? renderReadonlyCheckboxTi(active) : (
            <input
              type='checkbox'
              checked={active}
              onChange={() => {
                setDraft(prev => ({
                  ...prev,
                  norma16_17: active ? '' : value,
                  art17_tipo: '',
                  sup_dichiarata_art16: '',
                  sup_dichiarata_art17_1: '',
                  sup_irrigata_art17_1: '',
                  sup_dichiarata_art17_2: '',
                  sup_irrigata_art17_2: ''
                }))
              }}
              style={{ margin: 0, flexShrink: 0, accentColor: '#0f4c81' }}
            />
          )
          return (
            <RegolamentoChoiceToggleTi
              articleState={regolamentoArticoliState}
              articleCode={value}
              title={title}
              checkbox={checkbox}
              disabled={disabled}
              textStyle={disabled ? { color: String(formStyle.fieldDisabledColor || '#1f2937'), fontWeight: 400, opacity: 1 } : {
                color: active ? selectedNorma3TextStyle.color : '#334155',
                fontWeight: active ? selectedNorma3TextStyle.fontWeight : 400,
                opacity: active ? selectedNorma3TextStyle.opacity : 1
              }}
            />
          )
        }
        const textAreaField = (fieldName: string, label: string, rows: number) => {
          const enabled = canEditRegularField(fieldName, true)
          const node = (
            <textarea
              value={g(fieldName)}
              onChange={e => set(fieldName, e.target.value)}
              rows={rows}
              style={{
                ...fieldBaseStyle(formStyle, !enabled),
                height: 'auto',
                paddingTop: 6,
                paddingBottom: 6,
                resize: 'vertical',
                minHeight: rows * Math.max(20, Number(formStyle.fieldHeight) || 32),
                lineHeight: 1.3
              }}
              disabled={!enabled}
            />
          )
          return <NpField label={label}>{node}</NpField>
        }
        const emptyGradeCell = (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: 24,
              color: '#4b5563',
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1
            }}
          >
            —
          </span>
        )
        const reqCheckCell = (required: boolean, title: string) => (
          <span
            title={title}
            aria-label={required ? title : 'Non richiesto'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: 24,
              color: '#4b5563',
              fontSize: required ? 12 : 17,
              fontWeight: 700,
              lineHeight: 1
            }}
          >
            {required ? '●' : '—'}
          </span>
        )
        const renderNorma3Rows = () => {
          const norma3IndicatorColumnWidth = formStyle.norma3GradeColumnWidth
          const gridColumns = `minmax(300px, 1fr) ${norma3IndicatorColumnWidth}px ${norma3IndicatorColumnWidth}px ${norma3IndicatorColumnWidth}px ${formStyle.norma3GradeColumnWidth}px`
          const reqHeaderStyle: React.CSSProperties = {
            ...editMutedHeaderStyle,
            marginBottom: 0,
            padding: '6px 6px',
            borderLeft: '1px solid #e5e7eb',
            textAlign: 'center',
            whiteSpace: 'normal',
            lineHeight: 1.15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
          const reqCellStyle: React.CSSProperties = {
            borderLeft: '1px solid #e5e7eb',
            padding: '0 4px',
            minHeight: formStyle.fieldHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }
          return (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#f8fbff', display: 'grid', gap: formStyle.norma3RowGap }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 0, background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ ...editMutedHeaderStyle, marginBottom: 0, padding: '6px 8px', display: 'flex', alignItems: 'center' }}>Violazione</div>
                <div style={reqHeaderStyle}>Punto mappa</div>
                <div style={reqHeaderStyle} title='Nota spese / rimborso / risarcimento'>Nota spese</div>
                <div style={reqHeaderStyle}>Gravità</div>
                <div style={reqHeaderStyle}>Grado</div>
              </div>
              {CHOICES.norma3.map((o, idx) => {
                const art = normalizeArtCode(o.v)
                const selected = norma3Set.has(o.v)
                const requiresPoint = NORMA3_REQ_POINT.has(o.v)
                const hasGrade = RIT_GRADO_ART_CODES.includes(art as any)
                const hasNotaSpese = getNotaSpeseCasisticaByArtCode(o.v) != null
                const canEditGrade = !isReadOnly && isRitAgrTecContext(currentUserContext) && selected && hasGrade && !saving
                const gradeValue = ritGradiViolazioniMap[art] || ''
                const gradePending = canEditGrade && !gradeValue
                const gradeNode = selected && hasGrade
                  ? <NpSel
                      value={gradeValue}
                      onChange={v => setRitGradoForArt(art, v)}
                      options={CHOICES.grado}
                      centerText
                      disabled={!canEditGrade}
                      attention={gradePending}
                      attentionTitle='Grado da valorizzare'
                    />
                  : (hasGrade
                      ? reqCheckCell(true, 'Richiede valorizzazione del grado')
                      : emptyGradeCell)
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f7fbff'
                return (
                  <div key={o.v} style={{
                    display: 'grid',
                    gridTemplateColumns: gridColumns,
                    minHeight: formStyle.fieldHeight,
                    borderBottom: '1px solid #edf2f7',
                    background: rowBg,
                    alignItems: 'stretch'
                  }}>
                    <div style={{ padding: 0, minWidth: 0, display: 'flex', alignItems: 'stretch' }}>
                      <RegolamentoChoiceToggleTi
                        articleState={regolamentoArticoliState}
                        articleCode={o.v}
                        title={o.l}
                        checkbox={renderNorma3Checkbox(selected, () => !(saving || isRitAgrTecLimitedEdit) && toggleNorma3(o.v))}
                        disabled={saving || isReadOnly || isRitAgrTecLimitedEdit}
                        textStyle={norma3ReadonlyTextStyle(selected)}
                      />
                    </div>
                    <div style={reqCellStyle}>
                      {reqCheckCell(requiresPoint, 'Richiede punto in mappa')}
                    </div>
                    <div style={reqCellStyle}>
                      {reqCheckCell(hasNotaSpese, 'Richiede nota spese / rimborso / risarcimento')}
                    </div>
                    <div style={reqCellStyle}>
                      {reqCheckCell(hasGrade, 'Richiede grado di gravità')}
                    </div>
                    <div style={{ borderLeft: '1px solid #e5e7eb', padding: '0 6px', minHeight: formStyle.fieldHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                      {gradeNode}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }

        const art15SupEnabled = art15Selected && hasTipoAbuso15
        const art15SupDichLocked = tipoAbuso === 'totale'
        const art16Selected = norma1516 === 'Art16'
        const art17Selected = norma1516 === 'Art17'
        const art17VarSelected = art17Selected && art17tipo === 'Art17.1'
        const art17RinSelected = art17Selected && art17tipo === 'Art17.2'
        const art17SecondLabel = art17VarSelected ? 'Sup. variata (ha.a.ca)' : 'Sup. irrigata (ha.a.ca)'
        const art17DichField = art17VarSelected ? 'sup_dichiarata_art17_1' : 'sup_dichiarata_art17_2'
        const art17SecondField = art17VarSelected ? 'sup_irrigata_art17_1' : 'sup_irrigata_art17_2'
        const art17DichValue = art17VarSelected ? g('sup_dichiarata_art17_1') : (art17RinSelected ? g('sup_dichiarata_art17_2') : '')
        const art17SecondValue = art17VarSelected ? g('sup_irrigata_art17_1') : (art17RinSelected ? '0' : '')
        const art17SurfaceEnabled = art17Selected && !!art17tipo

        const narrowSurfaceCol = 'minmax(145px, 155px)'
        const wideSurfaceCol = 'minmax(135px, 150px)'
        const termsGridColumns = `minmax(270px, 1fr) ${narrowSurfaceCol} ${narrowSurfaceCol} ${wideSurfaceCol}`
        const art15GridColumns = `minmax(250px, 1fr) minmax(135px, 155px) minmax(125px, 145px) ${wideSurfaceCol} ${wideSurfaceCol}`

        const art15ChoiceBox = () => {
          const active = art15Selected
          const disabled = saving || isRitAgrTecLimitedEdit || !canEditFieldForCurrentProfile('tipo_abuso')
          const checkbox = disabled ? renderReadonlyCheckboxTi(active) : (
            <input
              type='checkbox'
              checked={active}
              onChange={() => {
                if (active) {
                  setArt15SelectedUi(false)
                  setDraft(prev => ({
                    ...prev,
                    tipo_abuso: '',
                    norma15_parziale: '',
                    norma15_totale: '',
                    occorrenza: '',
                    sup_dichiarata_art15: '',
                    sup_irrigata_art15: ''
                  }))
                } else {
                  setArt15SelectedUi(true)
                }
              }}
              style={{ margin: 0, flexShrink: 0, accentColor: '#0f4c81' }}
            />
          )
          return (
            <RegolamentoChoiceToggleTi
              articleState={regolamentoArticoliState}
              articleCode='Art15'
              title='Art. 15 - Prelievo abusivo d’acqua'
              checkbox={checkbox}
              disabled={disabled}
              textStyle={disabled ? { color: String(formStyle.fieldDisabledColor || '#1f2937'), fontWeight: 400, opacity: 1 } : {
                color: active ? selectedNorma3TextStyle.color : '#334155',
                fontWeight: active ? selectedNorma3TextStyle.fontWeight : 400,
                opacity: active ? selectedNorma3TextStyle.opacity : 1
              }}
            />
          )
        }

        const attrezzatureRiepilogoFontSize = Math.max(
          14,
          Number(formStyle.fieldFontSize) || 13,
          Number(formStyle.norma3FontSize) || 12
        )

        const leftColumn = (
          <div style={{ display: 'grid', gap: formStyle.sectionGap, minWidth: 0, minHeight: '100%', gridTemplateRows: 'auto auto minmax(0, 1fr)' }}>
            {renderEditCard('Prelievo abusivo d’acqua',
              <div style={{ display: 'grid', gridTemplateColumns: art15GridColumns, gap: 10, alignItems: 'start', minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...S.lbl, color: formStyle.labelColor, fontSize: formStyle.labelFontSize, visibility: 'hidden' }}>Violazione</div>
                  {art15ChoiceBox()}
                </div>
                {selectField('tipo_abuso', 'Tipo di abuso', tipoAbuso, v => { set('tipo_abuso', v); set('norma15_parziale', ''); set('norma15_totale', '') }, CHOICES.tipo_abuso, art15Selected, 'Tipo di abuso da selezionare')}
                {fieldNode('norma15_sel', 'Occorrenza')}
                {surfaceTextField('sup_dichiarata_art15', 'Sup. dichiarata (ha.a.ca)', g('sup_dichiarata_art15'), v => set('sup_dichiarata_art15', v), art15SupEnabled, art15SupDichLocked ? '0' : undefined, 'Superficie dichiarata da valorizzare')}
                {surfaceTextField('sup_irrigata_art15', 'Sup. irrigata (ha.a.ca)', g('sup_irrigata_art15'), v => set('sup_irrigata_art15', v), art15SupEnabled, undefined, 'Superficie irrigata da valorizzare')}
              </div>
            )}

            {renderEditCard('Inosservanza termini presentazione comunicazioni',
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: termsGridColumns, gap: 10, alignItems: 'start' }}>
                  <div style={{ gridColumn: '1 / span 2' }}>
                    <div style={{ ...S.lbl, color: formStyle.labelColor, fontSize: formStyle.labelFontSize, visibility: 'hidden' }}>Violazione</div>
                    {choiceBox('Art16', 'Art. 16 - Presentazione tardiva comunicazione di irrigazione')}
                  </div>
                  {surfaceTextField('sup_dichiarata_art16', 'Sup. dichiarata (ha.a.ca)', g('sup_dichiarata_art16'), v => set('sup_dichiarata_art16', v), art16Selected, undefined, 'Superficie dichiarata da valorizzare')}
                  {surfaceTextField('sup_irrigata_art16', 'Sup. irrigata (ha.a.ca)', '0', () => {}, art16Selected, '0')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: termsGridColumns, gap: 10, alignItems: 'start' }}>
                  <div>
                    <div style={{ ...S.lbl, color: formStyle.labelColor, fontSize: formStyle.labelFontSize, visibility: 'hidden' }}>Violazione</div>
                    {choiceBox('Art17', 'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia')}
                  </div>
                  {selectField('art17_tipo', 'Tipo comunicazione', art17tipo, v => set('art17_tipo', v), CHOICES.art17_tipo, art17Selected, 'Tipo di comunicazione da selezionare')}
                  {surfaceTextField(art17DichField, 'Sup. dichiarata (ha.a.ca)', art17DichValue, v => set(art17DichField, v), art17SurfaceEnabled, undefined, 'Superficie dichiarata da valorizzare')}
                  {surfaceTextField(art17SecondField, art17SecondLabel, art17SecondValue, v => set(art17SecondField, v), art17SurfaceEnabled, art17RinSelected ? '0' : undefined, 'Superficie da valorizzare')}
                </div>
              </div>
            )}

            {renderEditCard('Altre violazioni', renderNorma3Rows())}
          </div>
        )

        const rightColumn = (
          <section style={{ ...editCardStyle, minHeight: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={editCardHeaderStyle}><span>Descrizione e circostanze</span></div>
            <div style={{ ...editCardBodyStyle, flex: '1 1 auto', display: 'grid', gridTemplateRows: 'auto auto auto 1fr', gap: 7, alignContent: 'start' }}>
              {textAreaField('descrizione_fatti', 'Descrizione dettagliata della violazione', formStyle.violazioneDescrizioneRows)}
              {textAreaField('circostanze', 'Circostanze rilevanti', formStyle.violazioneDescrizioneRows)}
              {fieldGrid(`${formStyle.norma3GradeColumnWidth}px`, ['presenza_trasgressore'], 7)}
              <div />
            </div>
          </section>
        )

        const splitterStyle: React.CSSProperties = {
          position: 'relative',
          minWidth: formStyle.violazioneSplitterWidth,
          width: formStyle.violazioneSplitterWidth,
          cursor: 'col-resize',
          userSelect: 'none',
          touchAction: 'none'
        }
        const splitterDragZoneStyle: React.CSSProperties = {
          position: 'absolute',
          inset: 0,
          cursor: 'col-resize',
          userSelect: 'none',
          touchAction: 'none',
          zIndex: 1
        }
        const splitterLineStyle: React.CSSProperties = {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 1,
          borderRadius: 999,
          background: draggingViolazioneSplitter ? '#c5d9f1' : formStyle.violazioneSplitterColor
        }
        const resetBtnStyle: React.CSSProperties = {
          position: 'absolute',
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 28,
          height: 28,
          borderRadius: 999,
          border: `1px solid ${violazioneColumnsDirty ? '#ffd700' : '#aac4e0'}`,
          background: violazioneColumnsDirty ? '#ffd700' : '#fff',
          color: violazioneColumnsDirty ? '#000' : '#8aa4bf',
          cursor: violazioneColumnsDirty ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          lineHeight: 1,
          padding: 0,
          opacity: violazioneColumnsDirty ? 1 : 0.75,
          zIndex: 2
        }

        return (
          <div
            ref={violazioneGridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `minmax(0, ${violazioneColumnPercents[0].toFixed(2)}%) ${formStyle.violazioneSplitterWidth}px minmax(0, 1fr)`,
              gap: 0,
              alignItems: 'stretch',
              columnGap: 0,
              minHeight: '100%'
            }}
          >
            <div style={{ minWidth: 0, minHeight: '100%', paddingRight: 6 }}>{leftColumn}</div>
            <div
              style={splitterStyle}
              title='Ridimensiona colonne della scheda Violazione'
            >
              <div style={splitterDragZoneStyle} onMouseDown={startViolazioneResize}>
                <div style={splitterLineStyle} />
              </div>
              <button
                type='button'
                style={resetBtnStyle}
                onPointerDown={e => { if (violazioneColumnsDirty) handleViolazioneColumnsReset(e) }}
                onMouseDown={e => { if (violazioneColumnsDirty) handleViolazioneColumnsReset(e) }}
                onClick={e => { if (violazioneColumnsDirty) handleViolazioneColumnsReset(e) }}
                disabled={!violazioneColumnsDirty}
                title='Ripristina larghezza colonne'
                aria-label='Ripristina larghezza colonne'
              >↔</button>
            </div>
            <div style={{ minWidth: 0, minHeight: '100%', paddingLeft: 6 }}>{rightColumn}</div>
          </div>
        )
      }

      case '_checkboxes_norma3':
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
              {CHOICES.norma3.map(o => {
                const selected = norma3Set.has(o.v)
                return (
                  <React.Fragment key={o.v}>
                    <RegolamentoChoiceToggleTi
                      articleState={regolamentoArticoliState}
                    articleCode={o.v}
                    title={o.l}
                    checkbox={renderNorma3Checkbox(selected, () => !(saving || isRitAgrTecLimitedEdit) && toggleNorma3(o.v))}
                    disabled={saving || isReadOnly || isRitAgrTecLimitedEdit}
                    textStyle={norma3ReadonlyTextStyle(selected)}
                    />
                  </React.Fragment>
                )
              })}
            </div>
          </>
        )
      case '_header_rappresentante_legale':
        return tipoSogg === 'PG' ? <div style={sHdr}>Rappresentante legale</div> : null
      default: return null
    }
  }

  const normalizeDatiGeneraliLayout = (rows: any[]): any[] => {
    if (!Array.isArray(rows)) return rows
    return rows.map((row: any) => {
      if (!row || row.type !== 'fields' || !Array.isArray(row.cells)) return row
      let changed = false
      const cells = row.cells.map((cell: any) => {
        if (String(cell?.field || '') !== 'data_firma') return cell
        changed = true
        return { ...cell, field: 'dt_trasmissione_capo_settore', label: 'Data trasmissione al Capo Settore' }
      })
      return changed ? { ...row, cells } : row
    })
  }

  const renderLayoutTab = (tabId: string): React.ReactNode => {
    if (tabId === 'trasgressore') return renderSpecial('_trasgressore_due_colonne')
    if (tabId === 'violazione') return renderSpecial('_violazione_due_colonne')
    const cfgLayouts = cfg.fieldLayouts || {}
    const rawLayout: any[] = (cfgLayouts as any)[tabId] || DEFAULT_FIELD_LAYOUTS[tabId] || []
    const layout: any[] = tabId === 'dati_generali' ? normalizeDatiGeneraliLayout(rawLayout) : rawLayout
    const defaultGap = Number(cfg.fieldGap) || 12
    const fallbackTitle = NP_TABS.find(t => t.id === tabId)?.label || 'Sezione'

    const renderLayoutRowContent = (row: any, key: React.Key): React.ReactNode => {
      if (row.type === 'special') {
        const sp = renderSpecial(row.id)
        return sp != null ? <React.Fragment key={key}>{sp}</React.Fragment> : null
      }
      const cells: any[] = row.cells || []
      const results = cells.map((c: any) => c?.field ? renderFieldControl(c.field) : null)
      const hasField = cells.some((c: any) => c?.field)
      const anyVisible = results.some((r: any) => r !== null)
      if (hasField && !anyVisible) return null
      return (
        <div key={key} style={{ display: 'grid', gridTemplateColumns: fitGridColumns(row.columns), gap: row.gap ?? defaultGap, minWidth: 0, maxWidth: '100%' }}>
          {cells.map((cell: any, ci: number) => {
            if (!cell?.field) return <div key={ci}/>
            const fld = results[ci]
            if (!fld) return <div key={ci}/>
            return <NpField key={ci} label={cell.label || fld.label} hint={fld.hint}>{renderRiAgrTecProtectedControl(String(cell.field), fld.el)}</NpField>
          })}
        </div>
      )
    }

    const sections: Array<{ title: string; rows: any[] }> = []
    let current: { title: string; rows: any[] } = { title: fallbackTitle, rows: [] }
    const pushCurrent = () => {
      if (current.rows.length) sections.push(current)
      current = { title: '', rows: [] }
    }

    layout.forEach((row: any) => {
      if (row.type === 'header') {
        pushCurrent()
        current = { title: String(row.label || fallbackTitle), rows: [] }
        return
      }
      if (row.type === 'special' && row.id === '_header_rappresentante_legale') {
        if (tipoSogg === 'PG') {
          pushCurrent()
          current = { title: 'Rappresentante legale', rows: [] }
        }
        return
      }
      if (row.type === 'special' && row.id === '_localizzazione') {
        pushCurrent()
        sections.push({ title: 'Localizzazione', rows: [row] })
        current = { title: '', rows: [] }
        return
      }
      if (!current.title) current.title = fallbackTitle
      current.rows.push(row)
    })
    pushCurrent()

    const renderedSections = sections.map((section, si) => {
      const nodes = section.rows.map((row, ri) => renderLayoutRowContent(row, `${si}-${ri}`)).filter(Boolean)
      if (!nodes.length) return null
      return { key: `${tabId}-${si}`, title: section.title || fallbackTitle, nodes }
    }).filter(Boolean) as Array<{ key: string; title: string; nodes: React.ReactNode[] }>

    const gridRows = renderedSections.length > 1
      ? `${Array(Math.max(0, renderedSections.length - 1)).fill('auto').join(' ')} minmax(0, 1fr)`
      : 'minmax(0, 1fr)'

    return (
      <div style={{ display: 'grid', gap: 14, minHeight: '100%', gridTemplateRows: gridRows }}>
        {renderedSections.map((section, idx) => {
          const isLast = idx === renderedSections.length - 1
          return (
            <React.Fragment key={section.key}>
              {renderEditCard(
                section.title,
                <div style={{ display: 'grid', gap: defaultGap }}>{section.nodes}</div>,
                undefined,
                isLast ? { minHeight: '100%', display: 'flex', flexDirection: 'column' } : undefined,
                isLast ? { flex: '1 1 auto', minHeight: 0 } : undefined
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  const toolbarRowRef = React.useRef<HTMLDivElement | null>(null)
  const [toolbarRowMultiline, setToolbarRowMultiline] = React.useState(false)

  React.useEffect((): (() => void) | void => {
    const el = toolbarRowRef.current
    if (!el) {
      setToolbarRowMultiline(false)
      return
    }

    const updateToolbarRowMultiline = (): void => {
      try {
        const next = el.getBoundingClientRect().height > 44
        setToolbarRowMultiline(prev => prev === next ? prev : next)
      } catch {
        setToolbarRowMultiline(false)
      }
    }

    updateToolbarRowMultiline()

    let ro: ResizeObserver | null = null
    try {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(updateToolbarRowMultiline)
        ro.observe(el)
      }
    } catch { ro = null }

    window.addEventListener('resize', updateToolbarRowMultiline, true)
    return (): void => {
      try { ro?.disconnect() } catch {}
      window.removeEventListener('resize', updateToolbarRowMultiline, true)
    }
  }, [npTab, isReadOnly, readOnlyBannerMounted])

  // Pareggia lo spazio sotto la riga titolo/pulsanti (padding-bottom toolbar + suo border-bottom 1px)
  // con quello sopra (border + padding del contenitore esterno), così il blocco non risulta
  // visivamente più vicino al bordo superiore della card che a quello inferiore.
  const toolbarBottomPad = Math.max(0, Number(formStyle.maskBorderWidth || 0) + Number(formStyle.maskInnerPadding || 0) - 1)

  return (
  <FormStyleCtx.Provider value={formStyle}>
    <div ref={npTabSyncElRef} style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      boxSizing: 'border-box',
      background: formStyle.maskBg,
      border: `${formStyle.maskBorderWidth}px solid ${formStyle.maskBorderColor}`,
      borderRadius: formStyle.maskBorderRadius,
      padding: formStyle.maskInnerPadding,
      position: 'relative',
      overflow: npTab === 'dati_tecnici' ? 'visible' : 'hidden',
      zIndex: npTab === 'dati_tecnici' ? 2147483000 : 'auto'
    }}>

      {/* ── Toolbar ── */}
      <div style={{
        flex: '0 0 auto',
        position: 'relative',
        padding: isReadOnly && readOnlyBannerMounted ? (readOnlyBannerOpen ? `48px 0 ${toolbarBottomPad}px` : `0 0 ${toolbarBottomPad}px`) : `0 0 ${toolbarBottomPad}px`,
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        transition: 'padding 280ms ease'
      }}>
        <div ref={toolbarRowRef} style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          minHeight: isReadOnly && readOnlyBannerMounted ? 36 : undefined
        }}>
          {isReadOnly && readOnlyBannerMounted && (
            <div style={{
              position: 'absolute',
              // Da chiuso: quadrato 36x36 centrato sulla riga reale (qualunque sia la sua altezza).
              // Da aperto: stessa posizione di prima (zona padding-top:48 sopra la riga), spostandolo
              // sopra il bordo superiore della riga della stessa misura del padding-top aggiunto al toolbar.
              top: readOnlyBannerOpen ? -48 : (toolbarRowMultiline ? 0 : '50%'),
              transform: readOnlyBannerOpen || toolbarRowMultiline ? 'none' : 'translateY(-50%)',
              left: 0,
              right: readOnlyBannerOpen ? 0 : 'auto',
              width: readOnlyBannerOpen ? 'auto' : 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: readOnlyBannerOpen ? '6px 10px 6px 6px' : '6px',
              border: '1px solid #fb923c',
              borderRadius: readOnlyBannerOpen ? formStyle.maskBorderRadius : 8,
              background: '#fff7ed',
              color: '#b42318',
              boxSizing: 'border-box',
              overflow: 'hidden',
              zIndex: 2,
              transition: 'top 280ms ease, transform 280ms ease, width 280ms ease, background-color 220ms ease, border-color 220ms ease'
            }}>
              {readOnlyInfoButton}
              <span style={{
                fontSize: Math.max(12, Number(formStyle.msgFontSize || 12)),
                fontWeight: 700,
                lineHeight: 1.35,
                whiteSpace: 'nowrap',
                opacity: readOnlyBannerOpen ? 1 : 0,
                transform: readOnlyBannerOpen ? 'translateX(0)' : 'translateX(-8px)',
                maxWidth: readOnlyBannerOpen ? 900 : 0,
                overflow: 'hidden',
                transition: 'opacity 280ms ease, transform 280ms ease, max-width 280ms ease'
              }}>
                {readOnlyBannerText}
              </span>
            </div>
          )}
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: isReadOnly && readOnlyBannerMounted ? 44 : 0, transition: 'padding-left 220ms ease', flex: '1 1 280px' }}>
            <div style={{ fontWeight: 700, fontSize: formStyle.titleFontSize, lineHeight: 1.25 }}>
              {toolbarTitleInfo.baseTitle}
              {toolbarTitleInfo.praticaCode ? <> <span style={{ color: '#0b5fff' }}>{toolbarTitleInfo.praticaCode}</span></> : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flex: '0 0 auto', marginLeft: 'auto', flexWrap: 'nowrap' }}>
            {msg && msg.kind === 'ok' && <span style={{ fontSize: formStyle.msgFontSize, color: '#1a7f37' }}>{msg.text}</span>}
            {npTab === 'nota_spese' && mode === 'edit' && currentOid != null && noteSpeseMissing.length === 0 && currentGlobalId && (
              <button
                type='button'
                onClick={() => {
                  if (noteSpeseBrowseDisabled) {
                    if (!activeNotaSpeseCasistica || noteSpeseCasistiche.length === 0) {
                      setNoteSpeseMsg({ ok: false, text: 'Seleziona una violazione collegabile alla nota spese prima di sfogliare il prezzario.' })
                    }
                    return
                  }
                  try { const pg = resolvePageId('browser-nota-spese'); if (pg) { if (noteSpeseDraftStorageKey) nsWriteDraftSnapshot(noteSpeseDraftStorageKey, noteSpeseRowsDraft, activeNotaSpeseCasistica); try { if (isArt30NotaSpeseCasistica && art30RecuperoMode === 'non_recuperabile') { sessionStorage.setItem('GII_NS_FORCE_SOURCE', 'ATTREZZATURE'); sessionStorage.removeItem('GII_NS_EXCLUDE_SOURCE') } else { sessionStorage.removeItem('GII_NS_FORCE_SOURCE'); sessionStorage.setItem('GII_NS_EXCLUDE_SOURCE', 'ATTREZZATURE') } window.dispatchEvent(new CustomEvent('gii:ns-source-flags-changed')) } catch {} try { const curPage = getAppStore()?.getState()?.appRuntimeInfo?.currentPageId || ''; sessionStorage.setItem('GII_NS_RETURN_PAGE', curPage) } catch {} UrlManager.getInstance().changePage(pg) } else { setNoteSpeseMsg({ ok: false, text: 'Pagina "browser-nota-spese" non trovata. Configura una pagina ExB con il widget consultazione prezzario e il widget gii-ns-carrello.' }) } } catch (e: any) { setNoteSpeseMsg({ ok: false, text: e?.message || String(e) }) }
                }}
                disabled={noteSpeseBrowseDisabled}
                title={!activeNotaSpeseCasistica || noteSpeseCasistiche.length === 0 ? 'Seleziona prima una violazione collegabile alla nota spese.' : 'Sfoglia prezzario'}
                aria-label='Sfoglia prezzario'
                style={{
                  width: 40,
                  height: 40,
                  padding: 0,
                  boxSizing: 'border-box',
                  marginRight: 12,
                  borderRadius: 8,
                  border: `2px solid ${noteSpeseBrowseDisabled ? '#e5e7eb' : '#0d3b66'}`,
                  background: '#fff',
                  color: noteSpeseBrowseDisabled ? '#9ca3af' : '#0d3b66',
                  cursor: noteSpeseBrowseDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                  <circle cx='5.5' cy='6' r='1.5' fill='currentColor'/>
                  <line x1='10' y1='6' x2='19' y2='6' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/>
                  <circle cx='5.5' cy='12' r='1.5' fill='currentColor'/>
                  <line x1='10' y1='12' x2='19' y2='12' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/>
                  <circle cx='5.5' cy='18' r='1.5' fill='currentColor'/>
                  <line x1='10' y1='18' x2='19' y2='18' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/>
                </svg>
              </button>
            )}
            <button type='button' disabled={isReadOnly || saving || !isDirty || !!recuperableTesseraEdit} onClick={handleSave}
              style={{
                ...btnBase,
                border: '1px solid rgba(0,0,0,0.18)',
                background: (isReadOnly || saving || !isDirty || !!recuperableTesseraEdit) ? '#e5e7eb' : '#1a7f37',
                color: (isReadOnly || saving || !isDirty || !!recuperableTesseraEdit) ? '#9ca3af' : '#fff',
                cursor: (isReadOnly || saving || !isDirty || !!recuperableTesseraEdit) ? 'not-allowed' : 'pointer'
              }}>
              {saving ? 'Salvataggio…' : (p.saveText || 'Salva')}
            </button>
            <button type='button' disabled={isReadOnly || saving || !isDirty || !!recuperableTesseraEdit} onClick={handleCancel}
              style={{
                ...btnBase,
                border: '1px solid rgba(0,0,0,0.24)',
                background: (isReadOnly || saving || !isDirty || !!recuperableTesseraEdit) ? '#e5e7eb' : '#d92d20',
                color: (isReadOnly || saving || !isDirty || !!recuperableTesseraEdit) ? '#9ca3af' : '#fff',
                cursor: (isReadOnly || saving || !isDirty || !!recuperableTesseraEdit) ? 'not-allowed' : 'pointer'
              }}>
              Annulla
            </button>
            {mode === 'edit' && (
              <button type='button' disabled={saving || isDirty || !!recuperableTesseraEdit} onClick={handleCloseEdit}
                title={recuperableTesseraEdit ? 'Aggiorna o annulla prima i dati della tessera.' : (isDirty ? 'Salvare o annullare le modifiche prima di chiudere.' : undefined)}
                style={{
                  ...btnBase,
                  border: '1px solid rgba(0,0,0,0.24)',
                  background: (saving || isDirty || !!recuperableTesseraEdit) ? '#e5e7eb' : '#1d4ed8',
                  color: (saving || isDirty || !!recuperableTesseraEdit) ? '#9ca3af' : '#fff',
                  cursor: (saving || isDirty || !!recuperableTesseraEdit) ? 'not-allowed' : 'pointer'
                }}>
                Chiudi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Splitter overlay Luoghi e dati tecnici ── */}
      {npTab === 'dati_tecnici' && (() => {
        const splitterW = Math.max(6, Math.min(40, Number((cfg as any).violazioneSplitterWidth) || 14))
        const splitterDragZoneStyle: React.CSSProperties = {
          position: 'absolute',
          inset: 0,
          cursor: 'col-resize',
          userSelect: 'none',
          touchAction: 'none',
          zIndex: 1
        }
        const splitterLineStyle: React.CSSProperties = {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 2,
          borderRadius: 999,
          background: formStyle.violazioneSplitterColor
        }
        const resetBtnStyle: React.CSSProperties = {
          position: 'absolute',
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 28,
          height: 28,
          borderRadius: 999,
          border: `1px solid ${datiTecniciSidebarDirty ? '#ffd700' : '#aac4e0'}`,
          background: datiTecniciSidebarDirty ? '#ffd700' : '#fff',
          color: datiTecniciSidebarDirty ? '#000' : '#8aa4bf',
          cursor: datiTecniciSidebarDirty ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          lineHeight: 1,
          padding: 0,
          opacity: datiTecniciSidebarDirty ? 1 : 0.75,
          zIndex: 2
        }
        const startDatiTecniciResize = (e: React.MouseEvent<HTMLDivElement>): void => {
          e.preventDefault()
          e.stopPropagation()
          const divider = datiTecniciDividerRef.current
          if (!divider) return
          datiTecniciUserDraggingRef.current = true
          const fire = (target: EventTarget, type: string, x: number, y: number, buttons: number): void => {
            const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons }
            try {
              if (typeof PointerEvent !== 'undefined') {
                target.dispatchEvent(new PointerEvent(type, { ...opts, pointerId: 1, pointerType: 'mouse', isPrimary: true }))
              } else {
                target.dispatchEvent(new MouseEvent(type.replace('pointer', 'mouse'), opts))
              }
            } catch {}
          }
          // Pointerdown sul divisore ExB con le coordinate reali del mouse
          fire(divider, 'pointerdown', e.clientX, e.clientY, 1)
          const onMove = (me: MouseEvent): void => {
            fire(divider, 'pointermove', me.clientX, me.clientY, 1)
          }
          const onUp = (me: MouseEvent): void => {
            fire(divider, 'pointerup', me.clientX, me.clientY, 0)
            datiTecniciUserDraggingRef.current = false
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }
        const handleDatiTecniciColumnsReset = (evt: React.SyntheticEvent<HTMLButtonElement>) => {
          evt.preventDefault()
          evt.stopPropagation()
          datiTecniciUserDraggingRef.current = false
          const target = giiReadLayoutSidebarDefaultBoundaryX(npTabSyncElRef.current) ?? datiTecniciDefaultBoundaryXRef.current ?? datiTecniciBaselineXRef.current
          giiMoveNearestLayoutSidebarToX(npTabSyncElRef.current, target)
          datiTecniciDefaultBoundaryXRef.current = target
          datiTecniciBaselineXRef.current = target
          window.setTimeout(() => setDatiTecniciSidebarDirty(false), 350)
        }
        return (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: -18,
              width: splitterW,
              cursor: 'col-resize',
              userSelect: 'none',
              touchAction: 'none',
              zIndex: 2147483646
            }}
            title='Ridimensiona pannelli della scheda Luoghi e dati tecnici'
          >
            <div style={splitterDragZoneStyle} onMouseDown={startDatiTecniciResize}>
              <div style={splitterLineStyle} />
            </div>
            <button
              type='button'
              style={resetBtnStyle}
              onPointerDown={e => { if (datiTecniciSidebarDirty) handleDatiTecniciColumnsReset(e) }}
              onMouseDown={e => { if (datiTecniciSidebarDirty) handleDatiTecniciColumnsReset(e) }}
              onClick={e => { if (datiTecniciSidebarDirty) handleDatiTecniciColumnsReset(e) }}
              disabled={!datiTecniciSidebarDirty}
              title='Ripristina larghezza colonne'
              aria-label='Ripristina larghezza colonne'
            >↔</button>
          </div>
        )
      })()}

      {/* ── Contenuto tab (scrollabile) ── */}
      <fieldset
        disabled={isReadOnly && npTab !== 'violazione' && npTab !== 'nota_spese' && npTab !== 'allegati' && npTab !== 'anteprima'}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
      <div style={tabContentStyle}>

        {/* DATI GENERALI */}
        {npTab === 'dati_generali' && renderLayoutTab('dati_generali')}

        {/* TRASGRESSORE */}
        {npTab === 'trasgressore' && renderLayoutTab('trasgressore')}

        {/* VIOLAZIONE */}
        {npTab === 'violazione' && renderLayoutTab('violazione')}

        {/* DATI TECNICI */}
        {npTab === 'dati_tecnici' && renderLayoutTab('dati_tecnici')}


{/* NOTA SPESE */}
{npTab === 'nota_spese' && (
  mode !== 'edit' || currentOid == null ? (
    renderFullHeightEditCard('NOTA SPESE', (
      <div style={{ fontSize: formStyle.labelFontSize, color: formStyle.labelColor, lineHeight: 1.5 }}>
        Sarà possibile aggiungere la nota spese <b>solo dopo il primo salvataggio</b> della pratica.
      </div>
    ))
  ) : noteSpeseMissing.length > 0 ? (
    renderFullHeightEditCard('NOTA SPESE NON CONFIGURATA', (
      <div style={{ padding: 12, borderRadius: 10, border: '1px solid #f5b8b8', background: '#fce4e4', color: '#7a1c1c' }}>
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>Completa nel setting del widget i seguenti URL:</div>
        <div style={{ marginTop: 8, fontSize: 12 }}>{noteSpeseMissing.join(' • ')}</div>
      </div>
    ))
  ) : !currentGlobalId ? (
    renderFullHeightEditCard('GLOBALID PRATICA NON DISPONIBILE', (
      <div style={{ padding: 12, borderRadius: 10, border: '1px solid #f5b8b8', background: '#fce4e4', color: '#7a1c1c' }}>
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>Il widget non riesce a leggere il GlobalID della pratica selezionata. Verifica che il layer/view usato per l’editing esponga il campo <b>GlobalID</b>.</div>
      </div>
    ))
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      {noteSpeseMsg && (
        <div style={{ padding: '7px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700, border: `1px solid ${noteSpeseMsg.ok ? '#b8d4b0' : '#f5b8b8'}`, background: noteSpeseMsg.ok ? '#e2efda' : '#fce4e4', color: noteSpeseMsg.ok ? '#375623' : '#c00' }}>
          {noteSpeseMsg.text}
        </div>
      )}
      <div style={{ border: '1px solid #c5d9f1', borderRadius: 8, background: '#fff', padding: 10 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {noteSpeseCasistiche.length > 0 ? (
            <div style={{
              display: 'grid',
              gap: 4,
              padding: 10,
              borderRadius: 10,
              border: noteSpeseCasisticaDisabled ? '2px solid #cbd5e1' : '2px solid #0f7375',
              background: noteSpeseCasisticaDisabled ? '#f1f5f9' : '#f0fdfa'
            }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 auto', width: 460, maxWidth: '100%', paddingTop: 6 }}>
                  <label style={{ display: 'block', height: 18, lineHeight: '18px', fontSize: 13, fontWeight: 900, color: noteSpeseCasisticaDisabled ? '#64748b' : '#0f4f50' }}>Seleziona la violazione</label>
                  <select
                    value={activeNotaSpeseCasistica}
                    onChange={(e) => setActiveNotaSpeseCasistica(e.target.value)}
                    title={isReadOnly || isRitAgrTecLimitedEdit ? 'Seleziona la violazione per consultare la relativa nota spese.' : undefined}
                    style={{
                      ...fieldBaseStyle(formStyle, noteSpeseCasisticaDisabled),
                      height: 38,
                      maxWidth: 460,
                      display: 'block',
                      marginTop: 4,
                      border: noteSpeseCasisticaDisabled ? '1px solid #cbd5e1' : '1px solid #0f7375',
                      fontWeight: 800,
                      color: noteSpeseCasisticaDisabled ? String(formStyle.fieldDisabledColor || '#64748b') : '#16375a',
                      background: noteSpeseCasisticaDisabled ? String(formStyle.fieldDisabledBg || '#e7eef7') : '#fff',
                      cursor: noteSpeseCasisticaDisabled ? 'not-allowed' : 'pointer',
                      opacity: noteSpeseCasisticaDisabled ? 0.78 : 1,
                      WebkitTextFillColor: noteSpeseCasisticaDisabled ? String(formStyle.fieldDisabledColor || '#64748b') : undefined
                    }}
                    disabled={noteSpeseCasisticaDisabled}
                  >
                    {noteSpeseCasistiche.map(opt => <option key={opt.codice} value={opt.codice}>{opt.label}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: noteSpeseCasisticaDisabled ? '#64748b' : '#336666', lineHeight: 1.35, marginTop: 4 }}>{isReadOnly || isRitAgrTecLimitedEdit ? 'Seleziona la violazione per consultare la relativa nota spese.' : 'Le voci aggiunte dal prezzario saranno collegate alla violazione selezionata.'}</div>
                </div>
                {isArt30NotaSpeseCasistica && (
                  <div style={{ flex: '0 0 auto', width: 220, maxWidth: '100%', paddingTop: 6 }}>
                    <label style={{ display: 'block', height: 18, lineHeight: '18px', fontSize: 13, fontWeight: 900, color: noteSpeseCasisticaDisabled ? '#64748b' : '#0f4f50' }}>Seleziona lo stato</label>
                    <select
                      value={art30RecuperoMode}
                      onChange={(e) => { setArt30RecuperoMode(e.target.value as 'recuperabile' | 'non_recuperabile'); setActiveAttrezzaturaRiferimentoId(''); setAttrezzatureNuovoPickerOpen(false) }}
                      style={{
                        ...fieldBaseStyle(formStyle, noteSpeseCasisticaDisabled),
                        height: 38,
                        maxWidth: 220,
                        display: 'block',
                        marginTop: 4,
                        border: noteSpeseCasisticaDisabled ? '1px solid #cbd5e1' : '1px solid #0f7375',
                        fontWeight: 800,
                        color: noteSpeseCasisticaDisabled ? String(formStyle.fieldDisabledColor || '#64748b') : '#16375a',
                        background: noteSpeseCasisticaDisabled ? String(formStyle.fieldDisabledBg || '#e7eef7') : '#fff',
                        cursor: noteSpeseCasisticaDisabled ? 'not-allowed' : 'pointer',
                        opacity: noteSpeseCasisticaDisabled ? 0.78 : 1
                      }}
                      disabled={noteSpeseCasisticaDisabled}
                    >
                      <option value='recuperabile'>Recuperabile</option>
                      <option value='non_recuperabile'>Non recuperabile</option>
                    </select>
                  </div>
                )}
                {isArt30NotaSpeseCasistica && art30RecuperoMode === 'recuperabile' && (() => {
                  const noAttrezzatureCreate = attrezzatureIstanzeOptions.length === 0
                  const noteSpeseRoleReadOnly = isReadOnly || isRitAgrTecLimitedEdit
                  const tesseraEditForActive = !!recuperableTesseraEdit && recuperableTesseraEdit.ref === activeAttrezzaturaRiferimentoId
                  const comboDisabled = noteSpeseCasisticaDisabled || noAttrezzatureCreate
                  const activeTesseraMatricola = String(activeRecuperableTesseraMeta?.matricola_snapshot || '').trim()
                  const activeTesseraCauzione = !!activeRecuperableTesseraMeta?.cauzione_decurtata
                  const cauzioneLabel = nsSafeNum(attrezzatureCauzioneUnitaria, 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  return (
                  <>
                    <div style={{ flex: '0 0 auto', width: noteSpeseRoleReadOnly ? 460 : 504, maxWidth: '100%', paddingTop: 6 }}>
                      <label style={{ display: 'block', height: 18, lineHeight: '18px', fontSize: 13, fontWeight: 900, color: comboDisabled ? '#64748b' : '#0f4f50' }}>Seleziona l'attrezzatura</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'nowrap' }}>
                        <select
                          value={activeAttrezzaturaRiferimentoId}
                          onChange={(e) => { setActiveAttrezzaturaRiferimentoId(e.target.value); setPendingAttrezzaturaMsg('') }}
                          style={{
                            ...fieldBaseStyle(formStyle, comboDisabled),
                            height: 38,
                            flex: !noteSpeseRoleReadOnly ? '0 0 414px' : '0 0 460px',
                            width: !noteSpeseRoleReadOnly ? 414 : 460,
                            minWidth: 0,
                            maxWidth: '100%',
                            display: 'block',
                            border: comboDisabled ? '1px solid #cbd5e1' : (activeAttrezzaturaRiferimentoId ? '1px solid #0f7375' : '1px solid #b42318'),
                            fontWeight: 800,
                            color: comboDisabled ? String(formStyle.fieldDisabledColor || '#64748b') : '#16375a',
                            background: comboDisabled ? String(formStyle.fieldDisabledBg || '#e7eef7') : '#fff',
                            cursor: comboDisabled ? 'not-allowed' : 'pointer',
                            opacity: comboDisabled ? 0.78 : 1
                          }}
                          disabled={comboDisabled}
                        >
                          <option value=''>{noAttrezzatureCreate ? 'Nessuna attrezzatura presente' : 'Seleziona attrezzatura'}</option>
                          {attrezzatureIstanzeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>

                        {!noteSpeseRoleReadOnly && (
                          <div style={{ position: 'relative', flex: '0 0 auto', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <button
                              type='button'
                              onClick={() => { if (recuperableTesseraEdit) return; setAttrezzatureNuovoPickerOpen(v => !v); setPendingAttrezzaturaMsg('') }}
                              disabled={!!recuperableTesseraEdit}
                              title={recuperableTesseraEdit ? 'Aggiorna o annulla prima i dati della tessera.' : 'Aggiungi attrezzatura'}
                              aria-label='Aggiungi attrezzatura'
                              style={{ width: 38, height: 38, minHeight: 38, boxSizing: 'border-box', padding: 0, borderRadius: 8, border: `2px solid ${recuperableTesseraEdit ? '#cbd5e1' : '#0d3b66'}`, background: '#ffffff', color: recuperableTesseraEdit ? '#9ca3af' : '#0d3b66', cursor: recuperableTesseraEdit ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, whiteSpace: 'nowrap', flex: '0 0 auto' }}
                            >
                              <svg width={22} height={22} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
                                <path d='M21 13.1v5.9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-4'/>
                                <path d='M3 15V5c0-1.1.9-2 2-2h5.9'/>
                                <path d='M16.5 3v9'/>
                                <path d='M12 7.5h9'/>
                              </svg>
                            </button>
                            <button
                              type='button'
                              onClick={removeActiveRecuperableAttrezzatura}
                              disabled={!activeAttrezzaturaRiferimentoId || !!recuperableTesseraEdit}
                              title={recuperableTesseraEdit ? 'Aggiorna o annulla prima i dati della tessera.' : (activeAttrezzaturaRiferimentoId ? 'Rimuovi attrezzatura e relativa nota spese' : 'Nessuna attrezzatura selezionata')}
                              aria-label='Rimuovi attrezzatura e relativa nota spese'
                              style={{ width: 38, height: 38, minHeight: 38, boxSizing: 'border-box', padding: 0, borderRadius: 8, border: `1px solid ${activeAttrezzaturaRiferimentoId && !recuperableTesseraEdit ? '#b42318' : '#cbd5e1'}`, background: '#fff', color: activeAttrezzaturaRiferimentoId && !recuperableTesseraEdit ? '#b42318' : '#9ca3af', cursor: activeAttrezzaturaRiferimentoId && !recuperableTesseraEdit ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
                                <path d='M3 6h18'/>
                                <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
                                <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
                                <path d='M10 11v6'/><path d='M14 11v6'/>
                              </svg>
                            </button>
                            {attrezzatureNuovoPickerOpen && !recuperableTesseraEdit && (
                              <div style={{ position: 'absolute', top: 42, left: 0, zIndex: 20, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', minWidth: 240, overflow: 'hidden' }}>
                                {attrezzatureCatalog.map(c => (
                                  <div
                                    key={c.codice}
                                    onClick={() => { addRecuperableAttrezzatura(c.codice) }}
                                    style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#16375a' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdfa' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                                  >
                                    {c.descrizione}
                                  </div>
                                ))}
                                {attrezzatureCatalog.length === 0 && (
                                  <div style={{ padding: '8px 12px', fontSize: 12, color: '#64748b' }}>Nessuna attrezzatura disponibile a catalogo.</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {pendingAttrezzaturaMsg && !tesseraEditForActive && <div style={{ marginTop: 4, fontSize: 11, color: '#b42318', fontWeight: 700 }}>{pendingAttrezzaturaMsg}</div>}
                      <div style={{ fontSize: 11, color: comboDisabled ? '#64748b' : '#336666', lineHeight: 1.35, marginTop: 4 }}>Ogni attrezzatura recuperabile ha una propria nota spese distinta.</div>
                    </div>

                    {activeAttrezzaturaIsTessera && (
                      <div
                        ref={recuperableTesseraCardRef}
                        style={{
                          padding: '6px 8px 8px',
                          width: noteSpeseRoleReadOnly ? 460 : 414,
                          maxWidth: '100%',
                          height: 94,
                          minHeight: 94,
                          boxSizing: 'border-box',
                          border: '1px solid #aac4e0',
                          borderRadius: 8,
                          background: '#f5f9ff',
                          display: 'flex',
                          alignItems: 'flex-start',
                          position: 'relative'
                        }}
                      >
                        <label style={{ display: 'block', margin: 0, width: 86, flex: '0 0 86px', minWidth: 0 }}>
                          <span style={{ display: 'block', height: 18, lineHeight: '18px', marginBottom: 4, fontSize: 13, fontWeight: 900, color: noteSpeseRoleReadOnly ? '#64748b' : '#0f4f50', whiteSpace: 'nowrap' }}>Matricola</span>
                          <div style={{ height: 38, display: 'flex', alignItems: 'center' }}>
                            <input
                              ref={recuperableTesseraMatricolaInputRef}
                              type='text'
                              inputMode='numeric'
                              value={tesseraEditForActive && recuperableTesseraEdit ? recuperableTesseraEdit.matricola : activeTesseraMatricola}
                              onChange={(e) => {
                                if (!tesseraEditForActive) return
                                setRecuperableTesseraEdit(cur => cur ? { ...cur, matricola: e.target.value.replace(/\D/g, '').slice(0, 5) } : cur)
                                setPendingAttrezzaturaMsg('')
                              }}
                              onKeyDown={(e) => {
                                if (!tesseraEditForActive) return
                                if (e.key === 'Enter') confirmRecuperableTesseraEdit()
                                if (e.key === 'Escape') cancelRecuperableTesseraEdit()
                              }}
                              maxLength={5}
                              placeholder='00000'
                              aria-label='Matricola tessera (5 cifre)'
                              readOnly={!tesseraEditForActive}
                              style={{
                                width: 86,
                                height: 32,
                                boxSizing: 'border-box',
                                padding: '5px 8px',
                                border: `1px solid ${tesseraEditForActive ? '#aac4e0' : '#cbd5e1'}`,
                                borderRadius: 4,
                                background: tesseraEditForActive ? '#fff' : String(formStyle.fieldDisabledBg || '#e7eef7'),
                                color: '#16375a',
                                WebkitTextFillColor: tesseraEditForActive ? undefined : '#16375a',
                                fontSize: 13,
                                fontWeight: String(tesseraEditForActive && recuperableTesseraEdit ? recuperableTesseraEdit.matricola : activeTesseraMatricola).trim() ? 700 : 400,
                                textAlign: 'right',
                                cursor: tesseraEditForActive ? 'text' : 'default'
                              }}
                            />
                          </div>
                        </label>

                        <div style={{ display: 'block', margin: '0 0 0 34px', width: 136, flex: '0 0 136px', minWidth: 0 }}>
                          <span style={{ display: 'block', height: 18, lineHeight: '18px', marginBottom: 4, fontSize: 13, fontWeight: 900, color: noteSpeseRoleReadOnly ? '#64748b' : '#0f4f50', whiteSpace: 'nowrap' }}>Decurtazione cauzione</span>
                          <div style={{ height: 38, display: 'flex', alignItems: 'center' }}>
                            <label style={{ height: 32, display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 13, color: '#16375a', cursor: tesseraEditForActive ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                              <input
                                type='checkbox'
                                checked={tesseraEditForActive && recuperableTesseraEdit ? recuperableTesseraEdit.cauzioneDecurtata : activeTesseraCauzione}
                                disabled={!tesseraEditForActive}
                                onChange={(e) => {
                                  setRecuperableTesseraEdit(cur => cur ? { ...cur, cauzioneDecurtata: e.target.checked } : cur)
                                  setPendingAttrezzaturaMsg('')
                                }}
                                style={{ margin: 0 }}
                              />
                              <span style={{ fontWeight: 700 }}>
                                {(tesseraEditForActive && recuperableTesseraEdit ? recuperableTesseraEdit.cauzioneDecurtata : activeTesseraCauzione) ? `${cauzioneLabel} €` : '0,00 €'}
                              </span>
                            </label>
                          </div>
                        </div>

                        <div style={{ marginLeft: 'auto', marginTop: 22, height: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flex: '0 0 auto' }}>
                          {tesseraEditForActive && recuperableTesseraEdit ? (
                            <>
                              <button type='button' onClick={confirmRecuperableTesseraEdit} style={{ height: 32, padding: '4px 9px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#1F4E79', color: '#fff', cursor: 'pointer' }}>Aggiorna</button>
                              <button type='button' onClick={cancelRecuperableTesseraEdit} style={{ height: 32, padding: '4px 9px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#e0e0e0', color: '#333', cursor: 'pointer' }}>Annulla</button>
                            </>
                          ) : (!noteSpeseRoleReadOnly && (
                            <button
                              type='button'
                              onClick={beginActiveRecuperableTesseraEdit}
                              title='Modifica dati tessera'
                              aria-label='Modifica dati tessera'
                              style={{ width: 38, height: 38, minWidth: 38, minHeight: 38, boxSizing: 'border-box', padding: 0, borderRadius: 8, border: '2px solid #0d3b66', background: '#ffffff', color: '#0d3b66', cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}
                            >
                              <svg width={20} height={20} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
                                <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
                                <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
                              </svg>
                            </button>
                          ))}
                        </div>
                        {tesseraEditForActive && pendingAttrezzaturaMsg && (
                          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 5, minHeight: 14, fontSize: 11, lineHeight: '14px', color: '#b42318', fontWeight: 700, whiteSpace: 'normal' }}>
                            {pendingAttrezzaturaMsg}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                  )
                })()}
                {isReadOnly && (
                  <span style={{
                    alignSelf: 'flex-start',
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#64748b',
                    background: '#e2e8f0',
                    border: '1px solid #cbd5e1',
                    borderRadius: 999,
                    padding: '2px 8px'
                  }}>Sola consultazione</span>
                )}
              </div>
              {activeNotaSpeseIncompleteRowsCount > 0 && (
                <div style={{ marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
                  <div>Nota spese incompleta:</div>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {activeNotaSpeseIncompleteBreakdown.matricola.map((row, idx) => (
                      <li key={`matricola-${idx}`}>{String(row.matricola_snapshot || '').trim() ? `Matricola "${row.matricola_snapshot}" non valida (deve avere 5 cifre)` : 'Manca la matricola'} — {NS_CATEGORY_LABELS[row.categoria_costo]}: "{row.descrizione_snapshot}"</li>
                    ))}
                    {activeNotaSpeseIncompleteBreakdown.quantita.map((row, idx) => (
                      <li key={`quantita-${idx}`}>Manca la quantità (o è pari a zero) — {NS_CATEGORY_LABELS[row.categoria_costo]}: "{row.descrizione_snapshot}"</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 4 }}>Completa i dati oppure elimina le righe non necessarie prima dell’inoltro.</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 10, borderRadius: 8, border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
              Nessuna violazione collegabile alla nota spese. Le note spese sono previste per gli artt. 8, 27, 30 e 39.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 6 }}>
            {([
              [isArt30NotaSpeseCasistica && art30RecuperoMode === 'recuperabile' ? 'DECURTAZIONE CAUZIONE' : 'RISARCIMENTO ATTREZZATURA', activeNotaSpeseSummary.totaleRA],
              ['ATTREZZATURE E TRASPORTI', activeNotaSpeseSummary.totaleAT],
              ['MATERIALI DA COSTRUZIONE', activeNotaSpeseSummary.totalePR],
              ['RISORSE UMANE', activeNotaSpeseSummary.totaleRU],
              ['SEMILAVORATI', activeNotaSpeseSummary.totaleSL],
              ['PRODOTTI FINITI', activeNotaSpeseSummary.totalePF],
              [`SPESE GENERALI (${activeNotaSpeseSummary.percentualeSpeseGenerali.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`, activeNotaSpeseSummary.importoSpeseGenerali],
              ['TOTALE COMPLESSIVO', activeNotaSpeseSummary.totaleComplessivo]
            ] as [string, number][]).map(([label, value], idx) => {
              const isTotal = idx === 7
              return (
                <div key={idx} style={{
                  background: isTotal ? formStyle.cardHeaderBg : '#f5f9ff',
                  border: `1px solid ${isTotal ? '#0d3b66' : '#bfdbfe'}`,
                  borderRadius: formStyle.cardBorderRadius,
                  padding: '9px 11px',
                  minWidth: 0
                }}>
                  <div style={{
                    color: isTotal ? 'rgba(255,255,255,0.86)' : '#6b7280',
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 0.25,
                    marginBottom: 4
                  }}>{label}</div>
                  <div style={{
                    color: isTotal ? formStyle.cardHeaderColor : '#111827',
                    fontSize: isTotal ? 16 : 13,
                    fontWeight: 800,
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap'
                  }}>{nsSafeNum(value, 0).toLocaleString('it-IT', { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
                </div>
              )
            })}
          </div>
          {!activeNotaSpeseCasistica && noteSpeseCasistiche.length > 0 && <span style={{ fontSize: 11, color: '#b45309', fontWeight: 700 }}>Seleziona una nota spese per abilitare lo sfoglia prezzario.</span>}
          {noteSpeseDraftDirty && <span style={{ fontSize: 11, color: '#856404' }}>Le modifiche alla nota spese saranno rese definitive con il salvataggio della pratica.</span>}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        {!(isArt30NotaSpeseCasistica && art30RecuperoMode === 'non_recuperabile') && (
          <>
            <NoteSpeseManager category='AT' title='Attrezzature e trasporti' rows={activeNotaSpeseRows['AT']} onRowsChange={(nextRows) => { if (isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired) return; setNoteSpeseRowsDraft((prev) => mergeCategoryRowsForCasistica(prev, 'AT', activeNotaSpeseCasistica, nextRows, isArt30NotaSpeseCasistica ? activeAttrezzaturaRiferimentoId : undefined)) }} onDirtyChange={(dirty) => { if (isReadOnly || isRitAgrTecLimitedEdit) return; setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, AT: dirty })) }} resetKey={noteSpeseManagerResetKey} readonly={isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired} />
            <NoteSpeseManager category='PR' title='Materiali da costruzione' rows={activeNotaSpeseRows['PR']} onRowsChange={(nextRows) => { if (isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired) return; setNoteSpeseRowsDraft((prev) => mergeCategoryRowsForCasistica(prev, 'PR', activeNotaSpeseCasistica, nextRows, isArt30NotaSpeseCasistica ? activeAttrezzaturaRiferimentoId : undefined)) }} onDirtyChange={(dirty) => { if (isReadOnly || isRitAgrTecLimitedEdit) return; setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, PR: dirty })) }} resetKey={noteSpeseManagerResetKey} readonly={isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired} />
            <NoteSpeseManager category='RU' title='Risorse umane' rows={activeNotaSpeseRows['RU']} onRowsChange={(nextRows) => { if (isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired) return; setNoteSpeseRowsDraft((prev) => mergeCategoryRowsForCasistica(prev, 'RU', activeNotaSpeseCasistica, nextRows, isArt30NotaSpeseCasistica ? activeAttrezzaturaRiferimentoId : undefined)) }} onDirtyChange={(dirty) => { if (isReadOnly || isRitAgrTecLimitedEdit) return; setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, RU: dirty })) }} resetKey={noteSpeseManagerResetKey} readonly={isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired} />
            <NoteSpeseManager category='SL' title='Semilavorati' rows={activeNotaSpeseRows['SL']} onRowsChange={(nextRows) => { if (isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired) return; setNoteSpeseRowsDraft((prev) => mergeCategoryRowsForCasistica(prev, 'SL', activeNotaSpeseCasistica, nextRows, isArt30NotaSpeseCasistica ? activeAttrezzaturaRiferimentoId : undefined)) }} onDirtyChange={(dirty) => { if (isReadOnly || isRitAgrTecLimitedEdit) return; setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, SL: dirty })) }} resetKey={noteSpeseManagerResetKey} readonly={isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired} />
            <NoteSpeseManager category='PF' title='Prodotti finiti' rows={activeNotaSpeseRows['PF']} onRowsChange={(nextRows) => { if (isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired) return; setNoteSpeseRowsDraft((prev) => mergeCategoryRowsForCasistica(prev, 'PF', activeNotaSpeseCasistica, nextRows, isArt30NotaSpeseCasistica ? activeAttrezzaturaRiferimentoId : undefined)) }} onDirtyChange={(dirty) => { if (isReadOnly || isRitAgrTecLimitedEdit) return; setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, PF: dirty })) }} resetKey={noteSpeseManagerResetKey} readonly={isReadOnly || isRitAgrTecLimitedEdit || !!recuperableTesseraEdit || !activeNotaSpeseCasistica || activeAttrezzaturaRiferimentoRequired} />
          </>
        )}
        {isArt30NotaSpeseCasistica && art30RecuperoMode === 'non_recuperabile' && (
          <NoteSpeseManager category='RA' title='Attrezzature' rows={activeNotaSpeseRows['RA']} cauzioneUnitaria={attrezzatureCauzioneUnitaria} matricolaUsageCount={(matricola) => getTesseraMatricolaUsageCount(noteSpeseRowsDraft, matricola)} onRowsChange={(nextRows) => { if (isReadOnly || isRitAgrTecLimitedEdit || !activeNotaSpeseCasistica) return; setNoteSpeseRowsDraft((prev) => mergeCategoryRowsForCasistica(prev, 'RA', activeNotaSpeseCasistica, nextRows)) }} onDirtyChange={(dirty) => { if (isReadOnly || isRitAgrTecLimitedEdit) return; setNoteSpeseFormDirtyByCategory((prev) => ({ ...prev, RA: dirty })) }} resetKey={noteSpeseManagerResetKey} readonly={isReadOnly || isRitAgrTecLimitedEdit || !activeNotaSpeseCasistica} />
        )}
      </div>
    </div>
  )
)}

{/* ALLEGATI */}
{npTab === 'allegati' && (
  mode !== 'edit' || currentOid == null ? (
    renderFullHeightEditCard('ALLEGATI', (
      <div style={{ fontSize: formStyle.labelFontSize, color: formStyle.labelColor, lineHeight: 1.5 }}>
        Sarà possibile aggiungere gli allegati <b>solo dopo il primo salvataggio</b> della pratica.
      </div>
    ))
  ) : (
    <GiiAttachmentViewer
      title='ALLEGATI'
      oidAvailable={mode === 'edit' && currentOid != null}
      items={visibleTechnicalAttachments as any}
      loading={attachmentsLoading}
      busy={attachmentsUploading}
      error={attachmentsError}
      canEdit={!isReadOnly && !isRitAgrTecLimitedEdit}
      uploadInputKey={attachmentInputKey}
      onUpload={(files) => {
        if (isReadOnly || isRitAgrTecLimitedEdit) return
        setAttachmentsError(null)
        setAttachmentFiles(files)
        if (files.length > 0) void uploadCurrentAttachments(files)
      }}
      selectedItemId={previewAttachment?.id ?? null}
      onSelectedItemChange={(item) => {
        setPreviewRotationDeg(0)
        if (!item) { setPreviewAttachment(null); return }
        setPreviewAttachment({ id: Number(item.id), name: item.name, contentType: item.contentType })
      }}
      buildPreviewUrl={buildItAttachmentPreviewUrl as any}
      onOpen={(item) => {
        void openAttachmentInNewTab(item, Number(currentOid), currentLayerUrl).catch((err: any) => {
          setAttachmentsError(err?.message || String(err))
        })
      }}
      onReplace={(item, file) => {
        if (isReadOnly || isRitAgrTecLimitedEdit) return
        setAttachmentConfirm({ type: 'replace', attachment: { id: Number(item.id), name: item.name }, file })
      }}
      onDelete={(item) => {
        if (isReadOnly || isRitAgrTecLimitedEdit) return
        setAttachmentConfirm({ type: 'delete', attachment: { id: Number(item.id), name: item.name } })
      }}
      rotationDeg={previewRotationDeg}
      rotationBusy={attachmentsUploading}
      canConfirmRotation={canRotateAttachments && (((Math.round(previewRotationDeg / 90) * 90) % 360 + 360) % 360) !== 0}
      onRotateLeft={() => setPreviewRotationDeg(v => v - 90)}
      onRotateRight={() => setPreviewRotationDeg(v => v + 90)}
      onConfirmRotation={() => { void savePreviewRotation() }}
      formatBytes={formatBytesLocal}
      labelFontSize={12}
      headerFontSize={formStyle.cardHeaderFontSize}
      headerBg={formStyle.cardHeaderBg}
      headerColor={formStyle.cardHeaderColor}
      headerBorderColor='#c5d9f1'
      borderRadius={formStyle.cardBorderRadius}
      innerHeaderColor={formStyle.hdrColor}
    />
  )
)}

{/* ANTEPRIMA */}
{npTab === 'anteprima' && (
  mode !== 'edit' || currentOid == null ? (
    renderFullHeightEditCard('ANTEPRIMA', (
      <div style={{ fontSize: formStyle.labelFontSize, color: formStyle.labelColor, lineHeight: 1.5 }}>
        Sarà possibile generare l'anteprima del fascicolo <b>solo dopo il primo salvataggio</b> della pratica.
      </div>
    ))
  ) : (
  <div style={{ width: '100%', height: '100%', minHeight: 0, borderRadius: formStyle.cardBorderRadius, overflow: 'hidden' }}>
    <AnteprimaPanel
      data={draft}
      mode={mode}
      nsRows={noteSpeseRowsDraft}
      nsSummary={noteSpeseSummary}
      ds={ds}
      oid={editOid}
      idFieldName={editIdFieldName}
      mapConfig={p.mapConfig}
      mapTarget={p.clickedPointWgs84 || p.existingGeomWgs84 || null}
      notaSpeseConfig={noteSpeseCfg}
      viewerBackgroundColor={String((cfg as any).anteprimaViewerBg || '#282828')}
      pdfHeaderBackgroundColor={String((cfg as any).anteprimaPdfHeaderBg || '#282828')}
      pdfPageAreaBackgroundColor={String((cfg as any).anteprimaPdfAreaBg || '#282828')}
      pdfThumbnailsBackgroundColor={String((cfg as any).anteprimaPdfThumbnailsBg || '#1f1f1f')}
      pdfToolbarBackgroundColor={String((cfg as any).anteprimaPdfToolbarBg || '#3c3c3c')}
      sidebarBackgroundColor={String((cfg as any).anteprimaSidebarBg || '#eef4fb')}
      sidebarBorderColor={String((cfg as any).anteprimaSidebarBorderColor || '#b8c7d9')}
      sidebarBorderWidth={Number((cfg as any).anteprimaSidebarBorderWidth ?? 1)}
    />
  </div>
  )
)}

      </div>
      </fieldset>

      {missingMapPointPopupOpen && createPortal(
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
            style={{ width: 'min(92vw, 520px)', background: '#f8fbff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: popupTitleFontSize, marginBottom: 8, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              Punto in mappa obbligatorio
            </div>
            <div style={{ fontSize: popupBodyFontSize, color: '#374151', lineHeight: 1.6, marginBottom: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 500, padding: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, color: '#1e3a8a' }}>
                Per la violazione selezionata è necessario localizzare il punto nella mappa.
              </div>
              <div>Confermando, verrà aperta la scheda <b>Luoghi e dati</b>.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type='button'
                onClick={() => { setMissingMapPointPopupOpen(false) }}
                style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#d92d20', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                Annulla
              </button>
              <button
                type='button'
                onClick={() => {
                  setMissingMapPointPopupOpen(false)
                  setMsg(null)
                  setIsExternalNavMode(false)
                  try { sessionStorage.setItem('GII_EDIT_TAB', 'dati_tecnici') } catch {}
                  try { sessionStorage.setItem('GII_NAV_SECTION', 'dati-tecnici') } catch {}
                  giiActivateDatiTecniciExternalLayout()
                  try { window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: 'dati-tecnici' } })) } catch {}
                  setNpTab('dati_tecnici')
                  const resetSidebar = () => {
                    const target = giiReadLayoutSidebarDefaultBoundaryX(npTabSyncElRef.current)
                    giiMoveNearestLayoutSidebarToX(npTabSyncElRef.current, target)
                    try { window.dispatchEvent(new Event('resize')) } catch {}
                  }
                  window.setTimeout(resetSidebar, 160)
                  window.setTimeout(resetSidebar, 450)
                  window.setTimeout(resetSidebar, 900)
                }}
                style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#1d4ed8', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>,
        getGlobalOverlayHost() || document.body
      )}

      {notaSpeseLinkedViolationPopup && createPortal(
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
            style={{ width: 'min(92vw, 540px)', background: '#f8fbff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: popupTitleFontSize, marginBottom: 8, color: '#d92d20', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              Nota spese collegata
            </div>
            <div style={{ fontSize: popupBodyFontSize, color: '#374151', lineHeight: 1.6, marginBottom: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 500, padding: 10, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, color: '#7c2d12' }}>
                Per deselezionare <b>Art. {notaSpeseLinkedViolationPopup.art}</b> è necessario eliminare prima le righe della nota spese collegata.
              </div>
              <div>Confermando, verrà aperta la scheda <b>Nota spese</b>.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type='button'
                onClick={() => { setNotaSpeseLinkedViolationPopup(null) }}
                style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#d92d20', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                Annulla
              </button>
              <button
                type='button'
                onClick={() => {
                  const info = notaSpeseLinkedViolationPopup
                  setNotaSpeseLinkedViolationPopup(null)
                  setMsg(null)
                  if (info?.codice) setActiveNotaSpeseCasistica(info.codice)
                  setIsExternalNavMode(false)
                  try { sessionStorage.setItem('GII_EDIT_TAB', 'nota_spese') } catch {}
                  try { sessionStorage.setItem('GII_NAV_SECTION', 'nota-spese') } catch {}
                  try { window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: 'nota-spese' } })) } catch {}
                  setNpTab('nota_spese')
                }}
                style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#1d4ed8', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>,
        getGlobalOverlayHost() || document.body
      )}

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
            style={{ width: 'min(92vw, 520px)', background: '#f8fbff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: popupTitleFontSize, marginBottom: 8, color: '#d92d20', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              Annullare le modifiche?
            </div>
            <div style={{ fontSize: popupBodyFontSize, color: '#374151', lineHeight: 1.6, marginBottom: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 500, padding: 10, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, color: '#7c2d12' }}>
                Tutte le modifiche non salvate andranno perse.
              </div>
              <div>Confermi di voler annullare?</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type='button'
                onClick={() => {
                  setCancelUnsavedPopupOpen(false)
                  performCancel()
                }}
                style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#d92d20', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                Sì, annulla
              </button>
              <button
                type='button'
                onClick={() => { setCancelUnsavedPopupOpen(false) }}
                style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#f8fbff', color: '#111827', cursor: 'pointer', pointerEvents: 'auto' }}
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
            style={{ width: 'min(92vw, 460px)', background: '#f8fbff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: popupTitleFontSize, marginBottom: 8 }}>
              {attachmentConfirm.type === 'delete' ? 'Confermare l’eliminazione?' : 'Confermare la sostituzione?'}
            </div>
            <div style={{ fontSize: popupBodyFontSize, color: '#374151', lineHeight: 1.5, marginBottom: 14 }}>
              {(() => {
                const idx = (attachments || []).findIndex((a: any) => Number(a?.id) === Number(attachmentConfirm.attachment?.id))
                const label = `Allegato ${idx >= 0 ? idx + 1 : Number(attachmentConfirm.attachment?.id) || ''}`.trim()
                const fullLabel = attachmentConfirm.attachment?.name ? `${label} • ${attachmentConfirm.attachment.name}` : label
                return attachmentConfirm.type === 'delete'
                  ? <>L’allegato <b>{fullLabel}</b> verrà eliminato subito.</>
                  : <>L’allegato <b>{fullLabel}</b> verrà sostituito subito con <b>{attachmentConfirm.file?.name || 'il nuovo file selezionato'}</b>.</>
              })()}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type='button' onClick={confirmAttachmentAction} style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#1a7f37', color: '#fff', cursor: 'pointer' }}>Conferma</button>
              <button type='button' onClick={cancelAttachmentAction} style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#d92d20', color: '#fff', cursor: 'pointer' }}>Annulla</button>
            </div>
          </div>
        </div>,
        getGlobalOverlayHost() || document.body
      )}

      {generalErrorPopup && createPortal(
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
            style={{ width: 'min(92vw, 540px)', background: '#f8fbff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: popupTitleFontSize, marginBottom: 8, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              {generalErrorPopup.title}
            </div>
            <div style={{ fontSize: popupBodyFontSize, color: '#374151', lineHeight: 1.6, marginBottom: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 500, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>
                {generalErrorPopup.text}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type='button'
                onClick={() => setGeneralErrorPopup(null)}
                style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#1d4ed8', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                Chiudi
              </button>
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
            style={{ width: 'min(92vw, 520px)', background: '#f8fbff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: popupTitleFontSize, marginBottom: 8, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              {validationPopup.title}
            </div>
            <div style={{ fontSize: popupBodyFontSize, color: '#374151', lineHeight: 1.6, marginBottom: 14, display: 'grid', gap: 10 }}>
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
                style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#dc2626', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
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
            style={{ width: 'min(92vw, 520px)', background: '#f8fbff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: popupTitleFontSize, marginBottom: 8, color: '#1a7f37', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>✓</span>
              Rilevazione inserita correttamente
            </div>
            <div style={{ fontSize: popupBodyFontSize, color: '#374151', lineHeight: 1.6, marginBottom: 14, display: 'grid', gap: 10 }}>
              <div>La rilevazione è stata salvata correttamente nel sistema.</div>
              {createSuccessPraticaCode && (
                <div style={{ fontWeight: 600, color: '#1f2937', padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                  Numero rilevazione: <span style={{ color: '#15803d', fontSize: popupBodyFontSize, fontFamily: 'monospace' }}>{createSuccessPraticaCode}</span>
                </div>
              )}
              <div>Clicca <b>OK</b> per aprire la rilevazione in modalità modifica.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                id={successPopupOkId}
                type='button'
                onClick={() => { setShowCreateSuccessPopup(false); setCreateSuccessPraticaCode(''); navigateToEditAfterCreate() }}
                style={{ ...popupBtnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#1a7f37', color: '#fff', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        getGlobalOverlayHost() || document.body
      )}

      <SpotlightInteractionLockOverlay active={!!recuperableTesseraEdit} targetRef={recuperableTesseraCardRef} />
    </div>
  </FormStyleCtx.Provider>
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
    const mem: any = w.__giiSelection || null
    const sel: any = mem && isGiiPracticePayloadCurrent(mem) ? mem : {}
    if (!Object.keys(sel).length && !isGiiPracticeSelectionContextCurrent()) {
      return { oid: null, layerUrl: '', idFieldName: 'OBJECTID', data: null }
    }
    const rawOid = sel?.oid ?? sessionStorage.getItem('GII_SELECTED_OID')
    const oidNum = rawOid != null && String(rawOid).trim() !== '' ? Number(rawOid) : NaN
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
  opts?: { dispatch?: boolean },
  originStamp?: GiiPracticeContextStamp
) {
  if (originStamp && !isGiiPracticeContextStampCurrent(originStamp)) return
  try {
    const prevRaw: any = (window as any).__giiSelection || null
    const prev: any = prevRaw && isGiiPracticePayloadCurrent(prevRaw) ? prevRaw : {}
    const next: any = stampGiiPracticePayload({
      ...prev,
      oid: sel.oid !== undefined ? sel.oid : prev.oid,
      layerUrl: sel.layerUrl !== undefined ? sel.layerUrl : prev.layerUrl,
      idFieldName: sel.idFieldName !== undefined ? sel.idFieldName : prev.idFieldName,
      ts: Date.now()
    }, originStamp)
    try { delete next.data } catch {}
    writeGiiPracticeSelectionContext()
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

type EditIntentInfo = { oid: number | null, layerUrl: string, idFieldName: string, data: any | null, ts: number, readOnly?: boolean, readOnlyMessage?: string }

function readEditIntent (): EditIntentInfo | null {
  try {
    const raw = sessionStorage.getItem('GII_EDIT_INTENT')
    if (!raw) return null
    const j: any = JSON.parse(raw)
    if (!isGiiPracticePayloadCurrent(j)) {
      clearEditIntent()
      return null
    }
    const oidNum = j?.oid != null && String(j.oid).trim() !== '' ? Number(j.oid) : NaN
    const layerUrl = normalizeFeatureLayerUrl(j?.layerUrl || '')
    const idFieldName = String(j?.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
    const ts = Number(j?.ts || 0)
    const ageMs = Math.abs(Date.now() - (Number.isFinite(ts) ? ts : 0))
    if (!layerUrl || !Number.isFinite(oidNum)) return null
    // evita che un vecchio intento di modifica resti appiccicato quando si entra da Nav > Nuova pratica
    if (!Number.isFinite(ts) || ageMs > 15000) return null
    return {
      oid: Number(oidNum),
      layerUrl,
      idFieldName,
      data: j?.data || null,
      ts: Number.isFinite(ts) ? ts : 0,
      readOnly: j?.readOnly === true,
      readOnlyMessage: String(j?.readOnlyMessage || '')
    }
  } catch {
    return null
  }
}

function clearEditIntent () {
  try { sessionStorage.removeItem('GII_EDIT_INTENT') } catch {}
}

function markSelectionRestoreAfterEdit (
  sel?: { oid?: number | null, layerUrl?: string, idFieldName?: string, data?: any | null },
  originStamp?: GiiPracticeContextStamp
) {
  if (originStamp && !isGiiPracticeContextStampCurrent(originStamp)) return
  try {
    const current = sel || readDynamicSelection()
    const rawOid = current?.oid
    const oidNum = rawOid != null && String(rawOid).trim() !== '' ? Number(rawOid) : NaN
    if (!Number.isFinite(oidNum)) return
    const layerUrl = normalizeFeatureLayerUrl(current?.layerUrl || '')
    const idFieldName = String(current?.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
    sessionStorage.setItem('GII_RESTORE_SELECTION_AFTER_EDIT', JSON.stringify(stampGiiPracticePayload({
      oid: Number(oidNum),
      layerUrl,
      idFieldName,
      ts: Date.now()
    }, originStamp)))
  } catch {}
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

function writeEditIntent (ei: EditIntentInfo | null, originStamp?: GiiPracticeContextStamp) {
  if (originStamp && !isGiiPracticeContextStampCurrent(originStamp)) return
  try {
    if (!ei || ei.oid == null || !ei.layerUrl) {
      clearEditIntent()
      return
    }
    sessionStorage.setItem('GII_EDIT_INTENT', JSON.stringify(stampGiiPracticePayload({ ...ei, ts: Date.now() }, originStamp)))
  } catch {}
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
  const isCreatePage = cfg.enableCreateWithoutSelection === true

  const baseUserContext = useReactiveGiiUserContext(!isCreatePage)
  const createItAssignments = useReactiveCreateItAssignments()
  const createItAssignmentsKey = createItAssignmentsIdentityKey(createItAssignments)
  const [selectedCreateItAssignmentKey, setSelectedCreateItAssignmentKey] = React.useState('')
  const baseProfileRole = normalizeRoleCode(baseUserContext.role)
  const createAsAdmin = isCreatePage && baseProfileRole === 'ADMIN'
  const selectedCreateItAssignment = React.useMemo(() => {
    if (!isCreatePage || createAsAdmin) return null
    const explicit = createItAssignments.find(item => item.key === selectedCreateItAssignmentKey) || null
    if (explicit) return explicit
    return createItAssignments.length === 1 ? createItAssignments[0] : null
  }, [isCreatePage, createAsAdmin, createItAssignmentsKey, selectedCreateItAssignmentKey])
  const currentUserContext = React.useMemo<GiiUserContext>(() => {
    if (!isCreatePage || createAsAdmin || !selectedCreateItAssignment) return baseUserContext
    return {
      ...baseUserContext,
      role: 'IT',
      area: selectedCreateItAssignment.area,
      settore: selectedCreateItAssignment.settore,
      areaRaw: selectedCreateItAssignment.area,
      settoreRaw: selectedCreateItAssignment.settore,
      ufficio: selectedCreateItAssignment.ufficio,
      ufficioLabel: selectedCreateItAssignment.ufficioLabel,
      gruppo: selectedCreateItAssignment.gruppo
    }
  }, [isCreatePage, createAsAdmin, selectedCreateItAssignment?.key, giiUserContextIdentityKey(baseUserContext)])
  const currentUserContextKey = giiUserContextIdentityKey(currentUserContext)
  const createAssignmentMissing = isCreatePage && !createAsAdmin && createItAssignments.length === 0
  const createAssignmentRequired = isCreatePage && !createAsAdmin && createItAssignments.length > 1 && !selectedCreateItAssignment
  const detectedRoleRaw = normalizeRoleCode(currentUserContext.role) || String(currentUserContext.role || '').trim().toUpperCase()
  const detectedRole = detectedRoleRaw && detectedRoleRaw !== 'ADMIN' ? detectedRoleRaw : ''

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
    panelBg: modernColor((cfg as any).maskBg ?? cfg.panelBg, String((defaultConfig as any).maskBg ?? defaultConfig.panelBg), ['#ffffff']),
    panelBorderColor: modernColor((cfg as any).maskBorderColor ?? cfg.panelBorderColor, String((defaultConfig as any).maskBorderColor ?? defaultConfig.panelBorderColor), ['#e5e7eb']),
    panelBorderWidth: Number.isFinite(Number((cfg as any).maskBorderWidth ?? cfg.panelBorderWidth)) ? Number((cfg as any).maskBorderWidth ?? cfg.panelBorderWidth) : ((defaultConfig as any).maskBorderWidth ?? defaultConfig.panelBorderWidth),
    panelBorderRadius: Number.isFinite(Number((cfg as any).maskBorderRadius ?? cfg.panelBorderRadius)) ? Number((cfg as any).maskBorderRadius ?? cfg.panelBorderRadius) : ((defaultConfig as any).maskBorderRadius ?? defaultConfig.panelBorderRadius),
    panelPadding: Number.isFinite(Number((cfg as any).maskInnerPadding ?? cfg.panelPadding)) ? Number((cfg as any).maskInnerPadding ?? cfg.panelPadding) : ((defaultConfig as any).maskInnerPadding ?? defaultConfig.panelPadding),
    dividerColor: modernColor(cfg.dividerColor, String(defaultConfig.dividerColor), ['#e5e7eb']),
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
    formLabelColor: modernColor((cfg as any).formLabelColor, String(defaultConfig.formLabelColor), ['#6b7280']),
    formLabelFontSize: Number.isFinite(Number((cfg as any).formLabelFontSize)) ? Number((cfg as any).formLabelFontSize) : defaultConfig.formLabelFontSize,
    sectionHeaderColor: modernColor((cfg as any).sectionHeaderColor, String(defaultConfig.sectionHeaderColor), ['#1d4ed8']),
    sectionHeaderFontSize: Number.isFinite(Number((cfg as any).sectionHeaderFontSize)) ? Number((cfg as any).sectionHeaderFontSize) : defaultConfig.sectionHeaderFontSize,
    sectionDividerColor: modernColor((cfg as any).sectionDividerColor, String(defaultConfig.sectionDividerColor), ['#bfdbfe']),
    sectionDividerWidth: Number.isFinite(Number((cfg as any).sectionDividerWidth)) ? Number((cfg as any).sectionDividerWidth) : defaultConfig.sectionDividerWidth,
    formFieldFontSize: Number.isFinite(Number((cfg as any).formFieldFontSize)) ? Number((cfg as any).formFieldFontSize) : defaultConfig.formFieldFontSize,
    norma3FontSize: Number.isFinite(Number((cfg as any).norma3FontSize)) ? Number((cfg as any).norma3FontSize) : defaultConfig.norma3FontSize
  }

  const tabFields: TabFields = {
    trasgressore: normalizeFieldList((cfg as any).trasgressoreFields),
    violazione: normalizeFieldList((cfg as any).violazioneFields),
    allegati: normalizeFieldList((cfg as any).allegatiFields),
    iterExtra: normalizeFieldList((cfg as any).iterExtraFields)
  }
  const migratedTabs = migrateTabs(tabFields, cfg.tabs || [])
  const watchFields = [
    'dt_presa_in_carico_DT', 'stato_DT', 'dt_stato_DT', 'esito_DT', 'dt_esito_DT', 'note_DT',
    'determinazione_stato', 'determinazione_numero', 'determinazione_data', 'determinazione_trasmessa_firma_il'
  ]

  const [editIntent, setEditIntent] = React.useState<EditIntentInfo | null>(null)
  const [editDs, setEditDs] = React.useState<any | null>(null)
  const [editRecordData, setEditRecordData] = React.useState<any | null>(null)
  const [selectionIntent, setSelectionIntent] = React.useState<EditIntentInfo | null>(null)
  const [practiceContextRevision, setPracticeContextRevision] = React.useState(0)

  React.useEffect(() => {
    const onPracticeContextReset = () => {
      setPracticeContextRevision((value) => value + 1)
      setEditIntent(null)
      setEditDs(null)
      setEditRecordData(null)
      setSelectionIntent(null)
      try { delete (window as any).__giiEdit } catch { try { ;(window as any).__giiEdit = null } catch {} }
      clearGiiAnteprimaDocumentMemory()
    }
    window.addEventListener('gii-practice-context-reset', onPracticeContextReset)
    return () => window.removeEventListener('gii-practice-context-reset', onPracticeContextReset)
  }, [])

  React.useEffect(() => {
    return () => { clearGiiAnteprimaDocumentMemory() }
  }, [])

  React.useEffect(() => {
    if (isCreatePage) {
      setEditIntent(null)
      setEditDs(null)
      setEditRecordData(null)
      return
    }

    const syncIntent = () => {
      const fromStorage = readEditIntent()
      const fromWindowRaw: any = (window as any).__giiEdit || null
      const fromWindow: any = fromWindowRaw && isGiiPracticePayloadCurrent(fromWindowRaw) ? fromWindowRaw : null
      const fallback = fromWindow && fromWindow.oid != null && fromWindow.layerUrl
        ? {
            oid: Number(fromWindow.oid),
            layerUrl: String(fromWindow.layerUrl),
            idFieldName: String(fromWindow.idFieldName || 'OBJECTID'),
            data: fromWindow.data || null,
            ts: Number(fromWindow.ts || Date.now()),
            readOnly: fromWindow.readOnly === true,
            readOnlyMessage: String(fromWindow.readOnlyMessage || '')
          }
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
    if (!effectiveIntent && !isCreatePage) clearGiiAnteprimaDocumentMemory()
  }, [effectiveIntent, isCreatePage])

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
  }, [effectiveIntent?.oid, effectiveIntent?.layerUrl, effectiveIntent?.idFieldName, effectiveIntent?.ts, isCreatePage])

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
  const editingPreviewMapInfo = React.useMemo(() => giiResolveMapWidgetWebMapInfo(mapWidgetId), [mapWidgetId])
  const [mapView, setMapView] = React.useState<any>(null)
  const [formTab, setFormTab] = React.useState<string>('trasgressore')
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
  const [pageVisible, setPageVisible] = React.useState(false)
  const wasVisibleRef = React.useRef(false)
  React.useEffect(() => {
    const check = () => {
      const el = rootRef.current
      const isVisible = !!(el && el.offsetWidth > 0 && el.offsetHeight > 0)
      setPageVisible(prev => prev === isVisible ? prev : isVisible)
      if (isVisible && !wasVisibleRef.current) {
        setPageVisitCount(c => c + 1)
        // Ogni ingresso in Nuova pratica deve partire con badge vuoti. Le pagine ExB
        // restano montate anche quando sono nascoste, quindi i contatori globali possono
        // altrimenti conservare quelli pubblicati dall'ultima pratica aperta in modifica.
        if (isCreatePage) {
          if (createItAssignments.length > 1) setSelectedCreateItAssignmentKey('')
          const emptyCounts = { violazione: 0, 'nota-spese': 0, nota_spese: 0, allegati: 0 }
          const emptyBadgeDetails = {}
          try { ;(window as any).__giiEditSectionCounts = emptyCounts } catch {}
          try { ;(window as any).__giiEditSectionBadgeDetails = emptyBadgeDetails } catch {}
          try {
            window.dispatchEvent(new CustomEvent('gii:edit-section-counts', {
              detail: { counts: emptyCounts, badgeDetails: emptyBadgeDetails }
            }))
          } catch {}
        }
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
          const currentTab = getStoredValidEditSection() || resetInvalidEditSectionStorage('trasgressore')
          window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: currentTab } }))
        } catch {}
      }
      wasVisibleRef.current = isVisible
    }
    const id = setInterval(check, 300)
    check()
    return () => clearInterval(id)
  }, [isCreatePage, createItAssignmentsKey])
  const [formDirty, setFormDirty] = React.useState(false)
  React.useEffect(() => {
    if (practiceContextRevision <= 0) return
    setClickedPointWgs84(null)
    setExistingGeomWgs84(null)
    setMapClickEnabled(false)
    setFormDirty(false)
    setFormTab('trasgressore')
  }, [practiceContextRevision])
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

  const technicalEditAvailability = React.useMemo<boolean | null>(() => {
    if (inCreateMode) return null
    const ctx = currentUserContext
    const currentRole = normalizeRoleCode(ctx.role)
    if (currentRole !== 'IT' && currentRole !== 'RIT') return null
    const d: any = initialEditData || {}
    const stato = normalizeIntOrNull(pickAttrCI(d, [`stato_${currentRole}`, `STATO_${currentRole}`]))
    const inCharge = stato === STATO_PRESA_IN_CARICO
    const closedOrForwarded = stato != null && stato > STATO_PRESA_IN_CARICO
    let owned = true
    if (currentRole === 'IT') {
      const currentUsername = String(ctx.username || '').trim().toLowerCase()
      const assignedUsername = String(pickAttrCI(d, ['it_assegnato_username']) || '').trim().toLowerCase()
      owned = !!currentUsername && !!assignedUsername && currentUsername === assignedUsername
    }
    return owned && inCharge && !closedOrForwarded
  }, [inCreateMode, initialEditData, currentUserContextKey])

  const technicalReadOnlyReason = React.useMemo<'role' | 'otherUser' | ''>(() => {
    if (inCreateMode) return ''
    const ctx = currentUserContext
    const currentRole = normalizeRoleCode(ctx.role)
    const openedInConsultation = effectiveIntent?.readOnly === true

    if (currentRole && currentRole !== 'IT' && currentRole !== 'RIT' && currentRole !== 'ADMIN') {
      return 'role'
    }

    if (currentRole === 'IT') {
      const d: any = initialEditData || {}
      const currentUsername = String(ctx.username || '').trim().toLowerCase()
      const assignedUsername = String(pickAttrCI(d, ['it_assegnato_username']) || '').trim().toLowerCase()
      const assignedToOtherUser = !!currentUsername && !!assignedUsername && currentUsername !== assignedUsername
      if (openedInConsultation || assignedToOtherUser || technicalEditAvailability === false) return 'otherUser'
    }

    if (currentRole === 'RIT') {
      if (openedInConsultation || technicalEditAvailability === false) return 'otherUser'
    }

    if (!currentRole && openedInConsultation) return 'role'
    return ''
  }, [inCreateMode, effectiveIntent?.readOnly, initialEditData, technicalEditAvailability, currentUserContextKey])

  const readOnlyEditMode = !inCreateMode && (
    technicalReadOnlyReason !== '' ||
    technicalEditAvailability === false ||
    (technicalEditAvailability == null && effectiveIntent?.readOnly === true)
  )
  const readOnlyEditMessage = technicalReadOnlyReason === 'role'
    ? 'Modifica dati non consentita per il tuo ruolo.'
    : (technicalReadOnlyReason === 'otherUser'
      ? 'Modifica dati non abilitata. La pratica risulta in carico presso un altro utente.'
      : String(effectiveIntent?.readOnlyMessage || 'Pratica aperta in consultazione. Le modifiche sono consentite solo nei casi previsti dal ruolo e dallo stato istruttorio.'))

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

  const handleCloseEditPage = React.useCallback(() => {
    if (inCreateMode) return
    const currentSelection = readDynamicSelection()
    const restoreLayerUrl = normalizeFeatureLayerUrl(effectiveIntent?.layerUrl || currentSelection.layerUrl || '')
    const restoreIdFieldName = String(editIdFieldName || currentSelection.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
    markSelectionRestoreAfterEdit({
      oid: editOid,
      layerUrl: restoreLayerUrl,
      idFieldName: restoreIdFieldName,
      data: editRecordData || effectiveIntent?.data || currentSelection.data || null
    })
    clearEditIntent()
    try { delete (window as any).__giiEdit } catch { try { ;(window as any).__giiEdit = null } catch {} }
    setEditIntent(null)
    setEditDs(null)
    setEditRecordData(null)
    setSelectionIntent(null)
    setClickedPointWgs84(null)
    setMapClickEnabled(false)

    const elencoPageId = resolvePageId('page_3')
    if (!elencoPageId) {
      const errText = 'Pagina Elenco pratiche non trovata. Correggere la configurazione: page_3 deve essere la pagina elenco.'
      try { window.alert(errText) } catch { try { console.error(errText) } catch {} }
      return
    }
    try {
      UrlManager.getInstance().changePage(elencoPageId)
    } catch (e: any) {
      const errText = `Errore apertura Elenco pratiche: ${e?.message || String(e)}`
      try { window.alert(errText) } catch { try { console.error(errText) } catch {} }
    }
  }, [inCreateMode, effectiveIntent, editIdFieldName, editOid, editRecordData])

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
          {inCreateMode && createAssignmentMissing ? (
            <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
              <div style={{ width: 'min(92%, 620px)', background: '#f8fbff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, boxShadow: '0 12px 36px rgba(0,0,0,0.12)', padding: 20 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#b42318', marginBottom: 8 }}>Nuova pratica non disponibile</div>
                <div style={{ fontSize: 15, lineHeight: 1.55, color: '#374151' }}>
                  Non risulta alcuna assegnazione attiva come Istruttore tecnico. La nuova pratica può essere inizializzata soltanto nell'ambito di un'assegnazione attiva come Istruttore tecnico.
                </div>
              </div>
            </div>
          ) : inCreateMode && createAssignmentRequired ? (
            <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
              <div style={{ width: 'min(92%, 680px)', background: '#f8fbff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, boxShadow: '0 12px 36px rgba(0,0,0,0.12)', padding: 20 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#0d3b66', marginBottom: 8 }}>Seleziona l'ambito della pratica</div>
                <div style={{ fontSize: 15, lineHeight: 1.55, color: '#374151', marginBottom: 16 }}>
                  Hai più ambiti di appartenenza disponibili. Seleziona quello nel quale deve essere inizializzata la nuova pratica. La scelta definirà il percorso tecnico anche per le successive trasmissioni.
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {createItAssignments.map(item => (
                    <button
                      key={item.key}
                      type='button'
                      onClick={() => setSelectedCreateItAssignmentKey(item.key)}
                      style={{
                        width: '100%', textAlign: 'left', border: '1px solid #b8cbe0', borderRadius: 10,
                        background: '#ffffff', color: '#0d3b66', padding: '12px 14px', cursor: 'pointer',
                        display: 'grid', gap: 4, fontFamily: 'inherit'
                      }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{item.settoreFull || item.settore}</span>
                      <span style={{ fontSize: 14, color: '#374151' }}>
                        Area {item.areaFull || item.area} · Settore {item.settoreFull || item.settore}
                        {item.ufficioLabel ? ` · Ufficio di ${item.ufficioLabel}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : anyDs ? (
            <NuovaPraticaForm
              key={`${inCreateMode ? `create:${selectedCreateItAssignment?.key || (createAsAdmin ? 'ADMIN' : 'single')}` : `edit:${editOid ?? ''}`}|ctx:${practiceContextRevision}`}
              ds={anyDs}
              cfg={cfg}
              showDatiGenerali={showDatiGenerali}
              clickedPointWgs84={clickedPointWgs84}
              existingGeomWgs84={existingGeomWgs84}
              onClearPoint={() => setClickedPointWgs84(null)}
              onGeomSaved={(geom: any) => { setExistingGeomWgs84(geom); setClickedPointWgs84(null) }}
              mapClickEnabled={mapClickEnabled}
              onToggleMapClick={(on: boolean) => setMapClickEnabled(on)}
              mapView={mapView}
              mapConfig={editingPreviewMapInfo}
              mode={inCreateMode ? 'create' : 'edit'}
              initialData={initialEditData}
              editOid={editOid}
              editIdFieldName={editIdFieldName}
              editLayerUrl={!inCreateMode ? ensureLayerIndex(normalizeFeatureLayerUrl(effectiveIntent?.layerUrl || activeGate?.state?.layerUrl || readDynamicSelection().layerUrl || '')) : ''}
              titleText={inCreateMode ? 'Nuova rilevazione' : 'Modifica rilevazione'}
              saveText={'Salva'}
              readOnly={readOnlyEditMode}
              readOnlyMessage={readOnlyEditMessage}
              onDirtyChange={(dirty: boolean) => setFormDirty(dirty)}
              onTabChange={(tab: string) => setFormTab(tab)}
              onCloseEdit={handleCloseEditPage}
              userContext={currentUserContext}
              onSaved={(savedOid: number, savedData?: any, originStamp?: GiiPracticeContextStamp) => {
                if (originStamp && !isGiiPracticeContextStampCurrent(originStamp)) return
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
                try { ;(window as any).__giiEdit = stampGiiPracticePayload(nextIntentObj, originStamp) } catch {}
                writeEditIntent(nextIntentObj, originStamp)
                if (nextData && typeof nextData === 'object') {
                  writeSelectedFeatureCache(nextLayerUrl, savedOid, nextIdFieldName, nextData, 'edit')
                }
                invalidateRuntimeProxyCache(nextLayerUrl)
                writeDynamicSelection({ oid: savedOid, layerUrl: nextLayerUrl, idFieldName: nextIdFieldName, data: nextData }, undefined, originStamp)
                markSelectionRestoreAfterEdit({ oid: savedOid, layerUrl: nextLayerUrl, idFieldName: nextIdFieldName, data: nextData }, originStamp)
                try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: savedOid, layerUrl: nextLayerUrl } })) } catch {}
              }}
            />
          ) : inCreateMode ? (
            <div style={{ padding: 12 }}>Datasource dinamica non pronta: configura il layer schema oppure seleziona una pratica.</div>
          ) : null}
        </div>

      </div>
      <DirtyNavigationLockOverlay active={pageVisible && (((!inCreateMode && !!effectiveIntent) || formDirty))} targetRef={rootRef} />
    </div>
  )
}

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, DataSourceManager } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import { Button } from 'jimu-ui'
import { createPortal } from 'react-dom'
import type { IMConfig, TabConfig } from '../config'
import { defaultConfig } from '../config'

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
}) {
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

function DetailRow (props: { label: string; value: any; labelSize: number; valueSize: number }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '200px 1fr', 
      gap: 12, 
      alignItems: 'baseline' 
    }}>
      <div style={{ fontSize: props.labelSize, color: '#6b7280', textAlign: 'left' }}>
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
  const allow = new Set(fields.map((f: any) => String(f.name)))
  const out: Record<string, any> = {}
  for (const k of Object.keys(attrs)) {
    if (allow.has(k)) out[k] = attrs[k]
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
          <div style={{ fontSize: 12, color: '#6b7280' }}>{alias}</div>
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
          <div style={{ fontSize: 12, color: '#6b7280' }}>{alias}</div>
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
        <div style={{ fontSize: 12, color: '#6b7280' }}>{alias}</div>
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
          <DetailRow label='N.pratica (OID)' value={oid} labelSize={ui.statusFontSize} valueSize={titleFontSize} />
          <DetailRow label={presaField} value={presaVal} labelSize={ui.statusFontSize} valueSize={titleFontSize} />
          <DetailRow label={statoField} value={statoVal} labelSize={ui.statusFontSize} valueSize={titleFontSize} />
          <DetailRow label={esitoField} value={esitoVal} labelSize={ui.statusFontSize} valueSize={titleFontSize} />
          <DetailRow label={statoDAField} value={statoDAVal} labelSize={ui.statusFontSize} valueSize={titleFontSize} />
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
                labelSize={12}
                valueSize={13}
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
  ]
} as const

// campi v_art* associati alle scelte norma3
const NORMA3_TO_VFIELD: Record<string, string> = {
  Art8: 'v_art08', Art12: 'v_art12', Art27: 'v_art27', Art28: 'v_art28',
  Art29: 'v_art29', Art30: 'v_art30', Art31: 'v_art31', Art32: 'v_art32',
  Art33: 'v_art33', Art34: 'v_art34', Art35: 'v_art35', Art36: 'v_art36',
  Art37: 'v_art37', Art39: 'v_art39'
}

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
  return (
    <div style={S.fld}>
      <label style={S.lbl}>{p.label}</label>
      {p.children}
      {p.hint && <div style={S.hint}>{p.hint}</div>}
    </div>
  )
}

function NpSel(p: { value: string; onChange: (v: string) => void; options: readonly {v:string;l:string}[]; disabled?: boolean }) {
  return (
    <select value={p.value} onChange={e => p.onChange(e.target.value)} style={p.disabled ? S.inpDis : S.sel} disabled={p.disabled}>
      <option value=''>— seleziona —</option>
      {p.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}

function NpText(p: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; disabled?: boolean; maxLength?: number }) {
  const st = p.disabled ? S.inpDis : S.inp
  if (p.multiline) return (
    <textarea value={p.value} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder}
      rows={3} style={{ ...st, resize: 'vertical' }} disabled={p.disabled} maxLength={p.maxLength}/>
  )
  return <input type='text' value={p.value} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder} style={st} disabled={p.disabled} maxLength={p.maxLength}/>
}

function NpInt(p: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return <input type='number' value={p.value} onChange={e => p.onChange(e.target.value)} style={p.disabled ? S.inpDis : S.inp} disabled={p.disabled}/>
}

function NpDate(p: { value: string; onChange: (v: string) => void; withTime?: boolean; disabled?: boolean }) {
  return <input type={p.withTime ? 'datetime-local' : 'date'} value={p.value} onChange={e => p.onChange(e.target.value)} style={p.disabled ? S.inpDis : S.inp} disabled={p.disabled}/>
}

type NpDraft = Record<string, string>

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
    const v = rec[k]
    if (v == null) out[k] = ''
    else if (DRAFT_DATE_FIELDS.has(k)) out[k] = toDraftDate(v)
    else out[k] = String(v)
  }
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
  onClearPoint: () => void
  onSaved?: (oid: number, savedData?: any) => void
  mode?: 'create' | 'edit'
  initialData?: any | null
  editOid?: number | null
  editIdFieldName?: string
  editLayerUrl?: string
  titleText?: string
  saveText?: string
  onDirtyChange?: (dirty: boolean) => void
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
  const [createSuccessPraticaCode, setCreateSuccessPraticaCode] = React.useState('')
  const [validationPopup, setValidationPopup] = React.useState<{ title: string; text: string } | null>(null)

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (validationPopup) { setValidationPopup(null); return }
      if (showCreateSuccessPopup) { setShowCreateSuccessPopup(false); setCreateSuccessPraticaCode(''); return }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [validationPopup, showCreateSuccessPopup])
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
  const isDirty = React.useMemo(() => !draftsEqual(draft, baselineDraft) || !!p.clickedPointWgs84 || hasPendingAttachments || hasPendingAttachmentDeletes || hasPendingAttachmentReplacements, [draft, baselineDraft, p.clickedPointWgs84, hasPendingAttachments, hasPendingAttachmentDeletes, hasPendingAttachmentReplacements])
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

  const [npTab, setNpTab] = React.useState<'anagrafica' | 'violazione' | 'allegati'>('anagrafica')

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

  const reqPoint = React.useMemo(() => computeReqPoint({
    norma15_parziale: n3parziale,
    norma15_totale: n3totale,
    norma_violata3: g('norma_violata3')
  }), [n3parziale, n3totale, draft.norma_violata3])

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
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Errore creazione ciclo TI:', e)
      }
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
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Errore aggiornamento ciclo TI:', e)
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

  const handleCancel = () => {
    setDraft({ ...baselineDraft })
    setAttachmentFiles([])
    setAttachmentInputKey(k => k + 1)
    setPendingDeleteAttachmentIds([])
    setPendingReplaceAttachments({})
    setAttachmentConfirm(null)
    setReplaceTargetAttachment(null)
    setReplaceInputKey(k => k + 1)
    setAttachmentsError(null)
    setMsg(null)
    setNpTab('anagrafica')
    p.onClearPoint()
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

    setSaving(true); setMsg(null)
    try {
      const layer = mode === 'edit' ? await resolveLayerForEdit(ds) : await getLayerForCreate()
      if (!layer?.applyEdits) throw new Error('Layer non raggiungibile (applyEdits non disponibile).')

      let geom: any | null = null
      if (p.clickedPointWgs84) geom = p.clickedPointWgs84
      else if (mode === 'create' && reqPoint === 0 && hasOffice) geom = makeWgs84Point(officeLon, officeLat)

      if (mode === 'create' && !geom) {
        if (reqPoint === 1) throw new Error('Localizzazione obbligatoria: fai click in mappa per impostare il punto.')
        throw new Error('Geometria non impostata: configura le coordinate ufficio nel setting oppure fai click in mappa.')
      }

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
        data_rilevazione: mode === 'create' ? (toTs(g('data_rilevazione')) || nowTs) : toTs(g('data_rilevazione')),
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
        sup_dichiarata_art15: showSup15 ? toInt(g('sup_dichiarata_art15')) : null,
        sup_irrigata_art15: showSup15 ? toInt(g('sup_irrigata_art15')) : null,
        norma16_17: norma1516 || null,
        art17_tipo: (norma1516 === 'Art17' ? art17tipo : null) || null,
        norma_violata2: normaV2 || null,
        sup_dichiarata_art17_1: norma1516 === 'Art17' && art17tipo === 'Art17.1' ? toInt(g('sup_dichiarata_art17_1')) : null,
        sup_dichiarata_art16: norma1516 === 'Art16' ? toInt(g('sup_dichiarata_art16')) : null,
        sup_dichiarata_art17_2: norma1516 === 'Art17' && art17tipo === 'Art17.2' ? toInt(g('sup_dichiarata_art17_2')) : null,
        sup_irrigata_art16_17_2: (norma1516 === 'Art16' || art17tipo === 'Art17.2') ? toInt(g('sup_irrigata_art16_17_2')) : null,
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
        req_point: reqPoint
      }

      const cleanAttrs = filterAttrsForLayer(attrs, layer)

      if (mode === 'edit') {
        if (editOid == null) throw new Error('Nessuna pratica selezionata per la modifica.')
        const prevAttrs = filterAttrsForLayer(p.initialData || {}, layer)
        const changedFields = Object.keys(cleanAttrs).filter((k) => normalizeLogValue(prevAttrs?.[k]) !== normalizeLogValue(cleanAttrs[k]))
        const hasAttachmentOps = attachmentFiles.length > 0 || pendingDeleteAttachmentIds.length > 0 || Object.keys(pendingReplaceAttachments).length > 0
        if (changedFields.length === 0 && !geom && !hasAttachmentOps) {
          setSaving(false)
          setMsg({ kind: 'ok', text: 'Nessuna modifica da salvare.' })
          return
        }
        if (changedFields.length === 0 && !geom && hasAttachmentOps) {
          await processAttachmentChanges(editOid, String(layer?.url || currentLayerUrl || ''))
          setBaselineDraft(draftFromRecord(p.initialData || {}))
          setDraft(draftFromRecord(p.initialData || {}))
          setMsg({ kind: 'ok', text: 'Allegati salvati.' })
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
        p.onClearPoint()
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
      const newPraticaCode = buildPraticaCodeFromData({ origine_pratica: 2 }, newOid)

      // In create mode NON aggiornare la datasource schema/base e NON provare a selezionare il nuovo OID:
      // queste due operazioni possono riattivare il banner credenziali quando la pagina usa solo lo schema.
      setMsg({ kind: 'ok', text: 'Pratica creata.' })
      setSaving(false)
      setTimeout(() => {
        createStartedAtRef.current = Date.now()
        setDraft({})
        setBaselineDraft({})
        setMsg(null)
        setNpTab('anagrafica')
        p.onClearPoint()
        setCreateSuccessPraticaCode(newPraticaCode)
        setShowCreateSuccessPopup(true)
        p.onSaved?.(newOid)
      }, 600)
    } catch (e: any) {
      setSaving(false)
      setMsg({ kind: 'err', text: `Errore: ${e?.message || String(e)}` })
    }
  }


  
  const showDatiGen = p.showDatiGenerali

  const NP_TABS = [
    { id: 'anagrafica', label: 'Anagrafica' },
    { id: 'violazione', label: 'Violazione' },
    { id: 'allegati', label: 'Allegati' }
  ] as const

  const btnBase: React.CSSProperties = {
    padding: '7px 16px', borderRadius: 8, border: 'none',
    fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer'
  }

  const tabBtn = (id: string, label: string) => (
    <button key={id} type='button' onClick={() => setNpTab(id as any)} style={{
      padding: '6px 14px', borderRadius: 10, border: `1px solid ${npTab === id ? '#2f6fed' : 'rgba(0,0,0,0.12)'}`,
      background: npTab === id ? '#eaf2ff' : 'rgba(0,0,0,0.02)',
      color: npTab === id ? '#1d4ed8' : '#374151',
      fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
    }}>{label}</button>
  )

  const geomStatus = React.useMemo(() => {
    if (p.clickedPointWgs84) return { kind: 'ok' as const, text: 'Punto impostato da click in mappa.' }
    if (reqPoint === 0 && hasOffice) return { kind: 'info' as const, text: 'Nessun click: userò il punto ufficio (default).' }
    if (reqPoint === 0 && !hasOffice) return { kind: 'err' as const, text: 'Nessun click e punto ufficio non configurato: fai click in mappa o imposta Lon/Lat ufficio nel setting.' }
    return { kind: 'err' as const, text: 'Localizzazione obbligatoria: fai click in mappa.' }
  }, [p.clickedPointWgs84, reqPoint, hasOffice])

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

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

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

      {/* ── Tab bar ── */}
      <div style={{ flex: '0 0 auto', display: 'flex', gap: 6, padding: '8px 0', flexWrap: 'wrap',
        borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        {NP_TABS.map(t => tabBtn(t.id, t.label))}
      </div>

      {/* ── Contenuto tab (scrollabile) ── */}
      <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '12px 2px' }}>

        {/* ANAGRAFICA (Dati generali + Trasgressore) */}
        {npTab === 'anagrafica' && (
          <div>
            {showDatiGen && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Dati generali (automatici)</span>
                </div>
                <div style={S.row3}>
                  <NpField label='Tecnico istruttore'>
                    <NpText value={g('tecnico_rilevatore')} onChange={() => {}} disabled/>
                  </NpField>
                  <NpField label='Ufficio di Zona'>
                    <NpText value={g('ufficio_zona')} onChange={() => {}} disabled/>
                  </NpField>
                  <NpField label='Data rilevazione'>
                    <NpText value={g('data_rilevazione')} onChange={() => {}} disabled/>
                  </NpField>
                </div>
              </div>
            )}

            <div style={{ ...S.hdr, marginTop: 6 }}>Trasgressore</div>

            <div style={{ ...S.row2, marginBottom: 12 }}>
              <NpField label='Tipologia soggetto'>
                <NpSel value={tipoSogg} onChange={v => set('tipologia_soggetto', v)} options={CHOICES.tipo_soggetto} disabled={saving}/>
              </NpField>
              <div/>
            </div>

            {tipoSogg === 'PF' && (
              <div style={S.row3}>
                <NpField label='Nome'><NpText value={g('nome')} onChange={v => set('nome', v)} disabled={saving}/></NpField>
                <NpField label='Cognome'><NpText value={g('cognome')} onChange={v => set('cognome', v)} disabled={saving}/></NpField>
                <NpField label='Codice fiscale' hint='Massimo 16 caratteri'>
                  <NpText value={g('codice_fiscale')} onChange={v => set('codice_fiscale', v)} disabled={saving} maxLength={16}/>
                </NpField>
              </div>
            )}
            {tipoSogg === 'PG' && (
              <div style={S.row2}>
                <NpField label='Ragione sociale'><NpText value={g('ragione_sociale')} onChange={v => set('ragione_sociale', v)} disabled={saving}/></NpField>
                <NpField label='P. IVA' hint='Massimo 11 caratteri'>
                  <NpText value={g('piva')} onChange={v => set('piva', v)} disabled={saving} maxLength={11}/>
                </NpField>
              </div>
            )}

            <div style={S.row3}>
              <NpField label='Via'><NpText value={g('via')} onChange={v => set('via', v)} disabled={saving}/></NpField>
              <NpField label='N. civico'><NpText value={g('civico')} onChange={v => set('civico', v)} disabled={saving}/></NpField>
              <NpField label='Città'><NpText value={g('citta')} onChange={v => set('citta', v)} disabled={saving}/></NpField>
            </div>
            <div style={S.row3}>
              <NpField label='CAP'><NpText value={g('cap')} onChange={v => set('cap', v)} disabled={saving}/></NpField>
              <NpField label='Telefono'><NpText value={g('telefono')} onChange={v => set('telefono', v)} disabled={saving}/></NpField>
              <NpField label='Cellulare'><NpText value={g('cellulare')} onChange={v => set('cellulare', v)} disabled={saving}/></NpField>
            </div>
            <div style={S.row2}>
              <NpField label='E-mail'><NpText value={g('email')} onChange={v => set('email', v)} disabled={saving}/></NpField>
              <NpField label='PEC'><NpText value={g('pec')} onChange={v => set('pec', v)} disabled={saving}/></NpField>
            </div>
          </div>
        )}

        {/* VIOLAZIONE (include descrizione/localizzazione/fine) */}
        {npTab === 'violazione' && (
          <div>
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(0,0,0,0.02)', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#374151', marginBottom: 6 }}>
                Localizzazione (req_point = {reqPoint})
              </div>
              <div style={{ fontSize: 12, color: geomStatus.kind === 'ok' ? '#1a7f37' : (geomStatus.kind === 'err' ? '#b42318' : '#6b7280') }}>
                {geomStatus.text}
              </div>
              {p.clickedPointWgs84 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>
                    Lon: {Number(p.clickedPointWgs84.x).toFixed(6)} — Lat: {Number(p.clickedPointWgs84.y).toFixed(6)}
                  </span>
                  <button type='button' onClick={p.onClearPoint} style={{
                    padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.14)', background: '#fff',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer'
                  }}>Rimuovi punto</button>
                </div>
              )}
            </div>

            <div style={S.hdr}>Art. 15 — Prelievo abusivo</div>
            <div style={S.row2}>
              <NpField label='Tipo di abuso'>
                <NpSel value={tipoAbuso} onChange={v => { set('tipo_abuso', v); set('norma15_parziale', ''); set('norma15_totale', '') }}
                  options={CHOICES.tipo_abuso} disabled={saving}/>
              </NpField>
              {tipoAbuso === 'parziale' && (
                <NpField label='Seleziona violazione'>
                  <NpSel value={n3parziale} onChange={v => set('norma15_parziale', v)} options={CHOICES.art15_parziale} disabled={saving}/>
                </NpField>
              )}
              {tipoAbuso === 'totale' && (
                <NpField label='Seleziona violazione'>
                  <NpSel value={n3totale} onChange={v => set('norma15_totale', v)} options={CHOICES.art15_totale} disabled={saving}/>
                </NpField>
              )}
            </div>
            {showSup15 && (
              <div style={S.row2}>
                <NpField label='Superficie dichiarata (ha)'><NpInt value={g('sup_dichiarata_art15')} onChange={v => set('sup_dichiarata_art15', v)} disabled={saving}/></NpField>
                <NpField label='Superficie irrigata (ha)'><NpInt value={g('sup_irrigata_art15')} onChange={v => set('sup_irrigata_art15', v)} disabled={saving}/></NpField>
              </div>
            )}

            <div style={S.hdr}>Artt. 16 e 17 — Inosservanza termini</div>
            <NpField label='Tipo di inosservanza'>
              <NpSel value={norma1516} onChange={v => { set('norma16_17', v); set('art17_tipo', '') }} options={CHOICES.art16_17} disabled={saving}/>
            </NpField>
            {norma1516 === 'Art17' && (
              <NpField label='Seleziona violazione Art. 17'>
                <NpSel value={art17tipo} onChange={v => set('art17_tipo', v)} options={CHOICES.art17_tipo} disabled={saving}/>
              </NpField>
            )}
            {norma1516 === 'Art16' && (
              <div style={S.row2}>
                <NpField label='Superficie dichiarata (ha)'><NpInt value={g('sup_dichiarata_art16')} onChange={v => set('sup_dichiarata_art16', v)} disabled={saving}/></NpField>
                <NpField label='Superficie irrigata (ha)'><NpInt value={g('sup_irrigata_art16_17_2')} onChange={v => set('sup_irrigata_art16_17_2', v)} disabled={saving}/></NpField>
              </div>
            )}
            {norma1516 === 'Art17' && art17tipo === 'Art17.1' && (
              <div style={S.row2}>
                <NpField label='Superficie dichiarata (ha)'><NpInt value={g('sup_dichiarata_art17_1')} onChange={v => set('sup_dichiarata_art17_1', v)} disabled={saving}/></NpField>
                <NpField label='Superficie variata (ha)'><NpInt value={g('sup_irrigata_art17_1')} onChange={v => set('sup_irrigata_art17_1', v)} disabled={saving}/></NpField>
              </div>
            )}
            {norma1516 === 'Art17' && art17tipo === 'Art17.2' && (
              <div style={S.row2}>
                <NpField label='Superficie dichiarata (ha)'><NpInt value={g('sup_dichiarata_art17_2')} onChange={v => set('sup_dichiarata_art17_2', v)} disabled={saving}/></NpField>
                <NpField label='Superficie irrigata (ha)'><NpInt value={g('sup_irrigata_art16_17_2')} onChange={v => set('sup_irrigata_art16_17_2', v)} disabled={saving}/></NpField>
              </div>
            )}

            <div style={S.hdr}>Altre violazioni</div>
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

            <div style={S.hdr}>Descrizione</div>
            <NpField label='Descrizione dettagliata della violazione'>
              <NpText value={g('descrizione_fatti')} onChange={v => set('descrizione_fatti', v)} multiline disabled={saving}/>
            </NpField>
            <NpField label='Circostanze rilevanti'>
              <NpText value={g('circostanze')} onChange={v => set('circostanze', v)} multiline disabled={saving}/>
            </NpField>
            <NpField label='Il trasgressore era presente?'>
              <NpSel value={g('presenza_trasgressore')} onChange={v => set('presenza_trasgressore', v)} options={CHOICES.presenza} disabled={saving}/>
            </NpField>

            <div style={S.hdr}>Descrizione del luogo</div>
            <NpField label='Descrizione del luogo'>
              <NpText value={g('descrizione_luogo')} onChange={v => set('descrizione_luogo', v)} multiline disabled={saving}/>
            </NpField>

            <div style={S.hdr}>Fine compilazione</div>
            <NpField label='Data e ora di compilazione'>
              <NpDate value={g('data_firma')} onChange={v => set('data_firma', v)} withTime disabled={saving}/>
            </NpField>
          </div>
        )}

        {/* ALLEGATI */}
        {npTab === 'allegati' && (
          mode !== 'edit' || currentOid == null ? (
            <div style={{ padding: 12, borderRadius: 10, border: '1px dashed rgba(0,0,0,0.18)', background: 'rgba(0,0,0,0.01)' }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Allegati</div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                Gli allegati si gestiscono <b>dopo il salvataggio</b> della pratica (serve l&apos;OBJECTID).
                Dopo aver creato la pratica, comparirà nell&apos;Elenco: selezionala e usa la tab <b>Allegati</b> in modalità modifica.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
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
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}>
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
          )
        )}

      </div>

      {attachmentConfirm && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <div
            role='dialog'
            aria-modal='true'
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
        </div>
      )}

      {validationPopup && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
          onClick={() => setValidationPopup(null)}
        >
          <div
            role='dialog'
            aria-modal='true'
            style={{ width: 'min(92vw, 500px)', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              {validationPopup.title}
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 14 }}>
              {validationPopup.text}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type='button'
                onClick={() => setValidationPopup(null)}
                style={{ ...btnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#d92d20', color: '#fff', cursor: 'pointer' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateSuccessPopup && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
          onClick={() => { setShowCreateSuccessPopup(false); setCreateSuccessPraticaCode('') }}
        >
          <div
            role='dialog'
            aria-modal='true'
            style={{ width: 'min(92vw, 500px)', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, position: 'relative', zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation() }}
            onMouseDown={(e) => { e.stopPropagation() }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              Rapporto inserito correttamente
            </div>
            {createSuccessPraticaCode && (
              <div style={{ fontSize: 14, color: '#111827', fontWeight: 700, marginBottom: 10 }}>
                Numero pratica assegnato: <span style={{ color: '#0b5fff' }}>{createSuccessPraticaCode}</span>
              </div>
            )}
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 14 }}>
              Il rapporto è stato salvato correttamente nel sistema.<br />
              La maschera è tornata vuota perché è pronta per un nuovo inserimento.<br />
              Per vedere il rapporto appena inserito nell’elenco, è necessario fare clic su <b>Aggiorna elenco</b>.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type='button'
                onClick={() => { setShowCreateSuccessPopup(false); setCreateSuccessPraticaCode('') }}
                style={{ ...btnBase, border: '1px solid rgba(0,0,0,0.18)', background: '#1a7f37', color: '#fff', cursor: 'pointer' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
    async getLayer () { return null },
    async getJSAPILayer () { return null },
    async getJsApiLayer () { return null },
    getDataSourceJson () { return { url } },
    dataSourceJson: { url },
    getLabel () { return label },
    getIdField () { return idFieldName },
    getSchema () { return { idField: idFieldName, fields: schemaFields } },
    async query (_q: any) { return { records: [] } },
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
    btnPaddingY: Number.isFinite(Number(cfg.btnPaddingY)) ? Number(cfg.btnPaddingY) : defaultConfig.btnPaddingY ?? 8
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
  const [jimuMapView, setJimuMapView] = React.useState<JimuMapView | null>(null)
  const [clickedPointWgs84, setClickedPointWgs84] = React.useState<any | null>(null)
  React.useEffect(() => {
    const view: any = (jimuMapView as any)?.view
    if (!view || typeof view.on !== 'function') return
    const h = view.on('click', (e: any) => {
      ;(async () => {
        const pt = await toWgs84Point(e?.mapPoint)
        if (pt) setClickedPointWgs84(pt)
      })().catch(() => {})
    })
    return () => { try { h?.remove?.() } catch {} }
  }, [jimuMapView])

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [uiLocked, setUiLocked] = React.useState(false)
  const [lockMaskRects, setLockMaskRects] = React.useState<Array<React.CSSProperties>>([])
  const [createDs, setCreateDs] = React.useState<any | null>(null)
  React.useEffect(() => {
    const schemaUrl = String(cfg.schemaLayerUrl || '').trim() || String(cfg.motherLayerUrl || '').trim()
    const schemaLabel = String(cfg.schemaLayerLabel || 'GII schema locale')
    const schemaFields = Array.isArray(cfg.schemaFields) ? cfg.schemaFields : []
    const ds = buildSchemaOnlyDsProxy({ url: schemaUrl, label: schemaLabel, schemaFields })
    setCreateDs(ds)
  }, [cfg.schemaLayerUrl, cfg.schemaLayerLabel, cfg.motherLayerUrl, JSON.stringify(cfg.schemaFields || [])])

  React.useEffect(() => {
    if (!uiLocked) {
      setLockMaskRects([])
      return
    }
    const root = rootRef.current
    const mapHost = findMapHostElement(mapWidgetId) || (((jimuMapView as any)?.view?.container as HTMLElement | null)?.closest?.('.jimu-widget-map, .jimu-widget.jimu-widget-map, [data-widgetid], [widgetid]') as HTMLElement | null) || ((jimuMapView as any)?.view?.container as HTMLElement | null) || null
    const prevMapPos = mapHost?.style.position ?? ''
    const prevMapZ = mapHost?.style.zIndex ?? ''
    if (mapHost) {
      if (!mapHost.style.position) mapHost.style.position = 'relative'
      mapHost.style.zIndex = '1002'
    }

    const updateMasks = () => {
      const vw = window.innerWidth || document.documentElement.clientWidth || 0
      const vh = window.innerHeight || document.documentElement.clientHeight || 0
      const rects: Array<{ left: number, top: number, right: number, bottom: number }> = []
      try {
        const r = root?.getBoundingClientRect?.()
        if (r && r.width > 0 && r.height > 0) rects.push({ left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(vw, r.right), bottom: Math.min(vh, r.bottom) })
      } catch {}
      try {
        const m = mapHost?.getBoundingClientRect?.()
        if (m && m.width > 0 && m.height > 0) rects.push({ left: Math.max(0, m.left), top: Math.max(0, m.top), right: Math.min(vw, m.right), bottom: Math.min(vh, m.bottom) })
      } catch {}

      if (!rects.length) {
        setLockMaskRects([{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', pointerEvents: 'none', zIndex: 1000 }])
        return
      }

      const left = Math.min(...rects.map(r => r.left))
      const top = Math.min(...rects.map(r => r.top))
      const right = Math.max(...rects.map(r => r.right))
      const bottom = Math.max(...rects.map(r => r.bottom))

      const masks: Array<React.CSSProperties> = []
      if (top > 0) masks.push({ position: 'fixed', left: 0, top: 0, width: '100vw', height: top, background: 'rgba(0,0,0,0.42)', pointerEvents: 'none', zIndex: 1000 })
      if (left > 0) masks.push({ position: 'fixed', left: 0, top, width: left, height: Math.max(0, bottom - top), background: 'rgba(0,0,0,0.42)', pointerEvents: 'none', zIndex: 1000 })
      if (right < vw) masks.push({ position: 'fixed', left: right, top, width: Math.max(0, vw - right), height: Math.max(0, bottom - top), background: 'rgba(0,0,0,0.42)', pointerEvents: 'none', zIndex: 1000 })
      if (bottom < vh) masks.push({ position: 'fixed', left: 0, top: bottom, width: '100vw', height: Math.max(0, vh - bottom), background: 'rgba(0,0,0,0.42)', pointerEvents: 'none', zIndex: 1000 })
      setLockMaskRects(masks)
    }

    const isAllowed = (target: EventTarget | null) => {
      const el = target as Node | null
      if (!el) return false
      if (root?.contains(el)) return true
      if (mapHost?.contains(el)) return true
      return false
    }
    const stopIfOutside = (ev: Event) => {
      if (isAllowed(ev.target)) return
      ev.preventDefault()
      ev.stopPropagation()
      const anyEv: any = ev
      try { anyEv.stopImmediatePropagation?.() } catch {}
    }
    const opts: AddEventListenerOptions = { capture: true }
    updateMasks()
    window.addEventListener('resize', updateMasks)
    window.addEventListener('scroll', updateMasks, true)
    document.addEventListener('pointerdown', stopIfOutside, opts)
    document.addEventListener('mousedown', stopIfOutside, opts)
    document.addEventListener('click', stopIfOutside, opts)
    document.addEventListener('touchstart', stopIfOutside, opts)
    document.addEventListener('focusin', stopIfOutside, opts)
    return () => {
      window.removeEventListener('resize', updateMasks)
      window.removeEventListener('scroll', updateMasks, true)
      document.removeEventListener('pointerdown', stopIfOutside, opts)
      document.removeEventListener('mousedown', stopIfOutside, opts)
      document.removeEventListener('click', stopIfOutside, opts)
      document.removeEventListener('touchstart', stopIfOutside, opts)
      document.removeEventListener('focusin', stopIfOutside, opts)
      setLockMaskRects([])
      if (mapHost) {
        mapHost.style.position = prevMapPos
        mapHost.style.zIndex = prevMapZ
      }
    }
  }, [uiLocked, mapWidgetId])

  const editSelectionMatchesIntent = !!effectiveIntent && !!activeGate?.state && Number(activeGate.state.oid) === Number(effectiveIntent.oid) && String((activeGate.state.ds as any)?.getDataSourceJson?.()?.url || (activeGate.state.ds as any)?.dataSourceJson?.url || (activeGate.state.ds as any)?.layer?.url || '').trim() === String(effectiveIntent.layerUrl || '').trim()
  const inCreateMode = isCreatePage
  const currentEditDs = !inCreateMode ? ((editSelectionMatchesIntent ? activeGate?.state?.ds : null) || intentEditDs || editDs || null) : null
  const anyDs = inCreateMode ? createDs : currentEditDs
  const initialEditData = !inCreateMode ? (editRecordData || effectiveIntent?.data || activeGate?.state?.data || null) : null
  const editOid = !inCreateMode && effectiveIntent ? Number(effectiveIntent.oid) : null
  const editIdFieldName = !inCreateMode ? String(effectiveIntent?.idFieldName || activeGate?.state?.idFieldName || currentEditDs?.getIdField?.() || 'OBJECTID') : undefined

  return (
    <div ref={rootRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', padding: Number.isFinite(Number((cfg as any).maskOuterOffset ?? 0)) ? Number((cfg as any).maskOuterOffset) : 0, position: 'relative', zIndex: uiLocked ? 1001 : 'auto' }}>
      {mapWidgetId && (
        <div style={{ display: 'none' }}>
          <JimuMapViewComponent
            useMapWidgetId={mapWidgetId}
            onActiveViewChange={(jmv: JimuMapView) => { setJimuMapView(jmv) }}
          />
        </div>
      )}

      {anyDs ? (
        <NuovaPraticaForm
          ds={anyDs}
          cfg={cfg}
          showDatiGenerali={showDatiGenerali}
          clickedPointWgs84={clickedPointWgs84}
          onClearPoint={() => setClickedPointWgs84(null)}
          mode={inCreateMode ? 'create' : 'edit'}
          initialData={initialEditData}
          editOid={editOid}
          editIdFieldName={editIdFieldName}
          editLayerUrl={!inCreateMode ? ensureLayerIndex(normalizeFeatureLayerUrl(effectiveIntent?.layerUrl || activeGate?.state?.layerUrl || readDynamicSelection().layerUrl || '')) : ''}
          titleText={inCreateMode ? 'Nuovo rapporto' : 'Modifica rapporto'}
          saveText={'Salva'}
          onDirtyChange={setUiLocked}
          onSaved={(savedOid: number, savedData?: any) => {
            if (inCreateMode) {
              clearEditIntent()
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
      {uiLocked && typeof document !== 'undefined' && createPortal(
        <>
          {lockMaskRects.map((styleObj, idx) => <div key={idx} aria-hidden='true' style={styleObj} />)}
        </>,
        document.body
      )}
    </div>
  )
}

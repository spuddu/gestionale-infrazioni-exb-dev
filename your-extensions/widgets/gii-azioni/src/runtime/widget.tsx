/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, DataSourceManager, UrlManager, getAppStore } from 'jimu-core'
import { Button } from 'jimu-ui'
import { createPortal } from 'react-dom'
import { computeSanzioneAutomatica } from '../../../_shared/gii-anteprime/sanzione-automatica'
import { buildVerbalePdfBlob } from '../../../_shared/gii-anteprime/documenti-amministrativi/proposta-contestazione/proposta-contestazione-data-map'
import { replacePropostaContestazionePdfAttachment } from '../../../_shared/gii-anteprime/documenti-amministrativi/proposta-contestazione/proposta-contestazione-attachment-store'
import { deleteBozzaDeterminazionePdfAttachments } from '../../../_shared/gii-anteprime/documenti-amministrativi/bozza-determinazione/bozza-determinazione-attachment-store'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'
import { attrezzaturaInstanceTipoCodePdf, loadAttrezzatureCatalogPdf } from '../../../_shared/gii-anteprime/documenti-tecnici/rapporto/rapporto-nota-spese-summary'
import { parseNorma3Codes } from '../../../_shared/gii-anteprime/req-point'
import { ensureAttivitaCorrentiJsonOnlyQueryFormat } from '../../../_shared/gii-alerts/attivita-correnti-query-format-fix'
import { getTiAmmAssignment, hasTiAmmAssignment, isPracticeAssignedToCurrentTiAmm } from '../../../_shared/gii-access/ti-amm-assignment'
import { clearGiiPracticeSelectionContext, getGiiPracticeContextStamp, isGiiPracticeContextStampCurrent, isGiiPracticePayloadCurrent, isGiiPracticeSelectionContextCurrent, stampGiiPracticePayload, type GiiPracticeContextStamp } from '../../../_shared/gii-selection/practice-context'


const GII_LOG_EVENTI_CICLI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'
const GII_ATTIVITA_CORRENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_ATTIVITA_CORRENTI/FeatureServer/0'

// ── Cache GII_utenti per risolvere utente_destinatario ──────────────────────
type UtenteCached = {
  full_name: string
  email?: string
  ruolo: number | null
  area: number | null
  settore: number | null
  ruoloCod: string
  areaCod: string
  settoreCod: string
}
let _utentiCache: Map<string, UtenteCached> | null = null
let _utentiLoading = false
let _utentiCachePromise: Promise<Map<string, UtenteCached> | null> | null = null

const RUOLO_NUM: Record<string, number> = { TR:1, TI:2, RZ:3, RI:4, DT:5, DA:6, ADMIN:7 }
const AREA_NUM: Record<string, number> = { AMM:1, AGR:2, TEC:3 }
const SETTORE_NUM: Record<string, number> = { CR:1, GI:2, D1:3, D2:4, D3:5, D4:6, D5:7, D6:8, DS:9 }
const RUOLO_COD_FROM_NUM: Record<number, string> = { 1:'TR', 2:'TI', 3:'RZ', 4:'RI', 5:'DT', 6:'DA', 7:'ADMIN' }
const AREA_COD_FROM_NUM: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }
const SETTORE_COD_FROM_NUM: Record<number, string> = { 1:'CR', 2:'GI', 3:'D1', 4:'D2', 5:'D3', 6:'D4', 7:'D5', 8:'D6', 9:'DS' }

function normalizeRuoloCod (v: any): string {
  const s = String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (!s) return ''
  const n = Number(s)
  if (Number.isFinite(n) && RUOLO_COD_FROM_NUM[n]) return RUOLO_COD_FROM_NUM[n]
  if (s === 'RI_AMM') return 'RI'
  if (s === 'TI_AMM') return 'TI'
  return RUOLO_NUM[s] != null ? s : s
}

function normalizeAreaCod (v: any): string {
  const s = String(v ?? '').trim().toUpperCase()
  if (!s) return ''
  const n = Number(s)
  if (Number.isFinite(n) && AREA_COD_FROM_NUM[n]) return AREA_COD_FROM_NUM[n]
  if (s === 'AGRARIA' || s === 'AGRICOLA' || s === 'AGRICOLTURA') return 'AGR'
  if (s === 'TECNICA' || s === 'TECNICO') return 'TEC'
  if (s === 'AMMINISTRATIVA' || s === 'AMMINISTRAZIONE') return 'AMM'
  return AREA_NUM[s] != null ? s : s
}

function normalizeSettoreCod (v: any): string {
  const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (!s) return ''
  const n = Number(s)
  if (Number.isFinite(n) && SETTORE_COD_FROM_NUM[n]) return SETTORE_COD_FROM_NUM[n]
  if (s === 'CS') return 'DS'
  const distretto = s.match(/DISTRETTO([1-6])/)
  if (distretto) return `D${distretto[1]}`
  if (s.includes('DRENO') || s.includes('SCOLO')) return 'DS'
  if (s.includes('CATASTO') || s.includes('RUOLI')) return 'CR'
  if (s.includes('GESTIONEIRRIGUA')) return 'GI'
  return SETTORE_NUM[s] != null ? s : s
}


function cleanPracticeCodeText (value: any): string {
  return String(value ?? '')
    .trim()
    .replace(/^rapporto\s+tecnico\s+n\.?\s*/i, '')
    .replace(/^rapporto\s+n\.?\s*/i, '')
    .replace(/^rapporto\s*/i, '')
    .replace(/^rilevazione\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s*/i, '')
    .trim()
}

function isRilevazioneCodeText (value: any): boolean {
  const s = cleanPracticeCodeText(value).toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
  return /^(TR|TI)-\d+(?:-[A-Z0-9]+)?$/.test(s) || /^\d+-(TR|TI)(?:-[A-Z0-9]+)?$/.test(s)
}

function getOfficialRapportoTecnicoNumber (data: any): string {
  const d = data || {}
  const candidates = [
    d?.numero_rapporto_tecnico, d?.Numero_rapporto_tecnico, d?.NUMERO_RAPPORTO_TECNICO,
    d?.codice_rapporto, d?.Codice_rapporto, d?.CODICE_RAPPORTO,
    d?.n_rapporto, d?.N_RAPPORTO,
    d?.numero_rapporto, d?.Numero_rapporto, d?.NUMERO_RAPPORTO,
    d?.cod_pratica, d?.Cod_pratica, d?.COD_PRATICA
  ]
  for (const c of candidates) {
    const text = cleanPracticeCodeText(c)
    if (!text || /^[-–—]+$/.test(text)) continue
    // I numeri di rilevazione non sono numeri ufficiali di rapporto tecnico.
    if (isRilevazioneCodeText(text)) continue
    if (/^R[-_\s]*\d+/i.test(text) || /^\d+\s*\/\s*\d{4}$/.test(text)) return text.replace(/\s+/g, '')
  }
  return ''
}

function buildRilevazioneNumberFromData (data: any, oid: number | null | undefined): string {
  const d = data || {}
  const rawCandidate = cleanPracticeCodeText(
    d?.numero_rilevazione ?? d?.Numero_rilevazione ?? d?.NUMERO_RILEVAZIONE ??
    d?.cod_pratica ?? d?.Cod_pratica ?? d?.COD_PRATICA ??
    d?.numero_rapporto ?? d?.Numero_rapporto ?? d?.NUMERO_RAPPORTO ??
    d?.n_rapporto ?? d?.N_RAPPORTO ?? ''
  )
  const raw = rawCandidate.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const op = d?.origine_pratica ?? d?.Origine_pratica ?? d?.ORIGINE_PRATICA
  let prefix: 'TR' | 'TI' = (op === 2 || op === '2' || String(op || '').toUpperCase() === 'TI') ? 'TI' : 'TR'
  let oidPart = oid != null && Number.isFinite(Number(oid)) ? String(Number(oid)) : ''
  let sectorPart = normalizeSettoreCod(d?.settore_cod ?? d?.Settore_cod ?? d?.SETTORE_COD ?? d?.settore ?? d?.Settore ?? d?.SETTORE ?? '')

  let m = raw.match(/^(TR|TI)-?(\d+)(?:-([A-Z0-9]+))?$/i)
  if (m) {
    prefix = m[1].toUpperCase() as 'TR' | 'TI'
    oidPart = m[2]
    if (!sectorPart && m[3]) sectorPart = normalizeSettoreCod(m[3])
  } else {
    m = raw.match(/^(\d+)-?(TR|TI)(?:-([A-Z0-9]+))?$/i)
    if (m) {
      oidPart = m[1]
      prefix = m[2].toUpperCase() as 'TR' | 'TI'
      if (!sectorPart && m[3]) sectorPart = normalizeSettoreCod(m[3])
    } else if (!oidPart && /^\d+$/.test(raw)) {
      oidPart = raw
    }
  }

  const base = oidPart || rawCandidate || '—'
  if (base === '—') return base
  return sectorPart ? `${base}-${prefix}-${sectorPart}` : `${base}-${prefix}`
}

function buildPracticeCodeFromData (data: any, oid: number | null | undefined): string {
  const official = getOfficialRapportoTecnicoNumber(data)
  if (official) return official
  return buildRilevazioneNumberFromData(data, oid)
}

/**
 * Cerca lo username di una persona in GII_utenti per ruolo+area(+settore).
 * Per TI usare ti_assegnato_username — non questa funzione.
 */
function findDestUsername (
  cache: Map<string, UtenteCached> | null,
  roleLabel: string,
  areaLabel: string,
  settoreLabel: string
): string {
  if (!cache) return ''
  const rRaw = String(roleLabel || '').trim().toUpperCase()

  let ruoloCod = normalizeRuoloCod(rRaw)
  let areaCod = normalizeAreaCod(areaLabel)
  let settoreCod = normalizeSettoreCod(settoreLabel)

  if (rRaw === 'RI_AMM')       { ruoloCod = 'RI'; areaCod = 'AMM'; settoreCod = '' }
  else if (rRaw === 'TI_AMM')  { ruoloCod = 'TI'; areaCod = 'AMM'; settoreCod = '' }
  else if (rRaw === 'DA')      { ruoloCod = 'DA'; areaCod = 'AMM'; settoreCod = '' }

  const ruoloCode = RUOLO_NUM[ruoloCod]
  const areaCode = areaCod ? AREA_NUM[areaCod] : undefined
  const settoreCode = settoreCod ? SETTORE_NUM[settoreCod] : undefined
  if (!ruoloCod && !ruoloCode) return ''

  const needsSettore = (ruoloCod === 'TR' || ruoloCod === 'RZ') && areaCod !== 'AMM'

  for (const [username, entry] of cache) {
    const entryRuoloCod = normalizeRuoloCod(entry.ruoloCod || entry.ruolo)
    const entryAreaCod = normalizeAreaCod(entry.areaCod || entry.area)
    const entrySettoreCod = normalizeSettoreCod(entry.settoreCod || entry.settore)

    if (ruoloCod && entryRuoloCod !== ruoloCod) continue
    if (!ruoloCod && ruoloCode != null && entry.ruolo !== ruoloCode) continue
    if (areaCod && entryAreaCod !== areaCod) continue
    if (!areaCod && areaCode != null && entry.area !== areaCode) continue
    if (needsSettore && settoreCod && entrySettoreCod !== settoreCod) continue
    if (needsSettore && !settoreCod && settoreCode != null && entry.settore !== settoreCode) continue
    return username
  }
  return ''
}

function findDestEmail (
  cache: Map<string, UtenteCached> | null,
  roleLabel: string,
  areaLabel: string,
  settoreLabel: string
): string {
  if (!cache) return ''
  const rRaw = String(roleLabel || '').trim().toUpperCase()

  let ruoloCod = normalizeRuoloCod(rRaw)
  let areaCod = normalizeAreaCod(areaLabel)
  let settoreCod = normalizeSettoreCod(settoreLabel)

  if (rRaw === 'RI_AMM')       { ruoloCod = 'RI'; areaCod = 'AMM'; settoreCod = '' }
  else if (rRaw === 'TI_AMM')  { ruoloCod = 'TI'; areaCod = 'AMM'; settoreCod = '' }
  else if (rRaw === 'DA')      { ruoloCod = 'DA'; areaCod = 'AMM'; settoreCod = '' }

  const ruoloCode = RUOLO_NUM[ruoloCod]
  const areaCode = areaCod ? AREA_NUM[areaCod] : undefined
  const settoreCode = settoreCod ? SETTORE_NUM[settoreCod] : undefined
  if (!ruoloCod && !ruoloCode) return ''

  const needsSettore = (ruoloCod === 'TR' || ruoloCod === 'RZ') && areaCod !== 'AMM'

  for (const [, entry] of cache) {
    const entryRuoloCod = normalizeRuoloCod(entry.ruoloCod || entry.ruolo)
    const entryAreaCod = normalizeAreaCod(entry.areaCod || entry.area)
    const entrySettoreCod = normalizeSettoreCod(entry.settoreCod || entry.settore)

    if (ruoloCod && entryRuoloCod !== ruoloCod) continue
    if (!ruoloCod && ruoloCode != null && entry.ruolo !== ruoloCode) continue
    if (areaCod && entryAreaCod !== areaCod) continue
    if (!areaCod && areaCode != null && entry.area !== areaCode) continue
    if (needsSettore && settoreCod && entrySettoreCod !== settoreCod) continue
    if (needsSettore && !settoreCod && settoreCode != null && entry.settore !== settoreCode) continue
    return String(entry.email || '').trim()
  }
  return ''
}

function ensureUtentiCache (): Promise<Map<string, UtenteCached> | null> {
  if (_utentiCache) return Promise.resolve(_utentiCache)
  if (_utentiCachePromise) return _utentiCachePromise

  _utentiLoading = true
  _utentiCachePromise = (async () => {
    try {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const fl = new FeatureLayer({ url: GII_UTENTI_URL })
      if (typeof fl?.load === 'function') await fl.load()
      const res = await fl.queryFeatures({
        where: '1=1',
        outFields: ['*'],
        returnGeometry: false
      })
      const map = new Map<string, UtenteCached>()
      for (const f of (res?.features || [])) {
        const a = f?.attributes
        if (a?.username) {
          map.set(String(a.username).trim().toLowerCase(), {
            full_name: String(a.full_name || ''),
            email: String(a.email || a.e_mail || a.mail || a.pec || '').trim(),
            ruolo: a.ruolo ?? null,
            area: a.area ?? null,
            settore: a.settore ?? null,
            ruoloCod: normalizeRuoloCod(a.ruolo_cod || a.ruolo),
            areaCod: normalizeAreaCod(a.area_cod || a.area),
            settoreCod: normalizeSettoreCod(a.settore_cod || a.settore)
          })
        }
      }
      _utentiCache = map
      return map
    } catch (ex) {
      console.warn('[GII-Azioni] Errore caricamento GII_utenti cache:', ex)
      return _utentiCache
    } finally {
      _utentiLoading = false
      _utentiCachePromise = null
    }
  })()

  return _utentiCachePromise
}


type MsgKind = 'info' | 'ok' | 'err'
type Msg = { kind: MsgKind; text: string }

type SelState = {
  ds: any
  oid: number | null
  idFieldName: string
  data: any | null
  sig: string
}

function unwrapJsapiLayer (maybe: any) {
  return (maybe && (maybe.layer || maybe)) || null
}

// ─────────────────────────────────────────────────────────────────────────────
// DataSource helpers
// In ExB, an Output DataSource often exposes `belongToDataSource` as an ID string.
// We must resolve the real (root) DataSource object to reliably query/refresh.
function resolveDsObj (dsOrId: any): any {
  try {
    if (!dsOrId) return null
    if (typeof dsOrId === 'string') {
      return DataSourceManager.getInstance().getDataSource(dsOrId)
    }
    return dsOrId
  } catch {
    return (typeof dsOrId === 'string') ? null : dsOrId
  }
}

function getRootDsObj (dsOrId: any): any {
  let cur = resolveDsObj(dsOrId)
  let guard = 0
  while (cur && (cur as any).belongToDataSource && guard < 10) {
    cur = resolveDsObj((cur as any).belongToDataSource)
    guard++
  }
  return cur || resolveDsObj(dsOrId)
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
type RuntimeSelection = {
  oid: number | null
  layerUrl: string
  serviceUrl: string
  idFieldName: string
  viewName: string
  data?: any
}


function clearRuntimeSelection (reason = 'azioni'): void {
  try {
    sessionStorage.removeItem('GII_SELECTED_OID')
    sessionStorage.removeItem('GII_SELECTED_LAYER_URL')
    sessionStorage.removeItem('GII_SELECTED_SERVICE_URL')
    sessionStorage.removeItem('GII_SELECTED_IDFIELD')
    sessionStorage.removeItem('GII_SELECTED_VIEW_NAME')
    sessionStorage.removeItem('GII_SELECTED_DATA')
    clearGiiPracticeSelectionContext()
    try { delete (window as any).__giiSelection } catch {}
    window.dispatchEvent(new CustomEvent('gii-selection-changed', { detail: null }))
    window.dispatchEvent(new CustomEvent('gii-selection-cleared', { detail: { source: reason, ts: Date.now() } }))
  } catch {}
}

function readRuntimeSelection (): RuntimeSelection | null {
  try {
    const mem = (window as any)?.__giiSelection
    if (mem && isGiiPracticePayloadCurrent(mem) && mem.layerUrl && Number.isFinite(Number(mem.oid))) {
      const oid = Number(mem.oid)
      const layerUrl = String(mem.layerUrl || '').trim()
      const idFieldName = String(mem.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
      const cache = readSelectedFeatureCache(layerUrl, oid)
      return {
        oid,
        layerUrl,
        serviceUrl: String(mem.serviceUrl || '').trim(),
        idFieldName,
        viewName: String(mem.viewName || '').trim(),
        data: cache?.data
      }
    }

    if (!isGiiPracticeSelectionContextCurrent()) return null
    const oidRaw = sessionStorage.getItem('GII_SELECTED_OID')
    const layerUrl = String(sessionStorage.getItem('GII_SELECTED_LAYER_URL') || '').trim()
    const serviceUrl = String(sessionStorage.getItem('GII_SELECTED_SERVICE_URL') || '').trim()
    const idFieldName = String(sessionStorage.getItem('GII_SELECTED_IDFIELD') || 'OBJECTID').trim() || 'OBJECTID'
    const viewName = String(sessionStorage.getItem('GII_SELECTED_VIEW_NAME') || '').trim()
    const oid = oidRaw != null ? Number(oidRaw) : NaN
    if (!layerUrl || !Number.isFinite(oid)) return null
    const cache = readSelectedFeatureCache(layerUrl, oid)
    return { oid, layerUrl, serviceUrl, idFieldName, viewName, data: cache?.data }
  } catch {
    return null
  }
}

function isRuntimeSelectionFromEditSave (sel: RuntimeSelection | null): boolean {
  try {
    if (!sel?.layerUrl || sel.oid == null || !Number.isFinite(Number(sel.oid))) return false
    const cache = readSelectedFeatureCache(sel.layerUrl, sel.oid)
    return cache?.source === 'edit'
  } catch {
    return false
  }
}

function readRuntimeSelectionForActions (): RuntimeSelection | null {
  const sel = readRuntimeSelection()
  return isRuntimeSelectionFromEditSave(sel) ? null : sel
}

function makeRuntimeRecord (attrs: any, idFieldName: string, sourceKey: string, geometry?: any): any {
  const id = String(attrs?.[idFieldName] ?? attrs?.OBJECTID ?? attrs?.objectid ?? '')
  const data = geometry ? { ...(attrs || {}), geometry } : attrs
  return {
    getData: () => data,
    getId: () => id,
    dataSource: { id: sourceKey }
  }
}

const runtimeDsProxyPromises: Record<string, Promise<any>> = {}

async function createRuntimeDsProxyFromLayerUrl (layerUrl: string, label?: string): Promise<any> {
  try {
    const cached = (window as any)?.__giiRuntimeDsProxyCache?.[layerUrl]
    if (cached) return cached
  } catch {}
  if (runtimeDsProxyPromises[layerUrl]) return runtimeDsProxyPromises[layerUrl]

  runtimeDsProxyPromises[layerUrl] = (async () => {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const layer = new FeatureLayer({ url: layerUrl, outFields: ['*'] })
    if (typeof layer.load === 'function') {
      try { await layer.load() } catch {}
    }
    const idFieldName = String(layer?.objectIdField || 'OBJECTID')
    const schemaFields: Record<string, any> = {}
    const fields = Array.isArray(layer?.fields) ? layer.fields : []
    for (const f of fields) {
      if (!f?.name) continue
      schemaFields[String(f.name)] = { alias: String(f.alias || f.name), type: String(f.type || '') }
    }
    const proxy = {
      id: `runtime:${layerUrl}`,
      getIdField: () => idFieldName,
      getSchema: () => ({ fields: schemaFields, idField: idFieldName }),
      getLabel: () => String(label || ''),
      getLayer: () => layer,
      getJSAPILayer: () => layer,
      getJsApiLayer: () => layer,
      layer,
      getDataSourceJson: () => ({ url: layerUrl }),
      query: async (q: any) => {
        const res = await layer.queryFeatures({
          where: q?.where || '1=1',
          outFields: (Array.isArray(q?.outFields) && q.outFields.length ? q.outFields : ['*']) as any,
          returnGeometry: !!q?.returnGeometry
        })
        return { records: (res?.features || []).map((f: any) => makeRuntimeRecord(f?.attributes || {}, idFieldName, layerUrl, f?.geometry)) }
      }
    }
    try {
      const w = window as any
      w.__giiRuntimeDsProxyCache = w.__giiRuntimeDsProxyCache || {}
      w.__giiRuntimeDsProxyCache[layerUrl] = proxy
    } catch {}
    return proxy
  })()

  try {
    return await runtimeDsProxyPromises[layerUrl]
  } catch (e) {
    try { delete runtimeDsProxyPromises[layerUrl] } catch {}
    throw e
  }
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


function isEmptyValue (v: any): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

function toNumOrNull (v: any, zeroIsNull: boolean = true): number | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  if (zeroIsNull && n === 0) return null
  return n
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
  queryFields: string[]
  onUpdate: (dsKey: string, state: SelState) => void
}) {
  const { widgetId, uds, dsKey, watchFields, queryFields, onUpdate } = props
  return (
    <DataSourceComponent useDataSource={uds} widgetId={widgetId}>
      {(ds: any) => (
        <SelectionWatcher
          ds={ds}
          dsKey={dsKey}
          watchFields={watchFields}
          queryFields={queryFields}
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
  queryFields: string[]
  onUpdate: (dsKey: string, state: SelState) => void
}): React.JSX.Element | null {
  const { ds, dsKey, watchFields, queryFields, onUpdate } = props

  React.useEffect(() => {
    try { ds?.setListenSelection?.(true) } catch {}
  }, [ds])

  // Nota ExB: se nel Builder il DS del widget è impostato su "Feature selezionata",
  // spesso i record arrivano come ds.getRecords() (output DS) e NON come getSelectedRecords().
  // Per essere robusti, usiamo prima la selezione, poi fallback ai record.
  let selected = ds?.getSelectedRecords?.() || []
  if (!selected || selected.length === 0) {
    const recs = ds?.getRecords?.() || []
    if (recs && recs.length) selected = recs
  }
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

  // Forza re-query quando qualche altra parte dell'app lo richiede
  // (es. dopo applyEdits sul FS madre). Event payload opzionale: { oid }.
  const [refreshTick, setRefreshTick] = React.useState(0)

  React.useEffect(() => {
    const handler = (ev: any) => {
      try {
        const targetOid = ev?.detail?.oid
        if (targetOid == null || Number(targetOid) === Number(oid)) {
          setRefreshTick(t => t + 1)
        }
      } catch {
        setRefreshTick(t => t + 1)
      }
    }
    window.addEventListener('gii-force-refresh-selection', handler as any)
    return () => window.removeEventListener('gii-force-refresh-selection', handler as any)
  }, [oid])

const [fullData, setFullData] = React.useState<any>(null)

// reset full data when selection changes
React.useEffect(() => {
  setFullData(null)
}, [ds, oid])

const querySig = Array.isArray(queryFields) ? queryFields.join('|') : ''
const watchSig = Array.isArray(watchFields) ? watchFields.join('|') : ''

// Ensure we have ALL the fields needed by the TAB configuration.
// Selected records in ExB can contain only a subset of attributes: we re-query by OID when needed.
React.useEffect(() => {
  let cancelled = false
  const load = async () => {
    if (!ds || oid == null || !Number.isFinite(oid)) return

    const qf = Array.isArray(queryFields) ? queryFields : []
    const wantsAll = qf.includes('*')

    const outFieldsBase = wantsAll
      ? ['*']
      : Array.from(new Set([
          ...qf,
          ...(Array.isArray(watchFields) ? watchFields : [])
        ])).filter(Boolean)

    const outFields = (wantsAll || outFieldsBase.length === 0) ? ['*'] : outFieldsBase
    const base = data || {}
    const needsQuery = wantsAll || outFields.some(f => {
      if (f === '*') return false
      if (!Object.prototype.hasOwnProperty.call(base, f)) return true
      // In ExB alcuni record includono la chiave ma con valore `undefined` quando il campo non è stato richiesto.
      return (base as any)[f] === undefined
    })
    if (!needsQuery) return

    try {
      const q: any = {
        where: `${idFieldName}=${Number(oid)}`,
        outFields,
        returnGeometry: false,
        pageSize: 1
      }
      // Preferisci SEMPRE il DS root (FeatureLayer DS). L'Output DS spesso non implementa query correttamente.
      const qds = getRootDsObj(ds) || ds
      const res: any = await (qds?.query ? qds.query(q) : null)

      let rec: any = null
      if (Array.isArray(res)) rec = res[0]
      else if (res && Array.isArray(res.records)) rec = res.records[0]
      else if (res && res.data && Array.isArray(res.data.records)) rec = res.data.records[0]

      const d = rec?.getData ? rec.getData() : (rec?.data || rec?.attributes || null)
      if (!cancelled && d) setFullData(d)
    } catch {}
  }
  load()
  return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ds, oid, idFieldName, querySig, watchSig, refreshTick])

const mergedData: any = fullData ? { ...(data || {}), ...(fullData || {}) } : data
  const sigParts: string[] = []
  sigParts.push(String(oid ?? ''))
  for (const f of watchFields) sigParts.push(String(mergedData?.[f] ?? ''))
  const sig = sigParts.join('|')

  React.useEffect(() => {
    onUpdate(dsKey, {
      ds,
      oid: (oid != null && Number.isFinite(oid)) ? oid : null,
      idFieldName,
      data: (oid != null && Number.isFinite(oid)) ? mergedData : null,
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
          // Il menu è renderizzato su document.body: deve stare sopra al popup globale
          // di conferma, che usa z-index molto alti per bloccare l'interfaccia.
          zIndex: 2147483647,
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
          <div style={{ fontSize: 14, color: '#6b7280' }}>{alias}</div>
          <select
            value={val ?? ''}
            disabled={saving}
            onChange={e => updateDraft(fieldName, (e.target as HTMLSelectElement).value === '' ? null : (isNum ? Number((e.target as HTMLSelectElement).value) : (e.target as HTMLSelectElement).value))}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.20)', fontSize: 15, width: '100%', background: saving ? '#f3f4f6' : '#fff' }}
          >
            <option value=''>— seleziona —</option>
            {domain.codedValues.map((cv: any) => {
              const code = String(cv.code)
              const label = fieldName === 'norma16_17'
                ? (code === 'Art16'
                    ? 'Art. 16 - Presentazione tardiva comunicazione di irrigazione'
                    : (code === 'Art17'
                        ? 'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia'
                        : cv.name))
                : cv.name
              return <option key={code} value={code}>{label}</option>
            })}
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
          <div style={{ fontSize: 14, color: '#6b7280' }}>{alias}</div>
          <input type='date' value={toInputVal(val)} disabled={saving}
            onChange={e => {
              const d = new Date((e.target as HTMLInputElement).value)
              updateDraft(fieldName, Number.isNaN(d.getTime()) ? null : d.getTime())
            }}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.20)', fontSize: 15, width: '100%', background: saving ? '#f3f4f6' : '#fff' }}
          />
        </div>
      )
    }
    const isMultiline = /descr|note|fatti|circostanz/i.test(fieldName)
    return (
      <div key={fieldName} style={{ display: 'grid', gap: 4 }}>
        <div style={{ fontSize: 14, color: '#6b7280' }}>{alias}</div>
        {isMultiline
          ? <textarea value={val != null ? String(val) : ''} disabled={saving} rows={3}
            onChange={e => updateDraft(fieldName, (e.target as HTMLTextAreaElement).value || null)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.20)', fontSize: 15, width: '100%', resize: 'vertical', background: saving ? '#f3f4f6' : '#fff', boxSizing: 'border-box' }}
          />
          : <input type='text' value={val != null ? String(val) : ''} disabled={saving}
            onChange={e => updateDraft(fieldName, (e.target as HTMLInputElement).value === '' ? null : (isNum ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value))}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.20)', fontSize: 15, width: '100%', background: saving ? '#f3f4f6' : '#fff', boxSizing: 'border-box' }}
          />
        }
      </div>
    )
  }

  const praticaCode = buildPracticeCodeFromData(data || {}, oid)

  const praticaLabel = (() => {
    const ufficiale = getOfficialRapportoTecnicoNumber(data || {})
    return ufficiale ? 'Rapporto tecnico' : 'Rilevazione'
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
          <div style={{ fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
            ✏️ Modifica rilevazione&nbsp;<span style={{ color: '#2f6fed' }}>{praticaCode}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {saveMsg && (
              <span style={{ fontSize: 15, color: saveMsg.kind === 'ok' ? '#1a7f37' : '#b42318' }}>
                {saveMsg.text}
              </span>
            )}
            <button type='button' disabled={saving} onClick={handleSave}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: saving ? '#e5e7eb' : '#1a7f37', color: saving ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Salvataggio…' : '💾 Salva'}
            </button>
            <button type='button' disabled={saving} onClick={() => setConfirmCancel(true)}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d13438', background: '#fff', color: '#d13438', fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer' }}>
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
                fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer'
              }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <div style={{ fontSize: 14, color: '#9ca3af', alignSelf: 'center', marginLeft: 8 }}>
            Per localizzazione e allegati usa "Modifica (pagina)"
          </div>
        </div>

        {/* Contenuto scrollabile */}
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>
          {!aliasReady
            ? <div style={{ color: '#6b7280', fontSize: 15 }}>Caricamento schema campi…</div>
            : (
              <div style={{ display: 'grid', gap: 14 }}>
                {activeTab === 'anagrafica' && (
                  anagraficaFields.length
                    ? anagraficaFields.map(f => renderField(f))
                    : <div style={{ color: '#6b7280', fontSize: 15 }}>Nessun campo rilevato automaticamente. Usare la pagina di editing completa.</div>
                )}
                {activeTab === 'violazione' && (
                  violazioneFields.length
                    ? violazioneFields.map(f => renderField(f))
                    : <div style={{ color: '#6b7280', fontSize: 15 }}>Nessun campo rilevato automaticamente. Usare la pagina di editing completa.</div>
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
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Annullare le modifiche?</div>
            <div style={{ fontSize: 15, color: '#4b5563', marginBottom: 20 }}>Le modifiche non salvate andranno perse.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type='button' onClick={() => { setConfirmCancel(false); onClose(false) }}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#d13438', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                Sì, annulla
              </button>
              <button type='button' onClick={() => setConfirmCancel(false)}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#111827', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
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
  take: string; takeText: string
  integrazione: string; integrazioneText: string
  approva: string; approvaText: string
  approvaRapporto: string; approvaRapportoText: string
  respingi: string; respingiText: string
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

function actionButtonStyle (bg: string, disabled: boolean, ui?: { btnBorderRadius?: number; btnFontSize?: number; btnFontWeight?: number; btnPaddingX?: number; btnPaddingY?: number }, textColor?: string): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: ui?.btnBorderRadius ?? 8,
    fontSize: ui?.btnFontSize ?? 13,
    fontWeight: ui?.btnFontWeight ?? 600,
    padding: `${ui?.btnPaddingY ?? 8}px ${ui?.btnPaddingX ?? 16}px`
  }
  if (disabled) {
    return { ...base, backgroundColor: '#e5e7eb', borderColor: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }
  }
  return { ...base, backgroundColor: bg, borderColor: bg, color: textColor || '#ffffff' }
}

type Pending = null | 'TAKE' | 'ASSEGNA_TI' | 'ASSEGNA_TI_AMM' | 'INVIA_TI_AMM' | 'RESTITUISCI_TI_AMM' | 'INTEGRAZIONE' | 'INTEGRAZIONE_TI_AMM' | 'INTEGRAZIONE_TECNICA' | 'APPROVA' | 'RESPINGI' | 'TRASMETTI' | 'ELIMINA'

type WorkflowEsitoChoice = '' | 'CONFORME' | 'DA_INTEGRARE' | 'RESPINTA'

type InformativeActivityTarget = {
  ruoloDestinatario: string
  utenteDestinatario?: string
  sottotipo: string
  titolo: string
  messaggio: string
  priorita?: string
}

type DirectPracticeAccessGate = {
  status: 'idle' | 'checking' | 'allowed' | 'denied' | 'unavailable'
}

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
    ammPageId: string
    fieldStatoTI: string
    fieldPresaTI: string
    minStato: number
    maxStato: number
    presaRequiredVal: number
  }
  nsConfig: { detailUrl: string; parametriUrl: string; parametroCode: string; attrezzatureParametriUrl: string }
  sanzioneConfig: { parametriSanzioniUrl: string; regolamentoArticoliUrl: string; regolamentoRaccordiUrl: string }
  accessGate?: DirectPracticeAccessGate
}) {
  const { active, roleCode, buttonText, buttonColors, ui } = props
  const role = String(roleCode || 'DT').trim().toUpperCase()
  const hasDedicatedPresaField = React.useCallback((r: string) => {
    const rr = String(r || '').trim().toUpperCase()
    // DT e DA non usano più i campi ridondanti presa_in_carico_DT/DA:
    // la presa in carico è rappresentata da stato_* e dt_presa_in_carico_*.
    return rr !== 'DT' && rr !== 'DA'
  }, [])

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

  const statoDeterminaField = 'determinazione_stato'

  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg] = React.useState<Msg | null>({ kind: 'info', text: 'Selezionare una riga.' })

  // lock procedura: solo quando parte un’azione (pending) o quando salvo (loading)
  const [pending, setPending] = React.useState<Pending>(null)
  const [actionsMenuOpen, setActionsMenuOpen] = React.useState(false)
  const [workflowSubmitting, setWorkflowSubmitting] = React.useState(false)

  // validazioni “soft”: si attivano solo dopo tentativo di conferma
  const [confirmAttempted, setConfirmAttempted] = React.useState(false)

  // Nel popup di workflow l'esito della verifica viene scelto prima;
  // l'azione procedurale viene derivata o scelta solo dopo, quando serve.
  const [workflowEsitoChoice, setWorkflowEsitoChoice] = React.useState<WorkflowEsitoChoice>('')
  const [workflowRimandoChoice, setWorkflowRimandoChoice] = React.useState<string>('')

  // note / motivazione
  const [noteDraft, setNoteDraft] = React.useState('')
  const [rejectReason, setRejectReason] = React.useState('')
  const [integrationReason, setIntegrationReason] = React.useState('')
  const [integrationTargets, setIntegrationTargets] = React.useState<string[]>([])
  const [integrationOtherText, setIntegrationOtherText] = React.useState('')

  const resetStructuredReasons = React.useCallback(() => {
    setRejectReason('')
    setIntegrationReason('')
    setIntegrationTargets([])
    setIntegrationOtherText('')
  }, [])

  // Assegna TI (solo RZ)
  type TiOpt = { username: string; fullName: string }
  const [tiOptions, setTiOptions] = React.useState<TiOpt[]>([])
  const [tiSelected, setTiSelected] = React.useState<string>('')
  const [tiLoading, setTiLoading] = React.useState(false)
  const [tiLoadErr, setTiLoadErr] = React.useState<string>('')

  // Assegna TI_AMM (solo RI_AMM)
  const [tiAmmOptions, setTiAmmOptions] = React.useState<TiOpt[]>([])
  const [tiAmmSelected, setTiAmmSelected] = React.useState<string>('')
  const [tiAmmLoading, setTiAmmLoading] = React.useState(false)
  const tiAmmLoadingRef = React.useRef(false)
  const [tiAmmLoadErr, setTiAmmLoadErr] = React.useState<string>('')

  // Riapertura amministrativa: evita che lo stesso numero di riapertura
  // possa avviare più volte un nuovo ciclo TI_AMM.
  const [riaperturaWorkflowStarted, setRiaperturaWorkflowStarted] = React.useState(false)
  const [riaperturaWorkflowCheckLoading, setRiaperturaWorkflowCheckLoading] = React.useState(false)

  // Popup di diniego (validazione pre-trasmissione)
  const [denyPopupMessages, setDenyPopupMessages] = React.useState<string[]>([])
  const [zeroNotaSpeseWarning, setZeroNotaSpeseWarning] = React.useState<string[]>([])
  const [incompleteNotaSpeseWarning, setIncompleteNotaSpeseWarning] = React.useState<string[]>([])

  // ── Cache GII_utenti (per risolvere utente_destinatario) ──
  React.useEffect(() => {
    void ensureUtentiCache()
  }, [])

  const noteOrigRef = React.useRef<string>('')
  const noteRef = React.useRef<HTMLTextAreaElement | null>(null)

  // textarea annotazioni: ridimensionabile verticalmente tramite trascinamento
  const NOTE_MIN_H = 74
  const autoResizeNote = React.useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return
    try {
      el.style.overflowY = 'auto'
    } catch {}
  }, [])

  const selectionKey = active?.state?.oid != null ? `${active.key}:${active.state.oid}` : null
  const selectionKeyRef = React.useRef<string | null>(selectionKey)
  React.useEffect(() => { selectionKeyRef.current = selectionKey }, [selectionKey])

  const ds = active?.state?.ds

  // ── Field existence helpers (schema-aware) ────────────────────────────────
  // La fonte primaria della presa in carico è stato_*; dt_presa_in_carico_* registra la data.
  // I vecchi campi presa_in_carico_DT/DA sono ridondanti e vengono ignorati anche se ancora presenti nello schema.
  // Per eventuali altri ruoli, usiamo presa_in_carico_* solo se il campo esiste davvero.
  const schemaFieldsCI = React.useMemo(() => {
    try {
      const fields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
      const ci: Record<string, string> = {}
      Object.keys(fields || {}).forEach(k => { ci[String(k).toLowerCase()] = k })
      return ci
    } catch {
      return {} as Record<string, string>
    }
  }, [ds])

  const hasField = React.useCallback((name: string) => {
    if (!name) return false
    const key = String(name).toLowerCase()
    return !!(schemaFieldsCI && (schemaFieldsCI as any)[key])
  }, [schemaFieldsCI])

  const realFieldName = React.useCallback((name: string) => {
    if (!name) return name
    const key = String(name).toLowerCase()
    return (schemaFieldsCI as any)?.[key] || name
  }, [schemaFieldsCI])
  // Patch ottimistico: dopo applyEdits aggiorniamo subito i valori usati dai pulsanti,
  // senza dover aspettare refresh DS / cambio selezione.
  const baseData = active?.state?.data || null
  const [localData, setLocalData] = React.useState<any | null>(null)
  React.useEffect(() => { setLocalData(null) }, [selectionKey])
  const data = localData || baseData
  const oid = active?.state?.oid ?? null
  const idFieldNameFromSel = active?.state?.idFieldName || 'OBJECTID'
  const hasSel = oid != null && Number.isFinite(oid)

  const praticaCode = buildPracticeCodeFromData(data || {}, oid)

  const praticaLabel = (() => {
    const ufficiale = getOfficialRapportoTecnicoNumber(data || {})
    return ufficiale ? 'Rapporto tecnico' : 'Rilevazione'
  })()

  const pickAttrCI = (obj: any, keys: string[]): any => {
    if (!obj) return undefined
    const map: Record<string, string> = {}
    try {
      Object.keys(obj).forEach(k => { map[String(k).toLowerCase()] = k })
    } catch {}
    for (const k of keys) {
      const direct = (obj as any)[k]
      if (direct !== undefined && direct !== null && direct !== '') return direct
      const kk = map[String(k).toLowerCase()]
      if (kk) {
        const v = (obj as any)[kk]
        if (v !== undefined && v !== null && v !== '') return v
      }
    }
    return undefined
  }

  const sessionIdRef = React.useRef<string>(`sess-${Date.now()}-${Math.random().toString(16).slice(2)}`)

  const normalizeTipoAttoAmmCode = (raw: any): string => {
    const value = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
    if (value === 'VERBALE_MISTO') return 'VERBALE_RISARCIMENTO'
    if (value.includes('VERBALE') && (value.includes('MIST') || value.includes('RISARC') || value.includes('RIMBORS'))) return 'VERBALE_RISARCIMENTO'
    if (value.includes('VERBALE')) return 'VERBALE'
    return value
  }

  const inferSettoreFromUsername = (u: string): string => {
    const up = String(u || '').toUpperCase()
    const m = up.match(/(D[1-6]|DS|CR)/)
    return m ? m[1] : ''
  }

  const logCycleLayerRef = React.useRef<any | null>(null)

  const normalizeAreaLabel = (v: any): string => {
    const s = String(v ?? '').trim().toUpperCase()
    if (!s) return ''
    return normalizeAreaCod(s)
  }

  const normalizeSettoreLabel = (area: string, v: any): string => {
    return normalizeSettoreCod(v)
  }

  const getCycleLogLayer = async () => {
    if (logCycleLayerRef.current) return logCycleLayerRef.current
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: GII_LOG_EVENTI_CICLI_URL, outFields: ['*'] })
    if (typeof fl.load === 'function') {
      try { await fl.load() } catch {}
    }
    logCycleLayerRef.current = fl
    return fl
  }

  const riaperturaAmmFlag = toNumOrNull(pickAttrCI(data, ['riapertura_amm', 'RIAPERTURA_AMM'])) === 1
  const riaperturaAmmNumero = toNumOrNull(pickAttrCI(data, ['riapertura_amm_numero', 'RIAPERTURA_AMM_NUMERO']))
  const riaperturaAmmCausale = String(pickAttrCI(data, ['riapertura_amm_causale', 'RIAPERTURA_AMM_CAUSALE']) || '').trim()
  const riaperturaAmmDispostaIl = pickAttrCI(data, ['riapertura_amm_disposta_il', 'RIAPERTURA_AMM_DISPOSTA_IL'])
  const riaperturaAmmDispostaDa = String(pickAttrCI(data, ['riapertura_amm_disposta_da', 'RIAPERTURA_AMM_DISPOSTA_DA']) || '').trim()
  const riaperturaAmmAutorizzazione = String(pickAttrCI(data, ['riapertura_amm_autorizzazione', 'RIAPERTURA_AMM_AUTORIZZAZIONE']) || '').trim()
  const riaperturaAmmMotivo = String(pickAttrCI(data, ['riapertura_amm_motivo', 'RIAPERTURA_AMM_MOTIVO']) || '').trim()
  const riaperturaAmmCompleta = Boolean(
    riaperturaAmmFlag &&
    riaperturaAmmNumero != null && riaperturaAmmNumero > 0 &&
    riaperturaAmmCausale &&
    riaperturaAmmDispostaIl &&
    riaperturaAmmDispostaDa &&
    riaperturaAmmAutorizzazione &&
    riaperturaAmmMotivo
  )


  const sqlQuote = (v: any): string => `'${String(v ?? '').replace(/'/g, "''")}'`

  const globalIdVariants = (raw: any): string[] => {
    const s = String(raw ?? '').trim()
    if (!s) return []
    const clean = s.replace(/[{}]/g, '').trim()
    const variants = [s]
    if (clean) {
      variants.push(clean)
      variants.push(`{${clean}}`)
    }
    return Array.from(new Set(variants.filter(Boolean)))
  }

  const parentGlobalIdWhere = (fieldName: string, raw: any): string => {
    const variants = globalIdVariants(raw)
    return variants.length
      ? variants.map(g => `${fieldName} = ${sqlQuote(g)}`).join(' OR ')
      : '1=0'
  }

  React.useEffect(() => {
    let cancelled = false
    setRiaperturaWorkflowStarted(false)
    if (role !== 'RI_AMM' || !riaperturaAmmCompleta || !riaperturaAmmNumero || !data) {
      setRiaperturaWorkflowCheckLoading(false)
      return () => { cancelled = true }
    }

    const parentGlobalId = String(pickAttrCI(data, ['globalid', 'GlobalID', 'GLOBALID', 'parent_globalid']) || '').trim()
    if (!parentGlobalId) {
      setRiaperturaWorkflowCheckLoading(false)
      return () => { cancelled = true }
    }

    setRiaperturaWorkflowCheckLoading(true)
    ;(async () => {
      try {
        const logLayer = await getCycleLogLayer()
        if (!logLayer?.queryFeatures) return
        const q = logLayer.createQuery ? logLayer.createQuery() : {}
        const marker = `Riapertura amministrativa n. ${riaperturaAmmNumero}`
        q.where = `(${parentGlobalIdWhere('parent_globalid', parentGlobalId)}) AND ruolo_competente = 'RI_AMM' AND evento_chiusura = 'NUOVA_ASSEGNAZIONE' AND ruolo_destinatario = 'TI_AMM' AND note_chiusura LIKE ${sqlQuote(`%${marker}%`)}`
        q.outFields = [String(logLayer.objectIdField || 'OBJECTID')]
        q.returnGeometry = false
        q.num = 1
        const res = await logLayer.queryFeatures(q)
        if (!cancelled) setRiaperturaWorkflowStarted(Boolean(res?.features?.length))
      } catch (e) {
        console.warn('[GII-Azioni] Verifica workflow di riapertura non disponibile:', e)
      } finally {
        if (!cancelled) setRiaperturaWorkflowCheckLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [data, role, riaperturaAmmCompleta, riaperturaAmmNumero, selectionKey])

  const getObjectIdValue = (attrs: any, layer?: any): any => {
    const oidField = String(layer?.objectIdField || 'OBJECTID')
    return pickAttrCI(attrs, [oidField, 'OBJECTID', 'ObjectID', 'ObjectId', 'objectId', 'objectid'])
  }

  const queryCurrentRecordAttrs = async (): Promise<Record<string, any> | null> => {
    if (oid == null || !Number.isFinite(Number(oid))) return null
    try {
      let layer: any = null
      try {
        const resolved = await resolveLayer(ds)
        layer = resolved?.layer || null
      } catch {}

      if (!layer?.queryFeatures) {
        const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
        const w: any = window as any
        const layerUrl = String(
          active?.state?.ds?.getDataSourceJson?.()?.url ||
          active?.state?.ds?.dataSourceJson?.url ||
          active?.state?.ds?.layer?.url ||
          w.__giiSelection?.layerUrl ||
          sessionStorage.getItem('GII_SELECTED_LAYER_URL') ||
          active?.key ||
          ''
        ).trim()
        if (layerUrl) layer = new FeatureLayer({ url: layerUrl, outFields: ['*'] })
      }

      if (!layer?.queryFeatures) return null
      if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
      const idField = String(layer.objectIdField || idFieldNameFromSel || 'OBJECTID')
      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = `${idField} = ${Number(oid)}`
      q.outFields = ['*']
      q.returnGeometry = false
      q.num = 1
      const res = await layer.queryFeatures(q)
      return res?.features?.[0]?.attributes || null
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Impossibile rileggere il record corrente per il contesto ciclo:', e)
      return null
    }
  }


  const numeroAttoForYearRegex = (prefix: string, anno: number, allowLegacyWithoutPrefix = false): RegExp => {
    const p = String(prefix || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pref = allowLegacyWithoutPrefix ? `(?:${p}\\s*-\\s*)?` : `${p}\\s*-\\s*`
    return new RegExp(`^\\s*${pref}(\\d+)\\s*/\\s*${anno}\\s*$`, 'i')
  }

  const parseNumeroAttoProgressivo = (value: any, prefix: string, anno: number, allowLegacyWithoutPrefix = false): number | null => {
    const s = String(value ?? '').trim()
    if (!s) return null
    const m = s.match(numeroAttoForYearRegex(prefix, anno, allowLegacyWithoutPrefix))
    if (!m) return null
    const n = Number(m[1])
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
  }

  const formatNumeroAtto = (prefix: string, progressivo: number, anno: number): string => `${String(prefix || '').trim().toUpperCase()}-${Math.max(1, Math.floor(progressivo))}/${anno}`

  const queryLayerForOfficialNumber = async (): Promise<any> => {
    let layer: any = null
    try {
      const resolved = await resolveLayer(ds)
      layer = resolved?.layer || null
    } catch {}

    if (!layer?.queryFeatures) {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const w: any = window as any
      const layerUrl = String(
        active?.state?.ds?.getDataSourceJson?.()?.url ||
        active?.state?.ds?.dataSourceJson?.url ||
        active?.state?.ds?.layer?.url ||
        w.__giiSelection?.layerUrl ||
        sessionStorage.getItem('GII_SELECTED_LAYER_URL') ||
        active?.key ||
        ''
      ).trim()
      if (layerUrl) layer = new FeatureLayer({ url: layerUrl, outFields: ['*'] })
    }

    if (!layer?.queryFeatures) throw new Error('Impossibile determinare il numero ufficiale: layer non disponibile per la query.')
    if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
    return layer
  }

  const queryNextNumeroAtto = async (prefix: 'R' | 'V', anno: number, numeroFieldName: string, allowLegacyWithoutPrefix = false): Promise<string> => {
    const layer = await queryLayerForOfficialNumber()
    const idField = String(layer.objectIdField || idFieldNameFromSel || 'OBJECTID')
    const outFields = Array.from(new Set([idField, numeroFieldName].filter(Boolean)))

    let maxProgressivo = 0
    let start = 0
    const pageSize = 2000

    while (true) {
      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = `${numeroFieldName} IS NOT NULL`
      q.outFields = outFields
      q.returnGeometry = false
      q.start = start
      q.num = pageSize
      const res = await layer.queryFeatures(q)
      const features = Array.isArray(res?.features) ? res.features : []
      features.forEach((f: any) => {
        const attrs = f?.attributes || {}
        const n = parseNumeroAttoProgressivo(pickAttrCI(attrs, [numeroFieldName]), prefix, anno, allowLegacyWithoutPrefix)
        if (n != null && n > maxProgressivo) maxProgressivo = n
      })
      if (features.length < pageSize) break
      start += features.length
      if (start > 100000) break
    }

    return formatNumeroAtto(prefix, maxProgressivo + 1, anno)
  }

  type NotaSpeseCasisticaCheck = { codice: string; art: number; label: string }
  const NOTE_SPESE_CASISTICHE_CHECK: NotaSpeseCasisticaCheck[] = [
    { codice: 'C100_REPERIBILITA', art: 8, label: 'Art. 8 - Violazione servizio di reperibilità' },
    { codice: 'C101_SPRECO_ACQUA', art: 27, label: 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica' },
    { codice: 'C104_ATTREZZATURE_DANNEGGIATE', art: 30, label: 'Art. 30 - Danneggiamento e/o perdita attrezzature' },
    { codice: 'C113_DANNI_STRUTTURE_IRRIGUE', art: 39, label: 'Art. 39 - Danni alle strutture irrigue' }
  ]

  const isFlagSelectedLocal = (v: any): boolean => {
    if (v === true) return true
    const s = String(v ?? '').trim().toLowerCase()
    return s === '1' || s === 'true' || s === 'si' || s === 'sì' || s === 'x'
  }

  const hasArtSelectedForNotaSpeseCheck = (attrs: any, art: number): boolean => {
    const code = `Art${art}`
    const norma = String(pickAttrCI(attrs, ['norma_violata3', 'NORMA_VIOLATA3']) || '')
    const multi = new Set(norma.split(/\s+/).filter(Boolean))
    if (!multi.has(code) && !isFlagSelectedLocal(pickAttrCI(attrs, [`v_art${String(art).padStart(2, '0')}`, `V_ART${String(art).padStart(2, '0')}`, `v_art${art}`, `V_ART${art}`]))) return false
    if (art === 30) return art30HasRecuperabileForNotaSpeseCheck(attrs)
    return true
  }

  // Art. 30 richiede la Nota spese solo se tra le attrezzature selezionate ce n'è almeno una
  // con stato "Recuperabile" — se sono tutte "Non recuperabile" (risarcimento forfettario,
  // già coperto dal pannello "Risarcimento attrezzatura"), non ha senso attendersi anche una
  // nota spese. Mirror della stessa logica in gii-editing-ti.
  const art30HasRecuperabileForNotaSpeseCheck = (attrs: any): boolean => {
    const raw = String(pickAttrCI(attrs, ['attrezzature_risarcimento_dettaglio']) || '')
    for (const line of raw.split(/\r?\n/)) {
      const text = line.trim()
      if (!text || !/Stato:/i.test(text)) continue
      if (/Stato:\s*Recuperabile\b/i.test(text)) return true
    }
    return false
  }

  const getSelectedNotaSpeseCasisticheCheck = (attrs: any): NotaSpeseCasisticaCheck[] => {
    return NOTE_SPESE_CASISTICHE_CHECK.filter(opt => hasArtSelectedForNotaSpeseCheck(attrs, opt.art)).sort((a, b) => a.art - b.art)
  }

  type NotaSpeseCasisticaStatus = { total: number; rows: number; incompleteRows: number }

  const queryNotaSpeseStatusByCasistica = async (parentGlobalId: string): Promise<Record<string, NotaSpeseCasisticaStatus>> => {
    const detailUrl = String(props.nsConfig?.detailUrl || '').trim()
    const gid = String(parentGlobalId || '').trim()
    if (!detailUrl || !gid) return {}
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: detailUrl, outFields: ['*'] })
    if (typeof fl.load === 'function') { try { await fl.load() } catch {} }
    const q = fl.createQuery ? fl.createQuery() : {}
    q.where = `parent_globalid = ${sqlQuote(gid)}`
    q.outFields = ['codice_casistica', 'importo_riga', 'quantita', 'riferimento_attrezzatura_id']
    q.returnGeometry = false
    const res = await fl.queryFeatures(q)
    const statuses: Record<string, NotaSpeseCasisticaStatus> = {}
    ;(res?.features || []).forEach((f: any) => {
      const a = f?.attributes || {}
      const code = String(a.codice_casistica || '').trim()
      if (!code) return
      const value = Number(a.importo_riga)
      const qty = Number(a.quantita)
      const ref = String(a.riferimento_attrezzatura_id || '').trim()
      const keys = ref ? [code, `${code}::${ref}`] : [code]
      keys.forEach(key => {
        const cur = statuses[key] || { total: 0, rows: 0, incompleteRows: 0 }
        cur.total += Number.isFinite(value) ? value : 0
        cur.rows += 1
        if (!Number.isFinite(qty) || qty <= 0) cur.incompleteRows += 1
        statuses[key] = cur
      })
    })
    return statuses
  }

  // Attrezzature recuperabili di Art.30 con il relativo riferimento_attrezzatura_id reale
  // (letto dalle righe nota spese effettive, non dal vecchio campo di testo libero) e
  // un'etichetta leggibile risolta tramite il catalogo — usate per verificare, una per una,
  // che ciascuna abbia la propria nota spese compilata (rapporto 1 a 1).
  const getRecuperabiliAttrezzatureRefs = async (parentGlobalId: string): Promise<Array<{ id: string, label: string }>> => {
    const detailUrl = String(props.nsConfig?.detailUrl || '').trim()
    const gid = String(parentGlobalId || '').trim()
    if (!detailUrl || !gid) return []
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: detailUrl, outFields: ['*'] })
    if (typeof fl.load === 'function') { try { await fl.load() } catch {} }
    const q = fl.createQuery ? fl.createQuery() : {}
    q.where = `parent_globalid = ${sqlQuote(gid)}`
    q.outFields = ['codice_casistica', 'riferimento_attrezzatura_id']
    q.returnGeometry = false
    const res = await fl.queryFeatures(q)
    const seen = new Set<string>()
    const ids: string[] = []
    ;(res?.features || []).forEach((f: any) => {
      const a = f?.attributes || {}
      if (String(a.codice_casistica || '').trim() !== 'C104_ATTREZZATURE_DANNEGGIATE') return
      const id = String(a.riferimento_attrezzatura_id || '').trim()
      if (!id || seen.has(id)) return
      seen.add(id)
      ids.push(id)
    })
    if (ids.length === 0) return []
    const catalog = await loadAttrezzatureCatalogPdf(String(props.nsConfig?.attrezzatureParametriUrl || '').trim())
    const items = ids.map(id => ({ id, descrizione: catalog.get(attrezzaturaInstanceTipoCodePdf(id)) || id }))
    const totalsByDescrizione: Record<string, number> = {}
    items.forEach(item => { totalsByDescrizione[item.descrizione] = (totalsByDescrizione[item.descrizione] || 0) + 1 })
    const counters: Record<string, number> = {}
    return items.map(item => {
      let label: string
      if (totalsByDescrizione[item.descrizione] > 1) {
        counters[item.descrizione] = (counters[item.descrizione] || 0) + 1
        label = `${item.descrizione} (${counters[item.descrizione]})`
      } else {
        label = item.descrizione
      }
      return { id: item.id, label }
    })
  }

  const findNotaSpeseWarnings = async (): Promise<{ blocking: string[]; confirmable: string[] }> => {
    // Avvisi persistenti anche negli inoltri successivi del flusso tecnico:
    // TI → RZ, RZ → RI e RI → DT.
    if (!(role === 'TI' || role === 'RZ' || role === 'RI')) return { blocking: [], confirmable: [] }
    const selected = getSelectedNotaSpeseCasisticheCheck(data)
    if (selected.length === 0) return { blocking: [], confirmable: [] }
    const parentGlobalId = String(pickAttrCI(data, ['GlobalID', 'globalid', 'GLOBALID']) || '').trim()
    const statuses = await queryNotaSpeseStatusByCasistica(parentGlobalId)
    const blocking: string[] = []
    const confirmable: string[] = []
    for (const opt of selected) {
      if (opt.codice === 'C104_ATTREZZATURE_DANNEGGIATE') {
        const refs = await getRecuperabiliAttrezzatureRefs(parentGlobalId)
        refs.forEach(ref => {
          const key = `${opt.codice}::${ref.id}`
          const st = statuses[key] || { total: 0, rows: 0, incompleteRows: 0 }
          if (st.incompleteRows > 0) {
            blocking.push(`${opt.label} — ${ref.label}: ${st.incompleteRows} ${st.incompleteRows === 1 ? 'riga senza quantità o con quantità pari a zero' : 'righe senza quantità o con quantità pari a zero'}`)
          }
        })
        continue
      }
      const st = statuses[opt.codice] || { total: 0, rows: 0, incompleteRows: 0 }
      if (st.incompleteRows > 0) {
        blocking.push(`${opt.label}: ${st.incompleteRows} ${st.incompleteRows === 1 ? 'riga senza quantità o con quantità pari a zero' : 'righe senza quantità o con quantità pari a zero'}`)
        continue
      }
      if (Number(st.total || 0) <= 0) confirmable.push(`${opt.label}: 0,00 €`)
    }
    return { blocking, confirmable }
  }

  type CycleContext = { parentGlobalId: string, area: string, settore: string, username: string }

  const isAreaScopedCycleRole = (r: string): boolean => {
    const rr = String(r || '').trim().toUpperCase()
    return rr === 'RI' || rr === 'DT' || rr === 'TI_AMM' || rr === 'RI_AMM' || rr === 'DA'
  }

  const getCurrentCycleContext = (): CycleContext => {
    const giiRole: any = (window as any).__giiUserRole || {}
    const parentGlobalId = String(pickAttrCI(data, ['globalid', 'global_id', 'GlobalID', 'GLOBALID', 'parent_globalid']) || '')
    const area = normalizeAreaLabel(giiRole.areaCod || giiRole.area_cod || giiRole.areaLabel || giiRole.area || pickAttrCI(data, ['area_cod', 'area', 'cod_area']))
    const settore = isAreaScopedCycleRole(role) ? '' : normalizeSettoreLabel(
      area,
      giiRole.settoreCod || giiRole.settore_cod || giiRole.settoreLabel || giiRole.settore || pickAttrCI(data, ['settore_cod', 'settore', 'cod_settore']) || inferSettoreFromUsername(String(giiRole.username || pickAttrCI(data, ['creator', 'Creator', 'editor', 'Editor']) || ''))
    )
    const username = String(giiRole.username || (window as any).__giiUser?.username || '').trim()
    return { parentGlobalId, area, settore, username }
  }

  const getCurrentCycleContextAsync = async (): Promise<CycleContext> => {
    const base = getCurrentCycleContext()
    if (base.parentGlobalId) return base

    const attrs = await queryCurrentRecordAttrs()
    if (!attrs) return base

    const giiRole: any = (window as any).__giiUserRole || {}
    const parentGlobalId = String(pickAttrCI(attrs, ['globalid', 'global_id', 'GlobalID', 'GLOBALID', 'parent_globalid']) || '')
    const area = base.area || normalizeAreaLabel(giiRole.areaCod || giiRole.area_cod || giiRole.areaLabel || giiRole.area || pickAttrCI(attrs, ['area_cod', 'area', 'cod_area']))
    const settore = isAreaScopedCycleRole(role) ? '' : (base.settore || normalizeSettoreLabel(
      area,
      giiRole.settoreCod || giiRole.settore_cod || giiRole.settoreLabel || giiRole.settore || pickAttrCI(attrs, ['settore_cod', 'settore', 'cod_settore']) || inferSettoreFromUsername(String(giiRole.username || pickAttrCI(attrs, ['creator', 'Creator', 'editor', 'Editor']) || ''))
    ))
    return { ...base, parentGlobalId, area, settore }
  }

  /**
   * Risolve lo username del destinatario dato il codice ruolo.
   * TI → ti_assegnato_username, TI_AMM → ti_amm_assegnato_username.
   * Altri ruoli → lookup in GII_utenti per ruolo+area+settore.
   */
  const resolveDestUser = (destRole: string): string => {
    if (!destRole) return ''
    const r = destRole.toUpperCase()
    if (r === 'TI') {
      return String(pickAttrCI(data, ['ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato']) || '').trim()
    }
    if (r === 'TI_AMM') {
      return String(pickAttrCI(data, ['ti_amm_assegnato_username']) || '').trim()
    }

    // Caso speciale: RI_AMM che chiede integrazione tecnica.
    // Il destinatario non è il RI dell'Area Amministrativa, ma il RI
    // dell'area tecnica di provenienza della pratica (AGR o TEC).
    if (role === 'RI_AMM' && r === 'RI') {
      const areaPratica = normalizeAreaLabel(pickAttrCI(data, ['area_cod', 'area', 'cod_area']))
      const settorePratica = normalizeSettoreLabel(areaPratica, pickAttrCI(data, ['settore_cod', 'settore', 'cod_settore']))
      return findDestUsername(_utentiCache, destRole, areaPratica, settorePratica)
    }

    const { area, settore } = getCurrentCycleContext()
    return findDestUsername(_utentiCache, destRole, area, settore)
  }

  const resolveDestUserAsync = async (destRole: string): Promise<string> => {
    await ensureUtentiCache()
    return resolveDestUser(destRole)
  }




  const buildCycleSummary = (eventoApertura: string, eventoChiusura: string, numCampi: number): string => {
    const parts = [String(eventoApertura || 'PRESA_IN_CARICO').trim()]
    if ((numCampi || 0) > 0) parts.push('AGGIORNAMENTO')
    if (eventoChiusura) parts.push(String(eventoChiusura).trim())
    const suffix = (numCampi || 0) > 0
      ? `${numCampi} campi del rapporto aggiornati`
      : 'nessun campo aggiornato'
    return `${parts.filter(Boolean).join(' + ')}: ${suffix}`
  }

  const queryOpenCycle = async (parentGlobalId: string, ruoloCompetente: string) => {
    const targetParts: string[] = []
    if (parentGlobalId) targetParts.push(`(${parentGlobalIdWhere('parent_globalid', parentGlobalId)})`)
    if (oid != null && Number.isFinite(Number(oid))) targetParts.push(`parent_objectid = ${Number(oid)}`)
    if (!targetParts.length) return null
    const logLayer = await getCycleLogLayer()
    if (!logLayer?.queryFeatures) return null
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `(${targetParts.join(' OR ')}) AND ruolo_competente = ${sqlQuote(ruoloCompetente)} AND stato_record = 'APERTO'`
    q.outFields = ['*']
    q.returnGeometry = false
    q.num = 1
    const oidField = String(logLayer.objectIdField || 'OBJECTID')
    q.orderByFields = ['numero_ciclo_ruolo DESC', `${oidField} DESC`]
    const res = await logLayer.queryFeatures(q)
    return res?.features?.[0] || null
  }

  const getNextCycleNumber = async (parentGlobalId: string, ruoloCompetente: string): Promise<number> => {
    if (!parentGlobalId) return 1
    const logLayer = await getCycleLogLayer()
    if (!logLayer?.queryFeatures) return 1
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `(${parentGlobalIdWhere('parent_globalid', parentGlobalId)}) AND ruolo_competente = ${sqlQuote(ruoloCompetente)}`
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
  }

  const openCycleLog = async (opts: { eventoApertura?: string, fase?: string, context?: Partial<CycleContext>, forceNew?: boolean }) => {
    try {
      if (oid == null) return
      const fallbackCtx = opts.context?.parentGlobalId ? null : await getCurrentCycleContextAsync()
      const parentGlobalId = String(opts.context?.parentGlobalId || fallbackCtx?.parentGlobalId || '').trim()
      const area = String(opts.context?.area || fallbackCtx?.area || '').trim()
      const settore = String(opts.context?.settore || fallbackCtx?.settore || '').trim()
      const username = String(opts.context?.username || fallbackCtx?.username || '').trim()
      if (!parentGlobalId) {
        console.warn('[GII_LOG_EVENTI_CICLI] Apertura ciclo saltata: parent_globalid non disponibile.', { oid, role })
        return
      }
      const logLayer = await getCycleLogLayer()
      if (!logLayer?.applyEdits) return
      if (!opts.forceNew) {
        const existing = await queryOpenCycle(parentGlobalId, role)
        if (existing) return
      }
      const nextNum = await getNextCycleNumber(parentGlobalId, role)
      const attrsRaw: Record<string, any> = {
        parent_globalid: parentGlobalId,
        parent_objectid: oid,
        numero_ciclo_ruolo: nextNum,
        ruolo_competente: role,
        utente_operatore: username,
        stato_record: 'APERTO',
        evento_apertura: opts.eventoApertura || 'PRESA_IN_CARICO',
        dt_apertura: Date.now(),
        area,
        settore,
        fase: opts.fase || role,
        session_id: sessionIdRef.current,
        num_campi_modificati: 0,
        campi_modificati: '',
        valori_prima_json: '',
        valori_dopo_json: '',
        riepilogo_ciclo: ''
      }
      const attrs = filterAttrsForLayer(attrsRaw, logLayer)
      const addRes = await logLayer.applyEdits({ addFeatures: [{ attributes: attrs }] })
      const add = addRes?.addFeatureResults?.[0] || addRes?.addResults?.[0] || null
      if (add?.error) throw new Error(add.error.message || JSON.stringify(add.error))
      notifyWorkflowLogChanged()
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Errore apertura ciclo:', e)
    }
  }

  const notifyWorkflowLogChanged = () => {
    // Mantenuta solo come compatibilità interna: il refresh operativo viene
    // eseguito una sola volta dai chiamanti, dopo applyEdits sul record e dopo
    // scrittura del LOG eventi/cicli.
    try { window.dispatchEvent(new CustomEvent('gii-log-eventi-cicli-changed', { detail: { source: 'gii-azioni', oid, role, ts: Date.now() } })) } catch {}
  }

  const parseCycleAuditJson = (v: any): Record<string, any> => {
    if (!v) return {}
    if (typeof v === 'object' && !Array.isArray(v)) return { ...(v as any) }
    try {
      const parsed = JSON.parse(String(v))
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }

  const normalizeCycleAuditComparable = (fieldName: string, v: any): string => {
    const k = String(fieldName || '').trim().toLowerCase()
    if (v == null) return ''
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : String(v.getTime())
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
    if (typeof v === 'boolean') return v ? '1' : '0'
    const raw = String(v).trim()
    if ((k.includes('data') || k.startsWith('dt_')) && /^\d{12,}$/.test(raw)) {
      const n = Number(raw)
      return Number.isFinite(n) ? String(n) : raw
    }
    return raw
  }

  const formatCycleAuditDateTime = (v: any): string => {
    if (v == null || v === '') return ''
    try {
      const n = Number(v)
      const d = Number.isFinite(n) && n > 0 ? new Date(n) : new Date(String(v))
      if (Number.isNaN(d.getTime())) return ''
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yy = String(d.getFullYear())
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${dd}/${mm}/${yy} ${hh}:${mi}`
    } catch {
      return ''
    }
  }

  const toCycleAuditStoredValue = (fieldName: string, v: any): any => {
    const k = String(fieldName || '').trim().toLowerCase()
    if (v == null) return ''
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : formatCycleAuditDateTime(v.getTime())
    if (typeof v === 'number') {
      if (k.includes('data') || k.startsWith('dt_')) return formatCycleAuditDateTime(v) || v
      return Number.isFinite(v) ? v : ''
    }
    if (typeof v === 'boolean') return v ? 1 : 0
    return String(v).trim()
  }

  const isWorkflowAuditField = (fieldName: string): boolean => {
    const k = String(fieldName || '').trim().toLowerCase()
    if (!k) return false
    if (k === 'objectid' || k === 'globalid') return false
    if (k === 'creationdate' || k === 'creator' || k === 'editdate' || k === 'editor') return false
    if (k === 'origine_pratica' || k === 'utente_loggato' || k === 'area_cod' || k === 'settore_cod' || k === 'req_point') return false
    if (k === 'id_ufficio' || k === 'start' || k === 'end') return false
    if (k.startsWith('gii_')) return false
    if (k.startsWith('stato_') || k.startsWith('dt_stato_')) return false
    if (k.startsWith('presa_in_carico_') || k.startsWith('dt_presa_in_carico_')) return false
    if (k.startsWith('esito_') || k.startsWith('dt_esito_')) return false
    if (k.startsWith('ti_assegnato_') || k.startsWith('ri_assegnato_')) return false
    if (k.startsWith('dt_assegnazione_')) return false
    if (k.startsWith('note_')) return false
    if (k.startsWith('ns_')) return false
    if (k.startsWith('dt_')) return false
    return true
  }

  const buildWorkflowActionAuditDelta = (attributesIn: Record<string, any>) => {
    const oldMap: Record<string, any> = {}
    const newMap: Record<string, any> = {}
    const before = data || {}
    for (const field of Object.keys(attributesIn || {})) {
      if (!isWorkflowAuditField(field)) continue
      const prevVal = pickAttrCI(before, [field])
      const nextVal = attributesIn[field]
      if (normalizeCycleAuditComparable(field, prevVal) === normalizeCycleAuditComparable(field, nextVal)) continue
      oldMap[field] = toCycleAuditStoredValue(field, prevVal)
      newMap[field] = toCycleAuditStoredValue(field, nextVal)
    }
    return { oldMap, newMap }
  }

  const mergeWorkflowActionAuditMaps = (baseOld: Record<string, any>, baseNew: Record<string, any>, deltaOld: Record<string, any>, deltaNew: Record<string, any>) => {
    const oldMap: Record<string, any> = { ...(baseOld || {}) }
    const newMap: Record<string, any> = { ...(baseNew || {}) }
    const changedKeys = Array.from(new Set([...Object.keys(deltaOld || {}), ...Object.keys(deltaNew || {})]))
    for (const field of changedKeys) {
      if (!(field in oldMap)) oldMap[field] = deltaOld[field]
      newMap[field] = deltaNew[field]
      if (normalizeCycleAuditComparable(field, oldMap[field]) === normalizeCycleAuditComparable(field, newMap[field])) {
        delete oldMap[field]
        delete newMap[field]
      }
    }
    const fields = Object.keys(newMap).sort((a, b) => a.localeCompare(b))
    return { oldMap, newMap, fields }
  }

  const closeCycleLog = async (opts: { eventoChiusura: string, ruoloDestinatario?: string, utenteDestinatario?: string, noteChiusura?: string, fase?: string, auditOldMap?: Record<string, any>, auditNewMap?: Record<string, any> }) => {
    try {
      if (oid == null) return
      const { parentGlobalId, area, settore, username } = await getCurrentCycleContextAsync()
      if (!parentGlobalId && (oid == null || !Number.isFinite(Number(oid)))) {
        console.warn('[GII_LOG_EVENTI_CICLI] Chiusura ciclo saltata: riferimenti pratica non disponibili.', { oid, role })
        return
      }
      const logLayer = await getCycleLogLayer()
      if (!logLayer?.applyEdits) return
      const feature = await queryOpenCycle(parentGlobalId, role)

      if (!feature?.attributes) {
        if (!parentGlobalId) {
          console.warn('[GII_LOG_EVENTI_CICLI] Nessun ciclo aperto trovato e parent_globalid non disponibile: creazione record chiuso saltata.', { oid, role })
          return
        }
        // Nessun ciclo APERTO trovato (es. TI origine=2 che non passa dalla presa in carico).
        // Creo un record completo direttamente come CHIUSO (apertura + chiusura in un colpo).
        const nextNum = await getNextCycleNumber(parentGlobalId, role)
        const now = Date.now()
        const auditDelta = mergeWorkflowActionAuditMaps({}, {}, opts.auditOldMap || {}, opts.auditNewMap || {})
        const numCampi = auditDelta.fields.length
        const summary = buildCycleSummary('CREAZIONE', opts.eventoChiusura, numCampi)
        const newRaw: Record<string, any> = {
          parent_globalid: parentGlobalId,
          parent_objectid: oid,
          numero_ciclo_ruolo: nextNum,
          ruolo_competente: role,
          utente_operatore: username,
          stato_record: 'CHIUSO',
          evento_apertura: 'CREAZIONE',
          dt_apertura: now,
          evento_chiusura: opts.eventoChiusura,
          dt_chiusura: now,
          ruolo_destinatario: opts.ruoloDestinatario || '',
          utente_destinatario: opts.utenteDestinatario || '',
          note_chiusura: opts.noteChiusura || '',
          area,
          settore,
          fase: opts.fase || role,
          session_id: sessionIdRef.current,
          num_campi_modificati: numCampi,
          campi_modificati: auditDelta.fields.join(', '),
          valori_prima_json: numCampi > 0 ? JSON.stringify(auditDelta.oldMap) : '',
          valori_dopo_json: numCampi > 0 ? JSON.stringify(auditDelta.newMap) : '',
          riepilogo_ciclo: summary
        }
        const newAttrs = filterAttrsForLayer(newRaw, logLayer)
        const addRes = await logLayer.applyEdits({ addFeatures: [{ attributes: newAttrs }] })
        const add = addRes?.addFeatureResults?.[0] || addRes?.addResults?.[0] || null
        if (add?.error) throw new Error(add.error.message || JSON.stringify(add.error))
        notifyWorkflowLogChanged()
        return
      }

      const attrs = feature.attributes || {}
      const auditDelta = mergeWorkflowActionAuditMaps(
        parseCycleAuditJson(attrs.valori_prima_json),
        parseCycleAuditJson(attrs.valori_dopo_json),
        opts.auditOldMap || {},
        opts.auditNewMap || {}
      )
      const numCampi = auditDelta.fields.length
      const summary = buildCycleSummary(String(attrs.evento_apertura || 'PRESA_IN_CARICO'), opts.eventoChiusura, numCampi)
      const updRaw: Record<string, any> = {
        [String(logLayer.objectIdField || 'OBJECTID')]: getObjectIdValue(attrs, logLayer),
        utente_operatore: username || attrs.utente_operatore || '',
        evento_chiusura: opts.eventoChiusura,
        dt_chiusura: Date.now(),
        ruolo_destinatario: opts.ruoloDestinatario || '',
        utente_destinatario: opts.utenteDestinatario || '',
        note_chiusura: opts.noteChiusura || '',
        area: area || attrs.area || '',
        settore: settore || attrs.settore || '',
        fase: opts.fase || attrs.fase || role,
        session_id: sessionIdRef.current,
        num_campi_modificati: numCampi,
        campi_modificati: auditDelta.fields.join(', '),
        valori_prima_json: numCampi > 0 ? JSON.stringify(auditDelta.oldMap) : '',
        valori_dopo_json: numCampi > 0 ? JSON.stringify(auditDelta.newMap) : '',
        riepilogo_ciclo: summary,
        stato_record: 'CHIUSO'
      }
      const upd = filterAttrsForLayer(updRaw, logLayer)
      const updRes = await logLayer.applyEdits({ updateFeatures: [{ attributes: upd }] })
      const updResult = updRes?.updateFeatureResults?.[0] || updRes?.updateResults?.[0] || null
      if (updResult?.error) throw new Error(updResult.error.message || JSON.stringify(updResult.error))
      notifyWorkflowLogChanged()
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Errore chiusura ciclo:', e)
    }
  }

  const getSchemaFieldNameCI = (schemaFields: Record<string, any>, name: string): string | null => {
    const ci: Record<string, string> = {}
    Object.keys(schemaFields || {}).forEach(k => { ci[String(k).toLowerCase()] = k })
    return ci[String(name).toLowerCase()] || null
  }

  const getPracticeAreaForRouting = (): string => {
    return normalizeAreaLabel(pickAttrCI(data, ['area_cod', 'area', 'cod_area']) || getCurrentCycleContext().area)
  }

  const getPracticeSettoreForRouting = (): string => {
    const areaPratica = getPracticeAreaForRouting()
    return normalizeSettoreLabel(areaPratica, pickAttrCI(data, ['settore_cod', 'settore', 'cod_settore']) || getCurrentCycleContext().settore)
  }

  const makeGiiRoleTag = (r: string, opts?: { area?: string, settore?: string }): string => {
    const rr = String(r || '').trim().toUpperCase()
    const area = normalizeAreaLabel(opts?.area || '')
    const settore = normalizeSettoreCod(opts?.settore || '')

    if (rr === 'RI_AMM') return 'RI-AMM'
    if (rr === 'TI_AMM') return 'TI-AMM'
    if (rr === 'DT') return area ? `DIR-${area}` : 'DIR'
    if (rr === 'RI') return area ? `RI-${area}` : 'RI'
    if (rr === 'RZ') return settore ? `RZ-${settore}` : 'RZ'
    if (rr === 'TI') return settore ? `TI-${settore}` : 'TI'
    if (rr === 'TR') return settore ? `TR-${settore}` : 'TR'
    return rr
  }

  const makeGiiActorLabel = (r: string, username: string, opts?: { area?: string, settore?: string }): string => {
    const tag = makeGiiRoleTag(r, opts)
    const user = String(username || '').trim()
    const label = user ? `${tag} - ${user}` : tag
    // I campi GII_da/GII_a sono stringhe brevi; evitiamo errori su username lunghi.
    return label.length > 30 ? label.slice(0, 30) : label
  }

  const makeGiiSenderRoleLabel = (r: string): string => {
    const rr = String(r || '').trim().toUpperCase()
    if (rr === 'TR') return 'Tecnico rilevatore'
    if (rr === 'TI') return 'Tecnico istruttore'
    if (rr === 'RZ') return 'Capo Settore'
    if (rr === 'RI') return 'Responsabile Istruttoria'
    if (rr === 'DT') return 'Direttore d’Area'
    if (rr === 'TI_AMM') return 'Tecnico Istruttore amministrativo'
    if (rr === 'RI_AMM') return 'Responsabile Istruttoria amministrativa'
    if (rr === 'DA') return 'Direttore Area AA. GG. e P.F.'
    return rr || '—'
  }

  const getRoutingMetaForRole = (r: string, opts?: { technicalIntegration?: boolean }) => {
    const rr = String(r || '').trim().toUpperCase()
    const ctx = getCurrentCycleContext()
    const areaPratica = getPracticeAreaForRouting()
    const settorePratica = getPracticeSettoreForRouting()

    if (rr === 'RI_AMM' || rr === 'TI_AMM' || rr === 'DA') {
      return { area: 'AMM', settore: '' }
    }

    // Caso importante: integrazione tecnica chiesta da RI_AMM.
    // Il destinatario è il RI dell'area tecnica di provenienza della pratica,
    // non l'RI dell'Area Amministrativa.
    if (opts?.technicalIntegration && rr === 'RI') {
      return { area: areaPratica || ctx.area, settore: '' }
    }

    if (rr === 'RI' || rr === 'DT') {
      return { area: areaPratica || ctx.area, settore: '' }
    }

    // Per i destinatari settoriali (RZ/TI/TR) va usato il settore della pratica,
    // non il settore del ruolo che sta eseguendo l'azione. Altrimenti, ad esempio,
    // un rimando RI -> RZ finisce sul settore del RI e non sul distretto RZ corretto.
    return { area: areaPratica || ctx.area, settore: settorePratica || ctx.settore }
  }

  const addGiiRoutingFields = (
    upd: Record<string, any>,
    ruoloDest: string,
    mode: 'TRASMISSIONE' | 'INTEGRAZIONE',
    opts?: { technicalIntegration?: boolean, destUsername?: string, externalDestLabel?: string }
  ) => {
    try {
      const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
      const fDa = getSchemaFieldNameCI(schemaFields, 'GII_da')
      const fA = getSchemaFieldNameCI(schemaFields, 'GII_a')
      const fDt = getSchemaFieldNameCI(schemaFields, 'GII_dt')
      const fTrasm = getSchemaFieldNameCI(schemaFields, 'GII_trasm')
      const fRim = getSchemaFieldNameCI(schemaFields, 'GII_rim')
      const fArch = getSchemaFieldNameCI(schemaFields, 'GII_arch')

      const ctx = getCurrentCycleContext()
      const destMeta = getRoutingMetaForRole(ruoloDest, opts)
      const mittente = makeGiiActorLabel(role, ctx.username, { area: ctx.area, settore: ctx.settore })
      const destinatario = String(opts?.externalDestLabel || '').trim() || makeGiiActorLabel(ruoloDest, opts?.destUsername || resolveDestUser(ruoloDest), destMeta)

      if (fDa) upd[fDa] = mittente
      if (fA) upd[fA] = destinatario
      if (fDt) upd[fDt] = Date.now()
      if (fTrasm) upd[fTrasm] = mode === 'TRASMISSIONE' ? 1 : 0
      if (fRim) upd[fRim] = mode === 'INTEGRAZIONE' ? 1 : 0
      if (fArch) upd[fArch] = 0
    } catch {}
  }

  const attivitaLayerRef = React.useRef<any>(null)

  const getAttivitaLayer = async (): Promise<any> => {
    if (attivitaLayerRef.current?.applyEdits) return attivitaLayerRef.current
    await ensureAttivitaCorrentiJsonOnlyQueryFormat()
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: GII_ATTIVITA_CORRENTI_URL, outFields: ['*'] })
    if (typeof fl?.load === 'function') await fl.load()
    attivitaLayerRef.current = fl
    return fl
  }

  const shortReportNumberForActivity = (overrideAttrs?: Record<string, any>): string => {
    const merged = { ...(data || {}), ...(overrideAttrs || {}) }
    return buildPracticeCodeFromData(merged, oid)
  }

  const getActivityParentGlobalId = async (): Promise<string> => {
    const fromData = String(pickAttrCI(data, ['globalid', 'GlobalID', 'GLOBALID', 'global_id', 'parent_globalid']) || '').trim()
    if (fromData) return fromData
    const fresh = await queryCurrentRecordAttrs()
    return String(pickAttrCI(fresh || {}, ['globalid', 'GlobalID', 'GLOBALID', 'global_id', 'parent_globalid']) || '').trim()
  }

  const activitySubTypeFromEvent = (evento: string, ruoloMittente: string, ruoloDest: string, opts?: { technicalIntegration?: boolean }): string => {
    const ev = String(evento || '').trim().toUpperCase()
    const src = String(ruoloMittente || '').trim().toUpperCase()
    const dst = String(ruoloDest || '').trim().toUpperCase()

    if (ev === 'NUOVA_ASSEGNAZIONE') return 'NUOVA_ASSEGNAZIONE'
    if (ev === 'ATTESTAZIONE_CONFORMITA') return 'ATTESTAZIONE_CONFORMITA_TI_AMM'
    if (ev === 'PROPOSTA_CONTESTAZIONE_APPROVATA') return 'PROPOSTA_CONTESTAZIONE_APPROVATA'
    if (ev === 'RAPPORTO_APPROVATO') return 'RAPPORTO_APPROVATO'
    if (ev === 'INTEGRAZIONE_RICHIESTA') return 'RICHIESTA_INTEGRAZIONE'
    if (ev === 'INTEGRAZIONE_TRASMESSA') return 'INTEGRAZIONE_TRASMESSA'
    if (ev === 'INVIO_A_TI_AMM') return 'NUOVA_ASSEGNAZIONE'
    if (ev === 'ISTRUTTORIA_TRASMESSA') return 'NUOVA_ASSEGNAZIONE'
    if (ev === 'RESPINTA') {
      if (src === 'DT') return 'ISTRUTTORIA_TECNICA_RESPINTA'
      return 'RILEVAZIONE_RESPINTA'
    }
    return 'NUOVA_ASSEGNAZIONE'
  }

  const activityTitleForSubtype = (subtipo: string): string => {
    const st = String(subtipo || '').trim().toUpperCase()
    if (st === 'NUOVO_RAPPORTO') return 'Nuova rilevazione'
    if (st === 'RAPPORTO_UFFICIO') return 'Rilevazione'
    if (st === 'NUOVA_ASSEGNAZIONE') return 'Nuova assegnazione'
    if (st === 'ATTESTAZIONE_CONFORMITA_TI_AMM') return 'Attestazione di conformità apposta'
    if (st === 'PROPOSTA_CONTESTAZIONE_APPROVATA') return 'Istruttoria amministrativa approvata'
    if (st === 'RICHIESTA_INTEGRAZIONE') return 'Integrazione richiesta'
    if (st === 'INTEGRAZIONE_TRASMESSA') return 'Integrazione trasmessa'
    if (st === 'RAPPORTO_APPROVATO') return 'Pratica approvata'
    if (st === 'RILEVAZIONE_RESPINTA') return 'Rilevazione respinta'
    if (st === 'ISTRUTTORIA_TECNICA_RESPINTA') return 'Istruttoria tecnica respinta'
    return 'Attività da prendere in carico'
  }

  const activityMessageForSubtype = (subtipo: string, numeroRapporto: string): string => {
    const st = String(subtipo || '').trim().toUpperCase()
    const n = String(numeroRapporto || '').trim() || '—'
    if (st === 'NUOVO_RAPPORTO') return `Rilevazione n. ${n} da prendere in carico.`
    if (st === 'RAPPORTO_UFFICIO') return `Rilevazione n. ${n} da prendere in carico.`
    if (st === 'NUOVA_ASSEGNAZIONE') return `Pratica n. ${n} da prendere in carico.`
    if (st === 'ATTESTAZIONE_CONFORMITA_TI_AMM') return `Attestazione di conformità sulla pratica n. ${n} da prendere in carico.`
    if (st === 'PROPOSTA_CONTESTAZIONE_APPROVATA') return `Istruttoria amministrativa della pratica n. ${n} approvata dal Responsabile dell’istruttoria amministrativa. Pratica da prendere in carico per protocollazione e predisposizione della bozza di determinazione.`
    if (st === 'RICHIESTA_INTEGRAZIONE') return `Integrazione n. ${n} da prendere in carico.`
    if (st === 'INTEGRAZIONE_TRASMESSA') return `Integrazione n. ${n} da prendere in carico.`
    if (st === 'RAPPORTO_APPROVATO') return `Pratica approvata n. ${n} da prendere in carico.`
    if (st === 'RILEVAZIONE_RESPINTA') return `Rilevazione respinta sulla pratica n. ${n}.`
    if (st === 'ISTRUTTORIA_TECNICA_RESPINTA') return `Istruttoria tecnica respinta sulla pratica n. ${n}.`
    return `Pratica n. ${n} da prendere in carico.`
  }

  const activityTitleForEvent = (subtipo: string, evento: string, ruoloMittente: string, ruoloDest: string): string => {
    const ev = String(evento || '').trim().toUpperCase()
    const src = String(ruoloMittente || '').trim().toUpperCase()
    const dst = String(ruoloDest || '').trim().toUpperCase()

    if (ev === 'ISTRUTTORIA_TRASMESSA') {
      if ((src === 'TI' || src === 'TR') && dst === 'RZ') return 'Rilevazione trasmessa'
      if (src === 'RZ' && dst === 'RI') return praticaLabel === 'Rapporto tecnico' ? 'Rapporto tecnico trasmesso' : 'Rilevazione approvata'
      if (src === 'RI' && dst === 'DT') return 'Istruttoria tecnica approvata'
      if (src === 'TI_AMM' && dst === 'RI_AMM') return 'Istruttoria amministrativa trasmessa'
    }

    if (ev === 'PROPOSTA_CONTESTAZIONE_APPROVATA' && src === 'RI_AMM' && dst === 'TI_AMM') return 'Istruttoria amministrativa approvata'
    if (ev === 'ATTESTAZIONE_CONFORMITA' && src === 'TI_AMM' && dst === 'RI_AMM') return 'Attestazione di conformità apposta'
    if (ev === 'INVIO_A_TI_AMM') return 'Istruttoria amministrativa trasmessa'

    return activityTitleForSubtype(subtipo)
  }

  const activityMessageForEvent = (subtipo: string, evento: string, ruoloMittente: string, ruoloDest: string, numeroRapporto: string): string => {
    const ev = String(evento || '').trim().toUpperCase()
    const src = String(ruoloMittente || '').trim().toUpperCase()
    const dst = String(ruoloDest || '').trim().toUpperCase()
    const n = String(numeroRapporto || '').trim() || '—'

    if (ev === 'ISTRUTTORIA_TRASMESSA') {
      if ((src === 'TI' || src === 'TR') && dst === 'RZ') return `Rilevazione n. ${n} da prendere in carico.`
      if (src === 'RZ' && dst === 'RI') return `Istruttoria tecnica n. ${n} da prendere in carico.`
      if (src === 'RI' && dst === 'DT') return `Rapporto tecnico n. ${n} da prendere in carico.`
      if (src === 'TI_AMM' && dst === 'RI_AMM') return `Istruttoria amministrativa n. ${n} da prendere in carico.`
    }

    if (ev === 'PROPOSTA_CONTESTAZIONE_APPROVATA' && src === 'RI_AMM' && dst === 'TI_AMM') return `Il Responsabile dell’istruttoria amministrativa ha approvato l’istruttoria amministrativa della pratica n. ${n}. La pratica può essere presa in carico per protocollazione del fascicolo e predisposizione della bozza di determinazione.`
    if (ev === 'ATTESTAZIONE_CONFORMITA' && src === 'TI_AMM' && dst === 'RI_AMM') return `Il Tecnico Istruttore amministrativo ha apposto il visto di conformità sulla pratica n. ${n}.`
    if (ev === 'INVIO_A_TI_AMM') return `Istruttoria amministrativa n. ${n} da prendere in carico.`

    return activityMessageForSubtype(subtipo, n)
  }

  const normalizeActivityDestRole = (r: string): string => {
    const rr = String(r || '').trim().toUpperCase()
    if (rr === 'TI_AMM' || rr === 'RI_AMM' || rr === 'DA') return rr
    if (rr.startsWith('DT')) return 'DT'
    if (rr.startsWith('RI') && rr !== 'RI_AMM') return 'RI'
    if (rr.startsWith('RZ')) return 'RZ'
    if (rr.startsWith('TI') && rr !== 'TI_AMM') return 'TI'
    return rr
  }

  type DeletedCurrentActivity = {
    alertKey: string
    parentGlobalId: string
    parentObjectId: number | null
  }

  type DeleteCurrentActivitiesResult = {
    deletedActivities: DeletedCurrentActivity[]
    confirmed: boolean
  }

  const deleteCurrentActivitiesForDestRole = async (
    ruoloDestRaw: string,
    excludeKey?: string
  ): Promise<DeleteCurrentActivitiesResult> => {
    const ruoloDest = normalizeActivityDestRole(String(ruoloDestRaw || ''))
    if (!ruoloDest || !hasSel || oid == null) return { deletedActivities: [], confirmed: false }
    try {
      const layer = await getAttivitaLayer()
      const parentGlobalId = await getActivityParentGlobalId()
      const targetParts: string[] = []
      if (parentGlobalId) targetParts.push(`(${parentGlobalIdWhere('parent_globalid', parentGlobalId)})`)
      if (oid != null && Number.isFinite(Number(oid))) targetParts.push(`parent_objectid = ${Number(oid)}`)
      if (!targetParts.length) return { deletedActivities: [], confirmed: false }

      const parts: string[] = [
        `tipo_attivita = 'PRESA_IN_CARICO'`,
        `destinatario_ruolo = ${sqlQuote(ruoloDest)}`,
        `(${targetParts.join(' OR ')})`
      ]
      const key = String(excludeKey || '').trim()
      if (key) parts.push(`chiave_attivita <> ${sqlQuote(key)}`)

      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = parts.join(' AND ')
      q.outFields = ['OBJECTID', 'chiave_attivita', 'parent_globalid', 'parent_objectid']
      q.returnGeometry = false
      const res = await layer.queryFeatures(q)
      const features = Array.isArray(res?.features) ? res.features : []
      const deletableRows = features
        .map((feature: any) => ({
          objectId: feature?.attributes?.OBJECTID,
          attributes: feature?.attributes || {}
        }))
        .filter((row: any) => row.objectId != null)

      const deletes = deletableRows.map((row: any) => ({ objectId: row.objectId }))

      const deletedActivities: DeletedCurrentActivity[] = deletableRows.map((row: any) => {
        const attrs = row.attributes || {}
        const parentObjectIdNum = Number(attrs.parent_objectid)
        return {
          alertKey: String(attrs.chiave_attivita || '').trim(),
          parentGlobalId: String(attrs.parent_globalid || parentGlobalId || '').trim(),
          parentObjectId: Number.isFinite(parentObjectIdNum)
            ? parentObjectIdNum
            : (oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null)
        }
      })

      if (!deletes.length) return { deletedActivities: [], confirmed: true }

      const editResult = await layer.applyEdits({ deleteFeatures: deletes })
      const deleteResults = Array.isArray(editResult?.deleteFeatureResults)
        ? editResult.deleteFeatureResults
        : []

      if (!deleteResults.length) {
        return { deletedActivities, confirmed: true }
      }

      const successfulActivities = deletedActivities.filter((_, index) => {
        const result = deleteResults[index]
        return !result?.error && result?.success !== false
      })
      const confirmed = successfulActivities.length === deletedActivities.length

      if (!confirmed) {
        console.warn('[GII_ATTIVITA_CORRENTI] Alcune attività correnti non sono state eliminate.', {
          ruoloDest,
          oid,
          deleteResults
        })
      }

      return { deletedActivities: successfulActivities, confirmed }
    } catch (e) {
      console.warn('[GII_ATTIVITA_CORRENTI] Errore eliminazione attività corrente per ruolo:', e)
      return { deletedActivities: [], confirmed: false }
    }
  }

  const upsertCurrentActivityForDest = async (
    logOpts: { eventoChiusura: string, ruoloDestinatario?: string, utenteDestinatario?: string, noteChiusura?: string, fase?: string },
    overrideAttrs?: Record<string, any>
  ) => {
    const ruoloDest = normalizeActivityDestRole(String(logOpts?.ruoloDestinatario || ''))
    if (!ruoloDest) return
    const parentGlobalId = await getActivityParentGlobalId()
    if (!parentGlobalId) {
      console.warn('[GII_ATTIVITA_CORRENTI] Creazione attività saltata: GlobalID pratica non disponibile.', { oid, ruoloDest, evento: logOpts?.eventoChiusura })
      return
    }

    try {
      const layer = await getAttivitaLayer()
      const numeroRapporto = shortReportNumberForActivity(overrideAttrs)
      const destMeta = getRoutingMetaForRole(ruoloDest, { technicalIntegration: logOpts?.eventoChiusura === 'INTEGRAZIONE_RICHIESTA' && ruoloDest === 'RI' && role === 'RI_AMM' })
      const areaDest = normalizeAreaLabel(destMeta.area || (ruoloDest === 'DA' || ruoloDest === 'RI_AMM' || ruoloDest === 'TI_AMM' ? 'AMM' : ''))
      // Manteniamo il settore di provenienza nel record dell'attività corrente.
      // La visibilità area-level per RI/DT viene gestita dalla query degli allarmi,
      // non svuotando il dato sul record.
      const settoreDest = normalizeSettoreCod(destMeta.settore || '')
      const subtipo = activitySubTypeFromEvent(logOpts?.eventoChiusura, role, ruoloDest)
      const titolo = activityTitleForEvent(subtipo, logOpts?.eventoChiusura, role, ruoloDest)
      const messaggioBase = activityMessageForEvent(subtipo, logOpts?.eventoChiusura, role, ruoloDest, numeroRapporto)
      const mittenteAllarme = makeGiiSenderRoleLabel(role)
      const messaggio = mittenteAllarme ? `${messaggioBase}\nDa: ${mittenteAllarme}` : messaggioBase
      const destUsername = String(logOpts?.utenteDestinatario || resolveDestUser(ruoloDest) || '').trim()
      const key = `${parentGlobalId}|PRESA_IN_CARICO|${subtipo}|${ruoloDest}|${areaDest}|${settoreDest}|${destUsername}`
      const now = Date.now()

      const attrs: Record<string, any> = {
        chiave_attivita: key,
        parent_globalid: parentGlobalId,
        parent_objectid: oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null,
        numero_rapporto: numeroRapporto,
        tipo_attivita: 'PRESA_IN_CARICO',
        sottotipo_attivita: subtipo,
        titolo,
        messaggio,
        destinatario_ruolo: ruoloDest,
        destinatario_area: areaDest || null,
        destinatario_settore: settoreDest || null,
        destinatario_ufficio_id: null,
        destinatario_ufficio_zona: null,
        destinatario_username: destUsername || null,
        origine_evento: String(logOpts?.eventoChiusura || '').trim().toUpperCase(),
        priorita: 'INFO',
        data_attivazione: now,
        creato_il: now,
        creato_da: String((window as any).__giiUserRole?.username || ''),
        aggiornato_il: now,
        aggiornato_da: String((window as any).__giiUserRole?.username || '')
      }

      // Evita attività correnti residue per lo stesso ruolo sulla stessa pratica.
      // Può accadere nei rimandi/ritrasmissioni, quando cambia il sottotipo e quindi cambia la chiave.
      await deleteCurrentActivitiesForDestRole(ruoloDest, key)

      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = `chiave_attivita = ${sqlQuote(key)}`
      q.outFields = ['OBJECTID']
      q.returnGeometry = false
      q.num = 1
      const found = await layer.queryFeatures(q)
      const existing = found?.features?.[0]?.attributes || null
      if (existing?.OBJECTID != null) {
        await layer.applyEdits({ updateFeatures: [{ attributes: { OBJECTID: existing.OBJECTID, ...attrs } }] })
      } else {
        await layer.applyEdits({ addFeatures: [{ attributes: attrs }] })
      }
      try { window.dispatchEvent(new CustomEvent('gii-alerts-refresh', { detail: { source: 'gii-azioni-upsert-attivita', key, oid, ts: now } })) } catch {}
    } catch (e) {
      console.warn('[GII_ATTIVITA_CORRENTI] Errore creazione/aggiornamento attività corrente:', e)
    }
  }


  const upsertInformativeActivityForDest = async (
    info: InformativeActivityTarget,
    overrideAttrs?: Record<string, any>
  ) => {
    const ruoloDest = normalizeActivityDestRole(String(info?.ruoloDestinatario || ''))
    if (!ruoloDest) return
    const parentGlobalId = await getActivityParentGlobalId()
    if (!parentGlobalId) {
      console.warn('[GII_ATTIVITA_CORRENTI] Creazione informativa saltata: GlobalID pratica non disponibile.', { oid, ruoloDest, sottotipo: info?.sottotipo })
      return
    }

    try {
      const layer = await getAttivitaLayer()
      const now = Date.now()
      const numeroRapporto = shortReportNumberForActivity(overrideAttrs)
      const destMeta = getRoutingMetaForRole(ruoloDest)
      const areaDest = normalizeAreaLabel(destMeta.area || (ruoloDest === 'DA' || ruoloDest === 'RI_AMM' || ruoloDest === 'TI_AMM' ? 'AMM' : ''))
      const settoreDest = normalizeSettoreCod(destMeta.settore || '')
      const destUsername = String(info?.utenteDestinatario || resolveDestUser(ruoloDest) || '').trim()
      // Le informative devono restare archiviabili per singolo destinatario/evento:
      // la chiave include il timestamp e non sostituisce eventuali informative precedenti.
      const key = `${parentGlobalId}|INFORMATIVA|${String(info.sottotipo || 'INFO').trim().toUpperCase()}|${ruoloDest}|${areaDest}|${settoreDest}|${destUsername}|${now}`

      const attrs: Record<string, any> = {
        chiave_attivita: key,
        parent_globalid: parentGlobalId,
        parent_objectid: oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null,
        numero_rapporto: numeroRapporto,
        tipo_attivita: 'INFORMATIVA',
        sottotipo_attivita: String(info.sottotipo || 'INFO').trim().toUpperCase(),
        titolo: String(info.titolo || 'Comunicazione informativa').trim(),
        messaggio: String(info.messaggio || '').trim(),
        destinatario_ruolo: ruoloDest,
        destinatario_area: areaDest || null,
        destinatario_settore: settoreDest || null,
        destinatario_ufficio_id: null,
        destinatario_ufficio_zona: null,
        destinatario_username: destUsername || null,
        origine_evento: String(info.sottotipo || 'INFO').trim().toUpperCase(),
        priorita: String(info.priorita || 'INFO').trim().toUpperCase(),
        data_attivazione: now,
        creato_il: now,
        creato_da: String((window as any).__giiUserRole?.username || ''),
        aggiornato_il: now,
        aggiornato_da: String((window as any).__giiUserRole?.username || '')
      }

      await layer.applyEdits({ addFeatures: [{ attributes: attrs }] })
      try { window.dispatchEvent(new CustomEvent('gii-alerts-refresh', { detail: { source: 'gii-azioni-upsert-informativa', key, oid, ts: now } })) } catch {}
    } catch (e) {
      console.warn('[GII_ATTIVITA_CORRENTI] Errore creazione informativa:', e)
    }
  }

  const deleteCurrentActivityForCurrentRole = async () => {
    if (!hasSel || oid == null) return
    const currentRole = normalizeActivityDestRole(role)
    if (!currentRole) return
    const deletion = await deleteCurrentActivitiesForDestRole(currentRole)
    const deletedActivities = deletion.deletedActivities
    const parentGlobalId = String(
      deletedActivities.find(item => item.parentGlobalId)?.parentGlobalId ||
      await getActivityParentGlobalId() ||
      ''
    ).trim()
    try {
      window.dispatchEvent(new CustomEvent('gii-alerts-refresh', {
        detail: {
          source: 'gii-azioni-delete-attivita',
          oid,
          parentGlobalId,
          deletedActivities,
          deletionConfirmed: deletion.confirmed,
          ts: Date.now()
        }
      }))
    } catch {}
  }


  const dtRiOnlyIntegrationTargets = ['Occorrenza', 'Grado di gravità']
  const isDtIntegrationOnlyRiCompetence = (): boolean => {
    if (role !== 'DT') return false
    if (String(integrationReason || '').trim() !== 'Necessità di integrazione o rettifica') return false
    const selected = (integrationTargets || []).map(v => String(v || '').trim()).filter(Boolean)
    return selected.length > 0 && selected.every(v => dtRiOnlyIntegrationTargets.includes(v))
  }

  const getPrevRoleForIntegration = (target?: 'TI_AMM' | 'TECNICA'): string => {
    if (role === 'RZ')     return 'TI'
    if (role === 'RI')     return 'TI'
    if (role === 'DT')     return isDtIntegrationOnlyRiCompetence() ? 'RI' : 'TI'
    if (role === 'RI_AMM') {
      // RI_AMM ha due percorsi distinti di richiesta integrazione:
      // - amministrativa verso il TI_AMM assegnato;
      // - tecnica verso il RI dell'area di provenienza (AGR o TEC).
      if (target === 'TI_AMM') return 'TI_AMM'
      return 'RI'
    }
    // TI_AMM: sia il visto positivo sia il rimando/non conformità rientrano al RI_AMM.
    // Il TI_AMM non gestisce più un invio separato dalla maschera amministrativa.
    if (role === 'TI_AMM') return 'RI_AMM'
    return ''
  }

  const getNextRoleForForward = (): string => {
    if (role === 'TI')     return 'RZ'
    if (role === 'RZ')     return 'RI'
    if (role === 'RI')     return 'DT'
    if (role === 'DT')     return 'RI_AMM'   // DT approva e trasmette direttamente a RI_AMM (fase sanzionatoria)
    if (role === 'RI_AMM') {
      const detStato = String(pickAttrCI(data, ['determinazione_stato', 'DETERMINAZIONE_STATO']) || '').trim().toUpperCase()
      // RI_AMM interviene solo dopo la trasmissione interna della bozza determinazione.
      // Il solo visto di conformità TI_AMM NON apre un nodo operativo RI_AMM.
      if (detStato === 'TRASMESSA_RI_AMM' || detStato === 'BOZZA_TRASMESSA_RI_AMM') return 'TI_AMM'
      // Fallback per viste che non espongono determinazione_stato: la trasmissione
      // della bozza apre comunque il nodo RI_AMM con stato/presa 1 o 2.
      const statoRiAmm = toNumOrNull(pickAttrCI(data, ['stato_RI_AMM', 'STATO_RI_AMM']))
      const presaRiAmm = toNumOrNull(pickAttrCI(data, ['presa_in_carico_RI_AMM', 'PRESA_IN_CARICO_RI_AMM']))
      const statoTiAmm = toNumOrNull(pickAttrCI(data, ['stato_TI_AMM', 'STATO_TI_AMM']))
      const esitoTiAmm = toNumOrNull(pickAttrCI(data, ['esito_TI_AMM', 'ESITO_TI_AMM']))
      const riAmmOpen = statoRiAmm === STATO_DA_PRENDERE || statoRiAmm === STATO_PRESA_IN_CARICO || presaRiAmm === PRESA_DA_PRENDERE || presaRiAmm === PRESA_IN_CARICO
      if (riAmmOpen && esitoTiAmm === ESITO_APPROVATA && statoTiAmm === STATO_APPROVATA) return 'TI_AMM'
      return ''
    }
    if (role === 'TI_AMM') {
      const detStato = String(pickAttrCI(data, ['determinazione_stato', 'DETERMINAZIONE_STATO']) || '').trim().toUpperCase()
      return (detStato === 'TRASMESSA_RI_AMM' || detStato === 'BOZZA_TRASMESSA_RI_AMM') ? 'RI_AMM' : ''
    }
    return ''
  }

  /**
   * Se il ruolo corrente sta rispondendo a una richiesta di integrazione,
   * deve ritrasmettere direttamente al ruolo che l'ha richiesta, non al normale
   * destinatario della catena ordinaria.
   * Esempi:
   * - RI_AMM chiede integrazione a RI → RI risponde direttamente a RI_AMM
   * - DT chiede integrazione a RI → RI risponde direttamente a DT
   * - RI chiede integrazione a TI → TI integra, ma ritrasmette comunque al RZ
   */
  const getIntegrationRequesterForCurrentRole = (): string => {
    if (!data) return ''
    const requesterByResponder: Record<string, string[]> = {
      // Il TI ritrasmette sempre al RZ, anche quando l'integrazione è stata richiesta dal RI:
      // il workflow tecnico non prevede il bypass TI → RI.
      TI: ['RZ'],
      // Caso speciale: RI_AMM -> RI è integrazione tecnica.
      // Il RI, dopo l'integrazione, NON deve tornare direttamente a RI_AMM:
      // deve ritrasmettere a DT, che poi approverà e rimanderà a RI_AMM.
      // Per questo qui il requester diretto del RI resta solo DT.
      RI: ['DT'],
      RI_AMM: ['TI_AMM']
    }
    const candidates = requesterByResponder[role] || []
    for (const requester of candidates) {
      const esitoReq = toNumOrNull(pickAttrCI(data, [`esito_${requester}`, `ESITO_${requester}`]))
      if (esitoReq === ESITO_INTEGRAZIONE) return requester
    }
    return ''
  }


  // --- Apertura scheda pratica (tecnica/amministrativa) ---
  // Regola generale:
  // - se la pratica è da prendere in carico dal ruolo corrente, prima va presa in carico;
  // - se è nella disponibilità del ruolo corrente, si apre in gestione;
  // - in tutti gli altri casi si apre in sola consultazione.
  const ec = props.editConfig
  const isTechEditRole = role === 'TI' || role === 'RZ' || role === 'RI' || role === 'DT'
  const isAmmEditRole = role === 'TI_AMM' || role === 'RI_AMM' || role === 'DA'
  const canShowEdit = ec.show && (isTechEditRole || isAmmEditRole)
  const roleStatoField = `stato_${role}`
  const rolePresaField = `presa_in_carico_${role}`
  const roleEsitoField = `esito_${role}`

  const statoRoleVal = data ? pickAttrCI(data, [roleStatoField, roleStatoField.toUpperCase()]) : null
  const presaRoleVal = data ? pickAttrCI(data, [rolePresaField, rolePresaField.toUpperCase()]) : null
  const statoRoleNum = toNumOrNull(statoRoleVal)
  const presaRoleNum = toNumOrNull(presaRoleVal)
  const currentGiiUser: any = (window as any).__giiUserRole || (window as any).__giiUser || {}
  const currentTiUsername = String(currentGiiUser?.username || '').trim().toLowerCase()
  const assignedTiUsername = role === 'TI'
    ? String(pickAttrCI(data, ['ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato']) || '').trim().toLowerCase()
    : ''
  const isOwnedByCurrentRole = role === 'TI_AMM'
    ? isPracticeAssignedToCurrentTiAmm(data, currentGiiUser)
    : role === 'TI'
      ? (!!currentTiUsername && !!assignedTiUsername && currentTiUsername === assignedTiUsername)
      : (role === 'RZ' || role === 'RI' || role === 'DT' || role === 'RI_AMM' || role === 'DA')

  const tiAmmGateStatus = props.accessGate?.status || 'idle'
  const tiAmmAccessDenied = role === 'TI_AMM' && (
    tiAmmGateStatus === 'denied' ||
    (hasSel && tiAmmGateStatus !== 'allowed' && !isOwnedByCurrentRole)
  )

  const isMeaningfulAudit = (v: any): boolean => !(v === null || v === undefined || v === '' || v === 0 || v === '0')
  const roleEsitoValue = pickAttrCI(data, [roleEsitoField, roleEsitoField.toUpperCase()])
  const roleEsitoNum = toNumOrNull(roleEsitoValue)
  const determinazioneStatoCorrente = String(pickAttrCI(data, ['determinazione_stato', 'DETERMINAZIONE_STATO']) || '').trim().toUpperCase()
  const determinazioneRegistrataCorrente =
    !isEmptyValue(pickAttrCI(data, ['determinazione_numero', 'DETERMINAZIONE_NUMERO'])) &&
    !isEmptyValue(pickAttrCI(data, ['determinazione_data', 'DETERMINAZIONE_DATA']))
  const determinazioneAdottataCorrente = determinazioneStatoCorrente === 'ADOTTATA' || determinazioneRegistrataCorrente
  const attoContestazioneWorkflowAttivo = determinazioneRegistrataCorrente &&
    !isEmptyValue(pickAttrCI(data, ['accertamento_numero', 'ACCERTAMENTO_NUMERO'])) &&
    ['BOZZA', 'TRASMESSA_RI_AMM', 'VALIDATA_RI_AMM', 'EMAIL_DIRETTORE_PREPARATA'].includes(determinazioneStatoCorrente)

  const parseTiAmmRetakeMs = (v: any): number | null => {
    if (v == null || v === '') return null
    if (typeof v === 'number' && Number.isFinite(v)) return v
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return n
    const t = Date.parse(String(v))
    return Number.isFinite(t) ? t : null
  }

  const tiAmmRiAmmReturnTimes = [
    parseTiAmmRetakeMs(pickAttrCI(data, ['dt_esito_RI_AMM', 'DT_ESITO_RI_AMM'])),
    parseTiAmmRetakeMs(pickAttrCI(data, ['dt_stato_RI_AMM', 'DT_STATO_RI_AMM']))
  ].filter((v): v is number => v !== null)
  const tiAmmLastRiAmmReturnMs = tiAmmRiAmmReturnTimes.length ? Math.max(...tiAmmRiAmmReturnTimes) : null
  const tiAmmLastPresaMs = parseTiAmmRetakeMs(pickAttrCI(data, ['dt_presa_in_carico_TI_AMM', 'DT_PRESA_IN_CARICO_TI_AMM']))
  const tiAmmRiAmmReturnEsito = toNumOrNull(pickAttrCI(data, ['esito_RI_AMM', 'ESITO_RI_AMM']))
  const tiAmmRiAmmReturnStato = toNumOrNull(pickAttrCI(data, ['stato_RI_AMM', 'STATO_RI_AMM']))
  const tiAmmHasReturnFromRiAmm = role === 'TI_AMM' &&
    (!determinazioneAdottataCorrente || attoContestazioneWorkflowAttivo) &&
    tiAmmLastRiAmmReturnMs !== null &&
    (
      tiAmmRiAmmReturnEsito === ESITO_APPROVATA ||
      tiAmmRiAmmReturnEsito === ESITO_INTEGRAZIONE ||
      tiAmmRiAmmReturnStato === STATO_APPROVATA ||
      tiAmmRiAmmReturnStato === STATO_INTEGRAZIONE
    )
  const tiAmmAwaitingRetakeFromRiAmm = tiAmmHasReturnFromRiAmm &&
    (tiAmmLastPresaMs === null || tiAmmLastPresaMs < tiAmmLastRiAmmReturnMs!)
  const tiAmmAvailableAfterRiAmmReturn = tiAmmHasReturnFromRiAmm && !tiAmmAwaitingRetakeFromRiAmm

  const inChargeByRole =
    !tiAmmAwaitingRetakeFromRiAmm &&
    (
      presaRoleNum === PRESA_IN_CARICO ||
      statoRoleNum === STATO_PRESA_IN_CARICO
    )
  const statoTiAmmForBozza = toNumOrNull(pickAttrCI(data, ['stato_TI_AMM', 'STATO_TI_AMM']))
  const esitoTiAmmForBozza = toNumOrNull(pickAttrCI(data, ['esito_TI_AMM', 'ESITO_TI_AMM']))
  const riAmmOperationalNodeForBozza = role === 'RI_AMM' && (
    statoRoleNum === STATO_DA_PRENDERE ||
    statoRoleNum === STATO_PRESA_IN_CARICO ||
    presaRoleNum === PRESA_DA_PRENDERE ||
    presaRoleNum === PRESA_IN_CARICO
  )
  const riAmmBozzaDeterminazioneDaVerificare = role === 'RI_AMM' &&
    !determinazioneAdottataCorrente &&
    roleEsitoNum !== ESITO_APPROVATA &&
    (
      determinazioneStatoCorrente === 'TRASMESSA_RI_AMM' ||
      determinazioneStatoCorrente === 'BOZZA_TRASMESSA_RI_AMM' ||
      (riAmmOperationalNodeForBozza && esitoTiAmmForBozza === ESITO_APPROVATA)
    )
  const riAmmAttoContestazioneDaVerificare = role === 'RI_AMM' &&
    determinazioneRegistrataCorrente &&
    determinazioneStatoCorrente === 'TRASMESSA_RI_AMM' &&
    roleEsitoNum !== ESITO_APPROVATA
  const tiAmmAttestazioneOperativa = role === 'TI_AMM' && roleEsitoNum === ESITO_APPROVATA && (
    !determinazioneStatoCorrente ||
    determinazioneStatoCorrente === 'BOZZA'
  )

  const roleClosedOrForwarded =
    (isMeaningfulAudit(roleEsitoValue) && !tiAmmAttestazioneOperativa && !tiAmmAvailableAfterRiAmmReturn) ||
    (statoRoleNum === STATO_APPROVATA && !tiAmmAttestazioneOperativa && !tiAmmAvailableAfterRiAmmReturn) ||
    (statoRoleNum === STATO_RESPINTA) ||
    (statoRoleNum != null && statoRoleNum > STATO_PRESA_IN_CARICO && !tiAmmAttestazioneOperativa && !tiAmmAvailableAfterRiAmmReturn)

  const riAmmHasOperationalNode = role === 'RI_AMM' && (
    statoRoleNum === STATO_DA_PRENDERE ||
    statoRoleNum === STATO_PRESA_IN_CARICO ||
    presaRoleNum === PRESA_DA_PRENDERE ||
    presaRoleNum === PRESA_IN_CARICO
  )
  const riAmmBlockedByTiAmmVistoOnly = role === 'RI_AMM' && !riAmmBozzaDeterminazioneDaVerificare && !riAmmAttoContestazioneDaVerificare && !riAmmHasOperationalNode &&
    toNumOrNull(pickAttrCI(data, ['esito_TI_AMM', 'ESITO_TI_AMM'])) === ESITO_APPROVATA

  const canEdit =
    role !== 'DA' &&
    hasSel &&
    !loading &&
    pending === null &&
    canShowEdit &&
    !!isOwnedByCurrentRole &&
    inChargeByRole &&
    !roleClosedOrForwarded &&
    !riAmmBlockedByTiAmmVistoOnly &&
    !(role === 'RI_AMM' && determinazioneAdottataCorrente && !riAmmAttoContestazioneDaVerificare)

  const roleToBeTakenInCharge =
    role !== 'DA' &&
    isOwnedByCurrentRole &&
    !riAmmBlockedByTiAmmVistoOnly &&
    (
      statoRoleNum === STATO_DA_PRENDERE ||
      presaRoleNum === PRESA_DA_PRENDERE ||
      ((riAmmBozzaDeterminazioneDaVerificare || riAmmAttoContestazioneDaVerificare) && !inChargeByRole && roleEsitoNum == null) ||
      tiAmmAwaitingRetakeFromRiAmm
    )

  // Tutti i ruoli abilitati alla scheda possono aprire la pratica anche quando non è
  // nella propria disponibilità: in quel caso l'apertura è sempre in sola consultazione.
  // Unica eccezione: se la pratica è da prendere in carico dal ruolo corrente, la presa
  // in carico è obbligatoria prima di qualsiasi apertura, anche in sola lettura.
  const canOpenReadOnly =
    hasSel &&
    !loading &&
    pending === null &&
    canShowEdit &&
    !canEdit &&
    !roleToBeTakenInCharge

  const canOpenEditPage = canEdit || canOpenReadOnly
  const openInReadOnly = canOpenReadOnly

  const editButtonTitle = canEdit
    ? (isAmmEditRole ? 'Apri la gestione amministrativa della pratica' : 'Apri la gestione tecnica della pratica')
    : (openInReadOnly
      ? (isAmmEditRole
        ? 'Apri la gestione amministrativa in sola consultazione: la pratica non è attualmente nella disponibilità del ruolo corrente.'
        : 'Apri la gestione tecnica in sola consultazione: la pratica non è attualmente nella disponibilità del ruolo corrente.')
      : (roleToBeTakenInCharge
        ? 'La pratica deve essere presa in carico prima di poter essere aperta.'
        : 'Apertura gestione pratica non disponibile: selezionare una pratica.'))

  const openEditPage = (requestedSection?: 'violazione') => {
    if (!canOpenEditPage) return
    try {
      const payload = stampGiiPracticePayload({
        oid,
        data: { ...data },
        idFieldName: active?.state?.idFieldName || 'OBJECTID',
        dsId: active?.state?.ds?.id ?? null,
        layerUrl: active?.state?.ds?.getDataSourceJson?.()?.url ?? active?.state?.ds?.dataSourceJson?.url ?? null,
        readOnly: openInReadOnly,
        readOnlyMessage: openInReadOnly
          ? 'Pratica aperta in consultazione. Le modifiche sono consentite solo nei casi previsti dal ruolo e dallo stato istruttorio.'
          : '',
        ts: Date.now()
      })
      ;(window as any).__giiEdit = payload
      try { sessionStorage.setItem('GII_EDIT_INTENT', JSON.stringify(payload)) } catch {}
      try { window.dispatchEvent(new CustomEvent('gii-edit-intent-changed')) } catch {}
      if (requestedSection) {
        try { sessionStorage.setItem('GII_EDIT_TAB', requestedSection) } catch {}
        try { sessionStorage.setItem('GII_NAV_SECTION', requestedSection) } catch {}
        try { sessionStorage.setItem('GII_REQUESTED_EDIT_SECTION', requestedSection) } catch {}
        try { window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: requestedSection } })) } catch {}
      } else if (!isAmmEditRole) {
        try { sessionStorage.removeItem('GII_NAV_SECTION') } catch {}
        try { sessionStorage.removeItem('GII_REQUESTED_EDIT_SECTION') } catch {}
        try { sessionStorage.setItem('GII_EDIT_TAB', 'anagrafica') } catch {}
        try { window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: 'anagrafica' } })) } catch {}
      } else {
        try { sessionStorage.removeItem('GII_NAV_SECTION') } catch {}
        try { sessionStorage.removeItem('GII_REQUESTED_EDIT_SECTION') } catch {}
        try { sessionStorage.removeItem('GII_EDIT_TAB') } catch {}
      }
    } catch { }
    const resolveConfiguredPageId = (pageTokenRaw: string): string | null => {
      const tok0 = String(pageTokenRaw || '').trim()
      if (!tok0) return null
      let tok = tok0.replace(/^#+\/?/, '').replace(/^\/+/, '')
      if (tok.startsWith('page/')) tok = tok.slice(5)
      try {
        const state: any = getAppStore?.()?.getState?.()
        const appConfig: any = state?.appConfig
        const rawPages: any = appConfig?.pages ?? {}
        const pagesMap: any = rawPages?.asMutable ? rawPages.asMutable({ deep: true }) : (rawPages?.toJS ? rawPages.toJS() : rawPages)
        if (pagesMap && pagesMap[tok]) return tok
      } catch {}
      return null
    }

    const pageToken = String(isAmmEditRole ? (ec.ammPageId || 'page_48') : (ec.pageId || 'page_45')).trim()
    const pageId = resolveConfiguredPageId(pageToken)
    if (!pageId) {
      const expected = isAmmEditRole ? 'page_48' : 'page_45'
      setMsg({ kind: 'err', text: `Pagina di modifica non trovata: ${pageToken || '(vuota)'}. Correggere il setting del widget: valore atteso ${expected}.` })
      return
    }
    try {
      UrlManager.getInstance().changePage(pageId)
    } catch (e: any) {
      setMsg({ kind: 'err', text: `Errore apertura pagina di modifica: ${e?.message || String(e)}` })
    }
  }

  const handleEditPage = () => {
    openEditPage()
  }

  const openViolationFromDenyPopup = () => {
    if (!canOpenEditPage) return
    setDenyPopupMessages([])
    setActionsMenuOpen(false)
    setWorkflowSubmitting(false)
    setPending(null)
    setLoading(false)
    setMsg(null)
    setConfirmAttempted(false)
    setWorkflowEsitoChoice('')
    setWorkflowRimandoChoice('')
    resetStructuredReasons()
    openEditPage('violazione')
  }

  // Leggi i valori in modo robusto:
  // - se il campo non esiste nello schema, non usarlo
  // - se esiste ma arriva con case diversa, risolvi tramite schema CI
  const presaFieldExists = hasDedicatedPresaField(role) && hasField(presaField)
  const dtPresaFieldExists = hasField(dtPresaField)
  const statoFieldExists = hasField(statoField)

  const presaVal = (data && presaFieldExists) ? data[realFieldName(presaField)] : null
  const statoVal = (data && statoFieldExists) ? data[realFieldName(statoField)] : (data ? data[statoField] : null)
  const esitoVal = data ? data[realFieldName(esitoField)] : null

  const presaNumRaw = toNumOrNull(presaVal)
  const statoNum = toNumOrNull(statoVal)
  // Se il campo presa_in_carico_* non esiste (molto comune per RZ/TI in alcune viste),
  // interpretiamo "presa" = stato (stato=2 significa presa in carico).
  const presaNum = presaFieldExists ? presaNumRaw : statoNum
  const origineVal = data ? data['origine_pratica'] : null
  // origine_pratica può arrivare come codice numerico (1/2) oppure come label ("TR"/"TI").
  let origineNum: number | null = null
  if (origineVal != null && String(origineVal) !== '') {
    const n = Number(origineVal)
    if (Number.isFinite(n)) origineNum = n
    else {
      const s = String(origineVal).trim().toUpperCase()
      if (s === 'TR') origineNum = 1
      else if (s === 'TI') origineNum = 2
    }
  }

  const parseMsAny = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null
    if (typeof v === 'number' && Number.isFinite(v)) return v
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return n
    const t = Date.parse(String(v))
    return Number.isFinite(t) ? t : null
  }

  const getRoleLastTouchMs = (d: any, r: string): number | null => {
    if (!d) return null
    const vals = [
      parseMsAny(pickAttrCI(d, [`dt_presa_in_carico_${r}`, `DT_PRESA_IN_CARICO_${r}`])),
      parseMsAny(pickAttrCI(d, [`dt_stato_${r}`, `DT_STATO_${r}`])),
      parseMsAny(pickAttrCI(d, [`dt_esito_${r}`, `DT_ESITO_${r}`]))
    ].filter((v): v is number => v !== null)
    return vals.length ? Math.max(...vals) : null
  }

  const computeAwaitingRetakeByRZ = (d: any): boolean => {
    if (!d) return false
    const opVal = pickAttrCI(d, ['origine_pratica', 'ORIGINE_PRATICA'])
    let opNum: number | null = null
    if (opVal != null && String(opVal) !== '') {
      const n = Number(opVal)
      if (Number.isFinite(n)) opNum = n
      else {
        const s = String(opVal).trim().toUpperCase()
        if (s === 'TR') opNum = 1
        else if (s === 'TI') opNum = 2
      }
    }
    if (!(opNum == null || opNum === 1)) return false

    const tiUserRaw = pickAttrCI(d, ['ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato'])
    const tiNameRaw = pickAttrCI(d, ['ti_assegnato_nome', 'ti_assegnatoName', 'TI_ASSEGNATO_NOME'])
    const dtAssegnaRaw = pickAttrCI(d, ['dt_assegnazione_ti', 'dt_assegnazione_TI', 'DT_ASSEGNAZIONE_TI'])
    const hasTiAssignedLocal = !isEmptyValue(tiUserRaw) || !isEmptyValue(tiNameRaw) || !isEmptyValue(dtAssegnaRaw)
    if (!hasTiAssignedLocal) return false

    const higherTouchedLocal =
      (toNumOrNull(pickAttrCI(d, ['presa_in_carico_RI', 'PRESA_IN_CARICO_RI'])) != null) ||
      (toNumOrNull(pickAttrCI(d, ['stato_RI', 'STATO_RI'])) != null) ||
      (toNumOrNull(pickAttrCI(d, ['esito_RI', 'ESITO_RI'])) != null) ||
      (toNumOrNull(pickAttrCI(d, ['stato_DT', 'STATO_DT'])) != null) ||
      (toNumOrNull(pickAttrCI(d, ['esito_DT', 'ESITO_DT'])) != null)
    if (higherTouchedLocal) return false

    const statoTiLocal = toNumOrNull(pickAttrCI(d, ['stato_TI', 'stato_ti', 'STATO_TI']))
    const esitoTiLocal = toNumOrNull(pickAttrCI(d, ['esito_TI', 'esito_ti', 'ESITO_TI']))
    const tiReturnedLocal = (esitoTiLocal != null) || (statoTiLocal === STATO_APPROVATA) || (statoTiLocal === STATO_RESPINTA)
    if (!tiReturnedLocal) return false

    const tiLast = getRoleLastTouchMs(d, 'TI')
    const rzLast = getRoleLastTouchMs(d, 'RZ')
    return tiLast != null && (rzLast == null || rzLast <= tiLast)
  }

  const awaitingRetakeByRz = data ? computeAwaitingRetakeByRZ(data) : false
  const forceCurrentRoleRetake = (awaitingRetakeByRz && role === 'RZ') || tiAmmAwaitingRetakeFromRiAmm
  const effectiveStatoNum = forceCurrentRoleRetake ? STATO_DA_PRENDERE : statoNum
  const effectivePresaNum = forceCurrentRoleRetake ? PRESA_DA_PRENDERE : presaNum

  // Matrice_DT: DT trasmette al RI AMM. Nessun lock basato sul vecchio nodo DA.
  const lockedByTransmit = false

  // quando cambio selezione: torno libero (nessuna memoria)
  React.useEffect(() => {
    if (!selectionKey) {
      setMsg({ kind: 'info', text: 'Selezionare una riga.' })
      setPending(null)
      setActionsMenuOpen(false)
      setWorkflowSubmitting(false)
      setLoading(false)
      setConfirmAttempted(false)
      noteOrigRef.current = ''
      setNoteDraft('')
      resetStructuredReasons()
      setTiSelected('')
      setTiLoadErr('')
      return
    }

    setMsg(null)
    setPending(null)
    setActionsMenuOpen(false)
    setWorkflowSubmitting(false)
    setLoading(false)
    setConfirmAttempted(false)

    const v = (data && data[noteField] != null) ? String(data[noteField]) : ''
    noteOrigRef.current = v
    setNoteDraft(v)
    resetStructuredReasons()
    setTiSelected('')
    setTiLoadErr('')

    window.setTimeout(() => autoResizeNote(noteRef.current), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey])

  React.useEffect(() => {
    const t = window.setTimeout(() => autoResizeNote(noteRef.current), 0)
    return () => window.clearTimeout(t)
  }, [noteDraft, autoResizeNote])

  // Carica elenco TI da GII_utenti (ruolo=2). Filtra per area/settore se disponibili.
  const loadTiOptions = React.useCallback(async () => {
    if (tiLoading) return
    setTiLoading(true)
    setTiLoadErr('')
    try {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const fl = new FeatureLayer({ url: GII_UTENTI_URL })
      if (typeof fl?.load === 'function') {
        try { await fl.load() } catch {}
      }

      const u: any = (window as any).__giiUserRole || {}
      const areaCod = normalizeAreaLabel(u?.areaCod || u?.area_cod || u?.areaLabel || u?.area)
      const settoreCod = normalizeSettoreLabel(areaCod, u?.settoreCod || u?.settore_cod || u?.settoreLabel || u?.settore)
      const area = areaCod ? AREA_NUM[areaCod] : null
      const settore = settoreCod ? SETTORE_NUM[settoreCod] : null

      const codNumWhere = (codField: string, cod: string, numField: string, num: number | null | undefined): string => {
        const parts: string[] = []
        if (cod) {
          parts.push(`${codField} = ${sqlQuote(cod)}`)
          if (codField === 'settore_cod' && cod === 'DS') parts.push(`${codField} = ${sqlQuote('CS')}`)
        }
        if (num != null) parts.push(`${numField} = ${num}`)
        return parts.length ? `(${parts.join(' OR ')})` : '1=1'
      }
      const tiRoleWhere = codNumWhere('ruolo_cod', 'TI', 'ruolo', RUOLO_NUM.TI)
      const areaWhere = codNumWhere('area_cod', areaCod, 'area', area)
      const settoreWhere = codNumWhere('settore_cod', settoreCod, 'settore', settore)

      const runQuery = async (where: string): Promise<TiOpt[]> => {
        const q: any = (typeof fl.createQuery === 'function') ? fl.createQuery() : {}
        q.where = where
        q.outFields = ['username', 'full_name', 'area', 'settore', 'ruolo_cod', 'area_cod', 'settore_cod']
        q.returnGeometry = false
        q.num = 2000
        const res: any = await fl.queryFeatures(q)
        const feats: any[] = res?.features || []
        const opts: TiOpt[] = feats.map((f: any) => {
          const a: any = f?.attributes || {}
          const username = String(a.username || '').trim()
          const fullName = String(a.full_name || a.fullName || a.nome || '').trim()
          return { username, fullName: (fullName || username) }
        }).filter(o => !!o.username)
        opts.sort((a, b) => (a.fullName || a.username).localeCompare((b.fullName || b.username), 'it', { sensitivity: 'base' }))
        return opts
      }

      let opts: TiOpt[] = []
      if (areaCod && settoreCod) {
        opts = await runQuery(`${tiRoleWhere} AND ${areaWhere} AND ${settoreWhere}`).catch((): TiOpt[] => [])
      }
      if (!opts.length && areaCod) {
        opts = await runQuery(`${tiRoleWhere} AND ${areaWhere}`).catch((): TiOpt[] => [])
      }
      if (!opts.length) {
        opts = await runQuery(tiRoleWhere).catch((): TiOpt[] => [])
      }
      setTiOptions(opts)
    } catch (e: any) {
      setTiLoadErr(e?.message ? String(e.message) : String(e))
    } finally {
      setTiLoading(false)
    }
  }, [tiLoading])

  React.useEffect(() => {
    if (pending !== 'ASSEGNA_TI') return
    if (role !== 'RZ') return
    void loadTiOptions()
  }, [pending, role, loadTiOptions])

  // ── Carica opzioni TI_AMM (per RI_AMM) ──
  const loadTiAmmOptions = React.useCallback(async () => {
    if (tiAmmLoadingRef.current) return
    tiAmmLoadingRef.current = true
    setTiAmmLoading(true)
    setTiAmmLoadErr('')
    try {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const fl = new FeatureLayer({ url: GII_UTENTI_URL })
      if (typeof fl?.load === 'function') { try { await fl.load() } catch {} }
      const q: any = (typeof fl.createQuery === 'function') ? fl.createQuery() : {}
      q.where = `(ruolo_cod = ${sqlQuote('TI')} OR ruolo = ${RUOLO_NUM.TI}) AND (area_cod = ${sqlQuote('AMM')} OR area = ${AREA_NUM.AMM})`  // TI con area AMM
      q.outFields = ['username', 'full_name', 'area', 'settore', 'ruolo_cod', 'area_cod', 'settore_cod']
      q.returnGeometry = false
      q.num = 2000
      const res: any = await fl.queryFeatures(q)
      const feats: any[] = res?.features || []
      const opts: TiOpt[] = feats.map((f: any) => {
        const a: any = f?.attributes || {}
        const username = String(a.username || '').trim()
        const fullName = String(a.full_name || a.fullName || a.nome || '').trim()
        return { username, fullName: (fullName || username) }
      }).filter(o => !!o.username)
      opts.sort((a, b) => (a.fullName || a.username).localeCompare((b.fullName || b.username), 'it', { sensitivity: 'base' }))
      setTiAmmOptions(opts)
    } catch (e: any) {
      setTiAmmLoadErr(e?.message ? String(e.message) : String(e))
    } finally {
      tiAmmLoadingRef.current = false
      setTiAmmLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (pending !== 'ASSEGNA_TI_AMM') return
    if (role !== 'RI_AMM') return
    void loadTiAmmOptions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, role])


  const isLocked = pending != null || loading
  const showOverlay = loading && pending === null && hasSel

  // ── computeNodoAttivo: determina quale ruolo deve agire ora sulla pratica ───
  // Replica la logica di computeSintetico del widget Elenco.
  // Scansiona i ruoli operativi dal più avanzato (TI_AMM) al meno avanzato (TR) e
  // restituisce il primo con dati valorizzati → quello è il nodo corrente.
  // Se nessuno ha dati, usa origine_pratica: 1→'RZ', 2→'TI'.
    const computeNodoAttivo = (d: any): string => {
    if (!d) return ''

    // Helpers: function declarations (hoisted) to avoid TDZ issues.
    function isMeaningful (v: any): boolean {
      return v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0'
    }

    function toNum (v: any): number | null {
      return toNumOrNull(v)
    }

    if (computeAwaitingRetakeByRZ(d)) return 'RZ'

    // Caso speciale: assegnazione RZ → TI.
    // Finché TI non "restituisce" la pratica (esito_TI o stato_TI finale),
    // consideriamo TI come nodo attivo (così TI può prendere in carico/lavorare).
    // NB: su alcune Data View possono mancare i campi username; usiamo fallback su nome/data assegnazione.
    const tiUserRaw = pickAttrCI(d, ['ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato'])
    const tiNameRaw = pickAttrCI(d, ['ti_assegnato_nome', 'ti_assegnatoName', 'TI_ASSEGNATO_NOME'])
    const dtAssegnaRaw = pickAttrCI(d, ['dt_assegnazione_ti', 'dt_assegnazione_TI', 'DT_ASSEGNAZIONE_TI'])
    const tiAssigned = isMeaningful(tiUserRaw) || isMeaningful(tiNameRaw) || isMeaningful(dtAssegnaRaw)
    if (tiAssigned) {
      const higherTouched = ['DA', 'DT', 'RI'].some(r => {
        const p = hasDedicatedPresaField(r) ? d[`presa_in_carico_${r}`] : null
        const s = d[`stato_${r}`]
        const e = d[`esito_${r}`]
        return isMeaningful(p) || isMeaningful(s) || isMeaningful(e)
      })
      const statoTi = toNum(pickAttrCI(d, ['stato_TI', 'stato_ti', 'STATO_TI']))
      const esitoTi = toNum(pickAttrCI(d, ['esito_TI', 'esito_ti', 'ESITO_TI']))
      const tiReturnedLocal = (esitoTi != null) || (statoTi === STATO_APPROVATA) || (statoTi === STATO_RESPINTA)
      if (!higherTouched && !tiReturnedLocal) return 'TI'
    }

    const scanOrder = ['TI_AMM', 'RI_AMM', 'DT', 'RI', 'RZ', 'TI', 'TR']

    const hasData = (r: string) => {
      const p = hasDedicatedPresaField(r) ? d[`presa_in_carico_${r}`] : null
      const s = d[`stato_${r}`]
      const e = d[`esito_${r}`]
      return isMeaningful(p) || isMeaningful(s) || isMeaningful(e)
    }

    // fwdDest dinamico: DT→RI_AMM diretto; RI_AMM non apre più un nodo DA interno.
    const getFwdDestLocal = (r: string): string => {
      switch (r) {
        case 'TI':     return 'RZ'
        case 'RZ':     return 'RI'
        case 'RI':     return 'DT'
        case 'DT':     return 'RI_AMM'
        case 'RI_AMM': {
          const detStato = String(pickAttrCI(d, ['determinazione_stato', 'DETERMINAZIONE_STATO']) || '').trim().toUpperCase()
          if (detStato === 'TRASMESSA_RI_AMM' || detStato === 'BOZZA_TRASMESSA_RI_AMM') return 'TI_AMM'
          const statoRiAmm = toNum(pickAttrCI(d, ['stato_RI_AMM', 'STATO_RI_AMM']))
          const presaRiAmm = toNum(pickAttrCI(d, ['presa_in_carico_RI_AMM', 'PRESA_IN_CARICO_RI_AMM']))
          const statoTiAmm = toNum(pickAttrCI(d, ['stato_TI_AMM', 'STATO_TI_AMM']))
          const esitoTiAmm = toNum(pickAttrCI(d, ['esito_TI_AMM', 'ESITO_TI_AMM']))
          const riAmmOpen = statoRiAmm === STATO_DA_PRENDERE || statoRiAmm === STATO_PRESA_IN_CARICO || presaRiAmm === PRESA_DA_PRENDERE || presaRiAmm === PRESA_IN_CARICO
          if (riAmmOpen && esitoTiAmm === ESITO_APPROVATA && statoTiAmm === STATO_APPROVATA) return 'TI_AMM'
          return ''
        }
        case 'TI_AMM': {
          const detStato = String(pickAttrCI(d, ['determinazione_stato', 'DETERMINAZIONE_STATO']) || '').trim().toUpperCase()
          return (detStato === 'TRASMESSA_RI_AMM' || detStato === 'BOZZA_TRASMESSA_RI_AMM') ? 'RI_AMM' : ''
        }
        default:       return ''
      }
    }

    // integDest: destinatario richiesta integrazioni
    const getIntegDestLocal = (r: string): string => {
      switch (r) {
        case 'RZ':     return 'TI'
        case 'RI':     return 'TI'
        case 'DT':     return 'RI'
        case 'RI_AMM': return 'RI'
        case 'TI_AMM': return 'RI_AMM'
        default:       return ''
      }
    }

    for (const r of scanOrder) {
      if (!hasData(r)) continue

      const presaNum = hasDedicatedPresaField(r) ? toNum(d[`presa_in_carico_${r}`]) : null
      const statoNum = toNum(d[`stato_${r}`])
      const esitoNum = toNum(d[`esito_${r}`])

      if (esitoNum != null) {
        if (esitoNum === ESITO_APPROVATA) {
          const dest = getFwdDestLocal(r)
          if (dest) {
            if (hasData(dest)) continue
            return dest
          }
        }
        if (esitoNum === ESITO_INTEGRAZIONE) {
          const dest = getIntegDestLocal(r)
          if (dest) {
            const destEsito = toNum(d[`esito_${dest}`])
            if (destEsito == null) return dest
            continue
          }
        }
        return r
      }

      if (presaNum != null || statoNum != null) return r

      return r
    }

    // Nessun dato: pratica nuova
    const op = d['origine_pratica']
    let opNum: number | null = null
    if (op !== null && op !== undefined && String(op) !== '') {
      opNum = toNumOrNull(op)
      if (opNum == null) {
        const s = String(op).trim().toUpperCase()
        if (s === 'TR') opNum = 1
        else if (s === 'TI') opNum = 2
      }
    }

    return opNum === 2 ? 'TI' : 'RZ'
  }

  // Il ruolo che deve agire ORA sulla pratica selezionata.
  // Usato solo per display (computeSintetico nell'elenco). NON usato come guardiano dei pulsanti:
  // la vista dell'utente può non esporre i campi degli altri ruoli, rendendo isMyTurn inaffidabile.
  const nodoAttivo = data ? computeNodoAttivo(data) : ''
  const isMyTurn = nodoAttivo === role

  const parseWorkflowRoleFromRoutingText = (value: any): string => {
    const s = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
    if (!s) return ''
    if (s.startsWith('RI_AMM')) return 'RI_AMM'
    if (s.startsWith('TI_AMM')) return 'TI_AMM'
    // Il Direttore dell'Area amministrativa è fuori dal workflow interno: eventuali
    // vecchi instradamenti DIR_AMM/DA non devono più bloccare le azioni dei nodi operativi.
    if (s.startsWith('DIR_AMM') || s.startsWith('DA')) return ''
    if (s.startsWith('DIR') || s.startsWith('DT')) return 'DT'
    if (s.startsWith('RI')) return 'RI'
    if (s.startsWith('RZ')) return 'RZ'
    if (s.startsWith('TI')) return 'TI'
    if (s.startsWith('TR')) return 'TR'
    return ''
  }
  const giiRoutingDestRole = parseWorkflowRoleFromRoutingText(pickAttrCI(data, ['GII_a', 'gii_a']))
  const isExplicitlyRoutedToAnotherRole = !!giiRoutingDestRole && giiRoutingDestRole !== role

  // TI non deve poter "prendere in carico" una pratica nata da gestionale (origine=2)
  // se non ha ancora workflow: quella pratica è già sua.
  const isTiOwningOrigin2 = role === 'TI' && origineNum === 2 && presaNum == null

  // ── Guardiani pulsanti: basati SOLO su stato_[myRole] ───────────────────────
  // La fonte di verità è il valore del campo stato del ruolo corrente nel record.
  // isMyTurn NON è usato: la vista può non esporre i campi degli altri ruoli.

  const myStatoIsDaPrendere =
    (effectiveStatoNum === STATO_DA_PRENDERE) ||
    (effectivePresaNum === PRESA_DA_PRENDERE && (effectiveStatoNum == null || effectiveStatoNum === STATO_DA_PRENDERE))

  const myStatoIsPresaInCarico =
    (effectiveStatoNum === STATO_PRESA_IN_CARICO) ||
    (effectivePresaNum === PRESA_IN_CARICO && (effectiveStatoNum == null || effectiveStatoNum === STATO_PRESA_IN_CARICO))

  // Quando il popup "Gestisci istruttoria" è aperto, `pending` rappresenta
  // l'azione selezionata nella combo. Non deve quindi disabilitare la lista
  // delle azioni disponibili. Fuori dal popup, invece, pending deve bloccare
  // l'avvio di nuove azioni parallele.
  const canChooseWorkflowAction = pending === null || actionsMenuOpen

  const canStartTakeInCharge =
    role !== 'DA' &&
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    canChooseWorkflowAction &&
    !isExplicitlyRoutedToAnotherRole &&
    (myStatoIsDaPrendere || (effectivePresaNum == null && effectiveStatoNum == null && !isTiOwningOrigin2 && isMyTurn)) &&
    !isTiOwningOrigin2 &&
    (effectivePresaNum == null || effectivePresaNum === PRESA_DA_PRENDERE) &&
    (effectiveStatoNum == null || effectiveStatoNum === STATO_DA_PRENDERE)


  // TI assignment (RZ → TI): se la pratica è assegnata a TI e TI non l'ha ancora "restituita",
  // RZ non deve poter esprimere esito/integrazione/approvazione/respinta.
  // Su alcune Data View i campi di assegnazione possono mancare: quindi consideriamo anche
  // l'eventuale workflow TI già presente sulla pratica.
  const tiUserRaw = pickAttrCI(data, ['ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato'])
  const tiNameRaw = pickAttrCI(data, ['ti_assegnato_nome', 'ti_assegnatoName', 'TI_ASSEGNATO_NOME'])
  const dtAssegnaRaw = pickAttrCI(data, ['dt_assegnazione_ti', 'dt_assegnazione_TI', 'DT_ASSEGNAZIONE_TI'])
  const hasTiAssigned = !isEmptyValue(tiUserRaw) || !isEmptyValue(tiNameRaw) || !isEmptyValue(dtAssegnaRaw)
  const statoTiNum = toNumOrNull(pickAttrCI(data, ['stato_TI', 'stato_ti', 'STATO_TI']))
  const presaTiNum = toNumOrNull(pickAttrCI(data, ['presa_in_carico_TI', 'presa_in_carico_ti', 'PRESA_IN_CARICO_TI']))
  const esitoTiNum = toNumOrNull(pickAttrCI(data, ['esito_TI', 'esito_ti', 'ESITO_TI']))
  const hasTiWorkflowTouched = (presaTiNum != null) || (statoTiNum != null) || (esitoTiNum != null)
  const hasHigherWorkflowTouched =
    (toNumOrNull(pickAttrCI(data, ['presa_in_carico_RI', 'PRESA_IN_CARICO_RI'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['stato_RI', 'STATO_RI'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['esito_RI', 'ESITO_RI'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['stato_DT', 'STATO_DT'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['esito_DT', 'ESITO_DT'])) != null)
  const hasTiAnyEvidence = hasTiAssigned || hasTiWorkflowTouched
  const tiReturned = (esitoTiNum != null) || (statoTiNum === STATO_APPROVATA) || (statoTiNum === STATO_RESPINTA) || hasHigherWorkflowTouched
  const lockRZBecauseAssignedToTi = role === 'RZ' && (origineNum == null || origineNum === 1) && hasTiAnyEvidence && !tiReturned && !awaitingRetakeByRz
  const numeroRapportoTecnicoCorrente = String(pickAttrCI(data, ['numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO']) || '').trim()
  const rzCanRejectOnlyFirstEvaluation = role !== 'RZ' || !numeroRapportoTecnicoCorrente

  // TI_AMM già assegnato?
  const tiAmmUserRaw = pickAttrCI(data, ['ti_amm_assegnato_username'])
  const hasTiAmmAssigned = hasTiAmmAssignment(data)

  // Nodo TI_AMM: distinguere assegnazione STORICA da assegnazione APERTA.
  // Dopo una richiesta integrazione RI_AMM→RI→DT→RI_AMM può rimanere valorizzato
  // ti_amm_assegnato_username dal ciclo precedente; se stato_TI_AMM è 0/null non deve
  // bloccare RI_AMM né impedire una nuova assegnazione.
  const esitoTiAmmNum = toNumOrNull(pickAttrCI(data, ['esito_TI_AMM', 'ESITO_TI_AMM']))
  const statoTiAmmNum = toNumOrNull(pickAttrCI(data, ['stato_TI_AMM', 'STATO_TI_AMM']))
  const riAmmStaApprovandoPropostaContestazione = role === 'RI_AMM' && riAmmBozzaDeterminazioneDaVerificare && esitoTiAmmNum === ESITO_APPROVATA
  const tiAmmAssignmentOpen = hasTiAmmAssigned && (
    statoTiAmmNum === STATO_DA_PRENDERE ||
    statoTiAmmNum === STATO_PRESA_IN_CARICO ||
    statoTiAmmNum === STATO_INTEGRAZIONE
  )
  const tiAmmReturned = (esitoTiAmmNum != null) || (statoTiAmmNum === STATO_APPROVATA) || (statoTiAmmNum === STATO_RESPINTA)

  const riaperturaWorkflowCandidate =
    role === 'RI_AMM' &&
    riaperturaAmmFlag &&
    !riaperturaWorkflowStarted &&
    !tiAmmAssignmentOpen

  const riaperturaWorkflowDaAvviare =
    riaperturaWorkflowCandidate &&
    riaperturaAmmCompleta &&
    !riaperturaWorkflowCheckLoading

  const riaperturaWorkflowDaCompletare =
    riaperturaWorkflowCandidate &&
    !riaperturaAmmCompleta

  // Caso specifico RI_AMM: rientro da integrazione tecnica.
  // Dopo il giro RI_AMM → RI_AGR o RI_TEC → DT_AGR o DT_TEC → RI_AMM, il rientro
  // verso il TI_AMM originario è una restituzione/trasmissione (blu).
  // Dopo una normale trasmissione TI_AMM → RI_AMM, invece, RI_AMM deve poter
  // chiedere una vera integrazione amministrativa al TI_AMM (arancio).
  // Per distinguere i due casi usiamo il mittente tecnico del routing GII_da.
  const giiDaRaw = String(pickAttrCI(data, ['GII_da', 'gii_da', 'Da', 'DA']) || '').trim()
  const giiDaNorm = giiDaRaw.toUpperCase().replace(/\s+/g, ' ')
  const riAmmSenderIsTecnico = role === 'RI_AMM' && (
    /(^|[^A-Z0-9])(DT|DIR)[-_ ]?(AGR|TEC)([^A-Z0-9]|$)/.test(giiDaNorm) ||
    /(^|[^A-Z0-9])TEST_DT_(AGR|TEC)([^A-Z0-9]|$)/.test(giiDaNorm) ||
    /(^|[^A-Z0-9])DT_(AGR|TEC)([^A-Z0-9]|$)/.test(giiDaNorm) ||
    // fallback prudente: se il mittente è un DT generico è comunque un direttore tecnico,
    // mentre il direttore amministrativo è DA e non deve entrare in questa regola.
    /(^|[^A-Z0-9])DT([^A-Z0-9]|$)/.test(giiDaNorm) ||
    /(^|[^A-Z0-9])DIR([^A-Z0-9]|$)/.test(giiDaNorm)
  )

  const statoRiAmmNum = toNumOrNull(pickAttrCI(data, ['stato_RI_AMM', 'STATO_RI_AMM']))
  const esitoRiAmmNum = toNumOrNull(pickAttrCI(data, ['esito_RI_AMM', 'ESITO_RI_AMM']))

  // RI_AMM: un rientro da DT/DIR tecnico non significa automaticamente
  // “restituisci al TI_AMM”. È un rientro tecnico solo se RI_AMM aveva
  // effettivamente aperto un rimando tecnico nel ciclo amministrativo.
  const riAmmHaChiestoIntegrazioneTecnica =
    role === 'RI_AMM' && (esitoRiAmmNum === ESITO_INTEGRAZIONE || statoRiAmmNum === STATO_INTEGRAZIONE)

  const isRientroTecnicoDaDt =
    role === 'RI_AMM' &&
    hasTiAmmAssigned &&
    riAmmSenderIsTecnico &&
    riAmmHaChiestoIntegrazioneTecnica

  // Se RI_AMM riceve per la prima volta da DT/DIR tecnico, o riceve il
  // rientro da una propria integrazione tecnica, non va bloccato solo perché
  // esiste uno storico TI_AMM. Quello storico non è la causa procedurale attuale.
  const lockRiAmmBecauseAssignedToTiAmm =
    role === 'RI_AMM' &&
    tiAmmAssignmentOpen &&
    !tiAmmReturned &&
    !riAmmSenderIsTecnico

  const currentIntegrationRequester = getIntegrationRequesterForCurrentRole()

  // Il rimando generico TI_AMM → RI_AMM appartiene al ciclo istruttorio della determina.
  // Dopo la predisposizione dell'e-mail al Direttore quel ciclo è chiuso e non deve
  // più essere riaperto con un rimando generico. La fonte stabile è il milestone
  // `determinazione_trasmessa_firma_*`, che viene registrato dalla stessa azione che
  // prepara l'e-mail. I fallback coprono le pratiche già avanzate con versioni precedenti.
  const determinazioneTrasmessaFirmaCorrente =
    !isEmptyValue(pickAttrCI(data, ['determinazione_trasmessa_firma_il', 'DETERMINAZIONE_TRASMESSA_FIRMA_IL']))
  const determinazioneHaSuperatoInvioDirettore =
    determinazioneTrasmessaFirmaCorrente ||
    determinazioneAdottataCorrente ||
    determinazioneStatoCorrente === 'EMAIL_DIRETTORE_PREPARATA'
  const tiAmmRimandoRiAmmInibitoDopoEmailDirettore =
    role === 'TI_AMM' && determinazioneHaSuperatoInvioDirettore

  const canStartEsito =
    role !== 'DA' &&
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    canChooseWorkflowAction &&
    !isExplicitlyRoutedToAnotherRole &&
    myStatoIsPresaInCarico &&
    !lockRZBecauseAssignedToTi &&
    !lockRiAmmBecauseAssignedToTiAmm &&
    !(role === 'RI_AMM' && determinazioneAdottataCorrente && !riAmmAttoContestazioneDaVerificare) &&
    effectivePresaNum === PRESA_IN_CARICO &&
    effectiveStatoNum === STATO_PRESA_IN_CARICO

  // Regola RZ: prima di assegnare a TI, può solo "Assegna TI" oppure "Respingi".
  const canStartIntegrazione =
    canStartEsito &&
    !tiAmmRimandoRiAmmInibitoDopoEmailDirettore &&
    role !== 'RI_AMM' &&
    !(role === 'RZ' && (origineNum == null || origineNum === 1) && !hasTiAnyEvidence) &&
    role !== 'TI'

  // RI_AMM → TI_AMM: la destinazione verso TI_AMM ha tre significati distinti.
  // - prima ricezione tecnica: Assegna al TI_AMM;
  // - rientro da integrazione tecnica già richiesta da RI_AMM: Invia al TI_AMM;
  // - controllo dell'istruttoria del TI_AMM: Rimanda al TI_AMM con motivazione.
  const riAmmShouldAssignTiAmm =
    role === 'RI_AMM' &&
    (
      riaperturaWorkflowDaAvviare ||
      !hasTiAmmAssigned ||
      (riAmmSenderIsTecnico && !riAmmHaChiestoIntegrazioneTecnica)
    )

  const canStartInviaTiAmm =
    canStartEsito &&
    role === 'RI_AMM' &&
    hasTiAmmAssigned &&
    isRientroTecnicoDaDt

  // Compatibilità interna: il vecchio pending RESTITUISCI_TI_AMM non viene più
  // proposto all'utente, ma resta gestito per evitare rotture se qualche stato
  // precedente lo avesse ancora in memoria durante hot reload.
  const canStartRestituisciTiAmm = canStartInviaTiAmm

  const canStartIntegrazioneTiAmm =
    canStartEsito &&
    role === 'RI_AMM' &&
    (!determinazioneAdottataCorrente || riAmmAttoContestazioneDaVerificare) &&
    hasTiAmmAssigned &&
    !riAmmSenderIsTecnico &&
    currentIntegrationRequester !== 'TI_AMM'

  const canStartIntegrazioneTecnica =
    canStartEsito &&
    role === 'RI_AMM' &&
    !determinazioneAdottataCorrente

  const tiAmmConformitaGiaApposta = role === 'TI_AMM' && esitoTiAmmNum === ESITO_APPROVATA
  const riAmmHaRimandatoATiAmmDopoVisto = role === 'TI_AMM' && tiAmmConformitaGiaApposta && (
    esitoRiAmmNum === ESITO_INTEGRAZIONE ||
    statoRiAmmNum === STATO_INTEGRAZIONE
  )
  const tiAmmPuoApporreAttestazione = role !== 'TI_AMM' || !tiAmmConformitaGiaApposta || riAmmHaRimandatoATiAmmDopoVisto

  const canStartApprova =
    canStartEsito &&
    role !== 'TI_AMM' &&
    tiAmmPuoApporreAttestazione &&
    !(role === 'RZ' && (origineNum == null || origineNum === 1) && !hasTiAnyEvidence) &&
    !(role === 'RI_AMM' && !currentIntegrationRequester && !riAmmBozzaDeterminazioneDaVerificare && !riAmmAttoContestazioneDaVerificare)

  const canStartRespingi =
    canStartEsito &&
    role !== 'TI' &&
    role !== 'RI' &&
    role !== 'TI_AMM' &&  // TI_AMM non può respingere
    role !== 'RI_AMM' &&  // il RI-AMM rimanda o trasmette, non respinge
    role !== 'DA' &&      // DA è consultivo: nessuna azione di workflow interno
    rzCanRejectOnlyFirstEvaluation

  // Label dinamiche (inoltro vs approva)
  // Destinazione forward risolta (usata anche per le label)
  const fwdDest = getNextRoleForForward()

  const areaNameForRoleLabel = (areaCode: string): string => {
    const code = normalizeAreaLabel(areaCode)
    if (code === 'AGR') return 'Agraria'
    if (code === 'TEC') return 'Tecnica'
    if (code === 'AMM') return 'Amministrativa'
    return ''
  }

  const getRoleLabelForMenu = (destRole: string, opts?: { technicalIntegration?: boolean }): string => {
    const dest = String(destRole || '').trim().toUpperCase()
    if (!dest) return ''
    if (dest === 'RI_AMM') return 'Responsabile Istruttoria amministrativa'
    if (dest === 'TI_AMM') return 'Tecnico Istruttore amministrativo'
    if (dest === 'DA') return 'Direttore Area AA. GG. e P.F.'

    const meta = getRoutingMetaForRole(dest, opts)
    const areaCode = normalizeAreaLabel(meta.area || getPracticeAreaForRouting())
    const areaName = areaNameForRoleLabel(areaCode)

    if (dest === 'RI') return 'Responsabile Istruttoria'
    if (dest === 'TI') return 'Tecnico Istruttore'
    if (dest === 'DT') return areaName ? `Direttore dell’Area ${areaName}` : 'Direttore dell’Area Tecnica'
    if (dest === 'RZ') return 'Capo Settore'
    return dest.replace(/_/g, ' ')
  }

  const getRoleLabelForForward = (destRole: string): string => {
    const dest = String(destRole || '').trim().toUpperCase()
    if (dest === 'DT') return 'Direttore d’Area'
    if (dest === 'DA') return 'Direttore Area AA. GG. e P.F.'
    return getRoleLabelForMenu(dest)
  }

  const fwdDestLabel = getRoleLabelForForward(fwdDest)
  const currentIntegrationRequesterLabel = currentIntegrationRequester
    ? getRoleLabelForForward(currentIntegrationRequester)
    : ''

  const approvaBtnLabel =
    role === 'TI' ? `Trasmetti ${praticaLabel === 'Rapporto tecnico' ? 'rapporto tecnico' : 'rilevazione'} al ${getRoleLabelForMenu('RZ')}` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? 'Valida integrazione' : 'Approva rilevazione') :
    role === 'RI' ? 'Approva istruttoria tecnica' :
    role === 'DT' ? 'Approva Rapporto tecnico di rilevazione' :
    role === 'RI_AMM' && riAmmAttoContestazioneDaVerificare ? 'Approva Atto di contestazione' :
    role === 'RI_AMM' && riAmmBozzaDeterminazioneDaVerificare ? 'Approva istruttoria amministrativa' :
    role === 'RI_AMM' && riAmmStaApprovandoPropostaContestazione ? 'Approva istruttoria amministrativa' :
    role === 'RI_AMM' ? 'Approva istruttoria amministrativa' :
    role === 'TI_AMM' ? 'Apponi attestazione di conformità' :
    'Approva'

  const approvaDoneLabel = currentIntegrationRequesterLabel
    ? `Trasmessa al ${currentIntegrationRequesterLabel}`
    : role === 'TI' ? `${praticaLabel === 'Rapporto tecnico' ? 'Rapporto tecnico' : 'Rilevazione'} trasmessa al ${getRoleLabelForMenu('RZ')}` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? `Integrazione validata e trasmessa al ${getRoleLabelForMenu('RI')}` : `Rilevazione approvata e trasmessa al ${getRoleLabelForMenu('RI')}`) :
    role === 'RI' ? `Istruttoria tecnica approvata e trasmessa al ${getRoleLabelForForward('DT')}` :
    role === 'DT' ? `Rapporto tecnico di rilevazione approvato e trasmesso al ${getRoleLabelForMenu('RI_AMM')}` :
    role === 'RI_AMM' && riAmmAttoContestazioneDaVerificare ? 'Atto di contestazione approvato' :
    role === 'RI_AMM' && riAmmBozzaDeterminazioneDaVerificare ? 'Istruttoria amministrativa approvata' :
    role === 'RI_AMM' && riAmmStaApprovandoPropostaContestazione ? 'Istruttoria amministrativa approvata' :
    role === 'RI_AMM' ? 'Istruttoria amministrativa approvata' :
    role === 'TI_AMM' ? 'Attestazione di conformità apposta' :
    'Approvata'

  const approvaConfirmLabel = currentIntegrationRequesterLabel
    ? `Trasmetti al ${currentIntegrationRequesterLabel}`
    : role === 'TI' ? `Trasmetti al ${getRoleLabelForMenu('RZ')}` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? 'Valida integrazione' : 'Approva rilevazione') :
    role === 'RI' ? 'Approva istruttoria tecnica' :
    role === 'DT' ? 'Approva rapporto tecnico' :
    role === 'RI_AMM' && riAmmAttoContestazioneDaVerificare ? 'Approva Atto di contestazione' :
    role === 'RI_AMM' && riAmmBozzaDeterminazioneDaVerificare ? 'Approva istruttoria amministrativa' :
    role === 'RI_AMM' && riAmmStaApprovandoPropostaContestazione ? 'Approva istruttoria amministrativa' :
    role === 'RI_AMM' ? 'Approva istruttoria amministrativa' :
    role === 'TI_AMM' ? 'Apponi attestazione' :
    'Approva'

  const getRiTecnicoTargetLabel = (): string => {
    const areaPratica = normalizeAreaLabel(pickAttrCI(data, ['area_cod', 'area', 'cod_area']))
    const areaName = areaNameForRoleLabel(areaPratica)
    if ((areaPratica === 'AGR' || areaPratica === 'TEC') && areaName) return `Responsabile Istruttoria dell’Area ${areaName}`
    return 'Responsabile Istruttoria'
  }

  const formatRimandoRoleLabel = (destRole: string): string => {
    const dest = String(destRole || '').trim().toUpperCase()
    if (!dest) return ''
    if (role === 'RI_AMM' && dest === 'RI') return getRiTecnicoTargetLabel()
    return getRoleLabelForMenu(dest)
  }

  const rimandoGenericDest = getPrevRoleForIntegration()
  const rimandoGenericTargetLabel = formatRimandoRoleLabel(rimandoGenericDest)
  const rimandoGenericButtonLabel = rimandoGenericTargetLabel ? `Rimanda al ${rimandoGenericTargetLabel}` : 'Rimanda'
  const rimandoTiAmmButtonLabel = `Rimanda al ${getRoleLabelForMenu('TI_AMM')}`
  const rimandoTecnicaTargetLabel = getRiTecnicoTargetLabel()
  const rimandoTecnicaButtonLabel = `Rimanda al ${rimandoTecnicaTargetLabel}`
  const pendingRimandoTargetLabel = role === 'RI_AMM' && pending === 'INTEGRAZIONE_TI_AMM'
    ? getRoleLabelForMenu('TI_AMM')
    : role === 'RI_AMM' && pending === 'INTEGRAZIONE_TECNICA'
      ? rimandoTecnicaTargetLabel
      : pending === 'INTEGRAZIONE'
        ? rimandoGenericTargetLabel
        : ''

  // TI: eliminazione consentita solo per pratiche originate da sé (origine=TI) e mai inoltrate a RZ.
  const currentUsername = String((window as any).__giiUserRole?.username || (window as any).__giiUser?.username || '').trim()
  const creatorUsername = String(pickAttrCI(data, ['creator', 'Creator', 'created_user', 'created_by', 'CreatedUser', 'CREATOR', 'utente_ins', 'utente']) || '').trim()
  // Se il campo creator non è esposto dalla vista, assumiamo ownership:
  // isRecordVisibleForCurrentUser ha già filtrato i record di TI garantendo visibilità solo sui propri.
  const isOwner = !creatorUsername || (!!currentUsername && currentUsername.toLowerCase() === creatorUsername.toLowerCase())

  const hasRoleTouched = (r: string): boolean => {
    const p = toNumOrNull(pickAttrCI(data, [`presa_in_carico_${r}`, `PRESA_IN_CARICO_${r}`]))
    const s = toNumOrNull(pickAttrCI(data, [`stato_${r}`, `STATO_${r}`]))
    const e = toNumOrNull(pickAttrCI(data, [`esito_${r}`, `ESITO_${r}`]))
    return (p != null) || (s != null) || (e != null)
  }

  const canStartElimina =
    role === 'TI' &&
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    canChooseWorkflowAction &&
    isMyTurn &&
    origineNum === 2 &&
    !hasRoleTouched('RZ') &&
    !hasRoleTouched('RI') &&
    !hasRoleTouched('DT') &&
    !hasRoleTouched('DA') &&
    (esitoTiNum == null) &&
    isOwner


  // Nota: Matrice_DT non prevede "Trasmetti a DA". Il pulsante è stato rimosso.

  // Assegna TI: solo RZ, dopo presa in carico, pratiche da TR.
  // NOTA: non dipendiamo da computeNodoAttivo perché su alcune Output DS ExB
  // può arrivare un subset di campi che falsano `isMyTurn` dopo un reselect.
  const canStartAssegnaTi =
    role === 'RZ' &&
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    canChooseWorkflowAction &&
    (origineNum == null || origineNum === 1) &&
    !hasTiAnyEvidence &&
    effectivePresaNum === PRESA_IN_CARICO &&
    effectiveStatoNum === STATO_PRESA_IN_CARICO

  // Assegna TI_AMM: solo RI_AMM, dopo presa in carico.
  // Non dipende più dalla sola presenza storica di ti_amm_assegnato_username:
  // se la pratica arriva ora da DT/DIR tecnico per la prima fase amministrativa,
  // RI_AMM deve poter assegnare anche se nel record esiste uno storico TI_AMM.
  const canStartAssegnaTiAmmStandard =
    role === 'RI_AMM' &&
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    canChooseWorkflowAction &&
    riAmmShouldAssignTiAmm &&
    effectivePresaNum === PRESA_IN_CARICO &&
    effectiveStatoNum === STATO_PRESA_IN_CARICO

  const canStartAssegnaTiAmmRiapertura =
    role === 'RI_AMM' &&
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    canChooseWorkflowAction &&
    riaperturaWorkflowDaAvviare

  const canStartAssegnaTiAmm = canStartAssegnaTiAmmStandard || canStartAssegnaTiAmmRiapertura

  type WorkflowMenuItem = {
    key: Exclude<Pending, null | 'TAKE'>
    label: string
    desc: string
    enabled: boolean
    visible: boolean
    color: string
    textColor: string
  }

  type WorkflowMenuSection = {
    title: string
    items: WorkflowMenuItem[]
  }

  const approvaMenuLabel = currentIntegrationRequesterLabel
    ? `Trasmetti al ${currentIntegrationRequesterLabel}`
    : role === 'TI' ? `Trasmetti ${praticaLabel === 'Rapporto tecnico' ? 'rapporto tecnico' : 'rilevazione'} al ${getRoleLabelForMenu('RZ')}` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? 'Valida integrazione' : 'Approva rilevazione') :
    role === 'RI' ? 'Approva istruttoria tecnica' :
    role === 'DT' ? 'Approva Rapporto tecnico di rilevazione' :
    role === 'RI_AMM' && riAmmAttoContestazioneDaVerificare ? 'Approva Atto di contestazione' :
    role === 'RI_AMM' && riAmmBozzaDeterminazioneDaVerificare ? 'Approva istruttoria amministrativa' :
    role === 'RI_AMM' && riAmmStaApprovandoPropostaContestazione ? 'Approva istruttoria amministrativa' :
    role === 'RI_AMM' ? 'Approva istruttoria amministrativa' :
    role === 'TI_AMM' ? 'Apponi attestazione di conformità' :
    approvaBtnLabel

  const approvaMenuDesc = currentIntegrationRequesterLabel
    ? `Invia la risposta al ${currentIntegrationRequesterLabel}.`
    : role === 'TI' ? `${praticaLabel === 'Rapporto tecnico' ? 'Invia il rapporto tecnico' : 'Invia la rilevazione'} al ${getRoleLabelForMenu('RZ')}.` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? `Valida l’integrazione e trasmette il rapporto tecnico al ${getRoleLabelForMenu('RI')}.` : `Approva la rilevazione e la trasmette al ${getRoleLabelForMenu('RI')}.`) :
    role === 'RI' ? `Approva l’istruttoria tecnica e la trasmette al ${getRoleLabelForForward('DT')}.` :
    role === 'DT' ? `Approva il Rapporto tecnico di rilevazione e lo trasmette al ${getRoleLabelForMenu('RI_AMM')}.` :
    role === 'RI_AMM' && riAmmAttoContestazioneDaVerificare ? 'Approva l’Atto e restituisce la pratica al Tecnico Istruttore amministrativo per la trasmissione al Direttore.' :
    role === 'RI_AMM' && riAmmBozzaDeterminazioneDaVerificare ? 'Approva l’istruttoria amministrativa e restituisce la pratica al Tecnico Istruttore amministrativo per la protocollazione e la trasmissione al Direttore.' :
    role === 'RI_AMM' && riAmmStaApprovandoPropostaContestazione ? 'Approva l’istruttoria amministrativa e restituisce la pratica al Tecnico istruttore amministrativo per protocollazione e predisposizione della bozza di determinazione.' :
    role === 'TI_AMM' ? 'Appone il visto di conformità. La pratica resta al Tecnico Istruttore amministrativo per la predisposizione della bozza di determinazione e la successiva trasmissione del fascicolo al Responsabile.' :
    fwdDestLabel ? `Invia la pratica al ${fwdDestLabel}.` :
    'Avanza la pratica al passaggio successivo.'

  const rimandoTecnicaMenuDesc = 'Rimando all’istruttoria tecnica.'

  // RI_AMM non deve vedere contemporaneamente una trasmissione e una restituzione
  // verso lo stesso TI_AMM: per l'utente sarebbero due scelte indistinguibili.
  const hideRiAmmForwardToTiAmm = role === 'RI_AMM' && fwdDest === 'TI_AMM' && !riAmmStaApprovandoPropostaContestazione && !riAmmBozzaDeterminazioneDaVerificare && !riAmmAttoContestazioneDaVerificare

  const workflowMenuSections: WorkflowMenuSection[] = hasSel && role !== 'DA' ? ([
    {
      title: 'Avanzamento',
      items: [
        {
          key: 'ASSEGNA_TI',
          label: `Assegna al ${getRoleLabelForMenu('TI')}`,
          desc: 'Assegna la pratica al Tecnico Istruttore.',
          enabled: canStartAssegnaTi,
          visible: role === 'RZ',
          color: buttonColors.take,
          textColor: buttonColors.takeText
        },
        {
          key: 'ASSEGNA_TI_AMM',
          label: riaperturaWorkflowCandidate
            ? 'Avvia nuova istruttoria amministrativa'
            : `Assegna al ${getRoleLabelForMenu('TI_AMM')}`,
          desc: riaperturaWorkflowDaCompletare
            ? 'Completare e salvare tutti i dati della scheda Riapertura prima di avviare il nuovo ciclo.'
            : riaperturaWorkflowCheckLoading
              ? 'Verifica del ciclo di riapertura in corso.'
              : riaperturaWorkflowDaAvviare
                ? `Apre il nuovo ciclo di riapertura n. ${riaperturaAmmNumero} e assegna la pratica al Tecnico Istruttore amministrativo.`
                : 'Assegna la pratica al Tecnico Istruttore amministrativo.',
          enabled: canStartAssegnaTiAmm,
          visible: role === 'RI_AMM' && (riAmmShouldAssignTiAmm || riaperturaWorkflowCandidate),
          color: buttonColors.approva,
          textColor: buttonColors.approvaText
        },
        {
          key: 'INVIA_TI_AMM',
          label: `Trasmetti al ${getRoleLabelForMenu('TI_AMM')}`,
          desc: 'Invia la pratica al Tecnico Istruttore amministrativo già assegnato.',
          enabled: canStartInviaTiAmm,
          visible: role === 'RI_AMM' && isRientroTecnicoDaDt,
          color: buttonColors.approva,
          textColor: buttonColors.approvaText
        },
        {
          key: 'APPROVA',
          label: approvaMenuLabel,
          desc: approvaMenuDesc,
          enabled: canStartApprova,
          visible: !hideRiAmmForwardToTiAmm && role !== 'TI_AMM',
          color: role === 'DT' ? buttonColors.approvaRapporto : buttonColors.approva,
          textColor: role === 'DT' ? buttonColors.approvaRapportoText : buttonColors.approvaText
        }
      ].filter(i => i.visible)
    },
    {
      title: 'Rimandi',
      items: [
        {
          key: 'INTEGRAZIONE_TI_AMM',
          label: rimandoTiAmmButtonLabel,
          desc: 'Rimando all’istruttoria amministrativa.',
          enabled: canStartIntegrazioneTiAmm,
          visible: role === 'RI_AMM' && hasTiAmmAssigned && !isRientroTecnicoDaDt,
          color: buttonColors.integrazione,
          textColor: buttonColors.integrazioneText
        },
        {
          key: 'INTEGRAZIONE_TECNICA',
          label: rimandoTecnicaButtonLabel,
          desc: rimandoTecnicaMenuDesc,
          enabled: canStartIntegrazioneTecnica,
          visible: role === 'RI_AMM',
          color: buttonColors.integrazione,
          textColor: buttonColors.integrazioneText
        },
        {
          key: 'INTEGRAZIONE',
          label: rimandoGenericButtonLabel,
          desc: rimandoGenericTargetLabel ? `${praticaLabel === 'Rapporto tecnico' ? 'Il rapporto tecnico verrà rimandato' : 'La rilevazione verrà rimandata'} al ${rimandoGenericTargetLabel}.` : 'Rimando per integrazione.',
          enabled: canStartIntegrazione,
          visible: role !== 'TI' && role !== 'RI_AMM' && !tiAmmRimandoRiAmmInibitoDopoEmailDirettore,
          color: buttonColors.integrazione,
          textColor: buttonColors.integrazioneText
        }
      ].filter(i => i.visible)
    },
    {
      title: 'Esito negativo',
      items: [
        {
          key: 'ELIMINA',
          label: 'Elimina',
          desc: 'Archivia la pratica.',
          enabled: canStartElimina,
          visible: role === 'TI',
          color: buttonColors.respingi,
          textColor: buttonColors.respingiText
        },
        {
          key: 'RESPINGI',
          label: 'Respingi',
          desc: 'Respinge la pratica.',
          enabled: canStartRespingi,
          visible: role !== 'RI_AMM' && role !== 'TI' && role !== 'DA',
          color: buttonColors.respingi,
          textColor: buttonColors.respingiText
        }
      ].filter(i => i.visible)
    }
  ] as WorkflowMenuSection[]).filter(s => s.items.length > 0) : []

  const workflowMenuEnabledSections: WorkflowMenuSection[] = workflowMenuSections
    .map(section => ({ ...section, items: section.items.filter(item => item.enabled) }))
    .filter(section => section.items.length > 0)
  const workflowMenuEnabledItems = workflowMenuEnabledSections.flatMap(section => section.items)
  const hasVisibleWorkflowMenuActions = workflowMenuSections.some(section => section.items.length > 0)
  const hasEnabledWorkflowMenuActions = workflowMenuEnabledItems.length > 0
  const showTakeDirect = canStartTakeInCharge || !hasSel

  const integrationReasonOptions = [
    'Fatti accertati da chiarire',
    'Incongruenza tra violazioni rilevate e descrizione dei fatti accertati',
    'Necessità di integrazione o rettifica'
  ]
  const administrativeReturnTargetOptions = [
    'Proposta di contestazione',
    'Bozza di determinazione',
    'Contestazioni',
    'Dati del trasgressore',
    'Allegati',
    'Altro'
  ]
  const integrationTargetOptionsBase = [
    'Trasgressore',
    'Violazione',
    'Luoghi e dati tecnici',
    'Nota spese',
    'Allegati',
    'Altro'
  ]
  const integrationTargetOptions = role === 'DT'
    ? ['Occorrenza', 'Grado di gravità', ...integrationTargetOptionsBase]
    : integrationTargetOptionsBase
  const technicalRejectReasonOptions = [
    'Insussistenza dei presupposti della violazione',
    'Accertamento non procedibile',
    'Pratica duplicata',
    'Altro'
  ]

  const toggleIntegrationTarget = (target: string) => {
    setIntegrationTargets(prev => prev.includes(target) ? prev.filter(x => x !== target) : [...prev, target])
    if (confirmAttempted) setConfirmAttempted(false)
  }

  const renderIntegrationTargetCheckbox = (opt: string, displayLabel?: string) => (
    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', border: 'none', borderRadius: 4, background: 'transparent', fontSize: Math.max(14, Number(ui.statusFontSize) || 14), cursor: loading ? 'not-allowed' : 'pointer', minWidth: 0 }}>
      <input
        type='checkbox'
        checked={integrationTargets.includes(opt)}
        onChange={() => toggleIntegrationTarget(opt)}
        disabled={loading || !hasSel || lockedByTransmit}
        style={{ margin: 0, flex: '0 0 auto' }}
      />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel || opt}</span>
    </label>
  )

  // NOTE: compare per esito conforme/non conforme, respinta e — Matrice_TI caso 1/b — anche per eliminazione (obbligatoria)
  const showNote = pending === 'APPROVA' || pending === 'INVIA_TI_AMM' || pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA' || pending === 'RESPINGI' || pending === 'ELIMINA'
  const noteEnabled = showNote && hasSel && !loading && !lockedByTransmit

  const noteDraftTrim = String(noteDraft ?? '').trim()
  const fixedWorkflowNoteTrim = pending ? buildDefaultWorkflowNote(pending).trim() : ''
  const reasonTrim = String(rejectReason ?? '').trim()
  const integrationReasonTrim = String(integrationReason ?? '').trim()
  const integrationOtherTextTrim = String(integrationOtherText ?? '').trim()
  const isWorkflowRimandoPendingForValidation = pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA'
  const isAdministrativeRiAmmReturn = role === 'RI_AMM' && pending === 'INTEGRAZIONE_TI_AMM'
  const isIntegrationNeedsDetail = !isAdministrativeRiAmmReturn && integrationReasonTrim === 'Necessità di integrazione o rettifica'
  const integrationOtherSelected = integrationTargets.includes('Altro')
  const isAltro = /\baltro\b/i.test(reasonTrim)
  const hasOtherMotivation = (pending === 'RESPINGI' && isAltro) || (!isAdministrativeRiAmmReturn && isWorkflowRimandoPendingForValidation && isIntegrationNeedsDetail && integrationOtherSelected)
  const freeNotePrefix = hasOtherMotivation ? 'Altre motivazioni e ulteriori annotazioni' : 'Ulteriori annotazioni'
  const integrationReasonBlock = isAdministrativeRiAmmReturn
    ? (integrationTargets.length > 0 ? `Oggetto del rimando: ${integrationTargets.join(', ')}` : '')
    : (isWorkflowRimandoPendingForValidation && integrationReasonTrim
        ? [
            `Motivazione del rimando: ${integrationReasonTrim}`,
            isIntegrationNeedsDetail && integrationTargets.length > 0 ? `Dati da integrare o rettificare: ${integrationTargets.join(', ')}` : ''
          ].filter(Boolean).join('\n')
        : '')
  const noteTrim = [
    fixedWorkflowNoteTrim,
    integrationReasonBlock,
    noteDraftTrim
      ? (isAdministrativeRiAmmReturn ? `Motivazione del rimando:\n${noteDraftTrim}` : `${freeNotePrefix}:\n${noteDraftTrim}`)
      : ''
  ].filter(Boolean).join('\n\n')

  // obblighi:
  const noteIsRequired =
    hasOtherMotivation ||
    isAdministrativeRiAmmReturn ||
    (pending === 'ELIMINA')  // Matrice_TI caso 1/b: note obbligatoria per eliminazione

  const reasonIsRequired = pending === 'RESPINGI'
  const integrationReasonIsRequired = isWorkflowRimandoPendingForValidation && !isAdministrativeRiAmmReturn
  const integrationTargetsIsRequired = isAdministrativeRiAmmReturn || (isWorkflowRimandoPendingForValidation && isIntegrationNeedsDetail)
  const integrationOtherTextIsRequired = false

  const reasonInvalid = reasonIsRequired && !reasonTrim
  const integrationReasonInvalid = integrationReasonIsRequired && !integrationReasonTrim
  const integrationTargetsInvalid = integrationTargetsIsRequired && integrationTargets.length === 0
  const integrationOtherTextInvalid = integrationOtherTextIsRequired && !integrationOtherTextTrim
  const noteInvalid = noteIsRequired && !noteDraftTrim

  const reasonReqErr = confirmAttempted && reasonInvalid
  const integrationReasonReqErr = confirmAttempted && integrationReasonInvalid
  const integrationTargetsReqErr = confirmAttempted && integrationTargetsInvalid
  const integrationOtherTextReqErr = confirmAttempted && integrationOtherTextInvalid
  const noteReqErr = confirmAttempted && noteInvalid

  const tiReqErr = confirmAttempted && pending === 'ASSEGNA_TI' && !tiSelected
  const tiAmmReqErr = confirmAttempted && pending === 'ASSEGNA_TI_AMM' && !tiAmmSelected

  const onAnnulla = () => {
    if (loading) return
    setPending(null)
    setActionsMenuOpen(false)
    setWorkflowSubmitting(false)
    setLoading(false)
    setMsg(null)
    setConfirmAttempted(false)
    setWorkflowEsitoChoice('')
    setWorkflowRimandoChoice('')
    setNoteDraft(noteOrigRef.current)
    resetStructuredReasons()
    setTiSelected('')
    setTiLoadErr('')
  }

  const startAction = (p: Pending, opts?: { keepActionsMenuOpen?: boolean }) => {
    if (!hasSel) return
    if (lockedByTransmit) return
    if (p === 'TAKE' && !canStartTakeInCharge) return
    if (p === 'ASSEGNA_TI' && !canStartAssegnaTi) return
    if (p === 'ASSEGNA_TI_AMM' && !canStartAssegnaTiAmm) return
    if (p === 'INVIA_TI_AMM' && !canStartInviaTiAmm) return
    if (p === 'RESTITUISCI_TI_AMM' && !canStartRestituisciTiAmm) return
    if (p === 'INTEGRAZIONE' && !canStartIntegrazione) return
    if (p === 'INTEGRAZIONE_TI_AMM' && !canStartIntegrazioneTiAmm) return
    if (p === 'INTEGRAZIONE_TECNICA' && !canStartIntegrazioneTecnica) return
    if (p === 'APPROVA' && !canStartApprova) return
    if (p === 'RESPINGI' && !canStartRespingi) return
    if (p === 'ELIMINA' && !canStartElimina) return

    // Validazione RI → DT: grado obbligatorio per ciascun articolo interessato, occorrenza obbligatoria solo per Art. 15
    if (p === 'APPROVA' && role === 'RI') {
      const missingItems: Array<{ art: number; message: string }> = []
      const artGradoMap: Array<[string, string]> = [
        ['12', 'v_art12'], ['27', 'v_art27'], ['28', 'v_art28'], ['31', 'v_art31'], ['32', 'v_art32'],
        ['33', 'v_art33'], ['34', 'v_art34'], ['35', 'v_art35'], ['36', 'v_art36'], ['37', 'v_art37']
      ]
      const gradi = parseGradiViolazioniForRapporto(pickAttrCI(data, ['gradi_violazioni', 'GRADI_VIOLAZIONI']))
      const norma3Selected = new Set(String(pickAttrCI(data, ['norma_violata3', 'NORMA_VIOLATA3']) || '').split(/\s+/).filter(Boolean))
      for (const [art, field] of artGradoMap) {
        const v = pickAttrCI(data, [field, field.toUpperCase()])
        const selected = v === 1 || v === '1' || v === true || norma3Selected.has(`Art${art}`)
        if (selected && !/^[1-4]$/.test(String(gradi[art] || ''))) {
          missingItems.push({
            art: Number(art),
            message: `Impossibile trasmettere: per l'Art. ${art} è obbligatorio specificare il grado di gravità. Accedere alla scheda Violazione e impostare il valore.`
          })
        }
      }
      const tipoAbuso = String(pickAttrCI(data, ['tipo_abuso', 'TIPO_ABUSO']) || '').toLowerCase()
      if (tipoAbuso === 'parziale' || tipoAbuso === 'totale') {
        const occ = pickAttrCI(data, ['occorrenza', 'OCCORRENZA'])
        if (String(occ ?? '').trim() !== '1' && String(occ ?? '').trim() !== '2') {
          missingItems.push({
            art: 15,
            message: "Impossibile trasmettere: per l'Art. 15 è obbligatorio specificare l'occorrenza. Accedere alla scheda Violazione e impostare il valore."
          })
        }
      }
      const msgs = missingItems
        .sort((a, b) => a.art - b.art)
        .map(item => item.message)
      if (msgs.length > 0) {
        setDenyPopupMessages(msgs)
        return
      }
    }

    // Validazione TI → RZ: "Il trasgressore era presente?" obbligatorio se è selezionata
    // almeno una violazione — stessa regola già applicata in salvataggio da gii-editing-ti,
    // qui rinforzata anche in fase di inoltro.
    if (p === 'APPROVA' && role === 'TI') {
      const norma3Selected = parseNorma3Codes(pickAttrCI(data, ['norma_violata3', 'NORMA_VIOLATA3']))
      const hasArt15 = !!String(pickAttrCI(data, ['norma15_parziale', 'NORMA15_PARZIALE']) || '').trim() ||
        !!String(pickAttrCI(data, ['norma15_totale', 'NORMA15_TOTALE']) || '').trim()
      const hasArt1617 = !!String(pickAttrCI(data, ['norma16_17', 'NORMA16_17']) || '').trim()
      const selectedViolazioniCount = norma3Selected.length + (hasArt15 ? 1 : 0) + (hasArt1617 ? 1 : 0)
      const presenzaTrasgressore = String(pickAttrCI(data, ['presenza_trasgressore', 'PRESENZA_TRASGRESSORE']) || '').trim()
      if (selectedViolazioniCount > 0 && !presenzaTrasgressore) {
        setDenyPopupMessages([
          "Impossibile trasmettere: è obbligatorio specificare se il trasgressore era presente al momento del rilevamento. Accedere alla scheda Violazione e impostare il valore."
        ])
        return
      }
    }

    if (!opts?.keepActionsMenuOpen) setActionsMenuOpen(false)
    setPending(p)
    setMsg(null)
    setConfirmAttempted(false)
    resetStructuredReasons()
    setTiLoadErr('')

    if (p === 'ASSEGNA_TI') {
      // La scelta del TI deve essere esplicita: non preselezioniamo l'eventuale
      // valore storico già presente sul record.
      setTiSelected('')
      window.setTimeout(() => { void loadTiOptions() }, 0)
    } else {
      setTiSelected('')
    }

    if (p === 'ASSEGNA_TI_AMM') {
      // La scelta del TI AMM deve essere esplicita: non preselezioniamo l'eventuale
      // valore storico già presente sul record.
      setTiAmmSelected('')
      setTiAmmLoadErr('')
      window.setTimeout(() => { void loadTiAmmOptions() }, 0)
    } else {
      setTiAmmSelected('')
    }

    if (p === 'INTEGRAZIONE' || p === 'INTEGRAZIONE_TI_AMM' || p === 'INTEGRAZIONE_TECNICA' || p === 'RESPINGI') {
      setNoteDraft('')  // Pulisci note/motivazioni per una nuova azione distinta
      window.setTimeout(() => {
        try { noteRef.current?.focus?.() } catch {}
        autoResizeNote(noteRef.current)
      }, 0)
    }
  }

  const getRootDs = (maybeDs: any) => {
    return getRootDsObj(maybeDs) || maybeDs
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


  type RunApplyEditsOptions = {
    deferRefresh?: boolean
    keepLoading?: boolean
    operationContextStamp?: GiiPracticeContextStamp
  }

  const markRestoreSelectionAfterAction = React.useCallback((source = 'azioni') => {
    try {
      if (!hasSel || oid == null || !Number.isFinite(Number(oid))) return
      const w: any = window as any
      const layerUrl = String(
        active?.state?.ds?.getDataSourceJson?.()?.url ||
        active?.state?.ds?.dataSourceJson?.url ||
        active?.state?.ds?.layer?.url ||
        w.__giiSelection?.layerUrl ||
        sessionStorage.getItem('GII_SELECTED_LAYER_URL') ||
        active?.key ||
        ''
      ).trim()
      if (!layerUrl) return
      const idFieldName = String(
        idFieldNameFromSel ||
        w.__giiSelection?.idFieldName ||
        sessionStorage.getItem('GII_SELECTED_IDFIELD') ||
        'OBJECTID'
      ).trim() || 'OBJECTID'
      sessionStorage.setItem('GII_RESTORE_SELECTION_AFTER_EDIT', JSON.stringify(stampGiiPracticePayload({
        oid: Number(oid),
        layerUrl,
        idFieldName,
        source,
        ts: Date.now()
      })))
    } catch {}
  }, [active, hasSel, idFieldNameFromSel, oid])

  const markAfterWorkflowListNavigation = React.useCallback((source = 'workflow') => {
    try {
      if (!hasSel || oid == null || !Number.isFinite(Number(oid))) return
      sessionStorage.setItem('GII_AFTER_WORKFLOW_NAV', JSON.stringify(stampGiiPracticePayload({
        oid: Number(oid),
        source,
        targetRoleTab: 'attesa_altri',
        ts: Date.now()
      })))
    } catch {}
  }, [hasSel, oid])

  const clearAfterWorkflowListNavigation = React.useCallback(() => {
    try { sessionStorage.removeItem('GII_AFTER_WORKFLOW_NAV') } catch {}
  }, [])

  const refreshAfterWorkflowSave = async (reason = 'azioni-post-applyedits') => {
    const root = getRootDs(ds)
    await refreshRootAndDerived(root)
    await refreshRootAndDerived(ds)

    try { delete (window as any).__giiRuntimeDsProxyCache } catch {}

    try {
      window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', {
        detail: { source: reason, oid, ts: Date.now() }
      }))
    } catch {}

    const reasonText = String(reason || '')
    // La presa in carico resta nella scheda corrente; le trasmissioni/rimandi
    // con LOG possono spostare la pratica in un'altra scheda. In entrambi i casi
    // NON va emesso un clear della selezione runtime: l'elenco deve poter
    // riagganciare lo stesso OBJECTID e ripubblicarlo al dettaglio.
    const keepRuntimeSelection =
      reasonText.startsWith('azioni-presa-in-carico') ||
      reasonText === 'azioni-post-log'
    if (!keepRuntimeSelection) {
      clearRuntimeSelection(reason)
    }
    // Dopo trasmissione/rimando il pannello azioni può svuotarsi, ma senza
    // cancellare la selezione runtime condivisa con elenco/dettaglio.
    if (!reasonText.startsWith('azioni-presa-in-carico')) {
      setLocalData(null)
    }
  }

  const buildTechnicalChainInformativeActivities = (kind: 'DT_APPROVA' | 'DT_RESPINGE' | 'DT_RIMANDA_TI' | 'RI_RIMANDA_TI' | 'RZ_APPROVA' | 'RZ_RESPINGE', _overrideAttrs?: Record<string, any>): InformativeActivityTarget[] => {
    const tiUser = resolveDestUser('TI')
    const hasTiDest = !!String(tiUser || '').trim()
    const out: InformativeActivityTarget[] = []
    const add = (ruoloDestinatario: string, titolo: string, messaggio: string, sottotipo: string, utenteDestinatario?: string) => {
      out.push({ ruoloDestinatario, utenteDestinatario, titolo, messaggio, sottotipo, priorita: 'INFO' })
    }
    const addTiIfPresent = (titolo: string, messaggio: string, sottotipo: string) => {
      // Il TI va avvisato solo quando esiste davvero un TI assegnato alla pratica
      // (origine TI oppure rilevazione già assegnata a TI). Per le rilevazioni TR
      // non va creato un avviso generico rivolto a tutti i TI del settore.
      if (hasTiDest) add('TI', titolo, messaggio, sottotipo, tiUser)
    }

    if (kind === 'DT_APPROVA') {
      const titolo = 'Rapporto tecnico approvato'
      const messaggio = 'Trasmesso all’Area Amministrativa.'
      add('RI', titolo, messaggio, 'DT_APPROVA_RAPPORTO')
      add('RZ', titolo, messaggio, 'DT_APPROVA_RAPPORTO')
      addTiIfPresent(titolo, messaggio, 'DT_APPROVA_RAPPORTO')
    }

    if (kind === 'DT_RESPINGE') {
      const titolo = 'Rapporto tecnico respinto'
      const messaggio = 'Esito registrato.'
      add('RI', titolo, messaggio, 'DT_RESPINGE_RAPPORTO')
      add('RZ', titolo, messaggio, 'DT_RESPINGE_RAPPORTO')
      addTiIfPresent(titolo, messaggio, 'DT_RESPINGE_RAPPORTO')
    }

    if (kind === 'DT_RIMANDA_TI') {
      const titolo = 'Rimando al Tecnico istruttore'
      const messaggio = 'Richieste integrazioni o rettifiche.'
      add('RI', titolo, messaggio, 'DT_RIMANDA_A_TI')
      add('RZ', titolo, messaggio, 'DT_RIMANDA_A_TI')
    }

    if (kind === 'RI_RIMANDA_TI') {
      const titolo = 'Rimando al Tecnico istruttore'
      const messaggio = 'Richieste integrazioni o rettifiche.'
      add('RZ', titolo, messaggio, 'RI_RIMANDA_A_TI')
    }

    if (kind === 'RZ_APPROVA') {
      const titolo = praticaLabel === 'Rapporto tecnico' ? 'Integrazione validata' : 'Rilevazione approvata'
      const messaggio = 'Trasmessa al Responsabile istruttoria.'
      addTiIfPresent(titolo, messaggio, 'RZ_APPROVA_RILEVAZIONE')
    }

    if (kind === 'RZ_RESPINGE') {
      const titolo = 'Rilevazione respinta'
      const messaggio = 'Esito registrato.'
      addTiIfPresent(titolo, messaggio, 'RZ_RESPINGE_RILEVAZIONE')
    }

    return out
  }

  const saveWithWorkflowLog = async (
    attributesIn: Record<string, any>,
    okText: string,
    logOpts: { eventoChiusura: string, ruoloDestinatario?: string, utenteDestinatario?: string, noteChiusura?: string, fase?: string, informativeActivities?: InformativeActivityTarget[], skipCurrentActivity?: boolean }
  ) => {
    const operationContextStamp = getGiiPracticeContextStamp()
    const operationContextIsCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    const resolvedLogOpts = {
      ...logOpts,
      informativeActivities: (logOpts?.informativeActivities || []).map((info) => ({ ...info }))
    }
    if (resolvedLogOpts.ruoloDestinatario && !String(resolvedLogOpts.utenteDestinatario || '').trim()) {
      resolvedLogOpts.utenteDestinatario = await resolveDestUserAsync(resolvedLogOpts.ruoloDestinatario)
    }
    for (const info of resolvedLogOpts.informativeActivities || []) {
      if (info?.ruoloDestinatario && !String(info.utenteDestinatario || '').trim()) {
        info.utenteDestinatario = await resolveDestUserAsync(info.ruoloDestinatario)
      }
    }

    if (!operationContextIsCurrent()) return

    // Le azioni di workflow possono lasciare il rapporto visibile nella scheda corrente
    // (es. tab "Tutte le pratiche") oppure farlo uscire dalla coda corrente
    // (es. tab "In attesa mia" dopo una trasmissione).
    // Registriamo solo l'intenzione di ripristino: sarà l'elenco a ripristinare
    // la selezione esclusivamente se il record è ancora visibile nella scheda attiva.
    markRestoreSelectionAfterAction(String(resolvedLogOpts?.eventoChiusura || 'workflow'))
    if (resolvedLogOpts?.ruoloDestinatario) {
      // Dopo una trasmissione/rimando/assegnazione l'oggetto esce normalmente
      // da "In attesa mia". L'elenco, se l'utente era in quella scheda,
      // passerà a "In attesa di altri" e manterrà la selezione sullo stesso record.
      markAfterWorkflowListNavigation(String(resolvedLogOpts?.eventoChiusura || 'workflow'))
    }
    const auditDelta = buildWorkflowActionAuditDelta(attributesIn)
    try {
      const committed = await runApplyEdits(attributesIn, okText, { deferRefresh: true, keepLoading: true, operationContextStamp })
      if (!committed) return
      await closeCycleLog({ ...resolvedLogOpts, auditOldMap: auditDelta.oldMap, auditNewMap: auditDelta.newMap })
      await deleteCurrentActivityForCurrentRole()
      if (resolvedLogOpts?.ruoloDestinatario && !resolvedLogOpts.skipCurrentActivity) await upsertCurrentActivityForDest(resolvedLogOpts, attributesIn)
      for (const info of (resolvedLogOpts?.informativeActivities || [])) {
        await upsertInformativeActivityForDest(info, attributesIn)
      }
      if (operationContextIsCurrent()) await refreshAfterWorkflowSave('azioni-post-log')
    } finally {
      if (operationContextIsCurrent()) setLoading(false)
    }
  }

  const runApplyEdits = async (attributesIn: Record<string, any>, okText: string, options?: RunApplyEditsOptions) => {
    if (!ds) throw new Error('DataSource non disponibile.')
    if (!hasSel || oid == null) throw new Error('Selezione non valida.')

    const startKey = selectionKeyRef.current
    const operationContextStamp = options?.operationContextStamp || getGiiPracticeContextStamp()
    const operationContextIsCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!operationContextIsCurrent()) return false
    setLoading(true)
    setMsg({ kind: 'info', text: 'Aggiorno…' })

    try {
      const root = getRootDs(ds)

      // ── JS API layer (viste con editing abilitato) ─────────────────────────
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

      const fullAttrsBeforeSanzione: Record<string, any> = { [idFieldName]: oid, ...attributesIn }
      const isRiAmmPresaInCarico = Number(fullAttrsBeforeSanzione.stato_RI_AMM) === 2

      let sanzioneExtra: Record<string, any> = {}
      if (isRiAmmPresaInCarico) {
        try {
          const profileForSanzione = {
            username: String((window as any).__giiUserRole?.username || ''),
            fullName: String((window as any).__giiUserRole?.fullName || (window as any).__giiUserRole?.full_name || '')
          }
          const schemaFieldsForSanzione: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
          const fieldsForSanzione = Object.keys(schemaFieldsForSanzione).map(name => ({
            name,
            type: String(schemaFieldsForSanzione[name]?.type || ''),
            alias: schemaFieldsForSanzione[name]?.alias,
            domain: schemaFieldsForSanzione[name]?.domain || null
          }))
          sanzioneExtra = await computeSanzioneAutomatica(
            props.sanzioneConfig,
            { ...(data || {}), ...attributesIn },
            fieldsForSanzione as any,
            profileForSanzione,
            data || {}
          )
        } catch (e: any) {
          console.warn('[GII_SANZIONE] calcolo automatico fallito, salvataggio prosegue senza sanzione ricalcolata', e?.message || e)
        }
      }

      const fullAttrs = { [idFieldName]: oid, ...attributesIn, ...sanzioneExtra }
      const attrs = filterAttrsToLayerFields(fullAttrs, layer)

      if (!operationContextIsCurrent()) return false
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

      // La scrittura può essere già stata accettata dal servizio mentre l'account
      // cambia. In tal caso non applichiamo alcun effetto locale al nuovo contesto.
      if (!operationContextIsCurrent()) return true

      // se la selezione è cambiata nel frattempo: niente messaggi “appesi”
      if (selectionKeyRef.current !== startKey) {
        setMsg(null)
        setLoading(false)
        return
      }

      setMsg({ kind: 'ok', text: okText })

      // Aggiorna subito la UI e la cache globale della selezione con i valori appena salvati.
      // Senza questa propagazione il refresh può rileggere per qualche istante il record vecchio
      // e lasciare visibile un pulsante ormai superato, es. "Prendi in carico" dopo la presa.
      let optimisticData: any = null
      try {
        const cur = (baseData && typeof baseData === 'object') ? baseData : {}
        optimisticData = { ...cur, ...attributesIn, ...attrs }
        setLocalData(optimisticData)
      } catch {}

      try {
        const layerUrlForCache = String(
          active?.state?.ds?.getDataSourceJson?.()?.url ||
          active?.state?.ds?.dataSourceJson?.url ||
          active?.state?.ds?.layer?.url ||
          layer?.url ||
          active?.key ||
          ''
        ).trim()
        if (layerUrlForCache && optimisticData) {
          writeSelectedFeatureCache(layerUrlForCache, oid, idFieldName, optimisticData, 'edit')
          const w: any = window as any
          if (w.__giiSelection && Number(w.__giiSelection.oid) === Number(oid)) {
            const selUrl = String(w.__giiSelection.layerUrl || '').trim()
            if (!selUrl || selUrl === layerUrlForCache) {
              w.__giiSelection = { ...w.__giiSelection, data: optimisticData }
            }
          }
        }
      } catch {}

      if (!options?.deferRefresh) {
        // L'azione modifica lo stato procedimentale del record: se il rapporto esce
        // dall'elenco corrente, il cw azioni non deve restare appeso alla vecchia
        // selezione. Per le azioni che scrivono anche il LOG eventi/cicli, questo
        // refresh viene differito e fatto una sola volta dopo la scrittura del LOG.
        await refreshAfterWorkflowSave('azioni-post-applyedits')
      }

      window.setTimeout(() => {
        if (selectionKeyRef.current === startKey) setMsg(null)
      }, 4500)

      if (!options?.keepLoading) setLoading(false)
      return true
    } catch (e) {
      if (operationContextIsCurrent()) setLoading(false)
      throw e
    }
  }

  const onConfirmTakeInCharge = async () => {
    setConfirmAttempted(true)
    setLoading(true)
    setMsg(null)

    try {
      // Costruisci l'update SOLO con i campi che esistono nello schema.
      // Questo evita patch ottimistici su campi inesistenti che poi "spariscono" al reselect.
      const upd: Record<string, any> = {}
      if (presaFieldExists) upd[realFieldName(presaField)] = PRESA_IN_CARICO
      if (dtPresaFieldExists) upd[realFieldName(dtPresaField)] = Date.now()

      // stato_* è il campo realmente "portante" nel workflow: aggiorniamolo sempre.
      // Se lo schema non è disponibile, realFieldName() torna il nome originale.
      upd[realFieldName(statoField)] = STATO_PRESA_IN_CARICO
      upd[realFieldName(dtStatoField)] = Date.now()

      // La presa in carico non e' una trasmissione/rimando: non deve attivare
      // la navigazione post-workflow dell'elenco verso "In attesa di altri" o "Tutte".
      // Puliamo anche eventuali marker rimasti da azioni precedenti sulla stessa sessione.
      clearAfterWorkflowListNavigation()
      markRestoreSelectionAfterAction('presa-in-carico')
      const cycleContextBeforeSave = await getCurrentCycleContextAsync()
      await runApplyEdits(upd, riAmmBozzaDeterminazioneDaVerificare ? 'Presa in carico della pratica salvata.' : 'Presa in carico salvata.', { deferRefresh: true, keepLoading: true })
      await openCycleLog({ eventoApertura: 'PRESA_IN_CARICO', fase: role, context: cycleContextBeforeSave, forceNew: true })
      await deleteCurrentActivityForCurrentRole()
      await refreshAfterWorkflowSave('azioni-presa-in-carico-post-log')
      clearAfterWorkflowListNavigation()
      setLoading(false)

      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      setLoading(false)
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }


  const onConfirmAssegnaTi = async () => {
    setConfirmAttempted(true)
    if (!tiSelected) return
    setLoading(true)
    setMsg(null)

    try {
      const u: any = (window as any).__giiUserRole || {}
      const rzUser = String(u?.username || '').trim()
      const ti = tiOptions.find(o => o.username === tiSelected) || null
      const tiName = String(ti?.fullName || tiSelected).trim()

      const upd: Record<string, any> = {
        ti_assegnato_username: tiSelected,
        ti_assegnato_nome: tiName,
        dt_assegnazione_ti: Date.now(),
        ti_assegnato_da: rzUser
      }

      // opzionale: inizializza la "coda TI" se i campi esistono nel layer
      try {
        const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
        const keys = Object.keys(schemaFields || {})
        const ci: Record<string, string> = {}
        keys.forEach(k => { ci[String(k).toLowerCase()] = k })
        const pick = (name: string) => ci[String(name).toLowerCase()] || null

        const fStatoTI = pick('stato_TI')
        const fDtStatoTI = pick('dt_stato_TI')
        const fPresaTI = pick('presa_in_carico_TI')
        const fDtPresaTI = pick('dt_presa_in_carico_TI')
        const fEsitoTI = pick('esito_TI')
        const fDtEsitoTI = pick('dt_esito_TI')

        if (fStatoTI) upd[fStatoTI] = STATO_DA_PRENDERE
        if (fDtStatoTI) upd[fDtStatoTI] = Date.now()
        if (fPresaTI) upd[fPresaTI] = PRESA_DA_PRENDERE
        if (fDtPresaTI) upd[fDtPresaTI] = null
        if (fEsitoTI) upd[fEsitoTI] = null
        if (fDtEsitoTI) upd[fDtEsitoTI] = null
      } catch {}


      addGiiRoutingFields(upd, 'TI', 'TRASMISSIONE', { destUsername: tiSelected })

      await saveWithWorkflowLog(upd, `Tecnico Istruttore assegnato: ${tiName}.`, { eventoChiusura: 'NUOVA_ASSEGNAZIONE', ruoloDestinatario: 'TI', utenteDestinatario: tiSelected, noteChiusura: `Assegna Tecnico Istruttore: ${tiName} (${tiSelected})`, fase: role })

      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      setLoading(false)
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmAssegnaTiAmm = async () => {
    setConfirmAttempted(true)
    if (!tiAmmSelected) return
    setLoading(true)
    setMsg(null)

    try {
      const u: any = (window as any).__giiUserRole || {}
      const riAmmUser = String(u?.username || '').trim()
      const tiAmm = tiAmmOptions.find(o => o.username === tiAmmSelected) || null
      const tiAmmName = String(tiAmm?.fullName || tiAmmSelected).trim()
      const isRiaperturaAssignment = riaperturaWorkflowDaAvviare

      const upd: Record<string, any> = {
        ti_amm_assegnato_username: tiAmmSelected,
        ti_amm_assegnato_nome: tiAmmName,
        ti_amm_assegnato_da: riAmmUser,
        dt_assegnazione_ti_amm: Date.now()
      }

      // Inizializza nodo TI_AMM
      try {
        const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
        const keys = Object.keys(schemaFields || {})
        const ci: Record<string, string> = {}
        keys.forEach(k => { ci[String(k).toLowerCase()] = k })
        const pick = (name: string) => ci[String(name).toLowerCase()] || null

        const now = Date.now()

        const fStato = pick('stato_TI_AMM')
        const fDtStato = pick('dt_stato_TI_AMM')
        const fPresa = pick('presa_in_carico_TI_AMM')
        const fDtPresa = pick('dt_presa_in_carico_TI_AMM')
        const fEsito = pick('esito_TI_AMM')
        const fDtEsito = pick('dt_esito_TI_AMM')

        if (fStato) upd[fStato] = STATO_DA_PRENDERE
        if (fDtStato) upd[fDtStato] = now
        if (fPresa) upd[fPresa] = PRESA_DA_PRENDERE
        if (fDtPresa) upd[fDtPresa] = null
        if (fEsito) upd[fEsito] = null
        if (fDtEsito) upd[fDtEsito] = null

        // Chiusura pulita del nodo RI_AMM dopo assegnazione al TI_AMM.
        // Se RI_AMM proveniva da un precedente giro di integrazione tecnica,
        // può avere ancora esito_RI_AMM = 1; lasciarlo valorizzato fa comparire
        // l'elenco come "Integrazione richiesta" anche dopo una normale assegnazione.
        const fStatoRiAmm = pick('stato_RI_AMM')
        const fDtStatoRiAmm = pick('dt_stato_RI_AMM')
        const fEsitoRiAmm = pick('esito_RI_AMM')
        const fDtEsitoRiAmm = pick('dt_esito_RI_AMM')
        if (fStatoRiAmm) upd[fStatoRiAmm] = STATO_APPROVATA // dominio stato: 4 = Trasmesso
        if (fDtStatoRiAmm) upd[fDtStatoRiAmm] = now
        if (fEsitoRiAmm) upd[fEsitoRiAmm] = null
        if (fDtEsitoRiAmm) upd[fDtEsitoRiAmm] = null

        if (isRiaperturaAssignment) {
          // La nuova istruttoria riparte dal TI_AMM e dovrà essere nuovamente
          // verificata da RI_AMM. I dati sostanziali del ricorso/CdA restano
          // storicizzati nel record e nel log.
          const fChiusuraIl = pick('istruttoria_amm_chiusa_il')
          const fChiusuraDa = pick('istruttoria_amm_chiusa_da')
          const fDeterminaStato = pick('determinazione_stato')
          const fDeterminaNumero = pick('determinazione_numero')
          const fDeterminaData = pick('determinazione_data')
          const fDeterminaTrasIl = pick('determinazione_trasmessa_firma_il')
          const fDeterminaTrasDa = pick('determinazione_trasmessa_firma_da')
          const fDeterminaRegIl = pick('determinazione_registrata_il')
          const fDeterminaRegDa = pick('determinazione_registrata_da')
          const fDefEsito = pick('definizione_pratica_esito')
          const fDefData = pick('definizione_pratica_data')
          const fDefDa = pick('definizione_pratica_da')
          const fDefNote = pick('definizione_pratica_note')

          if (fChiusuraIl) upd[fChiusuraIl] = null
          if (fChiusuraDa) upd[fChiusuraDa] = null
          if (fDeterminaStato) upd[fDeterminaStato] = null
          if (fDeterminaNumero) upd[fDeterminaNumero] = null
          if (fDeterminaData) upd[fDeterminaData] = null
          if (fDeterminaTrasIl) upd[fDeterminaTrasIl] = null
          if (fDeterminaTrasDa) upd[fDeterminaTrasDa] = null
          if (fDeterminaRegIl) upd[fDeterminaRegIl] = null
          if (fDeterminaRegDa) upd[fDeterminaRegDa] = null
          if (fDefEsito) upd[fDefEsito] = null
          if (fDefData) upd[fDefData] = null
          if (fDefDa) upd[fDefDa] = null
          if (fDefNote) upd[fDefNote] = null
        }
      } catch {}

      addGiiRoutingFields(upd, 'TI_AMM', 'TRASMISSIONE', { destUsername: tiAmmSelected })

      const reopenMarker = isRiaperturaAssignment ? `Riapertura amministrativa n. ${riaperturaAmmNumero}. ` : ''
      const successMessage = isRiaperturaAssignment
        ? `Nuova istruttoria amministrativa avviata e assegnata a ${tiAmmName}.`
        : `Tecnico Istruttore amministrativo assegnato: ${tiAmmName}.`
      await saveWithWorkflowLog(upd, successMessage, { eventoChiusura: 'NUOVA_ASSEGNAZIONE', ruoloDestinatario: 'TI_AMM', utenteDestinatario: tiAmmSelected, noteChiusura: `${reopenMarker}Assegna Tecnico Istruttore amministrativo: ${tiAmmName} (${tiAmmSelected})`, fase: role })
      if (isRiaperturaAssignment) setRiaperturaWorkflowStarted(true)

      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      setLoading(false)
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmRestituisciTiAmm = async () => {
    setConfirmAttempted(true)
    setLoading(true)
    setMsg(null)

    try {
      const now = Date.now()
      const upd: Record<string, any> = {}
      const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}

      // Chiude il ciclo RI_AMM come trasmissione/restituzione, non come integrazione.
      const fStatoRiAmm = getSchemaFieldNameCI(schemaFields, 'stato_RI_AMM')
      const fDtStatoRiAmm = getSchemaFieldNameCI(schemaFields, 'dt_stato_RI_AMM')
      const fEsitoRiAmm = getSchemaFieldNameCI(schemaFields, 'esito_RI_AMM')
      const fDtEsitoRiAmm = getSchemaFieldNameCI(schemaFields, 'dt_esito_RI_AMM')
      if (fStatoRiAmm) upd[fStatoRiAmm] = STATO_APPROVATA
      if (fDtStatoRiAmm) upd[fDtStatoRiAmm] = now
      if (fEsitoRiAmm) upd[fEsitoRiAmm] = null
      if (fDtEsitoRiAmm) upd[fDtEsitoRiAmm] = null

      // Riapre il TI_AMM originario come destinatario operativo.
      const fStatoTiAmm = getSchemaFieldNameCI(schemaFields, 'stato_TI_AMM')
      const fDtStatoTiAmm = getSchemaFieldNameCI(schemaFields, 'dt_stato_TI_AMM')
      const fDtPresaTiAmm = getSchemaFieldNameCI(schemaFields, 'dt_presa_in_carico_TI_AMM')
      const fEsitoTiAmm = getSchemaFieldNameCI(schemaFields, 'esito_TI_AMM')
      const fDtEsitoTiAmm = getSchemaFieldNameCI(schemaFields, 'dt_esito_TI_AMM')
      if (fStatoTiAmm) upd[fStatoTiAmm] = STATO_DA_PRENDERE
      if (fDtStatoTiAmm) upd[fDtStatoTiAmm] = now
      if (fDtPresaTiAmm) upd[fDtPresaTiAmm] = null
      if (fEsitoTiAmm) upd[fEsitoTiAmm] = null
      if (fDtEsitoTiAmm) upd[fDtEsitoTiAmm] = null

      addGiiRoutingFields(upd, 'TI_AMM', 'TRASMISSIONE', { destUsername: String(tiAmmUserRaw || '') })

      const noteInvioTiAmm = noteTrim || (isRientroTecnicoDaDt
        ? 'Invio al Tecnico Istruttore amministrativo dopo rientro da integrazione tecnica.'
        : 'Invio al Tecnico Istruttore amministrativo.')
      await saveWithWorkflowLog(upd, 'Pratica inviata al Tecnico Istruttore amministrativo.', { eventoChiusura: 'INVIO_A_TI_AMM', ruoloDestinatario: 'TI_AMM', utenteDestinatario: String(tiAmmUserRaw || resolveDestUser('TI_AMM')), noteChiusura: noteInvioTiAmm, fase: role })
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      setLoading(false)
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmIntegrazione = async () => {
    setConfirmAttempted(true)
    if (integrationReasonInvalid || integrationTargetsInvalid || noteInvalid || (hasOtherMotivation && !noteDraftTrim)) return
    setLoading(true)
    setMsg(null)

    try {
      const stato = mapEsitoToStato(ESITO_INTEGRAZIONE) // => 3
      const upd: Record<string, any> = {
        [esitoField]: ESITO_INTEGRAZIONE,
        [dtEsitoField]: Date.now(),
        [statoField]: stato ?? STATO_INTEGRAZIONE,
        [dtStatoField]: Date.now(),
        [noteField]: noteTrim
      }

      const ruoloDest = getPrevRoleForIntegration(
        pending === 'INTEGRAZIONE_TI_AMM' ? 'TI_AMM' :
        pending === 'INTEGRAZIONE_TECNICA' ? 'TECNICA' :
        undefined
      )
      if (ruoloDest) {
        try {
          const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
          const fStato = getSchemaFieldNameCI(schemaFields, `stato_${ruoloDest}`)
          const fDtStato = getSchemaFieldNameCI(schemaFields, `dt_stato_${ruoloDest}`)
          const fPresa = hasDedicatedPresaField(ruoloDest) ? getSchemaFieldNameCI(schemaFields, `presa_in_carico_${ruoloDest}`) : null
          const fDtPresa = getSchemaFieldNameCI(schemaFields, `dt_presa_in_carico_${ruoloDest}`)
          const fEsito = getSchemaFieldNameCI(schemaFields, `esito_${ruoloDest}`)
          const fDtEsito = getSchemaFieldNameCI(schemaFields, `dt_esito_${ruoloDest}`)
          if (fStato) upd[fStato] = STATO_DA_PRENDERE
          if (fDtStato) upd[fDtStato] = Date.now()
          if (fPresa) upd[fPresa] = PRESA_DA_PRENDERE
          if (fDtPresa) upd[fDtPresa] = null
          // RI_AMM -> TI_AMM dopo il visto del Tecnico istruttore amministrativo:
          // il nuovo nodo TI_AMM viene riaperto, ma non va cancellato l'esito
          // precedente del TI_AMM. Quel visto resta parte della verifica istruttoria
          // e deve rimanere visibile insieme all'esito del Responsabile
          // dell'istruttoria amministrativa, anche quando quest'ultimo richiede
          // integrazioni o rettifiche. Il nuovo visto del TI_AMM sovrascriverà
          // questi campi quando la pratica verrà nuovamente attestata.
          const preserveTiAmmEsitoAfterRiAmmRimando =
            role === 'RI_AMM' &&
            ruoloDest === 'TI_AMM' &&
            pending === 'INTEGRAZIONE_TI_AMM'
          if (fEsito && !preserveTiAmmEsitoAfterRiAmmRimando) upd[fEsito] = null
          if (fDtEsito && !preserveTiAmmEsitoAfterRiAmmRimando) upd[fDtEsito] = null

          // Rimando RI_AMM -> TI_AMM dopo trasmissione della bozza determinazione.
          // Il rientro apre una fase di rettifica: la vecchia verifica RI_AMM resta
          // tracciata nello storico, ma non può sbloccare protocollazione o firma.
          // Oggetto e motivazione del rimando sono registrati nelle note RI_AMM; il TI_AMM
          // predisporrà e caricherà una nuova bozza PDF prima della nuova trasmissione.
          // Il valore del campo resta BOZZA perché determinazione_stato ha un dominio
          // codificato e non consente stati intermedi non previsti dallo schema.
          if (pending === 'INTEGRAZIONE_TI_AMM' && ruoloDest === 'TI_AMM') {
            const fDeterminaStato = getSchemaFieldNameCI(schemaFields, 'determinazione_stato')
            if (fDeterminaStato) upd[fDeterminaStato] = 'BOZZA'
          }
        } catch {}
      }

      if (ruoloDest) {
        addGiiRoutingFields(upd, ruoloDest, 'INTEGRAZIONE', { technicalIntegration: pending === 'INTEGRAZIONE_TECNICA' })
      }

      if (ruoloDest) {
        const successMsg = pending === 'INTEGRAZIONE' ? 'Pratica rimandata per integrazione.' : 'Integrazione richiesta salvata.'
        const informativeActivities = role === 'DT' && ruoloDest === 'TI'
          ? buildTechnicalChainInformativeActivities('DT_RIMANDA_TI', upd)
          : role === 'RI' && ruoloDest === 'TI'
            ? buildTechnicalChainInformativeActivities('RI_RIMANDA_TI', upd)
            : []
        await saveWithWorkflowLog(upd, successMsg, { eventoChiusura: 'INTEGRAZIONE_RICHIESTA', ruoloDestinatario: ruoloDest, utenteDestinatario: resolveDestUser(ruoloDest), noteChiusura: noteTrim, fase: role, informativeActivities })
      } else {
        const successMsg = pending === 'INTEGRAZIONE' ? 'Pratica rimandata per integrazione.' : 'Integrazione richiesta salvata.'
        await runApplyEdits(upd, successMsg)
      }
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      setLoading(false)
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmEsito = async (esito: number, label: string) => {
    setLoading(true)
    setMsg(null)

    try {
      const now = Date.now()
      const stato = mapEsitoToStato(esito)
      const upd: Record<string, any> = {
        [esitoField]: esito,
        [dtEsitoField]: now
      }
      let riAmmApprovedProposalSync: { layer: any, layerUrl: string, file: File } | null = null
      let tiAmmAttestationProposalSync: { layer: any, layerUrl: string, file: File } | null = null
      if (esito === ESITO_APPROVATA && noteTrim) {
        upd[noteField] = noteTrim
      }
      const isTiAmmAttestazioneConformita = role === 'TI_AMM' && esito === ESITO_APPROVATA
      if (isTiAmmAttestazioneConformita) {
        const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
        const setIfPresent = (logicalName: string, value: any) => {
          const real = getSchemaFieldNameCI(schemaFields, logicalName)
          if (real) upd[real] = value
        }

        // Il visto eseguito dal CW Azioni deve aprire esattamente lo stesso ciclo
        // creato da editing-amm. In particolare non deve riutilizzare la motivazione
        // di un precedente rimando e non deve aprire ancora il nodo RI_AMM.
        const defaultAttestationNote = 'A seguito della verifica svolta, si attesta la conformità della pratica sotto il profilo istruttorio-amministrativo.'
        const requestedAttestationNote = String(noteTrim || '').trim()
        const attestationNote = /motivazione\s+del\s+rimando|integrazion|rettific/i.test(requestedAttestationNote)
          ? defaultAttestationNote
          : (requestedAttestationNote || defaultAttestationNote)
        upd[noteField] = attestationNote
        setIfPresent('note_atto_amm', attestationNote)

        setIfPresent('determinazione_stato', 'BOZZA')
        setIfPresent('stato_RI_AMM', 4)
        setIfPresent('dt_stato_RI_AMM', null)
        setIfPresent('dt_presa_in_carico_RI_AMM', null)
        setIfPresent('esito_RI_AMM', null)
        setIfPresent('dt_esito_RI_AMM', null)
        setIfPresent('note_RI_AMM', null)
        setIfPresent('protocollo_fascicolo_numero', null)
        setIfPresent('protocollo_fascicolo_data', null)
        setIfPresent('dt_bozza_determinazione', null)
        setIfPresent('bozza_determinazione_da', null)

        // Stesso builder e stessa funzione di sostituzione usati da editing-amm:
        // il visto genera la Proposta DRAFT, ma la pratica resta al TI_AMM finché
        // non viene usato "Trasmetti fascicolo al Responsabile".
        const { layer } = await resolveLayer(ds)
        if (!layer) throw new Error('Layer non disponibile per generare la Proposta di contestazione.')
        if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
        const layerUrl = String(
          layer?.url ||
          active?.state?.ds?.getDataSourceJson?.()?.url ||
          active?.state?.ds?.dataSourceJson?.url ||
          active?.state?.ds?.layer?.url ||
          active?.key ||
          ''
        ).trim().replace(/\/+$/, '')
        if (!layerUrl) throw new Error('URL del FeatureLayer non disponibile per generare la Proposta di contestazione.')
        const proposalFields = Array.isArray(layer?.fields) && layer.fields.length
          ? layer.fields.map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
          : Object.keys(schemaFields).map(name => ({ name, type: String(schemaFields[name]?.type || ''), alias: String(schemaFields[name]?.alias || name), domain: schemaFields[name]?.domain || null, editable: schemaFields[name]?.editable !== false }))
        const currentProfile: any = (window as any).__giiUserRole || {}
        let liveProposalAttrs: Record<string, any> | null = null
        try {
          liveProposalAttrs = await queryCurrentRecordAttrs()
        } catch {}
        const propostaBlob = await buildVerbalePdfBlob(
          { ...(liveProposalAttrs || data || {}), ...upd },
          proposalFields as any,
          {
            username: String(currentProfile?.username || ''),
            fullName: String(currentProfile?.fullName || currentProfile?.full_name || currentProfile?.username || '')
          }
        )
        tiAmmAttestationProposalSync = {
          layer,
          layerUrl,
          file: new File([propostaBlob.blob], propostaBlob.fileName, { type: 'application/pdf', lastModified: now })
        }
      }
      if (stato != null) {
        upd[statoField] = stato
        upd[dtStatoField] = now
      }

      if (role === 'RZ' && esito === ESITO_APPROVATA) {
        const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
        const fNumeroRapportoTecnico = getSchemaFieldNameCI(schemaFields, 'numero_rapporto_tecnico')
        const fDataRapportoTecnico = getSchemaFieldNameCI(schemaFields, 'data_rapporto_tecnico')
        if (!fNumeroRapportoTecnico || !fDataRapportoTecnico) {
          throw new Error('Impossibile approvare la rilevazione: campi numero_rapporto_tecnico/data_rapporto_tecnico non presenti nella fonte dati.')
        }

        const liveAttrs = await queryCurrentRecordAttrs()
        const currentNumeroRapportoTecnico = String(pickAttrCI(liveAttrs || data, ['numero_rapporto_tecnico', fNumeroRapportoTecnico]) || '').trim()
        const currentDataRapportoTecnico = pickAttrCI(liveAttrs || data, ['data_rapporto_tecnico', fDataRapportoTecnico])
        const annoRapportoTecnico = new Date(now).getFullYear()

        if (currentNumeroRapportoTecnico) {
          const parsedProgressivo = parseNumeroAttoProgressivo(currentNumeroRapportoTecnico, 'R', annoRapportoTecnico)
          if (parsedProgressivo == null) {
            throw new Error(`Numero rapporto tecnico già presente ma non conforme al formato R-progressivo/anno: ${currentNumeroRapportoTecnico}`)
          }
        } else {
          upd[fNumeroRapportoTecnico] = await queryNextNumeroAtto('R', annoRapportoTecnico, fNumeroRapportoTecnico)
        }
        if (currentDataRapportoTecnico == null || currentDataRapportoTecnico === '') {
          upd[fDataRapportoTecnico] = now
        }
      }



      if (role === 'RI_AMM' && esito === ESITO_APPROVATA && riAmmAttoContestazioneDaVerificare) {
        const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
        const fDetStato = getSchemaFieldNameCI(schemaFields, 'determinazione_stato')
        if (fDetStato) upd[fDetStato] = 'VALIDATA_RI_AMM'
      }

      if (role === 'RI_AMM' && esito === ESITO_APPROVATA && riAmmBozzaDeterminazioneDaVerificare) {
        const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
        const fDetStato = getSchemaFieldNameCI(schemaFields, 'determinazione_stato')
        const fProtocolloFascicoloNumero = getSchemaFieldNameCI(schemaFields, 'protocollo_fascicolo_numero')
        const fProtocolloFascicoloData = getSchemaFieldNameCI(schemaFields, 'protocollo_fascicolo_data')

        // Ogni approvazione RI_AMM valida una nuova versione del fascicolo.
        // Un protocollo eventualmente registrato in un ciclo precedente non può
        // essere riutilizzato: viene invalidato e i campi resteranno bloccati
        // fino alla nuova trasmissione al protocollo da parte del TI_AMM.
        if (fDetStato) upd[fDetStato] = 'VALIDATA_RI_AMM'
        if (fProtocolloFascicoloNumero) upd[fProtocolloFascicoloNumero] = null
        if (fProtocolloFascicoloData) upd[fProtocolloFascicoloData] = null
      }

      const integRequester = (esito === ESITO_APPROVATA && !isTiAmmAttestazioneConformita) ? getIntegrationRequesterForCurrentRole() : ''
      const ruoloDest = esito === ESITO_APPROVATA
        ? (isTiAmmAttestazioneConformita ? '' : (integRequester || (role === 'RI_AMM' ? 'TI_AMM' : getNextRoleForForward())))
        : ''
      if (ruoloDest) {
        try {
          const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
          const fStato = getSchemaFieldNameCI(schemaFields, `stato_${ruoloDest}`)
          const fDtStato = getSchemaFieldNameCI(schemaFields, `dt_stato_${ruoloDest}`)
          const fPresa = hasDedicatedPresaField(ruoloDest) ? getSchemaFieldNameCI(schemaFields, `presa_in_carico_${ruoloDest}`) : null
          const fDtPresa = getSchemaFieldNameCI(schemaFields, `dt_presa_in_carico_${ruoloDest}`)
          const fEsito = getSchemaFieldNameCI(schemaFields, `esito_${ruoloDest}`)
          const fDtEsito = getSchemaFieldNameCI(schemaFields, `dt_esito_${ruoloDest}`)
          if (fStato) upd[fStato] = STATO_DA_PRENDERE
          if (fDtStato) upd[fDtStato] = now
          if (fPresa) upd[fPresa] = PRESA_DA_PRENDERE
          if (fDtPresa) upd[fDtPresa] = null
          const preserveDestEsito = role === 'RI_AMM' && ruoloDest === 'TI_AMM' && esito === ESITO_APPROVATA
          if (fEsito && !preserveDestEsito) upd[fEsito] = null
          if (fDtEsito && !preserveDestEsito) upd[fDtEsito] = null

          // Se il DT rimanda la pratica a RI_AMM dopo una nuova approvazione tecnica,
          // chiudiamo solo il nodo operativo TI_AMM, ma NON cancelliamo
          // ti_amm_assegnato_*: quei campi identificano il TI_AMM originario a cui RI_AMM
          // dovrà restituire la pratica dopo il rientro tecnico.
          if (role === 'DT' && ruoloDest === 'RI_AMM') {
            const fStatoTiAmm = getSchemaFieldNameCI(schemaFields, 'stato_TI_AMM')
            const fDtStatoTiAmm = getSchemaFieldNameCI(schemaFields, 'dt_stato_TI_AMM')
            const fDtPresaTiAmm = getSchemaFieldNameCI(schemaFields, 'dt_presa_in_carico_TI_AMM')
            const fEsitoTiAmm = getSchemaFieldNameCI(schemaFields, 'esito_TI_AMM')
            const fDtEsitoTiAmm = getSchemaFieldNameCI(schemaFields, 'dt_esito_TI_AMM')
            if (fStatoTiAmm) upd[fStatoTiAmm] = 0
            if (fDtStatoTiAmm) upd[fDtStatoTiAmm] = null
            if (fDtPresaTiAmm) upd[fDtPresaTiAmm] = null
            if (fEsitoTiAmm) upd[fEsitoTiAmm] = null
            if (fDtEsitoTiAmm) upd[fDtEsitoTiAmm] = null
          }
        } catch {}
      }

      if (ruoloDest) {
        addGiiRoutingFields(upd, ruoloDest, 'TRASMISSIONE')
      }

      // A ogni nuova approvazione RI_AMM la Proposta corrente viene rigenerata dallo
      // stesso builder condiviso, usando già l'esito del ciclo che si sta chiudendo.
      // In questo modo il PDF approvato perde la filigrana BOZZA e sostituisce sempre
      // la versione provvisoria del ciclo precedente.
      if (role === 'RI_AMM' && esito === ESITO_APPROVATA && riAmmBozzaDeterminazioneDaVerificare) {
        const { layer } = await resolveLayer(ds)
        if (!layer) throw new Error('Layer non disponibile per aggiornare la Proposta di contestazione approvata.')
        if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
        const layerUrl = String(
          layer?.url ||
          active?.state?.ds?.getDataSourceJson?.()?.url ||
          active?.state?.ds?.dataSourceJson?.url ||
          active?.state?.ds?.layer?.url ||
          active?.key ||
          ''
        ).trim().replace(/\/+$/, '')
        if (!layerUrl) throw new Error('URL del FeatureLayer non disponibile per aggiornare la Proposta di contestazione approvata.')
        const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
        const proposalFields = Array.isArray(layer?.fields) && layer.fields.length
          ? layer.fields.map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
          : Object.keys(schemaFields).map(name => ({ name, type: String(schemaFields[name]?.type || ''), alias: String(schemaFields[name]?.alias || name), domain: schemaFields[name]?.domain || null, editable: schemaFields[name]?.editable !== false }))
        const currentProfile: any = (window as any).__giiUserRole || {}
        let liveProposalAttrs: Record<string, any> | null = null
        try {
          liveProposalAttrs = await queryCurrentRecordAttrs()
        } catch {}
        const propostaBlob = await buildVerbalePdfBlob(
          { ...(liveProposalAttrs || data || {}), ...upd },
          proposalFields as any,
          {
            username: String(currentProfile?.username || ''),
            fullName: String(currentProfile?.fullName || currentProfile?.full_name || currentProfile?.username || '')
          }
        )
        riAmmApprovedProposalSync = {
          layer,
          layerUrl,
          file: new File([propostaBlob.blob], propostaBlob.fileName, { type: 'application/pdf', lastModified: now })
        }
      }

      // La risposta a integrazione è solo quella diretta al ruolo che ha chiesto
      // l'integrazione. Non usare una scansione globale degli esiti=1, perché dopo
      // molti avanti/indietro possono rimanere stati storici non pertinenti.
      const wasIntegResponse = Boolean(integRequester)

      const logOpts = esito === ESITO_APPROVATA
        ? (role === 'DT'
              // DT approva il rapporto tecnico → destinatario è RI
              ? { eventoChiusura: 'RAPPORTO_APPROVATO', ruoloDestinatario: ruoloDest, utenteDestinatario: resolveDestUser(ruoloDest), fase: role }
              : isTiAmmAttestazioneConformita
                ? {
                    eventoChiusura: 'ATTESTAZIONE_CONFORMITA',
                    ruoloDestinatario: '',
                    utenteDestinatario: '',
                    noteChiusura: noteTrim ? `Attestazione di conformità:
${noteTrim}` : 'Attestazione di conformità apposta.',
                    fase: role
                  }
                : {
                    eventoChiusura: ruoloDest
                      ? (riAmmStaApprovandoPropostaContestazione ? 'PROPOSTA_CONTESTAZIONE_APPROVATA' : (wasIntegResponse ? 'INTEGRAZIONE_TRASMESSA' : 'ISTRUTTORIA_TRASMESSA'))
                      : 'ISTRUTTORIA_TRASMESSA',
                    ruoloDestinatario: ruoloDest,
                    utenteDestinatario: resolveDestUser(ruoloDest),
                    noteChiusura: noteTrim,
                    fase: role
                  })
        : null

      if (logOpts) {
        const informativeActivities = esito === ESITO_APPROVATA
          ? (role === 'DT'
              ? buildTechnicalChainInformativeActivities('DT_APPROVA', upd)
              : role === 'RZ'
                ? buildTechnicalChainInformativeActivities('RZ_APPROVA', upd)
                : [])
          : []
        const successText = isTiAmmAttestazioneConformita
          ? 'Attestazione di conformità apposta.'
          : riAmmStaApprovandoPropostaContestazione
            ? 'Istruttoria amministrativa approvata e restituita al Tecnico istruttore amministrativo.'
            : `Esito salvato: ${label}.`
        await saveWithWorkflowLog(upd, successText, { ...logOpts, informativeActivities })
      } else {
        await runApplyEdits(upd, `Esito salvato: ${label}.`)
      }

      if (tiAmmAttestationProposalSync) {
        try {
          await replacePropostaContestazionePdfAttachment(
            tiAmmAttestationProposalSync.layer,
            Number(oid),
            tiAmmAttestationProposalSync.file,
            tiAmmAttestationProposalSync.layerUrl,
            'DRAFT'
          )
          // Un nuovo visto apre una nuova versione: eventuali PDF di determinazione
          // del ciclo precedente non devono rimanere insieme alla nuova Proposta.
          await deleteBozzaDeterminazionePdfAttachments(
            tiAmmAttestationProposalSync.layer,
            Number(oid),
            tiAmmAttestationProposalSync.layerUrl
          )
          // Il visto, da solo, non crea un'attività RI_AMM. Eliminiamo anche eventuali
          // residui lasciati da versioni precedenti del workflow.
          await deleteCurrentActivitiesForDestRole('RI_AMM')
          try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-azioni-ti-amm-attestazione-conformita', ts: Date.now() } })) } catch {}
          try { window.dispatchEvent(new CustomEvent('gii-alerts-refresh', { detail: { oid: Number(oid), source: 'gii-azioni-ti-amm-attestazione-conformita', ts: Date.now() } })) } catch {}
          setMsg({ kind: 'ok', text: 'Attestazione di conformità apposta. La Proposta di contestazione è stata aggiunta al fascicolo; predisporre ora la bozza di determinazione e trasmettere successivamente il fascicolo al Responsabile.' })
        } catch (syncError: any) {
          try {
            console.error('[GII][TI_AMM][ATTESTAZIONE] Aggiornamento fascicolo non riuscito', {
              oid: Number(oid),
              message: syncError?.message || String(syncError),
              error: syncError
            })
          } catch {}
          setPending(null)
          setConfirmAttempted(false)
          setMsg({ kind: 'err', text: `Attestazione registrata, ma aggiornamento della Proposta PDF non riuscito: ${syncError?.message || String(syncError)}` })
          return
        }
      }

      if (riAmmApprovedProposalSync) {
        try {
          await replacePropostaContestazionePdfAttachment(
            riAmmApprovedProposalSync.layer,
            Number(oid),
            riAmmApprovedProposalSync.file,
            riAmmApprovedProposalSync.layerUrl,
            'APPROVED'
          )
          // La versione approvata della bozza è già conservata nel riferimento interno
          // creato al momento della trasmissione a RI_AMM. Dopo l'approvazione il PDF
          // materiale di lavorazione non deve restare nel fascicolo: il TI_AMM caricherà
          // successivamente un solo PDF definitivo, verificato dopo la protocollazione.
          await deleteBozzaDeterminazionePdfAttachments(
            riAmmApprovedProposalSync.layer,
            Number(oid),
            riAmmApprovedProposalSync.layerUrl
          )
          try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-azioni-ri-amm-proposta-approvata', ts: Date.now() } })) } catch {}
        } catch (syncError: any) {
          try {
            console.error('[GII][RI_AMM][PROPOSTA_APPROVATA] Aggiornamento PDF non riuscito', {
              oid: Number(oid),
              message: syncError?.message || String(syncError),
              error: syncError
            })
          } catch {}
          setPending(null)
          setConfirmAttempted(false)
          setMsg({ kind: 'err', text: `Istruttoria amministrativa approvata, ma aggiornamento della Proposta PDF non riuscito: ${syncError?.message || String(syncError)}` })
          return
        }
      }
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      setLoading(false)
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmRespinta = async () => {
    setConfirmAttempted(true)
    if (!reasonTrim) return
    if (noteIsRequired && !noteDraftTrim) return
    setLoading(true)
    setMsg(null)

    try {
      const stato = mapEsitoToStato(ESITO_RESPINTA)
      const finalNote = isAltro
        ? `Motivazione: ${reasonTrim}\n\n${noteTrim}`
        : `Motivazione: ${reasonTrim}` + (noteTrim ? `\n\n${noteTrim}` : '')

      const upd: Record<string, any> = {
        [esitoField]: ESITO_RESPINTA,
        [dtEsitoField]: Date.now()
      }

      if (stato != null) {
        upd[statoField] = stato
        upd[dtStatoField] = Date.now()
      }

      const informativeActivities = role === 'DT'
        ? buildTechnicalChainInformativeActivities('DT_RESPINGE', upd)
        : role === 'RZ'
          ? buildTechnicalChainInformativeActivities('RZ_RESPINGE', upd)
          : []
      await saveWithWorkflowLog(upd, 'Esito salvato: Respinta.', { eventoChiusura: 'RESPINTA', noteChiusura: finalNote, fase: role, informativeActivities })
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      setLoading(false)
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }

  const onConfirmElimina = async () => {
    setConfirmAttempted(true)
    if (!noteTrim) return  // nota obbligatoria (Matrice_TI caso 1/b)
    setLoading(true)
    setMsg(null)

    try {
      // Archiviazione logica: GII_arch = 1, nota nel campo note_TI.
      // Non si esegue delete fisico (le viste non lo supportano).
      // Il record viene escluso dagli elenchi ordinari tramite filtro su GII_arch.
      const upd: Record<string, any> = {
        GII_arch: 1,
        [noteField]: noteTrim
      }
      // Campi opzionali di tracciabilità (scritti solo se presenti nello schema)
      const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
      const fDt  = getSchemaFieldNameCI(schemaFields, 'dt_archiviazione_TI')
      const fDa  = getSchemaFieldNameCI(schemaFields, 'archiviato_da')
      if (fDt) upd[fDt] = Date.now()
      if (fDa) upd[fDa] = String((window as any).__giiUserRole?.username || '').trim() || undefined

      await saveWithWorkflowLog(upd, 'Pratica archiviata.', { eventoChiusura: 'ARCHIVIAZIONE', noteChiusura: noteTrim, fase: role })
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      setLoading(false)
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore archiviazione: ${txt}` })
    }
  }

  const labelReqStyle = (isRequired: boolean, isError: boolean): React.CSSProperties => {
    if (!isRequired) return { display: 'none' }
    return { fontSize: Math.max(14, Number(ui.statusFontSize) || 14), color: isError ? '#b42318' : '#6b7280' }
  }


  const confirmBtnStyle: React.CSSProperties = {
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid #15803d',
    background: '#16a34a',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    cursor: loading ? 'not-allowed' : 'pointer'
  }

  const cancelBtnStyle: React.CSSProperties = {
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid #b42318',
    background: '#dc2626',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    cursor: loading ? 'not-allowed' : 'pointer'
  }

  // ── Colore/icona/testo per ogni tipo di azione ────────────────────────────
  type PendingTheme = { icon: string; color: string; bg: string; border: string; desc: string; buttonBg: string; buttonBorder: string }

  const subjectArticle = praticaLabel === 'Rapporto tecnico' ? 'Il' : 'La'
  const subjectNameLower = praticaLabel === 'Rapporto tecnico' ? 'rapporto tecnico' : 'rilevazione'
  const subjectNameWithArticle = praticaLabel === 'Rapporto tecnico' ? 'del rapporto tecnico' : 'della rilevazione'
  const subjectVerbTrasmessa = praticaLabel === 'Rapporto tecnico' ? 'trasmesso' : 'trasmessa'
  const subjectVerbAssegnata = praticaLabel === 'Rapporto tecnico' ? 'assegnato' : 'assegnata'
  const subjectVerbRimandata = praticaLabel === 'Rapporto tecnico' ? 'rimandato' : 'rimandata'
  const subjectVerbRespinta = praticaLabel === 'Rapporto tecnico' ? 'respinto' : 'respinta'
  const subjectVerbArchiviata = praticaLabel === 'Rapporto tecnico' ? 'archiviato' : 'archiviata'

  const approvaPendingTitle = currentIntegrationRequesterLabel
    ? `Trasmissione al ${currentIntegrationRequesterLabel}`
    : role === 'TI' ? `Trasmissione ${subjectNameLower} al ${getRoleLabelForMenu('RZ')}` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? 'Validazione integrazione' : 'Approvazione rilevazione') :
    role === 'RI' ? 'Approvazione istruttoria tecnica' :
    role === 'DT' ? 'Approvazione rapporto tecnico' :
    role === 'RI_AMM' && riAmmAttoContestazioneDaVerificare ? 'Approvazione Atto di contestazione' :
    role === 'RI_AMM' && riAmmBozzaDeterminazioneDaVerificare ? 'Approvazione istruttoria amministrativa' :
    role === 'RI_AMM' ? 'Approvazione istruttoria amministrativa' :
    role === 'TI_AMM' ? `Trasmissione al ${getRoleLabelForMenu('RI_AMM')}` :
    'Avanzamento pratica'

  const pendingTitle = pending === 'TAKE'
    ? ((riAmmBozzaDeterminazioneDaVerificare || riAmmAttoContestazioneDaVerificare) ? 'Presa in carico pratica' : 'Presa in carico')
    : pending === 'ASSEGNA_TI'
      ? `Assegnazione al ${getRoleLabelForMenu('TI')}`
      : pending === 'ASSEGNA_TI_AMM'
        ? `Assegnazione al ${getRoleLabelForMenu('TI_AMM')}`
        : pending === 'RESTITUISCI_TI_AMM'
          ? `Restituzione al ${getRoleLabelForMenu('TI_AMM')}`
          : (pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA')
          ? (pendingRimandoTargetLabel ? `Rimando al ${pendingRimandoTargetLabel}` : 'Rimando')
          : pending === 'APPROVA'
            ? approvaPendingTitle
            : pending === 'RESPINGI'
              ? `Respinta ${subjectNameWithArticle}`
              : pending === 'ELIMINA'
                ? `Archiviazione ${subjectNameWithArticle}`
                : 'Conferma azione'

  const approvaActionDesc = currentIntegrationRequesterLabel
    ? `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbTrasmessa} al ${currentIntegrationRequesterLabel}.`
    : role === 'TI' ? `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbTrasmessa} al ${getRoleLabelForMenu('RZ')}.` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? `L’integrazione verrà validata e il rapporto tecnico verrà trasmesso al ${getRoleLabelForMenu('RI')}.` : `La rilevazione verrà approvata e trasmessa al ${getRoleLabelForMenu('RI')}.`) :
    role === 'RI' ? `L’istruttoria tecnica verrà approvata e trasmessa al ${getRoleLabelForForward('DT')}.` :
    role === 'DT' ? `Il Rapporto tecnico di rilevazione verrà approvato e trasmesso al ${getRoleLabelForMenu('RI_AMM')}.` :
    role === 'RI_AMM' && riAmmAttoContestazioneDaVerificare ? 'L’Atto di contestazione verrà approvato e la pratica tornerà al Tecnico Istruttore amministrativo per la trasmissione al Direttore.' :
    role === 'RI_AMM' && riAmmBozzaDeterminazioneDaVerificare ? 'L’istruttoria amministrativa verrà approvata e la pratica tornerà al Tecnico Istruttore amministrativo per i passaggi successivi.' :
    role === 'RI_AMM' && riAmmStaApprovandoPropostaContestazione ? 'L’istruttoria amministrativa verrà approvata e la pratica tornerà al Tecnico istruttore amministrativo per protocollazione e predisposizione della bozza di determinazione.' :
    role === 'RI_AMM' ? 'L’istruttoria amministrativa verrà approvata e la pratica verrà restituita al Tecnico Istruttore amministrativo per i passaggi successivi.' :
    role === 'TI_AMM' ? 'Il visto di conformità verrà apposto. La pratica resterà al Tecnico Istruttore amministrativo per predisporre la bozza di determinazione e trasmettere successivamente il fascicolo al Responsabile.' :
    `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbTrasmessa} al passaggio successivo.`

  const integrazioneActionDesc = pendingRimandoTargetLabel
    ? (praticaLabel === 'Rapporto tecnico'
        ? `Il rapporto verrà rimandato al ${pendingRimandoTargetLabel}.`
        : `La rilevazione verrà rimandata al ${pendingRimandoTargetLabel}.`)
    : (praticaLabel === 'Rapporto tecnico'
        ? 'Il rapporto verrà rimandato per integrazione.'
        : 'La rilevazione verrà rimandata per integrazione.')

  const pendingTheme: Record<string, PendingTheme> = {
    TAKE:           { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: riAmmAttoContestazioneDaVerificare ? 'La pratica contenente la bozza dell’Atto di contestazione verrà presa in carico per la verifica.' : (riAmmBozzaDeterminazioneDaVerificare ? 'La pratica contenente la bozza di determinazione verrà presa in carico per la verifica.' : ((role === 'RI_AMM' || role === 'TI_AMM') ? 'La pratica verrà presa in carico.' : (praticaLabel === 'Rapporto tecnico' ? 'Il rapporto tecnico verrà preso in carico.' : 'La rilevazione verrà presa in carico.'))) },
    ASSEGNA_TI:     { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbAssegnata} al ${getRoleLabelForMenu('TI')} selezionato.` },
    ASSEGNA_TI_AMM: { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: riaperturaWorkflowDaAvviare
      ? `Verrà aperto il nuovo ciclo di riapertura n. ${riaperturaAmmNumero} e la pratica sarà assegnata al ${getRoleLabelForMenu('TI_AMM')} selezionato.`
      : `La pratica verrà assegnata al ${getRoleLabelForMenu('TI_AMM')} selezionato.` },
    INVIA_TI_AMM: { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: 'La pratica verrà trasmessa al Tecnico Istruttore amministrativo.' },
    RESTITUISCI_TI_AMM: { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: `La pratica verrà restituita al ${getRoleLabelForMenu('TI_AMM')} già assegnato.` },
    APPROVA:        { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: approvaActionDesc },
    INTEGRAZIONE:   { icon: '↩', color: '#b45309', bg: '#fffbeb', border: '#fde68a', buttonBg: '#d97706', buttonBorder: '#b45309', desc: integrazioneActionDesc },
    INTEGRAZIONE_TI_AMM: { icon: '↩', color: '#b45309', bg: '#fffbeb', border: '#fde68a', buttonBg: '#d97706', buttonBorder: '#b45309', desc: `La pratica verrà rimandata al ${getRoleLabelForMenu('TI_AMM')} assegnato.` },
    INTEGRAZIONE_TECNICA: { icon: '↩', color: '#b45309', bg: '#fffbeb', border: '#fde68a', buttonBg: '#d97706', buttonBorder: '#b45309', desc: `La pratica verrà rimandata al ${rimandoTecnicaTargetLabel}.` },
    RESPINGI:       { icon: '✕', color: '#b42318', bg: '#fef2f2', border: '#fecaca', buttonBg: '#dc2626', buttonBorder: '#b42318', desc: `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbRespinta}.` },
    ELIMINA:        { icon: '✕', color: '#b42318', bg: '#fef2f2', border: '#fecaca', buttonBg: '#dc2626', buttonBorder: '#b42318', desc: `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbArchiviata} e non sarà più visibile nell'elenco.` },
  }
  const theme = pending ? (pendingTheme[pending] ?? { icon: '●', color: '#2f6fed', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: '' }) : pendingTheme.TAKE
  const pendingModalWidth = pending === 'TAKE' ? 'min(92vw, 520px)' : 'min(94vw, 780px)'
  const operationProgressBox = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', marginTop: 4, color: '#374151', fontSize: 15, fontWeight: 700 }}>
      <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #cbd5e1', borderTopColor: theme.color, display: 'inline-block', animation: 'gii-spin 0.8s linear infinite' }} />
      <span>Operazione in corso…</span>
    </div>
  )

  const isWorkflowEsitoPendingKey = (key: any): boolean =>
    key === 'APPROVA' || key === 'INVIA_TI_AMM' || key === 'INTEGRAZIONE' || key === 'INTEGRAZIONE_TI_AMM' || key === 'INTEGRAZIONE_TECNICA' || key === 'RESPINGI'

  const workflowConformeItem = workflowMenuEnabledItems.find(item => item.key === 'APPROVA' || item.key === 'INVIA_TI_AMM') || null
  const workflowIntegrationItems = workflowMenuEnabledItems.filter(item => item.key === 'INTEGRAZIONE' || item.key === 'INTEGRAZIONE_TI_AMM' || item.key === 'INTEGRAZIONE_TECNICA')
  const workflowRespintaItem = workflowMenuEnabledItems.find(item => item.key === 'RESPINGI') || null
  const workflowDirectActionItems = workflowMenuEnabledItems.filter(item => !isWorkflowEsitoPendingKey(item.key))
  const showEsitoDrivenWorkflow = Boolean(workflowConformeItem || workflowIntegrationItems.length > 0 || workflowRespintaItem)
  const useUnifiedWorkflowActionSelect = role === 'RZ' || role === 'RI_AMM' || role === 'TI_AMM'
  const unifiedWorkflowActionItems = useUnifiedWorkflowActionSelect ? workflowMenuEnabledItems : []

  function buildDefaultWorkflowNote (nextPending: Pending): string {
    if (role === 'DT') {
      if (nextPending === 'APPROVA' || nextPending === 'INVIA_TI_AMM') {
        return `A seguito della valutazione di competenza, si approva l’istruttoria tecnica e se ne dispone la trasmissione all’Area Amministrativa.`
      }
      if (nextPending === 'INTEGRAZIONE' || nextPending === 'INTEGRAZIONE_TI_AMM' || nextPending === 'INTEGRAZIONE_TECNICA') {
        return `A seguito della valutazione di competenza, non si approva l’istruttoria tecnica e si dispone il rinvio per le necessarie integrazioni o rettifiche.`
      }
      if (nextPending === 'RESPINGI') {
        return `A seguito della valutazione di competenza, non si ravvisano i presupposti per l’approvazione dell’istruttoria tecnica e si dispone il respingimento della pratica.`
      }
    }

    if (role === 'RZ') {
      if (nextPending === 'APPROVA' || nextPending === 'INVIA_TI_AMM') {
        return `A seguito della verifica svolta, si attesta la conformità della pratica sotto il profilo tecnico-istruttorio e se ne dispone la trasmissione al Responsabile istruttoria.`
      }
      if (nextPending === 'INTEGRAZIONE' || nextPending === 'INTEGRAZIONE_TI_AMM' || nextPending === 'INTEGRAZIONE_TECNICA') {
        return `A seguito della verifica svolta, si rileva la necessità di integrazioni o rettifiche tecnico-istruttorie e si dispone il rinvio al Tecnico istruttore competente.`
      }
      if (nextPending === 'RESPINGI') {
        return `A seguito della verifica svolta, non si ravvisano i presupposti per la prosecuzione dell’istruttoria tecnica e si dispone il respingimento della pratica.`
      }
    }

    if (role === 'RI_AMM') {
      if (nextPending === 'APPROVA' || nextPending === 'INVIA_TI_AMM') {
        if (riAmmBozzaDeterminazioneDaVerificare) {
          return `A seguito della verifica svolta, si approva l’istruttoria amministrativa e si dispone la restituzione della pratica al Tecnico Istruttore amministrativo per la protocollazione e la trasmissione al Direttore.`
        }
        return `A seguito della verifica svolta, si approva l’istruttoria amministrativa e si dispone la restituzione della pratica al Tecnico istruttore amministrativo per la protocollazione e il completamento della bozza di determinazione.`
      }
      if (nextPending === 'INTEGRAZIONE_TI_AMM') {
        return `A seguito della verifica svolta, si rileva la necessità di integrazioni o rettifiche dell’istruttoria amministrativa e si dispone il rinvio al Tecnico Istruttore amministrativo.`
      }
      if (nextPending === 'INTEGRAZIONE_TECNICA') {
        return `A seguito della verifica svolta, si rileva la necessità di chiarimenti o integrazioni sugli elementi tecnici posti a base dell’istruttoria amministrativa e si dispone il rinvio al Responsabile istruttoria dell’area di provenienza.`
      }
      if (nextPending === 'INTEGRAZIONE') {
        return `A seguito della verifica svolta, si rileva la necessità di integrazioni o rettifiche sotto il profilo istruttorio-amministrativo.`
      }
    }

    const isAmmWorkflowRole = role === 'TI_AMM'
    const profiloVerifica = isAmmWorkflowRole ? 'istruttorio-amministrativo' : 'tecnico-istruttorio'

    if (nextPending === 'APPROVA' || nextPending === 'INVIA_TI_AMM') {
      return `A seguito della verifica svolta, si attesta la conformità della pratica sotto il profilo ${profiloVerifica}.`
    }
    if (nextPending === 'INTEGRAZIONE' || nextPending === 'INTEGRAZIONE_TI_AMM' || nextPending === 'INTEGRAZIONE_TECNICA') {
      return `A seguito della verifica svolta, si segnala la necessità di integrazioni o rettifiche sotto il profilo ${profiloVerifica}.`
    }
    if (nextPending === 'RESPINGI') {
      return `A seguito della verifica svolta, si rilevano elementi di non conformità sotto il profilo ${profiloVerifica} tali da non consentire la prosecuzione della pratica.`
    }
    return ''
  }

  const startDerivedWorkflowAction = (nextPending: Exclude<Pending, null | 'TAKE'>, opts?: { defaultNote?: boolean }) => {
    startAction(nextPending, { keepActionsMenuOpen: true })
    if (opts?.defaultNote !== false) {
      setNoteDraft('')
      window.setTimeout(() => {
        try { noteRef.current?.focus?.() } catch {}
        autoResizeNote(noteRef.current)
      }, 0)
    }
  }

  const applyWorkflowEsitoChoice = (choice: WorkflowEsitoChoice) => {
    setWorkflowEsitoChoice(choice)
    setWorkflowRimandoChoice('')
    setConfirmAttempted(false)
    resetStructuredReasons()

    if (!choice) {
      setPending(null)
      setMsg(null)
      setNoteDraft(noteOrigRef.current)
      return
    }

    if (choice === 'CONFORME') {
      if (workflowConformeItem) startDerivedWorkflowAction(workflowConformeItem.key)
      return
    }

    if (choice === 'DA_INTEGRARE') {
      if (workflowIntegrationItems.length === 1) {
        startDerivedWorkflowAction(workflowIntegrationItems[0].key)
      } else {
        setPending(null)
        setMsg(null)
        setNoteDraft(noteOrigRef.current)
      }
      return
    }

    if (choice === 'RESPINTA') {
      if (workflowRespintaItem) startDerivedWorkflowAction('RESPINGI')
    }
  }

  const applyWorkflowRimandoChoice = (key: string) => {
    setWorkflowRimandoChoice(key)
    setConfirmAttempted(false)
    if (!key) {
      setPending(null)
      setNoteDraft(noteOrigRef.current)
      return
    }
    const item = workflowIntegrationItems.find(i => i.key === key)
    if (item) startDerivedWorkflowAction(item.key)
  }

  const selectedWorkflowMenuItem = pending ? (workflowMenuEnabledItems.find(item => item.key === pending) || null) : null
  const actionMenuTheme = pending ? theme : pendingTheme.TAKE
  const hideWorkflowOperationalDesc = role === 'DT' && pending === 'INTEGRAZIONE' && (
    !integrationReasonTrim ||
    (isIntegrationNeedsDetail && integrationTargets.length === 0)
  )
  const workflowOperationalDesc = hideWorkflowOperationalDesc ? '' : actionMenuTheme.desc
  const selectedWorkflowMenuKey = selectedWorkflowMenuItem?.key || ''
  const isWorkflowRimandoPending = pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA'
  const isAttestazioneConformitaPending = pending === 'APPROVA' || pending === 'INVIA_TI_AMM'
  const workflowNoteLabel = isAdministrativeRiAmmReturn
    ? 'Esito della verifica'
    : (isAttestazioneConformitaPending ? 'Attestazione di conformità' : (isWorkflowRimandoPending ? 'Integrazioni/rettifiche proposte' : 'Note'))
  const hasFixedWorkflowNote = Boolean(fixedWorkflowNoteTrim)
  const workflowFreeNoteLabel = isAdministrativeRiAmmReturn
    ? 'Motivazione del rimando'
    : (hasFixedWorkflowNote
        ? (hasOtherMotivation ? 'Altre motivazioni e ulteriori annotazioni' : 'Ulteriori annotazioni')
        : workflowNoteLabel)
  const workflowNoteTextAreaRequired = noteIsRequired
  const workflowNotePlaceholder = isAdministrativeRiAmmReturn
    ? 'Indicare le modifiche, integrazioni o rettifiche richieste…'
    : (hasFixedWorkflowNote
        ? (hasOtherMotivation ? 'Inserire altre motivazioni ed eventuali ulteriori annotazioni…' : 'Inserire eventuali ulteriori annotazioni…')
        : isAttestazioneConformitaPending
          ? 'Attestare la conformità della pratica agli elementi verificati…'
          : isWorkflowRimandoPending
            ? (hasOtherMotivation ? 'Inserire altre motivazioni ed eventuali ulteriori annotazioni…' : 'Inserire eventuali ulteriori annotazioni…')
            : (noteIsRequired ? 'Specifica il motivo…' : 'Nota facoltativa…'))

  const integrationMotivationControls = isWorkflowRimandoPending ? (
    isAdministrativeRiAmmReturn ? (
      <div style={{ display: 'grid', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>Oggetto del rimando</div>
          <div style={labelReqStyle(true, integrationTargetsReqErr)}>(obbligatorio)</div>
        </div>
        <div style={{ border: `1px solid ${integrationTargetsReqErr ? '#fecaca' : '#e5e7eb'}`, borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', columnGap: 10, rowGap: 2 }}>
            {administrativeReturnTargetOptions.map(opt => renderIntegrationTargetCheckbox(opt))}
          </div>
        </div>
      </div>
    ) : (
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>Motivazione del rimando</div>
            <div style={labelReqStyle(true, integrationReasonReqErr)}>(obbligatoria)</div>
          </div>
          <select
            value={integrationReason}
            onChange={(e) => {
              const v = String(e.target.value || '')
              setIntegrationReason(v)
              setIntegrationTargets([])
              setIntegrationOtherText('')
              if (confirmAttempted) setConfirmAttempted(false)
            }}
            disabled={loading || !hasSel || lockedByTransmit}
            style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: `1px solid ${integrationReasonReqErr ? '#dc2626' : 'rgba(0,0,0,0.18)'}`, outline: 'none', fontSize: Math.max(15, Number(ui.statusFontSize) || 15), background: '#fff' }}
          >
            <option value=''>— Seleziona —</option>
            {integrationReasonOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        {isIntegrationNeedsDetail && (
          <div style={{ display: 'grid', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>Dati da integrare o rettificare</div>
              <div style={labelReqStyle(true, integrationTargetsReqErr)}>(obbligatoria)</div>
            </div>
            {role === 'DT' ? (
              <div style={{ border: `1px solid ${integrationTargetsReqErr ? '#fecaca' : '#e5e7eb'}`, borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 10, rowGap: 2 }}>
                  {integrationTargetOptions.map(opt => renderIntegrationTargetCheckbox(opt))}
                </div>
              </div>
            ) : (
              <div style={{ border: `1px solid ${integrationTargetsReqErr ? '#fecaca' : '#e5e7eb'}`, borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', columnGap: 10, rowGap: 2 }}>
                  {integrationTargetOptions.map(opt => renderIntegrationTargetCheckbox(opt))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  ) : null

  const rejectReasonControls = pending === 'RESPINGI' ? (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>Motivazione del respingimento</div>
        <div style={labelReqStyle(true, reasonReqErr)}>(obbligatoria)</div>
      </div>
      <ZebraDropdown
        value={rejectReason}
        options={technicalRejectReasonOptions}
        placeholder='— seleziona —'
        disabled={loading || !hasSel || lockedByTransmit}
        onChange={(v) => { setRejectReason(String(v ?? '')); if (confirmAttempted) setConfirmAttempted(false) }}
        evenBg='#ffffff'
        oddBg='#ffffff'
        borderColor={ui.reasonsRowBorderColor}
        borderWidth={ui.reasonsRowBorderWidth}
        radius={ui.reasonsRowRadius}
        fontSize={Math.max(15, Number(ui.statusFontSize) || 15)}
        isError={reasonReqErr}
      />
    </div>
  ) : null

  const closeWorkflowMenu = () => {
    if (loading) return
    setActionsMenuOpen(false)
    setWorkflowSubmitting(false)
    setPending(null)
    setLoading(false)
    setMsg(null)
    setConfirmAttempted(false)
    setWorkflowEsitoChoice('')
    setWorkflowRimandoChoice('')
    setNoteDraft(noteOrigRef.current)
    resetStructuredReasons()
    setTiSelected('')
    setTiAmmSelected('')
    setTiLoadErr('')
    setTiAmmLoadErr('')
    setZeroNotaSpeseWarning([])
    setIncompleteNotaSpeseWarning([])
  }

  const openWorkflowMenu = () => {
    setActionsMenuOpen(true)
    setWorkflowSubmitting(false)
    setPending(null)
    setMsg(null)
    setConfirmAttempted(false)
    setWorkflowEsitoChoice('')
    setWorkflowRimandoChoice('')
    setNoteDraft(noteOrigRef.current)
    resetStructuredReasons()
    setTiSelected('')
    setTiAmmSelected('')
    setTiLoadErr('')
    setTiAmmLoadErr('')
    setZeroNotaSpeseWarning([])
    setIncompleteNotaSpeseWarning([])
  }

  const canConfirmWorkflowAction = (() => {
    if (!pending || loading || !selectedWorkflowMenuItem) return false
    if (pending === 'ASSEGNA_TI') return !!tiSelected
    if (pending === 'ASSEGNA_TI_AMM') return !!tiAmmSelected
    if (pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA') return !integrationReasonInvalid && !integrationTargetsInvalid && !noteInvalid && (!hasOtherMotivation || !!noteDraftTrim)
    if (pending === 'APPROVA' || pending === 'INVIA_TI_AMM') return !!noteTrim
    if (pending === 'RESPINGI') return !!reasonTrim && (!isAltro || !!noteDraftTrim)
    if (pending === 'ELIMINA') return !!noteTrim
    return true
  })()

  const confirmApprovaWithNotaSpeseWarning = async () => {
    setLoading(true)
    setMsg(null)

    if (role === 'TI' || role === 'RZ' || role === 'RI') {
      try {
        const warnings = await findNotaSpeseWarnings()
        if (warnings.blocking.length > 0) {
          setLoading(false)
          setIncompleteNotaSpeseWarning(warnings.blocking)
          return
        }
        if (warnings.confirmable.length > 0) {
          setLoading(false)
          setZeroNotaSpeseWarning(warnings.confirmable)
          return
        }
      } catch (e: any) {
        setLoading(false)
        setMsg({ kind: 'err', text: `Errore verifica note spese: ${e?.message || String(e)}` })
        return
      }
    }
    await onConfirmEsito(ESITO_APPROVATA, approvaDoneLabel)
  }

  const confirmWorkflowAction = async () => {
    setConfirmAttempted(true)
    if (!canConfirmWorkflowAction || !pending) return

    setWorkflowSubmitting(true)
    setLoading(true)
    setMsg(null)

    try {
      if (pending === 'ASSEGNA_TI') await onConfirmAssegnaTi()
      else if (pending === 'ASSEGNA_TI_AMM') await onConfirmAssegnaTiAmm()
      else if (pending === 'INVIA_TI_AMM' || pending === 'RESTITUISCI_TI_AMM') await onConfirmRestituisciTiAmm()
      else if (pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA') await onConfirmIntegrazione()
      else if (pending === 'APPROVA') await confirmApprovaWithNotaSpeseWarning()
      else if (pending === 'RESPINGI') await onConfirmRespinta()
      else if (pending === 'ELIMINA') await onConfirmElimina()
    } finally {
      setActionsMenuOpen(false)
      setWorkflowSubmitting(false)
    }
  }

  const actionMenuModal = actionsMenuOpen ? createPortal(
    <div
      data-gii-global-popup-root='1'
      style={{ position: 'fixed', inset: 0, zIndex: 2147483645, background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <div
        role='dialog'
        aria-modal='true'
        data-gii-global-popup-dialog='1'
        style={{ width: 'min(92vw, 560px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, display: 'grid', gap: 14, position: 'relative', zIndex: 2147483646 }}
        onClick={(e) => { e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, background: actionMenuTheme.bg, border: `1px solid ${actionMenuTheme.border}`, borderRadius: 10, padding: '10px 12px' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: actionMenuTheme.color, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: 20, flex: '0 0 auto' }}>{pending ? actionMenuTheme.icon : '✓'}</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: '1 1 auto' }}>Gestisci istruttoria</span>
            </div>
            {hasSel && oid != null && (
              <div style={{ marginTop: 5, fontSize: 15, color: '#4b5563' }}>
                {praticaLabel}: <span style={{ fontWeight: 700, fontFamily: 'monospace', color: actionMenuTheme.color }}>{praticaCode}</span>
              </div>
            )}
          </div>
          <button
            type='button'
            onClick={closeWorkflowMenu}
            disabled={loading || workflowSubmitting}
            style={{ border: `1px solid ${actionMenuTheme.border}`, background: '#fff', color: (loading || workflowSubmitting) ? '#9ca3af' : '#374151', borderRadius: 8, padding: '6px 10px', fontWeight: 700, cursor: (loading || workflowSubmitting) ? 'not-allowed' : 'pointer', opacity: (loading || workflowSubmitting) ? 0.65 : 1 }}
            aria-label='Chiudi'
          >
            ×
          </button>
        </div>

        {(loading || workflowSubmitting) ? (
          <React.Fragment>
            {pending && actionMenuTheme.desc && (
              <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.6 }}>
                {actionMenuTheme.desc}
              </div>
            )}
            {operationProgressBox}
          </React.Fragment>
        ) : workflowMenuEnabledItems.length > 0 ? (
          <React.Fragment>
            {useUnifiedWorkflowActionSelect ? (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>Azione</div>
                <select
                  value={selectedWorkflowMenuKey}
                  onChange={(e) => {
                    const raw = String(e.target.value || '')
                    setWorkflowEsitoChoice('')
                    setWorkflowRimandoChoice('')
                    if (!raw) {
                      setPending(null)
                      setMsg(null)
                      setConfirmAttempted(false)
                      setNoteDraft(noteOrigRef.current)
                      resetStructuredReasons()
                      setTiSelected('')
                      setTiAmmSelected('')
                      setTiLoadErr('')
                      setTiAmmLoadErr('')
                      return
                    }
                    const key = raw as Exclude<Pending, null | 'TAKE'>
                    const item = unifiedWorkflowActionItems.find(i => i.key === key)
                    if (!item) return
                    if (isWorkflowEsitoPendingKey(item.key)) {
                      startDerivedWorkflowAction(item.key)
                    } else {
                      startAction(item.key, { keepActionsMenuOpen: true })
                    }
                  }}
                  disabled={loading}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', outline: 'none', fontSize: 15, background: '#fff' }}
                >
                  <option value=''>— Seleziona —</option>
                  {unifiedWorkflowActionItems.map(item => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </div>
            ) : workflowDirectActionItems.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>
                  {showEsitoDrivenWorkflow ? 'Azione preliminare' : 'Azione'}
                </div>
                <select
                  value={!isWorkflowEsitoPendingKey(selectedWorkflowMenuKey) ? selectedWorkflowMenuKey : ''}
                  onChange={(e) => {
                    const raw = String(e.target.value || '')
                    setWorkflowEsitoChoice('')
                    setWorkflowRimandoChoice('')
                    if (!raw) {
                      setPending(null)
                      setMsg(null)
                      setConfirmAttempted(false)
                      setNoteDraft(noteOrigRef.current)
                      resetStructuredReasons()
                      setTiSelected('')
                      setTiAmmSelected('')
                      setTiLoadErr('')
                      setTiAmmLoadErr('')
                      return
                    }
                    const key = raw as Exclude<Pending, null | 'TAKE'>
                    const item = workflowDirectActionItems.find(i => i.key === key)
                    if (item) startAction(item.key, { keepActionsMenuOpen: true })
                  }}
                  disabled={loading}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', outline: 'none', fontSize: 15, background: '#fff' }}
                >
                  <option value=''>— Seleziona —</option>
                  {workflowDirectActionItems.map(item => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </div>
            )}

            {!useUnifiedWorkflowActionSelect && showEsitoDrivenWorkflow && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>Esito verifica</div>
                <select
                  value={workflowEsitoChoice}
                  onChange={(e) => applyWorkflowEsitoChoice(String(e.target.value || '') as WorkflowEsitoChoice)}
                  disabled={loading}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', outline: 'none', fontSize: 15, background: '#fff' }}
                >
                  <option value=''>— Seleziona —</option>
                  {workflowConformeItem && <option value='CONFORME'>Conforme</option>}
                  {workflowIntegrationItems.length > 0 && <option value='DA_INTEGRARE'>Da integrare/rettificare</option>}
                  {workflowRespintaItem && <option value='RESPINTA'>Non conforme / respinta</option>}
                </select>
              </div>
            )}

            {!useUnifiedWorkflowActionSelect && showEsitoDrivenWorkflow && workflowEsitoChoice === 'DA_INTEGRARE' && workflowIntegrationItems.length > 1 && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>Destinazione del rimando</div>
                <select
                  value={workflowRimandoChoice}
                  onChange={(e) => applyWorkflowRimandoChoice(String(e.target.value || ''))}
                  disabled={loading}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', outline: 'none', fontSize: 15, background: '#fff' }}
                >
                  <option value=''>— Seleziona —</option>
                  {workflowIntegrationItems.map(item => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </div>
            )}

            {msg && msg.kind === 'err' && (
              <div style={{ fontWeight: 500, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#7f1d1d', fontSize: 15 }}>
                {msg.text}
              </div>
            )}

            {pending === 'ASSEGNA_TI' && role === 'RZ' && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>Tecnico istruttore</div>
                  <div style={labelReqStyle(true, tiReqErr)}>Scelta obbligatoria</div>
                </div>
                <select
                  value={tiSelected}
                  onChange={(e) => { setTiSelected(e.target.value); if (confirmAttempted) setConfirmAttempted(false) }}
                  disabled={loading}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${tiReqErr ? '#dc2626' : 'rgba(0,0,0,0.15)'}`, outline: 'none', fontSize: 15 }}
                >
                  <option value=''>— Seleziona Tecnico Istruttore —</option>
                  {tiOptions.map(o => (
                    <option key={o.username} value={o.username}>{(o.fullName || o.username)} ({o.username})</option>
                  ))}
                </select>
                {!tiLoading && !tiLoadErr && tiOptions.length === 0 && <div style={{ fontSize: 14, opacity: 0.75 }}>Nessun Tecnico Istruttore trovato.</div>}
                {!!tiLoadErr && <div style={{ fontSize: 14, color: '#dc2626' }}>Errore elenco Tecnici Istruttori: {tiLoadErr}</div>}
              </div>
            )}

            {pending === 'ASSEGNA_TI_AMM' && role === 'RI_AMM' && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>Tecnico Istruttore amministrativo</div>
                  <div style={labelReqStyle(true, tiAmmReqErr)}>Scelta obbligatoria</div>
                </div>
                <select
                  value={tiAmmSelected}
                  onChange={(e) => { setTiAmmSelected(e.target.value); if (confirmAttempted) setConfirmAttempted(false) }}
                  disabled={loading}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${tiAmmReqErr ? '#dc2626' : 'rgba(0,0,0,0.15)'}`, outline: 'none', fontSize: 15 }}
                >
                  <option value=''>— Seleziona Tecnico Istruttore amministrativo —</option>
                  {tiAmmOptions.map(o => (
                    <option key={o.username} value={o.username}>{(o.fullName || o.username)} ({o.username})</option>
                  ))}
                </select>
                {!tiAmmLoading && !tiAmmLoadErr && tiAmmOptions.length === 0 && <div style={{ fontSize: 14, opacity: 0.75 }}>Nessun Tecnico Istruttore amministrativo trovato.</div>}
                {!!tiAmmLoadErr && <div style={{ fontSize: 14, color: '#dc2626' }}>Errore elenco Tecnici Istruttori amministrativi: {tiAmmLoadErr}</div>}
              </div>
            )}

            {showNote && (
              <div style={{ display: 'grid', gap: 8 }}>
                {hasFixedWorkflowNote && (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>{workflowNoteLabel}</div>
                    <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: '#f9fafb', color: '#374151', fontSize: Math.max(15, Number(ui.statusFontSize) || 15), lineHeight: 1.45 }}>
                      {fixedWorkflowNoteTrim}
                    </div>
                  </div>
                )}

                {integrationMotivationControls}
                {rejectReasonControls}

                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>{workflowFreeNoteLabel}</div>
                    {workflowNoteTextAreaRequired && <div style={labelReqStyle(true, noteReqErr)}>(obbligatoria)</div>}
                  </div>
                  <textarea
                    ref={noteRef}
                    value={noteDraft}
                    onChange={(e) => { const v = String((e.target as HTMLTextAreaElement).value ?? ''); setNoteDraft(v); autoResizeNote(e.target as HTMLTextAreaElement); if (confirmAttempted) setConfirmAttempted(false) }}
                    placeholder={workflowNotePlaceholder}
                    style={{ width: '100%', minHeight: NOTE_MIN_H, overflowY: 'auto', resize: 'vertical', padding: '8px 10px', borderRadius: 8, border: noteReqErr ? '1px solid #dc2626' : '1px solid rgba(0,0,0,0.20)', fontSize: Math.max(15, Number(ui.statusFontSize) || 15), outline: 'none', boxSizing: 'border-box' }}
                    disabled={!noteEnabled}
                  />
                </div>
              </div>
            )}

            {(loading || workflowSubmitting) ? operationProgressBox : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', marginTop: 4 }}>
                <div
                  style={{ flex: '1 1 auto', minWidth: 0, minHeight: 20, textAlign: 'left', fontSize: 15, color: '#374151', lineHeight: 1.35, whiteSpace: 'normal', overflowWrap: 'break-word' }}
                  title={pending && workflowOperationalDesc ? workflowOperationalDesc : undefined}
                >
                  {pending && workflowOperationalDesc ? workflowOperationalDesc : ' '}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flex: '0 0 auto' }}>
                  <button type='button' onClick={closeWorkflowMenu}
                    style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                    Annulla
                  </button>
                  <button type='button' onClick={() => { void confirmWorkflowAction() }} disabled={!canConfirmWorkflowAction}
                    style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${actionMenuTheme.buttonBorder}`, background: actionMenuTheme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 15, cursor: canConfirmWorkflowAction ? 'pointer' : 'not-allowed', opacity: canConfirmWorkflowAction ? 1 : 0.6 }}>
                    Conferma
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        ) : (
          <div style={{ fontSize: 15, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
            Nessuna azione disponibile per lo stato corrente della pratica.
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  const pendingModal = pending !== null && !actionsMenuOpen ? createPortal(
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
        style={{ width: pendingModalWidth, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, display: 'grid', gap: 12, position: 'relative', zIndex: 2147483647 }}
        onClick={(e) => { e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
      >
        {/* Titolo colorato con icona + banda chiara */}
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 2, color: theme.color, display: 'flex', alignItems: 'flex-start', gap: 8, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px 12px' }}>
          <span style={{ fontSize: 20, flex: '0 0 auto' }}>{theme.icon}</span>
          <span style={{ minWidth: 0, whiteSpace: 'normal', overflowWrap: 'break-word', lineHeight: 1.25 }}>{pendingTitle}</span>
        </div>

        {/* Box numero rilevazione / rapporto tecnico */}
        {hasSel && oid != null && (
          <div style={{ fontWeight: 600, color: '#1f2937', padding: 10, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: 15 }}>
            {(pending === 'TAKE' && riAmmBozzaDeterminazioneDaVerificare) ? 'Pratica: Rapporto tecnico n.' : `${praticaLabel}:`} <span style={{ color: theme.color, fontSize: 15, fontFamily: 'monospace' }}>{praticaCode}</span>
          </div>
        )}

        {/* Errore */}
        {msg && msg.kind === 'err' && (
          <div style={{ fontWeight: 500, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#7f1d1d', fontSize: 15 }}>
            {msg.text}
          </div>
        )}

        {/* Selezione TI */}
        {pending === 'ASSEGNA_TI' && role === 'RZ' && (
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={labelReqStyle(true, tiReqErr)}>Scelta obbligatoria</div>
            <select
              value={tiSelected}
              onChange={(e) => { setTiSelected(e.target.value); if (confirmAttempted) setConfirmAttempted(false) }}
              disabled={loading}
              style={{ width: 'auto', minWidth: 280, maxWidth: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${tiReqErr ? '#dc2626' : 'rgba(0,0,0,0.15)'}`, outline: 'none', fontSize: 15 }}
            >
              <option value=''>— Seleziona Tecnico Istruttore —</option>
              {tiOptions.map(o => (
                <option key={o.username} value={o.username}>{(o.fullName || o.username)} ({o.username})</option>
              ))}
            </select>
            {!tiLoading && !tiLoadErr && tiOptions.length === 0 && <div style={{ fontSize: 14, opacity: 0.75 }}>Nessun Tecnico Istruttore trovato.</div>}
            {!!tiLoadErr && <div style={{ fontSize: 14, color: '#dc2626' }}>Errore elenco Tecnici Istruttori: {tiLoadErr}</div>}
          </div>
        )}

        {pending === 'ASSEGNA_TI_AMM' && role === 'RI_AMM' && (
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={labelReqStyle(true, tiAmmReqErr)}>Scelta obbligatoria</div>
            <select
              value={tiAmmSelected}
              onChange={(e) => { setTiAmmSelected(e.target.value); if (confirmAttempted) setConfirmAttempted(false) }}
              disabled={loading}
              style={{ width: 'auto', minWidth: 280, maxWidth: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${tiAmmReqErr ? '#dc2626' : 'rgba(0,0,0,0.15)'}`, outline: 'none', fontSize: 15 }}
            >
              <option value=''>— Seleziona Tecnico Istruttore amministrativo —</option>
              {tiAmmOptions.map(o => (
                <option key={o.username} value={o.username}>{(o.fullName || o.username)} ({o.username})</option>
              ))}
            </select>
            {!tiAmmLoading && !tiAmmLoadErr && tiAmmOptions.length === 0 && <div style={{ fontSize: 14, opacity: 0.75 }}>Nessun Tecnico Istruttore amministrativo trovato.</div>}
            {!!tiAmmLoadErr && <div style={{ fontSize: 14, color: '#dc2626' }}>Errore elenco Tecnici Istruttori amministrativi: {tiAmmLoadErr}</div>}
          </div>
        )}

        {/* Textarea note */}
        {showNote && (
          <div style={{ display: 'grid', gap: 8 }}>
            {hasFixedWorkflowNote && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>{workflowNoteLabel}</div>
                <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: '#f9fafb', color: '#374151', fontSize: Math.max(15, Number(ui.statusFontSize) || 15), lineHeight: 1.45 }}>
                  {fixedWorkflowNoteTrim}
                </div>
              </div>
            )}

            {integrationMotivationControls}
            {rejectReasonControls}

            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontSize: Math.max(15, Number(titleFontSize) || 15), fontWeight: 700 }}>{workflowFreeNoteLabel}</div>
                {workflowNoteTextAreaRequired && (
                  <div style={labelReqStyle(true, noteReqErr)}>(obbligatoria)</div>
                )}
              </div>
              <textarea
                ref={noteRef}
                value={noteDraft}
                onChange={(e) => { const v = String((e.target as HTMLTextAreaElement).value ?? ''); setNoteDraft(v); autoResizeNote(e.target as HTMLTextAreaElement) }}
                placeholder={workflowNotePlaceholder}
                style={{ width: '100%', minHeight: NOTE_MIN_H, overflowY: 'auto', resize: 'vertical', padding: '8px 10px', borderRadius: 8, border: noteReqErr ? '1px solid #dc2626' : '1px solid rgba(0,0,0,0.20)', fontSize: Math.max(15, Number(ui.statusFontSize) || 15), outline: 'none', boxSizing: 'border-box' }}
                disabled={!noteEnabled}
              />
            </div>
          </div>
        )}

        {/* Descrizione azione */}
        {theme.desc && (
          <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.6, whiteSpace: 'normal', overflowWrap: 'break-word' }}>{theme.desc}</div>
        )}

        {/* Bottoni */}
        {loading ? operationProgressBox : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type='button' onClick={onAnnulla}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
              Annulla
            </button>
            {pending === 'TAKE' && <button type='button' onClick={onConfirmTakeInCharge} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Conferma</button>}
            {pending === 'ASSEGNA_TI' && <button type='button' onClick={onConfirmAssegnaTi} disabled={!tiSelected} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 15, cursor: !tiSelected ? 'not-allowed' : 'pointer', opacity: !tiSelected ? 0.6 : 1 }}>Conferma</button>}
            {pending === 'ASSEGNA_TI_AMM' && <button type='button' onClick={onConfirmAssegnaTiAmm} disabled={!tiAmmSelected} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 15, cursor: !tiAmmSelected ? 'not-allowed' : 'pointer', opacity: !tiAmmSelected ? 0.6 : 1 }}>Conferma</button>}
            {(pending === 'INVIA_TI_AMM' || pending === 'RESTITUISCI_TI_AMM') && <button type='button' onClick={onConfirmRestituisciTiAmm} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Conferma</button>}
            {(pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA') && <button type='button' onClick={onConfirmIntegrazione} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Conferma</button>}
            {pending === 'APPROVA' && <button type='button' onClick={() => { void confirmApprovaWithNotaSpeseWarning() }} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Conferma</button>}
            {pending === 'RESPINGI' && <button type='button' onClick={onConfirmRespinta} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Conferma</button>}
            {pending === 'ELIMINA' && <button type='button' onClick={onConfirmElimina} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Conferma</button>}
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  const incompleteNotaSpeseWarningModal = incompleteNotaSpeseWarning.length > 0 ? createPortal(
    <div
      data-gii-global-popup-root='1'
      style={{ position: 'fixed', inset: 0, zIndex: 2147483647, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <div
        role='dialog'
        aria-modal='true'
        data-gii-global-popup-dialog='1'
        style={{ width: 'min(92vw, 560px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.30)', border: '1px solid #dc2626', padding: 18, display: 'grid', gap: 14 }}
        onClick={(e) => { e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
      >
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontWeight: 800, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Nota spese incompleta</div>
          <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.45 }}>
            Non è possibile procedere con l’inoltro perché sono presenti righe di nota spese senza quantità o con quantità pari a zero.
          </div>
        </div>
        <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 5, fontSize: 15, color: '#374151' }}>
          {incompleteNotaSpeseWarning.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
        <div style={{ fontSize: 15, color: '#4b5563' }}>Completare le quantità oppure eliminare le righe non necessarie prima dell’inoltro.</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type='button'
            onClick={() => setIncompleteNotaSpeseWarning([])}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #dc2626', background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
          >Chiudi</button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  const zeroNotaSpeseWarningModal = zeroNotaSpeseWarning.length > 0 ? createPortal(
    <div
      data-gii-global-popup-root='1'
      style={{ position: 'fixed', inset: 0, zIndex: 2147483647, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'auto' }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <div
        role='dialog'
        aria-modal='true'
        data-gii-global-popup-dialog='1'
        style={{ width: 'min(92vw, 560px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.30)', border: '1px solid #f59e0b', padding: 18, display: 'grid', gap: 14 }}
        onClick={(e) => { e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
      >
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontWeight: 800, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Attenzione</div>
          <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.45 }}>
            Una o più violazioni selezionate prevedono la possibilità di nota spese, ma risultano prive di importo.
          </div>
        </div>
        <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 5, fontSize: 15, color: '#374151' }}>
          {zeroNotaSpeseWarning.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
        <div style={{ fontSize: 15, color: '#4b5563' }}>Confermare comunque la trasmissione?</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type='button'
            onClick={() => setZeroNotaSpeseWarning([])}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >Annulla</button>
          <button
            type='button'
            onClick={async () => {
              setZeroNotaSpeseWarning([])
              await onConfirmEsito(ESITO_APPROVATA, approvaDoneLabel)
              setActionsMenuOpen(false)
            }}
            disabled={loading}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #f97316', background: '#f97316', color: '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1 }}
          >Conferma trasmissione</button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

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

  if (role === 'TI_AMM' && props.accessGate?.status === 'checking') {
    return (
      <div style={panelStyle}>
        <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Azioni</div>
        <div style={{
          flex: '1 1 auto',
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 16,
          boxSizing: 'border-box',
          color: '#4b5563',
          fontSize: 13,
          fontWeight: 700
        }}>
          Verifica accesso alla pratica…
        </div>
      </div>
    )
  }

  if (role === 'TI_AMM' && props.accessGate?.status === 'unavailable') {
    return (
      <div style={panelStyle}>
        <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Azioni</div>
        <div style={{
          flex: '1 1 auto',
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 16,
          boxSizing: 'border-box',
          color: '#7a1c1c',
          fontSize: 13,
          fontWeight: 700
        }}>
          Impossibile verificare l’accesso alla pratica.
        </div>
      </div>
    )
  }

  if (tiAmmAccessDenied) {
    return (
      <div style={panelStyle}>
        <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Azioni</div>
        <div style={{
          flex: '1 1 auto',
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 16,
          boxSizing: 'border-box',
          color: '#7a1c1c',
          fontSize: 13,
          fontWeight: 700
        }}>
          Accesso alla pratica non consentito.
        </div>
      </div>
    )
  }

  return (
    <div>
      <style>{'@keyframes gii-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
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
          <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Azioni</div>
          {msg && <div style={msgStyle(msg.kind, msgFontSize)} title={msg.text}>{msg.text}</div>}
        </div>
{/* BOTTONI AZIONE */}
        {pending === null && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {showTakeDirect ? (
              <Button
                type='primary'
                onClick={() => startAction('TAKE')}
                disabled={!canStartTakeInCharge}
                style={actionButtonStyle(buttonColors.take, !canStartTakeInCharge, ui, buttonColors.takeText)}
              >
                {buttonText}
              </Button>
            ) : (
              <Button
                type='primary'
                onClick={openWorkflowMenu}
                disabled={!hasEnabledWorkflowMenuActions}
                style={actionButtonStyle(buttonColors.approva, !hasEnabledWorkflowMenuActions, ui, buttonColors.approvaText)}
              >
                Gestisci istruttoria
              </Button>
            )}

            {/* Matrice_DT: il pulsante "Trasmetti a DA" è stato rimosso.
                DT approva e trasmette a RI tramite il pulsante "Approva e trasmetti a RI". */}

            {/* Spacer per separare azioni (sx) da utilità (dx) */}
            <div style={{ flex: 1 }}/>

            {/* GRUPPO DESTRO — Apertura gestione pratica */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* PULSANTE MODIFICA — rapporto tecnico o verbale amministrativo */}
              {canShowEdit && (
                <button
                  type='button'
                  disabled={!canOpenEditPage}
                  onClick={handleEditPage}
                  title={editButtonTitle}
                  style={{
                    width: ((ui?.btnPaddingY ?? 8) * 2) + (ui?.btnFontSize ?? 14) + 10,
                    height: ((ui?.btnPaddingY ?? 8) * 2) + (ui?.btnFontSize ?? 14) + 10,
                    padding: 0,
                    boxSizing: 'border-box',
                    borderRadius: 8,
                    border: `2px solid ${canOpenEditPage ? ec.pageColor : '#e5e7eb'}`,
                    background: '#fff',
                    color: canOpenEditPage ? ec.pageColor : '#9ca3af',
                    cursor: canOpenEditPage ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/></svg>
                </button>
              )}


            </div>
          </div>
        )}

        {actionMenuModal}
        {pendingModal}
        {incompleteNotaSpeseWarningModal}
        {zeroNotaSpeseWarningModal}

        {denyPopupMessages.length > 0 && createPortal(
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
              style={{ width: 'min(92vw, 560px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, display: 'grid', gap: 12, position: 'relative', zIndex: 2147483647 }}
              onClick={(e) => { e.stopPropagation() }}
              onMouseDown={(e) => { e.stopPropagation() }}
            >
              <div style={{ fontWeight: 800, fontSize: 18, color: '#b42318', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>⚠</span>
                <span>Validazione trasmissione</span>
              </div>
              {denyPopupMessages.map((m, i) => (
                <div key={i} style={{ fontSize: 15, color: '#374151', lineHeight: 1.6, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
                  {m}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <button type='button' onClick={() => setDenyPopupMessages([])} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  Chiudi
                </button>
                <button
                  type='button'
                  onClick={openViolationFromDenyPopup}
                  disabled={!canOpenEditPage}
                  title={canOpenEditPage ? 'Apri la scheda Violazione della pratica selezionata' : 'Scheda di modifica non disponibile per la pratica selezionata'}
                  style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', background: canOpenEditPage ? '#1d4ed8' : '#e5e7eb', color: canOpenEditPage ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 15, cursor: canOpenEditPage ? 'pointer' : 'not-allowed' }}
                >
                  Vai alla scheda Violazione
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {lockedByTransmit && hasSel && (
          <div style={{ ...msgStyle('info', msgFontSize), marginTop: 4 }}>
            Pratica già trasmessa al Direttore d’Area: azioni non disponibili.
          </div>
        )}
      </div>
    </div>
  )
}



// ── Supporto alla validazione dei gradi delle violazioni ────────────────────


function parseGradiViolazioniForRapporto (raw: any): Record<string, string> {
  const out: Record<string, string> = {}
  const text = String(raw ?? '').trim()
  if (!text) return out
  for (const part of text.split(';')) {
    const m = part.trim().match(/^Art?\.?\s*(\d{1,2})\s*[-:=]\s*([1-4])$/i) || part.trim().match(/^(\d{1,2})\s*[-:=]\s*([1-4])$/)
    if (!m) continue
    const art = String(m[1]).replace(/^0+/, '')
    out[art] = String(m[2])
  }
  return out
}







export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfgMutable: any = (props.config && (props.config as any).asMutable)
    ? (props.config as any).asMutable({ deep: true })
    : (props.config as any || {})
  const cfg: any = { ...defaultConfig, ...cfgMutable }
  // ── Profilo utente: letto da window.__giiUserRole (scritto dal widget Header) ──
  // Conserviamo anche l'identità, non soltanto il ruolo: due TI_AMM diversi possono
  // avere lo stesso ruolo ma autorizzazioni differenti sulla selezione corrente.
  const [detectedRole, setDetectedRole] = React.useState<string>('')
  const [profileReady, setProfileReady] = React.useState(false)
  const [detectedUser, setDetectedUser] = React.useState<any>(() => {
    try { return { ...((window as any).__giiUserRole || {}) } } catch { return {} }
  })

  React.useEffect(() => {
    const readRole = () => {
      try {
        const info = { ...((window as any).__giiUserRole || {}) }
        let role = normalizeRuoloCod(info?.ruoloCod || info?.ruolo_cod || info?.ruoloLabel || info?.ruolo)
        const areaCod = normalizeAreaCod(info?.areaCod || info?.area_cod || info?.areaLabel || info?.area)
        if (role === 'RI' && areaCod === 'AMM') role = 'RI_AMM'
        if (role === 'TI' && areaCod === 'AMM') role = 'TI_AMM'
        const username = String(info?.username || '').trim()
        setDetectedUser(info)
        setDetectedRole(!role || role === 'ADMIN' ? '' : role)
        setProfileReady(!!username && !!role)
      } catch {
        setDetectedUser({})
        setDetectedRole('')
        setProfileReady(false)
      }
    }
    readRole()
    window.addEventListener('gii:userLoaded', readRole)
    return () => window.removeEventListener('gii:userLoaded', readRole)
  }, [])

  const roleCode = detectedRole
  const detectedUserKey = [
    String(detectedUser?.username || '').trim().toLowerCase(),
    String(detectedUser?.fullName || detectedUser?.full_name || '').trim().toLowerCase(),
    roleCode,
    normalizeAreaCod(detectedUser?.areaCod || detectedUser?.area_cod || detectedUser?.areaLabel || detectedUser?.area)
  ].join('|')
  const buttonText = String(cfg.buttonText || 'Prendi in carico')

  const dc = defaultConfig as any
  const buttonColors: ButtonColors = {
    take: normalizeHexColor(cfg.takeColor, defaultConfig.takeColor),
    takeText: normalizeHexColor((cfg as any).takeTextColor, dc.takeTextColor),
    integrazione: normalizeHexColor(cfg.integrazioneColor, defaultConfig.integrazioneColor),
    integrazioneText: normalizeHexColor((cfg as any).integrazioneTextColor, dc.integrazioneTextColor),
    approva: normalizeHexColor(cfg.approvaColor, defaultConfig.approvaColor),
    approvaText: normalizeHexColor((cfg as any).approvaTextColor, dc.approvaTextColor),
    approvaRapporto: normalizeHexColor((cfg as any).approvaRapportoColor, dc.approvaRapportoColor),
    approvaRapportoText: normalizeHexColor((cfg as any).approvaRapportoTextColor, dc.approvaRapportoTextColor),
    respingi: normalizeHexColor(cfg.respingiColor, defaultConfig.respingiColor),
    respingiText: normalizeHexColor((cfg as any).respingiTextColor, dc.respingiTextColor)
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
    detailTitleBg: String((cfg as any).detailTitleBg ?? 'transparent'),

    btnBorderRadius: Number.isFinite(Number((cfg as any).btnBorderRadius)) ? Number((cfg as any).btnBorderRadius) : 8,
    btnFontSize: Number.isFinite(Number((cfg as any).btnFontSize)) ? Number((cfg as any).btnFontSize) : 13,
    btnFontWeight: Number.isFinite(Number((cfg as any).btnFontWeight)) ? Number((cfg as any).btnFontWeight) : 600,
    btnPaddingX: Number.isFinite(Number((cfg as any).btnPaddingX)) ? Number((cfg as any).btnPaddingX) : 16,
    btnPaddingY: Number.isFinite(Number((cfg as any).btnPaddingY)) ? Number((cfg as any).btnPaddingY) : 8
  }

  // --- Editing TI config
  const editConfig = {
    show: cfg.showEditButtons !== false,
    overlayColor: normalizeHexColor(cfg.editOverlayColor, '#7c3aed'),
    pageColor: normalizeHexColor(cfg.editPageColor, '#0d3b66'),
    pageId: String(cfg.editPageId || 'page_45'),
    ammPageId: String((cfg as any).editAmmPageId || 'page_48'),
    fieldStatoTI: String(cfg.fieldStatoTI || 'stato_TI'),
    fieldPresaTI: String(cfg.fieldPresaTI || 'presa_in_carico_TI'),
    minStato: Number.isFinite(Number(cfg.editMinStato)) ? Number(cfg.editMinStato) : 2,
    maxStato: Number.isFinite(Number(cfg.editMaxStato)) ? Number(cfg.editMaxStato) : 2,
    presaRequiredVal: Number.isFinite(Number(cfg.editPresaRequiredVal)) ? Number(cfg.editPresaRequiredVal) : 2
  }


  // Datasource risolta dinamicamente dal widget Elenco: una sola vista effettiva per sessione.
  // Nessun DataSourceComponent / multi-view dichiarata qui.
  // Campi minimi necessari per:
  // - gating dei pulsanti (presa/stato/esito per ruolo)
  // - computeNodoAttivo (serve vedere quali nodi hanno già dati)
  // - assegnazione TI (ti_assegnato_*)
  const watchFields = [
    'origine_pratica',
    'ti_assegnato_username', 'ti_assegnato_nome', 'dt_assegnazione_ti', 'ti_assegnato_da',

    'presa_in_carico_TR', 'dt_presa_in_carico_TR',
    'stato_TR', 'dt_stato_TR',
    'esito_TR', 'dt_esito_TR',
    'note_TR',

    'presa_in_carico_TI', 'dt_presa_in_carico_TI',
    'stato_TI', 'dt_stato_TI',
    'esito_TI', 'dt_esito_TI',
    'note_TI',

    'GII_arch', 'dt_archiviazione_TI', 'archiviato_da',

    'presa_in_carico_RZ', 'dt_presa_in_carico_RZ',
    'stato_RZ', 'dt_stato_RZ',
    'esito_RZ', 'dt_esito_RZ',
    'note_RZ',

    'presa_in_carico_RI', 'dt_presa_in_carico_RI',
    'stato_RI', 'dt_stato_RI',
    'esito_RI', 'dt_esito_RI',
    'note_RI',

    'dt_presa_in_carico_DT',
    'stato_DT', 'dt_stato_DT',
    'esito_DT', 'dt_esito_DT',
    'note_DT',

    'determinazione_stato', 'determinazione_numero', 'determinazione_data',
    'determinazione_trasmessa_firma_il', 'determinazione_trasmessa_firma_da',
    'determinazione_registrata_il', 'determinazione_registrata_da',
    'determinazione_mancata_firma_protocollo', 'determinazione_mancata_firma_data', 'determinazione_mancata_firma_motivo',

    'dt_presa_in_carico_RI_AMM',
    'stato_RI_AMM', 'dt_stato_RI_AMM',
    'esito_RI_AMM', 'dt_esito_RI_AMM',
    'note_RI_AMM',

    'dt_presa_in_carico_TI_AMM',
    'stato_TI_AMM', 'dt_stato_TI_AMM',
    'esito_TI_AMM', 'dt_esito_TI_AMM',
    'note_TI_AMM'
  ]

const queryFields = React.useMemo(() => ['*'], [])

  const [selection, setSelection] = React.useState<RuntimeSelection | null>(() => readRuntimeSelectionForActions())
  React.useEffect(() => {
    const handler = (evt?: any) => {
      const cur = readRuntimeSelection()
      const detail = evt?.detail
      const explicitListSelection = !!detail && detail.oid != null && !!String(detail.layerUrl || '').trim()

      // Se la selezione residua proviene dal salvataggio del cw editing, non è più
      // una selezione valida per il pannello azioni. La riabilitiamo solo dopo un
      // nuovo clic esplicito su una riga dell'elenco, che arriva con detail completo.
      if (!explicitListSelection && isRuntimeSelectionFromEditSave(cur)) {
        clearRuntimeSelection('azioni-edit-save-stale-selection')
        setSelection(null)
        return
      }

      setSelection(cur)
    }
    handler()
    window.addEventListener('gii-selection-changed', handler as any)
    return () => window.removeEventListener('gii-selection-changed', handler as any)
  }, [])

  const [selRefreshNonce, setSelRefreshNonce] = React.useState<number>(0)
  React.useEffect(() => {
    const h = (evt?: any) => {
      const cur = readRuntimeSelection()
      const source = String(evt?.detail?.source || '').trim()
      if (!source && isRuntimeSelectionFromEditSave(cur)) {
        clearRuntimeSelection('azioni-edit-save-stale-selection')
        setSelection(null)
        return
      }

      const detailLayerUrl = String(evt?.detail?.layerUrl || cur?.layerUrl || '').trim()
      invalidateRuntimeProxyCache(detailLayerUrl)
      try { delete runtimeDsProxyPromises[detailLayerUrl] } catch {}
      setSelRefreshNonce(n => n + 1)
    }
    window.addEventListener('gii-force-refresh-selection', h as any)
    return () => window.removeEventListener('gii-force-refresh-selection', h as any)
  }, [])

  const [forcedActive, setForcedActive] = React.useState<{ key: string; state: SelState } | null>(null)
  const [directAccessGate, setDirectAccessGate] = React.useState<DirectPracticeAccessGate>({ status: 'idle' })
  const forcedReqRef = React.useRef(0)
  const forcedContextRef = React.useRef('')

  React.useEffect(() => {
    const req = ++forcedReqRef.current
    const isTiAmmSelection = roleCode === 'TI_AMM'

    if (!profileReady) {
      forcedContextRef.current = ''
      setForcedActive(null)
      setDirectAccessGate({ status: 'idle' })
      return
    }

    if (!selection?.layerUrl || selection.oid == null) {
      forcedContextRef.current = ''
      setForcedActive(null)
      setDirectAccessGate({ status: 'idle' })
      return
    }

    const contextKey = [
      selection.layerUrl,
      selection.oid,
      roleCode,
      isTiAmmSelection ? detectedUserKey : ''
    ].join('|')
    const contextChanged = forcedContextRef.current !== contextKey
    forcedContextRef.current = contextKey

    // Non mantenere visibile la pratica precedente quando cambia selezione o
    // account. Per il TI_AMM la pratica resta nascosta durante ogni nuova
    // verifica autorizzativa; per gli altri ruoli un refresh della stessa
    // selezione non provoca lampeggi inutili.
    if (contextChanged || isTiAmmSelection) setForcedActive(null)

    setDirectAccessGate({ status: isTiAmmSelection ? 'checking' : 'idle' })

    ;(async () => {
      try {
        if (isTiAmmSelection && contextChanged) {
          // Il proxy può essere stato creato nella sessione di un altro account.
          // Al cambio di selezione o identità la verifica autorizzativa ricostruisce
          // il proxy nel contesto corrente; i refresh successivi possono riusarlo.
          invalidateRuntimeProxyCache(selection.layerUrl)
          try { delete runtimeDsProxyPromises[selection.layerUrl] } catch {}
        }

        const dsTry = await createRuntimeDsProxyFromLayerUrl(selection.layerUrl, selection.viewName)
        if (req !== forcedReqRef.current) return

        const idFieldName = String(selection.idFieldName || dsTry.getIdField?.() || 'OBJECTID')
        const stateKey = `${selection.layerUrl}:${selection.oid}`
        const cacheEntry = readSelectedFeatureCache(selection.layerUrl, selection.oid)
        const baseData = cacheEntry?.data && typeof cacheEntry.data === 'object' ? cacheEntry.data : null
        const baseOid = baseData ? Number(baseData[idFieldName] ?? baseData.OBJECTID ?? selection.oid) : NaN

        if (!isTiAmmSelection && baseData && Number.isFinite(baseOid) && baseOid === selection.oid) {
          const quickState: SelState = { ds: dsTry, oid: selection.oid, idFieldName, data: baseData, sig: stateKey }
          setForcedActive({ key: selection.layerUrl, state: quickState })
        }

        const wantsAll = queryFields.includes('*')
        const needsQuery = isTiAmmSelection || !baseData || wantsAll || queryFields.some(f => f && f !== '*' && !Object.prototype.hasOwnProperty.call(baseData, f)) || selRefreshNonce > 0
        if (!needsQuery) return

        const where = `${idFieldName}=${selection.oid}`
        const res: any = await dsTry.query({ where, outFields: queryFields, returnGeometry: true } as any)
        if (req !== forcedReqRef.current) return

        const recs: any[] = res?.records || []
        if (!recs.length) {
          setForcedActive(null)
          setDirectAccessGate({ status: isTiAmmSelection ? 'unavailable' : 'idle' })
          return
        }

        const r0 = recs[0]
        const fetched = r0?.getData?.() || {}

        if (isTiAmmSelection && !isPracticeAssignedToCurrentTiAmm(fetched, detectedUser)) {
          setForcedActive(null)
          setDirectAccessGate({ status: 'denied' })
          return
        }

        const cached = readSelectedFeatureCache(selection.layerUrl, selection.oid)
        const freshEdit = cached && cached.source === 'edit' && (Date.now() - Number(cached.ts || 0) < 15000)
        const d0: any = freshEdit
          ? { ...(fetched || {}), ...((cached?.data || {}) as any) }
          : { ...((baseData || {}) as any), ...(fetched || {}) }

        if (isTiAmmSelection) {
          // Le informazioni di assegnazione usate dal pannello restano quelle
          // appena verificate sul servizio, anche quando si recuperano altri
          // campi da una cache recente dell'editing.
          const assignment = getTiAmmAssignment(fetched)
          const assignmentAliases = new Set([
            'ti_amm_assegnato_username', 'ti_amm_assegnato_user', 'ti_amm_assegnato',
            'ti_amm_username', 'utente_ti_amm', 'ti_amm_assegnato_nome', 'ti_amm_assegnato_name'
          ])
          Object.keys(d0).forEach(key => {
            if (assignmentAliases.has(String(key).toLowerCase())) delete d0[key]
          })
          d0.ti_amm_assegnato_username = assignment.username
          d0.ti_amm_assegnato_nome = assignment.name
        }

        const oid0 = Number(d0[idFieldName] ?? d0.OBJECTID ?? selection.oid)
        if (!Number.isFinite(oid0) || oid0 !== selection.oid) {
          setForcedActive(null)
          setDirectAccessGate({ status: isTiAmmSelection ? 'unavailable' : 'idle' })
          return
        }

        writeSelectedFeatureCache(selection.layerUrl, selection.oid, idFieldName, d0, 'azioni')
        const st: SelState = { ds: dsTry, oid: selection.oid, idFieldName, data: d0, sig: stateKey }
        setForcedActive({ key: selection.layerUrl, state: st })
        setDirectAccessGate({ status: isTiAmmSelection ? 'allowed' : 'idle' })
      } catch {
        if (req !== forcedReqRef.current) return
        setForcedActive(null)
        setDirectAccessGate({ status: isTiAmmSelection ? 'unavailable' : 'idle' })
      }
    })()
  }, [selection?.layerUrl, selection?.oid, selection?.idFieldName, selection?.viewName, queryFields.join('|'), selRefreshNonce, roleCode, detectedUserKey, profileReady])


  const activeGate = forcedActive


  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', padding: Number.isFinite(Number((cfg as any).maskOuterOffset ?? 0)) ? Number((cfg as any).maskOuterOffset) : 0 }}>
      <ActionsPanel
          active={activeGate}
          roleCode={roleCode}
          buttonText={buttonText}
          buttonColors={buttonColors}
          ui={ui}
          editConfig={editConfig}
          nsConfig={{
            detailUrl: String(cfg.nsNotaSpeseDettaglioUrl || ''),
            parametriUrl: String(cfg.nsParametriUrl || ''),
            parametroCode: String(cfg.nsParametroCode || 'SPESE_GENERALI_PERC'),
            attrezzatureParametriUrl: String((cfg as any).attrezzatureParametriUrl || '')
          }}
          sanzioneConfig={{
            parametriSanzioniUrl: String(cfg.parametriSanzioniUrl || ''),
            regolamentoArticoliUrl: String(cfg.regolamentoArticoliUrl || ''),
            regolamentoRaccordiUrl: String(cfg.regolamentoRaccordiUrl || '')
          }}
          accessGate={directAccessGate}
        />
    </div>
  )
}

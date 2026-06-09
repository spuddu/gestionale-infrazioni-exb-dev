/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, DataSourceManager, UrlManager, getAppStore } from 'jimu-core'
import { Button } from 'jimu-ui'
import { createPortal } from 'react-dom'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'
import { buildNotaSpesePdf, type NotaSpeseData } from '../../../_shared/gii-anteprime/rapporto/notaspese-pdf-builder'
import { PDFDocument } from 'pdf-lib'
import AnteprimaPdfViewer from '../../../_shared/gii-anteprime/anteprima-pdf-viewer'
import { buildRapportoPdf, buildRapportoIterPlaceholders, loadRapportoIterCicliForPdf, type RapportoIterCicloPdf } from '../../../_shared/gii-anteprime/rapporto/rapporto-pdf-builder'


const GII_LOG_EVENTI_CICLI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'
const GII_ATTIVITA_CORRENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_ATTIVITA_CORRENTI/FeatureServer/0'

// ── Cache GII_utenti per risolvere utente_destinatario ──────────────────────
type UtenteCached = {
  full_name: string
  ruolo: number | null
  area: number | null
  settore: number | null
  ruoloCod: string
  areaCod: string
  settoreCod: string
}
let _utentiCache: Map<string, UtenteCached> | null = null
let _utentiLoading = false

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

// In Experience Builder, una Data View / Output Data Source può non esporre direttamente un FeatureLayer.
// Questa funzione prova più strade (DS corrente, DS da manager, DS padre) e, se serve, crea un FeatureLayer dal URL.
async function resolveFeatureLayerForAttachments (ds: any): Promise<any | null> {
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
    if (typeof belongId === 'string' && belongId) {
      push(dm.getDataSource(belongId))
    }
  } catch {
    // ignore
  }

  for (const c of candidates) {
    const cAny: any = c
    const l = unwrapJsapiLayer(
      (typeof cAny.getLayer === 'function' ? cAny.getLayer() : null) ??
      (typeof cAny.getJsApiLayer === 'function' ? cAny.getJsApiLayer() : null) ??
      (typeof cAny.getJSAPILayer === 'function' ? cAny.getJSAPILayer() : null) ??
      cAny.layer
    ) as any
    if (l && typeof l.queryAttachments === 'function') return l
  }

  // Fallback: crea un FeatureLayer a partire dal URL del DS (se presente)
  try {
    const dsAny: any = ds
    const url: any = dsAny?.getDataSourceJson?.()?.url ?? dsAny?.dataSourceJson?.url
    if (!url || typeof url !== 'string') return null
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url })
    if (typeof fl?.load === 'function') await fl.load().catch(() => {})
    if (fl && typeof fl.queryAttachments === 'function') return fl
  } catch {
    // ignore
  }

  return null
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
    try { delete (window as any).__giiSelection } catch {}
    window.dispatchEvent(new CustomEvent('gii-selection-changed', { detail: null }))
    window.dispatchEvent(new CustomEvent('gii-selection-cleared', { detail: { source: reason, ts: Date.now() } }))
  } catch {}
}

function readRuntimeSelection (): RuntimeSelection | null {
  try {
    const mem = (window as any)?.__giiSelection
    if (mem && mem.layerUrl && Number.isFinite(Number(mem.oid))) {
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

function makeRuntimeRecord (attrs: any, idFieldName: string, sourceKey: string): any {
  const id = String(attrs?.[idFieldName] ?? attrs?.OBJECTID ?? attrs?.objectid ?? '')
  return {
    getData: () => attrs,
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
        return { records: (res?.features || []).map((f: any) => makeRuntimeRecord(f?.attributes || {}, idFieldName, layerUrl)) }
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
          <div style={{ fontSize: 12, color: '#6b7280' }}>{alias}</div>
          <select
            value={val ?? ''}
            disabled={saving}
            onChange={e => updateDraft(fieldName, (e.target as HTMLSelectElement).value === '' ? null : (isNum ? Number((e.target as HTMLSelectElement).value) : (e.target as HTMLSelectElement).value))}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.20)', fontSize: 13, width: '100%', background: saving ? '#f3f4f6' : '#fff' }}
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
          <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
            ✏️ Modifica rilevazione&nbsp;<span style={{ color: '#2f6fed' }}>{praticaCode}</span>
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
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Annullare le modifiche?</div>
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
  nsConfig: { detailUrl: string; parametriUrl: string; parametroCode: string }
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

  const statoDAField = 'stato_DA'

  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg] = React.useState<Msg | null>({ kind: 'info', text: 'Selezionare una riga.' })

  // lock procedura: solo quando parte un’azione (pending) o quando salvo (loading)
  const [pending, setPending] = React.useState<Pending>(null)
  const [actionsMenuOpen, setActionsMenuOpen] = React.useState(false)
  const [workflowSubmitting, setWorkflowSubmitting] = React.useState(false)

  // validazioni “soft”: si attivano solo dopo tentativo di conferma
  const [confirmAttempted, setConfirmAttempted] = React.useState(false)

  // note / motivazione
  const [noteDraft, setNoteDraft] = React.useState('')
  const [rejectReason, setRejectReason] = React.useState('')

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

  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [previewError, setPreviewError] = React.useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = React.useState<string>('rapporto.pdf')

  React.useEffect(() => {
    return () => { revokeRapportoPdfUrl(previewUrl) }
  }, [previewUrl])

  // ── Cache GII_utenti (per risolvere utente_destinatario) ──
  React.useEffect(() => {
    if (_utentiCache || _utentiLoading) return
    _utentiLoading = true
    ;(async () => {
      try {
        const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
        const fl = new FeatureLayer({ url: GII_UTENTI_URL })
        if (typeof fl?.load === 'function') await fl.load()
        const res = await fl.queryFeatures({
          where: '1=1',
          outFields: ['username', 'full_name', 'ruolo', 'area', 'settore', 'ruolo_cod', 'area_cod', 'settore_cod'],
          returnGeometry: false
        })
        const map = new Map<string, UtenteCached>()
        for (const f of (res?.features || [])) {
          const a = f?.attributes
          if (a?.username) {
            map.set(String(a.username).trim().toLowerCase(), {
              full_name: String(a.full_name || ''),
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
      } catch (ex) {
        console.warn('[GII-Azioni] Errore caricamento GII_utenti cache:', ex)
      } finally {
        _utentiLoading = false
      }
    })()
  }, [])

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

  const closeRapportoPreview = React.useCallback(() => {
    setPreviewOpen(false)
    setPreviewError(null)
    setPreviewLoading(false)
  }, [])

  const handleRapportoPreview = React.useCallback(() => {
    if (!hasSel || !data) return
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError(null)
    ;(async () => {
      try {
        const { blob, fileName } = await buildRapportoPdfBlob(data, _utentiCache, props.nsConfig)
        const url = makeRapportoPdfUrl(blob, fileName)
        setPreviewFileName(fileName)
        setPreviewUrl(prev => {
          revokeRapportoPdfUrl(prev)
          return url
        })
      } catch (ex: any) {
        setPreviewError('Errore generazione anteprima: ' + (ex?.message || String(ex)))
      } finally {
        setPreviewLoading(false)
      }
    })()
  }, [data, hasSel])

  const handleRapportoDownload = React.useCallback(() => {
    if (!hasSel || !data) return
    ;(async () => {
      try {
        const { blob, fileName } = await buildRapportoPdfBlob(data, _utentiCache, props.nsConfig)
        downloadBlobFile(blob, fileName)
      } catch (ex: any) {
        setMsg({ kind: 'err', text: 'Errore download rapporto: ' + (ex?.message || String(ex)) })
      }
    })()
  }, [data, hasSel])


  const sessionIdRef = React.useRef<string>(`sess-${Date.now()}-${Math.random().toString(16).slice(2)}`)

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

  const normalizeTipoAttoAmmCode = (raw: any): string => {
    const value = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
    if (value === 'VERBALE_MISTO') return 'VERBALE_RISARCIMENTO'
    if (value.includes('VERBALE') && (value.includes('MIST') || value.includes('RISARC') || value.includes('RIMBORS'))) return 'VERBALE_RISARCIMENTO'
    if (value.includes('VERBALE')) return 'VERBALE'
    return value
  }

  const attoAmmPrevedeVerbale = (attrs: any): boolean => {
    const code = normalizeTipoAttoAmmCode(pickAttrCI(attrs || {}, ['tipo_atto_amm']))
    return code === 'VERBALE' || code === 'VERBALE_RISARCIMENTO'
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
    if (multi.has(code)) return true
    return isFlagSelectedLocal(pickAttrCI(attrs, [`v_art${String(art).padStart(2, '0')}`, `V_ART${String(art).padStart(2, '0')}`, `v_art${art}`, `V_ART${art}`]))
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
    q.outFields = ['codice_casistica', 'importo_riga', 'quantita']
    q.returnGeometry = false
    const res = await fl.queryFeatures(q)
    const statuses: Record<string, NotaSpeseCasisticaStatus> = {}
    ;(res?.features || []).forEach((f: any) => {
      const a = f?.attributes || {}
      const code = String(a.codice_casistica || '').trim()
      if (!code) return
      const value = Number(a.importo_riga)
      const qty = Number(a.quantita)
      const cur = statuses[code] || { total: 0, rows: 0, incompleteRows: 0 }
      cur.total += Number.isFinite(value) ? value : 0
      cur.rows += 1
      if (!Number.isFinite(qty) || qty <= 0) cur.incompleteRows += 1
      statuses[code] = cur
    })
    return statuses
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
    selected.forEach(opt => {
      const st = statuses[opt.codice] || { total: 0, rows: 0, incompleteRows: 0 }
      if (st.incompleteRows > 0) {
        blocking.push(`${opt.label}: ${st.incompleteRows} ${st.incompleteRows === 1 ? 'riga senza quantità o con quantità pari a zero' : 'righe senza quantità o con quantità pari a zero'}`)
        return
      }
      if (Number(st.total || 0) <= 0) confirmable.push(`${opt.label}: 0,00 €`)
    })
    return { blocking, confirmable }
  }

  type CycleContext = { parentGlobalId: string, area: string, settore: string, username: string }

  const getCurrentCycleContext = (): CycleContext => {
    const giiRole: any = (window as any).__giiUserRole || {}
    const parentGlobalId = String(pickAttrCI(data, ['globalid', 'global_id', 'GlobalID', 'GLOBALID', 'parent_globalid']) || '')
    const area = normalizeAreaLabel(giiRole.areaCod || giiRole.area_cod || giiRole.areaLabel || giiRole.area || pickAttrCI(data, ['area_cod', 'area', 'cod_area']))
    const settore = normalizeSettoreLabel(
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
    const settore = base.settore || normalizeSettoreLabel(
      area,
      giiRole.settoreCod || giiRole.settore_cod || giiRole.settoreLabel || giiRole.settore || pickAttrCI(attrs, ['settore_cod', 'settore', 'cod_settore']) || inferSettoreFromUsername(String(giiRole.username || pickAttrCI(attrs, ['creator', 'Creator', 'editor', 'Editor']) || ''))
    )
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

  /**
   * Verifica se il ruolo corrente è stato riattivato per rispondere a una richiesta di integrazione.
   * Controlla se un ruolo "superiore" ha esito=INTEGRAZIONE nei confronti di questo ruolo.
   */
  const isRespondingToIntegration = (): boolean => {
    if (!data) return false
    const integSources: Record<string, string[]> = {
      TI: ['RZ'], RI: ['DT'], TI_AMM: ['RI_AMM'],
      // RI_AMM -> RI è una integrazione tecnica speciale: il RI non risponde
      // direttamente a RI_AMM, ma deve ritrasmettere a DT. Per questo RI_AMM
      // non va considerato qui come requester diretto del RI.
      RZ: [], DT: [], DA: [], RI_AMM: []
    }
    for (const src of (integSources[role] || [])) {
      const v = pickAttrCI(data, [`esito_${src}`, `ESITO_${src}`])
      const n = v != null && v !== '' ? Number(v) : null
      if (n === ESITO_INTEGRAZIONE) return true
    }
    return false
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
    if (!parentGlobalId) return null
    const logLayer = await getCycleLogLayer()
    if (!logLayer?.queryFeatures) return null
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `(${parentGlobalIdWhere('parent_globalid', parentGlobalId)}) AND ruolo_competente = ${sqlQuote(ruoloCompetente)} AND stato_record = 'APERTO'`
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
      if (!parentGlobalId) {
        console.warn('[GII_LOG_EVENTI_CICLI] Chiusura ciclo saltata: parent_globalid non disponibile.', { oid, role })
        return
      }
      const logLayer = await getCycleLogLayer()
      if (!logLayer?.applyEdits) return
      const feature = await queryOpenCycle(parentGlobalId, role)

      if (!feature?.attributes) {
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
    if (rr === 'DA') return 'DIR-AMM'
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
    opts?: { technicalIntegration?: boolean, destUsername?: string }
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
      const destinatario = makeGiiActorLabel(ruoloDest, opts?.destUsername || resolveDestUser(ruoloDest), destMeta)

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
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: GII_ATTIVITA_CORRENTI_URL, outFields: ['*'] })
    if (typeof fl?.load === 'function') await fl.load()
    attivitaLayerRef.current = fl
    return fl
  }

  const practicePrefixForActivity = (overrideAttrs?: Record<string, any>): string => {
    const merged = { ...(data || {}), ...(overrideAttrs || {}) }
    const origin = pickAttrCI(merged, ['origine_pratica', 'Origine_pratica', 'ORIGINE_PRATICA'])
    return origin === 2 || String(origin || '').trim() === '2' ? 'TI' : 'TR'
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
    if (ev === 'RAPPORTO_APPROVATO') return 'RAPPORTO_APPROVATO'
    if (ev === 'SANZIONE_APPROVATA') return 'VERBALE_APPROVATO'
    if (ev === 'INTEGRAZIONE_RICHIESTA') return 'RICHIESTA_INTEGRAZIONE'
    if (ev === 'INTEGRAZIONE_TRASMESSA') return 'INTEGRAZIONE_TRASMESSA'
    if (ev === 'INVIO_A_TI_AMM' || ev === 'RESTITUZIONE_A_TI_AMM') return 'NUOVA_ASSEGNAZIONE'
    if (ev === 'ISTRUTTORIA_TRASMESSA') {
      if (dst === 'DA') return 'PROPOSTA_VERBALE'
      return 'NUOVA_ASSEGNAZIONE'
    }
    if (ev === 'RESPINTA') {
      if (src === 'DA') return 'VERBALE_RESPINTO'
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
    if (st === 'RICHIESTA_INTEGRAZIONE') return 'Integrazione richiesta'
    if (st === 'INTEGRAZIONE_TRASMESSA') return 'Integrazione trasmessa'
    if (st === 'RAPPORTO_APPROVATO') return 'Pratica approvata'
    if (st === 'PROPOSTA_VERBALE') return 'Proposta di verbale'
    if (st === 'VERBALE_APPROVATO') return 'Verbale approvato'
    if (st === 'RILEVAZIONE_RESPINTA') return 'Rilevazione respinta'
    if (st === 'ISTRUTTORIA_TECNICA_RESPINTA') return 'Istruttoria tecnica respinta'
    if (st === 'VERBALE_RESPINTO') return 'Verbale respinto'
    return 'Attività da prendere in carico'
  }

  const activityMessageForSubtype = (subtipo: string, numeroRapporto: string): string => {
    const st = String(subtipo || '').trim().toUpperCase()
    const n = String(numeroRapporto || '').trim() || '—'
    if (st === 'NUOVO_RAPPORTO') return `Rilevazione n. ${n} da prendere in carico.`
    if (st === 'RAPPORTO_UFFICIO') return `Rilevazione n. ${n} da prendere in carico.`
    if (st === 'NUOVA_ASSEGNAZIONE') return `Pratica n. ${n} da prendere in carico.`
    if (st === 'RICHIESTA_INTEGRAZIONE') return `Integrazione n. ${n} da prendere in carico.`
    if (st === 'INTEGRAZIONE_TRASMESSA') return `Integrazione n. ${n} da prendere in carico.`
    if (st === 'RAPPORTO_APPROVATO') return `Pratica approvata n. ${n} da prendere in carico.`
    if (st === 'PROPOSTA_VERBALE') return `Proposta di verbale sulla pratica n. ${n} da prendere in carico.`
    if (st === 'VERBALE_APPROVATO') return `Verbale della pratica n. ${n} da prendere in carico.`
    if (st === 'RILEVAZIONE_RESPINTA') return `Rilevazione respinta sulla pratica n. ${n}.`
    if (st === 'ISTRUTTORIA_TECNICA_RESPINTA') return `Istruttoria tecnica respinta sulla pratica n. ${n}.`
    if (st === 'VERBALE_RESPINTO') return `Verbale respinto sulla pratica n. ${n}.`
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
      if (src === 'RI_AMM' && dst === 'DA') return 'Istruttoria amministrativa approvata'
    }

    if (ev === 'INVIO_A_TI_AMM') return 'Istruttoria amministrativa trasmessa'
    if (ev === 'RESTITUZIONE_A_TI_AMM') return 'Pratica restituita'

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
      if (src === 'RI_AMM' && dst === 'DA') return `Proposta di verbale sulla pratica n. ${n} da prendere in carico.`
    }

    if (ev === 'INVIO_A_TI_AMM') return `Istruttoria amministrativa n. ${n} da prendere in carico.`
    if (ev === 'RESTITUZIONE_A_TI_AMM') return `Pratica n. ${n} restituita al Tecnico Istruttore amministrativo.`

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

  const deleteCurrentActivitiesForDestRole = async (ruoloDestRaw: string, excludeKey?: string) => {
    const ruoloDest = normalizeActivityDestRole(String(ruoloDestRaw || ''))
    if (!ruoloDest || !hasSel || oid == null) return
    try {
      const layer = await getAttivitaLayer()
      const parentGlobalId = await getActivityParentGlobalId()
      const targetParts: string[] = []
      if (parentGlobalId) targetParts.push(`(${parentGlobalIdWhere('parent_globalid', parentGlobalId)})`)
      if (oid != null && Number.isFinite(Number(oid))) targetParts.push(`parent_objectid = ${Number(oid)}`)
      if (!targetParts.length) return

      const parts: string[] = [
        `tipo_attivita = 'PRESA_IN_CARICO'`,
        `destinatario_ruolo = ${sqlQuote(ruoloDest)}`,
        `(${targetParts.join(' OR ')})`
      ]
      const key = String(excludeKey || '').trim()
      if (key) parts.push(`chiave_attivita <> ${sqlQuote(key)}`)

      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = parts.join(' AND ')
      q.outFields = ['OBJECTID']
      q.returnGeometry = false
      const res = await layer.queryFeatures(q)
      const deletes = (res?.features || [])
        .map((f: any) => f?.attributes?.OBJECTID)
        .filter((v: any) => v != null)
        .map((objectId: any) => ({ objectId }))
      if (deletes.length) await layer.applyEdits({ deleteFeatures: deletes })
    } catch (e) {
      console.warn('[GII_ATTIVITA_CORRENTI] Errore eliminazione attività corrente per ruolo:', e)
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
      const messaggio = activityMessageForEvent(subtipo, logOpts?.eventoChiusura, role, ruoloDest, numeroRapporto)
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

  const deleteCurrentActivityForCurrentRole = async () => {
    if (!hasSel || oid == null) return
    const currentRole = normalizeActivityDestRole(role)
    if (!currentRole) return
    await deleteCurrentActivitiesForDestRole(currentRole)
    try { window.dispatchEvent(new CustomEvent('gii-alerts-refresh', { detail: { source: 'gii-azioni-delete-attivita', oid, ts: Date.now() } })) } catch {}
  }


  const getPrevRoleForIntegration = (target?: 'TI_AMM' | 'TECNICA'): string => {
    if (role === 'RZ')     return 'TI'
    if (role === 'RI')     return 'TI'
    if (role === 'DT')     return 'RI'
    if (role === 'RI_AMM') {
      // RI_AMM ha due percorsi distinti di richiesta integrazione:
      // - amministrativa verso il TI_AMM assegnato;
      // - tecnica verso il RI dell'area di provenienza (AGR o TEC).
      if (target === 'TI_AMM') return 'TI_AMM'
      return 'RI'
    }
    if (role === 'TI_AMM') return 'RI_AMM'
    if (role === 'DA')     return 'RI_AMM'
    return ''
  }

  const getNextRoleForForward = (): string => {
    if (role === 'TI')     return 'RZ'
    if (role === 'RZ')     return 'RI'
    if (role === 'RI')     return 'DT'
    if (role === 'DT')     return 'RI_AMM'   // DT approva e trasmette direttamente a RI_AMM (fase sanzionatoria)
    if (role === 'RI_AMM') {
      // RI_AMM: se TI_AMM ha già restituito (esito valorizzato) → trasmette a DA; altrimenti → assegna TI_AMM
      const esitoTiAmm = pickAttrCI(data, ['esito_TI_AMM', 'ESITO_TI_AMM'])
      return toNumOrNull(esitoTiAmm) != null ? 'DA' : 'TI_AMM'
    }
    if (role === 'TI_AMM') return 'RI_AMM'
    if (role === 'DA')     return 'TI_AMM'   // DA approva e trasmette a TI_AMM per adempimenti (verbale, bollettino, PEC)
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
      RI_AMM: ['DA', 'TI_AMM']
    }
    const candidates = requesterByResponder[role] || []
    for (const requester of candidates) {
      const esitoReq = toNumOrNull(pickAttrCI(data, [`esito_${requester}`, `ESITO_${requester}`]))
      if (esitoReq === ESITO_INTEGRAZIONE) return requester
    }
    return ''
  }


  // --- Editing pagina (tecnico: TI/RI; amministrativo: TI_AMM/RI_AMM) ---
  const ec = props.editConfig
  const isAmmEditRole = role === 'TI_AMM' || role === 'RI_AMM'
  const canShowEdit = ec.show && (role === 'TI' || role === 'RI' || isAmmEditRole)
  const roleStatoField = `stato_${role}`
  const rolePresaField = `presa_in_carico_${role}`
  const roleEsitoField = `esito_${role}`

  const statoRoleVal = data ? pickAttrCI(data, [roleStatoField, roleStatoField.toUpperCase()]) : null
  const presaRoleVal = data ? pickAttrCI(data, [rolePresaField, rolePresaField.toUpperCase()]) : null
  const statoRoleNum = toNumOrNull(statoRoleVal)
  const presaRoleNum = toNumOrNull(presaRoleVal)
  const currentTiUsername = String((window as any).__giiUserRole?.username || (window as any).__giiUser?.username || '').trim().toLowerCase()
  const assignedTiUsername = role === 'TI_AMM'
    ? String(pickAttrCI(data, ['ti_amm_assegnato_username', 'ti_amm_assegnato_user', 'ti_amm_assegnato']) || '').trim().toLowerCase()
    : String(pickAttrCI(data, ['ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato']) || '').trim().toLowerCase()
  const isOwnedByCurrentRole = (role === 'TI' || role === 'TI_AMM')
    ? (!!currentTiUsername && !!assignedTiUsername && currentTiUsername === assignedTiUsername)
    : (role === 'RI' || role === 'RI_AMM')

  const isMeaningfulAudit = (v: any): boolean => !(v === null || v === undefined || v === '' || v === 0 || v === '0')
  const inChargeByRole =
    presaRoleNum === PRESA_IN_CARICO ||
    statoRoleNum === STATO_PRESA_IN_CARICO

  const roleClosedOrForwarded =
    isMeaningfulAudit(pickAttrCI(data, [roleEsitoField, roleEsitoField.toUpperCase()])) ||
    (statoRoleNum === STATO_APPROVATA) ||
    (statoRoleNum === STATO_RESPINTA) ||
    (statoRoleNum != null && statoRoleNum > STATO_PRESA_IN_CARICO)

  const canEdit =
    hasSel &&
    !loading &&
    pending === null &&
    canShowEdit &&
    !!isOwnedByCurrentRole &&
    inChargeByRole &&
    !roleClosedOrForwarded

  // TI e RI delle aree tecniche devono poter consultare anche le pratiche già
  // trasmesse ad altri ruoli. In tal caso gii-editing-ti viene aperto in sola
  // consultazione; quando la pratica torna nella disponibilità del ruolo, il
  // medesimo controllo rende nuovamente editabili i campi di competenza.
  const canOpenTechnicalReadOnly =
    hasSel &&
    !loading &&
    pending === null &&
    canShowEdit &&
    (role === 'TI' || role === 'RI')

  const canOpenEditPage = canEdit || canOpenTechnicalReadOnly
  const openInReadOnly = canOpenEditPage && !canEdit && (role === 'TI' || role === 'RI')

  const editButtonTitle = canEdit
    ? (isAmmEditRole ? 'Apri scheda atto amministrativo' : 'Modifica rilevazione')
    : (openInReadOnly
      ? 'Apri la rilevazione in sola consultazione: la pratica non è attualmente nella disponibilità del ruolo corrente.'
      : (isAmmEditRole
        ? 'Modifica dell’atto amministrativo non disponibile: la pratica deve essere già presa in carico dal ruolo corrente.'
        : 'Apertura non disponibile: selezionare una pratica.'))

  const canUseRapportoPdf =
    hasSel &&
    !!data &&
    !loading &&
    pending === null

  const handleEditPage = () => {
    if (!canOpenEditPage) return
    try {
      const payload = {
        oid,
        data: { ...data },
        idFieldName: active?.state?.idFieldName || 'OBJECTID',
        dsId: active?.state?.ds?.id ?? null,
        layerUrl: active?.state?.ds?.getDataSourceJson?.()?.url ?? active?.state?.ds?.dataSourceJson?.url ?? null,
        readOnly: openInReadOnly,
        readOnlyMessage: openInReadOnly
          ? 'Pratica non attualmente assegnata al proprio ruolo. I dati sono disponibili in sola consultazione.'
          : '',
        ts: Date.now()
      }
      ;(window as any).__giiEdit = payload
      try { sessionStorage.setItem('GII_EDIT_INTENT', JSON.stringify(payload)) } catch {}
      try { window.dispatchEvent(new CustomEvent('gii-edit-intent-changed')) } catch {}
      try { sessionStorage.removeItem('GII_NAV_SECTION') } catch {}
      try { sessionStorage.removeItem('GII_REQUESTED_EDIT_SECTION') } catch {}
      if (!isAmmEditRole) {
        try { sessionStorage.setItem('GII_EDIT_TAB', 'anagrafica') } catch {}
        try { window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: 'anagrafica' } })) } catch {}
      } else {
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

  // Leggi i valori in modo robusto:
  // - se il campo non esiste nello schema, non usarlo
  // - se esiste ma arriva con case diversa, risolvi tramite schema CI
  const presaFieldExists = hasDedicatedPresaField(role) && hasField(presaField)
  const dtPresaFieldExists = hasField(dtPresaField)
  const statoFieldExists = hasField(statoField)

  const presaVal = (data && presaFieldExists) ? data[realFieldName(presaField)] : null
  const statoVal = (data && statoFieldExists) ? data[realFieldName(statoField)] : (data ? data[statoField] : null)
  const esitoVal = data ? data[realFieldName(esitoField)] : null
  const statoDAVal = data ? data[realFieldName(statoDAField)] : null

  const presaNumRaw = toNumOrNull(presaVal)
  const statoNum = toNumOrNull(statoVal)
  // Se il campo presa_in_carico_* non esiste (molto comune per RZ/TI in alcune viste),
  // interpretiamo "presa" = stato (stato=2 significa presa in carico).
  const presaNum = presaFieldExists ? presaNumRaw : statoNum
  const statoDANum = toNumOrNull(statoDAVal)
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
      (toNumOrNull(pickAttrCI(d, ['esito_DT', 'ESITO_DT'])) != null) ||
      (toNumOrNull(pickAttrCI(d, ['stato_DA', 'STATO_DA'])) != null) ||
      (toNumOrNull(pickAttrCI(d, ['esito_DA', 'ESITO_DA'])) != null)
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
  const effectiveStatoNum = awaitingRetakeByRz && role === 'RZ' ? STATO_DA_PRENDERE : statoNum
  const effectivePresaNum = awaitingRetakeByRz && role === 'RZ' ? PRESA_DA_PRENDERE : presaNum

  // Matrice_DT: DT trasmette a RI (non a DA). Nessun lock basato su stato_DA.
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
      setRejectReason('')
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
    setRejectReason('')
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
  // Scansiona i ruoli dal più avanzato (DA) al meno avanzato (TR) e
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

    const scanOrder = ['DA', 'TI_AMM', 'RI_AMM', 'DT', 'RI', 'RZ', 'TI', 'TR']

    const hasData = (r: string) => {
      const p = hasDedicatedPresaField(r) ? d[`presa_in_carico_${r}`] : null
      const s = d[`stato_${r}`]
      const e = d[`esito_${r}`]
      return isMeaningful(p) || isMeaningful(s) || isMeaningful(e)
    }

    // fwdDest dinamico: DT→RI_AMM diretto, RI_AMM→TI_AMM/DA, DA→TI_AMM
    const getFwdDestLocal = (r: string): string => {
      switch (r) {
        case 'TI':     return 'RZ'
        case 'RZ':     return 'RI'
        case 'RI':     return 'DT'
        case 'DT':     return 'RI_AMM'
        case 'RI_AMM': {
          const esitoTiAmm = pickAttrCI(d, ['esito_TI_AMM', 'ESITO_TI_AMM'])
          return toNum(esitoTiAmm) != null ? 'DA' : 'TI_AMM'
        }
        case 'TI_AMM': return 'RI_AMM'
        case 'DA':     return 'TI_AMM'
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
        case 'DA':     return 'RI_AMM'
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
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    canChooseWorkflowAction &&
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
    (toNumOrNull(pickAttrCI(data, ['esito_DT', 'ESITO_DT'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['stato_DA', 'STATO_DA'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['esito_DA', 'ESITO_DA'])) != null)
  const hasTiAnyEvidence = hasTiAssigned || hasTiWorkflowTouched
  const tiReturned = (esitoTiNum != null) || (statoTiNum === STATO_APPROVATA) || (statoTiNum === STATO_RESPINTA) || hasHigherWorkflowTouched
  const lockRZBecauseAssignedToTi = role === 'RZ' && (origineNum == null || origineNum === 1) && hasTiAnyEvidence && !tiReturned && !awaitingRetakeByRz

  // TI_AMM già assegnato?
  const tiAmmUserRaw = pickAttrCI(data, ['ti_amm_assegnato_username'])
  const hasTiAmmAssigned = !isEmptyValue(tiAmmUserRaw)

  // Nodo TI_AMM: distinguere assegnazione STORICA da assegnazione APERTA.
  // Dopo una richiesta integrazione RI_AMM→RI→DT→RI_AMM può rimanere valorizzato
  // ti_amm_assegnato_username dal ciclo precedente; se stato_TI_AMM è 0/null non deve
  // bloccare RI_AMM né impedire una nuova assegnazione.
  const esitoTiAmmNum = toNumOrNull(pickAttrCI(data, ['esito_TI_AMM', 'ESITO_TI_AMM']))
  const statoTiAmmNum = toNumOrNull(pickAttrCI(data, ['stato_TI_AMM', 'STATO_TI_AMM']))
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

  const canStartEsito =
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    canChooseWorkflowAction &&
    myStatoIsPresaInCarico &&
    !lockRZBecauseAssignedToTi &&
    !lockRiAmmBecauseAssignedToTiAmm &&
    effectivePresaNum === PRESA_IN_CARICO &&
    effectiveStatoNum === STATO_PRESA_IN_CARICO

  // Regola RZ: prima di assegnare a TI, può solo "Assegna TI" oppure "Respingi".
  const canStartIntegrazione =
    canStartEsito &&
    role !== 'RI_AMM' &&
    !(role === 'RZ' && (origineNum == null || origineNum === 1) && !hasTiAnyEvidence) &&
    role !== 'TI'

  const currentIntegrationRequester = getIntegrationRequesterForCurrentRole()

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
    hasTiAmmAssigned &&
    !riAmmSenderIsTecnico &&
    currentIntegrationRequester !== 'TI_AMM'

  const canStartIntegrazioneTecnica =
    canStartEsito &&
    role === 'RI_AMM'

  const canStartApprova =
    canStartEsito &&
    !(role === 'RZ' && (origineNum == null || origineNum === 1) && !hasTiAnyEvidence) &&
    !(role === 'RI_AMM' && !currentIntegrationRequester && esitoTiAmmNum !== ESITO_APPROVATA)

  const canStartRespingi =
    canStartEsito &&
    role !== 'TI' &&
    role !== 'RI' &&
    role !== 'TI_AMM'  // TI_AMM non può respingere

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
    if (dest === 'DA') return 'Direttore dell’Area Amministrativa'

    const meta = getRoutingMetaForRole(dest, opts)
    const areaCode = normalizeAreaLabel(meta.area || getPracticeAreaForRouting())
    const areaName = areaNameForRoleLabel(areaCode)

    if (dest === 'RI') return 'Responsabile Istruttoria'
    if (dest === 'TI') return 'Tecnico Istruttore'
    if (dest === 'DT') return areaName ? `Direttore dell’Area ${areaName}` : 'Direttore dell’Area Tecnica'
    if (dest === 'RZ') return 'Responsabile di Zona'
    return dest.replace(/_/g, ' ')
  }

  const getRoleLabelForForward = (destRole: string): string => {
    const dest = String(destRole || '').trim().toUpperCase()
    if (dest === 'DT' || dest === 'DA') return 'Direttore d’Area'
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
    role === 'DA' ? 'Approva atto amministrativo' :
    role === 'RI_AMM' && fwdDest === 'DA' ? 'Approva istruttoria amministrativa' :
    role === 'RI_AMM' ? `Trasmetti al ${fwdDestLabel}` :
    role === 'TI_AMM' ? `Trasmetti istruttoria amministrativa al ${getRoleLabelForMenu('RI_AMM')}` :
    'Approva'

  const approvaDoneLabel = currentIntegrationRequesterLabel
    ? `Trasmessa al ${currentIntegrationRequesterLabel}`
    : role === 'TI' ? `${praticaLabel === 'Rapporto tecnico' ? 'Rapporto tecnico' : 'Rilevazione'} trasmessa al ${getRoleLabelForMenu('RZ')}` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? `Integrazione validata e trasmessa al ${getRoleLabelForMenu('RI')}` : `Rilevazione approvata e trasmessa al ${getRoleLabelForMenu('RI')}`) :
    role === 'RI' ? `Istruttoria tecnica approvata e trasmessa al ${getRoleLabelForForward('DT')}` :
    role === 'DT' ? `Rapporto tecnico di rilevazione approvato e trasmesso al ${getRoleLabelForMenu('RI_AMM')}` :
    role === 'DA' ? `Verbale approvato e trasmesso al ${getRoleLabelForMenu('TI_AMM')}` :
    role === 'RI_AMM' && fwdDest === 'DA' ? `Istruttoria amministrativa approvata e trasmessa al ${getRoleLabelForForward('DA')}` :
    role === 'RI_AMM' ? `Trasmessa al ${fwdDestLabel}` :
    role === 'TI_AMM' ? `Istruttoria amministrativa trasmessa al ${getRoleLabelForMenu('RI_AMM')}` :
    'Approvata'

  const approvaConfirmLabel = currentIntegrationRequesterLabel
    ? `Trasmetti al ${currentIntegrationRequesterLabel}`
    : role === 'TI' ? `Trasmetti al ${getRoleLabelForMenu('RZ')}` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? 'Valida integrazione' : 'Approva rilevazione') :
    role === 'RI' ? 'Approva istruttoria tecnica' :
    role === 'DT' ? 'Approva rapporto tecnico' :
    role === 'DA' ? 'Approva atto amministrativo' :
    role === 'RI_AMM' && fwdDest === 'DA' ? 'Approva istruttoria amministrativa' :
    role === 'RI_AMM' ? `Trasmetti al ${fwdDestLabel}` :
    role === 'TI_AMM' ? `Trasmetti al ${getRoleLabelForMenu('RI_AMM')}` :
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
    role === 'DA' ? 'Approva atto amministrativo' :
    role === 'RI_AMM' && fwdDest === 'DA' ? 'Approva istruttoria amministrativa' :
    role === 'RI_AMM' ? `Trasmetti al ${fwdDestLabel}` :
    role === 'TI_AMM' ? `Trasmetti istruttoria amministrativa al ${getRoleLabelForMenu('RI_AMM')}` :
    approvaBtnLabel

  const approvaMenuDesc = currentIntegrationRequesterLabel
    ? `Invia la risposta al ${currentIntegrationRequesterLabel}.`
    : role === 'TI' ? `${praticaLabel === 'Rapporto tecnico' ? 'Invia il rapporto tecnico' : 'Invia la rilevazione'} al ${getRoleLabelForMenu('RZ')}.` :
    role === 'RZ' ? (praticaLabel === 'Rapporto tecnico' ? `Valida l’integrazione e trasmette il rapporto tecnico al ${getRoleLabelForMenu('RI')}.` : `Approva la rilevazione e la trasmette al ${getRoleLabelForMenu('RI')}.`) :
    role === 'RI' ? `Approva l’istruttoria tecnica e la trasmette al ${getRoleLabelForForward('DT')}.` :
    role === 'DT' ? `Approva il Rapporto tecnico di rilevazione e lo trasmette al ${getRoleLabelForMenu('RI_AMM')}.` :
    role === 'DA' ? `Approva l’atto amministrativo e lo trasmette al ${getRoleLabelForMenu('TI_AMM')}.` :
    role === 'RI_AMM' && fwdDest === 'DA' ? `Approva l’istruttoria amministrativa e la trasmette al ${getRoleLabelForForward('DA')}.` :
    role === 'TI_AMM' ? `Trasmette l’istruttoria amministrativa al ${getRoleLabelForMenu('RI_AMM')}.` :
    fwdDestLabel ? `Invia la pratica al ${fwdDestLabel}.` :
    'Avanza la pratica al passaggio successivo.'

  const rimandoTecnicaMenuDesc = 'Rimando all’istruttoria tecnica.'

  // RI_AMM non deve vedere contemporaneamente una trasmissione e una restituzione
  // verso lo stesso TI_AMM: per l'utente sarebbero due scelte indistinguibili.
  const hideRiAmmForwardToTiAmm = role === 'RI_AMM' && fwdDest === 'TI_AMM'

  const workflowMenuSections: WorkflowMenuSection[] = hasSel ? ([
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
          visible: !hideRiAmmForwardToTiAmm,
          color: (role === 'DT' || role === 'DA') ? buttonColors.approvaRapporto : buttonColors.approva,
          textColor: (role === 'DT' || role === 'DA') ? buttonColors.approvaRapportoText : buttonColors.approvaText
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
          visible: role !== 'TI' && role !== 'RI_AMM',
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
          visible: role !== 'RI_AMM' && role !== 'TI',
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
  const showTakeDirect = canStartTakeInCharge || !hasSel || !hasVisibleWorkflowMenuActions

  // NOTE: compare per integrazione, respinta e — Matrice_TI caso 1/b — anche per eliminazione (obbligatoria)
  const showNote = pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA' || pending === 'RESPINGI' || pending === 'ELIMINA'
  const noteEnabled = showNote && hasSel && !loading && !lockedByTransmit

  const noteTrim = String(noteDraft ?? '').trim()
  const reasonTrim = String(rejectReason ?? '').trim()
  const isAltro = /\baltro\b/i.test(reasonTrim)

  // obblighi:
  const noteIsRequired =
    (pending === 'INTEGRAZIONE') ||
    (pending === 'INTEGRAZIONE_TI_AMM') ||
    (pending === 'INTEGRAZIONE_TECNICA') ||
    (pending === 'RESPINGI' && isAltro) ||
    (pending === 'ELIMINA')  // Matrice_TI caso 1/b: note obbligatoria per eliminazione

  const reasonIsRequired = pending === 'RESPINGI'

  const reasonInvalid = reasonIsRequired && !reasonTrim
  const noteInvalid = noteIsRequired && !noteTrim

  const reasonReqErr = confirmAttempted && reasonInvalid
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
    setNoteDraft(noteOrigRef.current)
    setRejectReason('')
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
      const msgs: string[] = []
      const artGradoMap: Array<[string, string]> = [
        ['12', 'v_art12'], ['27', 'v_art27'], ['28', 'v_art28'], ['31', 'v_art31'], ['32', 'v_art32'],
        ['33', 'v_art33'], ['34', 'v_art34'], ['35', 'v_art35'], ['36', 'v_art36'], ['37', 'v_art37']
      ]
      const gradi = parseGradiViolazioniForRapporto(pickAttrCI(data, ['gradi_violazioni', 'GRADI_VIOLAZIONI']))
      const norma3Selected = new Set(String(pickAttrCI(data, ['norma_violata3', 'NORMA_VIOLATA3']) || '').split(/\s+/).filter(Boolean))
      const missingGradi: string[] = []
      for (const [art, field] of artGradoMap) {
        const v = pickAttrCI(data, [field, field.toUpperCase()])
        const selected = v === 1 || v === '1' || v === true || norma3Selected.has(`Art${art}`)
        if (selected && !/^[1-4]$/.test(String(gradi[art] || ''))) missingGradi.push(`Art. ${art}`)
      }
      if (missingGradi.length > 0) {
        msgs.push(`Impossibile trasmettere: il grado di gravità è obbligatorio per ${missingGradi.join(', ')}. Accedere alla maschera di modifica e impostare i gradi di gravità.`)
      }
      const tipoAbuso = String(pickAttrCI(data, ['tipo_abuso', 'TIPO_ABUSO']) || '').toLowerCase()
      if (tipoAbuso === 'parziale' || tipoAbuso === 'totale') {
        const occ = pickAttrCI(data, ['occorrenza', 'OCCORRENZA'])
        if (String(occ ?? '').trim() !== '1' && String(occ ?? '').trim() !== '2') {
          msgs.push("Impossibile trasmettere: per l'Art. 15 è obbligatorio specificare l'occorrenza. Accedere alla maschera di modifica e impostare il valore.")
        }
      }
      if (msgs.length > 0) {
        setDenyPopupMessages(msgs)
        return
      }
    }

    if (!opts?.keepActionsMenuOpen) setActionsMenuOpen(false)
    setPending(p)
    setMsg(null)
    setConfirmAttempted(false)
    setRejectReason('')
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
      sessionStorage.setItem('GII_RESTORE_SELECTION_AFTER_EDIT', JSON.stringify({
        oid: Number(oid),
        layerUrl,
        idFieldName,
        source,
        ts: Date.now()
      }))
    } catch {}
  }, [active, hasSel, idFieldNameFromSel, oid])

  const markAfterWorkflowListNavigation = React.useCallback((source = 'workflow') => {
    try {
      if (!hasSel || oid == null || !Number.isFinite(Number(oid))) return
      sessionStorage.setItem('GII_AFTER_WORKFLOW_NAV', JSON.stringify({
        oid: Number(oid),
        source,
        targetRoleTab: 'attesa_altri',
        ts: Date.now()
      }))
    } catch {}
  }, [hasSel, oid])

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

    clearRuntimeSelection(reason)
    setLocalData(null)
  }

  const saveWithWorkflowLog = async (
    attributesIn: Record<string, any>,
    okText: string,
    logOpts: { eventoChiusura: string, ruoloDestinatario?: string, utenteDestinatario?: string, noteChiusura?: string, fase?: string }
  ) => {
    // Le azioni di workflow possono lasciare il rapporto visibile nella scheda corrente
    // (es. tab "Tutte le pratiche") oppure farlo uscire dalla coda corrente
    // (es. tab "In attesa mia" dopo una trasmissione).
    // Registriamo solo l'intenzione di ripristino: sarà l'elenco a ripristinare
    // la selezione esclusivamente se il record è ancora visibile nella scheda attiva.
    markRestoreSelectionAfterAction(String(logOpts?.eventoChiusura || 'workflow'))
    if (logOpts?.ruoloDestinatario) {
      // Dopo una trasmissione/rimando/assegnazione l'oggetto esce normalmente
      // da "In attesa mia". L'elenco, se l'utente era in quella scheda,
      // passerà a "In attesa di altri" e manterrà la selezione sullo stesso record.
      markAfterWorkflowListNavigation(String(logOpts?.eventoChiusura || 'workflow'))
    }
    const auditDelta = buildWorkflowActionAuditDelta(attributesIn)
    try {
      await runApplyEdits(attributesIn, okText, { deferRefresh: true, keepLoading: true })
      await closeCycleLog({ ...logOpts, auditOldMap: auditDelta.oldMap, auditNewMap: auditDelta.newMap })
      await deleteCurrentActivityForCurrentRole()
      if (logOpts?.ruoloDestinatario) await upsertCurrentActivityForDest(logOpts, attributesIn)
      await refreshAfterWorkflowSave('azioni-post-log')
    } finally {
      setLoading(false)
    }
  }

  const runApplyEdits = async (attributesIn: Record<string, any>, okText: string, options?: RunApplyEditsOptions) => {
    if (!ds) throw new Error('DataSource non disponibile.')
    if (!hasSel || oid == null) throw new Error('Selezione non valida.')

    const startKey = selectionKeyRef.current
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
    } catch (e) {
      setLoading(false)
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

      markRestoreSelectionAfterAction('presa-in-carico')
      const cycleContextBeforeSave = await getCurrentCycleContextAsync()
      await runApplyEdits(upd, 'Presa in carico salvata.', { deferRefresh: true, keepLoading: true })
      await openCycleLog({ eventoApertura: 'PRESA_IN_CARICO', fase: role, context: cycleContextBeforeSave, forceNew: true })
      await deleteCurrentActivityForCurrentRole()
      await refreshAfterWorkflowSave('azioni-presa-in-carico-post-log')
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
        ti_amm_assegnato_da: riAmmUser
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
          // verificata da RI_AMM e approvata dal DA. I dati sostanziali del
          // ricorso/CdA restano storicizzati nel record e nel log.
          const fStatoDa = pick('stato_DA')
          const fDtStatoDa = pick('dt_stato_DA')
          const fDtPresaDa = pick('dt_presa_in_carico_DA')
          const fEsitoDa = pick('esito_DA')
          const fDtEsitoDa = pick('dt_esito_DA')
          const fChiusuraIl = pick('istruttoria_amm_chiusa_il')
          const fChiusuraDa = pick('istruttoria_amm_chiusa_da')
          const fPdfIl = pick('verbale_pdf_generato_il')
          const fPdfDa = pick('verbale_pdf_generato_da')
          const fDefEsito = pick('definizione_pratica_esito')
          const fDefData = pick('definizione_pratica_data')
          const fDefDa = pick('definizione_pratica_da')
          const fDefNote = pick('definizione_pratica_note')

          if (fStatoDa) upd[fStatoDa] = 0
          if (fDtStatoDa) upd[fDtStatoDa] = null
          if (fDtPresaDa) upd[fDtPresaDa] = null
          if (fEsitoDa) upd[fEsitoDa] = null
          if (fDtEsitoDa) upd[fDtEsitoDa] = null
          if (fChiusuraIl) upd[fChiusuraIl] = null
          if (fChiusuraDa) upd[fChiusuraDa] = null
          if (fPdfIl) upd[fPdfIl] = null
          if (fPdfDa) upd[fPdfDa] = null
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

      const noteInvioTiAmm = isRientroTecnicoDaDt
        ? 'Invio al Tecnico Istruttore amministrativo dopo rientro da integrazione tecnica.'
        : 'Invio al Tecnico Istruttore amministrativo.'
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
    if (!noteTrim) return
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
          if (fEsito) upd[fEsito] = null
          if (fDtEsito) upd[fDtEsito] = null
        } catch {}
      }

      if (ruoloDest) {
        addGiiRoutingFields(upd, ruoloDest, 'INTEGRAZIONE', { technicalIntegration: pending === 'INTEGRAZIONE_TECNICA' })
      }

      if (ruoloDest) {
        const successMsg = pending === 'INTEGRAZIONE' ? 'Pratica rimandata per integrazione.' : 'Integrazione richiesta salvata.'
        await saveWithWorkflowLog(upd, successMsg, { eventoChiusura: 'INTEGRAZIONE_RICHIESTA', ruoloDestinatario: ruoloDest, utenteDestinatario: resolveDestUser(ruoloDest), noteChiusura: noteTrim, fase: role })
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

      if (role === 'DA' && esito === ESITO_APPROVATA) {
        const liveAttrs = await queryCurrentRecordAttrs()
        const sourceAttrs = liveAttrs || data

        // La numerazione V-progressivo/anno è riservata ai verbali amministrativi
        // e ai verbali misti. Le richieste autonome di rimborso/risarcimento
        // diventano definitive con l'esito del DA, senza consumare un numero V.
        if (attoAmmPrevedeVerbale(sourceAttrs)) {
          const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
          const fNumeroVerbale = getSchemaFieldNameCI(schemaFields, 'numero_verbale')
          const fDataVerbale = getSchemaFieldNameCI(schemaFields, 'data_verbale')
          if (!fNumeroVerbale || !fDataVerbale) {
            throw new Error('Impossibile approvare il verbale: campi numero_verbale/data_verbale non presenti nella fonte dati.')
          }

          const currentNumeroVerbale = String(pickAttrCI(sourceAttrs, ['numero_verbale', fNumeroVerbale]) || '').trim()
          const currentDataVerbale = pickAttrCI(sourceAttrs, ['data_verbale', fDataVerbale])

          const yearBase = (currentDataVerbale != null && currentDataVerbale !== '') ? currentDataVerbale : now
          const parsedYearDate = new Date(typeof yearBase === 'number' ? yearBase : (Number(yearBase) || String(yearBase)))
          const annoVerbale = Number.isNaN(parsedYearDate.getTime()) ? new Date(now).getFullYear() : parsedYearDate.getFullYear()

          if (currentNumeroVerbale) {
            const parsedProgressivo = parseNumeroAttoProgressivo(currentNumeroVerbale, 'V', annoVerbale, true)
            if (parsedProgressivo == null) {
              throw new Error(`Numero verbale già presente ma non conforme al formato V-progressivo/anno: ${currentNumeroVerbale}`)
            }
          } else {
            upd[fNumeroVerbale] = await queryNextNumeroAtto('V', annoVerbale, fNumeroVerbale, true)
          }
          if (currentDataVerbale == null || currentDataVerbale === '') {
            upd[fDataVerbale] = now
          }
        }
      }

      const integRequester = esito === ESITO_APPROVATA ? getIntegrationRequesterForCurrentRole() : ''
      const ruoloDest = esito === ESITO_APPROVATA ? (integRequester || getNextRoleForForward()) : ''
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
          if (fEsito) upd[fEsito] = null
          if (fDtEsito) upd[fDtEsito] = null

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

      // La risposta a integrazione è solo quella diretta al ruolo che ha chiesto
      // l'integrazione. Non usare una scansione globale degli esiti=1, perché dopo
      // molti avanti/indietro possono rimanere stati storici non pertinenti.
      const wasIntegResponse = Boolean(integRequester)

      const logOpts = esito === ESITO_APPROVATA
        ? (role === 'DA'
            // DA approva la sanzione → destinatario è TI_AMM
            ? { eventoChiusura: 'SANZIONE_APPROVATA', ruoloDestinatario: 'TI_AMM', utenteDestinatario: resolveDestUser('TI_AMM'), fase: role }
            : role === 'DT'
              // DT approva il rapporto tecnico → destinatario è RI
              ? { eventoChiusura: 'RAPPORTO_APPROVATO', ruoloDestinatario: ruoloDest, utenteDestinatario: resolveDestUser(ruoloDest), fase: role }
              : {
                  eventoChiusura: ruoloDest
                    ? (wasIntegResponse ? 'INTEGRAZIONE_TRASMESSA' : 'ISTRUTTORIA_TRASMESSA')
                    : 'ISTRUTTORIA_TRASMESSA',
                  ruoloDestinatario: ruoloDest,
                  utenteDestinatario: resolveDestUser(ruoloDest),
                  fase: role
                })
        : null

      if (logOpts) {
        await saveWithWorkflowLog(upd, `Esito salvato: ${label}.`, logOpts)
      } else {
        await runApplyEdits(upd, `Esito salvato: ${label}.`)
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
    if (noteIsRequired && !noteTrim) return
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

      await saveWithWorkflowLog(upd, 'Esito salvato: Respinta.', { eventoChiusura: 'RESPINTA', noteChiusura: finalNote, fase: role })
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
    return { fontSize: ui.statusFontSize, color: isError ? '#b42318' : '#6b7280' }
  }


  const confirmBtnStyle: React.CSSProperties = {
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid #15803d',
    background: '#16a34a',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: loading ? 'not-allowed' : 'pointer'
  }

  const cancelBtnStyle: React.CSSProperties = {
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid #b42318',
    background: '#dc2626',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
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
    role === 'DA' ? 'Approvazione atto amministrativo' :
    role === 'RI_AMM' && fwdDest === 'DA' ? 'Approvazione istruttoria amministrativa' :
    role === 'RI_AMM' ? `Trasmissione al ${fwdDestLabel}` :
    role === 'TI_AMM' ? `Trasmissione al ${getRoleLabelForMenu('RI_AMM')}` :
    'Avanzamento pratica'

  const pendingTitle = pending === 'TAKE'
    ? 'Presa in carico'
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
    role === 'DA' ? `L’atto amministrativo verrà approvato e trasmesso al ${getRoleLabelForMenu('TI_AMM')}.` :
    role === 'RI_AMM' && fwdDest === 'DA' ? `L’istruttoria amministrativa verrà approvata e trasmessa al ${getRoleLabelForForward('DA')}.` :
    role === 'RI_AMM' ? `L’istruttoria amministrativa verrà trasmessa al ${fwdDestLabel}.` :
    role === 'TI_AMM' ? `L’istruttoria amministrativa verrà trasmessa al ${getRoleLabelForMenu('RI_AMM')}.` :
    `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbTrasmessa} al passaggio successivo.`

  const integrazioneActionDesc = pendingRimandoTargetLabel
    ? `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbRimandata} al ${pendingRimandoTargetLabel}.`
    : `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbRimandata} per integrazione.`

  const pendingTheme: Record<string, PendingTheme> = {
    TAKE:           { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: praticaLabel === 'Rapporto tecnico' ? 'Il rapporto tecnico verrà preso in carico.' : 'La rilevazione verrà presa in carico.' },
    ASSEGNA_TI:     { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbAssegnata} al ${getRoleLabelForMenu('TI')} selezionato.` },
    ASSEGNA_TI_AMM: { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: riaperturaWorkflowDaAvviare
      ? `Verrà aperto il nuovo ciclo di riapertura n. ${riaperturaAmmNumero} e la pratica sarà assegnata al ${getRoleLabelForMenu('TI_AMM')} selezionato.`
      : `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbAssegnata} al ${getRoleLabelForMenu('TI_AMM')} selezionato.` },
    INVIA_TI_AMM: { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: `L’istruttoria amministrativa verrà trasmessa al ${getRoleLabelForMenu('TI_AMM')} già assegnato.` },
    RESTITUISCI_TI_AMM: { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: `L’istruttoria amministrativa verrà restituita al ${getRoleLabelForMenu('TI_AMM')} già assegnato.` },
    APPROVA:        { icon: '✓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: approvaActionDesc },
    INTEGRAZIONE:   { icon: '↩', color: '#b45309', bg: '#fffbeb', border: '#fde68a', buttonBg: '#d97706', buttonBorder: '#b45309', desc: integrazioneActionDesc },
    INTEGRAZIONE_TI_AMM: { icon: '↩', color: '#b45309', bg: '#fffbeb', border: '#fde68a', buttonBg: '#d97706', buttonBorder: '#b45309', desc: `L’istruttoria amministrativa verrà rimandata al ${getRoleLabelForMenu('TI_AMM')} assegnato.` },
    INTEGRAZIONE_TECNICA: { icon: '↩', color: '#b45309', bg: '#fffbeb', border: '#fde68a', buttonBg: '#d97706', buttonBorder: '#b45309', desc: `L’istruttoria amministrativa verrà rimandata al ${rimandoTecnicaTargetLabel}.` },
    RESPINGI:       { icon: '✕', color: '#b42318', bg: '#fef2f2', border: '#fecaca', buttonBg: '#dc2626', buttonBorder: '#b42318', desc: `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbRespinta}.` },
    ELIMINA:        { icon: '✕', color: '#b42318', bg: '#fef2f2', border: '#fecaca', buttonBg: '#dc2626', buttonBorder: '#b42318', desc: `${subjectArticle} ${subjectNameLower} verrà ${subjectVerbArchiviata} e non sarà più visibile nell'elenco.` },
  }
  const theme = pending ? (pendingTheme[pending] ?? { icon: '●', color: '#2f6fed', bg: '#eff6ff', border: '#bfdbfe', buttonBg: '#2563eb', buttonBorder: '#1d4ed8', desc: '' }) : pendingTheme.TAKE
  const operationProgressBox = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', marginTop: 4, color: '#374151', fontSize: 13, fontWeight: 700 }}>
      <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #cbd5e1', borderTopColor: theme.color, display: 'inline-block', animation: 'gii-spin 0.8s linear infinite' }} />
      <span>Operazione in corso…</span>
    </div>
  )

  const selectedWorkflowMenuItem = pending ? (workflowMenuEnabledItems.find(item => item.key === pending) || null) : null
  const actionMenuTheme = pending ? theme : pendingTheme.TAKE
  const selectedWorkflowMenuKey = selectedWorkflowMenuItem?.key || ''
  const isWorkflowRimandoPending = pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA'
  const workflowNoteLabel = isWorkflowRimandoPending ? 'Motivazione del rimando' : 'Note'
  const workflowNotePlaceholder = isWorkflowRimandoPending
    ? 'Indicare la motivazione del rimando…'
    : (noteIsRequired ? 'Specifica il motivo…' : 'Nota facoltativa…')

  const closeWorkflowMenu = () => {
    if (loading) return
    setActionsMenuOpen(false)
    setWorkflowSubmitting(false)
    setPending(null)
    setLoading(false)
    setMsg(null)
    setConfirmAttempted(false)
    setNoteDraft(noteOrigRef.current)
    setRejectReason('')
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
    setNoteDraft(noteOrigRef.current)
    setRejectReason('')
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
    if (pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA') return !!noteTrim
    if (pending === 'RESPINGI') return !!reasonTrim && (!isAltro || !!noteTrim)
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
            <div style={{ fontWeight: 800, fontSize: 16, color: actionMenuTheme.color, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: 20, flex: '0 0 auto' }}>{pending ? actionMenuTheme.icon : '✓'}</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: '1 1 auto' }}>Gestisci istruttoria</span>
            </div>
            {hasSel && oid != null && (
              <div style={{ marginTop: 5, fontSize: 13, color: '#4b5563' }}>
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
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                {actionMenuTheme.desc}
              </div>
            )}
            {operationProgressBox}
          </React.Fragment>
        ) : workflowMenuEnabledItems.length > 0 ? (
          <React.Fragment>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Azione</div>
              <select
                value={selectedWorkflowMenuKey}
                onChange={(e) => {
                  const raw = String(e.target.value || '')
                  if (!raw) {
                    setPending(null)
                    setMsg(null)
                    setConfirmAttempted(false)
                    setNoteDraft(noteOrigRef.current)
                    setRejectReason('')
                    setTiSelected('')
                    setTiAmmSelected('')
                    setTiLoadErr('')
                    setTiAmmLoadErr('')
                    return
                  }
                  const key = raw as Exclude<Pending, null | 'TAKE'>
                  const item = workflowMenuEnabledItems.find(i => i.key === key)
                  if (item) startAction(item.key, { keepActionsMenuOpen: true })
                }}
                disabled={loading}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', outline: 'none', fontSize: 13, background: '#fff' }}
              >
                <option value=''>— Seleziona —</option>
                {workflowMenuEnabledItems.map(item => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </div>

            {pending && actionMenuTheme.desc && (
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, padding: 10, background: actionMenuTheme.bg, border: `1px solid ${actionMenuTheme.border}`, borderRadius: 8 }}>
                {actionMenuTheme.desc}
              </div>
            )}

            {msg && msg.kind === 'err' && (
              <div style={{ fontWeight: 500, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#7f1d1d', fontSize: 13 }}>
                {msg.text}
              </div>
            )}

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
                  onChange={(v) => { setRejectReason(String(v ?? '')); if (confirmAttempted) setConfirmAttempted(false) }}
                  evenBg='#ffffff'
                  oddBg='#ffffff'
                  borderColor={ui.reasonsRowBorderColor}
                  borderWidth={ui.reasonsRowBorderWidth}
                  radius={ui.reasonsRowRadius}
                  fontSize={ui.statusFontSize}
                  isError={reasonReqErr}
                />
              </div>
            )}

            {pending === 'ASSEGNA_TI' && role === 'RZ' && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Tecnico istruttore</div>
                  <div style={labelReqStyle(true, tiReqErr)}>Scelta obbligatoria</div>
                </div>
                <select
                  value={tiSelected}
                  onChange={(e) => { setTiSelected(e.target.value); if (confirmAttempted) setConfirmAttempted(false) }}
                  disabled={loading}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${tiReqErr ? '#dc2626' : 'rgba(0,0,0,0.15)'}`, outline: 'none' }}
                >
                  <option value=''>— Seleziona Tecnico Istruttore —</option>
                  {tiOptions.map(o => (
                    <option key={o.username} value={o.username}>{(o.fullName || o.username)} ({o.username})</option>
                  ))}
                </select>
                {!tiLoading && !tiLoadErr && tiOptions.length === 0 && <div style={{ fontSize: 12, opacity: 0.75 }}>Nessun Tecnico Istruttore trovato.</div>}
                {!!tiLoadErr && <div style={{ fontSize: 12, color: '#dc2626' }}>Errore elenco Tecnici Istruttori: {tiLoadErr}</div>}
              </div>
            )}

            {pending === 'ASSEGNA_TI_AMM' && role === 'RI_AMM' && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Tecnico Istruttore amministrativo</div>
                  <div style={labelReqStyle(true, tiAmmReqErr)}>Scelta obbligatoria</div>
                </div>
                <select
                  value={tiAmmSelected}
                  onChange={(e) => { setTiAmmSelected(e.target.value); if (confirmAttempted) setConfirmAttempted(false) }}
                  disabled={loading}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${tiAmmReqErr ? '#dc2626' : 'rgba(0,0,0,0.15)'}`, outline: 'none' }}
                >
                  <option value=''>— Seleziona Tecnico Istruttore amministrativo —</option>
                  {tiAmmOptions.map(o => (
                    <option key={o.username} value={o.username}>{(o.fullName || o.username)} ({o.username})</option>
                  ))}
                </select>
                {!tiAmmLoading && !tiAmmLoadErr && tiAmmOptions.length === 0 && <div style={{ fontSize: 12, opacity: 0.75 }}>Nessun Tecnico Istruttore amministrativo trovato.</div>}
                {!!tiAmmLoadErr && <div style={{ fontSize: 12, color: '#dc2626' }}>Errore elenco Tecnici Istruttori amministrativi: {tiAmmLoadErr}</div>}
              </div>
            )}

            {showNote && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>{workflowNoteLabel}</div>
                  {noteIsRequired && <div style={labelReqStyle(true, noteReqErr)}>(obbligatoria)</div>}
                </div>
                <textarea
                  ref={noteRef}
                  value={noteDraft}
                  onChange={(e) => { const v = String((e.target as HTMLTextAreaElement).value ?? ''); setNoteDraft(v); autoResizeNote(e.target as HTMLTextAreaElement); if (confirmAttempted) setConfirmAttempted(false) }}
                  placeholder={workflowNotePlaceholder}
                  style={{ width: '100%', minHeight: NOTE_MIN_H, maxHeight: NOTE_MAX_H, overflowY: 'hidden', resize: 'none', padding: '8px 10px', borderRadius: 8, border: noteReqErr ? '1px solid #dc2626' : '1px solid rgba(0,0,0,0.20)', fontSize: ui.statusFontSize, outline: 'none', boxSizing: 'border-box' }}
                  disabled={!noteEnabled}
                />
              </div>
            )}

            {(loading || workflowSubmitting) ? operationProgressBox : (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type='button' onClick={closeWorkflowMenu}
                  style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Annulla
                </button>
                <button type='button' onClick={() => { void confirmWorkflowAction() }} disabled={!canConfirmWorkflowAction}
                  style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${actionMenuTheme.buttonBorder}`, background: actionMenuTheme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: canConfirmWorkflowAction ? 'pointer' : 'not-allowed', opacity: canConfirmWorkflowAction ? 1 : 0.6 }}>
                  Conferma
                </button>
              </div>
            )}
          </React.Fragment>
        ) : (
          <div style={{ fontSize: 13, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
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
        style={{ width: 'min(92vw, 560px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', border: '1px solid rgba(0,0,0,0.08)', padding: 18, display: 'grid', gap: 12, position: 'relative', zIndex: 2147483647 }}
        onClick={(e) => { e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
      >
        {/* Titolo colorato con icona + banda chiara */}
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2, color: theme.color, display: 'flex', alignItems: 'center', gap: 8, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px 12px' }}>
          <span style={{ fontSize: 20, flex: '0 0 auto' }}>{theme.icon}</span>
          <span style={{ whiteSpace: 'nowrap' }}>{pendingTitle}</span>
        </div>

        {/* Box numero rilevazione / rapporto tecnico */}
        {hasSel && oid != null && (
          <div style={{ fontWeight: 600, color: '#1f2937', padding: 10, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: 13 }}>
            {praticaLabel}: <span style={{ color: theme.color, fontSize: 14, fontFamily: 'monospace' }}>{praticaCode}</span>
          </div>
        )}

        {/* Descrizione azione */}
        {theme.desc && (
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{theme.desc}</div>
        )}

        {/* Errore */}
        {msg && msg.kind === 'err' && (
          <div style={{ fontWeight: 500, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#7f1d1d', fontSize: 13 }}>
            {msg.text}
          </div>
        )}

        {/* Dropdown motivazione respinta */}
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
              onChange={(v) => { setRejectReason(String(v ?? '')); if (confirmAttempted) setConfirmAttempted(false) }}
              evenBg='#ffffff'
              oddBg='#ffffff'
              borderColor={ui.reasonsRowBorderColor}
              borderWidth={ui.reasonsRowBorderWidth}
              radius={ui.reasonsRowRadius}
              fontSize={ui.statusFontSize}
              isError={reasonReqErr}
            />
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
              style={{ width: 'auto', minWidth: 280, maxWidth: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${tiReqErr ? '#dc2626' : 'rgba(0,0,0,0.15)'}`, outline: 'none' }}
            >
              <option value=''>— Seleziona Tecnico Istruttore —</option>
              {tiOptions.map(o => (
                <option key={o.username} value={o.username}>{(o.fullName || o.username)} ({o.username})</option>
              ))}
            </select>
            {!tiLoading && !tiLoadErr && tiOptions.length === 0 && <div style={{ fontSize: 12, opacity: 0.75 }}>Nessun Tecnico Istruttore trovato.</div>}
            {!!tiLoadErr && <div style={{ fontSize: 12, color: '#dc2626' }}>Errore elenco Tecnici Istruttori: {tiLoadErr}</div>}
          </div>
        )}

        {pending === 'ASSEGNA_TI_AMM' && role === 'RI_AMM' && (
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={labelReqStyle(true, tiAmmReqErr)}>Scelta obbligatoria</div>
            <select
              value={tiAmmSelected}
              onChange={(e) => { setTiAmmSelected(e.target.value); if (confirmAttempted) setConfirmAttempted(false) }}
              disabled={loading}
              style={{ width: 'auto', minWidth: 280, maxWidth: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${tiAmmReqErr ? '#dc2626' : 'rgba(0,0,0,0.15)'}`, outline: 'none' }}
            >
              <option value=''>— Seleziona Tecnico Istruttore amministrativo —</option>
              {tiAmmOptions.map(o => (
                <option key={o.username} value={o.username}>{(o.fullName || o.username)} ({o.username})</option>
              ))}
            </select>
            {!tiAmmLoading && !tiAmmLoadErr && tiAmmOptions.length === 0 && <div style={{ fontSize: 12, opacity: 0.75 }}>Nessun Tecnico Istruttore amministrativo trovato.</div>}
            {!!tiAmmLoadErr && <div style={{ fontSize: 12, color: '#dc2626' }}>Errore elenco Tecnici Istruttori amministrativi: {tiAmmLoadErr}</div>}
          </div>
        )}

        {/* Textarea note */}
        {showNote && (
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>Note</div>
              {(pending === 'INTEGRAZIONE' || (pending === 'RESPINGI' && noteIsRequired) || pending === 'ELIMINA') && (
                <div style={labelReqStyle(true, noteReqErr)}>(obbligatoria)</div>
              )}
            </div>
            <textarea
              ref={noteRef}
              value={noteDraft}
              onChange={(e) => { const v = String((e.target as HTMLTextAreaElement).value ?? ''); setNoteDraft(v); autoResizeNote(e.target as HTMLTextAreaElement) }}
              placeholder={(pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA') ? 'Scrivi la richiesta di integrazione…' : (noteIsRequired ? 'Specifica il motivo (Altro)…' : 'Nota facoltativa…')}
              style={{ width: '100%', minHeight: NOTE_MIN_H, maxHeight: NOTE_MAX_H, overflowY: 'hidden', resize: 'none', padding: '8px 10px', borderRadius: 8, border: noteReqErr ? '1px solid #dc2626' : '1px solid rgba(0,0,0,0.20)', fontSize: ui.statusFontSize, outline: 'none', boxSizing: 'border-box' }}
              disabled={!noteEnabled}
            />
          </div>
        )}

        {/* Bottoni */}
        {loading ? operationProgressBox : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type='button' onClick={onAnnulla}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Annulla
            </button>
            {pending === 'TAKE' && <button type='button' onClick={onConfirmTakeInCharge} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Conferma</button>}
            {pending === 'ASSEGNA_TI' && <button type='button' onClick={onConfirmAssegnaTi} disabled={!tiSelected} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: !tiSelected ? 'not-allowed' : 'pointer', opacity: !tiSelected ? 0.6 : 1 }}>Conferma</button>}
            {pending === 'ASSEGNA_TI_AMM' && <button type='button' onClick={onConfirmAssegnaTiAmm} disabled={!tiAmmSelected} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: !tiAmmSelected ? 'not-allowed' : 'pointer', opacity: !tiAmmSelected ? 0.6 : 1 }}>Conferma</button>}
            {(pending === 'INVIA_TI_AMM' || pending === 'RESTITUISCI_TI_AMM') && <button type='button' onClick={onConfirmRestituisciTiAmm} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Conferma</button>}
            {(pending === 'INTEGRAZIONE' || pending === 'INTEGRAZIONE_TI_AMM' || pending === 'INTEGRAZIONE_TECNICA') && <button type='button' onClick={onConfirmIntegrazione} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Conferma</button>}
            {pending === 'APPROVA' && <button type='button' onClick={() => { void confirmApprovaWithNotaSpeseWarning() }} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Conferma</button>}
            {pending === 'RESPINGI' && <button type='button' onClick={onConfirmRespinta} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Conferma</button>}
            {pending === 'ELIMINA' && <button type='button' onClick={onConfirmElimina} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${theme.buttonBorder}`, background: theme.buttonBg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Conferma</button>}
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
        style={{ width: 'min(92vw, 640px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.30)', border: '1px solid #dc2626', padding: 18, display: 'grid', gap: 14 }}
        onClick={(e) => { e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
      >
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Nota spese incompleta</div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45 }}>
            Non è possibile procedere con l’inoltro perché sono presenti righe di nota spese senza quantità o con quantità pari a zero.
          </div>
        </div>
        <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 5, fontSize: 13, color: '#374151' }}>
          {incompleteNotaSpeseWarning.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
        <div style={{ fontSize: 13, color: '#4b5563' }}>Completare le quantità oppure eliminare le righe non necessarie prima dell’inoltro.</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type='button'
            onClick={() => setIncompleteNotaSpeseWarning([])}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #dc2626', background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
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
        style={{ width: 'min(92vw, 620px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.30)', border: '1px solid #f59e0b', padding: 18, display: 'grid', gap: 14 }}
        onClick={(e) => { e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
      >
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Attenzione</div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45 }}>
            Una o più violazioni selezionate prevedono la possibilità di nota spese, ma risultano prive di importo.
          </div>
        </div>
        <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 5, fontSize: 13, color: '#374151' }}>
          {zeroNotaSpeseWarning.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
        <div style={{ fontSize: 13, color: '#4b5563' }}>Confermare comunque la trasmissione?</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type='button'
            onClick={() => setZeroNotaSpeseWarning([])}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >Annulla</button>
          <button
            type='button'
            onClick={async () => {
              setZeroNotaSpeseWarning([])
              await onConfirmEsito(ESITO_APPROVATA, approvaDoneLabel)
              setActionsMenuOpen(false)
            }}
            disabled={loading}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #f97316', background: '#f97316', color: '#fff', fontWeight: 800, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1 }}
          >Conferma trasmissione</button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  const reportPreviewModal = previewOpen ? createPortal(
    <div
      data-gii-global-popup-root='1'
      style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(0,0,0,0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, pointerEvents: 'auto' }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <div
        role='dialog'
        aria-modal='true'
        data-gii-global-popup-dialog='1'
        style={{ width: 'calc(100vw - 28px)', height: 'calc(100vh - 28px)', maxWidth: 1920, maxHeight: 1200, borderRadius: 14, boxShadow: '0 20px 70px rgba(0,0,0,0.32)', overflow: 'hidden', position: 'relative', zIndex: 2147483647 }}
        onClick={(e) => { e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
      >
        <AnteprimaPdfViewer
          url={previewUrl}
          fileName={previewFileName}
          title='Anteprima rapporto'
          subtitle={hasSel && oid != null ? `${praticaCode} • ${previewFileName}` : previewFileName}
          loading={previewLoading}
          error={previewError}
          emptyText='Nessun dato disponibile per l&apos;anteprima.'
          onDownload={handleRapportoDownload}
          onClose={closeRapportoPreview}
        />
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

            {/* GRUPPO DESTRO — Modifica, Anteprima, Download */}
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

              {/* PULSANTE ANTEPRIMA PDF — sempre visibile, disabilitato senza selezione */}
              <button
                type='button'
                disabled={!canUseRapportoPdf}
                onClick={handleRapportoPreview}
                title={canUseRapportoPdf ? 'Anteprima rapporto (PDF)' : 'Anteprima non disponibile: selezionare un rapporto.'}
                style={{
                  width: ((ui?.btnPaddingY ?? 8) * 2) + (ui?.btnFontSize ?? 14) + 10,
                  height: ((ui?.btnPaddingY ?? 8) * 2) + (ui?.btnFontSize ?? 14) + 10,
                  padding: 0,
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  border: `2px solid ${canUseRapportoPdf ? '#2563eb' : '#e5e7eb'}`,
                  background: '#fff',
                  color: canUseRapportoPdf ? '#2563eb' : '#9ca3af',
                  cursor: canUseRapportoPdf ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width='24' height='24' viewBox='0 0 18 18' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
                  <path d='M16.5,8.9V3.1c0-.9-.7-1.7-1.7-1.7H3.2c-.9,0-1.7.7-1.7,1.7v11.6c0,.9.7,1.7,1.7,1.7h5.8'/>
                  <path d='M10.8,12.2l3.7,3.7c.5.5,1.1.7,1.6.2.5-.6.3-1-.3-1.5l-3.7-3.7'/>
                  <circle cx='9' cy='8.9' r='3.7'/>
                </svg>
              </button>

              {/* PULSANTE DOWNLOAD PDF — sempre visibile, disabilitato senza selezione */}
              <button
                type='button'
                disabled={!canUseRapportoPdf}
                onClick={handleRapportoDownload}
                title={canUseRapportoPdf ? 'Scarica rapporto (PDF)' : 'Download non disponibile: selezionare un rapporto.'}
                style={{
                  width: ((ui?.btnPaddingY ?? 8) * 2) + (ui?.btnFontSize ?? 14) + 10,
                  height: ((ui?.btnPaddingY ?? 8) * 2) + (ui?.btnFontSize ?? 14) + 10,
                  padding: 0,
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  border: `2px solid ${canUseRapportoPdf ? '#16a34a' : '#e5e7eb'}`,
                  background: '#fff',
                  color: canUseRapportoPdf ? '#16a34a' : '#9ca3af',
                  cursor: canUseRapportoPdf ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
              </button>
            </div>
          </div>
        )}

        {actionMenuModal}
        {pendingModal}
        {incompleteNotaSpeseWarningModal}
        {zeroNotaSpeseWarningModal}
        {reportPreviewModal}

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
              <div style={{ fontWeight: 800, fontSize: 16, color: '#b42318', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>⚠</span>
                <span>Validazione trasmissione</span>
              </div>
              {denyPopupMessages.map((m, i) => (
                <div key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
                  {m}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button type='button' onClick={() => setDenyPopupMessages([])} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.18)', background: '#b42318', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Chiudi
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


// ── Rapporto PDF — sostituzione placeholder nel template ────────────────────

const AREA_LABELS: Record<string, string> = {
  AGR: 'AGRARIA', TEC: 'TECNICA', AMM: 'AFFARI GENERALI E PROGRAMMAZIONE FINANZIARIA'
}
const SETTORE_LABELS: Record<string, string> = {
  D1: 'DISTRETTO 1 \u2013 SAN SPERATE',
  D2: 'DISTRETTO 2 \u2013 SERRAMANNA/PIMPISU',
  D3: 'DISTRETTO 3 \u2013 SAN GAVINO/VILLACIDRO',
  D4: 'DISTRETTO 4 \u2013 BASSO SULCIS',
  D5: 'DISTRETTO 5 \u2013 SENORB\u00CC',
  D6: 'DISTRETTO 6 \u2013 CIXERRI',
  DS: 'MANUTENZIONE OPERE DI DRENO E DI SCOLO',
  CR: 'CATASTO, RUOLI E SERVIZI TERRITORIALI'
}


function firstMeaningfulValue (...vals: any[]): any {
  for (const v of vals) {
    if (v == null) continue
    if (typeof v === 'string') {
      if (v.trim() !== '') return v
      continue
    }
    return v
  }
  return undefined
}

function formatDateIt (v: any): string {
  if (!v) return ''
  try {
    const d = new Date(typeof v === 'number' ? v : String(v))
    if (isNaN(d.getTime())) return String(v)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return String(v) }
}

function formatTimeIt (v: any): string {
  if (!v) return ''
  try {
    const raw = (typeof v === 'string' && /^\d{10,13}$/.test(v.trim())) ? Number(v) : v
    const d = new Date(typeof raw === 'number' ? raw : String(raw))
    if (isNaN(d.getTime())) return ''

    // ArcGIS conserva i campi Date senza ora come mezzanotte UTC.
    // In Italia, con l'ora legale, quella mezzanotte viene visualizzata come 02:00:
    // non è un'ora reale della rilevazione e non va stampata nel rapporto.
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) return ''

    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function esc (s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtNum (v: any): string {
  if (v == null || v === '') return ''
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString('it-IT', { maximumFractionDigits: 2 })
}

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

function gradoViolazioneForRapporto (map: Record<string, string>, art: string): string {
  return map[String(art).replace(/^0+/, '')] || ''
}

function occorrenzaArt15ForRapporto (raw: any, on: boolean): string {
  if (!on) return ''
  const v = String(raw ?? '').trim()
  if (v === '1') return 'Prima contestazione'
  if (v === '2') return 'Recidiva'
  return ''
}

function pickRapportoAttrCI (obj: any, keys: string[]): any {
  if (!obj) return undefined
  const map: Record<string, string> = {}
  try {
    Object.keys(obj).forEach(k => { map[String(k).toLowerCase()] = k })
  } catch {}
  for (const k of keys) {
    const direct = (obj as any)[k]
    if (direct !== undefined && direct !== null && direct !== '') return direct
    const realKey = map[String(k).toLowerCase()]
    if (realKey) {
      const v = (obj as any)[realKey]
      if (v !== undefined && v !== null && v !== '') return v
    }
  }
  return undefined
}

function art15AttivoForRapporto (data: any): boolean {
  const d = data || {}
  const tipoAbuso = String(pickRapportoAttrCI(d, ['tipo_abuso', 'TIPO_ABUSO']) ?? '').trim().toLowerCase()
  if (tipoAbuso === 'parziale' || tipoAbuso === 'totale') return true
  const norma15Parziale = pickRapportoAttrCI(d, ['norma15_parziale', 'NORMA15_PARZIALE'])
  const norma15Totale = pickRapportoAttrCI(d, ['norma15_totale', 'NORMA15_TOTALE'])
  return String(norma15Parziale ?? '').trim() !== '' || String(norma15Totale ?? '').trim() !== ''
}

function isRapportoRespintoForPdf (data: any): boolean {
  const d = data || {}

  // La filigrana RESPINTO deve dipendere dall'esito/evento conclusivo,
  // non dagli stati operativi usati anche per rimandi o integrazioni.
  const esitoVals = [
    pickRapportoAttrCI(d, ['esito_rz', 'ESITO_RZ']),
    pickRapportoAttrCI(d, ['esito_dt', 'ESITO_DT'])
  ].map(v => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  })

  if (esitoVals.includes(ESITO_RESPINTA)) return true

  const txtVals = [
    pickRapportoAttrCI(d, ['esito_rz_label', 'ESITO_RZ_LABEL', 'esito_rz', 'ESITO_RZ']),
    pickRapportoAttrCI(d, ['esito_dt_label', 'ESITO_DT_LABEL', 'esito_dt', 'ESITO_DT']),
    pickRapportoAttrCI(d, ['ultimo_evento', 'ULTIMO_EVENTO', 'ultimo_evento_codice', 'ULTIMO_EVENTO_CODICE'])
  ]
    .map(v => String(v ?? '').trim().toLowerCase())
    .filter(Boolean)

  return txtVals.some(v => v.includes('respint'))
}

function isRapportoApprovatoForPdf (data: any): boolean {
  const d = data || {}
  const statoDt = Number(pickRapportoAttrCI(d, ['stato_dt', 'STATO_DT']))
  const esitoDt = Number(pickRapportoAttrCI(d, ['esito_dt', 'ESITO_DT']))
  if (statoDt === STATO_APPROVATA || esitoDt === ESITO_APPROVATA) return true

  const txtVals = [
    pickRapportoAttrCI(d, ['stato_dt_label', 'STATO_DT_LABEL', 'stato_dt', 'STATO_DT']),
    pickRapportoAttrCI(d, ['esito_dt_label', 'ESITO_DT_LABEL', 'esito_dt', 'ESITO_DT'])
  ]
    .map(v => String(v ?? '').trim().toLowerCase())
    .filter(Boolean)

  return txtVals.some(v => v.includes('approvat'))
}

/** Costruisce la mappa dei placeholder → valori dal record e dalla cache utenti.
 * Allineata alla scheda Anteprima del CW editing.
 */
function buildPlaceholderMap (data: any, utentiCache: Map<string, UtenteCached> | null, cicli: RapportoIterCicloPdf[] = []): Record<string, string> {
  const d = data || {}
  const areaCod = normalizeAreaCod(d.area_cod || d.area)
  const settoreCod = normalizeSettoreCod(d.settore_cod || d.settore)
  const isPF = String(d.tipologia_soggetto || '').toUpperCase() === 'PF'
  const artChecked = (field: string): boolean => { const v = d[field]; return v === 1 || v === '1' || v === true }
  const art15on = art15AttivoForRapporto(d)
  const art16on = String(d.norma16_17 || '').toLowerCase().includes('art16')
  const art17on = String(d.norma16_17 || '').toLowerCase().includes('art17') || !!d.art17_tipo
  const xMark = (on: boolean) => on ? 'x' : ''
  const surfVal = (on: boolean, ...fields: string[]) => { if (!on) return ''; for (const f of fields) { const v = d[f]; if (v != null && v !== '' && v !== 0) return fmtNum(v) } return '' }
  const gradiViolazioni = parseGradiViolazioniForRapporto(d.gradi_violazioni)
  const occorrenzaArt15 = occorrenzaArt15ForRapporto(d.occorrenza, art15on)
  const origPratica = d.origine_pratica ?? d.Origine_pratica
  const praticaPrefix = (origPratica === 2 || origPratica === '2') ? 'TI' : 'TR'
  const oidVal = d.OBJECTID ?? d.objectid ?? ''
  const numeroRapportoTecnico = String(pickRapportoAttrCI(d, [
    'numero_rapporto_tecnico', 'Numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO',
    'numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO',
    'codice_rapporto', 'Codice_rapporto', 'CODICE_RAPPORTO',
    'n_rapporto', 'N_RAPPORTO'
  ]) || '').trim()
  const numeroRilevazione = oidVal
    ? `${Number(oidVal)}-${praticaPrefix}${settoreCod ? `-${settoreCod}` : ''}`
    : ''
  const codPratica = numeroRapportoTecnico || numeroRilevazione

  const rapportoRespinto = isRapportoRespintoForPdf(d)
  const rapportoApprovato = !rapportoRespinto && isRapportoApprovatoForPdf(d)
  const rapportoIstruttoria = !rapportoRespinto && !rapportoApprovato
  const iterPlaceholders = buildRapportoIterPlaceholders({ data: d, utentiCache, cicli, rapportoApprovato, rapportoRespinto })
  const dataApprovazioneRapporto = iterPlaceholders.data_approvazione_rapporto || ''

  return {
    cod_pratica: codPratica, anno: d.data_rilevazione ? String(new Date(d.data_rilevazione).getFullYear()) : '', area_cod: areaCod,
    area_label: AREA_LABELS[areaCod] || areaCod, settore_label: SETTORE_LABELS[settoreCod] || settoreCod,
    tecnico_rilevatore: esc(d.tecnico_rilevatore || ''), data_rilevazione: formatDateIt(d.data_rilevazione), ora_rilevazione: formatTimeIt(d.data_rilevazione),
    x_art08: xMark(artChecked('v_art08')), x_art12: xMark(artChecked('v_art12')), x_art15: xMark(art15on), x_art16: xMark(art16on), x_art17: xMark(art17on),
    x_art27: xMark(artChecked('v_art27')), x_art28: xMark(artChecked('v_art28')), x_art29: xMark(artChecked('v_art29')), x_art30: xMark(artChecked('v_art30')),
    x_art31: xMark(artChecked('v_art31')), x_art32: xMark(artChecked('v_art32')), x_art33: xMark(artChecked('v_art33')), x_art34: xMark(artChecked('v_art34')),
    x_art35: xMark(artChecked('v_art35')), x_art36: xMark(artChecked('v_art36')), x_art37: xMark(artChecked('v_art37')), x_art39: xMark(artChecked('v_art39')),
    sup_dich_art08: surfVal(artChecked('v_art08'), 'sup_dichiarata_art08'), sup_irr_art08: surfVal(artChecked('v_art08'), 'sup_irrigata_art08'),
    sup_dich_art12: surfVal(artChecked('v_art12'), 'sup_dichiarata_art12'), sup_irr_art12: surfVal(artChecked('v_art12'), 'sup_irrigata_art12'),
    sup_dich_art15: surfVal(art15on, 'sup_dichiarata_art15'), sup_irr_art15: surfVal(art15on, 'sup_irrigata_art15'),
    sup_dich_art16: surfVal(art16on, 'sup_dichiarata_art16'), sup_irr_art16: surfVal(art16on, 'sup_irrigata_art16_17_2'),
    sup_dich_art17: surfVal(art17on, 'sup_dichiarata_art17_1', 'sup_dichiarata_art17_2'), sup_irr_art17: surfVal(art17on, 'sup_irrigata_art17_1', 'sup_irrigata_art16_17_2'),
    sup_dich_art27: surfVal(artChecked('v_art27'), 'sup_dichiarata_art27'), sup_irr_art27: surfVal(artChecked('v_art27'), 'sup_irrigata_art27'),
    sup_dich_art28: surfVal(artChecked('v_art28'), 'sup_dichiarata_art28'), sup_irr_art28: surfVal(artChecked('v_art28'), 'sup_irrigata_art28'),
    sup_dich_art29: surfVal(artChecked('v_art29'), 'sup_dichiarata_art29'), sup_irr_art29: surfVal(artChecked('v_art29'), 'sup_irrigata_art29'),
    sup_dich_art30: surfVal(artChecked('v_art30'), 'sup_dichiarata_art30'), sup_irr_art30: surfVal(artChecked('v_art30'), 'sup_irrigata_art30'),
    sup_dich_art31: surfVal(artChecked('v_art31'), 'sup_dichiarata_art31'), sup_irr_art31: surfVal(artChecked('v_art31'), 'sup_irrigata_art31'),
    sup_dich_art32: surfVal(artChecked('v_art32'), 'sup_dichiarata_art32'), sup_irr_art32: surfVal(artChecked('v_art32'), 'sup_irrigata_art32'),
    sup_dich_art33: surfVal(artChecked('v_art33'), 'sup_dichiarata_art33'), sup_irr_art33: surfVal(artChecked('v_art33'), 'sup_irrigata_art33'),
    sup_dich_art34: surfVal(artChecked('v_art34'), 'sup_dichiarata_art34'), sup_irr_art34: surfVal(artChecked('v_art34'), 'sup_irrigata_art34'),
    sup_dich_art35: surfVal(artChecked('v_art35'), 'sup_dichiarata_art35'), sup_irr_art35: surfVal(artChecked('v_art35'), 'sup_irrigata_art35'),
    sup_dich_art36: surfVal(artChecked('v_art36'), 'sup_dichiarata_art36'), sup_irr_art36: surfVal(artChecked('v_art36'), 'sup_irrigata_art36'),
    sup_dich_art37: surfVal(artChecked('v_art37'), 'sup_dichiarata_art37'), sup_irr_art37: surfVal(artChecked('v_art37'), 'sup_irrigata_art37'),
    sup_dich_art39: surfVal(artChecked('v_art39'), 'sup_dichiarata_art39'), sup_irr_art39: surfVal(artChecked('v_art39'), 'sup_irrigata_art39'),
    grado_art08: '', grado_art12: artChecked('v_art12') ? gradoViolazioneForRapporto(gradiViolazioni, '12') : '', grado_art15: '',
    grado_art16: '', grado_art17: '', grado_art27: artChecked('v_art27') ? gradoViolazioneForRapporto(gradiViolazioni, '27') : '',
    grado_art28: artChecked('v_art28') ? gradoViolazioneForRapporto(gradiViolazioni, '28') : '', grado_art29: '', grado_art30: '',
    grado_art31: artChecked('v_art31') ? gradoViolazioneForRapporto(gradiViolazioni, '31') : '', grado_art32: artChecked('v_art32') ? gradoViolazioneForRapporto(gradiViolazioni, '32') : '', grado_art33: artChecked('v_art33') ? gradoViolazioneForRapporto(gradiViolazioni, '33') : '',
    grado_art34: artChecked('v_art34') ? gradoViolazioneForRapporto(gradiViolazioni, '34') : '', grado_art35: artChecked('v_art35') ? gradoViolazioneForRapporto(gradiViolazioni, '35') : '', grado_art36: artChecked('v_art36') ? gradoViolazioneForRapporto(gradiViolazioni, '36') : '',
    grado_art37: artChecked('v_art37') ? gradoViolazioneForRapporto(gradiViolazioni, '37') : '', grado_art39: '',
    occorrenza_art15: occorrenzaArt15,
    descrizione_fatti: esc(d.descrizione_fatti || ''), circostanze: esc(d.circostanze || ''), descrizione_luogo: esc(d.descrizione_luogo || ''),
    tipo_soggetto: isPF ? 'PF' : 'PG',
    denominazione: isPF ? esc(`${d.nome || ''} ${d.cognome || ''}`.trim()) : esc(d.ragione_sociale || ''),
    cf_piva: isPF ? esc(d.codice_fiscale || '') : esc(d.piva || ''),
    via: esc(d.via || ''), civico: esc(d.civico || ''), cap: esc(d.cap || ''), localita: esc(d.localita || ''), citta: esc(d.citta || ''),
    telefono: esc(d.telefono || ''), cellulare: esc(d.cellulare || ''), email: esc(d.email || ''), pec: esc(d.pec || ''),
    presenza_trasgressore: String(d.presenza_trasgressore || '').toLowerCase() === 'si' || String(d.presenza_trasgressore || '').toLowerCase() === 'sì' || String(d.presenza_trasgressore || '') === '1' ? 'S\u00EC' : (String(d.presenza_trasgressore || '').toLowerCase() === 'no' || String(d.presenza_trasgressore || '') === '0' ? 'No' : String(d.presenza_trasgressore || '')),
    ...iterPlaceholders,
    idrante: esc(d.idrante || ''), comune: '', foglio: '', mappali: '', altro_luogo: '',
    distretto_irriguo: esc(d.distretto_irriguo || ''), comizio: esc(d.comizio || ''),
    matricola_contatore: esc(d.matricola_contatore || ''), matricola_tessera: esc(d.matricola_tessera || ''),
    importo_rimborso: fmtNum(d.ns_totale_complessivo) ? fmtNum(d.ns_totale_complessivo) + ' €' : '',
    data_compilazione: formatDateIt(d.data_firma),
    rapporto_respinto: rapportoRespinto ? '1' : '',
    rapporto_approvato: rapportoApprovato ? '1' : '',
    rapporto_istruttoria: rapportoIstruttoria ? '1' : '',
    data_approvazione_rapporto: dataApprovazioneRapporto
  }
}

function rapportoPdfFileName (map: Record<string, string>): string {
  const cp = String(map.cod_pratica || 'rapporto').replace(/[^a-zA-Z0-9_-]/g, '_')
  return `rapporto_${cp || 'rapporto'}.pdf`
}

function normalizeArcgisLayerUrl (raw?: string | null): string {
  const url = String(raw || '').trim()
  if (!url) return ''

  const match = url.match(/^([^?#]*)([?#].*)?$/)
  const base = String(match?.[1] || '').replace(/\/+$/, '')
  const suffix = String(match?.[2] || '')

  // Le configurazioni possono arrivare dal service root (.../FeatureServer).
  // Per le query via FeatureLayer serve invece la URL del layer/table (.../FeatureServer/0).
  if (/\/(FeatureServer|MapServer)$/i.test(base)) return `${base}/0${suffix}`

  return `${base}${suffix}`
}


type NsCatPdf = 'AT' | 'PR' | 'RU' | 'SL' | 'PF'
type NsRowPdf = {
  objectid: number
  categoria_costo: NsCatPdf
  origine_voce_snapshot: string
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
}
type NsSummaryPdf = {
  totaleAT: number
  totalePR: number
  totaleRU: number
  totaleSL: number
  totalePF: number
  percentualeSpeseGenerali: number
  importoSpeseGenerali: number
  totaleComplessivo: number
}

const NS_PDF_CATS: NsCatPdf[] = ['AT', 'PR', 'RU', 'SL', 'PF']
const NS_PDF_CASISTICA_META: Record<string, { order: number; label: string }> = {
  C100_REPERIBILITA: { order: 8, label: 'Art. 8 - Violazione servizio di reperibilità' },
  C101_SPRECO_ACQUA: { order: 27, label: 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica' },
  C104_ATTREZZATURE_DANNEGGIATE: { order: 30, label: 'Art. 30 - Danneggiamento e/o perdita attrezzature' },
  C113_DANNI_STRUTTURE_IRRIGUE: { order: 39, label: 'Art. 39 - Danni alle strutture irrigue' }
}

function escapeSqlStringForRapportoPdf (v: any): string {
  return String(v ?? '').replace(/'/g, "''")
}

function parentGlobalidWhereForRapportoPdf (parentGlobalId: string): string {
  const raw = String(parentGlobalId || '').trim()
  const noBraces = raw.replace(/^\{/, '').replace(/\}$/, '')
  const values = Array.from(new Set([raw, noBraces, `{${noBraces}}`].filter(Boolean)))
  return values.map(v => `parent_globalid = '${escapeSqlStringForRapportoPdf(v)}'`).join(' OR ')
}

function moneyItRapportoPdf (v: number): string {
  if (!Number.isFinite(v)) return ''
  return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}


function emptyNsRowsForRapportoPdf (): Record<NsCatPdf, NsRowPdf[]> {
  return { AT: [], PR: [], RU: [], SL: [], PF: [] }
}

function nsSummaryForRapportoPdf (rows: Record<NsCatPdf, NsRowPdf[]>, percentualeSpeseGenerali: number): NsSummaryPdf {
  const sumCat = (cat: NsCatPdf) => (rows[cat] || []).reduce((sum, r) => sum + (Number(r.importo_riga) || 0), 0)
  const totaleAT = sumCat('AT')
  const totalePR = sumCat('PR')
  const totaleRU = sumCat('RU')
  const totaleSL = sumCat('SL')
  const totalePF = sumCat('PF')
  const imponibile = totaleAT + totalePR + totaleRU + totaleSL + totalePF
  const pct = Number.isFinite(percentualeSpeseGenerali) ? percentualeSpeseGenerali : 15
  const importoSpeseGenerali = imponibile * pct / 100
  return {
    totaleAT,
    totalePR,
    totaleRU,
    totaleSL,
    totalePF,
    percentualeSpeseGenerali: pct,
    importoSpeseGenerali,
    totaleComplessivo: imponibile + importoSpeseGenerali
  }
}

function notaSpeseGroupsForRapportoPdf (
  rawRows: any[],
  percentualeSpeseGenerali: number
): Array<{ codiceCasistica: string; label: string; rows: Record<NsCatPdf, NsRowPdf[]>; summary: NsSummaryPdf }> {
  const byCode = new Map<string, Record<NsCatPdf, NsRowPdf[]>>()

  for (const r of rawRows || []) {
    const cat = String(r.categoria_costo || '').toUpperCase() as NsCatPdf
    if (!NS_PDF_CATS.includes(cat)) continue
    const code = String(r.codice_casistica || '').trim() || '__NON_COLLEGATA__'
    if (!byCode.has(code)) byCode.set(code, emptyNsRowsForRapportoPdf())
    byCode.get(code)![cat].push({
      objectid: Number(r.OBJECTID ?? r.objectid ?? 0),
      categoria_costo: cat,
      origine_voce_snapshot: String(r.origine_voce_snapshot || ''),
      codice_voce_snapshot: String(r.codice_voce_snapshot || ''),
      descrizione_snapshot: String(r.descrizione_snapshot || ''),
      unita_misura_snapshot: String(r.unita_misura_snapshot || ''),
      prezzo_unitario_snapshot: Number(r.prezzo_unitario_snapshot || 0),
      quantita: Number(r.quantita || 0),
      importo_riga: Number(r.importo_riga || 0),
      anno_prezzario_snapshot: r.anno_prezzario_snapshot == null ? null : Number(r.anno_prezzario_snapshot),
      ordine: Number(r.ordine || 0),
      note: String(r.note || ''),
      codice_casistica: code === '__NON_COLLEGATA__' ? null : code
    })
  }

  return Array.from(byCode.entries())
    .map(([code, rows]) => {
      const meta = NS_PDF_CASISTICA_META[code]
      return {
        codiceCasistica: code,
        label: meta?.label || (code === '__NON_COLLEGATA__' ? 'Nota spese non collegata a violazione' : 'Nota spese collegata'),
        rows,
        summary: nsSummaryForRapportoPdf(rows, percentualeSpeseGenerali)
      }
    })
    .filter(g => g.summary.totaleComplessivo > 0)
    .sort((a, b) => {
      const ao = NS_PDF_CASISTICA_META[a.codiceCasistica]?.order ?? 999
      const bo = NS_PDF_CASISTICA_META[b.codiceCasistica]?.order ?? 999
      if (ao !== bo) return ao - bo
      return a.label.localeCompare(b.label, 'it')
    })
}

async function buildRapportoPdfBlob (
  data: any, utentiCache: Map<string, UtenteCached> | null,
  nsConfig?: { detailUrl: string; parametriUrl: string; parametroCode: string }
): Promise<{ blob: Blob; fileName: string }> {
  const iterGlobalId = pickRapportoAttrCI(data, ['globalid', 'GlobalID', 'GLOBALID', 'parent_globalid'])
  const iterCicli = await loadRapportoIterCicliForPdf(iterGlobalId)
  const map = buildPlaceholderMap(data, utentiCache, iterCicli)
  const fileName = rapportoPdfFileName(map)

  let nsGroups: Array<{ codiceCasistica: string; label: string; rows: Record<NsCatPdf, NsRowPdf[]>; summary: NsSummaryPdf }> = []

  // Se le URL NS sono configurate, query le righe prima di generare il rapporto:
  // il riepilogo nel rapporto principale deve indicare se gli allegati sono più di uno.
  const detailUrl = normalizeArcgisLayerUrl(nsConfig?.detailUrl)
  const parametriUrl = normalizeArcgisLayerUrl(nsConfig?.parametriUrl)
  if (detailUrl && data) {
    try {
      const parentGlobalId = String(data.GlobalID || data.globalid || data.GLOBALID || data.global_id || '').trim()
      if (parentGlobalId) {
        const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')

        const detailPromise = (async () => {
          const fl = new FeatureLayer({ url: detailUrl })
          if (typeof fl.load === 'function') await fl.load()
          const where = parentGlobalidWhereForRapportoPdf(parentGlobalId)
          const res = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: false })
          return (res?.features || []).map((f: any) => f.attributes || {})
        })()

        const percPromise = (async () => {
          if (!parametriUrl) return 15
          try {
            const pCode = nsConfig?.parametroCode || 'SPESE_GENERALI_PERC'
            const pfl = new FeatureLayer({ url: parametriUrl })
            if (typeof pfl.load === 'function') await pfl.load()
            const pRes = await pfl.queryFeatures({ where: `codice_parametro = '${escapeSqlStringForRapportoPdf(pCode)}'`, outFields: ['valore_num'], returnGeometry: false })
            const pVal = pRes?.features?.[0]?.attributes?.valore_num
            return (pVal != null) ? (Number(pVal) || 15) : 15
          } catch { return 15 }
        })()

        const [rawRows, percSG] = await Promise.all([detailPromise, percPromise])
        nsGroups = notaSpeseGroupsForRapportoPdf(rawRows, percSG)
      }
    } catch {}
  }

  if (nsGroups.length > 0) {
    const totaleNoteSpese = nsGroups.reduce((sum, group) => sum + (Number(group?.summary?.totaleComplessivo) || 0), 0)
    map.importo_rimborso = moneyItRapportoPdf(totaleNoteSpese)
    map.nota_spese_label = nsGroups.length > 1 ? '(Vedi note spese allegate)' : '(Vedi nota spese allegata)'
  } else {
    map.nota_spese_label = ''
  }

  const rapportoBytes = await buildRapportoPdf(map)
  let finalBytes: Uint8Array = rapportoBytes

  if (nsGroups.length > 0) {
    const merged = await PDFDocument.create()
    const rapDoc = await PDFDocument.load(rapportoBytes)
    const rapPages = await merged.copyPages(rapDoc, rapDoc.getPageIndices())
    rapPages.forEach(pg => merged.addPage(pg))

    for (let i = 0; i < nsGroups.length; i++) {
      const group = nsGroups[i]
      const nsData: NotaSpeseData = {
        cod_pratica: map.cod_pratica || '',
        area_label: map.area_label || '',
        settore_label: map.settore_label || '',
        area_cod: map.area_cod || '',
        numero_nota: i + 1,
        titolo_nota: group.label,
        rows: group.rows as any,
        summary: group.summary as any,
        luogo_data: 'Cagliari, ' + (formatDateIt(data.data_firma) || new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })),
        firma_nome: map.firma_ti || '',
        rapporto_respinto: map.rapporto_respinto === '1',
        rapporto_istruttoria: map.rapporto_istruttoria === '1'
      }
      const nsBytes = await buildNotaSpesePdf(nsData)
      const nsDoc = await PDFDocument.load(nsBytes)
      const nsPages = await merged.copyPages(nsDoc, nsDoc.getPageIndices())
      nsPages.forEach(pg => merged.addPage(pg))
    }


    finalBytes = await merged.save()
  }

  const blob = new Blob([finalBytes as any], { type: 'application/pdf' })
  return { blob, fileName }
}

function makeRapportoPdfUrl (blob: Blob, fileName: string): string {
  return `${URL.createObjectURL(blob)}#${fileName}`
}

function revokeRapportoPdfUrl (url?: string | null): void {
  if (!url) return
  try { URL.revokeObjectURL(String(url).split('#')[0]) } catch {}
}

function downloadBlobFile (blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => { try { URL.revokeObjectURL(url) } catch {} }, 1500)
}


export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfgMutable: any = (props.config && (props.config as any).asMutable)
    ? (props.config as any).asMutable({ deep: true })
    : (props.config as any || {})
  const cfg: any = { ...defaultConfig, ...cfgMutable }

  // ── Ruolo utente: letto da window.__giiUserRole (scritto dal widget Header) ──
  const [detectedRole, setDetectedRole] = React.useState<string>('')

  React.useEffect(() => {
    const readRole = () => {
      try {
        const info = (window as any).__giiUserRole || {}
        let role = normalizeRuoloCod(info?.ruoloCod || info?.ruolo_cod || info?.ruoloLabel || info?.ruolo)
        if (!role || role === 'ADMIN') { setDetectedRole(''); return }
        // RI con area=AMM → RI_AMM, TI con area=AMM → TI_AMM
        const areaCod = normalizeAreaCod(info?.areaCod || info?.area_cod || info?.areaLabel || info?.area)
        if (role === 'RI' && areaCod === 'AMM') role = 'RI_AMM'
        if (role === 'TI' && areaCod === 'AMM') role = 'TI_AMM'
        setDetectedRole(role)
      } catch { }
    }
    readRole()
    window.addEventListener('gii:userLoaded', readRole)
    return () => window.removeEventListener('gii:userLoaded', readRole)
  }, [])

  const roleCode = detectedRole
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
    pageColor: normalizeHexColor(cfg.editPageColor, '#5b21b6'),
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

    'dt_presa_in_carico_DA',
    'stato_DA', 'dt_stato_DA',
    'esito_DA', 'dt_esito_DA',
    'note_DA',

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
  const forcedReqRef = React.useRef(0)

  React.useEffect(() => {
    const req = ++forcedReqRef.current
    if (!selection?.layerUrl || selection.oid == null) {
      setForcedActive(null)
      return
    }
    ;(async () => {
      try {
        const dsTry = await createRuntimeDsProxyFromLayerUrl(selection.layerUrl, selection.viewName)
        const idFieldName = String(selection.idFieldName || dsTry.getIdField?.() || 'OBJECTID')
        const stateKey = `${selection.layerUrl}:${selection.oid}`
        const cacheEntry = readSelectedFeatureCache(selection.layerUrl, selection.oid)
        const baseData = cacheEntry?.data && typeof cacheEntry.data === 'object' ? cacheEntry.data : null
        const baseOid = baseData ? Number(baseData[idFieldName] ?? baseData.OBJECTID ?? selection.oid) : NaN

        if (baseData && Number.isFinite(baseOid) && baseOid === selection.oid) {
          const quickState: SelState = { ds: dsTry, oid: selection.oid, idFieldName, data: baseData, sig: stateKey }
          setForcedActive({ key: selection.layerUrl, state: quickState })
        }

        const wantsAll = queryFields.includes('*')
        const needsQuery = !baseData || wantsAll || queryFields.some(f => f && f !== '*' && !Object.prototype.hasOwnProperty.call(baseData, f)) || selRefreshNonce > 0
        if (!needsQuery) return

        const where = `${idFieldName}=${selection.oid}`
        const res: any = await dsTry.query({ where, outFields: queryFields, returnGeometry: false } as any)
        if (req !== forcedReqRef.current) return
        const recs: any[] = res?.records || []
        if (!recs.length) {
          setForcedActive(null)
          return
        }
        const r0 = recs[0]
        const fetched = r0?.getData?.() || {}
        const cached = readSelectedFeatureCache(selection.layerUrl, selection.oid)
        const freshEdit = cached && cached.source === 'edit' && (Date.now() - Number(cached.ts || 0) < 15000)
        const d0 = freshEdit ? { ...(fetched || {}), ...((cached?.data || {}) as any) } : { ...((baseData || {}) as any), ...(fetched || {}) }
        const oid0 = Number(d0[idFieldName] ?? d0.OBJECTID ?? selection.oid)
        if (!Number.isFinite(oid0) || oid0 !== selection.oid) {
          setForcedActive(null)
          return
        }
        writeSelectedFeatureCache(selection.layerUrl, selection.oid, idFieldName, d0, 'azioni')
        const st: SelState = { ds: dsTry, oid: selection.oid, idFieldName, data: d0, sig: stateKey }
        setForcedActive({ key: selection.layerUrl, state: st })
      } catch {
        if (req === forcedReqRef.current) setForcedActive(null)
      }
    })()
  }, [selection?.layerUrl, selection?.oid, selection?.idFieldName, selection?.viewName, queryFields.join('|'), selRefreshNonce])

  const activeGate = forcedActive


  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', padding: Number.isFinite(Number((cfg as any).maskOuterOffset ?? 0)) ? Number((cfg as any).maskOuterOffset) : 0 }}>
      <>
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
            parametroCode: String(cfg.nsParametroCode || 'SPESE_GENERALI_PERC')
          }}
        />
      </>
    </div>
  )
}

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, DataSourceManager } from 'jimu-core'
import { Button } from 'jimu-ui'
import { createPortal } from 'react-dom'
import type { IMConfig, TabConfig } from '../config'
import { defaultConfig, DETAIL_DEFAULT_TAB_FIELDS, DETAIL_NEVER_SHOW_FIELDS, DETAIL_GENERAL_FIELDS } from '../config'
import { filterGiiAttachmentsForTechnicalRoles } from '../../../_shared/gii-anteprime/allegati/gii-attachment-viewer'
import { ensureNsdJsonOnlyQueryFormat } from '../../../_shared/gii-anteprime/nsd-query-format-fix'
import { isGiiIaUser, isPracticeAssignedToCurrentIa } from '../../../_shared/gii-access/ia-assignment'
import { isGiiPracticePayloadCurrent, isGiiPracticeSelectionContextCurrent } from '../../../_shared/gii-selection/practice-context'




type MsgKind = 'info' | 'ok' | 'err'
type Msg = { kind: MsgKind; text: string }

const GII_LOG_EVENTI_CICLI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'


type DetailCurrentUser = Record<string, any>

function readDetailCurrentUser (): DetailCurrentUser | null {
  try {
    const roleInfo: any = (window as any).__giiUserRole
    if (!roleInfo || typeof roleInfo !== 'object') return null
    const baseInfo: any = (window as any).__giiUser || {}
    return {
      ...baseInfo,
      ...roleInfo,
      username: String(roleInfo?.username || baseInfo?.username || '').trim(),
      fullName: String(roleInfo?.fullName || roleInfo?.full_name || baseInfo?.fullName || baseInfo?.full_name || '').trim()
    }
  } catch {
    return null
  }
}

const RUOLO_CODES = new Set(['TR', 'IT', 'CS', 'RIT', 'DT', 'DA', 'ADMIN', 'IA', 'RIA'])
const AREA_NUM: Record<string, number> = { AMM: 1, AGR: 2, TEC: 3 }
const SETTORE_NUM: Record<string, number> = { CR: 1, GI: 2, D1: 3, D2: 4, D3: 5, D4: 6, D5: 7, D6: 8, DS: 9 }
const AREA_COD_FROM_NUM: Record<number, string> = { 1: 'AMM', 2: 'AGR', 3: 'TEC' }
const SETTORE_COD_FROM_NUM: Record<number, string> = { 1: 'CR', 2: 'GI', 3: 'D1', 4: 'D2', 5: 'D3', 6: 'D4', 7: 'D5', 8: 'D6', 9: 'DS' }

function normalizeRuoloCod (v: any): string {
  const s = String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (!s) return ''
  if (s === 'CAPO_SETTORE') return 'CS'
  if (s.includes('TECNICO_RILEVATORE')) return 'TR'
  if (s.includes('ISTRUTTORE_AMMINISTRATIVO')) return 'IA'
  if (s.includes('ISTRUTTORE_TECNICO')) return 'IT'
  if (s.includes('RESPONSABILE_ISTRUTTORIA_TECNICA')) return 'RIT'
  if (s.includes('RESPONSABILE_ISTRUTTORIA_AMMINISTRATIVA')) return 'RIA'
  if (s.includes('DIRETTORE')) return 'DT'
  if (s.includes('AMMINISTRATORE')) return 'ADMIN'
  return RUOLO_CODES.has(s) ? s : s
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
  const distretto = s.match(/DISTRETTO([1-6])/)
  if (distretto) return `D${distretto[1]}`
  if (s.includes('DRENO') || s.includes('SCOLO')) return 'DS'
  if (s.includes('CATASTO') || s.includes('RUOLI')) return 'CR'
  if (s.includes('GESTIONEIRRIGUA')) return 'GI'
  return SETTORE_NUM[s] != null ? s : s
}


const AREA_LABEL: Record<string, string> = {
  AMM: 'Amministrativa',
  AGR: 'Agraria',
  TEC: 'Tecnica'
}

const SETTORE_LABEL: Record<string, string> = {
  CR: 'Catasto, Ruoli e Servizi Territoriali',
  GI: 'Gestione irrigua',
  D1: "Distretto 1 (Quartu Sant'Elena/Villaputzu/Muravera – San Sperate)",
  D2: 'Distretto 2 (Serramanna/Pimpisu)',
  D3: 'Distretto 3 (San Gavino - Villacidro)',
  D4: 'Distretto 4 (Basso Sulcis)',
  D5: 'Distretto 5 (Senorbì)',
  D6: 'Distretto 6 (Cixerri)',
  DS: 'Manutenzione opere di dreno e di scolo'
}

function formatAreaLabel (raw: any): string {
  if (raw == null || raw === '') return '—'
  const code = normalizeAreaCod(raw)
  return AREA_LABEL[code] || String(raw)
}

function formatSettoreLabel (raw: any): string {
  if (raw == null || raw === '') return '—'
  const code = normalizeSettoreCod(raw)
  return SETTORE_LABEL[code] || String(raw)
}

function formatUfficioLabel (raw: any): string {
  if (raw == null || raw === '') return '—'
  return String(raw)
}

function normalizeLogFieldNameSet (fields: any[]): Set<string> {
  return new Set((fields || []).map((f: any) => String(f?.name || '').trim()).filter(Boolean))
}

function pickLogOutFields (available: Set<string>, wanted: string[]): string[] {
  const out = wanted.filter(f => available.has(f))
  return out.length ? out : ['*']
}

function normGid (v: any): string {
  return String(v ?? '').trim().replace(/^\{|\}$/g, '').toLowerCase()
}

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

let runtimeDsProxyGlobalEpoch = 0
const runtimeDsProxyUrlEpoch: Record<string, number> = {}

function invalidateRuntimeProxyCache (layerUrl?: string | null) {
  try {
    const url = String(layerUrl || '').trim()
    if (!url) {
      runtimeDsProxyGlobalEpoch += 1
      for (const key of Object.keys(runtimeDsProxyPromises)) {
        try { delete runtimeDsProxyPromises[key] } catch {}
      }
      try { delete (window as any).__giiRuntimeDsProxyCache } catch {}
      return
    }

    runtimeDsProxyUrlEpoch[url] = Number(runtimeDsProxyUrlEpoch[url] || 0) + 1
    try { delete runtimeDsProxyPromises[url] } catch {}
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

function makeRuntimeRecord (attrs: any, idFieldName: string, sourceKey: string, geometry?: any): any {
  const id = String(attrs?.[idFieldName] ?? attrs?.OBJECTID ?? attrs?.objectid ?? '')
  return {
    getData: () => attrs,
    getId: () => id,
    getGeometry: () => geometry || null,
    geometry: geometry || null,
    feature: geometry ? { attributes: attrs, geometry } : undefined,
    dataSource: { id: sourceKey }
  }
}

function createRuntimeDsStubFromData (layerUrl: string, label: string | undefined, idFieldName: string, data: any): any {
  const schemaFields: Record<string, any> = {}
  try {
    Object.keys(data || {}).forEach((k) => {
      schemaFields[String(k)] = { alias: String(k), type: '' }
    })
  } catch {}
  return {
    id: `runtime-stub:${layerUrl}`,
    getIdField: () => idFieldName,
    getSchema: () => ({ fields: schemaFields, idField: idFieldName }),
    getLabel: () => String(label || ''),
    getDataSourceJson: () => ({ url: layerUrl }),
    query: async () => ({ records: [makeRuntimeRecord(data || {}, idFieldName, layerUrl)] })
  }
}

const runtimeDsProxyPromises: Record<string, Promise<any>> = {}

async function createRuntimeDsProxyFromLayerUrl (layerUrl: string, label?: string): Promise<any> {
  try {
    const cached = (window as any)?.__giiRuntimeDsProxyCache?.[layerUrl]
    if (cached) return cached
  } catch {}
  if (runtimeDsProxyPromises[layerUrl]) return runtimeDsProxyPromises[layerUrl]

  const capturedGlobalEpoch = runtimeDsProxyGlobalEpoch
  const capturedUrlEpoch = Number(runtimeDsProxyUrlEpoch[layerUrl] || 0)

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
    const cacheIsStillCurrent =
      capturedGlobalEpoch === runtimeDsProxyGlobalEpoch &&
      capturedUrlEpoch === Number(runtimeDsProxyUrlEpoch[layerUrl] || 0)

    if (cacheIsStillCurrent) {
      try {
        const w = window as any
        w.__giiRuntimeDsProxyCache = w.__giiRuntimeDsProxyCache || {}
        w.__giiRuntimeDsProxyCache[layerUrl] = proxy
      } catch {}
    }
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

function pickAttrCI (obj: any, names: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined
  for (const n of names || []) {
    if (Object.prototype.hasOwnProperty.call(obj, n)) return obj[n]
  }
  const lower = new Map<string, string>()
  Object.keys(obj).forEach(k => lower.set(String(k).toLowerCase(), k))
  for (const n of names || []) {
    const k = lower.get(String(n).toLowerCase())
    if (k) return obj[k]
  }
  return undefined
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

function resolveFieldNameLoose (data: any, aliasMap: Record<string, string>, wanted: string): string {
  const target = String(wanted || '').trim()
  if (!target) return ''
  if (data && Object.prototype.hasOwnProperty.call(data, target)) return target
  const targetKey = normKey(target)
  if (data && typeof data === 'object') {
    for (const k of Object.keys(data)) {
      if (normKey(k) === targetKey) return k
    }
  }
  for (const k of Object.keys(aliasMap || {})) {
    const a = aliasMap[k]
    if (normKey(a) === targetKey || normKey(k) === targetKey) return k
  }
  return target
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
      'tipologia_soggetto', 'TIPOLOGIA_SOGGETTO',
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

function resolveCodedValueLabelFromFields (fields: any[], fieldName: string, raw: any): string | null {
  try {
    if (raw == null || raw === '') return null
    const target = String(fieldName || '').trim().toLowerCase()
    if (!target) return null
    const field = (fields || []).find((f: any) => String(f?.name || '').trim().toLowerCase() === target)
    const coded = field?.domain?.codedValues
    if (!coded || !Array.isArray(coded)) return null
    for (const cv of coded) {
      const code = cv?.code
      if (code == raw) return String(cv?.name ?? '')
      if (String(code) === String(raw)) return String(cv?.name ?? '')
    }
    return null
  } catch {
    return null
  }
}

function resolveCodedValueLabelFromFieldNames (fields: any[], fieldNames: string[], raw: any): string | null {
  for (const fieldName of fieldNames || []) {
    const label = resolveCodedValueLabelFromFields(fields, fieldName, raw)
    if (label) return label
  }
  return null
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
}): any {
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
data = withRecordGeometry(data, r0)

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
    const needsQuery = wantsAll || outFields.some(f => f !== '*' && !Object.prototype.hasOwnProperty.call(base, f)) || !hasUsableDataGeometry(base)
    if (!needsQuery) return

    try {
      const q: any = {
        where: `${idFieldName}=${Number(oid)}`,
        outFields,
        returnGeometry: true,
        pageSize: 1
      }
      const res: any = await (ds?.query ? ds.query(q) : null)

      let rec: any = null
      if (Array.isArray(res)) rec = res[0]
      else if (res && Array.isArray(res.records)) rec = res.records[0]
      else if (res && res.data && Array.isArray(res.data.records)) rec = res.data.records[0]

      const attrs = rec?.getData ? rec.getData() : (rec?.data || rec?.attributes || null)
      const d = withRecordGeometry(attrs, rec)
      if (!cancelled && d) setFullData(d)
    } catch {}
  }
  load()
  return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ds, oid, idFieldName, querySig, watchSig])

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

function DetailRow (props: { label: string; value: any; labelSize: number; valueSize: number; multiline?: boolean }) {
  const isEmpty = props.value == null || props.value === ''
  const text = isEmpty ? '—' : props.value
  const multiline = !!props.multiline
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(120px, 170px) minmax(0, 1fr)',
      columnGap: 10,
      rowGap: 3,
      alignItems: multiline ? 'start' : 'center',
      padding: '7px 0',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      boxSizing: 'border-box',
      minWidth: 0
    }}>
      <div style={{ fontSize: props.labelSize, color: '#6b7280', textAlign: 'left', paddingTop: multiline ? 3 : 0, fontWeight: 700, lineHeight: 1.25, minWidth: 0, overflowWrap: 'anywhere' }}>
        {props.label}
      </div>
      {multiline
        ? (
          <div style={{
            fontSize: props.valueSize,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 140,
            overflowY: 'auto',
            color: '#1f2937',
            fontWeight: 600,
            lineHeight: 1.45,
            minWidth: 0
          }}>
            {text}
          </div>
          )
        : (
          <div style={{ fontSize: props.valueSize, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1f2937', minWidth: 0 }} title={String(text)}>
            {text}
          </div>
          )}
    </div>
  )
}

function DetailSectionCard (props: {
  key?: any
  title: string
  children?: React.ReactNode
  right?: React.ReactNode
  borderColor?: string
  headerBg?: string
  headerColor?: string
  bodyBg?: string
  boxShadow?: string
  bodyPadding?: number | string
}) {
  const borderColor = props.borderColor || '#c5d9f1'
  const headerBg = props.headerBg || '#eaf2ff'
  const headerColor = props.headerColor || '#1f2937'
  const bodyBg = props.bodyBg || '#fff'
  const bodyPadding = props.bodyPadding ?? 12
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 10, background: bodyBg, boxShadow: props.boxShadow, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: headerColor, lineHeight: 1.25 }}>{props.title}</div>
        {props.right ? <div style={{ flexShrink: 0 }}>{props.right}</div> : null}
      </div>
      <div style={{ padding: bodyPadding, overflowX: 'auto', background: bodyBg }}>{props.children}</div>
    </div>
  )
}

/**
 * Regolamento articoli — testo regolamentare delle violazioni, mostrato cliccando
 * sulla riga della violazione nella scheda Violazione (stesso comportamento di
 * gii-editing-tec). Tabella opzionale: se l'URL non è configurato la riga resta
 * statica come prima, senza freccia né possibilità di espansione.
 */
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

const __giiRegArtLayerCache: Record<string, any> = {}

async function regArtGetFeatureLayerByUrl (rawUrl: any): Promise<any> {
  const url = nsdEnsureLayerIndex(nsdNormalizeUrl(rawUrl))
  if (!url) throw new Error('URL tabella articoli regolamento non configurata.')
  if (__giiRegArtLayerCache[url]) return __giiRegArtLayerCache[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url })
  try { if (typeof fl?.load === 'function') await fl.load() } catch {}
  __giiRegArtLayerCache[url] = fl
  return fl
}

async function regArtQueryAttributes (rawUrl: any): Promise<any[]> {
  const fl = await regArtGetFeatureLayerByUrl(rawUrl)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = '1=1'
  q.outFields = ['*']
  q.returnGeometry = false
  q.orderByFields = ['numero_articolo ASC']
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((f: any) => f?.attributes || {})
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

function useRegolamentoArticoliState (articoliUrlRaw: string): RegolamentoArticoliState {
  const articoliUrl = React.useMemo(() => nsdEnsureLayerIndex(nsdNormalizeUrl(articoliUrlRaw)), [articoliUrlRaw])
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
        const rows = await regArtQueryAttributes(articoliUrl)
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

function RegolamentoArticleDetails (props: { articleState: RegolamentoArticoliState; articleCode: string }) {
  const article = getRegolamentoArticle(props.articleState, props.articleCode)
  if (!props.articleState.urlsReady) {
    return <div style={{ color: '#6b7280', fontSize: 12 }}>Tabella articoli del regolamento non configurata.</div>
  }
  if (props.articleState.loading) {
    return <div style={{ color: '#6b7280', fontSize: 12 }}>Caricamento testo regolamentare…</div>
  }
  if (props.articleState.error) {
    return <div style={{ color: '#991b1b', fontSize: 12 }}>Errore caricamento regolamento: {props.articleState.error}</div>
  }
  if (!article) {
    return <div style={{ color: '#6b7280', fontSize: 12 }}>Testo regolamentare non disponibile nelle tabelle configurate.</div>
  }
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {article.testo_articolo && <div style={{ color: '#374151', fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{article.testo_articolo}</div>}
      {(article.atto_regolamento || article.anno_riferimento) && <div style={{ color: '#6b7280', fontSize: 11 }}>{[article.atto_regolamento, article.anno_riferimento ? `Anno ${article.anno_riferimento}` : ''].filter(Boolean).join(' · ')}</div>}
    </div>
  )
}

// Riga di una violazione nella scheda Violazione. Se è disponibile un codice
// articolo (e quindi la tabella regolamento), la riga è cliccabile ed espande
// il testo dell'articolo — stesso comportamento della scheda Violazione di
// gii-editing-tec. Deve essere un componente React vero (non una semplice
// funzione di rendering) perché tiene uno stato "aperto/chiuso" proprio.
function ViolationArticleLine (props: { artLabel: string; description: string; grado?: string; articleCode?: string; articleState: RegolamentoArticoliState }) {
  const [open, setOpen] = React.useState(false)
  const hasGrado = props.grado != null && String(props.grado).trim() !== ''
  const canExpand = !!props.articleCode
  const toggle = () => { if (canExpand) setOpen(v => !v) }
  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
      <div
        onClick={canExpand ? toggle : undefined}
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        onKeyDown={canExpand ? (e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } } : undefined}
        style={{
          display: 'grid',
          gridTemplateColumns: hasGrado
            ? 'max-content max-content minmax(0, 1fr) max-content'
            : 'max-content max-content minmax(0, 1fr)',
          columnGap: 8,
          alignItems: 'center',
          padding: '7px 0',
          boxSizing: 'border-box',
          minWidth: 0,
          cursor: canExpand ? 'pointer' : 'default'
        }}
      >
        <span aria-hidden='true' style={{ color: canExpand ? '#1d4ed8' : 'transparent', fontSize: 10, fontWeight: 900, width: 12, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
          {canExpand ? (open ? '▼' : '▶') : ''}
        </span>
        <div style={{
          fontSize: 12,
          color: '#6b7280',
          fontWeight: 700,
          lineHeight: 1.25,
          whiteSpace: 'nowrap'
        }}>
          {props.artLabel}
        </div>
        <div style={{
          fontSize: 13,
          color: '#1f2937',
          fontWeight: 600,
          lineHeight: 1.35,
          minWidth: 0,
          overflowWrap: 'anywhere'
        }}>
          {props.description || '—'}
        </div>
        {hasGrado
          ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap', minWidth: 0 }}>
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, lineHeight: 1.25 }}>
                Grado di gravità
              </span>
              <span style={{ fontSize: 13, color: '#1f2937', fontWeight: 600, lineHeight: 1.25 }}>
                {props.grado}
              </span>
            </div>
            )
          : null}
      </div>
      {canExpand && open && (
        <div style={{ margin: '0 0 8px 20px', padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <RegolamentoArticleDetails articleState={props.articleState} articleCode={props.articleCode as string} />
        </div>
      )}
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
  anagrafica: string[]
  violazione: string[]
  luoghiDati?: string[]
  allegati: string[]
  iterExtra: string[]
}

const LUOGHI_DATI_TAB_ID = 'luoghi_dati'
const DETAIL_LUOGHI_DATI_FIELDS = [
  'distretto',
  'comizio',
  'idrante',
  'descrizione_luogo',
  'matricola_contatore',
  'matricola_tessera'
]

function formatDateSafe (v: any): string {
  if (v == null || v === '') return '—'
  try {
    const s = String(v).trim()
    const n = Number(s)
    let d: Date | null = null
    if (Number.isFinite(n) && n > 0) {
      const ms = /^\d{10}$/.test(s) ? (n * 1000) : n
      d = new Date(ms)
    } else {
      d = new Date(s)
    }
    if (!d || Number.isNaN(d.getTime())) return String(v)
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

function formatDateTimeSafe (v: any): string {
  if (v == null || v === '') return '—'
  try {
    const s = String(v).trim()
    const n = Number(s)
    let d: Date | null = null
    if (Number.isFinite(n) && n > 0) {
      const ms = /^\d{10}$/.test(s) ? (n * 1000) : n
      d = new Date(ms)
    } else {
      d = new Date(s)
    }
    if (!d || Number.isNaN(d.getTime())) return String(v)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear())
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yy}, ${hh}:${mi}`
  } catch {
    return String(v)
  }
}


function dateMsOrNull (v: any): number | null {
  if (v == null || v === '') return null
  try {
    const s = String(v).trim()
    const n = Number(s)
    let ms: number
    if (Number.isFinite(n) && n > 0) {
      ms = /^\d{10}$/.test(s) ? (n * 1000) : n
    } else {
      ms = new Date(s).getTime()
    }
    return Number.isFinite(ms) && ms > 0 ? ms : null
  } catch {
    return null
  }
}

function isMidnightUtcDateValue (v: any): boolean {
  const ms = dateMsOrNull(v)
  if (ms === null) return false
  const d = new Date(ms)
  return d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
}

function sameLocalDateValue (a: any, b: any): boolean {
  const ma = dateMsOrNull(a)
  const mb = dateMsOrNull(b)
  if (ma === null || mb === null) return false
  const da = new Date(ma)
  const db = new Date(mb)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}

function pickSurveyRuntimeDateMs (data: any, dateOnlyValue: any): number | null {
  const candidates = ['end', 'End', 'END', 'start', 'Start', 'START', 'CreationDate', 'creationDate', 'creationdate', 'CREATIONDATE']
  for (const name of candidates) {
    const raw = pickAttrCI(data, [name])
    const ms = dateMsOrNull(raw)
    if (ms !== null && sameLocalDateValue(dateOnlyValue, ms)) return ms
  }
  return null
}

function isRilevazioneDateFieldName (fieldName?: any, fieldLabel?: any): boolean {
  const n = normKey(fieldName || '')
  const l = normKey(fieldLabel || '')
  return n === 'data rilevazione' || n === 'dt rilevazione' || l === 'data rilevazione'
}

function pickRilevazioneDateValueForDisplay (data: any): any {
  const primary = pickAttrCI(data, ['data_rilevazione', 'Data_rilevazione', 'DATA_RILEVAZIONE', 'dt_rilevazione', 'DT_RILEVAZIONE'])
  if (!isEmptyValue(primary)) {
    // Se data_rilevazione arriva come sola data, ArcGIS la espone come 00:00 UTC
    // e in Italia può comparire come 02:00. In quel caso usiamo il timestamp reale
    // della compilazione/creazione, quando è nello stesso giorno.
    if (isMidnightUtcDateValue(primary)) {
      const runtimeMs = pickSurveyRuntimeDateMs(data, primary)
      if (runtimeMs !== null) return runtimeMs
    }
    return primary
  }
  return firstNonEmptyAttr(data, ['data_firma', 'CreationDate', 'creationdate', 'created_date', 'start', 'end'])
}

function isLongTextFieldName (fieldName: string): boolean {
  const k = normKey(fieldName)
  return k.includes('descrizione fatti') || k.includes('descrizione_fatti') || k.includes('circostanze')
}

function fieldLooksLikeDate (fieldName: string, fieldLabel: string, fieldType?: string, raw?: any): boolean {
  const t = String(fieldType || '').toLowerCase()
  if (t.includes('date')) return true
  const k = normKey(fieldName)
  const l = normKey(fieldLabel)
  if (k.startsWith('dt ') || k.startsWith('data ') || k.includes(' date') || k.includes(' data ') || l.includes('data') || l.includes('date')) return true
  if (typeof raw === 'number' && raw > 1000000000) return true
  if (typeof raw === 'string' && /^\d{10,13}$/.test(raw.trim())) return true
  return false
}

function fieldLooksLikeSurface (fieldName?: string, fieldLabel?: string): boolean {
  const n = normKey(fieldName || '')
  const l = normKey(fieldLabel || '')
  return n.startsWith('sup ') || n.startsWith('sup_') || n.includes('superficie') || l.includes('superficie')
}

function formatSurfaceHaACa (raw: any): string {
  if (raw == null || raw === '') return '—'
  const txt = String(raw).trim()
  if (!txt) return '—'
  if (/^\d+\.\d{2}\.\d{2}$/.test(txt)) return txt

  const compact = txt.replace(/\s+/g, '')
  let num: number
  if (typeof raw === 'number') {
    num = raw
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(compact)) {
    num = Number(compact.replace(/\./g, ''))
  } else if (/^\d+$/.test(compact)) {
    num = Number(compact)
  } else if (/^\d+(?:,\d+)?$/.test(compact)) {
    num = Number(compact.replace(',', '.'))
  } else {
    const digits = compact.replace(/\D/g, '')
    num = digits ? Number(digits) : NaN
  }

  if (!Number.isFinite(num)) return txt
  const centiare = Math.max(0, Math.round(num))
  const ha = Math.floor(centiare / 10000)
  const are = Math.floor((centiare % 10000) / 100)
  const ca = centiare % 100
  return `${ha}.${String(are).padStart(2, '0')}.${String(ca).padStart(2, '0')}`
}

function formatSurfaceSafe (raw: any): string {
  return formatSurfaceHaACa(raw)
}

function fieldLooksLikeMoney (fieldName: string, fieldLabel = ''): boolean {
  const combined = `${fieldName || ''} ${fieldLabel || ''}`
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')

  if (!combined.trim()) return false
  if (combined.includes('percentuale') || combined.includes('percent') || combined.includes('%')) return false

  return (
    combined.includes('importo') ||
    combined.includes('prezzo') ||
    combined.includes('costo') ||
    combined.includes('sanzione') ||
    combined.includes('rimborso') ||
    combined.includes('risarcimento') ||
    combined.includes('cauzione') ||
    combined.includes('spese')
  )
}

function formatMoneySafe (raw: any): string {
  const n = Number(raw)
  if (!Number.isFinite(n)) return String(raw ?? '').trim() || '—'
  return `${n.toLocaleString('it-IT', { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function formatFieldValue (raw: any, fieldName: string, fieldType?: string, fieldLabel?: string): any {
  if (raw == null || raw === '') return '—'
  if (fieldLooksLikeDate(fieldName, fieldLabel || '', fieldType, raw)) return formatDateSafe(raw)
  if (fieldLooksLikeSurface(fieldName, fieldLabel || '')) return formatSurfaceSafe(raw)
  if (fieldLooksLikeMoney(fieldName, fieldLabel || '')) return formatMoneySafe(raw)
  return raw
}

function isUsablePointGeometry (geom: any): boolean {
  if (!geom) return false
  const x = geom.longitude ?? geom.x
  const y = geom.latitude ?? geom.y
  if (x == null || y == null) return false
  const nx = Number(x)
  const ny = Number(y)
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return false
  return !(nx === 0 && ny === 0)
}

function isSamePointGeometry (a: any, b: any): boolean {
  if (!isUsablePointGeometry(a) || !isUsablePointGeometry(b)) return false
  const ax = Number(a.longitude ?? a.x)
  const ay = Number(a.latitude ?? a.y)
  const bx = Number(b.longitude ?? b.x)
  const by = Number(b.latitude ?? b.y)
  return Math.abs(ax - bx) < 0.0000001 && Math.abs(ay - by) < 0.0000001
}

function extractRecordGeometry (rec: any): any {
  try {
    const candidates = [
      rec?.feature?.geometry,
      rec?._feature?.geometry,
      rec?.geometry,
      rec?.getGeometry?.()
    ]
    return candidates.find(isUsablePointGeometry) || null
  } catch {
    return null
  }
}

function withRecordGeometry (attrs: any, rec: any): any {
  const geom = extractRecordGeometry(rec)
  if (!geom) return attrs
  return { ...(attrs || {}), __geometry: geom }
}

function getUsableDataGeometry (data: any): any {
  try {
    const candidates = [data?.__geometry, data?.geometry]
    return candidates.find(isUsablePointGeometry) || null
  } catch {
    return null
  }
}

function hasUsableDataGeometry (data: any): boolean {
  return !!getUsableDataGeometry(data)
}

function mergeSelectionDataKeepingRealGeometry (baseData: any, fetchedData: any, preferBaseAttrs: boolean): any {
  const merged = preferBaseAttrs
    ? { ...((fetchedData || {}) as any), ...((baseData || {}) as any) }
    : { ...((baseData || {}) as any), ...((fetchedData || {}) as any) }
  const geom = getUsableDataGeometry(fetchedData) || getUsableDataGeometry(baseData)
  if (geom) {
    merged.__geometry = geom
  } else {
    try { delete merged.__geometry } catch {}
    if (!isUsablePointGeometry(merged.geometry)) {
      try { delete merged.geometry } catch {}
    }
  }
  return merged
}

function formatCoordNumber (v: any): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 6 }).format(n)
}

function formatPointGeometryCoordinates (geom: any): string {
  if (!isUsablePointGeometry(geom)) return ''
  const x = geom.longitude ?? geom.x
  const y = geom.latitude ?? geom.y
  const fx = formatCoordNumber(x)
  const fy = formatCoordNumber(y)
  if (!fx || !fy) return ''
  if (geom.longitude != null || geom.latitude != null) return `Lat. ${fy} — Long. ${fx}`
  return `X ${fx} — Y ${fy}`
}

function formatPointCoordinates (data: any): string {
  return formatPointGeometryCoordinates(getUsableDataGeometry(data))
}

function normalizeFieldList (arr: any): string[] {
  if (!arr) return []
  const js = (arr as any)?.asMutable ? (arr as any).asMutable({ deep: true }) : arr
  const a = Array.isArray(js) ? js : []
  return a.map(x => String(x)).filter(Boolean)
}

function autoPickFields (data: any, kind: string): string[] {
  if (!data) return []
  const blocked = new Set([...DETAIL_NEVER_SHOW_FIELDS, ...DETAIL_GENERAL_FIELDS].map(x => String(x)))
  const keys = Object.keys(data).filter(k => !/^objectid$/i.test(k) && !/^globalid$/i.test(k) && !/^shape/i.test(k) && !blocked.has(String(k)))
  const ordered = (base: string[]) => base.filter(k => keys.includes(k))
  if (kind === 'ANAGRAFICA') return ordered(DETAIL_DEFAULT_TAB_FIELDS.anagrafica)
  if (kind === 'VIOLAZIONE') return ordered(DETAIL_DEFAULT_TAB_FIELDS.violazione)
  if (kind === 'LUOGHI_DATI') return ordered(DETAIL_LUOGHI_DATI_FIELDS)
  if (kind === 'ALLEGATI') return ordered(DETAIL_DEFAULT_TAB_FIELDS.allegati)
  if (kind === 'ITER') return ordered(DETAIL_DEFAULT_TAB_FIELDS.iterExtra)
  return []
}

// Migra dai vecchi tabFields alle nuove tab
function migrateTabs(tabFields: TabFields, tabs: TabConfig[] | undefined): TabConfig[] {
  let result: TabConfig[] = []

  const normalizeTab = (t: any): any => {
    let f: string[] = []
    if (t?.fields) {
      if (Array.isArray(t.fields)) f = t.fields.map(String).filter(Boolean)
      else if (typeof t.fields.toArray === 'function') f = t.fields.toArray().map(String).filter(Boolean)
      else if (typeof t.fields.toJS === 'function') f = t.fields.toJS().map(String).filter(Boolean)
      else if (typeof t.fields[Symbol.iterator] === 'function') f = Array.from(t.fields as any).map(String).filter(Boolean)
    }

    const rawId = String(t?.id || '').trim()
    const nk = normKey(rawId || t?.label || '')
    const id = (rawId === 'luoghi' || rawId === 'luoghi-dati' || rawId === 'luoghi_dati' || nk === 'luoghi dati')
      ? LUOGHI_DATI_TAB_ID
      : rawId

    const label = (id === 'anagrafica' && String(t?.label || '').trim().toLowerCase() === 'anagrafica')
      ? 'Trasgressore'
      : t?.label

    return { ...t, id, label, fields: f }
  }

  // Se ha già tabs, usa quelle
  if (Array.isArray(tabs) && tabs.length > 0) {
    result = tabs.map(normalizeTab)
  } else {
    // Altrimenti migra dai vecchi tabFields
    result = [
      {
        id: 'anagrafica',
        label: 'Trasgressore',
        fields: tabFields?.anagrafica || []
      },
      {
        id: 'violazione',
        label: 'Violazione',
        fields: tabFields?.violazione || []
      },
      {
        id: LUOGHI_DATI_TAB_ID,
        label: 'Luoghi e dati',
        fields: tabFields?.luoghiDati?.length ? tabFields.luoghiDati : DETAIL_LUOGHI_DATI_FIELDS,
        locked: true,
        hideEmpty: false
      },
      {
        id: 'nota_spese',
        label: 'Nota spese',
        fields: [],
        locked: true,
        hideEmpty: false
      },
      {
        id: 'allegati',
        label: 'Allegati',
        fields: tabFields?.allegati || []
      },
      {
        id: 'iter',
        label: 'Iter',
        fields: tabFields?.iterExtra || [],
        isIterTab: true
      }
    ]
  }

  // Il widget dettaglio non deve esporre una tab Azioni: le azioni sono gestite dal CW gii-azioni.
  result = result.filter(t => t && t.id !== 'azioni')

  // Inietta tab Luoghi e dati se mancante (migrazione config esistenti)
  if (!result.some(t => t.id === LUOGHI_DATI_TAB_ID)) {
    const idxViolazione = result.findIndex(t => t.id === 'violazione')
    const insertAt = idxViolazione >= 0 ? idxViolazione + 1 : Math.min(2, result.length)
    result.splice(insertAt, 0, {
      id: LUOGHI_DATI_TAB_ID,
      label: 'Luoghi e dati',
      fields: tabFields?.luoghiDati?.length ? tabFields.luoghiDati : DETAIL_LUOGHI_DATI_FIELDS,
      locked: true,
      hideEmpty: false
    } as any)
  }

  // Inietta tab Nota spese se mancante (migrazione config esistenti)
  if (!result.some(t => t.id === 'nota_spese')) {
    const idxAllegati = result.findIndex(t => t.id === 'allegati')
    const insertAt = idxAllegati >= 0 ? idxAllegati : result.length
    result.splice(insertAt, 0, { id: 'nota_spese', label: 'Nota spese', fields: [], locked: true, hideEmpty: false })
  }

  // Inietta tab Mappa se mancante (migrazione config esistenti)
  if (!result.some(t => t.id === 'mappa')) {
    result.push({ id: 'mappa', label: 'Mappa', fields: [], locked: true })
  }

  // Ordine logico delle tab di dettaglio. Iter resta sempre in ultima posizione.
  const preferredBeforeIter = ['anagrafica', 'violazione', LUOGHI_DATI_TAB_ID, 'mappa', 'nota_spese', 'allegati']
  const ordered: TabConfig[] = []
  for (const id of preferredBeforeIter) {
    const found = result.find(t => t.id === id)
    if (found) ordered.push(found)
  }
  for (const t of result) {
    const id = String(t?.id || '')
    if (t && id !== 'iter' && !preferredBeforeIter.includes(id) && !ordered.some(x => x.id === t.id)) ordered.push(t)
  }
  const iterTab = result.find(t => t.id === 'iter')
  if (iterTab) ordered.push(iterTab)
  result = ordered

  // Normalizza hideEmpty per tab (retrocompatibilità)
  return result.map(tab => {
    const normalizedHideEmpty =
      (tab as any).hideEmpty != null
        ? Boolean((tab as any).hideEmpty)
        : (tab.id === 'violazione' || tab.id === 'anagrafica' || tab.id === 'allegati')

    if (tab.id === 'nota_spese') {
      return { ...(tab as any), fields: [], locked: true, hideEmpty: false } as any
    }
    if (tab.id === LUOGHI_DATI_TAB_ID) {
      const fields = normalizeFieldList((tab as any).fields)
      const mergedFields = Array.from(new Set([...(fields || []), ...DETAIL_LUOGHI_DATI_FIELDS]))
      return { ...(tab as any), label: 'Luoghi e dati', fields: mergedFields, locked: true, hideEmpty: false } as any
    }
    if (tab.id === 'anagrafica') {
      const rawLabel = String((tab as any).label || '').trim()
      return {
        ...(tab as any),
        label: !rawLabel || rawLabel.toLowerCase() === 'anagrafica' ? 'Trasgressore' : rawLabel,
        hideEmpty: normalizedHideEmpty
      } as any
    }

    return { ...(tab as any), hideEmpty: normalizedHideEmpty } as any
  })
}

type TabButtonBadge =
  | { kind: 'count'; value: number }
  | { kind: 'ratio'; done: number; total: number }

function TabButton (props: { active: boolean; label: string; onClick: () => void; disabled?: boolean; badge?: TabButtonBadge }) {
  const bg = props.active ? '#eaf2ff' : 'rgba(0,0,0,0.02)'
  const bd = props.active ? '#2f6fed' : 'rgba(0,0,0,0.12)'
  const col = props.active ? '#1d4ed8' : '#111827'

  const badge = props.badge
  let badgeEl: React.ReactNode = null
  if (badge?.kind === 'count') {
    badgeEl = (
      <span style={{
        marginLeft: 6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
        fontSize: 11, fontWeight: 800, lineHeight: 1,
        color: '#1d4ed8', background: '#dbeafe', border: '1px solid #93c5fd', flex: '0 0 auto'
      }} title='Numero elementi'>{badge.value}</span>
    )
  } else if (badge?.kind === 'ratio') {
    const incomplete = badge.done < badge.total
    badgeEl = (
      <span style={{
        marginLeft: 6, minWidth: 30, height: 18, padding: '0 6px', borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
        fontSize: 11, fontWeight: 800, lineHeight: 1,
        color: incomplete ? '#92400e' : '#1d4ed8',
        background: incomplete ? '#fef3c7' : '#dbeafe',
        border: incomplete ? '1px solid #f59e0b' : '1px solid #93c5fd',
        flex: '0 0 auto'
      }} title='Nota spese compilate / previste'>{badge.done}/{badge.total}</span>
    )
  }

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
        opacity: props.disabled ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap'
      }}
    >
      <span>{props.label}</span>
      {badgeEl}
    </button>
  )
}

function ReadOnlyPanel (props: {
  title: string
  ui?: any
  rows: Array<{ label: string; value: any; fieldName?: string; multiline?: boolean }>
  emptyText?: string
}) {
    const ui = props.ui ?? {}
    const msgFontSize = Number.isFinite(Number(ui.msgFontSize)) ? Number(ui.msgFontSize) : 12

  const body = !props.rows.length
    ? <div style={{ ...msgStyle('info', msgFontSize) }}>{props.emptyText || 'Configura i campi nelle impostazioni.'}</div>
    : (
      <div style={{ display: 'grid', gap: 0 }}>
        {props.rows.map((r, i) => (
          <DetailRow
            key={i}
            label={r.label}
            value={r.value}
            labelSize={12}
            valueSize={13}
            multiline={!!(r as any).multiline}
          />
        ))}
      </div>
      )

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}
    >
      {props.title
        ? <DetailSectionCard title={props.title}>{body}</DetailSectionCard>
        : body}
    </div>
  )
}



function GeneralCompactRow (props: { label: string; value: any; dateLabel?: string; dateValue?: any; singleValue?: boolean }) {
  const valueText = props.value == null || props.value === '' ? '—' : String(props.value)
  const dateText = props.dateValue == null || props.dateValue === '' ? '—' : String(props.dateValue)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: props.singleValue ? '145px 1fr' : '145px minmax(120px, 1fr) 78px minmax(150px, 0.85fr)',
      columnGap: 10,
      rowGap: 4,
      alignItems: 'center',
      padding: '7px 0',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      minWidth: 0
    }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, lineHeight: 1.25, minWidth: 0 }}>{props.label}</div>
      <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 700, whiteSpace: props.singleValue ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }} title={valueText}>{valueText}</div>
      {!props.singleValue && <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, textAlign: 'right' }}>{props.dateLabel || 'Data e ora:'}</div>}
      {!props.singleValue && <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }} title={dateText}>{dateText}</div>}
    </div>
  )
}

function GeneralCompactPanel (props: {
  area: string
  settore: string
  ufficio: string
  numeroRilevazione: string
  dataRilevazione: string
  numeroRapporto: string
  dataRapporto: string
  numeroVerbale: string
  dataVerbale: string
}) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <DetailSectionCard title="Dati generali">
        <div style={{ display: 'grid', gap: 0 }}>
          <GeneralCompactRow label="Area" value={props.area} singleValue />
          <GeneralCompactRow label="Settore" value={props.settore} singleValue />
          <GeneralCompactRow label="Ufficio" value={props.ufficio} singleValue />
          <GeneralCompactRow label="Rilevazione n." value={props.numeroRilevazione} dateLabel="Data e ora:" dateValue={props.dataRilevazione} />
          <GeneralCompactRow label="Rapporto n." value={props.numeroRapporto} dateLabel="Data e ora:" dateValue={props.dataRapporto} />
          <GeneralCompactRow label="Atto n." value={props.numeroVerbale} dateLabel="Data e ora:" dateValue={props.dataVerbale} />
        </div>
      </DetailSectionCard>
    </div>
  )
}


function normalizeLayerUrlForMatch (raw: any): string {
  return String(raw || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase()
}

function normalizeLayerTitleForMatch (raw: any): string {
  return String(raw || '').trim().toLowerCase().replace(/[\s_\-]+/g, ' ')
}

function getLayerIdFromUrlForMatch (raw: any): string {
  const m = String(raw || '').match(/\/(?:FeatureServer|MapServer)\/(\d+)(?:[/?#]|$)/i)
  return m?.[1] || ''
}

function findRapportiLayers (view: any, opts?: { layerUrl?: string; mapLayerUrl?: string; mapLayerId?: string; mapLayerLayerId?: string; mapLayerTitle?: string }): any[] {
  try {
    const sourceMap = view?.map || view
    const allLayers = sourceMap?.allLayers?.toArray?.() || sourceMap?.allLayers || []
    const featureLayers = (allLayers || []).filter((fl: any) => fl?.type === 'feature')
    const targetUrls = [opts?.mapLayerUrl, opts?.layerUrl].map(normalizeLayerUrlForMatch).filter(Boolean)
    const targetId = String(opts?.mapLayerId || '').trim()
    const targetLayerId = String(opts?.mapLayerLayerId || '').trim()
    const targetTitle = normalizeLayerTitleForMatch(opts?.mapLayerTitle)
    const matches: any[] = []
    const push = (fl: any) => { if (fl && matches.indexOf(fl) < 0) matches.push(fl) }

    if (targetId || targetUrls.length || targetLayerId || targetTitle) {
      for (const fl of featureLayers) {
        const flId = String(fl?.id || '').trim()
        const flUrl = normalizeLayerUrlForMatch(fl?.url)
        const flLayerId = String(fl?.layerId ?? fl?.sourceLayer?.id ?? fl?.sourceLayerId ?? getLayerIdFromUrlForMatch(fl?.url) ?? '').trim()
        const flTitle = normalizeLayerTitleForMatch(fl?.title || fl?.portalItem?.title || fl?.sourceJSON?.title || fl?.sourceJSON?.name)
        if (targetId && flId === targetId) push(fl)
        else if (targetUrls.length && targetUrls.includes(flUrl)) push(fl)
        else if (targetLayerId && flLayerId === targetLayerId && (targetUrls.length === 0 || targetUrls.includes(flUrl))) push(fl)
        else if (targetTitle && flTitle === targetTitle) push(fl)
      }
      if (matches.length) return matches
    }

    for (const fl of featureLayers) {
      const title = normalizeLayerTitleForMatch(fl?.title || fl?.portalItem?.title || fl?.sourceJSON?.title || fl?.sourceJSON?.name)
      if (title.includes('rapporto') && title.includes('infrazioni')) push(fl)
    }
    return matches
  } catch {}
  return []
}

function getMapLayerRuntimeKey (layer: any): string {
  const id = String(layer?.id || '').trim()
  const url = normalizeLayerUrlForMatch(layer?.url)
  const layerId = String(layer?.layerId ?? layer?.sourceLayer?.id ?? layer?.sourceLayerId ?? getLayerIdFromUrlForMatch(layer?.url) ?? '').trim()
  const title = normalizeLayerTitleForMatch(layer?.title || layer?.portalItem?.title || layer?.sourceJSON?.title || layer?.sourceJSON?.name)
  return `${id}|${layerId}|${url}|${title}`
}

function getPointQueryOutFields (layer: any): string[] {
  const oidField = String(layer?.objectIdField || 'OBJECTID')
  const wanted = [oidField, 'OBJECTID', 'latitude', 'lat', 'y', 'longitude', 'lon', 'x']
  const fields = Array.isArray(layer?.fields) ? layer.fields : []
  if (!fields.length) return [oidField]
  const byLower = new Map<string, string>()
  fields.forEach((f: any) => {
    const name = String(f?.name || '').trim()
    if (name) byLower.set(name.toLowerCase(), name)
  })
  const out: string[] = []
  wanted.forEach(name => {
    const real = byLower.get(String(name).toLowerCase())
    if (real && out.indexOf(real) < 0) out.push(real)
  })
  return out.length ? out : [oidField]
}

function getRapportoWhereFromOid (oid: any): string {
  const n = Number(oid)
  return Number.isFinite(n) ? `OBJECTID = ${n}` : '1=0'
}

function getLayerBaseDefinitionExpression (layer: any): string {
  try {
    const key = '__giiBaseDefinitionExpression'
    if (!Object.prototype.hasOwnProperty.call(layer, key)) layer[key] = String(layer?.definitionExpression || '').trim()
    return String(layer[key] || '').trim()
  } catch {}
  return ''
}

function applyRapportiLayerDefinitionFilter (layers: any[], where: string) {
  ;(layers || []).forEach((layer: any) => {
    try {
      if (!layer) return
      const baseWhere = getLayerBaseDefinitionExpression(layer)
      layer.definitionExpression = baseWhere ? `(${baseWhere}) AND (${where})` : where
    } catch {}
  })
}

function applyRapportiLayerViewEffect (layerViews: any[], where: string) {
  ;(layerViews || []).forEach((lv: any) => {
    try { lv.featureEffect = { filter: { where }, excludedEffect: 'opacity(0)' } } catch {}
  })
}

function MapTabContent (props: {
  oid: number | null
  layerUrl: string
  hasSel: boolean
  mapCfg: {
    basemap: string; centerLon: number; centerLat: number; initZoom: number; pointZoom: number
    markerColor: string; markerSize: number; markerOutlineColor: string; markerOutlineWidth: number
    showZoom: boolean; showAttribution: boolean; showScaleBar: boolean; showCompass: boolean
    showPopup?: boolean; showHome?: boolean; showFullscreen?: boolean; showLayerList?: boolean
    webMapItemId?: string; webMapLabel?: string
    mapLayerTitle?: string; mapLayerUrl?: string; mapLayerId?: string; mapLayerLayerId?: string
  }
  selectionSig?: string
}) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const viewRef = React.useRef<any>(null)
  const markerRef = React.useRef<any>(null)
  const targetLayerViewRefs = React.useRef<any[]>([])
  const targetLayerViewCacheRef = React.useRef<Record<string, any>>({})
  const defaultViewpointRef = React.useRef<any>(null)
  const fullscreenWidgetRef = React.useRef<any>(null)
  const [status, setStatus] = React.useState<'loading' | 'ok' | 'nogeom' | 'error'>('loading')
  const [viewReadyTick, setViewReadyTick] = React.useState(0)
  const [mapInstanceKey, setMapInstanceKey] = React.useState(0)
  const mc = props.mapCfg
  const latestFilterWhereRef = React.useRef<string>('1=0')
  latestFilterWhereRef.current = props.hasSel && props.oid != null ? getRapportoWhereFromOid(props.oid) : '1=0'

  const hexToRgba = (hex: string, alpha = 255): number[] => {
    const h = hex.replace('#', '')
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16), alpha]
    if (h.length >= 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), alpha]
    return [220, 38, 38, alpha]
  }

  React.useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        const [MapView, Map, WebMap] = await Promise.all([
          loadEsriModule<any>('esri/views/MapView'),
          loadEsriModule<any>('esri/Map'),
          loadEsriModule<any>('esri/WebMap')
        ])
        if (cancelled || !containerRef.current) return
        const uiComponents: string[] = []
        if (mc.showZoom) uiComponents.push('zoom')
        if (mc.showAttribution) uiComponents.push('attribution')
        if (mc.showCompass) uiComponents.push('compass')
        const map = mc.webMapItemId
          ? new WebMap({ portalItem: { id: String(mc.webMapItemId) } })
          : new Map({ basemap: mc.basemap || 'topo-vector' })
        try { if (typeof map?.load === 'function') await map.load() } catch {}
        try {
          const initialLayers = findRapportiLayers(map, {
            layerUrl: props.layerUrl,
            mapLayerUrl: mc.mapLayerUrl,
            mapLayerId: mc.mapLayerId,
            mapLayerLayerId: mc.mapLayerLayerId,
            mapLayerTitle: mc.mapLayerTitle
          })
          applyRapportiLayerDefinitionFilter(initialLayers, latestFilterWhereRef.current)
        } catch {}
        const view = new MapView({
          container: containerRef.current,
          map,
          center: [mc.centerLon || 9.0, mc.centerLat || 39.5],
          zoom: mc.initZoom || 8,
          ui: { components: uiComponents }
        })
        await view.when()
        try { if (mc.basemap && view.map) view.map.basemap = mc.basemap } catch {}
        try {
          const builderVp = view.map?.initialViewProperties?.viewpoint
          defaultViewpointRef.current = builderVp ? builderVp.clone() : (view.viewpoint ? view.viewpoint.clone() : null)
        } catch {
          defaultViewpointRef.current = view.viewpoint ? view.viewpoint.clone() : null
        }
        if (cancelled) { view.destroy(); return }
        if (mc.showHome) {
          try {
            const Home = await loadEsriModule<any>('esri/widgets/Home')
            const home = new Home({ view })
            view.ui.add(home, 'top-left')
          } catch {}
        }
        let FullscreenCtor: any = null
        const recreateFullscreenWidget = () => {
          try {
            if (!mc.showFullscreen) return
            if (!FullscreenCtor) return
            const current = fullscreenWidgetRef.current
            if (current) {
              try { view.ui.remove(current) } catch {}
              try { current.destroy?.() } catch {}
              fullscreenWidgetRef.current = null
            }
            const fs = new FullscreenCtor({ view, element: wrapperRef.current || containerRef.current })
            fullscreenWidgetRef.current = fs
            view.ui.add(fs, 'top-left')
          } catch {}
        }
        if (mc.showFullscreen) {
          try {
            FullscreenCtor = await loadEsriModule<any>('esri/widgets/Fullscreen')
            recreateFullscreenWidget()
          } catch {}
        }

        const syncViewAfterFullscreenChange = () => {
          try {
            const v = viewRef.current || view
            if (!v) return
            const inFs = !!((document as any).fullscreenElement || (document as any).webkitFullscreenElement)
            const doResize = () => {
              try { v.container = containerRef.current || v.container } catch {}
              try { v.resize() } catch {}
              try { v.requestRender?.() } catch {}
            }
            try { window.requestAnimationFrame(doResize) } catch { doResize() }
            window.setTimeout(doResize, 60)
            window.setTimeout(doResize, 180)
            if (!inFs) {
              window.setTimeout(() => {
                try { setMapInstanceKey(k => k + 1) } catch {}
                try { recreateFullscreenWidget() } catch {}
                try { setViewReadyTick(t => t + 1) } catch {}
                try {
                  if (targetLayerViewRefs.current.length) {
                    applyRapportiLayerViewEffect(targetLayerViewRefs.current, latestFilterWhereRef.current)
                  }
                } catch {}
              }, 40)
              window.setTimeout(() => {
                try { recreateFullscreenWidget() } catch {}
                try {
                  if (targetLayerViewRefs.current.length) {
                    applyRapportiLayerViewEffect(targetLayerViewRefs.current, latestFilterWhereRef.current)
                  }
                } catch {}
              }, 220)
            }
          } catch {}
        }
        try {
          document.addEventListener('fullscreenchange', syncViewAfterFullscreenChange)
          document.addEventListener('webkitfullscreenchange' as any, syncViewAfterFullscreenChange as any)
          ;(view as any).__giiFullscreenSync = syncViewAfterFullscreenChange
        } catch {}
        if (mc.showLayerList) {
          try {
            const [LayerList, Expand] = await Promise.all([
              loadEsriModule<any>('esri/widgets/LayerList'),
              loadEsriModule<any>('esri/widgets/Expand')
            ])
            const layerList = new LayerList({ view })
            const expand = new Expand({
              view,
              content: layerList,
              expandIconClass: 'esri-icon-layer-list',
              mode: 'floating',
              expanded: false
            })
            view.ui.add(expand, 'top-right')
          } catch {}
        }
        if (mc.showScaleBar) {
          try {
            const ScaleBar = await loadEsriModule<any>('esri/widgets/ScaleBar')
            const sb = new ScaleBar({ view, unit: 'metric' })
            view.ui.add(sb, 'bottom-left')
          } catch {}
        }
        viewRef.current = view
        setViewReadyTick(t => t + 1)
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      try {
        if (targetLayerViewRefs.current.length) {
          targetLayerViewRefs.current.forEach((lv: any) => { try { lv.featureEffect = { filter: { where: '1=1' }, excludedEffect: '' } } catch {} })
        }
      } catch {}
      try {
        const fsSync = (viewRef.current as any)?.__giiFullscreenSync
        if (fsSync) {
          document.removeEventListener('fullscreenchange', fsSync)
          document.removeEventListener('webkitfullscreenchange' as any, fsSync as any)
        }
      } catch {}
      try {
        const fs = fullscreenWidgetRef.current
        if (fs) {
          try { viewRef.current?.ui?.remove?.(fs) } catch {}
          try { fs.destroy?.() } catch {}
          fullscreenWidgetRef.current = null
        }
      } catch {}
      if (viewRef.current) {
        try { viewRef.current.destroy() } catch {}
        viewRef.current = null
      }
      targetLayerViewRefs.current = []
      targetLayerViewCacheRef.current = {}
      defaultViewpointRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const view = viewRef.current
    if (!view) return
    let cancelled = false

    const clearMapSelection = async (hideAll = false, resetToDefault = false) => {
      try { view.graphics?.removeAll?.() } catch {}
      markerRef.current = null
      try { view.popup?.close?.() } catch {}
      const where = hideAll ? '1=0' : '1=1'
      try {
        const rapportiLayers = findRapportiLayers(view, {
          layerUrl: props.layerUrl,
          mapLayerUrl: mc.mapLayerUrl,
          mapLayerId: mc.mapLayerId,
          mapLayerLayerId: mc.mapLayerLayerId,
          mapLayerTitle: mc.mapLayerTitle
        })
        applyRapportiLayerDefinitionFilter(rapportiLayers, where)
      } catch {}
      try {
        if (targetLayerViewRefs.current.length) {
          if (hideAll) applyRapportiLayerViewEffect(targetLayerViewRefs.current, '1=0')
          else targetLayerViewRefs.current.forEach((lv: any) => { try { lv.featureEffect = { filter: { where: '1=1' }, excludedEffect: '' } } catch {} })
        }
      } catch {}
      if (!hideAll) targetLayerViewRefs.current = []
      if (resetToDefault) {
        try { if (defaultViewpointRef.current) await view.goTo(defaultViewpointRef.current, { duration: 400 }) } catch {}
      }
    }

    if (!props.hasSel || props.oid == null || !props.layerUrl) {
      void clearMapSelection(true, false)
      setStatus('loading')
      return () => { cancelled = true }
    }

    setStatus('loading')
    ;(async () => {
      try {
        const [FeatureLayer, Graphic, SimpleMarkerSymbol, Point] = await Promise.all([
          loadEsriModule<any>('esri/layers/FeatureLayer'),
          loadEsriModule<any>('esri/Graphic'),
          loadEsriModule<any>('esri/symbols/SimpleMarkerSymbol'),
          loadEsriModule<any>('esri/geometry/Point')
        ])

        const oidWhere = getRapportoWhereFromOid(props.oid)
        const rapportiLayers = findRapportiLayers(view, {
          layerUrl: props.layerUrl,
          mapLayerUrl: mc.mapLayerUrl,
          mapLayerId: mc.mapLayerId,
          mapLayerLayerId: mc.mapLayerLayerId,
          mapLayerTitle: mc.mapLayerTitle
        })
        applyRapportiLayerDefinitionFilter(rapportiLayers, oidWhere)
        applyRapportiLayerViewEffect(targetLayerViewRefs.current, oidWhere)
        let feature: any = null

        if (rapportiLayers.length) {
          const nextLayerViews: any[] = []
          for (const lyr of rapportiLayers) {
            try {
              const key = getMapLayerRuntimeKey(lyr)
              let lv = targetLayerViewCacheRef.current[key]
              if (!lv) {
                lv = await view.whenLayerView(lyr)
                if (lv) targetLayerViewCacheRef.current[key] = lv
              }
              if (cancelled) return
              if (lv && nextLayerViews.indexOf(lv) < 0) {
                nextLayerViews.push(lv)
                try { lv.featureEffect = { filter: { where: oidWhere }, excludedEffect: 'opacity(0)' } } catch {}
              }
            } catch {}
          }
          targetLayerViewRefs.current = nextLayerViews

          const queryLayer = rapportiLayers[0]
          try {
            const q = queryLayer.createQuery ? queryLayer.createQuery() : {}
            q.where = oidWhere
            q.outFields = getPointQueryOutFields(queryLayer)
            q.returnGeometry = true
            const res = await queryLayer.queryFeatures(q)
            feature = res?.features?.[0] || null
          } catch {}
        }

        if (!feature) {
          const fl = new FeatureLayer({ url: props.layerUrl })
          if (typeof fl?.load === 'function') await fl.load()
          const q = fl.createQuery ? fl.createQuery() : {}
          q.where = oidWhere
          q.outFields = getPointQueryOutFields(fl)
          q.returnGeometry = true
          const res = await fl.queryFeatures(q)
          feature = res?.features?.[0] || null
        }

        if (cancelled) return

        const geom = feature?.geometry
        const gx = geom ? (geom.x ?? geom.longitude ?? 0) : 0
        const gy = geom ? (geom.y ?? geom.latitude ?? 0) : 0
        const gValid = !!geom && !(Number(gx) === 0 && Number(gy) === 0)

        let targetGeom: any = gValid ? geom : null
        if (!targetGeom && feature?.attributes) {
          const attrLat = Number(feature.attributes.latitude ?? feature.attributes.lat ?? feature.attributes.y ?? 0)
          const attrLon = Number(feature.attributes.longitude ?? feature.attributes.lon ?? feature.attributes.x ?? 0)
          if (attrLat !== 0 && attrLon !== 0) {
            targetGeom = { type: 'point', longitude: attrLon, latitude: attrLat, spatialReference: { wkid: 4326 } }
          }
        }

        if (!targetGeom) {
          await clearMapSelection(true, true)
          setStatus('nogeom')
          return
        }

        let x = targetGeom.longitude ?? targetGeom.x
        let y = targetGeom.latitude ?? targetGeom.y
        if (targetGeom.spatialReference?.wkid === 102100 || targetGeom.spatialReference?.wkid === 3857) {
          try {
            const wmu = await loadEsriModule<any>('esri/geometry/support/webMercatorUtils')
            const g = wmu.webMercatorToGeographic(targetGeom)
            if (g) { x = g.x; y = g.y; targetGeom = g }
          } catch {}
        }

        if (cancelled) return

        if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) {
          await clearMapSelection(true, true)
          setStatus('nogeom')
          return
        }

        try {
          if (targetLayerViewRefs.current.length) {
            applyRapportiLayerViewEffect(targetLayerViewRefs.current, oidWhere)
          }
        } catch {}

        const pt = new Point({ longitude: x, latitude: y, spatialReference: { wkid: 4326 } })
        const sym = new SimpleMarkerSymbol({
          style: 'circle',
          color: hexToRgba(mc.markerColor || '#dc2626', 220),
          size: mc.markerSize || 18,
          outline: { color: hexToRgba(mc.markerOutlineColor || '#ffffff', 255), width: mc.markerOutlineWidth || 2.5 }
        })
        const marker = new Graphic({ geometry: pt, symbol: sym, attributes: { OBJECTID: props.oid } })
        view.graphics?.removeAll?.()
        view.graphics?.add?.(marker)
        markerRef.current = marker

        try { await view.goTo({ target: targetGeom, zoom: mc.pointZoom || 19 }, { duration: 800 }) } catch {}
        if (mc.showPopup !== false) {
          try {
            view.popup?.open?.({
              location: pt,
              title: `Rapporto ${String(props.oid ?? '')}`.trim(),
              content: `OID: ${String(props.oid ?? '')}`
            })
          } catch {}
        } else {
          try { view.popup?.close?.() } catch {}
        }
        setStatus('ok')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => { cancelled = true }
  }, [props.hasSel, props.oid, props.layerUrl, props.selectionSig, viewReadyTick, mc.pointZoom, mc.markerColor, mc.markerSize, mc.markerOutlineColor, mc.markerOutlineWidth, mc.showPopup, mc.mapLayerTitle, mc.mapLayerUrl, mc.mapLayerId, mc.mapLayerLayerId])

  return (
    <div key={mapInstanceKey} ref={wrapperRef} style={{ width: '100%', flex: '1 1 auto', minHeight: 0, position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}/>
      {status === 'loading' && props.hasSel && (
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.9)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#374151' }}>
          Caricamento posizione…
        </div>
      )}
      {status === 'nogeom' && (
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.9)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#b45309' }}>
          Nessun punto impostato per questo rapporto.
        </div>
      )}
      {status === 'error' && (
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.9)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#b42318' }}>
          Errore caricamento mappa.
        </div>
      )}
    </div>
  )
}



type IterUtenteEntry = {
  username: string
  fullName: string
  ruoloCod: string
  areaCod: string
  settoreCod: string
}

let _iterUtentiMapCache: Map<string, IterUtenteEntry> | null = null
let _iterUtentiMapLoading = false

function normalizeIterUsernameKey (raw: any): string {
  return String(raw ?? '').trim().toLowerCase()
}

function buildIterFullNameFromAttrs (attrs: any): string {
  const direct = String(pickAttrCI(attrs, ['full_name', 'nome_completo', 'nominativo']) || '').trim()
  if (direct) return direct
  const nome = String(pickAttrCI(attrs, ['nome']) || '').trim()
  const cognome = String(pickAttrCI(attrs, ['cognome']) || '').trim()
  return [nome, cognome].filter(Boolean).join(' ').trim()
}

function isIterRoleSectorPlaceholder (raw: any): boolean {
  const s = String(raw ?? '').trim().toUpperCase().replace(/[\s_-]+/g, ' ')
  if (!s) return false
  if (/^(TR|IT|IA|CS|RIT|RIA|DT|DA|ADMIN)(?: (?:D[1-6]|DS|CR|GI|AGR|TEC|AMM))?$/.test(s)) return true
  if (/^(TECNICO RILEVATORE|ISTRUTTORE TECNICO|CAPO SETTORE|RESPONSABILE ISTRUTTORIA TECNICA|RESPONSABILE ISTRUTTORIA AMMINISTRATIVA|DIRETTORE D AREA|DIRETTORE AREA)$/.test(s)) return true
  return false
}

function resolveIterPersonName (raw: any, utentiMap?: Map<string, IterUtenteEntry> | null): string {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  const entry = utentiMap?.get(normalizeIterUsernameKey(text))
  const fullName = String(entry?.fullName || '').trim()
  if (fullName) return fullName
  return isIterRoleSectorPlaceholder(text) ? '' : text
}


function resolveIterPersonRoleCode (raw: any, utentiMap?: Map<string, IterUtenteEntry> | null): string {
  const text = String(raw ?? '').trim()
  if (!text || !utentiMap || utentiMap.size === 0) return ''
  const entry = utentiMap.get(normalizeIterUsernameKey(text))
  return normalizeRuoloCod(entry?.ruoloCod)
}

function findIterRecipientNameByRole (roleRaw: any, areaRaw: any, settoreRaw: any, utentiMap?: Map<string, IterUtenteEntry> | null): string {
  if (!utentiMap || utentiMap.size === 0) return ''

  const role = normalizeRuoloCod(roleRaw)
  if (!role) return ''

  const area = normalizeAreaCod(areaRaw)
  const settore = normalizeSettoreCod(settoreRaw)
  const matches: string[] = []

  utentiMap.forEach(entry => {
    if (!entry) return
    if (normalizeRuoloCod(entry.ruoloCod) !== role) return

    const entryArea = normalizeAreaCod(entry.areaCod)
    const entrySettore = normalizeSettoreCod(entry.settoreCod)

    if (area && entryArea && entryArea !== area) return
    if ((role === 'TR' || role === 'IT' || role === 'CS') && settore && entrySettore && entrySettore !== settore) return

    const label = String(entry.fullName || entry.username || '').trim()
    if (label && !matches.includes(label)) matches.push(label)
  })

  return matches.length === 1 ? matches[0] : ''
}

function formatIterQualificaLabel (raw: any): string {
  const original = String(raw ?? '').trim()
  const s = original.toUpperCase().replace(/[\s-]+/g, '_')
  if (!s) return ''
  if (s === 'IA' || s.includes('ISTRUTTORE_AMMINISTRATIVO')) return 'Istruttore amministrativo'
  if (s === 'RIA' || s.includes('RESPONSABILE_ISTRUTTORIA_AMMINISTRATIVA')) return 'Responsabile istruttoria amministrativa'
  if (s === 'DA' || s.includes('AA_GG') || s.includes('PROGRAMMAZIONE_FINANZIARIA')) return 'Direttore Area AA. GG. e P.F.'
  if (s === 'TR' || s.includes('TECNICO_RILEVATORE')) return 'Tecnico rilevatore'
  if (s === 'IT' || s.includes('ISTRUTTORE_TECNICO')) return 'Istruttore tecnico'
  if (s === 'CS' || s.includes('CAPO_SETTORE')) return 'Capo Settore'
  if (s === 'RIT' || s.includes('RESPONSABILE_ISTRUTTORIA_TECNICA')) return 'Responsabile istruttoria tecnica'
  if (s === 'RIA' || s.includes('RESPONSABILE_ISTRUTTORIA_AMMINISTRATIVA')) return 'Responsabile istruttoria amministrativa'
  if (s === 'DT' || s.includes('DIRETTORE')) return 'Direttore d’Area'
  if (s === 'ADMIN' || s.includes('AMMINISTRATORE')) return 'Amministratore'
  return original
}

type CicloRecord = {
  numero_ciclo_ruolo: number | null
  ruolo_competente: string
  utente_operatore: string
  stato_record: string
  evento_apertura: string
  dt_apertura: number | null
  evento_chiusura: string
  dt_chiusura: number | null
  ruolo_destinatario: string
  utente_destinatario: string
  note_chiusura: string
  area: string
  settore: string
  fase: string
  num_campi_modificati: number | null
  campi_modificati: string
  riepilogo_ciclo: string
}

const EVENTO_LABELS: Record<string, string> = {
  CREAZIONE: 'Creazione rilevazione',
  ISTRUTTORIA_TRASMESSA: 'Istruttoria trasmessa',
  PROPOSTA_CONTESTAZIONE_APPROVATA: 'Istruttoria amministrativa approvata',
  INTEGRAZIONE_TRASMESSA: 'Integrazione trasmessa',
  INTEGRAZIONE: 'Richiesta integrazione',
  RAPPORTO_APPROVATO: 'Rapporto approvato',
  PRESA_IN_CARICO: 'Presa in carico',
  ASSEGNAZIONE_IT: 'Assegnazione IT',
  ASSEGNAZIONE_IA: 'Assegnazione Istruttore amministrativo',
  RESPINTA: 'Respinta',
  ELIMINAZIONE: 'Eliminazione'
}

function formatEventoFallback (code: string): string {
  const text = String(code || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('it-IT')

  if (!text) return '—'

  return text.charAt(0).toLocaleUpperCase('it-IT') + text.slice(1)
}

function formatEvento (code: string): string {
  if (!code) return '—'
  return EVENTO_LABELS[code] || formatEventoFallback(code)
}

function formatCycleTitleEvento (c: CicloRecord, cycleLabelNumber: number): string {
  const apertura = String(c?.evento_apertura || '').trim().toUpperCase()
  const chiusura = String(c?.evento_chiusura || '').trim().toUpperCase()
  const ruolo = normalizeRuoloCod(c?.ruolo_competente)

  if (
    cycleLabelNumber === 1 &&
    apertura === 'CREAZIONE' &&
    chiusura === 'ISTRUTTORIA_TRASMESSA' &&
    (ruolo === 'TR' || ruolo === 'IT')
  ) {
    return 'Nuova rilevazione trasmessa'
  }

  return formatEvento(c.evento_chiusura || c.evento_apertura)
}

function cleanIterNoteForDisplay (raw: any): string {
  const text = String(raw ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!text) return ''

  // Le assegnazioni sono già rappresentate da titolo ciclo e destinatario.
  // Nel log storico possono però contenere note automatiche tipo:
  // "Assegna Istruttore tecnico: <nominativo> (<username>)".
  const assignmentOnly = text.match(/^\s*(Riapertura amministrativa n\.\s*\d+\.\s*)?(?:(?:Assegna|Assegnazione)\s+(?:Istruttore\s+tecnico|Tecnico\s+Istruttore\s+amministrativo)|(?:Istruttore\s+tecnico|Tecnico\s+Istruttore\s+amministrativo)\s+assegnato)\s*[:.-]/i)
  if (assignmentOnly) {
    return String(assignmentOnly[1] || '').trim()
  }

  const paragraphs = text
    .split(/\n\s*\n/g)
    .map(p => p.trim())
    .filter(Boolean)

  const cleaned = paragraphs.filter(paragraph => {
    const normalized = paragraph.replace(/\s+/g, ' ').trim()
    if (/^A seguito della (verifica svolta|valutazione di competenza),/i.test(normalized)) return false
    if (/^Si attesta la conformità della pratica/i.test(normalized)) return false
    if (/^Si condivide l['’]istruttoria amministrativa proposta/i.test(normalized)) return false
    return true
  })

  return cleaned.join('\n\n').trim()
}

function formatRuoloIter (raw: any): string {
  const code = normalizeRuoloCod(raw)
  return code || String(raw || '')
}

function formatAreaIter (raw: any): string {
  const code = normalizeAreaCod(raw)
  return code || String(raw || '')
}

function formatSettoreIter (raw: any): string {
  const code = normalizeSettoreCod(raw)
  return code || String(raw || '')
}

function normalizeOriginePraticaCod (raw: any): 'TR' | 'IT' | '' {
  const s = String(raw ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === '1' || s === 'TR' || s.includes('TECNICO RILEVATORE')) return 'TR'
  if (s === '2' || s === 'IT' || s.includes('ISTRUTTORE TECNICO')) return 'IT'
  return ''
}

const ITER_TECHNICAL_MODIFIED_FIELDS = new Set([
  'GII_rim',
  'GII_trasm',
  'GII_da',
  'GII_a',
  'GII_dt',
  'GII_arch',

  // Metadati automatici di assegnazione: sono già rappresentati da evento/destinatario
  // dell'iter e non devono comparire tra i campi effettivamente modificati dall'operatore.
  'it_assegnato_username',
  'it_assegnato_nome',
  'it_assegnato_da',
  'dt_assegnazione_it',
  'ia_assegnato_username',
  'ia_assegnato_nome',
  'ia_assegnato_da',

  // Numerazioni e date formali assegnate automaticamente dalle azioni di workflow:
  // restano visibili nei Dati generali / nell'evento di iter, ma non sono campi
  // editati manualmente dall'operatore e quindi non vanno elencati tra i campi modificati.
  'numero_rapporto_tecnico',
  'data_rapporto_tecnico',
  'accertamento_numero',
  'accertamento_data',

  // Campi automatici di stato/esito/presa in carico del workflow.
  'stato_TR',
  'stato_IT',
  'stato_CS',
  'stato_RIT',
  'stato_DT',
  'determinazione_stato',
  'dt_stato_TR',
  'dt_stato_IT',
  'dt_stato_CS',
  'dt_stato_RIT',
  'dt_stato_DT',
  'determinazione_data',
  'esito_DT',
  'determinazione_numero',
  'dt_esito_DT',
  'determinazione_trasmessa_firma_il',
  'dt_presa_in_carico_IT',
  'dt_presa_in_carico_CS',
  'dt_presa_in_carico_RIT',
  'dt_presa_in_carico_DT',
  'determinazione_registrata_il',

  'ns_importo_spese_generali',
  'ns_ricalcolata_il',
  'ns_spese_generali_perc',
  'ns_totale_attrezzature_trasporti',
  'ns_totale_complessivo',
  'ns_totale_manodopera',
  'ns_totale_materiali_costruzione',
  'ns_totale_prodotti_finiti',
  'ns_totale_semilavorati'
].map(normKey))

const ITER_TECHNICAL_MODIFIED_ALIASES = new Set([
  'Rim.',
  'Trasm.',
  'IT assegnato da',
  'Assegnazione IT effettuata da',
  'Numero rapporto tecnico',
  'Data rapporto tecnico',
  'Numero atto',
  'Data atto',
  'Username IT assegnato',
  'IT assegnato',
  'Data assegnazione IT',
].map(normKey))

function isTechnicalIterModifiedField (raw: any, alias?: any): boolean {
  const rawText = String(raw ?? '').trim().toLowerCase()
  const rawKey = normKey(raw)
  const aliasKey = normKey(alias)
  if (rawText.startsWith('ns_')) return true
  return ITER_TECHNICAL_MODIFIED_FIELDS.has(rawKey) || ITER_TECHNICAL_MODIFIED_ALIASES.has(rawKey) || ITER_TECHNICAL_MODIFIED_ALIASES.has(aliasKey)
}

function parseModifiedFieldNames (raw: any): string[] {
  return String(raw || '')
    .split(/[;,|\n]+/g)
    .map(s => s.trim())
    .filter(Boolean)
}

const VIOLATION_LABEL_BY_ARTICLE: Record<string, string> = {
  '8': 'Art. 8 - Violazione servizio di reperibilità',
  '12': 'Art. 12 - Negato accesso ai fondi (al personale consortile)',
  '15': 'Art. 15 - Prelievo abusivo d’acqua',
  '16': 'Art. 16 - Presentazione tardiva comunicazione di irrigazione',
  '17': 'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia',
  '27': 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica',
  '28': 'Art. 28 - Violazione prescrizioni del consorzio',
  '29': 'Art. 29 - Violazione termini restituzione attrezzature',
  '30': 'Art. 30 - Danneggiamento e/o perdita attrezzature',
  '31': 'Art. 31 - Mancata segnalazione guasti',
  '32': 'Art. 32 - Negato accesso ai fondi (al consorziato)',
  '33': 'Art. 33 - Inosservanza limiti temporali di prelievo',
  '34': 'Art. 34 - Interferenze',
  '35': 'Art. 35 - Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante',
  '36': 'Art. 36 - Uso attrezzature non autorizzate',
  '37': 'Art. 37 - Uso sistemi di irrigazione incompatibili',
  '39': 'Art. 39 - Danni alle strutture irrigue'
}

function getFieldAliasForIter (fieldName: string, aliasMap?: Record<string, string>): string {
  const raw = String(fieldName || '').trim()
  if (!raw) return ''
  const rawKey = normKey(raw)

  // Alcuni alias del layer derivano ancora dalla struttura storica del Survey
  // e, nell'iter, risultano troppo tecnici o ambigui. Qui li traduciamo
  // in etichette funzionali, comprensibili per l'operatore.
  if (rawKey === normKey('norma_violata1') || rawKey === normKey('Norma violata 1')) return 'Art. 15 - Prelievo abusivo d’acqua'
  if (rawKey === normKey('norma_violata2') || rawKey === normKey('Norma violata 2')) return 'Inosservanza termini presentazione comunicazioni'
  if (rawKey === normKey('norma_violata3') || rawKey === normKey('Norma violata 3')) return 'Altre violazioni (artt. 8, 12, 27-37 e 39)'

  const artMatch = raw.match(/^v_art0*(\d+)$/i)
  if (artMatch) return VIOLATION_LABEL_BY_ARTICLE[String(Number(artMatch[1]))] || `Art. ${Number(artMatch[1])}`
  if (rawKey === normKey('coordinate_punto_mappa')) return 'Coordinate punto in mappa'
  const aliases = aliasMap || {}
  if (aliases[raw]) return String(aliases[raw] || raw)
  for (const name of Object.keys(aliases)) {
    if (normKey(name) === rawKey) return String(aliases[name] || name)
  }
  return raw
}

function firstNonEmptyAttr (data: any, names: string[]): any {
  for (const name of names || []) {
    const v = pickAttrCI(data, [name])
    if (!isEmptyValue(v)) return v
  }
  return null
}

function buildSyntheticCreationCycle (data: any, loggedCicli: CicloRecord[]): CicloRecord | null {
  if (!data) return null
  const hasCreation = (loggedCicli || []).some(c => String(c?.evento_apertura || '').trim().toUpperCase() === 'CREAZIONE')
  if (hasCreation) return null

  const origin = normalizeOriginePraticaCod(pickAttrCI(data, ['origine_pratica', 'Origine_pratica', 'ORIGINE_PRATICA']))
  if (!origin) return null

  const hasLogged = (loggedCicli || []).length > 0
  const isOpenTiCreation = origin === 'IT' && !hasLogged
  const dt = origin === 'TR'
    ? (pickRilevazioneDateValueForDisplay(data) ?? firstNonEmptyAttr(data, ['data_rilevazione', 'CreationDate', 'creationdate', 'created_date', 'start', 'end', 'data_firma']))
    : firstNonEmptyAttr(data, ['dt_presa_in_carico_IT', 'dt_stato_IT', 'data_firma', 'data_rilevazione', 'CreationDate', 'creationdate', 'created_date', 'start', 'end'])
  const user = firstNonEmptyAttr(data, origin === 'IT'
    ? ['it_assegnato_username', 'created_user', 'Creator', 'creator', 'utente_loggato', 'it_assegnato_nome']
    : ['created_user', 'Creator', 'creator', 'tecnico_rilevatore']
  )
  const areaRaw = firstNonEmptyAttr(data, ['area_cod', 'area', 'cod_area'])
  const settoreRaw = firstNonEmptyAttr(data, ['settore_cod', 'settore', 'cod_settore'])

  return {
    numero_ciclo_ruolo: 1,
    ruolo_competente: origin,
    utente_operatore: String(user || ''),
    stato_record: isOpenTiCreation ? 'APERTO' : 'CHIUSO',
    evento_apertura: 'CREAZIONE',
    dt_apertura: dt ?? null,
    evento_chiusura: isOpenTiCreation ? '' : 'ISTRUTTORIA_TRASMESSA',
    dt_chiusura: isOpenTiCreation ? null : (dt ?? null),
    ruolo_destinatario: isOpenTiCreation ? '' : 'CS',
    utente_destinatario: '',
    note_chiusura: '',
    area: formatAreaIter(areaRaw),
    settore: formatSettoreIter(settoreRaw),
    fase: origin,
    num_campi_modificati: 0,
    campi_modificati: '',
    riepilogo_ciclo: 'CREAZIONE: nessun campo aggiornato'
  }
}

function isInitialCreationCycleForDisplay (c: CicloRecord, cycleLabelNumber: number): boolean {
  const apertura = String(c?.evento_apertura || '').trim().toUpperCase()
  const ruolo = normalizeRuoloCod(c?.ruolo_competente)
  return cycleLabelNumber === 1 && apertura === 'CREAZIONE' && (ruolo === 'TR' || ruolo === 'IT')
}

function getInitialCreationOperatorRawForDisplay (data: any, c: CicloRecord, cycleLabelNumber: number): any {
  if (!isInitialCreationCycleForDisplay(c, cycleLabelNumber)) return null

  const ruolo = normalizeRuoloCod(c?.ruolo_competente) || normalizeOriginePraticaCod(pickAttrCI(data, ['origine_pratica', 'Origine_pratica', 'ORIGINE_PRATICA']))

  // Il primo ciclo rappresenta l'autore originario della rilevazione.
  // Non deve usare l'eventuale IT assegnato successivamente dal Capo Settore.
  if (ruolo === 'TR') {
    // Per le pratiche nate da TR il nominativo dell'operatore deve arrivare
    // dall'autore reale della feature/log originario, non dal campo descrittivo
    // tecnico_rilevatore quando questo contiene solo una sigla del tipo "TR D1".
    return firstNonEmptyAttr(data, ['created_user', 'Creator', 'creator', 'tecnico_rilevatore'])
  }

  if (ruolo === 'IT') {
    return firstNonEmptyAttr(data, ['it_assegnato_username', 'created_user', 'Creator', 'creator', 'utente_loggato', 'tecnico_rilevatore', 'it_assegnato_nome'])
  }

  return null
}

function getCycleSortTime (c: CicloRecord): number {
  const n = Number(c?.dt_apertura ?? c?.dt_chiusura ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function sortCicliForDisplay (items: CicloRecord[], sortDir: 'asc' | 'desc'): CicloRecord[] {
  const withIndex = (items || []).map((c, idx) => ({ c, idx }))
  withIndex.sort((a, b) => {
    const ta = getCycleSortTime(a.c)
    const tb = getCycleSortTime(b.c)
    if (ta !== tb) return sortDir === 'asc' ? ta - tb : tb - ta
    return sortDir === 'asc' ? a.idx - b.idx : b.idx - a.idx
  })
  return withIndex.map(x => x.c)
}

function CicliTimeline (props: { globalId: string; hasSel: boolean; sortDir: 'asc' | 'desc'; data?: any; aliasMap?: Record<string, string> }): any {
  const [cicli, setCicli] = React.useState<CicloRecord[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [utentiMap, setUtentiMap] = React.useState<Map<string, IterUtenteEntry> | null>(_iterUtentiMapCache)

  React.useEffect(() => {
    const h = () => setReloadKey(k => k + 1)
    window.addEventListener('gii-log-eventi-cicli-changed', h as EventListener)
    return () => window.removeEventListener('gii-log-eventi-cicli-changed', h as EventListener)
  }, [])

  React.useEffect(() => {
    if (_iterUtentiMapCache) {
      setUtentiMap(_iterUtentiMapCache)
      return
    }
    if (_iterUtentiMapLoading) return
    _iterUtentiMapLoading = true
    ;(async () => {
      try {
        const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
        const fl = new FeatureLayer({ url: GII_UTENTI_URL })
        if (typeof fl?.load === 'function') await fl.load()
        const userFields = fl?.fields || []
        const availableFields = normalizeLogFieldNameSet(userFields)
        const outFields = pickLogOutFields(availableFields, [
          'username', 'full_name', 'nome', 'cognome', 'nome_completo', 'nominativo',
          'ruolo_cod', 'ruoloCod',
          'area', 'area_cod', 'areaCod',
          'settore', 'settore_cod', 'settoreCod'
        ])
        const res = await fl.queryFeatures({
          where: '1=1',
          outFields,
          returnGeometry: false
        })
        const map = new Map<string, IterUtenteEntry>()
        for (const f of res?.features || []) {
          const a = f?.attributes || {}
          const username = String(pickAttrCI(a, ['username']) || '').trim()
          const fullName = buildIterFullNameFromAttrs(a)
          const ruoloCod = normalizeRuoloCod(pickAttrCI(a, ['ruolo_cod', 'ruoloCod']))
          const areaCod = normalizeAreaCod(pickAttrCI(a, ['area_cod', 'areaCod', 'area']))
          const settoreCod = normalizeSettoreCod(pickAttrCI(a, ['settore_cod', 'settoreCod', 'settore']))
          if (username) map.set(normalizeIterUsernameKey(username), { username, fullName, ruoloCod, areaCod, settoreCod })
        }
        _iterUtentiMapCache = map
        setUtentiMap(map)
      } catch (e) {
        console.warn('[GII-Dettaglio] Errore caricamento GII_utenti:', e)
      } finally {
        _iterUtentiMapLoading = false
      }
    })()
  }, [])

  React.useEffect(() => {
    setCicli([]); setError(null)
    if (!props.hasSel || !props.globalId) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
        const fl = new FeatureLayer({ url: GII_LOG_EVENTI_CICLI_URL })
        if (typeof fl?.load === 'function') await fl.load()
        const gid = normGid(props.globalId)
        const logFields = fl?.fields || []
        const availableFields = normalizeLogFieldNameSet(logFields)
        const outFields = pickLogOutFields(availableFields, [
          'numero_ciclo_ruolo', 'ruolo_competente', 'utente_operatore',
          'stato_record', 'evento_apertura', 'dt_apertura',
          'evento_chiusura', 'dt_chiusura', 'ruolo_destinatario',
          'utente_destinatario', 'note_chiusura',
          'area_cod', 'settore_cod', 'area', 'settore', 'fase',
          'num_campi_modificati', 'campi_modificati', 'riepilogo_ciclo'
        ])
        const res = await fl.queryFeatures({
          where: `LOWER(parent_globalid) = '${gid}' OR LOWER(parent_globalid) = '{${gid}}'`,
          outFields,
          orderByFields: [props.sortDir === 'asc' ? 'dt_apertura ASC' : 'dt_apertura DESC'],
          returnGeometry: false
        })
        if (cancelled) return
        const records: CicloRecord[] = (res?.features || []).map((f: any) => {
          const a = f.attributes || f
          const ruoloCompetenteRaw = a.ruolo_competente
          const ruoloDestinatarioRaw = a.ruolo_destinatario
          const areaRaw = a.area_cod || a.area
          const settoreRaw = a.settore_cod || a.settore
          return {
            numero_ciclo_ruolo: a.numero_ciclo_ruolo ?? null,
            ruolo_competente: resolveCodedValueLabelFromFieldNames(logFields, ['ruolo_competente', 'ruolo_cod'], ruoloCompetenteRaw) || formatRuoloIter(ruoloCompetenteRaw),
            utente_operatore: String(a.utente_operatore || ''),
            stato_record: String(a.stato_record || ''),
            evento_apertura: String(a.evento_apertura || ''),
            dt_apertura: a.dt_apertura ?? null,
            evento_chiusura: String(a.evento_chiusura || ''),
            dt_chiusura: a.dt_chiusura ?? null,
            ruolo_destinatario: resolveCodedValueLabelFromFieldNames(logFields, ['ruolo_destinatario', 'ruolo_cod'], ruoloDestinatarioRaw) || formatRuoloIter(ruoloDestinatarioRaw),
            utente_destinatario: String(a.utente_destinatario || ''),
            note_chiusura: String(a.note_chiusura || ''),
            area: resolveCodedValueLabelFromFieldNames(logFields, ['area_cod', 'area'], areaRaw) || formatAreaIter(areaRaw),
            settore: resolveCodedValueLabelFromFieldNames(logFields, ['settore_cod', 'settore'], settoreRaw) || formatSettoreIter(settoreRaw),
            fase: String(a.fase || ''),
            num_campi_modificati: a.num_campi_modificati ?? null,
            campi_modificati: String(a.campi_modificati || ''),
            riepilogo_ciclo: String(a.riepilogo_ciclo || '')
          }
        })
        if (!cancelled) setCicli(records)
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || 'Errore caricamento cronologia'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [props.hasSel, props.globalId, props.sortDir, reloadKey])

  const displayCicli = React.useMemo(() => {
    const synthetic = buildSyntheticCreationCycle(props.data, cicli)
    return sortCicliForDisplay(synthetic ? [...cicli, synthetic] : cicli, props.sortDir)
  }, [cicli, props.data, props.sortDir])

  if (!props.hasSel) return <div style={{ opacity: 0.6, fontSize: 12, padding: 12 }}>Selezionare una pratica.</div>
  if (loading) return <div style={{ opacity: 0.6, fontSize: 12, padding: 12 }}>Caricamento cronologia…</div>
  if (error) return <div style={{ color: '#b42318', fontSize: 12, padding: 12 }}>{error}</div>
  if (displayCicli.length === 0) return <div style={{ opacity: 0.6, fontSize: 12, padding: 12 }}>Nessun evento registrato per questo rapporto.</div>

  const iterLabelValueColumns = '112px minmax(0, 1fr)'

  const rowSt: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: iterLabelValueColumns,
    gap: 8,
    alignItems: 'center',
    padding: '7px 0',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
    boxSizing: 'border-box'
  }
  const lblSt: React.CSSProperties = {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'left',
    fontWeight: 700,
    lineHeight: 1.25
  }
  const valSt: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    wordBreak: 'break-word',
    color: '#1f2937'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 8px 0' }}>
      {displayCicli.map((c, i) => {
        const isOpen = c.stato_record === 'APERTO'
        const borderColor = isOpen ? '#2563eb' : '#d1d5db'
        const bgColor = '#fff'
        const headerBg = isOpen ? '#eaf2ff' : '#f3f4f6'
        const statusLabel = isOpen ? 'In corso' : 'Chiuso'
        const statusColor = isOpen ? '#2563eb' : '#6b7280'
        const cycleLabelNumber = props.sortDir === 'asc' ? (i + 1) : (displayCicli.length - i)
        const initialCreationOperatorRaw = getInitialCreationOperatorRawForDisplay(props.data, c, cycleLabelNumber)
        const operatorRaw = isEmptyValue(initialCreationOperatorRaw) ? c.utente_operatore : initialCreationOperatorRaw
        const qualificaLabel = formatIterQualificaLabel(c.ruolo_competente)
        const isInitialCreationCycle = isInitialCreationCycleForDisplay(c, cycleLabelNumber)
        const initialRole = normalizeRuoloCod(c?.ruolo_competente) || normalizeOriginePraticaCod(pickAttrCI(props.data, ['origine_pratica', 'Origine_pratica', 'ORIGINE_PRATICA']))
        const initialRoleFallbackName = isInitialCreationCycle
          ? findIterRecipientNameByRole(
            initialRole,
            firstNonEmptyAttr(props.data, ['area_cod', 'area', 'cod_area']) || c.area,
            firstNonEmptyAttr(props.data, ['settore_cod', 'settore', 'cod_settore']) || c.settore,
            utentiMap
          )
          : ''
        const operatorRoleFromMap = resolveIterPersonRoleCode(operatorRaw, utentiMap)
        const operatorRoleMismatch = Boolean(isInitialCreationCycle && initialRole && operatorRoleFromMap && operatorRoleFromMap !== initialRole)
        const resolvedOperatorName = operatorRoleMismatch ? '' : resolveIterPersonName(operatorRaw, utentiMap)
        const rawOperatorLabel = (!operatorRoleMismatch && !isEmptyValue(initialCreationOperatorRaw) && !isIterRoleSectorPlaceholder(initialCreationOperatorRaw))
          ? String(initialCreationOperatorRaw || '').trim()
          : ''
        const operatoreLabel = resolvedOperatorName || initialRoleFallbackName || rawOperatorLabel
        const destinatarioQualificaLabel = formatIterQualificaLabel(c.ruolo_destinatario)
        const destinatarioNomeLabel =
          resolveIterPersonName(c.utente_destinatario, utentiMap) ||
          findIterRecipientNameByRole(c.ruolo_destinatario, c.area, c.settore, utentiMap)
        const noteChiusuraLabel = cleanIterNoteForDisplay(c.note_chiusura)
        const cycleActionLabel = formatCycleTitleEvento(c, cycleLabelNumber)

        const campiList = parseModifiedFieldNames(c.campi_modificati)
          .map(campo => ({ raw: campo, alias: getFieldAliasForIter(campo, props.aliasMap) }))
          .filter(item => Boolean(item.alias) && !isTechnicalIterModifiedField(item.raw, item.alias))
          .map(item => item.alias)

        return (
          <div key={i} style={{ border: `1px solid ${borderColor}`, borderRadius: 10, background: bgColor, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937' }}>
                Ciclo {cycleLabelNumber} — {cycleActionLabel}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: isOpen ? 'rgba(37,99,235,0.10)' : 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                {statusLabel}
              </span>
            </div>

            {/* Body */}
            <div style={{ padding: '8px 12px' }}>
              {(operatoreLabel || qualificaLabel) && (
                <div style={rowSt}>
                  <span style={lblSt}>Operatore</span>
                  <span style={valSt}>
                    {operatoreLabel || qualificaLabel}
                    {operatoreLabel && qualificaLabel ? <span style={{ color: '#6b7280', fontWeight: 500 }}> ({qualificaLabel})</span> : null}
                  </span>
                </div>
              )}

              <div style={rowSt}><span style={lblSt}>Apertura</span><span style={valSt}>{formatDateSafe(c.dt_apertura)}</span></div>

              {c.stato_record === 'CHIUSO' && (
                <div style={rowSt}><span style={lblSt}>Chiusura</span><span style={valSt}>{formatDateSafe(c.dt_chiusura)}</span></div>
              )}

              {(destinatarioNomeLabel || destinatarioQualificaLabel) && (
                <div style={rowSt}>
                  <span style={lblSt}>Destinatario</span>
                  <span style={valSt}>
                    {destinatarioNomeLabel || destinatarioQualificaLabel}
                    {destinatarioNomeLabel && destinatarioQualificaLabel ? <span style={{ color: '#6b7280', fontWeight: 500 }}> ({destinatarioQualificaLabel})</span> : null}
                  </span>
                </div>
              )}

              {noteChiusuraLabel && (
                <div style={rowSt}><span style={lblSt}>Note</span><span style={{ ...valSt, whiteSpace: 'pre-wrap' }}>{noteChiusuraLabel}</span></div>
              )}

              {campiList.length > 0 && (
                <div style={{ padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: iterLabelValueColumns, gap: 8, alignItems: 'flex-start' }}>
                    <span style={lblSt}>Campi modificati</span>
                    <span style={{ ...valSt, fontSize: 11 }}>
                      {campiList.length} {campiList.length === 1 ? 'campo' : 'campi'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: iterLabelValueColumns, gap: 8, marginTop: 6 }}>
                    <span />
                    <div style={{ border: '1px solid rgba(209,213,219,0.95)', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
                      <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.35, whiteSpace: 'normal' }}>
                        {campiList.join('; ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Riepilogo tecnico omesso: i codici evento sono già tradotti nel titolo,
                  e i campi effettivamente modificati sono mostrati nella sezione dedicata. */}
            </div>
          </div>
        )
      })}
    </div>
  )
}


type NsdCategory = 'AT' | 'PR' | 'RU' | 'SL' | 'PF' | 'RA'
type NsdSource = 'REGIONE' | 'INTERNO' | 'NUOVI PREZZI'
type NsdDetailRow = {
  objectid: number
  categoria_costo: NsdCategory
  origine_voce_snapshot: NsdSource
  codice_voce_snapshot: string
  descrizione_snapshot: string
  unita_misura_snapshot: string
  prezzo_unitario_snapshot: number
  quantita: number
  importo_riga: number
  anno_prezzario_snapshot?: number | null
  ordine: number
  note: string
  codice_casistica: string
  riferimento_attrezzatura_id?: string | null
  matricola_snapshot?: string | null
  cauzione_decurtata?: boolean
}
type NsdSummary = {
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

// Le 5 categorie "generiche" con lo stesso formato colonne (Origine/Codice/Descrizione/UM/Qtà/Prezzo/Importo).
// RA (Risarcimento attrezzatura) ha colonne diverse (Matricola/Cauzione) e viene renderizzata a parte.
const NSD_CATEGORIES: readonly NsdCategory[] = ['AT', 'PR', 'RU', 'SL', 'PF'] as const
const NSD_CATEGORY_LABELS: Record<NsdCategory, string> = {
  AT: 'Attrezzature e trasporti',
  PR: 'Materiali da costruzione',
  RU: 'Risorse umane',
  SL: 'Semilavorati',
  PF: 'Prodotti finiti',
  RA: 'Attrezzature'
}

const NSD_UNLINKED_CASISTICA = '__GII_NSD_NON_COLLEGATA__'
const NSD_RECUPERABLE_TESSERA_META_CODE = '__GII_TESSERA_RECUPERABILE__'

function nsdIsRecuperableTesseraMetaRow (row: NsdDetailRow | null | undefined): boolean {
  return String(row?.codice_voce_snapshot || '').trim() === NSD_RECUPERABLE_TESSERA_META_CODE &&
    nsdNormalizeCasistica(row?.codice_casistica) === 'C104_ATTREZZATURE_DANNEGGIATE' &&
    !!String(row?.riferimento_attrezzatura_id || '').trim()
}

function nsdAttrezzaturaInstanceTipoCode (instanceId: string): string {
  const idx = String(instanceId || '').indexOf('::')
  return idx >= 0 ? instanceId.slice(0, idx) : String(instanceId || '')
}
const NSD_CASISTICA_INFO: Record<string, { label: string; order: number }> = {
  C100_REPERIBILITA: { label: 'Art. 8 - Violazione servizio di reperibilità', order: 8 },
  C101_SPRECO_ACQUA: { label: 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica', order: 27 },
  C104_ATTREZZATURE_DANNEGGIATE: { label: 'Art. 30 - Danneggiamento e/o perdita attrezzature', order: 30 },
  C113_DANNI_STRUTTURE_IRRIGUE: { label: 'Art. 39 - Danni alle strutture irrigue', order: 39 }
}

function nsdNormalizeCasistica (v: any): string {
  const s = String(v || '').trim().toUpperCase()
  return s || NSD_UNLINKED_CASISTICA
}

function nsdCasisticaInfo (codiceCasistica: string): { label: string; order: number; isUnlinked: boolean } {
  const key = nsdNormalizeCasistica(codiceCasistica)
  if (key === NSD_UNLINKED_CASISTICA) {
    return { label: 'Nota spese non collegata a violazione', order: 9999, isUnlinked: true }
  }
  const known = NSD_CASISTICA_INFO[key]
  if (known) return { ...known, isUnlinked: false }
  return { label: 'Nota spese collegata a casistica non riconosciuta', order: 9998, isUnlinked: false }
}

function nsdTruthyFlag (v: any): boolean {
  if (v == null || v === '') return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  const s = String(v).trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'si' || s === 'sì' || s === 'yes' || s === 'x' || s === '✓'
}

function nsdSplitMulti (v: any): string[] {
  if (Array.isArray(v)) return v.map(x => String(x || '').trim()).filter(Boolean)
  const s = String(v || '').trim()
  if (!s) return []
  return s.split(/[;,|]/g).map(x => x.trim()).filter(Boolean)
}

function nsdHasArticleCode (data: any, art: string): boolean {
  const needle = `ART${String(art).replace(/\D/g, '')}`
  const rawValues = [
    nsdPickAttrCI(data, [`v_art${String(art).padStart(2, '0')}`, `v_art${art}`]),
    ...nsdSplitMulti(nsdPickAttrCI(data, ['norma_violata3', 'norme_violata3', 'altre_violazioni']))
  ]
  return rawValues.some(v => {
    if (nsdTruthyFlag(v)) return true
    const s = String(v || '').replace(/[\s._-]/g, '').toUpperCase()
    return s.includes(needle) || s === String(art)
  })
}

function nsdExpectedCasisticheFromData (data: any): string[] {
  const items: Array<{ code: string; order: number }> = []
  if (nsdHasArticleCode(data, '8')) items.push({ code: 'C100_REPERIBILITA', order: 8 })
  if (nsdHasArticleCode(data, '27')) items.push({ code: 'C101_SPRECO_ACQUA', order: 27 })
  if (nsdHasArticleCode(data, '30')) items.push({ code: 'C104_ATTREZZATURE_DANNEGGIATE', order: 30 })
  if (nsdHasArticleCode(data, '39')) items.push({ code: 'C113_DANNI_STRUTTURE_IRRIGUE', order: 39 })
  const seen = new Set<string>()
  return items
    .sort((a, b) => a.order - b.order)
    .map(x => x.code)
    .filter(code => {
      if (seen.has(code)) return false
      seen.add(code)
      return true
    })
}
const NSD_PARENT_SUMMARY_FIELDS = [
  'GlobalID', 'globalid',
  'ns_totale_attrezzature_trasporti',
  'ns_totale_materiali_costruzione',
  'ns_totale_manodopera',
  'ns_totale_semilavorati',
  'ns_totale_prodotti_finiti',
  'ns_spese_generali_perc',
  'ns_importo_spese_generali',
  'ns_totale_complessivo',
  'ns_ricalcolata_il',
  'attrezzature_risarcimento_dettaglio',
  'attrezzature_risarcimento_importo',
  'attrezzature_cauzione_presente',
  'attrezzature_cauzione_decurtata',
  'attrezzature_importo_netto'
]
const __giiNsdLayerCache: Record<string, any> = {}

function nsdSafeNum (v: any, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function nsdRound (v: number, decimals = 2): number {
  const f = Math.pow(10, decimals)
  return Math.round((Number(v) + Number.EPSILON) * f) / f
}

function nsdMoney (v: any): string {
  return nsdSafeNum(v, 0).toLocaleString('it-IT', { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function nsdQty (v: any): string {
  return nsdSafeNum(v, 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
}

type NsdArt30EquipmentRow = {
  codice: string
  descrizione: string
  unitaMisura: string
  quantita: number | null
  valoreUnitario: number | null
  importo: number
  isCauzione: boolean
}

type NsdArt30EquipmentSummary = {
  rows: NsdArt30EquipmentRow[]
  rimborsoLordo: number
  cauzione: number
  netto: number
  hasData: boolean
}

function nsdParseArt30Number (value: any): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value).trim().replace(/\s/g, '')
  if (!text) return null
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function nsdReadArt30Equipment (data: any): NsdArt30EquipmentSummary {
  const equipmentRows: NsdArt30EquipmentRow[] = []
  let cauzioneSnapshot: NsdArt30EquipmentRow | null = null
  const raw = String(nsdPickAttrCI(data || {}, ['attrezzature_risarcimento_dettaglio']) || '')

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (/^Decurtazione della cauzione\b/i.test(line)) {
      const um = String(line.match(/U\.M\.\s*:\s*([^|]+)/i)?.[1] || 'n.').trim()
      const quantita = nsdParseArt30Number(line.match(/Quantità\s*:\s*(-?[0-9][0-9.,]*)/i)?.[1])
      const valoreUnitario = nsdParseArt30Number(line.match(/Valore unitario\s*:\s*(-?[0-9][0-9.,]*)/i)?.[1])
      const importoRaw = nsdParseArt30Number(line.match(/Importo\s*:\s*(-?[0-9][0-9.,]*)/i)?.[1])
      cauzioneSnapshot = {
        codice: '',
        descrizione: 'Decurtazione della cauzione',
        unitaMisura: um || 'n.',
        quantita,
        valoreUnitario,
        importo: Math.abs(importoRaw || 0),
        isCauzione: true
      }
      continue
    }

    const statoMatch = line.match(/Stato:\s*(Non recuperabile|Recuperabile)/i)
    if (!statoMatch) continue
    if (/^recuperabile$/i.test(statoMatch[1].trim())) continue

    const cutIdx = line.search(/\s+—\s+Valore unitario\s*:/i)
    const prefix = cutIdx >= 0 ? line.slice(0, cutIdx).trim() : line
    const codiceMatch = prefix.match(/^(.*?)\s+—\s+Codice\s*:\s*(.+)$/i)
    const descrizione = String(codiceMatch?.[1] || prefix).trim()
    const codice = String(codiceMatch?.[2] || '').trim()
    if (!descrizione) continue

    const valoreUnitario = nsdParseArt30Number(line.match(/Valore unitario\s*:\s*([0-9][0-9.,]*)/i)?.[1])
    const importo = nsdRound(valoreUnitario || 0, 2)
    equipmentRows.push({
      codice,
      descrizione,
      unitaMisura: 'n.',
      quantita: 1,
      valoreUnitario,
      importo,
      isCauzione: false
    })
  }

  const groupedEquipmentRows: NsdArt30EquipmentRow[] = (() => {
    const map = new Map<string, NsdArt30EquipmentRow>()
    equipmentRows.forEach(row => {
      const cur = map.get(row.descrizione)
      if (!cur) {
        map.set(row.descrizione, { ...row })
      } else {
        cur.quantita = (cur.quantita || 0) + (row.quantita || 0)
        cur.importo = nsdRound((cur.importo || 0) + (row.importo || 0), 2)
      }
    })
    return Array.from(map.values())
  })()

  const rimborsoDaRighe = nsdRound(groupedEquipmentRows.reduce((sum, row) => sum + nsdSafeNum(row.importo, 0), 0), 2)
  const rimborsoSalvato = nsdParseArt30Number(nsdPickAttrCI(data || {}, ['attrezzature_risarcimento_importo']))
  const cauzioneSalvata = Math.abs(nsdParseArt30Number(nsdPickAttrCI(data || {}, ['attrezzature_cauzione_decurtata'])) || 0)
  const nettoSalvato = nsdParseArt30Number(nsdPickAttrCI(data || {}, ['attrezzature_importo_netto']))
  const cauzioneAttiva = nsdTruthyFlag(nsdPickAttrCI(data || {}, ['attrezzature_cauzione_presente'])) || cauzioneSalvata > 0
  const rimborsoLordo = nsdRound(rimborsoSalvato ?? rimborsoDaRighe, 2)
  const cauzione = nsdRound(cauzioneAttiva ? (cauzioneSalvata || cauzioneSnapshot?.importo || 0) : 0, 2)
  const netto = nsdRound(nettoSalvato ?? (rimborsoLordo - cauzione), 2)

  if (cauzioneAttiva && cauzione > 0) {
    groupedEquipmentRows.push({
      codice: '',
      descrizione: 'Decurtazione della cauzione',
      unitaMisura: cauzioneSnapshot?.unitaMisura || 'n.',
      quantita: cauzioneSnapshot?.quantita ?? null,
      valoreUnitario: cauzioneSnapshot?.valoreUnitario ?? null,
      importo: cauzione,
      isCauzione: true
    })
  }

  return {
    rows: groupedEquipmentRows,
    rimborsoLordo,
    cauzione,
    netto,
    hasData: groupedEquipmentRows.some(row => !row.isCauzione) || rimborsoSalvato != null || nettoSalvato != null || cauzione > 0
  }
}

// Normalizzazione chiave e riconoscimento tipo attrezzatura: stessa logica di gii-editing-tec,
// per restare coerenti sull'etichetta mostrata (es. "Curva di derivazione") a partire dal
// codice/descrizione letti dal catalogo parametri.
function nsdAttrezzaturaKey (value: any): string {
  return String(value ?? '')
    .trim()
    .toLocaleUpperCase('it-IT')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function nsdAttrezzaturaTipoLabel (value: any): string | null {
  const key = nsdAttrezzaturaKey(value)
  if (!key) return null
  if (key.includes('TESSERA')) return 'Tessera elettronica'
  if (key.includes('CURV')) return 'Curva di derivazione'
  if (key.includes('SIFON')) return 'Sifone'
  if (key.includes('PARATOIA')) return 'Paratoia'
  return null
}

// Catalogo attrezzature Art.30 (codice -> etichetta leggibile), stessa tabella parametri
// consultata da gii-editing-tec. Cache in memoria per evitare richieste ripetute.
const __giiNsdAttrezzatureCatalogCache: Record<string, Promise<Map<string, string>>> = {}

async function nsdLoadAttrezzatureCatalog (rawUrl: any): Promise<Map<string, string>> {
  const url = nsdEnsureLayerIndex(nsdNormalizeUrl(rawUrl))
  if (!url) return new Map()
  if (!__giiNsdAttrezzatureCatalogCache[url]) {
    __giiNsdAttrezzatureCatalogCache[url] = (async () => {
      const fl = await nsdGetFeatureLayerByUrl(url)
      const res = await fl.queryFeatures({
        where: '1=1',
        outFields: ['codice_parametro', 'descrizione', 'categoria_parametro', 'attivo'],
        returnGeometry: false
      })
      const out = new Map<string, string>()
      ;(res?.features || []).forEach((f: any) => {
        const a = f?.attributes || {}
        const categoria = nsdAttrezzaturaKey(a?.categoria_parametro)
        if (categoria && categoria !== 'ATTREZZATURA') return
        if (a?.attivo != null && a?.attivo !== '' && !(a?.attivo === 1 || a?.attivo === true || /^(1|true|si|sì|yes)$/i.test(String(a?.attivo).trim()))) return
        const codice = String(a?.codice_parametro ?? '').trim()
        if (!codice) return
        const descrizioneOrigine = String(a?.descrizione ?? codice).trim()
        const label = nsdAttrezzaturaTipoLabel(`${codice} ${descrizioneOrigine}`) || descrizioneOrigine
        out.set(codice, label)
      })
      return out
    })().catch((err) => { delete __giiNsdAttrezzatureCatalogCache[url]; throw err })
  }
  return __giiNsdAttrezzatureCatalogCache[url]
}

// Mappa riferimento_attrezzatura_id (codice catalogo, es. "ATT-002") -> etichetta leggibile
// ("Curva di derivazione", numerata "(N)" se più unità dello stesso tipo compaiono nella
// stessa pratica) per le sole attrezzature "recuperabile" — usata per suddividere nella tab
// Nota spese le sotto-note di Art.30, una per attrezzatura.
function nsdResolveRecuperabiliAttrezzatureLabels (rows: NsdDetailRow[], catalog: Map<string, string>): Map<string, string> {
  const out = new Map<string, string>()
  const seen = new Set<string>()
  const metaById = new Map<string, NsdDetailRow>()
  ;(rows || []).forEach(row => {
    if (!nsdIsRecuperableTesseraMetaRow(row)) return
    const id = String(row.riferimento_attrezzatura_id || '').trim()
    if (id) metaById.set(id, row)
  })
  const items: { id: string, descrizione: string, matricola: string }[] = []
  ;(rows || []).forEach(row => {
    if (nsdNormalizeCasistica(row.codice_casistica) !== 'C104_ATTREZZATURE_DANNEGGIATE') return
    const id = String(row.riferimento_attrezzatura_id || '').trim()
    if (!id || seen.has(id)) return
    seen.add(id)
    const meta = metaById.get(id)
    items.push({
      id,
      descrizione: catalog.get(nsdAttrezzaturaInstanceTipoCode(id)) || id,
      matricola: String(meta?.matricola_snapshot || '').trim()
    })
  })
  const totalsByDescrizione: Record<string, number> = {}
  items.forEach(it => { totalsByDescrizione[it.descrizione] = (totalsByDescrizione[it.descrizione] || 0) + 1 })
  const counters: Record<string, number> = {}
  items.forEach(it => {
    if (it.matricola) {
      out.set(it.id, `${it.descrizione} - matricola ${it.matricola}`)
    } else if (totalsByDescrizione[it.descrizione] > 1) {
      counters[it.descrizione] = (counters[it.descrizione] || 0) + 1
      out.set(it.id, `${it.descrizione} (${counters[it.descrizione]})`)
    } else {
      out.set(it.id, it.descrizione)
    }
  })
  return out
}

function nsdEscapeSqlString (v: string): string {
  return String(v || '').replace(/'/g, "''")
}

function nsdNormalizeUrl (raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    const u = new URL(s)
    if (!/^https?:$/i.test(u.protocol)) return ''
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/+$/, '')
  } catch {
    return s.replace(/[?#].*$/, '').replace(/\/+$/, '')
  }
}

function nsdEnsureLayerIndex (url: string): string {
  if (!url) return ''
  if (/\/\d+$/.test(url)) return url
  if (/\/(FeatureServer|MapServer)$/i.test(url)) return `${url}/0`
  return url
}

function nsdPickAttrCI (obj: any, names: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined
  for (const n of names) {
    if (Object.prototype.hasOwnProperty.call(obj, n)) return obj[n]
  }
  const lower = new Map<string, string>()
  Object.keys(obj).forEach(k => lower.set(k.toLowerCase(), k))
  for (const n of names) {
    const k = lower.get(String(n).toLowerCase())
    if (k) return obj[k]
  }
  return undefined
}

function nsdNormalizeCategory (v: any): NsdCategory | null {
  const s = String(v || '').trim().toUpperCase()
  if (s === 'AT') return 'AT'
  if (s === 'PR') return 'PR'
  if (s === 'RU') return 'RU'
  if (s === 'SL') return 'SL'
  if (s === 'PF') return 'PF'
  if (s === 'RA') return 'RA'
  return null
}

function nsdNormalizeSource (v: any): NsdSource {
  const s = String(v || '').trim().toUpperCase().replace(/_/g, ' ')
  if (s === 'INTERNO') return 'INTERNO'
  if (s === 'NUOVI PREZZI') return 'NUOVI PREZZI'
  return 'REGIONE'
}

function nsdSourceShort (source: NsdSource): string {
  if (source === 'INTERNO') return 'INT'
  if (source === 'NUOVI PREZZI') return 'NP'
  return 'REG'
}

function nsdReadParentSummary (data: any): NsdSummary {
  return {
    totaleAT: nsdSafeNum(nsdPickAttrCI(data, ['ns_totale_attrezzature_trasporti']), 0),
    totalePR: nsdSafeNum(nsdPickAttrCI(data, ['ns_totale_materiali_costruzione']), 0),
    totaleRU: nsdSafeNum(nsdPickAttrCI(data, ['ns_totale_manodopera']), 0),
    totaleSL: nsdSafeNum(nsdPickAttrCI(data, ['ns_totale_semilavorati']), 0),
    totalePF: nsdSafeNum(nsdPickAttrCI(data, ['ns_totale_prodotti_finiti']), 0),
    totaleRA: 0,
    percentualeSpeseGenerali: nsdSafeNum(nsdPickAttrCI(data, ['ns_spese_generali_perc']), 0),
    importoSpeseGenerali: nsdSafeNum(nsdPickAttrCI(data, ['ns_importo_spese_generali']), 0),
    totaleComplessivo: nsdSafeNum(nsdPickAttrCI(data, ['ns_totale_complessivo']), 0)
  }
}

function nsdComputeSummaryFromRows (rows: NsdDetailRow[], perc: number): NsdSummary {
  const sumBy = (cat: NsdCategory) => nsdRound((rows || []).filter(r => r.categoria_costo === cat).reduce((s, r) => s + nsdSafeNum(r.importo_riga, 0), 0), 2)
  const totaleAT = sumBy('AT')
  const totalePR = sumBy('PR')
  const totaleRU = sumBy('RU')
  const totaleSL = sumBy('SL')
  const totalePF = sumBy('PF')
  const totaleRA = sumBy('RA')
  const base = nsdRound(totaleAT + totalePR + totaleRU + totaleSL + totalePF, 2)
  const percentualeSpeseGenerali = nsdRound(nsdSafeNum(perc, 0), 2)
  const importoSpeseGenerali = nsdRound(base * percentualeSpeseGenerali / 100, 2)
  // RA (risarcimento attrezzatura) non concorre alla base su cui si calcolano le spese
  // generali: si somma al netto, direttamente nel totale complessivo.
  const totaleComplessivo = nsdRound(base + importoSpeseGenerali + totaleRA, 2)
  return { totaleAT, totalePR, totaleRU, totaleSL, totalePF, totaleRA, percentualeSpeseGenerali, importoSpeseGenerali, totaleComplessivo }
}

// Una casistica nota spese è "compilata" se ha almeno una riga collegata, nessuna riga
// con quantità non valorizzata (<=0) e un totale economico non nullo. Stessa soglia
// (0.004) usata in gii-editing-tec per evitare falsi "compilato" su importi arrotondati a zero.
function nsdIsCasisticaCompiled (rows: NsdDetailRow[], codice: string, percentualeSpeseGenerali: number): boolean {
  const norm = nsdNormalizeCasistica(codice)
  const groupRows = (rows || []).filter(r => nsdNormalizeCasistica(r.codice_casistica) === norm)
  if (!groupRows.length) return false
  if (groupRows.some(r => nsdSafeNum(r.quantita, 0) <= 0)) return false
  const totale = nsdComputeSummaryFromRows(groupRows, percentualeSpeseGenerali).totaleComplessivo
  return totale > 0.004
}

async function nsdGetFeatureLayerByUrl (rawUrl: any): Promise<any> {
  const url = nsdEnsureLayerIndex(nsdNormalizeUrl(rawUrl))
  if (!url) throw new Error('URL tabella dettaglio nota spese non configurata.')
  if (__giiNsdLayerCache[url]) return __giiNsdLayerCache[url]
  await ensureNsdJsonOnlyQueryFormat()
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url })
  try { if (typeof fl?.load === 'function') await fl.load() } catch {}
  __giiNsdLayerCache[url] = fl
  return fl
}

async function nsdQueryRows (detailUrl: string, parentGlobalId: string): Promise<NsdDetailRow[]> {
  const fl = await nsdGetFeatureLayerByUrl(detailUrl)
  const gid = normGid(parentGlobalId)
  if (!gid) return []
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = `LOWER(parent_globalid) = '${nsdEscapeSqlString(gid)}' OR LOWER(parent_globalid) = '{${nsdEscapeSqlString(gid)}}'`
  const requestedFields = [
    String(fl?.objectIdField || 'OBJECTID'), 'OBJECTID', 'categoria_costo', 'origine_voce_snapshot', 'codice_voce_snapshot',
    'descrizione_snapshot', 'unita_misura_snapshot', 'prezzo_unitario_snapshot',
    'costo_unitario_snapshot', 'quantita', 'importo_riga', 'anno_prezzario_snapshot',
    'ordine', 'note', 'codice_casistica', 'riferimento_attrezzatura_id', 'matricola_snapshot', 'cauzione_decurtata'
  ]
  const realByLower = new Map<string, string>()
  ;(Array.isArray(fl?.fields) ? fl.fields : []).forEach((f: any) => {
    const name = String(f?.name || '').trim()
    if (name) realByLower.set(name.toLowerCase(), name)
  })
  const outFields = requestedFields
    .map(name => realByLower.size ? realByLower.get(String(name).toLowerCase()) : name)
    .filter((name, idx, arr): name is string => !!name && arr.indexOf(name) === idx)
  q.outFields = outFields.length ? outFields : ['*']
  q.returnGeometry = false
  const orderFields = [realByLower.get('categoria_costo'), realByLower.get('ordine'), realByLower.get(String(fl?.objectIdField || 'OBJECTID').toLowerCase()) || realByLower.get('objectid')]
    .filter(Boolean)
    .map((name: any) => `${name} ASC`)
  if (orderFields.length) q.orderByFields = orderFields
  const res = await fl.queryFeatures(q)
  const NSD_SORT_CATEGORY_ORDER: readonly NsdCategory[] = ['AT', 'PR', 'RU', 'SL', 'PF', 'RA']
  return ((res?.features || []).map((f: any) => {
    const r = f?.attributes || {}
    const cat = nsdNormalizeCategory(r?.categoria_costo)
    if (!cat) return null // categoria non riconosciuta: esclusa, non forzata a PR
    return {
      objectid: nsdSafeNum(nsdPickAttrCI(r, ['OBJECTID', 'objectid']), 0),
      categoria_costo: cat as NsdCategory,
      origine_voce_snapshot: nsdNormalizeSource(r?.origine_voce_snapshot || 'REGIONE'),
      codice_voce_snapshot: String(r?.codice_voce_snapshot || '').trim(),
      descrizione_snapshot: String(r?.descrizione_snapshot || '').trim(),
      unita_misura_snapshot: String(r?.unita_misura_snapshot || '').trim(),
      prezzo_unitario_snapshot: nsdRound(nsdSafeNum(r?.prezzo_unitario_snapshot ?? r?.costo_unitario_snapshot, 0), 4),
      quantita: nsdRound(nsdSafeNum(r?.quantita, 0), 4),
      importo_riga: nsdRound(nsdSafeNum(r?.importo_riga, 0), 2),
      anno_prezzario_snapshot: r?.anno_prezzario_snapshot != null ? Math.trunc(nsdSafeNum(r?.anno_prezzario_snapshot, 0)) : null,
      ordine: Math.trunc(nsdSafeNum(r?.ordine, 0)),
      note: String(r?.note || '').trim(),
      codice_casistica: nsdNormalizeCasistica(nsdPickAttrCI(r, ['codice_casistica'])),
      riferimento_attrezzatura_id: String(nsdPickAttrCI(r, ['riferimento_attrezzatura_id']) || '').trim() || null,
      matricola_snapshot: r?.matricola_snapshot != null ? String(r.matricola_snapshot).trim() || null : null,
      cauzione_decurtata: !!r?.cauzione_decurtata
    }
  }).filter((row: NsdDetailRow | null) => row !== null) as NsdDetailRow[]).sort((a: NsdDetailRow, b: NsdDetailRow) => {
    const ca = NSD_SORT_CATEGORY_ORDER.indexOf(a.categoria_costo)
    const cb = NSD_SORT_CATEGORY_ORDER.indexOf(b.categoria_costo)
    if (ca !== cb) return ca - cb
    if (a.ordine !== b.ordine) return a.ordine - b.ordine
    return a.objectid - b.objectid
  })
}

function NsdExpandableCostSection (props: { title: React.ReactNode; total: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <details
      open={open}
      onToggle={(e: any) => setOpen(!!e.currentTarget.open)}
      style={{ border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', overflow: 'hidden' }}
    >
      <summary
        style={{
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: '12px minmax(0, 1fr) 132px',
          alignItems: 'center',
          columnGap: 8,
          fontSize: 13,
          fontWeight: 800,
          color: '#1f2937',
          padding: '8px 12px',
          background: '#e5e7eb',
          borderBottom: '1px solid #cbd5e1',
          listStyle: 'none'
        }}
      >
        <span aria-hidden='true' style={{ color: '#1d4ed8', fontSize: 10, fontWeight: 900, width: 12, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
          {open ? '▼' : '▶'}
        </span>
        <span>{props.title}</span>
        <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{props.total}</span>
      </summary>
      <div style={{ padding: 10 }}>{props.children}</div>
    </details>
  )
}

function NotaSpeseDetailPanel (props: { data: any; detailUrl: string; hasSel: boolean; rows: NsdDetailRow[]; loading: boolean; error: string | null; attrezzatureCatalog: Map<string, string> }) {
  const parentGlobalId = String(nsdPickAttrCI(props.data, ['GlobalID', 'globalid']) || '').trim()
  // Righe e stato di caricamento arrivano ora dal parent (DetailTabsPanel), che le
  // carica eagerly ad ogni selezione record: serve per poter mostrare il numeratore
  // "compilate/previste" sulla tab anche prima che l'utente la apra.
  const rows = props.rows || []
  const loading = props.loading
  const error = props.error

  const parentSummary = React.useMemo(() => nsdReadParentSummary(props.data || {}), [props.data])
  const art30Equipment = React.useMemo(() => nsdReadArt30Equipment(props.data || {}), [props.data])
  const percentualeSpeseGenerali = parentSummary.percentualeSpeseGenerali
  const lastCalc = nsdPickAttrCI(props.data, ['ns_ricalcolata_il'])

  const expectedCasistiche = React.useMemo(() => nsdExpectedCasisticheFromData(props.data || {}), [props.data])

  const noteGroups = React.useMemo(() => {
    const attrezzatureLabels = nsdResolveRecuperabiliAttrezzatureLabels(rows, props.attrezzatureCatalog || new Map())
    const byCode = new Map<string, NsdDetailRow[]>()
    const labelByCode = new Map<string, string>()
    ;(rows || []).forEach(row => {
      const baseCode = nsdNormalizeCasistica(row.codice_casistica)
      const riferimentoId = String(row.riferimento_attrezzatura_id || '').trim()
      const isArt30 = baseCode === 'C104_ATTREZZATURE_DANNEGGIATE'
      const code = isArt30 && riferimentoId ? `${baseCode}::${riferimentoId}` : baseCode
      if (isArt30 && riferimentoId) {
        const baseLabel = nsdCasisticaInfo(baseCode).label
        const attrLabel = attrezzatureLabels.get(riferimentoId)
        labelByCode.set(code, attrLabel ? `${baseLabel} — Rimborso spese riparazione ${attrLabel}` : baseLabel)
      } else if (isArt30 && !riferimentoId) {
        labelByCode.set(code, `${nsdCasisticaInfo(baseCode).label} — Non recuperabile`)
      }
      const list = byCode.get(code) || []
      list.push(row)
      byCode.set(code, list)
    })

    expectedCasistiche.forEach(code => {
      const norm = nsdNormalizeCasistica(code)
      const hasAnyGroupForCode = Array.from(byCode.keys()).some(k => k.split('::')[0] === norm)
      if (!hasAnyGroupForCode) byCode.set(norm, [])
    })

    return Array.from(byCode.entries()).map(([code, groupRows]) => {
      const baseCode = code.split('::')[0]
      const info = nsdCasisticaInfo(baseCode)
      const label = labelByCode.get(code) || info.label
      const firstOrder = groupRows.length
        ? Math.min(...groupRows.map(r => Number.isFinite(Number(r.ordine)) ? Number(r.ordine) : 9999))
        : info.order
      return { code, rows: groupRows, info: { ...info, label }, firstOrder, isExpectedMissing: expectedCasistiche.includes(baseCode) && groupRows.length === 0 }
    }).sort((a, b) => {
      if (a.info.order !== b.info.order) return a.info.order - b.info.order
      // Entro lo stesso articolo (tipicamente Art.30): la nota condivisa "non recuperabile"
      // (nessun suffisso ::riferimento nel code) va sempre prima delle note "recuperabile"
      // (una per attrezzatura); tra queste ultime, ordine alfabetico per nome attrezzatura
      // (già incluso nell'etichetta, col prefisso comune identico per ogni gruppo).
      const aIsShared = !a.code.includes('::')
      const bIsShared = !b.code.includes('::')
      if (aIsShared !== bIsShared) return aIsShared ? -1 : 1
      if (!aIsShared && !bIsShared) {
        const labelDiff = a.info.label.localeCompare(b.info.label, 'it')
        if (labelDiff !== 0) return labelDiff
      }
      if (a.firstOrder !== b.firstOrder) return a.firstOrder - b.firstOrder
      return a.code.localeCompare(b.code)
    })
  }, [rows, expectedCasistiche, props.data])

  const hasRealRaRows = rows.some(r => r.categoria_costo === 'RA' && !nsdIsRecuperableTesseraMetaRow(r))
  const overallSummary = React.useMemo(() => nsdComputeSummaryFromRows(rows, percentualeSpeseGenerali), [rows, percentualeSpeseGenerali])
  const overallTotalWithArt30 = nsdRound(overallSummary.totaleComplessivo + (!hasRealRaRows && art30Equipment.hasData ? art30Equipment.netto : 0), 2)
  // Totale "Risarcimento attrezzature" mostrato nel riepilogo: preferisce le righe RA reali
  // (nota spese vera e propria) al vecchio campo piatto, usato solo come fallback per le
  // pratiche non ancora migrate che non hanno righe RA reali.
  const realRaSummary = React.useMemo(() => nsdComputeSummaryFromRows(rows.filter(r => r.categoria_costo === 'RA' && !nsdIsRecuperableTesseraMetaRow(r)), 0), [rows])
  const recuperableCauzioneTotal = nsdRound(rows.filter(nsdIsRecuperableTesseraMetaRow).reduce((sum, row) => sum + nsdSafeNum(row.importo_riga, 0), 0), 2)
  const risarcimentoAttrezzatureTotale = hasRealRaRows ? realRaSummary.totaleRA : (art30Equipment.hasData ? art30Equipment.netto : 0)
  const showRisarcimentoAttrezzatureCard = hasRealRaRows || art30Equipment.hasData

  const card = (label: string, value: number, strong = false) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 132px',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        boxSizing: 'border-box',
        background: strong ? '#1F4E79' : 'transparent',
        borderRadius: strong ? 8 : 0,
        padding: strong ? '11px 14px' : '7px 14px',
        borderBottom: strong ? 'none' : '1px solid rgba(0,0,0,0.07)'
      }}
    >
      <div style={{ fontSize: strong ? 15 : 12, fontWeight: strong ? 800 : 700, color: strong ? 'rgba(255,255,255,0.86)' : '#6b7280', lineHeight: 1.25 }}>{label}</div>
      <div style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 900 : 700, color: strong ? '#fff' : '#1f2937', whiteSpace: 'nowrap', textAlign: 'right' }}>€ {nsdMoney(value)}</div>
    </div>
  )

  const greenSummaryCard = (label: string, value: number, strong = false) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 132px',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        boxSizing: 'border-box',
        background: strong ? 'linear-gradient(90deg, #005222, #008337)' : 'transparent',
        borderRadius: strong ? 8 : 0,
        padding: strong ? '11px 14px' : '7px 14px',
        border: 'none',
        borderBottom: strong ? 'none' : '1px solid #cfe5dc'
      }}
    >
      <div style={{ fontSize: strong ? 15 : 12, fontWeight: strong ? 800 : 700, color: strong ? '#fff' : '#475569', lineHeight: 1.25 }}>{label}</div>
      <div style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 900 : 700, color: strong ? '#fff' : '#176b52', whiteSpace: 'nowrap', textAlign: 'right' }}>€ {nsdMoney(value)}</div>
    </div>
  )

  const renderArt30Equipment = () => {
    if (!art30Equipment.hasData) return null
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: '#dbeafe', border: '1px solid #bfdbfe', color: '#1F4E79', fontSize: 12, fontWeight: 900, letterSpacing: 0.15, textTransform: 'uppercase' }}>
          Attrezzature
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#eef6ff' }}>
                {['Codice', 'Attrezzatura', 'U.M.', 'Q.tà', 'Valore unitario', 'Importo'].map(h => (
                  <th key={h} style={{ textAlign: ['Codice', 'Attrezzatura'].includes(h) ? 'left' : 'right', padding: '7px 8px', borderBottom: '1px solid #cbd5e1', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {art30Equipment.rows.map((row, idx) => (
                <tr key={`${row.isCauzione ? 'cauzione' : row.codice || row.descrizione}-${idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fbff' }}>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', whiteSpace: 'nowrap', fontWeight: row.isCauzione ? 400 : 700 }}>{row.codice || ''}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', minWidth: 170, fontWeight: row.isCauzione ? 700 : 400 }}>{row.descrizione}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.unitaMisura || '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.quantita != null ? nsdQty(row.quantita) : '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.valoreUnitario != null ? `€ ${nsdMoney(row.valoreUnitario)}` : '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 800, color: row.isCauzione ? '#d92d20' : '#1f2937' }}>{row.isCauzione ? '- ' : ''}€ {nsdMoney(Math.abs(row.importo))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderRaRows = (sourceRows: NsdDetailRow[]) => {
    const raRows = (sourceRows || []).filter(row => row.categoria_costo === 'RA' && !nsdIsRecuperableTesseraMetaRow(row))
    if (!raRows.length) return <div style={{ fontSize: 12, color: '#6b7280', padding: '8px 2px' }}>Nessuna voce.</div>
    return (
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
              {['Origine', 'Descrizione', 'Matricola', 'Cauzione', 'Q.tà', 'Prezzo unit.', 'Importo'].map(h => (
                <th key={h} style={{ textAlign: ['Origine', 'Descrizione'].includes(h) ? 'left' : (h === 'Cauzione' ? 'center' : 'right'), padding: '6px 8px', borderBottom: '1px solid rgba(0,0,0,0.10)', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {raRows.map((row, idx) => {
              const isTessera = !!String(row.matricola_snapshot || '').trim() || row.cauzione_decurtata != null
              return (
              <React.Fragment key={`${row.objectid}-${idx}`}>
                <tr>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'left', whiteSpace: 'nowrap' }}>{nsdSourceShort(row.origine_voce_snapshot)}{row.anno_prezzario_snapshot ? ` ${row.anno_prezzario_snapshot}` : ''}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'left', minWidth: 220 }}><b>{row.codice_voce_snapshot}</b> — {row.descrizione_snapshot || '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>{isTessera ? (row.matricola_snapshot || '—') : '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'center', whiteSpace: 'nowrap' }}>{isTessera ? (row.cauzione_decurtata ? 'Sì' : 'No') : '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>{nsdQty(row.quantita)} {row.unita_misura_snapshot || ''}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>€ {nsdMoney(row.prezzo_unitario_snapshot)}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 800 }}>€ {nsdMoney(row.importo_riga)}</td>
                </tr>
                {row.note && (
                  <tr>
                    <td colSpan={7} style={{ padding: '4px 8px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', color: '#6b7280', fontSize: 11 }}><b>Note:</b> {row.note}</td>
                  </tr>
                )}
              </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderRows = (cat: NsdCategory, sourceRows: NsdDetailRow[]) => {
    const catRows = (sourceRows || []).filter(row => row.categoria_costo === cat)
    if (!catRows.length) return <div style={{ fontSize: 12, color: '#6b7280', padding: '8px 2px' }}>Nessuna voce.</div>
    return (
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
              {['Origine', 'Codice', 'Descrizione', 'U.M.', 'Q.tà', 'Prezzo unit.', 'Importo'].map(h => (
                <th key={h} style={{ textAlign: ['Origine', 'Codice', 'Descrizione'].includes(h) ? 'left' : 'right', padding: '6px 8px', borderBottom: '1px solid rgba(0,0,0,0.10)', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catRows.map((row, idx) => (
              <React.Fragment key={`${row.objectid}-${idx}`}>
                <tr>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>{nsdSourceShort(row.origine_voce_snapshot)}{row.anno_prezzario_snapshot ? ` ${row.anno_prezzario_snapshot}` : ''}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>{row.codice_voce_snapshot || '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'left', minWidth: 220 }}>{row.descrizione_snapshot || '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.unita_misura_snapshot || '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>{nsdQty(row.quantita)}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap' }}>€ {nsdMoney(row.prezzo_unitario_snapshot)}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 800 }}>€ {nsdMoney(row.importo_riga)}</td>
                </tr>
                {row.note && (
                  <tr>
                    <td colSpan={7} style={{ padding: '4px 8px 8px', borderBottom: '1px solid rgba(0,0,0,0.07)', color: '#6b7280', fontSize: 11 }}><b>Note:</b> {row.note}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!props.hasSel) return <div style={{ opacity: 0.75, fontSize: 12 }}>Selezionare una pratica per vedere la nota spese.</div>
  if (!parentGlobalId) {
    return (
      <div style={{ padding: 12, borderRadius: 10, border: '1px solid #f5b8b8', background: '#fce4e4', color: '#7a1c1c' }}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>GlobalID pratica non disponibile</div>
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>Il widget non riesce a leggere il GlobalID del rapporto selezionato. Verifica che la vista usata dall’elenco esponga il campo GlobalID.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12, paddingTop: 0 }}>
      {!props.detailUrl && (
        <div style={{ border: '1px solid #d1d5db', borderRadius: 10, background: '#f9fafb', padding: 12, color: '#374151', fontSize: 12, lineHeight: 1.45 }}>
          URL della tabella <strong>GII_NOTA_SPESE_DETTAGLIO</strong> non configurato nel setting del widget dettaglio.
          La nota spese per casistica non può essere visualizzata.
        </div>
      )}
      {props.detailUrl && loading && <div style={{ opacity: 0.75, fontSize: 12 }}>Caricamento dettaglio nota spese…</div>}
      {props.detailUrl && !loading && error && <div style={{ color: '#b00020', fontSize: 12 }}>{error}</div>}
      {props.detailUrl && !loading && !error && noteGroups.length === 0 && (
        <div style={{ opacity: 0.75, fontSize: 12 }}>Nessuna voce di nota spese collegata al rapporto.</div>
      )}

      {props.detailUrl && !loading && !error && (rows.length > 0 || art30Equipment.hasData) && noteGroups.length > 1 && (
        <DetailSectionCard
          title="Riepilogo complessivo"
          borderColor="#9fd6c1"
          headerBg="linear-gradient(90deg, #005222, #008337)"
          headerColor="#fff"
          bodyBg="#eef9f4"
          boxShadow="0 1px 3px rgba(23, 107, 82, 0.14)"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 0 }}>
            {showRisarcimentoAttrezzatureCard && greenSummaryCard('Totale risarcimento attrezzature', risarcimentoAttrezzatureTotale)}
            {recuperableCauzioneTotal !== 0 && greenSummaryCard('Decurtazione cauzione tessere recuperabili', recuperableCauzioneTotal)}
            {greenSummaryCard('Totale note spese', nsdRound(overallSummary.totaleAT + overallSummary.totalePR + overallSummary.totaleRU + overallSummary.totaleSL + overallSummary.totalePF, 2))}
            {greenSummaryCard(`Spese generali (${nsdMoney(overallSummary.percentualeSpeseGenerali)}%)`, overallSummary.importoSpeseGenerali)}
            {greenSummaryCard('Totale complessivo', overallTotalWithArt30, true)}
          </div>
          {lastCalc ? <div style={{ fontSize: 11, color: '#477264', marginTop: 8 }}>Ultimo ricalcolo: {formatDateSafe(lastCalc)}</div> : null}
        </DetailSectionCard>
      )}

      {!hasRealRaRows && art30Equipment.hasData && (
        <DetailSectionCard
          title={`${nsdCasisticaInfo('C104_ATTREZZATURE_DANNEGGIATE').label} — Risarcimento attrezzature non recuperabili`}
          borderColor="#c5d9f1"
          headerBg="#eaf2ff"
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {renderArt30Equipment()}
            <div style={{ border: '1px solid rgba(31,78,121,0.24)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              {card('Totale risarcimento attrezzature', art30Equipment.netto, true)}
            </div>
          </div>
        </DetailSectionCard>
      )}

      {props.detailUrl && !loading && !error && noteGroups.map(group => {
        const groupSummary = nsdComputeSummaryFromRows(group.rows, percentualeSpeseGenerali)
        const hasGroupContent = group.rows.length > 0
        return (
          <DetailSectionCard
            key={group.code}
            title={group.info.label}
            borderColor={group.info.isUnlinked ? '#d1d5db' : '#c5d9f1'}
            headerBg={group.info.isUnlinked ? '#f3f4f6' : '#eaf2ff'}
          >
            {group.isExpectedMissing && !hasGroupContent && (
              <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid #f5b8b8', background: '#fce4e4', color: '#7a1c1c', fontSize: 12, lineHeight: 1.45 }}>
                Per questa violazione è prevista la possibilità di compilare una nota spese, ma al momento non risultano importi valorizzati.
              </div>
            )}
            {group.info.isUnlinked && (
              <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', color: '#374151', fontSize: 12, lineHeight: 1.45 }}>
                Queste righe sono presenti nella tabella nota spese, ma non risultano collegate a una violazione tramite il campo “Casistica collegata”.
              </div>
            )}

            {!hasGroupContent ? null : <div style={{ display: 'grid', gap: 10 }}>
              {(() => {
                const meta = group.rows.find(nsdIsRecuperableTesseraMetaRow)
                if (!meta) return null
                const cauzione = Math.abs(nsdSafeNum(meta.prezzo_unitario_snapshot, 0))
                return (
                  <div style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #b9d1ea', background: '#f5f9ff', color: '#16375a', fontSize: 12, lineHeight: 1.45 }}>
                    <b>Tessera elettronica</b> · Matricola <b>{meta.matricola_snapshot || '—'}</b> · Cauzione: <b>{meta.cauzione_decurtata ? `decurtata (€ ${nsdMoney(cauzione)})` : 'non decurtata'}</b>
                  </div>
                )
              })()}
              {NSD_CATEGORIES.map(cat => {
                  const catRows = group.rows.filter(row => row.categoria_costo === cat)
                  if (!catRows.length) return null
                  const total = catRows.reduce((sum, row) => sum + nsdSafeNum(row.importo_riga, 0), 0)
                  return (
                    <NsdExpandableCostSection
                      key={`${group.code}-${cat}`}
                      title={<>{NSD_CATEGORY_LABELS[cat]} <span style={{ color: '#4b5563', fontWeight: 700 }}>({catRows.length} {catRows.length === 1 ? 'voce' : 'voci'})</span></>}
                      total={`€ ${nsdMoney(total)}`}
                    >
                      {renderRows(cat, group.rows)}
                    </NsdExpandableCostSection>
                  )
                })}

              {(() => {
                const raRows = group.rows.filter(row => row.categoria_costo === 'RA' && !nsdIsRecuperableTesseraMetaRow(row))
                if (!raRows.length) return null
                const total = raRows.reduce((sum, row) => sum + nsdSafeNum(row.importo_riga, 0), 0)
                return (
                  <NsdExpandableCostSection
                    key={`${group.code}-RA`}
                    title={<>{NSD_CATEGORY_LABELS.RA} <span style={{ color: '#4b5563', fontWeight: 700 }}>({raRows.length} {raRows.length === 1 ? 'voce' : 'voci'})</span></>}
                    total={`€ ${nsdMoney(total)}`}
                  >
                    {renderRaRows(group.rows)}
                  </NsdExpandableCostSection>
                )
              })()}

                <div style={{ marginTop: 2, border: '1px solid rgba(31,78,121,0.24)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                  {card(`Spese generali (${nsdMoney(groupSummary.percentualeSpeseGenerali)}%)`, groupSummary.importoSpeseGenerali)}
                  {card('Totale nota spese', groupSummary.totaleComplessivo, true)}
                </div>
            </div>}
          </DetailSectionCard>
        )
      })}
    </div>
  )
}



function DetailTabsPanel (props: {
  active: { key: string; state: SelState } | null
  ui: any
  tabFields: TabFields
  tabs: TabConfig[]
  mapCfg: any
  notaSpeseCfg: { detailUrl: string; attrezzatureParametriUrl: string }
  regolamentoCfg: { articoliUrl: string }
  emptyMessage?: string
}) {
  const { active, ui } = props

  // Migra e normalizza tabs
  const tabs = React.useMemo(() => {
    return migrateTabs(props.tabFields, props.tabs)
  }, [props.tabs, props.tabFields])

  const selectionKey = active?.state?.oid != null ? `${active.key}:${active.state.oid}` : null
  const ds = active?.state?.ds
  const baseData = active?.state?.data || null
  // Patch ottimistico: dopo applyEdits aggiorniamo subito i valori usati dai pulsanti,
  // senza dover aspettare refresh DS / cambio selezione.
  const [localData, setLocalData] = React.useState<any | null>(null)
  React.useEffect(() => { setLocalData(null) }, [selectionKey])
  const data = localData || baseData
  const oid = active?.state?.oid ?? null
  const hasSel = oid != null && Number.isFinite(oid)

  // Testo regolamentare delle violazioni, per l'espansione al click sulla riga
  // della violazione nella scheda Violazione. Caricato una volta, indipendente
  // dal record selezionato (è una tabella di riferimento, non legata alla pratica).
  const regolamentoArticoliState = useRegolamentoArticoliState(String(props.regolamentoCfg?.articoliUrl || ''))

  const numeroRilevazione = React.useMemo(() => {
    if (!hasSel || !data || oid == null) return ''
    const origin = normalizeOriginePraticaCod(pickAttrCI(data, ['origine_pratica', 'Origine_pratica', 'ORIGINE_PRATICA'])) || 'TR'
    const settore = normalizeSettoreCod(pickAttrCI(data, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'cod_settore']))
    const base = String(oid)
    return settore ? `${base}-${origin}-${settore}` : `${base}-${origin}`
  }, [hasSel, data, oid])

  const numeroRapportoTecnico = React.useMemo(() => {
    return String(pickAttrCI(data, ['numero_rapporto_tecnico', 'Numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO']) || '').trim()
  }, [data])

  const numeroVerbale = React.useMemo(() => {
    return String(pickAttrCI(data, ['accertamento_numero']) || '').trim()
  }, [data])

  const [tab, setTab] = React.useState<string>(tabs[0]?.id || 'anagrafica')
  const [iterSortDir, setIterSortDir] = React.useState<'asc' | 'desc' | null>(null)

  React.useEffect(() => {
    if (tabs.length && !tabs.some(t => t.id === tab)) setTab(tabs[0]?.id || 'anagrafica')
  }, [tabs, tab])


  // Allegati (attachments) — caricati solo quando la tab "Allegati" è attiva
  const selectedOid = (hasSel && oid != null) ? Number(oid) : null
  const [attachmentsForOid, setAttachmentsForOid] = React.useState<number | null>(null)
  const [attachments, setAttachments] = React.useState<Array<{ id: number; name?: string; size?: number; contentType?: string; url?: string; keywords?: string }>>([])
  const [attachmentsLoading, setAttachmentsLoading] = React.useState<boolean>(false)
  const [attachmentsError, setAttachmentsError] = React.useState<string | null>(null)
  const visibleTechnicalAttachments = React.useMemo(() => filterGiiAttachmentsForTechnicalRoles((Array.isArray(attachments) ? attachments : []) as any), [attachments])

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

      const res: any = await layer.queryAttachments({
        objectIds: [selectedOid],
        returnMetadata: true,
        returnUrl: true
      })

      const pullInfos = (obj: any): any[] => {
        if (!obj) return []
        if (Array.isArray(obj)) return obj
        if (Array.isArray(obj.attachmentInfos)) return obj.attachmentInfos
        if (Array.isArray(obj.attachments)) return obj.attachments
        return []
      }

      let infos: any[] = []
      if (Array.isArray(res)) {
        for (const g of res) {
          if (!g) continue
          const pid = (g.parentObjectId != null) ? g.parentObjectId : (g.objectId != null ? g.objectId : null)
          if (pid === selectedOid) {
            infos = pullInfos(g)
            break
          }
        }
      } else if (res && typeof res === 'object') {
        if (Array.isArray(res.attachmentGroups)) {
          for (const g of res.attachmentGroups) {
            const pid = (g && g.parentObjectId != null) ? g.parentObjectId : (g && g.objectId != null ? g.objectId : null)
            if (pid === selectedOid) {
              infos = pullInfos(g)
              break
            }
          }
        } else if ((res as any)[selectedOid]) {
          infos = pullInfos((res as any)[selectedOid])
        } else if ((res as any)[String(selectedOid)]) {
          infos = pullInfos((res as any)[String(selectedOid)])
        } else if ((res as any).attachmentInfos) {
          infos = pullInfos(res)
        }
      }

      const clean = (infos || []).map((a: any) => ({
        id: Number(a.id),
        name: a.name,
        size: a.size,
        contentType: a.contentType,
        url: a.url,
        keywords: String(a.keywords ?? a.Keywords ?? a.keyword ?? '').trim()
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

  React.useEffect(() => {
    // Eager: il numeratore Allegati deve essere visibile sulla tab ancora prima di aprirla,
    // quindi il caricamento non è più condizionato dal tab attivo.
    if (selectedOid != null && attachmentsForOid !== selectedOid) {
      loadAttachments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOid, attachmentsForOid])

  // Nota spese — righe della tabella dettaglio caricate eagerly (stesso criterio degli
  // allegati) per calcolare il numeratore "compilate/previste" senza dover aprire la tab.
  const nsdDetailUrlForBadge = String(props.notaSpeseCfg?.detailUrl || '')
  const nsdParentGlobalId = React.useMemo(() => String(nsdPickAttrCI(data || {}, ['GlobalID', 'globalid']) || '').trim(), [data])
  const [nsdRows, setNsdRows] = React.useState<NsdDetailRow[]>([])
  const [nsdRowsKey, setNsdRowsKey] = React.useState<string>('')
  const [nsdLoading, setNsdLoading] = React.useState<boolean>(false)
  const [nsdError, setNsdError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setNsdRows([])
    setNsdRowsKey('')
    setNsdError(null)
  }, [nsdParentGlobalId, nsdDetailUrlForBadge])

  React.useEffect(() => {
    if (!hasSel || !nsdParentGlobalId || !nsdDetailUrlForBadge) return
    const key = `${nsdDetailUrlForBadge}|${nsdParentGlobalId}`
    if (nsdRowsKey === key) return
    let cancelled = false
    setNsdLoading(true)
    setNsdError(null)
    ;(async () => {
      try {
        const next = await nsdQueryRows(nsdDetailUrlForBadge, nsdParentGlobalId)
        if (cancelled) return
        setNsdRows(next)
        setNsdRowsKey(key)
      } catch (e: any) {
        if (cancelled) return
        setNsdRows([])
        setNsdRowsKey(key)
        setNsdError(e?.message || String(e))
      } finally {
        if (!cancelled) setNsdLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [hasSel, nsdParentGlobalId, nsdDetailUrlForBadge, nsdRowsKey])

  const nsdAttrezzatureParametriUrl = String(props.notaSpeseCfg?.attrezzatureParametriUrl || '')
  const [nsdAttrezzatureCatalog, setNsdAttrezzatureCatalog] = React.useState<Map<string, string>>(new Map())
  React.useEffect(() => {
    if (!nsdAttrezzatureParametriUrl) { setNsdAttrezzatureCatalog(new Map()); return }
    let cancelled = false
    ;(async () => {
      try {
        const catalog = await nsdLoadAttrezzatureCatalog(nsdAttrezzatureParametriUrl)
        if (!cancelled) setNsdAttrezzatureCatalog(catalog)
      } catch {
        if (!cancelled) setNsdAttrezzatureCatalog(new Map())
      }
    })()
    return () => { cancelled = true }
  }, [nsdAttrezzatureParametriUrl])

  const nsdExpectedCasisticheForBadge = React.useMemo(() => nsdExpectedCasisticheFromData(data || {}), [data])
  const nsdPercForBadge = React.useMemo(() => nsdReadParentSummary(data || {}).percentualeSpeseGenerali, [data])
  const nsdDoneCountForBadge = React.useMemo(() => {
    return nsdExpectedCasisticheForBadge.reduce((sum, code) => {
      const norm = nsdNormalizeCasistica(code)
      if (norm === 'C104_ATTREZZATURE_DANNEGGIATE') {
        const groupRows = (nsdRows || []).filter(r => nsdNormalizeCasistica(r.codice_casistica) === norm)
        const hasSharedEntry = groupRows.some(r => !String(r.riferimento_attrezzatura_id || '').trim())
        const distinctRiferimenti = new Set(groupRows.map(r => String(r.riferimento_attrezzatura_id || '').trim()).filter(Boolean))
        const rowBased = (hasSharedEntry ? 1 : 0) + distinctRiferimenti.size
        // Fallback per pratiche non ancora migrate: nessuna riga RA reale ma dati nel vecchio campo piatto.
        return sum + (rowBased > 0 ? rowBased : (nsdReadArt30Equipment(data || {}).hasData ? 1 : 0))
      }
      return sum + (nsdIsCasisticaCompiled(nsdRows, code, nsdPercForBadge) ? 1 : 0)
    }, 0)
  }, [nsdExpectedCasisticheForBadge, nsdRows, nsdPercForBadge, data])
  const nsdTotalCountForBadge = React.useMemo(() => {
    // Denominatore: 1 per violazione attesa (anche per Art.30). Il numeratore può
    // legittimamente superarlo se per la stessa violazione esistono più note spese distinte
    // (es. Art.30 con sia la nota "non recuperabile" condivisa sia una o più note
    // "recuperabile" per attrezzatura) — stessa filosofia già adottata nella tab Nota spese.
    return nsdExpectedCasisticheForBadge.length
  }, [nsdExpectedCasisticheForBadge])

  // RIMOSSO: Non resettare la tab quando cambia selezione
  // React.useEffect(() => {
  //   // reset tab quando cambia selezione (UX più prevedibile)
  //   setTab(tabs[0]?.id || 'anagrafica')
  // }, [selectionKey, tabs])

  // alias map dai campi layer (se disponibile)
  const [aliasMap, setAliasMap] = React.useState<Record<string, string>>({})
  const [fieldTypeMap, setFieldTypeMap] = React.useState<Record<string, string>>({})
  const [aliasesReady, setAliasesReady] = React.useState<boolean>(false)

  React.useEffect(() => {
    let cancelled = false
    setAliasesReady(false)

    // 1) Prova subito dallo schema del datasource (di solito è pronto prima del JSAPI layer)
    try {
      const schema = ds?.getSchema?.()
      const fobj = schema?.fields || {}
      const mapFromSchema: Record<string, string> = {}
      const typesFromSchema: Record<string, string> = {}
      for (const name of Object.keys(fobj)) {
        const f = fobj[name]
        const alias = String(f?.alias || f?.label || f?.title || name)
        mapFromSchema[name] = alias
        typesFromSchema[name] = String(f?.type || '')
      }
      if (!cancelled && Object.keys(mapFromSchema).length) {
        setAliasMap(mapFromSchema)
        setFieldTypeMap(typesFromSchema)
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
        const types: Record<string, string> = {}
        for (const f of fields) {
          const name = String(f?.name || '')
          if (!name) continue
          map[name] = String(f?.alias || f?.label || f?.title || name)
          types[name] = String(f?.type || '')
        }
        if (!cancelled) {
          if (Object.keys(map).length) setAliasMap(map)
          if (Object.keys(types).length) setFieldTypeMap(types)
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

  const makeRows = React.useCallback((fields: any, kind: string, hideEmpty: boolean) => {
    // Normalizza a plain JS array in modo robusto (frozen array, ImmutableList, ecc.)
    let fieldArr: string[] = []
    if (fields) {
      if (Array.isArray(fields)) fieldArr = fields.map(String).filter(Boolean)
      else if (typeof fields.toArray === 'function') fieldArr = fields.toArray().map(String).filter(Boolean)
      else if (typeof fields.toJS === 'function') fieldArr = fields.toJS().map(String).filter(Boolean)
      else if (typeof fields[Symbol.iterator] === 'function') fieldArr = Array.from(fields as any).map(String).filter(Boolean)
    }
    // Se nessun campo configurato esplicitamente, usa autoPickFields come default
    const rawList = fieldArr.length ? fieldArr : autoPickFields(data, kind)
    const tipoFieldForRows = resolveFieldNameLoose(data, aliasMap, 'tipologia_soggetto') || resolveFieldNameLoose(data, aliasMap, 'tipo_soggetto')
    const tipoDirect = tipoFieldForRows && data ? (data as any)[tipoFieldForRows] : null
    const tipoRaw = (data && (data as any).__tipo_soggetto_raw != null)
      ? (data as any).__tipo_soggetto_raw
      : ((data && tipoDirect != null)
          ? tipoDirect
          : ((data && (data as any).tipo_soggetto != null) ? (data as any).tipo_soggetto : null))
    const tipoLabel = (data && (data as any).__tipo_soggetto_label != null) ? (data as any).__tipo_soggetto_label : null
    const sogg = (kind === 'ANAGRAFICA') ? classifyTipoSoggetto(tipoRaw, tipoLabel) : null
    const blocked = new Set(DETAIL_NEVER_SHOW_FIELDS.map(x => String(x)))
    const isGeneralKind = String(kind || '').toUpperCase() === 'GENERALI'
    const visibleBase = rawList.filter(fn => !!fn && (isGeneralKind ? true : !blocked.has(String(fn))) && (isGeneralKind ? true : !DETAIL_GENERAL_FIELDS.includes(String(fn))))
    const list = (kind === 'ANAGRAFICA' && sogg)
      ? visibleBase.filter(fn => {
          if (!fn) return false
          if (sogg === 'PF' && isPgOnlyField(fn)) return false
          if (sogg === 'PG' && isPfOnlyField(fn)) return false
          return true
        })
      : visibleBase
    const rows: Array<{ label: string; value: any; fieldName?: string; multiline?: boolean }> = []
    for (const f of list) {
      if (!f) continue
      const resolved = resolveFieldNameLoose(data, aliasMap, f)
      const vv = data ? (data as any)[resolved] : null
      const label = toLabel(resolved || f)
      const isRilevazioneDate = isRilevazioneDateFieldName(resolved || f, label)
      let displayValue = isRilevazioneDate ? pickRilevazioneDateValueForDisplay(data) : vv

      // Nel dettaglio non mostrare i codici tecnici PF/PG: il campo deve essere leggibile.
      const isTipoSoggettoRow = String(kind || '').toUpperCase() === 'ANAGRAFICA' && (
        normKey(resolved || f) === normKey(tipoFieldForRows || '') ||
        normKey(resolved || f) === 'tipologia soggetto' ||
        normKey(resolved || f) === 'tipo soggetto' ||
        normKey(label).includes('tipologia soggetto') ||
        normKey(label).includes('tipo soggetto')
      )
      if (isTipoSoggettoRow) {
        const tipoKindRow = classifyTipoSoggetto(displayValue, tipoLabel)
        if (tipoKindRow === 'PF') displayValue = 'Persona Fisica'
        else if (tipoKindRow === 'PG') displayValue = 'Persona Giuridica'
        else if (tipoLabel) displayValue = String(tipoLabel)
      }

      if (hideEmpty && isEmptyValue(displayValue)) continue
      const fieldType = fieldTypeMap?.[resolved || f] || ''
      rows.push({ label, value: formatFieldValue(displayValue, resolved || f, fieldType, label), multiline: isLongTextFieldName(resolved || f) })
    }
    return rows
  }, [data, toLabel, classifyTipoSoggetto, isPfOnlyField, isPgOnlyField, aliasMap, fieldTypeMap])
// Iter: blocchi DT / Determinazione basati su stato/esito e date.
  const dtPresaDT = data ? data.dt_presa_in_carico_DT : null
  const statoDT = data ? data.stato_DT : null
  const dtStatoDT = data ? data.dt_stato_DT : null
  const esitoDT = data ? data.esito_DT : null
  const dtEsitoDT = data ? data.dt_esito_DT : null
  const noteDT = data ? data.note_DT : null

  const determinazioneStato = data ? data.determinazione_stato : null
  const determinazioneNumero = data ? data.determinazione_numero : null
  const determinazioneData = data ? data.determinazione_data : null
  const determinazioneTrasIl = data ? data.determinazione_trasmessa_firma_il : null



  const getRawField = React.useCallback((fieldName: string): any => {
    const resolved = resolveFieldNameLoose(data, aliasMap, fieldName)
    return data ? (data as any)[resolved] : null
  }, [data, aliasMap])

  const getRawFieldWithName = React.useCallback((fieldNames: string[]): { fieldName: string; value: any } => {
    for (const fieldName of fieldNames) {
      const resolved = resolveFieldNameLoose(data, aliasMap, fieldName)
      const value = data ? (data as any)[resolved] : null
      if (!isEmptyValue(value)) return { fieldName: resolved || fieldName, value }
    }
    const fallback = fieldNames[0] || ''
    const resolved = resolveFieldNameLoose(data, aliasMap, fallback)
    return { fieldName: resolved || fallback, value: data ? (data as any)[resolved] : null }
  }, [data, aliasMap])

  const getFieldLabel = React.useCallback((fieldName: string, raw: any): string => {
    if (raw == null || raw === '') return '—'
    const resolved = resolveFieldNameLoose(data, aliasMap, fieldName)
    const byDomain = ds ? resolveCodedValueLabel(ds, resolved || fieldName, raw) : null
    if (byDomain) return byDomain
    return String(raw)
  }, [data, aliasMap, ds])

  const splitMultiValues = React.useCallback((raw: any): string[] => {
    if (raw == null || raw === '') return []
    if (Array.isArray(raw)) return raw.map(x => String(x)).filter(Boolean)
    const s = String(raw).trim()
    if (!s) return []
    const artMatches = s.match(/Art\s*\d+(?:\.\d+)?/gi)
    if (artMatches && artMatches.length > 1) return artMatches.map(x => x.replace(/\s+/g, '')).filter(Boolean)
    return s.split(/[;,\n]+/).map(v => v.trim()).filter(Boolean)
  }, [])

  const renderDash = (txt = '—') => (
    <div style={{
      fontSize: 13,
      fontWeight: 600,
      color: '#6b7280',
      padding: '7px 0'
    }}>{txt}</div>
  )

  const SURVEY_CHOICE_LABELS: Record<string, Record<string, string>> = {
    norma1: {
      'Art15.1': 'Art. 15 - Prelievo abusivo d’acqua',
      'Art15.2': 'Art. 15 - Prelievo abusivo d’acqua',
      'Art15.3': 'Art. 15 - Prelievo abusivo d’acqua',
      'Art15.4': 'Art. 15 - Prelievo abusivo d’acqua'
    },
    art15_parziale: {
      'Art15.1': 'Prima contestazione',
      'Art15.2': 'Recidiva'
    },
    art15_totale: {
      'Art15.3': 'Prima contestazione',
      'Art15.4': 'Recidiva'
    },
    art16_17: {
      'Art16': 'Art. 16 - Presentazione tardiva comunicazione di irrigazione',
      'Art17': 'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia'
    },
    art17_tipo: {
      'Art17.1': 'Variazione tardiva',
      'Art17.2': 'Rinuncia tardiva'
    },
    norma3: {
      'Art8': 'Art. 8 - Violazione servizio di reperibilità',
      'Art12': 'Art. 12 - Negato accesso ai fondi (al personale consortile)',
      'Art27': 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica',
      'Art28': 'Art. 28 - Violazione prescrizioni del consorzio',
      'Art29': 'Art. 29 - Violazione termini restituzione attrezzature',
      'Art30': 'Art. 30 - Danneggiamento e/o perdita attrezzature',
      'Art31': 'Art. 31 - Mancata segnalazione guasti',
      'Art32': 'Art. 32 - Negato accesso ai fondi (al consorziato)',
      'Art33': 'Art. 33 - Inosservanza limiti temporali di prelievo',
      'Art34': 'Art. 34 - Interferenze',
      'Art35': 'Art. 35 - Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante',
      'Art36': 'Art. 36 - Uso attrezzature non autorizzate',
      'Art37': 'Art. 37 - Uso sistemi di irrigazione incompatibili',
      'Art39': 'Art. 39 - Danni alle strutture irrigue'
    }
  }

  const getSurveyChoiceLabel = React.useCallback((listName: string, code: any): string => {
    const key = String(code ?? '').trim()
    if (!key) return '—'
    return SURVEY_CHOICE_LABELS[listName]?.[key] || String(code)
  }, [])

  const parseGradiViolazioni = React.useCallback((raw: any): Record<string, string> => {
    const out: Record<string, string> = {}
    const txt = String(raw ?? '').trim()
    if (!txt) return out
    txt.split(/[;\n,]+/).forEach(part => {
      const item = String(part || '').trim()
      if (!item) return
      const m = item.match(/(?:art\.?\s*)?(\d{1,2})(?:\.\d+)?\s*[-:=]\s*([1-4])/i)
      if (!m) return
      out[String(Number(m[1]))] = m[2]
    })
    return out
  }, [])

  const gradiViolazioniByArt = React.useMemo(() => {
    return parseGradiViolazioni(getRawField('gradi_violazioni'))
  }, [getRawField, parseGradiViolazioni])

  const articoliConGrado = React.useMemo(() => new Set(['12', '27', '28', '31', '32', '33', '34', '35', '36', '37']), [])

  const getArticleNumber = React.useCallback((code: any): string => {
    const m = String(code ?? '').match(/(\d{1,2})(?:\.\d+)?/)
    return m ? String(Number(m[1])) : ''
  }, [])

  const splitViolationLabel = React.useCallback((code: any, fullLabel: string): { artLabel: string; description: string } => {
    const txt = String(fullLabel || '').trim()
    const m = txt.match(/^(Art\.?\s*\d+(?:\.\d+)?)\s*[-–—]\s*(.*)$/i)
    if (m) return { artLabel: m[1].replace(/^Art\.?/i, 'Art.'), description: m[2] || '—' }
    const artNum = getArticleNumber(code)
    return { artLabel: artNum ? `Art. ${artNum}` : 'Art.', description: txt || '—' }
  }, [getArticleNumber])

  const renderAltraViolazioneLine = React.useCallback((code: any, idx: number) => {
    const descrFull = getSurveyChoiceLabel('norma3', code)
    const artNum = getArticleNumber(code)
    const parsed = splitViolationLabel(code, descrFull)
    const hasGrado = !!artNum && articoliConGrado.has(artNum)
    const grado = hasGrado ? (gradiViolazioniByArt[artNum] || '—') : undefined
    return (
      <ViolationArticleLine
        key={`${String(code)}-${idx}`}
        artLabel={parsed.artLabel}
        description={parsed.description}
        grado={grado}
        articleCode={artNum ? `Art${artNum}` : undefined}
        articleState={regolamentoArticoliState}
      />
    )
  }, [articoliConGrado, getArticleNumber, getSurveyChoiceLabel, gradiViolazioniByArt, splitViolationLabel, regolamentoArticoliState])

  const renderSurveyGroup = React.useCallback((title: string, rows: Array<{ label: string; value: any; multiline?: boolean }>, emptyText = '—') => {
    return (
      <DetailSectionCard title={title} bodyPadding={10}>
        {rows.length
          ? <div style={{ display: 'grid', gap: 0 }}>{rows.map((r, i) => <DetailRow key={i} label={r.label} value={r.value} labelSize={12} valueSize={13} multiline={!!r.multiline} />)}</div>
          : renderDash(emptyText)}
      </DetailSectionCard>
    )
  }, [])

  const renderViolationTextLine = React.useCallback((label: string, value: any) => {
    const txt = value == null || value === '' ? '—' : value
    return <DetailRow label={label} value={txt} labelSize={12} valueSize={13} multiline={false} />
  }, [])

  const renderViolationSurfacesLine = React.useCallback((leftLabel: string, leftValue: any, rightLabel: string, rightValue: any) => {
    const leftTxt = leftValue == null || leftValue === '' ? '—' : leftValue
    const rightTxt = rightValue == null || rightValue === '' ? '—' : rightValue
    return (
      <>
        <DetailRow label={leftLabel} value={leftTxt} labelSize={12} valueSize={13} multiline={false} />
        <DetailRow label={rightLabel} value={rightTxt} labelSize={12} valueSize={13} multiline={false} />
      </>
    )
  }, [])

  const renderViolationGroup = React.useCallback((title: string, body: React.ReactNode) => {
    return <DetailSectionCard title={title}>{body}</DetailSectionCard>
  }, [])

  const violationSurveyContent = React.useMemo(() => {
    const art15TipoAbusoRaw = getRawField('tipo_abuso')
    const art15TipoAbusoKey = String(art15TipoAbusoRaw ?? '').trim().toLowerCase()
    const art15ParzRaw = getRawField('norma15_parziale')
    const art15TotRaw = getRawField('norma15_totale')
    const art15Code = !isEmptyValue(art15ParzRaw) ? art15ParzRaw : art15TotRaw
    const art15NormaRaw = getRawField('norma_violata1')
    const occorrenzaInfo = getRawFieldWithName(['occorrenza'])
    // Il gruppo deve comparire solo quando l'Art. 15 è realmente selezionato.
    // Superfici e occorrenza possono contenere valori residui/default e non sono
    // sufficienti, da sole, a dimostrare la presenza della violazione.
    const hasArt15 = !isEmptyValue(art15TipoAbusoRaw) || !isEmptyValue(art15Code) || !isEmptyValue(art15NormaRaw)

    const art15Body = hasArt15
      ? (() => {
          const isParziale = art15TipoAbusoKey
            ? art15TipoAbusoKey === 'parziale'
            : !isEmptyValue(art15ParzRaw)
          const tipoAbusoFromField = !isEmptyValue(art15TipoAbusoRaw)
            ? getFieldLabel('tipo_abuso', art15TipoAbusoRaw)
            : ''
          const tipoAbuso = tipoAbusoFromField
            ? (String(tipoAbusoFromField).toLowerCase() === 'parziale' ? 'Parziale' : (String(tipoAbusoFromField).toLowerCase() === 'totale' ? 'Totale' : tipoAbusoFromField))
            : (isParziale ? 'Parziale' : 'Totale')
          const occorrenza = !isEmptyValue(occorrenzaInfo.value)
            ? (String(occorrenzaInfo.value) === '1' ? 'Prima contestazione' : (String(occorrenzaInfo.value) === '2' ? 'Recidiva' : getFieldLabel(occorrenzaInfo.fieldName, occorrenzaInfo.value)))
            : '—'
          const supDich = formatFieldValue(getRawField('sup_dichiarata_art15'), 'sup_dichiarata_art15', fieldTypeMap?.sup_dichiarata_art15, 'Superficie dichiarata (ha.a.ca)')
          const supIrr = formatFieldValue(getRawField('sup_irrigata_art15'), 'sup_irrigata_art15', fieldTypeMap?.sup_irrigata_art15, 'Superficie irrigata (ha.a.ca)')
          return (
            <div style={{ display: 'grid', gap: 0 }}>
              <ViolationArticleLine artLabel='Art. 15' description='Prelievo abusivo d’acqua' articleCode='Art15' articleState={regolamentoArticoliState} />
              {renderViolationSurfacesLine('Tipo di abuso', tipoAbuso, 'Occorrenza', occorrenza)}
              {renderViolationSurfacesLine('Superficie dichiarata (ha.a.ca)', supDich, 'Superficie irrigata (ha.a.ca)', supIrr)}
            </div>
          )
        })()
      : renderDash('—')

    const art16_17Raw = getRawField('norma16_17')
    const art17TipoRaw = getRawField('art17_tipo')
    const art16_17NormaRaw = getRawField('norma_violata2')
    // Anche questo gruppo compare soltanto in presenza di una selezione reale;
    // gli eventuali valori numerici residui delle superfici non lo rendono visibile.
    const has16or17 = !isEmptyValue(art16_17Raw) || !isEmptyValue(art17TipoRaw) || !isEmptyValue(art16_17NormaRaw)
    const art1617Body = has16or17
      ? (() => {
          if (String(art16_17Raw || '') === 'Art16') {
            return (
              <div style={{ display: 'grid', gap: 0 }}>
                <ViolationArticleLine artLabel='Art. 16' description='Presentazione tardiva comunicazione di irrigazione' articleCode='Art16' articleState={regolamentoArticoliState} />
                {renderViolationSurfacesLine(
                  'Superficie dichiarata (ha.a.ca)',
                  formatFieldValue(getRawField('sup_dichiarata_art16'), 'sup_dichiarata_art16', fieldTypeMap?.sup_dichiarata_art16, 'Superficie dichiarata (ha.a.ca)'),
                  'Superficie irrigata (ha.a.ca)',
                  formatFieldValue(getRawField('sup_irrigata_art16_17_2'), 'sup_irrigata_art16_17_2', fieldTypeMap?.sup_irrigata_art16_17_2, 'Superficie irrigata (ha.a.ca)')
                )}
              </div>
            )
          }

          if (String(art16_17Raw || '') === 'Art17' || !isEmptyValue(art17TipoRaw)) {
            const tipoViolazione = getSurveyChoiceLabel('art17_tipo', art17TipoRaw)
            const isVar = String(art17TipoRaw || '') === 'Art17.1'
            return (
              <div style={{ display: 'grid', gap: 0 }}>
                <ViolationArticleLine artLabel='Art. 17' description='Presentazione tardiva comunicazione di variazione o di rinuncia' articleCode='Art17' articleState={regolamentoArticoliState} />
                {renderViolationTextLine('Tipo comunicazione', tipoViolazione)}
                {isVar
                  ? renderViolationSurfacesLine(
                    'Superficie dichiarata (ha.a.ca)',
                    formatFieldValue(getRawField('sup_dichiarata_art17_1'), 'sup_dichiarata_art17_1', fieldTypeMap?.sup_dichiarata_art17_1, 'Superficie dichiarata (ha.a.ca)'),
                    'Superficie variata (ha.a.ca)',
                    formatFieldValue(getRawField('sup_irrigata_art17_1'), 'sup_irrigata_art17_1', fieldTypeMap?.sup_irrigata_art17_1, 'Superficie variata (ha.a.ca)')
                    )
                  : renderViolationSurfacesLine(
                    'Superficie dichiarata (ha.a.ca)',
                    formatFieldValue(getRawField('sup_dichiarata_art17_2'), 'sup_dichiarata_art17_2', fieldTypeMap?.sup_dichiarata_art17_2, 'Superficie dichiarata (ha.a.ca)'),
                    'Superficie irrigata (ha.a.ca)',
                    formatFieldValue(getRawField('sup_irrigata_art16_17_2'), 'sup_irrigata_art16_17_2', fieldTypeMap?.sup_irrigata_art16_17_2, 'Superficie irrigata (ha.a.ca)')
                    )}
              </div>
            )
          }

          return renderDash('—')
        })()
      : renderDash('—')

    const altreCodes = splitMultiValues(getRawField('norma_violata3')).sort((a, b) => {
      const articleNumber = (value: string): number => {
        const match = String(value || '').match(/Art\s*0*(\d+)/i)
        return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
      }
      return articleNumber(a) - articleNumber(b)
    })
    const altreBody = altreCodes.length
      ? (
        <div style={{ display: 'grid', gap: 0 }}>
          {altreCodes.map((code, idx) => renderAltraViolazioneLine(code, idx))}
        </div>
        )
      : renderDash('—')

    const descrFatti = formatFieldValue(getRawField('descrizione_fatti'), 'descrizione_fatti', fieldTypeMap?.descrizione_fatti, 'Descrizione dettagliata dell’infrazione')
    const circ = formatFieldValue(getRawField('circostanze'), 'circostanze', fieldTypeMap?.circostanze, 'Circostanze rilevanti dell’infrazione')
    const presenzaInfo = getRawFieldWithName([
      'presenza_trasgressore',
      'trasgressore_presente',
      'presente_trasgressore',
      'presenza_del_trasgressore',
      'il_trasgressore_era_presente',
      'trasgressore_era_presente'
    ])
    const presenzaTrasgressore = !isEmptyValue(presenzaInfo.value)
      ? getFieldLabel(presenzaInfo.fieldName, presenzaInfo.value)
      : '—'
    const detailsBody = (
      <div style={{ display: 'grid', gap: 0 }}>
        <DetailRow label='Descrizione dettagliata della violazione' value={descrFatti} labelSize={12} valueSize={13} multiline />
        <DetailRow label='Circostanze rilevanti dell’infrazione' value={circ} labelSize={12} valueSize={13} multiline />
        {renderViolationTextLine('Il trasgressore era presente?', presenzaTrasgressore)}
      </div>
    )

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {hasArt15 ? renderViolationGroup('Prelievo abusivo d’acqua', art15Body) : null}
        {has16or17 ? renderViolationGroup('Inosservanza termini presentazione comunicazioni', art1617Body) : null}
        {altreCodes.length ? renderViolationGroup('Altre violazioni', altreBody) : null}
        {renderViolationGroup('Dettagli della violazione', detailsBody)}
      </div>
    )
  }, [getRawField, getRawFieldWithName, getFieldLabel, splitMultiValues, fieldTypeMap, getSurveyChoiceLabel, renderAltraViolazioneLine, renderViolationGroup, renderViolationSurfacesLine, renderViolationTextLine, regolamentoArticoliState])

  // Violazione — conteggio "a colpo d'occhio" delle violazioni selezionate per il badge
  // sulla tab. Stessa logica booleana (hasArt15 / has16or17 / altreCodes) già usata sopra
  // in violationSurveyContent per decidere quali gruppi mostrare: nessuna query aggiuntiva,
  // i campi sono già tra quelli sempre interrogati per il record.
  const violazioneSelectedCount = React.useMemo(() => {
    if (!hasSel || !data) return 0
    let count = 0
    const art15ParzRaw = getRawField('norma15_parziale')
    const art15TotRaw = getRawField('norma15_totale')
    const art15Code = !isEmptyValue(art15ParzRaw) ? art15ParzRaw : art15TotRaw
    const hasArt15 = !isEmptyValue(getRawField('tipo_abuso')) || !isEmptyValue(art15Code) || !isEmptyValue(getRawField('norma_violata1'))
    if (hasArt15) count++
    const has16or17 = !isEmptyValue(getRawField('norma16_17')) || !isEmptyValue(getRawField('art17_tipo')) || !isEmptyValue(getRawField('norma_violata2'))
    if (has16or17) count++
    count += splitMultiValues(getRawField('norma_violata3')).length
    return count
  }, [hasSel, data, getRawField, splitMultiValues])

  const generalSummary = React.useMemo(() => {
    const areaRaw = pickAttrCI(data, ['area_cod', 'Area_cod', 'AREA_COD', 'area'])
    const settoreRaw = pickAttrCI(data, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'cod_settore'])
    const ufficioRaw = pickAttrCI(data, ['ufficio_zona', 'Ufficio_zona', 'UFFICIO_ZONA', 'ufficio'])
    const dataRil = pickRilevazioneDateValueForDisplay(data)
    const dataRap = pickAttrCI(data, ['data_rapporto_tecnico', 'Data_rapporto_tecnico', 'DATA_RAPPORTO_TECNICO'])
    const dataVerb = pickAttrCI(data, ['accertamento_data'])
    return {
      area: formatAreaLabel(getFieldLabel('area_cod', areaRaw)),
      settore: formatSettoreLabel(getFieldLabel('settore_cod', settoreRaw)),
      ufficio: formatUfficioLabel(getFieldLabel('ufficio_zona', ufficioRaw)),
      numeroRilevazione: numeroRilevazione || '—',
      dataRilevazione: formatDateTimeSafe(dataRil),
      numeroRapporto: numeroRapportoTecnico || '—',
      dataRapporto: formatDateTimeSafe(dataRap),
      numeroVerbale: numeroVerbale || '—',
      dataVerbale: formatDateTimeSafe(dataVerb)
    }
  }, [data, numeroRilevazione, numeroRapportoTecnico, numeroVerbale, getFieldLabel])

  const [selectedPointGeometryState, setSelectedPointGeometryState] = React.useState<{ oid: number | null, geometry: any | null } | null>(null)
  const selectedPointGeometry = React.useMemo(() => {
    const oid = Number(selectedOid)
    if (!selectedPointGeometryState || !Number.isFinite(oid) || selectedPointGeometryState.oid !== oid) return null
    return selectedPointGeometryState.geometry
  }, [selectedPointGeometryState, selectedOid])

  React.useEffect(() => {
    let cancelled = false
    const oid = Number(selectedOid)

    if (!hasSel || selectedOid == null || !Number.isFinite(oid)) {
      setSelectedPointGeometryState(prev => prev == null ? prev : null)
      return () => { cancelled = true }
    }

    const existingGeom = getUsableDataGeometry(data)
    if (existingGeom) {
      setSelectedPointGeometryState(prev => {
        if (prev?.oid === oid && isSamePointGeometry(prev.geometry, existingGeom)) return prev
        return { oid, geometry: existingGeom }
      })
      return () => { cancelled = true }
    }

    setSelectedPointGeometryState(prev => {
      if (prev?.oid === oid && isUsablePointGeometry(prev.geometry)) return prev
      if (prev?.oid === oid && prev.geometry == null) return prev
      return { oid, geometry: null }
    })

    const loadPointGeometry = async () => {
      try {
        const layer = await resolveFeatureLayerForAttachments(ds as any)
        if (cancelled || !layer || typeof layer.queryFeatures !== 'function') return

        try { if (typeof layer.load === 'function') await layer.load() } catch {}

        const oidField = String(layer?.objectIdField || active?.state?.idFieldName || ds?.getIdField?.() || 'OBJECTID')
        const q = layer.createQuery ? layer.createQuery() : {}
        q.where = `${oidField} = ${oid}`
        q.outFields = [oidField]
        q.returnGeometry = true
        q.num = 1
        q.pageSize = 1

        const res = await layer.queryFeatures(q)
        if (cancelled) return

        let geom = res?.features?.[0]?.geometry || null
        if (geom && (geom?.spatialReference?.wkid === 102100 || geom?.spatialReference?.wkid === 3857)) {
          try {
            const wmu = await loadEsriModule<any>('esri/geometry/support/webMercatorUtils')
            const g = wmu.webMercatorToGeographic(geom)
            if (g) geom = g
          } catch {}
        }

        setSelectedPointGeometryState(prev => {
          if (!isUsablePointGeometry(geom)) return prev?.oid === oid ? prev : { oid, geometry: null }
          if (prev?.oid === oid && isSamePointGeometry(prev.geometry, geom)) return prev
          return { oid, geometry: geom }
        })
      } catch {
        if (!cancelled) {
          setSelectedPointGeometryState(prev => prev?.oid === oid ? prev : { oid, geometry: null })
        }
      }
    }

    void loadPointGeometry()
    return () => { cancelled = true }
  }, [ds, hasSel, selectedOid, active?.state?.idFieldName, data])

  const luoghiDatiRows = React.useMemo(() => {
    const pick = (candidates: string[]) => {
      for (const c of candidates) {
        const resolved = resolveFieldNameLoose(data, aliasMap, c)
        if (resolved && data && Object.prototype.hasOwnProperty.call(data, resolved)) {
          const value = (data as any)[resolved]
          if (!isEmptyValue(value)) return { fieldName: resolved, value }
        }
      }
      for (const c of candidates) {
        const resolved = resolveFieldNameLoose(data, aliasMap, c)
        if (resolved && data && Object.prototype.hasOwnProperty.call(data, resolved)) {
          return { fieldName: resolved, value: (data as any)[resolved] }
        }
      }
      return { fieldName: candidates[0] || '', value: null }
    }

    const rows = [
      { label: 'Descrizione del luogo', candidates: ['descrizione_luogo', 'descrizione_del_luogo', 'descr_luogo', 'luogo_descrizione', 'descrizione_ubicazione'], multiline: true },
      { label: 'Distretto', candidates: ['distretto', 'distretto_irriguo'], multiline: false },
      { label: 'Comizio', candidates: ['comizio'], multiline: false },
      { label: 'Idrante', candidates: ['idrante', 'idrante_numero'], multiline: false },
      { label: 'Matricola contatore', candidates: ['matricola_contatore', 'contatore_matricola'], multiline: false },
      { label: 'Matricola tessera', candidates: ['matricola_tessera', 'tessera_matricola'], multiline: false }
    ].map(item => {
      const picked = pick(item.candidates)
      const fieldType = fieldTypeMap?.[picked.fieldName] || ''
      return {
        label: item.label,
        fieldName: picked.fieldName,
        value: formatFieldValue(picked.value, picked.fieldName, fieldType, item.label),
        multiline: Boolean(item.multiline)
      }
    })

    const coords = formatPointGeometryCoordinates(selectedPointGeometry) || formatPointCoordinates(data) || '—'
    rows.unshift({
      label: 'Coordinate',
      fieldName: '__geometry',
      value: coords,
      multiline: false
    })

    return rows
  }, [data, aliasMap, fieldTypeMap, selectedPointGeometry])

  const allegatiCountForBadge = visibleTechnicalAttachments.length
  const allegatiLoadingForBadge = attachmentsLoading && attachmentsForOid !== selectedOid

  const TabsBar = (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: 8, 
      padding: `8px ${ui.panelPadding}px`,
      alignItems: 'center',
      background: 'var(--bs-body-bg, #fff)',
      marginLeft: -ui.panelPadding,
      marginRight: -ui.panelPadding,
      width: `calc(100% + ${ui.panelPadding * 2}px)`
    }}>
      {hasSel && tabs.map((t) => {
        const isIterTab = Boolean((t as any).isIterTab)
        const iterSortIndicator = isIterTab && tab === t.id && iterSortDir ? (iterSortDir === 'desc' ? '▼' : '▲') : ''
        let badge: TabButtonBadge | undefined
        if (t.id === 'violazione') {
          if (violazioneSelectedCount > 0) badge = { kind: 'count', value: violazioneSelectedCount }
        } else if (t.id === 'nota_spese') {
          if (!nsdLoading && nsdTotalCountForBadge > 0) badge = { kind: 'ratio', done: nsdDoneCountForBadge, total: nsdTotalCountForBadge }
        } else if (t.id === 'allegati') {
          if (!allegatiLoadingForBadge && allegatiCountForBadge > 0) badge = { kind: 'count', value: allegatiCountForBadge }
        }
        return (
          <TabButton 
            key={t.id}
            active={tab === t.id} 
            label={iterSortIndicator ? `${t.label} ${iterSortIndicator}` : t.label} 
            badge={badge}
            onClick={() => {
              if (isIterTab) {
                if (tab === t.id) setIterSortDir(prev => prev === 'desc' ? 'asc' : 'desc')
                else setIterSortDir(prev => prev || 'desc')
              }
              setTab(t.id)
            }} 
          />
        )
      })}
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
  padding: `0 ${ui.panelPadding}px ${ui.panelPadding}px ${ui.panelPadding}px`
}

const tabsStyle: React.CSSProperties = {
  flex: '0 0 auto'
}

const contentStyle: React.CSSProperties = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto'
}

const isMapTab = tab === 'mappa'
const activeContentStyle: React.CSSProperties = isMapTab
  ? { flex: '1 1 auto', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
  : contentStyle

let content: React.ReactNode = null

if (!hasSel) {
  content = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, fontWeight: 700, fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>
      {props.emptyMessage || 'Selezionare una pratica nell’elenco'}
    </div>
  )
} else {
  const activeTab = tabs.find(t => t.id === tab)
  
  if (activeTab?.isIterTab) {
    const gid = data?.GlobalID ?? data?.globalid ?? data?.globalId ?? data?.GLOBALID ?? ''
    content = <CicliTimeline globalId={String(gid)} hasSel={hasSel} sortDir={iterSortDir || 'desc'} data={data} aliasMap={aliasMap} />
  } else if (activeTab) {
    // Tab normale con campi configurabili
    const rows = aliasesReady ? makeRows(activeTab.fields, activeTab.id.toUpperCase(), Boolean((activeTab as any).hideEmpty)) : []

    if (activeTab.id === LUOGHI_DATI_TAB_ID) {
      content = (
        <ReadOnlyPanel
          title="Luoghi e dati"
          rows={luoghiDatiRows}
          emptyText={hasSel ? 'Dati luogo non disponibili.' : 'Selezionare una pratica.'}
        />
      )
    } else if (activeTab.id === 'allegati') {
      // Pannello Allegati: elenco attachments (se presenti) + (opzionale) attributi della tab
      const dsAny: any = ds as any
      const layer = unwrapJsapiLayer(
        (dsAny && (typeof dsAny.getLayer === 'function') ? dsAny.getLayer() : null) ||
        (dsAny && (typeof dsAny.getJsApiLayer === 'function') ? dsAny.getJsApiLayer() : null) ||
        (dsAny && dsAny.layer) ||
        dsAny
      ) as any
      const layerUrl = layer && layer.url ? String(layer.url) : ''

      const getOpenUrl = (att: any): string | null => {
        if (att && att.url) return String(att.url)
        if (layerUrl && selectedOid != null && att && att.id != null) return `${layerUrl}/${selectedOid}/attachments/${att.id}`
        return null
      }

      content = (
        <div style={{ marginTop: 0 }}>
          {!hasSel && (
            <div style={{ opacity: 0.75, fontSize: 12 }}>Selezionare una pratica per vedere gli allegati.</div>
          )}

          {hasSel && attachmentsLoading && (
            <div style={{ opacity: 0.75, fontSize: 12 }}>Caricamento allegati…</div>
          )}

          {hasSel && !attachmentsLoading && attachmentsError && (
            <div style={{ color: '#b00020', fontSize: 12 }}>{attachmentsError}</div>
          )}

          {hasSel && !attachmentsLoading && !attachmentsError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(visibleTechnicalAttachments && visibleTechnicalAttachments.length) ? (
                visibleTechnicalAttachments.map((a, idx) => {
                  const url = getOpenUrl(a)
                  return (
                    <DetailSectionCard key={a.id} title={`Allegato ${idx + 1}`} bodyPadding={10}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <DetailRow label="Nome file" value={a.name || `Allegato #${a.id}`} labelSize={12} valueSize={13} multiline={false} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                          <DetailRow label="Tipo" value={a.contentType || '—'} labelSize={12} valueSize={13} multiline={false} />
                          <DetailRow label="Dimensione" value={formatBytes(a.size) || '—'} labelSize={12} valueSize={13} multiline={false} />
                        </div>
                        {url ? (
                          <div>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
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
                                display: 'inline-flex',
                                padding: '6px 10px',
                                borderRadius: 10,
                                border: '1px solid rgba(0,0,0,0.12)',
                                background: '#fff',
                                color: '#111827',
                                textDecoration: 'none',
                                fontSize: 12,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              Apri allegato
                            </a>
                          </div>
                        ) : (
                          <div style={{ opacity: 0.6, fontSize: 12 }}>URL non disponibile</div>
                        )}
                      </div>
                    </DetailSectionCard>
                  )
                })
              ) : (
                <div style={{ opacity: 0.75, fontSize: 12 }}>Nessun allegato.</div>
              )}
            </div>
          )}
        </div>
      )
    } else if (activeTab.id === 'nota_spese') {
      content = <NotaSpeseDetailPanel data={data} detailUrl={String(props.notaSpeseCfg?.detailUrl || '')} hasSel={hasSel} rows={nsdRows} loading={nsdLoading} error={nsdError} attrezzatureCatalog={nsdAttrezzatureCatalog} />
    } else if (activeTab.id === 'mappa') {
      const dsAny: any = ds as any
      const mapLayerUrl = String(
        dsAny?.getDataSourceJson?.()?.url ??
        dsAny?.dataSourceJson?.url ??
        (unwrapJsapiLayer(dsAny?.getLayer?.() || dsAny?.getJsApiLayer?.() || dsAny?.layer || dsAny) as any)?.url ??
        ''
      ).trim()
      content = (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {!hasSel ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, opacity: 0.6, fontSize: 12 }}>
              Selezionare una pratica per visualizzare la mappa.
            </div>
          ) : (
            <MapTabContent oid={selectedOid} layerUrl={mapLayerUrl} hasSel={hasSel} mapCfg={props.mapCfg} selectionSig={active?.state?.sig}/>
          )}
        </div>
      )
    } else {
      content = activeTab.id === 'violazione'
        ? (
          <div style={{ marginTop: 0 }}>
            {violationSurveyContent}
          </div>
          )
        : (
          <ReadOnlyPanel
            title={activeTab.id === 'anagrafica' ? 'Trasgressore' : String(activeTab.label || '')}
            rows={rows}
            emptyText={hasSel ? 'Nessun campo configurato per questa tab.' : 'Selezionare una pratica.'}
          />
          )
    }
  }
}

return (
  <div style={outerStyle}>
    {/* Titolo pratica - sopra l'area bianca */}
    <div style={{
      minHeight: ui.detailTitleHeight ?? 40,
      paddingBottom: ui.detailTitlePaddingBottom ?? 10,
      paddingLeft: ui.detailTitlePaddingLeft ?? 0,
      paddingRight: ui.detailTitlePaddingRight ?? 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      boxSizing: 'border-box',
      flex: '0 0 auto',
      background: (ui as any).detailTitleBg && (ui as any).detailTitleBg !== 'transparent' ? (ui as any).detailTitleBg : undefined
    }}>
      <span style={{
        fontSize: ui.detailTitleFontSize ?? 14,
        fontWeight: ui.detailTitleFontWeight ?? 600,
        color: hasSel
          ? (ui.detailTitleColor ?? 'rgba(0,0,0,0.85)')
          : 'rgba(0,0,0,0.40)'
      }}>
        {String(ui.detailTitlePrefix ?? 'Dettaglio pratica selezionata')}
      </span>
      {!hasSel && (
        <span style={{
          marginLeft: 'auto',
          fontSize: ui.detailTitleFontSize ?? 14,
          lineHeight: 1.35,
          whiteSpace: 'normal',
          color: '#4b5563'
        }}>
          Selezionare una riga.
        </span>
      )}
    </div>
    <div style={frameStyle}>
      {!hasSel ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, fontWeight: 700, fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>
          {props.emptyMessage || "Selezionare una pratica nell'elenco"}
        </div>
      ) : (
        <>
          <div style={{ padding: '10px 0 0' }}>
            <GeneralCompactPanel
              area={generalSummary.area}
              settore={generalSummary.settore}
              ufficio={generalSummary.ufficio}
              numeroRilevazione={generalSummary.numeroRilevazione}
              dataRilevazione={generalSummary.dataRilevazione}
              numeroRapporto={generalSummary.numeroRapporto}
              dataRapporto={generalSummary.dataRapporto}
              numeroVerbale={generalSummary.numeroVerbale}
              dataVerbale={generalSummary.dataVerbale}
            />
          </div>
          <div style={tabsStyle}>{TabsBar}</div>
          <div style={activeContentStyle}>{content}</div>
        </>
      )}
    </div>
  </div>
)

}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfgMutable: any = (props.config && (props.config as any).asMutable)
    ? (props.config as any).asMutable({ deep: true })
    : (props.config as any || {})
  const cfg: any = { ...defaultConfig, ...cfgMutable }


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

    detailTitlePrefix: String(cfg.detailTitlePrefix ?? defaultConfig.detailTitlePrefix),
    detailTitleHeight: Number.isFinite(Number(cfg.detailTitleHeight)) ? Number(cfg.detailTitleHeight) : defaultConfig.detailTitleHeight,
    detailTitlePaddingBottom: Number.isFinite(Number(cfg.detailTitlePaddingBottom)) ? Number(cfg.detailTitlePaddingBottom) : defaultConfig.detailTitlePaddingBottom,
    detailTitlePaddingLeft: Number.isFinite(Number(cfg.detailTitlePaddingLeft)) ? Number(cfg.detailTitlePaddingLeft) : defaultConfig.detailTitlePaddingLeft,
    detailTitlePaddingRight: Number.isFinite(Number(cfg.detailTitlePaddingRight)) ? Number(cfg.detailTitlePaddingRight) : (defaultConfig as any).detailTitlePaddingRight ?? 0,
    detailTitleFontSize: Number.isFinite(Number(cfg.detailTitleFontSize)) ? Number(cfg.detailTitleFontSize) : defaultConfig.detailTitleFontSize,
    detailTitleFontWeight: Number.isFinite(Number(cfg.detailTitleFontWeight)) ? Number(cfg.detailTitleFontWeight) : defaultConfig.detailTitleFontWeight,
    detailTitleColor: String(cfg.detailTitleColor ?? defaultConfig.detailTitleColor),
    detailTitleBg: String((cfg as any).detailTitleBg ?? 'transparent')
  }

  const tabFields: TabFields = {
    anagrafica: normalizeFieldList((cfg as any).anagraficaFields),
    violazione: normalizeFieldList((cfg as any).violazioneFields),
    luoghiDati: normalizeFieldList((cfg as any).luoghiDatiFields),
    allegati: normalizeFieldList((cfg as any).allegatiFields),
    iterExtra: normalizeFieldList((cfg as any).iterExtraFields)
  }

  // Migra tabs
  const migratedTabs = migrateTabs(tabFields, cfg.tabs || [])

  // Questo widget mostra SOLO il dettaglio: la tab "Azioni" è gestita dal widget gii-azioni.
  const detailTabs = React.useMemo(() => {
    const tabsJs: any[] = (migratedTabs as any)?.asMutable
      ? (migratedTabs as any).asMutable({ deep: true })
      : (Array.isArray(migratedTabs) ? (migratedTabs as any[]) : [])
    return (Array.isArray(tabsJs) ? tabsJs : []).filter(t => t && t.id !== 'azioni')
  }, [migratedTabs])


  // Datasource risolta dinamicamente dal widget Elenco: una sola vista effettiva per sessione.
  // Nessun DataSourceComponent / multi-view dichiarata qui.
  const watchFields = [
    'origine_pratica',
    'CreationDate', 'creationdate', 'created_date', 'created_user', 'Creator', 'creator',
    'start', 'end', 'data_firma',
    'it_assegnato_username', 'it_assegnato_nome', 'dt_assegnazione_it', 'it_assegnato_da',
    'ia_assegnato_username', 'ia_assegnato_nome',

    'presa_in_carico_TR', 'dt_presa_in_carico_TR',
    'stato_TR', 'dt_stato_TR',
    'esito_TR', 'dt_esito_TR',
    'note_TR',

    'dt_presa_in_carico_IT',
    'stato_IT', 'dt_stato_IT',
    'note_IT',

    'dt_presa_in_carico_CS',
    'stato_CS', 'dt_stato_CS',
    'note_CS',

    'dt_presa_in_carico_RIT',
    'stato_RIT', 'dt_stato_RIT',
    'note_RIT',

    'dt_presa_in_carico_DT',
    'stato_DT', 'dt_stato_DT',
    'esito_DT', 'dt_esito_DT',
    'note_DT',

    'determinazione_stato', 'determinazione_numero', 'determinazione_data',
    'determinazione_trasmessa_firma_il', 'determinazione_registrata_il',

    // Campi codificati testuali introdotti nella migrazione; restano nascosti
    // nel dettaglio, ma vengono letti per mantenere cache/selezione coerenti.
    'area_cod', 'settore_cod',
    'norma_violata3', 'v_art08', 'v_art27', 'v_art30', 'v_art39',

    // Campi tecnici usati dal rendering dedicato della scheda Violazione.
    // Non vengono mostrati come righe grezze, ma devono essere sempre disponibili
    // anche quando il record selezionato contiene solo un subset di attributi.
    'gradi_violazioni', 'occorrenza'
  ]

const queryFields = React.useMemo(() => {
  const s = new Set<string>()
  let needsAll = false

  const tabsJs: any[] =
    (migratedTabs as any)?.asMutable
      ? (migratedTabs as any).asMutable({ deep: true })
      : (Array.isArray(migratedTabs) ? migratedTabs as any[] : [])

  for (const t of tabsJs) {
    if (!t || t.id === 'azioni' || t.id === 'nota_spese' || t.id === 'mappa') continue
    const fl = normalizeFieldList(t.fields)
    if (!fl.length && t.id !== 'iter') needsAll = true
    for (const f of fl) s.add(String(f))
  }

  for (const f of watchFields) s.add(String(f))
  for (const f of DETAIL_GENERAL_FIELDS) s.add(String(f))
  for (const f of NSD_PARENT_SUMMARY_FIELDS) s.add(String(f))

  const arr = Array.from(s).filter(Boolean)
  return needsAll ? ['*'] : arr
}, [migratedTabs, watchFields.join('|')])


  const [currentUser, setCurrentUser] = React.useState<DetailCurrentUser | null>(() => readDetailCurrentUser())
  React.useEffect(() => {
    const syncUser = () => setCurrentUser(readDetailCurrentUser())
    syncUser()
    window.addEventListener('gii:userLoaded', syncUser as EventListener)
    window.addEventListener('focus', syncUser as EventListener)
    return () => {
      window.removeEventListener('gii:userLoaded', syncUser as EventListener)
      window.removeEventListener('focus', syncUser as EventListener)
    }
  }, [])

  const currentUserKey = React.useMemo(() => {
    if (!currentUser) return ''
    return [
      currentUser.username,
      currentUser.profiloCod ?? currentUser.profilo_cod,
      currentUser.ruoloCod ?? currentUser.ruolo_cod,
      currentUser.areaCod ?? currentUser.area_cod ?? currentUser.areaLabel ?? currentUser.area
    ].map(v => String(v ?? '').trim().toLowerCase()).join('|')
  }, [currentUser])
  const currentUserReady = !!currentUser && !!String(currentUser.username || '').trim()
  const currentUserIsIa = currentUserReady && isGiiIaUser(currentUser)

  const [selection, setSelection] = React.useState<RuntimeSelection | null>(() => readRuntimeSelection())
  React.useEffect(() => {
    const handler = () => setSelection(readRuntimeSelection())
    handler()
    window.addEventListener('gii-selection-changed', handler as any)
    return () => window.removeEventListener('gii-selection-changed', handler as any)
  }, [])

  const [forcedActive, setForcedActive] = React.useState<{ key: string; state: SelState; ownerUserKey: string } | null>(null)
  const forcedReqRef = React.useRef(0)
  const [detailAccessState, setDetailAccessState] = React.useState<'idle' | 'checking' | 'allowed' | 'denied' | 'error'>('idle')

  const [selRefreshNonce, setSelRefreshNonce] = React.useState<number>(0)
  React.useEffect(() => {
    const h = (evt?: any) => {
      forcedReqRef.current += 1
      const cur = readRuntimeSelection()
      const detailLayerUrl = String(evt?.detail?.layerUrl || cur?.layerUrl || '').trim()
      invalidateRuntimeProxyCache(detailLayerUrl)
      setSelRefreshNonce(n => n + 1)
    }
    window.addEventListener('gii-force-refresh-selection', h as any)
    return () => window.removeEventListener('gii-force-refresh-selection', h as any)
  }, [])

  React.useEffect(() => {
    const reset = () => {
      forcedReqRef.current += 1
      setForcedActive(null)
      setDetailAccessState('idle')
    }
    window.addEventListener('gii-practice-context-reset', reset as EventListener)
    return () => window.removeEventListener('gii-practice-context-reset', reset as EventListener)
  }, [])

  React.useEffect(() => {
    const req = ++forcedReqRef.current
    if (!selection?.layerUrl || selection.oid == null) {
      setForcedActive(null)
      setDetailAccessState('idle')
      return
    }
    if (!currentUserReady) {
      setForcedActive(null)
      setDetailAccessState('checking')
      return
    }
    setDetailAccessState(currentUserIsIa ? 'checking' : 'allowed')
    ;(async () => {
      try {
        const stateKey = `${selection.layerUrl}:${selection.oid}:${selRefreshNonce}`
        const syncCachedProxy = (() => {
          try { return (window as any)?.__giiRuntimeDsProxyCache?.[selection.layerUrl] || null } catch { return null }
        })()
        const idFieldName = String(selection.idFieldName || syncCachedProxy?.getIdField?.() || 'OBJECTID')
        const cacheEntry = readSelectedFeatureCache(selection.layerUrl, selection.oid)
        const baseData = cacheEntry?.data && typeof cacheEntry.data === 'object' ? cacheEntry.data : null
        const baseOid = baseData ? Number(baseData[idFieldName] ?? baseData.OBJECTID ?? selection.oid) : NaN

        if (!currentUserIsIa && baseData && Number.isFinite(baseOid) && baseOid === selection.oid) {
          const quickDs = syncCachedProxy || createRuntimeDsStubFromData(selection.layerUrl, selection.viewName, idFieldName, baseData)
          const quickState: SelState = { ds: quickDs, oid: selection.oid, idFieldName, data: mergeSelectionDataKeepingRealGeometry(baseData, null, false), sig: stateKey }
          setForcedActive({ key: selection.layerUrl, state: quickState, ownerUserKey: currentUserKey })
          setDetailAccessState('allowed')
        } else if (currentUserIsIa) {
          // Mai mostrare dati memorizzati prima di aver verificato l'assegnazione.
          setForcedActive(null)
        }

        const dsTry = syncCachedProxy || await createRuntimeDsProxyFromLayerUrl(selection.layerUrl, selection.viewName)
        const wantsAll = queryFields.includes('*')
        const needsQuery = currentUserIsIa || !baseData || wantsAll || queryFields.some(f => f && f !== '*' && !Object.prototype.hasOwnProperty.call(baseData, f)) || !hasUsableDataGeometry(baseData) || selRefreshNonce > 0
        if (!needsQuery) return

        const where = `${idFieldName}=${selection.oid}`
        const res: any = await dsTry.query({ where, outFields: queryFields, returnGeometry: true } as any)
        if (req !== forcedReqRef.current) return
        const recs: any[] = res?.records || []
        if (!recs.length) {
          setForcedActive(null)
          setDetailAccessState(currentUserIsIa ? 'error' : 'idle')
          return
        }
        const r0 = recs[0]
        const fetched = withRecordGeometry(r0?.getData?.() || {}, r0)
        const cached = readSelectedFeatureCache(selection.layerUrl, selection.oid)
        const freshEdit = cached && cached.source === 'edit' && (Date.now() - Number(cached.ts || 0) < 15000)
        const d0 = mergeSelectionDataKeepingRealGeometry(baseData || cached?.data || null, fetched, !!freshEdit)
        const oid0 = Number(d0[idFieldName] ?? d0.OBJECTID ?? selection.oid)
        if (!Number.isFinite(oid0) || oid0 !== selection.oid) {
          setForcedActive(null)
          setDetailAccessState('idle')
          return
        }
        if (currentUserIsIa && !isPracticeAssignedToCurrentIa(d0, currentUser)) {
          setForcedActive(null)
          setDetailAccessState('denied')
          return
        }
        setDetailAccessState('allowed')
        writeSelectedFeatureCache(selection.layerUrl, selection.oid, idFieldName, d0, 'detail')
        const st: SelState = { ds: dsTry, oid: selection.oid, idFieldName, data: d0, sig: stateKey }
        setForcedActive({ key: selection.layerUrl, state: st, ownerUserKey: currentUserKey })
      } catch {
        if (req === forcedReqRef.current) {
          setForcedActive(null)
          setDetailAccessState(currentUserIsIa ? 'error' : 'idle')
        }
      }
    })()
  }, [selection?.layerUrl, selection?.oid, selection?.idFieldName, selection?.viewName, queryFields.join('|'), selRefreshNonce, currentUserKey, currentUserReady, currentUserIsIa])

  const currentSelectionSig = selection?.layerUrl && selection.oid != null
    ? `${selection.layerUrl}:${selection.oid}:${selRefreshNonce}`
    : ''

  const activeGate =
    currentUserReady &&
    detailAccessState === 'allowed' &&
    forcedActive?.ownerUserKey === currentUserKey &&
    forcedActive?.state?.sig === currentSelectionSig
      ? forcedActive
      : null

  const detailAccessMessage = detailAccessState === 'denied'
    ? 'Accesso alla pratica non consentito.'
    : (detailAccessState === 'checking'
        ? 'Verifica accesso alla pratica…'
        : (detailAccessState === 'error' ? 'Impossibile verificare l’accesso alla pratica.' : ''))

  const detailMapCfg = React.useMemo(() => ({
    basemap: String(cfg.mapBasemap || 'topo-vector'),
    centerLon: Number(cfg.mapCenterLon) || 9.0,
    centerLat: Number(cfg.mapCenterLat) || 39.5,
    initZoom: Number(cfg.mapInitZoom) || 8,
    pointZoom: Number(cfg.mapPointZoom) || 19,
    markerColor: String(cfg.mapMarkerColor || '#dc2626'),
    markerSize: Number(cfg.mapMarkerSize) || 18,
    markerOutlineColor: String(cfg.mapMarkerOutlineColor || '#ffffff'),
    markerOutlineWidth: Number(cfg.mapMarkerOutlineWidth) || 2.5,
    showZoom: cfg.mapShowZoom !== false,
    showAttribution: cfg.mapShowAttribution !== false,
    showScaleBar: cfg.mapShowScaleBar === true,
    showCompass: cfg.mapShowCompass === true,
    showPopup: cfg.mapShowPopup !== false,
    showHome: cfg.mapShowHome !== false,
    showFullscreen: cfg.mapShowFullscreen !== false,
    showLayerList: cfg.mapShowLayerList === true,
    webMapItemId: String((cfg as any).mapWebMapItemId || ''),
    webMapLabel: String((cfg as any).mapWebMapLabel || ''),
    mapLayerTitle: String((cfg as any).mapLayerTitle || ''),
    mapLayerUrl: String((cfg as any).mapLayerUrl || ''),
    mapLayerId: String((cfg as any).mapLayerId || ''),
    mapLayerLayerId: String((cfg as any).mapLayerLayerId || '')
  }), [
    cfg.mapBasemap, cfg.mapCenterLon, cfg.mapCenterLat, cfg.mapInitZoom, cfg.mapPointZoom,
    cfg.mapMarkerColor, cfg.mapMarkerSize, cfg.mapMarkerOutlineColor, cfg.mapMarkerOutlineWidth,
    cfg.mapShowZoom, cfg.mapShowAttribution, cfg.mapShowScaleBar, cfg.mapShowCompass, cfg.mapShowPopup,
    cfg.mapShowHome, cfg.mapShowFullscreen, cfg.mapShowLayerList,
    (cfg as any).mapWebMapItemId, (cfg as any).mapWebMapLabel, (cfg as any).mapLayerTitle,
    (cfg as any).mapLayerUrl, (cfg as any).mapLayerId, (cfg as any).mapLayerLayerId
  ])

  React.useEffect(() => {
    try {
      ;(window as any).__giiDetailMapConfig = detailMapCfg
      window.dispatchEvent(new CustomEvent('gii:detail-map-config-change', { detail: { config: detailMapCfg } }))
    } catch {}
    return () => {
      try {
        if ((window as any).__giiDetailMapConfig === detailMapCfg) {
          ;(window as any).__giiDetailMapConfig = null
          window.dispatchEvent(new CustomEvent('gii:detail-map-config-change', { detail: { config: null } }))
        }
      } catch {}
    }
  }, [detailMapCfg])


  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box', padding: Number.isFinite(Number((cfg as any).maskOuterOffset ?? 0)) ? Number((cfg as any).maskOuterOffset) : 0 }}>
      <>
				<DetailTabsPanel
                  active={activeGate}
                  ui={ui}
                  tabFields={tabFields}
				  tabs={detailTabs}
                  notaSpeseCfg={{
                    detailUrl: String((cfg as any).nsNotaSpeseDettaglioUrl || ''),
                    attrezzatureParametriUrl: String((cfg as any).attrezzatureParametriUrl || '')
                  }}
                  regolamentoCfg={{
                    articoliUrl: String((cfg as any).regolamentoArticoliUrl || '')
                  }}
                  emptyMessage={detailAccessMessage}
                  mapCfg={detailMapCfg}
                />
        </>
    </div>
  )
}

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, DataSourceManager } from 'jimu-core'
import { Button } from 'jimu-ui'
import { createPortal } from 'react-dom'
import type { IMConfig, TabConfig } from '../config'
import { defaultConfig, DETAIL_DEFAULT_TAB_FIELDS, DETAIL_NEVER_SHOW_FIELDS, DETAIL_GENERAL_FIELDS } from '../config'




type MsgKind = 'info' | 'ok' | 'err'
type Msg = { kind: MsgKind; text: string }

const GII_LOG_EVENTI_CICLI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'

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

function makeRuntimeRecord (attrs: any, idFieldName: string, sourceKey: string): any {
  const id = String(attrs?.[idFieldName] ?? attrs?.OBJECTID ?? attrs?.objectid ?? '')
  return {
    getData: () => attrs,
    getId: () => id,
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
    const needsQuery = wantsAll || outFields.some(f => f !== '*' && !Object.prototype.hasOwnProperty.call(base, f))
    if (!needsQuery) return

    try {
      const q: any = {
        where: `${idFieldName}=${Number(oid)}`,
        outFields,
        returnGeometry: false,
        pageSize: 1
      }
      const res: any = await (ds?.query ? ds.query(q) : null)

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
      gridTemplateColumns: '200px 1fr', 
      gap: 12, 
      alignItems: multiline ? 'start' : 'baseline' 
    }}>
      <div style={{ fontSize: props.labelSize, color: '#6b7280', textAlign: 'left', paddingTop: multiline ? 4 : 0 }}>
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
            padding: '8px 10px',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.02)'
          }}>
            {text}
          </div>
          )
        : (
          <div style={{ fontSize: props.valueSize, fontWeight: 600, wordBreak: 'break-word' }}>
            {text}
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
  allegati: string[]
  iterExtra: string[]
}

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

function formatSurfaceSafe (raw: any): string {
  if (raw == null || raw === '') return '—'
  const txt = String(raw).trim()
  const normalized = txt.replace(/\./g, '').replace(',', '.')
  const num = typeof raw === 'number' ? raw : Number(normalized)
  if (Number.isFinite(num)) {
    const formatted = new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(num)
    return `${formatted} m²`
  }
  return `${txt} m²`
}

function formatFieldValue (raw: any, fieldName: string, fieldType?: string, fieldLabel?: string): any {
  if (raw == null || raw === '') return '—'
  if (fieldLooksLikeDate(fieldName, fieldLabel || '', fieldType, raw)) return formatDateSafe(raw)
  if (fieldLooksLikeSurface(fieldName, fieldLabel || '')) return formatSurfaceSafe(raw)
  return raw
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
  if (kind === 'ALLEGATI') return ordered(DETAIL_DEFAULT_TAB_FIELDS.allegati)
  if (kind === 'ITER') return ordered(DETAIL_DEFAULT_TAB_FIELDS.iterExtra)
  return []
}

// Migra dai vecchi tabFields alle nuove tab
function migrateTabs(tabFields: TabFields, tabs: TabConfig[] | undefined): TabConfig[] {
  let result: TabConfig[] = []
  
  // Se ha già tabs, usa quelle
  if (Array.isArray(tabs) && tabs.length > 0) {
    // Normalizza fields di ogni tab a plain JS array
    result = tabs.map((t: any) => {
      let f: string[] = []
      if (t.fields) {
        if (Array.isArray(t.fields)) f = t.fields.map(String).filter(Boolean)
        else if (typeof t.fields.toArray === 'function') f = t.fields.toArray().map(String).filter(Boolean)
        else if (typeof t.fields.toJS === 'function') f = t.fields.toJS().map(String).filter(Boolean)
        else if (typeof t.fields[Symbol.iterator] === 'function') f = Array.from(t.fields as any).map(String).filter(Boolean)
      }
      return { ...t, fields: f }
    })
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
  
  // Inietta tab Mappa se mancante (migrazione config esistenti)
  if (!result.some(t => t.id === 'mappa')) {
    result.push({ id: 'mappa', label: 'Mappa', fields: [], locked: true })
  }

  // Normalizza hideEmpty per tab (retrocompatibilità)
  return result.map(tab => {
    const normalizedHideEmpty =
      (tab as any).hideEmpty != null
        ? Boolean((tab as any).hideEmpty)
: (tab.id === 'violazione' || tab.id === 'anagrafica' || tab.id === 'allegati')

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
  rows: Array<{ label: string; value: any; fieldName?: string; multiline?: boolean }>
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
      {props.title ? (
        <div style={{ fontWeight: 800, fontSize: titleFontSize, marginBottom: 10 }}>
          {props.title}
        </div>
      ) : null}

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
                multiline={!!(r as any).multiline}
              />
            ))}
          </div>
          )}
    </div>
  )
}



function normalizeLayerUrlForMatch (raw: any): string {
  return String(raw || '').trim().replace(/\/+$/, '').toLowerCase()
}

function findRapportiLayer (view: any, layerUrl?: string): any | null {
  try {
    const targetUrl = normalizeLayerUrlForMatch(layerUrl)
    const allLayers = view?.map?.allLayers?.toArray?.() || view?.map?.allLayers || []
    if (targetUrl) {
      for (const fl of allLayers) {
        if (fl?.type !== 'feature') continue
        if (normalizeLayerUrlForMatch(fl?.url) === targetUrl) return fl
      }
    }
    for (const fl of allLayers) {
      if (fl?.type !== 'feature') continue
      const title = String(fl.title || '').toLowerCase()
      if (title.includes('rapporto') && title.includes('infrazioni')) return fl
    }
  } catch {}
  return null
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
  }
  selectionSig?: string
}) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const viewRef = React.useRef<any>(null)
  const markerRef = React.useRef<any>(null)
  const targetLayerViewRef = React.useRef<any>(null)
  const defaultViewpointRef = React.useRef<any>(null)
  const fullscreenWidgetRef = React.useRef<any>(null)
  const [status, setStatus] = React.useState<'loading' | 'ok' | 'nogeom' | 'error'>('loading')
  const [viewReadyTick, setViewReadyTick] = React.useState(0)
  const [mapInstanceKey, setMapInstanceKey] = React.useState(0)
  const mc = props.mapCfg

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
                  if (props.hasSel && props.oid != null && targetLayerViewRef.current) {
                    targetLayerViewRef.current.featureEffect = { filter: { where: `OBJECTID = ${Number(props.oid)}` }, excludedEffect: 'opacity(0)' }
                  }
                } catch {}
              }, 40)
              window.setTimeout(() => {
                try { recreateFullscreenWidget() } catch {}
                try {
                  if (props.hasSel && props.oid != null && targetLayerViewRef.current) {
                    targetLayerViewRef.current.featureEffect = { filter: { where: `OBJECTID = ${Number(props.oid)}` }, excludedEffect: 'opacity(0)' }
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
        if (targetLayerViewRef.current) {
          targetLayerViewRef.current.featureEffect = { filter: { where: '1=1' }, excludedEffect: '' }
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
      if (viewRef.current) { try { viewRef.current.destroy() } catch {} viewRef.current = null }
      targetLayerViewRef.current = null
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
      try {
        if (targetLayerViewRef.current) {
          targetLayerViewRef.current.featureEffect = hideAll
            ? { filter: { where: '1=0' }, excludedEffect: 'opacity(0)' }
            : { filter: { where: '1=1' }, excludedEffect: '' }
        }
      } catch {}
      if (!hideAll) targetLayerViewRef.current = null
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

        const oidWhere = `OBJECTID = ${Number(props.oid)}`
        const rapportiLayer = findRapportiLayer(view, props.layerUrl)
        let feature: any = null

        if (rapportiLayer) {
          try {
            const lv = await view.whenLayerView(rapportiLayer)
            if (cancelled) return
            targetLayerViewRef.current = lv
            try { lv.featureEffect = { filter: { where: '1=0' }, excludedEffect: 'opacity(0)' } } catch {}

            const q = rapportiLayer.createQuery ? rapportiLayer.createQuery() : {}
            q.where = oidWhere
            q.outFields = ['*']
            q.returnGeometry = true
            const res = await rapportiLayer.queryFeatures(q)
            feature = res?.features?.[0] || null
          } catch {}
        }

        if (!feature) {
          const fl = new FeatureLayer({ url: props.layerUrl })
          if (typeof fl?.load === 'function') await fl.load()
          const q = fl.createQuery ? fl.createQuery() : {}
          q.where = oidWhere
          q.outFields = ['*']
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
          if (targetLayerViewRef.current) {
            targetLayerViewRef.current.featureEffect = { filter: { where: oidWhere }, excludedEffect: 'opacity(0)' }
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
  }, [props.hasSel, props.oid, props.layerUrl, props.selectionSig, viewReadyTick, mc.pointZoom, mc.markerColor, mc.markerSize, mc.markerOutlineColor, mc.markerOutlineWidth, mc.showPopup])

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
  CREAZIONE: 'Creazione rapporto',
  ISTRUTTORIA_TRASMESSA: 'Istruttoria trasmessa',
  INTEGRAZIONE_TRASMESSA: 'Integrazione trasmessa',
  INTEGRAZIONE: 'Richiesta integrazione',
  RAPPORTO_APPROVATO: 'Rapporto approvato',
  SANZIONE_APPROVATA: 'Sanzione approvata',
  PRESA_IN_CARICO: 'Presa in carico',
  ASSEGNAZIONE_TI: 'Assegnazione TI',
  ASSEGNAZIONE_TI_AMM: 'Assegnazione TI AMM',
  RESPINTA: 'Respinta',
  ELIMINAZIONE: 'Eliminazione'
}

function formatEvento (code: string): string {
  if (!code) return '—'
  return EVENTO_LABELS[code] || code.replace(/_/g, ' ')
}

function CicliTimeline (props: { globalId: string; hasSel: boolean }): any {
  const [cicli, setCicli] = React.useState<CicloRecord[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
        const res = await fl.queryFeatures({
          where: `LOWER(parent_globalid) = '${gid}' OR LOWER(parent_globalid) = '{${gid}}'`,
          outFields: [
            'numero_ciclo_ruolo', 'ruolo_competente', 'utente_operatore',
            'stato_record', 'evento_apertura', 'dt_apertura',
            'evento_chiusura', 'dt_chiusura', 'ruolo_destinatario',
            'utente_destinatario', 'note_chiusura', 'area', 'settore', 'fase',
            'num_campi_modificati', 'campi_modificati', 'riepilogo_ciclo'
          ],
          orderByFields: ['dt_apertura ASC'],
          returnGeometry: false
        })
        if (cancelled) return
        const records: CicloRecord[] = (res?.features || []).map((f: any) => {
          const a = f.attributes || f
          return {
            numero_ciclo_ruolo: a.numero_ciclo_ruolo ?? null,
            ruolo_competente: String(a.ruolo_competente || ''),
            utente_operatore: String(a.utente_operatore || ''),
            stato_record: String(a.stato_record || ''),
            evento_apertura: String(a.evento_apertura || ''),
            dt_apertura: a.dt_apertura ?? null,
            evento_chiusura: String(a.evento_chiusura || ''),
            dt_chiusura: a.dt_chiusura ?? null,
            ruolo_destinatario: String(a.ruolo_destinatario || ''),
            utente_destinatario: String(a.utente_destinatario || ''),
            note_chiusura: String(a.note_chiusura || ''),
            area: String(a.area || ''),
            settore: String(a.settore || ''),
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
  }, [props.hasSel, props.globalId])

  if (!props.hasSel) return <div style={{ opacity: 0.6, fontSize: 12, padding: 12 }}>Selezionare un rapporto.</div>
  if (loading) return <div style={{ opacity: 0.6, fontSize: 12, padding: 12 }}>Caricamento cronologia…</div>
  if (error) return <div style={{ color: '#b42318', fontSize: 12, padding: 12 }}>{error}</div>
  if (cicli.length === 0) return <div style={{ opacity: 0.6, fontSize: 12, padding: 12 }}>Nessun evento registrato per questo rapporto.</div>

  const rowSt: React.CSSProperties = { display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.6, padding: '2px 0' }
  const lblSt: React.CSSProperties = { color: '#6b7280', minWidth: 110, flexShrink: 0, fontWeight: 500 }
  const valSt: React.CSSProperties = { color: '#1f2937', wordBreak: 'break-word' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
      {cicli.map((c, i) => {
        const isOpen = c.stato_record === 'APERTO'
        const borderColor = isOpen ? '#2563eb' : '#d1d5db'
        const bgColor = isOpen ? 'rgba(37,99,235,0.04)' : '#fafafa'
        const headerBg = isOpen ? '#eaf2ff' : '#f3f4f6'
        const statusLabel = isOpen ? 'In corso' : 'Chiuso'
        const statusColor = isOpen ? '#2563eb' : '#6b7280'
        const ruoloLabel = c.ruolo_competente + (c.utente_operatore ? ` — ${c.utente_operatore}` : '')

        const campiList = c.campi_modificati ? c.campi_modificati.split(',').map(s => s.trim()).filter(Boolean) : []

        return (
          <div key={i} style={{ border: `1px solid ${borderColor}`, borderRadius: 10, background: bgColor, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937' }}>
                Ciclo {i + 1} — {c.ruolo_competente || '?'}
                {c.area ? <span style={{ color: '#6b7280', fontWeight: 400 }}> ({c.area}{c.settore ? `/${c.settore}` : ''})</span> : null}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: isOpen ? 'rgba(37,99,235,0.10)' : 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                {statusLabel}
              </span>
            </div>

            {/* Body */}
            <div style={{ padding: '8px 12px' }}>
              {c.utente_operatore && (
                <div style={rowSt}><span style={lblSt}>Operatore</span><span style={valSt}>{c.utente_operatore}</span></div>
              )}

              <div style={rowSt}><span style={lblSt}>Apertura</span><span style={valSt}>{formatEvento(c.evento_apertura)} — {formatDateSafe(c.dt_apertura)}</span></div>

              {c.stato_record === 'CHIUSO' && (
                <div style={rowSt}><span style={lblSt}>Chiusura</span><span style={valSt}>{formatEvento(c.evento_chiusura)} — {formatDateSafe(c.dt_chiusura)}</span></div>
              )}

              {c.ruolo_destinatario && (
                <div style={rowSt}><span style={lblSt}>Destinatario</span><span style={valSt}>{c.ruolo_destinatario}{c.utente_destinatario ? ` — ${c.utente_destinatario}` : ''}</span></div>
              )}

              {c.note_chiusura && (
                <div style={rowSt}><span style={lblSt}>Note</span><span style={valSt}>{c.note_chiusura}</span></div>
              )}

              {c.num_campi_modificati != null && c.num_campi_modificati > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ ...rowSt, alignItems: 'flex-start' }}>
                    <span style={lblSt}>Campi modificati</span>
                    <span style={{ ...valSt, fontSize: 11 }}>
                      {c.num_campi_modificati} {c.num_campi_modificati === 1 ? 'campo' : 'campi'}
                    </span>
                  </div>
                  {campiList.length > 0 && (
                    <div style={{ marginLeft: 118, display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                      {campiList.map((campo, ci) => (
                        <span key={ci} style={{ fontSize: 10, background: 'rgba(0,0,0,0.06)', color: '#374151', padding: '1px 6px', borderRadius: 4 }}>
                          {campo}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {c.riepilogo_ciclo && (
                <div style={{ ...rowSt, marginTop: 4, alignItems: 'flex-start' }}>
                  <span style={lblSt}>Riepilogo</span>
                  <span style={{ ...valSt, fontSize: 11, whiteSpace: 'pre-wrap' }}>{c.riepilogo_ciclo}</span>
                </div>
              )}
            </div>
          </div>
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
  editConfig: any
  mapCfg: any
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
    const tipoRaw = (data && (data as any).__tipo_soggetto_raw != null) ? (data as any).__tipo_soggetto_raw : ((data && (data as any).tipo_soggetto != null) ? (data as any).tipo_soggetto : null)
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
      if (hideEmpty && isEmptyValue(vv)) continue
      const label = toLabel(resolved || f)
      const fieldType = fieldTypeMap?.[resolved || f] || ''
      rows.push({ label, value: formatFieldValue(vv, resolved || f, fieldType, label), multiline: isLongTextFieldName(resolved || f) })
    }
    return rows
  }, [data, toLabel, classifyTipoSoggetto, isPfOnlyField, isPgOnlyField, aliasMap, fieldTypeMap])
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



  const getRawField = React.useCallback((fieldName: string): any => {
    const resolved = resolveFieldNameLoose(data, aliasMap, fieldName)
    return data ? (data as any)[resolved] : null
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

  const renderDash = (txt = '—') => <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.55)' }}>{txt}</div>

  const SURVEY_CHOICE_LABELS: Record<string, Record<string, string>> = {
    norma1: {
      'Art15.1': 'Art. 15.1 - Prelievo abusivo d’acqua parziale (superamento estensione terreni irrigati rispetto a quelli comunicati)',
      'Art15.2': 'Art. 15.2 - Recidiva prelievo abusivo d’acqua parziale',
      'Art15.3': 'Art. 15.3 - Prelievo abusivo d’acqua totale (mancata comunicazione)',
      'Art15.4': 'Art. 15.4 - Recidiva prelievo abusivo d’acqua totale'
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
      'Art16': 'Art. 16 - Comunicazione di irrigazione tardiva',
      'Art17': 'Art. 17 - Comunicazione di variazione o di rinuncia tardiva'
    },
    art17_tipo: {
      'Art17.1': 'Variazione tardiva',
      'Art17.2': 'Rinuncia tardiva'
    },
    norma3: {
      'Art8': 'Art. 8 - Violazione servizio reperibilità',
      'Art12': 'Art. 12 - Negato accesso ai fondi (al personale consortile)',
      'Art27': 'Art. 27 - Spreco d’acqua/uso negligente risorsa idrica',
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
      'Art39': 'Art. 39 - Danni strutture irrigue'
    }
  }

  const getSurveyChoiceLabel = React.useCallback((listName: string, code: any): string => {
    const key = String(code ?? '').trim()
    if (!key) return '—'
    return SURVEY_CHOICE_LABELS[listName]?.[key] || String(code)
  }, [])

  const renderSurveyGroup = React.useCallback((title: string, rows: Array<{ label: string; value: any; multiline?: boolean }>, emptyText = '—') => {
    return (
      <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 10, background: '#fff' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(0,0,0,0.78)', marginBottom: 8 }}>{title}</div>
        {rows.length
          ? <div style={{ display: 'grid', gap: 8 }}>{rows.map((r, i) => <DetailRow key={i} label={r.label} value={r.value} labelSize={12} valueSize={13} multiline={!!r.multiline} />)}</div>
          : renderDash(emptyText)}
      </div>
    )
  }, [])

  const renderViolationTextLine = React.useCallback((label: string, value: any) => {
    const txt = value == null || value === '' ? '—' : value
    return (
      <div style={{ fontSize: 13, lineHeight: 1.45, color: '#111827' }}>
        <span style={{ color: '#6b7280', fontWeight: 400 }}>{label}: </span>
        <span style={{ fontWeight: 600 }}>{txt}</span>
      </div>
    )
  }, [])

  const renderViolationSurfacesLine = React.useCallback((leftLabel: string, leftValue: any, rightLabel: string, rightValue: any) => {
    const leftTxt = leftValue == null || leftValue === '' ? '—' : leftValue
    const rightTxt = rightValue == null || rightValue === '' ? '—' : rightValue
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, rowGap: 6, fontSize: 13, lineHeight: 1.45, color: '#111827' }}>
        <div>
          <span style={{ color: '#6b7280', fontWeight: 400 }}>{leftLabel}: </span>
          <span style={{ fontWeight: 600 }}>{leftTxt}</span>
        </div>
        <div>
          <span style={{ color: '#6b7280', fontWeight: 400 }}>{rightLabel}: </span>
          <span style={{ fontWeight: 600 }}>{rightTxt}</span>
        </div>
      </div>
    )
  }, [])

  const renderViolationGroup = React.useCallback((title: string, body: React.ReactNode) => {
    return (
      <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 12, background: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,0.78)', marginBottom: 8 }}>{title}</div>
        {body}
      </div>
    )
  }, [])

  const violationSurveyContent = React.useMemo(() => {
    const art15ParzRaw = getRawField('norma15_parziale')
    const art15TotRaw = getRawField('norma15_totale')
    const art15Code = !isEmptyValue(art15ParzRaw) ? art15ParzRaw : art15TotRaw
    const hasArt15 = !isEmptyValue(art15Code) || !isEmptyValue(getRawField('sup_dichiarata_art15')) || !isEmptyValue(getRawField('sup_irrigata_art15'))

    const art15Body = hasArt15
      ? (() => {
          const isParziale = !isEmptyValue(art15ParzRaw)
          const tipoAbuso = isParziale ? 'Parziale' : 'Totale'
          const tipoViolazione = isParziale
            ? getSurveyChoiceLabel('art15_parziale', art15ParzRaw)
            : getSurveyChoiceLabel('art15_totale', art15TotRaw)
          const supDich = formatFieldValue(getRawField('sup_dichiarata_art15'), 'sup_dichiarata_art15', fieldTypeMap?.sup_dichiarata_art15, 'Superficie dichiarata')
          const supIrr = formatFieldValue(getRawField('sup_irrigata_art15'), 'sup_irrigata_art15', fieldTypeMap?.sup_irrigata_art15, 'Superficie irrigata')
          return (
            <div style={{ display: 'grid', gap: 8 }}>
              {renderViolationTextLine('Tipo di abuso', tipoAbuso)}
              {renderViolationTextLine('Occorrenza', tipoViolazione)}
              {renderViolationSurfacesLine('Superficie dichiarata', supDich, 'Superficie irrigata', supIrr)}
            </div>
          )
        })()
      : renderDash('—')

    const art16_17Raw = getRawField('norma16_17')
    const art17TipoRaw = getRawField('art17_tipo')
    const has16or17 = !isEmptyValue(art16_17Raw) || !isEmptyValue(art17TipoRaw) || !isEmptyValue(getRawField('sup_dichiarata_art16')) || !isEmptyValue(getRawField('sup_dichiarata_art17_1')) || !isEmptyValue(getRawField('sup_dichiarata_art17_2')) || !isEmptyValue(getRawField('sup_irrigata_art16_17_2')) || !isEmptyValue(getRawField('sup_irrigata_art17_1'))
    const art1617Body = has16or17
      ? (() => {
          if (String(art16_17Raw || '') === 'Art16') {
            const descrFull = getSurveyChoiceLabel('art16_17', art16_17Raw)
            const descr = String(descrFull).replace(/^Art\.?\s*16\s*-\s*/i, '')
            return (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 13, lineHeight: 1.45, color: '#111827' }}>{descr}</div>
                {renderViolationSurfacesLine(
                  'Superficie dichiarata',
                  formatFieldValue(getRawField('sup_dichiarata_art16'), 'sup_dichiarata_art16', fieldTypeMap?.sup_dichiarata_art16, 'Superficie dichiarata'),
                  'Superficie irrigata',
                  formatFieldValue(getRawField('sup_irrigata_art16_17_2'), 'sup_irrigata_art16_17_2', fieldTypeMap?.sup_irrigata_art16_17_2, 'Superficie irrigata')
                )}
              </div>
            )
          }

          if (String(art16_17Raw || '') === 'Art17' || !isEmptyValue(art17TipoRaw)) {
            const tipoViolazione = getSurveyChoiceLabel('art17_tipo', art17TipoRaw)
            const isVar = String(art17TipoRaw || '') === 'Art17.1'
            return (
              <div style={{ display: 'grid', gap: 8 }}>
                {renderViolationTextLine('Tipologia', tipoViolazione)}
                {isVar
                  ? renderViolationSurfacesLine(
                    'Superficie dichiarata',
                    formatFieldValue(getRawField('sup_dichiarata_art17_1'), 'sup_dichiarata_art17_1', fieldTypeMap?.sup_dichiarata_art17_1, 'Superficie dichiarata'),
                    'Superficie variata',
                    formatFieldValue(getRawField('sup_irrigata_art17_1'), 'sup_irrigata_art17_1', fieldTypeMap?.sup_irrigata_art17_1, 'Superficie variata')
                    )
                  : renderViolationSurfacesLine(
                    'Superficie dichiarata',
                    formatFieldValue(getRawField('sup_dichiarata_art17_2'), 'sup_dichiarata_art17_2', fieldTypeMap?.sup_dichiarata_art17_2, 'Superficie dichiarata'),
                    'Superficie irrigata',
                    formatFieldValue(getRawField('sup_irrigata_art16_17_2'), 'sup_irrigata_art16_17_2', fieldTypeMap?.sup_irrigata_art16_17_2, 'Superficie irrigata')
                    )}
              </div>
            )
          }

          return renderDash('—')
        })()
      : renderDash('—')

    const altreCodes = splitMultiValues(getRawField('norma_violata3'))
    const altreBody = altreCodes.length
      ? (
        <div style={{ display: 'grid', gap: 6 }}>
          {altreCodes.map((code, idx) => {
            const descrFull = getSurveyChoiceLabel('norma3', code)
            return <div key={idx} style={{ fontSize: 13, lineHeight: 1.45, color: '#111827' }}>{descrFull}</div>
          })}
        </div>
        )
      : renderDash('—')

    const descrFatti = formatFieldValue(getRawField('descrizione_fatti'), 'descrizione_fatti', fieldTypeMap?.descrizione_fatti, 'Descrizione dettagliata dell’infrazione')
    const circ = formatFieldValue(getRawField('circostanze'), 'circostanze', fieldTypeMap?.circostanze, 'Circostanze rilevanti dell’infrazione')
    const presenzaTrasgressore = formatFieldValue(getRawField('presenza_trasgressore'), 'presenza_trasgressore', fieldTypeMap?.presenza_trasgressore, 'Il trasgressore era presente?')
    const noteBody = (
      <div style={{ display: 'grid', gap: 10 }}>
        {!isEmptyValue(getRawField('presenza_trasgressore')) && (
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'left', marginBottom: 4, fontWeight: 400 }}>Presenza del trasgressore</div>
            <div style={{
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '8px 10px',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.02)',
              minHeight: 44
            }}>{presenzaTrasgressore == null || presenzaTrasgressore === '' ? '—' : presenzaTrasgressore}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'left', marginBottom: 4, fontWeight: 400 }}>Descrizione dettagliata della violazione</div>
          <div style={{
            fontSize: 13,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            padding: '8px 10px',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.02)',
            minHeight: 44
          }}>{descrFatti == null || descrFatti === '' ? '—' : descrFatti}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'left', marginBottom: 4, fontWeight: 400 }}>Circostanze rilevanti dell’infrazione</div>
          <div style={{
            fontSize: 13,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            padding: '8px 10px',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.02)',
            minHeight: 44
          }}>{circ == null || circ === '' ? '—' : circ}</div>
        </div>
      </div>
    )

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {renderViolationGroup('Art. 15 - Prelievo abusivo', art15Body)}
        {renderViolationGroup('Artt. 16 e 17 - Inosservanza termini presentazione comunicazioni', art1617Body)}
        {renderViolationGroup('Altre violazioni', altreBody)}
        {renderViolationGroup('Note', noteBody)}
      </div>
    )
  }, [getRawField, splitMultiValues, fieldTypeMap, getSurveyChoiceLabel, renderViolationGroup, renderViolationSurfacesLine, renderViolationTextLine])

  const generalRows = React.useMemo(() => {
    return makeRows(DETAIL_GENERAL_FIELDS, 'generali', false)
  }, [makeRows])

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

const isMapTab = tab === 'mappa'
const activeContentStyle: React.CSSProperties = isMapTab
  ? { flex: '1 1 auto', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
  : contentStyle

let content: React.ReactNode = null

if (!hasSel) {
  content = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, fontWeight: 700, fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>
      Selezionare un rapporto nell’elenco
    </div>
  )
} else {
  const activeTab = tabs.find(t => t.id === tab)
  
  if (activeTab?.isIterTab) {
    const gid = data?.GlobalID ?? data?.globalid ?? data?.globalId ?? data?.GLOBALID ?? ''
    content = <CicliTimeline globalId={String(gid)} hasSel={hasSel} />
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
      const layerUrl = layer && layer.url ? String(layer.url) : ''

      const getOpenUrl = (att: any): string | null => {
        if (att && att.url) return String(att.url)
        if (layerUrl && selectedOid != null && att && att.id != null) return `${layerUrl}/${selectedOid}/attachments/${att.id}`
        return null
      }

      content = (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Allegati</div>
          </div>

          {!hasSel && (
            <div style={{ opacity: 0.75, fontSize: 12 }}>Selezionare un rapporto per vedere gli allegati.</div>
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
                title=""
                rows={rows}
                emptyText={hasSel ? 'Nessun campo configurato per questa tab.' : 'Selezionare un rapporto.'}
              />
            </div>
          )}
        </div>
      )
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
              Selezionare un rapporto per visualizzare la mappa.
            </div>
          ) : (
            <MapTabContent oid={selectedOid} layerUrl={mapLayerUrl} hasSel={hasSel} mapCfg={props.mapCfg} selectionSig={active?.state?.sig}/>
          )}
        </div>
      )
    } else {
      content = activeTab.id === 'violazione'
        ? (
          <div style={{ marginTop: 8 }}>
            {violationSurveyContent}
          </div>
          )
        : (
          <ReadOnlyPanel
            title=""
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
        color: hasSel && praticaCode
          ? (ui.detailTitleColor ?? 'rgba(0,0,0,0.85)')
          : 'rgba(0,0,0,0.40)'
      }}>
        {String(ui.detailTitlePrefix ?? 'Dettaglio rapporto n.')} {hasSel && praticaCode ? praticaCode : '–'}
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
          Selezionare un rapporto nell'elenco
        </div>
      ) : (
        <>
          <div style={{ padding: `${Math.max(8, Number(ui.panelPadding ?? 12) - 2)}px ${ui.panelPadding ?? 12}px 0` }}>
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.72)', marginBottom: 8 }}>Dati generali</div>
              <ReadOnlyPanel
                title=""
                rows={generalRows}
                emptyText="Dati generali non disponibili."
              />
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${ui.dividerColor ?? 'rgba(0,0,0,0.08)'}`, marginTop: 10 }} />
          <div style={tabsStyle}>{TabsBar}</div>
          <div style={{ borderTop: `1px solid ${ui.dividerColor ?? 'rgba(0,0,0,0.08)'}` }} />
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

  // --- Editing TI config
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


  // Datasource risolta dinamicamente dal widget Elenco: una sola vista effettiva per sessione.
  // Nessun DataSourceComponent / multi-view dichiarata qui.
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

    'presa_in_carico_RZ', 'dt_presa_in_carico_RZ',
    'stato_RZ', 'dt_stato_RZ',
    'esito_RZ', 'dt_esito_RZ',
    'note_RZ',

    'presa_in_carico_RI', 'dt_presa_in_carico_RI',
    'stato_RI', 'dt_stato_RI',
    'esito_RI', 'dt_esito_RI',
    'note_RI',

    'presa_in_carico_DT', 'dt_presa_in_carico_DT',
    'stato_DT', 'dt_stato_DT',
    'esito_DT', 'dt_esito_DT',
    'note_DT',

    'presa_in_carico_DA', 'dt_presa_in_carico_DA',
    'stato_DA', 'dt_stato_DA',
    'esito_DA', 'dt_esito_DA',
    'note_DA'
  ]

const queryFields = React.useMemo(() => {
  const s = new Set<string>()
  let needsAll = false

  const tabsJs: any[] =
    (migratedTabs as any)?.asMutable
      ? (migratedTabs as any).asMutable({ deep: true })
      : (Array.isArray(migratedTabs) ? migratedTabs as any[] : [])

  for (const t of tabsJs) {
    if (!t || t.id === 'azioni') continue
    const fl = normalizeFieldList(t.fields)
    if (!fl.length && t.id !== 'iter') needsAll = true
    for (const f of fl) s.add(String(f))
  }

  for (const f of watchFields) s.add(String(f))
  for (const f of DETAIL_GENERAL_FIELDS) s.add(String(f))

  const arr = Array.from(s).filter(Boolean)
  return needsAll ? ['*'] : arr
}, [migratedTabs, watchFields.join('|')])

  const [selection, setSelection] = React.useState<RuntimeSelection | null>(() => readRuntimeSelection())
  React.useEffect(() => {
    const handler = () => setSelection(readRuntimeSelection())
    handler()
    window.addEventListener('gii-selection-changed', handler as any)
    return () => window.removeEventListener('gii-selection-changed', handler as any)
  }, [])

  const [selRefreshNonce, setSelRefreshNonce] = React.useState<number>(0)
  React.useEffect(() => {
    const h = (evt?: any) => {
      const cur = readRuntimeSelection()
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
        const stateKey = `${selection.layerUrl}:${selection.oid}:${selRefreshNonce}`
        const syncCachedProxy = (() => {
          try { return (window as any)?.__giiRuntimeDsProxyCache?.[selection.layerUrl] || null } catch { return null }
        })()
        const idFieldName = String(selection.idFieldName || syncCachedProxy?.getIdField?.() || 'OBJECTID')
        const cacheEntry = readSelectedFeatureCache(selection.layerUrl, selection.oid)
        const baseData = cacheEntry?.data && typeof cacheEntry.data === 'object' ? cacheEntry.data : null
        const baseOid = baseData ? Number(baseData[idFieldName] ?? baseData.OBJECTID ?? selection.oid) : NaN

        if (baseData && Number.isFinite(baseOid) && baseOid === selection.oid) {
          const quickDs = syncCachedProxy || createRuntimeDsStubFromData(selection.layerUrl, selection.viewName, idFieldName, baseData)
          const quickState: SelState = { ds: quickDs, oid: selection.oid, idFieldName, data: baseData, sig: stateKey }
          setForcedActive({ key: selection.layerUrl, state: quickState })
        }

        const dsTry = syncCachedProxy || await createRuntimeDsProxyFromLayerUrl(selection.layerUrl, selection.viewName)
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
        writeSelectedFeatureCache(selection.layerUrl, selection.oid, idFieldName, d0, 'detail')
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
				<DetailTabsPanel
                  active={activeGate}
                  ui={ui}
                  tabFields={tabFields}
				  tabs={detailTabs}
                  editConfig={editConfig}
                  mapCfg={{
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
                    webMapLabel: String((cfg as any).mapWebMapLabel || '')
                  }}
                />
        </>
    </div>
  )
}

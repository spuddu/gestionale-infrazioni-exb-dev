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
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
      columnGap: 12,
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
  bodyPadding?: number | string
}) {
  const borderColor = props.borderColor || '#c5d9f1'
  const headerBg = props.headerBg || '#eaf2ff'
  const bodyPadding = props.bodyPadding ?? 12
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#1f2937', lineHeight: 1.25 }}>{props.title}</div>
        {props.right ? <div style={{ flexShrink: 0 }}>{props.right}</div> : null}
      </div>
      <div style={{ padding: bodyPadding, overflowX: 'auto' }}>{props.children}</div>
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

    return { ...t, id, fields: f }
  }

  // Se ha già tabs, usa quelle
  if (Array.isArray(tabs) && tabs.length > 0) {
    result = tabs.map(normalizeTab)
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
  const preferredBeforeIter = ['anagrafica', 'violazione', LUOGHI_DATI_TAB_ID, 'nota_spese', 'allegati', 'mappa']
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
      if (viewRef.current) { try { viewRef.current.destroy() } catch {} viewRef.current = null }
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

function CicliTimeline (props: { globalId: string; hasSel: boolean; sortDir: 'asc' | 'desc' }): any {
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
          orderByFields: [props.sortDir === 'asc' ? 'dt_apertura ASC' : 'dt_apertura DESC'],
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
  }, [props.hasSel, props.globalId, props.sortDir])

  if (!props.hasSel) return <div style={{ opacity: 0.6, fontSize: 12, padding: 12 }}>Selezionare un rapporto.</div>
  if (loading) return <div style={{ opacity: 0.6, fontSize: 12, padding: 12 }}>Caricamento cronologia…</div>
  if (error) return <div style={{ color: '#b42318', fontSize: 12, padding: 12 }}>{error}</div>
  if (cicli.length === 0) return <div style={{ opacity: 0.6, fontSize: 12, padding: 12 }}>Nessun evento registrato per questo rapporto.</div>

  const rowSt: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(150px, 220px) minmax(0, 1fr)',
    gap: 12,
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
      {cicli.map((c, i) => {
        const isOpen = c.stato_record === 'APERTO'
        const borderColor = isOpen ? '#2563eb' : '#d1d5db'
        const bgColor = '#fff'
        const headerBg = isOpen ? '#eaf2ff' : '#f3f4f6'
        const statusLabel = isOpen ? 'In corso' : 'Chiuso'
        const statusColor = isOpen ? '#2563eb' : '#6b7280'
        const ruoloLabel = c.ruolo_competente + (c.utente_operatore ? ` — ${c.utente_operatore}` : '')
        const cycleLabelNumber = props.sortDir === 'asc' ? (i + 1) : (cicli.length - i)

        const campiList = c.campi_modificati ? c.campi_modificati.split(',').map(s => s.trim()).filter(Boolean) : []

        return (
          <div key={i} style={{ border: `1px solid ${borderColor}`, borderRadius: 10, background: bgColor, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937' }}>
                Ciclo {cycleLabelNumber} — {c.ruolo_competente || '?'}
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
                <div style={{ padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 220px) minmax(0, 1fr)', gap: 12, alignItems: 'flex-start' }}>
                    <span style={lblSt}>Campi modificati</span>
                    <span style={{ ...valSt, fontSize: 11 }}>
                      {c.num_campi_modificati} {c.num_campi_modificati === 1 ? 'campo' : 'campi'}
                    </span>
                  </div>
                  {campiList.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 220px) minmax(0, 1fr)', gap: 12, marginTop: 6 }}>
                      <span />
                      <div style={{ border: '1px solid rgba(209,213,219,0.95)', borderRadius: 8, padding: '6px 8px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                        {campiList.map((campo, ci) => (
                          <span key={ci} style={{ fontSize: 11, color: '#374151', lineHeight: 1.35 }}>
                            {campo}
                          </span>
                        ))}
                      </div>
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


type NsdCategory = 'AT' | 'PR' | 'RU' | 'SL' | 'PF'
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
}
type NsdSummary = {
  totaleAT: number
  totalePR: number
  totaleRU: number
  totaleSL: number
  totalePF: number
  percentualeSpeseGenerali: number
  importoSpeseGenerali: number
  totaleComplessivo: number
}

const NSD_CATEGORIES: readonly NsdCategory[] = ['AT', 'PR', 'RU', 'SL', 'PF'] as const
const NSD_CATEGORY_LABELS: Record<NsdCategory, string> = {
  AT: 'Attrezzature e trasporti',
  PR: 'Materiali da costruzione',
  RU: 'Risorse umane',
  SL: 'Semilavorati',
  PF: 'Prodotti finiti'
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
  'ns_ricalcolata_il'
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
  return nsdSafeNum(v, 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function nsdQty (v: any): string {
  return nsdSafeNum(v, 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
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
    percentualeSpeseGenerali: nsdSafeNum(nsdPickAttrCI(data, ['ns_spese_generali_perc']), 0),
    importoSpeseGenerali: nsdSafeNum(nsdPickAttrCI(data, ['ns_importo_spese_generali']), 0),
    totaleComplessivo: nsdSafeNum(nsdPickAttrCI(data, ['ns_totale_complessivo']), 0)
  }
}

function nsdSummaryHasValues (summary: NsdSummary): boolean {
  return [
    summary.totaleAT,
    summary.totalePR,
    summary.totaleRU,
    summary.totaleSL,
    summary.totalePF,
    summary.importoSpeseGenerali,
    summary.totaleComplessivo,
    summary.percentualeSpeseGenerali
  ].some(v => Number.isFinite(Number(v)) && Number(v) !== 0)
}

function nsdComputeSummaryFromRows (rows: NsdDetailRow[], perc: number): NsdSummary {
  const sumBy = (cat: NsdCategory) => nsdRound((rows || []).filter(r => r.categoria_costo === cat).reduce((s, r) => s + nsdSafeNum(r.importo_riga, 0), 0), 2)
  const totaleAT = sumBy('AT')
  const totalePR = sumBy('PR')
  const totaleRU = sumBy('RU')
  const totaleSL = sumBy('SL')
  const totalePF = sumBy('PF')
  const base = nsdRound(totaleAT + totalePR + totaleRU + totaleSL + totalePF, 2)
  const percentualeSpeseGenerali = nsdRound(nsdSafeNum(perc, 0), 2)
  const importoSpeseGenerali = nsdRound(base * percentualeSpeseGenerali / 100, 2)
  const totaleComplessivo = nsdRound(base + importoSpeseGenerali, 2)
  return { totaleAT, totalePR, totaleRU, totaleSL, totalePF, percentualeSpeseGenerali, importoSpeseGenerali, totaleComplessivo }
}

function nsdMergeSummary (parent: NsdSummary, computed: NsdSummary): NsdSummary {
  if (nsdSummaryHasValues(parent)) {
    return {
      totaleAT: parent.totaleAT || computed.totaleAT,
      totalePR: parent.totalePR || computed.totalePR,
      totaleRU: parent.totaleRU || computed.totaleRU,
      totaleSL: parent.totaleSL || computed.totaleSL,
      totalePF: parent.totalePF || computed.totalePF,
      percentualeSpeseGenerali: parent.percentualeSpeseGenerali || computed.percentualeSpeseGenerali,
      importoSpeseGenerali: parent.importoSpeseGenerali || computed.importoSpeseGenerali,
      totaleComplessivo: parent.totaleComplessivo || computed.totaleComplessivo
    }
  }
  return computed
}

async function nsdGetFeatureLayerByUrl (rawUrl: any): Promise<any> {
  const url = nsdEnsureLayerIndex(nsdNormalizeUrl(rawUrl))
  if (!url) throw new Error('URL tabella dettaglio nota spese non configurata.')
  if (__giiNsdLayerCache[url]) return __giiNsdLayerCache[url]
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
    'ordine', 'note'
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
  return (res?.features || []).map((f: any) => {
    const r = f?.attributes || {}
    return {
      objectid: nsdSafeNum(nsdPickAttrCI(r, ['OBJECTID', 'objectid']), 0),
      categoria_costo: (nsdNormalizeCategory(r?.categoria_costo) || 'PR') as NsdCategory,
      origine_voce_snapshot: nsdNormalizeSource(r?.origine_voce_snapshot || 'REGIONE'),
      codice_voce_snapshot: String(r?.codice_voce_snapshot || '').trim(),
      descrizione_snapshot: String(r?.descrizione_snapshot || '').trim(),
      unita_misura_snapshot: String(r?.unita_misura_snapshot || '').trim(),
      prezzo_unitario_snapshot: nsdRound(nsdSafeNum(r?.prezzo_unitario_snapshot ?? r?.costo_unitario_snapshot, 0), 4),
      quantita: nsdRound(nsdSafeNum(r?.quantita, 0), 4),
      importo_riga: nsdRound(nsdSafeNum(r?.importo_riga, 0), 2),
      anno_prezzario_snapshot: r?.anno_prezzario_snapshot != null ? Math.trunc(nsdSafeNum(r?.anno_prezzario_snapshot, 0)) : null,
      ordine: Math.trunc(nsdSafeNum(r?.ordine, 0)),
      note: String(r?.note || '').trim()
    }
  }).sort((a: NsdDetailRow, b: NsdDetailRow) => {
    const ca = NSD_CATEGORIES.indexOf(a.categoria_costo)
    const cb = NSD_CATEGORIES.indexOf(b.categoria_costo)
    if (ca !== cb) return ca - cb
    if (a.ordine !== b.ordine) return a.ordine - b.ordine
    return a.objectid - b.objectid
  })
}

function NotaSpeseDetailPanel (props: { data: any; detailUrl: string; hasSel: boolean }) {
  const parentGlobalId = String(nsdPickAttrCI(props.data, ['GlobalID', 'globalid']) || '').trim()
  const [rows, setRows] = React.useState<NsdDetailRow[]>([])
  const [loadedKey, setLoadedKey] = React.useState<string>('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setRows([])
    setLoadedKey('')
    setError(null)
  }, [parentGlobalId, props.detailUrl])

  React.useEffect(() => {
    if (!props.hasSel || !parentGlobalId || !props.detailUrl) return
    const key = `${props.detailUrl}|${parentGlobalId}`
    if (loadedKey === key) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const next = await nsdQueryRows(props.detailUrl, parentGlobalId)
        if (cancelled) return
        setRows(next)
        setLoadedKey(key)
      } catch (e: any) {
        if (cancelled) return
        setRows([])
        setLoadedKey(key)
        setError(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [props.hasSel, parentGlobalId, props.detailUrl, loadedKey])

  const parentSummary = React.useMemo(() => nsdReadParentSummary(props.data || {}), [props.data])
  const computedSummary = React.useMemo(() => nsdComputeSummaryFromRows(rows, parentSummary.percentualeSpeseGenerali), [rows, parentSummary.percentualeSpeseGenerali])
  const summary = React.useMemo(() => nsdMergeSummary(parentSummary, computedSummary), [parentSummary, computedSummary])
  const rowsByCategory = React.useMemo(() => {
    const out: Record<NsdCategory, NsdDetailRow[]> = { AT: [], PR: [], RU: [], SL: [], PF: [] }
    rows.forEach(row => { out[row.categoria_costo].push(row) })
    return out
  }, [rows])
  const lastCalc = nsdPickAttrCI(props.data, ['ns_ricalcolata_il'])

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
      <div style={{ fontSize: 12, fontWeight: strong ? 800 : 700, color: strong ? 'rgba(255,255,255,0.86)' : '#6b7280', lineHeight: 1.25 }}>{label}</div>
      <div style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 900 : 700, color: strong ? '#fff' : '#1f2937', whiteSpace: 'nowrap', textAlign: 'right' }}>€ {nsdMoney(value)}</div>
    </div>
  )

  const renderRows = (cat: NsdCategory) => {
    const catRows = rowsByCategory[cat] || []
    if (!catRows.length) return <div style={{ fontSize: 12, color: '#6b7280', padding: '8px 2px' }}>Nessuna voce.</div>
    return (
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
              {['Origine', 'Codice', 'Descrizione', 'U.M.', 'Q.tà', 'Prezzo unit.', 'Importo'].map(h => (
                <th key={h} style={{ textAlign: h === 'Descrizione' ? 'left' : 'right', padding: '6px 8px', borderBottom: '1px solid rgba(0,0,0,0.10)', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
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

  if (!props.hasSel) return <div style={{ opacity: 0.75, fontSize: 12 }}>Selezionare un rapporto per vedere la nota spese.</div>
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
      <DetailSectionCard title="Riepilogo nota spese">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 0 }}>
          {card('Attrezzature/Trasporti', summary.totaleAT)}
          {card('Materiali da costruzione', summary.totalePR)}
          {card('Risorse umane', summary.totaleRU)}
          {card('Semilavorati', summary.totaleSL)}
          {card('Prodotti finiti', summary.totalePF)}
          {card(`Spese generali (${nsdMoney(summary.percentualeSpeseGenerali)}%)`, summary.importoSpeseGenerali)}
          {card('Totale nota spese', summary.totaleComplessivo, true)}
        </div>
        {lastCalc ? <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Ultimo ricalcolo: {formatDateSafe(lastCalc)}</div> : null}
      </DetailSectionCard>

      {props.detailUrl && loading && <div style={{ opacity: 0.75, fontSize: 12 }}>Caricamento dettaglio nota spese…</div>}
      {props.detailUrl && !loading && error && <div style={{ color: '#b00020', fontSize: 12 }}>{error}</div>}
      {props.detailUrl && !loading && !error && rows.length === 0 && (
        <div style={{ opacity: 0.75, fontSize: 12 }}>Nessuna voce di nota spese collegata al rapporto.</div>
      )}
      {props.detailUrl && !loading && !error && rows.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {NSD_CATEGORIES.map(cat => {
            const total = rowsByCategory[cat].reduce((s, r) => s + nsdSafeNum(r.importo_riga, 0), 0)
            return (
              <details key={cat} open={rowsByCategory[cat].length > 0} style={{ border: '1px solid #c5d9f1', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
                <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#1f2937', padding: '8px 12px', background: '#eaf2ff', borderBottom: '1px solid #c5d9f1' }}>
                  {NSD_CATEGORY_LABELS[cat]} <span style={{ color: '#6b7280', fontWeight: 700 }}>({rowsByCategory[cat].length} voci · € {nsdMoney(total)})</span>
                </summary>
                <div style={{ padding: 10 }}>{renderRows(cat)}</div>
              </details>
            )
          })}
        </div>
      )}
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
  notaSpeseCfg: { detailUrl: string }
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
  const [iterSortDir, setIterSortDir] = React.useState<'asc' | 'desc' | null>(null)

  React.useEffect(() => {
    if (tabs.length && !tabs.some(t => t.id === tab)) setTab(tabs[0]?.id || 'anagrafica')
  }, [tabs, tab])


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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
        <DetailRow label={leftLabel} value={leftTxt} labelSize={12} valueSize={13} multiline={false} />
        <DetailRow label={rightLabel} value={rightTxt} labelSize={12} valueSize={13} multiline={false} />
      </div>
    )
  }, [])

  const renderViolationGroup = React.useCallback((title: string, body: React.ReactNode) => {
    return <DetailSectionCard title={title}>{body}</DetailSectionCard>
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
                {renderViolationTextLine('Descrizione', descr)}
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
            return <DetailRow key={idx} label={`Violazione ${idx + 1}`} value={descrFull} labelSize={12} valueSize={13} multiline={false} />
          })}
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
        {renderViolationGroup('Art. 15 - Prelievo abusivo', art15Body)}
        {renderViolationGroup('Artt. 16 e 17 - Inosservanza termini presentazione comunicazioni', art1617Body)}
        {renderViolationGroup('Altre violazioni', altreBody)}
        {renderViolationGroup('Dettagli della violazione', detailsBody)}
      </div>
    )
  }, [getRawField, getRawFieldWithName, getFieldLabel, splitMultiValues, fieldTypeMap, getSurveyChoiceLabel, renderViolationGroup, renderViolationSurfacesLine, renderViolationTextLine])

  const generalRows = React.useMemo(() => {
    return makeRows(DETAIL_GENERAL_FIELDS, 'generali', false)
  }, [makeRows])

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
        const iterSortIndicator = isIterTab && tab === t.id && iterSortDir ? (iterSortDir === 'desc' ? '↓' : '↑') : ''
        return (
          <TabButton 
            key={t.id}
            active={tab === t.id} 
            label={iterSortIndicator ? `${t.label} ${iterSortIndicator}` : t.label} 
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
      Selezionare un rapporto nell’elenco
    </div>
  )
} else {
  const activeTab = tabs.find(t => t.id === tab)
  
  if (activeTab?.isIterTab) {
    const gid = data?.GlobalID ?? data?.globalid ?? data?.globalId ?? data?.GLOBALID ?? ''
    content = <CicliTimeline globalId={String(gid)} hasSel={hasSel} sortDir={iterSortDir || 'desc'} />
  } else if (activeTab) {
    // Tab normale con campi configurabili
    const rows = aliasesReady ? makeRows(activeTab.fields, activeTab.id.toUpperCase(), Boolean((activeTab as any).hideEmpty)) : []

    if (activeTab.id === LUOGHI_DATI_TAB_ID) {
      content = (
        <ReadOnlyPanel
          title="Luoghi e dati"
          rows={luoghiDatiRows}
          emptyText={hasSel ? 'Dati luogo non disponibili.' : 'Selezionare un rapporto.'}
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
                attachments.map((a, idx) => {
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

          {rows && rows.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <ReadOnlyPanel
                title="Attributi"
                rows={rows}
                emptyText={hasSel ? 'Nessun campo configurato per questa tab.' : 'Selezionare un rapporto.'}
              />
            </div>
          )}
        </div>
      )
    } else if (activeTab.id === 'nota_spese') {
      content = <NotaSpeseDetailPanel data={data} detailUrl={String(props.notaSpeseCfg?.detailUrl || '')} hasSel={hasSel} />
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
          <div style={{ marginTop: 0 }}>
            {violationSurveyContent}
          </div>
          )
        : (
          <ReadOnlyPanel
            title={activeTab.id === 'anagrafica' ? 'Trasgressore' : String(activeTab.label || '')}
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
          <div style={{ padding: '10px 0 0' }}>
            <ReadOnlyPanel
              title="Dati generali"
              rows={generalRows}
              emptyText="Dati generali non disponibili."
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
          const quickState: SelState = { ds: quickDs, oid: selection.oid, idFieldName, data: mergeSelectionDataKeepingRealGeometry(baseData, null, false), sig: stateKey }
          setForcedActive({ key: selection.layerUrl, state: quickState })
        }

        const dsTry = syncCachedProxy || await createRuntimeDsProxyFromLayerUrl(selection.layerUrl, selection.viewName)
        const wantsAll = queryFields.includes('*')
        const needsQuery = !baseData || wantsAll || queryFields.some(f => f && f !== '*' && !Object.prototype.hasOwnProperty.call(baseData, f)) || !hasUsableDataGeometry(baseData) || selRefreshNonce > 0
        if (!needsQuery) return

        const where = `${idFieldName}=${selection.oid}`
        const res: any = await dsTry.query({ where, outFields: queryFields, returnGeometry: true } as any)
        if (req !== forcedReqRef.current) return
        const recs: any[] = res?.records || []
        if (!recs.length) {
          setForcedActive(null)
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
                  notaSpeseCfg={{
                    detailUrl: String((cfg as any).nsNotaSpeseDettaglioUrl || '')
                  }}
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
                    webMapLabel: String((cfg as any).mapWebMapLabel || ''),
                    mapLayerTitle: String((cfg as any).mapLayerTitle || ''),
                    mapLayerUrl: String((cfg as any).mapLayerUrl || ''),
                    mapLayerId: String((cfg as any).mapLayerId || ''),
                    mapLayerLayerId: String((cfg as any).mapLayerLayerId || '')
                  }}
                />
        </>
    </div>
  )
}

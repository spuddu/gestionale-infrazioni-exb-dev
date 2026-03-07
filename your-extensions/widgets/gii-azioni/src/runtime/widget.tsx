/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, DataSourceManager } from 'jimu-core'
import { Button } from 'jimu-ui'
import { createPortal } from 'react-dom'
import type { IMConfig, TabConfig } from '../config'
import { defaultConfig } from '../config'


const GII_LOG_MODIFICHE_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_MODIFICHE/FeatureServer/0'
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'


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
      return {
        oid: Number(mem.oid),
        layerUrl: String(mem.layerUrl || '').trim(),
        serviceUrl: String(mem.serviceUrl || '').trim(),
        idFieldName: String(mem.idFieldName || 'OBJECTID').trim() || 'OBJECTID',
        viewName: String(mem.viewName || '').trim(),
        data: mem.data && typeof mem.data === 'object' ? mem.data : undefined
      }
    }

    const oidRaw = sessionStorage.getItem('GII_SELECTED_OID')
    const layerUrl = String(sessionStorage.getItem('GII_SELECTED_LAYER_URL') || '').trim()
    const serviceUrl = String(sessionStorage.getItem('GII_SELECTED_SERVICE_URL') || '').trim()
    const idFieldName = String(sessionStorage.getItem('GII_SELECTED_IDFIELD') || 'OBJECTID').trim() || 'OBJECTID'
    const viewName = String(sessionStorage.getItem('GII_SELECTED_VIEW_NAME') || '').trim()
    const dataRaw = sessionStorage.getItem('GII_SELECTED_DATA')
    let data: any = undefined
    if (dataRaw) {
      try { data = JSON.parse(dataRaw) } catch {}
    }
    const oid = oidRaw != null ? Number(oidRaw) : NaN
    if (!layerUrl || !Number.isFinite(oid)) return null
    return { oid, layerUrl, serviceUrl, idFieldName, viewName, data }
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
}) {
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

type Pending = null | 'TAKE' | 'ASSEGNA_TI' | 'INTEGRAZIONE' | 'APPROVA' | 'RESPINGI' | 'TRASMETTI' | 'ELIMINA'

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

  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg] = React.useState<Msg | null>({ kind: 'info', text: 'Selezionare una riga.' })

  // lock procedura: solo quando parte un’azione (pending) o quando salvo (loading)
  const [pending, setPending] = React.useState<Pending>(null)

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
  // Alcune viste / layer non espongono i campi "presa_in_carico_*" (ma espongono "stato_*"),
  // oppure il campo non esiste proprio nel modello dati.
  // In questi casi NON dobbiamo:
  // 1) usarlo per il gating dei pulsanti
  // 2) impostarlo nel patch ottimistico (altrimenti si accende solo "subito" e poi si spegne al reselect)
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

  const inferSettoreFromUsername = (u: string): string => {
    const up = String(u || '').toUpperCase()
    const m = up.match(/(D[1-6]|DS|CR)/)
    return m ? m[1] : ''
  }

  const writeLogPresaInCarico = async (opts: {
    parentOid: number
    parentGlobalId?: string
    ruolo: string
    area?: string
    settore?: string
    campo: string
    valorePrev?: any
    valoreNew?: any
    note?: string
  }) => {
    try {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const logLayer = new FeatureLayer({ url: GII_LOG_MODIFICHE_URL, outFields: ['*'] })
      if (typeof logLayer.load === 'function') {
        await logLayer.load()
      }

      const attrsRaw: Record<string, any> = {
        parent_globalid: opts.parentGlobalId || '00000000-0000-0000-0000-000000000000',
        parent_objectid: opts.parentOid,
        dt_evento: Date.now(),
        ruolo: opts.ruolo,
        area: opts.area ?? '',
        settore: opts.settore ?? '',
        operazione: 'UPDATE',
        campo: opts.campo,
        valore_precedente: opts.valorePrev != null ? String(opts.valorePrev) : '',
        valore_nuovo: opts.valoreNew != null ? String(opts.valoreNew) : '',
        session_id: sessionIdRef.current,
        note: opts.note ?? ''
      }

      const attrs = filterAttrsToLayerFields(attrsRaw, logLayer)

      const res = await logLayer.applyEdits({ addFeatures: [{ attributes: attrs }] })
      const add = (res as any)?.addFeatureResults?.[0] || (res as any)?.addResults?.[0] || null
      const err = add?.error
      const ok = !err && (add?.success === true || add?.objectId != null || add?.globalId != null || add?.success == null)
      if (!ok) {
        const detail = err
          ? `code=${err.code ?? ''} name=${err.name ?? ''} message=${err.message ?? ''}`
          : JSON.stringify(res || add)
        throw new Error(detail)
      }
    } catch (e) {
      // non bloccare mai la presa in carico
      // eslint-disable-next-line no-console
      console.warn('[GII_LOG] Errore scrittura log presa in carico:', e)
    }
  }


  // --- Editing TI ---
  const ec = props.editConfig
  const [editOverlayOpen, setEditOverlayOpen] = React.useState(false)

  // Determina se il pulsante Modifica è abilitato
  const statoTIVal = data ? data[ec.fieldStatoTI] : null
  const presaTIVal = data ? data[ec.fieldPresaTI] : null
  const statoTINum = toNumOrNull(statoTIVal)
  const presaTINum = toNumOrNull(presaTIVal)

  const canEdit =
    hasSel &&
    !loading &&
    pending === null &&
    ec.show &&
    presaTINum === ec.presaRequiredVal &&
    statoTINum != null &&
    statoTINum >= ec.minStato &&
    statoTINum <= ec.maxStato

  const handleEditOverlay = () => {
    if (!canEdit) return
    // Scrive i dati nel canale globale per il widget Editing TI
    try {
      (window as any).__giiEdit = {
        oid,
        data: { ...data },
        idFieldName: active?.state?.idFieldName || 'OBJECTID',
        dsId: active?.state?.ds?.id ?? null,
        layerUrl: active?.state?.ds?.getDataSourceJson?.()?.url ?? active?.state?.ds?.dataSourceJson?.url ?? null,
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
        layerUrl: active?.state?.ds?.getDataSourceJson?.()?.url ?? active?.state?.ds?.dataSourceJson?.url ?? null,
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

  // Leggi i valori in modo robusto:
  // - se il campo non esiste nello schema, non usarlo
  // - se esiste ma arriva con case diversa, risolvi tramite schema CI
  const presaFieldExists = hasField(presaField)
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
      (toNumOrNull(pickAttrCI(d, ['presa_in_carico_DT', 'PRESA_IN_CARICO_DT'])) != null) ||
      (toNumOrNull(pickAttrCI(d, ['stato_DT', 'STATO_DT'])) != null) ||
      (toNumOrNull(pickAttrCI(d, ['esito_DT', 'ESITO_DT'])) != null) ||
      (toNumOrNull(pickAttrCI(d, ['presa_in_carico_DA', 'PRESA_IN_CARICO_DA'])) != null) ||
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
      setTiSelected('')
      setTiLoadErr('')
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
      const area = (u?.area != null && String(u.area) !== '') ? Number(u.area) : null
      const settore = (u?.settore != null && String(u.settore) !== '') ? Number(u.settore) : null

      const runQuery = async (where: string): Promise<TiOpt[]> => {
        const q: any = (typeof fl.createQuery === 'function') ? fl.createQuery() : {}
        q.where = where
        q.outFields = ['username', 'full_name', 'area', 'settore']
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
      if (area != null && settore != null) {
        opts = await runQuery(`ruolo = 2 AND area = ${area} AND settore = ${settore}`).catch(() => [])
      }
      if (!opts.length && area != null) {
        opts = await runQuery(`ruolo = 2 AND area = ${area}`).catch(() => [])
      }
      if (!opts.length) {
        opts = await runQuery('ruolo = 2').catch(() => [])
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


  const isLocked = pending != null || loading
  const showOverlay = isLocked && hasSel

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
        const p = d[`presa_in_carico_${r}`]
        const s = d[`stato_${r}`]
        const e = d[`esito_${r}`]
        return isMeaningful(p) || isMeaningful(s) || isMeaningful(e)
      })
      const statoTi = toNum(pickAttrCI(d, ['stato_TI', 'stato_ti', 'STATO_TI']))
      const esitoTi = toNum(pickAttrCI(d, ['esito_TI', 'esito_ti', 'ESITO_TI']))
      const tiReturnedLocal = (esitoTi != null) || (statoTi === STATO_APPROVATA) || (statoTi === STATO_RESPINTA)
      if (!higherTouched && !tiReturnedLocal) return 'TI'
    }

    const scanOrder = ['DA', 'DT', 'RI', 'RZ', 'TI', 'TR']

    const hasData = (role: string) => {
      const p = d[`presa_in_carico_${role}`]
      const s = d[`stato_${role}`]
      const e = d[`esito_${role}`]
      return isMeaningful(p) || isMeaningful(s) || isMeaningful(e)
    }

    for (const r of scanOrder) {
      if (!hasData(r)) continue

      const presaNum = toNum(d[`presa_in_carico_${r}`])
      const statoNum = toNum(d[`stato_${r}`])
      const esitoNum = toNum(d[`esito_${r}`])

      // Se l'esito è valorizzato (non 0) significa che quel ruolo ha già agito.
      // Il nodo "attivo" è il successivo, ma per gating ci basta non far tornare indietro.
      if (esitoNum != null) return r

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
    (toNumOrNull(pickAttrCI(data, ['presa_in_carico_DT', 'PRESA_IN_CARICO_DT'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['stato_DT', 'STATO_DT'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['esito_DT', 'ESITO_DT'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['presa_in_carico_DA', 'PRESA_IN_CARICO_DA'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['stato_DA', 'STATO_DA'])) != null) ||
    (toNumOrNull(pickAttrCI(data, ['esito_DA', 'ESITO_DA'])) != null)
  const hasTiAnyEvidence = hasTiAssigned || hasTiWorkflowTouched
  const tiReturned = (esitoTiNum != null) || (statoTiNum === STATO_APPROVATA) || (statoTiNum === STATO_RESPINTA) || hasHigherWorkflowTouched
  const lockRZBecauseAssignedToTi = role === 'RZ' && (origineNum == null || origineNum === 1) && hasTiAnyEvidence && !tiReturned && !awaitingRetakeByRz

  const canStartEsito =
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    pending === null &&
    isMyTurn &&
    !lockRZBecauseAssignedToTi &&
    effectivePresaNum === PRESA_IN_CARICO &&
    effectiveStatoNum === STATO_PRESA_IN_CARICO

  // Regola RZ: prima di assegnare a TI, può solo "Assegna TI" oppure "Respingi" (con motivazione).
  // Quindi, FINCHÉ non esiste un TI assegnato, RZ non può fare Integrazione né Approva.
  const canStartIntegrazione =
    canStartEsito &&
    !(role === 'RZ' && (origineNum == null || origineNum === 1) && !hasTiAnyEvidence) &&
    role !== 'TI'

  const canStartApprova =
    canStartEsito &&
    !(role === 'RZ' && (origineNum == null || origineNum === 1) && !hasTiAnyEvidence)

  const canStartRespingi =
    canStartEsito &&
    role !== 'TI' &&
    role !== 'RI'

  // Label dinamiche (inoltro vs approva) — senza cambiare la semantica dati (esito=approvata).
  const approvaBtnLabel =
    role === 'TI' ? 'Inoltra a RZ' :
    role === 'RZ' ? 'Inoltra a RI' :
    role === 'RI' ? 'Inoltra a DT' :
    'Approva'

  const approvaDoneLabel =
    role === 'TI' ? 'Inoltrata a RZ' :
    role === 'RZ' ? 'Inoltrata a RI' :
    role === 'RI' ? 'Inoltrata a DT' :
    'Approvata'

  const approvaConfirmLabel =
    role === 'TI' ? 'Conferma inoltro a RZ' :
    role === 'RZ' ? 'Conferma inoltro a RI' :
    role === 'RI' ? 'Conferma inoltro a DT' :
    'Conferma approvazione'

  // TI: eliminazione consentita solo per pratiche originate da sé (origine=TI) e mai inoltrate a RZ.
  const currentUsername = String((window as any).__giiUserRole?.username || (window as any).__giiUser?.username || '').trim()
  const creatorUsername = String(pickAttrCI(data, ['creator', 'Creator', 'created_user', 'created_by', 'CreatedUser', 'CREATOR']) || '').trim()
  const isOwner = !!currentUsername && !!creatorUsername && currentUsername.toLowerCase() === creatorUsername.toLowerCase()

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
    pending === null &&
    isMyTurn &&
    origineNum === 2 &&
    !hasTiAssigned &&
    !hasRoleTouched('RZ') &&
    !hasRoleTouched('RI') &&
    !hasRoleTouched('DT') &&
    !hasRoleTouched('DA') &&
    (esitoTiNum == null) &&
    isOwner


  const canStartTrasmetti =
    role === 'DT' &&
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    pending === null &&
    isMyTurn &&
    (effectiveStatoNum === STATO_INTEGRAZIONE || effectiveStatoNum === STATO_APPROVATA || effectiveStatoNum === STATO_RESPINTA) &&
    (statoDANum == null || statoDANum === 0)

  // Assegna TI: solo RZ, dopo presa in carico, pratiche da TR.
  // NOTA: non dipendiamo da computeNodoAttivo perché su alcune Output DS ExB
  // può arrivare un subset di campi che falsano `isMyTurn` dopo un reselect.
  const canStartAssegnaTi =
    role === 'RZ' &&
    hasSel &&
    !loading &&
    !lockedByTransmit &&
    pending === null &&
    (origineNum == null || origineNum === 1) &&
    !hasTiAnyEvidence &&
    effectivePresaNum === PRESA_IN_CARICO &&
    effectiveStatoNum === STATO_PRESA_IN_CARICO

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

  const tiReqErr = confirmAttempted && pending === 'ASSEGNA_TI' && !tiSelected

  const onAnnulla = () => {
    setPending(null)
    setLoading(false)
    setMsg(null)
    setConfirmAttempted(false)
    setNoteDraft(noteOrigRef.current)
    setRejectReason('')
    setTiSelected('')
    setTiLoadErr('')
  }

  const startAction = (p: Pending) => {
    if (!hasSel) return
    if (lockedByTransmit) return
    if (p === 'TAKE' && !canStartTakeInCharge) return
    if (p === 'ASSEGNA_TI' && !canStartAssegnaTi) return
    if (p === 'INTEGRAZIONE' && !canStartIntegrazione) return
    if (p === 'APPROVA' && !canStartApprova) return
    if (p === 'RESPINGI' && !canStartRespingi) return
    if (p === 'TRASMETTI' && !canStartTrasmetti) return
    if (p === 'ELIMINA' && !canStartElimina) return

    setPending(p)
    setMsg(null)
    setConfirmAttempted(false)
    setRejectReason('')
    setTiLoadErr('')

    if (p === 'ASSEGNA_TI') {
      const cur = String(pickAttrCI(data, ['ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato']) || '')
      setTiSelected(cur)
      window.setTimeout(() => { void loadTiOptions() }, 0)
    } else {
      setTiSelected('')
    }

    if (p === 'INTEGRAZIONE') {
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


  // Chiama deleteFeatures direttamente via REST (fetch).
  const deleteFeaturesViaRest = async (layerUrl: string, objectId: number): Promise<void> => {
    let token = ''
    try {
      const esriId = await loadEsriModule<any>('esri/identity/IdentityManager')
      const cred = await esriId.getCredential(layerUrl)
      token = cred?.token || ''
    } catch { /* ignore */ }

    const body = new URLSearchParams({
      f: 'json',
      objectIds: String(objectId),
      rollbackOnFailure: 'true',
      ...(token ? { token } : {})
    })

    const url = `${layerUrl.replace(/\/$/, '')}/deleteFeatures`
    const resp = await fetch(url, { method: 'POST', body })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()

    if (json.error) {
      throw new Error(`REST error: code=${json.error.code} – ${json.error.message}`)
    }
    const del = json.deleteResults?.[0]
    if (del && !del.success) {
      const e = del.error
      throw new Error(e ? `code=${e.code} – ${e.description || e.message}` : JSON.stringify(del))
    }
  }

  const runDeleteEdits = async (okText: string) => {
    if (!ds) throw new Error('DataSource non disponibile.')
    if (!hasSel || oid == null) throw new Error('Selezione non valida.')

    const startKey = selectionKeyRef.current
    setLoading(true)
    setMsg({ kind: 'info', text: 'Elimino…' })

    try {
      const motherUrl = props.motherLayerUrl ? String(props.motherLayerUrl).trim() : ''
      const root = getRootDs(ds)

      if (motherUrl) {
        await deleteFeaturesViaRest(motherUrl, oid)
      } else {
        const { layer } = await resolveLayer(ds)
        if (!layer?.applyEdits) throw new Error('Layer non disponibile (applyEdits).')
        if (typeof layer.load === 'function') {
          try { await layer.load() } catch {}
        }
        const res = await layer.applyEdits({ deleteFeatures: [oid] })
        const del = res?.deleteFeatureResults?.[0] || res?.deleteResults?.[0] || null
        const err = del?.error
        const ok = !err && (del?.success === true || del?.objectId != null || del?.success == null)
        if (!ok) {
          const detail = err
            ? `code=${err.code ?? ''} name=${err.name ?? ''} message=${err.message ?? ''}`
            : JSON.stringify(res || del)
          throw new Error(detail)
        }
      }

      if (selectionKeyRef.current !== startKey) {
        setMsg(null)
        setLoading(false)
        return
      }

      setMsg({ kind: 'ok', text: okText })

      // refresh data sources
      await refreshRootAndDerived(getRootDs(ds))
      await refreshRootAndDerived(ds)

      // forza refresh selection/lista
      try {
        window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid } }))
      } catch {
        try { window.dispatchEvent(new Event('gii-force-refresh-selection')) } catch {}
      }

      window.setTimeout(() => {
        if (selectionKeyRef.current === startKey) setMsg(null)
      }, 4500)

      setLoading(false)
    } catch (e) {
      setLoading(false)
      throw e
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

      // Aggiorna subito la UI con i nuovi valori (es. disabilita "Prendi in carico" e abilita "Assegna TI").
      try {
        const cur = (baseData && typeof baseData === 'object') ? baseData : {}
        setLocalData({ ...cur, ...attributesIn })
      } catch {}

      // refresh root + derived + ds corrente (per sicurezza)
      await refreshRootAndDerived(root)
      await refreshRootAndDerived(ds)

      // Forza il re-fetch del record selezionato (la selezione resta la stessa, quindi senza questo
      // l'UI può rimanere con i valori "vecchi" fino a cambio selezione / F5).
      try {
        window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid } }))
      } catch {
        try { window.dispatchEvent(new Event('gii-force-refresh-selection')) } catch {}
      }

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
      const prevPresaVal = presaNum
      // Costruisci l'update SOLO con i campi che esistono nello schema.
      // Questo evita patch ottimistici su campi inesistenti che poi "spariscono" al reselect.
      const upd: Record<string, any> = {}
      if (presaFieldExists) upd[realFieldName(presaField)] = PRESA_IN_CARICO
      if (dtPresaFieldExists) upd[realFieldName(dtPresaField)] = Date.now()

      // stato_* è il campo realmente "portante" nel workflow: aggiorniamolo sempre.
      // Se lo schema non è disponibile, realFieldName() torna il nome originale.
      upd[realFieldName(statoField)] = STATO_PRESA_IN_CARICO
      upd[realFieldName(dtStatoField)] = Date.now()

      await runApplyEdits(upd, 'Presa in carico salvata.')

      // Scrittura log (best-effort, non blocca la presa in carico)
      const parentGid = String(pickAttrCI(data, ['globalid', 'global_id', 'GlobalID', 'GLOBALID', 'parent_globalid']) || '00000000-0000-0000-0000-000000000000')
      const areaValRaw = pickAttrCI(data, ['area', 'area_cod', 'cod_area'])
      const settoreValRaw =
        pickAttrCI(data, ['settore', 'settore_cod', 'cod_settore']) ||
        inferSettoreFromUsername(String(pickAttrCI(data, ['creator', 'Creator', 'editor', 'Editor']) || ''))
      void writeLogPresaInCarico({
        parentOid: oid as number,
        parentGlobalId: parentGid,
        ruolo: role,
        area: areaValRaw != null ? String(areaValRaw) : '',
        settore: settoreValRaw != null ? String(settoreValRaw) : '',
        campo: presaFieldExists ? realFieldName(presaField) : realFieldName(statoField),
        valorePrev: prevPresaVal,
        valoreNew: PRESA_IN_CARICO,
        note: `Presa in carico (${role})`
      })

      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
    }
  }


  const onConfirmAssegnaTi = async () => {
    setConfirmAttempted(true)
    if (!tiSelected) return

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

        if (fStatoTI) upd[fStatoTI] = STATO_DA_PRENDERE
        if (fDtStatoTI) upd[fDtStatoTI] = Date.now()
        if (fPresaTI) upd[fPresaTI] = PRESA_DA_PRENDERE
        if (fDtPresaTI) upd[fDtPresaTI] = Date.now()
      } catch {}

      const prevTi = String(pickAttrCI(data, ['ti_assegnato_username', 'ti_assegnato_user', 'ti_assegnato']) || '')

      await runApplyEdits(upd, `TI assegnato: ${tiName}.`)

      // Scrittura log (best-effort)
      const parentGid = String(pickAttrCI(data, ['globalid', 'global_id', 'GlobalID', 'GLOBALID', 'parent_globalid']) || '00000000-0000-0000-0000-000000000000')
      const areaValRaw = pickAttrCI(data, ['area', 'area_cod', 'cod_area'])
      const settoreValRaw =
        pickAttrCI(data, ['settore', 'settore_cod', 'cod_settore']) ||
        inferSettoreFromUsername(String(pickAttrCI(data, ['creator', 'Creator', 'editor', 'Editor']) || ''))
      void writeLogPresaInCarico({
        parentOid: oid as number,
        parentGlobalId: parentGid,
        ruolo: role,
        area: areaValRaw != null ? String(areaValRaw) : '',
        settore: settoreValRaw != null ? String(settoreValRaw) : '',
        campo: 'ti_assegnato_username',
        valorePrev: prevTi,
        valoreNew: tiSelected,
        note: `Assegna TI: ${tiName} (${tiSelected})`
      })

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

      // TI: il pulsante verde è "Inoltra a RZ" → inizializza la coda RZ (best-effort) se i campi esistono.
      if (role === 'TI' && esito === ESITO_APPROVATA) {
        try {
          const schemaFields: Record<string, any> = (ds as any)?.getSchema?.()?.fields || {}
          const keys = Object.keys(schemaFields || {})
          const ci: Record<string, string> = {}
          keys.forEach(k => { ci[String(k).toLowerCase()] = k })
          const pick = (name: string) => ci[String(name).toLowerCase()] || null

          const fStatoRZ = pick('stato_RZ')
          const fDtStatoRZ = pick('dt_stato_RZ')
          const fPresaRZ = pick('presa_in_carico_RZ')
          const fDtPresaRZ = pick('dt_presa_in_carico_RZ')

          const curStatoRZ = toNumOrNull(pickAttrCI(data, ['stato_RZ', 'stato_rz', 'STATO_RZ']))
          const curPresaRZ = toNumOrNull(pickAttrCI(data, ['presa_in_carico_RZ', 'presa_in_carico_rz', 'PRESA_IN_CARICO_RZ']))

          if (fStatoRZ) upd[fStatoRZ] = STATO_DA_PRENDERE
          if (fDtStatoRZ) upd[fDtStatoRZ] = Date.now()
          if (fPresaRZ) upd[fPresaRZ] = PRESA_DA_PRENDERE
          if (fDtPresaRZ) upd[fDtPresaRZ] = Date.now()
        } catch {}
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

  const onConfirmElimina = async () => {
    try {
      await runDeleteEdits('Pratica eliminata.')
      setPending(null)
      setConfirmAttempted(false)
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore eliminazione: ${txt}` })
    }
  }

  const onConfirmTrasmetti = async () => {
    try {
      await runApplyEdits(
        {
          [statoDAField]: STATO_DA_PRENDERE,
          [dtStatoDAField]: Date.now(),
          [presaDAField]: PRESA_DA_PRENDERE
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
          <div style={{ fontSize: titleFontSize, fontWeight: 700, color: hasSel ? undefined : 'rgba(0,0,0,0.40)' }}>Azioni</div>
          {msg && <div style={msgStyle(msg.kind, msgFontSize)} title={msg.text}>{msg.text}</div>}
        </div>
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

            {role === 'RZ' && (
              <Button
                type='primary'
                onClick={() => startAction('ASSEGNA_TI')}
                disabled={!canStartAssegnaTi}
                style={actionButtonStyle(buttonColors.take, !canStartAssegnaTi, ui)}
              >
                Assegna TI
              </Button>
            )}

            {role !== 'TI' && (
              <Button
                type='primary'
                onClick={() => startAction('INTEGRAZIONE')}
                disabled={!canStartIntegrazione}
                style={actionButtonStyle(buttonColors.integrazione, !canStartIntegrazione, ui)}
              >
                Integrazione
              </Button>
            )}

            <Button
              type='primary'
              onClick={() => startAction('APPROVA')}
              disabled={!canStartApprova}
              style={actionButtonStyle(buttonColors.approva, !canStartApprova, ui)}
            >
              {approvaBtnLabel}
            </Button>

            {role === 'TI' ? (
              <Button
                type='primary'
                onClick={() => startAction('ELIMINA')}
                disabled={!canStartElimina}
                style={actionButtonStyle(buttonColors.respingi, !canStartElimina, ui)}
              >
                Elimina
              </Button>
            ) : (
              <Button
                type='primary'
                onClick={() => startAction('RESPINGI')}
                disabled={!canStartRespingi}
                style={actionButtonStyle(buttonColors.respingi, !canStartRespingi, ui)}
              >
                Respingi
              </Button>
            )}

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

            {/* ASSEGNA TI (solo RZ) */}
            {pending === 'ASSEGNA_TI' && role === 'RZ' && (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: titleFontSize, fontWeight: 700 }}>TI</div>
                  <div style={labelReqStyle(true, tiReqErr)}>(obbligatoria)</div>
                </div>

                <select
                  value={tiSelected}
                  onChange={(e) => {
                    setTiSelected(e.target.value)
                    if (confirmAttempted) setConfirmAttempted(false)
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${tiReqErr ? '#d13438' : 'rgba(0,0,0,0.15)'}`,
                    outline: 'none'
                  }}
                >
                  <option value=''>— Seleziona TI —</option>
                  {tiOptions.map(o => (
                    <option key={o.username} value={o.username}>
                      {(o.fullName || o.username)} ({o.username})
                    </option>
                  ))}
                </select>

                {tiLoading && (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Carico elenco TI…</div>
                )}
                {!tiLoading && !tiLoadErr && tiOptions.length === 0 && (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Nessun TI trovato.</div>
                )}
                {!!tiLoadErr && (
                  <div style={{ fontSize: 12, color: '#d13438' }}>Errore elenco TI: {tiLoadErr}</div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
                  <Button
                    type='tertiary'
                    onClick={() => void loadTiOptions()}
                    disabled={loading || tiLoading}
                    style={{ padding: '6px 10px' }}
                  >
                    Aggiorna elenco
                  </Button>
                </div>
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

              {pending === 'ASSEGNA_TI' && (
                <Button
                  type='primary'
                  onClick={onConfirmAssegnaTi}
                  disabled={loading || !tiSelected}
                  style={actionButtonStyle(buttonColors.take, (loading || !tiSelected), ui)}
                >
                  {loading ? 'Aggiorno…' : 'Conferma assegnazione TI'}
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
                  onClick={() => onConfirmEsito(ESITO_APPROVATA, approvaDoneLabel)}
                  disabled={loading}
                  style={actionButtonStyle(buttonColors.approva, !!loading, ui)}
                >
                  {loading ? 'Aggiorno…' : approvaConfirmLabel}
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

              {pending === 'ELIMINA' && (
                <Button
                  type='primary'
                  onClick={onConfirmElimina}
                  disabled={loading}
                  style={actionButtonStyle(buttonColors.respingi, !!loading, ui)}
                >
                  {loading ? 'Elimino…' : 'Conferma eliminazione'}
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



function DetailTabsPanel (props: {
  active: { key: string; state: SelState } | null
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
      const vv = data ? (data as any)[f] : null
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
  content = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, fontWeight: 700, fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>
      Selezionare un rapporto nell’elenco
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
            <button
              type="button"
              onClick={() => loadAttachments()}
              disabled={!hasSel || attachmentsLoading}
              onMouseEnter={(e) => {
                if (!(!hasSel || attachmentsLoading)) {
                  e.currentTarget.style.background = '#eaf2ff'
                  e.currentTarget.style.borderColor = '#2f6fed'
                  e.currentTarget.style.color = '#1d4ed8'
                }
              }}
              onMouseLeave={(e) => {
                if (!(!hasSel || attachmentsLoading)) {
                  e.currentTarget.style.background = '#fff'
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
                  e.currentTarget.style.color = '#111827'
                }
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                background: '#fff',
                color: '#111827',
                cursor: (!hasSel || attachmentsLoading) ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              Aggiorna
            </button>
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

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfgMutable: any = (props.config && (props.config as any).asMutable)
    ? (props.config as any).asMutable({ deep: true })
    : (props.config as any || {})
  const cfg: any = { ...defaultConfig, ...cfgMutable }

  // ── Ruolo utente: letto da window.__giiUserRole (scritto dal widget Elenco) ──
  const [detectedRole, setDetectedRole] = React.useState<string>('')

  React.useEffect(() => {
    const readRole = () => {
      try {
        const r = (window as any).__giiUserRole?.ruoloLabel
        // Se __giiUserRole è assente (logout) o ruolo ADMIN: azzera il ruolo rilevato.
        setDetectedRole(r && r !== 'ADMIN' ? String(r).toUpperCase() : '')
      } catch { }
    }
    readRole()
    window.addEventListener('gii:userLoaded', readRole)
    return () => window.removeEventListener('gii:userLoaded', readRole)
  }, [])

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
    detailTitleBg: String((cfg as any).detailTitleBg ?? 'transparent'),

    btnBorderRadius: Number.isFinite(Number((cfg as any).btnBorderRadius)) ? Number((cfg as any).btnBorderRadius) : 8,
    btnFontSize: Number.isFinite(Number((cfg as any).btnFontSize)) ? Number((cfg as any).btnFontSize) : 13,
    btnFontWeight: Number.isFinite(Number((cfg as any).btnFontWeight)) ? Number((cfg as any).btnFontWeight) : 600,
    btnPaddingX: Number.isFinite(Number((cfg as any).btnPaddingX)) ? Number((cfg as any).btnPaddingX) : 16,
    btnPaddingY: Number.isFinite(Number((cfg as any).btnPaddingY)) ? Number((cfg as any).btnPaddingY) : 8
  }

  const tabFields: TabFields = {
    anagrafica: normalizeFieldList((cfg as any).anagraficaFields),
    violazione: normalizeFieldList((cfg as any).violazioneFields),
    allegati: normalizeFieldList((cfg as any).allegatiFields),
    iterExtra: normalizeFieldList((cfg as any).iterExtraFields)
  }

  // Migra tabs
  const migratedTabs = migrateTabs(tabFields, cfg.tabs || [])

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
    const h = () => setSelRefreshNonce(n => n + 1)
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
        const baseData = selection.data && typeof selection.data === 'object' ? selection.data : null
        const baseOid = baseData ? Number(baseData[idFieldName] ?? baseData.OBJECTID ?? selection.oid) : NaN
        const stateKey = `${selection.layerUrl}:${selection.oid}`

        if (baseData && Number.isFinite(baseOid) && baseOid === selection.oid) {
          const quickState: SelState = { ds: dsTry, oid: selection.oid, idFieldName, data: baseData, sig: stateKey }
          setForcedActive({ key: selection.layerUrl, state: quickState })
        }

        const wantsAll = queryFields.includes('*')
        const needsQuery = !baseData || wantsAll || queryFields.some(f => f && f !== '*' && !Object.prototype.hasOwnProperty.call(baseData, f))
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
        const d0 = baseData ? { ...(baseData || {}), ...(fetched || {}) } : fetched
        const oid0 = Number(d0[idFieldName] ?? d0.OBJECTID ?? selection.oid)
        if (!Number.isFinite(oid0) || oid0 !== selection.oid) {
          setForcedActive(null)
          return
        }
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
				  motherLayerUrl={String(cfg.motherLayerUrl || '').trim() || undefined}
				/>
      </>
    </div>
  )
}

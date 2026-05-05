/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, DataSourceTypes, DataSourceManager, getAppStore, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { MapWidgetSelector } from 'jimu-ui/advanced/setting-components'
import type { IMConfig } from '../config'
import { defaultConfig, DEFAULT_FIELD_LAYOUTS } from '../config'

function asJs<T=any>(v:any):T { return v?.asMutable?v.asMutable({deep:true}):v }


type FieldOpt = { name: string; alias: string; type?: string }

function toImmutableCfg(base:any, patch:Record<string, any>) {
  let next = base?.set ? base : { ...(base || {}) }
  Object.entries(patch).forEach(([k, v]) => {
    const val = Array.isArray(v) ? [...(v as any)] : v
    next = next?.set ? next.set(k, val) : { ...next, [k]: val }
  })
  return next
}


function parseCoordInput(raw:any): number {
  const s = String(raw ?? '').trim()
  if (!s) return 0
  const normalized = s.replace(/\s+/g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

function formatCoordInput(v:any): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  const s = String(v).trim()
  return s
}

function getSchemaSnapshot(dsId: string) {
  const ds: any = dsId ? DataSourceManager.getInstance().getDataSource(dsId) : null
  const url = String(ds?.getDataSourceJson?.()?.url || ds?.dataSourceJson?.url || '').trim()
  let label = String(ds?.getLabel?.() || '').trim()
  if (!label && url) {
    try { label = decodeURIComponent(url.split('/').slice(-2, -1)[0] || '') } catch {}
  }
  const fobj = ds?.getSchema?.()?.fields || {}
  const fields: FieldOpt[] = Object.keys(fobj).map(name => {
    const f = fobj[name] || {}
    return { name, alias: String(f.alias || f.label || f.title || name), type: String(f.type || '') }
  }).sort((a, b) => (a.alias || a.name).localeCompare(b.alias || b.name, 'it', { sensitivity: 'base' }))
  return { url, label, fields }
}


type MapLayerOpt = {
  key: string
  title: string
  url: string
  id: string
  layerId: string
}

function normalizeLayerUrlForConfig(raw: any): string {
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

function readLayerIdFromUrl(raw: any): string {
  const m = String(raw || '').trim().match(/\/(\d+)\/?(?:[?#].*)?$/)
  return m ? m[1] : ''
}

function firstText(...vals: any[]): string {
  for (const v of vals) {
    const s = String(v ?? '').trim()
    if (s) return s
  }
  return ''
}

function arrayFromUnknown(v: any): any[] {
  const x = asJs(v)
  if (!x) return []
  if (Array.isArray(x)) return x
  if (typeof x === 'object') return Object.values(x)
  return []
}

function looksLikeFeatureLayer(dsJson: any, url: string): boolean {
  const t = String(dsJson?.type || dsJson?.dataSourceType || '').toLowerCase()
  if (t.includes('feature_layer') || t.includes('featurelayer')) return true
  return /\/(feature|map)server\/(\d+)\/?$/i.test(String(url || ''))
}

function mapLayerOptionFromDataSource(dsId: string, rawDsJson: any): MapLayerOpt | null {
  const dsJson: any = asJs(rawDsJson || {})
  const url = normalizeLayerUrlForConfig(firstText(dsJson?.url, dsJson?.sourceUrl, dsJson?.itemUrl, dsJson?.dataSourceJson?.url))
  if (!looksLikeFeatureLayer(dsJson, url)) return null
  const layerId = firstText(dsJson?.layerId, dsJson?.layerIdInWebMap, dsJson?.mapServiceLayerId, dsJson?.sourceLayerId, dsJson?.dataSourceJson?.layerId, readLayerIdFromUrl(url))
  const title = firstText(dsJson?.sourceLabel, dsJson?.label, dsJson?.title, dsJson?.name, dsJson?.layerDefinition?.name, dsJson?.dataSourceJson?.label, dsJson?.dataSourceJson?.sourceLabel, dsId)
  const id = firstText(dsJson?.jimuChildId, dsJson?.id, dsJson?.dataSourceId, dsId)
  return {
    key: `${id}|${url}|${layerId}`,
    title,
    url,
    id,
    layerId
  }
}

function pushMapLayerOption(out: MapLayerOpt[], opt: MapLayerOpt | null) {
  if (!opt) return
  const sig = `${String(opt.id || '').toLowerCase()}|${String(opt.url || '').toLowerCase()}|${String(opt.layerId || '').toLowerCase()}|${String(opt.title || '').toLowerCase()}`
  if (out.some(o => `${String(o.id || '').toLowerCase()}|${String(o.url || '').toLowerCase()}|${String(o.layerId || '').toLowerCase()}|${String(o.title || '').toLowerCase()}` === sig)) return
  out.push(opt)
}

function collectDataSourceManagerLayerOptions(rootDsIds: string[]): MapLayerOpt[] {
  const out: MapLayerOpt[] = []
  const dsm = DataSourceManager.getInstance()
  const visit = (ds: any) => {
    if (!ds) return
    const dsJson = ds?.getDataSourceJson?.() || ds?.dataSourceJson || {}
    const dsId = firstText(ds?.id, dsJson?.id, dsJson?.dataSourceId)
    pushMapLayerOption(out, mapLayerOptionFromDataSource(dsId, dsJson))
    const children = [
      ...arrayFromUnknown(ds?.getDataSources?.()),
      ...arrayFromUnknown(ds?.getChildDataSources?.()),
      ...arrayFromUnknown(ds?.getAllChildDataSources?.()),
      ...arrayFromUnknown(ds?.dataSources)
    ]
    children.forEach(visit)
  }
  rootDsIds.forEach(id => visit(dsm.getDataSource(id)))
  return out
}

function collectPageMapLayerOptions(mapWidgetIds: any): MapLayerOpt[] {
  const ids = Array.isArray(mapWidgetIds) ? mapWidgetIds.map(String).filter(Boolean) : []
  const appConfig: any = asJs(getAppStore()?.getState?.()?.appStateInBuilder?.appConfig || {})
  const dataSources: any = asJs(appConfig?.dataSources || {})
  const out: MapLayerOpt[] = []
  const rootDsIds: string[] = []

  ids.forEach(widgetId => {
    const widget: any = asJs(appConfig?.widgets?.[widgetId] || {})
    const useDs = [
      ...arrayFromUnknown(widget?.useDataSources),
      ...arrayFromUnknown(widget?.config?.useDataSources),
      ...arrayFromUnknown(widget?.config?.dataSources)
    ]
    useDs.forEach((u: any) => {
      const dsId = typeof u === 'string' ? u : firstText(u?.dataSourceId, u?.mainDataSourceId, u?.id)
      if (dsId && !rootDsIds.includes(dsId)) rootDsIds.push(dsId)
    })

    const mapLayers = [
      ...arrayFromUnknown(widget?.config?.layers),
      ...arrayFromUnknown(widget?.config?.webMapLayers),
      ...arrayFromUnknown(widget?.config?.operationalLayers)
    ]
    mapLayers.forEach((l: any) => {
      const dsId = firstText(l?.dataSourceId, l?.jimuLayerId, l?.id)
      if (dsId && dataSources?.[dsId]) pushMapLayerOption(out, mapLayerOptionFromDataSource(dsId, dataSources[dsId]))
      else {
        const url = normalizeLayerUrlForConfig(firstText(l?.url, l?.layerUrl))
        if (looksLikeFeatureLayer(l, url)) {
          pushMapLayerOption(out, {
            key: `${firstText(l?.id, dsId)}|${url}|${firstText(l?.layerId, readLayerIdFromUrl(url))}`,
            title: firstText(l?.title, l?.name, l?.label, dsId),
            url,
            id: firstText(l?.id, dsId),
            layerId: firstText(l?.layerId, readLayerIdFromUrl(url))
          })
        }
      }
    })
  })

  collectDataSourceManagerLayerOptions(rootDsIds).forEach(o => pushMapLayerOption(out, o))

  const relatedIds = new Set<string>()
  const markRelated = (rootId: string) => {
    const root: any = asJs(dataSources?.[rootId] || {})
    const webMapLayers = [
      ...arrayFromUnknown(root?.itemData?.operationalLayers),
      ...arrayFromUnknown(root?.portalItemData?.operationalLayers),
      ...arrayFromUnknown(root?.map?.operationalLayers),
      ...arrayFromUnknown(root?.operationalLayers)
    ]
    webMapLayers.forEach((l: any) => {
      const url = normalizeLayerUrlForConfig(firstText(l?.url, l?.layerUrl))
      if (!looksLikeFeatureLayer(l, url)) return
      const layerId = firstText(l?.layerId, l?.layerDefinition?.layerId, readLayerIdFromUrl(url))
      const id = firstText(l?.id, l?.itemId, l?.layerId)
      pushMapLayerOption(out, {
        key: `${id}|${url}|${layerId}`,
        title: firstText(l?.title, l?.name, l?.label, id),
        url,
        id,
        layerId
      })
    })
    ;[...arrayFromUnknown(root?.dataSources), ...arrayFromUnknown(root?.childDataSources), ...arrayFromUnknown(root?.originDataSources)].forEach((v: any) => {
      const id = typeof v === 'string' ? v : firstText(v?.id, v?.dataSourceId)
      if (id) relatedIds.add(id)
      if (id && dataSources?.[id]) pushMapLayerOption(out, mapLayerOptionFromDataSource(id, dataSources[id]))
      else pushMapLayerOption(out, mapLayerOptionFromDataSource(id, v))
    })
    Object.entries(dataSources || {}).forEach(([dsId, raw]) => {
      const ds: any = asJs(raw || {})
      const parent = firstText(ds?.rootDataSourceId, ds?.parentDataSourceId, ds?.belongToDataSourceId, ds?.webMapDataSourceId, ds?.mainDataSourceId)
      const byId = String(dsId).startsWith(`${rootId}-`) || String(dsId).startsWith(`${rootId}_`)
      if (parent === rootId || byId) relatedIds.add(dsId)
    })
  }
  rootDsIds.forEach(markRelated)
  relatedIds.forEach(dsId => pushMapLayerOption(out, mapLayerOptionFromDataSource(dsId, dataSources?.[dsId])))

  return out.sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id, 'it', { sensitivity: 'base' }))
}

function formatMapLayerOption(opt: MapLayerOpt): string {
  const parts = [opt.title]
  if (opt.layerId) parts.push(`layer ${opt.layerId}`)
  return parts.filter(Boolean).join(' — ')
}

const P = {
  wrap:  { padding:'0 12px 32px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb' } as React.CSSProperties,
  sec:   { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.2, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' } as React.CSSProperties,
  lbl:   { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:4, marginTop:10 } as React.CSSProperties,
  hint:  { fontSize:10.5, color:'#a0aec0', marginTop:3, lineHeight:1.5 } as React.CSSProperties,
  inp:   { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  chk:   { display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#d1d5db', cursor:'pointer', marginTop:10 } as React.CSSProperties,
}

function Acc(p: { id:string; label:string; open:boolean; onToggle:()=>void }) {
  return (
    <div style={P.sec} onClick={p.onToggle}>
      <span>{p.label}</span>
      <span style={{ fontSize:10, color:'#a0aec0' }}>{p.open?'▲':'▼'}</span>
    </div>
  )
}

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...asJs(props.config) }
  const [openSec, setOpenSec] = React.useState<string>('datasource')
  const toggle = (id:string) => setOpenSec(s => s===id ? '' : id)
  const isOpen = (id:string) => openSec===id

  const set = (key:string, value:any) => {
    const base = props.config || defaultConfig as any
    props.onSettingChange({ id:props.id, config: base.set ? base.set(key, value) : { ...cfg, [key]:value } as any })
  }

  const setMany = (patch: Record<string, any>) => {
    const base = props.config || defaultConfig as any
    props.onSettingChange({ id: props.id, config: toImmutableCfg(base, patch) })
  }

  // Layout editor state
  const LAYOUT_TABS = ['anagrafica', 'violazione', 'dati_tecnici'] as const
  const [layoutTab, setLayoutTab] = React.useState<string>('anagrafica')

  const FIELD_OPTS: Record<string, {v:string;l:string}[]> = {
    anagrafica: [
      {v:'tipologia_soggetto',l:'Tipologia soggetto'},{v:'qualifica_fondo',l:'Qualifica rispetto al fondo'},
      {v:'nome',l:'Nome'},{v:'cognome',l:'Cognome'},{v:'codice_fiscale',l:'Codice fiscale'},
      {v:'ragione_sociale',l:'Ragione sociale'},{v:'piva',l:'P. IVA'},
      {v:'via',l:'Via'},{v:'civico',l:'N. civico'},{v:'citta',l:'Città'},{v:'cap',l:'CAP'},
      {v:'telefono',l:'Telefono'},{v:'cellulare',l:'Cellulare'},{v:'email',l:'E-mail'},{v:'pec',l:'PEC'},
      {v:'dom_notifica_uguale',l:'Coincide con residenza'},{v:'dom_notifica_via',l:'Dom. Via'},{v:'dom_notifica_civico',l:'Dom. Civico'},{v:'dom_notifica_citta',l:'Dom. Città'},{v:'dom_notifica_cap',l:'Dom. CAP'},
      {v:'rl_nome',l:'RL Nome'},{v:'rl_cognome',l:'RL Cognome'},{v:'rl_cf',l:'RL Codice fiscale'},{v:'rl_carica',l:'RL Carica'},
      {v:'rl_dom_notifica',l:'RL Dom. notifiche'},{v:'rl_dom_via',l:'RL Dom. Via'},{v:'rl_dom_civico',l:'RL Dom. Civico'},{v:'rl_dom_citta',l:'RL Dom. Città'},{v:'rl_dom_cap',l:'RL Dom. CAP'},
      {v:'note_anagrafica',l:'Note anagrafica'}
    ],
    violazione: [
      {v:'tipo_abuso',l:'Tipo di abuso'},{v:'norma15_sel',l:'Occorrenza Art. 15'},
      {v:'sup_dichiarata_art15',l:'Sup. dichiarata Art.15'},{v:'sup_irrigata_art15',l:'Sup. irrigata Art.15'},
      {v:'norma16_17',l:'Inosservanza Art. 16-17'},{v:'art17_tipo',l:'Tipo Art.17'},
      {v:'sup_dichiarata_art16',l:'Sup. dich. Art.16'},{v:'sup_irrigata_art16',l:'Sup. irr. Art.16'},
      {v:'sup_dichiarata_art17_1',l:'Sup. dich. Art.17.1'},{v:'sup_irrigata_art17_1',l:'Sup. var. Art.17.1'},
      {v:'sup_dichiarata_art17_2',l:'Sup. dich. Art.17.2'},{v:'sup_irrigata_art17_2',l:'Sup. irr. Art.17.2'},
      {v:'grado',l:'Grado'},
      {v:'descrizione_fatti',l:'Descrizione fatti'},{v:'circostanze',l:'Circostanze'},{v:'presenza_trasgressore',l:'Trasgressore presente'}
    ],
    dati_tecnici: [
      {v:'descrizione_luogo',l:'Descrizione luogo'},
      {v:'distretto',l:'Distretto'},{v:'comizio',l:'Comizio'},{v:'idrante',l:'Idrante'},
      {v:'matricola_contatore',l:'Matricola contatore'},{v:'matricola_tessera',l:'Matricola tessera'}
    ]
  }
  const SPECIAL_OPTS = [
    {v:'_dati_gen_label',l:'Etichetta dati generali'},{v:'_localizzazione',l:'Pannello localizzazione'},{v:'_checkboxes_norma3',l:'Checkbox altre violazioni'},{v:'_header_rappresentante_legale',l:'Header rappresentante legale (PG)'}
  ]

  const getRows = (tabId: string): any[] => {
    const layouts = asJs(cfg.fieldLayouts || {})
    const r = layouts[tabId]
    return (r && Array.isArray(r) && r.length > 0) ? r : (DEFAULT_FIELD_LAYOUTS[tabId] || [])
  }
  const isCustom = (tabId: string): boolean => {
    const layouts = asJs(cfg.fieldLayouts || {})
    return !!(layouts[tabId] && Array.isArray(layouts[tabId]) && layouts[tabId].length > 0)
  }
  const saveRows = (tabId: string, rows: any[]) => {
    const cur = asJs(cfg.fieldLayouts || {})
    set('fieldLayouts', { ...cur, [tabId]: rows })
  }
  const resetTab = (tabId: string) => {
    const cur = asJs(cfg.fieldLayouts || {})
    const next = { ...cur }; delete next[tabId]
    set('fieldLayouts', next)
  }
  const ensureCustom = (tabId: string): any[] => {
    if (isCustom(tabId)) return getRows(tabId)
    const rows = JSON.parse(JSON.stringify(DEFAULT_FIELD_LAYOUTS[tabId] || []))
    saveRows(tabId, rows)
    return rows
  }
  const updateRow = (tabId: string, idx: number, patch: any) => {
    const rows = ensureCustom(tabId).slice()
    rows[idx] = { ...rows[idx], ...patch }
    saveRows(tabId, rows)
  }
  const removeRow = (tabId: string, idx: number) => {
    const rows = ensureCustom(tabId).slice()
    rows.splice(idx, 1)
    saveRows(tabId, rows)
  }
  const moveRow = (tabId: string, idx: number, dir: -1|1) => {
    const rows = ensureCustom(tabId).slice()
    const ni = idx + dir
    if (ni < 0 || ni >= rows.length) return
    ;[rows[idx], rows[ni]] = [rows[ni], rows[idx]]
    saveRows(tabId, rows)
  }
  const addRow = (tabId: string, type: string) => {
    const rows = ensureCustom(tabId).slice()
    if (type === 'header') rows.push({ type: 'header', label: 'Nuova sezione' })
    else if (type === 'special') rows.push({ type: 'special', id: SPECIAL_OPTS[0]?.v || '' })
    else rows.push({ type: 'fields', columns: '1fr', cells: [{ field: '' }] })
    saveRows(tabId, rows)
  }
  const updateCell = (tabId: string, rowIdx: number, cellIdx: number, field: string) => {
    const rows = ensureCustom(tabId).slice()
    const r = { ...rows[rowIdx] }
    const cells = (r.cells || []).slice()
    cells[cellIdx] = field ? { ...(cells[cellIdx] || {}), field } : {}
    r.cells = cells; rows[rowIdx] = r
    saveRows(tabId, rows)
  }
  const addCell = (tabId: string, rowIdx: number) => {
    const rows = ensureCustom(tabId).slice()
    const r = { ...rows[rowIdx] }
    const cells = (r.cells || []).slice()
    const widths = colsToWidths(r.columns, cells.length)
    cells.push({})
    widths.push(25)
    r.cells = cells; r.columns = widthsToColumns(widths); rows[rowIdx] = r
    saveRows(tabId, rows)
  }
  const removeCell = (tabId: string, rowIdx: number, cellIdx: number) => {
    const rows = ensureCustom(tabId).slice()
    const r = { ...rows[rowIdx] }
    const cells = (r.cells || []).slice()
    const widths = colsToWidths(r.columns, cells.length)
    cells.splice(cellIdx, 1)
    widths.splice(cellIdx, 1)
    r.cells = cells; r.columns = widthsToColumns(widths.length ? widths : [100]); rows[rowIdx] = r
    saveRows(tabId, rows)
  }

  /** Parse columns string to array of percentage widths.
   *  Handles: '25% 10% 30%', '4fr 1fr 2fr', '1fr 1fr', etc. */
  const colsToWidths = (columns: string | undefined, cellCount: number): number[] => {
    const parts = (columns || '1fr').trim().split(/\s+/)
    // Detect format
    const isPct = parts.some(p => p.endsWith('%'))
    if (isPct) {
      return Array.from({ length: cellCount }, (_, i) => {
        const p = parts[i] || parts[parts.length - 1] || '25%'
        const m = p.match(/^([\d.]+)%$/)
        return m ? Math.round(parseFloat(m[1])) : 25
      })
    }
    // Convert fr to approximate percentages
    const frVals = parts.map(p => { const m = p.match(/^(\d+)fr$/); return m ? parseInt(m[1], 10) : 1 })
    const totalFr = frVals.reduce((a, b) => a + b, 0) || 1
    return Array.from({ length: cellCount }, (_, i) => {
      const fr = frVals[i] || frVals[frVals.length - 1] || 1
      return Math.max(1, Math.round(fr / totalFr * 100))
    })
  }
  const widthsToColumns = (widths: number[]): string => widths.map(w => `${Math.max(1, w)}%`).join(' ')
  const updateCellWidth = (tabId: string, rowIdx: number, cellIdx: number, width: number) => {
    const rows = ensureCustom(tabId).slice()
    const r = { ...rows[rowIdx] }
    const cells = r.cells || []
    const widths = colsToWidths(r.columns, cells.length)
    widths[cellIdx] = Math.max(1, Math.min(100, width))
    r.columns = widthsToColumns(widths); rows[rowIdx] = r
    saveRows(tabId, rows)
  }

  const useDsJs:any[] = asJs(props.useDataSources ?? ([] as any)) || []
  const primaryDsId = String(useDsJs?.[0]?.dataSourceId || '')
  const mapLayerOptions = React.useMemo(() => collectPageMapLayerOptions(cfg.useMapWidgetIds), [JSON.stringify(cfg.useMapWidgetIds || [])])
  const selectedMapLayerKey = React.useMemo(() => {
    const curUrl = normalizeLayerUrlForConfig(cfg.mapLayerUrl || '')
    const curId = String(cfg.mapLayerId || '')
    const curLayerId = String(cfg.mapLayerLayerId || '')
    const curTitle = String(cfg.mapLayerTitle || '')
    const found = mapLayerOptions.find(o =>
      (curId && o.id === curId) ||
      (curUrl && normalizeLayerUrlForConfig(o.url) === curUrl) ||
      (curLayerId && String(o.layerId) === curLayerId) ||
      (curTitle && o.title === curTitle)
    )
    return found?.key || ''
  }, [mapLayerOptions, cfg.mapLayerId, cfg.mapLayerUrl, cfg.mapLayerLayerId, cfg.mapLayerTitle])

  React.useEffect(() => {
    if (useDsJs.length > 0) {
      const snap = getSchemaSnapshot(primaryDsId)
      const nextCfg = toImmutableCfg(props.config || defaultConfig as any, {
        schemaLayerUrl: snap.url,
        schemaLayerLabel: snap.label,
        schemaFields: snap.fields
      })
      props.onSettingChange({ id:props.id, useDataSources: [] as any, useDataSourcesEnabled:false, config: nextCfg })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDsJs.length, primaryDsId])

  const onDsChange = (useDataSources: UseDataSource[]) => {
    const useDsJs:any[] = asJs(useDataSources ?? ([] as any)) || []
    const primaryDsId = String(useDsJs?.[0]?.dataSourceId || '')
    const snap = getSchemaSnapshot(primaryDsId)
    const nextCfg = toImmutableCfg(props.config || defaultConfig as any, {
      schemaLayerUrl: snap.url,
      schemaLayerLabel: snap.label,
      schemaFields: snap.fields
    })
    props.onSettingChange({ id:props.id, useDataSources: [] as any, useDataSourcesEnabled:false, config: nextCfg })
  }
  const onToggleDs = (_enabled: boolean) =>
    props.onSettingChange({ id:props.id, useDataSourcesEnabled: false })

  return (
    <div style={P.wrap}>

      {/* === DATASOURCE === */}
      <Acc id='datasource' label='📊 Datasource' open={isOpen('datasource')} onToggle={()=>toggle('datasource')}/>
      {isOpen('datasource') && <div>
        <div style={P.hint}>Seleziona il layer solo per acquisire schema e alias. Il widget li salva in config e rimuove le useDataSources legacy dall’istanza.</div>
        <div style={{ marginTop:10 }}>
          <DataSourceSelector
            widgetId={props.id}
            types={[DataSourceTypes.FeatureLayer] as any}
            isMultiple={false}
            useDataSources={[] as any}
            useDataSourcesEnabled={false as any}
            onToggleUseDataEnabled={onToggleDs}
            onChange={onDsChange}
            mustUseDataSource
          />
        </div>
      </div>}

      {/* === URL LAYER === */}
      <Acc id='sorgenti' label='🔗 URL Layer' open={isOpen('sorgenti')} onToggle={()=>toggle('sorgenti')}/>
      {isOpen('sorgenti') && <div>
        <label style={P.lbl}>URL Feature Layer madre <span style={{color:'#f87171'}}>*</span></label>
        <input type='text' value={cfg.motherLayerUrl} onChange={e=>set('motherLayerUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/0' style={P.inp}/>
        <div style={P.hint}>URL diretto al layer. Usato per addFeatures (nuova pratica) e updateFeatures (modifica).</div>
        <label style={P.lbl}>URL Tabella Audit Log <span style={{color:'#a0aec0'}}>(opzionale)</span></label>
        <input type='text' value={cfg.auditTableUrl} onChange={e=>set('auditTableUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/1' style={P.inp}/>
        <div style={P.hint}>Se valorizzato, ogni modifica viene tracciata campo per campo. Se vuoto il log viene saltato.</div>

        <label style={P.lbl}>Tabella import prezzari</label>
        <input type='text' value={cfg.nsImportPrezzariUrl || ''} onChange={e=>set('nsImportPrezzariUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/0' style={P.inp}/>
        <label style={P.lbl}>Tabella articoli prezzario regionale</label>
        <input type='text' value={cfg.nsPrezzarioRegionaleArticoliUrl || ''} onChange={e=>set('nsPrezzarioRegionaleArticoliUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/0' style={P.inp}/>
        <label style={P.lbl}>Tabella articoli prezzario interno</label>
        <input type='text' value={cfg.nsPrezzarioInternoArticoliUrl || ''} onChange={e=>set('nsPrezzarioInternoArticoliUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/0' style={P.inp}/>
        <label style={P.lbl}>Tabella Nuovi Prezzi</label>
        <input type='text' value={cfg.nsNuoviPrezziUrl || ''} onChange={e=>set('nsNuoviPrezziUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/0' style={P.inp}/>
        <label style={P.lbl}>Tabella dettaglio nota spese</label>
        <input type='text' value={cfg.nsNotaSpeseDettaglioUrl || ''} onChange={e=>set('nsNotaSpeseDettaglioUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/0' style={P.inp}/>
        <label style={P.lbl}>Tabella parametri nota spese</label>
        <input type='text' value={cfg.nsParametriUrl || ''} onChange={e=>set('nsParametriUrl',e.target.value)}
          placeholder='https://services2.arcgis.com/.../FeatureServer/0' style={P.inp}/>
        <label style={P.lbl}>Codice parametro spese generali</label>
        <input type='text' value={cfg.nsParametroCode || ''} onChange={e=>set('nsParametroCode',e.target.value)}
          placeholder='SPESE_GENERALI_PERC' style={P.inp}/>
        <div style={P.hint}>Usato dalla tab Nota spese del cw editing. Il widget TI legge gli articoli da prezzario regionale, prezzario interno o Nuovi Prezzi, salva gli snapshot in GII_NOTA_SPESE_DETTAGLIO e aggiorna subito i totali sul rapporto.</div>
      </div>}

      {/* === MODALITA === */}
      <Acc id='modalita' label='⚙ Modalità' open={isOpen('modalita')} onToggle={()=>toggle('modalita')}/>
      {isOpen('modalita') && <div>
        <label style={P.lbl}>Modalità di visualizzazione</label>
        <select value={cfg.displayMode} onChange={e=>set('displayMode',e.target.value)} style={P.inp}>
          <option value='page' style={{background:'#1a1f2e'}}>Pagina intera</option>
          <option value='overlay' style={{background:'#1a1f2e'}}>Overlay modal</option>
        </select>
        {cfg.displayMode==='page' && <>
          <label style={P.lbl}>Hash pagina di ritorno (tasto Annulla)</label>
          <input type='text' value={cfg.closePageHash} onChange={e=>set('closePageHash',e.target.value)}
            placeholder='elenco-pratiche' style={P.inp}/>
          <div style={P.hint}>L'utente viene reindirizzato a <code style={{color:'#93c5fd'}}>#{cfg.closePageHash}</code> quando clicca Annulla.</div>
        </>}
        <label style={P.chk}>
          <input type='checkbox' checked={!!cfg.showDatiGenerali} onChange={e=>set('showDatiGenerali', e.target.checked)}/>
          Mostra sezione "Dati generali" nel form nuova pratica
        </label>
        <div style={P.hint}>Se attivo, la tab Dati generali mostra tecnico, ufficio e data (read-only).</div>

        <div style={{marginTop:14, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginBottom:8}}>Colore sfondo per modalità</div>
          <div style={{display:'grid',gap:10}}>
            <div>
              <label style={P.lbl}>🟢 Nuovo rapporto</label>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.modeBgCreate||'') ? cfg.modeBgCreate : '#f0fdf4'}
                  onChange={e=>set('modeBgCreate',e.target.value)}
                  style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
                <input type='text' value={cfg.modeBgCreate||'#f0fdf4'} onChange={e=>set('modeBgCreate',e.target.value)}
                  placeholder='#f0fdf4' style={{...P.inp,flex:1,fontSize:11}}/>
              </div>
              <div style={P.hint}>Sfondo quando TI sta creando un nuovo rapporto.</div>
            </div>
            <div>
              <label style={P.lbl}>🔵 Modifica rapporto</label>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.modeBgEdit||'') ? cfg.modeBgEdit : '#eff6ff'}
                  onChange={e=>set('modeBgEdit',e.target.value)}
                  style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
                <input type='text' value={cfg.modeBgEdit||'#eff6ff'} onChange={e=>set('modeBgEdit',e.target.value)}
                  placeholder='#eff6ff' style={{...P.inp,flex:1,fontSize:11}}/>
              </div>
              <div style={P.hint}>Sfondo quando TI sta modificando un rapporto esistente.</div>
            </div>
          </div>
        </div>
      </div>}


      {/* === NUOVA PRATICA === */}
      <Acc id='nuova' label='🆕 Nuova pratica (inline)' open={isOpen('nuova')} onToggle={()=>toggle('nuova')}/>
      {isOpen('nuova') && <div>
        <label style={P.chk}>
          <input type='checkbox' checked={cfg.enableCreateWithoutSelection !== false} onChange={e=>set('enableCreateWithoutSelection', e.target.checked)}/>
          Abilita creazione senza selezione (pagina "Nuova pratica")
        </label>
        <div style={P.hint}>Se attivo, il widget entra in modalità CREATE quando non c&apos;è alcuna selezione nell&apos;Elenco.</div>

        <label style={P.lbl}>Pagina Modifica (slug)</label>
        <input type='text' value={cfg.editPageId || ''} onChange={e=>set('editPageId',e.target.value.trim())}
          style={{...P.inp, marginTop:4}} placeholder='es. Modifica-Rapporto'/>
        <div style={P.hint}>Slug della pagina ExB di modifica rapporto (come appare nell&apos;URL dopo /page/). Al salvataggio di un nuovo rapporto, l&apos;utente viene reindirizzato qui.</div>

        <label style={P.lbl}>Coordinate ufficio (WGS84)</label>
        <div style={{ display:'flex', gap: 10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ flex:'0 0 auto' }}>
            <div style={{ ...P.hint, marginTop: 0 }}>Lon</div>
            <input type='text' inputMode='decimal' value={formatCoordInput(cfg.officeLonWgs84)}
              onChange={e=>set('officeLonWgs84', parseCoordInput(e.target.value))} placeholder='es. 9.123456 o 9,123456' style={{...P.inp, width:160}}/>
          </div>
          <div style={{ flex:'0 0 auto' }}>
            <div style={{ ...P.hint, marginTop: 0 }}>Lat</div>
            <input type='text' inputMode='decimal' value={formatCoordInput(cfg.officeLatWgs84)}
              onChange={e=>set('officeLatWgs84', parseCoordInput(e.target.value))} placeholder='es. 39.123456 o 39,123456' style={{...P.inp, width:160}}/>
          </div>
        </div>
        <div style={P.hint}>Usate come geometria di default quando la localizzazione non è obbligatoria (req_point=0) e l&apos;utente non clicca in mappa. Accetta sia il punto sia la virgola come separatore decimale.</div>
      </div>}


      {/* === MAPPA === */}
      <Acc id='mappa' label='🗺 Mappa' open={isOpen('mappa')} onToggle={()=>toggle('mappa')}/>
      {isOpen('mappa') && <div>
        <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginTop:4,marginBottom:8}}>Mappa di pagina</div>
        <label style={P.lbl}>Widget Mappa di pagina</label>
        <div style={{ marginTop: 6 }}>
          <MapWidgetSelector
            onSelect={(ids: string[]) => setMany({ useMapWidgetIds: ids })}
            useMapWidgetIds={cfg.useMapWidgetIds}
          />
        </div>
        <div style={P.hint}>Seleziona il widget Mappa presente nella pagina. Il widget editing usa questa mappa per la localizzazione della violazione e per filtrare i punti dei rapporti.</div>

        <label style={{...P.lbl, marginTop: 12}}>Layer rapporti da filtrare nella mappa di pagina</label>
        <select
          value={selectedMapLayerKey}
          onChange={e => {
            const opt = mapLayerOptions.find(o => o.key === e.target.value)
            setMany({
              mapLayerTitle: opt?.title || '',
              mapLayerUrl: opt?.url || '',
              mapLayerId: opt?.id || '',
              mapLayerLayerId: opt?.layerId || ''
            })
          }}
          disabled={!Array.isArray(cfg.useMapWidgetIds) || cfg.useMapWidgetIds.length === 0 || mapLayerOptions.length === 0}
          style={{...P.inp, marginTop:4, background:'#1a1f2e', color:'#e5e7eb', colorScheme:'dark'}}
        >
          <option value='' style={{background:'#1a1f2e', color:'#e5e7eb'}}>{mapLayerOptions.length > 0 ? '— seleziona layer —' : '— nessun Feature Layer trovato —'}</option>
          {mapLayerOptions.map(opt => <option key={opt.key} value={opt.key} style={{background:'#1a1f2e', color:'#e5e7eb'}}>{formatMapLayerOption(opt)}</option>)}
        </select>
        <div style={P.hint}>La lista viene letta dalla WebMap collegata al widget mappa selezionato. La selezione valorizza titolo, URL, ID layer e layerId usati dal runtime per un matching robusto.</div>

        <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginTop:16,marginBottom:8}}>Mappa integrata nel widget (opzionale / alternativa)</div>
        <div style={P.hint}>Se configurata, la mappa viene caricata direttamente dentro il widget nel tab "Luoghi e dati tecnici" senza dipendere da un widget mappa esterno. Può restare vuota se si usa il widget mappa di pagina selezionato sopra.</div>
        <label style={{...P.lbl, marginTop: 8}}>Portal Item ID della WebMap integrata</label>
        <input type='text' value={cfg.embeddedMapPortalItem || ''} onChange={e=>set('embeddedMapPortalItem',e.target.value)}
          style={{...P.inp, marginTop:4}} placeholder='es. ebb5e0d0d2d649daa2e124bd96514245'/>
        <div style={P.hint}>L'ID della WebMap AGOL da caricare nella mappa integrata. Non viene usato per popolare la combo del layer della mappa di pagina.</div>
        <label style={{...P.lbl, marginTop: 8}}>Portal URL</label>
        <input type='text' value={cfg.embeddedMapPortalUrl || 'https://cbsm-hub.maps.arcgis.com'} onChange={e=>set('embeddedMapPortalUrl',e.target.value)}
          style={{...P.inp, marginTop:4}} placeholder='https://cbsm-hub.maps.arcgis.com'/>
        <div style={P.hint}>L'URL del portale ArcGIS Online. Per CBSM è https://cbsm-hub.maps.arcgis.com</div>
      </div>}


      {/* === ANTEPRIMA PDF === */}
      <Acc id='anteprimapdf' label='📄 Anteprima PDF' open={isOpen('anteprimapdf')} onToggle={()=>toggle('anteprimapdf')}/>
      {isOpen('anteprimapdf') && <div>
        <div style={P.hint}>Regola solo la distanza della finestra del viewer PDF nella scheda Anteprima. La barra superiore del widget resta invariata.</div>

        <label style={P.lbl}>Padding superiore viewer (px)</label>
        <input type='number' value={cfg.anteprimaPdfPaddingTop ?? 0} min={0} max={80}
          onChange={e=>set('anteprimaPdfPaddingTop', Number(e.target.value))} style={{...P.inp, width:90}}/>
        <div style={P.hint}>Distanza tra la barra del widget e il viewer PDF.</div>

        <label style={P.lbl}>Padding laterale viewer (px)</label>
        <input type='number' value={cfg.anteprimaPdfPaddingX ?? 0} min={0} max={80}
          onChange={e=>set('anteprimaPdfPaddingX', Number(e.target.value))} style={{...P.inp, width:90}}/>
        <div style={P.hint}>0 = viewer a filo in larghezza; usa lo stesso valore del padding esterno per ripristinare lo spazio laterale.</div>

        <label style={P.lbl}>Padding inferiore viewer (px)</label>
        <input type='number' value={cfg.anteprimaPdfPaddingBottom ?? 0} min={0} max={80}
          onChange={e=>set('anteprimaPdfPaddingBottom', Number(e.target.value))} style={{...P.inp, width:90}}/>
        <div style={P.hint}>0 = viewer abbassato fino al bordo inferiore; usa lo stesso valore del padding esterno per ripristinare lo spazio in basso.</div>

        <label style={P.lbl}>Raggio angoli inferiori viewer (px)</label>
        <input type='number' value={cfg.anteprimaPdfBottomRadius ?? 10} min={0} max={40}
          onChange={e=>set('anteprimaPdfBottomRadius', Number(e.target.value))} style={{...P.inp, width:90}}/>
        <div style={P.hint}>0 = nessun arrotondamento; valori tipici 8–12 px.</div>
      </div>}

      {/* === STILE FORM (label + intestazioni sezione + divisori) === */}
      <Acc id='stileform' label='🎨 Stile form' open={isOpen('stileform')} onToggle={()=>toggle('stileform')}/>
      {isOpen('stileform') && <div>

        <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginBottom:8}}>Label dei campi</div>
        <div style={P.hint}>Colore e dimensione delle etichette sopra ogni campo (es. Via, Città, Tecnico istruttore…)</div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
          <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.formLabelColor||'') ? cfg.formLabelColor : '#6b7280'}
            onChange={e=>set('formLabelColor',e.target.value)}
            style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
          <input type='text' value={cfg.formLabelColor||'#6b7280'} onChange={e=>set('formLabelColor',e.target.value)}
            placeholder='#6b7280' style={{...P.inp,flex:1,fontSize:11}}/>
        </div>
        <label style={P.lbl}>Dimensione font (px)</label>
        <input type='number' value={cfg.formLabelFontSize??12} min={9} max={18}
          onChange={e=>set('formLabelFontSize', Number(e.target.value))} style={{...P.inp, width:80}}/>

        <div style={{marginTop:16,borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginBottom:8}}>Campi (input, select, textarea)</div>
          <div style={P.hint}>Dimensione del testo nei campi di input del form.</div>
          <label style={P.lbl}>Dimensione font (px)</label>
          <input type='number' value={cfg.formFieldFontSize??13} min={9} max={18}
            onChange={e=>set('formFieldFontSize', Number(e.target.value))} style={{...P.inp, width:80}}/>
        </div>

        <div style={{marginTop:16,borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginBottom:8}}>Intestazioni di sezione</div>
          <div style={P.hint}>Colore e dimensione dei titoli di gruppo (es. Trasgressore, Art. 15, Descrizione…)</div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
            <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.sectionHeaderColor||'') ? cfg.sectionHeaderColor : '#1d4ed8'}
              onChange={e=>set('sectionHeaderColor',e.target.value)}
              style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
            <input type='text' value={cfg.sectionHeaderColor||'#1d4ed8'} onChange={e=>set('sectionHeaderColor',e.target.value)}
              placeholder='#1d4ed8' style={{...P.inp,flex:1,fontSize:11}}/>
          </div>
          <label style={P.lbl}>Dimensione font (px)</label>
          <input type='number' value={cfg.sectionHeaderFontSize??11} min={9} max={18}
            onChange={e=>set('sectionHeaderFontSize', Number(e.target.value))} style={{...P.inp, width:80}}/>
        </div>

        <div style={{marginTop:16,borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:'#93c5fd',marginBottom:8}}>Divisori tra sezioni</div>
          <div style={P.hint}>Colore e spessore della linea sotto ogni intestazione (Art. 15, Art. 16-17…)</div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
            <input type='color' value={/^#[0-9a-fA-F]{3,8}$/.test(cfg.sectionDividerColor||'') ? cfg.sectionDividerColor : '#bfdbfe'}
              onChange={e=>set('sectionDividerColor',e.target.value)}
              style={{width:30,height:26,padding:2,border:'1px solid rgba(255,255,255,0.15)',borderRadius:5,cursor:'pointer',background:'transparent',flexShrink:0}}/>
            <input type='text' value={cfg.sectionDividerColor||'#bfdbfe'} onChange={e=>set('sectionDividerColor',e.target.value)}
              placeholder='#bfdbfe' style={{...P.inp,flex:1,fontSize:11}}/>
          </div>
          <label style={P.lbl}>Spessore (px)</label>
          <input type='number' value={cfg.sectionDividerWidth??2} min={0} max={6}
            onChange={e=>set('sectionDividerWidth', Number(e.target.value))} style={{...P.inp, width:80}}/>
        </div>

        <div style={{marginTop:14,padding:10,borderRadius:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
          <div style={{fontSize:10.5,fontWeight:600,color:'#93c5fd',marginBottom:6}}>Anteprima</div>
          <div style={{background:'#fff',borderRadius:6,padding:10}}>
            <div style={{fontSize:cfg.sectionHeaderFontSize??11,fontWeight:700,color:cfg.sectionHeaderColor||'#1d4ed8',textTransform:'uppercase',letterSpacing:1,borderBottom:`${cfg.sectionDividerWidth??2}px solid ${cfg.sectionDividerColor||'#bfdbfe'}`,paddingBottom:4,marginBottom:8}}>
              Trasgressore
            </div>
            <div style={{fontSize:cfg.formLabelFontSize??12,color:cfg.formLabelColor||'#6b7280',marginBottom:4}}>Tipologia soggetto</div>
            <div style={{padding:'5px 8px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',fontSize:12,color:'#9ca3af'}}>— seleziona —</div>
            <div style={{fontSize:cfg.formLabelFontSize??12,color:cfg.formLabelColor||'#6b7280',marginBottom:4,marginTop:8}}>Via</div>
            <div style={{padding:'5px 8px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',fontSize:12,color:'#374151'}}>Via Roma 1</div>
          </div>
        </div>
      </div>}


      {/* === LAYOUT CAMPI === */}
      <Acc id='layout' label='📐 Layout campi' open={isOpen('layout')} onToggle={()=>toggle('layout')}/>
      {isOpen('layout') && <div>
        <div style={P.hint}>Configura la disposizione dei campi in ogni tab. Ogni riga può essere un&apos;intestazione, un blocco di campi o un elemento speciale.
          Per le righe campi: <b>columns</b> accetta qualsiasi valore CSS grid-template-columns (es. <code>1fr 1fr</code>, <code>30% 40px 30%</code>, <code>200px 1fr</code>).
          Le celle vuote (spacer) mantengono il posto nel grid.</div>

        <label style={P.lbl}>Gap tra campi (px)</label>
        <input type='number' value={cfg.fieldGap??12} min={0} max={40}
          onChange={e=>set('fieldGap', Number(e.target.value))} style={{...P.inp, width:80}}/>

        <div style={{display:'flex', gap:4, marginTop:14, marginBottom:10}}>
          {LAYOUT_TABS.map(t => (
            <button key={t} type='button' onClick={()=>setLayoutTab(t)} style={{
              padding:'5px 12px', borderRadius:6, border:`1px solid ${layoutTab===t?'#60a5fa':'rgba(255,255,255,0.12)'}`,
              background: layoutTab===t?'rgba(96,165,250,0.15)':'transparent',
              color: layoutTab===t?'#93c5fd':'#9ca3af', fontSize:11, fontWeight:700, cursor:'pointer', textTransform:'capitalize'
            }}>{t.replace(/_/g,' ')}</button>
          ))}
        </div>

        <div style={{fontSize:10.5, color: isCustom(layoutTab)?'#86efac':'#a0aec0', marginBottom:8}}>
          {isCustom(layoutTab) ? '✎ Layout personalizzato' : '○ Layout predefinito (modifica per personalizzare)'}
        </div>

        {/* Row list */}
        <div style={{display:'grid', gap:6}}>
          {getRows(layoutTab).map((row: any, ri: number) => {
            const rows = getRows(layoutTab)
            const rowSty: React.CSSProperties = {padding:'8px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.10)', background:'rgba(255,255,255,0.03)'}
            const smBtn = (label: string, onClick: ()=>void, color?: string): any => (
              <button type='button' onClick={onClick} style={{padding:'2px 6px', borderRadius:4, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color: color||'#9ca3af', fontSize:10, cursor:'pointer', lineHeight:1}}>{label}</button>
            )

            return (
              <div key={ri} style={rowSty}>
                {/* Row header bar */}
                <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:6}}>
                  <span style={{fontSize:10, color:'#6b7280', fontWeight:600, minWidth:20}}>#{ri+1}</span>
                  <select value={row.type} onChange={e=>{
                    const t = e.target.value
                    if (t === 'header') updateRow(layoutTab, ri, {type:'header', label: row.label||'Sezione', cells:undefined, columns:undefined, id:undefined})
                    else if (t === 'special') updateRow(layoutTab, ri, {type:'special', id: SPECIAL_OPTS[0]?.v||'', label:undefined, cells:undefined, columns:undefined})
                    else updateRow(layoutTab, ri, {type:'fields', columns: row.columns||'1fr', cells: row.cells||[{}], label:undefined, id:undefined})
                  }} style={{...P.inp, width:90, fontSize:10, padding:'2px 4px'}}>
                    <option value='header'>Intestazione</option>
                    <option value='fields'>Campi</option>
                    <option value='special'>Speciale</option>
                  </select>
                  <div style={{flex:1}}/>
                  {smBtn('▲', ()=>moveRow(layoutTab, ri, -1))}
                  {smBtn('▼', ()=>moveRow(layoutTab, ri, 1))}
                  {smBtn('✕', ()=>removeRow(layoutTab, ri), '#fca5a5')}
                </div>

                {/* Row body by type */}
                {row.type === 'header' && (
                  <input type='text' value={row.label||''} onChange={e=>updateRow(layoutTab, ri, {label:e.target.value})}
                    placeholder='Titolo sezione' style={{...P.inp, fontSize:11}}/>
                )}

                {row.type === 'special' && (
                  <select value={row.id||''} onChange={e=>updateRow(layoutTab, ri, {id:e.target.value})}
                    style={{...P.inp, fontSize:11}}>
                    {SPECIAL_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                )}

                {row.type === 'fields' && (() => {
                  const cells: any[] = row.cells || []
                  const widths = colsToWidths(row.columns, cells.length)
                  const fieldLabel = (fv: string) => (FIELD_OPTS[layoutTab] || []).find(o => o.v === fv)?.l || fv || 'spacer'
                  return (
                  <div>
                    {/* Visual proportional bar */}
                    <div style={{display:'flex', gap:1, marginBottom:8, borderRadius:4, overflow:'hidden', height:22}}>
                      {cells.map((_c: any, ci: number) => {
                        const fld = cells[ci]?.field
                        return <div key={ci} style={{width:`${widths[ci]}%`, flexShrink:0, background: fld ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color: fld ? '#93c5fd' : '#6b7280', overflow:'hidden', whiteSpace:'nowrap', padding:'0 2px', borderRight:'1px solid rgba(0,0,0,0.3)'}}>
                          {fld ? fieldLabel(fld).substring(0, 8) : '·'} <span style={{opacity:0.5, marginLeft:2}}>{widths[ci]}%</span>
                        </div>
                      })}
                    </div>
                    {/* Cell editors */}
                    <div style={{display:'grid', gap:4}}>
                      {cells.map((cell: any, ci: number) => (
                        <div key={ci} style={{display:'flex', alignItems:'center', gap:4}}>
                          <span style={{fontSize:9, color:'#6b7280', minWidth:14}}>{ci+1}.</span>
                          <select value={cell?.field||''} onChange={e=>updateCell(layoutTab, ri, ci, e.target.value)}
                            style={{...P.inp, flex:1, fontSize:10, padding:'2px 4px', color: cell?.field?'#e5e7eb':'#6b7280'}}>
                            <option value=''>— spacer —</option>
                            {(FIELD_OPTS[layoutTab]||[]).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                          <input type='number' min={1} max={100} step={1} value={widths[ci]} onChange={e=>updateCellWidth(layoutTab, ri, ci, Number(e.target.value))}
                            style={{...P.inp, width:48, fontSize:10, padding:'2px 4px', textAlign:'center'}} title={`${widths[ci]}%`}/>
                          <span style={{fontSize:9, color:'#9ca3af'}}>%</span>
                          {smBtn('✕', ()=>removeCell(layoutTab, ri, ci), '#fca5a5')}
                        </div>
                      ))}
                    </div>
                    <button type='button' onClick={()=>addCell(layoutTab, ri)}
                      style={{marginTop:4, padding:'2px 8px', borderRadius:4, border:'1px dashed rgba(255,255,255,0.15)', background:'transparent', color:'#60a5fa', fontSize:10, cursor:'pointer'}}>
                      + cella
                    </button>
                  </div>
                  )
                })()}
              </div>
            )
          })}
        </div>

        {/* Add row */}
        <div style={{display:'flex', gap:6, marginTop:10}}>
          <button type='button' onClick={()=>addRow(layoutTab,'fields')} style={{padding:'4px 10px', borderRadius:5, border:'1px dashed rgba(96,165,250,0.4)', background:'transparent', color:'#60a5fa', fontSize:10.5, cursor:'pointer', fontWeight:600}}>
            + Riga campi
          </button>
          <button type='button' onClick={()=>addRow(layoutTab,'header')} style={{padding:'4px 10px', borderRadius:5, border:'1px dashed rgba(96,165,250,0.4)', background:'transparent', color:'#60a5fa', fontSize:10.5, cursor:'pointer', fontWeight:600}}>
            + Intestazione
          </button>
          <button type='button' onClick={()=>addRow(layoutTab,'special')} style={{padding:'4px 10px', borderRadius:5, border:'1px dashed rgba(96,165,250,0.4)', background:'transparent', color:'#60a5fa', fontSize:10.5, cursor:'pointer', fontWeight:600}}>
            + Speciale
          </button>
        </div>

        {/* Reset */}
        {isCustom(layoutTab) && (
          <button type='button' onClick={()=>{if(window.confirm('Ripristinare il layout predefinito per questa tab?')) resetTab(layoutTab)}}
            style={{marginTop:10, padding:'4px 10px', borderRadius:5, border:'1px solid rgba(252,165,165,0.3)', background:'rgba(239,68,68,0.08)', color:'#fca5a5', fontSize:10.5, cursor:'pointer', fontWeight:600}}>
            ↺ Ripristina predefiniti per {layoutTab.replace(/_/g,' ')}
          </button>
        )}
      </div>}


      {/* === RESET === */}
      <div style={{marginTop:28, borderTop:'1px solid rgba(255,255,255,0.10)', paddingTop:16}}>
        <button type='button'
          onClick={()=>{ if(window.confirm('Ripristinare i valori predefiniti?')) props.onSettingChange({id:props.id, config:defaultConfig as any}) }}
          style={{padding:'6px 14px', borderRadius:7, border:'1px solid rgba(252,165,165,0.4)', background:'rgba(239,68,68,0.10)', color:'#fca5a5', fontSize:12, cursor:'pointer', fontWeight:600}}>
          ↺ Ripristina predefiniti
        </button>
      </div>

    </div>
  )
}

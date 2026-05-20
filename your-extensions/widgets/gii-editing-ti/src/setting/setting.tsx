/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, DataSourceTypes, DataSourceManager, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { MapWidgetSelector } from 'jimu-ui/advanced/setting-components'
import type { IMConfig } from '../config'
import { defaultConfig, DEFAULT_FIELD_LAYOUTS } from '../config'

type FieldOpt = { name: string; alias: string; type?: string }
type Opt = { v: string; l: string }

function asJs<T=any>(v:any):T { return v?.asMutable ? v.asMutable({ deep: true }) : v }

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
  return String(v).trim()
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

const P = {
  wrap: { padding:'0 12px 34px', fontSize:13, background:'#111827', minHeight:'100%', color:'#e5e7eb', overflowY:'auto' as const, overflowX:'hidden' as const, boxSizing:'border-box' as const, maxWidth:'100%' } as React.CSSProperties,
  sec: { fontSize:12, fontWeight:800, color:'#bfdbfe', textTransform:'uppercase' as const, letterSpacing:0.9, borderBottom:'1px solid rgba(255,255,255,0.14)', padding:'10px 0 8px', margin:'18px 0 12px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' } as React.CSSProperties,
  box: { border:'1px solid rgba(255,255,255,0.10)', background:'rgba(255,255,255,0.045)', borderRadius:10, padding:10, marginBottom:12, boxSizing:'border-box' as const, maxWidth:'100%' } as React.CSSProperties,
  grid2: { display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8, minWidth:0 } as React.CSSProperties,
  grid3: { display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8, minWidth:0 } as React.CSSProperties,
  lbl: { fontSize:12, fontWeight:700, color:'#d1d5db', display:'block', marginBottom:5, marginTop:10, overflowWrap:'anywhere' as const, lineHeight:1.25 } as React.CSSProperties,
  hint: { fontSize:11.5, color:'#9ca3af', marginTop:4, lineHeight:1.45 } as React.CSSProperties,
  inp: { width:'100%', maxWidth:'100%', height:31, padding:'4px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.17)', borderRadius:7, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.075)', color:'#e5e7eb', minWidth:0 } as React.CSSProperties,
  mini: { width:'100%', maxWidth:'100%', height:28, padding:'3px 7px', fontSize:11.5, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, background:'rgba(255,255,255,0.07)', color:'#e5e7eb', boxSizing:'border-box' as const, minWidth:0 } as React.CSSProperties,
  chk: { display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:'#d1d5db', cursor:'pointer', marginTop:10 } as React.CSSProperties,
  btn: { padding:'5px 10px', borderRadius:7, border:'1px solid rgba(96,165,250,0.38)', background:'rgba(96,165,250,0.10)', color:'#93c5fd', fontSize:12, cursor:'pointer', fontWeight:700 } as React.CSSProperties,
  dangerBtn: { padding:'5px 10px', borderRadius:7, border:'1px solid rgba(252,165,165,0.38)', background:'rgba(239,68,68,0.08)', color:'#fca5a5', fontSize:12, cursor:'pointer', fontWeight:700 } as React.CSSProperties,
}

function Acc(p: { id:string; label:string; open:boolean; onToggle:()=>void }) {
  return <div style={P.sec} onClick={p.onToggle}><span>{p.label}</span><span style={{ fontSize:11, color:'#9ca3af' }}>{p.open ? '▲' : '▼'}</span></div>
}

function SectionBox(p: { title?: string; hint?: string; children: React.ReactNode }) {
  return <div style={P.box}>{p.title && <div style={{fontSize:12,fontWeight:800,color:'#93c5fd',marginBottom:6}}>{p.title}</div>}{p.hint && <div style={{...P.hint,marginTop:0,marginBottom:8}}>{p.hint}</div>}{p.children}</div>
}

const colorValue = (v:any, fallback:string) => /^#[0-9a-fA-F]{3,8}$/.test(String(v || '')) ? String(v) : fallback

const MODERN_PALETTE = {
  modeBgCreate: '#ecfdf5',
  modeBgEdit: '#edf5ff',
  maskBg: '#eef4fb',
  maskBorderColor: '#cbd8e6',
  dividerColor: '#cbd8e6',
  formLabelColor: '#334155',
  formFieldBg: '#f8fbff',
  formFieldColor: '#0f172a',
  formFieldBorderColor: '#bfcede',
  formFieldDisabledBg: '#e7eef7',
  formFieldDisabledColor: '#64748b',
  formCardBg: '#f8fbff',
  formCardBorderColor: '#c6d7ea',
  formCardBorderRadius: 8,
  formCardShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
  formCardHeaderBg: 'linear-gradient(90deg, #0d3b66, #155e9d)',
  formCardHeaderColor: '#ffffff',
  sectionHeaderColor: '#0f4c81',
  sectionDividerColor: '#93c5fd',
  violazioneSplitterColor: '#94a3b8'
}

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...asJs(props.config) }
  const [openSec, setOpenSec] = React.useState<string>('datasource')
  const [layoutTab, setLayoutTab] = React.useState<string>('violazione')
  const toggle = (id:string) => setOpenSec(s => s === id ? '' : id)
  const isOpen = (id:string) => openSec === id

  const set = (key:string, value:any) => {
    const base = props.config || defaultConfig as any
    props.onSettingChange({ id: props.id, config: base?.set ? base.set(key, value) : { ...cfg, [key]: value } as any })
  }
  const setMany = (patch: Record<string, any>) => {
    const base = props.config || defaultConfig as any
    props.onSettingChange({ id: props.id, config: toImmutableCfg(base, patch) })
  }

  const Num = (p:{ k:string; label:string; min?:number; max?:number; step?:number; width?:number; hint?:string }) => (
    <div>
      <label style={P.lbl}>{p.label}</label>
      <input type='number' min={p.min} max={p.max} step={p.step ?? 1} value={cfg[p.k] ?? (defaultConfig as any)[p.k] ?? 0}
        onChange={e => set(p.k, Number(e.target.value))} style={{...P.inp, width:p.width || '100%'}}/>
      {p.hint && <div style={P.hint}>{p.hint}</div>}
    </div>
  )
  const Text = (p:{ k:string; label:string; placeholder?:string; hint?:string }) => (
    <div>
      <label style={P.lbl}>{p.label}</label>
      <input type='text' value={cfg[p.k] ?? ''} placeholder={p.placeholder || ''} onChange={e => set(p.k, e.target.value)} style={P.inp}/>
      {p.hint && <div style={P.hint}>{p.hint}</div>}
    </div>
  )
  const Color = (p:{ k:string; label:string; fallback:string; hint?:string; allowText?:boolean }) => {
    const pickerValue = colorValue(cfg[p.k], p.fallback)
    return (
      <div>
        <label style={P.lbl}>{p.label}</label>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <input
            key={`${p.k}-${pickerValue}`}
            type='color'
            defaultValue={pickerValue}
            onBlur={e => set(p.k, e.currentTarget.value)}
            style={{width:34,height:30,padding:2,border:'1px solid rgba(255,255,255,0.18)',borderRadius:6,background:'transparent',flexShrink:0}}
          />
          <input type='text' value={cfg[p.k] ?? ''} onChange={e => set(p.k, e.target.value)} placeholder={p.fallback} style={{...P.inp, flex:1, minWidth:0}}/>
        </div>
        {p.hint && <div style={P.hint}>{p.hint}</div>}
      </div>
    )
  }
  const Toggle = (p:{ k:string; label:string; hint?:string }) => (
    <label style={P.chk}><input type='checkbox' checked={!!cfg[p.k]} onChange={e => set(p.k, e.target.checked)}/><span>{p.label}</span>{p.hint && <span style={{...P.hint,marginTop:0}}>{p.hint}</span>}</label>
  )

  const FIELD_OPTS: Record<string, Opt[]> = {
    dati_generali: [
      {v:'area_cod',l:'Area'}, {v:'settore_cod',l:'Settore'}, {v:'ufficio_zona',l:'Ufficio di zona'},
      {v:'tecnico_rilevatore',l:'Tecnico rilevatore'}, {v:'data_rilevazione',l:'Data rilevazione'}, {v:'ti_assegnato_nome',l:'Tecnico istruttore'}, {v:'data_firma',l:'Data compilazione'}
    ],
    trasgressore: [
      {v:'tipologia_soggetto',l:'Tipologia soggetto'}, {v:'qualifica_fondo',l:'Qualifica fondo'},
      {v:'nome',l:'Nome'}, {v:'cognome',l:'Cognome'}, {v:'codice_fiscale',l:'Codice fiscale'},
      {v:'ragione_sociale',l:'Ragione sociale'}, {v:'piva',l:'P. IVA'},
      {v:'via',l:'Via'}, {v:'civico',l:'N. civico'}, {v:'citta',l:'Città'}, {v:'cap',l:'CAP'},
      {v:'telefono',l:'Telefono'}, {v:'cellulare',l:'Cellulare'}, {v:'email',l:'E-mail'}, {v:'pec',l:'PEC'},
      {v:'dom_notifica_uguale',l:'Domicilio coincide'}, {v:'dom_notifica_via',l:'Dom. via'}, {v:'dom_notifica_civico',l:'Dom. civico'}, {v:'dom_notifica_citta',l:'Dom. città'}, {v:'dom_notifica_cap',l:'Dom. CAP'},
      {v:'rl_nome',l:'RL nome'}, {v:'rl_cognome',l:'RL cognome'}, {v:'rl_cf',l:'RL CF'}, {v:'rl_carica',l:'RL carica'},
      {v:'rl_dom_notifica',l:'RL domicilio notifiche'}, {v:'rl_dom_via',l:'RL dom. via'}, {v:'rl_dom_civico',l:'RL dom. civico'}, {v:'rl_dom_citta',l:'RL dom. città'}, {v:'rl_dom_cap',l:'RL dom. CAP'},
      {v:'note_anagrafica',l:'Note trasgressore'}
    ],
    dati_tecnici: [
      {v:'descrizione_luogo',l:'Descrizione luogo'}, {v:'distretto',l:'Distretto'}, {v:'comizio',l:'Comizio'}, {v:'idrante',l:'Idrante'},
      {v:'matricola_contatore',l:'Matricola contatore'}, {v:'matricola_tessera',l:'Matricola tessera'}
    ]
  }
  const SPECIAL_OPTS: Opt[] = [
    {v:'_dati_gen_label',l:'Etichetta dati generali'},
    {v:'_localizzazione',l:'Pannello localizzazione'},
    {v:'_header_rappresentante_legale',l:'Header rappresentante legale (PG)'}
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
    const rows = ensureCustom(tabId).slice(); rows[idx] = { ...rows[idx], ...patch }; saveRows(tabId, rows)
  }
  const addRow = (tabId: string, type: string) => {
    const rows = ensureCustom(tabId).slice()
    if (type === 'header') rows.push({ type:'header', label:'Nuova sezione' })
    else if (type === 'special') rows.push({ type:'special', id: SPECIAL_OPTS[0].v })
    else rows.push({ type:'fields', columns:'1fr', cells:[{}] })
    saveRows(tabId, rows)
  }
  const removeRow = (tabId: string, idx: number) => { const rows = ensureCustom(tabId).slice(); rows.splice(idx, 1); saveRows(tabId, rows) }
  const moveRow = (tabId: string, idx: number, dir: -1|1) => {
    const rows = ensureCustom(tabId).slice(); const ni = idx + dir
    if (ni < 0 || ni >= rows.length) return
    ;[rows[idx], rows[ni]] = [rows[ni], rows[idx]]; saveRows(tabId, rows)
  }
  const colsToWidths = (columns: string | undefined, cellCount: number): number[] => {
    const parts = (columns || '1fr').trim().split(/\s+/)
    const isPct = parts.some(p => p.endsWith('%'))
    if (isPct) return Array.from({length:cellCount}, (_, i) => { const m=(parts[i]||parts[parts.length-1]||'100%').match(/^([\d.]+)%$/); return m ? Math.round(parseFloat(m[1])) : 25 })
    const frVals = parts.map(p => { const m=p.match(/^(\d+)fr$/); return m ? parseInt(m[1], 10) : 1 })
    const total = frVals.reduce((a,b)=>a+b,0)||1
    return Array.from({length:cellCount}, (_, i) => Math.max(1, Math.round((frVals[i] || frVals[frVals.length-1] || 1) / total * 100)))
  }
  const widthsToColumns = (widths: number[]): string => widths.map(w => `${Math.max(1, Math.min(100, w))}%`).join(' ')
  const updateCell = (tabId: string, rowIdx: number, cellIdx: number, field: string) => {
    const rows = ensureCustom(tabId).slice(); const r={...rows[rowIdx]}; const cells=(r.cells||[]).slice(); cells[cellIdx]=field?{...(cells[cellIdx]||{}), field}:{label:cells[cellIdx]?.label}; r.cells=cells; rows[rowIdx]=r; saveRows(tabId, rows)
  }
  const updateCellLabel = (tabId: string, rowIdx: number, cellIdx: number, label: string) => {
    const rows = ensureCustom(tabId).slice(); const r={...rows[rowIdx]}; const cells=(r.cells||[]).slice(); cells[cellIdx]={...(cells[cellIdx]||{}), label}; r.cells=cells; rows[rowIdx]=r; saveRows(tabId, rows)
  }
  const addCell = (tabId: string, rowIdx: number) => {
    const rows=ensureCustom(tabId).slice(); const r={...rows[rowIdx]}; const cells=(r.cells||[]).slice(); const widths=colsToWidths(r.columns,cells.length); cells.push({}); widths.push(25); r.cells=cells; r.columns=widthsToColumns(widths); rows[rowIdx]=r; saveRows(tabId, rows)
  }
  const removeCell = (tabId: string, rowIdx: number, cellIdx: number) => {
    const rows=ensureCustom(tabId).slice(); const r={...rows[rowIdx]}; const cells=(r.cells||[]).slice(); const widths=colsToWidths(r.columns,cells.length); cells.splice(cellIdx,1); widths.splice(cellIdx,1); r.cells=cells; r.columns=widthsToColumns(widths.length?widths:[100]); rows[rowIdx]=r; saveRows(tabId, rows)
  }
  const updateCellWidth = (tabId: string, rowIdx: number, cellIdx: number, width: number) => {
    const rows=ensureCustom(tabId).slice(); const r={...rows[rowIdx]}; const cells=r.cells||[]; const widths=colsToWidths(r.columns,cells.length); widths[cellIdx]=Math.max(1, Math.min(100, width)); r.columns=widthsToColumns(widths); rows[rowIdx]=r; saveRows(tabId, rows)
  }

  const useDsJs:any[] = asJs(props.useDataSources ?? ([] as any)) || []
  const primaryDsId = String(useDsJs?.[0]?.dataSourceId || '')
  React.useEffect(() => {
    if (useDsJs.length > 0) {
      const snap = getSchemaSnapshot(primaryDsId)
      const nextCfg = toImmutableCfg(props.config || defaultConfig as any, { schemaLayerUrl: snap.url, schemaLayerLabel: snap.label, schemaFields: snap.fields })
      props.onSettingChange({ id:props.id, useDataSources: [] as any, useDataSourcesEnabled:false, config: nextCfg })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDsJs.length, primaryDsId])
  const onDsChange = (useDataSources: UseDataSource[]) => {
    const dsArr:any[] = asJs(useDataSources ?? ([] as any)) || []
    const dsId = String(dsArr?.[0]?.dataSourceId || '')
    const snap = getSchemaSnapshot(dsId)
    const nextCfg = toImmutableCfg(props.config || defaultConfig as any, { schemaLayerUrl: snap.url, schemaLayerLabel: snap.label, schemaFields: snap.fields })
    props.onSettingChange({ id:props.id, useDataSources: [] as any, useDataSourcesEnabled:false, config: nextCfg })
  }

  const renderGenericLayoutEditor = (tabId: string) => (
    <div>
      <div style={{...P.hint, marginBottom:8}}>Modifica righe, colonne, larghezze e etichette visualizzate della scheda selezionata.</div>
      <div style={{display:'grid', gap:8}}>
        {getRows(tabId).map((row:any, ri:number) => {
          const cells:any[] = row.cells || []
          const widths = colsToWidths(row.columns, cells.length || 1)
          return <div key={ri} style={{border:'1px solid rgba(255,255,255,0.12)',borderRadius:9,padding:10,background:'rgba(255,255,255,0.035)'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
              <span style={{fontSize:11,color:'#9ca3af',fontWeight:800,minWidth:24}}>#{ri+1}</span>
              <select value={row.type} onChange={e => {
                const t=e.target.value
                if (t==='header') updateRow(tabId, ri, {type:'header', label:row.label||'Sezione', cells:undefined, columns:undefined, id:undefined})
                else if (t==='special') updateRow(tabId, ri, {type:'special', id:SPECIAL_OPTS[0].v, label:undefined, cells:undefined, columns:undefined})
                else updateRow(tabId, ri, {type:'fields', columns:row.columns||'1fr', cells:row.cells||[{}], label:undefined, id:undefined})
              }} style={{...P.mini, width:120}}>
                <option value='header'>Intestazione</option><option value='fields'>Campi</option><option value='special'>Speciale</option>
              </select>
              <div style={{flex:1}}/>
              <button type='button' style={P.btn} onClick={()=>moveRow(tabId, ri, -1)}>▲</button>
              <button type='button' style={P.btn} onClick={()=>moveRow(tabId, ri, 1)}>▼</button>
              <button type='button' style={P.dangerBtn} onClick={()=>removeRow(tabId, ri)}>✕</button>
            </div>
            {row.type === 'header' && <input type='text' value={row.label||''} onChange={e=>updateRow(tabId,ri,{label:e.target.value})} placeholder='Titolo sezione' style={P.inp}/>} 
            {row.type === 'special' && <select value={row.id||''} onChange={e=>updateRow(tabId,ri,{id:e.target.value})} style={P.inp}>{SPECIAL_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>}
            {row.type === 'fields' && <div style={{display:'grid',gap:7}}>
              {cells.map((cell:any, ci:number) => <div key={ci} style={{display:'grid',gridTemplateColumns:'1.1fr 0.9fr 70px 34px',gap:6,alignItems:'center'}}>
                <select value={cell?.field||''} onChange={e=>updateCell(tabId,ri,ci,e.target.value)} style={P.mini}>
                  <option value=''>— spazio vuoto —</option>{(FIELD_OPTS[tabId]||[]).map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <input type='text' value={cell?.label||''} onChange={e=>updateCellLabel(tabId,ri,ci,e.target.value)} placeholder='Etichetta personalizzata' style={P.mini}/>
                <input type='number' min={1} max={100} value={widths[ci]||100} onChange={e=>updateCellWidth(tabId,ri,ci,Number(e.target.value))} style={{...P.mini,textAlign:'center'}}/>
                <button type='button' style={P.dangerBtn} onClick={()=>removeCell(tabId,ri,ci)}>✕</button>
              </div>)}
              <button type='button' style={{...P.btn,width:'fit-content'}} onClick={()=>addCell(tabId,ri)}>+ Cella</button>
            </div>}
          </div>
        })}
      </div>
      <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
        <button type='button' style={P.btn} onClick={()=>addRow(tabId,'fields')}>+ Riga campi</button>
        <button type='button' style={P.btn} onClick={()=>addRow(tabId,'header')}>+ Intestazione</button>
        <button type='button' style={P.btn} onClick={()=>addRow(tabId,'special')}>+ Speciale</button>
        {isCustom(tabId) && <button type='button' style={P.dangerBtn} onClick={()=>{ if(window.confirm('Ripristinare il layout predefinito della scheda?')) resetTab(tabId) }}>↺ Ripristina scheda</button>}
      </div>
    </div>
  )

  return <div style={P.wrap}>
    <Acc id='datasource' label='1. Datasource e schema' open={isOpen('datasource')} onToggle={()=>toggle('datasource')}/>
    {isOpen('datasource') && <SectionBox hint='Seleziona il layer solo per acquisire schema e alias. Le useDataSources legacy vengono rimosse dall’istanza.'>
      <DataSourceSelector widgetId={props.id} types={[DataSourceTypes.FeatureLayer] as any} isMultiple={false} useDataSources={[] as any} useDataSourcesEnabled={false as any} onToggleUseDataEnabled={() => props.onSettingChange({ id:props.id, useDataSourcesEnabled:false })} onChange={onDsChange} mustUseDataSource />
      <div style={{...P.hint,marginTop:10}}>Schema salvato: <b>{cfg.schemaLayerLabel || '—'}</b></div>
    </SectionBox>}

    <Acc id='sorgenti' label='2. Layer, tabelle e pagine' open={isOpen('sorgenti')} onToggle={()=>toggle('sorgenti')}/>
    {isOpen('sorgenti') && <>
      <SectionBox title='Feature layer e tabelle'>
        <Text k='motherLayerUrl' label='URL Feature Layer madre' placeholder='https://services2.arcgis.com/.../FeatureServer/0'/>
        <Text k='auditTableUrl' label='URL Tabella Audit Log'/>
        <Text k='nsImportPrezzariUrl' label='Tabella import prezzari'/>
        <Text k='nsPrezzarioRegionaleArticoliUrl' label='Tabella articoli prezzario regionale'/>
        <Text k='nsPrezzarioInternoArticoliUrl' label='Tabella articoli prezzario interno'/>
        <Text k='nsNuoviPrezziUrl' label='Tabella Nuovi Prezzi'/>
        <Text k='nsNotaSpeseDettaglioUrl' label='Tabella dettaglio nota spese'/>
        <Text k='nsParametriUrl' label='Tabella parametri nota spese'/>
        <Text k='nsParametroCode' label='Codice parametro spese generali' placeholder='SPESE_GENERALI_PERC'/>
      </SectionBox>
      <SectionBox title='Modalità e pagine'>
        <label style={P.lbl}>Modalità di visualizzazione</label>
        <select value={cfg.displayMode || 'page'} onChange={e=>set('displayMode', e.target.value)} style={P.inp}><option value='page'>Pagina intera</option><option value='overlay'>Overlay modal</option></select>
        <Toggle k='showDatiGenerali' label='Mostra sezione Dati generali nel form nuova pratica'/>
        <Toggle k='enableCreateWithoutSelection' label='Abilita creazione senza selezione'/>
        <Text k='editPageId' label='Pagina Modifica / slug'/>
        <div style={P.grid2}><Num k='officeLonWgs84' label='Lon ufficio WGS84' step={0.000001}/><Num k='officeLatWgs84' label='Lat ufficio WGS84' step={0.000001}/></div>
        <div style={P.hint}>Puoi usare punto o virgola inserendo manualmente il valore nel JSON; qui il numero viene salvato normalizzato.</div>
      </SectionBox>
      <SectionBox title='Mappa di pagina'>
        <MapWidgetSelector onSelect={(ids:string[]) => setMany({ useMapWidgetIds: ids })} useMapWidgetIds={asJs(cfg.useMapWidgetIds || [])}/>
        <Text k='mapLayerTitle' label='Titolo layer rapporti nella mappa'/>
        <Text k='mapLayerUrl' label='URL layer rapporti nella mappa'/>
        <div style={P.grid2}><Text k='mapLayerId' label='ID layer nella WebMap'/><Text k='mapLayerLayerId' label='LayerId numerico'/></div>
      </SectionBox>
    </>}

    <Acc id='aspetto' label='3. Aspetto generale del widget' open={isOpen('aspetto')} onToggle={()=>toggle('aspetto')}/>
    {isOpen('aspetto') && <>
      <SectionBox title='Sfondo modalità'>
        <div style={P.grid2}><Color k='modeBgCreate' label='Sfondo nuovo rapporto' fallback='#ecfdf5'/><Color k='modeBgEdit' label='Sfondo modifica rapporto' fallback='#edf5ff'/></div>
        <button
          type='button'
          style={{
            width: '100%',
            marginTop: 10,
            padding: '9px 12px',
            borderRadius: 9,
            border: '1px solid rgba(147,197,253,0.55)',
            background: 'linear-gradient(180deg, rgba(37,99,235,0.95), rgba(29,78,216,0.95))',
            color: '#ffffff',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: '0 6px 14px rgba(37,99,235,0.22)',
            boxSizing: 'border-box'
          }}
          onClick={() => setMany(MODERN_PALETTE)}
          title='Applica subito la palette moderna ai colori principali del widget'
        >
          Applica palette moderna
        </button>
        <div style={{...P.hint, textAlign:'center'}}>Pulsante: imposta fondo azzurro-grigio, card leggere e campi appena velati.</div>
      </SectionBox>
      <SectionBox title='Maschera / contenitore'>
        <div style={P.grid2}><Color k='maskBg' label='Sfondo maschera' fallback='#eef4fb'/><Color k='maskBorderColor' label='Colore bordo' fallback='#cbd8e6'/></div>
        <div style={P.grid3}><Num k='maskBorderWidth' label='Spessore bordo' min={0} max={8}/><Num k='maskBorderRadius' label='Arrotondamento' min={0} max={40}/><Num k='maskInnerPadding' label='Padding interno' min={0} max={40}/></div>
        <Num k='maskOuterOffset' label='Offset esterno' min={0} max={80}/>
      </SectionBox>
      <SectionBox title='Barra superiore e messaggi'>
        <div style={P.grid2}>
          <Num k='titleFontSize' label='Dimensione titolo barra' min={9} max={28}/>
          <Num k='msgFontSize' label='Dimensione messaggi' min={9} max={24}/>
        </div>
        <div style={P.hint}>Queste impostazioni regolano il titolo della maschera e i messaggi accanto ai pulsanti Salva/Annulla.</div>
      </SectionBox>
    </>}

    <Acc id='formstyle' label='4. Stile form, campi e card' open={isOpen('formstyle')} onToggle={()=>toggle('formstyle')}/>
    {isOpen('formstyle') && <>
      <SectionBox title='Etichette campo'>
        <div style={P.grid2}><Color k='formLabelColor' label='Colore etichette' fallback='#334155'/><Num k='formLabelFontSize' label='Dimensione testo' min={8} max={24}/></div>
        <div style={P.grid2}><Num k='formLabelFontWeight' label='Peso testo' min={300} max={900} step={100}/><Num k='formLabelMarginBottom' label='Distanza da campo' min={0} max={20}/></div>
      </SectionBox>
      <SectionBox title='Campi input / combo / textarea'>
        <div style={P.grid2}><Color k='formFieldBg' label='Sfondo campo' fallback='#f8fbff'/><Color k='formFieldColor' label='Colore testo' fallback='#0f172a'/></div>
        <div style={P.grid2}><Color k='formFieldBorderColor' label='Colore bordo' fallback='#bfcede'/><Color k='formFieldDisabledBg' label='Sfondo campo bloccato' fallback='#e7eef7'/></div>
        <div style={P.grid3}><Num k='formFieldFontSize' label='Dimensione testo' min={8} max={24}/><Num k='formFieldHeight' label='Altezza campo' min={24} max={60}/><Num k='formFieldPaddingX' label='Padding orizzontale' min={0} max={30}/></div>
        <div style={P.grid3}><Num k='formFieldBorderWidth' label='Spessore bordo' min={0} max={8}/><Num k='formFieldBorderRadius' label='Arrotondamento' min={0} max={30}/><Color k='formFieldDisabledColor' label='Testo campo bloccato' fallback='#334155'/></div>
      </SectionBox>
      <SectionBox title='Card / gruppi sezione'>
        <div style={P.grid2}><Color k='formCardBg' label='Sfondo card' fallback='#f8fbff'/><Color k='formCardBorderColor' label='Bordo card' fallback='#c6d7ea'/></div>
        <div style={P.grid3}><Num k='formCardBorderWidth' label='Spessore bordo' min={0} max={8}/><Num k='formCardBorderRadius' label='Arrotondamento card / righe blu' min={0} max={40}/><Num k='formSectionGap' label='Spazio tra card' min={0} max={40}/></div>
        <Text k='formCardShadow' label='Ombra card CSS' placeholder='0 1px 3px rgba(15, 23, 42, 0.08)'/>
        <div style={P.hint}>Lo stesso valore arrotonda sia il contenitore della card sia la riga blu di intestazione.</div>
      </SectionBox>
      <SectionBox title='Intestazioni card'>
        <Text k='formCardHeaderBg' label='Sfondo intestazione card' placeholder='linear-gradient(90deg, #0d3b66, #155e9d)'/>
        <div style={P.grid2}><Color k='formCardHeaderColor' label='Colore testo intestazione' fallback='#ffffff'/><Num k='formCardHeaderFontSize' label='Dimensione testo' min={8} max={24}/></div>
        <div style={P.grid3}><Num k='formCardHeaderFontWeight' label='Peso testo' min={300} max={900} step={100}/><Num k='formCardHeaderPaddingX' label='Padding X' min={0} max={30}/><Num k='formCardHeaderPaddingY' label='Padding Y' min={0} max={24}/></div>
        <Num k='formCardBodyPadding' label='Padding corpo card' min={0} max={30}/>
      </SectionBox>
      <SectionBox title='Altre violazioni'>
        <div style={P.grid3}><Num k='norma3FontSize' label='Dimensione testo articoli' min={8} max={24}/><Num k='norma3GradeColumnWidth' label='Larghezza colonna grado' min={80} max={260}/><Num k='norma3RowGap' label='Distanza righe' min={0} max={20}/></div>
      </SectionBox>
    </>}

    <Acc id='layout' label='5. Layout campi e colonne per sezione' open={isOpen('layout')} onToggle={()=>toggle('layout')}/>
    {isOpen('layout') && <div>
      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12}}>
        {(['dati_generali','trasgressore','violazione','dati_tecnici'] as const).map(t => <button key={t} type='button' onClick={()=>setLayoutTab(t)} style={{...P.btn, borderColor:layoutTab===t?'#60a5fa':'rgba(96,165,250,0.25)', background:layoutTab===t?'rgba(96,165,250,0.20)':'rgba(96,165,250,0.08)'}}>{t.replace(/_/g,' ')}</button>)}
      </div>
      {layoutTab === 'violazione' ? <>
        <SectionBox title='Scheda Violazione — gruppi reali del form' hint='Queste impostazioni regolano la scheda Violazione così come viene renderizzata: gruppo sinistro “Violazioni e valutazione RI” e gruppo destro “Descrizione e circostanze”.'>
          <div style={P.grid3}><Num k='violazioneLayoutLeftPercent' label='Larghezza iniziale gruppo sinistro (%)' min={30} max={80}/><Num k='violazioneLayoutMinLeftPx' label='Min gruppo sinistro (px)' min={260} max={900}/><Num k='violazioneLayoutMinRightPx' label='Min gruppo destro (px)' min={220} max={800}/></div>
          <div style={P.grid2}><Num k='violazioneSplitterWidth' label='Larghezza separatore (px)' min={6} max={40}/><Color k='violazioneSplitterColor' label='Colore separatore' fallback='#94a3b8'/></div>
          <div style={P.grid2}><Num k='violazioneDescrizioneRows' label='Righe descrizione dettagliata' min={2} max={12}/><Num k='violazioneCircostanzeRows' label='Righe circostanze rilevanti' min={2} max={12}/></div>
          <button type='button' style={P.dangerBtn} onClick={() => setMany({ violazioneLayoutLeftPercent:58, violazioneLayoutMinLeftPx:520, violazioneLayoutMinRightPx:360, violazioneSplitterWidth:14, violazioneSplitterColor:'#94a3b8', violazioneDescrizioneRows:5, violazioneCircostanzeRows:4 })}>↺ Reset scheda Violazione</button>
        </SectionBox>
      </> : <>
        <SectionBox title={`Scheda ${layoutTab.replace(/_/g,' ')}`} hint='Qui puoi modificare colonne, larghezze, ordine dei campi e etichette visualizzate. La scheda Violazione ha un layout speciale dedicato nella relativa tab.'>
          <Num k='fieldGap' label='Gap generale tra campi (px)' min={0} max={40}/>
          {renderGenericLayoutEditor(layoutTab)}
        </SectionBox>
      </>}
    </div>}

    <Acc id='anteprima' label='6. Anteprima PDF e titolo pratica' open={isOpen('anteprima')} onToggle={()=>toggle('anteprima')}/>
    {isOpen('anteprima') && <>
      <SectionBox title='Viewer PDF'>
        <div style={P.grid2}><Num k='anteprimaPdfPaddingTop' label='Padding superiore' min={0} max={80}/><Num k='anteprimaPdfPaddingX' label='Padding laterale' min={0} max={80}/></div>
        <div style={P.grid2}><Num k='anteprimaPdfPaddingBottom' label='Padding inferiore' min={0} max={80}/><Num k='anteprimaPdfBottomRadius' label='Raggio angoli inferiori' min={0} max={40}/></div>
      </SectionBox>
      <SectionBox title='Titolo pratica'>
        <Text k='detailTitlePrefix' label='Prefisso titolo'/>
        <div style={P.grid2}><Color k='detailTitleColor' label='Colore testo' fallback='#0f172a'/><Text k='detailTitleBg' label='Sfondo titolo'/></div>
        <div style={P.grid3}><Num k='detailTitleFontSize' label='Font' min={9} max={28}/><Num k='detailTitleFontWeight' label='Peso' min={300} max={900} step={100}/><Num k='detailTitleHeight' label='Altezza' min={0} max={80}/></div>
        <div style={P.grid2}><Num k='detailTitlePaddingBottom' label='Padding basso' min={0} max={40}/><Num k='detailTitlePaddingLeft' label='Padding sinistro' min={0} max={60}/></div>
      </SectionBox>
    </>}

    <div style={{marginTop:26, borderTop:'1px solid rgba(255,255,255,0.12)', paddingTop:16}}>
      <button type='button' onClick={()=>{ if(window.confirm('Ripristinare TUTTE le impostazioni predefinite del widget?')) props.onSettingChange({ id:props.id, config:defaultConfig as any }) }} style={P.dangerBtn}>↺ Ripristina tutti i predefiniti</button>
    </div>
  </div>
}

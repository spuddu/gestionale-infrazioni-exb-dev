/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, DataSourceManager, getAppStore, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import type { IMConfig, TabConfig } from '../config'
import { defaultConfig, DETAIL_DEFAULT_TAB_FIELDS, DETAIL_DEFAULT_PRESET_ID, DETAIL_DEFAULT_PRESET_NAME, DETAIL_NEVER_SHOW_FIELDS, DETAIL_GENERAL_FIELDS } from '../config'

type Props = AllWidgetSettingProps<IMConfig>
type FieldOpt = { name: string; alias: string; type?: string }

// ── Stili (panel scuro) ───────────────────────────────────────────────────────
const P = {
  wrap:  { padding:'0 12px 32px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb' } as React.CSSProperties,
  sec:   { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.2, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' } as React.CSSProperties,
  lbl:   { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:4, marginTop:10 } as React.CSSProperties,
  hint:  { fontSize:10.5, color:'#a0aec0', marginTop:3, lineHeight:1.4 } as React.CSSProperties,
  row2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } as React.CSSProperties,
  row3:  { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 } as React.CSSProperties,
  titleRow3: { display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:4, alignItems:'end' } as React.CSSProperties,
  compactCell: { minWidth:0, overflow:'hidden' } as React.CSSProperties,
  inp:   { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  grp:   { fontSize:11, fontWeight:700, color:'#93c5fd', marginTop:14, marginBottom:6, paddingBottom:4, borderBottom:'1px solid rgba(255,255,255,0.07)' } as React.CSSProperties,
}

const parseNum = (v:any, fb:number) => { const n=Number(v); return Number.isFinite(n)?n:fb }
function asJs<T=any>(v:any):T { return v?.asMutable?v.asMutable({deep:true}):v }
function normalizeStrArray(v:any):string[] { const a=Array.isArray(asJs(v))?asJs(v):[]; return a.map((x:any)=>String(x)).filter(Boolean) }

function normalizeByAvailable(names: string[], availableNames: string[]): string[] {
  const available = new Set((availableNames || []).map(n => String(n)))
  const blocked = new Set([...DETAIL_NEVER_SHOW_FIELDS, ...DETAIL_GENERAL_FIELDS].map(n => String(n)))
  return (names || []).map(String).filter(n => n && available.has(n) && !blocked.has(n))
}

function buildDefaultTabs(availableNames: string[]): TabConfig[] {
  return [
    { id: 'anagrafica', label: 'Anagrafica', fields: normalizeByAvailable(DETAIL_DEFAULT_TAB_FIELDS.anagrafica, availableNames), hideEmpty: true },
    { id: 'violazione', label: 'Violazione', fields: normalizeByAvailable(DETAIL_DEFAULT_TAB_FIELDS.violazione, availableNames), hideEmpty: true },
    { id: 'iter', label: 'Iter', fields: normalizeByAvailable(DETAIL_DEFAULT_TAB_FIELDS.iterExtra, availableNames), isIterTab: true, hideEmpty: false },
    { id: 'nota_spese', label: 'Nota spese', fields: [], locked: true, hideEmpty: false },
    { id: 'allegati', label: 'Allegati', fields: normalizeByAvailable(DETAIL_DEFAULT_TAB_FIELDS.allegati, availableNames), hideEmpty: true },
    { id: 'azioni', label: 'Azioni', fields: [], locked: true }
  ]
}

function buildDefaultPreset(availableNames: string[]) {
  const tabs = buildDefaultTabs(availableNames).filter(t => t.id !== 'azioni')
  return { id: DETAIL_DEFAULT_PRESET_ID, name: DETAIL_DEFAULT_PRESET_NAME, tabs }
}

function ensureNotaSpeseTabForSetting(tabs: TabConfig[]): TabConfig[] {
  const list = Array.isArray(tabs) ? [...tabs] : []
  if (!list.some(t => String(t?.id || '') === 'nota_spese')) {
    const idxAllegati = list.findIndex(t => String(t?.id || '') === 'allegati')
    const insertAt = idxAllegati >= 0 ? idxAllegati : list.length
    list.splice(insertAt, 0, { id: 'nota_spese', label: 'Nota spese', fields: [], locked: true, hideEmpty: false })
  }
  return list
}

// ── Micro-componenti ──────────────────────────────────────────────────────────
function Inp(p: { value:string|number; onChange:(v:string)=>void; placeholder?:string }) {
  return <input type='text' value={p.value} onChange={e=>p.onChange(e.target.value)} placeholder={p.placeholder} style={P.inp}/>
}
function NumInp(p: { value:number; onChange:(v:number)=>void; min?:number; max?:number; step?:number; unit?:string; compact?:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:p.compact ? 3 : 5, minWidth:0, maxWidth:'100%' }}>
      <input type='number' value={p.value} min={p.min} max={p.max} step={p.step||1}
        onChange={e=>p.onChange(Number(e.target.value))} style={{ ...P.inp, width:p.compact ? 48 : 68, minWidth:0, padding:p.compact ? '5px 5px' : P.inp.padding }}/>
      {p.unit && <span style={{ fontSize:p.compact ? 10 : 11, color:'#a0aec0', flexShrink:0 }}>{p.unit}</span>}
    </div>
  )
}
function ColInp(p: { value:string; onChange:(v:string)=>void }) {
  const hexVal = /^#[0-9a-fA-F]{3,8}$/.test(p.value) ? p.value : '#000000'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0, maxWidth:'100%' }}>
      <input type='color' value={hexVal} onChange={e=>p.onChange(e.target.value)}
        style={{ width:30, height:26, padding:2, border:'1px solid rgba(255,255,255,0.15)', borderRadius:5, cursor:'pointer', background:'transparent', flexShrink:0 }}/>
      <input type='text' value={p.value} onChange={e=>p.onChange(e.target.value)}
        placeholder='#rrggbb o rgba(...)' style={{ ...P.inp, flex:1, minWidth:0, fontSize:11 }}/>
    </div>
  )
}
function Check(p: { value:boolean; onChange:(v:boolean)=>void; label:string }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#d1d5db', cursor:'pointer', marginTop:8 }}>
      <input type='checkbox' checked={p.value} onChange={e=>p.onChange(e.target.checked)}/>{p.label}
    </label>
  )
}
function Sel(p: { value:string; onChange:(v:string)=>void; options:Array<{value:string;label:string}> }) {
  return (
    <select value={p.value} onChange={e=>p.onChange(e.target.value)} style={{ ...P.inp, cursor:'pointer' }}>
      {p.options.map(o=><option key={o.value} value={o.value} style={{ background:'#1a1f2e', color:'#e5e7eb' }}>{o.label}</option>)}
    </select>
  )
}


type MapLayerOpt = { key: string; title: string; url: string; id: string; layerId: string; geometryType: string }

function normalizeFeatureLayerUrlForSetting (raw: any): string {
  const str = String(raw || '').trim()
  if (!str) return ''
  try {
    const u = new URL(str)
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return str.replace(/[?#].*$/, '').replace(/\/$/, '')
  }
}

function getLayerIdFromUrlForSetting (raw: any): string {
  const m = String(raw || '').match(/\/(?:FeatureServer|MapServer)\/(\d+)(?:[/?#]|$)/i)
  return m?.[1] || ''
}

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) return reject(new Error('AMD require non disponibile'))
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

function isFeatureLayerJsonForSetting (layer: any): boolean {
  const layerType = String(layer?.layerType || layer?.type || '').toLowerCase()
  const url = String(layer?.url || '').toLowerCase()
  return layerType.includes('feature') || /\/featureserver(?:\/\d+)?(?:[/?#]|$)/i.test(url)
}

function uniqueMapLayerOptions (items: MapLayerOpt[]): MapLayerOpt[] {
  const seen = new Set<string>()
  const out: MapLayerOpt[] = []
  for (const item of items || []) {
    const key = [item.id, normalizeFeatureLayerUrlForSetting(item.url), item.layerId, item.title].join('|').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'it', { sensitivity: 'base' }))
}

function collectFeatureLayersFromWebMapJson (webmapJson: any): MapLayerOpt[] {
  const out: MapLayerOpt[] = []
  const visit = (layer: any, path: string[] = []) => {
    if (!layer) return
    const children = [
      ...(Array.isArray(layer?.layers) ? layer.layers : []),
      ...(Array.isArray(layer?.featureCollection?.layers) ? layer.featureCollection.layers : [])
    ]
    if (isFeatureLayerJsonForSetting(layer)) {
      const rawTitle = String(layer?.title || layer?.name || layer?.layerDefinition?.name || `Layer ${out.length + 1}`).trim()
      const title = [...path, rawTitle].filter(Boolean).join(' / ') || `Layer ${out.length + 1}`
      const url = normalizeFeatureLayerUrlForSetting(layer?.url || layer?.layerDefinition?.source?.url || '')
      const id = String(layer?.id || layer?.itemId || '').trim()
      const layerId = String(layer?.layerId ?? layer?.sourceLayerId ?? getLayerIdFromUrlForSetting(url) ?? '').trim()
      const geometryType = String(layer?.geometryType || layer?.layerDefinition?.geometryType || '').trim()
      const key = `${id || `json_${out.length}`}|${url || title}|${layerId}`
      out.push({ key, title, url, id, layerId, geometryType })
    }
    children.forEach((child: any) => visit(child, layer?.title ? [...path, String(layer.title)] : path))
  }
  ;[
    ...(Array.isArray(webmapJson?.operationalLayers) ? webmapJson.operationalLayers : []),
    ...(Array.isArray(webmapJson?.baseMap?.baseMapLayers) ? webmapJson.baseMap.baseMapLayers : [])
  ].forEach((layer: any) => visit(layer, []))
  return uniqueMapLayerOptions(out)
}

function collectFeatureLayerOptionFromDsJson (dsJson: any, fallbackId = ''): MapLayerOpt | null {
  const ds = asJs(dsJson || {})
  const type = String(ds?.type || ds?.jimuChildId || '').toLowerCase()
  const url = normalizeFeatureLayerUrlForSetting(ds?.url || ds?.sourceUrl || ds?.itemData?.url || '')
  const layerId = String(ds?.layerId ?? ds?.sourceLayerId ?? getLayerIdFromUrlForSetting(url) ?? '').trim()
  const looksFeature = type.includes('feature') || /\/featureserver(?:\/\d+)?(?:[/?#]|$)/i.test(url)
  if (!looksFeature && !url) return null
  const title = String(ds?.sourceLabel || ds?.label || ds?.title || ds?.name || ds?.itemId || fallbackId || `Layer ${layerId || ''}`).trim() || `Layer ${layerId || ''}`
  const id = String(ds?.id || fallbackId || '').trim()
  const geometryType = String(ds?.geometryType || ds?.schema?.geometryType || '').trim()
  const key = `${id || `ds_${title}`}|${url || title}|${layerId}`
  return { key, title, url, id, layerId, geometryType }
}

function collectFeatureLayersFromDataSourceManager (webMapDataSourceId: string): MapLayerOpt[] {
  const out: MapLayerOpt[] = []
  const seen: any[] = []
  const pushDs = (dsAny: any, fallbackId = '') => {
    if (!dsAny || seen.indexOf(dsAny) >= 0) return
    seen.push(dsAny)
    try {
      const json = asJs(dsAny?.getDataSourceJson?.() || dsAny?.dataSourceJson || dsAny?.sourceJson || dsAny || {})
      const opt = collectFeatureLayerOptionFromDsJson(json, fallbackId || String(dsAny?.id || dsAny?.dataSourceId || ''))
      if (opt) out.push(opt)
    } catch {}
    const childCandidates: any[] = []
    try {
      const children = dsAny?.getChildDataSources?.()
      if (Array.isArray(children)) childCandidates.push(...children)
      else if (children && typeof children === 'object') childCandidates.push(...Object.values(asJs(children)))
    } catch {}
    try {
      const children = dsAny?.childDataSources
      if (Array.isArray(children)) childCandidates.push(...children)
      else if (children && typeof children === 'object') childCandidates.push(...Object.values(asJs(children)))
    } catch {}
    try {
      const children = dsAny?.dataSources
      if (Array.isArray(children)) childCandidates.push(...children)
      else if (children && typeof children === 'object') childCandidates.push(...Object.values(asJs(children)))
    } catch {}
    childCandidates.forEach((child: any, idx: number) => pushDs(child, `${fallbackId || webMapDataSourceId}_child_${idx}`))
  }
  try {
    const dsm: any = DataSourceManager.getInstance()
    const root = webMapDataSourceId ? dsm.getDataSource(webMapDataSourceId) : null
    pushDs(root, webMapDataSourceId)
    const all: any = dsm.getDataSources?.() || dsm.dataSources || dsm._dataSources
    const values: any[] = Array.isArray(all) ? all : (all && typeof all === 'object' ? Object.values(asJs(all)) : [])
    values.forEach((dsAny: any, idx: number) => {
      let json: any = {}
      try { json = asJs(dsAny?.getDataSourceJson?.() || dsAny?.dataSourceJson || dsAny || {}) } catch {}
      const parentId = String(json?.parentDataSourceId || json?.rootDataSourceId || dsAny?.parentDataSourceId || '').trim()
      const id = String(json?.id || dsAny?.id || dsAny?.dataSourceId || '').trim()
      if (!webMapDataSourceId || parentId === webMapDataSourceId || id.indexOf(`${webMapDataSourceId}-`) === 0 || id.indexOf(`${webMapDataSourceId}_`) === 0) {
        pushDs(dsAny, id || `manager_${idx}`)
      }
    })
  } catch {}
  return uniqueMapLayerOptions(out)
}

function collectFeatureLayersFromAppConfigDataSources (appConfig: any, webMapDataSourceId: string): MapLayerOpt[] {
  const out: MapLayerOpt[] = []
  try {
    const dataSources: any = asJs(appConfig?.dataSources || {})
    Object.entries(dataSources || {}).forEach(([id, raw]: [string, any]) => {
      const ds = asJs(raw || {})
      const parentId = String(ds?.parentDataSourceId || ds?.rootDataSourceId || '').trim()
      if (webMapDataSourceId && parentId && parentId !== webMapDataSourceId) return
      const opt = collectFeatureLayerOptionFromDsJson({ ...ds, id: ds?.id || id }, id)
      if (opt) out.push(opt)
    })
  } catch {}
  return uniqueMapLayerOptions(out)
}

function getBuilderAppConfigForSetting (): any {
  try {
    const state: any = getAppStore()?.getState?.()
    const candidates = [
      state?.appStateInBuilder?.appConfig,
      state?.appStateInBuilder?.appConfig?.asMutable ? state.appStateInBuilder.appConfig.asMutable({ deep: true }) : null,
      state?.appConfig
    ]
    for (const c of candidates) {
      const js = asJs(c)
      if (js?.widgets || js?.dataSources) return js
    }
  } catch {}
  return {}
}

async function readWebMapFeatureLayers (portalItemId: string, portalUrl?: string): Promise<MapLayerOpt[]> {
  const itemId = String(portalItemId || '').trim()
  if (!itemId) return []
  const cleanPortalUrl = String(portalUrl || 'https://cbsm-hub.maps.arcgis.com').trim().replace(/\/$/, '') || 'https://cbsm-hub.maps.arcgis.com'
  try {
    const [PortalItem, Portal] = await Promise.all([
      loadEsriModule<any>('esri/portal/PortalItem'),
      loadEsriModule<any>('esri/portal/Portal')
    ])
    const portal = new Portal({ url: cleanPortalUrl })
    const item = new PortalItem({ id: itemId, portal })
    if (typeof item.load === 'function') await item.load()
    const data = await item.fetchData('json')
    const opts = collectFeatureLayersFromWebMapJson(data)
    if (opts.length) return opts
  } catch {}
  return []
}
function Acc(p: { id:string; label:string; open:boolean; onToggle:()=>void }) {
  return (
    <div style={P.sec} onClick={p.onToggle}>
      <span>{p.label}</span>
      <span style={{ fontSize:10, color:'#a0aec0' }}>{p.open?'▲':'▼'}</span>
    </div>
  )
}

// ── TabsManager ───────────────────────────────────────────────────────────────
function TabsManager(p: { tabs:TabConfig[]; onChange:(t:TabConfig[])=>void }) {
  const tabs = Array.isArray(p.tabs) ? p.tabs : []
  const [dragFrom, setDragFrom] = React.useState<number|null>(null)
  const [dragOver, setDragOver] = React.useState<number|null>(null)

  const upd = (i:number, patch:Partial<TabConfig>) => p.onChange(tabs.map((t,j)=>j===i?{...t,...patch}:t))
  const rem = (i:number) => { if(tabs[i]?.locked) return; p.onChange(tabs.filter((_,j)=>j!==i)) }
  const add = () => p.onChange([...tabs,{id:`tab_${Date.now()}`,label:'Nuova Tab',fields:[]}])
  const move = (from:number, to:number) => {
    if(from===to) return; const a=[...tabs];const [m]=a.splice(from,1);a.splice(to,0,m);p.onChange(a)
  }

  const rb:React.CSSProperties = { border:'1px solid rgba(252,165,165,0.3)', background:'rgba(239,68,68,0.10)', borderRadius:5, cursor:'pointer', fontSize:11, padding:'3px 6px', color:'#fca5a5' }
  const btn:React.CSSProperties = { border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', borderRadius:5, cursor:'pointer', fontSize:11, padding:'3px 6px', color:'#d1d5db' }

  return (
    <div style={{width:'100%'}}>
      {tabs.map((tab,idx)=>{
        const isOver=dragOver===idx
        return (
          <div key={tab.id} draggable={!tab.locked}
            onDragStart={()=>setDragFrom(idx)} onDragOver={e=>{e.preventDefault();setDragOver(idx)}}
            onDrop={()=>{if(dragFrom!==null&&dragFrom!==idx)move(dragFrom,idx);setDragFrom(null);setDragOver(null)}}
            onDragEnd={()=>{setDragFrom(null);setDragOver(null)}}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:6,
              border:`1px solid ${isOver?'#93c5fd':'rgba(255,255,255,0.10)'}`,
              background:isOver?'rgba(59,130,246,0.10)':'rgba(255,255,255,0.04)',
              marginBottom:6, opacity:dragFrom===idx?0.45:1 }}>
            {!tab.locked && <span style={{cursor:'grab',fontSize:14,color:'rgba(255,255,255,0.35)',userSelect:'none'}}>☰</span>}
            <input type='text' style={{...P.inp,flex:1}} value={tab.label}
              onChange={e=>upd(idx,{label:e.target.value})} disabled={tab.locked&&tab.id==='azioni'}
              placeholder='Nome tab'/>
            {tab.locked && <span style={{fontSize:10,color:'#a0aec0',whiteSpace:'nowrap'}}>bloccata</span>}
            {!tab.locked && <button type='button' style={rb} onClick={()=>rem(idx)}>✕</button>}
          </div>
        )
      })}
      <button type='button' onClick={add}
        style={{width:'100%',padding:'6px',borderRadius:8,border:'1px dashed rgba(147,197,253,0.4)',background:'rgba(59,130,246,0.08)',color:'#93c5fd',cursor:'pointer',fontSize:12,fontWeight:600,marginTop:4}}>
        ＋ Aggiungi Tab
      </button>
    </div>
  )
}

// ── FieldPicker ───────────────────────────────────────────────────────────────
function FieldPicker(p: { tab:TabConfig; allFields:FieldOpt[]; onChange:(f:string[])=>void; onTabPatch:(patch:Partial<TabConfig>)=>void }) {
  const { tab, allFields } = p
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [dragFrom, setDragFrom] = React.useState<number|null>(null)
  const [dragOver, setDragOver] = React.useState<number|null>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  const selected = Array.isArray(tab.fields) ? tab.fields : []
  const selectedSet = React.useMemo(()=>new Set(selected),[selected])

  React.useEffect(()=>{
    if(!open) return
    const onDown=(ev:MouseEvent)=>{ if(!wrapRef.current?.contains(ev.target as any)) setOpen(false) }
    document.addEventListener('mousedown',onDown,true)
    return ()=>document.removeEventListener('mousedown',onDown,true)
  },[open])

  const filtered = React.useMemo(()=>{
    const qq=(q||'').trim().toLowerCase()
    const list=Array.isArray(allFields)?allFields:[]
    if(!qq) return list
    return list.filter(f=>(f.alias||'').toLowerCase().includes(qq)||(f.name||'').toLowerCase().includes(qq))
  },[q,allFields])

  const toggle=(name:string)=>{ if(!name) return; const has=selectedSet.has(name); p.onChange(has?selected.filter(x=>x!==name):[...selected,name]) }
  const bulkSel=(mode:'add'|'remove')=>{
    const names=filtered.map(f=>f.name).filter(Boolean)
    if(!names.length) return
    if(mode==='add') p.onChange(Array.from(new Set([...selected,...names])))
    else { const rm=new Set(names); p.onChange(selected.filter(n=>!rm.has(n))) }
  }
  const remove=(name:string)=>p.onChange(selected.filter(x=>x!==name))
  const reorder=(from:number,to:number)=>{ if(from===to) return; const a=[...selected];const [m]=a.splice(from,1);a.splice(to,0,m);p.onChange(a) }

  const selectedOpts = React.useMemo(()=>{
    const map=new Map<string,FieldOpt>();(Array.isArray(allFields)?allFields:[]).forEach(f=>map.set(f.name,f))
    return selected.map(n=>map.get(n)||{name:n,alias:n})
  },[selected,allFields])

  const preview = !selectedOpts.length ? 'Seleziona...' : selectedOpts.length===1 ? (selectedOpts[0].alias||selectedOpts[0].name) : `${selectedOpts[0].alias||selectedOpts[0].name} +${selectedOpts.length-1}`

  const sbtn:React.CSSProperties = { border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)', borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:11, color:'#d1d5db' }
  const popInp:React.CSSProperties = { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(0,0,0,0.2)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'#fff', color:'#111' }

  return (
    <div ref={wrapRef} style={{position:'relative',width:'100%',marginBottom:10}}>
      {/* Trigger */}
      <div role='button' tabIndex={0} onClick={()=>setOpen(v=>!v)}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setOpen(v=>!v)}}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
          border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, background:'rgba(255,255,255,0.06)',
          color:'#e5e7eb', cursor:'pointer', boxSizing:'border-box' as const, userSelect:'none' as const }}>
        <span style={{ background:'rgba(147,197,253,0.25)', color:'#93c5fd', borderRadius:999, padding:'2px 8px', fontSize:11, fontWeight:700, flexShrink:0 }}>{selected.length}</span>
        <span style={{ flex:1, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{preview}</span>
        <span style={{ fontSize:10, color:'#a0aec0' }}>{open?'▲':'▼'}</span>
      </div>

      {/* Popup */}
      {open && (
        <div style={{ position:'absolute', zIndex:1000, top:'calc(100% + 6px)', left:0, right:0,
          borderRadius:10, border:'1px solid rgba(0,0,0,0.2)', background:'#fff',
          boxShadow:'0 10px 30px rgba(0,0,0,0.3)', padding:12, boxSizing:'border-box' as const }}>
          
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontWeight:700, fontSize:13, color:'#111' }}>{tab.label}</span>
            <button type='button' onClick={()=>setOpen(false)}
              style={{ border:'1px solid rgba(0,0,0,0.15)', borderRadius:6, padding:'4px 10px', background:'#f6f7f9', cursor:'pointer', fontSize:11, color:'#111' }}>
              Chiudi
            </button>
          </div>

          {tab.isIterTab && <div style={{ fontSize:11, color:'#555', marginBottom:8 }}>I blocchi DT/DA sono sempre visibili. Qui aggiungi campi extra.</div>}

          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#111', cursor:'pointer', marginBottom:10 }}>
            <input type='checkbox' checked={!!tab.hideEmpty} onChange={e=>p.onTabPatch({hideEmpty:e.target.checked})}/>
            Nascondi campi vuoti (solo questa tab)
          </label>

          {/* Selezionati */}
          <div style={{ fontSize:11, fontWeight:700, color:'#111', marginBottom:5 }}>Selezionati ({selected.length}) — trascina per riordinare</div>
          <div style={{ border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, maxHeight:180, overflowY:'auto', marginBottom:10 }}>
            {selectedOpts.map((f,idx)=>(
              <div key={f.name} draggable
                onDragStart={()=>setDragFrom(idx)} onDragEnter={()=>setDragOver(idx)}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();if(dragFrom!==null)reorder(dragFrom,idx);setDragFrom(null);setDragOver(null)}}
                onDragEnd={()=>{setDragFrom(null);setDragOver(null)}}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px',
                  borderBottom:'1px solid rgba(0,0,0,0.06)', background:idx%2===0?'#fff':'#f9f9f9',
                  outline:dragOver===idx?'2px dashed #2f6fed':'none', cursor:'grab' }}>
                <span style={{ opacity:0.5, fontSize:14, userSelect:'none' as const }}>≡</span>
                <span style={{ flex:1, fontSize:12, color:'#111', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{f.alias||f.name}</span>
                <button type='button' onClick={()=>remove(f.name)}
                  style={{ border:'1px solid rgba(0,0,0,0.12)', borderRadius:5, padding:'2px 6px', cursor:'pointer', background:'#fff', color:'#d13438', fontSize:11 }}>✕</button>
              </div>
            ))}
            {!selectedOpts.length && <div style={{ padding:'8px 10px', fontSize:12, color:'#888' }}>Nessun campo selezionato.</div>}
          </div>

          {/* Tutti i campi */}
          <div style={{ fontSize:11, fontWeight:700, color:'#111', marginBottom:5 }}>Tutti i campi</div>
          <input type='text' value={q} onChange={e=>setQ(e.target.value)}
            style={{ ...popInp, marginBottom:8 }} placeholder='Cerca...'/>
          <div style={{ display:'flex', gap:6, marginBottom:8 }}>
            <button type='button' style={sbtn} onClick={()=>bulkSel('add')}>Seleziona tutti</button>
            <button type='button' style={sbtn} onClick={()=>bulkSel('remove')}>Deseleziona tutti</button>
          </div>
          <div style={{ border:'1px solid rgba(0,0,0,0.12)', borderRadius:8, maxHeight:220, overflowY:'auto' }}>
            {filtered.map((f,idx)=>(
              <label key={f.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px',
                borderBottom:'1px solid rgba(0,0,0,0.06)', background:idx%2===0?'#fff':'#f9f9f9',
                cursor:'pointer', color:'#111', fontSize:12 }}>
                <input type='checkbox' checked={selectedSet.has(f.name)} onChange={()=>toggle(f.name)}/>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{f.alias||f.name}</span>
              </label>
            ))}
            {!filtered.length && <div style={{ padding:'8px 10px', fontSize:12, color:'#888' }}>Nessun campo.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── PresetManager ─────────────────────────────────────────────────────────────
function PresetManager(p: { presets:any[]; activePresetId:string; onSetActive:(id:string)=>void; onApply:(p:any)=>void; onSaveNew:(name:string)=>void; onUpdateActive:(id:string)=>void; onDelete:(id:string)=>void }) {
  const [name, setName] = React.useState('')
  const active = (p.presets||[]).find((pr:any)=>String(pr.id)===String(p.activePresetId))
  const btn:React.CSSProperties = { border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)', borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer', color:'#d1d5db' }
  const btnDis:React.CSSProperties = { ...btn, opacity:0.4, cursor:'not-allowed' }
  return (
    <div style={{display:'grid',gap:8}}>
      <Sel value={p.activePresetId||''} onChange={v=>p.onSetActive(v)}
        options={[{value:'',label:'— nessun preset —'},...(p.presets||[]).map((pr:any)=>({value:String(pr.id),label:pr.name}))]}/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
        <button type='button' style={active?btn:btnDis} disabled={!active} onClick={()=>active&&p.onApply(active)}>Applica</button>
        <button type='button' style={active?btn:btnDis} disabled={!active} onClick={()=>active&&p.onUpdateActive(active.id)}>Aggiorna</button>
        <button type='button' style={active?{...btn,color:'#fca5a5'}:btnDis} disabled={!active} onClick={()=>active&&p.onDelete(active.id)}>Elimina</button>
      </div>
      <div style={{display:'flex',gap:6}}>
        <input type='text' value={name} onChange={e=>setName(e.target.value)}
          placeholder='Nome nuovo preset...' style={{...P.inp,flex:1}}/>
        <button type='button' disabled={!name.trim()}
          style={name.trim()?{...btn,padding:'4px 10px'}:{...btnDis,padding:'4px 10px'}}
          onClick={()=>{const nm=name.trim();if(!nm) return;p.onSaveNew(nm);setName('')}}>
          Salva
        </button>
      </div>
      {active && <div style={P.hint}>Attivo: <b style={{color:'#d1d5db'}}>{active.name}</b></div>}
    </div>
  )
}

// ── migrateLegacyFields ───────────────────────────────────────────────────────
function migrateLegacyFields(cfg: any): TabConfig[] {
  if(Array.isArray(cfg.tabs)&&cfg.tabs.length>0) return ensureNotaSpeseTabForSetting(cfg.tabs.map((tab:any)=>({...tab,hideEmpty:tab.id==='nota_spese'?false:(tab.hideEmpty??(tab.id==='violazione'||tab.id==='anagrafica'||tab.id==='allegati'))})))
  return [
    {id:'anagrafica',label:'Anagrafica',fields:Array.isArray(cfg.anagraficaFields)?cfg.anagraficaFields:[],hideEmpty:true},
    {id:'violazione',label:'Violazione',fields:Array.isArray(cfg.violazioneFields)?cfg.violazioneFields:[],hideEmpty:true},
    {id:'iter',label:'Iter',fields:Array.isArray(cfg.iterExtraFields)?cfg.iterExtraFields:[],isIterTab:true,hideEmpty:false},
    {id:'nota_spese',label:'Nota spese',fields:[],locked:true,hideEmpty:false},
    {id:'allegati',label:'Allegati',fields:Array.isArray(cfg.allegatiFields)?cfg.allegatiFields:[],hideEmpty:true},
    {id:'azioni',label:'Azioni',fields:[]},
  ]
}

// ── Setting ───────────────────────────────────────────────────────────────────
export default function Setting(props: Props) {
  const [openSec, setOpenSec] = React.useState<string>('dati')
  const toggle = (id:string) => setOpenSec(s=>s===id?'':id)
  const isOpen = (id:string) => openSec===id

  const cfgJs: any = { ...defaultConfig, ...asJs(props.config) }
  const baseCfg = props.config || ((Immutable as any)(defaultConfig) as any)

  const patch = (obj:Record<string,any>) => {
    let next = baseCfg
    Object.entries(obj).forEach(([k,v])=>{
      if(['rejectReasons','tabs','anagraficaFields','violazioneFields','allegatiFields','iterExtraFields','presets','mapUseDataSources'].includes(k))
        next=next.set(k,(Immutable as any)((v||[]) as any) as any)
      else next=next.set(k,v)
    })
    props.onSettingChange({id:props.id,config:next})
  }

  const onDsChange = (useDataSources:UseDataSource[]) => props.onSettingChange({id:props.id,useDataSources:useDataSources as any})
  const onToggleDs = (useDataSourcesEnabled:boolean) => props.onSettingChange({id:props.id,useDataSourcesEnabled})

  const onMapDsChange = async (useDataSources: UseDataSource[]) => {
    const nextUse = Array.isArray(useDataSources) ? useDataSources : []
    const first: any = nextUse?.[0] || null
    const nextPatch: Record<string, any> = {
      mapUseDataSources: nextUse,
      mapWebMapDataSourceId: String(first?.dataSourceId || ''),
      mapLayerTitle: '',
      mapLayerUrl: '',
      mapLayerId: '',
      mapLayerLayerId: ''
    }
    try {
      const dsId = String(first?.dataSourceId || '')
      if (dsId) {
        const ds: any = DataSourceManager.getInstance().getDataSource(dsId)
        const dsJson: any = ds?.getDataSourceJson?.() || ds?.dataSourceJson || {}
        const itemId = String(dsJson?.itemId || dsJson?.sourceItemId || ds?.itemId || '')
        const label = String(ds?.getLabel?.() || dsJson?.label || dsJson?.sourceLabel || '')
        nextPatch.mapWebMapItemId = itemId
        nextPatch.mapWebMapLabel = label
      } else {
        nextPatch.mapWebMapItemId = ''
        nextPatch.mapWebMapLabel = ''
      }
    } catch {
      // ignore
    }
    patch(nextPatch)
  }

  const useDsJs:any[] = asJs(props.useDataSources??(Immutable as any)([])) || []
  const primaryDsId = String(useDsJs?.[0]?.dataSourceId||'')
  const [fields, setFields] = React.useState<FieldOpt[]>([])
  const [mapLayerOptions, setMapLayerOptions] = React.useState<MapLayerOpt[]>([])
  const [mapLayerLoading, setMapLayerLoading] = React.useState(false)
  const [mapLayerError, setMapLayerError] = React.useState('')
  const [mapLayerMenuOpen, setMapLayerMenuOpen] = React.useState(false)
  const mapLayerMenuRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(()=>{
    let cancelled=false
    const load=async()=>{
      if(!primaryDsId){if(!cancelled)setFields([]);return}
      try{
        const ds:any=DataSourceManager.getInstance().getDataSource(primaryDsId)
        const fobj=ds?.getSchema?.()?.fields||{}
        const blocked = new Set([...DETAIL_NEVER_SHOW_FIELDS, ...DETAIL_GENERAL_FIELDS].map(n => String(n)))
        const opts:FieldOpt[]=Object.keys(fobj)
          .filter(name => !blocked.has(String(name)))
          .map(name=>{const f=fobj[name]||{};return{name,alias:String(f.alias||f.label||f.title||name),type:String(f.type||'')}})
          .sort((a,b)=>(a.alias||a.name).localeCompare(b.alias||b.name,'it',{sensitivity:'base'}))
        if(!cancelled)setFields(opts)
      }catch{if(!cancelled)setFields([])}
    }
    load();return()=>{cancelled=true}
  },[primaryDsId])

  React.useEffect(() => {
    if (!primaryDsId || !fields.length) return

    const availableNames = fields.map(f => String(f.name)).filter(Boolean)
    const defaultTabs = buildDefaultTabs(availableNames)
    const defaultPreset = buildDefaultPreset(availableNames)
    const currentTabs = migrateLegacyFields(cfgJs)

    const needsDefaultTabs = currentTabs
      .filter(t => t.id !== 'azioni')
      .every(t => !Array.isArray(t.fields) || t.fields.length === 0)

    const presetsJs = Array.isArray(cfgJs.presets) ? cfgJs.presets : []
    const hasPresets = presetsJs.length > 0
    const hasActivePreset = Boolean(String(cfgJs.activePresetId || ''))

    if (!needsDefaultTabs && hasPresets && hasActivePreset) return

    const patchObj: Record<string, any> = {}
    if (needsDefaultTabs) patchObj.tabs = defaultTabs
    if (!hasPresets) patchObj.presets = [defaultPreset]
    if (!hasActivePreset) patchObj.activePresetId = DETAIL_DEFAULT_PRESET_ID

    if (Object.keys(patchObj).length) patch(patchObj)
  }, [primaryDsId, fields.length])

  const tabs = migrateLegacyFields(cfgJs)
  const tabsWithDefaults = React.useMemo(() => {
    if (!fields.length) return tabs
    const availableNames = fields.map(f => String(f.name)).filter(Boolean)
    return buildDefaultTabs(availableNames).map((def, i) => {
      const cur = tabs[i]
      if (!cur) return def
      const curFields = Array.isArray(cur.fields) ? cur.fields.map(String).filter(Boolean) : []
      return curFields.length ? { ...def, ...cur, fields: curFields } : def
    })
  }, [fields, JSON.stringify(tabs)])
  const presetsJs = Array.isArray(asJs(cfgJs.presets)) ? asJs(cfgJs.presets) : []
  const effectivePresets = presetsJs.length ? presetsJs : [buildDefaultPreset(fields.map(f => String(f.name)).filter(Boolean))]
  const updateTab=(i:number,upd:Partial<TabConfig>)=>patch({tabs:tabs.map((t,j)=>j===i?{...t,...upd}:t)})

  const mapDsId = String(cfgJs.mapWebMapDataSourceId || '')
  const selectedMapLayerKey = mapLayerOptions.find(o => {
    const cfgId = String(cfgJs.mapLayerId || '').trim()
    const cfgUrl = normalizeFeatureLayerUrlForSetting(cfgJs.mapLayerUrl || '')
    const cfgTitle = String(cfgJs.mapLayerTitle || '').trim().toLowerCase()
    return (!!cfgId && o.id === cfgId) || (!!cfgUrl && o.url === cfgUrl) || (!!cfgTitle && o.title.toLowerCase() === cfgTitle)
  })?.key || ''
  const selectedMapLayerOpt = mapLayerOptions.find(o => o.key === selectedMapLayerKey) || null

  React.useEffect(() => {
    if (!mapLayerMenuOpen) return
    const onDown = (ev: MouseEvent) => {
      const el = mapLayerMenuRef.current
      if (el && !el.contains(ev.target as Node)) setMapLayerMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown, true)
    return () => document.removeEventListener('mousedown', onDown, true)
  }, [mapLayerMenuOpen])

  React.useEffect(() => {
    let cancelled = false
    const appConfig = getBuilderAppConfigForSetting()
    const fromManager = collectFeatureLayersFromDataSourceManager(mapDsId)
    if (fromManager.length) {
      setMapLayerOptions(fromManager)
      setMapLayerError('')
      setMapLayerLoading(false)
      return
    }
    const fromAppConfig = collectFeatureLayersFromAppConfigDataSources(appConfig, mapDsId)
    if (fromAppConfig.length) {
      setMapLayerOptions(fromAppConfig)
      setMapLayerError('')
      setMapLayerLoading(false)
      return
    }
    const itemId = String(cfgJs.mapWebMapItemId || '').trim()
    if (!itemId) {
      setMapLayerOptions([])
      setMapLayerError('')
      setMapLayerLoading(false)
      return
    }
    setMapLayerLoading(true)
    setMapLayerError('')
    readWebMapFeatureLayers(itemId, String((cfgJs as any).mapWebMapPortalUrl || 'https://cbsm-hub.maps.arcgis.com'))
      .then((opts) => {
        if (cancelled) return
        setMapLayerOptions(opts)
        setMapLayerError('')
      })
      .catch((e) => {
        if (cancelled) return
        setMapLayerOptions([])
        setMapLayerError(e?.message || String(e || 'Errore caricamento layer'))
      })
      .finally(() => { if (!cancelled) setMapLayerLoading(false) })
    return () => { cancelled = true }
  }, [mapDsId, String(cfgJs.mapWebMapItemId || '')])

  return (
    <div style={P.wrap}>

      {/* ═══ DATI ═══ */}
      <Acc id='dati' label='📊 Dati' open={isOpen('dati')} onToggle={()=>toggle('dati')}/>
      {isOpen('dati') && <div>
        <div style={P.hint}>Collega la fonte dati per abilitare la selezione dei campi nelle tab.</div>
        <DataSourceSelector
          types={(Immutable as any)([DataSourceTypes.FeatureLayer])}
          useDataSources={props.useDataSources}
          useDataSourcesEnabled={props.useDataSourcesEnabled}
          onChange={onDsChange}
          onToggleUseDataEnabled={onToggleDs}
          widgetId={props.id}
        />
        <div style={{...P.hint, marginTop:6}}>Il record selezionato arriva dinamicamente dal widget Elenco. La fonte dati serve solo per caricare lo schema campi nel setting.</div>
      </div>}

      {/* ═══ TITOLO ═══ */}
      <Acc id='titolo' label='📝 Titolo dettaglio' open={isOpen('titolo')} onToggle={()=>toggle('titolo')}/>
      {isOpen('titolo') && <div>
        <label style={P.lbl}>Testo prefisso</label>
        <Inp value={String(cfgJs.detailTitlePrefix || '')} onChange={v=>patch({detailTitlePrefix:v})} placeholder='Dettaglio rapporto n.'/>
        <div style={P.titleRow3}>
          <div style={P.compactCell}><label style={P.lbl}>Altezza</label><NumInp compact value={parseNum(cfgJs.detailTitleHeight, 40)} onChange={n=>patch({detailTitleHeight:n})} min={0} unit='px'/></div>
          <div style={P.compactCell}><label style={P.lbl}>Font sz</label><NumInp compact value={parseNum(cfgJs.detailTitleFontSize, 14)} onChange={n=>patch({detailTitleFontSize:n})} min={10} unit='px'/></div>
          <div style={P.compactCell}><label style={P.lbl}>Font w</label><NumInp compact value={parseNum(cfgJs.detailTitleFontWeight, 600)} onChange={n=>patch({detailTitleFontWeight:n})} min={100} step={100}/></div>
        </div>
        <div style={P.titleRow3}>
          <div style={P.compactCell}><label style={P.lbl}>Pad. bottom</label><NumInp compact value={parseNum(cfgJs.detailTitlePaddingBottom, 10)} onChange={n=>patch({detailTitlePaddingBottom:n})} min={0} unit='px'/></div>
          <div style={P.compactCell}><label style={P.lbl}>Pad. left</label><NumInp compact value={parseNum(cfgJs.detailTitlePaddingLeft, 0)} onChange={n=>patch({detailTitlePaddingLeft:n})} min={0} unit='px'/></div>
          <div style={P.compactCell}><label style={P.lbl}>Pad. right</label><NumInp compact value={parseNum(cfgJs.detailTitlePaddingRight, 0)} onChange={n=>patch({detailTitlePaddingRight:n})} min={0} unit='px'/></div>
        </div>
        <label style={P.lbl}>Colore testo</label>
        <ColInp value={String(cfgJs.detailTitleColor || 'rgba(0,0,0,0.85)')} onChange={v=>patch({detailTitleColor:v})}/>
        <label style={P.lbl}>Sfondo</label>
        <ColInp value={String(cfgJs.detailTitleBg || 'transparent')} onChange={v=>patch({detailTitleBg:v})}/>
      </div>}

      {/* ═══ CAMPI PER TAB ═══ */}
      <Acc id='campiTab' label='🗂 Campi per tab' open={isOpen('campiTab')} onToggle={()=>toggle('campiTab')}/>
      {isOpen('campiTab') && <div>
        <div style={P.hint}>I campi di default vengono pre-selezionati automaticamente per ogni tab.</div>
        <TabsManager tabs={tabs} onChange={(next)=>patch({tabs:next})}/>
        {tabs.filter((t:any)=>String(t.id)!=='azioni').map((tab:any, idx:number)=>(
          <div key={tab.id} style={{marginTop:10}}>
            <label style={P.lbl}>{tab.label}</label>
            <FieldPicker
              tab={tab}
              allFields={fields}
              onChange={(f)=>updateTab(idx,{fields:f})}
              onTabPatch={(patchTab)=>updateTab(idx,patchTab)}
            />
          </div>
        ))}
      </div>}

      {/* ═══ PRESET PER CAMPI ═══ */}
      <Acc id='presetCampi' label='💾 Preset per campi' open={isOpen('presetCampi')} onToggle={()=>toggle('presetCampi')}/>
      {isOpen('presetCampi') && <div>
        <div style={P.hint}>È preimpostato il preset <b style={{color:'#d1d5db'}}>Default</b> con i campi di default di ciascuna tab.</div>
        <PresetManager
          presets={effectivePresets}
          activePresetId={String(cfgJs.activePresetId || (effectivePresets[0]?.id || ''))}
          onSetActive={(id)=>patch({activePresetId:id})}
          onApply={(pr:any)=>patch({tabs:(Array.isArray(pr?.tabs)?pr.tabs:[]), activePresetId:String(pr?.id||'')})}
          onSaveNew={(name:string)=>{
            const id = `preset_${Date.now()}`
            const nextPreset = { id, name, tabs }
            patch({ presets:[...effectivePresets, nextPreset], activePresetId:id })
          }}
          onUpdateActive={(id:string)=>{
            const next = effectivePresets.map((pr:any)=>String(pr.id)===String(id)?{...pr,tabs}:pr)
            patch({ presets:next, activePresetId:id })
          }}
          onDelete={(id:string)=>{
            const next = effectivePresets.filter((pr:any)=>String(pr.id)!==String(id))
            patch({ presets:next, activePresetId: String(next[0]?.id || '') })
          }}
        />
      </div>}

      {/* ═══ MASCHERA ═══ */}
      <Acc id='maschera' label='🖼 Maschera (bordo pannello)' open={isOpen('maschera')} onToggle={()=>toggle('maschera')}/>
      {isOpen('maschera') && <div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Outer offset</label><NumInp value={parseNum(cfgJs.maskOuterOffset, 0)} onChange={n=>patch({maskOuterOffset:n})} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Inner padding</label><NumInp value={parseNum(cfgJs.maskInnerPadding ?? cfgJs.panelPadding, 12)} onChange={n=>patch({maskInnerPadding:n})} min={0} unit='px'/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Border width</label><NumInp value={parseNum(cfgJs.maskBorderWidth ?? cfgJs.panelBorderWidth, 1)} onChange={n=>patch({maskBorderWidth:n})} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Border radius</label><NumInp value={parseNum(cfgJs.maskBorderRadius ?? cfgJs.panelBorderRadius, 10)} onChange={n=>patch({maskBorderRadius:n})} min={0} unit='px'/></div>
        </div>
        <label style={P.lbl}>Background</label>
        <ColInp value={String(cfgJs.maskBg ?? cfgJs.panelBg ?? '#ffffff')} onChange={v=>patch({maskBg:v})}/>
        <label style={P.lbl}>Colore bordo</label>
        <ColInp value={String(cfgJs.maskBorderColor ?? cfgJs.panelBorderColor ?? '#e5e7eb')} onChange={v=>patch({maskBorderColor:v})}/>
      </div>}

      {/* ═══ NOTA SPESE ═══ */}
      <Acc id='notaSpese' label='💶 Nota spese' open={isOpen('notaSpese')} onToggle={()=>toggle('notaSpese')}/>
      {isOpen('notaSpese') && <div>
        <div style={P.hint}>Configurazione della scheda Nota spese in sola consultazione. I riepiloghi sono letti dai campi già salvati sul rapporto; il dettaglio voci viene caricato dalla tabella solo quando si apre la scheda.</div>
        <label style={P.lbl}>Tabella dettaglio nota spese</label>
        <Inp value={String(cfgJs.nsNotaSpeseDettaglioUrl || '')} onChange={v=>patch({nsNotaSpeseDettaglioUrl:v})} placeholder='https://.../FeatureServer/0'/>
        <div style={P.hint}>Inserire la URL della tabella GII_NOTA_SPESE_DETTAGLIO. Può restare vuota se si vogliono mostrare solo i totali già presenti sul rapporto.</div>
      </div>}

      {/* ═══ MAPPA ═══ */}
      <Acc id='mappa' label='🗺 Mappa' open={isOpen('mappa')} onToggle={()=>toggle('mappa')}/>
      {isOpen('mappa') && <div>
        <div style={P.hint}>Impostazioni della mappa custom nella tab Mappa del dettaglio pratiche.</div>

        <div style={P.grp}>Web map</div>
        <div style={P.hint}>Seleziona la web map già portata come origine dati, senza dipendere dai widget Mappa presenti nelle pagine.</div>
        <DataSourceSelector
          types={(Immutable as any)([DataSourceTypes.WebMap])}
          useDataSources={(Immutable as any)(asJs(cfgJs.mapUseDataSources || [])) as any}
          useDataSourcesEnabled={true}
          onChange={onMapDsChange}
          widgetId={props.id}
          mustUseDataSource
        />
        {!!String(cfgJs.mapWebMapLabel || cfgJs.mapWebMapItemId || '') && (
          <div style={{...P.hint, marginTop:6}}>Selezionata: <b style={{color:'#d1d5db'}}>{String(cfgJs.mapWebMapLabel || cfgJs.mapWebMapItemId)}</b></div>
        )}

        <label style={{...P.lbl, marginTop:12}}>Layer rapporti da filtrare nella mappa</label>
        <div ref={mapLayerMenuRef} style={{ position:'relative', marginTop:4 }}>
          <button
            type='button'
            onClick={() => setMapLayerMenuOpen(v => !v)}
            style={{ ...P.inp, textAlign:'left', cursor:'pointer', minHeight:30, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}
          >
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {mapLayerLoading
                ? 'Caricamento layer…'
                : selectedMapLayerOpt?.title || cfgJs.mapLayerTitle || (cfgJs.mapWebMapItemId ? '— seleziona layer —' : '— seleziona prima la WebMap —')}
            </span>
            <span style={{ fontSize:10, opacity:0.8 }}>{mapLayerMenuOpen ? '▲' : '▼'}</span>
          </button>
          {mapLayerMenuOpen && <div style={{
            position:'absolute', zIndex:999999, left:0, right:0, top:'calc(100% + 4px)', maxHeight:240, overflowY:'auto',
            background:'#111827', color:'#e5e7eb', border:'1px solid rgba(147,197,253,0.45)', borderRadius:6, boxShadow:'0 10px 24px rgba(0,0,0,0.35)', padding:4
          }}>
            <button type='button'
              onClick={() => { patch({ mapLayerTitle: '', mapLayerUrl: '', mapLayerId: '', mapLayerLayerId: '' }); setMapLayerMenuOpen(false) }}
              style={{...P.inp, border:'0', borderRadius:4, background:'transparent', color:'#cbd5e1', cursor:'pointer', textAlign:'left', padding:'7px 8px'}}>
              — nessuna selezione / fallback automatico —
            </button>
            {!cfgJs.mapWebMapItemId && <div style={{...P.hint, padding:'7px 8px'}}>Seleziona prima la WebMap.</div>}
            {cfgJs.mapWebMapItemId && mapLayerLoading && <div style={{...P.hint, padding:'7px 8px'}}>Caricamento layer…</div>}
            {cfgJs.mapWebMapItemId && !mapLayerLoading && mapLayerOptions.length === 0 && <div style={{...P.hint, padding:'7px 8px'}}>Nessun Feature Layer trovato.</div>}
            {mapLayerOptions.map(o => {
              const info = [o.geometryType ? o.geometryType.replace('esriGeometry', '') : '', o.url ? 'URL' : ''].filter(Boolean).join(' · ')
              const active = o.key === selectedMapLayerKey
              return <button key={o.key} type='button'
                onClick={() => { patch({ mapLayerTitle: o.title, mapLayerUrl: o.url, mapLayerId: o.id, mapLayerLayerId: o.layerId }); setMapLayerMenuOpen(false) }}
                style={{ width:'100%', border:'0', borderRadius:4, background: active ? 'rgba(59,130,246,0.28)' : 'transparent', color:'#e5e7eb', cursor:'pointer', textAlign:'left', padding:'7px 8px', fontSize:12 }}>
                <div style={{ fontWeight: active ? 700 : 500 }}>{o.title}</div>
                {info && <div style={{ fontSize:10.5, color:'#a0aec0', marginTop:2 }}>{info}</div>}
              </button>
            })}
          </div>}
        </div>
        {mapLayerError && <div style={{...P.hint, color:'#fca5a5'}}>{mapLayerError}</div>}
        {(cfgJs.mapLayerTitle || cfgJs.mapLayerUrl || cfgJs.mapLayerId) && <div style={{...P.hint, marginTop:6}}>Selezione attuale: {cfgJs.mapLayerTitle || '—'}{cfgJs.mapLayerUrl ? ` · ${cfgJs.mapLayerUrl}` : ''}</div>}

        <div style={P.grp}>Basemap</div>
        <Sel value={String(cfgJs.mapBasemap || 'topo-vector')} onChange={v=>patch({mapBasemap:v})} options={[
          {value:'topo-vector',label:'Topografica'},
          {value:'streets-vector',label:'Strade'},
          {value:'satellite',label:'Satellite'},
          {value:'hybrid',label:'Ibrida (satellite + etichette)'},
          {value:'dark-gray-vector',label:'Grigio scuro'},
          {value:'gray-vector',label:'Grigio chiaro'},
          {value:'osm',label:'OpenStreetMap'},
          {value:'terrain',label:'Terreno'},
          {value:'streets-navigation-vector',label:'Navigazione'},
          {value:'streets-night-vector',label:'Notturna'}
        ]}/>

        <div style={P.grp}>Vista iniziale</div>
        <div style={P.hint}>Centro e zoom della mappa quando nessun rapporto è selezionato o il rapporto non ha punto.</div>
        <div style={P.row3}>
          <div><label style={P.lbl}>Longitudine</label><Inp value={String(cfgJs.mapCenterLon ?? 9.0)} onChange={v=>patch({mapCenterLon:Number(v)||0})}/></div>
          <div><label style={P.lbl}>Latitudine</label><Inp value={String(cfgJs.mapCenterLat ?? 39.5)} onChange={v=>patch({mapCenterLat:Number(v)||0})}/></div>
          <div><label style={P.lbl}>Zoom iniziale</label><NumInp value={parseNum(cfgJs.mapInitZoom,8)} onChange={n=>patch({mapInitZoom:n})} min={1} max={23}/></div>
        </div>

        <div style={P.grp}>Zoom sul punto</div>
        <label style={P.lbl}>Livello di zoom</label>
        <NumInp value={parseNum(cfgJs.mapPointZoom,19)} onChange={n=>patch({mapPointZoom:n})} min={1} max={23}/>
        <div style={P.hint}>Zoom applicato quando la mappa centra sul punto del rapporto selezionato.</div>

        <div style={P.grp}>Marker</div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Colore</label><ColInp value={String(cfgJs.mapMarkerColor || '#dc2626')} onChange={v=>patch({mapMarkerColor:v})}/></div>
          <div><label style={P.lbl}>Dimensione (px)</label><NumInp value={parseNum(cfgJs.mapMarkerSize,18)} onChange={n=>patch({mapMarkerSize:n})} min={6} max={40}/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Colore bordo</label><ColInp value={String(cfgJs.mapMarkerOutlineColor || '#ffffff')} onChange={v=>patch({mapMarkerOutlineColor:v})}/></div>
          <div><label style={P.lbl}>Spessore bordo (px)</label><NumInp value={parseNum(cfgJs.mapMarkerOutlineWidth,2.5)} onChange={n=>patch({mapMarkerOutlineWidth:n})} min={0} max={8} step={0.5}/></div>
        </div>

        <div style={P.grp}>Controlli mappa</div>
        <Check value={cfgJs.mapShowZoom !== false} onChange={v=>patch({mapShowZoom:v})} label='Mostra controlli zoom (+/−)'/>
        <Check value={cfgJs.mapShowAttribution !== false} onChange={v=>patch({mapShowAttribution:v})} label='Mostra attribuzione (Esri)'/>
        <Check value={cfgJs.mapShowScaleBar === true} onChange={v=>patch({mapShowScaleBar:v})} label='Mostra barra di scala'/>
        <Check value={cfgJs.mapShowCompass === true} onChange={v=>patch({mapShowCompass:v})} label='Mostra bussola'/>
        <Check value={cfgJs.mapShowPopup !== false} onChange={v=>patch({mapShowPopup:v})} label='Abilita popup sul rapporto selezionato'/>
        <Check value={cfgJs.mapShowHome !== false} onChange={v=>patch({mapShowHome:v})} label='Mostra Home'/>
        <Check value={cfgJs.mapShowFullscreen !== false} onChange={v=>patch({mapShowFullscreen:v})} label='Mostra schermo intero'/>
        <Check value={cfgJs.mapShowLayerList === true} onChange={v=>patch({mapShowLayerList:v})} label='Mostra elenco layer'/>
      </div>}

      {/* ═══ RESET ═══ */}
      <div style={{marginTop:28,borderTop:'1px solid rgba(255,255,255,0.10)',paddingTop:16}}>
        <button type='button'
          onClick={()=>{if(window.confirm('Ripristinare tutti i valori predefiniti?'))props.onSettingChange({id:props.id,config:(Immutable as any)(defaultConfig) as any})}}
          style={{padding:'6px 14px',borderRadius:7,border:'1px solid rgba(252,165,165,0.4)',background:'rgba(239,68,68,0.10)',color:'#fca5a5',fontSize:12,cursor:'pointer',fontWeight:600}}>
          ↺ Ripristina predefiniti
        </button>
      </div>

    </div>
  )
}

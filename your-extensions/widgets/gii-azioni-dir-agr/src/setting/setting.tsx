/** @jsx jsx */
import { React, jsx, Immutable, DataSourceTypes, DataSourceManager, type UseDataSource } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import type { IMConfig, TabConfig } from '../config'
import { defaultConfig } from '../config'

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
  inp:   { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  grp:   { fontSize:11, fontWeight:700, color:'#93c5fd', marginTop:14, marginBottom:6, paddingBottom:4, borderBottom:'1px solid rgba(255,255,255,0.07)' } as React.CSSProperties,
}

const parseNum = (v:any, fb:number) => { const n=Number(v); return Number.isFinite(n)?n:fb }
function asJs<T=any>(v:any):T { return v?.asMutable?v.asMutable({deep:true}):v }
function normalizeStrArray(v:any):string[] { const a=Array.isArray(asJs(v))?asJs(v):[]; return a.map((x:any)=>String(x)).filter(Boolean) }

// ── Micro-componenti ──────────────────────────────────────────────────────────
function Inp(p: { value:string|number; onChange:(v:string)=>void; placeholder?:string }) {
  return <input type='text' value={p.value} onChange={e=>p.onChange(e.target.value)} placeholder={p.placeholder} style={P.inp}/>
}
function NumInp(p: { value:number; onChange:(v:number)=>void; min?:number; max?:number; step?:number; unit?:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <input type='number' value={p.value} min={p.min} max={p.max} step={p.step||1}
        onChange={e=>p.onChange(Number(e.target.value))} style={{ ...P.inp, width:68 }}/>
      {p.unit && <span style={{ fontSize:11, color:'#a0aec0', flexShrink:0 }}>{p.unit}</span>}
    </div>
  )
}
function ColInp(p: { value:string; onChange:(v:string)=>void }) {
  const hexVal = /^#[0-9a-fA-F]{3,8}$/.test(p.value) ? p.value : '#000000'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <input type='color' value={hexVal} onChange={e=>p.onChange(e.target.value)}
        style={{ width:30, height:26, padding:2, border:'1px solid rgba(255,255,255,0.15)', borderRadius:5, cursor:'pointer', background:'transparent', flexShrink:0 }}/>
      <input type='text' value={p.value} onChange={e=>p.onChange(e.target.value)}
        placeholder='#rrggbb o rgba(...)' style={{ ...P.inp, flex:1, fontSize:11 }}/>
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
  if(Array.isArray(cfg.tabs)&&cfg.tabs.length>0) return cfg.tabs.map((tab:any)=>({...tab,hideEmpty:tab.hideEmpty??(tab.id==='violazione')}))
  return [
    {id:'anagrafica',label:'Anagrafica',fields:Array.isArray(cfg.anagraficaFields)?cfg.anagraficaFields:[],hideEmpty:false},
    {id:'violazione',label:'Violazione',fields:Array.isArray(cfg.violazioneFields)?cfg.violazioneFields:[],hideEmpty:true},
    {id:'iter',label:'Iter',fields:Array.isArray(cfg.iterExtraFields)?cfg.iterExtraFields:[],isIterTab:true,hideEmpty:false},
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
  const baseCfg = props.config || (Immutable(defaultConfig) as any)

  const patch = (obj:Record<string,any>) => {
    let next = baseCfg
    Object.entries(obj).forEach(([k,v])=>{
      if(['rejectReasons','tabs','anagraficaFields','violazioneFields','allegatiFields','iterExtraFields','presets'].includes(k))
        next=next.set(k,Immutable((v||[]) as any) as any)
      else next=next.set(k,v)
    })
    props.onSettingChange({id:props.id,config:next})
  }

  const onDsChange = (useDataSources:UseDataSource[]) => props.onSettingChange({id:props.id,useDataSources:useDataSources as any})
  const onToggleDs = (useDataSourcesEnabled:boolean) => props.onSettingChange({id:props.id,useDataSourcesEnabled})

  const useDsJs:any[] = asJs(props.useDataSources??Immutable([])) || []
  const primaryDsId = String(useDsJs?.[0]?.dataSourceId||'')
  const [fields, setFields] = React.useState<FieldOpt[]>([])

  React.useEffect(()=>{
    let cancelled=false
    const load=async()=>{
      if(!primaryDsId){if(!cancelled)setFields([]);return}
      try{
        const ds:any=DataSourceManager.getInstance().getDataSource(primaryDsId)
        const fobj=ds?.getSchema?.()?.fields||{}
        const opts:FieldOpt[]=Object.keys(fobj).map(name=>{const f=fobj[name]||{};return{name,alias:String(f.alias||f.label||f.title||name),type:String(f.type||'')}})
          .sort((a,b)=>(a.alias||a.name).localeCompare(b.alias||b.name,'it',{sensitivity:'base'}))
        if(!cancelled)setFields(opts)
      }catch{if(!cancelled)setFields([])}
    }
    load();return()=>{cancelled=true}
  },[primaryDsId])

  const reasons = normalizeStrArray(cfgJs.rejectReasons??defaultConfig.rejectReasons)
  const tabs = migrateLegacyFields(cfgJs)
  const updateTab=(i:number,upd:Partial<TabConfig>)=>patch({tabs:tabs.map((t,j)=>j===i?{...t,...upd}:t)})

  return (
    <div style={P.wrap}>

      {/* ═══ DATI ═══ */}
      <Acc id='dati' label='📊 Dati' open={isOpen('dati')} onToggle={()=>toggle('dati')}/>
      {isOpen('dati') && <div>
        <DataSourceSelector widgetId={props.id} types={Immutable([DataSourceTypes.FeatureLayer])}
          isMultiple useDataSources={props.useDataSources as any}
          useDataSourcesEnabled={props.useDataSourcesEnabled}
          onToggleUseDataEnabled={onToggleDs} onChange={onDsChange} mustUseDataSource/>
        <div style={P.hint}>Seleziona una o più Data View / feature layer.</div>
        <label style={P.lbl}>Ruolo</label>
        <Sel value={(cfgJs.roleCode||'DT').toUpperCase()} onChange={v=>patch({roleCode:v})}
          options={[{value:'DT',label:'DT – Direttore Tecnico'},{value:'DA',label:'DA – Direttore Amministrativo'}]}/>
        <label style={P.lbl}>Testo pulsante "Prendi in carico"</label>
        <Inp value={cfgJs.buttonText??defaultConfig.buttonText} onChange={v=>patch({buttonText:v})}/>
      </div>}

      {/* ═══ TAB ═══ */}
      <Acc id='tab' label='📑 Gestione Tab' open={isOpen('tab')} onToggle={()=>toggle('tab')}/>
      {isOpen('tab') && <div>
        <div style={P.hint}>Modifica nomi, aggiungi/rimuovi tab, trascina ☰ per riordinare.</div>
        <div style={{marginTop:8}}>
          <TabsManager tabs={tabs} onChange={newTabs=>patch({tabs:newTabs})}/>
        </div>
      </div>}

      {/* ═══ CAMPI PER TAB ═══ */}
      <Acc id='campi' label='🗂 Campi per Tab' open={isOpen('campi')} onToggle={()=>toggle('campi')}/>
      {isOpen('campi') && <div>
        {!primaryDsId
          ? <div style={P.hint}>Seleziona prima un Data Source.</div>
          : tabs.filter(t=>t.id!=='azioni').map((tab,idx)=>(
              <div key={tab.id}>
                <label style={P.lbl}>{tab.label}</label>
                <FieldPicker tab={tab} allFields={fields}
                  onChange={f=>updateTab(tabs.findIndex(t=>t.id===tab.id),{fields:f})}
                  onTabPatch={upd=>updateTab(tabs.findIndex(t=>t.id===tab.id),upd)}/>
              </div>
            ))
        }
      </div>}

      {/* ═══ PRESET ═══ */}
      <Acc id='preset' label='💾 Preset campi' open={isOpen('preset')} onToggle={()=>toggle('preset')}/>
      {isOpen('preset') && <div>
        <div style={P.hint}>Salva/carica set di campi per le TAB (utile per ruoli diversi).</div>
        <div style={{marginTop:8}}>
          <PresetManager
            presets={cfgJs.presets||[]}
            activePresetId={String(cfgJs.activePresetId||'')}
            onSetActive={id=>patch({activePresetId:id})}
            onApply={pr=>{
              if(Array.isArray(pr.tabs)) patch({tabs:pr.tabs,activePresetId:pr.id||''})
              else patch({tabs:migrateLegacyFields({anagraficaFields:pr.anagraficaFields||[],violazioneFields:pr.violazioneFields||[],allegatiFields:pr.allegatiFields||[],iterExtraFields:pr.iterExtraFields||[]}),activePresetId:pr.id||''})
            }}
            onSaveNew={name=>{const id=String(Date.now());patch({presets:[...(cfgJs.presets||[]),{id,name,tabs}],activePresetId:id})}}
            onUpdateActive={id=>patch({presets:(cfgJs.presets||[]).map((pr:any)=>pr.id===id?{...pr,tabs}:pr)})}
            onDelete={id=>{const next=(cfgJs.presets||[]).filter((pr:any)=>pr.id!==id);patch({presets:next,activePresetId:String(cfgJs.activePresetId||'')===id?'':String(cfgJs.activePresetId||'')})}}
          />
        </div>
      </div>}

      {/* ═══ TITOLO PRATICA ═══ */}
      <Acc id='titolo' label='📝 Titolo pratica' open={isOpen('titolo')} onToggle={()=>toggle('titolo')}/>
      {isOpen('titolo') && <div>
        <label style={P.lbl}>Testo</label>
        <Inp value={cfgJs.detailTitlePrefix??defaultConfig.detailTitlePrefix} onChange={v=>patch({detailTitlePrefix:v})}/>
        <div style={P.row3}>
          <div><label style={P.lbl}>Altezza</label><NumInp value={parseNum(cfgJs.detailTitleHeight,defaultConfig.detailTitleHeight)} onChange={n=>patch({detailTitleHeight:n})} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Font sz</label><NumInp value={parseNum(cfgJs.detailTitleFontSize,defaultConfig.detailTitleFontSize)} onChange={n=>patch({detailTitleFontSize:n})} min={10} unit='px'/></div>
          <div><label style={P.lbl}>Font w</label><NumInp value={parseNum(cfgJs.detailTitleFontWeight,defaultConfig.detailTitleFontWeight)} onChange={n=>patch({detailTitleFontWeight:n})} min={100} step={100}/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Pad. bottom</label><NumInp value={parseNum(cfgJs.detailTitlePaddingBottom,defaultConfig.detailTitlePaddingBottom)} onChange={n=>patch({detailTitlePaddingBottom:n})} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Pad. left</label><NumInp value={parseNum(cfgJs.detailTitlePaddingLeft,defaultConfig.detailTitlePaddingLeft)} onChange={n=>patch({detailTitlePaddingLeft:n})} min={0} unit='px'/></div>
        </div>
        <label style={P.lbl}>Colore testo</label>
        <ColInp value={String(cfgJs.detailTitleColor??defaultConfig.detailTitleColor)} onChange={v=>patch({detailTitleColor:v})}/>
      </div>}

      {/* ═══ MASCHERA ═══ */}
      <Acc id='maschera' label='🖼 Maschera' open={isOpen('maschera')} onToggle={()=>toggle('maschera')}/>
      {isOpen('maschera') && <div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Outer offset</label><NumInp value={parseNum(cfgJs.maskOuterOffset,defaultConfig.maskOuterOffset)} onChange={n=>patch({maskOuterOffset:n})} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Inner padding</label><NumInp value={parseNum(cfgJs.maskInnerPadding,defaultConfig.maskInnerPadding)} onChange={n=>patch({maskInnerPadding:n,panelPadding:n})} min={0} unit='px'/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Border width</label><NumInp value={parseNum(cfgJs.maskBorderWidth,defaultConfig.maskBorderWidth)} onChange={n=>patch({maskBorderWidth:n,panelBorderWidth:n})} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Border radius</label><NumInp value={parseNum(cfgJs.maskBorderRadius,defaultConfig.maskBorderRadius)} onChange={n=>patch({maskBorderRadius:n,panelBorderRadius:n})} min={0} unit='px'/></div>
        </div>
        <label style={P.lbl}>Sfondo</label>
        <ColInp value={String(cfgJs.maskBg??defaultConfig.maskBg)} onChange={v=>patch({maskBg:v,panelBg:v})}/>
        <label style={P.lbl}>Colore bordo</label>
        <ColInp value={String(cfgJs.maskBorderColor??defaultConfig.maskBorderColor)} onChange={v=>patch({maskBorderColor:v,panelBorderColor:v})}/>
        <label style={P.lbl}>Colore divisori</label>
        <ColInp value={String(cfgJs.dividerColor??defaultConfig.dividerColor)} onChange={v=>patch({dividerColor:v})}/>
      </div>}

      {/* ═══ TESTI ═══ */}
      <Acc id='testi' label='🔤 Testi' open={isOpen('testi')} onToggle={()=>toggle('testi')}/>
      {isOpen('testi') && <div>
        <div style={P.row3}>
          <div><label style={P.lbl}>Titolo</label><NumInp value={parseNum(cfgJs.titleFontSize,defaultConfig.titleFontSize)} onChange={n=>patch({titleFontSize:n})} min={10} unit='px'/></div>
          <div><label style={P.lbl}>Stato</label><NumInp value={parseNum(cfgJs.statusFontSize,defaultConfig.statusFontSize)} onChange={n=>patch({statusFontSize:n})} min={10} unit='px'/></div>
          <div><label style={P.lbl}>Messaggi</label><NumInp value={parseNum(cfgJs.msgFontSize,defaultConfig.msgFontSize)} onChange={n=>patch({msgFontSize:n})} min={10} unit='px'/></div>
        </div>
      </div>}

      {/* ═══ COLORI PULSANTI ═══ */}
      <Acc id='colori' label='🎨 Colori pulsanti' open={isOpen('colori')} onToggle={()=>toggle('colori')}/>
      {isOpen('colori') && <div>
        {([['takeColor','Prendi in carico'],['integrazioneColor','Integrazione'],['approvaColor','Approva'],['respingiColor','Respingi'],['trasmettiColor','Trasmetti a DA']] as const).map(([k,lbl])=>(
          <div key={k}><label style={P.lbl}>{lbl}</label><ColInp value={String(cfgJs[k]??defaultConfig[k])} onChange={v=>patch({[k]:v})}/></div>
        ))}
      </div>}

      {/* ═══ MOTIVAZIONI ═══ */}
      <Acc id='motivazioni' label='📋 Motivazioni respinta' open={isOpen('motivazioni')} onToggle={()=>toggle('motivazioni')}/>
      {isOpen('motivazioni') && <div>
        <div style={P.hint}>Voci del menu "Motivazione" quando si respinge una pratica.</div>
        <div style={{marginTop:8,display:'grid',gap:6}}>
          {reasons.map((r:string,idx:number)=>(
            <div key={idx} style={{display:'flex',gap:6}}>
              <input type='text' style={{...P.inp,flex:1}} value={r}
                onChange={e=>{const next=reasons.slice();next[idx]=e.target.value;patch({rejectReasons:next})}}/>
              <button type='button'
                style={{border:'1px solid rgba(252,165,165,0.3)',background:'rgba(239,68,68,0.10)',borderRadius:5,padding:'3px 8px',cursor:'pointer',color:'#fca5a5',fontSize:12}}
                onClick={()=>{const next=reasons.slice();next.splice(idx,1);patch({rejectReasons:next})}}>✕</button>
            </div>
          ))}
        </div>
        <button type='button' onClick={()=>patch({rejectReasons:[...reasons,'']})}
          style={{marginTop:8,width:'100%',padding:'6px',borderRadius:8,border:'1px dashed rgba(147,197,253,0.4)',background:'rgba(59,130,246,0.08)',color:'#93c5fd',cursor:'pointer',fontSize:12,fontWeight:600}}>
          ＋ Aggiungi voce
        </button>
      </div>}

      {/* ═══ EDITING TI ═══ */}
      <Acc id='editing' label='✏️ Editing TI' open={isOpen('editing')} onToggle={()=>toggle('editing')}/>
      {isOpen('editing') && <div>
        <Check value={cfgJs.showEditButtons!==false} onChange={v=>patch({showEditButtons:v})} label='Mostra pulsanti Modifica'/>
        <div style={P.row2}>
          <div><label style={P.lbl}>Colore overlay</label><ColInp value={String(cfgJs.editOverlayColor??defaultConfig.editOverlayColor)} onChange={v=>patch({editOverlayColor:v})}/></div>
          <div><label style={P.lbl}>Colore pagina</label><ColInp value={String(cfgJs.editPageColor??defaultConfig.editPageColor)} onChange={v=>patch({editPageColor:v})}/></div>
        </div>
        <label style={P.lbl}>Pagina editing (ID ExB)</label>
        <Inp value={cfgJs.editPageId??defaultConfig.editPageId} onChange={v=>patch({editPageId:v})} placeholder='editing-ti'/>
        <div style={P.grp}>Campi e condizioni</div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Campo stato TI</label><Inp value={cfgJs.fieldStatoTI??defaultConfig.fieldStatoTI} onChange={v=>patch({fieldStatoTI:v})}/></div>
          <div><label style={P.lbl}>Campo presa TI</label><Inp value={cfgJs.fieldPresaTI??defaultConfig.fieldPresaTI} onChange={v=>patch({fieldPresaTI:v})}/></div>
        </div>
        <div style={P.row3}>
          <div><label style={P.lbl}>Val. presa req.</label><NumInp value={parseNum(cfgJs.editPresaRequiredVal,defaultConfig.editPresaRequiredVal)} onChange={n=>patch({editPresaRequiredVal:n})} min={0}/></div>
          <div><label style={P.lbl}>Stato min</label><NumInp value={parseNum(cfgJs.editMinStato,defaultConfig.editMinStato)} onChange={n=>patch({editMinStato:n})} min={0}/></div>
          <div><label style={P.lbl}>Stato max</label><NumInp value={parseNum(cfgJs.editMaxStato,defaultConfig.editMaxStato)} onChange={n=>patch({editMaxStato:n})} min={0}/></div>
        </div>
        <div style={P.hint}>Il pulsante è attivo solo se stato_TI è tra min e max (inclusi) e presa = val. richiesto.</div>
      </div>}

      {/* ═══ RESET ═══ */}
      <div style={{marginTop:28,borderTop:'1px solid rgba(255,255,255,0.10)',paddingTop:16}}>
        <button type='button'
          onClick={()=>{if(window.confirm('Ripristinare tutti i valori predefiniti?'))props.onSettingChange({id:props.id,config:Immutable(defaultConfig) as any})}}
          style={{padding:'6px 14px',borderRadius:7,border:'1px solid rgba(252,165,165,0.4)',background:'rgba(239,68,68,0.10)',color:'#fca5a5',fontSize:12,cursor:'pointer',fontWeight:600}}>
          ↺ Ripristina predefiniti
        </button>
      </div>
    </div>
  )
}

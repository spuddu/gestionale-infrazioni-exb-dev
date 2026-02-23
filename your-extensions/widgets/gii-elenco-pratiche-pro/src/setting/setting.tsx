/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, Immutable, DataSourceTypes, DataSourceManager } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'
import { IMConfig, defaultConfig, DEFAULT_COLUMNS } from '../config'
import type { ColumnDef } from '../config'

type Props = AllWidgetSettingProps<IMConfig>
type FieldOpt = { name: string; alias: string; type?: string }

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

const VIRTUAL_FIELDS: FieldOpt[] = [
  { name:'__stato_sint__', alias:'⚙ Stato sintetico (calcolato)', type:'virtual' },
  { name:'__ultimo_agg__', alias:'⚙ Ultimo aggiornamento (calcolato)', type:'virtual' },
  { name:'__prossima__',   alias:'⚙ Prossima azione (calcolato)', type:'virtual' },
]
function FieldSel(p: { value:string; fields:FieldOpt[]; onChange:(v:string)=>void; placeholder?:string; virtual?:boolean }) {
  if(!p.fields.length) return <Inp value={p.value} onChange={p.onChange} placeholder={p.placeholder||'nome campo'}/>
  return (
    <select style={P.inp} value={p.value} onChange={e=>p.onChange(e.target.value)}>
      <option value=''>— seleziona —</option>
      {p.virtual && <optgroup label='Calcolati'>{VIRTUAL_FIELDS.map(f=><option key={f.name} value={f.name}>{f.alias}</option>)}</optgroup>}
      <optgroup label='Layer'>{p.fields.map(f=><option key={f.name} value={f.name}>{f.alias} ({f.name})</option>)}</optgroup>
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

function StatoColors(p: { label:string; bg:string; onBg:(v:string)=>void; text:string; onText:(v:string)=>void; border:string; onBorder:(v:string)=>void }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:11, fontWeight:600, color:'#d1d5db', marginBottom:5 }}>{p.label}</div>
      <div style={P.row3}>
        <div><div style={{ fontSize:10, color:'#a0aec0', marginBottom:3 }}>Sfondo</div><ColInp value={p.bg} onChange={p.onBg}/></div>
        <div><div style={{ fontSize:10, color:'#a0aec0', marginBottom:3 }}>Testo</div><ColInp value={p.text} onChange={p.onText}/></div>
        <div><div style={{ fontSize:10, color:'#a0aec0', marginBottom:3 }}>Bordo</div><ColInp value={p.border} onChange={p.onBorder}/></div>
      </div>
    </div>
  )
}

function ColumnManager(p: { columns:ColumnDef[]; allFields:FieldOpt[]; onChange:(c:ColumnDef[])=>void }) {
  const cols = Array.isArray(p.columns) ? p.columns : []
  const [dragFrom, setDragFrom] = React.useState<number|null>(null)
  const [dragOver, setDragOver] = React.useState<number|null>(null)
  const upd = (i:number, patch:Partial<ColumnDef>) => p.onChange(cols.map((c,j)=>j===i?{...c,...patch}:c))
  const rem = (i:number) => p.onChange(cols.filter((_,j)=>j!==i))
  const add = () => p.onChange([...cols,{id:`col_${Date.now()}`,label:'Nuova colonna',field:'',width:150}])
  const move = (from:number, to:number) => {
    if(from===to||to<0||to>=cols.length) return
    const a=[...cols];const [m]=a.splice(from,1);a.splice(to,0,m);p.onChange(a)
  }
  const cb:React.CSSProperties = { padding:'10px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.10)', background:'rgba(255,255,255,0.04)', marginBottom:8 }
  const ch:React.CSSProperties = { ...cb, borderColor:'#93c5fd', background:'rgba(59,130,246,0.10)' }
  const fi:React.CSSProperties = { ...P.inp, fontSize:12 }
  const btn:React.CSSProperties = { border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', borderRadius:5, cursor:'pointer', fontSize:11, padding:'3px 6px', color:'#d1d5db' }
  const rb:React.CSSProperties  = { ...btn, borderColor:'rgba(252,165,165,0.3)', background:'rgba(239,68,68,0.10)', color:'#fca5a5' }
  return (
    <div style={{width:'100%'}}>
      {cols.map((col,idx)=>(
        <div key={col.id} draggable
          onDragStart={()=>setDragFrom(idx)} onDragOver={e=>{e.preventDefault();setDragOver(idx)}}
          onDrop={()=>{if(dragFrom!==null&&dragFrom!==idx)move(dragFrom,idx);setDragFrom(null);setDragOver(null)}}
          onDragEnd={()=>{setDragFrom(null);setDragOver(null)}}
          style={{...(dragOver===idx?ch:cb),opacity:dragFrom===idx?0.45:1}}>
          <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8}}>
            <span style={{cursor:'grab',fontSize:14,color:'rgba(255,255,255,0.35)',userSelect:'none'}}>☰</span>
            <span style={{flex:1,fontSize:11,fontWeight:700,color:'#93c5fd'}}>Col. {idx+1}</span>
            <button type='button' style={btn} disabled={idx===0} onClick={()=>move(idx,idx-1)}>▲</button>
            <button type='button' style={btn} disabled={idx===cols.length-1} onClick={()=>move(idx,idx+1)}>▼</button>
            <button type='button' style={rb} onClick={()=>rem(idx)}>✕</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 64px',gap:6,marginBottom:6}}>
            <div>
              <div style={{fontSize:10,color:'#a0aec0',marginBottom:3}}>Intestazione</div>
              <input type='text' style={fi} value={col.label} onChange={e=>upd(idx,{label:e.target.value})} placeholder='Intestazione'/>
            </div>
            <div>
              <div style={{fontSize:10,color:'#a0aec0',marginBottom:3}}>Largh.</div>
              <input type='number' style={{...fi,textAlign:'center'}} value={col.width} min={40} step={10} onChange={e=>upd(idx,{width:parseNum(e.target.value,120)})}/>
            </div>
          </div>
          <div style={{fontSize:10,color:'#a0aec0',marginBottom:3}}>Campo</div>
          <select style={fi} value={col.field} onChange={e=>upd(idx,{field:e.target.value})}>
            <option value=''>— seleziona —</option>
            <optgroup label='Calcolati'>{VIRTUAL_FIELDS.map(f=><option key={f.name} value={f.name}>{f.alias}</option>)}</optgroup>
            <optgroup label='Layer'>{(p.allFields||[]).map(f=><option key={f.name} value={f.name}>{f.alias} ({f.name})</option>)}</optgroup>
          </select>
        </div>
      ))}
      <div style={{display:'flex',gap:6,marginTop:4}}>
        <button type='button' onClick={add}
          style={{flex:1,padding:'6px',borderRadius:8,border:'1px dashed rgba(147,197,253,0.4)',background:'rgba(59,130,246,0.08)',color:'#93c5fd',cursor:'pointer',fontSize:12,fontWeight:600}}>
          ＋ Aggiungi
        </button>
        <button type='button' onClick={()=>p.onChange(DEFAULT_COLUMNS.map(c=>({...c})))}
          style={{padding:'6px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.05)',color:'#d1d5db',cursor:'pointer',fontSize:11}}>
          Reset
        </button>
      </div>
      {!cols.length && <div style={{...P.hint,marginTop:8}}>Nessuna colonna. Premi Reset.</div>}
    </div>
  )
}

export default function Setting(props: Props) {
  const cfgImm: any = props.config ?? defaultConfig
  const cfg: any = { ...asJs(defaultConfig), ...asJs(cfgImm) }
  const [openSec, setOpenSec] = React.useState<string>('dati')
  const toggle = (id:string) => setOpenSec(s=>s===id?'':id)
  const isOpen = (id:string) => openSec===id

  const update = (key:string, value:any) => {
    props.onSettingChange({ id:props.id, config:cfgImm.set?cfgImm.set(key,value):Immutable(cfgImm).set(key,value) })
  }

  const dsTypes = Immutable([DataSourceTypes.FeatureLayer]) as any
  const onDsChange = (useDataSources:any) => {
    const udsJs:any[]=asJs(useDataSources??Immutable([]))
    const prevTabs:any[]=asJs(cfgImm.filterTabs??Immutable([]))
    const dsm=DataSourceManager.getInstance()
    const nextTabs=udsJs.map(u=>{
      const dsId=String(u?.dataSourceId||'')
      const prev=prevTabs.find(t=>String(t?.dataSourceId||'')===dsId)
      if(prev) return prev
      let label='';try{const ds:any=dsm.getDataSource(dsId);label=String(ds?.getLabel?.()||'')}catch{}
      label=label&&label.trim()?label.trim():'Filtro'
      return {dataSourceId:dsId,label}
    })
    const c=cfgImm.set?cfgImm:Immutable(cfgImm)
    props.onSettingChange({id:props.id,useDataSources,config:c.set('filterTabs',nextTabs)})
  }

  const useDsImm:any=props.useDataSources??Immutable([])
  const useDsJs:any[]=asJs(useDsImm)
  const primaryDsId=String(useDsJs?.[0]?.dataSourceId||'')
  const [fields,setFields]=React.useState<FieldOpt[]>([])

  React.useEffect(()=>{
    let cancelled=false
    const load=async()=>{
      if(!primaryDsId){if(!cancelled)setFields([]);return}
      try{
        const ds:any=DataSourceManager.getInstance().getDataSource(primaryDsId)
        const fobj=ds?.getSchema?.()?.fields||{}
        const opts:FieldOpt[]=Object.keys(fobj).map(name=>{const f=fobj[name]||{};return{name,alias:String(f.alias||name),type:String(f.type||'')}})
          .sort((a,b)=>(a.alias||a.name).localeCompare(b.alias||b.name,'it',{sensitivity:'base'}))
        if(!cancelled)setFields(opts)
      }catch{if(!cancelled)setFields([])}
    }
    load();return ()=>{cancelled=true}
  },[primaryDsId])

  const cfgJs:any=cfg
  const columns=(()=>{
    const raw=cfgJs?.columns;const cols:any[]=asJs(raw)
    if(Array.isArray(cols)&&cols.length>0) return cols.map((c:any)=>({id:String(c.id||`col_${Math.random().toString(36).slice(2,8)}`),label:String(c.label||''),field:String(c.field||''),width:parseNum(c.width,150)}))
    return DEFAULT_COLUMNS.map(c=>({...c}))
  })()

  return (
    <div style={P.wrap}>

      <Acc id='dati' label='📊 Fonte dati' open={isOpen('dati')} onToggle={()=>toggle('dati')}/>
      {isOpen('dati') && <div>
        <DataSourceSelector widgetId={props.id} useDataSources={props.useDataSources as any}
          types={dsTypes} isMultiple={true} mustUseDataSource={true} onChange={onDsChange}/>
        <div style={P.hint}>Più datasource → filtri come schede.</div>
        {useDsJs.length>1 && <>
          <div style={P.grp}>Etichette schede</div>
          {(()=>{
            const tabs=asJs(cfg.filterTabs??Immutable([]))as any[]
            const grouped:{label:string;items:{dsId:string}[]}[]=[]
            const labelMap:Record<string,number>={}
            useDsJs.forEach(u=>{
              const dsId=String(u?.dataSourceId||'')
              const tab=tabs.find(t=>String(t?.dataSourceId||'')===dsId)
              const label=String(tab?.label||'Filtro')
              if(labelMap[label]!=null){grouped[labelMap[label]].items.push({dsId})}
              else{labelMap[label]=grouped.length;grouped.push({label,items:[{dsId}]})}
            })
            return grouped.map((g,gi)=>(
              <div key={gi} style={{marginBottom:8}}>
                <label style={P.lbl}>Tab: {g.label} <span style={{fontWeight:400,opacity:0.6}}>({g.items.length} DS)</span></label>
                <input style={P.inp} value={g.label} placeholder='Etichetta'
                  onChange={e=>{
                    const v=e.target.value
                    const newTabs=tabs.map(t=>({...t}))
                    g.items.forEach(item=>{
                      const ti=newTabs.findIndex(t=>String(t?.dataSourceId||'')===item.dsId)
                      if(ti>=0)newTabs[ti].label=v;else newTabs.push({dataSourceId:item.dsId,label:v})
                    })
                    update('filterTabs',newTabs)
                  }}/>
              </div>
            ))
          })()}
        </>}
      </div>}

      <Acc id='colonne' label='📋 Colonne' open={isOpen('colonne')} onToggle={()=>toggle('colonne')}/>
      {isOpen('colonne') && <div>
        <div style={{...P.hint,marginBottom:10}}>Aggiungi, rimuovi e riordina. Trascina ☰ o usa ▲▼.</div>
        <ColumnManager columns={columns} allFields={fields} onChange={newCols=>update('columns',newCols)}/>
      </div>}

      <Acc id='query' label='🔍 Query e ordinamento' open={isOpen('query')} onToggle={()=>toggle('query')}/>
      {isOpen('query') && <div>
        <label style={P.lbl}>Where clause</label>
        <Inp value={cfg.whereClause||''} onChange={v=>update('whereClause',v)} placeholder='1=1'/>
        <div style={P.row2}>
          <div><label style={P.lbl}>Page size</label><NumInp value={cfg.pageSize} onChange={n=>update('pageSize',n)} min={1}/></div>
          <div><label style={P.lbl}>Direzione</label><Sel value={String(cfg.orderByDir||'DESC')} onChange={v=>update('orderByDir',v)} options={[{value:'DESC',label:'DESC'},{value:'ASC',label:'ASC'}]}/></div>
        </div>
        <label style={P.lbl}>Ordina per</label>
        <FieldSel value={cfg.orderByField} fields={fields} onChange={v=>update('orderByField',v)} placeholder='objectid'/>
        <Check value={cfg.showHeader!==false} onChange={v=>update('showHeader',v)} label='Mostra intestazioni colonne'/>
      </div>}

      <Acc id='campi' label='🗂 Mapping campi' open={isOpen('campi')} onToggle={()=>toggle('campi')}/>
      {isOpen('campi') && <div>
        <div style={P.grp}>Campi base</div>
        <label style={P.lbl}>N. pratica</label><FieldSel value={cfg.fieldPratica} fields={fields} onChange={v=>update('fieldPratica',v)}/>
        <label style={P.lbl}>Data rilevazione</label><FieldSel value={cfg.fieldDataRilevazione} fields={fields} onChange={v=>update('fieldDataRilevazione',v)}/>
        <label style={P.lbl}>Ufficio</label><FieldSel value={cfg.fieldUfficio} fields={fields} onChange={v=>update('fieldUfficio',v)}/>

        <div style={P.grp}>DT (Direttore Tecnico/Agrario)</div>
        <div style={P.row2}>
          <div><label style={P.lbl}>presa_in_carico</label><FieldSel value={cfg.fieldPresaDT} fields={fields} onChange={v=>update('fieldPresaDT',v)}/></div>
          <div><label style={P.lbl}>dt_presa_in_carico</label><FieldSel value={cfg.fieldDtPresaDT} fields={fields} onChange={v=>update('fieldDtPresaDT',v)}/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>stato</label><FieldSel value={cfg.fieldStatoDT} fields={fields} onChange={v=>update('fieldStatoDT',v)}/></div>
          <div><label style={P.lbl}>dt_stato</label><FieldSel value={cfg.fieldDtStatoDT} fields={fields} onChange={v=>update('fieldDtStatoDT',v)}/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>esito</label><FieldSel value={cfg.fieldEsitoDT} fields={fields} onChange={v=>update('fieldEsitoDT',v)}/></div>
          <div><label style={P.lbl}>dt_esito</label><FieldSel value={cfg.fieldDtEsitoDT} fields={fields} onChange={v=>update('fieldDtEsitoDT',v)}/></div>
        </div>

        <div style={P.grp}>DA (Direttore Area Amministrativa)</div>
        <div style={P.row2}>
          <div><label style={P.lbl}>presa_in_carico</label><FieldSel value={cfg.fieldPresaDA} fields={fields} onChange={v=>update('fieldPresaDA',v)}/></div>
          <div><label style={P.lbl}>dt_presa_in_carico</label><FieldSel value={cfg.fieldDtPresaDA} fields={fields} onChange={v=>update('fieldDtPresaDA',v)}/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>stato</label><FieldSel value={cfg.fieldStatoDA} fields={fields} onChange={v=>update('fieldStatoDA',v)}/></div>
          <div><label style={P.lbl}>dt_stato</label><FieldSel value={cfg.fieldDtStatoDA} fields={fields} onChange={v=>update('fieldDtStatoDA',v)}/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>esito</label><FieldSel value={cfg.fieldEsitoDA} fields={fields} onChange={v=>update('fieldEsitoDA',v)}/></div>
          <div><label style={P.lbl}>dt_esito</label><FieldSel value={cfg.fieldDtEsitoDA} fields={fields} onChange={v=>update('fieldDtEsitoDA',v)}/></div>
        </div>
      </div>}

      <Acc id='domini' label='🏷 Domini e label' open={isOpen('domini')} onToggle={()=>toggle('domini')}/>
      {isOpen('domini') && <div>
        <div style={P.grp}>Presa in carico</div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Val. "Da prendere"</label><NumInp value={cfg.presaDaPrendereVal} onChange={n=>update('presaDaPrendereVal',n)}/></div>
          <div><label style={P.lbl}>Val. "Presa"</label><NumInp value={cfg.presaPresaVal} onChange={n=>update('presaPresaVal',n)}/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Label "Da prendere"</label><Inp value={cfg.labelPresaDaPrendere||''} onChange={v=>update('labelPresaDaPrendere',v)}/></div>
          <div><label style={P.lbl}>Label "Presa"</label><Inp value={cfg.labelPresaPresa||''} onChange={v=>update('labelPresaPresa',v)}/></div>
        </div>
        <div style={P.grp}>Stato (1..5)</div>
        {([['statoDaPrendereVal','labelStatoDaPrendere','Da prendere'],['statoPresaVal','labelStatoPresa','Presa in carico'],['statoIntegrazioneVal','labelStatoIntegrazione','Integrazione'],['statoApprovataVal','labelStatoApprovata','Approvata'],['statoRespintaVal','labelStatoRespinta','Respinta']] as const).map(([vk,lk,name])=>(
          <div key={vk} style={P.row2}>
            <div><label style={P.lbl}>{name} (val)</label><NumInp value={cfg[vk]} onChange={n=>update(vk,n)}/></div>
            <div><label style={P.lbl}>Label</label><Inp value={cfg[lk]||''} onChange={v=>update(lk,v)}/></div>
          </div>
        ))}
        <div style={P.grp}>Esito (1..3)</div>
        {([['esitoIntegrazioneVal','labelEsitoIntegrazione','Integrazione'],['esitoApprovataVal','labelEsitoApprovata','Approvata'],['esitoRespintaVal','labelEsitoRespinta','Respinta']] as const).map(([vk,lk,name])=>(
          <div key={vk} style={P.row2}>
            <div><label style={P.lbl}>{name} (val)</label><NumInp value={cfg[vk]} onChange={n=>update(vk,n)}/></div>
            <div><label style={P.lbl}>Label</label><Inp value={cfg[lk]||''} onChange={v=>update(lk,v)}/></div>
          </div>
        ))}
      </div>}

      <Acc id='righe' label='🎨 Stile righe' open={isOpen('righe')} onToggle={()=>toggle('righe')}/>
      {isOpen('righe') && <div>
        <div style={P.row3}>
          <div><label style={P.lbl}>Gap</label><NumInp value={cfg.rowGap} onChange={n=>update('rowGap',n)} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Pad. X</label><NumInp value={cfg.rowPaddingX} onChange={n=>update('rowPaddingX',n)} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Pad. Y</label><NumInp value={cfg.rowPaddingY} onChange={n=>update('rowPaddingY',n)} min={0} unit='px'/></div>
        </div>
        <div style={P.row3}>
          <div><label style={P.lbl}>Min H</label><NumInp value={cfg.rowMinHeight} onChange={n=>update('rowMinHeight',n)} min={24} unit='px'/></div>
          <div><label style={P.lbl}>Radius</label><NumInp value={cfg.rowRadius} onChange={n=>update('rowRadius',n)} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Bordo</label><NumInp value={cfg.rowBorderWidth} onChange={n=>update('rowBorderWidth',n)} min={0} unit='px'/></div>
        </div>
        <label style={P.lbl}>Colore bordo riga</label>
        <ColInp value={String(cfg.rowBorderColor||'')} onChange={v=>update('rowBorderColor',v)}/>
        <div style={P.grp}>Colori</div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Zebra pari</label><ColInp value={String(cfg.zebraEvenBg||'')} onChange={v=>update('zebraEvenBg',v)}/></div>
          <div><label style={P.lbl}>Zebra dispari</label><ColInp value={String(cfg.zebraOddBg||'')} onChange={v=>update('zebraOddBg',v)}/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Hover</label><ColInp value={String(cfg.hoverBg||'')} onChange={v=>update('hoverBg',v)}/></div>
          <div><label style={P.lbl}>Selezionata</label><ColInp value={String(cfg.selectedBg||'')} onChange={v=>update('selectedBg',v)}/></div>
        </div>
        <label style={P.lbl}>Bordo selezionata</label>
        <div style={P.row2}>
          <div><ColInp value={String(cfg.selectedBorderColor||'')} onChange={v=>update('selectedBorderColor',v)}/></div>
          <div><label style={P.lbl}>Spessore</label><NumInp value={cfg.selectedBorderWidth} onChange={n=>update('selectedBorderWidth',n)} min={0} unit='px'/></div>
        </div>
      </div>}

      <Acc id='chip' label='🔴 Chip stato' open={isOpen('chip')} onToggle={()=>toggle('chip')}/>
      {isOpen('chip') && <div>
        <div style={P.grp}>Forma</div>
        <div style={P.row3}>
          <div><label style={P.lbl}>Radius</label><NumInp value={cfg.statoChipRadius} onChange={n=>update('statoChipRadius',n)} min={0}/></div>
          <div><label style={P.lbl}>Pad. X</label><NumInp value={cfg.statoChipPadX} onChange={n=>update('statoChipPadX',n)} min={0}/></div>
          <div><label style={P.lbl}>Pad. Y</label><NumInp value={cfg.statoChipPadY} onChange={n=>update('statoChipPadY',n)} min={0}/></div>
        </div>
        <div style={P.row3}>
          <div><label style={P.lbl}>Bordo</label><NumInp value={cfg.statoChipBorderW} onChange={n=>update('statoChipBorderW',n)} min={0}/></div>
          <div><label style={P.lbl}>Font sz</label><NumInp value={cfg.statoChipFontSize} onChange={n=>update('statoChipFontSize',n)} min={8}/></div>
          <div><label style={P.lbl}>Font w</label><NumInp value={cfg.statoChipFontWeight} onChange={n=>update('statoChipFontWeight',n)} min={100} step={100}/></div>
        </div>
        <div style={P.row2}>
          <div>
            <label style={P.lbl}>Transform</label>
            <Sel value={String(cfg.statoChipTextTransform||'none')} onChange={v=>update('statoChipTextTransform',v)}
              options={[{value:'none',label:'none'},{value:'uppercase',label:'uppercase'},{value:'lowercase',label:'lowercase'},{value:'capitalize',label:'capitalize'}]}/>
          </div>
          <div><label style={P.lbl}>Letter spacing</label><NumInp value={cfg.statoChipLetterSpacing} onChange={n=>update('statoChipLetterSpacing',n)} step={0.1}/></div>
        </div>
        <div style={P.grp}>Colori</div>
        <StatoColors label='Da prendere in carico'
          bg={String(cfg.statoBgDaPrendere||'')} onBg={v=>update('statoBgDaPrendere',v)}
          text={String(cfg.statoTextDaPrendere||'')} onText={v=>update('statoTextDaPrendere',v)}
          border={String(cfg.statoBorderDaPrendere||'')} onBorder={v=>update('statoBorderDaPrendere',v)}/>
        <StatoColors label='Presa in carico'
          bg={String(cfg.statoBgPresa||'')} onBg={v=>update('statoBgPresa',v)}
          text={String(cfg.statoTextPresa||'')} onText={v=>update('statoTextPresa',v)}
          border={String(cfg.statoBorderPresa||'')} onBorder={v=>update('statoBorderPresa',v)}/>
        <StatoColors label='Altro'
          bg={String(cfg.statoBgAltro||'')} onBg={v=>update('statoBgAltro',v)}
          text={String(cfg.statoTextAltro||'')} onText={v=>update('statoTextAltro',v)}
          border={String(cfg.statoBorderAltro||'')} onBorder={v=>update('statoBorderAltro',v)}/>
      </div>}

      <Acc id='titolo' label='📝 Titolo elenco' open={isOpen('titolo')} onToggle={()=>toggle('titolo')}/>
      {isOpen('titolo') && <div>
        <label style={P.lbl}>Testo</label>
        <Inp value={String(cfg.listTitleText||'')} onChange={v=>update('listTitleText',v)} placeholder='Elenco rapporti di rilevazione'/>
        <div style={P.row3}>
          <div><label style={P.lbl}>Altezza</label><NumInp value={cfg.listTitleHeight} onChange={n=>update('listTitleHeight',n)} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Font sz</label><NumInp value={cfg.listTitleFontSize} onChange={n=>update('listTitleFontSize',n)} min={10} unit='px'/></div>
          <div><label style={P.lbl}>Font w</label><NumInp value={cfg.listTitleFontWeight} onChange={n=>update('listTitleFontWeight',n)} min={100} step={100}/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Pad. bottom</label><NumInp value={cfg.listTitlePaddingBottom} onChange={n=>update('listTitlePaddingBottom',n)} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Pad. left</label><NumInp value={cfg.listTitlePaddingLeft} onChange={n=>update('listTitlePaddingLeft',n)} min={0} unit='px'/></div>
        </div>
        <label style={P.lbl}>Colore testo</label>
        <ColInp value={String(cfg.listTitleColor||'rgba(0,0,0,0.85)')} onChange={v=>update('listTitleColor',v)}/>
      </div>}

      <Acc id='maschera' label='🖼 Maschera (bordo pannello)' open={isOpen('maschera')} onToggle={()=>toggle('maschera')}/>
      {isOpen('maschera') && <div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Outer offset</label><NumInp value={cfg.maskOuterOffset} onChange={n=>update('maskOuterOffset',n)} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Inner padding</label><NumInp value={cfg.maskInnerPadding} onChange={n=>update('maskInnerPadding',n)} min={0} unit='px'/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Border width</label><NumInp value={cfg.maskBorderWidth} onChange={n=>update('maskBorderWidth',n)} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Border radius</label><NumInp value={cfg.maskRadius} onChange={n=>update('maskRadius',n)} min={0} unit='px'/></div>
        </div>
        <label style={P.lbl}>Background</label>
        <ColInp value={String(cfg.maskBg||'')} onChange={v=>update('maskBg',v)}/>
        <label style={P.lbl}>Colore bordo</label>
        <ColInp value={String(cfg.maskBorderColor||'')} onChange={v=>update('maskBorderColor',v)}/>
      </div>}

      <Acc id='layout' label='📐 Layout colonne' open={isOpen('layout')} onToggle={()=>toggle('layout')}/>
      {isOpen('layout') && <div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Gap colonne</label><NumInp value={cfg.gap} onChange={n=>update('gap',n)} min={0} unit='px'/></div>
          <div><label style={P.lbl}>Pad. prima col.</label><NumInp value={cfg.paddingLeftFirstCol} onChange={n=>update('paddingLeftFirstCol',n)} min={0} unit='px'/></div>
        </div>
      </div>}

      <Acc id='msg' label='💬 Messaggi' open={isOpen('msg')} onToggle={()=>toggle('msg')}/>
      {isOpen('msg') && <div>
        <label style={P.lbl}>Nessun risultato</label>
        <Inp value={String(cfg.emptyMessage||'')} onChange={v=>update('emptyMessage',v)}/>
        <label style={P.lbl}>Errore: nessun datasource</label>
        <Inp value={String(cfg.errorNoDs||'')} onChange={v=>update('errorNoDs',v)}/>
      </div>}

      <div style={{marginTop:28,borderTop:'1px solid rgba(255,255,255,0.10)',paddingTop:16}}>
        <button type='button'
          onClick={()=>{if(window.confirm('Ripristinare tutti i valori predefiniti?'))props.onSettingChange({id:props.id,config:defaultConfig as any})}}
          style={{padding:'6px 14px',borderRadius:7,border:'1px solid rgba(252,165,165,0.4)',background:'rgba(239,68,68,0.10)',color:'#fca5a5',fontSize:12,cursor:'pointer',fontWeight:600}}>
          ↺ Ripristina predefiniti
        </button>
      </div>
    </div>
  )
}

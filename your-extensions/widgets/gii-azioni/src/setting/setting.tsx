/** @jsx jsx */
import { React, jsx, Immutable } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetSettingProps<IMConfig>

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
function Acc(p: { id:string; label:string; open:boolean; onToggle:()=>void }) {
  return (
    <div style={P.sec} onClick={p.onToggle}>
      <span>{p.label}</span>
      <span style={{ fontSize:10, color:'#a0aec0' }}>{p.open?'▲':'▼'}</span>
    </div>
  )
}

export default function Setting(props: Props) {
  const [openSec, setOpenSec] = React.useState<string>('dati')
  const toggle = (id:string) => setOpenSec(s=>s===id?'':id)
  const isOpen = (id:string) => openSec===id

  const cfgJs: any = { ...defaultConfig, ...asJs(props.config) }
  const baseCfg = props.config || ((Immutable as any)(defaultConfig) as any)

  React.useEffect(()=>{
    const dsJs:any[] = asJs(props.useDataSources??(Immutable as any)([])) || []
    if ((dsJs?.length||0) > 0 || (props as any).useDataSourcesEnabled) {
      props.onSettingChange({ id: props.id, useDataSources: [] as any, useDataSourcesEnabled: false as any })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patch = (obj:Record<string,any>) => {
    let next = baseCfg
    Object.entries(obj).forEach(([k,v])=>{
      if(k === 'rejectReasons') next=next.set(k,(Immutable as any)((v||[]) as any) as any)
      else next=next.set(k,v)
    })
    props.onSettingChange({id:props.id,config:next})
  }

  const reasons = normalizeStrArray(cfgJs.rejectReasons??defaultConfig.rejectReasons)

  return (
    <div style={P.wrap}>

      {/* ═══ DATI ═══ */}
      <Acc id='dati' label='📊 Dati' open={isOpen('dati')} onToggle={()=>toggle('dati')}/>
      {isOpen('dati') && <div>
        <div style={P.hint}>Il ruolo viene letto automaticamente da window.__giiUserRole, dando priorità a ruoloCod/areaCod/settoreCod pubblicati dal widget Header.</div>
        <label style={P.lbl}>Testo pulsante "Prendi in carico"</label>
        <Inp value={cfgJs.buttonText??defaultConfig.buttonText} onChange={v=>patch({buttonText:v})}/>
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
        {([
          ['takeColor','takeTextColor','Prendi in carico / Assegna TI'],
          ['approvaColor','approvaTextColor','Trasmetti a …'],
          ['approvaRapportoColor','approvaRapportoTextColor','Approva Rapporto / Sanzione'],
          ['integrazioneColor','integrazioneTextColor','Integrazione / Rimanda a DT'],
          ['respingiColor','respingiTextColor','Respingi / Elimina']
        ] as const).map(([bgK,txtK,lbl])=>(
          <div key={bgK} style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:'#d1d5db',marginBottom:4}}>{lbl}</div>
            <div style={P.row2}>
              <div><div style={{fontSize:10,color:'#a0aec0',marginBottom:3}}>Sfondo</div><ColInp value={String(cfgJs[bgK]??defaultConfig[bgK])} onChange={v=>patch({[bgK]:v})}/></div>
              <div><div style={{fontSize:10,color:'#a0aec0',marginBottom:3}}>Testo</div><ColInp value={String(cfgJs[txtK]??defaultConfig[txtK])} onChange={v=>patch({[txtK]:v})}/></div>
            </div>
          </div>
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
        <div style={P.hint}>Il pulsante Modifica è attivo solo se stato_TI è tra min e max (inclusi) e presa = val. richiesto.</div>
      </div>}

      {/* ═══ NOTA SPESE ═══ */}
      <Acc id='notaspese' label='📄 Nota Spese' open={isOpen('notaspese')} onToggle={()=>toggle('notaspese')}/>
      {isOpen('notaspese') && <div>
        <label style={P.lbl}>URL Feature Layer Dettaglio Nota Spese</label>
        <Inp value={cfgJs.nsNotaSpeseDettaglioUrl??''} onChange={v=>patch({nsNotaSpeseDettaglioUrl:v})} placeholder='https://services2.arcgis.com/...'/>
        <label style={P.lbl}>URL Feature Layer Parametri</label>
        <Inp value={cfgJs.nsParametriUrl??''} onChange={v=>patch({nsParametriUrl:v})} placeholder='https://services2.arcgis.com/...'/>
        <label style={P.lbl}>Codice parametro spese generali</label>
        <Inp value={cfgJs.nsParametroCode??'SPESE_GENERALI_PERC'} onChange={v=>patch({nsParametroCode:v})} placeholder='SPESE_GENERALI_PERC'/>
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

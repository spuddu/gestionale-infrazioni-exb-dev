/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type IMConfig } from '../config'

const P = {
  wrap:    { padding:'0 12px 32px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb' } as React.CSSProperties,
  sec:     { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.2, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' } as React.CSSProperties,
  lbl:     { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:4, marginTop:10 } as React.CSSProperties,
  hint:    { fontSize:10.5, color:'#a0aec0', marginTop:3, lineHeight:1.4 } as React.CSSProperties,
  row2:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } as React.CSSProperties,
  row3:    { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 } as React.CSSProperties,
  inp:     { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  check:   { display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#d1d5db', cursor:'pointer', marginTop:8 } as React.CSSProperties,
  cardBox: { border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, padding:'10px 12px', marginBottom:8, background:'rgba(255,255,255,0.04)' } as React.CSSProperties,
}

// ── Micro-componenti ──────────────────────────────────────────────────────────
function Inp(p: { value:string|number; onChange:(v:string)=>void; type?:string; placeholder?:string }) {
  return <input type={p.type||'text'} value={p.value} onChange={e=>p.onChange(e.target.value)} placeholder={p.placeholder} style={P.inp}/>
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
  const hexVal = /^#[0-9a-fA-F]{3,8}$/.test(p.value) ? p.value : '#1d4ed8'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <input type='color' value={hexVal} onChange={e=>p.onChange(e.target.value)}
        style={{ width:32, height:28, padding:2, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, cursor:'pointer', background:'transparent', flexShrink:0 }}/>
      <input type='text' value={p.value} onChange={e=>p.onChange(e.target.value)}
        placeholder='#rrggbb o rgba(...)' style={{ ...P.inp, flex:1, fontSize:11 }}/>
    </div>
  )
}
function Check(p: { value:boolean; onChange:(v:boolean)=>void; label:string }) {
  return (
    <label style={P.check}>
      <input type='checkbox' checked={p.value} onChange={e=>p.onChange(e.target.checked)}/>
      {p.label}
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
function ImgUpload(p: { value:string; onChange:(v:string)=>void }) {
  const ref = React.useRef<HTMLInputElement|null>(null)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {p.value && (
        <div style={{ width:64, height:64, borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.15)', background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={p.value} alt='preview' style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
        </div>
      )}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const }}>
        <button type='button' onClick={()=>ref.current?.click()}
          style={{ padding:'6px 14px', borderRadius:7, border:'1px solid rgba(147,197,253,0.4)', background:'rgba(59,130,246,0.15)', color:'#93c5fd', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          📁 Scegli dal PC
        </button>
        {p.value && (
          <button type='button' onClick={()=>p.onChange('')}
            style={{ padding:'6px 12px', borderRadius:7, border:'1px solid rgba(252,165,165,0.4)', background:'rgba(239,68,68,0.12)', color:'#fca5a5', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            ✕ Rimuovi
          </button>
        )}
        <input ref={ref} type='file' accept='image/*' style={{ display:'none' }}
          onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ if(typeof r.result==='string') p.onChange(r.result) }; r.readAsDataURL(f); if(ref.current) ref.current.value='' }}/>
      </div>
      <div style={P.hint}>PNG, SVG o JPG. Salvato come base64 nella configurazione.</div>
    </div>
  )
}


export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const set = (key:string, value:any) =>
    props.onSettingChange({ id:props.id, config:{ ...cfg, [key]:value } as any })

  return (
    <div style={P.wrap}>
      <div style={{ ...P.sec, cursor:'default' }}>🎨 Sfondo</div>
      <label style={P.lbl}>Colore inizio</label><ColInp value={cfg.bgGradStart} onChange={v=>set('bgGradStart',v)}/>
      <label style={P.lbl}>Colore centrale</label><ColInp value={cfg.bgGradMid} onChange={v=>set('bgGradMid',v)}/>
      <label style={P.lbl}>Colore finale</label><ColInp value={cfg.bgGradEnd} onChange={v=>set('bgGradEnd',v)}/>
      <label style={P.lbl}>Angolo</label>
      <NumInp value={cfg.bgGradAngle} onChange={v=>set('bgGradAngle',v)} min={0} max={360} unit='°'/>

      <div style={{ height:1, background:'rgba(255,255,255,0.08)', margin:'14px 0 10px' }}/>
      <div style={{ ...P.sec, cursor:'default' }}>⭕ Cerchi decorativi</div>
      <Check value={cfg.showWave??false} onChange={v=>set('showWave',v)} label='Mostra onda decorativa (in basso)'/>
      <Check value={cfg.showCircles} onChange={v=>set('showCircles',v)} label='Mostra cerchi'/>
      {cfg.showCircles && <>
        <div style={P.row2}>
          <div><label style={P.lbl}>Numero</label><NumInp value={cfg.circleCount??3} onChange={v=>set('circleCount',v)} min={1} max={8}/></div>
          <div><label style={P.lbl}>Dim. base</label><NumInp value={cfg.circleBaseSize??700} onChange={v=>set('circleBaseSize',v)} min={100} max={1400} unit='px'/></div>
        </div>
        <div style={P.row2}>
          <div><label style={P.lbl}>Spessore</label><NumInp value={cfg.circleThickness??1} onChange={v=>set('circleThickness',v)} min={0.5} max={8} step={0.5} unit='px'/></div>
          <div><label style={P.lbl}>Opacità</label><NumInp value={Math.round((cfg.circleOpacity??0.08)*100)} onChange={v=>set('circleOpacity',v/100)} min={1} max={80} unit='%'/></div>
        </div>
        <label style={P.lbl}>Colore</label>
        <ColInp value={cfg.circleColor??'#60a5fa'} onChange={v=>set('circleColor',v)}/>
        <Check value={cfg.circleGradient??false} onChange={v=>set('circleGradient',v)} label='Riempimento radiale (glow)'/>
        {cfg.circleGradient && <>
          <label style={P.lbl}>Colore glow secondario</label>
          <ColInp value={cfg.circleColorEnd??'#a78bfa'} onChange={v=>set('circleColorEnd',v)}/>
        </>}
      </>}

      <div style={{ marginTop:24, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
        <button type='button'
          onClick={()=>{ if(window.confirm('Ripristinare i valori predefiniti?')) props.onSettingChange({id:props.id,config:defaultConfig as any}) }}
          style={{ padding:'6px 14px', borderRadius:7, border:'1px solid rgba(252,165,165,0.4)', background:'rgba(239,68,68,0.10)', color:'#fca5a5', fontSize:12, cursor:'pointer', fontWeight:600 }}>
          ↺ Ripristina predefiniti
        </button>
      </div>
    </div>
  )
}

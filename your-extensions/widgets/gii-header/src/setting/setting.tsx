/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type IMConfig } from '../config'

const P = {
  wrap:  { padding:'0 12px 32px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb' } as React.CSSProperties,
  sec:   { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.2, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' } as React.CSSProperties,
  lbl:   { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:4, marginTop:10 } as React.CSSProperties,
  hint:  { fontSize:10.5, color:'#a0aec0', marginTop:3, lineHeight:1.4 } as React.CSSProperties,
  row2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } as React.CSSProperties,
  row3:  { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 } as React.CSSProperties,
  inp:   { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
  check: { display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#d1d5db', cursor:'pointer', marginTop:8 } as React.CSSProperties,
}

function Inp(p: { value:string|number; onChange:(v:string)=>void; placeholder?:string }) {
  return <input type='text' value={p.value} onChange={e=>p.onChange(e.target.value)} placeholder={p.placeholder} style={P.inp}/>
}
function NumInp(p: { value:number; onChange:(v:number)=>void; min?:number; max?:number; step?:number; unit?:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <input type='number' value={p.value} min={p.min} max={p.max} step={p.step||1} onChange={e=>p.onChange(Number(e.target.value))} style={{ ...P.inp, width:68 }}/>
      {p.unit && <span style={{ fontSize:11, color:'#a0aec0', flexShrink:0 }}>{p.unit}</span>}
    </div>
  )
}
function ColInp(p: { value:string; onChange:(v:string)=>void }) {
  const hexVal = /^#[0-9a-fA-F]{3,8}$/.test(p.value) ? p.value : '#1d4ed8'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <input type='color' value={hexVal} onChange={e=>p.onChange(e.target.value)} style={{ width:32, height:28, padding:2, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, cursor:'pointer', background:'transparent', flexShrink:0 }}/>
      <input type='text' value={p.value} onChange={e=>p.onChange(e.target.value)} style={{ ...P.inp, flex:1, fontSize:11 }}/>
    </div>
  )
}
function Check(p: { value:boolean; onChange:(v:boolean)=>void; label:string }) {
  return <label style={P.check}><input type='checkbox' checked={p.value} onChange={e=>p.onChange(e.target.checked)}/>{p.label}</label>
}
function Sel(p: { value:string; onChange:(v:string)=>void; options:Array<{value:string;label:string}> }) {
  return <select value={p.value} onChange={e=>p.onChange(e.target.value)} style={{ ...P.inp, cursor:'pointer' }}>{p.options.map(o=><option key={o.value} value={o.value} style={{ background:'#1a1f2e', color:'#e5e7eb' }}>{o.label}</option>)}</select>
}
function ImgUpload(p: { value:string; onChange:(v:string)=>void }) {
  const ref = React.useRef<HTMLInputElement|null>(null)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {p.value && <div style={{ width:56, height:56, borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.15)', background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}><img src={p.value} alt='preview' style={{ width:'100%', height:'100%', objectFit:'contain' }}/></div>}
      <div style={{ display:'flex', gap:8 }}>
        <button type='button' onClick={()=>ref.current?.click()} style={{ padding:'6px 14px', borderRadius:7, border:'1px solid rgba(147,197,253,0.4)', background:'rgba(59,130,246,0.15)', color:'#93c5fd', fontSize:12, fontWeight:600, cursor:'pointer' }}>📁 Scegli dal PC</button>
        {p.value && <button type='button' onClick={()=>p.onChange('')} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid rgba(252,165,165,0.4)', background:'rgba(239,68,68,0.12)', color:'#fca5a5', fontSize:12, fontWeight:600, cursor:'pointer' }}>✕</button>}
        <input ref={ref} type='file' accept='image/*' style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ if(typeof r.result==='string') p.onChange(r.result) }; r.readAsDataURL(f); if(ref.current) ref.current.value='' }}/>
      </div>
    </div>
  )
}

const FONTS = [
  { value:"'Crimson Pro', Georgia, serif",           label:'Crimson Pro (serif)' },
  { value:"'Source Sans 3', 'Segoe UI', sans-serif", label:'Source Sans 3 (sans)' },
  { value:"Georgia, serif",                          label:'Georgia' },
  { value:"'Times New Roman', serif",                label:'Times New Roman' },
  { value:"'Trebuchet MS', sans-serif",              label:'Trebuchet MS' },
  { value:"'Palatino Linotype', serif",              label:'Palatino Linotype' },
  { value:"'Courier New', monospace",                label:'Courier New' },
  { value:"Impact, sans-serif",                      label:'Impact' },
]
const WEIGHTS = [300,400,500,600,700,800,900].map(w=>({ value:String(w), label:`${w} — ${['Thin','Regular','Medium','SemiBold','Bold','ExtraBold','Black'][[300,400,500,600,700,800,900].indexOf(w)]}` }))

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const [openSec, setOpenSec] = React.useState<string>('logo')

  const set = (key:string, value:any) =>
    props.onSettingChange({ id:props.id, config:{ ...cfg, [key]:value } as any })

  const Acc = (p:{id:string;label:string}) => (
    <div style={P.sec} onClick={()=>setOpenSec(openSec===p.id?'':p.id)}>
      <span>{p.label}</span>
      <span style={{ fontSize:12, color:'#a0aec0', fontWeight:400 }}>{openSec===p.id?'▲':'▼'}</span>
    </div>
  )

  return (
    <div style={P.wrap}>

      {/* ═══ SFONDO HEADER ═══ */}
      <Acc id='bg' label='🎨 Sfondo intestazione'/>
      {openSec==='bg' && <div>
        <label style={P.lbl}>Tipo sfondo</label>
        <Sel value={cfg.headerBgType ?? 'gradient'} onChange={v=>set('headerBgType',v)} options={[
          { value:'gradient', label:'Gradiente (come homepage)' },
          { value:'solid',    label:'Colore solido / trasparente' }
        ]}/>
        {(cfg.headerBgType ?? 'gradient') === 'gradient' ? <>
          <label style={P.lbl}>Colore inizio</label>
          <ColInp value={cfg.headerBg} onChange={v=>set('headerBg',v)}/>
          <label style={P.lbl}>Colore centrale</label>
          <ColInp value={cfg.headerGradMid ?? '#0d2444'} onChange={v=>set('headerGradMid',v)}/>
          <label style={P.lbl}>Colore finale</label>
          <ColInp value={cfg.headerGradEnd ?? '#0a1f3d'} onChange={v=>set('headerGradEnd',v)}/>
          <label style={P.lbl}>Angolo</label>
          <NumInp value={cfg.headerGradAngle ?? 160} onChange={v=>set('headerGradAngle',v)} min={0} max={360} unit='°'/>
        </> : <>
          <label style={P.lbl}>Colore sfondo</label>
          <ColInp value={cfg.headerBg} onChange={v=>set('headerBg',v)}/>
          <div style={P.hint}>Usa transparent per ereditare il colore della pagina.</div>
        </>}
        <div style={P.row2}>
          <div><label style={P.lbl}>Padding verticale</label><NumInp value={cfg.headerPaddingV} onChange={v=>set('headerPaddingV',v)} min={0} max={60} unit='px'/></div>
          <div><label style={P.lbl}>Padding orizzontale</label><NumInp value={cfg.headerPaddingH} onChange={v=>set('headerPaddingH',v)} min={0} max={80} unit='px'/></div>
        </div>
        <Check value={cfg.headerBorderBottom} onChange={v=>set('headerBorderBottom',v)} label='Linea di separazione in basso'/>
        {cfg.headerBorderBottom && <>
          <label style={P.lbl}>Colore linea</label>
          <ColInp value={cfg.headerBorderColor} onChange={v=>set('headerBorderColor',v)}/>
        </>}
      </div>}

      {/* ═══ LOGO ═══ */}
      <Acc id='logo' label='🖼 Logo'/>
      {openSec==='logo' && <div>
        <label style={P.lbl}>Immagine</label>
        <ImgUpload value={cfg.logoUrl} onChange={v=>set('logoUrl',v)}/>
        <div style={P.row3}>
          <div><label style={P.lbl}>Dimensione</label><NumInp value={cfg.logoSize} onChange={v=>set('logoSize',v)} min={24} max={100} unit='px'/></div>
          <div><label style={P.lbl}>Bordi arrot.</label><NumInp value={cfg.logoRadius} onChange={v=>set('logoRadius',v)} min={0} max={50} unit='px'/></div>
          <div><label style={P.lbl}>Padding</label><NumInp value={cfg.logoPadding??4} onChange={v=>set('logoPadding',v)} min={0} max={30} unit='px'/></div>
        </div>
        <Check value={cfg.logoBgGradient} onChange={v=>set('logoBgGradient',v)} label='Gradiente sfondo logo'/>
        <label style={P.lbl}>{cfg.logoBgGradient?'Colore 1':'Colore sfondo'}</label>
        <ColInp value={cfg.logoBgColor} onChange={v=>set('logoBgColor',v)}/>
        {cfg.logoBgGradient && <>
          <label style={P.lbl}>Colore 2</label>
          <ColInp value={cfg.logoBgGradEnd||'#0048ad'} onChange={v=>set('logoBgGradEnd',v)}/>
        </>}
      </div>}

      {/* ═══ INTESTAZIONE ═══ */}
      <Acc id='header' label='📝 Testi'/>
      {openSec==='header' && <div>
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1, marginBottom:8 }}>Nome ente</div>
          <label style={P.lbl}>Testo</label><Inp value={cfg.orgName} onChange={v=>set('orgName',v)}/>
          <label style={P.lbl}>Font</label><Sel value={cfg.orgNameFont} onChange={v=>set('orgNameFont',v)} options={FONTS}/>
          <div style={P.row2}>
            <div><label style={P.lbl}>Peso</label><Sel value={String(cfg.orgNameWeight)} onChange={v=>set('orgNameWeight',Number(v))} options={WEIGHTS}/></div>
            <div><label style={P.lbl}>Dimensione</label><NumInp value={cfg.orgNameSize} onChange={v=>set('orgNameSize',v)} min={8} max={18} unit='px'/></div>
          </div>
          <label style={P.lbl}>Colore</label><ColInp value={cfg.orgNameColor} onChange={v=>set('orgNameColor',v)}/>
          <label style={P.lbl}>Spaziatura lettere</label>
          <NumInp value={cfg.orgNameLetterSpacing} onChange={v=>set('orgNameLetterSpacing',v)} min={0} max={10} step={0.5} unit='px'/>
        </div>
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1, marginBottom:8 }}>Titolo principale</div>
          <label style={P.lbl}>Testo</label><Inp value={cfg.title} onChange={v=>set('title',v)}/>
          <label style={P.lbl}>Font</label><Sel value={cfg.titleFont} onChange={v=>set('titleFont',v)} options={FONTS}/>
          <div style={P.row2}>
            <div><label style={P.lbl}>Peso</label><Sel value={String(cfg.titleWeight)} onChange={v=>set('titleWeight',Number(v))} options={WEIGHTS}/></div>
            <div><label style={P.lbl}>Dimensione</label><NumInp value={cfg.titleSize} onChange={v=>set('titleSize',v)} min={12} max={50} unit='px'/></div>
          </div>
          <label style={P.lbl}>Colore</label><ColInp value={cfg.titleColor} onChange={v=>set('titleColor',v)}/>
          <label style={P.lbl}>Spaziatura lettere</label>
          <NumInp value={cfg.titleLetterSpacing ?? -0.5} onChange={v=>set('titleLetterSpacing',v)} min={-5} max={20} step={0.1} unit='px'/>
        </div>
      </div>}

      {/* ═══ SIGN IN ═══ */}
      <Acc id='signin' label='🔐 Pulsante Accedi/Esci'/>
      {openSec==='signin' && <div>
        <Check value={cfg.showSignIn} onChange={v=>set('showSignIn',v)} label='Mostra pulsante Accedi / Esci'/>
        {cfg.showSignIn && <>
          <label style={P.lbl}>Sfondo</label><ColInp value={cfg.signInBg} onChange={v=>set('signInBg',v)}/>
          <label style={P.lbl}>Colore testo</label><ColInp value={cfg.signInColor} onChange={v=>set('signInColor',v)}/>
          <label style={P.lbl}>Colore bordo</label><ColInp value={cfg.signInBorderColor} onChange={v=>set('signInBorderColor',v)}/>
        </>}
      </div>}

      <div style={{ marginTop:28, borderTop:'1px solid rgba(255,255,255,0.10)', paddingTop:16 }}>
        <button type='button'
          onClick={()=>{ if(window.confirm('Ripristinare i valori predefiniti?')) props.onSettingChange({id:props.id,config:defaultConfig as any}) }}
          style={{ padding:'6px 14px', borderRadius:7, border:'1px solid rgba(252,165,165,0.4)', background:'rgba(239,68,68,0.10)', color:'#fca5a5', fontSize:12, cursor:'pointer', fontWeight:600 }}>
          ↺ Ripristina predefiniti
        </button>
      </div>
    </div>
  )
}

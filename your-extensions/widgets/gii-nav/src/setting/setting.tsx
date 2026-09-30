/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, ReactRedux, type IMState } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type IMConfig } from '../config'
import { buildNavItemsFromHome } from '../home-card-colors'

const P = {
  wrap: { padding:'0 12px 32px', fontSize:13, background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb' } as React.CSSProperties,
  sec:  { fontSize:11, fontWeight:700, color:'#93c5fd', textTransform:'uppercase' as const, letterSpacing:1.2, borderBottom:'1px solid rgba(255,255,255,0.10)', paddingBottom:6, marginBottom:14, marginTop:22 } as React.CSSProperties,
  lbl:  { fontSize:11.5, fontWeight:600, color:'#d1d5db', display:'block', marginBottom:4, marginTop:10 } as React.CSSProperties,
  hint: { fontSize:10.5, color:'#a0aec0', marginTop:3, lineHeight:1.45 } as React.CSSProperties,
  row2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 } as React.CSSProperties,
  row3: { display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:6 } as React.CSSProperties,
  inp:  { width:'100%', padding:'5px 8px', fontSize:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, outline:'none', boxSizing:'border-box' as const, background:'rgba(255,255,255,0.07)', color:'#e5e7eb' } as React.CSSProperties,
}

function NumInp(p: { value:number; onChange:(v:number)=>void; min?:number; max?:number; step?:number; unit?:string; compact?:boolean }) {
  const inputWidth = p.compact ? 42 : 68
  return (
    <div style={{ display:'flex', alignItems:'center', gap:p.compact?3:5, width:'100%', minWidth:0 }}>
      <input type='number' value={p.value} min={p.min} max={p.max} step={p.step||1}
        onChange={e=>p.onChange(Number(e.target.value))}
        style={{ ...P.inp, width:inputWidth, minWidth:0, padding:p.compact?'5px 4px':'5px 8px', textAlign:p.compact?'center':'left' }}/>
      {p.unit && <span style={{ fontSize:10.5, color:'#a0aec0', flexShrink:0 }}>{p.unit}</span>}
    </div>
  )
}

function Sel(p: { value:string; onChange:(v:string)=>void; options:Array<{value:string;label:string}> }) {
  return (
    <select value={p.value} onChange={e=>p.onChange(e.target.value)} style={{ ...P.inp, cursor:'pointer' }}>
      {p.options.map(o=><option key={o.value} value={o.value} style={{ background:'#1a1f2e', color:'#e5e7eb' }}>{o.label}</option>)}
    </select>
  )
}

const FONTS = [
  { value:"'Crimson Pro', Georgia, serif",           label:'Crimson Pro (serif)' },
  { value:"'Source Sans 3', 'Segoe UI', sans-serif", label:'Source Sans 3 (sans)' },
  { value:'Georgia, serif',                           label:'Georgia' },
  { value:"'Times New Roman', serif",                label:'Times New Roman' },
  { value:"'Trebuchet MS', sans-serif",              label:'Trebuchet MS' },
  { value:"'Palatino Linotype', serif",              label:'Palatino Linotype' },
  { value:"'Courier New', monospace",                label:'Courier New' },
  { value:'Impact, sans-serif',                       label:'Impact' },
]
const WEIGHTS = [300,400,500,600,700,800,900].map(w=>({
  value:String(w),
  label:`${w} — ${['Thin','Regular','Medium','SemiBold','Bold','ExtraBold','Black'][[300,400,500,600,700,800,900].indexOf(w)]}`
}))

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }

  const appConfig = ReactRedux.useSelector((state: IMState) => {
    const s: any = state as any
    return s?.appStateInBuilder?.appConfig ?? s?.appConfig
  })
  const homeItems = React.useMemo(() => buildNavItemsFromHome(appConfig), [appConfig])

  const set = (key:string, value:any) =>
    props.onSettingChange({ id:props.id, config:{ ...cfg, [key]:value } as any })

  return (
    <div style={P.wrap}>
      <div style={P.sec}>⚙ Layout</div>
      <label style={P.lbl}>Orientamento</label>
      <Sel value={cfg.direction} onChange={v=>set('direction',v)} options={[
        {value:'vertical',label:'Verticale (sidebar)'},
        {value:'horizontal',label:'Orizzontale (toolbar)'}
      ]}/>
      <div style={P.row3}>
        <div style={{minWidth:0}}><label style={P.lbl}>Gap</label><NumInp value={cfg.gap} onChange={v=>set('gap',v)} min={0} max={24} unit='px' compact/></div>
        <div style={{minWidth:0}}><label style={P.lbl}>Padding iniziale</label><NumInp value={cfg.initialPadding} onChange={v=>set('initialPadding',v)} min={0} max={80} unit='px' compact/></div>
        <div style={{minWidth:0}}><label style={P.lbl}>Padding card</label><NumInp value={cfg.itemPadding} onChange={v=>set('itemPadding',v)} min={4} max={30} unit='px' compact/></div>
      </div>
      <div style={P.row3}>
        <div style={{minWidth:0}}><label style={P.lbl}>Bordi arrot.</label><NumInp value={cfg.itemBorderRadius} onChange={v=>set('itemBorderRadius',v)} min={0} max={30} unit='px' compact/></div>
      </div>
      <label style={P.lbl}>Font etichette</label>
      <Sel value={cfg.labelFont} onChange={v=>set('labelFont',v)} options={FONTS}/>
      <div style={P.row2}>
        <div><label style={P.lbl}>Dimensione</label><NumInp value={Math.max(16, Number(cfg.labelSize) || 16)} onChange={v=>set('labelSize',v)} min={16} max={24} unit='px'/></div>
        <div><label style={P.lbl}>Peso</label><Sel value={String(Math.max(700, Number(cfg.labelWeight) || 700))} onChange={v=>set('labelWeight',Number(v))} options={WEIGHTS.filter(o=>Number(o.value)>=700)}/></div>
      </div>
      <div style={{ ...P.hint, marginTop:7, color:'#cbd5e1' }}>Per garantire leggibilità, il nav applica comunque un minimo di 16 px e peso 700 anche alle vecchie istanze salvate con valori inferiori.</div>

      <div style={P.sec}>🔗 Voci di navigazione</div>
      <div style={{
        padding:'10px 11px', borderRadius:8,
        border:'1px solid rgba(147,197,253,0.22)',
        background:'rgba(59,130,246,0.08)', color:'#bfdbfe',
        fontSize:11, lineHeight:1.5
      }}>
        Le voci del menu non si configurano più qui. Sono generate automaticamente dalle card del <strong>GII Homepage</strong>, da cui ereditano etichetta, pagina, icona, colori, ordine, ruoli e visibilità.
        <div style={{ marginTop:6, color:'#dbeafe' }}>
          Eccezioni: <strong>Home</strong> resta sempre disponibile nel nav anche se la sua card è nascosta nella Home; la <strong>pagina corrente</strong> viene invece esclusa automaticamente dal proprio menu.
        </div>
      </div>

      <div style={{ marginTop:12, fontSize:10.5, color:'#a0aec0', lineHeight:1.45 }}>
        Anteprima sorgente Home: {homeItems.length} {homeItems.length === 1 ? 'voce' : 'voci'} disponibili prima del filtro della pagina corrente e del ruolo utente.
      </div>
      <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:5 }}>
        {homeItems.map(item => (
          <div key={item.id} style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'6px 8px', borderRadius:7,
            border:'1px solid rgba(255,255,255,0.08)',
            background:'rgba(255,255,255,0.035)'
          }}>
            <div style={{ width:11, height:11, borderRadius:3, flexShrink:0, background:item.colorBg, border:`1px solid ${item.colorAccent}` }}/>
            <div style={{ minWidth:0, flex:1, fontSize:11.5, fontWeight:600, color:'#e5e7eb', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{item.label}</div>
            <div style={{ flexShrink:0, fontSize:9.5, color:'#94a3b8' }}>{item.roles.includes('*') ? 'Tutti' : item.roles.join(', ')}</div>
          </div>
        ))}
        {!homeItems.length && <div style={{ ...P.hint, color:'#fbbf24' }}>La configurazione della Home non è leggibile in questo momento; a runtime resta attivo il fallback alle voci già salvate nel nav.</div>}
      </div>
    </div>
  )
}

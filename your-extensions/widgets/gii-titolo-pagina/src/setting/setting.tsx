/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { defaultConfig, type IMConfig } from '../config'

const lbl: React.CSSProperties = { display:'block', marginTop:10, marginBottom:4, fontSize:11.5, fontWeight:600, color:'#d1d5db' }
const inp: React.CSSProperties = { width:'100%', boxSizing:'border-box', padding:'6px 8px', border:'1px solid rgba(255,255,255,.15)', borderRadius:6, background:'rgba(255,255,255,.07)', color:'#e5e7eb', fontSize:12 }
const hint: React.CSSProperties = { marginTop:4, fontSize:10.5, lineHeight:1.4, color:'#a0aec0' }

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const set = (k:string,v:any) => props.onSettingChange({ id:props.id, config:{ ...cfg, [k]:v } as any })
  const num = (k:string,label:string,min=0,max=100) => <><label style={lbl}>{label}</label><input style={inp} type='number' min={min} max={max} value={Number(cfg[k] ?? 0)} onChange={e=>set(k,Number(e.target.value || 0))}/></>
  const color = (k:string,label:string) => <><label style={lbl}>{label}</label><div style={{ display:'flex', gap:7 }}><input type='color' value={String(cfg[k]||'#1F4E79')} onChange={e=>set(k,e.target.value)} style={{ width:36, height:31, padding:2 }}/><input style={inp} value={String(cfg[k]||'')} onChange={e=>set(k,e.target.value)}/></div></>
  return <div style={{ padding:'0 12px 28px', background:'#1a1f2e', minHeight:'100%', color:'#e5e7eb', fontSize:13 }}>
    <div style={{ marginTop:18, fontWeight:800, color:'#93c5fd' }}>Titolo pagina GII</div>
    <div style={hint}>Per impostazione predefinita titolo e icona vengono letti automaticamente dalla card della Home associata alla pagina corrente.</div>
    <label style={lbl}>Titolo personalizzato (opzionale)</label>
    <input style={inp} value={String(cfg.titleOverride||'')} onChange={e=>set('titleOverride',e.target.value)} placeholder='Vuoto = usa il titolo della card Home'/>
    <label style={{ ...lbl, display:'flex', alignItems:'center', gap:8 }}><input type='checkbox' checked={cfg.showDescription !== false} onChange={e=>set('showDescription',e.target.checked)}/> Mostra sottotitolo / descrizione</label>
    <label style={lbl}>Descrizione personalizzata (opzionale)</label>
    <input style={inp} value={String(cfg.descriptionOverride||'')} onChange={e=>set('descriptionOverride',e.target.value)} placeholder='Vuoto = usa la descrizione della card Home'/>
    {color('subtitleColor','Colore descrizione')}
    {num('subtitleFontSize','Dimensione descrizione (px)',10,30)}
    {color('titleColor','Colore titolo e icona')}
    {num('titleFontSize','Dimensione titolo (px)',10,40)}
    {num('titleFontWeight','Peso titolo',100,900)}
    {num('iconSize','Dimensione icona (px)',12,48)}
    {num('iconGap','Distanza icona-titolo (px)',0,30)}
    <label style={{ ...lbl, display:'flex', alignItems:'center', gap:8 }}><input type='checkbox' checked={cfg.showTitleDivider !== false} onChange={e=>set('showTitleDivider',e.target.checked)}/> Mostra separatore sotto il titolo</label>
    {color('dividerColor','Colore separatore')}
    {num('dividerWidth','Spessore separatore (px; 0 = nascosto)',0,8)}
    {num('dividerPaddingBottom','Distanza titolo-separatore (px)',0,24)}
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
      <div>{num('paddingTop','Padding alto',0,60)}</div><div>{num('paddingRight','Padding destro',0,60)}</div>
      <div>{num('paddingBottom','Padding basso',0,60)}</div><div>{num('paddingLeft','Padding sinistro',0,60)}</div>
    </div>
  </div>
}

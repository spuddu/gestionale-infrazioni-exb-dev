/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'

const { Fragment } = React

function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

function normalizeUrl(raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    const u = new URL(s)
    u.search = ''
    u.hash = ''
    let out = u.toString().replace(/\/$/, '')
    if (/\/(FeatureServer|MapServer)$/i.test(out)) out += '/0'
    return out
  } catch { return '' }
}

function isRiOrAdminUser(): boolean {
  const u: any = (window as any).__giiUserRole || {}
  const ruoloNum = Number(u?.ruolo)
  const ruoloLabel = String(u?.ruoloLabel || u?.ruolo || '').trim().toUpperCase()
  return ruoloNum === 4 || ruoloNum === 7 || /(^|[^A-Z])RI([^A-Z]|$)/.test(ruoloLabel) || /(^|[^A-Z])ADMIN([^A-Z]|$)/.test(ruoloLabel)
}

const LAYER_CACHE: Record<string, any> = {}
async function getLayer(urlRaw: any): Promise<any> {
  const url = normalizeUrl(urlRaw)
  if (!url) throw new Error('URL tabella non configurato.')
  if (LAYER_CACHE[url]) return LAYER_CACHE[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url })
  try { if (typeof fl.load === 'function') await fl.load() } catch {}
  LAYER_CACHE[url] = fl
  return fl
}

function num(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function round(v: number, d = 2): number { const f = Math.pow(10, d); return Math.round((Number(v) + Number.EPSILON) * f) / f }
function esc(v: string): string { return String(v || '').replace(/'/g, "''") }
function toDateValue(v: any): string { if (v == null || v === '') return ''; try { const d = new Date(v); if (Number.isNaN(d.getTime())) return ''; const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; } catch { return '' } }
function money(n: any, d = 2): string { return num(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }) }
async function queryRows(urlRaw: any, where = '1=1', orderBy = 'OBJECTID DESC'): Promise<any[]> {
  const fl = await getLayer(urlRaw)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = where
  q.outFields = ['*']
  q.returnGeometry = false
  if (orderBy) q.orderByFields = [orderBy]
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((f: any) => ({ ...f.attributes, objectid: Number(f.attributes?.OBJECTID || f.attributes?.objectid || 0) }))
}
async function applyAttrs(urlRaw: any, attrs: any, objectid?: number | null): Promise<void> {
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const fieldNames = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  const out: any = {}
  Object.keys(attrs || {}).forEach((k) => { if (fieldNames.has(k)) out[k] = attrs[k] })
  if (objectid != null) out[oidField] = Number(objectid)
  const payload = objectid != null ? { updateFeatures: [{ attributes: out }] } : { addFeatures: [{ attributes: out }] }
  const res = await fl.applyEdits(payload as any)
  const r = objectid != null ? res?.updateFeatureResults?.[0] : res?.addFeatureResults?.[0]
  if (r?.error) throw new Error(r.error.message || 'Salvataggio non riuscito.')
}
async function deleteObjectIds(urlRaw: any, objectIds: number[]): Promise<void> {
  if (!objectIds.length) return
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const Graphic = await loadEsriModule<any>('esri/Graphic')
  for (let i = 0; i < objectIds.length; i += 200) {
    const chunk = objectIds.slice(i, i + 200)
    const dels = chunk.map((id) => new Graphic({ attributes: { [oidField]: id } }))
    const res = await fl.applyEdits({ deleteFeatures: dels } as any)
    const bad = (res?.deleteFeatureResults || []).find((r: any) => r?.error)
    if (bad?.error) throw new Error(bad.error.message || 'Eliminazione non riuscita.')
  }
}
async function setOnlyOneActive(urlRaw: any, objectid: number): Promise<void> {
  const rows = await queryRows(urlRaw, '1=1', 'OBJECTID DESC')
  const fl = await getLayer(urlRaw)
  const fieldNames = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  if (!fieldNames.has('attivo')) throw new Error('Il campo attivo non esiste nella tabella.')
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200).map((r: any) => ({ attributes: { OBJECTID: r.objectid, attivo: r.objectid === objectid ? 1 : 0 } }))
    const res = await fl.applyEdits({ updateFeatures: batch } as any)
    const bad = (res?.updateFeatureResults || []).find((x: any) => x?.error)
    if (bad?.error) throw new Error(bad.error.message || 'Aggiornamento attivo non riuscito.')
  }
}
const CATEGORY_OPTIONS = ['MANODOPERA','NOLO','TRASPORTO','MATERIALI'] as const
function normalizeCategory(v: any): string {
  const s = String(v || '').trim().toUpperCase()
  if (s === 'NOLI') return 'NOLO'
  if (s === 'TRASPORTI') return 'TRASPORTO'
  if (s === 'MATERIALE') return 'MATERIALI'
  return s
}

const styles = `
.gaw { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; }
.gaw-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; }
.gaw-form { background:#f5f9ff; border:1px solid #c5d9f1; border-radius:6px; padding:12px; display:grid; grid-template-columns:1fr 1fr 2fr 0.8fr 0.9fr 0.9fr 0.7fr auto; gap:10px; align-items:end; }
.gaw-field { display:flex; flex-direction:column; gap:3px; }
.gaw-label { font-size:11px; font-weight:700; color:#1F4E79; }
.gaw-input, .gaw-select { width:100%; padding:6px 8px; border:1px solid #aac4e0; border-radius:4px; font-size:13px; box-sizing:border-box; background:#fff; }
.gaw-btn { padding:6px 16px; border:none; border-radius:4px; font-size:13px; cursor:pointer; font-weight:700; }
.gaw-save { background:#1F4E79; color:#fff; } .gaw-cancel { background:#e0e0e0; color:#333; } .gaw-new { background:#375623; color:#fff; }
.gaw-table-wrap { flex:1; min-height:0; overflow:auto; border:1px solid #c5d9f1; border-radius:6px; }
.gaw-table { width:100%; border-collapse:collapse; font-size:12px; }
.gaw-table th { background:#1F4E79; color:#fff; padding:7px 8px; text-align:left; position:sticky; top:0; z-index:1; white-space:nowrap; }
.gaw-table td { padding:6px 8px; border-bottom:1px solid #e0eaf4; } .gaw-table tbody tr:nth-child(odd) td { background:#f5f9ff; } .gaw-table tbody tr:nth-child(even) td { background:#fff; }
.gaw-msg { padding:7px 12px; border-radius:4px; font-size:12px; font-weight:700; } .gaw-ok { background:#e2efda; color:#375623; border:1px solid #b8d4b0; } .gaw-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
`;
function emptyForm(parentCode = '') { return { objectid: undefined, codice_voce_parent: parentCode, categoria_costo: 'MATERIALI', codice_riferimento: '', descrizione: '', unita_misura: '', quantita: '', prezzo_unitario: '', ordine: '', note: '' } as any }
async function recomputeParentPrice(parentUrl: string, detailUrl: string, parentCode: string): Promise<number> {
  const rows = await queryRows(detailUrl, `codice_voce_parent = '${esc(parentCode)}'`, 'ordine ASC, OBJECTID ASC')
  const total = round(rows.reduce((s:any, r:any) => s + num(r.importo || r.importo_riga), 0), 4)
  const parent = (await queryRows(parentUrl, `codice_voce = '${esc(parentCode)}'`, 'OBJECTID DESC'))[0]
  if (parent?.objectid) await applyAttrs(parentUrl, { prezzo_unitario: total }, Number(parent.objectid))
  return total
}
export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg:any = props.config || {}
  const serviceUrl = String(cfg.serviceUrl || '').trim()
  const parentTableUrl = String(cfg.parentTableUrl || '').trim()
  const title = String(cfg.title || 'GII - Analisi Prezzario Interno')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const [parents,setParents] = React.useState<any[]>([])
  const [selectedParent,setSelectedParent] = React.useState('')
  const [rows,setRows] = React.useState<any[]>([])
  const [form,setForm] = React.useState<any>(emptyForm())
  const [editing,setEditing] = React.useState(false)
  const [loading,setLoading] = React.useState(false)
  const [saving,setSaving] = React.useState(false)
  const [msg,setMsg] = React.useState<{text:string;ok:boolean}|null>(null)
  const [isRi,setIsRi] = React.useState(isRiOrAdminUser())
  React.useEffect(() => { const refresh = () => setIsRi(isRiOrAdminUser()); refresh(); window.addEventListener('gii:userLoaded', refresh); return () => window.removeEventListener('gii:userLoaded', refresh) }, [])
  React.useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), 5000); return () => window.clearTimeout(t) }, [msg])
  React.useEffect(() => { let cancel = false; const run = async () => { if (!parentTableUrl) return; try { const rr = await queryRows(parentTableUrl, '1=1', 'descrizione ASC, OBJECTID ASC'); if (cancel) return; setParents(rr); if (!selectedParent && rr[0]) setSelectedParent(String(rr[0].codice_voce || rr[0].codice_interno || '')) } catch {} }; void run(); return () => { cancel = true } }, [parentTableUrl, selectedParent])
  const load = React.useCallback(async () => { if (!serviceUrl || !selectedParent) { setRows([]); return }; setLoading(true); try { setRows(await queryRows(serviceUrl, `codice_voce_parent = '${esc(selectedParent)}'`, 'ordine ASC, OBJECTID ASC')) } catch (e:any) { setMsg({text:'Errore caricamento: ' + (e?.message ?? e), ok:false}) } setLoading(false) }, [serviceUrl, selectedParent])
  React.useEffect(() => { void load() }, [load])
  const onNew = () => { setEditing(true); setForm(emptyForm(selectedParent)) }
  const onEdit = (r:any) => { setEditing(true); setForm({ objectid:r.objectid, codice_voce_parent:String(r.codice_voce_parent || selectedParent), categoria_costo: normalizeCategory(r.categoria_costo || 'MATERIALI') || 'MATERIALI', codice_riferimento:String(r.codice_riferimento || ''), descrizione:String(r.descrizione || ''), unita_misura:String(r.unita_misura || ''), quantita:String(r.quantita ?? ''), prezzo_unitario:String(r.prezzo_unitario ?? ''), ordine:String(r.ordine ?? ''), note:String(r.note || '') }) }
  const onCancel = () => { setEditing(false); setForm(emptyForm(selectedParent)) }
  const onSave = async () => {
    const parentCode = String(form.codice_voce_parent || selectedParent || '').trim()
    if (!parentCode) { setMsg({text:'Seleziona prima una voce interna.', ok:false}); return }
    if (!String(form.descrizione || '').trim()) { setMsg({text:'Compila la descrizione della riga di analisi.', ok:false}); return }
    const q = round(num(form.quantita), 4)
    const pu = round(num(form.prezzo_unitario), 4)
    const imp = round(q * pu, 4)
    setSaving(true)
    try {
      await applyAttrs(serviceUrl, { codice_voce_parent: parentCode, categoria_costo: normalizeCategory(form.categoria_costo), codice_riferimento:String(form.codice_riferimento||'').trim(), descrizione:String(form.descrizione||'').trim(), unita_misura:String(form.unita_misura||'').trim(), quantita:q, prezzo_unitario:pu, importo:imp, ordine: form.ordine === '' ? null : Math.trunc(num(form.ordine)), note:String(form.note||'').trim() }, form.objectid != null ? Number(form.objectid) : null)
      const total = await recomputeParentPrice(parentTableUrl, serviceUrl, parentCode)
      setMsg({text:`Analisi salvata. Prezzo voce ricalcolato: ${money(total,4)}`, ok:true})
      onCancel(); await load()
    } catch (e:any) { setMsg({text:'Errore: ' + (e?.message ?? e), ok:false}) }
    setSaving(false)
  }
  const onDelete = async (r:any) => { if (!window.confirm(`Eliminare la riga di analisi "${r.descrizione}"?`)) return; setSaving(true); try { await deleteObjectIds(serviceUrl, [Number(r.objectid)]); const total = await recomputeParentPrice(parentTableUrl, serviceUrl, selectedParent); await load(); setMsg({text:`Riga eliminata. Prezzo voce ricalcolato: ${money(total,4)}`, ok:true}) } catch (e:any) { setMsg({text:'Errore: ' + (e?.message ?? e), ok:false}) } setSaving(false) }
  if (!isRi) return <div style={{ padding:12, fontFamily:'Arial, sans-serif', color:'#7a1c1c', background:'#fce4e4', border:'1px solid #f5b8b8', borderRadius:6 }}>Widget riservato al Responsabile Istruttore (RI) o all'Amministratore (ADMIN).</div>
  return (<Fragment><style>{styles}</style><div className='gaw'><div className='gaw-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>{(!serviceUrl || !parentTableUrl) ? <div className='gaw-msg gaw-err'>Configura gli URL delle tabelle nel setting del widget.</div> : null}{msg && <div className={`gaw-msg ${msg.ok ? 'gaw-ok':'gaw-err'}`}>{msg.text}</div>}<div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'end' }}><div className='gaw-field' style={{ minWidth:300 }}><div className='gaw-label'>Voce interna</div><select className='gaw-select' value={selectedParent} onChange={(e) => setSelectedParent(e.target.value)}><option value=''>— seleziona —</option>{parents.map((p:any) => <option key={p.objectid} value={String(p.codice_voce || p.codice_interno || '')}>{`${p.codice_voce || p.codice_interno} — ${p.descrizione}`}</option>)}</select></div><div><button className='gaw-btn gaw-new' onClick={onNew} disabled={!selectedParent}>+ Nuova riga</button></div></div>{editing && <div className='gaw-form'><div className='gaw-field'><div className='gaw-label'>Categoria</div><select className='gaw-select' value={form.categoria_costo || 'MATERIALI'} onChange={e=>setForm((f:any)=>({...f,categoria_costo:e.target.value}))}>{CATEGORY_OPTIONS.map((c)=><option key={c} value={c}>{c}</option>)}</select></div><div className='gaw-field'><div className='gaw-label'>Codice rif.</div><input className='gaw-input' value={form.codice_riferimento || ''} onChange={e=>setForm((f:any)=>({...f,codice_riferimento:e.target.value}))} /></div><div className='gaw-field'><div className='gaw-label'>Descrizione</div><input className='gaw-input' value={form.descrizione || ''} onChange={e=>setForm((f:any)=>({...f,descrizione:e.target.value}))} /></div><div className='gaw-field'><div className='gaw-label'>UM</div><input className='gaw-input' value={form.unita_misura || ''} onChange={e=>setForm((f:any)=>({...f,unita_misura:e.target.value}))} /></div><div className='gaw-field'><div className='gaw-label'>Quantità</div><input className='gaw-input' type='number' step='0.0001' value={form.quantita || ''} onChange={e=>setForm((f:any)=>({...f,quantita:e.target.value}))} /></div><div className='gaw-field'><div className='gaw-label'>Prezzo unit.</div><input className='gaw-input' type='number' step='0.0001' value={form.prezzo_unitario || ''} onChange={e=>setForm((f:any)=>({...f,prezzo_unitario:e.target.value}))} /></div><div className='gaw-field'><div className='gaw-label'>Ordine</div><input className='gaw-input' type='number' step='1' value={form.ordine || ''} onChange={e=>setForm((f:any)=>({...f,ordine:e.target.value}))} /></div><div style={{ display:'flex', gap:8 }}><button className='gaw-btn gaw-save' disabled={saving} onClick={onSave}>{form.objectid ? 'Aggiorna' : 'Aggiungi'}</button><button className='gaw-btn gaw-cancel' disabled={saving} onClick={onCancel}>Annulla</button></div></div>}<div className='gaw-table-wrap'><table className='gaw-table'><thead><tr><th>Categoria</th><th>Codice</th><th>Descrizione</th><th>UM</th><th>Q.tà</th><th>Prezzo</th><th>Importo</th><th>Azioni</th></tr></thead><tbody>{rows.length===0 ? <tr><td colSpan={8} style={{ padding:16, textAlign:'center', color:'#6b7280' }}>{loading ? 'Caricamento…' : 'Nessuna riga di analisi.'}</td></tr> : rows.map((r:any)=><tr key={r.objectid}><td>{normalizeCategory(r.categoria_costo)}</td><td>{r.codice_riferimento}</td><td>{r.descrizione}</td><td>{r.unita_misura}</td><td>{money(r.quantita,4)}</td><td>{money(r.prezzo_unitario,4)}</td><td>{money(r.importo,4)}</td><td style={{ whiteSpace:'nowrap' }}><button className='gaw-btn gaw-save' onClick={()=>onEdit(r)}>Modifica</button><button className='gaw-btn' style={{background:'#c00', color:'#fff'}} onClick={()=>void onDelete(r)}>Elimina</button></td></tr>)}</tbody></table></div></div></Fragment>)
}

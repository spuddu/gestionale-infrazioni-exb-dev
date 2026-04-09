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
.gvw { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; }
.gvw-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; }
.gvw-form { background:#f5f9ff; border:1px solid #c5d9f1; border-radius:6px; padding:12px; display:grid; grid-template-columns:1.2fr 3fr 1fr 1fr 1fr auto; gap:10px; align-items:end; }
.gvw-field { display:flex; flex-direction:column; gap:3px; }
.gvw-label { font-size:11px; font-weight:700; color:#1F4E79; }
.gvw-input, .gvw-select { width:100%; padding:6px 8px; border:1px solid #aac4e0; border-radius:4px; font-size:13px; box-sizing:border-box; background:#fff; }
.gvw-btn { padding:6px 16px; border:none; border-radius:4px; font-size:13px; cursor:pointer; font-weight:700; }
.gvw-save { background:#1F4E79; color:#fff; }
.gvw-cancel { background:#e0e0e0; color:#333; }
.gvw-table-wrap { flex:1; min-height:0; overflow:auto; border:1px solid #c5d9f1; border-radius:6px; }
.gvw-table { width:100%; border-collapse:collapse; font-size:12px; }
.gvw-table th { background:#1F4E79; color:#fff; padding:7px 8px; text-align:left; position:sticky; top:0; z-index:1; white-space:nowrap; }
.gvw-table td { padding:6px 8px; border-bottom:1px solid #e0eaf4; vertical-align:middle; }
.gvw-table tbody tr:nth-child(odd) td { background:#f5f9ff; }
.gvw-table tbody tr:nth-child(even) td { background:#fff; }
.gvw-msg { padding:7px 12px; border-radius:4px; font-size:12px; font-weight:700; }
.gvw-msg-ok { background:#e2efda; color:#375623; border:1px solid #b8d4b0; }
.gvw-msg-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
`;

function emptyForm() { return { objectid: undefined, codice_voce: '', descrizione: '', categoria_default: 'MATERIALI', selezionabile: '1', attivo: '1' } as any }

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const serviceUrl = String(cfg.serviceUrl || '').trim()
  const prezzariUrl = String(cfg.prezzariUrl || '').trim()
  const title = String(cfg.title || 'GII - Gestione Voci Prezzario')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const [rows, setRows] = React.useState<any[]>([])
  const [prezzari, setPrezzari] = React.useState<any[]>([])
  const [selectedCode, setSelectedCode] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [form, setForm] = React.useState<any>(emptyForm())
  const [editing, setEditing] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text:string; ok:boolean } | null>(null)
  const [isRi, setIsRi] = React.useState(isRiOrAdminUser())

  React.useEffect(() => { const refresh = () => setIsRi(isRiOrAdminUser()); refresh(); window.addEventListener('gii:userLoaded', refresh); return () => window.removeEventListener('gii:userLoaded', refresh) }, [])
  React.useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), 5000); return () => window.clearTimeout(t) }, [msg])

  React.useEffect(() => {
    let cancel = false
    const run = async () => {
      if (!prezzariUrl) return
      try {
        const rr = await queryRows(prezzariUrl, '1=1', 'anno_prezzario DESC, OBJECTID DESC')
        if (cancel) return
        setPrezzari(rr)
        const active = rr.find((r:any) => num(r.stato_prezzario) === 1) || rr[0]
        if (active && !selectedCode) setSelectedCode(String(active.codice_prezzario || ''))
      } catch {}
    }
    void run(); return () => { cancel = true }
  }, [prezzariUrl, selectedCode])

  const load = React.useCallback(async () => {
    if (!serviceUrl || !selectedCode) { setRows([]); return }
    setLoading(true)
    try {
      const rr = await queryRows(serviceUrl, `codice_prezzario = '${esc(selectedCode)}'`, 'descrizione ASC, OBJECTID ASC')
      setRows(rr)
    } catch (e:any) { setMsg({ text: 'Errore caricamento: ' + (e?.message ?? e), ok: false }) }
    setLoading(false)
  }, [serviceUrl, selectedCode])
  React.useEffect(() => { void load() }, [load])

  const filtered = rows.filter((r:any) => !search || `${r.codice_voce} ${r.descrizione} ${r.famiglia}`.toLowerCase().includes(search.toLowerCase()))
  const onEdit = (r:any) => { setEditing(true); setForm({ objectid:r.objectid, codice_voce:String(r.codice_voce||''), descrizione:String(r.descrizione||''), categoria_default: normalizeCategory(r.categoria_default || 'MATERIALI') || 'MATERIALI', selezionabile: String(r.selezionabile ?? '1'), attivo: String(r.attivo ?? '1') }) }
  const onCancel = () => { setEditing(false); setForm(emptyForm()) }
  const onSave = async () => {
    if (!form.objectid) { setMsg({ text: 'Seleziona una riga da modificare.', ok:false }); return }
    setSaving(true)
    try {
      await applyAttrs(serviceUrl, { categoria_default: normalizeCategory(form.categoria_default), selezionabile: String(form.selezionabile) === '1' ? 1 : 0, attivo: String(form.attivo) === '1' ? 1 : 0 }, Number(form.objectid))
      setMsg({ text: 'Voce aggiornata.', ok:true })
      onCancel(); await load()
    } catch (e:any) { setMsg({ text: 'Errore: ' + (e?.message ?? e), ok:false }) }
    setSaving(false)
  }

  if (!isRi) return <div style={{ padding:12, fontFamily:'Arial, sans-serif', color:'#7a1c1c', background:'#fce4e4', border:'1px solid #f5b8b8', borderRadius:6 }}>Widget riservato al Responsabile Istruttore (RI) o all'Amministratore (ADMIN).</div>

  return (
    <Fragment>
      <style>{styles}</style>
      <div className='gvw'>
        <div className='gvw-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>
        {(!serviceUrl || !prezzariUrl) ? <div className='gvw-msg gvw-msg-err'>Configura gli URL delle tabelle nel setting del widget.</div> : null}
        {msg && <div className={`gvw-msg ${msg.ok ? 'gvw-msg-ok' : 'gvw-msg-err'}`}>{msg.text}</div>}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'end' }}>
          <div className='gvw-field' style={{ minWidth:260 }}><div className='gvw-label'>Prezzario</div><select className='gvw-select' value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)}><option value=''>— seleziona —</option>{prezzari.map((p:any) => <option key={p.objectid} value={String(p.codice_prezzario || '')}>{`${p.codice_prezzario}${num(p.stato_prezzario) === 1 ? ' (attivo)' : ''}`}</option>)}</select></div>
          <div className='gvw-field' style={{ flex:'1 1 260px' }}><div className='gvw-label'>Cerca</div><input className='gvw-input' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='codice o descrizione' /></div>
        </div>
        {editing && <div className='gvw-form'>
          <div className='gvw-field'><div className='gvw-label'>Codice</div><input className='gvw-input' disabled value={form.codice_voce || ''} /></div>
          <div className='gvw-field'><div className='gvw-label'>Descrizione</div><input className='gvw-input' disabled value={form.descrizione || ''} /></div>
          <div className='gvw-field'><div className='gvw-label'>Categoria</div><select className='gvw-select' value={form.categoria_default || 'MATERIALI'} onChange={(e) => setForm((f:any) => ({ ...f, categoria_default:e.target.value }))}>{CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className='gvw-field'><div className='gvw-label'>Selezionabile</div><select className='gvw-select' value={String(form.selezionabile ?? '1')} onChange={(e) => setForm((f:any) => ({ ...f, selezionabile:e.target.value }))}><option value='1'>Sì</option><option value='0'>No</option></select></div>
          <div className='gvw-field'><div className='gvw-label'>Attivo</div><select className='gvw-select' value={String(form.attivo ?? '1')} onChange={(e) => setForm((f:any) => ({ ...f, attivo:e.target.value }))}><option value='1'>Sì</option><option value='0'>No</option></select></div>
          <div style={{ display:'flex', gap:8 }}><button className='gvw-btn gvw-save' disabled={saving} onClick={onSave}>Salva</button><button className='gvw-btn gvw-cancel' disabled={saving} onClick={onCancel}>Annulla</button></div>
        </div>}
        <div className='gvw-table-wrap'>
          <table className='gvw-table'>
            <thead><tr><th>Codice</th><th>Descrizione</th><th>Fam.</th><th>UM</th><th>Prezzo</th><th>Categoria</th><th>Sel.</th><th>Att.</th><th>Azioni</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={9} style={{ padding:16, textAlign:'center', color:'#6b7280' }}>{loading ? 'Caricamento…' : 'Nessuna voce.'}</td></tr> : filtered.map((r:any) => (
                <tr key={r.objectid}>
                  <td><b>{r.codice_voce}</b></td><td>{r.descrizione}</td><td>{r.famiglia}</td><td>{r.unita_misura}</td><td>{money(r.prezzo_unitario, 4)}</td><td>{normalizeCategory(r.categoria_default) || ''}</td><td>{num(r.selezionabile) === 1 ? 'Sì' : 'No'}</td><td>{num(r.attivo) === 1 ? 'Sì' : 'No'}</td>
                  <td><button className='gvw-btn gvw-save' onClick={() => onEdit(r)}>Modifica</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  )
}

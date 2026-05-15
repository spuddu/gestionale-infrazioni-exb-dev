/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'

const { Fragment } = React

const styles = `
  .gns { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; }
  .gns-title { font-size: 15px; font-weight: bold; color: #1F4E79; border-bottom: 2px solid #1F4E79; padding-bottom: 6px; margin: 0; }
  .gns-form { background: #f5f9ff; border: 1px solid #c5d9f1; border-radius: 6px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .gns-field { display: flex; flex-direction: column; gap: 3px; }
  .gns-label { font-size: 11px; font-weight: bold; color: #1F4E79; }
  .gns-input, .gns-select { width: 100%; padding: 5px 8px; border: 1px solid #aac4e0; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fff; }
  .gns-input:focus, .gns-select:focus { outline: none; border-color: #1F4E79; }
  .gns-btns { display: flex; gap: 8px; grid-column: 1 / -1; padding-top: 4px; }
  .gns-btn { padding: 6px 18px; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: bold; }
  .gns-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .gns-btn-save { background: #1F4E79; color: #fff; }
  .gns-btn-cancel { background: #e0e0e0; color: #333; }
  .gns-btn-new { background: #375623; color: #fff; }
  .gns-btn-export { background: #1B6584; color: #fff; }
  .gns-table-wrap { flex: 1; overflow-y: auto; border: 1px solid #c5d9f1; border-radius: 6px; min-height: 0; }
  .gns-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .gns-table th { background: #1F4E79; color: #fff; padding: 7px 8px; text-align: left; position: sticky; top: 0; z-index: 1; white-space: nowrap; }
  .gns-table td { padding: 6px 8px; border-bottom: 1px solid #e0eaf4; vertical-align: middle; }
  .gns-table tbody tr:nth-child(odd) td { background: #f5f9ff; }
  .gns-table tbody tr:nth-child(even) td { background: #ffffff; }
  .gns-table tr:hover td { background: #ddeeff; }
  .gns-act { cursor: pointer; font-size: 11px; padding: 2px 8px; border-radius: 3px; border: none; margin-right: 4px; font-weight: bold; }
  .gns-act-edit { background: #1B6584; color: #fff; }
  .gns-act-del { background: #c00; color: #fff; }
  .gns-msg { padding: 7px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .gns-msg-ok { background: #e2efda; color: #375623; border: 1px solid #b8d4b0; }
  .gns-msg-err { background: #fce4e4; color: #c00; border: 1px solid #f5b8b8; }
  .gns-empty { text-align: center; color: #888; padding: 20px; font-style: italic; }
`


const TITLE_DEFAULT = "GII - Gestione Parametri Nota Spese"
const FIELD_ORDER = ["codice_parametro", "descrizione", "anno_riferimento", "valore_num", "valore_testo", "attivo", "data_validita_da", "data_validita_a", "note"]
const FIELD_TYPES: Record<string, string> = {"codice_parametro": "text", "descrizione": "text", "anno_riferimento": "int", "valore_num": "number2", "valore_testo": "text", "attivo": "bool", "data_validita_da": "date", "data_validita_a": "date", "note": "text"} as any
const FIELD_LABELS: Record<string, string> = {"codice_parametro": "Codice parametro", "descrizione": "Descrizione", "anno_riferimento": "Anno", "valore_num": "Valore num.", "valore_testo": "Valore testo", "attivo": "Attivo", "data_validita_da": "Valido da", "data_validita_a": "Valido a", "note": "Note"} as any

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

const LAYER_CACHE: Record<string, any> = {}
async function getLayer(urlRaw: any): Promise<any> {
  const url = normalizeUrl(urlRaw)
  if (!url) throw new Error('URL tabella non configurata.')
  if (LAYER_CACHE[url]) return LAYER_CACHE[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url })
  try { if (typeof fl.load === 'function') await fl.load() } catch {}
  LAYER_CACHE[url] = fl
  return fl
}

function emptyForm() {
  return { objectid: undefined, codice_parametro: '', descrizione: '', anno_riferimento: '', valore_num: '', valore_testo: '', attivo: '', data_validita_da: '', data_validita_a: '', note: '' } as any
}

function num(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function toDateValue(v: any): string { if (v == null || v === '') return ''; try { const d = new Date(v); if (Number.isNaN(d.getTime())) return ''; const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; } catch { return '' } }
function formatCell(v: any, kind: string): string {
  if (v == null || v === '') return ''
  if (kind === 'bool') return num(v) === 1 ? 'Sì' : 'No'
  if (kind === 'date') { const s = toDateValue(v); return s ? s.split('-').reverse().join('/') : '' }
  if (kind === 'number2') return num(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (kind === 'number4') return num(v).toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  if (kind === 'int') return String(Math.trunc(num(v)))
  return String(v)
}

async function fetchRows(url: string): Promise<any[]> {
  const fl = await getLayer(url)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = '1=1'
  q.outFields = ['*']
  q.returnGeometry = false
  q.orderByFields = ['OBJECTID DESC']
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((f: any) => ({ ...f.attributes, objectid: Number(f.attributes?.OBJECTID || f.attributes?.objectid || 0) }))
}

async function saveRow(url: string, form: any): Promise<void> {
  const fl = await getLayer(url)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const attrs: any = {}
  FIELD_ORDER.forEach((f) => {
    const kind = FIELD_TYPES[f]
    const raw = form[f]
    if (kind === 'bool') attrs[f] = String(raw || '1') === '1' ? 1 : 0
    else if (kind === 'int') attrs[f] = raw === '' ? null : Math.trunc(num(raw))
    else if (kind === 'number2' || kind === 'number4') attrs[f] = raw === '' ? null : num(raw)
    else if (kind === 'date') attrs[f] = raw ? new Date(`${raw}T00:00:00`).getTime() : null
    else attrs[f] = String(raw || '').trim()
  })
  if (form.objectid != null) attrs[oidField] = Number(form.objectid)
  const payload = form.objectid != null ? { updateFeatures: [{ attributes: attrs }] } : { addFeatures: [{ attributes: attrs }] }
  const res = await fl.applyEdits(payload as any)
  const r = form.objectid != null ? res?.updateFeatureResults?.[0] : res?.addFeatureResults?.[0]
  if (r?.error) throw new Error(r.error.message || 'Salvataggio non riuscito.')
}

async function deleteRow(url: string, objectid: number): Promise<void> {
  const fl = await getLayer(url)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const Graphic = await loadEsriModule<any>('esri/Graphic')
  const g = new Graphic({ attributes: { [oidField]: Number(objectid) } })
  const res = await fl.applyEdits({ deleteFeatures: [g] } as any)
  const r = res?.deleteFeatureResults?.[0]
  if (r?.error) throw new Error(r.error.message || 'Eliminazione non riuscita.')
}

function exportCsv(rows: any[], title: string) {
  const header = FIELD_ORDER.join(',')
  const body = rows.map((r) => FIELD_ORDER.map((ff) => `"${String(r?.[ff] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ROLE_CODE_BY_NUM: Record<number, string> = { 1: 'TR', 2: 'TI', 3: 'RZ', 4: 'RI', 5: 'DT', 6: 'DA', 7: 'ADMIN' }
const AREA_CODE_BY_NUM: Record<number, string> = { 1: 'AMM', 2: 'AGR', 3: 'TEC' }
const SETTORE_CODE_BY_NUM: Record<number, string> = { 1: 'CR', 2: 'GI', 3: 'D1', 4: 'D2', 5: 'D3', 6: 'D4', 7: 'D5', 8: 'D6', 9: 'DS' }

function cleanCode(v: any): string {
  return String(v ?? '').trim().toUpperCase()
}

function normalizeRoleCode(...values: any[]): string {
  for (const value of values) {
    const s = cleanCode(value)
    if (!s) continue
    const n = Number(s)
    if (Number.isFinite(n) && ROLE_CODE_BY_NUM[n]) return ROLE_CODE_BY_NUM[n]
    if (['TR', 'TI', 'RZ', 'RI', 'DT', 'DA', 'ADMIN'].includes(s)) return s
    if (/(^|[^A-Z])ADMIN([^A-Z]|$)/.test(s) || s.includes('AMMINISTRATORE')) return 'ADMIN'
    if (/(^|[^A-Z])RI([^A-Z]|$)/.test(s) || s.includes('RESPONSABILE ISTRUTTORIA')) return 'RI'
    if (/(^|[^A-Z])RZ([^A-Z]|$)/.test(s) || s.includes('RESPONSABILE DI ZONA')) return 'RZ'
    if (/(^|[^A-Z])TI([^A-Z]|$)/.test(s) || s.includes('TECNICO ISTRUTTORE')) return 'TI'
    if (/(^|[^A-Z])TR([^A-Z]|$)/.test(s) || s.includes('TECNICO RILEVATORE')) return 'TR'
    if (/(^|[^A-Z])DT([^A-Z]|$)/.test(s) || s.includes('DIRETTORE TECNICO')) return 'DT'
    if (/(^|[^A-Z])DA([^A-Z]|$)/.test(s) || s.includes('DIRETTORE AMMINISTRATIVO')) return 'DA'
  }
  return ''
}

function normalizeAreaCode(...values: any[]): string {
  for (const value of values) {
    const s = cleanCode(value)
    if (!s) continue
    const n = Number(s)
    if (Number.isFinite(n) && AREA_CODE_BY_NUM[n]) return AREA_CODE_BY_NUM[n]
    if (['AMM', 'AGR', 'TEC'].includes(s)) return s
    if (s.includes('AMMINISTR')) return 'AMM'
    if (s.includes('AGRAR')) return 'AGR'
    if (s.includes('TECNIC')) return 'TEC'
  }
  return ''
}

function normalizeSettoreCode(...values: any[]): string {
  for (const value of values) {
    const s0 = cleanCode(value)
    if (!s0) continue
    const s = s0 === 'CS' ? 'DS' : s0
    const n = Number(s)
    if (Number.isFinite(n) && SETTORE_CODE_BY_NUM[n]) return SETTORE_CODE_BY_NUM[n]
    if (['CR', 'GI', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'DS'].includes(s)) return s
    if (s.includes('DRENO') || s.includes('SCOLO')) return 'DS'
    if (s.includes('CATASTO') || s.includes('RUOLI')) return 'CR'
    if (s.includes('GESTIONE IRRIGUA')) return 'GI'
  }
  return ''
}

function getCurrentGiiContext(): { ruoloCod: string, areaCod: string, settoreCod: string } {
  const u: any = (window as any).__giiUserRole || {}
  return {
    ruoloCod: normalizeRoleCode(u?.ruoloCod, u?.ruolo_cod, u?.roleCod, u?.role_code, u?.ruolo, u?.ruoloLabel, u?.role),
    areaCod: normalizeAreaCode(u?.areaCod, u?.area_cod, u?.areaCode, u?.area, u?.areaLabel),
    settoreCod: normalizeSettoreCode(u?.settoreCod, u?.settore_cod, u?.sectorCod, u?.settore, u?.settoreLabel)
  }
}

function isRiOrAdminUser(): boolean {
  const { ruoloCod } = getCurrentGiiContext()
  return ruoloCod === 'RI' || ruoloCod === 'ADMIN'
}

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const serviceUrl = String(cfg.serviceUrl || '').trim()
  const resolvedUrl = normalizeUrl(serviceUrl)
  const title = String(cfg.title || TITLE_DEFAULT)
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const [rows, setRows] = React.useState<any[]>([])
  const [form, setForm] = React.useState<any>(emptyForm())
  const [editing, setEditing] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null)
  const [isRi, setIsRi] = React.useState<boolean>(isRiOrAdminUser())

  React.useEffect(() => {
    const refresh = () => setIsRi(isRiOrAdminUser())
    refresh()
    window.addEventListener('gii:userLoaded', refresh)
    return () => window.removeEventListener('gii:userLoaded', refresh)
  }, [])

  const load = React.useCallback(async () => {
    if (!resolvedUrl) { setRows([]); return }
    setLoading(true)
    try { setRows(await fetchRows(resolvedUrl)) }
    catch (e: any) { setMsg({ text: 'Errore caricamento: ' + (e?.message ?? e), ok: false }) }
    setLoading(false)
  }, [resolvedUrl])

  React.useEffect(() => { void load() }, [load])
  React.useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), 4000); return () => window.clearTimeout(t) }, [msg])

  const onNew = () => { setForm(emptyForm()); setEditing(true) }
  const onEdit = (r: any) => {
    const next: any = { objectid: r.objectid }
    FIELD_ORDER.forEach((f) => {
      const kind = FIELD_TYPES[f]
      next[f] = kind === 'date' ? toDateValue(r?.[f]) : String(r?.[f] ?? (kind === 'bool' ? '1' : ''))
    })
    setForm(next)
    setEditing(true)
  }
  const onCancel = () => { setForm(emptyForm()); setEditing(false) }
  const onSave = async () => {
    if (!resolvedUrl) { setMsg({ text: 'URL tabella non configurata o non valido.', ok: false }); return }
    if (!String(form.codice_parametro || "").trim() || !String(form.descrizione || "").trim()) {
      setMsg({ text: 'Compilare almeno codice e descrizione.', ok: false })
      return
    }
    setSaving(true)
    try {
      await saveRow(resolvedUrl, form)
      setMsg({ text: form.objectid ? 'Record aggiornato' : 'Record aggiunto', ok: true })
      setEditing(false)
      setForm(emptyForm())
      await load()
    } catch (e: any) { setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false }) }
    setSaving(false)
  }
  const onDelete = async (r: any) => {
    if (!window.confirm(`Eliminare il record "${String(r?.descrizione || r?.codice_voce || r?.codice_parametro || '')}"?`)) return
    setSaving(true)
    try { await deleteRow(resolvedUrl, Number(r.objectid)); setMsg({ text: 'Record eliminato', ok: true }); await load() }
    catch (e: any) { setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false }) }
    setSaving(false)
  }

  if (!isRi) {
    return <div style={{ padding: 12, fontFamily: 'Arial, sans-serif', color: '#7a1c1c', background: '#fce4e4', border: '1px solid #f5b8b8', borderRadius: 6 }}>Widget riservato al Responsabile Istruttore (RI) o all'Amministratore (ADMIN).</div>
  }

  return (
    <Fragment>
      <style>{styles}</style>
      <div className="gns">
        <div className="gns-title" style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>
        {!serviceUrl ? <div className="gns-msg gns-msg-err">Configura l'URL della tabella nel setting del widget.</div> : null}
        {msg && <div className={`gns-msg ${msg.ok ? 'gns-msg-ok' : 'gns-msg-err'}`}>{msg.text}</div>}
        {!editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="gns-btn gns-btn-new" onClick={onNew} disabled={!resolvedUrl}>+ Nuovo record</button>
            <button className="gns-btn gns-btn-export" onClick={() => exportCsv(rows, title)} disabled={rows.length === 0}>⬇ Esporta CSV</button>
          </div>
        )}
        {editing && (
          <div className="gns-form">
            <div className="gns-field">
              <div className="gns-label">Codice parametro</div>
              <input className="gns-input" value={form.codice_parametro || ''} onChange={e => setForm((f: any) => ({ ...f, codice_parametro: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">Descrizione</div>
              <input className="gns-input" value={form.descrizione || ''} onChange={e => setForm((f: any) => ({ ...f, descrizione: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">Anno</div>
              <input className="gns-input" type="number" step="1" value={form.anno_riferimento || ''} onChange={e => setForm((f: any) => ({ ...f, anno_riferimento: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">Valore num.</div>
              <input className="gns-input" type="number" step="0.01" value={form.valore_num || ''} onChange={e => setForm((f: any) => ({ ...f, valore_num: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">Valore testo</div>
              <input className="gns-input" value={form.valore_testo || ''} onChange={e => setForm((f: any) => ({ ...f, valore_testo: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">Attivo</div>
              <select className="gns-select" value={String(form.attivo ?? '')} onChange={e => setForm((f: any) => ({ ...f, attivo: e.target.value }))}>
                <option value="1">Sì</option>
                <option value="0">No</option>
              </select>
            </div>
            <div className="gns-field">
              <div className="gns-label">Valido da</div>
              <input className="gns-input" type="date" value={form.data_validita_da || ''} onChange={e => setForm((f: any) => ({ ...f, data_validita_da: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">Valido a</div>
              <input className="gns-input" type="date" value={form.data_validita_a || ''} onChange={e => setForm((f: any) => ({ ...f, data_validita_a: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">Note</div>
              <input className="gns-input" value={form.note || ''} onChange={e => setForm((f: any) => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="gns-btns">
              <button className="gns-btn gns-btn-save" onClick={onSave} disabled={saving}>{saving ? 'Salvataggio...' : form.objectid ? 'Aggiorna' : 'Salva'}</button>
              <button className="gns-btn gns-btn-cancel" onClick={onCancel} disabled={saving}>Annulla</button>
            </div>
          </div>
        )}
        <div className="gns-table-wrap">
          {loading ? <div className="gns-empty">Caricamento...</div> : (
            <table className="gns-table">
              <thead>
                <tr>
                    <th>Codice parametro</th>
                    <th>Descrizione</th>
                    <th>Anno</th>
                    <th>Valore num.</th>
                    <th>Valore testo</th>
                    <th>Attivo</th>
                    <th>Valido da</th>
                    <th>Valido a</th>
                    <th>Note</th>
                    <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={FIELD_ORDER.length + 1} className="gns-empty">Nessun record presente</td></tr>}
                {rows.map((r, idx) => (
                  <tr key={r.objectid || idx}>
                      <td>{formatCell(r.codice_parametro, 'text')}</td>
                      <td>{formatCell(r.descrizione, 'text')}</td>
                      <td>{formatCell(r.anno_riferimento, 'int')}</td>
                      <td>{formatCell(r.valore_num, 'number2')}</td><td>{formatCell(r.valore_testo, 'text')}</td>
                      <td>{formatCell(r.attivo, 'bool')}</td>
                      <td>{formatCell(r.data_validita_da, 'date')}</td>
                      <td>{formatCell(r.data_validita_a, 'date')}</td>
                      <td>{formatCell(r.note, 'text')}</td>
                    <td>
                      <button className="gns-act gns-act-edit" onClick={() => onEdit(r)}>✎</button>
                      <button className="gns-act gns-act-del" onClick={() => void onDelete(r)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Fragment>
  )
}

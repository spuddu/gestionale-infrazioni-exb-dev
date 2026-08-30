/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import GiiActiveToggle from '../../../_shared/gii-ui/active-toggle'

const { Fragment } = React


type RecordActionButtonProps = {
  onClick: (event: any) => void
  disabled?: boolean
  title?: string
  ariaLabel?: string
  marginRight?: number
}

function recordActionStyle (color: string, disabled: boolean, marginRight = 0): React.CSSProperties {
  return {
    border: 'none',
    background: 'transparent',
    color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: 28,
    height: 28,
    padding: 0,
    boxSizing: 'border-box',
    marginRight,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    opacity: disabled ? 0.45 : 1
  }
}

function RecordEditButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Modifica'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#0d3b66', disabled, props.marginRight ?? 4)}>
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
      </svg>
    </button>
  )
}

function RecordDeleteButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Elimina'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#b42318', disabled, props.marginRight ?? 0)}>
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M3 6h18'/>
        <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
        <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
        <path d='M10 11v6'/>
        <path d='M14 11v6'/>
      </svg>
    </button>
  )
}

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
function normalizeGiiAccessCode(v: any): string {
  return String(v ?? '').trim().toUpperCase().replace(/-/g, '_')
}

function getGiiOperationalProfileCodes(): string[] {
  const u: any = (window as any).__giiUserRole || {}
  const codes = new Set<string>()

  const direct = normalizeGiiAccessCode(u?.profiloCod ?? u?.profilo_cod ?? u?.profileCode ?? u?.profile_code)
  if (direct) codes.add(direct)

  const role = normalizeGiiAccessCode(u?.ruoloCod ?? u?.ruolo_cod ?? u?.roleCod ?? u?.roleCode ?? u?.role_code)
  if (role) codes.add(role)
  if (u?.isAdmin === true) codes.add('ADMIN')

  const assignments = Array.isArray(u?.assignments) ? u.assignments : []
  assignments.forEach((assignment: any) => {
    const assignmentCode = normalizeGiiAccessCode(
      assignment?.profiloCod ?? assignment?.profilo_cod ??
      assignment?.profileCode ?? assignment?.profile_code ??
      assignment?.ruoloCod ?? assignment?.ruolo_cod ??
      assignment?.roleCod ?? assignment?.roleCode ?? assignment?.role_code
    )
    if (assignmentCode) codes.add(assignmentCode)
  })

  return Array.from(codes)
}

function isRitOrAdminUser(): boolean {
  const profiloCodes = getGiiOperationalProfileCodes()
  return profiloCodes.includes('RIT') || profiloCodes.includes('ADMIN')
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
function money(n: any, d = 2): string { return num(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }) }
function pad4(v: any): string { return String(v == null ? '' : v).replace(/\D/g, '').slice(0, 4).padStart(4, '0') }
function asYear(v: any): number { const y = Math.trunc(num(v)); return y > 0 ? y : new Date().getFullYear() }
function upper(v: any): string { return String(v || '').trim().toUpperCase() }

const MODALITA: Record<number, string> = { 1: 'ELEMENTARE', 2: 'ANALIZZATA' }
const FAMIGLIE_NUM: Record<number, string> = { 1: 'AT', 2: 'PR', 3: 'RU', 4: 'SL', 5: 'PF' }
const FAMILY_CODES = ['AT', 'PR', 'RU', 'SL', 'PF'] as const
const FAMILY_DESCRIPTIONS: Record<string, string> = { AT: 'Attrezzature e trasporti', PR: 'Materiali da costruzione', RU: 'Risorse umane', SL: 'Semilavorati', PF: 'Prodotti finiti' }
const CATEGORY_OPTIONS = ['MANODOPERA', 'NOLO', 'TRASPORTO', 'MATERIALI'] as const
function normalizeModality(v: any): number { const s = upper(v); if (s === 'ANALIZZATA') return 2; return num(v) === 2 ? 2 : 1 }
function modalityLabel(v: any): string { return MODALITA[normalizeModality(v)] || 'ELEMENTARE' }
function normalizeFamily(v: any): string { const s = upper(v); if ((FAMILY_CODES as readonly string[]).includes(s)) return s; const n = Math.trunc(num(v)); return FAMIGLIE_NUM[n] || 'AT' }
function familyLabel(v: any): string { return normalizeFamily(v) || 'AT' }
function familyDisplay(v: any): string { const code = familyLabel(v); return `${FAMILY_DESCRIPTIONS[code] || code} (${code})` }
function normalizeCategory(v: any): string {
  const s = upper(v)
  if (s === 'NOLI') return 'NOLO'
  if (s === 'TRASPORTI') return 'TRASPORTO'
  if (s === 'MATERIALE') return 'MATERIALI'
  if (CATEGORY_OPTIONS.includes(s as any)) return s
  return 'MATERIALI'
}
async function queryRows(urlRaw: any, where = '1=1', orderBy = 'codice_voce ASC, OBJECTID ASC'): Promise<any[]> {
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
  const payload = { updateFeatures: [{ attributes: out }] }
  const res = await fl.applyEdits(payload as any)
  const r = res?.updateFeatureResults?.[0]
  if (r?.error) throw new Error(r.error.message || 'Salvataggio non riuscito.')
}
async function deleteObjectIds(urlRaw: any, objectIds: number[]): Promise<void> {
  if (!objectIds.length) return
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const Graphic = await loadEsriModule<any>('esri/Graphic')
  const dels = objectIds.map((id) => new Graphic({ attributes: { [oidField]: id } }))
  const res = await fl.applyEdits({ deleteFeatures: dels } as any)
  const bad = (res?.deleteFeatureResults || []).find((r: any) => r?.error)
  if (bad?.error) throw new Error(bad.error.message || 'Eliminazione non riuscita.')
}

async function countInternalReferences(detailUrl: string, sourceObjectId: number): Promise<number> {
  if (!detailUrl || !sourceObjectId) return 0
  const rows = await queryRows(detailUrl, `origine_riga = 2 AND objectid_sorgente = ${Math.trunc(num(sourceObjectId))}`, 'OBJECTID ASC')
  return rows.length
}

const styles = `
.giw { font-size: 13px; padding: 12px; height: 100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; }
.giw-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; }
.giw-toolbar { display:flex; gap:10px; align-items:end; flex-wrap:wrap; }
.giw-panel { background:#f5f9ff; border:1px solid #c5d9f1; border-radius:6px; padding:12px; }
.giw-form { display:grid; grid-template-columns:1.5fr 0.7fr 0.9fr 0.9fr 0.9fr 0.8fr; gap:10px; align-items:end; }
.giw-field { display:flex; flex-direction:column; gap:3px; }
.giw-label { font-size:11px; font-weight:700; color:#1F4E79; }
.giw-input, .giw-select, .giw-textarea { width:100%; padding:6px 8px; border:1px solid #aac4e0; border-radius:4px; font-size:13px; box-sizing:border-box; background:#fff; }
.giw-textarea { min-height:60px; resize:vertical; }
.giw-readonly { background:#eef4fb; color:#3f4d5a; }
.giw-btn { padding:6px 14px; border:none; border-radius:4px; font-size:13px; cursor:pointer; font-weight:700; }
.giw-btn:disabled { opacity:0.55; cursor:not-allowed; }
.giw-save { background:#1F4E79; color:#fff; } .giw-cancel { background:#e0e0e0; color:#333; } .giw-danger { background:#c00000; color:#fff; }
.giw-table-wrap { flex:1; min-height:0; overflow:auto; border:1px solid #c5d9f1; border-radius:6px; }
.giw-table { width:100%; border-collapse:collapse; font-size:12px; }
.giw-table th { background:#1F4E79; color:#fff; padding:7px 8px; text-align:left; position:sticky; top:0; z-index:1; white-space:nowrap; }
.giw-table td { padding:6px 8px; border-bottom:1px solid #e0eaf4; vertical-align:top; }
.giw-table tbody tr:nth-child(odd) td { background:#f5f9ff; } .giw-table tbody tr:nth-child(even) td { background:#fff; }
.giw-msg { padding:7px 12px; border-radius:4px; font-size:12px; font-weight:700; } .giw-ok { background:#e2efda; color:#375623; border:1px solid #b8d4b0; } .giw-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
.giw-muted { color:#6b7280; }
`

function emptyForm() {
  return { objectid: undefined, codice_voce: '', descrizione: '', unita_misura: '', prezzo_unitario: '', categoria_default: 'MATERIALI', attivo: '1', note: '', modalita_voce: 1, anno_listino: new Date().getFullYear(), famiglia: 'AT', capitolo: '0001', sottocapitolo: '0001', progressivo_voce: '0001' } as any
}

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const serviceUrl = String(cfg.serviceUrl || '').trim()
  const detailTableUrl = String(cfg.detailTableUrl || '').trim()
  const title = String(cfg.title || 'GII - Gestione Prezzario Interno')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const [rows, setRows] = React.useState<any[]>([])
  const [filterText, setFilterText] = React.useState('')
  const [form, setForm] = React.useState<any>(emptyForm())
  const [editing, setEditing] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string, ok: boolean } | null>(null)
  const [isRitOrAdmin, setIsRitOrAdmin] = React.useState(isRitOrAdminUser())

  React.useEffect(() => { const refresh = () => setIsRitOrAdmin(isRitOrAdminUser()); refresh(); window.addEventListener('gii:userLoaded', refresh); return () => window.removeEventListener('gii:userLoaded', refresh) }, [])
  React.useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), 6000); return () => window.clearTimeout(t) }, [msg])

  const load = React.useCallback(async () => {
    if (!serviceUrl) { setRows([]); return }
    setLoading(true)
    try {
      const term = upper(filterText)
      const where = term ? `(UPPER(codice_voce) LIKE '%${esc(term)}%' OR UPPER(descrizione) LIKE '%${esc(term)}%')` : '1=1'
      setRows(await queryRows(serviceUrl, where, 'codice_voce ASC, OBJECTID ASC'))
    } catch (e: any) {
      setMsg({ text: 'Errore caricamento: ' + (e?.message ?? e), ok: false })
    }
    setLoading(false)
  }, [serviceUrl, filterText])
  React.useEffect(() => { void load() }, [load])

  const onEdit = (r: any) => {
    setEditing(true)
    setForm({
      objectid: r.objectid,
      codice_voce: String(r.codice_voce || ''),
      descrizione: String(r.descrizione || ''),
      unita_misura: String(r.unita_misura || ''),
      prezzo_unitario: String(r.prezzo_unitario ?? ''),
      categoria_default: normalizeCategory(r.categoria_default),
      attivo: String(num(r.attivo) === 0 ? '0' : '1'),
      note: String(r.note || ''),
      modalita_voce: normalizeModality(r.modalita_voce),
      anno_listino: asYear(r.anno_listino),
      famiglia: normalizeFamily(r.famiglia),
      capitolo: pad4(r.capitolo),
      sottocapitolo: pad4(r.sottocapitolo),
      progressivo_voce: pad4(r.progressivo_voce)
    })
  }
  const onCancel = () => { setEditing(false); setForm(emptyForm()) }
  const onSave = async () => {
    if (!String(form.descrizione || '').trim()) { setMsg({ text: 'Compila la descrizione.', ok: false }); return }
    if (!String(form.unita_misura || '').trim()) { setMsg({ text: 'Compila l’unità di misura.', ok: false }); return }
    if (normalizeModality(form.modalita_voce) === 1 && String(form.prezzo_unitario || '').trim() === '') { setMsg({ text: 'Per una voce elementare il prezzo non può essere vuoto.', ok: false }); return }
    setSaving(true)
    try {
      await applyAttrs(serviceUrl, {
        descrizione: String(form.descrizione || '').trim(),
        unita_misura: String(form.unita_misura || '').trim(),
        prezzo_unitario: String(form.prezzo_unitario || '').trim() === '' ? null : round(num(form.prezzo_unitario), 4),
        categoria_default: normalizeCategory(form.categoria_default),
        attivo: String(form.attivo) === '1' ? 1 : 0,
        note: String(form.note || '').trim()
      }, Number(form.objectid))
      setMsg({ text: 'Voce aggiornata.', ok: true })
      onCancel()
      await load()
    } catch (e: any) {
      setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false })
    }
    setSaving(false)
  }
  const onDelete = async (r: any) => {
    setSaving(true)
    try {
      if (!detailTableUrl) {
        setMsg({ text: 'Configura anche l’URL della tabella analisi per poter verificare se la voce è già utilizzata.', ok: false })
        return
      }
      const refs = await countInternalReferences(detailTableUrl, Number(r.objectid))
      if (refs > 0) {
        setMsg({ text: 'Non puoi eliminare questa voce perché è utilizzata in una o più analisi del prezzario interno.', ok: false })
        return
      }
      if (!window.confirm(`Eliminare la voce interna "${r.codice_voce} — ${r.descrizione}"?`)) return
      await deleteObjectIds(serviceUrl, [Number(r.objectid)])
      await load()
      setMsg({ text: 'Voce eliminata.', ok: true })
    } catch (e: any) {
      setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false })
    } finally {
      setSaving(false)
    }
  }

  if (!isRitOrAdmin) return <div style={{ padding: 12, color: '#7a1c1c', background: '#fce4e4', border: '1px solid #f5b8b8', borderRadius: 6 }}>Funzione riservata al Responsabile dell’istruttoria tecnica o all’Amministratore.</div>

  return (
    <Fragment>
      <style>{styles}</style>
      <div className='giw'>
        <div className='giw-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>
        {!serviceUrl ? <div className='giw-msg giw-err'>Configura l'URL della tabella nel setting del widget.</div> : null}
        {msg && <div className={`giw-msg ${msg.ok ? 'giw-ok' : 'giw-err'}`}>{msg.text}</div>}

        <div className='giw-toolbar'>
          <div className='giw-field' style={{ minWidth: 320, flex: '1 1 320px' }}>
            <div className='giw-label'>Filtro codice / descrizione</div>
            <input className='giw-input' value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder='cerca voce interna...' />
          </div>
          <div className='giw-muted' style={{ alignSelf: 'center' }}>La creazione delle nuove voci va fatta dal widget <b>GII - Gestione Analisi Prezzario Interno</b>.</div>
        </div>

        {editing && (
          <div className='giw-panel'>
            <div style={{ fontWeight: 700, color: '#1F4E79', marginBottom: 10 }}>Modifica testata voce interna</div>
            <div className='giw-form'>
              <div className='giw-field'>
                <div className='giw-label'>Codice voce</div>
                <input className='giw-input giw-readonly' value={form.codice_voce || ''} readOnly />
              </div>
              <div className='giw-field'>
                <div className='giw-label'>Modalità</div>
                <input className='giw-input giw-readonly' value={modalityLabel(form.modalita_voce)} readOnly />
              </div>
              <div className='giw-field'>
                <div className='giw-label'>Anno</div>
                <input className='giw-input giw-readonly' value={String(form.anno_listino || '')} readOnly />
              </div>
              <div className='giw-field'>
                <div className='giw-label'>Famiglia</div>
                <input className='giw-input giw-readonly' value={familyDisplay(form.famiglia)} readOnly />
              </div>
              <div className='giw-field'>
                <div className='giw-label'>Capitolo</div>
                <input className='giw-input giw-readonly' value={form.capitolo || ''} readOnly />
              </div>
              <div className='giw-field'>
                <div className='giw-label'>Sottocapitolo</div>
                <input className='giw-input giw-readonly' value={form.sottocapitolo || ''} readOnly />
              </div>

              <div className='giw-field' style={{ gridColumn: '1 / span 2' }}>
                <div className='giw-label'>Descrizione</div>
                <input className='giw-input' value={form.descrizione || ''} onChange={(e) => setForm((f: any) => ({ ...f, descrizione: e.target.value }))} />
              </div>
              <div className='giw-field'>
                <div className='giw-label'>UM</div>
                <input className='giw-input' value={form.unita_misura || ''} onChange={(e) => setForm((f: any) => ({ ...f, unita_misura: e.target.value }))} />
              </div>
              <div className='giw-field'>
                <div className='giw-label'>Prezzo unitario</div>
                <input className={`giw-input ${normalizeModality(form.modalita_voce) === 2 ? 'giw-readonly' : ''}`} type='number' step='0.0001' value={form.prezzo_unitario || ''} readOnly={normalizeModality(form.modalita_voce) === 2} onChange={(e) => setForm((f: any) => ({ ...f, prezzo_unitario: e.target.value }))} />
              </div>
              <div className='giw-field'>
                <div className='giw-label'>Categoria</div>
                <select className='giw-select' value={normalizeCategory(form.categoria_default)} onChange={(e) => setForm((f: any) => ({ ...f, categoria_default: e.target.value }))}>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className='giw-field'>
                <div className='giw-label'>Attivo</div>
                <GiiActiveToggle
                  checked={String(form.attivo ?? '1') === '1'}
                  onChange={(next) => setForm((f: any) => ({ ...f, attivo: next ? '1' : '0' }))}
                  ariaLabel='Stato della voce di analisi'
                />
              </div>
              <div className='giw-field' style={{ gridColumn: '1 / -1' }}>
                <div className='giw-label'>Note</div>
                <textarea className='giw-textarea' value={form.note || ''} onChange={(e) => setForm((f: any) => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className='giw-btn giw-save' disabled={saving} onClick={() => void onSave()}>Aggiorna</button>
              <button className='giw-btn giw-cancel' disabled={saving} onClick={onCancel}>Annulla</button>
            </div>
          </div>
        )}

        <div className='giw-table-wrap'>
          <table className='giw-table'>
            <thead>
              <tr>
                <th>Codice</th>
                <th>Modalità</th>
                <th>Fam.</th>
                <th>Descrizione</th>
                <th>UM</th>
                <th>Prezzo</th>
                <th>Categoria</th>
                <th>Attivo</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>{loading ? 'Caricamento…' : 'Nessuna voce interna.'}</td></tr>
              ) : rows.map((r: any) => (
                <tr key={r.objectid}>
                  <td><b>{r.codice_voce}</b></td>
                  <td>{modalityLabel(r.modalita_voce)}</td>
                  <td>{familyDisplay(r.famiglia)}</td>
                  <td>{r.descrizione}</td>
                  <td>{r.unita_misura}</td>
                  <td>{money(r.prezzo_unitario, 4)}</td>
                  <td>{normalizeCategory(r.categoria_default)}</td>
                  <td>{num(r.attivo) === 1 ? 'Sì' : 'No'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <RecordEditButton onClick={() => onEdit(r)} title='Modifica voce interna' ariaLabel='Modifica voce interna' />
                    <RecordDeleteButton onClick={() => void onDelete(r)} title='Elimina voce interna' ariaLabel='Elimina voce interna' />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  )
}

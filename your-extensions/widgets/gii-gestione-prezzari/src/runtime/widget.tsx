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
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#1F4E79', disabled, props.marginRight ?? 4)}>
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

function getGiiOperationalProfileCode(): string {
  const u: any = (window as any).__giiUserRole || {}

  const direct = normalizeGiiAccessCode(u?.profiloCod ?? u?.profilo_cod ?? u?.profileCode ?? u?.profile_code)
  if (direct) return direct

  const role = normalizeGiiAccessCode(u?.ruoloCod ?? u?.ruolo_cod ?? u?.roleCod ?? u?.roleCode ?? u?.role_code)
  const area = normalizeGiiAccessCode(u?.areaCod ?? u?.area_cod ?? u?.areaCode ?? u?.area_code)
  if (role === 'TI' && area === 'AMM') return 'TI_AMM'
  if (role === 'RI' && area === 'AMM') return 'RI_AMM'
  if (role) return role

  const roleNum = Number(u?.ruolo)
  const areaNum = Number(u?.area)
  if (roleNum === 7) return 'ADMIN'
  if (roleNum === 4 && areaNum === 1) return 'RI_AMM'
  if (roleNum === 2 && areaNum === 1) return 'TI_AMM'
  if (roleNum === 1) return 'TR'
  if (roleNum === 2) return 'TI'
  if (roleNum === 3) return 'RZ'
  if (roleNum === 4) return 'RI'
  if (roleNum === 5) return 'DT'
  if (roleNum === 6) return 'DA'

  const label = normalizeGiiAccessCode([
    u?.profiloLabel,
    u?.ruoloLabel,
    u?.roleLabel,
    u?.ruolo_nome,
    u?.ruolo
  ].filter(Boolean).join(' '))
  if (!label) return ''
  if (/ADMIN|AMMINISTRATORE/.test(label)) return 'ADMIN'
  if (/RI_AMM|RESPONSABILE.*ISTRUTTORIA.*AMMINISTRATIV/.test(label)) return 'RI_AMM'
  if (/TI_AMM|TECNICO.*ISTRUTTOR.*AMMINISTRATIV/.test(label)) return 'TI_AMM'
  if (/^RI$|(^|[^A-Z])RI([^A-Z]|$)|RESPONSABILE.*ISTRUTTORIA/.test(label)) return 'RI'
  if (/^TI$|(^|[^A-Z])TI([^A-Z]|$)|TECNICO.*ISTRUTTOR/.test(label)) return 'TI'
  if (/^TR$|(^|[^A-Z])TR([^A-Z]|$)|TECNICO.*RILEVATORE/.test(label)) return 'TR'
  if (/^RZ$|(^|[^A-Z])RZ([^A-Z]|$)|RESPONSABILE.*ZONA/.test(label)) return 'RZ'
  if (/^DT$|(^|[^A-Z])DT([^A-Z]|$)|DIRETTORE.*TECNICO/.test(label)) return 'DT'
  if (/^DA$|(^|[^A-Z])DA([^A-Z]|$)|DIRETTORE.*AMMINISTRATIVO/.test(label)) return 'DA'
  return ''
}

function isRiOrAdminUser(): boolean {
  const profiloCod = getGiiOperationalProfileCode()
  return profiloCod === 'RI' || profiloCod === 'ADMIN'
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
function normalizeModality(v: any): number { const s = upper(v); if (s === 'ANALIZZATA' || s === '2') return 2; return 1 }
function modalityLabel(v: any): string { return MODALITA[normalizeModality(v)] || 'ELEMENTARE' }
function normalizeFamily(v: any): string { const s = upper(v); if ((FAMILY_CODES as readonly string[]).includes(s)) return s; const n = Math.trunc(num(v)); return FAMIGLIE_NUM[n] || 'AT' }
function familyDisplay(v: any): string { const code = normalizeFamily(v); return `${FAMILY_DESCRIPTIONS[code] || code} (${code})` }

async function queryRows(urlRaw: any, where = '1=1', orderBy = 'codice_np ASC, OBJECTID ASC'): Promise<any[]> {
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
async function countReferences(detailUrl: string, sourceObjectId: number): Promise<number> {
  if (!detailUrl || !sourceObjectId) return 0
  const rows = await queryRows(detailUrl, `origine_riga = '3' AND objectid_sorgente = ${Math.trunc(num(sourceObjectId))}`, 'OBJECTID ASC')
  return rows.length
}

const styles = `
.gnp { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; }
.gnp-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; }
.gnp-toolbar { display:flex; gap:10px; align-items:end; flex-wrap:wrap; }
.gnp-panel { background:var(--gnp-detail-card-background, #f5f9ff); border:1px solid #c5d9f1; border-radius:6px; padding:12px; }
.gnp-form { display:grid; grid-template-columns: 1.7fr 0.7fr 0.95fr 1.1fr 0.8fr 0.8fr; gap:10px; align-items:end; }
.gnp-field { display:flex; flex-direction:column; gap:3px; }
.gnp-label { font-size:var(--gnp-toolbar-label-font-size, 11px); font-weight:700; color:var(--gnp-toolbar-label-color, #1F4E79); }
.gnp-input, .gnp-select, .gnp-textarea { width:100%; padding:6px 8px; border:1px solid #aac4e0; border-radius:4px; font-size:13px; box-sizing:border-box; background:#fff; }
.gnp-textarea { min-height:60px; resize:vertical; }
.gnp-readonly { background:#eef4fb; color:#3f4d5a; }
.gnp-btn { padding:6px 14px; border:none; border-radius:4px; font-size:13px; cursor:pointer; font-weight:700; }
.gnp-btn:disabled { opacity:0.55; cursor:not-allowed; }
.gnp-save { background:#1F4E79; color:#fff; }
.gnp-cancel { background:#e0e0e0; color:#333; }
.gnp-danger { background:#c00000; color:#fff; }
.gnp-table-wrap { flex:1; min-height:0; overflow:auto; border:1px solid #c5d9f1; border-radius:6px; background:var(--gnp-records-card-background, #f5f9ff); }
.gnp-table { width:100%; border-collapse:collapse; font-size:12px; }
.gnp-table th { background:#1F4E79; color:#fff; padding:7px 8px; text-align:left; position:sticky; top:0; z-index:1; white-space:nowrap; }
.gnp-table td { padding:6px 8px; border-bottom:1px solid #e0eaf4; vertical-align:top; }
.gnp-table tbody tr:nth-child(odd) td { background:var(--gnp-records-card-background, #f5f9ff); }
.gnp-table tbody tr:nth-child(even) td { background:linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), var(--gnp-records-card-background, #f5f9ff); }
.gnp-msg { padding:7px 12px; border-radius:4px; font-size:12px; font-weight:700; }
.gnp-ok { background:#e2efda; color:#375623; border:1px solid #b8d4b0; }
.gnp-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
.gnp-muted { color:#6b7280; }
`

function mapRow(r: any) {
  return {
    ...r,
    codice_voce: String(r.codice_np || ''),
    unita_misura: String(r.um || ''),
    prezzo_unitario: r.prezzo,
    modalita_voce: r.modalita_prezzo,
    progressivo_voce: String(r.progressivo_prezzo || '')
  }
}
function emptyForm() {
  return { objectid: undefined, codice_voce: '', descrizione: '', unita_misura: '', prezzo_unitario: '', attivo: '1', note: '', modalita_voce: '1', anno_listino: new Date().getFullYear(), famiglia: 'AT', capitolo: '0001', sottocapitolo: '0001', progressivo_voce: '0001' } as any
}

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const serviceUrl = String(cfg.serviceUrl || '').trim()
  const detailTableUrl = String(cfg.detailTableUrl || '').trim()
  const title = String(cfg.title || 'GII - Gestione Nuovi Prezzi')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = Number(cfg.sectionTitleFontSize || 12.5)
  const toolbarLabelColor = String(cfg.toolbarLabelColor || '#1F4E79')
  const toolbarLabelFontSize = Number(cfg.toolbarLabelFontSize || 11.5)
  const detailCardBackgroundColor = String(cfg.detailCardBackgroundColor || '#f5f9ff')
  const recordsCardBackgroundColor = String(cfg.recordsCardBackgroundColor || '#f5f9ff')

  const [rows, setRows] = React.useState<any[]>([])
  const [filterText, setFilterText] = React.useState('')
  const [form, setForm] = React.useState<any>(emptyForm())
  const [editing, setEditing] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string, ok: boolean } | null>(null)
  const [isRi, setIsRi] = React.useState(isRiOrAdminUser())

  React.useEffect(() => { const refresh = () => setIsRi(isRiOrAdminUser()); refresh(); window.addEventListener('gii:userLoaded', refresh); return () => window.removeEventListener('gii:userLoaded', refresh) }, [])
  React.useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), 6000); return () => window.clearTimeout(t) }, [msg])

  const load = React.useCallback(async () => {
    if (!serviceUrl) { setRows([]); return }
    setLoading(true)
    try {
      const term = upper(filterText)
      const where = term ? `(UPPER(codice_np) LIKE '%${esc(term)}%' OR UPPER(descrizione) LIKE '%${esc(term)}%')` : '1=1'
      setRows((await queryRows(serviceUrl, where, 'codice_np ASC, OBJECTID ASC')).map(mapRow))
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
      attivo: String(num(r.attivo) === 0 ? '0' : '1'),
      note: String(r.note || ''),
      modalita_voce: String(r.modalita_voce ?? '1'),
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
    if (normalizeModality(form.modalita_voce) === 1 && String(form.prezzo_unitario || '').trim() === '') { setMsg({ text: 'Per un Nuovo Prezzo elementare il prezzo non può essere vuoto.', ok: false }); return }
    setSaving(true)
    try {
      await applyAttrs(serviceUrl, {
        descrizione: String(form.descrizione || '').trim(),
        um: String(form.unita_misura || '').trim(),
        prezzo: String(form.prezzo_unitario || '').trim() === '' ? null : round(num(form.prezzo_unitario), 4),
        attivo: String(form.attivo) === '1' ? 1 : 0,
        note: String(form.note || '').trim()
      }, Number(form.objectid))
      setMsg({ text: 'Nuovo Prezzo aggiornato.', ok: true })
      onCancel()
      await load()
    } catch (e: any) {
      setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false })
    }
    setSaving(false)
  }
  const onDelete = async (r: any) => {
    if (!detailTableUrl) { setMsg({ text: 'Configura anche la tabella analisi nuovi prezzi per poter eliminare una voce in sicurezza.', ok: false }); return }
    setSaving(true)
    try {
      const refs = await countReferences(detailTableUrl, Number(r.objectid))
      if (refs > 0) {
        setMsg({ text: 'Non puoi eliminare questo Nuovo Prezzo perché è utilizzato in una o più analisi di nuovi prezzi.', ok: false })
        return
      }
      if (!window.confirm(`Eliminare il Nuovo Prezzo "${r.codice_voce} — ${r.descrizione}"?`)) return
      await deleteObjectIds(serviceUrl, [Number(r.objectid)])
      await load()
      setMsg({ text: 'Nuovo Prezzo eliminato.', ok: true })
    } catch (e: any) {
      setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false })
    } finally {
      setSaving(false)
    }
  }

  if (!isRi) return <div style={{ padding: 12, fontFamily: 'Arial, sans-serif', color: '#7a1c1c', background: '#fce4e4', border: '1px solid #f5b8b8', borderRadius: 6 }}>Widget riservato al Responsabile Istruttore (RI) o all'Amministratore (ADMIN).</div>

  return (
    <Fragment>
      <style>{styles}</style>
      <div className='gnp' style={{ '--gnp-toolbar-label-color': toolbarLabelColor, '--gnp-toolbar-label-font-size': `${toolbarLabelFontSize}px`, '--gnp-section-title-color': sectionTitleColor, '--gnp-section-title-font-size': `${sectionTitleFontSize}px`, '--gnp-detail-card-background': detailCardBackgroundColor, '--gnp-records-card-background': recordsCardBackgroundColor } as React.CSSProperties}>
        <div className='gnp-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>
        {!serviceUrl ? <div className='gnp-msg gnp-err'>Configura l'URL della tabella nel setting del widget.</div> : null}
        {msg && <div className={`gnp-msg ${msg.ok ? 'gnp-ok' : 'gnp-err'}`}>{msg.text}</div>}

        <div className='gnp-toolbar'>
          <div className='gnp-field' style={{ minWidth: 320, flex: '1 1 320px' }}>
            <div className='gnp-label'>Filtro codice / descrizione</div>
            <input className='gnp-input' value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder='cerca nuovo prezzo...' />
          </div>
        </div>

        {editing && (
          <div className='gnp-panel'>
            <div style={{ fontWeight: 700, color: sectionTitleColor, fontSize: sectionTitleFontSize, marginBottom: 10 }}>Modifica testata Nuovo Prezzo</div>
            <div className='gnp-form'>
              <div className='gnp-field'>
                <div className='gnp-label'>Codice</div>
                <input className='gnp-input gnp-readonly' value={form.codice_voce || ''} readOnly />
              </div>
              <div className='gnp-field'>
                <div className='gnp-label'>Modalità</div>
                <input className='gnp-input gnp-readonly' value={modalityLabel(form.modalita_voce)} readOnly />
              </div>
              <div className='gnp-field'>
                <div className='gnp-label'>Anno</div>
                <input className='gnp-input gnp-readonly' value={String(form.anno_listino || '')} readOnly />
              </div>
              <div className='gnp-field'>
                <div className='gnp-label'>Famiglia</div>
                <input className='gnp-input gnp-readonly' value={familyDisplay(form.famiglia)} readOnly />
              </div>
              <div className='gnp-field'>
                <div className='gnp-label'>Capitolo</div>
                <input className='gnp-input gnp-readonly' value={form.capitolo || ''} readOnly />
              </div>
              <div className='gnp-field'>
                <div className='gnp-label'>Sottocapitolo</div>
                <input className='gnp-input gnp-readonly' value={form.sottocapitolo || ''} readOnly />
              </div>

              <div className='gnp-field' style={{ gridColumn: '1 / span 3' }}>
                <div className='gnp-label'>Descrizione</div>
                <input className='gnp-input' value={form.descrizione || ''} onChange={(e) => setForm((f: any) => ({ ...f, descrizione: e.target.value }))} />
              </div>
              <div className='gnp-field'>
                <div className='gnp-label'>UM</div>
                <input className='gnp-input' value={form.unita_misura || ''} onChange={(e) => setForm((f: any) => ({ ...f, unita_misura: e.target.value }))} />
              </div>
              <div className='gnp-field'>
                <div className='gnp-label'>Prezzo</div>
                <input className={`gnp-input ${normalizeModality(form.modalita_voce) === 2 ? 'gnp-readonly' : ''}`} type='number' step='0.0001' value={form.prezzo_unitario || ''} readOnly={normalizeModality(form.modalita_voce) === 2} onChange={(e) => setForm((f: any) => ({ ...f, prezzo_unitario: e.target.value }))} />
              </div>
              <div className='gnp-field'>
                <div className='gnp-label'>Attivo</div>
                <GiiActiveToggle
                  checked={String(form.attivo ?? '1') === '1'}
                  onChange={(next) => setForm((f: any) => ({ ...f, attivo: next ? '1' : '0' }))}
                  ariaLabel='Stato del prezzo'
                />
              </div>
              <div className='gnp-field' style={{ gridColumn: '1 / -1' }}>
                <div className='gnp-label'>Note</div>
                <textarea className='gnp-textarea' value={form.note || ''} onChange={(e) => setForm((f: any) => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className='gnp-btn gnp-save' disabled={saving} onClick={() => void onSave()}>Aggiorna</button>
              <button className='gnp-btn gnp-cancel' disabled={saving} onClick={onCancel}>Annulla</button>
            </div>
          </div>
        )}

        <div className='gnp-table-wrap'>
          <table className='gnp-table'>
            <thead>
              <tr>
                <th>Codice</th>
                <th>Modalità</th>
                <th>Famiglia</th>
                <th>Descrizione</th>
                <th>UM</th>
                <th>Prezzo (€)</th>
                <th>Attivo</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>{loading ? 'Caricamento…' : 'Nessun Nuovo Prezzo.'}</td></tr>
              ) : rows.map((r: any) => (
                <tr key={r.objectid}>
                  <td><b>{r.codice_voce}</b></td>
                  <td>{modalityLabel(r.modalita_voce)}</td>
                  <td>{familyDisplay(r.famiglia)}</td>
                  <td>{r.descrizione}</td>
                  <td>{r.unita_misura}</td>
                  <td>{money(r.prezzo_unitario, 4)}</td>
                  <td>{num(r.attivo) === 1 ? 'Sì' : 'No'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
                      <RecordEditButton onClick={() => onEdit(r)} title='Modifica Nuovo Prezzo' ariaLabel='Modifica Nuovo Prezzo' />
                      <RecordDeleteButton onClick={() => void onDelete(r)} title='Elimina Nuovo Prezzo' ariaLabel='Elimina Nuovo Prezzo' />
                    </div>
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

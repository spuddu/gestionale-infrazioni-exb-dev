/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'

const { Fragment } = React

type PrezzarioRow = {
  objectid: number
  codice_prezzario: string
  titolo_prezzario?: string
  anno_prezzario?: number
  stato_prezzario?: number
  data_import?: any
}

type VoceRow = {
  objectid: number
  codice_prezzario: string
  codice_voce: string
  famiglia?: string
  capitolo?: string
  sottocapitolo?: string
  descrizione?: string
  unita_misura?: string
  prezzo_unitario?: number
  categoria_default?: string
  selezionabile?: number
  attivo?: number
}

type AnalisiRow = {
  objectid: number
  codice_prezzario?: string
  codice_voce?: string
  codice_analisi?: string
  codice_elemento?: string
  descrizione_elemento?: string
  categoria_costo?: string
  quantita?: number
  prezzo_unitario?: number
  importo?: number
  attivo?: number
}

type TreeNode = {
  capitolo: string
  count: number
  children: Array<{ sottocapitolo: string, count: number }>
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
function money(n: any, d = 2): string { return num(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }) }
function esc(v: string): string { return String(v || '').replace(/'/g, "''") }
function htmlDecode(v: any): string {
  const s = String(v || '')
  if (!s) return ''
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
function trimText(v: any): string { return htmlDecode(v).replace(/\s+/g, ' ').trim() }
function safeUpper(v: any): string { return trimText(v).toUpperCase() }
function fmtDate(v: any): string {
  if (v == null || v === '') return ''
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('it-IT')
  } catch { return '' }
}

function normalizeCategory(v: any): string {
  const s = safeUpper(v)
  if (s === 'NOLI') return 'NOLO'
  if (s === 'TRASPORTI') return 'TRASPORTO'
  if (s === 'MATERIALE') return 'MATERIALI'
  return s
}

async function queryAllRows(urlRaw: any, where = '1=1', orderBy?: string): Promise<any[]> {
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const qIds = fl.createQuery ? fl.createQuery() : {}
  qIds.where = where
  qIds.returnGeometry = false
  let objectIds: number[] = []
  if (typeof fl.queryObjectIds === 'function') {
    objectIds = (await fl.queryObjectIds(qIds) || []).map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x))
  }
  if (!objectIds.length) {
    const q = fl.createQuery ? fl.createQuery() : {}
    q.where = where
    q.outFields = ['*']
    q.returnGeometry = false
    if (orderBy) q.orderByFields = [orderBy]
    const res = await fl.queryFeatures(q)
    return (res?.features || []).map((f: any) => ({ ...f.attributes, objectid: Number(f.attributes?.[oidField] || f.attributes?.OBJECTID || f.attributes?.objectid || 0) }))
  }
  objectIds.sort((a, b) => a - b)
  const out: any[] = []
  for (let i = 0; i < objectIds.length; i += 500) {
    const chunk = objectIds.slice(i, i + 500)
    const q = fl.createQuery ? fl.createQuery() : {}
    q.where = `${oidField} IN (${chunk.join(',')})`
    q.outFields = ['*']
    q.returnGeometry = false
    const res = await fl.queryFeatures(q)
    const rows = (res?.features || []).map((f: any) => ({ ...f.attributes, objectid: Number(f.attributes?.[oidField] || f.attributes?.OBJECTID || f.attributes?.objectid || 0) }))
    out.push(...rows)
  }
  if (orderBy) {
    const parts = String(orderBy).split(',').map((x) => x.trim()).filter(Boolean)
    out.sort((a: any, b: any) => {
      for (const p of parts) {
        const seg = p.split(/\s+/)
        const field = seg[0]
        const desc = String(seg[1] || '').toUpperCase() === 'DESC'
        const av = a?.[field]
        const bv = b?.[field]
        if (av == null && bv == null) continue
        if (av == null) return desc ? 1 : -1
        if (bv == null) return desc ? -1 : 1
        if (typeof av === 'number' && typeof bv === 'number') {
          if (av !== bv) return desc ? bv - av : av - bv
        } else {
          const aa = String(av).localeCompare(String(bv), 'it', { sensitivity: 'base' })
          if (aa !== 0) return desc ? -aa : aa
        }
      }
      return 0
    })
  }
  return out
}

async function queryPrezzari(prezzariUrl: string): Promise<PrezzarioRow[]> {
  const rows = await queryAllRows(prezzariUrl, '1=1', 'anno_prezzario DESC, OBJECTID DESC')
  return rows.map((r: any) => ({
    objectid: Number(r.objectid || 0),
    codice_prezzario: String(r.codice_prezzario || ''),
    titolo_prezzario: trimText(r.titolo_prezzario),
    anno_prezzario: num(r.anno_prezzario),
    stato_prezzario: num(r.stato_prezzario),
    data_import: r.data_import
  })).filter((r) => !!r.codice_prezzario)
}

async function queryVoci(serviceUrl: string, codicePrezzario: string): Promise<VoceRow[]> {
  const rows = await queryAllRows(serviceUrl, `codice_prezzario = '${esc(codicePrezzario)}'`, 'capitolo ASC, sottocapitolo ASC, codice_voce ASC')
  return rows.map((r: any) => ({
    objectid: Number(r.objectid || 0),
    codice_prezzario: String(r.codice_prezzario || ''),
    codice_voce: String(r.codice_voce || ''),
    famiglia: trimText(r.famiglia),
    capitolo: trimText(r.capitolo),
    sottocapitolo: trimText(r.sottocapitolo),
    descrizione: htmlDecode(r.descrizione),
    unita_misura: trimText(r.unita_misura),
    prezzo_unitario: num(r.prezzo_unitario),
    categoria_default: normalizeCategory(r.categoria_default),
    selezionabile: num(r.selezionabile),
    attivo: num(r.attivo)
  })).filter((r) => !!r.codice_voce)
}

function candidateAnalysisWhere(code: string, prezzario: string): string[] {
  const c = esc(code)
  const p = esc(prezzario)
  return [
    `codice_prezzario = '${p}' AND codice_voce = '${c}'`,
    `codice_prezzario = '${p}' AND codice_analisi = '${c}'`,
    `codice_voce = '${c}'`,
    `codice_analisi = '${c}'`
  ]
}

async function queryAnalisi(analisiUrl: string, voce: VoceRow | null): Promise<AnalisiRow[]> {
  if (!analisiUrl || !voce?.codice_voce) return []
  const fl = await getLayer(analisiUrl)
  const fields = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  const wheres = candidateAnalysisWhere(voce.codice_voce, voce.codice_prezzario).filter((w) => {
    if (w.includes('codice_prezzario') && !fields.has('codice_prezzario')) return false
    if (w.includes('codice_voce') && !fields.has('codice_voce')) return false
    if (w.includes('codice_analisi') && !fields.has('codice_analisi')) return false
    return true
  })
  for (const where of wheres) {
    const rows = await queryAllRows(analisiUrl, where, 'OBJECTID ASC')
    if (rows.length) {
      return rows.map((r: any) => ({
        objectid: Number(r.objectid || 0),
        codice_prezzario: String(r.codice_prezzario || ''),
        codice_voce: String(r.codice_voce || ''),
        codice_analisi: String(r.codice_analisi || ''),
        codice_elemento: String(r.codice_elemento || ''),
        descrizione_elemento: htmlDecode(r.descrizione_elemento),
        categoria_costo: normalizeCategory(r.categoria_costo),
        quantita: num(r.quantita),
        prezzo_unitario: num(r.prezzo_unitario),
        importo: num(r.importo),
        attivo: num(r.attivo)
      }))
    }
  }
  return []
}

function buildTree(rows: VoceRow[]): TreeNode[] {
  const byCap = new Map<string, Map<string, number>>()
  rows.forEach((r) => {
    const cap = trimText(r.capitolo) || 'Senza capitolo'
    const sub = trimText(r.sottocapitolo) || 'Senza sottocapitolo'
    if (!byCap.has(cap)) byCap.set(cap, new Map<string, number>())
    const m = byCap.get(cap)!
    m.set(sub, (m.get(sub) || 0) + 1)
  })
  return Array.from(byCap.entries()).map(([capitolo, childrenMap]) => ({
    capitolo,
    count: Array.from(childrenMap.values()).reduce((a, b) => a + b, 0),
    children: Array.from(childrenMap.entries())
      .map(([sottocapitolo, count]) => ({ sottocapitolo, count }))
      .sort((a, b) => a.sottocapitolo.localeCompare(b.sottocapitolo, 'it', { sensitivity: 'base' }))
  })).sort((a, b) => a.capitolo.localeCompare(b.capitolo, 'it', { sensitivity: 'base' }))
}

const styles = `
.gcp { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; }
.gcp-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; }
.gcp-toolbar { display:grid; grid-template-columns: minmax(260px, 320px) 1fr auto; gap:10px; align-items:end; }
.gcp-field { display:flex; flex-direction:column; gap:3px; }
.gcp-label { font-size:11px; font-weight:700; color:#1F4E79; }
.gcp-input, .gcp-select { width:100%; padding:8px 10px; border:1px solid #aac4e0; border-radius:6px; font-size:13px; box-sizing:border-box; background:#fff; }
.gcp-msg { padding:7px 12px; border-radius:6px; font-size:12px; font-weight:700; }
.gcp-msg-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
.gcp-msg-ok { background:#e2efda; color:#375623; border:1px solid #b8d4b0; }
.gcp-layout { flex:1; min-height:0; display:grid; grid-template-columns: 300px minmax(480px, 1.35fr) minmax(320px, 0.95fr); gap:10px; }
.gcp-panel { min-height:0; border:1px solid #c5d9f1; border-radius:8px; background:#fff; display:flex; flex-direction:column; overflow:hidden; }
.gcp-panel-head { padding:10px 12px; background:#f5f9ff; border-bottom:1px solid #dbe7f4; font-weight:700; color:#1F4E79; }
.gcp-panel-body { flex:1; min-height:0; overflow:auto; }
.gcp-tree-root { padding:8px; }
.gcp-tree-btn { width:100%; text-align:left; border:none; background:transparent; padding:8px 10px; border-radius:6px; cursor:pointer; display:flex; justify-content:space-between; gap:8px; color:#123; }
.gcp-tree-btn:hover { background:#eef5ff; }
.gcp-tree-btn.active { background:#1F4E79; color:#fff; }
.gcp-tree-sub { margin:4px 0 8px 12px; padding-left:8px; border-left:2px solid #dbe7f4; }
.gcp-chip { display:inline-flex; align-items:center; padding:2px 7px; border-radius:999px; font-size:11px; font-weight:700; background:#e8f1fb; color:#1F4E79; }
.gcp-list-table { width:100%; border-collapse:collapse; font-size:12px; }
.gcp-list-table th { position:sticky; top:0; z-index:1; background:#1F4E79; color:#fff; padding:8px; text-align:left; white-space:nowrap; }
.gcp-list-table td { padding:8px; border-bottom:1px solid #e6eef7; vertical-align:top; }
.gcp-list-table tbody tr:nth-child(odd) td { background:#f9fbff; }
.gcp-list-table tbody tr.sel td { background:#dfeefe; }
.gcp-list-row { cursor:pointer; }
.gcp-empty { padding:16px; color:#6b7280; text-align:center; }
.gcp-detail { padding:12px; display:flex; flex-direction:column; gap:10px; }
.gcp-kv { display:grid; grid-template-columns: 110px 1fr; gap:6px 10px; font-size:12px; }
.gcp-kv div:nth-child(odd) { font-weight:700; color:#1F4E79; }
.gcp-desc { white-space:pre-wrap; line-height:1.45; background:#f8fbff; border:1px solid #dbe7f4; border-radius:6px; padding:10px; }
.gcp-ana-table { width:100%; border-collapse:collapse; font-size:11.5px; }
.gcp-ana-table th { background:#f5f9ff; color:#1F4E79; padding:6px; text-align:left; position:sticky; top:0; }
.gcp-ana-table td { padding:6px; border-bottom:1px solid #edf2f7; }
.gcp-muted { color:#6b7280; }
@media (max-width: 1380px) { .gcp-layout { grid-template-columns: 270px 1.2fr 0.9fr; } }
@media (max-width: 1180px) { .gcp-layout { grid-template-columns: 1fr; } }
`

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const serviceUrl = String(cfg.serviceUrl || '').trim()
  const prezzariUrl = String(cfg.prezzariUrl || '').trim()
  const analisiUrl = String(cfg.analisiUrl || '').trim()
  const title = String(cfg.title || 'GII - Consultazione Prezzario')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)

  const [msg, setMsg] = React.useState<{ text: string, ok: boolean } | null>(null)
  const [loadingPrezzari, setLoadingPrezzari] = React.useState(false)
  const [loadingRows, setLoadingRows] = React.useState(false)
  const [loadingAnalisi, setLoadingAnalisi] = React.useState(false)
  const [prezzari, setPrezzari] = React.useState<PrezzarioRow[]>([])
  const [selectedCode, setSelectedCode] = React.useState('')
  const [rows, setRows] = React.useState<VoceRow[]>([])
  const [selectedCapitolo, setSelectedCapitolo] = React.useState('')
  const [selectedSottocapitolo, setSelectedSottocapitolo] = React.useState('')
  const [expandedCaps, setExpandedCaps] = React.useState<Record<string, boolean>>({})
  const [search, setSearch] = React.useState('')
  const [selectedRow, setSelectedRow] = React.useState<VoceRow | null>(null)
  const [analisiRows, setAnalisiRows] = React.useState<AnalisiRow[]>([])

  React.useEffect(() => {
    if (!msg) return
    const t = window.setTimeout(() => setMsg(null), 6000)
    return () => window.clearTimeout(t)
  }, [msg])

  React.useEffect(() => {
    let cancel = false
    const run = async () => {
      if (!prezzariUrl) return
      setLoadingPrezzari(true)
      try {
        const rr = await queryPrezzari(prezzariUrl)
        if (cancel) return
        setPrezzari(rr)
        const active = rr.find((r) => num(r.stato_prezzario) === 1) || rr[0]
        if (active && !selectedCode) setSelectedCode(active.codice_prezzario)
      } catch (e: any) {
        if (!cancel) setMsg({ text: 'Errore caricamento prezzari: ' + (e?.message ?? e), ok: false })
      }
      if (!cancel) setLoadingPrezzari(false)
    }
    void run()
    return () => { cancel = true }
  }, [prezzariUrl, selectedCode])

  React.useEffect(() => {
    let cancel = false
    const run = async () => {
      if (!serviceUrl || !selectedCode) { setRows([]); setSelectedRow(null); return }
      setLoadingRows(true)
      try {
        const rr = await queryVoci(serviceUrl, selectedCode)
        if (cancel) return
        setRows(rr)
        setSelectedCapitolo('')
        setSelectedSottocapitolo('')
        setExpandedCaps({})
        setSelectedRow(rr[0] || null)
      } catch (e: any) {
        if (!cancel) setMsg({ text: 'Errore caricamento voci: ' + (e?.message ?? e), ok: false })
      }
      if (!cancel) setLoadingRows(false)
    }
    void run()
    return () => { cancel = true }
  }, [serviceUrl, selectedCode])

  React.useEffect(() => {
    let cancel = false
    const run = async () => {
      if (!analisiUrl || !selectedRow) { setAnalisiRows([]); return }
      setLoadingAnalisi(true)
      try {
        const rr = await queryAnalisi(analisiUrl, selectedRow)
        if (!cancel) setAnalisiRows(rr)
      } catch {
        if (!cancel) setAnalisiRows([])
      }
      if (!cancel) setLoadingAnalisi(false)
    }
    void run()
    return () => { cancel = true }
  }, [analisiUrl, selectedRow?.codice_voce, selectedRow?.codice_prezzario])

  const tree = React.useMemo(() => buildTree(rows), [rows])

  const filteredRows = React.useMemo(() => {
    const q = safeUpper(search)
    return rows.filter((r) => {
      if (selectedCapitolo && trimText(r.capitolo) !== selectedCapitolo) return false
      if (selectedSottocapitolo && trimText(r.sottocapitolo) !== selectedSottocapitolo) return false
      if (!q) return true
      const hay = [r.codice_voce, r.famiglia, r.capitolo, r.sottocapitolo, r.descrizione, r.unita_misura, r.categoria_default].map((x) => safeUpper(x)).join(' | ')
      return hay.includes(q)
    })
  }, [rows, selectedCapitolo, selectedSottocapitolo, search])

  React.useEffect(() => {
    if (!filteredRows.length) { setSelectedRow(null); return }
    if (!selectedRow || !filteredRows.some((r) => r.objectid === selectedRow.objectid)) setSelectedRow(filteredRows[0])
  }, [filteredRows, selectedRow])

  const selectedPrezzario = prezzari.find((p) => p.codice_prezzario === selectedCode) || null
  const toggleCap = (capitolo: string) => setExpandedCaps((m) => ({ ...m, [capitolo]: !m[capitolo] }))

  const selectCapitolo = (capitolo: string) => {
    setSelectedCapitolo(capitolo)
    setSelectedSottocapitolo('')
    setExpandedCaps((m) => ({ ...m, [capitolo]: true }))
  }

  const selectSottocapitolo = (capitolo: string, sottocapitolo: string) => {
    setSelectedCapitolo(capitolo)
    setSelectedSottocapitolo(sottocapitolo)
    setExpandedCaps((m) => ({ ...m, [capitolo]: true }))
  }

  return (
    <Fragment>
      <style>{styles}</style>
      <div className='gcp'>
        <div className='gcp-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>
        {(!serviceUrl || !prezzariUrl) ? <div className='gcp-msg gcp-msg-err'>Configura gli URL delle tabelle nel setting del widget.</div> : null}
        {msg && <div className={`gcp-msg ${msg.ok ? 'gcp-msg-ok' : 'gcp-msg-err'}`}>{msg.text}</div>}

        <div className='gcp-toolbar'>
          <div className='gcp-field'>
            <div className='gcp-label'>Prezzario</div>
            <select className='gcp-select' value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)}>
              <option value=''>— seleziona —</option>
              {prezzari.map((p) => (
                <option key={p.objectid} value={p.codice_prezzario}>{`${p.codice_prezzario}${num(p.stato_prezzario) === 1 ? ' (attivo)' : ''}`}</option>
              ))}
            </select>
          </div>
          <div className='gcp-field'>
            <div className='gcp-label'>Cerca</div>
            <input className='gcp-input' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='codice, descrizione, capitolo, sottocapitolo…' />
          </div>
          <div className='gcp-muted' style={{ paddingBottom: 8, textAlign: 'right' }}>
            {loadingPrezzari ? 'Caricamento prezzari…' : loadingRows ? 'Caricamento voci…' : `${filteredRows.length.toLocaleString('it-IT')} voci visibili`}
          </div>
        </div>

        <div className='gcp-layout'>
          <div className='gcp-panel'>
            <div className='gcp-panel-head'>Struttura capitoli</div>
            <div className='gcp-panel-body'>
              <div className='gcp-tree-root'>
                <button className={`gcp-tree-btn ${!selectedCapitolo ? 'active' : ''}`} onClick={() => { setSelectedCapitolo(''); setSelectedSottocapitolo('') }}>
                  <span>Tutte le voci</span>
                  <span className='gcp-chip'>{rows.length.toLocaleString('it-IT')}</span>
                </button>
                {tree.map((node) => {
                  const expanded = !!expandedCaps[node.capitolo] || selectedCapitolo === node.capitolo
                  const capActive = selectedCapitolo === node.capitolo && !selectedSottocapitolo
                  return (
                    <div key={node.capitolo} style={{ marginTop: 4 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'center' }}>
                        <button className={`gcp-tree-btn ${capActive ? 'active' : ''}`} onClick={() => selectCapitolo(node.capitolo)}>
                          <span>{node.capitolo}</span>
                          <span className='gcp-chip'>{node.count.toLocaleString('it-IT')}</span>
                        </button>
                        <button className='gcp-tree-btn' style={{ width: 36, padding: '8px 0', justifyContent: 'center' }} onClick={() => toggleCap(node.capitolo)} aria-label='Espandi/collassa'>{expanded ? '−' : '+'}</button>
                      </div>
                      {expanded && (
                        <div className='gcp-tree-sub'>
                          {node.children.map((child) => {
                            const subActive = selectedCapitolo === node.capitolo && selectedSottocapitolo === child.sottocapitolo
                            return (
                              <button key={`${node.capitolo}__${child.sottocapitolo}`} className={`gcp-tree-btn ${subActive ? 'active' : ''}`} onClick={() => selectSottocapitolo(node.capitolo, child.sottocapitolo)}>
                                <span>{child.sottocapitolo}</span>
                                <span className='gcp-chip'>{child.count.toLocaleString('it-IT')}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className='gcp-panel'>
            <div className='gcp-panel-head'>Elenco voci</div>
            <div className='gcp-panel-body'>
              <table className='gcp-list-table'>
                <thead>
                  <tr>
                    <th>Tariffa</th>
                    <th>Descrizione</th>
                    <th>UM</th>
                    <th>Prezzo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={4} className='gcp-empty'>{loadingRows ? 'Caricamento…' : 'Nessuna voce.'}</td></tr>
                  ) : filteredRows.map((r) => (
                    <tr key={r.objectid} className={`gcp-list-row ${selectedRow?.objectid === r.objectid ? 'sel' : ''}`} onClick={() => setSelectedRow(r)}>
                      <td><b>{r.codice_voce}</b><div className='gcp-muted'>{r.famiglia || ''}</div></td>
                      <td>{r.descrizione}</td>
                      <td>{r.unita_misura || ''}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{money(r.prezzo_unitario, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className='gcp-panel'>
            <div className='gcp-panel-head'>Dettaglio voce</div>
            <div className='gcp-panel-body'>
              {!selectedRow ? <div className='gcp-empty'>Seleziona una voce.</div> : (
                <div className='gcp-detail'>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span className='gcp-chip'>{selectedRow.codice_voce}</span>
                    {selectedRow.famiglia ? <span className='gcp-chip'>{selectedRow.famiglia}</span> : null}
                    {selectedRow.categoria_default ? <span className='gcp-chip'>{selectedRow.categoria_default}</span> : null}
                    {num(selectedRow.selezionabile) === 1 ? <span className='gcp-chip'>Selezionabile</span> : null}
                  </div>

                  <div className='gcp-kv'>
                    <div>Prezzario</div><div>{selectedPrezzario?.titolo_prezzario || selectedCode}</div>
                    <div>Anno</div><div>{selectedPrezzario?.anno_prezzario || ''}</div>
                    <div>Capitolo</div><div>{selectedRow.capitolo || '—'}</div>
                    <div>Sottocapitolo</div><div>{selectedRow.sottocapitolo || '—'}</div>
                    <div>Unità misura</div><div>{selectedRow.unita_misura || '—'}</div>
                    <div>Prezzo</div><div>{money(selectedRow.prezzo_unitario, 4)}</div>
                    <div>Stato</div><div>{num(selectedRow.attivo) === 1 ? 'Attivo' : 'Disattivo'}</div>
                    <div>Importato il</div><div>{fmtDate(selectedPrezzario?.data_import) || '—'}</div>
                  </div>

                  <div>
                    <div className='gcp-label' style={{ marginBottom: 6 }}>Descrizione completa</div>
                    <div className='gcp-desc'>{selectedRow.descrizione || '—'}</div>
                  </div>

                  {analisiUrl ? (
                    <div>
                      <div className='gcp-label' style={{ marginBottom: 6 }}>Analisi collegata {loadingAnalisi ? '(caricamento...)' : analisiRows.length ? `(${analisiRows.length})` : ''}</div>
                      {!analisiRows.length ? (
                        <div className='gcp-muted'>{loadingAnalisi ? 'Caricamento…' : 'Nessuna analisi trovata per questa voce.'}</div>
                      ) : (
                        <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #dbe7f4', borderRadius: 6 }}>
                          <table className='gcp-ana-table'>
                            <thead>
                              <tr>
                                <th>Elemento</th>
                                <th>Descrizione</th>
                                <th>Cat.</th>
                                <th>Q.tà</th>
                                <th>Prezzo</th>
                                <th>Importo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analisiRows.map((a) => (
                                <tr key={a.objectid}>
                                  <td>{a.codice_elemento || ''}</td>
                                  <td>{a.descrizione_elemento || ''}</td>
                                  <td>{a.categoria_costo || ''}</td>
                                  <td>{a.quantita != null ? money(a.quantita, 4) : ''}</td>
                                  <td>{a.prezzo_unitario != null ? money(a.prezzo_unitario, 4) : ''}</td>
                                  <td>{a.importo != null ? money(a.importo, 4) : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

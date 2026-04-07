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

function decodeHtmlEntities(v: any): string {
  const s = String(v ?? '')
  if (!s || s.indexOf('&') < 0) return s
  try {
    const el = document.createElement('textarea')
    el.innerHTML = s
    return String(el.value || '')
  } catch {
    return s
      .replace(/&quot;/gi, '"')
      .replace(/&#34;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
  }
}
function sanitizeText(v: any): string {
  return decodeHtmlEntities(v)
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, ' ')
    .trim()
}
function getFieldMap(fl: any): Record<string, any> {
  const out: Record<string, any> = {}
  ;((fl?.fields || []) as any[]).forEach((f: any) => {
    const name = String(f?.name || '')
    if (name) out[name] = f
  })
  return out
}
function fieldTypeName(f: any): string { return String(f?.type || '').toLowerCase() }
function truncateForField(v: string, f: any): string {
  const len = Number(f?.length || 0)
  return len > 0 ? String(v).slice(0, len) : String(v)
}
function prepareAttrsForLayer(fl: any, attrs: any): any {
  const fieldMap = getFieldMap(fl)
  const out: any = {}
  Object.keys(attrs || {}).forEach((k) => {
    const f = fieldMap[k]
    if (!f) return
    const raw = attrs[k]
    if (raw == null) { out[k] = raw; return }
    if (typeof raw === 'string') {
      out[k] = truncateForField(sanitizeText(raw), f)
      return
    }
    if (fieldTypeName(f).includes('date') && raw instanceof Date) {
      out[k] = raw.getTime()
      return
    }
    out[k] = raw
  })
  return out
}
function formatApplyEditsError(err: any): string {
  if (!err) return 'Errore sconosciuto.'
  const msg = String(err?.message || err?.description || err || '').trim()
  const details = Array.isArray(err?.details)
    ? err.details.map((x: any) => String(x || '').trim()).filter(Boolean)
    : []
  return [msg, ...details].filter(Boolean).join(' | ') || 'Errore sconosciuto.'
}
function getRowKey(attrs: any): string {
  const parts = ['codice_voce', 'codice_analisi', 'codice_elemento', 'codice_prezzario']
    .map((k) => String(attrs?.[k] || '').trim())
    .filter(Boolean)
  return parts.join(' / ')
}

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
async function queryAllObjectIds(urlRaw: any, where = '1=1'): Promise<number[]> {
  const fl = await getLayer(urlRaw)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = where
  q.returnGeometry = false
  if (typeof fl.queryObjectIds === 'function') {
    const ids = await fl.queryObjectIds(q)
    return Array.isArray(ids) ? ids.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x) && x > 0) : []
  }
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  q.outFields = [oidField]
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((f: any) => Number(f?.attributes?.[oidField] || 0)).filter((x: number) => Number.isFinite(x) && x > 0)
}
async function applyAttrs(urlRaw: any, attrs: any, objectid?: number | null): Promise<void> {
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const out: any = prepareAttrsForLayer(fl, attrs)
  if (objectid != null) out[oidField] = Number(objectid)
  const payload = objectid != null ? { updateFeatures: [{ attributes: out }] } : { addFeatures: [{ attributes: out }] }
  const res = await fl.applyEdits(payload as any)
  const r = objectid != null ? res?.updateFeatureResults?.[0] : res?.addFeatureResults?.[0]
  if (r?.error) throw new Error(formatApplyEditsError(r.error) || 'Salvataggio non riuscito.')
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
    if (bad?.error) throw new Error(formatApplyEditsError(bad.error) || 'Eliminazione non riuscita.')
  }
}
async function deleteWhere(urlRaw: any, where: string): Promise<number> {
  const ids = await queryAllObjectIds(urlRaw, where)
  await deleteObjectIds(urlRaw, ids)
  return ids.length
}
async function setOnlyOneActive(urlRaw: any, objectid: number): Promise<void> {
  const rows = await queryRows(urlRaw, '1=1', 'OBJECTID DESC')
  const fl = await getLayer(urlRaw)
  const fieldNames = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  if (!fieldNames.has('stato_prezzario')) throw new Error('Il campo stato_prezzario non esiste nella tabella.')
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200).map((r: any) => ({ attributes: { [oidField]: r.objectid, stato_prezzario: r.objectid === objectid ? 1 : (num(r.stato_prezzario) === 0 ? 0 : 2) } }))
    const res = await fl.applyEdits({ updateFeatures: batch } as any)
    const bad = (res?.updateFeatureResults || []).find((x: any) => x?.error)
    if (bad?.error) throw new Error(formatApplyEditsError(bad.error) || 'Aggiornamento attivo non riuscito.')
  }
}
async function setPrezzarioStatus(urlRaw: any, objectid: number, status: number): Promise<void> {
  const fl = await getLayer(urlRaw)
  const fieldNames = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  if (!fieldNames.has('stato_prezzario')) throw new Error('Il campo stato_prezzario non esiste nella tabella.')
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const res = await fl.applyEdits({ updateFeatures: [{ attributes: { [oidField]: Number(objectid), stato_prezzario: Number(status) } }] } as any)
  const bad = (res?.updateFeatureResults || []).find((x: any) => x?.error)
  if (bad?.error) throw new Error(formatApplyEditsError(bad.error) || 'Aggiornamento stato prezzario non riuscito.')
}

function normalizeCategory(v: any): string {
  const s = String(v || '').trim().toUpperCase()
  if (s === 'NOLI') return 'NOLO'
  if (s === 'TRASPORTI') return 'TRASPORTO'
  if (s === 'MATERIALE') return 'MATERIALI'
  return s
}

const styles = `
.gpw { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; }
.gpw-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; }
.gpw-card { background:#f5f9ff; border:1px solid #c5d9f1; border-radius:6px; padding:12px; }
.gpw-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; }
.gpw-field { display:flex; flex-direction:column; gap:3px; }
.gpw-label { font-size:11px; font-weight:700; color:#1F4E79; }
.gpw-input, .gpw-select { width:100%; padding:6px 8px; border:1px solid #aac4e0; border-radius:4px; font-size:13px; box-sizing:border-box; background:#fff; }
.gpw-btns { display:flex; gap:8px; flex-wrap:wrap; }
.gpw-btns-inline { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.gpw-btn { padding:6px 16px; border:none; border-radius:4px; font-size:13px; cursor:pointer; font-weight:700; }
.gpw-primary { background:#1F4E79; color:#fff; }
.gpw-secondary { background:#375623; color:#fff; }
.gpw-warning { background:#b45f06; color:#fff; }
.gpw-danger { background:#c00; color:#fff; }
.gpw-table-wrap { flex:1; min-height:0; overflow:auto; border:1px solid #c5d9f1; border-radius:6px; }
.gpw-table { width:100%; border-collapse:collapse; font-size:12px; }
.gpw-table th { background:#1F4E79; color:#fff; padding:7px 8px; text-align:left; position:sticky; top:0; z-index:1; white-space:nowrap; }
.gpw-table td { padding:6px 8px; border-bottom:1px solid #e0eaf4; vertical-align:middle; }
.gpw-table tbody tr:nth-child(odd) td { background:#f5f9ff; }
.gpw-table tbody tr:nth-child(even) td { background:#fff; }
.gpw-msg { padding:7px 12px; border-radius:4px; font-size:12px; font-weight:700; }
.gpw-msg-ok { background:#e2efda; color:#375623; border:1px solid #b8d4b0; }
.gpw-msg-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
`;

type MetaRow = { objectid: number; codice_prezzario: string; anno_prezzario: number; titolo_prezzario: string; tipo_prezzario: string; stato_prezzario: number; origine_file: string; nome_file_origine: string; data_import: any; importato_da: string; note: string }
type ArtRow = { codice_voce:string; famiglia:string; capitolo:string; sottocapitolo:string; descrizione:string; unita_misura:string; prezzo_unitario:number; categoria_default:string; selezionabile:number; attivo:number }
type AnalisiRow = { codice_analisi:string; codice_elemento:string; descrizione_elemento:string; categoria_costo:string; quantita:number; prezzo_unitario:number; importo:number; attivo:number }

function inferCategory(famiglia: string, codice: string, descr: string): string {
  const tok = String(famiglia || codice || '').trim().toUpperCase()
  const d = String(descr || '').trim().toUpperCase()
  if (tok.startsWith('RU')) return 'MANODOPERA'
  if (tok.startsWith('AT')) return /TRASPORT/.test(d) ? 'TRASPORTO' : 'NOLO'
  if (tok.startsWith('PR') || tok.startsWith('SL')) return 'MATERIALI'
  return 'MATERIALI'
}

function decodeBytes(data: Uint8Array): string {
  try { return new TextDecoder('windows-1252').decode(data) } catch { return new TextDecoder('utf-8').decode(data) }
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const W: any = window as any
  if (!W.DecompressionStream) throw new Error('Il browser non supporta DecompressionStream per importare lo zip.')
  const ds = new W.DecompressionStream('deflate-raw')
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  const stream = new Blob([ab]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

async function unzipEntries(file: File): Promise<Array<{ name: string; data: Uint8Array }>> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const out: Array<{ name: string; data: Uint8Array }> = []
  const readU16 = (o: number) => bytes[o] | (bytes[o + 1] << 8)
  const readU32 = (o: number) => (bytes[o]) | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)
  let off = 0
  while (off + 30 <= bytes.length) {
    const sig = readU32(off) >>> 0
    if (sig !== 0x04034b50) break
    const flags = readU16(off + 6)
    const method = readU16(off + 8)
    if ((flags & 0x08) !== 0) throw new Error('Zip con data descriptor non supportato.')
    const compSize = readU32(off + 18) >>> 0
    const nameLen = readU16(off + 26)
    const extraLen = readU16(off + 28)
    const name = decodeBytes(bytes.slice(off + 30, off + 30 + nameLen))
    const dataStart = off + 30 + nameLen + extraLen
    const dataEnd = dataStart + compSize
    const comp = bytes.slice(dataStart, dataEnd)
    let data: Uint8Array
    if (method === 0) data = comp
    else if (method === 8) data = await inflateRaw(comp)
    else throw new Error(`Metodo ZIP non supportato: ${method}`)
    out.push({ name, data })
    off = dataEnd
  }
  return out
}

function parsePipeCsv(text: string): string[][] {
  return text.split(/\r?\n/).filter(Boolean).slice(1).map((line) => line.split('|').map((x) => x.trim()))
}

async function parseOfficialZip(file: File): Promise<{ articoli: ArtRow[]; analisi: AnalisiRow[] }> {
  const entries = await unzipEntries(file)
  const artEntry = entries.find((e) => /anagrafica/i.test(e.name))
  const anaEntry = entries.find((e) => /analisi/i.test(e.name))
  if (!artEntry || !anaEntry) throw new Error('Nel pacchetto non trovo i due CSV attesi (anagrafica e analisi).')
  const artRows = parsePipeCsv(decodeBytes(artEntry.data))
  const anaRows = parsePipeCsv(decodeBytes(anaEntry.data))

  const articoli: ArtRow[] = artRows.map((r) => {
    const codice = String(r[0] || '').trim()
    const famiglia = String(r[1] || '').trim()
    const descrizione = String(r[4] || '').trim()
    return {
      codice_voce: codice,
      famiglia,
      capitolo: String(r[2] || '').trim(),
      sottocapitolo: String(r[3] || '').trim(),
      descrizione,
      unita_misura: String(r[5] || '').trim(),
      prezzo_unitario: round(num(String(r[10] || '').replace(/\./g, '').replace(',', '.')), 4),
      categoria_default: inferCategory(famiglia, codice, descrizione),
      selezionabile: 1,
      attivo: 1
    }
  }).filter((r) => !!r.codice_voce && !!r.descrizione)

  const artMap = new Map<string, ArtRow>()
  articoli.forEach((a) => artMap.set(String(a.codice_voce || '').trim(), a))

  const analisi: AnalisiRow[] = anaRows.map((r) => {
    const codiceAnalisi = String(r[0] || '').trim()
    const codiceElemento = String(r[1] || '').trim()
    const art = artMap.get(codiceElemento)
    return {
      codice_analisi: codiceAnalisi,
      codice_elemento: codiceElemento,
      descrizione_elemento: String(art?.descrizione || ''),
      categoria_costo: normalizeCategory(String(art?.categoria_default || inferCategory(String(art?.famiglia || ''), codiceElemento, String(art?.descrizione || '')))),
      quantita: num(String(r[2] || '').replace(/\./g, '').replace(',', '.')),
      prezzo_unitario: round(num(String(r[3] || '').replace(/\./g, '').replace(',', '.')), 4),
      importo: round(num(String(r[4] || '').replace(/\./g, '').replace(',', '.')), 4),
      attivo: 1
    }
  }).filter((r) => !!r.codice_analisi && !!r.codice_elemento)

  return { articoli, analisi }
}

async function addOneByOne(fl: any, attrsList: any[], startIndex: number, total: number, label: string, onProgress?: (done: number, total: number) => void): Promise<void> {
  const createdIds: number[] = []
  for (let i = 0; i < attrsList.length; i++) {
    const attrs = prepareAttrsForLayer(fl, attrsList[i])
    const res = await fl.applyEdits({ addFeatures: [{ attributes: attrs }] } as any)
    const row = res?.addFeatureResults?.[0]
    if (row?.error) {
      if (createdIds.length) {
        try { await deleteObjectIds(fl.url, createdIds) } catch {}
      }
      const idx = startIndex + i + 1
      const key = getRowKey(attrsList[i])
      throw new Error(`${label} riga ${idx}${key ? ` (${key})` : ''}: ${formatApplyEditsError(row.error)}`)
    }
    const oid = Number(row?.objectId || row?.objectID || 0)
    if (oid) createdIds.push(oid)
    if (onProgress) onProgress(startIndex + i + 1, total)
  }
}
async function addInChunks(urlRaw: string, attrsList: any[], label: string, onProgress?: (done: number, total: number) => void): Promise<void> {
  if (!attrsList.length) return
  const fl = await getLayer(urlRaw)
  for (let i = 0; i < attrsList.length; i += 250) {
    const rawSlice = attrsList.slice(i, i + 250)
    const slice = rawSlice.map((attrs) => ({ attributes: prepareAttrsForLayer(fl, attrs) }))
    const res = await fl.applyEdits({ addFeatures: slice } as any)
    const bad = (res?.addFeatureResults || []).find((x: any) => x?.error)
    if (bad?.error) {
      await addOneByOne(fl, rawSlice, i, attrsList.length, label, onProgress)
    } else if (onProgress) {
      onProgress(Math.min(i + slice.length, attrsList.length), attrsList.length)
    }
  }
}

async function cleanupPrezzarioByCode(prezzariUrl: string, vociUrl: string, analisiUrl: string, code: string): Promise<{ voci: number; analisi: number; meta: number }> {
  const safeCode = esc(String(code || '').trim())
  const where = `codice_prezzario = '${safeCode}'`
  const deletedVoci = await deleteWhere(vociUrl, where)
  const deletedAnalisi = await deleteWhere(analisiUrl, where)
  const deletedMeta = await deleteWhere(prezzariUrl, where)
  return { voci: deletedVoci, analisi: deletedAnalisi, meta: deletedMeta }
}

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const prezzariUrl = String(cfg.prezzariUrl || '').trim()
  const vociUrl = String(cfg.vociUrl || '').trim()
  const analisiUrl = String(cfg.analisiUrl || '').trim()
  const title = String(cfg.title || 'GII - Gestione Prezzari')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const [rows, setRows] = React.useState<MetaRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null)
  const [isRi, setIsRi] = React.useState<boolean>(isRiOrAdminUser())
  const [file, setFile] = React.useState<File | null>(null)
  const [anno, setAnno] = React.useState('')
  const [codice, setCodice] = React.useState('')
  const [descrizione, setDescrizione] = React.useState('')
  const [activateAfterImport, setActivateAfterImport] = React.useState(true)
  const [progress, setProgress] = React.useState('')

  React.useEffect(() => {
    const refresh = () => setIsRi(isRiOrAdminUser())
    refresh(); window.addEventListener('gii:userLoaded', refresh)
    return () => window.removeEventListener('gii:userLoaded', refresh)
  }, [])
  React.useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), 7000); return () => window.clearTimeout(t) }, [msg])

  const load = React.useCallback(async () => {
    if (!prezzariUrl) { setRows([]); return }
    setLoading(true)
    try {
      const rr = await queryRows(prezzariUrl, '1=1', 'anno_prezzario DESC, OBJECTID DESC')
      setRows(rr as any)
    } catch (e: any) {
      setMsg({ text: 'Errore caricamento: ' + (e?.message ?? e), ok: false })
    }
    setLoading(false)
  }, [prezzariUrl])

  React.useEffect(() => { void load() }, [load])

  const applyFileDefaults = React.useCallback((selected: File | null) => {
    setFile(selected)
    if (!selected) return
    const name = String(selected.name || '')
    const matchYear = name.match(/(20\d{2})/)
    const year = matchYear?.[1] || ''
    if (!anno.trim() && year) setAnno(year)
    if (!codice.trim() && year) setCodice(`SAR_LLPP_${year}`)
    if (!descrizione.trim() && year) setDescrizione(`Prezzario LLPP Sardegna ${year}`)
    if (!descrizione.trim() && !year) setDescrizione('Prezzario LLPP Sardegna')
  }, [anno, codice, descrizione])

  const onImport = async () => {
    if (!prezzariUrl || !vociUrl || !analisiUrl) { setMsg({ text: 'Configura gli URL delle tre tabelle.', ok: false }); return }
    if (!file) { setMsg({ text: 'Seleziona lo zip regionale del prezzario.', ok: false }); return }
    const code = String(codice || '').trim()
    const desc = String(descrizione || '').trim()
    const year = Math.trunc(num(anno))
    if (!code || !desc || !year) { setMsg({ text: 'Compila codice, descrizione e anno.', ok: false }); return }
    setSaving(true)
    setProgress('Lettura zip…')
    try {
      const existing = await queryAllObjectIds(prezzariUrl, `codice_prezzario = '${esc(code)}'`)
      const existingVoci = await queryAllObjectIds(vociUrl, `codice_prezzario = '${esc(code)}'`)
      const existingAnalisi = await queryAllObjectIds(analisiUrl, `codice_prezzario = '${esc(code)}'`)
      if (existing.length || existingVoci.length || existingAnalisi.length) {
        if (!window.confirm(`Esiste già materiale per il prezzario ${code}. Sostituirlo?`)) { setSaving(false); setProgress(''); return }
        setProgress('Eliminazione versione precedente…')
        await cleanupPrezzarioByCode(prezzariUrl, vociUrl, analisiUrl, code)
      }

      const parsed = await parseOfficialZip(file)
      setProgress(`Import voci 0/${parsed.articoli.length}…`)
      await addInChunks(vociUrl, parsed.articoli.map((r) => ({
        codice_prezzario: code,
        anno_prezzario: year,
        origine_voce: 'REGIONE',
        codice_voce: r.codice_voce,
        descrizione: r.descrizione,
        unita_misura: r.unita_misura,
        prezzo_unitario: r.prezzo_unitario,
        famiglia: r.famiglia,
        capitolo: r.capitolo,
        sottocapitolo: r.sottocapitolo,
        categoria_default: r.categoria_default,
        selezionabile: r.selezionabile,
        attivo: r.attivo
      })), 'Voce prezzario', (done, total) => setProgress(`Import voci ${done}/${total}…`))

      setProgress(`Import analisi 0/${parsed.analisi.length}…`)
      await addInChunks(analisiUrl, parsed.analisi.map((r) => ({
        codice_prezzario: code,
        codice_analisi: r.codice_analisi,
        codice_elemento: r.codice_elemento,
        descrizione_elemento: r.descrizione_elemento,
        categoria_costo: r.categoria_costo,
        quantita: r.quantita,
        prezzo_unitario: r.prezzo_unitario,
        importo: r.importo,
        attivo: r.attivo
      })), 'Analisi prezzario', (done, total) => setProgress(`Import analisi ${done}/${total}…`))

      setProgress('Registrazione metadati…')
      await applyAttrs(prezzariUrl, {
        codice_prezzario: code,
        titolo_prezzario: desc,
        anno_prezzario: year,
        tipo_prezzario: 'REGIONE',
        stato_prezzario: activateAfterImport ? 1 : 0,
        origine_file: 'ZIP_CSV_REGIONE',
        nome_file_origine: String(file?.name || ''),
        data_import: Date.now(),
        importato_da: String((window as any).__giiUserRole?.username || (window as any).__giiUserRole?.utente || ''),
        note: `Importato da widget il ${new Date().toLocaleString('it-IT')} - voci: ${parsed.articoli.length}; analisi: ${parsed.analisi.length}`
      })
      if (activateAfterImport) {
        const all = await queryRows(prezzariUrl, '1=1', 'OBJECTID DESC')
        const target = all.find((r: any) => String(r.codice_prezzario || '') === code)
        if (target?.objectid) await setOnlyOneActive(prezzariUrl, Number(target.objectid))
      }
      setMsg({ text: `Prezzario ${code} importato: ${parsed.articoli.length} voci e ${parsed.analisi.length} righe di analisi.`, ok: true })
      setFile(null)
      setProgress('')
      await load()
    } catch (e: any) {
      try { await cleanupPrezzarioByCode(prezzariUrl, vociUrl, analisiUrl, code) } catch {}
      setMsg({ text: 'Errore import: ' + (e?.message ?? e), ok: false })
    } finally {
      setSaving(false)
      setProgress('')
    }
  }

  const onToggleActive = async (r: any) => {
    if (!prezzariUrl) return
    setSaving(true)
    try {
      if (num(r.stato_prezzario) === 1) {
        await setPrezzarioStatus(prezzariUrl, Number(r.objectid), 2)
        await load()
        setMsg({ text: `Prezzario ${r.codice_prezzario} disattivato.`, ok: true })
      } else {
        await setOnlyOneActive(prezzariUrl, Number(r.objectid))
        await load()
        setMsg({ text: `Prezzario ${r.codice_prezzario} attivato.`, ok: true })
      }
    } catch (e: any) {
      setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false })
    }
    setSaving(false)
  }

  const onDelete = async (r: any) => {
    if (num(r.stato_prezzario) === 1) { setMsg({ text: 'Disattiva prima il prezzario attivo, poi eliminalo.', ok: false }); return }
    if (!window.confirm(`Eliminare il prezzario ${r.codice_prezzario} e tutte le sue voci/analisi?`)) return
    setSaving(true)
    try {
      setProgress('Eliminazione record collegati…')
      const deleted = await cleanupPrezzarioByCode(prezzariUrl, vociUrl, analisiUrl, String(r.codice_prezzario || ''))
      const residuiVoci = await queryAllObjectIds(vociUrl, `codice_prezzario = '${esc(String(r.codice_prezzario || ''))}'`)
      const residuiAnalisi = await queryAllObjectIds(analisiUrl, `codice_prezzario = '${esc(String(r.codice_prezzario || ''))}'`)
      const residuiMeta = await queryAllObjectIds(prezzariUrl, `codice_prezzario = '${esc(String(r.codice_prezzario || ''))}'`)
      if (residuiVoci.length || residuiAnalisi.length || residuiMeta.length) {
        throw new Error(`Eliminazione incompleta. Residui - voci: ${residuiVoci.length}, analisi: ${residuiAnalisi.length}, prezzari: ${residuiMeta.length}`)
      }
      await load()
      setMsg({ text: `Prezzario eliminato. Rimossi: ${deleted.voci} voci, ${deleted.analisi} analisi, ${deleted.meta} record prezzario.`, ok: true })
    } catch (e: any) {
      setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false })
    } finally {
      setSaving(false)
      setProgress('')
    }
  }

  if (!isRi) return <div style={{ padding: 12, fontFamily: 'Arial, sans-serif', color: '#7a1c1c', background: '#fce4e4', border: '1px solid #f5b8b8', borderRadius: 6 }}>Widget riservato al Responsabile Istruttore (RI) o all'Amministratore (ADMIN).</div>

  return (
    <Fragment>
      <style>{styles}</style>
      <div className='gpw'>
        <div className='gpw-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>
        {(!prezzariUrl || !vociUrl || !analisiUrl) ? <div className='gpw-msg gpw-msg-err'>Configura gli URL delle tre tabelle nel setting del widget.</div> : null}
        {msg && <div className={`gpw-msg ${msg.ok ? 'gpw-msg-ok' : 'gpw-msg-err'}`}>{msg.text}</div>}
        <div className='gpw-card'>
          <div className='gpw-grid'>
            <div className='gpw-field'><div className='gpw-label'>File zip prezzario regionale</div><input className='gpw-input' type='file' accept='.zip' onChange={(e) => applyFileDefaults(((e.target as HTMLInputElement).files || [])[0] || null)} /></div>
            <div className='gpw-field'><div className='gpw-label'>Anno</div><input className='gpw-input' value={anno} onChange={(e) => setAnno(e.target.value)} /></div>
            <div className='gpw-field'><div className='gpw-label'>Codice prezzario</div><input className='gpw-input' value={codice} onChange={(e) => setCodice(e.target.value)} /></div>
            <div className='gpw-field'><div className='gpw-label'>Descrizione</div><input className='gpw-input' value={descrizione} onChange={(e) => setDescrizione(e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 10, padding: '8px 10px', background: '#fff8e1', border: '1px solid #f3d48b', borderRadius: 4, color: '#6b4e00', fontSize: 12, lineHeight: 1.5 }}>
            <b>Istruzioni import prezzario regionale:</b> caricare <b>lo ZIP originale</b> del prezzario regionale <b>senza estrarlo</b>.
            Il pacchetto deve contenere entrambi i CSV: anagrafica articoli e analisi prezzario. <b>Non</b> caricare i CSV separatamente.
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type='checkbox' checked={activateAfterImport} onChange={(e) => setActivateAfterImport((e.target as HTMLInputElement).checked)} /> Attiva subito dopo l'import</label>
            <div className='gpw-btns'>
              <button className='gpw-btn gpw-primary' disabled={saving || !file} onClick={onImport}>{saving ? 'Import in corso…' : 'Importa prezzario'}</button>
            </div>
          </div>
          {progress ? <div style={{ marginTop: 8, fontSize: 12, color: '#1F4E79', fontWeight: 700 }}>{progress}</div> : null}
        </div>
        <div className='gpw-table-wrap'>
          <table className='gpw-table'>
            <thead><tr><th>Anno</th><th>Codice</th><th>Titolo</th><th>Tipo</th><th>Stato</th><th>File</th><th>Importato il</th><th>Azioni</th></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={8} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>{loading ? 'Caricamento…' : 'Nessun prezzario caricato.'}</td></tr> : rows.map((r: any) => (
                <tr key={r.objectid}>
                  <td>{r.anno_prezzario}</td>
                  <td><b>{r.codice_prezzario}</b></td>
                  <td>{r.titolo_prezzario}</td>
                  <td>{r.tipo_prezzario}</td>
                  <td>{num(r.stato_prezzario) === 1 ? 'Attivo' : (num(r.stato_prezzario) === 0 ? 'In test' : 'Disattivato')}</td>
                  <td>{r.nome_file_origine}</td>
                  <td>{toDateValue(r.data_import) ? toDateValue(r.data_import).split('-').reverse().join('/') : ''}</td>
                  <td>
                    <div className='gpw-btns-inline'>
                      <button className={`gpw-btn ${num(r.stato_prezzario) === 1 ? 'gpw-warning' : 'gpw-secondary'}`} disabled={saving} onClick={() => void onToggleActive(r)}>
                        {num(r.stato_prezzario) === 1 ? 'Disattiva' : 'Attiva'}
                      </button>
                      <button className='gpw-btn gpw-danger' disabled={saving} onClick={() => void onDelete(r)}>Elimina</button>
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

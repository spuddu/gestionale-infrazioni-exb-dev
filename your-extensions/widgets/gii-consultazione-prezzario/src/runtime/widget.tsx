/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'

const { Fragment } = React
const LIST_STEP = 250

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

type SummaryRow = {
  famiglia: string
  capitolo: string
  sottocapitolo: string
  count: number
}

type SottocapitoloNode = {
  sottocapitolo: string
  count: number
}

type CapitoloNode = {
  capitolo: string
  count: number
  children: SottocapitoloNode[]
}

type FamigliaNode = {
  famiglia: string
  label: string
  count: number
  children: CapitoloNode[]
}

type VociPageResult = {
  rows: VoceRow[]
  total: number
}

type LevelMode = 'STRUTTURA' | 'SUPER' | 'CAPITOLI' | 'SUB'
type SortField = 'codice_voce' | 'descrizione' | 'unita_misura' | 'prezzo_unitario'
type SortDir = 'ASC' | 'DESC'

const FAMIGLIA_LABELS: Record<string, string> = {
  AT: 'ATTREZZATURE E TRASPORTI',
  PR: 'MATERIALI DA COSTRUZIONE',
  MA: 'MATERIALI DA COSTRUZIONE',
  MT: 'MATERIALI DA COSTRUZIONE',
  RU: 'RISORSE UMANE',
  HR: 'RISORSE UMANE',
  SL: 'SEMILAVORATI',
  PF: 'PRODOTTI FINITI'
}

const FAMIGLIA_ORDER = ['AT', 'PR', 'MA', 'MT', 'RU', 'HR', 'SL', 'PF']

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
function priceUnitLabel(um?: string): string {
  const u = trimText(um)
  return u ? `euro/${u}` : 'euro'
}
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

function shortenMiddle(v: any, head = 96, tail = 28): string {
  const s = trimText(v)
  if (!s) return ''
  if (s.length <= head + tail + 3) return s
  return `${s.slice(0, head).trimEnd()}... ${s.slice(Math.max(0, s.length - tail)).trimStart()}`
}
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

function famigliaLabel(code: any): string {
  const raw = trimText(code)
  if (!raw) return '<nessuna>'
  const up = raw.toUpperCase()
  return FAMIGLIA_LABELS[up] || raw
}

function famigliaSortRank(code: any): number {
  const up = trimText(code).toUpperCase()
  const idx = FAMIGLIA_ORDER.indexOf(up)
  return idx >= 0 ? idx : 999
}

function voceKey(r: Partial<VoceRow> | null | undefined): string {
  if (!r) return ''
  const oid = Number((r as any).objectid || 0)
  if (oid > 0) return `oid:${oid}`
  return `cod:${String((r as any).codice_prezzario || '')}::${String((r as any).codice_voce || '')}`
}

function mapVoceRow(r: any): VoceRow {
  return {
    objectid: Number(r.objectid || r.OBJECTID || 0),
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
  }
}

async function queryAllRows(urlRaw: any, where = '1=1', orderBy?: string, outFields?: string[]): Promise<any[]> {
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const requestedFields = outFields?.length
    ? Array.from(new Set([oidField, ...outFields.filter((f) => !!String(f || '').trim())]))
    : ['*']
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
    q.outFields = requestedFields
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
    q.outFields = requestedFields
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
  const rows = await queryAllRows(prezzariUrl, '1=1', 'anno_prezzario DESC, OBJECTID DESC', [
    'codice_prezzario', 'titolo_prezzario', 'anno_prezzario', 'stato_prezzario', 'data_import'
  ])
  return rows.map((r: any) => ({
    objectid: Number(r.objectid || 0),
    codice_prezzario: String(r.codice_prezzario || ''),
    titolo_prezzario: trimText(r.titolo_prezzario),
    anno_prezzario: num(r.anno_prezzario),
    stato_prezzario: num(r.stato_prezzario),
    data_import: r.data_import
  })).filter((r) => !!r.codice_prezzario)
}

function aggregateSummary(rows: Array<{ famiglia?: any, capitolo?: any, sottocapitolo?: any, count?: any }>): SummaryRow[] {
  const map = new Map<string, SummaryRow>()
  rows.forEach((r) => {
    const famiglia = trimText((r as any).famiglia)
    const capitolo = trimText((r as any).capitolo)
    const sottocapitolo = trimText((r as any).sottocapitolo)
    const count = Math.max(0, num((r as any).count || 1)) || 1
    const key = [famiglia, capitolo, sottocapitolo].join('||')
    const prev = map.get(key)
    if (prev) prev.count += count
    else map.set(key, { famiglia, capitolo, sottocapitolo, count })
  })
  return Array.from(map.values())
}

async function querySummary(serviceUrl: string, codicePrezzario: string): Promise<SummaryRow[]> {
  const fl = await getLayer(serviceUrl)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const where = `codice_prezzario = '${esc(codicePrezzario)}'`

  try {
    const q = fl.createQuery ? fl.createQuery() : {}
    q.where = where
    q.outFields = ['famiglia', 'capitolo', 'sottocapitolo']
    q.returnGeometry = false
    q.groupByFieldsForStatistics = ['famiglia', 'capitolo', 'sottocapitolo']
    q.orderByFields = ['famiglia ASC', 'capitolo ASC', 'sottocapitolo ASC']
    q.outStatistics = [{
      statisticType: 'count',
      onStatisticField: oidField,
      outStatisticFieldName: 'row_count'
    }]
    const res = await fl.queryFeatures(q)
    const grouped = (res?.features || []).map((f: any) => ({
      famiglia: f?.attributes?.famiglia,
      capitolo: f?.attributes?.capitolo,
      sottocapitolo: f?.attributes?.sottocapitolo,
      count: Number(f?.attributes?.row_count || 0)
    }))
    if (grouped.length) return aggregateSummary(grouped)
  } catch {}

  const rows = await queryAllRows(serviceUrl, where, 'famiglia ASC, capitolo ASC, sottocapitolo ASC', ['famiglia', 'capitolo', 'sottocapitolo'])
  return aggregateSummary(rows.map((r: any) => ({ famiglia: r.famiglia, capitolo: r.capitolo, sottocapitolo: r.sottocapitolo, count: 1 })))
}

function buildHierarchy(summary: SummaryRow[]): FamigliaNode[] {
  const famMap = new Map<string, Map<string, Map<string, number>>>()
  summary.forEach((r) => {
    const fam = trimText(r.famiglia)
    const cap = trimText(r.capitolo)
    const sub = trimText(r.sottocapitolo)
    const count = Math.max(0, num(r.count))
    if (!famMap.has(fam)) famMap.set(fam, new Map())
    const capMap = famMap.get(fam)!
    if (!capMap.has(cap)) capMap.set(cap, new Map())
    const subMap = capMap.get(cap)!
    subMap.set(sub, (subMap.get(sub) || 0) + count)
  })
  return Array.from(famMap.entries()).map(([famiglia, capMap]) => {
    const children: CapitoloNode[] = Array.from(capMap.entries()).map(([capitolo, subMap]) => ({
      capitolo,
      count: Array.from(subMap.values()).reduce((a, b) => a + b, 0),
      children: Array.from(subMap.entries())
        .map(([sottocapitolo, count]) => ({ sottocapitolo, count }))
        .sort((a, b) => (a.sottocapitolo || '').localeCompare((b.sottocapitolo || ''), 'it', { sensitivity: 'base' }))
    })).sort((a, b) => (a.capitolo || '').localeCompare((b.capitolo || ''), 'it', { sensitivity: 'base' }))
    return {
      famiglia,
      label: famigliaLabel(famiglia),
      count: children.reduce((s, c) => s + c.count, 0),
      children
    }
  }).sort((a, b) => {
    const rank = famigliaSortRank(a.famiglia) - famigliaSortRank(b.famiglia)
    if (rank !== 0) return rank
    return (a.label || '').localeCompare((b.label || ''), 'it', { sensitivity: 'base' })
  })
}

function buildSearchWhere(search: string): string {
  const phrase = safeUpper(trimText(search).replace(/\s+/g, ' '))
  if (!phrase) return ''
  const fields = ['codice_voce', 'descrizione', 'famiglia', 'capitolo', 'sottocapitolo', 'unita_misura', 'categoria_default']
  const e = esc(phrase)
  return '(' + fields.map((f) => `UPPER(${f}) LIKE '%${e}%'`).join(' OR ') + ')'
}

function buildVociWhere(codicePrezzario: string, famiglia: string, capitolo: string, sottocapitolo: string, search: string): string {
  const parts = [`codice_prezzario = '${esc(codicePrezzario)}'`]
  const fam = trimText(famiglia)
  const cap = trimText(capitolo)
  const sub = trimText(sottocapitolo)
  if (fam) parts.push(`famiglia = '${esc(fam)}'`)
  if (cap) parts.push(`capitolo = '${esc(cap)}'`)
  if (sub) parts.push(`sottocapitolo = '${esc(sub)}'`)
  const searchWhere = buildSearchWhere(search)
  if (searchWhere) parts.push(searchWhere)
  return parts.join(' AND ')
}

async function queryVociPage(serviceUrl: string, codicePrezzario: string, famiglia: string, capitolo: string, sottocapitolo: string, search: string, offset: number, limit: number, orderBy: string): Promise<VociPageResult> {
  const fl = await getLayer(serviceUrl)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const where = buildVociWhere(codicePrezzario, famiglia, capitolo, sottocapitolo, search)
  const outFields = [
    oidField,
    'codice_prezzario', 'codice_voce', 'famiglia', 'capitolo', 'sottocapitolo', 'descrizione',
    'unita_misura', 'prezzo_unitario', 'categoria_default', 'selezionabile', 'attivo'
  ]

  let total = 0
  try {
    if (typeof fl.queryFeatureCount === 'function') {
      const qCount = fl.createQuery ? fl.createQuery() : {}
      qCount.where = where
      qCount.returnGeometry = false
      total = Number(await fl.queryFeatureCount(qCount) || 0)
    }
  } catch {}

  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = where
  q.outFields = outFields
  q.returnGeometry = false
  q.orderByFields = String(orderBy || 'famiglia ASC, capitolo ASC, sottocapitolo ASC, codice_voce ASC').split(',').map((x) => x.trim()).filter(Boolean)
  ;(q as any).start = Math.max(0, offset)
  ;(q as any).num = Math.max(1, limit)

  let rows: VoceRow[] = []
  try {
    const res = await fl.queryFeatures(q)
    rows = (res?.features || []).map((f: any) => mapVoceRow({ ...f.attributes, objectid: Number(f.attributes?.[oidField] || f.attributes?.OBJECTID || f.attributes?.objectid || 0) })).filter((r: VoceRow) => !!r.codice_voce)
    if (!total && rows.length) total = offset + rows.length
  } catch {
    const fallbackRows = await queryAllRows(serviceUrl, where, orderBy || 'famiglia ASC, capitolo ASC, sottocapitolo ASC, codice_voce ASC', outFields)
    total = fallbackRows.length
    rows = fallbackRows.slice(offset, offset + limit).map((r: any) => mapVoceRow(r)).filter((r: VoceRow) => !!r.codice_voce)
  }

  return { rows, total }
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

async function queryElementDescriptions(vociUrl: string, codicePrezzario: string, codes: string[]): Promise<Record<string, string>> {
  if (!vociUrl || !codes.length) return {}
  const uniq = Array.from(new Set(codes.map((c) => String(c || '').trim()).filter(Boolean)))
  if (!uniq.length) return {}
  const out: Record<string, string> = {}
  for (let i = 0; i < uniq.length; i += 100) {
    const chunk = uniq.slice(i, i + 100)
    const inList = chunk.map((c) => `'${esc(c)}'`).join(',')
    const where = `codice_prezzario = '${esc(codicePrezzario)}' AND codice_voce IN (${inList})`
    const rows = await queryAllRows(vociUrl, where, 'codice_voce ASC', ['codice_voce', 'descrizione'])
    rows.forEach((r: any) => {
      const code = String(r.codice_voce || '').trim()
      if (code) out[code] = htmlDecode(r.descrizione)
    })
  }
  return out
}

async function queryAnalisi(analisiUrl: string, voce: VoceRow | null, vociUrl?: string): Promise<AnalisiRow[]> {
  if (!analisiUrl || !voce?.codice_voce) return []
  const fl = await getLayer(analisiUrl)
  const fields = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  const wheres = candidateAnalysisWhere(voce.codice_voce, voce.codice_prezzario).filter((w) => {
    if (w.includes('codice_prezzario') && !fields.has('codice_prezzario')) return false
    if (w.includes('codice_voce') && !fields.has('codice_voce')) return false
    if (w.includes('codice_analisi') && !fields.has('codice_analisi')) return false
    return true
  })
  const requestedFields = [
    'codice_prezzario', 'codice_voce', 'codice_analisi', 'codice_elemento', 'descrizione_elemento',
    'categoria_costo', 'quantita', 'prezzo_unitario', 'importo', 'attivo'
  ].filter((f) => fields.has(f))
  for (const where of wheres) {
    const rows = await queryAllRows(analisiUrl, where, 'OBJECTID ASC', requestedFields)
    if (rows.length) {
      let descByCode: Record<string, string> = {}
      const needsDescLookup = !!vociUrl && (!fields.has('descrizione_elemento') || rows.some((r: any) => !String(r.descrizione_elemento || '').trim()))
      if (needsDescLookup) {
        const codes = rows.map((r: any) => String(r.codice_elemento || '').trim()).filter(Boolean)
        try { descByCode = await queryElementDescriptions(String(vociUrl || ''), voce.codice_prezzario, codes) } catch {}
      }
      return rows.map((r: any) => ({
        objectid: Number(r.objectid || 0),
        codice_prezzario: String(r.codice_prezzario || ''),
        codice_voce: String(r.codice_voce || ''),
        codice_analisi: String(r.codice_analisi || ''),
        codice_elemento: String(r.codice_elemento || ''),
        descrizione_elemento: htmlDecode(r.descrizione_elemento) || descByCode[String(r.codice_elemento || '').trim()] || '',
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

function normalizeColumnPercents(leftRaw: any, centerRaw: any, rightRaw: any): [number, number, number] {
  const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n))
  let left = clamp(num(leftRaw) || 25, 10, 70)
  let center = clamp(num(centerRaw) || 45, 10, 70)
  let right = clamp(num(rightRaw) || 30, 10, 70)
  const total = left + center + right
  if (!Number.isFinite(total) || total <= 0) return [25, 45, 30]
  left = (left / total) * 100
  center = (center / total) * 100
  right = (right / total) * 100
  return [left, center, right]
}

function uniqueSorted(items: Array<{ key: string, label: string, count: number }>): Array<{ key: string, label: string, count: number }> {
  const map = new Map<string, { key: string, label: string, count: number }>()
  items.forEach((item) => {
    const key = String(item.key || '')
    const label = String(item.label || '')
    const count = Math.max(0, num(item.count))
    if (!map.has(key)) map.set(key, { key, label, count })
    else map.get(key)!.count += count
  })
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'it', { sensitivity: 'base' }))
}


function buildOrderBy(sortField: SortField, sortDir: SortDir): string {
  const dir = sortDir === 'DESC' ? 'DESC' : 'ASC'
  switch (sortField) {
    case 'descrizione':
      return `descrizione ${dir}, codice_voce ASC`
    case 'unita_misura':
      return `unita_misura ${dir}, codice_voce ASC`
    case 'prezzo_unitario':
      return `prezzo_unitario ${dir}, codice_voce ASC`
    case 'codice_voce':
    default:
      return `codice_voce ${dir}`
  }
}

function nextSort(currentField: SortField, currentDir: SortDir, field: Exclude<SortField, 'DEFAULT'>): { field: SortField, dir: SortDir } {
  if (currentField !== field) return { field, dir: 'ASC' }
  return { field, dir: currentDir === 'ASC' ? 'DESC' : 'ASC' }
}

function sortIndicator(currentField: SortField, currentDir: SortDir, field: Exclude<SortField, 'DEFAULT'>): string {
  if (currentField !== field) return '↕'
  return currentDir === 'ASC' ? '▲' : '▼'
}

const styles = `
.gcp { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; }
.gcp-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; }
.gcp-toolbar { display:grid; grid-template-columns: minmax(0, var(--gcp-left-col, 25%)) var(--gcp-split-col, 12px) minmax(0, var(--gcp-center-col, 45%)) var(--gcp-split-col, 12px) minmax(0, var(--gcp-right-col, 30%)); gap:0; align-items:end; column-gap:0; }
.gcp-grid-left { grid-column:1; min-width:0; }
.gcp-grid-center { grid-column:3; min-width:0; }
.gcp-grid-right { grid-column:5; min-width:0; }
.gcp-split-spacer { grid-column:auto; width:100%; min-width:0; }
.gcp-field { display:flex; flex-direction:column; gap:3px; min-width:0; width:100%; }
.gcp-label { font-size:11px; font-weight:700; color:#1F4E79; }
.gcp-input, .gcp-select { width:100%; height:40px; min-height:40px; padding:8px 10px; border:1px solid #aac4e0; border-radius:6px; font-size:13px; line-height:22px; box-sizing:border-box; background:#fff; }
.gcp-search-wrap { position:relative; width:100%; min-width:0; display:block; }
.gcp-input.gcp-search-input { display:block; width:100%; min-width:0; padding-right:40px; }
.gcp-clear-btn { position:absolute; right:6px; top:50%; transform:translateY(-50%); width:28px; height:28px; min-height:28px; border:none; background:transparent; color:#6d88a6; border-radius:999px; cursor:pointer; font-size:18px; line-height:1; display:inline-flex; align-items:center; justify-content:center; padding:0; }
.gcp-clear-btn:hover { background:#eef5fd; color:#1F4E79; }
.gcp-clear-btn:focus { outline:none; box-shadow:0 0 0 2px rgba(31,78,121,0.18); }
.gcp-msg { padding:7px 12px; border-radius:6px; font-size:12px; font-weight:700; }
.gcp-msg-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
.gcp-msg-ok { background:#e2efda; color:#375623; border:1px solid #b8d4b0; }
.gcp-layout { flex:1; min-height:0; display:grid; grid-template-columns: minmax(0, var(--gcp-left-col, 25%)) var(--gcp-split-col, 12px) minmax(0, var(--gcp-center-col, 45%)) var(--gcp-split-col, 12px) minmax(0, var(--gcp-right-col, 30%)); gap:0; column-gap:0; align-items:stretch; }
.gcp-panel { min-height:0; border:1px solid #c5d9f1; border-radius:8px; background:#fff; display:flex; flex-direction:column; overflow:hidden; }
.gcp-panel-head { padding:10px 12px; background:#f5f9ff; border-bottom:1px solid #dbe7f4; font-weight:700; color:#1F4E79; border-top-left-radius:8px; border-top-right-radius:8px; }
.gcp-panel-body { border-bottom-left-radius:8px; border-bottom-right-radius:8px; }
.gcp-col-resizer { position:relative; width:100%; min-width:0; cursor:col-resize; user-select:none; touch-action:none; }
.gcp-col-resizer::before { content:''; position:absolute; top:0; bottom:0; left:50%; transform:translateX(-50%); width:2px; background:#c5d9f1; border-radius:999px; }
.gcp-col-resizer:hover::before, .gcp-col-resizer.dragging::before { background:#3d77c9; }
.gcp-col-resizer::after { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:8px; height:56px; border-radius:999px; background:rgba(61,119,201,0.08); }
.gcp-col-resizer:hover::after, .gcp-col-resizer.dragging::after { background:rgba(61,119,201,0.18); }
.gcp-panel-head-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.gcp-panel-head-actions { display:flex; align-items:center; gap:6px; }
.gcp-reset-btn { width:28px; height:28px; border:1px solid #aac4e0; background:#fff; color:#8aa4bf; border-radius:999px; cursor:default; font-size:15px; line-height:1; display:inline-flex; align-items:center; justify-content:center; opacity:0.75; }
.gcp-reset-btn.active { background:#1F4E79; color:#fff; border-color:#1F4E79; cursor:pointer; opacity:1; }
.gcp-reset-btn.active:hover { background:#295f92; border-color:#295f92; }
.gcp-reset-btn:disabled { pointer-events:none; }
.gcp-panel-body { flex:1; min-height:0; overflow:auto; }
.gcp-panel-body-pad { padding:8px; }
.gcp-tree-root { padding:8px; display:flex; flex-direction:column; gap:4px; }
.gcp-tree-row { display:grid; gap:6px; align-items:center; }
.gcp-tree-row.family { grid-template-columns: 1fr auto; }
.gcp-tree-row.cap { grid-template-columns: 1fr auto; }
.gcp-tree-btn { width:100%; text-align:left; border:none; background:transparent; padding:8px 10px; border-radius:6px; cursor:pointer; display:flex; justify-content:space-between; gap:8px; color:#123; }
.gcp-tree-btn:hover { background:#eef5ff; }
.gcp-tree-btn.active { background:#1F4E79; color:#fff; }
.gcp-tree-plain { width:100%; border:none; background:transparent; text-align:left; padding:8px 10px; border-radius:6px; cursor:pointer; display:flex; justify-content:space-between; gap:8px; }
.gcp-tree-plain:hover { background:#eef5ff; }
.gcp-tree-plain.active { background:#1F4E79; color:#fff; }
.gcp-tree-toggle { width:34px; height:34px; border:none; background:transparent; border-radius:6px; cursor:pointer; color:#1F4E79; font-weight:700; }
.gcp-tree-toggle:hover { background:#eef5ff; }
.gcp-tree-level1 { margin-left:12px; padding-left:8px; border-left:2px solid #dbe7f4; display:flex; flex-direction:column; gap:4px; }
.gcp-tree-level2 { margin-left:12px; padding-left:8px; border-left:2px solid #edf3fb; display:flex; flex-direction:column; gap:4px; }
.gcp-chip { display:inline-flex; align-items:center; padding:2px 7px; border-radius:999px; font-size:11px; font-weight:700; background:#e8f1fb; color:#1F4E79; }
.gcp-chip.active { background:rgba(255,255,255,0.25); color:#fff; }
.gcp-list-table { width:100%; border-collapse:collapse; font-size:12px; }
.gcp-list-table th { position:sticky; top:0; z-index:1; background:#1F4E79; color:#fff; padding:8px; text-align:left; white-space:nowrap; }
.gcp-th-sort { cursor:pointer; user-select:none; }
.gcp-th-sort:hover { background:#295f92; }
.gcp-th-wrap { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.gcp-th-ind { font-size:11px; opacity:0.95; }
.gcp-list-table td { padding:8px; border-bottom:1px solid #e6eef7; vertical-align:middle; }
.gcp-list-table tbody tr:nth-child(odd) td { background:#f9fbff; }
.gcp-list-table tbody tr.sel td { background:#dfeefe; }
.gcp-list-row { cursor:pointer; }
.gcp-desc-short { display:block; white-space:nowrap; overflow:hidden; text-overflow:clip; line-height:1.25; }
.gcp-list-more { display:flex; justify-content:center; padding:10px; border-top:1px solid #e6eef7; background:#fbfdff; }
.gcp-list-more button { border:1px solid #aac4e0; background:#fff; color:#1F4E79; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:700; }
.gcp-empty { padding:16px; color:#6b7280; text-align:center; }
.gcp-detail { padding:12px; display:flex; flex-direction:column; gap:10px; }
.gcp-kv { display:grid; grid-template-columns: 110px 1fr; gap:6px 10px; font-size:12px; }
.gcp-kv div:nth-child(odd) { font-weight:700; }
.gcp-desc { white-space:pre-wrap; line-height:1.45; background:#f8fbff; border:1px solid #dbe7f4; border-radius:6px; padding:10px; }
.gcp-ana-wrap { width:100%; overflow-x:auto; overflow-y:visible; border:1px solid #dbe7f4; border-radius:6px; }
.gcp-ana-table { width:100%; min-width:1020px; border-collapse:collapse; font-size:11.5px; table-layout:auto; }
.gcp-ana-table th { background:#f5f9ff; color:#1F4E79; padding:6px; text-align:left; position:sticky; top:0; vertical-align:top; }
.gcp-ana-table td { padding:6px; border-bottom:1px solid #edf2f7; vertical-align:top; }
.gcp-ana-table .col-code { white-space:nowrap; min-width:180px; }
.gcp-ana-table .col-desc { min-width:360px; white-space:normal; }
.gcp-ana-table .col-cat { white-space:nowrap; min-width:120px; }
.gcp-ana-table .col-num { white-space:nowrap; min-width:110px; text-align:right; }
.gcp-muted { color:#6b7280; }
.gcp-toolbar-meta { display:flex; align-items:flex-end; justify-content:flex-end; justify-self:stretch; min-width:0; width:100%; overflow:visible; }
.gcp-toolbar-meta-inner { display:flex; align-items:center; justify-content:flex-end; gap:8px; width:100%; min-width:0; }
.gcp-toolbar-counter { display:block; width:100%; max-width:none; margin-left:0; color:#8fa7c0; text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:11.5px; line-height:1.2; font-weight:600; }
.gcp-cols-reset-btn { width:28px; height:28px; border:1px solid #aac4e0; background:#fff; color:#8aa4bf; border-radius:999px; cursor:default; font-size:15px; line-height:1; display:inline-flex; align-items:center; justify-content:center; opacity:0.75; flex:0 0 auto; }
.gcp-cols-reset-btn.active { background:#1F4E79; color:#fff; border-color:#1F4E79; cursor:pointer; opacity:1; }
.gcp-cols-reset-btn.active:hover { background:#295f92; border-color:#295f92; }
.gcp-cols-reset-btn:disabled { pointer-events:none; }
.gcp-path { padding:6px 0 2px; font-size:11px; color:#516273; }
.gcp-list-inline { display:flex; flex-direction:column; gap:4px; }
@media (max-width: 1380px) { .gcp-toolbar { grid-template-columns: minmax(0, var(--gcp-left-col, 25%)) var(--gcp-split-col, 12px) minmax(0, var(--gcp-center-col, 45%)) var(--gcp-split-col, 12px) minmax(0, var(--gcp-right-col, 30%)); } .gcp-layout { grid-template-columns: minmax(0, var(--gcp-left-col, 25%)) var(--gcp-split-col, 12px) minmax(0, var(--gcp-center-col, 45%)) var(--gcp-split-col, 12px) minmax(0, var(--gcp-right-col, 30%)); } }
@media (max-width: 1180px) { .gcp-toolbar { grid-template-columns: 1fr; } .gcp-layout { grid-template-columns: 1fr; } }
`

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const serviceUrl = String(cfg.serviceUrl || '').trim()
  const prezzariUrl = String(cfg.prezzariUrl || '').trim()
  const analisiUrl = String(cfg.analisiUrl || '').trim()
  const title = String(cfg.title || 'GII - Consultazione Prezzario')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = Number(cfg.sectionTitleFontSize || 12.5)
  const toolbarLabelColor = String(cfg.toolbarLabelColor || '#1F4E79')
  const toolbarLabelFontSize = Number(cfg.toolbarLabelFontSize || 11.5)
  const [leftColPct, centerColPct, rightColPct] = normalizeColumnPercents(cfg.leftColumnWidthPct, cfg.centerColumnWidthPct, cfg.rightColumnWidthPct)
  const defaultColumnPercents = React.useMemo<[number, number, number]>(() => [leftColPct, centerColPct, rightColPct], [leftColPct, centerColPct, rightColPct])
  const [columnPercents, setColumnPercents] = React.useState<[number, number, number]>(defaultColumnPercents)
  const [draggingSplitter, setDraggingSplitter] = React.useState<'LEFT_CENTER' | 'CENTER_RIGHT' | null>(null)
  const gridRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    setColumnPercents(defaultColumnPercents)
  }, [defaultColumnPercents])

  const panelHeadStyle: React.CSSProperties = { color: sectionTitleColor, fontSize: sectionTitleFontSize }
  const labelStyle: React.CSSProperties = { color: toolbarLabelColor, fontSize: toolbarLabelFontSize, fontWeight: 700 }
  const kvLabelStyle: React.CSSProperties = { color: sectionTitleColor, fontSize: Math.max(11.5, sectionTitleFontSize - 0.5), fontWeight: 700 }
  const layoutVars: React.CSSProperties = {
    ['--gcp-left-col' as any]: `${columnPercents[0].toFixed(2)}%`,
    ['--gcp-center-col' as any]: `${columnPercents[1].toFixed(2)}%`,
    ['--gcp-right-col' as any]: `${columnPercents[2].toFixed(2)}%`,
    ['--gcp-split-col' as any]: '12px'
  }
  const columnsDirty = Math.abs(columnPercents[0] - defaultColumnPercents[0]) > 0.05 || Math.abs(columnPercents[1] - defaultColumnPercents[1]) > 0.05 || Math.abs(columnPercents[2] - defaultColumnPercents[2]) > 0.05

  const [msg, setMsg] = React.useState<{ text: string, ok: boolean } | null>(null)
  const [loadingPrezzari, setLoadingPrezzari] = React.useState(false)
  const [loadingSummary, setLoadingSummary] = React.useState(false)
  const [loadingRows, setLoadingRows] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [loadingAnalisi, setLoadingAnalisi] = React.useState(false)
  const [prezzari, setPrezzari] = React.useState<PrezzarioRow[]>([])
  const [selectedCode, setSelectedCode] = React.useState('')
  const [summaryRows, setSummaryRows] = React.useState<SummaryRow[]>([])
  const [levelMode, setLevelMode] = React.useState<LevelMode>('STRUTTURA')
  const [sortField, setSortField] = React.useState<SortField>('codice_voce')
  const [sortDir, setSortDir] = React.useState<SortDir>('ASC')
  const [rows, setRows] = React.useState<VoceRow[]>([])
  const [listTotal, setListTotal] = React.useState(0)
  const [selectedFamiglia, setSelectedFamiglia] = React.useState('')
  const [selectedCapitolo, setSelectedCapitolo] = React.useState('')
  const [selectedSottocapitolo, setSelectedSottocapitolo] = React.useState('')
  const [expandedFamilies, setExpandedFamilies] = React.useState<Record<string, boolean>>({})
  const [expandedCapitoli, setExpandedCapitoli] = React.useState<Record<string, boolean>>({})
  const [search, setSearch] = React.useState('')
  const [selectedRow, setSelectedRow] = React.useState<VoceRow | null>(null)
  const [analisiRows, setAnalisiRows] = React.useState<AnalisiRow[]>([])

  const listReqRef = React.useRef(0)
  const summaryReqRef = React.useRef(0)
  const rowsRef = React.useRef<VoceRow[]>([])

  React.useEffect(() => {
    if (!msg) return
    const t = window.setTimeout(() => setMsg(null), 6000)
    return () => window.clearTimeout(t)
  }, [msg])

  React.useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const resetColumnPercents = React.useCallback(() => {
    setColumnPercents(defaultColumnPercents)
  }, [defaultColumnPercents])

  const startResize = React.useCallback((which: 'LEFT_CENTER' | 'CENTER_RIGHT') => (evt: React.MouseEvent<HTMLDivElement>) => {
    evt.preventDefault()
    evt.stopPropagation()
    const host = gridRef.current
    if (!host) return
    const startX = evt.clientX
    const startCols = [...columnPercents] as [number, number, number]
    const hostWidth = Math.max(host.getBoundingClientRect().width - 24, 300)
    const MIN_LEFT = 14
    const MIN_CENTER = 28
    const MIN_RIGHT = 16
    const clamp = (v: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, v))
    const round2 = (v: number) => Math.round(v * 100) / 100
    const onMove = (moveEvt: MouseEvent) => {
      const deltaPct = ((moveEvt.clientX - startX) / hostWidth) * 100
      if (which === 'LEFT_CENTER') {
        const maxLeft = 100 - startCols[2] - MIN_CENTER
        const nextLeft = clamp(startCols[0] + deltaPct, MIN_LEFT, maxLeft)
        const nextCenter = 100 - startCols[2] - nextLeft
        setColumnPercents([round2(nextLeft), round2(nextCenter), round2(startCols[2])])
      } else {
        const maxCenter = 100 - startCols[0] - MIN_RIGHT
        const nextCenter = clamp(startCols[1] + deltaPct, MIN_CENTER, maxCenter)
        const nextRight = 100 - startCols[0] - nextCenter
        setColumnPercents([round2(startCols[0]), round2(nextCenter), round2(nextRight)])
      }
    }
    const onUp = () => {
      setDraggingSplitter(null)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    setDraggingSplitter(which)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [columnPercents])

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
    setSelectedFamiglia('')
    setSelectedCapitolo('')
    setSelectedSottocapitolo('')
    setExpandedFamilies({})
    setExpandedCapitoli({})
    setRows([])
    setListTotal(0)
    setSelectedRow(null)
    setAnalisiRows([])
  }, [selectedCode])

  React.useEffect(() => {
    let cancel = false
    const reqId = ++summaryReqRef.current
    const run = async () => {
      if (!serviceUrl || !selectedCode) { setSummaryRows([]); return }
      setLoadingSummary(true)
      try {
        const rr = await querySummary(serviceUrl, selectedCode)
        if (cancel || summaryReqRef.current !== reqId) return
        setSummaryRows(rr)
      } catch (e: any) {
        if (!cancel && summaryReqRef.current === reqId) {
          setSummaryRows([])
          setMsg({ text: 'Errore caricamento struttura: ' + (e?.message ?? e), ok: false })
        }
      }
      if (!cancel && summaryReqRef.current === reqId) setLoadingSummary(false)
    }
    void run()
    return () => { cancel = true }
  }, [serviceUrl, selectedCode])

  const hierarchy = React.useMemo(() => buildHierarchy(summaryRows), [summaryRows])
  const treeTotal = React.useMemo(() => summaryRows.reduce((sum, r) => sum + num(r.count), 0), [summaryRows])

  const superItems = React.useMemo(() => {
    return hierarchy
      .map((f) => ({ key: f.famiglia, label: f.label, count: f.count }))
      .sort((a, b) => {
        const rank = famigliaSortRank(a.key) - famigliaSortRank(b.key)
        if (rank !== 0) return rank
        return a.label.localeCompare(b.label, 'it', { sensitivity: 'base' })
      })
  }, [hierarchy])
  const capitoliItems = React.useMemo(() => {
    const rows = selectedFamiglia
      ? hierarchy.filter((f) => f.famiglia === selectedFamiglia).flatMap((f) => f.children.map((c) => ({ key: c.capitolo, label: c.capitolo || '<nessuna>', count: c.count })))
      : hierarchy.flatMap((f) => f.children.map((c) => ({ key: c.capitolo, label: c.capitolo || '<nessuna>', count: c.count })))
    return uniqueSorted(rows)
  }, [hierarchy, selectedFamiglia])
  const subItems = React.useMemo(() => {
    const rows = hierarchy.flatMap((f) => {
      if (selectedFamiglia && f.famiglia !== selectedFamiglia) return []
      return f.children.flatMap((c) => {
        if (selectedCapitolo && c.capitolo !== selectedCapitolo) return []
        return c.children.map((s) => ({ key: s.sottocapitolo, label: s.sottocapitolo || '<nessuna>', count: s.count }))
      })
    })
    return uniqueSorted(rows)
  }, [hierarchy, selectedFamiglia, selectedCapitolo])

  const currentOrderBy = React.useMemo(() => buildOrderBy(sortField, sortDir), [sortField, sortDir])

  const loadListPage = React.useCallback(async (append: boolean) => {
    if (!serviceUrl || !selectedCode) { setRows([]); setListTotal(0); return }
    const reqId = ++listReqRef.current
    if (append) setLoadingMore(true)
    else setLoadingRows(true)

    const offset = append ? rowsRef.current.length : 0
    try {
      const res = await queryVociPage(serviceUrl, selectedCode, selectedFamiglia, selectedCapitolo, selectedSottocapitolo, search, offset, LIST_STEP, currentOrderBy)
      if (listReqRef.current !== reqId) return
      setRows((prev) => append ? [...prev, ...res.rows] : res.rows)
      setListTotal(res.total)
    } catch (e: any) {
      if (listReqRef.current === reqId) {
        setMsg({ text: 'Errore caricamento voci: ' + (e?.message ?? e), ok: false })
        if (!append) { setRows([]); setListTotal(0) }
      }
    } finally {
      if (listReqRef.current === reqId) {
        setLoadingRows(false)
        setLoadingMore(false)
      }
    }
  }, [serviceUrl, selectedCode, selectedFamiglia, selectedCapitolo, selectedSottocapitolo, search, currentOrderBy])

  React.useEffect(() => {
    void loadListPage(false)
  }, [serviceUrl, selectedCode, selectedFamiglia, selectedCapitolo, selectedSottocapitolo, search, currentOrderBy])

  React.useEffect(() => {
    let cancel = false
    const run = async () => {
      if (!analisiUrl || !selectedRow) { setAnalisiRows([]); return }
      setLoadingAnalisi(true)
      try {
        const rr = await queryAnalisi(analisiUrl, selectedRow, serviceUrl)
        if (!cancel) setAnalisiRows(rr)
      } catch {
        if (!cancel) setAnalisiRows([])
      }
      if (!cancel) setLoadingAnalisi(false)
    }
    void run()
    return () => { cancel = true }
  }, [analisiUrl, selectedRow?.codice_voce, selectedRow?.codice_prezzario])

  React.useEffect(() => {
    if (!rows.length) { setSelectedRow(null); return }
    if (!selectedRow || !rows.some((r) => voceKey(r) === voceKey(selectedRow))) setSelectedRow(rows[0])
  }, [rows, selectedRow])

  const selectedPrezzario = prezzari.find((p) => p.codice_prezzario === selectedCode) || null
  const hasMoreRows = rows.length < listTotal

  const clearSelection = React.useCallback(() => {
    setSelectedFamiglia('')
    setSelectedCapitolo('')
    setSelectedSottocapitolo('')
  }, [])

  const familyToggleKey = (famiglia: string) => `fam:${famiglia}`
  const capToggleKey = (famiglia: string, capitolo: string) => `cap:${famiglia}::${capitolo}`

  const toggleFamily = React.useCallback((famiglia: string) => {
    const key = familyToggleKey(famiglia)
    const willClose = !!expandedFamilies[key]
    setExpandedFamilies((m) => ({ ...m, [key]: !m[key] }))
    if (willClose && selectedFamiglia === famiglia) {
      setSelectedFamiglia(famiglia)
      setSelectedCapitolo('')
      setSelectedSottocapitolo('')
    }
  }, [expandedFamilies, selectedFamiglia])

  const selectFamily = React.useCallback((famiglia: string) => {
    const same = selectedFamiglia === famiglia && !selectedCapitolo && !selectedSottocapitolo
    const key = familyToggleKey(famiglia)
    if (same) {
      setExpandedFamilies((m) => ({ ...m, [key]: !m[key] }))
      setSelectedFamiglia(famiglia)
      setSelectedCapitolo('')
      setSelectedSottocapitolo('')
      return
    }
    setSelectedFamiglia(famiglia)
    setSelectedCapitolo('')
    setSelectedSottocapitolo('')
    setExpandedFamilies((m) => ({ ...m, [key]: true }))
  }, [selectedFamiglia, selectedCapitolo, selectedSottocapitolo])

  const toggleCapitoloNode = React.useCallback((famiglia: string, capitolo: string) => {
    const key = capToggleKey(famiglia, capitolo)
    const willClose = !!expandedCapitoli[key]
    setExpandedCapitoli((m) => ({ ...m, [key]: !m[key] }))
    if (willClose && selectedFamiglia === famiglia && selectedCapitolo === capitolo) {
      setSelectedFamiglia(famiglia)
      setSelectedCapitolo(capitolo)
      setSelectedSottocapitolo('')
    }
  }, [expandedCapitoli, selectedFamiglia, selectedCapitolo])

  const selectCapitoloNode = React.useCallback((famiglia: string, capitolo: string) => {
    const same = selectedFamiglia === famiglia && selectedCapitolo === capitolo && !selectedSottocapitolo
    const key = capToggleKey(famiglia, capitolo)
    if (same) {
      setExpandedCapitoli((m) => ({ ...m, [key]: !m[key] }))
      setSelectedFamiglia(famiglia)
      setSelectedCapitolo(capitolo)
      setSelectedSottocapitolo('')
      return
    }
    setSelectedFamiglia(famiglia)
    setSelectedCapitolo(capitolo)
    setSelectedSottocapitolo('')
    setExpandedFamilies((m) => ({ ...m, [familyToggleKey(famiglia)]: true }))
    setExpandedCapitoli((m) => ({ ...m, [key]: true }))
  }, [selectedFamiglia, selectedCapitolo, selectedSottocapitolo])

  const selectSottocapitoloNode = React.useCallback((famiglia: string, capitolo: string, sottocapitolo: string) => {
    const same = selectedFamiglia === famiglia && selectedCapitolo === capitolo && selectedSottocapitolo === sottocapitolo
    if (same) {
      setExpandedCapitoli((m) => ({ ...m, [capToggleKey(famiglia, capitolo)]: !m[capToggleKey(famiglia, capitolo)] }))
      setSelectedFamiglia(famiglia)
      setSelectedCapitolo(capitolo)
      setSelectedSottocapitolo(sottocapitolo)
      return
    }
    setSelectedFamiglia(famiglia)
    setSelectedCapitolo(capitolo)
    setSelectedSottocapitolo(sottocapitolo)
    setExpandedFamilies((m) => ({ ...m, [familyToggleKey(famiglia)]: true }))
    setExpandedCapitoli((m) => ({ ...m, [capToggleKey(famiglia, capitolo)]: true }))
  }, [selectedFamiglia, selectedCapitolo, selectedSottocapitolo])


  const applySort = React.useCallback((field: Exclude<SortField, 'DEFAULT'>) => {
    const next = nextSort(sortField, sortDir, field)
    setSortField(next.field)
    setSortDir(next.dir)
  }, [sortField, sortDir])

  const resetSort = React.useCallback(() => {
    setSortField('codice_voce')
    setSortDir('ASC')
  }, [])

  const isSortModified = !(sortField === 'codice_voce' && sortDir === 'ASC')

  const selectionPath = React.useMemo(() => {
    const parts = [] as string[]
    if (selectedFamiglia) parts.push(famigliaLabel(selectedFamiglia))
    if (selectedCapitolo) parts.push(selectedCapitolo || '<nessuna>')
    if (selectedSottocapitolo) parts.push(selectedSottocapitolo || '<nessuna>')
    return parts.join(' › ')
  }, [selectedFamiglia, selectedCapitolo, selectedSottocapitolo])

  const renderFlatList = (items: Array<{ key: string, label: string, count: number }>, type: LevelMode) => (
    <div className='gcp-list-inline'>
      <button className={`gcp-tree-plain ${!selectedFamiglia && !selectedCapitolo && !selectedSottocapitolo ? 'active' : ''}`} onClick={clearSelection}>
        <span>Tutte le voci</span>
        <span className={`gcp-chip ${!selectedFamiglia && !selectedCapitolo && !selectedSottocapitolo ? 'active' : ''}`}>{treeTotal.toLocaleString('it-IT')}</span>
      </button>
      {items.map((item) => {
        const active = type === 'SUPER'
          ? (selectedFamiglia === item.key && !selectedCapitolo && !selectedSottocapitolo)
          : type === 'CAPITOLI'
            ? (selectedCapitolo === item.key && !selectedSottocapitolo)
            : (selectedSottocapitolo === item.key)
        const onClick = () => {
          if (type === 'SUPER') {
            if (selectedFamiglia === item.key && !selectedCapitolo && !selectedSottocapitolo) clearSelection()
            else { setSelectedFamiglia(item.key); setSelectedCapitolo(''); setSelectedSottocapitolo('') }
          } else if (type === 'CAPITOLI') {
            if (selectedCapitolo === item.key && !selectedSottocapitolo) setSelectedCapitolo('')
            else setSelectedCapitolo(item.key)
            if (!selectedFamiglia) setSelectedFamiglia(selectedFamiglia)
            setSelectedSottocapitolo('')
          } else {
            if (selectedSottocapitolo === item.key) setSelectedSottocapitolo('')
            else setSelectedSottocapitolo(item.key)
          }
        }
        return (
          <button key={item.key || '<vuoto>'} className={`gcp-tree-plain ${active ? 'active' : ''}`} onClick={onClick}>
            <span>{item.label || '<nessuna>'}</span>
            <span className={`gcp-chip ${active ? 'active' : ''}`}>{item.count.toLocaleString('it-IT')}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <Fragment>
      <style>{styles}</style>
      <div className='gcp' style={layoutVars}>
        <div className='gcp-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>
        {(!serviceUrl || !prezzariUrl) ? <div className='gcp-msg gcp-msg-err'>Configura gli URL delle tabelle nel setting del widget.</div> : null}
        {msg && <div className={`gcp-msg ${msg.ok ? 'gcp-msg-ok' : 'gcp-msg-err'}`}>{msg.text}</div>}

        <div className='gcp-toolbar'>
          <div className='gcp-field gcp-grid-left'>
            <div className='gcp-label' style={labelStyle}>Prezzario</div>
            <select className='gcp-select' value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)}>
              <option value=''>— seleziona —</option>
              {prezzari.map((p) => (
                <option key={p.objectid} value={p.codice_prezzario}>{`${p.codice_prezzario}${num(p.stato_prezzario) === 1 ? ' (attivo)' : ''}`}</option>
              ))}
            </select>
          </div>
          <div className='gcp-split-spacer' />
          <div className='gcp-field gcp-grid-center'>
            <div className='gcp-label' style={labelStyle}>Cerca</div>
            <div className='gcp-search-wrap'>
              <input className='gcp-input gcp-search-input' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='codice, descrizione, famiglia, capitolo, sottocapitolo…' />
              <button
                type='button'
                className='gcp-clear-btn'
                aria-label='Pulisci ricerca'
                title='Pulisci ricerca'
                onClick={() => setSearch('')}
                disabled={!search}
                style={!search ? { cursor: 'default', opacity: 0.45 } : undefined}
              >
                ×
              </button>
            </div>
          </div>
          <div className='gcp-split-spacer' />
          <div className='gcp-toolbar-meta gcp-grid-right' style={{ paddingBottom: 8 }}>
            <div className='gcp-toolbar-meta-inner'>
              <button
                type='button'
                className={`gcp-cols-reset-btn ${columnsDirty ? 'active' : ''}`}
                onClick={resetColumnPercents}
                disabled={!columnsDirty}
                title='Ripristina larghezze colonne'
                aria-label='Ripristina larghezze colonne'
              >
                <svg viewBox="0 0 18 16" width="14" height="14" aria-hidden="true" style={{ display: 'block' }}>
                  <rect x="1" y="2" width="3" height="12" rx="1" fill="currentColor" />
                  <rect x="7.5" y="2" width="3" height="12" rx="1" fill="currentColor" />
                  <rect x="14" y="2" width="3" height="12" rx="1" fill="currentColor" />
                </svg>
              </button>
              <span className='gcp-toolbar-counter' title={loadingPrezzari
                ? 'Caricamento prezzari…'
                : loadingSummary
                  ? 'Caricamento struttura…'
                  : loadingRows
                    ? 'Caricamento elenco…'
                    : `${rows.length.toLocaleString('it-IT')} / ${listTotal.toLocaleString('it-IT')} voci caricate`}>
                {loadingPrezzari
                  ? 'Caricamento prezzari…'
                  : loadingSummary
                    ? 'Caricamento struttura…'
                    : loadingRows
                      ? 'Caricamento elenco…'
                      : `${rows.length.toLocaleString('it-IT')} / ${listTotal.toLocaleString('it-IT')} voci caricate`}
              </span>
            </div>
          </div>
        </div>

        <div className='gcp-layout' ref={gridRef}>
          <div className='gcp-panel gcp-grid-left'>
            <div className='gcp-panel-head' style={panelHeadStyle}>Navigazione livelli</div>
            <div className='gcp-panel-body gcp-panel-body-pad'>
              <div className='gcp-field' style={{ marginBottom: 8 }}>
                <select className='gcp-select' value={levelMode} onChange={(e) => setLevelMode(e.target.value as LevelMode)}>
                  <option value='STRUTTURA'>Struttura capitoli</option>
                  <option value='SUPER'>Super capitoli</option>
                  <option value='CAPITOLI'>Capitoli</option>
                  <option value='SUB'>Sub capitoli</option>
                </select>
              </div>
              <div className='gcp-path'>
                {selectionPath ? `Filtro corrente: ${selectionPath}` : 'Filtro corrente: tutte le voci'}
              </div>
              {levelMode === 'STRUTTURA' ? (
                <div className='gcp-tree-root'>
                  <button className={`gcp-tree-btn ${!selectedFamiglia && !selectedCapitolo && !selectedSottocapitolo ? 'active' : ''}`} onClick={clearSelection}>
                    <span>Lavori a MISURA</span>
                    <span className={`gcp-chip ${!selectedFamiglia && !selectedCapitolo && !selectedSottocapitolo ? 'active' : ''}`}>{treeTotal.toLocaleString('it-IT')}</span>
                  </button>
                  {hierarchy.map((fam) => {
                    const famKey = familyToggleKey(fam.famiglia)
                    const famExpanded = !!expandedFamilies[famKey]
                    const famActive = selectedFamiglia === fam.famiglia && !selectedCapitolo && !selectedSottocapitolo
                    return (
                      <div key={fam.famiglia || '<nessuna>'}>
                        <div className='gcp-tree-row family'>
                          <button className={`gcp-tree-btn ${famActive ? 'active' : ''}`} onClick={() => selectFamily(fam.famiglia)}>
                            <span>{fam.label}</span>
                            <span className={`gcp-chip ${famActive ? 'active' : ''}`}>{fam.count.toLocaleString('it-IT')}</span>
                          </button>
                          <button className='gcp-tree-toggle' onClick={() => toggleFamily(fam.famiglia)} aria-label='Espandi/collassa famiglia'>{famExpanded ? '−' : '+'}</button>
                        </div>
                        {famExpanded ? (
                          <div className='gcp-tree-level1'>
                            {fam.children.map((cap) => {
                              const capKey = capToggleKey(fam.famiglia, cap.capitolo)
                              const capExpanded = !!expandedCapitoli[capKey]
                              const capActive = selectedFamiglia === fam.famiglia && selectedCapitolo === cap.capitolo && !selectedSottocapitolo
                              return (
                                <div key={`${fam.famiglia}__${cap.capitolo || '<nessuna>'}`}>
                                  <div className='gcp-tree-row cap'>
                                    <button className={`gcp-tree-btn ${capActive ? 'active' : ''}`} onClick={() => selectCapitoloNode(fam.famiglia, cap.capitolo)}>
                                      <span>{cap.capitolo || '<nessuna>'}</span>
                                      <span className={`gcp-chip ${capActive ? 'active' : ''}`}>{cap.count.toLocaleString('it-IT')}</span>
                                    </button>
                                    <button className='gcp-tree-toggle' onClick={() => toggleCapitoloNode(fam.famiglia, cap.capitolo)} aria-label='Espandi/collassa capitolo'>{capExpanded ? '−' : '+'}</button>
                                  </div>
                                  {capExpanded ? (
                                    <div className='gcp-tree-level2'>
                                      {cap.children.map((sub) => {
                                        const subActive = selectedFamiglia === fam.famiglia && selectedCapitolo === cap.capitolo && selectedSottocapitolo === sub.sottocapitolo
                                        return (
                                          <button key={`${fam.famiglia}__${cap.capitolo}__${sub.sottocapitolo || '<nessuna>'}`} className={`gcp-tree-btn ${subActive ? 'active' : ''}`} onClick={() => selectSottocapitoloNode(fam.famiglia, cap.capitolo, sub.sottocapitolo)}>
                                            <span>{sub.sottocapitolo || '<nessuna>'}</span>
                                            <span className={`gcp-chip ${subActive ? 'active' : ''}`}>{sub.count.toLocaleString('it-IT')}</span>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : levelMode === 'SUPER' ? renderFlatList(superItems, 'SUPER') : levelMode === 'CAPITOLI' ? renderFlatList(capitoliItems, 'CAPITOLI') : renderFlatList(subItems, 'SUB')}
            </div>
          </div>

          <div className={`gcp-col-resizer ${draggingSplitter === 'LEFT_CENTER' ? 'dragging' : ''}`} onMouseDown={startResize('LEFT_CENTER')} title='Ridimensiona colonne sinistra e centrale' aria-hidden='true' />

          <div className='gcp-panel gcp-grid-center'>
            <div className='gcp-panel-head' style={panelHeadStyle}>
              <div className='gcp-panel-head-row'>
                <span>Elenco voci</span>
                <div className='gcp-panel-head-actions'>
                  <button
                    className={`gcp-reset-btn ${isSortModified ? 'active' : ''}`}
                    onClick={resetSort}
                    disabled={!isSortModified}
                    title='Ripristina ordinamento predefinito'
                    aria-label='Ripristina ordinamento predefinito'
                  >↺</button>
                </div>
              </div>
            </div>
            <div className='gcp-panel-body'>
              <table className='gcp-list-table'>
                <thead>
                  <tr>
                    <th className='gcp-th-sort' onClick={() => applySort('codice_voce')}><span className='gcp-th-wrap'><span>Tariffa</span><span className='gcp-th-ind'>{sortIndicator(sortField, sortDir, 'codice_voce')}</span></span></th>
                    <th className='gcp-th-sort' onClick={() => applySort('descrizione')}><span className='gcp-th-wrap'><span>Descrizione</span><span className='gcp-th-ind'>{sortIndicator(sortField, sortDir, 'descrizione')}</span></span></th>
                    <th className='gcp-th-sort' onClick={() => applySort('unita_misura')}><span className='gcp-th-wrap'><span>UM</span><span className='gcp-th-ind'>{sortIndicator(sortField, sortDir, 'unita_misura')}</span></span></th>
                    <th className='gcp-th-sort' onClick={() => applySort('prezzo_unitario')}><span className='gcp-th-wrap'><span>Prezzo</span><span className='gcp-th-ind'>{sortIndicator(sortField, sortDir, 'prezzo_unitario')}</span></span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={4} className='gcp-empty'>{loadingRows ? 'Caricamento…' : 'Nessuna voce.'}</td></tr>
                  ) : rows.map((r) => (
                    <tr key={voceKey(r)} className={`gcp-list-row ${voceKey(selectedRow) === voceKey(r) ? 'sel' : ''}`} onClick={() => setSelectedRow(r)}>
                      <td><b>{r.codice_voce}</b><div className='gcp-muted'>{famigliaLabel(r.famiglia)}</div></td>
                      <td title={r.descrizione || ''}><span className='gcp-desc-short'>{shortenMiddle(r.descrizione, 108, 34)}</span></td>
                      <td>{r.unita_misura || ''}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.15 }}>
                          <span className='gcp-muted' style={{ fontSize: 11 }}>{priceUnitLabel(r.unita_misura)}</span>
                          <span>{money(r.prezzo_unitario, 4)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMoreRows ? (
                <div className='gcp-list-more'>
                  <button onClick={() => { if (!loadingMore) void loadListPage(true) }}>
                    {loadingMore
                      ? 'Caricamento…'
                      : `Mostra altre ${Math.min(LIST_STEP, listTotal - rows.length).toLocaleString('it-IT')} voci caricate`}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className={`gcp-col-resizer ${draggingSplitter === 'CENTER_RIGHT' ? 'dragging' : ''}`} onMouseDown={startResize('CENTER_RIGHT')} title='Ridimensiona colonne centrale e destra' aria-hidden='true' />

          <div className='gcp-panel gcp-grid-right'>
            <div className='gcp-panel-head' style={panelHeadStyle}>Dettaglio voce</div>
            <div className='gcp-panel-body'>
              {!selectedRow ? <div className='gcp-empty'>Seleziona una voce.</div> : (
                <div className='gcp-detail'>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span className='gcp-chip'>{selectedRow.codice_voce}</span>
                    {selectedRow.famiglia ? <span className='gcp-chip'>{famigliaLabel(selectedRow.famiglia)}</span> : null}
                    {selectedRow.categoria_default ? <span className='gcp-chip'>{selectedRow.categoria_default}</span> : null}
                    {num(selectedRow.selezionabile) === 1 ? <span className='gcp-chip'>Selezionabile</span> : null}
                  </div>

                  <div className='gcp-kv'>
                    <div style={kvLabelStyle}>Prezzario</div><div>{selectedPrezzario?.titolo_prezzario || selectedCode}</div>
                    <div style={kvLabelStyle}>Anno</div><div>{selectedPrezzario?.anno_prezzario || ''}</div>
                    <div style={kvLabelStyle}>Super capitolo</div><div>{famigliaLabel(selectedRow.famiglia)}</div>
                    <div style={kvLabelStyle}>Capitolo</div><div>{selectedRow.capitolo || '—'}</div>
                    <div style={kvLabelStyle}>Sottocapitolo</div><div>{selectedRow.sottocapitolo || '—'}</div>
                    <div style={kvLabelStyle}>Unità misura</div><div>{selectedRow.unita_misura || '—'}</div>
                    <div style={kvLabelStyle}>Prezzo</div><div><span className='gcp-muted' style={{ marginRight: 6 }}>{priceUnitLabel(selectedRow.unita_misura)}</span>{money(selectedRow.prezzo_unitario, 4)}</div>
                    <div style={kvLabelStyle}>Stato</div><div>{num(selectedRow.attivo) === 1 ? 'Attivo' : 'Disattivo'}</div>
                    <div style={kvLabelStyle}>Importato il</div><div>{fmtDate(selectedPrezzario?.data_import) || '—'}</div>
                  </div>

                  <div>
                    <div className='gcp-label' style={{ ...panelHeadStyle, marginBottom: 6 }}>Descrizione completa</div>
                    <div className='gcp-desc'>{selectedRow.descrizione || '—'}</div>
                  </div>

                  {analisiUrl ? (
                    <div>
                      <div className='gcp-label' style={{ ...panelHeadStyle, marginBottom: 6 }}>Analisi collegata {loadingAnalisi ? '(caricamento...)' : analisiRows.length ? `(${analisiRows.length} ${analisiRows.length === 1 ? 'articolo' : 'articoli'})` : ''}</div>
                      {!analisiRows.length ? (
                        <div className='gcp-muted'>{loadingAnalisi ? 'Caricamento…' : 'Nessuna analisi trovata per questa voce.'}</div>
                      ) : (
                        <div className='gcp-ana-wrap'>
                          <table className='gcp-ana-table'>
                            <thead>
                              <tr>
                                <th className='col-code'>Articolo</th>
                                <th className='col-desc'>Descrizione</th>
                                <th className='col-cat'>Cat.</th>
                                <th className='col-num'>Q.tà</th>
                                <th className='col-num'>Prezzo</th>
                                <th className='col-num'>Importo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analisiRows.map((a, idx) => (
                                <tr key={a.objectid || idx}>
                                  <td className='col-code'>{a.codice_elemento || ''}</td>
                                  <td className='col-desc'>{a.descrizione_elemento || ''}</td>
                                  <td className='col-cat'>{a.categoria_costo || ''}</td>
                                  <td className='col-num'>{a.quantita != null ? money(a.quantita, 4) : ''}</td>
                                  <td className='col-num'>{a.prezzo_unitario != null ? money(a.prezzo_unitario, 4) : ''}</td>
                                  <td className='col-num'>{a.importo != null ? money(a.importo, 4) : ''}</td>
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

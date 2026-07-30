/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, css, type AllWidgetProps } from 'jimu-core'
import { createPortal } from 'react-dom'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import type { IMConfig } from '../config'
import { defaultConfig, type MapSearchConfig, type SearchFieldConfig } from '../config'

type Props = AllWidgetProps<IMConfig>
type Option = { value: string; label: string; raw: any }
type QueryStatus = { kind: 'idle' | 'loading' | 'ok' | 'warn' | 'err'; text: string }

const LAYER_CACHE: Record<string, Promise<any>> = {}

const ARTICOLI_PRATICA = [
  { id: 'v_art08', label: 'Art. 8 - Violazione servizio di reperibilità', whereClause: 'v_art08 = 1' },
  { id: 'v_art12', label: 'Art. 12 - Negato accesso ai fondi (al personale consortile)', whereClause: 'v_art12 = 1' },
  { id: 'norma15', label: 'Art. 15 - Prelievo abusivo d’acqua', whereClause: "(norma15_parziale IS NOT NULL AND norma15_parziale <> '' OR norma15_totale IS NOT NULL AND norma15_totale <> '')" },
  { id: 'norma16', label: 'Art. 16 - Presentazione tardiva comunicazione di irrigazione', whereClause: "norma16_17 = 'Art16'" },
  { id: 'norma17', label: 'Art. 17 - Presentazione tardiva comunicazione di variazione o di rinuncia', whereClause: "norma16_17 = 'Art17'" },
  { id: 'v_art27', label: 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica', whereClause: 'v_art27 = 1' },
  { id: 'v_art28', label: 'Art. 28 - Violazione prescrizioni del consorzio', whereClause: 'v_art28 = 1' },
  { id: 'v_art29', label: 'Art. 29 - Violazione termini restituzione attrezzature', whereClause: 'v_art29 = 1' },
  { id: 'v_art30', label: 'Art. 30 - Danneggiamento e/o perdita attrezzature', whereClause: 'v_art30 = 1' },
  { id: 'v_art31', label: 'Art. 31 - Mancata segnalazione guasti', whereClause: 'v_art31 = 1' },
  { id: 'v_art32', label: 'Art. 32 - Negato accesso ai fondi (al consorziato)', whereClause: 'v_art32 = 1' },
  { id: 'v_art33', label: 'Art. 33 - Inosservanza limiti temporali di prelievo', whereClause: 'v_art33 = 1' },
  { id: 'v_art34', label: 'Art. 34 - Interferenze', whereClause: 'v_art34 = 1' },
  { id: 'v_art35', label: 'Art. 35 - Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante', whereClause: 'v_art35 = 1' },
  { id: 'v_art36', label: 'Art. 36 - Uso attrezzature non autorizzate', whereClause: 'v_art36 = 1' },
  { id: 'v_art37', label: 'Art. 37 - Uso sistemi di irrigazione incompatibili', whereClause: 'v_art37 = 1' },
  { id: 'v_art39', label: 'Art. 39 - Danni alle strutture irrigue', whereClause: 'v_art39 = 1' },
]

type TipoPratica = '' | 'rilevazione' | 'rapporto' | 'accertamento' | 'verbale'

type PraticaValues = {
  nominativo: string
  cfPiva: string
  tipoPratica: TipoPratica
  numeroPratica: string
  articolo: string
}

const PRATICA_EMPTY: PraticaValues = { nominativo: '', cfPiva: '', tipoPratica: '', numeroPratica: '', articolo: '' }

function sqlEscapePratica(v: string): string { return v.replace(/'/g, "''") }

function buildNominativoClause(raw: string): string | null {
  const words = raw.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  return words.map(w => {
    const esc = sqlEscapePratica(w.toUpperCase())
    return `(UPPER(nome) LIKE '%${esc}%' OR UPPER(cognome) LIKE '%${esc}%' OR UPPER(ragione_sociale) LIKE '%${esc}%')`
  }).join(' AND ')
}

function buildCfPivaClause(raw: string): string | null {
  const v = sqlEscapePratica(raw.trim().toUpperCase().replace(/\s+/g, ''))
  if (!v) return null
  return `(UPPER(codice_fiscale) LIKE '%${v}%' OR UPPER(piva) LIKE '%${v}%')`
}

function parseRilevazioneCode(raw: string): { oid: number | null; origine: number | null; settore: string | null } {
  const parts = raw.trim().split('-')
  const oidN = parts[0] ? parseInt(parts[0], 10) : NaN
  const oid = !isNaN(oidN) ? oidN : null
  let origine: number | null = null
  let settore: string | null = null
  if (parts[1]) { const r = parts[1].toUpperCase(); if (r === 'TR') origine = 1; else if (r === 'TI') origine = 2 }
  if (parts[2]) settore = parts[2].toUpperCase()
  return { oid, origine, settore }
}

function buildNumeroPraticaClause(tipo: TipoPratica, raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (tipo === 'rilevazione') {
    const { oid, origine, settore } = parseRilevazioneCode(v)
    if (!oid) return null
    const parts = [`OBJECTID = ${oid}`]
    if (origine !== null) parts.push(`origine_pratica = ${origine}`)
    if (settore) parts.push(`settore_cod = '${sqlEscapePratica(settore)}'`)
    return parts.join(' AND ')
  }
  if (tipo === 'rapporto') { const n = /^R-/i.test(v) ? v : `R-${v}`; return `numero_rapporto_tecnico = '${sqlEscapePratica(n)}'` }
  if (tipo === 'accertamento' || tipo === 'verbale') { const n = /^A-/i.test(v) ? v : `A-${v}`; return `accertamento_numero = '${sqlEscapePratica(n)}'` }
  return null
}

function buildWherePratica(pv: PraticaValues): { where: string | null; hasUserCriteria: boolean } {
  const clauses: string[] = []
  const nomClause = buildNominativoClause(pv.nominativo)
  if (nomClause) clauses.push(nomClause)
  const cfClause = buildCfPivaClause(pv.cfPiva)
  if (cfClause) clauses.push(cfClause)
  const numClause = buildNumeroPraticaClause(pv.tipoPratica, pv.numeroPratica)
  if (numClause) clauses.push(numClause)
  if (pv.articolo) { const art = ARTICOLI_PRATICA.find(a => a.id === pv.articolo); if (art) clauses.push(`(${art.whereClause})`) }
  if (!clauses.length) return { where: null, hasUserCriteria: false }
  return { where: ['req_point = 1', ...clauses].join(' AND '), hasUserCriteria: true }
}
const COLLATOR = new Intl.Collator('it', { numeric: true, sensitivity: 'base' })

function asJs<T = any>(v: any): T { return v?.asMutable ? v.asMutable({ deep: true }) : v }
function txt(v: any): string { return v === null || v === undefined ? '' : String(v) }
function bool(v: any, fb: boolean): boolean { return typeof v === 'boolean' ? v : fb }
function num(v: any, fb: number, min?: number, max?: number): number {
  let n = Number(v)
  if (!Number.isFinite(n)) n = fb
  if (typeof min === 'number') n = Math.max(min, n)
  if (typeof max === 'number') n = Math.min(max, n)
  return n
}
function normalizeUrl(raw: any): string {
  const s = txt(raw).trim()
  if (!s) return ''
  try {
    const u = new URL(s)
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch { return s.replace(/[?#].*$/, '').replace(/\/$/, '') }
}
function normalizeLayerUrl(raw: any, layerLayerId?: any): string {
  const base = normalizeUrl(raw)
  if (!base) return ''
  if (/\/(FeatureServer|MapServer)\/\d+$/i.test(base)) return base
  if (/\/(FeatureServer|MapServer)$/i.test(base)) return `${base}/${txt(layerLayerId).trim() || '0'}`
  return base
}
function compactKey(v: any): string { return txt(v).toLowerCase().replace(/[^a-z0-9]/g, '') }
function sqlEscape(v: any): string { return txt(v).replace(/'/g, "''") }

function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

async function getLayer(urlRaw: any, layerLayerId?: any): Promise<any> {
  const url = normalizeLayerUrl(urlRaw, layerLayerId)
  if (!url) throw new Error('URL del layer non configurato.')
  if (!LAYER_CACHE[url]) {
    LAYER_CACHE[url] = (async () => {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const layer = new FeatureLayer({ url, outFields: ['*'] })
      try { if (typeof layer.load === 'function') await layer.load() } catch {}
      return layer
    })()
  }
  return LAYER_CACHE[url]
}

function findField(layer: any, fieldName: string): any {
  const requested = txt(fieldName).trim()
  if (!requested) return null
  const fields = Array.isArray(layer?.fields) ? layer.fields : []
  if (!fields.length) return null
  const reqLower = requested.toLowerCase()
  const reqCompact = compactKey(requested)
  return fields.find((x: any) => txt(x?.name).toLowerCase() === reqLower) ||
    fields.find((x: any) => txt(x?.alias || x?.label).toLowerCase() === reqLower) ||
    fields.find((x: any) => compactKey(x?.name) === reqCompact || compactKey(x?.alias || x?.label) === reqCompact) || null
}
function resolveFieldName(layer: any, fieldName: string): string { return txt(findField(layer, fieldName)?.name || fieldName).trim() }
function hasResolvedField(layer: any, fieldName: string): boolean {
  const fields = Array.isArray(layer?.fields) ? layer.fields : []
  return !fields.length || !!findField(layer, fieldName)
}
function getLayerDisplayName(layer: any, search?: MapSearchConfig | null): string {
  return txt(search?.layerTitle || layer?.title || layer?.name || layer?.sourceJSON?.title || 'layer selezionato').trim() || 'layer selezionato'
}
function configuredSearchFields(search?: MapSearchConfig | null): SearchFieldConfig[] {
  return (search?.fields || []).filter(f => !!txt(f?.fieldName).trim())
}
function missingConfiguredFields(layer: any, search: MapSearchConfig): SearchFieldConfig[] {
  return configuredSearchFields(search).filter(f => !hasResolvedField(layer, f.fieldName))
}
function describeMissingFields(layer: any, search: MapSearchConfig, fields: SearchFieldConfig[]): string {
  const layerName = getLayerDisplayName(layer, search)
  const names = fields
    .map(f => f.label && f.label !== f.fieldName ? `${f.label} (${f.fieldName})` : f.fieldName)
    .filter(Boolean)
    .join(', ')
  return names
    ? `Nel layer "${layerName}" non sono presenti questi campi configurati: ${names}. Controlla la ricerca nel setting.`
    : `La ricerca "${search?.title || 'selezionata'}" non ha campi validi configurati. Controlla il setting.`
}
function getFieldType(layer: any, fieldName: string): string {
  const fName = resolveFieldName(layer, fieldName)
  const f = (layer?.fields || []).find((x: any) => txt(x?.name).toLowerCase() === txt(fName).toLowerCase())
  return txt(f?.type || '').toLowerCase()
}
function getAttrCI(attrs: any, fieldName: string): any {
  if (!attrs || !fieldName) return undefined
  if (attrs[fieldName] !== undefined) return attrs[fieldName]
  const lc = txt(fieldName).toLowerCase()
  for (const k of Object.keys(attrs)) if (txt(k).toLowerCase() === lc) return attrs[k]
  return undefined
}

function optionLabel(v: any): string { return txt(v).trim() || '—' }
function sortOptions(options: Option[]): Option[] { return [...options].sort((a, b) => COLLATOR.compare(a.label, b.label)) }
function optionsFromFeatures(features: any[], fieldName: string): Option[] {
  const seen = new Set<string>()
  const out: Option[] = []
  ;(features || []).forEach((ft: any) => {
    const raw = getAttrCI(ft?.attributes || {}, fieldName)
    const label = optionLabel(raw)
    const key = label.toLowerCase()
    if (!label || label === '—' || seen.has(key)) return
    seen.add(key)
    out.push({ value: txt(raw).trim(), label, raw })
  })
  return sortOptions(out)
}
async function queryDistinctWithLayer(layer: any, fieldName: string, where: string, maxValues: number): Promise<Option[]> {
  const q = layer.createQuery()
  q.where = where || '1=1'
  q.outFields = [fieldName]
  q.returnGeometry = false
  q.returnDistinctValues = true
  q.num = Math.max(1, maxValues || 5000)
  q.orderByFields = [`${fieldName} ASC`]
  try {
    const res = await layer.queryFeatures(q)
    const opts = optionsFromFeatures(res?.features || [], fieldName)
    if (opts.length) return opts
  } catch {}
  try {
    q.orderByFields = []
    const res = await layer.queryFeatures(q)
    return optionsFromFeatures(res?.features || [], fieldName)
  } catch { return [] }
}
async function queryDistinctWithStatistics(layer: any, fieldName: string, where: string, maxValues: number): Promise<Option[]> {
  const q = layer.createQuery()
  q.where = where || '1=1'
  q.returnGeometry = false
  q.outFields = [fieldName]
  q.groupByFieldsForStatistics = [fieldName]
  q.outStatistics = [{ statisticType: 'count', onStatisticField: fieldName, outStatisticFieldName: 'GII_CNT' }]
  q.num = Math.max(1, maxValues || 5000)
  try {
    const res = await layer.queryFeatures(q)
    return optionsFromFeatures(res?.features || [], fieldName)
  } catch { return [] }
}
async function queryDistinctWithSamples(layer: any, fieldName: string, where: string, maxValues: number): Promise<Option[]> {
  const q = layer.createQuery()
  q.where = where || '1=1'
  q.outFields = [fieldName]
  q.returnGeometry = false
  q.num = Math.min(Math.max(100, maxValues || 5000), 5000)
  try {
    const res = await layer.queryFeatures(q)
    return optionsFromFeatures(res?.features || [], fieldName)
  } catch { return [] }
}
async function queryDistinct(layer: any, fieldName: string, where: string, maxValues: number): Promise<Option[]> {
  const f = resolveFieldName(layer, fieldName)
  if (!f) return []
  if (!hasResolvedField(layer, fieldName)) throw new Error(`Campo non trovato: ${fieldName}`)
  const methods = [
    () => queryDistinctWithLayer(layer, f, where, maxValues),
    () => queryDistinctWithStatistics(layer, f, where, maxValues),
    () => queryDistinctWithSamples(layer, f, where, maxValues)
  ]
  let lastError: any = null
  for (const run of methods) {
    try {
      const opts = await run()
      if (opts.length) return opts
    } catch (e) { lastError = e }
  }
  if (lastError) throw lastError
  return []
}

function isNumericType(type: string): boolean { return /integer|small-integer|double|single|oid|long|number/.test(type) }
function isDateType(type: string): boolean { return /date/.test(type) }
function sqlClause(layer: any, field: SearchFieldConfig, value: string): string | null {
  const fieldName = resolveFieldName(layer, field.fieldName)
  const val = txt(value).trim()
  if (!fieldName || !val) return null
  const type = getFieldType(layer, fieldName)
  if (isNumericType(type) || field.controlType === 'number') {
    const n = Number(val.replace(',', '.'))
    return Number.isFinite(n) ? `${fieldName} = ${n}` : null
  }
  if (isDateType(type) || field.controlType === 'date') {
    return `${fieldName} = DATE '${sqlEscape(val)}'`
  }
  const op = field.operator || 'equals'
  if (op === 'contains') return `UPPER(${fieldName}) LIKE '%${sqlEscape(val).toUpperCase()}%'`
  if (op === 'startsWith') return `UPPER(${fieldName}) LIKE '${sqlEscape(val).toUpperCase()}%'`
  return `${fieldName} = '${sqlEscape(val)}'`
}
function buildWhere(layer: any, fields: SearchFieldConfig[], values: Record<string, string>, untilIndex = fields.length): string {
  const clauses = fields
    .filter(f => !!txt(f?.fieldName).trim())
    .slice(0, untilIndex)
    .map(f => sqlClause(layer, f, values[f.id]))
    .filter(Boolean) as string[]
  return clauses.length ? clauses.join(' AND ') : '1=1'
}

function sameUrl(a: any, b: any, layerLayerId?: any): boolean {
  const aa = normalizeLayerUrl(a, layerLayerId).toLowerCase()
  const bb = normalizeLayerUrl(b, layerLayerId).toLowerCase()
  return !!aa && !!bb && aa === bb
}
function titleTokens(v: any): string[] {
  const s = txt(v).trim().toLowerCase()
  if (!s) return []
  return Array.from(new Set([s, ...s.split('/').map(x => x.trim()).filter(Boolean)]))
}
function collectMapLayers(view: any): any[] {
  const out: any[] = []
  const seen = new Set<any>()
  const push = (l: any) => {
    if (!l || seen.has(l)) return
    seen.add(l); out.push(l)
    try { l.layers?.forEach?.((child: any) => push(child)) } catch {}
    try { l.allSublayers?.forEach?.((child: any) => push(child)) } catch {}
    try { l.sublayers?.forEach?.((child: any) => push(child)) } catch {}
  }
  try { view?.map?.allLayers?.forEach?.((l: any) => push(l)) } catch {}
  try { view?.map?.layers?.forEach?.((l: any) => push(l)) } catch {}
  return out
}
function findMapLayer(view: any, search: MapSearchConfig): any {
  const url = normalizeLayerUrl(search.layerUrl, search.layerLayerId)
  const rawTitle = txt(search.layerTitle).trim().toLowerCase()
  const titles = titleTokens(search.layerTitle)
  const layerId = txt(search.layerId).trim()
  const layerLayerId = txt(search.layerLayerId).trim()
  const layers = collectMapLayers(view)
  if (layerId) {
    const byId = layers.find(l => txt(l?.id).trim() === layerId || txt(l?.portalItem?.id).trim() === layerId || txt(l?.itemId).trim() === layerId)
    if (byId) return byId
  }
  if (url) {
    const byUrl = layers.find(l => sameUrl(l?.url, url, layerLayerId) || sameUrl(l?.sourceJSON?.url, url, layerLayerId))
    if (byUrl) return byUrl
  }
  if (layerLayerId) {
    const bySublayer = layers.find(l => txt(l?.layerId ?? l?.sourceLayerId ?? l?.sublayerId ?? '').trim() === layerLayerId)
    if (bySublayer && (!rawTitle || titles.some(t => txt(bySublayer?.title).trim().toLowerCase() === t || txt(bySublayer?.title).trim().toLowerCase().includes(t)))) return bySublayer
  }
  if (titles.length) {
    const byTitle = layers.find(l => titles.some(t => txt(l?.title).trim().toLowerCase() === t))
    if (byTitle) return byTitle
    return layers.find(l => {
      const lt = txt(l?.title).trim().toLowerCase()
      return titles.some(t => lt.includes(t) || t.includes(lt))
    }) || null
  }
  return null
}
async function getConfiguredLayer(mapView: any, search: MapSearchConfig): Promise<any> {
  // Cerca prima il layer nella mappa per preservare istanze filtrate (Tutte/Attive/Dismesse)
  const mapLayer = findMapLayer(mapView, search)
  if (mapLayer) {
    try { if (typeof mapLayer.load === 'function') await mapLayer.load() } catch {}
    if (typeof mapLayer.createQuery === 'function' && typeof mapLayer.queryFeatures === 'function') {
      if (Array.isArray(mapLayer?.fields) && mapLayer.fields.length > 0) return mapLayer
    }
    const mapUrl = normalizeLayerUrl(mapLayer?.url || mapLayer?.sourceJSON?.url || '', search.layerLayerId || mapLayer?.layerId || mapLayer?.sourceLayerId || mapLayer?.sublayerId)
    if (mapUrl) return getLayer(mapUrl)
  }
  // Fallback: crea layer dall'URL configurato
  if (search.layerUrl) return getLayer(search.layerUrl, search.layerLayerId)
  return null
}

function colorToRgba(raw: any, transparency: number, fallback: [number, number, number]): [number, number, number, number] {
  const value = txt(raw).trim()
  let rgb: [number, number, number] = fallback
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(ch => ch + ch).join('') : hex[1]
    rgb = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  } else {
    const m = value.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i)
    if (m) rgb = [Number(m[1]), Number(m[2]), Number(m[3])].map(v => Math.max(0, Math.min(255, v))) as [number, number, number]
  }
  const alpha = 1 - num(transparency, 0, 0, 100) / 100
  return [rgb[0], rgb[1], rgb[2], alpha]
}

function getGraphicSymbol(geometry: any, cfg: any): any {
  const type = txt(geometry?.type).toLowerCase()
  const pointColor = colorToRgba(cfg.pointColor, num(cfg.pointTransparency, 0, 0, 100), [220, 38, 38])
  const pointOutlineColor = colorToRgba(cfg.pointOutlineColor, 0, [255, 255, 255])
  const polygonFillColor = colorToRgba(cfg.polygonFillColor, num(cfg.polygonFillTransparency, 88, 0, 100), [255, 100, 0])
  const polygonOutlineColor = colorToRgba(cfg.polygonOutlineColor, 0, [255, 100, 0])

  if (type === 'point' || type === 'multipoint') {
    return {
      type: 'simple-marker',
      style: 'circle',
      size: num(cfg.pointSize, 18, 1, 64),
      color: pointColor,
      outline: { color: pointOutlineColor, width: num(cfg.pointOutlineWidth, 2.5, 0, 12) }
    }
  }
  if (type === 'polyline') {
    return { type: 'simple-line', color: polygonOutlineColor, width: num(cfg.polygonOutlineWidth, 2, 0, 12) }
  }
  return {
    type: 'simple-fill',
    color: polygonFillColor,
    outline: { color: polygonOutlineColor, width: num(cfg.polygonOutlineWidth, 2, 0, 12) }
  }
}
function formatResultCount(n: number): string { return n.toLocaleString('it-IT') }

function normalizeSearches(cfg: any): MapSearchConfig[] {
  const raw = asJs<any[]>(cfg?.searches || [])
  if (Array.isArray(raw) && raw.length) return raw as any
  return []
}

type SearchableFilterProps = { value: string; options: Option[]; disabled?: boolean; placeholder: string; required?: boolean; onChange: (value: string) => void }
function SearchableFilter(props: SearchableFilterProps) {
  const { value, options, disabled, placeholder, required, onChange } = props
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [hoverKey, setHoverKey] = React.useState('')
  const [menuBox, setMenuBox] = React.useState({ left: 0, top: 0, width: 0, maxHeight: 220 })
  const allOptions = React.useMemo<Option[]>(() => {
    const base = Array.isArray(options) ? options : []
    if (required) return base
    return [{ value: '', label: placeholder, raw: null }, ...base]
  }, [options, placeholder, required])
  const selected = React.useMemo(() => allOptions.find(o => txt(o.value) === txt(value)) || null, [allOptions, value])
  const filteredOptions = React.useMemo(() => {
    const q = compactKey(query)
    if (!q) return allOptions
    return allOptions.filter(o => `${compactKey(o.label)} ${compactKey(o.value)}`.includes(q))
  }, [allOptions, query])
  const updateMenuBox = React.useCallback(() => {
    const input = inputRef.current
    if (!input) return
    const rect = input.getBoundingClientRect()
    const gap = 4
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 600
    const viewportW = window.innerWidth || document.documentElement.clientWidth || 900
    const below = Math.max(0, viewportH - rect.bottom - gap - 8)
    const above = Math.max(0, rect.top - gap - 8)
    const openAbove = below < 160 && above > below
    const maxHeight = Math.max(120, Math.min(260, openAbove ? above : below || 220))
    const left = Math.max(8, Math.min(rect.left, viewportW - rect.width - 8))
    const top = openAbove ? Math.max(8, rect.top - gap - maxHeight) : Math.min(viewportH - 8, rect.bottom + gap)
    setMenuBox({ left, top, width: rect.width, maxHeight })
  }, [])
  React.useEffect(() => {
    if (!open) return
    updateMenuBox()
    const onReposition = () => updateMenuBox()
    window.addEventListener('resize', onReposition, true)
    window.addEventListener('scroll', onReposition, true)
    return () => { window.removeEventListener('resize', onReposition, true); window.removeEventListener('scroll', onReposition, true) }
  }, [open, updateMenuBox])
  React.useEffect(() => {
    if (!open) return
    const onDown = (ev: MouseEvent) => {
      const target = ev.target as Node
      const wrap = wrapRef.current
      const menu = menuRef.current
      if ((wrap && wrap.contains(target)) || (menu && menu.contains(target))) return
      setOpen(false); setQuery(''); setHoverKey('')
    }
    window.addEventListener('mousedown', onDown, true)
    return () => window.removeEventListener('mousedown', onDown, true)
  }, [open])
  const selectOption = React.useCallback((opt: Option) => { onChange(txt(opt.value)); setQuery(''); setHoverKey(''); setOpen(false) }, [onChange])
  const shownValue = open ? query : txt(selected?.label || '')
  const menu = open && !disabled ? (
    <div ref={menuRef} style={{ position: 'fixed', left: menuBox.left, top: menuBox.top, width: menuBox.width, maxHeight: menuBox.maxHeight, overflowY: 'auto', padding: 4, border: '1px solid rgba(0, 0, 0, 0.14)', borderRadius: 10, background: '#fff', boxShadow: '0 12px 28px rgba(0, 0, 0, 0.22)', boxSizing: 'border-box', zIndex: 2147483000 }}>
      {filteredOptions.length === 0 && <div style={{ width: '100%', minHeight: 30, display: 'flex', alignItems: 'center', borderRadius: 8, color: 'rgba(0,0,0,0.42)', padding: '6px 8px', fontSize: 12, boxSizing: 'border-box' }}>Nessun risultato</div>}
      {filteredOptions.map(opt => {
        const key = `${opt.value}__${opt.label}`
        const active = txt(opt.value) === txt(value)
        const hover = hoverKey === key
        return <button key={key} type='button' onMouseEnter={() => setHoverKey(key)} onMouseLeave={() => setHoverKey('')} onMouseDown={e => { e.preventDefault(); selectOption(opt) }} title={opt.label} style={{ width: '100%', minHeight: 30, display: 'flex', alignItems: 'center', border: 0, borderRadius: 8, background: active || hover ? 'rgba(47,111,237,0.10)' : 'transparent', color: active || hover ? '#1d4ed8' : '#111827', padding: '6px 8px', fontSize: 14, lineHeight: 1.2, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box' }}>{opt.label}</button>
      })}
    </div>
  ) : null
  return (
    <div className='searchSelect' ref={wrapRef}>
      <input ref={inputRef} className='filterSelect searchInput' type='text' value={shownValue} placeholder={txt(selected?.label || placeholder)} disabled={disabled} autoComplete='off' onFocus={() => { if (disabled) return; setQuery(''); setOpen(true); window.setTimeout(updateMenuBox, 0) }} onChange={e => { if (disabled) return; setQuery(e.currentTarget.value); setOpen(true); window.setTimeout(updateMenuBox, 0) }} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery(''); setHoverKey('') }; if (e.key === 'Enter' && open && filteredOptions.length === 1) { e.preventDefault(); selectOption(filteredOptions[0]) } }} />
      <span className='searchSelectChevron'>▾</span>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}

export default function Widget(props: Props) {
  const cfg = { ...asJs<any>(defaultConfig), ...(asJs<any>(props.config) || {}) }
  const mapWidgetId = (asJs<string[]>(cfg.useMapWidgetIds || []) || [])[0] || ''
  const searches = React.useMemo(() => normalizeSearches(cfg), [props.config])
  const selectedInitial = txt(cfg.selectedSearchId || searches[0]?.id || '')

  const zoomAllaRicerca = bool(cfg.zoomAllaRicerca, true)
  const evidenziaRisultati = bool(cfg.evidenziaRisultati, true)
  const maxResultFeatures = num(cfg.maxResultFeatures, 500, 1, 5000)
  const maxDistinctValues = num(cfg.maxDistinctValues, 5000, 50, 20000)
  const zoomScale = num(cfg.zoomScale, 2500, 0, 500000)

  const [activeSearchId, setActiveSearchId] = React.useState(selectedInitial)
  const activeSearch = searches.find(s => s.id === activeSearchId) || searches[0] || null
  const [mapView, setMapView] = React.useState<any>(null)
  const [layer, setLayer] = React.useState<any>(null)
  const [layerForSearchId, setLayerForSearchId] = React.useState<string>('')
  const [status, setStatus] = React.useState<QueryStatus>({ kind: 'idle', text: 'Configura almeno una ricerca per avviare il widget.' })
  const [busy, setBusy] = React.useState(false)
  const [values, setValues] = React.useState<Record<string, Record<string, string>>>({})
  const [fieldOptions, setFieldOptions] = React.useState<Record<string, Option[]>>({})
  const [fieldLoading, setFieldLoading] = React.useState<Record<string, boolean>>({})
  const requestRef = React.useRef(0)
  const highlightRef = React.useRef<any>(null)
  const graphicIdsRef = React.useRef<any[]>([])

  React.useEffect(() => {
    if (!activeSearchId && searches[0]?.id) setActiveSearchId(searches[0].id)
    if (activeSearchId && !searches.some(s => s.id === activeSearchId)) setActiveSearchId(searches[0]?.id || '')
  }, [searches, activeSearchId])

  const clearHighlight = React.useCallback(() => {
    try { highlightRef.current?.remove?.() } catch {}
    highlightRef.current = null
    try {
      if (mapView && graphicIdsRef.current.length) {
        const ids = new Set(graphicIdsRef.current)
        const toRemove: any[] = []
        mapView.graphics?.forEach?.((g: any) => { if (ids.has(g?.attributes?.__giiRicercheMappaId)) toRemove.push(g) })
        if (toRemove.length) mapView.graphics?.removeMany?.(toRemove)
      }
    } catch {}
    graphicIdsRef.current = []
  }, [mapView])

  React.useEffect(() => () => { try { highlightRef.current?.remove?.() } catch {} }, [])

  React.useEffect(() => {
    let cancelled = false
    const req = ++requestRef.current
    setLayer(null)
    setFieldOptions({})
    clearHighlight()
    if (!activeSearch) {
      setStatus({ kind: 'warn', text: 'Nessuna ricerca configurata.' })
      return
    }
    if (!activeSearch.layerUrl && !activeSearch.layerTitle && !activeSearch.layerId) {
      setStatus({ kind: 'warn', text: 'Selezionare un layer per la ricerca nel setting.' })
      return
    }
    ;(async () => {
      try {
        setBusy(true)
        setStatus({ kind: 'loading', text: `Caricamento ${activeSearch.title || 'ricerca'}...` })
        const fl = await getConfiguredLayer(mapView, activeSearch)
        if (cancelled || req !== requestRef.current) return
        setLayer(fl)
        setLayerForSearchId(activeSearch.id)
        setStatus({ kind: 'idle', text: '' })
      } catch (e: any) {
        if (!cancelled) setStatus({ kind: 'err', text: `Errore caricamento layer: ${e?.message || String(e)}` })
      } finally { if (!cancelled) setBusy(false) }
    })()
    return () => { cancelled = true }
  }, [activeSearch?.id, activeSearch?.layerUrl, activeSearch?.layerTitle, activeSearch?.layerId, activeSearch?.layerLayerId, mapView, clearHighlight])

  const activeValues = values[activeSearch?.id || ''] || {}
  React.useEffect(() => {
    if (!layer || !activeSearch) return
    // Guard: evita di usare un layer di una ricerca precedente
    if (layerForSearchId !== activeSearch.id) return
    let cancelled = false
    const req = ++requestRef.current
    ;(async () => {
      const newOptions: Record<string, Option[]> = {}
      const loadingPatch: Record<string, boolean> = {}
      try {
        const configuredFields = configuredSearchFields(activeSearch)
        for (let i = 0; i < configuredFields.length; i++) {
          const f = configuredFields[i]
          if (f.controlType !== 'combo') continue
          loadingPatch[f.id] = true
          setFieldLoading(prev => ({ ...prev, ...loadingPatch }))
          if (!hasResolvedField(layer, f.fieldName)) {
            if (!cancelled) {
              setFieldOptions(prev => ({ ...prev, [f.id]: [] }))
              setStatus({ kind: 'warn', text: describeMissingFields(layer, activeSearch, [f]) })
            }
            continue
          }
          const until = f.cascade === false ? 0 : i
          const where = buildWhere(layer, configuredFields, activeValues, until)
          const opts = await queryDistinct(layer, f.fieldName, where, maxDistinctValues)
          if (cancelled || req !== requestRef.current) return
          newOptions[f.id] = opts
          setFieldOptions(prev => ({ ...prev, [f.id]: opts }))
          setFieldLoading(prev => ({ ...prev, [f.id]: false }))
        }
      } catch (e: any) {
        if (!cancelled) setStatus({ kind: 'err', text: `Errore caricamento valori ricerca: ${e?.message || String(e)}` })
      } finally {
        if (!cancelled) setFieldLoading(prev => {
          const next = { ...prev }
          configuredSearchFields(activeSearch).forEach(f => { next[f.id] = false })
          return next
        })
      }
    })()
    return () => { cancelled = true }
  }, [layer, layerForSearchId, activeSearch?.id, JSON.stringify(activeSearch?.fields || []), JSON.stringify(activeValues), maxDistinctValues])

  const setFieldValue = (fieldId: string, value: string) => {
    if (!activeSearch) return
    setValues(prev => {
      const current = { ...(prev[activeSearch.id] || {}) }
      current[fieldId] = value
      const idx = activeSearch.fields.findIndex(f => f.id === fieldId)
      configuredSearchFields(activeSearch).slice(idx + 1).forEach(f => { if (f.cascade !== false) current[f.id] = '' })
      return { ...prev, [activeSearch.id]: current }
    })
  }

  const clearAll = React.useCallback(() => {
    if (!activeSearch) return
    setValues(prev => ({ ...prev, [activeSearch.id]: {} }))
    if (isPratica) setPraticaValues(PRATICA_EMPTY)
    clearHighlight()
    setStatus({ kind: 'idle', text: '' })
  }, [activeSearch?.id, clearHighlight])

  const [praticaValues, setPraticaValues] = React.useState<PraticaValues>(PRATICA_EMPTY)

  const isPratica = activeSearch?.searchType === 'pratica'

  const applySearch = React.useCallback(async () => {
    if (!layer || !activeSearch) {
      setStatus({ kind: 'warn', text: 'Ricerca non disponibile.' })
      return
    }

    let where = '1=1'

    if (isPratica) {
      const result = buildWherePratica(praticaValues)
      if (!result.hasUserCriteria) { setStatus({ kind: 'warn', text: 'Impostare almeno un criterio di ricerca.' }); return }
      where = result.where!
    } else {
    const invalidFields = missingConfiguredFields(layer, activeSearch)
    if (invalidFields.length) {
      setStatus({ kind: 'warn', text: describeMissingFields(layer, activeSearch, invalidFields) })
      return
    }
    const validFields = configuredSearchFields(activeSearch)
    if (!validFields.length) {
      setStatus({ kind: 'warn', text: `La ricerca "${activeSearch.title || 'selezionata'}" non ha campi validi configurati. Controlla il setting.` })
      return
    }
    const missing = validFields.filter(f => f.required && !txt(activeValues[f.id]).trim())
    if (missing.length) {
      setStatus({ kind: 'warn', text: `Compilare i campi obbligatori: ${missing.map(f => f.label || f.fieldName).join(', ')}.` })
      return
    }
      const hasAny = validFields.some(f => txt(activeValues[f.id]).trim())
      if (!hasAny) {
        setStatus({ kind: 'warn', text: 'Impostare almeno un criterio di ricerca.' })
        return
      }
      where = buildWhere(layer, validFields, activeValues)
    }

    try {
      setBusy(true)
      setStatus({ kind: 'loading', text: 'Ricerca feature...' })
      clearHighlight()
      const q = layer.createQuery()
      q.where = where
      q.outFields = ['*']
      q.returnGeometry = true
      q.num = maxResultFeatures
      if (mapView?.spatialReference) q.outSpatialReference = mapView.spatialReference
      const res = await layer.queryFeatures(q)
      const features: any[] = res?.features || []
      if (!features.length) { setStatus({ kind: 'warn', text: 'Nessuna feature trovata per i criteri impostati.' }); return }

      // Numero esatto: se ha superato il limite, fai una queryCount separata
      let totalCount = features.length
      if (Number(res?.exceededTransferLimit)) {
        try {
          const qc = layer.createQuery()
          qc.where = where
          qc.returnGeometry = false
          totalCount = await layer.queryFeatureCount(qc)
        } catch { totalCount = features.length }
      }

      if (mapView && evidenziaRisultati) {
        const Graphic = await loadEsriModule<any>('esri/Graphic')
        const now = Date.now()
        const graphics = features.filter(f => f?.geometry).map((f, idx) => new Graphic({ geometry: f.geometry, attributes: { __giiRicercheMappaId: `${now}-${idx}` }, symbol: getGraphicSymbol(f.geometry, cfg) }))
        if (graphics.length) {
          graphicIdsRef.current = graphics.map(g => g.attributes.__giiRicercheMappaId)
          mapView.graphics?.addMany?.(graphics)
        }
      }
      if (mapView && zoomAllaRicerca) {
        try {
          const geometries = features.map(f => f.geometry).filter(Boolean)
          if (geometries.length === 1 && zoomScale > 0 && txt(geometries[0]?.type).toLowerCase() === 'point') await mapView.goTo({ target: geometries[0], scale: zoomScale }, { duration: 500 })
          else if (geometries.length) {
            try {
              const prevPadding = { ...mapView.padding }
              mapView.padding = { top: 60, right: 60, bottom: 60, left: 60 }
              await mapView.goTo(geometries, { duration: 500 })
              mapView.padding = prevPadding
            } catch { await mapView.goTo(geometries, { duration: 500 }) }
          }
        } catch {}
      }
      const azioni: string[] = []
      const exceeded = Number(res?.exceededTransferLimit) || features.length < totalCount
      const countText = totalCount === 1 ? '1 risultato trovato' : `${formatResultCount(totalCount)} risultati trovati${exceeded ? ` (visualizzati i primi ${formatResultCount(features.length)})` : ''}`
      setStatus({ kind: 'ok', text: countText })
    } catch (e: any) {
      setStatus({ kind: 'err', text: `Errore ricerca: ${e?.message || String(e)}` })
    } finally { setBusy(false) }
  }, [layer, activeSearch, activeValues, praticaValues, isPratica, mapView, maxResultFeatures, evidenziaRisultati, zoomAllaRicerca, zoomScale, clearHighlight, cfg.pointColor, cfg.pointTransparency, cfg.pointSize, cfg.pointOutlineColor, cfg.pointOutlineWidth, cfg.polygonFillColor, cfg.polygonFillTransparency, cfg.polygonOutlineColor, cfg.polygonOutlineWidth])

  const c = {
    bg: txt(cfg.colorBackground) || '#ffffff',
    border: txt(cfg.colorBorder) || 'rgba(0,0,0,0.12)',
    label: txt(cfg.colorLabel) || '#374151',
    fieldBorder: txt(cfg.colorFieldBorder) || 'rgba(0,0,0,0.16)',
    fieldBg: txt(cfg.colorFieldBackground) || '#ffffff',
    fieldText: txt(cfg.colorFieldText) || '#111827',
    btnPrimary: txt(cfg.colorBtnPrimary) || '#2f6fed',
    btnPrimaryText: txt(cfg.colorBtnPrimaryText) || '#ffffff',
    btnGhost: txt(cfg.colorBtnGhost) || 'rgba(0,0,0,0.06)',
    btnGhostText: txt(cfg.colorBtnGhostText) || '#1f2937',
    radius: num(cfg.borderRadius, 8, 0, 32),
    ph: num(cfg.paddingH, 8, 0, 40),
    pv: num(cfg.paddingV, 6, 0, 40),
    searchLabel: txt(cfg.searchLabel) || 'Tipo ricerca',
    fh: num(cfg.fieldHeight, 28, 20, 48)
  }

  const r = c.radius
  const fr = Math.max(4, r - 2)
  const styles = css`
    width: 100%; height: auto; min-height: 0; box-sizing: border-box; display: block;
    .giiMapSearchWrap { width: 100%; min-height: 0; display: block; border: 1px solid ${c.border}; border-radius: ${r}px; background: ${c.bg}; overflow: hidden; box-sizing: border-box; }
    .tabBar { display: flex; gap: 6px; padding: ${c.pv}px ${c.ph}px; border-bottom: 1px solid ${c.border}; background: ${c.bg}; flex-wrap: wrap; }
    .tabBtn { border: 1px solid rgba(47,111,237,0.22); background: rgba(47,111,237,0.06); color: ${c.label}; border-radius: 999px; min-height: 26px; padding: 0 11px; font-size: 12px; font-weight: 800; cursor: pointer; }
    .tabBtnActive { background: ${c.btnPrimary}; color: ${c.btnPrimaryText}; border-color: ${c.btnPrimary}; }
    .row1 { display: flex; align-items: flex-end; gap: 6px; padding: ${c.pv}px ${c.ph}px; flex-wrap: wrap; background: ${c.bg}; }
    .actionBlock { flex: 1; min-width: 0; }
    .actionInline { display: flex; align-items: center; gap: 6px; height: ${c.fh}px; }
    .searchTypeBlock { min-width: 180px; }
    .searchTypeWrap { position: relative; width: 100%; }
    .searchTypeSelect { width: 100%; height: ${c.fh}px; border: 1px solid ${c.fieldBorder}; border-radius: ${fr}px; background: ${c.fieldBg}; color: ${c.fieldText}; font-size: 14px; font-weight: 700; padding: 0 28px 0 8px; outline: none; cursor: pointer; box-sizing: border-box; appearance: none; -webkit-appearance: none; }
    .fieldBlock { min-width: 0; width: 150px; flex: 0 1 150px; }
    .filterLabel { display: block; font-size: 13px; font-weight: 800; color: ${c.label}; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .filterSelect, .filterInput { width: 100%; min-width: 0; height: ${c.fh}px; border: 1px solid ${c.fieldBorder}; border-radius: ${fr}px; background: ${c.fieldBg}; color: ${c.fieldText}; font-size: 14px; padding: 0 8px; outline: none; box-sizing: border-box; }
    .searchSelect { position: relative; width: 100%; min-width: 0; }
    .searchInput { padding-right: 23px; }
    .searchSelectChevron { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); color: rgba(0,0,0,0.55); font-size: 18px; pointer-events: none; line-height: 1; }
    .btn { height: ${c.fh}px; border: 0; border-radius: ${fr}px; padding: 0 12px; font-size: 12px; font-weight: 900; cursor: pointer; white-space: nowrap; }
    .btnPrimary { background: ${c.btnPrimary}; color: ${c.btnPrimaryText}; }
    .btnGhost { background: ${c.btnGhost}; color: ${c.btnGhostText}; border: 1px solid ${c.fieldBorder}; }
    .status { flex: 1; min-width: 0; border-radius: ${fr}px; height: ${c.fh}px; padding: 0 8px; font-size: ${Math.max(10, c.fh * 0.4)}px; line-height: ${c.fh}px; border: 1px solid rgba(0,0,0,0.10); box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stIdle { background: rgba(0,0,0,0.04); color: #4b5563; } .stLoading { background: rgba(47,111,237,0.08); color: #1d4ed8; } .stOk { background: rgba(5,150,105,0.09); color: #047857; } .stWarn { background: rgba(245,158,11,0.12); color: #92400e; } .stErr { background: rgba(220,38,38,0.10); color: #991b1b; }
    .praticaRow { display: flex; align-items: flex-end; gap: 6px; padding: ${c.pv}px ${c.ph}px 0; flex-wrap: wrap; background: ${c.bg}; }
    .praticaArticoli { padding: ${Math.max(2, c.pv - 2)}px ${c.ph}px ${c.pv}px; background: ${c.bg}; display: none; }
    .praticaArticoliLabel { font-size: 13px; font-weight: 800; color: ${c.label}; margin-right: 4px; white-space: nowrap; }
    .praticaChip { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: 999px; border: 1px solid ${c.fieldBorder}; background: ${c.fieldBg}; color: ${c.fieldText}; font-size: 13px; cursor: pointer; user-select: none; }
    .praticaChipActive { background: ${c.btnPrimary}; color: ${c.btnPrimaryText}; border-color: ${c.btnPrimary}; }
    .praticaActionRow { display: flex; align-items: center; gap: 6px; padding: 0 ${c.ph}px ${c.pv}px; background: ${c.bg}; }
    .multiSelect { width: 100%; border: 1px solid ${c.fieldBorder}; border-radius: ${fr}px; background: ${c.fieldBg}; color: ${c.fieldText}; font-size: 12px; outline: none; box-sizing: border-box; }
  `

  const currentValues = activeSearch ? values[activeSearch.id] || {} : {}

  return (
    <div css={styles}>
      <div className='giiMapSearchWrap'>
        {mapWidgetId && <JimuMapViewComponent useMapWidgetId={mapWidgetId} onActiveViewChange={(jmv: JimuMapView) => setMapView(jmv?.view || null)} />}
        {searches.length === 0 && <div style={{ fontSize: 12, color: c.label, padding: '8px' }}>Nessuna ricerca configurata</div>}
        {activeSearch && isPratica && (
          <React.Fragment>
            <div className='praticaRow'>
              {searches.length > 1 && (
                <div className='searchTypeBlock'>
                  <label className='filterLabel'>{c.searchLabel}</label>
                  <div className='searchTypeWrap'>
                    <select className='searchTypeSelect' value={activeSearch.id} onChange={e => setActiveSearchId(e.target.value)}>
                      {searches.map(s => <option key={s.id} value={s.id}>{s.title || 'Ricerca'}</option>)}
                    </select>
                    <span className='searchSelectChevron'>▾</span>
                  </div>
                </div>
              )}
              <div className='fieldBlock' style={{ width: 200, flex: '0 1 200px' }}>
                <label className='filterLabel'>Articolo violato</label>
                <div className='searchTypeWrap'>
                  <select className='filterSelect' style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: 28 }} value={praticaValues.articolo} disabled={busy || !layer}
                    onChange={e => setPraticaValues(prev => ({ ...prev, articolo: e.target.value }))}>
                    <option value=''>- Tutti -</option>
                    {ARTICOLI_PRATICA.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                  <span className='searchSelectChevron'>▾</span>
                </div>
              </div>
              <div className='fieldBlock'>
                <label className='filterLabel'>Tipo pratica</label>
                <div className='searchTypeWrap'>
                  <select className='filterSelect' style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: 28 }} value={praticaValues.tipoPratica} disabled={busy || !layer}
                    onChange={e => setPraticaValues(prev => ({ ...prev, tipoPratica: e.target.value as TipoPratica, numeroPratica: '' }))}>
                    <option value=''>- Tutti -</option>
                    <option value='rilevazione'>Rilevazione</option>
                    <option value='rapporto'>Rapporto tecnico</option>
                    <option value='accertamento'>Atto di accertamento</option>
                  </select>
                  <span className='searchSelectChevron'>▾</span>
                </div>
              </div>
              <div className='fieldBlock' style={{ width: 160, flex: '0 1 160px' }}>
                <label className='filterLabel'>Numero pratica</label>
                <input className='filterInput' type='text' value={praticaValues.numeroPratica} disabled={busy || !layer || !praticaValues.tipoPratica}
                  placeholder={praticaValues.tipoPratica === 'rilevazione' ? 'Es. 411-TI-D1' : praticaValues.tipoPratica === 'rapporto' ? 'Es. R-25/2026' : (praticaValues.tipoPratica === 'accertamento' || praticaValues.tipoPratica === 'verbale') ? 'Es. A-1/2026' : '— seleziona tipo —'}
                  onChange={e => setPraticaValues(prev => ({ ...prev, numeroPratica: e.target.value }))} />
              </div>
              <div className='fieldBlock' style={{ width: 200, flex: '0 1 200px' }}>
                <label className='filterLabel'>Nominativo / Ragione sociale</label>
                <input className='filterInput' type='text' value={praticaValues.nominativo} disabled={busy || !layer} placeholder='Nome, Cognome o Ragione sociale…' onChange={e => setPraticaValues(prev => ({ ...prev, nominativo: e.target.value }))} />
              </div>
              <div className='fieldBlock' style={{ width: 160, flex: '0 1 160px' }}>
                <label className='filterLabel'>CF / P. IVA</label>
                <input className='filterInput' type='text' value={praticaValues.cfPiva} disabled={busy || !layer} placeholder='Codice fiscale o P. IVA…' onChange={e => setPraticaValues(prev => ({ ...prev, cfPiva: e.target.value }))} />
              </div>
              <div className='actionBlock'>
                <label className='filterLabel'>&nbsp;</label>
                <div className='actionInline'>
                  <button className='btn btnGhost' type='button' disabled={busy} onClick={clearAll}>Annulla</button>
                  <button className='btn btnPrimary' type='button' disabled={busy || !layer} onClick={applySearch}>Cerca</button>
                  {(status.kind === 'loading' || status.kind === 'ok' || status.kind === 'warn' || status.kind === 'err') && (
                    <div className={`status st${status.kind.charAt(0).toUpperCase()}${status.kind.slice(1)}`}>{status.text}</div>
                  )}
                </div>
              </div>
            </div>
          </React.Fragment>
        )}
        {activeSearch && !isPratica && (
          <div className='row1'>
            {searches.length > 1 && (
              <div className='searchTypeBlock'>
                <label className='filterLabel'>{c.searchLabel}</label>
                <div className='searchTypeWrap'>
                  <select
                    className='searchTypeSelect'
                    value={activeSearch.id}
                    onChange={e => setActiveSearchId(e.target.value)}
                  >
                    {searches.map(s => <option key={s.id} value={s.id}>{s.title || 'Ricerca'}</option>)}
                  </select>
                  <span className='searchSelectChevron'>▾</span>
                </div>
              </div>
            )}
            {activeSearch.fields.map(f => {
              const v = txt(currentValues[f.id] || '')
              const disabled = busy || !layer || !!fieldLoading[f.id]
              return (
                <div className='fieldBlock' key={f.id}>
                  <label className='filterLabel' title={f.label || f.fieldName}>{f.label || f.fieldName}{f.required ? ' *' : ''}</label>
                  {f.controlType === 'combo' ? (
                    <SearchableFilter value={v} options={fieldOptions[f.id] || []} disabled={disabled} required={f.required === true} placeholder={fieldLoading[f.id] ? 'Caricamento…' : f.required ? '- Seleziona -' : '- Tutti -'} onChange={val => setFieldValue(f.id, val)} />
                  ) : (
                    <input className='filterInput' type={f.controlType === 'number' ? 'number' : f.controlType === 'date' ? 'date' : 'text'} value={v} disabled={busy || !layer} placeholder='Cerca…' onChange={e => setFieldValue(f.id, e.currentTarget.value)} />
                  )}
                </div>
              )
            })}
            <div className='actionBlock'>
              <label className='filterLabel'>&nbsp;</label>
              <div className='actionInline'>
                <button className='btn btnGhost' type='button' disabled={busy} onClick={clearAll}>Annulla</button>
                <button className='btn btnPrimary' type='button' disabled={busy || !layer} onClick={applySearch}>Cerca</button>
                {(status.kind === 'loading' || status.kind === 'ok' || status.kind === 'warn' || status.kind === 'err') && (
                  <div className={`status st${status.kind.charAt(0).toUpperCase()}${status.kind.slice(1)}`}>{status.text}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

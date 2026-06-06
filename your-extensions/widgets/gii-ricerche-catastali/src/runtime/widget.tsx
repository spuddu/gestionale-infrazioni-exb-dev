/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, css, type AllWidgetProps } from 'jimu-core'
import { createPortal } from 'react-dom'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetProps<IMConfig>
type Option = { value: string; label: string; raw: any }
type QueryStatus = { kind: 'idle' | 'loading' | 'ok' | 'warn' | 'err'; text: string }

type Fields = {
  comune: string
  sezione: string
  foglio: string
  mappale: string
}

const LAYER_CACHE: Record<string, Promise<any>> = {}
const COLLATOR = new Intl.Collator('it', { numeric: true, sensitivity: 'base' })

function asJs<T = any>(v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function txt(v: any): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function bool(v: any, fb: boolean): boolean {
  return typeof v === 'boolean' ? v : fb
}

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
  } catch {
    return s.replace(/[?#].*$/, '').replace(/\/$/, '')
  }
}

function normalizeLayerUrl(raw: any, layerLayerId?: any): string {
  const base = normalizeUrl(raw)
  if (!base) return ''
  if (/\/(FeatureServer|MapServer)\/\d+$/i.test(base)) return base
  if (/\/(FeatureServer|MapServer)$/i.test(base)) {
    const subId = txt(layerLayerId).trim()
    return `${base}/${subId || '0'}`
  }
  return base
}

function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) {
      reject(new Error('AMD require non disponibile'))
      return
    }
    try {
      req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
    } catch (e) {
      reject(e)
    }
  })
}

async function getLayer(urlRaw: any, layerLayerId?: any): Promise<any> {
  const url = normalizeLayerUrl(urlRaw, layerLayerId)
  if (!url) throw new Error('URL del layer catastale non configurato.')
  if (!LAYER_CACHE[url]) {
    LAYER_CACHE[url] = (async () => {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const layer = new FeatureLayer({ url, outFields: ['*'] })
      try {
        if (typeof layer.load === 'function') await layer.load()
      } catch {}
      return layer
    })()
  }
  return LAYER_CACHE[url]
}

function compactKey(v: any): string {
  return txt(v).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function fieldCandidates(kind: string): string[] {
  const k = compactKey(kind)
  if (k.includes('comune')) {
    // Per il filtro Comune va usato il nome del Comune, non il codice catastale/ISTAT/Belfiore.
    return [
      'nomecomune', 'nomcomune', 'denominazionecomune', 'denomcomune', 'descomune', 'desccomune',
      'comunedesc', 'comunedenominazione', 'comuneamm', 'nomecom', 'nomcom', 'dencom',
      'denominazione', 'descrizionecomune', 'descrcomune', 'comune'
    ]
  }
  if (k.includes('sezione')) return ['sezione', 'sez', 'sezcens', 'sezionecensuaria', 'sezionecatastale', 'codsezione', 'codsez']
  if (k.includes('foglio')) return ['foglio', 'fg', 'numfoglio', 'numerofoglio', 'fog', 'codfoglio', 'codfog']
  if (k.includes('mappale') || k.includes('particella')) return ['mappale', 'particella', 'part', 'mapp', 'numappale', 'nummappale', 'numero', 'num', 'codmappale']
  return []
}

function isComuneCodeLikeField(field: any): boolean {
  const key = `${compactKey(field?.name)} ${compactKey(field?.alias || field?.label)}`
  return /codicecatastale|codcat|belfiore|codicebelfiore|codicecomune|codcomune|codistat|istatcomune|codiceistat|codcom|istat/.test(key)
}

function comuneNameScore(field: any): number {
  if (!field || isComuneCodeLikeField(field)) return -1000
  const name = compactKey(field?.name)
  const alias = compactKey(field?.alias || field?.label)
  const both = `${name} ${alias}`
  const type = txt(field?.type || '').toLowerCase()
  let score = 0
  if (/string/.test(type)) score += 8
  if (name === 'nomecomune' || alias === 'nomecomune') score += 120
  if (name === 'denominazionecomune' || alias === 'denominazionecomune') score += 115
  if (name === 'comune' || alias === 'comune') score += 95
  if (/nome.*comune|comune.*nome/.test(both)) score += 90
  if (/denominazione.*comune|comune.*denominazione/.test(both)) score += 88
  if (/descrizione.*comune|comune.*descrizione|desc.*comune|comune.*desc/.test(both)) score += 75
  if (/dencom|nomcom|nomecom|comunedesc|comunedenominazione/.test(both)) score += 70
  if (/comune/.test(both)) score += 45
  return score
}

function findComuneNameField(layer: any, requested?: string): any {
  const fields = Array.isArray(layer?.fields) ? layer.fields : []
  if (!fields.length) return null
  const current = requested ? findField(layer, requested) : null
  if (current && !isComuneCodeLikeField(current) && comuneNameScore(current) >= 45) return current

  let best: any = null
  let bestScore = -1000
  for (const f of fields) {
    const score = comuneNameScore(f)
    if (score > bestScore) {
      best = f
      bestScore = score
    }
  }
  return bestScore >= 45 ? best : current
}

function resolveComuneFieldName(layer: any, requested: string): string {
  const preferred = findComuneNameField(layer, requested)
  return txt(preferred?.name || resolveFieldName(layer, requested) || requested)
}

function findField(layer: any, fieldName: string): any {
  const requested = txt(fieldName).trim()
  if (!requested) return null
  const fields = Array.isArray(layer?.fields) ? layer.fields : []
  if (!fields.length) return null
  const reqLower = requested.toLowerCase()
  const reqCompact = compactKey(requested)
  const exact = fields.find((x: any) => txt(x?.name).toLowerCase() === reqLower)
  if (exact) return exact
  const aliasExact = fields.find((x: any) => txt(x?.alias || x?.label).toLowerCase() === reqLower)
  if (aliasExact) return aliasExact
  const compactExact = fields.find((x: any) => compactKey(x?.name) === reqCompact || compactKey(x?.alias || x?.label) === reqCompact)
  if (compactExact) return compactExact

  const semantic = fieldCandidates(requested)
  for (const key of semantic) {
    const match = fields.find((x: any) => {
      const name = compactKey(x?.name)
      const alias = compactKey(x?.alias || x?.label)
      return name === key || alias === key || name.endsWith(key) || alias.endsWith(key) || name.includes(key) || alias.includes(key)
    })
    if (match) return match
  }

  return null
}

function resolveFieldName(layer: any, fieldName: string): string {
  const requested = txt(fieldName).trim()
  if (!requested) return ''
  const match = findField(layer, requested)
  return txt(match?.name || requested)
}

function hasResolvedField(layer: any, fieldName: string): boolean {
  const fields = Array.isArray(layer?.fields) ? layer.fields : []
  if (!fields.length) return true
  return !!findField(layer, fieldName)
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
  for (const k of Object.keys(attrs)) {
    if (txt(k).toLowerCase() === lc) return attrs[k]
  }
  return undefined
}

function sqlEscape(v: any): string {
  return txt(v).replace(/'/g, "''")
}

function sqlClause(layer: any, fieldName: string, value: string): string | null {
  const field = resolveFieldName(layer, fieldName)
  const val = txt(value).trim()
  if (!field || !val) return null
  const type = getFieldType(layer, field)
  if (/integer|small-integer|double|single|oid|long/.test(type)) {
    const n = Number(val.replace(',', '.'))
    if (Number.isFinite(n)) return `${field} = ${n}`
  }
  return `${field} = '${sqlEscape(val)}'`
}

function buildWhere(layer: any, fields: Fields, values: Record<string, string>): string {
  const comuneField = resolveComuneFieldName(layer, fields.comune)
  const clauses = [
    sqlClause(layer, comuneField, values.comune),
    sqlClause(layer, fields.sezione, values.sezione),
    sqlClause(layer, fields.foglio, values.foglio),
    sqlClause(layer, fields.mappale, values.mappale)
  ].filter(Boolean) as string[]
  return clauses.length ? clauses.join(' AND ') : '1=1'
}

function optionLabel(v: any): string {
  const s = txt(v).trim()
  return s || '—'
}

function sortOptions(options: Option[]): Option[] {
  return [...options].sort((a, b) => COLLATOR.compare(a.label, b.label))
}

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
  } catch {
    // fallback senza ordinamento: alcuni servizi MapServer non supportano orderBy + distinct
  }

  q.orderByFields = []
  const res = await layer.queryFeatures(q)
  return optionsFromFeatures(res?.features || [], fieldName)
}

async function queryDistinctWithStatistics(layer: any, fieldName: string, where: string, maxValues: number): Promise<Option[]> {
  const q = layer.createQuery()
  q.where = where || '1=1'
  q.returnGeometry = false
  q.outFields = [fieldName]
  q.groupByFieldsForStatistics = [fieldName]
  q.outStatistics = [{ statisticType: 'count', onStatisticField: fieldName, outStatisticFieldName: 'GII_CNT' }]
  q.num = Math.max(1, maxValues || 5000)
  q.orderByFields = [`${fieldName} ASC`]

  try {
    const res = await layer.queryFeatures(q)
    const opts = optionsFromFeatures(res?.features || [], fieldName)
    if (opts.length) return opts
  } catch {
    // fallback sotto
  }

  q.orderByFields = []
  const res = await layer.queryFeatures(q)
  return optionsFromFeatures(res?.features || [], fieldName)
}

async function queryDistinctWithSamples(layer: any, fieldName: string, where: string, maxValues: number): Promise<Option[]> {
  const all: any[] = []
  const pageSize = Math.min(Math.max(100, Math.min(maxValues || 5000, 2000)), 2000)
  const maxRows = Math.max(pageSize, Math.min(maxValues || 5000, 20000))
  let start = 0

  for (let i = 0; i < 10 && all.length < maxRows; i++) {
    const q = layer.createQuery()
    q.where = where || '1=1'
    q.outFields = [fieldName]
    q.returnGeometry = false
    q.start = start
    q.num = pageSize
    let res: any
    try {
      res = await layer.queryFeatures(q)
    } catch {
      if (start > 0) break
      q.start = undefined
      res = await layer.queryFeatures(q)
    }
    const features = res?.features || []
    all.push(...features)
    if (!features.length || features.length < pageSize || !res?.exceededTransferLimit) break
    start += pageSize
  }

  return optionsFromFeatures(all, fieldName)
}

async function queryDistinctWithRest(layer: any, fieldName: string, where: string, maxValues: number): Promise<Option[]> {
  const rawUrl = layer?.url || layer?.sourceJSON?.url || layer?.parsedUrl?.path || ''
  const url = normalizeLayerUrl(rawUrl, layer?.layerId || layer?.sourceLayerId || layer?.sublayerId)
  if (!url) return []
  try {
    const esriRequest = await loadEsriModule<any>('esri/request')
    const response = await esriRequest(`${url}/query`, {
      responseType: 'json',
      query: {
        f: 'json',
        where: where || '1=1',
        outFields: fieldName,
        returnGeometry: false,
        returnDistinctValues: true,
        orderByFields: `${fieldName} ASC`,
        resultRecordCount: Math.max(1, maxValues || 5000)
      }
    })
    const features = response?.data?.features || response?.features || []
    return optionsFromFeatures(features, fieldName)
  } catch {
    return []
  }
}

async function queryDistinct(layer: any, fieldName: string, where: string, maxValues: number): Promise<Option[]> {
  const f = resolveFieldName(layer, fieldName)
  if (!f) return []
  if (!hasResolvedField(layer, fieldName)) {
    throw new Error(`Campo non trovato nel layer: ${fieldName}`)
  }

  const methods = [
    () => queryDistinctWithLayer(layer, f, where, maxValues),
    () => queryDistinctWithStatistics(layer, f, where, maxValues),
    () => queryDistinctWithRest(layer, f, where, maxValues),
    () => queryDistinctWithSamples(layer, f, where, maxValues)
  ]

  let lastError: any = null
  for (const run of methods) {
    try {
      const opts = await run()
      if (opts.length) return opts
    } catch (e) {
      lastError = e
    }
  }
  if (lastError) throw lastError
  return []
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
    seen.add(l)
    out.push(l)
    try { l.layers?.forEach?.((child: any) => push(child)) } catch {}
    try { l.allSublayers?.forEach?.((child: any) => push(child)) } catch {}
    try { l.sublayers?.forEach?.((child: any) => push(child)) } catch {}
  }
  try { view?.map?.allLayers?.forEach?.((l: any) => push(l)) } catch {}
  try { view?.map?.layers?.forEach?.((l: any) => push(l)) } catch {}
  return out
}

function findMapLayer(view: any, cfg: any): any {
  const url = normalizeLayerUrl(cfg.layerUrl, cfg.layerLayerId)
  const rawTitle = txt(cfg.layerTitle).trim().toLowerCase()
  const titles = titleTokens(cfg.layerTitle)
  const layerId = txt(cfg.layerId).trim()
  const layerLayerId = txt(cfg.layerLayerId).trim()
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

async function getConfiguredLayer(mapView: any, cfg: any): Promise<any> {
  const mapLayer = findMapLayer(mapView, cfg)
  if (mapLayer) {
    try { if (typeof mapLayer.load === 'function') await mapLayer.load() } catch {}
    if (typeof mapLayer.createQuery === 'function' && typeof mapLayer.queryFeatures === 'function') return mapLayer
    const mapUrl = normalizeLayerUrl(mapLayer?.url || mapLayer?.sourceJSON?.url || cfg.layerUrl, cfg.layerLayerId || mapLayer?.layerId || mapLayer?.sourceLayerId || mapLayer?.sublayerId)
    if (mapUrl) return getLayer(mapUrl)
  }
  return getLayer(cfg.layerUrl, cfg.layerLayerId)
}

function getObjectIdField(layer: any): string {
  return txt(layer?.objectIdField || layer?.objectIdFieldName || 'OBJECTID') || 'OBJECTID'
}

function getGraphicSymbol(geometry: any): any {
  const type = txt(geometry?.type).toLowerCase()
  if (type === 'point' || type === 'multipoint') {
    return {
      type: 'simple-marker',
      style: 'circle',
      size: 13,
      color: [255, 100, 0, 0.28],
      outline: { color: [255, 100, 0, 1], width: 2 }
    }
  }
  if (type === 'polyline') {
    return { type: 'simple-line', color: [255, 100, 0, 1], width: 3 }
  }
  return {
    type: 'simple-fill',
    color: [255, 100, 0, 0.12],
    outline: { color: [255, 100, 0, 1], width: 2 }
  }
}

function formatResultCount(n: number): string {
  return n.toLocaleString('it-IT')
}


type SearchableFilterProps = {
  value: string
  options: Option[]
  disabled?: boolean
  placeholder: string
  onChange: (value: string) => void
}

function SearchableFilter(props: SearchableFilterProps) {
  const { value, options, disabled, placeholder, onChange } = props
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [hoverKey, setHoverKey] = React.useState('')
  const [menuBox, setMenuBox] = React.useState({ left: 0, top: 0, width: 0, maxHeight: 220 })

  const allOptions = React.useMemo<Option[]>(() => {
    return [{ value: '', label: placeholder, raw: null }, ...(Array.isArray(options) ? options : [])]
  }, [options, placeholder])

  const selected = React.useMemo(() => {
    return allOptions.find(o => txt(o.value) === txt(value)) || null
  }, [allOptions, value])

  const filteredOptions = React.useMemo(() => {
    const q = compactKey(query)
    if (!q) return allOptions
    return allOptions.filter(o => {
      const haystack = `${compactKey(o.label)} ${compactKey(o.value)}`
      return haystack.includes(q)
    })
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
    return () => {
      window.removeEventListener('resize', onReposition, true)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, updateMenuBox])

  React.useEffect(() => {
    if (!open) return
    const onDown = (ev: MouseEvent) => {
      const target = ev.target as Node
      const wrap = wrapRef.current
      const menu = menuRef.current
      if ((wrap && wrap.contains(target)) || (menu && menu.contains(target))) return
      setOpen(false)
      setQuery('')
      setHoverKey('')
    }
    window.addEventListener('mousedown', onDown, true)
    return () => window.removeEventListener('mousedown', onDown, true)
  }, [open])

  const selectOption = React.useCallback((opt: Option) => {
    onChange(txt(opt.value))
    setQuery('')
    setHoverKey('')
    setOpen(false)
  }, [onChange])

  const shownValue = open ? query : txt(selected?.label || '')

  const menu = open && !disabled ? (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: menuBox.left,
        top: menuBox.top,
        width: menuBox.width,
        maxHeight: menuBox.maxHeight,
        overflowY: 'auto',
        padding: 4,
        border: '1px solid rgba(0, 0, 0, 0.14)',
        borderRadius: 10,
        background: '#fff',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.22)',
        boxSizing: 'border-box',
        zIndex: 2147483000
      }}
    >
      {filteredOptions.length === 0 && (
        <div
          style={{
            width: '100%',
            minHeight: 30,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 8,
            color: 'rgba(0, 0, 0, 0.42)',
            padding: '6px 8px',
            fontSize: 12,
            lineHeight: 1.2,
            boxSizing: 'border-box'
          }}
        >Nessun risultato</div>
      )}
      {filteredOptions.map(opt => {
        const key = `${opt.value}__${opt.label}`
        const active = txt(opt.value) === txt(value)
        const hover = hoverKey === key
        return (
          <button
            key={key}
            type='button'
            onMouseEnter={() => setHoverKey(key)}
            onMouseLeave={() => setHoverKey('')}
            onMouseDown={e => {
              e.preventDefault()
              selectOption(opt)
            }}
            title={opt.label}
            style={{
              width: '100%',
              minHeight: 30,
              display: 'flex',
              alignItems: 'center',
              border: 0,
              borderRadius: 8,
              background: active || hover ? 'rgba(47, 111, 237, 0.10)' : 'transparent',
              color: active || hover ? '#1d4ed8' : '#111827',
              padding: '6px 8px',
              fontSize: 12,
              lineHeight: 1.2,
              textAlign: 'left',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <div className='searchSelect' ref={wrapRef}>
      <input
        ref={inputRef}
        className='filterSelect searchInput'
        type='text'
        value={shownValue}
        placeholder={txt(selected?.label || placeholder)}
        disabled={disabled}
        autoComplete='off'
        onFocus={() => {
          if (disabled) return
          setQuery('')
          setOpen(true)
          window.setTimeout(updateMenuBox, 0)
        }}
        onChange={e => {
          if (disabled) return
          setQuery(e.currentTarget.value)
          setOpen(true)
          window.setTimeout(updateMenuBox, 0)
        }}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setOpen(false)
            setQuery('')
            setHoverKey('')
          }
          if (e.key === 'Enter' && open && filteredOptions.length === 1) {
            e.preventDefault()
            selectOption(filteredOptions[0])
          }
        }}
      />
      <span className='searchSelectChevron'>▾</span>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}

export default function Widget(props: Props) {
  const cfg = { ...asJs<any>(defaultConfig), ...(asJs<any>(props.config) || {}) }
  const mapWidgetId = (asJs<string[]>(cfg.useMapWidgetIds || []) || [])[0] || ''
  const fields: Fields = {
    comune: txt(cfg.fieldComune || 'COMUNE').trim(),
    sezione: txt(cfg.fieldSezione || 'SEZIONE').trim(),
    foglio: txt(cfg.fieldFoglio || 'FOGLIO').trim(),
    mappale: txt(cfg.fieldMappale || 'MAPPALE').trim()
  }

  const mostraSezione = bool(cfg.mostraSezione, true)
  // La ricerche catastali non deve filtrare il layer in mappa: evidenzia soltanto i risultati trovati.
  const zoomAllaRicerca = bool(cfg.zoomAllaRicerca, true)
  const evidenziaRisultati = bool(cfg.evidenziaRisultati, true)
  const richiediFoglio = bool(cfg.richiediFoglioPerRicerca, true)
  const maxResultFeatures = num(cfg.maxResultFeatures, 500, 1, 5000)
  const maxDistinctValues = num(cfg.maxDistinctValues, 5000, 50, 20000)
  const zoomScale = num(cfg.zoomScale, 2500, 0, 500000)

  const [mapView, setMapView] = React.useState<any>(null)
  const [layer, setLayer] = React.useState<any>(null)
  const [status, setStatus] = React.useState<QueryStatus>({ kind: 'idle', text: 'Configura il layer catastale per avviare la ricerca.' })
  const [busy, setBusy] = React.useState(false)

  const [comune, setComune] = React.useState('')
  const [sezione, setSezione] = React.useState('')
  const [foglio, setFoglio] = React.useState('')
  const [mappale, setMappale] = React.useState('')

  const [comuni, setComuni] = React.useState<Option[]>([])
  const [sezioni, setSezioni] = React.useState<Option[]>([])
  const [fogli, setFogli] = React.useState<Option[]>([])
  const [mappali, setMappali] = React.useState<Option[]>([])

  const layerLoadReqRef = React.useRef(0)
  const comuneLoadReqRef = React.useRef(0)
  const sezioneLoadReqRef = React.useRef(0)
  const foglioLoadReqRef = React.useRef(0)
  const highlightRef = React.useRef<any>(null)
  const filterLayerRef = React.useRef<any>(null)
  const graphicIdsRef = React.useRef<any[]>([])

  const clearHighlight = React.useCallback(() => {
    try { highlightRef.current?.remove?.() } catch {}
    highlightRef.current = null
    try {
      if (mapView && graphicIdsRef.current.length) {
        const ids = new Set(graphicIdsRef.current)
        const toRemove: any[] = []
        mapView.graphics?.forEach?.((g: any) => {
          if (ids.has(g?.attributes?.__giiRicercaCatastaleId)) toRemove.push(g)
        })
        if (toRemove.length) mapView.graphics?.removeMany?.(toRemove)
      }
    } catch {}
    graphicIdsRef.current = []
  }, [mapView])

  const clearMapFilter = React.useCallback(async () => {
    try {
      const lyr = filterLayerRef.current || findMapLayer(mapView, cfg)
      if (!lyr || !mapView) return
      const lv = await mapView.whenLayerView(lyr)
      if (lv) lv.filter = null
    } catch {}
    filterLayerRef.current = null
  }, [mapView, cfg.layerUrl, cfg.layerTitle, cfg.layerId, cfg.layerLayerId])

  React.useEffect(() => {
    return () => {
      try { highlightRef.current?.remove?.() } catch {}
      try { clearMapFilter() } catch {}
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const id = ++layerLoadReqRef.current
    setLayer(null)
    setComuni([])
    setSezioni([])
    setFogli([])
    setMappali([])
    setComune('')
    setSezione('')
    setFoglio('')
    setMappale('')
    clearHighlight()
    clearMapFilter()

    const url = normalizeLayerUrl(cfg.layerUrl, cfg.layerLayerId)
    const hasMapLayerFallback = !!(mapView && (txt(cfg.layerTitle).trim() || txt(cfg.layerId).trim() || txt(cfg.layerLayerId).trim()))
    if (!url && !hasMapLayerFallback) {
      setStatus({ kind: 'warn', text: 'Selezionare il layer catastale nel setting.' })
      return
    }

    ;(async () => {
      try {
        setBusy(true)
        setStatus({ kind: 'loading', text: 'Caricamento comuni...' })
        const fl = await getConfiguredLayer(mapView, cfg)
        if (!fl) throw new Error('Layer catastale non trovato nella mappa selezionata.')
        try { if (typeof fl.load === 'function') await fl.load() } catch {}
        if (cancelled || id !== layerLoadReqRef.current) return
        setLayer(fl)
        const comuneField = resolveComuneFieldName(fl, fields.comune)
        const opts = await queryDistinct(fl, comuneField, '1=1', maxDistinctValues)
        if (cancelled || id !== layerLoadReqRef.current) return
        setComuni(opts)
        setStatus({ kind: 'ok', text: opts.length ? `${opts.length} comuni disponibili.` : 'Nessun comune trovato nel layer configurato.' })
      } catch (e: any) {
        if (!cancelled) setStatus({ kind: 'err', text: `Errore caricamento layer catastale: ${e?.message || String(e)}` })
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()

    return () => { cancelled = true }
  }, [cfg.layerUrl, cfg.layerTitle, cfg.layerId, cfg.layerLayerId, mapView, fields.comune, maxDistinctValues])

  React.useEffect(() => {
    const id = ++comuneLoadReqRef.current
    setSezione('')
    setFoglio('')
    setMappale('')
    setSezioni([])
    setFogli([])
    setMappali([])
    if (!layer) return
    if (!comune) {
      setStatus({ kind: 'ok', text: comuni.length ? `${comuni.length} comuni disponibili.` : 'Selezionare un comune.' })
      return
    }
    ;(async () => {
      try {
        setBusy(true)
        const where = buildWhere(layer, fields, { comune, sezione: '', foglio: '', mappale: '' })
        if (mostraSezione && fields.sezione) {
          setStatus({ kind: 'loading', text: 'Caricamento sezioni...' })
          const opts = await queryDistinct(layer, fields.sezione, where, maxDistinctValues)
          if (id !== comuneLoadReqRef.current) return
          setSezioni(opts)

          // Anche lasciando la Sezione su "- Tutte -", il Foglio deve essere subito selezionabile.
          // Perciò i fogli vengono caricati sempre sul solo filtro Comune; se poi l'utente
          // sceglie una sezione specifica, l'effetto successivo li restringe a quella sezione.
          setStatus({ kind: 'loading', text: 'Caricamento fogli...' })
          const fogliOpts = await queryDistinct(layer, fields.foglio, where, maxDistinctValues)
          if (id !== comuneLoadReqRef.current) return
          setFogli(fogliOpts)
          setStatus({
            kind: 'ok',
            text: opts.length
              ? `${opts.length} sezioni e ${fogliOpts.length} fogli disponibili per il comune selezionato.`
              : `${fogliOpts.length} fogli disponibili per il comune selezionato.`
          })
        } else {
          setStatus({ kind: 'loading', text: 'Caricamento fogli...' })
          const opts = await queryDistinct(layer, fields.foglio, where, maxDistinctValues)
          if (id !== comuneLoadReqRef.current) return
          setFogli(opts)
          setStatus({ kind: 'ok', text: `${opts.length} fogli disponibili per il comune selezionato.` })
        }
      } catch (e: any) {
        if (id === comuneLoadReqRef.current) setStatus({ kind: 'err', text: `Errore caricamento dati catastali: ${e?.message || String(e)}` })
      } finally {
        if (id === comuneLoadReqRef.current) setBusy(false)
      }
    })()
  }, [comune, layer, mostraSezione, fields.sezione, fields.foglio, maxDistinctValues])

  React.useEffect(() => {
    const id = ++sezioneLoadReqRef.current
    setFoglio('')
    setMappale('')
    setFogli([])
    setMappali([])
    if (!layer || !comune || !mostraSezione) return
    ;(async () => {
      try {
        setBusy(true)
        setStatus({ kind: 'loading', text: 'Caricamento fogli...' })
        const where = buildWhere(layer, fields, { comune, sezione: sezione || '', foglio: '', mappale: '' })
        const opts = await queryDistinct(layer, fields.foglio, where, maxDistinctValues)
        if (id !== sezioneLoadReqRef.current) return
        setFogli(opts)
        setStatus({
          kind: 'ok',
          text: sezione
            ? `${opts.length} fogli disponibili per la sezione selezionata.`
            : `${opts.length} fogli disponibili per tutte le sezioni del comune selezionato.`
        })
      } catch (e: any) {
        if (id === sezioneLoadReqRef.current) setStatus({ kind: 'err', text: `Errore caricamento fogli: ${e?.message || String(e)}` })
      } finally {
        if (id === sezioneLoadReqRef.current) setBusy(false)
      }
    })()
  }, [sezione, layer, comune, mostraSezione, fields.sezione, fields.foglio, maxDistinctValues])

  React.useEffect(() => {
    const id = ++foglioLoadReqRef.current
    setMappale('')
    setMappali([])
    if (!layer || !comune || !foglio) return
    ;(async () => {
      try {
        setBusy(true)
        setStatus({ kind: 'loading', text: 'Caricamento mappali...' })
        const where = buildWhere(layer, fields, { comune, sezione: mostraSezione ? sezione : '', foglio, mappale: '' })
        const opts = await queryDistinct(layer, fields.mappale, where, maxDistinctValues)
        if (id !== foglioLoadReqRef.current) return
        setMappali(opts)
        setStatus({ kind: 'ok', text: `${opts.length} mappali disponibili per il foglio selezionato.` })
      } catch (e: any) {
        if (id === foglioLoadReqRef.current) setStatus({ kind: 'err', text: `Errore caricamento mappali: ${e?.message || String(e)}` })
      } finally {
        if (id === foglioLoadReqRef.current) setBusy(false)
      }
    })()
  }, [foglio, layer, comune, sezione, mostraSezione, fields.mappale, maxDistinctValues])

  const clearAll = React.useCallback(() => {
    setComune('')
    setSezione('')
    setFoglio('')
    setMappale('')
    setSezioni([])
    setFogli([])
    setMappali([])
    clearHighlight()
    clearMapFilter()
    setStatus({ kind: 'ok', text: comuni.length ? `${comuni.length} comuni disponibili.` : 'Ricerca azzerata.' })
  }, [comuni.length, clearHighlight, clearMapFilter])

  const applySearch = React.useCallback(async () => {
    if (!layer) {
      setStatus({ kind: 'warn', text: 'Layer catastale non disponibile.' })
      return
    }
    if (richiediFoglio && !foglio) {
      setStatus({ kind: 'warn', text: 'Selezionare almeno il foglio prima di avviare la ricerca.' })
      return
    }
    const where = buildWhere(layer, fields, { comune, sezione: mostraSezione ? sezione : '', foglio, mappale })
    try {
      setBusy(true)
      setStatus({ kind: 'loading', text: 'Ricerca feature catastali...' })
      clearHighlight()

      const q = layer.createQuery()
      q.where = where
      q.outFields = ['*']
      q.returnGeometry = true
      q.num = maxResultFeatures
      if (mapView?.spatialReference) q.outSpatialReference = mapView.spatialReference
      const res = await layer.queryFeatures(q)
      const features: any[] = res?.features || []
      const count = Number(res?.exceededTransferLimit) ? `${formatResultCount(features.length)}+` : formatResultCount(features.length)

      // Non applichiamo alcun filtro al layer catastale: le altre particelle devono restare visibili.
      // Il widget aggiunge solo evidenziazione grafica e, se configurato, zoom sui risultati.

      if (!features.length) {
        setStatus({ kind: 'warn', text: 'Nessuna feature trovata per i criteri impostati.' })
        return
      }

      if (mapView && evidenziaRisultati) {
        const Graphic = await loadEsriModule<any>('esri/Graphic')
        const now = Date.now()
        const graphics = features
          .filter(f => f?.geometry)
          .map((f, idx) => new Graphic({
            geometry: f.geometry,
            attributes: { __giiRicercaCatastaleId: `${now}-${idx}` },
            symbol: getGraphicSymbol(f.geometry)
          }))
        if (graphics.length) {
          graphicIdsRef.current = graphics.map(g => g.attributes.__giiRicercaCatastaleId)
          mapView.graphics?.addMany?.(graphics)
        }

        const mapLayer = findMapLayer(mapView, cfg)
        const oidField = getObjectIdField(mapLayer || layer)
        const oids = features.map(f => getAttrCI(f?.attributes || {}, oidField)).filter((v: any) => v !== undefined && v !== null)
        if (mapLayer && oids.length) {
          try {
            const lv = await mapView.whenLayerView(mapLayer)
            highlightRef.current = lv?.highlight?.(oids)
          } catch {}
        }
      }

      if (mapView && zoomAllaRicerca) {
        try {
          const geometries = features.map(f => f.geometry).filter(Boolean)
          if (geometries.length === 1 && zoomScale > 0 && txt(geometries[0]?.type).toLowerCase() === 'point') {
            await mapView.goTo({ target: geometries[0], scale: zoomScale }, { duration: 500 })
          } else if (geometries.length) {
            await mapView.goTo(geometries, { duration: 500 })
          }
        } catch {}
      }

      const azioni: string[] = []
      if (mapView && evidenziaRisultati) azioni.push('risultati evidenziati')
      if (mapView && zoomAllaRicerca) azioni.push('zoom aggiornato')
      setStatus({ kind: 'ok', text: `${count} feature trovate${azioni.length ? `. ${azioni.join(', ')}.` : '.'}` })
    } catch (e: any) {
      setStatus({ kind: 'err', text: `Errore ricerche catastali: ${e?.message || String(e)}` })
    } finally {
      setBusy(false)
    }
  }, [layer, richiediFoglio, foglio, fields, comune, sezione, mostraSezione, mappale, mapView, cfg.layerUrl, cfg.layerTitle, maxResultFeatures, evidenziaRisultati, zoomAllaRicerca, zoomScale, clearHighlight])

  const styles = css`
    width: 100%;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;

    .giiCatWrap {
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 10px;
      background: var(--bs-body-bg, #fff);
      overflow: hidden;
      box-sizing: border-box;
    }

    .tabBar {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: var(--bs-body-bg, #fff);
    }

    .tabBtn {
      border: 1px solid #2f6fed;
      background: #eaf2ff;
      color: #1d4ed8;
      padding: 8px 10px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 12px;
      line-height: 1;
      white-space: nowrap;
    }

    .integratedFilters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      align-items: end;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: rgba(0, 0, 0, 0.015);
      box-sizing: border-box;
    }

    .filterLabel {
      display: block;
      margin-bottom: 5px;
      font-size: 10.5px;
      font-weight: 800;
      line-height: 1;
      color: rgba(0, 0, 0, 0.56);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .filterSelect {
      width: 100%;
      height: 34px;
      border: 1px solid rgba(0, 0, 0, 0.14);
      border-radius: 10px;
      background: #fff;
      color: #111827;
      padding: 0 10px;
      font-size: 12px;
      outline: none;
      box-sizing: border-box;
    }

    .filterSelect:focus {
      border-color: rgba(47, 111, 237, 0.75);
      box-shadow: 0 0 0 2px rgba(47, 111, 237, 0.12);
    }

    .filterSelect:disabled {
      background: rgba(0, 0, 0, 0.035);
      color: rgba(0, 0, 0, 0.38);
      cursor: not-allowed;
    }


    .searchSelect {
      position: relative;
      width: 100%;
    }

    .searchInput {
      padding-right: 28px;
    }

    .searchSelectChevron {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 10px;
      line-height: 1;
      color: rgba(0, 0, 0, 0.48);
      pointer-events: none;
    }

    .filterSelect:disabled + .searchSelectChevron {
      color: rgba(0, 0, 0, 0.28);
    }

    .searchMenu {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 4px);
      z-index: 20;
      max-height: 220px;
      overflow-y: auto;
      padding: 4px;
      border: 1px solid rgba(0, 0, 0, 0.14);
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
      box-sizing: border-box;
    }

    .searchOption {
      width: 100%;
      min-height: 30px;
      display: flex;
      align-items: center;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #111827;
      padding: 6px 8px;
      font-size: 12px;
      line-height: 1.2;
      text-align: left;
      cursor: pointer;
      box-sizing: border-box;
    }

    .searchOption:hover,
    .searchOption.active {
      background: rgba(47, 111, 237, 0.10);
      color: #1d4ed8;
    }

    .searchOption.empty {
      cursor: default;
      color: rgba(0, 0, 0, 0.42);
    }

    .searchOption.empty:hover {
      background: transparent;
      color: rgba(0, 0, 0, 0.42);
    }

    .btnRow {
      display: flex;
      gap: 8px;
      align-items: end;
    }

    .primaryBtn,
    .clearBtn {
      height: 34px;
      min-width: 86px;
      padding: 0 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      white-space: nowrap;
      box-sizing: border-box;
    }

    .primaryBtn {
      border: 1px solid #2f6fed;
      background: #2f6fed;
      color: #fff;
    }

    .clearBtn {
      border: 1px solid rgba(0, 0, 0, 0.14);
      background: #fff;
      color: #111827;
    }

    .primaryBtn:disabled,
    .clearBtn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .filtersSummary {
      padding: 7px 12px 9px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      font-size: 11px;
      line-height: 1.35;
      color: rgba(0, 0, 0, 0.56);
      background: rgba(0, 0, 0, 0.015);
    }

    .filtersSummary.ok { color: rgba(0, 0, 0, 0.62); }
    .filtersSummary.loading { color: #1d4ed8; }
    .filtersSummary.warn { color: #9a3412; }
    .filtersSummary.err { color: #b91c1c; }

    .placeholder {
      padding: 12px;
      color: rgba(0, 0, 0, 0.56);
      font-size: 12px;
      line-height: 1.45;
    }
  `

  const hasSelection = !!(comune || sezione || foglio || mappale)
  const canSearch = !!layer && !busy && (!richiediFoglio || !!foglio)

  return (
    <div css={styles}>
      {mapWidgetId && (
        <div style={{ display: 'none' }}>
          <JimuMapViewComponent
            useMapWidgetId={mapWidgetId}
            onActiveViewChange={(jmv: JimuMapView) => setMapView(jmv?.view || null)}
          />
        </div>
      )}

      <div className='giiCatWrap'>
        <div className='tabBar'>
          <div className='tabBtn'>Ricerche catastali</div>
        </div>

        <div className='integratedFilters'>
          <div>
            <label className='filterLabel'>Comune</label>
            <SearchableFilter
              value={comune}
              options={comuni}
              placeholder='- Tutti -'
              onChange={setComune}
              disabled={busy || !layer}
            />
          </div>

          {mostraSezione && (
            <div>
              <label className='filterLabel'>Sezione</label>
              <SearchableFilter
                value={sezione}
                options={sezioni}
                placeholder='- Tutte -'
                onChange={setSezione}
                disabled={busy || !comune || sezioni.length === 0}
              />
            </div>
          )}

          <div>
            <label className='filterLabel'>Foglio</label>
            <SearchableFilter
              value={foglio}
              options={fogli}
              placeholder='- Tutti -'
              onChange={setFoglio}
              disabled={busy || !comune || fogli.length === 0}
            />
          </div>

          <div>
            <label className='filterLabel'>Mappale</label>
            <SearchableFilter
              value={mappale}
              options={mappali}
              placeholder='- Tutti -'
              onChange={setMappale}
              disabled={busy || !foglio || mappali.length === 0}
            />
          </div>

          <div className='btnRow'>
            <button type='button' className='primaryBtn' onClick={applySearch} disabled={!canSearch}>{busy ? 'Attendere...' : 'Cerca'}</button>
            <button type='button' className='clearBtn' onClick={clearAll} disabled={busy || !hasSelection}>Reset</button>
          </div>
        </div>

        <div className={`filtersSummary ${status.kind}`}>
          {status.text}
          {!mapWidgetId && <span> Selezionare anche il widget Mappa nel setting per zoom ed evidenziazione.</span>}
        </div>

        {!normalizeLayerUrl(cfg.layerUrl, cfg.layerLayerId) && !txt(cfg.layerTitle).trim() && !txt(cfg.layerId).trim() && !txt(cfg.layerLayerId).trim() && (
          <div className='placeholder'>
            Configurare nel setting il widget Mappa, il layer catastale e i nomi dei campi Comune, Sezione, Foglio e Mappale.
          </div>
        )}
      </div>
    </div>
  )
}

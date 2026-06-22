export type GiiPrintableMapLayerItem = {
  key: string
  title: string
  visible: boolean
  layer: any
  ancestors: any[]
}

export type GiiMapLegendItem = {
  key: string
  label: string
  groupLabel?: string
  layerLabel?: string
  kind: 'point' | 'line' | 'polygon' | 'parcel'
  image?: {
    contentType: string
    imageData: string
    width?: number
    height?: number
  }
}

export type GiiPrintableMapLayerNode = {
  key: string
  title: string
  visible: boolean
  layer: any
  children: GiiPrintableMapLayerNode[]
  item?: GiiPrintableMapLayerItem
}

export type GiiMapLegendBuildOptions = {
  mapLayerVisibility?: Record<string, boolean>
  mapTarget?: any
  symbolUtils?: any
  printExtent?: { xmin: number; ymin: number; xmax: number; ymax: number; spatialReference?: any }
  ExtentCtor?: any
}

// Dimensioni fisiche della porzione di mappa realmente mantenuta dal PDF prodotto
// dal servizio Stampa ArcGIS, prima del reinserimento nell'elaborato CBSM.
// Devono restare allineate al crop usato in technical-document-header.ts.
// Usate in computePrintExtentForView.
function sourcePrintMapFramePx (sourceLayout?: string): { width: number; height: number } {
  const layout = String(sourceLayout || '').toUpperCase()
  const ptToPx = 96 / 72
  if (layout === 'MAP_ONLY') return { width: 511.28 * ptToPx, height: 584.89 * ptToPx }
  const sourceWidth = layout.includes('LANDSCAPE') ? 841.89 : 595.28
  const sourceHeight = layout.includes('LANDSCAPE') ? 595.28 : 841.89
  if (sourceWidth > sourceHeight) {
    return {
      width: sourceWidth * (0.94 - 0.06) * ptToPx,
      height: sourceHeight * (0.86 - 0.22) * ptToPx
    }
  }
  return {
    width: sourceWidth * (0.855 - 0.145) * ptToPx,
    height: sourceHeight * (0.81 - 0.265) * ptToPx
  }
}

/**
 * Calcola l'extent reale della porzione di mappa visibile nel PDF finale,
 * centrato sul centro corrente della view, alla scala indicata.
 * Restituisce null se i dati sono insufficienti.
 */
export function computePrintExtentForView (view: any, scale: number, sourceLayout?: string): ReturnType<typeof extentToRestGeometry> {
  if (!view?.extent) return null
  const sr = view.spatialReference
  const wkid = Number(sr?.wkid || sr?.latestWkid || 0)
  const srJson = typeof sr?.toJSON === 'function' ? sr.toJSON() : { wkid: wkid || 3857 }

  // La resolution deve corrispondere alla scala di STAMPA richiesta (scale), non alla scala
  // attuale della view. view.resolution/view.scale è il rapporto unità-SR/pixel a schermo:
  // resolution_per_printScale = (view.resolution / view.scale) * printScale.
  // Se view.scale non è disponibile, usa la costante ArcGIS standard a 96dpi.
  const viewScale = Number(view.scale)
  const viewResolution = Number(view.resolution)
  const resolution: number = (viewScale > 0 && viewResolution > 0)
    ? (viewResolution / viewScale) * scale
    : scale * 0.000264583  // fallback: ArcGIS usa 96dpi, 1inch=0.0254m → 0.0254/96=0.000264583

  const mapFrame = sourcePrintMapFramePx(sourceLayout)
  const halfW = (mapFrame.width / 2) * resolution
  const halfH = (mapFrame.height / 2) * resolution

  const cx = Number((view.extent.xmin + view.extent.xmax) / 2)
  const cy = Number((view.extent.ymin + view.extent.ymax) / 2)
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(halfW) || halfW <= 0) return null
  return { xmin: cx - halfW, ymin: cy - halfH, xmax: cx + halfW, ymax: cy + halfH, spatialReference: srJson }
}

function collectLayerListOrder (collection: any): any[] {
  const items: any[] = []
  try { collection?.forEach?.((l: any) => items.push(l)) } catch {}
  return items.reverse()
}

function mapLayerKey (layer: any, idx: string): string {
  return String(layer?.id || layer?.uid || layer?.title || layer?.url || `layer_${idx}`).replace(/\s+/g, '_')
}

export function listGiiPrintableMapLayerTree (view: any): GiiPrintableMapLayerNode[] {
  const seen = new Set<string>()
  const makeNode = (layer: any, idxPath: string, ancestors: any[], ancestorVisible: boolean): GiiPrintableMapLayerNode | null => {
    if (!layer) return null
    const children: any[] = []
    children.push(...collectLayerListOrder(layer?.layers))
    children.push(...collectLayerListOrder(layer?.sublayers))
    const title = String(layer?.title || layer?.id || layer?.name || `Layer ${idxPath}`)
    const keyBase = mapLayerKey(layer, idxPath)
    const key = seen.has(keyBase) ? `${keyBase}_${idxPath}` : keyBase
    seen.add(key)
    const visible = ancestorVisible && layer?.visible !== false
    const childNodes = children
      .map((child, childIdx) => makeNode(child, `${idxPath}_${childIdx}`, [...ancestors, layer], visible))
      .filter(Boolean) as GiiPrintableMapLayerNode[]
    const node: GiiPrintableMapLayerNode = { key, title, visible, layer, children: childNodes }
    if (!childNodes.length) node.item = { key, title, visible, layer, ancestors }
    return node
  }
  const out: GiiPrintableMapLayerNode[] = []
  try {
    collectLayerListOrder(view?.map?.layers).forEach((layer, idx) => {
      const node = makeNode(layer, String(idx), [], true)
      if (node) out.push(node)
    })
  } catch {}
  return out
}

export function flattenGiiPrintableMapLayerTree (nodes: GiiPrintableMapLayerNode[]): GiiPrintableMapLayerItem[] {
  const out: GiiPrintableMapLayerItem[] = []
  const walk = (node: GiiPrintableMapLayerNode) => {
    if (node.item) out.push(node.item)
    node.children.forEach(walk)
  }
  nodes.forEach(walk)
  return out
}

export function listGiiPrintableMapLayers (view: any): GiiPrintableMapLayerItem[] {
  return flattenGiiPrintableMapLayerTree(listGiiPrintableMapLayerTree(view))
}

function normalizeLegendText (raw: any): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function legendKindForLayer (layer: any, label: string): GiiMapLegendItem['kind'] {
  const normalized = normalizeLegendText(label)
  if (
    normalized.includes('particell') ||
    normalized.includes('catast') ||
    normalized.includes('mappal') ||
    normalized.includes('foglio') ||
    normalized.includes('parcell') ||
    normalized.includes('parcel')
  ) return 'parcel'
  const geometryType = String(layer?.geometryType || '').toLowerCase()
  if (geometryType.includes('point')) return 'point'
  if (geometryType.includes('polyline') || geometryType.includes('line')) return 'line'
  return 'polygon'
}

function rendererForLayer (layer: any): any {
  return layer?.renderer || layer?.drawingInfo?.renderer || layer?.sourceJSON?.drawingInfo?.renderer || layer?.source?.renderer || null
}

function normalizedRendererType (renderer: any): string {
  const raw = String(renderer?.type || '').toLowerCase().replace(/[_\s-]/g, '')
  if (raw === 'uniquevalue') return 'unique-value'
  if (raw === 'classbreaks' || raw === 'classbreak') return 'class-breaks'
  if (raw === 'simple') return 'simple'
  return raw
}

type RendererSymbolInfo = {
  symbol: any
  label: string
  values?: string[]
  minValue?: number
  maxValue?: number
  defaultSymbol?: boolean
}

function rendererFields (renderer: any): string[] {
  const type = normalizedRendererType(renderer)
  if (type === 'unique-value') return Array.from(new Set([renderer?.field, renderer?.field1, renderer?.field2, renderer?.field3].map(v => String(v || '').trim()).filter(Boolean)))
  if (type === 'class-breaks') return [String(renderer?.field || '').trim()].filter(Boolean)
  return []
}

function legendQueryOutFields (renderer: any): string[] {
  const fields = rendererFields(renderer)
  return fields.length ? fields : ['*']
}

function rendererValueForFeature (renderer: any, attrs: Record<string, any>): string {
  const fields = rendererFields(renderer)
  const delimiter = String(renderer?.fieldDelimiter || ', ')
  if (!fields.length) return ''
  return fields.map(field => String(attrs?.[field] ?? '')).join(delimiter)
}

function uniqueValueGroupInfos (renderer: any, layerLabel: string): RendererSymbolInfo[] {
  const groups = Array.isArray(renderer?.uniqueValueGroups) ? renderer.uniqueValueGroups : []
  const out: RendererSymbolInfo[] = []
  const flattenValues = (values: any[]): any[] => values.reduce((acc: any[], value: any) => {
    if (Array.isArray(value)) acc.push(...flattenValues(value))
    else acc.push(value)
    return acc
  }, [])
  groups.forEach((group: any) => {
    const classes = Array.isArray(group?.classes) ? group.classes : []
    classes.forEach((cls: any) => {
      const values = Array.isArray(cls?.values) ? flattenValues(cls.values) : []
      const label = String(cls?.label || values?.[0] || layerLabel || '').trim()
      if (cls?.symbol && label) out.push({ symbol: cls.symbol, label, values: values.map(v => String(v ?? '')) })
    })
  })
  return out
}

function uniqueValueInfoValues (info: any): string[] {
  const values: any[] = []
  if (info?.value != null) values.push(info.value)
  if (Array.isArray(info?.values)) {
    const flatten = (items: any[]): void => {
      items.forEach(item => {
        if (Array.isArray(item)) flatten(item)
        else values.push(item)
      })
    }
    flatten(info.values)
  }
  return Array.from(new Set(values.map(v => String(v ?? '').trim()).filter(Boolean)))
}

function symbolInfosForRenderer (layer: any, layerLabel: string): RendererSymbolInfo[] {
  const renderer = rendererForLayer(layer)
  if (!renderer) return []
  const type = normalizedRendererType(renderer)
  if (type === 'unique-value') {
    const infos = Array.isArray(renderer.uniqueValueInfos) ? renderer.uniqueValueInfos : []
    const out = infos
      .map((info: any) => ({
        symbol: info?.symbol,
        label: String(info?.label || info?.value || layerLabel || '').trim(),
        values: uniqueValueInfoValues(info)
      }))
      .filter((info: { symbol: any; label: string }) => !!info.symbol && !!info.label)
    out.push(...uniqueValueGroupInfos(renderer, layerLabel))
    if (renderer.defaultSymbol) {
      const label = String(renderer.defaultLabel || layerLabel || '').trim()
      if (label) out.push({ symbol: renderer.defaultSymbol, label, defaultSymbol: true })
    }
    return out
  }
  if (type === 'class-breaks') {
    const infos = Array.isArray(renderer.classBreakInfos) ? renderer.classBreakInfos : []
    const out = infos
      .map((info: any) => ({
        symbol: info?.symbol,
        label: String(info?.label || layerLabel || '').trim(),
        minValue: Number(info?.minValue),
        maxValue: Number(info?.maxValue)
      }))
      .filter((info: { symbol: any; label: string }) => !!info.symbol && !!info.label)
    if (renderer.defaultSymbol) {
      const label = String(renderer.defaultLabel || layerLabel || '').trim()
      if (label) out.push({ symbol: renderer.defaultSymbol, label, defaultSymbol: true })
    }
    return out
  }
  const symbol = renderer.symbol || renderer.defaultSymbol
  const label = String(renderer.label || renderer.defaultLabel || layerLabel || '').trim()
  return symbol && label ? [{ symbol, label }] : []
}

function featureMatchesSymbolInfo (renderer: any, info: RendererSymbolInfo, attrs: Record<string, any>): boolean {
  const type = normalizedRendererType(renderer)
  if (info.defaultSymbol) return false
  const attrValues = Object.keys(attrs || {}).map(field => normalizeLegendText(attrs[field])).filter(Boolean)
  if (!renderer && (info.values || []).length) {
    return (info.values || []).some(v => attrValues.includes(normalizeLegendText(v)))
  }
  if (type === 'unique-value') {
    const value = normalizeLegendText(rendererValueForFeature(renderer, attrs))
    return (info.values || []).some(v => {
      const normalized = normalizeLegendText(v)
      return normalized === value || attrValues.includes(normalized)
    })
  }
  if (type === 'class-breaks') {
    const field = String(renderer?.field || '').trim()
    const value = Number(attrs?.[field])
    return Number.isFinite(value) && value >= Number(info.minValue) && value <= Number(info.maxValue)
  }
  return true
}

function filterSymbolInfosByFeatures (renderer: any, infos: RendererSymbolInfo[], features: any[] | null): RendererSymbolInfo[] {
  if (features == null) return infos
  if (!features.length) return []
  const type = normalizedRendererType(renderer)
  if (!renderer) return infos.filter(info => !(info.values || []).length || features.some(feature => featureMatchesSymbolInfo(renderer, info, feature?.attributes || {})))
  if (type !== 'unique-value' && type !== 'class-breaks') return infos
  const matched = infos.filter(info => features.some(feature => featureMatchesSymbolInfo(renderer, info, feature?.attributes || {})))
  return matched
}

function legendGroupLabelForItem (item: GiiPrintableMapLayerItem, layerLabel: string): string {
  const ancestor = (item.ancestors || []).find(a => String(a?.title || a?.id || a?.name || '').trim())
  return String(ancestor?.title || ancestor?.id || ancestor?.name || layerLabel || '').trim()
}

function layerVisibleAtScale (layer: any, scale: number): boolean {
  if (!layer || !Number.isFinite(scale) || scale <= 0) return true
  const minScale = Number(layer.minScale)
  const maxScale = Number(layer.maxScale)
  if (Number.isFinite(minScale) && minScale > 0 && scale > minScale) return false
  if (Number.isFinite(maxScale) && maxScale > 0 && scale < maxScale) return false
  return true
}

function itemVisibleAtPrintScale (item: GiiPrintableMapLayerItem, opts: GiiMapLegendBuildOptions, view: any): boolean {
  const scale = Number((opts as any)?.mapScale) || Number(view?.scale)
  if (!Number.isFinite(scale) || scale <= 0) return true
  if (!layerVisibleAtScale(item.layer, scale)) return false
  return !(item.ancestors || []).some(layer => !layerVisibleAtScale(layer, scale))
}

function legendItemKey (groupLabel: string, kind: string, label: string, image?: GiiMapLegendItem['image']): string {
  return JSON.stringify({ groupLabel, kind, label, img: image?.imageData || '' })
}

async function withTimeout<T> (promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  let timer: any = null
  try {
    return await Promise.race([
      Promise.resolve(promise).catch(() => fallback),
      new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), ms) })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function ensureGiiPrintableMapLayersReady (view: any): Promise<void> {
  if (!view?.map) return
  try { await withTimeout(Promise.resolve(view.when?.()), null, 150) } catch {}
  try {
    const layers = listGiiPrintableMapLayers(view)
    await withTimeout(Promise.all(layers.slice(0, 48).map(item => {
      const loaders = [item.layer, ...(item.ancestors || [])]
        .filter(Boolean)
        .map(layer => typeof layer?.load === 'function' ? layer.load().catch((): null => null) : Promise.resolve(null))
      return Promise.all(loaders)
    })), null as any, 2500)
  } catch {}
  try { view.requestRender?.() } catch {}
}

function dataUrlToLegendImage (src: string, width?: number, height?: number): GiiMapLegendItem['image'] | null {
  const match = String(src || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { contentType: match[1], imageData: match[2], width, height }
}

function canvasToCroppedLegendImage (canvas: HTMLCanvasElement, normalizeVisibleContent = false): GiiMapLegendItem['image'] | null {
  try {
    if (canvas.width <= 0 || canvas.height <= 0) return dataUrlToLegendImage(canvas.toDataURL('image/png'), canvas.width, canvas.height)
    const normalized = document.createElement('canvas')
    normalized.width = 24
    normalized.height = 24
    const ctx = normalized.getContext('2d')
    if (!ctx) return dataUrlToLegendImage(canvas.toDataURL('image/png'), canvas.width, canvas.height)
    let sx = 0
    let sy = 0
    let sw = canvas.width
    let sh = canvas.height
    if (normalizeVisibleContent) {
      const sourceCtx = canvas.getContext('2d')
      const data = sourceCtx?.getImageData?.(0, 0, canvas.width, canvas.height)
      if (data) {
        let minX = canvas.width
        let minY = canvas.height
        let maxX = -1
        let maxY = -1
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const a = data.data[(y * canvas.width + x) * 4 + 3]
            if (a > 6) {
              if (x < minX) minX = x
              if (y < minY) minY = y
              if (x > maxX) maxX = x
              if (y > maxY) maxY = y
            }
          }
        }
        if (maxX >= minX && maxY >= minY) {
          sx = Math.max(0, minX - 1)
          sy = Math.max(0, minY - 1)
          sw = Math.min(canvas.width - sx, maxX - minX + 3)
          sh = Math.min(canvas.height - sy, maxY - minY + 3)
        }
      }
    }
    const target = normalizeVisibleContent ? 20 : 24
    const ratio = Math.min(target / Math.max(1, sw), target / Math.max(1, sh))
    const w = Math.max(1, sw * ratio)
    const h = Math.max(1, sh * ratio)
    ctx.drawImage(canvas, sx, sy, sw, sh, (normalized.width - w) / 2, (normalized.height - h) / 2, w, h)
    return dataUrlToLegendImage(normalized.toDataURL('image/png'), normalized.width, normalized.height)
  } catch {
    return dataUrlToLegendImage(canvas.toDataURL('image/png'), canvas.width, canvas.height)
  }
}

function findPreviewElement (root: any): any {
  if (!root) return null
  if (root.tagName) return root
  return root.querySelector?.('canvas,img,svg') || root.firstElementChild || root
}

async function svgToPngLegendImage (svg: SVGElement, normalizeVisibleContent: boolean): Promise<GiiMapLegendItem['image'] | null> {
  try {
    const xml = new XMLSerializer().serializeToString(svg)
    const src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`
    const width = Number(svg.getAttribute('width')) || 24
    const height = Number(svg.getAttribute('height')) || 24
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('svg preview load failed'))
      img.src = src
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, width)
    canvas.height = Math.max(1, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvasToCroppedLegendImage(canvas, normalizeVisibleContent)
  } catch {
    return null
  }
}

async function legendImageFromPreviewElement (el: any, normalizeVisibleContent: boolean): Promise<GiiMapLegendItem['image'] | null> {
  const target = findPreviewElement(el)
  if (!target) return null
  const tag = String(target.tagName || '').toLowerCase()
  try {
    if (tag === 'canvas' && typeof target.toDataURL === 'function') {
      return canvasToCroppedLegendImage(target as HTMLCanvasElement, normalizeVisibleContent)
    }
    if (tag === 'img') {
      const src = String(target.src || '')
      const canvas = document.createElement('canvas')
      canvas.width = Number(target.naturalWidth || target.width) || 24
      canvas.height = Number(target.naturalHeight || target.height) || 24
      const ctx = canvas.getContext('2d')
      if (!ctx) return dataUrlToLegendImage(src, Number(target.naturalWidth || target.width) || undefined, Number(target.naturalHeight || target.height) || undefined)
      ctx.drawImage(target, 0, 0, canvas.width, canvas.height)
      return canvasToCroppedLegendImage(canvas, normalizeVisibleContent)
    }
    if (tag === 'svg') {
      return await svgToPngLegendImage(target as SVGElement, normalizeVisibleContent)
    }
    const nested = target.querySelector?.('canvas,img,svg')
    if (nested && nested !== target) return await legendImageFromPreviewElement(nested, normalizeVisibleContent)
  } catch {}
  return null
}

async function renderOfficialClientSymbolImage (symbolUtils: any, symbol: any, kind: GiiMapLegendItem['kind']): Promise<GiiMapLegendItem['image'] | null> {
  if (!symbolUtils || !symbol || typeof document === 'undefined') return null
  const render = symbolUtils.renderPreviewHTML || symbolUtils.renderPreviewHTMLForSymbol
  if (typeof render !== 'function') return null
  const host = document.createElement('div')
  host.style.cssText = 'position:absolute;left:-10000px;top:-10000px;width:32px;height:32px;overflow:hidden;'
  try {
    document.body?.appendChild?.(host)
    const result = await withTimeout(Promise.resolve(render.call(symbolUtils, symbol, { node: host, size: 24 })), null, 450)
    await withTimeout(new Promise(resolve => setTimeout(resolve, 20)), null, 60)
    const image = await legendImageFromPreviewElement(result || host, kind === 'point')
    if (image) return image
  } finally {
    try { host.remove() } catch {}
  }
  return null
}

function cssColorFromArcgisColor (raw: any): string | null {
  const color = Array.isArray(raw)
    ? raw
    : (Array.isArray(raw?.toRgba?.())
        ? raw.toRgba()
        : (raw && typeof raw === 'object' && ('r' in raw || 'g' in raw || 'b' in raw)
            ? [raw.r, raw.g, raw.b, raw.a ?? raw.alpha ?? 1]
            : null))
  if (!color || color.length < 3) return null
  const r = Math.max(0, Math.min(255, Number(color[0]) || 0))
  const g = Math.max(0, Math.min(255, Number(color[1]) || 0))
  const b = Math.max(0, Math.min(255, Number(color[2]) || 0))
  const aRaw = color.length >= 4 ? Number(color[3]) : 255
  const a = Math.max(0, Math.min(1, Number.isFinite(aRaw) ? (aRaw > 1 ? aRaw / 255 : aRaw) : 1))
  return `rgba(${r},${g},${b},${a})`
}

function renderArcgisJsonSymbolImage (symbol: any, kind: GiiMapLegendItem['kind']): GiiMapLegendItem['image'] | null {
  if (!symbol || typeof document === 'undefined') return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 24
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const lineColor = cssColorFromArcgisColor(symbol.color || symbol.outline?.color)
    const fillColor = cssColorFromArcgisColor(symbol.color)
    const outlineColor = cssColorFromArcgisColor(symbol.outline?.color || symbol.color)
    const width = Math.max(1.2, Math.min(8, Number(symbol.width ?? symbol.outline?.width ?? 2) || 2))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (kind === 'line') {
      if (!lineColor) return null
      ctx.strokeStyle = lineColor
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(3, 12)
      ctx.lineTo(29, 12)
      ctx.stroke()
      return canvasToCroppedLegendImage(canvas, false)
    }
    if (kind === 'point') {
      if (!fillColor && !outlineColor) return null
      ctx.beginPath()
      ctx.arc(16, 12, 5.5, 0, Math.PI * 2)
      if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fill()
      }
      if (outlineColor) {
        ctx.strokeStyle = outlineColor
        ctx.lineWidth = Math.max(1, width)
        ctx.stroke()
      }
      return canvasToCroppedLegendImage(canvas, true)
    }
    if (!fillColor && !outlineColor) return null
    if (fillColor) {
      ctx.fillStyle = fillColor
      ctx.fillRect(5, 6, 22, 12)
    }
    if (outlineColor) {
      ctx.strokeStyle = outlineColor
      ctx.lineWidth = Math.max(1, width)
      ctx.strokeRect(5, 6, 22, 12)
    }
    return canvasToCroppedLegendImage(canvas, false)
  } catch {
    return null
  }
}

function renderParcelLegendImage (): GiiMapLegendItem['image'] | null {
  if (typeof document === 'undefined') return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 24
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 1.8
    ctx.strokeRect(5, 6, 22, 12)
    return canvasToCroppedLegendImage(canvas, false)
  } catch {
    return null
  }
}

type ArcgisLegendEntry = {
  label: string
  contentType: string
  imageData: string
  width?: number
  height?: number
  values?: any[]
}

const legendCache = new Map<string, Promise<ArcgisLegendEntry[]>>()

function serviceLegendUrlForLayer (layer: any): { url: string; layerId: string } | null {
  const candidates = [
    layer?.parsedUrl?.value,
    layer?.serviceUrl,
    layer?.url,
    layer?.parent?.parsedUrl?.value,
    layer?.parent?.serviceUrl,
    layer?.parent?.url
  ]
  const raw = candidates.map(u => String(u || '').trim().replace(/\/+$/, '')).find(u => u.startsWith('http'))
    ?? String(layer?.url || layer?.parent?.url || '').trim().replace(/\/+$/, '')
  if (!raw) return null
  const match = raw.match(/\/(FeatureServer|MapServer)\/(\d+)$/i)
  const explicitLayerId = layer?.layerId ?? layer?.sublayerId
  if (!match && explicitLayerId == null) return null
  if (!match) {
    return {
      url: `${raw}/legend?f=pjson`,
      layerId: String(explicitLayerId)
    }
  }
  return {
    url: `${raw.slice(0, raw.length - match[2].length - 1)}/legend?f=pjson`,
    layerId: match[2]
  }
}

function serviceQueryUrlForLayer (layer: any): string | null {
  const candidates = [
    layer?.parsedUrl?.value,
    layer?.serviceUrl,
    layer?.url,
    layer?.parent?.parsedUrl?.value,
    layer?.parent?.serviceUrl,
    layer?.parent?.url
  ]
  const raw = candidates.map(u => String(u || '').trim().replace(/\/+$/, '')).find(u => u.startsWith('http'))
    ?? String(layer?.url || layer?.parent?.url || '').trim().replace(/\/+$/, '')
  if (!raw) return null
  const match = raw.match(/\/(FeatureServer|MapServer)\/(\d+)$/i)
  if (match) return `${raw}/query`
  const explicitLayerId = layer?.layerId ?? layer?.sublayerId
  if (explicitLayerId == null) return null
  return `${raw}/${explicitLayerId}/query`
}

function extentToRestGeometry (extent: any): Record<string, any> | null {
  const xmin = Number(extent?.xmin)
  const ymin = Number(extent?.ymin)
  const xmax = Number(extent?.xmax)
  const ymax = Number(extent?.ymax)
  if (![xmin, ymin, xmax, ymax].every(Number.isFinite)) return null
  const sr = typeof extent?.spatialReference?.toJSON === 'function'
    ? extent.spatialReference.toJSON()
    : { wkid: Number(extent?.spatialReference?.wkid) || 3857 }
  return { xmin, ymin, xmax, ymax, spatialReference: sr }
}

async function fetchOfficialLegendEntries (layer: any): Promise<ArcgisLegendEntry[]> {
  const info = serviceLegendUrlForLayer(layer)
  if (!info) return []
  const cacheKey = `${info.url}#${info.layerId}`
  if (!legendCache.has(cacheKey)) {
    legendCache.set(cacheKey, (async () => {
      try {
        const token = await getArcgisToken(info.url)
        const url = token ? `${info.url}&token=${token}` : info.url
        const resp = await withTimeout(fetch(url), null as any, 3000)
        if (!resp || !resp.ok) return []
        const json = await resp.json()
        if (json?.error) return []
        const layerLegend = (Array.isArray(json?.layers) ? json.layers : []).find((l: any) => String(l?.layerId) === String(info.layerId))
        const entries = Array.isArray(layerLegend?.legend) ? layerLegend.legend : []
        return entries
          .map((entry: any) => ({
            label: String(entry?.label || '').trim(),
            contentType: String(entry?.contentType || 'image/png').trim(),
            imageData: String(entry?.imageData || '').trim(),
            width: Number(entry?.width) || undefined,
            height: Number(entry?.height) || undefined,
            values: Array.isArray(entry?.values) ? entry.values : []
          }))
          .filter((entry: ArcgisLegendEntry) => !!entry.imageData)
      } catch {
        return []
      }
    })())
  }
  return await withTimeout(legendCache.get(cacheKey) || Promise.resolve([]), [], 3200)
}

function officialLegendEntryForLabel (entries: ArcgisLegendEntry[], label: string): ArcgisLegendEntry | null {
  if (!entries.length) return null
  const normalizedLabel = normalizeLegendText(label)
  const byLabel = entries.find(entry => normalizeLegendText(entry.label) === normalizedLabel)
  if (byLabel) return byLabel
  const byValue = entries.find(entry => (entry.values || []).some(v => normalizeLegendText(v) === normalizedLabel))
  if (byValue) return byValue
  if (entries.length === 1) return entries[0]
  return null
}

async function getArcgisToken (url: string): Promise<string> {
  try {
    const esriId = (window as any).__esri?.id || (window as any).esriConfig?.identity
    if (esriId?.getCredential) {
      const cred = await Promise.race([
        Promise.resolve(esriId.getCredential(url, { prompt: false })).catch((): null => null),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 800))
      ])
      if ((cred as any)?.token) return String((cred as any).token)
    }
  } catch {}
  return ''
}

/**
 * Unica query per layer: una sola chiamata REST con outFields del renderer.
 * Strategia: JS API queryFeatures (porta autenticazione automaticamente) con timeout
 * ragionevole; se fallisce, REST fetch con token esplicito. Nessuna doppia query.
 * Budget totale per layer: ~4s (2s JS API + 2s REST fallback).
 */
async function queryLegendFeaturesInExtent (layer: any, view: any, renderer: any, printExtent?: GiiMapLegendBuildOptions['printExtent'], ExtentCtor?: any, presenceOnly = false): Promise<any[] | null> {
  if (!layer) return null
  const extentGeom = printExtent ?? extentToRestGeometry(view?.extent)
  if (!extentGeom) return null

  const outFields = legendQueryOutFields(renderer)
  // Costruisce una vera istanza Extent quando disponibile: l'operatore spaziale 'intersects'
  // su query verso layer poligonali richiede la geometria reale della classe ArcGIS, non un
  // plain object — altrimenti il test di intersezione punto-vs-extent spesso funziona comunque
  // (degenera a confronto di coordinate) mentre poligono-vs-extent fallisce silenziosamente.
  const geomObj = ExtentCtor
    ? new ExtentCtor({
        xmin: extentGeom.xmin, ymin: extentGeom.ymin,
        xmax: extentGeom.xmax, ymax: extentGeom.ymax,
        spatialReference: extentGeom.spatialReference
      })
    : {
        type: 'extent',
        xmin: extentGeom.xmin, ymin: extentGeom.ymin,
        xmax: extentGeom.xmax, ymax: extentGeom.ymax,
        spatialReference: extentGeom.spatialReference
      }

  // Tentativo 1: JS API queryFeatures — porta il token automaticamente
  try {
    if (typeof layer.queryFeatures === 'function') {
      const q = typeof layer.createQuery === 'function' ? layer.createQuery() : {}
      q.geometry = geomObj
      q.spatialRelationship = 'intersects'
      q.returnGeometry = false
      if (!String(q.where || '').trim()) {
        const where = String(layer?.definitionExpression || layer?.parent?.definitionExpression || '').trim()
        if (where) q.where = where
      }
      if (presenceOnly && typeof layer.queryFeatureCount === 'function') {
        const count = await withTimeout(layer.queryFeatureCount(q), null as any, 3500)
        if (Number.isFinite(Number(count))) {
          return Number(count) > 0 ? [{ attributes: {} }] : []
        }
      }
      q.outFields = outFields
      q.num = 10
      const res = await withTimeout(layer.queryFeatures(q), null, 2500)
      if (Array.isArray(res?.features)) {
        return res.features
      }
    }
  } catch {
  }

  // Tentativo 2: REST fetch con token esplicito
  const queryUrl = serviceQueryUrlForLayer(layer)
  if (!queryUrl) return null
  try {
    const token = await getArcgisToken(queryUrl)
    const params = new URLSearchParams()
    params.set('f', 'json')
    const where = String(layer?.definitionExpression || layer?.parent?.definitionExpression || '').trim()
    params.set('where', where || '1=1')
    params.set('geometry', JSON.stringify(extentGeom))
    params.set('geometryType', 'esriGeometryEnvelope')
    params.set('inSR', String(extentGeom.spatialReference?.wkid || extentGeom.spatialReference?.latestWkid || ''))
    params.set('spatialRel', 'esriSpatialRelIntersects')
    if (presenceOnly) {
      params.set('returnCountOnly', 'true')
    } else {
      params.set('returnGeometry', 'false')
      params.set('outFields', outFields.join(','))
      params.set('resultRecordCount', '10')
    }
    if (token) params.set('token', token)
    const resp = await withTimeout(fetch(`${queryUrl}?${params.toString()}`), null as any, presenceOnly ? 3500 : 2500)
    if (!resp || !resp.ok) return null
    const json = await resp.json()
    if (json?.error) return null
    if (presenceOnly && Number.isFinite(Number(json?.count))) {
      return Number(json.count) > 0 ? [{ attributes: {} }] : []
    }
    return Array.isArray(json?.features) ? json.features : null
  } catch {
    return null
  }
}

async function buildLegendItemsForLayerInExtent (
  view: any,
  item: GiiPrintableMapLayerItem,
  opts: GiiMapLegendBuildOptions
): Promise<GiiMapLegendItem[]> {
  if (!item?.key) return []
  if (Object.prototype.hasOwnProperty.call(opts?.mapLayerVisibility || {}, item.key) && opts.mapLayerVisibility?.[item.key] === false) return []
  // Se mapLayerVisibility non specifica questo layer, usa la visibilità effettiva del layer
  if (!Object.prototype.hasOwnProperty.call(opts?.mapLayerVisibility || {}, item.key) && item.layer?.visible === false) return []
  if ((item.ancestors || []).some(layer => layer?.visible === false)) return []
  if (!itemVisibleAtPrintScale(item, opts, view)) return []
  try {
    await withTimeout(Promise.all([item.layer, ...(item.ancestors || [])]
      .filter(Boolean)
      .map(layer => typeof layer?.load === 'function' ? layer.load().catch((): null => null) : Promise.resolve(null))), null as any, 1800)
  } catch {}
  const label = String(item.title || item.layer?.title || item.layer?.id || item.layer?.name || '').trim()
  if (!label) return []
  const renderer = rendererForLayer(item.layer)
  const kind = legendKindForLayer(item.layer, label)
  const rendererType = normalizedRendererType(renderer)
  const categorizedRenderer = rendererType === 'unique-value' || rendererType === 'class-breaks'
  const presenceOnly = kind === 'parcel' || (!categorizedRenderer && !rendererFields(renderer).length)
  const features = await queryLegendFeaturesInExtent(item.layer, view, renderer, opts?.printExtent, opts?.ExtentCtor, presenceOnly)
  if (!Array.isArray(features) || !features.length) return []
  const groupLabel = legendGroupLabelForItem(item, label)
  const rendererInfos = kind === 'parcel'
    ? [{ symbol: null, label }]
    : filterSymbolInfosByFeatures(renderer, symbolInfosForRenderer(item.layer, label), features)
  const infos = rendererInfos.length ? rendererInfos : (categorizedRenderer ? [] : [{ symbol: null, label }])
  if (!infos.length) return []
  const restEntries = kind === 'parcel' ? [] : await withTimeout(fetchOfficialLegendEntries(item.layer), [], 3200)
  const seen = new Set<string>()
  const out: GiiMapLegendItem[] = []
  for (const info of infos) {
    const itemLabel = String(info.label || label).trim()
    if (!itemLabel) continue
    const key = legendItemKey(groupLabel, kind, itemLabel)
    if (seen.has(key)) continue
    seen.add(key)
    let image: GiiMapLegendItem['image'] | undefined
    const restEntry = officialLegendEntryForLabel(restEntries, itemLabel)
    if (kind === 'parcel') {
      image = renderParcelLegendImage() ?? undefined
    } else if (restEntry?.imageData) {
      image = { contentType: restEntry.contentType, imageData: restEntry.imageData, width: restEntry.width, height: restEntry.height }
    } else if (opts?.symbolUtils && info.symbol) {
      image = await renderOfficialClientSymbolImage(opts.symbolUtils, info.symbol, kind) ?? undefined
    }
    if (!image && info.symbol) {
      image = renderArcgisJsonSymbolImage(info.symbol, kind) ?? undefined
    }
    if (!image && kind !== 'parcel') continue
    out.push({ key: `${item.key}_${out.length}`, label: itemLabel, groupLabel, layerLabel: label, kind, ...(image ? { image } : {}) })
    if (out.length >= 4) break
  }
  return out
}

export async function buildGiiMapLegendItemsForView (
  view: any,
  layers: GiiPrintableMapLayerItem[],
  opts: GiiMapLegendBuildOptions,
  localizationLayerKeys: Set<string>,
  localizationRequested: boolean
): Promise<GiiMapLegendItem[]> {
  const out: GiiMapLegendItem[] = []
  try {
    if (localizationRequested && opts?.mapTarget) {
      out.push({ key: 'gii-marker-pratica', label: 'Localizzazione rilevazione', groupLabel: 'Pratica', layerLabel: 'Pratica', kind: 'point' })
    }
    const candidates = (layers || [])
      .filter(item => item?.key && !localizationLayerKeys.has(item.key))
      .filter(item => !(Object.prototype.hasOwnProperty.call(opts?.mapLayerVisibility || {}, item.key) && opts.mapLayerVisibility?.[item.key] === false))
      .slice(0, 32)
    const chunks = await withTimeout(Promise.all(candidates.map(item => (
      withTimeout(buildLegendItemsForLayerInExtent(view, item, opts), [], 6000)
    ))), [], 8000)
    const seen = new Set(out.map(item => legendItemKey(item.groupLabel || '', item.kind, item.label)))
    for (const chunk of chunks) {
      for (const item of chunk) {
        const key = legendItemKey(item.groupLabel || '', item.kind, item.label)
        if (seen.has(key)) continue
        seen.add(key)
        out.push(item)
        if (out.length >= 32) break
      }
      if (out.length >= 32) break
    }
  } catch {}
  return out
}

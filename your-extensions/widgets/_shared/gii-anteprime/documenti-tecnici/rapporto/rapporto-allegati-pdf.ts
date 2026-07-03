import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type RapportoExtraPdfOptions = {
  ds?: any
  oid?: number | null
  layerUrl?: string | null
  idFieldName?: string | null
  data?: Record<string, any> | null
  mapPointWgs84?: { x?: number; y?: number; longitude?: number; latitude?: number } | null
}

type AttachmentInfo = {
  id?: number
  name?: string
  size?: number
  contentType?: string
  url?: string
}

type AttachmentPayload = AttachmentInfo & {
  bytes?: Uint8Array
  kind: 'image' | 'pdf' | 'unsupported' | 'unavailable'
  error?: string
}

type MapCaptureResult = {
  bytes: Uint8Array
  scale: number | null
  basemapLabel: string
  cadastralLabel: string
  parcelLabel: string
}

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 42
const CADASTRAL_LAYER_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/Particelle/FeatureServer/131'
const MAP_SCALE = 1000

function isFiniteNum (v: any): boolean {
  return Number.isFinite(Number(v))
}

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any)?.require
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

function normalizeFeatureLayerUrl (raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    const u = new URL(s)
    if (!/^https?:$/i.test(u.protocol)) return ''
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

function ensureLayerIndex (url: string, layer?: any): string {
  if (!url) return url
  if (/\/\d+$/.test(url)) return url
  const layerId = layer?.layerId ?? layer?.layerIndex
  if (layerId != null && Number.isFinite(Number(layerId))) return `${url}/${Number(layerId)}`
  if (/\/(FeatureServer|MapServer)\s*$/i.test(url)) return `${url}/0`
  return url
}

function unwrapJsapiLayer (maybe: any): any {
  return (maybe && (maybe.layer || maybe)) || null
}

function pickAttrCI (obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined
  const low = new Map<string, any>()
  Object.keys(obj).forEach(k => low.set(String(k).toLowerCase(), obj[k]))
  for (const k of keys) {
    const kk = String(k || '').toLowerCase()
    if (low.has(kk)) return low.get(kk)
  }
  return undefined
}

function normalizeWgs84Point (pt: any): { x: number; y: number } | null {
  if (!pt) return null
  const x = Number(pt.x ?? pt.longitude)
  const y = Number(pt.y ?? pt.latitude)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (x === 0 && y === 0) return null
  if (Math.abs(x) > 180 || Math.abs(y) > 90) return null
  return { x, y }
}

function pointFromAttributes (data: any): { x: number; y: number } | null {
  const lat = pickAttrCI(data, ['latitude', 'lat', 'y', 'coord_y', 'coordinata_y'])
  const lon = pickAttrCI(data, ['longitude', 'lon', 'lng', 'x', 'coord_x', 'coordinata_x'])
  if (!isFiniteNum(lat) || !isFiniteNum(lon)) return null
  return normalizeWgs84Point({ x: Number(lon), y: Number(lat) })
}

async function toWgs84Point (geom: any): Promise<{ x: number; y: number } | null> {
  if (!geom) return null
  const direct = normalizeWgs84Point(geom)
  const wkid = Number(geom?.spatialReference?.wkid ?? geom?.spatialReference?.latestWkid)
  if (direct && (!wkid || wkid === 4326 || wkid === 4258)) return direct

  try {
    const webMercatorUtils = await loadEsriModule<any>('esri/geometry/support/webMercatorUtils')
    const wgs = webMercatorUtils?.webMercatorToGeographic?.(geom)
    const out = normalizeWgs84Point(wgs)
    if (out) return out
  } catch {}

  return direct
}

async function resolveFeatureLayer (ds: any, preferredUrl?: string | null): Promise<any | null> {
  const candidates: any[] = []
  const push = (x: any) => { if (x && !candidates.includes(x)) candidates.push(x) }
  push(ds)

  const urls: string[] = []
  const pushUrl = (u: any) => {
    const s = normalizeFeatureLayerUrl(u)
    if (s && !urls.includes(s)) urls.push(s)
  }
  pushUrl(preferredUrl)

  for (const c of candidates) {
    const cAny: any = c
    const layer = unwrapJsapiLayer(
      (typeof cAny?.getLayer === 'function' ? cAny.getLayer() : null) ??
      (typeof cAny?.getJsApiLayer === 'function' ? cAny.getJsApiLayer() : null) ??
      (typeof cAny?.getJSAPILayer === 'function' ? cAny.getJSAPILayer() : null) ??
      cAny?.layer
    )
    if (layer) {
      pushUrl(layer?.url)
      if (typeof layer?.load === 'function') {
        try { await layer.load() } catch {}
      }
      if (typeof layer?.queryFeatures === 'function' || typeof layer?.queryAttachments === 'function') return layer
    }
    pushUrl(cAny?.getDataSourceJson?.()?.url ?? cAny?.dataSourceJson?.url)
  }

  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    for (const url0 of urls) {
      try {
        const url = ensureLayerIndex(url0)
        const fl = new FeatureLayer({ url, outFields: ['*'] })
        if (typeof fl?.load === 'function') await fl.load()
        return fl
      } catch {}
    }
  } catch {}

  return null
}

async function queryPointFromLayer (layer: any, opts: RapportoExtraPdfOptions): Promise<{ x: number; y: number } | null> {
  if (!layer || typeof layer.queryFeatures !== 'function') return null
  const oid = Number(opts.oid)
  if (!Number.isFinite(oid) || oid <= 0) return null
  const oidField = String(layer?.objectIdField || opts.idFieldName || opts.ds?.getIdField?.() || 'OBJECTID')
  try {
    const res = await layer.queryFeatures({
      where: `${oidField} = ${oid}`,
      outFields: ['*'],
      returnGeometry: true,
      num: 1
    })
    const feature = res?.features?.[0]
    const geomPoint = await toWgs84Point(feature?.geometry)
    if (geomPoint) return geomPoint
    return pointFromAttributes(feature?.attributes || {})
  } catch {
    return null
  }
}

async function resolveMapPoint (opts: RapportoExtraPdfOptions): Promise<{ x: number; y: number } | null> {
  const explicit = normalizeWgs84Point(opts.mapPointWgs84)
  if (explicit) return explicit

  const fromData = pointFromAttributes(opts.data || {})
  if (fromData) return fromData

  const layer = await resolveFeatureLayer(opts.ds, opts.layerUrl)
  return await queryPointFromLayer(layer, opts)
}

function dataUrlToBytes (dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',')
  const body = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const bin = atob(body)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function wait (ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function formatParcelLabel (attrs: any): string {
  if (!attrs || typeof attrs !== 'object') return ''
  const comune = String(pickAttrCI(attrs, ['nome_comun', 'nome_comune', 'comune']) || '').trim()
  const sezione = String(pickAttrCI(attrs, ['sezione', 'sez']) || '').trim()
  const foglio = String(pickAttrCI(attrs, ['foglio', 'fg']) || '').trim()
  const mappale = String(pickAttrCI(attrs, ['mappale', 'particella', 'part']) || '').trim()
  const parts = [
    comune ? `Comune ${comune}` : '',
    sezione ? `Sez. ${sezione}` : '',
    foglio ? `Fg. ${foglio}` : '',
    mappale ? `Mapp. ${mappale}` : ''
  ].filter(Boolean)
  return parts.join(' - ')
}

async function queryCadastralParcelLabel (layer: any, pointGeometry: any): Promise<string> {
  if (!layer || typeof layer.queryFeatures !== 'function' || !pointGeometry) return ''
  try {
    const res = await layer.queryFeatures({
      geometry: pointGeometry,
      spatialRelationship: 'intersects',
      outFields: ['nome_comun', 'nome_comune', 'comune', 'sezione', 'foglio', 'mappale', 'particella'],
      returnGeometry: false,
      num: 1
    })
    const attrs = res?.features?.[0]?.attributes || null
    return formatParcelLabel(attrs)
  } catch {
    return ''
  }
}

async function captureMapPng (point: { x: number; y: number }): Promise<MapCaptureResult | null> {
  let view: any = null
  let container: HTMLDivElement | null = null
  try {
    if (typeof document === 'undefined' || !document.body) return null
    const [Map, MapView, Graphic, Point, FeatureLayer] = await Promise.all([
      loadEsriModule<any>('esri/Map'),
      loadEsriModule<any>('esri/views/MapView'),
      loadEsriModule<any>('esri/Graphic'),
      loadEsriModule<any>('esri/geometry/Point'),
      loadEsriModule<any>('esri/layers/FeatureLayer')
    ])

    container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-10000px'
    container.style.top = '0'
    container.style.width = '960px'
    container.style.height = '640px'
    container.style.pointerEvents = 'none'
    document.body.appendChild(container)

    const map = new Map({ basemap: 'hybrid' })
    const esriPoint = new Point({ longitude: point.x, latitude: point.y, spatialReference: { wkid: 4326 } })
    let cadastralLabel = 'Catasto: particelle catastali non disponibili'
    let parcelLabel = ''
    try {
      const cadastralLayer = new FeatureLayer({
        url: CADASTRAL_LAYER_URL,
        title: 'Particelle catastali',
        outFields: ['*'],
        opacity: 0.95,
        renderer: {
          type: 'simple',
          symbol: {
            type: 'simple-fill',
            color: [255, 255, 255, 0],
            outline: { color: [255, 214, 10, 0.95], width: 1.5 }
          }
        },
        labelingInfo: [{
          labelExpressionInfo: { expression: "$feature.foglio + '/' + $feature.mappale" },
          symbol: {
            type: 'text',
            color: [255, 255, 255, 1],
            haloColor: [0, 0, 0, 0.85],
            haloSize: 1,
            font: { size: 9, weight: 'bold' }
          },
          labelPlacement: 'always-horizontal'
        }]
      })
      map.add(cadastralLayer)
      if (typeof cadastralLayer.load === 'function') await cadastralLayer.load()
      cadastralLabel = 'Catasto: particelle catastali CBSM/ArcGIS'
      parcelLabel = await queryCadastralParcelLabel(cadastralLayer, esriPoint)
    } catch {}

    view = new MapView({
      container,
      map,
      center: [point.x, point.y],
      scale: MAP_SCALE,
      ui: { components: [] },
      constraints: { rotationEnabled: false }
    })
    await view.when()
    view.graphics.add(new Graphic({
      geometry: esriPoint,
      symbol: {
        type: 'simple-marker',
        style: 'circle',
        color: [220, 38, 38, 0.95],
        size: 18,
        outline: { color: [255, 255, 255, 1], width: 3 }
      }
    }))
    try { await view.goTo({ target: esriPoint, scale: MAP_SCALE }, { animate: false }) } catch {}
    await wait(1300)
    const shot = await view.takeScreenshot({ format: 'png', width: 960, height: 640 })
    const dataUrl = String(shot?.dataUrl || '')
    return dataUrl
      ? {
          bytes: dataUrlToBytes(dataUrl),
          scale: Number.isFinite(Number(view?.scale)) ? Number(view.scale) : MAP_SCALE,
          basemapLabel: 'Base cartografica: ortofoto/ibrida Esri',
          cadastralLabel,
          parcelLabel
        }
      : null
  } catch {
    return null
  } finally {
    try { view?.destroy?.() } catch {}
    try { container?.remove?.() } catch {}
  }
}

async function findToken (url: string): Promise<string> {
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(url) || IdentityManager?.findCredential?.(url.replace(/\/\d+$/, ''))
    return cred?.token ? String(cred.token) : ''
  } catch {
    return ''
  }
}

function getLayerUrl (layer: any, opts: RapportoExtraPdfOptions): string {
  return ensureLayerIndex(
    normalizeFeatureLayerUrl(opts.layerUrl) ||
    normalizeFeatureLayerUrl(layer?.url) ||
    normalizeFeatureLayerUrl(opts.ds?.getDataSourceJson?.()?.url ?? opts.ds?.dataSourceJson?.url),
    layer
  )
}

function attachmentUrl (att: AttachmentInfo, oid: number, layerUrl: string, token: string): string {
  let url = String(att.url || '').trim()
  const id = Number(att.id)
  if (!url && layerUrl && Number.isFinite(id) && id > 0) url = `${layerUrl}/${oid}/attachments/${id}`
  if (!url) return ''
  if (token && /^https?:/i.test(url) && !/[?&]token=/.test(url)) {
    url = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  }
  return url
}

function attachmentKind (att: AttachmentInfo): 'image' | 'pdf' | 'unsupported' {
  const ct = String(att.contentType || '').toLowerCase()
  const name = String(att.name || '').toLowerCase()
  if (ct.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (ct.startsWith('image/') || /\.(png|jpe?g)$/i.test(name)) return 'image'
  return 'unsupported'
}

async function queryAttachmentInfos (layer: any, opts: RapportoExtraPdfOptions): Promise<AttachmentInfo[]> {
  const oid = Number(opts.oid)
  if (!Number.isFinite(oid) || oid <= 0) return []

  const pullInfos = (obj: any): AttachmentInfo[] => {
    if (!obj) return []
    if (Array.isArray(obj)) return obj
    if (Array.isArray(obj.attachmentInfos)) return obj.attachmentInfos
    if (Array.isArray(obj.attachments)) return obj.attachments
    return []
  }

  const oidField = String(layer?.objectIdField || opts.idFieldName || opts.ds?.getIdField?.() || 'OBJECTID')
  if (layer && typeof layer.queryAttachments === 'function') {
    try {
      const res = await layer.queryAttachments({ attributes: { [oidField]: oid } }, { returnMetadata: true, returnUrl: true })
      if (Array.isArray(res)) {
        for (const g of res) {
          const pid = Number(g?.parentObjectId ?? g?.objectId)
          if (pid === oid) return pullInfos(g)
        }
      }
      if (res && typeof res === 'object') {
        if (Array.isArray(res.attachmentGroups)) {
          for (const g of res.attachmentGroups) {
            const pid = Number(g?.parentObjectId ?? g?.objectId)
            if (pid === oid) return pullInfos(g)
          }
        }
        return pullInfos(res[oid] || res[String(oid)] || res)
      }
    } catch {}
  }

  const layerUrl = getLayerUrl(layer, opts)
  if (!layerUrl) return []
  const token = await findToken(layerUrl)
  try {
    const qs = new URLSearchParams({ f: 'json', objectIds: String(oid), returnMetadata: 'true', returnUrl: 'true' })
    if (token) qs.set('token', token)
    const resp = await fetch(`${layerUrl}/queryAttachments?${qs.toString()}`)
    const json = await resp.json()
    if (Array.isArray(json?.attachmentGroups)) {
      for (const g of json.attachmentGroups) {
        const pid = Number(g?.parentObjectId ?? g?.objectId)
        if (pid === oid) return pullInfos(g)
      }
    }
    return pullInfos(json?.[oid] || json?.[String(oid)] || json)
  } catch {
    return []
  }
}

async function loadAttachmentPayloads (opts: RapportoExtraPdfOptions): Promise<AttachmentPayload[]> {
  const oid = Number(opts.oid)
  if (!Number.isFinite(oid) || oid <= 0) return []
  const layer = await resolveFeatureLayer(opts.ds, opts.layerUrl)
  const infos = (await queryAttachmentInfos(layer, opts))
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'it') || Number(a.id || 0) - Number(b.id || 0))
  if (infos.length === 0) return []

  const layerUrl = getLayerUrl(layer, opts)
  const token = layerUrl ? await findToken(layerUrl) : ''
  const out: AttachmentPayload[] = []
  for (const att of infos) {
    const kind = attachmentKind(att)
    if (kind === 'unsupported') {
      out.push({ ...att, kind })
      continue
    }
    try {
      const url = attachmentUrl(att, oid, layerUrl, token)
      if (!url) {
        out.push({ ...att, kind: 'unavailable', error: 'URL non disponibile' })
        continue
      }
      const resp = await fetch(url, { credentials: 'same-origin' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const bytes = new Uint8Array(await resp.arrayBuffer())
      out.push({ ...att, kind, bytes })
    } catch (ex: any) {
      out.push({ ...att, kind: 'unavailable', error: ex?.message || String(ex) })
    }
  }
  return out
}

function drawTextLines (page: any, font: any, text: string, x: number, y: number, size: number, maxWidth: number, color = rgb(0.12, 0.14, 0.18)): number {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  let line = ''
  let curY = y
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      page.drawText(line, { x, y: curY, size, font, color })
      curY -= size + 4
      line = word
    } else {
      line = next
    }
  }
  if (line) {
    page.drawText(line, { x, y: curY, size, font, color })
    curY -= size + 4
  }
  return curY
}

async function addHeaderPage (pdf: PDFDocument, title: string, subtitle?: string): Promise<any> {
  const page = pdf.addPage([PAGE_W, PAGE_H])
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  page.drawText(title, { x: MARGIN, y: PAGE_H - 62, size: 16, font: bold, color: rgb(0.05, 0.12, 0.24) })
  if (subtitle) drawTextLines(page, regular, subtitle, MARGIN, PAGE_H - 88, 10, PAGE_W - MARGIN * 2, rgb(0.3, 0.34, 0.4))
  page.drawLine({ start: { x: MARGIN, y: PAGE_H - 105 }, end: { x: PAGE_W - MARGIN, y: PAGE_H - 105 }, thickness: 0.8, color: rgb(0.78, 0.82, 0.88) })
  return page
}

function niceScaleBarMeters (groundWidthMeters: number): number {
  const raw = Math.max(10, groundWidthMeters / 4)
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const mant = raw / pow
  const nice = mant >= 5 ? 5 : (mant >= 2 ? 2 : 1)
  return nice * pow
}

async function addMapPage (pdf: PDFDocument, capture: MapCaptureResult, point: { x: number; y: number }): Promise<void> {
  const scaleText = capture.scale ? `Scala indicativa 1:${Math.round(capture.scale).toLocaleString('it-IT')}` : 'Scala indicativa non disponibile'
  const subtitle = [
    `Coordinate WGS84: ${point.y.toFixed(6)}, ${point.x.toFixed(6)}`,
    scaleText,
    capture.parcelLabel || 'Particella catastale: non determinata automaticamente'
  ].join(' - ')
  const page = await addHeaderPage(pdf, 'Allegato cartografico - Mappa del punto rilevato', subtitle)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const png = await pdf.embedPng(capture.bytes)
  const maxW = PAGE_W - MARGIN * 2
  const maxH = 430
  const scale = Math.min(maxW / png.width, maxH / png.height)
  const w = png.width * scale
  const h = png.height * scale
  const x = (PAGE_W - w) / 2
  const y = 250

  page.drawRectangle({ x: x - 1, y: y - 1, width: w + 2, height: h + 2, borderColor: rgb(0.14, 0.22, 0.34), borderWidth: 1.1 })
  page.drawImage(png, { x, y, width: w, height: h })

  const northX = x + w - 44
  const northY = y + h - 78
  page.drawRectangle({ x: northX - 8, y: northY - 8, width: 38, height: 58, color: rgb(1, 1, 1), opacity: 0.82, borderColor: rgb(0.35, 0.39, 0.45), borderWidth: 0.6 })
  page.drawText('N', { x: northX + 4, y: northY + 31, size: 11, font: bold, color: rgb(0.05, 0.09, 0.16) })
  page.drawLine({ start: { x: northX + 11, y: northY + 5 }, end: { x: northX + 11, y: northY + 28 }, thickness: 2, color: rgb(0.05, 0.09, 0.16) })
  page.drawLine({ start: { x: northX + 4, y: northY + 21 }, end: { x: northX + 11, y: northY + 31 }, thickness: 2, color: rgb(0.05, 0.09, 0.16) })
  page.drawLine({ start: { x: northX + 18, y: northY + 21 }, end: { x: northX + 11, y: northY + 31 }, thickness: 2, color: rgb(0.05, 0.09, 0.16) })

  if (capture.scale) {
    const groundWidthMeters = (960 / 96) * 0.0254 * capture.scale
    const barMeters = niceScaleBarMeters(groundWidthMeters)
    const barW = Math.max(55, Math.min(180, (barMeters / groundWidthMeters) * w))
    const barX = x + 18
    const barY = y + 18
    page.drawRectangle({ x: barX - 8, y: barY - 8, width: barW + 52, height: 34, color: rgb(1, 1, 1), opacity: 0.84, borderColor: rgb(0.35, 0.39, 0.45), borderWidth: 0.5 })
    page.drawLine({ start: { x: barX, y: barY }, end: { x: barX + barW, y: barY }, thickness: 4, color: rgb(0.05, 0.09, 0.16) })
    page.drawLine({ start: { x: barX, y: barY - 4 }, end: { x: barX, y: barY + 7 }, thickness: 1, color: rgb(0.05, 0.09, 0.16) })
    page.drawLine({ start: { x: barX + barW, y: barY - 4 }, end: { x: barX + barW, y: barY + 7 }, thickness: 1, color: rgb(0.05, 0.09, 0.16) })
    page.drawText(`${Math.round(barMeters)} m`, { x: barX + barW + 8, y: barY - 3, size: 9, font: bold, color: rgb(0.05, 0.09, 0.16) })
  }

  const infoY = 128
  page.drawRectangle({ x: MARGIN, y: infoY, width: PAGE_W - MARGIN * 2, height: 92, color: rgb(0.965, 0.98, 1), borderColor: rgb(0.74, 0.82, 0.92), borderWidth: 0.8 })
  page.drawText('Legenda e riferimenti cartografici', { x: MARGIN + 14, y: infoY + 68, size: 11, font: bold, color: rgb(0.05, 0.12, 0.24) })
  page.drawCircle({ x: MARGIN + 22, y: infoY + 47, size: 5, color: rgb(0.86, 0.15, 0.15), borderColor: rgb(1, 1, 1), borderWidth: 1.2 })
  page.drawText('Punto rilevato', { x: MARGIN + 36, y: infoY + 43, size: 9.5, font: regular, color: rgb(0.12, 0.14, 0.18) })
  page.drawRectangle({ x: MARGIN + 148, y: infoY + 43, width: 22, height: 9, color: rgb(1, 1, 1), borderColor: rgb(1, 0.78, 0.05), borderWidth: 1.4 })
  page.drawText('Particelle catastali', { x: MARGIN + 178, y: infoY + 43, size: 9.5, font: regular, color: rgb(0.12, 0.14, 0.18) })
  page.drawText(capture.basemapLabel, { x: MARGIN + 14, y: infoY + 24, size: 9, font: regular, color: rgb(0.24, 0.28, 0.34) })
  page.drawText(capture.cadastralLabel, { x: MARGIN + 14, y: infoY + 9, size: 9, font: regular, color: rgb(0.24, 0.28, 0.34) })
  page.drawText('Nord geografico in alto. Scala e posizione derivate dalla vista GIS al momento della generazione.', { x: MARGIN, y: 78, size: 8.5, font: regular, color: rgb(0.38, 0.42, 0.48) })
}

function loadHtmlImage (url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Caricamento immagine non riuscito'))
    img.src = url
  })
}

function blobToBytes (blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error || new Error('Lettura immagine non riuscita'))
    reader.readAsArrayBuffer(blob)
  })
}

async function normalizeImageBytesForPdf (bytes: Uint8Array, mime: string): Promise<Uint8Array | null> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return null
  let source: any = null
  let objectUrl = ''
  let closeSource = () => {}
  try {
    const blob = new Blob([bytes as any], { type: mime || 'image/jpeg' })
    const createBitmap = (window as any)?.createImageBitmap
    if (typeof createBitmap === 'function') {
      source = await createBitmap(blob, { imageOrientation: 'from-image' }).catch((): null => null)
      if (source) closeSource = () => { try { source.close?.() } catch {} }
    }
    if (!source) {
      objectUrl = URL.createObjectURL(blob)
      source = await loadHtmlImage(objectUrl).catch((): null => null)
      closeSource = () => { try { if (objectUrl) URL.revokeObjectURL(objectUrl) } catch {} }
    }
    if (!source) return null

    const srcW = Math.max(1, Math.round(Number(source.width || source.naturalWidth) || 0))
    const srcH = Math.max(1, Math.round(Number(source.height || source.naturalHeight) || 0))
    if (!srcW || !srcH) return null

    const maxPx = 2200
    const scale = Math.min(1, maxPx / Math.max(srcW, srcH))
    const outW = Math.max(1, Math.round(srcW * scale))
    const outH = Math.max(1, Math.round(srcH * scale))
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(source, 0, 0, srcW, srcH, 0, 0, outW, outH)
    const outBlob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.92))
    return outBlob ? await blobToBytes(outBlob) : null
  } catch {
    return null
  } finally {
    closeSource()
  }
}

async function addImageAttachmentPage (pdf: PDFDocument, att: AttachmentPayload, index: number): Promise<void> {
  if (!att.bytes) return
  const title = `Allegato probatorio ${index}`
  const page = await addHeaderPage(pdf, title, String(att.name || 'Immagine allegata'))
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const ct = String(att.contentType || '').toLowerCase()
  const name = String(att.name || '').toLowerCase()
  const isJpeg = ct.includes('jpeg') || ct.includes('jpg') || /\.jpe?g$/i.test(name)
  const normalizedBytes = await normalizeImageBytesForPdf(att.bytes, isJpeg ? 'image/jpeg' : 'image/png')
  const image = normalizedBytes
    ? await pdf.embedPng(normalizedBytes)
    : ((ct.includes('png') || name.endsWith('.png')) ? await pdf.embedPng(att.bytes) : await pdf.embedJpg(att.bytes))
  const maxW = PAGE_W - MARGIN * 2
  const maxH = PAGE_H - 185
  const scale = Math.min(maxW / image.width, maxH / image.height)
  const boxW = image.width * scale
  const boxH = image.height * scale
  const x = (PAGE_W - boxW) / 2
  const y = 50 + (maxH - boxH) / 2
  page.drawRectangle({ x: x - 1, y: y - 1, width: boxW + 2, height: boxH + 2, borderColor: rgb(0.78, 0.82, 0.88), borderWidth: 0.8 })
  page.drawImage(image, { x, y, width: boxW, height: boxH })
  page.drawText('Orientamento immagine coerente con il viewer allegati.', {
    x: MARGIN,
    y: 34,
    size: 8.5,
    font: regular,
    color: rgb(0.38, 0.42, 0.48)
  })
}

async function addUnsupportedSummaryPage (pdf: PDFDocument, payloads: AttachmentPayload[]): Promise<void> {
  if (payloads.length === 0) return
  const page = await addHeaderPage(pdf, 'Allegati probatori non incorporati', 'Questi file risultano presenti negli allegati della pratica ma non sono stati incorporati come pagine del PDF.')
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  let y = PAGE_H - 130
  payloads.forEach((att, idx) => {
    const name = String(att.name || `Allegato ${idx + 1}`)
    const detail = [
      att.contentType ? `tipo: ${att.contentType}` : '',
      att.size ? `dimensione: ${att.size} byte` : '',
      att.error ? `errore: ${att.error}` : 'formato non incorporabile'
    ].filter(Boolean).join(' - ')
    y = drawTextLines(page, regular, `${idx + 1}. ${name} (${detail})`, MARGIN, y, 10, PAGE_W - MARGIN * 2)
    y -= 6
  })
}

export async function appendRapportoExtraPages (baseBytes: Uint8Array, opts: RapportoExtraPdfOptions = {}): Promise<Uint8Array> {
  const [point, attachments] = await Promise.all([
    resolveMapPoint(opts).catch((): null => null),
    loadAttachmentPayloads(opts).catch((): AttachmentPayload[] => [])
  ])
  const mapCapture = point ? await captureMapPng(point).catch((): null => null) : null
  const hasExtras = !!mapCapture || attachments.length > 0
  if (!hasExtras) return baseBytes

  const merged = await PDFDocument.create()
  const baseDoc = await PDFDocument.load(baseBytes as any)
  const basePages = await merged.copyPages(baseDoc, baseDoc.getPageIndices())
  basePages.forEach(pg => merged.addPage(pg))

  if (point && mapCapture) await addMapPage(merged, mapCapture, point)

  let imageIndex = 1
  const unsupported: AttachmentPayload[] = []
  for (const att of attachments) {
    if (att.kind === 'image' && att.bytes) {
      try {
        await addImageAttachmentPage(merged, att, imageIndex)
        imageIndex++
      } catch (ex: any) {
        unsupported.push({ ...att, kind: 'unavailable', error: ex?.message || String(ex) })
      }
      continue
    }
    if (att.kind === 'pdf' && att.bytes) {
      try {
        const doc = await PDFDocument.load(att.bytes as any)
        const pages = await merged.copyPages(doc, doc.getPageIndices())
        pages.forEach(pg => merged.addPage(pg))
      } catch (ex: any) {
        unsupported.push({ ...att, kind: 'unavailable', error: ex?.message || String(ex) })
      }
      continue
    }
    unsupported.push(att)
  }
  await addUnsupportedSummaryPage(merged, unsupported)

  return await merged.save()
}

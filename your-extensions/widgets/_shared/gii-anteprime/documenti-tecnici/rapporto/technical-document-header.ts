import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib'
import { BASE_PDF_B64 } from './base-pdf'
import type { GiiMapLegendItem } from '../../viewer-documenti/map-layers'

export const RAPPORTO_TECHNICAL_PAGE_W = 595.28
export const RAPPORTO_TECHNICAL_PAGE_H = 841.89
const RAPPORTO_TECHNICAL_BODY_TOP = 125
export const RAPPORTO_TECHNICAL_BODY_BOX = {
  x: 42,
  y: 62,
  width: RAPPORTO_TECHNICAL_PAGE_W - 84,
  height: RAPPORTO_TECHNICAL_PAGE_H - 62 - RAPPORTO_TECHNICAL_BODY_TOP
}

const LOGO_HEADER_H = 72
const MAP_FOOTER_H = 70
const BLUE = rgb(0, 0.357, 0.549)
const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0, 0, 0)
const RED = rgb(0.86, 0.15, 0.15)

function b64ToBytes (b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bY (top: number, size: number): number {
  return RAPPORTO_TECHNICAL_PAGE_H - top - size * 0.75
}

function centered (page: PDFPage, text: string, font: any, size: number, x0: number, x1: number, y: number): void {
  const value = String(text || '')
  const maxWidth = Math.max(1, x1 - x0)
  let drawSize = size
  while (drawSize > 8 && font.widthOfTextAtSize(value, drawSize) > maxWidth) drawSize -= 0.25
  const width = font.widthOfTextAtSize(value, drawSize)
  page.drawText(value, { x: x0 + (maxWidth - width) / 2, y, size: drawSize, font, color: BLUE })
}

function rightText (page: PDFPage, text: string, font: any, size: number, xRight: number, y: number): void {
  const value = String(text || '')
  const width = font.widthOfTextAtSize(value, size)
  page.drawText(value, { x: xRight - width, y, size, font, color: BLUE })
}

function rightBlackText (page: PDFPage, text: string, font: any, size: number, xRight: number, y: number): void {
  const value = String(text || '').trim()
  if (!value) return
  const width = font.widthOfTextAtSize(value, size)
  page.drawText(value, { x: xRight - width, y, size, font, color: BLACK })
}

function drawSafeText (page: PDFPage, text: string, font: any, size: number, x: number, y: number, maxWidth: number): void {
  const value = String(text || '').trim()
  if (!value) return
  let out = value
  while (out.length > 3 && font.widthOfTextAtSize(out, size) > maxWidth) out = out.slice(0, -2)
  if (out !== value) out = `${out.slice(0, -1)}...`
  page.drawText(out, { x, y, size, font, color: BLACK })
}

function formatItalianScale (value?: number | null): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return ''
  return `Scala 1: ${Math.round(n).toLocaleString('it-IT')}`
}

function sourceMapCropBox (sourceWidth: number, sourceHeight: number, sourceLayout?: string): { left: number; bottom: number; right: number; top: number } {
  if (String(sourceLayout || '').toUpperCase() === 'MAP_ONLY') {
    return { left: 0, bottom: 0, right: sourceWidth, top: sourceHeight }
  }
  if (sourceWidth > sourceHeight) {
    return {
      left: sourceWidth * 0.06,
      bottom: sourceHeight * 0.22,
      right: sourceWidth * 0.94,
      top: sourceHeight * 0.86
    }
  }
  return {
    left: sourceWidth * 0.145,
    bottom: sourceHeight * 0.265,
    right: sourceWidth * 0.855,
    top: sourceHeight * 0.81
  }
}

export function drawEmbeddedPdfPageInRapportoTechnicalBody (page: PDFPage, embeddedPage: any, sourceWidth: number, sourceHeight: number): void {
  const box = RAPPORTO_TECHNICAL_BODY_BOX
  const scale = Math.min(box.width / Math.max(1, sourceWidth), box.height / Math.max(1, sourceHeight))
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  page.drawPage(embeddedPage, {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height
  })
}

function metricDistanceLabel (meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    return `${Number.isInteger(km) ? String(km) : km.toLocaleString('it-IT', { maximumFractionDigits: 1 })} km`
  }
  return `${Math.round(meters).toLocaleString('it-IT')} m`
}

function pickMetricScaleDistance (scaleDenominator: number, maxWidthPt: number): number {
  const maxMeters = (maxWidthPt / 72) * 0.0254 * scaleDenominator
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000]
  let selected = candidates[0]
  candidates.forEach(value => {
    if (value <= maxMeters) selected = value
  })
  return selected
}

function drawMetricScaleBar (page: PDFPage, font: any, scaleDenominator?: number | null, xRight = 0, y = 0, maxWidth = 185): void {
  const denominator = Number(scaleDenominator)
  if (!Number.isFinite(denominator) || denominator <= 0) return
  const meters = pickMetricScaleDistance(denominator, maxWidth)
  const width = Math.min(maxWidth, (meters / denominator) / 0.0254 * 72)
  const x = xRight - width
  const segmentW = width / 2
  const barH = 5
  page.drawRectangle({ x, y, width: segmentW, height: barH, color: BLACK })
  page.drawRectangle({ x: x + segmentW, y, width: segmentW, height: barH, borderColor: BLACK, borderWidth: 0.6, color: WHITE })
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.6, color: BLACK })
  ;[0, segmentW, width].forEach(dx => {
    page.drawLine({ start: { x: x + dx, y }, end: { x: x + dx, y: y - 4 }, thickness: 0.6, color: BLACK })
  })
  page.drawText('0', { x: x - 1, y: y - 13, size: 6, font, color: BLACK })
  const halfLabel = metricDistanceLabel(meters / 2)
  page.drawText(halfLabel, { x: x + segmentW - font.widthOfTextAtSize(halfLabel, 6) / 2, y: y - 13, size: 6, font, color: BLACK })
  const fullLabel = metricDistanceLabel(meters)
  page.drawText(fullLabel, { x: x + width - font.widthOfTextAtSize(fullLabel, 6), y: y - 13, size: 6, font, color: BLACK })
}

async function drawLegendSymbol (doc: PDFDocument, page: PDFPage, item: GiiMapLegendItem, x: number, y: number): Promise<void> {
  const isPracticeMarker = item.key === 'gii-marker-pratica'
  if (item.image?.imageData) {
    try {
      const bytes = b64ToBytes(item.image.imageData)
      const contentType = String(item.image.contentType || '').toLowerCase()
      const embedded = contentType.includes('jpg') || contentType.includes('jpeg')
        ? await doc.embedJpg(bytes)
        : await doc.embedPng(bytes)
      const maxW = item.kind === 'point' ? 9 : 12
      const maxH = item.kind === 'point' ? 9 : 10
      const imgW = Number(item.image.width) || embedded.width || maxW
      const imgH = Number(item.image.height) || embedded.height || maxH
      const ratio = Math.min(maxW / Math.max(1, imgW), maxH / Math.max(1, imgH))
      const w = Math.max(1, imgW * ratio)
      const h = Math.max(1, imgH * ratio)
      page.drawImage(embedded, { x: x + (maxW - w) / 2, y: y + (maxH - h) / 2, width: w, height: h })
      return
    } catch {}
  }
  if (isPracticeMarker) {
    page.drawCircle({ x: x + 5.5, y: y + 4, size: 2.7, color: RED, borderColor: WHITE, borderWidth: 0.8 })
    return
  }
  if (item.kind === 'parcel') {
    page.drawRectangle({ x, y: y + 1, width: 12, height: 6, borderColor: BLACK, borderWidth: 1, color: WHITE })
    return
  }
  if (item.kind === 'line') {
    page.drawLine({ start: { x, y: y + 5 }, end: { x: x + 12, y: y + 5 }, thickness: 1, color: BLACK })
    return
  }
  if (item.kind === 'point') {
    page.drawCircle({ x: x + 6, y: y + 5, size: 2.5, color: BLACK })
    return
  }
  page.drawRectangle({ x, y: y + 1, width: 12, height: 6, borderColor: BLACK, borderWidth: 0.8 })
}

async function drawMapLegend (doc: PDFDocument, page: PDFPage, font: any, boldFont: any, items: GiiMapLegendItem[], x: number, y: number, maxWidth: number, basemapLabel?: string): Promise<void> {
  const legendItems = (items || []).filter(item => String(item?.label || '').trim()).slice(0, 80)
  const basemapValue = String(basemapLabel || '').trim()
  if (!legendItems.length && !basemapValue) return
  page.drawText('Legenda', { x, y: y + 18, size: 7.2, font: boldFont || font, color: BLACK })
  let cursorX = x
  let cursorY = y + 5
  const rowH = 8
  const fontSize = 5.6
  const groupSize = 5.9
  const maxRows = 9
  let row = 0
  const nextRow = () => {
    cursorX = x
    cursorY -= rowH
    row += 1
  }
  if (basemapValue) {
    const basemapPrefix = 'Mappa di base:'
    const prefixFont = boldFont || font
    const prefixW = prefixFont.widthOfTextAtSize(basemapPrefix, groupSize)
    page.drawText(basemapPrefix, { x: cursorX, y: cursorY + 1, size: groupSize, font: prefixFont, color: BLACK })
    drawSafeText(page, basemapValue, font, groupSize, cursorX + prefixW + 3, cursorY + 1, maxWidth - prefixW - 3)
    nextRow()
  }
  let currentGroup = ''
  for (const item of legendItems) {
    const groupLabel = String(item.groupLabel || item.layerLabel || '').trim()
    if (groupLabel && groupLabel !== currentGroup) {
      if (currentGroup && cursorX > x) nextRow()
      if (row >= maxRows) break
      const groupText = `${groupLabel}:`
      const groupFont = boldFont || font
      const groupW = Math.min(maxWidth, groupFont.widthOfTextAtSize(groupText, groupSize) + 8)
      if (cursorX > x && cursorX + groupW > x + maxWidth) nextRow()
      if (row >= maxRows) break
      page.drawText(groupText, { x: cursorX, y: cursorY + 1, size: groupSize, font: groupFont, color: BLACK })
      cursorX += groupW
      currentGroup = groupLabel
    }
    const label = String(item.label || '').trim()
    const textW = font.widthOfTextAtSize(label, fontSize)
    const itemW = Math.min(maxWidth, 14 + textW + 7)
    if (cursorX > x && cursorX + itemW > x + maxWidth) nextRow()
    if (row >= maxRows) break
    await drawLegendSymbol(doc, page, item, cursorX, cursorY)
    drawSafeText(page, label, font, fontSize, cursorX + 14, cursorY + 1, Math.min(textW + 2, x + maxWidth - cursorX - 14))
    cursorX += itemW
  }
}

export async function drawRapportoTechnicalHeadersByPage (doc: PDFDocument, titleForPage: (pageIndex: number) => string, subtitle?: string): Promise<void> {
  const source = await PDFDocument.load(b64ToBytes(BASE_PDF_B64) as any)
  const sourcePage = source.getPages()[0]
  const logoHeaderTemplate = await (doc as any).embedPage(sourcePage, {
    left: 0,
    bottom: RAPPORTO_TECHNICAL_PAGE_H - LOGO_HEADER_H,
    right: RAPPORTO_TECHNICAL_PAGE_W,
    top: RAPPORTO_TECHNICAL_PAGE_H
  })
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const total = pages.length
  pages.forEach((page, index) => {
    page.drawRectangle({
      x: 0,
      y: RAPPORTO_TECHNICAL_PAGE_H - RAPPORTO_TECHNICAL_BODY_TOP,
      width: RAPPORTO_TECHNICAL_PAGE_W,
      height: RAPPORTO_TECHNICAL_BODY_TOP,
      color: WHITE
    })
    page.drawPage(logoHeaderTemplate, {
      x: 0,
      y: RAPPORTO_TECHNICAL_PAGE_H - LOGO_HEADER_H,
      width: RAPPORTO_TECHNICAL_PAGE_W,
      height: LOGO_HEADER_H
    })
    centered(page, String(titleForPage(index) || '').toUpperCase(), bold, 9, 42, RAPPORTO_TECHNICAL_PAGE_W - 42, bY(98, 9))
    if (subtitle) centered(page, subtitle, regular, 8.5, 42, RAPPORTO_TECHNICAL_PAGE_W - 42, bY(112, 8.5))
    rightText(page, `Pag. ${index + 1} di ${total}`, regular, 7, 532.6, bY(818, 7))
  })
}

export async function drawRapportoTechnicalHeaders (doc: PDFDocument, title: string, subtitle?: string): Promise<void> {
  await drawRapportoTechnicalHeadersByPage(doc, () => title, subtitle)
}

export type RapportoTechnicalMapInfo = {
  scale?: number | null
  basemapLabel?: string
  legendItems?: GiiMapLegendItem[]
  sourceLayout?: string
}

export async function wrapMapPdfBlobWithRapportoTechnicalHeader (blob: Blob, title: string, info: RapportoTechnicalMapInfo = {}): Promise<Blob> {
  const sourceBytes = new Uint8Array(await blob.arrayBuffer())
  const source = await PDFDocument.load(sourceBytes as any)
  const out = await PDFDocument.create()
  const regular = await out.embedFont(StandardFonts.Helvetica)
  const bold = await out.embedFont(StandardFonts.HelveticaBold)
  const sourcePages = source.getPages()
  for (const sourcePage of sourcePages) {
    const sourceSize = sourcePage.getSize()
    const crop = sourceMapCropBox(sourceSize.width, sourceSize.height, info.sourceLayout)
    const embedded = await (out as any).embedPage(sourcePage, crop)
    const cropWidth = Math.max(1, crop.right - crop.left)
    const cropHeight = Math.max(1, crop.top - crop.bottom)
    const page = out.addPage([RAPPORTO_TECHNICAL_PAGE_W, RAPPORTO_TECHNICAL_PAGE_H])
    const box = RAPPORTO_TECHNICAL_BODY_BOX
    const mapBox = { x: box.x, y: box.y + MAP_FOOTER_H, width: box.width, height: box.height - MAP_FOOTER_H }
    const scale = Math.min(mapBox.width / cropWidth, mapBox.height / cropHeight)
    const width = cropWidth * scale
    const height = cropHeight * scale
    page.drawPage(embedded, {
      x: mapBox.x + (mapBox.width - width) / 2,
      y: mapBox.y + (mapBox.height - height) / 2,
      width,
      height
    })

    const scaleText = formatItalianScale(info.scale)
    const legendItems = Array.isArray(info.legendItems) ? info.legendItems : []
    await drawMapLegend(out, page, regular, bold, legendItems, box.x, box.y + 44, box.width - 145, info.basemapLabel)
    drawMetricScaleBar(page, regular, info.scale, box.x + box.width, box.y + 38, Math.min(185, box.width * 0.42))
    rightBlackText(page, scaleText, regular, 8, box.x + box.width, box.y + 10)
  }
  await drawRapportoTechnicalHeaders(out, title)
  const outBytes = await out.save()
  return new Blob([outBytes as any], { type: 'application/pdf' })
}

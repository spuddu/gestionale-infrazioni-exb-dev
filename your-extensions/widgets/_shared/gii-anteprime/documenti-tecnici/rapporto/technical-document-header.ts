import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib'
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

const MAP_FOOTER_H = 70
const BLUE = rgb(0, 0.357, 0.549)
const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0, 0, 0)
const RED = rgb(0.86, 0.15, 0.15)

// Header tecnico ricostruito senza incorporare/croppare la pagina completa del rapporto.
// L'immagine contiene esclusivamente il marchio CBSM; i recapiti sono ridisegnati come testo.
// In questo modo gli elaborati tecnici non trascinano nel PDF i campi del rapporto tecnico
// che prima restavano nascosti ma ancora selezionabili/modificabili in Acrobat.
const RAPPORTO_TECHNICAL_HEADER_LOGO_JPG_B64 = [
  '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',
].join('')

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

export async function drawRapportoTechnicalHeadersByPage (doc: PDFDocument, titleForPage: (pageIndex: number) => string, subtitle?: string, includePage?: (pageIndex: number) => boolean): Promise<void> {
  const headerLogo = await doc.embedJpg(b64ToBytes(RAPPORTO_TECHNICAL_HEADER_LOGO_JPG_B64))
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const selected = pages
    .map((_, index) => index)
    .filter(index => includePage ? !!includePage(index) : true)
  const total = selected.length
  selected.forEach((index, selectedIndex) => {
    const page = pages[index]
    page.drawRectangle({
      x: 0,
      y: RAPPORTO_TECHNICAL_PAGE_H - RAPPORTO_TECHNICAL_BODY_TOP,
      width: RAPPORTO_TECHNICAL_PAGE_W,
      height: RAPPORTO_TECHNICAL_BODY_TOP,
      color: WHITE
    })

    // Il vecchio header veniva ottenuto con embedPage() ritagliando la prima pagina
    // del rapporto tecnico. Il ritaglio era solo visivo: l'intero content stream del
    // rapporto restava incorporato nel Form XObject ed era quindi recuperabile da
    // Acrobat/pdftotext. Qui ricostruiamo esclusivamente ciò che deve essere visibile.
    page.drawImage(headerLogo, {
      x: 51.2,
      y: RAPPORTO_TECHNICAL_PAGE_H - 62.3,
      width: 189.15,
      height: 44.4
    })
    const contactX = 258.05
    const contactSize = 5.04
    const contactLines = [
      { topBaseline: 35.64, text: 'Via Dante, 254 - 09128 CAGLIARI' },
      { topBaseline: 41.40, text: 'telefono 070 40951 - fax 070 4095340' },
      { topBaseline: 47.16, text: 'web http://www.cbsm.it  email cbsm@cbsm.it' },
      { topBaseline: 52.92, text: 'Codice Fiscale - Partita IVA 80000710923' }
    ]
    contactLines.forEach(line => {
      page.drawText(line.text, {
        x: contactX,
        y: RAPPORTO_TECHNICAL_PAGE_H - line.topBaseline,
        size: contactSize,
        font: regular,
        color: BLACK
      })
    })

    centered(page, String(titleForPage(index) || '').toUpperCase(), bold, 9, 42, RAPPORTO_TECHNICAL_PAGE_W - 42, bY(98, 9))
    if (subtitle) centered(page, subtitle, regular, 8.5, 42, RAPPORTO_TECHNICAL_PAGE_W - 42, bY(112, 8.5))
    rightText(page, `Pag. ${selectedIndex + 1} di ${total}`, regular, 7, 532.6, bY(818, 7))
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

/**
 * Titolo standard per le pagine "elaborato probatorio" (foto allegate) del rapporto
 * tecnico. Unico punto: prima duplicato/divergente tra widget (es. "Allegato
 * probatorio N" senza intestazione in un widget, vs questo titolo completo in un altro).
 */
export function attachmentTechnicalDocumentTitle (index: number, numeroRapportoTecnico?: string): string {
  return `ELABORATO PROBATORIO N. ${index} ALLEGATO AL RAPPORTO TECNICO DI RILEVAZIONE N. ${String(numeroRapportoTecnico || '').trim() || '-'}`
}

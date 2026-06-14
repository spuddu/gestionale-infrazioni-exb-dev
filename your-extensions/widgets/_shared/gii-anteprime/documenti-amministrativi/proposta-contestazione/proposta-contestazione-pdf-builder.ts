// =================================================================
// proposta-contestazione-pdf-builder.ts
// Builder PDF Proposta di contestazione / Scheda istruttoria di dettaglio GII.
// Layout generato con font e logica base del Rapporto e con la medesima
// intestazione istituzionale.
// =================================================================
import { degrees, PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { CALIBRI_REGULAR_B64, CALIBRI_BOLD_B64 } from '../../documenti-tecnici/rapporto/calibri-fonts'
import { VERBALE_HEADER_PNG_B64 as PROPOSTA_HEADER_PNG_B64 } from './proposta-contestazione-header'

const PAGE_W = 595.32
const PAGE_H = 841.92
const M = 46
const BLACK = rgb(0, 0, 0)
const BLUE = rgb(0, 0.357, 0.549)
const LIGHT_BLUE = rgb(0.91, 0.96, 0.99)
const GRAY = rgb(0.42, 0.45, 0.50)
const BORDER = rgb(0.78, 0.84, 0.90)
const HEADER_KEEP_H = 136
const HEADER_DIVIDER_TOP = 176.64
const DETAIL_AMOUNT_RIGHT_X = PAGE_W - M

type Row = [string, string]

type AttoMeta = {
  code: string
  label: string
  title: string
  fallbackObject: string
  filePrefix: string
  hasVerbale: boolean
  hasSanzione: boolean
  hasRimborso: boolean
  hasRisarcimento: boolean
  isArchiviazione: boolean
}

function b64ToBytes (b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function cleanText (value: any): string {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/ +/g, ' ')
    .trim()
}

function v (m: Record<string, string>, key: string): string {
  return cleanText(m[key] || '')
}

function sanitizeCalculationDetailText (raw: any): string {
  const text = String(raw ?? '')
    .replace(/\s*\((?:SANZIONE|RISARCIMENTO|RIMBORSO|ATTREZZATURA|CAUZIONE|SPESE|RIDUZIONE|TERMINE|TESTO)\.[A-Z0-9._-]+\)(?=\s*:)/gi, '')
    .replace(/^Quantificazione automatica (?:della sanzione|degli importi) sulla base del rapporto approvato e delle tabelle regolamentari configurate\.\s*$/gim, '')
    .replace(/^Gli importi principali sono calcolati automaticamente; le spese di notifica possono essere inserite dall['’]operatore amministrativo e concorrono al totale\.\s*$/gim, '')
    .replace(/[ \t]+:/g, ':')
    .replace(/\r/g, '')
  return text.replace(/^Riepilogo (?:automatico|importi)\s*$[\s\S]*$/im, '').replace(/\n{3,}/g, '\n\n').trim()
}

function hasValue (m: Record<string, string>, key: string): boolean {
  return !!v(m, key)
}

function anyValue (m: Record<string, string>, keys: string[]): boolean {
  return keys.some(k => hasValue(m, k))
}

function moneyNumber (value: string): number {
  const raw = cleanText(value || '').replace(/[^0-9,.-]/g, '')
  if (!raw) return 0
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

function hasPositiveMoney (m: Record<string, string>, key: string): boolean {
  return moneyNumber(v(m, key)) > 0.004
}

function preferredSanzioneAmount (m: Record<string, string>): string {
  return hasPositiveMoney(m, 'sanzione_importo_ridotta')
    ? v(m, 'sanzione_importo_ridotta')
    : v(m, 'sanzione_importo_base')
}

function compactRows (rows: Row[]): Row[] {
  return rows.filter(([, value]) => cleanText(value))
}

type Art30PdfRow = {
  codice: string
  descrizione: string
  quantita: number
  valoreUnitario: number
  importo: number
}

function formatDecimalIt (value: number, fractionDigits = 2): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  const sign = n < 0 ? '-' : ''
  const fixed = Math.abs(n).toFixed(fractionDigits)
  const [integerPart, decimalPart] = fixed.split('.')
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalPart != null ? `${sign}${groupedInteger},${decimalPart}` : `${sign}${groupedInteger}`
}

function formatMoneyIt (value: number): string {
  return `${formatDecimalIt(Number(value || 0), 2)} €`
}

function formatQuantityIt (value: number): string {
  return Number(value || 0).toLocaleString('it-IT', { maximumFractionDigits: 2 })
}

function parseArt30PdfRows (raw: any): Art30PdfRow[] {
  const rows: Art30PdfRow[] = []
  for (const sourceLine of String(raw ?? '').split(/\r?\n/)) {
    const text = sourceLine.trim()
    if (!text) continue
    const quantityMarker = text.match(/\s+—\s+Quantità:\s*([0-9.,]+)/i)
    if (!quantityMarker || quantityMarker.index == null) continue
    const prefix = text.slice(0, quantityMarker.index).trim()
    const codeMatch = prefix.match(/^(.*?)\s+—\s+Codice:\s*(.+)$/i)
    const descrizione = cleanText(codeMatch?.[1] || prefix)
    const codice = cleanText(codeMatch?.[2] || '')
    const valueMatch = text.match(/Valore unitario:\s*([0-9.,]+)\s*€/i)
    const amountMatch = text.match(/Importo:\s*([0-9.,]+)\s*€/i)
    const quantita = moneyNumber(quantityMarker[1])
    const valoreUnitario = moneyNumber(valueMatch?.[1] || '')
    const importo = moneyNumber(amountMatch?.[1] || '')
    if (!descrizione || quantita <= 0) continue
    rows.push({ codice, descrizione, quantita, valoreUnitario, importo })
  }
  return rows
}

function art30PdfRowsText (rows: Art30PdfRow[]): string {
  return rows.map(row => {
    const details = [
      row.codice ? `• Codice: ${row.codice}` : '',
      `• Quantità: ${formatQuantityIt(row.quantita)}`,
      `• Valore unitario: ${formatMoneyIt(row.valoreUnitario)}`,
      `• Importo: ${formatMoneyIt(row.importo)}`
    ].filter(Boolean)
    return [row.descrizione, ...details].join('\n')
  }).join('\n\n')
}


function fitText (font: PDFFont, text: string, size: number, maxWidth: number): string {
  const s = cleanText(text)
  if (!s || font.widthOfTextAtSize(s, size) <= maxWidth) return s
  const ell = '…'
  let out = s
  while (out.length > 0 && font.widthOfTextAtSize(out + ell, size) > maxWidth) out = out.slice(0, -1)
  return out ? out + ell : ell
}

function wrapText (font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const source = cleanText(text)
  if (!source) return []
  const rows: string[] = []
  for (const para of source.split(/\n+/)) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) continue
    let cur = words[0]
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i]
      if (font.widthOfTextAtSize(next, size) <= maxWidth) cur = next
      else {
        rows.push(cur)
        cur = words[i]
      }
    }
    rows.push(cur)
  }
  return rows
}

function normalizeAttoCode (raw: string, label: string): string {
  const s = cleanText(raw || label).toUpperCase().replace(/[\s-]+/g, '_')
  if (s.includes('ARCHIV')) return 'ARCHIVIAZIONE'
  if (s === 'VERBALE_MISTO' || (s.includes('VERBALE') && (s.includes('MIST') || s.includes('RISARC') || s.includes('RIMBORS')))) return 'VERBALE_RISARCIMENTO'
  if (s.includes('RIMBORS') && s.includes('RISARC')) return 'RIMBORSO_RISARCIMENTO'
  if (s.includes('RIMBORS')) return 'RIMBORSO'
  if (s.includes('RISARC') || s.includes('DANN')) return 'RISARCIMENTO_DANNI'
  if (s.includes('VERBALE')) return 'VERBALE'
  return s || 'VERBALE'
}

function getAttoMeta (m: Record<string, string>): AttoMeta {
  const code = normalizeAttoCode(v(m, 'tipo_atto_amm'), v(m, 'tipo_atto_amm_label'))
  if (code === 'ARCHIVIAZIONE') {
    return {
      code,
      label: v(m, 'tipo_atto_amm_label') || 'Archiviazione / non luogo a procedere',
      title: 'ARCHIVIAZIONE / NON LUOGO A PROCEDERE',
      fallbackObject: 'Archiviazione del procedimento amministrativo conseguente al rapporto tecnico',
      filePrefix: 'archiviazione',
      hasVerbale: false,
      hasSanzione: false,
      hasRimborso: false,
      hasRisarcimento: false,
      isArchiviazione: true
    }
  }
  if (code === 'RIMBORSO') {
    return {
      code,
      label: v(m, 'tipo_atto_amm_label') || 'Richiesta di rimborso',
      title: 'RICHIESTA DI RIMBORSO',
      fallbackObject: 'Richiesta di rimborso conseguente al rapporto tecnico',
      filePrefix: 'richiesta_rimborso',
      hasVerbale: false,
      hasSanzione: false,
      hasRimborso: true,
      hasRisarcimento: false,
      isArchiviazione: false
    }
  }
  if (code === 'RISARCIMENTO_DANNI') {
    return {
      code,
      label: v(m, 'tipo_atto_amm_label') || 'Richiesta risarcimento danni',
      title: 'RICHIESTA DI RISARCIMENTO DANNI',
      fallbackObject: 'Richiesta di risarcimento danni conseguente al rapporto tecnico',
      filePrefix: 'richiesta_risarcimento',
      hasVerbale: false,
      hasSanzione: false,
      hasRimborso: false,
      hasRisarcimento: true,
      isArchiviazione: false
    }
  }
  if (code === 'RIMBORSO_RISARCIMENTO') {
    return {
      code,
      label: v(m, 'tipo_atto_amm_label') || 'Richiesta di rimborso e risarcimento danni',
      title: 'RICHIESTA DI RIMBORSO E RISARCIMENTO DANNI',
      fallbackObject: 'Richiesta di rimborso e risarcimento danni conseguente al rapporto tecnico',
      filePrefix: 'richiesta_rimborso_risarcimento',
      hasVerbale: false,
      hasSanzione: false,
      hasRimborso: true,
      hasRisarcimento: true,
      isArchiviazione: false
    }
  }
  if (code === 'VERBALE_RISARCIMENTO') {
    return {
      code,
      label: 'Proposta di contestazione',
      title: 'PROPOSTA DI CONTESTAZIONE',
      fallbackObject: 'Proposta di contestazione conseguente al rapporto tecnico',
      filePrefix: 'proposta_contestazione',
      hasVerbale: true,
      hasSanzione: true,
      hasRimborso: true,
      hasRisarcimento: true,
      isArchiviazione: false
    }
  }
  return {
    code: 'VERBALE',
    label: 'Proposta di contestazione',
    title: 'PROPOSTA DI CONTESTAZIONE',
    fallbackObject: 'Proposta di contestazione conseguente al rapporto tecnico',
    filePrefix: 'proposta_contestazione',
    hasVerbale: true,
    hasSanzione: true,
    hasRimborso: false,
    hasRisarcimento: false,
    isArchiviazione: false
  }
}

type BuildCtx = {
  doc: PDFDocument
  font: PDFFont
  bold: PDFFont
  headerImage: PDFImage
  page: PDFPage
  y: number
  pageNo: number
}

function centeredX (font: PDFFont, text: string, size: number): number {
  return Math.max(M, (PAGE_W - font.widthOfTextAtSize(text, size)) / 2)
}

function baselineFromTop (top: number, size: number): number {
  return PAGE_H - top - size * 0.75
}

function drawHeader (ctx: BuildCtx): void {
  const { page, bold, font, headerImage } = ctx
  const areaText = 'AREA DEGLI AFFARI GENERALI E DELLA PROGRAMMAZIONE FINANZIARIA'
  const officeText = 'SETTORE CATASTO, RUOLI E SERVIZI TERRITORIALI'

  if (ctx.pageNo === 1) {
    // La prima pagina mantiene l'intestazione istituzionale completa.
    page.drawImage(headerImage, { x: 0, y: PAGE_H - HEADER_KEEP_H, width: PAGE_W, height: HEADER_KEEP_H })
    page.drawText(areaText, { x: centeredX(bold, areaText, 9), y: baselineFromTop(148, 9), size: 9, font: bold, color: BLUE })
    page.drawText(officeText, { x: centeredX(bold, officeText, 9), y: baselineFromTop(162, 9), size: 9, font: bold, color: BLUE })
    page.drawLine({
      start: { x: 62.3, y: PAGE_H - HEADER_DIVIDER_TOP },
      end: { x: 532.6, y: PAGE_H - HEADER_DIVIDER_TOP },
      thickness: 1.4,
      color: BLUE
    })
    ctx.y = baselineFromTop(190, 14)
    return
  }

  // Dalla seconda pagina in poi evita la duplicazione dell'intestazione
  // completa e usa solo una testatina compatta di continuità.
  const compactTitle = 'PROPOSTA DI CONTESTAZIONE · Scheda istruttoria di dettaglio'
  page.drawText(compactTitle, { x: M, y: PAGE_H - 36, size: 8.2, font: bold, color: BLUE })
  page.drawText(officeText, {
    x: PAGE_W - M - font.widthOfTextAtSize(officeText, 7.2),
    y: PAGE_H - 36,
    size: 7.2,
    font,
    color: GRAY
  })
  page.drawLine({
    start: { x: M, y: PAGE_H - 47 },
    end: { x: PAGE_W - M, y: PAGE_H - 47 },
    thickness: 0.7,
    color: BORDER
  })
  ctx.y = PAGE_H - 68
}

function addPage (ctx: BuildCtx): void {
  ctx.pageNo += 1
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H])
  drawHeader(ctx)
}

function ensureSpace (ctx: BuildCtx, needed: number): void {
  if (ctx.y - needed < 62) addPage(ctx)
}

function drawTitle (ctx: BuildCtx, title: string, subtitle?: string): void {
  ensureSpace(ctx, 52)
  const safeTitle = fitText(ctx.bold, title, 14, PAGE_W - M * 2)
  ctx.page.drawText(safeTitle, { x: centeredX(ctx.bold, safeTitle, 14), y: ctx.y, size: 14, font: ctx.bold, color: BLUE })
  ctx.y -= 17
  if (subtitle) {
    const safeSubtitle = fitText(ctx.font, subtitle, 9, PAGE_W - M * 2)
    ctx.page.drawText(safeSubtitle, { x: centeredX(ctx.font, safeSubtitle, 9), y: ctx.y, size: 9, font: ctx.font, color: GRAY })
    ctx.y -= 18
  }
}

function drawSectionTitle (ctx: BuildCtx, title: string): void {
  ensureSpace(ctx, 32)
  ctx.page.drawRectangle({ x: M, y: ctx.y - 14, width: PAGE_W - M * 2, height: 20, color: LIGHT_BLUE, borderColor: BORDER, borderWidth: 0.7 })
  ctx.page.drawText(title, { x: M + 8, y: ctx.y - 9, size: 9.5, font: ctx.bold, color: BLUE })
  ctx.y -= 28
}

function drawProminentObject (ctx: BuildCtx, text: string): void {
  ensureSpace(ctx, 72)
  ctx.page.drawRectangle({
    x: M,
    y: ctx.y - 14,
    width: PAGE_W - M * 2,
    height: 20,
    color: LIGHT_BLUE,
    borderColor: BORDER,
    borderWidth: 0.7
  })
  ctx.page.drawText('Causale', { x: M + 8, y: ctx.y - 9, size: 9.5, font: ctx.bold, color: BLUE })
  ctx.y -= 29

  const size = 9.2
  const lineH = size * 1.34
  const lines = wrapText(ctx.bold, text || '-', size, PAGE_W - M * 2)
  const safeLines = lines.length ? lines : ['-']
  safeLines.forEach(line => {
    ensureSpace(ctx, lineH + 3)
    ctx.page.drawText(line, { x: M, y: ctx.y, size, font: ctx.bold, color: BLACK })
    ctx.y -= lineH
  })
  ctx.y -= 9
}

function articleSortKey (text: string): number {
  const match = cleanText(text).match(/^Art\.\s*(\d{1,3})/i)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function drawKeyValueGrid (ctx: BuildCtx, rows: Row[], columns = 2): void {
  if (!rows.length) return
  const gap = 12
  const colW = (PAGE_W - M * 2 - gap * (columns - 1)) / columns
  const labelSize = 7.5
  const valueSize = 8.5
  for (let i = 0; i < rows.length; i += columns) {
    ensureSpace(ctx, 34)
    const baseY = ctx.y
    for (let c = 0; c < columns; c++) {
      const row = rows[i + c]
      if (!row) continue
      const x = M + c * (colW + gap)
      const label = fitText(ctx.bold, row[0], labelSize, colW)
      const value = fitText(ctx.font, row[1] || '—', valueSize, colW)
      ctx.page.drawText(label, { x, y: baseY, size: labelSize, font: ctx.bold, color: GRAY })
      ctx.page.drawText(value, { x, y: baseY - 12, size: valueSize, font: ctx.font, color: BLACK })
    }
    ctx.y -= 31
  }
  ctx.y -= 3
}

function drawParagraph (ctx: BuildCtx, text: string, opts?: { size?: number, maxLines?: number }): void {
  const size = opts?.size || 8.5
  const lineH = size * 1.32
  const lines = wrapText(ctx.font, text || '—', size, PAGE_W - M * 2)
  const maxLines = opts?.maxLines || 999
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    ensureSpace(ctx, lineH + 4)
    ctx.page.drawText(lines[i], { x: M, y: ctx.y, size, font: ctx.font, color: BLACK })
    ctx.y -= lineH
  }
  if (lines.length > maxLines) {
    ensureSpace(ctx, lineH + 4)
    ctx.page.drawText('…', { x: M, y: ctx.y, size, font: ctx.font, color: BLACK })
    ctx.y -= lineH
  }
  ctx.y -= 6
}

function drawOverallTotal (ctx: BuildCtx, value: string): void {
  const totalValue = cleanText(value || '') || '-'
  ensureSpace(ctx, 30)
  ctx.y -= 2
  const label = 'Totale complessivo'
  const amount = /€/.test(totalValue) ? formatMoneyTextFromRaw(totalValue) : totalValue
  const size = 9.2
  const amountW = ctx.bold.widthOfTextAtSize(amount, size)
  const amountX = DETAIL_AMOUNT_RIGHT_X - amountW
  ctx.page.drawText(label, { x: M, y: ctx.y, size, font: ctx.bold, color: BLACK })
  const labelW = ctx.bold.widthOfTextAtSize(label, size)
  const leaderStartX = M + labelW + 7
  const leaderEndX = amountX - 7
  if (leaderEndX > leaderStartX + 12) {
    ctx.page.drawLine({
      start: { x: leaderStartX, y: ctx.y - 1.2 },
      end: { x: leaderEndX, y: ctx.y - 1.2 },
      thickness: 0.55,
      color: BORDER
    })
  }
  ctx.page.drawText(amount, { x: amountX, y: ctx.y, size, font: ctx.bold, color: BLACK })
  ctx.y -= 22
}

type MoneyLineParts = {
  label: string
  amount: string
}

function formatMoneyTextFromRaw (raw: string): string {
  const text = cleanText(raw).replace(/^−/, '-')
  const perHa = /\/\s*ha$/i.test(text)
  const n = moneyNumber(text)
  if (!Number.isFinite(n)) return text
  const formatted = formatMoneyIt(n)
  return perHa ? formatted.replace(/\s*€$/, ' €/ha') : formatted
}

function splitMoneyLine (line: string): MoneyLineParts | null {
  const text = cleanText(line)
  if (!text || !/€/.test(text)) return null
  const match = text.match(/^(.*?)([-−]?\s*\d+(?:\.\d{3})*,\d{2}\s*€(?:\s*\/\s*ha)?)\s*$/i)
  if (!match) return null
  const label = cleanText(match[1].replace(/[:=]?\s*$/, ''))
  const amount = formatMoneyTextFromRaw(match[2])
  if (!label || !amount) return null
  return { label, amount }
}

function normalizeCalculationLabel (label: string): string {
  return cleanText(label)
    .replace(/^Cauzione\s+decurtata$/i, 'Decurtazione cauzione')
    .replace(/^Cauzione\s+da\s+detrarre$/i, 'Decurtazione cauzione')
}

function normalizeCalculationAmount (label: string, amount: string): string {
  const normalizedLabel = normalizeCalculationLabel(label)
  const normalizedAmount = formatMoneyTextFromRaw(amount)
  if (/decurtazione\s+cauzione/i.test(normalizedLabel) && !/^[-−]/.test(normalizedAmount)) {
    return `-${normalizedAmount}`
  }
  return normalizedAmount.replace(/^−/, '-')
}

function normalizeNormaSanzionatoriaLine (line: string): string {
  const raw = cleanText(line).replace(/^Norma\s+sanzionatoria\s*:\s*/i, '')
  if (/Art\.?\s*44\b/i.test(raw)) {
    return 'Art. 44 - Sanzione per rimborso attrezzature smarrite o danneggiate'
  }
  return raw || line
}

function drawAlignedTextAmountLine (
  ctx: BuildCtx,
  line: string,
  options: {
    x: number
    maxRightX?: number
    size: number
    font: PDFFont
    amountFont?: PDFFont
    color?: any
    lineH: number
  }
): void {
  const maxRightX = options.maxRightX ?? (PAGE_W - M)
  const color = options.color ?? BLACK
  const amountFont = options.amountFont || options.font
  const parts = splitMoneyLine(line)
  if (!parts) {
    const rows = wrapText(options.font, line, options.size, maxRightX - options.x)
    const safeRows = rows.length ? rows : ['—']
    safeRows.forEach((row, lineIndex) => {
      ctx.page.drawText(row, { x: options.x, y: ctx.y, size: options.size, font: options.font, color })
      ctx.y -= options.lineH
      if (lineIndex < safeRows.length - 1) ensureSpace(ctx, options.lineH + 2)
    })
    return
  }

  const label = normalizeCalculationLabel(parts.label)
  const amount = normalizeCalculationAmount(label, parts.amount)
  const amountW = amountFont.widthOfTextAtSize(amount, options.size)
  const amountX = maxRightX - amountW
  const labelMaxW = Math.max(80, amountX - options.x - 10)
  const labelRows = wrapText(options.font, label, options.size, labelMaxW)
  const safeRows = labelRows.length ? labelRows : ['—']
  safeRows.forEach((row, lineIndex) => {
    const rowY = ctx.y
    ctx.page.drawText(row, { x: options.x, y: rowY, size: options.size, font: options.font, color })
    if (lineIndex === 0) {
      const rowTextW = options.font.widthOfTextAtSize(row, options.size)
      const leaderStartX = options.x + rowTextW + 5
      const leaderEndX = amountX - 5
      if (leaderEndX > leaderStartX + 12) {
        ctx.page.drawLine({
          start: { x: leaderStartX, y: rowY - 1.2 },
          end: { x: leaderEndX, y: rowY - 1.2 },
          thickness: 0.25,
          color: BORDER
        })
      }
      ctx.page.drawText(amount, { x: amountX, y: rowY, size: options.size, font: amountFont, color })
    }
    ctx.y -= options.lineH
    if (lineIndex < safeRows.length - 1) ensureSpace(ctx, options.lineH + 2)
  })
}

type AdministrativeIterRow = {
  fase: string
  nominativo: string
  ruolo: string
  presa: string
  esito: string
  data: string
}

function dashIfEmpty (value: string): string {
  return cleanText(value || '') || '-'
}

function drawAdministrativeIterTable (ctx: BuildCtx, rows: AdministrativeIterRow[]): void {
  const headers = ['Fase', 'Nominativo', 'Ruolo', 'Presa in carico', 'Esito', 'Data']
  const tableW = PAGE_W - M * 2
  const fixedColumnsW = 52 + 78 + 52 + 165 + 50
  const colW = [52, tableW - fixedColumnsW, 78, 52, 165, 50]
  const rowH = 22
  const headerH = 13
  const startX = M
  const headerSize = 6.5
  const valueSize = 6.8
  const lineH = valueSize * 1.12
  ensureSpace(ctx, headerH + rows.length * rowH + 12)

  let y = ctx.y
  ctx.page.drawRectangle({ x: startX, y: y - headerH + 4, width: tableW, height: headerH, color: LIGHT_BLUE, borderColor: BORDER, borderWidth: 0.5 })
  let x = startX
  headers.forEach((header, i) => {
    ctx.page.drawText(header, { x: x + 3, y: y - 6.7, size: headerSize, font: ctx.bold, color: BLUE })
    if (i > 0) ctx.page.drawLine({ start: { x, y: y + 4 }, end: { x, y: y - headerH + 4 }, thickness: 0.45, color: BORDER })
    x += colW[i]
  })
  ctx.y = y - headerH

  rows.forEach(row => {
    ensureSpace(ctx, rowH + 6)
    y = ctx.y
    ctx.page.drawLine({ start: { x: startX, y: y + 4 }, end: { x: startX + tableW, y: y + 4 }, thickness: 0.45, color: BORDER })
    const values = [row.fase, row.nominativo, row.ruolo, row.presa, row.esito, row.data].map(dashIfEmpty)
    x = startX
    values.forEach((value, i) => {
      if (i > 0) ctx.page.drawLine({ start: { x, y: y + 4 }, end: { x, y: y - rowH + 4 }, thickness: 0.35, color: BORDER })
      const font = i === 0 ? ctx.bold : ctx.font
      const maxW = colW[i] - 6
      const lines = wrapText(font, value, valueSize, maxW).slice(0, 2)
      const offsetY = Math.min(6.5, Math.max(0, (rowH - lines.length * lineH) / 2))
      lines.forEach((line, lineIndex) => {
        ctx.page.drawText(line, { x: x + 3, y: y - offsetY - lineIndex * lineH, size: valueSize, font, color: BLACK })
      })
      x += colW[i]
    })
    ctx.y -= rowH
  })
  ctx.page.drawLine({ start: { x: startX, y: ctx.y + 4 }, end: { x: startX + tableW, y: ctx.y + 4 }, thickness: 0.45, color: BORDER })
  ctx.y -= 8
}

function drawViolationsList (ctx: BuildCtx, text: string, emptyMessage = 'Nessuna violazione contestata rilevata nei dati della pratica.'): void {
  const source = cleanText(text || '')
  if (!source) {
    drawParagraph(ctx, emptyMessage, { size: 8.2 })
    return
  }

  const groups = source
    .split(/\n\s*\n+/)
    .map(group => group.split(/\n+/).map(line => cleanText(line)).filter(Boolean))
    .filter(group => group.length > 0)
    .map((group, index) => ({ group, index }))
    .sort((a, b) => articleSortKey(a.group[0]) - articleSortKey(b.group[0]) || a.index - b.index)
    .map(item => item.group)

  const titleSize = 8.7
  const detailSize = 8.2
  const titleLineH = titleSize * 1.34
  const detailLineH = detailSize * 1.34
  const detailBulletX = M + 18
  const detailTextX = M + 31
  const detailMaxW = PAGE_W - M - detailTextX
  const groupGap = 7
  const finalGap = 4

  groups.forEach((group, groupIndex) => {
    const title = group[0]
    const details = group.slice(1).map(line => line.replace(/^[•·\-]\s*/, ''))
    const titleLines = wrapText(ctx.bold, title, titleSize, PAGE_W - M * 2)
    const detailLineCount = details.reduce((count, detail) => count + Math.max(1, wrapText(ctx.font, detail, detailSize, detailMaxW).length), 0)
    const estimatedHeight = titleLines.length * titleLineH + detailLineCount * detailLineH + (details.length ? 4 : 0) + (groupIndex < groups.length - 1 ? groupGap : finalGap)
    ensureSpace(ctx, Math.min(estimatedHeight, 90))

    titleLines.forEach(line => {
      ensureSpace(ctx, titleLineH + 3)
      ctx.page.drawText(line, { x: M, y: ctx.y, size: titleSize, font: ctx.bold, color: BLACK })
      ctx.y -= titleLineH
    })

    if (details.length) ctx.y -= 2
    details.forEach(detail => {
      const wrapped = wrapText(ctx.font, detail, detailSize, detailMaxW)
      const rows = wrapped.length ? wrapped : ['—']
      ensureSpace(ctx, rows.length * detailLineH + 3)
      ctx.page.drawText('•', { x: detailBulletX, y: ctx.y, size: detailSize, font: ctx.bold, color: BLACK })
      rows.forEach((line, lineIndex) => {
        ctx.page.drawText(line, { x: detailTextX, y: ctx.y, size: detailSize, font: ctx.font, color: BLACK })
        ctx.y -= detailLineH
        if (lineIndex < rows.length - 1) ensureSpace(ctx, detailLineH + 2)
      })
    })

    ctx.y -= groupIndex < groups.length - 1 ? groupGap : finalGap
  })
}

function drawCalculationDetail (ctx: BuildCtx, rawText: string, m: Record<string, string>): void {
  const source = sanitizeCalculationDetailText(rawText || '').replace(/\r/g, '')
  const lines = source.split('\n').map(line => cleanText(line))
  const titleSize = 8.7
  const detailSize = 8.2
  const metaSize = 8.0
  const titleLineH = titleSize * 1.34
  const detailLineH = detailSize * 1.34
  const metaLineH = metaSize * 1.32
  const detailBulletX = M + 18
  const detailTextX = M + 31
  const detailMaxW = PAGE_W - M - detailTextX
  const totalX = M + 18
  const totalMaxW = PAGE_W - M - totalX
  const groupGap = 8

  const isArticleTitle = (line: string): boolean => /^Art\.\s*\d+[A-Za-z]?(?:\s*[-–—]\s*.+)?$/i.test(line)
  const isStructuredTitle = (line: string): boolean => isArticleTitle(line)
  const isNormaSanzionatoria = (line: string): boolean => /^Norma\s+sanzionatoria\s*:/i.test(String(line || '').trim())
  let showNormaSanzionatoriaLines = true

  const drawGroup = (title: string, details: string[]): void => {
    const articleMatch = String(title || '').match(/^(Art\.\s*\d+[A-Za-z]?)/i)
    const articleLabel = articleMatch ? articleMatch[1].replace(/Art\.\s*/i, 'Art. ') : ''
    const isSubtotal = (line: string): boolean => /^Totale(?:\s+Art\.\s*\d+[A-Za-z]?)?\s*:/i.test(String(line || '').trim())
    const normalizedDetails = details
      .map(line => line.replace(/^[•·\-]\s*/, ''))
      .filter(Boolean)
    if (/^Art\.\s*15$/i.test(articleLabel) && v(m, 'tipo_abuso_art15') && !normalizedDetails.some(line => /^Tipo\s+di\s+abuso\s*:/i.test(line))) {
      normalizedDetails.unshift(`Tipo di abuso: ${v(m, 'tipo_abuso_art15')}`)
    }
    if (/^Art\.\s*17$/i.test(articleLabel) && v(m, 'tipo_comunicazione_art17') && !normalizedDetails.some(line => /^Tipo\s+comunicazione\s*:/i.test(line))) {
      normalizedDetails.unshift(`Tipo comunicazione: ${v(m, 'tipo_comunicazione_art17')}`)
    }
    const isArt30 = /^Art\.\s*30$/i.test(articleLabel)

    const metaLines: string[] = []
    normalizedDetails.slice().forEach(line => {
      if (showNormaSanzionatoriaLines && isNormaSanzionatoria(line)) metaLines.push(normalizeNormaSanzionatoriaLine(line))
    })
    let workingDetails = normalizedDetails
      .filter(line => !isNormaSanzionatoria(line))
      .map(line => {
        const parts = splitMoneyLine(line)
        if (!parts) return line
        const label = normalizeCalculationLabel(parts.label)
        const amount = normalizeCalculationAmount(label, parts.amount)
        return `${label}: ${amount}`
      })

    const art30Cauzione = isArt30 ? moneyNumber(v(m, 'attrezzature_cauzione_decurtata')) : 0
    if (isArt30 && art30Cauzione > 0.004 && !workingDetails.some(line => /cauzione|decurtat|detrazion/i.test(line))) {
      const totalIndex = workingDetails.findIndex(isSubtotal)
      const cauzioneLine = `Decurtazione cauzione: -${formatMoneyIt(Math.abs(art30Cauzione))}`
      if (totalIndex >= 0) workingDetails.splice(totalIndex, 0, cauzioneLine)
      else workingDetails.push(cauzioneLine)
    }

    const existingTotalIndex = workingDetails.findIndex(isSubtotal)
    if (isArt30) {
      const amounts = workingDetails
        .filter(line => !isSubtotal(line) && /€/.test(line))
        .map(line => {
          const amount = moneyNumber(line)
          if (!Number.isFinite(amount)) return null
          return /cauzione|decurtat|detrazion/i.test(line) ? -Math.abs(amount) : amount
        })
        .filter((value): value is number => value != null && Number.isFinite(value))
      if (amounts.length > 0) {
        const total = amounts.reduce((sum, value) => sum + value, 0)
        const totalLine = `Totale${articleLabel ? ` ${articleLabel}` : ''}: ${formatMoneyIt(total)}`
        if (existingTotalIndex >= 0) workingDetails[existingTotalIndex] = totalLine
        else workingDetails.push(totalLine)
      }
    } else if (existingTotalIndex >= 0) {
      workingDetails[existingTotalIndex] = workingDetails[existingTotalIndex].replace(
        /^Totale(?:\s+Art\.\s*\d+[A-Za-z]?)?\s*:/i,
        `Totale${articleLabel ? ` ${articleLabel}` : ''}:`
      )
    } else {
      const amounts = workingDetails
        .filter(line => !/riduzion/i.test(line))
        .map(line => {
          if (!/€/.test(line)) return null
          const amount = moneyNumber(line)
          if (!Number.isFinite(amount)) return null
          return /cauzione|decurtat|detrazion/i.test(line) ? -Math.abs(amount) : amount
        })
        .filter((value): value is number => value != null && Number.isFinite(value))
      if (amounts.length === 1) {
        const total = amounts[0]
        workingDetails.push(`Totale${articleLabel ? ` ${articleLabel}` : ''}: ${formatMoneyIt(total)}`)
      } else if (amounts.length > 1) {
        const total = amounts.reduce((sum, value) => sum + value, 0)
        workingDetails.push(`Totale${articleLabel ? ` ${articleLabel}` : ''}: ${formatMoneyIt(total)}`)
      }
    }

    const totalIndex = workingDetails.findIndex(isSubtotal)
    const totalLine = totalIndex >= 0 ? workingDetails[totalIndex] : ''
    if (totalIndex >= 0) workingDetails = workingDetails.filter((_, index) => index !== totalIndex)

    const titleLines = wrapText(ctx.bold, title, titleSize, PAGE_W - M * 2)
    const metaLineCount = metaLines.reduce((count, line) => count + Math.max(1, wrapText(ctx.font, line, metaSize, PAGE_W - M * 2 - 14).length), 0)
    const detailLineCount = workingDetails.reduce((count, detail) => {
      return count + Math.max(1, wrapText(ctx.font, detail, detailSize, detailMaxW).length)
    }, 0)
    const totalLineCount = totalLine ? Math.max(1, wrapText(ctx.bold, totalLine, detailSize, totalMaxW).length) : 0
    const estimatedHeight = titleLines.length * titleLineH + metaLineCount * metaLineH + detailLineCount * detailLineH + totalLineCount * detailLineH + 18 + groupGap
    ensureSpace(ctx, Math.min(estimatedHeight, 118))

    titleLines.forEach(line => {
      ensureSpace(ctx, titleLineH + 3)
      ctx.page.drawText(line, { x: M, y: ctx.y, size: titleSize, font: ctx.bold, color: BLACK })
      ctx.y -= titleLineH
    })

    if (metaLines.length) {
      ctx.y -= 1
      metaLines.forEach(metaLine => {
        const wrapped = wrapText(ctx.font, metaLine, metaSize, PAGE_W - M * 2 - 14)
        const rows = wrapped.length ? wrapped : ['—']
        ensureSpace(ctx, rows.length * metaLineH + 3)
        rows.forEach(line => {
          ctx.page.drawText(line, { x: M + 14, y: ctx.y, size: metaSize, font: ctx.font, color: GRAY })
          ctx.y -= metaLineH
        })
      })
    }

    if (workingDetails.length) ctx.y -= 2
    workingDetails.forEach(detail => {
      const parts = splitMoneyLine(detail)
      const labelForWrap = parts ? normalizeCalculationLabel(parts.label) : detail
      const wrapped = wrapText(ctx.font, labelForWrap, detailSize, parts ? (PAGE_W - M - detailTextX - 86) : detailMaxW)
      const rows = wrapped.length ? wrapped : ['—']
      ensureSpace(ctx, rows.length * detailLineH + 3)
      ctx.page.drawText('•', { x: detailBulletX, y: ctx.y, size: detailSize, font: ctx.bold, color: BLACK })
      drawAlignedTextAmountLine(ctx, detail, {
        x: detailTextX,
        maxRightX: DETAIL_AMOUNT_RIGHT_X,
        size: detailSize,
        font: ctx.font,
        color: BLACK,
        lineH: detailLineH
      })
      ctx.y -= 1
    })

    if (totalLine) {
      ctx.y -= 4
      const parts = splitMoneyLine(totalLine)
      const labelForWrap = parts ? normalizeCalculationLabel(parts.label) : totalLine
      const wrapped = wrapText(ctx.bold, labelForWrap, detailSize, parts ? (PAGE_W - M - totalX - 86) : totalMaxW)
      const rows = wrapped.length ? wrapped : ['—']
      ensureSpace(ctx, rows.length * detailLineH + 6)
      drawAlignedTextAmountLine(ctx, totalLine, {
        x: totalX,
        maxRightX: DETAIL_AMOUNT_RIGHT_X,
        size: detailSize,
        font: ctx.bold,
        amountFont: ctx.bold,
        color: BLACK,
        lineH: detailLineH
      })
    }

    ctx.y -= groupGap
  }

  type CalculationBlock =
    | { kind: 'article', title: string, details: string[], originalIndex: number }
    | { kind: 'paragraph', text: string }

  const blocks: CalculationBlock[] = []
  let index = 0
  let articleIndex = 0
  while (index < lines.length) {
    while (index < lines.length && !lines[index]) index++
    if (index >= lines.length) break

    const current = lines[index]
    if (isStructuredTitle(current)) {
      const title = current
      index++
      const details: string[] = []
      while (index < lines.length && lines[index] && !isStructuredTitle(lines[index])) {
        details.push(lines[index])
        index++
      }
      blocks.push({ kind: 'article', title, details, originalIndex: articleIndex++ })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length && lines[index] && !isStructuredTitle(lines[index])) {
      paragraphLines.push(lines[index])
      index++
    }
    if (paragraphLines.length) blocks.push({ kind: 'paragraph', text: paragraphLines.join('\n') })
  }

  const articleBlocks = blocks
    .filter((block): block is Extract<CalculationBlock, { kind: 'article' }> => block.kind === 'article')
  const normaPresence = articleBlocks.map(block => block.details.some(line => isNormaSanzionatoria(line.replace(/^[•·\-]\s*/, ''))))
  showNormaSanzionatoriaLines = normaPresence.length > 0 && normaPresence.every(Boolean)

  const orderedArticles = articleBlocks
    .sort((a, b) => articleSortKey(a.title) - articleSortKey(b.title) || a.originalIndex - b.originalIndex)
  let orderedArticleIndex = 0

  blocks.forEach(block => {
    if (block.kind === 'paragraph') {
      drawParagraph(ctx, block.text, { size: 8.0 })
      return
    }
    const ordered = orderedArticles[orderedArticleIndex++]
    drawGroup(ordered.title, ordered.details)
  })
}
function drawGeneratedNotice (ctx: BuildCtx, m: Record<string, string>): void {
  const text = [
    v(m, 'data_generazione') ? `Documento generato il ${v(m, 'data_generazione')}` : '',
    v(m, 'generato_da') ? `da ${v(m, 'generato_da')}` : ''
  ].filter(Boolean).join(' ')
  if (!text) return
  ensureSpace(ctx, 24)
  ctx.page.drawText(text, { x: M, y: ctx.y, size: 7.8, font: ctx.font, color: GRAY })
  ctx.y -= 16
}

function addFooterNumbers (doc: PDFDocument, font: PDFFont): void {
  const pages = doc.getPages()
  pages.forEach((page, index) => {
    const text = `Pagina ${index + 1} di ${pages.length}`
    const tw = font.widthOfTextAtSize(text, 8)
    page.drawLine({ start: { x: M, y: 45 }, end: { x: PAGE_W - M, y: 45 }, thickness: 0.6, color: BORDER })
    page.drawText(text, { x: PAGE_W - M - tw, y: 30, size: 8, font, color: GRAY })
  })
}

function addBozzaWatermark (doc: PDFDocument, bold: PDFFont): void {
  const pages = doc.getPages()
  const text = 'BOZZA'
  const size = 82
  const angleDeg = 34
  const angleRad = angleDeg * Math.PI / 180
  const textW = bold.widthOfTextAtSize(text, size)
  const textH = size
  const rotatedW = textW * Math.cos(angleRad) + textH * Math.sin(angleRad)
  const rotatedH = textW * Math.sin(angleRad) + textH * Math.cos(angleRad)
  pages.forEach(page => {
    const x = (PAGE_W - rotatedW) / 2
    const y = (PAGE_H - rotatedH) / 2
    page.drawText(text, {
      x,
      y,
      size,
      font: bold,
      color: rgb(0.78, 0.78, 0.78),
      opacity: 0.28,
      rotate: degrees(angleDeg)
    })
  })
}

export function getPropostaContestazionePdfFilePrefix (m: Record<string, string>): string {
  return getAttoMeta(m).filePrefix
}

export async function buildPropostaContestazionePdf (m: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(b64ToBytes(CALIBRI_REGULAR_B64), { subset: false })
  const bold = await doc.embedFont(b64ToBytes(CALIBRI_BOLD_B64), { subset: false })
  const headerImage = await doc.embedPng(b64ToBytes(PROPOSTA_HEADER_PNG_B64))
  const ctx: BuildCtx = { doc, font, bold, headerImage, page: doc.addPage([PAGE_W, PAGE_H]), y: 0, pageNo: 1 }
  drawHeader(ctx)

  const meta = getAttoMeta(m)
  const approvato = ['1', 'TRUE', 'SI', 'SÌ', 'APPROVATO'].includes(v(m, 'atto_approvato').toUpperCase())
  const isBozza = !meta.isArchiviazione && !approvato
  const title = meta.title
  const subtitle = meta.isArchiviazione ? '' : 'Scheda istruttoria di dettaglio'
  const trasgressore = v(m, 'trasgressore') || '-'
  const object = meta.isArchiviazione
    ? (v(m, 'oggetto_atto_amm') || meta.fallbackObject)
    : `Sanzione pecuniaria e richiesta di rimborso/risarcimento danni.
Ditta “${trasgressore}”.`
  doc.setTitle(subtitle ? `${meta.title} - ${subtitle}` : meta.title)

  drawTitle(ctx, title, subtitle)
  drawProminentObject(ctx, object)

  if (meta.isArchiviazione) {
    drawSectionTitle(ctx, "Dati dell'atto amministrativo")
    drawKeyValueGrid(ctx, compactRows([
      ['Protocollo istanza', v(m, 'protocollo_istanza_numero')],
      ['Data istanza', v(m, 'protocollo_istanza_data')],
      ['Data approvazione', approvato ? v(m, 'data_verbale') : ''],
      ['Protocollo', v(m, 'protocollo_verbale')],
      ['Data protocollo', v(m, 'protocollo_verbale_data')]
    ]))
  }

  drawSectionTitle(ctx, 'Istruttoria tecnica')
  drawKeyValueGrid(ctx, compactRows([
    ['Area', v(m, 'area')],
    ['Settore', v(m, 'settore')],
    ['Ufficio', v(m, 'ufficio_zona')]
  ]))
  drawKeyValueGrid(ctx, [
    ['N. rilevazione', v(m, 'n_rilevazione') || '-'],
    ['Data rilevazione', v(m, 'data_rilevazione') || '-'],
    ['N. rapporto tecnico', v(m, 'n_rapporto') || '-'],
    ['Data approvazione rapporto', v(m, 'data_approvazione_rapporto') || '-']
  ])

  const isTrasgressorePg = ['PG', 'PERSONA GIURIDICA', 'GIURIDICA', '1', 'TRUE'].includes(v(m, 'trasgressore_tipo').toUpperCase())
  drawSectionTitle(ctx, 'Dati trasgressore')
  drawKeyValueGrid(ctx, [
    [isTrasgressorePg ? 'Ragione sociale' : 'Cognome e nome', v(m, 'trasgressore') || '-'],
    [isTrasgressorePg ? 'P. IVA' : 'Codice fiscale', v(m, 'cf_piva') || '-']
  ])

  drawSectionTitle(ctx, meta.isArchiviazione ? 'Elementi istruttori' : 'Fatti accertati')
  drawParagraph(ctx, v(m, 'descrizione_fatti') || '-', { size: 8.2 })

  if (!meta.isArchiviazione && v(m, 'sanzione_dettaglio_calcolo')) {
    drawSectionTitle(ctx, 'Violazioni contestate')
    drawCalculationDetail(ctx, v(m, 'sanzione_dettaglio_calcolo'), m)
    drawOverallTotal(ctx, v(m, 'pagamento_importo_totale'))
  }

  // Nella proposta di contestazione le note amministrative restano metadati
  // gestionali; per l'archiviazione, invece, la motivazione costituisce parte
  // sostanziale del documento.
  if (meta.isArchiviazione && v(m, 'note_atto_amm')) {
    drawSectionTitle(ctx, 'Motivazione')
    drawParagraph(ctx, v(m, 'note_atto_amm'), { size: 8.2 })
  }

  const closingKeys = [
    'verbale_pdf_generato_il', 'verbale_pdf_generato_da',
    'istruttoria_amm_chiusa_il', 'istruttoria_amm_chiusa_da'
  ]
  if (meta.isArchiviazione && anyValue(m, closingKeys)) {
    drawSectionTitle(ctx, 'Iter autorizzativo finale')
    drawKeyValueGrid(ctx, compactRows([
      ['Proposta generata il', v(m, 'verbale_pdf_generato_il')],
      ['Proposta generata da', v(m, 'verbale_pdf_generato_da')],
      ['Istruttoria amministrativa chiusa il', v(m, 'istruttoria_amm_chiusa_il')],
      ['Istruttoria amministrativa chiusa da', v(m, 'istruttoria_amm_chiusa_da')]
    ]))
  }

  if (!meta.isArchiviazione) {
    drawSectionTitle(ctx, 'Iter approvativo della proposta')
    drawAdministrativeIterTable(ctx, [
      {
        fase: 'Compilazione',
        nominativo: v(m, 'amm_iter_compilazione_nome'),
        ruolo: 'Tecnico istruttore',
        presa: v(m, 'amm_iter_compilazione_presa'),
        esito: 'Compilazione istruttoria amministrativa',
        data: v(m, 'amm_iter_compilazione_data')
      },
      {
        fase: 'Supervisione',
        nominativo: v(m, 'amm_iter_supervisione_nome'),
        ruolo: 'Responsabile istruttoria',
        presa: v(m, 'amm_iter_supervisione_presa'),
        esito: 'Verifica istruttoria amministrativa',
        data: v(m, 'amm_iter_supervisione_data')
      },
      {
        fase: 'Approvazione',
        nominativo: approvato ? v(m, 'amm_iter_approvazione_nome') : '-',
        ruolo: 'Direttore dell’Area',
        presa: v(m, 'amm_iter_approvazione_presa'),
        esito: 'Approvazione istruttoria amministrativa',
        data: approvato ? (v(m, 'amm_iter_approvazione_data') || v(m, 'data_verbale')) : '-'
      }
    ])
  }


  if (isBozza) addBozzaWatermark(doc, bold)
  addFooterNumbers(doc, font)
  return await doc.save()
}


// Alias temporanei di compatibilità per il codice che non è stato ancora rinominato internamente.
export {
  getPropostaContestazionePdfFilePrefix as getVerbalePdfFilePrefix,
  buildPropostaContestazionePdf as buildVerbalePdf
}

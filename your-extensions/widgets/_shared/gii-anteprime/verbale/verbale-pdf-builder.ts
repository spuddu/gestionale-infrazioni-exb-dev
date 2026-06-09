// =================================================================
// verbale-pdf-builder.ts
// Builder PDF verbale / atto amministrativo GII.
// Layout generato, senza template esterno, con font e logica base
// riusati dal builder del rapporto.
// =================================================================
import { degrees, PDFDocument, type PDFFont, type PDFPage, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { CALIBRI_REGULAR_B64, CALIBRI_BOLD_B64 } from '../rapporto/calibri-fonts'

const PAGE_W = 595.32
const PAGE_H = 841.92
const M = 46
const BLACK = rgb(0, 0, 0)
const BLUE = rgb(0, 0.357, 0.549)
const LIGHT_BLUE = rgb(0.91, 0.96, 0.99)
const GRAY = rgb(0.42, 0.45, 0.50)
const BORDER = rgb(0.78, 0.84, 0.90)

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

function formatMoneyIt (value: number): string {
  return `${Number(value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
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
      label: v(m, 'tipo_atto_amm_label') || 'Verbale misto',
      title: 'VERBALE MISTO',
      fallbackObject: 'Verbale amministrativo con richiesta di rimborso e/o risarcimento danni',
      filePrefix: 'verbale_misto',
      hasVerbale: true,
      hasSanzione: true,
      hasRimborso: true,
      hasRisarcimento: true,
      isArchiviazione: false
    }
  }
  return {
    code: 'VERBALE',
    label: v(m, 'tipo_atto_amm_label') || 'Verbale amministrativo',
    title: 'VERBALE AMMINISTRATIVO',
    fallbackObject: 'Contestazione amministrativa conseguente al rapporto tecnico',
    filePrefix: 'verbale',
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
  page: PDFPage
  y: number
  pageNo: number
}

function drawHeader (ctx: BuildCtx): void {
  const { page, bold, font } = ctx
  page.drawText('CONSORZIO DI BONIFICA DELLA SARDEGNA MERIDIONALE', { x: M, y: PAGE_H - 54, size: 10.5, font: bold, color: BLUE })
  page.drawText('Gestionale Infrazioni Irrigue · Ufficio Amministrativo', { x: M, y: PAGE_H - 69, size: 8.5, font, color: GRAY })
  page.drawLine({ start: { x: M, y: PAGE_H - 82 }, end: { x: PAGE_W - M, y: PAGE_H - 82 }, thickness: 1, color: BORDER })
  ctx.y = PAGE_H - 104
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
  ctx.page.drawText(safeTitle, { x: M, y: ctx.y, size: 14, font: ctx.bold, color: BLUE })
  ctx.y -= 17
  if (subtitle) {
    const safeSubtitle = fitText(ctx.font, subtitle, 9, PAGE_W - M * 2)
    ctx.page.drawText(safeSubtitle, { x: M, y: ctx.y, size: 9, font: ctx.font, color: GRAY })
    ctx.y -= 18
  }
}

function drawSectionTitle (ctx: BuildCtx, title: string): void {
  ensureSpace(ctx, 32)
  ctx.page.drawRectangle({ x: M, y: ctx.y - 14, width: PAGE_W - M * 2, height: 20, color: LIGHT_BLUE, borderColor: BORDER, borderWidth: 0.7 })
  ctx.page.drawText(title, { x: M + 8, y: ctx.y - 9, size: 9.5, font: ctx.bold, color: BLUE })
  ctx.y -= 28
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

function drawCalculationDetail (ctx: BuildCtx, rawText: string): void {
  const source = sanitizeCalculationDetailText(rawText || '').replace(/\r/g, '')
  const lines = source.split('\n').map(line => cleanText(line))
  const titleSize = 8.7
  const detailSize = 8.2
  const titleLineH = titleSize * 1.34
  const detailLineH = detailSize * 1.34
  const detailBulletX = M + 18
  const detailTextX = M + 31
  const detailMaxW = PAGE_W - M - detailTextX
  const groupGap = 7

  const isArticleTitle = (line: string): boolean => /^Art\.\s*\d+[A-Za-z]?(?:\s*[-–—]\s*.+)?$/i.test(line)
  const isStructuredTitle = (line: string): boolean => isArticleTitle(line)

  const drawGroup = (title: string, details: string[]): void => {
    const articleMatch = String(title || '').match(/^(Art\.\s*\d+[A-Za-z]?)/i)
    const articleLabel = articleMatch ? articleMatch[1].replace(/Art\.\s*/i, 'Art. ') : ''
    const isSubtotal = (line: string): boolean => /^Totale(?:\s+Art\.\s*\d+[A-Za-z]?)?\s*:/i.test(String(line || '').trim())
    const normalizedDetails = details
      .map(line => line.replace(/^[•·\-]\s*/, ''))
      .filter(Boolean)
    const existingTotalIndex = normalizedDetails.findIndex(isSubtotal)
    if (existingTotalIndex >= 0) {
      normalizedDetails[existingTotalIndex] = normalizedDetails[existingTotalIndex].replace(
        /^Totale(?:\s+Art\.\s*\d+[A-Za-z]?)?\s*:/i,
        `Totale${articleLabel ? ` ${articleLabel}` : ''}:`
      )
    } else {
      const amounts = normalizedDetails
        .filter(line => !/riduzion/i.test(line))
        .map(line => {
          if (!/€/.test(line)) return null
          const amount = moneyNumber(line)
          if (!Number.isFinite(amount)) return null
          return /cauzione|decurtat|detrazion/i.test(line) ? -Math.abs(amount) : amount
        })
        .filter((value): value is number => value != null && Number.isFinite(value))
      if (amounts.length > 1) {
        const total = amounts.reduce((sum, value) => sum + value, 0)
        normalizedDetails.push(`Totale${articleLabel ? ` ${articleLabel}` : ''}: ${total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`)
      }
    }
    const titleLines = wrapText(ctx.bold, title, titleSize, PAGE_W - M * 2)
    const detailLineCount = normalizedDetails.reduce((count, detail) => {
      return count + Math.max(1, wrapText(ctx.font, detail, detailSize, detailMaxW).length)
    }, 0)
    const estimatedHeight = titleLines.length * titleLineH + detailLineCount * detailLineH + (normalizedDetails.length ? 4 : 0) + groupGap
    ensureSpace(ctx, Math.min(estimatedHeight, 100))

    titleLines.forEach(line => {
      ensureSpace(ctx, titleLineH + 3)
      ctx.page.drawText(line, { x: M, y: ctx.y, size: titleSize, font: ctx.bold, color: BLACK })
      ctx.y -= titleLineH
    })

    if (normalizedDetails.length) ctx.y -= 2
    normalizedDetails.forEach(detail => {
      const isTotal = isSubtotal(detail)
      const detailFont = isTotal ? ctx.bold : ctx.font
      const wrapped = wrapText(detailFont, detail, detailSize, detailMaxW)
      const rows = wrapped.length ? wrapped : ['—']
      ensureSpace(ctx, rows.length * detailLineH + 3)
      ctx.page.drawText('•', { x: detailBulletX, y: ctx.y, size: detailSize, font: ctx.bold, color: BLACK })
      rows.forEach((line, lineIndex) => {
        ctx.page.drawText(line, { x: detailTextX, y: ctx.y, size: detailSize, font: detailFont, color: BLACK })
        ctx.y -= detailLineH
        if (lineIndex < rows.length - 1) ensureSpace(ctx, detailLineH + 2)
      })
    })
    ctx.y -= groupGap
  }

  let index = 0
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
      drawGroup(title, details)
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length && lines[index] && !isStructuredTitle(lines[index])) {
      paragraphLines.push(lines[index])
      index++
    }
    if (paragraphLines.length) drawParagraph(ctx, paragraphLines.join('\n'), { size: 8.0 })
  }
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

export function getVerbalePdfFilePrefix (m: Record<string, string>): string {
  return getAttoMeta(m).filePrefix
}

export async function buildVerbalePdf (m: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(b64ToBytes(CALIBRI_REGULAR_B64), { subset: false })
  const bold = await doc.embedFont(b64ToBytes(CALIBRI_BOLD_B64), { subset: false })
  const ctx: BuildCtx = { doc, font, bold, page: doc.addPage([PAGE_W, PAGE_H]), y: 0, pageNo: 1 }
  drawHeader(ctx)

  const meta = getAttoMeta(m)
  const pratica = v(m, 'pratica') || v(m, 'objectid')
  const numeroVerbale = v(m, 'numero_verbale')
  const approvato = ['1', 'TRUE', 'SI', 'SÌ', 'APPROVATO'].includes(v(m, 'atto_approvato').toUpperCase())
  const isBozza = !meta.isArchiviazione && (!approvato || (meta.hasVerbale && (!numeroVerbale || !v(m, 'data_verbale'))))
  const title = meta.hasVerbale && numeroVerbale ? `${meta.title} N. ${numeroVerbale}` : meta.title
  const subtitle = pratica ? `Pratica ${pratica}` : ''
  const object = v(m, 'oggetto_atto_amm') || meta.fallbackObject
  doc.setTitle(numeroVerbale ? `${meta.title} ${numeroVerbale}` : (pratica ? `${meta.title} ${pratica}` : meta.title))

  drawTitle(ctx, title, subtitle)
  drawGeneratedNotice(ctx, m)

  drawSectionTitle(ctx, 'Atto amministrativo')
  const attoRows: Row[] = [
    ['Tipo atto', meta.label],
    ['Protocollo istanza', v(m, 'protocollo_istanza_numero')],
    ['Data istanza', v(m, 'protocollo_istanza_data')]
  ]
  if (meta.hasVerbale) {
    attoRows.push(['Numero verbale', v(m, 'numero_verbale')])
    attoRows.push(['Data verbale', v(m, 'data_verbale')])
  } else if (approvato) {
    attoRows.push(['Data approvazione', v(m, 'data_verbale')])
  }
  attoRows.push(['Protocollo atto', v(m, 'protocollo_verbale')])
  attoRows.push(['Data protocollo', v(m, 'protocollo_verbale_data')])
  drawKeyValueGrid(ctx, compactRows(attoRows))
  drawParagraph(ctx, `Oggetto: ${object}`, { size: 8.2 })

  drawSectionTitle(ctx, 'Riepilogo pratica')
  drawKeyValueGrid(ctx, [
    ['N. rapporto', v(m, 'n_rapporto') || pratica],
    ['Data rilevazione', v(m, 'data_rilevazione')],
    ['Area', v(m, 'area')],
    ['Settore / ufficio', v(m, 'settore') || v(m, 'ufficio_zona')],
    ['Tecnico rilevatore', v(m, 'tecnico_rilevatore')],
    ['Tecnico istruttore amm.', v(m, 'ti_amm')]
  ])

  drawSectionTitle(ctx, 'Destinatario')
  drawKeyValueGrid(ctx, [
    ['Denominazione', v(m, 'trasgressore')],
    ['Codice fiscale / P. IVA', v(m, 'cf_piva')],
    ['Indirizzo', v(m, 'indirizzo')],
    ['Comune / CAP', v(m, 'comune_cap')],
    ['PEC', v(m, 'pec')],
    ['E-mail / telefono', v(m, 'contatti')]
  ])

  drawSectionTitle(ctx, meta.isArchiviazione ? 'Elementi istruttori' : 'Fatti accertati')
  drawParagraph(ctx, v(m, 'descrizione_fatti') || 'Descrizione dei fatti non disponibile nei dati della pratica.', { size: 8.2 })

  if (!meta.isArchiviazione) {
    const referencesTitle = meta.hasVerbale
      ? 'Violazioni contestate e riferimenti normativi'
      : meta.code === 'RIMBORSO'
        ? 'Presupposti e riferimenti regolamentari'
        : 'Presupposti e riferimenti normativi'
    const emptyReferences = meta.hasVerbale
      ? 'Nessuna violazione contestata rilevata nei dati della pratica.'
      : 'Nessun riferimento normativo disponibile nei dati della pratica.'
    drawSectionTitle(ctx, referencesTitle)
    drawViolationsList(ctx, v(m, 'violazioni'), emptyReferences)
  }

  const hasSanzioneData = !meta.isArchiviazione && (meta.hasSanzione || hasPositiveMoney(m, 'sanzione_importo_base') || hasPositiveMoney(m, 'sanzione_importo_ridotta'))
  const hasRimborsoData = !meta.isArchiviazione && (meta.code === 'RIMBORSO' || meta.code === 'RIMBORSO_RISARCIMENTO' ||
    hasPositiveMoney(m, 'attrezzature_rimborso_importo') || hasPositiveMoney(m, 'attrezzature_cauzione_decurtata') ||
    hasPositiveMoney(m, 'attrezzature_importo_netto') || anyValue(m, ['attrezzature_rimborso_dettaglio', 'attrezzature_note']))
  const hasRisarcimentoData = !meta.isArchiviazione && (meta.code === 'RISARCIMENTO_DANNI' || meta.code === 'RIMBORSO_RISARCIMENTO' ||
    hasPositiveMoney(m, 'risarcimento_danni_importo'))

  if (hasSanzioneData) {
    drawSectionTitle(ctx, 'Quantificazione della sanzione amministrativa')
    drawKeyValueGrid(ctx, compactRows([
      ['Sanzione base', v(m, 'sanzione_importo_base')],
      ['Sanzione ridotta', v(m, 'sanzione_importo_ridotta')]
    ]))
  }

  if (hasRimborsoData) {
    drawSectionTitle(ctx, 'Rimborso attrezzature e cauzione')
    const art30Rows = parseArt30PdfRows(m.attrezzature_rimborso_dettaglio)
    if (art30Rows.length > 0) {
      drawViolationsList(ctx, art30PdfRowsText(art30Rows), 'Nessuna attrezzatura valorizzata.')
    } else if (v(m, 'attrezzature_rimborso_dettaglio')) {
      drawParagraph(ctx, v(m, 'attrezzature_rimborso_dettaglio'), { size: 8.2 })
    }
    drawKeyValueGrid(ctx, compactRows([
      ['Cauzione presente', v(m, 'attrezzature_cauzione_presente')],
      ['Rimborso attrezzature', v(m, 'attrezzature_rimborso_importo')],
      ['Cauzione decurtata', v(m, 'attrezzature_cauzione_decurtata')],
      ['Rimborso netto', v(m, 'attrezzature_importo_netto')]
    ]))
    if (v(m, 'attrezzature_note')) drawParagraph(ctx, `Note: ${v(m, 'attrezzature_note')}`, { size: 8.2 })
  }

  if (hasRisarcimentoData) {
    drawSectionTitle(ctx, 'Risarcimento danni')
    drawKeyValueGrid(ctx, compactRows([
      ['Importo del risarcimento', v(m, 'risarcimento_danni_importo')]
    ]), 1)
  }

  const economicComponents = [hasSanzioneData, hasRimborsoData, hasRisarcimentoData].filter(Boolean).length
  const hasEconomicSummary = economicComponents > 0 || anyValue(m, ['sanzione_spese_notifica', 'pagamento_importo_totale', 'pagamento_scadenza'])
  if (hasEconomicSummary) {
    const summaryTitle = economicComponents > 1
      ? 'Riepilogo complessivo'
      : hasSanzioneData
        ? 'Importi dovuti'
        : 'Importo richiesto'
    const rows: Row[] = []
    if (hasSanzioneData) rows.push(['Sanzione amministrativa', preferredSanzioneAmount(m)])
    if (hasRimborsoData) rows.push(['Rimborso netto', v(m, 'attrezzature_importo_netto')])
    if (hasRisarcimentoData) rows.push(['Risarcimento danni', v(m, 'risarcimento_danni_importo')])
    rows.push(['Spese di notifica', v(m, 'sanzione_spese_notifica')])
    rows.push(['Totale da pagare', v(m, 'pagamento_importo_totale')])
    rows.push(['Scadenza pagamento', v(m, 'pagamento_scadenza')])
    drawSectionTitle(ctx, summaryTitle)
    drawKeyValueGrid(ctx, compactRows(rows))
  }

  if (!meta.isArchiviazione && anyValue(m, ['pagamento_modalita', 'pagamento_stato', 'pagopa_iuv', 'pagopa_codice_avviso', 'bonifico_iban', 'bonifico_intestatario', 'bonifico_cro_trn', 'bonifico_data_accredito', 'bonifico_causale', 'pagamento_note'])) {
    drawSectionTitle(ctx, 'Pagamento')
    drawKeyValueGrid(ctx, compactRows([
      ['Modalità', v(m, 'pagamento_modalita')],
      ['Stato', v(m, 'pagamento_stato')],
      ['IUV pagoPA', v(m, 'pagopa_iuv')],
      ['Codice avviso pagoPA', v(m, 'pagopa_codice_avviso')],
      ['IBAN bonifico', v(m, 'bonifico_iban')],
      ['Intestatario bonifico', v(m, 'bonifico_intestatario')],
      ['CRO/TRN', v(m, 'bonifico_cro_trn')],
      ['Data accredito', v(m, 'bonifico_data_accredito')]
    ]))
    if (v(m, 'bonifico_causale') || v(m, 'pagamento_note')) {
      drawParagraph(ctx, [v(m, 'bonifico_causale') ? `Causale bonifico: ${v(m, 'bonifico_causale')}` : '', v(m, 'pagamento_note') ? `Note pagamento: ${v(m, 'pagamento_note')}` : ''].filter(Boolean).join('\n'), { size: 8.2 })
    }
  }

  if (!meta.isArchiviazione && v(m, 'sanzione_dettaglio_calcolo')) {
    const calculationTitle = meta.code === 'VERBALE'
      ? 'Dettaglio calcolo della sanzione'
      : meta.code === 'RIMBORSO'
        ? 'Dettaglio calcolo del rimborso'
        : meta.code === 'RISARCIMENTO_DANNI'
          ? 'Dettaglio quantificazione del risarcimento danni'
          : meta.code === 'RIMBORSO_RISARCIMENTO'
            ? 'Dettaglio calcolo di rimborso e risarcimento'
            : 'Dettaglio calcolo degli importi'
    drawSectionTitle(ctx, calculationTitle)
    drawCalculationDetail(ctx, v(m, 'sanzione_dettaglio_calcolo'))
  }

  // Le note amministrative sono metadati istruttori interni e non devono
  // comparire nell'atto destinato all'interessato. Per l'archiviazione,
  // invece, la motivazione costituisce parte sostanziale del documento.
  if (meta.isArchiviazione && v(m, 'note_atto_amm')) {
    drawSectionTitle(ctx, 'Motivazione')
    drawParagraph(ctx, v(m, 'note_atto_amm'), { size: 8.2 })
  }

  drawSectionTitle(ctx, 'Notifica e chiusura istruttoria')
  drawKeyValueGrid(ctx, compactRows([
    ['Tipo notifica', v(m, 'notifica_tipo')],
    ['Data notifica', v(m, 'notifica_data')],
    ['Esito notifica', v(m, 'notifica_esito')],
    ['Estremi notifica', v(m, 'notifica_estremi')],
    ['PDF generato il', v(m, 'verbale_pdf_generato_il')],
    ['PDF generato da', v(m, 'verbale_pdf_generato_da')],
    ['Istruttoria chiusa il', v(m, 'istruttoria_amm_chiusa_il')],
    ['Istruttoria chiusa da', v(m, 'istruttoria_amm_chiusa_da')]
  ]))

  ensureSpace(ctx, 58)
  ctx.y -= 18
  ctx.page.drawText(`Cagliari, ${v(m, 'data_generazione')}`, { x: M, y: ctx.y, size: 8.5, font, color: BLACK })
  ctx.page.drawText('L\'Ufficio Amministrativo', { x: PAGE_W - M - 160, y: ctx.y, size: 8.5, font: bold, color: BLACK })

  if (isBozza) addBozzaWatermark(doc, bold)
  addFooterNumbers(doc, font)
  return await doc.save()
}

// =================================================================
// verbale-pdf-builder.ts
// Builder dell'Atto finale amministrativo destinato al trasgressore.
// Usa la carta intestata delle note CBSM e la mappa dati condivisa con
// la Proposta di contestazione, ma ha un renderer esterno autonomo.
// =================================================================
import { PDFDocument, StandardFonts, type PDFFont, type PDFEmbeddedPage, type PDFPage, rgb } from 'pdf-lib'
import { ATTO_FINALE_LETTERHEAD_PDF_B64 } from './atto-finale-letterhead-template'

const PAGE_W = 595.32
const PAGE_H = 841.92
// Coordinate ricavate direttamente dal modello ufficiale 'Carta intestata.docx'.
const LEFT = 56.8
const RIGHT = 53
const BODY_W = PAGE_W - LEFT - RIGHT
const BLACK = rgb(0, 0, 0)
const BLUE = rgb(0, 0.22, 0.68)
const WHITE = rgb(1, 1, 1)
const FOOTER_GREEN = rgb(0, 0.23, 0.10)
const BORDER_GREEN = rgb(0, 0.29, 0.11)

type AttoMeta = {
  code: string
  title: string
  objectLabel: string
  filePrefix: string
  hasSanzione: boolean
  hasRimborso: boolean
  hasRisarcimento: boolean
  isArchiviazione: boolean
}

type BuildCtx = {
  doc: PDFDocument
  font: PDFFont
  bold: PDFFont
  sans: PDFFont
  templatePage: PDFEmbeddedPage
  page: PDFPage
  y: number
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
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '')
    .trim()
}

function v (m: Record<string, string>, key: string): string {
  return cleanText(m[key] || '')
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
      title: 'Comunicazione di archiviazione',
      objectLabel: 'Comunicazione di archiviazione',
      filePrefix: 'archiviazione',
      hasSanzione: false,
      hasRimborso: false,
      hasRisarcimento: false,
      isArchiviazione: true
    }
  }
  if (code === 'RIMBORSO') {
    return {
      code,
      title: 'Richiesta di rimborso',
      objectLabel: 'Richiesta di rimborso',
      filePrefix: 'richiesta_rimborso',
      hasSanzione: false,
      hasRimborso: true,
      hasRisarcimento: false,
      isArchiviazione: false
    }
  }
  if (code === 'RISARCIMENTO_DANNI') {
    return {
      code,
      title: 'Richiesta di risarcimento danni',
      objectLabel: 'Richiesta di risarcimento danni',
      filePrefix: 'richiesta_risarcimento',
      hasSanzione: false,
      hasRimborso: false,
      hasRisarcimento: true,
      isArchiviazione: false
    }
  }
  if (code === 'RIMBORSO_RISARCIMENTO') {
    return {
      code,
      title: 'Richiesta di rimborso e risarcimento danni',
      objectLabel: 'Richiesta di rimborso e risarcimento danni',
      filePrefix: 'richiesta_rimborso_risarcimento',
      hasSanzione: false,
      hasRimborso: true,
      hasRisarcimento: true,
      isArchiviazione: false
    }
  }
  if (code === 'VERBALE_RISARCIMENTO') {
    return {
      code,
      title: 'Atto di accertamento e contestazione',
      objectLabel: 'Atto di accertamento e contestazione con richiesta di rimborso e/o risarcimento danni',
      filePrefix: 'atto_accertamento_contestazione',
      hasSanzione: true,
      hasRimborso: true,
      hasRisarcimento: true,
      isArchiviazione: false
    }
  }
  return {
    code: 'VERBALE',
    title: 'Atto di accertamento e contestazione',
    objectLabel: 'Atto di accertamento e contestazione',
    filePrefix: 'atto_accertamento_contestazione',
    hasSanzione: true,
    hasRimborso: false,
    hasRisarcimento: false,
    isArchiviazione: false
  }
}

function fitText (font: PDFFont, text: string, size: number, maxWidth: number): string {
  const s = cleanText(text)
  if (!s || font.widthOfTextAtSize(s, size) <= maxWidth) return s
  const ell = '…'
  let out = s
  while (out.length > 0 && font.widthOfTextAtSize(out + ell, size) > maxWidth) out = out.slice(0, -1)
  return out ? out + ell : ell
}

function wrapWords (font: PDFFont, text: string, size: number, maxWidth: number, firstWidth?: number): string[][] {
  const source = cleanText(text)
  if (!source) return []
  const words = source.split(/\s+/).filter(Boolean)
  const lines: string[][] = []
  let line: string[] = []
  let width = 0
  let limit = firstWidth ?? maxWidth
  const spaceW = font.widthOfTextAtSize(' ', size)
  for (const word of words) {
    const wordW = font.widthOfTextAtSize(word, size)
    const nextW = line.length ? width + spaceW + wordW : wordW
    if (line.length && nextW > limit) {
      lines.push(line)
      line = [word]
      width = wordW
      limit = maxWidth
    } else {
      line.push(word)
      width = nextW
    }
  }
  if (line.length) lines.push(line)
  return lines
}

function drawLetterheadTemplate (ctx: BuildCtx, firstPage: boolean): void {
  ctx.page.drawPage(ctx.templatePage, { x: 0, y: 0, width: PAGE_W, height: PAGE_H })
  // Nel modello originale la parola “Allegati” è parte fissa della prima pagina.
  // Sulle pagine successive viene rimossa, lasciando esclusivamente intestazione e piè di pagina.
  if (!firstPage) {
    ctx.page.drawRectangle({ x: 35, y: PAGE_H - 232, width: 120, height: 40, color: WHITE })
  }
}

function addContinuationPage (ctx: BuildCtx): void {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H])
  drawLetterheadTemplate(ctx, false)
  ctx.y = PAGE_H - 104
}

function ensureSpace (ctx: BuildCtx, needed: number): void {
  if (ctx.y - needed < 58) addContinuationPage(ctx)
}

function drawTextLines (ctx: BuildCtx, text: string, opts?: { x?: number, maxWidth?: number, size?: number, font?: PDFFont, color?: any, lineHeight?: number, gapAfter?: number }): void {
  const size = opts?.size ?? 10.8
  const font = opts?.font || ctx.font
  const x = opts?.x ?? LEFT
  const maxWidth = opts?.maxWidth ?? BODY_W
  const lineHeight = opts?.lineHeight ?? size * 1.35
  const lines = cleanText(text).split(/\n+/).flatMap(p => wrapWords(font, p, size, maxWidth).map(words => words.join(' ')))
  for (const line of lines) {
    ensureSpace(ctx, lineHeight + 3)
    ctx.page.drawText(line, { x, y: ctx.y, size, font, color: opts?.color || BLACK })
    ctx.y -= lineHeight
  }
  ctx.y -= opts?.gapAfter ?? 5
}

function drawJustifiedParagraph (ctx: BuildCtx, text: string, opts?: { size?: number, firstIndent?: number, leftIndent?: number, gapAfter?: number, font?: PDFFont }): void {
  const source = cleanText(text)
  if (!source) return
  const size = opts?.size ?? 10.8
  const font = opts?.font || ctx.font
  const firstIndent = opts?.firstIndent ?? 35.4
  const leftIndent = opts?.leftIndent ?? 0
  const maxWidth = BODY_W - leftIndent
  const firstWidth = Math.max(100, maxWidth - firstIndent)
  const lineHeight = size * 1.42
  const lines = wrapWords(font, source, size, maxWidth, firstWidth)

  lines.forEach((words, index) => {
    ensureSpace(ctx, lineHeight + 3)
    const isFirst = index === 0
    const isLast = index === lines.length - 1
    const x = LEFT + leftIndent + (isFirst ? firstIndent : 0)
    const available = isFirst ? firstWidth : maxWidth
    if (!isLast && words.length > 1) {
      const wordsW = words.reduce((sum, word) => sum + font.widthOfTextAtSize(word, size), 0)
      const gap = Math.max(font.widthOfTextAtSize(' ', size), (available - wordsW) / (words.length - 1))
      let cursor = x
      words.forEach((word, wi) => {
        ctx.page.drawText(word, { x: cursor, y: ctx.y, size, font, color: BLACK })
        cursor += font.widthOfTextAtSize(word, size)
        if (wi < words.length - 1) cursor += gap
      })
    } else {
      ctx.page.drawText(words.join(' '), { x, y: ctx.y, size, font, color: BLACK })
    }
    ctx.y -= lineHeight
  })
  ctx.y -= opts?.gapAfter ?? 7
}

function drawLabelValue (ctx: BuildCtx, label: string, value: string, indent = 18): void {
  const safeValue = cleanText(value)
  if (!safeValue) return
  const size = 9.5
  const labelText = `${label}: `
  const labelW = ctx.bold.widthOfTextAtSize(labelText, size)
  ensureSpace(ctx, 17)
  ctx.page.drawText(labelText, { x: LEFT + indent, y: ctx.y, size, font: ctx.bold, color: BLACK })
  const valueLines = wrapWords(ctx.font, safeValue, size, BODY_W - indent - labelW).map(words => words.join(' '))
  if (valueLines.length) {
    ctx.page.drawText(valueLines[0], { x: LEFT + indent + labelW, y: ctx.y, size, font: ctx.font, color: BLACK })
    ctx.y -= 13.5
    for (let i = 1; i < valueLines.length; i++) {
      ensureSpace(ctx, 16)
      ctx.page.drawText(valueLines[i], { x: LEFT + indent + labelW, y: ctx.y, size, font: ctx.font, color: BLACK })
      ctx.y -= 13.5
    }
  } else {
    ctx.y -= 13.5
  }
}

function drawModInvio (ctx: BuildCtx): number {
  // Misure/posizione identiche al riquadro del modello Word ufficiale.
  const x = 42.45
  const top = PAGE_H - 94.30
  const width = 72
  const height = 109.40
  const bottom = top - height
  const labels = ['Racc.', 'Raccom. A/R', 'Corriere', 'Telematica', 'Posta P.', 'Fax', 'P.E.C.', 'A Mano']
  const rowTopOffsets = [118.6, 130.1, 141.8, 153.8, 165.6, 177.1, 188.6, 200.1]
  ctx.page.drawRectangle({ x, y: bottom, width, height, borderColor: BORDER_GREEN, borderWidth: 1.5 })
  ctx.page.drawText('MOD. INVIO:', { x: 53.5, y: PAGE_H - 107.1, size: 8.2, font: ctx.sans, color: FOOTER_GREEN })
  labels.forEach((label, index) => {
    const baseline = PAGE_H - rowTopOffsets[index]
    ctx.page.drawRectangle({ x: 53.5, y: baseline + 1.6, width: 5.6, height: 5.6, borderColor: FOOTER_GREEN, borderWidth: 0.55 })
    ctx.page.drawText(label, { x: 61.7, y: baseline, size: 7.7, font: ctx.sans, color: FOOTER_GREEN })
  })
  return bottom
}

function drawRecipient (ctx: BuildCtx, m: Record<string, string>): number {
  const x = 314
  const maxWidth = PAGE_W - 49 - x
  let y = PAGE_H - 115.5
  const isPg = ['PG', 'PERSONA GIURIDICA', 'GIURIDICA', '1', 'TRUE'].includes(v(m, 'trasgressore_tipo').toUpperCase())
  const courtesy = isPg ? 'Spett.le' : 'Egr. Sig.'
  ctx.page.drawText(courtesy, { x, y, size: 11.2, font: ctx.font, color: BLACK })
  y -= 14.8

  const recipient = v(m, 'trasgressore') || '-'
  const recipientLines = wrapWords(ctx.bold, recipient, 11.2, maxWidth).map(words => words.join(' '))
  recipientLines.forEach(line => {
    ctx.page.drawText(line, { x, y, size: 11.2, font: ctx.bold, color: BLACK })
    y -= 14.8
  })
  y -= 10

  const address = v(m, 'destinatario_indirizzo') || v(m, 'indirizzo')
  const city = v(m, 'destinatario_comune_cap') || v(m, 'comune_cap')
  if (address) {
    wrapWords(ctx.font, address, 10.8, maxWidth).forEach(words => {
      ctx.page.drawText(words.join(' '), { x, y, size: 10.8, font: ctx.font, color: BLACK })
      y -= 13.8
    })
  }
  if (city) {
    wrapWords(ctx.font, city, 10.8, maxWidth).forEach(words => {
      ctx.page.drawText(words.join(' '), { x, y, size: 10.8, font: ctx.font, color: BLACK })
      y -= 13.8
    })
  }

  const pec = v(m, 'pec')
  if (pec) {
    y -= 9
    const pecLines = wrapWords(ctx.font, pec, 10.2, maxWidth).map(words => words.join(' '))
    pecLines.forEach(line => {
      ctx.page.drawText(line, { x, y, size: 10.2, font: ctx.font, color: BLUE })
      ctx.page.drawLine({ start: { x, y: y - 1.1 }, end: { x: x + Math.min(maxWidth, ctx.font.widthOfTextAtSize(line, 10.2)), y: y - 1.1 }, thickness: 0.45, color: BLUE })
      y -= 13.5
    })
  }
  return y
}

function attoObject (m: Record<string, string>, meta: AttoMeta): string {
  const custom = v(m, 'oggetto_atto_amm')
  if (custom) return custom
  const numero = v(m, 'accertamento_numero')
  const rapporto = v(m, 'n_rapporto')
  const first = numero ? `${meta.objectLabel} n. ${numero}` : meta.objectLabel
  return rapporto ? `${first}\nRapporto tecnico di rilevazione n. ${rapporto}` : first
}

function drawObjectBlock (ctx: BuildCtx, m: Record<string, string>, meta: AttoMeta, topLimit: number): number {
  const x = 56.8
  const maxWidth = 235
  let y = Math.min(PAGE_H - 276.5, topLimit - 13)
  const label = 'OGGETTO:'
  const size = 10.8
  const labelW = ctx.font.widthOfTextAtSize(label, size)
  ctx.page.drawText(label, { x: 82.3, y, size, font: ctx.font, color: BLACK })
  ctx.page.drawLine({ start: { x: 82.3, y: y - 1.4 }, end: { x: 82.3 + labelW, y: y - 1.4 }, thickness: 0.55, color: BLACK })
  y -= 17
  const objectLines = attoObject(m, meta).split(/\n+/).flatMap(p => wrapWords(ctx.font, p, 10.8, maxWidth).map(words => words.join(' ')))
  objectLines.forEach(line => {
    ctx.page.drawText(line, { x, y, size: 10.8, font: ctx.font, color: BLACK })
    y -= 14.2
  })
  ctx.page.drawLine({ start: { x, y: y - 2 }, end: { x: x + Math.min(maxWidth, 205), y: y - 2 }, thickness: 0.55, color: BLACK })
  return y - 10
}

function parseViolationBlocks (raw: string): Array<{ title: string, details: string[] }> {
  const source = String(raw || '').replace(/\r/g, '').trim()
  if (!source) return []
  return source.split(/\n\s*\n+/).map(block => {
    const lines = block.split(/\n+/).map(cleanText).filter(Boolean)
    const title = lines.shift() || ''
    const details = lines.map(line => line.replace(/^[•\-–]\s*/, '').trim()).filter(Boolean)
    return { title, details }
  }).filter(block => block.title)
}

function drawViolations (ctx: BuildCtx, m: Record<string, string>): void {
  const blocks = parseViolationBlocks(v(m, 'violazioni'))
  if (!blocks.length) return
  ensureSpace(ctx, 28)
  ctx.page.drawText('Violazioni contestate', { x: LEFT, y: ctx.y, size: 10.2, font: ctx.bold, color: BLACK })
  ctx.y -= 19
  blocks.forEach(block => {
    ensureSpace(ctx, 30)
    drawTextLines(ctx, block.title, { x: LEFT + 18, maxWidth: BODY_W - 18, size: 9.7, font: ctx.bold, lineHeight: 13, gapAfter: 1 })
    block.details.forEach(detail => {
      ensureSpace(ctx, 16)
      ctx.page.drawText('–', { x: LEFT + 27, y: ctx.y, size: 9.1, font: ctx.font, color: BLACK })
      const lines = wrapWords(ctx.font, detail, 9.1, BODY_W - 47).map(words => words.join(' '))
      lines.forEach((line, li) => {
        ctx.page.drawText(line, { x: LEFT + 41, y: ctx.y, size: 9.1, font: ctx.font, color: BLACK })
        ctx.y -= 12.4
        if (li < lines.length - 1) ensureSpace(ctx, 14)
      })
    })
    ctx.y -= 4
  })
  ctx.y -= 4
}

function drawAmounts (ctx: BuildCtx, m: Record<string, string>, meta: AttoMeta): void {
  const rows: Array<[string, string]> = []
  if (meta.hasSanzione) {
    const sanzione = v(m, 'sanzione_importo_ridotta') || v(m, 'sanzione_importo_base')
    if (sanzione) rows.push(['Sanzione pecuniaria', sanzione])
  }
  if (meta.hasRimborso) {
    const rimborso = v(m, 'attrezzature_importo_netto') || v(m, 'attrezzature_risarcimento_importo')
    if (rimborso) rows.push(['Rimborso', rimborso])
  }
  if (meta.hasRisarcimento) {
    const risarcimento = v(m, 'risarcimento_danni_importo')
    if (risarcimento) rows.push(['Risarcimento danni', risarcimento])
  }
  const total = v(m, 'pagamento_importo_totale')
  if (!rows.length && !total) return
  ensureSpace(ctx, 36)
  ctx.page.drawText('Importi', { x: LEFT, y: ctx.y, size: 10.2, font: ctx.bold, color: BLACK })
  ctx.y -= 19
  rows.forEach(([label, value]) => drawLabelValue(ctx, label, value))
  if (total) {
    ensureSpace(ctx, 19)
    const label = 'Totale dovuto: '
    const size = 10
    const labelW = ctx.bold.widthOfTextAtSize(label, size)
    ctx.page.drawText(label, { x: LEFT + 18, y: ctx.y, size, font: ctx.bold, color: BLACK })
    ctx.page.drawText(total, { x: LEFT + 18 + labelW, y: ctx.y, size, font: ctx.bold, color: BLACK })
    ctx.y -= 20
  }
  ctx.y -= 3
}

function drawPaymentInstructionsIfAvailable (ctx: BuildCtx, m: Record<string, string>): void {
  const mode = v(m, 'pagamento_modalita')
  const deadline = v(m, 'pagamento_scadenza')
  const pagoPaIuv = v(m, 'pagopa_iuv')
  const pagoPaCode = v(m, 'pagopa_codice_avviso')
  const iban = v(m, 'bonifico_iban')
  const intestatario = v(m, 'bonifico_intestatario')
  const causale = v(m, 'bonifico_causale')
  const note = v(m, 'pagamento_note')
  if (![mode, deadline, pagoPaIuv, pagoPaCode, iban, intestatario, causale, note].some(Boolean)) return

  ensureSpace(ctx, 38)
  ctx.page.drawText('Modalità di pagamento', { x: LEFT, y: ctx.y, size: 10.2, font: ctx.bold, color: BLACK })
  ctx.y -= 19
  if (mode) drawLabelValue(ctx, 'Modalità', mode)
  if (deadline) drawLabelValue(ctx, 'Scadenza', deadline)
  if (pagoPaIuv) drawLabelValue(ctx, 'IUV pagoPA', pagoPaIuv)
  if (pagoPaCode) drawLabelValue(ctx, 'Codice avviso pagoPA', pagoPaCode)
  if (iban) drawLabelValue(ctx, 'IBAN', iban)
  if (intestatario) drawLabelValue(ctx, 'Intestatario', intestatario)
  if (causale) drawLabelValue(ctx, 'Causale', causale)
  if (note) drawTextLines(ctx, note, { x: LEFT + 18, maxWidth: BODY_W - 18, size: 9.3, lineHeight: 12.7, gapAfter: 5 })
  ctx.y -= 3
}

function drawSignature (ctx: BuildCtx, m: Record<string, string>): void {
  ensureSpace(ctx, 112)
  drawTextLines(ctx, 'Distinti saluti.', { x: 92.2, maxWidth: 170, size: 10.8, lineHeight: 14.5, gapAfter: 12 })

  const lines = [
    'Il Direttore',
    "dell’Area Affari Generali",
    'e Programmazione Finanziaria'
  ]
  // Per l’atto esterno non si usa mai come fallback il RI_AMM/TI_AMM: se il nome
  // del Direttore non è disponibile, si lascia la sola qualifica istituzionale.
  const name = v(m, 'amm_direttore_nome')
  if (name) lines.push(`(${name})`)
  const x = 338
  let y = ctx.y + 2
  lines.forEach((line, index) => {
    const font = index === 0 ? ctx.bold : ctx.font
    const size = index === 0 ? 10.3 : 10
    const width = font.widthOfTextAtSize(line, size)
    ctx.page.drawText(line, { x: Math.max(x, PAGE_W - 49 - width), y, size, font, color: BLACK })
    y -= 13.3
  })
  ctx.y = y - 6
}

function referenceSentence (m: Record<string, string>): string {
  const rapporto = v(m, 'n_rapporto')
  const detNumero = v(m, 'determinazione_numero')
  const detData = v(m, 'determinazione_data')
  const parts: string[] = []
  if (rapporto) parts.push(`al Rapporto tecnico di rilevazione n. ${rapporto}`)
  if (detNumero) parts.push(`alla determinazione n. ${detNumero}${detData ? ` del ${detData}` : ''}`)
  if (!parts.length) return 'In riferimento alla pratica indicata in oggetto, si comunica quanto segue.'
  if (parts.length === 1) return `In riferimento ${parts[0]}, si comunica quanto segue.`
  return `In riferimento ${parts[0]} e ${parts[1]}, si comunica quanto segue.`
}

function drawBody (ctx: BuildCtx, m: Record<string, string>, meta: AttoMeta): void {
  drawJustifiedParagraph(ctx, referenceSentence(m))

  if (meta.isArchiviazione) {
    const rapporto = v(m, 'n_rapporto')
    drawJustifiedParagraph(ctx, `Con la determinazione sopra richiamata è stata disposta l’archiviazione del procedimento amministrativo${rapporto ? ` conseguente al Rapporto tecnico di rilevazione n. ${rapporto}` : ''}.`)
    const motivation = v(m, 'note_atto_amm') || v(m, 'descrizione_fatti')
    if (motivation) {
      drawJustifiedParagraph(ctx, 'L’archiviazione è disposta sulla base delle seguenti risultanze istruttorie:')
      drawJustifiedParagraph(ctx, motivation, { firstIndent: 0, leftIndent: 18 })
    }
    drawJustifiedParagraph(ctx, 'Pertanto, per quanto di competenza del presente procedimento, non si dà ulteriore corso alla contestazione.')
    drawSignature(ctx, m)
    return
  }

  const facts = v(m, 'descrizione_fatti')
  if (facts) {
    drawJustifiedParagraph(ctx, 'Dagli accertamenti eseguiti risultano i fatti di seguito riportati:')
    drawJustifiedParagraph(ctx, facts, { firstIndent: 0, leftIndent: 18 })
  }

  drawViolations(ctx, m)
  drawAmounts(ctx, m, meta)

  if (meta.hasSanzione && (meta.hasRimborso || meta.hasRisarcimento)) {
    drawJustifiedParagraph(ctx, 'In esecuzione della determinazione sopra richiamata, con il presente atto si contestano le violazioni accertate e si richiede altresì il pagamento degli importi dovuti a titolo di rimborso e/o risarcimento, come sopra specificati.')
  } else if (meta.hasSanzione) {
    drawJustifiedParagraph(ctx, 'In esecuzione della determinazione sopra richiamata, con il presente atto si contestano formalmente le violazioni accertate e i relativi importi, come sopra specificati.')
  } else if (meta.hasRimborso && meta.hasRisarcimento) {
    drawJustifiedParagraph(ctx, 'In esecuzione della determinazione sopra richiamata, si richiede il pagamento degli importi dovuti a titolo di rimborso e risarcimento danni, come sopra specificati.')
  } else if (meta.hasRimborso) {
    drawJustifiedParagraph(ctx, 'In esecuzione della determinazione sopra richiamata, si richiede il pagamento dell’importo dovuto a titolo di rimborso, come sopra specificato.')
  } else if (meta.hasRisarcimento) {
    drawJustifiedParagraph(ctx, 'In esecuzione della determinazione sopra richiamata, si richiede il pagamento dell’importo dovuto a titolo di risarcimento danni, come sopra specificato.')
  }

  drawPaymentInstructionsIfAvailable(ctx, m)
  drawSignature(ctx, m)
}

export function getAttoFinalePdfFilePrefix (m: Record<string, string>): string {
  return getAttoMeta(m).filePrefix
}

export async function buildAttoFinalePdf (m: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  // Il fondo non viene ridisegnato: è una pagina PDF ripulita ottenuta direttamente
  // dal modello Word ufficiale. In questo modo loghi, ANBI, proporzioni e footer
  // coincidono con la carta intestata realmente usata nelle note CBSM.
  const source = await PDFDocument.load(b64ToBytes(ATTO_FINALE_LETTERHEAD_PDF_B64))
  const sourcePage = source.getPages()[0]
  const templatePage = await doc.embedPage(sourcePage)
  const font = await doc.embedFont(StandardFonts.TimesRoman)
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const sans = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([PAGE_W, PAGE_H])
  const ctx: BuildCtx = { doc, font, bold, sans, templatePage, page, y: 0 }
  drawLetterheadTemplate(ctx, true)

  const meta = getAttoMeta(m)
  const numero = v(m, 'accertamento_numero')
  doc.setTitle(numero ? `${meta.title} n. ${numero}` : meta.title)
  doc.setSubject(v(m, 'n_rapporto') ? `Rapporto tecnico di rilevazione n. ${v(m, 'n_rapporto')}` : meta.title)

  const modBottom = drawModInvio(ctx)
  const recipientBottom = drawRecipient(ctx, m)
  const objectBottom = drawObjectBlock(ctx, m, meta, recipientBottom)
  ctx.y = Math.min(objectBottom - 5, recipientBottom - 16, modBottom - 112, PAGE_H - 344)
  if (ctx.y < 300) ctx.y = 300

  drawBody(ctx, m, meta)
  return await doc.save()
}

// Alias di compatibilità: il vecchio nome "verbale" continua a puntare
// al nuovo documento finale destinato al trasgressore.
export {
  buildAttoFinalePdf as buildVerbalePdf,
  getAttoFinalePdfFilePrefix as getVerbalePdfFilePrefix
}

// =================================================================
// verbale-pdf-builder.ts
// Builder PDF verbale amministrativo GII.
// Layout generato, senza template esterno, con font e logica base
// riusati dal builder del rapporto.
// =================================================================
import { PDFDocument, type PDFFont, type PDFPage, rgb } from 'pdf-lib'
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
  page.drawText('Gestionale Infrazioni Irrigue', { x: M, y: PAGE_H - 69, size: 8.5, font, color: GRAY })
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

function drawKeyValueGrid (ctx: BuildCtx, rows: Array<[string, string]>, columns = 2): void {
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

function addFooterNumbers (doc: PDFDocument, font: PDFFont): void {
  const pages = doc.getPages()
  pages.forEach((page, index) => {
    const text = `Pagina ${index + 1} di ${pages.length}`
    const tw = font.widthOfTextAtSize(text, 8)
    page.drawLine({ start: { x: M, y: 45 }, end: { x: PAGE_W - M, y: 45 }, thickness: 0.6, color: BORDER })
    page.drawText(text, { x: PAGE_W - M - tw, y: 30, size: 8, font, color: GRAY })
  })
}

export async function buildVerbalePdf (m: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(b64ToBytes(CALIBRI_REGULAR_B64), { subset: false })
  const bold = await doc.embedFont(b64ToBytes(CALIBRI_BOLD_B64), { subset: false })
  const ctx: BuildCtx = { doc, font, bold, page: doc.addPage([PAGE_W, PAGE_H]), y: 0, pageNo: 1 }
  drawHeader(ctx)

  const pratica = v(m, 'pratica') || v(m, 'objectid')
  const numeroVerbale = v(m, 'numero_verbale')
  const title = numeroVerbale ? `VERBALE DI CONTESTAZIONE N. ${numeroVerbale}` : 'VERBALE DI CONTESTAZIONE'
  const subtitle = pratica ? `Pratica ${pratica}` : ''
  doc.setTitle(numeroVerbale ? `Verbale ${numeroVerbale}` : (pratica ? `Verbale ${pratica}` : 'Verbale di contestazione'))

  drawTitle(ctx, title, subtitle)

  drawSectionTitle(ctx, 'Riepilogo pratica')
  drawKeyValueGrid(ctx, [
    ['N. rapporto', v(m, 'n_rapporto') || pratica],
    ['Data rilevazione', v(m, 'data_rilevazione')],
    ['Area', v(m, 'area')],
    ['Settore / ufficio', v(m, 'settore') || v(m, 'ufficio_zona')],
    ['Tecnico rilevatore', v(m, 'tecnico_rilevatore')],
    ['Tecnico istruttore amm.', v(m, 'ti_amm')]
  ])

  drawSectionTitle(ctx, 'Trasgressore')
  drawKeyValueGrid(ctx, [
    ['Denominazione', v(m, 'trasgressore')],
    ['Codice fiscale / P. IVA', v(m, 'cf_piva')],
    ['Indirizzo', v(m, 'indirizzo')],
    ['Comune / CAP', v(m, 'comune_cap')],
    ['PEC', v(m, 'pec')],
    ['E-mail / telefono', v(m, 'contatti')]
  ])

  drawSectionTitle(ctx, 'Violazioni contestate')
  drawParagraph(ctx, v(m, 'violazioni') || 'Nessuna violazione contestata rilevata nei dati della pratica.', { size: 8.2 })
  if (v(m, 'descrizione_fatti')) {
    drawSectionTitle(ctx, 'Descrizione dei fatti')
    drawParagraph(ctx, v(m, 'descrizione_fatti'), { size: 8.2 })
  }

  drawSectionTitle(ctx, 'Dati verbale, protocollo e notifica')
  drawKeyValueGrid(ctx, [
    ['Numero verbale', v(m, 'numero_verbale')],
    ['Data verbale', v(m, 'data_verbale')],
    ['Protocollo', v(m, 'protocollo_verbale')],
    ['Data protocollo', v(m, 'protocollo_verbale_data')],
    ['Tipo notifica', v(m, 'notifica_tipo')],
    ['Data notifica', v(m, 'notifica_data')],
    ['Esito notifica', v(m, 'notifica_esito')],
    ['Estremi notifica', v(m, 'notifica_estremi')]
  ])

  drawSectionTitle(ctx, 'Sanzione e importi')
  drawKeyValueGrid(ctx, [
    ['Sanzione base', v(m, 'sanzione_importo_base')],
    ['Sanzione ridotta', v(m, 'sanzione_importo_ridotta')],
    ['Risarcimento danni', v(m, 'risarcimento_danni_importo')],
    ['Spese notifica', v(m, 'sanzione_spese_notifica')],
    ['Totale da pagare', v(m, 'pagamento_importo_totale')],
    ['Scadenza pagamento', v(m, 'pagamento_scadenza')]
  ])

  drawSectionTitle(ctx, 'Pagamento')
  drawKeyValueGrid(ctx, [
    ['Modalità', v(m, 'pagamento_modalita')],
    ['Stato', v(m, 'pagamento_stato')],
    ['IUV pagoPA', v(m, 'pagopa_iuv')],
    ['Codice avviso pagoPA', v(m, 'pagopa_codice_avviso')],
    ['IBAN bonifico', v(m, 'bonifico_iban')],
    ['Intestatario bonifico', v(m, 'bonifico_intestatario')],
    ['CRO/TRN', v(m, 'bonifico_cro_trn')],
    ['Data accredito', v(m, 'bonifico_data_accredito')]
  ])
  if (v(m, 'bonifico_causale') || v(m, 'pagamento_note')) {
    drawParagraph(ctx, [v(m, 'bonifico_causale') ? `Causale bonifico: ${v(m, 'bonifico_causale')}` : '', v(m, 'pagamento_note') ? `Note pagamento: ${v(m, 'pagamento_note')}` : ''].filter(Boolean).join('\n'), { size: 8.2 })
  }

  if (v(m, 'sanzione_dettaglio_calcolo')) {
    drawSectionTitle(ctx, 'Dettaglio calcolo sanzione')
    drawParagraph(ctx, v(m, 'sanzione_dettaglio_calcolo'), { size: 8.0 })
  }

  drawSectionTitle(ctx, 'Chiusura istruttoria amministrativa')
  drawKeyValueGrid(ctx, [
    ['Calcolata il', v(m, 'sanzione_calcolata_il')],
    ['Calcolata da', v(m, 'sanzione_calcolata_da')],
    ['Istruttoria chiusa il', v(m, 'istruttoria_amm_chiusa_il')],
    ['Istruttoria chiusa da', v(m, 'istruttoria_amm_chiusa_da')]
  ])

  ensureSpace(ctx, 58)
  ctx.y -= 18
  ctx.page.drawText(`Cagliari, ${v(m, 'data_generazione')}`, { x: M, y: ctx.y, size: 8.5, font, color: BLACK })
  ctx.page.drawText('Il Responsabile dell\'istruttoria amministrativa', { x: PAGE_W - M - 205, y: ctx.y, size: 8.5, font: bold, color: BLACK })

  addFooterNumbers(doc, font)
  return await doc.save()
}

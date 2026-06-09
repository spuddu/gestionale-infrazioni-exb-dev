/**
 * notaspese-pdf-builder.ts
 * Genera il PDF della Nota Spese per il gestionale GII.
 * Carica il template PDF (intestazione CBSM), riempie i placeholder,
 * poi disegna le tabelle dinamiche con pdf-lib.
 */

import { PDFDocument, degrees, type PDFFont, type PDFPage, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { CALIBRI_REGULAR_B64, CALIBRI_BOLD_B64 } from './calibri-fonts'
import { NOTASPESE_BASE_PDF_B64 } from './notaspese-base-pdf'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NsCategory = 'AT' | 'PR' | 'RU' | 'SL' | 'PF'

type NsSource = 'REGIONE' | 'INTERNO' | 'NUOVI PREZZI'

type NsDetailRow = {
  objectid: number
  categoria_costo: NsCategory
  origine_voce_snapshot: NsSource
  codice_voce_snapshot: string
  descrizione_snapshot: string
  unita_misura_snapshot: string
  prezzo_unitario_snapshot: number
  quantita: number
  importo_riga: number
  anno_prezzario_snapshot?: number | null
  ordine: number
  note: string
}

type NsSummary = {
  totaleAT: number
  totalePR: number
  totaleRU: number
  totaleSL: number
  totalePF: number
  percentualeSpeseGenerali: number
  importoSpeseGenerali: number
  totaleComplessivo: number
}

const NS_CATEGORY_LABELS: Record<NsCategory, string> = {
  AT: 'Attrezzature e trasporti',
  PR: 'Materiali da costruzione',
  RU: 'Risorse umane',
  SL: 'Semilavorati',
  PF: 'Prodotti finiti'
}

const CATEGORY_ORDER: NsCategory[] = ['AT', 'PR', 'RU', 'SL', 'PF']

const CATEGORY_TOTAL_KEY: Record<NsCategory, keyof NsSummary> = {
  AT: 'totaleAT',
  PR: 'totalePR',
  RU: 'totaleRU',
  SL: 'totaleSL',
  PF: 'totalePF'
}

export type NotaSpeseArt30Row = {
  codice?: string | null
  descrizione: string
  quantita: number
  valore_unitario: number | null
  importo: number
}

export type NotaSpeseArt30Data = {
  rows: NotaSpeseArt30Row[]
  rimborso: number
  cauzione: number
  netto: number
}

export interface NotaSpeseData {
  cod_pratica: string
  area_label: string
  settore_label: string
  area_cod?: string | number | null
  settore_cod?: string | number | null
  area?: string | number | null
  settore?: string | number | null
  /** Numero deterministico dell'allegato, calcolato al momento della generazione. */
  numero_nota?: number | null
  /** Titolo leggibile della casistica/violazione collegata alla singola nota spese. */
  titolo_nota?: string | null
  rows: Record<NsCategory, NsDetailRow[]>
  summary: NsSummary
  /** Riepilogo Art. 30, accodato come sezione autonoma dopo le normali super categorie. */
  art30?: NotaSpeseArt30Data | null
  luogo_data: string
  firma_nome: string
  rapporto_respinto?: boolean | string | number | null
  rapporto_istruttoria?: boolean | string | number | null
}

/* ------------------------------------------------------------------ */
/*  Costanti layout                                                    */
/* ------------------------------------------------------------------ */

const PW = 595.28
const PH = 841.92
const ML = 42
const MR = 42
const TW = PW - ML - MR

const PAGE_BOTTOM = 60

// Colonne tabella
const CW_CODICE = 72
const CW_DESC   = 238
const CW_UM     = 38
const CW_QTA    = 35
const CW_PU     = 64
const CW_IMP    = 64

const CX_CODICE = ML
const CX_DESC   = CX_CODICE + CW_CODICE
const CX_UM     = CX_DESC + CW_DESC
const CX_QTA    = CX_UM + CW_UM
const CX_PU     = CX_QTA + CW_QTA
const CX_IMP    = CX_PU + CW_PU

const ROW_H = 16
const HDR_H = 20
const COL_HDR_H = 16

// Posizioni placeholder nel template (y da bordo superiore pagina)
// Posizioni testo (la linea orizzontale è a top≈173.79)
const TEXT_AREA_TOP = 148    // sopra la linea
const TEXT_SETT_TOP = 162    // sopra la linea
const TEXT_TITLE_TOP = 192   // sotto la linea

// Inizio tabelle (sotto l'intestazione scritta dal builder)
const TABLE_START_TOP = 210

// Colori
const CLR_CAT_BG  = rgb(31 / 255, 78 / 255, 121 / 255)
const CLR_WHITE   = rgb(1, 1, 1)
const CLR_BLACK   = rgb(0, 0, 0)
const CLR_BLUE    = rgb(0, 0.357, 0.549)
const CLR_BORDER  = rgb(197 / 255, 217 / 255, 241 / 255)
const CLR_ALT_ROW = rgb(245 / 255, 249 / 255, 255 / 255)

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function firstMeaningfulValue(...vals: any[]): any {
  for (const value of vals) {
    if (value == null) continue
    if (typeof value === 'string') {
      if (value.trim() !== '') return value
      continue
    }
    return value
  }
  return undefined
}

const AREA_LABELS: Record<string, string> = {
  AMM: 'AMMINISTRATIVA',
  AGR: 'AGRARIA',
  TEC: 'TECNICA'
}

const SETTORE_LABELS: Record<string, string> = {
  CR: 'CATASTO, RUOLI E SERVIZI TERRITORIALI',
  GI: 'GESTIONE IRRIGUA',
  D1: "DISTRETTO 1 – QUARTU SANT'ELENA/VILLAPUTZU/MURAVERA – SAN SPERATE",
  D2: 'DISTRETTO 2 – SERRAMANNA/PIMPISU',
  D3: 'DISTRETTO 3 – SAN GAVINO - VILLACIDRO',
  D4: 'DISTRETTO 4 – BASSO SULCIS',
  D5: 'DISTRETTO 5 – SENORBÌ',
  D6: 'DISTRETTO 6 – CIXERRI',
  DS: 'MANUTENZIONE OPERE DI DRENO E DI SCOLO'
}

function normalizeAreaCode(value: any): 'AMM' | 'AGR' | 'TEC' | '' {
  const s = String(value ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === '1' || s === 'AMM' || s === 'AMMINISTRATIVA' || s === 'AMMINISTRAZIONE' || s.includes('AFFARI GENERALI')) return 'AMM'
  if (s === '2' || s === 'AGR' || s === 'AGRARIA' || s === 'AGRICOLA' || s === 'AGRICOLTURA') return 'AGR'
  if (s === '3' || s === 'TEC' || s === 'TECNICA' || s === 'TECNICO') return 'TEC'
  return ''
}

function normalizeSettoreCode(areaCode: string, value: any): string {
  const s = String(value ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === 'CS') return 'DS'
  if (s === '1') return areaCode === 'AGR' ? 'D1' : 'CR'
  if (s === '2') return areaCode === 'AGR' ? 'D2' : 'GI'
  if (s === '3') return 'D1'
  if (s === '4') return 'D2'
  if (s === '5') return 'D3'
  if (s === '6') return 'D4'
  if (s === '7') return 'D5'
  if (s === '8') return 'D6'
  if (s === '9') return 'DS'
  const distretto = s.match(/^D\s*([1-6])$/)
  if (distretto) return `D${distretto[1]}`
  if (s === 'DS' || s === 'D S' || s.includes('DRENO') || s.includes('SCOLO')) return 'DS'
  if (s === 'CR' || s === 'C R' || s.includes('CATASTO')) return 'CR'
  if (s === 'GI' || s === 'G I' || s.includes('GESTIONE IRRIGUA')) return 'GI'
  return s
}

function isRawAreaCodeLabel(label: string): boolean {
  const s = String(label ?? '').trim().toUpperCase()
  return s === 'AMM' || s === 'AGR' || s === 'TEC' || s === '1' || s === '2' || s === '3'
}

function isRawSettoreCodeLabel(label: string): boolean {
  const s = String(label ?? '').trim().toUpperCase().replace(/\s+/g, '')
  return s === 'CR' || s === 'GI' || s === 'DS' || s === 'CS' || /^D[1-6]$/.test(s) || /^[1-9]$/.test(s)
}

function resolveAreaLabel(areaCode: string, labelValue: any): string {
  const label = String(labelValue ?? '').trim()
  const labelCode = normalizeAreaCode(label)
  // Se il chiamante passa una label già risolta da dominio AGOL, preservala.
  if (areaCode && label && labelCode === areaCode && !isRawAreaCodeLabel(label)) return label
  if (areaCode && (!label || labelCode === areaCode)) return AREA_LABELS[areaCode] || areaCode
  if (labelCode) return isRawAreaCodeLabel(label) ? (AREA_LABELS[labelCode] || labelCode) : label
  return label
}

function resolveSettoreLabel(areaCode: string, settoreCode: string, labelValue: any): string {
  const label = String(labelValue ?? '').trim()
  const labelCode = normalizeSettoreCode(areaCode, label)
  const code = settoreCode || labelCode
  // Se il chiamante passa una label già risolta da dominio AGOL, preservala.
  if (code && label && labelCode === code && !isRawSettoreCodeLabel(label)) return label
  if (code && (!label || labelCode === code)) return SETTORE_LABELS[code] || code
  if (labelCode === 'DS' && /\bCS\b/i.test(label)) return SETTORE_LABELS.DS
  return label
}

function cleanText(s: string): string {
  if (!s) return ''
  return s
    .replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl')
    .replace(/\uFB00/g, 'ff').replace(/\uFB03/g, 'ffi').replace(/\uFB04/g, 'ffl')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  const sign = n < 0 ? -1 : 1
  const abs = Math.abs(n)
  return sign * (Math.round((abs + 1e-9) * 100) / 100)
}

function money(n: number): string {
  const rounded = roundMoney(n)
  const abs = Math.abs(rounded)
  const parts = abs.toFixed(2).split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (rounded < 0 ? '-' : '') + intPart + ',' + parts[1] + ' \u20AC'
}

function txt(
  pg: PDFPage, s: string, font: PDFFont, size: number,
  x: number, y: number, color: any, maxW?: number
): void {
  const clean = cleanText(s)
  if (!clean) return
  let fs = size
  if (maxW) {
    while (fs > 5) {
      if (font.widthOfTextAtSize(clean, fs) <= maxW) break
      fs -= 0.3
    }
  }
  pg.drawText(clean, { x, y, size: fs, font, color })
}

function centered(
  pg: PDFPage, s: string, font: PDFFont, size: number,
  x0: number, x1: number, y: number, color: any
): void {
  const clean = cleanText(s)
  if (!clean) return
  const w = font.widthOfTextAtSize(clean, size)
  pg.drawText(clean, { x: x0 + (x1 - x0 - w) / 2, y, size, font, color })
}

function rightAligned(
  pg: PDFPage, s: string, font: PDFFont, size: number,
  xLeft: number, colW: number, y: number, color: any, pad?: number
): void {
  const clean = cleanText(s)
  if (!clean) return
  const w = font.widthOfTextAtSize(clean, size)
  pg.drawText(clean, { x: xLeft + colW - w - (pad ?? 4), y, size, font, color })
}

function truncate(s: string, maxChars: number): string {
  if (!s || s.length <= maxChars) return s || ''
  return s.substring(0, maxChars - 1) + '\u2026'
}

/** Word-wrap: spezza testo in righe che entrano nella larghezza data */
function wrapText(s: string, font: PDFFont, size: number, maxW: number): string[] {
  const clean = cleanText(s || '')
  if (!clean) return ['']
  const words = clean.split(/\s+/).filter(w => w)
  if (!words.length) return ['']
  const lines: string[] = []
  let cur = words[0]
  for (let i = 1; i < words.length; i++) {
    const test = cur + ' ' + words[i]
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      cur = test
    } else {
      lines.push(cur)
      cur = words[i]
    }
  }
  lines.push(cur)
  return lines
}

function hLine(pg: PDFPage, x0: number, x1: number, y: number, thickness?: number, color?: any): void {
  pg.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: thickness ?? 0.5, color: color ?? CLR_BORDER })
}

function vLine(pg: PDFPage, x: number, y0: number, y1: number, thickness?: number): void {
  pg.drawLine({ start: { x, y: y0 }, end: { x, y: y1 }, thickness: thickness ?? 0.5, color: CLR_BORDER })
}

function fillRect(pg: PDFPage, x: number, yBottom: number, w: number, h: number, color: any): void {
  pg.drawRectangle({ x, y: yBottom, width: w, height: h, color })
}

function strokeRect(pg: PDFPage, x: number, yBottom: number, w: number, h: number, borderColor?: any, thickness?: number): void {
  pg.drawRectangle({ x, y: yBottom, width: w, height: h, borderColor: borderColor ?? CLR_BORDER, borderWidth: thickness ?? 0.5, color: rgb(1, 1, 1) })
}

/** y pdf-lib per centrare verticalmente il testo in una riga */
function centeredY(topFromPage: number, rowH: number, fontSize: number): number {
  return PH - topFromPage - (rowH + fontSize * 0.75) / 2
}

function truthyStatusFlag (value: any): boolean {
  const s = String(value ?? '').trim().toLowerCase()
  return value === true || value === 1 || s === '1' || s === 'true' || s === 'sì' || s === 'si'
}

function isRejectedFlag (value: any): boolean {
  const s = String(value ?? '').trim().toLowerCase()
  return truthyStatusFlag(value) || s.includes('respint')
}

function isInProgressFlag (value: any): boolean {
  const s = String(value ?? '').trim().toLowerCase()
  return truthyStatusFlag(value) || s.includes('istruttoria')
}

function drawStatusWatermark (pg: PDFPage, text: string, font: PDFFont, color: any, opacity: number): void {
  const { width, height } = pg.getSize()
  let size = text.length > 10 ? 52 : 74
  size = Math.min(size, width * (text.length > 10 ? 0.09 : 0.12))
  size = Math.max(text.length > 10 ? 38 : 54, size)
  while (size > 32 && font.widthOfTextAtSize(text, size) > width * 0.92) size -= 1

  const tw = font.widthOfTextAtSize(text, size)
  const angle = 35
  const rad = angle * Math.PI / 180
  const rotatedW = tw * Math.cos(rad) - size * Math.sin(rad)
  const rotatedH = tw * Math.sin(rad) + size * Math.cos(rad)
  pg.drawText(text, {
    x: width / 2 - rotatedW / 2,
    y: height / 2 - rotatedH / 2,
    size,
    font,
    color,
    opacity,
    rotate: degrees(angle)
  })
}

/* ------------------------------------------------------------------ */
/*  Builder principale                                                 */
/* ------------------------------------------------------------------ */

export async function buildNotaSpesePdf(data: NotaSpeseData): Promise<Uint8Array> {
  // Carica template
  const tplBytes = b64ToBytes(NOTASPESE_BASE_PDF_B64)
  const doc = await PDFDocument.load(tplBytes)
  doc.registerFontkit(fontkit)

  const fontR = await doc.embedFont(b64ToBytes(CALIBRI_REGULAR_B64))
  const fontB = await doc.embedFont(b64ToBytes(CALIBRI_BOLD_B64))

  // Pagina 1 dal template
  let pg = doc.getPage(0)

  // Intestazione
  const areaCod = normalizeAreaCode(firstMeaningfulValue(data.area_cod, data.area, data.area_label))
  const settoreCod = normalizeSettoreCode(areaCod, firstMeaningfulValue(data.settore_cod, data.settore, data.settore_label))
  const areaLabel = resolveAreaLabel(areaCod, data.area_label)
  const settoreLabel = resolveSettoreLabel(areaCod, settoreCod, data.settore_label)
  if (areaLabel) centered(pg, 'AREA ' + areaLabel, fontR, 9, ML, PW - MR, PH - TEXT_AREA_TOP, CLR_BLUE)
  if (settoreLabel) centered(pg, 'SETTORE ' + settoreLabel, fontR, 9, ML, PW - MR, PH - TEXT_SETT_TOP, CLR_BLUE)
  const nsBaseTitle = data.numero_nota
    ? `NOTA SPESE N. ${data.numero_nota} ALLEGATA AL RAPPORTO TECNICO DI RILEVAZIONE`
    : 'NOTA SPESE ALLEGATA AL RAPPORTO TECNICO DI RILEVAZIONE'
  const nsTitle = data.cod_pratica ? `${nsBaseTitle} N. ${data.cod_pratica}` : nsBaseTitle
  const titleW = fontB.widthOfTextAtSize(nsTitle, 10)
  if (titleW <= TW) {
    centered(pg, nsTitle, fontB, 10, ML, PW - MR, PH - TEXT_TITLE_TOP, CLR_BLUE)
  } else {
    centered(pg, nsBaseTitle, fontB, 10, ML, PW - MR, PH - TEXT_TITLE_TOP, CLR_BLUE)
    centered(pg, 'N. ' + (data.cod_pratica || ''), fontB, 10, ML, PW - MR, PH - TEXT_TITLE_TOP - 14, CLR_BLUE)
  }

  let top = (titleW <= TW) ? TABLE_START_TOP : TABLE_START_TOP + 14

  const titoloNota = cleanText(String(data.titolo_nota || '').trim())
  if (titoloNota) {
    centered(pg, titoloNota, fontB, 9, ML, PW - MR, PH - top, CLR_BLUE)
    top += 14
  }

  function newPage(): void {
    pg = doc.addPage([PW, PH])
    top = 36
  }

  function ensureSpace(needed: number): boolean {
    if (top + needed > PH - PAGE_BOTTOM) {
      newPage()
      return true
    }
    return false
  }

  /* ---- Tabelle per categoria ---- */

  for (const cat of CATEGORY_ORDER) {
    const catRows = (data.rows[cat] || []).slice().sort((a, b) => a.ordine - b.ordine)
    if (catRows.length === 0) continue

    const catSubtotal = data.summary[CATEGORY_TOTAL_KEY[cat]]

    ensureSpace(HDR_H + COL_HDR_H + ROW_H + ROW_H + 4)

    // Header categoria
    const catHdrY = PH - top - HDR_H
    fillRect(pg, ML, catHdrY, TW, HDR_H, CLR_CAT_BG)
    centered(pg, NS_CATEGORY_LABELS[cat], fontB, 9, ML, PW - MR, centeredY(top, HDR_H, 9), CLR_WHITE)
    top += HDR_H

    drawColumnHeaders(pg, fontB, top)
    top += COL_HDR_H

    const DESC_LH = 10
    const DESC_PAD = 3

    for (let ri = 0; ri < catRows.length; ri++) {
      const row = catRows[ri]

      // Word-wrap codice e descrizione per altezza riga dinamica
      const codLines = wrapText(row.codice_voce_snapshot, fontR, 7.5, CW_CODICE - 6)
      const descLines = wrapText(row.descrizione_snapshot, fontR, 7.5, CW_DESC - 6)
      const codH = codLines.length * DESC_LH + DESC_PAD * 2
      const descH = descLines.length * DESC_LH + DESC_PAD * 2
      const rowH = Math.max(ROW_H, codH, descH)

      ensureSpace(rowH + ROW_H)
      if (top <= 36 + 1) {
        drawColumnHeaders(pg, fontB, top)
        top += COL_HDR_H
      }

      const rowY = PH - top - rowH

      if (ri % 2 === 0) fillRect(pg, ML, rowY, TW, rowH, CLR_ALT_ROW)

      hLine(pg, ML, PW - MR, rowY)
      hLine(pg, ML, PW - MR, rowY + rowH)

      // Colonne a valore singolo: centrate verticalmente nella riga
      const textY = centeredY(top, rowH, 7.5)
      centered(pg, row.unita_misura_snapshot || '', fontR, 7.5, CX_UM, CX_UM + CW_UM, textY, CLR_BLACK)
      rightAligned(pg, formatQty(row.quantita), fontR, 7.5, CX_QTA, CW_QTA, textY, CLR_BLACK)
      rightAligned(pg, money(row.prezzo_unitario_snapshot), fontR, 7.5, CX_PU, CW_PU, textY, CLR_BLACK)
      rightAligned(pg, money(row.importo_riga), fontR, 7.5, CX_IMP, CW_IMP, textY, CLR_BLACK)

      // Codice: multi-riga, allineato in alto con padding
      let cY = PH - top - DESC_PAD - 7.5 * 0.75
      for (const line of codLines) {
        txt(pg, line, fontR, 7.5, CX_CODICE + 3, cY, CLR_BLACK, CW_CODICE - 6)
        cY -= DESC_LH
      }

      // Descrizione: multi-riga, allineata in alto con padding
      let dY = PH - top - DESC_PAD - 7.5 * 0.75
      for (const line of descLines) {
        txt(pg, line, fontR, 7.5, CX_DESC + 3, dY, CLR_BLACK, CW_DESC - 6)
        dY -= DESC_LH
      }

      drawColumnVerticals(pg, rowY, rowH)
      top += rowH
    }

    // Subtotale
    ensureSpace(ROW_H)
    const subY = PH - top - ROW_H
    hLine(pg, ML, PW - MR, subY)
    hLine(pg, ML, PW - MR, subY + ROW_H)
    drawColumnVerticals(pg, subY, ROW_H)

    rightAligned(pg, 'Subtotale', fontB, 8.5, CX_PU, CW_PU, centeredY(top, ROW_H, 8.5), CLR_BLACK)
    rightAligned(pg, money(catSubtotal), fontB, 8.5, CX_IMP, CW_IMP, centeredY(top, ROW_H, 8.5), CLR_BLACK)
    top += ROW_H + 10
  }

  /* ---- Riepilogo delle sole voci ordinarie ---- */

  const totSomma = roundMoney(data.summary.totaleAT + data.summary.totalePR +
    data.summary.totaleRU + data.summary.totaleSL + data.summary.totalePF)
  const hasOrdinaryCosts = totSomma !== 0 || roundMoney(data.summary.importoSpeseGenerali) !== 0

  if (hasOrdinaryCosts) {
    ensureSpace(58)
    top += 4
    pg.drawLine({ start: { x: CX_PU, y: PH - top }, end: { x: PW - MR, y: PH - top }, thickness: 1, color: CLR_BLACK })
    top += 6

    txt(pg, 'Totale voci ordinarie', fontB, 9, CX_PU + 3, centeredY(top, 14, 9), CLR_BLACK)
    rightAligned(pg, money(totSomma), fontB, 9, CX_IMP, CW_IMP, centeredY(top, 14, 9), CLR_BLACK)
    top += 16

    const sgLabel = 'Spese generali: ' + formatPercent(data.summary.percentualeSpeseGenerali) + '% sulle sole voci ordinarie'
    txt(pg, sgLabel, fontR, 9, ML, centeredY(top, 14, 9), CLR_BLACK)
    rightAligned(pg, money(data.summary.importoSpeseGenerali), fontB, 9, CX_IMP, CW_IMP, centeredY(top, 14, 9), CLR_BLACK)
    top += 22
  }

  /* ---- Sezione Art. 30: attrezzature da rimborsare ---- */

  const art30Rows = (data.art30?.rows || []).filter(row => row && Number(row.quantita) > 0)
  const art30Rimborso = roundMoney(Number(data.art30?.rimborso) || art30Rows.reduce((sum, row) => sum + (Number(row.importo) || 0), 0))
  const art30Cauzione = roundMoney(Math.abs(Number(data.art30?.cauzione) || 0))
  const art30Netto = roundMoney(Number.isFinite(Number(data.art30?.netto))
    ? Number(data.art30?.netto)
    : art30Rimborso - art30Cauzione)
  const hasArt30 = art30Rows.length > 0 || art30Rimborso !== 0 || art30Cauzione !== 0 || art30Netto !== 0

  if (hasArt30) {
    ensureSpace(HDR_H + COL_HDR_H + ROW_H * 3 + 14)

    const art30HdrY = PH - top - HDR_H
    fillRect(pg, ML, art30HdrY, TW, HDR_H, CLR_CAT_BG)
    centered(pg, 'Attrezzature da rimborsare — Art. 30', fontB, 9, ML, PW - MR, centeredY(top, HDR_H, 9), CLR_WHITE)
    top += HDR_H

    drawColumnHeaders(pg, fontB, top)
    top += COL_HDR_H

    const rowsToDraw = art30Rows.length > 0
      ? art30Rows
      : [{ codice: '', descrizione: 'Rimborso attrezzature', quantita: 1, valore_unitario: art30Rimborso, importo: art30Rimborso }]

    for (let ri = 0; ri < rowsToDraw.length; ri++) {
      const row = rowsToDraw[ri]
      const descLines = wrapText(String(row.descrizione || ''), fontR, 7.5, CW_DESC - 6)
      const rowH = Math.max(ROW_H, descLines.length * 10 + 6)
      ensureSpace(rowH + ROW_H * 2)
      if (top <= 36 + 1) {
        drawColumnHeaders(pg, fontB, top)
        top += COL_HDR_H
      }

      const rowY = PH - top - rowH
      if (ri % 2 === 0) fillRect(pg, ML, rowY, TW, rowH, CLR_ALT_ROW)
      hLine(pg, ML, PW - MR, rowY)
      hLine(pg, ML, PW - MR, rowY + rowH)
      drawColumnVerticals(pg, rowY, rowH)

      const textY = centeredY(top, rowH, 7.5)
      txt(pg, String(row.codice || '').trim(), fontR, 7.5, CX_CODICE + 3, textY, CLR_BLACK, CW_CODICE - 6)
      centered(pg, 'n.', fontR, 7.5, CX_UM, CX_UM + CW_UM, textY, CLR_BLACK)
      rightAligned(pg, formatQty(Number(row.quantita) || 0), fontR, 7.5, CX_QTA, CW_QTA, textY, CLR_BLACK)
      if (row.valore_unitario != null && Number.isFinite(Number(row.valore_unitario))) {
        rightAligned(pg, money(Number(row.valore_unitario)), fontR, 7.5, CX_PU, CW_PU, textY, CLR_BLACK)
      }
      rightAligned(pg, money(Number(row.importo) || 0), fontR, 7.5, CX_IMP, CW_IMP, textY, CLR_BLACK)

      let dY = PH - top - 3 - 7.5 * 0.75
      for (const line of descLines) {
        txt(pg, line, fontR, 7.5, CX_DESC + 3, dY, CLR_BLACK, CW_DESC - 6)
        dY -= 10
      }
      top += rowH
    }

    if (art30Cauzione !== 0) {
      ensureSpace(ROW_H * 2)
      const rowY = PH - top - ROW_H
      if (rowsToDraw.length % 2 === 0) fillRect(pg, ML, rowY, TW, ROW_H, CLR_ALT_ROW)
      hLine(pg, ML, PW - MR, rowY)
      hLine(pg, ML, PW - MR, rowY + ROW_H)
      drawColumnVerticals(pg, rowY, ROW_H)
      txt(pg, 'Decurtazione della cauzione', fontR, 7.5, CX_DESC + 3, centeredY(top, ROW_H, 7.5), CLR_BLACK, CW_DESC - 6)
      rightAligned(pg, money(-art30Cauzione), fontR, 7.5, CX_IMP, CW_IMP, centeredY(top, ROW_H, 7.5), CLR_BLACK)
      top += ROW_H
    }

    ensureSpace(ROW_H)
    const subY = PH - top - ROW_H
    hLine(pg, ML, PW - MR, subY)
    hLine(pg, ML, PW - MR, subY + ROW_H)
    drawColumnVerticals(pg, subY, ROW_H)
    rightAligned(pg, 'Subtotale', fontB, 8.5, CX_PU, CW_PU, centeredY(top, ROW_H, 8.5), CLR_BLACK)
    rightAligned(pg, money(art30Netto), fontB, 8.5, CX_IMP, CW_IMP, centeredY(top, ROW_H, 8.5), CLR_BLACK)
    top += ROW_H + 10
  }

  /* ---- Piede: totale complessivo ---- */

  ensureSpace(46)
  top += 4
  pg.drawLine({ start: { x: CX_PU, y: PH - top }, end: { x: PW - MR, y: PH - top }, thickness: 1, color: CLR_BLACK })
  top += 6

  const totaleComplessivoConArt30 = roundMoney(Number(data.summary.totaleComplessivo || 0) + (hasArt30 ? art30Netto : 0))
  const tcBoxH = 22
  const tcBoxW = CW_PU + CW_IMP + 80
  const tcBoxX = PW - MR - tcBoxW
  const tcBoxY = PH - top - tcBoxH
  pg.drawRectangle({ x: tcBoxX, y: tcBoxY, width: tcBoxW, height: tcBoxH, color: CLR_ALT_ROW, borderColor: CLR_BORDER, borderWidth: 0.5 })
  txt(pg, 'TOTALE COMPLESSIVO', fontB, 10, tcBoxX + 6, centeredY(top, tcBoxH, 10), CLR_BLACK)
  rightAligned(pg, money(totaleComplessivoConArt30), fontB, 10, CX_IMP, CW_IMP, centeredY(top, tcBoxH, 10), CLR_BLACK)
  top += tcBoxH + 30

  /* ---- Firma ---- */

  ensureSpace(50)
  txt(pg, data.luogo_data || '', fontR, 9, ML, centeredY(top, 14, 9), CLR_BLACK)
  rightAligned(pg, 'Il tecnico istruttore', fontR, 9, ML, TW, centeredY(top, 14, 9), CLR_BLACK, 0)
  top += 20
  rightAligned(pg, data.firma_nome || '', fontB, 9, ML, TW, centeredY(top, 14, 9), CLR_BLACK, 0)

  drawIndependentPageNumbers()

  if (isRejectedFlag(data.rapporto_respinto)) {
    doc.getPages().forEach(page => drawStatusWatermark(page, 'RESPINTO', fontB, rgb(0.60, 0.10, 0.10), 0.24))
  } else if (isInProgressFlag(data.rapporto_istruttoria)) {
    doc.getPages().forEach(page => drawStatusWatermark(page, 'ISTRUTTORIA IN CORSO', fontB, rgb(0.60, 0.60, 0.60), 0.28))
  }

  return doc.save()

  /* ---- Funzioni interne ---- */

  function drawIndependentPageNumbers(): void {
    const pages = doc.getPages()
    const totalPages = pages.length
    const footerY = PH - 818 - 7 * 0.75

    pages.forEach((page, index) => {
      rightAligned(
        page,
        `Allegato - Nota spese - Pag. ${index + 1} di ${totalPages}`,
        fontR,
        7,
        ML,
        TW,
        footerY,
        CLR_BLUE,
        0
      )
    })
  }

  function drawColumnHeaders(p: PDFPage, fb: PDFFont, t: number): void {
    const y0 = PH - t - COL_HDR_H
    fillRect(p, ML, y0, TW, COL_HDR_H, rgb(0.92, 0.92, 0.92))
    hLine(p, ML, PW - MR, y0)
    hLine(p, ML, PW - MR, y0 + COL_HDR_H)
    drawColumnVerticals(p, y0, COL_HDR_H)
    const ty = centeredY(t, COL_HDR_H, 7.5)
    centered(p, 'Codice', fb, 7.5, CX_CODICE, CX_CODICE + CW_CODICE, ty, CLR_BLACK)
    centered(p, 'Descrizione', fb, 7.5, CX_DESC, CX_DESC + CW_DESC, ty, CLR_BLACK)
    centered(p, 'U.M.', fb, 7.5, CX_UM, CX_UM + CW_UM, ty, CLR_BLACK)
    centered(p, 'Q.t\u00E0', fb, 7.5, CX_QTA, CX_QTA + CW_QTA, ty, CLR_BLACK)
    centered(p, 'Prezzo unit.', fb, 7.5, CX_PU, CX_PU + CW_PU, ty, CLR_BLACK)
    centered(p, 'Importo', fb, 7.5, CX_IMP, CX_IMP + CW_IMP, ty, CLR_BLACK)
  }

  function drawColumnVerticals(p: PDFPage, yBottom: number, h: number): void {
    const yTop = yBottom + h
    vLine(p, ML, yBottom, yTop)
    vLine(p, CX_DESC, yBottom, yTop)
    vLine(p, CX_UM, yBottom, yTop)
    vLine(p, CX_QTA, yBottom, yTop)
    vLine(p, CX_PU, yBottom, yTop)
    vLine(p, CX_IMP, yBottom, yTop)
    vLine(p, PW - MR, yBottom, yTop)
  }
}

/* ------------------------------------------------------------------ */
/*  Utilità                                                            */
/* ------------------------------------------------------------------ */

function formatQty(n: number): string {
  if (n == null) return ''
  return Number.isInteger(n)
    ? n.toLocaleString('it-IT')
    : n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

function formatPercent(n: number): string {
  if (n == null) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}

// =================================================================
// rapporto-pdf-builder.ts  (v4 — auto-sizing + giustificazione)
// =================================================================
import { PDFDocument, type PDFFont, type PDFPage, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { CALIBRI_REGULAR_B64, CALIBRI_BOLD_B64 } from './calibri-fonts'
import { BASE_PDF_B64 } from './base-pdf'

// ── Costanti ──
const PH = 841.92
const BLACK = rgb(0, 0, 0)
const BLUE  = rgb(0, 0.357, 0.549)
const WHITE = rgb(1, 1, 1)

/** pdfplumber top → pdf-lib baseline y */
function bY (top: number, size: number): number {
  return PH - top - size * 0.75
}

function unesc (s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
}

function b64ToBytes (b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function firstMeaningfulValue (...vals: any[]): any {
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

function normalizeAreaCode (value: any): 'AMM' | 'AGR' | 'TEC' | '' {
  const s = String(value ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === '1' || s === 'AMM' || s === 'AMMINISTRATIVA' || s === 'AMMINISTRAZIONE' || s.includes('AFFARI GENERALI')) return 'AMM'
  if (s === '2' || s === 'AGR' || s === 'AGRARIA' || s === 'AGRICOLA' || s === 'AGRICOLTURA') return 'AGR'
  if (s === '3' || s === 'TEC' || s === 'TECNICA' || s === 'TECNICO') return 'TEC'
  return ''
}

function normalizeSettoreCode (areaCode: string, value: any): string {
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

function isRawAreaCodeLabel (label: string): boolean {
  const s = String(label ?? '').trim().toUpperCase()
  return s === 'AMM' || s === 'AGR' || s === 'TEC' || s === '1' || s === '2' || s === '3'
}

function isRawSettoreCodeLabel (label: string): boolean {
  const s = String(label ?? '').trim().toUpperCase().replace(/\s+/g, '')
  return s === 'CR' || s === 'GI' || s === 'DS' || s === 'CS' || /^D[1-6]$/.test(s) || /^[1-9]$/.test(s)
}

function resolveAreaLabel (areaCode: string, labelValue: any): string {
  const label = String(labelValue ?? '').trim()
  const labelCode = normalizeAreaCode(label)
  // Se il chiamante passa una label già risolta da dominio AGOL, preservala.
  if (areaCode && label && labelCode === areaCode && !isRawAreaCodeLabel(label)) return label
  if (areaCode && (!label || labelCode === areaCode)) return AREA_LABELS[areaCode] || areaCode
  if (labelCode) return isRawAreaCodeLabel(label) ? (AREA_LABELS[labelCode] || labelCode) : label
  return label
}

function resolveSettoreLabel (areaCode: string, settoreCode: string, labelValue: any): string {
  const label = String(labelValue ?? '').trim()
  const labelCode = normalizeSettoreCode(areaCode, label)
  const code = settoreCode || labelCode
  // Se il chiamante passa una label già risolta da dominio AGOL, preservala.
  if (code && label && labelCode === code && !isRawSettoreCodeLabel(label)) return label
  if (code && (!label || labelCode === code)) return SETTORE_LABELS[code] || code
  if (labelCode === 'DS' && /\bCS\b/i.test(label)) return SETTORE_LABELS.DS
  return label
}

/** Pulisce legature Unicode e caratteri invisibili */
function cleanText (s: string): string {
  return s
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/ +/g, ' ')
}

// ── Testo centrato in cella ──
function centered (
  pg: PDFPage, s: string, font: PDFFont, size: number,
  x0: number, x1: number, y: number, color = BLACK
): void {
  if (!s) return
  const tw = font.widthOfTextAtSize(s, size)
  pg.drawText(s, { x: x0 + (x1 - x0 - tw) / 2, y, size, font, color })
}

// ── Testo con maxWidth (riduce font se non entra) ──
function txt (
  pg: PDFPage, s: string, font: PDFFont, size: number,
  x: number, y: number, color = BLACK, maxW?: number
): void {
  if (!s) return
  let sz = size
  if (maxW) {
    while (sz > 4 && font.widthOfTextAtSize(s, sz) > maxW) sz -= 0.5
  }
  pg.drawText(s, { x, y, size: sz, font, color })
}

/** Word-wrap: spezza testo in righe, restituisce righe + flag ultima del paragrafo */
function wrapLines (
  s: string, font: PDFFont, size: number, width: number
): Array<{ words: string[]; isLast: boolean }> {
  const rows: Array<{ words: string[]; isLast: boolean }> = []
  for (const para of s.split('\n')) {
    if (!para.trim()) { rows.push({ words: [], isLast: true }); continue }
    const words = para.split(/\s+/).filter(w => w)
    if (!words.length) { rows.push({ words: [], isLast: true }); continue }
    let cur: string[] = [words[0]]
    for (let i = 1; i < words.length; i++) {
      const test = cur.join(' ') + ' ' + words[i]
      if (font.widthOfTextAtSize(test, size) <= width) {
        cur.push(words[i])
      } else {
        rows.push({ words: [...cur], isLast: false })
        cur = [words[i]]
      }
    }
    rows.push({ words: [...cur], isLast: true })
  }
  return rows
}

// ── Textarea multi-riga: auto-sizing + giustificazione ──
function textArea (
  pg: PDFPage, s: string, font: PDFFont, size: number,
  x: number, topPdf: number, width: number, maxH: number, lh = 11
): void {
  if (!s) return
  const clean = cleanText(s)

  // Auto-sizing: prova con il font originale, se non entra riduce
  let sz = size
  let lineH = lh
  let rows = wrapLines(clean, font, sz, width)

  while (sz > 5 && rows.length * lineH > maxH) {
    sz -= 0.5
    lineH = sz * 1.3
    rows = wrapLines(clean, font, sz, width)
  }

  // Rendering con giustificazione
  let yPos = bY(topPdf, sz)
  for (const row of rows) {
    if (!row.words.length) { yPos -= lineH; continue }

    const text = row.words.join(' ')

    if (row.isLast || row.words.length <= 1) {
      // Ultima riga del paragrafo o parola singola: allineata a sinistra
      pg.drawText(text, { x, y: yPos, size: sz, font, color: BLACK })
    } else {
      // Riga intermedia: giustificata
      const totalWordsW = row.words.reduce((sum, w) => sum + font.widthOfTextAtSize(w, sz), 0)
      const extraSpace = (width - totalWordsW) / (row.words.length - 1)
      // Se lo spazio extra è eccessivo, allinea a sinistra
      if (extraSpace > sz * 1.5) {
        pg.drawText(text, { x, y: yPos, size: sz, font, color: BLACK })
      } else {
        let cx = x
        for (const word of row.words) {
          pg.drawText(word, { x: cx, y: yPos, size: sz, font, color: BLACK })
          cx += font.widthOfTextAtSize(word, sz) + extraSpace
        }
      }
    }
    yPos -= lineH
  }
}

// ── Colonne tabella infrazioni (bordi verticali dal template v3) ──
//    62.3 | 84.6 | 303.0 | 324.2 | 373.9 | 423.6 | 466.1 | 532.6
const C = {
  chk0: 62.3,  chk1: 84.6,
  dic0: 324.2, dic1: 373.9,
  irr0: 373.9, irr1: 423.6,
  gra0: 423.6, gra1: 466.1,
  occ0: 466.1, occ1: 532.6
}

// Top di ogni riga articolo (dalla posizione del numero articolo)
const ROWS: Array<{ art: string; top: number }> = [
  { art: '08', top: 350.96 },
  { art: '12', top: 371.84 },
  { art: '15', top: 392.84 },
  { art: '16', top: 420.92 },
  { art: '17', top: 455.96 },
  { art: '27', top: 484.04 },
  { art: '28', top: 505.04 },
  { art: '29', top: 525.92 },
  { art: '30', top: 546.92 },
  { art: '31', top: 567.80 },
  { art: '32', top: 588.80 },
  { art: '33', top: 609.80 },
  { art: '34', top: 630.68 },
  { art: '35', top: 658.75 },
  { art: '36', top: 686.84 },
  { art: '37', top: 707.72 },
  { art: '39', top: 728.72 }
]

// ══════════════════════════════════════════════════════════════
export async function buildRapportoPdf (m: Record<string, string>): Promise<Uint8Array> {
  const pdfBytes = b64ToBytes(BASE_PDF_B64)
  const doc = await PDFDocument.load(pdfBytes)
  doc.registerFontkit(fontkit)

  const fR = await doc.embedFont(b64ToBytes(CALIBRI_REGULAR_B64), { subset: false })
  const fB = await doc.embedFont(b64ToBytes(CALIBRI_BOLD_B64), { subset: false })

  const p1 = doc.getPages()[0]
  const p2 = doc.getPages()[1]
  const v = (k: string) => unesc(m[k] ?? '')

  // ── PDF metadata ──
  const codP = v('cod_pratica')
  doc.setTitle(codP ? `Rapporto ${codP}` : 'Rapporto Tecnico di Rilevazione')

  // ════════════════════════════════════════════════════════════
  //  PAGINA 1
  // ════════════════════════════════════════════════════════════

  // ── Area / Settore centrati (sopra la linea a top=176.64) ──
  const areaCod = normalizeAreaCode(firstMeaningfulValue(m.area_cod, m.area, m.area_label))
  const settoreCod = normalizeSettoreCode(areaCod, firstMeaningfulValue(m.settore_cod, m.settore, m.settore_label))
  const areaL = resolveAreaLabel(areaCod, v('area_label'))
  const settL = resolveSettoreLabel(areaCod, settoreCod, v('settore_label'))
  if (areaL) centered(p1, `AREA ${areaL}`, fB, 9, 62.3, 532.6, bY(148, 9), BLUE)
  if (settL) centered(p1, `SETTORE ${settL}`, fB, 9, 62.3, 532.6, bY(162, 9), BLUE)

  // ── Titolo centrato (sotto la linea) ──
  const titolo = codP
    ? `RAPPORTO TECNICO DI RILEVAZIONE N. ${codP}`
    : 'RAPPORTO TECNICO DI RILEVAZIONE'
  centered(p1, titolo, fB, 12, 62.3, 532.6, bY(190, 12), BLUE)

  // ── Il sottoscritto / il giorno / alle ore ──
  txt(p1, v('tecnico_rilevatore'), fR, 9, 132, bY(237.71, 9), BLACK, 200)
  txt(p1, v('data_rilevazione'), fR, 9, 376, bY(237.71, 9), BLACK, 56)
  txt(p1, v('ora_rilevazione'), fR, 9, 469, bY(237.71, 9), BLACK, 66)

  // ── Tabella infrazioni ──
  const artSz = 8
  for (const row of ROWS) {
    const y = bY(row.top, artSz)
    centered(p1, v(`x_art${row.art}`), fB, artSz, C.chk0, C.chk1, y)
    centered(p1, v(`sup_dich_art${row.art}`), fR, artSz, C.dic0, C.dic1, y)
    centered(p1, v(`sup_irr_art${row.art}`), fR, artSz, C.irr0, C.irr1, y)
    centered(p1, v(`grado_art${row.art}`), fR, artSz, C.gra0, C.gra1, y)

    const occ = v(`recidiva_art${row.art}`)
    if (occ) {
      if (occ === 'Prima contestazione') {
        centered(p1, 'Prima', fR, 7.5, C.occ0, C.occ1, y + 4)
        centered(p1, 'contestazione', fR, 7.5, C.occ0, C.occ1, y - 5)
      } else {
        centered(p1, occ, fR, 7.5, C.occ0, C.occ1, y)
      }
    }
  }

  // ── Importo (top=770.27) ──
  txt(p1, v('importo_rimborso'), fR, 8.5, 165, bY(770.27, 8.5), BLACK, 140)

  // ════════════════════════════════════════════════════════════
  //  PAGINA 2
  // ════════════════════════════════════════════════════════════
  const taSz = 8
  const taLh = 10.5
  const taW  = 460

  // ── Descrizione dettagliata (area da top≈113 a top≈220) ──
  textArea(p2, v('descrizione_fatti'), fR, taSz, 67, 118, taW, 99, taLh)

  // ── Altre circostanze (area da top≈241 a top≈339) ──
  textArea(p2, v('circostanze'), fR, taSz, 67, 238, taW, 99, taLh)

  // ── Descrizione dei luoghi (area da top≈360 a top≈457) ──
  textArea(p2, v('descrizione_luogo'), fR, taSz, 67, 360, taW, 99, taLh)

  // ── Distretto / Comizio / Idrante (top=457.19) ──
  const dsz = 8.5
  txt(p2, v('distretto_irriguo'), fR, dsz, 157, bY(457.19, dsz), BLACK, 180)
  txt(p2, v('comizio'), fR, dsz, 392, bY(457.19, dsz), BLACK, 45)
  txt(p2, v('idrante'), fR, dsz, 486, bY(457.19, dsz), BLACK, 45)

  // ── Matricole (top=478.19) ──
  txt(p2, v('matricola_contatore'), fR, dsz, 157, bY(478.19, dsz), BLACK, 145)
  txt(p2, v('matricola_tessera'), fR, dsz, 392, bY(478.19, dsz), BLACK, 138)

  // ── DATI DEL TRASGRESSORE — PF vs PG ──
  const isPG = v('tipo_soggetto') === 'PG'
  const LABEL_BG = rgb(0.855, 0.918, 0.961)

  if (isPG) {
    // Copro "Nome e Cognome:" e riscrivo "Ragione Sociale:"
    p2.drawRectangle({ x: 63.5, y: bY(554, 1), width: 82, height: 13, color: LABEL_BG })
    txt(p2, 'Ragione Sociale:', fR, dsz, 65.4, bY(544.07, dsz), BLUE)
    // Copro "C.F.:" e riscrivo "P.IVA:"
    p2.drawRectangle({ x: 354, y: bY(554, 1), width: 30, height: 13, color: LABEL_BG })
    txt(p2, 'P.IVA:', fR, dsz, 355.68, bY(544.07, dsz), BLUE)
    // Copro "Residenza" e riscrivo "Sede legale" in BLU
    p2.drawRectangle({ x: 240, y: bY(576, 1), width: 115, height: 13, color: WHITE })
    centered(p2, 'Sede legale', fB, 9.5, 62.3, 532.6, bY(565.32, 9.5), BLUE)
  }

  // Valore denominazione (top=544.44, valore da x≈150)
  txt(p2, v('denominazione'), fR, dsz, 150, bY(544.44, dsz), BLACK, 200)
  // Valore CF/PIVA (top=544.44, valore da x≈391)
  txt(p2, v('cf_piva'), fR, dsz, 392, bY(544.44, dsz), BLACK, 138)

  // ── Via / N. / Comune / CAP (top=585.95) ──
  txt(p2, v('via'), fR, dsz, 115, bY(585.95, dsz), BLACK, 110)
  txt(p2, v('civico'), fR, dsz, 250, bY(585.95, dsz), BLACK, 32)
  txt(p2, v('citta'), fR, dsz, 328, bY(585.95, dsz), BLACK, 123)
  txt(p2, v('cap'), fR, dsz, 486, bY(585.95, dsz), BLACK, 45)

  // Località (top=606.83)
  txt(p2, v('localita'), fR, dsz, 115, bY(606.83, dsz), BLACK, 415)
  // Telefono / Cellulare / e-mail / PEC (top=627.83)
  txt(p2, v('telefono'), fR, dsz, 115, bY(627.83, dsz), BLACK, 60)
  txt(p2, v('cellulare'), fR, dsz, 229, bY(627.83, dsz), BLACK, 60)
  txt(p2, v('email'), fR, dsz, 328, bY(627.83, dsz), BLACK, 82)
  txt(p2, v('pec'), fR, dsz, 441, bY(627.83, dsz), BLACK, 90)

  // Trasgressore presente? (top=648.83)
  txt(p2, v('presenza_trasgressore'), fR, dsz, 193, bY(648.83, dsz), BLACK, 95)

  // ── FIRMATO ──
  const fSz = 8.5
  txt(p2, v('firma_tr'), fR, fSz, 193, bY(693.96, fSz), BLACK, 338)
  txt(p2, v('firma_ti'), fR, fSz, 193, bY(714.84, fSz), BLACK, 338)
  txt(p2, v('firma_rz'), fR, fSz, 193, bY(735.84, fSz), BLACK, 338)
  txt(p2, v('firma_ri'), fR, fSz, 193, bY(756.72, fSz), BLACK, 338)

  // 5a firma — template ha "Agraria", se TEC copro e riscrivo
  if (areaCod === 'TEC') {
    p2.drawRectangle({ x: 63.5, y: bY(789, 1), width: 125, height: 13, color: LABEL_BG })
    txt(p2, "Il Direttore dell'Area Tecnica:", fB, fSz, 65.4, bY(777.35, fSz), BLACK)
  }
  txt(p2, v('firma_dt'), fR, fSz, 193, bY(777.72, fSz), BLACK, 338)

  // ── Data compilazione (fondo pagina) ──
  const dc = v('data_compilazione')
  if (dc) txt(p2, 'Cagliari, ' + dc, fR, 8, 65.4, bY(800, 8), BLACK)

  return await doc.save()
}

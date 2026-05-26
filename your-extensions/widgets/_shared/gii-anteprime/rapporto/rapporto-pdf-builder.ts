// =================================================================
// rapporto-pdf-builder.ts  (v4 — auto-sizing + giustificazione)
// =================================================================
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from 'pdf-lib'
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

function formatSurfaceHaACa (raw: any): string {
  if (raw == null) return ''
  const txt = String(raw).trim()
  if (!txt) return ''
  if (/^\d+\.\d{2}\.\d{2}$/.test(txt)) return txt

  const compact = txt.replace(/\s+/g, '')
  let num: number
  if (typeof raw === 'number') {
    num = raw
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(compact)) {
    num = Number(compact.replace(/\./g, ''))
  } else if (/^\d+$/.test(compact)) {
    num = Number(compact)
  } else if (/^\d+(?:,\d+)?$/.test(compact)) {
    num = Number(compact.replace(',', '.'))
  } else {
    const digits = compact.replace(/\D/g, '')
    num = digits ? Number(digits) : NaN
  }

  if (!Number.isFinite(num)) return txt
  const centiare = Math.max(0, Math.round(num))
  const ha = Math.floor(centiare / 10000)
  const are = Math.floor((centiare % 10000) / 100)
  const ca = centiare % 100
  return `${ha}.${String(are).padStart(2, '0')}.${String(ca).padStart(2, '0')}`
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

function rightTxt (
  pg: PDFPage, s: string, font: PDFFont, size: number,
  xRight: number, y: number, color = BLACK
): void {
  if (!s) return
  const tw = font.widthOfTextAtSize(s, size)
  pg.drawText(s, { x: xRight - tw, y, size, font, color })
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

// ── Colonne tabella infrazioni (bordi verticali dal template v6) ──
//    42.72 | 70.56 | 304.92 | 337.68 | 386.76 | 436.92 | 481.68 | 482.16 | 552.60
const C = {
  chk0: 42.72, chk1: 70.56,
  dic0: 337.68, dic1: 386.76,
  irr0: 387.24, irr1: 436.44,
  gra0: 436.92, gra1: 481.68,
  occ0: 482.16, occ1: 552.60
}

// Top di ogni riga articolo (dalla posizione del numero articolo — template v6)
const ROWS: Array<{ art: string; top: number }> = [
  { art: '08', top: 349.67 },
  { art: '12', top: 370.67 },
  { art: '15', top: 391.55 },
  { art: '16', top: 419.63 },
  { art: '17', top: 454.79 },
  { art: '27', top: 482.75 },
  { art: '28', top: 503.75 },
  { art: '29', top: 524.75 },
  { art: '30', top: 545.63 },
  { art: '31', top: 566.63 },
  { art: '32', top: 587.51 },
  { art: '33', top: 608.51 },
  { art: '34', top: 629.39 },
  { art: '35', top: 657.47 },
  { art: '36', top: 685.55 },
  { art: '37', top: 706.55 },
  { art: '39', top: 727.43 }
]

// ══════════════════════════════════════════════════════════════
export async function buildRapportoPdf (m: Record<string, string>): Promise<Uint8Array> {
  const pdfBytes = b64ToBytes(BASE_PDF_B64)
  const doc = await PDFDocument.load(pdfBytes)
  doc.registerFontkit(fontkit)

  const fR = await doc.embedFont(b64ToBytes(CALIBRI_REGULAR_B64), { subset: false })
  const fB = await doc.embedFont(b64ToBytes(CALIBRI_BOLD_B64), { subset: false })
  const fI = await doc.embedFont(StandardFonts.HelveticaOblique)

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

  // ── Numerazione autonoma del rapporto ──
  rightTxt(p1, 'Pag. 1 di 2', fR, 7, 532.6, bY(818, 7), BLUE)
  rightTxt(p2, 'Pag. 2 di 2', fR, 7, 532.6, bY(818, 7), BLUE)

  // ── Il sottoscritto / il giorno / alle ore ──
  txt(p1, v('tecnico_rilevatore'), fR, 9, 113, bY(237.71, 9), BLACK, 200)
  txt(p1, v('data_rilevazione'), fR, 9, 389, bY(237.71, 9), BLACK, 47)
  txt(p1, v('ora_rilevazione'), fR, 9, 486, bY(237.71, 9), BLACK, 71)

  // ── Tabella infrazioni ──
  const artSz = 8
  p1.drawRectangle({ x: C.dic0, y: PH - 322, width: C.irr1 - C.dic0, height: 22, color: BLUE })
  centered(p1, 'SUPERFICI (ha.a.ca)', fB, 8.1, C.dic0, C.irr1, bY(309.6, 8.1), WHITE)

  for (const row of ROWS) {
    const y = bY(row.top, artSz)
    centered(p1, v(`x_art${row.art}`), fB, artSz, C.chk0, C.chk1, y)
    centered(p1, formatSurfaceHaACa(v(`sup_dich_art${row.art}`)), fR, artSz, C.dic0, C.dic1, y)
    centered(p1, formatSurfaceHaACa(v(`sup_irr_art${row.art}`)), fR, artSz, C.irr0, C.irr1, y)
    centered(p1, v(`grado_art${row.art}`), fR, artSz, C.gra0, C.gra1, y)

    const occ = firstMeaningfulValue(v(`occorrenza_art${row.art}`))
    if (occ) {
      if (occ === 'Prima contestazione') {
        centered(p1, 'Prima', fR, 7.5, C.occ0, C.occ1, y + 4)
        centered(p1, 'contestazione', fR, 7.5, C.occ0, C.occ1, y - 5)
      } else {
        centered(p1, occ, fR, 7.5, C.occ0, C.occ1, y)
      }
    }
  }

  // ── Importo (top=769.19, riga "Importo a piè di") ──
  txt(p1, v('importo_rimborso'), fR, 8.5, 130, bY(769.19, 8.5), BLACK, 165)

  // Nota laterale variabile: singolare/plurale in base agli allegati nota spese.
  const notaSpeseLabel = v('nota_spese_label')
  if (notaSpeseLabel) rightTxt(p1, notaSpeseLabel, fI, 8.5, 545, bY(769.19, 8.5), BLUE)

  // ════════════════════════════════════════════════════════════
  //  PAGINA 2
  // ════════════════════════════════════════════════════════════
  const taSz = 8
  const taLh = 10.5
  const taW  = 497

  // ── Descrizione dettagliata (area da top=113 a top≈206) ──
  textArea(p2, v('descrizione_fatti'), fR, taSz, 48, 115, taW, 90, taLh)

  // ── Altre circostanze (area da top=231 a top≈324) ──
  textArea(p2, v('circostanze'), fR, taSz, 48, 234, taW, 90, taLh)

  // ── Descrizione dei luoghi (area da top=350 a top≈443) ──
  textArea(p2, v('descrizione_luogo'), fR, taSz, 48, 352, taW, 90, taLh)

  // ── Distretto / Comizio / Idrante (template v6) ──
  const dsz = 8.2
  txt(p2, v('distretto_irriguo'), fR, dsz, 138, bY(450.11, dsz), BLACK, 198)
  txt(p2, v('comizio'), fR, dsz, 386, bY(450.11, dsz), BLACK, 66)
  txt(p2, v('idrante'), fR, dsz, 499, bY(450.11, dsz), BLACK, 52)

  // ── Matricole (template v6) ──
  txt(p2, v('matricola_contatore'), fR, dsz, 138, bY(471.11, dsz), BLACK, 160)
  txt(p2, v('matricola_tessera'), fR, dsz, 386, bY(471.11, dsz), BLACK, 166)

  // ── DATI DEL TRASGRESSORE — PF vs PG ──
  const isPG = v('tipo_soggetto') === 'PG'
  const LABEL_BG = rgb(0.855, 0.918, 0.961)

  if (isPG) {
    // Copro "Nome e Cognome:" e riscrivo "Ragione Sociale:"
    p2.drawRectangle({ x: 42.72, y: PH - 550.56, width: 86.28, height: 16.56, color: LABEL_BG })
    txt(p2, 'Ragione Sociale:', fR, dsz, 45.36, bY(537.0, dsz), BLUE)
    // Copro "C.F.:" e riscrivo "P.IVA:"
    p2.drawRectangle({ x: 354.60, y: PH - 550.56, width: 37.44, height: 16.56, color: LABEL_BG })
    txt(p2, 'P.IVA:', fR, dsz, 357, bY(537.0, dsz), BLUE)
    // Copro "Residenza" e riscrivo "Sede legale" in BLU
    p2.drawRectangle({ x: 240, y: PH - 571.44, width: 115, height: 13, color: WHITE })
    centered(p2, 'Sede legale', fB, 9.0, 62.3, 532.6, bY(558.24, 9.0), BLUE)
  }

  // Valore denominazione / CF-PIVA
  txt(p2, v('denominazione'), fR, dsz, 132, bY(537.0, dsz), BLACK, 220)
  txt(p2, v('cf_piva'), fR, dsz, 395, bY(537.0, dsz), BLACK, 156)

  // ── Via / N. / Comune / CAP ──
  txt(p2, v('via'), fR, dsz, 95, bY(578.87, dsz), BLACK, 128)
  txt(p2, v('civico'), fR, dsz, 253, bY(578.87, dsz), BLACK, 28)
  txt(p2, v('citta'), fR, dsz, 336, bY(578.87, dsz), BLACK, 130)
  txt(p2, v('cap'), fR, dsz, 511, bY(578.87, dsz), BLACK, 38)

  // Località
  txt(p2, v('localita'), fR, dsz, 95, bY(599.75, dsz), BLACK, 455)
  // Telefono / Cellulare / e-mail / PEC
  txt(p2, v('telefono'), fR, dsz, 95, bY(620.75, dsz), BLACK, 54)
  txt(p2, v('cellulare'), fR, dsz, 202, bY(620.75, dsz), BLACK, 60)
  txt(p2, v('email'), fR, dsz, 301, bY(620.75, dsz), BLACK, 110)
  txt(p2, v('pec'), fR, dsz, 443, bY(620.75, dsz), BLACK, 106)

  // Trasgressore presente?
  txt(p2, v('presenza_trasgressore'), fR, dsz, 173, bY(641.63, dsz), BLACK, 90)

  // ── ITER DELL'ISTRUTTORIA TECNICA ──
  // Colonne iter (template v6): Fase 42.72–106.08 | Nominativo 106.56–219.48 | Ruolo 219.96–318.72 | Presa 319.20–368.28 | Esito 368.76–502.92 | Data 503.40–552.60
  const iterSz = 7.2
  const iterRows: Array<{ top: number; nome: string; presa: string; data: string }> = [
    { top: 696.65, nome: v('iter_rilevazione_nome') || v('firma_tr'), presa: v('iter_rilevazione_presa'), data: v('iter_rilevazione_data') || v('data_rilevazione') },
    { top: 714.17, nome: v('iter_compilazione_nome') || v('firma_ti'), presa: v('iter_compilazione_presa'), data: v('iter_compilazione_data') },
    { top: 731.69, nome: v('iter_verifica_nome') || v('firma_rz'), presa: v('iter_verifica_presa'), data: v('iter_verifica_data') },
    { top: 749.21, nome: v('iter_supervisione_nome') || v('firma_ri'), presa: v('iter_supervisione_presa'), data: v('iter_supervisione_data') },
    { top: 766.73, nome: v('iter_approvazione_nome') || v('firma_dt'), presa: v('iter_approvazione_presa'), data: v('iter_approvazione_data') }
  ]
  for (const row of iterRows) {
    const y = bY(row.top, iterSz)
    txt(p2, row.nome, fR, iterSz, 109, y, BLACK, 108)
    centered(p2, row.presa, fR, iterSz, 319.20, 368.28, y, BLACK)
    centered(p2, row.data, fR, iterSz, 503.40, 552.60, y, BLACK)
  }

  return await doc.save()
}

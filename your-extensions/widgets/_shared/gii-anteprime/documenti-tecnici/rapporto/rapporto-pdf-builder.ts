// =================================================================
// rapporto-pdf-builder.ts  (v4 — auto-sizing + giustificazione)
// =================================================================
import { PDFDocument, StandardFonts, degrees, type PDFFont, type PDFPage, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { CALIBRI_REGULAR_B64, CALIBRI_BOLD_B64 } from './calibri-fonts'
import { ensureCachedFeatureLayer } from '../../esri-layer-cache'
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

function isRoleSectorSyntheticLabel (value: any): boolean {
  const s = String(value ?? '').trim().toUpperCase().replace(/[\s_\-]+/g, ' ')
  if (!s) return false
  return /^(TR|TI|RZ|RI|DT)\s+(D[1-6]|DS|CR|GI|AGR|TEC|AMM)$/.test(s)
}

function firstPersonLikeValue (...vals: any[]): string {
  for (const value of vals) {
    const text = String(value ?? '').trim()
    if (!text) continue
    if (isRoleSectorSyntheticLabel(text)) continue
    return text
  }
  return ''
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


function truthyStatusFlag (value: any): boolean {
  const s = String(value ?? '').trim().toLowerCase()
  return value === true || value === 1 || s === '1' || s === 'true' || s === 'sì' || s === 'si'
}

function normStatusText (value: any): string {
  return String(value ?? '').trim().toLowerCase()
}

function statusCodeIs (value: any, expected: number): boolean {
  const s = String(value ?? '').trim()
  if (!s) return false
  const n = Number(s)
  return Number.isFinite(n) && n === expected
}

function textIncludesAny (value: any, tokens: string[]): boolean {
  const s = normStatusText(value)
  return !!s && tokens.some(t => s.includes(t))
}

function isRapportoRespinto (m: Record<string, string>): boolean {
  if (truthyStatusFlag(m.rapporto_respinto) || truthyStatusFlag(m.is_respinto)) return true

  const statoVals = [
    m.stato_finale,
    m.stato_rz,
    m.stato_dt,
    m.stato_ri,
    m.stato_ti
  ]

  const esitoVals = [
    m.esito_finale,
    m.esito_rz,
    m.esito_dt,
    m.esito_ri,
    m.esito_ti
  ]

  if (statoVals.some(v => statusCodeIs(v, 5))) return true
  if (esitoVals.some(v => statusCodeIs(v, 3))) return true

  const textVals = [
    ...statoVals,
    ...esitoVals,
    m.ultimo_evento,
    m.ultimo_evento_codice,
    m.stato_finale_label,
    m.esito_finale_label,
    m.stato_rz_label,
    m.stato_dt_label,
    m.esito_rz_label,
    m.esito_dt_label
  ]

  return textVals.some(v => textIncludesAny(v, ['respint', 'rigett', 'rifiutat']))
}

function isRapportoApprovato (m: Record<string, string>): boolean {
  if (truthyStatusFlag(m.rapporto_approvato) || truthyStatusFlag(m.is_approvato)) return true

  const statoVals = [
    m.stato_finale,
    m.stato_dt,
    m.stato_DT
  ]

  const esitoVals = [
    m.esito_finale,
    m.esito_dt,
    m.esito_DT
  ]

  if (statoVals.some(v => statusCodeIs(v, 4))) return true
  if (esitoVals.some(v => statusCodeIs(v, 2))) return true

  const textVals = [
    ...statoVals,
    ...esitoVals,
    m.stato_finale_label,
    m.esito_finale_label,
    m.stato_dt_label,
    m.stato_DT_label,
    m.esito_dt_label,
    m.esito_DT_label,
    m.ultimo_evento,
    m.ultimo_evento_codice
  ]

  return textVals.some(v => textIncludesAny(v, ['approvat']))
}

function hasRapportoIdentity (m: Record<string, string>): boolean {
  return [
    m.cod_pratica,
    m.n_rapporto,
    m.objectid,
    m.OBJECTID,
    m.data_rilevazione,
    m.tecnico_rilevatore
  ].some(v => String(v ?? '').trim() !== '')
}

function isRapportoInIstruttoria (m: Record<string, string>): boolean {
  if (isRapportoRespinto(m) || isRapportoApprovato(m)) return false
  if (truthyStatusFlag(m.rapporto_istruttoria) || truthyStatusFlag(m.is_istruttoria)) return true
  if (textIncludesAny(m.stato_finale, ['istruttoria', 'attesa', 'carico'])) return true

  // Comportamento atteso: ogni rapporto non approvato e non respinto deve
  // mostrare la filigrana di istruttoria, anche se dal widget non arrivano
  // flag espliciti sullo stato corrente.
  return hasRapportoIdentity(m)
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

function formatMoneyIt (raw: any): string {
  if (raw == null) return ''
  const txt = String(raw).trim()
  if (!txt) return ''

  const hasEuro = txt.includes('€')
  const euroBefore = /^\s*€/.test(txt)
  const euroAfter = /€\s*$/.test(txt)
  const compact = txt.replace(/€/g, '').replace(/\s+/g, '').replace(/[^\d.,-]/g, '')
  if (!compact || !/\d/.test(compact)) return txt

  let normalized = compact
  if (compact.includes(',')) {
    normalized = compact.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(compact)) {
    normalized = compact.replace(/\./g, '')
  }

  const num = Number(normalized)
  if (!Number.isFinite(num)) return txt

  const out = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  }).format(num)

  if (!hasEuro) return out
  if (euroBefore && !euroAfter) return `€ ${out}`
  return `${out} €`
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

export function normalizeAreaCode (value: any): 'AMM' | 'AGR' | 'TEC' | '' {
  const s = String(value ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === '1' || s === 'AMM' || s === 'AMMINISTRATIVA' || s === 'AMMINISTRAZIONE' || s.includes('AFFARI GENERALI')) return 'AMM'
  if (s === '2' || s === 'AGR' || s === 'AGRARIA' || s === 'AGRICOLA' || s === 'AGRICOLTURA') return 'AGR'
  if (s === '3' || s === 'TEC' || s === 'TECNICA' || s === 'TECNICO') return 'TEC'
  return ''
}

export function normalizeSettoreCode (areaCode: string, value: any): string {
  const s = String(value ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === 'CS') return 'DS'
  if (s === '1') return 'CR'
  if (s === '2') return 'GI'
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

// Top di ogni riga articolo (dalla posizione del numero articolo — template v9, altezze righe parificate)
const ROWS: Array<{ art: string; top: number }> = [
  { art: '08', top: 371.99 },
  { art: '12', top: 394.79 },
  { art: '15', top: 417.47 },
  { art: '16', top: 440.15 },
  { art: '17', top: 462.83 },
  { art: '27', top: 485.51 },
  { art: '28', top: 508.19 },
  { art: '29', top: 530.99 },
  { art: '30', top: 553.67 },
  { art: '31', top: 576.35 },
  { art: '32', top: 599.03 },
  { art: '33', top: 621.71 },
  { art: '34', top: 644.39 },
  { art: '35', top: 667.19 },
  { art: '36', top: 689.87 },
  { art: '37', top: 712.55 },
  { art: '39', top: 735.23 }
]



// ── Ricostruzione condivisa dell'iter del rapporto tecnico ──
// Usata dai widget che preparano i placeholder del PDF, così la logica
// resta accanto al builder del rapporto e non viene duplicata nei runtime.
export type UtenteCacheEntry = {
  full_name?: string
  ruolo?: number | null
  area?: number | null
  settore?: number | null
  ruolo_cod?: string
  area_cod?: string
  settore_cod?: string
  ruoloCod?: string
  areaCod?: string
  settoreCod?: string
}

export type RapportoIterCicloPdf = {
  ruolo_competente: string
  evento_apertura: string
  dt_apertura: any
  evento_chiusura: string
  dt_chiusura: any
  ruolo_destinatario: string
  stato_record: string
}

export type RapportoIterPlaceholders = {
  firma_tr: string
  firma_ti: string
  firma_rz: string
  firma_ri: string
  firma_dt: string
  iter_rilevazione_nome: string
  iter_rilevazione_presa: string
  iter_rilevazione_data: string
  iter_compilazione_nome: string
  iter_compilazione_presa: string
  iter_compilazione_data: string
  iter_verifica_nome: string
  iter_verifica_presa: string
  iter_verifica_data: string
  iter_supervisione_nome: string
  iter_supervisione_presa: string
  iter_supervisione_data: string
  iter_approvazione_nome: string
  iter_approvazione_presa: string
  iter_approvazione_data: string
  data_approvazione_rapporto: string
}

const GII_LOG_EVENTI_CICLI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'

const AREA_NUM: Record<string, number> = { AMM: 1, AGR: 2, TEC: 3 }
const SETTORE_NUM: Record<string, number> = { CR: 1, GI: 2, D1: 3, D2: 4, D3: 5, D4: 6, D5: 7, D6: 8, DS: 9, CS: 9 }

function esc (s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function pickAttrCI (obj: any, keys: string[]): any {
  if (!obj) return undefined
  const map: Record<string, string> = {}
  try { Object.keys(obj).forEach(k => { map[String(k).toLowerCase()] = k }) } catch {}
  for (const key of keys) {
    const direct = obj[key]
    if (direct !== undefined && direct !== null && direct !== '') return direct
    const realKey = map[String(key).toLowerCase()]
    if (realKey) {
      const value = obj[realKey]
      if (value !== undefined && value !== null && value !== '') return value
    }
  }
  return undefined
}

function normalizeRoleCode (v: any): 'TR' | 'TI' | 'RZ' | 'RI' | 'DT' | 'DA' | 'ADMIN' | '' {
  const s = String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (!s) return ''
  if (s === '1' || s === 'TR' || s.startsWith('TR_') || s.includes('TECNICO_RILEVATORE')) return 'TR'
  if (s === '2' || s === 'TI' || s === 'TI_AMM' || s.startsWith('TI_') || s.includes('TECNICO_ISTRUTTORE')) return 'TI'
  if (s === '3' || s === 'RZ' || s.startsWith('RZ_') || s.includes('RESPONSABILE_DI_ZONA')) return 'RZ'
  if (s === '4' || s === 'RI' || s === 'RI_AMM' || s.startsWith('RI_') || s.includes('RESPONSABILE_ISTRUTTORIA')) return 'RI'
  if (s === '5' || s === 'DT' || s.startsWith('DT_') || s.includes('DIRETTORE_TECNICO')) return 'DT'
  if (s === '6' || s === 'DA' || s.startsWith('DA_') || s.includes('DIRETTORE_AMMINISTRATIVO')) return 'DA'
  if (s === '7' || s === 'ADMIN' || s.includes('AMMINISTRATORE')) return 'ADMIN'
  return ''
}

function normalizeIterAreaCode (v: any): 'AGR' | 'TEC' | 'AMM' | '' {
  const s = String(v ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === '1' || s === 'AMM' || s === 'AMMINISTRATIVA' || s === 'AMMINISTRAZIONE' || s.includes('AFFARI GENERALI')) return 'AMM'
  if (s === '2' || s === 'AGR' || s === 'AGRARIA' || s === 'AGRICOLA' || s === 'AGRICOLTURA') return 'AGR'
  if (s === '3' || s === 'TEC' || s === 'TECNICA' || s === 'TECNICO') return 'TEC'
  return ''
}

function normalizeIterSettoreCode (area: string, v: any): string {
  const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (!s) return ''
  if (s === 'CS') return 'DS'
  if (s === '1') return 'CR'
  if (s === '2') return 'GI'
  if (s === '3') return 'D1'
  if (s === '4') return 'D2'
  if (s === '5') return 'D3'
  if (s === '6') return 'D4'
  if (s === '7') return 'D5'
  if (s === '8') return 'D6'
  if (s === '9') return 'DS'
  const m = s.match(/^D([1-6])$/)
  if (m) return `D${m[1]}`
  if (s === 'DS' || s.includes('DRENO')) return 'DS'
  if (s === 'CR' || s.includes('CATASTO')) return 'CR'
  if (s === 'GI' || s.includes('GESTIONEIRRIGUA')) return 'GI'
  return s
}

function normalizeEventCode (v: any): string {
  return String(v ?? '').trim().toUpperCase()
}

function toTimeValue (v: any): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && /^\d{10,13}$/.test(v.trim())) return Number(v.trim())
  const d = new Date(v)
  const t = d.getTime()
  return Number.isFinite(t) ? t : 0
}

function sortIterCicliAsc (items: RapportoIterCicloPdf[]): RapportoIterCicloPdf[] {
  return [...(items || [])].sort((a, b) => {
    const ta = toTimeValue(a.dt_apertura) || toTimeValue(a.dt_chiusura)
    const tb = toTimeValue(b.dt_apertura) || toTimeValue(b.dt_chiusura)
    return ta - tb
  })
}

function formatDateIt (v: any): string {
  if (!v) return ''
  try {
    const raw = (typeof v === 'string' && /^\d{10,13}$/.test(v.trim())) ? Number(v) : v
    const d = new Date(typeof raw === 'number' ? raw : String(raw))
    if (isNaN(d.getTime())) return String(v)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return String(v) }
}

function rawFrom (data: any, ...fields: string[]): any {
  return firstMeaningfulValue(...fields.map(f => pickAttrCI(data, [f, f.toUpperCase(), f.toLowerCase()])))
}

function dateFrom (data: any, ...fields: string[]): string {
  return formatDateIt(rawFrom(data, ...fields))
}

function normGlobalIdForQuery (v: any): string {
  return String(v ?? '').trim().replace(/[{}]/g, '').toLowerCase()
}

export async function loadRapportoIterCicliForPdf (globalId: any): Promise<RapportoIterCicloPdf[]> {
  const gid = normGlobalIdForQuery(globalId)
  if (!gid) return []

  try {
    const fl = await ensureCachedFeatureLayer(GII_LOG_EVENTI_CICLI_URL)
    if (!fl) return []

    const res = await fl.queryFeatures({
      where: `LOWER(parent_globalid) = '${gid}' OR LOWER(parent_globalid) = '{${gid}}'`,
      outFields: [
        'ruolo_competente', 'evento_apertura', 'dt_apertura',
        'evento_chiusura', 'dt_chiusura', 'ruolo_destinatario', 'stato_record'
      ],
      orderByFields: ['dt_apertura ASC'],
      returnGeometry: false
    })

    const records: RapportoIterCicloPdf[] = (res?.features || []).map((f: any) => {
      const a = f?.attributes || f || {}
      return {
        ruolo_competente: String(pickAttrCI(a, ['ruolo_competente', 'ruolo']) || ''),
        evento_apertura: String(pickAttrCI(a, ['evento_apertura']) || ''),
        dt_apertura: pickAttrCI(a, ['dt_apertura']),
        evento_chiusura: String(pickAttrCI(a, ['evento_chiusura']) || ''),
        dt_chiusura: pickAttrCI(a, ['dt_chiusura']),
        ruolo_destinatario: String(pickAttrCI(a, ['ruolo_destinatario']) || ''),
        stato_record: String(pickAttrCI(a, ['stato_record']) || '')
      }
    })
    return sortIterCicliAsc(records)
  } catch (e) {
    console.warn('[RapportoPdfBuilder] Errore caricamento GII_LOG_EVENTI_CICLI per PDF rapporto:', e)
    return []
  }
}

function findFirstPresaInCaricoFromCicli (cicli: RapportoIterCicloPdf[], ruolo: 'TI' | 'RZ' | 'RI' | 'DT'): string {
  const role = ruolo.toUpperCase()
  const found = sortIterCicliAsc(cicli).find(c => {
    const r = normalizeRoleCode(c.ruolo_competente)
    const evOpen = normalizeEventCode(c.evento_apertura)
    return r === role && evOpen === 'PRESA_IN_CARICO' && toTimeValue(c.dt_apertura) > 0
  })
  return found ? formatDateIt(found.dt_apertura) : ''
}

function findLastChiusuraFromCicli (
  cicli: RapportoIterCicloPdf[],
  ruolo: 'TI' | 'RZ' | 'RI' | 'DT',
  eventi: string[],
  destinatari?: string[]
): string {
  const role = ruolo.toUpperCase()
  const eventSet = new Set((eventi || []).map(e => normalizeEventCode(e)))
  const destSet = destinatari && destinatari.length > 0 ? new Set(destinatari.map(d => normalizeRoleCode(d))) : null
  const matches = sortIterCicliAsc(cicli).filter(c => {
    const r = normalizeRoleCode(c.ruolo_competente)
    const evClose = normalizeEventCode(c.evento_chiusura)
    const dst = normalizeRoleCode(c.ruolo_destinatario)
    if (r !== role) return false
    if (!eventSet.has(evClose)) return false
    if (destSet && !destSet.has(dst)) return false
    return toTimeValue(c.dt_chiusura) > 0
  })
  const last = matches[matches.length - 1]
  return last ? formatDateIt(last.dt_chiusura) : ''
}

function entryRole (entry: UtenteCacheEntry): string {
  return normalizeRoleCode(firstMeaningfulValue(entry.ruolo_cod, entry.ruoloCod, entry.ruolo))
}

function entryArea (entry: UtenteCacheEntry): string {
  return normalizeIterAreaCode(firstMeaningfulValue(entry.area_cod, entry.areaCod, entry.area))
}

function entrySettore (entry: UtenteCacheEntry): string {
  const area = entryArea(entry)
  return normalizeIterSettoreCode(area, firstMeaningfulValue(entry.settore_cod, entry.settoreCod, entry.settore))
}

function findUserFullName (cache: Map<string, any> | null, ruoloNum: number, areaNum?: number, settoreNum?: number): string {
  if (!cache) return ''
  const targetRole = normalizeRoleCode(ruoloNum)
  const targetArea = areaNum != null ? normalizeIterAreaCode(areaNum) : ''
  const targetSettore = settoreNum != null ? normalizeIterSettoreCode(targetArea, settoreNum) : ''
  for (const [, entry] of cache) {
    const er = entryRole(entry)
    const ea = entryArea(entry)
    const es = entrySettore(entry)
    if (targetRole && er !== targetRole) continue
    if (targetArea && ea !== targetArea) continue
    if (targetSettore && es !== targetSettore) continue
    return entry.full_name || ''
  }
  return ''
}

function findFullNameByUsername (cache: Map<string, any> | null, username: string): string {
  const raw = String(username || '').trim()
  if (!raw) return ''
  if (!cache) return raw
  for (const [k, v] of cache) {
    if (String(k).trim().toLowerCase() === raw.toLowerCase()) return v.full_name || raw
  }
  return raw
}

export function buildRapportoIterPlaceholders (opts: {
  data: any
  utentiCache: Map<string, any> | null
  cicli?: RapportoIterCicloPdf[]
  rapportoApprovato?: boolean
  rapportoRespinto?: boolean
}): RapportoIterPlaceholders {
  const d = opts.data || {}
  const cicli = Array.isArray(opts.cicli) ? opts.cicli : []
  const hasIterCicli = cicli.length > 0
  const areaCod = normalizeIterAreaCode(firstMeaningfulValue(pickAttrCI(d, ['area_cod', 'area']), pickAttrCI(d, ['AREA_COD', 'AREA'])))
  const settoreCod = normalizeIterSettoreCode(areaCod, firstMeaningfulValue(pickAttrCI(d, ['settore_cod', 'settore']), pickAttrCI(d, ['SETTORE_COD', 'SETTORE'])))
  const areaN = AREA_NUM[areaCod] ?? null
  const settoreN = SETTORE_NUM[settoreCod] ?? null

  const presaDateFromFieldIfTaken = (ruolo: 'TI' | 'RZ' | 'RI' | 'DT'): string => {
    const stato = Number(rawFrom(d, `stato_${ruolo}`))
    if (!Number.isFinite(stato) || stato <= 1) return ''
    return dateFrom(d, `dt_presa_in_carico_${ruolo}`)
  }

  const iterTiPresa = findFirstPresaInCaricoFromCicli(cicli, 'TI') || (!hasIterCicli ? presaDateFromFieldIfTaken('TI') : '')
  const iterRzPresa = findFirstPresaInCaricoFromCicli(cicli, 'RZ') || (!hasIterCicli ? presaDateFromFieldIfTaken('RZ') : '')
  const iterRiPresa = findFirstPresaInCaricoFromCicli(cicli, 'RI') || (!hasIterCicli ? presaDateFromFieldIfTaken('RI') : '')
  const iterDtPresa = findFirstPresaInCaricoFromCicli(cicli, 'DT') || (!hasIterCicli ? presaDateFromFieldIfTaken('DT') : '')

  // Le date di chiusura fase arrivano dai cicli effettivi, non da stato_*/dt_stato_*.
  // In particolare, un rimando RZ→TI non è una verifica RZ e non deve valorizzare la riga Verifica.
  const iterTiCompilazione = findLastChiusuraFromCicli(cicli, 'TI', ['ISTRUTTORIA_TRASMESSA', 'INTEGRAZIONE_TRASMESSA'], ['RZ']) || (!hasIterCicli ? dateFrom(d, 'dt_esito_TI') : '')
  const iterRzVerifica = findLastChiusuraFromCicli(cicli, 'RZ', ['ISTRUTTORIA_TRASMESSA'], ['RI']) || (!hasIterCicli ? dateFrom(d, 'dt_esito_RZ') : '')
  const iterRiSupervisione = findLastChiusuraFromCicli(cicli, 'RI', ['ISTRUTTORIA_TRASMESSA'], ['DT']) || (!hasIterCicli ? dateFrom(d, 'dt_esito_RI') : '')
  const iterDtApprovazione = findLastChiusuraFromCicli(cicli, 'DT', ['RAPPORTO_APPROVATO']) || (!hasIterCicli ? dateFrom(d, 'dt_esito_DT') : '')

  const tecnicoRilevatoreRaw = firstMeaningfulValue(pickAttrCI(d, ['tecnico_rilevatore']), pickAttrCI(d, ['TECNICO_RILEVATORE']))
  const creatoreRilevazioneRaw = firstMeaningfulValue(
    pickAttrCI(d, ['Creator', 'creator', 'created_user', 'created_by', 'createdBy']),
    pickAttrCI(d, ['utente_creazione', 'utente_rilevazione', 'username_rilevatore'])
  )
  const nomeTRDaUtente = findFullNameByUsername(opts.utentiCache, firstPersonLikeValue(creatoreRilevazioneRaw, tecnicoRilevatoreRaw))
  const nomeTRDaRuoloSettore = isRoleSectorSyntheticLabel(tecnicoRilevatoreRaw)
    ? findUserFullName(opts.utentiCache, 1, areaN ?? undefined, settoreN ?? undefined)
    : ''
  const nomeTR = firstPersonLikeValue(nomeTRDaUtente, nomeTRDaRuoloSettore, tecnicoRilevatoreRaw)
  const nomeTI = firstMeaningfulValue(
    pickAttrCI(d, ['ti_assegnato_nome']),
    findFullNameByUsername(opts.utentiCache, pickAttrCI(d, ['ti_assegnato_username']) || ''),
    findFullNameByUsername(opts.utentiCache, pickAttrCI(d, ['tecnico_rilevatore']) || '')
  ) || ''
  const nomeRZ = findUserFullName(opts.utentiCache, 3, areaN ?? undefined, settoreN ?? undefined)
  const nomeRI = findUserFullName(opts.utentiCache, 4, areaN ?? undefined)
  const nomeDT = findUserFullName(opts.utentiCache, 5, areaN ?? undefined)

  const dataApprovazioneRapporto = opts.rapportoApprovato ? iterDtApprovazione : ''

  return {
    firma_tr: esc(nomeTR),
    firma_ti: esc(nomeTI),
    firma_rz: esc(nomeRZ),
    firma_ri: esc(nomeRI),
    firma_dt: esc(nomeDT),
    iter_rilevazione_nome: esc(nomeTR),
    iter_rilevazione_presa: '-',
    iter_rilevazione_data: formatDateIt(pickAttrCI(d, ['data_rilevazione', 'DATA_RILEVAZIONE'])),
    iter_compilazione_nome: esc(nomeTI),
    iter_compilazione_presa: iterTiPresa,
    iter_compilazione_data: iterTiCompilazione,
    iter_verifica_nome: esc(nomeRZ),
    iter_verifica_presa: iterRzPresa,
    iter_verifica_data: iterRzVerifica,
    iter_supervisione_nome: esc(nomeRI),
    iter_supervisione_presa: iterRiPresa,
    iter_supervisione_data: iterRiSupervisione,
    iter_approvazione_nome: esc(nomeDT),
    iter_approvazione_presa: iterDtPresa,
    iter_approvazione_data: dataApprovazioneRapporto,
    data_approvazione_rapporto: dataApprovazioneRapporto
  }
}

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
  const dataApprovazione = v('data_approvazione_rapporto') || v('data_approvazione') || v('iter_approvazione_data')
  if (isRapportoApprovato(m) && dataApprovazione) {
    centered(p1, `— Approvato il ${dataApprovazione} —`, fR, 8.5, 62.3, 532.6, bY(207, 8.5), BLUE)
  }

  // ── Numerazione autonoma del rapporto ──
  rightTxt(p1, 'Pag. 1 di 2', fR, 7, 532.6, bY(818, 7), BLUE)
  rightTxt(p2, 'Pag. 2 di 2', fR, 7, 532.6, bY(818, 7), BLUE)

  // ── Il sottoscritto / il giorno / alle ore (cella 252.24–273.24, centrato) ──
  const sottoscritto = firstPersonLikeValue(
    pickAttrCI(m, ['firma_tr', 'FIRMA_TR']),
    pickAttrCI(m, ['iter_rilevazione_nome', 'ITER_RILEVAZIONE_NOME']),
    pickAttrCI(m, ['Creator', 'creator', 'created_user', 'created_by', 'createdBy']),
    pickAttrCI(m, ['tecnico_rilevatore', 'TECNICO_RILEVATORE'])
  )
  txt(p1, sottoscritto, fR, 9, 113, bY(260.0, 9), BLACK, 200)
  txt(p1, v('data_rilevazione'), fR, 9, 389, bY(260.0, 9), BLACK, 47)
  txt(p1, v('ora_rilevazione'), fR, 9, 486, bY(260.0, 9), BLACK, 71)

  // ── Tabella infrazioni ──
  const artSz = 8

  // Aggiorna le descrizioni degli artt. 16 e 17 senza modificare il template PDF.
  // La schermatura resta all'interno dei bordi originali della cella.
  const drawViolationDescription = (lines: string[], top: number, bottom: number): void => {
    const x = 71.04
    const width = 304.44 - x
    p1.drawRectangle({
      x: x + 0.5,
      y: PH - bottom + 0.5,
      width: width - 1,
      height: bottom - top - 1,
      color: WHITE
    })
    const fontSize = 8.2
    const lineTop = top + 2.2
    lines.forEach((line, index) => {
      txt(p1, line, fR, fontSize, 73.68, bY(lineTop + index * 11.8, fontSize), BLUE, 228)
    })
  }

  drawViolationDescription([
    'Art. 16 - Presentazione tardiva comunicazione',
    'di irrigazione'
  ], 432.60, 455.28)
  drawViolationDescription([
    'Art. 17 - Presentazione tardiva comunicazione',
    'di variazione o di rinuncia.'
  ], 455.28, 477.96)

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

  // ── Importo (top=778.43, riga "Importo a piè di") ──
  txt(p1, formatMoneyIt(v('importo_rimborso')), fR, 8.5, 155, bY(778.43, 8.5), BLACK, 165)

  // Nota laterale variabile: singolare/plurale in base agli allegati nota spese.
  const notaSpeseLabel = v('nota_spese_label')
  if (notaSpeseLabel) rightTxt(p1, notaSpeseLabel, fI, 8.5, 545, bY(778.43, 8.5), BLUE)

  // ════════════════════════════════════════════════════════════
  //  PAGINA 2
  // ════════════════════════════════════════════════════════════
  const taSz = 8
  const taLh = 10.5
  const taW  = 499

  // ── Descrizione dettagliata (area da top=113 a top≈206) ──
  textArea(p2, v('descrizione_fatti'), fR, taSz, 48, 114, taW, 90, taLh)

  // ── Altre circostanze (area da top=231 a top≈324) ──
  textArea(p2, v('circostanze'), fR, taSz, 48, 241, taW, 90, taLh)

  // ── Descrizione dei luoghi (area da top=350 a top≈443) ──
  textArea(p2, v('descrizione_luogo'), fR, taSz, 48, 368, taW, 90, taLh)

  // ── Distretto / Comizio / Idrante (cella 468.48–489.36, centrato) ──
  const dsz = 8.2
  txt(p2, firstMeaningfulValue(v('distretto_irriguo'), v('distretto')), fR, dsz, 138, bY(476.82, dsz), BLACK, 198)
  txt(p2, v('comizio'), fR, dsz, 386, bY(476.82, dsz), BLACK, 66)
  txt(p2, firstMeaningfulValue(v('idrante'), v('idrante_numero')), fR, dsz, 499, bY(476.82, dsz), BLACK, 52)

  // ── Matricole (cella 489.36–510.36, centrato) ──
  txt(p2, firstMeaningfulValue(v('matricola_contatore'), v('contatore_matricola')), fR, dsz, 138, bY(497.76, dsz), BLACK, 160)
  txt(p2, firstMeaningfulValue(v('matricola_tessera'), v('tessera_matricola')), fR, dsz, 386, bY(497.76, dsz), BLACK, 166)

  // ── DATI DEL TRASGRESSORE — PF vs PG ──
  const isPG = v('tipo_soggetto') === 'PG'
  const LABEL_BG = rgb(0.855, 0.918, 0.961)

  if (isPG) {
    // Copro "Nome e Cognome:" (cella 555.12–576.0) e riscrivo "Ragione Sociale:"
    p2.drawRectangle({ x: 42.72, y: PH - 575.5, width: 86.28, height: 19.88, color: LABEL_BG })
    txt(p2, 'Ragione Sociale:', fR, dsz, 45.36, bY(561.46, dsz), BLUE)
    // Copro "C.F.:" e riscrivo "P.IVA:"
    p2.drawRectangle({ x: 354.60, y: PH - 575.5, width: 37.44, height: 19.88, color: LABEL_BG })
    txt(p2, 'P.IVA:', fR, dsz, 357, bY(561.46, dsz), BLUE)
    // Copro "Residenza" (cella 576.0–597.0) e riscrivo "Sede legale" in BLU
    p2.drawRectangle({ x: 240, y: PH - 596.5, width: 115, height: 20.0, color: WHITE })
    centered(p2, 'Sede legale', fB, 9.0, 62.3, 532.6, bY(582.0, 9.0), BLUE)
  }

  // Valore denominazione / CF-PIVA (cella 555.12–576.0, centrato)
  txt(p2, v('denominazione'), fR, dsz, 132, bY(562.46, dsz), BLACK, 220)
  txt(p2, v('cf_piva'), fR, dsz, 395, bY(562.46, dsz), BLACK, 156)

  // ── Via / N. / Comune / CAP (cella 597.0–618.0, centrato) ──
  txt(p2, v('via'), fR, dsz, 95, bY(605.0, dsz), BLACK, 128)
  txt(p2, v('civico'), fR, dsz, 253, bY(605.0, dsz), BLACK, 28)
  txt(p2, v('citta'), fR, dsz, 336, bY(605.0, dsz), BLACK, 130)
  txt(p2, v('cap'), fR, dsz, 511, bY(605.0, dsz), BLACK, 38)

  // Telefono / Cellulare / e-mail / PEC (cella 618.0–638.88, centrato)
  txt(p2, v('telefono'), fR, dsz, 95, bY(625.34, dsz), BLACK, 54)
  txt(p2, v('cellulare'), fR, dsz, 202, bY(625.34, dsz), BLACK, 60)
  txt(p2, v('email'), fR, dsz, 301, bY(625.34, dsz), BLACK, 110)
  txt(p2, v('pec'), fR, dsz, 443, bY(625.34, dsz), BLACK, 106)

  // Trasgressore presente? (cella 638.88–659.88, centrato)
  txt(p2, v('presenza_trasgressore'), fR, dsz, 173, bY(646.28, dsz), BLACK, 90)

  // ── ITER DELL'ISTRUTTORIA TECNICA ──
  // Colonne iter (template v6): Fase 42.72–106.08 | Nominativo 106.56–219.48 | Ruolo 219.96–318.72 | Presa 319.20–368.28 | Esito 368.76–502.92 | Data 503.40–552.60
  const iterSz = 7.2
  const iterRows: Array<{ top: number; nome: string; presa: string; data: string }> = [
    { top: 703.36, nome: v('iter_rilevazione_nome') || v('firma_tr'), presa: v('iter_rilevazione_presa'), data: v('iter_rilevazione_data') || v('data_rilevazione') },
    { top: 720.88, nome: v('iter_compilazione_nome') || v('firma_ti'), presa: v('iter_compilazione_presa'), data: v('iter_compilazione_data') },
    { top: 738.34, nome: v('iter_verifica_nome') || v('firma_rz'), presa: v('iter_verifica_presa'), data: v('iter_verifica_data') },
    { top: 755.80, nome: v('iter_supervisione_nome') || v('firma_ri'), presa: v('iter_supervisione_presa'), data: v('iter_supervisione_data') },
    { top: 773.32, nome: v('iter_approvazione_nome') || v('firma_dt'), presa: v('iter_approvazione_presa'), data: v('iter_approvazione_data') }
  ]
  for (const row of iterRows) {
    const y = bY(row.top, iterSz)
    txt(p2, row.nome, fR, iterSz, 109, y, BLACK, 108)
    centered(p2, row.presa, fR, iterSz, 319.20, 368.28, y, BLACK)
    centered(p2, row.data, fR, iterSz, 503.40, 552.60, y, BLACK)
  }

  if (isRapportoRespinto(m)) {
    for (const page of doc.getPages()) drawStatusWatermark(page, 'RESPINTO', fB, rgb(0.60, 0.10, 0.10), 0.24)
  } else if (isRapportoInIstruttoria(m)) {
    for (const page of doc.getPages()) drawStatusWatermark(page, 'ISTRUTTORIA IN CORSO', fB, rgb(0.60, 0.60, 0.60), 0.28)
  }

  return await doc.save()
}

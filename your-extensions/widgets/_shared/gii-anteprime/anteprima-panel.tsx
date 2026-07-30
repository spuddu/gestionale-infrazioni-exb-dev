/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, css } from 'jimu-core'
import { buildNotaSpesePdf, type NotaSpeseData } from './documenti-tecnici/rapporto/notaspese-pdf-builder'
import { PDFDocument } from 'pdf-lib'
import { buildRapportoPdf, loadRapportoIterCicliForPdf } from './documenti-tecnici/rapporto/rapporto-pdf-builder'
import { buildPlaceholderMap, type UtenteCached } from './documenti-tecnici/rapporto/rapporto-placeholder-map'
import { drawEmbeddedPdfPageInRapportoTechnicalBody, drawRapportoTechnicalHeadersByPage, RAPPORTO_TECHNICAL_BODY_BOX, wrapMapPdfBlobWithRapportoTechnicalHeader } from './documenti-tecnici/rapporto/technical-document-header'
import { defaultGiiDocumentPrintOptions as defaultDocumentPrintOptions, cloneGiiDocumentPrintOptions as cloneDocumentPrintOptions, setGiiAttachmentPrintOptionVisible, setGiiMapLayerKeysVisible, setGiiNotaSpesePrintOptionVisible } from './viewer-documenti/document-options'
import type { GiiDocumentPrintOptions as DocumentPrintOptions, GiiAttachmentPrintOption as AttachmentPrintOption, GiiNotaSpesePrintOption as NotaSpesePrintOption } from './viewer-documenti/document-options'
import { buildGiiMapLegendItemsForView, computePrintExtentForView, ensureGiiPrintableMapLayersReady, flattenGiiPrintableMapLayerTree as flattenPrintableMapLayerTree, listGiiPrintableMapLayerTree as listPrintableMapLayerTree, listGiiPrintableMapLayers as listPrintableMapLayers } from './viewer-documenti/map-layers'
import type { GiiPrintableMapLayerItem as PrintableMapLayerItem } from './viewer-documenti/map-layers'
import GiiDocumentViewer from './viewer-documenti/document-viewer'
import { filterGiiAttachmentsForTechnicalRoles, getGiiAttachmentKind, isGiiSpecialAdministrativeAttachment } from './allegati/gii-attachment-viewer'
import { parseNorma3Codes } from './req-point'
import { buildFascicolo } from './fascicolo-builder'
import type { NotaSpeseConfig } from './documenti-tecnici/rapporto/rapporto-nota-spese-summary'
import {
  queryNotaSpeseRowsForPractice,
  buildNotaSpeseGroups,
  buildNotaSpesePrintGroups,
  buildNsSummaryForRows,
  normalizeNsCasistica,
  cloneEmptyNsRows,
  loadAttrezzatureCatalogPdf,
  NS_CASISTICA_META
} from './documenti-tecnici/rapporto/rapporto-nota-spese-summary'
import { FASCICOLO_MAP_DEFAULTS, DEFAULT_PRINT_SERVICE_URL } from './fascicolo-map-defaults'
import { ensureCachedFeatureLayer } from './esri-layer-cache'

const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'


const AREA_LABELS: Record<string, string> = {
  AGR: 'AGRARIA', TEC: 'TECNICA', AMM: 'AFFARI GENERALI E PROGRAMMAZIONE FINANZIARIA'
}
const SETTORE_LABELS: Record<string, string> = {
  D1: "DISTRETTO 1 \u2013 QUARTU SANT'ELENA/VILLAPUTZU/MURAVERA \u2013 SAN SPERATE",
  D2: 'DISTRETTO 2 \u2013 SERRAMANNA/PIMPISU',
  D3: 'DISTRETTO 3 \u2013 SAN GAVINO/VILLACIDRO',
  D4: 'DISTRETTO 4 \u2013 BASSO SULCIS',
  D5: 'DISTRETTO 5 \u2013 SENORB\u00CC',
  D6: 'DISTRETTO 6 \u2013 CIXERRI',
  DS: 'MANUTENZIONE OPERE DI DRENO E DI SCOLO',
  CR: 'CATASTO, RUOLI E SERVIZI TERRITORIALI',
  GI: 'GESTIONE IRRIGUA'
}

const STATO_APPROVATA = 4
const STATO_RESPINTA = 5
const ESITO_APPROVATA = 2
const ESITO_RESPINTA = 3

function firstMeaningfulValue (...vals: any[]): any {
  for (const v of vals) {
    if (v == null) continue
    if (typeof v === 'string') {
      if (v.trim() !== '') return v
      continue
    }
    return v
  }
  return undefined
}

function normalizeRoleCode (v: any): 'TR' | 'TI' | 'RZ' | 'RI' | 'DT' | 'DA' | 'ADMIN' | '' {
  const s = String(v ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === '1' || s === 'TR' || s.includes('TECNICO RILEVATORE')) return 'TR'
  if (s === '2' || s === 'TI' || s.includes('TECNICO ISTRUTTORE')) return 'TI'
  if (s === '3' || s === 'RZ' || s.includes('RESPONSABILE DI ZONA')) return 'RZ'
  if (s === '4' || s === 'RI' || s.includes('RESPONSABILE ISTRUTTORIA')) return 'RI'
  if (s === '5' || s === 'DT' || s.includes('DIRETTORE TECNICO')) return 'DT'
  if (s === '6' || s === 'DA' || s.includes('DIRETTORE AMMINISTRATIVO')) return 'DA'
  if (s === '7' || s === 'ADMIN' || s.includes('AMMINISTRATORE')) return 'ADMIN'
  return ''
}

function normalizeAreaCode (v: any): 'AGR' | 'TEC' | 'AMM' | '' {
  const s = String(v ?? '').trim().toUpperCase()
  if (!s) return ''
  if (s === '1' || s === 'AMM' || s === 'AMMINISTRATIVA' || s === 'AMMINISTRAZIONE' || s.includes('AFFARI GENERALI')) return 'AMM'
  if (s === '2' || s === 'AGR' || s === 'AGRARIA' || s === 'AGRICOLA' || s === 'AGRICOLTURA') return 'AGR'
  if (s === '3' || s === 'TEC' || s === 'TECNICA' || s === 'TECNICO') return 'TEC'
  return ''
}

function normalizeSettoreCode (area: string, v: any): string {
  const s = String(v ?? '').trim().toUpperCase()
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
  if (/^D\s*([1-6])$/.test(s)) return `D${s.match(/^D\s*([1-6])$/)?.[1] || ''}`
  if (s === 'DS' || s === 'D S' || s.includes('DRENO')) return 'DS'
  if (s === 'CR' || s === 'C R' || s.includes('CATASTO')) return 'CR'
  if (s === 'GI' || s.includes('GESTIONE IRRIGUA')) return 'GI'
  return s
}

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
  })
}

let _utentiCache: Map<string, UtenteCached> | null = null
let _utentiLoading = false

async function ensureUtentiCache (): Promise<Map<string, UtenteCached> | null> {
  if (_utentiCache) return _utentiCache
  if (_utentiLoading) {
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 100))
      if (_utentiCache) return _utentiCache
    }
    return null
  }
  _utentiLoading = true
  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: GII_UTENTI_URL })
    if (typeof fl.load === 'function') await fl.load()
    const res = await fl.queryFeatures({ where: '1=1', outFields: ['username', 'full_name', 'ruolo', 'area', 'settore', 'ruolo_cod', 'area_cod', 'settore_cod'], returnGeometry: false })
    const map = new Map<string, UtenteCached>()
    for (const f of (res.features || [])) {
      const a = f.attributes || {}
      const uname = String(a.username || '').trim()
      if (!uname) continue
      const areaCod = normalizeAreaCode(firstMeaningfulValue(a.area_cod, a.area))
      map.set(uname, {
        full_name: a.full_name || uname,
        ruolo: a.ruolo != null ? Number(a.ruolo) : null,
        area: a.area != null ? Number(a.area) : null,
        settore: a.settore != null ? Number(a.settore) : null,
        ruolo_cod: normalizeRoleCode(firstMeaningfulValue(a.ruolo_cod, a.ruolo)),
        area_cod: areaCod,
        settore_cod: normalizeSettoreCode(areaCod, firstMeaningfulValue(a.settore_cod, a.settore))
      })
    }
    _utentiCache = map
    return map
  } catch (ex) { console.warn('[AnteprimaPanel] Errore caricamento GII_utenti:', ex); return null }
  finally { _utentiLoading = false }
}



function normGlobalIdForQuery (v: any): string {
  return String(v ?? '').trim().replace(/[{}]/g, '').toLowerCase()
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

function officialRapportoTecnicoNumberForEditing (data: any): string {
  const d = data || {}
  const candidates = [
    'numero_rapporto_tecnico', 'Numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO',
    'numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO',
    'codice_rapporto', 'Codice_rapporto', 'CODICE_RAPPORTO',
    'n_rapporto', 'N_RAPPORTO'
  ]
  for (const field of candidates) {
    const text = cleanViewerCodeTextForEditing(pickAttrCI(d, [field]))
    if (!text || /^[-–—]+$/.test(text)) continue
    if (isViewerRilevazioneCodeForEditing(text)) continue
    return text
  }
  return '-'
}

function cleanViewerCodeTextForEditing (value: any): string {
  return String(value ?? '')
    .trim()
    .replace(/^rapporto\s+tecnico\s+n\.?\s*/i, '')
    .replace(/^rapporto\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s*/i, '')
    .trim()
}

function isViewerRilevazioneCodeForEditing (value: any): boolean {
  const s = cleanViewerCodeTextForEditing(value).toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
  return /^(TR|TI)-\d+(?:-[A-Z0-9]+)?$/.test(s) || /^\d+-(TR|TI)(?:-[A-Z0-9]+)?$/.test(s)
}

function viewerRilevazioneNumberForEditing (data: any, oid?: number | null): string {
  const d = data || {}
  const explicit = cleanViewerCodeTextForEditing(pickAttrCI(d, [
    'numero_rilevazione', 'Numero_rilevazione', 'NUMERO_RILEVAZIONE',
    'cod_pratica', 'Cod_pratica', 'COD_PRATICA'
  ]))
  if (explicit) return explicit
  const oidPart = oid != null && Number.isFinite(Number(oid)) ? String(Number(oid)) : ''
  if (!oidPart) return '-'
  const op = pickAttrCI(d, ['origine_pratica', 'Origine_pratica', 'ORIGINE_PRATICA'])
  const prefix = (op === 2 || op === '2' || String(op || '').toUpperCase() === 'TI') ? 'TI' : 'TR'
  const area = normalizeAreaCode(firstMeaningfulValue(d.area_cod, d.area))
  const settore = normalizeSettoreCode(area, firstMeaningfulValue(d.settore_cod, d.settore))
  return `${oidPart}-${prefix}${settore ? `-${settore}` : ''}`
}

function documentViewerTitleForEditing (fileName: string, data: any, oid?: number | null): string {
  const lower = String(fileName || '').toLowerCase()
  const rapporto = officialRapportoTecnicoNumberForEditing(data)
  const rilevazione = viewerRilevazioneNumberForEditing(data, oid)
  const prefix = `Rapporto n. ${rapporto || '-'}`
  if (lower.includes('mappa')) return `${prefix} • Mappa della rilevazione n. ${rilevazione || '-'}`
  if (lower.includes('allegat')) return `${prefix} • Allegati della rilevazione n. ${rilevazione || '-'}`
  if (lower.includes('nota')) return `${prefix} • Nota spese della rilevazione n. ${rilevazione || '-'}`
  if (lower.includes('documenti_')) return `${prefix} • Documenti della rilevazione n. ${rilevazione || '-'}`
  return `${prefix} • Rilevazione n. ${rilevazione || '-'}`
}

function mapTechnicalDocumentTitle (numeroRapportoTecnico?: string): string {
  return `ELABORATO CARTOGRAFICO ALLEGATO AL RAPPORTO TECNICO DI RILEVAZIONE N. ${String(numeroRapportoTecnico || '').trim() || '-'}`
}

function attachmentTechnicalDocumentTitle (index: number, numeroRapportoTecnico?: string): string {
  return `ELABORATO PROBATORIO N. ${index} ALLEGATO AL RAPPORTO TECNICO DI RILEVAZIONE N. ${String(numeroRapportoTecnico || '').trim() || '-'}`
}

const containerCss = css`display: flex; flex-direction: column; width: 100%; height: 100%; background: #282828; overflow: hidden;`

type NsCat = 'AT' | 'PR' | 'RU' | 'SL' | 'PF' | 'RA'
type NsSummaryP = { totaleAT: number; totalePR: number; totaleRU: number; totaleSL: number; totalePF: number; totaleRA: number; percentualeSpeseGenerali: number; importoSpeseGenerali: number; totaleComplessivo: number }
type NsRowP = { objectid: number; categoria_costo: NsCat; origine_voce_snapshot: string; codice_voce_snapshot: string; descrizione_snapshot: string; unita_misura_snapshot: string; prezzo_unitario_snapshot: number; quantita: number; importo_riga: number; anno_prezzario_snapshot?: number | null; ordine: number; note: string; codice_casistica?: string | null; riferimento_attrezzatura_id?: string | null }

type DocumentAvailability = {
  loadingAllegati?: boolean
  notaSpese: boolean
  mappa: boolean
  allegati: boolean
  checkedKey: string
}

const editingTiAnteprimaAppliedOptionsMemory = new Map<string, DocumentPrintOptions>()
const editingTiAnteprimaPdfMemory = new Map<string, { blob: Blob; fileName: string }>()

export function clearEditingTiAnteprimaDocumentMemory (): void {
  editingTiAnteprimaAppliedOptionsMemory.clear()
  editingTiAnteprimaPdfMemory.clear()
}

function documentOptionsMemoryKey (oid?: number | null, data?: Record<string, any> | null): string {
  const oidValue = Number(oid)
  if (Number.isFinite(oidValue) && oidValue > 0) return `oid:${oidValue}`
  const gid = String(data?.GlobalID || data?.globalid || data?.GLOBALID || '').trim()
  if (gid) return `gid:${gid}`
  return 'new'
}

const NS_CATS: NsCat[] = ['AT', 'PR', 'RU', 'SL', 'PF', 'RA']
const EMPTY_NS_ROWS: Record<NsCat, NsRowP[]> = { AT: [], PR: [], RU: [], SL: [], PF: [], RA: [] }

function roundMoney (v: number): number {
  if (!Number.isFinite(v)) return 0
  const sign = v < 0 ? -1 : 1
  const abs = Math.abs(v)
  return sign * (Math.round((abs + 1e-9) * 100) / 100)
}

function moneyIt (v: number): string {
  if (!Number.isFinite(v)) return ''
  return roundMoney(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

type Art30RimborsoPdfRow = {
  codice: string
  descrizione: string
  quantita: number
  valoreUnitario: number | null
  importo: number | null
}

function parseArt30Number (value: any): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value).trim()
  if (!text) return null
  const normalized = text.includes(',')
    ? text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    : text.replace(/\s/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseArt30DetailForPdf (raw: any): Art30RimborsoPdfRow[] {
  const out: Art30RimborsoPdfRow[] = []
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    if (/Stato:\s*Recuperabile\b/i.test(text)) continue
    const statoMatch = text.match(/Stato:\s*(Non recuperabile|Recuperabile)/i)
    if (!statoMatch) continue
    const cutIdx = text.search(/\s+—\s+Valore unitario:/i)
    const prefix = cutIdx >= 0 ? text.slice(0, cutIdx).trim() : text
    const codiceMatch = prefix.match(/^(.*?)\s+—\s+Codice:\s*(.+)$/i)
    const descrizione = String(codiceMatch?.[1] || prefix).trim()
    const codice = String(codiceMatch?.[2] || '').trim()
    if (!descrizione) continue
    const valoreUnitarioMatch = text.match(/Valore unitario:\s*([0-9.,]+)/i)
    const valoreUnitario = parseArt30Number(valoreUnitarioMatch?.[1])
    out.push({
      codice,
      descrizione,
      quantita: 1,
      valoreUnitario,
      importo: valoreUnitario
    })
  }
  return out
}

function countCauzioneDecurtataRowsForPdf (raw: any): number {
  let count = 0
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    if (/Cauzione:\s*Decurtata\b/i.test(line)) count++
  }
  return count
}

function qtyArt30It (value: number): string {
  return Number(value).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
}

function buildArt30RapportoSummary (data: Record<string, any>): { hasData: boolean; rows: Art30RimborsoPdfRow[]; rimborso: number; cauzione: number; cauzioneQuantita: number | null; cauzioneValoreUnitario: number | null; cauzioneUnitaMisura: string; netto: number; text: string } {
  // I campi attrezzature_* possono restare valorizzati sul record anche quando Art.30 non è
  // (più) tra le violazioni selezionate (dato residuo di uno stato precedente). Si contano
  // solo se Art.30 risulta effettivamente selezionato oggi — altrimenti "n.d.", coerentemente
  // con quanto mostrato nella scheda Violazione.
  const art30Selected = parseNorma3Codes(pickAttrCI(data, ['norma_violata3'])).includes('Art30')
  if (!art30Selected) return { hasData: false, rows: [], rimborso: 0, cauzione: 0, cauzioneQuantita: null, cauzioneValoreUnitario: null, cauzioneUnitaMisura: 'n.', netto: 0, text: '' }

  const detailRaw = pickAttrCI(data, ['attrezzature_risarcimento_dettaglio'])
  const rows = parseArt30DetailForPdf(detailRaw)
  const cauzioneCount = countCauzioneDecurtataRowsForPdf(detailRaw)
  const rimborsoSalvato = parseArt30Number(pickAttrCI(data, ['attrezzature_risarcimento_importo']))
  const cauzioneSalvata = parseArt30Number(pickAttrCI(data, ['attrezzature_cauzione_decurtata']))
  const nettoSalvato = parseArt30Number(pickAttrCI(data, ['attrezzature_importo_netto']))
  const cauzionePresente = String(pickAttrCI(data, ['attrezzature_cauzione_presente']) ?? '').trim().toLowerCase()
  const cauzioneAttiva = cauzionePresente === '1' || cauzionePresente === 'true' || cauzionePresente === 'si' || cauzionePresente === 'sì'

  const rimborsoDaRighe = roundMoney(rows.reduce((sum, row) => {
    const importo = row.importo ?? ((row.valoreUnitario ?? 0) * row.quantita)
    return sum + (Number.isFinite(importo) ? importo : 0)
  }, 0))
  const rimborso = roundMoney(rimborsoSalvato ?? rimborsoDaRighe)
  const cauzione = roundMoney(cauzioneAttiva ? (cauzioneSalvata ?? 0) : 0)
  const netto = roundMoney(nettoSalvato ?? (rimborso - cauzione))
  const hasData = rows.length > 0 || rimborsoSalvato != null || cauzioneSalvata != null || nettoSalvato != null || cauzioneAttiva
  if (!hasData) return { hasData: false, rows: [], rimborso: 0, cauzione: 0, cauzioneQuantita: null, cauzioneValoreUnitario: null, cauzioneUnitaMisura: 'n.', netto: 0, text: '' }

  const parts: string[] = rows.map(row => {
    const importo = roundMoney(row.importo ?? ((row.valoreUnitario ?? 0) * row.quantita))
    if (row.valoreUnitario != null) {
      return `${row.descrizione}: n. ${qtyArt30It(row.quantita)} x ${moneyIt(row.valoreUnitario)} = ${moneyIt(importo)}`
    }
    return `${row.descrizione}: n. ${qtyArt30It(row.quantita)} = ${moneyIt(importo)}`
  })

  if (parts.length === 0 && rimborso !== 0) parts.push(`rimborso attrezzature: ${moneyIt(rimborso)}`)
  if (cauzioneAttiva || cauzione !== 0) parts.push(`cauzione: -${moneyIt(Math.abs(cauzione))}`)
  parts.push(`netto Art. 30: ${moneyIt(netto)}`)

  return {
    hasData: true,
    rows,
    rimborso,
    cauzione,
    cauzioneQuantita: cauzioneCount > 0 ? cauzioneCount : null,
    cauzioneValoreUnitario: cauzioneCount > 0 && cauzioneSalvata ? roundMoney(cauzioneSalvata / cauzioneCount) : null,
    cauzioneUnitaMisura: 'n.',
    netto,
    text: `Art. 30 - ${parts.join('; ')}.`
  }
}

function makePdfUrl (blob: Blob, fileName: string): string {
  return `${URL.createObjectURL(blob)}#${fileName}`
}

function revokePdfUrl (url?: string | null): void {
  if (!url) return
  try { URL.revokeObjectURL(String(url).split('#')[0]) } catch {}
}

async function mergePdfBlobs (items: Array<{ blob: Blob; fileName: string }>): Promise<Blob> {
  const merged = await PDFDocument.create()
  for (const item of items) {
    const bytes = new Uint8Array(await item.blob.arrayBuffer())
    const src = await PDFDocument.load(bytes as any)
    const pages = await merged.copyPages(src, src.getPageIndices())
    pages.forEach(pg => merged.addPage(pg))
  }
  const out = await merged.save()
  return new Blob([out as any], { type: 'application/pdf' })
}

function normalizePrintableLayerTitle (raw: any): string {
  return String(raw || '').trim().toLowerCase()
}

function sameArcgisLayerUrl (a: any, b: any): boolean {
  const aa = normalizeArcgisLayerUrl(a)
  const bb = normalizeArcgisLayerUrl(b)
  if (!aa || !bb) return false
  if (aa === bb) return true
  const aRoot = aa.replace(/\/\d+$/, '')
  const bRoot = bb.replace(/\/\d+$/, '')
  const aLayer = /\/(\d+)$/.exec(aa)?.[1] || ''
  const bLayer = /\/(\d+)$/.exec(bb)?.[1] || ''
  return aRoot === bRoot && (!aLayer || !bLayer || aLayer === bLayer)
}

function collectChildMapLayers (layer: any): any[] {
  const children: any[] = []
  try { layer?.layers?.forEach?.((child: any) => children.push(child)) } catch {}
  try { layer?.sublayers?.forEach?.((child: any) => children.push(child)) } catch {}
  return children
}

function mapContainsLayerUrl (map: any, url: any): boolean {
  if (!url) return false
  const walk = (layer: any): boolean => {
    if (!layer) return false
    if (sameArcgisLayerUrl(layer?.url, url)) return true
    return collectChildMapLayers(layer).some(walk)
  }
  try {
    return !!map?.layers?.toArray?.().some(walk)
  } catch {
    return false
  }
}

function printableLayerIsLocalization (item: PrintableMapLayerItem, opts: DocumentPrintOptions): boolean {
  if (!item?.layer) return false
  if (sameArcgisLayerUrl(item.layer?.url, opts.mapLocalizationLayerUrl)) return true
  const title = normalizePrintableLayerTitle(item.title || item.layer?.title || item.layer?.id || item.layer?.name)
  return title.includes('localizz') && title.includes('infraz')
}

function mapBasemapLabel (value: any): string {
  const key = String(value || '').trim().toLowerCase()
  if (key === 'satellite') return 'Ortofoto'
  if (key === 'hybrid') return 'Ortofoto con etichette'
  if (key === 'topo-vector') return 'Topografica'
  if (key === 'streets-vector') return 'Stradale'
  return String(value || '').trim()
}

function pointGeometryFromAttrsForEditing (attrs: any): any | null {
  if (!attrs) return null
  const g = attrs.geometry || attrs
  if (g && (g.type === 'point' || g.x != null || g.longitude != null) && (g.y != null || g.latitude != null)) {
    const gx = Number(g.x ?? g.longitude)
    const gy = Number(g.y ?? g.latitude)
    if (Number.isFinite(gx) && Number.isFinite(gy) && !(gx === 0 && gy === 0)) {
      if (attrs.geometry || g.type === 'point') return g
      return { type: 'point', x: gx, y: gy, spatialReference: g.spatialReference || attrs.spatialReference || { wkid: 4326 } }
    }
  }
  const candidates: Array<[any, any, any]> = [
    [attrs.longitude ?? attrs.lon ?? attrs.x, attrs.latitude ?? attrs.lat ?? attrs.y, { wkid: 4326 }],
    [attrs.Longitude ?? attrs.LONGITUDE ?? attrs.LON ?? attrs.lon_wgs84 ?? attrs.x_wgs84, attrs.Latitude ?? attrs.LATITUDE ?? attrs.LAT ?? attrs.lat_wgs84 ?? attrs.y_wgs84, { wkid: 4326 }],
    [attrs.coord_x ?? attrs.coordX ?? attrs.x_coord ?? attrs.X, attrs.coord_y ?? attrs.coordY ?? attrs.y_coord ?? attrs.Y, attrs.spatialReference]
  ]
  for (const [rawX, rawY, sr] of candidates) {
    const gx = Number(rawX)
    const gy = Number(rawY)
    if (Number.isFinite(gx) && Number.isFinite(gy) && !(gx === 0 && gy === 0)) {
      return { type: 'point', x: gx, y: gy, spatialReference: sr || { wkid: 4326 } }
    }
  }
  return null
}

function mapPrintPointGeometry (target: any, Point: any): any | null {
  if (!target) return null
  const sr = target.spatialReference || { wkid: 4326 }
  const lon = Number(target.longitude ?? (sr?.wkid === 4326 ? target.x : NaN))
  const lat = Number(target.latitude ?? (sr?.wkid === 4326 ? target.y : NaN))
  if (Number.isFinite(lon) && Number.isFinite(lat) && !(lon === 0 && lat === 0)) {
    return new Point({ longitude: lon, latitude: lat, spatialReference: { wkid: 4326 } })
  }
  const x = Number(target.x)
  const y = Number(target.y)
  if (Number.isFinite(x) && Number.isFinite(y) && !(x === 0 && y === 0)) {
    return new Point({ x, y, spatialReference: sr })
  }
  return null
}

function normalizeArcgisLayerUrl (url: any): string {
  return String(url || '').trim().replace(/\/+$/, '')
}

async function resolveFeatureLayerForAttachments (ds: any, fallbackUrl?: string): Promise<any | null> {
  if (!ds && !fallbackUrl) return null
  try {
    const direct = await Promise.resolve(ds?.getLayer?.() || ds?.getJsApiLayer?.() || ds?.getJSAPILayer?.() || ds?.layer || null)
    const layer = direct?.layer || direct
    if (layer && typeof layer.queryFeatures === 'function') return layer
  } catch {}
  try {
    const url = normalizeArcgisLayerUrl(ds?.getDataSourceJson?.()?.url || ds?.dataSourceJson?.url || ds?.url || fallbackUrl || '')
    if (!url) return null
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url })
    if (typeof fl?.load === 'function') await fl.load().catch(() => {})
    return fl && typeof fl.queryFeatures === 'function' ? fl : null
  } catch {
    return null
  }
}

function attachmentLayerUrl (layer: any, ds?: any): string {
  return normalizeArcgisLayerUrl(layer?.url || ds?.getDataSourceJson?.()?.url || ds?.dataSourceJson?.url || '')
}

function getAttachmentOidFieldName (layer: any, ds?: any): string {
  return String(layer?.objectIdField || (typeof ds?.getIdField === 'function' ? ds.getIdField() : '') || 'OBJECTID')
}

async function queryFeatureAttachments (layer: any, oid: number, ds?: any): Promise<any[]> {
  if (!layer || !oid) return []
  const pullInfos = (obj: any): any[] => {
    if (!obj) return []
    if (Array.isArray(obj)) return obj
    if (Array.isArray(obj.attachmentInfos)) return obj.attachmentInfos
    if (Array.isArray(obj.attachments)) return obj.attachments
    return []
  }
  const oidField = getAttachmentOidFieldName(layer, ds)
  try {
    if (typeof layer.queryAttachments === 'function') {
      let res: any = null
      try {
        res = await layer.queryAttachments({ attributes: { [oidField]: oid } }, { returnMetadata: true, returnUrl: true })
      } catch {
        res = await layer.queryAttachments({ objectIds: [oid], returnMetadata: true, returnUrl: true })
      }
      if (Array.isArray(res)) {
        for (const g of res) {
          const pid = Number(g?.parentObjectId ?? g?.objectId)
          if (pid === oid) return pullInfos(g)
        }
      }
      if (res && typeof res === 'object') {
        if (Array.isArray(res.attachmentGroups)) {
          for (const g of res.attachmentGroups) {
            const pid = Number(g?.parentObjectId ?? g?.objectId)
            if (pid === oid) return pullInfos(g)
          }
        }
        return pullInfos(res[oid] || res[String(oid)] || res)
      }
    }
  } catch {}
  const layerUrl = attachmentLayerUrl(layer, ds)
  if (!layerUrl) return []
  let token = ''
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(layerUrl) || IdentityManager?.findCredential?.(layerUrl.replace(/\/\d+$/, ''))
    token = cred?.token ? String(cred.token) : ''
  } catch {}
  try {
    const qs = new URLSearchParams({ f: 'json', objectIds: String(oid), returnMetadata: 'true', returnUrl: 'true' })
    if (token) qs.set('token', token)
    const resp = await fetch(`${layerUrl}/queryAttachments?${qs.toString()}`)
    if (!resp.ok) return []
    const json: any = await resp.json()
    if (Array.isArray(json?.attachmentGroups)) {
      for (const g of json.attachmentGroups) {
        const pid = Number(g?.parentObjectId ?? g?.objectId)
        if (pid === oid) return pullInfos(g)
      }
    }
    return pullInfos(json?.[oid] || json?.[String(oid)] || json)
  } catch {}
  return []
}

function toAttachmentPrintOption (att: any): AttachmentPrintOption {
  return {
    id: Number(att?.id ?? att?.attachmentId ?? att?.objectId),
    name: att?.name,
    size: att?.size,
    contentType: att?.contentType,
    url: att?.url,
    keywords: att?.keywords
  } as AttachmentPrintOption
}

async function loadAttachmentOptions (ds: any, oid: number, canSeeAmministrativi: boolean, layerUrlHint?: string): Promise<{ options: AttachmentPrintOption[]; hasBozzaDeterminazione: boolean }> {
  if (!Number.isFinite(oid) || oid <= 0) return { options: [], hasBozzaDeterminazione: false }
  const layer = await resolveFeatureLayerForAttachments(ds, layerUrlHint)
  if (!layer) return { options: [], hasBozzaDeterminazione: false }
  const infos = await queryFeatureAttachments(layer, oid, ds)
  const allOptions = (infos || []).map((att: any): AttachmentPrintOption => toAttachmentPrintOption(att))
  const hasBozzaDeterminazione = allOptions.some(att => getGiiAttachmentKind(att as any) === 'bozza-determinazione')
  const options = allOptions
    // La proposta di contestazione e la bozza di determinazione sono documenti amministrativi
    // a sé (con proprio checkbox dedicato), non allegati da spuntare: vanno sempre esclusi da
    // questa lista, indipendentemente dal ruolo.
    .filter((att: AttachmentPrintOption) => !isGiiSpecialAdministrativeAttachment(att as any))
  // I ruoli tecnici non devono mai vedere allegati di tipo amministrativo caricati
  // manualmente da TI_AMM/RI_AMM/DA. Chi può vedere la parte amministrativa
  // (canSeeAmministrativi) vede invece tutti gli allegati, di qualunque tipo.
  const filtered = canSeeAmministrativi ? options : (filterGiiAttachmentsForTechnicalRoles(options as any) as AttachmentPrintOption[])
  return {
    options: filtered.filter((att: AttachmentPrintOption): boolean => Number.isFinite(att.id) && att.id > 0),
    hasBozzaDeterminazione
  }
}

async function fetchAttachmentBlob (layer: any, ds: any, oid: number, att: any, index: number): Promise<{ blob: Blob; fileName: string } | null> {
  const id = Number(att?.id ?? att?.attachmentId ?? att?.objectId)
  const layerUrl = attachmentLayerUrl(layer, ds)
  let url = String(att?.url || '').trim()
  if (!url && layerUrl && Number.isFinite(id) && id > 0) url = `${layerUrl}/${oid}/attachments/${id}`
  if (!url) return null
  let token = ''
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(layerUrl || url) || IdentityManager?.findCredential?.((layerUrl || url).replace(/\/\d+$/, ''))
    token = cred?.token ? String(cred.token) : ''
  } catch {}
  if (token && /^https?:/i.test(url) && !/[?&]token=/.test(url)) url = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  const resp = await fetch(url, { credentials: 'same-origin' })
  if (!resp.ok) return null
  return { blob: await resp.blob(), fileName: String(att?.name || `allegato_${id || index + 1}`) }
}

function canvasBlob (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise(resolve => {
    try {
      canvas.toBlob(blob => resolve(blob), type, quality)
    } catch {
      resolve(null)
    }
  })
}

async function normalizeRasterAttachmentForPdf (
  blob: Blob,
  originalBytes: Uint8Array,
  fileName: string,
  contentType: string
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const lowerName = String(fileName || '').toLowerCase()
  const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)$/i.test(lowerName)
  const isPng = contentType.includes('png') || /\.png$/i.test(lowerName)
  if (!isJpeg && !isPng) return { bytes: originalBytes, contentType }
  if (typeof document === 'undefined') return { bytes: originalBytes, contentType }

  const outType = isJpeg ? 'image/jpeg' : 'image/png'
  const drawToCanvas = async (source: CanvasImageSource, width: number, height: number): Promise<{ bytes: Uint8Array; contentType: string } | null> => {
    const w = Math.max(1, Math.round(Number(width) || 0))
    const h = Math.max(1, Math.round(Number(height) || 0))
    if (!w || !h) return null
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(source, 0, 0, w, h)
    const normalizedBlob = await canvasBlob(canvas, outType, isJpeg ? 0.92 : undefined)
    if (!normalizedBlob) return null
    return { bytes: new Uint8Array(await normalizedBlob.arrayBuffer()), contentType: outType }
  }

  try {
    const createBitmap = (window as any)?.createImageBitmap
    if (typeof createBitmap === 'function') {
      const bitmap = await createBitmap(blob, { imageOrientation: 'from-image' }).catch((): null => null)
      if (bitmap) {
        try {
          const normalized = await drawToCanvas(bitmap, bitmap.width, bitmap.height)
          if (normalized) return normalized
        } finally {
          try { bitmap.close?.() } catch {}
        }
      }
    }
  } catch {}

  try {
    const url = URL.createObjectURL(blob)
    try {
      const img = await new Promise<HTMLImageElement | null>(resolve => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => resolve(null)
        el.src = url
      })
      if (img) {
        const normalized = await drawToCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
        if (normalized) return normalized
      }
    } finally {
      try { URL.revokeObjectURL(url) } catch {}
    }
  } catch {}

  return { bytes: originalBytes, contentType }
}

async function addRasterAttachmentPage (doc: PDFDocument, img: any): Promise<void> {
  const page = doc.addPage([595.28, 841.89])
  const box = RAPPORTO_TECHNICAL_BODY_BOX
  const scale = Math.min(box.width / Math.max(1, img.width), box.height / Math.max(1, img.height))
  const w = img.width * scale
  const h = img.height * scale
  page.drawImage(img, { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h })
}


export default function GiiAnteprimaPanel (p: {
  data: Record<string, any>
  mode: 'create' | 'edit'
  nsRows?: Record<NsCat, NsRowP[]>
  nsSummary?: NsSummaryP
  ds?: any
  // Fallback esplicito quando ds non espone un URL layer risolvibile direttamente
  // (stesso pattern già usato da gii-editing-amm con resolveLayerForEdit).
  layerUrlHint?: string
  oid?: number | null
  idFieldName?: string
  mapView?: any | null
  mapConfig?: any
  mapTarget?: any | null
  printServiceUrl?: string
  viewerBackgroundColor?: string
  pdfHeaderBackgroundColor?: string
  pdfPageAreaBackgroundColor?: string
  pdfThumbnailsBackgroundColor?: string
  pdfToolbarBackgroundColor?: string
  sidebarBackgroundColor?: string
  sidebarBorderColor?: string
  sidebarBorderWidth?: number
  sidebarWidth?: number
  notaSpeseConfig?: NotaSpeseConfig
  // Unica vera differenza funzionale tra ruoli tecnici e amministrativi: questi ultimi
  // vedono anche le opzioni/documenti amministrativi (proposta di contestazione + determinazione,
  // quest'ultima tramite extraDocumentBuilder — vedi sotto — dato che non è ancora costruita
  // internamente da buildFascicolo).
  canSeeAmministrativi?: boolean
  // Ruolo corrente (es. 'TI_AMM', 'RI_AMM', 'DA'). Usato solo per determinare la reale
  // disponibilità di proposta di contestazione e determinazione: TI_AMM, essendo l'autore,
  // deve poter controllare cosa sta per trasmettere anche prima della trasmissione stessa;
  // gli altri ruoli le vedono solo dopo che TI_AMM le ha effettivamente trasmesse.
  role?: string
  profile?: { username: string, fullName: string }
  // Se presente, il pannello mostra il pulsante di chiusura del viewer (uso in modale,
  // es. gii-azioni). Se assente, nessun pulsante di chiusura (uso incorporato).
  onClose?: () => void
  // 'headless' (default): il pannello costruisce da sé una mappa indipendente e nascosta,
  // usata una volta e distrutta — mai derivata dalla mappa live in uso (regola di sicurezza
  // per widget dove l'utente può interagire con una mappa live mentre genera l'anteprima,
  // es. editing-ti). 'live': usa direttamente la view esterna passata in mapView, senza
  // costruirne una propria — per widget dove la mappa è solo di consultazione (es. azioni).
  mapMode?: 'headless' | 'live'
  // Punto di estensione per documenti non ancora centralizzati in buildFascicolo (oggi solo
  // la determinazione dirigenziale). Il pannello lo chiama quando includeDeterminazione è
  // attivo e canSeeAmministrativi è vero, e ne unisce il risultato al resto; il chiamante
  // resta responsabile di come costruire quel documento.
  extraDocumentBuilder?: (opts: DocumentPrintOptions) => Promise<{ blob: Blob; fileName: string } | null>
}): any {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null)
  const [pdfFileName, setPdfFileName] = React.useState<string>('rapporto.pdf')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [utenti, setUtenti] = React.useState<Map<string, UtenteCached> | null>(null)
  const [utentiReady, setUtentiReady] = React.useState(false)
  const technicalMapContainerRef = React.useRef<HTMLDivElement | null>(null)
  const optionsMemoryKey = React.useMemo(() => documentOptionsMemoryKey(p.oid, p.data), [p.oid, p.data])
  const [technicalMapView, setTechnicalMapView] = React.useState<any | null>(null)
  const [availability, setAvailability] = React.useState<DocumentAvailability>({
    notaSpese: false,
    mappa: false,
    allegati: false,
    checkedKey: ''
  })
  const [attachmentOptions, setAttachmentOptions] = React.useState<AttachmentPrintOption[]>([])
  const [hasBozzaDeterminazioneAttachment, setHasBozzaDeterminazioneAttachment] = React.useState(false)
  const [notaSpeseOptions, setNotaSpeseOptions] = React.useState<NotaSpesePrintOption[]>([])
  const printMapView = p.mapMode === 'live' ? (p.mapView || null) : (technicalMapView || null)
  // Default condivisi + eventuali override espliciti (vedi anche l'uso analogo dentro
  // l'effetto di costruzione della mappa headless più sotto). Un'unica funzione così i due
  // punti non possono disallinearsi.
  const effectiveMapConfig = React.useMemo(() => {
    const merged: Record<string, any> = { ...FASCICOLO_MAP_DEFAULTS }
    Object.entries(p.mapConfig || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') merged[k] = v
    })
    return merged
  }, [p.mapConfig])
  const printableLayerTree = listPrintableMapLayerTree(printMapView)
  const printableLayerItems = flattenPrintableMapLayerTree(printableLayerTree)
  const printableLayerSignature = printableLayerItems.map(item => `${item.key}:${item.visible ? 1 : 0}`).join('|')
  const [expandedLayerGroups, setExpandedLayerGroups] = React.useState<Record<string, boolean>>({})
  const [docOptions, setDocOptions] = React.useState<DocumentPrintOptions>(() => cloneDocumentPrintOptions(defaultDocumentPrintOptions()))
  const [previewOptions, setPreviewOptions] = React.useState<DocumentPrintOptions>(() => cloneDocumentPrintOptions(defaultDocumentPrintOptions()))
  const [previewRevision, setPreviewRevision] = React.useState(0)
  const loadedOptionsKeyRef = React.useRef(optionsMemoryKey)
  const forceNextPreviewRegenerateRef = React.useRef(false)

  React.useEffect(() => {
    if (loadedOptionsKeyRef.current !== optionsMemoryKey) return
    editingTiAnteprimaAppliedOptionsMemory.set(optionsMemoryKey, cloneDocumentPrintOptions(previewOptions))
  }, [optionsMemoryKey, previewOptions])

  React.useEffect(() => {
    const freshOptions = cloneDocumentPrintOptions(defaultDocumentPrintOptions())
    loadedOptionsKeyRef.current = optionsMemoryKey
    forceNextPreviewRegenerateRef.current = true
    setDocOptions(freshOptions)
    setPreviewOptions(freshOptions)
  }, [optionsMemoryKey])

  const dataSignature = React.useMemo(() => {
    try { return JSON.stringify(p.data || {}) } catch { return String(p.data || '') }
  }, [p.data])

  const nsSignature = React.useMemo(() => {
    try { return JSON.stringify({ r: p.nsRows || {}, s: p.nsSummary || {} }) } catch { return '' }
  }, [p.nsRows, p.nsSummary])

  // Modalità "query": quando il chiamante non ha righe nota spese in memoria (non è un form
  // di editing, es. gii-azioni/gii-editing-amm), il pannello le interroga da sé sulla tabella
  // persistita — stesso identico meccanismo già usato da quei widget prima della migrazione.
  // Quando invece p.nsRows è fornito (es. gii-editing-ti), questa query non parte mai:
  // restano prioritarie le righe in memoria (bozza corrente).
  const usingDraftNotaSpese = p.nsRows !== undefined
  const [queriedNsRows, setQueriedNsRows] = React.useState<Record<NsCat, NsRowP[]> | null>(null)
  const [queriedNsSummary, setQueriedNsSummary] = React.useState<NsSummaryP | null>(null)
  React.useEffect(() => {
    if (usingDraftNotaSpese) return
    if (!p.notaSpeseConfig || p.oid == null || !p.data) {
      setQueriedNsRows(null)
      setQueriedNsSummary(null)
      return
    }
    let cancelled = false
    void queryNotaSpeseRowsForPractice(p.data, p.notaSpeseConfig).then(({ rowsByCategory, percentualeSpeseGenerali }) => {
      if (cancelled) return
      const rows = rowsByCategory as any as Record<NsCat, NsRowP[]>
      setQueriedNsRows(rows)
      setQueriedNsSummary(buildNsSummaryForRows(rows, percentualeSpeseGenerali))
    }).catch(() => {
      if (cancelled) return
      setQueriedNsRows(null)
      setQueriedNsSummary(null)
    })
    return () => { cancelled = true }
  }, [usingDraftNotaSpese, p.notaSpeseConfig, p.oid, dataSignature])

  // Catalogo attrezzature Art.30 (codice -> nome leggibile): caricato indipendentemente da
  // usingDraftNotaSpese, perché serve per etichettare le note recuperabili sia quando le righe
  // arrivano già in memoria (es. da gii-editing-ti) sia quando vengono interrogate qui.
  const [attrezzatureCatalog, setAttrezzatureCatalog] = React.useState<Map<string, string>>(new Map())
  React.useEffect(() => {
    const attrezzatureParametriUrl = String(p.notaSpeseConfig?.attrezzatureParametriUrl || '').trim()
    if (!attrezzatureParametriUrl) { setAttrezzatureCatalog(new Map()); return }
    let cancelled = false
    void loadAttrezzatureCatalogPdf(attrezzatureParametriUrl)
      .then(catalog => { if (!cancelled) setAttrezzatureCatalog(catalog) })
      .catch(() => { if (!cancelled) setAttrezzatureCatalog(new Map()) })
    return () => { cancelled = true }
  }, [p.notaSpeseConfig])

  const effectiveNsRows = usingDraftNotaSpese ? p.nsRows : (queriedNsRows || undefined)
  const effectiveNsSummary = usingDraftNotaSpese ? p.nsSummary : (queriedNsSummary || undefined)

  const mapConfigSignature = React.useMemo(() => {
    try { return JSON.stringify(p.mapConfig || {}) } catch { return '' }
  }, [p.mapConfig])

  const mapTarget = React.useMemo(() => p.mapTarget || pointGeometryFromAttrsForEditing(p.data), [p.mapTarget, dataSignature])
  const mapTargetSignature = React.useMemo(() => {
    try { return JSON.stringify(mapTarget || null) } catch { return String(!!mapTarget) }
  }, [mapTarget])

  const praticaCode = React.useMemo(() => {
    try {
      const map = buildPlaceholderMap(p.data || {}, utenti, [])
      return String(map.cod_pratica || '').trim()
    } catch {
      return ''
    }
  }, [dataSignature, utenti])

  const hasNotaSpeseLocal = React.useMemo(() => {
    const groups = buildNotaSpeseGroups(effectiveNsRows, effectiveNsSummary, attrezzatureCatalog)
    return groups.length > 0 || buildArt30RapportoSummary(p.data || {}).hasData
  }, [dataSignature, nsSignature, effectiveNsRows, effectiveNsSummary, attrezzatureCatalog])

  const computedNotaSpeseOptions = React.useMemo<NotaSpesePrintOption[]>(() => {
    return buildNotaSpesePrintGroups(effectiveNsRows, effectiveNsSummary, attrezzatureCatalog).map(group => ({
      key: group.codiceCasistica,
      label: group.label
    }))
  }, [dataSignature, nsSignature, effectiveNsRows, effectiveNsSummary, attrezzatureCatalog])

  React.useEffect(() => {
    // In modalità 'live' il pannello non costruisce nulla: usa direttamente p.mapView
    // (vedi printMapView) e questo intero effetto è no-op.
    if (p.mapMode === 'live') {
      setTechnicalMapView(null)
      return
    }
    // Costruzione pigra: solo quando il checkbox "Mappa" è davvero attivo. Costruire questa
    // mappa (WebMap + layer di riferimento) è un'operazione pesante; farlo sempre ad ogni
    // apertura del pannello, anche quando l'utente vuole solo il rapporto tecnico, rendeva
    // l'intera anteprima lenta senza motivo.
    if (!docOptions.includeMappa) {
      setTechnicalMapView(null)
      return
    }
    // IMPORTANTE: la mappa usata per generare l'elaborato cartografico NON deve mai
    // derivare da nessuna mappa in uso nel gestionale (p.mapView o qualsiasi altra view
    // visibile all'utente), in nessuna forma — né come clone, né come centro/scala di
    // partenza. È sempre una mappa indipendente, costruita da zero solo da configurazione
    // statica (cfg) e dal punto della pratica (mapTarget), usata una volta e poi distrutta.
    const cfg = effectiveMapConfig
    if (!technicalMapContainerRef.current) {
      setTechnicalMapView(null)
      return
    }
    let cancelled = false
    let view: any = null
    ;(async () => {
      try {
        const [MapView, Map, WebMap, FeatureLayer, Portal] = await Promise.all([
          loadEsriModule<any>('esri/views/MapView'),
          loadEsriModule<any>('esri/Map'),
          loadEsriModule<any>('esri/WebMap').catch((): null => null),
          loadEsriModule<any>('esri/layers/FeatureLayer'),
          loadEsriModule<any>('esri/portal/Portal').catch((): null => null)
        ])
        if (cancelled || !technicalMapContainerRef.current) {
          return
        }
        let map: any = null
        let mapFromWebMap = false
        if (WebMap && String(cfg.webMapItemId || '').trim()) {
          try {
            const portalUrl = String(cfg.webMapPortalUrl || cfg.portalUrl || '').trim()
            const portal = portalUrl && Portal ? new Portal({ url: portalUrl }) : undefined
            map = new WebMap({
              portalItem: {
                id: String(cfg.webMapItemId || '').trim(),
                ...(portal ? { portal } : {})
              }
            })
            mapFromWebMap = true
          } catch (webMapErr) {
            map = new Map({ basemap: 'satellite' })
          }
        } else {
          map = new Map({ basemap: String(cfg.basemap || '').trim() || 'satellite' })
        }
        if (mapFromWebMap) {
          try { if (typeof map?.loadAll === 'function') await map.loadAll() } catch (loadAllErr) { /* no-op */ }
        }
        const configuredLayerUrl = String(cfg.mapLayerUrl || '').trim()
        if (map && configuredLayerUrl) {
          try {
            const alreadyPresent = mapContainsLayerUrl(map, configuredLayerUrl)
            if (!alreadyPresent) {
              map.layers?.add?.(new FeatureLayer({
                url: configuredLayerUrl,
                id: String(cfg.mapLayerId || '') || undefined,
                title: String(cfg.mapLayerTitle || '') || undefined
              }))
            }
          } catch (layerErr) { /* no-op */ }
        }
        try { if (typeof map?.loadAll === 'function') await map.loadAll() } catch (loadAllErr2) { /* no-op */ }
        const targetLon = Number(mapTarget?.longitude ?? mapTarget?.x)
        const targetLat = Number(mapTarget?.latitude ?? mapTarget?.y)
        const officeLon = Number(cfg.officeLonWgs84) || 9.0
        const officeLat = Number(cfg.officeLatWgs84) || 39.5
        view = new MapView({
          container: technicalMapContainerRef.current,
          map,
          center: Number.isFinite(targetLon) && Number.isFinite(targetLat) ? [targetLon, targetLat] : [officeLon, officeLat],
          scale: 1000,
          ui: { components: [] }
        })
        await view.when()
        if (cancelled) {
          try { view.destroy() } catch {}
          return
        }
        setTechnicalMapView(view)
      } catch (ex) {
        if (!cancelled) setTechnicalMapView(null)
      }
    })()
    return () => {
      cancelled = true
      setTechnicalMapView(null)
      if (view) { try { view.destroy() } catch {} }
    }
  }, [mapConfigSignature, mapTargetSignature, p.mapMode, effectiveMapConfig, docOptions.includeMappa])

  React.useEffect(() => {
    setNotaSpeseOptions(computedNotaSpeseOptions)
    setDocOptions(prev => {
      const selectedNotaSpeseKeys: Record<string, boolean> = {}
      computedNotaSpeseOptions.forEach(item => {
        selectedNotaSpeseKeys[item.key] = true
      })
      return {
        ...prev,
        selectedNotaSpeseKeys,
        includeNotaSpese: computedNotaSpeseOptions.length > 0 ? prev.includeNotaSpese : false
      }
    })
  }, [computedNotaSpeseOptions])

  React.useEffect(() => {
    const layerVisibility: Record<string, boolean> = {}
    printableLayerItems.forEach(item => { layerVisibility[item.key] = item.visible })
    setDocOptions(prev => ({
      ...prev,
      includeNotaSpese: hasNotaSpeseLocal ? prev.includeNotaSpese : false,
      mapBasemap: prev.mapBasemap || 'satellite',
      mapLayerVisibility: Object.keys(prev.mapLayerVisibility || {}).length ? prev.mapLayerVisibility : layerVisibility
    }))
  }, [hasNotaSpeseLocal, printMapView, printableLayerSignature, praticaCode])

  React.useEffect(() => {
    const targetAvailable = !!mapTarget
    const checkedKey = `${p.oid || ''}:${Date.now()}`
    setAvailability({
      loadingAllegati: !!(p.ds && p.oid),
      notaSpese: hasNotaSpeseLocal,
      mappa: targetAvailable,
      allegati: false,
      checkedKey
    })
    setAttachmentOptions([])
    setHasBozzaDeterminazioneAttachment(false)
    if (!hasNotaSpeseLocal) setDocOptions(prev => ({ ...prev, includeNotaSpese: false }))
    if (!targetAvailable) setDocOptions(prev => ({ ...prev, includeMappa: false }))
    if (!p.ds || !p.oid) {
      setDocOptions(prev => ({ ...prev, includeAllegatiTecnici: false, includeAllegatiAmministrativi: false }))
      return
    }
    let cancelled = false
    void loadAttachmentOptions(p.ds, Number(p.oid), !!p.canSeeAmministrativi, p.layerUrlHint).then(({ options: allegatiList, hasBozzaDeterminazione }) => {
      if (cancelled) return
      setAttachmentOptions(allegatiList)
      setHasBozzaDeterminazioneAttachment(hasBozzaDeterminazione)
      const hasTecnici = allegatiList.some(att => getGiiAttachmentKind(att as any) === 'technical')
      const hasAmministrativi = allegatiList.some(att => getGiiAttachmentKind(att as any) !== 'technical')
      setDocOptions(prev => {
        const previousSelected = prev.selectedAttachmentIds || {}
        const selectedAttachmentIds: Record<string, boolean> = {}
        allegatiList.forEach(att => {
          const key = String(att.id)
          selectedAttachmentIds[key] = Object.prototype.hasOwnProperty.call(previousSelected, key) ? previousSelected[key] : true
        })
        return {
          ...prev,
          selectedAttachmentIds,
          includeAllegatiTecnici: hasTecnici ? prev.includeAllegatiTecnici : false,
          includeAllegatiAmministrativi: hasAmministrativi ? prev.includeAllegatiAmministrativi : false
        }
      })
      const allegati = allegatiList.length > 0
      setAvailability(prev => prev.checkedKey === checkedKey ? { ...prev, loadingAllegati: false, allegati } : prev)
    }).catch(() => {
      if (cancelled) return
      setAttachmentOptions([])
      setHasBozzaDeterminazioneAttachment(false)
      setAvailability(prev => prev.checkedKey === checkedKey ? { ...prev, loadingAllegati: false, allegati: false } : prev)
      setDocOptions(prev => ({ ...prev, includeAllegatiTecnici: false, includeAllegatiAmministrativi: false }))
    })
    return () => { cancelled = true }
  }, [p.ds, p.oid, hasNotaSpeseLocal, mapTargetSignature, printMapView, p.canSeeAmministrativi, p.layerUrlHint])

  const updateDocOption = React.useCallback((patch: Partial<DocumentPrintOptions>) => {
    setDocOptions(prev => ({ ...prev, ...patch }))
  }, [])

  const setAttachmentOptionVisible = React.useCallback((id: number, visible: boolean) => {
    setDocOptions(prev => setGiiAttachmentPrintOptionVisible(prev, id, visible))
  }, [])

  const setNotaSpeseOptionVisible = React.useCallback((key: string, visible: boolean) => {
    setDocOptions(prev => setGiiNotaSpesePrintOptionVisible(prev, key, visible))
  }, [])

  const setMapLayerKeysVisible = React.useCallback((keys: string[], visible: boolean) => {
    setDocOptions(prev => setGiiMapLayerKeysVisible(prev, keys, visible))
  }, [])

  React.useEffect(() => {
    let cancelled = false
    setUtentiReady(false)
    ensureUtentiCache()
      .then(cache => {
        if (cancelled) return
        setUtenti(cache)
        setUtentiReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setUtenti(null)
        setUtentiReady(true)
      })
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => { return () => { revokePdfUrl(pdfUrl) } }, [pdfUrl])

  const buildSelectedDocumentsPdf = React.useCallback(async (): Promise<{ blob: Blob; fileName: string }> => {
    if (!p.data || Object.keys(p.data).length === 0) throw new Error('Nessun dato disponibile per l&apos;anteprima.')
    if (p.oid == null) throw new Error('La pratica deve essere salvata prima di generare l&apos;anteprima.')
    const opts = previewOptions
    const includeRapporto = !!opts.includeRapporto
    const includeNotaSpese = !!opts.includeNotaSpese && hasNotaSpeseLocal
    const selectedNotaSpeseKeysArr = notaSpeseOptions
      .filter(item => (opts.selectedNotaSpeseKeys || {})[item.key] !== false)
      .map(item => item.key)
    if (includeNotaSpese && selectedNotaSpeseKeysArr.length === 0) throw new Error('Selezionare almeno una nota spese.')

    const includeMappa = !!(opts.includeMappa && mapTarget && printMapView)

    const anyAllegatiGroupOn = !!opts.includeAllegatiTecnici || !!opts.includeAllegatiAmministrativi
    const selectedAttachmentIds = attachmentOptions
      .filter(att => {
        const groupOn = getGiiAttachmentKind(att as any) === 'technical' ? !!opts.includeAllegatiTecnici : !!opts.includeAllegatiAmministrativi
        if (!groupOn) return false
        return (opts.selectedAttachmentIds || {})[String(att.id)] !== false
      })
      .map(att => Number(att.id))
      .filter(id => Number.isFinite(id) && id > 0)
    if (anyAllegatiGroupOn && selectedAttachmentIds.length === 0) throw new Error('Selezionare almeno un allegato.')

    const includeAmministrativi = !!p.canSeeAmministrativi && !!opts.includePropostaContestazione
    const wantsFascicoloContent = includeRapporto || includeNotaSpese || includeMappa || anyAllegatiGroupOn || includeAmministrativi
    const wantsDeterminazione = !!p.canSeeAmministrativi && !!opts.includeDeterminazione && !!p.extraDocumentBuilder

    const items: Array<{ blob: Blob; fileName: string }> = []
    if (wantsFascicoloContent) {
      items.push(await buildFascicolo({
        oid: Number(p.oid),
        profile: p.profile || { username: '', fullName: '' },
        selection: {
          includeTecnici: true,
          includeAmministrativi,
          includeMappa,
          includeRapporto,
          includeNotaSpese,
          selectedAttachmentIds,
          selectedNotaSpeseKeys: { ...(opts.selectedNotaSpeseKeys || {}) }
        },
        notaSpeseConfig: p.notaSpeseConfig,
        mapConfig: includeMappa
          ? {
              ...opts,
              view: printMapView,
              printServiceUrl: String(p.printServiceUrl || DEFAULT_PRINT_SERVICE_URL),
              mapLocalizationLayerUrl: String(effectiveMapConfig.mapLayerUrl || '')
            }
          : undefined,
        fileNamePrefix: 'documenti'
      }))
    }
    if (wantsDeterminazione) {
      const extra = await p.extraDocumentBuilder!(opts)
      if (extra) items.push(extra)
    }
    if (items.length === 0) throw new Error('Selezionare almeno un documento.')
    if (items.length === 1) return items[0]
    const safeCode = String(praticaCode || 'documenti').replace(/[^a-zA-Z0-9_-]/g, '_')
    return { blob: await mergePdfBlobs(items), fileName: `documenti_${safeCode}.pdf` }
  }, [previewOptions, attachmentOptions, notaSpeseOptions, hasNotaSpeseLocal, mapTarget, p.data, p.oid, p.notaSpeseConfig, printMapView, effectiveMapConfig, p.printServiceUrl, mapConfigSignature, p.canSeeAmministrativi, p.profile, p.extraDocumentBuilder, praticaCode])

  const previewCacheSignature = React.useMemo(() => {
    try {
      const includeNotaSpese = !!previewOptions.includeNotaSpese
      const includeMappa = !!previewOptions.includeMappa
      const includeAllegati = !!previewOptions.includeAllegatiTecnici || !!previewOptions.includeAllegatiAmministrativi
      return JSON.stringify({
        options: previewOptions,
        dataSignature,
        nsSignature: includeNotaSpese ? nsSignature : '',
        mapTargetSignature: includeMappa ? mapTargetSignature : '',
        mapConfigSignature: includeMappa ? mapConfigSignature : '',
        oid: p.oid || null,
        idFieldName: includeMappa ? (p.idFieldName || '') : '',
        printServiceUrl: includeMappa ? (p.printServiceUrl || '') : '',
        attachmentOptions: includeAllegati ? attachmentOptions.map(att => ({ id: att.id, name: att.name, contentType: att.contentType })) : [],
        notaSpeseOptions: includeNotaSpese ? notaSpeseOptions : []
      })
    } catch {
      return `${Date.now()}`
    }
  }, [previewOptions, dataSignature, nsSignature, mapTargetSignature, mapConfigSignature, p.oid, p.idFieldName, p.printServiceUrl, attachmentOptions, notaSpeseOptions])

  const regeneratePreview = React.useCallback(() => {
    if (!p.data || Object.keys(p.data).length === 0) {
      setPdfUrl(null)
      setPdfFileName('rapporto.pdf')
      setLoading(false)
      return
    }

    const cacheKey = `${optionsMemoryKey}:${previewCacheSignature}`
    const cached = forceNextPreviewRegenerateRef.current ? null : editingTiAnteprimaPdfMemory.get(cacheKey)
    if (cached) {
      const url = makePdfUrl(cached.blob, cached.fileName)
      setPdfFileName(cached.fileName)
      setPdfUrl(prev => { revokePdfUrl(prev); return url })
      setError(null)
      setLoading(false)
      return
    }

    // Evita la doppia generazione in CW editing:
    // prima attendo il completamento della cache GII_utenti, poi genero il PDF una sola volta.
    if (!utentiReady) {
      setLoading(true)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true); setError(null)
    ;(async () => {
      try {
        const { blob, fileName } = await buildSelectedDocumentsPdf()
        if (cancelled) return
        editingTiAnteprimaPdfMemory.set(cacheKey, { blob, fileName })
        const url = makePdfUrl(blob, fileName)
        setPdfFileName(fileName)
        setPdfUrl(prev => { revokePdfUrl(prev); return url })
      } catch (ex: any) { if (!cancelled) setError('Errore: ' + (ex?.message || String(ex))) }
      finally {
        forceNextPreviewRegenerateRef.current = false
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [buildSelectedDocumentsPdf, optionsMemoryKey, p.data, previewCacheSignature, utentiReady])

  React.useEffect(() => {
    return regeneratePreview()
  }, [previewCacheSignature, utentiReady, previewRevision])

  const applyDocumentOptionsAndRegenerate = React.useCallback(() => {
    const nextOptions = cloneDocumentPrintOptions(docOptions)
    editingTiAnteprimaAppliedOptionsMemory.set(optionsMemoryKey, nextOptions)
    forceNextPreviewRegenerateRef.current = true
    setPreviewOptions(nextOptions)
    setPreviewRevision(v => v + 1)
  }, [docOptions, optionsMemoryKey])

  // Disponibilità reale (non solo il ruolo) dei due documenti amministrativi:
  // - proposta di contestazione: solo se TI_AMM ha effettivamente attestato conformità
  //   (esito_TI_AMM = 2), non semplicemente perché il ruolo può vederla;
  // - determinazione dirigenziale: solo se esiste davvero un allegato di tipo "bozza
  //   determinazione" caricato da TI_AMM, rilevato dalla stessa lista allegati già
  //   interrogata dal pannello per il proprio uso — nessuna query aggiuntiva.
  // In aggiunta, per tutti i ruoli tranne TI_AMM (che deve poter controllare cosa sta per
  // trasmettere), entrambi i documenti sono disponibili solo dopo la trasmissione effettiva
  // a RI_AMM (determinazione_stato diverso da BOZZA/vuoto) — altrimenti risulterebbero
  // visibili a RI_AMM/DA prima ancora che TI_AMM li abbia inviati, e sarebbero già di nuovo
  // visibili come "disponibili" anche dopo un rimando che li ha resi superati (che riporta
  // determinazione_stato a BOZZA).
  const isTiAmmRole = String(p.role || '').trim().toUpperCase() === 'TI_AMM'
  const determinazioneStatoRaw = String(pickAttrCI(p.data, ['determinazione_stato']) || '').trim().toUpperCase()
  const bozzaTrasmessaARiAmm = !!determinazioneStatoRaw && determinazioneStatoRaw !== 'BOZZA'
  const propostaContestazioneAvailableComputed = Number(pickAttrCI(p.data, ['esito_TI_AMM'])) === 2 && (isTiAmmRole || bozzaTrasmessaARiAmm)
  const determinazioneAvailableComputed = hasBozzaDeterminazioneAttachment && (isTiAmmRole || bozzaTrasmessaARiAmm)

  return (
    <div css={containerCss}>
      <GiiDocumentViewer
        url={pdfUrl}
        fileName={pdfFileName}
        title={documentViewerTitleForEditing(pdfFileName, p.data, p.oid)}
        subtitle={undefined}
        loading={loading}
        error={error}
        emptyText='Nessun dato disponibile per l&apos;anteprima.'
        width={p.sidebarWidth ?? 270}
        viewerBackgroundColor={p.viewerBackgroundColor}
        pdfHeaderBackgroundColor={p.pdfHeaderBackgroundColor}
        pdfPageAreaBackgroundColor={p.pdfPageAreaBackgroundColor}
        pdfThumbnailsBackgroundColor={p.pdfThumbnailsBackgroundColor}
        pdfToolbarBackgroundColor={p.pdfToolbarBackgroundColor}
        backgroundColor={p.sidebarBackgroundColor}
        borderColor={p.sidebarBorderColor}
        borderWidth={p.sidebarBorderWidth}
        docOptions={docOptions}
        availability={{ ...availability, propostaContestazione: !!p.canSeeAmministrativi && propostaContestazioneAvailableComputed, determinazione: !!p.canSeeAmministrativi && determinazioneAvailableComputed }}
        busy={loading}
        canUseMap={!!mapTarget}
        mapPanelAvailable={!!printMapView}
        documentUnavailableExtra={{ includeAllegatiTecnici: !!availability.loadingAllegati, includeAllegatiAmministrativi: !!availability.loadingAllegati }}
        showAdminDocuments={!!p.canSeeAmministrativi}
        onClose={p.onClose}
        notaSpeseOptions={notaSpeseOptions}
        attachmentOptions={attachmentOptions}
        printableLayerTree={printableLayerTree}
        expandedLayerGroups={expandedLayerGroups}
        mapEmptyText={printMapView ? 'La mappa è agganciata, ma non espone layer stampabili leggibili.' : 'Mappa in preparazione.'}
        updateDocOption={updateDocOption}
        setNotaSpeseOptionVisible={setNotaSpeseOptionVisible}
        setAttachmentOptionVisible={setAttachmentOptionVisible}
        setMapLayerKeysVisible={setMapLayerKeysVisible}
        setExpandedLayerGroups={setExpandedLayerGroups}
        onRegenerate={applyDocumentOptionsAndRegenerate}
      />
      <div
        ref={technicalMapContainerRef}
        aria-hidden='true'
        style={{ position: 'fixed', left: -10000, top: -10000, width: 900, height: 700, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}

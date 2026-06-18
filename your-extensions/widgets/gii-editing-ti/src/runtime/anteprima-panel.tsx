/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, css } from 'jimu-core'
import { buildNotaSpesePdf, type NotaSpeseData } from '../../../_shared/gii-anteprime/documenti-tecnici/rapporto/notaspese-pdf-builder'
import { PDFDocument } from 'pdf-lib'
import { buildRapportoPdf, buildRapportoIterPlaceholders, loadRapportoIterCicliForPdf, type RapportoIterCicloPdf } from '../../../_shared/gii-anteprime/documenti-tecnici/rapporto/rapporto-pdf-builder'
import { drawEmbeddedPdfPageInRapportoTechnicalBody, drawRapportoTechnicalHeadersByPage, RAPPORTO_TECHNICAL_BODY_BOX, wrapMapPdfBlobWithRapportoTechnicalHeader } from '../../../_shared/gii-anteprime/documenti-tecnici/rapporto/technical-document-header'
import { defaultGiiDocumentPrintOptions as defaultDocumentPrintOptions, cloneGiiDocumentPrintOptions as cloneDocumentPrintOptions, setGiiAttachmentPrintOptionVisible, setGiiMapLayerKeysVisible, setGiiNotaSpesePrintOptionVisible } from '../../../_shared/gii-anteprime/viewer-documenti/document-options'
import type { GiiDocumentPrintOptions as DocumentPrintOptions, GiiAttachmentPrintOption as AttachmentPrintOption, GiiNotaSpesePrintOption as NotaSpesePrintOption } from '../../../_shared/gii-anteprime/viewer-documenti/document-options'
import { buildGiiMapLegendItemsForView, computePrintExtentForView, ensureGiiPrintableMapLayersReady, flattenGiiPrintableMapLayerTree as flattenPrintableMapLayerTree, listGiiPrintableMapLayerTree as listPrintableMapLayerTree, listGiiPrintableMapLayers as listPrintableMapLayers } from '../../../_shared/gii-anteprime/viewer-documenti/map-layers'
import type { GiiPrintableMapLayerItem as PrintableMapLayerItem } from '../../../_shared/gii-anteprime/viewer-documenti/map-layers'
import GiiDocumentViewer from '../../../_shared/gii-anteprime/viewer-documenti/document-viewer'

const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'
type UtenteCached = {
  full_name: string
  ruolo: number | null
  area: number | null
  settore: number | null
  ruolo_cod: string
  area_cod: string
  settore_cod: string
}


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
  if (s === '1') return area === 'AGR' ? 'D1' : 'CR'
  if (s === '2') return area === 'AGR' ? 'D2' : 'GI'
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
function formatTimeIt (v: any): string {
  if (!v) return ''
  try {
    const raw = (typeof v === 'string' && /^\d{10,13}$/.test(v.trim())) ? Number(v) : v
    const d = new Date(typeof raw === 'number' ? raw : String(raw))
    if (isNaN(d.getTime())) return ''

    // ArcGIS conserva i campi Date senza ora come mezzanotte UTC.
    // In Italia, con l'ora legale, quella mezzanotte viene visualizzata come 02:00:
    // non è un'ora reale della rilevazione e non va stampata nel rapporto.
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) return ''

    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}
function formatRilevazioneTime (data: any): string {
  // data_rilevazione può essere stata normalizzata a sola data durante la modifica.
  // In quel caso recupera l'ora originaria dal timestamp di avvio della rilevazione.
  for (const value of [data?.data_rilevazione, data?.start]) {
    const formatted = formatTimeIt(value)
    if (formatted) return formatted
  }
  return ''
}
function esc (s: any): string { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function fmtNum (v: any): string { if (v == null || v === '') return ''; const n = Number(v); if (isNaN(n)) return String(v); return n.toLocaleString('it-IT', { maximumFractionDigits: 2 }) }

function parseGradiViolazioniForRapporto (raw: any): Record<string, string> {
  const out: Record<string, string> = {}
  const text = String(raw ?? '').trim()
  if (!text) return out
  for (const part of text.split(';')) {
    const m = part.trim().match(/^Art?\.?\s*(\d{1,2})\s*[-:=]\s*([1-4])$/i) || part.trim().match(/^(\d{1,2})\s*[-:=]\s*([1-4])$/)
    if (!m) continue
    const art = String(m[1]).replace(/^0+/, '')
    out[art] = String(m[2])
  }
  return out
}

function gradoViolazioneForRapporto (map: Record<string, string>, art: string): string {
  return map[String(art).replace(/^0+/, '')] || ''
}

function occorrenzaArt15ForRapporto (raw: any, on: boolean): string {
  if (!on) return ''
  const v = String(raw ?? '').trim()
  if (v === '1') return 'Prima contestazione'
  if (v === '2') return 'Recidiva'
  return ''
}

function art15AttivoForRapporto (data: any): boolean {
  const d = data || {}
  const tipoAbuso = String(firstMeaningfulValue(d.tipo_abuso, d.TIPO_ABUSO) ?? '').trim().toLowerCase()
  if (tipoAbuso === 'parziale' || tipoAbuso === 'totale') return true
  return !!firstMeaningfulValue(d.norma15_parziale, d.NORMA15_PARZIALE, d.norma15_totale, d.NORMA15_TOTALE)
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

function isRapportoRespintoForPdf (data: any): boolean {
  const d = data || {}

  // La filigrana RESPINTO deve dipendere dall'esito/evento conclusivo.
  // Alcune viste espongono però lo stato conclusivo e non l'esito: per
  // questo intercetto anche stato_rz/stato_dt = STATO_RESPINTA.
  const statoVals = [
    pickAttrCI(d, ['stato_rz', 'STATO_RZ']),
    pickAttrCI(d, ['stato_dt', 'STATO_DT'])
  ].map(v => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  })

  if (statoVals.includes(STATO_RESPINTA)) return true

  const esitoVals = [
    pickAttrCI(d, ['esito_rz', 'ESITO_RZ']),
    pickAttrCI(d, ['esito_dt', 'ESITO_DT'])
  ].map(v => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  })

  if (esitoVals.includes(ESITO_RESPINTA)) return true

  const txtVals = [
    pickAttrCI(d, ['stato_rz_label', 'STATO_RZ_LABEL', 'stato_rz', 'STATO_RZ']),
    pickAttrCI(d, ['stato_dt_label', 'STATO_DT_LABEL', 'stato_dt', 'STATO_DT']),
    pickAttrCI(d, ['esito_rz_label', 'ESITO_RZ_LABEL', 'esito_rz', 'ESITO_RZ']),
    pickAttrCI(d, ['esito_dt_label', 'ESITO_DT_LABEL', 'esito_dt', 'ESITO_DT']),
    pickAttrCI(d, ['ultimo_evento', 'ULTIMO_EVENTO', 'ultimo_evento_codice', 'ULTIMO_EVENTO_CODICE'])
  ]
    .map(v => String(v ?? '').trim().toLowerCase())
    .filter(Boolean)

  return txtVals.some(v => v.includes('respint') || v.includes('rigett') || v.includes('rifiutat'))
}

function isRapportoApprovatoForPdf (data: any): boolean {
  const d = data || {}
  const statoDt = Number(pickAttrCI(d, ['stato_dt', 'STATO_DT']))
  const esitoDt = Number(pickAttrCI(d, ['esito_dt', 'ESITO_DT']))
  if (statoDt === STATO_APPROVATA || esitoDt === ESITO_APPROVATA) return true

  const txtVals = [
    pickAttrCI(d, ['stato_dt_label', 'STATO_DT_LABEL', 'stato_dt', 'STATO_DT']),
    pickAttrCI(d, ['esito_dt_label', 'ESITO_DT_LABEL', 'esito_dt', 'ESITO_DT'])
  ]
    .map(v => String(v ?? '').trim().toLowerCase())
    .filter(Boolean)

  return txtVals.some(v => v.includes('approvat'))
}

function buildPlaceholderMap (data: any, utentiCache: Map<string, UtenteCached> | null, cicli: RapportoIterCicloPdf[] = []): Record<string, string> {
  const d = data || {}
  const areaCod = normalizeAreaCode(firstMeaningfulValue(d.area_cod, d.area))
  const settoreCod = normalizeSettoreCode(areaCod, firstMeaningfulValue(d.settore_cod, d.settore))
  const isPF = String(d.tipologia_soggetto || '').toUpperCase() === 'PF'
  const artChecked = (field: string): boolean => { const v = d[field]; return v === 1 || v === '1' || v === true }
  const art15on = art15AttivoForRapporto(d)
  const art16on = String(d.norma16_17 || '').toLowerCase().includes('art16')
  const art17on = String(d.norma16_17 || '').toLowerCase().includes('art17') || !!d.art17_tipo
  const xMark = (on: boolean) => on ? 'x' : ''
  const surfVal = (on: boolean, ...fields: string[]) => { if (!on) return ''; for (const f of fields) { const v = d[f]; if (v != null && v !== '' && v !== 0) return fmtNum(v) } return '' }
  const surfValIncludingZero = (on: boolean, ...fields: string[]) => { if (!on) return ''; for (const f of fields) { const v = d[f]; if (v != null && v !== '') return fmtNum(v) } return '0' }
  const gradiViolazioni = parseGradiViolazioniForRapporto(d.gradi_violazioni)
  const occorrenzaArt15 = occorrenzaArt15ForRapporto(d.occorrenza, art15on)
  const numeroRapportoTecnico = String(pickAttrCI(d, [
    'numero_rapporto_tecnico', 'Numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO',
    'numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO',
    'codice_rapporto', 'Codice_rapporto', 'CODICE_RAPPORTO',
    'n_rapporto', 'N_RAPPORTO'
  ]) || '').trim()
  const codPratica = numeroRapportoTecnico || '-'

  const rapportoRespinto = isRapportoRespintoForPdf(d)
  const rapportoApprovato = !rapportoRespinto && isRapportoApprovatoForPdf(d)
  const rapportoIstruttoria = !rapportoRespinto && !rapportoApprovato
  const iterPlaceholders = buildRapportoIterPlaceholders({ data: d, utentiCache, cicli, rapportoApprovato, rapportoRespinto })
  const dataApprovazioneRapporto = iterPlaceholders.data_approvazione_rapporto || ''

  return {
    cod_pratica: codPratica, anno: d.data_rilevazione ? String(new Date(d.data_rilevazione).getFullYear()) : '', area_cod: areaCod,
    area_label: AREA_LABELS[areaCod] || areaCod, settore_label: SETTORE_LABELS[settoreCod] || settoreCod,
    tecnico_rilevatore: esc(d.tecnico_rilevatore || ''), data_rilevazione: formatDateIt(d.data_rilevazione), ora_rilevazione: formatRilevazioneTime(d),
    x_art08: xMark(artChecked('v_art08')), x_art12: xMark(artChecked('v_art12')), x_art15: xMark(art15on), x_art16: xMark(art16on), x_art17: xMark(art17on),
    x_art27: xMark(artChecked('v_art27')), x_art28: xMark(artChecked('v_art28')), x_art29: xMark(artChecked('v_art29')), x_art30: xMark(artChecked('v_art30')),
    x_art31: xMark(artChecked('v_art31')), x_art32: xMark(artChecked('v_art32')), x_art33: xMark(artChecked('v_art33')), x_art34: xMark(artChecked('v_art34')),
    x_art35: xMark(artChecked('v_art35')), x_art36: xMark(artChecked('v_art36')), x_art37: xMark(artChecked('v_art37')), x_art39: xMark(artChecked('v_art39')),
    sup_dich_art08: surfVal(artChecked('v_art08'), 'sup_dichiarata_art08'), sup_irr_art08: surfVal(artChecked('v_art08'), 'sup_irrigata_art08'),
    sup_dich_art12: surfVal(artChecked('v_art12'), 'sup_dichiarata_art12'), sup_irr_art12: surfVal(artChecked('v_art12'), 'sup_irrigata_art12'),
    sup_dich_art15: surfVal(art15on, 'sup_dichiarata_art15'), sup_irr_art15: surfVal(art15on, 'sup_irrigata_art15'),
    sup_dich_art16: surfVal(art16on, 'sup_dichiarata_art16'), sup_irr_art16: surfValIncludingZero(art16on, 'sup_irrigata_art16_17_2'),
    sup_dich_art17: surfVal(art17on, 'sup_dichiarata_art17_1', 'sup_dichiarata_art17_2'), sup_irr_art17: surfVal(art17on, 'sup_irrigata_art17_1', 'sup_irrigata_art16_17_2'),
    sup_dich_art27: surfVal(artChecked('v_art27'), 'sup_dichiarata_art27'), sup_irr_art27: surfVal(artChecked('v_art27'), 'sup_irrigata_art27'),
    sup_dich_art28: surfVal(artChecked('v_art28'), 'sup_dichiarata_art28'), sup_irr_art28: surfVal(artChecked('v_art28'), 'sup_irrigata_art28'),
    sup_dich_art29: surfVal(artChecked('v_art29'), 'sup_dichiarata_art29'), sup_irr_art29: surfVal(artChecked('v_art29'), 'sup_irrigata_art29'),
    sup_dich_art30: surfVal(artChecked('v_art30'), 'sup_dichiarata_art30'), sup_irr_art30: surfVal(artChecked('v_art30'), 'sup_irrigata_art30'),
    sup_dich_art31: surfVal(artChecked('v_art31'), 'sup_dichiarata_art31'), sup_irr_art31: surfVal(artChecked('v_art31'), 'sup_irrigata_art31'),
    sup_dich_art32: surfVal(artChecked('v_art32'), 'sup_dichiarata_art32'), sup_irr_art32: surfVal(artChecked('v_art32'), 'sup_irrigata_art32'),
    sup_dich_art33: surfVal(artChecked('v_art33'), 'sup_dichiarata_art33'), sup_irr_art33: surfVal(artChecked('v_art33'), 'sup_irrigata_art33'),
    sup_dich_art34: surfVal(artChecked('v_art34'), 'sup_dichiarata_art34'), sup_irr_art34: surfVal(artChecked('v_art34'), 'sup_irrigata_art34'),
    sup_dich_art35: surfVal(artChecked('v_art35'), 'sup_dichiarata_art35'), sup_irr_art35: surfVal(artChecked('v_art35'), 'sup_irrigata_art35'),
    sup_dich_art36: surfVal(artChecked('v_art36'), 'sup_dichiarata_art36'), sup_irr_art36: surfVal(artChecked('v_art36'), 'sup_irrigata_art36'),
    sup_dich_art37: surfVal(artChecked('v_art37'), 'sup_dichiarata_art37'), sup_irr_art37: surfVal(artChecked('v_art37'), 'sup_irrigata_art37'),
    sup_dich_art39: surfVal(artChecked('v_art39'), 'sup_dichiarata_art39'), sup_irr_art39: surfVal(artChecked('v_art39'), 'sup_irrigata_art39'),
    grado_art08: '', grado_art12: artChecked('v_art12') ? gradoViolazioneForRapporto(gradiViolazioni, '12') : '', grado_art15: '',
    grado_art16: '', grado_art17: '', grado_art27: artChecked('v_art27') ? gradoViolazioneForRapporto(gradiViolazioni, '27') : '',
    grado_art28: artChecked('v_art28') ? gradoViolazioneForRapporto(gradiViolazioni, '28') : '', grado_art29: '', grado_art30: '',
    grado_art31: artChecked('v_art31') ? gradoViolazioneForRapporto(gradiViolazioni, '31') : '', grado_art32: artChecked('v_art32') ? gradoViolazioneForRapporto(gradiViolazioni, '32') : '', grado_art33: artChecked('v_art33') ? gradoViolazioneForRapporto(gradiViolazioni, '33') : '',
    grado_art34: artChecked('v_art34') ? gradoViolazioneForRapporto(gradiViolazioni, '34') : '', grado_art35: artChecked('v_art35') ? gradoViolazioneForRapporto(gradiViolazioni, '35') : '', grado_art36: artChecked('v_art36') ? gradoViolazioneForRapporto(gradiViolazioni, '36') : '',
    grado_art37: artChecked('v_art37') ? gradoViolazioneForRapporto(gradiViolazioni, '37') : '', grado_art39: '',
    occorrenza_art15: occorrenzaArt15,
    descrizione_fatti: esc(d.descrizione_fatti || ''), circostanze: esc(d.circostanze || ''), descrizione_luogo: esc(d.descrizione_luogo || ''),
    tipo_soggetto: isPF ? 'PF' : 'PG',
    denominazione: isPF ? esc(`${d.nome || ''} ${d.cognome || ''}`.trim()) : esc(d.ragione_sociale || ''),
    cf_piva: isPF ? esc(d.codice_fiscale || '') : esc(d.piva || ''),
    via: esc(d.via || ''), civico: esc(d.civico || ''), cap: esc(d.cap || ''), localita: esc(d.localita || ''), citta: esc(d.citta || ''),
    telefono: esc(d.telefono || ''), cellulare: esc(d.cellulare || ''), email: esc(d.email || ''), pec: esc(d.pec || ''),
    presenza_trasgressore: String(d.presenza_trasgressore || '').toLowerCase() === 'si' || String(d.presenza_trasgressore || '').toLowerCase() === 'sì' || String(d.presenza_trasgressore || '') === '1' ? 'S\u00EC' : (String(d.presenza_trasgressore || '').toLowerCase() === 'no' || String(d.presenza_trasgressore || '') === '0' ? 'No' : String(d.presenza_trasgressore || '')),
    ...iterPlaceholders,
    idrante: esc(pickAttrCI(d, ['idrante', 'idrante_numero']) || ''), comune: '', foglio: '', mappali: '', altro_luogo: '',
    distretto_irriguo: esc(pickAttrCI(d, ['distretto_irriguo', 'distretto']) || ''), comizio: esc(pickAttrCI(d, ['comizio']) || ''),
    matricola_contatore: esc(pickAttrCI(d, ['matricola_contatore', 'contatore_matricola']) || ''), matricola_tessera: esc(pickAttrCI(d, ['matricola_tessera', 'tessera_matricola']) || ''),
    importo_rimborso: fmtNum(d.ns_totale_complessivo) ? fmtNum(d.ns_totale_complessivo) + ' €' : '',
    data_compilazione: formatDateIt(d.data_firma),
    rapporto_respinto: rapportoRespinto ? '1' : '',
    rapporto_approvato: rapportoApprovato ? '1' : '',
    rapporto_istruttoria: rapportoIstruttoria ? '1' : '',
    data_approvazione_rapporto: dataApprovazioneRapporto
  }
}

function officialRapportoTecnicoNumberForEditing (data: any): string {
  const d = data || {}
  return String(pickAttrCI(d, [
    'numero_rapporto_tecnico', 'Numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO',
    'numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO',
    'codice_rapporto', 'Codice_rapporto', 'CODICE_RAPPORTO',
    'n_rapporto', 'N_RAPPORTO'
  ]) || '').trim() || '-'
}

function mapTechnicalDocumentTitle (numeroRapportoTecnico?: string): string {
  return `ELABORATO CARTOGRAFICO ALLEGATO AL RAPPORTO TECNICO DI RILEVAZIONE N. ${String(numeroRapportoTecnico || '').trim() || '-'}`
}

function attachmentTechnicalDocumentTitle (index: number, numeroRapportoTecnico?: string): string {
  return `ELABORATO PROBATORIO N. ${index} ALLEGATO AL RAPPORTO TECNICO DI RILEVAZIONE N. ${String(numeroRapportoTecnico || '').trim() || '-'}`
}

const containerCss = css`display: flex; flex-direction: column; width: 100%; height: 100%; background: #282828; overflow: hidden;`

type NsCat = 'AT' | 'PR' | 'RU' | 'SL' | 'PF'
type NsSummaryP = { totaleAT: number; totalePR: number; totaleRU: number; totaleSL: number; totalePF: number; percentualeSpeseGenerali: number; importoSpeseGenerali: number; totaleComplessivo: number }
type NsRowP = { objectid: number; categoria_costo: NsCat; origine_voce_snapshot: string; codice_voce_snapshot: string; descrizione_snapshot: string; unita_misura_snapshot: string; prezzo_unitario_snapshot: number; quantita: number; importo_riga: number; anno_prezzario_snapshot?: number | null; ordine: number; note: string; codice_casistica?: string | null }

type DocumentAvailability = {
  loadingAllegati?: boolean
  notaSpese: boolean
  mappa: boolean
  allegati: boolean
  checkedKey: string
}

const DEFAULT_PRINT_SERVICE_URL = 'https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task'

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

const NS_CATS: NsCat[] = ['AT', 'PR', 'RU', 'SL', 'PF']
const EMPTY_NS_ROWS: Record<NsCat, NsRowP[]> = { AT: [], PR: [], RU: [], SL: [], PF: [] }

const NS_CASISTICA_META: Record<string, { order: number; label: string }> = {
  C100_REPERIBILITA: { order: 8, label: 'Art. 8 - Violazione servizio di reperibilità' },
  C101_SPRECO_ACQUA: { order: 27, label: 'Art. 27 - Spreco d’acqua/uso negligente della risorsa idrica' },
  C104_ATTREZZATURE_DANNEGGIATE: { order: 30, label: 'Art. 30 - Danneggiamento e/o perdita attrezzature' },
  C113_DANNI_STRUTTURE_IRRIGUE: { order: 39, label: 'Art. 39 - Danni alle strutture irrigue' }
}

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

type Art30CauzionePdfDetail = {
  unitaMisura: string
  quantita: number
  valoreUnitario: number
  importo: number
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
    const quantitaMatch = text.match(/\s+—\s+Quantità:\s*([0-9.,]+)/i)
    if (!quantitaMatch || quantitaMatch.index == null) continue
    const prefix = text.slice(0, quantitaMatch.index).trim()
    const codiceMatch = prefix.match(/^(.*?)\s+—\s+Codice:\s*(.+)$/i)
    const descrizione = String(codiceMatch?.[1] || prefix).trim()
    const codice = String(codiceMatch?.[2] || '').trim()
    const quantita = parseArt30Number(quantitaMatch[1])
    if (!descrizione || quantita == null || quantita <= 0) continue
    const valoreUnitarioMatch = text.match(/Valore unitario:\s*([0-9.,]+)/i)
    const importoMatch = text.match(/Importo:\s*([0-9.,]+)/i)
    out.push({
      codice,
      descrizione,
      quantita,
      valoreUnitario: parseArt30Number(valoreUnitarioMatch?.[1]),
      importo: parseArt30Number(importoMatch?.[1])
    })
  }
  return out
}

function parseArt30CauzioneDetailForPdf (raw: any): Art30CauzionePdfDetail | null {
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const text = line.trim()
    if (!/^Decurtazione della cauzione\b/i.test(text)) continue
    const unitaMisuraMatch = text.match(/U\.M\.:\s*([^—|]+?)(?:\s+(?:—|\|)|$)/i)
    const quantitaMatch = text.match(/Quantità:\s*([0-9.,]+)/i)
    const valoreUnitarioMatch = text.match(/Valore unitario:\s*([0-9.,]+)/i)
    const importoMatch = text.match(/Importo:\s*-?\s*([0-9.,]+)/i)
    const quantita = parseArt30Number(quantitaMatch?.[1])
    const valoreUnitario = parseArt30Number(valoreUnitarioMatch?.[1])
    const importo = parseArt30Number(importoMatch?.[1])
    if (quantita == null || quantita <= 0 || valoreUnitario == null || valoreUnitario < 0 || importo == null || importo < 0) return null
    return {
      unitaMisura: String(unitaMisuraMatch?.[1] || 'n.').trim() || 'n.',
      quantita,
      valoreUnitario,
      importo
    }
  }
  return null
}

function qtyArt30It (value: number): string {
  return Number(value).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
}

function buildArt30RapportoSummary (data: Record<string, any>): { hasData: boolean; rows: Art30RimborsoPdfRow[]; rimborso: number; cauzione: number; cauzioneQuantita: number | null; cauzioneValoreUnitario: number | null; cauzioneUnitaMisura: string; netto: number; text: string } {
  const detailRaw = pickAttrCI(data, ['attrezzature_rimborso_dettaglio'])
  const rows = parseArt30DetailForPdf(detailRaw)
  const cauzioneDetail = parseArt30CauzioneDetailForPdf(detailRaw)
  const rimborsoSalvato = parseArt30Number(pickAttrCI(data, ['attrezzature_rimborso_importo']))
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
    cauzioneQuantita: cauzioneDetail?.quantita ?? null,
    cauzioneValoreUnitario: cauzioneDetail?.valoreUnitario ?? null,
    cauzioneUnitaMisura: cauzioneDetail?.unitaMisura || 'n.',
    netto,
    text: `Art. 30 - ${parts.join('; ')}.`
  }
}

function normalizeNsCasistica (v: any): string {
  return String(v ?? '').trim()
}

function cloneEmptyNsRows (): Record<NsCat, NsRowP[]> {
  return { AT: [], PR: [], RU: [], SL: [], PF: [] }
}

function buildNsSummaryForRows (rows: Record<NsCat, NsRowP[]>, percentualeSpeseGenerali: number): NsSummaryP {
  const sumCat = (cat: NsCat) => roundMoney((rows[cat] || []).reduce((sum, r) => sum + roundMoney(Number(r.importo_riga) || 0), 0))
  const totaleAT = sumCat('AT')
  const totalePR = sumCat('PR')
  const totaleRU = sumCat('RU')
  const totaleSL = sumCat('SL')
  const totalePF = sumCat('PF')
  const imponibile = roundMoney(totaleAT + totalePR + totaleRU + totaleSL + totalePF)
  const pct = Number.isFinite(percentualeSpeseGenerali) ? roundMoney(percentualeSpeseGenerali) : 15
  const importoSpeseGenerali = roundMoney(imponibile * pct / 100)
  return {
    totaleAT,
    totalePR,
    totaleRU,
    totaleSL,
    totalePF,
    percentualeSpeseGenerali: pct,
    importoSpeseGenerali,
    totaleComplessivo: roundMoney(imponibile + importoSpeseGenerali)
  }
}

function buildNotaSpeseGroups (
  rowsByCategory: Record<NsCat, NsRowP[]> | undefined,
  globalSummary: NsSummaryP | undefined
): Array<{ codiceCasistica: string; label: string; rows: Record<NsCat, NsRowP[]>; summary: NsSummaryP }> {
  const byCode = new Map<string, Record<NsCat, NsRowP[]>>()
  for (const cat of NS_CATS) {
    for (const row of (rowsByCategory?.[cat] || [])) {
      const code = normalizeNsCasistica(row.codice_casistica) || '__NON_COLLEGATA__'
      if (!byCode.has(code)) byCode.set(code, cloneEmptyNsRows())
      byCode.get(code)![cat].push({ ...row, categoria_costo: cat })
    }
  }

  const pct = Number(globalSummary?.percentualeSpeseGenerali)
  const groups = Array.from(byCode.entries()).map(([code, rows]) => {
    const meta = NS_CASISTICA_META[code]
    return {
      codiceCasistica: code,
      label: meta?.label || (code === '__NON_COLLEGATA__' ? 'Nota spese non collegata a violazione' : 'Nota spese collegata'),
      rows,
      summary: buildNsSummaryForRows(rows, Number.isFinite(pct) ? pct : 15)
    }
  })

  return groups
    .filter(g => g.summary.totaleComplessivo > 0)
    .sort((a, b) => {
      const ao = NS_CASISTICA_META[a.codiceCasistica]?.order ?? 999
      const bo = NS_CASISTICA_META[b.codiceCasistica]?.order ?? 999
      if (ao !== bo) return ao - bo
      return a.label.localeCompare(b.label, 'it')
    })
}

function buildNotaSpesePrintGroups (
  rowsByCategory: Record<NsCat, NsRowP[]> | undefined,
  globalSummary: NsSummaryP | undefined,
  dataSnapshot: Record<string, any> | undefined
): Array<{ codiceCasistica: string; label: string; rows: Record<NsCat, NsRowP[]>; summary: NsSummaryP }> {
  const groups = buildNotaSpeseGroups(rowsByCategory, globalSummary)
  const art30Summary = buildArt30RapportoSummary(dataSnapshot || {})
  const out = groups.slice()
  if (art30Summary.hasData && !out.some(group => group.codiceCasistica === 'C104_ATTREZZATURE_DANNEGGIATE')) {
    out.push({
      codiceCasistica: 'C104_ATTREZZATURE_DANNEGGIATE',
      label: NS_CASISTICA_META.C104_ATTREZZATURE_DANNEGGIATE.label,
      rows: cloneEmptyNsRows(),
      summary: buildNsSummaryForRows(cloneEmptyNsRows(), Number(globalSummary?.percentualeSpeseGenerali) || 15)
    })
    out.sort((a, b) => (NS_CASISTICA_META[a.codiceCasistica]?.order ?? 999) - (NS_CASISTICA_META[b.codiceCasistica]?.order ?? 999))
  }
  return out
}

function rapportoPdfFileNameForEditing (map: Record<string, string>): string {
  const cp = map.cod_pratica || 'rapporto'
  return `rapporto_${cp.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
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

function delay (ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function buildMapPrintPdfBlob (view: any, printServiceUrl: string, opts: DocumentPrintOptions, sourceView?: any): Promise<{ blob: Blob; fileName: string }> {
  if (!view) throw new Error('Map view non disponibile per la stampa.')
  const serviceUrl = String(printServiceUrl || DEFAULT_PRINT_SERVICE_URL).trim()
  if (!serviceUrl) throw new Error('Servizio stampa ArcGIS non configurato.')

  const print = await loadEsriModule<any>('esri/rest/print')
  const PrintTemplate = await loadEsriModule<any>('esri/rest/support/PrintTemplate')
  const PrintParameters = await loadEsriModule<any>('esri/rest/support/PrintParameters')
  const Basemap = await loadEsriModule<any>('esri/Basemap').catch(() => null)
  const Graphic = await loadEsriModule<any>('esri/Graphic').catch(() => null)
  const Point = await loadEsriModule<any>('esri/geometry/Point').catch(() => null)
  const SimpleMarkerSymbol = await loadEsriModule<any>('esri/symbols/SimpleMarkerSymbol').catch(() => null)
  const symbolUtils = await loadEsriModule<any>('esri/symbols/support/symbolUtils').catch(() => null)

  // Per la legenda usa sourceView (p.mapView già carica) se disponibile, altrimenti la printView
  const legendView = sourceView ?? view
  await ensureGiiPrintableMapLayersReady(legendView)
  const layers = listPrintableMapLayers(legendView)
  const localizationLayerKeys = new Set(layers.filter(item => printableLayerIsLocalization(item, opts)).map(item => item.key))
  const hasLocalizationLayerControl = localizationLayerKeys.size > 0
  const localizationRequested = !hasLocalizationLayerControl || layers.some(item => {
    if (!localizationLayerKeys.has(item.key)) return false
    return opts.mapLayerVisibility?.[item.key] !== false
  })
  const oldVisibilityMap = new Map<any, boolean>()
  const oldDefinitionMap = new Map<any, any>()
  layers.forEach(item => {
    ;[item.layer, ...(item.ancestors || [])].forEach(layer => {
      if (layer && !oldVisibilityMap.has(layer)) oldVisibilityMap.set(layer, layer.visible !== false)
    })
    if (localizationLayerKeys.has(item.key) && item.layer && !oldDefinitionMap.has(item.layer)) {
      try { oldDefinitionMap.set(item.layer, item.layer.definitionExpression) } catch {}
    }
  })
  const oldBasemap = view?.map?.basemap
  const oldScale = Number(view?.scale)
  const oldViewpoint = (() => { try { return view?.viewpoint?.clone ? view.viewpoint.clone() : view?.viewpoint } catch { return null } })()
  let printMarker: any = null
  try {
    layers.forEach(item => {
      if (item.layer && Object.prototype.hasOwnProperty.call(opts.mapLayerVisibility || {}, item.key)) {
        const visible = !!opts.mapLayerVisibility[item.key]
        const isLocalizationLayer = localizationLayerKeys.has(item.key)
        if (visible && !isLocalizationLayer) {
          (item.ancestors || []).forEach(layer => { try { layer.visible = true } catch {} })
        }
        item.layer.visible = isLocalizationLayer ? false : visible
        if (isLocalizationLayer) {
          try { item.layer.definitionExpression = '1 = 0' } catch {}
        }
      }
    })
    if (opts.mapBasemap && view?.map) {
      try {
        const bm = Basemap?.fromId ? Basemap.fromId(String(opts.mapBasemap)) : String(opts.mapBasemap)
        view.map.basemap = bm || String(opts.mapBasemap)
        if (typeof view.map.basemap?.load === 'function') await view.map.basemap.load().catch(() => {})
        await view.when?.()
        try {
          const baseLayer = view.map.basemap?.baseLayers?.getItemAt?.(0)
          if (baseLayer && typeof view.whenLayerView === 'function') await Promise.race([view.whenLayerView(baseLayer), delay(300)])
        } catch {}
        try { view.requestRender?.() } catch {}
      } catch {
        try { view.map.basemap = String(opts.mapBasemap) } catch {}
      }
    }
    const requestedScale = Number(opts.mapScale)
    const printTargetGeometry = Point && opts.mapTarget ? mapPrintPointGeometry(opts.mapTarget, Point) : null
    if (typeof view.goTo === 'function') {
      if (opts.mapTarget) {
        try { await view.goTo({ target: printTargetGeometry || opts.mapTarget, scale: Number.isFinite(requestedScale) && requestedScale > 0 ? requestedScale : undefined }, { animate: false }) } catch {}
      } else if (Number.isFinite(requestedScale) && requestedScale > 0) {
        try { await view.goTo({ scale: requestedScale }, { animate: false }) } catch {}
      }
    }
    if (localizationRequested && opts.mapTarget && Graphic && Point && SimpleMarkerSymbol && view?.graphics) {
      try {
        const geometry = printTargetGeometry || mapPrintPointGeometry(opts.mapTarget, Point)
        if (geometry) {
          const symbol = new SimpleMarkerSymbol({
            style: 'circle',
            color: [220, 38, 38, 220],
            size: 9,
            xoffset: 0,
            yoffset: 0,
            outline: { color: [255, 255, 255, 255], width: 1.5 }
          })
          printMarker = new Graphic({ geometry, symbol, attributes: { source: 'gii-editing-print-marker' } })
          view.graphics.add(printMarker)
          try { view.requestRender?.() } catch {}
          await delay(120)
        }
      } catch {}
    }

    const printScale = Number(opts.mapScale) || Number(legendView?.scale) || 0
    const printExtent = printScale > 0 ? computePrintExtentForView(legendView, printScale) ?? undefined : undefined

    // === DIAGNOSTICA TEMPORANEA — rimuovere dopo il debug ===
    console.warn('[GII-LEGENDA-DEBUG] scale=', legendView?.scale, 'resolution=', legendView?.resolution,
      'extent=', legendView?.extent ? `${legendView.extent.xmin.toFixed(0)},${legendView.extent.ymin.toFixed(0)},${legendView.extent.xmax.toFixed(0)},${legendView.extent.ymax.toFixed(0)} wkid=${legendView.extent.spatialReference?.wkid}` : null,
      'printExtent=', printExtent ? `${printExtent.xmin.toFixed(0)},${printExtent.ymin.toFixed(0)},${printExtent.xmax.toFixed(0)},${printExtent.ymax.toFixed(0)}` : null,
      'mapLayerVisibility=', JSON.stringify(opts.mapLayerVisibility || {}))
    console.warn('[GII-LEGENDA-DEBUG] layers=', layers.map(l =>
      `${l.key}|visible=${l.layer?.visible}|type=${l.layer?.type||'?'}|loaded=${l.layer?.loaded}|url=${String(l.layer?.url||l.layer?.parent?.url||'').slice(-40)}`
    ).join('\n'))
    // === FINE DIAGNOSTICA ===

    const legendItems = await buildGiiMapLegendItemsForView(legendView, layers, { ...opts, symbolUtils, printExtent }, localizationLayerKeys, localizationRequested)

    console.warn('[GII-LEGENDA-DEBUG] legendItems=', legendItems.map(i => `${i.label}|img=${!!i.image}`).join(', '))
    const template = new PrintTemplate({
      format: 'pdf',
      layout: opts.mapLayout || 'A4 Portrait',
      layoutOptions: {
        titleText: '',
        authorText: '',
        copyrightText: ''
      },
      exportOptions: { dpi: 96 },
      scalePreserved: true,
      outScale: Number(opts.mapScale) || Number(view?.scale) || undefined
    })
    const params = new PrintParameters({ view, template })
    const result = await print.execute(serviceUrl, params)
    const url = String(result?.url || result?.href || '')
    if (!url) throw new Error('Il servizio stampa non ha restituito un PDF.')
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`Download stampa mappa fallito (HTTP ${resp.status}).`)
    const rawBlob = await resp.blob()
    return {
      blob: await wrapMapPdfBlobWithRapportoTechnicalHeader(rawBlob, mapTechnicalDocumentTitle('-'), {
        scale: Number(opts.mapScale) || Number(view?.scale) || null,
        basemapLabel: mapBasemapLabel(opts.mapBasemap || view?.map?.basemap?.title || view?.map?.basemap?.id),
        legendItems,
        sourceLayout: opts.mapLayout
      }),
      fileName: 'mappa_rapporto.pdf'
    }
  } finally {
    if (printMarker && view?.graphics) {
      try { view.graphics.remove(printMarker) } catch {}
    }
    oldDefinitionMap.forEach((definition, layer) => { try { layer.definitionExpression = definition } catch {} })
    oldVisibilityMap.forEach((visible, layer) => { try { layer.visible = visible } catch {} })
    try { if (oldBasemap && view?.map) view.map.basemap = oldBasemap } catch {}
    if (typeof view?.goTo === 'function') {
      if (oldViewpoint) {
        try { await view.goTo(oldViewpoint, { animate: false }) } catch {}
      } else if (Number.isFinite(oldScale) && oldScale > 0) {
        try { await view.goTo({ scale: oldScale }, { animate: false }) } catch {}
      }
    }
  }
}

function normalizeArcgisLayerUrl (url: any): string {
  return String(url || '').trim().replace(/\/+$/, '')
}

async function resolveFeatureLayerForAttachments (ds: any): Promise<any | null> {
  if (!ds) return null
  try {
    const direct = await Promise.resolve(ds?.getLayer?.() || ds?.getJsApiLayer?.() || ds?.getJSAPILayer?.() || ds?.layer || null)
    const layer = direct?.layer || direct
    if (layer && typeof layer.queryFeatures === 'function') return layer
  } catch {}
  try {
    const url = normalizeArcgisLayerUrl(ds?.getDataSourceJson?.()?.url || ds?.dataSourceJson?.url || ds?.url || '')
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

async function hasAttachments (ds: any, oid: number): Promise<boolean> {
  if (!Number.isFinite(oid) || oid <= 0) return false
  const layer = await resolveFeatureLayerForAttachments(ds)
  if (!layer) return false
  const infos = await queryFeatureAttachments(layer, oid, ds)
  return infos.length > 0
}

async function loadAttachmentOptions (ds: any, oid: number): Promise<AttachmentPrintOption[]> {
  if (!Number.isFinite(oid) || oid <= 0) return []
  const layer = await resolveFeatureLayerForAttachments(ds)
  if (!layer) return []
  const infos = await queryFeatureAttachments(layer, oid, ds)
  return (infos || []).map((att: any) => ({
    id: Number(att?.id ?? att?.attachmentId ?? att?.objectId),
    name: att?.name,
    size: att?.size,
    contentType: att?.contentType,
    url: att?.url
  })).filter((att: AttachmentPrintOption) => Number.isFinite(att.id) && att.id > 0)
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
      const bitmap = await createBitmap(blob, { imageOrientation: 'from-image' }).catch(() => null)
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

async function buildPracticeAttachmentsPdfBlob (ds: any, oid: number, selectedAttachmentIds?: number[], numeroRapportoTecnico?: string): Promise<{ blob: Blob; fileName: string } | null> {
  const layer = await resolveFeatureLayerForAttachments(ds)
  if (!layer) throw new Error('FeatureLayer allegati non disponibile.')
  const selectedSet = Array.isArray(selectedAttachmentIds) && selectedAttachmentIds.length > 0
    ? new Set(selectedAttachmentIds.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0))
    : null
  const infos = (await queryFeatureAttachments(layer, oid, ds)).filter((att: any) => {
    if (!selectedSet) return true
    const id = Number(att?.id ?? att?.attachmentId ?? att?.objectId)
    return selectedSet.has(id)
  })
  if (!infos.length) return null

  const out = await PDFDocument.create()
  let count = 0
  let elaboratoIndex = 0
  const pageTitles: string[] = []
  for (let i = 0; i < infos.length; i++) {
    const att = infos[i]
    const fetched = await fetchAttachmentBlob(layer, ds, oid, att, i)
    if (!fetched) continue
    const blob = fetched.blob
    const contentType = String(blob.type || att?.contentType || '').toLowerCase()
    const name = fetched.fileName
    const bytes = new Uint8Array(await blob.arrayBuffer())
    try {
      if (contentType.includes('pdf') || /\.pdf$/i.test(name)) {
        const src = await PDFDocument.load(bytes as any)
        const sourcePages = src.getPages()
        if (sourcePages.length === 0) continue
        if (sourcePages.length > 0) elaboratoIndex++
        const pageTitle = attachmentTechnicalDocumentTitle(elaboratoIndex, numeroRapportoTecnico)
        for (const sourcePage of sourcePages) {
          const page = out.addPage([595.28, 841.89])
          const embedded = await (out as any).embedPage(sourcePage)
          const size = sourcePage.getSize()
          drawEmbeddedPdfPageInRapportoTechnicalBody(page, embedded, size.width, size.height)
          pageTitles.push(pageTitle)
        }
        count++
      } else if (contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)$/i.test(name)) {
        const normalized = await normalizeRasterAttachmentForPdf(blob, bytes, name, contentType)
        const img = await out.embedJpg(normalized.bytes as any)
        await addRasterAttachmentPage(out, img)
        elaboratoIndex++
        pageTitles.push(attachmentTechnicalDocumentTitle(elaboratoIndex, numeroRapportoTecnico))
        count++
      } else if (contentType.includes('png') || /\.png$/i.test(name)) {
        const normalized = await normalizeRasterAttachmentForPdf(blob, bytes, name, contentType)
        const img = await out.embedPng(normalized.bytes as any)
        await addRasterAttachmentPage(out, img)
        elaboratoIndex++
        pageTitles.push(attachmentTechnicalDocumentTitle(elaboratoIndex, numeroRapportoTecnico))
        count++
      }
    } catch {
      // Allegato non impaginabile: lo si ignora nel PDF unico.
    }
  }
  if (count === 0) return null
  await drawRapportoTechnicalHeadersByPage(out, index => pageTitles[index] || attachmentTechnicalDocumentTitle(index + 1, numeroRapportoTecnico))
  const bytes = await out.save()
  return { blob: new Blob([bytes as any], { type: 'application/pdf' }), fileName: 'allegati_probatori.pdf' }
}

async function buildRapportoDocumentsPdfBlob (
  dataSnapshot: Record<string, any>,
  utenti: Map<string, UtenteCached> | null,
  nsRows: Record<NsCat, NsRowP[]> | undefined,
  nsSummary: NsSummaryP | undefined,
  docOptions: Pick<DocumentPrintOptions, 'includeRapporto' | 'includeNotaSpese' | 'selectedNotaSpeseKeys'>
): Promise<{ blob: Blob; fileName: string }> {
  const iterGlobalId = pickAttrCI(dataSnapshot, ['globalid', 'GlobalID', 'GLOBALID', 'parent_globalid'])
  const iterCicli = await loadRapportoIterCicliForPdf(iterGlobalId)
  const map = buildPlaceholderMap(dataSnapshot, utenti, iterCicli)
  const nsGroups = buildNotaSpeseGroups(nsRows, nsSummary)
  const art30Summary = buildArt30RapportoSummary(dataSnapshot)
  const allReportNsGroups = buildNotaSpesePrintGroups(nsRows, nsSummary, dataSnapshot)
  const selectedNotaSpeseKeys = docOptions.selectedNotaSpeseKeys || {}
  const reportNsGroups = allReportNsGroups.filter(group => selectedNotaSpeseKeys[group.codiceCasistica] !== false)
  const totaleNoteSpeseDaGruppi = roundMoney(nsGroups.reduce((sum, group) => sum + roundMoney(Number(group?.summary?.totaleComplessivo) || 0), 0))
  const totaleNoteSpeseSalvato = roundMoney(parseArt30Number(pickAttrCI(dataSnapshot, ['ns_totale_complessivo'])) ?? 0)
  const totaleNoteSpese = nsGroups.length > 0 ? totaleNoteSpeseDaGruppi : totaleNoteSpeseSalvato
  const hasRimborso = nsGroups.length > 0 || totaleNoteSpese !== 0 || art30Summary.hasData
  const totaleRimborso = roundMoney(totaleNoteSpese + (art30Summary.hasData ? art30Summary.netto : 0))
  const includeRapporto = docOptions.includeRapporto !== false
  const includeNotaSpese = docOptions.includeNotaSpese !== false

  map.importo_rimborso = hasRimborso ? moneyIt(totaleRimborso) : ''
  map.riepilogo_art30 = art30Summary.text
  map.nota_spese_label = !includeNotaSpese ? '' : reportNsGroups.length > 1
    ? '(Vedi note spese allegate)'
    : (reportNsGroups.length === 1 ? '(Vedi nota spese allegata)' : '')

  const rapportoBytes = includeRapporto ? await buildRapportoPdf(map) : null
  let finalBytes: Uint8Array = rapportoBytes || new Uint8Array()

  if (includeNotaSpese && reportNsGroups.length > 0) {
    const merged = await PDFDocument.create()
    if (rapportoBytes) {
      const rapDoc = await PDFDocument.load(rapportoBytes)
      const rapPages = await merged.copyPages(rapDoc, rapDoc.getPageIndices())
      rapPages.forEach(pg => merged.addPage(pg))
    }

    for (let i = 0; i < reportNsGroups.length; i++) {
      const group = reportNsGroups[i]
      const nsData: NotaSpeseData = {
        cod_pratica: map.cod_pratica || '',
        area_label: map.area_label || '',
        settore_label: map.settore_label || '',
        area_cod: map.area_cod || '',
        numero_nota: i + 1,
        titolo_nota: group.label,
        rows: group.rows as any,
        summary: group.summary,
        art30: group.codiceCasistica === 'C104_ATTREZZATURE_DANNEGGIATE' && art30Summary.hasData
          ? {
              rows: art30Summary.rows.map(row => ({
                codice: row.codice,
                descrizione: row.descrizione,
                quantita: row.quantita,
                valore_unitario: row.valoreUnitario,
                importo: roundMoney(row.importo ?? ((row.valoreUnitario ?? 0) * row.quantita))
              })),
              rimborso: art30Summary.rimborso,
              cauzione: art30Summary.cauzione,
              cauzione_quantita: art30Summary.cauzioneQuantita,
              cauzione_valore_unitario: art30Summary.cauzioneValoreUnitario,
              cauzione_unita_misura: art30Summary.cauzioneUnitaMisura,
              netto: art30Summary.netto
            }
          : null,
        luogo_data: 'Cagliari, ' + (formatDateIt(dataSnapshot.data_firma) || new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })),
        firma_nome: map.firma_ti || '',
        rapporto_respinto: map.rapporto_respinto === '1',
        rapporto_istruttoria: map.rapporto_istruttoria === '1'
      }
      const nsBytes = await buildNotaSpesePdf(nsData)
      const nsDoc = await PDFDocument.load(nsBytes)
      const nsPages = await merged.copyPages(nsDoc, nsDoc.getPageIndices())
      nsPages.forEach(pg => merged.addPage(pg))
    }

    finalBytes = await merged.save()
  }
  if (!includeRapporto && (!includeNotaSpese || reportNsGroups.length === 0)) {
    throw new Error('Nessuna nota spese allegabile trovata per il rapporto selezionato.')
  }

  const fileName = rapportoPdfFileNameForEditing(map)
  const outFileName = includeRapporto ? fileName : fileName.replace(/^rapporto_/i, 'nota_spese_')
  return { blob: new Blob([finalBytes as any], { type: 'application/pdf' }), fileName: outFileName }
}

export default function AnteprimaPanel (p: {
  data: Record<string, any>
  mode: 'create' | 'edit'
  nsRows?: Record<NsCat, NsRowP[]>
  nsSummary?: NsSummaryP
  ds?: any
  oid?: number | null
  idFieldName?: string
  mapView?: any | null
  mapConfig?: any
  mapTarget?: any | null
  printServiceUrl?: string
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
  const [notaSpeseOptions, setNotaSpeseOptions] = React.useState<NotaSpesePrintOption[]>([])
  const printMapView = technicalMapView || null
  const printableLayerTree = listPrintableMapLayerTree(printMapView)
  const printableLayerItems = flattenPrintableMapLayerTree(printableLayerTree)
  const printableLayerSignature = printableLayerItems.map(item => `${item.key}:${item.visible ? 1 : 0}`).join('|')
  const [expandedLayerGroups, setExpandedLayerGroups] = React.useState<Record<string, boolean>>({})
  const [docOptions, setDocOptions] = React.useState<DocumentPrintOptions>(() => cloneDocumentPrintOptions(editingTiAnteprimaAppliedOptionsMemory.get(optionsMemoryKey) || defaultDocumentPrintOptions()))
  const [previewOptions, setPreviewOptions] = React.useState<DocumentPrintOptions>(() => cloneDocumentPrintOptions(editingTiAnteprimaAppliedOptionsMemory.get(optionsMemoryKey) || defaultDocumentPrintOptions()))
  const [previewRevision, setPreviewRevision] = React.useState(0)
  const loadedOptionsKeyRef = React.useRef(optionsMemoryKey)
  const forceNextPreviewRegenerateRef = React.useRef(false)

  React.useEffect(() => {
    if (loadedOptionsKeyRef.current !== optionsMemoryKey) return
    editingTiAnteprimaAppliedOptionsMemory.set(optionsMemoryKey, cloneDocumentPrintOptions(previewOptions))
  }, [optionsMemoryKey, previewOptions])

  React.useEffect(() => {
    const rememberedApplied = cloneDocumentPrintOptions(editingTiAnteprimaAppliedOptionsMemory.get(optionsMemoryKey) || defaultDocumentPrintOptions())
    loadedOptionsKeyRef.current = optionsMemoryKey
    setDocOptions(rememberedApplied)
    setPreviewOptions(rememberedApplied)
  }, [optionsMemoryKey])

  const dataSignature = React.useMemo(() => {
    try { return JSON.stringify(p.data || {}) } catch { return String(p.data || '') }
  }, [p.data])

  const nsSignature = React.useMemo(() => {
    try { return JSON.stringify({ r: p.nsRows || {}, s: p.nsSummary || {} }) } catch { return '' }
  }, [p.nsRows, p.nsSummary])

  const preferConfiguredWebMapForPreview = !!String(p.mapConfig?.webMapItemId || '').trim()
  const sourceMapViewForPreview = preferConfiguredWebMapForPreview ? null : p.mapView

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
    const groups = buildNotaSpeseGroups(p.nsRows, p.nsSummary)
    return groups.length > 0 || buildArt30RapportoSummary(p.data || {}).hasData
  }, [dataSignature, nsSignature])

  const computedNotaSpeseOptions = React.useMemo<NotaSpesePrintOption[]>(() => {
    return buildNotaSpesePrintGroups(p.nsRows, p.nsSummary, p.data).map(group => ({
      key: group.codiceCasistica,
      label: group.label
    }))
  }, [dataSignature, nsSignature])

  React.useEffect(() => {
    const sourceView = sourceMapViewForPreview
    const cfg = p.mapConfig || {}
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
          loadEsriModule<any>('esri/WebMap').catch(() => null),
          loadEsriModule<any>('esri/layers/FeatureLayer'),
          loadEsriModule<any>('esri/portal/Portal').catch(() => null)
        ])
        if (cancelled || !technicalMapContainerRef.current) return
        const sourceMap = sourceView?.map
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
          } catch {
            map = new Map({ basemap: 'satellite' })
          }
        } else if (sourceMap) {
          try {
            map = typeof sourceMap.clone === 'function'
              ? sourceMap.clone()
              : new Map({ basemap: sourceMap?.basemap?.clone ? sourceMap.basemap.clone() : (sourceMap?.basemap || 'satellite') })
          } catch {
            map = new Map({ basemap: 'satellite' })
          }
        } else {
          map = new Map({ basemap: 'satellite' })
        }
        if (!mapFromWebMap && map && map !== sourceMap && !map.layers?.length && sourceMap?.layers) {
          try {
            sourceMap.layers.forEach((layer: any) => {
              try { map.layers.add(layer?.clone ? layer.clone() : layer) } catch {}
            })
          } catch {}
        }
        if (mapFromWebMap) {
          try { if (typeof map?.loadAll === 'function') await map.loadAll() } catch {}
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
          } catch {}
        }
        try { if (typeof map?.loadAll === 'function') await map.loadAll() } catch {}
        const targetLon = Number(mapTarget?.longitude ?? mapTarget?.x)
        const targetLat = Number(mapTarget?.latitude ?? mapTarget?.y)
        const officeLon = Number(cfg.officeLonWgs84) || 9.0
        const officeLat = Number(cfg.officeLatWgs84) || 39.5
        view = new MapView({
          container: technicalMapContainerRef.current,
          map,
          center: sourceView?.center?.clone
            ? sourceView.center.clone()
            : (Number.isFinite(targetLon) && Number.isFinite(targetLat) ? [targetLon, targetLat] : [officeLon, officeLat]),
          scale: Number(sourceView?.scale) || 1000,
          zoom: Number(sourceView?.zoom) || undefined,
          ui: { components: [] }
        })
        await view.when()
        if (cancelled) {
          try { view.destroy() } catch {}
          return
        }
        setTechnicalMapView(view)
      } catch {
        if (!cancelled) setTechnicalMapView(null)
      }
    })()
    return () => {
      cancelled = true
      setTechnicalMapView(null)
      if (view) { try { view.destroy() } catch {} }
    }
  }, [sourceMapViewForPreview, mapConfigSignature, mapTargetSignature])

  React.useEffect(() => {
    setNotaSpeseOptions(computedNotaSpeseOptions)
    setDocOptions(prev => {
      const previousSelected = prev.selectedNotaSpeseKeys || {}
      const selectedNotaSpeseKeys: Record<string, boolean> = {}
      computedNotaSpeseOptions.forEach(item => {
        selectedNotaSpeseKeys[item.key] = computedNotaSpeseOptions.length > 1 && Object.prototype.hasOwnProperty.call(previousSelected, item.key) ? previousSelected[item.key] : true
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
    const viewAvailable = !!printMapView
    const checkedKey = `${p.oid || ''}:${Date.now()}`
    setAvailability({
      loadingAllegati: !!(p.ds && p.oid),
      notaSpese: hasNotaSpeseLocal,
      mappa: targetAvailable && viewAvailable,
      allegati: false,
      checkedKey
    })
    setAttachmentOptions([])
    if (!hasNotaSpeseLocal) setDocOptions(prev => ({ ...prev, includeNotaSpese: false }))
    if (!targetAvailable) setDocOptions(prev => ({ ...prev, includeMappa: false }))
    if (!p.ds || !p.oid) {
      setDocOptions(prev => ({ ...prev, includeAllegati: false }))
      return
    }
    let cancelled = false
    void loadAttachmentOptions(p.ds, Number(p.oid)).then(allegatiList => {
      if (cancelled) return
      setAttachmentOptions(allegatiList)
      setDocOptions(prev => {
        const previousSelected = prev.selectedAttachmentIds || {}
        const selectedAttachmentIds: Record<string, boolean> = {}
        allegatiList.forEach(att => {
          const key = String(att.id)
          selectedAttachmentIds[key] = Object.prototype.hasOwnProperty.call(previousSelected, key) ? previousSelected[key] : true
        })
        return { ...prev, selectedAttachmentIds, includeAllegati: allegatiList.length > 0 ? prev.includeAllegati : false }
      })
      const allegati = allegatiList.length > 0
      setAvailability(prev => prev.checkedKey === checkedKey ? { ...prev, loadingAllegati: false, allegati } : prev)
      if (!allegati) setDocOptions(prev => ({ ...prev, includeAllegati: false }))
    }).catch(() => {
      if (cancelled) return
      setAttachmentOptions([])
      setAvailability(prev => prev.checkedKey === checkedKey ? { ...prev, loadingAllegati: false, allegati: false } : prev)
      setDocOptions(prev => ({ ...prev, includeAllegati: false }))
    })
    return () => { cancelled = true }
  }, [p.ds, p.oid, hasNotaSpeseLocal, mapTargetSignature, printMapView])

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
    const opts = previewOptions
    const dataSnapshot = { ...(p.data || {}) }
    const items: Array<{ blob: Blob; fileName: string }> = []
    const includeRapporto = opts.includeRapporto
    const includeNotaSpese = opts.includeNotaSpese && hasNotaSpeseLocal
    const selectedNotaSpeseKeys = notaSpeseOptions
      .filter(item => (opts.selectedNotaSpeseKeys || {})[item.key] !== false)
      .map(item => item.key)
    if (includeNotaSpese && selectedNotaSpeseKeys.length === 0) throw new Error('Selezionare almeno una nota spese.')
    if (includeRapporto || includeNotaSpese) {
      items.push(await buildRapportoDocumentsPdfBlob(dataSnapshot, utenti, p.nsRows, p.nsSummary, {
        includeRapporto,
        includeNotaSpese,
        selectedNotaSpeseKeys: { ...(opts.selectedNotaSpeseKeys || {}) }
      }))
    }
    if (opts.includeMappa && mapTarget && printMapView) {
      const selectedOid = Number(p.oid)
      items.push(await buildMapPrintPdfBlob(printMapView, String(p.printServiceUrl || DEFAULT_PRINT_SERVICE_URL), {
        ...opts,
        mapTarget,
        mapSelectedOid: Number.isFinite(selectedOid) && selectedOid > 0 ? selectedOid : null,
        mapSelectedIdFieldName: String(p.idFieldName || 'OBJECTID'),
        mapLocalizationLayerUrl: String(p.mapConfig?.mapLayerUrl || '')
      }, p.mapView ?? undefined))
    }
    if (opts.includeAllegati && p.ds && p.oid) {
      const selectedAttachmentIds = attachmentOptions
        .filter(att => (opts.selectedAttachmentIds || {})[String(att.id)] !== false)
        .map(att => Number(att.id))
        .filter(id => Number.isFinite(id) && id > 0)
      if (selectedAttachmentIds.length === 0) throw new Error('Selezionare almeno un allegato.')
      const attPdf = await buildPracticeAttachmentsPdfBlob(p.ds, Number(p.oid), selectedAttachmentIds, officialRapportoTecnicoNumberForEditing(dataSnapshot))
      if (attPdf) items.push(attPdf)
    }
    if (items.length === 0) throw new Error('Selezionare almeno un documento.')
    if (items.length === 1) return items[0]
    const safeCode = String(praticaCode || 'documenti').replace(/[^a-zA-Z0-9_-]/g, '_')
    return { blob: await mergePdfBlobs(items), fileName: `documenti_${safeCode}.pdf` }
  }, [previewOptions, attachmentOptions, notaSpeseOptions, hasNotaSpeseLocal, mapTarget, p.data, p.ds, printMapView, p.nsRows, p.nsSummary, p.oid, p.idFieldName, p.printServiceUrl, mapConfigSignature, praticaCode, utenti])

  const previewCacheSignature = React.useMemo(() => {
    try {
      const includeNotaSpese = !!previewOptions.includeNotaSpese
      const includeMappa = !!previewOptions.includeMappa
      const includeAllegati = !!previewOptions.includeAllegati
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

  return (
    <div css={containerCss}>
      <GiiDocumentViewer
        url={pdfUrl}
        fileName={pdfFileName}
        title='Anteprima rapporto'
        subtitle={pdfFileName}
        loading={loading}
        error={error}
        emptyText='Nessun dato disponibile per l&apos;anteprima.'
        width={270}
        docOptions={docOptions}
        availability={availability}
        busy={loading}
        canUseMap={!!printMapView}
        mapPanelAvailable={!!printMapView}
        documentUnavailableExtra={{ includeAllegati: !!availability.loadingAllegati }}
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

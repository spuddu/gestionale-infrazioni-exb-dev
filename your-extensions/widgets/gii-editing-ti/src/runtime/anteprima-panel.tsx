/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, css } from 'jimu-core'
import { buildNotaSpesePdf, type NotaSpeseData } from '../../../_shared/gii-anteprime/documenti-tecnici/rapporto/notaspese-pdf-builder'
import { PDFDocument } from 'pdf-lib'
import AnteprimaPdfViewer from '../../../_shared/gii-anteprime/anteprima-pdf-viewer'
import { buildRapportoPdf, buildRapportoIterPlaceholders, loadRapportoIterCicliForPdf, type RapportoIterCicloPdf } from '../../../_shared/gii-anteprime/documenti-tecnici/rapporto/rapporto-pdf-builder'

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

const containerCss = css`display: flex; flex-direction: column; width: 100%; height: 100%; background: #282828; overflow: hidden;`

type NsCat = 'AT' | 'PR' | 'RU' | 'SL' | 'PF'
type NsSummaryP = { totaleAT: number; totalePR: number; totaleRU: number; totaleSL: number; totalePF: number; percentualeSpeseGenerali: number; importoSpeseGenerali: number; totaleComplessivo: number }
type NsRowP = { objectid: number; categoria_costo: NsCat; origine_voce_snapshot: string; codice_voce_snapshot: string; descrizione_snapshot: string; unita_misura_snapshot: string; prezzo_unitario_snapshot: number; quantita: number; importo_riga: number; anno_prezzario_snapshot?: number | null; ordine: number; note: string; codice_casistica?: string | null }

type DocumentPrintOptions = {
  includeRapporto: boolean
  includeNotaSpese: boolean
  includeMappa: boolean
  includeAllegati: boolean
  mapLayout: string
  mapScale: number
  mapTitle: string
  mapBasemap: string
  mapLayerVisibility: Record<string, boolean>
  mapTarget?: any
  mapSelectedOid?: number | null
  mapSelectedIdFieldName?: string
  mapLocalizationLayerUrl?: string
}

type DocumentAvailability = {
  loadingAllegati?: boolean
  notaSpese: boolean
  mappa: boolean
  allegati: boolean
  checkedKey: string
}

type PrintableMapLayerItem = {
  key: string
  title: string
  visible: boolean
  layer: any
  ancestors: any[]
}

type PrintableMapLayerNode = {
  key: string
  title: string
  visible: boolean
  layer: any
  children: PrintableMapLayerNode[]
  item?: PrintableMapLayerItem
}

const DEFAULT_PRINT_SERVICE_URL = 'https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task'

function defaultDocumentPrintOptions (): DocumentPrintOptions {
  return {
    includeRapporto: true,
    includeNotaSpese: true,
    includeMappa: false,
    includeAllegati: false,
    mapLayout: 'A4 Portrait',
    mapScale: 1000,
    mapTitle: '',
    mapBasemap: 'satellite',
    mapLayerVisibility: {}
  }
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

function collectLayerListOrder (collection: any): any[] {
  const items: any[] = []
  try { collection?.forEach?.((l: any) => items.push(l)) } catch {}
  return items.reverse()
}

function mapLayerKey (layer: any, idx: string): string {
  return String(layer?.id || layer?.uid || layer?.title || layer?.url || `layer_${idx}`).replace(/\s+/g, '_')
}

function listPrintableMapLayerTree (view: any): PrintableMapLayerNode[] {
  const seen = new Set<string>()
  const makeNode = (layer: any, idxPath: string, ancestors: any[], ancestorVisible: boolean): PrintableMapLayerNode | null => {
    if (!layer) return null
    const children: any[] = []
    children.push(...collectLayerListOrder(layer?.layers))
    children.push(...collectLayerListOrder(layer?.sublayers))
    const title = String(layer?.title || layer?.id || layer?.name || `Layer ${idxPath}`)
    const keyBase = mapLayerKey(layer, idxPath)
    const key = seen.has(keyBase) ? `${keyBase}_${idxPath}` : keyBase
    seen.add(key)
    const visible = ancestorVisible && layer?.visible !== false
    const childNodes = children
      .map((child, childIdx) => makeNode(child, `${idxPath}_${childIdx}`, [...ancestors, layer], visible))
      .filter(Boolean) as PrintableMapLayerNode[]
    const node: PrintableMapLayerNode = { key, title, visible, layer, children: childNodes }
    if (!childNodes.length) node.item = { key, title, visible, layer, ancestors }
    return node
  }
  const out: PrintableMapLayerNode[] = []
  try {
    collectLayerListOrder(view?.map?.layers).forEach((layer, idx) => {
      const node = makeNode(layer, String(idx), [], true)
      if (node) out.push(node)
    })
  } catch {}
  return out
}

function flattenPrintableMapLayerTree (nodes: PrintableMapLayerNode[]): PrintableMapLayerItem[] {
  const out: PrintableMapLayerItem[] = []
  const walk = (node: PrintableMapLayerNode) => {
    if (node.item) out.push(node.item)
    node.children.forEach(walk)
  }
  nodes.forEach(walk)
  return out
}

function listPrintableMapLayers (view: any): PrintableMapLayerItem[] {
  return flattenPrintableMapLayerTree(listPrintableMapLayerTree(view))
}

function collectPrintableMapLayerKeys (node: PrintableMapLayerNode): string[] {
  return flattenPrintableMapLayerTree([node]).map(item => item.key)
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

async function buildMapPrintPdfBlob (view: any, printServiceUrl: string, opts: DocumentPrintOptions): Promise<{ blob: Blob; fileName: string }> {
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

  const layers = listPrintableMapLayers(view)
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
        try { await view.whenLayerView?.(view.map.basemap?.baseLayers?.getItemAt?.(0)) } catch {}
        try { view.requestRender?.() } catch {}
      } catch {
        try { view.map.basemap = String(opts.mapBasemap) } catch {}
      }
    }
    const requestedScale = Number(opts.mapScale)
    if (typeof view.goTo === 'function') {
      if (opts.mapTarget) {
        try { await view.goTo({ target: opts.mapTarget, scale: Number.isFinite(requestedScale) && requestedScale > 0 ? requestedScale : undefined }, { animate: false }) } catch {}
      } else if (Number.isFinite(requestedScale) && requestedScale > 0) {
        try { await view.goTo({ scale: requestedScale }, { animate: false }) } catch {}
      }
    }
    if (localizationRequested && opts.mapTarget && Graphic && Point && SimpleMarkerSymbol && view?.graphics) {
      try {
        const geometry = mapPrintPointGeometry(opts.mapTarget, Point)
        if (geometry) {
          const symbol = new SimpleMarkerSymbol({
            style: 'circle',
            color: [220, 38, 38, 220],
            size: 18,
            outline: { color: [255, 255, 255, 255], width: 2.5 }
          })
          printMarker = new Graphic({ geometry, symbol, attributes: { source: 'gii-editing-print-marker' } })
          view.graphics.add(printMarker)
          try { view.requestRender?.() } catch {}
          await delay(120)
        }
      } catch {}
    }

    const template = new PrintTemplate({
      format: 'pdf',
      layout: opts.mapLayout || 'A4 Portrait',
      layoutOptions: {
        titleText: opts.mapTitle || 'Allegato cartografico al rapporto tecnico',
        authorText: 'Consorzio di Bonifica della Sardegna Meridionale',
        copyrightText: ''
      },
      exportOptions: { dpi: 150 },
      scalePreserved: true,
      outScale: Number(opts.mapScale) || Number(view?.scale) || undefined
    })
    const params = new PrintParameters({ view, template })
    const result = await print.execute(serviceUrl, params)
    const url = String(result?.url || result?.href || '')
    if (!url) throw new Error('Il servizio stampa non ha restituito un PDF.')
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`Download stampa mappa fallito (HTTP ${resp.status}).`)
    return { blob: await resp.blob(), fileName: 'mappa_rapporto.pdf' }
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

async function buildPracticeAttachmentsPdfBlob (ds: any, oid: number): Promise<{ blob: Blob; fileName: string } | null> {
  const layer = await resolveFeatureLayerForAttachments(ds)
  if (!layer) throw new Error('FeatureLayer allegati non disponibile.')
  const infos = await queryFeatureAttachments(layer, oid, ds)
  if (!infos.length) return null

  const out = await PDFDocument.create()
  let count = 0
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
        const pages = await out.copyPages(src, src.getPageIndices())
        pages.forEach(pg => out.addPage(pg))
        count++
      } else if (contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)$/i.test(name)) {
        const img = await out.embedJpg(bytes as any)
        const page = out.addPage([595.28, 841.89])
        const maxW = 515.28
        const maxH = 761.89
        const scale = Math.min(maxW / img.width, maxH / img.height)
        const w = img.width * scale
        const h = img.height * scale
        page.drawImage(img, { x: (595.28 - w) / 2, y: (841.89 - h) / 2, width: w, height: h })
        count++
      } else if (contentType.includes('png') || /\.png$/i.test(name)) {
        const img = await out.embedPng(bytes as any)
        const page = out.addPage([595.28, 841.89])
        const maxW = 515.28
        const maxH = 761.89
        const scale = Math.min(maxW / img.width, maxH / img.height)
        const w = img.width * scale
        const h = img.height * scale
        page.drawImage(img, { x: (595.28 - w) / 2, y: (841.89 - h) / 2, width: w, height: h })
        count++
      }
    } catch {
      // Allegato non impaginabile: lo si ignora nel PDF unico.
    }
  }
  if (count === 0) return null
  const bytes = await out.save()
  return { blob: new Blob([bytes as any], { type: 'application/pdf' }), fileName: 'allegati_probatori.pdf' }
}

async function buildRapportoDocumentsPdfBlob (
  dataSnapshot: Record<string, any>,
  utenti: Map<string, UtenteCached> | null,
  nsRows: Record<NsCat, NsRowP[]> | undefined,
  nsSummary: NsSummaryP | undefined,
  docOptions: Pick<DocumentPrintOptions, 'includeRapporto' | 'includeNotaSpese'>
): Promise<{ blob: Blob; fileName: string }> {
  const iterGlobalId = pickAttrCI(dataSnapshot, ['globalid', 'GlobalID', 'GLOBALID', 'parent_globalid'])
  const iterCicli = await loadRapportoIterCicliForPdf(iterGlobalId)
  const map = buildPlaceholderMap(dataSnapshot, utenti, iterCicli)
  const nsGroups = buildNotaSpeseGroups(nsRows, nsSummary)
  const art30Summary = buildArt30RapportoSummary(dataSnapshot)
  const reportNsGroups = nsGroups.slice()
  if (art30Summary.hasData && !reportNsGroups.some(group => group.codiceCasistica === 'C104_ATTREZZATURE_DANNEGGIATE')) {
    reportNsGroups.push({
      codiceCasistica: 'C104_ATTREZZATURE_DANNEGGIATE',
      label: NS_CASISTICA_META.C104_ATTREZZATURE_DANNEGGIATE.label,
      rows: cloneEmptyNsRows(),
      summary: buildNsSummaryForRows(cloneEmptyNsRows(), Number(nsSummary?.percentualeSpeseGenerali) || 15)
    })
    reportNsGroups.sort((a, b) => (NS_CASISTICA_META[a.codiceCasistica]?.order ?? 999) - (NS_CASISTICA_META[b.codiceCasistica]?.order ?? 999))
  }
  const totaleNoteSpeseDaGruppi = roundMoney(nsGroups.reduce((sum, group) => sum + roundMoney(Number(group?.summary?.totaleComplessivo) || 0), 0))
  const totaleNoteSpeseSalvato = roundMoney(parseArt30Number(pickAttrCI(dataSnapshot, ['ns_totale_complessivo'])) ?? 0)
  const totaleNoteSpese = nsGroups.length > 0 ? totaleNoteSpeseDaGruppi : totaleNoteSpeseSalvato
  const hasRimborso = nsGroups.length > 0 || totaleNoteSpese !== 0 || art30Summary.hasData
  const totaleRimborso = roundMoney(totaleNoteSpese + (art30Summary.hasData ? art30Summary.netto : 0))

  map.importo_rimborso = hasRimborso ? moneyIt(totaleRimborso) : ''
  map.riepilogo_art30 = art30Summary.text
  map.nota_spese_label = reportNsGroups.length > 1
    ? '(Vedi note spese allegate)'
    : (reportNsGroups.length === 1 ? '(Vedi nota spese allegata)' : '')

  const includeRapporto = docOptions.includeRapporto !== false
  const includeNotaSpese = docOptions.includeNotaSpese !== false
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
  const [technicalMapView, setTechnicalMapView] = React.useState<any | null>(null)
  const [availability, setAvailability] = React.useState<DocumentAvailability>({
    notaSpese: false,
    mappa: false,
    allegati: false,
    checkedKey: ''
  })
  const printMapView = technicalMapView || null
  const printableLayerTree = React.useMemo(() => listPrintableMapLayerTree(printMapView), [printMapView])
  const [expandedLayerGroups, setExpandedLayerGroups] = React.useState<Record<string, boolean>>({})
  const [docOptions, setDocOptions] = React.useState<DocumentPrintOptions>(() => defaultDocumentPrintOptions())
  const [previewOptions, setPreviewOptions] = React.useState<DocumentPrintOptions>(() => defaultDocumentPrintOptions())
  const [previewRevision, setPreviewRevision] = React.useState(0)

  const dataSignature = React.useMemo(() => {
    try { return JSON.stringify(p.data || {}) } catch { return String(p.data || '') }
  }, [p.data])

  const nsSignature = React.useMemo(() => {
    try { return JSON.stringify({ r: p.nsRows || {}, s: p.nsSummary || {} }) } catch { return '' }
  }, [p.nsRows, p.nsSummary])

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

  React.useEffect(() => {
    const sourceView = p.mapView
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
        if (sourceMap) {
          try {
            map = typeof sourceMap.clone === 'function'
              ? sourceMap.clone()
              : new Map({ basemap: sourceMap?.basemap?.clone ? sourceMap.basemap.clone() : (sourceMap?.basemap || 'satellite') })
          } catch {
            map = new Map({ basemap: 'satellite' })
          }
        } else if (WebMap && String(cfg.webMapItemId || '').trim()) {
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
        } else {
          map = new Map({ basemap: 'satellite' })
        }
        if (map && map !== sourceMap && !map.layers?.length && sourceMap?.layers) {
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
  }, [p.mapView, mapConfigSignature, mapTargetSignature])

  React.useEffect(() => {
    const layerVisibility: Record<string, boolean> = {}
    listPrintableMapLayers(printMapView).forEach(item => { layerVisibility[item.key] = item.visible })
    const title = `Allegato cartografico - Rilevazione ${praticaCode || ''}`.trim()
    setDocOptions(prev => ({
      ...prev,
      includeNotaSpese: hasNotaSpeseLocal ? prev.includeNotaSpese : false,
      mapTitle: prev.mapTitle || title,
      mapBasemap: prev.mapBasemap || 'satellite',
      mapLayerVisibility: Object.keys(layerVisibility).length ? layerVisibility : prev.mapLayerVisibility
    }))
  }, [hasNotaSpeseLocal, printMapView, praticaCode])

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
    if (!hasNotaSpeseLocal) setDocOptions(prev => ({ ...prev, includeNotaSpese: false }))
    if (!targetAvailable || !viewAvailable) setDocOptions(prev => ({ ...prev, includeMappa: false }))
    if (!p.ds || !p.oid) {
      setDocOptions(prev => ({ ...prev, includeAllegati: false }))
      return
    }
    let cancelled = false
    void hasAttachments(p.ds, Number(p.oid)).then(allegati => {
      if (cancelled) return
      setAvailability(prev => prev.checkedKey === checkedKey ? { ...prev, loadingAllegati: false, allegati } : prev)
      if (!allegati) setDocOptions(prev => ({ ...prev, includeAllegati: false }))
    }).catch(() => {
      if (cancelled) return
      setAvailability(prev => prev.checkedKey === checkedKey ? { ...prev, loadingAllegati: false, allegati: false } : prev)
      setDocOptions(prev => ({ ...prev, includeAllegati: false }))
    })
    return () => { cancelled = true }
  }, [p.ds, p.oid, hasNotaSpeseLocal, mapTargetSignature, printMapView])

  const updateDocOption = React.useCallback((patch: Partial<DocumentPrintOptions>) => {
    setDocOptions(prev => ({ ...prev, ...patch }))
  }, [])

  const setMapLayerKeysVisible = React.useCallback((keys: string[], visible: boolean) => {
    setDocOptions(prev => {
      const nextVisibility = { ...(prev.mapLayerVisibility || {}) }
      keys.forEach(key => { nextVisibility[key] = visible })
      return { ...prev, mapLayerVisibility: nextVisibility }
    })
  }, [])

  const renderPrintableLayerNode = React.useCallback((node: PrintableMapLayerNode, depth = 0): any => {
    const leafKeys = collectPrintableMapLayerKeys(node)
    const checkedCount = leafKeys.filter(key => docOptions.mapLayerVisibility[key] !== false).length
    const checked = leafKeys.length > 0 && checkedCount === leafKeys.length
    const partial = checkedCount > 0 && checkedCount < leafKeys.length
    const hasChildren = node.children.length > 0
    const expanded = !!expandedLayerGroups[node.key]
    const row = (
      <div key={node.key} style={{ display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) 18px', alignItems: 'center', gap: 8, minHeight: 24, paddingLeft: depth * 18, fontSize: 13, color: '#334155', fontWeight: hasChildren ? 800 : 600 }}>
        {hasChildren ? (
          <button
            type='button'
            onClick={() => setExpandedLayerGroups(prev => ({ ...prev, [node.key]: !prev[node.key] }))}
            aria-label={expanded ? 'Comprimi gruppo layer' : 'Espandi gruppo layer'}
            style={{ border: 0, background: 'transparent', padding: 0, width: 16, height: 20, lineHeight: '20px', cursor: 'pointer', color: '#334155', fontSize: 12 }}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span style={{ width: 16, height: 20 }} />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</span>
        <input
          type='checkbox'
          checked={checked}
          disabled={loading || leafKeys.length === 0}
          ref={(el) => { if (el) el.indeterminate = partial }}
          onClick={e => { e.stopPropagation() }}
          onChange={e => setMapLayerKeysVisible(leafKeys, e.target.checked)}
        />
      </div>
    )
    if (!hasChildren) return row
    return (
      <div key={node.key} style={{ display: 'grid', gap: 4 }}>
        {row}
        {expanded && (
          <div style={{ display: 'grid', gap: 4 }}>
            {node.children.map(child => renderPrintableLayerNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }, [docOptions.mapLayerVisibility, expandedLayerGroups, loading, setMapLayerKeysVisible])

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
    if (includeRapporto || includeNotaSpese) {
      items.push(await buildRapportoDocumentsPdfBlob(dataSnapshot, utenti, p.nsRows, p.nsSummary, {
        includeRapporto,
        includeNotaSpese
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
      }))
    }
    if (opts.includeAllegati && p.ds && p.oid) {
      const attPdf = await buildPracticeAttachmentsPdfBlob(p.ds, Number(p.oid))
      if (attPdf) items.push(attPdf)
    }
    if (items.length === 0) throw new Error('Selezionare almeno un documento.')
    if (items.length === 1) return items[0]
    const safeCode = String(praticaCode || 'documenti').replace(/[^a-zA-Z0-9_-]/g, '_')
    return { blob: await mergePdfBlobs(items), fileName: `documenti_${safeCode}.pdf` }
  }, [previewOptions, hasNotaSpeseLocal, mapTarget, p.data, p.ds, printMapView, p.nsRows, p.nsSummary, p.oid, p.idFieldName, p.printServiceUrl, mapConfigSignature, praticaCode, utenti])

  const regeneratePreview = React.useCallback(() => {
    if (!p.data || Object.keys(p.data).length === 0) {
      setPdfUrl(null)
      setPdfFileName('rapporto.pdf')
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
        const url = makePdfUrl(blob, fileName)
        setPdfFileName(fileName)
        setPdfUrl(prev => { revokePdfUrl(prev); return url })
      } catch (ex: any) { if (!cancelled) setError('Errore: ' + (ex?.message || String(ex))) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [buildSelectedDocumentsPdf, p.data, utentiReady])

  React.useEffect(() => {
    return regeneratePreview()
  }, [regeneratePreview, dataSignature, p.mode, utenti, utentiReady, nsSignature, mapTargetSignature, previewRevision])

  const pendingOptionsSignature = React.useMemo(() => {
    try { return JSON.stringify(docOptions || {}) } catch { return '' }
  }, [docOptions])

  const appliedOptionsSignature = React.useMemo(() => {
    try { return JSON.stringify(previewOptions || {}) } catch { return '' }
  }, [previewOptions])

  const hasPendingDocumentOptions = pendingOptionsSignature !== appliedOptionsSignature

  const applyDocumentOptionsAndRegenerate = React.useCallback(() => {
    setPreviewOptions({ ...docOptions, mapLayerVisibility: { ...(docOptions.mapLayerVisibility || {}) } })
    setPreviewRevision(v => v + 1)
  }, [docOptions])

  const renderDocCheckbox = (key: keyof Pick<DocumentPrintOptions, 'includeRapporto' | 'includeNotaSpese' | 'includeMappa' | 'includeAllegati'>, label: string) => {
    const unavailable = (
      key === 'includeNotaSpese' ? !availability.notaSpese :
      key === 'includeMappa' ? (!availability.mappa || !printMapView) :
      key === 'includeAllegati' ? (!!availability.loadingAllegati || !availability.allegati) :
      false
    )
    const disabled = loading || unavailable
    const labelText = key === 'includeRapporto' ? label : `${label}${unavailable ? ' (n.d.)' : ''}`
    return (
      <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 24, fontSize: 13, color: disabled ? '#94a3b8' : '#334155', fontWeight: 800, whiteSpace: 'nowrap' }}>
        <input
          type='checkbox'
          checked={!!(docOptions as any)[key]}
          disabled={disabled}
          onChange={e => updateDocOption({ [key]: e.target.checked } as any)}
        />
        <span>{labelText}</span>
      </label>
    )
  }

  return (
    <div css={containerCss}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0 }}>
          <AnteprimaPdfViewer
            url={pdfUrl}
            fileName={pdfFileName}
            title='Anteprima rapporto'
            subtitle={pdfFileName}
            loading={loading}
            error={error}
            emptyText='Nessun dato disponibile per l&apos;anteprima.'
          />
        </div>
        <aside style={{ flex: '0 0 270px', width: 270, minHeight: 0, overflow: 'auto', padding: 10, background: '#eef4fb', borderLeft: '1px solid #dbe4ef', color: '#0f172a', display: 'grid', alignContent: 'start', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>Documenti</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {renderDocCheckbox('includeRapporto', 'Rapporto tecnico')}
            {renderDocCheckbox('includeNotaSpese', 'Nota spese')}
            {renderDocCheckbox('includeMappa', 'Mappa')}
            {renderDocCheckbox('includeAllegati', 'Allegati')}
          </div>

          {docOptions.includeMappa && printMapView && (
            <div style={{ display: 'grid', gap: 9, paddingTop: 8, borderTop: '1px solid #dbe4ef' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>Stampa mappa</div>
              <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 800, color: '#334155' }}>
                Titolo
                <input type='text' value={docOptions.mapTitle} onChange={e => updateDocOption({ mapTitle: e.target.value })} style={{ padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 800, color: '#334155' }}>
                Layout
                <select value={docOptions.mapLayout} onChange={e => updateDocOption({ mapLayout: e.target.value })} style={{ padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                  <option value='A4 Portrait'>A4 Portrait</option>
                  <option value='A4 Landscape'>A4 Landscape</option>
                  <option value='A3 Portrait'>A3 Portrait</option>
                  <option value='A3 Landscape'>A3 Landscape</option>
                  <option value='MAP_ONLY'>MAP_ONLY</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 800, color: '#334155' }}>
                Mappa base
                <select value={docOptions.mapBasemap} onChange={e => updateDocOption({ mapBasemap: e.target.value })} style={{ padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                  <option value='satellite'>Ortofoto</option>
                  <option value='hybrid'>Ortofoto con etichette</option>
                  <option value='topo-vector'>Topografica</option>
                  <option value='streets-vector'>Stradale</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 800, color: '#334155' }}>
                Scala
                <input type='number' min={100} step={100} value={docOptions.mapScale} onChange={e => updateDocOption({ mapScale: Number(e.target.value) || 1000 })} style={{ padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <div style={{ display: 'grid', gap: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#334155' }}>Layer da stampare</div>
                {printableLayerTree.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.35 }}>{printMapView ? 'La mappa è agganciata, ma non espone layer stampabili leggibili.' : 'Mappa in preparazione.'}</div>
                ) : (
                  <div style={{ display: 'grid', gap: 5, maxHeight: 220, overflow: 'auto', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                    {printableLayerTree.map(node => renderPrintableLayerNode(node))}
                  </div>
                )}
              </div>
            </div>
          )}
          <button
            type='button'
            disabled={loading}
            onClick={applyDocumentOptionsAndRegenerate}
            style={{
              width: '100%',
              minHeight: 34,
              border: '1px solid #1d4ed8',
              borderRadius: 8,
              background: loading ? '#93c5fd' : '#2563eb',
              color: '#fff',
              fontSize: 13,
              fontWeight: 900,
              cursor: loading ? 'default' : 'pointer'
            }}
          >
            {loading ? 'Rigenerazione...' : 'Rigenera documento'}
          </button>
          {hasPendingDocumentOptions && !loading && (
            <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.35, fontWeight: 700 }}>
              Modifiche non ancora applicate all&apos;anteprima.
            </div>
          )}
        </aside>
      </div>
      <div
        ref={technicalMapContainerRef}
        aria-hidden='true'
        style={{ position: 'fixed', left: -10000, top: -10000, width: 900, height: 700, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}

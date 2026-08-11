// =================================================================
// rapporto-placeholder-map.ts
// Mappa dati condivisa per il documento "Rapporto tecnico di rilevazione".
// È la sorgente comune usata dal viewer/fascicolo condiviso per costruire
// i placeholder del PDF del rapporto.
// =================================================================
import { buildRapportoIterPlaceholders, normalizeAreaCode, normalizeSettoreCode, type RapportoIterCicloPdf } from './rapporto-pdf-builder'

export type UtenteCached = {
  full_name: string
  ruolo: number | null
  area: number | null
  settore: number | null
  ruolo_cod?: string
  area_cod?: string
  settore_cod?: string
  ruoloCod?: string
  areaCod?: string
  settoreCod?: string
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

export function buildPlaceholderMap (data: any, utentiCache: Map<string, UtenteCached> | null, cicli: RapportoIterCicloPdf[] = []): Record<string, string> {
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

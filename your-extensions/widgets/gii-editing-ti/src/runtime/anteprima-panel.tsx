/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, css } from 'jimu-core'
import { buildRapportoPdf } from '../../../_shared/gii-anteprime/rapporto/rapporto-pdf-builder'
import { buildNotaSpesePdf, type NotaSpeseData } from '../../../_shared/gii-anteprime/rapporto/notaspese-pdf-builder'
import { PDFDocument } from 'pdf-lib'
import RapportoPdfViewer from '../../../_shared/gii-anteprime/rapporto/rapporto-pdf-viewer'

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

const AREA_NUM: Record<string, number> = { AMM: 1, AGR: 2, TEC: 3 }
const SETTORE_NUM: Record<string, number> = { CR: 1, GI: 2, D1: 3, D2: 4, D3: 5, D4: 6, D5: 7, D6: 8, DS: 9, CS: 9 }
const AREA_LABELS: Record<string, string> = {
  AGR: 'AGRARIA', TEC: 'TECNICA', AMM: 'AFFARI GENERALI E PROGRAMMAZIONE FINANZIARIA'
}
const SETTORE_LABELS: Record<string, string> = {
  D1: 'DISTRETTO 1 \u2013 SAN SPERATE',
  D2: 'DISTRETTO 2 \u2013 SERRAMANNA/PIMPISU',
  D3: 'DISTRETTO 3 \u2013 SAN GAVINO/VILLACIDRO',
  D4: 'DISTRETTO 4 \u2013 BASSO SULCIS',
  D5: 'DISTRETTO 5 \u2013 SENORB\u00CC',
  D6: 'DISTRETTO 6 \u2013 CIXERRI',
  DS: 'MANUTENZIONE OPERE DI DRENO E DI SCOLO',
  CR: 'CATASTO, RUOLI E SERVIZI TERRITORIALI',
  GI: 'GESTIONE IRRIGUA'
}

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

function findUserFullName (cache: Map<string, UtenteCached> | null, ruoloNum: number, areaNum?: number, settoreNum?: number): string {
  if (!cache) return ''
  const targetRole = normalizeRoleCode(ruoloNum)
  const targetArea = areaNum != null ? normalizeAreaCode(areaNum) : ''
  const targetSettore = settoreNum != null ? normalizeSettoreCode(targetArea, settoreNum) : ''
  for (const [, entry] of cache) {
    const entryRole = entry.ruolo_cod || normalizeRoleCode(entry.ruolo)
    const entryArea = entry.area_cod || normalizeAreaCode(entry.area)
    const entrySettore = entry.settore_cod || normalizeSettoreCode(entryArea, entry.settore)
    if (targetRole && entryRole !== targetRole) continue
    if (!targetRole && entry.ruolo !== ruoloNum) continue
    if (targetArea && entryArea !== targetArea) continue
    if (!targetArea && areaNum != null && entry.area !== areaNum) continue
    if (targetSettore && entrySettore !== targetSettore) continue
    if (!targetSettore && settoreNum != null && entry.settore !== settoreNum) continue
    return entry.full_name || ''
  }
  return ''
}

function findFullNameByUsername (cache: Map<string, UtenteCached> | null, username: string): string {
  if (!cache || !username) return username || ''
  for (const [k, v] of cache) { if (k.toLowerCase() === String(username).trim().toLowerCase()) return v.full_name || username }
  return username
}

function formatDateIt (v: any): string {
  if (!v) return ''
  try { const d = new Date(typeof v === 'number' ? v : String(v)); if (isNaN(d.getTime())) return String(v); return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return String(v) }
}
function formatTimeIt (v: any): string {
  if (!v) return ''
  try { const d = new Date(typeof v === 'number' ? v : String(v)); if (isNaN(d.getTime())) return ''; return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
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

function buildPlaceholderMap (data: any, utentiCache: Map<string, UtenteCached> | null): Record<string, string> {
  const d = data || {}
  const areaCod = normalizeAreaCode(firstMeaningfulValue(d.area_cod, d.area))
  const settoreCod = normalizeSettoreCode(areaCod, firstMeaningfulValue(d.settore_cod, d.settore))
  const isPF = String(d.tipologia_soggetto || '').toUpperCase() === 'PF'
  const areaN = AREA_NUM[areaCod] ?? null
  const settoreN = SETTORE_NUM[settoreCod] ?? null
  const artChecked = (field: string): boolean => { const v = d[field]; return v === 1 || v === '1' || v === true }
  const art15on = !!(d.norma15_parziale || d.norma15_totale)
  const art16on = String(d.norma16_17 || '').toLowerCase().includes('art16')
  const art17on = String(d.norma16_17 || '').toLowerCase().includes('art17') || !!d.art17_tipo
  const xMark = (on: boolean) => on ? 'x' : ''
  const surfVal = (on: boolean, ...fields: string[]) => { if (!on) return ''; for (const f of fields) { const v = d[f]; if (v != null && v !== '' && v !== 0) return fmtNum(v) } return '' }
  const gradiViolazioni = parseGradiViolazioniForRapporto(d.gradi_violazioni)
  const occorrenzaArt15 = occorrenzaArt15ForRapporto(d.occorrenza, art15on)
  const origPratica = d.origine_pratica ?? d.Origine_pratica
  const praticaPrefix = (origPratica === 2 || origPratica === '2') ? 'TI' : 'TR'
  const oidVal = d.OBJECTID ?? d.objectid ?? ''
  const codPratica = oidVal ? `${praticaPrefix}-${oidVal}` : ''

  return {
    cod_pratica: codPratica, anno: d.data_rilevazione ? String(new Date(d.data_rilevazione).getFullYear()) : '', area_cod: areaCod,
    area_label: AREA_LABELS[areaCod] || areaCod, settore_label: SETTORE_LABELS[settoreCod] || settoreCod,
    tecnico_rilevatore: esc(d.tecnico_rilevatore || ''), data_rilevazione: formatDateIt(d.data_rilevazione), ora_rilevazione: formatTimeIt(d.data_rilevazione),
    x_art08: xMark(artChecked('v_art08')), x_art12: xMark(artChecked('v_art12')), x_art15: xMark(art15on), x_art16: xMark(art16on), x_art17: xMark(art17on),
    x_art27: xMark(artChecked('v_art27')), x_art28: xMark(artChecked('v_art28')), x_art29: xMark(artChecked('v_art29')), x_art30: xMark(artChecked('v_art30')),
    x_art31: xMark(artChecked('v_art31')), x_art32: xMark(artChecked('v_art32')), x_art33: xMark(artChecked('v_art33')), x_art34: xMark(artChecked('v_art34')),
    x_art35: xMark(artChecked('v_art35')), x_art36: xMark(artChecked('v_art36')), x_art37: xMark(artChecked('v_art37')), x_art39: xMark(artChecked('v_art39')),
    sup_dich_art08: surfVal(artChecked('v_art08'), 'sup_dichiarata_art08'), sup_irr_art08: surfVal(artChecked('v_art08'), 'sup_irrigata_art08'),
    sup_dich_art12: surfVal(artChecked('v_art12'), 'sup_dichiarata_art12'), sup_irr_art12: surfVal(artChecked('v_art12'), 'sup_irrigata_art12'),
    sup_dich_art15: surfVal(art15on, 'sup_dichiarata_art15'), sup_irr_art15: surfVal(art15on, 'sup_irrigata_art15'),
    sup_dich_art16: surfVal(art16on, 'sup_dichiarata_art16'), sup_irr_art16: surfVal(art16on, 'sup_irrigata_art16_17_2'),
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
    recidiva_art08: '', recidiva_art12: '',
    recidiva_art15: occorrenzaArt15, recidiva_art16: '', recidiva_art17: '',
    recidiva_art27: '', recidiva_art28: '',
    recidiva_art29: '', recidiva_art30: '',
    recidiva_art31: '', recidiva_art32: '',
    recidiva_art33: '', recidiva_art34: '',
    recidiva_art35: '', recidiva_art36: '',
    recidiva_art37: '', recidiva_art39: '',
    descrizione_fatti: esc(d.descrizione_fatti || ''), circostanze: esc(d.circostanze || ''), descrizione_luogo: esc(d.descrizione_luogo || ''),
    tipo_soggetto: isPF ? 'PF' : 'PG',
    denominazione: isPF ? esc(`${d.nome || ''} ${d.cognome || ''}`.trim()) : esc(d.ragione_sociale || ''),
    cf_piva: isPF ? esc(d.codice_fiscale || '') : esc(d.piva || ''),
    via: esc(d.via || ''), civico: esc(d.civico || ''), cap: esc(d.cap || ''), localita: esc(d.localita || ''), citta: esc(d.citta || ''),
    telefono: esc(d.telefono || ''), cellulare: esc(d.cellulare || ''), email: esc(d.email || ''), pec: esc(d.pec || ''),
    presenza_trasgressore: String(d.presenza_trasgressore || '').toLowerCase() === 'si' || String(d.presenza_trasgressore || '').toLowerCase() === 'sì' || String(d.presenza_trasgressore || '') === '1' ? 'S\u00EC' : (String(d.presenza_trasgressore || '').toLowerCase() === 'no' || String(d.presenza_trasgressore || '') === '0' ? 'No' : String(d.presenza_trasgressore || '')),
    firma_tr: esc(findFullNameByUsername(utentiCache, d.tecnico_rilevatore || d.utente_loggato || d.Creator || '')),
    firma_ti: esc(d.ti_assegnato_nome || findFullNameByUsername(utentiCache, d.ti_assegnato_username || '') || findFullNameByUsername(utentiCache, d.tecnico_rilevatore || '')),
    firma_rz: esc(findUserFullName(utentiCache, 3, areaN ?? undefined, settoreN ?? undefined)),
    firma_ri: esc(findUserFullName(utentiCache, 4, areaN ?? undefined)),
    firma_dt: esc(findUserFullName(utentiCache, 5, areaN ?? undefined)),
    idrante: esc(d.idrante || ''), comune: '', foglio: '', mappali: '', altro_luogo: '',
    distretto_irriguo: esc(d.distretto_irriguo || ''), comizio: esc(d.comizio || ''),
    matricola_contatore: esc(d.matricola_contatore || ''), matricola_tessera: esc(d.matricola_tessera || ''),
    importo_rimborso: fmtNum(d.ns_totale_complessivo) ? fmtNum(d.ns_totale_complessivo) + ' €' : '',
    data_compilazione: formatDateIt(d.data_firma)
  }
}

const containerCss = css`display: flex; flex-direction: column; width: 100%; height: 100%; background: #282828; overflow: hidden;`

type NsCat = 'AT' | 'PR' | 'RU' | 'SL' | 'PF'
type NsSummaryP = { totaleAT: number; totalePR: number; totaleRU: number; totaleSL: number; totalePF: number; percentualeSpeseGenerali: number; importoSpeseGenerali: number; totaleComplessivo: number }
type NsRowP = { objectid: number; categoria_costo: NsCat; origine_voce_snapshot: string; codice_voce_snapshot: string; descrizione_snapshot: string; unita_misura_snapshot: string; prezzo_unitario_snapshot: number; quantita: number; importo_riga: number; anno_prezzario_snapshot?: number | null; ordine: number; note: string }

export default function AnteprimaPanel (p: { data: Record<string, any>; mode: 'create' | 'edit'; nsRows?: Record<NsCat, NsRowP[]>; nsSummary?: NsSummaryP }): any {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null)
  const [pdfFileName, setPdfFileName] = React.useState<string>('rapporto.pdf')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [utenti, setUtenti] = React.useState<Map<string, UtenteCached> | null>(null)
  const [utentiReady, setUtentiReady] = React.useState(false)

  const dataSignature = React.useMemo(() => {
    try { return JSON.stringify(p.data || {}) } catch { return String(p.data || '') }
  }, [p.data])

  const nsSignature = React.useMemo(() => {
    try { return JSON.stringify({ r: p.nsRows || {}, s: p.nsSummary || {} }) } catch { return '' }
  }, [p.nsRows, p.nsSummary])

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

  React.useEffect(() => { return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) } }, [pdfUrl])

  React.useEffect(() => {
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
    const dataSnapshot = { ...(p.data || {}) }

    setLoading(true); setError(null)
    ;(async () => {
      try {
        const map = buildPlaceholderMap(dataSnapshot, utenti)
        const rapportoBytes = await buildRapportoPdf(map)
        if (cancelled) return

        // Se ci sono righe nota spese, genera e accoda al rapporto
        let finalBytes: Uint8Array = rapportoBytes
        const hasNs = p.nsRows && Object.values(p.nsRows).some(arr => arr && arr.length > 0)
        if (hasNs && p.nsSummary) {
          const nsData: NotaSpeseData = {
            cod_pratica: map.cod_pratica || '',
            area_label: map.area_label || '',
            settore_label: map.settore_label || '',
            rows: p.nsRows as any,
            summary: p.nsSummary,
            luogo_data: 'Cagliari, ' + (formatDateIt(dataSnapshot.data_firma) || new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })),
            firma_nome: map.firma_ti || ''
          }
          const nsBytes = await buildNotaSpesePdf(nsData)
          const merged = await PDFDocument.create()
          const rapDoc = await PDFDocument.load(rapportoBytes)
          const nsDoc = await PDFDocument.load(nsBytes)
          const rapPages = await merged.copyPages(rapDoc, rapDoc.getPageIndices())
          rapPages.forEach(pg => merged.addPage(pg))
          const nsPages = await merged.copyPages(nsDoc, nsDoc.getPageIndices())
          nsPages.forEach(pg => merged.addPage(pg))
          finalBytes = await merged.save()
        }

        const cp = map.cod_pratica || 'rapporto'
        const fileName = `rapporto_${cp.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
        const blob = new Blob([finalBytes as any], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfFileName(fileName)
        setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
      } catch (ex: any) { if (!cancelled) setError('Errore: ' + (ex?.message || String(ex))) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [dataSignature, p.mode, utenti, utentiReady, nsSignature])

  return (
    <div css={containerCss}>
      <RapportoPdfViewer
        url={pdfUrl}
        fileName={pdfFileName}
        title='Anteprima rapporto'
        subtitle={pdfFileName}
        loading={loading}
        error={error}
        emptyText='Nessun dato disponibile per l&apos;anteprima.'
      />
    </div>
  )
}

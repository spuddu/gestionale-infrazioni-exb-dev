/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, css } from 'jimu-core'
import { Loading } from 'jimu-ui'
import { buildRapportoPdf } from './rapporto-pdf-builder'

const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'
type UtenteCached = { full_name: string; ruolo: number | null; area: number | null; settore: number | null }

const AREA_NUM: Record<string, number> = { AMM: 1, AGR: 2, TEC: 3 }
const SETTORE_NUM: Record<string, number> = { CR: 1, GI: 2, D1: 3, D2: 4, D3: 5, D4: 6, D5: 7, D6: 8, CS: 9 }
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
  CR: 'CATASTO, RUOLI E SERVIZI TERRITORIALI'
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
    const res = await fl.queryFeatures({ where: '1=1', outFields: ['username', 'full_name', 'ruolo', 'area', 'settore'], returnGeometry: false })
    const map = new Map<string, UtenteCached>()
    for (const f of (res.features || [])) {
      const a = f.attributes || {}
      const uname = String(a.username || '').trim()
      if (!uname) continue
      map.set(uname, { full_name: a.full_name || uname, ruolo: a.ruolo != null ? Number(a.ruolo) : null, area: a.area != null ? Number(a.area) : null, settore: a.settore != null ? Number(a.settore) : null })
    }
    _utentiCache = map
    return map
  } catch (ex) { console.warn('[AnteprimaPanel] Errore caricamento GII_utenti:', ex); return null }
  finally { _utentiLoading = false }
}

function findUserFullName (cache: Map<string, UtenteCached> | null, ruoloNum: number, areaNum?: number, settoreNum?: number): string {
  if (!cache) return ''
  for (const [, entry] of cache) {
    if (entry.ruolo !== ruoloNum) continue
    if (areaNum != null && entry.area !== areaNum) continue
    if (settoreNum != null && entry.settore !== settoreNum) continue
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

function buildPlaceholderMap (data: any, utentiCache: Map<string, UtenteCached> | null): Record<string, string> {
  const d = data || {}
  const areaCod = String(d.area_cod || '').toUpperCase()
  const settoreCod = String(d.settore_cod || '').toUpperCase()
  const isPF = String(d.tipologia_soggetto || '').toUpperCase() === 'PF'
  const areaN = AREA_NUM[areaCod] ?? null
  const settoreN = SETTORE_NUM[settoreCod] ?? null
  const artChecked = (field: string): boolean => { const v = d[field]; return v === 1 || v === '1' || v === true }
  const art15on = !!(d.norma15_parziale || d.norma15_totale)
  const art16on = String(d.norma16_17 || '').toLowerCase().includes('art16')
  const art17on = String(d.norma16_17 || '').toLowerCase().includes('art17') || !!d.art17_tipo
  const xMark = (on: boolean) => on ? 'x' : ''
  const surfVal = (on: boolean, ...fields: string[]) => { if (!on) return ''; for (const f of fields) { const v = d[f]; if (v != null && v !== '' && v !== 0) return fmtNum(v) } return '' }
  const grado = d.grado != null && d.grado !== '' ? String(d.grado) : ''
  const recidiva = d.recidiva === 1 || d.recidiva === '1'
  const occorrenza = (on: boolean): string => { if (!on) return ''; return recidiva ? 'Recidiva' : 'Prima contestazione' }
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
    grado_art08: artChecked('v_art08') ? grado : '', grado_art12: artChecked('v_art12') ? grado : '', grado_art15: art15on ? grado : '',
    grado_art16: art16on ? grado : '', grado_art17: art17on ? grado : '', grado_art27: artChecked('v_art27') ? grado : '',
    grado_art28: artChecked('v_art28') ? grado : '', grado_art29: artChecked('v_art29') ? grado : '', grado_art30: artChecked('v_art30') ? grado : '',
    grado_art31: artChecked('v_art31') ? grado : '', grado_art32: artChecked('v_art32') ? grado : '', grado_art33: artChecked('v_art33') ? grado : '',
    grado_art34: artChecked('v_art34') ? grado : '', grado_art35: artChecked('v_art35') ? grado : '', grado_art36: artChecked('v_art36') ? grado : '',
    grado_art37: artChecked('v_art37') ? grado : '', grado_art39: artChecked('v_art39') ? grado : '',
    recidiva_art08: occorrenza(artChecked('v_art08')), recidiva_art12: occorrenza(artChecked('v_art12')),
    recidiva_art15: occorrenza(art15on), recidiva_art16: occorrenza(art16on), recidiva_art17: occorrenza(art17on),
    recidiva_art27: occorrenza(artChecked('v_art27')), recidiva_art28: occorrenza(artChecked('v_art28')),
    recidiva_art29: occorrenza(artChecked('v_art29')), recidiva_art30: occorrenza(artChecked('v_art30')),
    recidiva_art31: occorrenza(artChecked('v_art31')), recidiva_art32: occorrenza(artChecked('v_art32')),
    recidiva_art33: occorrenza(artChecked('v_art33')), recidiva_art34: occorrenza(artChecked('v_art34')),
    recidiva_art35: occorrenza(artChecked('v_art35')), recidiva_art36: occorrenza(artChecked('v_art36')),
    recidiva_art37: occorrenza(artChecked('v_art37')), recidiva_art39: occorrenza(artChecked('v_art39')),
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
    importo_rimborso: fmtNum(d.importo_rimborso)
  }
}

const containerCss = css`display: flex; flex-direction: column; width: 100%; height: 100%; background: #e8e8e8; overflow: hidden;`
const iframeCss = css`flex: 1; border: none; width: 100%; background: #e8e8e8;`
const emptyMsgCss = css`flex: 1; display: flex; align-items: center; justify-content: center; color: #888; font-size: 14px; padding: 20px; text-align: center;`

export default function AnteprimaPanel (p: { data: Record<string, any>; mode: 'create' | 'edit' }): any {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [utenti, setUtenti] = React.useState<Map<string, UtenteCached> | null>(null)

  React.useEffect(() => { let c = false; ensureUtentiCache().then(cache => { if (!c) setUtenti(cache) }); return () => { c = true } }, [])
  React.useEffect(() => { return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) } }, [pdfUrl])

  React.useEffect(() => {
    if (!p.data || Object.keys(p.data).length === 0) { setPdfUrl(null); return }
    let cancelled = false
    setLoading(true); setError(null)
    ;(async () => {
      try {
        const map = buildPlaceholderMap(p.data, utenti)
        const bytes = await buildRapportoPdf(map)
        if (cancelled) return
        const cp = map.cod_pratica || 'rapporto'
        const fileName = `rapporto_${cp.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
        const blob = new Blob([bytes as any], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url + '#' + fileName })
      } catch (ex: any) { if (!cancelled) setError('Errore: ' + (ex?.message || String(ex))) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [p.data, p.mode, utenti])

  return (
    <div css={containerCss}>
      {loading && (<div css={emptyMsgCss}><Loading type={'SECONDARY' as any} /></div>)}
      {!loading && error && (<div css={emptyMsgCss}>{error}</div>)}
      {!loading && !error && !pdfUrl && (<div css={emptyMsgCss}>Nessun dato disponibile per l&apos;anteprima.</div>)}
      {!loading && !error && pdfUrl && (<iframe css={iframeCss} src={pdfUrl} title='Anteprima rapporto tecnico PDF' />)}
    </div>
  )
}

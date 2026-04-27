/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, css, type AllWidgetProps } from 'jimu-core'
import { Button, Loading } from 'jimu-ui'
import { type IMConfig, defaultConfig } from '../config'
import { RAPPORTO_WEB_TEMPLATE } from './rapporto-template-web'

// ── URL GII_utenti ──
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'

// ── Tipi ──
type UtenteCached = { full_name: string; ruolo: number | null; area: number | null; settore: number | null }

// ── Lookup tabelle ──
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

// ── AMD loader ──
function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
  })
}

// ── Cache utenti (modulo-level) ──
let _utentiCache: Map<string, UtenteCached> | null = null
let _utentiLoading = false

async function ensureUtentiCache (): Promise<Map<string, UtenteCached> | null> {
  if (_utentiCache) return _utentiCache
  if (_utentiLoading) {
    // Attendi che il caricamento in corso finisca
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
    const res = await fl.queryFeatures({
      where: '1=1',
      outFields: ['username', 'full_name', 'ruolo', 'area', 'settore'],
      returnGeometry: false
    })
    const map = new Map<string, UtenteCached>()
    for (const f of (res.features || [])) {
      const a = f.attributes || {}
      const uname = String(a.username || '').trim()
      if (!uname) continue
      map.set(uname, {
        full_name: a.full_name || uname,
        ruolo: a.ruolo != null ? Number(a.ruolo) : null,
        area: a.area != null ? Number(a.area) : null,
        settore: a.settore != null ? Number(a.settore) : null
      })
    }
    _utentiCache = map
    return map
  } catch (ex) {
    console.warn('[GII-Anteprima] Errore caricamento GII_utenti:', ex)
    return null
  } finally {
    _utentiLoading = false
  }
}

// ── Helper funzioni (identiche a gii-azioni) ──
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
  for (const [k, v] of cache) {
    if (k.toLowerCase() === String(username).trim().toLowerCase()) return v.full_name || username
  }
  return username
}

function formatDateIt (v: any): string {
  if (!v) return ''
  try {
    const d = new Date(typeof v === 'number' ? v : String(v))
    if (isNaN(d.getTime())) return String(v)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return String(v) }
}

function formatTimeIt (v: any): string {
  if (!v) return ''
  try {
    const d = new Date(typeof v === 'number' ? v : String(v))
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function esc (s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Costruzione mappa placeholder (identica a gii-azioni) ──
function buildPlaceholderMap (data: any, utentiCache: Map<string, UtenteCached> | null): Record<string, string> {
  const d = data || {}
  const areaCod = String(d.area_cod || '').toUpperCase()
  const settoreCod = String(d.settore_cod || '').toUpperCase()
  const isPF = String(d.tipologia_soggetto || '').toUpperCase() === 'PF'
  const areaN = AREA_NUM[areaCod] ?? null
  const settoreN = SETTORE_NUM[settoreCod] ?? null

  const artChecked = (field: string): boolean => {
    const v = d[field]
    return v === 1 || v === '1' || v === true
  }
  const art15on = !!(d.norma15_parziale || d.norma15_totale)
  const art16on = String(d.norma16_17 || '').toLowerCase().includes('art16')
  const art17on = String(d.norma16_17 || '').toLowerCase().includes('art17') || !!d.art17_tipo

  const xMark = (on: boolean) => on ? 'x' : ''
  const surfVal = (on: boolean, ...fields: string[]) => {
    if (!on) return ''
    for (const f of fields) { const v = d[f]; if (v != null && v !== '' && v !== 0) return String(v) }
    return ''
  }
  const grado = d.grado != null && d.grado !== '' ? String(d.grado) : ''
  const recidiva = d.recidiva === 1 || d.recidiva === '1'

  const m: Record<string, string> = {
    // Dati generali
    cod_pratica: esc(d.cod_pratica || ''),
    anno: d.data_rilevazione ? String(new Date(d.data_rilevazione).getFullYear()) : '',
    area_label: AREA_LABELS[areaCod] || areaCod,
    settore_label: SETTORE_LABELS[settoreCod] || settoreCod,
    tecnico_rilevatore: esc(d.tecnico_rilevatore || ''),
    data_rilevazione: formatDateIt(d.data_rilevazione),
    ora_rilevazione: formatTimeIt(d.data_rilevazione),

    // Articoli (x)
    x_art08: xMark(artChecked('v_art08')),
    x_art12: xMark(artChecked('v_art12')),
    x_art15: xMark(art15on),
    x_art16: xMark(art16on),
    x_art17: xMark(art17on),
    x_art27: xMark(artChecked('v_art27')),
    x_art28: xMark(artChecked('v_art28')),
    x_art29: xMark(artChecked('v_art29')),
    x_art30: xMark(artChecked('v_art30')),
    x_art31: xMark(artChecked('v_art31')),
    x_art32: xMark(artChecked('v_art32')),
    x_art33: xMark(artChecked('v_art33')),
    x_art34: xMark(artChecked('v_art34')),
    x_art35: xMark(artChecked('v_art35')),
    x_art36: xMark(artChecked('v_art36')),
    x_art37: xMark(artChecked('v_art37')),
    x_art39: xMark(artChecked('v_art39')),

    // Superfici
    sup_dich_art08: surfVal(artChecked('v_art08'), 'sup_dichiarata_art08'),
    sup_irr_art08: surfVal(artChecked('v_art08'), 'sup_irrigata_art08'),
    sup_dich_art12: surfVal(artChecked('v_art12'), 'sup_dichiarata_art12'),
    sup_irr_art12: surfVal(artChecked('v_art12'), 'sup_irrigata_art12'),
    sup_dich_art15: surfVal(art15on, 'sup_dichiarata_art15'),
    sup_irr_art15: surfVal(art15on, 'sup_irrigata_art15'),
    sup_dich_art16: surfVal(art16on, 'sup_dichiarata_art16'),
    sup_irr_art16: surfVal(art16on, 'sup_irrigata_art16_17_2'),
    sup_dich_art17: surfVal(art17on, 'sup_dichiarata_art17_1', 'sup_dichiarata_art17_2'),
    sup_irr_art17: surfVal(art17on, 'sup_irrigata_art17_1', 'sup_irrigata_art16_17_2'),
    sup_dich_art27: surfVal(artChecked('v_art27'), 'sup_dichiarata_art27'),
    sup_irr_art27: surfVal(artChecked('v_art27'), 'sup_irrigata_art27'),
    sup_dich_art28: surfVal(artChecked('v_art28'), 'sup_dichiarata_art28'),
    sup_irr_art28: surfVal(artChecked('v_art28'), 'sup_irrigata_art28'),
    sup_dich_art29: surfVal(artChecked('v_art29'), 'sup_dichiarata_art29'),
    sup_irr_art29: surfVal(artChecked('v_art29'), 'sup_irrigata_art29'),
    sup_dich_art30: surfVal(artChecked('v_art30'), 'sup_dichiarata_art30'),
    sup_irr_art30: surfVal(artChecked('v_art30'), 'sup_irrigata_art30'),
    sup_dich_art31: surfVal(artChecked('v_art31'), 'sup_dichiarata_art31'),
    sup_irr_art31: surfVal(artChecked('v_art31'), 'sup_irrigata_art31'),
    sup_dich_art32: surfVal(artChecked('v_art32'), 'sup_dichiarata_art32'),
    sup_irr_art32: surfVal(artChecked('v_art32'), 'sup_irrigata_art32'),
    sup_dich_art33: surfVal(artChecked('v_art33'), 'sup_dichiarata_art33'),
    sup_irr_art33: surfVal(artChecked('v_art33'), 'sup_irrigata_art33'),
    sup_dich_art34: surfVal(artChecked('v_art34'), 'sup_dichiarata_art34'),
    sup_irr_art34: surfVal(artChecked('v_art34'), 'sup_irrigata_art34'),
    sup_dich_art35: surfVal(artChecked('v_art35'), 'sup_dichiarata_art35'),
    sup_irr_art35: surfVal(artChecked('v_art35'), 'sup_irrigata_art35'),
    sup_dich_art36: surfVal(artChecked('v_art36'), 'sup_dichiarata_art36'),
    sup_irr_art36: surfVal(artChecked('v_art36'), 'sup_irrigata_art36'),
    sup_dich_art37: surfVal(artChecked('v_art37'), 'sup_dichiarata_art37'),
    sup_irr_art37: surfVal(artChecked('v_art37'), 'sup_irrigata_art37'),
    sup_dich_art39: surfVal(artChecked('v_art39'), 'sup_dichiarata_art39'),
    sup_irr_art39: surfVal(artChecked('v_art39'), 'sup_irrigata_art39'),

    // Gravità
    grado_art08: artChecked('v_art08') ? grado : '',
    grado_art12: artChecked('v_art12') ? grado : '',
    grado_art15: art15on ? grado : '',
    grado_art16: art16on ? grado : '',
    grado_art17: art17on ? grado : '',
    grado_art27: artChecked('v_art27') ? grado : '',
    grado_art28: artChecked('v_art28') ? grado : '',
    grado_art29: artChecked('v_art29') ? grado : '',
    grado_art30: artChecked('v_art30') ? grado : '',
    grado_art31: artChecked('v_art31') ? grado : '',
    grado_art32: artChecked('v_art32') ? grado : '',
    grado_art33: artChecked('v_art33') ? grado : '',
    grado_art34: artChecked('v_art34') ? grado : '',
    grado_art35: artChecked('v_art35') ? grado : '',
    grado_art36: artChecked('v_art36') ? grado : '',
    grado_art37: artChecked('v_art37') ? grado : '',
    grado_art39: artChecked('v_art39') ? grado : '',

    // Recidiva
    recidiva_art08: artChecked('v_art08') && recidiva ? 'x' : '',
    recidiva_art12: artChecked('v_art12') && recidiva ? 'x' : '',
    recidiva_art15: art15on && recidiva ? 'x' : '',
    recidiva_art16: art16on && recidiva ? 'x' : '',
    recidiva_art17: art17on && recidiva ? 'x' : '',
    recidiva_art27: artChecked('v_art27') && recidiva ? 'x' : '',
    recidiva_art28: artChecked('v_art28') && recidiva ? 'x' : '',
    recidiva_art29: artChecked('v_art29') && recidiva ? 'x' : '',
    recidiva_art30: artChecked('v_art30') && recidiva ? 'x' : '',
    recidiva_art31: artChecked('v_art31') && recidiva ? 'x' : '',
    recidiva_art32: artChecked('v_art32') && recidiva ? 'x' : '',
    recidiva_art33: artChecked('v_art33') && recidiva ? 'x' : '',
    recidiva_art34: artChecked('v_art34') && recidiva ? 'x' : '',
    recidiva_art35: artChecked('v_art35') && recidiva ? 'x' : '',
    recidiva_art36: artChecked('v_art36') && recidiva ? 'x' : '',
    recidiva_art37: artChecked('v_art37') && recidiva ? 'x' : '',
    recidiva_art39: artChecked('v_art39') && recidiva ? 'x' : '',

    // Testi
    descrizione_fatti: esc(d.descrizione_fatti || ''),
    circostanze: esc(d.circostanze || ''),
    descrizione_luogo: esc(d.descrizione_luogo || ''),

    // Trasgressore
    denominazione: isPF ? esc(`${d.nome || ''} ${d.cognome || ''}`.trim()) : esc(d.ragione_sociale || ''),
    cf_piva_label: isPF ? 'C.F.' : 'P. IVA',
    cf_piva: isPF ? esc(d.codice_fiscale || '') : esc(d.piva || ''),
    via: esc(d.via || ''),
    civico: esc(d.civico || ''),
    localita: '',
    citta: esc(d.citta || ''),
    telefono: esc(d.telefono || d.cellulare || ''),
    email_pec: esc(d.email || d.pec || ''),
    presenza_trasgressore: String(d.presenza_trasgressore || '').toLowerCase() === 'si' || String(d.presenza_trasgressore || '').toLowerCase() === 'sì' || String(d.presenza_trasgressore || '') === '1' ? 'S\u00EC' : (String(d.presenza_trasgressore || '').toLowerCase() === 'no' || String(d.presenza_trasgressore || '') === '0' ? 'No' : String(d.presenza_trasgressore || '')),

    // Firme
    firma_tr: esc(findFullNameByUsername(utentiCache, d.tecnico_rilevatore || d.utente_loggato || d.Creator || '')),
    firma_ti: esc(d.ti_assegnato_nome || findFullNameByUsername(utentiCache, d.ti_assegnato_username || '') || findFullNameByUsername(utentiCache, d.tecnico_rilevatore || '')),
    firma_rz: esc(findUserFullName(utentiCache, 3, areaN ?? undefined, settoreN ?? undefined)),
    firma_ri: esc(findUserFullName(utentiCache, 4, areaN ?? undefined)),
    firma_dt: esc(findUserFullName(utentiCache, 5, areaN ?? undefined)),

    // Luoghi strutturati
    idrante: esc(d.idrante || ''),
    comune: '',
    foglio: '',
    mappali: '',
    altro_luogo: '',
    distretto_irriguo: esc(d.distretto_irriguo || ''),
    comizio: esc(d.comizio || ''),
    matricola_contatore: esc(d.matricola_contatore || ''),
    matricola_tessera: esc(d.matricola_tessera || ''),
    importo_rimborso: esc(d.importo_rimborso || '')
  }
  return m
}

/** Sostituisce tutti i {{placeholder}} nel template con i valori dalla mappa */
function fillTemplate (template: string, placeholders: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    return placeholders[key.trim()] ?? ''
  })
}

// ── Stili widget ──
const containerCss = css`
  display: flex; flex-direction: column; width: 100%; height: 100%;
  background: #e8e8e8; overflow: hidden;
`
const toolbarCss = css`
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; background: #fff; border-bottom: 1px solid #ccc;
  flex-shrink: 0; min-height: 40px;
  .toolbar-title {
    font-weight: 600; font-size: 14px; color: #005B8C; margin-right: auto;
  }
`
const iframeCss = css`
  flex: 1; border: none; width: 100%; background: #e8e8e8;
`
const emptyMsgCss = css`
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: #888; font-size: 14px; padding: 20px; text-align: center;
`

// ── Lettura selezione dal pattern condiviso ──
function readSelection (): { oid: number | null; layerUrl: string | null; data: any | null } {
  try {
    const sel = (window as any).__giiSelection
    if (sel?.oid && sel?.layerUrl) {
      return { oid: Number(sel.oid), layerUrl: sel.layerUrl, data: sel.data || null }
    }
  } catch { /* */ }
  try {
    const oid = sessionStorage.getItem('GII_SELECTED_OID')
    const url = sessionStorage.getItem('GII_SELECTED_LAYER_URL')
    const dataStr = sessionStorage.getItem('GII_SELECTED_DATA')
    if (oid && url) {
      return {
        oid: Number(oid),
        layerUrl: url,
        data: dataStr ? JSON.parse(dataStr) : null
      }
    }
  } catch { /* */ }
  return { oid: null, layerUrl: null, data: null }
}

/** Query tutti i campi del record dal feature layer */
async function fetchFullRecord (layerUrl: string, oid: number): Promise<any> {
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url: layerUrl })
  if (typeof fl.load === 'function') await fl.load()
  const res = await fl.queryFeatures({
    where: `OBJECTID = ${oid}`,
    outFields: ['*'],
    returnGeometry: false
  })
  return res.features?.[0]?.attributes || null
}

// ── Componente widget ──
export default function Widget (_props: AllWidgetProps<IMConfig>): any {
  const [html, setHtml] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selKey, setSelKey] = React.useState<string>('')

  // Polling selezione (stesso pattern degli altri widget)
  React.useEffect(() => {
    const check = () => {
      const s = readSelection()
      const key = `${s.oid || ''}_${s.layerUrl || ''}`
      setSelKey(prev => {
        if (prev !== key) return key
        return prev
      })
    }
    check()
    const iv = setInterval(check, 800)
    const onSel = () => setTimeout(check, 200)
    window.addEventListener('gii-force-refresh-selection', onSel)
    return () => { clearInterval(iv); window.removeEventListener('gii-force-refresh-selection', onSel) }
  }, [])

  // Carica dati e genera HTML quando cambia la selezione
  React.useEffect(() => {
    const sel = readSelection()
    if (!sel.oid || !sel.layerUrl) {
      setHtml(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        // Carica dati completi e cache utenti in parallelo
        const [data, utenti] = await Promise.all([
          fetchFullRecord(sel.layerUrl!, sel.oid!),
          ensureUtentiCache()
        ])
        if (cancelled) return
        if (!data) { setError('Record non trovato.'); setLoading(false); return }

        const map = buildPlaceholderMap(data, utenti)
        const filled = fillTemplate(RAPPORTO_WEB_TEMPLATE, map)

        // Inietta CSS per layout side-by-side nel preview
        const previewCss = `
          <style>
            @media screen {
              html { height: 100%; }
              body {
                display: flex; gap: 16px; padding: 16px;
                background: #e8e8e8; justify-content: center;
                align-items: flex-start; min-height: 100%;
              }
              .page {
                box-shadow: 0 1px 8px rgba(0,0,0,0.18);
                border-radius: 2px; flex-shrink: 0;
              }
            }
          </style>
        `
        const finalHtml = filled.replace('</head>', previewCss + '</head>')
        setHtml(finalHtml)
      } catch (ex: any) {
        if (!cancelled) setError('Errore: ' + (ex?.message || String(ex)))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [selKey])

  // Stampa
  const handlePrint = React.useCallback(() => {
    if (!html) return
    const printHtml = html.replace('</body>', '<script>window.onload=function(){window.print()}<\\/script></body>')
    const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' })
    window.open(URL.createObjectURL(blob), '_blank')
  }, [html])

  // Download HTML
  const handleDownload = React.useCallback(() => {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'rapporto-tecnico.html'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, [html])

  const sel = readSelection()
  const hasSelection = !!(sel.oid && sel.layerUrl)

  return (
    <div css={containerCss}>
      {/* Toolbar */}
      <div css={toolbarCss}>
        <span className='toolbar-title'>Anteprima Rapporto</span>
        {html && (
          <>
            <Button size='sm' type='primary' onClick={handlePrint}
              title='Apre in nuova finestra con dialogo di stampa'>
              Stampa / PDF
            </Button>
            <Button size='sm' type='default' onClick={handleDownload}
              title='Scarica il file HTML del rapporto'>
              Scarica HTML
            </Button>
          </>
        )}
      </div>

      {/* Contenuto */}
      {loading && (
        <div css={emptyMsgCss}>
          <Loading type='SECONDARY' />
        </div>
      )}

      {!loading && error && (
        <div css={emptyMsgCss}>{error}</div>
      )}

      {!loading && !error && !hasSelection && (
        <div css={emptyMsgCss}>Seleziona un rapporto dall&apos;elenco per visualizzare l&apos;anteprima.</div>
      )}

      {!loading && !error && html && (
        <iframe
          css={iframeCss}
          srcDoc={html}
          sandbox='allow-same-origin'
          title='Anteprima rapporto tecnico'
        />
      )}
    </div>
  )
}

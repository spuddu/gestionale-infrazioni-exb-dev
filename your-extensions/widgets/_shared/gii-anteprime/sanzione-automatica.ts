// =================================================================
// sanzione-automatica.ts
// Calcolo automatico della sanzione — estrazione LETTERALE (nessuna riga di
// logica riscritta) da gii-editing-amm/src/runtime/widget.tsx, per renderlo
// chiamabile anche da gii-azioni (es. all'approvazione DT), non solo dal form.
// L'unico adattamento è la rimozione dello strato React (useEffect/useState)
// dall'hook useSanzioneConsultivaState, sostituito da una funzione async pura
// con la stessa identica logica di business al suo interno.
// =================================================================

import { ensureNsdJsonOnlyQueryFormat } from './nsd-query-format-fix'

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
  })
}

const NOTA_SPESE_DETTAGLIO_VIEW_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_NOTA_SPESE_DETTAGLIO/FeatureServer/0'

type LayerFieldInfo = {
  name: string
  type: string
  alias?: string
  domain?: any | null
  editable?: boolean
}

type SanzioneParametro = {
  codice_parametro: string
  categoria_parametro: string
  valore_num: any
  valore_testo: string
  anno_riferimento: any
  data_validita_da: any
  data_validita_a: any
  descrizione: string
  note: string
}

type RegolamentoArticolo = {
  codice_articolo: string
  numero_articolo: any
  titolo_articolo: string
  testo_articolo: string
  atto_regolamento: string
  anno_riferimento: any
  data_validita_da: any
  data_validita_a: any
  attivo: any
  note: string
}

type RegolamentoRaccordo = {
  codice_casistica: string
  articolo_violato: string
  articolo_sanzione: string
  codice_parametro: string
  descrizione: string
  attivo: any
}

type NotaSpeseDetailRow = {
  codiceCasistica: string
  categoriaCosto: string
  codiceVoce: string
  descrizione: string
  importoRiga: number
}

type SanzioneConsultivaVoce = {
  codiceParametro: string
  descrizione: string
  articoloSanzione: string
  articoliSanzione: RegolamentoArticolo[]
  parametro?: SanzioneParametro | null
  valueOverride?: string
}

type SanzioneConsultivaGroup = {
  codiceCasistica: string
  descrizione: string
  articoloViolato: string
  articoloSanzione: string
  articoliViolati: RegolamentoArticolo[]
  articoliSanzione: RegolamentoArticolo[]
  voci: SanzioneConsultivaVoce[]
}

type SanzioneConsultivaLoadState = {
  loading: boolean
  error: string
  groups: SanzioneConsultivaGroup[]
  urlsReady: boolean
  casistiche: string[]
}

function normalizeFeatureLayerUrl (raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.replace(/[?#].*$/, '').replace(/\/+$/, '')
}

function normalizeLookupTableUrl (raw: any): string {
  let url = normalizeFeatureLayerUrl(raw)
  if (!url) return ''
  if (/\/(FeatureServer|MapServer)$/i.test(url)) url = `${url}/0`
  return url
}

const LOOKUP_LAYER_CACHE: Record<string, any> = {}

async function getLookupLayer (rawUrl: any): Promise<any> {
  const url = normalizeLookupTableUrl(rawUrl)
  if (!url) throw new Error('URL tabella non configurato.')
  if (LOOKUP_LAYER_CACHE[url]) return LOOKUP_LAYER_CACHE[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url, outFields: ['*'] })
  try { if (typeof fl.load === 'function') await fl.load() } catch {}
  LOOKUP_LAYER_CACHE[url] = fl
  return fl
}

async function queryActiveTableRows<T = any> (rawUrl: any, orderByFields?: string[]): Promise<T[]> {
  const fl = await getLookupLayer(rawUrl)
  const q: any = {
    where: 'attivo = 1',
    outFields: ['*'],
    returnGeometry: false,
    num: 2000
  }
  if (Array.isArray(orderByFields) && orderByFields.length) q.orderByFields = orderByFields
  const res = await fl.queryFeatures(q)
  const features = Array.isArray(res?.features) ? res.features : []
  return features.map((g: any) => ({ ...(g?.attributes || {}) })) as T[]
}

async function queryNotaSpeseDetailRowsForPractice (data: Record<string, any>): Promise<NotaSpeseDetailRow[]> {
  const rawGlobalId = String(pickAttrCI(data || {}, ['GlobalID', 'globalid', 'GLOBALID']) || '').trim()
  if (!rawGlobalId) return []
  const cleanGlobalId = rawGlobalId.replace(/[{}]/g, '').trim()
  const variants = Array.from(new Set([rawGlobalId, cleanGlobalId, cleanGlobalId ? `{${cleanGlobalId}}` : ''].filter(Boolean)))
  await ensureNsdJsonOnlyQueryFormat()
  const fl = await getLookupLayer(NOTA_SPESE_DETTAGLIO_VIEW_URL)
  const q: any = {
    where: variants.map(value => `parent_globalid = ${sqlQuote(value)}`).join(' OR '),
    outFields: ['OBJECTID', 'ordine', 'codice_casistica', 'categoria_costo', 'codice_voce_snapshot', 'descrizione_snapshot', 'importo_riga'],
    returnGeometry: false,
    num: 2000,
    orderByFields: ['ordine ASC', 'OBJECTID ASC']
  }
  const res = await fl.queryFeatures(q)
  const features = Array.isArray(res?.features) ? res.features : []
  return features.map((feature: any) => {
    const attrs = feature?.attributes || {}
    return {
      codiceCasistica: String(pickAttrCI(attrs, ['codice_casistica']) || '').trim(),
      categoriaCosto: String(pickAttrCI(attrs, ['categoria_costo']) || '').trim().toUpperCase(),
      codiceVoce: String(pickAttrCI(attrs, ['codice_voce_snapshot']) || '').trim(),
      descrizione: String(pickAttrCI(attrs, ['descrizione_snapshot']) || '').trim(),
      importoRiga: parseNumberInput(pickAttrCI(attrs, ['importo_riga'])) || 0
    }
  }).filter((row: NotaSpeseDetailRow) => !!row.codiceCasistica)
}

function pickAttrCI (data: any, names: string[]): any {
  if (!data || typeof data !== 'object') return undefined
  for (const n of names) {
    if (Object.prototype.hasOwnProperty.call(data, n)) return data[n]
  }
  const keys = Object.keys(data)
  for (const n of names) {
    const found = keys.find(k => k.toLowerCase() === String(n).toLowerCase())
    if (found) return data[found]
  }
  return undefined
}

function toDateObj (v: any): Date | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  const n = Number(v)
  if (Number.isFinite(n) && Math.abs(n) > 1000000000) {
    const d = new Date(n)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function formatDateValue (v: any): string {
  const d = toDateObj(v)
  if (!d) return '—'
  return d.toLocaleDateString('it-IT')
}

function formatValue (v: any): string {
  if (v == null || v === '') return '—'
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '—' : v.toLocaleDateString('it-IT')
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—'
  if (typeof v === 'boolean') return v ? 'Sì' : 'No'
  return String(v)
}

function formatDecimalIt (value: number, fractionDigits = 2): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  const fixed = Math.abs(n).toFixed(fractionDigits)
  const [integerPart, decimalPart] = fixed.split('.')
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalPart != null ? `${sign}${groupedInteger},${decimalPart}` : `${sign}${groupedInteger}`
}

function formatEuroText (v: any): string {
  const n = typeof v === 'number' ? v : parseNumberInput(v)
  if (n == null || !Number.isFinite(n)) return '—'
  return `${formatDecimalIt(n, 2)} €`
}

function looksLikeDateField (name: string): boolean {
  return /(^dt_|data|_data|date|_il$)/i.test(String(name || ''))
}

function getFieldInfo (fields: LayerFieldInfo[], wanted: string): LayerFieldInfo | null {
  const w = String(wanted || '').toLowerCase()
  return fields.find(x => String(x.name).toLowerCase() === w) || null
}

function getDomainOptions (field: LayerFieldInfo | null): Array<{ code: any, name: string }> {
  const vals = field?.domain?.codedValues
  if (!Array.isArray(vals)) return []
  return vals.map((x: any) => ({ code: x?.code, name: String(x?.name ?? x?.code ?? '') }))
}

function getFallbackDomainOptions (fieldName: string): Array<{ code: any, name: string }> {
  if (fieldName === 'tipo_atto_amm') {
    return [
      { code: 'VERBALE', name: 'Atto di accertamento' },
      { code: 'RISARCIMENTO_DANNI', name: 'Richiesta risarcimento danni' },
      { code: 'VERBALE_RISARCIMENTO', name: 'Atto di accertamento con rimborso/risarcimento' },
      { code: 'ARCHIVIAZIONE', name: 'Archiviazione / non luogo a procedere' },
      { code: 'RIMBORSO', name: 'Richiesta di rimborso' },
      { code: 'RIMBORSO_RISARCIMENTO', name: 'Richiesta di rimborso e risarcimento danni' }
    ]
  }
  if (fieldName === 'pagamento_modalita') {
    return [
      { code: 'PAGOPA', name: 'pagoPA' },
      { code: 'BONIFICO', name: 'Bonifico bancario' },
      { code: 'MISTO', name: 'Pagamento misto' },
      { code: 'ALTRO', name: 'Altro' }
    ]
  }
  if (fieldName === 'pagamento_stato') {
    return [
      { code: 'DA_GENERARE', name: 'Da generare' },
      { code: 'DA_PAGARE', name: 'Da pagare' },
      { code: 'GENERATO', name: 'Generato' },
      { code: 'NOTIFICATO', name: 'Notificato' },
      { code: 'PARZIALE', name: 'Pagato parzialmente' },
      { code: 'PAGATO', name: 'Pagato' },
      { code: 'SCADUTO', name: 'Scaduto' },
      { code: 'ANNULLATO', name: 'Annullato' }
    ]
  }
  if (fieldName === 'notifica_tipo') {
    return [
      { code: 'PEC', name: 'PEC' },
      { code: 'RAC_AR', name: 'Raccomandata A/R' },
      { code: 'MESSO', name: 'Messo notificatore' },
      { code: 'CONSEGNA_MANO', name: 'Consegna a mano' },
      { code: 'ALTRO', name: 'Altro' }
    ]
  }
  if (fieldName === 'notifica_esito') {
    return [
      { code: 'DA_NOTIFICARE', name: 'Da notificare' },
      { code: 'NOTIFICATA', name: 'Notificata' },
      { code: 'NON_NOTIFICATA', name: 'Non notificata' },
      { code: 'COMPIUTA_GIACENZA', name: 'Compiuta giacenza' },
      { code: 'IRREPERIBILE', name: 'Irreperibile' },
      { code: 'ALTRO', name: 'Altro' }
    ]
  }
  if (fieldName === 'attrezzature_cauzione_presente') {
    return [
      { code: 0, name: 'No' },
      { code: 1, name: 'Sì' }
    ]
  }
  if (fieldName === 'area_cod') {
    return [
      { code: 'AMM', name: 'Amministrativa' },
      { code: 'AGR', name: 'Agraria' },
      { code: 'TEC', name: 'Tecnica' }
    ]
  }
  if (fieldName === 'settore_cod') {
    return [
      { code: 'CR', name: 'Catasto, Ruoli e Servizi Territoriali' },
      { code: 'GI', name: 'Gestione irrigua' },
      { code: 'D1', name: "Distretto 1 (Quartu Sant'Elena/Villaputzu/Muravera – San Sperate)" },
      { code: 'D2', name: 'Distretto 2 (Serramanna/Pimpisu)' },
      { code: 'D3', name: 'Distretto 3 (San Gavino - Villacidro)' },
      { code: 'D4', name: 'Distretto 4 (Basso Sulcis)' },
      { code: 'D5', name: 'Distretto 5 (Senorbì)' },
      { code: 'D6', name: 'Distretto 6 (Cixerri)' },
      { code: 'DS', name: 'Manutenzione opere di dreno e di scolo' }
    ]
  }
  if (/^stato_(TI_AMM|RI_AMM|DA)$/i.test(fieldName)) {
    return [
      { code: 0, name: 'Non attivo' },
      { code: 1, name: 'Da prendere in carico' },
      { code: 2, name: 'Presa in carico' },
      { code: 3, name: 'Integrazione richiesta' },
      { code: 4, name: 'Trasmesso' },
      { code: 5, name: 'Respinto' }
    ]
  }
  if (/^esito_(TI_AMM|RI_AMM|DA|DT)$/i.test(fieldName)) {
    return [
      { code: 1, name: 'Integrazione richiesta' },
      { code: 2, name: 'Approvata' },
      { code: 3, name: 'Respinta' }
    ]
  }
  return []
}

function domainLabel (field: LayerFieldInfo | null, raw: any, fallbackFieldName?: string): string {
  if (raw == null || raw === '') return '—'
  const opts = getDomainOptions(field)
  const fallback = fallbackFieldName ? getFallbackDomainOptions(fallbackFieldName) : []
  const found = [...opts, ...fallback].find(o => String(o.code) === String(raw))
  return found ? found.name : String(raw)
}

function normalizeToken (v: any): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function parseNumberInput (v: any): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v ?? '').trim().replace(/\s+/g, '')
  if (!s) return null
  const hasComma = s.includes(',')
  const dotCount = (s.match(/\./g) || []).length
  if (hasComma) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (dotCount > 1) {
    s = s.replace(/\./g, '')
  } else if (dotCount === 1) {
    const parts = s.split('.')
    if (parts[1]?.length === 3 && parts[0]?.length <= 3) s = parts.join('')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function sqlQuote (v: any): string {
  return `'${String(v ?? '').replace(/'/g, "''")}'`
}

const VIOLATION_ARTICLE_TITLES: Record<string, string> = {
  '8': 'Violazione servizio di reperibilità',
  '12': 'Negato accesso ai fondi (al personale consortile)',
  '15': 'Prelievo abusivo d’acqua',
  '16': 'Presentazione tardiva comunicazione di irrigazione',
  '17': 'Presentazione tardiva comunicazione di variazione o di rinuncia',
  '27': 'Spreco d’acqua/uso negligente della risorsa idrica',
  '28': 'Violazione prescrizioni del consorzio',
  '29': 'Violazione termini restituzione attrezzature',
  '30': 'Danneggiamento e/o perdita attrezzature',
  '31': 'Mancata segnalazione guasti',
  '32': 'Negato accesso ai fondi (al consorziato)',
  '33': 'Inosservanza limiti temporali di prelievo',
  '34': 'Interferenze',
  '35': 'Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante',
  '36': 'Uso attrezzature non autorizzate',
  '37': 'Uso sistemi di irrigazione incompatibili',
  '39': 'Danni alle strutture irrigue'
}

const DIRECT_ARTICLE_FIELDS: Array<{ field: string, label: string, supDich?: string[], supIrr?: string[] }> = [
  { field: 'v_art08', label: 'Art. 8', supDich: ['sup_dichiarata_art08'], supIrr: ['sup_irrigata_art08'] },
  { field: 'v_art12', label: 'Art. 12', supDich: ['sup_dichiarata_art12'], supIrr: ['sup_irrigata_art12'] },
  { field: 'v_art27', label: 'Art. 27', supDich: ['sup_dichiarata_art27'], supIrr: ['sup_irrigata_art27'] },
  { field: 'v_art28', label: 'Art. 28', supDich: ['sup_dichiarata_art28'], supIrr: ['sup_irrigata_art28'] },
  { field: 'v_art29', label: 'Art. 29', supDich: ['sup_dichiarata_art29'], supIrr: ['sup_irrigata_art29'] },
  { field: 'v_art30', label: 'Art. 30', supDich: ['sup_dichiarata_art30'], supIrr: ['sup_irrigata_art30'] },
  { field: 'v_art31', label: 'Art. 31', supDich: ['sup_dichiarata_art31'], supIrr: ['sup_irrigata_art31'] },
  { field: 'v_art32', label: 'Art. 32', supDich: ['sup_dichiarata_art32'], supIrr: ['sup_irrigata_art32'] },
  { field: 'v_art33', label: 'Art. 33', supDich: ['sup_dichiarata_art33'], supIrr: ['sup_irrigata_art33'] },
  { field: 'v_art34', label: 'Art. 34', supDich: ['sup_dichiarata_art34'], supIrr: ['sup_irrigata_art34'] },
  { field: 'v_art35', label: 'Art. 35', supDich: ['sup_dichiarata_art35'], supIrr: ['sup_irrigata_art35'] },
  { field: 'v_art36', label: 'Art. 36', supDich: ['sup_dichiarata_art36'], supIrr: ['sup_irrigata_art36'] },
  { field: 'v_art37', label: 'Art. 37', supDich: ['sup_dichiarata_art37'], supIrr: ['sup_irrigata_art37'] },
  { field: 'v_art39', label: 'Art. 39', supDich: ['sup_dichiarata_art39'], supIrr: ['sup_irrigata_art39'] }
]

function isCheckedValue (v: any): boolean {
  return v === true || v === 1 || v === '1' || String(v ?? '').trim().toLowerCase() === 'si' || String(v ?? '').trim().toLowerCase() === 'sì'
}

function isMeaningfulValue (v: any): boolean {
  return v != null && v !== '' && !(typeof v === 'number' && Number.isNaN(v))
}

function formatViolationValue (data: any, fields: LayerFieldInfo[], name: string): string {
  const raw = pickAttrCI(data, [name])
  if (!isMeaningfulValue(raw)) return ''
  const lf = getFieldInfo(fields, name)
  if (lf?.domain?.codedValues) return domainLabel(lf, raw)
  if (looksLikeDateField(name)) return formatDateValue(raw)
  return formatValue(raw)
}

function firstViolationValue (data: any, fields: LayerFieldInfo[], names: string[]): string {
  for (const n of names) {
    const v = formatViolationValue(data, fields, n)
    if (v && v !== '—') return v
  }
  return ''
}

const ARTICLES_WITH_GRAVITA = new Set(['12', '27', '28', '31', '32', '33', '34', '35', '36', '37'])

function normalizeArticleNumber (raw: any): string {
  const m = String(raw ?? '').match(/(\d{1,2})(?:\.\d+)?/)
  return m ? String(Number(m[1])) : ''
}

function parseGradiViolazioniField (raw: any): Record<string, string> {
  const out: Record<string, string> = {}
  const txt = String(raw ?? '').trim()
  if (!txt) return out

  txt.split(/[;\n,]+/).forEach(part => {
    const item = String(part || '').trim()
    if (!item) return
    const m = item.match(/(?:art\.?\s*)?(\d{1,2})(?:\.\d+)?\s*[-:=]\s*([1-4])/i)
    if (!m) return
    const article = normalizeArticleNumber(m[1])
    if (ARTICLES_WITH_GRAVITA.has(article)) out[article] = m[2]
  })

  return out
}

function normalizeGravitaValue (raw: any): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const m = s.match(/[1-4]/)
  return m ? m[0] : ''
}

function getGravitaForArticle (data: any, articleNumber: any): string {
  const d = data || {}
  const article = normalizeArticleNumber(articleNumber)
  const gradi = parseGradiViolazioniField(pickAttrCI(d, ['gradi_violazioni']))
  if (article && gradi[article]) return gradi[article]

  const specificNames = article
    ? [`grado_art${article}`, `gravita_art${article}`, `grado_art_${article}`, `gravita_art_${article}`]
    : []
  const specific = normalizeGravitaValue(pickAttrCI(d, specificNames))
  if (specific) return specific

  return normalizeGravitaValue(pickAttrCI(d, ['grado', 'gravita']))
}

function formatOccorrenzaValue (raw: any, fields: LayerFieldInfo[]): string {
  if (!isMeaningfulValue(raw)) return ''

  const lf = getFieldInfo(fields, 'occorrenza')
  if (lf?.domain?.codedValues) {
    const label = domainLabel(lf, raw)
    if (label && label !== '—') return label
  }

  const value = String(raw).trim()
  if (value === '1') return 'Prima contestazione'
  if (value === '2') return 'Recidiva'
  return formatValue(raw)
}

const ARTICLE_CASE_MAP: Record<string, string> = {
  '08': 'C100_REPERIBILITA',
  '8': 'C100_REPERIBILITA',
  '12': 'C107_NEGATO_ACCESSO_PERSONALE',
  '27': 'C101_SPRECO_USO_NEGLIGENTE',
  '28': 'C102_VIOLAZIONE_PRESCRIZIONI',
  '29': 'C103_RESTITUZIONE_ATTREZZATURE',
  '30': 'C104_DANNEGGIAMENTO_PERDITA_ATTREZZATURE',
  '31': 'C105_MANCATA_SEGNALAZIONE_GUASTI',
  '32': 'C106_NEGATO_ACCESSO_CONSORZIATO',
  '33': 'C108_LIMITI_TEMPORALI_PRELIEVO',
  '34': 'C109_INTERFERENZE',
  '35': 'C110_MANOMISSIONE_RETI',
  '36': 'C111_ATTREZZATURE_NON_AUTORIZZATE',
  '37': 'C112_IRRIGAZIONE_INCOMPATIBILE',
  '39': 'C113_DANNI_STRUTTURE_IRRIGUE'
}

function pushUnique (arr: string[], v: string) {
  const s = String(v || '').trim()
  if (s && !arr.includes(s)) arr.push(s)
}

function fieldRawOrLabel (data: any, fields: LayerFieldInfo[], name: string): string {
  const raw = pickAttrCI(data, [name])
  const label = formatViolationValue(data, fields, name)
  return `${raw ?? ''} ${label || ''}`.trim()
}

function numericAttr (data: any, names: string[]): number | null {
  for (const name of names) {
    const raw = pickAttrCI(data, [name])
    const n = parseNumberInput(raw)
    if (n != null) return n
  }
  return null
}

function isRecidivaPractice (data: any, fields: LayerFieldInfo[]): boolean {
  const d = data || {}
  const names = ['occorrenza', 'recidiva', 'occorrenza_art15', 'art15_occorrenza', 'norma15_occorrenza']
  for (const name of names) {
    const raw = pickAttrCI(d, [name])
    const combined = normalizeToken(fieldRawOrLabel(d, fields, name))
    if (String(raw).trim() === '2') return true
    if (String(raw).trim() === '1' && normalizeToken(name).includes('RECID')) return true
    if (combined.includes('RECID')) return true
  }

  for (const [key, raw] of Object.entries(d)) {
    const k = normalizeToken(key)
    if (!k.includes('RECID') && !k.includes('OCCORRENZA')) continue
    const value = normalizeToken(raw)
    if (String(raw).trim() === '2' || value.includes('RECID')) return true
    if (k.includes('RECID') && (String(raw).trim() === '1' || value === 'SI' || value === 'SÌ')) return true
  }

  return false
}

function deriveArt15FallbackCase (data: any, fields: LayerFieldInfo[]): string {
  const dichiarata = numericAttr(data, ['sup_dichiarata_art15'])
  const irrigata = numericAttr(data, ['sup_irrigata_art15'])
  if (irrigata == null || irrigata <= 0) return ''

  const tipo = normalizeToken(fieldRawOrLabel(data, fields, 'tipo_prelievo') || fieldRawOrLabel(data, fields, 'tipo_abuso'))
  const recidiva = isRecidivaPractice(data, fields)
  const totale = tipo.includes('TOTALE') || dichiarata == null || dichiarata <= 0
  const parziale = tipo.includes('PARZIALE') || (!totale && dichiarata != null && irrigata > dichiarata)

  if (totale) return recidiva ? 'C118_PRELIEVO_TOTALE_RECIDIVA' : 'C117_PRELIEVO_TOTALE_PRIMA'
  if (parziale) return recidiva ? 'C116_PRELIEVO_PARZIALE_RECIDIVA' : 'C115_PRELIEVO_PARZIALE_PRIMA'
  return ''
}

function normalizeNotaSpeseAmount (n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null
  // Alcuni dati storici/di passaggio possono arrivare come centesimi interi
  // (es. 10889 invece di 108,89). La normalizzazione è usata solo come fallback
  // quando non sono disponibili i subtotali della nota spese.
  if (Number.isInteger(n) && n >= 10000 && n % 100 !== 0) return n / 100
  return n
}

function getNotaSpeseValueText (data: any): string {
  const d = data || {}
  const componentNames = [
    'ns_totale_attrezzature_trasporti',
    'ns_totale_materiali_costruzione',
    'ns_totale_manodopera',
    'ns_totale_semilavorati',
    'ns_totale_prodotti_finiti',
    'ns_importo_spese_generali'
  ]
  const components = componentNames
    .map(name => numericAttr(d, [name]))
    .filter((n): n is number => n != null && Number.isFinite(n) && n > 0)
  if (components.length) {
    const total = components.reduce((acc, n) => acc + n, 0)
    return total > 0 ? formatEuroText(total) : '0,00 €'
  }

  const n = normalizeNotaSpeseAmount(numericAttr(d, ['ns_totale_complessivo', 'risarcimento_danni_importo']))
  return n != null && n > 0 ? formatEuroText(n) : '0,00 €'
}

function art15SurfaceCentiareForCase (data: any, codiceCasistica: string): number | null {
  const code = String(codiceCasistica || '').toUpperCase()
  if (!code.includes('PRELIEVO_PARZIALE') && !code.includes('PRELIEVO_TOTALE')) return null

  const dichiarata = numericAttr(data || {}, ['sup_dichiarata_art15']) || 0
  const irrigata = numericAttr(data || {}, ['sup_irrigata_art15'])
  if (irrigata == null || irrigata <= 0) return null

  // Art. 15: la superficie di calcolo è sempre la differenza tra
  // superficie irrigata e superficie dichiarata. Per il prelievo totale
  // la dichiarata è normalmente pari a zero, quindi il risultato coincide
  // con l'intera superficie irrigata.
  const centiare = Math.max(0, irrigata - dichiarata)
  if (!Number.isFinite(centiare) || centiare <= 0) return null
  return centiare
}

function art15SurfaceHaForCase (data: any, codiceCasistica: string): number | null {
  const centiare = art15SurfaceCentiareForCase(data, codiceCasistica)
  return centiare == null ? null : centiare / 10000
}

function art15CalculatedValueText (data: any, codiceCasistica: string, param?: SanzioneParametro | null): string {
  const ha = art15SurfaceHaForCase(data, codiceCasistica)
  const rate = parseNumberInput(param?.valore_num)
  if (ha == null || rate == null) return ''
  return formatEuroText(rate * ha)
}

function firstArticleNumberFromCodes (raw: any): number {
  const first = splitArticleCodes(raw)[0] || ''
  const n = Number(normalizeArticleNumber(first))
  return Number.isFinite(n) ? n : 999
}

function displayViolationTitle (group: SanzioneConsultivaGroup): string {
  const article = String(firstArticleNumberFromCodes(group.articoloViolato))
  return VIOLATION_ARTICLE_TITLES[article] || sentenceFirst(group.descrizione || '') || 'Violazione contestata'
}

function isPieListaParametro (param?: SanzioneParametro | null): boolean {
  const code = normalizeToken(param?.codice_parametro || '')
  const txt = normalizeToken(`${param?.valore_testo || ''} ${param?.descrizione || ''}`)
  return code.includes('PIELISTA') || txt.includes('PIELISTA') || txt.includes('DAQUANTIFICARE')
}

function getViolationArticleFromCase (codiceCasistica: string): string {
  const code = String(codiceCasistica || '')
  const direct = Object.entries(ARTICLE_CASE_MAP).find(([, c]) => c === code)
  if (direct) return String(Number(direct[0]))
  if (code.includes('C114')) return '16'
  if (code.includes('C115') || code.includes('C116') || code.includes('C117') || code.includes('C118')) return '15'
  return ''
}

function selectedArticle1617 (data: any): string {
  const raw = normalizeToken(pickAttrCI(data || {}, ['norma16_17']))
  const art17Tipo = normalizeToken(pickAttrCI(data || {}, ['art17_tipo']))

  if (raw.includes('ART17') || raw.includes('VARIAZIONE') || raw.includes('RINUNCIA')) return '17'
  if (raw.includes('ART16') || raw.includes('IRRIGAZIONE')) return '16'
  if (art17Tipo) return '17'
  return ''
}

function firstPositiveNumericAttr (data: any, names: string[]): number | null {
  for (const name of names) {
    const n = parseNumberInput(pickAttrCI(data || {}, [name]))
    if (n != null && Number.isFinite(n) && n > 0) return n
  }
  return null
}

function comunicazioneTardivaSurfaceCentiare (data: any): number | null {
  const d = data || {}
  const article = selectedArticle1617(d)
  let centiare: number | null = null

  if (article === '16') {
    // Art. 16: la superficie di calcolo è la superficie dichiarata.
    // La superficie irrigata non rileva perché, nella comunicazione tardiva
    // di irrigazione, è sempre pari a zero.
    centiare = firstPositiveNumericAttr(d, ['sup_dichiarata_art16', 'sup_dichiarata_art16_17'])
  } else if (article === '17') {
    const tipo = normalizeToken(pickAttrCI(d, ['art17_tipo']))
    if (tipo.includes('ART171') || tipo.includes('VARIAZIONE')) {
      const dichiarata = firstPositiveNumericAttr(d, ['sup_dichiarata_art17_1', 'sup_dichiarata_art16_17'])
      const variata = firstPositiveNumericAttr(d, ['sup_irrigata_art17_1', 'sup_variata', 'sup_irrigata_art16_17_2', 'sup_irrigata_art16_17'])
      if (dichiarata != null && variata != null) {
        // Art. 17 - variazione tardiva: differenza assoluta tra superficie
        // dichiarata e superficie variata, indipendentemente dal segno.
        centiare = Math.abs(variata - dichiarata)
      }
    } else if (tipo.includes('ART172') || tipo.includes('RINUNCIA')) {
      // Art. 17 - rinuncia tardiva: la superficie irrigata è pari a zero,
      // quindi la superficie di calcolo coincide con la dichiarata.
      centiare = firstPositiveNumericAttr(d, ['sup_dichiarata_art17_2', 'sup_dichiarata_art16_17'])
    } else {
      const dichiarataVariazione = firstPositiveNumericAttr(d, ['sup_dichiarata_art17_1'])
      const variata = firstPositiveNumericAttr(d, ['sup_irrigata_art17_1', 'sup_variata', 'sup_irrigata_art16_17_2', 'sup_irrigata_art16_17'])
      const dichiarataRinuncia = firstPositiveNumericAttr(d, ['sup_dichiarata_art17_2', 'sup_dichiarata_art16_17'])
      if (dichiarataVariazione != null && variata != null) centiare = Math.abs(variata - dichiarataVariazione)
      else centiare = dichiarataRinuncia
    }
  }

  if (centiare == null || !Number.isFinite(centiare) || centiare <= 0) return null
  return centiare
}

function comunicazioneTardivaSurfaceHa (data: any): number | null {
  const centiare = comunicazioneTardivaSurfaceCentiare(data)
  return centiare == null ? null : centiare / 10000
}

function comunicazioneTardivaCalculatedValueText (data: any, param?: SanzioneParametro | null): string {
  const ha = comunicazioneTardivaSurfaceHa(data)
  const rate = parseNumberInput(param?.valore_num)
  if (ha == null || rate == null || !Number.isFinite(rate)) return ''
  return formatEuroText(rate * ha)
}

function deriveSanzioneCasistiche (data: any, fields: LayerFieldInfo[]): string[] {
  const d = data || {}
  const out: string[] = []

  const n15p = fieldRawOrLabel(d, fields, 'norma15_parziale')
  const n15t = fieldRawOrLabel(d, fields, 'norma15_totale')
  const art15Recidiva = isRecidivaPractice(d, fields)
  if (n15p) {
    const t = normalizeToken(n15p)
    pushUnique(out, art15Recidiva || t.includes('ART152') || t.includes('RECID') ? 'C116_PRELIEVO_PARZIALE_RECIDIVA' : 'C115_PRELIEVO_PARZIALE_PRIMA')
  }
  if (n15t) {
    const t = normalizeToken(n15t)
    pushUnique(out, art15Recidiva || t.includes('ART154') || t.includes('RECID') ? 'C118_PRELIEVO_TOTALE_RECIDIVA' : 'C117_PRELIEVO_TOTALE_PRIMA')
  }
  if (!n15p && !n15t) pushUnique(out, deriveArt15FallbackCase(d, fields))

  const norma1617 = fieldRawOrLabel(d, fields, 'norma16_17')
  const art17Tipo = fieldRawOrLabel(d, fields, 'art17_tipo')
  if (norma1617 || art17Tipo) pushUnique(out, 'C114_COMUNICAZIONE_TARDIVA')

  for (const art of DIRECT_ARTICLE_FIELDS) {
    if (!isCheckedValue(pickAttrCI(d, [art.field]))) continue
    const n = normalizeArticleNumber(art.label).padStart(2, '0')
    pushUnique(out, ARTICLE_CASE_MAP[n] || ARTICLE_CASE_MAP[String(Number(n))] || '')
  }

  return out
}

function dateMsOrNull (v: any): number | null {
  const d = toDateObj(v)
  return d ? d.getTime() : null
}

function getSanzioneReferenceDate (data: any): number {
  const d = data || {}
  return dateMsOrNull(pickAttrCI(d, ['accertamento_data', 'protocollo_atto_accertamento_data', 'notifica_data', 'data_rilevazione'])) || Date.now()
}

function isRowValidAt (row: any, refMs: number): boolean {
  const from = dateMsOrNull(pickAttrCI(row, ['data_validita_da']))
  const to = dateMsOrNull(pickAttrCI(row, ['data_validita_a']))
  if (from != null && from > refMs) return false
  if (to != null && to < refMs) return false
  return true
}

function normalizeParam (row: any): SanzioneParametro {
  return {
    codice_parametro: String(pickAttrCI(row, ['codice_parametro']) || '').trim(),
    categoria_parametro: String(pickAttrCI(row, ['categoria_parametro']) || '').trim().toUpperCase(),
    valore_num: pickAttrCI(row, ['valore_num']),
    valore_testo: String(pickAttrCI(row, ['valore_testo']) || '').trim(),
    anno_riferimento: pickAttrCI(row, ['anno_riferimento']),
    data_validita_da: pickAttrCI(row, ['data_validita_da']),
    data_validita_a: pickAttrCI(row, ['data_validita_a']),
    descrizione: String(pickAttrCI(row, ['descrizione']) || '').trim(),
    note: String(pickAttrCI(row, ['note']) || '').trim()
  }
}

function normalizeArticle (row: any): RegolamentoArticolo {
  return {
    codice_articolo: String(pickAttrCI(row, ['codice_articolo']) || '').trim().toUpperCase(),
    numero_articolo: pickAttrCI(row, ['numero_articolo']),
    titolo_articolo: String(pickAttrCI(row, ['titolo_articolo']) || '').trim(),
    testo_articolo: String(pickAttrCI(row, ['testo_articolo']) || '').trim(),
    atto_regolamento: String(pickAttrCI(row, ['atto_regolamento']) || '').trim(),
    anno_riferimento: pickAttrCI(row, ['anno_riferimento']),
    data_validita_da: pickAttrCI(row, ['data_validita_da']),
    data_validita_a: pickAttrCI(row, ['data_validita_a']),
    attivo: pickAttrCI(row, ['attivo']),
    note: String(pickAttrCI(row, ['note']) || '').trim()
  }
}

function normalizeRaccordo (row: any): RegolamentoRaccordo {
  return {
    codice_casistica: String(pickAttrCI(row, ['codice_casistica']) || '').trim(),
    articolo_violato: String(pickAttrCI(row, ['articolo_violato']) || '').trim().toUpperCase(),
    articolo_sanzione: String(pickAttrCI(row, ['articolo_sanzione']) || '').trim().toUpperCase(),
    codice_parametro: String(pickAttrCI(row, ['codice_parametro']) || '').trim(),
    descrizione: String(pickAttrCI(row, ['descrizione']) || '').trim(),
    attivo: pickAttrCI(row, ['attivo'])
  }
}

function splitArticleCodes (raw: any): string[] {
  return String(raw || '')
    .toUpperCase()
    .split(/[\/;,|+]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function formatArticleCode (raw: any): string {
  const s = String(raw || '').trim()
  const article = normalizeArticleNumber(s)
  return article ? `Art. ${article}` : s.toUpperCase()
}

function formatArticleFallback (raw: any): string {
  const parts = splitArticleCodes(raw)
  return parts.length ? parts.map(formatArticleCode).join(', ') : '—'
}

function cleanLabelText (raw: any): string {
  return String(raw || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sentenceFirst (raw: any): string {
  const s = cleanLabelText(raw)
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function stripNormPrefix (raw: any): string {
  return cleanLabelText(raw).replace(/^Art\.\s*\d+\s*[-–]\s*/i, '')
}

function raccordoMainDescription (raw: any): string {
  const s = cleanLabelText(raw)
  if (!s) return 'Violazione contestata'
  const parts = s.split(/\s+-\s+/)
  return sentenceFirst(parts[0] || s)
}

function voceDescriptionFromRaccordo (raw: any): string {
  const s = cleanLabelText(raw)
  const parts = s.split(/\s+-\s+/)
  return sentenceFirst(parts.length > 1 ? parts.slice(1).join(' - ') : s)
}

function formatParametroValue (param?: SanzioneParametro | null): string {
  if (!param) return 'Parametro non trovato'
  const txt = String(param.valore_testo || '').trim()
  const raw = param.valore_num
  const n = raw == null || raw === '' ? null : Number(String(raw).replace(',', '.'))
  if (n == null || !Number.isFinite(n)) return txt || 'Da quantificare'
  const cat = String(param.categoria_parametro || '').toUpperCase()
  const code = String(param.codice_parametro || '').toUpperCase()
  if (n === 0 && txt && /quantificare|definire|pi[eè]\s*lista/i.test(txt)) return txt
  if (cat === 'TERMINE') return `${n.toLocaleString('it-IT', { maximumFractionDigits: 0 })} giorni`
  if (code.includes('PERCENTUALE') || cat === 'RIDUZIONE') return `${n.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`
  if (code.includes('EURO_HA')) return `${formatEuroText(n)}/ha`
  if (['SANZIONE', 'ATTREZZATURA', 'CAUZIONE', 'SPESE', 'RIMBORSO'].includes(cat)) return formatEuroText(n)
  return txt ? `${n.toLocaleString('it-IT')} — ${txt}` : n.toLocaleString('it-IT')
}

function formatVoceValue (voce: SanzioneConsultivaVoce): string {
  return voce.valueOverride || formatParametroValue(voce.parametro)
}

function parseEuroTextValue (value: any): number | null {
  const s = String(value ?? '').trim()
  if (!s || !s.includes('€')) return null
  const m = s.match(/-?\d+(?:[\.,]\d{3})*(?:[\.,]\d+)?/)
  if (!m) return null
  return parseNumberInput(m[0])
}

function voceAppliedAmount (voce: SanzioneConsultivaVoce): number | null {
  if (voce.valueOverride) return parseEuroTextValue(voce.valueOverride)
  const param = voce.parametro
  if (!param) return null
  const cat = String(param.categoria_parametro || '').toUpperCase()
  const code = String(param.codice_parametro || '').toUpperCase()
  if (cat === 'TERMINE' || cat === 'RIDUZIONE') return null
  if (code.includes('PERCENTUALE') || code.includes('EURO_HA')) return null
  if (!['SANZIONE', 'RISARCIMENTO', 'RIMBORSO', 'ATTREZZATURA', 'CAUZIONE', 'SPESE'].includes(cat)) return null
  const n = parseNumberInput(param.valore_num)
  return n != null && Number.isFinite(n) ? n : null
}

function formatSurfaceHaACaForCalculation (centiare: number): string {
  const total = Math.max(0, Math.round(Number(centiare) || 0))
  const ha = Math.floor(total / 10000)
  const are = Math.floor((total % 10000) / 100)
  const ca = total % 100
  return `${ha}.${String(are).padStart(2, '0')}.${String(ca).padStart(2, '0')} (ha.a.ca)`
}

function formatSurfaceHaDecimalNumberForCalculation (centiare: number): string {
  const ha = Math.max(0, Number(centiare) || 0) / 10000
  return ha.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

function formatEuroNumberForCalculation (value: number): string {
  return formatEuroText(value).replace(/\s*€$/, '')
}

function formatEuroPerHa (value: number): string {
  return `${formatEuroNumberForCalculation(value)} €/ha`
}

function calculationSurfaceCentiare (group: SanzioneConsultivaGroup, data: Record<string, any>): number | null {
  const article = normalizeArticleNumber(group.articoloViolato)
  if (article === '15') return art15SurfaceCentiareForCase(data, group.codiceCasistica)
  if (String(group.codiceCasistica || '').toUpperCase().includes('C114')) return comunicazioneTardivaSurfaceCentiare(data)
  return null
}

function calculationOccurrenceLabel (group: SanzioneConsultivaGroup, data: Record<string, any>, fields: LayerFieldInfo[]): string {
  const article = normalizeArticleNumber(group.articoloViolato)
  if (article !== '15') return ''
  const caseCode = normalizeToken(group.codiceCasistica)
  if (caseCode.includes('RECIDIVA')) return 'Recidiva'
  if (caseCode.includes('PRIMA')) return 'Prima contestazione'
  return formatOccorrenzaValue(pickAttrCI(data || {}, ['occorrenza']), fields)
}

function normalizeArt15AbuseTypeLabel (raw: any): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  const token = normalizeToken(value)
  if (token.includes('PARZIALE')) return 'Parziale'
  if (token.includes('TOTALE')) return 'Totale'
  return value
}

function art15AbuseTypeLabel (data: Record<string, any>, fields: LayerFieldInfo[], caseCodeRaw?: any): string {
  const direct = normalizeArt15AbuseTypeLabel(firstViolationValue(data || {}, fields || [], ['tipo_abuso', 'tipo_prelievo']))
  if (direct) return direct

  if (isCheckedValue(pickAttrCI(data || {}, ['norma15_parziale']))) return 'Parziale'
  if (isCheckedValue(pickAttrCI(data || {}, ['norma15_totale']))) return 'Totale'

  const fallback = normalizeToken(caseCodeRaw || deriveArt15FallbackCase(data || {}, fields || []))
  if (fallback.includes('PARZIALE')) return 'Parziale'
  if (fallback.includes('TOTALE')) return 'Totale'
  return ''
}

function normalizeArt17CommunicationTypeLabel (raw: any): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  const token = normalizeToken(value)
  if (token.includes('VARIAZIONE')) return 'Variazione tardiva'
  if (token.includes('RINUNCIA')) return 'Rinuncia tardiva'
  return value
}

function art17CommunicationTypeLabel (data: Record<string, any>, fields: LayerFieldInfo[], caseCodeRaw?: any): string {
  const direct = normalizeArt17CommunicationTypeLabel(firstViolationValue(data || {}, fields || [], ['art17_tipo']))
  if (direct) return direct
  const fallback = normalizeToken(caseCodeRaw || '')
  if (fallback.includes('VARIAZIONE')) return 'Variazione tardiva'
  if (fallback.includes('RINUNCIA')) return 'Rinuncia tardiva'
  return ''
}

function calculationGravityLabel (group: SanzioneConsultivaGroup, data: Record<string, any>): string {
  const article = normalizeArticleNumber(group.articoloViolato)
  if (!ARTICLES_WITH_GRAVITA.has(article)) return ''
  return getGravitaForArticle(data || {}, article)
}

type Art30EquipmentKind = 'tessera' | 'curve' | 'sifoni' | 'paratoie'

const ART30_EQUIPMENT_META: Record<Art30EquipmentKind, { label: string, tokens: string[] }> = {
  tessera: { label: 'tessera elettronica', tokens: ['TESSERA', 'TESSERE', 'TESSERAELETTRONICA', 'TESSEREELETTRONICHE'] },
  curve: { label: 'curve di derivazione', tokens: ['CURVA', 'CURVE', 'CURVADIDERIVAZIONE', 'CURVEDIDERIVAZIONE'] },
  sifoni: { label: 'sifoni', tokens: ['SIFONE', 'SIFONI'] },
  paratoie: { label: 'paratoie', tokens: ['PARATOIA', 'PARATOIE'] }
}

function art30EquipmentKindFromText (raw: any): Art30EquipmentKind | null {
  const token = normalizeToken(raw)
  if (!token) return null
  for (const kind of Object.keys(ART30_EQUIPMENT_META) as Art30EquipmentKind[]) {
    if (ART30_EQUIPMENT_META[kind].tokens.some(value => token.includes(value))) return kind
  }
  return null
}

const NOTA_SPESE_CASE_ALIASES: Record<string, string[]> = {
  C101_SPRECO_USO_NEGLIGENTE: ['C101_SPRECO_ACQUA'],
  C104_DANNEGGIAMENTO_PERDITA_ATTREZZATURE: ['C104_ATTREZZATURE_DANNEGGIATE']
}

function normalizedCaseCodes (codiceCasistica: string): Set<string> {
  const code = String(codiceCasistica || '').trim().toUpperCase()
  const out = new Set<string>()
  if (code) out.add(code)
  ;(NOTA_SPESE_CASE_ALIASES[code] || []).forEach(alias => out.add(String(alias || '').trim().toUpperCase()))
  Object.entries(NOTA_SPESE_CASE_ALIASES).forEach(([mainCode, aliases]) => {
    if (aliases.some(alias => String(alias || '').trim().toUpperCase() === code)) {
      out.add(mainCode)
      aliases.forEach(alias => out.add(String(alias || '').trim().toUpperCase()))
    }
  })
  return out
}

function isArt30CaseCode (codiceCasistica: string): boolean {
  const codes = normalizedCaseCodes(codiceCasistica)
  return codes.has('C104_DANNEGGIAMENTO_PERDITA_ATTREZZATURE') || codes.has('C104_ATTREZZATURE_DANNEGGIATE')
}

type Art30EquipmentSelection = {
  kind: Art30EquipmentKind
  codice: string
  descrizione: string
  valoreUnitario: number | null
  importo: number
}

function parseArt30EquipmentSelections (data: Record<string, any>): Art30EquipmentSelection[] {
  const out: Art30EquipmentSelection[] = []
  const raw = String(pickAttrCI(data || {}, ['attrezzature_risarcimento_dettaglio']) || '')
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    if (/Stato:\s*Recuperabile\b/i.test(text)) continue
    const kind = art30EquipmentKindFromText(text)
    if (!kind) continue
    const statoMatch = text.match(/Stato:\s*(Non recuperabile|Recuperabile)/i)
    if (!statoMatch) continue
    const cutIdx = text.search(/\s+—\s+Valore unitario:/i)
    const prefix = cutIdx >= 0 ? text.slice(0, cutIdx).trim() : text
    const codeMatch = prefix.match(/^(.*?)\s+—\s+Codice:\s*(.+)$/i)
    const descrizione = String(codeMatch?.[1] || prefix || ART30_EQUIPMENT_META[kind].label).trim()
    const codice = String(codeMatch?.[2] || '').trim()
    const valoreMatch = text.match(/Valore unitario:\s*([0-9.,]+)/i)
    const valoreUnitario = parseNumberInput(valoreMatch?.[1])
    if (valoreUnitario != null && valoreUnitario >= 0) {
      out.push({ kind, codice, descrizione: descrizione || ART30_EQUIPMENT_META[kind].label, valoreUnitario, importo: valoreUnitario })
      continue
    }
    const legacyAmount = parseEuroTextValue(text)
    if (legacyAmount != null && legacyAmount >= 0) {
      out.push({ kind, codice, descrizione: descrizione || ART30_EQUIPMENT_META[kind].label, valoreUnitario: legacyAmount, importo: legacyAmount })
    }
  }
  return out
}

type NotaSpeseCaseSummary = {
  baseSpese: number
  speseGenerali: number
  risarcimentoAttrezzature: number
  totale: number
  rows: number
}

function notaSpeseSummaryForCase (noteRows: NotaSpeseDetailRow[], codiceCasistica: string, data: Record<string, any>): NotaSpeseCaseSummary | null {
  const acceptedCodes = normalizedCaseCodes(codiceCasistica)
  const rows = (noteRows || []).filter(row => acceptedCodes.has(String(row.codiceCasistica || '').trim().toUpperCase()))
  if (!rows.length) return null

  // Le righe RA (risarcimento attrezzature Art. 30) sono già nette e non
  // concorrono alla base delle spese generali. È la stessa regola usata nella
  // Nota spese tecnica e nel dettaglio pratica.
  const baseSpese = rows
    .filter(row => String(row.categoriaCosto || '').toUpperCase() !== 'RA')
    .reduce((sum, row) => sum + (Number.isFinite(row.importoRiga) ? row.importoRiga : 0), 0)
  const risarcimentoAttrezzature = rows
    .filter(row => String(row.categoriaCosto || '').toUpperCase() === 'RA')
    .reduce((sum, row) => sum + (Number.isFinite(row.importoRiga) ? row.importoRiga : 0), 0)

  const configuredPercentage = parseNumberInput(pickAttrCI(data || {}, ['ns_spese_generali_perc']))
  const percentage = configuredPercentage != null && Number.isFinite(configuredPercentage) ? configuredPercentage : 15
  const speseGenerali = baseSpese * percentage / 100
  return {
    baseSpese: roundMoneyValue(baseSpese),
    speseGenerali: roundMoneyValue(speseGenerali),
    risarcimentoAttrezzature: roundMoneyValue(risarcimentoAttrezzature),
    totale: roundMoneyValue(baseSpese + speseGenerali + risarcimentoAttrezzature),
    rows: rows.length
  }
}

function notaSpeseTotalForCase (noteRows: NotaSpeseDetailRow[], codiceCasistica: string, data: Record<string, any>): number | null {
  const summary = notaSpeseSummaryForCase(noteRows, codiceCasistica, data)
  if (!summary) return null
  // Per l'Art. 30 le righe RA vengono esposte e conteggiate separatamente come
  // risarcimento attrezzature; la voce a piè di lista comprende soltanto le
  // altre spese e le relative spese generali.
  if (isArt30CaseCode(codiceCasistica)) return roundMoneyValue(summary.baseSpese + summary.speseGenerali)
  return summary.totale
}

function art30CauzioneSelected (data: Record<string, any>): boolean {
  const rawFlag = pickAttrCI(data || {}, ['attrezzature_cauzione_presente'])
  return rawFlag != null && rawFlag !== '' && isCheckedValue(rawFlag)
}

function art30EquipmentLineLabel (voce: SanzioneConsultivaVoce): string {
  const kind = art30EquipmentKindFromText(`${voce.codiceParametro} ${voce.descrizione} ${voce.parametro?.descrizione || ''}`)
  return kind ? `Rimborso ${ART30_EQUIPMENT_META[kind].label}` : 'Rimborso attrezzatura'
}

function art30VoceOrder (voce: SanzioneConsultivaVoce): number {
  const categoria = String(voce.parametro?.categoria_parametro || '').toUpperCase()
  if (categoria === 'CAUZIONE') return 100
  if (categoria === 'RISARCIMENTO' || isPieListaParametro(voce.parametro)) return 80
  const kind = art30EquipmentKindFromText(`${voce.codiceParametro} ${voce.descrizione} ${voce.parametro?.descrizione || ''}`)
  if (kind === 'tessera') return 10
  if (kind === 'curve') return 20
  if (kind === 'sifoni') return 30
  if (kind === 'paratoie') return 40
  return 60
}

function calculationDetailLinesForVoce (
  group: SanzioneConsultivaGroup,
  voce: SanzioneConsultivaVoce,
  data: Record<string, any>
): string[] {
  const parametro = voce.parametro || null
  const categoria = String(parametro?.categoria_parametro || '').toUpperCase()
  const codice = String(parametro?.codice_parametro || voce.codiceParametro || '').toUpperCase()
  const article = normalizeArticleNumber(group.articoloViolato)
  const base = parseNumberInput(parametro?.valore_num)
  const amount = voceAppliedAmount(voce)
  const lines: string[] = []

  if (categoria === 'RISARCIMENTO' || isPieListaParametro(parametro)) {
    const value = amount != null && Number.isFinite(amount) ? amount : 0
    if (codice === 'NOTA_SPESE.C104') lines.push(`Nota spese: ${formatEuroText(value)}`)
    else if (article === '8' || article === '30') lines.push(`Rimborso spese a piè di lista: ${formatEuroText(value)}`)
    else lines.push(`Importo a piè di lista: ${formatEuroText(value)}`)
    return lines
  }

  if (codice.includes('EURO_HA')) {
    if (base != null && Number.isFinite(base)) lines.push(`Sanzione pecuniaria base: ${formatEuroPerHa(base)}`)
    const centiare = calculationSurfaceCentiare(group, data)
    if (centiare != null && Number.isFinite(centiare) && centiare > 0) {
      const ha = centiare / 10000
      const calculated = amount != null && Number.isFinite(amount)
        ? amount
        : (base != null && Number.isFinite(base) ? base * ha : null)
      lines.push(`Superficie di calcolo: ${formatSurfaceHaACaForCalculation(centiare)}`)
      if (base != null && Number.isFinite(base) && calculated != null && Number.isFinite(calculated)) {
        lines.push(`Sanzione calcolata: ${formatEuroNumberForCalculation(base)} × ${formatSurfaceHaDecimalNumberForCalculation(centiare)} = ${formatEuroText(calculated)}`)
      }
    } else {
      lines.push('Superficie di calcolo: non disponibile')
    }
    return lines
  }

  if (categoria === 'RIDUZIONE') {
    if (base != null && Number.isFinite(base)) {
      if (codice.includes('PERCENTUALE') || base <= 100) {
        lines.push(`Riduzione prevista dal regolamento: ${base.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`)
      } else {
        lines.push(`Importo della riduzione previsto dal regolamento: ${formatEuroText(base)}`)
      }
    }
    return lines
  }

  if (categoria === 'CAUZIONE') {
    const value = amount != null && Number.isFinite(amount) ? amount : base
    if (value != null && Number.isFinite(value)) lines.push(`Cauzione da detrarre: - ${formatEuroText(Math.abs(value))}`)
    return lines
  }

  if (article === '30' && (categoria === 'ATTREZZATURA' || categoria === 'RIMBORSO')) {
    const value = amount != null && Number.isFinite(amount) ? amount : base
    const label = codice === 'NOTA_SPESE.C104.RA' ? 'Risarcimento attrezzature' : art30EquipmentLineLabel(voce)
    if (value != null && Number.isFinite(value)) lines.push(`${label}: ${formatEuroText(value)}`)
    return lines
  }

  if (categoria === 'SANZIONE') {
    const value = amount != null && Number.isFinite(amount) ? amount : base
    if (value != null && Number.isFinite(value)) {
      const label = ARTICLES_WITH_GRAVITA.has(article) ? 'Sanzione pecuniaria variabile' : 'Sanzione pecuniaria fissa'
      lines.push(`${label}: ${formatEuroText(value)}`)
    }
    return lines
  }

  if (base != null && Number.isFinite(base) && ['RIMBORSO', 'ATTREZZATURA', 'SPESE'].includes(categoria)) {
    const label = categoria === 'SPESE' ? 'Spese' : 'Rimborso'
    lines.push(`${label}: ${formatEuroText(base)}`)
    return lines
  }

  const displayed = formatVoceValue(voce)
  if (displayed && displayed !== '—') lines.push(`Importo applicato: ${displayed}`)
  return lines
}

function roundMoneyValue (value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

function buildAutomaticSanzioneCalculation (
  groups: SanzioneConsultivaGroup[],
  data: Record<string, any>,
  fields: LayerFieldInfo[],
  profile: { username: string, fullName: string },
  previousDraft: Record<string, any>
): Record<string, any> {
  const validGroups = groups || []
  if (!validGroups.length) return {}

  let sanzioneBase = 0
  let risarcimentoDanni = 0
  let rimborsoAttrezzature = 0
  let cauzioneDecurtata = 0
  let speseNotificaAutomatica = 0
  let riduzionePercentuale: number | null = null
  let riduzioneImporto: number | null = null
  const dettaglio: string[] = []
  const attrezzatureDettaglio: string[] = []

  validGroups.forEach(group => {
    dettaglio.push(`${formatArticleFallback(group.articoloViolato)} — ${displayViolationTitle(group)}`)
    const normaSanzionatoria = articleListTitle(group.articoliSanzione || [], group.articoloSanzione)
    if (normaSanzionatoria && normaSanzionatoria !== '—') {
      dettaglio.push(`- Norma sanzionatoria: ${normaSanzionatoria}`)
    }
    const articleNumber = normalizeArticleNumber(group.articoloViolato)
    const occurrence = calculationOccurrenceLabel(group, data, fields)
    const gravity = calculationGravityLabel(group, data)
    if (articleNumber === '15') {
      const tipoAbuso = art15AbuseTypeLabel(data, fields, group.codiceCasistica)
      if (tipoAbuso) dettaglio.push(`- Tipo di abuso: ${tipoAbuso}`)
    }
    if (articleNumber === '17') {
      const tipoComunicazione = art17CommunicationTypeLabel(data, fields, group.codiceCasistica)
      if (tipoComunicazione) dettaglio.push(`- Tipo comunicazione: ${tipoComunicazione}`)
    }
    if (occurrence) dettaglio.push(`- Occorrenza: ${occurrence}`)
    if (gravity) dettaglio.push(`- Grado di gravità: ${gravity}`)

    ;(group.voci || []).forEach(voce => {
      const parametro = voce.parametro || null
      const categoria = String(parametro?.categoria_parametro || '').toUpperCase()
      const codice = String(parametro?.codice_parametro || voce.codiceParametro || '').toUpperCase()
      const amount = voceAppliedAmount(voce)
      const voceDetailLines = calculationDetailLinesForVoce(group, voce, data)
      voceDetailLines.forEach(line => dettaglio.push(`- ${line}`))
      if (normalizeArticleNumber(group.articoloViolato) === '30' && ['ATTREZZATURA', 'RIMBORSO', 'CAUZIONE'].includes(categoria)) {
        attrezzatureDettaglio.push(...voceDetailLines)
      }


      if (categoria === 'RIDUZIONE') {
        const n = parseNumberInput(parametro?.valore_num)
        if (n != null && Number.isFinite(n)) {
          if (codice.includes('PERCENTUALE') || n <= 100) riduzionePercentuale = n
          else riduzioneImporto = n
        }
        return
      }

      if (amount == null || !Number.isFinite(amount)) return
      if (categoria === 'SANZIONE') sanzioneBase += amount
      else if (categoria === 'RISARCIMENTO') risarcimentoDanni += amount
      else if (categoria === 'RIMBORSO' || categoria === 'ATTREZZATURA') rimborsoAttrezzature += amount
      else if (categoria === 'CAUZIONE') cauzioneDecurtata += amount
      else if (categoria === 'SPESE') speseNotificaAutomatica += amount
    })
    dettaglio.push('')
  })

  const speseManuali = parseNumberInput(pickAttrCI(previousDraft || {}, ['sanzione_spese_notifica']))
  const speseNotifica = speseManuali != null && Number.isFinite(speseManuali)
    ? Math.max(0, speseManuali)
    : speseNotificaAutomatica

  // Gli importi e il dettaglio dell'Art. 30 costituiscono uno snapshot tecnico
  // definito nella fase AGR/TEC. La fase amministrativa deve applicarli senza
  // ricostruirli dai parametri correnti, che contengono valori unitari.
  const art30Snapshot = { ...(data || {}), ...(previousDraft || {}) }
  const art30SnapshotDetail = String(pickAttrCI(art30Snapshot, ['attrezzature_risarcimento_dettaglio']) || '')
  const art30SnapshotGrossRaw = pickAttrCI(art30Snapshot, ['attrezzature_risarcimento_importo'])
  const art30SnapshotCauzioneRaw = pickAttrCI(art30Snapshot, ['attrezzature_cauzione_decurtata'])
  const art30SnapshotNettoRaw = pickAttrCI(art30Snapshot, ['attrezzature_importo_netto'])
  const art30SnapshotGross = parseNumberInput(art30SnapshotGrossRaw)
  const art30SnapshotCauzione = parseNumberInput(art30SnapshotCauzioneRaw)
  const art30Selections = parseArt30EquipmentSelections(art30Snapshot)
  const art30DetailGross = art30Selections.reduce((sum, item) => sum + (Number(item.importo) || 0), 0)
  const hasArt30Snapshot = !!art30SnapshotDetail.trim() ||
    (art30SnapshotGrossRaw != null && art30SnapshotGrossRaw !== '') ||
    (art30SnapshotCauzioneRaw != null && art30SnapshotCauzioneRaw !== '') ||
    (art30SnapshotNettoRaw != null && art30SnapshotNettoRaw !== '')
  const hasArt30RealRaRowsInGroups = validGroups.some(group =>
    isArt30CaseCode(group.codiceCasistica) &&
    (group.voci || []).some(voce => String(voce.codiceParametro || '').toUpperCase() === 'NOTA_SPESE.C104.RA')
  )

  if (hasArt30Snapshot && !hasArt30RealRaRowsInGroups) {
    const calculatedRimborsoAttrezzature = rimborsoAttrezzature
    const calculatedCauzioneDecurtata = cauzioneDecurtata
    rimborsoAttrezzature = art30SnapshotGross != null && Number.isFinite(art30SnapshotGross)
      ? Math.max(0, art30SnapshotGross)
      : (art30DetailGross > 0 ? Math.max(0, art30DetailGross) : calculatedRimborsoAttrezzature)
    cauzioneDecurtata = art30CauzioneSelected(art30Snapshot)
      ? (art30SnapshotCauzione != null && Number.isFinite(art30SnapshotCauzione)
          ? Math.max(0, art30SnapshotCauzione)
          : calculatedCauzioneDecurtata)
      : 0
  }

  const importoNettoAttrezzature = Math.max(0, rimborsoAttrezzature - cauzioneDecurtata)
  const sanzioneRidotta = riduzioneImporto != null
    ? riduzioneImporto
    : riduzionePercentuale != null
      ? sanzioneBase * (riduzionePercentuale / 100)
      : null
  const sanzionePerTotale = sanzioneRidotta != null ? sanzioneRidotta : sanzioneBase
  const totale = sanzionePerTotale + risarcimentoDanni + importoNettoAttrezzature + speseNotifica
  const user = String(profile.fullName || profile.username || '').trim()


  const currentCalcDate = pickAttrCI(previousDraft, ['sanzione_calcolata_il'])
  const currentCalcUser = String(pickAttrCI(previousDraft, ['sanzione_calcolata_da']) || '').trim()

  return {
    sanzione_importo_base: roundMoneyValue(sanzioneBase),
    sanzione_importo_ridotta: sanzioneRidotta != null ? roundMoneyValue(sanzioneRidotta) : null,
    risarcimento_danni_importo: roundMoneyValue(risarcimentoDanni),
    sanzione_spese_notifica: roundMoneyValue(speseNotifica),
    attrezzature_risarcimento_importo: roundMoneyValue(rimborsoAttrezzature),
    attrezzature_cauzione_decurtata: roundMoneyValue(cauzioneDecurtata),
    attrezzature_importo_netto: roundMoneyValue(importoNettoAttrezzature),
    attrezzature_risarcimento_dettaglio: art30SnapshotDetail.trim() ? art30SnapshotDetail : attrezzatureDettaglio.join('\n'),
    pagamento_importo_totale: roundMoneyValue(totale),
    sanzione_dettaglio_calcolo: dettaglio.join('\n'),
    sanzione_calcolata_il: currentCalcDate || Date.now(),
    sanzione_calcolata_da: currentCalcUser || user
  }
}

function buildVoceLabel (raccordo: RegolamentoRaccordo, parametro?: SanzioneParametro | null): string {
  const cat = String(parametro?.categoria_parametro || '').toUpperCase()
  const fromRaccordo = voceDescriptionFromRaccordo(raccordo.descrizione)
  const fromParametro = sentenceFirst(stripNormPrefix(parametro?.descrizione || ''))
  const candidate = fromRaccordo || fromParametro
  const norm = normalizeToken(candidate)

  if (cat === 'SANZIONE') {
    const paramCode = String(parametro?.codice_parametro || '').toUpperCase()
    const gravitaMatch = paramCode.match(/SANZIONE\.ART42\.GRAVITA\.([1-4])$/)
    if (gravitaMatch) return `Sanzione pecuniaria - grado di gravità ${gravitaMatch[1]}`
    if (paramCode.startsWith('SANZIONE.ART41.')) {
      if (String(raccordo.codice_casistica || '').toUpperCase().includes('RECIDIVA')) return 'Sanzione pecuniaria - recidiva'
      return 'Sanzione pecuniaria'
    }
    if (norm.includes('SANZIONEFISSA') || norm.includes('MANCATORISPETTOLIMITI')) return 'Sanzione pecuniaria'
    if (norm.includes('IMPORTOMINIMO')) return 'Sanzione pecuniaria variabile - importo minimo'
    if (norm.includes('IMPORTOMASSIMO')) return 'Sanzione pecuniaria variabile - importo massimo'
    if (norm.includes('GRADODIGRAVITA1')) return 'Sanzione pecuniaria - grado di gravità 1'
    if (norm.includes('GRADODIGRAVITA2')) return 'Sanzione pecuniaria - grado di gravità 2'
    if (norm.includes('GRADODIGRAVITA3')) return 'Sanzione pecuniaria - grado di gravità 3'
    if (norm.includes('GRADODIGRAVITA4')) return 'Sanzione pecuniaria - grado di gravità 4'
    if (norm.includes('EUROPERETTARO')) return 'Sanzione pecuniaria per ettaro irrigato'
    return candidate || 'Sanzione pecuniaria'
  }

  if (cat === 'RISARCIMENTO') {
    if (norm.includes('RIMBORSOSPESAINTERVENTO')) return 'Rimborso spesa intervento'
    if (norm.includes('RISARCIMENTODANNI')) return 'Risarcimento danni'
    return candidate || 'Risarcimento da quantificare'
  }

  if (cat === 'ATTREZZATURA') return candidate || fromParametro || 'Rimborso attrezzatura'
  if (cat === 'CAUZIONE') return candidate || fromParametro || 'Cauzione'
  if (cat === 'TERMINE') return candidate || fromParametro || 'Termine / scadenza'
  if (cat === 'SPESE') return candidate || fromParametro || 'Spese'
  if (cat === 'RIDUZIONE') return candidate || fromParametro || 'Riduzione'
  if (cat === 'RIMBORSO') return candidate || fromParametro || 'Rimborso'
  return candidate || fromParametro || 'Voce applicabile'
}

function buildSanzioneGroups (
  casistiche: string[],
  raccordi: RegolamentoRaccordo[],
  parametri: SanzioneParametro[],
  articoli: RegolamentoArticolo[],
  data?: any,
  noteRows: NotaSpeseDetailRow[] = []
): SanzioneConsultivaGroup[] {
  const wanted = new Set(casistiche)
  const paramByCode = new Map(parametri.map(p => [p.codice_parametro, p]))
  const artByCode = new Map<string, RegolamentoArticolo>()
  articoli.forEach(article => {
    const rawCode = String(article.codice_articolo || '').trim().toUpperCase()
    const articleNumber = normalizeArticleNumber(rawCode || article.numero_articolo)
    if (rawCode) artByCode.set(rawCode, article)
    if (articleNumber) {
      artByCode.set(articleNumber, article)
      artByCode.set(`ART${articleNumber}`, article)
    }
  })
  const selectedRaccordi = raccordi.filter(r => wanted.has(r.codice_casistica))
  const pieListaCount = selectedRaccordi.filter(r => isPieListaParametro(paramByCode.get(r.codice_parametro) || null)).length
  const art30EquipmentSelections = parseArt30EquipmentSelections(data || {})
  const art30Equipment = new Set(art30EquipmentSelections.map(item => item.kind))
  const art30CauzioneImporto = Math.max(0, parseNumberInput(pickAttrCI(data || {}, ['attrezzature_cauzione_decurtata'])) || 0)
  const art30NoteSummary = notaSpeseSummaryForCase(noteRows, 'C104_DANNEGGIAMENTO_PERDITA_ATTREZZATURE', data || {})
  const hasArt30RealRaRows = (art30NoteSummary?.risarcimentoAttrezzature || 0) > 0
  const groups = new Map<string, SanzioneConsultivaGroup>()

  selectedRaccordi.forEach(r => {
    let parametro = paramByCode.get(r.codice_parametro) || null
    const pCode = String(r.codice_parametro || '').toUpperCase()
    const raccordoArt30 = isArt30CaseCode(r.codice_casistica)
    const raccordoArt30Kind = raccordoArt30
      ? art30EquipmentKindFromText(`${r.codice_parametro} ${r.descrizione} ${parametro?.descrizione || ''}`)
      : null

    // Per l'Art. 30 i raccordi identificano esclusivamente la tipologia e il
    // riferimento normativo. Codice, descrizione e importo applicati alla pratica
    // devono provenire sempre dallo snapshot tecnico congelato dal TI, anche quando
    // ATT-001...ATT-004 esistono nella tabella dei parametri correnti.
    const suppressArt30SnapshotVoce = !!raccordoArt30Kind && hasArt30RealRaRows
    if (raccordoArt30Kind && !hasArt30RealRaRows) {
      const matches = art30EquipmentSelections.filter(item => item.kind === raccordoArt30Kind)
      if (matches.length === 0) return
      const totalImporto = matches.reduce((sum, item) => sum + (Number(item.importo) || 0), 0)
      parametro = {
        codice_parametro: matches[0].codice || r.codice_parametro,
        categoria_parametro: 'ATTREZZATURA',
        valore_num: totalImporto,
        valore_testo: '',
        anno_riferimento: null,
        data_validita_da: null,
        data_validita_a: null,
        descrizione: matches[0].descrizione || ART30_EQUIPMENT_META[raccordoArt30Kind].label,
        note: 'Snapshot tecnico Art. 30'
      }
    }

    const articleForCase = getViolationArticleFromCase(r.codice_casistica)
    const grado = getGravitaForArticle(data || {}, articleForCase)
    if (pCode.includes('SANZIONE.ART42.GRAVITA.')) {
      const m = pCode.match(/GRAVITA\.(MIN|MAX|[1-4])$/)
      const suffix = m ? m[1] : ''
      if (grado) {
        if (suffix !== grado) return
      } else if (!['MIN', 'MAX'].includes(suffix)) {
        return
      }
    }

    let g = groups.get(r.codice_casistica)
    if (!g) {
      const articolo1617 = r.codice_casistica.includes('C114') ? selectedArticle1617(data || {}) : ''
      const articoloViolato = articolo1617 || r.articolo_violato
      const articoliViolati = splitArticleCodes(articoloViolato).map(c => artByCode.get(c)).filter(Boolean) as RegolamentoArticolo[]
      const articoliSanzione = splitArticleCodes(r.articolo_sanzione).map(c => artByCode.get(c)).filter(Boolean) as RegolamentoArticolo[]
      g = {
        codiceCasistica: r.codice_casistica,
        descrizione: raccordoMainDescription(r.descrizione),
        articoloViolato,
        articoloSanzione: r.articolo_sanzione,
        articoliViolati,
        articoliSanzione,
        voci: []
      }
      groups.set(r.codice_casistica, g)
    }

    // Il gruppo deve comunque esistere per mostrare l'Art. 30; si sopprime solo
    // la vecchia voce economica ricostruita dallo snapshot quando sono presenti
    // righe RA reali nella Nota spese.
    if (suppressArt30SnapshotVoce) return

    if (isArt30CaseCode(r.codice_casistica)) {
      const categoria = String(parametro?.categoria_parametro || '').toUpperCase()
      if (isPieListaParametro(parametro) && art30NoteSummary && roundMoneyValue(art30NoteSummary.baseSpese + art30NoteSummary.speseGenerali) <= 0) return
      if (categoria === 'ATTREZZATURA' || categoria === 'RIMBORSO') {
        const kind = art30EquipmentKindFromText(`${r.codice_parametro} ${r.descrizione} ${parametro?.descrizione || ''}`)
        if (!kind || !art30Equipment.has(kind)) return
      }
      if (categoria === 'CAUZIONE' && (hasArt30RealRaRows || !art30CauzioneSelected(data || {}))) return
    }

    const voceLabel = buildVoceLabel(r, parametro)
    if (!g.voci.some(v => v.codiceParametro === r.codice_parametro && v.descrizione === voceLabel && v.articoloSanzione === r.articolo_sanzione)) {
      const voceArticoliSanzione = splitArticleCodes(r.articolo_sanzione).map(c => artByCode.get(c)).filter(Boolean) as RegolamentoArticolo[]
      const noteTotalForCase = isPieListaParametro(parametro) ? notaSpeseTotalForCase(noteRows, r.codice_casistica, data || {}) : null
      const nsValue = isPieListaParametro(parametro)
        ? formatEuroText(noteTotalForCase != null ? noteTotalForCase : (pieListaCount === 1 ? (parseEuroTextValue(getNotaSpeseValueText(data || {})) || 0) : 0))
        : ''
      const art15Value = pCode.includes('SANZIONE.ART41') ? art15CalculatedValueText(data || {}, r.codice_casistica, parametro) : ''
      const comunicazioneTardivaValue = r.codice_casistica.includes('C114') && pCode.includes('EURO_HA')
        ? comunicazioneTardivaCalculatedValueText(data || {}, parametro)
        : ''
      const isArt30 = isArt30CaseCode(r.codice_casistica)
      const art30Categoria = String(parametro?.categoria_parametro || '').toUpperCase()
      const art30Kind = isArt30 && ['ATTREZZATURA', 'RIMBORSO'].includes(art30Categoria)
        ? art30EquipmentKindFromText(`${r.codice_parametro} ${r.descrizione} ${parametro?.descrizione || ''}`)
        : null
      const art30EquipmentMatches = art30Kind ? art30EquipmentSelections.filter(item => item.kind === art30Kind) : []
      const art30EquipmentValue = art30EquipmentMatches.length > 0 ? art30EquipmentMatches.reduce((sum, item) => sum + (Number(item.importo) || 0), 0) : null
      const art30CauzioneValue = isArt30 && art30Categoria === 'CAUZIONE' && art30CauzioneImporto > 0
        ? art30CauzioneImporto
        : null
      g.voci.push({
        codiceParametro: r.codice_parametro,
        descrizione: voceLabel,
        articoloSanzione: r.articolo_sanzione,
        articoliSanzione: voceArticoliSanzione,
        parametro,
        valueOverride: nsValue || art15Value || comunicazioneTardivaValue || (art30CauzioneValue != null ? formatEuroText(art30CauzioneValue) : '') || (art30EquipmentValue != null ? formatEuroText(art30EquipmentValue) : '')
      })
    }
  })

  const art30Group = Array.from(groups.values()).find(group => isArt30CaseCode(group.codiceCasistica))
  if (art30Group) {
    const exactSummary = notaSpeseSummaryForCase(noteRows, art30Group.codiceCasistica, data || {})
    const eligibleNotaSpeseGroups = Array.from(groups.values()).filter(group => ['8', '27', '30', '39'].includes(normalizeArticleNumber(group.articoloViolato)))
    const overallFallback = eligibleNotaSpeseGroups.length === 1 && normalizeArticleNumber(eligibleNotaSpeseGroups[0].articoloViolato) === '30'
      ? normalizeNotaSpeseAmount(numericAttr(data || {}, ['ns_totale_complessivo']))
      : null

    // Righe RA reali: importo già netto (eventuale cauzione già decurtata) e
    // senza maggiorazione per spese generali. Vengono esposte esplicitamente.
    if (exactSummary && exactSummary.risarcimentoAttrezzature > 0) {
      const syntheticRa: SanzioneParametro = {
        codice_parametro: 'NOTA_SPESE.C104.RA',
        categoria_parametro: 'ATTREZZATURA',
        valore_num: null,
        valore_testo: '',
        anno_riferimento: null,
        data_validita_da: null,
        data_validita_a: null,
        descrizione: 'Risarcimento attrezzature da Nota spese',
        note: ''
      }
      art30Group.voci.push({
        codiceParametro: syntheticRa.codice_parametro,
        descrizione: syntheticRa.descrizione,
        articoloSanzione: art30Group.articoloSanzione,
        articoliSanzione: art30Group.articoliSanzione,
        parametro: syntheticRa,
        valueOverride: formatEuroText(exactSummary.risarcimentoAttrezzature)
      })
    }

    // Le altre voci di Nota spese (AT/PR/RU/SL/PF) concorrono con le spese
    // generali. Se il dettaglio non è leggibile ma l'Art. 30 è l'unica violazione
    // della pratica che può avere Nota spese, usa in sicurezza il totale salvato
    // sul rapporto come fallback, evitando che l'importo scompaia dall'istruttoria.
    const nonRaTotal = exactSummary
      ? roundMoneyValue(exactSummary.baseSpese + exactSummary.speseGenerali)
      : (overallFallback != null && Number.isFinite(overallFallback) && !hasArt30RealRaRows ? roundMoneyValue(overallFallback) : null)

    if (nonRaTotal != null && nonRaTotal > 0) {
      const alreadyPresent = art30Group.voci.some(voce => isPieListaParametro(voce.parametro) || String(voce.codiceParametro || '').toUpperCase() === 'NOTA_SPESE.C104')
      if (!alreadyPresent) {
        const syntheticParam: SanzioneParametro = {
          codice_parametro: 'NOTA_SPESE.C104',
          categoria_parametro: 'RISARCIMENTO',
          valore_num: null,
          valore_testo: 'A piè di lista',
          anno_riferimento: null,
          data_validita_da: null,
          data_validita_a: null,
          descrizione: 'Nota spese',
          note: ''
        }
        art30Group.voci.push({
          codiceParametro: syntheticParam.codice_parametro,
          descrizione: 'Nota spese',
          articoloSanzione: art30Group.articoloSanzione,
          articoliSanzione: art30Group.articoliSanzione,
          parametro: syntheticParam,
          valueOverride: formatEuroText(nonRaTotal)
        })
      }
    }
  }

  const result = Array.from(groups.values())
  result.forEach(group => {
    if (normalizeArticleNumber(group.articoloViolato) === '30') {
      group.voci = [...group.voci].sort((a, b) => art30VoceOrder(a) - art30VoceOrder(b))
    }
  })

  return result.sort((a, b) => {
    const an = firstArticleNumberFromCodes(a.articoloViolato)
    const bn = firstArticleNumberFromCodes(b.articoloViolato)
    if (an !== bn) return an - bn
    return String(a.codiceCasistica || '').localeCompare(String(b.codiceCasistica || ''), 'it')
  })
}

function articleTitleLine (article?: RegolamentoArticolo | null, fallback?: string): string {
  if (article) {
    const code = formatArticleCode(article.codice_articolo)
    if (normalizeArticleNumber(article.codice_articolo || article.numero_articolo) === '41') {
      return 'Art. 41 — Sanzioni per prelievi abusivi e per inosservanza termini'
    }
    return article.titolo_articolo ? `${code} — ${article.titolo_articolo}` : code
  }
  return formatArticleFallback(fallback)
}

function articleListTitle (articles: RegolamentoArticolo[], fallback: string): string {
  const list = Array.isArray(articles) ? articles.filter(Boolean) : []
  if (!list.length) return formatArticleFallback(fallback)
  return list.map(a => articleTitleLine(a)).join('; ')
}

/**
 * Equivalente non-React di useSanzioneConsultivaState: stessa identica logica di
 * business (query alle 3 tabelle di consultazione + costruzione gruppi), senza lo
 * strato di stato/useEffect che serve solo al form React di editing-amm. Nessuna
 * riga della logica di calcolo è stata modificata rispetto all'originale.
 */
async function computeSanzioneConsultivaGroups (cfg: any, data: any, layerFields: LayerFieldInfo[]): Promise<{ groups: SanzioneConsultivaGroup[], urlsReady: boolean, casistiche: string[] }> {
  const parametriUrl = normalizeLookupTableUrl(cfg.parametriSanzioniUrl)
  const articoliUrl = normalizeLookupTableUrl(cfg.regolamentoArticoliUrl)
  const raccordiUrl = normalizeLookupTableUrl(cfg.regolamentoRaccordiUrl)
  const urlsReady = !!parametriUrl && !!articoliUrl && !!raccordiUrl
  const casistiche = deriveSanzioneCasistiche(data || {}, layerFields || [])
  if (!urlsReady || !casistiche.length) {
    return { groups: [], urlsReady, casistiche }
  }
  const refMs = getSanzioneReferenceDate(data || {})
  const [paramRows, artRows, raccordiRows, noteRows] = await Promise.all([
    queryActiveTableRows<any>(parametriUrl, ['codice_parametro ASC']),
    queryActiveTableRows<any>(articoliUrl, ['numero_articolo ASC']),
    queryActiveTableRows<any>(raccordiUrl, ['codice_casistica ASC']),
    queryNotaSpeseDetailRowsForPractice(data || {}).catch(() => [] as NotaSpeseDetailRow[])
  ])
  const parametri = paramRows.map(normalizeParam).filter(p => p.codice_parametro && isRowValidAt(p, refMs))
  const articoli = artRows.map(normalizeArticle).filter(a => a.codice_articolo && isRowValidAt(a, refMs))
  const raccordi = raccordiRows.map(normalizeRaccordo).filter(r => r.codice_casistica && isRowValidAt(r, refMs))
  const groups = buildSanzioneGroups(casistiche, raccordi, parametri, articoli, data || {}, noteRows)
  return { groups, urlsReady, casistiche }
}

/**
 * Funzione unica esposta dal modulo: dato oggetto config (con le tre URL di
 * consultazione), dati del record, campi e profilo utente, calcola la sanzione
 * automatica esattamente come farebbe il form di editing-amm — utilizzabile da
 * qualunque widget/azione (es. approvazione DT), senza dipendere da React.
 */
export async function computeSanzioneAutomatica (
  cfg: { parametriSanzioniUrl?: string, regolamentoArticoliUrl?: string, regolamentoRaccordiUrl?: string },
  data: Record<string, any>,
  fields: LayerFieldInfo[],
  profile: { username: string, fullName: string },
  previousDraft: Record<string, any>
): Promise<Record<string, any>> {
  const { groups } = await computeSanzioneConsultivaGroups(cfg, data, fields)
  return buildAutomaticSanzioneCalculation(groups, data, fields, profile, previousDraft)
}
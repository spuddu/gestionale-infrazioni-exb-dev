/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent } from 'jimu-core'
import RapportoPdfViewer from '../../../_shared/gii-anteprime/rapporto/rapporto-pdf-viewer'
import { buildVerbalePdf, getVerbalePdfFilePrefix } from '../../../_shared/gii-anteprime/verbale/verbale-pdf-builder'
import type { IMConfig, SummaryFieldConfig } from '../config'
import { defaultConfig } from '../config'

const LOG_EVENTI_CICLI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

type RoleCode = 'TI_AMM' | 'RI_AMM' | 'DA' | 'ADMIN' | string

type SelectedState = {
  ds?: any | null
  dsId?: string
  oid: number | null
  idFieldName: string
  layerUrl: string
  data: any | null
  source: 'datasource' | 'editIntent' | 'selection' | 'none'
  sig: string
}

type EditIntentInfo = {
  oid: number | null
  dsId?: string
  layerUrl?: string
  idFieldName?: string
  data?: any | null
  ts?: number
}

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

type AdminFieldKind = 'text' | 'textarea' | 'date' | 'number' | 'domain' | 'readonly-date' | 'readonly-text'

type AdminField = {
  name: string
  label: string
  kind: AdminFieldKind
  group: 'atto' | 'verbale' | 'notifica' | 'sanzione' | 'attrezzature' | 'pagamento' | 'bonifico' | 'chiusura'
  placeholder?: string
  full?: boolean
  readonly?: boolean
}

const ADMIN_FIELDS: AdminField[] = [
  { group: 'atto', name: 'tipo_atto_amm', label: 'Tipo atto amministrativo', kind: 'domain' },
  { group: 'atto', name: 'protocollo_istanza_numero', label: 'Protocollo istanza', kind: 'text' },
  { group: 'atto', name: 'protocollo_istanza_data', label: 'Data istanza', kind: 'date' },
  { group: 'atto', name: 'oggetto_atto_amm', label: 'Oggetto atto amministrativo', kind: 'text', full: true },
  { group: 'verbale', name: 'numero_verbale', label: 'Numero verbale (assegnato alla chiusura)', kind: 'readonly-text', readonly: true },
  { group: 'verbale', name: 'data_verbale', label: 'Data verbale (assegnata alla chiusura)', kind: 'readonly-date', readonly: true },
  { group: 'verbale', name: 'note_atto_amm', label: 'Note amministrative', kind: 'textarea', full: true },

  { group: 'notifica', name: 'protocollo_verbale_numero', label: 'Numero protocollo verbale', kind: 'text' },
  { group: 'notifica', name: 'protocollo_verbale_data', label: 'Data protocollo verbale', kind: 'date' },
  { group: 'notifica', name: 'notifica_tipo', label: 'Tipo notifica', kind: 'domain' },
  { group: 'notifica', name: 'notifica_data', label: 'Data notifica', kind: 'date' },
  { group: 'notifica', name: 'notifica_esito', label: 'Esito notifica', kind: 'domain' },
  { group: 'notifica', name: 'notifica_estremi', label: 'Estremi notifica', kind: 'textarea', full: true },

  { group: 'sanzione', name: 'sanzione_importo_base', label: 'Importo sanzione base', kind: 'number' },
  { group: 'sanzione', name: 'sanzione_importo_ridotta', label: 'Importo sanzione ridotta', kind: 'number' },
  { group: 'sanzione', name: 'risarcimento_danni_importo', label: 'Importo risarcimento danni', kind: 'number' },
  { group: 'sanzione', name: 'sanzione_spese_notifica', label: 'Spese di notifica', kind: 'number' },
  { group: 'sanzione', name: 'sanzione_dettaglio_calcolo', label: 'Dettaglio calcolo sanzione', kind: 'textarea', full: true },
  { group: 'sanzione', name: 'sanzione_calcolata_il', label: 'Sanzione calcolata il', kind: 'readonly-date', readonly: true },
  { group: 'sanzione', name: 'sanzione_calcolata_da', label: 'Sanzione calcolata da', kind: 'readonly-text', readonly: true },

  { group: 'attrezzature', name: 'attrezzature_cauzione_presente', label: 'Cauzione presente', kind: 'domain' },
  { group: 'attrezzature', name: 'attrezzature_rimborso_importo', label: 'Rimborso attrezzature', kind: 'number' },
  { group: 'attrezzature', name: 'attrezzature_cauzione_decurtata', label: 'Cauzione decurtata', kind: 'number' },
  { group: 'attrezzature', name: 'attrezzature_importo_netto', label: 'Importo netto attrezzature', kind: 'number' },
  { group: 'attrezzature', name: 'attrezzature_rimborso_dettaglio', label: 'Dettaglio rimborso attrezzature', kind: 'textarea', full: true, placeholder: 'Indicare attrezzature, quantità e importi.' },
  { group: 'attrezzature', name: 'attrezzature_note', label: 'Note rimborso attrezzature', kind: 'textarea', full: true },

  { group: 'pagamento', name: 'pagamento_modalita', label: 'Modalità pagamento', kind: 'domain' },
  { group: 'pagamento', name: 'pagamento_importo_totale', label: 'Importo totale da pagare', kind: 'number' },
  { group: 'pagamento', name: 'pagamento_scadenza', label: 'Scadenza pagamento', kind: 'date' },
  { group: 'pagamento', name: 'pagamento_stato', label: 'Stato pagamento', kind: 'domain' },
  { group: 'pagamento', name: 'pagamento_note', label: 'Note pagamento', kind: 'textarea', full: true },
  { group: 'pagamento', name: 'pagopa_iuv', label: 'IUV pagoPA', kind: 'text' },
  { group: 'pagamento', name: 'pagopa_codice_avviso', label: 'Codice avviso pagoPA', kind: 'text' },

  { group: 'bonifico', name: 'bonifico_conto_cod', label: 'Conto corrente bonifico', kind: 'domain' },
  { group: 'bonifico', name: 'bonifico_iban_snapshot', label: 'IBAN bonifico', kind: 'text' },
  { group: 'bonifico', name: 'bonifico_intestatario_snapshot', label: 'Intestatario conto bonifico', kind: 'text' },
  { group: 'bonifico', name: 'bonifico_causale', label: 'Causale bonifico', kind: 'textarea', full: true },
  { group: 'bonifico', name: 'bonifico_cro_trn', label: 'CRO/TRN bonifico', kind: 'text' },
  { group: 'bonifico', name: 'bonifico_data_accredito', label: 'Data accredito bonifico', kind: 'date' },

  { group: 'chiusura', name: 'verbale_pdf_generato_il', label: 'Verbale PDF generato il', kind: 'readonly-date', readonly: true },
  { group: 'chiusura', name: 'verbale_pdf_generato_da', label: 'Verbale PDF generato da', kind: 'readonly-text', readonly: true },
  { group: 'chiusura', name: 'istruttoria_amm_chiusa_il', label: 'Istruttoria amministrativa chiusa il', kind: 'readonly-date', readonly: true },
  { group: 'chiusura', name: 'istruttoria_amm_chiusa_da', label: 'Istruttoria amministrativa chiusa da', kind: 'readonly-text', readonly: true }
]

const MONEY_FIELDS = new Set([
  'sanzione_importo_base',
  'sanzione_importo_ridotta',
  'risarcimento_danni_importo',
  'sanzione_spese_notifica',
  'attrezzature_rimborso_importo',
  'attrezzature_cauzione_decurtata',
  'attrezzature_importo_netto',
  'pagamento_importo_totale'
])

const PAYMENT_COMMON_FIELDS = ['pagamento_modalita', 'pagamento_importo_totale', 'pagamento_scadenza', 'pagamento_stato']
const PAYMENT_NOTE_FIELDS = ['pagamento_note']
const PAGOPA_FIELDS = ['pagopa_iuv', 'pagopa_codice_avviso']
const BONIFICO_FIELDS = ['bonifico_conto_cod', 'bonifico_iban_snapshot', 'bonifico_intestatario_snapshot', 'bonifico_causale', 'bonifico_cro_trn', 'bonifico_data_accredito']

const SYSTEM_CALCULATED_ADMIN_FIELDS = new Set([
  'numero_verbale',
  'data_verbale',
  'sanzione_importo_base',
  'sanzione_importo_ridotta',
  'risarcimento_danni_importo',
  'sanzione_spese_notifica',
  'sanzione_dettaglio_calcolo',
  'sanzione_calcolata_il',
  'sanzione_calcolata_da',
  'attrezzature_rimborso_importo',
  'attrezzature_cauzione_decurtata',
  'attrezzature_importo_netto',
  'attrezzature_rimborso_dettaglio',
  'pagamento_importo_totale'
])

function isSystemCalculatedAdminField (name: string): boolean {
  return SYSTEM_CALCULATED_ADMIN_FIELDS.has(String(name || ''))
}

type PaymentMode = '' | 'PAGOPA' | 'BONIFICO' | 'MISTO' | 'ALTRO'

function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
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

function pickOidFromData (data: any, idFieldName: string): number | null {
  const raw = pickAttrCI(data, [idFieldName, 'OBJECTID', 'ObjectId', 'objectid', 'objectId', 'FID'])
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function safeJsonParse (raw: string | null): any | null {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function readEditIntent (): EditIntentInfo | null {
  try {
    const fromWindow: any = (window as any).__giiEdit || null
    const fromStorage: any = safeJsonParse(sessionStorage.getItem('GII_EDIT_INTENT'))
    const j: any = fromWindow || fromStorage || null
    if (!j) return null
    const oid = j?.oid != null && j?.oid !== '' ? Number(j.oid) : NaN
    const idFieldName = String(j?.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
    const layerUrl = normalizeFeatureLayerUrl(j?.layerUrl || '')
    const dsId = String(j?.dsId || j?.dataSourceId || '').trim()
    const data = j?.data || null
    if (!Number.isFinite(oid) && !data) return null
    const oidFromData = pickOidFromData(data, idFieldName)
    return {
      oid: Number.isFinite(oid) ? Number(oid) : oidFromData,
      layerUrl,
      dsId,
      idFieldName,
      data,
      ts: Number(j?.ts || Date.now())
    }
  } catch {
    return null
  }
}

function readSelectionIntent (): EditIntentInfo | null {
  try {
    const sel: any = (window as any).__giiSelection || null
    const oidRaw = sel?.oid ?? sessionStorage.getItem('GII_SELECTED_OID')
    const oid = oidRaw != null && oidRaw !== '' ? Number(oidRaw) : NaN
    const layerUrl = normalizeFeatureLayerUrl(sel?.layerUrl || sessionStorage.getItem('GII_SELECTED_LAYER_URL') || '')
    const dsId = String(sel?.dsId || sel?.dataSourceId || sessionStorage.getItem('GII_SELECTED_DS_ID') || '').trim()
    const idFieldName = String(sel?.idFieldName || sessionStorage.getItem('GII_SELECTED_IDFIELD') || 'OBJECTID').trim() || 'OBJECTID'
    const data = sel?.data || safeJsonParse(sessionStorage.getItem('GII_SELECTED_DATA')) || null
    const oidFromData = pickOidFromData(data, idFieldName)
    if (!Number.isFinite(oid) && !oidFromData && !data) return null
    return {
      oid: Number.isFinite(oid) ? Number(oid) : oidFromData,
      layerUrl,
      dsId,
      idFieldName,
      data,
      ts: Date.now()
    }
  } catch {
    return null
  }
}

function selectionStateFromIntent (intent: EditIntentInfo | null, source: 'editIntent' | 'selection'): SelectedState {
  if (!intent) return { ds: null, oid: null, idFieldName: 'OBJECTID', layerUrl: '', data: null, source: 'none', sig: 'none' }
  const idFieldName = String(intent.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
  const oid = intent.oid != null && Number.isFinite(Number(intent.oid)) ? Number(intent.oid) : pickOidFromData(intent.data, idFieldName)
  const layerUrl = normalizeFeatureLayerUrl(intent.layerUrl || '')
  return {
    ds: null,
    dsId: String(intent.dsId || '').trim() || undefined,
    oid: oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null,
    idFieldName,
    layerUrl,
    data: intent.data || null,
    source,
    sig: `${source}|${layerUrl}|${oid ?? ''}|${Number(intent.ts || 0)}`
  }
}

function normalizeRole (v: any): string {
  const s = String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (s === '7') return 'ADMIN'
  if (s === '6') return 'DA'
  if (s === '4') return 'RI'
  if (s === '2') return 'TI'
  return s
}

function normalizeArea (v: any): string {
  const s = String(v ?? '').trim().toUpperCase()
  if (s === '1') return 'AMM'
  if (s === '2') return 'AGR'
  if (s === '3') return 'TEC'
  if (s.includes('AMMIN')) return 'AMM'
  if (s.includes('AGR')) return 'AGR'
  if (s.includes('TEC')) return 'TEC'
  return s
}

function readUserProfile (): { role: RoleCode, username: string, fullName: string, label: string } {
  try {
    const info: any = (window as any).__giiUserRole || {}
    let role = normalizeRole(info?.profiloCod || info?.profilo_cod || info?.ruoloCod || info?.ruolo_cod || info?.ruoloLabel || info?.ruolo)
    const area = normalizeArea(info?.areaCod || info?.area_cod || info?.areaLabel || info?.area)
    if (role === 'TI' && area === 'AMM') role = 'TI_AMM'
    if (role === 'RI' && area === 'AMM') role = 'RI_AMM'
    if (!role && (info?.isWorkflowAdmin || info?.isAdmin)) role = 'ADMIN'
    const username = String(info?.username || (window as any).__giiUser?.username || '').trim()
    const fullName = String(info?.fullName || info?.full_name || username || '').trim()
    const label = String(info?.profiloLabel || info?.ruoloFull || role || '').trim()
    return { role, username, fullName, label }
  } catch {
    return { role: '', username: '', fullName: '', label: '' }
  }
}

function isAllowedAdminRole (role: string): boolean {
  return ['TI_AMM', 'RI_AMM', 'DA', 'ADMIN'].includes(String(role || '').toUpperCase())
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

function dateInputValue (v: any): string {
  const d = toDateObj(v)
  if (!d) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function fromDateInputValue (s: string): number | null {
  const v = String(s || '').trim()
  if (!v) return null
  const d = new Date(`${v}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

function formatValue (v: any): string {
  if (v == null || v === '') return '—'
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '—' : v.toLocaleDateString('it-IT')
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—'
  if (typeof v === 'boolean') return v ? 'Sì' : 'No'
  return String(v)
}

function formatMoney (v: any): string {
  if (v == null || v === '') return ''
  const n = Number(String(v).replace(',', '.'))
  if (!Number.isFinite(n)) return String(v)
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatEuroText (v: any): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function looksLikeDateField (name: string): boolean {
  return /(^dt_|data|_data|date|_il$)/i.test(String(name || ''))
}

function getDataSourceUrl (ds: any): string {
  try {
    return normalizeFeatureLayerUrl(ds?.getDataSourceJson?.()?.url || ds?.dataSourceJson?.url || '')
  } catch {
    return ''
  }
}

function realFieldName (fields: LayerFieldInfo[], wanted: string): string | null {
  const w = String(wanted || '').toLowerCase()
  const f = fields.find(x => String(x.name).toLowerCase() === w)
  return f?.name || null
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

function domainLabel (field: LayerFieldInfo | null, raw: any): string {
  if (raw == null || raw === '') return '—'
  const opts = getDomainOptions(field)
  const found = opts.find(o => String(o.code) === String(raw))
  return found ? found.name : String(raw)
}

function normalizeToken (v: any): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function normalizePaymentModeCandidate (v: any): PaymentMode {
  const t = normalizeToken(v)
  if (!t) return ''
  if (t.includes('PAGOPA') || t.includes('PAGOAP')) return 'PAGOPA'
  if (t.includes('BONIFICO')) return 'BONIFICO'
  if (t.includes('MISTO') || t.includes('ENTRAMBI')) return 'MISTO'
  if (t.includes('ALTRO')) return 'ALTRO'
  return ''
}

function getPaymentMode (draft: Record<string, any>, fields: LayerFieldInfo[]): PaymentMode {
  const lf = getFieldInfo(fields, 'pagamento_modalita')
  const raw = pickAttrCI(draft, [lf?.name || 'pagamento_modalita', 'pagamento_modalita'])
  const fromRaw = normalizePaymentModeCandidate(raw)
  if (fromRaw) return fromRaw
  if (lf?.domain?.codedValues) {
    const label = domainLabel(lf, raw)
    const fromLabel = normalizePaymentModeCandidate(label)
    if (fromLabel) return fromLabel
  }
  return ''
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

function filterAttrsForLayer (attrs: Record<string, any>, fields: LayerFieldInfo[]): Record<string, any> {
  if (!fields.length) return attrs
  const nameMap = new Map<string, string>()
  for (const f of fields) nameMap.set(String(f.name).toLowerCase(), String(f.name))
  const out: Record<string, any> = {}
  for (const k of Object.keys(attrs)) {
    const realName = nameMap.get(k.toLowerCase())
    if (realName) out[realName] = attrs[k]
  }
  return out
}

function sqlQuote (v: any): string {
  return `'${String(v ?? '').replace(/'/g, "''")}'`
}

function globalIdVariantsForLog (raw: any): string[] {
  const s = String(raw ?? '').trim()
  if (!s) return []
  const clean = s.replace(/[{}]/g, '').trim()
  const variants = [s]
  if (clean) {
    variants.push(clean)
    variants.push(`{${clean}}`)
  }
  return Array.from(new Set(variants.filter(Boolean)))
}

function parentGlobalIdWhereForLog (raw: any): string {
  const variants = globalIdVariantsForLog(raw)
  return variants.length ? variants.map(g => `parent_globalid = ${sqlQuote(g)}`).join(' OR ') : '1=0'
}

function getLogObjectIdValue (attrs: any, layer?: any): any {
  const oidField = String(layer?.objectIdField || 'OBJECTID')
  return pickAttrCI(attrs, [oidField, 'OBJECTID', 'ObjectID', 'ObjectId', 'objectId', 'objectid'])
}

function parseJsonObject (v: any): Record<string, any> {
  if (!v) return {}
  if (typeof v === 'object' && !Array.isArray(v)) return { ...(v as any) }
  try {
    const parsed = JSON.parse(String(v))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeAuditComparable (v: any): string {
  if (v == null) return ''
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : String(v.getTime())
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'boolean') return v ? '1' : '0'
  return String(v).trim()
}

function toAuditStoredValue (v: any): any {
  if (v == null) return ''
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.getTime()
  if (typeof v === 'number') return Number.isFinite(v) ? v : ''
  if (typeof v === 'boolean') return v ? 1 : 0
  return String(v).trim()
}

function buildAuditDeltaMaps (prevAttrs: Record<string, any>, nextAttrs: Record<string, any>, fields: string[]): { oldMap: Record<string, any>, newMap: Record<string, any> } {
  const oldMap: Record<string, any> = {}
  const newMap: Record<string, any> = {}
  for (const field of Array.from(new Set((fields || []).filter(Boolean)))) {
    const before = pickAttrCI(prevAttrs, [field])
    const after = pickAttrCI(nextAttrs, [field])
    if (normalizeAuditComparable(before) === normalizeAuditComparable(after)) continue
    oldMap[field] = toAuditStoredValue(before)
    newMap[field] = toAuditStoredValue(after)
  }
  return { oldMap, newMap }
}

function mergeAuditCycleMaps (baseOld: Record<string, any>, baseNew: Record<string, any>, deltaOld: Record<string, any>, deltaNew: Record<string, any>) {
  const oldMap: Record<string, any> = { ...(baseOld || {}) }
  const newMap: Record<string, any> = { ...(baseNew || {}) }
  const changedKeys = Array.from(new Set([...Object.keys(deltaOld || {}), ...Object.keys(deltaNew || {})]))
  for (const field of changedKeys) {
    if (!(field in oldMap)) oldMap[field] = deltaOld[field]
    newMap[field] = deltaNew[field]
    if (normalizeAuditComparable(oldMap[field]) === normalizeAuditComparable(newMap[field])) {
      delete oldMap[field]
      delete newMap[field]
    }
  }
  const fields = Object.keys(newMap).sort((a, b) => a.localeCompare(b))
  return { oldMap, newMap, fields }
}

async function queryCurrentLayerAttrsByOid (layer: any, oidFieldName: string, oid: number): Promise<Record<string, any>> {
  if (!layer?.queryFeatures) return {}
  if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
  const idField = String(layer.objectIdField || oidFieldName || 'OBJECTID')
  const q = layer.createQuery ? layer.createQuery() : {}
  q.where = `${idField} = ${Number(oid)}`
  q.outFields = ['*']
  q.returnGeometry = false
  q.num = 1
  const res = await layer.queryFeatures(q)
  return res?.features?.[0]?.attributes || {}
}

async function resolveLayerForEdit (ds: any): Promise<any | null> {
  if (!ds) return null
  try {
    const raw = (ds as any)?.getLayer?.() || (ds as any)?.getJSAPILayer?.() || (ds as any)?.getJsApiLayer?.() || (ds as any)?.layer || null
    const resolved = await Promise.resolve(raw)
    const layer = (resolved && (resolved.layer || resolved)) || null
    if (layer && typeof layer.applyEdits === 'function') return layer
  } catch { }
  return null
}

async function readLayerFields (ds: any): Promise<LayerFieldInfo[]> {
  const byName: Record<string, LayerFieldInfo> = {}
  try {
    const schema = ds?.getSchema?.()
    const fobj = schema?.fields || {}
    for (const name of Object.keys(fobj)) {
      const f = fobj[name]
      byName[name] = {
        name,
        alias: String(f?.alias || f?.label || f?.title || name),
        type: String(f?.type || ''),
        domain: f?.domain || null,
        editable: f?.editable !== false
      }
    }
  } catch { }
  try {
    const layer = await resolveLayerForEdit(ds)
    const fields = (layer?.fields || []) as any[]
    for (const f of fields) {
      if (!f?.name) continue
      byName[f.name] = {
        name: String(f.name),
        alias: String(f.alias || f.name),
        type: String(f.type || ''),
        domain: f.domain || null,
        editable: f.editable !== false
      }
    }
  } catch { }
  return Object.values(byName)
}


async function refreshDs (ds: any): Promise<void> {
  if (!ds) return
  let root = ds
  try { while (root?.belongToDataSource) root = root.belongToDataSource } catch { }
  const list: any[] = root ? [root] : []
  try {
    const derived = root?.getAllDerivedDataSources?.() || []
    if (derived?.length) list.push(...derived)
  } catch { }
  for (const d of list) {
    try {
      const q = d.getCurrentQueryParams?.() || null
      if (d.clearSourceRecords) d.clearSourceRecords()
      if (d.addVersion) d.addVersion()
      if (d.load) { if (q) await d.load(q); else await d.load() }
    } catch { }
  }
}

function Section (props: { title: string, children: React.ReactNode, right?: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #b9d1ea', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        background: 'linear-gradient(90deg, #0d3b66, #155e9d)',
        color: '#fff',
        padding: '8px 12px',
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: 0.25,
        textTransform: 'uppercase'
      }}>
        <span>{props.title}</span>
        {props.right}
      </div>
      <div style={{ padding: 12 }}>{props.children}</div>
    </section>
  )
}

function InfoBox (props: { children: React.ReactNode, kind?: 'info' | 'warn' | 'ok' }) {
  const kind = props.kind || 'info'
  const st: React.CSSProperties = kind === 'warn'
    ? { background: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa' }
    : kind === 'ok'
      ? { background: '#ecfdf3', color: '#166534', borderColor: '#bbf7d0' }
      : { background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }
  return <div style={{ ...st, border: '1px solid', borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.35 }}>{props.children}</div>
}

function BlockingDialog (props: { kind: 'ok' | 'err' | 'warn', title: string, text: string, onClose: () => void }) {
  const color = props.kind === 'ok' ? '#166534' : props.kind === 'warn' ? '#9a3412' : '#991b1b'
  const bg = props.kind === 'ok' ? '#ecfdf3' : props.kind === 'warn' ? '#fff7ed' : '#fef2f2'
  return (
    <div style={{ position: 'fixed', zIndex: 2147483000, inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role='dialog' aria-modal='true' style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 14, boxShadow: '0 18px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ background: bg, color, padding: '14px 16px', fontWeight: 800, fontSize: 15, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{props.title}</div>
        <div style={{ padding: 16, color: '#111827', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{props.text}</div>
        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type='button' onClick={props.onClose} style={{ border: '1px solid #0d3b66', background: '#0d3b66', color: '#fff', borderRadius: 9, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}>OK</button>
        </div>
      </div>
    </div>
  )
}

function FieldGrid (props: { fields: SummaryFieldConfig[], data: any, layerFields?: LayerFieldInfo[], labelSize: number, valueSize: number }) {
  const fields = (Array.isArray(props.fields) ? props.fields : []).filter(f => String(f?.name || '').trim())
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
      {fields.map(f => {
        const raw = pickAttrCI(props.data, [f.name])
        const lf = props.layerFields ? getFieldInfo(props.layerFields, f.name) : null
        const hasDomain = !!lf?.domain?.codedValues
        const val = hasDomain ? domainLabel(lf, raw) : looksLikeDateField(f.name) ? formatDateValue(raw) : formatValue(raw)
        return (
          <div key={`${f.name}-${f.label}`} style={{ background: '#f6f7f9', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 9, padding: '8px 10px', minWidth: 0 }}>
            <div style={{ color: '#6b7280', fontSize: props.labelSize, fontWeight: 700, marginBottom: 3, overflowWrap: 'anywhere' }}>{f.label || f.name}</div>
            <div style={{ color: '#111827', fontSize: props.valueSize, fontWeight: 600, overflowWrap: 'anywhere' }}>{val}</div>
          </div>
        )
      })}
    </div>
  )
}

function buildPracticeTitle (cfg: any, data: any, oid: number | null): string {
  const code = pickAttrCI(data, ['codice_rapporto', 'n_rapporto', 'numero_rapporto', 'nrapporto', 'N_RAPPORTO'])
  if (code != null && String(code).trim()) return `${cfg.detailTitlePrefix}: ${String(code).trim()}`
  if (oid != null && Number.isFinite(Number(oid))) return `${cfg.detailTitlePrefix}: OBJECTID ${Number(oid)}`
  return cfg.detailTitlePrefix
}


type ViolationRow = {
  key: string
  label: string
  details: Array<{ label: string, value: string }>
}

const DIRECT_ARTICLE_FIELDS: Array<{ field: string, label: string, supDich?: string[], supIrr?: string[] }> = [
  { field: 'v_art08', label: 'Art. 08', supDich: ['sup_dichiarata_art08'], supIrr: ['sup_irrigata_art08'] },
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

function addViolationDetail (details: Array<{ label: string, value: string }>, label: string, value: string) {
  const v = String(value || '').trim()
  if (v && v !== '—') details.push({ label, value: v })
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

function addCommonViolationDetails (data: any, fields: LayerFieldInfo[], details: Array<{ label: string, value: string }>, articleNumber: any) {
  const article = normalizeArticleNumber(articleNumber)

  if (ARTICLES_WITH_GRAVITA.has(article)) {
    addViolationDetail(details, 'Gravità', getGravitaForArticle(data, article))
  }

  if (article === '15') {
    addViolationDetail(details, 'Occorrenza', formatOccorrenzaValue(pickAttrCI(data, ['occorrenza']), fields))
  }
}

function buildViolationRows (data: any, fields: LayerFieldInfo[]): ViolationRow[] {
  const d = data || {}
  const rows: ViolationRow[] = []

  const norma15Parziale = firstViolationValue(d, fields, ['norma15_parziale'])
  const norma15Totale = firstViolationValue(d, fields, ['norma15_totale'])
  if (norma15Parziale || norma15Totale) {
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Tipo prelievo', firstViolationValue(d, fields, ['tipo_prelievo', 'tipo_abuso']))
    addViolationDetail(details, 'Violazione parziale', norma15Parziale)
    addViolationDetail(details, 'Violazione totale', norma15Totale)
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, ['sup_dichiarata_art15']))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, ['sup_irrigata_art15']))
    addCommonViolationDetails(d, fields, details, '15')
    rows.push({ key: 'art15', label: 'Art. 15', details })
  }

  const norma1617Raw = String(pickAttrCI(d, ['norma16_17']) ?? '')
  const norma1617Label = firstViolationValue(d, fields, ['norma16_17'])
  const art16On = norma1617Raw.toLowerCase().includes('art16') || norma1617Label.toLowerCase().includes('art. 16')
  if (art16On) {
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Tipo inosservanza', norma1617Label)
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, ['sup_dichiarata_art16', 'sup_dichiarata_art16_17']))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, ['sup_irrigata_art16_17_2', 'sup_irrigata_art16_17']))
    addCommonViolationDetails(d, fields, details, '16')
    rows.push({ key: 'art16', label: 'Art. 16', details })
  }

  const art17Tipo = firstViolationValue(d, fields, ['art17_tipo'])
  const art17On = norma1617Raw.toLowerCase().includes('art17') || norma1617Label.toLowerCase().includes('art. 17') || !!art17Tipo
  if (art17On) {
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Tipo inosservanza', norma1617Label)
    addViolationDetail(details, 'Tipo violazione', art17Tipo)
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, ['sup_dichiarata_art17_1', 'sup_dichiarata_art17_2', 'sup_dichiarata_art16_17']))
    addViolationDetail(details, 'Superficie variata/irrigata', firstViolationValue(d, fields, ['sup_irrigata_art17_1', 'sup_irrigata_art16_17_2', 'sup_irrigata_art16_17']))
    addCommonViolationDetails(d, fields, details, '17')
    rows.push({ key: 'art17', label: 'Art. 17', details })
  }

  for (const art of DIRECT_ARTICLE_FIELDS) {
    if (!isCheckedValue(pickAttrCI(d, [art.field]))) continue
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, art.supDich || []))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, art.supIrr || []))
    addCommonViolationDetails(d, fields, details, art.label)
    rows.push({ key: art.field, label: art.label, details })
  }

  return rows
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

function art15SurfaceHaForCase (data: any, codiceCasistica: string): number | null {
  const code = String(codiceCasistica || '').toUpperCase()
  if (!code.includes('PRELIEVO_PARZIALE') && !code.includes('PRELIEVO_TOTALE')) return null
  const dichiarata = numericAttr(data || {}, ['sup_dichiarata_art15'])
  const irrigata = numericAttr(data || {}, ['sup_irrigata_art15'])
  if (irrigata == null || irrigata <= 0) return null
  const mq = code.includes('PRELIEVO_TOTALE') ? irrigata : Math.max(0, irrigata - (dichiarata || 0))
  if (!Number.isFinite(mq) || mq <= 0) return null
  return mq / 10000
}

function art15CalculatedValueText (data: any, codiceCasistica: string, param?: SanzioneParametro | null): string {
  const ha = art15SurfaceHaForCase(data, codiceCasistica)
  const rate = parseNumberInput(param?.valore_num)
  if (ha == null || rate == null) return ''
  return formatEuroText(rate * ha)
}

const VIOLATION_ARTICLE_TITLES: Record<string, string> = {
  '8': 'Violazione servizio reperibilità',
  '12': 'Negato accesso ai fondi (al personale consortile)',
  '15': 'Prelievo abusivo d’acqua',
  '16': 'Inosservanza termini presentazione comunicazioni (comunicazione di irrigazione tardiva)',
  '17': 'Inosservanza termini presentazione comunicazioni (comunicazione di variazione o di rinuncia tardiva)',
  '27': 'Spreco d’acqua / Uso negligente risorsa idrica',
  '28': 'Violazione prescrizioni del Consorzio',
  '29': 'Violazione termini restituzione attrezzature',
  '30': 'Danneggiamento e/o perdita attrezzature',
  '31': 'Mancata segnalazione guasti',
  '32': 'Negato accesso ai fondi (al consorziato)',
  '33': 'Inosservanza limiti temporali di prelievo',
  '34': 'Interferenze',
  '35': 'Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante',
  '36': 'Uso attrezzature non autorizzate',
  '37': 'Uso sistemi di irrigazione incompatibili',
  '39': 'Danni strutture irrigue'
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
  return dateMsOrNull(pickAttrCI(d, ['data_verbale', 'protocollo_verbale_data', 'notifica_data', 'data_rilevazione'])) || Date.now()
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
  const s = String(raw || '').trim().toUpperCase()
  const m = s.match(/^ART\s*0*(\d+)$/)
  return m ? `Art. ${m[1]}` : s
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

function groupsAppliedTotal (groups: SanzioneConsultivaGroup[]): number {
  return (groups || []).reduce((acc, group) => {
    return acc + (group.voci || []).reduce((inner, voce) => {
      const n = voceAppliedAmount(voce)
      return inner + (n != null && Number.isFinite(n) ? n : 0)
    }, 0)
  }, 0)
}

function SanzioniHeaderTotal (props: { groups: SanzioneConsultivaGroup[] }) {
  const total = groupsAppliedTotal(props.groups || [])
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 8px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.14)',
      border: '1px solid rgba(255,255,255,0.22)',
      color: '#fff',
      fontSize: 11,
      fontWeight: 900,
      textTransform: 'none',
      letterSpacing: 0
    }}>
      Totale importi: {formatEuroText(total)}
    </span>
  )
}

function roundMoneyValue (value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

function sameDraftValue (a: any, b: any, fieldName: string): boolean {
  if (MONEY_FIELDS.has(fieldName)) {
    const na = parseNumberInput(a)
    const nb = parseNumberInput(b)
    if (na == null && nb == null) return true
    if (na == null || nb == null) return false
    return Math.abs(roundMoneyValue(na) - roundMoneyValue(nb)) < 0.005
  }
  return normalizeAuditComparable(a) === normalizeAuditComparable(b)
}

function buildAutomaticSanzioneCalculation (
  groups: SanzioneConsultivaGroup[],
  data: Record<string, any>,
  profile: { username: string, fullName: string },
  previousDraft: Record<string, any>
): Record<string, any> {
  const validGroups = (groups || []).filter(g => Array.isArray(g.voci) && g.voci.length)
  if (!validGroups.length) return {}

  let sanzioneBase = 0
  let risarcimentoDanni = 0
  let rimborsoAttrezzature = 0
  let cauzioneDecurtata = 0
  let speseNotifica = 0
  let riduzionePercentuale: number | null = null
  let riduzioneImporto: number | null = null
  const dettaglio: string[] = [
    'Quantificazione automatica della sanzione sulla base del rapporto approvato e delle tabelle regolamentari configurate.',
    ''
  ]

  validGroups.forEach(group => {
    dettaglio.push(`${formatArticleFallback(group.articoloViolato)} — ${displayViolationTitle(group)}`)
    ;(group.voci || []).forEach(voce => {
      const parametro = voce.parametro || null
      const categoria = String(parametro?.categoria_parametro || '').toUpperCase()
      const codice = String(parametro?.codice_parametro || voce.codiceParametro || '').toUpperCase()
      const valore = formatVoceValue(voce)
      const amount = voceAppliedAmount(voce)
      dettaglio.push(`- ${voce.descrizione || 'Voce applicabile'} (${codice || 'parametro non configurato'}): ${valore}`)

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
      else if (categoria === 'RISARCIMENTO' || categoria === 'RIMBORSO') risarcimentoDanni += amount
      else if (categoria === 'ATTREZZATURA') rimborsoAttrezzature += amount
      else if (categoria === 'CAUZIONE') cauzioneDecurtata += amount
      else if (categoria === 'SPESE') speseNotifica += amount
    })
    dettaglio.push('')
  })

  const importoNettoAttrezzature = Math.max(0, rimborsoAttrezzature - cauzioneDecurtata)
  const sanzioneRidotta = riduzioneImporto != null
    ? riduzioneImporto
    : riduzionePercentuale != null
      ? sanzioneBase * (riduzionePercentuale / 100)
      : null
  const sanzionePerTotale = sanzioneRidotta != null ? sanzioneRidotta : sanzioneBase
  const totale = sanzionePerTotale + risarcimentoDanni + importoNettoAttrezzature + speseNotifica
  const user = String(profile.fullName || profile.username || '').trim()

  dettaglio.push('Riepilogo automatico')
  dettaglio.push(`Importo sanzione base: ${formatEuroText(sanzioneBase)}`)
  dettaglio.push(`Importo sanzione ridotta: ${sanzioneRidotta != null ? formatEuroText(sanzioneRidotta) : '—'}`)
  dettaglio.push(`Risarcimento danni / rimborsi: ${formatEuroText(risarcimentoDanni)}`)
  dettaglio.push(`Rimborso attrezzature: ${formatEuroText(rimborsoAttrezzature)}`)
  dettaglio.push(`Cauzione decurtata: ${formatEuroText(cauzioneDecurtata)}`)
  dettaglio.push(`Importo netto attrezzature: ${formatEuroText(importoNettoAttrezzature)}`)
  dettaglio.push(`Spese: ${formatEuroText(speseNotifica)}`)
  dettaglio.push(`Totale da pagare: ${formatEuroText(totale)}`)
  dettaglio.push('')
  dettaglio.push("Gli importi sono calcolati automaticamente: l'operatore amministrativo compila solo i dati di verbale, protocollo, notifica, pagamento e allegazione.")

  const currentCalcDate = pickAttrCI(previousDraft, ['sanzione_calcolata_il'])
  const currentCalcUser = String(pickAttrCI(previousDraft, ['sanzione_calcolata_da']) || '').trim()

  return {
    sanzione_importo_base: roundMoneyValue(sanzioneBase),
    sanzione_importo_ridotta: sanzioneRidotta != null ? roundMoneyValue(sanzioneRidotta) : null,
    risarcimento_danni_importo: roundMoneyValue(risarcimentoDanni),
    sanzione_spese_notifica: roundMoneyValue(speseNotifica),
    attrezzature_rimborso_importo: roundMoneyValue(rimborsoAttrezzature),
    attrezzature_cauzione_decurtata: roundMoneyValue(cauzioneDecurtata),
    attrezzature_importo_netto: roundMoneyValue(importoNettoAttrezzature),
    attrezzature_rimborso_dettaglio: rimborsoAttrezzature > 0 || cauzioneDecurtata > 0
      ? `Rimborso attrezzature: ${formatEuroText(rimborsoAttrezzature)}\nCauzione decurtata: ${formatEuroText(cauzioneDecurtata)}\nImporto netto: ${formatEuroText(importoNettoAttrezzature)}`
      : '',
    pagamento_importo_totale: roundMoneyValue(totale),
    sanzione_dettaglio_calcolo: dettaglio.join('\n'),
    sanzione_calcolata_il: currentCalcDate || Date.now(),
    sanzione_calcolata_da: currentCalcUser || user
  }
}


function hasAdminValue (v: any): boolean {
  return v != null && String(v).trim() !== ''
}

function verbaleProgressiveFromValue (v: any): number | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const m = s.match(/\d+/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

function formatGlobalVerbaleNumber (n: number): string {
  return String(Math.max(1, Math.trunc(Number(n) || 1)))
}

async function queryNextGlobalVerbaleNumber (layer: any, fields: LayerFieldInfo[]): Promise<string> {
  const numeroField = realFieldName(fields, 'numero_verbale') || 'numero_verbale'
  let maxNum = 0
  if (!layer?.queryFeatures) return formatGlobalVerbaleNumber(1)
  if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
  const pageSize = 2000
  let start = 0
  for (let guard = 0; guard < 100; guard++) {
    const q = layer.createQuery ? layer.createQuery() : {}
    q.where = `${numeroField} IS NOT NULL`
    q.outFields = [numeroField]
    q.returnGeometry = false
    q.start = start
    q.num = pageSize
    const res = await layer.queryFeatures(q)
    const features = Array.isArray(res?.features) ? res.features : []
    for (const f of features) {
      const n = verbaleProgressiveFromValue(f?.attributes?.[numeroField])
      if (n != null && n > maxNum) maxNum = n
    }
    if (features.length < pageSize) break
    start += pageSize
  }
  return formatGlobalVerbaleNumber(maxNum + 1)
}

async function buildAutomaticVerbaleDefaults (layer: any, fields: LayerFieldInfo[], current: Record<string, any>): Promise<Record<string, any>> {
  const numeroField = realFieldName(fields, 'numero_verbale') || 'numero_verbale'
  const dataField = realFieldName(fields, 'data_verbale') || 'data_verbale'
  const out: Record<string, any> = {}
  if (!hasAdminValue(pickAttrCI(current, [numeroField, 'numero_verbale']))) {
    out[numeroField] = await queryNextGlobalVerbaleNumber(layer, fields)
  }
  if (!hasAdminValue(pickAttrCI(current, [dataField, 'data_verbale']))) {
    out[dataField] = Date.now()
  }
  return out
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
  data?: any
): SanzioneConsultivaGroup[] {
  const wanted = new Set(casistiche)
  const paramByCode = new Map(parametri.map(p => [p.codice_parametro, p]))
  const artByCode = new Map(articoli.map(a => [a.codice_articolo, a]))
  const selectedRaccordi = raccordi.filter(r => wanted.has(r.codice_casistica))
  const pieListaCount = selectedRaccordi.filter(r => isPieListaParametro(paramByCode.get(r.codice_parametro) || null)).length
  const groups = new Map<string, SanzioneConsultivaGroup>()

  selectedRaccordi.forEach(r => {
    const parametro = paramByCode.get(r.codice_parametro) || null
    const pCode = String(r.codice_parametro || '').toUpperCase()
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
      const articoliViolati = splitArticleCodes(r.articolo_violato).map(c => artByCode.get(c)).filter(Boolean) as RegolamentoArticolo[]
      const articoliSanzione = splitArticleCodes(r.articolo_sanzione).map(c => artByCode.get(c)).filter(Boolean) as RegolamentoArticolo[]
      g = {
        codiceCasistica: r.codice_casistica,
        descrizione: raccordoMainDescription(r.descrizione),
        articoloViolato: r.articolo_violato,
        articoloSanzione: r.articolo_sanzione,
        articoliViolati,
        articoliSanzione,
        voci: []
      }
      groups.set(r.codice_casistica, g)
    }
    const voceLabel = buildVoceLabel(r, parametro)
    if (!g.voci.some(v => v.codiceParametro === r.codice_parametro && v.descrizione === voceLabel && v.articoloSanzione === r.articolo_sanzione)) {
      const voceArticoliSanzione = splitArticleCodes(r.articolo_sanzione).map(c => artByCode.get(c)).filter(Boolean) as RegolamentoArticolo[]
      const nsValue = isPieListaParametro(parametro) ? (pieListaCount === 1 ? getNotaSpeseValueText(data || {}) : '0,00 €') : ''
      const art15Value = pCode.includes('SANZIONE.ART41') ? art15CalculatedValueText(data || {}, r.codice_casistica, parametro) : ''
      g.voci.push({
        codiceParametro: r.codice_parametro,
        descrizione: voceLabel,
        articoloSanzione: r.articolo_sanzione,
        articoliSanzione: voceArticoliSanzione,
        parametro,
        valueOverride: nsValue || art15Value
      })
    }
  })

  return Array.from(groups.values()).sort((a, b) => {
    const an = firstArticleNumberFromCodes(a.articoloViolato)
    const bn = firstArticleNumberFromCodes(b.articoloViolato)
    if (an !== bn) return an - bn
    return String(a.codiceCasistica || '').localeCompare(String(b.codiceCasistica || ''), 'it')
  })
}


function articleTitleLine (article?: RegolamentoArticolo | null, fallback?: string): string {
  if (article) {
    const code = formatArticleCode(article.codice_articolo)
    return article.titolo_articolo ? `${code} — ${article.titolo_articolo}` : code
  }
  return formatArticleFallback(fallback)
}

function articleListTitle (articles: RegolamentoArticolo[], fallback: string): string {
  const list = Array.isArray(articles) ? articles.filter(Boolean) : []
  if (!list.length) return formatArticleFallback(fallback)
  return list.map(a => articleTitleLine(a)).join('; ')
}

function violationNormSummary (group: SanzioneConsultivaGroup): string {
  const article = formatArticleFallback(group.articoloViolato)
  const descr = displayViolationTitle(group)
  return descr ? `Norma violata: ${article} — ${descr}` : `Norma violata: ${article}`
}

function articleDetailsByRole (role: string, articles: RegolamentoArticolo[]) {
  const list = Array.isArray(articles) ? articles.filter(Boolean) : []
  if (!list.length) return <div style={{ color: '#6b7280', fontSize: 12 }}>Testo regolamentare non disponibile nelle tabelle configurate.</div>
  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
      {list.map(article => (
        <div key={`${role}-${article.codice_articolo}`} style={{ display: 'grid', gap: 4 }}>
          <div style={{ color: '#111827', fontSize: 12, fontWeight: 850 }}>{articleTitleLine(article)}</div>
          {article.testo_articolo && <div style={{ color: '#374151', fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{article.testo_articolo}</div>}
          {(article.atto_regolamento || article.anno_riferimento) && <div style={{ color: '#6b7280', fontSize: 11 }}>{[article.atto_regolamento, article.anno_riferimento ? `Anno ${article.anno_riferimento}` : ''].filter(Boolean).join(' · ')}</div>}
        </div>
      ))}
    </div>
  )
}

function groupVociBySanzioneArticle (group: SanzioneConsultivaGroup, voci: SanzioneConsultivaVoce[]): Array<{ key: string, articles: RegolamentoArticolo[], fallback: string, voci: SanzioneConsultivaVoce[] }> {
  const map = new Map<string, { key: string, articles: RegolamentoArticolo[], fallback: string, voci: SanzioneConsultivaVoce[] }>()
  ;(voci || []).forEach((voce, idx) => {
    const fallback = voce.articoloSanzione || group.articoloSanzione || ''
    const articles = (voce.articoliSanzione && voce.articoliSanzione.length ? voce.articoliSanzione : group.articoliSanzione) || []
    const key = articles.length ? articles.map(a => a.codice_articolo).join('|') : (fallback || `missing-${idx}`)
    const existing = map.get(key)
    if (existing) {
      existing.voci.push(voce)
    } else {
      map.set(key, { key, articles, fallback, voci: [voce] })
    }
  })
  return Array.from(map.values())
}


type NormToggleVariant = 'violata' | 'sanzionatoria'

function NormToggleBox (props: { title: string, variant: NormToggleVariant, children: any }) {
  const [open, setOpen] = React.useState(false)
  const isViolata = props.variant === 'violata'
  const palette = isViolata
    ? { background: '#eff6ff', border: '#93c5fd', header: '#dbeafe', text: '#0f172a' }
    : { background: '#f8fafc', border: '#cbd5e1', header: '#e2e8f0', text: '#0f172a' }

  return (
    <div style={{ border: `1px solid ${palette.border}`, background: palette.background, borderRadius: 9, overflow: 'hidden' }}>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          border: 0,
          background: palette.header,
          color: palette.text,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 900,
          lineHeight: 1.35
        }}
        aria-expanded={open}
      >
        <span aria-hidden='true' style={{ color: '#1d4ed8', fontSize: 11, fontWeight: 900, lineHeight: 1, width: 14, display: 'inline-flex', justifyContent: 'center' }}>{open ? '▲' : '▼'}</span>
        <span>{props.title}</span>
      </button>
      {open && (
        <div style={{ padding: '8px 10px', borderTop: `1px solid ${palette.border}`, background: '#ffffff' }}>
          {props.children}
        </div>
      )}
    </div>
  )
}

function ParametriSanzionatoriTable (props: { groups: SanzioneConsultivaGroup[] }) {
  const groups = Array.isArray(props.groups) ? props.groups : []
  if (!groups.length) return null

  const valueStyle = (voce: SanzioneConsultivaVoce): any => ({
    color: !voce.parametro ? '#991b1b' : '#166534',
    fontWeight: 850,
    whiteSpace: 'nowrap'
  })

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {groups.map(group => {
        const voci = group.voci.length
          ? group.voci
          : [{ codiceParametro: `${group.codiceCasistica}-empty`, descrizione: 'Voce applicabile', articoloSanzione: group.articoloSanzione, articoliSanzione: group.articoliSanzione, parametro: null }]
        const sanzioneBlocks = groupVociBySanzioneArticle(group, voci)
        return (
          <div key={group.codiceCasistica} style={{ border: '1px solid #93c5fd', background: '#fff', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
            <NormToggleBox variant='violata' title={violationNormSummary(group)}>
              {articleDetailsByRole('Norma violata', group.articoliViolati)}
            </NormToggleBox>

            <div style={{ display: 'grid', gap: 8, padding: '2px 0 0 0' }}>
              {sanzioneBlocks.map(block => (
                <div key={block.key} style={{ display: 'grid', gap: 6, borderTop: '1px solid #cbd5e1', paddingTop: 8 }}>
                  <NormToggleBox variant='sanzionatoria' title={`Norma sanzionatoria: ${articleListTitle(block.articles, block.fallback)}`}>
                    {articleDetailsByRole('Norma sanzionatoria', block.articles)}
                  </NormToggleBox>

                  <div style={{ display: 'grid', gap: 0, padding: '0 10px 2px 10px' }}>
                    {block.voci.map((voce, idx) => (
                      <div key={`${group.codiceCasistica}-${voce.codiceParametro || idx}-${voce.articoloSanzione || idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', borderTop: idx === 0 ? '0' : '1px solid #eef2f7', padding: idx === 0 ? '4px 0' : '7px 0 4px 0' }}>
                        <div style={{ color: '#111827', fontSize: 12, fontWeight: 800 }}>{voce.descrizione || 'Voce applicabile'}:</div>
                        <div style={{ fontSize: 12, textAlign: 'right', ...valueStyle(voce) }}>{formatVoceValue(voce)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BasicViolationsOnly (props: { data: any, layerFields: LayerFieldInfo[], message?: string }) {
  const rows = buildViolationRows(props.data || {}, props.layerFields || [])
  const descrizione = firstViolationValue(props.data || {}, props.layerFields || [], ['descrizione_fatti'])
  const circostanze = firstViolationValue(props.data || {}, props.layerFields || [], ['circostanze'])
  return (
    <Section title='Violazioni contestate' right={<span style={{ fontSize: 11, opacity: 0.85 }}>Sola lettura</span>}>
      {props.message && <InfoBox kind='warn'>{props.message}</InfoBox>}
      {rows.length === 0 ? (
        <InfoBox kind='warn'>Nessuna violazione contestata rilevata nei dati della pratica.</InfoBox>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(row => (
            <div key={row.key} style={{ border: '1px solid #dbeafe', background: '#f8fafc', borderRadius: 11, padding: 11, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: '#0d3b66', color: '#fff', borderRadius: 999, padding: '5px 10px', fontWeight: 800, fontSize: 12 }}>{row.label}</span>
                <span style={{ color: '#166534', fontSize: 12, fontWeight: 800 }}>Contestata</span>
              </div>
              {row.details.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
                  {row.details.map((d, idx) => (
                    <div key={`${row.key}-${d.label}-${idx}`} style={{ fontSize: 12 }}>
                      <span style={{ color: '#6b7280', fontWeight: 800 }}>{d.label}: </span>
                      <span style={{ color: '#111827', fontWeight: 650 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: 12 }}>Nessun dettaglio tecnico aggiuntivo valorizzato.</div>
              )}
            </div>
          ))}
        </div>
      )}
      {(descrizione || circostanze) && (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {descrizione && <InfoBox><strong>Descrizione fatti:</strong><br />{descrizione}</InfoBox>}
          {circostanze && <InfoBox><strong>Circostanze:</strong><br />{circostanze}</InfoBox>}
        </div>
      )}
    </Section>
  )
}

function useSanzioneConsultivaState (cfg: any, data: any, layerFields: LayerFieldInfo[]): SanzioneConsultivaLoadState {
  const parametriUrl = normalizeLookupTableUrl(cfg.parametriSanzioniUrl)
  const articoliUrl = normalizeLookupTableUrl(cfg.regolamentoArticoliUrl)
  const raccordiUrl = normalizeLookupTableUrl(cfg.regolamentoRaccordiUrl)
  const urlsReady = !!parametriUrl && !!articoliUrl && !!raccordiUrl
  const casistiche = React.useMemo(() => deriveSanzioneCasistiche(data || {}, layerFields || []), [data, layerFields])
  const [state, setState] = React.useState<{ loading: boolean, error: string, groups: SanzioneConsultivaGroup[] }>({ loading: false, error: '', groups: [] })

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!urlsReady || !casistiche.length) {
        setState({ loading: false, error: '', groups: [] })
        return
      }
      setState({ loading: true, error: '', groups: [] })
      try {
        const refMs = getSanzioneReferenceDate(data || {})
        const [paramRows, artRows, raccordiRows] = await Promise.all([
          queryActiveTableRows<any>(parametriUrl, ['codice_parametro ASC']),
          queryActiveTableRows<any>(articoliUrl, ['numero_articolo ASC']),
          queryActiveTableRows<any>(raccordiUrl, ['codice_casistica ASC'])
        ])
        const parametri = paramRows.map(normalizeParam).filter(p => p.codice_parametro && isRowValidAt(p, refMs))
        const articoli = artRows.map(normalizeArticle).filter(a => a.codice_articolo && isRowValidAt(a, refMs))
        const raccordi = raccordiRows.map(normalizeRaccordo).filter(r => r.codice_casistica && isRowValidAt(r, refMs))
        const groups = buildSanzioneGroups(casistiche, raccordi, parametri, articoli, data || {})
        if (!cancelled) setState({ loading: false, error: '', groups })
      } catch (e: any) {
        if (!cancelled) setState({ loading: false, error: e?.message || String(e), groups: [] })
      }
    }
    load()
    return () => { cancelled = true }
  }, [urlsReady, parametriUrl, articoliUrl, raccordiUrl, casistiche.join('|'), data])

  return {
    loading: state.loading,
    error: state.error,
    groups: state.groups,
    urlsReady,
    casistiche
  }
}

function ParametriSanzionatoriSection (props: { loadState: SanzioneConsultivaLoadState }) {
  const { loadState } = props
  const urlsReady = loadState.urlsReady
  const casistiche = loadState.casistiche || []
  const loading = loadState.loading
  const error = loadState.error
  const groups = loadState.groups || []

  return (
    <Section title='Violazioni contestate e quantificazione automatica' right={<SanzioniHeaderTotal groups={groups} />}>
      {!urlsReady && (
        <InfoBox kind='warn'>Configurare in Builder gli URL di GII_PARAMETRI_SANZIONI, GII_REGOLAMENTO_ARTICOLI e GII_REGOLAMENTO_RACCORDI.</InfoBox>
      )}
      {urlsReady && casistiche.length === 0 && (
        <InfoBox kind='warn'>Nessuna casistica sanzionatoria rilevata dai dati della pratica.</InfoBox>
      )}
      {urlsReady && casistiche.length > 0 && loading && <InfoBox>Caricamento parametri sanzionatori…</InfoBox>}
      {urlsReady && error && <InfoBox kind='warn'>Errore caricamento parametri sanzionatori: {error}</InfoBox>}
      {urlsReady && !loading && !error && casistiche.length > 0 && groups.length === 0 && (
        <InfoBox kind='warn'>Sono presenti violazioni contestate, ma non risultano raccordi attivi nelle tabelle configurate.</InfoBox>
      )}
      {urlsReady && groups.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          <InfoBox kind='ok'>La quantificazione è calcolata automaticamente dal sistema sulla base del rapporto approvato e delle tabelle regolamentari configurate. L’operatore amministrativo non modifica questi importi.</InfoBox>
          <ParametriSanzionatoriTable groups={groups} />
        </div>
      )}
    </Section>
  )
}

function SanzioniConsultiveSection (props: { loadState: SanzioneConsultivaLoadState }) {
  return <ParametriSanzionatoriSection loadState={props.loadState} />
}

function pdfFieldValue (data: any, fields: LayerFieldInfo[], name: string, opts?: { money?: boolean }): string {
  const raw = pickAttrCI(data, [name])
  if (raw == null || raw === '') return ''
  if (opts?.money) {
    const n = typeof raw === 'number' ? raw : parseNumberInput(raw)
    return n != null ? formatEuroText(n) : String(raw)
  }
  const lf = getFieldInfo(fields, name)
  if (lf?.domain?.codedValues) {
    const label = domainLabel(lf, raw)
    return label === '—' ? '' : label
  }
  if (looksLikeDateField(name)) {
    const d = formatDateValue(raw)
    return d === '—' ? '' : d
  }
  const v = formatValue(raw)
  return v === '—' ? '' : v
}

function joinParts (...parts: string[]): string {
  return parts.map(p => String(p || '').trim()).filter(Boolean).join(' ')
}

function buildVerbaleViolationsText (data: any, fields: LayerFieldInfo[]): string {
  const rows = buildViolationRows(data || {}, fields || [])
  if (!rows.length) return ''
  return rows.map(row => {
    const det = row.details.map(d => `${d.label}: ${d.value}`).join('; ')
    return det ? `${row.label} — ${det}` : row.label
  }).join('\n')
}

function buildVerbalePdfMap (data: any, fields: LayerFieldInfo[], profile: { username: string, fullName: string }): Record<string, string> {
  const d = data || {}
  const oid = pickAttrCI(d, ['OBJECTID', 'objectid', 'ObjectId', 'FID'])
  const pratica = joinParts(String(pickAttrCI(d, ['cod_pratica', 'codice_rapporto', 'n_rapporto', 'numero_rapporto']) || ''), oid != null && String(oid) ? `(OBJECTID ${oid})` : '')
  const isPg = String(pickAttrCI(d, ['tipologia_soggetto']) || '').toUpperCase().includes('GIUR') || !!String(pickAttrCI(d, ['ragione_sociale']) || '').trim()
  const trasgressore = isPg
    ? String(pickAttrCI(d, ['ragione_sociale']) || '').trim()
    : joinParts(String(pickAttrCI(d, ['nome']) || ''), String(pickAttrCI(d, ['cognome']) || ''))
  const cfPiva = isPg ? String(pickAttrCI(d, ['piva']) || '').trim() : String(pickAttrCI(d, ['codice_fiscale']) || '').trim()
  const indirizzo = joinParts(String(pickAttrCI(d, ['via']) || ''), String(pickAttrCI(d, ['civico']) || ''))
  const comuneCap = joinParts(String(pickAttrCI(d, ['citta', 'comune']) || ''), String(pickAttrCI(d, ['cap']) || ''))
  const contatti = [String(pickAttrCI(d, ['email']) || '').trim(), String(pickAttrCI(d, ['telefono']) || '').trim(), String(pickAttrCI(d, ['cellulare']) || '').trim()].filter(Boolean).join(' / ')
  const area = pdfFieldValue(d, fields, 'area_cod') || String(pickAttrCI(d, ['area_label', 'area']) || '')
  const settore = pdfFieldValue(d, fields, 'settore_cod') || String(pickAttrCI(d, ['settore_label', 'settore']) || '')
  const rawTipoAtto = String(pickAttrCI(d, ['tipo_atto_amm']) || '').trim()
  const tipoAttoLabel = pdfFieldValue(d, fields, 'tipo_atto_amm') || rawTipoAtto
  return {
    objectid: oid != null ? String(oid) : '',
    pratica,
    n_rapporto: String(pickAttrCI(d, ['n_rapporto', 'numero_rapporto', 'codice_rapporto', 'cod_pratica']) || ''),
    data_rilevazione: pdfFieldValue(d, fields, 'data_rilevazione'),
    area,
    settore,
    ufficio_zona: pdfFieldValue(d, fields, 'ufficio_zona'),
    tecnico_rilevatore: String(pickAttrCI(d, ['tecnico_rilevatore']) || ''),
    ti_amm: String(pickAttrCI(d, ['ti_amm_assegnato_nome', 'ti_amm_assegnato_username']) || ''),
    trasgressore,
    cf_piva: cfPiva,
    indirizzo,
    comune_cap: comuneCap,
    pec: String(pickAttrCI(d, ['pec']) || ''),
    contatti,
    violazioni: buildVerbaleViolationsText(d, fields),
    descrizione_fatti: String(pickAttrCI(d, ['descrizione_fatti']) || ''),
    tipo_atto_amm: rawTipoAtto,
    tipo_atto_amm_label: tipoAttoLabel,
    protocollo_istanza_numero: String(pickAttrCI(d, ['protocollo_istanza_numero']) || ''),
    protocollo_istanza_data: pdfFieldValue(d, fields, 'protocollo_istanza_data'),
    oggetto_atto_amm: String(pickAttrCI(d, ['oggetto_atto_amm']) || ''),
    note_atto_amm: String(pickAttrCI(d, ['note_atto_amm']) || ''),
    numero_verbale: String(pickAttrCI(d, ['numero_verbale']) || ''),
    data_verbale: pdfFieldValue(d, fields, 'data_verbale'),
    protocollo_verbale: String(pickAttrCI(d, ['protocollo_verbale_numero']) || ''),
    protocollo_verbale_data: pdfFieldValue(d, fields, 'protocollo_verbale_data'),
    notifica_tipo: pdfFieldValue(d, fields, 'notifica_tipo'),
    notifica_data: pdfFieldValue(d, fields, 'notifica_data'),
    notifica_esito: pdfFieldValue(d, fields, 'notifica_esito'),
    notifica_estremi: String(pickAttrCI(d, ['notifica_estremi']) || ''),
    sanzione_importo_base: pdfFieldValue(d, fields, 'sanzione_importo_base', { money: true }),
    sanzione_importo_ridotta: pdfFieldValue(d, fields, 'sanzione_importo_ridotta', { money: true }),
    risarcimento_danni_importo: pdfFieldValue(d, fields, 'risarcimento_danni_importo', { money: true }),
    sanzione_spese_notifica: pdfFieldValue(d, fields, 'sanzione_spese_notifica', { money: true }),
    attrezzature_cauzione_presente: pdfFieldValue(d, fields, 'attrezzature_cauzione_presente'),
    attrezzature_rimborso_importo: pdfFieldValue(d, fields, 'attrezzature_rimborso_importo', { money: true }),
    attrezzature_cauzione_decurtata: pdfFieldValue(d, fields, 'attrezzature_cauzione_decurtata', { money: true }),
    attrezzature_importo_netto: pdfFieldValue(d, fields, 'attrezzature_importo_netto', { money: true }),
    attrezzature_rimborso_dettaglio: String(pickAttrCI(d, ['attrezzature_rimborso_dettaglio']) || ''),
    attrezzature_note: String(pickAttrCI(d, ['attrezzature_note']) || ''),
    pagamento_importo_totale: pdfFieldValue(d, fields, 'pagamento_importo_totale', { money: true }),
    pagamento_scadenza: pdfFieldValue(d, fields, 'pagamento_scadenza'),
    pagamento_modalita: pdfFieldValue(d, fields, 'pagamento_modalita'),
    pagamento_stato: pdfFieldValue(d, fields, 'pagamento_stato'),
    pagamento_note: String(pickAttrCI(d, ['pagamento_note']) || ''),
    pagopa_iuv: String(pickAttrCI(d, ['pagopa_iuv']) || ''),
    pagopa_codice_avviso: String(pickAttrCI(d, ['pagopa_codice_avviso']) || ''),
    bonifico_iban: String(pickAttrCI(d, ['bonifico_iban_snapshot']) || ''),
    bonifico_intestatario: String(pickAttrCI(d, ['bonifico_intestatario_snapshot']) || ''),
    bonifico_causale: String(pickAttrCI(d, ['bonifico_causale']) || ''),
    bonifico_cro_trn: String(pickAttrCI(d, ['bonifico_cro_trn']) || ''),
    bonifico_data_accredito: pdfFieldValue(d, fields, 'bonifico_data_accredito'),
    sanzione_dettaglio_calcolo: String(pickAttrCI(d, ['sanzione_dettaglio_calcolo']) || ''),
    sanzione_calcolata_il: pdfFieldValue(d, fields, 'sanzione_calcolata_il'),
    sanzione_calcolata_da: String(pickAttrCI(d, ['sanzione_calcolata_da']) || ''),
    verbale_pdf_generato_il: pdfFieldValue(d, fields, 'verbale_pdf_generato_il'),
    verbale_pdf_generato_da: String(pickAttrCI(d, ['verbale_pdf_generato_da']) || ''),
    istruttoria_amm_chiusa_il: pdfFieldValue(d, fields, 'istruttoria_amm_chiusa_il'),
    istruttoria_amm_chiusa_da: String(pickAttrCI(d, ['istruttoria_amm_chiusa_da']) || ''),
    data_generazione: new Date().toLocaleString('it-IT'),
    generato_da: profile.fullName || profile.username || ''
  }
}

function verbalePdfFileName (map: Record<string, string>): string {
  const prefix = getVerbalePdfFilePrefix(map) || 'verbale'
  const base = String(map.numero_verbale || map.n_rapporto || map.objectid || prefix).replace(/[^a-zA-Z0-9_-]/g, '_')
  return `${prefix}_${base || prefix}.pdf`
}

function buildVerbalePdfGenerationMeta (profile: { username: string, fullName: string }): Record<string, any> {
  return {
    verbale_pdf_generato_il: Date.now(),
    verbale_pdf_generato_da: String(profile.fullName || profile.username || '').trim()
  }
}

async function buildVerbalePdfBlob (data: any, fields: LayerFieldInfo[], profile: { username: string, fullName: string }): Promise<{ blob: Blob, fileName: string }> {
  const map = buildVerbalePdfMap(data, fields, profile)
  const bytes = await buildVerbalePdf(map)
  const fileName = verbalePdfFileName(map)
  return { blob: new Blob([bytes as any], { type: 'application/pdf' }), fileName }
}

function makePdfUrl (blob: Blob, fileName: string): string {
  return `${URL.createObjectURL(blob)}#${fileName}`
}

function revokePdfUrl (url?: string | null): void {
  if (!url) return
  try { URL.revokeObjectURL(String(url).split('#')[0]) } catch {}
}

function downloadBlobFile (blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => { try { URL.revokeObjectURL(url) } catch {} }, 1500)
}

function ViolationsSection (props: { data: any, layerFields: LayerFieldInfo[] }) {
  const rows = buildViolationRows(props.data || {}, props.layerFields || [])
  const descrizione = firstViolationValue(props.data || {}, props.layerFields || [], ['descrizione_fatti'])
  const circostanze = firstViolationValue(props.data || {}, props.layerFields || [], ['circostanze'])
  return (
    <Section title='Violazioni contestate' right={<span style={{ fontSize: 11, opacity: 0.85 }}>Sola lettura</span>}>
      {rows.length === 0 ? (
        <InfoBox kind='warn'>Nessuna violazione contestata rilevata nei dati della pratica.</InfoBox>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {rows.map(row => (
            <div key={row.key} style={{ border: '1px solid #dbeafe', background: '#f8fafc', borderRadius: 11, padding: 11, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ background: '#0d3b66', color: '#fff', borderRadius: 999, padding: '5px 10px', fontWeight: 800, fontSize: 12 }}>{row.label}</span>
                <span style={{ color: '#166534', fontSize: 12, fontWeight: 800 }}>Contestata</span>
              </div>
              {row.details.length > 0 ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  {row.details.map((d, idx) => (
                    <div key={`${row.key}-${d.label}-${idx}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 0.8fr) minmax(0, 1.2fr)', gap: 8, fontSize: 12 }}>
                      <div style={{ color: '#6b7280', fontWeight: 800 }}>{d.label}</div>
                      <div style={{ color: '#111827', fontWeight: 650, overflowWrap: 'anywhere' }}>{d.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: 12 }}>Nessun dettaglio tecnico aggiuntivo valorizzato.</div>
              )}
            </div>
          ))}
        </div>
      )}
      {(descrizione || circostanze) && (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {descrizione && <InfoBox><strong>Descrizione fatti:</strong><br />{descrizione}</InfoBox>}
          {circostanze && <InfoBox><strong>Circostanze:</strong><br />{circostanze}</InfoBox>}
        </div>
      )}
    </Section>
  )
}

function DataSourceSelectionBridge (props: {
  widgetId: string
  uds: any
  dsKey: string
  onUpdate: (dsKey: string, state: SelectedState) => void
}) {
  const { widgetId, uds, dsKey, onUpdate } = props
  return (
    <DataSourceComponent useDataSource={uds} widgetId={widgetId}>
      {(ds: any) => <SelectionWatcher ds={ds} dsKey={dsKey} onUpdate={onUpdate} />}
    </DataSourceComponent>
  )
}

function SelectionWatcher (props: {
  ds: any
  dsKey: string
  onUpdate: (dsKey: string, state: SelectedState) => void
}): any {
  const { ds, dsKey, onUpdate } = props

  React.useEffect(() => {
    try { ds?.setListenSelection?.(true) } catch {}
  }, [ds])

  let selected = ds?.getSelectedRecords?.() || []
  if (!selected || selected.length === 0) {
    const recs = ds?.getRecords?.() || []
    if (recs && recs.length) selected = recs
  }

  const r0 = selected.length ? selected[0] : null
  const idFieldName = String(ds?.getIdField?.() || 'OBJECTID')
  const baseData = r0?.getData ? r0.getData() : null
  const oid = pickOidFromData(baseData, idFieldName)
  const layerUrl = getDataSourceUrl(ds)
  const [fullData, setFullData] = React.useState<any | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setFullData(null)
    const load = async () => {
      if (!ds || oid == null || !Number.isFinite(Number(oid))) return
      try {
        const q: any = {
          where: `${idFieldName}=${Number(oid)}`,
          outFields: ['*'],
          returnGeometry: false,
          pageSize: 1
        }
        const res: any = await (ds?.query ? ds.query(q) : null)
        let rec: any = null
        if (Array.isArray(res)) rec = res[0]
        else if (Array.isArray(res?.records)) rec = res.records[0]
        else if (Array.isArray(res?.data?.records)) rec = res.data.records[0]
        const data = rec?.getData ? rec.getData() : (rec?.data || rec?.attributes || null)
        if (!cancelled && data) setFullData(data)
      } catch {
        // Nessun fallback diretto a FeatureLayer: evitiamo nuove chiamate potenzialmente invasive.
      }
    }
    load()
    return () => { cancelled = true }
  }, [ds, oid, idFieldName])

  const data = fullData ? { ...(baseData || {}), ...(fullData || {}) } : baseData
  const sig = `${layerUrl}|${oid ?? ''}|${data ? Object.keys(data).length : 0}`

  React.useEffect(() => {
    onUpdate(dsKey, {
      ds,
      oid,
      idFieldName,
      layerUrl,
      data: oid != null && Number.isFinite(Number(oid)) ? data : null,
      source: 'datasource',
      sig
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsKey, ds, oid, idFieldName, layerUrl, sig])

  return null
}

function TextInput (props: { value: any, disabled?: boolean, placeholder?: string, onChange: (v: string) => void }) {
  return <input type='text' value={props.value ?? ''} disabled={props.disabled} placeholder={props.placeholder || ''} onChange={e => props.onChange(e.target.value)} style={inputStyle(props.disabled)} />
}

function TextArea (props: { value: any, disabled?: boolean, placeholder?: string, onChange: (v: string) => void }) {
  return <textarea value={props.value ?? ''} disabled={props.disabled} placeholder={props.placeholder || ''} onChange={e => props.onChange(e.target.value)} rows={4} style={{ ...inputStyle(props.disabled), resize: 'vertical', minHeight: 88, lineHeight: 1.35 }} />
}

function inputStyle (disabled?: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d1d5db',
    borderRadius: 9,
    padding: '8px 10px',
    fontSize: 13,
    color: disabled ? '#6b7280' : '#111827',
    background: disabled ? '#f3f4f6' : '#fff',
    outline: 'none'
  }
}

function FieldEditor (props: {
  field: AdminField
  draft: Record<string, any>
  fields: LayerFieldInfo[]
  canEdit: boolean
  onChange: (name: string, value: any) => void
}) {
  const { field, draft, fields, canEdit, onChange } = props
  const lf = getFieldInfo(fields, field.name)
  const exists = !!lf
  const real = lf?.name || field.name
  const raw = pickAttrCI(draft, [real, field.name])
  const systemCalculated = isSystemCalculatedAdminField(field.name)
  const readonly = field.readonly || systemCalculated || !canEdit || !exists || lf?.editable === false
  const options = getDomainOptions(lf)
  const miss = !exists

  const label = (
    <div style={{ color: '#374151', fontSize: 12, fontWeight: 800, marginBottom: 5, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{field.label}</span>
      {systemCalculated && !miss && <span style={{ color: '#1d4ed8', fontWeight: 800, fontSize: 10 }}>automatico</span>}
      {miss && <span style={{ color: '#b45309', fontWeight: 700, fontSize: 10 }}>campo assente</span>}
    </div>
  )

  let control: React.ReactNode = null
  if (field.kind === 'textarea') {
    control = <TextArea value={raw ?? ''} disabled={readonly} placeholder={field.placeholder} onChange={v => onChange(real, v || null)} />
  } else if (field.kind === 'date' || field.kind === 'readonly-date') {
    control = <input type='date' value={dateInputValue(raw)} disabled={readonly} onChange={e => onChange(real, fromDateInputValue(e.target.value))} style={inputStyle(readonly)} />
  } else if (field.kind === 'number') {
    control = <input type='text' inputMode='decimal' value={raw == null || raw === '' ? '' : String(raw)} disabled={readonly} onChange={e => onChange(real, parseNumberInput(e.target.value))} onBlur={e => { if (MONEY_FIELDS.has(field.name)) e.currentTarget.value = formatMoney(e.currentTarget.value) }} style={inputStyle(readonly)} placeholder='0,00' />
  } else if (field.kind === 'domain') {
    control = (
      <select value={raw ?? ''} disabled={readonly} onChange={e => onChange(real, e.target.value || null)} style={inputStyle(readonly)}>
        <option value=''>—</option>
        {options.map(o => <option key={String(o.code)} value={String(o.code)}>{o.name}</option>)}
      </select>
    )
  } else {
    control = <TextInput value={raw ?? ''} disabled={readonly} placeholder={field.placeholder} onChange={v => onChange(real, v || null)} />
  }

  return (
    <div style={{ gridColumn: field.full ? '1 / -1' : undefined }}>
      {label}
      {control}
    </div>
  )
}

function AdminFormSection (props: {
  title: string
  group: AdminField['group']
  draft: Record<string, any>
  fields: LayerFieldInfo[]
  canEdit: boolean
  onChange: (name: string, value: any) => void
  fieldNames?: string[]
  children?: React.ReactNode
}) {
  const wanted = Array.isArray(props.fieldNames) && props.fieldNames.length ? new Set(props.fieldNames.map(String)) : null
  const items = ADMIN_FIELDS.filter(f => f.group === props.group && (!wanted || wanted.has(f.name)))
  return (
    <Section title={props.title}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {items.map(f => <FieldEditor key={f.name} field={f} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />)}
      </div>
      {props.children}
    </Section>
  )
}

function PaymentModeInfo (props: { mode: PaymentMode }) {
  const { mode } = props
  if (!mode) {
    return <div style={{ marginTop: 12 }}><InfoBox kind='warn'>Selezionare la modalità di pagamento per visualizzare i campi specifici.</InfoBox></div>
  }
  if (mode === 'PAGOPA') {
    return <div style={{ marginTop: 12 }}><InfoBox>Modalità selezionata: pagoPA. Sono visibili solo i campi IUV e codice avviso.</InfoBox></div>
  }
  if (mode === 'BONIFICO') {
    return <div style={{ marginTop: 12 }}><InfoBox>Modalità selezionata: bonifico. Sono visibili solo i campi bancari.</InfoBox></div>
  }
  if (mode === 'MISTO') {
    return <div style={{ marginTop: 12 }}><InfoBox>Modalità selezionata: misto. Sono visibili sia i campi pagoPA sia i campi bonifico.</InfoBox></div>
  }
  return <div style={{ marginTop: 12 }}><InfoBox>Modalità selezionata: altro. È visibile il campo note pagamento.</InfoBox></div>
}

function changedAttrs (fields: LayerFieldInfo[], initial: Record<string, any>, draft: Record<string, any>): Record<string, any> {
  const attrs: Record<string, any> = {}
  for (const f of ADMIN_FIELDS) {
    const real = realFieldName(fields, f.name)
    if (!real) continue
    const before = pickAttrCI(initial, [real, f.name])
    const after = pickAttrCI(draft, [real, f.name])
    const b = before == null || before === '' ? null : before
    const a = after == null || after === '' ? null : after
    if (String(b ?? '') !== String(a ?? '')) attrs[real] = a
  }
  return attrs
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...asJs(props.config) }
  const useDs: any[] = asJs(props.useDataSources) || []
  const [states, setStates] = React.useState<Record<string, SelectedState>>({})
  const [intentState, setIntentState] = React.useState<SelectedState>(() => {
    const editIntent = readEditIntent()
    if (editIntent) return selectionStateFromIntent(editIntent, 'editIntent')
    return selectionStateFromIntent(readSelectionIntent(), 'selection')
  })
  const [profile, setProfile] = React.useState(() => readUserProfile())
  const [layerFields, setLayerFields] = React.useState<LayerFieldInfo[]>([])
  const [draft, setDraft] = React.useState<Record<string, any>>({})
  const [initialDraft, setInitialDraft] = React.useState<Record<string, any>>({})
  const [saving, setSaving] = React.useState(false)
  const [dialog, setDialog] = React.useState<{ kind: 'ok' | 'err' | 'warn', title: string, text: string } | null>(null)
  const [verbalePreviewOpen, setVerbalePreviewOpen] = React.useState(false)
  const [verbalePreviewLoading, setVerbalePreviewLoading] = React.useState(false)
  const [verbalePreviewError, setVerbalePreviewError] = React.useState<string | null>(null)
  const [verbalePreviewUrl, setVerbalePreviewUrl] = React.useState<string | null>(null)
  const [verbalePreviewFileName, setVerbalePreviewFileName] = React.useState('verbale.pdf')

  React.useEffect(() => {
    return () => { revokePdfUrl(verbalePreviewUrl) }
  }, [verbalePreviewUrl])

  React.useEffect(() => {
    const sync = () => {
      const editIntent = readEditIntent()
      if (editIntent) setIntentState(selectionStateFromIntent(editIntent, 'editIntent'))
      else setIntentState(selectionStateFromIntent(readSelectionIntent(), 'selection'))
      setProfile(readUserProfile())
    }
    sync()
    window.addEventListener('gii-edit-intent-changed', sync as EventListener)
    window.addEventListener('gii-selection-changed', sync as EventListener)
    window.addEventListener('gii:userLoaded', sync as EventListener)
    window.addEventListener('focus', sync as EventListener)
    return () => {
      window.removeEventListener('gii-edit-intent-changed', sync as EventListener)
      window.removeEventListener('gii-selection-changed', sync as EventListener)
      window.removeEventListener('gii:userLoaded', sync as EventListener)
      window.removeEventListener('focus', sync as EventListener)
    }
  }, [])

  const onDsUpdate = React.useCallback((dsKey: string, state: SelectedState) => {
    setStates(prev => ({ ...prev, [dsKey]: state }))
  }, [])

  const dsStatesAll = Object.values(states || {}).filter(s => !!s?.ds)
  const dsStatesWithSelection = dsStatesAll.filter(s => s?.oid != null && s?.data)
  const configuredDsState = dsStatesAll[0] || null
  const configuredDs = configuredDsState?.ds || null

  // La pratica da mostrare arriva prima di tutto dall'intent impostato da gii-azioni.
  // La fonte dati usata per salvare deve invece essere solo quella collegata esplicitamente in Builder.
  const activeSelection = (intentState?.oid != null || intentState?.data) ? intentState : (dsStatesWithSelection[0] || null)
  const active = activeSelection ? { ...activeSelection, ds: activeSelection.ds || configuredDs } : (configuredDsState || null)
  const data = activeSelection?.data || null
  const oid = activeSelection?.oid ?? (data ? pickOidFromData(data, activeSelection?.idFieldName || 'OBJECTID') : null)
  const hasSelection = !!data || (oid != null && Number.isFinite(Number(oid)))
  const roleAllowed = isAllowedAdminRole(profile.role)
  const title = buildPracticeTitle(cfg, data || {}, oid)
  const hasDsForSave = !!configuredDs
  const canEdit = roleAllowed && ['TI_AMM', 'RI_AMM', 'ADMIN'].includes(String(profile.role || '').toUpperCase()) && hasDsForSave
  const paymentMode = getPaymentMode(draft || data || {}, layerFields)
  const paymentFieldNames = paymentMode === 'ALTRO' ? [...PAYMENT_COMMON_FIELDS, ...PAYMENT_NOTE_FIELDS] : PAYMENT_COMMON_FIELDS
  const showPagopaFields = paymentMode === 'PAGOPA' || paymentMode === 'MISTO'
  const showBonificoFields = paymentMode === 'BONIFICO' || paymentMode === 'MISTO'
  const sanzioniConsultive = useSanzioneConsultivaState(cfg, data || {}, layerFields)
  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      const ds = active?.ds
      if (!ds) {
        if (!cancelled) setLayerFields([])
        return
      }
      const f = await readLayerFields(ds)
      if (!cancelled) setLayerFields(f)
    }
    load()
    return () => { cancelled = true }
  }, [active?.ds, active?.layerUrl])

  React.useEffect(() => {
    const base = data || {}
    setDraft({ ...base })
    setInitialDraft({ ...base })
  }, [active?.sig])

  React.useEffect(() => {
    if (!hasSelection || !canEdit) return
    if (sanzioniConsultive.loading || sanzioniConsultive.error || !sanzioniConsultive.groups.length) return

    setDraft(prev => {
      const current = prev || {}
      const calculated = buildAutomaticSanzioneCalculation(sanzioniConsultive.groups, data || current || {}, profile, current)
      const entries = Object.entries(calculated).filter(([name]) => isSystemCalculatedAdminField(name))
      if (!entries.length) return prev

      let changed = false
      const next: Record<string, any> = { ...current }
      for (const [name, value] of entries) {
        if (!sameDraftValue(pickAttrCI(next, [name]), value, name)) {
          next[name] = value
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [hasSelection, canEdit, sanzioniConsultive.loading, sanzioniConsultive.error, sanzioniConsultive.groups, data, profile])

  const onFieldChange = React.useCallback((name: string, value: any) => {
    setDraft(prev => ({ ...(prev || {}), [name]: value }))
  }, [])

  const pendingAttrs = React.useMemo(() => changedAttrs(layerFields, initialDraft, draft), [layerFields, initialDraft, draft])
  const isDirty = Object.keys(pendingAttrs).length > 0

  const logLayerRef = React.useRef<any | null>(null)

  const getLogLayer = React.useCallback(async () => {
    if (logLayerRef.current) return logLayerRef.current
    try {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const fl = new FeatureLayer({ url: LOG_EVENTI_CICLI_URL, outFields: ['*'] })
      if (typeof fl?.load === 'function') { try { await fl.load() } catch {} }
      logLayerRef.current = fl
      return fl
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Layer log non disponibile:', e)
      return null
    }
  }, [])

  const findOpenAmmCycle = React.useCallback(async (parentGlobalId: string, roleForLog: string) => {
    const logLayer = await getLogLayer()
    if (!parentGlobalId || !roleForLog || !logLayer?.queryFeatures) return null
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `(${parentGlobalIdWhereForLog(parentGlobalId)}) AND ruolo_competente = ${sqlQuote(roleForLog)} AND stato_record = 'APERTO'`
    q.outFields = ['*']
    q.returnGeometry = false
    q.num = 1
    const oidField = String(logLayer.objectIdField || 'OBJECTID')
    q.orderByFields = ['numero_ciclo_ruolo DESC', `${oidField} DESC`]
    const res = await logLayer.queryFeatures(q)
    return res?.features?.[0] || null
  }, [getLogLayer])

  const getNextAmmCycleNumber = React.useCallback(async (parentGlobalId: string, roleForLog: string): Promise<number> => {
    const logLayer = await getLogLayer()
    if (!parentGlobalId || !roleForLog || !logLayer?.queryFeatures) return 1
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `(${parentGlobalIdWhereForLog(parentGlobalId)}) AND ruolo_competente = ${sqlQuote(roleForLog)}`
    q.outFields = ['numero_ciclo_ruolo']
    q.returnGeometry = false
    q.num = 1
    const oidField = String(logLayer.objectIdField || 'OBJECTID')
    q.orderByFields = ['numero_ciclo_ruolo DESC', `${oidField} DESC`]
    try {
      const res = await logLayer.queryFeatures(q)
      const lastNum = Number(res?.features?.[0]?.attributes?.numero_ciclo_ruolo || 0)
      return Number.isFinite(lastNum) && lastNum > 0 ? lastNum + 1 : 1
    } catch {
      return 1
    }
  }, [getLogLayer])

  const upsertAmmCycleAudit = React.useCallback(async (prevAttrs: Record<string, any>, nextAttrs: Record<string, any>, changedFieldNames: string[]) => {
    const roleForLog = String(profile.role || '').trim().toUpperCase()
    if (roleForLog !== 'TI_AMM' && roleForLog !== 'RI_AMM') return 0

    const parentGlobalId = String(
      pickAttrCI(nextAttrs, ['GlobalID', 'globalid', 'GLOBALID']) ||
      pickAttrCI(prevAttrs, ['GlobalID', 'globalid', 'GLOBALID']) ||
      pickAttrCI(data, ['GlobalID', 'globalid', 'GLOBALID']) ||
      ''
    ).trim()
    if (!parentGlobalId || oid == null) {
      console.warn('[GII_LOG_EVENTI_CICLI] Audit amministrativo saltato: parent_globalid non disponibile.', { roleForLog, oid })
      return 0
    }

    const delta = buildAuditDeltaMaps(prevAttrs, nextAttrs, changedFieldNames)
    if (Object.keys(delta.oldMap).length === 0) return 0

    const logLayer = await getLogLayer()
    if (!logLayer?.applyEdits) return 0

    const username = String(profile.username || '').trim()
    const sessionId = `${roleForLog.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    let openFeature = await findOpenAmmCycle(parentGlobalId, roleForLog)
    if (!openFeature?.attributes) {
      const nextNum = await getNextAmmCycleNumber(parentGlobalId, roleForLog)
      const addAttrs = filterAttrsForLayer({
        parent_globalid: parentGlobalId,
        parent_objectid: oid,
        numero_ciclo_ruolo: nextNum,
        ruolo_competente: roleForLog,
        utente_operatore: username,
        stato_record: 'APERTO',
        evento_apertura: 'PRESA_IN_CARICO',
        dt_apertura: Date.now(),
        area: 'AMM',
        settore: '',
        fase: roleForLog,
        session_id: sessionId,
        num_campi_modificati: 0,
        campi_modificati: '',
        valori_prima_json: '',
        valori_dopo_json: '',
        riepilogo_ciclo: ''
      }, (logLayer.fields || []).map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false })))
      try {
        const addRes = await logLayer.applyEdits({ addFeatures: [{ attributes: addAttrs }] })
        const add = addRes?.addFeatureResults?.[0] || addRes?.addResults?.[0] || null
        if (add?.error) throw new Error(add.error.message || JSON.stringify(add.error))
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Errore creazione ciclo audit amministrativo:', e)
      }
      openFeature = await findOpenAmmCycle(parentGlobalId, roleForLog)
    }

    if (!openFeature?.attributes) return 0
    const attrs = openFeature.attributes || {}
    const existingOld = parseJsonObject(attrs.valori_prima_json)
    const existingNew = parseJsonObject(attrs.valori_dopo_json)
    const merged = mergeAuditCycleMaps(existingOld, existingNew, delta.oldMap, delta.newMap)
    const num = merged.fields.length
    const logFields = (logLayer.fields || []).map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
    const updAttrs = filterAttrsForLayer({
      [String(logLayer.objectIdField || 'OBJECTID')]: getLogObjectIdValue(attrs, logLayer),
      utente_operatore: username || attrs.utente_operatore || '',
      area: 'AMM',
      settore: attrs.settore || '',
      session_id: sessionId,
      num_campi_modificati: num,
      campi_modificati: merged.fields.join(', '),
      valori_prima_json: num > 0 ? JSON.stringify(merged.oldMap) : '',
      valori_dopo_json: num > 0 ? JSON.stringify(merged.newMap) : ''
    }, logFields)
    try {
      const updRes = await logLayer.applyEdits({ updateFeatures: [{ attributes: updAttrs }] })
      const upd = updRes?.updateFeatureResults?.[0] || updRes?.updateResults?.[0] || null
      if (upd?.error) throw new Error(upd.error.message || JSON.stringify(upd.error))
      try { window.dispatchEvent(new CustomEvent('gii-log-eventi-cicli-changed', { detail: { source: 'gii-editing-amm', oid, role: roleForLog, ts: Date.now() } })) } catch {}
      return num
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Errore aggiornamento audit ciclo amministrativo:', e)
      return 0
    }
  }, [data, findOpenAmmCycle, getLogLayer, getNextAmmCycleNumber, oid, profile.role, profile.username])

  const handleReset = () => {
    setDraft({ ...(initialDraft || {}) })
  }

  const fillCloseMeta = async () => {
    const now = Date.now()
    const closeMeta: Record<string, any> = {
      istruttoria_amm_chiusa_il: now,
      istruttoria_amm_chiusa_da: profile.fullName || profile.username || ''
    }
    let verbaleMeta: Record<string, any> = {}
    try {
      if (active?.ds && layerFields.length) {
        const layer = await resolveLayerForEdit(active.ds)
        if (layer) {
          const fields = layer?.fields?.length
            ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
            : layerFields
          verbaleMeta = await buildAutomaticVerbaleDefaults(layer, fields, { ...(draft || data || {}), ...closeMeta })
        }
      }
    } catch (e) {
      console.warn('[gii-editing-amm] Impossibile assegnare numero/data verbale alla chiusura:', e)
      setDialog({ kind: 'err', title: 'Errore numerazione verbale', text: 'Non è stato possibile assegnare automaticamente numero e data del verbale. Verifica la connessione al layer e riprova.' })
      return
    }
    setDraft(prev => ({
      ...(prev || {}),
      ...verbaleMeta,
      ...closeMeta
    }))
  }

  const handleVerbaleDownload = React.useCallback(() => {
    const base = draft || data
    if (!hasSelection || !base) return
    const stamp = buildVerbalePdfGenerationMeta(profile)
    const source = { ...base, ...stamp }
    if (canEdit) {
      setDraft(prev => ({ ...(prev || {}), ...stamp }))
    }
    ;(async () => {
      try {
        const { blob, fileName } = await buildVerbalePdfBlob(source, layerFields, profile)
        downloadBlobFile(blob, fileName)
        setDialog({ kind: 'ok', title: 'Verbale PDF generato', text: canEdit ? 'Il PDF è stato scaricato e i metadati di generazione sono stati compilati. Ricordati di salvare i dati amministrativi.' : 'Il PDF è stato scaricato.' })
      } catch (e: any) {
        setDialog({ kind: 'err', title: 'Errore PDF verbale', text: e?.message || String(e) })
      }
    })()
  }, [canEdit, data, draft, hasSelection, layerFields, profile])

  const handleVerbalePreview = React.useCallback(() => {
    const source = draft || data
    if (!hasSelection || !source) return
    setVerbalePreviewOpen(true)
    setVerbalePreviewLoading(true)
    setVerbalePreviewError(null)
    ;(async () => {
      try {
        const { blob, fileName } = await buildVerbalePdfBlob(source, layerFields, profile)
        const url = makePdfUrl(blob, fileName)
        setVerbalePreviewFileName(fileName)
        setVerbalePreviewUrl(prev => {
          revokePdfUrl(prev)
          return url
        })
      } catch (e: any) {
        setVerbalePreviewError(e?.message || String(e))
      } finally {
        setVerbalePreviewLoading(false)
      }
    })()
  }, [data, draft, hasSelection, layerFields, profile])

  const closeVerbalePreview = React.useCallback(() => {
    setVerbalePreviewOpen(false)
    setVerbalePreviewLoading(false)
    setVerbalePreviewError(null)
  }, [])

  const handleSave = async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di salvare.' })
      return
    }
    if (!active?.ds) {
      setDialog({ kind: 'err', title: 'Fonte dati non disponibile', text: 'Collegare al widget la vista amministrativa in Builder prima di salvare.' })
      return
    }
    if (!roleAllowed) {
      setDialog({ kind: 'err', title: 'Profilo non abilitato', text: 'Il profilo rilevato non è abilitato alla fase amministrativa.' })
      return
    }
    if (!canEdit) {
      setDialog({ kind: 'warn', title: 'Scheda in sola lettura', text: 'Il profilo corrente può consultare la scheda, ma non modificarla.' })
      return
    }
    const attrs = changedAttrs(layerFields, initialDraft, draft)
    if (!Object.keys(attrs).length) {
      setDialog({ kind: 'warn', title: 'Nessuna modifica', text: 'Non risultano modifiche da salvare.' })
      return
    }

    setSaving(true)
    try {
      const layer = await resolveLayerForEdit(active.ds)
      if (!layer?.applyEdits) throw new Error('Layer non disponibile per applyEdits.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch { } }
      const fields = layer?.fields?.length ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false })) : layerFields
      const idName = realFieldName(fields, active.idFieldName) || active.idFieldName || 'OBJECTID'
      let prevRecordAttrs = { ...(initialDraft || {}) }
      try {
        const liveAttrs = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (liveAttrs && Object.keys(liveAttrs).length) prevRecordAttrs = liveAttrs
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Impossibile rileggere il record amministrativo prima del salvataggio:', e)
      }
      const cleanAttrs = filterAttrsForLayer({ [idName]: Number(oid), ...attrs }, fields)
      const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
      const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
      const err = upd?.error
      const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
      if (!ok) {
        const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
        throw new Error(detail)
      }
      await upsertAmmCycleAudit(prevRecordAttrs, { ...prevRecordAttrs, ...attrs }, Object.keys(attrs))
      await refreshDs(active.ds)
      const next = { ...(initialDraft || {}), ...attrs }
      setInitialDraft(next)
      setDraft(next)
      setDialog({ kind: 'ok', title: 'Salvataggio completato', text: 'Dati amministrativi salvati.' })
      try {
        window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm' } }))
      } catch { }
    } catch (e: any) {
      setDialog({ kind: 'err', title: 'Errore salvataggio', text: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }

  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: 0,
    boxSizing: 'border-box',
    padding: Number(cfg.panelPadding ?? 14),
    background: String(cfg.mutedBg || '#f6f7f9'),
    overflow: 'auto',
    color: '#111827',
    fontFamily: 'inherit'
  }

  return (
    <div style={wrapperStyle}>
      {useDs.map((uds: any, idx: number) => {
        const dsKey = String(uds?.dataSourceId || uds?.mainDataSourceId || `ds_${idx}`)
        return <DataSourceSelectionBridge key={dsKey} widgetId={props.id} uds={uds} dsKey={dsKey} onUpdate={onDsUpdate} />
      })}

      {dialog && <BlockingDialog kind={dialog.kind} title={dialog.title} text={dialog.text} onClose={() => setDialog(null)} />}
      {verbalePreviewOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2147483000, background: 'rgba(0,0,0,0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div role='dialog' aria-modal='true' style={{ width: 'calc(100vw - 28px)', height: 'calc(100vh - 28px)', maxWidth: 1920, maxHeight: 1200, borderRadius: 14, boxShadow: '0 20px 70px rgba(0,0,0,0.32)', overflow: 'hidden' }}>
            <RapportoPdfViewer
              url={verbalePreviewUrl}
              fileName={verbalePreviewFileName}
              title='Anteprima verbale'
              subtitle={verbalePreviewFileName}
              loading={verbalePreviewLoading}
              error={verbalePreviewError}
              emptyText='Nessun dato disponibile per l&apos;anteprima del verbale.'
              onDownload={handleVerbaleDownload}
              onClose={closeVerbalePreview}
            />
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gap: 12 }}>
        <div style={{
          background: cfg.panelBg,
          border: `${Number(cfg.panelBorderWidth ?? 1)}px solid ${cfg.panelBorderColor}`,
          borderRadius: Number(cfg.panelBorderRadius ?? 10),
          padding: 14,
          display: 'grid',
          gap: 8
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: Number(cfg.titleFontSize || 18), fontWeight: Number(cfg.titleFontWeight || 700), color: '#111827', lineHeight: 1.25 }}>{cfg.title}</div>
              <div style={{ fontSize: Number(cfg.subtitleFontSize || 13), color: '#6b7280', marginTop: 3 }}>{cfg.subtitle}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {isDirty && <span style={{ background: '#fff7ed', color: '#9a3412', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800 }}>Modifiche non salvate</span>}
              <div style={{ background: cfg.primaryColor, color: cfg.primaryTextColor, borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 700 }}>
                {profile.role || 'Profilo non rilevato'}
              </div>
            </div>
          </div>
        </div>

        {!roleAllowed && (
          <InfoBox kind='warn'>
            Questo widget è destinato alla fase amministrativa. Il profilo rilevato non è TI_AMM, RI_AMM, DA o ADMIN.
          </InfoBox>
        )}

        {!hasSelection && (
          <InfoBox kind='warn'>
            Nessuna pratica selezionata. Selezionare una pratica dall’elenco prima di aprire la scheda amministrativa.
          </InfoBox>
        )}

        {hasSelection && (
          <>
            <Section title={title} right={<span style={{ fontSize: 11, opacity: 0.85 }}>{hasDsForSave ? 'Fonte dati collegata' : 'Dati da selezione'}</span>}>
              <FieldGrid
                fields={Array.isArray(cfg.summaryFields) ? cfg.summaryFields : []}
                data={draft || data || { [active?.idFieldName || 'OBJECTID']: oid }}
                layerFields={layerFields}
                labelSize={Number(cfg.labelFontSize || 12)}
                valueSize={Number(cfg.valueFontSize || 13)}
              />
            </Section>

            {cfg.showRoleBox !== false && (
              <Section title='Profilo operativo'>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                  <div style={{ background: '#f6f7f9', borderRadius: 9, padding: '8px 10px' }}>
                    <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>Utente</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.fullName || profile.username || '—'}</div>
                  </div>
                  <div style={{ background: '#f6f7f9', borderRadius: 9, padding: '8px 10px' }}>
                    <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>Profilo</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.label || profile.role || '—'}</div>
                  </div>
                  <div style={{ background: '#f6f7f9', borderRadius: 9, padding: '8px 10px' }}>
                    <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>Modalità</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.role === 'TI_AMM' ? 'Compilazione amministrativa' : profile.role === 'RI_AMM' ? 'Verifica amministrativa' : profile.role === 'DA' ? 'Approvazione direzione amministrativa' : 'Consultazione / amministrazione'}</div>
                  </div>
                </div>
              </Section>
            )}

            {cfg.showWorkflowBox !== false && (
              <Section title='Stato workflow amministrativo'>
                <FieldGrid
                  fields={[
                    { name: 'presa_in_carico_TI_AMM', label: 'Presa in carico TI_AMM' },
                    { name: 'dt_presa_in_carico_TI_AMM', label: 'Data presa TI_AMM' },
                    { name: 'esito_TI_AMM', label: 'Esito TI_AMM' },
                    { name: 'dt_esito_TI_AMM', label: 'Data esito TI_AMM' },
                    { name: 'esito_RI_AMM', label: 'Esito RI_AMM' },
                    { name: 'dt_esito_RI_AMM', label: 'Data esito RI_AMM' },
                    { name: 'esito_DA', label: 'Esito DA' },
                    { name: 'dt_esito_DA', label: 'Data esito DA' }
                  ]}
                  data={draft || data || {}}
                  layerFields={layerFields}
                  labelSize={Number(cfg.labelFontSize || 12)}
                  valueSize={Number(cfg.valueFontSize || 13)}
                />
              </Section>
            )}

            <SanzioniConsultiveSection loadState={sanzioniConsultive} />

            {!hasDsForSave && (
              <InfoBox kind='warn'>
                Fonte dati amministrativa non collegata. Collegare la vista amministrativa al widget in Builder per abilitare il salvataggio.
              </InfoBox>
            )}

            {hasDsForSave && roleAllowed && !canEdit && (
              <InfoBox kind='info'>
                Scheda in sola lettura per il profilo corrente. La compilazione è abilitata per TI_AMM, RI_AMM e ADMIN.
              </InfoBox>
            )}

            <AdminFormSection title='Atto amministrativo' group='atto' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange} />
            <AdminFormSection title='Dati verbale' group='verbale' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange}>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <InfoBox>
                  Numero verbale e data verbale sono generati automaticamente dal sistema. La numerazione è progressiva globale e non viene azzerata per anno o per area; il TI_AMM può compilare solo le note amministrative e generare/consultare il PDF.
                </InfoBox>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                  <button type='button' disabled={!hasSelection || verbalePreviewLoading} onClick={handleVerbalePreview} style={secondaryButtonStyle(!hasSelection || verbalePreviewLoading)}>Anteprima verbale PDF</button>
                  <button type='button' disabled={!hasSelection || verbalePreviewLoading} onClick={handleVerbaleDownload} style={secondaryButtonStyle(!hasSelection || verbalePreviewLoading)}>Scarica verbale PDF</button>
                </div>
              </div>
            </AdminFormSection>
            <AdminFormSection title='Protocollo e notifica' group='notifica' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange} />
            <AdminFormSection title='Sanzione e risarcimento danni' group='sanzione' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange}>
              <div style={{ marginTop: 12 }}>
                <InfoBox>
                  Gli importi sono calcolati automaticamente sulla base del rapporto approvato e delle tabelle regolamentari configurate. TI_AMM compila solo i dati amministrativi successivi: verbale, protocollo, notifica, pagamento, pagoPA/bonifico e allegazioni.
                </InfoBox>
              </div>
            </AdminFormSection>
            <AdminFormSection title='Rimborso attrezzature' group='attrezzature' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange}>
              <div style={{ marginTop: 12 }}>
                <InfoBox>
                  Le componenti economiche del rimborso attrezzature e dell’eventuale cauzione sono alimentate automaticamente dai parametri sanzionatori; le note restano disponibili per integrazioni amministrative non quantitative.
                </InfoBox>
              </div>
            </AdminFormSection>
            <AdminFormSection title='Pagamento' group='pagamento' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange} fieldNames={paymentFieldNames}>
              <PaymentModeInfo mode={paymentMode} />
            </AdminFormSection>
            {showPagopaFields && (
              <AdminFormSection title='pagoPA' group='pagamento' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange} fieldNames={PAGOPA_FIELDS} />
            )}
            {showBonificoFields && (
              <AdminFormSection title='Bonifico bancario' group='bonifico' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange} fieldNames={BONIFICO_FIELDS} />
            )}
            <AdminFormSection title='Chiusura istruttoria amministrativa' group='chiusura' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange}>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <InfoBox>
                  Il pulsante assegna numero e data del verbale solo se ancora assenti e compila i campi di chiusura amministrativa. Stati, esiti e workflow restano gestiti da gii-azioni.
                </InfoBox>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                  <button type='button' disabled={!canEdit} onClick={fillCloseMeta} style={secondaryButtonStyle(!canEdit)}>Compila chiusura istruttoria</button>
                </div>
              </div>
            </AdminFormSection>

            <div style={{ position: 'sticky', bottom: 0, zIndex: 20, background: 'rgba(246,247,249,0.94)', backdropFilter: 'blur(4px)', border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ marginRight: 'auto', color: isDirty ? '#9a3412' : '#6b7280', fontSize: 12, fontWeight: 700 }}>{isDirty ? `${Object.keys(pendingAttrs).length} modifiche da salvare` : 'Nessuna modifica da salvare'}</span>
              <button type='button' disabled={!isDirty || saving} onClick={handleReset} style={secondaryButtonStyle(!isDirty || saving)}>Annulla modifiche</button>
              <button type='button' disabled={!isDirty || saving || !canEdit} onClick={handleSave} style={primaryButtonStyle(!isDirty || saving || !canEdit)}>{saving ? 'Salvataggio…' : 'Salva dati amministrativi'}</button>
            </div>

          </>
        )}
      </div>
    </div>
  )
}

function primaryButtonStyle (disabled?: boolean): React.CSSProperties {
  return {
    border: '1px solid #0d3b66',
    background: disabled ? '#9ca3af' : '#0d3b66',
    color: '#fff',
    borderRadius: 9,
    padding: '8px 14px',
    fontWeight: 800,
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer'
  }
}

function secondaryButtonStyle (disabled?: boolean): React.CSSProperties {
  return {
    border: '1px solid #cbd5e1',
    background: disabled ? '#f3f4f6' : '#fff',
    color: disabled ? '#9ca3af' : '#0f172a',
    borderRadius: 9,
    padding: '8px 12px',
    fontWeight: 700,
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer'
  }
}

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent } from 'jimu-core'
import type { IMConfig, SummaryFieldConfig } from '../config'
import { defaultConfig } from '../config'

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

type AdminFieldKind = 'text' | 'textarea' | 'date' | 'number' | 'domain' | 'readonly-date' | 'readonly-text'

type AdminField = {
  name: string
  label: string
  kind: AdminFieldKind
  group: 'verbale' | 'notifica' | 'sanzione' | 'pagamento' | 'bonifico' | 'chiusura'
  placeholder?: string
  full?: boolean
  readonly?: boolean
}

const ADMIN_FIELDS: AdminField[] = [
  { group: 'verbale', name: 'numero_verbale', label: 'Numero verbale', kind: 'text' },
  { group: 'verbale', name: 'data_verbale', label: 'Data verbale', kind: 'date' },

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
  'pagamento_importo_totale'
])

function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function normalizeFeatureLayerUrl (raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.replace(/[?#].*$/, '').replace(/\/+$/, '')
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

function readMoneyFromDraft (draft: Record<string, any>, name: string): number | null {
  const raw = pickAttrCI(draft, [name])
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  return parseNumberInput(raw)
}

function buildBaseCalculation (draft: Record<string, any>, profile: { username: string, fullName: string }): Record<string, any> {
  const base = readMoneyFromDraft(draft, 'sanzione_importo_base')
  const ridotta = readMoneyFromDraft(draft, 'sanzione_importo_ridotta')
  const danni = readMoneyFromDraft(draft, 'risarcimento_danni_importo') ?? 0
  const spese = readMoneyFromDraft(draft, 'sanzione_spese_notifica') ?? 0
  const sanzioneUsata = ridotta ?? base ?? 0
  const criterio = ridotta != null ? 'Importo sanzione ridotta' : base != null ? 'Importo sanzione base' : 'Nessun importo sanzione valorizzato'
  const totale = sanzioneUsata + danni + spese
  const now = Date.now()
  const user = String(profile.fullName || profile.username || '').trim()
  const when = new Date(now).toLocaleString('it-IT')
  const dettaglio = [
    'Calcolo automatico base (non normativo).',
    '',
    `Importo sanzione base: ${base != null ? formatEuroText(base) : '—'}`,
    `Importo sanzione ridotta: ${ridotta != null ? formatEuroText(ridotta) : '—'}`,
    `Criterio applicato: ${criterio}`,
    `Risarcimento danni: ${formatEuroText(danni)}`,
    `Spese di notifica: ${formatEuroText(spese)}`,
    `Totale da pagare: ${formatEuroText(totale)}`,
    '',
    `Calcolo effettuato da: ${user || '—'}`,
    `Data calcolo: ${when}`
  ].join('\n')
  return {
    pagamento_importo_totale: totale,
    sanzione_calcolata_il: now,
    sanzione_calcolata_da: user,
    sanzione_dettaglio_calcolo: dettaglio
  }
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

function parseNumberInput (v: any): number | null {
  const s = String(v ?? '').trim().replace(/\./g, '').replace(',', '.')
  if (!s) return null
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
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#0d3b66', color: '#fff', padding: '9px 12px', fontWeight: 700, fontSize: 13 }}>
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

function addCommonViolationDetails (data: any, fields: LayerFieldInfo[], details: Array<{ label: string, value: string }>) {
  addViolationDetail(details, 'Grado', firstViolationValue(data, fields, ['grado']))
  const recidiva = pickAttrCI(data, ['recidiva'])
  if (isMeaningfulValue(recidiva)) addViolationDetail(details, 'Occorrenza', isCheckedValue(recidiva) ? 'Recidiva' : 'Prima contestazione')
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
    addCommonViolationDetails(d, fields, details)
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
    addCommonViolationDetails(d, fields, details)
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
    addCommonViolationDetails(d, fields, details)
    rows.push({ key: 'art17', label: 'Art. 17', details })
  }

  for (const art of DIRECT_ARTICLE_FIELDS) {
    if (!isCheckedValue(pickAttrCI(d, [art.field]))) continue
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, art.supDich || []))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, art.supIrr || []))
    addCommonViolationDetails(d, fields, details)
    rows.push({ key: art.field, label: art.label, details })
  }

  return rows
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
  const readonly = field.readonly || !canEdit || !exists || lf?.editable === false
  const options = getDomainOptions(lf)
  const miss = !exists

  const label = (
    <div style={{ color: '#374151', fontSize: 12, fontWeight: 800, marginBottom: 5, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{field.label}</span>
      {miss && <span style={{ color: '#b45309', fontWeight: 700, fontSize: 10 }}>campo assente</span>}
    </div>
  )

  let control: React.ReactNode = null
  if (field.kind === 'textarea') {
    control = <TextArea value={raw ?? ''} disabled={readonly} onChange={v => onChange(real, v || null)} />
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
    control = <TextInput value={raw ?? ''} disabled={readonly} onChange={v => onChange(real, v || null)} />
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
  children?: React.ReactNode
}) {
  const items = ADMIN_FIELDS.filter(f => f.group === props.group)
  return (
    <Section title={props.title}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {items.map(f => <FieldEditor key={f.name} field={f} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />)}
      </div>
      {props.children}
    </Section>
  )
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
  const canEdit = roleAllowed && ['TI_AMM', 'ADMIN'].includes(String(profile.role || '').toUpperCase()) && hasDsForSave

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

  const onFieldChange = React.useCallback((name: string, value: any) => {
    setDraft(prev => ({ ...(prev || {}), [name]: value }))
  }, [])

  const pendingAttrs = React.useMemo(() => changedAttrs(layerFields, initialDraft, draft), [layerFields, initialDraft, draft])
  const isDirty = Object.keys(pendingAttrs).length > 0

  const handleReset = () => {
    setDraft({ ...(initialDraft || {}) })
  }

  const fillCalculatedMeta = () => {
    const next = buildBaseCalculation(draft || {}, profile)
    setDraft(prev => ({
      ...(prev || {}),
      ...next
    }))
    setDialog({ kind: 'ok', title: 'Calcolo aggiornato', text: 'Totale da pagare e dettaglio calcolo sono stati aggiornati. Ricordati di salvare i dati amministrativi.' })
  }

  const fillCloseMeta = () => {
    const now = Date.now()
    setDraft(prev => ({
      ...(prev || {}),
      istruttoria_amm_chiusa_il: now,
      istruttoria_amm_chiusa_da: profile.fullName || profile.username || ''
    }))
  }

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
      const cleanAttrs = filterAttrsForLayer({ [idName]: Number(oid), ...attrs }, fields)
      const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
      const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
      const err = upd?.error
      const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
      if (!ok) {
        const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
        throw new Error(detail)
      }
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

            <ViolationsSection data={draft || data || {}} layerFields={layerFields} />

            {!hasDsForSave && (
              <InfoBox kind='warn'>
                Fonte dati amministrativa non collegata. Collegare la vista amministrativa al widget in Builder per abilitare il salvataggio.
              </InfoBox>
            )}

            {hasDsForSave && roleAllowed && !canEdit && (
              <InfoBox kind='info'>
                Scheda in sola lettura per il profilo corrente. La compilazione è abilitata per TI_AMM e ADMIN.
              </InfoBox>
            )}

            <AdminFormSection title='Dati verbale' group='verbale' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange} />
            <AdminFormSection title='Protocollo e notifica' group='notifica' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange} />
            <AdminFormSection title='Sanzione' group='sanzione' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange}>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button type='button' disabled={!canEdit} onClick={fillCalculatedMeta} style={secondaryButtonStyle(!canEdit)}>Calcola totale e dettaglio</button>
              </div>
            </AdminFormSection>
            <AdminFormSection title='Pagamento' group='pagamento' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange} />
            <AdminFormSection title='Bonifico bancario' group='bonifico' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange} />
            <AdminFormSection title='Chiusura istruttoria amministrativa' group='chiusura' draft={draft} fields={layerFields} canEdit={canEdit} onChange={onFieldChange}>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <InfoBox>
                  Il pulsante compila solo i campi di chiusura amministrativa. Non aggiorna stati, esiti o workflow: quelli restano gestiti da gii-azioni.
                </InfoBox>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type='button' disabled={!canEdit} onClick={fillCloseMeta} style={secondaryButtonStyle(!canEdit)}>Compila chiusura istruttoria</button>
                </div>
              </div>
            </AdminFormSection>

            <div style={{ position: 'sticky', bottom: 0, zIndex: 20, background: 'rgba(246,247,249,0.94)', backdropFilter: 'blur(4px)', border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ marginRight: 'auto', color: isDirty ? '#9a3412' : '#6b7280', fontSize: 12, fontWeight: 700 }}>{isDirty ? `${Object.keys(pendingAttrs).length} modifiche da salvare` : 'Nessuna modifica da salvare'}</span>
              <button type='button' disabled={!isDirty || saving} onClick={handleReset} style={secondaryButtonStyle(!isDirty || saving)}>Annulla modifiche</button>
              <button type='button' disabled={!isDirty || saving || !canEdit} onClick={handleSave} style={primaryButtonStyle(!isDirty || saving || !canEdit)}>{saving ? 'Salvataggio…' : 'Salva dati amministrativi'}</button>
            </div>

            {cfg.showPlaceholderSections !== false && (
              <Section title='Funzioni predisposte per patch successive'>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                  <InfoBox>Il calcolo base aggiorna il totale da pagare sommando sanzione, risarcimento danni e spese. Il calcolo normativo per articolo sarà collegato dopo la definizione della tabella parametri.</InfoBox>
                  <InfoBox>Il PDF del verbale sarà collegato al futuro builder in <strong>_shared/gii-anteprime/verbale</strong>.</InfoBox>
                  <InfoBox>Gli allegati amministrativi saranno gestiti in una patch dedicata.</InfoBox>
                </div>
              </Section>
            )}
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

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import { createPortal } from 'react-dom'
import type { IMConfig } from '../config'
import GiiActiveToggle from '../../../_shared/gii-ui/active-toggle'

const { Fragment } = React


type GiiEditLockRect = {
  key: string
  left: number
  top: number
  width: number
  height: number
}

function getGiiGlobalOverlayHost (): HTMLElement | null {
  try {
    const doc = (window as any)?.top?.document || document
    return doc?.body || document.body
  } catch {
    return typeof document !== 'undefined' ? document.body : null
  }
}

function isGiiBuilderMode (): boolean {
  try {
    const doc = (window as any)?.top?.document || document
    const classes = doc?.body?.classList ? Array.from(doc.body.classList).join(' ').toLowerCase() : ''
    if (classes.includes('builder') || classes.includes('jimu-builder')) return true
    if (doc?.querySelector?.('[data-testid="builder"], .builder-header, .jimu-builder')) return true
  } catch {}
  return false
}

function findGiiWidgetElement (doc: Document, widgetId: string): HTMLElement | null {
  const id = String(widgetId || '').trim()
  if (!id) return null
  for (const selector of [`[data-widgetid="${id}"]`, `[data-widget-id="${id}"]`, `[widgetid="${id}"]`, `[id="${id}"]`, `#${id}`]) {
    try {
      const el = doc.querySelector(selector) as HTMLElement | null
      if (el) return el
    } catch {}
  }
  return null
}

function getGiiVisibleLockRect (el: HTMLElement, key: string, viewW: number, viewH: number, win: Window): GiiEditLockRect | null {
  try {
    if (!el || !el.isConnected) return null
    const computed = win.getComputedStyle?.(el)
    if (computed && (computed.display === 'none' || computed.visibility === 'hidden' || computed.opacity === '0')) return null
    const r = el.getBoundingClientRect()
    const left = Math.max(0, Math.floor(r.left))
    const top = Math.max(0, Math.floor(r.top))
    const right = Math.min(viewW, Math.ceil(r.right))
    const bottom = Math.min(viewH, Math.ceil(r.bottom))
    const width = Math.max(0, right - left)
    const height = Math.max(0, bottom - top)
    return width >= 2 && height >= 2 ? { key, left, top, width, height } : null
  } catch {
    return null
  }
}


type TransferActionIconName = 'import' | 'export'

function TransferActionIcon (props: { name: TransferActionIconName, size?: number }): React.ReactElement {
  const size = Number(props.size || 18)
  if (props.name === 'import') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
        <path d='M17 8l-5-5-5 5'/>
        <path d='M12 3v12'/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
      <path d='M7 10l5 5 5-5'/>
      <path d='M12 15V3'/>
    </svg>
  )
}

function transferActionButtonStyle (disabled: boolean): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    padding: 0,
    boxSizing: 'border-box',
    borderRadius: 7,
    border: `1.5px solid ${disabled ? '#e5e7eb' : '#0d3b66'}`,
    background: disabled ? '#e5e7eb' : '#ffffff',
    color: disabled ? '#9ca3af' : '#0d3b66',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    flex: '0 0 auto',
    opacity: disabled ? 0.6 : 1
  }
}





type NewRecordButtonProps = {
  onClick: (event: any) => void
  disabled?: boolean
  title: string
}

function NewRecordButton (props: NewRecordButtonProps) {
  const disabled = !!props.disabled
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={props.onClick}
      title={props.title}
      aria-label={props.title}
      style={{
        width: 32,
        height: 32,
        minHeight: 32,
        boxSizing: 'border-box',
        padding: 0,
        borderRadius: 7,
        border: disabled ? '1.5px solid #e5e7eb' : '1.5px solid #0d3b66',
        background: disabled ? '#e5e7eb' : '#ffffff',
        color: disabled ? '#9ca3af' : '#0d3b66',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flex: '0 0 auto',
        opacity: disabled ? 0.6 : 1
      }}
    >
      <svg width={19} height={19} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M21 13.1v5.9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-4'/>
        <path d='M3 15V5c0-1.1.9-2 2-2h5.9'/>
        <path d='M16.5 3v9'/>
        <path d='M12 7.5h9'/>
      </svg>
    </button>
  )
}

type RecordActionButtonProps = {
  onClick: (event: any) => void
  disabled?: boolean
  title?: string
  ariaLabel?: string
  marginRight?: number
}

function recordActionStyle (color: string, disabled: boolean, marginRight = 0): React.CSSProperties {
  return {
    border: 'none',
    background: 'transparent',
    color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: 30,
    height: 30,
    padding: 0,
    boxSizing: 'border-box',
    marginRight,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    opacity: disabled ? 0.45 : 1
  }
}

function RecordEditButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Modifica'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#0d3b66', disabled, props.marginRight ?? 4)}>
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
      </svg>
    </button>
  )
}

function RecordDeleteButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Elimina'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#b42318', disabled, props.marginRight ?? 0)}>
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M3 6h18'/>
        <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
        <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
        <path d='M10 11v6'/>
        <path d='M14 11v6'/>
      </svg>
    </button>
  )
}

type DatasetKey = 'notaSpese' | 'sanzioniAmm' | 'attrezzature'

type AccessContext = {
  ruoloCod: string
  areaCod: string
  profiloCod: string
  allowedDatasets: DatasetKey[]
  isAdmin: boolean
}

type DatasetDefinition = {
  key: DatasetKey
  label: string
  shortLabel: string
  fixedCategory?: string
  allowedCategories?: string[]
  hasCategory: boolean
}

const DATASETS: Record<DatasetKey, DatasetDefinition> = {
  notaSpese: {
    key: 'notaSpese',
    label: 'Parametri nota spese',
    shortLabel: 'Nota spese',
    hasCategory: false
  },
  sanzioniAmm: {
    key: 'sanzioniAmm',
    label: 'Sanzioni, riduzioni e cauzione',
    shortLabel: 'Sanzioni e cauzione',
    hasCategory: true,
    allowedCategories: ['SANZIONE', 'RIDUZIONE', 'CAUZIONE']
  },
  attrezzature: {
    key: 'attrezzature',
    label: 'Prezzi delle attrezzature',
    shortLabel: 'Attrezzature',
    hasCategory: true,
    fixedCategory: 'ATTREZZATURA',
    allowedCategories: ['ATTREZZATURA']
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  SANZIONE: 'Sanzione',
  RIDUZIONE: 'Riduzione',
  CAUZIONE: 'Cauzione',
  ATTREZZATURA: 'Attrezzatura'
}

const ATTREZZATURA_TYPES = [
  { value: 'TESSERA_ELETTRONICA', label: 'Tessera elettronica' },
  { value: 'CURVA_DERIVAZIONE', label: 'Curva di derivazione' },
  { value: 'SIFONE', label: 'Sifone' },
  { value: 'PARATOIA', label: 'Paratoia' }
] as const


const styles = `
  .gns { font-size: 13px; padding: 12px; height: 100%; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; }
  .gns-title { font-size: 15px; font-weight: bold; color: #1F4E79; border-bottom: 2px solid #1F4E79; padding-bottom: 6px; margin: 0; }
  .gns-datasets { display: flex; gap: 7px; flex-wrap: wrap; }
  .gns-dataset { padding: 6px 13px; border: 1px solid #8fb2d4; border-radius: 5px; background: #fff; color: #1F4E79; font-size: 12px; font-weight: bold; cursor: pointer; }
  .gns-dataset-active { background: #1F4E79; color: #fff; border-color: #1F4E79; }
  .gns-context { padding: 6px 10px; border-radius: 4px; background: #eaf2fb; border: 1px solid #c5d9f1; color: #1F4E79; font-size: 12px; font-weight: bold; }
  .gns-form { background: var(--gns-detail-card-background, #f5f9ff); border: 1px solid #c5d9f1; border-radius: 6px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .gns-field { display: flex; flex-direction: column; gap: 3px; }
  .gns-label { font-size: var(--gns-toolbar-label-font-size, 11px); font-weight: bold; color: var(--gns-toolbar-label-color, #1F4E79); }
  .gns-input, .gns-select { width: 100%; height: 34px; padding: 5px 8px; border: 1px solid #aac4e0; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fff; }
  .gns-input:focus, .gns-select:focus { outline: none; border-color: #1F4E79; }
  .gns-input:disabled, .gns-select:disabled { background: #edf0f3; color: #555; cursor: not-allowed; }
  .gns-btns { display: flex; gap: 8px; grid-column: 1 / -1; padding-top: 4px; }
  .gns-btn { padding: 6px 18px; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: bold; }
  .gns-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .gns-btn-save { background: #1F4E79; color: #fff; }
  .gns-btn-cancel { background: #e0e0e0; color: #333; }
  .gns-btn-new { background: #375623; color: #fff; }
  .gns-btn-export { background: #1B6584; color: #fff; }
  .gns-table-wrap { flex: 1; overflow: auto; border: 1px solid #c5d9f1; border-radius: 6px; min-height: 0; background: var(--gns-records-card-background, #f5f9ff); }
  .gns-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .gns-table th { background: #1F4E79; color: #fff; padding: 7px 8px; text-align: left; position: sticky; top: 0; z-index: 1; white-space: nowrap; }
  .gns-table td { padding: 6px 8px; border-bottom: 1px solid #e0eaf4; vertical-align: middle; }
  .gns-table tbody tr:nth-child(odd) td { background: var(--gns-records-card-background, #f5f9ff); }
  .gns-table tbody tr:nth-child(even) td { background: linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), var(--gns-records-card-background, #f5f9ff); }
  .gns.gns-editing-lock { position: relative; }
  .gns.gns-editing-lock::before { content: ''; position: absolute; inset: 0; z-index: 5; background: rgba(15, 23, 42, 0.22); border-radius: 6px; pointer-events: auto; }
  .gns.gns-editing-lock .gns-form { position: relative; z-index: 10; pointer-events: auto; }
  .gns-table-attrezzature tbody tr:nth-child(odd) td { background: #ffffff; }
  .gns-table-attrezzature tbody tr:nth-child(even) td { background: #eaf2fb; }
  .gns-table tr:hover td, .gns-table-attrezzature tbody tr:hover td { background: #d8eaff; }
  .gns-act { cursor: pointer; font-size: 11px; padding: 2px 8px; border-radius: 3px; border: none; margin-right: 4px; font-weight: bold; }
  .gns-act-edit { background: #1B6584; color: #fff; }
  .gns-act-del { background: #c00; color: #fff; }
  .gns-msg { padding: 7px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .gns-msg-ok { background: #e2efda; color: #375623; border: 1px solid #b8d4b0; }
  .gns-msg-err { background: #fce4e4; color: #c00; border: 1px solid #f5b8b8; }
  .gns-empty { text-align: center; color: #888; padding: 20px; font-style: italic; }
`

const TITLE_DEFAULT = 'Gestione parametri'
const COMMON_FIELD_ORDER = ['codice_parametro', 'descrizione', 'anno_riferimento', 'valore_num', 'valore_testo', 'attivo', 'data_validita_da', 'data_validita_a', 'note']
const ALL_LOGICAL_FIELDS = ['codice_parametro', 'categoria_parametro', 'descrizione', 'anno_riferimento', 'valore_num', 'valore_testo', 'attivo', 'data_validita_da', 'data_validita_a', 'note']
const FIELD_TYPES: Record<string, string> = {
  codice_parametro: 'text',
  categoria_parametro: 'text',
  descrizione: 'text',
  anno_riferimento: 'int',
  valore_num: 'number2',
  valore_testo: 'text',
  attivo: 'bool',
  data_validita_da: 'date',
  data_validita_a: 'date',
  note: 'text'
}

function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

function normalizeUrl(raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    const u = new URL(s)
    u.search = ''
    u.hash = ''
    let out = u.toString().replace(/\/$/, '')
    if (/\/(FeatureServer|MapServer)$/i.test(out)) out += '/0'
    return out
  } catch { return '' }
}

const LAYER_CACHE: Record<string, any> = {}
async function getLayer(urlRaw: any): Promise<any> {
  const url = normalizeUrl(urlRaw)
  if (!url) throw new Error('URL tabella non configurata.')
  if (LAYER_CACHE[url]) return LAYER_CACHE[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url })
  if (typeof fl.load === 'function') await fl.load()
  LAYER_CACHE[url] = fl
  return fl
}

function fieldMapForLayer(fl: any): Record<string, string> {
  const map: Record<string, string> = {}
  for (const field of (fl?.fields || [])) {
    const name = String(field?.name || '')
    if (name) map[name.toLowerCase()] = name
  }
  return map
}

function readAttr(attrs: any, fieldName: string): any {
  if (!attrs) return undefined
  if (Object.prototype.hasOwnProperty.call(attrs, fieldName)) return attrs[fieldName]
  const wanted = fieldName.toLowerCase()
  const key = Object.keys(attrs).find((k) => k.toLowerCase() === wanted)
  return key ? attrs[key] : undefined
}

function emptyForm(defaultCategory = '') {
  return {
    objectid: undefined,
    codice_parametro: '',
    categoria_parametro: defaultCategory,
    descrizione: '',
    anno_riferimento: '',
    valore_num: '',
    valore_testo: '',
    attivo: '1',
    data_validita_da: '',
    data_validita_a: '',
    note: '',
    attrezzatura_tipo: ''
  } as any
}

function num(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function toDateValue(v: any): string {
  if (v == null || v === '') return ''
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  } catch { return '' }
}

function formatCell(v: any, kind: string): string {
  if (v == null || v === '') return ''
  if (kind === 'bool') return num(v) === 1 ? 'Sì' : 'No'
  if (kind === 'date') { const s = toDateValue(v); return s ? s.split('-').reverse().join('/') : '' }
  if (kind === 'number2') return num(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (kind === 'int') return String(Math.trunc(num(v)))
  return String(v)
}

async function fetchRows(url: string, orderByCode = false): Promise<any[]> {
  const fl = await getLayer(url)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = '1=1'
  q.outFields = ['*']
  q.returnGeometry = false
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const fields = fieldMapForLayer(fl)
  const codeField = fields.codice_parametro
  q.orderByFields = orderByCode && codeField
    ? [`${codeField} ASC`, `${oidField} ASC`]
    : [`${oidField} DESC`]
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((feature: any) => {
    const attrs = feature?.attributes || {}
    const row: any = { objectid: Number(readAttr(attrs, String(fl?.objectIdField || 'OBJECTID')) || 0) }
    ALL_LOGICAL_FIELDS.forEach((field) => { row[field] = readAttr(attrs, field) })
    return row
  })
}

async function saveRow(url: string, form: any, definition: DatasetDefinition): Promise<void> {
  const fl = await getLayer(url)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const fields = fieldMapForLayer(fl)
  const logicalFields = definition.hasCategory ? ['codice_parametro', 'categoria_parametro', ...COMMON_FIELD_ORDER.slice(1)] : COMMON_FIELD_ORDER
  const attrs: any = {}

  logicalFields.forEach((logicalField) => {
    const actualField = fields[logicalField.toLowerCase()]
    if (!actualField) return
    const kind = FIELD_TYPES[logicalField]
    const raw = form[logicalField]
    if (kind === 'bool') attrs[actualField] = String(raw || '1') === '1' ? 1 : 0
    else if (kind === 'int') attrs[actualField] = raw === '' ? null : Math.trunc(num(raw))
    else if (kind === 'number2') attrs[actualField] = raw === '' ? null : num(raw)
    else if (kind === 'date') attrs[actualField] = raw ? new Date(`${raw}T00:00:00`).getTime() : null
    else attrs[actualField] = String(raw || '').trim()
  })

  if (form.objectid != null) attrs[oidField] = Number(form.objectid)
  const payload = form.objectid != null
    ? { updateFeatures: [{ attributes: attrs }] }
    : { addFeatures: [{ attributes: attrs }] }
  const res = await fl.applyEdits(payload as any)
  const result = form.objectid != null ? res?.updateFeatureResults?.[0] : res?.addFeatureResults?.[0]
  if (result?.error) throw new Error(result.error.message || 'Salvataggio non riuscito.')
}

async function deleteRow(url: string, objectid: number): Promise<void> {
  const fl = await getLayer(url)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const Graphic = await loadEsriModule<any>('esri/Graphic')
  const graphic = new Graphic({ attributes: { [oidField]: Number(objectid) } })
  const res = await fl.applyEdits({ deleteFeatures: [graphic] } as any)
  const result = res?.deleteFeatureResults?.[0]
  if (result?.error) throw new Error(result.error.message || 'Eliminazione non riuscita.')
}

function exportCsv(rows: any[], title: string, definition: DatasetDefinition, includeParameterCode: boolean) {
  const allFields = definition.hasCategory ? ['codice_parametro', 'categoria_parametro', ...COMMON_FIELD_ORDER.slice(1)] : COMMON_FIELD_ORDER
  const visibleFields = definition.key === 'attrezzature' ? allFields.filter((field) => field !== 'valore_testo') : allFields
  const fields = includeParameterCode ? visibleFields : visibleFields.filter((field) => field !== 'codice_parametro')
  const header = fields.join(',')
  const body = rows.map((row) => fields.map((field) => `"${String(row?.[field] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${title.replace(/\s+/g, '_').toLowerCase()}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

const AREA_CODE_BY_NUM: Record<number, string> = { 1: 'AMM', 2: 'AGR', 3: 'TEC' }

function cleanCode(v: any): string { return String(v ?? '').trim().toUpperCase() }

function normalizeRoleCode(...values: any[]): string {
  for (const value of values) {
    const s = normalizeGiiAccessCode(value)
    if (!s) continue
    if (['TR', 'IT', 'CS', 'RIT', 'DT', 'DA', 'ADMIN', 'IA', 'RIA'].includes(s)) return s
  }
  return ''
}

function normalizeAreaCode(...values: any[]): string {
  for (const value of values) {
    const s = cleanCode(value)
    if (!s) continue
    const n = Number(s)
    if (Number.isFinite(n) && AREA_CODE_BY_NUM[n]) return AREA_CODE_BY_NUM[n]
    if (['AMM', 'AGR', 'TEC'].includes(s)) return s
    if (s.includes('AMMINISTR')) return 'AMM'
    if (s.includes('AGRAR')) return 'AGR'
    if (s.includes('TECNIC')) return 'TEC'
  }
  return ''
}

function normalizeGiiAccessCode(v: any): string { return String(v ?? '').trim().toUpperCase().replace(/-/g, '_') }

function getAccessContext(): AccessContext {
  const user: any = (window as any).__giiUserRole || {}
  const profiloCod = normalizeGiiAccessCode(user?.profiloCod ?? user?.profilo_cod ?? user?.profileCode ?? user?.profile_code)
  const ruoloCod = normalizeRoleCode(user?.ruoloCod, user?.ruolo_cod, user?.roleCod, user?.roleCode, user?.role_code, profiloCod)
  const areaCod = normalizeAreaCode(user?.areaCod, user?.area_cod, user?.areaCode, user?.area_code, user?.area, user?.areaLabel)

  const allowed = new Set<DatasetKey>()
  let isAdmin = user?.isAdmin === true || profiloCod === 'ADMIN' || ruoloCod === 'ADMIN'

  const applyAssignment = (raw: any) => {
    const assignmentProfile = normalizeGiiAccessCode(raw?.profiloCod ?? raw?.profilo_cod ?? raw?.profileCode ?? raw?.profile_code)
    const assignmentRole = normalizeRoleCode(
      raw?.ruoloCod, raw?.ruolo_cod, raw?.roleCod, raw?.roleCode, raw?.role_code, assignmentProfile
    )
    const assignmentArea = normalizeAreaCode(
      raw?.areaCod, raw?.area_cod, raw?.areaCode, raw?.area_code, raw?.area, raw?.areaLabel
    )

    if (assignmentProfile === 'ADMIN' || assignmentRole === 'ADMIN') {
      isAdmin = true
      allowed.add('notaSpese')
      allowed.add('sanzioniAmm')
      allowed.add('attrezzature')
      return
    }
    if (assignmentProfile === 'RIA' || assignmentRole === 'RIA') allowed.add('sanzioniAmm')
    if (assignmentRole === 'RIT' && (assignmentArea === 'AGR' || assignmentArea === 'TEC')) {
      allowed.add('notaSpese')
      allowed.add('attrezzature')
    }
  }

  applyAssignment(user)
  const assignments = Array.isArray(user?.assignments) ? user.assignments : []
  assignments.forEach(applyAssignment)

  const allowedDatasets: DatasetKey[] = ['notaSpese', 'sanzioniAmm', 'attrezzature'].filter((key) => allowed.has(key as DatasetKey)) as DatasetKey[]
  return { ruoloCod, areaCod, profiloCod, allowedDatasets, isAdmin }
}

function categoryLabel(value: any): string {
  const code = cleanCode(value)
  return CATEGORY_LABELS[code] || code
}


function equipmentTypeLabel(value: any): string {
  const code = cleanCode(value)
  return ATTREZZATURA_TYPES.find((item) => item.value === code)?.label || ''
}

function buildEquipmentDescription(typeValue: any): string {
  return equipmentTypeLabel(typeValue)
}

function inferEquipmentType(row: any): string {
  const source = asciiUpper(`${row?.codice_parametro || ''} ${row?.descrizione || ''}`)
  if (/TESSER/.test(source)) return 'TESSERA_ELETTRONICA'
  if (/CURV/.test(source) && /DERIVAZ/.test(source)) return 'CURVA_DERIVAZIONE'
  if (/SIFON/.test(source)) return 'SIFONE'
  if (/PARATOI/.test(source)) return 'PARATOIA'
  return ''
}

function asciiUpper(value: any): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function stableCodeHash(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6)
}

function limitParameterCode(value: string): string {
  const code = String(value || '').replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '')
  if (code.length <= 120) return code
  return `${code.slice(0, 113).replace(/[._]+$/g, '')}.${stableCodeHash(code)}`
}

function generateParameterCode(definition: DatasetDefinition, categoryValue: any, descriptionValue: any, equipmentTypeValue?: any): string {
  if (definition.key === 'attrezzature') {
    const equipmentType = cleanCode(equipmentTypeValue)
    if (!equipmentType) return ''
    return limitParameterCode(`ATTREZZATURA.${equipmentType}`)
  }

  const original = asciiUpper(descriptionValue).trim()
  if (!original) return ''

  if (definition.key === 'notaSpese' && /SPESE?\s+GENERALI/.test(original)) {
    return 'SPESE_GENERALI_PERC'
  }

  const category = cleanCode(categoryValue || definition.fixedCategory)
  const prefix = definition.key === 'notaSpese'
    ? 'NOTA_SPESE'
    : (category || 'PARAMETRO')

  const articleMatch = original.match(/\bART(?:ICOLO)?\.?\s*(\d+)\b/)
  const gravityMatch = original.match(/GRADO\s+DI\s+GRAVITA\s*[:\-]?\s*([1-4])\b/) || original.match(/GRAVITA\s*[:\-]?\s*([1-4])\b/)
  const isEuroHa = /(€\s*\/\s*HA|EURO\s*(?:PER|\/)\s*ETTAR|PER\s+ETTAR|\bEURO_HA\b)/.test(original)
  const isPercentuale = /(PERCENTUALE|PERCENT|%)/.test(original)
  const isPieLista = /(PIE\s+DI\s+LISTA|PIELISTA|DA\s+QUANTIFICARE)/.test(original)

  if (prefix === 'SANZIONE' && articleMatch?.[1] === '42' && gravityMatch?.[1]) {
    return `SANZIONE.ART42.GRAVITA.${gravityMatch[1]}`
  }

  let remainder = original
    .replace(/\bART(?:ICOLO)?\.?\s*\d+\b/g, ' ')
    .replace(/GRADO\s+DI\s+GRAVITA\s*[:\-]?\s*[1-4]\b/g, ' ')
    .replace(/GRAVITA\s*[:\-]?\s*[1-4]\b/g, ' ')
    .replace(/€\s*\/\s*HA|EURO\s*(?:PER|\/)\s*ETTAR[OI]?|PER\s+ETTAR[OI]?|\bEURO_HA\b/g, ' ')
    .replace(/PIE\s+DI\s+LISTA|PIELISTA|DA\s+QUANTIFICARE/g, ' ')
    .replace(/PERCENTUALE|PERCENT|%/g, ' ')
    .replace(/\b(SANZIONE|SANZIONI|PECUNIARIA|RIDUZIONE|RIDUZIONI|CAUZIONE|ATTREZZATURA|ATTREZZATURE|RIMBORSO|RIMBORSI|PARAMETRO|PARAMETRI|IMPORTO|IMPORTI|VALORE|VALORI|PREZZO|PREZZI)\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  const segments: string[] = [prefix]
  if (articleMatch?.[1]) segments.push(`ART${articleMatch[1]}`)
  if (gravityMatch?.[1]) segments.push('GRAVITA', gravityMatch[1])
  if (isEuroHa) segments.push('EURO_HA')
  if (isPercentuale) segments.push('PERCENTUALE')
  if (isPieLista) segments.push('PIELISTA')
  if (remainder) segments.push(remainder)
  if (segments.length === 1) segments.push('GENERICO')

  return limitParameterCode(segments.join('.'))
}

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const title = String(cfg.title || TITLE_DEFAULT)
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = Number(cfg.sectionTitleFontSize || 12.5)
  const toolbarLabelColor = String(cfg.toolbarLabelColor || '#1F4E79')
  const toolbarLabelFontSize = Number(cfg.toolbarLabelFontSize || 11.5)
  const detailCardBackgroundColor = String(cfg.detailCardBackgroundColor || '#f5f9ff')
  const recordsCardBackgroundColor = String(cfg.recordsCardBackgroundColor || '#f5f9ff')

  const [access, setAccess] = React.useState<AccessContext>(getAccessContext())
  const [activeDataset, setActiveDataset] = React.useState<DatasetKey | null>(() => getAccessContext().allowedDatasets[0] || null)
  const [rows, setRows] = React.useState<any[]>([])
  const [form, setForm] = React.useState<any>(emptyForm())
  const [editing, setEditing] = React.useState(false)

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [editLockRects, setEditLockRects] = React.useState<GiiEditLockRect[]>([])

  React.useEffect(() => {
    if (!editing || isGiiBuilderMode()) { setEditLockRects([]); return }
    const host = getGiiGlobalOverlayHost()
    if (!host) { setEditLockRects([]); return }
    const doc = host.ownerDocument || document
    const win = doc.defaultView || window

    const computeRects = () => {
      const viewW = Math.max(0, win.innerWidth || doc.documentElement?.clientWidth || 0)
      const viewH = Math.max(0, win.innerHeight || doc.documentElement?.clientHeight || 0)
      const next: GiiEditLockRect[] = []
      for (const id of ['widget_840', 'widget_1082', 'widget_1111']) {
        const el = findGiiWidgetElement(doc, id)
        const rect = el ? getGiiVisibleLockRect(el, id, viewW, viewH, win) : null
        if (rect) next.push(rect)
      }
      if (next.length === 0 && rootRef.current) {
        try {
          const r = rootRef.current.getBoundingClientRect()
          const headerH = Math.max(0, Math.floor(r.top))
          const leftW = Math.max(0, Math.floor(r.left))
          if (headerH > 0) next.push({ key: 'fallback-header', left: 0, top: 0, width: viewW, height: headerH })
          if (leftW > 0) next.push({ key: 'fallback-left', left: 0, top: headerH, width: leftW, height: Math.max(0, viewH - headerH) })
        } catch {}
      }
      setEditLockRects(next)
    }

    let raf = 0
    const schedule = () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { raf = win.requestAnimationFrame(computeRects) } catch { computeRects() }
    }
    schedule()

    let ro: ResizeObserver | null = null
    try {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(schedule)
        const observed = new Set<Element>()
        for (const id of ['widget_840', 'widget_1082', 'widget_1111']) {
          const el = findGiiWidgetElement(doc, id)
          if (el && !observed.has(el)) { observed.add(el); ro.observe(el) }
        }
        if (rootRef.current && !observed.has(rootRef.current)) ro.observe(rootRef.current)
      }
    } catch { ro = null }

    const blockEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation()
        if (typeof (event as any).stopImmediatePropagation === 'function') (event as any).stopImmediatePropagation()
      }
    }
    win.addEventListener('resize', schedule, true)
    win.addEventListener('scroll', schedule, true)
    doc.addEventListener('keydown', blockEscape, true)
    const intervalId = win.setInterval(schedule, 300)
    return () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { ro?.disconnect() } catch {}
      try { win.removeEventListener('resize', schedule, true) } catch {}
      try { win.removeEventListener('scroll', schedule, true) } catch {}
      try { doc.removeEventListener('keydown', blockEscape, true) } catch {}
      try { win.clearInterval(intervalId) } catch {}
      setEditLockRects([])
    }
  }, [editing])

  const editLockPortal = editing && editLockRects.length > 0 && typeof document !== 'undefined'
    ? createPortal(
      <Fragment>
        {editLockRects.map(rect => (
          <div
            key={rect.key}
            aria-hidden='true'
            style={{ position: 'fixed', zIndex: 2147483000, background: 'rgba(0,0,0,0.52)', pointerEvents: 'auto', touchAction: 'none', left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            onWheel={(e) => { e.preventDefault(); e.stopPropagation() }}
            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation() }}
          />
        ))}
      </Fragment>,
      getGiiGlobalOverlayHost() || document.body
    )
    : null
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [adminCodeOverride, setAdminCodeOverride] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null)

  const definition = activeDataset ? DATASETS[activeDataset] : null
  const isAdmin = access.isAdmin
  const showParameterCode = isAdmin || definition?.key === 'attrezzature'
  const serviceUrlByDataset: Record<DatasetKey, string> = {
    notaSpese: String(cfg.serviceUrl || '').trim(),
    sanzioniAmm: String(cfg.serviceUrlSanzioniAmm || '').trim(),
    attrezzature: String(cfg.serviceUrlAttrezzatureAgrTec || '').trim()
  }
  const serviceUrl = activeDataset ? serviceUrlByDataset[activeDataset] : ''
  const resolvedUrl = normalizeUrl(serviceUrl)

  React.useEffect(() => {
    const refresh = () => {
      const next = getAccessContext()
      setAccess(next)
      setActiveDataset((current) => current && next.allowedDatasets.includes(current) ? current : (next.allowedDatasets[0] || null))
    }
    refresh()
    window.addEventListener('gii:userLoaded', refresh)
    return () => window.removeEventListener('gii:userLoaded', refresh)
  }, [])

  const load = React.useCallback(async () => {
    if (!resolvedUrl) { setRows([]); return }
    setLoading(true)
    try { setRows(await fetchRows(resolvedUrl, definition?.key === 'attrezzature')) }
    catch (e: any) { setRows([]); setMsg({ text: 'Errore caricamento: ' + (e?.message ?? e), ok: false }) }
    setLoading(false)
  }, [resolvedUrl, definition?.key])

  React.useEffect(() => {
    setEditing(false)
    setAdminCodeOverride(false)
    setForm(emptyForm(definition?.fixedCategory || ''))
    setMsg(null)
    void load()
  }, [activeDataset, definition?.fixedCategory, load])

  React.useEffect(() => {
    if (!msg) return
    const timer = window.setTimeout(() => setMsg(null), 4000)
    return () => window.clearTimeout(timer)
  }, [msg])

  React.useEffect(() => {
    if (!editing || definition?.key !== 'attrezzature') return
    const generatedDescription = buildEquipmentDescription(form.attrezzatura_tipo)
    if (String(form.descrizione || '') !== generatedDescription) {
      setForm((current: any) => ({ ...current, descrizione: generatedDescription }))
    }
  }, [editing, definition?.key, form.attrezzatura_tipo, form.descrizione])

  React.useEffect(() => {
    if (!editing || form.objectid != null || adminCodeOverride || !definition || definition.key === 'attrezzature') return
    const generated = generateParameterCode(
      definition,
      form.categoria_parametro,
      form.descrizione,
      form.attrezzatura_tipo
    )
    if (String(form.codice_parametro || '') !== generated) {
      setForm((current: any) => ({ ...current, codice_parametro: generated }))
    }
  }, [editing, form.objectid, form.codice_parametro, form.categoria_parametro, form.descrizione, form.attrezzatura_tipo, adminCodeOverride, definition])

  const onNew = () => {
    setAdminCodeOverride(false)
    setForm(emptyForm(definition?.fixedCategory || ''))
    setEditing(true)
  }

  const onEdit = (row: any) => {
    const next: any = { objectid: row.objectid }
    ALL_LOGICAL_FIELDS.forEach((field) => {
      const kind = FIELD_TYPES[field]
      next[field] = kind === 'date' ? toDateValue(row?.[field]) : String(row?.[field] ?? (kind === 'bool' ? '1' : ''))
    })
    if (definition?.fixedCategory) next.categoria_parametro = definition.fixedCategory
    if (definition?.key === 'attrezzature') {
      next.attrezzatura_tipo = inferEquipmentType(row)
    }
    setAdminCodeOverride(true)
    setForm(next)
    setEditing(true)
  }

  const onCancel = () => {
    setAdminCodeOverride(false)
    setForm(emptyForm(definition?.fixedCategory || ''))
    setEditing(false)
  }

  const onSave = async () => {
    if (!definition || !resolvedUrl) { setMsg({ text: 'URL della tabella non configurato o non valido.', ok: false }); return }
    if (definition.key === 'attrezzature') {
      if (!cleanCode(form.attrezzatura_tipo)) {
        setMsg({ text: 'Selezionare il tipo di attrezzatura.', ok: false })
        return
      }
    } else if (!String(form.descrizione || '').trim()) {
      setMsg({ text: 'Compilare la descrizione parametro.', ok: false })
      return
    }

    const nextForm = { ...form }
    if (definition.key === 'attrezzature') {
      nextForm.descrizione = buildEquipmentDescription(nextForm.attrezzatura_tipo)
      nextForm.valore_testo = ''
    }
    if (definition.fixedCategory) nextForm.categoria_parametro = definition.fixedCategory
    if (definition.hasCategory) {
      const category = cleanCode(nextForm.categoria_parametro)
      if (!category || !(definition.allowedCategories || []).includes(category)) {
        setMsg({ text: 'Selezionare una categoria parametro valida.', ok: false })
        return
      }
      nextForm.categoria_parametro = category
    }

    if (definition.key === 'attrezzature' && !String(nextForm.codice_parametro || '').trim()) {
      setMsg({ text: 'Compilare il codice dell’attrezzatura.', ok: false })
      return
    }
    if (nextForm.objectid == null && definition.key !== 'attrezzature' && (!isAdmin || !String(nextForm.codice_parametro || '').trim())) {
      nextForm.codice_parametro = generateParameterCode(
        definition,
        nextForm.categoria_parametro,
        nextForm.descrizione,
        nextForm.attrezzatura_tipo
      )
    }
    if (!String(nextForm.codice_parametro || '').trim()) {
      setMsg({ text: 'Impossibile generare il codice parametro dai dati inseriti.', ok: false })
      return
    }
    nextForm.codice_parametro = limitParameterCode(String(nextForm.codice_parametro).trim().toUpperCase())

    setSaving(true)
    try {
      await saveRow(resolvedUrl, nextForm, definition)
      setMsg({ text: form.objectid ? 'Parametro aggiornato.' : 'Parametro aggiunto.', ok: true })
      setEditing(false)
      setAdminCodeOverride(false)
      setForm(emptyForm(definition.fixedCategory || ''))
      await load()
    } catch (e: any) { setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false }) }
    setSaving(false)
  }

  const onDelete = async (row: any) => {
    const label = String(row?.descrizione || row?.codice_parametro || '')
    if (!window.confirm(`Eliminare il parametro "${label}"?`)) return
    setSaving(true)
    try {
      await deleteRow(resolvedUrl, Number(row.objectid))
      setMsg({ text: 'Parametro eliminato.', ok: true })
      await load()
    } catch (e: any) { setMsg({ text: 'Errore: ' + (e?.message ?? e), ok: false }) }
    setSaving(false)
  }

  if (access.allowedDatasets.length === 0) {
    return <div style={{ padding: 12, color: '#7a1c1c', background: '#fce4e4', border: '1px solid #f5b8b8', borderRadius: 6 }}>Funzione riservata ai ruoli Responsabile istruttoria tecnica, Responsabile istruttoria amministrativa o Amministratore.</div>
  }

  if (!definition) return null

  return (
    <Fragment>
      <style>{styles}</style>
      <div ref={rootRef} className={`gns${editing ? ' gns-editing-lock' : ''}`} style={{ '--gns-toolbar-label-color': toolbarLabelColor, '--gns-toolbar-label-font-size': `${toolbarLabelFontSize}px`, '--gns-section-title-color': sectionTitleColor, '--gns-section-title-font-size': `${sectionTitleFontSize}px`, '--gns-detail-card-background': detailCardBackgroundColor, '--gns-records-card-background': recordsCardBackgroundColor } as React.CSSProperties}>
        <div className="gns-title" style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>

        {access.allowedDatasets.length > 1 && (
          <div className="gns-datasets">
            {access.allowedDatasets.map((datasetKey) => (
              <button
                key={datasetKey}
                className={`gns-dataset ${activeDataset === datasetKey ? 'gns-dataset-active' : ''}`}
                onClick={() => setActiveDataset(datasetKey)}
                disabled={saving}
              >
                {DATASETS[datasetKey].shortLabel}
              </button>
            ))}
          </div>
        )}

        <div className="gns-context" style={{ color: sectionTitleColor, fontSize: sectionTitleFontSize }}>{definition.label}</div>

        {!serviceUrl ? <div className="gns-msg gns-msg-err">Configura nel setting l'URL relativo a “{definition.label}”.</div> : null}
        {msg && <div className={`gns-msg ${msg.ok ? 'gns-msg-ok' : 'gns-msg-err'}`}>{msg.text}</div>}

        {!editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <NewRecordButton onClick={onNew} disabled={!resolvedUrl} title='Nuovo parametro' />
            <button type='button' onClick={() => exportCsv(rows, `${title}_${definition.shortLabel}`, definition, showParameterCode)} disabled={rows.length === 0} title='Esporta CSV' aria-label='Esporta CSV' style={transferActionButtonStyle(rows.length === 0)}><TransferActionIcon name='export' /></button>
          </div>
        )}

        {editing && (
          <div className="gns-form">
            {showParameterCode && (
              <div className="gns-field">
                <div className="gns-label">{definition.key === 'attrezzature' ? 'Codice' : 'Codice parametro (tecnico)'}</div>
                <input
                  className="gns-input"
                  value={form.codice_parametro || ''}
                  onChange={(e) => {
                    setAdminCodeOverride(true)
                    setForm((current: any) => ({ ...current, codice_parametro: e.target.value }))
                  }}
                />
              </div>
            )}

            {definition.hasCategory && (
              <div className="gns-field">
                <div className="gns-label">Categoria parametro</div>
                <select
                  className="gns-select"
                  value={form.categoria_parametro || ''}
                  disabled={form.objectid != null || Boolean(definition.fixedCategory)}
                  onChange={(e) => setForm((current: any) => ({ ...current, categoria_parametro: e.target.value }))}
                >
                  {!definition.fixedCategory && <option value="">- Seleziona -</option>}
                  {(definition.allowedCategories || []).map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}
                </select>
              </div>
            )}

            {definition.key === 'attrezzature' ? (
              <Fragment>
                <div className="gns-field">
                  <div className="gns-label">Tipo di attrezzatura</div>
                  <select
                    className="gns-select"
                    value={form.attrezzatura_tipo || ''}
                    onChange={(e) => setForm((current: any) => ({ ...current, attrezzatura_tipo: e.target.value }))}
                  >
                    <option value="">- Seleziona -</option>
                    {ATTREZZATURA_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div className="gns-field" style={{ gridColumn: '1 / -1' }}>
                  <div className="gns-label">Descrizione parametro</div>
                  <input className="gns-input" value={form.descrizione || ''} disabled />
                </div>
              </Fragment>
            ) : (
              <div className="gns-field">
                <div className="gns-label">Descrizione parametro</div>
                <input className="gns-input" value={form.descrizione || ''} onChange={(e) => setForm((current: any) => ({ ...current, descrizione: e.target.value }))} />
              </div>
            )}
            <div className="gns-field">
              <div className="gns-label">Anno</div>
              <input className="gns-input" type="number" step="1" value={form.anno_riferimento || ''} onChange={(e) => setForm((current: any) => ({ ...current, anno_riferimento: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">{definition.key === 'attrezzature' ? 'Valore unitario (€)' : 'Valore numerico'}</div>
              <input className="gns-input" type="number" step="0.01" value={form.valore_num || ''} onChange={(e) => setForm((current: any) => ({ ...current, valore_num: e.target.value }))} />
            </div>
            {definition.key !== 'attrezzature' && (
              <div className="gns-field">
                <div className="gns-label">Valore testo</div>
                <input className="gns-input" value={form.valore_testo || ''} onChange={(e) => setForm((current: any) => ({ ...current, valore_testo: e.target.value }))} />
              </div>
            )}
            <div className="gns-field">
              <div className="gns-label">Attivo</div>
              <GiiActiveToggle
                checked={String(form.attivo ?? '1') === '1'}
                onChange={(next) => setForm((current: any) => ({ ...current, attivo: next ? '1' : '0' }))}
                ariaLabel='Stato del parametro'
              />
            </div>
            <div className="gns-field">
              <div className="gns-label">Valido da</div>
              <input className="gns-input" type="date" value={form.data_validita_da || ''} onChange={(e) => setForm((current: any) => ({ ...current, data_validita_da: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">Valido a</div>
              <input className="gns-input" type="date" value={form.data_validita_a || ''} onChange={(e) => setForm((current: any) => ({ ...current, data_validita_a: e.target.value }))} />
            </div>
            <div className="gns-field">
              <div className="gns-label">Note</div>
              <input className="gns-input" value={form.note || ''} onChange={(e) => setForm((current: any) => ({ ...current, note: e.target.value }))} />
            </div>
            <div className="gns-btns">
              <button className="gns-btn gns-btn-save" onClick={() => void onSave()} disabled={saving}>{saving ? 'Salvataggio...' : form.objectid ? 'Aggiorna' : 'Salva'}</button>
              <button className="gns-btn gns-btn-cancel" onClick={onCancel} disabled={saving}>Annulla</button>
            </div>
          </div>
        )}

        <div className="gns-table-wrap">
          {loading ? <div className="gns-empty">Caricamento...</div> : (
            <table className={`gns-table${definition.key === 'attrezzature' ? ' gns-table-attrezzature' : ''}`}>
              <thead>
                <tr>
                  {showParameterCode && <th>{definition.key === 'attrezzature' ? 'Codice' : 'Codice parametro'}</th>}
                  {definition.hasCategory && <th>Categoria</th>}
                  <th>Descrizione parametro</th>
                  <th>Anno</th>
                  <th>{definition.key === 'attrezzature' ? 'Valore unitario (€)' : 'Valore numerico'}</th>
                  {definition.key !== 'attrezzature' && <th>Valore testo</th>}
                  <th>Attivo</th>
                  <th>Valido da</th>
                  <th>Valido a</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={(definition.hasCategory ? 10 : 9) + (showParameterCode ? 1 : 0) - (definition.key === 'attrezzature' ? 1 : 0)} className="gns-empty">Nessun parametro presente</td></tr>}
                {rows.map((row, index) => (
                  <tr key={row.objectid || index}>
                    {showParameterCode && <td>{formatCell(row.codice_parametro, 'text')}</td>}
                    {definition.hasCategory && <td>{categoryLabel(row.categoria_parametro)}</td>}
                    <td>{formatCell(row.descrizione, 'text')}</td>
                    <td>{formatCell(row.anno_riferimento, 'int')}</td>
                    <td>{formatCell(row.valore_num, 'number2')}</td>
                    {definition.key !== 'attrezzature' && <td>{formatCell(row.valore_testo, 'text')}</td>}
                    <td>{formatCell(row.attivo, 'bool')}</td>
                    <td>{formatCell(row.data_validita_da, 'date')}</td>
                    <td>{formatCell(row.data_validita_a, 'date')}</td>
                    <td>{formatCell(row.note, 'text')}</td>
                    <td>
                      <RecordEditButton onClick={() => onEdit(row)} title='Modifica parametro' ariaLabel='Modifica parametro' />
                      <RecordDeleteButton onClick={() => void onDelete(row)} title='Elimina parametro' ariaLabel='Elimina parametro' />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {editLockPortal}
    </Fragment>
  )
}

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import GiiActiveToggle from '../../../_shared/gii-ui/active-toggle'

const { Fragment } = React




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
        border: disabled ? '1.5px solid #e5e7eb' : '1.5px solid rgba(37,99,235,0.72)',
        background: disabled ? '#e5e7eb' : '#ffffff',
        color: disabled ? '#9ca3af' : '#2563eb',
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
    border: disabled ? '1.5px solid #e5e7eb' : `1.5px solid ${color}`,
    borderRadius: 7,
    background: disabled ? '#e5e7eb' : '#ffffff',
    color: disabled ? '#9ca3af' : color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: 32,
    height: 32,
    minHeight: 32,
    padding: 0,
    boxSizing: 'border-box',
    marginRight,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    flex: '0 0 auto',
    opacity: disabled ? 0.6 : 1
  }
}

function RecordEditButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Modifica'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#1F4E79', disabled, props.marginRight ?? 4)}>
      <svg width={19} height={19} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
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
      <svg width={19} height={19} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M3 6h18'/>
        <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
        <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
        <path d='M10 11v6'/>
        <path d='M14 11v6'/>
      </svg>
    </button>
  )
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


function normalizeGiiAccessCode(v: any): string {
  return String(v ?? '').trim().toUpperCase().replace(/-/g, '_')
}

function getGiiOperationalProfileCode(): string {
  const u: any = (window as any).__giiUserRole || {}

  const direct = normalizeGiiAccessCode(u?.profiloCod ?? u?.profilo_cod ?? u?.profileCode ?? u?.profile_code)
  if (direct) return direct

  const role = normalizeGiiAccessCode(u?.ruoloCod ?? u?.ruolo_cod ?? u?.roleCod ?? u?.roleCode ?? u?.role_code)
  const area = normalizeGiiAccessCode(u?.areaCod ?? u?.area_cod ?? u?.areaCode ?? u?.area_code)
  if (role === 'TI' && area === 'AMM') return 'TI_AMM'
  if (role === 'RI' && area === 'AMM') return 'RI_AMM'
  if (role) return role

  const roleNum = Number(u?.ruolo)
  const areaNum = Number(u?.area)
  if (roleNum === 7) return 'ADMIN'
  if (roleNum === 4 && areaNum === 1) return 'RI_AMM'
  if (roleNum === 2 && areaNum === 1) return 'TI_AMM'
  if (roleNum === 1) return 'TR'
  if (roleNum === 2) return 'TI'
  if (roleNum === 3) return 'RZ'
  if (roleNum === 4) return 'RI'
  if (roleNum === 5) return 'DT'
  if (roleNum === 6) return 'DA'

  const label = normalizeGiiAccessCode([
    u?.profiloLabel,
    u?.ruoloLabel,
    u?.roleLabel,
    u?.ruolo_nome,
    u?.ruolo
  ].filter(Boolean).join(' '))
  if (!label) return ''
  if (/ADMIN|AMMINISTRATORE/.test(label)) return 'ADMIN'
  if (/RI_AMM|RESPONSABILE.*ISTRUTTORIA.*AMMINISTRATIV/.test(label)) return 'RI_AMM'
  if (/TI_AMM|TECNICO.*ISTRUTTOR.*AMMINISTRATIV/.test(label)) return 'TI_AMM'
  if (/^RI$|(^|[^A-Z])RI([^A-Z]|$)|RESPONSABILE.*ISTRUTTORIA/.test(label)) return 'RI'
  if (/^TI$|(^|[^A-Z])TI([^A-Z]|$)|TECNICO.*ISTRUTTOR/.test(label)) return 'TI'
  if (/^TR$|(^|[^A-Z])TR([^A-Z]|$)|TECNICO.*RILEVATORE/.test(label)) return 'TR'
  if (/^RZ$|(^|[^A-Z])RZ([^A-Z]|$)|RESPONSABILE.*ZONA/.test(label)) return 'RZ'
  if (/^DT$|(^|[^A-Z])DT([^A-Z]|$)|DIRETTORE.*TECNICO/.test(label)) return 'DT'
  if (/^DA$|(^|[^A-Z])DA([^A-Z]|$)|DIRETTORE.*AMMINISTRATIVO/.test(label)) return 'DA'
  return ''
}

function isRiOrAdminUser(): boolean {
  const profiloCod = getGiiOperationalProfileCode()
  return profiloCod === 'RI' || profiloCod === 'ADMIN'
}

const LAYER_CACHE: Record<string, any> = {}
async function getLayer(urlRaw: any): Promise<any> {
  const url = normalizeUrl(urlRaw)
  if (!url) throw new Error('URL tabella non configurato.')
  if (LAYER_CACHE[url]) return LAYER_CACHE[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url })
  try { if (typeof fl.load === 'function') await fl.load() } catch {}
  LAYER_CACHE[url] = fl
  return fl
}

function num(v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s0 = String(v ?? '').trim()
  if (!s0) return 0
  let s = s0.replace(/\s+/g, '')
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
function round(v: number, d = 2): number { const f = Math.pow(10, d); return Math.round((Number(v) + Number.EPSILON) * f) / f }
function esc(v: string): string { return String(v || '').replace(/'/g, "''") }
function money(n: any, d = 2): string { return num(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }) }
function pad4(v: any): string {
  const digits = String(v == null ? '' : v).replace(/\D/g, '').slice(0, 4)
  return digits ? digits.padStart(4, '0') : ''
}
function asYear(v: any): number { const y = Math.trunc(num(v)); return y > 0 ? y : new Date().getFullYear() }
function upper(v: any): string { return String(v || '').trim().toUpperCase() }

const MODALITA: Record<number, string> = { 1: 'ELEMENTARE', 2: 'ANALIZZATA' }
const FAMIGLIE_NUM: Record<number, string> = { 1: 'AT', 2: 'PR', 3: 'RU', 4: 'SL', 5: 'PF' }
const FAMILY_CODES = ['AT', 'PR', 'RU', 'SL', 'PF'] as const
const FAMILY_DESCRIPTIONS: Record<string, string> = {
  AT: 'Attrezzature e trasporti',
  PR: 'Materiali da costruzione',
  RU: 'Risorse umane',
  SL: 'Semilavorati',
  PF: 'Prodotti finiti'
}
const ORIGINI: Record<number, string> = { 1: 'REGIONALE', 2: 'INTERNO', 3: 'NUOVO PREZZO' }
const TIPO_RECORD: Record<number, string> = { 1: 'PARAMETRO', 2: 'UM', 3: 'SUPERCAPITOLO', 4: 'CAPITOLO', 5: 'SUBCAPITOLO' }
const CATEGORY_OPTIONS = ['MANODOPERA', 'NOLO', 'TRASPORTO', 'MATERIALI'] as const

function normalizeModality(v: any): number {
  const s = upper(v)
  if (s === 'ELEMENTARE') return 1
  if (s === 'ANALIZZATA') return 2
  return num(v) === 2 ? 2 : 1
}
function modalityLabel(v: any): string { return MODALITA[normalizeModality(v)] || 'ELEMENTARE' }
function normalizeFamily(v: any): string {
  const s = upper(v)
  if (!s) return ''
  if ((FAMILY_CODES as readonly string[]).includes(s)) return s
  const n = Math.trunc(num(v))
  return FAMIGLIE_NUM[n] || ''
}
function familyLabel(v: any): string { return normalizeFamily(v) || 'AT' }
function familyDisplay(v: any): string { const code = familyLabel(v); return `${FAMILY_DESCRIPTIONS[code] || code} (${code})` }
function normalizeOrigin(v: any): number {
  const s = upper(v)
  if (s === 'REGIONALE' || s === 'REGIONE' || s === '1') return 1
  if (s === 'INTERNO' || s === '2') return 2
  if (s === 'NUOVO_PREZZO' || s === 'NUOVO PREZZO' || s === '3') return 3
  return num(v) === 3 ? 3 : (num(v) === 2 ? 2 : 1)
}
function originLabel(v: any): string { return ORIGINI[normalizeOrigin(v)] || 'REGIONALE' }

function validateMoneyInput(raw: any): { ok: boolean, value?: number, text?: string, message?: string } {
  const s0 = String(raw ?? '').trim()
  if (!s0) return { ok: false, message: 'Indica il prezzo.' }
  const s = s0.replace(/\s+/g, '')
  if (/[^0-9.,]/.test(s)) return { ok: false, message: 'Il prezzo può contenere solo cifre e un separatore decimale.' }
  const dots = (s.match(/\./g) || []).length
  const commas = (s.match(/,/g) || []).length
  if (dots + commas > 1) return { ok: false, message: 'Il prezzo non è valido.' }
  const normalized = s.replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return { ok: false, message: 'Il prezzo non è valido.' }
  const n = Number(normalized)
  if (!Number.isFinite(n)) return { ok: false, message: 'Il prezzo non è valido.' }
  const rounded = round(n, 2)
  return { ok: true, value: rounded, text: money(rounded, 2) }
}

function moneyInput(n: any): string { return money(n, 2) }

const DEFAULT_UM_OPTIONS = ['cad', 'h', 'kg', 'm', 'm²', 'm³', 'km', 'l', 't', 'mq', 'mc', 'ha', 'giorno', 'ora', 'viaggio', 'corpo'] as const
function normalizeUm(raw: any, options: readonly string[] = DEFAULT_UM_OPTIONS): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const found = (options || []).find((um) => String(um).toLowerCase() === s.toLowerCase())
  return found || ''
}
function normalizeTipoRecord(v: any): number {
  const s = upper(v)
  if (s === 'PARAMETRO' || s === '1') return 1
  if (s === 'UM' || s === '2') return 2
  if (s === 'SUPERCAPITOLO' || s === '3') return 3
  if (s === 'CAPITOLO' || s === '4') return 4
  if (s === 'SUBCAPITOLO' || s === '5') return 5
  const n = Math.trunc(num(v))
  return TIPO_RECORD[n] ? n : 0
}
function normalizeCategory(v: any): string {
  const s = upper(v)
  if (s === 'NOLI') return 'NOLO'
  if (s === 'TRASPORTI') return 'TRASPORTO'
  if (s === 'MATERIALE') return 'MATERIALI'
  if (CATEGORY_OPTIONS.includes(s as any)) return s
  return 'MATERIALI'
}
function deriveCategoryFromFamilyCode(family: any): string {
  const label = familyLabel(family)
  if (label === 'RU') return 'MANODOPERA'
  if (label === 'AT') return 'NOLO'
  return 'MATERIALI'
}
function buildCode(year: any, family: any, chapter: any, subchapter: any, progressive: any): string {
  const yy = String(asYear(year)).slice(-2)
  return `NP${yy}_${familyLabel(family)}.${pad4(chapter)}.${pad4(subchapter)}.${pad4(progressive)}`
}
function parseProgressivoFromCode(code: any): string {
  const m = String(code || '').trim().match(/\.(\d{4})$/)
  return m?.[1] || ''
}

function uniqueSortedCodes(values: any[]): string[] {
  return Array.from(new Set((values || []).map((v) => pad4(v)).filter((v) => !!v && v !== '0000'))).sort()
}
function getAttr(obj: any, candidates: string[]): any {
  const keys = Object.keys(obj || {})
  for (const c of candidates) {
    const key = keys.find((k) => k.toLowerCase() === c.toLowerCase())
    if (key) return obj[key]
  }
  return undefined
}
function pickField(fields: any[], candidates: string[]): string {
  const names = (fields || []).map((f: any) => String(f?.name || ''))
  for (const c of candidates) {
    const hit = names.find((n) => n.toLowerCase() === c.toLowerCase())
    if (hit) return hit
  }
  return ''
}
async function queryRows(urlRaw: any, where = '1=1', orderBy = 'OBJECTID DESC'): Promise<any[]> {
  const fl = await getLayer(urlRaw)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = where
  q.outFields = ['*']
  q.returnGeometry = false
  if (orderBy) q.orderByFields = [orderBy]
  const res = await fl.queryFeatures(q)
  return (res?.features || []).map((f: any) => ({ ...f.attributes, objectid: Number(f.attributes?.OBJECTID || f.attributes?.objectid || 0) }))
}
type SourceDetail = {
  objectid: number,
  code: string,
  description: string,
  unita_misura: string,
  prezzo_unitario: number,
  famiglia: string
}

async function querySourceDetails(urlRaw: any, objectIds: number[]): Promise<Record<number, SourceDetail>> {
  const ids = Array.from(new Set((objectIds || []).map((v) => Math.trunc(num(v))).filter((v) => v > 0)))
  if (!urlRaw || !ids.length) return {}
  const fl = await getLayer(urlRaw)
  const codeField = pickField(fl?.fields || [], ['codice_np', 'codice_voce', 'codice_interno', 'tariffa', 'codice', 'articolo', 'codice_articolo'])
  const descField = pickField(fl?.fields || [], ['descrizione', 'descrizione_elemento'])
  const umField = pickField(fl?.fields || [], ['unita_misura', 'um', 'u_m'])
  const priceField = pickField(fl?.fields || [], ['prezzo_unitario', 'prezzo'])
  const familyField = pickField(fl?.fields || [], ['famiglia'])
  if (!codeField && !descField && !umField && !priceField && !familyField) return {}
  const out: Record<number, SourceDetail> = {}
  const batchSize = 200
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize)
    const q = fl.createQuery ? fl.createQuery() : {}
    q.where = `OBJECTID IN (${chunk.join(',')})`
    q.outFields = Array.from(new Set(['OBJECTID', codeField, descField, umField, priceField, familyField].filter(Boolean)))
    q.returnGeometry = false
    const res = await fl.queryFeatures(q)
    ;(res?.features || []).forEach((f: any) => {
      const a = f?.attributes || {}
      const oid = Number(a?.OBJECTID || a?.objectid || 0)
      if (oid <= 0) return
      out[oid] = {
        objectid: oid,
        code: String(getAttr(a, [codeField]) || ''),
        description: String(getAttr(a, [descField]) || ''),
        unita_misura: String(getAttr(a, [umField]) || ''),
        prezzo_unitario: round(num(getAttr(a, [priceField])), 4),
        famiglia: familyLabel(getAttr(a, [familyField]) || '')
      }
    })
  }
  return out
}
async function queryLookupOptions(urlRaw: any, searchRaw: string, excludeCode?: string, includeCurrent?: { objectid?: any, code?: any }, limit = 50): Promise<any[]> {
  const fl = await getLayer(urlRaw)
  const codeField = pickField(fl?.fields || [], ['codice_np', 'codice_voce', 'codice_interno', 'tariffa', 'codice', 'articolo', 'codice_articolo'])
  const descField = pickField(fl?.fields || [], ['descrizione', 'descrizione_elemento'])
  const umField = pickField(fl?.fields || [], ['unita_misura', 'um', 'u_m'])
  const priceField = pickField(fl?.fields || [], ['prezzo_unitario', 'prezzo'])
  const categoryField = pickField(fl?.fields || [], ['categoria_default', 'categoria'])
  const familyField = pickField(fl?.fields || [], ['famiglia'])
  const activeField = pickField(fl?.fields || [], ['attivo'])
  const includeObjectId = Number(includeCurrent?.objectid || 0)
  const includeCode = upper(includeCurrent?.code || '')
  const search = upper(searchRaw || '').trim()
  if ((!codeField && !descField) || !search) return []
  const clauses: string[] = []
  if (excludeCode && codeField) clauses.push(`UPPER(${codeField}) <> '${esc(upper(excludeCode))}'`)
  if (activeField) {
    const keepCurrent: string[] = []
    if (includeObjectId > 0) keepCurrent.push(`OBJECTID = ${includeObjectId}`)
    if (includeCode && codeField) keepCurrent.push(`UPPER(${codeField}) = '${esc(includeCode)}'`)
    clauses.push(keepCurrent.length ? `(${activeField} IS NULL OR ${activeField} = 1 OR ${keepCurrent.join(' OR ')})` : `(${activeField} IS NULL OR ${activeField} = 1)`)
  }
  const searchClauses: string[] = []
  if (codeField) searchClauses.push(`UPPER(${codeField}) LIKE '%${esc(search)}%'`)
  if (descField) searchClauses.push(`UPPER(${descField}) LIKE '%${esc(search)}%'`)
  if (searchClauses.length) clauses.push(`(${searchClauses.join(' OR ')})`)
  const q = fl.createQuery ? fl.createQuery() : {}
  q.where = clauses.length ? clauses.join(' AND ') : '1=1'
  q.outFields = Array.from(new Set(['OBJECTID', codeField, descField, umField, priceField, categoryField, familyField].filter(Boolean)))
  q.returnGeometry = false
  q.orderByFields = [codeField ? `${codeField} ASC` : 'OBJECTID ASC']
  try { (q as any).num = limit } catch {}
  const res = await fl.queryFeatures(q)
  const features = res?.features || []
  return features.map((f: any) => {
    const a = f.attributes || {}
    const code = String(getAttr(a, [codeField]) || '')
    const desc = String(getAttr(a, [descField]) || '')
    const um = String(getAttr(a, [umField]) || '')
    const price = round(num(getAttr(a, [priceField])), 4)
    const category = normalizeCategory(getAttr(a, [categoryField]) || deriveCategoryFromFamilyCode(getAttr(a, [familyField]) || ''))
    return {
      objectid: Number(a?.OBJECTID || a?.objectid || 0),
      code,
      description: desc,
      unita_misura: um,
      prezzo_unitario: price,
      categoria_costo: category,
      famiglia: familyLabel(getAttr(a, [familyField]) || ''),
      raw: a
    }
  }).filter((r: any) => !!r.code || !!r.description)
    .sort((a: any, b: any) => String(a.code || '').localeCompare(String(b.code || ''), 'it', { numeric: true, sensitivity: 'base' }) || String(a.description || '').localeCompare(String(b.description || ''), 'it', { sensitivity: 'base' }))
    .slice(0, limit)
}
async function applyAttrs(urlRaw: any, attrs: any, objectid?: number | null): Promise<number> {
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const fieldNames = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  const out: any = {}
  Object.keys(attrs || {}).forEach((k) => { if (fieldNames.has(k)) out[k] = attrs[k] })
  if (objectid != null) out[oidField] = Number(objectid)
  const payload = objectid != null ? { updateFeatures: [{ attributes: out }] } : { addFeatures: [{ attributes: out }] }
  const res = await fl.applyEdits(payload as any)
  const r = objectid != null ? res?.updateFeatureResults?.[0] : res?.addFeatureResults?.[0]
  if (r?.error) throw new Error(r.error.message || 'Salvataggio non riuscito.')
  return Number(r?.objectId || objectid || 0)
}
async function applyAttrsBatch(urlRaw: any, updates: Array<{ objectid: number, attrs: any }>): Promise<void> {
  if (!updates.length) return
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const fieldNames = new Set(((fl?.fields || []) as any[]).map((f: any) => String(f?.name || '')))
  const updateFeatures = updates.map((u) => {
    const attrs: any = { [oidField]: Number(u.objectid) }
    Object.keys(u.attrs || {}).forEach((k) => { if (fieldNames.has(k)) attrs[k] = u.attrs[k] })
    return { attributes: attrs }
  })
  const res = await fl.applyEdits({ updateFeatures } as any)
  const bad = (res?.updateFeatureResults || []).find((r: any) => r?.error)
  if (bad?.error) throw new Error(bad.error.message || 'Salvataggio non riuscito.')
}
async function deleteObjectIds(urlRaw: any, objectIds: number[]): Promise<void> {
  if (!objectIds.length) return
  const fl = await getLayer(urlRaw)
  const oidField = String(fl?.objectIdField || 'OBJECTID')
  const Graphic = await loadEsriModule<any>('esri/Graphic')
  for (let i = 0; i < objectIds.length; i += 200) {
    const chunk = objectIds.slice(i, i + 200)
    const dels = chunk.map((id) => new Graphic({ attributes: { [oidField]: id } }))
    const res = await fl.applyEdits({ deleteFeatures: dels } as any)
    const bad = (res?.deleteFeatureResults || []).find((r: any) => r?.error)
    if (bad?.error) throw new Error(bad.error.message || 'Eliminazione non riuscita.')
  }
}
async function recomputeParentPrice(parentUrl: string, detailUrl: string, parentCode: string): Promise<number> {
  const rows = await queryRows(detailUrl, `codice_np_parent = '${esc(parentCode)}'`, 'ordine_riga ASC, OBJECTID ASC')
  const total = round(rows.reduce((s: any, r: any) => s + num(r.importo), 0), 4)
  const parent = (await queryRows(parentUrl, `codice_np = '${esc(parentCode)}'`, 'OBJECTID DESC'))[0]
  if (parent?.objectid) await applyAttrs(parentUrl, { prezzo: total }, Number(parent.objectid))
  return total
}

function maxLineOrder(rows: any[]): number {
  return rows.reduce((m: number, r: any) => Math.max(m, Math.trunc(num(r?.ordine))), 0)
}
async function resequenceLineOrders(detailUrl: string, parentCode: string): Promise<void> {
  const ordered = await queryRows(detailUrl, `codice_np_parent = '${esc(parentCode)}'`, 'ordine_riga ASC, OBJECTID ASC')
  for (let i = 0; i < ordered.length; i++) {
    const row = ordered[i]
    const nextOrder = i + 1
    if (Math.trunc(num(row?.ordine_riga)) !== nextOrder && row?.objectid != null) {
      await applyAttrs(detailUrl, { ordine_riga: nextOrder }, Number(row.objectid))
    }
  }
}
function nextProgressiveFromRows(rows: any[], year: any, family: any, chapter: any, subchapter: any, excludeObjectId?: number): string {
  const y = asYear(year)
  const fam = familyLabel(family)
  const cap = pad4(chapter)
  const sub = pad4(subchapter)
  let maxProg = 0
  rows.forEach((r: any) => {
    if (excludeObjectId && Number(r.objectid) === Number(excludeObjectId)) return
    if (asYear(r.anno_listino) !== y) return
    if (familyLabel(r.famiglia) !== fam) return
    if (pad4(r.capitolo) !== cap) return
    if (pad4(r.sottocapitolo) !== sub) return
    const prog = num(r.progressivo_voce || r.progressivo_prezzo || parseProgressivoFromCode(r.codice_voce || r.codice_np))
    if (prog > maxProg) maxProg = prog
  })
  return pad4(maxProg + 1)
}

async function countInternalReferences(detailUrl: string, sourceObjectId: number, excludeParentCode?: string): Promise<number> {
  if (!detailUrl || !sourceObjectId) return 0
  const clauses = [`origine_riga = '3'`, `objectid_sorgente = ${Math.trunc(num(sourceObjectId))}`]
  if (excludeParentCode) clauses.push(`codice_np_parent <> '${esc(excludeParentCode)}'`)
  const rows = await queryRows(detailUrl, clauses.join(' AND '), 'OBJECTID ASC')
  return rows.length
}

const styles = `
.gap { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; }
.gap-title { font-size:15px; font-weight:700; color:#1F4E79; border-bottom:2px solid #1F4E79; padding-bottom:6px; }
.gap-toolbar, .gap-subtoolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:end; }
.gap-panel { background:#f5f9ff; border:1px solid #c5d9f1; border-radius:6px; padding:12px; }
.gap-detail-card { background:var(--gap-detail-card-background, #f5f9ff); }
.gap-form-grid { display:grid; grid-template-columns: 0.9fr 0.9fr 0.8fr 0.8fr 0.8fr 1.4fr; gap:10px; align-items:end; }
.gap-row-grid { display:grid; grid-template-columns: 0.9fr 1.3fr 1.1fr 1fr 0.9fr 0.9fr; gap:10px; align-items:end; }
.gap-field { display:flex; flex-direction:column; gap:3px; min-width:0; }
.gap-label { font-size:11px; font-weight:700; color:#1F4E79; }
.gap-input, .gap-select, .gap-textarea { width:100%; padding:6px 8px; border:1px solid #aac4e0; border-radius:4px; font-size:13px; box-sizing:border-box; background:#fff; }
.gap-input, .gap-select { height:32px; line-height:18px; }
.gap-combo-wrap { position:relative; }
.gap-combo-wrap .gap-input { padding-right:28px; }
.gap-combo-toggle { position:absolute; right:6px; top:50%; transform:translateY(-50%); border:0; background:transparent; color:#1F4E79; cursor:pointer; font-size:12px; line-height:1; padding:0 2px; height:20px; }
.gap-combo-dropdown { position:absolute; left:0; right:0; top:calc(100% + 2px); z-index:20; max-height:180px; overflow:auto; border:1px solid #aac4e0; border-radius:4px; background:#fff; box-shadow:0 4px 10px rgba(0,0,0,.08); }
.gap-combo-option { display:block; width:100%; text-align:left; border:0; background:#fff; padding:6px 8px; font-size:13px; cursor:pointer; }
.gap-combo-option:hover, .gap-combo-option.is-active { background:#eaf3fb; }
.gap-clear-wrap { position:relative; width:100%; }
.gap-clear-wrap .gap-select, .gap-clear-wrap .gap-input { padding-right:44px; }
.gap-clear-inside { position:absolute; right:26px; top:50%; transform:translateY(-50%); width:18px; height:18px; border:0; background:transparent; color:#1F4E79; cursor:pointer; font-size:16px; line-height:16px; padding:0; display:flex; align-items:center; justify-content:center; }
.gap-clear-inside:disabled { opacity:.35; cursor:not-allowed; }
.gap-clear-wrap.gap-input-wrap .gap-clear-inside { right:8px; }
.gap-input::-webkit-outer-spin-button, .gap-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.gap-input[type=number] { -moz-appearance: textfield; }
.gap-textarea { min-height:64px; resize:vertical; }
.gap-line-panel { max-height:min(78vh, 720px); overflow:auto; }
.gap-line-note { min-height:84px; max-height:140px; resize:none; overflow:auto; }
.gap-readonly { background:#eef4fb; color:#3f4d5a; }
.gap-error-input { border-color:#c62828 !important; box-shadow:0 0 0 1px rgba(198,40,40,.08); }
.gap-error-text { margin-top:4px; font-size:12px; color:#c62828; }
.gap-btn { padding:6px 14px; border:1px solid transparent; border-radius:4px; font-size:13px; cursor:pointer; font-weight:700; }
.gap-btn:disabled { opacity:0.55; cursor:not-allowed; }
.gap-primary { background:#1F4E79; color:#fff; }
.gap-success { background:#375623; color:#fff; }
.gap-neutral { background:#fff; color:#1F4E79; border-color:#7ea6ce; }
.gap-danger { background:#c00000; color:#fff; }
.gap-danger-outline { background:#fff; color:#c00000; border-color:#c00000; }
.gap-success-outline { background:#fff; color:#375623; border-color:#375623; }
.gap-lookup { max-height:180px; overflow:auto; border:1px solid #c5d9f1; border-radius:6px; background:#fff; }
.gap-lookup-item { padding:8px 10px; border-bottom:1px solid #e0eaf4; cursor:pointer; }
.gap-lookup-item:hover { background:#eef4fb; }
.gap-table-wrap { flex:1; min-height:0; overflow:auto; border:1px solid #c5d9f1; border-radius:6px; background:var(--gap-records-card-background, #f5f9ff); }
.gap-table { width:100%; border-collapse:collapse; font-size:12px; }
.gap-table th { background:#1F4E79; color:#fff; padding:7px 8px; text-align:left; position:sticky; top:0; z-index:1; white-space:nowrap; }
.gap-table td { padding:6px 8px; border-bottom:1px solid #e0eaf4; vertical-align:top; }
.gap-table tbody tr:nth-child(odd) td { background:var(--gap-records-card-background, #f5f9ff); }
.gap-table tbody tr:nth-child(even) td { background:linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), var(--gap-records-card-background, #f5f9ff); }
.gap-table tbody tr.gap-row-selected td { background:#dcecff !important; }
.gap-table tbody tr.gap-row-clickable { cursor:pointer; }
.gap-msg { padding:7px 12px; border-radius:4px; font-size:12px; font-weight:700; }
.gap-ok { background:#e2efda; color:#375623; border:1px solid #b8d4b0; }
.gap-err { background:#fce4e4; color:#c00; border:1px solid #f5b8b8; }
.gap-muted { color:#6b7280; }
.gap-kpi { white-space:nowrap; font-weight:700; color:#1F4E79; }
.gap-inline { display:flex; gap:6px; align-items:center; }
.gap-field-grow { flex:1 1 auto; min-width:0; }
.gap-btn-icon { min-width:30px; width:30px; height:30px; padding:0; display:inline-flex; align-items:center; justify-content:center; font-size:15px; line-height:1; }
.gap-confirm-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.28); display:flex; align-items:center; justify-content:center; z-index:9999; }
.gap-confirm-modal { width:min(560px, calc(100vw - 32px)); background:#fff; border:1px solid #c5d9f1; border-radius:6px; box-shadow:0 12px 28px rgba(0,0,0,.18); padding:16px; }
.gap-confirm-title { font-size:18px; font-weight:700; color:#1F4E79; margin-bottom:8px; }
.gap-confirm-text { font-size:15px; line-height:1.5; color:#243447; white-space:pre-line; }
.gap-confirm-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:14px; }
.gap-confirm-actions .gap-btn { font-size:15px; }
`

function emptyParentForm() {
  const y = new Date().getFullYear()
  return {
    objectid: undefined,
    codice_voce: '',
    descrizione: '',
    unita_misura: '',
    prezzo_unitario: '',
    categoria_default: 'MATERIALI',
    attivo: '1',
    note: '',
    modalita_voce: 1,
    anno_listino: y,
    famiglia: '',
    capitolo: '',
    sottocapitolo: '',
    progressivo_voce: '0001'
  } as any
}
function emptyLineForm(parentCode = '') {
  return {
    objectid: undefined,
    codice_voce_parent: parentCode,
    origine_riga: 1,
    objectid_sorgente: '',
    categoria_costo: 'MATERIALI',
    codice_riferimento: '',
    descrizione: '',
    unita_misura: '',
    quantita: '',
    prezzo_unitario: '',
    importo: '',
    ordine: '',
    note: '',
    famiglia_sorgente: '',
    lookupSearch: ''
  } as any
}


function mapParentRow(r: any) {
  return {
    ...r,
    codice_voce: String(r.codice_np || ''),
    unita_misura: String(r.um || ''),
    prezzo_unitario: r.prezzo,
    modalita_voce: r.modalita_prezzo,
    progressivo_voce: String(r.progressivo_prezzo || '')
  }
}
function mapLineRow(r: any) {
  return {
    ...r,
    codice_voce_parent: String(r.codice_np_parent || ''),
    codice_riferimento: String(r.codice_sorgente || ''),
    descrizione: String(r.descrizione_snapshot || ''),
    unita_misura: String(r.um_snapshot || ''),
    ordine: r.ordine_riga
  }
}

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const serviceUrl = String(cfg.serviceUrl || '').trim()
  const parentTableUrl = String(cfg.parentTableUrl || '').trim()
  const regionalTableUrl = String(cfg.regionalTableUrl || '').trim()
  const internalTableUrl = String(cfg.internalTableUrl || '').trim()
  const generalDataUrl = String(cfg.generalDataUrl || '').trim()
  const title = String(cfg.title || 'GII - Analisi Nuovi Prezzi')
  const titleColor = String(cfg.titleColor || '#1F4E79')
  const titleFontSize = Number(cfg.titleFontSize || 15)
  const sectionTitleColor = String(cfg.sectionTitleColor || '#1F4E79')
  const sectionTitleFontSize = Number(cfg.sectionTitleFontSize || 12.5)
  const toolbarLabelColor = String(cfg.toolbarLabelColor || '#1F4E79')
  const toolbarLabelFontSize = Number(cfg.toolbarLabelFontSize || 11.5)
  const detailCardBackgroundColor = String(cfg.detailCardBackgroundColor || '#f5f9ff')
  const recordsCardBackgroundColor = String(cfg.recordsCardBackgroundColor || '#f5f9ff')

  const [parents, setParents] = React.useState<any[]>([])
  const [selectedParent, setSelectedParent] = React.useState('')
  const [rows, setRows] = React.useState<any[]>([])
  const [selectedLineId, setSelectedLineId] = React.useState<number | null>(null)
  const [generalDataRows, setGeneralDataRows] = React.useState<any[]>([])
  const [parentForm, setParentForm] = React.useState<any>(emptyParentForm())
  const [parentEditing, setParentEditing] = React.useState(false)
  const [lineForm, setLineForm] = React.useState<any>(emptyLineForm())
  const [lineEditing, setLineEditing] = React.useState(false)
  const [lookupRows, setLookupRows] = React.useState<any[]>([])
  const [lookupLoading, setLookupLoading] = React.useState(false)
  const [lookupDropdownOpen, setLookupDropdownOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string, ok: boolean } | null>(null)
  const [confirmState, setConfirmState] = React.useState<null | { title: string, text: string, confirmLabel: string, confirmClass?: string, action: () => Promise<void> | void }>(null)
  const [confirmBusy, setConfirmBusy] = React.useState(false)
  const [parentPriceError, setParentPriceError] = React.useState('')
  const [parentUmError, setParentUmError] = React.useState('')
  const [umDropdownOpen, setUmDropdownOpen] = React.useState(false)
  const [isRi, setIsRi] = React.useState(isRiOrAdminUser())
  const parentPanelRef = React.useRef<HTMLDivElement | null>(null)
  const linePanelRef = React.useRef<HTMLDivElement | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const selectedParentRef = React.useRef('')
  const lookupCacheRef = React.useRef<Record<string, any[]>>({})
  const interactionLocked = parentEditing || lineEditing

  const closeConfirm = React.useCallback(() => {
    if (confirmBusy) return
    setConfirmState(null)
  }, [confirmBusy])

  const runConfirm = React.useCallback(async () => {
    if (!confirmState || confirmBusy) return
    setConfirmBusy(true)
    try {
      await Promise.resolve(confirmState.action())
      setConfirmState(null)
    } finally {
      setConfirmBusy(false)
    }
  }, [confirmState, confirmBusy])

  const openConfirm = React.useCallback((cfg: { title: string, text: string, confirmLabel: string, confirmClass?: string, action: () => Promise<void> | void }) => {
    setConfirmState(cfg)
  }, [])

  const focusNextInPanel = React.useCallback((panel: HTMLElement | null, currentTarget: EventTarget | null) => {
    if (!panel || !(currentTarget instanceof HTMLElement)) return
    const selectors = [
      'input.gap-input:not([readonly]):not([disabled])',
      'select.gap-select:not([disabled])',
      'textarea.gap-textarea:not([disabled])',
      'button.gap-btn:not([disabled])'
    ].join(',')
    const nodes = Array.from(panel.querySelectorAll<HTMLElement>(selectors)).filter((el) => {
      if (!el) return false
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
    const idx = nodes.indexOf(currentTarget)
    if (idx < 0) return
    const next = nodes[idx + 1]
    if (next) next.focus()
  }, [])

  const handlePanelEnterNav = React.useCallback((evt: any, panel: HTMLElement | null) => {
    if (evt?.key !== 'Enter') return
    const target = evt?.target as HTMLElement | null
    if (!target) return
    const tag = String(target.tagName || '').toUpperCase()
    if (tag === 'TEXTAREA' && evt.shiftKey) return
    evt.preventDefault()
    focusNextInPanel(panel, target)
  }, [focusNextInPanel])

  const activeGeneralDataRows = React.useMemo(() => (generalDataRows || []).filter((r: any) => num(r.attivo) !== 0), [generalDataRows])
  const familyRows = React.useMemo(() => {
    const rows = activeGeneralDataRows
      .filter((r: any) => normalizeTipoRecord(r.tipo_record) === 3)
      .map((r: any) => ({
        code: normalizeFamily(r.codice_famiglia),
        number: pad4(r.numero_supercapitolo || r.codice_item),
        label: String(r.descrizione_item || FAMILY_DESCRIPTIONS[normalizeFamily(r.codice_famiglia)] || normalizeFamily(r.codice_famiglia)),
        order: num(r.ordine)
      }))
      .filter((r: any) => !!r.code && r.code !== '0000')
      .sort((a: any, b: any) => (a.order - b.order) || a.number.localeCompare(b.number))
    if (rows.length) return rows
    return FAMILY_CODES.map((code, index) => ({ code, number: pad4(index + 1), label: FAMILY_DESCRIPTIONS[code], order: index + 1 }))
  }, [activeGeneralDataRows])
  const umOptions = React.useMemo(() => {
    const rows = activeGeneralDataRows
      .filter((r: any) => normalizeTipoRecord(r.tipo_record) === 2)
      .map((r: any) => String(r.codice_item || r.descrizione_item || '').trim())
      .filter(Boolean)
    return rows.length ? Array.from(new Set(rows)) : [...DEFAULT_UM_OPTIONS]
  }, [activeGeneralDataRows])
  const filteredUmOptions = React.useMemo(() => {
    const q = String(parentForm.unita_misura || '').trim().toLowerCase()
    if (!q) return umOptions
    const starts = umOptions.filter((um) => um.toLowerCase().startsWith(q))
    const contains = umOptions.filter((um) => !um.toLowerCase().startsWith(q) && um.toLowerCase().includes(q))
    return [...starts, ...contains]
  }, [umOptions, parentForm.unita_misura])
  const chapterRecords = React.useMemo(() => {
    const fam = normalizeFamily(parentForm.famiglia)
    const rows = activeGeneralDataRows
      .filter((r: any) => normalizeTipoRecord(r.tipo_record) === 4 && normalizeFamily(r.codice_famiglia) === fam)
      .map((r: any) => ({
        code: pad4(r.numero_capitolo || r.codice_item),
        label: String(r.descrizione_item || ''),
        order: num(r.ordine)
      }))
      .filter((r: any) => !!r.code && r.code !== '0000')
      .sort((a: any, b: any) => (a.order - b.order) || a.code.localeCompare(b.code))
    if (rows.length) return rows
    return uniqueSortedCodes(parents.filter((p: any) => normalizeFamily(p.famiglia) === fam).map((p: any) => p.capitolo)).map((code, idx) => ({ code, label: '', order: idx + 1 }))
  }, [activeGeneralDataRows, parentForm.famiglia, parents])
  const subchapterRecords = React.useMemo(() => {
    const fam = normalizeFamily(parentForm.famiglia)
    const cap = pad4(parentForm.capitolo)
    const rows = activeGeneralDataRows
      .filter((r: any) => normalizeTipoRecord(r.tipo_record) === 5 && normalizeFamily(r.codice_famiglia) === fam && pad4(r.numero_capitolo) === cap)
      .map((r: any) => ({
        code: pad4(r.numero_subcapitolo || r.codice_item),
        label: String(r.descrizione_item || ''),
        order: num(r.ordine)
      }))
      .filter((r: any) => !!r.code)
      .sort((a: any, b: any) => (a.order - b.order) || a.code.localeCompare(b.code))
    if (rows.length) return rows
    return uniqueSortedCodes(parents.filter((p: any) => normalizeFamily(p.famiglia) === fam && pad4(p.capitolo) === cap).map((p: any) => p.sottocapitolo)).map((code, idx) => ({ code, label: '', order: idx + 1 }))
  }, [activeGeneralDataRows, parentForm.famiglia, parentForm.capitolo, parents])
  const chapterOptions = React.useMemo(() => chapterRecords.map((r: any) => r.code), [chapterRecords])
  const subchapterOptions = React.useMemo(() => subchapterRecords.map((r: any) => r.code), [subchapterRecords])
  const chapterRecordsForEdit = React.useMemo(() => {
    const currentCode = pad4(parentForm.capitolo)
    if (!currentCode || currentCode === '0000' || chapterRecords.some((r: any) => r.code === currentCode)) return chapterRecords
    const fallback = (generalDataRows || [])
      .filter((r: any) => normalizeTipoRecord(r.tipo_record) === 4 && normalizeFamily(r.codice_famiglia) === normalizeFamily(parentForm.famiglia) && pad4(r.numero_capitolo || r.codice_item) === currentCode)
      .map((r: any) => ({ code: currentCode, label: String(r.descrizione_item || ''), order: num(r.ordine) || 999999 }))[0]
    return [...chapterRecords, fallback || { code: currentCode, label: '', order: 999999 }]
      .sort((a: any, b: any) => (a.order - b.order) || a.code.localeCompare(b.code))
  }, [chapterRecords, generalDataRows, parentForm.capitolo, parentForm.famiglia])
  const subchapterRecordsForEdit = React.useMemo(() => {
    const currentCode = pad4(parentForm.sottocapitolo)
    if (!currentCode || currentCode === '0000' || subchapterRecords.some((r: any) => r.code === currentCode)) return subchapterRecords
    const fallback = (generalDataRows || [])
      .filter((r: any) => normalizeTipoRecord(r.tipo_record) === 5 && normalizeFamily(r.codice_famiglia) === normalizeFamily(parentForm.famiglia) && pad4(r.numero_capitolo) === pad4(parentForm.capitolo) && pad4(r.numero_subcapitolo || r.codice_item) === currentCode)
      .map((r: any) => ({ code: currentCode, label: String(r.descrizione_item || ''), order: num(r.ordine) || 999999 }))[0]
    return [...subchapterRecords, fallback || { code: currentCode, label: '', order: 999999 }]
      .sort((a: any, b: any) => (a.order - b.order) || a.code.localeCompare(b.code))
  }, [subchapterRecords, generalDataRows, parentForm.sottocapitolo, parentForm.famiglia, parentForm.capitolo])

  React.useEffect(() => {
    const refresh = () => setIsRi(isRiOrAdminUser())
    refresh()
    window.addEventListener('gii:userLoaded', refresh)
    return () => window.removeEventListener('gii:userLoaded', refresh)
  }, [])

  React.useEffect(() => {
    selectedParentRef.current = String(selectedParent || '')
  }, [selectedParent])

  React.useEffect(() => {
    if (!msg) return
    const t = window.setTimeout(() => setMsg(null), 6000)
    return () => window.clearTimeout(t)
  }, [msg])

  React.useEffect(() => {
    if (!interactionLocked) return
    const panels = ['top', 'left', 'right', 'bottom'].map((part) => {
      const el = document.createElement('div')
      el.setAttribute('data-gii-edit-lock', part)
      Object.assign(el.style, {
        position: 'fixed',
        background: 'rgba(0,0,0,0.34)',
        pointerEvents: 'auto',
        zIndex: '9998'
      } as CSSStyleDeclaration)
      document.body.appendChild(el)
      return el
    })

    const bodyOverflow = document.body.style.overflow
    const docOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const updatePanels = () => {
      const rect = rootRef.current?.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        panels.forEach((el) => {
          el.style.top = '0px'
          el.style.left = '0px'
          el.style.width = `${vw}px`
          el.style.height = `${vh}px`
        })
        return
      }
      const top = Math.max(0, Math.floor(rect.top) - 6)
      const left = Math.max(0, Math.floor(rect.left) - 11)
      const right = Math.min(vw, Math.ceil(rect.right) + 6)
      const bottom = Math.min(vh, Math.ceil(rect.bottom) + 6)
      Object.assign(panels[0].style, { top: '0px', left: '0px', width: `${vw}px`, height: `${top}px` })
      Object.assign(panels[1].style, { top: `${top}px`, left: '0px', width: `${left}px`, height: `${Math.max(0, bottom - top)}px` })
      Object.assign(panels[2].style, { top: `${top}px`, left: `${right}px`, width: `${Math.max(0, vw - right)}px`, height: `${Math.max(0, bottom - top)}px` })
      Object.assign(panels[3].style, { top: `${bottom}px`, left: '0px', width: `${vw}px`, height: `${Math.max(0, vh - bottom)}px` })
    }

    const blockOutsideFocus = (event: FocusEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      const fallback = rootRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      fallback?.focus()
    }

    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const stopKeys = (event: KeyboardEvent) => {
      if (!interactionLocked) return
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      if (event.key === 'Tab') {
        event.preventDefault()
        const fallback = rootRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        fallback?.focus()
      }
    }

    updatePanels()
    const resizeObserver = typeof ResizeObserver !== 'undefined' && rootRef.current ? new ResizeObserver(() => updatePanels()) : null
    if (resizeObserver && rootRef.current) resizeObserver.observe(rootRef.current)
    window.addEventListener('resize', updatePanels)
    window.addEventListener('scroll', updatePanels, true)
    window.addEventListener('beforeunload', preventUnload)
    document.addEventListener('focusin', blockOutsideFocus, true)
    document.addEventListener('keydown', stopKeys, true)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updatePanels)
      window.removeEventListener('scroll', updatePanels, true)
      window.removeEventListener('beforeunload', preventUnload)
      document.removeEventListener('focusin', blockOutsideFocus, true)
      document.removeEventListener('keydown', stopKeys, true)
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = docOverflow
      panels.forEach((el) => el.remove())
    }
  }, [interactionLocked])

  const loadParents = React.useCallback(async (preferredSelection?: string) => {
    if (!parentTableUrl) { setParents([]); return }
    const rr = (await queryRows(parentTableUrl, '1=1', 'codice_np ASC, OBJECTID ASC')).map(mapParentRow)
    setParents(rr)
    const wanted = String(preferredSelection != null ? preferredSelection : selectedParentRef.current || '')
    if (!wanted) return
    if (rr.some((r: any) => String(r.codice_voce || '') === wanted)) {
      if (selectedParentRef.current !== wanted) setSelectedParent(wanted)
      return
    }
    if (preferredSelection == null && selectedParentRef.current) setSelectedParent('')
  }, [parentTableUrl])

  const loadGeneralData = React.useCallback(async () => {
    if (!generalDataUrl) { setGeneralDataRows([]); return }
    const rr = await queryRows(generalDataUrl, '1=1', 'tipo_record ASC, ordine ASC, codice_item ASC, OBJECTID ASC')
    setGeneralDataRows(rr)
  }, [generalDataUrl])

  const loadLines = React.useCallback(async (preferredSelection?: string) => {
    const parentCode = String(preferredSelection != null ? preferredSelection : selectedParentRef.current || '')
    if (!serviceUrl || !parentCode) { setRows([]); return }
    const baseRows = (await queryRows(serviceUrl, `codice_np_parent = '${esc(parentCode)}'`, 'ordine_riga ASC, OBJECTID ASC')).map(mapLineRow)
    const regionalIds = baseRows.filter((r: any) => normalizeOrigin(r.origine_riga) === 1).map((r: any) => Number(r.objectid_sorgente || 0))
    const internalIds = baseRows.filter((r: any) => normalizeOrigin(r.origine_riga) === 2).map((r: any) => Number(r.objectid_sorgente || 0))
    const parentIds = baseRows.filter((r: any) => normalizeOrigin(r.origine_riga) === 3).map((r: any) => Number(r.objectid_sorgente || 0))
    const [regionalDetails, internalDetails, parentDetails] = await Promise.all([
      querySourceDetails(regionalTableUrl, regionalIds),
      querySourceDetails(internalTableUrl, internalIds),
      querySourceDetails(parentTableUrl, parentIds)
    ])
    const rr = baseRows.map((r: any) => {
      const oid = Number(r.objectid_sorgente || 0)
      const current = normalizeOrigin(r.origine_riga) === 1
        ? regionalDetails[oid]
        : normalizeOrigin(r.origine_riga) === 2
          ? internalDetails[oid]
          : parentDetails[oid]
      if (!current) return r
      const currentPrice = Number.isFinite(Number(current.prezzo_unitario)) ? round(num(current.prezzo_unitario), 4) : round(num(r.prezzo_unitario), 4)
      return {
        ...r,
        codice_riferimento: String(current.code || r.codice_riferimento || ''),
        descrizione: String(current.description || r.descrizione || ''),
        unita_misura: String(current.unita_misura || r.unita_misura || ''),
        prezzo_unitario: currentPrice,
        importo: round(num(r.quantita) * currentPrice, 4),
        famiglia_sorgente: String(current.famiglia || r.famiglia_sorgente || '')
      }
    })
    setRows(rr)
  }, [serviceUrl, regionalTableUrl, internalTableUrl, parentTableUrl])

  React.useEffect(() => {
    let cancel = false
    const run = async () => {
      try { await loadGeneralData() } catch (e: any) { if (!cancel) setMsg({ text: 'Errore caricamento dati generali: ' + (e?.message ?? e), ok: false }) }
    }
    void run()
    return () => { cancel = true }
  }, [loadGeneralData])

  React.useEffect(() => {
    let cancel = false
    const run = async () => {
      try { await loadParents() } catch (e: any) { if (!cancel) setMsg({ text: 'Errore caricamento nuovi prezzi: ' + (e?.message ?? e), ok: false }) }
    }
    void run()
    return () => { cancel = true }
  }, [loadParents])

  React.useEffect(() => {
    let cancel = false
    const run = async () => {
      setLoading(true)
      try { await loadLines(selectedParent) } catch (e: any) { if (!cancel) setMsg({ text: 'Errore caricamento righe: ' + (e?.message ?? e), ok: false }) }
      if (!cancel) setLoading(false)
    }
    void run()
    return () => { cancel = true }
  }, [loadLines, selectedParent])

  React.useEffect(() => {
    if (!rows.length) {
      if (selectedLineId != null) setSelectedLineId(null)
      return
    }
    if (selectedLineId == null) return
    if (!rows.some((r: any) => Number(r.objectid || 0) === Number(selectedLineId))) setSelectedLineId(null)
  }, [rows, selectedLineId])

  const selectedLineRow = React.useMemo(() => rows.find((r: any) => Number(r.objectid || 0) === Number(selectedLineId || 0)) || null, [rows, selectedLineId])

  const selectedParentRow = React.useMemo(() => parents.find((p: any) => String(p.codice_voce || '') === String(selectedParent || '')) || null, [parents, selectedParent])
  const selectedParentMode = normalizeModality(selectedParentRow?.modalita_voce)
  const selectedParentActive = React.useMemo(() => num(selectedParentRow?.attivo) !== 0, [selectedParentRow])
  const selectedParentLabel = selectedParentRow ? `${selectedParentRow.codice_voce} — ${selectedParentRow.descrizione}` : ''
  const selectedParentDisplayPrice = React.useMemo(() => {
    if (!selectedParentRow) return 0
    if (selectedParentMode === 2) return round(rows.reduce((sum: number, r: any) => sum + num(r.importo), 0), 4)
    return round(num(selectedParentRow.prezzo_unitario), 4)
  }, [selectedParentRow, selectedParentMode, rows])

  React.useEffect(() => {
    if (!parentEditing) return
    if (parentForm.objectid != null) return
    const next = nextProgressiveFromRows(parents, parentForm.anno_listino, parentForm.famiglia, parentForm.capitolo, parentForm.sottocapitolo)
    setParentForm((f: any) => ({
      ...f,
      progressivo_voce: next,
      codice_voce: buildCode(f.anno_listino, f.famiglia, f.capitolo, f.sottocapitolo, next)
    }))
  }, [parents, parentEditing, parentForm.objectid, parentForm.anno_listino, parentForm.famiglia, parentForm.capitolo, parentForm.sottocapitolo])

  React.useEffect(() => {
    if (!lineEditing) { setLookupRows([]); setLookupLoading(false); setLookupDropdownOpen(false); return }
    const origin = normalizeOrigin(lineForm.origine_riga)
    const sourceUrl = origin === 1 ? regionalTableUrl : (origin === 2 ? internalTableUrl : parentTableUrl)
    if (!sourceUrl) { setLookupRows([]); setLookupLoading(false); return }
    const rawSearch = String(lineForm.lookupSearch || '').trim()
    const currentCode = String(lineForm.codice_riferimento || '').trim()
    const currentRow = currentCode ? {
      objectid: Number(lineForm.objectid_sorgente || 0),
      code: currentCode,
      description: String(lineForm.descrizione || ''),
      unita_misura: String(lineForm.unita_misura || ''),
      prezzo_unitario: round(num(lineForm.prezzo_unitario), 4),
      categoria_costo: normalizeCategory(lineForm.categoria_costo || deriveCategoryFromFamilyCode(lineForm.famiglia_sorgente || '')),
      famiglia: familyLabel(lineForm.famiglia_sorgente || ''),
      raw: {}
    } : null
    if (!rawSearch) {
      setLookupRows(currentRow ? [currentRow] : [])
      setLookupLoading(false)
      return
    }
    if (rawSearch.length < 2) {
      setLookupRows(currentRow && upper(rawSearch) === upper(currentCode) ? [currentRow] : [])
      setLookupLoading(false)
      return
    }
    const cacheKey = `${sourceUrl}::${origin === 3 ? String(selectedParent || '') : ''}::${upper(rawSearch)}`
    const cached = lookupCacheRef.current[cacheKey]
    if (cached && cached.length) {
      const nextRows = currentRow && !cached.some((r: any) => String(r.code || '').trim() === currentCode) ? [currentRow, ...cached] : cached
      setLookupRows(nextRows)
      setLookupLoading(false)
      return
    }
    let cancel = false
    const handle = window.setTimeout(() => {
      void (async () => {
        setLookupLoading(true)
        try {
          const rr = await queryLookupOptions(sourceUrl, rawSearch, origin === 3 ? selectedParent : '', {
            objectid: lineForm.objectid_sorgente,
            code: lineForm.codice_riferimento
          }, 50)
          if (cancel) return
          let nextRows = rr
          if (currentRow && !rr.some((r: any) => String(r.code || '').trim() === currentCode)) nextRows = [currentRow, ...rr]
          lookupCacheRef.current[cacheKey] = nextRows
          setLookupRows(nextRows)
        } catch (e: any) {
          if (!cancel) setMsg({ text: 'Errore caricamento voci sorgente: ' + (e?.message ?? e), ok: false })
        }
        if (!cancel) setLookupLoading(false)
      })()
    }, 250)
    return () => { cancel = true; window.clearTimeout(handle) }
  }, [lineEditing, lineForm.origine_riga, lineForm.lookupSearch, lineForm.objectid_sorgente, lineForm.codice_riferimento, lineForm.descrizione, lineForm.unita_misura, lineForm.prezzo_unitario, lineForm.categoria_costo, lineForm.famiglia_sorgente, regionalTableUrl, internalTableUrl, parentTableUrl, selectedParent])


  const refreshAll = React.useCallback(async (preferredSelection?: string) => {
    lookupCacheRef.current = {}
    await loadParents(preferredSelection)
    await loadLines(preferredSelection)
  }, [loadParents, loadLines])

  const onNewParent = () => {
    setParentEditing(true)
    setLineEditing(false)
    setLookupRows([])
    const f = { ...emptyParentForm() }
    setParentForm(f)
    setParentPriceError('')
    setParentUmError('')
  }

  const applyUmSelection = React.useCallback((value: string) => {
    const normalized = normalizeUm(value, umOptions)
    setParentForm((f: any) => ({ ...f, unita_misura: normalized || value }))
    setParentUmError(normalized ? '' : 'Seleziona una UM presente in elenco.')
    setUmDropdownOpen(false)
  }, [umOptions])

  const finalizeUmField = React.useCallback(() => {
    const raw = String(parentForm.unita_misura || '').trim()
    if (!raw) { setParentUmError(''); setUmDropdownOpen(false); return }
    const normalized = normalizeUm(raw, umOptions)
    if (normalized) {
      setParentForm((f: any) => ({ ...f, unita_misura: normalized }))
      setParentUmError('')
    } else {
      setParentUmError('Seleziona una UM presente in elenco.')
    }
    setUmDropdownOpen(false)
  }, [parentForm.unita_misura, umOptions])

  const onResetParentSelection = () => {
    setSelectedParent('')
    setRows([])
    setSelectedLineId(null)
    setLineEditing(false)
    setLookupRows([])
    setLineForm(emptyLineForm(''))
    setParentEditing(false)
    setParentForm(emptyParentForm())
    setMsg(null)
  }
  const onResetLineSource = () => {
    setLookupRows([])
    setLookupDropdownOpen(false)
    setLineForm((f: any) => ({
      ...f,
      lookupSearch: '',
      objectid_sorgente: '',
      codice_riferimento: '',
      descrizione: '',
      unita_misura: '',
      prezzo_unitario: '',
      famiglia_sorgente: ''
    }))
  }

  const onEditParent = () => {
    if (!selectedParentRow) return
    if (!selectedParentActive) { setMsg({ text: 'La voce è disattivata. Riattivala prima di modificarla.', ok: false }); return }
    setParentEditing(true)
    setParentPriceError('')
    setParentUmError('')
    setLineEditing(false)
    setLookupRows([])
    setParentForm({
      objectid: selectedParentRow.objectid,
      codice_voce: String(selectedParentRow.codice_voce || ''),
      descrizione: String(selectedParentRow.descrizione || ''),
      unita_misura: String(selectedParentRow.unita_misura || ''),
      prezzo_unitario: normalizeModality(selectedParentRow.modalita_voce) === 1 ? moneyInput(selectedParentRow.prezzo_unitario) : String(selectedParentDisplayPrice ?? ''),
      categoria_default: '',
      attivo: String(num(selectedParentRow.attivo) === 0 ? '0' : '1'),
      note: String(selectedParentRow.note || ''),
      modalita_voce: normalizeModality(selectedParentRow.modalita_voce),
      anno_listino: asYear(selectedParentRow.anno_listino),
      famiglia: normalizeFamily(selectedParentRow.famiglia),
      capitolo: pad4(selectedParentRow.capitolo),
      sottocapitolo: pad4(selectedParentRow.sottocapitolo),
      progressivo_voce: pad4(selectedParentRow.progressivo_voce || parseProgressivoFromCode(selectedParentRow.codice_voce)),
    })
  }
  const onCancelParent = () => {
    setParentEditing(false)
    setParentForm(emptyParentForm())
    setParentPriceError('')
    setParentUmError('')
  }
  const onSaveParent = async () => {
    const mode = normalizeModality(parentForm.modalita_voce)
    const year = asYear(parentForm.anno_listino)
    const famiglia = normalizeFamily(parentForm.famiglia)
    const capitolo = pad4(parentForm.capitolo)
    const sottocapitolo = pad4(parentForm.sottocapitolo)
    const progressivo = parentForm.objectid != null ? pad4(parentForm.progressivo_voce || parseProgressivoFromCode(parentForm.codice_voce)) : nextProgressiveFromRows(parents, year, famiglia, capitolo, sottocapitolo)
    const code = buildCode(year, famiglia, capitolo, sottocapitolo, progressivo)
    if (!String(parentForm.descrizione || '').trim()) { setMsg({ text: 'Compila la descrizione del Nuovo Prezzo.', ok: false }); return }
    if (!famiglia) { setMsg({ text: 'Seleziona un super capitolo valido dai Dati Generali.', ok: false }); return }
    if (!capitolo || capitolo === '0000') { setMsg({ text: 'Seleziona un capitolo valido dai Dati Generali.', ok: false }); return }
    if (!sottocapitolo || sottocapitolo === '0000') { setMsg({ text: 'Seleziona un sub capitolo valido dai Dati Generali.', ok: false }); return }
    const normalizedUm = normalizeUm(parentForm.unita_misura, umOptions)
    if (!normalizedUm) { setParentUmError('Seleziona una UM presente in elenco.'); setMsg({ text: 'Seleziona un’unità di misura valida.', ok: false }); return }
    setParentUmError('')
    if (mode === 1 && String(parentForm.prezzo_unitario || '').trim() === '') { setMsg({ text: 'Per il Nuovo Prezzo elementare devi indicare il prezzo manuale.', ok: false }); return }
    const validatedPrice = mode === 1 ? validateMoneyInput(parentForm.prezzo_unitario) : { ok: true, value: round(num(parentForm.prezzo_unitario), 4), text: money(round(num(parentForm.prezzo_unitario), 4), 2) }
    if (!validatedPrice.ok) { setParentPriceError(String(validatedPrice.message || 'Prezzo non valido.')); return }
    setParentPriceError('')
    if (mode === 1 && String(validatedPrice.text || '').trim()) {
      setParentForm((f: any) => ({ ...f, prezzo_unitario: String(validatedPrice.text || '') }))
    }
    if (mode === 1 && parentForm.objectid != null && rows.length > 0) { setMsg({ text: 'Non puoi impostare ELEMENTARE una voce che ha già righe di analisi.', ok: false }); return }
    setSaving(true)
    try {
      const oid = await applyAttrs(parentTableUrl, {
        codice_np: code,
        descrizione: String(parentForm.descrizione || '').trim(),
        um: normalizedUm,
        prezzo: Number(validatedPrice.value || 0),
        attivo: parentForm.objectid != null ? (String(parentForm.attivo) === '0' ? 0 : 1) : 1,
        note: String(parentForm.note || '').trim(),
        modalita_prezzo: String(mode),
        anno_listino: year,
        famiglia,
        capitolo,
        sottocapitolo,
        progressivo_prezzo: progressivo
      }, parentForm.objectid != null ? Number(parentForm.objectid) : null)
      if (parentForm.objectid != null && String(selectedParent || '').trim() && selectedParent !== code) {
        const childRows = await queryRows(serviceUrl, `codice_np_parent = '${esc(selectedParent)}'`, 'OBJECTID ASC')
        for (const r of childRows) {
          await applyAttrs(serviceUrl, { codice_np_parent: code }, Number(r.objectid))
        }
      }
      setSelectedParent(code)
      selectedParentRef.current = code
      setParentEditing(false)
      setParentForm(emptyParentForm())
      await refreshAll(code)
      if (mode === 2) {
        const total = await recomputeParentPrice(parentTableUrl, serviceUrl, code)
        setMsg({ text: parentForm.objectid != null ? `Testata aggiornata. Prezzo ricalcolato: ${money(total, 4)}` : `Nuovo Prezzo analizzato creato: ${code}`, ok: true })
      } else {
        setMsg({ text: parentForm.objectid != null ? `Nuovo Prezzo elementare aggiornato: ${code}` : `Nuovo Prezzo elementare creato: ${code}`, ok: true })
      }
    } catch (e: any) {
      setMsg({ text: 'Errore salvataggio testata Nuovo Prezzo: ' + (e?.message ?? e), ok: false })
    }
    setSaving(false)
  }

  const hasConfiguredStructure = React.useMemo(() => {
    const hasSuper = activeGeneralDataRows.some((r: any) => normalizeTipoRecord(r.tipo_record) === 3)
    const hasCap = activeGeneralDataRows.some((r: any) => normalizeTipoRecord(r.tipo_record) === 4)
    const hasSub = activeGeneralDataRows.some((r: any) => normalizeTipoRecord(r.tipo_record) === 5)
    return hasSuper && hasCap && hasSub
  }, [activeGeneralDataRows])

  const onDeleteParent = async () => {
    if (!selectedParentRow) return
    if (!selectedParentActive) { setMsg({ text: 'La voce è disattivata. Riattivala prima di eliminarla.', ok: false }); return }
    setSaving(true)
    try {
      const refs = await countInternalReferences(serviceUrl, Number(selectedParentRow.objectid), String(selectedParentRow.codice_voce || ''))
      if (refs > 0) {
        setMsg({ text: 'Non puoi eliminare questo Nuovo Prezzo perché è utilizzato in una o più analisi di nuovi prezzi.', ok: false })
        return
      }
      openConfirm({
        title: 'Conferma eliminazione',
        text: `Stai per eliminare definitivamente il Nuovo Prezzo:
${selectedParentLabel}

Verranno eliminate anche tutte le sue righe di analisi.`,
        confirmLabel: 'Elimina voce',
        confirmClass: 'gap-danger',
        action: async () => {
          setSaving(true)
          try {
            const childIds = rows.map((r: any) => Number(r.objectid)).filter(Boolean)
            if (childIds.length) await deleteObjectIds(serviceUrl, childIds)
            await deleteObjectIds(parentTableUrl, [Number(selectedParentRow.objectid)])
            setSelectedParent('')
            setRows([])
            setSelectedLineId(null)
            setLineEditing(false)
            setParentEditing(false)
            await loadParents()
            setMsg({ text: 'Nuovo Prezzo eliminato.', ok: true })
          } catch (e: any) {
            setMsg({ text: 'Errore eliminazione Nuovo Prezzo: ' + (e?.message ?? e), ok: false })
          } finally {
            setSaving(false)
          }
        }
      })
    } catch (e: any) {
      setMsg({ text: 'Errore eliminazione Nuovo Prezzo: ' + (e?.message ?? e), ok: false })
    } finally {
      setSaving(false)
    }
  }

  const onToggleActiveParent = async (nextActive: boolean) => {
    if (!selectedParentRow) return
    openConfirm({
      title: nextActive ? 'Conferma riattivazione' : 'Conferma disattivazione',
      text: nextActive
        ? `Stai per riattivare il Nuovo Prezzo:
${selectedParentLabel}`
        : `Stai per disattivare il Nuovo Prezzo:
${selectedParentLabel}

La voce resterà consultabile ma non sarà proposta nelle nuove selezioni finché non verrà riattivata.`,
      confirmLabel: nextActive ? 'Riattiva' : 'Disattiva',
      confirmClass: nextActive ? 'gap-success-outline' : 'gap-danger-outline',
      action: async () => {
        setSaving(true)
        try {
          await applyAttrs(parentTableUrl, { attivo: nextActive ? 1 : 0 }, Number(selectedParentRow.objectid))
          try {
            window.dispatchEvent(new CustomEvent('gii:np-updated', {
              detail: { objectid: Number(selectedParentRow.objectid), attivo: nextActive ? 1 : 0 }
            }))
          } catch (_) {}
          await refreshAll()
          setMsg({ text: nextActive ? 'Nuovo Prezzo riattivato.' : 'Nuovo Prezzo disattivato.', ok: true })
        } catch (e: any) {
          setMsg({ text: `${nextActive ? 'Errore riattivazione' : 'Errore disattivazione'} Nuovo Prezzo: ` + (e?.message ?? e), ok: false })
        } finally {
          setSaving(false)
        }
      }
    })
  }

  const onNewLine = () => {
    if (!selectedParentRow) return
    if (!selectedParentActive) { setMsg({ text: 'La voce è disattivata. Riattivala prima di aggiungere righe di analisi.', ok: false }); return }
    if (normalizeModality(selectedParentRow.modalita_voce) !== 2) {
      setMsg({ text: 'Le righe di analisi sono consentite solo per Nuovi Prezzi ANALIZZATI.', ok: false })
      return
    }
    setParentEditing(false)
    setLineEditing(true)
    setSelectedLineId(null)
    setLookupRows([])
    setLookupDropdownOpen(false)
    setLineForm({ ...emptyLineForm(selectedParent), ordine: String(maxLineOrder(rows) + 1) })
  }
  const onPickLookup = (r: any) => {
    setLineForm((f: any) => ({
      ...f,
      objectid_sorgente: String(r.objectid || ''),
      codice_riferimento: String(r.code || ''),
      descrizione: String(r.description || ''),
      unita_misura: String(r.unita_misura || ''),
      prezzo_unitario: String(r.prezzo_unitario ?? ''),
      categoria_costo: '',
      famiglia_sorgente: String(r.famiglia || ''),
      lookupSearch: String(r.code || '')
    }))
    setLookupRows([])
    setLookupDropdownOpen(false)
  }
  const onEditLine = (r: any) => {
    if (!selectedParentActive) { setMsg({ text: 'La voce è disattivata. Riattivala prima di modificare le righe di analisi.', ok: false }); return }
    setParentEditing(false)
    setLineEditing(true)
    setSelectedLineId(Number(r.objectid || 0) || null)
    setLookupRows([])
    setLookupDropdownOpen(false)
    setLineForm({
      objectid: r.objectid,
      codice_voce_parent: String(r.codice_voce_parent || selectedParent),
      origine_riga: normalizeOrigin(r.origine_riga),
      objectid_sorgente: String(r.objectid_sorgente || ''),
      categoria_costo: '',
      famiglia_sorgente: String(r.famiglia_sorgente || ''),
      codice_riferimento: String(r.codice_riferimento || ''),
      descrizione: String(r.descrizione || ''),
      unita_misura: String(r.unita_misura || ''),
      quantita: String(r.quantita ?? ''),
      prezzo_unitario: String(r.prezzo_unitario ?? ''),
      importo: String(r.importo ?? ''),
      ordine: String(r.ordine ?? ''),
      note: String(r.note || ''),
      lookupSearch: String(r.codice_riferimento || '')
    })
  }
  const onCancelLine = () => {
    setLineEditing(false)
    setLookupRows([])
    setLookupDropdownOpen(false)
    setLineForm(emptyLineForm(selectedParent))
  }
  const onSaveLine = async () => {
    if (!selectedParentRow) { setMsg({ text: 'Seleziona prima un Nuovo Prezzo.', ok: false }); return }
    if (!selectedParentActive) { setMsg({ text: 'La voce è disattivata. Riattivala prima di salvare righe di analisi.', ok: false }); return }
    if (normalizeModality(selectedParentRow.modalita_voce) !== 2) { setMsg({ text: 'Le righe sono ammesse solo per Nuovi Prezzi ANALIZZATI.', ok: false }); return }
    if (!String(lineForm.codice_riferimento || '').trim()) { setMsg({ text: 'Seleziona una voce sorgente da REGIONALE, INTERNO o NUOVO PREZZO.', ok: false }); return }
    if (!String(lineForm.descrizione || '').trim()) { setMsg({ text: 'Compila la descrizione della riga.', ok: false }); return }
    if (normalizeOrigin(lineForm.origine_riga) === 3 && Number(lineForm.objectid_sorgente || 0) === Number(selectedParentRow.objectid || 0)) { setMsg({ text: 'Non puoi aggiungere il Nuovo Prezzo corrente come riga della propria analisi.', ok: false }); return }
    const q = round(num(lineForm.quantita), 4)
    if (!q) { setMsg({ text: 'La quantità deve essere maggiore di zero.', ok: false }); return }
    const pu = round(num(lineForm.prezzo_unitario), 4)
    const imp = round(q * pu, 4)
    setSaving(true)
    try {
      await applyAttrs(serviceUrl, {
        objectid_np_parent: selectedParentRow.objectid,
        codice_np_parent: selectedParent,
        origine_riga: String(normalizeOrigin(lineForm.origine_riga)),
        objectid_sorgente: lineForm.objectid_sorgente === '' ? null : Math.trunc(num(lineForm.objectid_sorgente)),
        codice_sorgente: String(lineForm.codice_riferimento || '').trim(),
        descrizione_snapshot: String(lineForm.descrizione || '').trim(),
        um_snapshot: String(lineForm.unita_misura || '').trim(),
        famiglia_sorgente: normalizeFamily(lineForm.famiglia_sorgente || ''),
        quantita: q,
        prezzo_unitario: pu,
        importo: imp,
        ordine_riga: lineForm.objectid != null
          ? Math.max(1, Math.trunc(num(lineForm.ordine)) || 1)
          : Math.max(1, maxLineOrder(rows) + 1),
        note: String(lineForm.note || '').trim()
      }, lineForm.objectid != null ? Number(lineForm.objectid) : null)
      const total = await recomputeParentPrice(parentTableUrl, serviceUrl, selectedParent)
      setLineEditing(false)
      setLineForm(emptyLineForm(selectedParent))
      await loadLines()
      await loadParents()
      setMsg({ text: `Riga analisi salvata. Prezzo voce ricalcolato: ${money(total, 4)}`, ok: true })
    } catch (e: any) {
      setMsg({ text: 'Errore salvataggio riga: ' + (e?.message ?? e), ok: false })
    }
    setSaving(false)
  }
  const onDeleteLine = async (r: any) => {
    if (!selectedParentActive) { setMsg({ text: 'La voce è disattivata. Riattivala prima di eliminare righe di analisi.', ok: false }); return }
    openConfirm({
      title: 'Conferma eliminazione riga',
      text: `Stai per eliminare la riga di analisi:
${r.codice_riferimento} — ${r.descrizione}`,
      confirmLabel: 'Elimina riga',
      confirmClass: 'gap-danger',
      action: async () => {
        setSaving(true)
        try {
          await deleteObjectIds(serviceUrl, [Number(r.objectid)])
          await resequenceLineOrders(serviceUrl, selectedParent)
          const total = await recomputeParentPrice(parentTableUrl, serviceUrl, selectedParent)
          await loadLines()
          setSelectedLineId(null)
          await loadParents()
          setMsg({ text: `Riga eliminata. Prezzo voce ricalcolato: ${money(total, 4)}`, ok: true })
        } catch (e: any) {
          setMsg({ text: 'Errore eliminazione riga: ' + (e?.message ?? e), ok: false })
        }
        setSaving(false)
      }
    })
  }
  const onMoveLine = async (row: any, direction: -1 | 1) => {
    if (!selectedParentActive) { setMsg({ text: 'La voce è disattivata. Riattivala prima di riordinare le righe di analisi.', ok: false }); return }
    const ordered = [...rows].sort((a: any, b: any) => {
      const da = Math.trunc(num(a?.ordine))
      const db = Math.trunc(num(b?.ordine))
      if (da !== db) return da - db
      return Number(a?.objectid || 0) - Number(b?.objectid || 0)
    })
    const idx = ordered.findIndex((x: any) => Number(x?.objectid || 0) === Number(row?.objectid || 0))
    if (idx < 0) return
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= ordered.length) return

    const current = ordered[idx]
    const target = ordered[swapIdx]
    const currentOrder = Math.max(1, Math.trunc(num(current?.ordine)) || (idx + 1))
    const targetOrder = Math.max(1, Math.trunc(num(target?.ordine)) || (swapIdx + 1))
    const previousRows = rows
    const optimisticRows = rows.map((r: any) => {
      const oid = Number(r?.objectid || 0)
      if (oid === Number(current?.objectid || 0)) return { ...r, ordine: targetOrder }
      if (oid === Number(target?.objectid || 0)) return { ...r, ordine: currentOrder }
      return r
    }).sort((a: any, b: any) => {
      const da = Math.trunc(num(a?.ordine))
      const db = Math.trunc(num(b?.ordine))
      if (da !== db) return da - db
      return Number(a?.objectid || 0) - Number(b?.objectid || 0)
    })

    setRows(optimisticRows)
    setSaving(true)
    try {
      await applyAttrsBatch(serviceUrl, [
        { objectid: Number(current.objectid), attrs: { ordine_riga: targetOrder } },
        { objectid: Number(target.objectid), attrs: { ordine_riga: currentOrder } }
      ])
    } catch (e: any) {
      setRows(previousRows)
      setMsg({ text: 'Errore riordino righe: ' + (e?.message ?? e), ok: false })
    } finally {
      setSaving(false)
    }
  }

  const parentCodePreview = React.useMemo(() => {
    if (!parentEditing) return ''
    if (!normalizeFamily(parentForm.famiglia) || !pad4(parentForm.capitolo).replace(/0/g, '') || !pad4(parentForm.sottocapitolo).replace(/0/g, '')) return ''
    const prog = parentForm.objectid != null ? pad4(parentForm.progressivo_voce || parseProgressivoFromCode(parentForm.codice_voce)) : nextProgressiveFromRows(parents, parentForm.anno_listino, parentForm.famiglia, parentForm.capitolo, parentForm.sottocapitolo)
    return buildCode(parentForm.anno_listino, parentForm.famiglia, parentForm.capitolo, parentForm.sottocapitolo, prog)
  }, [parentEditing, parentForm.objectid, parentForm.codice_voce, parentForm.anno_listino, parentForm.famiglia, parentForm.capitolo, parentForm.sottocapitolo, parentForm.progressivo_voce, parents])

  const lineImportoPreview = React.useMemo(() => round(num(lineForm.quantita) * num(lineForm.prezzo_unitario), 4), [lineForm.quantita, lineForm.prezzo_unitario])

  if (!isRi) {
    return <div style={{ padding: 12, fontFamily: 'Arial, sans-serif', color: '#7a1c1c', background: '#fce4e4', border: '1px solid #f5b8b8', borderRadius: 6 }}>Widget riservato al Responsabile Istruttore (RI) o all'Amministratore (ADMIN).</div>
  }

  return (
    <Fragment>
      <style>{styles}</style>
      <div className='gap' ref={rootRef} style={{ '--gap-detail-card-background': detailCardBackgroundColor, '--gap-records-card-background': recordsCardBackgroundColor, ...(interactionLocked ? { position: 'relative', zIndex: 9999 } : {}) } as React.CSSProperties}>
        <div className='gap-title' style={{ color: titleColor, fontSize: titleFontSize }}>{title}</div>

        {(!serviceUrl || !parentTableUrl || !generalDataUrl) ? <div className='gap-msg gap-err'>Configura gli URL delle tabelle nel setting del widget.</div> : null}
        {msg && !msg.ok ? <div className='gap-msg gap-err'>{msg.text}</div> : null}

        <div className='gap-field' style={{ minWidth: 420, marginBottom: 10 }}>
          <div className='gap-label' style={{ color: toolbarLabelColor, fontSize: toolbarLabelFontSize }}>Seleziona voce da elenco Nuovi Prezzi</div>
          <div className='gap-inline'>
            <div className='gap-field-grow'>
              <div className='gap-clear-wrap'>
                <select className='gap-select' value={selectedParent} onChange={(e) => { if (!parentEditing) setSelectedParent(e.target.value) }} disabled={parentEditing || lineEditing}>
                  <option value=''>— seleziona —</option>
                  {parents.map((p: any) => <option key={p.objectid} value={String(p.codice_voce || '')}>{`${p.codice_voce} — ${p.descrizione}`}</option>)}
                </select>
                <button className='gap-clear-inside' title='Reset selezione' aria-label='Reset selezione' onClick={onResetParentSelection} disabled={!selectedParent || parentEditing || lineEditing || saving} type='button'>×</button>
              </div>
            </div>
          </div>
        </div>

        <div className='gap-toolbar' style={{ alignItems: 'center' }}>
          <div><NewRecordButton onClick={onNewParent} disabled={!!selectedParent || parentEditing || saving || confirmBusy} title='Nuovo prezzo' /></div>
          <div><RecordEditButton onClick={onEditParent} disabled={!selectedParentRow || !selectedParentActive || parentEditing || lineEditing || saving || confirmBusy} title='Modifica testata' ariaLabel='Modifica testata' /></div>
          {selectedParentRow ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Stato</span>
              <GiiActiveToggle
                checked={selectedParentActive}
                disabled={parentEditing || lineEditing || saving || confirmBusy}
                onChange={(next) => void onToggleActiveParent(next)}
                ariaLabel='Stato del Nuovo Prezzo selezionato'
                activeLabel='Attivo'
                inactiveLabel='Disattivato'
              />
            </div>
          ) : null}
          <div><RecordDeleteButton onClick={() => void onDeleteParent()} disabled={!selectedParentRow || !selectedParentActive || parentEditing || lineEditing || saving || confirmBusy} title='Elimina voce' ariaLabel='Elimina voce' /></div>
        </div>

        {parentEditing && (
          <div className='gap-panel gap-detail-card' ref={parentPanelRef} onKeyDown={(e) => handlePanelEnterNav(e, parentPanelRef.current)}>
            <div style={{ fontWeight: 700, color: sectionTitleColor, fontSize: sectionTitleFontSize, marginBottom: 10 }}>{parentForm.objectid != null ? 'Modifica testata Nuovo Prezzo' : 'Nuovo Prezzo'}</div>
            {!hasConfiguredStructure && parentForm.objectid == null ? <div className='gap-msg gap-err' style={{ marginBottom: 10 }}>Configura GII_DATI_GENERALI con SUPERCAPITOLI, CAPITOLI e SUBCAPITOLI attivi prima di creare un Nuovo Prezzo.</div> : null}
            <div className='gap-form-grid'>
              <div className='gap-field'>
                <div className='gap-label'>Tipologia</div>
                <select className='gap-select' value={String(normalizeModality(parentForm.modalita_voce))} onChange={(e) => setParentForm((f: any) => ({ ...f, modalita_voce: Number(e.target.value) }))}>
                  <option value='1'>ELEMENTARE</option>
                  <option value='2'>ANALIZZATA</option>
                </select>
              </div>
              <div className='gap-field'>
                <div className='gap-label'>Anno listino</div>
                <input className='gap-input' inputMode='numeric' value={parentForm.anno_listino || ''} onChange={(e) => setParentForm((f: any) => ({ ...f, anno_listino: e.target.value.replace(/\D/g, '').slice(0, 4) }))} disabled={parentForm.objectid != null} />
              </div>
              <div className='gap-field'>
                <div className='gap-label'>Super capitolo</div>
                <select className='gap-select' value={String(normalizeFamily(parentForm.famiglia))} onChange={(e) => setParentForm((f: any) => {
                  const famiglia = upper(e.target.value)
                  return { ...f, famiglia, capitolo: '', sottocapitolo: '', categoria_default: deriveCategoryFromFamilyCode(famiglia) }
                })}>
                  <option value=''>— Seleziona —</option>
                  {familyRows.map((row: any) => <option key={row.code} value={row.code}>{row.number} - {row.label}</option>)}
                </select>
              </div>
              <div className='gap-field'>
                <div className='gap-label'>Capitolo</div>
                <select className='gap-select' value={parentForm.capitolo ? pad4(parentForm.capitolo) : ''} onChange={(e) => {
                  const capitolo = e.target.value ? pad4(e.target.value) : ''
                  setParentForm((f: any) => ({ ...f, capitolo, sottocapitolo: '' }))
                }}>
                  <option value=''>— Seleziona —</option>
                  {chapterRecordsForEdit.map((row: any) => <option key={row.code} value={row.code}>{row.code}{row.label ? ` - ${row.label}` : ''}</option>)}
                </select>
              </div>
              <div className='gap-field'>
                <div className='gap-label'>Sub capitolo</div>
                <select className='gap-select' value={parentForm.sottocapitolo ? pad4(parentForm.sottocapitolo) : ''} onChange={(e) => setParentForm((f: any) => ({ ...f, sottocapitolo: e.target.value ? pad4(e.target.value) : '' }))}>
                  <option value=''>— Seleziona —</option>
                  {subchapterRecordsForEdit.map((row: any) => <option key={row.code} value={row.code}>{row.code}{row.label ? ` - ${row.label}` : ''}</option>)}
                </select>
              </div>
              <div className='gap-field'>
                <div className='gap-label'>Codice voce</div>
                <input className='gap-input gap-readonly' value={parentCodePreview} readOnly />
              </div>

              <div className='gap-field' style={{ gridColumn: '1 / span 3', minWidth: 0 }}>
                <div className='gap-muted' style={{ whiteSpace: 'nowrap' }}>Il codice sarà generato con prefisso NP usando super capitolo, capitolo e sub capitolo.</div>
              </div>

              <div className='gap-field' style={{ gridColumn: '1 / span 3' }}>
                <div className='gap-label'>Descrizione</div>
                <input className='gap-input' value={parentForm.descrizione || ''} onChange={(e) => setParentForm((f: any) => ({ ...f, descrizione: e.target.value }))} />
              </div>
              <div className='gap-field'>
                <div className='gap-label'>UM</div>
                <select
                  className={`gap-select ${parentUmError ? 'gap-error-input' : ''}`}
                  value={String(parentForm.unita_misura || '')}
                  onChange={(e) => {
                    const value = String(e.target.value || '')
                    setParentForm((f: any) => ({ ...f, unita_misura: value }))
                    setParentUmError(value ? '' : 'Seleziona una UM presente in elenco.')
                  }}
                >
                  <option value=''>-- Seleziona --</option>
                  {umOptions.map((um) => <option key={um} value={um}>{um}</option>)}
                </select>
                {parentUmError ? <div className='gap-error-text'>{parentUmError}</div> : null}
              </div>
              <div className='gap-field'>
                <div className='gap-label'>Prezzo unitario (€)</div>
                <input className={`gap-input ${normalizeModality(parentForm.modalita_voce) === 2 ? 'gap-readonly' : ''} ${parentPriceError ? 'gap-error-input' : ''}`} inputMode='decimal' value={parentForm.prezzo_unitario || ''} onChange={(e) => {
                  const value = String(e.target.value || '').replace(/\./g, ',')
                  setParentForm((f: any) => ({ ...f, prezzo_unitario: value }))
                  if (normalizeModality(parentForm.modalita_voce) !== 1) { setParentPriceError(''); return }
                  setParentPriceError('')
                }} onBlur={() => {
                  if (normalizeModality(parentForm.modalita_voce) !== 1) { setParentPriceError(''); return }
                  const trimmed = String(parentForm.prezzo_unitario || '').trim()
                  if (!trimmed) { setParentPriceError(''); return }
                  const v = validateMoneyInput(trimmed)
                  if (v.ok) {
                    setParentForm((f: any) => ({ ...f, prezzo_unitario: String(v.text || '') }))
                    setParentPriceError('')
                  } else {
                    setParentPriceError(String(v.message || 'Prezzo non valido.'))
                  }
                }} readOnly={normalizeModality(parentForm.modalita_voce) === 2} placeholder='es. 5,50' />
                {parentPriceError ? <div className='gap-error-text'>{parentPriceError}</div> : null}
              </div>
              <div className='gap-field' style={{ gridColumn: '1 / -1' }}>
                <div className='gap-label'>Note</div>
                <textarea className='gap-textarea gap-line-note' value={parentForm.note || ''} onChange={(e) => setParentForm((f: any) => ({ ...f, note: e.target.value }))} placeholder='Shift+Invio per andare a capo' />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className='gap-btn gap-primary' disabled={saving || confirmBusy || (parentForm.objectid == null && !hasConfiguredStructure)} onClick={() => void onSaveParent()}>{parentForm.objectid != null ? 'Aggiorna testata' : 'Crea Nuovo Prezzo'}</button>
              <button className='gap-btn gap-neutral' disabled={saving || confirmBusy} onClick={onCancelParent}>Annulla</button>
              {normalizeModality(parentForm.modalita_voce) === 2 ? <div className='gap-muted' style={{ alignSelf: 'center' }}>Per le voci ANALIZZATE il prezzo sarà ricalcolato dalle righe.</div> : null}
            </div>
          </div>
        )}

        {selectedParentRow && !parentEditing && (
          <div className='gap-panel'>
            <div className='gap-subtoolbar'>
              <div style={{ fontWeight: 700, color: sectionTitleColor, fontSize: sectionTitleFontSize }}>Voce {modalityLabel(selectedParentRow.modalita_voce)} - {selectedParentLabel}</div>
              <div className='gap-kpi'>Super capitolo {familyDisplay(selectedParentRow.famiglia)} · Prezzo {money(selectedParentDisplayPrice, 4)} €/{selectedParentRow.unita_misura || '—'}</div>
            </div>
          </div>
        )}

        {selectedParentRow && !parentEditing && !selectedParentActive && (
          <div className='gap-panel'>
            <div className='gap-msg gap-err'>Questo Nuovo Prezzo è disattivato. Rimane consultabile, ma non viene proposto nelle selezioni e non consente nuove righe di analisi finché non viene riattivato.</div>
          </div>
        )}

        {selectedParentRow && !parentEditing && selectedParentMode === 1 && (
          <div className='gap-panel'>
            <div className='gap-muted'>Questo Nuovo Prezzo è <b>ELEMENTARE</b>. Le righe di analisi non sono abilitate.</div>
          </div>
        )}

        {selectedParentRow && !parentEditing && selectedParentMode === 2 && (
          <Fragment>
            <div className='gap-field' style={{ marginBottom: 6 }}>
              <div className='gap-label' style={{ color: toolbarLabelColor, fontSize: toolbarLabelFontSize }}>Righe di analisi</div>
            </div>
            <div className='gap-subtoolbar' style={{ alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div><NewRecordButton onClick={onNewLine} disabled={lineEditing || parentEditing || saving || confirmBusy || !selectedParentActive} title='Nuova riga' /></div>
              <div><RecordEditButton onClick={() => selectedLineRow && onEditLine(selectedLineRow)} disabled={!selectedLineRow || lineEditing || parentEditing || saving || confirmBusy || !selectedParentActive} title='Modifica riga' ariaLabel='Modifica riga' /></div>
              <div><RecordDeleteButton onClick={() => selectedLineRow && void onDeleteLine(selectedLineRow)} disabled={!selectedLineRow || lineEditing || parentEditing || saving || confirmBusy || !selectedParentActive} title='Elimina riga' ariaLabel='Elimina riga' /></div>
            </div>

            {lineEditing && (
              <div className='gap-panel gap-detail-card gap-line-panel' ref={linePanelRef} onKeyDown={(e) => handlePanelEnterNav(e, linePanelRef.current)}>
                <div style={{ fontWeight: 700, color: sectionTitleColor, fontSize: sectionTitleFontSize, marginBottom: 10 }}>{lineForm.objectid != null ? 'Modifica riga di analisi' : 'Nuova riga di analisi'}</div>
                <div className='gap-row-grid'>
                  <div className='gap-field'>
                    <div className='gap-label'>Origine</div>
                    <select className='gap-select' value={String(normalizeOrigin(lineForm.origine_riga))} onChange={(e) => { setLookupRows([]); setLookupDropdownOpen(false); setLineForm((f: any) => ({ ...f, origine_riga: Number(e.target.value), lookupSearch: '', objectid_sorgente: '', codice_riferimento: '', descrizione: '', unita_misura: '', prezzo_unitario: '', categoria_costo: '', famiglia_sorgente: '' })) }}>
                      <option value='1'>REGIONALE</option>
                      <option value='2'>INTERNO</option>
                      <option value='3'>NUOVO PREZZO</option>
                    </select>
                  </div>
                  <div className='gap-field' style={{ gridColumn: '2 / -1' }}>
                    <div className='gap-label'>Cerca voce sorgente</div>
                    <div className='gap-clear-wrap gap-combo-wrap'>
                      <input
                        className='gap-input'
                        value={String(lineForm.lookupSearch || '')}
                        onChange={(e) => {
                          const value = String(e.target.value || '')
                          setLineForm((f: any) => ({ ...f, lookupSearch: value, ...(value !== String(f.codice_riferimento || '') ? { objectid_sorgente: '', codice_riferimento: '', descrizione: '', unita_misura: '', prezzo_unitario: '', famiglia_sorgente: '' } : {}) }))
                          setLookupDropdownOpen(true)
                        }}
                        onFocus={() => setLookupDropdownOpen(true)}
                        onBlur={() => window.setTimeout(() => setLookupDropdownOpen(false), 150)}
                        placeholder='Digita almeno 2 caratteri'
                        disabled={saving}
                      />
                      <button className='gap-clear-inside' title='Reset voce sorgente' aria-label='Reset voce sorgente' onClick={onResetLineSource} disabled={!lineForm.lookupSearch && !lineForm.codice_riferimento || saving} type='button'>×</button>
                      {lookupDropdownOpen ? (
                        <div className='gap-combo-dropdown'>
                          {lookupLoading ? <div className='gap-muted' style={{ padding: '8px' }}>Caricamento voci…</div> : null}
                          {!lookupLoading && String(lineForm.lookupSearch || '').trim().length < 2 ? <div className='gap-muted' style={{ padding: '8px' }}>Digita almeno 2 caratteri.</div> : null}
                          {!lookupLoading && String(lineForm.lookupSearch || '').trim().length >= 2 && !lookupRows.length ? <div className='gap-muted' style={{ padding: '8px' }}>Nessuna voce trovata.</div> : null}
                          {!lookupLoading && String(lineForm.lookupSearch || '').trim().length >= 2 ? lookupRows.map((r: any) => (
                            <button key={`${r.objectid}-${r.code}`} className='gap-combo-option' type='button' onMouseDown={(e) => e.preventDefault()} onClick={() => onPickLookup(r)}>{`${r.code}${String(r.description || '').trim() ? ' — ' + r.description : ''}`}</button>
                          )) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className='gap-field' style={{ gridColumn: '1 / span 2' }}>
                    <div className='gap-label'>Voce sorgente selezionata</div>
                    <input className='gap-input gap-readonly' value={lineForm.codice_riferimento || ''} readOnly />
                  </div>
                  <div className='gap-field'>
                    <div className='gap-label'>Prezzo unitario (€)</div>
                    <input className='gap-input gap-readonly' value={lineForm.prezzo_unitario || ''} readOnly />
                  </div>
                  <div className='gap-field'>
                    <div className='gap-label'>UM</div>
                    <input className='gap-input gap-readonly' value={lineForm.unita_misura || ''} readOnly />
                  </div>
                  <div className='gap-field'>
                    <div className='gap-label'>Quantità</div>
                    <input className='gap-input' inputMode='decimal' value={lineForm.quantita || ''} onChange={(e) => setLineForm((f: any) => ({ ...f, quantita: e.target.value }))} />
                  </div>
                  <div className='gap-field'>
                    <div className='gap-label'>Importo</div>
                    <input className='gap-input gap-readonly' value={money(lineImportoPreview, 4)} readOnly />
                  </div>

                  {(String(lineForm.codice_riferimento || '').trim() || String(lineForm.descrizione || '').trim()) ? (
                    <div className='gap-field' style={{ gridColumn: '1 / -1' }}>
                      <div className='gap-label'>Descrizione completa voce selezionata</div>
                      <div className='gap-lookup'>
                        <div className='gap-lookup-item' style={{ cursor: 'default' }}>
                          <div><b>{lineForm.codice_riferimento || '—'}</b>{String(lineForm.descrizione || '').trim() ? <> — {lineForm.descrizione}</> : null}</div>
                          <div className='gap-muted'>{lineForm.unita_misura || '—'} · {money(lineForm.prezzo_unitario, 4)}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className='gap-field' style={{ gridColumn: '1 / -1' }}>
                    <div className='gap-label'>Note</div>
                    <textarea className='gap-textarea gap-line-note' value={lineForm.note || ''} onChange={(e) => setLineForm((f: any) => ({ ...f, note: e.target.value }))} placeholder='Shift+Invio per andare a capo' />
                  </div>

                  <div style={{ display: 'flex', gap: 8, gridColumn: '1 / -1' }}>
                    <button className='gap-btn gap-primary' disabled={saving || confirmBusy} onClick={() => void onSaveLine()}>{lineForm.objectid != null ? 'Aggiorna' : 'Aggiungi'}</button>
                    <button className='gap-btn gap-neutral' disabled={saving || confirmBusy} onClick={onCancelLine}>Annulla</button>
                  </div>
                </div>
              </div>
            )}

            {!lineEditing && (
              <div className='gap-table-wrap'>
                <table className='gap-table'>
                  <thead>
                    <tr>
                      <th style={{ width: 56, minWidth: 56 }}>N.</th>
                      <th style={{ width: 128, minWidth: 128 }}>Origine</th>
                      <th>Codice</th>
                      <th>Descrizione</th>
                      <th>UM</th>
                      <th>Q.tà</th>
                      <th>Prezzo (€)</th>
                      <th>Importo</th>
                      <th>Ordina</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>{loading ? 'Caricamento…' : 'Nessuna riga di analisi.'}</td></tr>
                    ) : rows.map((r: any, idx: number) => (
                      <tr
                        key={r.objectid}
                        className={`${Number(selectedLineId || 0) === Number(r.objectid || 0) ? 'gap-row-selected ' : ''}gap-row-clickable`}
                        onClick={() => {
                          if (lineEditing || parentEditing) return
                          const clickedId = Number(r.objectid || 0) || null
                          setSelectedLineId((prev) => (Number(prev || 0) === Number(clickedId || 0) ? null : clickedId))
                        }}
                      >
                        <td><b>{Math.max(1, Math.trunc(num(r.ordine)) || (idx + 1))}</b></td>
                        <td style={{ whiteSpace: 'nowrap', minWidth: 128 }}>{originLabel(r.origine_riga)}</td>
                        <td><b>{r.codice_riferimento}</b></td>
                        <td>{r.descrizione}</td>
                        <td>{r.unita_misura}</td>
                        <td>{money(r.quantita, 4)}</td>
                        <td>{money(r.prezzo_unitario, 4)}</td>
                        <td>{money(r.importo, 4)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button className='gap-btn gap-neutral gap-btn-icon' title='Sposta su' aria-label='Sposta su' onClick={(e) => { e.stopPropagation(); void onMoveLine(r, -1) }} disabled={saving || confirmBusy || !selectedParentActive || idx === 0}>↑</button>
                          <button className='gap-btn gap-neutral gap-btn-icon' title='Sposta giù' aria-label='Sposta giù' onClick={(e) => { e.stopPropagation(); void onMoveLine(r, 1) }} disabled={saving || confirmBusy || !selectedParentActive || idx === rows.length - 1}>↓</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Fragment>
        )}
        {confirmState && (
          <div className='gap-confirm-backdrop'>
            <div className='gap-confirm-modal'>
              <div className='gap-confirm-title'>{confirmState.title}</div>
              <div className='gap-confirm-text'>{confirmState.text}</div>
              <div className='gap-confirm-actions'>
                <button className='gap-btn gap-neutral' type='button' disabled={confirmBusy} onClick={closeConfirm}>Annulla</button>
                <button className={`gap-btn ${confirmState.confirmClass || 'gap-primary'}`} type='button' disabled={confirmBusy} onClick={() => void runConfirm()}>{confirmBusy ? 'Attendere…' : confirmState.confirmLabel}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  )
}

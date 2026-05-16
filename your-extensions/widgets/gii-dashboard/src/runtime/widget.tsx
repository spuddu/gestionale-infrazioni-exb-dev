/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import { defaultConfig, type IMConfig } from '../config'

type RuntimeDsView = {
  key: string
  viewName: string
  itemId: string
  serviceUrl: string
  layerUrl: string
  roles: string[]
  areaCode: 'AMM' | 'AGR' | 'TEC' | ''
  settoreCode: string
}

type GiiUserInfo = {
  username: string
  fullName?: string
  full_name?: string
  nome?: string
  displayName?: string
  ruolo: number | null
  ruoloLabel: string
  ruoloCod: string
  ruoloFull?: string
  profiloCod?: string
  profiloLabel?: string
  area: number | null
  areaCod: 'AMM' | 'AGR' | 'TEC' | ''
  areaFull?: string
  settore: number | null
  settoreCod: string
  settoreFull?: string
  ufficioLabel?: string
  gruppo?: string
  isAdmin: boolean
  isWorkflowAdmin?: boolean
}

type DashRecord = Record<string, any>

type Metric = {
  id: string
  label: string
  value: number
  hint: string
  icon: string
}

type RecentSortKey = 'numeroRapporto' | 'comune' | 'fase' | 'lastUpdate'
type SortDir = 'asc' | 'desc'
type RecentSortRule = { key: RecentSortKey; dir: SortDir }

const DEFAULT_RECENT_SORT_RULES: RecentSortRule[] = [{ key: 'lastUpdate', dir: 'desc' }]

const RUOLO_LABEL: Record<number, string> = { 1: 'TR', 2: 'TI', 3: 'RZ', 4: 'RI', 5: 'DT', 6: 'DA', 7: 'ADMIN' }
const AREA_FROM_CODE: Record<number, string> = { 1: 'AMM', 2: 'AGR', 3: 'TEC' }
const SETTORE_FROM_CODE: Record<number, string> = { 1: 'CR', 2: 'GI', 3: 'D1', 4: 'D2', 5: 'D3', 6: 'D4', 7: 'D5', 8: 'D6', 9: 'DS' }

const GII_RUNTIME_VIEWS: RuntimeDsView[] = [
  {
    key: 'ADMIN',
    viewName: 'GII_VIEW_EB_ADMIN',
    itemId: 'c05409cf4a86471194d6406e9b4d1c65',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_BASE/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_BASE/FeatureServer/0',
    roles: ['ADMIN'],
    areaCode: '',
    settoreCode: ''
  },
  {
    key: 'AGR_ALL',
    viewName: 'GII_VIEW_EB_AGR',
    itemId: '777c4456f6104e779e6a02e5875f67c1',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR/FeatureServer/0',
    roles: ['RI', 'DT'],
    areaCode: 'AGR',
    settoreCode: ''
  },
  {
    key: 'AGR_D1',
    viewName: 'GII_VIEW_EB_AGR_D1',
    itemId: '3d0899eb7f684698862c1bc590c19d7f',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D1/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D1/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D1'
  },
  {
    key: 'AGR_D2',
    viewName: 'GII_VIEW_EB_AGR_D2',
    itemId: 'f428036dac9e41458f67c1da32efddd5',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D2/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D2/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D2'
  },
  {
    key: 'AGR_D3',
    viewName: 'GII_VIEW_EB_AGR_D3',
    itemId: 'efc0f9aa9d0e4862a87152cd482c2722',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D3/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D3/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D3'
  },
  {
    key: 'AGR_D4',
    viewName: 'GII_VIEW_EB_AGR_D4',
    itemId: 'c724a0cd50b14743a4595313c2afd39a',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D4/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D4/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D4'
  },
  {
    key: 'AGR_D5',
    viewName: 'GII_VIEW_EB_AGR_D5',
    itemId: 'b3405424a8f841648cca63a429991c03',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D5/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D5/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D5'
  },
  {
    key: 'AGR_D6',
    viewName: 'GII_VIEW_EB_AGR_D6',
    itemId: 'f8671e4e6d804735a5a8c0279b7396be',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D6/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AGR_D6/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'AGR',
    settoreCode: 'D6'
  },
  {
    key: 'AMM_ALL',
    viewName: 'GII_VIEW_EB_AMM_ALL',
    itemId: '6ffe45dac0e04905ba677e9fcd703238',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AMM_ALL/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_AMM_ALL/FeatureServer/0',
    roles: ['RI', 'TI', 'DA', 'RI_AMM', 'TI_AMM'],
    areaCode: 'AMM',
    settoreCode: ''
  },
  {
    key: 'TEC_ALL',
    viewName: 'GII_VIEW_EB_TEC',
    itemId: '8687bad031ef4de6bd3c8151de8f8cc6',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC/FeatureServer/0',
    roles: ['RI', 'DT'],
    areaCode: 'TEC',
    settoreCode: ''
  },
  {
    key: 'TEC_DS',
    viewName: 'GII_VIEW_EB_TEC_DS',
    itemId: '32b0d7b27c154a969eff411826a473af',
    serviceUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC_DS/FeatureServer',
    layerUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_TEC_DS/FeatureServer/0',
    roles: ['TI', 'RZ'],
    areaCode: 'TEC',
    settoreCode: 'DS'
  }
]

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

function cleanCode (v: any): string {
  return String(v ?? '').trim().toUpperCase()
}

function normalizeRuoloCode (ruoloCod: any, ruolo: number | null | undefined, isAdmin?: boolean): string {
  const raw = cleanCode(ruoloCod)
  if (raw) {
    if (/^\d+$/.test(raw)) return RUOLO_LABEL[Number(raw)] || raw
    return raw
  }
  if (ruolo != null && Number.isFinite(Number(ruolo))) return RUOLO_LABEL[Number(ruolo)] || ''
  return isAdmin ? 'ADMIN' : ''
}

function normalizeAreaCode (areaCod: any, area?: number | null | undefined): 'AMM' | 'AGR' | 'TEC' | '' {
  const raw = cleanCode(areaCod)
  if (raw === 'AMM' || raw === 'AGR' || raw === 'TEC') return raw
  if (/^\d+$/.test(raw)) return normalizeAreaCode('', Number(raw))
  if (area === 1) return 'AMM'
  if (area === 2) return 'AGR'
  if (area === 3) return 'TEC'
  return ''
}

function normalizeSettoreCode (settoreCod: any, settore?: number | null | undefined): string {
  const raw = cleanCode(settoreCod)
  if (raw) {
    if (raw === 'CS') return 'DS'
    if (/^\d+$/.test(raw)) return SETTORE_FROM_CODE[Number(raw)] || raw
    return raw
  }
  if (settore == null) return ''
  return SETTORE_FROM_CODE[Number(settore)] || String(settore || '')
}

function getEffectiveRole (ruoloLabel: string, areaCode: 'AMM' | 'AGR' | 'TEC' | ''): string {
  const r = cleanCode(ruoloLabel)
  if (r === 'RI' && areaCode === 'AMM') return 'RI_AMM'
  if (r === 'TI' && areaCode === 'AMM') return 'TI_AMM'
  return r
}

function pickRuntimeViewForUser (user: GiiUserInfo | null): RuntimeDsView | null {
  if (!user) return null
  const role = cleanCode(user.ruoloCod || user.ruoloLabel)
  const areaCode = user.areaCod || normalizeAreaCode('', user.area)
  const settoreCode = user.settoreCod || normalizeSettoreCode('', user.settore)
  if (user.isAdmin || user.isWorkflowAdmin || role === 'ADMIN') {
    return GII_RUNTIME_VIEWS.find(v => v.key === 'ADMIN') || null
  }
  const effective = getEffectiveRole(role, areaCode)
  const strict = GII_RUNTIME_VIEWS.find(v =>
    v.roles.includes(effective) &&
    v.areaCode === areaCode &&
    (v.settoreCode ? v.settoreCode === settoreCode : true)
  )
  if (strict) return strict
  return GII_RUNTIME_VIEWS.find(v => v.roles.includes(effective) && v.areaCode === areaCode && !v.settoreCode) || null
}

function readGiiUser (): GiiUserInfo | null {
  const cached: any = (window as any).__giiUserRole
  if (!cached?.username) return null
  const ruolo = cached.ruolo != null && cached.ruolo !== '' ? Number(cached.ruolo) : null
  const isAdminRaw = !!cached.isAdmin || !!cached.isWorkflowAdmin || ruolo === 7 || cleanCode(cached.ruoloCod || cached.ruolo_cod || cached.ruoloLabel) === 'ADMIN'
  const ruoloCod = normalizeRuoloCode(cached.ruoloCod ?? cached.ruolo_cod ?? cached.ruoloLabel, ruolo, isAdminRaw)
  const isAdmin = isAdminRaw || ruoloCod === 'ADMIN'
  const area = cached.area != null && cached.area !== '' ? Number(cached.area) : null
  const settore = cached.settore != null && cached.settore !== '' ? Number(cached.settore) : null
  const areaCod = normalizeAreaCode(cached.areaCod ?? cached.area_cod, area)
  const settoreCod = normalizeSettoreCode(cached.settoreCod ?? cached.settore_cod, settore)
  return {
    username: String(cached.username || '').trim(),
    fullName: String(cached.fullName || cached.full_name || cached.nome || cached.displayName || cached.username || '').trim(),
    full_name: String(cached.full_name || cached.fullName || '').trim(),
    nome: String(cached.nome || '').trim(),
    displayName: String(cached.displayName || '').trim(),
    ruolo,
    ruoloLabel: ruoloCod,
    ruoloCod,
    ruoloFull: String(cached.ruoloFull || cached.ruolo_full || '').trim(),
    profiloCod: String(cached.profiloCod || cached.profilo_cod || '').trim(),
    profiloLabel: String(cached.profiloLabel || cached.profilo_label || '').trim(),
    area,
    areaCod,
    areaFull: String(cached.areaFull || cached.area_full || '').trim(),
    settore,
    settoreCod,
    settoreFull: String(cached.settoreFull || cached.settore_full || '').trim(),
    ufficioLabel: String(cached.ufficioLabel || cached.ufficio_label || '').trim(),
    gruppo: String(cached.gruppo || ''),
    isAdmin,
    isWorkflowAdmin: !!cached.isWorkflowAdmin
  }
}

function getStatoFieldForRuolo (ruoloLabel: string): string {
  const r = ruoloLabel.toUpperCase()
  if (r === 'TR') return 'stato_TR'
  if (r === 'TI') return 'stato_TI'
  if (r === 'RZ') return 'stato_RZ'
  if (r === 'RI') return 'stato_RI'
  if (r === 'DT') return 'stato_DT'
  if (r === 'DA') return 'stato_DA'
  if (r === 'RI_AMM') return 'stato_RI_AMM'
  if (r === 'TI_AMM') return 'stato_TI_AMM'
  return 'stato_DT'
}

function equalsUser (a: any, b: any): boolean {
  const sa = String(a ?? '').trim().toLowerCase()
  const sb = String(b ?? '').trim().toLowerCase()
  return !!sa && !!sb && sa === sb
}

function hasRuoloData (d: any, role: string): boolean {
  const p = d[`presa_in_carico_${role}`]
  const s = d[`stato_${role}`]
  const e = d[`esito_${role}`]
  return (p !== null && p !== undefined && p !== '') ||
    (s !== null && s !== undefined && s !== '') ||
    (e !== null && e !== undefined && e !== '')
}

function meaningful (v: any): boolean {
  return v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0'
}

function isInFaseSanzionatoria (d: any): boolean {
  return meaningful(d['stato_RI_AMM']) || meaningful(d['esito_RI_AMM']) ||
    meaningful(d['stato_TI_AMM']) || meaningful(d['esito_TI_AMM']) ||
    meaningful(d['stato_DA']) || meaningful(d['esito_DA'])
}

function parseToMs (v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v > 100000000000 ? v : v * 1000
  const t = Date.parse(String(v))
  return Number.isFinite(t) ? t : null
}

function getRoleLastTouchMs (d: any, role: string): number | null {
  const vals = [
    parseToMs(d[`dt_presa_in_carico_${role}`]),
    parseToMs(d[`dt_stato_${role}`]),
    parseToMs(d[`dt_esito_${role}`])
  ].filter((v): v is number => v !== null)
  return vals.length ? Math.max(...vals) : null
}

function getLastTouchMs (d: any): number | null {
  const candidates: Array<number | null> = [
    parseToMs(d['dt_ultimo_passaggio']),
    parseToMs(d['EditDate_1']),
    parseToMs(d['EditDate']),
    parseToMs(d['CreationDate_1']),
    parseToMs(d['CreationDate'])
  ]
  ;['DA', 'TI_AMM', 'RI_AMM', 'DT', 'RI', 'RZ', 'TI', 'TR'].forEach(r => candidates.push(getRoleLastTouchMs(d, r)))
  const vals = candidates.filter((v): v is number => v !== null)
  return vals.length ? Math.max(...vals) : null
}

function getTiIstruttoriaInfo (d: any) {
  const tiUser = String(d['ti_assegnato_username'] ?? d['ti_assegnato_user'] ?? d['ti_assegnato'] ?? '').trim()
  const higherTouched = hasRuoloData(d, 'RI') || hasRuoloData(d, 'DT') || hasRuoloData(d, 'DA')
  const statoTiRaw = d['stato_TI'] ?? d['stato_ti']
  const esitoTiRaw = d['esito_TI'] ?? d['esito_ti']
  const statoTiNum = statoTiRaw !== null && statoTiRaw !== undefined && statoTiRaw !== '' ? Number(statoTiRaw) : null
  const esitoTiNum = esitoTiRaw !== null && esitoTiRaw !== undefined && esitoTiRaw !== '' ? Number(esitoTiRaw) : null
  const tiReturned = (esitoTiNum !== null && Number.isFinite(esitoTiNum)) || statoTiNum === 4 || statoTiNum === 5
  return { isInTiIstruttoria: !!tiUser && !higherTouched && !tiReturned }
}

function isRecordVisibleForCurrentUser (d: any, user: GiiUserInfo | null): boolean {
  if (!user) return false
  if (user.isAdmin || user.isWorkflowAdmin) return true

  const role = getEffectiveRole(user.ruoloCod || user.ruoloLabel || '', user.areaCod)
  if (!role) return true

  const archVal = d['GII_arch'] ?? d['gii_arch'] ?? d['GII_ARCH']
  if (archVal !== null && archVal !== undefined && archVal !== '' && Number(archVal) === 1) return false

  const isAmmArea = user.areaCod === 'AMM'
  if (role === 'DA' || role === 'RI_AMM' || role === 'TI_AMM' || (isAmmArea && (role === 'RI' || role === 'TI'))) {
    if (!isInFaseSanzionatoria(d)) return false
    if (role === 'TI_AMM') {
      const meUser = String(user.username || '').trim()
      const meName = String(user.fullName ?? user.nome ?? user.displayName ?? '').trim()
      const tiAmmUser = String(d['ti_amm_assegnato_username'] ?? d['ti_amm_assegnato_user'] ?? d['ti_amm_assegnato'] ?? '').trim()
      const tiAmmName = String(d['ti_amm_assegnato_nome'] ?? d['ti_amm_assegnato_name'] ?? '').trim()
      if (!tiAmmUser && !tiAmmName) return false
      return equalsUser(tiAmmUser, meUser) || equalsUser(tiAmmName, meUser) || (meName ? equalsUser(tiAmmName, meName) : false)
    }
    return true
  }

  if (role === 'TI') {
    const meUser = String(user.username || '').trim()
    const meName = String(user.fullName ?? user.nome ?? user.displayName ?? '').trim()
    const opRaw = d['origine_pratica']
    const opNum = opRaw !== null && opRaw !== undefined && opRaw !== '' ? Number(opRaw) : null
    const tiUser = String(d['ti_assegnato_username'] ?? d['ti_assegnato_user'] ?? d['ti_assegnato'] ?? '').trim()
    const tiName = String(d['ti_assegnato_nome'] ?? d['ti_assegnato_name'] ?? '').trim()
    const assignedToMe = equalsUser(tiUser, meUser) || equalsUser(tiName, meUser) || (meName ? equalsUser(tiName, meName) : false)
    const creatorVals = [d['created_user'], d['Creator'], d['creator'], d['username'], d['user_name'], d['utente'], d['utente_ins'], d['created_by'], d['submitter'], d['owner']]
    const createdByMe = creatorVals.some(v => equalsUser(v, meUser) || (meName ? equalsUser(v, meName) : false))
    const hasTiWorkflow = hasRuoloData(d, 'TI')

    if (opNum === 1) {
      if (!tiUser && !tiName && !hasTiWorkflow) return false
      if (tiUser || tiName) return assignedToMe
      return false
    }
    if (opNum === 2) {
      if (tiUser || tiName) return assignedToMe
      if (createdByMe) return true
      return hasTiWorkflow
    }
  }

  return true
}

function isWaitingForTiAmmAfterRiAmm (d: any): boolean {
  const riAmmLast = getRoleLastTouchMs(d, 'RI_AMM')
  const tiAmmLast = getRoleLastTouchMs(d, 'TI_AMM')
  return hasRuoloData(d, 'TI_AMM') && (
    tiAmmLast === null || riAmmLast === null || tiAmmLast > riAmmLast
  )
}

function isAttesaMia (d: any, user: GiiUserInfo | null): boolean {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return false
  const role = getEffectiveRole(user.ruoloCod || user.ruoloLabel || '', user.areaCod)
  const statoField = getStatoFieldForRuolo(role)
  const val = d[statoField]
  const n = val != null && val !== '' ? Number(val) : null

  if ((role === 'TI' || role === 'TI_AMM') && n === 2) {
    const meUser = String(user.username || '').trim()
    const meName = String(user.fullName ?? user.nome ?? user.displayName ?? '').trim()
    const tiUser = role === 'TI_AMM'
      ? String(d['ti_amm_assegnato_username'] ?? d['ti_amm_assegnato_user'] ?? d['ti_amm_assegnato'] ?? '').trim()
      : String(d['ti_assegnato_username'] ?? d['ti_assegnato_user'] ?? d['ti_assegnato'] ?? '').trim()
    const tiName = role === 'TI_AMM'
      ? String(d['ti_amm_assegnato_nome'] ?? d['ti_amm_assegnato_name'] ?? '').trim()
      : String(d['ti_assegnato_nome'] ?? d['ti_assegnato_name'] ?? '').trim()
    return equalsUser(tiUser, meUser) || equalsUser(tiName, meUser) || (meName ? equalsUser(tiName, meName) : false)
  }

  if (role === 'RI_AMM' && n === 2) return !isWaitingForTiAmmAfterRiAmm(d)
  if (role === 'RZ' && getTiIstruttoriaInfo(d).isInTiIstruttoria) return false
  return n === 0 || n === 1 || n === 3
}

function isAttesaAltri (d: any, user: GiiUserInfo | null): boolean {
  if (!user || user.isAdmin || user.isWorkflowAdmin) return false
  const role = getEffectiveRole(user.ruoloCod || user.ruoloLabel || '', user.areaCod)
  const statoField = getStatoFieldForRuolo(role)
  const val = d[statoField]
  const n = val != null && val !== '' ? Number(val) : null
  if (role === 'RZ' && getTiIstruttoriaInfo(d).isInTiIstruttoria) return true
  if ((role === 'TI' || role === 'TI_AMM') && n === 2) return !isAttesaMia(d, user)
  if (role === 'RI_AMM' && n === 2) return isWaitingForTiAmmAfterRiAmm(d)
  return n === 2 || n === 4
}

function getActiveRole (d: any): string {
  const roles = ['DA', 'TI_AMM', 'RI_AMM', 'DT', 'RI', 'RZ', 'TI', 'TR']
  for (const r of roles) if (hasRuoloData(d, r)) return r
  return 'N/D'
}

function faseLabel (role: string): string {
  const r = String(role || '').trim().toUpperCase()
  if (r === 'TR' || r === 'TI' || r === 'RZ' || r === 'RI') return 'Istruttoria tecnica'
  if (r === 'DT') return 'Approvazione tecnica'
  if (r === 'RI_AMM' || r === 'TI_AMM' || r === 'DA') return 'Istruttoria amministrativa'
  return 'Non determinata'
}

function ruoloOperativoLabel (role: string): string {
  const r = String(role || '').trim().toUpperCase()
  if (r === 'TR') return 'Tecnico rilevatore'
  if (r === 'TI') return 'Tecnico istruttore'
  if (r === 'RZ') return 'Responsabile di zona'
  if (r === 'RI') return 'Responsabile istruttoria'
  if (r === 'DT') return 'Direttore tecnico'
  if (r === 'TI_AMM') return 'Tecnico istruttore amministrativo'
  if (r === 'RI_AMM') return 'Responsabile istruttoria amministrativo'
  if (r === 'DA') return 'Direttore amministrativo'
  if (r === 'ADMIN') return 'Amministratore'
  return 'Non determinato'
}

function getFirst (d: any, names: string[], fallback = '—'): string {
  for (const n of names) {
    const v = d[n]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return fallback
}

function getObjectId (d: any): string {
  return getFirst(d, ['OBJECTID', 'objectid', 'ObjectId', 'objectId', 'FID'], '—')
}

function getNumeroRapporto (d: any): string {
  const stored = getFirst(d, [
    'cod_pratica', 'Cod_pratica', 'COD_PRATICA',
    'numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO',
    'num_rapporto', 'Num_rapporto', 'NUM_RAPPORTO',
    'n_rapporto', 'N_rapporto', 'N_RAPPORTO'
  ], '')
  if (stored) return stored
  const oid = getObjectId(d)
  if (!oid || oid === '—') return '—'
  const opRaw = d['origine_pratica'] ?? d['Origine_pratica'] ?? d['ORIGINE_PRATICA']
  const op = String(opRaw ?? '').trim().toUpperCase()
  let prefix = 'TR'
  if (op === '2' || op === 'TI') prefix = 'TI'
  else if (op === '1' || op === 'TR') prefix = 'TR'
  return `${prefix}-${oid}`
}

function getComune (d: any): string {
  return getFirst(d, ['comune', 'Comune', 'COMUNE'], '—')
}

function statoLabel (v: any): string {
  const n = v !== null && v !== undefined && v !== '' ? Number(v) : null
  if (n === 0 || n === 1) return 'Da prendere in carico'
  if (n === 2) return 'Presa in carico / in lavorazione'
  if (n === 3) return 'Integrazione richiesta'
  if (n === 4) return 'Trasmessa / completata'
  if (n === 5) return 'Respinta'
  return 'Non valorizzato'
}

async function queryLayer (view: RuntimeDsView, where: string, pageSize: number): Promise<DashRecord[]> {
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const layer = new FeatureLayer({ url: view.layerUrl, outFields: ['*'] })
  if (typeof layer.load === 'function') {
    try { await layer.load() } catch {}
  }
  const res = await layer.queryFeatures({
    where: where || '1=1',
    outFields: ['*'],
    returnGeometry: false,
    num: pageSize || 2000
  })
  return (res?.features || []).map((f: any) => f?.attributes || {})
}

function BarRow (props: { label: string; value: number; total: number; accent: string; muted: string }) {
  const pct = props.total > 0 ? Math.round((props.value / props.total) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: props.muted, marginBottom: 4 }}>
        <span>{props.label}</span>
        <strong style={{ color: '#fff' }}>{props.value}</strong>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: props.accent }} />
      </div>
    </div>
  )
}

function MetricCard (props: { m: Metric; cfg: any }) {
  return (
    <div style={{
      background: props.cfg.cardBg,
      border: `1px solid ${props.cfg.cardBorder}`,
      borderRadius: 16,
      padding: '16px 18px',
      minHeight: 112,
      boxShadow: '0 10px 30px rgba(0,0,0,0.14)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ color: props.cfg.mutedColor, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{props.m.label}</div>
        <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.09)' }}>{props.m.icon}</div>
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, color: props.cfg.textColor, marginTop: 8, lineHeight: 1 }}>{props.m.value}</div>
      <div style={{ color: props.cfg.mutedColor, fontSize: 12, marginTop: 8, lineHeight: 1.35 }}>{props.m.hint}</div>
    </div>
  )
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfgSrc: any = props.config as any
  const cfg: any = {
    ...defaultConfig,
    ...(cfgSrc?.asMutable ? cfgSrc.asMutable({ deep: true }) : cfgSrc?.toJS ? cfgSrc.toJS() : (cfgSrc || {}))
  }
  const [user, setUser] = React.useState<GiiUserInfo | null>(() => readGiiUser())
  const [records, setRecords] = React.useState<DashRecord[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string>('')
  const [lastLoad, setLastLoad] = React.useState<number | null>(null)
  const [nonce, setNonce] = React.useState(0)
  const [hoveredRecentRowId, setHoveredRecentRowId] = React.useState('')
  const [selectedRecentRowId, setSelectedRecentRowId] = React.useState('')
  const [recentPage, setRecentPage] = React.useState(1)
  const [recentSortRules, setRecentSortRules] = React.useState<RecentSortRule[]>(DEFAULT_RECENT_SORT_RULES)

  React.useEffect(() => {
    const hUser = () => setUser(readGiiUser())
    const hRefresh = () => setNonce(n => n + 1)
    window.addEventListener('gii:userLoaded', hUser as any)
    window.addEventListener('gii-force-refresh-selection', hRefresh as any)
    window.addEventListener('gii-dashboard-refresh', hRefresh as any)
    return () => {
      window.removeEventListener('gii:userLoaded', hUser as any)
      window.removeEventListener('gii-force-refresh-selection', hRefresh as any)
      window.removeEventListener('gii-dashboard-refresh', hRefresh as any)
    }
  }, [])

  const view = React.useMemo(() => pickRuntimeViewForUser(user), [user?.username, user?.ruoloCod, user?.areaCod, user?.settoreCod, user?.ruoloLabel, user?.area, user?.settore, user?.isAdmin, user?.isWorkflowAdmin])
  const effectiveRole = getEffectiveRole(user?.ruoloCod || user?.ruoloLabel || '', user?.areaCod || '')

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      setError('')
      if (!user?.username) {
        setRecords([])
        return
      }
      if (!view) {
        setRecords([])
        setError('Non è stato possibile individuare le pratiche di competenza.')
        return
      }
      setLoading(true)
      try {
        const raw = await queryLayer(view, cfg.whereClause || '1=1', Number(cfg.pageSize || 2000))
        if (cancelled) return
        const visible = raw.filter(r => isRecordVisibleForCurrentUser(r, user))
        setRecords(visible)
        setLastLoad(Date.now())
      } catch (ex: any) {
        if (cancelled) return
        setRecords([])
        setError(String(ex?.message || ex || 'Errore caricamento dashboard'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [view?.layerUrl, user?.username, user?.ruoloCod, user?.areaCod, user?.settoreCod, user?.ruoloLabel, user?.area, user?.settore, user?.isAdmin, cfg.whereClause, cfg.pageSize, nonce])

  const staleMs = Math.max(1, Number(cfg.staleDays || 15)) * 24 * 60 * 60 * 1000
  const now = Date.now()
  const attesaMia = records.filter(r => isAttesaMia(r, user)).length
  const attesaAltri = records.filter(r => isAttesaAltri(r, user)).length
  const sanz = records.filter(r => isInFaseSanzionatoria(r)).length
  const ferme = records.filter(r => {
    const last = getLastTouchMs(r)
    return last !== null && (now - last) > staleMs
  }).length
  const daPrendere = records.filter(r => {
    const statoField = user ? getStatoFieldForRuolo(effectiveRole) : ''
    const v = statoField ? r[statoField] : null
    const n = v !== null && v !== undefined && v !== '' ? Number(v) : null
    return n === 0 || n === 1
  }).length

  const byFase = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) {
      const k = faseLabel(getActiveRole(r))
      map.set(k, (map.get(k) || 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [records])

  const byRole = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) {
      const k = ruoloOperativoLabel(getActiveRole(r))
      map.set(k, (map.get(k) || 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [records])

  const byStatus = React.useMemo(() => {
    if (!user || user.isAdmin || user.isWorkflowAdmin) return [] as Array<[string, number]>
    const statoField = getStatoFieldForRuolo(effectiveRole)
    const map = new Map<string, number>()
    for (const r of records) {
      const k = statoLabel(r[statoField])
      map.set(k, (map.get(k) || 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [records, user?.username, user?.ruoloCod, user?.areaCod, user?.ruoloLabel, user?.area])

  const recent = React.useMemo(() => {
    const recentBase = [...records]
      .map(r => ({ r, t: getLastTouchMs(r) || 0 }))
      .sort((a, b) => b.t - a.t)

    const getSortValue = (row: { r: DashRecord; t: number }, key: RecentSortKey): any => {
      if (key === 'numeroRapporto') return getNumeroRapporto(row.r)
      if (key === 'comune') return getComune(row.r)
      if (key === 'fase') return faseLabel(getActiveRole(row.r))
      if (key === 'lastUpdate') return row.t || 0
      return ''
    }

    const rules = recentSortRules.length ? recentSortRules : DEFAULT_RECENT_SORT_RULES
    return recentBase.sort((a, b) => {
      for (const rule of rules) {
        const dir = rule.dir === 'asc' ? 1 : -1
        const av = getSortValue(a, rule.key)
        const bv = getSortValue(b, rule.key)
        const cmp = (typeof av === 'string' || typeof bv === 'string')
          ? String(av || '').localeCompare(String(bv || ''), 'it', { numeric: true, sensitivity: 'base' })
          : ((av || 0) - (bv || 0))
        if (cmp !== 0) return cmp * dir
      }
      return (b.t || 0) - (a.t || 0)
    })
  }, [records, recentSortRules])

  React.useEffect(() => {
    if (!selectedRecentRowId) return
    if (!recent.some(({ r }) => getObjectId(r) === selectedRecentRowId)) setSelectedRecentRowId('')
  }, [recent, selectedRecentRowId])

  React.useEffect(() => {
    setRecentPage(1)
  }, [records.length, recentSortRules])

  const recentRowsPerPage = Math.max(1, Number((cfg as any).tableRows || 25))
  const recentPageCount = Math.max(1, Math.ceil(recent.length / recentRowsPerPage))
  const safeRecentPage = Math.min(Math.max(1, recentPage), recentPageCount)
  const recentPageRows = recent.slice((safeRecentPage - 1) * recentRowsPerPage, safeRecentPage * recentRowsPerPage)

  React.useEffect(() => {
    if (recentPage !== safeRecentPage) setRecentPage(safeRecentPage)
  }, [recentPage, safeRecentPage])

  const isDefaultRecentSort = recentSortRules.length === 1 && recentSortRules[0].key === 'lastUpdate' && recentSortRules[0].dir === 'desc'

  const handleRecentSortHeaderClick = (key: RecentSortKey) => {
    setRecentSortRules(current => {
      const hasOnlyDefault = current.length === 1 && current[0].key === 'lastUpdate' && current[0].dir === 'desc'
      const base = current.length ? current : DEFAULT_RECENT_SORT_RULES
      const effectiveBase = hasOnlyDefault && key !== 'lastUpdate' ? [] : base
      const index = effectiveBase.findIndex(rule => rule.key === key)

      if (index >= 0) {
        const activeRule = effectiveBase[index]

        // L'ordinamento predefinito è già "Ultimo aggiornamento ▼".
        // Se l'utente clicca per prima cosa quella intestazione, deve comunque vedere
        // un cambio reale: passiamo quindi ad "Ultimo aggiornamento ▲" invece di
        // rimuovere la regola e tornare visivamente allo stesso ordinamento.
        if (hasOnlyDefault && key === 'lastUpdate' && activeRule.dir === 'desc') {
          return [{ key: 'lastUpdate', dir: 'asc' }]
        }

        if (activeRule.dir === 'asc') {
          const next = [...effectiveBase]
          next[index] = { ...activeRule, dir: 'desc' }
          return next
        }

        const next = effectiveBase.filter((_, i) => i !== index)
        return next.length ? next : DEFAULT_RECENT_SORT_RULES
      }

      return [...effectiveBase, { key, dir: 'asc' }]
    })
  }

  const recentTh = (label: string, key: RecentSortKey, align: 'left' | 'center' | 'right' = 'left') => {
    const activeIndex = recentSortRules.findIndex(rule => rule.key === key)
    const activeRule = activeIndex >= 0 ? recentSortRules[activeIndex] : null
    const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
    return (
      <th
        style={{ padding: '9px 7px', color: activeRule ? cfg.textColor : cfg.mutedColor, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${cfg.cardBorder}`, cursor: 'pointer', whiteSpace: 'normal', lineHeight: 1.15, verticalAlign: 'bottom', textAlign: align, userSelect: 'none' }}
        onClick={() => handleRecentSortHeaderClick(key)}
        title='Ordina / aggiungi all’ordinamento multiplo'
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: justify, gap: 4, width: '100%', minWidth: 0 }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          {activeRule && (
            <span aria-hidden='true' style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0, color: cfg.accentColor, fontSize: 10, fontWeight: 900, lineHeight: 1 }}>
              <span style={{ display: 'inline-block', transform: activeRule.dir === 'asc' ? 'translateY(-1px)' : 'translateY(1px)' }}>{activeRule.dir === 'asc' ? '▲' : '▼'}</span>
              <span style={{ minWidth: 12, height: 12, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', fontSize: 8.5, fontWeight: 900, background: cfg.accentColor, color: '#111827' }}>{activeIndex + 1}</span>
            </span>
          )}
        </span>
      </th>
    )
  }

  const metrics: Metric[] = [
    { id: 'tot', label: 'Pratiche di competenza', value: records.length, hint: 'Totale delle pratiche incluse nel quadro operativo.', icon: '📁' },
    { id: 'mia', label: 'Da gestire', value: attesaMia, hint: 'Pratiche che richiedono un intervento diretto.', icon: '🎯' },
    { id: 'altri', label: 'In attesa di altri', value: attesaAltri, hint: 'Pratiche già inoltrate e attualmente in lavorazione presso altri uffici o ruoli.', icon: '⏳' },
    { id: 'da_prendere', label: 'Da prendere in carico', value: daPrendere, hint: 'Pratiche ancora da avviare nella fase corrente.', icon: '📥' },
    { id: 'ferme', label: `Ferme da > ${Number(cfg.staleDays || 15)} gg`, value: ferme, hint: 'Pratiche senza aggiornamenti oltre la soglia impostata.', icon: '⚠️' },
    { id: 'sanz', label: 'Fase sanzionatoria', value: sanz, hint: 'Pratiche trasmesse o avviate alla fase amministrativa.', icon: '⚖️' }
  ]

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', color: cfg.textColor, boxSizing: 'border-box', padding: 16 }}>
      <div style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: cfg.panelBg,
        border: `1px solid ${cfg.cardBorder}`,
        borderRadius: 22,
        padding: 16,
        boxShadow: '0 18px 60px rgba(0,0,0,0.22)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ color: cfg.mutedColor, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{cfg.subtitle || 'Quadro sintetico delle pratiche di competenza.'}</div>
            {lastLoad && <div style={{ color: cfg.mutedColor, fontSize: 12, whiteSpace: 'nowrap' }}>Ultimo aggiornamento: {new Date(lastLoad).toLocaleString('it-IT')}</div>}
            {cfg.showTechnicalInfo && view && <div style={{ color: cfg.mutedColor, fontSize: 12, whiteSpace: 'nowrap' }}>Ambito dati: {view.viewName}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button onClick={() => setNonce(n => n + 1)} style={{ border: `1px solid ${cfg.cardBorder}`, background: 'rgba(255,255,255,0.08)', color: cfg.textColor, borderRadius: 12, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Aggiorna</button>
          </div>
        </div>

        {loading && <div style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'rgba(255,255,255,0.08)', color: cfg.mutedColor }}>Caricamento dashboard…</div>}
        {error && <div style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'rgba(127,29,29,0.40)', border: '1px solid rgba(248,113,113,0.35)', color: '#fecaca' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
          {metrics.map(m => <MetricCard key={m.id} m={m} cfg={cfg} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 14 }}>
          <section style={{ background: cfg.cardBg, border: `1px solid ${cfg.cardBorder}`, borderRadius: 18, padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, color: cfg.textColor }}>Pratiche per fase di lavorazione</h3>
            {byFase.length === 0 && <div style={{ color: cfg.mutedColor, fontSize: 13 }}>Nessun dato disponibile.</div>}
            {byFase.map(([label, value]) => <BarRow key={label} label={label} value={value} total={records.length} accent={cfg.accentColor} muted={cfg.mutedColor} />)}
          </section>

          <section style={{ background: cfg.cardBg, border: `1px solid ${cfg.cardBorder}`, borderRadius: 18, padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, color: cfg.textColor }}>Pratiche per ruolo competente</h3>
            {byRole.length === 0 && <div style={{ color: cfg.mutedColor, fontSize: 13 }}>Nessun dato disponibile.</div>}
            {byRole.map(([label, value]) => <BarRow key={label} label={label} value={value} total={records.length} accent={cfg.accentColor} muted={cfg.mutedColor} />)}
          </section>

          <section style={{ background: cfg.cardBg, border: `1px solid ${cfg.cardBorder}`, borderRadius: 18, padding: 18 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, color: cfg.textColor }}>Stato delle attività</h3>
            {(user?.isAdmin || user?.isWorkflowAdmin) && <div style={{ color: cfg.mutedColor, fontSize: 13 }}>Per l’amministratore non è previsto uno stato attività specifico.</div>}
            {byStatus.length === 0 && !(user?.isAdmin || user?.isWorkflowAdmin) && <div style={{ color: cfg.mutedColor, fontSize: 13 }}>Nessun dato disponibile.</div>}
            {byStatus.map(([label, value]) => <BarRow key={label} label={label} value={value} total={records.length} accent={cfg.accentColor} muted={cfg.mutedColor} />)}
          </section>
        </div>

        <section style={{ background: cfg.cardBg, border: `1px solid ${cfg.cardBorder}`, borderRadius: 18, padding: 12, flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8, flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: cfg.textColor }}>Pratiche aggiornate di recente</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ color: cfg.mutedColor, fontSize: 12 }}>Pagina {safeRecentPage} di {recentPageCount}</div>
              <button
                onClick={() => setRecentSortRules(DEFAULT_RECENT_SORT_RULES)}
                disabled={isDefaultRecentSort}
                title='Ripristina ordinamento predefinito'
                style={{ width: 36, height: 36, border: `1px solid ${isDefaultRecentSort ? cfg.cardBorder : cfg.accentColor}`, background: isDefaultRecentSort ? 'rgba(255,255,255,0.04)' : cfg.accentColor, color: isDefaultRecentSort ? cfg.mutedColor : '#111827', borderRadius: 8, padding: 0, fontSize: 17, fontWeight: 900, lineHeight: '34px', textAlign: 'center', cursor: isDefaultRecentSort ? 'not-allowed' : 'pointer', boxShadow: isDefaultRecentSort ? 'none' : '0 0 0 2px rgba(254,235,34,0.18)' }}
              >↺</button>
            </div>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', flexShrink: 0 }}>
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '34%' }} />
                <col style={{ width: '24%' }} />
              </colgroup>
              <thead style={{ background: cfg.cardBg }}>
                <tr style={{ textAlign: 'left' }}>
                  {recentTh('N. rapporto', 'numeroRapporto')}
                  {recentTh('Comune', 'comune')}
                  {recentTh('Fase', 'fase')}
                  {recentTh('Ultimo aggiornamento', 'lastUpdate')}
                </tr>
              </thead>
            </table>
            <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: '1 1 auto', minHeight: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '24%' }} />
                </colgroup>
                <tbody>
                  {recentPageRows.map(({ r, t }, i) => {
                    const rapporto = getNumeroRapporto(r)
                    const comune = getComune(r)
                    const oid = getObjectId(r)
                    const rowId = `${oid}-${(safeRecentPage - 1) * recentRowsPerPage + i}`
                    const selected = selectedRecentRowId === oid
                    const hovered = hoveredRecentRowId === oid
                    const rowBg = selected ? 'rgba(254,254,42,0.18)' : hovered ? 'rgba(255,255,255,0.09)' : 'transparent'
                    return (
                      <tr
                        key={rowId}
                        tabIndex={0}
                        role='button'
                        aria-selected={selected}
                        onClick={() => setSelectedRecentRowId(current => current === oid ? '' : oid)}
                        onMouseEnter={() => setHoveredRecentRowId(oid)}
                        onMouseLeave={() => setHoveredRecentRowId(current => current === oid ? '' : current)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedRecentRowId(current => current === oid ? '' : oid)
                          }
                        }}
                        style={{ borderBottom: `1px solid rgba(255,255,255,0.07)`, background: rowBg, boxShadow: selected ? `inset 3px 0 0 ${cfg.accentColor}` : 'none', cursor: 'pointer', outline: 'none', transition: 'background 120ms ease, box-shadow 120ms ease' }}
                      >
                        <td title={rapporto} style={{ padding: '8px 7px', color: cfg.textColor, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rapporto}</td>
                        <td title={String(comune)} style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(comune)}</td>
                        <td title={faseLabel(getActiveRole(r))} style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{faseLabel(getActiveRole(r))}</td>
                        <td title={t ? new Date(t).toLocaleString('it-IT') : '—'} style={{ padding: '8px 7px', color: cfg.mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t ? new Date(t).toLocaleString('it-IT') : '—'}</td>
                      </tr>
                    )
                  })}
                  {recentPageRows.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 14, color: cfg.mutedColor }}>Nessuna pratica disponibile.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            <div style={{ color: cfg.mutedColor, fontSize: 12 }}>Mostrate {recentPageRows.length} pratiche su {recent.length} risultati.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={safeRecentPage <= 1} onClick={() => setRecentPage(p => Math.max(1, p - 1))} style={{ border: `1px solid ${cfg.cardBorder}`, background: 'rgba(255,255,255,0.08)', color: safeRecentPage <= 1 ? cfg.mutedColor : cfg.textColor, borderRadius: 10, padding: '7px 10px', fontWeight: 700, cursor: safeRecentPage <= 1 ? 'not-allowed' : 'pointer' }}>Indietro</button>
              <button disabled={safeRecentPage >= recentPageCount} onClick={() => setRecentPage(p => Math.min(recentPageCount, p + 1))} style={{ border: `1px solid ${cfg.cardBorder}`, background: 'rgba(255,255,255,0.08)', color: safeRecentPage >= recentPageCount ? cfg.mutedColor : cfg.textColor, borderRadius: 10, padding: '7px 10px', fontWeight: 700, cursor: safeRecentPage >= recentPageCount ? 'not-allowed' : 'pointer' }}>Avanti</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

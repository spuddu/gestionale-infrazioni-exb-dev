export type GiiRuntimeAreaCode = 'AMM' | 'AGR' | 'TEC' | ''

export type GiiRuntimeView = {
  key: string
  viewName: string
  serviceUrl: string
  layerUrl: string
  roles: string[]
  areaCode: GiiRuntimeAreaCode
  settoreCode: string
}

export type GiiRuntimeViewContext = {
  roleCode?: any
  areaCode?: any
  settoreCode?: any
  isAdmin?: boolean
  isWorkflowAdmin?: boolean
}

const SERVICE_ROOT = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services'

const ROLE_FROM_NUMERIC_CODE: Record<number, string> = {
  1: 'TR', 2: 'TI', 3: 'RZ', 4: 'RI', 5: 'DT', 6: 'DA', 7: 'ADMIN'
}

const SETTORE_FROM_NUMERIC_CODE: Record<number, string> = {
  1: 'CR', 2: 'GI', 3: 'D1', 4: 'D2', 5: 'D3', 6: 'D4', 7: 'D5', 8: 'D6', 9: 'DS'
}

function makeRuntimeView (
  key: string,
  viewName: string,
  roles: string[],
  areaCode: GiiRuntimeAreaCode,
  settoreCode = ''
): GiiRuntimeView {
  const serviceUrl = `${SERVICE_ROOT}/${viewName}/FeatureServer`
  return { key, viewName, serviceUrl, layerUrl: `${serviceUrl}/0`, roles, areaCode, settoreCode }
}

/**
 * Catalogo unico delle viste runtime usate da elenco, dashboard e report.
 * GII_VIEW_AMM e GII_VIEW_AMM_ALL espongono soltanto pratiche già entrate
 * nella fase sanzionatoria; per TI_AMM resta inoltre obbligatorio il filtro
 * applicativo condiviso sull'assegnatario.
 */
export const GII_RUNTIME_VIEWS: GiiRuntimeView[] = [
  makeRuntimeView('ADMIN', 'GII_VIEW_ADMIN', ['ADMIN'], ''),
  makeRuntimeView('AGR_ALL', 'GII_VIEW_AGR', ['RI', 'DT'], 'AGR'),
  makeRuntimeView('AGR_D1', 'GII_VIEW_AGR_D1', ['TI', 'RZ'], 'AGR', 'D1'),
  makeRuntimeView('AGR_D2', 'GII_VIEW_AGR_D2', ['TI', 'RZ'], 'AGR', 'D2'),
  makeRuntimeView('AGR_D3', 'GII_VIEW_AGR_D3', ['TI', 'RZ'], 'AGR', 'D3'),
  makeRuntimeView('AGR_D4', 'GII_VIEW_AGR_D4', ['TI', 'RZ'], 'AGR', 'D4'),
  makeRuntimeView('AGR_D5', 'GII_VIEW_AGR_D5', ['TI', 'RZ'], 'AGR', 'D5'),
  makeRuntimeView('AGR_D6', 'GII_VIEW_AGR_D6', ['TI', 'RZ'], 'AGR', 'D6'),
  makeRuntimeView('AMM_RI_DA', 'GII_VIEW_AMM', ['DA', 'RI_AMM'], 'AMM'),
  makeRuntimeView('AMM_TI', 'GII_VIEW_AMM_ALL', ['TI_AMM'], 'AMM'),
  makeRuntimeView('TEC_ALL', 'GII_VIEW_TEC', ['RI', 'DT'], 'TEC'),
  makeRuntimeView('TEC_DS', 'GII_VIEW_TEC_DS', ['TI', 'RZ'], 'TEC', 'DS')
]

function normalizeTextCode (value: any): string {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
}

export function normalizeGiiRuntimeRole (value: any): string {
  const raw = normalizeTextCode(value)
  if (!raw) return ''
  if (/^\d+$/.test(raw)) return ROLE_FROM_NUMERIC_CODE[Number(raw)] || raw
  if (raw === 'RIAMM') return 'RI_AMM'
  if (raw === 'TIAMM') return 'TI_AMM'
  return raw
}

export function normalizeGiiRuntimeArea (value: any): GiiRuntimeAreaCode {
  const raw = normalizeTextCode(value)
  if (raw === '1' || raw === 'AMM') return 'AMM'
  if (raw === '2' || raw === 'AGR') return 'AGR'
  if (raw === '3' || raw === 'TEC') return 'TEC'
  return ''
}

export function normalizeGiiRuntimeSettore (value: any): string {
  const raw = normalizeTextCode(value)
  if (!raw) return ''
  if (raw === 'CS') return 'DS'
  if (/^\d+$/.test(raw)) return SETTORE_FROM_NUMERIC_CODE[Number(raw)] || raw
  return raw
}

export function getEffectiveGiiRuntimeRole (roleCode: any, areaCode: any): string {
  const role = normalizeGiiRuntimeRole(roleCode)
  const area = normalizeGiiRuntimeArea(areaCode)
  if (role === 'RI' && area === 'AMM') return 'RI_AMM'
  if (role === 'TI' && area === 'AMM') return 'TI_AMM'
  return role
}

export function pickGiiRuntimeView (
  context: GiiRuntimeViewContext | null | undefined
): GiiRuntimeView | null {
  if (!context) return null
  const areaCode = normalizeGiiRuntimeArea(context.areaCode)
  const settoreCode = normalizeGiiRuntimeSettore(context.settoreCode)
  const role = getEffectiveGiiRuntimeRole(context.roleCode, areaCode)

  if (context.isAdmin || context.isWorkflowAdmin || role === 'ADMIN') {
    return GII_RUNTIME_VIEWS.find(view => view.key === 'ADMIN') || null
  }

  const strict = GII_RUNTIME_VIEWS.find(view =>
    view.roles.includes(role) &&
    view.areaCode === areaCode &&
    (view.settoreCode ? view.settoreCode === settoreCode : true)
  )
  if (strict) return strict

  return GII_RUNTIME_VIEWS.find(view =>
    view.roles.includes(role) && view.areaCode === areaCode && !view.settoreCode
  ) || null
}

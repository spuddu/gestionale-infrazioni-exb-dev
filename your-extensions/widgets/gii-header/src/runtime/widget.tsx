/** @jsx jsx */
import { React, jsx, type AllWidgetProps, SessionManager, UrlManager, getAppStore } from 'jimu-core'
import { createPortal } from 'react-dom'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'
import { queryGiiAlerts, queryGiiCurrentActivities, archiveGiiAlert, getGiiAlertBellTone, isGiiTakeChargeAlert, summarizeGiiAlerts, type GiiAlertItem, type GiiAlertQueryResult } from '../../../_shared/gii-alerts/gii-alerts'
import { ensureAttivitaCorrentiJsonOnlyQueryFormat } from '../../../_shared/gii-alerts/attivita-correnti-query-format-fix'
import { ensureInfrazioniViewAllJsonOnlyQueryFormat } from '../../../_shared/gii-map/infrazioni-query-format-fix'
import { stampGiiPracticePayload, syncGiiPracticeContextUsername, writeGiiPracticeSelectionContext } from '../../../_shared/gii-selection/practice-context'

const GII_PORTAL     = 'https://cbsm-hub.maps.arcgis.com'
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'
const RUOLO_FULL:  Record<string, string> = {
  TR:'Tecnico rilevatore', IT:'Istruttore tecnico', IA:'Istruttore amministrativo', CS:'Capo Settore',
  RIT:'Responsabile istruttoria tecnica', RIA:'Responsabile istruttoria amministrativa', DT:'Direttore d\'area', DA:'Direttore Area AA. GG. e P.F.', ADMIN:'Amministratore'
}
const PROFILO_FULL: Record<string, string> = {
  ...RUOLO_FULL,
  IA: 'Istruttore amministrativo',
  RIA: 'Responsabile istruttoria amministrativa'
}
const AREA_LABEL: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }
const AREA_NUM: Record<string, number> = { AMM:1, AGR:2, TEC:3 }
const AREA_FULL: Record<string, string> = { AMM:'Amministrativa', AGR:'Agraria', TEC:'Tecnica' }
const SETTORE_LABEL: Record<number, string> = { 1:'CR', 2:'GI', 3:'D1', 4:'D2', 5:'D3', 6:'D4', 7:'D5', 8:'D6', 9:'DS' }
const SETTORE_NUM: Record<string, number> = { CR:1, GI:2, D1:3, D2:4, D3:5, D4:6, D5:7, D6:8, DS:9 }
const SETTORE_FULL: Record<string, string> = {
  CR:'Catasto, Ruoli e Servizi Territoriali',
  GI:'Gestione irrigua',
  D1:"Distretto 1 (Quartu Sant'Elena/Villaputzu/Muravera – San Sperate)",
  D2:'Distretto 2 (Serramanna/Pimpisu)',
  D3:'Distretto 3 (San Gavino - Villacidro)',
  D4:'Distretto 4 (Basso Sulcis)',
  D5:'Distretto 5 (Senorbì)',
  D6:'Distretto 6 (Cixerri)',
  DS:'Manutenzione opere di dreno e di scolo'
}

const UFFICIO_LABEL: Record<number, string> = {
  1:'Cagliari',
  2:'Quartucciu (loc. Is Forreddus)',
  3:'Muravera',
  4:'Villaputzu',
  5:'San Sperate',
  6:'Serramanna (loc. Pimpisu)',
  7:'San Gavino Monreale',
  8:'Villacidro',
  9:'San Giovanni Suergiu (loc. Sa Carabia)',
  10:'Masainas',
  11:'Senorbì',
  12:'Iglesias (loc. Sa Stoia)',
  13:'Siliqua',
  14:'Villasor',
  15:'San Giovanni Suergiu (loc. Is Samis)'
}


function resolvePageId(pageTokenRaw: string): string | null {
  const tok0 = (pageTokenRaw || '').trim()
  if (!tok0) return null

  // Rimuove eventuali prefissi tipo "#", "#/", "/"
  let tok = tok0.replace(/^#+\/?/, '').replace(/^\/+/, '')

  // Accetta anche "page/<qualcosa>"
  if (tok.startsWith('page/')) tok = tok.slice(5)

  try {
    const state: any = getAppStore()?.getState?.()
    const appConfig: any = state?.appConfig
    const rawPages: any = appConfig?.pages ?? {}

    const pagesMap: Record<string, any> =
      rawPages?.asMutable ? rawPages.asMutable({ deep: true }) :
      rawPages?.toJS ? rawPages.toJS() :
      rawPages

    // 1) Se è già un pageId (chiave della mappa), ok
    if (pagesMap && pagesMap[tok]) return tok

    // 2) Prova a matchare per page.name (slug), historyLabels, title/label
    const hist = appConfig?.historyLabels?.page || {}
    for (const [pageId, pg] of Object.entries(pagesMap || {})) {
      if (!pg) continue
      if (pg.name === tok) return pageId
      if (hist && hist[pageId] === tok) return pageId
      if (pg.label === tok || pg.title === tok) return pageId
    }
  } catch { /* ignore */ }

  // 3) Fallback: non risolto
  return null
}

/** Naviga alla pagina usando UrlManager (metodo ufficiale ExB) */
function gotoPage(pageToken: string): void {
  const pageId = resolvePageId(pageToken)
  if (pageId) {
    UrlManager.getInstance().changePage(pageId)
    return
  }

  // Fallback "best effort" (se non troviamo il pageId)
  const clean = (pageToken || '').trim().replace(/^#+\/?/, '').replace(/^\/+/, '')
  const t = clean.startsWith('page/') ? clean.slice(5) : clean
  window.location.hash = `#/page/${t}`
}


function getRuntimeCurrentPageId(): string | null {
  try {
    const state: any = getAppStore()?.getState?.()
    const pageId = String(state?.appRuntimeInfo?.currentPageId || '').trim()
    return pageId || null
  } catch {
    return null
  }
}


function getCurrentPageToken(): string | null {
  try {
    const h = window.location.hash || ''
    const m1 = h.match(/\/page\/([^/?#]+)/)
    if (m1?.[1]) return decodeURIComponent(m1[1])

    const href = window.location.href || ''
    const m2 = href.match(/\/page\/([^/?#]+)/)
    if (m2?.[1]) return decodeURIComponent(m2[1])

    try {
      const u = new URL(href)
      const qp = u.searchParams.get('page')
      if (qp) return qp
    } catch { }
  } catch { }
  return null
}


function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((res, rej) => {
    const req = (window as any).require
    if (!req) { rej(new Error('AMD')); return }
    try { req([path], (m: T) => res(m), (e: any) => rej(e)) } catch (e) { rej(e) }
  })
}


async function getToken(): Promise<string> {
  try {
    const sm = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL)
    if (session) {
      const t = typeof session.token === 'string' ? session.token : null
      if (t) return t
      if (typeof session.getToken === 'function') return String(await session.getToken(`${GII_PORTAL}/sharing/rest`) || '')
    }
  } catch { }
  try {
    const esriId = await loadEsriModule<any>('esri/identity/IdentityManager')
    const creds: any[] = esriId.credentials || []
    const best = creds.slice().sort((a: any, b: any) => (b?.expires || 0) - (a?.expires || 0))[0]
    if (best?.token) return best.token
  } catch { }
  return ''
}

function normalizeAuthUsername (value: any): string {
  return String(value || '').trim().toLowerCase()
}

function getActiveSessionUsername (): string {
  try {
    const sm: any = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.()
    const username = normalizeAuthUsername(session?.username || session?.user?.username)
    if (username) return username
  } catch { }

  try {
    return normalizeAuthUsername(getAppStore()?.getState?.()?.user?.username)
  } catch { }

  return ''
}

function clearGiiUserRoleCache (): void {
  try { delete (window as any).__giiUserRole } catch { (window as any).__giiUserRole = null }
}

function dispatchGiiUserLoaded (detail: any): void {
  try {
    window.dispatchEvent(new (window as any).CustomEvent('gii:userLoaded', { detail }))
  } catch {
    try { window.dispatchEvent(new Event('gii:userLoaded')) } catch { }
  }
}

interface GiiUserAssignment {
  ruoloCod: string
  ruolo_cod?: string
  ruoloLabel: string
  ruoloFull: string
  profiloCod: string
  profiloLabel: string
  area: number | null
  areaCod: string
  area_cod?: string
  areaFull?: string
  settore: number | null
  settoreCod: string
  settore_cod?: string
  settoreFull?: string
  ufficio: number | null
  ufficioLabel?: string
  gruppo: string
  isWorkflowAdmin: boolean
}

interface GiiUserRole {
  username: string
  fullName: string
  /** Codice ruolo testuale ufficiale (TR/IT/IA/CS/RIT/DT/DA/ADMIN). */
  ruoloCod: string
  /** Alias snake_case per compatibilità con vecchi widget. */
  ruolo_cod?: string
  /** Backward-compat: coincide con ruoloCod. */
  ruoloLabel: string
  ruoloFull: string
  /** Profilo operativo sintetico per i ruoli amministrativi: IA / RIA. */
  profiloCod: string
  profiloLabel: string
  area: number | null
  /** Codice area testuale ufficiale (AMM/AGR/TEC). */
  areaCod: string
  /** Alias snake_case per compatibilità con vecchi widget. */
  area_cod?: string
  /** Etichetta area risolta preferibilmente da dominio AGOL. */
  areaFull?: string
  settore: number | null
  /** Codice settore testuale ufficiale (CR/GI/D1..D6/DS). */
  settoreCod: string
  /** Alias snake_case per compatibilità con vecchi widget. */
  settore_cod?: string
  /** Etichetta settore risolta preferibilmente da dominio AGOL. */
  settoreFull?: string
  ufficio: number | null
  /** Etichetta ufficio risolta preferibilmente da dominio AGOL, con fallback locale. */
  ufficioLabel?: string
  gruppo: string
  /** Backward-compat GII: TRUE se il ruolo workflow è ADMIN. */
  isAdmin: boolean
  /** Flag esplicito: admin dell'organizzazione AGOL (org_admin/owner) */
  isOrgAdmin: boolean
  /** TRUE se il codice ruolo workflow è ADMIN. */
  isWorkflowAdmin: boolean
  /** Tutte le assegnazioni operative associate allo stesso username AGOL. */
  assignments: GiiUserAssignment[]
}

function toNum(v: any): number | null {
  const n = v != null ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

function normCode(v: any): string {
  return String(v ?? '').trim().toUpperCase()
}

function getProfiloCod(ruoloCod: string, areaCod: string): string {
  const role = normCode(ruoloCod)
  const area = normCode(areaCod)
  return role
}

function resolveCodeAndNum(rawCode: any, rawNum: any, codeByNum: Record<number, string>, numByCode: Record<string, number>): { code: string; num: number | null } {
  const code0 = normCode(rawCode)
  if (code0 && numByCode[code0] != null) return { code: code0, num: numByCode[code0] }

  const num0 = toNum(rawNum)
  if (num0 != null && codeByNum[num0]) return { code: codeByNum[num0], num: num0 }

  return { code: code0 || '', num: num0 }
}

type DomainLabelMap = Record<string, Record<string, string>>

function buildDomainLabelMap(fields: any[] | undefined): DomainLabelMap {
  const out: DomainLabelMap = {}
  for (const f of fields || []) {
    const fieldName = String(f?.name || '').trim()
    const codedValues = f?.domain?.codedValues
    if (!fieldName || !Array.isArray(codedValues)) continue
    const map: Record<string, string> = {}
    for (const cv of codedValues) {
      const codeRaw = cv?.code
      if (codeRaw === null || codeRaw === undefined || codeRaw === '') continue
      const label = String(cv?.name ?? cv?.label ?? cv?.description ?? codeRaw).trim()
      const rawKey = String(codeRaw).trim()
      if (rawKey) map[rawKey] = label
      const normKey = normCode(codeRaw)
      if (normKey) map[normKey] = label
    }
    out[fieldName] = map
  }
  return out
}

function getDomainLabel(domainMap: DomainLabelMap | null | undefined, fieldName: string, code: any): string {
  const map = domainMap?.[fieldName]
  if (!map) return ''
  const rawKey = String(code ?? '').trim()
  const normKey = normCode(code)
  return String(map[rawKey] || map[normKey] || '').trim()
}

function getDomainLabelFromCandidates(domainMap: DomainLabelMap | null | undefined, textField: string, textCode: any, legacyField: string, legacyNum: any): string {
  return getDomainLabel(domainMap, textField, textCode) || getDomainLabel(domainMap, legacyField, legacyNum)
}

function getDirettoreLabel(profiloCod: string, ruoloCod: string, areaCod?: string): string {
  const profilo = normCode(profiloCod)
  const ruolo = normCode(ruoloCod)
  const area = normCode(areaCod)

  if (profilo === 'DA' || ruolo === 'DA') return 'Direttore Area AA. GG. e P.F.'

  if (profilo === 'DT' || ruolo === 'DT') {
    if (area === 'AGR') return 'Direttore Area Agraria'
    if (area === 'TEC') return 'Direttore Area Tecnico-Ambientale'
    return 'Direttore d\'area'
  }

  return ''
}

function getProfiloLabel(profiloCod: string, ruoloFull: string, ruoloCod: string, areaCod?: string): string {
  const profilo = normCode(profiloCod)
  const direttoreLabel = getDirettoreLabel(profilo, ruoloCod, areaCod)
  if (direttoreLabel) return direttoreLabel
  return PROFILO_FULL[profilo] || ruoloFull || RUOLO_FULL[normCode(ruoloCod)] || profilo
}

function getAreaLabel(user: GiiUserRole | null): string {
  if (!user) return ''
  const code = normCode(user.areaCod || (user.area != null ? AREA_LABEL[user.area] : ''))
  return String(user.areaFull || AREA_FULL[code] || code || '').trim()
}

function getSettoreLabel(user: GiiUserRole | null, compact = false): string {
  if (!user) return ''
  const code = normCode(user.settoreCod || (user.settore != null ? SETTORE_LABEL[user.settore] : ''))
  if (user.settoreFull) return String(user.settoreFull).trim()
  if (compact && /^D[1-6]$/.test(code)) return `Distretto ${code.slice(1)}`
  return SETTORE_FULL[code] || code
}

function normalizeAssignmentFromValues(values: any, domainLabels?: DomainLabelMap | null): GiiUserAssignment {
  const ruoloCod = normCode(values?.ruolo_cod ?? values?.ruoloCod)
  const isWorkflowAdmin = ruoloCod === 'ADMIN'
  const areaResolved = resolveCodeAndNum(values?.area_cod ?? values?.areaCod, values?.area, AREA_LABEL, AREA_NUM)
  const settoreResolved = resolveCodeAndNum(values?.settore_cod ?? values?.settoreCod, values?.settore, SETTORE_LABEL, SETTORE_NUM)
  const area = isWorkflowAdmin ? null : areaResolved.num
  const areaCod = isWorkflowAdmin ? '' : areaResolved.code
  const settore = isWorkflowAdmin ? null : settoreResolved.num
  const settoreCod = isWorkflowAdmin ? '' : settoreResolved.code
  const ufficio = isWorkflowAdmin ? null : toNum(values?.ufficio)

  const ruoloFull = String(
    values?.ruoloFull || values?.ruolo_full ||
    getDomainLabel(domainLabels, 'ruolo_cod', ruoloCod) ||
    RUOLO_FULL[ruoloCod] || ruoloCod || ''
  )
  const areaFull = isWorkflowAdmin ? '' : String(
    values?.areaFull || values?.area_full ||
    getDomainLabelFromCandidates(domainLabels, 'area_cod', areaCod, 'area', area) ||
    AREA_FULL[areaCod] || areaCod || ''
  )
  const settoreFull = isWorkflowAdmin ? '' : String(
    values?.settoreFull || values?.settore_full ||
    getDomainLabelFromCandidates(domainLabels, 'settore_cod', settoreCod, 'settore', settore) ||
    SETTORE_FULL[settoreCod] || settoreCod || ''
  )
  const ufficioLabel = isWorkflowAdmin ? '' : String(
    values?.ufficioLabel || values?.ufficio_label ||
    getDomainLabel(domainLabels, 'ufficio', ufficio) ||
    getDomainLabel(domainLabels, 'id_ufficio', ufficio) ||
    (ufficio != null ? UFFICIO_LABEL[ufficio] || String(ufficio) : '')
  )
  const profiloCod = getProfiloCod(ruoloCod, areaCod)

  return {
    ruoloCod, ruolo_cod: ruoloCod, ruoloLabel: ruoloCod, ruoloFull,
    profiloCod, profiloLabel: getProfiloLabel(profiloCod, ruoloFull, ruoloCod, areaCod),
    area, areaCod, area_cod: areaCod, areaFull,
    settore, settoreCod, settore_cod: settoreCod, settoreFull,
    ufficio, ufficioLabel, gruppo: String(values?.gruppo || ''), isWorkflowAdmin
  }
}

async function loadUser(): Promise<GiiUserRole | null> {
  const cached = (window as any).__giiUserRole
  if (cached?.username) {
    const isOrgAdmin = !!(cached.isOrgAdmin ?? cached.isAdmin)

    const ruoloCod = normCode(cached.ruolo_cod ?? cached.ruoloCod) || (isOrgAdmin ? 'ADMIN' : '')
    const isWorkflowAdmin = ruoloCod === 'ADMIN'

    const areaResolved = resolveCodeAndNum(cached.area_cod ?? cached.areaCod, cached.area, AREA_LABEL, AREA_NUM)
    const settoreResolved = resolveCodeAndNum(cached.settore_cod ?? cached.settoreCod, cached.settore, SETTORE_LABEL, SETTORE_NUM)

    // ADMIN trasversale: mai area/settore/ufficio (anche se presenti per errore in cache)
    const area = isWorkflowAdmin ? null : areaResolved.num
    const areaCod = isWorkflowAdmin ? '' : areaResolved.code
    const settore = isWorkflowAdmin ? null : settoreResolved.num
    const settoreCod = isWorkflowAdmin ? '' : settoreResolved.code
    const ufficio = isWorkflowAdmin ? null : toNum(cached.ufficio)

    const fullName = String(cached.fullName || cached.full_name || cached.username)
    const profiloCod = getProfiloCod(ruoloCod, areaCod)
    const ruoloFull = String(cached.ruoloFull || RUOLO_FULL[ruoloCod] || ruoloCod || '')
    const cachedAssignmentsRaw = Array.isArray(cached.assignments) ? cached.assignments : []
    const assignments = cachedAssignmentsRaw.length
      ? cachedAssignmentsRaw.map((assignment: any) => normalizeAssignmentFromValues(assignment))
      : [normalizeAssignmentFromValues(cached)]
    const u: GiiUserRole = {
      username: String(cached.username),
      fullName,
      ruoloCod,
      ruolo_cod: ruoloCod,
      ruoloLabel: ruoloCod,
      ruoloFull,
      profiloCod,
      profiloLabel: String(getProfiloLabel(profiloCod, ruoloFull, ruoloCod, areaCod)),
      area,
      areaCod,
      area_cod: areaCod,
      areaFull: String(cached.areaFull || cached.area_full || (areaCod ? AREA_FULL[areaCod] || areaCod : '')),
      settore,
      settoreCod,
      settore_cod: settoreCod,
      settoreFull: String(cached.settoreFull || cached.settore_full || (settoreCod ? SETTORE_FULL[settoreCod] || settoreCod : '')),
      ufficio,
      ufficioLabel: String(cached.ufficioLabel || cached.ufficio_label || (ufficio != null ? UFFICIO_LABEL[ufficio] || ufficio : '')),
      gruppo: String(cached.gruppo || ''),
      // Backward-compat GII: i vecchi widget che leggono isAdmin devono intendere ADMIN workflow.
      isAdmin: isWorkflowAdmin,
      isOrgAdmin,
      isWorkflowAdmin,
      assignments
    }
    try { (window as any).__giiUserRole = u } catch { }
    return u
  }
  try {
    const token = await getToken(); if (!token) return null
    const res = await fetch(`${GII_PORTAL}/sharing/rest/community/self?f=json&token=${encodeURIComponent(token)}`)
    const json = await res.json()
    const username = json?.username || ''; if (!username) return null
    const fullName = json?.fullName || username

    // Admin dell'ORG AGOL (org_admin/owner): solo flag (non deve forzare il ruolo workflow)
    const roleStr = String(json?.role || '')
    const privs: any[] = Array.isArray(json?.privileges) ? (json.privileges as any[]) : []
    const isOrgAdmin = roleStr === 'org_admin' || roleStr === 'org_owner' || privs.some(p => String(p).startsWith('portal:admin'))
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: GII_UTENTI_URL })
    await fl.load().catch(() => {})
    const domainLabels = buildDomainLabelMap((fl as any)?.fields || [])
    const qr = await fl.queryFeatures({
      where: `username = '${username.replace(/'/g,"''")}'`,
      outFields: ['ruolo_cod','area','area_cod','settore','settore_cod','ufficio','gruppo','full_name'],
      returnGeometry: false
    })
    const features: any[] = Array.isArray(qr?.features) ? qr.features : []
    const f = features[0]

    // Fallback robusto: se sei org_admin/owner ma non hai record (o campi incompleti) in GII_utenti
    // → contesto coerente "ADMIN trasversale" (mai DA)
    if (!f) {
      if (isOrgAdmin) {
        const ruoloFull = getDomainLabel(domainLabels, 'ruolo_cod', 'ADMIN') || RUOLO_FULL.ADMIN || 'Amministratore'
        const u: GiiUserRole = {
          username, fullName,
          ruoloCod: 'ADMIN', ruolo_cod: 'ADMIN', ruoloLabel: 'ADMIN', ruoloFull,
          profiloCod: 'ADMIN', profiloLabel: getProfiloLabel('ADMIN', ruoloFull, 'ADMIN', ''),
          area: null, areaCod: '', area_cod: '', areaFull: '', settore: null, settoreCod: '', settore_cod: '', settoreFull: '', ufficio: null, ufficioLabel: '', gruppo: '',
          isAdmin: true,
          isOrgAdmin: true,
          isWorkflowAdmin: true,
          assignments: [normalizeAssignmentFromValues({ ruolo_cod: 'ADMIN' }, domainLabels)]
        }
        try { (window as any).__giiUserRole = u } catch { }
        return u
      }

      const u: GiiUserRole = {
        username, fullName,
        ruoloCod: '', ruolo_cod: '', ruoloLabel: '', ruoloFull: '',
        profiloCod: '', profiloLabel: '',
        area: null, areaCod: '', area_cod: '', areaFull: '', settore: null, settoreCod: '', settore_cod: '', settoreFull: '', ufficio: null, ufficioLabel: '', gruppo: '',
        isAdmin: false,
        isOrgAdmin: false,
        isWorkflowAdmin: false,
        assignments: []
      }
      try { (window as any).__giiUserRole = u } catch { }
      return u
    }

    const a = f.attributes
    let ruoloCod = normCode(a.ruolo_cod)

    // Se l'utente è org_admin/owner ma il ruolo workflow non è valorizzato/riconosciuto
    // → usa workflow ADMIN senza trasformarlo in DA.
    if (!ruoloCod && isOrgAdmin) ruoloCod = 'ADMIN'

    const isWorkflowAdmin = ruoloCod === 'ADMIN'
    const areaResolved = resolveCodeAndNum(a.area_cod, a.area, AREA_LABEL, AREA_NUM)
    const settoreResolved = resolveCodeAndNum(a.settore_cod, a.settore, SETTORE_LABEL, SETTORE_NUM)

    const area = isWorkflowAdmin ? null : areaResolved.num
    const areaCod = isWorkflowAdmin ? '' : areaResolved.code
    const settore = isWorkflowAdmin ? null : settoreResolved.num
    const settoreCod = isWorkflowAdmin ? '' : settoreResolved.code
    const ufficio = isWorkflowAdmin ? null : toNum(a.ufficio)
    const ruoloFull = getDomainLabel(domainLabels, 'ruolo_cod', ruoloCod) || RUOLO_FULL[ruoloCod] || ruoloCod
    const areaFull = isWorkflowAdmin ? '' : (getDomainLabelFromCandidates(domainLabels, 'area_cod', areaCod, 'area', area) || AREA_FULL[areaCod] || areaCod)
    const settoreFull = isWorkflowAdmin ? '' : (getDomainLabelFromCandidates(domainLabels, 'settore_cod', settoreCod, 'settore', settore) || SETTORE_FULL[settoreCod] || settoreCod)
    const ufficioLabel = isWorkflowAdmin ? '' : (getDomainLabel(domainLabels, 'ufficio', ufficio) || getDomainLabel(domainLabels, 'id_ufficio', ufficio) || (ufficio != null ? UFFICIO_LABEL[ufficio] || String(ufficio) : ''))
    const profiloCod = getProfiloCod(ruoloCod, areaCod)
    const profiloLabel = getProfiloLabel(profiloCod, ruoloFull, ruoloCod, areaCod)
    const assignments = features.map((feature: any) => normalizeAssignmentFromValues(feature?.attributes || {}, domainLabels))

    const u: GiiUserRole = {
      username,
      fullName: String(a.full_name || fullName),
      ruoloCod,
      ruolo_cod: ruoloCod,
      ruoloLabel: ruoloCod,
      ruoloFull,
      profiloCod,
      profiloLabel,
      // ADMIN trasversale: mai area/settore/ufficio
      area,
      areaCod,
      area_cod: areaCod,
      areaFull,
      settore,
      settoreCod,
      settore_cod: settoreCod,
      settoreFull,
      ufficio,
      ufficioLabel,
      gruppo: String(a.gruppo || ''),
      // Backward-compat GII: i vecchi widget che leggono isAdmin devono intendere ADMIN workflow.
      isAdmin: isWorkflowAdmin,
      isOrgAdmin,
      isWorkflowAdmin,
      assignments
    }
    try { (window as any).__giiUserRole = u } catch { }
    return u
  } catch { return null }
}

async function signIn(): Promise<void> {
  try {
    const sm: any = SessionManager.getInstance()
    if (typeof sm?.signIn === 'function') {
      await sm.signIn({})
    }
  } catch { }
  try { delete (window as any).__giiUserRole } catch { }
  window.dispatchEvent(new Event('gii:userLoaded'))
}

function switchAccountWithoutRevokingCurrentSession(
  previousUsername: string,
  beforeDifferentSessionInstall?: () => Promise<void>,
  afterDifferentSessionInstalled?: (incomingUsername: string) => Promise<void>
): Promise<any> | null {
  if (window.jimuConfig.isInBuilder) return null

  const sm: any = SessionManager.getInstance()
  if (!sm?.getMainSession?.() || typeof sm?.signIn !== 'function') return null

  // Non usare SessionManager.switchAccount(): in ExB 1.19 revoca il token
  // corrente appena il flusso viene avviato, quindi anche Annulla lascia
  // l'app senza una sessione valida. Un nuovo sign-in forzato in popup
  // conserva invece la sessione corrente fino al completamento dell'OAuth.
  //
  // IMPORTANTE: signIn() registra la nuova resource session PRIMA di risolvere
  // la Promise. Per poter smontare Mappa/Tabella soltanto quando l'utente ha
  // davvero scelto un account differente, intercettiamo temporaneamente
  // addOrReplaceSession(): se lo username in arrivo cambia, eseguiamo prima il
  // callback (navigazione alla Home + attesa smontaggio) e soltanto dopo
  // permettiamo a SessionManager di installare la nuova sessione.
  const originalAddOrReplaceSession = typeof sm?.addOrReplaceSession === 'function'
    ? sm.addOrReplaceSession
    : null
  let wrappedAddOrReplaceSession: any = null
  let beforeInstallPromise: Promise<void> | null = null

  if (originalAddOrReplaceSession && beforeDifferentSessionInstall) {
    wrappedAddOrReplaceSession = function (session: any, ...args: any[]) {
      const incomingUsername = normalizeAuthUsername(
        session?.username || session?.user?.username || session?.portalUser?.username
      )
      const isDifferentAccount = !!incomingUsername && !!previousUsername && incomingUsername !== previousUsername

      if (!isDifferentAccount) {
        return originalAddOrReplaceSession.apply(this, [session, ...args])
      }

      if (!beforeInstallPromise) {
        beforeInstallPromise = Promise.resolve().then(() => beforeDifferentSessionInstall())
      }

      return beforeInstallPromise.then(() => {
        const nativeResult = originalAddOrReplaceSession.apply(this, [session, ...args])
        return Promise.resolve(nativeResult).then(async (nativeValue: any) => {
          if (afterDifferentSessionInstalled) {
            await afterDifferentSessionInstalled(incomingUsername)
          }
          return nativeValue
        })
      })
    }
    sm.addOrReplaceSession = wrappedAddOrReplaceSession
  }

  const restoreInterceptor = () => {
    try {
      if (wrappedAddOrReplaceSession && sm.addOrReplaceSession === wrappedAddOrReplaceSession) {
        sm.addOrReplaceSession = originalAddOrReplaceSession
      }
    } catch { }
  }

  try {
    return Promise.resolve(sm.signIn({
      popup: true,
      forceLogin: true
    })).finally(restoreInterceptor)
  } catch (e) {
    restoreInterceptor()
    return Promise.reject(e)
  }
}

async function signOut(): Promise<void> {
  try {
    const sm: any = SessionManager.getInstance()
    if (typeof sm?.signOut === 'function') {
      sm.signOut({})
    }
  } catch { }
  try { delete (window as any).__giiUserRole } catch { (window as any).__giiUserRole = null }
  window.dispatchEvent(new Event('gii:userLoaded'))
}


function alertRoleAreaKey (user: any): string {
  const role = String(user?.profiloCod || user?.ruoloCod || user?.role || '').trim().toUpperCase()
  const area = String(user?.areaCod || user?.area || '').trim().toUpperCase()
  if (role === 'ADMIN') return 'ADMIN'
  if (role === 'DA') return 'DA'
  if (role === 'IA' || role === 'RIA') return role
  if (role === 'CS' && area === 'TEC') return 'CS_TEC'
  if (role === 'IT' && area === 'TEC') return 'IT_TEC'
  if (role === 'RIT' && area === 'TEC') return 'RIT_TEC'
  if (role === 'DT' && area === 'TEC') return 'DT_TEC'
  if (role === 'CS' && area === 'AGR') return 'CS_AGR'
  if (role === 'IT' && area === 'AGR') return 'IT_AGR'
  if (role === 'RIT' && area === 'AGR') return 'RIT_AGR'
  if (role === 'DT' && area === 'AGR') return 'DT_AGR'
  if (role.endsWith('_TEC') || role.endsWith('_AGR')) return role
  return role
}

function canUseGiiAlerts (user: any): boolean {
  const k = alertRoleAreaKey(user)
  return ['ADMIN', 'IA', 'RIA', 'DA', 'CS_TEC', 'IT_TEC', 'RIT_TEC', 'DT_TEC', 'CS_AGR', 'IT_AGR', 'RIT_AGR', 'DT_AGR'].includes(k)
}

function alertAreaForUrls (user: any): 'AMM' | 'AGR' | 'TEC' {
  const k = alertRoleAreaKey(user)
  if (k.endsWith('_AGR')) return 'AGR'
  if (k.endsWith('_TEC')) return 'TEC'
  return 'AMM'
}

function usesTecniciAlertUrls (user: any): boolean {
  const area = alertAreaForUrls(user)
  return area === 'AGR' || area === 'TEC'
}

const GII_ATTIVITA_CORRENTI_WRITE_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_ATTIVITA_CORRENTI/FeatureServer/0'
const GII_ATTIVITA_CORRENTI_AMM_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_ATTIVITA_CORRENTI_AMM/FeatureServer/0'
const GII_ATTIVITA_CORRENTI_AGR_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_ATTIVITA_CORRENTI_AGR/FeatureServer/0'
const GII_ATTIVITA_CORRENTI_TEC_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_ATTIVITA_CORRENTI_TEC/FeatureServer/0'

function selectCurrentActivityLayerUrl (cfg: any, user: any): string {
  const area = alertAreaForUrls(user)
  if (String(user?.profiloCod || user?.ruoloCod || '').trim().toUpperCase() === 'ADMIN') {
    return String(cfg.alertsActivityLayerUrl || cfg.attivitaCorrentiLayerUrl || GII_ATTIVITA_CORRENTI_WRITE_URL).trim()
  }
  if (area === 'AGR') return String(cfg.alertsActivityLayerUrlAgr || cfg.attivitaCorrentiLayerUrlAgr || GII_ATTIVITA_CORRENTI_AGR_URL).trim()
  if (area === 'TEC') return String(cfg.alertsActivityLayerUrlTec || cfg.attivitaCorrentiLayerUrlTec || GII_ATTIVITA_CORRENTI_TEC_URL).trim()
  return String(cfg.alertsActivityLayerUrlAmm || cfg.attivitaCorrentiLayerUrlAmm || GII_ATTIVITA_CORRENTI_AMM_URL).trim()
}

function selectAlertPracticeLayerUrl (cfg: any, user: any): string {
  const area = alertAreaForUrls(user)
  if (area === 'AGR') return String(cfg.alertsPracticeLayerUrlAgr || cfg.alertsPracticeLayerUrlTecnici || '').trim()
  if (area === 'TEC') return String(cfg.alertsPracticeLayerUrlTec || cfg.alertsPracticeLayerUrlTecnici || '').trim()
  return String(cfg.alertsPracticeLayerUrl || '').trim()
}

// Viste editabili per settore/distretto (IT/CS), stesse URL già usate in
// gii-elenco-pratiche-pro/runtimeDataSources. IT/CS non hanno accesso in
// scrittura alla vista d'area (GII_VIEW_AGR/GII_VIEW_TEC), solo alla propria.
const GII_WRITE_VIEW_BY_SETTORE: Record<string, string> = {
  D1: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_AGR_D1/FeatureServer/0',
  D2: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_AGR_D2/FeatureServer/0',
  D3: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_AGR_D3/FeatureServer/0',
  D4: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_AGR_D4/FeatureServer/0',
  D5: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_AGR_D5/FeatureServer/0',
  D6: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_AGR_D6/FeatureServer/0',
  DS: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_TEC_DS/FeatureServer/0'
}

// Vista editabile dedicata alla sola normalizzazione testi (applyEdits). Distinta
// da selectAlertPracticeLayerUrl (che resta di sola lettura, "_ALL", condivisa con
// tutti i sotto-ruoli). IT/CS (ruoli di distretto) scrivono sulla vista del proprio
// settore; RIT/DT/RIA/DA (ruoli d'area) sulla vista d'area; IA non ha accesso
// in scrittura da nessuna parte, quindi non tenta nulla. Se il ruolo corrente non
// ha comunque accesso, il tentativo fallisce silenziosamente (try/catch a monte)
// senza impattare la lettura degli allarmi.
function selectAlertPracticeLayerUrlWrite (cfg: any, user: any): string {
  const key = alertRoleAreaKey(user)
  if (key === 'CS_AGR' || key === 'IT_AGR' || key === 'CS_TEC' || key === 'IT_TEC') {
    const settore = normCode(user?.settoreCod || '')
    return GII_WRITE_VIEW_BY_SETTORE[settore] || ''
  }
  if (key === 'RIT_AGR' || key === 'DT_AGR') return String(cfg.alertsPracticeLayerUrlWriteAgr || '').trim()
  if (key === 'RIT_TEC' || key === 'DT_TEC') return String(cfg.alertsPracticeLayerUrlWriteTec || '').trim()
  if (key === 'RIA' || key === 'DA') return String(cfg.alertsPracticeLayerUrlWrite || '').trim()
  return ''
}

function selectAlertArchiveTableUrl (cfg: any, user: any): string {
  return String(usesTecniciAlertUrls(user) ? (cfg.alertsArchiveTableUrlTecnici || '') : (cfg.alertsArchiveTableUrl || '')).trim()
}


function giiAlertPracticeIdentityKey (alert: GiiAlertItem): string {
  const gid = String(alert?.parentGlobalId || '').trim().replace(/^\{|\}$/g, '').toLowerCase()
  if (gid) return `gid:${gid}`
  const oid = Number(alert?.parentObjectId)
  if (Number.isFinite(oid)) return `oid:${oid}`
  const raw = alert?.raw || {}
  const rawGid = String((raw as any).parent_globalid || (raw as any).globalid || (raw as any).GlobalID || '').trim().replace(/^\{|\}$/g, '').toLowerCase()
  if (rawGid) return `gid:${rawGid}`
  const rawOid = Number((raw as any).parent_objectid || (raw as any).objectid || (raw as any).OBJECTID)
  if (Number.isFinite(rawOid)) return `oid:${rawOid}`
  return String(alert?.alertKey || '')
}

function alertPracticeMergeKey (alert: GiiAlertItem | null | undefined): string {
  const raw: any = alert?.raw || {}
  const practice: any = raw?.__practice || {}
  const reportLike = [
    alert?.parentGlobalId,
    raw.parent_globalid,
    raw.parentGlobalId,
    raw.globalid,
    raw.GlobalID,
    practice.globalid,
    practice.GlobalID,
    alert?.reportCode,
    raw.numero_rapporto_tecnico,
    raw.numero_rapporto,
    raw.numero_rilevazione,
    raw.cod_pratica,
    raw.n_rapporto,
    practice.numero_rapporto_tecnico,
    practice.numero_rilevazione,
    practice.cod_pratica
  ]
    .map(v => String(v ?? '').trim().replace(/^\{|\}$/g, '').toUpperCase())
    .find(Boolean)

  if (reportLike) return `practice:${reportLike}`

  const parentOid = Number(alert?.parentObjectId ?? raw.parent_objectid ?? raw.parentObjectId)
  if (Number.isFinite(parentOid)) return `parent-oid:${parentOid}`

  return giiAlertPracticeIdentityKey(alert as any)
}

function mergeCurrentAndFallbackGiiAlerts (currentActivities: GiiAlertItem[], dynamicAlerts: GiiAlertItem[]): GiiAlertItem[] {
  const current = Array.isArray(currentActivities) ? currentActivities : []
  const dynamic = Array.isArray(dynamicAlerts) ? dynamicAlerts : []
  const currentKeys = new Set(
    current
      .map(a => alertPracticeMergeKey(a))
      .filter(Boolean)
  )
  const currentWorkflowKeys = new Set(
    current
      .filter(a => alertIsStandardWorkflowAlert(a))
      .map(a => alertPracticeMergeKey(a))
      .filter(Boolean)
  )

  const dynamicTakeChargeFallback = dynamic
    .filter(a => isGiiTakeChargeAlert(a))
    .filter(a => {
      const key = alertPracticeMergeKey(a)
      return !!key && !currentKeys.has(key)
    })

  const dynamicNonTakeCharge = dynamic
    .filter(a => !isGiiTakeChargeAlert(a))
    .filter(a => {
      const key = alertPracticeMergeKey(a)
      // Le attività correnti sono la fonte autorevole per gli allarmi di workflow.
      // Il controllo dinamico sul FL madre può integrare scadenze/fallback, ma non
      // deve reintrodurre card equivalenti con mittenti sintetici tipo "CS D1".
      if (key && currentWorkflowKeys.has(key) && alertIsStandardWorkflowAlert(a)) return false
      return true
    })
  return sortAlertsForPopup([...current, ...dynamicTakeChargeFallback, ...dynamicNonTakeCharge])
}

function alertPopupVisualSignature (items: GiiAlertItem[]): string {
  return (Array.isArray(items) ? items : [])
    .map(a => [
      alertPracticeMergeKey(a),
      alertDisplayTitle(a as any),
      alertSenderLine(a as any),
      alertSenderQualificaLine(a as any),
      alertSenderOrgLine(a as any),
      alertEventDateMs(a),
      String(a?.reportCode || ''),
      String(a?.message || '')
    ].join('§'))
    .join('¶')
}

function alertPopupKeysSignature (items: GiiAlertItem[]): string {
  return (Array.isArray(items) ? items : [])
    .map(a => {
      const practiceKey = alertPracticeMergeKey(a)
      const alertKey = normalizeGiiAlertKey(a?.alertKey)
      return alertKey ? `${practiceKey || 'alert'}::${alertKey}` : practiceKey
    })
    .filter(Boolean)
    .join('¶')
}

type GiiTakeChargeTombstone = {
  deletedAlertKeys: Set<string>
  suppressAllPreviousActivities: boolean
  resolvedAt: number
  currentAbsentConfirmations: number
  expiresAt: number
}

type GiiAlertRefreshOptions = {
  includeBackground?: boolean
}

function normalizeGiiAlertKey (value: any): string {
  return String(value ?? '').trim().toLowerCase()
}

function giiPracticeKeyFromIdentity (parentGlobalId: any, parentObjectId: any): string {
  const gid = String(parentGlobalId ?? '').trim().replace(/^\{|\}$/g, '').toUpperCase()
  if (gid) return `practice:${gid}`

  const oid = Number(parentObjectId)
  if (Number.isFinite(oid)) return `parent-oid:${oid}`

  return ''
}

function withGiiTimeout<T> (promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: number | undefined
  const timeout = new Promise<T>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer != null) window.clearTimeout(timer)
  })
}

function isGiiAbortError (error: any): boolean {
  return String(error?.name || '').toLowerCase() === 'aborterror' ||
    String(error?.message || '').toLowerCase().includes('abort')
}

function throwIfHeaderAborted (signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const error = new Error('Operazione annullata.')
  ;(error as any).name = 'AbortError'
  throw error
}

function formatAlertDate (ms: number | null): string {
  if (ms == null) return ''
  try { return new Date(ms).toLocaleDateString('it-IT') } catch { return '' }
}

function asAlertDateMs (value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const d = value instanceof Date ? value : new Date(value)
  const t = d.getTime()
  return Number.isFinite(t) ? t : null
}

function formatAlertDateTime (ms: number | null): string {
  if (ms == null) return ''
  try {
    return new Date(ms).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return formatAlertDate(ms)
  }
}

function alertEventDateMs (alert: GiiAlertItem | null | undefined): number | null {
  const raw: any = alert?.raw || {}

  // Le attività correnti espongono normalmente data_attivazione/creato_il.
  // Gli allarmi di presa in carico ricavati come fallback dal layer pratica, invece,
  // possono avere solo la data di stato del ruolo destinatario (es. dt_stato_CS per
  // le rilevazioni TR). Usiamo quindi una lista ampia di fallback, mantenendo prima
  // i campi specifici dell'attività e poi le date di workflow della pratica.
  return asAlertDateMs(raw.data_attivazione) ??
    asAlertDateMs(raw.creato_il) ??
    asAlertDateMs(raw.data_evento) ??
    asAlertDateMs(raw.dt_evento) ??
    asAlertDateMs(raw.dt_chiusura) ??
    asAlertDateMs(raw.dt_stato_CS) ??
    asAlertDateMs(raw.dt_stato_IT) ??
    asAlertDateMs(raw.dt_stato_RIT) ??
    asAlertDateMs(raw.dt_stato_DT_AGR) ??
    asAlertDateMs(raw.dt_stato_DT_TEC) ??
    asAlertDateMs(raw.dt_stato_DT) ??
    asAlertDateMs(raw.dt_stato_IA) ??
    asAlertDateMs(raw.dt_stato_RIA) ??
    asAlertDateMs(raw.determinazione_data) ??
    asAlertDateMs(raw.determinazione_trasmessa_firma_il) ??
    asAlertDateMs(raw.EditDate) ??
    asAlertDateMs(raw.editDate) ??
    asAlertDateMs(raw.CreationDate) ??
    asAlertDateMs(raw.creationDate)
}

function normalizeGiiFeatureLayerUrl (url: string): string {
  let s = String(url || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '')
  if (/\/(FeatureServer|MapServer)$/i.test(s)) s = `${s}/0`
  return s
}

function alertRawValue (alert: GiiAlertItem | null | undefined, names: string[]): any {
  const raw: any = alert?.raw || {}
  const sources = [raw, raw?.__practice].filter(Boolean)

  for (const source of sources) {
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(source, name)) return source[name]
    }
    const ci = new Map<string, any>()
    Object.keys(source).forEach(k => ci.set(k.toLowerCase(), source[k]))
    for (const name of names) {
      const v = ci.get(String(name || '').toLowerCase())
      if (v !== undefined) return v
    }
  }

  return null
}

function firstNonEmptyAlertRawValue (alert: GiiAlertItem | null | undefined, names: string[]): string {
  for (const name of names) {
    const v = alertRawValue(alert, [name])
    const text = String(v ?? '').trim()
    if (text) return text
  }
  return ''
}

function alertRawValues (alert: GiiAlertItem | null | undefined, names: string[]): string[] {
  const raw: any = alert?.raw || {}
  const sources = [raw, raw?.__practice].filter(Boolean)
  const out: string[] = []

  const pushValue = (v: any) => {
    const text = String(v ?? '').trim()
    if (text && !out.some(x => x.toLowerCase() === text.toLowerCase())) out.push(text)
  }

  for (const source of sources) {
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(source, name)) pushValue(source[name])
    }
    const ci = new Map<string, any>()
    Object.keys(source).forEach(k => ci.set(k.toLowerCase(), source[k]))
    for (const name of names) {
      const v = ci.get(String(name || '').toLowerCase())
      if (v !== undefined) pushValue(v)
    }
  }

  return out
}

function normalizeUsernameLookupKey (value: any): string {
  const text = String(value ?? '').trim().toLowerCase()
  // Alcuni valori possono arrivare con prefissi tecnici; per la ricerca utente
  // manteniamo anche una normalizzazione minima e stabile.
  return text.replace(/^.*\|/, '')
}

function alertIsItOrigin (alert: GiiAlertItem | null | undefined): boolean {
  const values = [
    alert?.reportCode,
    alert?.message,
    alertRawValue(alert, ['numero_rapporto', 'numero_rilevazione', 'cod_pratica', 'n_rapporto', 'numero_rapporto_tecnico']),
    alertRawValue(alert, ['origine_pratica'])
  ].map(v => String(v ?? '').trim().toUpperCase()).filter(Boolean)

  return values.some(v => /(^|[-_\s])IT([-_\s]|$)/.test(v) || v === '2' || v === 'IT')
}

function alertRawValuesPracticeFirst (alert: GiiAlertItem | null | undefined, names: string[]): string[] {
  const raw: any = alert?.raw || {}
  const sources = [raw?.__practice, raw].filter(Boolean)
  const out: string[] = []

  const pushValue = (v: any) => {
    const text = String(v ?? '').trim()
    if (text && !out.some(x => x.toLowerCase() === text.toLowerCase())) out.push(text)
  }

  for (const source of sources) {
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(source, name)) pushValue(source[name])
    }
    const ci = new Map<string, any>()
    Object.keys(source).forEach(k => ci.set(k.toLowerCase(), source[k]))
    for (const name of names) {
      const v = ci.get(String(name || '').toLowerCase())
      if (v !== undefined) pushValue(v)
    }
  }

  return out
}

function firstNonEmptyAlertRawValuePracticeFirst (alert: GiiAlertItem | null | undefined, names: string[]): string {
  for (const name of names) {
    const values = alertRawValuesPracticeFirst(alert, [name])
    const text = values.map(v => String(v ?? '').trim()).find(Boolean)
    if (text) return text
  }
  return ''
}

function alertIsNewRilevazione (alert: GiiAlertItem | null | undefined): boolean {
  const subtype = String(
    firstNonEmptyAlertRawValue(alert, ['sottotipo_attivita', 'origine_evento', 'tipo_evento']) ||
    ''
  ).trim().toUpperCase().replace(/[\s-]+/g, '_')

  if (subtype) return subtype === 'NUOVA_RILEVAZIONE' || subtype === 'NUOVA_RILEVAZIONE_SURVEY' || subtype.includes('NUOVA_RILEVAZIONE')

  const rawValues = [
    alert?.tipoAlert,
    alert?.title,
    alert?.message,
    alert?.reportCode,
    firstNonEmptyAlertRawValue(alert, ['titolo', 'messaggio', 'numero_rapporto'])
  ].map(v => String(v ?? '').trim())

  const hay = rawValues.join(' ').toUpperCase()
  const text = `${alert?.message || ''} ${alert?.reportCode || ''}`.trim()

  return hay.includes('NUOVA_RILEVAZIONE') || (
    String(alert?.tipoAlert || '').toUpperCase().startsWith('PRESA_IN_CARICO') &&
    hay.includes('NUOVA ISTRUTTORIA RICEVUTA') &&
    /^Rilevazione\s+n\.?\s+/i.test(text)
  )
}

function alertIsNewAssignmentReceived (alert: GiiAlertItem | null | undefined): boolean {
  const subtype = String(
    firstNonEmptyAlertRawValue(alert, ['sottotipo_attivita', 'origine_evento', 'tipo_evento']) ||
    alert?.tipoAlert ||
    ''
  ).trim().toUpperCase().replace(/[\s-]+/g, '_')

  const event = String(
    firstNonEmptyAlertRawValue(alert, ['origine_evento', 'evento_chiusura', 'tipo_evento']) ||
    ''
  ).trim().toUpperCase().replace(/[\s-]+/g, '_')

  const destRole = String(
    firstNonEmptyAlertRawValue(alert, ['destinatario_ruolo', 'ruolo_destinatario', 'ruolo_competente']) ||
    ''
  ).trim().toUpperCase().replace(/[\s-]+/g, '_')

  const isNewAssignment = subtype === 'NUOVA_ASSEGNAZIONE' || event === 'NUOVA_ASSEGNAZIONE' || subtype.includes('NUOVA_ASSEGNAZIONE')
  if (!isNewAssignment) return false

  // Nel flusso tecnico questa casistica corrisponde alla normale assegnazione
  // CS → IT della rilevazione appena ricevuta. Manteniamo incluso IA per
  // la stessa semantica nella fase amministrativa, senza cambiare gli altri
  // passaggi di trasmissione/rimando.
  return destRole === 'IT' || destRole === 'IA'
}

function alertSubtypeCode (alert: GiiAlertItem | null | undefined): string {
  return String(
    firstNonEmptyAlertRawValue(alert, ['sottotipo_attivita', 'origine_evento', 'tipo_evento']) ||
    alert?.tipoAlert ||
    ''
  ).trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function alertOriginEventCode (alert: GiiAlertItem | null | undefined): string {
  return String(
    firstNonEmptyAlertRawValue(alert, ['origine_evento', 'evento_chiusura', 'tipo_evento']) ||
    ''
  ).trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function alertDestRoleCode (alert: GiiAlertItem | null | undefined): string {
  return String(
    firstNonEmptyAlertRawValue(alert, ['destinatario_ruolo', 'ruolo_destinatario', 'ruolo_competente']) ||
    ''
  ).trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function alertRawTitleText (alert: GiiAlertItem | null | undefined): string {
  return String(firstNonEmptyAlertRawValue(alert, ['titolo', 'title']) || alert?.title || '').trim()
}

function alertDisplayTitle (alert: GiiAlertItem): string {
  const subtype = alertSubtypeCode(alert)
  const event = alertOriginEventCode(alert)
  const destRole = alertDestRoleCode(alert)
  const rawTitle = alertRawTitleText(alert)
  const rawTitleUpper = rawTitle.toUpperCase()

  if (alertIsNewRilevazione(alert)) return 'Nuova rilevazione ricevuta'
  if (event === 'ISTRUTTORIA_TRASMESSA' && destRole === 'CS' && alertIsItOrigin(alert)) return 'Nuova rilevazione ricevuta'
  if (subtype === 'ATTESTAZIONE_CONFORMITA_IA' || event === 'ATTESTAZIONE_CONFORMITA') return 'Attestazione di conformità apposta'
  if (subtype === 'PROPOSTA_CONTESTAZIONE_APPROVATA' || event === 'PROPOSTA_CONTESTAZIONE_APPROVATA') return 'Proposta di contestazione approvata'
  if (alertIsNewAssignmentReceived(alert)) return 'Nuova istruttoria assegnata'
  if (subtype === 'RILEVAZIONE_RESPINTA' || subtype === 'CS_RESPINGE_RILEVAZIONE') return 'Nuova rilevazione respinta'
  if (subtype === 'CS_APPROVA_RILEVAZIONE') return rawTitleUpper.includes('INTEGRAZIONE') ? 'Integrazione validata' : 'Istruttoria approvata'
  if (subtype === 'DT_APPROVA_RAPPORTO') return 'Rapporto tecnico approvato'
  if (subtype === 'DT_RESPINGE_RAPPORTO') return 'Rapporto tecnico respinto'
  if (subtype === 'DT_RIMANDA_A_IT' || subtype === 'RIT_RIMANDA_A_IT') return 'Rimando all’Istruttore tecnico'
  if (subtype === 'BOZZA_DETERMINAZIONE' || event === 'IA_TRASMETTE_BOZZA_DETERMINAZIONE') return 'Bozza determinazione da verificare'

  return String(alert?.title || '').trim() || 'Allarme'
}

function roleLabelForBody (value: string): string {
  const raw = String(value || '').trim()
  const n = raw.toUpperCase()
  if (!n) return ''

  if (n.includes('TECNICO RILEVATORE')) return 'tecnico rilevatore'
  if (n.includes('ISTRUTTORE AMMINISTRATIVO')) return 'Istruttore amministrativo'
  if (n.includes('ISTRUTTORE TECNICO')) return 'istruttore tecnico'
  if (n.includes('RESPONSABILE ISTRUTTORIA AMMINISTRATIVA')) return 'Responsabile istruttoria amministrativa'
  if (n.includes('CAPO SETTORE')) return 'Capo Settore'
  if (n.includes('DIRETTORE AREA AMMINISTRATIVA') || n.includes('DIRETTORE AREA AA')) return 'Direttore Area AA. GG. e P.F.'
  if (n.includes('DIRETTORE D’AREA') || n.includes("DIRETTORE D'AREA")) return 'Direttore d’Area'

  const tag = raw.split(/\s+-\s+/)[0].trim().toUpperCase().replace(/_/g, '-')
  if (tag === 'TR' || tag.startsWith('TR-')) return 'tecnico rilevatore'
  if (tag === 'IA-AMM') return 'Istruttore amministrativo'
  if (tag === 'IT' || tag.startsWith('IT-')) return 'istruttore tecnico'
  if (tag === 'RIA') return 'Responsabile istruttoria amministrativa'
  if (tag === 'RIT' || tag.startsWith('RIT-')) return 'Responsabile istruttoria tecnica'
  if (tag === 'CS' || tag.startsWith('CS-')) return 'Capo Settore'
  if (tag === 'DA') return 'Direttore Area AA. GG. e P.F.'
  if (tag === 'DT' || tag.startsWith('DT-') || tag === 'DIR' || tag.startsWith('DIR-')) return 'Direttore d’Area'

  return raw
}

function alertPracticeRawValue (alert: GiiAlertItem | null | undefined, names: string[]): any {
  const raw: any = alert?.raw || {}
  const sources = [raw?.__practice, raw].filter(Boolean)

  for (const source of sources) {
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(source, name)) return source[name]
    }
    const ci = new Map<string, any>()
    Object.keys(source).forEach(k => ci.set(k.toLowerCase(), source[k]))
    for (const name of names) {
      const v = ci.get(String(name || '').toLowerCase())
      if (v !== undefined) return v
    }
  }

  return null
}

function officeLabelFromAlert (alert: GiiAlertItem | null | undefined): string {
  const label = String(alertPracticeRawValue(alert, ['ufficio_zona', 'ufficioZona', 'ufficio_di_zona', 'destinatario_ufficio_zona']) ?? '').trim()
  if (label && !/^\d+$/.test(label)) return label

  const rawId = alertPracticeRawValue(alert, ['id_ufficio', 'ufficio_id', 'id_ufficio_zona', 'ufficio', 'destinatario_ufficio_id'])
  const n = Number(rawId ?? label)
  return Number.isFinite(n) ? String(UFFICIO_LABEL[n] || '').trim() : ''
}

function officeRefFromAlert (alert: GiiAlertItem | null | undefined): string {
  const ufficio = officeLabelFromAlert(alert)
  if (!ufficio) return ''
  return /^Ufficio\b/i.test(ufficio) ? ufficio : `Ufficio di ${ufficio}`
}

function parseSectorCodeCandidate (value: any): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const compact = raw.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '')
  if (/^D[1-6]$/.test(compact)) return compact
  if (compact === 'DS' || compact === 'CR' || compact === 'GI') return compact

  const n = Number(compact)
  if (Number.isFinite(n)) return String(SETTORE_LABEL[n] || '').trim().toUpperCase()

  // Fallback solo per valori strutturati/compositi di workflow (es. CS-D1).
  // Gli username sono identificativi opachi e non devono determinare il settore.
  const spaced = raw.toUpperCase().replace(/_/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  const d = spaced.match(/(?:^|\s)D([1-6])(?:\s|$)/)
  if (d) return `D${d[1]}`
  if (/(?:^|\s)DS(?:\s|$)/.test(spaced)) return 'DS'
  if (/(?:^|\s)CR(?:\s|$)/.test(spaced)) return 'CR'
  if (/(?:^|\s)GI(?:\s|$)/.test(spaced)) return 'GI'

  return ''
}

function sectorCodeFromAlert (alert: GiiAlertItem | null | undefined): string {
  const actorValues = alertRawValuesPracticeFirst(alert, ['GII_da', 'gii_da', 'chiave_attivita'])

  const actorCodes = actorValues
    .map(value => parseSectorCodeCandidate(value))
    .filter(Boolean)

  // Nei messaggi di workflow il settore deve riferirsi alla pratica/mittente reale.
  // Alcune attività correnti possono avere campi diretti valorizzati con GI
  // (Gestione irrigua), che è una categoria organizzativa generica e non il
  // distretto della pratica. Un distretto ricavato da un valore strutturato
  // di workflow può prevalere su GI; mai da uno username.
  const actorDistrict = actorCodes.find(code => /^D[1-6]$/.test(code) || code === 'DS' || code === 'CR') || ''

  const directValues = alertRawValuesPracticeFirst(alert, [
    'settore_cod',
    'settoreCod',
    'settore',
    'cod_settore',
    'destinatario_settore',
    '__gii_current_user_settore_cod'
  ])

  for (const value of directValues) {
    const code = parseSectorCodeCandidate(value)
    if (!code) continue
    if (code === 'GI' && actorDistrict) return actorDistrict
    return code
  }

  return actorDistrict || actorCodes[0] || ''
}

function parseAreaCodeCandidate (value: any): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const compact = raw.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '')
  if (compact === 'AMM' || compact === 'AGR' || compact === 'TEC') return compact

  const n = Number(compact)
  if (Number.isFinite(n)) return String(AREA_LABEL[n] || '').trim().toUpperCase()

  // Fallback solo per valori strutturati/compositi di workflow (es. RIA).
  // Gli username sono identificativi opachi e non devono determinare l'area.
  const spaced = raw.toUpperCase().replace(/_/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  if (/(?:^|\s)AGR(?:\s|$)/.test(spaced)) return 'AGR'
  if (/(?:^|\s)TEC(?:\s|$)/.test(spaced)) return 'TEC'
  if (/(?:^|\s)AMM(?:\s|$)/.test(spaced)) return 'AMM'

  return ''
}

function areaCodeFromAlert (alert: GiiAlertItem | null | undefined): string {
  const actorValues = alertRawValuesPracticeFirst(alert, ['GII_da', 'gii_da', 'chiave_attivita'])

  const actorArea = actorValues
    .map(value => parseAreaCodeCandidate(value))
    .find(Boolean) || ''

  if (actorArea) return actorArea

  const raw = alertPracticeRawValue(alert, ['area_cod', 'areaCod', 'area', 'cod_area', 'destinatario_area', '__gii_current_user_area_cod'])
  return parseAreaCodeCandidate(raw)
}

function areaRefFromAlert (alert: GiiAlertItem | null | undefined): string {
  const area = areaCodeFromAlert(alert)
  if (area === 'AGR') return 'Area Agraria'
  if (area === 'TEC') return 'Area Tecnico-Ambientale'
  if (area === 'AMM') return 'Area AA. GG. e P.F.'
  return ''
}

function areaShortLabelFromAlert (alert: GiiAlertItem | null | undefined): string {
  const area = areaCodeFromAlert(alert)
  if (area === 'AGR') return 'Agraria'
  if (area === 'TEC') return 'Tecnico-Ambientale'
  if (area === 'AMM') return 'AA. GG. e P.F.'
  return ''
}

function settoreFullLabelFromAlert (alert: GiiAlertItem | null | undefined): string {
  const sector = sectorCodeFromAlert(alert)
  if (!sector) return ''
  return SETTORE_FULL[sector] || sector
}

function roleCodeFromGiiActor (value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const tag = raw.split(/\s+-\s+/)[0].trim().toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')

  if (tag === 'DA') return 'DA'
  if (tag === 'RIA') return 'RIA'
  if (tag === 'IA-AMM') return 'IA'
  if (tag === 'DIR' || tag.startsWith('DIR-') || tag === 'DT' || tag.startsWith('DT-')) return 'DT'
  if (tag === 'RIT' || /^RIT-(AGR|TEC|D\d|DS|CR)$/.test(tag)) return 'RIT'
  if (tag === 'CS' || tag.startsWith('CS-')) return 'CS'
  if (tag === 'IT' || tag.startsWith('IT-')) return 'IT'
  if (tag === 'TR' || tag.startsWith('TR-')) return 'TR'

  const label = roleLabelForBody(raw).toUpperCase()
  if (label.includes('TECNICO RILEVATORE')) return 'TR'
  if (label.includes('ISTRUTTORE AMMINISTRATIVO')) return 'IA'
  if (label.includes('ISTRUTTORE TECNICO')) return 'IT'
  if (label.includes('RESPONSABILE ISTRUTTORIA AMMINISTRATIVA')) return 'RIA'
  if (label.includes('CAPO SETTORE')) return 'CS'
  if (label.includes('DIRETTORE AREA AMMINISTRATIVA')) return 'DA'
  if (label.includes('DIRETTORE D’AREA') || label.includes("DIRETTORE D'AREA")) return 'DT'

  return ''
}

function alertSenderRoleCode (alert: GiiAlertItem | null | undefined): string {
  const subtype = alertSubtypeCode(alert as any)
  const event = alertOriginEventCode(alert as any)
  const destRole = alertDestRoleCode(alert as any)

  if (alertIsNewRilevazione(alert)) return alertIsItOrigin(alert) ? 'IT' : 'TR'
  if (subtype === 'BOZZA_DETERMINAZIONE' || event === 'IA_TRASMETTE_BOZZA_DETERMINAZIONE') return 'IA'
  if (event === 'ISTRUTTORIA_TRASMESSA' && destRole === 'CS') return 'IT'

  if (alertIsNewAssignmentReceived(alert)) {
    if (destRole === 'IA') return 'RIA'
    if (destRole === 'IT') return 'CS'
  }

  if (subtype === 'RILEVAZIONE_RESPINTA' || subtype === 'CS_RESPINGE_RILEVAZIONE' || subtype === 'CS_APPROVA_RILEVAZIONE') return 'CS'
  if (subtype === 'DT_APPROVA_RAPPORTO' || subtype === 'DT_RESPINGE_RAPPORTO' || subtype === 'DT_RIMANDA_A_IT') return 'DT'
  if (subtype === 'RIT_RIMANDA_A_IT') return 'RIT'

  if (subtype.startsWith('RIA_')) return 'RIA'
  if (subtype.startsWith('IA_')) return 'IA'
  if (subtype.startsWith('DT_')) return 'DT'
  if (subtype.startsWith('RIT_')) return 'RIT'
  if (subtype.startsWith('CS_')) return 'CS'
  if (subtype.startsWith('IT_')) return 'IT'
  if (subtype.startsWith('TR_')) return 'TR'

  if (event === 'INVIO_A_IA') return 'DT'
  if (event === 'ISTRUTTORIA_TRASMESSA') {
    if (destRole === 'RIT') return 'CS'
    if (destRole === 'DT') return 'RIT'
    if (destRole === 'RIA') return 'IA'
  }

  return roleCodeFromGiiActor(
    alertSenderFromMessage(alert as any) ||
    alertSenderFallbackFromActivitySubtype(alert as any) ||
    alertSenderFallbackFromTitle(alert as any) ||
    firstNonEmptyAlertRawValue(alert, ['GII_da', 'gii_da'])
  )
}

function alertActorRoleForBody (alert: GiiAlertItem | null | undefined): string {
  const role = alertSenderRoleCode(alert)
  const office = officeRefFromAlert(alert)
  const sector = settoreFullLabelFromAlert(alert)
  const area = areaRefFromAlert(alert)

  if (role === 'TR') return office ? `tecnico rilevatore dell’${office}` : 'tecnico rilevatore'
  if (role === 'IT') return office ? `istruttore tecnico dell’${office}` : 'istruttore tecnico'
  if (role === 'CS') return sector ? `Capo Settore ${sector}` : 'Capo Settore'
  if (role === 'RIT') return area ? `Responsabile istruttoria tecnica dell’${area}` : 'Responsabile istruttoria tecnica'
  if (role === 'DT') return area ? `Direttore dell’${area}` : 'Direttore d’Area'
  if (role === 'IA') return 'Istruttore amministrativo'
  if (role === 'RIA') return 'Responsabile istruttoria amministrativa'
  if (role === 'DA') return 'Direttore Area AA. GG. e P.F.'

  return roleLabelForBody(
    alertSenderFromMessage(alert as any) ||
    alertSenderFallbackFromActivitySubtype(alert as any) ||
    alertSenderFallbackFromTitle(alert as any) ||
    alertRoleLabelFromGiiActor(firstNonEmptyAlertRawValue(alert, ['GII_da', 'gii_da']))
  )
}

function normalizeUsernameCandidate (value: any): string {
  return String(value ?? '').trim()
}

function isSenderDisplayNoise (value: any): boolean {
  const text = String(value ?? '').trim()
  if (!text) return true
  const norm = text.toUpperCase()
  if (norm === 'SURVEY' || norm === 'ARCGIS' || norm === 'SYSTEM' || norm === 'SISTEMA') return true
  return false
}

function looksLikeGiiRoleCode (value: any): boolean {
  const text = String(value ?? '').trim().toUpperCase().replace(/_/g, '-').replace(/\s+/g, ' ')
  if (!text) return false
  if (/^(TR|IT|IA|CS|RIT|RIA|DT|DA|DIR)$/.test(text)) return true
  if (/^(TR|IT|IA|CS|RIT|RIA|DT|DIR)[\s-]*(AGR|TEC|AMM|D[1-6]|DS|CR)$/.test(text)) return true
  return false
}

function looksLikeGiiRoleLabel (value: any): boolean {
  const norm = String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
  return /^(TECNICO RILEVATORE|ISTRUTTORE TECNICO|ISTRUTTORE AMMINISTRATIVO|CAPO SETTORE(?:\s+(?:D[1-6]|DS|CR))?|RESPONSABILE ISTRUTTORIA TECNICA|RESPONSABILE ISTRUTTORIA AMMINISTRATIVA|DIRETTORE D[’']AREA|DIRETTORE AREA AMMINISTRATIVA)$/.test(norm)
}

function maybePersonDisplayName (value: any): string {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!text || isSenderDisplayNoise(text)) return ''
  if (looksLikeGiiRoleLabel(text)) return ''
  if (looksLikeGiiRoleCode(text)) return ''
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(text)) return ''
  if (/^[A-Za-z0-9._-]+$/.test(text)) return ''
  return text.split(/\s+/).length >= 2 ? text : ''
}

function maybeSenderUsernameDisplay (value: any): string {
  const text = normalizeUsernameCandidate(value).trim()
  if (!text || isSenderDisplayNoise(text)) return ''
  if (looksLikeGiiRoleLabel(text)) return ''
  if (looksLikeGiiRoleCode(text)) return ''
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(text)) return ''
  return text
}

function alertTechnicianDisplayName (alert: GiiAlertItem | null | undefined): string {
  const isIt = alertIsItOrigin(alert)
  const resolved = firstNonEmptyAlertRawValue(alert, [isIt ? '__gii_istruttore_tecnico_full_name' : '__gii_tecnico_rilevatore_full_name'])
  if (resolved) return resolved

  return alertRawValuesPracticeFirst(alert, [
    'tecnico_rilevatore',
    'Tecnico_rilevatore',
    'TECNICO_RILEVATORE'
  ])
    .map(maybePersonDisplayName)
    .find(Boolean) || ''
}

function alertSenderUserCandidates (alert: GiiAlertItem | null | undefined): string[] {
  const out: string[] = []
  const push = (value: any) => {
    const text = normalizeUsernameCandidate(value)
    if (text && !isSenderDisplayNoise(text) && !out.some(v => normalizeUsernameLookupKey(v) === normalizeUsernameLookupKey(text))) out.push(text)
  }

  alertRawValues(alert, [
    '__gii_actor_username',
    'creato_da',
    'aggiornato_da',
    'utente_operatore',
    'operatore_username',
    'username_operatore',
    'Creator',
    'created_user'
  ]).forEach(push)


  return out
}

function alertSenderDisplayName (alert: GiiAlertItem): string {
  const resolved = firstNonEmptyAlertRawValue(alert, ['__gii_actor_full_name'])
  const resolvedDisplay = maybePersonDisplayName(resolved) || maybeSenderUsernameDisplay(resolved)
  if (resolvedDisplay) return String(resolvedDisplay).trim()

  if (alertIsNewRilevazione(alert)) {
    const tecnico = alertTechnicianDisplayName(alert)
    const tecnicoDisplay = maybePersonDisplayName(tecnico) || maybeSenderUsernameDisplay(tecnico)
    if (tecnicoDisplay && !isSenderDisplayNoise(tecnicoDisplay)) return String(tecnicoDisplay).trim()
  }

  const directName = alertSenderUserCandidates(alert)
    .map(maybePersonDisplayName)
    .find(Boolean)
  if (directName) return String(directName).trim()

  const username = alertSenderUserCandidates(alert)
    .map(maybeSenderUsernameDisplay)
    .find(Boolean)
  if (username) return String(username).trim()

  return ''
}

function alertSenderFromMessage (alert: GiiAlertItem): string {
  const rawMessage = firstNonEmptyAlertRawValue(alert, ['messaggio', 'message'])
  const line = String(rawMessage || '')
    .split(/\r?\n/)
    .map(v => v.trim())
    .find(v => /^(Da|Mittente)\s*:/i.test(v))
  return line ? line.replace(/^(Da|Mittente)\s*:\s*/i, '').trim() : ''
}

function alertSenderFallbackFromActivitySubtype (alert: GiiAlertItem): string {
  const subtype = String(
    firstNonEmptyAlertRawValue(alert, ['sottotipo_attivita', 'origine_evento', 'tipo_evento']) ||
    alert?.tipoAlert ||
    ''
  ).trim().toUpperCase()

  if (subtype.startsWith('DT_')) return 'Direttore d’Area'
  if (subtype.startsWith('RIA_')) return 'Responsabile Istruttoria amministrativa'
  if (subtype.startsWith('RIT_')) return 'Responsabile istruttoria tecnica'
  if (subtype.startsWith('CS_')) return 'Capo Settore'
  if (subtype.startsWith('IA_')) return 'Istruttore amministrativo'
  if (subtype.startsWith('IT_')) return 'Istruttore tecnico'
  if (subtype.startsWith('TR_')) return 'Tecnico rilevatore'
  return ''
}

function alertSenderFallbackFromTitle (alert: GiiAlertItem): string {
  const title = String(alert?.title || '').trim().toUpperCase()
  if (title.includes('DIRETTORE D’AREA') || title.includes("DIRETTORE D'AREA")) return 'Direttore d’Area'
  if (title.includes('ISTRUTTORE AMMINISTRATIVO')) return 'Istruttore amministrativo'
  if (title.includes('RESPONSABILE ISTRUTTORIA AMMINISTRATIVA')) return 'Responsabile Istruttoria amministrativa'
  return ''
}

function alertRoleLabelFromGiiActor (value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (looksLikeGiiRoleLabel(raw)) return raw
  const tag = raw.split(/\s+-\s+/)[0].trim().toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')

  if (tag === 'DA') return 'Direttore Area AA. GG. e P.F.'
  if (tag === 'RIA') return 'Responsabile Istruttoria amministrativa'
  if (tag === 'IA-AMM') return 'Istruttore amministrativo'
  if (tag === 'DIR' || tag.startsWith('DIR-') || tag === 'DT' || tag.startsWith('DT-')) return 'Direttore d’Area'
  if (tag === 'RIT' || /^RIT-(AGR|TEC|D\d|DS|CR)$/.test(tag)) return 'Responsabile istruttoria tecnica'
  if (tag === 'CS' || tag.startsWith('CS-')) return 'Capo Settore'
  if (tag === 'IT' || tag.startsWith('IT-')) return 'Istruttore tecnico'
  if (tag === 'TR' || tag.startsWith('TR-')) return 'Tecnico rilevatore'

  return ''
}

function alertSenderLine (alert: GiiAlertItem): string {
  if (!alertIsStandardWorkflowAlert(alert)) return 'Mittente: Sistema'

  const sender = alertSenderDisplayName(alert)
  if (sender) return `Mittente: ${sender}`

  // Per gli allarmi di workflow evitiamo il fallback allo username.
  // Se il nominativo non è risolto, la card resta comunque leggibile grazie
  // alle righe Qualifica e riferimento organizzativo.
  return alertSenderRoleCode(alert) ? 'Mittente: Nominativo non disponibile' : ''
}

function alertSenderQualificaLine (alert: GiiAlertItem): string {
  if (!alertIsStandardWorkflowAlert(alert)) return ''

  const role = alertSenderRoleCode(alert)
  let label = ''

  if (role === 'TR') label = 'Tecnico rilevatore'
  else if (role === 'IT') label = 'Istruttore tecnico'
  else if (role === 'CS') label = 'Capo Settore'
  else if (role === 'RIT') label = 'Responsabile istruttoria tecnica'
  else if (role === 'DT') label = 'Direttore d’Area'
  else if (role === 'IA') label = 'Istruttore amministrativo'
  else if (role === 'RIA') label = 'Responsabile istruttoria amministrativa'
  else if (role === 'DA') label = 'Direttore Area AA. GG. e P.F.'

  if (!label) {
    label = roleLabelForBody(
      alertSenderFromMessage(alert as any) ||
      alertSenderFallbackFromActivitySubtype(alert as any) ||
      alertSenderFallbackFromTitle(alert as any) ||
      alertRoleLabelFromGiiActor(firstNonEmptyAlertRawValue(alert, ['GII_da', 'gii_da']))
    )
  }

  return label ? `Qualifica: ${label}` : ''
}

function alertSenderOrgLine (alert: GiiAlertItem): string {
  if (!alertIsStandardWorkflowAlert(alert)) return ''

  const role = alertSenderRoleCode(alert)
  const office = officeLabelFromAlert(alert)
  const sector = settoreFullLabelFromAlert(alert)
  const area = areaShortLabelFromAlert(alert)

  if (role === 'TR' || role === 'IT') {
    if (sector && office) return `Settore - Ufficio: ${sector} - ${office}`
    if (sector) return `Settore: ${sector}`
    if (office) return `Ufficio: ${office}`
  }

  if (role === 'CS') {
    return sector ? `Settore: ${sector}` : ''
  }

  if (role === 'RIT' || role === 'DT') {
    return area ? `Area: ${area}` : ''
  }

  if (role === 'IA' || role === 'RIA') {
    return 'Settore: Catasto, Ruoli e Servizi Territoriali'
  }

  if (role === 'DA') {
    return 'Area: AA. GG. e P.F.'
  }

  return ''
}

function alertIsStandardWorkflowAlert (alert: GiiAlertItem): boolean {
  const subtype = alertSubtypeCode(alert)
  const event = alertOriginEventCode(alert)

  if (isGiiTakeChargeAlert(alert)) return true
  if (alertIsNewRilevazione(alert)) return true
  if (alertIsNewAssignmentReceived(alert)) return true

  if ([
    'RILEVAZIONE_RESPINTA',
    'CS_RESPINGE_RILEVAZIONE',
    'CS_APPROVA_RILEVAZIONE',
    'RICHIESTA_INTEGRAZIONE',
    'INTEGRAZIONE_TRASMESSA',
    'DT_APPROVA_RAPPORTO',
    'DT_RESPINGE_RAPPORTO',
    'DT_RIMANDA_A_IT',
    'RIT_RIMANDA_A_IT',
    'BOZZA_DETERMINAZIONE'
  ].includes(subtype)) return true

  if (event === 'ISTRUTTORIA_TRASMESSA' || event === 'INVIO_A_IA' || event === 'IA_TRASMETTE_BOZZA_DETERMINAZIONE') return true

  return false
}

function alertBodyLine (alert: GiiAlertItem): string {
  if (alertIsStandardWorkflowAlert(alert)) return ''

  const raw = String(firstNonEmptyAlertRawValue(alert, ['messaggio', 'message']) || alert?.message || '').trim()
  const report = String(alert?.reportCode || '').trim()
  if (!raw) return ''
  if (report && raw.toLowerCase() === report.toLowerCase()) return ''
  return raw
}

function attrValueCi (attrs: Record<string, any>, names: string[]): any {
  if (!attrs) return null
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(attrs, name)) return attrs[name]
  }
  const ci = new Map<string, any>()
  Object.keys(attrs).forEach(k => ci.set(k.toLowerCase(), attrs[k]))
  for (const name of names) {
    const v = ci.get(String(name || '').toLowerCase())
    if (v !== undefined) return v
  }
  return null
}

function cleanResolvedUserFullName (value: any, username?: any): string {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!text || isSenderDisplayNoise(text)) return ''
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(text)) return ''
  const user = String(username ?? '').trim()
  if (user && normalizeUsernameLookupKey(text) === normalizeUsernameLookupKey(user)) return ''
  const compactText = text.toLowerCase().replace(/[\s._-]+/g, '')
  const compactUser = user.toLowerCase().replace(/[\s._-]+/g, '')
  if (compactUser && compactText === compactUser) return ''
  return text
}

function fullNameFromGiiUserAttrs (attrs: Record<string, any>): string {
  const username = attrValueCi(attrs, ['username', 'USERNAME', 'user_name', 'agol_username'])
  const nome = cleanResolvedUserFullName(attrValueCi(attrs, ['nome', 'Nome', 'NOME', 'first_name', 'given_name', 'nome_utente', 'nome_operatore']), '')
  const cognome = cleanResolvedUserFullName(attrValueCi(attrs, ['cognome', 'Cognome', 'COGNOME', 'last_name', 'surname', 'cognome_utente', 'cognome_operatore']), '')
  const composed = cleanResolvedUserFullName(`${nome} ${cognome}`.trim(), username)
  if (composed) return composed

  return cleanResolvedUserFullName(attrValueCi(attrs, ['full_name', 'FULL_NAME', 'fullName', 'FullName', 'nome_cognome', 'nomeCompleto', 'nominativo', 'display_name', 'displayName', 'name']), username)
}

function codeFromGiiUserAttrs (attrs: Record<string, any>, codNames: string[], numNames: string[], labelMap: Record<number, string>): string {
  const rawCode = String(attrValueCi(attrs, codNames) ?? '').trim()
  if (rawCode) return rawCode.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const rawNum = attrValueCi(attrs, numNames)
  const n = Number(rawNum)
  return Number.isFinite(n) ? String(labelMap[n] || '').trim().toUpperCase() : ''
}

function roleCodeFromGiiUserAttrs (attrs: Record<string, any>): string {
  const rawCode = String(attrValueCi(attrs, ['ruolo_cod', 'ruoloCod', 'role_cod']) ?? '').trim()
  return rawCode ? rawCode.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-') : ''
}

function addLookupAliasIfWanted (out: Map<string, string>, wanted: Set<string>, alias: any, fullName: string): void {
  const text = String(alias ?? '').trim()
  if (!text || !fullName) return
  const key = normalizeUsernameLookupKey(text)
  if (key && wanted.has(key) && !out.has(key)) out.set(key, fullName)
}

function addGiiUserLookupAliases (out: Map<string, string>, wanted: Set<string>, attrs: Record<string, any>, username: string, fullName: string): void {
  addLookupAliasIfWanted(out, wanted, username, fullName)

  const role = roleCodeFromGiiUserAttrs(attrs)
  const area = codeFromGiiUserAttrs(attrs, ['area_cod', 'areaCod'], ['area'], AREA_LABEL)
  const settore = codeFromGiiUserAttrs(attrs, ['settore_cod', 'settoreCod'], ['settore'], SETTORE_LABEL)

  const addRoleAreaAliases = (suffix: string) => {
    if (!role || !suffix) return
    addLookupAliasIfWanted(out, wanted, `${role} ${suffix}`, fullName)
    addLookupAliasIfWanted(out, wanted, `${role}-${suffix}`, fullName)
    addLookupAliasIfWanted(out, wanted, `${role}_${suffix}`, fullName)
  }

  addRoleAreaAliases(settore)
  addRoleAreaAliases(area)
}

async function loadPortalUserFullNameMap (values: string[], signal?: AbortSignal): Promise<Map<string, string>> {
  const candidates = Array.from(new Set(
    (values || [])
      .map(v => String(v ?? '').trim())
      .filter(v => !!v && !looksLikeGiiRoleLabel(v) && !looksLikeGiiRoleCode(v) && !isSenderDisplayNoise(v))
  ))
  const out = new Map<string, string>()
  if (!candidates.length) return out
  throwIfHeaderAborted(signal)

  try {
    const token = await getToken()
    throwIfHeaderAborted(signal)
    if (!token) return out

    for (const username of candidates.slice(0, 60)) {
      throwIfHeaderAborted(signal)
      try {
        const url = `${GII_PORTAL}/sharing/rest/community/users/${encodeURIComponent(username)}?f=json&token=${encodeURIComponent(token)}`
        const res = await fetch(url, signal ? { signal } : undefined)
        throwIfHeaderAborted(signal)
        const json = await res.json()
        const fullName = cleanResolvedUserFullName(json?.fullName || json?.full_name || json?.name, username)
        if (fullName) out.set(normalizeUsernameLookupKey(username), fullName)
      } catch (e) {
        if (isGiiAbortError(e)) throw e
      }
    }
  } catch (e) {
    if (isGiiAbortError(e)) throw e
  }

  return out
}

const __giiUserFullNameCache = new Map<string, string | null>()

async function loadGiiUserFullNameMap (values: string[], signal?: AbortSignal): Promise<Map<string, string>> {
  const candidates = Array.from(new Set(
    (values || [])
      .map(v => String(v ?? '').trim())
      .filter(Boolean)
  ))

  const wanted = new Set(candidates.map(normalizeUsernameLookupKey).filter(Boolean))
  const out = new Map<string, string>()
  if (!wanted.size) return out
  throwIfHeaderAborted(signal)

  // Serve dalla cache tutto ciò che è già stato tentato in questa sessione di pagina,
  // trovato o meno: senza questo, ogni riconciliazione periodica rifarebbe da capo sia la
  // query completa su GII_utenti sia le chiamate individuali al profilo AGOL per ogni
  // utente — e un utente mai risolvibile (es. per permessi) veniva ritentato all'infinito.
  const stillWanted = new Set<string>()
  wanted.forEach(key => {
    if (__giiUserFullNameCache.has(key)) {
      const cached = __giiUserFullNameCache.get(key)
      if (cached) out.set(key, cached)
    } else {
      stillWanted.add(key)
    }
  })
  if (!stillWanted.size) return out

  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    throwIfHeaderAborted(signal)
    const layer = new FeatureLayer({ url: GII_UTENTI_URL })
    if (typeof layer.load === 'function') await layer.load(signal ? { signal } : undefined)
    throwIfHeaderAborted(signal)

    const fieldNameByLower = new Map<string, string>()
    ;(Array.isArray(layer?.fields) ? layer.fields : [])
      .map((f: any) => String(f?.name || '').trim())
      .filter(Boolean)
      .forEach((name: string) => fieldNameByLower.set(name.toLowerCase(), name))
    const pickFields = [
      'username', 'user_name', 'agol_username',
      'full_name', 'nome', 'cognome', 'fullName', 'nome_cognome', 'nomeCompleto', 'nominativo', 'display_name', 'displayName', 'name',
      'ruolo_cod', 'ruoloCod', 'area', 'area_cod', 'areaCod', 'settore', 'settore_cod', 'settoreCod', 'ufficio', 'id_ufficio'
    ]
      .map(f => fieldNameByLower.get(f.toLowerCase()))
      .filter((f): f is string => !!f)
    const outFields = pickFields.length ? Array.from(new Set(pickFields)) : ['*']

    let offset = 0
    const pageSize = 2000
    for (;;) {
      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = '1=1'
      q.outFields = outFields
      q.returnGeometry = false
      q.resultOffset = offset
      q.resultRecordCount = pageSize
      const res = await layer.queryFeatures(q, signal ? { signal } : undefined)
      const features = Array.isArray(res?.features) ? res.features : []

      features.forEach((f: any) => {
        const attrs = f?.attributes || {}
        const username = String(attrValueCi(attrs, ['username', 'USERNAME', 'user_name', 'agol_username']) ?? '').trim()
        const fullName = fullNameFromGiiUserAttrs(attrs)
        if (!fullName) return
        addGiiUserLookupAliases(out, stillWanted, attrs, username, fullName)
      })

      if (features.length < pageSize || out.size >= wanted.size) break
      offset += features.length
    }
  } catch (e) {
    if (isGiiAbortError(e)) throw e
  }

  throwIfHeaderAborted(signal)
  const unresolvedCandidates = candidates.filter(v => !out.has(normalizeUsernameLookupKey(v)))
  if (unresolvedCandidates.length) {
    const portalNames = await loadPortalUserFullNameMap(unresolvedCandidates, signal)
    portalNames.forEach((fullName, key) => {
      if (stillWanted.has(key) && !out.has(key)) out.set(key, fullName)
    })
  }

  stillWanted.forEach(key => {
    __giiUserFullNameCache.set(key, out.get(key) || null)
  })

  return out
}

function technicianUserCandidates (alert: GiiAlertItem, isIt: boolean): string[] {
  const usernameFields = isIt
    ? [
      'it_assegnato_username',
      'IT_ASSEGNATO_USERNAME',
      'utente_loggato',
      'Creator',
      'created_user',
      'Creator_'
    ]
    : [
      'utente_loggato',
      'Creator',
      'created_user',
      'Creator_',
      'tecnico_rilevatore_username',
      'username_tecnico_rilevatore'
    ]

  const fallbackFields = isIt
    ? [
      'it_assegnato_nome',
      'IT_ASSEGNATO_NOME',
    ]
    : [
      'tecnico_rilevatore',
      'Tecnico_rilevatore',
      'TECNICO_RILEVATORE'
    ]

  return [
    ...alertRawValuesPracticeFirst(alert, usernameFields),
    ...alertRawValuesPracticeFirst(alert, fallbackFields)
  ].map(v => normalizeUsernameCandidate(v)).filter(Boolean)
}

async function enrichAlertsWithActorFullNames (alerts: GiiAlertItem[], signal?: AbortSignal): Promise<GiiAlertItem[]> {
  const list = Array.isArray(alerts) ? alerts : []
  if (!list.length) return list

  const allCandidates: string[] = []
  list.forEach(alert => {
    alertSenderUserCandidates(alert).forEach(v => allCandidates.push(v))
    const isIt = alertIsItOrigin(alert)
    technicianUserCandidates(alert, isIt).forEach(v => allCandidates.push(v))
  })

  const fullNameByUsername = await loadGiiUserFullNameMap(allCandidates, signal)
  if (!fullNameByUsername.size) return list

  return list.map(alert => {
    const isIt = alertIsItOrigin(alert)
    const actorResolved = alertSenderUserCandidates(alert)
      .map(v => fullNameByUsername.get(normalizeUsernameLookupKey(v)))
      .find(v => !!String(v || '').trim())
    const technicianResolved = technicianUserCandidates(alert, isIt)
      .map(v => fullNameByUsername.get(normalizeUsernameLookupKey(v)))
      .find(v => !!String(v || '').trim())

    if (!actorResolved && !technicianResolved) return alert

    return {
      ...alert,
      raw: {
        ...(alert.raw || {}),
        ...(actorResolved ? { __gii_actor_full_name: actorResolved } : {}),
        ...(technicianResolved ? { [isIt ? '__gii_istruttore_tecnico_full_name' : '__gii_tecnico_rilevatore_full_name']: technicianResolved } : {})
      }
    }
  })
}

function alertPracticeLine (alert: GiiAlertItem): string {
  if (isGiiTakeChargeAlert(alert)) return String(alert.reportCode || alert.message || '').trim()
  return String(alert.message || alert.reportCode || '').trim()
}

function alertDisplayPracticeLine (alert: GiiAlertItem): string {
  // Il riferimento alla pratica deve essere sempre autonomo dal messaggio
  // dell'allarme (es. motivazione di un rimando). Preferiamo il reportCode
  // già formattato; in fallback leggiamo i campi della pratica arricchita.
  const candidates = [
    alert?.reportCode,
    firstNonEmptyAlertRawValuePracticeFirst(alert, [
      'numero_rapporto_tecnico',
      'numero_rapporto',
      'numero_rilevazione',
      'cod_pratica',
      'n_rapporto'
    ])
  ]
    .map(v => String(v ?? '').trim())
    .filter(Boolean)

  const raw = candidates[0] || ''
  const clean = raw.replace(/^Pratica\s*:\s*/i, '').trim()
  if (clean) return `Pratica: ${clean}`

  // Manteniamo comunque esplicita la riga anche nelle rare casistiche in cui
  // l'identificativo non sia disponibile, anziché lasciare il contesto ambiguo.
  return 'Pratica: —'
}

async function enrichAlertsWithPracticeMeta (alerts: GiiAlertItem[], practiceLayerUrl: string, signal?: AbortSignal): Promise<GiiAlertItem[]> {
  const list = Array.isArray(alerts) ? alerts : []
  const url = normalizeGiiFeatureLayerUrl(practiceLayerUrl)
  if (!list.length) return list
  if (!url) return list

  const objectIds = Array.from(new Set(
    list
      .map(a => Number(a?.parentObjectId))
      .filter(n => Number.isFinite(n))
  ))
  if (!objectIds.length) return list
  throwIfHeaderAborted(signal)

  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const layer = new FeatureLayer({ url })
    if (typeof layer.load === 'function') await layer.load(signal ? { signal } : undefined)
    throwIfHeaderAborted(signal)
    const oidField = String(layer?.objectIdField || 'OBJECTID')
    const byOid = new Map<number, Record<string, any>>()

    for (let i = 0; i < objectIds.length; i += 50) {
      throwIfHeaderAborted(signal)
      const chunk = objectIds.slice(i, i + 50)
      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = `${oidField} IN (${chunk.join(',')})`
      q.outFields = ['*']
      q.returnGeometry = false
      const res = await layer.queryFeatures(q, signal ? { signal } : undefined)
      ;(Array.isArray(res?.features) ? res.features : []).forEach((f: any) => {
        const attrs = { ...(f?.attributes || {}) }
        const oid = Number(attrs[oidField] ?? attrs.OBJECTID ?? attrs.objectid)
        if (Number.isFinite(oid)) byOid.set(oid, attrs)
      })
    }

    if (!byOid.size) return list

    const enriched = list.map(alert => {
      const oid = Number(alert?.parentObjectId)
      const practice = Number.isFinite(oid) ? byOid.get(oid) : null
      if (!practice) return alert
      return {
        ...alert,
        raw: {
          ...practice,
          ...(alert.raw || {}),
          __practice: practice
        }
      }
    })

    return enriched
  } catch (e) {
    if (isGiiAbortError(e)) throw e
    return list
  }
}

function materializeAlertSqlQuote (value: any): string {
  return `'${String(value ?? '').replace(/'/g, "''")}'`
}

function materializeAlertNormGid (value: any): string {
  return String(value ?? '').trim().replace(/^\{|\}$/g, '').toLowerCase()
}

function materializeAlertRealField (fields: Map<string, string>, name: string): string {
  return fields.get(String(name || '').toLowerCase()) || ''
}

function materializeAlertPick (alert: GiiAlertItem | null | undefined, names: string[]): any {
  return alertRawValue(alert, names)
}

function materializeAlertArea (alert: GiiAlertItem, user: any): string {
  const fromPractice = String(materializeAlertPick(alert, ['area_cod', 'area', 'destinatario_area']) ?? '').trim().toUpperCase()
  if (fromPractice === 'AGR' || fromPractice === 'TEC' || fromPractice === 'AMM') return fromPractice
  const fromUser = String(user?.areaCod || user?.area_cod || user?.area || '').trim().toUpperCase()
  if (fromUser === 'AGR' || fromUser === 'TEC' || fromUser === 'AMM') return fromUser
  return ''
}

function materializeAlertSector (alert: GiiAlertItem, user: any): string {
  const raw = String(materializeAlertPick(alert, ['settore_cod', 'settore', 'destinatario_settore']) ?? user?.settoreCod ?? user?.settore_cod ?? '').trim().toUpperCase()
  const m = raw.match(/^D\s*([1-6])$/)
  if (m) return `D${m[1]}`
  return raw
}


function materializeAlertDestRole (user: any): string {
  const role = String(user?.profiloCod || user?.ruoloCod || user?.role || '').trim().toUpperCase()
  if (role === 'IA' || role === 'RIA' || role === 'DA') return role
  if (role === 'ADMIN') return ''
  if (role.startsWith('DT')) return 'DT'
  if (role.startsWith('RIT') && role !== 'RIA') return 'RIT'
  if (role.startsWith('CS')) return 'CS'
  if (role.startsWith('IT')) return 'IT'
  return role.replace(/_(AGR|TEC|AMM)$/i, '')
}

function materializeAlertOfficeId (alert: GiiAlertItem, user: any): number | null {
  const raw = materializeAlertPick(alert, ['id_ufficio', 'ufficio_id', 'destinatario_ufficio_id']) ?? user?.ufficio
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function materializeAlertNumber (alert: GiiAlertItem): string {
  const text = String(alertPracticeLine(alert) || alert.reportCode || alert.message || '').trim()
  return text
    .replace(/^Rapporto\s+tecnico\s+n\.?\s*/i, '')
    .replace(/^Rapporto\s+n\.?\s*/i, '')
    .replace(/^Rapporto\s*/i, '')
    .replace(/^Rilevazione\s+n\.?\s*/i, '')
    .replace(/^Rilevazione\s*/i, '')
    .trim()
}

function materializeAlertTitle (alert: GiiAlertItem): string {
  const subtype = alertSubtypeCode(alert)
  const event = alertOriginEventCode(alert)
  if (alertIsNewRilevazione(alert)) return 'Nuova rilevazione ricevuta'
  if (subtype === 'ATTESTAZIONE_CONFORMITA_IA' || event === 'ATTESTAZIONE_CONFORMITA') return 'Attestazione di conformità apposta'
  if (subtype === 'PROPOSTA_CONTESTAZIONE_APPROVATA' || event === 'PROPOSTA_CONTESTAZIONE_APPROVATA') return 'Proposta di contestazione approvata'
  if (alertIsNewAssignmentReceived(alert)) return 'Nuova istruttoria assegnata'
  const t = String(alert?.title || '').trim()
  return t || 'Nuova istruttoria ricevuta'
}

function materializeAlertMessage (alert: GiiAlertItem): string {
  const m = String(alertPracticeLine(alert) || alert?.message || '').trim()
  return m || materializeAlertNumber(alert) || '—'
}


// Normalizzazione limitata alle sole rilevazioni create da TR tramite Survey.
// L’IT compila dal gestionale e ha già i controlli uppercase lato interfaccia.
// Qui trattiamo solo i campi testuali effettivamente presenti nel Survey TR
// per i quali il formato è funzionale: maiuscolo per anagrafica/indirizzi, minuscolo per email/PEC.
const GII_SURVEY_TR_UPPERCASE_ORIGIN_FIELD = 'origine_pratica'
const GII_SURVEY_TR_UPPERCASE_ORIGIN_VALUE = 1

const GII_SURVEY_UPPERCASE_FIELDS = [
  'nome',
  'cognome',
  'ragione_sociale',
  'codice_fiscale',
  'piva',
  'via',
  'civico',
  'citta',
  'cap'
]

const GII_SURVEY_LOWERCASE_FIELDS = [
  'email',
  'pec'
]

const GII_SURVEY_UPPERCASE_FLAG_FIELD = 'testi_normalizzati'
const GII_SURVEY_UPPERCASE_DATE_FIELD = 'dt_testi_normalizzati'
const GII_SURVEY_UPPERCASE_USER_FIELD = 'testi_normalizzati_da'

function normalizeSurveyUppercaseValue (value: any): any {
  if (value === null || value === undefined) return value
  if (typeof value !== 'string') return value
  return value.toLocaleUpperCase('it-IT')
}

function normalizeSurveyLowercaseValue (value: any): any {
  if (value === null || value === undefined) return value
  if (typeof value !== 'string') return value
  return value.trim().toLocaleLowerCase('it-IT')
}

async function normalizeSurveyUppercaseFields (args: {
  practiceLayerUrl: string
  dynamicAlerts: GiiAlertItem[]
  user: any
  signal?: AbortSignal
}): Promise<number> {
  const url = normalizeGiiFeatureLayerUrl(args.practiceLayerUrl)
  const alerts = Array.isArray(args.dynamicAlerts) ? args.dynamicAlerts : []
  if (!url || !alerts.length) return 0
  throwIfHeaderAborted(args.signal)

  const objectIds = Array.from(new Set(
    alerts
      .filter(a => isGiiTakeChargeAlert(a))
      .map(a => Number(a?.parentObjectId ?? materializeAlertPick(a, ['OBJECTID', 'objectid', 'parent_objectid'])))
      .filter(n => Number.isFinite(n))
  ))
  if (!objectIds.length) return 0

  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const layer = new FeatureLayer({ url, outFields: ['*'] })
    if (typeof layer.load === 'function') await layer.load(args.signal ? { signal: args.signal } : undefined)
    throwIfHeaderAborted(args.signal)

    const fieldMap = new Map<string, string>()
    ;(Array.isArray(layer?.fields) ? layer.fields : []).forEach((f: any) => {
      const name = String(f?.name || '').trim()
      if (name) fieldMap.set(name.toLowerCase(), name)
    })

    const flagField = materializeAlertRealField(fieldMap, GII_SURVEY_UPPERCASE_FLAG_FIELD)
    if (!flagField) return 0

    const originField = materializeAlertRealField(fieldMap, GII_SURVEY_TR_UPPERCASE_ORIGIN_FIELD)
    if (!originField) return 0

    const oidField = String(layer?.objectIdField || materializeAlertRealField(fieldMap, 'OBJECTID') || 'OBJECTID')
    const dateField = materializeAlertRealField(fieldMap, GII_SURVEY_UPPERCASE_DATE_FIELD)
    const userField = materializeAlertRealField(fieldMap, GII_SURVEY_UPPERCASE_USER_FIELD)
    const uppercaseFields = GII_SURVEY_UPPERCASE_FIELDS
      .map(name => materializeAlertRealField(fieldMap, name))
      .filter(Boolean)
    const lowercaseFields = GII_SURVEY_LOWERCASE_FIELDS
      .map(name => materializeAlertRealField(fieldMap, name))
      .filter(Boolean)

    if (!uppercaseFields.length && !lowercaseFields.length) return 0

    let changed = 0
    const chunkSize = 80
    for (let i = 0; i < objectIds.length; i += chunkSize) {
      throwIfHeaderAborted(args.signal)
      const chunk = objectIds.slice(i, i + chunkSize)
      const q = layer.createQuery ? layer.createQuery() : {}
      q.objectIds = chunk
      q.outFields = Array.from(new Set([oidField, originField, flagField, dateField, userField, ...uppercaseFields, ...lowercaseFields].filter(Boolean)))
      q.returnGeometry = false
      const res = await layer.queryFeatures(q, args.signal ? { signal: args.signal } : undefined)
      const features = Array.isArray(res?.features) ? res.features : []
      if (!features.length) continue

      const updates: any[] = []
      for (const f of features) {
        const attrs = { ...(f?.attributes || {}) }
        const oid = attrs[oidField] ?? attrs.OBJECTID ?? attrs.objectid
        if (oid === null || oid === undefined) continue

        // La normalizzazione uppercase riguarda esclusivamente le rilevazioni Survey/TR.
        // I record creati da IT non devono essere ripassati qui perché sono già vincolati
        // dal gestionale.
        const origin = Number(attrs[originField])
        if (origin !== GII_SURVEY_TR_UPPERCASE_ORIGIN_VALUE) continue

        const already = Number(attrs[flagField]) === 1

        const out: Record<string, any> = { [oidField]: oid }
        let hasTextChange = false

        for (const field of uppercaseFields) {
          const oldValue = attrs[field]
          const newValue = normalizeSurveyUppercaseValue(oldValue)
          if (typeof oldValue === 'string' && newValue !== oldValue) {
            out[field] = newValue
            hasTextChange = true
          }
        }

        for (const field of lowercaseFields) {
          const oldValue = attrs[field]
          const newValue = normalizeSurveyLowercaseValue(oldValue)
          if (typeof oldValue === 'string' && newValue !== oldValue) {
            out[field] = newValue
            hasTextChange = true
          }
        }

        // Anche se i testi erano già nel formato corretto, marchiamo il record come trattato:
        // così il controllo non continua a ripassare inutilmente sulla stessa rilevazione.
        // Se un record era già marcato ma email/PEC risultano ancora maiuscole, lo correggiamo comunque.
        if (hasTextChange || !already) {
          out[flagField] = 1
          if (dateField) out[dateField] = Date.now()
          if (userField) out[userField] = String(args.user?.username || '')
          updates.push({ attributes: out })
        }
      }

      if (updates.length) {
        throwIfHeaderAborted(args.signal)
        await layer.applyEdits({ updateFeatures: updates }, args.signal ? { signal: args.signal } : undefined)
        throwIfHeaderAborted(args.signal)
        changed += updates.length
      }
    }

    return changed
  } catch (e) {
    if (isGiiAbortError(e)) throw e
    console.warn('[GII] Normalizzazione testi Survey non riuscita:', e)
    return 0
  }
}

async function materializeMissingTakeChargeActivities (args: {
  currentActivities: GiiAlertItem[]
  dynamicAlerts: GiiAlertItem[]
  user: any
  signal?: AbortSignal
}): Promise<number> {
  const currentKeys = new Set((args.currentActivities || []).map(a => giiAlertPracticeIdentityKey(a)).filter(Boolean))
  const missing = (args.dynamicAlerts || [])
    .filter(a => isGiiTakeChargeAlert(a))
    .filter(a => {
      const key = giiAlertPracticeIdentityKey(a)
      return !!key && !currentKeys.has(key)
    })

  if (!missing.length) return 0
  throwIfHeaderAborted(args.signal)

  try {
    await ensureAttivitaCorrentiJsonOnlyQueryFormat()
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const layer = new FeatureLayer({ url: GII_ATTIVITA_CORRENTI_WRITE_URL, outFields: ['*'] })
    if (typeof layer.load === 'function') await layer.load(args.signal ? { signal: args.signal } : undefined)
    throwIfHeaderAborted(args.signal)

    const fieldMap = new Map<string, string>()
    ;(Array.isArray(layer?.fields) ? layer.fields : []).forEach((f: any) => {
      const name = String(f?.name || '').trim()
      if (name) fieldMap.set(name.toLowerCase(), name)
    })

    const oidField = String(layer?.objectIdField || materializeAlertRealField(fieldMap, 'OBJECTID') || 'OBJECTID')
    const makeAttrsForLayer = (attrs: Record<string, any>): Record<string, any> => {
      const out: Record<string, any> = {}
      Object.entries(attrs).forEach(([name, value]) => {
        const real = materializeAlertRealField(fieldMap, name)
        if (real) out[real] = value
      })
      return out
    }

    let changed = 0

    for (const alert of missing) {
      throwIfHeaderAborted(args.signal)
      const parentGlobalId = String(alert.parentGlobalId || materializeAlertPick(alert, ['globalid', 'GlobalID', 'parent_globalid']) || '').trim()
      if (!parentGlobalId) continue

      const parentObjectId = Number(alert.parentObjectId)
      const area = materializeAlertArea(alert, args.user)
      const settore = materializeAlertSector(alert, args.user)
      const ufficioId = materializeAlertOfficeId(alert, args.user)
      const role = materializeAlertDestRole(args.user)
      // La materializzazione serve per le nuove rilevazioni Survey/TR dirette al CS.
      // Per gli altri ruoli le attività correnti devono continuare a essere generate
      // dai widget operativi che chiudono/aprono i cicli.
      if (role !== 'CS') continue
      const eventMs = alertEventDateMs(alert) ?? Date.now()
      const numero = materializeAlertNumber(alert)
      const key = `${materializeAlertNormGid(parentGlobalId)}|PRESA_IN_CARICO|NUOVA_RILEVAZIONE|${role}|${area}|${settore}|${ufficioId ?? ''}`

      const attrs = makeAttrsForLayer({
        chiave_attivita: key,
        parent_globalid: parentGlobalId,
        parent_objectid: Number.isFinite(parentObjectId) ? parentObjectId : null,
        numero_rapporto: numero,
        tipo_attivita: 'PRESA_IN_CARICO',
        sottotipo_attivita: 'NUOVA_RILEVAZIONE',
        titolo: materializeAlertTitle(alert),
        messaggio: materializeAlertMessage(alert),
        destinatario_ruolo: role,
        destinatario_area: area || null,
        destinatario_settore: settore || null,
        destinatario_ufficio_id: ufficioId,
        destinatario_ufficio_zona: materializeAlertPick(alert, ['ufficio_zona', 'destinatario_ufficio_zona']) || null,
        destinatario_username: null,
        origine_evento: 'NUOVA_RILEVAZIONE_SURVEY',
        priorita: 'INFO',
        data_attivazione: eventMs,
        creato_il: eventMs,
        creato_da: String(materializeAlertPick(alert, ['utente_loggato', 'Creator', 'created_user']) || 'survey'),
        aggiornato_il: Date.now(),
        aggiornato_da: String(args.user?.username || '')
      })

      const clauses: string[] = []
      const fKey = materializeAlertRealField(fieldMap, 'chiave_attivita')
      if (fKey) clauses.push(`${fKey} = ${materializeAlertSqlQuote(key)}`)
      const fParentGid = materializeAlertRealField(fieldMap, 'parent_globalid')
      const fTipo = materializeAlertRealField(fieldMap, 'tipo_attivita')
      const fRole = materializeAlertRealField(fieldMap, 'destinatario_ruolo')
      if (fParentGid && fTipo && fRole) {
        const gid = materializeAlertNormGid(parentGlobalId)
        clauses.push(`(LOWER(${fParentGid}) = ${materializeAlertSqlQuote(gid)} OR LOWER(${fParentGid}) = ${materializeAlertSqlQuote(`{${gid}}`)}) AND ${fTipo} = 'PRESA_IN_CARICO' AND ${fRole} = '${role}'`)
      }
      if (!clauses.length) continue

      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = clauses.map(c => `(${c})`).join(' OR ')
      q.outFields = [oidField]
      q.returnGeometry = false
      q.num = 1
      const found = await layer.queryFeatures(q, args.signal ? { signal: args.signal } : undefined)
      const existing = found?.features?.[0]?.attributes || null
      const existingOid = existing?.[oidField] ?? existing?.OBJECTID ?? existing?.objectid
      throwIfHeaderAborted(args.signal)
      if (existingOid != null) {
        await layer.applyEdits({ updateFeatures: [{ attributes: { [oidField]: existingOid, ...attrs } }] }, args.signal ? { signal: args.signal } : undefined)
      } else {
        await layer.applyEdits({ addFeatures: [{ attributes: attrs }] }, args.signal ? { signal: args.signal } : undefined)
      }
      throwIfHeaderAborted(args.signal)
      changed += 1
    }

    return changed
  } catch (e) {
    if (isGiiAbortError(e)) throw e
    console.warn('[GII_ATTIVITA_CORRENTI] Materializzazione allarmi da FL non riuscita:', e)
    return 0
  }
}

function sortAlertsForPopup (alerts: GiiAlertItem[]): GiiAlertItem[] {
  const list = Array.isArray(alerts) ? alerts.slice() : []
  const severityRank: Record<string, number> = { red: 0, orange: 1, blue: 2, gray: 3 }

  return list.sort((a, b) => {
    const da = alertEventDateMs(a)
    const db = alertEventDateMs(b)
    if (da != null || db != null) {
      if (da == null) return 1
      if (db == null) return -1
      if (db !== da) return db - da
    }

    const sr = (severityRank[a?.severity || ''] ?? 9) - (severityRank[b?.severity || ''] ?? 9)
    if (sr) return sr

    const ta = a?.termineData ?? Number.MAX_SAFE_INTEGER
    const tb = b?.termineData ?? Number.MAX_SAFE_INTEGER
    return ta - tb
  })
}

function alertToneColor (tone: 'none' | 'red' | 'orange' | 'blue'): string {
  if (tone === 'red') return '#dc2626'
  if (tone === 'orange') return '#f97316'
  if (tone === 'blue') return '#2563eb'
  return 'rgba(148,163,184,0.7)'
}

function normalizePageId (value: any): string {
  return String(value || '').trim()
}

function currentPageIdFromUrl (): string {
  try {
    const hash = String(window.location.hash || '')

    // Experience Builder può esporre la pagina sia come parametro
    // (?page=page_14 / #page=page_14) sia come hash path (#/page/page_14).
    const mHashPath = hash.match(/(?:^|#|\/)page\/([^/?#&]+)/i)
    if (mHashPath?.[1]) return decodeURIComponent(mHashPath[1])

    const mHashParam = hash.match(/(?:[?&#]|^)(?:page|pageid)=([^&]+)/i)
    if (mHashParam?.[1]) return decodeURIComponent(mHashParam[1])

    const u = new URL(window.location.href)
    const qPage = u.searchParams.get('page') || u.searchParams.get('pageid') || ''
    if (qPage) return qPage

    const mPath = u.pathname.match(/\/page\/([^/?#&]+)/i)
    if (mPath?.[1]) return decodeURIComponent(mPath[1])
  } catch { }
  return ''
}

function sectionForAlert (tipo: string): string {
  const t = String(tipo || '').toUpperCase()
  if (t.includes('PAGAMENTO')) return 'pagamento'
  if (t.includes('RICORSO')) return 'ricorso'
  if (t.includes('DEFINIRE')) return 'definizione'
  return 'atto'
}

function storeAlertEditIntent (alert: GiiAlertItem, layerUrl: string): void {
  const section = sectionForAlert(alert.tipoAlert)
  const raw = alert.raw || {}
  const rawGid = String((raw as any)?.GlobalID || (raw as any)?.globalid || '').trim().replace(/^\{|\}$/g, '').toLowerCase()
  const alertGid = String(alert.parentGlobalId || '').trim().replace(/^\{|\}$/g, '').toLowerCase()
  const rawOid = Number((raw as any)?.OBJECTID ?? (raw as any)?.objectid)
  const isPracticeRaw = (!!rawGid && !!alertGid && rawGid === alertGid) || (Number.isFinite(rawOid) && alert.parentObjectId != null && rawOid === Number(alert.parentObjectId))
  const currentUser: any = (window as any).__giiUserRole || {}
  const requestedByUsername = String(currentUser?.username || '').trim().toLowerCase()
  const requestedByRole = normCode(currentUser?.profiloCod || currentUser?.ruoloCod || currentUser?.ruolo_cod || '')
  const requestedByArea = normCode(currentUser?.areaCod || currentUser?.area_cod || '')
  const requestedBySettore = normCode(currentUser?.settoreCod || currentUser?.settore_cod || '')
  const requestedByUfficio = currentUser?.ufficio != null && currentUser?.ufficio !== '' ? String(currentUser.ufficio).trim() : ''

  const intent = stampGiiPracticePayload({
    oid: alert.parentObjectId,
    parentObjectId: alert.parentObjectId,
    parentGlobalId: alert.parentGlobalId || '',
    reportCode: alert.reportCode || '',
    alertKey: alert.alertKey || '',
    tipoAlert: alert.tipoAlert || '',
    idFieldName: 'OBJECTID',
    layerUrl,
    data: isPracticeRaw ? raw : null,
    ts: Date.now(),
    source: 'gii-alerts',
    requestedByUsername,
    requestedByRole,
    requestedByArea,
    requestedBySettore,
    requestedByUfficio
  })

  writeGiiPracticeSelectionContext()
  try { (window as any).__giiEdit = intent } catch {}
  try { window.sessionStorage.setItem('GII_EDIT_INTENT', JSON.stringify(intent)) } catch {}
  try { window.sessionStorage.setItem('GII_OPEN_PRACTICE_INTENT', JSON.stringify(intent)) } catch {}
  try { window.sessionStorage.setItem('GII_OPEN_PRACTICE_REQUESTED', '1') } catch {}
  try { window.sessionStorage.setItem('GII_SELECTED_OID', String(alert.parentObjectId ?? '')) } catch {}
  try { window.sessionStorage.setItem('GII_SELECTED_GLOBALID', alert.parentGlobalId || '') } catch {}
  try { window.sessionStorage.setItem('GII_SELECTED_REPORT_CODE', alert.reportCode || '') } catch {}
  try { window.sessionStorage.setItem('GII_SELECTED_IDFIELD', 'OBJECTID') } catch {}
  try { window.sessionStorage.setItem('GII_SELECTED_LAYER_URL', layerUrl || '') } catch {}
  if (isPracticeRaw) {
    try { window.sessionStorage.setItem('GII_SELECTED_DATA', JSON.stringify(raw)) } catch {}
  } else {
    try { window.sessionStorage.removeItem('GII_SELECTED_DATA') } catch {}
  }
  try { window.sessionStorage.setItem('GII_REQUESTED_EDIT_SECTION', section) } catch {}
  try { window.sessionStorage.setItem('GII_EDIT_TAB', section) } catch {}
  try { window.dispatchEvent(new CustomEvent('gii-edit-intent-changed', { detail: intent })) } catch {}
  try { window.dispatchEvent(new CustomEvent('gii-open-practice-intent', { detail: intent })) } catch {}
  try { window.dispatchEvent(new CustomEvent('gii-selection-changed', { detail: intent })) } catch {}
  try { window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section } })) } catch {}
}

function AlertBellButton (props: { counts: GiiAlertQueryResult['counts'], loading: boolean, error: string, onClick: () => void }) {
  const tone = getGiiAlertBellTone(props.counts)
  const total = props.counts?.total || 0
  // Durante il cambio account la campanella deve restare nascosta finché gli
  // allarmi del nuovo profilo non sono stati caricati. In caso contrario React
  // continuerebbe a mostrare per qualche istante il conteggio dell'utente precedente.
  if (props.loading || (total <= 0 && !props.error)) return null
  const color = props.error ? '#dc2626' : alertToneColor(tone)
  return (
    <button
      type='button'
      title={props.error ? `Errore allarmi: ${props.error}` : `${total} allarmi attivi`}
      onClick={props.onClick}
      style={{
        position: 'relative',
        width: 42,
        height: 42,
        borderRadius: 14,
        border: `1px solid ${color}66`,
        background: `${color}22`,
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: tone === 'red' ? `0 0 0 3px ${color}22` : undefined,
        fontSize: 20,
        flex: '0 0 auto'
      }}
    >
      <span
        aria-hidden='true'
        style={{
          display: 'inline-block',
          transformOrigin: '50% 12%',
          animationName: !props.error && total > 0 ? 'gii-alert-bell-ring' : undefined,
          animationDuration: '3s',
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out'
        }}
      >🔔</span>
      {total > 0 && (
        <span style={{
          position: 'absolute',
          top: -5,
          right: -5,
          minWidth: 18,
          height: 18,
          padding: '0 5px',
          borderRadius: 999,
          background: color,
          color: '#fff',
          fontSize: 10,
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1
        }}>{total > 99 ? '99+' : total}</span>
      )}
    </button>
  )
}

function HeaderAlertsPopup (props: {
  alerts: GiiAlertItem[]
  counts: GiiAlertQueryResult['counts']
  loading: boolean
  error: string
  archivingKey: string
  right: number
  homeMode?: boolean
  onClose: () => void
  onOpenPractice: (alert: GiiAlertItem) => void
  onArchive: (alert: GiiAlertItem) => void
}) {
  const popupAlerts = sortAlertsForPopup(props.alerts || [])
  const [priorityLegendKey, setPriorityLegendKey] = React.useState<string>('')
  const popup = (
    <div
      data-gii-global-alert-popup='1'
      style={{ position: 'fixed', inset: 0, zIndex: 2147483646, pointerEvents: 'none' }}
    >
      <div style={{ position: 'absolute', right: props.right, top: 82, width: 430, maxWidth: 'calc(100vw - 28px)', maxHeight: 'calc(100vh - 110px)', overflow: 'hidden', borderRadius: 16, background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 24px 70px rgba(0,0,0,0.45)', color: '#e5e7eb', backdropFilter: 'blur(14px)', pointerEvents: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.10)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Allarmi e scadenze</div>
            <div style={{ color: 'rgba(203,213,225,0.75)', fontSize: 14, marginTop: 2 }}>
              {props.counts.total} attivi · {props.counts.scaduti + props.counts.critici} scaduti/critici · {props.counts.inScadenza} in scadenza
            </div>
          </div>
          <button type='button' onClick={props.onClose} style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', borderRadius: 9, padding: '6px 9px', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>Chiudi</button>
        </div>
        <div style={{ padding: 12, overflowY: 'auto', maxHeight: 'calc(100vh - 190px)', display: 'grid', gap: 10 }}>
          {props.error && <div style={{ border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(127,29,29,0.35)', color: '#fecaca', borderRadius: 10, padding: 10, fontSize: 14 }}>{props.error}</div>}
          {!props.loading && !props.error && props.alerts.length === 0 && props.counts.total <= 0 && (
            <div style={{ color: '#cbd5e1', fontSize: 15, padding: 10 }}>Nessun allarme attivo.</div>
          )}
          {popupAlerts.map(alert => {
            const color = alertToneColor(alert.severity === 'red' ? 'red' : alert.severity === 'orange' ? 'orange' : 'blue')
            const eventDate = alertEventDateMs(alert)
            const bodyLine = alertBodyLine(alert)
            const senderLine = alertSenderLine(alert)
            const qualificaLine = alertSenderQualificaLine(alert)
            const orgLine = alertSenderOrgLine(alert)
            const practiceLine = alertDisplayPracticeLine(alert)
            const isStandardWorkflow = alertIsStandardWorkflowAlert(alert)
            const showMeta = alert.termineData != null && !isStandardWorkflow
            const metaLineStyle: React.CSSProperties = { fontSize: 14, color: '#cbd5e1', lineHeight: 1.35, marginTop: 3, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'normal' }
            return (
              <div key={alert.alertKey} style={{ border: `1px solid ${color}66`, background: `${color}16`, borderRadius: 12, padding: 11 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
                  <div
                    style={{ position: 'relative', marginTop: 4, flex: '0 0 auto', width: 10, height: 10 }}
                    onMouseEnter={() => setPriorityLegendKey(alert.alertKey)}
                    onMouseLeave={() => setPriorityLegendKey('')}
                    aria-label='Legenda priorità allarme'
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 0 2px ${color}22`, cursor: 'help' }} />
                    {priorityLegendKey === alert.alertKey && (
                      <div
                        role='tooltip'
                        style={{
                          position: 'absolute',
                          left: 18,
                          top: -9,
                          width: 188,
                          padding: '10px 11px',
                          borderRadius: 10,
                          background: 'rgba(15,23,42,0.985)',
                          border: '1px solid rgba(255,255,255,0.16)',
                          boxShadow: '0 12px 30px rgba(0,0,0,0.38)',
                          color: '#e5e7eb',
                          zIndex: 30,
                          pointerEvents: 'none'
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, color: '#fff', marginBottom: 7, letterSpacing: 0.1 }}>Priorità allarme</div>
                        {[
                          { tone: 'blue', label: 'Informativo' },
                          { tone: 'orange', label: 'Attenzione' },
                          { tone: 'red', label: 'Criticità' }
                        ].map(item => {
                          const itemColor = alertToneColor(item.tone)
                          return (
                            <div key={item.tone} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 20, fontSize: 12.5, color: '#cbd5e1' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: itemColor, flex: '0 0 auto' }} />
                              <span>{item.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'normal', lineHeight: 1.25 }}>{alertDisplayTitle(alert)}</div>
                    <div style={metaLineStyle}>{practiceLine}</div>
                    {bodyLine && (
                      <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.35, marginTop: 3, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'normal' }}>{bodyLine}</div>
                    )}
                    {showMeta && (
                      <div style={metaLineStyle}>
                        Termine: {formatAlertDate(alert.termineData)}
                      </div>
                    )}
                    {senderLine && (
                      <div style={metaLineStyle}>
                        {senderLine}
                      </div>
                    )}
                    {qualificaLine && (
                      <div style={metaLineStyle}>
                        {qualificaLine}
                      </div>
                    )}
                    {orgLine && (
                      <div style={metaLineStyle}>
                        {orgLine}
                      </div>
                    )}
                    {eventDate != null && (
                      <div style={metaLineStyle}>
                        Data evento: {formatAlertDateTime(eventDate)}
                      </div>
                    )}
                    <div style={{ marginTop: 9, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type='button' onClick={() => props.onOpenPractice(alert)} style={{ border: `1px solid ${color}88`, background: `${color}33`, color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14, fontWeight: 850 }}>Apri pratica</button>
                      {!props.homeMode && !isGiiTakeChargeAlert(alert) && (

                        <button type='button' disabled={props.archivingKey === alert.alertKey} onClick={() => props.onArchive(alert)} style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: props.archivingKey === alert.alertKey ? '#94a3b8' : '#e5e7eb', borderRadius: 8, padding: '6px 10px', cursor: props.archivingKey === alert.alertKey ? 'wait' : 'pointer', fontSize: 14, fontWeight: 800 }}>{props.archivingKey === alert.alertKey ? 'Archiviazione…' : 'Archivia'}</button>

                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(popup, document.body)
  }

  return popup
}

type Props = AllWidgetProps<IMConfig>

export default function Widget(props: Props) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }

  // ── Refs configurazione (per usare i valori aggiornati negli handler registrati una sola volta)
  const afterInRef  = React.useRef<string>(String(cfg.redirectAfterSignIn ?? ''))
  const afterOutRef = React.useRef<string>(String(cfg.redirectAfterSignOut ?? ''))
  const signedInClickRef = React.useRef<'signout'|'menu'>((cfg.signedInClick ?? 'signout') as any)

  React.useEffect(() => { afterInRef.current  = String(cfg.redirectAfterSignIn ?? '') }, [cfg.redirectAfterSignIn])
  React.useEffect(() => { afterOutRef.current = String(cfg.redirectAfterSignOut ?? '') }, [cfg.redirectAfterSignOut])
  React.useEffect(() => { signedInClickRef.current = (cfg.signedInClick ?? 'signout') as any }, [cfg.signedInClick])

  // Il layer operativo della Mappa deve usare JSON: con PBF la vista
  // GII_INFRAZIONI_VIEW_ALL puo' restituire HTTP 400, lasciando vuota anche
  // la FeatureTable collegata allo stesso DataSource.
  React.useEffect(() => {
    void ensureInfrazioniViewAllJsonOnlyQueryFormat()
  }, [])


  const [user,     setUser]    = React.useState<GiiUserRole | null>(null)
  const [uLoad,    setULoad]   = React.useState(true)
  const [signingIn,setSigning] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [assignmentsOpen, setAssignmentsOpen] = React.useState(false)
  const accountBtnRef = React.useRef<HTMLButtonElement>(null)
  const accountMenuRef = React.useRef<HTMLDivElement>(null)
  const roleBtnRef = React.useRef<HTMLButtonElement>(null)
  const assignmentsMenuRef = React.useRef<HTMLDivElement>(null)
  const userBannerRef = React.useRef<HTMLDivElement>(null)
  const [accountMenuPos, setAccountMenuPos] = React.useState<{ top: number, right: number }>({ top: 0, right: 0 })
  const [assignmentsMenuPos, setAssignmentsMenuPos] = React.useState<{ top: number, right: number }>({ top: 0, right: 0 })
  const [alertsPanelRight, setAlertsPanelRight] = React.useState(18)

  const getUserBannerRightOffset = React.useCallback(() => {
    const bannerRect = userBannerRef.current?.getBoundingClientRect()
    return bannerRect ? Math.max(8, window.innerWidth - bannerRect.right) : 18
  }, [])
  const [urlTick, setUrlTick] = React.useState(0)
  const [alerts, setAlerts] = React.useState<GiiAlertItem[]>([])
  const alertCounts = React.useMemo(() => summarizeGiiAlerts(alerts), [alerts])
  const [alertsLoading, setAlertsLoading] = React.useState(false)
  const [alertsError, setAlertsError] = React.useState('')
  const [profileSyncError, setProfileSyncError] = React.useState('')
  const [alertsOpen, setAlertsOpen] = React.useState(false)
  const [archivingAlertKey, setArchivingAlertKey] = React.useState('')
  const guardLockRef = React.useRef(false)
  const alertsAccountGenerationRef = React.useRef(0)
  const alertsCurrentUsernameRef = React.useRef('')
  const alertsLoadedGenerationRef = React.useRef(-1)
  const alertsBackgroundRefreshRef = React.useRef<{ generation: number, username: string } | null>(null)
  const alertsAbortControllerRef = React.useRef<AbortController | null>(null)
  const alertsRef = React.useRef<GiiAlertItem[]>([])
  const alertsOptimisticRevisionRef = React.useRef(0)
  const alertsLightSequenceRef = React.useRef(0)
  const alertsCurrentActivitiesSignatureRef = React.useRef('')
  const alertsLastBackgroundStartRef = React.useRef(0)
  const takeChargeTombstonesRef = React.useRef<Map<string, GiiTakeChargeTombstone>>(new Map())
  const locallyArchivedAlertKeysRef = React.useRef<Set<string>>(new Set())
  const alertsAuthTransitionRef = React.useRef(false)
  const profileSyncRetryTimerRef = React.useRef<number | null>(null)
  const accountSwitchInProgressRef = React.useRef(false)
  const userRef = React.useRef<GiiUserRole | null>(null)

  React.useEffect(() => {
    userRef.current = user
  }, [user])

  React.useEffect(() => {
    alertsRef.current = alerts
  }, [alerts])

  React.useEffect(() => {
    let cancelled = false
    let hCreate: any = null

    let refreshSequence = 0

    const clearProfileSyncRetryTimer = () => {
      if (profileSyncRetryTimerRef.current != null) {
        window.clearTimeout(profileSyncRetryTimerRef.current)
        profileSyncRetryTimerRef.current = null
      }
    }

    const refresh = async (reason: string, attempt = 0) => {
      const sequence = ++refreshSequence
      const isFallbackRetry = reason === 'profile-sync-fallback'
      if (!isFallbackRetry) setULoad(true)

      const u = await loadUser()
      if (cancelled || sequence !== refreshSequence) return

      const activeUsername = getActiveSessionUsername()
      const loadedUsername = normalizeAuthUsername(u?.username)
      const profileMatchesSession = !activeUsername || (!!u && loadedUsername === activeUsername)

      // Durante il cambio account la sessione OAuth e il profilo GII non diventano
      // disponibili nello stesso istante. Non pubblichiamo mai un profilo appartenente
      // a un username diverso dalla sessione principale, perché selezionerebbe i layer
      // AGR/TEC/AMM sbagliati con il token del nuovo utente.
      if (!profileMatchesSession) {
        clearGiiUserRoleCache()

        if (attempt < 20) {
          clearProfileSyncRetryTimer()
          profileSyncRetryTimerRef.current = window.setTimeout(() => refresh(reason, attempt + 1), 100)
        } else {
          // Fallimento esplicito e recuperabile: non lasciamo il precedente profilo
          // associato alla nuova sessione e non riattiviamo gli allarmi con ruolo/area
          // non coerenti. Un solo retry differito riparte autonomamente ogni 5 secondi.
          alertsAuthTransitionRef.current = true
          try { alertsAbortControllerRef.current?.abort() } catch { }
          alertsAbortControllerRef.current = null
          alertsBackgroundRefreshRef.current = null

          setUser(null)
          setAlerts([])
          setAlertsError('')
          setAlertsOpen(false)
          setAlertsLoading(false)
          setULoad(false)
          setProfileSyncError('Impossibile completare il caricamento del profilo utente. Gli allarmi sono temporaneamente sospesi; il sistema riproverà automaticamente.')

          clearProfileSyncRetryTimer()
          profileSyncRetryTimerRef.current = window.setTimeout(() => refresh('profile-sync-fallback', 0), 5000)
        }
        return
      }

      clearProfileSyncRetryTimer()
      setProfileSyncError('')
      setUser(u)
      setULoad(false)
      dispatchGiiUserLoaded({ source: 'header-boot', reason, username: u?.username || '' })
    }

    const onExternal = (ev: any) => {
      if (ev?.detail?.source === 'header-boot') return
      refresh('event')
    }

    // Primo bootstrap (mount)
    refresh('mount')
    window.addEventListener('gii:userLoaded', onExternal)


    // Login/logout tramite widget standard: ascoltiamo IdentityManager
    loadEsriModule<any>('esri/identity/IdentityManager')
      .then((esriId) => {
        if (cancelled || !esriId?.on) return
        try {
          hCreate = esriId.on('credential-create', () => {
            // switchAccount() è gestito dal relativo handler: durante quel flusso
            // IdentityManager può creare più credenziali intermedie.
            if (accountSwitchInProgressRef.current) return

            const activeUsername = getActiveSessionUsername()
            const currentUsername = normalizeAuthUsername(userRef.current?.username)

            // Le credenziali dei singoli servizi vengono create anche durante il
            // normale utilizzo. Se l'identità principale non è cambiata, non dobbiamo
            // ricaricare il profilo né interrompere gli allarmi.
            if (!activeUsername || activeUsername === currentUsername) return

            alertsAuthTransitionRef.current = true
            try { alertsAbortControllerRef.current?.abort() } catch { }
            alertsAbortControllerRef.current = null
            alertsBackgroundRefreshRef.current = null

            clearGiiUserRoleCache()
            refresh('credential-create')

            try {
              const tok = String(afterInRef.current || '').trim()
              if (tok) gotoPage(tok)
            } catch { }
          })

        } catch { }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      window.removeEventListener('gii:userLoaded', onExternal)
      clearProfileSyncRetryTimer()
      try { hCreate?.remove?.() } catch { }
      try { alertsAbortControllerRef.current?.abort() } catch { }
      alertsAbortControllerRef.current = null
    }
  }, [])
  React.useEffect(() => {
    if (!user) {
      setMenuOpen(false)
      setAssignmentsOpen(false)
    }
  }, [user])

  React.useEffect(() => {
    if (!menuOpen && !assignmentsOpen) return
    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target as Node | null
      if (!target) return
      if (accountBtnRef.current?.contains(target)) return
      if (roleBtnRef.current?.contains(target)) return
      if (accountMenuRef.current?.contains(target)) return
      if (assignmentsMenuRef.current?.contains(target)) return
      setMenuOpen(false)
      setAssignmentsOpen(false)
    }
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setMenuOpen(false)
        setAssignmentsOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, assignmentsOpen])
  React.useEffect(() => {
    const username = String(user?.username || '').trim()
    if (!username) return
    syncGiiPracticeContextUsername(username)
  }, [user?.username])
  React.useEffect(() => {
    const username = String(user?.username || '').trim().toLowerCase()
    const shouldLoadAlerts = !!username && (cfg.alertsEnabled ?? true) && canUseGiiAlerts(user)

    // Ogni cambio identità annulla realmente le richieste del profilo precedente.
    // Ignorare soltanto il loro risultato non basta: una richiesta AGR rimasta viva,
    // quando subentra un account AMM, può far registrare a ExB una falsa risorsa
    // priva di credenziali e mostrare il relativo banner.
    try { alertsAbortControllerRef.current?.abort() } catch { }
    const controller = shouldLoadAlerts ? new AbortController() : null
    alertsAbortControllerRef.current = controller
    alertsAuthTransitionRef.current = !!profileSyncError

    alertsCurrentUsernameRef.current = username
    alertsAccountGenerationRef.current += 1
    alertsLoadedGenerationRef.current = -1
    alertsBackgroundRefreshRef.current = null
    alertsOptimisticRevisionRef.current += 1
    alertsLightSequenceRef.current += 1
    alertsCurrentActivitiesSignatureRef.current = ''
    alertsLastBackgroundStartRef.current = 0
    takeChargeTombstonesRef.current.clear()
    locallyArchivedAlertKeysRef.current.clear()
    alertsRef.current = []
    setAlerts([])
    setAlertsError('')
    setAlertsOpen(false)
    setAlertsLoading(shouldLoadAlerts)

    return () => {
      if (alertsAbortControllerRef.current === controller) {
        try { controller?.abort() } catch { }
        alertsAbortControllerRef.current = null
      }
    }
  }, [
    cfg.alertsEnabled,
    user?.username,
    user?.profiloCod,
    user?.ruoloCod,
    JSON.stringify((user?.assignments || []).map((a: any) => [a.profiloCod, a.ruoloCod, a.areaCod, a.settoreCod, a.ufficio])),
    user?.areaCod,
    user?.settoreCod,
    user?.ufficio,
    user?.isWorkflowAdmin,
    profileSyncError
  ])

  React.useEffect(() => {
    const onUrl = () => {
      setUrlTick(t => t + 1)
    }
    window.addEventListener('hashchange', onUrl)
    window.addEventListener('popstate', onUrl)
    return () => {
      window.removeEventListener('hashchange', onUrl)
      window.removeEventListener('popstate', onUrl)
    }
  }, [])


  const currentPageId = React.useMemo(() => currentPageIdFromUrl(), [urlTick])
  const configuredHomePage = normalizePageId(cfg.alertsHomePage)
  const isAlertsHomePage = !!configuredHomePage && currentPageId === configuredHomePage
  const canReadGiiAlerts = canUseGiiAlerts(user)
  const showHeaderAlertBell = (cfg.alertsEnabled ?? true) && !!user && canReadGiiAlerts

  const filterAlertsWithLocalGuards = React.useCallback((
    items: GiiAlertItem[],
    source: 'current' | 'dynamic'
  ): GiiAlertItem[] => {
    const now = Date.now()
    const tombstones = takeChargeTombstonesRef.current
    const archivedKeys = locallyArchivedAlertKeysRef.current

    for (const [practiceKey, tombstone] of Array.from(tombstones.entries())) {
      if (tombstone.expiresAt <= now) tombstones.delete(practiceKey)
    }

    let filtered = (Array.isArray(items) ? items : []).filter(alert => {
      const key = normalizeGiiAlertKey(alert?.alertKey)
      return !key || !archivedKeys.has(key)
    })

    const mustSuppressForTombstone = (alert: GiiAlertItem, practiceKey: string, tombstone: GiiTakeChargeTombstone): boolean => {
      if (!isGiiTakeChargeAlert(alert) || alertPracticeMergeKey(alert) !== practiceKey) return false

      const key = normalizeGiiAlertKey(alert?.alertKey)
      if (!tombstone.suppressAllPreviousActivities) {
        // Se conosciamo le chiavi eliminate, proteggiamo soltanto quelle. Una
        // nuova attività della stessa pratica, con chiave diversa, resta visibile.
        return !key || tombstone.deletedAlertKeys.has(key)
      }

      // Fallback usato solo quando la cancellazione non ha restituito la chiave.
      // Un'attività attivata dopo la mutazione locale è sicuramente un nuovo nodo
      // del workflow e non deve essere nascosta insieme a quella precedente.
      const activationMs = alertEventDateMs(alert)
      return activationMs == null || activationMs <= tombstone.resolvedAt
    }

    for (const [practiceKey, tombstone] of Array.from(tombstones.entries())) {
      const suppressedMatches = filtered.filter(alert =>
        mustSuppressForTombstone(alert, practiceKey, tombstone)
      )

      if (source === 'current') {
        if (suppressedMatches.length === 0) {
          tombstone.currentAbsentConfirmations += 1
        } else {
          tombstone.currentAbsentConfirmations = 0
        }

        filtered = filtered.filter(alert =>
          !mustSuppressForTombstone(alert, practiceKey, tombstone)
        )
        continue
      }

      // Il fallback dinamico puo' produrre una nuova attività della stessa pratica:
      // anche qui vengono soppresse soltanto la vecchia chiave (o le attività nate
      // prima della risoluzione quando la chiave non era disponibile).
      filtered = filtered.filter(alert =>
        !mustSuppressForTombstone(alert, practiceKey, tombstone)
      )

      if (tombstone.currentAbsentConfirmations >= 2 && suppressedMatches.length === 0) {
        tombstones.delete(practiceKey)
      }
    }

    return sortAlertsForPopup(filtered)
  }, [])

  const registerTakeChargeResolution = React.useCallback((detail: any) => {
    const deletedActivities = Array.isArray(detail?.deletedActivities)
      ? detail.deletedActivities
      : []
    const candidates = new Map<string, Set<string>>()

    const addCandidate = (practiceKey: string, alertKey: any) => {
      if (!practiceKey) return
      const keys = candidates.get(practiceKey) || new Set<string>()
      const normalizedKey = normalizeGiiAlertKey(alertKey)
      if (normalizedKey) keys.add(normalizedKey)
      candidates.set(practiceKey, keys)
    }

    for (const item of deletedActivities) {
      addCandidate(
        giiPracticeKeyFromIdentity(item?.parentGlobalId, item?.parentObjectId),
        item?.alertKey
      )
    }

    for (const alert of alertsRef.current) {
      if (!isGiiTakeChargeAlert(alert)) continue
      const sameOid = detail?.oid != null && String(alert?.parentObjectId) === String(detail.oid)
      const detailGid = String(detail?.parentGlobalId || '').trim().replace(/^\{|\}$/g, '').toLowerCase()
      const alertGid = String(alert?.parentGlobalId || '').trim().replace(/^\{|\}$/g, '').toLowerCase()
      if (!sameOid && (!detailGid || detailGid !== alertGid)) continue
      addCandidate(alertPracticeMergeKey(alert), alert?.alertKey)
    }

    // Solo una cancellazione integralmente confermata può attivare il fallback
    // per pratica quando non è disponibile alcuna chiave. In caso di esito
    // parziale vengono protette esclusivamente le righe realmente eliminate.
    if (detail?.deletionConfirmed !== false) {
      const fallbackPracticeKey = giiPracticeKeyFromIdentity(detail?.parentGlobalId, detail?.oid)
      if (fallbackPracticeKey && !candidates.has(fallbackPracticeKey)) {
        candidates.set(fallbackPracticeKey, new Set<string>())
      }
    }

    if (!candidates.size) return

    const now = Date.now()
    const tombstones = takeChargeTombstonesRef.current
    for (const [practiceKey, candidateKeys] of candidates.entries()) {
      const current = tombstones.get(practiceKey)
      const deletedAlertKeys = current?.deletedAlertKeys || new Set<string>()
      candidateKeys.forEach(key => deletedAlertKeys.add(key))
      tombstones.set(practiceKey, {
        deletedAlertKeys,
        suppressAllPreviousActivities: (current?.suppressAllPreviousActivities || false) || deletedAlertKeys.size === 0,
        resolvedAt: Math.max(current?.resolvedAt || 0, Number(detail?.ts) || now),
        currentAbsentConfirmations: 0,
        expiresAt: now + (5 * 60 * 1000)
      })
    }

    alertsOptimisticRevisionRef.current += 1
    alertsCurrentActivitiesSignatureRef.current = ''
    setAlerts(previous => previous.filter(alert => {
      if (!isGiiTakeChargeAlert(alert)) return true
      const practiceKey = alertPracticeMergeKey(alert)
      const tombstone = tombstones.get(practiceKey)
      if (!tombstone) return true
      const key = normalizeGiiAlertKey(alert?.alertKey)
      if (!tombstone.suppressAllPreviousActivities) {
        return !!key && !tombstone.deletedAlertKeys.has(key)
      }
      const activationMs = alertEventDateMs(alert)
      return activationMs != null && activationMs > tombstone.resolvedAt
    }))
  }, [])


  const registerLocalArchive = React.useCallback((alertKey: any) => {
    const key = normalizeGiiAlertKey(alertKey)
    if (!key || locallyArchivedAlertKeysRef.current.has(key)) return
    locallyArchivedAlertKeysRef.current.add(key)
    alertsOptimisticRevisionRef.current += 1
    setAlerts(previous => previous.filter(alert => normalizeGiiAlertKey(alert?.alertKey) !== key))
  }, [])


  const refreshAlerts = React.useCallback(async (options: GiiAlertRefreshOptions = {}) => {
    if (alertsAuthTransitionRef.current) return

    const usernameAtStart = normalizeAuthUsername(user?.username)
    const activeSessionUsername = getActiveSessionUsername()

    // Fail-safe fondamentale: non selezioniamo né interroghiamo alcun layer finché
    // il profilo GII locale non appartiene alla stessa identità della sessione OAuth.
    // È la finestra che, nel passaggio IT_D1 ↔ DA_AMM, produceva il banner credenziali.
    if (!usernameAtStart || !activeSessionUsername || usernameAtStart !== activeSessionUsername) {
      return
    }

    const enabled = cfg.alertsEnabled ?? true
    const rawAssignments = Array.isArray(user?.assignments) && user.assignments.length
      ? user.assignments
      : [user]
    const alertContexts = rawAssignments
      .map((assignment: any) => ({
        ...user,
        ...assignment,
        username: user?.username,
        fullName: user?.fullName,
        assignments: user?.assignments || [],
        isAdmin: !!(assignment?.isWorkflowAdmin || user?.isOrgAdmin),
        isOrgAdmin: !!user?.isOrgAdmin,
        isWorkflowAdmin: !!assignment?.isWorkflowAdmin
      }))
      .filter((contextUser: any) => canUseGiiAlerts(contextUser))
      .filter((contextUser: any, index: number, all: any[]) => {
        const key = [
          alertRoleAreaKey(contextUser),
          String(contextUser?.areaCod || ''),
          String(contextUser?.settoreCod || ''),
          String(contextUser?.ufficio ?? '')
        ].join('|')
        return all.findIndex((other: any) => [
          alertRoleAreaKey(other),
          String(other?.areaCod || ''),
          String(other?.settoreCod || ''),
          String(other?.ufficio ?? '')
        ].join('|') === key) === index
      })

    const practiceLayerUrl = selectAlertPracticeLayerUrl(cfg, user)
    const activityLayerUrl = selectCurrentActivityLayerUrl(cfg, user)
    const archiveTableUrl = selectAlertArchiveTableUrl(cfg, user)
    const generationAtStart = alertsAccountGenerationRef.current
    const lightSequenceAtStart = ++alertsLightSequenceRef.current
    const optimisticRevisionAtStart = alertsOptimisticRevisionRef.current
    const includeBackground = options.includeBackground === true
    let controller = alertsAbortControllerRef.current
    if (!controller || controller.signal.aborted) {
      controller = new AbortController()
      alertsAbortControllerRef.current = controller
    }
    const signal = controller.signal
    const isCurrentAccount = () => (
      !signal.aborted &&
      !alertsAuthTransitionRef.current &&
      alertsAccountGenerationRef.current === generationAtStart &&
      alertsCurrentUsernameRef.current === usernameAtStart &&
      getActiveSessionUsername() === usernameAtStart
    )
    const isCurrentLightRequest = () => (
      isCurrentAccount() &&
      alertsLightSequenceRef.current === lightSequenceAtStart &&
      alertsOptimisticRevisionRef.current === optimisticRevisionAtStart
    )
    const isCurrentBackgroundRequest = () => (
      isCurrentAccount() &&
      alertsOptimisticRevisionRef.current === optimisticRevisionAtStart
    )

    if (!enabled || !user?.username || alertContexts.length === 0) {
      if (!isCurrentLightRequest()) return
      alertsLoadedGenerationRef.current = generationAtStart
      setAlerts([])
      setAlertsError('')
      setAlertsLoading(false)
      return
    }

    if (!isCurrentLightRequest()) return
    // La campanella viene nascosta solo durante il primo caricamento del profilo
    // corrente. I refresh periodici mantengono visibile l'ultimo risultato valido.
    if (alertsLoadedGenerationRef.current !== generationAtStart) {
      setAlertsLoading(true)
    }

    const toAlertUser = (contextUser: any) => ({
      username: contextUser.username,
      fullName: contextUser.fullName,
      role: contextUser.profiloCod || contextUser.ruoloCod,
      roleCod: contextUser.profiloCod || contextUser.ruoloCod,
      areaCod: contextUser.areaCod,
      settoreCod: contextUser.settoreCod,
      ufficio: contextUser.ufficio,
      isAdmin: !!contextUser.isWorkflowAdmin
    })

    const dedupeAlerts = (items: GiiAlertItem[]): GiiAlertItem[] => {
      const seen = new Set<string>()
      const result: GiiAlertItem[] = []
      for (const alert of Array.isArray(items) ? items : []) {
        const practiceKey = alertPracticeMergeKey(alert)
        const alertKey = normalizeGiiAlertKey(alert?.alertKey)
        const key = alertKey ? `${practiceKey || 'alert'}::${alertKey}` : practiceKey
        if (key && seen.has(key)) continue
        if (key) seen.add(key)
        result.push(alert)
      }
      return result
    }

    let currentActivities: GiiAlertItem[] = []

    const readCurrentActivities = async (): Promise<GiiAlertItem[]> => {
      const batches = await Promise.all(alertContexts.map(async (contextUser: any) => {
        const contextAlertUser = toAlertUser(contextUser)
        const contextActivityLayerUrl = selectCurrentActivityLayerUrl(cfg, contextUser)
        const contextArchiveTableUrl = selectAlertArchiveTableUrl(cfg, contextUser)
        if (!contextActivityLayerUrl) return [] as GiiAlertItem[]

        const current = await withGiiTimeout(queryGiiCurrentActivities({
          activityLayerUrl: contextActivityLayerUrl,
          archiveTableUrl: contextArchiveTableUrl,
          user: contextAlertUser,
          pageSize: 100,
          signal
        }), 8000, 'Timeout caricamento attività correnti.')

        return (current.alerts || []).map(alert => ({
          ...alert,
          raw: {
            ...(alert.raw || {}),
            __gii_current_user_role_cod: contextAlertUser.roleCod || '',
            __gii_context_practice_layer_url: selectAlertPracticeLayerUrl(cfg, contextUser),
            __gii_current_user_settore_cod: contextAlertUser.settoreCod || '',
            __gii_current_user_area_cod: contextAlertUser.areaCod || '',
            __gii_current_user_ufficio_id: contextAlertUser.ufficio ?? null
          }
        }))
      }))

      return sortAlertsForPopup(dedupeAlerts(batches.flat()))
    }

    const enrichAlertsForPopup = async (items: GiiAlertItem[]): Promise<GiiAlertItem[]> => {
      throwIfHeaderAborted(signal)
      const groups = new Map<string, GiiAlertItem[]>()
      for (const item of Array.isArray(items) ? items : []) {
        const contextPracticeLayerUrl = String((item?.raw as any)?.__gii_context_practice_layer_url || practiceLayerUrl || '').trim()
        const group = groups.get(contextPracticeLayerUrl) || []
        group.push(item)
        groups.set(contextPracticeLayerUrl, group)
      }

      const enrichedGroups = await Promise.all(Array.from(groups.entries()).map(async ([contextPracticeLayerUrl, group]) => {
        const withPractice = contextPracticeLayerUrl
          ? await enrichAlertsWithPracticeMeta(group, contextPracticeLayerUrl, signal)
          : group
        return enrichAlertsWithActorFullNames(withPractice, signal)
      }))
      return sortAlertsForPopup(dedupeAlerts(enrichedGroups.flat()))
    }

    let popupCurrentActivities: GiiAlertItem[] = []

    try {
      // Mostriamo subito le attività correnti: la campanella deve comparire
      // rapidamente. Le righe organizzative principali sono ricavate anche dai
      // campi destinatario_* dell'attività corrente, senza attendere il recupero
      // completo della pratica. L'arricchimento successivo può integrare dati,
      // ma non deve ritardare l'allarme.
      const rawCurrentActivities = await readCurrentActivities()
      if (!isCurrentLightRequest()) return
      currentActivities = filterAlertsWithLocalGuards(rawCurrentActivities, 'current')
      popupCurrentActivities = sortAlertsForPopup(currentActivities)
      alertsCurrentActivitiesSignatureRef.current = alertPopupKeysSignature(popupCurrentActivities)
      alertsLoadedGenerationRef.current = generationAtStart
      setAlerts(popupCurrentActivities)
      setAlertsError('')
      setAlertsLoading(false)
    } catch (e: any) {
      if (isGiiAbortError(e) || !isCurrentLightRequest()) return
      alertsLoadedGenerationRef.current = generationAtStart
      setAlerts([])
      setAlertsError(e?.message || String(e))
      setAlertsLoading(false)
      return
    }

    if (!includeBackground) return

    // Il controllo sul FL madre resta necessario per intercettare le rilevazioni TR
    // appena arrivate, ma non deve più bloccare la comparsa della campanella. Lo
    // eseguiamo in background: se materializza nuove attività, rilegge la vista e
    // aggiorna la lista una sola volta. Il polling rapido non deve però accumulare
    // più controlli pesanti contemporaneamente.
    const activeBackground = alertsBackgroundRefreshRef.current
    if (
      activeBackground &&
      activeBackground.generation === generationAtStart &&
      activeBackground.username === usernameAtStart
    ) return

    const backgroundToken = { generation: generationAtStart, username: usernameAtStart }
    const currentSignatureAtBackgroundStart = alertPopupKeysSignature(popupCurrentActivities)
    alertsLastBackgroundStartRef.current = Date.now()
    alertsBackgroundRefreshRef.current = backgroundToken
    ;(async () => {
      try {

        const dynamicBatches = await Promise.all(alertContexts.map(async (contextUser: any) => {
          const contextPracticeLayerUrl = selectAlertPracticeLayerUrl(cfg, contextUser)
          const contextArchiveTableUrl = selectAlertArchiveTableUrl(cfg, contextUser)
          if (!contextPracticeLayerUrl || !contextArchiveTableUrl) return [] as GiiAlertItem[]
          const res = await withGiiTimeout(queryGiiAlerts({
            practiceLayerUrl: contextPracticeLayerUrl,
            archiveTableUrl: contextArchiveTableUrl,
            user: toAlertUser(contextUser),
            warningDays: Number(cfg.alertsWarningDays ?? 5),
            signal
          }), 25000, 'Timeout caricamento scadenze e anomalie.')
          return (res.alerts || []).map(alert => ({
            ...alert,
            raw: {
              ...(alert.raw || {}),
              __gii_context_practice_layer_url: contextPracticeLayerUrl
            }
          }))
        }))
        if (!isCurrentBackgroundRequest()) return

        const enrichedCurrentActivities = await enrichAlertsForPopup(currentActivities)
        if (!isCurrentBackgroundRequest()) return
        const dynamicAlerts = await enrichAlertsForPopup(
          filterAlertsWithLocalGuards(dedupeAlerts(dynamicBatches.flat()), 'dynamic')
        )
        if (!isCurrentBackgroundRequest()) return

        // Stesso passaggio background usato per materializzare le nuove rilevazioni TR:
        // normalizziamo i testi arrivati da Survey senza bloccare la campanella.
        const normalizedCount = await normalizeSurveyUppercaseFields({
          practiceLayerUrl: selectAlertPracticeLayerUrlWrite(cfg, user),
          dynamicAlerts,
          user,
          signal
        })
        if (!isCurrentBackgroundRequest()) return

        const materializedCount = await materializeMissingTakeChargeActivities({
          currentActivities,
          dynamicAlerts,
          user,
          signal
        })
        if (!isCurrentBackgroundRequest()) return

        const hasMaterializedChanges = materializedCount > 0 || normalizedCount > 0
        let refreshedActivities = enrichedCurrentActivities
        if (hasMaterializedChanges) {
          const rawRefreshedActivities = await readCurrentActivities()
          if (!isCurrentBackgroundRequest()) return
          refreshedActivities = await enrichAlertsForPopup(
            filterAlertsWithLocalGuards(rawRefreshedActivities, 'current')
          )
        }
        if (!isCurrentBackgroundRequest()) return

        const refreshedCurrentSignature = alertPopupKeysSignature(refreshedActivities)
        const liveCurrentSignature = alertsCurrentActivitiesSignatureRef.current

        // Una riconciliazione iniziata su una coda precedente non può sovrascrivere
        // una lettura leggera che nel frattempo ha rilevato attività diverse.
        if (
          liveCurrentSignature &&
          liveCurrentSignature !== currentSignatureAtBackgroundStart &&
          liveCurrentSignature !== refreshedCurrentSignature
        ) return

        const finalAlerts = sortAlertsForPopup(
          mergeCurrentAndFallbackGiiAlerts(refreshedActivities, dynamicAlerts)
        )
        if (!isCurrentBackgroundRequest()) return

        const visibleAlerts = alertsRef.current
        const visibleKeys = alertPopupKeysSignature(visibleAlerts)
        const finalKeys = alertPopupKeysSignature(finalAlerts)
        const visibleVisual = alertPopupVisualSignature(visibleAlerts)
        const finalVisual = alertPopupVisualSignature(finalAlerts)

        if (finalKeys !== visibleKeys || finalVisual !== visibleVisual) {
          alertsCurrentActivitiesSignatureRef.current = refreshedCurrentSignature
          setAlerts(finalAlerts)
        }
        setAlertsError('')
      } catch (e: any) {
        if (isGiiAbortError(e)) return
        // Se fallisce solo il controllo del FL/scadenze, lasciamo visibili le
        // attività correnti già caricate: non oscuriamo la campanella e non
        // mostriamo errori se l'utente ha comunque attività correnti valide.
        if (isCurrentAccount() && currentActivities.length === 0) {
          setAlertsError(e?.message || String(e))
        }
      } finally {
        if (alertsBackgroundRefreshRef.current === backgroundToken) {
          alertsBackgroundRefreshRef.current = null
        }
      }
    })()
  }, [
    cfg.alertsEnabled,
    cfg.alertsPracticeLayerUrl,
    cfg.alertsPracticeLayerUrlTecnici,
    cfg.alertsPracticeLayerUrlAgr,
    cfg.alertsPracticeLayerUrlTec,
    cfg.alertsPracticeLayerUrlWrite,
    cfg.alertsPracticeLayerUrlWriteAgr,
    cfg.alertsPracticeLayerUrlWriteTec,
    user?.settoreCod,
    cfg.alertsArchiveTableUrl,
    cfg.alertsArchiveTableUrlTecnici,
    cfg.alertsActivityLayerUrl,
    cfg.alertsActivityLayerUrlAmm,
    cfg.alertsActivityLayerUrlAgr,
    cfg.alertsActivityLayerUrlTec,
    cfg.attivitaCorrentiLayerUrl,
    cfg.attivitaCorrentiLayerUrlAmm,
    cfg.attivitaCorrentiLayerUrlAgr,
    cfg.attivitaCorrentiLayerUrlTec,
    cfg.alertsWarningDays,
    user?.username,
    user?.fullName,
    user?.profiloCod,
    user?.ruoloCod,
    JSON.stringify((user?.assignments || []).map((a: any) => [a.profiloCod, a.ruoloCod, a.areaCod, a.settoreCod, a.ufficio])),
    user?.areaCod,
    user?.settoreCod,
    user?.ufficio,
    user?.isWorkflowAdmin,
    filterAlertsWithLocalGuards
  ])

  React.useEffect(() => {
    if (!(cfg.alertsEnabled ?? true) || !user?.username) return

    refreshAlerts({ includeBackground: true })

    // Due cadenze distinte:
    // - attività correnti: lettura leggera e frequente;
    // - layer delle pratiche: riconciliazione più costosa e non sovrapposta.
    const lightPollMs = 5000
    const backgroundPollMs = 30000
    let pendingBackgroundTimer: number | null = null

    const requestLightRefresh = () => {
      refreshAlerts()
    }

    const requestBackgroundRefresh = () => {
      refreshAlerts({ includeBackground: true })
    }

    const requestBackgroundSoon = () => {
      if (pendingBackgroundTimer != null) window.clearTimeout(pendingBackgroundTimer)
      pendingBackgroundTimer = window.setTimeout(() => {
        pendingBackgroundTimer = null
        requestBackgroundRefresh()
      }, 750)
    }

    const lightPollId = window.setInterval(requestLightRefresh, lightPollMs)
    const backgroundPollId = window.setInterval(requestBackgroundRefresh, backgroundPollMs)

    const onChanged = (evt?: Event) => {
      const detail: any = (evt as CustomEvent | undefined)?.detail
      const source = String(detail?.source || '').trim()
      const eventType = String((evt as any)?.type || '')
      const isArchiveEvent = eventType === 'gii-alerts-archived' || source === 'gii-header-archive'

      // L'archiviazione aggiorna la lista in-place: il pannello resta aperto
      // anche quando l'ultimo allarme viene rimosso. Le altre mutazioni
      // continuano a mantenere il comportamento precedente.
      if (!isArchiveEvent) setAlertsOpen(false)

      if (
        source === 'gii-azioni-delete-attivita' &&
        (detail?.deletionConfirmed !== false || (Array.isArray(detail?.deletedActivities) && detail.deletedActivities.length > 0))
      ) {
        // Una cancellazione completa abilita anche il fallback per pratica; in caso
        // di esito parziale vengono protette soltanto le attività effettivamente
        // eliminate. Le richieste nate prima della mutazione non possono applicarsi.
        try { alertsAbortControllerRef.current?.abort() } catch { }
        alertsAbortControllerRef.current = null
        alertsBackgroundRefreshRef.current = null
        registerTakeChargeResolution(detail)
      } else if (detail?.alertKey && (source === 'gii-header-archive' || (evt as any)?.type === 'gii-alerts-archived')) {
        registerLocalArchive(detail.alertKey)
      }

      requestLightRefresh()

      // Le modifiche ai dati della pratica possono cambiare scadenze o fallback
      // dinamici. Le raggruppiamo in una sola riconciliazione breve, senza bloccare
      // il polling e senza finestre temporali globali.
      const needsBackground =
        eventType !== 'gii-alerts-archived' &&
        (
          eventType !== 'gii-alerts-refresh' ||
          (!source.startsWith('gii-azioni-') && source !== 'gii-header-archive')
        )

      if (needsBackground) requestBackgroundSoon()
    }

    const refreshEvents = [
      'gii:record-updated',
      'gii-record-updated',
      'gii:practice-updated',
      'gii:presa-in-carico-saved',
      'gii:presa-in-carico-salvata',
      'gii:take-charge-saved',
      'gii-alerts-refresh',
      'gii-alerts-archived'
    ]

    const refreshAfterReturn = () => {
      const backgroundDue = Date.now() - alertsLastBackgroundStartRef.current >= backgroundPollMs
      refreshAlerts({ includeBackground: backgroundDue })
    }

    const onFocus = () => refreshAfterReturn()
    const onVisibility = () => {
      try {
        if (document.visibilityState === 'visible') refreshAfterReturn()
      } catch { }
    }

    refreshEvents.forEach(evt => window.addEventListener(evt, onChanged as EventListener))
    window.addEventListener('focus', onFocus)
    try { document.addEventListener('visibilitychange', onVisibility) } catch { }

    return () => {
      window.clearInterval(lightPollId)
      window.clearInterval(backgroundPollId)
      if (pendingBackgroundTimer != null) window.clearTimeout(pendingBackgroundTimer)
      refreshEvents.forEach(evt => window.removeEventListener(evt, onChanged as EventListener))
      window.removeEventListener('focus', onFocus)
      try { document.removeEventListener('visibilitychange', onVisibility) } catch { }
    }
  }, [
    cfg.alertsEnabled,
    user?.username,
    refreshAlerts,
    registerTakeChargeResolution,
    registerLocalArchive
  ])

  const openAlertPractice = React.useCallback((alert: GiiAlertItem) => {
    const layerUrl = selectAlertPracticeLayerUrl(cfg, user)
    storeAlertEditIntent(alert, layerUrl)
    setAlertsOpen(false)
    const page = String(cfg.alertsOpenPage || '').trim()
    if (page) gotoPage(page)
  }, [cfg.alertsPracticeLayerUrl, cfg.alertsPracticeLayerUrlTecnici, cfg.alertsPracticeLayerUrlAgr, cfg.alertsPracticeLayerUrlTec, cfg.alertsOpenPage, user?.profiloCod, user?.ruoloCod, user?.areaCod])

  const archiveAlertFromHeader = React.useCallback(async (alert: GiiAlertItem) => {
    if (!alert?.alertKey || !user?.username) return
    if (isGiiTakeChargeAlert(alert)) return
    const archiveTableUrl = selectAlertArchiveTableUrl(cfg, user)
    if (!archiveTableUrl) return
    setArchivingAlertKey(alert.alertKey)
    try {
      await archiveGiiAlert({
        archiveTableUrl,
        alert,
        user: { username: user.username, fullName: user.fullName },
        now: Date.now()
      })
      try { alertsAbortControllerRef.current?.abort() } catch { }
      alertsAbortControllerRef.current = null
      alertsBackgroundRefreshRef.current = null
      registerLocalArchive(alert.alertKey)
      try {
        window.dispatchEvent(new CustomEvent('gii-alerts-archived', {
          detail: { source: 'gii-header-archive', alertKey: alert.alertKey }
        }))
      } catch {}
      await refreshAlerts()
    } catch (e: any) {
      setAlertsError(e?.message || String(e))
    } finally {
      setArchivingAlertKey('')
    }
  }, [cfg.alertsArchiveTableUrl, cfg.alertsArchiveTableUrlTecnici, user?.username, user?.fullName, user?.profiloCod, user?.ruoloCod, user?.areaCod, refreshAlerts, registerLocalArchive])


  // Auth-guard: se non autenticato → pagina Accesso; se autenticato e sei su Accesso → pagina Home
  React.useEffect(() => {
    if (uLoad) return

    const outTok = String(afterOutRef.current || '').trim()
    const inTok  = String(afterInRef.current || '').trim()
    if (!outTok && !inTok) return

    // evita loop ravvicinati
    if (guardLockRef.current) return

    const currentTok = getCurrentPageToken() || ''
    const curId = currentTok ? resolvePageId(currentTok) : null

    const outId = outTok ? resolvePageId(outTok) : null
    const inId  = inTok ? resolvePageId(inTok) : null

    // Se non riesco a risolvere, uso comunque la navigazione best-effort (fallback)
    const safeGoto = (tok: string) => {
      try {
        guardLockRef.current = true
        setTimeout(() => { guardLockRef.current = false }, 600)
        gotoPage(tok)
      } catch { guardLockRef.current = false }
    }

    // 1) Non autenticato: forza Accesso
    if (!user) {
      if (outTok && (!curId || !outId || curId !== outId)) safeGoto(outTok)
      return
    }

    // 2) Autenticato: se sei su Accesso (pagina post-logout), vai alla home operativa
    if (user && outTok && inTok && outId && curId && curId === outId) {
      safeGoto(inTok)
    }
  }, [user, uLoad, urlTick])


  const logoBg = cfg.logoBgGradient
    ? `linear-gradient(135deg,${cfg.logoBgColor},${cfg.logoBgGradEnd || '#0048ad'})`
    : cfg.logoBgColor

  const btnStyle: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:7, borderRadius:8,
    border:`1px solid ${cfg.signInBorderColor}`, background:cfg.signInBg,
    color:cfg.signInColor, fontSize:12, cursor:'pointer',
    backdropFilter:'blur(8px)', transition:'all 0.2s', whiteSpace:'nowrap'
  }

  // ── Menu utente: contenuto configurabile ──
  const showAccountAvatar = cfg.accountMenuShowAvatar ?? true
  const showAccountName = cfg.accountMenuShowName ?? true
  const accountProfileUrl = String(cfg.accountMenuProfileUrl ?? '').trim()
  const showAccountProfile = (cfg.accountMenuShowProfile ?? true) && !!accountProfileUrl
  const accountSettingsUrl = String(cfg.accountMenuSettingsUrl ?? '').trim()
  const showAccountSettings = (cfg.accountMenuShowSettings ?? true) && !!accountSettingsUrl
  const menuItemBtnStyle: React.CSSProperties = {
    width:'100%', display:'flex', alignItems:'center', gap:8,
    padding:'8px 10px', borderRadius:8,
    border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)',
    color:'#e5e7eb', cursor:'pointer', fontSize:12.5, fontWeight:700,
    marginBottom:6
  }

  const userInitials = (() => {
    const label = String(user?.fullName || user?.username || '').trim()
    const parts = label.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
    }
    return (parts[0] || '').slice(0, 2).toUpperCase() || '?'
  })()
  const bannerOpensAccountMenu = !!cfg.showSignIn && (cfg.signedInClick ?? 'signout') === 'menu'

  const performSwitchAccount = async () => {
    setMenuOpen(false)
    if (accountSwitchInProgressRef.current) return

    const previousUsername = normalizeAuthUsername(userRef.current?.username)

    // Memorizziamo la pagina di partenza, ma NON navighiamo ancora.
    // La Home deve essere aperta soltanto se l'OAuth restituisce davvero un
    // account diverso e, soprattutto, PRIMA che SessionManager installi la
    // nuova resource session. In caso di Annulla o stesso account non cambia
    // quindi mai la pagina corrente.
    const switchOriginPageToken = getRuntimeCurrentPageId() || getCurrentPageToken() || ''
    const switchOriginPageId = switchOriginPageToken ? resolvePageId(switchOriginPageToken) : null
    const neutralPageToken = String(afterInRef.current || cfg.alertsHomePage || '').trim()
    const neutralPageId = neutralPageToken ? resolvePageId(neutralPageToken) : null
    let movedToNeutralPage = false

    const moveToNeutralPageBeforeCredentialInstall = async () => {
      if (movedToNeutralPage) return
      if (!neutralPageToken || !neutralPageId || !switchOriginPageId || switchOriginPageId === neutralPageId) return

      gotoPage(neutralPageToken)
      movedToNeutralPage = true

      // Non basta che cambi l'URL: sulle pagine con restriction nativa ExB
      // continua a proteggere la pagina finché appRuntimeInfo.currentPageId non
      // è realmente passato alla Home. Installare la nuova sessione prima di
      // quel momento fa scattare il guard org_admin di Gestione utenti.
      // Attendiamo quindi due conferme runtime consecutive della pagina neutra.
      let runtimeConfirmations = 0
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => window.setTimeout(resolve, 25))
        const runtimePageId = getRuntimeCurrentPageId()
        if (runtimePageId === neutralPageId) {
          runtimeConfirmations += 1
          if (runtimeConfirmations >= 2) break
        } else {
          runtimeConfirmations = 0
        }
      }

      if (runtimeConfirmations < 2) {
        throw new Error('Pagina Home non confermata prima del cambio account.')
      }

      // Un ultimo ciclo lascia terminare lo smontaggio dei widget della pagina
      // precedente mantenendo ancora valida la vecchia identità.
      await new Promise(resolve => window.setTimeout(resolve, 100))
    }

    const restoreOriginPageAfterFailedSwitch = () => {
      if (!movedToNeutralPage || !switchOriginPageToken) return
      try { gotoPage(switchOriginPageToken) } catch { }
    }

    if (profileSyncRetryTimerRef.current != null) {
      window.clearTimeout(profileSyncRetryTimerRef.current)
      profileSyncRetryTimerRef.current = null
    }
    setProfileSyncError('')
    accountSwitchInProgressRef.current = true
    alertsAuthTransitionRef.current = true

    const reloadAfterDifferentSessionInstall = async (incomingUsernameRaw: string) => {
      const incomingUsername = normalizeAuthUsername(incomingUsernameRaw)
      let mainUsername = ''
      let appStoreUsername = ''
      let converged = false

      // Il cambio è realmente consolidato solo quando sia SessionManager sia
      // lo store principale di Experience Builder espongono il nuovo username.
      for (let i = 0; i < 120; i++) {
        mainUsername = getActiveSessionUsername()
        try {
          appStoreUsername = normalizeAuthUsername(getAppStore()?.getState?.()?.user?.username)
        } catch {
          appStoreUsername = ''
        }

        if (mainUsername === incomingUsername && appStoreUsername === incomingUsername) {
          converged = true
          break
        }
        await new Promise(resolve => window.setTimeout(resolve, 50))
      }

      if (!converged) return

      clearGiiUserRoleCache()
      await new Promise(resolve => window.setTimeout(resolve, 100))
      window.location.reload()
    }

    const switchPromise = switchAccountWithoutRevokingCurrentSession(
      previousUsername,
      moveToNeutralPageBeforeCredentialInstall,
      reloadAfterDifferentSessionInstall
    )
    if (!switchPromise) {
      accountSwitchInProgressRef.current = false
      alertsAuthTransitionRef.current = false
      return
    }

    try { alertsAbortControllerRef.current?.abort() } catch { }
    alertsAbortControllerRef.current = null
    alertsBackgroundRefreshRef.current = null
    setAlerts([])
    setAlertsError('')
    setAlertsOpen(false)
    setAlertsLoading(false)

    try {
      await switchPromise

      // Alla chiusura del popup il metodo nativo può risolvere anche in caso di
      // Annulla. Poiché la navigazione preventiva scatta solo dentro
      // addOrReplaceSession() per uno username diverso, Annulla e stesso account
      // lasciano già la pagina esattamente dov'era.
      let activeUsername = getActiveSessionUsername()
      for (let i = 0; i < 20 && !activeUsername; i++) {
        await new Promise(resolve => window.setTimeout(resolve, 50))
        activeUsername = getActiveSessionUsername()
      }

      if (!activeUsername || activeUsername === previousUsername) {
        alertsAuthTransitionRef.current = false
        alertsAbortControllerRef.current = new AbortController()
        refreshAlerts()
        return
      }

      // Il vero cambio account viene completato nel ramo intercettato di
      // addOrReplaceSession(), che attende la convergenza di SessionManager e
      // dello store ExB e poi ricarica completamente l'app.
      return
    } catch {
      // Se il flusso fallisce DOPO aver individuato un account differente ma
      // PRIMA di completarne l'installazione, ripristiniamo la pagina iniziale.
      // Con Annulla normale il callback non viene mai eseguito e non c'è nulla
      // da ripristinare.
      alertsAuthTransitionRef.current = false
      alertsAbortControllerRef.current = new AbortController()
      setULoad(false)
      restoreOriginPageAfterFailedSwitch()
      refreshAlerts()
    } finally {
      accountSwitchInProgressRef.current = false
    }
  }

  // Disconnessione "pulita": se è configurata una pagina di destinazione diversa da
  // quella corrente, naviga PRIMA di distruggere le credenziali. Così i widget dati
  // della pagina corrente (elenco/mappa) si smontano e non restano agganciati a un
  // layer protetto proprio mentre la sessione viene invalidata — evento che fa scattare
  // un tentativo di ri-autenticazione automatica (il prompt "Eseguire l'accesso a ArcGIS Online").
  const performSignOut = async () => {
    if (profileSyncRetryTimerRef.current != null) {
      window.clearTimeout(profileSyncRetryTimerRef.current)
      profileSyncRetryTimerRef.current = null
    }
    setProfileSyncError('')
    const tok = String(afterOutRef.current || '').trim()
    if (tok) {
      const targetId = resolvePageId(tok)
      const curId = resolvePageId(getCurrentPageToken() || '')
      if (!targetId || !curId || curId !== targetId) {
        gotoPage(tok)
        await new Promise(r => setTimeout(r, 150))
      }
    }
    await signOut()
  }

  const getOffset = (key: string): { x:number; y:number } => {
    const v: any = (cfg as any)[key]
    if (v && typeof v.x === 'number') return { x: v.x, y: v.y }
    if (v && typeof v.get === 'function') return { x: v.get('x') || 0, y: v.get('y') || 0 }
    return { x: 0, y: 0 }
  }
  const off = (key: string): React.CSSProperties => {
    const o = getOffset(key)
    return (o.x || o.y) ? { position:'relative', left:o.x, top:o.y } : {}
  }

  const roleRank = (a: GiiUserAssignment): number => {
    const code = String(a?.profiloCod || a?.ruoloCod || '').toUpperCase()
    if (code === 'ADMIN') return 7
    if (code === 'DA') return 6
    if (code === 'DT') return 5
    if (code === 'RIT' || code === 'RIA') return 4
    if (code === 'CS') return 3
    if (code === 'IT' || code === 'IA') return 2
    if (code === 'TR') return 1
    return 0
  }
  const readOperationalSelection = React.useCallback(() => {
    try {
      const sel: any = (window as any).__giiSelection || null
      return {
        role: String(sel?.operationalRole || '').trim().toUpperCase(),
        label: String(sel?.operationalRoleLabel || '').trim(),
      }
    } catch {
      return { role: '', label: '' }
    }
  }, [])
  const [operationalSelection, setOperationalSelection] = React.useState<{ role: string; label: string }>(() => readOperationalSelection())
  React.useEffect(() => {
    const syncOperationalSelection = () => setOperationalSelection(readOperationalSelection())
    syncOperationalSelection()
    window.addEventListener('gii-selection-changed', syncOperationalSelection as EventListener)
    window.addEventListener('gii-selection-cleared', syncOperationalSelection as EventListener)
    return () => {
      window.removeEventListener('gii-selection-changed', syncOperationalSelection as EventListener)
      window.removeEventListener('gii-selection-cleared', syncOperationalSelection as EventListener)
    }
  }, [readOperationalSelection])

  const assignments = Array.isArray(user?.assignments) ? user!.assignments : []
  const primaryAssignment = assignments.reduce<GiiUserAssignment | null>((best, current) => {
    if (!best) return current
    return roleRank(current) > roleRank(best) ? current : best
  }, null)
  const displayRoleCode = operationalSelection.role || primaryAssignment?.profiloCod || primaryAssignment?.ruoloCod || user?.profiloCod || user?.ruoloCod || user?.ruolo_cod || ''
  const displayRoleLabel = operationalSelection.label || primaryAssignment?.profiloLabel || primaryAssignment?.ruoloFull || user?.profiloLabel || user?.ruoloFull || ''
  const displayRoleBadge = displayRoleLabel || displayRoleCode
  const hasMultipleAssignments = assignments.length > 1
  const assignmentLabel = (a: GiiUserAssignment): string => {
    const role = String(a?.profiloLabel || a?.ruoloFull || a?.profiloCod || a?.ruoloCod || '').trim()
    const parts: string[] = [role]
    const area = String(a?.areaFull || a?.areaCod || '').trim()
    const settore = String(a?.settoreFull || a?.settoreCod || '').trim()
    const ufficio = String(a?.ufficioLabel || '').trim()
    const roleUpper = role.toUpperCase()
    const roleCode = String(a?.profiloCod || a?.ruoloCod || '').trim().toUpperCase()
    const isAreaDirector = roleCode === 'DT' || roleCode === 'DA' || roleUpper.includes('DIRETTORE AREA')
    if (area && !isAreaDirector && !roleUpper.includes(area.toUpperCase())) parts.push(`Area ${area}`)
    if (settore) parts.push(/^Settore\b/i.test(settore) ? settore : `Settore ${settore}`)
    if (ufficio) parts.push(/^Ufficio\b/i.test(ufficio) ? ufficio : `Ufficio di ${ufficio}`)
    return parts.filter(Boolean).join(' · ')
  }
  const orderedAssignments = assignments.slice().sort((a, b) => roleRank(b) - roleRank(a))

  return (
    <div style={{
      width:'100%', height:'100%',
      background: cfg.headerBgType === 'gradient'
        ? `linear-gradient(${cfg.headerGradAngle ?? 160}deg, ${cfg.headerBg} 0%, ${cfg.headerGradMid ?? '#0d2444'} 40%, ${cfg.headerGradEnd ?? '#0a1f3d'} 100%)`
        : cfg.headerBg,
      borderBottom: cfg.headerBorderBottom ? `1px solid ${cfg.headerBorderColor}` : 'none',
      backdropFilter: 'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:`${cfg.headerPaddingV}px ${cfg.headerPaddingH}px`,
      boxSizing:'border-box',
      fontFamily:"'Source Sans 3','Segoe UI',sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.45); }
          70%  { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        .gii-user-account-trigger:focus-visible {
          outline: 2px solid ${cfg.signInBorderColor};
          outline-offset: 1px;
        }
        @keyframes gii-alert-bell-ring {
          0%, 72%, 100% { transform: rotate(0deg) scale(1); }
          77% { transform: rotate(10deg) scale(1.06); }
          82% { transform: rotate(-9deg) scale(1.06); }
          87% { transform: rotate(6deg) scale(1.03); }
          92% { transform: rotate(-4deg) scale(1.02); }
          96% { transform: rotate(0deg) scale(1); }
        }
      `}</style>

      {alertsOpen && showHeaderAlertBell && (
        <HeaderAlertsPopup
          alerts={alerts}
          counts={alertCounts}
          loading={alertsLoading}
          error={alertsError}
          archivingKey={archivingAlertKey}
          right={alertsPanelRight}
          homeMode={isAlertsHomePage}
          onClose={() => setAlertsOpen(false)}
          onOpenPractice={openAlertPractice}
          onArchive={archiveAlertFromHeader}
        />
      )}

      {/* Logo + Titoli */}
      <div style={{ display:'flex', alignItems:'center', gap:16, flex:'1 1 auto', minWidth:0, overflow:'hidden' }}>
        <div style={{ ...off('offsetLogo') }}>
          <div style={{
            width:cfg.logoSize, height:cfg.logoSize, borderRadius:cfg.logoRadius,
            background:logoBg, flexShrink:0, overflow:'hidden',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 14px rgba(0,0,0,0.3)',
            padding:cfg.logoPadding ?? 4, boxSizing:'border-box',
            animationName:'pulse-ring', animationDuration:'3s', animationIterationCount:'infinite', animationTimingFunction:'ease-out'
          }}>
            <img src={cfg.logoUrl} alt='logo' style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} />
          </div>
        </div>
        <div style={{ ...off('offsetTitoli'), flex:'1 1 auto', minWidth:0, overflow:'hidden' }}>
          <div style={{
            fontFamily:cfg.orgNameFont, fontSize:cfg.orgNameSize, fontWeight:cfg.orgNameWeight,
            letterSpacing:cfg.orgNameLetterSpacing, textTransform:'uppercase',
            color:cfg.orgNameColor, marginBottom:3
          }}>{cfg.orgName}</div>
          <div style={{
            fontFamily:cfg.titleFont, fontSize:cfg.titleSize, fontWeight:cfg.titleWeight,
            color:cfg.titleColor, letterSpacing:cfg.titleLetterSpacing ?? -0.5, lineHeight:1.1
          }}>{cfg.title}</div>
        </div>
      </div>

      {/* Utente + Pulsante Accedi/Esci */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {showHeaderAlertBell && (
          <div style={{ ...off('offsetAlertBell') }}>
            <AlertBellButton counts={alertCounts} loading={alertsLoading} error={alertsError} onClick={() => {
              if (!showHeaderAlertBell) return
              setAlertsPanelRight(getUserBannerRightOffset())
              setAlertsOpen(true)
            }} />
          </div>
        )}
        {(cfg.showUserBanner ?? true) && (
          <div style={{ ...off('offsetBanner') }}>
            {profileSyncError ? (
            <div title={profileSyncError} style={{ display:'inline-flex',alignItems:'center',gap:10,background:'rgba(239,68,68,0.09)',border:'1px solid rgba(248,113,113,0.30)',borderRadius:10,padding:'9px 14px',maxWidth:520 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize:12.5,color:'rgba(254,202,202,0.95)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{profileSyncError}</span>
            </div>
          ) : uLoad ? (
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(147,197,253,0.2)',borderTopColor:'#60a5fa',animationName:'spin',animationDuration:'0.8s',animationIterationCount:'infinite',animationTimingFunction:'linear' }} />
              <span style={{ fontSize:12,color:'rgba(147,197,253,0.6)' }}>Caricamento profilo…</span>
            </div>
          ) : user ? (
            <div ref={userBannerRef} style={{ display:'inline-flex',alignItems:'center',gap:14,background:cfg.userBannerBg,
              backdropFilter:'blur(8px)',border:`1px solid ${cfg.userBannerBorderColor}`,borderRadius:14,padding:'10px 14px 10px 18px',width:'max-content',maxWidth:'none' }}>
              <div style={{ width:38,height:38,borderRadius:'50%',
                background:`linear-gradient(135deg,${cfg.userAvatarBg1},${cfg.userAvatarBg2})`,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:13.5,lineHeight:1,fontWeight:700,letterSpacing:0.3,color:'#fff',flexShrink:0,textAlign:'center' }}>
                {userInitials}
              </div>
              <div style={{ minWidth:0, flex:'0 0 auto', width:'max-content', display:'flex', flexDirection:'column', alignItems:'stretch' }}>
                <button type='button'
                  className='gii-user-account-trigger'
                  ref={bannerOpensAccountMenu ? accountBtnRef : undefined}
                  disabled={bannerOpensAccountMenu ? signingIn : true}
                  title={bannerOpensAccountMenu ? 'Account' : undefined}
                  onClick={() => {
                    if (!bannerOpensAccountMenu) return
                    setAssignmentsOpen(false)
                    if (!menuOpen) {
                      const triggerRect = accountBtnRef.current?.getBoundingClientRect()
                      const bannerRect = userBannerRef.current?.getBoundingClientRect()
                      if (triggerRect || bannerRect) {
                        setAccountMenuPos({
                          top: (triggerRect?.bottom ?? bannerRect!.bottom) + 8,
                          right: getUserBannerRightOffset()
                        })
                      }
                    }
                    setMenuOpen(v => !v)
                  }}
                  style={{
                    display:'flex',alignItems:'center',width:'auto',minWidth:0,alignSelf:'stretch',
                    margin:'-3px -7px 0',padding:'3px 7px',borderRadius:7,
                    border:'1px solid transparent',background:'transparent',
                    color:cfg.userNameColor,font:'inherit',textAlign:'left',appearance:'none',WebkitAppearance:'none',
                    cursor:bannerOpensAccountMenu ? 'pointer' : 'default'
                  }}>
                  <span style={{ fontSize:cfg.userNameSize,fontWeight:600,color:cfg.userNameColor,whiteSpace:'nowrap',flexShrink:0 }}>
                    Benvenuto, {user.fullName||user.username}
                  </span>
                  {bannerOpensAccountMenu && (
                    <>
                      <span aria-hidden='true' style={{ flex:'1 1 auto',minWidth:14 }} />
                      <span aria-hidden='true' style={{ width:12,height:16,display:'inline-flex',alignItems:'center',justifyContent:'center',color:cfg.signInColor,opacity:0.8,fontSize:12,fontWeight:700,letterSpacing:0.2,flex:'0 0 auto' }}>
                        <span style={{ display:'inline-block',transformOrigin:'50% 50%',transform:menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',transition:'transform 0.18s ease' }}>▾</span>
                      </span>
                    </>
                  )}
                </button>
                {displayRoleBadge && (
                  <div style={{ fontSize:11.5,color:cfg.userInfoColor,marginTop:2,whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:7,minWidth:0 }}>
                    <button
                      ref={hasMultipleAssignments ? roleBtnRef : undefined}
                      type='button'
                      disabled={!hasMultipleAssignments}
                      title={hasMultipleAssignments ? 'Mostra tutte le assegnazioni operative' : [displayRoleLabel, displayRoleCode].filter(Boolean).join(' · ')}
                      onClick={() => {
                        if (!hasMultipleAssignments) return
                        setMenuOpen(false)
                        if (!assignmentsOpen) {
                          const rect = roleBtnRef.current?.getBoundingClientRect()
                          if (rect) {
                            setAssignmentsMenuPos({
                              top: rect.bottom + 8,
                              right: getUserBannerRightOffset()
                            })
                          }
                        }
                        setAssignmentsOpen(v => !v)
                      }}
                      style={{
                        display:'inline-flex',alignItems:'center',gap:7,
                        background:cfg.userBadgeBg,border:`1px solid ${cfg.userBadgeColor}44`,borderRadius:6,padding:'1px 8px',
                        fontSize:11.5,fontWeight:600,color:cfg.userBadgeColor,fontFamily:'inherit',lineHeight:'inherit',
                        whiteSpace:'nowrap',maxWidth:320,appearance:'none',WebkitAppearance:'none',
                        cursor:hasMultipleAssignments ? 'pointer' : 'default'
                      }}
                    >
                      <span>{displayRoleBadge}</span>
                      {hasMultipleAssignments && <span aria-hidden='true' style={{ fontSize:13,fontWeight:700,lineHeight:1 }}>+</span>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display:'inline-flex',alignItems:'center',gap:10,background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:10,padding:'9px 16px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize:12.5,color:'rgba(251,191,36,0.9)' }}>Accesso non autenticato</span>
            </div>
          )}
          </div>
        )}

        {assignmentsOpen && hasMultipleAssignments && createPortal(
          <div style={{ position:'fixed', inset:0, zIndex:2147483646, pointerEvents:'none' }}>
            <div
              ref={assignmentsMenuRef}
              style={{
                position:'fixed', top:assignmentsMenuPos.top, right:assignmentsMenuPos.right,
                minWidth:310, maxWidth:460, zIndex:9999,
                background:'rgba(17,24,39,0.96)',
                border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:10, boxShadow:'0 18px 40px rgba(0,0,0,0.35)',
                padding:10, backdropFilter:'blur(10px)', pointerEvents:'auto'
              }}
            >
              <div style={{ padding:'2px 4px 8px',fontSize:11,fontWeight:700,letterSpacing:0.7,textTransform:'uppercase',color:'rgba(191,219,254,0.72)' }}>
                Assegnazioni operative
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {orderedAssignments.map((a, index) => (
                  <div key={`${a.profiloCod || a.ruoloCod}-${a.areaCod}-${a.settoreCod}-${a.ufficio}-${index}`} style={{
                    padding:'7px 9px',borderRadius:7,background:index === 0 ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.045)',
                    border:index === 0 ? '1px solid rgba(96,165,250,0.24)' : '1px solid rgba(255,255,255,0.06)',
                    fontSize:12,color:'rgba(226,232,240,0.96)',lineHeight:1.35
                  }}>
                    {assignmentLabel(a)}
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

        <div style={{ ...off('offsetLogin') }}>{cfg.showSignIn && !uLoad && !profileSyncError && (
          user ? (
            signedInClickRef.current === 'menu' ? (
              <div style={{ position:'relative' }}>
                {/* Il menu Account è aperto dal banner utente; nessun pulsante separato. */}

                {menuOpen && createPortal(
                  <div style={{ position:'fixed', inset:0, zIndex:2147483646, pointerEvents:'none' }}>
                    <div ref={accountMenuRef} style={{
                      position:'fixed', top: accountMenuPos.top, right: accountMenuPos.right,
                      minWidth:230, zIndex:9999,
                      background:'rgba(17,24,39,0.92)',
                      border:'1px solid rgba(255,255,255,0.12)',
                      borderRadius:10,
                      boxShadow:'0 18px 40px rgba(0,0,0,0.35)',
                      padding:10,
                      backdropFilter:'blur(10px)',
                      pointerEvents:'auto'
                    }}>
                      {(showAccountAvatar || showAccountName) && (
                        <React.Fragment>
                        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'2px 2px 8px' }}>
                          {showAccountAvatar && (
                            <div style={{ width:36,height:36,borderRadius:'50%',
                              background:`linear-gradient(135deg,${cfg.userAvatarBg1},${cfg.userAvatarBg2})`,
                              display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',flexShrink:0 }}>
                              {userInitials}
                            </div>
                          )}
                          {showAccountName && (
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:'#e5e7eb', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                {user.fullName || user.username}
                              </div>
                              <div style={{ fontSize:11.5, color:'rgba(147,197,253,0.7)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                {user.username}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ height:1, background:'rgba(255,255,255,0.10)', margin:'2px 0 8px' }}/>
                        </React.Fragment>
                      )}

                      {showAccountProfile && (
                        <button type='button' title='Apri in una nuova finestra'
                          onClick={() => { setMenuOpen(false); window.open(accountProfileUrl, '_blank', 'noopener') }}
                          style={menuItemBtnStyle}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                          <span style={{ flex:1, textAlign:'left' }}>Il mio profilo</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.6, flexShrink:0 }}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </button>
                      )}

                      {showAccountSettings && (
                        <button type='button' title='Apri in una nuova finestra'
                          onClick={() => { setMenuOpen(false); window.open(accountSettingsUrl, '_blank', 'noopener') }}
                          style={menuItemBtnStyle}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                          </svg>
                          <span style={{ flex:1, textAlign:'left' }}>Le mie impostazioni</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.6, flexShrink:0 }}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </button>
                      )}

                      {(showAccountProfile || showAccountSettings) && (
                        <div style={{ height:1, background:'rgba(255,255,255,0.10)', margin:'2px 0 8px' }}/>
                      )}

                      <button type='button' disabled={signingIn}
                        onClick={async () => {
                          setSigning(true)
                          try { setMenuOpen(false); await performSwitchAccount() } finally { setSigning(false) }
                        }}
                        style={menuItemBtnStyle}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                        </svg>
                        <span style={{ flex:1, textAlign:'left' }}>Cambia account</span>
                      </button>

                      <button type='button' disabled={signingIn}
                        onClick={async () => {
                          setSigning(true)
                          try { setMenuOpen(false); await performSignOut() } finally { setSigning(false) }
                        }}
                        style={{ ...menuItemBtnStyle, marginBottom:0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        <span style={{ flex:1, textAlign:'left' }}>{signingIn ? 'Uscita…' : 'Disconnettersi'}</span>
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            ) : (
<button type='button' disabled={signingIn}
              onClick={async () => { setSigning(true); await performSignOut(); setSigning(false) }}
              style={{ ...btnStyle, padding:'6px 14px', fontWeight:600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {signingIn ? 'Uscita…' : 'Esci'}
            </button>
            )
          ) : (
            <button type='button' disabled={signingIn}
              onClick={async () => {
                setSigning(true)
                try { await signIn() } finally { setSigning(false) }
              }}
              style={{ ...btnStyle, padding:'7px 18px', fontWeight:700, letterSpacing:0.3 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              {signingIn ? 'Accesso…' : 'Accedi'}
            </button>
          )
        )}
      </div>
      </div>
    </div>
  )
}

/** @jsx jsx */
import { React, jsx, type AllWidgetProps, SessionManager, UrlManager, getAppStore } from 'jimu-core'
import { createPortal } from 'react-dom'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'
import { queryGiiAlerts, queryGiiCurrentActivities, archiveGiiAlert, getGiiAlertBellTone, isGiiTakeChargeAlert, summarizeGiiAlerts, type GiiAlertItem, type GiiAlertQueryResult } from '../../../_shared/gii-alerts/gii-alerts'

const GII_PORTAL     = 'https://cbsm-hub.maps.arcgis.com'
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'
const RUOLO_LABEL: Record<number, string> = { 1:'TR', 2:'TI', 3:'RZ', 4:'RI', 5:'DT', 6:'DA', 7:'ADMIN' }
const RUOLO_NUM: Record<string, number> = { TR:1, TI:2, RZ:3, RI:4, DT:5, DA:6, ADMIN:7 }
const RUOLO_FULL:  Record<string, string> = {
  TR:'Tecnico rilevatore', TI:'Tecnico istruttore', RZ:'Capo Settore',
  RI:'Responsabile istruttoria', DT:'Direttore d\'area', DA:'Direttore Area AA. GG. e P.F.', ADMIN:'Amministratore'
}
const PROFILO_FULL: Record<string, string> = {
  ...RUOLO_FULL,
  TI_AMM: 'Tecnico istruttore amministrativo',
  RI_AMM: 'Responsabile istruttoria amministrativa'
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

interface GiiUserRole {
  username: string
  fullName: string
  ruolo: number | null
  /** Codice ruolo testuale ufficiale (TR/TI/RZ/RI/DT/DA/ADMIN). */
  ruoloCod: string
  /** Alias snake_case per compatibilità con vecchi widget. */
  ruolo_cod?: string
  /** Backward-compat: coincide con ruoloCod. */
  ruoloLabel: string
  ruoloFull: string
  /** Profilo operativo sintetico per i ruoli amministrativi: TI_AMM / RI_AMM. */
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
  /** TRUE se ruolo workflow è ADMIN (ruolo=7 o label=ADMIN) */
  isWorkflowAdmin: boolean
}

function toNum(v: any): number | null {
  const n = v != null ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

function normCode(v: any): string {
  const code = String(v ?? '').trim().toUpperCase()
  // Vecchia codifica errata del settore n. 9: CS va trattato come DS, mai come CR.
  if (code === 'CS') return 'DS'
  return code
}

function getProfiloCod(ruoloCod: string, areaCod: string): string {
  const role = normCode(ruoloCod)
  const area = normCode(areaCod)
  if (role === 'TI' && area === 'AMM') return 'TI_AMM'
  if (role === 'RI' && area === 'AMM') return 'RI_AMM'
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

function getOrganizationalHierarchy(user: GiiUserRole | null, compact = false): string[] {
  if (!user || user.isWorkflowAdmin) return []

  const role = normCode(user.ruoloCod || user.ruoloLabel || (user.ruolo != null ? RUOLO_LABEL[user.ruolo] : ''))
  const area = getAreaLabel(user)
  const settore = getSettoreLabel(user, compact)

  // Sintesi per menu account:
  // - RI, DT e DA si leggono a livello di Area.
  // - TI e RZ si leggono a livello di Settore.
  // - Ufficio non viene mostrato nella sintesi account per evitare una gerarchia troppo lunga.
  if (['RI', 'DT', 'DA'].includes(role)) {
    return area ? [`Area ${area}`] : []
  }

  if (['TI', 'RZ', 'TR'].includes(role)) {
    return settore ? [`Settore ${settore}`] : []
  }

  return area ? [`Area ${area}`] : []
}

function makeInitials(name: string): string {
  const s = String(name || '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).filter(Boolean)
  const a = (parts[0]?.[0] || '?').toUpperCase()
  const b = (parts.length > 1 ? parts[parts.length - 1]?.[0] : '')
  return (a + (b ? b.toUpperCase() : '')).slice(0, 2)
}

async function loadUser(): Promise<GiiUserRole | null> {
  const cached = (window as any).__giiUserRole
  if (cached?.username) {
    const isOrgAdmin = !!(cached.isOrgAdmin ?? cached.isAdmin)

    const roleResolved = resolveCodeAndNum(cached.ruolo_cod ?? cached.ruoloCod ?? cached.ruoloLabel, cached.ruolo, RUOLO_LABEL, RUOLO_NUM)
    let ruolo = roleResolved.num
    let ruoloCod = roleResolved.code || (isOrgAdmin ? 'ADMIN' : '')

    // Normalizza il ruolo workflow per ADMIN (7) quando è un fallback (org_admin senza record)
    if ((ruolo == null || ruolo === 0) && ruoloCod === 'ADMIN') ruolo = 7

    const isWorkflowAdmin = (ruolo === 7) || ruoloCod === 'ADMIN'

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
    const u: GiiUserRole = {
      username: String(cached.username),
      fullName,
      ruolo,
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
      isWorkflowAdmin
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
      outFields: ['ruolo','ruolo_cod','area','area_cod','settore','settore_cod','ufficio','gruppo','full_name'],
      returnGeometry: false
    })
    const f = qr?.features?.[0]

    // Fallback robusto: se sei org_admin/owner ma non hai record (o campi incompleti) in GII_utenti
    // → contesto coerente "ADMIN trasversale" (mai DA)
    if (!f) {
      if (isOrgAdmin) {
        const ruoloFull = getDomainLabelFromCandidates(domainLabels, 'ruolo_cod', 'ADMIN', 'ruolo', 7) || RUOLO_FULL.ADMIN || 'Amministratore'
        const u: GiiUserRole = {
          username, fullName,
          ruolo: 7, ruoloCod: 'ADMIN', ruolo_cod: 'ADMIN', ruoloLabel: 'ADMIN', ruoloFull,
          profiloCod: 'ADMIN', profiloLabel: getProfiloLabel('ADMIN', ruoloFull, 'ADMIN', ''),
          area: null, areaCod: '', area_cod: '', areaFull: '', settore: null, settoreCod: '', settore_cod: '', settoreFull: '', ufficio: null, ufficioLabel: '', gruppo: '',
          isAdmin: true,
          isOrgAdmin: true,
          isWorkflowAdmin: true
        }
        try { (window as any).__giiUserRole = u } catch { }
        return u
      }

      const u: GiiUserRole = {
        username, fullName,
        ruolo: null, ruoloCod: '', ruolo_cod: '', ruoloLabel: '', ruoloFull: '',
        profiloCod: '', profiloLabel: '',
        area: null, areaCod: '', area_cod: '', areaFull: '', settore: null, settoreCod: '', settore_cod: '', settoreFull: '', ufficio: null, ufficioLabel: '', gruppo: '',
        isAdmin: false,
        isOrgAdmin: false,
        isWorkflowAdmin: false
      }
      try { (window as any).__giiUserRole = u } catch { }
      return u
    }

    const a = f.attributes
    const roleResolved = resolveCodeAndNum(a.ruolo_cod, a.ruolo, RUOLO_LABEL, RUOLO_NUM)
    let rn = roleResolved.num
    let ruoloCod = roleResolved.code

    // Se l'utente è org_admin/owner ma il ruolo workflow non è valorizzato/riconosciuto
    // → usa workflow ADMIN (7) senza trasformarlo in DA
    if ((!ruoloCod || ruoloCod === '') && isOrgAdmin) { rn = 7; ruoloCod = 'ADMIN' }

    const isWorkflowAdmin = (rn === 7) || ruoloCod === 'ADMIN'
    const areaResolved = resolveCodeAndNum(a.area_cod, a.area, AREA_LABEL, AREA_NUM)
    const settoreResolved = resolveCodeAndNum(a.settore_cod, a.settore, SETTORE_LABEL, SETTORE_NUM)

    const area = isWorkflowAdmin ? null : areaResolved.num
    const areaCod = isWorkflowAdmin ? '' : areaResolved.code
    const settore = isWorkflowAdmin ? null : settoreResolved.num
    const settoreCod = isWorkflowAdmin ? '' : settoreResolved.code
    const ufficio = isWorkflowAdmin ? null : toNum(a.ufficio)
    const ruoloFull = getDomainLabelFromCandidates(domainLabels, 'ruolo_cod', ruoloCod, 'ruolo', rn) || RUOLO_FULL[ruoloCod] || ruoloCod
    const areaFull = isWorkflowAdmin ? '' : (getDomainLabelFromCandidates(domainLabels, 'area_cod', areaCod, 'area', area) || AREA_FULL[areaCod] || areaCod)
    const settoreFull = isWorkflowAdmin ? '' : (getDomainLabelFromCandidates(domainLabels, 'settore_cod', settoreCod, 'settore', settore) || SETTORE_FULL[settoreCod] || settoreCod)
    const ufficioLabel = isWorkflowAdmin ? '' : (getDomainLabel(domainLabels, 'ufficio', ufficio) || getDomainLabel(domainLabels, 'id_ufficio', ufficio) || (ufficio != null ? UFFICIO_LABEL[ufficio] || String(ufficio) : ''))
    const profiloCod = getProfiloCod(ruoloCod, areaCod)
    const profiloLabel = getProfiloLabel(profiloCod, ruoloFull, ruoloCod, areaCod)

    const u: GiiUserRole = {
      username,
      fullName: String(a.full_name || fullName),
      ruolo: rn,
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
      isWorkflowAdmin
    }
    try { (window as any).__giiUserRole = u } catch { }
    return u
  } catch { return null }
}

async function signIn(): Promise<void> {
  try {
    const sm: any = SessionManager.getInstance()
    if (typeof sm?.signInByResourceUrl === 'function') {
      if (typeof sm?.isSignInPromptBlocked === 'function' && sm.isSignInPromptBlocked()) {
        const returnUrl = encodeURIComponent(window.location.href)
        window.location.href = `${GII_PORTAL}/home/signin.html?returnUrl=${returnUrl}`
        return
      }
      await sm.signInByResourceUrl(`${GII_PORTAL}/sharing/rest`, undefined, false)
      try { delete (window as any).__giiUserRole } catch { }
      window.dispatchEvent(new Event('gii:userLoaded'))
      return
    }
  } catch { }
  try {
    const id = await loadEsriModule<any>('esri/identity/IdentityManager')
    await id.getCredential(`${GII_PORTAL}/sharing/rest`)
  } catch { }
  try { delete (window as any).__giiUserRole } catch { }
  window.dispatchEvent(new Event('gii:userLoaded'))
}

async function signOut(): Promise<void> {
  try { delete (window as any).__giiUserRole } catch { (window as any).__giiUserRole = null }
  try {
    const sm: any = SessionManager.getInstance()
    try { const main: any = sm?.getMainSession?.(); if (main && typeof sm?.removeSession === 'function') sm.removeSession(main) } catch { }
    if (typeof sm?.signOutByResourceUrl === 'function') sm.signOutByResourceUrl(`${GII_PORTAL}/sharing/rest`)
    else if (typeof sm?.signOut === 'function') sm.signOut({})
    else if (typeof sm?.clearSessions === 'function') sm.clearSessions()
  } catch { }
  try { const id = await loadEsriModule<any>('esri/identity/IdentityManager'); if (typeof id?.destroyCredentials === 'function') id.destroyCredentials() } catch { }
  try { window.dispatchEvent(new Event('gii:userLoaded')) } catch { }
}



function alertRoleAreaKey (user: any): string {
  const role = String(user?.profiloCod || user?.ruoloCod || user?.role || '').trim().toUpperCase()
  const area = String(user?.areaCod || user?.area || '').trim().toUpperCase()
  if (role === 'ADMIN') return 'ADMIN'
  if (role === 'DA') return 'DA'
  if (role === 'TI_AMM' || role === 'RI_AMM') return role
  if (role === 'TI' && area === 'AMM') return 'TI_AMM'
  if (role === 'RI' && area === 'AMM') return 'RI_AMM'
  if (role === 'RZ' && area === 'TEC') return 'RZ_TEC'
  if (role === 'TI' && area === 'TEC') return 'TI_TEC'
  if (role === 'RI' && area === 'TEC') return 'RI_TEC'
  if (role === 'DT' && area === 'TEC') return 'DT_TEC'
  if (role === 'RZ' && area === 'AGR') return 'RZ_AGR'
  if (role === 'TI' && area === 'AGR') return 'TI_AGR'
  if (role === 'RI' && area === 'AGR') return 'RI_AGR'
  if (role === 'DT' && area === 'AGR') return 'DT_AGR'
  if (role.endsWith('_TEC') || role.endsWith('_AGR')) return role
  return role
}

function canUseGiiAlerts (user: any): boolean {
  const k = alertRoleAreaKey(user)
  return ['ADMIN', 'TI_AMM', 'RI_AMM', 'DA', 'RZ_TEC', 'TI_TEC', 'RI_TEC', 'DT_TEC', 'RZ_AGR', 'TI_AGR', 'RI_AGR', 'DT_AGR'].includes(k)
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

function mergeCurrentAndFallbackGiiAlerts (currentActivities: GiiAlertItem[], dynamicAlerts: GiiAlertItem[]): GiiAlertItem[] {
  const current = Array.isArray(currentActivities) ? currentActivities : []
  const dynamic = Array.isArray(dynamicAlerts) ? dynamicAlerts : []
  const currentKeys = new Set(
    current
      .map(a => giiAlertPracticeIdentityKey(a))
      .filter(Boolean)
  )

  const dynamicTakeChargeFallback = dynamic
    .filter(a => isGiiTakeChargeAlert(a))
    .filter(a => {
      const key = giiAlertPracticeIdentityKey(a)
      return !!key && !currentKeys.has(key)
    })

  const dynamicNonTakeCharge = dynamic.filter(a => !isGiiTakeChargeAlert(a))
  return sortAlertsForPopup([...current, ...dynamicTakeChargeFallback, ...dynamicNonTakeCharge])
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

function emptyAlertCounts (): GiiAlertQueryResult['counts'] {
  return { total: 0, red: 0, orange: 0, blue: 0, gray: 0, scaduti: 0, inScadenza: 0, critici: 0, informativi: 0 }
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
  // possono avere solo la data di stato del ruolo destinatario (es. dt_stato_RZ per
  // le rilevazioni TR). Usiamo quindi una lista ampia di fallback, mantenendo prima
  // i campi specifici dell'attività e poi le date di workflow della pratica.
  return asAlertDateMs(raw.data_attivazione) ??
    asAlertDateMs(raw.creato_il) ??
    asAlertDateMs(raw.data_evento) ??
    asAlertDateMs(raw.dt_evento) ??
    asAlertDateMs(raw.dt_chiusura) ??
    asAlertDateMs(raw.dt_stato_RZ_AGR) ??
    asAlertDateMs(raw.dt_stato_RZ_TEC) ??
    asAlertDateMs(raw.dt_stato_RZ) ??
    asAlertDateMs(raw.dt_stato_TI_AGR) ??
    asAlertDateMs(raw.dt_stato_TI_TEC) ??
    asAlertDateMs(raw.dt_stato_TI) ??
    asAlertDateMs(raw.dt_stato_RI_AGR) ??
    asAlertDateMs(raw.dt_stato_RI_TEC) ??
    asAlertDateMs(raw.dt_stato_RI) ??
    asAlertDateMs(raw.dt_stato_DT_AGR) ??
    asAlertDateMs(raw.dt_stato_DT_TEC) ??
    asAlertDateMs(raw.dt_stato_DT) ??
    asAlertDateMs(raw.dt_stato_TI_AMM) ??
    asAlertDateMs(raw.dt_stato_RI_AMM) ??
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

function escapeSqlLiteral (value: string): string {
  return String(value || '').replace(/'/g, "''")
}

function alertIsTiOrigin (alert: GiiAlertItem | null | undefined): boolean {
  const values = [
    alert?.reportCode,
    alert?.message,
    alertRawValue(alert, ['numero_rapporto', 'numero_rilevazione', 'cod_pratica', 'n_rapporto', 'numero_rapporto_tecnico']),
    alertRawValue(alert, ['origine_pratica'])
  ].map(v => String(v ?? '').trim().toUpperCase()).filter(Boolean)

  return values.some(v => /(^|[-_\s])TI([-_\s]|$)/.test(v) || v === '2' || v === 'TI')
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
  // RZ → TI della rilevazione appena ricevuta. Manteniamo incluso TI_AMM per
  // la stessa semantica nella fase amministrativa, senza cambiare gli altri
  // passaggi di trasmissione/rimando.
  return destRole === 'TI' || destRole === 'TI_AMM'
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
  if (event === 'ISTRUTTORIA_TRASMESSA' && destRole === 'RZ' && alertIsTiOrigin(alert)) return 'Nuova rilevazione ricevuta'
  if (alertIsNewAssignmentReceived(alert)) return 'Nuova istruttoria assegnata'
  if (subtype === 'RILEVAZIONE_RESPINTA' || subtype === 'RZ_RESPINGE_RILEVAZIONE') return 'Nuova rilevazione respinta'
  if (subtype === 'RZ_APPROVA_RILEVAZIONE') return rawTitleUpper.includes('INTEGRAZIONE') ? 'Integrazione validata' : 'Istruttoria approvata'
  if (subtype === 'DT_APPROVA_RAPPORTO') return 'Rapporto tecnico approvato'
  if (subtype === 'DT_RESPINGE_RAPPORTO') return 'Rapporto tecnico respinto'
  if (subtype === 'DT_RIMANDA_A_TI' || subtype === 'RI_RIMANDA_A_TI') return 'Rimando al Tecnico istruttore'

  return String(alert?.title || '').trim() || 'Allarme'
}

function roleLabelForBody (value: string): string {
  const raw = String(value || '').trim()
  const n = raw.toUpperCase()
  if (!n) return ''

  if (n.includes('TECNICO RILEVATORE')) return 'tecnico rilevatore'
  if (n.includes('TECNICO ISTRUTTORE AMMINISTRATIVO')) return 'tecnico istruttore amministrativo'
  if (n.includes('TECNICO ISTRUTTORE')) return 'tecnico istruttore'
  if (n.includes('RESPONSABILE ISTRUTTORIA AMMINISTRATIVA')) return 'Responsabile istruttoria amministrativa'
  if (n.includes('RESPONSABILE ISTRUTTORIA')) return 'Responsabile istruttoria'
  if (n.includes('CAPO SETTORE')) return 'Capo Settore'
  if (n.includes('RESPONSABILE DI ZONA')) return 'Capo Settore'
  if (n.includes('DIRETTORE AREA AMMINISTRATIVA') || n.includes('DIRETTORE AREA AA')) return 'Direttore Area AA. GG. e P.F.'
  if (n.includes('DIRETTORE D’AREA') || n.includes("DIRETTORE D'AREA")) return 'Direttore d’Area'

  const tag = raw.split(/\s+-\s+/)[0].trim().toUpperCase().replace(/_/g, '-')
  if (tag === 'TR' || tag.startsWith('TR-')) return 'tecnico rilevatore'
  if (tag === 'TI-AMM') return 'tecnico istruttore amministrativo'
  if (tag === 'TI' || tag.startsWith('TI-')) return 'tecnico istruttore'
  if (tag === 'RI-AMM') return 'Responsabile istruttoria amministrativa'
  if (tag === 'RI' || tag.startsWith('RI-')) return 'Responsabile istruttoria'
  if (tag === 'RZ' || tag.startsWith('RZ-')) return 'Capo Settore'
  if (tag === 'DA' || tag === 'DIR-AMM') return 'Direttore Area AA. GG. e P.F.'
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
  const label = String(alertPracticeRawValue(alert, ['ufficio_zona', 'ufficioZona', 'ufficio_di_zona']) ?? '').trim()
  if (label && !/^\d+$/.test(label)) return label

  const rawId = alertPracticeRawValue(alert, ['id_ufficio', 'ufficio_id', 'id_ufficio_zona', 'ufficio'])
  const n = Number(rawId ?? label)
  return Number.isFinite(n) ? String(UFFICIO_LABEL[n] || '').trim() : ''
}

function officeRefFromAlert (alert: GiiAlertItem | null | undefined): string {
  const ufficio = officeLabelFromAlert(alert)
  if (!ufficio) return ''
  return /^Ufficio\b/i.test(ufficio) ? ufficio : `Ufficio di ${ufficio}`
}

function sectorCodeFromAlert (alert: GiiAlertItem | null | undefined): string {
  const raw = alertPracticeRawValue(alert, ['settore_cod', 'settoreCod', 'settore', 'cod_settore'])
  const text = String(raw ?? '').trim().toUpperCase().replace(/_/g, '-').replace(/\s+/g, '')
  if (!text) return ''
  if (text === 'CS') return 'DS'
  const d = text.match(/^D([1-6])$/)
  if (d) return `D${d[1]}`
  if (text === 'DS' || text === 'CR' || text === 'GI') return text
  const n = Number(text)
  return Number.isFinite(n) ? String(SETTORE_LABEL[n] || '').trim().toUpperCase() : ''
}

function areaCodeFromAlert (alert: GiiAlertItem | null | undefined): string {
  const raw = alertPracticeRawValue(alert, ['area_cod', 'areaCod', 'area', 'cod_area'])
  const text = String(raw ?? '').trim().toUpperCase().replace(/_/g, '-')
  if (text === 'AMM' || text === 'AGR' || text === 'TEC') return text
  const n = Number(text)
  return Number.isFinite(n) ? String(AREA_LABEL[n] || '').trim().toUpperCase() : ''
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

  if (tag === 'DIR-AMM' || tag === 'DA') return 'DA'
  if (tag === 'RI-AMM') return 'RI_AMM'
  if (tag === 'TI-AMM') return 'TI_AMM'
  if (tag === 'DIR' || tag.startsWith('DIR-') || tag === 'DT' || tag.startsWith('DT-')) return 'DT'
  if (tag === 'RI' || /^RI-(AGR|TEC|D\d|DS|CR)$/.test(tag)) return 'RI'
  if (tag === 'RZ' || tag.startsWith('RZ-')) return 'RZ'
  if (tag === 'TI' || tag.startsWith('TI-')) return 'TI'
  if (tag === 'TR' || tag.startsWith('TR-')) return 'TR'

  const label = roleLabelForBody(raw).toUpperCase()
  if (label.includes('TECNICO RILEVATORE')) return 'TR'
  if (label.includes('TECNICO ISTRUTTORE AMMINISTRATIVO')) return 'TI_AMM'
  if (label.includes('TECNICO ISTRUTTORE')) return 'TI'
  if (label.includes('RESPONSABILE ISTRUTTORIA AMMINISTRATIVA')) return 'RI_AMM'
  if (label.includes('RESPONSABILE ISTRUTTORIA')) return 'RI'
  if (label.includes('CAPO SETTORE')) return 'RZ'
  if (label.includes('RESPONSABILE DI ZONA')) return 'RZ'
  if (label.includes('DIRETTORE AREA AMMINISTRATIVA')) return 'DA'
  if (label.includes('DIRETTORE D’AREA') || label.includes("DIRETTORE D'AREA")) return 'DT'

  return ''
}

function alertSenderRoleCode (alert: GiiAlertItem | null | undefined): string {
  const subtype = alertSubtypeCode(alert as any)
  const event = alertOriginEventCode(alert as any)
  const destRole = alertDestRoleCode(alert as any)

  if (alertIsNewRilevazione(alert)) return alertIsTiOrigin(alert) ? 'TI' : 'TR'
  if (event === 'ISTRUTTORIA_TRASMESSA' && destRole === 'RZ') return 'TI'

  if (alertIsNewAssignmentReceived(alert)) {
    if (destRole === 'TI_AMM') return 'RI_AMM'
    if (destRole === 'TI') return 'RZ'
  }

  if (subtype === 'RILEVAZIONE_RESPINTA' || subtype === 'RZ_RESPINGE_RILEVAZIONE' || subtype === 'RZ_APPROVA_RILEVAZIONE') return 'RZ'
  if (subtype === 'DT_APPROVA_RAPPORTO' || subtype === 'DT_RESPINGE_RAPPORTO' || subtype === 'DT_RIMANDA_A_TI') return 'DT'
  if (subtype === 'RI_RIMANDA_A_TI') return 'RI'

  if (subtype.startsWith('DA_')) return 'DA'
  if (subtype.startsWith('RI_AMM_')) return 'RI_AMM'
  if (subtype.startsWith('TI_AMM_')) return 'TI_AMM'
  if (subtype.startsWith('DT_')) return 'DT'
  if (subtype.startsWith('RI_')) return 'RI'
  if (subtype.startsWith('RZ_')) return 'RZ'
  if (subtype.startsWith('TI_')) return 'TI'
  if (subtype.startsWith('TR_')) return 'TR'

  if (event === 'INVIO_A_TI_AMM') return 'DT'
  if (event === 'ISTRUTTORIA_TRASMESSA') {
    if (destRole === 'RI') return 'RZ'
    if (destRole === 'DT') return 'RI'
    if (destRole === 'RI_AMM') return 'TI_AMM'
    if (destRole === 'DA') return 'RI_AMM'
  }

  return roleCodeFromGiiActor(
    alertSenderFromMessage(alert as any) ||
    alertSenderFallbackFromActivitySubtype(alert as any) ||
    alertSenderFallbackFromTitle(alert as any) ||
    firstNonEmptyAlertRawValue(alert, ['GII_da', 'gii_da'])
  )
}

function alertSenderRoleContext (alert: GiiAlertItem | null | undefined): string {
  const role = alertSenderRoleCode(alert)
  const office = officeRefFromAlert(alert)
  const sector = settoreFullLabelFromAlert(alert)
  const area = areaRefFromAlert(alert)

  if (role === 'TR') return office ? `Tecnico rilevatore - ${office}` : 'Tecnico rilevatore'
  if (role === 'TI') return office ? `Tecnico istruttore - ${office}` : 'Tecnico istruttore'
  if (role === 'RZ') return sector ? `Capo Settore ${sector}` : 'Capo Settore'
  if (role === 'RI') return area ? `Responsabile istruttoria - ${area}` : 'Responsabile istruttoria'
  if (role === 'DT') return area ? `Direttore - ${area}` : 'Direttore d’Area'
  if (role === 'TI_AMM') return 'Tecnico istruttore amministrativo'
  if (role === 'RI_AMM') return 'Responsabile istruttoria amministrativa'
  if (role === 'DA') return 'Direttore Area AA. GG. e P.F.'

  const fallback = roleLabelForBody(
    alertSenderFromMessage(alert as any) ||
    alertSenderFallbackFromActivitySubtype(alert as any) ||
    alertSenderFallbackFromTitle(alert as any) ||
    alertRoleLabelFromGiiActor(firstNonEmptyAlertRawValue(alert, ['GII_da', 'gii_da']))
  )
  return fallback
}

function alertActorRoleForBody (alert: GiiAlertItem | null | undefined): string {
  const role = alertSenderRoleCode(alert)
  const office = officeRefFromAlert(alert)
  const sector = settoreFullLabelFromAlert(alert)
  const area = areaRefFromAlert(alert)

  if (role === 'TR') return office ? `tecnico rilevatore dell’${office}` : 'tecnico rilevatore'
  if (role === 'TI') return office ? `tecnico istruttore dell’${office}` : 'tecnico istruttore'
  if (role === 'RZ') return sector ? `Capo Settore ${sector}` : 'Capo Settore'
  if (role === 'RI') return area ? `Responsabile istruttoria dell’${area}` : 'Responsabile istruttoria'
  if (role === 'DT') return area ? `Direttore dell’${area}` : 'Direttore d’Area'
  if (role === 'TI_AMM') return 'tecnico istruttore amministrativo'
  if (role === 'RI_AMM') return 'Responsabile istruttoria amministrativa'
  if (role === 'DA') return 'Direttore Area AA. GG. e P.F.'

  return roleLabelForBody(
    alertSenderFromMessage(alert as any) ||
    alertSenderFallbackFromActivitySubtype(alert as any) ||
    alertSenderFallbackFromTitle(alert as any) ||
    alertRoleLabelFromGiiActor(firstNonEmptyAlertRawValue(alert, ['GII_da', 'gii_da']))
  )
}

function alertActorPhrase (alert: GiiAlertItem | null | undefined, fallbackRole = 'mittente'): string {
  const role = alertActorRoleForBody(alert) || fallbackRole
  return `Il ${role}`
}

function parseUsernameFromGiiActorLabel (value: any): string {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const parts = text.split(/\s+-\s+/)
  if (parts.length > 1) return String(parts.slice(1).join(' - ') || '').trim()
  return text
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
  if (/^(TR|TI|RZ|RI|DT|DA|DIR)$/.test(text)) return true
  if (/^(TI|RI)[\s-]+AMM$/.test(text)) return true
  if (/^(TR|TI|RZ|RI|DT|DIR)[\s-]*(AGR|TEC|AMM|D[1-6]|DS|CR)$/.test(text)) return true
  return false
}

function looksLikeGiiRoleLabel (value: any): boolean {
  const norm = String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
  return /^(TECNICO RILEVATORE|TECNICO ISTRUTTORE|TECNICO ISTRUTTORE AMMINISTRATIVO|RESPONSABILE DI ZONA|CAPO SETTORE(?:\s+(?:D[1-6]|DS|CR))?|RESPONSABILE ISTRUTTORIA|RESPONSABILE ISTRUTTORIA AMMINISTRATIVA|DIRETTORE D[’']AREA|DIRETTORE AREA AMMINISTRATIVA)$/.test(norm)
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

function alertTechnicianDisplayName (alert: GiiAlertItem | null | undefined): string {
  const isTi = alertIsTiOrigin(alert)
  const resolved = firstNonEmptyAlertRawValue(alert, [isTi ? '__gii_tecnico_istruttore_full_name' : '__gii_tecnico_rilevatore_full_name'])
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
    const text = parseUsernameFromGiiActorLabel(value)
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

  alertRawValues(alert, ['GII_da', 'gii_da']).forEach(push)

  return out
}

function alertSenderDisplayName (alert: GiiAlertItem): string {
  const resolved = firstNonEmptyAlertRawValue(alert, ['__gii_actor_full_name'])
  if (resolved) return String(resolved).trim()

  if (alertIsNewRilevazione(alert)) {
    const tecnico = alertTechnicianDisplayName(alert)
    if (tecnico && !isSenderDisplayNoise(tecnico)) return String(tecnico).trim()
  }

  const directName = alertSenderUserCandidates(alert)
    .map(maybePersonDisplayName)
    .find(Boolean)
  if (directName) return String(directName).trim()

  // Gli username restano solo chiavi tecniche per risolvere il nominativo.
  // Non vengono mai mostrati nella card allarmi.
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
  if (subtype.startsWith('RI_AMM_')) return 'Responsabile Istruttoria amministrativa'
  if (subtype.startsWith('RI_')) return 'Responsabile Istruttoria'
  if (subtype.startsWith('RZ_')) return 'Capo Settore'
  if (subtype.startsWith('TI_AMM_')) return 'Tecnico Istruttore amministrativo'
  if (subtype.startsWith('DA_')) return 'Direttore Area AA. GG. e P.F.'
  if (subtype.startsWith('TI_')) return 'Tecnico istruttore'
  if (subtype.startsWith('TR_')) return 'Tecnico rilevatore'
  return ''
}

function alertSenderFallbackFromTitle (alert: GiiAlertItem): string {
  const title = String(alert?.title || '').trim().toUpperCase()
  if (title.includes('DIRETTORE D’AREA') || title.includes("DIRETTORE D'AREA")) return 'Direttore d’Area'
  if (title.includes('TECNICO ISTRUTTORE AMMINISTRATIVO')) return 'Tecnico Istruttore amministrativo'
  if (title.includes('RESPONSABILE ISTRUTTORIA AMMINISTRATIVA')) return 'Responsabile Istruttoria amministrativa'
  if (title.includes('RESPONSABILE ISTRUTTORIA')) return 'Responsabile Istruttoria'
  if (title.includes('RESPONSABILE DI ZONA')) return 'Capo Settore'
  return ''
}

function alertRoleLabelFromGiiActor (value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (looksLikeGiiRoleLabel(raw)) return raw
  const tag = raw.split(/\s+-\s+/)[0].trim().toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')

  if (tag === 'DIR-AMM' || tag === 'DA') return 'Direttore Area AA. GG. e P.F.'
  if (tag === 'RI-AMM') return 'Responsabile Istruttoria amministrativa'
  if (tag === 'TI-AMM') return 'Tecnico Istruttore amministrativo'
  if (tag === 'DIR' || tag.startsWith('DIR-') || tag === 'DT' || tag.startsWith('DT-')) return 'Direttore d’Area'
  if (tag === 'RI' || /^RI-(AGR|TEC|D\d|DS|CR)$/.test(tag)) return 'Responsabile Istruttoria'
  if (tag === 'RZ' || tag.startsWith('RZ-')) return 'Capo Settore'
  if (tag === 'TI' || tag.startsWith('TI-')) return 'Tecnico istruttore'
  if (tag === 'TR' || tag.startsWith('TR-')) return 'Tecnico rilevatore'

  return ''
}

function alertSenderFallbackFromRoutingFields (alert: GiiAlertItem): string {
  const giiDa = firstNonEmptyAlertRawValuePracticeFirst(alert, ['GII_da', 'gii_da'])
  const fromGiiDa = alertRoleLabelFromGiiActor(giiDa)
  if (fromGiiDa) return fromGiiDa

  const creator = firstNonEmptyAlertRawValuePracticeFirst(alert, ['creato_da', 'aggiornato_da'])
  return alertRoleLabelFromGiiActor(creator)
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
  else if (role === 'TI') label = 'Tecnico istruttore'
  else if (role === 'RZ') label = 'Capo Settore'
  else if (role === 'RI') label = 'Responsabile istruttoria'
  else if (role === 'DT') label = 'Direttore d’Area'
  else if (role === 'TI_AMM') label = 'Tecnico istruttore amministrativo'
  else if (role === 'RI_AMM') label = 'Responsabile istruttoria amministrativa'
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

  if (role === 'TR' || role === 'TI') {
    if (sector && office) return `Settore - Ufficio: ${sector} - ${office}`
    if (sector) return `Settore: ${sector}`
    if (office) return `Ufficio: ${office}`
  }

  if (role === 'RZ') {
    return sector ? `Settore: ${sector}` : ''
  }

  if (role === 'RI' || role === 'DT') {
    return area ? `Area: ${area}` : ''
  }

  if (role === 'TI_AMM' || role === 'RI_AMM') {
    const settore = settoreFullLabelFromAlert(alert) || 'Catasto, Ruoli e Servizi Territoriali'
    return `Settore: ${settore}`
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
    'RZ_RESPINGE_RILEVAZIONE',
    'RZ_APPROVA_RILEVAZIONE',
    'RICHIESTA_INTEGRAZIONE',
    'INTEGRAZIONE_TRASMESSA',
    'DT_APPROVA_RAPPORTO',
    'DT_RESPINGE_RAPPORTO',
    'DT_RIMANDA_A_TI',
    'RI_RIMANDA_A_TI'
  ].includes(subtype)) return true

  if (event === 'ISTRUTTORIA_TRASMESSA' || event === 'INVIO_A_TI_AMM') return true

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

function cleanUserDisplayName (value: any, username?: any): string {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!text) return ''
  if (looksLikeGiiRoleLabel(text) || looksLikeGiiRoleCode(text)) return ''
  const user = String(username ?? '').trim()
  if (user && normalizeUsernameLookupKey(text) === normalizeUsernameLookupKey(user)) return ''
  const compactText = text.toLowerCase().replace(/[\s._-]+/g, '')
  const compactUser = user.toLowerCase().replace(/[\s._-]+/g, '')
  if (compactUser && compactText === compactUser) return ''
  return text
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

function addLookupAliasIfWanted (out: Map<string, string>, wanted: Set<string>, alias: any, fullName: string): void {
  const text = String(alias ?? '').trim()
  if (!text || !fullName) return
  const key = normalizeUsernameLookupKey(text)
  if (key && wanted.has(key) && !out.has(key)) out.set(key, fullName)
}

function addGiiUserLookupAliases (out: Map<string, string>, wanted: Set<string>, attrs: Record<string, any>, username: string, fullName: string): void {
  addLookupAliasIfWanted(out, wanted, username, fullName)

  const role = codeFromGiiUserAttrs(attrs, ['ruolo_cod', 'ruoloCod', 'role_cod'], ['ruolo', 'role'], RUOLO_LABEL)
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

async function loadPortalUserFullNameMap (values: string[]): Promise<Map<string, string>> {
  const candidates = Array.from(new Set(
    (values || [])
      .map(v => String(v ?? '').trim())
      .filter(v => !!v && !looksLikeGiiRoleLabel(v) && !looksLikeGiiRoleCode(v) && !isSenderDisplayNoise(v))
  ))
  const out = new Map<string, string>()
  if (!candidates.length) return out

  try {
    const token = await getToken()
    if (!token) return out

    for (const username of candidates.slice(0, 60)) {
      try {
        const url = `${GII_PORTAL}/sharing/rest/community/users/${encodeURIComponent(username)}?f=json&token=${encodeURIComponent(token)}`
        const res = await fetch(url)
        const json = await res.json()
        const fullName = cleanResolvedUserFullName(json?.fullName || json?.full_name || json?.name, username)
        if (fullName) out.set(normalizeUsernameLookupKey(username), fullName)
      } catch { }
    }
  } catch { }

  return out
}

async function loadGiiUserFullNameMap (values: string[]): Promise<Map<string, string>> {
  const candidates = Array.from(new Set(
    (values || [])
      .map(v => String(v ?? '').trim())
      .filter(Boolean)
  ))

  const wanted = new Set(candidates.map(normalizeUsernameLookupKey).filter(Boolean))
  const out = new Map<string, string>()
  if (!wanted.size) return out

  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const layer = new FeatureLayer({ url: GII_UTENTI_URL })
    if (typeof layer.load === 'function') await layer.load()

    const fieldNameByLower = new Map<string, string>()
    ;(Array.isArray(layer?.fields) ? layer.fields : [])
      .map((f: any) => String(f?.name || '').trim())
      .filter(Boolean)
      .forEach((name: string) => fieldNameByLower.set(name.toLowerCase(), name))
    const pickFields = [
      'username', 'user_name', 'agol_username',
      'full_name', 'nome', 'cognome', 'fullName', 'nome_cognome', 'nomeCompleto', 'nominativo', 'display_name', 'displayName', 'name',
      'ruolo', 'ruolo_cod', 'ruoloCod', 'area', 'area_cod', 'areaCod', 'settore', 'settore_cod', 'settoreCod', 'ufficio', 'id_ufficio'
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
      const res = await layer.queryFeatures(q)
      const features = Array.isArray(res?.features) ? res.features : []

      features.forEach((f: any) => {
        const attrs = f?.attributes || {}
        const username = String(attrValueCi(attrs, ['username', 'USERNAME', 'user_name', 'agol_username']) ?? '').trim()
        const fullName = fullNameFromGiiUserAttrs(attrs)
        if (!fullName) return
        addGiiUserLookupAliases(out, wanted, attrs, username, fullName)
      })

      if (features.length < pageSize || out.size >= wanted.size) break
      offset += features.length
    }
  } catch { }

  const unresolvedCandidates = candidates.filter(v => !out.has(normalizeUsernameLookupKey(v)))
  if (unresolvedCandidates.length) {
    const portalNames = await loadPortalUserFullNameMap(unresolvedCandidates)
    portalNames.forEach((fullName, key) => {
      if (wanted.has(key) && !out.has(key)) out.set(key, fullName)
    })
  }

  return out
}

function technicianUserCandidates (alert: GiiAlertItem, isTi: boolean): string[] {
  const usernameFields = isTi
    ? [
      'ti_assegnato_username',
      'TI_ASSEGNATO_USERNAME',
      'tecnico_istruttore_username',
      'username_tecnico_istruttore',
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

  const fallbackFields = isTi
    ? [
      'ti_assegnato_nome',
      'TI_ASSEGNATO_NOME',
      'responsabile_istruttore',
      'Responsabile_istruttore'
    ]
    : [
      'tecnico_rilevatore',
      'Tecnico_rilevatore',
      'TECNICO_RILEVATORE'
    ]

  return [
    ...alertRawValuesPracticeFirst(alert, usernameFields),
    ...alertRawValuesPracticeFirst(alert, fallbackFields)
  ].map(v => parseUsernameFromGiiActorLabel(v)).filter(Boolean)
}

async function enrichAlertsWithActorFullNames (alerts: GiiAlertItem[]): Promise<GiiAlertItem[]> {
  const list = Array.isArray(alerts) ? alerts : []
  if (!list.length) return list

  const allCandidates: string[] = []
  list.forEach(alert => {
    alertSenderUserCandidates(alert).forEach(v => allCandidates.push(v))
    const isTi = alertIsTiOrigin(alert)
    technicianUserCandidates(alert, isTi).forEach(v => allCandidates.push(v))
  })

  const fullNameByUsername = await loadGiiUserFullNameMap(allCandidates)
  if (!fullNameByUsername.size) return list

  return list.map(alert => {
    const isTi = alertIsTiOrigin(alert)
    const actorResolved = alertSenderUserCandidates(alert)
      .map(v => fullNameByUsername.get(normalizeUsernameLookupKey(v)))
      .find(v => !!String(v || '').trim())
    const technicianResolved = technicianUserCandidates(alert, isTi)
      .map(v => fullNameByUsername.get(normalizeUsernameLookupKey(v)))
      .find(v => !!String(v || '').trim())

    if (!actorResolved && !technicianResolved) return alert

    return {
      ...alert,
      raw: {
        ...(alert.raw || {}),
        ...(actorResolved ? { __gii_actor_full_name: actorResolved } : {}),
        ...(technicianResolved ? { [isTi ? '__gii_tecnico_istruttore_full_name' : '__gii_tecnico_rilevatore_full_name']: technicianResolved } : {})
      }
    }
  })
}

function alertPracticeLine (alert: GiiAlertItem): string {
  if (isGiiTakeChargeAlert(alert)) return String(alert.reportCode || alert.message || '').trim()
  return String(alert.message || alert.reportCode || '').trim()
}

function alertDisplayPracticeLine (alert: GiiAlertItem): string {
  const line = alertPracticeLine(alert)
  const clean = String(line || '').replace(/^Pratica\s*:\s*/i, '').trim()

  if (alertIsNewRilevazione(alert)) return clean ? `Pratica: ${clean}` : ''

  if (isGiiTakeChargeAlert(alert)) {
    // Per le attività operative il corpo mostrato dal pannello è in realtà
    // l'identificativo della pratica da prendere in carico. Lo rendiamo
    // coerente con le informative: “Pratica: Rilevazione n. ...”.
    if (/^(Rilevazione|Rapporto\s+tecnico|Rapporto)\s+n\.?\s+/i.test(clean)) {
      return `Pratica: ${clean}`
    }
  }

  return line
}

async function enrichAlertsWithPracticeMeta (alerts: GiiAlertItem[], practiceLayerUrl: string): Promise<GiiAlertItem[]> {
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

  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const layer = new FeatureLayer({ url })
    if (typeof layer.load === 'function') await layer.load()
    const oidField = String(layer?.objectIdField || 'OBJECTID')
    const byOid = new Map<number, Record<string, any>>()

    for (let i = 0; i < objectIds.length; i += 50) {
      const chunk = objectIds.slice(i, i + 50)
      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = `${oidField} IN (${chunk.join(',')})`
      q.outFields = ['*']
      q.returnGeometry = false
      const res = await layer.queryFeatures(q)
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
  } catch {
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
  if (raw === 'CS') return 'DS'
  const m = raw.match(/^D\s*([1-6])$/)
  if (m) return `D${m[1]}`
  return raw
}


function materializeAlertDestRole (user: any): string {
  const role = String(user?.profiloCod || user?.ruoloCod || user?.role || '').trim().toUpperCase()
  if (role === 'TI_AMM' || role === 'RI_AMM' || role === 'DA') return role
  if (role === 'ADMIN') return ''
  if (role.startsWith('DT')) return 'DT'
  if (role.startsWith('RI') && role !== 'RI_AMM') return 'RI'
  if (role.startsWith('RZ')) return 'RZ'
  if (role.startsWith('TI') && role !== 'TI_AMM') return 'TI'
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
  if (alertIsNewRilevazione(alert)) return 'Nuova rilevazione ricevuta'
  if (alertIsNewAssignmentReceived(alert)) return 'Nuova istruttoria assegnata'
  const t = String(alert?.title || '').trim()
  return t || 'Nuova istruttoria ricevuta'
}

function materializeAlertMessage (alert: GiiAlertItem): string {
  const m = String(alertPracticeLine(alert) || alert?.message || '').trim()
  return m || materializeAlertNumber(alert) || '—'
}


// Normalizzazione limitata alle sole rilevazioni create da TR tramite Survey.
// Il TI compila dal gestionale e ha già i controlli uppercase lato interfaccia.
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
}): Promise<number> {
  const url = normalizeGiiFeatureLayerUrl(args.practiceLayerUrl)
  const alerts = Array.isArray(args.dynamicAlerts) ? args.dynamicAlerts : []
  if (!url || !alerts.length) return 0

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
    if (typeof layer.load === 'function') await layer.load()

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
      const chunk = objectIds.slice(i, i + chunkSize)
      const q = layer.createQuery ? layer.createQuery() : {}
      q.objectIds = chunk
      q.outFields = Array.from(new Set([oidField, originField, flagField, dateField, userField, ...uppercaseFields, ...lowercaseFields].filter(Boolean)))
      q.returnGeometry = false
      const res = await layer.queryFeatures(q)
      const features = Array.isArray(res?.features) ? res.features : []
      if (!features.length) continue

      const updates: any[] = []
      for (const f of features) {
        const attrs = { ...(f?.attributes || {}) }
        const oid = attrs[oidField] ?? attrs.OBJECTID ?? attrs.objectid
        if (oid === null || oid === undefined) continue

        // La normalizzazione uppercase riguarda esclusivamente le rilevazioni Survey/TR.
        // I record creati da TI non devono essere ripassati qui perché sono già vincolati
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
        await layer.applyEdits({ updateFeatures: updates })
        changed += updates.length
      }
    }

    return changed
  } catch (e) {
    console.warn('[GII] Normalizzazione testi Survey non riuscita:', e)
    return 0
  }
}

async function materializeMissingTakeChargeActivities (args: {
  currentActivities: GiiAlertItem[]
  dynamicAlerts: GiiAlertItem[]
  user: any
}): Promise<number> {
  const currentKeys = new Set((args.currentActivities || []).map(a => giiAlertPracticeIdentityKey(a)).filter(Boolean))
  const missing = (args.dynamicAlerts || [])
    .filter(a => isGiiTakeChargeAlert(a))
    .filter(a => {
      const key = giiAlertPracticeIdentityKey(a)
      return !!key && !currentKeys.has(key)
    })

  if (!missing.length) return 0

  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const layer = new FeatureLayer({ url: GII_ATTIVITA_CORRENTI_WRITE_URL, outFields: ['*'] })
    if (typeof layer.load === 'function') await layer.load()

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
      const parentGlobalId = String(alert.parentGlobalId || materializeAlertPick(alert, ['globalid', 'GlobalID', 'parent_globalid']) || '').trim()
      if (!parentGlobalId) continue

      const parentObjectId = Number(alert.parentObjectId)
      const area = materializeAlertArea(alert, args.user)
      const settore = materializeAlertSector(alert, args.user)
      const ufficioId = materializeAlertOfficeId(alert, args.user)
      const role = materializeAlertDestRole(args.user)
      // La materializzazione serve per le nuove rilevazioni Survey/TR dirette al RZ.
      // Per gli altri ruoli le attività correnti devono continuare a essere generate
      // dai widget operativi che chiudono/aprono i cicli.
      if (role !== 'RZ') continue
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
      const found = await layer.queryFeatures(q)
      const existing = found?.features?.[0]?.attributes || null
      const existingOid = existing?.[oidField] ?? existing?.OBJECTID ?? existing?.objectid
      if (existingOid != null) {
        await layer.applyEdits({ updateFeatures: [{ attributes: { [oidField]: existingOid, ...attrs } }] })
      } else {
        await layer.applyEdits({ addFeatures: [{ attributes: attrs }] })
      }
      changed += 1
    }

    return changed
  } catch (e) {
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
  const requestedByRole = normCode(currentUser?.profiloCod || currentUser?.ruoloCod || currentUser?.ruolo_cod || currentUser?.ruoloLabel || '')
  const requestedByArea = normCode(currentUser?.areaCod || currentUser?.area_cod || '')
  const requestedBySettore = normCode(currentUser?.settoreCod || currentUser?.settore_cod || '')
  const requestedByUfficio = currentUser?.ufficio != null && currentUser?.ufficio !== '' ? String(currentUser.ufficio).trim() : ''

  const intent = {
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
  }

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
  if (total <= 0 && !props.error) return null
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
      <span aria-hidden='true'>🔔</span>
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
  homeMode?: boolean
  onClose: () => void
  onOpenPractice: (alert: GiiAlertItem) => void
  onArchive: (alert: GiiAlertItem) => void
}) {
  const popupAlerts = sortAlertsForPopup(props.alerts || [])
  const popup = (
    <div
      data-gii-global-alert-popup='1'
      style={{ position: 'fixed', inset: 0, zIndex: 2147483646, pointerEvents: 'none' }}
    >
      <div style={{ position: 'absolute', right: 18, top: 82, width: 430, maxWidth: 'calc(100vw - 28px)', maxHeight: 'calc(100vh - 110px)', overflow: 'hidden', borderRadius: 16, background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 24px 70px rgba(0,0,0,0.45)', color: '#e5e7eb', backdropFilter: 'blur(14px)', pointerEvents: 'auto' }}>
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
            const showMeta = (!isGiiTakeChargeAlert(alert) || alert.termineData != null) && !isStandardWorkflow
            const showPracticeAsOwnLine = !!practiceLine && (!showMeta || !bodyLine)
            const metaLineStyle: React.CSSProperties = { fontSize: 14, color: '#cbd5e1', lineHeight: 1.35, marginTop: 3, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'normal' }
            return (
              <div key={alert.alertKey} style={{ border: `1px solid ${color}66`, background: `${color}16`, borderRadius: 12, padding: 11 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginTop: 4, flex: '0 0 auto' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'normal', lineHeight: 1.25 }}>{alertDisplayTitle(alert)}</div>
                    {bodyLine && (
                      <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.35, marginTop: 3, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'normal' }}>{bodyLine}</div>
                    )}
                    {showPracticeAsOwnLine && (
                      <div style={metaLineStyle}>{practiceLine}</div>
                    )}
                    {showMeta && (
                      <div style={metaLineStyle}>
                        Pratica: {alert.reportCode}{alert.termineData != null ? ` · Termine: ${formatAlertDate(alert.termineData)}` : ''}
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

  // Flag per forzare il reset dei datasource dopo un ciclo logout→login.
  // In alcuni casi (ExB 1.19) l'Elenco può restare in loading infinito se non si reinizializza l'app.
  const NEEDS_DS_RESET_KEY = '__giiNeedsDsReset'

  // ── Refs configurazione (per usare i valori aggiornati negli handler registrati una sola volta)
  const afterInRef  = React.useRef<string>(String(cfg.redirectAfterSignIn ?? ''))
  const afterOutRef = React.useRef<string>(String(cfg.redirectAfterSignOut ?? ''))
  const loginViewRef = React.useRef<'popup'|'redirect'>((cfg.loginView ?? 'popup') as any)
  const signedInClickRef = React.useRef<'signout'|'menu'>((cfg.signedInClick ?? 'signout') as any)
  const forceReloadRef = React.useRef<boolean>((cfg.forceReloadAfterLogoutLogin ?? true) as any)

  React.useEffect(() => { afterInRef.current  = String(cfg.redirectAfterSignIn ?? '') }, [cfg.redirectAfterSignIn])
  React.useEffect(() => { afterOutRef.current = String(cfg.redirectAfterSignOut ?? '') }, [cfg.redirectAfterSignOut])
  React.useEffect(() => { loginViewRef.current = (cfg.loginView ?? 'popup') as any }, [cfg.loginView])
  React.useEffect(() => { signedInClickRef.current = (cfg.signedInClick ?? 'signout') as any }, [cfg.signedInClick])
  React.useEffect(() => { forceReloadRef.current = (cfg.forceReloadAfterLogoutLogin ?? true) as any }, [cfg.forceReloadAfterLogoutLogin])


  const [user,     setUser]    = React.useState<GiiUserRole | null>(null)
  const [uLoad,    setULoad]   = React.useState(true)
  const [signingIn,setSigning] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [urlTick, setUrlTick] = React.useState(0)
  const [alerts, setAlerts] = React.useState<GiiAlertItem[]>([])
  const [alertCounts, setAlertCounts] = React.useState<GiiAlertQueryResult['counts']>(() => emptyAlertCounts())
  const [alertsLoading, setAlertsLoading] = React.useState(false)
  const [alertsError, setAlertsError] = React.useState('')
  const [alertsOpen, setAlertsOpen] = React.useState(false)
  const [archivingAlertKey, setArchivingAlertKey] = React.useState('')
  const guardLockRef = React.useRef(false)

  React.useEffect(() => {
    let cancelled = false
    let hCreate: any = null
    let hDestroy: any = null

    const dispatchBoot = (detail: any) => {
      try { window.dispatchEvent(new (window as any).CustomEvent('gii:userLoaded', { detail })) } catch {
        try { window.dispatchEvent(new Event('gii:userLoaded')) } catch { }
      }
    }

    const clearCache = () => {
      try { delete (window as any).__giiUserRole } catch { (window as any).__giiUserRole = null }
    }

    const refresh = async (reason: string) => {
      setULoad(true)
      const u = await loadUser()
      if (cancelled) return
      setUser(u)
      setULoad(false)
      dispatchBoot({ source: 'header-boot', reason, username: u?.username || '' })
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
            clearCache()
            refresh('credential-create')
            try {
              const tok = String(afterInRef.current || '').trim()
              if (tok) gotoPage(tok)
            } catch { }

            // Se provengo da un logout nella stessa sessione, ricarico la pagina 1 volta
            // per resettare i datasource e sbloccare eventuali spinner infiniti.
            try {
              const needs = sessionStorage.getItem(NEEDS_DS_RESET_KEY) === '1'
              const enabled = !!forceReloadRef.current
              if (needs) {
                sessionStorage.removeItem(NEEDS_DS_RESET_KEY)
                if (enabled) {
                  setTimeout(() => {
                    try { window.location.reload() } catch { }
                  }, 120)
                }
              }
            } catch { }
          })
          hDestroy = esriId.on('credentials-destroy', () => {
            clearCache()
            if (cancelled) return
            setUser(null)
            setULoad(false)
            dispatchBoot({ source: 'header-boot', reason: 'credentials-destroy' })
            try {
              const tok = String(afterOutRef.current || '').trim()
              if (tok) gotoPage(tok)
            } catch { }

            // Segna che al prossimo login serve un reset dei datasource
            // (risolve Elenco che gira a vuoto dopo logout/login).
            try { sessionStorage.setItem(NEEDS_DS_RESET_KEY, '1') } catch { }
          })
        } catch { }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      window.removeEventListener('gii:userLoaded', onExternal)
      try { hCreate?.remove?.() } catch { }
      try { hDestroy?.remove?.() } catch { }
    }
  }, [])
  React.useEffect(() => { if (!user) setMenuOpen(false) }, [user])

  React.useEffect(() => {
    const onUrl = () => setUrlTick(t => t + 1)
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


  const refreshAlerts = React.useCallback(async () => {
    const enabled = cfg.alertsEnabled ?? true
    const practiceLayerUrl = selectAlertPracticeLayerUrl(cfg, user)
    const activityLayerUrl = selectCurrentActivityLayerUrl(cfg, user)
    const archiveTableUrl = selectAlertArchiveTableUrl(cfg, user)

    if (!enabled || !user?.username || !canUseGiiAlerts(user) || !activityLayerUrl) {
      setAlerts([])
      setAlertCounts(emptyAlertCounts())
      setAlertsError('')
      return
    }

    setAlertsLoading(true)

    const alertUser = {
      username: user.username,
      fullName: user.fullName,
      role: user.profiloCod || user.ruoloCod,
      roleCod: user.profiloCod || user.ruoloCod,
      areaCod: user.areaCod,
      settoreCod: user.settoreCod,
      ufficio: user.ufficio,
      isAdmin: !!user.isWorkflowAdmin
    }

    let currentActivities: GiiAlertItem[] = []

    const readCurrentActivities = async (): Promise<GiiAlertItem[]> => {
      const current = await withGiiTimeout(queryGiiCurrentActivities({
        activityLayerUrl,
        archiveTableUrl,
        user: alertUser,
        pageSize: 100
      }), 8000, 'Timeout caricamento attività correnti.')
      return sortAlertsForPopup(current.alerts || [])
    }

    const enrichAlertsForPopup = async (items: GiiAlertItem[]): Promise<GiiAlertItem[]> => {
      return sortAlertsForPopup(await enrichAlertsWithActorFullNames(await enrichAlertsWithPracticeMeta(items, practiceLayerUrl)))
    }

    try {
      // La campanella deve comparire subito: il primo caricamento usa solo la
      // tabella/vista GII_ATTIVITA_CORRENTI, che è la fonte veloce e ordinaria.
      currentActivities = await readCurrentActivities()
      setAlerts(currentActivities)
      setAlertCounts(summarizeGiiAlerts(currentActivities))
      setAlertsError('')
      setAlertsLoading(false)
    } catch (e: any) {
      setAlerts([])
      setAlertCounts(emptyAlertCounts())
      setAlertsError(e?.message || String(e))
      setAlertsLoading(false)
      return
    }

    if (!practiceLayerUrl || !archiveTableUrl) return

    // Il controllo sul FL madre resta necessario per intercettare le rilevazioni TR
    // appena arrivate, ma non deve più bloccare la comparsa della campanella. Lo
    // eseguiamo in background: se materializza nuove attività, rilegge la vista e
    // aggiorna la lista una sola volta.
    ;(async () => {
      try {
        let popupCurrentActivities = currentActivities
        if (currentActivities.length > 0) {
          popupCurrentActivities = await enrichAlertsForPopup(currentActivities)
          setAlerts(popupCurrentActivities)
          setAlertCounts(summarizeGiiAlerts(popupCurrentActivities))
        }

        const res = await withGiiTimeout(queryGiiAlerts({
          practiceLayerUrl,
          archiveTableUrl,
          user: alertUser,
          warningDays: Number(cfg.alertsWarningDays ?? 5)
        }), 25000, 'Timeout caricamento scadenze e anomalie.')

        const dynamicAlerts = await enrichAlertsForPopup(res.alerts || [])

        // Stesso passaggio background usato per materializzare le nuove rilevazioni TR:
        // normalizziamo i testi arrivati da Survey senza bloccare la campanella.
        const normalizedCount = await normalizeSurveyUppercaseFields({
          practiceLayerUrl,
          dynamicAlerts,
          user
        })

        const materializedCount = await materializeMissingTakeChargeActivities({
          currentActivities,
          dynamicAlerts,
          user
        })

        const refreshedActivities = (materializedCount > 0 || normalizedCount > 0) ? await enrichAlertsForPopup(await readCurrentActivities()) : popupCurrentActivities
        const finalAlerts = sortAlertsForPopup(mergeCurrentAndFallbackGiiAlerts(refreshedActivities, dynamicAlerts))
        setAlerts(finalAlerts)
        setAlertCounts(summarizeGiiAlerts(finalAlerts))
        setAlertsError('')
      } catch (e: any) {
        // Se fallisce solo il controllo del FL/scadenze, lasciamo visibili le
        // attività correnti già caricate: non oscuriamo la campanella e non
        // mostriamo errori se l'utente ha comunque attività correnti valide.
        if (currentActivities.length === 0) {
          setAlertsError(e?.message || String(e))
        }
      }
    })()
  }, [
    cfg.alertsEnabled,
    cfg.alertsPracticeLayerUrl,
    cfg.alertsPracticeLayerUrlTecnici,
    cfg.alertsPracticeLayerUrlAgr,
    cfg.alertsPracticeLayerUrlTec,
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
    user?.areaCod,
    user?.settoreCod,
    user?.ufficio,
    user?.isWorkflowAdmin
  ])

  React.useEffect(() => {
    if (!(cfg.alertsEnabled ?? true) || !user?.username) return
    refreshAlerts()
    const secs = Math.max(30, Number(cfg.alertsPollSeconds ?? 60) || 60)
    const id = window.setInterval(refreshAlerts, secs * 1000)
    const onChanged = () => {
      // Qualsiasi azione operativa sulla pratica deve chiudere il popup allarmi:
      // il refresh può svuotare o cambiare la lista e lasciarla aperta crea ambiguità.
      setAlertsOpen(false)
      refreshAlerts()
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
    refreshEvents.forEach(evt => window.addEventListener(evt, onChanged as EventListener))
    return () => {
      window.clearInterval(id)
      refreshEvents.forEach(evt => window.removeEventListener(evt, onChanged as EventListener))
    }
  }, [cfg.alertsEnabled, cfg.alertsPollSeconds, user?.username, refreshAlerts])

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
      try { window.dispatchEvent(new CustomEvent('gii-alerts-archived', { detail: { alertKey: alert.alertKey } })) } catch {}
      await refreshAlerts()
    } catch (e: any) {
      setAlertsError(e?.message || String(e))
    } finally {
      setArchivingAlertKey('')
    }
  }, [cfg.alertsArchiveTableUrl, cfg.alertsArchiveTableUrlTecnici, user?.username, user?.fullName, user?.profiloCod, user?.ruoloCod, user?.areaCod, refreshAlerts])


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
      if (outTok) {
        if (!curId || !outId || curId !== outId) {
          safeGoto(outTok)
        }
      }
      return
    }

    // 2) Autenticato: se sei su Accesso (pagina post-logout), vai alla home operativa
    if (user && outTok && inTok) {
      if (outId && curId && curId === outId) {
        safeGoto(inTok)
      }
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

  const accountHierarchyParts = React.useMemo(() => getOrganizationalHierarchy(user, false), [user])
  const accountHierarchy = accountHierarchyParts.join(' · ')
  const displayRoleCode = user?.profiloCod || user?.ruoloLabel || ''
  const displayRoleLabel = user?.profiloLabel || user?.ruoloFull || ''
  const displayRoleBadge = displayRoleLabel || displayRoleCode

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
      `}</style>

      {alertsOpen && showHeaderAlertBell && (
        <HeaderAlertsPopup
          alerts={alerts}
          counts={alertCounts}
          loading={alertsLoading}
          error={alertsError}
          archivingKey={archivingAlertKey}
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
            <AlertBellButton counts={alertCounts} loading={alertsLoading} error={alertsError} onClick={() => { if (showHeaderAlertBell) setAlertsOpen(true) }} />
          </div>
        )}
        {(cfg.showUserBanner ?? true) && (
          <div style={{ ...off('offsetBanner') }}>
            {uLoad ? (
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(147,197,253,0.2)',borderTopColor:'#60a5fa',animationName:'spin',animationDuration:'0.8s',animationIterationCount:'infinite',animationTimingFunction:'linear' }} />
              <span style={{ fontSize:12,color:'rgba(147,197,253,0.6)' }}>Caricamento profilo…</span>
            </div>
          ) : user ? (
            <div style={{ display:'inline-flex',alignItems:'center',gap:14,background:cfg.userBannerBg,
              backdropFilter:'blur(8px)',border:`1px solid ${cfg.userBannerBorderColor}`,borderRadius:14,padding:'10px 18px',maxWidth:560 }}>
              <div style={{ width:38,height:38,borderRadius:'50%',
                background:`linear-gradient(135deg,${cfg.userAvatarBg1},${cfg.userAvatarBg2})`,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'#fff',flexShrink:0 }}>
                {(user.fullName||user.username).charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth:0, maxWidth:'100%' }}>
                <div style={{ fontSize:cfg.userNameSize,fontWeight:600,color:cfg.userNameColor,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0 }}>
                  Benvenuto, {user.fullName||user.username}
                </div>
                {displayRoleBadge && (
                  <div title={[displayRoleLabel, displayRoleCode].filter(Boolean).join(' · ')} style={{ fontSize:11.5,color:cfg.userInfoColor,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',display:'flex',alignItems:'center',gap:7,minWidth:0 }}>
                    <span style={{ background:cfg.userBadgeBg,border:`1px solid ${cfg.userBadgeColor}44`,borderRadius:6,padding:'1px 8px',fontSize:11.5,fontWeight:600,color:cfg.userBadgeColor,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:260 }}>{displayRoleBadge}</span>
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

        <div style={{ ...off('offsetLogin') }}>{cfg.showSignIn && !uLoad && (
          user ? (
            signedInClickRef.current === 'menu' ? (
              <div style={{ position:'relative' }}>
                <button type='button' disabled={signingIn}
                  onClick={()=>setMenuOpen(v=>!v)}
                  style={{ ...btnStyle, padding:'7px 14px', fontWeight:700, letterSpacing:0.2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Account
                  <span style={{ marginLeft:2, opacity:0.8 }}>▾</span>
                </button>

                {menuOpen && (
                  <div style={{
                    position:'absolute', right:0, top:'calc(100% + 8px)',
                    minWidth:210, zIndex:9999,
                    background:'rgba(17,24,39,0.92)',
                    border:'1px solid rgba(255,255,255,0.12)',
                    borderRadius:10,
                    boxShadow:'0 18px 40px rgba(0,0,0,0.35)',
                    padding:'10px 10px',
                    backdropFilter:'blur(10px)'
                  }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'#e5e7eb', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {user.fullName || user.username}
                    </div>
                    <div style={{ fontSize:11.5, color:'rgba(147,197,253,0.75)', marginBottom:10, lineHeight:1.35 }}>
                      {[displayRoleBadge, accountHierarchy].filter(Boolean).join(' · ')}
                    </div>

                    <button type='button' disabled={signingIn}
                      onClick={async () => {
                        setSigning(true)
                        try { setMenuOpen(false); await signOut() } finally { setSigning(false) }
                      }}
                      style={{
                        width:'100%',
                        display:'flex', alignItems:'center', gap:8,
                        padding:'8px 10px',
                        borderRadius:8,
                        border:'1px solid rgba(255,255,255,0.12)',
                        background:'rgba(255,255,255,0.06)',
                        color:'#e5e7eb',
                        cursor:'pointer',
                        fontSize:12.5,
                        fontWeight:700
                      }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      {signingIn ? 'Uscita…' : 'Disconnetti'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
<button type='button' disabled={signingIn}
              onClick={async () => { setSigning(true); await signOut(); setSigning(false) }}
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
                try {
                  if (loginViewRef.current === 'redirect') {
                    const tok = String(afterOutRef.current || '').trim()
                    if (tok) { gotoPage(tok); return }
                  }
                  await signIn()
                } finally {
                  setSigning(false)
                }
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

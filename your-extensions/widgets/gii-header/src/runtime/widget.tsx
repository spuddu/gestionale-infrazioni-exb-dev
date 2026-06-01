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
  TR:'Tecnico rilevatore', TI:'Tecnico istruttore', RZ:'Responsabile di zona',
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

function getUfficioLabel(user: GiiUserRole | null): string {
  if (!user || user.ufficio == null) return ''
  return String(user.ufficioLabel || UFFICIO_LABEL[user.ufficio] || user.ufficio).trim()
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

function getOrganizationalContext(user: GiiUserRole | null, compact = true): string[] {
  if (!user || user.isWorkflowAdmin) return []

  const area = getAreaLabel(user)
  const settore = getSettoreLabel(user, compact)
  const ufficio = getUfficioLabel(user)

  const parts: string[] = []
  if (area) parts.push(`Area ${area}`)
  if (settore) parts.push(`Settore ${settore}`)
  if (ufficio) parts.push(`Ufficio di ${ufficio}`)
  return parts
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
  const popup = (
    <div
      data-gii-global-alert-popup='1'
      style={{ position: 'fixed', inset: 0, zIndex: 2147483646, pointerEvents: 'none' }}
    >
      <div style={{ position: 'absolute', right: 18, top: 82, width: 430, maxWidth: 'calc(100vw - 28px)', maxHeight: 'calc(100vh - 110px)', overflow: 'hidden', borderRadius: 16, background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 24px 70px rgba(0,0,0,0.45)', color: '#e5e7eb', backdropFilter: 'blur(14px)', pointerEvents: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.10)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>Allarmi e scadenze</div>
            <div style={{ color: 'rgba(203,213,225,0.75)', fontSize: 12, marginTop: 2 }}>
              {props.counts.total} attivi · {props.counts.scaduti + props.counts.critici} scaduti/critici · {props.counts.inScadenza} in scadenza
            </div>
          </div>
          <button type='button' onClick={props.onClose} style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', borderRadius: 9, padding: '6px 9px', cursor: 'pointer', fontWeight: 800 }}>Chiudi</button>
        </div>
        <div style={{ padding: 12, overflowY: 'auto', maxHeight: 'calc(100vh - 190px)', display: 'grid', gap: 10 }}>
          {props.error && <div style={{ border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(127,29,29,0.35)', color: '#fecaca', borderRadius: 10, padding: 10, fontSize: 12 }}>{props.error}</div>}
          {!props.loading && !props.error && props.alerts.length === 0 && props.counts.total <= 0 && (
            <div style={{ color: '#cbd5e1', fontSize: 13, padding: 10 }}>Nessun allarme attivo.</div>
          )}
          {props.alerts.map(alert => {
            const color = alertToneColor(alert.severity === 'red' ? 'red' : alert.severity === 'orange' ? 'orange' : 'blue')
            const showMeta = !isGiiTakeChargeAlert(alert) || alert.termineData != null
            return (
              <div key={alert.alertKey} style={{ border: `1px solid ${color}66`, background: `${color}16`, borderRadius: 12, padding: 11 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginTop: 4, flex: '0 0 auto' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>{alert.title}</div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.35, marginTop: 3 }}>{alert.message}</div>
                    {showMeta && (
                      <div style={{ fontSize: 11, color: 'rgba(203,213,225,0.65)', marginTop: 6 }}>
                        Pratica: <strong>{alert.reportCode}</strong>{alert.termineData != null ? ` · Termine: ${formatAlertDate(alert.termineData)}` : ''}
                      </div>
                    )}
                    <div style={{ marginTop: 9, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type='button' onClick={() => props.onOpenPractice(alert)} style={{ border: `1px solid ${color}88`, background: `${color}33`, color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 850 }}>Apri pratica</button>
                      {!props.homeMode && !isGiiTakeChargeAlert(alert) && (

                        <button type='button' disabled={props.archivingKey === alert.alertKey} onClick={() => props.onArchive(alert)} style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: props.archivingKey === alert.alertKey ? '#94a3b8' : '#e5e7eb', borderRadius: 8, padding: '6px 10px', cursor: props.archivingKey === alert.alertKey ? 'wait' : 'pointer', fontSize: 12, fontWeight: 800 }}>{props.archivingKey === alert.alertKey ? 'Archiviazione…' : 'Archivia'}</button>

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

    try {
      // Lettura veloce: tabella/vista piccola delle attività correnti già pronte.
      const current = await withGiiTimeout(queryGiiCurrentActivities({
        activityLayerUrl,
        user: alertUser,
        pageSize: 100
      }), 8000, 'Timeout caricamento attività correnti.')

      currentActivities = current.alerts
      setAlerts(currentActivities)
      setAlertCounts(current.counts)
      setAlertsError('')
    } catch (e: any) {
      setAlerts([])
      setAlertCounts(emptyAlertCounts())
      setAlertsError(e?.message || String(e))
      setAlertsLoading(false)
      return
    }

    // Seconda fase non bloccante: conserva le scadenze/anomalie già esistenti,
    // ma ignora le vecchie prese in carico calcolate dinamicamente per evitare duplicati.
    if (practiceLayerUrl && archiveTableUrl) {
      try {
        const res = await withGiiTimeout(queryGiiAlerts({
          practiceLayerUrl,
          archiveTableUrl,
          user: alertUser,
          warningDays: Number(cfg.alertsWarningDays ?? 5)
        }), 25000, 'Timeout caricamento scadenze e anomalie.')
        const legacy = (res.alerts || []).filter(a => !isGiiTakeChargeAlert(a))
        const merged = [...currentActivities, ...legacy]
        setAlerts(merged)
        setAlertCounts(summarizeGiiAlerts(merged))
        setAlertsError('')
      } catch (e: any) {
        // Non cancellare le attività correnti se fallisce solo la fase secondaria.
        if (currentActivities.length === 0) setAlertsError(e?.message || String(e))
      }
    }

    setAlertsLoading(false)
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

  const orgContextParts = React.useMemo(() => getOrganizationalContext(user, true), [user])
  const accountHierarchyParts = React.useMemo(() => getOrganizationalHierarchy(user, false), [user])
  const orgContextText = orgContextParts.join(' · ')
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
          {orgContextText && (
            <div title={orgContextText} style={{
              marginTop:2,
              fontFamily:cfg.titleFont,
              fontSize:Math.max(10, Number(cfg.titleSize || 18) * 0.48),
              fontWeight:500,
              color:'rgba(226,232,240,0.78)',
              letterSpacing:0.1,
              lineHeight:1.15,
              whiteSpace:'nowrap',
              overflow:'hidden',
              textOverflow:'ellipsis',
              maxWidth:'100%'
            }}>{orgContextText}</div>
          )}
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

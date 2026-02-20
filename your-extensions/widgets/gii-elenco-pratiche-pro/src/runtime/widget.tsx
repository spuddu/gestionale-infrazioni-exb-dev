/** @jsx jsx */
/** @jsxFrag React.Fragment */
import {
  React,
  jsx,
  css,
  DataSourceComponent,
  DataSourceStatus,
  type DataRecord,
  type DataSource,
  DataSourceManager,
  SessionManager,
  Immutable
} from 'jimu-core'

import { Button, Loading } from 'jimu-ui'
import type { AllWidgetProps } from 'jimu-core'
import type { IMConfig, ColumnDef } from '../config'
import { defaultConfig, DEFAULT_COLUMNS } from '../config'

type Props = AllWidgetProps<IMConfig>

// ── loadEsriModule (AMD require) ───────────────────────────────────────────
function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) }
    catch (e) { reject(e) }
  })
}

function getCodPraticaDisplay(rec: DataRecord): string {
  const a: any = rec?.getData?.() || {}
  const oid =
    a?.OBJECTID ?? a?.ObjectId ?? a?.objectid ?? a?.objectId
  // 1=TR, 2=TI (se presente). Se non presente, fallback su datasource id.
  let prefix = 'TR'
  const op = a?.origine_pratica
  if (op === 2 || op === '2') prefix = 'TI'
  else if (op === 1 || op === '1') prefix = 'TR'
  else {
    const dsId = String((rec as any)?.dataSource?.id || '').toLowerCase()
    if (dsId.includes('gii_pratiche') || dsId.includes('schema') || dsId.includes('ti')) prefix = 'TI'
  }
  return oid != null ? `${prefix}-${oid}` : `${prefix}-?`
}

type SortDir = 'ASC' | 'DESC'
type SortItem = { field: string, dir: SortDir }

// Campi virtuali (ordinamento su campi calcolati)
const V_STATO = '__stato_sint__'
const V_ULTIMO = '__ultimo_agg__'
const V_PROSSIMA = '__prossima__'

function num (v: any, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
function txt (v: any): string {
  if (v === null || v === undefined) return ''
  return String(v)
}
function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function parseToMs (v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime()
  const s = String(v)
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

function formatDateIt (v: any): string {
  if (v === null || v === undefined || v === '') return ''
  let d: Date | null = null
  if (typeof v === 'number') d = new Date(v)
  else if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) d = new Date(t)
  } else if (v instanceof Date) d = v
  if (!d || Number.isNaN(d.getTime())) return txt(v)
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(d)
}

function getDsLabel (useDs: any, fallback: string): string {
  try {
    const ds = DataSourceManager.getInstance().getDataSource(useDs?.dataSourceId)
    const label = ds?.getLabel?.()
    return (label && String(label).trim()) ? String(label) : fallback
  } catch {
    return fallback
  }
}

function trySelectRecord (ds: any, record: DataRecord, recordId: string) {
  try { ds.selectRecordsByIds?.([recordId]) } catch {}
  try { ds.selectRecordById?.(recordId) } catch {}
  try { ds.setSelectedRecords?.([record]) } catch {}
}

function tryClearSelection (ds: any) {
  try { ds.selectRecordsByIds?.([]) } catch {}
  try { ds.clearSelection?.() } catch {}
  try { ds.setSelectedRecords?.([]) } catch {}
}

function compareValues (a: any, b: any): number {
  const aNull = (a === null || a === undefined || a === '')
  const bNull = (b === null || b === undefined || b === '')
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b

  const aStr = String(a)
  const bStr = String(b)

  // date?
  const aDate = Date.parse(aStr)
  const bDate = Date.parse(bStr)
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate

  return aStr.localeCompare(bStr, 'it', { numeric: true, sensitivity: 'base' })
}

function sortSig (s: SortItem[]): string {
  return (s || []).map(x => `${x.field}:${x.dir}`).join('|')
}

function migrateColumns (cfg: any): ColumnDef[] {
  const raw = cfg?.columns
  const cols: any[] = asJs(raw)
  if (Array.isArray(cols) && cols.length > 0) {
    return cols.map((c: any) => ({
      id: String(c.id || ''),
      label: String(c.label || ''),
      field: String(c.field || ''),
      width: num(c.width, 150)
    }))
  }
  return DEFAULT_COLUMNS.map(c => ({ ...c }))
}

/**
 * Componente figlio di DataSourceComponent — raccoglie i record e li segnala al parent.
 * Usa useEffect con signature stabile per evitare loop infiniti.
 */
function RecordTracker (p: {
  ds: DataSource
  dsId: string
  info: any
  onUpdate: (dsId: string, recs: DataRecord[], ds: DataSource, loading: boolean) => void
}) {
  const recs: DataRecord[] = (p.ds?.getRecords?.() ?? []) as DataRecord[]
  const status = p.info?.status ?? p.ds?.getStatus?.() ?? DataSourceStatus.NotReady
  const isLoading = status === DataSourceStatus.Loading

  // Signature completa: status + conteggio + JSON di tutti i valori del primo record.
  // Cattura il lazy-loading dei campi (quando i valori passano da undefined a valorizzati).
  let dataSig = ''
  if (recs.length > 0) {
    try { dataSig = JSON.stringify(recs[0].getData?.() || {}) }
    catch { dataSig = String(recs.length) }
  }
  const sig = `${status}:${recs.length}:${dataSig}`

  const prevSig = React.useRef('')
  React.useEffect(() => {
    if (sig !== prevSig.current) {
      prevSig.current = sig
      p.onUpdate(p.dsId, recs, p.ds, isLoading)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  return null
}

// ── URL tabella utenti GII ─────────────────────────────────────────────────
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_uteniti/FeatureServer/0'
const GII_PORTAL    = 'https://cbsm-hub.maps.arcgis.com'

// Mappa codice ruolo numerico → label (dal widget gestione utenti)
const RUOLO_LABEL: Record<number, string> = {
  1: 'TR', 2: 'TI', 3: 'RZ', 4: 'RI', 5: 'DT', 6: 'DA'
}

// Gerarchia priorità per utenti con gruppi multipli (es. admin)
const RUOLO_PRIORITY: Record<number, number> = {
  6: 100, // DA  (massima priorità)
  5: 90,  // DT
  4: 80,  // RI
  3: 70,  // RZ
  2: 60,  // TI
  1: 10   // TR
}

// ── Mappa ruolo/area/settore → dataSourceId consentito ─────────────────────
// Codici domini (numerici):
//   AREA: AMM=1, AGR=2, TEC=3
//   SETTORE: CR=1,GI=2,D1=3,D2=4,D3=5,D4=6,D5=7,D6=8,CS=9
//   RUOLO: TR=1,TI=2,RZ=3,RI=4,DT=5,DA=6
function getAllowedDataSourceIds(user: { ruolo: number|null, area: number|null, settore: number|null, isAdmin: boolean } | null): string[] | null {
  if (!user) return null
  if (user.isAdmin) return ['dataSource_31'] // admin: vista unica senza filtri (evita duplicati)

  const { ruolo, area, settore } = user

  // TR(1), TI(2), RZ(3) → vista per settore specifico
  if (ruolo !== null && ruolo >= 1 && ruolo <= 3) {
    if (area === 2) { // AGR
      if (settore === 3) return ['dataSource_39'] // D1
      if (settore === 4) return ['dataSource_38'] // D2
      if (settore === 5) return ['dataSource_37'] // D3
      if (settore === 6) return ['dataSource_36'] // D4
      if (settore === 7) return ['dataSource_35'] // D5
      if (settore === 8) return ['dataSource_34'] // D6
    }
    if (area === 3) return ['dataSource_33'] // TEC
  }

  // RI(4), DT(5), DA(6) → vista globale per area
  if (ruolo !== null && ruolo >= 4 && ruolo <= 6) {
    if (area === 2) return ['dataSource_41'] // AGR tutti settori
    if (area === 3) return ['dataSource_40'] // TEC
    if (area === 1) return ['dataSource_32'] // AMM
  }

  // Fallback: nessun datasource consentito
  return []
}

interface GiiUserInfo {
  username: string
  ruolo: number | null       // codice numerico (1-6)
  ruoloLabel: string         // 'TR','TI','RZ','RI','DT','DA'
  area: number | null
  settore: number | null
  ufficio: number | null
  gruppo: string
  isAdmin: boolean           // org_admin AGOL
}

// Recupera token dalla sessione ExB (IdentityManager)
async function getSessionToken(): Promise<string> {
  // Preferisci la sessione gestita da ExB (SessionManager) perché è quella "attiva"
  // e cambia correttamente con Switch account / Sign out.
  try {
    const sm = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL)
    if (session) {
      const t = (typeof session.token === 'string' && session.token) ? session.token : null
      if (t) return t
      if (typeof session.getToken === 'function') {
        const tok = await session.getToken(`${GII_PORTAL}/sharing/rest`)
        if (tok) return String(tok)
      }
    }
  } catch { }

  // Fallback: ArcGIS Maps SDK IdentityManager (può avere più credenziali in memoria)
  try {
    const esriId = await loadEsriModule<any>('esri/identity/IdentityManager')
    const creds = (esriId.credentials as any[]) || []
    const portalCreds = creds.filter((c: any) => String(c?.server || '').includes('cbsm-hub') || String(c?.server || '').includes('arcgis.com'))
    const arr = portalCreds.length ? portalCreds : creds
    if (arr.length) {
      const best = arr.slice().sort((a: any, b: any) => num(b?.expires, 0) - num(a?.expires, 0))[0] || arr[arr.length - 1]
      if (best?.token) return best.token
    }
  } catch { }

  return ''
}

// Rileva info utente loggato: username + isAdmin da IdentityManager + /sharing/rest/community/self
async function detectCurrentUser(): Promise<{ username: string; isAdmin: boolean }> {
  // 1) SessionManager (ExB) → sessione principale, coerente con Switch accounts
  try {
    const sm = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL)
    if (session) {
      const username =
        (typeof session.username === 'string' && session.username) ? session.username
          : (typeof session.getUsername === 'function' ? await session.getUsername() : '')
      if (!username) return { username: '', isAdmin: false }

      try {
        if (typeof session.getUser === 'function') {
          const u = await session.getUser()
          const isAdmin = u?.role === 'org_admin' || (Array.isArray(u?.privileges) && u.privileges.includes('portal:admin:viewUsers')) || false
          return { username: String(u?.username || username), isAdmin }
        }
      } catch { }

      const token = await getSessionToken()
      if (!token) return { username: String(username), isAdmin: false }
      const res = await fetch(`${GII_PORTAL}/sharing/rest/community/self?f=json&token=${encodeURIComponent(token)}`)
      const json = await res.json()
      const isAdmin = json?.role === 'org_admin' || json?.privileges?.includes('portal:admin:viewUsers') || false
      return { username: String(json?.username || username), isAdmin }
    }
  } catch { }

  // 2) Fallback IdentityManager: scegli la credenziale "più recente" (token con expires maggiore)
  try {
    const esriId = await loadEsriModule<any>('esri/identity/IdentityManager')
    const creds = (esriId.credentials as any[]) || []
    const portalCreds = creds.filter((c: any) => String(c?.server || '').includes('cbsm-hub') || String(c?.server || '').includes('arcgis.com'))
    const arr = portalCreds.length ? portalCreds : creds
    const cred = arr.length
      ? (arr.slice().sort((a: any, b: any) => num(b?.expires, 0) - num(a?.expires, 0))[0] || arr[arr.length - 1])
      : null
    const token = cred?.token ?? ''
    const username = cred?.userId ?? cred?.username ?? ''
    if (!username || !token) return { username: '', isAdmin: false }

    const res = await fetch(`${GII_PORTAL}/sharing/rest/community/self?f=json&token=${encodeURIComponent(token)}`)
    const json = await res.json()
    const isAdmin = json?.role === 'org_admin' || json?.privileges?.includes('portal:admin:viewUsers') || false
    return { username: String(json?.username || username), isAdmin }
  } catch {
    return { username: '', isAdmin: false }
  }
}

// Cerca l'utente nella tabella GII_utenti e restituisce il suo profilo
async function fetchGiiUser(username: string, token: string): Promise<GiiUserInfo | null> {
  if (!username) return null
  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: GII_UTENTI_URL })
    await fl.load().catch(() => { })
    const res = await fl.queryFeatures({
      where: `username = '${username.replace(/'/g, "''")}'`,
      outFields: ['username', 'ruolo', 'area', 'settore', 'ufficio', 'gruppo'],
      returnGeometry: false,
    })
    const features = res?.features ?? []
    if (!features.length) return null
    // Se più record (es. admin con più voci), prendi quello con ruolo di priorità massima
    let best = features[0]
    for (const f of features) {
      const rA = Number(best.attributes?.ruolo ?? 0)
      const rB = Number(f.attributes?.ruolo ?? 0)
      if ((RUOLO_PRIORITY[rB] ?? 0) > (RUOLO_PRIORITY[rA] ?? 0)) best = f
    }
    const a = best.attributes
    const ruolo = a.ruolo != null ? Number(a.ruolo) : null
    return {
      username,
      ruolo,
      ruoloLabel: ruolo ? (RUOLO_LABEL[ruolo] ?? '') : '',
      area: a.area != null ? Number(a.area) : null,
      settore: a.settore != null ? Number(a.settore) : null,
      ufficio: a.ufficio != null ? Number(a.ufficio) : null,
      gruppo: String(a.gruppo ?? ''),
      isAdmin: false
    }
  } catch {
    return null
  }
}

// Determina il campo stato del ruolo corrente
function getStatoFieldForRuolo(ruoloLabel: string): string {
  const r = ruoloLabel.toUpperCase()
  if (r === 'TR') return 'stato_TR'
  if (r === 'TI') return 'stato_TI'
  if (r === 'RZ') return 'stato_RZ'
  if (r === 'RI') return 'stato_RI'
  if (r === 'DT') return 'stato_DT'
  if (r === 'DA') return 'stato_DA'
  return 'stato_DT' // fallback
}

// Priorità ordinamento: In attesa mia (0,1,3) prima, poi In lavorazione (2), poi altri
function getPriorityForStato(statoVal: number | null): number {
  if (statoVal === 0 || statoVal === 1 || statoVal === 3) return 0  // In attesa mia → in cima
  if (statoVal === 2) return 1                                       // In lavorazione
  if (statoVal === 4) return 2                                       // Trasmesso
  if (statoVal === 5) return 3                                       // Respinto
  return 4                                                            // null / altri
}

export default function Widget (props: Props) {
  const cfg: any = (props.config ?? defaultConfig) as any

  const useDsImm: any = props.useDataSources ?? Immutable([])
  const useDsJs: any[] = asJs(useDsImm)

  // ── Rilevamento ruolo utente loggato ──────────────────────────────────────
  const [giiUser, setGiiUser] = React.useState<GiiUserInfo | null>(null)
  const [userLoading, setUserLoading] = React.useState(true)
  // notLogged: true quando non c'è utente autenticato → overlay bloccante
  const [notLogged, setNotLogged] = React.useState(false)


  // Carica profilo utente dalla tabella GII_utenti
  const loadUserProfile = React.useCallback(async (username: string, isAdmin: boolean) => {
    // Reset dsDataRef SOLO se l'utente cambia (non ad ogni credential-create ripetuto)
    const prevUsername = (window as any).__giiCurrentUsername
    if (prevUsername !== username) {
      dsDataRef.current = {}
      ;(window as any).__giiCurrentUsername = username
    }
    if (isAdmin) {
      const u: GiiUserInfo = {
        username, ruolo: null, ruoloLabel: 'ADMIN',
        area: null, settore: null, ufficio: null, gruppo: '', isAdmin: true
      }
      setGiiUser(u)
      setNotLogged(false)
      try { (window as any).__giiUserRole = u } catch { }
      setUserLoading(false)
      return
    }
    const token = await getSessionToken()
    const user = await fetchGiiUser(username, token)
    const u = user
      ? { ...user, isAdmin: false }
      : { username, ruolo: null, ruoloLabel: '', area: null, settore: null, ufficio: null, gruppo: '', isAdmin: false }
    setGiiUser(u)
    setNotLogged(false)
    try { (window as any).__giiUserRole = u } catch { }
    setUserLoading(false)
    console.log('GII user loaded:', u.username, '| ruolo:', u.ruolo, '| area:', u.area, '| settore:', u.settore)
  }, [])

  // Boot passivo: verifica se c'è già un utente loggato.
  // NON chiama mai getCredential — il login e' gestito dal widget ExB in alto a destra.
  React.useEffect(() => {
    let cancelled = false
    let credentialHandle: any = null

    let watchTimer: any = null
    const boot = async () => {
      setUserLoading(true)
      try {
        const { username, isAdmin } = await detectCurrentUser()
        if (cancelled) return
        if (!username) {
          // Nessun utente: overlay bloccante. Aspetta che ExB faccia login.
          setNotLogged(true)
          setUserLoading(false)
        } else {
          setNotLogged(false)
          await loadUserProfile(username, isAdmin)
        }
      } catch {
        if (!cancelled) { setNotLogged(true); setUserLoading(false) }
      }

      // Ascolta evento credential-create: scatta quando ExB completa il login
      try {
        const esriId = await loadEsriModule<any>('esri/identity/IdentityManager')
        if (cancelled) return
        let credDebounce: any = null
        credentialHandle = esriId.on('credential-create', () => {
          if (cancelled) return
          // Debounce: ExB spara credential-create una volta per ogni DS/token.
          // Aspettiamo 400ms dall'ultimo evento prima di ricaricare.
          clearTimeout(credDebounce)
          credDebounce = setTimeout(async () => {
            if (cancelled) return
            console.log('Credential create event: reloading user profile...')
            const { username, isAdmin } = await detectCurrentUser()
            if (username) {
              setNotLogged(false)
              await loadUserProfile(username, isAdmin)
            }
          }, 400)
        })
      } catch { }
      // Watch leggero: se cambia l'utente (Switch account / Sign out), forza il reload dei datasource
      // senza richiedere DevTools. È economico perché legge solo la sessione corrente.
      try {
        watchTimer = setInterval(async () => {
          if (cancelled) return
          const cur = await detectCurrentUser()
          const curUser = cur?.username || ''
          const prevNow = (window as any).__giiCurrentUsername || ''
          if (!curUser && prevNow) {
            // logout
            dsDataRef.current = {}
            setGiiUser(null)
            setNotLogged(true)
            setUserLoading(false)
            return
          }
          if (curUser && curUser !== prevNow) {
            // switch utente
            dsDataRef.current = {}
            setNotLogged(false)
            setUserLoading(true)
            await loadUserProfile(curUser, cur?.isAdmin || false)
          }
        }, 1500)
      } catch { }

    }

    boot()
    return () => {
      cancelled = true
      try { if (watchTimer) clearInterval(watchTimer) } catch { }
      try { credentialHandle?.remove() } catch { }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pubblica su canale globale ogni volta che giiUser cambia (per widget Azioni)
  React.useEffect(() => {
    if (giiUser) {
      try { (window as any).__giiUserRole = giiUser } catch { }
    }
  }, [giiUser])

  // DataSource consentiti per l'utente corrente
  const allowedDsIds: string[] | null = React.useMemo(
    () => giiUser ? getAllowedDataSourceIds(giiUser) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [giiUser?.username, giiUser?.ruolo, giiUser?.area, giiUser?.settore, giiUser?.isAdmin]
  )

  // useDsJs filtrato: solo i datasource consentiti per il ruolo dell'utente
  const filteredUseDsJs: any[] = React.useMemo(() => {
    if (!giiUser || userLoading || notLogged) return useDsJs // non ancora loggato: passa tutti (ma overlay copre)
    if (allowedDsIds === null) return useDsJs // admin: tutti
    return useDsJs.filter((u: any) => {
      // allowedDsIds contiene i rootDataSourceId (es. "dataSource_39")
      // mentre useDataSources usa dataSourceId (es. "dataSource_39-0").
      // Confrontiamo quindi il rootDataSourceId per non filtrare via TUTTI i DS online.
      const rootId = String(u?.rootDataSourceId || '')
      return allowedDsIds.includes(rootId)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giiUser, userLoading, notLogged, allowedDsIds, useDsJs.length])

  // Campo stato del ruolo corrente
  const statoRuoloField = giiUser?.isAdmin
    ? null
    : giiUser?.ruoloLabel
      ? getStatoFieldForRuolo(giiUser.ruoloLabel)
      : null

  // ── Tab ruolo: Tutte / In attesa mia / In attesa altri ────────────────────
  const ROLE_TABS = [
    { id: 'tutte',        label: 'Tutte le pratiche' },
    { id: 'attesa_mia',   label: 'In attesa mia' },
    { id: 'attesa_altri', label: 'In attesa altri' },
  ]
  const [activeRoleTab, setActiveRoleTab] = React.useState<string>('tutte')

  // Funzione filtro per tab ruolo
  const filterByRoleTab = React.useCallback((recs: DataRecord[]): DataRecord[] => {
    if (!statoRuoloField || activeRoleTab === 'tutte') return recs
    return recs.filter(r => {
      const d = r.getData?.() || {}
      const val = d[statoRuoloField]
      const n = val != null ? Number(val) : null
      if (activeRoleTab === 'attesa_mia') return n === 0 || n === 1 || n === 3  // Non attivo, da prendere, integrazione
      if (activeRoleTab === 'attesa_altri') return n === 2 || n === 4  // Presa in carico, trasmesso
      return true
    })
  }, [statoRuoloField, activeRoleTab])

  // Ordinamento priorità ruolo: in attesa mia sempre in cima
  const sortByRolePriority = React.useCallback((recs: DataRecord[]): DataRecord[] => {
    if (!statoRuoloField) return recs
    return [...recs].sort((ra, rb) => {
      const da = ra.getData?.() || {}
      const db = rb.getData?.() || {}
      const pa = getPriorityForStato(da[statoRuoloField] != null ? Number(da[statoRuoloField]) : null)
      const pb = getPriorityForStato(db[statoRuoloField] != null ? Number(db[statoRuoloField]) : null)
      return pa - pb
    })
  }, [statoRuoloField])

  // ── Tab groups: data view con la stessa etichetta vengono fuse nello stesso tab ──
  const tabGroups = React.useMemo(() => {
    const filterTabsJs: any[] = asJs(cfg.filterTabs) || []
    const groups: { label: string; dsIndices: number[] }[] = []
    const labelMap = new Map<string, number>()

    filteredUseDsJs.forEach((u: any, i: number) => {
      const dsId = String(u?.dataSourceId || '')
      const entry = filterTabsJs.find((t: any) => String(t?.dataSourceId || '') === dsId)
      const label = String(entry?.label || getDsLabel(u, `Filtro ${i + 1}`))

      if (labelMap.has(label)) {
        groups[labelMap.get(label)!].dsIndices.push(i)
      } else {
        labelMap.set(label, groups.length)
        groups.push({ label, dsIndices: [i] })
      }
    })
    return groups
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredUseDsJs.length, cfg.filterTabs])

  const hasTabs = tabGroups.length > 1
  const [activeTab, setActiveTab] = React.useState<number>(0)
  const [localSelectedByDs, setLocalSelectedByDs] = React.useState<Record<string, string>>({})

  // ── Raccolta record da TUTTI i datasource ──
  const dsDataRef = React.useRef<Record<string, { recs: DataRecord[], ds: DataSource | null, loading: boolean }>>({})
  const [dsDataVer, setDsDataVer] = React.useState(0)

  const handleDsUpdate = React.useCallback((dsId: string, recs: DataRecord[], ds: DataSource, loading: boolean) => {
    dsDataRef.current[dsId] = { recs, ds, loading }
    setDsDataVer(v => v + 1)
  }, [])

  // ── Ri-leggi i record dopo un breve ritardo per catturare dati lazy-loaded ──
  // Si riattiva quando cambia giiUser (post-login) o il numero di DS
  React.useEffect(() => {
    const timers = [300, 800, 2000, 4000]
    const ids = timers.map(ms => setTimeout(() => {
      let changed = false
      Object.entries(dsDataRef.current).forEach(([dsId, entry]) => {
        if (entry.ds) {
          const freshRecs = (entry.ds.getRecords?.() ?? []) as DataRecord[]
          if (freshRecs.length > 0) {
            dsDataRef.current[dsId] = { ...entry, recs: freshRecs, loading: false }
            changed = true
          }
        }
      })
      if (changed) setDsDataVer(v => v + 1)
    }, ms))
    return () => ids.forEach(id => clearTimeout(id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDsJs.length, giiUser?.username])



  // Sort: array (multi sort con Shift+Click)
  const defaultSort: SortItem[] = React.useMemo(() => {
    const f = txt(cfg.orderByField || 'objectid')
    const d = (txt(cfg.orderByDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as SortDir
    return [{ field: f, dir: d }]
  }, [cfg.orderByField, cfg.orderByDir])

  const [sortState, setSortState] = React.useState<SortItem[]>(defaultSort)

  // Se cambia il sort default da settings, riallineo SOLO se l'utente non ha un custom sort
  React.useEffect(() => {
    const isCustom = sortSig(sortState) !== sortSig(defaultSort)
    if (!isCustom) setSortState(defaultSort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortSig(defaultSort)])

  // ── Record fusi per il tab attivo ──
  const clampedTab = Math.min(activeTab, Math.max(0, tabGroups.length - 1))
  const activeGroup = tabGroups[clampedTab] || tabGroups[0]

  const udsAny = (props.useDataSources as any) as any[] | undefined

  const whereClause = txt(cfg.whereClause || '1=1')
  const pageSize = num(cfg.pageSize, 200)

  // Query: usa "1=0" prima del login (nessun dato senza credenziali).
  // Quando notLogged/userLoading cambia a false, ExB ri-fetcha con la query reale.
  const isReady = !notLogged && !userLoading && !!giiUser?.username
  const dsQuery: any = React.useMemo(() => ({
    where: isReady ? whereClause : '1=0',
    pageSize
  }), [isReady, whereClause, pageSize])

  // Campi base
  const fieldPratica = txt(cfg.fieldPratica || 'objectid')
  const fieldDataRil = txt(cfg.fieldDataRilevazione || 'data_rilevazione')
  const fieldUfficio = txt(cfg.fieldUfficio || 'ufficio_zona')

  // Nota: i campi DT/DA sono ora acceduti direttamente tramite nome convenzionale
  // (es. `stato_DT`, `presa_in_carico_DA`, ...) dentro computeSintetico/computeUltimoAggMs.

  const presaDaPrendere = num(cfg.presaDaPrendereVal, 1)
  const presaPresa = num(cfg.presaPresaVal, 2)

  const statoDaPrendere = num(cfg.statoDaPrendereVal, 1)
  const statoPresa = num(cfg.statoPresaVal, 2)
  const statoIntegrazione = num(cfg.statoIntegrazioneVal, 3)
  const statoApprovata = num(cfg.statoApprovataVal, 4)
  const statoRespinta = num(cfg.statoRespintaVal, 5)

  const esitoIntegrazione = num(cfg.esitoIntegrazioneVal, 1)
  const esitoApprovata = num(cfg.esitoApprovataVal, 2)
  const esitoRespinta = num(cfg.esitoRespintaVal, 3)

  const labelStato = (v: any): string => {
    const n = Number(v)
    if (!Number.isFinite(n)) return txt(v)
    if (n === statoDaPrendere) return txt(cfg.labelStatoDaPrendere || 'Da prendere')
    if (n === statoPresa) return txt(cfg.labelStatoPresa || 'Presa in carico')
    if (n === statoIntegrazione) return txt(cfg.labelStatoIntegrazione || 'Integrazione richiesta')
    if (n === statoApprovata) return txt(cfg.labelStatoApprovata || 'Approvata')
    if (n === statoRespinta) return txt(cfg.labelStatoRespinta || 'Respinta')
    return String(n)
  }

  const labelEsito = (v: any): string => {
    const n = Number(v)
    if (!Number.isFinite(n)) return txt(v)
    if (n === esitoIntegrazione) return txt(cfg.labelEsitoIntegrazione || 'Integrazione richiesta')
    if (n === esitoApprovata) return txt(cfg.labelEsitoApprovata || 'Approvata')
    if (n === esitoRespinta) return txt(cfg.labelEsitoRespinta || 'Respinta')
    return String(n)
  }

  // ── Chip colors — 5 stati workflow ────────────────────────────────────────
  // statoForChip: 1=DaPrendere, 2=InLavorazione, 3=Integrazione, 4=Approvata, 5=Respinta, null=neutro
  const getChipStyle = (statoNum: number | null) => {
    if (statoNum === statoDaPrendere) {
      // arancio – in attesa di qualcuno
      return {
        background: txt(cfg.statoBgDaPrendere || '#fff7e6'),
        color: txt(cfg.statoTextDaPrendere || '#7a4b00'),
        borderColor: txt(cfg.statoBorderDaPrendere || '#ffd18a')
      }
    }
    if (statoNum === statoPresa) {
      // verde chiaro – in lavorazione
      return {
        background: txt(cfg.statoBgPresa || '#eaf7ef'),
        color: txt(cfg.statoTextPresa || '#1f6b3a'),
        borderColor: txt(cfg.statoBorderPresa || '#9ad2ae')
      }
    }
    if (statoNum === statoIntegrazione) {
      // ambra – integrazione richiesta
      return {
        background: txt(cfg.statoBgIntegrazione || '#fffbeb'),
        color: txt(cfg.statoTextIntegrazione || '#92400e'),
        borderColor: txt(cfg.statoBorderIntegrazione || '#fbbf24')
      }
    }
    if (statoNum === statoApprovata) {
      // verde scuro – approvata/chiusa positivamente
      return {
        background: txt(cfg.statoBgApprovata || '#dcfce7'),
        color: txt(cfg.statoTextApprovata || '#14532d'),
        borderColor: txt(cfg.statoBorderApprovata || '#4ade80')
      }
    }
    if (statoNum === statoRespinta) {
      // rosso – respinta
      return {
        background: txt(cfg.statoBgRespinta || '#fee2e2'),
        color: txt(cfg.statoTextRespinta || '#7f1d1d'),
        borderColor: txt(cfg.statoBorderRespinta || '#f87171')
      }
    }
    // neutro – stato sconosciuto / nuova pratica
    return {
      background: txt(cfg.statoBgAltro || '#f2f2f2'),
      color: txt(cfg.statoTextAltro || '#333333'),
      borderColor: txt(cfg.statoBorderAltro || '#d0d0d0')
    }
  }

  // converte esito (1..3) in "stato visuale" per chip (3/4/5)
  const statoNumFromEsito = (esito: number): number => {
    if (esito === esitoIntegrazione) return statoIntegrazione
    if (esito === esitoApprovata) return statoApprovata
    if (esito === esitoRespinta) return statoRespinta
    return statoApprovata
  }

  // Verifica se un ruolo ha dati valorizzati (presa/stato/esito con campo generico)
  const hasRuoloData = (d: any, role: string): boolean => {
    const p = d[`presa_in_carico_${role}`]
    const s = d[`stato_${role}`]
    const e = d[`esito_${role}`]
    return (p !== null && p !== undefined && p !== '')
      || (s !== null && s !== undefined && s !== '')
      || (e !== null && e !== undefined && e !== '')
  }

  // ── computeSintetico: workflow-aware su tutti i ruoli ──────────────────────
  //
  // Logica:
  //   - Scansiona i ruoli dal più avanzato (DA) al meno avanzato (TR)
  //   - Il primo ruolo con dati valorizzati è il "nodo corrente"
  //   - presa=1 (DA PRENDERE) → la pratica è stata trasmessa ma non ancora presa in carico
  //     → "Trasmessa a [ruolo]"  chip arancio
  //   - presa=2 (PRESA) o stato=presa → il ruolo ci sta lavorando
  //     → "In lavorazione [ruolo]"  chip verde
  //   - stato/esito espliciti → mostrano l'azione già compiuta
  //
  // Pratiche senza nessun campo workflow:
  //   origine=1 (TR) → implicitamente trasmessa a RZ → "Trasmessa a RZ"  chip arancio
  //   origine=2 (TI) → TI l'ha creata, non ancora trasmessa → "In lavorazione TI"  chip verde

  const computeSintetico = (d: any): { ruolo: string, label: string, statoForChip: number | null } => {
    const scanOrder = ['DA', 'DT', 'RI', 'RZ', 'TI', 'TR']

    for (const role of scanOrder) {
      if (!hasRuoloData(d, role)) continue

      const presaRaw = d[`presa_in_carico_${role}`]
      const statoRaw = d[`stato_${role}`]
      const esitoRaw = d[`esito_${role}`]

      const presaNum = presaRaw !== null && presaRaw !== undefined && presaRaw !== '' ? Number(presaRaw) : null
      const statoNum = statoRaw !== null && statoRaw !== undefined && statoRaw !== '' ? Number(statoRaw) : null
      const esitoNum = esitoRaw !== null && esitoRaw !== undefined && esitoRaw !== '' ? Number(esitoRaw) : null

      // Esito > stato > presa (in ordine di precedenza)

      if (esitoNum !== null && Number.isFinite(esitoNum)) {
        return { ruolo: role, label: `${labelEsito(esitoNum)} (${role})`, statoForChip: statoNumFromEsito(esitoNum) }
      }

      if (statoNum !== null && Number.isFinite(statoNum)) {
        // stato=1 (da prendere) → trasmessa, in attesa che qualcuno agisca
        if (statoNum === statoDaPrendere) {
          return { ruolo: role, label: `Trasmessa a ${role}`, statoForChip: statoDaPrendere }
        }
        // stato=2 (presa in carico) → in lavorazione presso quel ruolo
        if (statoNum === statoPresa) {
          return { ruolo: role, label: `In lavorazione ${role}`, statoForChip: statoPresa }
        }
        // altri stati espliciti (integrazione, approvata, respinta)
        return { ruolo: role, label: `${labelStato(statoNum)} (${role})`, statoForChip: statoNum }
      }

      if (presaNum !== null && Number.isFinite(presaNum)) {
        if (presaNum === presaDaPrendere) {
          // presa=1: trasmessa al ruolo, non ancora presa in carico
          return { ruolo: role, label: `Trasmessa a ${role}`, statoForChip: statoDaPrendere }
        }
        if (presaNum === presaPresa) {
          // presa=2: presa in carico, in lavorazione
          return { ruolo: role, label: `In lavorazione ${role}`, statoForChip: statoPresa }
        }
      }

      // Ha dati ma valore non riconosciuto
      return { ruolo: role, label: `In carico ${role}`, statoForChip: null }
    }

    // Nessun campo workflow → pratica appena creata
    const op = d['origine_pratica']
    const opNum = op !== null && op !== undefined && op !== '' ? Number(op) : null
    if (opNum === 2) {
      // TI ha creato la pratica, la sta ancora lavorando prima di trasmetterla a RZ
      return { ruolo: 'TI', label: 'In lavorazione TI', statoForChip: statoPresa }
    }
    // origine=1 (TR) o non valorizzato: implicitamente trasmessa a RZ
    return { ruolo: 'RZ', label: 'Trasmessa a RZ', statoForChip: statoDaPrendere }
  }

  // ── computeUltimoAggMs: considera timestamp di TUTTI i ruoli ──────────────
  const computeUltimoAggMs = (d: any): number | null => {
    const roles = ['TR', 'TI', 'RZ', 'RI', 'DT', 'DA']
    const candidates: number[] = []
    for (const role of roles) {
      const p = parseToMs(d[`dt_presa_in_carico_${role}`])
      const s = parseToMs(d[`dt_stato_${role}`])
      const e = parseToMs(d[`dt_esito_${role}`])
      if (p !== null) candidates.push(p)
      if (s !== null) candidates.push(s)
      if (e !== null) candidates.push(e)
    }
    if (candidates.length === 0) return null
    return Math.max(...candidates)
  }

  // ── computeProssima: azione attesa sul nodo corrente ──────────────────────
  //
  // Riceve il ruolo corrente da computeSintetico e restituisce la prossima azione attesa.
  // La logica è simmetrica a computeSintetico: stesso nodo, stessi campi.
  const computeProssima = (d: any, ruolo: string): string => {
    if (!ruolo) {
      // Fallback irraggiungibile — computeSintetico ritorna sempre un ruolo valorizzato
      const op = d['origine_pratica']
      const opNum = op !== null && op !== undefined && op !== '' ? Number(op) : null
      return opNum === 2 ? 'Trasmettere a RZ (TI)' : 'Prendere in carico (RZ)'
    }

    const presaRaw = d[`presa_in_carico_${ruolo}`]
    const statoRaw = d[`stato_${ruolo}`]
    const esitoRaw = d[`esito_${ruolo}`]

    const presaNum = presaRaw !== null && presaRaw !== undefined && presaRaw !== '' ? Number(presaRaw) : null
    const statoNum = statoRaw !== null && statoRaw !== undefined && statoRaw !== '' ? Number(statoRaw) : null
    const esitoNum = esitoRaw !== null && esitoRaw !== undefined && esitoRaw !== '' ? Number(esitoRaw) : null

    // Esito già espresso
    if (esitoNum !== null) {
      if (esitoNum === esitoApprovata) {
        // DT approva e trasmette a DA; DA approva = chiusa
        if (ruolo === 'DT') return 'Trasmettere a DA (DT)'
        return `Chiusa – approvata (${ruolo})`
      }
      if (esitoNum === esitoRespinta)    return `Chiusa – respinta (${ruolo})`
      if (esitoNum === esitoIntegrazione) return `Attendere integrazione (${ruolo})`
    }

    // Stato esplicito
    if (statoNum !== null) {
      if (statoNum === statoDaPrendere)  return `Prendere in carico (${ruolo})`
      if (statoNum === statoPresa) {
        // In lavorazione → azione dipende dal ruolo
        if (ruolo === 'RZ') return 'Approvare o richiedere integrazione (RZ)'
        if (ruolo === 'TI') return 'Trasmettere a RZ (TI)'
        if (ruolo === 'RI') return 'Validare e trasmettere a DT (RI)'
        if (ruolo === 'DT') return 'Esprimere esito (DT)'
        if (ruolo === 'DA') return 'Esprimere esito finale (DA)'
        return `Esprimere esito (${ruolo})`
      }
      if (statoNum === statoIntegrazione) return `Gestire integrazione (${ruolo})`
      if (statoNum === statoApprovata) {
        if (ruolo === 'DT') return 'Trasmettere a DA (DT)'
        return `Chiusa – approvata (${ruolo})`
      }
      if (statoNum === statoRespinta)    return `Chiusa – respinta (${ruolo})`
    }

    // Solo presa in carico
    if (presaNum !== null) {
      if (presaNum === presaDaPrendere)  return `Prendere in carico (${ruolo})`
      if (presaNum === presaPresa) {
        if (ruolo === 'RZ') return 'Approvare o richiedere integrazione (RZ)'
        if (ruolo === 'TI') return 'Trasmettere a RZ (TI)'
        if (ruolo === 'RI') return 'Validare e trasmettere a DT (RI)'
        if (ruolo === 'DT') return 'Esprimere esito (DT)'
        if (ruolo === 'DA') return 'Esprimere esito finale (DA)'
        return `Esprimere esito (${ruolo})`
      }
    }

    // Nessun campo → pratica appena creata, nessun workflow ancora avviato
    if (ruolo === 'RZ') return 'Prendere in carico (RZ)'
    if (ruolo === 'TI') return 'Trasmettere a RZ (TI)'

    return `Verificare stato (${ruolo})`
  }
  const getSortValue = (r: DataRecord, field: string): any => {
    const d = r.getData?.() || {}
    if (field === V_STATO) return computeSintetico(d).label
    if (field === V_ULTIMO) return computeUltimoAggMs(d)
    if (field === V_PROSSIMA) {
      const s = computeSintetico(d)
      return computeProssima(d, s.ruolo)
    }
    return d[field]
  }

  const sortRecords = (recs: DataRecord[], sort: SortItem[]): DataRecord[] => {
    if (!sort || sort.length === 0) return recs
    const copy = [...recs]
    copy.sort((ra, rb) => {
      for (const s of sort) {
        const a = getSortValue(ra, s.field)
        const b = getSortValue(rb, s.field)
        const cmp = compareValues(a, b)
        if (cmp !== 0) return (s.dir === 'ASC' ? cmp : -cmp)
      }
      return 0
    })
    return copy
  }

  const toggleSort = (field: string, multi: boolean) => {
    setSortState(prev => {
      const p = [...prev]
      const idx = p.findIndex(x => x.field === field)
      if (idx >= 0) {
        const cur = p[idx]
        const nextDir: SortDir = cur.dir === 'ASC' ? 'DESC' : 'ASC'
        p[idx] = { field, dir: nextDir }
        return multi ? p : [p[idx]]
      }
      const next: SortItem = { field, dir: 'ASC' }
      return multi ? [...p, next] : [next]
    })
  }

  const isCustomSort = sortSig(sortState) !== sortSig(defaultSort)

  // ── Record fusi e ordinati per il tab attivo ──
  const mergedRecs = React.useMemo(() => {
    if (!activeGroup) return [] as DataRecord[]
    const all: DataRecord[] = []
    for (const di of activeGroup.dsIndices) {
      const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
      const entry = dsDataRef.current[dsId]
      if (entry?.recs) all.push(...entry.recs)
    }
    // Applica filtro tab ruolo
    const filtered = filterByRoleTab(all)
    // Ordinamento: prima priorità ruolo (in attesa mia in cima), poi sort utente
    const withPriority = sortByRolePriority(filtered)
    return sortRecords(withPriority, sortState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, dsDataVer, sortState, activeRoleTab, statoRuoloField])

  // Lookup: record → dsId (via WeakMap su identità oggetto, sopravvive al sort)
  const recDsLookup = React.useMemo(() => {
    const map = new WeakMap<DataRecord, string>()
    if (!activeGroup) return map
    for (const di of activeGroup.dsIndices) {
      const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
      const entry = dsDataRef.current[dsId]
      if (entry?.recs) {
        for (const r of entry.recs) map.set(r, dsId)
      }
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, dsDataVer])

  // Loading: true solo se TUTTI i DS del tab attivo stanno ancora caricando
  // (non se solo uno manca dall'entry — potrebbe essere che non ha ancora risposto)
  const anyLoading = activeGroup?.dsIndices.every(di => {
    const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
    const entry = dsDataRef.current[dsId]
    if (!entry) return true // mai aggiornato → stiamo aspettando
    return entry.loading
  }) ?? false

  // layout
  const gap = num(cfg.gap, 12)
  const padFirst = num(cfg.paddingLeftFirstCol, 0)

  // ── Colonne dinamiche da config ──
  const columns = migrateColumns(asJs(cfg))

  const gridCols = columns.map(c => `${c.width}px`).join(' ')
  const minWidth = columns.reduce((sum, c) => sum + c.width, 0) + (gap * Math.max(0, columns.length - 1)) + 24

  const rowGap = num(cfg.rowGap, 8)
  const rowPaddingX = num(cfg.rowPaddingX, 12)
  const rowPaddingY = num(cfg.rowPaddingY, 10)
  const rowMinHeight = num(cfg.rowMinHeight, 44)
  const rowRadius = num(cfg.rowRadius, 12)
  const rowBorderWidth = num(cfg.rowBorderWidth, 1)
  const rowBorderColor = txt(cfg.rowBorderColor || 'rgba(0,0,0,0.08)')

  const chipRadius = num(cfg.statoChipRadius, 999)
  const chipPadX = num(cfg.statoChipPadX, 10)
  const chipPadY = num(cfg.statoChipPadY, 4)
  const chipBorderW = num(cfg.statoChipBorderW, 1)
  const chipFontWeight = num(cfg.statoChipFontWeight, 600)
  const chipFontSize = num(cfg.statoChipFontSize, 12)
  const chipFontStyle = (cfg.statoChipFontStyle === 'italic' ? 'italic' : 'normal') as any
  const chipTextTransform = (['none', 'uppercase', 'lowercase', 'capitalize'].includes(cfg.statoChipTextTransform) ? cfg.statoChipTextTransform : 'none') as any
  const chipLetterSpacing = num(cfg.statoChipLetterSpacing, 0)

  const styles = css`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;

    .tabBar {
      display: ${hasTabs ? 'flex' : 'none'};
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      background: var(--bs-body-bg, #fff);
    }
    .tabBtn {
      border: 1px solid rgba(0,0,0,0.12);
      background: rgba(0,0,0,0.02);
      color: #111827;
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      white-space: nowrap;
    }
    .tabBtn.active {
      background: #eaf2ff;
      border-color: #2f6fed;
      color: #1d4ed8;
    }

    .viewport { flex: 1; min-height: 0; overflow: auto; }
    .content { min-width: ${minWidth}px; padding: 0 12px 10px; }

    .headerWrap {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bs-body-bg, #fff);
      border-bottom: 1px solid rgba(0,0,0,0.08);
      padding: 6px 12px;
      margin: 0 0 8px 0;
    }

    .gridHeader {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;
      min-height: 28px;
    }

    .headerCell {
      display: flex;
      align-items: center;
      min-width: 0;
      font-weight: 700;
      font-size: 12px;
      color: rgba(0,0,0,0.65);
    }

    .hdrBtn {
      width: 100%;
      border: none;
      background: transparent;
      padding: 0;
      margin: 0;
      text-align: left;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      font: inherit;
      line-height: 1;
    }
    .hdrBtn:hover { color: rgba(0,0,0,0.9); }

    .sortBadge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      opacity: 0.85;
    }
    .sortPri {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: rgba(0,0,0,0.07);
      font-weight: 800;
    }

    .resetBtn {
      padding: 0 10px !important;
      height: 28px !important;
      min-height: 28px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      font-size: 12px !important;
      font-weight: 700 !important;
    }

    .first { padding-left: ${padFirst}px; }

    .list { display: flex; flex-direction: column; }

    .rowCard {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;

      padding: ${rowPaddingY}px ${rowPaddingX}px;
      min-height: ${rowMinHeight}px;

      border-radius: ${rowRadius}px;
      border: ${rowBorderWidth}px solid ${rowBorderColor};

      margin-bottom: ${rowGap}px;
      cursor: pointer;
    }
    .rowCard.even { background: ${txt(cfg.zebraEvenBg || '#ffffff')}; }
    .rowCard.odd  { background: ${txt(cfg.zebraOddBg || '#fbfbfb')}; }
    .rowCard:hover { background: ${txt(cfg.hoverBg || '#f2f6ff')}; }

    .rowCard.selected {
      border-color: ${txt(cfg.selectedBorderColor || '#2f6fed')};
      box-shadow: 0 0 0 ${num(cfg.selectedBorderWidth, 2)}px rgba(47,111,237,0.18);
      background: ${txt(cfg.selectedBg || '#eaf2ff')};
    }

    .cell {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: ${chipPadY}px ${chipPadX}px;
      border-radius: ${chipRadius}px;
      border: ${chipBorderW}px solid rgba(0,0,0,0.12);
      font-weight: ${chipFontWeight};
      font-size: ${chipFontSize}px;
      font-style: ${chipFontStyle};
      text-transform: ${chipTextTransform};
      letter-spacing: ${chipLetterSpacing}px;
      line-height: 1;
      white-space: nowrap;
      max-width: 100%;
    }

    .empty { padding: 14px; color: rgba(0,0,0,0.65); }
  `

  const Header = (p: { label: string, field: string, first?: boolean }) => {
    const idx = sortState.findIndex(x => x.field === p.field)
    const item = idx >= 0 ? sortState[idx] : null
    const dir = item?.dir

    const badge = item
      ? (
        <span className='sortBadge' aria-hidden>
          <span className='sortPri'>{idx + 1}</span>
          <span>{dir === 'ASC' ? '↑' : '↓'}</span>
        </span>
        )
      : <span className='sortBadge' style={{ opacity: 0.35 }} aria-hidden>↕</span>

    return (
      <div className={`headerCell ${p.first ? 'first' : ''}`}>
        <button
          type='button'
          className='hdrBtn'
          onClick={(e) => toggleSort(p.field, (e as any).shiftKey === true)}
          title='Click: ordina. Shift+Click: ordinamento multiplo.'
        >
          <span>{p.label}</span>
          {badge}
        </button>
      </div>
    )
  }

  const maskOuterOffset = Number.isFinite(Number(cfg.maskOuterOffset)) ? Number(cfg.maskOuterOffset) : 12
  const maskInnerPadding = Number.isFinite(Number(cfg.maskInnerPadding)) ? Number(cfg.maskInnerPadding) : 8
  const maskBg = String(cfg.maskBg ?? '#ffffff')
  const maskBorderColor = String(cfg.maskBorderColor ?? 'rgba(0,0,0,0.12)')
  const maskBorderWidth = Number.isFinite(Number(cfg.maskBorderWidth)) ? Number(cfg.maskBorderWidth) : 1
  const maskRadius = Number.isFinite(Number(cfg.maskRadius)) ? Number(cfg.maskRadius) : 12

  if (!useDsJs.length) {
    return <div style={{ padding: 12 }}>{txt(cfg.errorNoDs || 'Configura la fonte dati del widget.')}</div>
  }

  // Titolo elenco
  const listTitleText = txt(cfg.listTitleText || 'Elenco rapporti di rilevazione')
  const listTitleHeight = num(cfg.listTitleHeight, 28)
  const listTitlePaddingBottom = num(cfg.listTitlePaddingBottom, 10)
  const listTitlePaddingLeft = num(cfg.listTitlePaddingLeft, 0)
  const listTitleFontSize = num(cfg.listTitleFontSize, 14)
  const listTitleFontWeight = num(cfg.listTitleFontWeight, 600)
  const listTitleColor = txt(cfg.listTitleColor || 'rgba(0,0,0,0.85)')

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: maskOuterOffset, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Titolo elenco - sopra l'area bianca */}
      {listTitleText && (
        <div style={{
          height: listTitleHeight,
          paddingBottom: listTitlePaddingBottom,
          paddingLeft: listTitlePaddingLeft,
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          flex: '0 0 auto'
        }}>
          <span style={{
            fontSize: listTitleFontSize,
            fontWeight: listTitleFontWeight,
            color: listTitleColor
          }}>
            {listTitleText}
          </span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
          boxSizing: 'border-box',
          border: `${maskBorderWidth}px solid ${maskBorderColor}`,
          borderRadius: maskRadius,
          background: maskBg,
          padding: maskInnerPadding,
          overflow: 'hidden'
        }}
      >
        <div css={styles} style={{ width: '100%', height: '100%' }}>

          {/* ── Overlay bloccante: copre i dati finche' non c'e' login ── */}
          {(notLogged || userLoading) && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 100,
              background: 'rgba(255,255,255,0.97)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16, padding: 32, textAlign: 'center',
              borderRadius: maskRadius,
              pointerEvents: 'all'
            }}>
              {userLoading
                ? (
                  <>
                    <Loading />
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Verifica accesso in corso…</div>
                  </>
                )
                : (
                  <>
                    <div style={{ fontSize: 32 }}>🔒</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                      Accesso richiesto
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 300, lineHeight: 1.5 }}>
                      Utilizza il pulsante di accesso in alto a destra per entrare con le credenziali CBSM.
                    </div>
                  </>
                )
              }
            </div>
          )}

          {/* ── DataSource loaders: SEMPRE nel DOM (ExB richiede che siano registrati).
               Query "1=0" prima del login → nessun dato anonimo.
               Query reale dopo login → ExB ri-fetcha con credenziali. ── */}
          {useDsJs.map((u: any, i: number) => (
            <DataSourceComponent
              key={`${u?.dataSourceId || i}-${giiUser?.username || 'anon'}`}
              useDataSource={udsAny?.[i]}
              query={dsQuery}
              widgetId={props.id}
            >
              {(ds: DataSource, info: any) => (
                <RecordTracker ds={ds} dsId={String(u?.dataSourceId || '')} info={info} onUpdate={handleDsUpdate} />
              )}
            </DataSourceComponent>
          ))}

          {/* ── Tab ruolo: Tutte / In attesa mia / In attesa altri ── */}
          {!userLoading && statoRuoloField && (
            <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.08)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#6b7280', marginRight: 4 }}>
                {giiUser?.isAdmin ? '👤 Admin' : `👤 ${giiUser?.ruoloLabel ?? ''}`}
              </span>
              {ROLE_TABS.map(t => (
                <button
                  key={t.id}
                  type='button'
                  className={`tabBtn ${activeRoleTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveRoleTab(t.id)}
                >
                  {t.label}
                  {/* Conteggio record per tab */}
                  {(() => {
                    if (!activeGroup) return null
                    const all: DataRecord[] = []
                    for (const di of activeGroup.dsIndices) {
                      const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
                      const entry = dsDataRef.current[dsId]
                      if (entry?.recs) all.push(...entry.recs)
                    }
                    const count = t.id === 'tutte'
                      ? all.length
                      : all.filter(r => {
                          const d = r.getData?.() || {}
                          const n = d[statoRuoloField!] != null ? Number(d[statoRuoloField!]) : null
                          if (t.id === 'attesa_mia') return n === 0 || n === 1 || n === 3
                          if (t.id === 'attesa_altri') return n === 2 || n === 4
                          return false
                        }).length
                    return count > 0 ? (
                      <span style={{
                        marginLeft: 6, background: activeRoleTab === t.id ? '#2f6fed' : 'rgba(0,0,0,0.1)',
                        color: activeRoleTab === t.id ? '#fff' : '#374151',
                        borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 700
                      }}>{count}</span>
                    ) : null
                  })()}
                </button>
              ))}
            </div>
          )}

          {/* Indicatore admin: vede tutto senza filtri */}
          {!userLoading && giiUser?.isAdmin && (
            <div style={{ padding: '6px 12px', fontSize: 11, color: '#6b7280', borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#fafafa' }}>
              👤 Admin — visualizzazione completa senza filtri ruolo
            </div>
          )}

          {/* Indicatore caricamento ruolo (visibile solo quando loggato ma ancora caricando) */}
          {userLoading && !notLogged && (
            <div style={{ padding: '6px 12px', fontSize: 11, color: '#6b7280' }}>
              Rilevamento ruolo utente…
            </div>
          )}

          {/* ── Tab bar datasource (raggruppati per etichetta) — solo se ci sono tab multiple E non ci sono tab ruolo ── */}
          {hasTabs && !statoRuoloField && (
            <div className='tabBar'>
              {tabGroups.map((g, i) => (
                <button
                  key={g.label}
                  type='button'
                  className={`tabBtn ${i === activeTab ? 'active' : ''}`}
                  onClick={() => {
                    // Clear selezioni per i DS del tab corrente
                    const curGroup = tabGroups[activeTab]
                    if (curGroup) {
                      curGroup.dsIndices.forEach(di => {
                        const dsId = String(filteredUseDsJs[di]?.dataSourceId || '')
                        const entry = dsDataRef.current[dsId]
                        if (entry?.ds) tryClearSelection(entry.ds)
                      })
                      setLocalSelectedByDs(prev => {
                        const updated = { ...prev }
                        curGroup.dsIndices.forEach(di => {
                          delete updated[String(filteredUseDsJs[di]?.dataSourceId || '')]
                        })
                        return updated
                      })
                    }
                    setActiveTab(i)
                  }}
                  title={g.label}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Contenuto: record fusi da tutti i DS del tab attivo ── */}
          <div className='viewport'>
            <div className='content'>
              {anyLoading && <Loading />}

              {!anyLoading && mergedRecs.length === 0 && (
                <div className='empty'>{txt(cfg.emptyMessage || 'Nessun record trovato.')}</div>
              )}

              {mergedRecs.length > 0 && (
                <>
                  {cfg.showHeader !== false && (
                    <div className='headerWrap'>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                        {isCustomSort && (
                          <Button
                            size='sm'
                            type='tertiary'
                            className='resetBtn'
                            onClick={() => setSortState(defaultSort)}
                            title='Ripristina ordinamento di default'
                            aria-label='Reset ordinamento'
                          >
                            Reset
                          </Button>
                        )}
                      </div>

                      <div className='gridHeader'>
                        {columns.map((col, ci) => (
                          <Header key={col.id} first={ci === 0} label={col.label} field={col.field} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className='list'>
                    {mergedRecs.map((r, idx) => {
                      const d = r.getData?.() || {}
                      const oid = Number(d.OBJECTID)
                      const rid = String(r.getId?.() ?? oid)
                      const recDsId = recDsLookup.get(r) || ''

                      const fp = String(fieldPratica || '').toLowerCase()
                      const pratica = (fp === 'objectid' || fp === 'oid' || fp === 'object_id')
                        ? getCodPraticaDisplay(r)
                        : txt(d[fieldPratica])
                      const dataRil = formatDateIt(d[fieldDataRil])
                      const ufficio = txt(d[fieldUfficio])

                      const sintetico = computeSintetico(d)
                      const statoLabel = txt(sintetico.label)
                      const statoChipNum = sintetico.statoForChip

                      const ultimoMs = computeUltimoAggMs(d)
                      const ultimo = ultimoMs ? formatDateIt(ultimoMs) : '—'

                      const prossima = computeProssima(d, sintetico.ruolo)

                      const isSel = (localSelectedByDs[recDsId] === rid)
                      const even = idx % 2 === 0

                      return (
                        <div
                          key={`${recDsId}_${rid}`}
                          className={`rowCard ${even ? 'even' : 'odd'} ${isSel ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSel) {
                              // Deseleziona su TUTTI i DS
                              setLocalSelectedByDs({})
                              Object.keys(dsDataRef.current).forEach(id => {
                                const e = dsDataRef.current[id]
                                if (e?.ds) tryClearSelection(e.ds)
                              })
                              // Deseleziona anche su tutti i DS parent via DataSourceManager
                              filteredUseDsJs.forEach((u: any) => {
                                const dsId = String(u?.dataSourceId || '')
                                try {
                                  const mainDs = DataSourceManager.getInstance().getDataSource(dsId)
                                  if (mainDs) tryClearSelection(mainDs)
                                  // Risali al parent DS
                                  const parentId = (mainDs as any)?.parentDataSource?.id || (mainDs as any)?.getMainDataSource?.()?.id
                                  if (parentId) {
                                    const parentDs = DataSourceManager.getInstance().getDataSource(parentId)
                                    if (parentDs) tryClearSelection(parentDs)
                                  }
                                } catch {}
                              })
                            } else {
                              // Pulisci tutte le selezioni precedenti su tutti i DS
                              Object.keys(dsDataRef.current).forEach(id => {
                                const e = dsDataRef.current[id]
                                if (e?.ds) tryClearSelection(e.ds)
                              })
                              // Seleziona questo record sul suo DS nativo
                              setLocalSelectedByDs({ [recDsId]: rid })
                              const entry = dsDataRef.current[recDsId]
                              if (entry?.ds) trySelectRecord(entry.ds, r, rid)

                              // Propaga: forza setSelectedRecords con lo stesso record
                              // su TUTTI i DS del gruppo (ExB usa l'interfaccia DataRecord)
                              if (activeGroup) {
                                activeGroup.dsIndices.forEach(di => {
                                  const otherId = String(filteredUseDsJs[di]?.dataSourceId || '')
                                  if (otherId === recDsId) return
                                  const otherEntry = dsDataRef.current[otherId]
                                  if (otherEntry?.ds) {
                                    try { (otherEntry.ds as any).setSelectedRecords?.([r]) } catch {}
                                    try { (otherEntry.ds as any).selectRecordsByIds?.([rid]) } catch {}
                                  }
                                  // Anche sul parent DS (il feature layer principale)
                                  try {
                                    const mainDs = DataSourceManager.getInstance().getDataSource(otherId)
                                    const parentDs = (mainDs as any)?.parentDataSource || (mainDs as any)?.getMainDataSource?.()
                                    if (parentDs) {
                                      try { parentDs.setSelectedRecords?.([r]) } catch {}
                                    }
                                  } catch {}
                                })
                              }
                            }
                          }}
                        >
                          {columns.map((col, ci) => {
                            const f = col.field
                            if (f === V_STATO) {
                              return (
                                <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={statoLabel}>
                                  <span className='chip' style={getChipStyle(Number.isFinite(Number(statoChipNum)) ? Number(statoChipNum) : null)}>
                                    {statoLabel}
                                  </span>
                                </div>
                              )
                            }
                            if (f === V_ULTIMO) {
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={ultimo}>{ultimo}</div>
                            }
                            if (f === V_PROSSIMA) {
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={prossima}>{prossima}</div>
                            }
                            const fl = f.toLowerCase()
                            if (fl === 'objectid' || fl === 'oid' || fl === 'object_id') {
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={pratica}>{pratica}</div>
                            }
                            if (fl.startsWith('data_') || fl.startsWith('dt_')) {
                              const val = formatDateIt(d[f])
                              return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={val}>{val}</div>
                            }
                            const val = txt(d[f])
                            return <div key={col.id} className={ci === 0 ? 'cell first' : 'cell'} title={val}>{val}</div>
                          })}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
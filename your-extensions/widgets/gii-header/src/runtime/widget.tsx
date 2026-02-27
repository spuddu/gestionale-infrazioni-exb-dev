/** @jsx jsx */
import { React, jsx, type AllWidgetProps, SessionManager, UrlManager, getAppStore } from 'jimu-core'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

const GII_PORTAL     = 'https://cbsm-hub.maps.arcgis.com'
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'
const RUOLO_LABEL: Record<number, string> = { 1:'TR', 2:'TI', 3:'RZ', 4:'RI', 5:'DT', 6:'DA' }
const RUOLO_FULL:  Record<string, string> = {
  TR:'Tecnico Rilevatore', TI:'Tecnico Istruttore', RZ:'Responsabile di Zona',
  RI:'Responsabile Istruttore', DT:'Direttore Tecnico', DA:'Direttore Amministrativo', ADMIN:'Amministratore'
}
const AREA_LABEL: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }


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
  ruoloLabel: string
  ruoloFull: string
  area: number | null
  settore: number | null
  ufficio: number | null
  gruppo: string
  isAdmin: boolean
}

function toNum(v: any): number | null {
  const n = v != null ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
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
    const ruolo = toNum(cached.ruolo)
    const area = toNum(cached.area)
    const settore = toNum(cached.settore)
    const ufficio = toNum(cached.ufficio)
    const isAdmin = !!cached.isAdmin
    const rl = String(cached.ruoloLabel || (ruolo != null ? (RUOLO_LABEL[ruolo] ?? '') : '') || (isAdmin ? 'ADMIN' : ''))
    const fullName = String(cached.fullName || cached.full_name || cached.username)
    const u: GiiUserRole = {
      username: String(cached.username),
      fullName,
      ruolo,
      ruoloLabel: rl,
      ruoloFull: RUOLO_FULL[rl] || rl,
      area,
      settore,
      ufficio,
      gruppo: String(cached.gruppo || ''),
      isAdmin
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
    const isAdmin  = json?.role === 'org_admin'
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: GII_UTENTI_URL })
    await fl.load().catch(() => {})
    const qr = await fl.queryFeatures({
      where: `username = '${username.replace(/'/g,"''")}'`,
      outFields: ['ruolo','area','settore','ufficio','gruppo','full_name'],
      returnGeometry: false
    })
    const f = qr?.features?.[0]
    if (!f && isAdmin) {
      const u: GiiUserRole = {
        username, fullName,
        ruolo: null, ruoloLabel: 'ADMIN', ruoloFull: 'Amministratore',
        area: null, settore: null, ufficio: null, gruppo: '',
        isAdmin: true
      }
      try { (window as any).__giiUserRole = u } catch { }
      return u
    }
    if (!f) {
      const u: GiiUserRole = {
        username, fullName,
        ruolo: null, ruoloLabel: isAdmin ? 'ADMIN' : '', ruoloFull: isAdmin ? 'Amministratore' : '',
        area: null, settore: null, ufficio: null, gruppo: '',
        isAdmin
      }
      try { (window as any).__giiUserRole = u } catch { }
      return u
    }
    const a = f.attributes
    const rn = a.ruolo != null ? Number(a.ruolo) : null
    const rl = rn ? (RUOLO_LABEL[rn] ?? '') : (isAdmin ? 'ADMIN' : '')
    const u: GiiUserRole = {
      username,
      fullName: String(a.full_name || fullName),
      ruolo: rn,
      ruoloLabel: rl,
      ruoloFull: RUOLO_FULL[rl] || rl,
      area: toNum(a.area),
      settore: toNum(a.settore),
      ufficio: toNum(a.ufficio),
      gruppo: String(a.gruppo || ''),
      isAdmin
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

      {/* Logo + Titoli */}
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div style={{
          width:cfg.logoSize, height:cfg.logoSize, borderRadius:cfg.logoRadius,
          background:logoBg, flexShrink:0, overflow:'hidden',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 14px rgba(0,0,0,0.3)',
          padding:cfg.logoPadding ?? 4, boxSizing:'border-box',
          animationName:'pulse-ring', animationDuration:'3s', animationIterationCount:'infinite', animationTimingFunction:'ease-out',
          ...off('offsetLogo')
        }}>
          <img src={cfg.logoUrl} alt='logo' style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} />
        </div>
        <div style={{ ...off('offsetTitoli') }}>
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
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:cfg.userNameSize,fontWeight:600,color:cfg.userNameColor,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                  Benvenuto, {user.fullName||user.username}
                </div>
                <div style={{ fontSize:11.5,color:cfg.userInfoColor,marginTop:2,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' as const }}>
                  {user.ruoloLabel && <span style={{ background:cfg.userBadgeBg,border:`1px solid ${cfg.userBadgeColor}44`,borderRadius:6,padding:'1px 8px',fontWeight:600,color:cfg.userBadgeColor }}>{user.ruoloLabel}</span>}
                  {user.ruoloFull && <span>{user.ruoloFull}</span>}
                  {user.area != null && <span>· Area {AREA_LABEL[user.area] || ''}</span>}
                </div>
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
                    <div style={{ fontSize:11.5, color:'rgba(147,197,253,0.75)', marginBottom:10 }}>
                      {user.ruoloLabel ? `${user.ruoloLabel}${user.area!=null ? ` · Area ${AREA_LABEL[user.area] || ''}` : ''}` : ''}
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

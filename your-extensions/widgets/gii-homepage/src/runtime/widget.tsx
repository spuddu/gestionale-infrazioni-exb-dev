/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, SessionManager, UrlManager, getAppStore } from 'jimu-core'
import type { IMConfig, CardConfig, GroupOffset } from '../config'
import { defaultConfig } from '../config'

const GII_PORTAL     = 'https://cbsm-hub.maps.arcgis.com'
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_uteniti/FeatureServer/0'
const RUOLO_LABEL: Record<number, string> = { 1:'TR', 2:'TI', 3:'RZ', 4:'RI', 5:'DT', 6:'DA' }
const RUOLO_FULL:  Record<string, string> = {
  TR:'Tecnico Rilevatore', TI:'Tecnico Istruttore', RZ:'Responsabile di Zona',
  RI:'Responsabile Istruttore', DT:'Direttore Tecnico', DA:'Direttore Amministrativo', ADMIN:'Amministratore'
}
const AREA_LABEL: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }

const CARD_ICONS: Record<string, string> = {
  elenco:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  mappa:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  nuova:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="13" width="8" height="8" rx="1.5"/><rect x="14" y="13" width="8" height="8" rx="1.5"/><rect x="2" y="3" width="8" height="8" rx="1.5"/><rect x="14" y="3" width="8" height="8" rx="1.5"/></svg>`,
  report:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`
}
const DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`

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

interface UserInfo { username: string; fullName: string; ruoloLabel: string; ruoloFull: string; area: string; isAdmin: boolean }

async function loadUser(): Promise<UserInfo | null> {
  const cached = (window as any).__giiUserRole
  if (cached?.username) {
    const rl = cached.ruoloLabel || (RUOLO_LABEL[cached.ruolo] ?? 'ADMIN')
    return { username: cached.username, fullName: cached.fullName || cached.username, ruoloLabel: rl, ruoloFull: RUOLO_FULL[rl] || rl, area: AREA_LABEL[cached.area] || '', isAdmin: cached.isAdmin || false }
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
    const qr = await fl.queryFeatures({ where: `username = '${username.replace(/'/g, "''")}'`, outFields: ['ruolo','area','full_name'], returnGeometry: false })
    const f = qr?.features?.[0]
    if (!f && isAdmin) return { username, fullName, ruoloLabel: 'ADMIN', ruoloFull: 'Amministratore', area: '', isAdmin: true }
    if (!f) return { username, fullName, ruoloLabel: '', ruoloFull: '', area: '', isAdmin: false }
    const a = f.attributes
    const rn = a.ruolo != null ? Number(a.ruolo) : null
    const rl = rn ? (RUOLO_LABEL[rn] ?? '') : (isAdmin ? 'ADMIN' : '')
    return { username, fullName: String(a.full_name || fullName), ruoloLabel: rl, ruoloFull: RUOLO_FULL[rl] || rl, area: AREA_LABEL[a.area] || '', isAdmin }
  } catch { return null }
}



/** Applica offset posizione come position:relative */
function off(o: GroupOffset | undefined): React.CSSProperties {
  if (!o || (o.x === 0 && o.y === 0)) return {}
  return { position: 'relative' as const, top: o.y, left: o.x }
}

/** Normalizza un valore configurato (name/id/url) e prova a ricavare il pageId reale */
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

// ── Card ──────────────────────────────────────────────────────────────────────
function Card(p: { card: CardConfig; cfg: any; idx: number }) {
  const { card, cfg } = p
  const [hov, setHov] = React.useState(false)
  const icon = CARD_ICONS[card.id] || DEFAULT_ICON
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => {
        const v = (card.hashPage || '').trim()
        if (!v) return
        gotoPage(v)
      }}
      style={{ cursor:'pointer', borderRadius:cfg.cardBorderRadius,
        border:`1.5px solid ${hov ? card.colorAccent : 'rgba(255,255,255,0.10)'}`,
        background: hov ? (card.colorBgHover || `linear-gradient(135deg,${card.colorBg}ee 0%,${card.colorBg}cc 100%)`) : (card.colorBgRest || 'rgba(255,255,255,0.05)'),
        backdropFilter:'blur(12px)', padding:cfg.cardPadding,
        transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hov ? `0 20px 40px rgba(0,0,0,0.3),0 0 0 1px ${card.colorAccent}44` : '0 4px 16px rgba(0,0,0,0.15)',
        animationDelay:`${p.idx*80}ms`, animationName:'fadeInUp',
        animationDuration:'0.5s', animationFillMode:'both', animationTimingFunction:'cubic-bezier(0.4,0,0.2,1)' }}>
      <div style={{ width:48,height:48,borderRadius:12, background:hov?`${card.colorAccent}33`:'rgba(255,255,255,0.08)', display:'flex',alignItems:'center',justifyContent:'center', marginBottom:16,transition:'background 0.25s', color:hov?card.colorAccent:'rgba(255,255,255,0.7)' }}>
        <div style={{ width:24,height:24 }} dangerouslySetInnerHTML={{ __html: icon }} />
      </div>
      <div style={{ fontFamily:cfg.cardLabelFont,fontSize:cfg.cardLabelSize,fontWeight:cfg.cardLabelWeight, color:hov?'#fff':'rgba(255,255,255,0.90)',marginBottom:8,transition:'color 0.2s' }}>{card.label}</div>
      <div style={{ fontSize:cfg.cardDescSize,lineHeight:1.55, color:hov?'rgba(255,255,255,0.80)':'rgba(255,255,255,0.50)',transition:'color 0.2s' }}>{card.desc}</div>
      <div style={{ marginTop:20,fontSize:cfg.cardCtaSize,fontWeight:700,letterSpacing:cfg.cardCtaSpacing, textTransform:'uppercase' as const, color:hov?card.colorAccent:'rgba(255,255,255,0.25)', display:'flex',alignItems:'center',gap:6,transition:'color 0.2s' }}>
        {cfg.cardCtaText}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform:hov?'translateX(4px)':'translateX(0)',transition:'transform 0.2s' }}>
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </div>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────
type Props = AllWidgetProps<IMConfig>

export default function Widget(props: Props) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const rawCards: CardConfig[] = Array.isArray(cfg.cards) ? cfg.cards.map((c: any) => ({ ...c })) : defaultConfig.cards

  const oClock:  GroupOffset = cfg.offsetClock  || { x:0, y:0 }
  const oBanner: GroupOffset = cfg.offsetBanner || { x:0, y:0 }
  const oCards:  GroupOffset = cfg.offsetCards  || { x:0, y:0 }

  const [user,  setUser]  = React.useState<UserInfo | null>(null)
  const [uLoad, setULoad] = React.useState(true)
  const [now,   setNow]   = React.useState(new Date())

  React.useEffect(() => {
    loadUser().then(u => { setUser(u); setULoad(false) })
    const h = () => loadUser().then(u => setUser(u))
    window.addEventListener('gii:userLoaded', h)
    return () => window.removeEventListener('gii:userLoaded', h)
  }, [])

  React.useEffect(() => {
    if (!cfg.showClock) return
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [cfg.showClock])

  const fmtDate = (d: Date) => d.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const fmtTime = (d: Date) => d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' })

  const isVisible = (c: CardConfig) => {
    if (!c.visible) return false
    if (c.roles.includes('*')) return true
    if (!user) return false
    if (user.isAdmin) return true
    return c.roles.includes(user.ruoloLabel)
  }
  const visibleCards = rawCards.slice().sort((a,b) => a.order - b.order).filter(isVisible)


  return (
    <div style={{ width:'100%',height:'100%',minHeight:500,
      background:`linear-gradient(${cfg.bgGradAngle}deg,${cfg.bgGradStart} 0%,${cfg.bgGradMid} 40%,${cfg.bgGradEnd} 100%)`,
      position:'relative',overflow:'hidden',fontFamily:"'Source Sans 3','Segoe UI',sans-serif",boxSizing:'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');
        @keyframes fadeInUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(59,130,246,0.4)} 70%{box-shadow:0 0 0 10px rgba(59,130,246,0)} 100%{box-shadow:0 0 0 0 rgba(59,130,246,0)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
      `}</style>

      {cfg.showCircles && Array.from({ length: cfg.circleCount ?? 3 }).map((_, i) => {
        const count  = cfg.circleCount ?? 3
        const base   = cfg.circleBaseSize ?? 700
        const sz     = base - i * Math.floor(base / count * 0.6)
        const op     = Math.max(0.01, (cfg.circleOpacity ?? 0.08) - i * 0.01)
        const thick  = cfg.circleThickness ?? 1
        const hex    = (cfg.circleColor ?? '#60a5fa').replace('#','')
        const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
        const hexEnd = (cfg.circleColorEnd ?? '#a78bfa').replace('#','')
        const r2 = parseInt(hexEnd.slice(0,2),16), g2 = parseInt(hexEnd.slice(2,4),16), b2 = parseInt(hexEnd.slice(4,6),16)
        return (
          <div key={i} style={{
            position:'absolute', top:-200+i*80, right:-200+i*80,
            width:sz, height:sz, borderRadius:'50%',
            zIndex:0,
            border:`${thick}px solid rgba(${r},${g},${b},${op})`,
            background: cfg.circleGradient
              ? `radial-gradient(circle,rgba(${r2},${g2},${b2},${Math.max(0.01,op*0.15)}) 0%,transparent 70%)`
              : undefined,
            pointerEvents:'none'
          }}/>
        )
      })}
      <div style={{ position:'absolute',bottom:-100,left:-80,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)',pointerEvents:'none' }} />
      {cfg.showWave && (
        <svg style={{ position:'absolute',bottom:0,left:0,right:0,width:'100%',opacity:0.07,pointerEvents:'none' }} viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path d="M0,100 C180,60 360,140 540,100 C720,60 900,140 1080,100 C1260,60 1380,120 1440,100 L1440,200 L0,200 Z" fill="#60a5fa"/>
          <path d="M0,130 C200,90 400,160 600,130 C800,100 1000,160 1200,130 C1350,105 1400,140 1440,130 L1440,200 L0,200 Z" fill="#3b82f6"/>
        </svg>
      )}

      <div style={{ position:'relative',zIndex:1,height:'100%',display:'flex',flexDirection:'column',padding:'28px 40px 24px',boxSizing:'border-box' }}>

        {/* ── RIGA 2: Banner ←→ Orologio ──
            alignItems:'center' → orologio centrato verticalmente rispetto all'altezza del banner        */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexShrink:0,
          animationName:'fadeInUp',animationDuration:'0.5s',animationDelay:'0.1s',animationFillMode:'both' }}>

          {/* Gruppo: Banner utente */}
          <div style={{ ...off(oBanner) }}>
            {cfg.showUserBanner && (
              uLoad ? (
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(147,197,253,0.2)',borderTopColor:'#60a5fa',animationName:'spin',animationDuration:'0.8s',animationIterationCount:'infinite',animationTimingFunction:'linear' }} />
                  <span style={{ fontSize:12,color:'rgba(147,197,253,0.6)' }}>Caricamento profilo…</span>
                </div>
              ) : user ? (
                <div style={{ display:'inline-flex',alignItems:'center',gap:14,background:cfg.userBannerBg,
                  backdropFilter:'blur(8px)',border:`1px solid ${cfg.userBannerBorderColor}`,borderRadius:14,padding:'10px 18px' }}>
                  <div style={{ width:38,height:38,borderRadius:'50%',
                    background:`linear-gradient(135deg,${cfg.userAvatarBg1},${cfg.userAvatarBg2})`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'#fff',flexShrink:0 }}>
                    {(user.fullName||user.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:cfg.userNameSize,fontWeight:600,color:cfg.userNameColor }}>
                      Benvenuto, {user.fullName||user.username}
                    </div>
                    <div style={{ fontSize:11.5,color:cfg.userInfoColor,marginTop:2,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' as const }}>
                      {user.ruoloLabel && <span style={{ background:cfg.userBadgeBg,border:`1px solid ${cfg.userBadgeColor}44`,borderRadius:6,padding:'1px 8px',fontWeight:600,color:cfg.userBadgeColor }}>{user.ruoloLabel}</span>}
                      {user.ruoloFull && <span>{user.ruoloFull}</span>}
                      {user.area && <span>· Area {user.area}</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display:'inline-flex',alignItems:'center',gap:10,background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:10,padding:'9px 16px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize:12.5,color:'rgba(251,191,36,0.9)' }}>Accesso non autenticato</span>
                </div>
              )
            )}
          </div>

          {/* Gruppo: Orologio — centrato verticalmente nella riga grazie ad alignItems:'center' */}
          {cfg.showClock && (
            <div style={{ textAlign:'right',flexShrink:0, ...off(oClock) }}>
              <div style={{ fontSize:cfg.clockSize,fontWeight:300,color:cfg.clockColor,letterSpacing:-0.5,fontFamily:cfg.titleFont }}>
                {fmtTime(now)}
              </div>
              <div style={{ fontSize:cfg.dateSize,color:cfg.dateColor,marginTop:1,textTransform:'capitalize' as const }}>
                {fmtDate(now)}
              </div>
            </div>
          )}
        </div>


        {/* ── RIGA 3: Etichetta + Cards */}
        <div style={{ flex:1,display:'flex',flexDirection:'column', ...off(oCards) }}>
          <div style={{ fontSize:cfg.sectionLabelSize,fontWeight:700,letterSpacing:cfg.sectionLabelSpacing,
            textTransform:'uppercase' as const,color:cfg.sectionLabelColor,marginBottom:14,flexShrink:0,
            animationName:'fadeIn',animationDuration:'0.5s',animationDelay:'0.2s',animationFillMode:'both' }}>
            {cfg.sectionLabelText}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(${cfg.cardMinWidth}px,1fr))`,gap:cfg.cardsGap,flex:1,alignContent:'start' }}>
            {uLoad
              ? /* Skeleton: mostra tanti placeholder quante sono le card totali configurate,
                   così la griglia non cambia dimensione al caricamento dell'utente */
                rawCards.filter(c=>c.visible).map((_,i)=>(
                  <div key={i} style={{ borderRadius:cfg.cardBorderRadius, border:'1px solid rgba(255,255,255,0.07)',
                    background:'rgba(255,255,255,0.03)', padding:cfg.cardPadding,
                    animationDelay:`${i*80}ms`, animationName:'fadeInUp',
                    animationDuration:'0.5s', animationFillMode:'both' }}>
                    {/* Icona placeholder */}
                    <div style={{ width:48,height:48,borderRadius:12,background:'rgba(255,255,255,0.06)',
                      marginBottom:16,
                      backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.04) 50%,rgba(255,255,255,0) 100%)',
                      backgroundSize:'400px 100%',
                      animationName:'shimmer',animationDuration:'1.6s',animationIterationCount:'infinite',animationTimingFunction:'linear' }}/>
                    {/* Titolo placeholder */}
                    <div style={{ height:18,width:'60%',borderRadius:6,background:'rgba(255,255,255,0.06)',
                      marginBottom:10,
                      backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.04) 50%,rgba(255,255,255,0) 100%)',
                      backgroundSize:'400px 100%',
                      animationName:'shimmer',animationDuration:'1.6s',animationIterationCount:'infinite',animationTimingFunction:'linear',
                      animationDelay:`${i*80+200}ms` }}/>
                    {/* Descrizione placeholder */}
                    <div style={{ height:12,width:'85%',borderRadius:4,background:'rgba(255,255,255,0.04)',marginBottom:6,
                      backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.03) 50%,rgba(255,255,255,0) 100%)',
                      backgroundSize:'400px 100%',
                      animationName:'shimmer',animationDuration:'1.6s',animationIterationCount:'infinite',animationTimingFunction:'linear',
                      animationDelay:`${i*80+300}ms` }}/>
                    <div style={{ height:12,width:'70%',borderRadius:4,background:'rgba(255,255,255,0.04)',marginBottom:20,
                      backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.03) 50%,rgba(255,255,255,0) 100%)',
                      backgroundSize:'400px 100%',
                      animationName:'shimmer',animationDuration:'1.6s',animationIterationCount:'infinite',animationTimingFunction:'linear',
                      animationDelay:`${i*80+350}ms` }}/>
                    {/* CTA placeholder */}
                    <div style={{ height:10,width:'25%',borderRadius:4,background:'rgba(255,255,255,0.04)',
                      backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.03) 50%,rgba(255,255,255,0) 100%)',
                      backgroundSize:'400px 100%',
                      animationName:'shimmer',animationDuration:'1.6s',animationIterationCount:'infinite',animationTimingFunction:'linear',
                      animationDelay:`${i*80+400}ms` }}/>
                  </div>
                ))
              : visibleCards.map((card,i) => <Card key={card.id} card={card} cfg={cfg} idx={i} />)
            }
          </div>
        </div>

        {/* Footer */}
        {cfg.showFooter && (
          <div style={{ marginTop:20,flexShrink:0,display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.05)',animationName:'fadeIn',animationDuration:'0.5s',animationDelay:'0.4s',animationFillMode:'both' }}>
            <div style={{ fontSize:cfg.footerSize,color:cfg.footerColor }}>{cfg.footerLeft.replace('{year}',String(now.getFullYear()))}</div>
            <div style={{ fontSize:cfg.footerSize,color:cfg.footerColor }}>{cfg.footerRight}</div>
          </div>
        )}
      </div>
    </div>
  )
}

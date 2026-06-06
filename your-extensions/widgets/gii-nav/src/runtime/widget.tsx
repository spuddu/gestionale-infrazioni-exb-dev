/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, ReactRedux, type IMState, type AllWidgetProps, SessionManager, UrlManager, getAppStore } from 'jimu-core'
import type { IMConfig, NavItem } from '../config'
import { defaultConfig } from '../config'


const GII_PORTAL     = 'https://cbsm-hub.maps.arcgis.com'
const RUOLO_LABEL: Record<number, string> = { 1:'TR', 2:'TI', 3:'RZ', 4:'RI', 5:'DT', 6:'DA', 7:'ADMIN' }
const RUOLO_FULL:  Record<string, string> = {
  TR:'Tecnico Rilevatore', TI:'Tecnico Istruttore', RZ:'Responsabile di Zona',
  RI:'Responsabile Istruttoria', TI_AMM:'Tecnico Istruttore Amministrativo',
  RI_AMM:'Responsabile Istruttoria Amministrativo', DT:'Direttore Tecnico',
  DA:'Direttore Amministrativo', ADMIN:'Amministratore'
}
const AREA_LABEL: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }
const RUOLI_VALIDI = new Set(['TR', 'TI', 'TI_AMM', 'RZ', 'RI', 'RI_AMM', 'DT', 'DA', 'ADMIN'])
const AREE_VALIDE = new Set(['AMM', 'AGR', 'TEC'])

function normCode(value: any): string {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeRoleCode(value: any, numericFallback: any, isAdmin?: boolean): string {
  const direct = normCode(value)
  if (RUOLI_VALIDI.has(direct)) return direct

  const legacy = numericFallback != null && numericFallback !== '' ? Number(numericFallback) : NaN
  if (Number.isFinite(legacy) && RUOLO_LABEL[legacy]) return RUOLO_LABEL[legacy]

  if (isAdmin) return 'ADMIN'
  return ''
}

function normalizeAreaCode(value: any, numericFallback: any): string {
  const direct = normCode(value)
  if (AREE_VALIDE.has(direct)) return direct

  const legacy = numericFallback != null && numericFallback !== '' ? Number(numericFallback) : NaN
  if (Number.isFinite(legacy) && AREA_LABEL[legacy]) return AREA_LABEL[legacy]

  return ''
}

function resolveWorkflowRole(ruoloLabel: string, area: string): string {
  const role = normCode(ruoloLabel)
  const areaCode = normCode(area)
  if (role === 'TI_AMM' || (role === 'TI' && areaCode === 'AMM')) return 'TI_AMM'
  if (role === 'RI_AMM' || (role === 'RI' && areaCode === 'AMM')) return 'RI_AMM'
  return role
}

function normalizeSectorCode(value: any, numericFallback: any): string {
  const directRaw = normCode(value)
  const direct = directRaw === 'CS' ? 'DS' : directRaw
  if (direct) return direct

  const legacy = numericFallback != null && numericFallback !== '' ? Number(numericFallback) : NaN
  const legacyMap: Record<number, string> = { 1:'CR', 2:'GI', 3:'D1', 4:'D2', 5:'D3', 6:'D4', 7:'D5', 8:'D6', 9:'DS' }
  return Number.isFinite(legacy) ? (legacyMap[legacy] || '') : ''
}

function isSignedIn(): boolean {
  try {
    const sm = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL)
    const u = session?.username || session?.userId || ''
    return !!u
  } catch { return false }
}

interface UserInfo { username: string; fullName: string; ruoloLabel: string; ruoloFull: string; area: string; settore: string; isAdmin: boolean }

async function loadUser(): Promise<UserInfo | null> {
  const cached: any = (window as any).__giiUserRole
  if (cached?.username) {
    const area = normalizeAreaCode(cached.areaCod ?? cached.area_cod ?? cached.areaLabel, cached.area)
    const rawRole = normalizeRoleCode(
      cached.profiloCod ?? cached.profilo_cod ?? cached.ruoloCod ?? cached.ruolo_cod ?? cached.ruoloLabel,
      cached.ruolo,
      cached.isAdmin
    )
    const ruoloLabel = resolveWorkflowRole(rawRole, area)
    const settore = normalizeSectorCode(cached.settoreCod ?? cached.settore_cod ?? cached.settoreLabel, cached.settore)
    const isAdmin = cached.isAdmin === true || ruoloLabel === 'ADMIN'
    const profiloLabel = String(cached.profiloLabel || cached.profilo_label || '').trim()

    return {
      username: String(cached.username),
      fullName: String(cached.fullName || cached.full_name || cached.username),
      ruoloLabel,
      ruoloFull: profiloLabel || RUOLO_FULL[ruoloLabel] || ruoloLabel,
      area,
      settore,
      isAdmin
    }
  }
  return null
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

// ── Icone ─────────────────────────────────────────────────────────────────────
const NAV_ICONS: Record<string, string> = {
  home:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  elenco:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  nuova:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  mappa:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  dashboard:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="13" width="8" height="8" rx="1.5"/><rect x="14" y="13" width="8" height="8" rx="1.5"/><rect x="2" y="3" width="8" height="8" rx="1.5"/><rect x="14" y="3" width="8" height="8" rx="1.5"/></svg>`,
  report:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  utenti:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>`,
  gruppo:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="8" r="2.8"/><path d="M15.5 18.5a5 5 0 0 1 6 1.5"/></svg>`,
  prezzari:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><text x="12" y="16" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" font-weight="700" fill="currentColor" stroke="none">€</text></svg>`,
  impostazioni:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.08A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.08A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9c.25.36.6.6 1 .6h.1a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.02 1.4z"/></svg>`,
  allegati:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.4 11.6l-8.8 8.8a6 6 0 0 1-8.5-8.5l9.4-9.4a4 4 0 0 1 5.7 5.7l-9.4 9.4a2 2 0 0 1-2.8-2.8l8.8-8.8"/></svg>`,
  calendario:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  allarmi:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
  archivio:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  ricerca:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  modifica:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`,
  verbale:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><polyline points="15 2 15 7 20 7"/><line x1="9" y1="12" x2="17" y2="12"/><line x1="9" y1="16" x2="17" y2="16"/><path d="M4 6v16h12"/></svg>`,
  tabelle:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>`,
  statistiche: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="11" width="3" height="7" rx="1"/><rect x="11" y="6" width="3" height="12" rx="1"/><rect x="16" y="3" width="3" height="15" rx="1"/></svg>`,
  documenti:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h8l4 4v14H7z"/><polyline points="15 3 15 7 19 7"/><path d="M5 7H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11"/></svg>`
}
const NAV_DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`

// ── NavButton ─────────────────────────────────────────────────────────────────
function NavButton(p: { item: NavItem; cfg: any; idx: number; currentPageId: string | null; animate: boolean }) {
  const { item, cfg, currentPageId, animate } = p
  const [hov, setHov] = React.useState(false)
  const itemPageId = item.hashPage ? resolvePageId(item.hashPage) : null
  const isActive = !!currentPageId && !!itemPageId && currentPageId === itemPageId
  const hot = hov || isActive
  const icon = NAV_ICONS[item.icon] || NAV_DEFAULT_ICON

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => { if (item.hashPage) gotoPage(item.hashPage) }}
      style={{
        cursor: 'pointer',
        borderRadius: cfg.itemBorderRadius,
        border: `1.5px solid ${hot ? item.colorAccent : 'rgba(255,255,255,0.10)'}`,
        background: hot ? (item.colorBgHover || `linear-gradient(135deg,${item.colorBg}ee 0%,${item.colorBg}cc 100%)`) : (item.colorBgRest || 'rgba(255,255,255,0.05)'),
        backdropFilter: 'blur(12px)',
        padding: cfg.itemPadding,
        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: hov ? `0 20px 40px rgba(0,0,0,0.3),0 0 0 1px ${item.colorAccent}44` : '0 4px 16px rgba(0,0,0,0.15)',
        ...(animate ? {
          animationName: 'fadeInUp', animationDuration: '0.5s',
          animationDelay: `${p.idx * 80}ms`, animationFillMode: 'both',
          animationTimingFunction: 'cubic-bezier(0.4,0,0.2,1)'
        } : {})
      }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: hov ? `${item.colorAccent}33` : 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: hov ? item.colorAccent : 'rgba(255,255,255,0.7)',
        transition: 'background 0.25s', padding: 4, boxSizing: 'border-box' as const
      }}>
        <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: icon }}/>
      </div>
      <span style={{
        fontFamily: cfg.labelFont, fontSize: cfg.labelSize, fontWeight: cfg.labelWeight,
        color: hov ? '#fff' : 'rgba(255,255,255,0.90)',
        transition: 'color 0.2s', textAlign: 'left', lineHeight: 1.25
      }}>
        {item.label}
      </span>
    </div>
  )
}


// ── Widget ────────────────────────────────────────────────────────────────────
type Props = AllWidgetProps<IMConfig>

export default function Widget(props: Props) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const items: NavItem[] = Array.isArray(cfg.items) ? cfg.items : defaultConfig.items

  // Pagina corrente dallo store Redux di ExB (reagisce a UrlManager.changePage)
  const currentPageId = ReactRedux.useSelector((state: IMState) => {
    const s: any = state
    return (s?.appRuntimeInfo?.currentPageId as string) ?? null
  })

  // ── Animazione cascata: solo se si arriva dalla Home ──
  // ExB tiene in vita i widget di pagine non correnti. Più istanze di
  // gii-nav reagiscono allo stesso cambio currentPageId. Solo l'istanza
  // VISIBILE (offsetParent !== null) deve consumare il flag.
  // useLayoutEffect esegue prima del paint → zero flash.
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [animate, setAnimate] = React.useState(false)

  React.useLayoutEffect(() => {
    if (!currentPageId) return

    // Solo l'istanza visibile processa il flag
    const el = containerRef.current
    if (!el || el.offsetParent === null) return

    let fromHome = false
    try {
      const v = sessionStorage.getItem('GII_FROM_HOME')
      if (v) { sessionStorage.removeItem('GII_FROM_HOME'); fromHome = true }
    } catch { /* ignore */ }
    setAnimate(fromHome)
  }, [currentPageId])

  const [user,  setUser]  = React.useState<UserInfo | null>(null)
  const [uLoad, setULoad] = React.useState(true)

  React.useEffect(() => {
  let cancelled = false

  const apply = () => {
    loadUser().then(u => {
      if (cancelled) return
      if (u) {
        setUser(u)
        setULoad(false)
        return
      }
      if (!isSignedIn()) {
        setUser(null)
        setULoad(false)
      } else {
        setUser(null)
        setULoad(true)
      }
    })
  }

  apply()
  window.addEventListener('gii:userLoaded', apply)
  return () => {
    cancelled = true
    window.removeEventListener('gii:userLoaded', apply)
  }
}, [])


  const isVisible = (item: NavItem) => {
    if (!item.visible) return false
    if (item.roles.includes('*')) return true
    if (uLoad) return false
    if (!user) return false
    if (user.isAdmin) return true
    return item.roles.includes(user.ruoloLabel)
  }

  const visibleItems = [...items].sort((a, b) => a.order - b.order).filter(isVisible)
  const isHorizontal = cfg.direction === 'horizontal'
  const initialPadding = Number.isFinite(Number(cfg.initialPadding)) ? Number(cfg.initialPadding) : 8

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%',
      display: 'flex',
      flexDirection: isHorizontal ? 'row' : 'column',
      gap: cfg.gap,
      paddingTop: isHorizontal ? 8 : initialPadding,
      paddingRight: 8,
      paddingBottom: 8,
      paddingLeft: isHorizontal ? initialPadding : 8,
      boxSizing: 'border-box', overflow: 'auto'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap');
        @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      {visibleItems.map((item, i) => (
        <NavButton key={item.id} item={item} cfg={cfg} idx={i} currentPageId={currentPageId} animate={animate}/>
      ))}
    </div>
  )
}

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, SessionManager, UrlManager, getAppStore } from 'jimu-core'
import type { IMConfig, NavItem } from '../config'
import { defaultConfig } from '../config'


const GII_PORTAL     = 'https://cbsm-hub.maps.arcgis.com'
const RUOLO_LABEL: Record<number, string> = { 1:'TR', 2:'TI', 3:'RZ', 4:'RI', 5:'DT', 6:'DA' }
const RUOLO_FULL:  Record<string, string> = {
  TR:'Tecnico Rilevatore', TI:'Tecnico Istruttore', RZ:'Responsabile di Zona',
  RI:'Responsabile Istruttore', DT:'Direttore Tecnico', DA:'Direttore Amministrativo', ADMIN:'Amministratore'
}
const AREA_LABEL: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }

function isSignedIn(): boolean {
  try {
    const sm = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL)
    const u = session?.username || session?.userId || ''
    return !!u
  } catch { return false }
}

interface UserInfo { username: string; fullName: string; ruoloLabel: string; ruoloFull: string; area: string; isAdmin: boolean }

async function loadUser(): Promise<UserInfo | null> {
  const cached: any = (window as any).__giiUserRole
  if (cached?.username) {
    const ruoloNum = cached.ruolo != null ? Number(cached.ruolo) : null
    const rl = String(cached.ruoloLabel || (ruoloNum != null ? (RUOLO_LABEL[ruoloNum] ?? '') : (cached.isAdmin ? 'ADMIN' : '')))
    return {
      username: String(cached.username),
      fullName: String(cached.fullName || cached.full_name || cached.username),
      ruoloLabel: rl,
      ruoloFull: RUOLO_FULL[rl] || rl,
      area: AREA_LABEL[cached.area] || '',
      isAdmin: !!cached.isAdmin
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
  home:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  elenco:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  nuova:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  mappa:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="13" width="8" height="8" rx="1.5"/><rect x="14" y="13" width="8" height="8" rx="1.5"/><rect x="2" y="3" width="8" height="8" rx="1.5"/><rect x="14" y="3" width="8" height="8" rx="1.5"/></svg>`,
  report:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
}
const NAV_DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`

// ── NavButton ─────────────────────────────────────────────────────────────────
function NavButton(p: { item: NavItem; cfg: any; idx: number; currentPageId: string | null }) {
  const { item, cfg, currentPageId } = p
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
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hov ? `0 20px 40px rgba(0,0,0,0.3),0 0 0 1px ${item.colorAccent}44` : '0 4px 16px rgba(0,0,0,0.15)',
        animationName: 'fadeInUp', animationDuration: '0.5s',
        animationDelay: `${p.idx * 80}ms`, animationFillMode: 'both',
        animationTimingFunction: 'cubic-bezier(0.4,0,0.2,1)'
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

  // Pagina corrente (per evidenziare il pulsante attivo come stato hover)
  const readCurrentPageId = (): string | null => {
    try {
      const st: any = getAppStore()?.getState?.()
      const rid = st?.appRuntimeInfo?.currentPageId
      if (rid) return rid
    } catch { /* ignore */ }

    const h = window.location.hash || ''
    const m = h.match(/#\/page\/([^/?#]+)/)
    const tok = m ? decodeURIComponent(m[1]) : ''
    if (!tok) return null
    return resolvePageId(tok) || tok
  }

  const [currentPageId, setCurrentPageId] = React.useState<string | null>(() => readCurrentPageId())

  React.useEffect(() => {
    const upd = () => setCurrentPageId(readCurrentPageId())
    upd()
    window.addEventListener('hashchange', upd)
    window.addEventListener('popstate', upd)
    return () => {
      window.removeEventListener('hashchange', upd)
      window.removeEventListener('popstate', upd)
    }
  }, [])

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

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex',
      flexDirection: cfg.direction === 'horizontal' ? 'row' : 'column',
      gap: cfg.gap, padding: 8,
      boxSizing: 'border-box', overflow: 'auto'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap');
        @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      {visibleItems.map((item, i) => (
        <NavButton key={item.id} item={item} cfg={cfg} idx={i} currentPageId={currentPageId}/>
      ))}
    </div>
  )
}

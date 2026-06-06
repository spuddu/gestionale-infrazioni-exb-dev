/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, ReactRedux, type IMState, type AllWidgetProps, SessionManager, UrlManager, getAppStore } from 'jimu-core'
import type { IMConfig, CardConfig, GroupOffset } from '../config'
import { defaultConfig } from '../config'

const GII_PORTAL = 'https://cbsm-hub.maps.arcgis.com'
const RUOLO_LABEL: Record<number, string> = { 1:'TR', 2:'TI', 3:'RZ', 4:'RI', 5:'DT', 6:'DA', 7:'ADMIN' }
const ROLE_CODES = new Set(['TR', 'TI', 'RZ', 'RI', 'DT', 'DA', 'RI_AMM', 'TI_AMM', 'ADMIN'])
const AREA_CODES = new Set(['AMM', 'AGR', 'TEC'])
const SETTORE_CODES = new Set(['CR', 'GI', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'DS'])
const AREA_FROM_NUM: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }
const SETTORE_FROM_NUM: Record<number, string> = { 1:'CR', 2:'GI', 3:'D1', 4:'D2', 5:'D3', 6:'D4', 7:'D5', 8:'D6', 9:'DS' }

// Icone configurabili per le card della homepage.
const CARD_ICONS: Record<string, string> = {
  home:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  elenco:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  mappa:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  nuova:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
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
const DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`

function inferCardIcon(card: Partial<CardConfig>): string {
  const explicit = String((card as any)?.icon || '').trim()
  if (explicit && CARD_ICONS[explicit]) return explicit

  const id = String((card as any)?.id || '').trim()
  if (id && CARD_ICONS[id]) return id

  const text = `${id} ${(card as any)?.hashPage || ''} ${(card as any)?.label || ''}`.toLowerCase()
  if (/(^|[^a-z])home([^a-z]|$)|homepage|inizio/.test(text)) return 'home'
  if (/utent|utente|user|profil/.test(text)) return 'utenti'
  if (/grupp|team|squadra/.test(text)) return 'gruppo'
  if (/prezz|euro|€|tariff|import/.test(text)) return 'prezzari'
  if (/allegat|attach|documenti allegati/.test(text)) return 'allegati'
  if (/calendar|calendario|agenda|scadenz/.test(text)) return 'calendario'
  if (/allarm|notific|avvis/.test(text)) return 'allarmi'
  if (/archiv/.test(text)) return 'archivio'
  if (/ricerc|search|cerca/.test(text)) return 'ricerca'
  if (/modific|edit|gestione/.test(text) && !/prezz|utent/.test(text)) return 'modifica'
  if (/verbale|atto/.test(text)) return 'verbale'
  if (/tabell|parametr/.test(text)) return 'tabelle'
  if (/statistic|graf|analisi/.test(text)) return 'statistiche'
  if (/elenco|pratic/.test(text)) return 'elenco'
  if (/mappa|map/.test(text)) return 'mappa'
  if (/dashboard|cruscotto/.test(text)) return 'dashboard'
  if (/report/.test(text)) return 'report'
  if (/nuov|rilevaz|crea/.test(text)) return 'nuova'
  return 'nuova'
}

// Palette (stabile) per le cards autogenerate da pagine.
const AUTO_CARD_PALETTE: Array<{ bg: string; accent: string }> = [
  { bg: '#0c329d', accent: '#6fa5fb' },
  { bg: '#14532d', accent: '#22c55e' },
  { bg: '#7c2d12', accent: '#f97316' },
  { bg: '#4a1d96', accent: '#b79ffe' },
  { bg: '#0f766e', accent: '#2dd4bf' },
  { bg: '#7c3aed', accent: '#c4b5fd' },
  { bg: '#b45309', accent: '#fbbf24' },
  { bg: '#0f172a', accent: '#93c5fd' }
]

function hashToIndex(s: string, mod: number): number {
  let h = 0
  const str = String(s || '')
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return mod ? (h % mod) : 0
}

function isSignedIn(): boolean {
  try {
    const sm = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL)
    const u = session?.username || session?.userId || ''
    return !!u
  } catch { return false }
}

interface UserInfo {
  username: string
  fullName: string
  ruoloLabel: string
  ruoloCod: string
  areaCod: string
  settoreCod: string
  isAdmin: boolean
}

function cleanCode(value: any): string {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeRoleCode(value: any, numericFallback?: any): string {
  const direct = cleanCode(value)
  if (ROLE_CODES.has(direct)) return direct

  const n = numericFallback != null && numericFallback !== '' ? Number(numericFallback) : Number(value)
  if (Number.isFinite(n) && RUOLO_LABEL[n]) return RUOLO_LABEL[n]

  return ''
}

function normalizeAreaCode(value: any, numericFallback?: any): string {
  const direct = cleanCode(value)
  if (AREA_CODES.has(direct)) return direct

  const n = numericFallback != null && numericFallback !== '' ? Number(numericFallback) : Number(value)
  if (Number.isFinite(n) && AREA_FROM_NUM[n]) return AREA_FROM_NUM[n]

  return ''
}

function normalizeSettoreCode(value: any, numericFallback?: any): string {
  const direct = cleanCode(value)
  const fixed = direct === 'CS' ? 'DS' : direct
  if (SETTORE_CODES.has(fixed)) return fixed

  const n = numericFallback != null && numericFallback !== '' ? Number(numericFallback) : Number(value)
  if (Number.isFinite(n) && SETTORE_FROM_NUM[n]) return SETTORE_FROM_NUM[n]

  return ''
}

async function loadUser(): Promise<UserInfo | null> {
  const cached: any = (window as any).__giiUserRole
  if (!cached?.username) return null

  const areaCod = normalizeAreaCode(cached.areaCod ?? cached.area_cod ?? cached.areaLabel, cached.area)
  const baseRuoloCod = normalizeRoleCode(
    cached.profiloCod ?? cached.profilo_cod ?? cached.ruoloCod ?? cached.ruolo_cod ?? cached.ruoloLabel,
    cached.ruolo
  ) || (cached.isAdmin ? 'ADMIN' : '')
  const ruoloCod =
    baseRuoloCod === 'RI_AMM' || (areaCod === 'AMM' && baseRuoloCod === 'RI') ? 'RI_AMM' :
    baseRuoloCod === 'TI_AMM' || (areaCod === 'AMM' && baseRuoloCod === 'TI') ? 'TI_AMM' :
    baseRuoloCod
  const settoreCod = normalizeSettoreCode(cached.settoreCod ?? cached.settore_cod ?? cached.settoreLabel, cached.settore)

  return {
    username: String(cached.username),
    fullName: String(cached.fullName || cached.full_name || cached.username),
    ruoloLabel: ruoloCod,
    ruoloCod,
    areaCod,
    settoreCod,
    isAdmin: ruoloCod === 'ADMIN' || !!cached.isAdmin
  }
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
      if ((pg as any).name === tok) return pageId
      if (hist && (hist as any)[pageId] === tok) return pageId
      if ((pg as any).label === tok || (pg as any).title === tok) return pageId
    }
  } catch { /* ignore */ }

  // 3) Fallback: non risolto
  return null
}

/** Legge le pagine dell'app (runtime) in forma semplice e ordinata */
function listVisiblePages(): Array<{ pageId: string; label: string; token: string; order: number }> {
  try {
    const state: any = getAppStore()?.getState?.()
    const appConfig: any = state?.appConfig
    if (!appConfig) return []

    const rawPages: any = appConfig?.pages ?? {}
    const pagesMap: Record<string, any> =
      rawPages?.asMutable ? rawPages.asMutable({ deep: true }) :
      rawPages?.toJS ? rawPages.toJS() :
      rawPages

    const pageOrder: string[] =
      Array.isArray(appConfig?.pageOrder) ? appConfig.pageOrder :
      Array.isArray(appConfig?.pagesOrder) ? appConfig.pagesOrder :
      Array.isArray(appConfig?.pageNavOrder) ? appConfig.pageNavOrder :
      []

    const entries = Object.entries(pagesMap || {})
      .filter(([, pg]: any) => (pg as any)?.isVisible !== false)
      .map(([pageId, pg]: [string, any]) => {
        const label = String(pg?.label || pg?.title || pg?.name || pageId)
        const token = String(pg?.name || appConfig?.historyLabels?.page?.[pageId] || pageId)
        const order = pageOrder.length ? Math.max(0, pageOrder.indexOf(pageId)) : 9999
        return { pageId, label, token, order }
      })

    // Se non abbiamo un ordinamento esplicito, ordiniamo per etichetta.
    const hasExplicitOrder = entries.some(e => e.order !== 9999)
    return (hasExplicitOrder
      ? entries.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'it'))
      : entries.sort((a, b) => a.label.localeCompare(b.label, 'it'))
    ).map((e, i) => ({ ...e, order: hasExplicitOrder ? e.order : i }))
  } catch {
    return []
  }
}

/** Autogenera cards per le pagine presenti nell'app (se mancanti in config) */
function mergeCardsWithPages(existing: CardConfig[], excludedPageIds: string[]): CardConfig[] {
  const pages = listVisiblePages()
  if (!pages.length) return existing

  const excluded = new Set((excludedPageIds || []).map(s => String(s)))
  const covered = new Set<string>()

  for (const c of existing || []) {
    const pid = resolvePageId(c.hashPage)
    if (pid) covered.add(pid)
  }

  const maxOrder = Math.max(0, ...((existing || []).map(c => Number(c.order) || 0)))
  const toAdd: CardConfig[] = []

  let addN = 0
  pages.forEach((pg) => {
    if (!pg?.pageId) return
    if (excluded.has(pg.pageId)) return
    if (covered.has(pg.pageId)) return

    const pal = AUTO_CARD_PALETTE[hashToIndex(pg.pageId, AUTO_CARD_PALETTE.length)]
    const bg = pal.bg
    const accent = pal.accent

    toAdd.push({
      id: `card_page_${pg.pageId}`,
      visible: true,
      order: maxOrder + 1 + addN,
      label: pg.label,
      desc: `Apri la pagina “${pg.label}”`,
      hashPage: pg.token,
      colorBg: bg,
      colorAccent: accent,
      // coerente con le card di default (sfondo scuro uniforme)
      colorBgRest: '#192e4d',
      colorBgHover: '',
      roles: ['*'],
      icon: inferCardIcon({ id: `card_page_${pg.pageId}`, label: pg.label, hashPage: pg.token })
    })

    addN++
  })

  return toAdd.length ? [...existing, ...toAdd] : existing
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
  const icon = CARD_ICONS[inferCardIcon(card)] || DEFAULT_ICON
  const baseBg = (card.colorBg && String(card.colorBg).trim()) ? String(card.colorBg).trim() : '#1d4ed8'
  const hoverBg = (card.colorBgHover && String(card.colorBgHover).trim())
    ? card.colorBgHover
    : `linear-gradient(135deg,${baseBg}ee 0%,${baseBg}cc 100%)`
  const restBg = (card.colorBgRest && String(card.colorBgRest).trim())
    ? card.colorBgRest
    : 'rgba(255,255,255,0.05)'
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => {
        const v = (card.hashPage || '').trim()
        if (!v) return
        try { sessionStorage.setItem('GII_FROM_HOME', '1') } catch { /* ignore */ }
        gotoPage(v)
      }}
      style={{ cursor:'pointer', borderRadius:cfg.cardBorderRadius,
        border:`1.5px solid ${hov ? card.colorAccent : 'rgba(255,255,255,0.10)'}`,
        background: hov ? hoverBg : restBg,
        backdropFilter:'blur(12px)', padding:cfg.cardPadding,
        transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hov ? `0 20px 40px rgba(0,0,0,0.3),0 0 0 1px ${card.colorAccent}44` : '0 4px 16px rgba(0,0,0,0.15)',
        animationDelay:`${p.idx*80}ms`, animationName:'fadeInUp',
        animationDuration:'0.5s', animationFillMode:'both', animationTimingFunction:'cubic-bezier(0.4,0,0.2,1)' }}>
      <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:16 }}>
        <div style={{ width:48,height:48,flex:'0 0 48px',borderRadius:12, background:hov?`${card.colorAccent}33`:'rgba(255,255,255,0.08)', display:'flex',alignItems:'center',justifyContent:'center', transition:'background 0.25s', color:hov?card.colorAccent:'rgba(255,255,255,0.7)' }}>
          <div style={{ width:24,height:24 }} dangerouslySetInnerHTML={{ __html: icon }} />
        </div>
        <div style={{ fontFamily:cfg.cardLabelFont,fontSize:cfg.cardLabelSize,fontWeight:cfg.cardLabelWeight, color:hov?'#fff':'rgba(255,255,255,0.90)',transition:'color 0.2s' }}>{card.label}</div>
      </div>
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
  const excludedPageIds: string[] = Array.isArray(cfg.excludedPageIds) ? cfg.excludedPageIds.map((s: any) => String(s)) : []

  // AppConfig (serve a triggerare re-render quando cambiano le pagine/visibilità in Builder)
  const appConfig = ReactRedux.useSelector((state: IMState) => {
    const s: any = state as any
    return s?.appStateInBuilder?.appConfig ?? s?.appConfig
  })

  // Set di pageId attualmente visibili: se una card punta a una pagina non visibile, la card NON viene mostrata in homepage.
  const visiblePageIdSet = React.useMemo(() => {
    const pages = listVisiblePages()
    return new Set(pages.map(p => p.pageId))
  }, [appConfig])

  // Cards effettive: quelle configurate + quelle autogenerate dalle pagine mancanti.
  const effCards: CardConfig[] = mergeCardsWithPages(rawCards, excludedPageIds)

  const oClock: GroupOffset = cfg.offsetClock || { x:0, y:0 }
  const oCards: GroupOffset = cfg.offsetCards || { x:0, y:0 }

  const [user,  setUser]  = React.useState<UserInfo | null>(null)
  const [uLoad, setULoad] = React.useState(true)

  const [now, setNow] = React.useState(new Date())

  const fmtDate = (d: Date) => d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtTime = (d: Date) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  React.useEffect(() => {
    if (!cfg.showClock) return
    const t = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(t)
  }, [cfg.showClock])

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
      }).catch(() => {
        if (cancelled) return
        setUser(null)
        setULoad(false)
      })
    }

    apply()
    window.addEventListener('gii:userLoaded', apply)
    return () => {
      cancelled = true
      window.removeEventListener('gii:userLoaded', apply)
    }
  }, [])


  const isVisible = (c: CardConfig) => {
    if (!c.visible) return false

    // Se la card punta a una pagina non visibile (isVisible=false), la card non deve comparire in homepage.
    // Però la card resta in config/Setting (così, se la pagina torna visibile, la card riappare).
    const tok = String(c.hashPage || '').trim()
    if (tok) {
      const pid = resolvePageId(tok)
      if (!pid) return false
      if (!visiblePageIdSet.has(pid)) return false
    }

    if (c.roles.includes('*')) return true
    if (!user) return false
    if (user.isAdmin) return true

    const effectiveRole =
      user.ruoloCod === 'RI_AMM' || (user.areaCod === 'AMM' && user.ruoloCod === 'RI') ? 'RI_AMM' :
      user.ruoloCod === 'TI_AMM' || (user.areaCod === 'AMM' && user.ruoloCod === 'TI') ? 'TI_AMM' :
      user.ruoloCod

    // RI_AMM e TI_AMM sono profili distinti dai rispettivi RI/TI tecnici.
    // Una card assegnata solo a TI non deve comparire anche per TI_AMM, e viceversa.
    return c.roles.some(role => role === effectiveRole)
  }

  const visibleCards = effCards.slice().sort((a,b) => a.order - b.order).filter(isVisible)

  return (
    <div style={{ width:'100%',height:'100%',minHeight:500,
      background:`linear-gradient(${cfg.bgGradAngle}deg,${cfg.bgGradStart} 0%,${cfg.bgGradMid} 40%,${cfg.bgGradEnd} 100%)`,
      position:'relative',overflow:'hidden',fontFamily:"'Source Sans 3','Segoe UI',sans-serif",boxSizing:'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');
        @keyframes fadeInUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
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

        {/* ── Sezione + Cards (banner rimosso) ── */}
        <div style={{ flex:1,display:'flex',flexDirection:'column', ...off(oCards) }}>

          {/* Orologio + data */}
          {cfg.showClock && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: 10, flexShrink:0, ...off(oClock) }}>
              <div style={{ textAlign:'right' as const }}>
                <div style={{ fontSize:cfg.clockSize, fontWeight:300, color:cfg.clockColor, letterSpacing:-0.5, fontFamily:cfg.cardLabelFont }}>
                  {fmtTime(now)}
                </div>
                <div style={{ fontSize:cfg.dateSize, color:cfg.dateColor, marginTop:1, textTransform:'capitalize' as const }}>
                  {fmtDate(now)}
                </div>
              </div>
            </div>
          )}

          <div style={{ fontSize:cfg.sectionLabelSize,fontWeight:700,letterSpacing:cfg.sectionLabelSpacing,
            textTransform:'uppercase' as const,color:cfg.sectionLabelColor,marginBottom:14,flexShrink:0,
            animationName:'fadeIn',animationDuration:'0.5s',animationDelay:'0.1s',animationFillMode:'both' }}>
            {cfg.sectionLabelText}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(${cfg.cardMinWidth}px,1fr))`,gap:cfg.cardsGap,flex:1,alignContent:'start' }}>
            {uLoad
              ? effCards.filter(c=>c.visible).map((_,i)=>(
                  <div key={i} style={{ borderRadius:cfg.cardBorderRadius, border:'1px solid rgba(255,255,255,0.07)',
                    background:'rgba(255,255,255,0.03)', padding:cfg.cardPadding,
                    animationDelay:`${i*80}ms`, animationName:'fadeInUp',
                    animationDuration:'0.5s', animationFillMode:'both' }}>
                    <div style={{ width:48,height:48,borderRadius:12,background:'rgba(255,255,255,0.06)',
                      marginBottom:16,
                      backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.04) 50%,rgba(255,255,255,0) 100%)',
                      backgroundSize:'400px 100%',
                      animationName:'shimmer',animationDuration:'1.6s',animationIterationCount:'infinite',animationTimingFunction:'linear' }}/>
                    <div style={{ height:18,width:'60%',borderRadius:6,background:'rgba(255,255,255,0.06)',
                      marginBottom:10,
                      backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.04) 50%,rgba(255,255,255,0) 100%)',
                      backgroundSize:'400px 100%',
                      animationName:'shimmer',animationDuration:'1.6s',animationIterationCount:'infinite',animationTimingFunction:'linear',
                      animationDelay:`${i*80+200}ms` }}/>
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
          <div style={{ marginTop:20,flexShrink:0,display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.05)',animationName:'fadeIn',animationDuration:'0.5s',animationDelay:'0.2s',animationFillMode:'both' }}>
            <div style={{ fontSize:cfg.footerSize,color:cfg.footerColor }}>{String(cfg.footerLeft || '').replace('{year}',String(now.getFullYear()))}</div>
            <div style={{ fontSize:cfg.footerSize,color:cfg.footerColor }}>{cfg.footerRight}</div>
          </div>
        )}
      </div>
    </div>
  )
}

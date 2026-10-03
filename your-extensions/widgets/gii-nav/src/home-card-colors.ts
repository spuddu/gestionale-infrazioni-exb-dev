import type { NavItem } from './config'

type HomeCardLike = {
  id?: string
  visible?: boolean
  order?: number
  label?: string
  desc?: string
  hashPage?: string
  colorBg?: string
  colorAccent?: string
  colorBgRest?: string
  colorBgHover?: string
  colorBgSelected?: string
  colorAccentSelected?: string
  roles?: string[]
  icon?: string
}

type HomeWidgetConfigLike = {
  cards: HomeCardLike[]
  excludedPageIds: string[]
  cardRestBg: string
}

function toPlain<T = any>(value: any): T {
  if (value?.asMutable) return value.asMutable({ deep: true }) as T
  if (value?.toJS) return value.toJS() as T
  return value as T
}

function getPagesMap(appConfig: any): Record<string, any> {
  return toPlain<Record<string, any>>(appConfig?.pages ?? {}) || {}
}

export function resolvePageIdFromAppConfig(appConfig: any, pageTokenRaw: string): string | null {
  const tok0 = String(pageTokenRaw || '').trim()
  if (!tok0) return null

  let tok = tok0.replace(/^#+\/?/, '').replace(/^\/+/, '')
  if (tok.startsWith('page/')) tok = tok.slice(5)

  try {
    const pagesMap = getPagesMap(appConfig)
    if (pagesMap[tok]) return tok

    const hist = toPlain<Record<string, string>>(appConfig?.historyLabels?.page || {}) || {}
    for (const [pageId, pg] of Object.entries(pagesMap)) {
      if (!pg) continue
      if (String((pg as any).name || '') === tok) return pageId
      if (String(hist[pageId] || '') === tok) return pageId
      if (String((pg as any).label || '') === tok || String((pg as any).title || '') === tok) return pageId
    }
  } catch { /* fallback sotto */ }

  return null
}

function normalizeLabel(value: any): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeSemanticId(value: any): string {
  return String(value || '')
    .toLowerCase()
    .replace(/^card_page_/, '')
    .replace(/^card_/, '')
    .replace(/^nav_/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function getHomeWidgetConfigFromAppConfig(appConfig: any): HomeWidgetConfigLike | null {
  try {
    const widgetsMap = toPlain<Record<string, any>>(appConfig?.widgets ?? {}) || {}
    for (const widget of Object.values(widgetsMap)) {
      const w: any = toPlain(widget)
      const uri = String(w?.uri || '').replace(/\/+$/, '')
      if (!uri.endsWith('/gii-homepage')) continue

      const cfg: any = toPlain(w?.config || {})
      const cards = toPlain<HomeCardLike[]>(cfg?.cards || [])
      const excluded = toPlain<string[]>(cfg?.excludedPageIds || [])
      return {
        cards: Array.isArray(cards) ? cards.map(c => ({ ...c })) : [],
        excludedPageIds: Array.isArray(excluded) ? excluded.map(v => String(v)) : [],
        cardRestBg: String(cfg?.cardRestBg || '').trim()
      }
    }
  } catch { /* nessuna configurazione Home leggibile */ }
  return null
}

function listVisiblePagesFromAppConfig(appConfig: any): Array<{ pageId: string; label: string; token: string; order: number }> {
  try {
    const pagesMap = getPagesMap(appConfig)
    const pageOrder: string[] =
      Array.isArray(appConfig?.pageOrder) ? appConfig.pageOrder :
      Array.isArray(appConfig?.pagesOrder) ? appConfig.pagesOrder :
      Array.isArray(appConfig?.pageNavOrder) ? appConfig.pageNavOrder :
      []
    const hist = toPlain<Record<string, string>>(appConfig?.historyLabels?.page || {}) || {}

    const entries = Object.entries(pagesMap || {})
      .filter(([, pg]: any) => pg?.isVisible !== false)
      .map(([pageId, pg]: [string, any]) => {
        const label = String(pg?.label || pg?.title || pg?.name || pageId)
        const token = String(pg?.name || hist?.[pageId] || pageId)
        const order = pageOrder.length ? pageOrder.indexOf(pageId) : -1
        return { pageId, label, token, order: order >= 0 ? order : 9999 }
      })

    const hasExplicitOrder = entries.some(e => e.order !== 9999)
    return (hasExplicitOrder
      ? entries.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'it'))
      : entries.sort((a, b) => a.label.localeCompare(b.label, 'it'))
    ).map((e, i) => ({ ...e, order: hasExplicitOrder ? e.order : i }))
  } catch {
    return []
  }
}

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

function inferCardIcon(card: Pick<HomeCardLike, 'id' | 'label' | 'hashPage'>): string {
  const text = `${card?.id || ''} ${card?.label || ''} ${card?.hashPage || ''}`.toLowerCase()
  if (/regolamento/.test(text)) return 'regolamento'
  if (/home/.test(text)) return 'home'
  if (/elenco|pratiche/.test(text)) return 'elenco'
  if (/mappa|cartogr/.test(text)) return 'mappa'
  if (/dashboard/.test(text)) return 'dashboard'
  if (/report/.test(text)) return 'report'
  if (/utent|rubrica/.test(text)) return 'utenti'
  if (/prezz|parametr/.test(text)) return 'prezzari'
  if (/ricerc/.test(text)) return 'ricerca'
  if (/document|atto|verbale/.test(text)) return 'documenti'
  if (/nuov|rilevaz|crea/.test(text)) return 'nuova'
  return 'nuova'
}

/**
 * Restituisce le stesse card effettive che la Home è in grado di costruire:
 * card salvate nel Setting + eventuali pagine visibili non ancora materializzate.
 */
export function getEffectiveHomeCardsFromAppConfig(appConfig: any): HomeCardLike[] {
  const homeCfg = getHomeWidgetConfigFromAppConfig(appConfig)
  if (!homeCfg) return []

  const existing = homeCfg.cards.map(c => ({ ...c }))
  const pages = listVisiblePagesFromAppConfig(appConfig)
  if (!pages.length) return existing

  const excluded = new Set((homeCfg.excludedPageIds || []).map(String))
  const covered = new Set<string>()
  for (const c of existing) {
    const pid = resolvePageIdFromAppConfig(appConfig, String(c.hashPage || ''))
    if (pid) covered.add(pid)
  }

  const maxOrder = Math.max(0, ...existing.map(c => Number(c.order) || 0))
  const toAdd: HomeCardLike[] = []
  let addN = 0

  pages.forEach(pg => {
    if (!pg?.pageId || excluded.has(pg.pageId) || covered.has(pg.pageId)) return
    const pal = AUTO_CARD_PALETTE[hashToIndex(pg.pageId, AUTO_CARD_PALETTE.length)]
    toAdd.push({
      id: `card_page_${pg.pageId}`,
      visible: true,
      order: maxOrder + 1 + addN++,
      label: pg.label,
      desc: `Apri la pagina “${pg.label}”`,
      hashPage: pg.token,
      colorBg: pal.bg,
      colorAccent: pal.accent,
      colorBgRest: '#192e4d',
      colorBgHover: '',
      colorBgSelected: '',
      colorAccentSelected: '',
      roles: ['*'],
      icon: inferCardIcon({ id: `card_page_${pg.pageId}`, label: pg.label, hashPage: pg.token })
    })
  })

  return [...existing, ...toAdd]
}

export function getHomeCardsFromAppConfig(appConfig: any): HomeCardLike[] {
  return getEffectiveHomeCardsFromAppConfig(appConfig)
}

function getHomeCardRestBgFromAppConfig(appConfig: any): string {
  return getHomeWidgetConfigFromAppConfig(appConfig)?.cardRestBg || ''
}

export function findHomeCardForNavItem(item: NavItem, appConfig: any): HomeCardLike | null {
  const cards = getEffectiveHomeCardsFromAppConfig(appConfig)
  if (!cards.length) return null

  const itemPageId = resolvePageIdFromAppConfig(appConfig, item.hashPage)
  const itemLabel = normalizeLabel(item.label)
  const itemSemanticId = normalizeSemanticId(item.id)

  const samePage = itemPageId
    ? cards.filter(card => resolvePageIdFromAppConfig(appConfig, String(card.hashPage || '')) === itemPageId)
    : []

  if (samePage.length) {
    const byLabel = samePage.find(card => normalizeLabel(card.label) === itemLabel)
    if (byLabel) return byLabel

    const byId = samePage.find(card => normalizeSemanticId(card.id) === itemSemanticId)
    if (byId) return byId

    if (samePage.length === 1) return samePage[0]
  }

  const sameLabel = cards.filter(card => normalizeLabel(card.label) === itemLabel)
  if (sameLabel.length === 1) return sameLabel[0]

  return null
}

export function applyHomeCardColors(item: NavItem, appConfig: any): NavItem {
  const card = findHomeCardForNavItem(item, appConfig)
  if (!card) return item

  const colorBg = String(card.colorBg || '').trim() || item.colorBg
  const colorAccent = String(card.colorAccent || '').trim() || item.colorAccent
  const colorBgRest = getHomeCardRestBgFromAppConfig(appConfig) || item.colorBgRest
  const colorBgHover = colorBg
  const colorBgSelected = String(card.colorBgSelected || '').trim()
  const colorAccentSelected = String(card.colorAccentSelected || '').trim()

  return {
    ...item,
    colorBg,
    colorAccent,
    colorBgRest,
    colorBgHover,
    colorBgSelected,
    colorAccentSelected
  }
}

function isHomeCard(card: HomeCardLike, appConfig: any): boolean {
  const pid = resolvePageIdFromAppConfig(appConfig, String(card.hashPage || ''))
  const pages = getPagesMap(appConfig)
  if (pid) {
    const pg: any = pages?.[pid]
    const label = normalizeLabel(pg?.label || pg?.title || pg?.name || '')
    if (label === 'home') return true
  }
  return normalizeLabel(card.label) === 'home' || /(^|_)home($|_)/.test(normalizeSemanticId(card.id))
}

/**
 * Costruisce il menu a partire dalla Home.
 * - Le card visibili diventano voci del nav.
 * - La card Home è l'unica eccezione: resta nel nav anche se è nascosta nella Home.
 * - Pagine ExB non visibili non vengono esposte.
 * - Il colore di riposo globale della Home viene applicato a tutte le voci.
 */
export function buildNavItemsFromHome(appConfig: any): NavItem[] {
  const homeCfg = getHomeWidgetConfigFromAppConfig(appConfig)
  if (!homeCfg) return []

  const visiblePageIds = new Set(listVisiblePagesFromAppConfig(appConfig).map(p => p.pageId))
  const cards = getEffectiveHomeCardsFromAppConfig(appConfig)
  const restBg = homeCfg.cardRestBg || 'rgba(255,255,255,0.05)'

  const items: NavItem[] = []
  for (const card of cards) {
    const home = isHomeCard(card, appConfig)
    if (card.visible === false && !home) continue

    const hashPage = String(card.hashPage || '').trim()
    const pageId = resolvePageIdFromAppConfig(appConfig, hashPage)
    if (!pageId) continue
    if (!visiblePageIds.has(pageId) && !home) continue

    const colorBg = String(card.colorBg || '').trim() || '#1e3a5f'
    const colorAccent = String(card.colorAccent || '').trim() || '#60a5fa'
    const colorBgSelected = String(card.colorBgSelected || '').trim()
    const colorAccentSelected = String(card.colorAccentSelected || '').trim()
    const roles = Array.isArray(card.roles) && card.roles.length ? card.roles.map(String) : ['*']

    items.push({
      id: `nav_homecard_${String(card.id || pageId)}`,
      visible: true,
      // Home è sempre la prima voce del menu; il suo order nella Home è irrilevante
      // perché la card è volutamente nascosta nella pagina Home.
      order: home ? -100000 : (Number(card.order) || 0),
      label: String(card.label || '').trim() || String((getPagesMap(appConfig)?.[pageId] as any)?.label || pageId),
      hashPage,
      colorBg,
      colorAccent,
      colorBgRest: restBg,
      colorBgHover: colorBg,
      colorBgSelected,
      colorAccentSelected,
      roles,
      icon: String(card.icon || '').trim() || inferCardIcon(card)
    })
  }

  return items.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'it'))
}

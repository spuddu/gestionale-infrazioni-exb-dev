import type { NavItem } from './config'

type HomeCardLike = {
  id?: string
  label?: string
  hashPage?: string
  colorBg?: string
  colorAccent?: string
  colorBgRest?: string
  colorBgHover?: string
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
      if (String(pg.name || '') === tok) return pageId
      if (String(hist[pageId] || '') === tok) return pageId
      if (String(pg.label || '') === tok || String(pg.title || '') === tok) return pageId
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

export function getHomeCardsFromAppConfig(appConfig: any): HomeCardLike[] {
  try {
    const widgetsMap = toPlain<Record<string, any>>(appConfig?.widgets ?? {}) || {}
    for (const widget of Object.values(widgetsMap)) {
      const w: any = toPlain(widget)
      const uri = String(w?.uri || '').replace(/\/+$/, '')
      if (!uri.endsWith('/gii-homepage')) continue

      const cfg: any = toPlain(w?.config || {})
      const cards = toPlain<HomeCardLike[]>(cfg?.cards || [])
      if (Array.isArray(cards)) return cards.map(c => ({ ...c }))
    }
  } catch { /* nessuna card Home leggibile */ }

  return []
}

function getHomeCardRestBgFromAppConfig(appConfig: any): string {
  try {
    const widgetsMap = toPlain<Record<string, any>>(appConfig?.widgets ?? {}) || {}
    for (const widget of Object.values(widgetsMap)) {
      const w: any = toPlain(widget)
      const uri = String(w?.uri || '').replace(/\/+$/, '')
      if (!uri.endsWith('/gii-homepage')) continue
      const cfg: any = toPlain(w?.config || {})
      return String(cfg?.cardRestBg || '').trim()
    }
  } catch { /* nessuna configurazione Home leggibile */ }
  return ''
}

export function findHomeCardForNavItem(item: NavItem, appConfig: any): HomeCardLike | null {
  const cards = getHomeCardsFromAppConfig(appConfig)
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
  // L'hover della Home ora coincide con colorBg e ne conserva l'eventuale alfa.
  const colorBgHover = colorBg

  return {
    ...item,
    colorBg,
    colorAccent,
    colorBgRest,
    colorBgHover
  }
}

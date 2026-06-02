/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, SessionManager, UrlManager, getAppStore } from 'jimu-core'
import type { IMConfig, NavItem } from '../config'
import { defaultConfig } from '../config'

const GII_PORTAL = 'https://cbsm-hub.maps.arcgis.com'
const RUOLO_LABEL: Record<number, string> = { 1:'TR', 2:'TI', 3:'RZ', 4:'RI', 5:'DT', 6:'DA', 7:'ADMIN' }
const RUOLO_FULL: Record<string, string> = {
  TR:'Tecnico Rilevatore', TI:'Tecnico Istruttore', RZ:'Responsabile di Zona',
  RI:'Responsabile Istruttoria', RI_AMM:'Responsabile Istruttoria Amministrativo',
  TI_AMM:'Tecnico Istruttore Amministrativo', DT:'Direttore Tecnico', DA:'Direttore Amministrativo', ADMIN:'Amministratore'
}
const AREA_LABEL: Record<number, string> = { 1:'AMM', 2:'AGR', 3:'TEC' }
const SETTORE_LABEL: Record<number, string> = { 1:'CR', 2:'GI', 3:'D1', 4:'D2', 5:'D3', 6:'D4', 7:'D5', 8:'D6', 9:'DS' }
const RUOLI_VALIDI = new Set(['TR', 'TI', 'RZ', 'RI', 'RI_AMM', 'TI_AMM', 'DT', 'DA', 'ADMIN'])
const AREE_VALIDE = new Set(['AMM', 'AGR', 'TEC'])
const SETTORI_VALIDI = new Set(['CR', 'GI', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'DS'])

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

function normalizeSectorCode(value: any, numericFallback: any): string {
  const directRaw = normCode(value)
  const direct = directRaw === 'CS' ? 'DS' : directRaw
  if (SETTORI_VALIDI.has(direct)) return direct

  const legacy = numericFallback != null && numericFallback !== '' ? Number(numericFallback) : NaN
  if (Number.isFinite(legacy) && SETTORE_LABEL[legacy]) return SETTORE_LABEL[legacy]

  return ''
}

function isSignedIn(): boolean {
  try {
    const sm = SessionManager.getInstance()
    const session: any = sm?.getMainSession?.() || sm?.getSessionByUrl?.(GII_PORTAL)
    const u = session?.username || session?.userId || ''
    return !!u
  } catch {
    return false
  }
}

interface UserInfo {
  username: string
  fullName: string
  ruoloLabel: string
  ruoloFull: string
  area: string
  settore: string
  isAdmin: boolean
}

async function loadUser(): Promise<UserInfo | null> {
  const cached: any = (window as any).__giiUserRole
  if (cached?.username) {
    const area = normalizeAreaCode(cached.areaCod ?? cached.area_cod ?? cached.areaLabel, cached.area)
    const baseRuoloLabel = normalizeRoleCode(
      cached.profiloCod ?? cached.profilo_cod ?? cached.ruoloCod ?? cached.ruolo_cod ?? cached.ruoloLabel,
      cached.ruolo,
      cached.isAdmin
    )
    const ruoloLabel = baseRuoloLabel === 'TI' && area === 'AMM'
      ? 'TI_AMM'
      : baseRuoloLabel === 'RI' && area === 'AMM'
        ? 'RI_AMM'
        : baseRuoloLabel
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

function resolvePageId(pageTokenRaw: string): string | null {
  const tok0 = (pageTokenRaw || '').trim()
  if (!tok0) return null

  let tok = tok0.replace(/^#+\/?/, '').replace(/^\/+/, '')
  if (tok.startsWith('page/')) tok = tok.slice(5)

  try {
    const state: any = getAppStore()?.getState?.()
    const appConfig: any = state?.appConfig
    const rawPages: any = appConfig?.pages ?? {}
    const pagesMap: Record<string, any> =
      rawPages?.asMutable ? rawPages.asMutable({ deep: true }) :
      rawPages?.toJS ? rawPages.toJS() :
      rawPages

    if (pagesMap && pagesMap[tok]) return tok

    const hist = appConfig?.historyLabels?.page || {}
    for (const [pageId, pg] of Object.entries(pagesMap || {})) {
      if (!pg) continue
      if ((pg as any).name === tok) return pageId
      if (hist && hist[pageId] === tok) return pageId
      if ((pg as any).label === tok || (pg as any).title === tok) return pageId
    }
  } catch {
    // ignore
  }

  return null
}




function normalizeSectionId (raw: any): string {
  return String(raw || '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
}

function readCurrentSection (): string {
  try {
    const fromStorage = String(
      window.sessionStorage.getItem('GII_EDIT_TAB') ||
      window.sessionStorage.getItem('GII_REQUESTED_EDIT_SECTION') ||
      window.sessionStorage.getItem('GII_NAV_SECTION') ||
      ''
    ).trim()
    if (fromStorage) return normalizeSectionId(fromStorage)
  } catch {
    // ignore
  }
  try {
    const url = new URL(window.location.href)
    return normalizeSectionId(url.searchParams.get('section') || url.searchParams.get('giiSection') || '')
  } catch {
    return ''
  }
}

type SectionCounts = Record<string, number>
type SectionBadgeDetails = Record<string, { total: number; done: number; warning?: number }>

function readSectionCounts (): SectionCounts {
  try {
    const raw = (window as any).__giiEditSectionCounts || {}
    const out: SectionCounts = {}
    Object.entries(raw).forEach(([key, value]) => {
      const k = normalizeSectionId(key)
      const n = Number(value)
      if (k && Number.isFinite(n) && n > 0) out[k] = Math.trunc(n)
    })
    return out
  } catch {
    return {}
  }
}

function readSectionBadgeDetails (): SectionBadgeDetails {
  try {
    const raw = (window as any).__giiEditSectionBadgeDetails || {}
    const out: SectionBadgeDetails = {}
    Object.entries(raw).forEach(([key, value]: [string, any]) => {
      const k = normalizeSectionId(key)
      const total = Math.max(0, Math.trunc(Number(value?.total || 0)))
      const done = Math.max(0, Math.trunc(Number(value?.done || 0)))
      const warning = Math.max(0, Math.trunc(Number(value?.warning || value?.warn || value?.alert || 0)))
      if (k && (total > 0 || warning > 0)) out[k] = { total, done: Math.min(done, total), warning }
    })
    return out
  } catch {
    return {}
  }
}

function applyOptionalSectionToUrl (section?: string): void {
  try {
    const url = new URL(window.location.href)
    if (section && String(section).trim()) {
      url.searchParams.set('section', String(section).trim())
    } else {
      url.searchParams.delete('section')
      url.searchParams.delete('giiSection')
    }
    window.history.replaceState(window.history.state, '', url.toString())
  } catch {
    // ignore
  }
}

function persistAndBroadcastSection(section?: string): void {
  try {
    const normalized = String(section || '').trim()
    if (normalized) {
      window.sessionStorage.setItem('GII_NAV_SECTION', normalized)
    } else {
      window.sessionStorage.removeItem('GII_NAV_SECTION')
    }
    window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section: normalized || '' } }))
  } catch {
    // ignore
  }
}

function getCurrentPageId (): string | null {
  try {
    const state: any = getAppStore()?.getState?.()
    return String(state?.appRuntimeInfo?.currentPageId || '').trim() || null
  } catch {
    return null
  }
}

function getCurrentSectionViewId (sectionId: string): string | null {
  if (!sectionId) return null
  try {
    const state: any = getAppStore()?.getState?.()
    const navInfos = state?.appRuntimeInfo?.sectionNavInfos
    if (navInfos) {
      const raw = navInfos.asMutable ? navInfos.asMutable({ deep: true }) : navInfos
      if (raw[sectionId]?.currentViewId) return raw[sectionId].currentViewId
    }
    const sections = state?.appConfig?.sections
    const sec = sections?.asMutable ? sections.asMutable({ deep: true }) : sections
    const s = sec?.[sectionId]
    if (s?.views?.length > 0) return s.views[0]
  } catch {}
  return null
}

function switchSectionView (sectionId: string, viewId: string): void {
  if (!sectionId || !viewId) return
  try {
    getAppStore().dispatch({
      type: 'SECTION_NAV_INFO_CHANGED',
      sectionId,
      navInfo: { currentViewId: viewId, previousViewId: getCurrentSectionViewId(sectionId) || '', progress: 1 }
    })
  } catch {}
}

function setSidebarCollapse (sidebarWidgetId: string, collapse: boolean): void {
  if (!sidebarWidgetId) return
  try {
    getAppStore().dispatch({
      type: 'WIDGET_STATE_PROP_CHANGE',
      widgetId: sidebarWidgetId,
      propKey: 'collapse',
      value: collapse
    })
  } catch {}
}


function toPlainObject<T = any> (value: any): T {
  try {
    if (value?.asMutable) return value.asMutable({ deep: true }) as T
    if (value?.toJS) return value.toJS() as T
  } catch {}
  return value as T
}

function getRuntimeAppConfig (): any {
  try {
    const state: any = getAppStore()?.getState?.()
    return state?.appConfig || state?.appStateInBuilder?.appConfig || null
  } catch {
    return null
  }
}

function getAppConfigWidget (widgetId: string): any {
  if (!widgetId) return null
  try {
    const appConfig: any = getRuntimeAppConfig()
    const widgets = toPlainObject<Record<string, any>>(appConfig?.widgets || {})
    return widgets?.[widgetId] || null
  } catch {
    return null
  }
}

function getAppConfigLayout (layoutId: string): any {
  if (!layoutId) return null
  try {
    const appConfig: any = getRuntimeAppConfig()
    const layouts = toPlainObject<Record<string, any>>(appConfig?.layouts || {})
    return layouts?.[layoutId] || null
  } catch {
    return null
  }
}

function getWidgetRootElement (widgetId: string): HTMLElement | null {
  if (!widgetId || typeof document === 'undefined') return null
  const safeId = (() => {
    try { return (window as any).CSS?.escape ? (window as any).CSS.escape(widgetId) : widgetId } catch { return widgetId }
  })()
  const selectors = [
    `#${safeId}`,
    `[id="${widgetId}"]`,
    `[data-widgetid="${widgetId}"]`,
    `[data-widget-id="${widgetId}"]`,
    `[widgetid="${widgetId}"]`,
    `[id$="${widgetId}"]`,
    `[id*="${widgetId}"]`
  ]
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel) as HTMLElement | null
      if (el) return el
    } catch {}
  }
  return null
}

function getLayoutIdForSize (layouts: any): string {
  const normalized = toPlainObject<any>(layouts || {})
  for (const size of ['LARGE', 'MEDIUM', 'SMALL']) {
    const id = normalized?.[size]
    if (id) return String(id)
  }
  const first = Object.values(normalized || {})[0]
  return first ? String(first) : ''
}

function getSidebarPanelWidgetIds (sidebarWidgetId: string): { first: string[], second: string[] } {
  const out = { first: [] as string[], second: [] as string[] }
  const sidebar = getAppConfigWidget(sidebarWidgetId)
  const firstLayoutId = getLayoutIdForSize(sidebar?.layouts?.FIRST)
  const secondLayoutId = getLayoutIdForSize(sidebar?.layouts?.SECOND)
  const readIds = (layoutId: string): string[] => {
    const layout = getAppConfigLayout(layoutId)
    const content = toPlainObject<Record<string, any>>(layout?.content || {})
    const order = Array.isArray(layout?.order) ? layout.order : Object.keys(content || {})
    const ids: string[] = []
    order.forEach((key: string) => {
      const c = content?.[key]
      if (c?.type === 'WIDGET' && c?.widgetId) ids.push(String(c.widgetId))
    })
    return ids
  }
  out.first = readIds(firstLayoutId)
  out.second = readIds(secondLayoutId)
  return out
}

function getVisibleRectForWidgetIds (ids: string[]): DOMRect | null {
  for (const id of ids) {
    const el = getWidgetRootElement(id)
    const rect = el?.getBoundingClientRect?.()
    if (rect && rect.width > 20 && rect.height > 20) return rect
  }
  return null
}

function getSidebarCollapseSide (sidebarWidgetId: string): 'FIRST' | 'SECOND' {
  const side = String(getAppConfigWidget(sidebarWidgetId)?.config?.collapseSide || 'FIRST').toUpperCase()
  return side === 'SECOND' ? 'SECOND' : 'FIRST'
}

function getSidebarDefaultSize (sidebarWidgetId: string): string {
  const cfgSize = getAppConfigWidget(sidebarWidgetId)?.config?.size
  return String(cfgSize || '50%').trim() || '50%'
}

function computeDefaultPanelWidthPx (total: number, defaultSize: string): number | null {
  const def = String(defaultSize || '').trim().toLowerCase()
  if (def.endsWith('%')) {
    const pct = Number(def.replace('%', ''))
    if (Number.isFinite(pct) && pct > 0 && pct < 100) return total * pct / 100
  }
  if (def.endsWith('px')) {
    const px = Number(def.replace('px', ''))
    if (Number.isFinite(px) && px > 0) return px
  }
  const px = Number(def)
  if (Number.isFinite(px) && px > 0) return px
  return null
}

type SidebarMetric = { root: DOMRect, first: DOMRect, second: DOMRect, boundaryX: number, sizedWidth: number }

function readSidebarMetric (sidebarWidgetId: string): SidebarMetric | null {
  const root = getWidgetRootElement(sidebarWidgetId)
  const rootRect = root?.getBoundingClientRect?.()
  if (!rootRect || rootRect.width <= 40 || rootRect.height <= 40) return null

  const panels = getSidebarPanelWidgetIds(sidebarWidgetId)
  const firstRect = getVisibleRectForWidgetIds(panels.first)
  const secondRect = getVisibleRectForWidgetIds(panels.second)
  if (!firstRect || !secondRect) return null

  const leftPanel = firstRect.left <= secondRect.left ? firstRect : secondRect
  const rightPanel = firstRect.left <= secondRect.left ? secondRect : firstRect
  const boundaryX = (leftPanel.right + rightPanel.left) / 2
  const side = getSidebarCollapseSide(sidebarWidgetId)
  const sizedWidth = side === 'SECOND' ? secondRect.width : firstRect.width
  return { root: rootRect, first: firstRect, second: secondRect, boundaryX, sizedWidth }
}

const sidebarBaselineById: Record<string, { rootWidth: number, sizedWidth: number }> = {}

function resetSidebarBaseline (sidebarWidgetId: string): void {
  try { delete sidebarBaselineById[sidebarWidgetId] } catch {}
}

function setSidebarBaselineToCurrent (sidebarWidgetId: string): void {
  const metric = readSidebarMetric(sidebarWidgetId)
  if (!metric) return
  sidebarBaselineById[sidebarWidgetId] = { rootWidth: metric.root.width, sizedWidth: metric.sizedWidth }
}

function isSidebarSizeChangedFromBaseline (sidebarWidgetId: string): boolean {
  if (!sidebarWidgetId) return false
  const metric = readSidebarMetric(sidebarWidgetId)
  if (!metric) return false
  const baseline = sidebarBaselineById[sidebarWidgetId]
  if (!baseline || Math.abs(baseline.rootWidth - metric.root.width) > 4) {
    setSidebarBaselineToCurrent(sidebarWidgetId)
    return false
  }
  return Math.abs(metric.sizedWidth - baseline.sizedWidth) > 1
}

function navItemShowsSidebar (item: NavItem | null): boolean {
  if (!item) return false
  // Nel setting del nav l'opzione "Mostra pannello laterale" è salvata su collapseSidebar.
  // Non uso eventuali vecchi campi showSidebar rimasti in config per evitare che il
  // pulsante compaia su schede non abilitate dal setting corrente.
  return (item as any).collapseSidebar === true
}

function isNavItemActive (item: NavItem, cfg: any, currentPageId: string | null, currentSection: string, currentViewId: string | null): boolean {
  const itemPageId = item.hashPage ? resolvePageId(item.hashPage) : null
  const itemSection = normalizeSectionId(item.section)
  const currentSectionNorm = normalizeSectionId(currentSection)
  const sectionId = String(cfg.sectionId || '').trim()
  const itemViewId = String(item.viewId || '').trim()
  if (itemViewId && sectionId) {
    if (currentViewId !== itemViewId) return false
    if (!itemSection) return true
    return itemSection === currentSectionNorm
  }
  if (sectionId && !itemViewId && itemSection) return itemSection === currentSectionNorm
  if (!currentPageId || !itemPageId) return false
  if (currentPageId === itemPageId) return !itemSection || itemSection === currentSectionNorm
  if (itemSection && itemSection === currentSectionNorm && document.querySelector('[data-gii-editing-root]')) return true
  return false
}

function getSidebarResetTargetX (sidebarWidgetId: string): number | null {
  const metric = readSidebarMetric(sidebarWidgetId)
  if (!metric) return null
  const defaultWidth = computeDefaultPanelWidthPx(metric.root.width, getSidebarDefaultSize(sidebarWidgetId))
  if (defaultWidth == null) return null
  const side = getSidebarCollapseSide(sidebarWidgetId)
  return side === 'SECOND'
    ? metric.root.right - defaultWidth
    : metric.root.left + defaultWidth
}

function findResizeHandleAt (sidebarWidgetId: string, x: number, y: number): HTMLElement | null {
  const root = getWidgetRootElement(sidebarWidgetId)
  if (!root) return null
  const xs = [x, x - 2, x + 2, x - 5, x + 5]
  const ys = [y, y - 20, y + 20]
  const candidates: HTMLElement[] = []
  for (const cx of xs) {
    for (const cy of ys) {
      try {
        const el = document.elementFromPoint(cx, cy) as HTMLElement | null
        let cur: HTMLElement | null = el
        while (cur && cur !== document.body) {
          if (root.contains(cur)) candidates.push(cur)
          if (cur === root) break
          cur = cur.parentElement as HTMLElement | null
        }
      } catch {}
    }
  }

  const scored = candidates.map(el => {
    let score = 0
    try {
      const st = window.getComputedStyle(el)
      const cursor = String(st?.cursor || '').toLowerCase()
      if (cursor.includes('resize') || cursor.includes('col-resize') || cursor.includes('ew-resize')) score += 100
      const cls = String((el as any).className || '').toLowerCase()
      const id = String(el.id || '').toLowerCase()
      if (cls.includes('divider') || cls.includes('resize') || cls.includes('splitter') || cls.includes('drag')) score += 40
      if (id.includes('divider') || id.includes('resize') || id.includes('splitter') || id.includes('drag')) score += 40
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.width <= 24 && r.height > 40) score += 25
      score -= Math.abs(((r.left + r.right) / 2) - x)
    } catch {}
    return { el, score }
  }).sort((a, b) => b.score - a.score)

  return scored[0]?.el || root
}

function dispatchMouseLikeEvent (target: EventTarget, type: string, x: number, y: number): void {
  const common: any = { bubbles: true, cancelable: true, clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons: type === 'mouseup' || type === 'pointerup' ? 0 : 1 }
  try {
    if (type.startsWith('pointer') && typeof (window as any).PointerEvent !== 'undefined') {
      target.dispatchEvent(new (window as any).PointerEvent(type, { ...common, pointerId: 1, pointerType: 'mouse', isPrimary: true }))
      return
    }
  } catch {}
  try { target.dispatchEvent(new MouseEvent(type.replace(/^pointer/, 'mouse'), common)) } catch {}
}

function resetSidebarSize (sidebarWidgetId: string): void {
  if (!sidebarWidgetId) return
  const metric = readSidebarMetric(sidebarWidgetId)
  const targetX = getSidebarResetTargetX(sidebarWidgetId)
  if (!metric || targetX == null) return

  const startX = metric.boundaryX
  if (Math.abs(startX - targetX) <= 1) {
    setSidebarBaselineToCurrent(sidebarWidgetId)
    return
  }

  const y = Math.max(metric.root.top + 30, Math.min(metric.root.bottom - 30, metric.root.top + metric.root.height / 2))
  const handle = findResizeHandleAt(sidebarWidgetId, startX, y)
  const moveTarget: EventTarget = document

  try {
    handle?.focus?.()
  } catch {}

  // Uso il ridimensionatore nativo di Experience Builder tramite eventi di drag,
  // senza scrivere width/flex/min/max sui pannelli: così non resta nulla congelato.
  dispatchMouseLikeEvent(handle || document, 'pointerdown', startX, y)
  dispatchMouseLikeEvent(handle || document, 'mousedown', startX, y)
  const steps = 6
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((targetX - startX) * i / steps)
    dispatchMouseLikeEvent(moveTarget, 'pointermove', x, y)
    dispatchMouseLikeEvent(moveTarget, 'mousemove', x, y)
  }
  dispatchMouseLikeEvent(moveTarget, 'pointerup', targetX, y)
  dispatchMouseLikeEvent(moveTarget, 'mouseup', targetX, y)
  try { window.dispatchEvent(new Event('resize')) } catch {}

  window.setTimeout(() => {
    const after = readSidebarMetric(sidebarWidgetId)
    const finalTargetX = getSidebarResetTargetX(sidebarWidgetId)
    if (after && finalTargetX != null && Math.abs(after.boundaryX - finalTargetX) <= 4) {
      setSidebarBaselineToCurrent(sidebarWidgetId)
    }
  }, 160)
}

function softColor (color: string, fallback = 'rgba(147,197,253,0.18)'): string {
  const c = String(color || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return `${c}2e`
  if (/^#[0-9a-fA-F]{8}$/.test(c)) return c
  if (/^rgba?\(/.test(c)) return c
  return fallback
}

function SidebarResetButton (p: { visible: boolean, onClick: () => void, item?: NavItem | null, cfg?: any }) {
  const [hov, setHov] = React.useState(false)
  const borderColor = '#ffd700'
  const bgRest = '#ffd700'
  const bgHover = '#ffd700'
  if (!p.visible) return null
  return (
    <button
      type='button'
      title='Ripristina larghezze pannelli'
      aria-label='Ripristina larghezze pannelli'
      onClick={p.onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 34,
        height: 34,
        minWidth: 34,
        minHeight: 34,
        borderRadius: 999,
        border: `1px solid ${borderColor}`,
        background: hov ? bgHover : bgRest,
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        marginLeft: 8,
        cursor: 'pointer',
        fontSize: 18,
        fontWeight: 800,
        lineHeight: 1,
        boxShadow: hov ? `0 0 0 2px ${softColor(borderColor)}` : '0 4px 14px rgba(0,0,0,0.18)',
        transition: 'all 0.18s ease',
        flexShrink: 0
      }}
    >
      ↔
    </button>
  )
}

function gotoPage(pageToken: string, section?: string): void {
  const pageId = resolvePageId(pageToken)
  const currentPageId = getCurrentPageId()
  persistAndBroadcastSection(section)
  if (pageId) {
    if (currentPageId && currentPageId === pageId) {
      applyOptionalSectionToUrl(section)
      window.setTimeout(() => persistAndBroadcastSection(section), 0)
      window.setTimeout(() => persistAndBroadcastSection(section), 80)
      return
    }
    UrlManager.getInstance().changePage(pageId)
    window.setTimeout(() => applyOptionalSectionToUrl(section), 30)
    window.setTimeout(() => persistAndBroadcastSection(section), 80)
    window.setTimeout(() => persistAndBroadcastSection(section), 250)
    return
  }
  const clean = (pageToken || '').trim().replace(/^#+\/?/, '').replace(/^\/+/, '')
  const t = clean.startsWith('page/') ? clean.slice(5) : clean
  window.location.hash = `#/page/${t}`
  window.setTimeout(() => applyOptionalSectionToUrl(section), 30)
  window.setTimeout(() => persistAndBroadcastSection(section), 80)
  window.setTimeout(() => persistAndBroadcastSection(section), 250)
}


const NAV_ICONS: Record<string, string> = {
  home:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  elenco:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  nuova:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  mappa:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="13" width="8" height="8" rx="1.5"/><rect x="14" y="13" width="8" height="8" rx="1.5"/><rect x="2" y="3" width="8" height="8" rx="1.5"/><rect x="14" y="3" width="8" height="8" rx="1.5"/></svg>`,
  report:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
}
const NAV_DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`

function NavButton (p: { item: NavItem, cfg: any, idx: number, currentPageId: string | null, currentSection: string, currentViewId: string | null, sectionCounts: SectionCounts, sectionBadgeDetails: SectionBadgeDetails, onSectionChange: (s: string) => void, onViewChange: (v: string) => void }) {
  const { item, cfg, currentPageId, currentSection, currentViewId, sectionCounts, sectionBadgeDetails } = p
  const [hov, setHov] = React.useState(false)
  const sectionId = String(cfg.sectionId || '').trim()
  const itemSection = String(item.section || '').trim()
  const itemViewId = String(item.viewId || '').trim()
  const useTabColors = !!cfg.tabUseCustomColors
  const isActive = isNavItemActive(item, cfg, currentPageId, currentSection, currentViewId)
  const hot = hov || isActive
  const itemSectionForCount = normalizeSectionId(item.section)
  const itemCount = itemSectionForCount ? Number(sectionCounts[itemSectionForCount] || 0) : 0
  const itemBadgeDetail = itemSectionForCount ? sectionBadgeDetails[itemSectionForCount] : undefined
  const itemWarningCount = Math.max(0, Math.trunc(Number(itemBadgeDetail?.warning || 0)))

  const handleClick = () => {
    if (sectionId && (itemViewId || itemSection)) {
      if (itemViewId) {
        switchSectionView(sectionId, itemViewId)
        p.onViewChange(itemViewId)
      }
      const sbId = String(cfg.sidebarWidgetId || '').trim()
      if (sbId) setSidebarCollapse(sbId, !!item.collapseSidebar)
      if (itemSection) {
        p.onSectionChange(itemSection)
        persistAndBroadcastSection(itemSection)
      }
      return
    }
    if (item.hashPage) gotoPage(item.hashPage, item.section)
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        width: cfg.itemWidth,
        minWidth: cfg.itemWidth,
        maxWidth: cfg.itemWidth,
        height: cfg.itemHeight,
        minHeight: cfg.itemHeight,
        borderRadius: cfg.itemBorderRadius,
        border: `1px solid ${hot ? (useTabColors ? (cfg.tabBorderColorActive || item.colorAccent) : item.colorAccent) : (useTabColors ? (cfg.tabBorderColorRest || 'rgba(255,255,255,0.10)') : 'rgba(255,255,255,0.10)')}`,
        background: hot ? (useTabColors ? (cfg.tabBgColorHover || item.colorBgHover || item.colorBg || 'rgba(37,99,167,1)') : (item.colorBgHover || item.colorBg || 'rgba(37,99,167,1)')) : (useTabColors ? (cfg.tabBgColorRest || item.colorBgRest || 'rgba(255,255,255,0.05)') : (item.colorBgRest || 'rgba(255,255,255,0.05)')),
        padding: `${cfg.itemPaddingY}px ${cfg.itemPaddingX}px`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: hot ? `0 0 0 1px ${softColor(useTabColors ? (cfg.tabBorderColorActive || item.colorAccent) : item.colorAccent)} inset` : 'none',
        transform: hov && !isActive ? 'translateY(-1px)' : 'none'
      }}
    >
      <span style={{
        fontFamily: cfg.labelFont,
        fontSize: cfg.labelSize,
        fontWeight: cfg.labelWeight,
        color: hot ? (useTabColors ? (cfg.tabTextColorActive || '#ffffff') : '#ffffff') : (useTabColors ? (cfg.tabTextColorRest || 'rgba(255,255,255,0.92)') : 'rgba(255,255,255,0.92)'),
        lineHeight: 1.1,
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {item.label}
      </span>
      {itemCount > 0 && (
        <span style={{
          marginLeft: 6,
          minWidth: 18,
          height: 18,
          padding: '0 5px',
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          fontSize: 11,
          fontWeight: 800,
          lineHeight: 1,
          color: hot ? (useTabColors ? (cfg.tabBgColorHover || '#1d3557') : (item.colorBgHover || '#1d3557')) : '#1d4ed8',
          background: hot ? '#ffffff' : '#dbeafe',
          border: hot ? '1px solid rgba(255,255,255,0.85)' : '1px solid #93c5fd',
          flex: '0 0 auto'
        }} title='Numero elementi'>{itemCount}</span>
      )}
      {itemWarningCount > 0 && (
        <span style={{
          marginLeft: itemCount > 0 ? 3 : 6,
          width: 18,
          height: 18,
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          fontSize: 12,
          fontWeight: 900,
          lineHeight: 1,
          color: hot ? '#92400e' : '#b45309',
          background: hot ? '#fff7ed' : '#fef3c7',
          border: hot ? '1px solid #fed7aa' : '1px solid #f59e0b',
          flex: '0 0 auto'
        }} title={`Note spese incomplete: ${itemWarningCount}`}>!</span>
      )}
    </div>
  )
}

type Props = AllWidgetProps<IMConfig>

export default function Widget (props: Props) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const items: NavItem[] = Array.isArray(cfg.items) ? cfg.items : defaultConfig.items

  const readCurrentPageId = (): string | null => {
    try {
      const st: any = getAppStore()?.getState?.()
      const rid = st?.appRuntimeInfo?.currentPageId
      if (rid) return rid
    } catch {
      // ignore
    }

    const h = window.location.hash || ''
    const m = h.match(/#\/page\/([^/?#]+)/)
    const tok = m ? decodeURIComponent(m[1]) : ''
    if (!tok) return null
    return resolvePageId(tok) || tok
  }

  const [currentPageId, setCurrentPageId] = React.useState<string | null>(() => readCurrentPageId())
  const [currentSection, setCurrentSection] = React.useState<string>(() => readCurrentSection())
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(() => {
    const sid = String(cfg.sectionId || '').trim()
    return sid ? getCurrentSectionViewId(sid) : null
  })
  const [sectionCounts, setSectionCounts] = React.useState<SectionCounts>(() => readSectionCounts())
  const [sectionBadgeDetails, setSectionBadgeDetails] = React.useState<SectionBadgeDetails>(() => readSectionBadgeDetails())
  const [user, setUser] = React.useState<UserInfo | null>(null)
  const [uLoad, setULoad] = React.useState(true)

  React.useEffect(() => {
    const upd = () => {
      setCurrentPageId(readCurrentPageId())
      setCurrentSection(readCurrentSection())
      const sid = String(cfg.sectionId || '').trim()
      if (sid) setCurrentViewId(getCurrentSectionViewId(sid))
    }
    const onSectionChange = (evt: any) => {
      const next = String(evt?.detail?.section || readCurrentSection() || '').trim()
      if (next) setCurrentSection(next)
      setCurrentPageId(readCurrentPageId())
    }
    const onFocus = () => upd()
    const onCountsChange = (evt: any) => {
      const raw = evt?.detail?.counts || (window as any).__giiEditSectionCounts || {}
      const out: SectionCounts = {}
      Object.entries(raw).forEach(([key, value]) => {
        const k = normalizeSectionId(key)
        const n = Number(value)
        if (k && Number.isFinite(n) && n > 0) out[k] = Math.trunc(n)
      })
      setSectionCounts(out)
      const rawDetails = evt?.detail?.badgeDetails || (window as any).__giiEditSectionBadgeDetails || {}
      const details: SectionBadgeDetails = {}
      Object.entries(rawDetails).forEach(([key, value]: [string, any]) => {
        const k = normalizeSectionId(key)
        const total = Math.max(0, Math.trunc(Number(value?.total || 0)))
        const done = Math.max(0, Math.trunc(Number(value?.done || 0)))
        const warning = Math.max(0, Math.trunc(Number(value?.warning || value?.warn || value?.alert || 0)))
        if (k && (total > 0 || warning > 0)) details[k] = { total, done: Math.min(done, total), warning }
      })
      setSectionBadgeDetails(details)
    }
    upd()
    setSectionCounts(readSectionCounts())
    setSectionBadgeDetails(readSectionBadgeDetails())
    window.addEventListener('hashchange', upd)
    window.addEventListener('popstate', upd)
    window.addEventListener('gii:edit-section-change', onSectionChange as EventListener)
    window.addEventListener('gii:edit-section-counts', onCountsChange as EventListener)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    let unsubStore: (() => void) | null = null
    const sid = String(cfg.sectionId || '').trim()
    try {
      let prevPageId = readCurrentPageId()
      let prevSection = readCurrentSection()
      let prevViewId = sid ? getCurrentSectionViewId(sid) : null
      unsubStore = getAppStore().subscribe(() => {
        const nextPageId = readCurrentPageId()
        if (nextPageId !== prevPageId) {
          prevPageId = nextPageId
          setCurrentPageId(nextPageId)
        }

        const nextSection = readCurrentSection()
        if (nextSection !== prevSection) {
          prevSection = nextSection
          setCurrentSection(nextSection)
        }

        if (sid) {
          const nextViewId = getCurrentSectionViewId(sid)
          if (nextViewId !== prevViewId) {
            prevViewId = nextViewId
            setCurrentViewId(nextViewId)
          }
        }
      })
    } catch {}
    return () => {
      window.removeEventListener('hashchange', upd)
      window.removeEventListener('popstate', upd)
      window.removeEventListener('gii:edit-section-change', onSectionChange as EventListener)
      window.removeEventListener('gii:edit-section-counts', onCountsChange as EventListener)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      if (unsubStore) unsubStore()
    }
  }, [])

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
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: cfg.gap,
      padding: 0,
      boxSizing: 'border-box',
      overflowX: 'auto',
      overflowY: 'hidden'
    }}>
      {visibleItems.map((item, i) => (
        <NavButton key={item.id} item={item} cfg={cfg} idx={i} currentPageId={currentPageId} currentSection={currentSection} currentViewId={currentViewId} sectionCounts={sectionCounts} sectionBadgeDetails={sectionBadgeDetails} onSectionChange={setCurrentSection} onViewChange={setCurrentViewId} />
      ))}
      <div style={{ flex: '1 1 auto', minWidth: 8 }} />
    </div>
  )
}

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, ReactRedux, type IMState } from 'jimu-core'

export type GiiHomeCardLike = {
  id?: string
  visible?: boolean
  order?: number
  label?: string
  desc?: string
  hashPage?: string
  icon?: string
  colorBg?: string
  colorAccent?: string
  roles?: string[]
}

export const GII_PAGE_ICONS: Record<string, string> = {
  home:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.2 1.2) scale(0.9)"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></g></svg>`,
  elenco:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0 0) scale(1)"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></g></svg>`,
  regolamento: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><g stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.8" r="1.2"/><path d="M12,6v14.3"/><path d="M8.3,20.4h7.3"/><path d="M5.6,8.1h12.9"/></g><g stroke-width="1.3" stroke-miterlimit="10"><path d="M5.8,17c1.1-.1,1.9-1,1.9-2.2s-.2-1.2-.5-1.7c-.5-1-1.3-1.8-1.7-2.6-.7,1.3-2.2,2.6-2.2,4.3s1,2.2,2.2,2.2.2,0,.2,0Z"/><path d="M18.7,17c1.1-.1,1.9-1,1.9-2.2s-.2-1.2-.5-1.7c-.5-1-1.3-1.8-1.7-2.6-.7,1.3-2.2,2.6-2.2,4.3s1,2.2,2.2,2.2.2,0,.2,0Z"/></g></svg>`,
  guida:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g transform="scale(.25) translate(-456 -24)"><g stroke-width="7.2"><path d="M525.8,95.7v12.3"/><path d="M532.1,95.7h-49.9c-3.5,0-6.3,2.8-6.3,6.3"/><path d="M475.9,44.8c0-4.9,3.9-8.8,8.8-8.8h47.4v59.7"/><path d="M525.8,108h-43.5c-3.5,0-6.3-2.8-6.3-6.3v-56.9"/></g><line stroke-width="8.3" x1="504.7" y1="65.1" x2="487.7" y2="82.4"/><path fill="currentColor" stroke="none" d="M514,45.7l-6.9,6.9,2,8.1,8.1,2,6.9-6.9c2,7.7-2.4,15.4-10.1,17.4s-15.4-2.4-17.4-10.1c-2-7.7,2.4-15.4,10.1-17.4,2.4-.8,4.8-.8,7.3,0Z"/></g></svg>`,
  mappa:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(2.1818 2.1818) scale(0.8182)"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></g></svg>`,
  nuova:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.2 1.2) scale(0.9)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></g></svg>`,
  dashboard:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.2 1.2) scale(0.9)"><rect x="2" y="13" width="8" height="8" rx="1.5"/><rect x="14" y="13" width="8" height="8" rx="1.5"/><rect x="2" y="3" width="8" height="8" rx="1.5"/><rect x="14" y="3" width="8" height="8" rx="1.5"/></g></svg>`,
  report:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.2 1.2) scale(0.9)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></g></svg>`,
  utenti:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0 0) scale(1)"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></g></svg>`,
  rubrica:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g transform="scale(.25) translate(-1320 -24)"><g stroke-width="7.2"><path d="M1341.5,36h43.2c4.3,0,7.9,3.6,7.6,7.9v56.2c0,4.3-3.6,7.9-7.9,7.9h-42.8c-4.3,0-7.9-3.6-7.9-7.9v-56.2c0-4.3,3.6-7.9,7.9-7.9Z"/><path d="M1402.7,47.5v7.6M1402.7,65.9v7.6M1402.7,83.9v7.6"/></g><g stroke-width="6.6"><circle cx="1363.1" cy="61.1" r="8.6"/><path d="M1349.3,91.4c0-7.6,6.3-14.2,14.2-14.2s14.2,6.3,14.2,14.2"/></g></g></svg>`,
  gruppo:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0.6316 0.8684) scale(0.9474)"><circle cx="9" cy="7" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="8" r="2.8"/><path d="M15.5 18.5a5 5 0 0 1 6 1.5"/></g></svg>`,
  prezzari:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0 0) scale(1)"><circle cx="12" cy="12" r="9"/><text x="12" y="16" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" font-weight="700" fill="currentColor" stroke="none">€</text></g></svg>`,
  impostazioni:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(2.3864 2.1818) scale(0.8182)"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.08A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.08A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9c.25.36.6.6 1 .6h.1a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.02 1.4z"/></g></svg>`,
  allegati:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.09" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.7943 1.8804) scale(0.8612)"><path d="M21.4 11.6l-8.8 8.8a6 6 0 0 1-8.5-8.5l9.4-9.4a4 4 0 0 1 5.7 5.7l-9.4 9.4a2 2 0 0 1-2.8-2.8l8.8-8.8"/></g></svg>`,
  calendario:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0.6316 1.1053) scale(0.9474)"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></g></svg>`,
  allarmi:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.99" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.1457 1.191) scale(0.9045)"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></g></svg>`,
  archivio:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(2.1818 2.1818) scale(0.8182)"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></g></svg>`,
  ricerca:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(-1.2353 -1.2353) scale(1.0588)"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></g></svg>`,
  dettaglio:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.2 1.32) scale(1.2)"><path d="M16.5,8.9V3.1c0-.9-.7-1.7-1.7-1.7H3.2c-.9,0-1.7.7-1.7,1.7v11.6c0,.9.7,1.7,1.7,1.7h5.8"/><path d="M10.8,12.2l3.7,3.7c.5.5,1.1.7,1.6.2.5-.6.3-1-.3-1.5l-3.7-3.7"/><circle cx="9" cy="8.9" r="3.7"/></g></svg>`,
  modifica:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0 0.55) scale(1)"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></g></svg>`,
  editing:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2356" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.2107 1.3181) scale(0.8946)"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></g></svg>`,
  verbale:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.2 1.2) scale(0.9)"><path d="M6 2h9l5 5v15H6z"/><polyline points="15 2 15 7 20 7"/><line x1="9" y1="12" x2="17" y2="12"/><line x1="9" y1="16" x2="17" y2="16"/><path d="M4 6v16h12"/></g></svg>`,
  tabelle:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0 0) scale(1)"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></g></svg>`,
  statistiche: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(-0.7059 -0.1765) scale(1.0588)"><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="11" width="3" height="7" rx="1"/><rect x="11" y="6" width="3" height="12" rx="1"/><rect x="16" y="3" width="3" height="15" rx="1"/></g></svg>`,
  documenti:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(2.0526 0.1579) scale(0.9474)"><path d="M7 3h8l4 4v14H7z"/><polyline points="15 3 15 7 19 7"/><path d="M5 7H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11"/></g></svg>`
}

export const GII_DEFAULT_PAGE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.2 1.2) scale(0.9)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></g></svg>`

// Correzione ottica: non più necessaria. Tutte le icone sono disegnate con lo stesso
// ingombro (lato maggiore 18 su 24, centrate) e lo stesso tratto visivo; la tabella resta
// per eventuali ritocchi puntuali.
const GII_PAGE_ICON_OPTICAL_SCALE: Record<string, number> = {}

function normalizeInlineSvg(svg: string): string {
  if (!svg) return svg
  if (/\bwidth=/.test(svg) || /\bheight=/.test(svg)) return svg
  return svg.replace('<svg ', '<svg width="100%" height="100%" style="display:block" ')
}

function toPlain<T = any>(value: any): T {
  if (value?.asMutable) return value.asMutable({ deep: true }) as T
  if (value?.toJS) return value.toJS() as T
  return value as T
}

function resolvePageId(appConfig: any, tokenRaw: string): string | null {
  let token = String(tokenRaw || '').trim().replace(/^#+\/?/, '').replace(/^\/+/, '')
  if (token.startsWith('page/')) token = token.slice(5)
  if (!token) return null
  const pages = toPlain<Record<string, any>>(appConfig?.pages || {}) || {}
  if (pages[token]) return token
  const hist = toPlain<Record<string, string>>(appConfig?.historyLabels?.page || {}) || {}
  for (const [pageId, page] of Object.entries(pages)) {
    if (!page) continue
    if (String((page as any).name || '') === token) return pageId
    if (String(hist[pageId] || '') === token) return pageId
    if (String((page as any).label || '') === token || String((page as any).title || '') === token) return pageId
  }
  return null
}

export function inferGiiPageIcon(card: Partial<GiiHomeCardLike>): string {
  const explicit = String(card?.icon || '').trim()
  const id = String(card?.id || '').trim()
  const label = String(card?.label || '').trim().toLowerCase()
  const text = `${id} ${card?.hashPage || ''} ${card?.label || ''}`.toLowerCase()
  if (/regolamento/.test(text) && (!explicit || explicit === 'elenco')) return 'regolamento'
  if (/guida\s+operativa|(^|[^a-z])guida([^a-z]|$)/.test(text) && (!explicit || explicit === 'nuova')) return 'guida'
  if (/rubrica/.test(text) && (!explicit || explicit === 'utenti')) return 'rubrica'
  // Le pagine interne dei Prezzari nascono come card tecniche nascoste e
  // possono conservare l'icona placeholder "nuova" (+). In quel caso
  // ereditano l'identita' grafica del gruppo Gestione prezzari.
  if ((!explicit || explicit === 'nuova') && ['voci interne', 'analisi prezzi', 'parametri', 'consultazione'].includes(label)) return 'prezzari'
  if (explicit && GII_PAGE_ICONS[explicit]) return explicit
  if (id && GII_PAGE_ICONS[id]) return id
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

export function getCurrentPagePresentation(appConfig: any, currentPageId: string | null | undefined): { pageId: string; label: string; description: string; icon: string; card: GiiHomeCardLike | null } {
  const pageId = String(currentPageId || '').trim()
  const pages = toPlain<Record<string, any>>(appConfig?.pages || {}) || {}
  const page = pageId ? pages[pageId] : null
  const pageLabel = String(page?.label || page?.title || page?.name || '')
  let card: GiiHomeCardLike | null = null
  try {
    const widgets = toPlain<Record<string, any>>(appConfig?.widgets || {}) || {}
    for (const raw of Object.values(widgets)) {
      const w: any = toPlain(raw)
      const uri = String(w?.uri || '').replace(/\/+$/, '')
      if (!uri.endsWith('/gii-homepage')) continue
      const cfg: any = toPlain(w?.config || {}) || {}
      const cards = toPlain<GiiHomeCardLike[]>(cfg?.cards || []) || []
      card = (Array.isArray(cards) ? cards : []).find(c => resolvePageId(appConfig, String(c?.hashPage || '')) === pageId) || null
      break
    }
  } catch { /* fallback pagina */ }
  const source: GiiHomeCardLike = card || { id: `card_page_${pageId}`, label: pageLabel, hashPage: pageId }
  return {
    pageId,
    label: String(card?.label || pageLabel || ''),
    description: String(card?.desc || ''),
    icon: inferGiiPageIcon(source),
    card
  }
}

export interface GiiPageTitleProps {
  title?: string
  subtitle?: string
  showSubtitle?: boolean
  showDivider?: boolean
  fallbackIcon?: string
  icon?: string
  titleColor?: string
  titleFontSize?: number
  titleFontWeight?: number
  subtitleColor?: string
  subtitleFontSize?: number
  iconSize?: number
  iconGap?: number
  dividerColor?: string
  dividerWidth?: number
  dividerPaddingBottom?: number
  rightContent?: React.ReactNode
  style?: React.CSSProperties
  // false = icona nascosta: il titolo parte dal bordo sinistro
  showIcon?: boolean
}

export function GiiPageTitle(props: GiiPageTitleProps) {
  const currentPageId = ReactRedux.useSelector((state: IMState) => String((state as any)?.appRuntimeInfo?.currentPageId || ''))
  const appConfig = ReactRedux.useSelector((state: IMState) => (state as any)?.appConfig)
  const meta = React.useMemo(() => getCurrentPagePresentation(appConfig, currentPageId), [appConfig, currentPageId])
  const title = String(props.title || meta.label || '')
  const subtitle = props.subtitle !== undefined ? String(props.subtitle || '') : String(meta.description || '')
  const iconKey = props.icon || meta.icon || props.fallbackIcon || 'nuova'
  const rawIcon = GII_PAGE_ICONS[iconKey] || GII_PAGE_ICONS[String(props.fallbackIcon || '')] || GII_DEFAULT_PAGE_ICON
  const icon = normalizeInlineSvg(rawIcon)
  const iconOpticalScale = Number(GII_PAGE_ICON_OPTICAL_SCALE[String(iconKey)] || 1)
  const titleColor = String(props.titleColor || '#1F4E79')
  const titleFontSize = Number(props.titleFontSize ?? 18)
  const titleFontWeight = Number(props.titleFontWeight ?? 800)
  const iconSize = Number(props.iconSize ?? Math.max(22, titleFontSize + 3))
  const iconGap = Number(props.iconGap ?? 9)
  const dividerWidth = Math.max(0, Number(props.dividerWidth ?? 2))
  const dividerColor = String(props.dividerColor || titleColor)
  const dividerPaddingBottom = Number(props.dividerPaddingBottom ?? 6)
  const showSubtitle = props.showSubtitle !== false
  const showDivider = props.showDivider !== false && dividerWidth > 0
  const showIcon = props.showIcon !== false

  return (
    <div style={{ ...props.style, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 0, borderBottom: showDivider ? `${dividerWidth}px solid ${dividerColor}` : 'none', paddingBottom: showDivider ? dividerPaddingBottom : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: iconGap, minWidth: 0, color: titleColor }}>
          {showIcon ? (
            <span aria-hidden='true' style={{ width: iconSize, height: iconSize, flex: `0 0 ${iconSize}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: titleColor, overflow: 'visible' }}>
              <span style={{ width: '100%', height: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${iconOpticalScale})`, transformOrigin: '50% 50%' }} dangerouslySetInnerHTML={{ __html: icon }} />
            </span>
          ) : null}
          <div style={{ fontSize: titleFontSize, lineHeight: 1.25, fontWeight: titleFontWeight, color: titleColor, minWidth: 0 }}>{title}</div>
        </div>
        {props.rightContent ? <div style={{ flex: '0 0 auto', minWidth: 0 }}>{props.rightContent}</div> : null}
      </div>
      {showSubtitle && subtitle ? <div style={{ marginTop: 5, color: String(props.subtitleColor || '#475569'), fontSize: Number(props.subtitleFontSize ?? Math.max(12, titleFontSize - 4)), lineHeight: 1.4, fontWeight: 600 }}>{subtitle}</div> : null}
    </div>
  )
}

export default GiiPageTitle

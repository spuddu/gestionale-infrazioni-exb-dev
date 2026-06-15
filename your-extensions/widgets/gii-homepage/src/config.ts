import { type ImmutableObject, Immutable } from 'jimu-core'

export interface CardConfig {
  id: string; visible: boolean; order: number
  label: string; desc: string; hashPage: string
  colorBg: string; colorAccent: string
  colorBgRest: string; colorBgHover: string
  roles: string[]
  icon: string
}

/** Offset posizione (px) applicato come position:relative top/left */
export interface GroupOffset { x: number; y: number }

export interface Config {
  // ── Sfondo ──
  bgGradStart: string; bgGradMid: string; bgGradEnd: string
  bgGradAngle: number; showWave: boolean; showCircles: boolean
  circleCount: number; circleBaseSize: number; circleThickness: number
  circleOpacity: number; circleColor: string
  circleGradient: boolean; circleColorEnd: string

  // ── Orologio ──
  showClock: boolean; clockColor: string; clockSize: number
  clockFont: string; clockWeight: number; clockItalic: boolean; clockLetterSpacing: number
  dateColor: string; dateSize: number
  dateFont: string; dateWeight: number; dateItalic: boolean; dateLetterSpacing: number

  // ── Profilo organizzativo ──
  showOrgContext: boolean
  orgContextColor: string
  orgContextSize: number
  orgContextFont: string
  orgContextWeight: number
  orgContextItalic: boolean
  orgContextLetterSpacing: number
  orgContextAlign: 'left' | 'center' | 'right'

// ── Etichetta sezione ──
  sectionLabelText: string; sectionLabelColor: string
  sectionLabelSize: number; sectionLabelSpacing: number
  sectionLabelFont: string; sectionLabelWeight: number; sectionLabelItalic: boolean
  sectionLabelUppercase: boolean

  // ── Layout cards ──
  cardsGap: number; cardMinWidth: number
  cardBorderRadius: number; cardPadding: number

  // ── Testi cards ──
  cardLabelFont: string; cardLabelSize: number; cardLabelWeight: number
  cardLabelColor: string; cardLabelHoverColor: string; cardLabelItalic: boolean
  cardDescSize: number; cardCtaText: string; cardCtaSize: number; cardCtaSpacing: number
  cardDescFont: string; cardDescWeight: number; cardDescItalic: boolean
  cardDescColor: string; cardDescHoverColor: string; cardDescLineHeight: number
  cardCtaFont: string; cardCtaWeight: number; cardCtaItalic: boolean
  cardCtaColor: string; cardCtaHoverColor: string

  // ── Footer ──
  showFooter: boolean; footerLeft: string; footerRight: string
  footerColor: string; footerSize: number
  footerFont: string; footerWeight: number; footerItalic: boolean

  // ── Offset posizione ──
  offsetClock: GroupOffset   // orologio + data
  offsetOrgContext: GroupOffset // profilo organizzativo
  offsetCards: GroupOffset   // etichetta + cards

  cards: CardConfig[]

  /**
   * Pagine escluse dall'autogenerazione delle cards.
   * Utile quando aggiungi nuove pagine: la homepage le mostra automaticamente,
   * ma se una pagina non serve come accesso rapido la puoi rimuovere dal setting
   * e verrà aggiunta qui per non ricomparire.
   */
  excludedPageIds: string[]
}

const DEFAULT_CARDS: CardConfig[] = []
const Z: GroupOffset = { x: 0, y: 0 }

export const defaultConfig: Config = {
  bgGradStart: '#0a1628', bgGradMid: '#0d2444', bgGradEnd: '#0a1f3d', bgGradAngle: 160,
  showWave: false, showCircles: true,
  circleCount: 3,
  circleColor: '#60a5fa',
  circleGradient: false,
  circleColorEnd: '#a78bfa',
  circleOpacity: 0.08,
  circleThickness: 1,
  circleBaseSize: 700,

  showClock: true, clockColor: '#ffffff', clockSize: 22,
  clockFont: "'Crimson Pro', Georgia, serif", clockWeight: 300, clockItalic: false, clockLetterSpacing: -0.5,
  dateColor: 'rgba(147,197,253,0.7)', dateSize: 11.5,
  dateFont: "'Source Sans 3', 'Segoe UI', sans-serif", dateWeight: 400, dateItalic: false, dateLetterSpacing: 0,

  showOrgContext: true,
  orgContextColor: 'rgba(147,197,253,0.55)',
  orgContextSize: 10.5,
  orgContextFont: "'Source Sans 3', 'Segoe UI', sans-serif",
  orgContextWeight: 700,
  orgContextItalic: false,
  orgContextLetterSpacing: 1.2,
  orgContextAlign: 'left',

  sectionLabelText: 'Accesso rapido',
  sectionLabelColor: 'rgba(147,197,253,0.55)', sectionLabelSize: 11, sectionLabelSpacing: 2.5,
  sectionLabelFont: "'Source Sans 3', 'Segoe UI', sans-serif", sectionLabelWeight: 700, sectionLabelItalic: false,
  sectionLabelUppercase: true,

  cardsGap: 16, cardMinWidth: 200, cardBorderRadius: 16, cardPadding: 28,

  cardLabelFont: "'Crimson Pro', Georgia, serif",
  cardLabelSize: 18, cardLabelWeight: 600,
  cardLabelColor: 'rgba(255,255,255,0.90)', cardLabelHoverColor: '#ffffff', cardLabelItalic: false,
  cardDescSize: 12.5,
  cardDescFont: "'Source Sans 3', 'Segoe UI', sans-serif", cardDescWeight: 400, cardDescItalic: false,
  cardDescColor: 'rgba(255,255,255,0.50)', cardDescHoverColor: 'rgba(255,255,255,0.80)', cardDescLineHeight: 1.55,
  cardCtaText: 'Accedi', cardCtaSize: 11, cardCtaSpacing: 1.5,
  cardCtaFont: "'Source Sans 3', 'Segoe UI', sans-serif", cardCtaWeight: 700, cardCtaItalic: false,
  cardCtaColor: 'rgba(255,255,255,0.25)', cardCtaHoverColor: '',

  showFooter: true,
  footerLeft: 'GII v1.0 · CBSM © {year}', footerRight: 'ArcGIS Experience Builder 1.19',
  footerColor: 'rgba(255,255,255,0.20)', footerSize: 11,
  footerFont: "'Source Sans 3', 'Segoe UI', sans-serif", footerWeight: 400, footerItalic: false,

  offsetClock: Z,
  offsetOrgContext: Z,
  offsetCards: Z,

  cards: DEFAULT_CARDS,
  excludedPageIds: []
}

export type IMConfig = ImmutableObject<Config>
const toImmutable = Immutable as unknown as <T>(value: T) => ImmutableObject<T>
export const defaultIMConfig: IMConfig = toImmutable(defaultConfig)

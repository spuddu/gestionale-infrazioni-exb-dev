import { type ImmutableObject, Immutable } from 'jimu-core'

export interface CardConfig {
  id: string; visible: boolean; order: number
  label: string; desc: string; hashPage: string
  colorBg: string; colorAccent: string
  colorBgRest: string; colorBgHover: string
  roles: string[]
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
  dateColor: string; dateSize: number

// ── Etichetta sezione ──
  sectionLabelText: string; sectionLabelColor: string
  sectionLabelSize: number; sectionLabelSpacing: number

  // ── Layout cards ──
  cardsGap: number; cardMinWidth: number
  cardBorderRadius: number; cardPadding: number

  // ── Testi cards ──
  cardLabelFont: string; cardLabelSize: number; cardLabelWeight: number
  cardDescSize: number; cardCtaText: string; cardCtaSize: number; cardCtaSpacing: number

  // ── Footer ──
  showFooter: boolean; footerLeft: string; footerRight: string
  footerColor: string; footerSize: number

  // ── Offset posizione ──
  offsetClock: GroupOffset   // orologio + data
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
  dateColor: 'rgba(147,197,253,0.7)', dateSize: 11.5,

  sectionLabelText: 'Accesso rapido',
  sectionLabelColor: 'rgba(147,197,253,0.55)', sectionLabelSize: 11, sectionLabelSpacing: 2.5,

  cardsGap: 16, cardMinWidth: 200, cardBorderRadius: 16, cardPadding: 28,

  cardLabelFont: "'Crimson Pro', Georgia, serif",
  cardLabelSize: 18, cardLabelWeight: 600, cardDescSize: 12.5,
  cardCtaText: 'Accedi', cardCtaSize: 11, cardCtaSpacing: 1.5,

  showFooter: true,
  footerLeft: 'GII v1.0 · CBSM © {year}', footerRight: 'ArcGIS Experience Builder 1.19',
  footerColor: 'rgba(255,255,255,0.20)', footerSize: 11,

  offsetClock: Z,
  offsetCards: Z,

  cards: DEFAULT_CARDS,
  excludedPageIds: []
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any

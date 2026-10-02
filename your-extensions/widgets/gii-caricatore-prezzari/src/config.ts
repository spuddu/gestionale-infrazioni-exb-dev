import { type ImmutableObject } from 'jimu-core'

export interface Config {
  showTitleSubtitle?: boolean
  showTitleDivider?: boolean
  importUrl?: string
  regionaleArticoliUrl?: string
  regionaleAnalisiUrl?: string
  internoArticoliUrl?: string
  internoAnalisiUrl?: string
  title?: string
  /** Sottotitolo personalizzato. Vuoto = descrizione della card Home. */
  subtitleText?: string
  titleColor?: string
  titleFontSize?: number
  titleIconSize?: number
  titleDividerColor?: string
  titleDividerWidth?: number
  subtitleColor?: string
  subtitleFontSize?: number
  sectionTitleColor?: string
  sectionTitleFontSize?: number
  toolbarLabelColor?: string
  toolbarLabelFontSize?: number
  detailCardBackgroundColor?: string
  recordsCardBackgroundColor?: string
}

export type IMConfig = ImmutableObject<Config>

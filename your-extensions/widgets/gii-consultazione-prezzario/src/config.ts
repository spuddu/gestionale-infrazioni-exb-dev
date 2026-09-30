import { type ImmutableObject } from 'jimu-core'

export interface Config {
  showTitleSubtitle?: boolean
  showTitleDivider?: boolean
  regionaleArticoliUrl?: string
  regionaleAnalisiUrl?: string
  internoArticoliUrl?: string
  internoAnalisiUrl?: string
  nuoviPrezziUrl?: string
  nuoviPrezziAnalisiUrl?: string
  datiGeneraliUrl?: string
  attrezzatureParametriUrl?: string
  title?: string
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
  leftColumnWidthPct?: number
  centerColumnWidthPct?: number
  rightColumnWidthPct?: number
  leftPanelBackgroundColor?: string
  detailCardBackgroundColor?: string
  recordsCardBackgroundColor?: string
}

export type IMConfig = ImmutableObject<Config>

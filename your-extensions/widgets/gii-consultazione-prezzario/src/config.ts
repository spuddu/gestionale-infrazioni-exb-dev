import { type ImmutableObject } from 'jimu-core'

export interface Config {
  regionaleArticoliUrl?: string
  regionaleAnalisiUrl?: string
  internoArticoliUrl?: string
  internoAnalisiUrl?: string
  nuoviPrezziUrl?: string
  nuoviPrezziAnalisiUrl?: string
  attrezzatureParametriUrl?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
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

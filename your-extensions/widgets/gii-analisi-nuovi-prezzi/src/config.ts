import { type ImmutableObject } from 'jimu-core'

export interface Config {
  showTitleSubtitle?: boolean
  showTitleDivider?: boolean
  serviceUrl?: string
  parentTableUrl?: string
  regionalTableUrl?: string
  internalTableUrl?: string
  generalDataUrl?: string
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
  detailCardBackgroundColor?: string
  recordsCardBackgroundColor?: string
}

export type IMConfig = ImmutableObject<Config>

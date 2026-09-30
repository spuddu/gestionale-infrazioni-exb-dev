import { type ImmutableObject } from 'jimu-core'

export interface Config {
  showTitleSubtitle?: boolean
  showTitleDivider?: boolean
  serviceUrl?: string
  detailTableUrl?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
  subtitleColor?: string
  subtitleFontSize?: number
  titleIconSize?: number
  titleDividerColor?: string
  titleDividerWidth?: number
  sectionTitleColor?: string
  sectionTitleFontSize?: number
  toolbarLabelColor?: string
  toolbarLabelFontSize?: number
  detailCardBackgroundColor?: string
  recordsCardBackgroundColor?: string
}

export type IMConfig = ImmutableObject<Config>

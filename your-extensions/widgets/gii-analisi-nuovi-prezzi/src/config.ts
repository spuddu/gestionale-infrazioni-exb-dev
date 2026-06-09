import { type ImmutableObject } from 'jimu-core'

export interface Config {
  serviceUrl?: string
  parentTableUrl?: string
  regionalTableUrl?: string
  internalTableUrl?: string
  generalDataUrl?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
  sectionTitleColor?: string
  sectionTitleFontSize?: number
  toolbarLabelColor?: string
  toolbarLabelFontSize?: number
  detailCardBackgroundColor?: string
  recordsCardBackgroundColor?: string
}

export type IMConfig = ImmutableObject<Config>

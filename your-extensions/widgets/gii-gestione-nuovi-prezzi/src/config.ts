import { type ImmutableObject } from 'jimu-core'

export interface Config {
  serviceUrl?: string
  detailTableUrl?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
  sectionTitleColor?: string
  sectionTitleFontSize?: number
  toolbarLabelColor?: string
  toolbarLabelFontSize?: number
  detailCardBackgroundColor?: string
  recordsCardBackgroundColor?: string
  panelBorderColor?: string
  controlBackgroundColor?: string
  controlTextColor?: string
  controlBorderColor?: string
  controlFontSize?: number
  readonlyBackgroundColor?: string
  readonlyTextColor?: string
  tableHeaderBackgroundColor?: string
  tableHeaderTextColor?: string
  tableTextColor?: string
  tableFontSize?: number
  primaryButtonBackgroundColor?: string
  primaryButtonTextColor?: string
  secondaryButtonBackgroundColor?: string
  secondaryButtonTextColor?: string
  dangerButtonBackgroundColor?: string
  dangerButtonTextColor?: string
}

export type IMConfig = ImmutableObject<Config>

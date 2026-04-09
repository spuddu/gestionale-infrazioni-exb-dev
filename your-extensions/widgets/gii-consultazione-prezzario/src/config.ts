import { type ImmutableObject } from 'jimu-core'

export interface Config {
  serviceUrl?: string
  prezzariUrl?: string
  analisiUrl?: string
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
}

export type IMConfig = ImmutableObject<Config>

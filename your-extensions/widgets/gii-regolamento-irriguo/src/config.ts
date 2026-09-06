import { type ImmutableObject } from 'jimu-core'

export interface Config {
  title?: string
  titleColor?: string
  titleFontSize?: number
  sectionTitleColor?: string
  sectionTitleFontSize?: number
  accentColor?: string
  leftColumnWidthPct?: number
  rightColumnWidthPct?: number
  leftPanelBackgroundColor?: string
  contentBackgroundColor?: string
  regolamentoArticoliUrl?: string
  pdfUrl?: string
}

export type IMConfig = ImmutableObject<Config>

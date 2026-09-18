import { type ImmutableObject } from 'jimu-core'

export interface Config {
  title?: string
  titleColor?: string
  titleFontSize?: number
  titleDividerColor?: string
  titleDividerWidth?: number
  sectionTitleColor?: string
  sectionTitleFontSize?: number
  accentColor?: string
  leftColumnWidthPct?: number
  rightColumnWidthPct?: number
  leftPanelBackgroundColor?: string
  contentBackgroundColor?: string
  panelRadius?: number
  panelBorderWidth?: number
  panelBorderColor?: string
  panelHeaderBackgroundColor?: string
  separatorColor?: string
  separatorWidth?: number
  controlRadius?: number
  controlBorderWidth?: number
  controlBorderColor?: string
  controlBackgroundColor?: string
  controlHoverBackgroundColor?: string
  splitterColor?: string
  splitterWidth?: number
  outerPaddingTop?: number
  outerPaddingRight?: number
  outerPaddingBottom?: number
  outerPaddingLeft?: number
  indexPaddingTop?: number
  indexPaddingRight?: number
  indexPaddingBottom?: number
  indexPaddingLeft?: number
  articlePaddingTop?: number
  articlePaddingRight?: number
  articlePaddingBottom?: number
  articlePaddingLeft?: number
  regolamentoArticoliUrl?: string
  pdfUrl?: string
}

export type IMConfig = ImmutableObject<Config>

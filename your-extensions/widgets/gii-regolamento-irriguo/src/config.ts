import { type ImmutableObject } from 'jimu-core'

export interface Config {
  showTitleSubtitle?: boolean
  showTitleDivider?: boolean
  title?: string
  titleColor?: string
  titleFontSize?: number
  mainTitleFontSize?: number
  titleIconSize?: number
  subtitleColor?: string
  subtitleFontSize?: number
  approvalMetaColor?: string
  approvalMetaFontSize?: number
  approvalMetaFontWeight?: number
  titleDividerColor?: string
  titleDividerWidth?: number
  sectionTitleColor?: string
  sectionTitleFontSize?: number
  sectionHeaderFontSize?: number
  bodyFontSize?: number
  indexFontSize?: number
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

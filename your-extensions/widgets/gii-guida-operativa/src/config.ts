import { type ImmutableObject } from 'jimu-core'

export interface Config {
  showTitleSubtitle?: boolean
  showTitleDivider?: boolean
  title?: string
  subtitle?: string
  accentColor?: string
  titleColor?: string
  titleDividerColor?: string
  titleDividerWidth?: number
  titleIconSize?: number
  textColor?: string
  mutedColor?: string
  subtitleColor?: string
  subtitleFontSize?: number
  leftPanelBackgroundColor?: string
  contentBackgroundColor?: string
  panelBorderColor?: string
  panelBorderWidth?: number
  panelHeaderBackgroundColor?: string
  separatorColor?: string
  separatorWidth?: number
  panelRadius?: number
  leftColumnWidthPct?: number
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
  contentPaddingTop?: number
  contentPaddingRight?: number
  contentPaddingBottom?: number
  contentPaddingLeft?: number
  searchPlaceholder?: string
  showRoleFilter?: boolean
  defaultRoleMode?: 'all' | 'current'
  showVersion?: boolean
  manualDownloadUrl?: string
  titleFontSize?: number
  bodyFontSize?: number
  indexFontSize?: number
}

export type IMConfig = ImmutableObject<Config>

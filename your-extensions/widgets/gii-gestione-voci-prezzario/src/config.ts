import { type ImmutableObject } from 'jimu-core'

export interface Config {
  showTitleSubtitle?: boolean
  showTitleDivider?: boolean
  serviceUrl?: string
  prezzariUrl?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
  subtitleColor?: string
  subtitleFontSize?: number
  titleIconSize?: number
  titleDividerColor?: string
  titleDividerWidth?: number
}

export type IMConfig = ImmutableObject<Config>

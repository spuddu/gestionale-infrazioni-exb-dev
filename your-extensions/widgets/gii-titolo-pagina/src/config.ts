import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
  titleOverride?: string
  descriptionOverride?: string
  showDescription?: boolean
  showTitleDivider?: boolean
  titleColor?: string
  titleFontSize?: number
  titleFontWeight?: number
  subtitleColor?: string
  subtitleFontSize?: number
  iconSize?: number
  iconGap?: number
  dividerColor?: string
  dividerWidth?: number
  dividerPaddingBottom?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
}

export const defaultConfig: Config = {
  titleOverride: '',
  descriptionOverride: '',
  showDescription: true,
  showTitleDivider: true,
  titleColor: '#1F4E79',
  titleFontSize: 18,
  titleFontWeight: 800,
  subtitleColor: '#475569',
  subtitleFontSize: 14,
  iconSize: 23,
  iconGap: 9,
  dividerColor: '#1F4E79',
  dividerWidth: 2,
  dividerPaddingBottom: 6,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0
}

export type IMConfig = ImmutableObject<Config>
const toImmutable = Immutable as unknown as <T>(v:T)=>ImmutableObject<T>
export const defaultIMConfig: IMConfig = toImmutable(defaultConfig)

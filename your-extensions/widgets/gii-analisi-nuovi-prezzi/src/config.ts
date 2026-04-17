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
}

export type IMConfig = ImmutableObject<Config>

import { type ImmutableObject } from 'jimu-core'

export interface Config {
  serviceUrl?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
}

export type IMConfig = ImmutableObject<Config>

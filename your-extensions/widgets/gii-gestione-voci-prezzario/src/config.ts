import { type ImmutableObject } from 'jimu-core'

export interface Config {
  serviceUrl?: string
  prezzariUrl?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
}

export type IMConfig = ImmutableObject<Config>

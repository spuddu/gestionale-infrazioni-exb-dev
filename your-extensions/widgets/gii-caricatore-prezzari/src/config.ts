import { type ImmutableObject } from 'jimu-core'

export interface Config {
  importUrl?: string
  regionaleArticoliUrl?: string
  regionaleAnalisiUrl?: string
  internoArticoliUrl?: string
  internoAnalisiUrl?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
}

export type IMConfig = ImmutableObject<Config>

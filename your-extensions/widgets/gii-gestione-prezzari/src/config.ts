import { type ImmutableObject } from 'jimu-core'

export interface Config {
  prezzariUrl?: string
  vociUrl?: string
  analisiUrl?: string
  title?: string
  titleColor?: string
  titleFontSize?: number
}

export type IMConfig = ImmutableObject<Config>

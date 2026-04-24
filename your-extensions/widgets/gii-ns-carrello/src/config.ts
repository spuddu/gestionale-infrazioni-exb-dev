import { type ImmutableObject } from 'jimu-core'

export interface Config {
  returnPageSlug: string
  barBg: string
  barBorderColor: string
}

export const defaultConfig: Config = {
  returnPageSlug: 'modifica-rapporto',
  barBg: '#ffffff',
  barBorderColor: '#c5d9f1'
}

export type IMConfig = ImmutableObject<Config>

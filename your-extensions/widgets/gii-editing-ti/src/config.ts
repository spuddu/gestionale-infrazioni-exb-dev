import { type ImmutableObject } from 'jimu-core'

export interface Config {
  clientSecret?: string
}

export type IMConfig = ImmutableObject<Config>

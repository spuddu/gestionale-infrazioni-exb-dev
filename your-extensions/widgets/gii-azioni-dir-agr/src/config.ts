import { ImmutableObject } from 'jimu-core'

export interface Config {
  roleSuffix: string
  buttonText: string
}

export type IMConfig = ImmutableObject<Config>

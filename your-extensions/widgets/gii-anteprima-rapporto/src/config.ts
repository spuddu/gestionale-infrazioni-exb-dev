import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
  dsUrl: string
}

export const defaultConfig: Config = {
  dsUrl: ''
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any

import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
  placeholderRicerca: string
  debounceMs: number
  mostraStato: boolean
  mostraUfficio: boolean
  mostraPeriodo: boolean
  mostraOrdinamento: boolean
}

export type IMConfig = ImmutableObject<Config>

const toImmutable = Immutable as unknown as <T>(value: T) => ImmutableObject<T>

export const defaultConfig: IMConfig = toImmutable({
  placeholderRicerca: 'Cerca pratica, trasgressore o violazione',
  debounceMs: 250,
  mostraStato: true,
  mostraUfficio: true,
  mostraPeriodo: true,
  mostraOrdinamento: true
})

export default defaultConfig

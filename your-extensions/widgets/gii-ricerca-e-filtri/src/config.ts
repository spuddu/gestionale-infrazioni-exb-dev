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

export const defaultConfig: IMConfig = Immutable({
  placeholderRicerca: 'Cerca pratica, trasgressore o violazione',
  debounceMs: 250,
  mostraStato: true,
  mostraUfficio: true,
  mostraPeriodo: true,
  mostraOrdinamento: true
})

export default defaultConfig

import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
  useMapWidgetIds: string[]
  layerKey: string
  layerId: string
  layerLayerId: string
  layerUrl: string
  layerTitle: string
  fieldComune: string
  fieldSezione: string
  fieldFoglio: string
  fieldMappale: string
  mostraSezione: boolean
  richiediFoglioPerRicerca: boolean
  applicaFiltroMappa: boolean
  zoomAllaRicerca: boolean
  evidenziaRisultati: boolean
  maxResultFeatures: number
  maxDistinctValues: number
  zoomScale: number
}

export type IMConfig = ImmutableObject<Config>

const makeImmutable = Immutable as unknown as <T>(value: T) => ImmutableObject<T>

export const defaultConfig: IMConfig = makeImmutable<Config>({
  useMapWidgetIds: [],
  layerKey: '',
  layerId: '',
  layerLayerId: '',
  layerUrl: '',
  layerTitle: '',
  fieldComune: 'COMUNE',
  fieldSezione: 'SEZIONE',
  fieldFoglio: 'FOGLIO',
  fieldMappale: 'MAPPALE',
  mostraSezione: true,
  richiediFoglioPerRicerca: true,
  applicaFiltroMappa: false,
  zoomAllaRicerca: true,
  evidenziaRisultati: true,
  maxResultFeatures: 500,
  maxDistinctValues: 5000,
  zoomScale: 2500
})

export default defaultConfig

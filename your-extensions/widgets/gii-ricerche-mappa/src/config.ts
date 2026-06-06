import { type ImmutableObject, Immutable } from 'jimu-core'

export type SearchControlType = 'combo' | 'text' | 'number' | 'date'
export type SearchOperator = 'equals' | 'contains' | 'startsWith'

export interface SearchFieldConfig {
  id: string
  fieldName: string
  label: string
  controlType: SearchControlType
  operator: SearchOperator
  required: boolean
  cascade: boolean
}

export interface MapSearchConfig {
  id: string
  title: string
  layerKey: string
  layerId: string
  layerLayerId: string
  layerUrl: string
  layerTitle: string
  fields: SearchFieldConfig[]
}

export interface Config {
  useMapWidgetIds: string[]
  searches: MapSearchConfig[]
  selectedSearchId: string
  zoomAllaRicerca: boolean
  evidenziaRisultati: boolean
  maxResultFeatures: number
  maxDistinctValues: number
  zoomScale: number
  colorBackground: string
  colorBorder: string
  colorLabel: string
  colorFieldBorder: string
  colorFieldBackground: string
  colorFieldText: string
  colorBtnPrimary: string
  colorBtnPrimaryText: string
  colorBtnGhost: string
  colorBtnGhostText: string
  borderRadius: number
  paddingH: number
  paddingV: number
  searchLabel: string
  fieldHeight: number
}

export type IMConfig = ImmutableObject<Config>

const makeImmutable = Immutable as unknown as <T>(value: T) => ImmutableObject<T>

export const defaultConfig: IMConfig = makeImmutable<Config>({
  useMapWidgetIds: [],
  searches: [],
  selectedSearchId: '',
  zoomAllaRicerca: true,
  evidenziaRisultati: true,
  maxResultFeatures: 500,
  maxDistinctValues: 5000,
  zoomScale: 2500,
  colorBackground: '#ffffff',
  colorBorder: 'rgba(0,0,0,0.12)',
  colorLabel: '#374151',
  colorFieldBorder: 'rgba(0,0,0,0.16)',
  colorFieldBackground: '#ffffff',
  colorFieldText: '#111827',
  colorBtnPrimary: '#2f6fed',
  colorBtnPrimaryText: '#ffffff',
  colorBtnGhost: 'rgba(0,0,0,0.06)',
  colorBtnGhostText: '#1f2937',
  borderRadius: 8,
  paddingH: 8,
  paddingV: 6,
  searchLabel: 'Tipo ricerca',
  fieldHeight: 28
})

export default defaultConfig

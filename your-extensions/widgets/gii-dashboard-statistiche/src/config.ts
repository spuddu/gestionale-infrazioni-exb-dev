import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
  title: string
  subtitle: string
  whereClause: string
  pageSize: number
  staleDays: number
  showTechnicalInfo: boolean
  accentColor: string
  panelBg: string
  cardBg: string
  cardBorder: string
  textColor: string
  mutedColor: string
}

export const defaultConfig: Config = {
  title: 'Cruscotto statistiche',
  subtitle: 'Indicatori dinamici su pratiche, uffici e tipologie di infrazione.',
  whereClause: '1=1',
  pageSize: 2000,
  staleDays: 15,
  showTechnicalInfo: false,
  accentColor: '#38bdf8',
  panelBg: 'rgba(3,10,24,0.94)',
  cardBg: 'rgba(15,23,42,0.74)',
  cardBorder: 'rgba(148,163,184,0.20)',
  textColor: '#ffffff',
  mutedColor: 'rgba(203,213,225,0.72)'
}

export type IMConfig = ImmutableObject<Config>
const toImmutable = Immutable as unknown as <T>(value: T) => ImmutableObject<T>
export const defaultIMConfig: IMConfig = toImmutable(defaultConfig)

import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
  title: string
  subtitle: string
  whereClause: string
  pageSize: number
  staleDays: number
  tableRows: number
  showTechnicalInfo: boolean
  accentColor: string
  panelBg: string
  cardBg: string
  cardBorder: string
  textColor: string
  mutedColor: string
}

export const defaultConfig: Config = {
  title: 'Report pratiche',
  subtitle: 'Elenco consultabile ed esportabile delle pratiche di competenza.',
  whereClause: '1=1',
  pageSize: 2000,
  staleDays: 15,
  tableRows: 25,
  showTechnicalInfo: false,
  accentColor: '#b79ffe',
  panelBg: 'rgba(11,26,48,0.92)',
  cardBg: 'rgba(255,255,255,0.08)',
  cardBorder: 'rgba(255,255,255,0.14)',
  textColor: '#ffffff',
  mutedColor: 'rgba(255,255,255,0.70)'
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any

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
  title: 'Cruscotto operativo',
  subtitle: 'Sintesi delle attività, delle pratiche ferme e dell’avanzamento delle lavorazioni.',
  whereClause: '1=1',
  pageSize: 2000,
  staleDays: 15,
  showTechnicalInfo: false,
  accentColor: '#fefe2a',
  panelBg: 'rgba(11,26,48,0.92)',
  cardBg: 'rgba(255,255,255,0.08)',
  cardBorder: 'rgba(255,255,255,0.14)',
  textColor: '#ffffff',
  mutedColor: 'rgba(255,255,255,0.70)'
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = (Immutable as any)(defaultConfig)

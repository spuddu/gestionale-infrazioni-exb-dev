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
  outerPaddingTop: number
  outerPaddingRight: number
  outerPaddingBottom: number
  outerPaddingLeft: number
  panelPaddingTop: number
  panelPaddingRight: number
  panelPaddingBottom: number
  panelPaddingLeft: number
  cardRadius: number
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
  mutedColor: 'rgba(255,255,255,0.70)',
  outerPaddingTop: 14,
  outerPaddingRight: 14,
  outerPaddingBottom: 14,
  outerPaddingLeft: 14,
  panelPaddingTop: 16,
  panelPaddingRight: 16,
  panelPaddingBottom: 16,
  panelPaddingLeft: 16,
  cardRadius: 14
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = (Immutable as any)(defaultConfig)

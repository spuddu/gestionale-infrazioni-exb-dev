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
  title: 'Report pratiche',
  subtitle: 'Quadro di sintesi delle fasi procedimentali delle pratiche di competenza.',
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
  mutedColor: 'rgba(255,255,255,0.70)',
  outerPaddingTop: 16,
  outerPaddingRight: 16,
  outerPaddingBottom: 16,
  outerPaddingLeft: 16,
  panelPaddingTop: 16,
  panelPaddingRight: 16,
  panelPaddingBottom: 16,
  panelPaddingLeft: 16,
  cardRadius: 18
}

export type IMConfig = ImmutableObject<Config>
const toImmutable = Immutable as unknown as <T>(value: T) => ImmutableObject<T>
export const defaultIMConfig: IMConfig = toImmutable(defaultConfig)

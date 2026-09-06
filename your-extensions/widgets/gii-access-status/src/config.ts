import { type ImmutableObject, Immutable } from 'jimu-core'

export type TextAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'flex-start' | 'center' | 'flex-end'

export interface Config {
  checkingTitle: string
  deniedTitle: string
  deniedMessage: string
  showDeniedMessage: boolean

  checkingTitleColor: string
  deniedTitleColor: string
  deniedMessageColor: string

  titleFontFamily: string
  titleFontSize: number
  titleFontWeight: number
  titleLineHeight: number

  messageFontFamily: string
  messageFontSize: number
  messageFontWeight: number
  messageLineHeight: number
  messageMaxWidth: number

  messageGap: number
  textAlign: TextAlign
  verticalAlign: VerticalAlign
}

export const defaultConfig: Config = {
  checkingTitle: 'Accesso in corso',
  deniedTitle: 'Accesso negato',
  deniedMessage: "Account non abilitato per l'accesso al gestionale.",
  showDeniedMessage: true,

  checkingTitleColor: '#ffffff',
  deniedTitleColor: '#ffffff',
  deniedMessageColor: '#ffffff',

  titleFontFamily: 'inherit',
  titleFontSize: 25,
  titleFontWeight: 700,
  titleLineHeight: 1.2,

  messageFontFamily: 'inherit',
  messageFontSize: 14,
  messageFontWeight: 500,
  messageLineHeight: 1.3,
  messageMaxWidth: 520,

  messageGap: 8,
  textAlign: 'center',
  verticalAlign: 'center'
}

export type IMConfig = ImmutableObject<Config>
const toImmutable = Immutable as unknown as <T>(value: T) => ImmutableObject<T>
export const defaultIMConfig: IMConfig = toImmutable<Config>(defaultConfig)

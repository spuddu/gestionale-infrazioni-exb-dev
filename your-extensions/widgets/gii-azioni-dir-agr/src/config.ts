import { type ImmutableObject, Immutable } from 'jimu-core'

export type RoleCode = 'DT' | 'DA'

export interface Config {
  // --- Ruolo
  roleCode: RoleCode
  buttonText: string

  // --- Colori pulsanti (hex)
  takeColor: string
  integrazioneColor: string
  approvaColor: string
  respingiColor: string
  trasmettiColor: string

  // --- Pannello (sfondo/bordi/spazi)
  panelBg: string
  panelBorderColor: string
  panelBorderWidth: number
  panelBorderRadius: number
  panelPadding: number
  dividerColor: string

  // --- Tipografia / messaggi
  titleFontSize: number
  statusFontSize: number
  msgFontSize: number

  // --- Motivazioni respinta
  rejectReasons: string[]

  // --- Zebra list motivazioni (solo setting)
  reasonsZebraOddBg: string
  reasonsZebraEvenBg: string
  reasonsRowBorderColor: string
  reasonsRowBorderWidth: number
  reasonsRowRadius: number
}

export const defaultConfig: Config = {
  roleCode: 'DT',
  buttonText: 'Prendi in carico',

  takeColor: '#0078da',
  integrazioneColor: '#e75a05',
  approvaColor: '#328c54',
  respingiColor: '#d13438',
  trasmettiColor: '#6f42c1',

  panelBg: '#ffffff',
  panelBorderColor: '#e5e7eb',
  panelBorderWidth: 1,
  panelBorderRadius: 10,
  panelPadding: 12,
  dividerColor: '#e5e7eb',

  titleFontSize: 14,
  statusFontSize: 13,
  msgFontSize: 15,

  rejectReasons: [
    'Mancanza requisiti',
    'Documentazione incompleta',
    'Dati incoerenti',
    'Richiesta non ammissibile',
    'Altro'
  ],

  reasonsZebraOddBg: '#ffffff',
  reasonsZebraEvenBg: '#f6f7f9',
  reasonsRowBorderColor: 'rgba(0,0,0,0.10)',
  reasonsRowBorderWidth: 1,
  reasonsRowRadius: 8
}

export type IMConfig = ImmutableObject<Config>

export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any

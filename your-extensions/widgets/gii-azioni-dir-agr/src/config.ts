import { type ImmutableObject, Immutable } from 'jimu-core'

export type RoleCode = 'DT' | 'DA'

export interface TabConfig {
  id: string // univoco (es. 'anagrafica', 'violazione', 'iter', 'allegati', 'azioni')
  label: string // nome visualizzato nella tab
  fields: string[] // campi selezionati per questa tab
  hideEmpty?: boolean // se true, mostra solo campi valorizzati (non vuoti)
  locked?: boolean // se true, non può essere rimossa o riordinata (opzionale)
  isIterTab?: boolean // se true, mostra i campi DT/DA fissi + i campi extra
}

export interface TabFields {
  anagrafica: string[]
  violazione: string[]
  allegati: string[]
  iterExtra: string[]
}

export interface FieldPreset {
  id: string
  name: string
  tabs: TabConfig[] // invece di campi separati
}

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

  // --- Maschera (come widget Elenco)
  maskBg: string
  maskBorderColor: string
  maskBorderWidth: number
  maskBorderRadius: number
  maskInnerPadding: number
  maskOuterOffset: number
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

  // --- TAB CONFIGURABILI
  tabs: TabConfig[]

  // --- Campi legacy (per retrocompatibilità, deprecati)
  anagraficaFields?: string[]
  violazioneFields?: string[]
  allegatiFields?: string[]
  iterExtraFields?: string[]

  // --- Preset selezione campi per TAB
  presets: FieldPreset[]
  activePresetId: string
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

  // Maschera (come widget Elenco)
  maskBg: '#ffffff',
  maskBorderColor: '#e5e7eb',
  maskBorderWidth: 1,
  maskBorderRadius: 10,
  maskInnerPadding: 12,
  maskOuterOffset: 12,
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
  reasonsRowRadius: 8,

  // Tab di default
  tabs: [
        { id: 'anagrafica', label: 'Anagrafica', fields: [], hideEmpty: false },
    { id: 'violazione', label: 'Violazione', fields: [], hideEmpty: true },
    { id: 'iter', label: 'Iter', fields: [], isIterTab: true, hideEmpty: false },
    { id: 'allegati', label: 'Allegati', fields: [], hideEmpty: true },
    { id: 'azioni', label: 'Azioni', fields: [], locked: true }

  ],

  presets: [],
  activePresetId: ''
}

export type IMConfig = ImmutableObject<Config>

export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any

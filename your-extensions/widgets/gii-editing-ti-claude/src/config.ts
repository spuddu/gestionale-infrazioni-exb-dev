import { type ImmutableObject, Immutable } from 'jimu-core'

export type RoleCode = 'DT' | 'DA'

export interface TabConfig {
  id: string
  label: string
  fields: string[]
  hideEmpty?: boolean
  locked?: boolean
  isIterTab?: boolean
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
  tabs: TabConfig[]
}

export interface Config {
  // --- Ruolo
  roleCode: RoleCode
  buttonText: string

  // --- Colori pulsanti
  takeColor: string
  integrazioneColor: string
  approvaColor: string
  respingiColor: string
  trasmettiColor: string

  // --- Forma pulsanti
  btnBorderRadius: number
  btnFontSize: number
  btnFontWeight: number
  btnPaddingX: number
  btnPaddingY: number

  // --- Pannello (sfondo/bordi/spazi)
  panelBg: string
  panelBorderColor: string
  panelBorderWidth: number
  panelBorderRadius: number
  panelPadding: number

  // --- Maschera
  maskBg: string
  maskBorderColor: string
  maskBorderWidth: number
  maskBorderRadius: number
  maskInnerPadding: number
  maskOuterOffset: number
  dividerColor: string

  // --- Tipografia
  titleFontSize: number
  statusFontSize: number
  msgFontSize: number

  // --- Titolo pratica
  detailTitlePrefix: string
  detailTitleBg: string
  detailTitleHeight: number
  detailTitlePaddingBottom: number
  detailTitlePaddingLeft: number
  detailTitleFontSize: number
  detailTitleFontWeight: number
  detailTitleColor: string

  // --- Pulsanti editing TI
  showEditButtons: boolean
  editOverlayColor: string
  editPageColor: string
  editPageId: string
  fieldStatoTI: string
  fieldPresaTI: string
  editMinStato: number
  editMaxStato: number
  editPresaRequiredVal: number

  // --- Motivazioni respinta
  rejectReasons: string[]
  reasonsZebraOddBg: string
  reasonsZebraEvenBg: string
  reasonsRowBorderColor: string
  reasonsRowBorderWidth: number
  reasonsRowRadius: number

  // --- TAB CONFIGURABILI
  tabs: TabConfig[]

  // --- Campi legacy (retrocompatibilità)
  anagraficaFields?: string[]
  violazioneFields?: string[]
  allegatiFields?: string[]
  iterExtraFields?: string[]

  // --- Modalità
  showDatiGenerali: boolean

  // --- Preset
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

  btnBorderRadius: 8,
  btnFontSize: 13,
  btnFontWeight: 600,
  btnPaddingX: 16,
  btnPaddingY: 8,

  panelBg: '#ffffff',
  panelBorderColor: '#e5e7eb',
  panelBorderWidth: 1,
  panelBorderRadius: 10,
  panelPadding: 12,

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

  detailTitlePrefix: 'Dettaglio rapporto n.',
  detailTitleBg: 'transparent',
  detailTitleHeight: 28,
  detailTitlePaddingBottom: 10,
  detailTitlePaddingLeft: 0,
  detailTitleFontSize: 14,
  detailTitleFontWeight: 600,
  detailTitleColor: 'rgba(0,0,0,0.85)',

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

  tabs: [
    { id: 'anagrafica', label: 'Anagrafica', fields: [], hideEmpty: false },
    { id: 'violazione', label: 'Violazione', fields: [], hideEmpty: true },
    { id: 'iter', label: 'Iter', fields: [], isIterTab: true, hideEmpty: false },
    { id: 'allegati', label: 'Allegati', fields: [], hideEmpty: true },
    { id: 'azioni', label: 'Azioni', fields: [], locked: true }
  ],

  showEditButtons: true,
  editOverlayColor: '#7c3aed',
  editPageColor: '#5b21b6',
  editPageId: 'editing-ti',
  fieldStatoTI: 'stato_TI',
  fieldPresaTI: 'presa_in_carico_TI',
  editMinStato: 2,
  editMaxStato: 2,
  editPresaRequiredVal: 2,

  showDatiGenerali: false,

  presets: [],
  activePresetId: ''
}

export type IMConfig = ImmutableObject<Config>

export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any

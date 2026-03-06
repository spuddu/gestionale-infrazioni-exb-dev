import { type ImmutableObject, Immutable } from 'jimu-core'

export type RoleCode = 'DT' | 'DA' | 'RZ'

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

  // --- Titolo pratica (sopra il pannello)
  detailTitlePrefix: string
  detailTitleHeight: number
  detailTitlePaddingBottom: number
  detailTitlePaddingLeft: number
  detailTitleFontSize: number
  detailTitleFontWeight: number
  detailTitleColor: string


  // --- Sfondo titolo pratica
  detailTitleBg: string

  // --- Stile pulsanti principali
  btnBorderRadius: number
  btnFontSize: number
  btnFontWeight: number
  btnPaddingX: number
  btnPaddingY: number

  // --- Pulsanti editing TI
  showEditButtons: boolean          // mostra/nasconde i pulsanti modifica
  editOverlayColor: string          // colore pulsante "Modifica (overlay)"
  editPageColor: string             // colore pulsante "Modifica (pagina)"
  editPageId: string                // ID pagina ExB destinazione navigazione
  // Logica abilitazione: il pulsante è attivo solo se
  // stato_TI >= editMinStato E stato_TI <= editMaxStato
  fieldStatoTI: string              // nome campo stato TI (es. stato_TI)
  fieldPresaTI: string              // nome campo presa in carico TI (es. presa_in_carico_TI)
  editMinStato: number              // valore minimo stato_TI per consentire editing
  editMaxStato: number              // valore massimo stato_TI per consentire editing
  editPresaRequiredVal: number      // valore presa_in_carico_TI richiesto (es. 2 = presa)

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

  // Titolo pratica
  detailTitlePrefix: 'Dettaglio rapporto n.',
  detailTitleHeight: 28,
  detailTitlePaddingBottom: 10,
  detailTitlePaddingLeft: 0,
  detailTitleFontSize: 14,
  detailTitleFontWeight: 600,
  detailTitleColor: 'rgba(0,0,0,0.85)',


  detailTitleBg: 'transparent',

  btnBorderRadius: 8,
  btnFontSize: 14,
  btnFontWeight: 600,
  btnPaddingX: 14,
  btnPaddingY: 10,

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

  // Editing TI
  showEditButtons: true,
  editOverlayColor: '#7c3aed',
  editPageColor: '#5b21b6',
  editPageId: 'editing-ti',
  fieldStatoTI: 'stato_TI',
  fieldPresaTI: 'presa_in_carico_TI',
  editMinStato: 2,
  editMaxStato: 2,
  editPresaRequiredVal: 2,

  presets: [],
  activePresetId: ''
}

export type IMConfig = ImmutableObject<Config>

export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any

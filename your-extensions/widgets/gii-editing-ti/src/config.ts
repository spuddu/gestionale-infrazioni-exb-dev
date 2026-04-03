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

export interface SchemaFieldOpt {
  name: string
  alias: string
  type?: string
}

export interface LayoutCell {
  field?: string   // field name; omit or empty string for spacer
  label?: string   // override default field label
}

export interface LayoutRow {
  type: 'fields' | 'header' | 'special'
  label?: string          // for type='header': section title
  id?: string             // for type='special': special element id
  columns?: string        // for type='fields': CSS grid-template-columns
  cells?: LayoutCell[]    // for type='fields'
  gap?: number            // for type='fields': override default gap (px)
}

export interface Config {
  // --- Snapshot schema usato dal setting
  schemaLayerUrl?: string
  schemaLayerLabel?: string
  schemaFields?: SchemaFieldOpt[]

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

  // --- Colore sfondo per modalità (distingue visivamente nuovo rapporto da modifica)
  modeBgCreate: string   // sfondo quando il widget è in modalità "Nuovo rapporto"
  modeBgEdit: string     // sfondo quando il widget è in modalità "Modifica rapporto"

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

  // --- Stile form (label campi e intestazioni sezione)
  formLabelColor: string
  formLabelFontSize: number
  sectionHeaderColor: string
  sectionHeaderFontSize: number
  sectionDividerColor: string
  sectionDividerWidth: number

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


  // --- Nuova pratica inline + mappa
  enableCreateWithoutSelection: boolean
  useMapWidgetIds: string[]
  mapLayerTitle: string   // titolo del layer rapporti nella mappa (match deterministico)
  officeLonWgs84: number
  officeLatWgs84: number

  // --- Preset
  presets: FieldPreset[]
  activePresetId: string

  // --- Layout campi (posizione e dimensione per tab)
  fieldLayouts: Record<string, LayoutRow[]>
  fieldGap: number
}

export const defaultConfig: Config = {
  schemaLayerUrl: '',
  schemaLayerLabel: '',
  schemaFields: [],

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

  modeBgCreate: '#f0fdf4',   // verde chiaro → nuovo rapporto
  modeBgEdit:   '#eff6ff',   // azzurro chiaro → modifica

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

  formLabelColor: '#6b7280',
  formLabelFontSize: 12,
  sectionHeaderColor: '#1d4ed8',
  sectionHeaderFontSize: 11,
  sectionDividerColor: '#bfdbfe',
  sectionDividerWidth: 2,

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


  enableCreateWithoutSelection: true,
  useMapWidgetIds: [],
  mapLayerTitle: '',
  officeLonWgs84: 0,
  officeLatWgs84: 0,

  presets: [],
  activePresetId: '',

  fieldLayouts: {},
  fieldGap: 12
}

export const DEFAULT_FIELD_LAYOUTS: Record<string, LayoutRow[]> = {
  anagrafica: [
    { type: 'special', id: '_dati_gen_label' },
    { type: 'fields', columns: '1fr 1fr 1fr', cells: [
      { field: 'tecnico_rilevatore' }, { field: 'ufficio_zona' }, { field: 'data_rilevazione' }
    ]},
    { type: 'header', label: 'Trasgressore' },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'tipologia_soggetto' }, {}] },
    { type: 'fields', columns: '1fr 1fr 1fr', cells: [{ field: 'nome' }, { field: 'cognome' }, { field: 'codice_fiscale' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'ragione_sociale' }, { field: 'piva' }] },
    { type: 'fields', columns: '1fr 1fr 1fr', cells: [{ field: 'via' }, { field: 'civico' }, { field: 'citta' }] },
    { type: 'fields', columns: '1fr 1fr 1fr', cells: [{ field: 'cap' }, { field: 'telefono' }, { field: 'cellulare' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'email' }, { field: 'pec' }] }
  ],
  violazione: [
    { type: 'special', id: '_localizzazione' },
    { type: 'header', label: 'Art. 15 — Prelievo abusivo' },
    { type: 'fields', columns: '1fr', cells: [{ field: 'tipo_abuso' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'sup_dichiarata_art15' }, { field: 'sup_irrigata_art15' }] },
    { type: 'header', label: 'Artt. 16 e 17 — Inosservanza termini' },
    { type: 'fields', columns: '1fr', cells: [{ field: 'norma16_17' }] },
    { type: 'fields', columns: '1fr', cells: [{ field: 'art17_tipo' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'sup_dichiarata_art16' }, { field: 'sup_irrigata_art16' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'sup_dichiarata_art17_1' }, { field: 'sup_irrigata_art17_1' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'sup_dichiarata_art17_2' }, { field: 'sup_irrigata_art17_2' }] },
    { type: 'header', label: 'Altre violazioni' },
    { type: 'special', id: '_checkboxes_norma3' },
    { type: 'header', label: 'Valutazione (Sezione riservata al Responsabile Istruttore)' },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'grado' }, { field: 'norma15_sel' }] },
    { type: 'header', label: 'Descrizione' },
    { type: 'fields', columns: '1fr', cells: [{ field: 'descrizione_fatti' }] },
    { type: 'fields', columns: '1fr', cells: [{ field: 'circostanze' }] },
    { type: 'fields', columns: '1fr', cells: [{ field: 'presenza_trasgressore' }] },
    { type: 'header', label: 'Descrizione del luogo' },
    { type: 'fields', columns: '1fr', cells: [{ field: 'descrizione_luogo' }] },
    { type: 'header', label: 'Fine compilazione' },
    { type: 'fields', columns: '1fr', cells: [{ field: 'data_firma' }] }
  ],
  dati_tecnici: [
    { type: 'header', label: 'Dati tecnici' },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'distretto' }, { field: 'comizio' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'idrante' }, { field: 'matricola_contatore' }] },
    { type: 'fields', columns: '1fr', cells: [{ field: 'matricola_tessera' }] }
  ]
}

export type IMConfig = ImmutableObject<Config>

export const defaultIMConfig: IMConfig = Immutable(defaultConfig) as any

import { type ImmutableObject } from 'jimu-core'

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
  trasgressore: string[]
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

  // --- Sorgenti layer / tabelle
  motherLayerUrl?: string
  auditTableUrl?: string
  displayMode?: string

  nsImportPrezzariUrl?: string
  nsPrezzarioRegionaleArticoliUrl?: string
  nsPrezzarioInternoArticoliUrl?: string
  nsNuoviPrezziUrl?: string
  nsNotaSpeseDettaglioUrl?: string
  nsParametriUrl?: string
  nsParametroCode?: string
  regolamentoArticoliUrl?: string

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

  // --- Colore sfondo per modalità (distingue visivamente nuova pratica da modifica)
  modeBgCreate: string   // sfondo quando il widget è in modalità "Nuova pratica"
  modeBgEdit: string     // sfondo quando il widget è in modalità "Modifica pratica"

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

  // --- Stile form (etichette, campi, card/sezioni)
  formLabelColor: string
  formLabelFontSize: number
  formLabelFontWeight: number
  formLabelMarginBottom: number
  formFieldColor: string
  formFieldFontSize: number
  formFieldHeight: number
  formFieldPaddingX: number
  formFieldBorderColor: string
  formFieldBorderWidth: number
  formFieldBorderRadius: number
  formFieldBg: string
  formFieldDisabledBg: string
  formFieldDisabledColor: string
  formSectionGap: number
  formCardBg: string
  formCardBorderColor: string
  formCardBorderWidth: number
  formCardBorderRadius: number
  formCardShadow: string
  formCardHeaderBg: string
  formCardHeaderColor: string
  formCardHeaderFontSize: number
  formCardHeaderFontWeight: number
  formCardHeaderPaddingX: number
  formCardHeaderPaddingY: number
  formCardBodyPadding: number
  sectionHeaderColor: string
  sectionHeaderFontSize: number
  sectionDividerColor: string
  sectionDividerWidth: number
  norma3FontSize: number
  norma3GradeColumnWidth: number
  norma3RowGap: number
  violazioneDescrizioneRows: number
  violazioneCircostanzeRows: number

  // --- Anteprima PDF
  anteprimaPdfPaddingTop: number
  anteprimaPdfPaddingX: number
  anteprimaPdfPaddingBottom: number
  anteprimaPdfBottomRadius: number

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
  trasgressoreFields?: string[]
  violazioneFields?: string[]
  allegatiFields?: string[]
  iterExtraFields?: string[]

  // --- Modalità
  showDatiGenerali: boolean


  // --- Nuova pratica inline + mappa
  enableCreateWithoutSelection: boolean
  useMapWidgetIds: string[]
  mapLayerTitle: string   // titolo del layer rapporti nella mappa (fallback)
  mapLayerUrl: string
  mapLayerId: string
  mapLayerLayerId: string
  officeLonWgs84: number
  officeLatWgs84: number

  // --- Preset
  presets: FieldPreset[]
  activePresetId: string

  // --- Layout campi (posizione e dimensione per tab)
  fieldLayouts: Record<string, LayoutRow[]>
  fieldGap: number

  // --- Scheda Violazione (layout speciale)
  violazioneLayoutLeftPercent: number
  violazioneLayoutMinLeftPx: number
  violazioneLayoutMinRightPx: number
  violazioneSplitterWidth: number
  violazioneSplitterColor: string
}

export const defaultConfig: Config = {
  schemaLayerUrl: '',
  schemaLayerLabel: '',
  schemaFields: [],

  motherLayerUrl: '',
  auditTableUrl: '',
  displayMode: 'page',

  nsImportPrezzariUrl: '',
  nsPrezzarioRegionaleArticoliUrl: '',
  nsPrezzarioInternoArticoliUrl: '',
  nsNuoviPrezziUrl: '',
  nsNotaSpeseDettaglioUrl: '',
  nsParametriUrl: '',
  nsParametroCode: 'SPESE_GENERALI_PERC',
  regolamentoArticoliUrl: '',

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

  modeBgCreate: '#ecfdf5',   // verde chiaro → nuova pratica
  modeBgEdit:   '#edf5ff',   // azzurro chiaro → modifica

  panelBg: '#eef4fb',
  panelBorderColor: '#cbd8e6',
  panelBorderWidth: 1,
  panelBorderRadius: 10,
  panelPadding: 12,

  maskBg: '#eef4fb',
  maskBorderColor: '#cbd8e6',
  maskBorderWidth: 1,
  maskBorderRadius: 10,
  maskInnerPadding: 12,
  maskOuterOffset: 12,
  dividerColor: '#cbd8e6',

  titleFontSize: 14,
  statusFontSize: 13,
  msgFontSize: 15,

  formLabelColor: '#334155',
  formLabelFontSize: 12,
  formLabelFontWeight: 600,
  formLabelMarginBottom: 3,
  formFieldColor: '#0f172a',
  formFieldFontSize: 13,
  formFieldHeight: 32,
  formFieldPaddingX: 9,
  formFieldBorderColor: '#bfcede',
  formFieldBorderWidth: 1,
  formFieldBorderRadius: 7,
  formFieldBg: '#f8fbff',
  formFieldDisabledBg: '#e7eef7',
  formFieldDisabledColor: '#64748b',
  formSectionGap: 10,
  formCardBg: '#f8fbff',
  formCardBorderColor: '#c6d7ea',
  formCardBorderWidth: 1,
  formCardBorderRadius: 8,
  formCardShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
  formCardHeaderBg: 'linear-gradient(90deg, #0d3b66, #155e9d)',
  formCardHeaderColor: '#ffffff',
  formCardHeaderFontSize: 11,
  formCardHeaderFontWeight: 800,
  formCardHeaderPaddingX: 10,
  formCardHeaderPaddingY: 7,
  formCardBodyPadding: 10,
  sectionHeaderColor: '#0f4c81',
  sectionHeaderFontSize: 11,
  sectionDividerColor: '#93c5fd',
  sectionDividerWidth: 2,
  norma3FontSize: 12,
  norma3GradeColumnWidth: 142,
  norma3RowGap: 0,
  violazioneDescrizioneRows: 5,
  violazioneCircostanzeRows: 4,

  anteprimaPdfPaddingTop: 0,
  anteprimaPdfPaddingX: 0,
  anteprimaPdfPaddingBottom: 0,
  anteprimaPdfBottomRadius: 10,

  detailTitlePrefix: 'Dettaglio pratica n.',
  detailTitleBg: 'transparent',
  detailTitleHeight: 28,
  detailTitlePaddingBottom: 10,
  detailTitlePaddingLeft: 0,
  detailTitleFontSize: 14,
  detailTitleFontWeight: 600,
  detailTitleColor: '#0f172a',

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
    { id: 'dati_generali', label: 'Dati generali', fields: [], hideEmpty: false },
    { id: 'trasgressore', label: 'Trasgressore', fields: [], hideEmpty: false },
    { id: 'violazione', label: 'Violazione', fields: [], hideEmpty: true },
    { id: 'iter', label: 'Iter', fields: [], isIterTab: true, hideEmpty: false },
    { id: 'allegati', label: 'Allegati', fields: [], hideEmpty: true },
    { id: 'azioni', label: 'Azioni', fields: [], locked: true }
  ],

  showEditButtons: true,
  editOverlayColor: '#7c3aed',
  editPageColor: '#5b21b6',
  editPageId: 'page_45',
  fieldStatoTI: 'stato_TI',
  fieldPresaTI: 'presa_in_carico_TI',
  editMinStato: 2,
  editMaxStato: 2,
  editPresaRequiredVal: 2,

  showDatiGenerali: false,


  enableCreateWithoutSelection: true,
  useMapWidgetIds: [],
  mapLayerTitle: '',
  mapLayerUrl: '',
  mapLayerId: '',
  mapLayerLayerId: '',
  officeLonWgs84: 0,
  officeLatWgs84: 0,

  presets: [],
  activePresetId: '',

  fieldLayouts: {},
  fieldGap: 12,

  violazioneLayoutLeftPercent: 58,
  violazioneLayoutMinLeftPx: 520,
  violazioneLayoutMinRightPx: 360,
  violazioneSplitterWidth: 14,
  violazioneSplitterColor: '#94a3b8'
}

export const DEFAULT_FIELD_LAYOUTS: Record<string, LayoutRow[]> = {
  dati_generali: [
    { type: 'fields', columns: '1fr 1fr 1fr', cells: [{ field: 'area_cod', label: 'Area' }, { field: 'settore_cod', label: 'Settore' }, { field: 'ufficio_zona', label: 'Ufficio di zona' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'tecnico_rilevatore', label: 'Tecnico rilevatore' }, { field: 'data_rilevazione', label: 'Data rilevazione' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'ti_assegnato_nome', label: 'Tecnico istruttore' }, { field: 'data_firma', label: 'Data compilazione' }] }
  ],
  trasgressore: [
    { type: 'header', label: 'Trasgressore' },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'tipologia_soggetto' }, { field: 'qualifica_fondo' }] },
    { type: 'fields', columns: '1fr 1fr 1fr', cells: [{ field: 'nome' }, { field: 'cognome' }, { field: 'codice_fiscale' }] },
    { type: 'fields', columns: '2fr 1fr', cells: [{ field: 'ragione_sociale' }, { field: 'piva' }] },
    { type: 'header', label: 'Indirizzo / Sede legale' },
    { type: 'fields', columns: '4fr 1fr', cells: [{ field: 'via' }, { field: 'civico' }] },
    { type: 'fields', columns: '2fr 0.8fr 1fr 1.4fr', cells: [{ field: 'citta' }, { field: 'provincia' }, { field: 'cap' }, { field: 'stato' }] },
    { type: 'fields', columns: '1fr 1fr 1fr 1fr', cells: [{ field: 'telefono' }, { field: 'cellulare' }, { field: 'email' }, { field: 'pec' }] },
    { type: 'header', label: 'Domicilio per le notifiche' },
    { type: 'fields', columns: '1fr 2fr', cells: [{ field: 'dom_notifica_uguale' }, {}] },
    { type: 'fields', columns: '4fr 1fr', cells: [{ field: 'dom_notifica_via' }, { field: 'dom_notifica_civico' }] },
    { type: 'fields', columns: '2fr 0.8fr 1fr 1.4fr', cells: [{ field: 'dom_notifica_citta' }, { field: 'dom_notifica_provincia' }, { field: 'dom_notifica_cap' }, { field: 'dom_notifica_stato' }] },
    { type: 'special', id: '_header_rappresentante_legale' },
    { type: 'fields', columns: '1fr 1fr 1fr', cells: [{ field: 'rl_nome' }, { field: 'rl_cognome' }, { field: 'rl_cf' }] },
    { type: 'fields', columns: '2fr 1fr', cells: [{ field: 'rl_carica' }, { field: 'rl_dom_notifica' }] },
    { type: 'fields', columns: '4fr 1fr', cells: [{ field: 'rl_dom_via' }, { field: 'rl_dom_civico' }] },
    { type: 'fields', columns: '2fr 0.8fr 1fr 1.4fr', cells: [{ field: 'rl_dom_citta' }, { field: 'rl_dom_provincia' }, { field: 'rl_dom_cap' }, { field: 'rl_dom_stato' }] },
    { type: 'header', label: 'Note' },
    { type: 'fields', columns: '1fr', cells: [{ field: 'note_anagrafica' }] }
  ],
  violazione: [
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
    { type: 'fields', columns: '1fr', cells: [{ field: 'presenza_trasgressore' }] }
  ],
  dati_tecnici: [
    { type: 'special', id: '_localizzazione' },
    { type: 'header', label: 'Descrizione del luogo' },
    { type: 'fields', columns: '1fr', cells: [{ field: 'descrizione_luogo' }] },
    { type: 'header', label: 'Dati tecnici' },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'distretto' }, { field: 'comizio' }] },
    { type: 'fields', columns: '1fr 1fr', cells: [{ field: 'idrante' }, { field: 'matricola_contatore' }] },
    { type: 'fields', columns: '1fr', cells: [{ field: 'matricola_tessera' }] }
  ]
}

export type IMConfig = ImmutableObject<Config>

export const defaultIMConfig: IMConfig = defaultConfig as any

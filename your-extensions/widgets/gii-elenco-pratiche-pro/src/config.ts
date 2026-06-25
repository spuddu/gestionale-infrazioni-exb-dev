import { type ImmutableObject } from 'jimu-core'

export type SortDir = 'ASC' | 'DESC'

export interface FilterTab {
  dataSourceId: string
  label: string
}

/**
 * Colonna visualizzata nella lista.
 * `field` può essere un campo layer o un campo virtuale:
 *   __numero_rilevazione__ / __numero_pratica__ / __accertamento_numero_display__
 *   __stato_sint__ / __fase_istruttoria__ / __ultimo_agg__ / __prossima__
 */
export interface ColumnDef {
  id: string
  label: string
  field: string
  width: number
}

export interface Config {
  // --- Etichette filtri (tabs) per datasourceId
  filterTabs: FilterTab[]

  // --- Colonne visualizzate (gestione dinamica)
  columns: ColumnDef[]

  // --- Ordinamento default
  orderByField: string
  orderByDir: SortDir

  // --- Campi base
  fieldPratica: string
  fieldDataRilevazione: string
  fieldUfficio: string

  // --- Domini presa in carico
  presaDaPrendereVal: number
  presaPresaVal: number
  labelPresaDaPrendere: string
  labelPresaPresa: string

  // --- Domini stato (1..5)
  statoDaPrendereVal: number
  statoPresaVal: number
  statoIntegrazioneVal: number
  statoApprovataVal: number
  statoRespintaVal: number

  labelStatoDaPrendere: string
  labelStatoPresa: string
  labelStatoIntegrazione: string
  labelStatoApprovata: string
  labelStatoRespinta: string

  // --- Domini esito (1..3)
  esitoIntegrazioneVal: number
  esitoApprovataVal: number
  esitoRespintaVal: number
  labelEsitoIntegrazione: string
  labelEsitoApprovata: string
  labelEsitoRespinta: string

  // --- Query
  whereClause: string
  pageSize: number

  // --- Header
  showHeader: boolean

  // --- Layout colonne
  paddingLeftFirstCol: number
  gap: number

  // --- Vista lista
  rowGap: number
  rowPaddingX: number
  rowPaddingY: number
  rowMinHeight: number
  rowRadius: number
  rowBorderWidth: number
  rowBorderColor: string

  // --- Stili righe
  zebraEvenBg: string
  zebraOddBg: string
  hoverBg: string
  selectedBg: string
  selectedBorderColor: string
  selectedBorderWidth: number

  // --- Badge oggetto (barra in testa alla riga)
  oggettoBadgeEnabled: boolean
  oggettoBadgeWidth: number
  oggettoBadgeContentOffset: number
  oggettoBadgeOpacity: number
  oggettoBadgeColorNuovaRilevazione: string
  oggettoBadgeColorAssegnazione: string
  oggettoBadgeColorTrasmissione: string
  oggettoBadgeColorIntegrazione: string
  oggettoBadgeColorApprovazione: string // legacy: vecchia categoria accorpata, mantenuta solo come fallback
  oggettoBadgeColorApprovazioneTecnica: string
  oggettoBadgeColorApprovazioneAmministrativa: string
  oggettoBadgeColorNotifica: string
  oggettoBadgeColorRespingimento: string
  oggettoBadgeColorNeutro: string

  // --- Messaggi
  emptyMessage: string
  errorNoDs: string

  // --- Chip stato: aspetto
  statoChipRadius: number
  statoChipPadX: number
  statoChipPadY: number
  statoChipBorderW: number
  statoChipFontWeight: number
  statoChipFontSize: number
  statoChipFontStyle: 'normal' | 'italic'
  statoChipTextTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  statoChipLetterSpacing: number

  // --- Chip stato: colori (8 stati semantici)
  chipBgGiallo: string       // Da prendere in carico
  chipTextGiallo: string
  chipBorderGiallo: string

  chipBgAzzurro: string      // In carico → ora è Trasmesso
  chipTextAzzurro: string
  chipBorderAzzurro: string

  chipBgCeleste: string      // In carico
  chipTextCeleste: string
  chipBorderCeleste: string

  chipBgVerde: string        // Trasmesso a *, Approvato, Verbale trasmesso, Chiusa approvata
  chipTextVerde: string
  chipBorderVerde: string

  chipBgArancione: string    // In attesa di istruttoria / integrazioni / approvazione
  chipTextArancione: string
  chipBorderArancione: string

  chipBgRosso: string        // Respinto, Eliminato, Chiusa respinta
  chipTextRosso: string
  chipBorderRosso: string

  chipBgLilla: string        // Verbale da trasmettere
  chipTextLilla: string
  chipBorderLilla: string

  chipBgViola: string        // Verbale notificato
  chipTextViola: string
  chipBorderViola: string

  chipBgNeutro: string       // In corso di istruttoria (altri ruoli) / stato non riconosciuto
  chipTextNeutro: string
  chipBorderNeutro: string

  // Aspetto maschera (bordo pannello)
  maskOuterOffset: number
  maskInnerPadding: number
  maskBg: string
  maskBorderColor: string
  maskBorderWidth: number
  maskRadius: number

  // --- Titolo elenco (sopra l'area bianca)
  listTitleText: string
  listTitleHeight: number
  listTitlePaddingBottom: number
  listTitlePaddingLeft: number
  listTitleFontSize: number
  listTitleFontWeight: number
  listTitleColor: string
}

export type IMConfig = ImmutableObject<Config>

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'col_numero_rilevazione', label: 'N. rilevazione', field: '__numero_rilevazione__',  width: 150 },
  { id: 'col_numero',             label: 'N. rapporto',    field: '__numero_pratica__',      width: 140 },
  { id: 'col_accertamento_numero',  label: 'N. atto',       field: '__accertamento_numero_display__', width: 120 },
  { id: 'col_data',            label: 'Data rilevazione', field: 'data_rilevazione',           width: 140 },
  { id: 'col_ufficio',         label: 'Ufficio origine',  field: 'ufficio_zona',               width: 190 },
  { id: 'col_stato',           label: 'Il mio stato',     field: '__stato_sint__',             width: 170 },
  { id: 'col_fase',            label: 'Fase istruttoria', field: '__fase_istruttoria__',        width: 150 },
  { id: 'col_causale',         label: 'Stato',            field: '__causale__',                width: 250 },
  { id: 'col_mittente',        label: 'Mittente',         field: '__mittente__',               width: 210 },
  { id: 'col_prossima',        label: 'Destinatario',     field: '__prossima__',               width: 210 },
  { id: 'col_data_msg',        label: 'Ultimo agg.',      field: '__data_msg__',               width: 150 }
]

export const defaultConfig: IMConfig = {
  filterTabs: [],
  columns: DEFAULT_COLUMNS,

  orderByField: 'objectid',
  orderByDir: 'DESC',

  // Campi base
  fieldPratica: 'objectid',
  fieldDataRilevazione: 'data_rilevazione',
  fieldUfficio: 'ufficio_zona',

  // Domini presa
  presaDaPrendereVal: 1,
  presaPresaVal: 2,
  labelPresaDaPrendere: 'Da prendere in carico',
  labelPresaPresa: 'Presa in carico',

  // Domini stato 1..5
  statoDaPrendereVal: 1,
  statoPresaVal: 2,
  statoIntegrazioneVal: 3,
  statoApprovataVal: 4,
  statoRespintaVal: 5,

  labelStatoDaPrendere: 'Da prendere',
  labelStatoPresa: 'Presa in carico',
  labelStatoIntegrazione: 'Integrazione richiesta',
  labelStatoApprovata: 'Approvata',
  labelStatoRespinta: 'Respinta',

  // Domini esito 1..3
  esitoIntegrazioneVal: 1,
  esitoApprovataVal: 2,
  esitoRespintaVal: 3,
  labelEsitoIntegrazione: 'Integrazione richiesta',
  labelEsitoApprovata: 'Approvata',
  labelEsitoRespinta: 'Respinta',

  whereClause: '1=1',
  pageSize: 200,

  showHeader: true,

  paddingLeftFirstCol: 0,
  gap: 12,

  rowGap: 8,
  rowPaddingX: 12,
  rowPaddingY: 10,
  rowMinHeight: 44,
  rowRadius: 12,
  rowBorderWidth: 1,
  rowBorderColor: 'rgba(0,0,0,0.08)',

  zebraEvenBg: '#ffffff',
  zebraOddBg: '#fbfbfb',
  hoverBg: '#f2f6ff',
  selectedBg: '#eaf2ff',
  selectedBorderColor: '#2f6fed',
  selectedBorderWidth: 2,

  // Badge oggetto (barra in testa alla riga)
  oggettoBadgeEnabled: true,
  oggettoBadgeWidth: 8,
  oggettoBadgeContentOffset: 10,
  oggettoBadgeOpacity: 1,
  oggettoBadgeColorNuovaRilevazione: '#7dd3fc',
  oggettoBadgeColorAssegnazione: '#2f6fed',
  oggettoBadgeColorTrasmissione: '#8b5cf6',
  oggettoBadgeColorIntegrazione: '#ff6400',
  oggettoBadgeColorApprovazione: '#009246',
  oggettoBadgeColorApprovazioneTecnica: '#009246',
  oggettoBadgeColorApprovazioneAmministrativa: '#16a34a',
  oggettoBadgeColorNotifica: '#0f766e',
  oggettoBadgeColorRespingimento: '#dc2626',
  oggettoBadgeColorNeutro: '#d0d0d0',

  emptyMessage: 'Nessun record trovato (view/filtro/permessi).',
  errorNoDs: 'Configura la fonte dati del widget.',

  statoChipRadius: 999,
  statoChipPadX: 10,
  statoChipPadY: 4,
  statoChipBorderW: 1,
  statoChipFontWeight: 600,
  statoChipFontSize: 12,
  statoChipFontStyle: 'normal',
  statoChipTextTransform: 'none',
  statoChipLetterSpacing: 0,

  // Chip stato — palette satura
  chipBgGiallo: '#feeb22',
  chipTextGiallo: '#5a4000',
  chipBorderGiallo: '#c9b800',

  chipBgAzzurro: '#2f6fed',
  chipTextAzzurro: '#ffffff',
  chipBorderAzzurro: '#1d4ed8',

  chipBgCeleste: '#7dd3fc',
  chipTextCeleste: '#0c4a6e',
  chipBorderCeleste: '#38bdf8',

  chipBgVerde: '#009246',
  chipTextVerde: '#ffffff',
  chipBorderVerde: '#006b33',

  chipBgArancione: '#ff6400',
  chipTextArancione: '#ffffff',
  chipBorderArancione: '#cc5000',

  chipBgRosso: '#dc2626',
  chipTextRosso: '#ffffff',
  chipBorderRosso: '#991b1b',

  chipBgLilla: '#faf5ff',
  chipTextLilla: '#6b21a8',
  chipBorderLilla: '#d8b4fe',

  chipBgViola: '#ede9fe',
  chipTextViola: '#4c1d95',
  chipBorderViola: '#a78bfa',

  chipBgNeutro: '#f2f2f2',
  chipTextNeutro: '#333333',
  chipBorderNeutro: '#d0d0d0',

  // Aspetto maschera (bordo pannello)
  maskOuterOffset: 12,
  maskInnerPadding: 8,
  maskBg: '#ffffff',
  maskBorderColor: 'rgba(0,0,0,0.12)',
  maskBorderWidth: 1,
  maskRadius: 12,

  // Titolo elenco
  listTitleText: 'Elenco pratiche',
  listTitleHeight: 28,
  listTitlePaddingBottom: 10,
  listTitlePaddingLeft: 0,
  listTitleFontSize: 14,
  listTitleFontWeight: 600,
  listTitleColor: 'rgba(0,0,0,0.85)'
} as unknown as IMConfig

export default defaultConfig

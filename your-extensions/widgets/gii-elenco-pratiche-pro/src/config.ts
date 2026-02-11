import { type ImmutableObject, Immutable } from 'jimu-core'

export type SortDir = 'ASC' | 'DESC'

export interface FilterTab {
  dataSourceId: string
  label: string
}

/**
 * Colonna visualizzata nella lista.
 * `field` può essere un campo layer o un campo virtuale:
 *   __stato_sint__  /  __ultimo_agg__  /  __prossima__
 */
export interface ColumnDef {
  id: string
  label: string
  field: string
  width: number
}

/**
 * Larghezze colonne (px)
 */
export interface ColWidths {
  pratica: number
  data: number
  ufficio: number
  stato: number
  ultimo: number
  prossima: number
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

  // --- Campi DT (Direttore Tecnico/Agrario)
  fieldPresaDT: string
  fieldDtPresaDT: string
  fieldStatoDT: string
  fieldDtStatoDT: string
  fieldEsitoDT: string
  fieldDtEsitoDT: string

  // --- Campi DA (Direttore Area Amministrativa)
  fieldPresaDA: string
  fieldDtPresaDA: string
  fieldStatoDA: string
  fieldDtStatoDA: string
  fieldEsitoDA: string
  fieldDtEsitoDA: string

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

  // --- Header labels
  showHeader: boolean
  headerPratica: string
  headerData: string
  headerUfficio: string
  headerStato: string
  headerUltimoAgg: string
  headerProssima: string

  // --- Layout colonne
  paddingLeftFirstCol: number
  gap: number
  colWidths: ColWidths

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

  // --- Chip stato: colori
  statoBgDaPrendere: string
  statoTextDaPrendere: string
  statoBorderDaPrendere: string

  statoBgPresa: string
  statoTextPresa: string
  statoBorderPresa: string

  statoBgAltro: string
  statoTextAltro: string
  statoBorderAltro: string

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
  { id: 'col_pratica',   label: 'N. pratica',      field: 'objectid',          width: 120 },
  { id: 'col_data',      label: 'Data rilev.',      field: 'data_rilevazione',  width: 150 },
  { id: 'col_stato',     label: 'Stato sintetico',  field: '__stato_sint__',    width: 220 },
  { id: 'col_ufficio',   label: 'Ufficio',          field: 'ufficio_zona',      width: 170 },
  { id: 'col_ultimo',    label: 'Ultimo agg.',      field: '__ultimo_agg__',    width: 170 },
  { id: 'col_prossima',  label: 'Prossima azione',  field: '__prossima__',      width: 240 }
]

export const defaultConfig: IMConfig = Immutable({
  filterTabs: [],
  columns: DEFAULT_COLUMNS,

  orderByField: 'objectid',
  orderByDir: 'DESC',

  // Campi base
  fieldPratica: 'objectid',
  fieldDataRilevazione: 'data_rilevazione',
  fieldUfficio: 'ufficio_zona',

  // DT
  fieldPresaDT: 'presa_in_carico_DT',
  fieldDtPresaDT: 'dt_presa_in_carico_DT',
  fieldStatoDT: 'stato_DT',
  fieldDtStatoDT: 'dt_stato_DT',
  fieldEsitoDT: 'esito_DT',
  fieldDtEsitoDT: 'dt_esito_DT',

  // DA
  fieldPresaDA: 'presa_in_carico_DA',
  fieldDtPresaDA: 'dt_presa_in_carico_DA',
  fieldStatoDA: 'stato_DA',
  fieldDtStatoDA: 'dt_stato_DA',
  fieldEsitoDA: 'esito_DA',
  fieldDtEsitoDA: 'dt_esito_DA',

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
  headerPratica: 'N. pratica',
  headerData: 'Data rilev.',
  headerUfficio: 'Ufficio',
  headerStato: 'Stato sintetico',
  headerUltimoAgg: 'Ultimo agg.',
  headerProssima: 'Prossima azione',

  paddingLeftFirstCol: 0,
  gap: 12,
  colWidths: {
    pratica: 120,
    data: 150,
    stato: 220,
    ufficio: 170,
    ultimo: 170,
    prossima: 240
  },

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

  statoBgDaPrendere: '#fff7e6',
  statoTextDaPrendere: '#7a4b00',
  statoBorderDaPrendere: '#ffd18a',

  statoBgPresa: '#eaf7ef',
  statoTextPresa: '#1f6b3a',
  statoBorderPresa: '#9ad2ae',

  statoBgAltro: '#f2f2f2',
  statoTextAltro: '#333333',
  statoBorderAltro: '#d0d0d0',

  // Aspetto maschera (bordo pannello)
  maskOuterOffset: 12,
  maskInnerPadding: 8,
  maskBg: '#ffffff',
  maskBorderColor: 'rgba(0,0,0,0.12)',
  maskBorderWidth: 1,
  maskRadius: 12,

  // Titolo elenco
  listTitleText: 'Elenco rapporti di rilevazione',
  listTitleHeight: 28,
  listTitlePaddingBottom: 10,
  listTitlePaddingLeft: 0,
  listTitleFontSize: 14,
  listTitleFontWeight: 600,
  listTitleColor: 'rgba(0,0,0,0.85)'
})

export default defaultConfig

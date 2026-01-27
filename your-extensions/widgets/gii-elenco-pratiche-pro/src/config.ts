import { type ImmutableObject, Immutable } from 'jimu-core'

export type SortDir = 'ASC' | 'DESC'

export interface FilterTab {
  dataSourceId: string
  label: string
}

export interface ColWidths {
  pratica: number
  data: number
  ufficio: number
  stato: number
  dt_presa: number
}

export interface Config {
  // --- Etichette filtri (tabs) per datasourceId
  filterTabs: FilterTab[]

  // --- Ordinamento default (dalla sezione contenuti)
  orderByField: string
  orderByDir: SortDir

  // --- Campi layer
  fieldPratica: string
  fieldDataRilevazione: string
  fieldUfficio: string
  fieldStatoPresa: string
  fieldDataPresa: string

  // --- Valori dominio / logica
  valoreDaPrendere: number
  valorePresa: number

  // --- Testi
  labelDaPrendere: string
  labelPresa: string
  labelBtnTakeAttivo: string
  labelBtnTakeDisattivo: string

  // --- Query
  whereClause: string
  pageSize: number

  // --- Header labels
  showHeader: boolean
  headerPratica: string
  headerData: string
  headerUfficio: string
  headerStato: string
  headerDtPresa: string
  headerAzioni: string

  // --- Layout colonne
  paddingLeftFirstCol: number
  gap: number
  btnWidth: number
  colWidths: ColWidths

  // --- Vista lista (stile List widget)
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
  msgSuccess: string
  msgErrorPrefix: string
  confirmTitle: string
  confirmMessage: string
  confirmYes: string
  confirmNo: string
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
}

export type IMConfig = ImmutableObject<Config>

export const defaultConfig: IMConfig = Immutable({
  filterTabs: [],

  orderByField: 'objectid',
  orderByDir: 'DESC',

  fieldPratica: 'objectid',
  fieldDataRilevazione: 'data_rilevazione',
  fieldUfficio: 'ufficio_zona',
  fieldStatoPresa: 'presa_in_carico_DIR_AGR',
  fieldDataPresa: 'dt_presa_in_carico_DIR_AGR',

  valoreDaPrendere: 1,
  valorePresa: 2,

  labelDaPrendere: 'Da prendere in carico',
  labelPresa: 'Presa in carico',
  labelBtnTakeAttivo: 'Prendi in carico',
  labelBtnTakeDisattivo: 'Già in carico',

  whereClause: '1=1',
  pageSize: 200,

  showHeader: true,
  headerPratica: 'N. pratica',
  headerData: 'Data rilevazione',
  headerUfficio: 'Ufficio',
  headerStato: 'Stato pratica',
  headerDtPresa: 'Dt. presa',
  headerAzioni: 'Azioni',

  paddingLeftFirstCol: 0,
  gap: 12,
  btnWidth: 160,
  colWidths: {
    pratica: 140,
    data: 140,
    ufficio: 180,
    stato: 220,
    dt_presa: 180
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

  msgSuccess: 'Presa in carico salvata.',
  msgErrorPrefix: 'Errore salvataggio: ',
  confirmTitle: 'Conferma',
  confirmMessage: 'Vuoi prendere in carico questa pratica?',
  confirmYes: 'Sì',
  confirmNo: 'No',
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
  statoBorderAltro: '#d0d0d0'
})

export default defaultConfig

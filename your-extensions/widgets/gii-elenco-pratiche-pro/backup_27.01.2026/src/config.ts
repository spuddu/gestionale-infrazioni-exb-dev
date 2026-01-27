import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
  fieldPratica: string
  fieldDataRilevazione: string
  fieldUfficio: string
  fieldStatoPresa: string
  fieldDataPresa: string

  valoreDaPrendere: number
  valorePresa: number

  labelDaPrendere: string
  labelPresa: string
  labelBtnTakeAttivo: string
  labelBtnTakeDisattivo: string

  whereClause: string
  pageSize: number
  orderByField: string
  orderByDir: 'ASC' | 'DESC'

  showHeader: boolean
  headerPratica: string
  headerData: string
  headerUfficio: string
  headerStato: string
  headerDtPresa: string
  headerAzioni: string

  paddingLeftFirstCol: number
  gap: number
  btnWidth: number
  colWidths: {
    pratica: number
    data: number
    ufficio: number
    stato: number
    dt_presa: number
  }

  zebraEvenBg: string
  zebraOddBg: string
  hoverBg: string
  selectedBg: string
  selectedBorderColor: string
  selectedBorderWidth: number

  // chip
  statoChipRadius: number
  statoChipPadX: number
  statoChipPadY: number
  statoChipBorderW: number

  // ✅ formato testo chip
  statoChipFontWeight: number
  statoChipFontSize: number
  statoChipFontStyle: 'normal' | 'italic'
  statoChipTextTransform: 'none' | 'uppercase' | 'capitalize'
  statoChipLetterSpacing: number

  statoBgDaPrendere: string
  statoTextDaPrendere: string
  statoBorderDaPrendere: string

  statoBgPresa: string
  statoTextPresa: string
  statoBorderPresa: string

  statoBgAltro: string
  statoTextAltro: string
  statoBorderAltro: string

  emptyMessage: string
  errorNoDs: string
  msgSuccess: string
  msgErrorPrefix: string
  confirmTitle: string
  confirmMessage: string
  confirmYes: string
  confirmNo: string
}

export type IMConfig = ImmutableObject<Config>

export const defaultConfig: IMConfig = Immutable({
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
  pageSize: 50,
  orderByField: '',
  orderByDir: 'ASC',

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

  colWidths: { pratica: 140, data: 140, ufficio: 180, stato: 220, dt_presa: 180 },

  zebraEvenBg: '#ffffff',
  zebraOddBg: '#fbfbfb',
  hoverBg: '#f2f6ff',
  selectedBg: '#eaf2ff',
  selectedBorderColor: '#2f6fed',
  selectedBorderWidth: 2,

  statoChipRadius: 999,
  statoChipPadX: 10,
  statoChipPadY: 4,
  statoChipBorderW: 1,

  // ✅ defaults formato testo
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

  emptyMessage: 'Nessun record trovato (view/filtro/permessi).',
  errorNoDs: 'Configura la fonte dati del widget.',
  msgSuccess: 'Presa in carico salvata.',
  msgErrorPrefix: 'Errore salvataggio: ',

  confirmTitle: 'Conferma',
  confirmMessage: 'Vuoi prendere in carico questa pratica?',
  confirmYes: 'Sì',
  confirmNo: 'No'
})

export default defaultConfig

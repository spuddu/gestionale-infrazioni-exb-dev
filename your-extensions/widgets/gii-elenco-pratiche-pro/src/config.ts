import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
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

  // --- Query / ordinamento
  pageSize: number
  orderByField: string
  orderByDir: 'ASC' | 'DESC'

  // --- Layout colonne
  showHeader: boolean
  paddingLeftFirstCol: number
  colWPratica: number
  colWData: number
  colWStato: number
  colWUfficio: number
  colWAzioni: number
  btnWidth: number

  // --- Stili righe
  zebra: boolean
  zebraEvenBg: string
  zebraOddBg: string
  hoverBg: string
  selectedBg: string
  selectedBorderColor: string
  selectedBorderWidth: number
}

export type IMConfig = ImmutableObject<Config>

export const defaultConfig: IMConfig = Immutable({
  // campi (metti i default “ragionevoli”, poi li cambi da Contenuti)
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

  pageSize: 200,
  orderByField: 'objectid',
  orderByDir: 'DESC',

  showHeader: true,
  paddingLeftFirstCol: 10,
  colWPratica: 90,
  colWData: 160,
  colWStato: 220,
  colWUfficio: 170,
  colWAzioni: 190,
  btnWidth: 150,

  zebra: true,
  zebraEvenBg: '#ffffff',
  zebraOddBg: '#f7f8fa',
  hoverBg: '#f1f6ff',
  selectedBg: '#eaf2ff',
  selectedBorderColor: '#2f6fed',
  selectedBorderWidth: 2
})

import { type ImmutableObject, Immutable } from 'jimu-core'

export interface Config {
  // --- Testo pulsante
  buttonText: string

  // --- Colori pulsanti (hex) — sfondo + testo
  takeColor: string
  takeTextColor: string
  integrazioneColor: string
  integrazioneTextColor: string
  approvaColor: string
  approvaTextColor: string
  approvaRapportoColor: string
  approvaRapportoTextColor: string
  respingiColor: string
  respingiTextColor: string

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
  detailTitleBg: string

  // --- Stile pulsanti principali
  btnBorderRadius: number
  btnFontSize: number
  btnFontWeight: number
  btnPaddingX: number
  btnPaddingY: number

  // --- Pulsanti editing TI
  showEditButtons: boolean
  editOverlayColor: string
  editPageColor: string
  editPageId: string
  editAmmPageId: string
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

  // --- Nota spese (URL feature layer)
  nsNotaSpeseDettaglioUrl: string
  nsParametriUrl: string
  nsParametroCode: string

  // --- Calcolo automatico sanzione (URL tabelle di consultazione)
  parametriSanzioniUrl: string
  regolamentoArticoliUrl: string
  regolamentoRaccordiUrl: string
}

export const defaultConfig: Config = {
  buttonText: 'Prendi in carico',

  takeColor: '#feeb22',
  takeTextColor: '#000000',
  integrazioneColor: '#e75a05',
  integrazioneTextColor: '#ffffff',
  approvaColor: '#2f6fed',
  approvaTextColor: '#ffffff',
  approvaRapportoColor: '#009246',
  approvaRapportoTextColor: '#ffffff',
  respingiColor: '#d13438',
  respingiTextColor: '#ffffff',

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

  showEditButtons: true,
  editOverlayColor: '#7c3aed',
  editPageColor: '#5b21b6',
  editPageId: 'page_45',
  editAmmPageId: 'page_48',
  fieldStatoTI: 'stato_TI',
  fieldPresaTI: 'presa_in_carico_TI',
  editMinStato: 2,
  editMaxStato: 2,
  editPresaRequiredVal: 2,

  nsNotaSpeseDettaglioUrl: '',
  nsParametriUrl: '',
  nsParametroCode: 'SPESE_GENERALI_PERC',

  parametriSanzioniUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_PARAMETRI_SANZIONI_AMM/FeatureServer/0',
  regolamentoArticoliUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_REGOLAMENTO_ARTICOLI/FeatureServer/0',
  regolamentoRaccordiUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_REGOLAMENTO_RACCORDI_AMM/FeatureServer/0',
}

export type IMConfig = ImmutableObject<Config>

export const defaultIMConfig: IMConfig = (Immutable as any)(defaultConfig) as any

import { type ImmutableObject, Immutable } from 'jimu-core'

export interface SummaryFieldConfig {
  name: string
  label: string
}

export interface Config {
  title: string
  subtitle: string
  detailTitlePrefix: string

  // Campi di sola lettura da mostrare nel riepilogo pratica.
  summaryFields: SummaryFieldConfig[]

  // Stili base, coerenti con gli altri cw GII.
  panelBg: string
  panelBorderColor: string
  panelBorderWidth: number
  panelBorderRadius: number
  panelPadding: number
  dividerColor: string

  titleFontSize: number
  titleFontWeight: number
  subtitleFontSize: number
  labelFontSize: number
  valueFontSize: number
  msgFontSize: number
  amountFontSize: number

  // Stile form/card, allineato alla scheda Nota spese del gii-editing-ti.
  maskBg: string
  maskBorderColor: string
  maskBorderWidth: number
  maskBorderRadius: number
  maskInnerPadding: number
  maskOuterOffset: number
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

  primaryColor: string
  primaryTextColor: string
  mutedBg: string
  warningBg: string
  warningTextColor: string

  showRoleBox: boolean
  showWorkflowBox: boolean

  // Tabelle consultive per parametri sanzionatori e riferimenti regolamentari.
  parametriSanzioniUrl: string
  regolamentoArticoliUrl: string
  regolamentoRaccordiUrl: string
}

export const defaultSummaryFields: SummaryFieldConfig[] = [
  { name: 'OBJECTID', label: 'OBJECTID' },
  { name: 'codice_rapporto', label: 'Codice rapporto' },
  { name: 'n_rapporto', label: 'N. rapporto' },
  { name: 'data_rilevazione', label: 'Data rilevazione' },
  { name: 'area_cod', label: 'Area' },
  { name: 'settore_cod', label: 'Settore' },
  { name: 'ti_amm_assegnato_username', label: 'TI_AMM assegnato' },
  { name: 'stato_TI_AMM', label: 'Stato TI_AMM' },
  { name: 'stato_RI_AMM', label: 'Stato RI_AMM' },
  { name: 'stato_DA', label: 'Stato DA' }
]

export const defaultConfig: Config = {
  title: 'Istruttoria amministrativa',
  subtitle: 'Predisposizione verbale, pagoPA, protocollo e notifica.',
  detailTitlePrefix: 'Pratica selezionata',

  summaryFields: defaultSummaryFields,

  panelBg: '#ffffff',
  panelBorderColor: '#e5e7eb',
  panelBorderWidth: 1,
  panelBorderRadius: 10,
  panelPadding: 14,
  dividerColor: '#e5e7eb',

  titleFontSize: 18,
  titleFontWeight: 700,
  subtitleFontSize: 13,
  labelFontSize: 12,
  valueFontSize: 13,
  msgFontSize: 14,
  amountFontSize: 16,

  maskBg: '#eef4fb',
  maskBorderColor: '#cbd8e6',
  maskBorderWidth: 1,
  maskBorderRadius: 10,
  maskInnerPadding: 12,
  maskOuterOffset: 12,
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

  primaryColor: '#0d3b66',
  primaryTextColor: '#ffffff',
  mutedBg: '#f6f7f9',
  warningBg: '#fff7ed',
  warningTextColor: '#9a3412',

  showRoleBox: true,
  showWorkflowBox: true,

  parametriSanzioniUrl: '',
  regolamentoArticoliUrl: '',
  regolamentoRaccordiUrl: '',
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = (Immutable as any)(defaultConfig) as any

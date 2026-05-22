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

  primaryColor: string
  primaryTextColor: string
  mutedBg: string
  warningBg: string
  warningTextColor: string

  showRoleBox: boolean
  showWorkflowBox: boolean
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
  subtitle: 'Scheda di lavorazione amministrativa su pratica già esistente.',
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

  primaryColor: '#0d3b66',
  primaryTextColor: '#ffffff',
  mutedBg: '#f6f7f9',
  warningBg: '#fff7ed',
  warningTextColor: '#9a3412',

  showRoleBox: true,
  showWorkflowBox: true,
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = (Immutable as any)(defaultConfig) as any

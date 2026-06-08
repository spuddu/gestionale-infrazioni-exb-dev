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
  formExpandableCardBg: string
  formExpandableCardBorderColor: string
  formExpandableCardBorderWidth: number
  formPhaseCardBg: string
  formPhaseCardBorderColor: string
  formPhaseCardBorderWidth: number
  formPhaseCardTitleColor: string
  formWorkflowBadgeBg: string
  formWorkflowBadgeBorderColor: string
  formWorkflowBadgeBorderWidth: number
  formWorkflowBadgeTitleColor: string
  formWorkflowBadgeLabelColor: string
  formWorkflowBadgeValueColor: string
  formWorkflowBadgeHighlightColor: string
  statusSummaryNormalBg: string
  statusSummaryNormalBorderColor: string
  statusSummaryAutoBg: string
  statusSummaryAutoBorderColor: string
  statusSummaryWarnBg: string
  statusSummaryWarnBorderColor: string
  statusSummaryTotalBg: string
  statusSummaryTotalBorderColor: string
  statusSummaryBorderWidth: number
  statusSummaryLabelColor: string
  statusSummaryValueColor: string
  statusSummaryHintColor: string
  statusSummaryTotalLabelColor: string
  statusSummaryTotalValueColor: string
  statusSummaryTotalHintColor: string
  verbaleInfoCardBg: string
  verbaleInfoCardBorderColor: string
  verbaleInfoCardBorderWidth: number
  verbaleInfoLabelColor: string
  verbaleInfoTipoTextColor: string
  verbaleInfoOggettoTextColor: string
  normGroupBg: string
  normGroupBorderColor: string
  normGroupBorderWidth: number
  normBlockSeparatorColor: string
  normVoceSeparatorColor: string
  normVoceLabelColor: string
  normParametroOkColor: string
  normParametroMissingColor: string
  normViolataCardBg: string
  normViolataBorderColor: string
  normViolataBorderWidth: number
  normViolataHeaderBg: string
  normViolataHeaderTextColor: string
  normViolataArrowColor: string
  normViolataBodyBg: string
  normViolataArticleTitleColor: string
  normViolataArticleTextColor: string
  normViolataArticleMetaColor: string
  normSanzionatoriaCardBg: string
  normSanzionatoriaBorderColor: string
  normSanzionatoriaBorderWidth: number
  normSanzionatoriaHeaderBg: string
  normSanzionatoriaHeaderTextColor: string
  normSanzionatoriaArrowColor: string
  normSanzionatoriaBodyBg: string
  normSanzionatoriaArticleTitleColor: string
  normSanzionatoriaArticleTextColor: string
  normSanzionatoriaArticleMetaColor: string
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
  labelFontSize: 15,
  valueFontSize: 15,
  msgFontSize: 14,
  amountFontSize: 16,

  maskBg: '#eef4fb',
  maskBorderColor: '#cbd8e6',
  maskBorderWidth: 1,
  maskBorderRadius: 10,
  maskInnerPadding: 12,
  maskOuterOffset: 12,
  formLabelColor: '#334155',
  formLabelFontSize: 15,
  formLabelFontWeight: 600,
  formLabelMarginBottom: 3,
  formFieldColor: '#0f172a',
  formFieldFontSize: 15,
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
  formExpandableCardBg: '#f9fafb',
  formExpandableCardBorderColor: '#e5e7eb',
  formExpandableCardBorderWidth: 1,
  formPhaseCardBg: '#f8fbff',
  formPhaseCardBorderColor: '#d7e3f2',
  formPhaseCardBorderWidth: 1,
  formPhaseCardTitleColor: '#0d3b66',
  formWorkflowBadgeBg: '#ffffff',
  formWorkflowBadgeBorderColor: '#d8e6f7',
  formWorkflowBadgeBorderWidth: 1,
  formWorkflowBadgeTitleColor: '#0d3b66',
  formWorkflowBadgeLabelColor: '#6b7280',
  formWorkflowBadgeValueColor: '#111827',
  formWorkflowBadgeHighlightColor: '#2563eb',
  statusSummaryNormalBg: '#f8fbff',
  statusSummaryNormalBorderColor: '#c5d9f1',
  statusSummaryAutoBg: '#f5f9ff',
  statusSummaryAutoBorderColor: '#bfdbfe',
  statusSummaryWarnBg: '#fff7ed',
  statusSummaryWarnBorderColor: '#fed7aa',
  statusSummaryTotalBg: 'linear-gradient(90deg, #0d3b66, #155e9d)',
  statusSummaryTotalBorderColor: '#0d3b66',
  statusSummaryBorderWidth: 1,
  statusSummaryLabelColor: '#6b7280',
  statusSummaryValueColor: '#111827',
  statusSummaryHintColor: '#6b7280',
  statusSummaryTotalLabelColor: 'rgba(255,255,255,0.86)',
  statusSummaryTotalValueColor: '#ffffff',
  statusSummaryTotalHintColor: 'rgba(255,255,255,0.78)',
  verbaleInfoCardBg: '#eff6ff',
  verbaleInfoCardBorderColor: '#dbeafe',
  verbaleInfoCardBorderWidth: 1,
  verbaleInfoLabelColor: '#64748b',
  verbaleInfoTipoTextColor: '#111827',
  verbaleInfoOggettoTextColor: '#374151',
  normGroupBg: '#ffffff',
  normGroupBorderColor: '#93c5fd',
  normGroupBorderWidth: 1,
  normBlockSeparatorColor: '#cbd5e1',
  normVoceSeparatorColor: '#eef2f7',
  normVoceLabelColor: '#111827',
  normParametroOkColor: '#166534',
  normParametroMissingColor: '#991b1b',
  normViolataCardBg: '#eff6ff',
  normViolataBorderColor: '#93c5fd',
  normViolataBorderWidth: 1,
  normViolataHeaderBg: '#dbeafe',
  normViolataHeaderTextColor: '#0f172a',
  normViolataArrowColor: '#1d4ed8',
  normViolataBodyBg: '#ffffff',
  normViolataArticleTitleColor: '#111827',
  normViolataArticleTextColor: '#374151',
  normViolataArticleMetaColor: '#6b7280',
  normSanzionatoriaCardBg: '#fff7f7',
  normSanzionatoriaBorderColor: '#fecaca',
  normSanzionatoriaBorderWidth: 1,
  normSanzionatoriaHeaderBg: '#fee2e2',
  normSanzionatoriaHeaderTextColor: '#7f1d1d',
  normSanzionatoriaArrowColor: '#b91c1c',
  normSanzionatoriaBodyBg: '#fffafa',
  normSanzionatoriaArticleTitleColor: '#111827',
  normSanzionatoriaArticleTextColor: '#374151',
  normSanzionatoriaArticleMetaColor: '#6b7280',
  formCardBorderColor: '#c6d7ea',
  formCardBorderWidth: 1,
  formCardBorderRadius: 8,
  formCardShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
  formCardHeaderBg: 'linear-gradient(90deg, #0d3b66, #155e9d)',
  formCardHeaderColor: '#ffffff',
  formCardHeaderFontSize: 14,
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

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

  // Stile form/card, allineato alla scheda Nota spese del gii-editing-tec.
  maskBg: string
  maskBorderColor: string
  maskBorderWidth: number
  maskBorderRadius: number
  infoMessageBorderRadius: number
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

  // Pannello e card dei gruppi Allegati tecnici / Allegati amministrativi.
  attachmentsPanelBg: string
  attachmentsPanelBorderColor: string
  attachmentsPanelBorderWidth: number
  attachmentsPanelBorderRadius: number
  attachmentsPanelPaddingTop: number
  attachmentsPanelPaddingRight: number
  attachmentsPanelPaddingBottom: number
  attachmentsPanelPaddingLeft: number
  attachmentsPanelShadow: string
  attachmentsPreviewGap: number
  attachmentsPreviewPanelBorderColor: string
  attachmentsPreviewPanelBorderWidth: number
  attachmentsPreviewPanelBorderRadius: number
  attachmentsPreviewPanelShadow: string
  attachmentsGroupGap: number
  attachmentsCardBg: string
  attachmentsCardBorderColor: string
  attachmentsCardBorderWidth: number
  attachmentsCardBorderRadius: number
  attachmentsCardShadow: string
  attachmentsHeaderBg: string
  attachmentsHeaderColor: string
  attachmentsHeaderFontSize: number
  attachmentsHeaderFontWeight: number
  attachmentsHeaderPaddingX: number
  attachmentsHeaderPaddingY: number
  attachmentsCardBodyPadding: number
  attachmentsRecordHoverBg: string
  attachmentsRecordSelectedBg: string

  // Pannello Fascicolo / Anteprima fascicolo.
  fascicoloPanelBorderColor: string
  fascicoloPanelBorderWidth: number
  fascicoloPanelBorderRadius: number
  fascicoloSidebarPaddingTop: number
  fascicoloSidebarPaddingRight: number
  fascicoloSidebarPaddingBottom: number
  fascicoloSidebarPaddingLeft: number
  fascicoloPreviewBackgroundColor: string
  fascicoloPreviewBorderColor: string
  fascicoloPreviewBorderWidth: number
  fascicoloPreviewBorderRadius: number
  fascicoloDocsCardBg: string
  fascicoloDocsCardBorderColor: string
  fascicoloDocsCardBorderWidth: number
  fascicoloDocsCardBorderRadius: number
  fascicoloDocsCardShadow: string
  fascicoloDocsGroupGap: number
  fascicoloDocsHeaderBg: string
  fascicoloDocsHeaderColor: string
  fascicoloDocsHeaderFontSize: number
  fascicoloDocsHeaderFontWeight: number
  fascicoloDocsHeaderPaddingX: number
  fascicoloDocsHeaderPaddingY: number
  fascicoloDocsBodyPadding: number
  fascicoloDocsTextColor: string
  fascicoloDocsDisabledTextColor: string

  // Padding contenuto schede (contenitore esterno di tutte le tab).
  tabPaddingTop: number
  tabPaddingRight: number
  tabPaddingBottom: number
  tabPaddingLeft: number

  // Barra Azioni condivisa dalle sezioni amministrative che espongono azioni operative.
  actionBarBg: string
  actionBarBorderColor: string
  actionBarBorderWidth: number
  actionBarBorderRadius: number
  actionBarPaddingX: number
  actionBarPaddingY: number
  actionBarTitleColor: string
  actionBarTitleFontSize: number
  actionBarButtonGap: number
  actionBarTopGap: number
  actionBarGapBg: string
  integrationCycleHorizontalSeparatorColor: string
  integrationCycleVerticalSeparatorColor: string

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

  // Tabella dettaglio nota spese (usata per il riepilogo nel rapporto tecnico del fascicolo).
  nsNotaSpeseDettaglioUrl: string
  nsParametriUrl: string
  nsParametroCode: string
}

export const defaultSummaryFields: SummaryFieldConfig[] = [
  { name: 'OBJECTID', label: 'OBJECTID' },
  { name: 'codice_rapporto', label: 'Codice rapporto' },
  { name: 'n_rapporto', label: 'N. rapporto' },
  { name: 'data_rilevazione', label: 'Data rilevazione' },
  { name: 'area_cod', label: 'Area' },
  { name: 'settore_cod', label: 'Settore' },
  { name: 'ia_assegnato_username', label: 'Istruttore amministrativo assegnato' },
  { name: 'stato_IA', label: 'Stato Istruttore amministrativo' },
  { name: 'stato_RIA', label: 'Stato RIA' },
  { name: 'determinazione_stato', label: 'Stato determinazione' }
]

export const defaultConfig: Config = {
  title: 'Istruttoria amministrativa',
  subtitle: 'Proposta di contestazione, determinazione, atto di accertamento, pagamento e notifica.',
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
  infoMessageBorderRadius: 8,
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
  formFieldDisabledBg: '#e8edf3',
  formFieldDisabledColor: '#1f2937',
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
  normViolataBodyBg: '#f8fbff',
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

  attachmentsPanelBg: '#ffffff',
  attachmentsPanelBorderColor: '#c6d7ea',
  attachmentsPanelBorderWidth: 1,
  attachmentsPanelBorderRadius: 8,
  attachmentsPanelPaddingTop: 0,
  attachmentsPanelPaddingRight: 0,
  attachmentsPanelPaddingBottom: 0,
  attachmentsPanelPaddingLeft: 0,
  attachmentsPanelShadow: 'none',
  attachmentsPreviewGap: 0,
  attachmentsPreviewPanelBorderColor: '#c6d7ea',
  attachmentsPreviewPanelBorderWidth: 1,
  attachmentsPreviewPanelBorderRadius: 8,
  attachmentsPreviewPanelShadow: 'none',
  attachmentsGroupGap: 10,
  attachmentsCardBg: '#f8fbff',
  attachmentsCardBorderColor: '#c6d7ea',
  attachmentsCardBorderWidth: 1,
  attachmentsCardBorderRadius: 8,
  attachmentsCardShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
  attachmentsHeaderBg: 'linear-gradient(90deg, #0d3b66, #155e9d)',
  attachmentsHeaderColor: '#ffffff',
  attachmentsHeaderFontSize: 14,
  attachmentsHeaderFontWeight: 800,
  attachmentsHeaderPaddingX: 10,
  attachmentsHeaderPaddingY: 7,
  attachmentsCardBodyPadding: 10,
  attachmentsRecordHoverBg: '#f8fbff',
  attachmentsRecordSelectedBg: '#eff6ff',

  fascicoloPanelBorderColor: '#c6d7ea',
  fascicoloPanelBorderWidth: 1,
  fascicoloPanelBorderRadius: 8,
  fascicoloSidebarPaddingTop: 10,
  fascicoloSidebarPaddingRight: 10,
  fascicoloSidebarPaddingBottom: 10,
  fascicoloSidebarPaddingLeft: 10,
  fascicoloPreviewBackgroundColor: '#282828',
  fascicoloPreviewBorderColor: '#c6d7ea',
  fascicoloPreviewBorderWidth: 1,
  fascicoloPreviewBorderRadius: 8,
  fascicoloDocsCardBg: '#f8fbff',
  fascicoloDocsCardBorderColor: '#c6d7ea',
  fascicoloDocsCardBorderWidth: 1,
  fascicoloDocsCardBorderRadius: 8,
  fascicoloDocsCardShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
  fascicoloDocsGroupGap: 10,
  fascicoloDocsHeaderBg: 'linear-gradient(90deg, #0d3b66, #155e9d)',
  fascicoloDocsHeaderColor: '#ffffff',
  fascicoloDocsHeaderFontSize: 12,
  fascicoloDocsHeaderFontWeight: 900,
  fascicoloDocsHeaderPaddingX: 10,
  fascicoloDocsHeaderPaddingY: 7,
  fascicoloDocsBodyPadding: 10,
  fascicoloDocsTextColor: '#334155',
  fascicoloDocsDisabledTextColor: '#94a3b8',

  // Stessi valori predefiniti del gii-editing-tec.
  tabPaddingTop: 12,
  tabPaddingRight: 2,
  tabPaddingBottom: 2,
  tabPaddingLeft: 2,

  actionBarBg: '#ffffff',
  actionBarBorderColor: '#e5e7eb',
  actionBarBorderWidth: 1,
  actionBarBorderRadius: 10,
  actionBarPaddingX: 11,
  actionBarPaddingY: 11,
  actionBarTitleColor: '#111827',
  actionBarTitleFontSize: 14,
  actionBarButtonGap: 10,
  actionBarTopGap: 8,
  actionBarGapBg: 'transparent',
  integrationCycleHorizontalSeparatorColor: '#d8e6f7',
  integrationCycleVerticalSeparatorColor: '#93c5fd',

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

  nsNotaSpeseDettaglioUrl: 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_NOTA_SPESE_DETTAGLIO/FeatureServer/0',
  nsParametriUrl: '',
  nsParametroCode: 'SPESE_GENERALI_PERC',
}

export type IMConfig = ImmutableObject<Config>
export const defaultIMConfig: IMConfig = (Immutable as any)(defaultConfig) as any

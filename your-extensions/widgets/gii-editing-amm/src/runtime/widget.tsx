/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, UrlManager, getAppStore } from 'jimu-core'
import AnteprimaPdfViewer from '../../../_shared/gii-anteprime/anteprima-pdf-viewer'
import { buildPropostaContestazionePdf as buildVerbalePdf, getPropostaContestazionePdfFilePrefix as getVerbalePdfFilePrefix } from '../../../_shared/gii-anteprime/documenti-amministrativi/proposta-contestazione/proposta-contestazione-pdf-builder'
import type { IMConfig, SummaryFieldConfig } from '../config'
import { defaultConfig } from '../config'
import { createPortal } from 'react-dom'

const LOG_EVENTI_CICLI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'
const NOTA_SPESE_DETTAGLIO_VIEW_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_NOTA_SPESE_DETTAGLIO/FeatureServer/0'

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}

type RoleCode = 'TI_AMM' | 'RI_AMM' | 'DA' | 'ADMIN' | string

type SelectedState = {
  ds?: any | null
  dsId?: string
  oid: number | null
  idFieldName: string
  layerUrl: string
  data: any | null
  source: 'datasource' | 'editIntent' | 'selection' | 'none'
  sig: string
}

type EditIntentInfo = {
  oid: number | null
  dsId?: string
  layerUrl?: string
  idFieldName?: string
  data?: any | null
  ts?: number
}

type LayerFieldInfo = {
  name: string
  type: string
  alias?: string
  domain?: any | null
  editable?: boolean
}

type SanzioneParametro = {
  codice_parametro: string
  categoria_parametro: string
  valore_num: any
  valore_testo: string
  anno_riferimento: any
  data_validita_da: any
  data_validita_a: any
  descrizione: string
  note: string
}

type RegolamentoArticolo = {
  codice_articolo: string
  numero_articolo: any
  titolo_articolo: string
  testo_articolo: string
  atto_regolamento: string
  anno_riferimento: any
  data_validita_da: any
  data_validita_a: any
  attivo: any
  note: string
}

type RegolamentoRaccordo = {
  codice_casistica: string
  articolo_violato: string
  articolo_sanzione: string
  codice_parametro: string
  descrizione: string
  attivo: any
}

type NotaSpeseDetailRow = {
  codiceCasistica: string
  codiceVoce: string
  descrizione: string
  importoRiga: number
}

type SanzioneConsultivaVoce = {
  codiceParametro: string
  descrizione: string
  articoloSanzione: string
  articoliSanzione: RegolamentoArticolo[]
  parametro?: SanzioneParametro | null
  valueOverride?: string
}

type SanzioneConsultivaGroup = {
  codiceCasistica: string
  descrizione: string
  articoloViolato: string
  articoloSanzione: string
  articoliViolati: RegolamentoArticolo[]
  articoliSanzione: RegolamentoArticolo[]
  voci: SanzioneConsultivaVoce[]
}

type SanzioneConsultivaLoadState = {
  loading: boolean
  error: string
  groups: SanzioneConsultivaGroup[]
  urlsReady: boolean
  casistiche: string[]
}

type AdminFieldKind = 'text' | 'textarea' | 'date' | 'number' | 'domain' | 'readonly-date' | 'readonly-text'

type AdminField = {
  name: string
  label: string
  kind: AdminFieldKind
  group: 'trasgressore' | 'atto' | 'verbale' | 'notifica' | 'sanzione' | 'attrezzature' | 'pagamento' | 'bonifico' | 'chiusura' | 'post_notifica' | 'ricorso' | 'cda' | 'riapertura' | 'definizione' | 'incasso'
  placeholder?: string
  full?: boolean
  readonly?: boolean
}

const ADMIN_COMPACT_FIELD_MIN_WIDTH = 240
const ADMIN_COMPACT_FIELD_MAX_WIDTH = 300
const ADMIN_COMPACT_GRID_COLUMNS = `repeat(auto-fit, minmax(${ADMIN_COMPACT_FIELD_MIN_WIDTH}px, ${ADMIN_COMPACT_FIELD_MAX_WIDTH}px))`
const ADMIN_NOTE_CASES_COLUMN = `minmax(${ADMIN_COMPACT_FIELD_MIN_WIDTH}px, ${ADMIN_COMPACT_FIELD_MAX_WIDTH}px) minmax(0, 1fr)`

const ADMIN_FIELDS: AdminField[] = [
  { group: 'trasgressore', name: 'tipologia_soggetto', label: 'Tipo soggetto', kind: 'domain' },
  { group: 'trasgressore', name: 'cognome', label: 'Cognome', kind: 'text' },
  { group: 'trasgressore', name: 'nome', label: 'Nome', kind: 'text' },
  { group: 'trasgressore', name: 'codice_fiscale', label: 'Codice fiscale', kind: 'text' },
  { group: 'trasgressore', name: 'ragione_sociale', label: 'Ragione sociale', kind: 'text', full: true },
  { group: 'trasgressore', name: 'piva', label: 'P. IVA', kind: 'text' },
  { group: 'trasgressore', name: 'via', label: 'Via/P.zza', kind: 'text' },
  { group: 'trasgressore', name: 'civico', label: 'Civico', kind: 'text' },
  { group: 'trasgressore', name: 'comune', label: 'Comune', kind: 'text' },
  { group: 'trasgressore', name: 'citta', label: 'Comune', kind: 'text' },
  { group: 'trasgressore', name: 'cap', label: 'CAP', kind: 'text' },
  { group: 'trasgressore', name: 'pec', label: 'PEC', kind: 'text' },
  { group: 'trasgressore', name: 'email', label: 'E-mail', kind: 'text' },
  { group: 'trasgressore', name: 'telefono', label: 'Telefono', kind: 'text' },
  { group: 'trasgressore', name: 'cellulare', label: 'Cellulare', kind: 'text' },

  { group: 'atto', name: 'tipo_atto_amm', label: 'Tipo atto amministrativo (automatico)', kind: 'domain', readonly: true },
  { group: 'atto', name: 'oggetto_atto_amm', label: 'Oggetto atto amministrativo (automatico)', kind: 'text', full: true, readonly: true },
  { group: 'verbale', name: 'numero_verbale', label: 'Numero verbale (assegnato all’approvazione DA)', kind: 'readonly-text', readonly: true },
  { group: 'verbale', name: 'data_verbale', label: 'Data verbale (assegnata all’approvazione DA)', kind: 'readonly-date', readonly: true },
  { group: 'verbale', name: 'note_atto_amm', label: 'Note amministrative', kind: 'textarea', full: true },

  { group: 'notifica', name: 'protocollo_verbale_numero', label: 'Numero protocollo atto', kind: 'text' },
  { group: 'notifica', name: 'protocollo_verbale_data', label: 'Data protocollo atto', kind: 'date' },
  { group: 'notifica', name: 'notifica_tipo', label: 'Tipo notifica', kind: 'domain' },
  { group: 'notifica', name: 'notifica_data', label: 'Data notifica', kind: 'date' },
  { group: 'notifica', name: 'notifica_esito', label: 'Esito notifica', kind: 'domain' },
  { group: 'notifica', name: 'notifica_estremi', label: 'Estremi notifica', kind: 'textarea', full: true },

  { group: 'sanzione', name: 'sanzione_importo_base', label: 'Importo sanzione base', kind: 'number' },
  { group: 'sanzione', name: 'sanzione_importo_ridotta', label: 'Importo sanzione ridotta', kind: 'number' },
  { group: 'sanzione', name: 'risarcimento_danni_importo', label: 'Importo risarcimento danni', kind: 'number' },
  { group: 'sanzione', name: 'sanzione_spese_notifica', label: 'Spese di notifica', kind: 'number' },
  { group: 'sanzione', name: 'sanzione_dettaglio_calcolo', label: 'Dettaglio calcolo sanzione', kind: 'textarea', full: true },
  { group: 'sanzione', name: 'sanzione_calcolata_il', label: 'Sanzione calcolata il', kind: 'readonly-date', readonly: true },
  { group: 'sanzione', name: 'sanzione_calcolata_da', label: 'Sanzione calcolata da', kind: 'readonly-text', readonly: true },

  { group: 'attrezzature', name: 'attrezzature_cauzione_presente', label: 'Cauzione presente', kind: 'domain' },
  { group: 'attrezzature', name: 'attrezzature_rimborso_importo', label: 'Rimborso attrezzature', kind: 'number' },
  { group: 'attrezzature', name: 'attrezzature_cauzione_decurtata', label: 'Cauzione decurtata', kind: 'number' },
  { group: 'attrezzature', name: 'attrezzature_importo_netto', label: 'Importo netto attrezzature', kind: 'number' },
  { group: 'attrezzature', name: 'attrezzature_rimborso_dettaglio', label: 'Dettaglio rimborso attrezzature', kind: 'textarea', full: true, placeholder: 'Indicare attrezzature, quantità e importi.' },
  { group: 'attrezzature', name: 'attrezzature_note', label: 'Note rimborso attrezzature', kind: 'textarea', full: true },

  { group: 'pagamento', name: 'pagamento_modalita', label: 'Modalità pagamento', kind: 'domain' },
  { group: 'pagamento', name: 'pagamento_importo_totale', label: 'Importo totale da pagare', kind: 'number' },
  { group: 'pagamento', name: 'pagamento_scadenza', label: 'Scadenza pagamento', kind: 'date' },
  { group: 'pagamento', name: 'pagamento_stato', label: 'Stato pagamento', kind: 'domain' },
  { group: 'pagamento', name: 'pagamento_note', label: 'Note pagamento', kind: 'textarea', full: true },
  { group: 'pagamento', name: 'pagopa_iuv', label: 'IUV pagoPA', kind: 'text' },
  { group: 'pagamento', name: 'pagopa_codice_avviso', label: 'Codice avviso pagoPA', kind: 'text' },

  { group: 'bonifico', name: 'bonifico_conto_cod', label: 'Conto corrente bonifico', kind: 'domain' },
  { group: 'bonifico', name: 'bonifico_iban_snapshot', label: 'IBAN bonifico', kind: 'text' },
  { group: 'bonifico', name: 'bonifico_intestatario_snapshot', label: 'Intestatario conto bonifico', kind: 'text' },
  { group: 'bonifico', name: 'bonifico_causale', label: 'Causale bonifico', kind: 'textarea', full: true },
  { group: 'bonifico', name: 'bonifico_cro_trn', label: 'CRO/TRN bonifico', kind: 'text' },
  { group: 'bonifico', name: 'bonifico_data_accredito', label: 'Data accredito bonifico', kind: 'date' },

  { group: 'chiusura', name: 'verbale_pdf_generato_il', label: 'PDF atto generato il', kind: 'readonly-date', readonly: true },
  { group: 'chiusura', name: 'verbale_pdf_generato_da', label: 'PDF atto generato da', kind: 'readonly-text', readonly: true },
  { group: 'chiusura', name: 'istruttoria_amm_chiusa_il', label: 'Istruttoria amministrativa chiusa il', kind: 'readonly-date', readonly: true },
  { group: 'chiusura', name: 'istruttoria_amm_chiusa_da', label: 'Istruttoria amministrativa chiusa da', kind: 'readonly-text', readonly: true },

  { group: 'post_notifica', name: 'stato_post_notifica', label: 'Stato post-notifica', kind: 'domain' },
  { group: 'post_notifica', name: 'data_avvio_post_notifica', label: 'Data avvio fase post-notifica', kind: 'date' },
  { group: 'post_notifica', name: 'note_post_notifica', label: 'Note fase post-notifica', kind: 'textarea', full: true },

  { group: 'ricorso', name: 'ricorso_presentato', label: 'Ricorso presentato', kind: 'domain' },
  { group: 'ricorso', name: 'termine_ricorso_data', label: 'Data termine ricorso', kind: 'date' },
  { group: 'ricorso', name: 'termine_ricorso_note', label: 'Note termine ricorso', kind: 'textarea', full: true },
  { group: 'ricorso', name: 'ricorso_protocollo', label: 'Protocollo ricorso', kind: 'text' },
  { group: 'ricorso', name: 'ricorso_data_presentazione', label: 'Data presentazione ricorso', kind: 'date' },
  { group: 'ricorso', name: 'ricorso_presentato_da', label: 'Ricorso presentato da', kind: 'text' },
  { group: 'ricorso', name: 'ricorso_cf_piva', label: 'CF/P.IVA ricorrente', kind: 'text' },
  { group: 'ricorso', name: 'ricorso_sospende_pagamento', label: 'Ricorso con sospensione pagamento', kind: 'domain' },
  { group: 'ricorso', name: 'ricorso_sintesi', label: 'Sintesi motivi del ricorso', kind: 'textarea', full: true },
  { group: 'ricorso', name: 'ricorso_note', label: 'Note ricorso', kind: 'textarea', full: true },

  { group: 'cda', name: 'cda_esito_ricorso', label: 'Esito ricorso CdA', kind: 'domain' },
  { group: 'cda', name: 'cda_data_esito', label: 'Data esito CdA', kind: 'date' },
  { group: 'cda', name: 'cda_numero_delibera', label: 'Numero delibera CdA', kind: 'text' },
  { group: 'cda', name: 'cda_data_delibera', label: 'Data delibera CdA', kind: 'date' },
  { group: 'cda', name: 'cda_estremi_atto', label: 'Estremi atto/determina comunicata al RI AMM', kind: 'text', full: true },
  { group: 'cda', name: 'cda_importo_rideterminato', label: 'Importo rideterminato dal CdA', kind: 'number' },
  { group: 'cda', name: 'termine_pagamento_rideterminato_data', label: 'Scadenza pagamento rideterminato', kind: 'date' },
  { group: 'cda', name: 'termine_pagamento_rideterminato_note', label: 'Note pagamento rideterminato', kind: 'textarea', full: true },
  { group: 'cda', name: 'cda_note_esito', label: 'Note esito CdA', kind: 'textarea', full: true },
  { group: 'cda', name: 'ricorso_definito_il', label: 'Ricorso definito il', kind: 'date' },
  { group: 'cda', name: 'ricorso_definito_da', label: 'Ricorso definito da', kind: 'text' },

  { group: 'riapertura', name: 'riapertura_amm', label: 'Riapertura amministrativa', kind: 'domain' },
  { group: 'riapertura', name: 'riapertura_amm_causale', label: 'Causale riapertura amministrativa', kind: 'domain' },
  { group: 'riapertura', name: 'riapertura_amm_disposta_il', label: 'Riapertura disposta il', kind: 'date' },
  { group: 'riapertura', name: 'riapertura_amm_disposta_da', label: 'Riapertura disposta da', kind: 'text' },
  { group: 'riapertura', name: 'riapertura_amm_autorizzazione', label: 'Estremi autorizzazione riapertura', kind: 'text', full: true },
  { group: 'riapertura', name: 'riapertura_amm_motivo', label: 'Motivo riapertura', kind: 'textarea', full: true },
  { group: 'riapertura', name: 'riapertura_amm_numero', label: 'Numero riapertura amministrativa', kind: 'number' },

  { group: 'incasso', name: 'pagamento_importo_incassato', label: 'Importo incassato', kind: 'number' },
  { group: 'incasso', name: 'pagamento_data_incasso', label: 'Data incasso', kind: 'date' },
  { group: 'incasso', name: 'pagamento_estremi_incasso', label: 'Estremi incasso', kind: 'text', full: true },

  { group: 'definizione', name: 'definizione_pratica_esito', label: 'Esito definizione pratica', kind: 'domain' },
  { group: 'definizione', name: 'definizione_pratica_data', label: 'Data definizione pratica', kind: 'date' },
  { group: 'definizione', name: 'definizione_pratica_da', label: 'Pratica definita da', kind: 'text' },
  { group: 'definizione', name: 'definizione_pratica_note', label: 'Note definizione pratica', kind: 'textarea', full: true }
]

type NoteCasisticaOption = { key: string; label: string; text: string }

const NOTE_FIELD_CASES: Record<string, NoteCasisticaOption[]> = {
  attrezzature_note: [
    { key: 'cauzione_detratta', label: 'Cauzione detratta', text: 'La cauzione versata è stata detratta dall’importo del rimborso attrezzature.' },
    { key: 'rimborso_integrale', label: 'Rimborso integrale', text: 'Il rimborso attrezzature è stato quantificato integralmente sulla base degli elementi disponibili.' },
    { key: 'verifica_documentale', label: 'Da documentazione agli atti', text: 'Il rimborso attrezzature è stato determinato sulla base della documentazione agli atti.' }
  ],
  pagamento_note: [
    { key: 'pagopa_allegato', label: 'Avviso pagoPA allegato', text: 'Il pagamento dovrà essere effettuato mediante l’avviso pagoPA allegato al verbale.' },
    { key: 'bonifico_indicato', label: 'Bonifico indicato', text: 'Il pagamento dovrà essere effettuato mediante bonifico bancario, secondo le coordinate indicate nell’atto.' },
    { key: 'modalita_mista', label: 'Pagamento misto', text: 'Il pagamento è previsto con modalità mista, secondo le indicazioni riportate nell’atto e negli allegati.' },
    { key: 'verifica_successiva', label: 'Verifica successiva incasso', text: 'L’effettivo incasso dovrà essere verificato successivamente alla scadenza indicata.' }
  ],
  note_post_notifica: [
    { key: 'fase_avviata', label: 'Fase avviata', text: 'Fase post-notifica avviata a seguito della chiusura dell’istruttoria amministrativa.' },
    { key: 'monitoraggio', label: 'Monitoraggio termini', text: 'Pratica in monitoraggio per verifica del pagamento, dell’eventuale ricorso e degli ulteriori adempimenti post-notifica.' },
    { key: 'nessuna_anomalia', label: 'Nessuna anomalia', text: 'Non risultano, allo stato, anomalie nella fase post-notifica.' }
  ],
  termine_ricorso_note: [
    { key: 'verbale', label: 'Termine da verbale', text: 'Termine per la presentazione del ricorso indicato nel verbale notificato.' },
    { key: 'notifica', label: 'Termine dalla notifica', text: 'Termine per la presentazione del ricorso decorrente dalla data di notifica del verbale.' },
    { key: 'atto', label: 'Termine da atto notificato', text: 'Termine individuato sulla base delle indicazioni contenute nell’atto notificato.' },
    { key: 'documentazione', label: 'Da documentazione agli atti', text: 'Termine indicato dall’operatore sulla base della documentazione agli atti.' }
  ],
  ricorso_note: [
    { key: 'in_esame', label: 'Ricorso in esame', text: 'Ricorso acquisito agli atti e in corso di esame.' },
    { key: 'da_cda', label: 'Da sottoporre al CdA', text: 'Ricorso da sottoporre alla valutazione del CdA secondo l’iter previsto.' },
    { key: 'documentazione_incompleta', label: 'Documentazione incompleta', text: 'La documentazione trasmessa necessita di integrazione o ulteriore verifica.' },
    { key: 'oltre_termine', label: 'Presentato oltre termine', text: 'Il ricorso risulta presentato oltre il termine indicato; resta ferma la successiva valutazione amministrativa.' }
  ],
  termine_pagamento_rideterminato_note: [
    { key: 'cda', label: 'Termine da esito CdA', text: 'Termine indicato nella comunicazione successiva all’esito del CdA.' },
    { key: 'rideterminazione', label: 'Rideterminazione importo', text: 'Nuovo termine di pagamento conseguente alla rideterminazione dell’importo.' },
    { key: 'comunicazione', label: 'Termine dalla comunicazione', text: 'Termine decorrente dalla notifica o comunicazione dell’esito del CdA.' },
    { key: 'atto_rideterminazione', label: 'Da atto rideterminazione', text: 'Termine indicato dall’operatore sulla base dell’atto di rideterminazione.' }
  ],
  cda_note_esito: [
    { key: 'accolto', label: 'Ricorso accolto', text: 'Il ricorso è stato accolto secondo quanto disposto dal CdA.' },
    { key: 'parziale', label: 'Parziale accoglimento', text: 'Il ricorso è stato parzialmente accolto, con conseguente rideterminazione degli importi o degli adempimenti.' },
    { key: 'respinto', label: 'Ricorso respinto', text: 'Il ricorso è stato respinto dal CdA.' },
    { key: 'nuova_istruttoria', label: 'Nuova istruttoria', text: 'L’esito del CdA richiede una nuova lavorazione amministrativa della pratica.' }
  ],
  definizione_pratica_note: [
    { key: 'pagata', label: 'Pagata', text: 'La pratica è definita a seguito dell’avvenuto pagamento.' },
    { key: 'archiviata', label: 'Archiviata', text: 'La pratica è definita con archiviazione, secondo gli atti e le verifiche effettuate.' },
    { key: 'annullata', label: 'Annullata', text: 'La pratica è definita a seguito dell’annullamento dell’atto.' },
    { key: 'riscossione', label: 'Avviata a riscossione', text: 'La pratica è definita ai fini della gestione ordinaria ed è avviata alla fase di riscossione.' },
    { key: 'ricorso', label: 'Definita dopo ricorso', text: 'La pratica è definita a seguito dell’esito del ricorso.' }
  ]
}

function getNoteCasistiche (fieldName: string): NoteCasisticaOption[] {
  return NOTE_FIELD_CASES[String(fieldName || '').toLowerCase()] || []
}

const MONEY_FIELDS = new Set([
  'sanzione_importo_base',
  'sanzione_importo_ridotta',
  'risarcimento_danni_importo',
  'sanzione_spese_notifica',
  'attrezzature_rimborso_importo',
  'attrezzature_cauzione_decurtata',
  'attrezzature_importo_netto',
  'pagamento_importo_totale',
  'cda_importo_rideterminato',
  'pagamento_importo_incassato'
])

const PAYMENT_COMMON_FIELDS = ['pagamento_modalita', 'pagamento_stato', 'pagamento_scadenza', 'pagamento_note']
const PAYMENT_MAIN_FIELDS = ['pagamento_modalita', 'pagamento_stato', 'pagamento_scadenza']
const PAYMENT_NOTE_FIELDS = ['pagamento_note']
const PAGOPA_FIELDS = ['pagopa_iuv', 'pagopa_codice_avviso']
const BONIFICO_FIELDS = ['bonifico_conto_cod', 'bonifico_iban_snapshot', 'bonifico_intestatario_snapshot', 'bonifico_causale', 'bonifico_cro_trn', 'bonifico_data_accredito']
const PROTOCOLLO_ATTO_FIELDS = ['protocollo_verbale_numero', 'protocollo_verbale_data']
const NOTIFICA_ATTO_FIELDS = ['notifica_tipo', 'notifica_data', 'notifica_esito', 'notifica_estremi']

const SYSTEM_CALCULATED_ADMIN_FIELDS = new Set([
  'tipo_atto_amm',
  'oggetto_atto_amm',
  'numero_verbale',
  'data_verbale',
  'sanzione_importo_base',
  'sanzione_importo_ridotta',
  'risarcimento_danni_importo',
  'sanzione_dettaglio_calcolo',
  'sanzione_calcolata_il',
  'sanzione_calcolata_da',
  'attrezzature_rimborso_importo',
  'attrezzature_cauzione_decurtata',
  'attrezzature_importo_netto',
  'attrezzature_rimborso_dettaglio',
  'pagamento_importo_totale'
])

function isSystemCalculatedAdminField (name: string): boolean {
  return SYSTEM_CALCULATED_ADMIN_FIELDS.has(String(name || ''))
}

type PaymentMode = '' | 'PAGOPA' | 'BONIFICO' | 'MISTO' | 'ALTRO'

type AmmSectionKey = 'trasgressore' | 'atto' | 'pagamento' | 'notifica' | 'anteprima' | 'allegati' | 'dati_generali' | 'ricorso' | 'cda' | 'riapertura' | 'definizione'

const AMM_DEFAULT_SECTION: AmmSectionKey = 'trasgressore'
const VALID_AMM_SECTIONS = new Set(['trasgressore', 'atto', 'pagamento', 'notifica', 'anteprima', 'allegati', 'dati_generali', 'ricorso', 'cda', 'riapertura', 'definizione'])

function normalizeAmmSection (raw: any): AmmSectionKey | null {
  const s = String(raw || '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  switch (s) {
    case 'trasgressore':
    case 'dati-trasgressore':
    case 'recapiti':
    case 'trasgressore-recapiti':
      return 'trasgressore'
    case 'contestazioni':
    case 'contestazioni-importi':
    case 'contestazioni-e-importi':
      return 'atto'
    case 'atto':
    case 'dati-atto':
    case 'verbale':
    case 'predisposizione-verbale':
      return 'atto'
    case 'dati-generali':
    case 'dati-generali-amministrativi':
    case 'generali':
      return 'dati_generali'
    case 'pagamento':
    case 'pagamenti':
    case 'importi':
      return 'pagamento'
    case 'notifica':
    case 'protocollo':
    case 'protocollo-notifica':
    case 'protocollo-e-notifica':
      return 'notifica'
    case 'anteprima':
    case 'preview':
    case 'pdf':
      return 'anteprima'
    case 'allegati':
    case 'attachments':
      return 'allegati'
    case 'ricorso':
    case 'post-notifica':
    case 'post_notifica':
    case 'riesame':
      return 'ricorso'
    case 'cda':
    case 'esito-cda':
    case 'esito_ricorso':
    case 'esito-ricorso':
      return 'cda'
    case 'riapertura':
    case 'riapertura-amministrativa':
    case 'riapertura_amm':
      return 'riapertura'
    case 'definizione':
    case 'definizione-pratica':
    case 'chiusura-pratica':
      return 'definizione'
    default:
      return null
  }
}

function parseAmmSectionFromUrlPart (value: string): AmmSectionKey | null {
  const text = String(value || '')
  if (!text) return null
  try {
    const q = text.includes('?') ? text.slice(text.indexOf('?') + 1) : text
    const clean = q.includes('#') ? q.slice(0, q.indexOf('#')) : q
    const params = new URLSearchParams(clean)
    return normalizeAmmSection(params.get('section') || params.get('giiSection') || '')
  } catch {
    return null
  }
}

function getRequestedAmmSection (forced?: any): AmmSectionKey | null {
  // Richiesta esplicita proveniente dal nav orizzontale o da evento applicativo.
  // Questa vale solo nel momento in cui l'utente clicca/attiva una scheda.
  const fromForced = normalizeAmmSection(forced)
  if (fromForced) return fromForced

  // Apertura da allarme: è l'unico caso in cui una richiesta memorizzata
  // deve influenzare la scheda iniziale.
  try {
    const fromRequested = normalizeAmmSection(window.sessionStorage.getItem('GII_REQUESTED_EDIT_SECTION'))
    if (fromRequested) {
      const rawIntent = window.sessionStorage.getItem('GII_EDIT_INTENT') || ''
      const source = rawIntent ? String(JSON.parse(rawIntent)?.source || '') : ''
      if (source === 'gii-alerts' || source === 'gii-alerts-homepage') return fromRequested
    }
  } catch {}

  return null
}

function clearExplicitAmmSectionRequest (): void {
  try { window.sessionStorage.removeItem('GII_REQUESTED_EDIT_SECTION') } catch {}
  try { window.sessionStorage.removeItem('GII_NAV_SECTION') } catch {}
}

function persistAmmSection (section: AmmSectionKey): void {
  try { window.sessionStorage.setItem('GII_EDIT_TAB', section) } catch {}
}

function broadcastAmmSection (section: AmmSectionKey): void {
  try { window.dispatchEvent(new CustomEvent('gii:edit-section-change', { detail: { section } })) } catch {}
}

function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function normalizeFeatureLayerUrl (raw: any): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.replace(/[?#].*$/, '').replace(/\/+$/, '')
}


function normalizeLookupTableUrl (raw: any): string {
  let url = normalizeFeatureLayerUrl(raw)
  if (!url) return ''
  if (/\/(FeatureServer|MapServer)$/i.test(url)) url = `${url}/0`
  return url
}

const LOOKUP_LAYER_CACHE: Record<string, any> = {}

async function getLookupLayer (rawUrl: any): Promise<any> {
  const url = normalizeLookupTableUrl(rawUrl)
  if (!url) throw new Error('URL tabella non configurato.')
  if (LOOKUP_LAYER_CACHE[url]) return LOOKUP_LAYER_CACHE[url]
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url, outFields: ['*'] })
  try { if (typeof fl.load === 'function') await fl.load() } catch {}
  LOOKUP_LAYER_CACHE[url] = fl
  return fl
}

async function queryActiveTableRows<T = any> (rawUrl: any, orderByFields?: string[]): Promise<T[]> {
  const fl = await getLookupLayer(rawUrl)
  const q: any = {
    where: 'attivo = 1',
    outFields: ['*'],
    returnGeometry: false,
    num: 2000
  }
  if (Array.isArray(orderByFields) && orderByFields.length) q.orderByFields = orderByFields
  const res = await fl.queryFeatures(q)
  const features = Array.isArray(res?.features) ? res.features : []
  return features.map((g: any) => ({ ...(g?.attributes || {}) })) as T[]
}

async function queryNotaSpeseDetailRowsForPractice (data: Record<string, any>): Promise<NotaSpeseDetailRow[]> {
  const rawGlobalId = String(pickAttrCI(data || {}, ['GlobalID', 'globalid', 'GLOBALID']) || '').trim()
  if (!rawGlobalId) return []
  const cleanGlobalId = rawGlobalId.replace(/[{}]/g, '').trim()
  const variants = Array.from(new Set([rawGlobalId, cleanGlobalId, cleanGlobalId ? `{${cleanGlobalId}}` : ''].filter(Boolean)))
  const fl = await getLookupLayer(NOTA_SPESE_DETTAGLIO_VIEW_URL)
  const q: any = {
    where: variants.map(value => `parent_globalid = ${sqlQuote(value)}`).join(' OR '),
    outFields: ['OBJECTID', 'ordine', 'codice_casistica', 'codice_voce_snapshot', 'descrizione_snapshot', 'importo_riga'],
    returnGeometry: false,
    num: 2000,
    orderByFields: ['ordine ASC', 'OBJECTID ASC']
  }
  const res = await fl.queryFeatures(q)
  const features = Array.isArray(res?.features) ? res.features : []
  return features.map((feature: any) => {
    const attrs = feature?.attributes || {}
    return {
      codiceCasistica: String(pickAttrCI(attrs, ['codice_casistica']) || '').trim(),
      codiceVoce: String(pickAttrCI(attrs, ['codice_voce_snapshot']) || '').trim(),
      descrizione: String(pickAttrCI(attrs, ['descrizione_snapshot']) || '').trim(),
      importoRiga: parseNumberInput(pickAttrCI(attrs, ['importo_riga'])) || 0
    }
  }).filter(row => !!row.codiceCasistica)
}

function pickAttrCI (data: any, names: string[]): any {
  if (!data || typeof data !== 'object') return undefined
  for (const n of names) {
    if (Object.prototype.hasOwnProperty.call(data, n)) return data[n]
  }
  const keys = Object.keys(data)
  for (const n of names) {
    const found = keys.find(k => k.toLowerCase() === String(n).toLowerCase())
    if (found) return data[found]
  }
  return undefined
}

function pickOidFromData (data: any, idFieldName: string): number | null {
  const raw = pickAttrCI(data, [idFieldName, 'OBJECTID', 'ObjectId', 'objectid', 'objectId', 'FID'])
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function safeJsonParse (raw: string | null): any | null {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function getGlobalOverlayHost (): HTMLElement | null {
  try {
    const topBody = (window as any)?.top?.document?.body
    if (topBody) return topBody as HTMLElement
  } catch {}
  try {
    if (typeof document !== 'undefined' && document.body) return document.body as HTMLElement
  } catch {}
  return null
}

function isExperienceBuilderDesignMode (): boolean {
  const isBuilderUrl = (raw: any): boolean => {
    const s = String(raw || '').toLowerCase()
    return /\/builder(?:[/?#]|$)/.test(s) ||
      s.includes('/experiencebuilder/builder') ||
      s.includes('mode=builder') ||
      s.includes('appmode=builder') ||
      s.includes('jimu-builder')
  }

  try {
    if (typeof window !== 'undefined') {
      if (isBuilderUrl(window.location?.href)) return true
      const topWin = (window as any).top
      if (topWin && topWin !== window && isBuilderUrl(topWin.location?.href)) return true
    }
  } catch {}

  try {
    const st: any = getAppStore?.().getState?.() || {}
    if (st?.appStateInBuilder) return true
    if (st?.builderState || st?.widgetsRuntimeInfoInBuilder) return true
    const appMode = String(st?.appRuntimeInfo?.appMode || st?.appContext?.appMode || st?.appMode || '').toLowerCase()
    if (appMode.includes('builder') || appMode.includes('design')) return true
  } catch {}

  try {
    const doc = (window as any)?.top?.document || document
    const body = doc?.body
    const classes = body?.classList ? Array.from(body.classList).join(' ').toLowerCase() : ''
    if (classes.includes('builder') || classes.includes('jimu-builder')) return true
    if (doc?.querySelector?.('[data-testid="builder"], .builder-header, .jimu-builder')) return true
  } catch {}

  return false
}

type GiiLockRect = {
  key: string
  left: number
  top: number
  width: number
  height: number
}

function findGiiWidgetElement (doc: Document, widgetId: string): HTMLElement | null {
  const id = String(widgetId || '').trim()
  if (!id) return null
  const selectors = [
    `[data-widgetid="${id}"]`,
    `[data-widget-id="${id}"]`,
    `[widgetid="${id}"]`,
    `[id="${id}"]`,
    `#${id}`
  ]
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel) as HTMLElement | null
      if (el) return el
    } catch {}
  }
  return null
}

function getVisibleLockRect (el: HTMLElement, key: string, viewW: number, viewH: number, win: Window): GiiLockRect | null {
  try {
    if (!el || !el.isConnected) return null
    const st = win.getComputedStyle?.(el)
    if (st && (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0')) return null
    const r = el.getBoundingClientRect()
    const left = Math.max(0, Math.floor(r.left))
    const top = Math.max(0, Math.floor(r.top))
    const right = Math.min(viewW, Math.ceil(r.right))
    const bottom = Math.min(viewH, Math.ceil(r.bottom))
    const width = Math.max(0, right - left)
    const height = Math.max(0, bottom - top)
    if (width < 2 || height < 2) return null
    return { key, left, top, width, height }
  } catch {
    return null
  }
}

function DirtyNavigationLockOverlay (props: { active: boolean; targetRef: React.RefObject<HTMLElement | null> }) {
  const { active, targetRef } = props
  const [rects, setRects] = React.useState<GiiLockRect[]>([])

  const computeRects = React.useCallback(() => {
    if (!active || isExperienceBuilderDesignMode()) { setRects([]); return }
    const host = getGlobalOverlayHost()
    if (!host) { setRects([]); return }
    const doc = host.ownerDocument || document
    const win = doc.defaultView || window
    const viewW = Math.max(0, win.innerWidth || doc.documentElement?.clientWidth || 0)
    const viewH = Math.max(0, win.innerHeight || doc.documentElement?.clientHeight || 0)

    const idsToMask = [
      'widget_840',  // GII Header
      'widget_1319', // GII Navigazione - Nuova pratica
      'widget_1371', // GII Navigazione - Modifica pratica
      'widget_1409'  // GII Navigazione - Verbale
    ]

    const next: GiiLockRect[] = []
    for (const id of idsToMask) {
      const el = findGiiWidgetElement(doc, id)
      const rect = el ? getVisibleLockRect(el, id, viewW, viewH, win) : null
      if (rect) next.push(rect)
    }

    if (next.length === 0 && targetRef.current) {
      try {
        const r = targetRef.current.getBoundingClientRect()
        const headerH = Math.max(0, Math.floor(r.top))
        const leftW = Math.max(0, Math.floor(r.left))
        if (headerH > 0) next.push({ key: 'fallback-header', left: 0, top: 0, width: viewW, height: headerH })
        if (leftW > 0) next.push({ key: 'fallback-left', left: 0, top: headerH, width: leftW, height: Math.max(0, viewH - headerH) })
      } catch {}
    }

    setRects(next)
  }, [active, targetRef])

  React.useEffect(() => {
    if (!active || isExperienceBuilderDesignMode()) { setRects([]); return }
    const host = getGlobalOverlayHost()
    const doc = host?.ownerDocument || document
    const win = doc.defaultView || window
    let raf = 0
    const schedule = () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { raf = win.requestAnimationFrame(computeRects) } catch { computeRects() }
    }

    schedule()

    let ro: ResizeObserver | null = null
    try {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(schedule)
        const observed = new Set<Element>()
        for (const id of ['widget_840', 'widget_1319', 'widget_1371', 'widget_1409']) {
          const el = findGiiWidgetElement(doc, id)
          if (el && !observed.has(el)) {
            observed.add(el)
            ro.observe(el)
          }
        }
        if (targetRef.current && !observed.has(targetRef.current)) ro.observe(targetRef.current)
      }
    } catch { ro = null }

    win.addEventListener('resize', schedule, true)
    win.addEventListener('scroll', schedule, true)
    const id = win.setInterval(schedule, 300)

    return () => {
      try { if (raf) win.cancelAnimationFrame(raf) } catch {}
      try { ro?.disconnect() } catch {}
      try { win.removeEventListener('resize', schedule, true) } catch {}
      try { win.removeEventListener('scroll', schedule, true) } catch {}
      try { win.clearInterval(id) } catch {}
    }
  }, [active, computeRects, targetRef])

  if (!active || isExperienceBuilderDesignMode() || rects.length === 0) return null

  const host = getGlobalOverlayHost()
  if (!host) return null

  const stop = (e: any) => {
    try { e.preventDefault() } catch {}
    try { e.stopPropagation() } catch {}
  }
  const maskBase: React.CSSProperties = {
    position: 'fixed',
    zIndex: 2147483000,
    background: 'rgba(0,0,0,0.52)',
    pointerEvents: 'auto',
    touchAction: 'none'
  }
  const mask = (rect: GiiLockRect) => (
    <div
      key={rect.key}
      data-gii-admin-lock-mask='1'
      aria-hidden='true'
      style={{ ...maskBase, left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={stop}
      onDoubleClick={stop}
      onWheel={stop}
      onTouchStart={stop}
    />
  )

  return createPortal(<>{rects.map(mask)}</>, host)
}

function resolvePageId (label: string): string | null {
  const wanted = String(label || '').trim().toLowerCase()
  if (!wanted) return null
  try {
    const st: any = getAppStore?.().getState?.() || {}
    const pages = st?.appConfig?.pages || st?.appStateInBuilder?.appConfig?.pages || {}
    const entries = Object.entries(pages) as Array<[string, any]>
    const byLabel = entries.find(([id, p]) => String(p?.label || id).trim().toLowerCase() === wanted)
    if (byLabel) return byLabel[0]
    const byId = entries.find(([id]) => String(id).trim().toLowerCase() === wanted)
    if (byId) return byId[0]
  } catch {}
  return null
}

function readEditIntent (): EditIntentInfo | null {
  try {
    const fromWindow: any = (window as any).__giiEdit || null
    const fromStorage: any = safeJsonParse(sessionStorage.getItem('GII_EDIT_INTENT'))
    const j: any = fromWindow || fromStorage || null
    if (!j) return null
    const oid = j?.oid != null && j?.oid !== '' ? Number(j.oid) : NaN
    const idFieldName = String(j?.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
    const layerUrl = normalizeFeatureLayerUrl(j?.layerUrl || '')
    const dsId = String(j?.dsId || j?.dataSourceId || '').trim()
    const data = j?.data || null
    if (!Number.isFinite(oid) && !data) return null
    const oidFromData = pickOidFromData(data, idFieldName)
    return {
      oid: Number.isFinite(oid) ? Number(oid) : oidFromData,
      layerUrl,
      dsId,
      idFieldName,
      data,
      ts: Number(j?.ts || Date.now())
    }
  } catch {
    return null
  }
}

function readSelectionIntent (): EditIntentInfo | null {
  try {
    const sel: any = (window as any).__giiSelection || null
    const oidRaw = sel?.oid ?? sessionStorage.getItem('GII_SELECTED_OID')
    const oid = oidRaw != null && oidRaw !== '' ? Number(oidRaw) : NaN
    const layerUrl = normalizeFeatureLayerUrl(sel?.layerUrl || sessionStorage.getItem('GII_SELECTED_LAYER_URL') || '')
    const dsId = String(sel?.dsId || sel?.dataSourceId || sessionStorage.getItem('GII_SELECTED_DS_ID') || '').trim()
    const idFieldName = String(sel?.idFieldName || sessionStorage.getItem('GII_SELECTED_IDFIELD') || 'OBJECTID').trim() || 'OBJECTID'
    const data = sel?.data || safeJsonParse(sessionStorage.getItem('GII_SELECTED_DATA')) || null
    const oidFromData = pickOidFromData(data, idFieldName)
    if (!Number.isFinite(oid) && !oidFromData && !data) return null
    return {
      oid: Number.isFinite(oid) ? Number(oid) : oidFromData,
      layerUrl,
      dsId,
      idFieldName,
      data,
      ts: Date.now()
    }
  } catch {
    return null
  }
}

function selectionStateFromIntent (intent: EditIntentInfo | null, source: 'editIntent' | 'selection'): SelectedState {
  if (!intent) return { ds: null, oid: null, idFieldName: 'OBJECTID', layerUrl: '', data: null, source: 'none', sig: 'none' }
  const idFieldName = String(intent.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
  const oid = intent.oid != null && Number.isFinite(Number(intent.oid)) ? Number(intent.oid) : pickOidFromData(intent.data, idFieldName)
  const layerUrl = normalizeFeatureLayerUrl(intent.layerUrl || '')
  return {
    ds: null,
    dsId: String(intent.dsId || '').trim() || undefined,
    oid: oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null,
    idFieldName,
    layerUrl,
    data: intent.data || null,
    source,
    sig: `${source}|${layerUrl}|${oid ?? ''}|${Number(intent.ts || 0)}`
  }
}

function normalizeRole (v: any): string {
  const s = String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (s === '7') return 'ADMIN'
  if (s === '6') return 'DA'
  if (s === '4') return 'RI'
  if (s === '2') return 'TI'
  return s
}

function normalizeArea (v: any): string {
  const s = String(v ?? '').trim().toUpperCase()
  if (s === '1') return 'AMM'
  if (s === '2') return 'AGR'
  if (s === '3') return 'TEC'
  if (s.includes('AMMIN')) return 'AMM'
  if (s.includes('AGR')) return 'AGR'
  if (s.includes('TEC')) return 'TEC'
  return s
}

function readUserProfile (): { role: RoleCode, username: string, fullName: string, label: string } {
  try {
    const info: any = (window as any).__giiUserRole || {}
    let role = normalizeRole(info?.profiloCod || info?.profilo_cod || info?.ruoloCod || info?.ruolo_cod || info?.ruoloLabel || info?.ruolo)
    const area = normalizeArea(info?.areaCod || info?.area_cod || info?.areaLabel || info?.area)
    if (role === 'TI' && area === 'AMM') role = 'TI_AMM'
    if (role === 'RI' && area === 'AMM') role = 'RI_AMM'
    if (!role && (info?.isWorkflowAdmin || info?.isAdmin)) role = 'ADMIN'
    const username = String(info?.username || (window as any).__giiUser?.username || '').trim()
    const fullName = String(info?.fullName || info?.full_name || username || '').trim()
    const label = String(info?.profiloLabel || info?.ruoloFull || role || '').trim()
    return { role, username, fullName, label }
  } catch {
    return { role: '', username: '', fullName: '', label: '' }
  }
}

function isAllowedAdminRole (role: string): boolean {
  return ['TI_AMM', 'RI_AMM', 'DA', 'ADMIN'].includes(String(role || '').toUpperCase())
}

function toDateObj (v: any): Date | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  const n = Number(v)
  if (Number.isFinite(n) && Math.abs(n) > 1000000000) {
    const d = new Date(n)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function formatDateValue (v: any): string {
  const d = toDateObj(v)
  if (!d) return '—'
  return d.toLocaleDateString('it-IT')
}

function dateInputValue (v: any): string {
  const d = toDateObj(v)
  if (!d) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function fromDateInputValue (s: string): number | null {
  const v = String(s || '').trim()
  if (!v) return null
  const d = new Date(`${v}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

function formatValue (v: any): string {
  if (v == null || v === '') return '—'
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '—' : v.toLocaleDateString('it-IT')
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—'
  if (typeof v === 'boolean') return v ? 'Sì' : 'No'
  return String(v)
}

function formatDecimalIt (value: number, fractionDigits = 2): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  const fixed = Math.abs(n).toFixed(fractionDigits)
  const [integerPart, decimalPart] = fixed.split('.')
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimalPart != null ? `${sign}${groupedInteger},${decimalPart}` : `${sign}${groupedInteger}`
}

function formatMoney (v: any): string {
  if (v == null || v === '') return ''
  const n = parseNumberInput(v)
  if (n == null || !Number.isFinite(n)) return String(v)
  return formatDecimalIt(n, 2)
}

function formatEuroText (v: any): string {
  const n = typeof v === 'number' ? v : parseNumberInput(v)
  if (n == null || !Number.isFinite(n)) return '—'
  return `${formatDecimalIt(n, 2)} €`
}

function moneyAttr (data: Record<string, any>, fieldName: string): number {
  const n = parseNumberInput(pickAttrCI(data || {}, [fieldName]))
  return n != null && Number.isFinite(n) ? n : 0
}

function formatEuroAmount (value: number): string {
  return formatEuroText(roundMoneyValue(value))
}

function sanzioneDovutaAmount (data: Record<string, any>): number {
  const ridotta = parseNumberInput(pickAttrCI(data || {}, ['sanzione_importo_ridotta']))
  if (ridotta != null && Number.isFinite(ridotta)) return ridotta
  return moneyAttr(data, 'sanzione_importo_base')
}

function risarcimentoDanniAmount (data: Record<string, any>): number {
  return moneyAttr(data, 'risarcimento_danni_importo')
}

function rimborsoNettoAmount (data: Record<string, any>): number {
  return moneyAttr(data, 'attrezzature_importo_netto')
}

function looksLikeDateField (name: string): boolean {
  return /(^dt_|data|_data|date|_il$)/i.test(String(name || ''))
}

function getDataSourceUrl (ds: any): string {
  try {
    return normalizeFeatureLayerUrl(ds?.getDataSourceJson?.()?.url || ds?.dataSourceJson?.url || '')
  } catch {
    return ''
  }
}

function realFieldName (fields: LayerFieldInfo[], wanted: string): string | null {
  const w = String(wanted || '').toLowerCase()
  const f = fields.find(x => String(x.name).toLowerCase() === w)
  return f?.name || null
}

function getFieldInfo (fields: LayerFieldInfo[], wanted: string): LayerFieldInfo | null {
  const w = String(wanted || '').toLowerCase()
  return fields.find(x => String(x.name).toLowerCase() === w) || null
}

function getDomainOptions (field: LayerFieldInfo | null): Array<{ code: any, name: string }> {
  const vals = field?.domain?.codedValues
  if (!Array.isArray(vals)) return []
  return vals.map((x: any) => ({ code: x?.code, name: String(x?.name ?? x?.code ?? '') }))
}

function getFallbackDomainOptions (fieldName: string): Array<{ code: any, name: string }> {
  if (fieldName === 'tipo_atto_amm') {
    return [
      { code: 'VERBALE', name: 'Verbale amministrativo' },
      { code: 'RISARCIMENTO_DANNI', name: 'Richiesta risarcimento danni' },
      { code: 'VERBALE_RISARCIMENTO', name: 'Verbale misto' },
      { code: 'ARCHIVIAZIONE', name: 'Archiviazione / non luogo a procedere' },
      { code: 'RIMBORSO', name: 'Richiesta di rimborso' },
      { code: 'RIMBORSO_RISARCIMENTO', name: 'Richiesta di rimborso e risarcimento danni' }
    ]
  }
  if (fieldName === 'pagamento_modalita') {
    return [
      { code: 'PAGOPA', name: 'pagoPA' },
      { code: 'BONIFICO', name: 'Bonifico bancario' },
      { code: 'MISTO', name: 'Pagamento misto' },
      { code: 'ALTRO', name: 'Altro' }
    ]
  }
  if (fieldName === 'pagamento_stato') {
    return [
      { code: 'DA_GENERARE', name: 'Da generare' },
      { code: 'DA_PAGARE', name: 'Da pagare' },
      { code: 'GENERATO', name: 'Generato' },
      { code: 'NOTIFICATO', name: 'Notificato' },
      { code: 'PARZIALE', name: 'Pagato parzialmente' },
      { code: 'PAGATO', name: 'Pagato' },
      { code: 'SCADUTO', name: 'Scaduto' },
      { code: 'ANNULLATO', name: 'Annullato' }
    ]
  }
  if (fieldName === 'notifica_tipo') {
    return [
      { code: 'PEC', name: 'PEC' },
      { code: 'RAC_AR', name: 'Raccomandata A/R' },
      { code: 'MESSO', name: 'Messo notificatore' },
      { code: 'CONSEGNA_MANO', name: 'Consegna a mano' },
      { code: 'ALTRO', name: 'Altro' }
    ]
  }
  if (fieldName === 'notifica_esito') {
    return [
      { code: 'DA_NOTIFICARE', name: 'Da notificare' },
      { code: 'NOTIFICATA', name: 'Notificata' },
      { code: 'NON_NOTIFICATA', name: 'Non notificata' },
      { code: 'COMPIUTA_GIACENZA', name: 'Compiuta giacenza' },
      { code: 'IRREPERIBILE', name: 'Irreperibile' },
      { code: 'ALTRO', name: 'Altro' }
    ]
  }
  if (fieldName === 'attrezzature_cauzione_presente') {
    return [
      { code: 0, name: 'No' },
      { code: 1, name: 'Sì' }
    ]
  }
  if (fieldName === 'area_cod') {
    return [
      { code: 'AMM', name: 'Amministrativa' },
      { code: 'AGR', name: 'Agraria' },
      { code: 'TEC', name: 'Tecnica' }
    ]
  }
  if (fieldName === 'settore_cod') {
    return [
      { code: 'CR', name: 'Catasto, Ruoli e Servizi Territoriali' },
      { code: 'GI', name: 'Gestione irrigua' },
      { code: 'D1', name: "Distretto 1 (Quartu Sant'Elena/Villaputzu/Muravera – San Sperate)" },
      { code: 'D2', name: 'Distretto 2 (Serramanna/Pimpisu)' },
      { code: 'D3', name: 'Distretto 3 (San Gavino - Villacidro)' },
      { code: 'D4', name: 'Distretto 4 (Basso Sulcis)' },
      { code: 'D5', name: 'Distretto 5 (Senorbì)' },
      { code: 'D6', name: 'Distretto 6 (Cixerri)' },
      { code: 'DS', name: 'Manutenzione opere di dreno e di scolo' }
    ]
  }
  if (/^stato_(TI_AMM|RI_AMM|DA)$/i.test(fieldName)) {
    return [
      { code: 0, name: 'Non attivo' },
      { code: 1, name: 'Da prendere in carico' },
      { code: 2, name: 'Presa in carico' },
      { code: 3, name: 'Integrazione richiesta' },
      { code: 4, name: 'Trasmesso' },
      { code: 5, name: 'Respinto' }
    ]
  }
  if (/^esito_(TI_AMM|RI_AMM|DA|DT)$/i.test(fieldName)) {
    return [
      { code: 1, name: 'Integrazione richiesta' },
      { code: 2, name: 'Approvata' },
      { code: 3, name: 'Respinta' }
    ]
  }
  return []
}

function domainLabel (field: LayerFieldInfo | null, raw: any, fallbackFieldName?: string): string {
  if (raw == null || raw === '') return '—'
  const opts = getDomainOptions(field)
  const fallback = fallbackFieldName ? getFallbackDomainOptions(fallbackFieldName) : []
  const found = [...opts, ...fallback].find(o => String(o.code) === String(raw))
  return found ? found.name : String(raw)
}

function normalizeToken (v: any): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function normalizePaymentModeCandidate (v: any): PaymentMode {
  const t = normalizeToken(v)
  if (!t) return ''
  if (t.includes('PAGOPA') || t.includes('PAGOAP')) return 'PAGOPA'
  if (t.includes('BONIFICO')) return 'BONIFICO'
  if (t.includes('MISTO') || t.includes('ENTRAMBI')) return 'MISTO'
  if (t.includes('ALTRO')) return 'ALTRO'
  return ''
}

function getPaymentMode (draft: Record<string, any>, fields: LayerFieldInfo[]): PaymentMode {
  const lf = getFieldInfo(fields, 'pagamento_modalita')
  const raw = pickAttrCI(draft, [lf?.name || 'pagamento_modalita', 'pagamento_modalita'])
  const fromRaw = normalizePaymentModeCandidate(raw)
  if (fromRaw) return fromRaw
  if (lf?.domain?.codedValues) {
    const label = domainLabel(lf, raw)
    const fromLabel = normalizePaymentModeCandidate(label)
    if (fromLabel) return fromLabel
  }
  return ''
}

function parseNumberInput (v: any): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v ?? '').trim().replace(/\s+/g, '')
  if (!s) return null
  const hasComma = s.includes(',')
  const dotCount = (s.match(/\./g) || []).length
  if (hasComma) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (dotCount > 1) {
    s = s.replace(/\./g, '')
  } else if (dotCount === 1) {
    const parts = s.split('.')
    if (parts[1]?.length === 3 && parts[0]?.length <= 3) s = parts.join('')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function filterAttrsForLayer (attrs: Record<string, any>, fields: LayerFieldInfo[]): Record<string, any> {
  if (!fields.length) return attrs
  const nameMap = new Map<string, string>()
  for (const f of fields) nameMap.set(String(f.name).toLowerCase(), String(f.name))
  const out: Record<string, any> = {}
  for (const k of Object.keys(attrs)) {
    const realName = nameMap.get(k.toLowerCase())
    if (realName) out[realName] = attrs[k]
  }
  return out
}

function sqlQuote (v: any): string {
  return `'${String(v ?? '').replace(/'/g, "''")}'`
}

function globalIdVariantsForLog (raw: any): string[] {
  const s = String(raw ?? '').trim()
  if (!s) return []
  const clean = s.replace(/[{}]/g, '').trim()
  const variants = [s]
  if (clean) {
    variants.push(clean)
    variants.push(`{${clean}}`)
  }
  return Array.from(new Set(variants.filter(Boolean)))
}

function parentGlobalIdWhereForLog (raw: any): string {
  const variants = globalIdVariantsForLog(raw)
  return variants.length ? variants.map(g => `parent_globalid = ${sqlQuote(g)}`).join(' OR ') : '1=0'
}

function getLogObjectIdValue (attrs: any, layer?: any): any {
  const oidField = String(layer?.objectIdField || 'OBJECTID')
  return pickAttrCI(attrs, [oidField, 'OBJECTID', 'ObjectID', 'ObjectId', 'objectId', 'objectid'])
}

function parseJsonObject (v: any): Record<string, any> {
  if (!v) return {}
  if (typeof v === 'object' && !Array.isArray(v)) return { ...(v as any) }
  try {
    const parsed = JSON.parse(String(v))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeAuditComparable (v: any): string {
  if (v == null) return ''
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : String(v.getTime())
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'boolean') return v ? '1' : '0'
  return String(v).trim()
}

function toAuditStoredValue (v: any): any {
  if (v == null) return ''
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.getTime()
  if (typeof v === 'number') return Number.isFinite(v) ? v : ''
  if (typeof v === 'boolean') return v ? 1 : 0
  return String(v).trim()
}

function buildAuditDeltaMaps (prevAttrs: Record<string, any>, nextAttrs: Record<string, any>, fields: string[]): { oldMap: Record<string, any>, newMap: Record<string, any> } {
  const oldMap: Record<string, any> = {}
  const newMap: Record<string, any> = {}
  for (const field of Array.from(new Set((fields || []).filter(Boolean)))) {
    const before = pickAttrCI(prevAttrs, [field])
    const after = pickAttrCI(nextAttrs, [field])
    if (normalizeAuditComparable(before) === normalizeAuditComparable(after)) continue
    oldMap[field] = toAuditStoredValue(before)
    newMap[field] = toAuditStoredValue(after)
  }
  return { oldMap, newMap }
}

function mergeAuditCycleMaps (baseOld: Record<string, any>, baseNew: Record<string, any>, deltaOld: Record<string, any>, deltaNew: Record<string, any>) {
  const oldMap: Record<string, any> = { ...(baseOld || {}) }
  const newMap: Record<string, any> = { ...(baseNew || {}) }
  const changedKeys = Array.from(new Set([...Object.keys(deltaOld || {}), ...Object.keys(deltaNew || {})]))
  for (const field of changedKeys) {
    if (!(field in oldMap)) oldMap[field] = deltaOld[field]
    newMap[field] = deltaNew[field]
    if (normalizeAuditComparable(oldMap[field]) === normalizeAuditComparable(newMap[field])) {
      delete oldMap[field]
      delete newMap[field]
    }
  }
  const fields = Object.keys(newMap).sort((a, b) => a.localeCompare(b))
  return { oldMap, newMap, fields }
}

async function queryCurrentLayerAttrsByOid (layer: any, oidFieldName: string, oid: number): Promise<Record<string, any>> {
  if (!layer?.queryFeatures) return {}
  if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
  const idField = String(layer.objectIdField || oidFieldName || 'OBJECTID')
  const q = layer.createQuery ? layer.createQuery() : {}
  q.where = `${idField} = ${Number(oid)}`
  q.outFields = ['*']
  q.returnGeometry = false
  q.num = 1
  const res = await layer.queryFeatures(q)
  return res?.features?.[0]?.attributes || {}
}

function normalizeEditLayerUrl (raw: any): string {
  let url = normalizeFeatureLayerUrl(raw)
  if (!url) return ''
  if (/(\/FeatureServer|\/MapServer)$/i.test(url)) url = `${url}/0`
  return url
}

const EDIT_LAYER_CACHE: Record<string, any> = {}

async function resolveLayerForEdit (ds: any, fallbackUrl?: string): Promise<any | null> {
  if (!ds && !fallbackUrl) return null

  try {
    const raw = ds ? ((ds as any)?.getLayer?.() || (ds as any)?.getJSAPILayer?.() || (ds as any)?.getJsApiLayer?.() || (ds as any)?.layer || null) : null
    const resolved = await Promise.resolve(raw)
    const layer = (resolved && (resolved.layer || resolved)) || null
    if (layer && typeof layer.applyEdits === 'function') return layer
  } catch { }

  const url = normalizeEditLayerUrl(fallbackUrl || getDataSourceUrl(ds))
  if (!url) return null

  try {
    if (EDIT_LAYER_CACHE[url]?.applyEdits) return EDIT_LAYER_CACHE[url]
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url, outFields: ['*'] })
    try { if (typeof fl.load === 'function') await fl.load() } catch { }
    if (fl && typeof fl.applyEdits === 'function') {
      EDIT_LAYER_CACHE[url] = fl
      return fl
    }
  } catch { }

  return null
}

type AmmAttachmentInfo = { id: number; name?: string; size?: number; contentType?: string; url?: string }

function formatAttachmentBytes (value?: number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}

function normalizeAttachmentInfos (raw: any): AmmAttachmentInfo[] {
  const pull = (obj: any): any[] => {
    if (!obj) return []
    if (Array.isArray(obj)) return obj
    if (Array.isArray(obj.attachmentInfos)) return obj.attachmentInfos
    if (Array.isArray(obj.attachments)) return obj.attachments
    return []
  }
  return pull(raw)
    .map((a: any) => ({
      id: Number(a?.id ?? a?.objectId ?? a?.attachmentId),
      name: a?.name,
      size: Number(a?.size),
      contentType: a?.contentType,
      url: a?.url
    }))
    .filter(a => Number.isFinite(a.id) && a.id > 0)
}

async function getEsriTokenForUrl (url: string): Promise<string> {
  try {
    const IdentityManager = await loadEsriModule<any>('esri/identity/IdentityManager')
    const cred = IdentityManager?.findCredential?.(url) || IdentityManager?.findCredential?.(url.replace(/\/\d+$/, ''))
    return cred?.token ? String(cred.token) : ''
  } catch {
    return ''
  }
}

function attachmentRawUrl (att: AmmAttachmentInfo, oid: number, layerUrl: string): string {
  const direct = String(att?.url || '').trim()
  if (direct) return direct
  if (!layerUrl || !oid || !Number.isFinite(Number(att?.id))) return ''
  return `${layerUrl}/${Number(oid)}/attachments/${Number(att.id)}`
}

async function queryAmmAttachments (layer: any, oid: number, layerUrl: string): Promise<AmmAttachmentInfo[]> {
  if (!oid) return []

  const oidField = String(layer?.objectIdField || 'OBJECTID')
  if (layer && typeof layer.queryAttachments === 'function') {
    try {
      const featureRef = { attributes: { [oidField]: oid } }
      let res: any = null
      try {
        res = await layer.queryAttachments(featureRef, { returnMetadata: true, returnUrl: true })
      } catch {
        res = await layer.queryAttachments(featureRef)
      }
      if (Array.isArray(res)) {
        for (const g of res) {
          const pid = g?.parentObjectId ?? g?.objectId
          if (Number(pid) === Number(oid)) return normalizeAttachmentInfos(g)
        }
        return normalizeAttachmentInfos(res)
      }
      if (res && typeof res === 'object') {
        if (Array.isArray(res.attachmentGroups)) {
          for (const g of res.attachmentGroups) {
            const pid = g?.parentObjectId ?? g?.objectId
            if (Number(pid) === Number(oid)) return normalizeAttachmentInfos(g)
          }
        }
        if ((res as any)[oid]) return normalizeAttachmentInfos((res as any)[oid])
        if ((res as any)[String(oid)]) return normalizeAttachmentInfos((res as any)[String(oid)])
        return normalizeAttachmentInfos(res)
      }
    } catch {
      // fallback REST sotto
    }
  }

  if (!layerUrl) return []
  const token = await getEsriTokenForUrl(layerUrl)
  const qs = new URLSearchParams({ f: 'json', objectIds: String(oid), returnMetadata: 'true', returnUrl: 'true' })
  if (token) qs.set('token', token)
  const resp = await fetch(`${layerUrl}/queryAttachments?${qs.toString()}`)
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.error) throw new Error(String(json?.error?.message || `HTTP ${resp.status}`))
  if (Array.isArray(json?.attachmentGroups)) {
    for (const g of json.attachmentGroups) {
      const pid = g?.parentObjectId ?? g?.objectId
      if (Number(pid) === Number(oid)) return normalizeAttachmentInfos(g)
    }
  }
  if (json && typeof json === 'object') {
    if ((json as any)[oid]) return normalizeAttachmentInfos((json as any)[oid])
    if ((json as any)[String(oid)]) return normalizeAttachmentInfos((json as any)[String(oid)])
  }
  return normalizeAttachmentInfos(json)
}

async function addAmmAttachments (layer: any, oid: number, files: File[], layerUrl: string): Promise<void> {
  if (!oid || !Array.isArray(files) || files.length === 0) return
  if (!layerUrl) throw new Error('URL del FeatureLayer non disponibile per caricare gli allegati.')

  const token = await getEsriTokenForUrl(layerUrl)
  for (const file of files) {
    const fd = new FormData()
    fd.append('attachment', file)
    fd.append('f', 'json')
    if (token) fd.append('token', token)
    const resp = await fetch(`${layerUrl}/${Number(oid)}/addAttachment`, { method: 'POST', body: fd })
    const json: any = await resp.json().catch(() => ({}))
    const addRes = json?.addAttachmentResult || json
    if (!resp.ok || addRes?.error || json?.error) {
      throw new Error(String(addRes?.error?.message || json?.error?.message || `HTTP ${resp.status}`))
    }
  }
}

async function deleteAmmAttachment (layer: any, oid: number, attachmentId: number, layerUrl: string): Promise<void> {
  if (!oid || !attachmentId) return
  if (!layerUrl) throw new Error('URL del FeatureLayer non disponibile per eliminare gli allegati.')

  const token = await getEsriTokenForUrl(layerUrl)
  const fd = new FormData()
  fd.append('f', 'json')
  fd.append('attachmentIds', String(attachmentId))
  if (token) fd.append('token', token)
  const resp = await fetch(`${layerUrl}/${Number(oid)}/deleteAttachments`, { method: 'POST', body: fd })
  const json: any = await resp.json().catch(() => ({}))
  const err = json?.error
  if (!resp.ok || err) throw new Error(String(err?.message || `HTTP ${resp.status}`))
}

async function buildAttachmentPreviewUrl (att: AmmAttachmentInfo, oid: number, layerUrl: string): Promise<string> {
  const raw = attachmentRawUrl(att, oid, layerUrl)
  if (!raw) throw new Error('URL allegato non disponibile.')
  const token = await getEsriTokenForUrl(layerUrl || raw)
  let url = raw
  if (token && /^https?:/i.test(url) && !/[?&]token=/.test(url)) {
    url = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  }
  const resp = await fetch(url, { credentials: 'same-origin' })
  if (!resp.ok) throw new Error(`Caricamento allegato fallito (HTTP ${resp.status}).`)
  const blob = await resp.blob()
  return URL.createObjectURL(blob)
}

async function readLayerFields (ds: any): Promise<LayerFieldInfo[]> {
  const byName: Record<string, LayerFieldInfo> = {}
  try {
    const schema = ds?.getSchema?.()
    const fobj = schema?.fields || {}
    for (const name of Object.keys(fobj)) {
      const f = fobj[name]
      byName[name] = {
        name,
        alias: String(f?.alias || f?.label || f?.title || name),
        type: String(f?.type || ''),
        domain: f?.domain || null,
        editable: f?.editable !== false
      }
    }
  } catch { }
  try {
    const layer = await resolveLayerForEdit(ds)
    const fields = (layer?.fields || []) as any[]
    for (const f of fields) {
      if (!f?.name) continue
      byName[f.name] = {
        name: String(f.name),
        alias: String(f.alias || f.name),
        type: String(f.type || ''),
        domain: f.domain || null,
        editable: f.editable !== false
      }
    }
  } catch { }
  return Object.values(byName)
}


async function refreshDs (ds: any): Promise<void> {
  if (!ds) return
  let root = ds
  try { while (root?.belongToDataSource) root = root.belongToDataSource } catch { }
  const list: any[] = root ? [root] : []
  try {
    const derived = root?.getAllDerivedDataSources?.() || []
    if (derived?.length) list.push(...derived)
  } catch { }
  for (const d of list) {
    try {
      const q = d.getCurrentQueryParams?.() || null
      if (d.clearSourceRecords) d.clearSourceRecords()
      if (d.addVersion) d.addVersion()
      if (d.load) { if (q) await d.load(q); else await d.load() }
    } catch { }
  }
}

const ADMIN_STYLE_DEFAULTS: Record<string, any> = {
  maskBg: '#eef4fb',
  maskBorderColor: '#cbd8e6',
  maskBorderWidth: 1,
  maskBorderRadius: 10,
  maskInnerPadding: 12,
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
  formPhaseCardTitleColor: '#0f4c81',
  formWorkflowBadgeBg: '#ffffff',
  formWorkflowBadgeBorderColor: '#d8e6f7',
  formWorkflowBadgeBorderWidth: 1,
  formWorkflowBadgeTitleColor: '#0f4c81',
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
  formInnerHeaderColor: '#0f4c81',
  formInnerHeaderFontSize: 14,
  formCardHeaderFontSize: 14,
  formCardHeaderFontWeight: 800,
  formCardHeaderPaddingX: 10,
  formCardHeaderPaddingY: 7,
  formCardBodyPadding: 10,
  amountFontSize: 16,
  titleFontSize: 18,
  subtitleFontSize: 13,
  msgFontSize: 14
}

const AdminStyleCtx = React.createContext<Record<string, any>>(ADMIN_STYLE_DEFAULTS)

function useAdminStyle (): Record<string, any> {
  const ctx = React.useContext(AdminStyleCtx) || {}
  return { ...ADMIN_STYLE_DEFAULTS, ...ctx }
}

function adminLabelFontSize (st: Record<string, any>): number {
  const n = Number(st?.formLabelFontSize ?? 15)
  return Math.max(15, Number.isFinite(n) ? n : 15)
}

function adminFieldFontSize (st: Record<string, any>): number {
  const n = Number(st?.formFieldFontSize ?? 15)
  return Math.max(15, Number.isFinite(n) ? n : 15)
}

function adminInnerHeaderFontSize (st: Record<string, any>): number {
  const n = Number(st?.formInnerHeaderFontSize ?? 14)
  return Math.max(14, Number.isFinite(n) ? n : 14)
}


function Section (props: { title: string, children: React.ReactNode, right?: React.ReactNode, bodyStyle?: React.CSSProperties, cardStyle?: React.CSSProperties }) {
  const st = useAdminStyle()
  return (
    <section style={{
      border: `${Number(st.formCardBorderWidth ?? 1)}px solid ${st.formCardBorderColor || '#c6d7ea'}`,
      borderRadius: Number(st.formCardBorderRadius ?? 8),
      background: st.formCardBg || '#f8fbff',
      boxShadow: st.formCardShadow || 'none',
      overflow: 'hidden',
      minWidth: 0,
      flex: '0 0 auto',
      alignSelf: 'stretch',
      height: 'auto',
      ...props.cardStyle
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        background: st.formCardHeaderBg || 'linear-gradient(90deg, #0d3b66, #155e9d)',
        color: st.formCardHeaderColor || '#fff',
        padding: `${Number(st.formCardHeaderPaddingY ?? 7)}px ${Number(st.formCardHeaderPaddingX ?? 10)}px`,
        fontWeight: Number(st.formCardHeaderFontWeight ?? 800) as any,
        fontSize: Number(st.formCardHeaderFontSize ?? 14),
        letterSpacing: 0.25,
        textTransform: 'uppercase'
      }}>
        <span>{props.title}</span>
        {props.right}
      </div>
      <div style={{ padding: Number(st.formCardBodyPadding ?? 10), ...props.bodyStyle }}>{props.children}</div>
    </section>
  )
}

function InfoBox (props: { children: React.ReactNode, kind?: 'info' | 'warn' | 'ok' }) {
  const stCtx = useAdminStyle()
  const kind = props.kind || 'info'
  const st: React.CSSProperties = kind === 'warn'
    ? { background: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa' }
    : kind === 'ok'
      ? { background: '#ecfdf3', color: '#166534', borderColor: '#bbf7d0' }
      : { background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }
  return <div style={{ ...st, border: '1px solid', borderRadius: Number(stCtx.formCardBorderRadius ?? 8), padding: '10px 12px', fontSize: adminFieldFontSize(stCtx), lineHeight: 1.35 }}>{props.children}</div>
}

function BlockingDialog (props: { kind: 'ok' | 'err' | 'warn', title: string, text: string, onClose: () => void }) {
  const st = useAdminStyle()
  const color = props.kind === 'ok' ? '#166534' : props.kind === 'warn' ? '#9a3412' : '#991b1b'
  const bg = props.kind === 'ok' ? '#ecfdf3' : props.kind === 'warn' ? '#fff7ed' : '#fef2f2'
  return (
    <div style={{ position: 'fixed', zIndex: 2147483000, inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role='dialog' aria-modal='true' style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 14, boxShadow: '0 18px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ background: bg, color, padding: '14px 16px', fontWeight: 800, fontSize: Math.max(18, adminFieldFontSize(st)), borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{props.title}</div>
        <div style={{ padding: 16, color: '#111827', fontSize: adminFieldFontSize(st), lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{props.text}</div>
        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type='button' onClick={props.onClose} style={{ border: '1px solid #0d3b66', background: '#0d3b66', color: '#fff', borderRadius: 9, padding: '8px 14px', fontWeight: 700, fontSize: adminFieldFontSize(st), cursor: 'pointer' }}>OK</button>
        </div>
      </div>
    </div>
  )
}

function FieldGrid (props: { fields: SummaryFieldConfig[], data: any, layerFields?: LayerFieldInfo[], labelSize: number, valueSize: number }) {
  const fields = (Array.isArray(props.fields) ? props.fields : []).filter(f => String(f?.name || '').trim())
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
      {fields.map(f => {
        const raw = pickAttrCI(props.data, [f.name])
        const lf = props.layerFields ? getFieldInfo(props.layerFields, f.name) : null
        const hasDomain = !!lf?.domain?.codedValues || getFallbackDomainOptions(f.name).length > 0
        const val = hasDomain ? domainLabel(lf, raw, f.name) : looksLikeDateField(f.name) ? formatDateValue(raw) : formatValue(raw)
        return (
          <div key={`${f.name}-${f.label}`} style={{ background: '#f8fbff', border: '1px solid #c5d9f1', borderRadius: 8, padding: '8px 10px', minWidth: 0 }}>
            <div style={{ color: '#6b7280', fontSize: props.labelSize, fontWeight: 700, marginBottom: 3, overflowWrap: 'anywhere' }}>{f.label || f.name}</div>
            <div style={{ color: '#111827', fontSize: props.valueSize, fontWeight: 600, overflowWrap: 'anywhere' }}>{val}</div>
          </div>
        )
      })}
    </div>
  )
}

function cleanReportCodeText (raw: any): string {
  return String(raw ?? '')
    .trim()
    .replace(/^rapporto\s+tecnico\s+n\.?\s*/i, '')
    .replace(/^rapporto\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s+n\.?\s*/i, '')
    .replace(/^rilevazione\s*/i, '')
    .trim()
}

function normalizeRilevazioneCodeForAmm (data: any, oid: number | null): string {
  const d = data || {}
  const stored = cleanReportCodeText(pickAttrCI(d, ['numero_rilevazione', 'Numero_rilevazione', 'NUMERO_RILEVAZIONE', 'cod_pratica', 'Cod_pratica', 'COD_PRATICA', 'numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO']))
  const raw = stored.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const op = pickAttrCI(d, ['origine_pratica', 'Origine_pratica', 'ORIGINE_PRATICA'])
  let prefix = (op === 2 || op === '2' || String(op || '').toUpperCase() === 'TI') ? 'TI' : 'TR'
  let oidPart = oid != null && Number.isFinite(Number(oid)) ? String(Number(oid)) : ''
  let settore = String(pickAttrCI(d, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'Settore', 'SETTORE']) || '').trim().toUpperCase()

  let m = raw.match(/^(TR|TI)-?(\d+)(?:-([A-Z0-9]+))?$/i)
  if (m) {
    prefix = m[1].toUpperCase()
    oidPart = m[2]
    if (!settore && m[3]) settore = m[3].toUpperCase()
  } else {
    m = raw.match(/^(\d+)-?(TR|TI)(?:-([A-Z0-9]+))?$/i)
    if (m) {
      oidPart = m[1]
      prefix = m[2].toUpperCase()
      if (!settore && m[3]) settore = m[3].toUpperCase()
    } else if (!oidPart && /^\d+$/.test(raw)) {
      oidPart = raw
    }
  }

  const base = oidPart || stored || '—'
  if (base === '—') return base
  return settore ? `${base}-${prefix}-${settore}` : `${base}-${prefix}`
}

function normalizeReportCode (raw: any, oid: number | null): string {
  const code = cleanReportCodeText(raw)
  if (code) {
    const normalized = code.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
    if (/^(TR|TI)-?\d+(?:-[A-Z0-9]+)?$/.test(normalized) || /^\d+-?(TR|TI)(?:-[A-Z0-9]+)?$/.test(normalized)) return ''
    return /^\d+$/.test(code) ? `R-${code}` : code
  }
  return ''
}

function getReportCode (data: any, oid: number | null): string {
  const d = data || {}
  const official = pickAttrCI(d, [
    'numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO', 'Numero_rapporto_tecnico',
    'codice_rapporto', 'n_rapporto', 'nrapporto', 'N_RAPPORTO'
  ])
  const officialCode = normalizeReportCode(official, oid)
  if (officialCode) return officialCode
  return normalizeRilevazioneCodeForAmm(d, oid)
}

function isDaApprovalComplete (data: Record<string, any>): boolean {
  const d = data || {}
  const esitoDa = parseNumberInput(pickAttrCI(d, ['esito_DA', 'ESITO_DA']))
  const statoDa = parseNumberInput(pickAttrCI(d, ['stato_DA', 'STATO_DA']))
  return esitoDa === 2 || statoDa === 4
}

function verbaleApprovalDateValue (data: Record<string, any>): any {
  const d = data || {}
  return pickAttrCI(d, ['data_verbale']) || pickAttrCI(d, ['dt_esito_DA', 'DT_ESITO_DA']) || pickAttrCI(d, ['dt_stato_DA', 'DT_STATO_DA'])
}

function displayVerbaleApprovalDate (data: Record<string, any>, fields: LayerFieldInfo[]): string {
  const value = verbaleApprovalDateValue(data || {})
  if (!hasAdminValue(value)) return '—'
  const fieldName = hasAdminValue(pickAttrCI(data || {}, ['data_verbale'])) ? 'data_verbale' : (hasAdminValue(pickAttrCI(data || {}, ['dt_esito_DA', 'DT_ESITO_DA'])) ? 'dt_esito_DA' : 'dt_stato_DA')
  const lf = getFieldInfo(fields, fieldName)
  if (lf?.domain?.codedValues || getFallbackDomainOptions(fieldName).length) return domainLabel(lf, value, fieldName)
  return formatDateValue(value)
}

function verbaleNumberValue (data: Record<string, any>, oid?: any): string {
  const d = data || {}
  return String(pickAttrCI(d, ['numero_verbale']) || '').trim()
}

function displayVerbaleNumber (data: Record<string, any>, fields: LayerFieldInfo[], oid?: any, emptyLabel = '—'): string {
  const current = verbaleNumberValue(data || {}, oid)
  if (current) return displayAdminFieldValue(data || {}, fields, 'numero_verbale', emptyLabel)
  return emptyLabel
}

function isVerbaleDefinitivo (data: Record<string, any>): boolean {
  const d = data || {}
  return isDaApprovalComplete(d) || (hasAdminValue(verbaleNumberValue(d)) && hasAdminValue(verbaleApprovalDateValue(d)))
}

const NOTIFICA_ESITI_PERFEZIONATI = new Set(['NOTIFICATA', 'COMPIUTA_GIACENZA'])
const NOTIFICA_ESITI_NON_PERFEZIONATI = new Set(['NON_NOTIFICATA', 'IRREPERIBILE'])

function notificaEsitoCode (data: Record<string, any>): string {
  return String(pickAttrCI(data || {}, ['notifica_esito']) || '').trim().toUpperCase()
}

function isNotificaPerfezionata (data: Record<string, any>): boolean {
  const esito = notificaEsitoCode(data || {})
  return NOTIFICA_ESITI_PERFEZIONATI.has(esito) && hasAdminValue(pickAttrCI(data || {}, ['notifica_data']))
}

function isNotificaDaRipetere (data: Record<string, any>): boolean {
  return NOTIFICA_ESITI_NON_PERFEZIONATI.has(notificaEsitoCode(data || {}))
}

function isVerbaleNotificato (data: Record<string, any>): boolean {
  return isNotificaPerfezionata(data || {})
}

function buildPracticeTitle (cfg: any, data: any, oid: number | null): string {
  const d = data || {}
  const rapporto = getReportCode(d, oid)
  const numeroVerbale = verbaleNumberValue(d, oid)
  const suffix = rapporto ? ` - Rapporto tecnico n. ${rapporto}` : ''
  if (tipoAttoAmmPrevedeVerbale(d) && numeroVerbale) return `${tipoAttoAmmTitolo(d)} n. ${numeroVerbale}${suffix}`
  return `Proposta di contestazione in corso di istruttoria${suffix}`
}

function buildPracticeTitleParts (data: any, oid: number | null): { prefix: string, reportCode: string, full: string } {
  const d = data || {}
  const reportCode = getReportCode(d, oid)
  const numeroVerbale = verbaleNumberValue(d, oid)
  const prefix = tipoAttoAmmPrevedeVerbale(d) && numeroVerbale
    ? `${tipoAttoAmmTitolo(d)} n. ${numeroVerbale} - Rapporto tecnico n. `
    : 'Proposta di contestazione in corso di istruttoria - Rapporto tecnico n. '
  return { prefix, reportCode, full: `${prefix}${reportCode}` }
}


type ViolationRow = {
  key: string
  label: string
  details: Array<{ label: string, value: string }>
}

const VIOLATION_ARTICLE_TITLES: Record<string, string> = {
  '8': 'Violazione servizio di reperibilità',
  '12': 'Negato accesso ai fondi (al personale consortile)',
  '15': 'Prelievo abusivo d’acqua',
  '16': 'Presentazione tardiva comunicazione di irrigazione',
  '17': 'Presentazione tardiva comunicazione di variazione o di rinuncia',
  '27': 'Spreco d’acqua/uso negligente della risorsa idrica',
  '28': 'Violazione prescrizioni del consorzio',
  '29': 'Violazione termini restituzione attrezzature',
  '30': 'Danneggiamento e/o perdita attrezzature',
  '31': 'Mancata segnalazione guasti',
  '32': 'Negato accesso ai fondi (al consorziato)',
  '33': 'Inosservanza limiti temporali di prelievo',
  '34': 'Interferenze',
  '35': 'Manomissione reti di dispensa e allaccio di apparecchi di aspirazione all’idrante',
  '36': 'Uso attrezzature non autorizzate',
  '37': 'Uso sistemi di irrigazione incompatibili',
  '39': 'Danni alle strutture irrigue'
}

const DIRECT_ARTICLE_FIELDS: Array<{ field: string, label: string, supDich?: string[], supIrr?: string[] }> = [
  { field: 'v_art08', label: 'Art. 8', supDich: ['sup_dichiarata_art08'], supIrr: ['sup_irrigata_art08'] },
  { field: 'v_art12', label: 'Art. 12', supDich: ['sup_dichiarata_art12'], supIrr: ['sup_irrigata_art12'] },
  { field: 'v_art27', label: 'Art. 27', supDich: ['sup_dichiarata_art27'], supIrr: ['sup_irrigata_art27'] },
  { field: 'v_art28', label: 'Art. 28', supDich: ['sup_dichiarata_art28'], supIrr: ['sup_irrigata_art28'] },
  { field: 'v_art29', label: 'Art. 29', supDich: ['sup_dichiarata_art29'], supIrr: ['sup_irrigata_art29'] },
  { field: 'v_art30', label: 'Art. 30', supDich: ['sup_dichiarata_art30'], supIrr: ['sup_irrigata_art30'] },
  { field: 'v_art31', label: 'Art. 31', supDich: ['sup_dichiarata_art31'], supIrr: ['sup_irrigata_art31'] },
  { field: 'v_art32', label: 'Art. 32', supDich: ['sup_dichiarata_art32'], supIrr: ['sup_irrigata_art32'] },
  { field: 'v_art33', label: 'Art. 33', supDich: ['sup_dichiarata_art33'], supIrr: ['sup_irrigata_art33'] },
  { field: 'v_art34', label: 'Art. 34', supDich: ['sup_dichiarata_art34'], supIrr: ['sup_irrigata_art34'] },
  { field: 'v_art35', label: 'Art. 35', supDich: ['sup_dichiarata_art35'], supIrr: ['sup_irrigata_art35'] },
  { field: 'v_art36', label: 'Art. 36', supDich: ['sup_dichiarata_art36'], supIrr: ['sup_irrigata_art36'] },
  { field: 'v_art37', label: 'Art. 37', supDich: ['sup_dichiarata_art37'], supIrr: ['sup_irrigata_art37'] },
  { field: 'v_art39', label: 'Art. 39', supDich: ['sup_dichiarata_art39'], supIrr: ['sup_irrigata_art39'] }
]

function isCheckedValue (v: any): boolean {
  return v === true || v === 1 || v === '1' || String(v ?? '').trim().toLowerCase() === 'si' || String(v ?? '').trim().toLowerCase() === 'sì'
}

function isMeaningfulValue (v: any): boolean {
  return v != null && v !== '' && !(typeof v === 'number' && Number.isNaN(v))
}

function formatViolationValue (data: any, fields: LayerFieldInfo[], name: string): string {
  const raw = pickAttrCI(data, [name])
  if (!isMeaningfulValue(raw)) return ''
  const lf = getFieldInfo(fields, name)
  if (lf?.domain?.codedValues) return domainLabel(lf, raw)
  if (looksLikeDateField(name)) return formatDateValue(raw)
  return formatValue(raw)
}

function firstViolationValue (data: any, fields: LayerFieldInfo[], names: string[]): string {
  for (const n of names) {
    const v = formatViolationValue(data, fields, n)
    if (v && v !== '—') return v
  }
  return ''
}

function addViolationDetail (details: Array<{ label: string, value: string }>, label: string, value: string) {
  const v = String(value || '').trim()
  if (v && v !== '—') details.push({ label, value: v })
}

const ARTICLES_WITH_GRAVITA = new Set(['12', '27', '28', '31', '32', '33', '34', '35', '36', '37'])

function normalizeArticleNumber (raw: any): string {
  const m = String(raw ?? '').match(/(\d{1,2})(?:\.\d+)?/)
  return m ? String(Number(m[1])) : ''
}

function violationArticleLabel (raw: any): string {
  const article = normalizeArticleNumber(raw)
  if (!article) return String(raw || '').trim()
  const title = VIOLATION_ARTICLE_TITLES[article]
  return title ? `Art. ${article} - ${title}` : `Art. ${article}`
}

function parseGradiViolazioniField (raw: any): Record<string, string> {
  const out: Record<string, string> = {}
  const txt = String(raw ?? '').trim()
  if (!txt) return out

  txt.split(/[;\n,]+/).forEach(part => {
    const item = String(part || '').trim()
    if (!item) return
    const m = item.match(/(?:art\.?\s*)?(\d{1,2})(?:\.\d+)?\s*[-:=]\s*([1-4])/i)
    if (!m) return
    const article = normalizeArticleNumber(m[1])
    if (ARTICLES_WITH_GRAVITA.has(article)) out[article] = m[2]
  })

  return out
}

function normalizeGravitaValue (raw: any): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const m = s.match(/[1-4]/)
  return m ? m[0] : ''
}

function getGravitaForArticle (data: any, articleNumber: any): string {
  const d = data || {}
  const article = normalizeArticleNumber(articleNumber)
  const gradi = parseGradiViolazioniField(pickAttrCI(d, ['gradi_violazioni']))
  if (article && gradi[article]) return gradi[article]

  const specificNames = article
    ? [`grado_art${article}`, `gravita_art${article}`, `grado_art_${article}`, `gravita_art_${article}`]
    : []
  const specific = normalizeGravitaValue(pickAttrCI(d, specificNames))
  if (specific) return specific

  return normalizeGravitaValue(pickAttrCI(d, ['grado', 'gravita']))
}

function formatOccorrenzaValue (raw: any, fields: LayerFieldInfo[]): string {
  if (!isMeaningfulValue(raw)) return ''

  const lf = getFieldInfo(fields, 'occorrenza')
  if (lf?.domain?.codedValues) {
    const label = domainLabel(lf, raw)
    if (label && label !== '—') return label
  }

  const value = String(raw).trim()
  if (value === '1') return 'Prima contestazione'
  if (value === '2') return 'Recidiva'
  return formatValue(raw)
}

function addCommonViolationDetails (data: any, fields: LayerFieldInfo[], details: Array<{ label: string, value: string }>, articleNumber: any) {
  const article = normalizeArticleNumber(articleNumber)

  if (ARTICLES_WITH_GRAVITA.has(article)) {
    addViolationDetail(details, 'Grado di gravità', getGravitaForArticle(data, article))
  }

  if (article === '15') {
    addViolationDetail(details, 'Occorrenza', formatOccorrenzaValue(pickAttrCI(data, ['occorrenza']), fields))
  }
}

function buildViolationRows (data: any, fields: LayerFieldInfo[]): ViolationRow[] {
  const d = data || {}
  const rows: ViolationRow[] = []

  const norma15Parziale = firstViolationValue(d, fields, ['norma15_parziale'])
  const norma15Totale = firstViolationValue(d, fields, ['norma15_totale'])
  const art15FallbackCase = deriveArt15FallbackCase(d, fields)
  if (norma15Parziale || norma15Totale || art15FallbackCase) {
    const details: Array<{ label: string, value: string }> = []
    const tipoAbuso = firstViolationValue(d, fields, ['tipo_abuso', 'tipo_prelievo']) ||
      (norma15Parziale || art15FallbackCase.includes('PARZIALE') ? 'Parziale' : (norma15Totale || art15FallbackCase.includes('TOTALE') ? 'Totale' : ''))
    const occorrenza = formatOccorrenzaValue(pickAttrCI(d, ['occorrenza']), fields) ||
      norma15Parziale || norma15Totale ||
      (art15FallbackCase ? (art15FallbackCase.includes('RECIDIVA') ? 'Recidiva' : 'Prima contestazione') : '')
    addViolationDetail(details, 'Tipo di abuso', tipoAbuso)
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, ['sup_dichiarata_art15']))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, ['sup_irrigata_art15']))
    addViolationDetail(details, 'Occorrenza', occorrenza)
    rows.push({ key: 'art15', label: violationArticleLabel('15'), details })
  }

  const norma1617Raw = String(pickAttrCI(d, ['norma16_17']) ?? '')
  const norma1617Label = firstViolationValue(d, fields, ['norma16_17'])
  const art16On = norma1617Raw.toLowerCase().includes('art16') || norma1617Label.toLowerCase().includes('art. 16')
  if (art16On) {
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Tipo inosservanza', violationArticleLabel('16'))
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, ['sup_dichiarata_art16', 'sup_dichiarata_art16_17']))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, ['sup_irrigata_art16_17_2', 'sup_irrigata_art16_17']))
    addCommonViolationDetails(d, fields, details, '16')
    rows.push({ key: 'art16', label: violationArticleLabel('16'), details })
  }

  const art17Tipo = firstViolationValue(d, fields, ['art17_tipo'])
  const art17On = norma1617Raw.toLowerCase().includes('art17') || norma1617Label.toLowerCase().includes('art. 17') || !!art17Tipo
  if (art17On) {
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Tipo violazione', art17Tipo)
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, ['sup_dichiarata_art17_1', 'sup_dichiarata_art17_2', 'sup_dichiarata_art16_17']))
    addViolationDetail(details, 'Superficie variata/irrigata', firstViolationValue(d, fields, ['sup_irrigata_art17_1', 'sup_irrigata_art16_17_2', 'sup_irrigata_art16_17']))
    addCommonViolationDetails(d, fields, details, '17')
    rows.push({ key: 'art17', label: violationArticleLabel('17'), details })
  }

  for (const art of DIRECT_ARTICLE_FIELDS) {
    if (!isCheckedValue(pickAttrCI(d, [art.field]))) continue
    const details: Array<{ label: string, value: string }> = []
    addViolationDetail(details, 'Superficie dichiarata', firstViolationValue(d, fields, art.supDich || []))
    addViolationDetail(details, 'Superficie irrigata', firstViolationValue(d, fields, art.supIrr || []))
    addCommonViolationDetails(d, fields, details, art.label)
    rows.push({ key: art.field, label: violationArticleLabel(art.label), details })
  }

  return rows
}



const ARTICLE_CASE_MAP: Record<string, string> = {
  '08': 'C100_REPERIBILITA',
  '8': 'C100_REPERIBILITA',
  '12': 'C107_NEGATO_ACCESSO_PERSONALE',
  '27': 'C101_SPRECO_USO_NEGLIGENTE',
  '28': 'C102_VIOLAZIONE_PRESCRIZIONI',
  '29': 'C103_RESTITUZIONE_ATTREZZATURE',
  '30': 'C104_DANNEGGIAMENTO_PERDITA_ATTREZZATURE',
  '31': 'C105_MANCATA_SEGNALAZIONE_GUASTI',
  '32': 'C106_NEGATO_ACCESSO_CONSORZIATO',
  '33': 'C108_LIMITI_TEMPORALI_PRELIEVO',
  '34': 'C109_INTERFERENZE',
  '35': 'C110_MANOMISSIONE_RETI',
  '36': 'C111_ATTREZZATURE_NON_AUTORIZZATE',
  '37': 'C112_IRRIGAZIONE_INCOMPATIBILE',
  '39': 'C113_DANNI_STRUTTURE_IRRIGUE'
}

function pushUnique (arr: string[], v: string) {
  const s = String(v || '').trim()
  if (s && !arr.includes(s)) arr.push(s)
}

function fieldRawOrLabel (data: any, fields: LayerFieldInfo[], name: string): string {
  const raw = pickAttrCI(data, [name])
  const label = formatViolationValue(data, fields, name)
  return `${raw ?? ''} ${label || ''}`.trim()
}

function numericAttr (data: any, names: string[]): number | null {
  for (const name of names) {
    const raw = pickAttrCI(data, [name])
    const n = parseNumberInput(raw)
    if (n != null) return n
  }
  return null
}

function isRecidivaPractice (data: any, fields: LayerFieldInfo[]): boolean {
  const d = data || {}
  const names = ['occorrenza', 'recidiva', 'occorrenza_art15', 'art15_occorrenza', 'norma15_occorrenza']
  for (const name of names) {
    const raw = pickAttrCI(d, [name])
    const combined = normalizeToken(fieldRawOrLabel(d, fields, name))
    if (String(raw).trim() === '2') return true
    if (String(raw).trim() === '1' && normalizeToken(name).includes('RECID')) return true
    if (combined.includes('RECID')) return true
  }

  for (const [key, raw] of Object.entries(d)) {
    const k = normalizeToken(key)
    if (!k.includes('RECID') && !k.includes('OCCORRENZA')) continue
    const value = normalizeToken(raw)
    if (String(raw).trim() === '2' || value.includes('RECID')) return true
    if (k.includes('RECID') && (String(raw).trim() === '1' || value === 'SI' || value === 'SÌ')) return true
  }

  return false
}

function deriveArt15FallbackCase (data: any, fields: LayerFieldInfo[]): string {
  const dichiarata = numericAttr(data, ['sup_dichiarata_art15'])
  const irrigata = numericAttr(data, ['sup_irrigata_art15'])
  if (irrigata == null || irrigata <= 0) return ''

  const tipo = normalizeToken(fieldRawOrLabel(data, fields, 'tipo_prelievo') || fieldRawOrLabel(data, fields, 'tipo_abuso'))
  const recidiva = isRecidivaPractice(data, fields)
  const totale = tipo.includes('TOTALE') || dichiarata == null || dichiarata <= 0
  const parziale = tipo.includes('PARZIALE') || (!totale && dichiarata != null && irrigata > dichiarata)

  if (totale) return recidiva ? 'C118_PRELIEVO_TOTALE_RECIDIVA' : 'C117_PRELIEVO_TOTALE_PRIMA'
  if (parziale) return recidiva ? 'C116_PRELIEVO_PARZIALE_RECIDIVA' : 'C115_PRELIEVO_PARZIALE_PRIMA'
  return ''
}

function normalizeNotaSpeseAmount (n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null
  // Alcuni dati storici/di passaggio possono arrivare come centesimi interi
  // (es. 10889 invece di 108,89). La normalizzazione è usata solo come fallback
  // quando non sono disponibili i subtotali della nota spese.
  if (Number.isInteger(n) && n >= 10000 && n % 100 !== 0) return n / 100
  return n
}

function getNotaSpeseValueText (data: any): string {
  const d = data || {}
  const componentNames = [
    'ns_totale_attrezzature_trasporti',
    'ns_totale_materiali_costruzione',
    'ns_totale_manodopera',
    'ns_totale_semilavorati',
    'ns_totale_prodotti_finiti',
    'ns_importo_spese_generali'
  ]
  const components = componentNames
    .map(name => numericAttr(d, [name]))
    .filter((n): n is number => n != null && Number.isFinite(n) && n > 0)
  if (components.length) {
    const total = components.reduce((acc, n) => acc + n, 0)
    return total > 0 ? formatEuroText(total) : '0,00 €'
  }

  const n = normalizeNotaSpeseAmount(numericAttr(d, ['ns_totale_complessivo', 'risarcimento_danni_importo']))
  return n != null && n > 0 ? formatEuroText(n) : '0,00 €'
}

function art15SurfaceCentiareForCase (data: any, codiceCasistica: string): number | null {
  const code = String(codiceCasistica || '').toUpperCase()
  if (!code.includes('PRELIEVO_PARZIALE') && !code.includes('PRELIEVO_TOTALE')) return null

  const dichiarata = numericAttr(data || {}, ['sup_dichiarata_art15']) || 0
  const irrigata = numericAttr(data || {}, ['sup_irrigata_art15'])
  if (irrigata == null || irrigata <= 0) return null

  // Art. 15: la superficie di calcolo è sempre la differenza tra
  // superficie irrigata e superficie dichiarata. Per il prelievo totale
  // la dichiarata è normalmente pari a zero, quindi il risultato coincide
  // con l'intera superficie irrigata.
  const centiare = Math.max(0, irrigata - dichiarata)
  if (!Number.isFinite(centiare) || centiare <= 0) return null
  return centiare
}

function art15SurfaceHaForCase (data: any, codiceCasistica: string): number | null {
  const centiare = art15SurfaceCentiareForCase(data, codiceCasistica)
  return centiare == null ? null : centiare / 10000
}

function art15CalculatedValueText (data: any, codiceCasistica: string, param?: SanzioneParametro | null): string {
  const ha = art15SurfaceHaForCase(data, codiceCasistica)
  const rate = parseNumberInput(param?.valore_num)
  if (ha == null || rate == null) return ''
  return formatEuroText(rate * ha)
}

function firstArticleNumberFromCodes (raw: any): number {
  const first = splitArticleCodes(raw)[0] || ''
  const n = Number(normalizeArticleNumber(first))
  return Number.isFinite(n) ? n : 999
}

function displayViolationTitle (group: SanzioneConsultivaGroup): string {
  const article = String(firstArticleNumberFromCodes(group.articoloViolato))
  return VIOLATION_ARTICLE_TITLES[article] || sentenceFirst(group.descrizione || '') || 'Violazione contestata'
}

function isPieListaParametro (param?: SanzioneParametro | null): boolean {
  const code = normalizeToken(param?.codice_parametro || '')
  const txt = normalizeToken(`${param?.valore_testo || ''} ${param?.descrizione || ''}`)
  return code.includes('PIELISTA') || txt.includes('PIELISTA') || txt.includes('DAQUANTIFICARE')
}

function getViolationArticleFromCase (codiceCasistica: string): string {
  const code = String(codiceCasistica || '')
  const direct = Object.entries(ARTICLE_CASE_MAP).find(([, c]) => c === code)
  if (direct) return String(Number(direct[0]))
  if (code.includes('C114')) return '16'
  if (code.includes('C115') || code.includes('C116') || code.includes('C117') || code.includes('C118')) return '15'
  return ''
}

function selectedArticle1617 (data: any): string {
  const raw = normalizeToken(pickAttrCI(data || {}, ['norma16_17']))
  const art17Tipo = normalizeToken(pickAttrCI(data || {}, ['art17_tipo']))

  if (raw.includes('ART17') || raw.includes('VARIAZIONE') || raw.includes('RINUNCIA')) return '17'
  if (raw.includes('ART16') || raw.includes('IRRIGAZIONE')) return '16'
  if (art17Tipo) return '17'
  return ''
}

function firstPositiveNumericAttr (data: any, names: string[]): number | null {
  for (const name of names) {
    const n = parseNumberInput(pickAttrCI(data || {}, [name]))
    if (n != null && Number.isFinite(n) && n > 0) return n
  }
  return null
}

function comunicazioneTardivaSurfaceCentiare (data: any): number | null {
  const d = data || {}
  const article = selectedArticle1617(d)
  let centiare: number | null = null

  if (article === '16') {
    // Art. 16: la superficie di calcolo è la superficie dichiarata.
    // La superficie irrigata non rileva perché, nella comunicazione tardiva
    // di irrigazione, è sempre pari a zero.
    centiare = firstPositiveNumericAttr(d, ['sup_dichiarata_art16', 'sup_dichiarata_art16_17'])
  } else if (article === '17') {
    const tipo = normalizeToken(pickAttrCI(d, ['art17_tipo']))
    if (tipo.includes('ART171') || tipo.includes('VARIAZIONE')) {
      const dichiarata = firstPositiveNumericAttr(d, ['sup_dichiarata_art17_1', 'sup_dichiarata_art16_17'])
      const variata = firstPositiveNumericAttr(d, ['sup_irrigata_art17_1', 'sup_variata', 'sup_irrigata_art16_17_2', 'sup_irrigata_art16_17'])
      if (dichiarata != null && variata != null) {
        // Art. 17 - variazione tardiva: differenza assoluta tra superficie
        // dichiarata e superficie variata, indipendentemente dal segno.
        centiare = Math.abs(variata - dichiarata)
      }
    } else if (tipo.includes('ART172') || tipo.includes('RINUNCIA')) {
      // Art. 17 - rinuncia tardiva: la superficie irrigata è pari a zero,
      // quindi la superficie di calcolo coincide con la dichiarata.
      centiare = firstPositiveNumericAttr(d, ['sup_dichiarata_art17_2', 'sup_dichiarata_art16_17'])
    } else {
      const dichiarataVariazione = firstPositiveNumericAttr(d, ['sup_dichiarata_art17_1'])
      const variata = firstPositiveNumericAttr(d, ['sup_irrigata_art17_1', 'sup_variata', 'sup_irrigata_art16_17_2', 'sup_irrigata_art16_17'])
      const dichiarataRinuncia = firstPositiveNumericAttr(d, ['sup_dichiarata_art17_2', 'sup_dichiarata_art16_17'])
      if (dichiarataVariazione != null && variata != null) centiare = Math.abs(variata - dichiarataVariazione)
      else centiare = dichiarataRinuncia
    }
  }

  if (centiare == null || !Number.isFinite(centiare) || centiare <= 0) return null
  return centiare
}

function comunicazioneTardivaSurfaceHa (data: any): number | null {
  const centiare = comunicazioneTardivaSurfaceCentiare(data)
  return centiare == null ? null : centiare / 10000
}

function comunicazioneTardivaCalculatedValueText (data: any, param?: SanzioneParametro | null): string {
  const ha = comunicazioneTardivaSurfaceHa(data)
  const rate = parseNumberInput(param?.valore_num)
  if (ha == null || rate == null || !Number.isFinite(rate)) return ''
  return formatEuroText(rate * ha)
}

function deriveSanzioneCasistiche (data: any, fields: LayerFieldInfo[]): string[] {
  const d = data || {}
  const out: string[] = []

  const n15p = fieldRawOrLabel(d, fields, 'norma15_parziale')
  const n15t = fieldRawOrLabel(d, fields, 'norma15_totale')
  const art15Recidiva = isRecidivaPractice(d, fields)
  if (n15p) {
    const t = normalizeToken(n15p)
    pushUnique(out, art15Recidiva || t.includes('ART152') || t.includes('RECID') ? 'C116_PRELIEVO_PARZIALE_RECIDIVA' : 'C115_PRELIEVO_PARZIALE_PRIMA')
  }
  if (n15t) {
    const t = normalizeToken(n15t)
    pushUnique(out, art15Recidiva || t.includes('ART154') || t.includes('RECID') ? 'C118_PRELIEVO_TOTALE_RECIDIVA' : 'C117_PRELIEVO_TOTALE_PRIMA')
  }
  if (!n15p && !n15t) pushUnique(out, deriveArt15FallbackCase(d, fields))

  const norma1617 = fieldRawOrLabel(d, fields, 'norma16_17')
  const art17Tipo = fieldRawOrLabel(d, fields, 'art17_tipo')
  if (norma1617 || art17Tipo) pushUnique(out, 'C114_COMUNICAZIONE_TARDIVA')

  for (const art of DIRECT_ARTICLE_FIELDS) {
    if (!isCheckedValue(pickAttrCI(d, [art.field]))) continue
    const n = normalizeArticleNumber(art.label).padStart(2, '0')
    pushUnique(out, ARTICLE_CASE_MAP[n] || ARTICLE_CASE_MAP[String(Number(n))] || '')
  }

  return out
}

function dateMsOrNull (v: any): number | null {
  const d = toDateObj(v)
  return d ? d.getTime() : null
}

type PaymentSnapshot = {
  total: number
  paid: number
  residual: number
  status: string
  suggestedStatus: string
}

function paymentStatusCode (data: Record<string, any>): string {
  return String(pickAttrCI(data || {}, ['pagamento_stato']) || '').trim().toUpperCase()
}

function paymentDetailsReady (data: Record<string, any>, fields: LayerFieldInfo[]): boolean {
  const d = data || {}
  const total = parseNumberInput(pickAttrCI(d, ['pagamento_importo_totale'])) || 0
  if (total <= 0) return true
  const mode = getPaymentMode(d, fields)
  if (!mode || !hasAdminValue(pickAttrCI(d, ['pagamento_scadenza']))) return false
  if (mode === 'PAGOPA' || mode === 'MISTO') {
    if (!hasAdminValue(pickAttrCI(d, ['pagopa_iuv'])) || !hasAdminValue(pickAttrCI(d, ['pagopa_codice_avviso']))) return false
  }
  if (mode === 'BONIFICO' || mode === 'MISTO') {
    if (!hasAdminValue(pickAttrCI(d, ['bonifico_iban_snapshot']))) return false
    if (!hasAdminValue(pickAttrCI(d, ['bonifico_intestatario_snapshot']))) return false
    if (!hasAdminValue(pickAttrCI(d, ['bonifico_causale']))) return false
  }
  if (mode === 'ALTRO' && !hasAdminValue(pickAttrCI(d, ['pagamento_note']))) return false
  return true
}

function suggestedPaymentStatusCode (data: Record<string, any>, fields: LayerFieldInfo[], now = Date.now()): string {
  const d = data || {}
  const total = Math.max(0, parseNumberInput(pickAttrCI(d, ['pagamento_importo_totale'])) || 0)
  const paid = Math.max(0, parseNumberInput(pickAttrCI(d, ['pagamento_importo_incassato'])) || 0)
  const current = paymentStatusCode(d)
  if (current === 'ANNULLATO') return 'ANNULLATO'
  if (total <= 0) return ''
  if (paid >= total - 0.005) return 'PAGATO'
  if (paid > 0) return 'PARZIALE'
  if (isNotificaPerfezionata(d)) {
    const deadline = dateMsOrNull(pickAttrCI(d, ['pagamento_scadenza']))
    if (deadline != null && deadline < new Date(now).setHours(0, 0, 0, 0)) return 'SCADUTO'
    return 'NOTIFICATO'
  }
  if (paymentDetailsReady(d, fields)) return 'GENERATO'
  return 'DA_GENERARE'
}

function getPaymentSnapshot (data: Record<string, any>, fields: LayerFieldInfo[]): PaymentSnapshot {
  const total = Math.max(0, parseNumberInput(pickAttrCI(data || {}, ['pagamento_importo_totale'])) || 0)
  const paid = Math.max(0, parseNumberInput(pickAttrCI(data || {}, ['pagamento_importo_incassato'])) || 0)
  return {
    total,
    paid,
    residual: Math.max(0, roundMoneyValue(total - paid)),
    status: paymentStatusCode(data || {}),
    suggestedStatus: suggestedPaymentStatusCode(data || {}, fields)
  }
}

function paymentStatusDisplay (code: string, fields: LayerFieldInfo[]): string {
  if (!code) return '—'
  return domainLabel(getFieldInfo(fields, 'pagamento_stato'), code, 'pagamento_stato')
}

function getSanzioneReferenceDate (data: any): number {
  const d = data || {}
  return dateMsOrNull(pickAttrCI(d, ['data_verbale', 'protocollo_verbale_data', 'notifica_data', 'data_rilevazione'])) || Date.now()
}

function isRowValidAt (row: any, refMs: number): boolean {
  const from = dateMsOrNull(pickAttrCI(row, ['data_validita_da']))
  const to = dateMsOrNull(pickAttrCI(row, ['data_validita_a']))
  if (from != null && from > refMs) return false
  if (to != null && to < refMs) return false
  return true
}

function normalizeParam (row: any): SanzioneParametro {
  return {
    codice_parametro: String(pickAttrCI(row, ['codice_parametro']) || '').trim(),
    categoria_parametro: String(pickAttrCI(row, ['categoria_parametro']) || '').trim().toUpperCase(),
    valore_num: pickAttrCI(row, ['valore_num']),
    valore_testo: String(pickAttrCI(row, ['valore_testo']) || '').trim(),
    anno_riferimento: pickAttrCI(row, ['anno_riferimento']),
    data_validita_da: pickAttrCI(row, ['data_validita_da']),
    data_validita_a: pickAttrCI(row, ['data_validita_a']),
    descrizione: String(pickAttrCI(row, ['descrizione']) || '').trim(),
    note: String(pickAttrCI(row, ['note']) || '').trim()
  }
}

function normalizeArticle (row: any): RegolamentoArticolo {
  return {
    codice_articolo: String(pickAttrCI(row, ['codice_articolo']) || '').trim().toUpperCase(),
    numero_articolo: pickAttrCI(row, ['numero_articolo']),
    titolo_articolo: String(pickAttrCI(row, ['titolo_articolo']) || '').trim(),
    testo_articolo: String(pickAttrCI(row, ['testo_articolo']) || '').trim(),
    atto_regolamento: String(pickAttrCI(row, ['atto_regolamento']) || '').trim(),
    anno_riferimento: pickAttrCI(row, ['anno_riferimento']),
    data_validita_da: pickAttrCI(row, ['data_validita_da']),
    data_validita_a: pickAttrCI(row, ['data_validita_a']),
    attivo: pickAttrCI(row, ['attivo']),
    note: String(pickAttrCI(row, ['note']) || '').trim()
  }
}

function normalizeRaccordo (row: any): RegolamentoRaccordo {
  return {
    codice_casistica: String(pickAttrCI(row, ['codice_casistica']) || '').trim(),
    articolo_violato: String(pickAttrCI(row, ['articolo_violato']) || '').trim().toUpperCase(),
    articolo_sanzione: String(pickAttrCI(row, ['articolo_sanzione']) || '').trim().toUpperCase(),
    codice_parametro: String(pickAttrCI(row, ['codice_parametro']) || '').trim(),
    descrizione: String(pickAttrCI(row, ['descrizione']) || '').trim(),
    attivo: pickAttrCI(row, ['attivo'])
  }
}

function splitArticleCodes (raw: any): string[] {
  return String(raw || '')
    .toUpperCase()
    .split(/[\/;,|+]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function formatArticleCode (raw: any): string {
  const s = String(raw || '').trim()
  const article = normalizeArticleNumber(s)
  return article ? `Art. ${article}` : s.toUpperCase()
}

function formatArticleFallback (raw: any): string {
  const parts = splitArticleCodes(raw)
  return parts.length ? parts.map(formatArticleCode).join(', ') : '—'
}

function cleanLabelText (raw: any): string {
  return String(raw || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sentenceFirst (raw: any): string {
  const s = cleanLabelText(raw)
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function stripNormPrefix (raw: any): string {
  return cleanLabelText(raw).replace(/^Art\.\s*\d+\s*[-–]\s*/i, '')
}

function raccordoMainDescription (raw: any): string {
  const s = cleanLabelText(raw)
  if (!s) return 'Violazione contestata'
  const parts = s.split(/\s+-\s+/)
  return sentenceFirst(parts[0] || s)
}

function voceDescriptionFromRaccordo (raw: any): string {
  const s = cleanLabelText(raw)
  const parts = s.split(/\s+-\s+/)
  return sentenceFirst(parts.length > 1 ? parts.slice(1).join(' - ') : s)
}

function formatParametroValue (param?: SanzioneParametro | null): string {
  if (!param) return 'Parametro non trovato'
  const txt = String(param.valore_testo || '').trim()
  const raw = param.valore_num
  const n = raw == null || raw === '' ? null : Number(String(raw).replace(',', '.'))
  if (n == null || !Number.isFinite(n)) return txt || 'Da quantificare'
  const cat = String(param.categoria_parametro || '').toUpperCase()
  const code = String(param.codice_parametro || '').toUpperCase()
  if (n === 0 && txt && /quantificare|definire|pi[eè]\s*lista/i.test(txt)) return txt
  if (cat === 'TERMINE') return `${n.toLocaleString('it-IT', { maximumFractionDigits: 0 })} giorni`
  if (code.includes('PERCENTUALE') || cat === 'RIDUZIONE') return `${n.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`
  if (code.includes('EURO_HA')) return `${formatEuroText(n)}/ha`
  if (['SANZIONE', 'ATTREZZATURA', 'CAUZIONE', 'SPESE', 'RIMBORSO'].includes(cat)) return formatEuroText(n)
  return txt ? `${n.toLocaleString('it-IT')} — ${txt}` : n.toLocaleString('it-IT')
}

function formatVoceValue (voce: SanzioneConsultivaVoce): string {
  return voce.valueOverride || formatParametroValue(voce.parametro)
}

function parseEuroTextValue (value: any): number | null {
  const s = String(value ?? '').trim()
  if (!s || !s.includes('€')) return null
  const m = s.match(/-?\d+(?:[\.,]\d{3})*(?:[\.,]\d+)?/)
  if (!m) return null
  return parseNumberInput(m[0])
}

function voceAppliedAmount (voce: SanzioneConsultivaVoce): number | null {
  if (voce.valueOverride) return parseEuroTextValue(voce.valueOverride)
  const param = voce.parametro
  if (!param) return null
  const cat = String(param.categoria_parametro || '').toUpperCase()
  const code = String(param.codice_parametro || '').toUpperCase()
  if (cat === 'TERMINE' || cat === 'RIDUZIONE') return null
  if (code.includes('PERCENTUALE') || code.includes('EURO_HA')) return null
  if (!['SANZIONE', 'RISARCIMENTO', 'RIMBORSO', 'ATTREZZATURA', 'CAUZIONE', 'SPESE'].includes(cat)) return null
  const n = parseNumberInput(param.valore_num)
  return n != null && Number.isFinite(n) ? n : null
}

function groupsAppliedTotal (groups: SanzioneConsultivaGroup[]): number {
  return (groups || []).reduce((acc, group) => {
    return acc + (group.voci || []).reduce((inner, voce) => {
      const n = voceAppliedAmount(voce)
      return inner + (n != null && Number.isFinite(n) ? n : 0)
    }, 0)
  }, 0)
}

function voceSubtotalAmount (voce: SanzioneConsultivaVoce): number | null {
  const amount = voceAppliedAmount(voce)
  if (amount == null || !Number.isFinite(amount)) return null
  const categoria = String(voce.parametro?.categoria_parametro || '').toUpperCase()
  if (categoria === 'CAUZIONE') return -Math.abs(amount)
  return amount
}

function SanzioniHeaderTotal (props: { groups: SanzioneConsultivaGroup[] }) {
  const st = useAdminStyle()
  const total = groupsAppliedTotal(props.groups || [])
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 8px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.14)',
      border: '1px solid rgba(255,255,255,0.22)',
      color: '#fff',
      fontSize: adminLabelFontSize(st),
      fontWeight: 900,
      textTransform: 'none',
      letterSpacing: 0
    }}>
      Totale importi: {formatEuroText(total)}
    </span>
  )
}

function formatSurfaceHaACaForCalculation (centiare: number): string {
  const total = Math.max(0, Math.round(Number(centiare) || 0))
  const ha = Math.floor(total / 10000)
  const are = Math.floor((total % 10000) / 100)
  const ca = total % 100
  return `${ha}.${String(are).padStart(2, '0')}.${String(ca).padStart(2, '0')} (ha.a.ca)`
}

function formatSurfaceHaDecimalNumberForCalculation (centiare: number): string {
  const ha = Math.max(0, Number(centiare) || 0) / 10000
  return ha.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

function formatEuroNumberForCalculation (value: number): string {
  return formatEuroText(value).replace(/\s*€$/, '')
}

function formatEuroPerHa (value: number): string {
  return `${formatEuroNumberForCalculation(value)} €/ha`
}

function calculationSurfaceCentiare (group: SanzioneConsultivaGroup, data: Record<string, any>): number | null {
  const article = normalizeArticleNumber(group.articoloViolato)
  if (article === '15') return art15SurfaceCentiareForCase(data, group.codiceCasistica)
  if (String(group.codiceCasistica || '').toUpperCase().includes('C114')) return comunicazioneTardivaSurfaceCentiare(data)
  return null
}

function calculationOccurrenceLabel (group: SanzioneConsultivaGroup, data: Record<string, any>, fields: LayerFieldInfo[]): string {
  const article = normalizeArticleNumber(group.articoloViolato)
  if (article !== '15') return ''
  const caseCode = normalizeToken(group.codiceCasistica)
  if (caseCode.includes('RECIDIVA')) return 'Recidiva'
  if (caseCode.includes('PRIMA')) return 'Prima contestazione'
  return formatOccorrenzaValue(pickAttrCI(data || {}, ['occorrenza']), fields)
}

function normalizeArt15AbuseTypeLabel (raw: any): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  const token = normalizeToken(value)
  if (token.includes('PARZIALE')) return 'Parziale'
  if (token.includes('TOTALE')) return 'Totale'
  return value
}

function art15AbuseTypeLabel (data: Record<string, any>, fields: LayerFieldInfo[], caseCodeRaw?: any): string {
  const direct = normalizeArt15AbuseTypeLabel(firstViolationValue(data || {}, fields || [], ['tipo_abuso', 'tipo_prelievo']))
  if (direct) return direct

  if (isCheckedValue(pickAttrCI(data || {}, ['norma15_parziale']))) return 'Parziale'
  if (isCheckedValue(pickAttrCI(data || {}, ['norma15_totale']))) return 'Totale'

  const fallback = normalizeToken(caseCodeRaw || deriveArt15FallbackCase(data || {}, fields || []))
  if (fallback.includes('PARZIALE')) return 'Parziale'
  if (fallback.includes('TOTALE')) return 'Totale'
  return ''
}

function normalizeArt17CommunicationTypeLabel (raw: any): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  const token = normalizeToken(value)
  if (token.includes('VARIAZIONE')) return 'Variazione tardiva'
  if (token.includes('RINUNCIA')) return 'Rinuncia tardiva'
  return value
}

function art17CommunicationTypeLabel (data: Record<string, any>, fields: LayerFieldInfo[], caseCodeRaw?: any): string {
  const direct = normalizeArt17CommunicationTypeLabel(firstViolationValue(data || {}, fields || [], ['art17_tipo']))
  if (direct) return direct
  const fallback = normalizeToken(caseCodeRaw || '')
  if (fallback.includes('VARIAZIONE')) return 'Variazione tardiva'
  if (fallback.includes('RINUNCIA')) return 'Rinuncia tardiva'
  return ''
}

function calculationGravityLabel (group: SanzioneConsultivaGroup, data: Record<string, any>): string {
  const article = normalizeArticleNumber(group.articoloViolato)
  if (!ARTICLES_WITH_GRAVITA.has(article)) return ''
  return getGravitaForArticle(data || {}, article)
}

type Art30EquipmentKind = 'tessera' | 'curve' | 'sifoni' | 'paratoie'

const ART30_EQUIPMENT_META: Record<Art30EquipmentKind, { label: string, tokens: string[] }> = {
  tessera: { label: 'tessera elettronica', tokens: ['TESSERA', 'TESSERE', 'TESSERAELETTRONICA', 'TESSEREELETTRONICHE'] },
  curve: { label: 'curve di derivazione', tokens: ['CURVA', 'CURVE', 'CURVADIDERIVAZIONE', 'CURVEDIDERIVAZIONE'] },
  sifoni: { label: 'sifoni', tokens: ['SIFONE', 'SIFONI'] },
  paratoie: { label: 'paratoie', tokens: ['PARATOIA', 'PARATOIE'] }
}

function art30EquipmentKindFromText (raw: any): Art30EquipmentKind | null {
  const token = normalizeToken(raw)
  if (!token) return null
  for (const kind of Object.keys(ART30_EQUIPMENT_META) as Art30EquipmentKind[]) {
    if (ART30_EQUIPMENT_META[kind].tokens.some(value => token.includes(value))) return kind
  }
  return null
}

const NOTA_SPESE_CASE_ALIASES: Record<string, string[]> = {
  C101_SPRECO_USO_NEGLIGENTE: ['C101_SPRECO_ACQUA'],
  C104_DANNEGGIAMENTO_PERDITA_ATTREZZATURE: ['C104_ATTREZZATURE_DANNEGGIATE']
}

function normalizedCaseCodes (codiceCasistica: string): Set<string> {
  const code = String(codiceCasistica || '').trim().toUpperCase()
  const out = new Set<string>()
  if (code) out.add(code)
  ;(NOTA_SPESE_CASE_ALIASES[code] || []).forEach(alias => out.add(String(alias || '').trim().toUpperCase()))
  Object.entries(NOTA_SPESE_CASE_ALIASES).forEach(([mainCode, aliases]) => {
    if (aliases.some(alias => String(alias || '').trim().toUpperCase() === code)) {
      out.add(mainCode)
      aliases.forEach(alias => out.add(String(alias || '').trim().toUpperCase()))
    }
  })
  return out
}

function isArt30CaseCode (codiceCasistica: string): boolean {
  const codes = normalizedCaseCodes(codiceCasistica)
  return codes.has('C104_DANNEGGIAMENTO_PERDITA_ATTREZZATURE') || codes.has('C104_ATTREZZATURE_DANNEGGIATE')
}

type Art30EquipmentSelection = {
  codice: string
  descrizione: string
  quantita: number
  valoreUnitario: number | null
  importo: number
}

const ART30_EQUIPMENT_ORDER: Art30EquipmentKind[] = ['tessera', 'curve', 'sifoni', 'paratoie']

function parseArt30EquipmentSelections (data: Record<string, any>): Map<Art30EquipmentKind, Art30EquipmentSelection> {
  const out = new Map<Art30EquipmentKind, Art30EquipmentSelection>()
  const raw = String(pickAttrCI(data || {}, ['attrezzature_rimborso_dettaglio']) || '')
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    const kind = art30EquipmentKindFromText(text)
    if (!kind) continue
    const quantityMarker = text.match(/\s+—\s+Quantità:\s*([0-9.,]+)/i)
    const prefix = quantityMarker?.index != null ? text.slice(0, quantityMarker.index).trim() : text
    const codeMatch = prefix.match(/^(.*?)\s+—\s+Codice:\s*(.+)$/i)
    const descrizione = String(codeMatch?.[1] || prefix || ART30_EQUIPMENT_META[kind].label).trim()
    const codice = String(codeMatch?.[2] || '').trim()
    const full = text.match(/Quantità:\s*([0-9.,]+).*?Valore unitario:\s*([0-9.,]+)\s*€.*?Importo:\s*([0-9.,]+)\s*€/i)
    if (full) {
      // I gruppi catturati non includono il simbolo €: usare il parser numerico
      // generico, non parseEuroTextValue (che richiede espressamente "€").
      const quantita = parseNumberInput(full[1]) || 0
      const valoreUnitario = parseNumberInput(full[2])
      const importo = parseNumberInput(full[3]) || 0
      if (quantita > 0 && importo >= 0) out.set(kind, { codice, descrizione, quantita, valoreUnitario, importo })
      continue
    }
    const legacyAmount = parseEuroTextValue(text)
    if (legacyAmount != null && legacyAmount >= 0) {
      out.set(kind, {
        codice,
        descrizione: descrizione || ART30_EQUIPMENT_META[kind].label,
        quantita: 1,
        valoreUnitario: legacyAmount,
        importo: legacyAmount
      })
    }
  }
  return out
}

function selectedArt30Equipment (data: Record<string, any>, _noteRows: NotaSpeseDetailRow[] = []): Set<Art30EquipmentKind> {
  return new Set(parseArt30EquipmentSelections(data).keys())
}

function notaSpeseTotalForCase (noteRows: NotaSpeseDetailRow[], codiceCasistica: string, data: Record<string, any>): number | null {
  const acceptedCodes = normalizedCaseCodes(codiceCasistica)
  const rows = (noteRows || []).filter(row => acceptedCodes.has(String(row.codiceCasistica || '').trim().toUpperCase()))
  if (!rows.length) return null
  const imponibile = rows.reduce((sum, row) => sum + (Number.isFinite(row.importoRiga) ? row.importoRiga : 0), 0)
  const configuredPercentage = parseNumberInput(pickAttrCI(data || {}, ['ns_spese_generali_perc']))
  const percentage = configuredPercentage != null && Number.isFinite(configuredPercentage) ? configuredPercentage : 15
  return roundMoneyValue(imponibile + (imponibile * percentage / 100))
}

function art30CauzioneSelected (data: Record<string, any>): boolean {
  const rawFlag = pickAttrCI(data || {}, ['attrezzature_cauzione_presente'])
  return rawFlag != null && rawFlag !== '' && isCheckedValue(rawFlag)
}

function art30EquipmentLineLabel (voce: SanzioneConsultivaVoce): string {
  const kind = art30EquipmentKindFromText(`${voce.codiceParametro} ${voce.descrizione} ${voce.parametro?.descrizione || ''}`)
  return kind ? `Rimborso ${ART30_EQUIPMENT_META[kind].label}` : 'Rimborso attrezzatura'
}

function art30VoceOrder (voce: SanzioneConsultivaVoce): number {
  const categoria = String(voce.parametro?.categoria_parametro || '').toUpperCase()
  if (categoria === 'CAUZIONE') return 100
  if (categoria === 'RISARCIMENTO' || isPieListaParametro(voce.parametro)) return 80
  const kind = art30EquipmentKindFromText(`${voce.codiceParametro} ${voce.descrizione} ${voce.parametro?.descrizione || ''}`)
  if (kind === 'tessera') return 10
  if (kind === 'curve') return 20
  if (kind === 'sifoni') return 30
  if (kind === 'paratoie') return 40
  return 60
}

function calculationDetailLinesForVoce (
  group: SanzioneConsultivaGroup,
  voce: SanzioneConsultivaVoce,
  data: Record<string, any>
): string[] {
  const parametro = voce.parametro || null
  const categoria = String(parametro?.categoria_parametro || '').toUpperCase()
  const codice = String(parametro?.codice_parametro || voce.codiceParametro || '').toUpperCase()
  const article = normalizeArticleNumber(group.articoloViolato)
  const base = parseNumberInput(parametro?.valore_num)
  const amount = voceAppliedAmount(voce)
  const lines: string[] = []

  if (categoria === 'RISARCIMENTO' || isPieListaParametro(parametro)) {
    const value = amount != null && Number.isFinite(amount) ? amount : 0
    if (article === '8' || article === '30') lines.push(`Rimborso spese a piè di lista: ${formatEuroText(value)}`)
    else lines.push(`Importo a piè di lista: ${formatEuroText(value)}`)
    return lines
  }

  if (codice.includes('EURO_HA')) {
    if (base != null && Number.isFinite(base)) lines.push(`Sanzione pecuniaria base: ${formatEuroPerHa(base)}`)
    const centiare = calculationSurfaceCentiare(group, data)
    if (centiare != null && Number.isFinite(centiare) && centiare > 0) {
      const ha = centiare / 10000
      const calculated = amount != null && Number.isFinite(amount)
        ? amount
        : (base != null && Number.isFinite(base) ? base * ha : null)
      lines.push(`Superficie di calcolo: ${formatSurfaceHaACaForCalculation(centiare)}`)
      if (base != null && Number.isFinite(base) && calculated != null && Number.isFinite(calculated)) {
        lines.push(`Sanzione calcolata: ${formatEuroNumberForCalculation(base)} × ${formatSurfaceHaDecimalNumberForCalculation(centiare)} = ${formatEuroText(calculated)}`)
      }
    } else {
      lines.push('Superficie di calcolo: non disponibile')
    }
    return lines
  }

  if (categoria === 'RIDUZIONE') {
    if (base != null && Number.isFinite(base)) {
      if (codice.includes('PERCENTUALE') || base <= 100) {
        lines.push(`Riduzione prevista dal regolamento: ${base.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`)
      } else {
        lines.push(`Importo della riduzione previsto dal regolamento: ${formatEuroText(base)}`)
      }
    }
    return lines
  }

  if (categoria === 'CAUZIONE') {
    const value = amount != null && Number.isFinite(amount) ? amount : base
    if (value != null && Number.isFinite(value)) lines.push(`Cauzione da detrarre: - ${formatEuroText(Math.abs(value))}`)
    return lines
  }

  if (article === '30' && (categoria === 'ATTREZZATURA' || categoria === 'RIMBORSO')) {
    const value = amount != null && Number.isFinite(amount) ? amount : base
    if (value != null && Number.isFinite(value)) lines.push(`${art30EquipmentLineLabel(voce)}: ${formatEuroText(value)}`)
    return lines
  }

  if (categoria === 'SANZIONE') {
    const value = amount != null && Number.isFinite(amount) ? amount : base
    if (value != null && Number.isFinite(value)) {
      const label = ARTICLES_WITH_GRAVITA.has(article) ? 'Sanzione pecuniaria variabile' : 'Sanzione pecuniaria fissa'
      lines.push(`${label}: ${formatEuroText(value)}`)
    }
    return lines
  }

  if (base != null && Number.isFinite(base) && ['RIMBORSO', 'ATTREZZATURA', 'SPESE'].includes(categoria)) {
    const label = categoria === 'SPESE' ? 'Spese' : 'Rimborso'
    lines.push(`${label}: ${formatEuroText(base)}`)
    return lines
  }

  const displayed = formatVoceValue(voce)
  if (displayed && displayed !== '—') lines.push(`Importo applicato: ${displayed}`)
  return lines
}

function roundMoneyValue (value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

function sameDraftValue (a: any, b: any, fieldName: string): boolean {
  if (MONEY_FIELDS.has(fieldName)) {
    const na = parseNumberInput(a)
    const nb = parseNumberInput(b)
    if (na == null && nb == null) return true
    if (na == null || nb == null) return false
    return Math.abs(roundMoneyValue(na) - roundMoneyValue(nb)) < 0.005
  }
  return normalizeAuditComparable(a) === normalizeAuditComparable(b)
}

function buildAutomaticSanzioneCalculation (
  groups: SanzioneConsultivaGroup[],
  data: Record<string, any>,
  fields: LayerFieldInfo[],
  profile: { username: string, fullName: string },
  previousDraft: Record<string, any>
): Record<string, any> {
  const validGroups = groups || []
  if (!validGroups.length) return {}

  let sanzioneBase = 0
  let risarcimentoDanni = 0
  let rimborsoAttrezzature = 0
  let cauzioneDecurtata = 0
  let speseNotificaAutomatica = 0
  let riduzionePercentuale: number | null = null
  let riduzioneImporto: number | null = null
  const dettaglio: string[] = []
  const attrezzatureDettaglio: string[] = []

  validGroups.forEach(group => {
    dettaglio.push(`${formatArticleFallback(group.articoloViolato)} — ${displayViolationTitle(group)}`)
    const normaSanzionatoria = articleListTitle(group.articoliSanzione || [], group.articoloSanzione)
    if (normaSanzionatoria && normaSanzionatoria !== '—') {
      dettaglio.push(`- Norma sanzionatoria: ${normaSanzionatoria}`)
    }
    const articleNumber = normalizeArticleNumber(group.articoloViolato)
    const occurrence = calculationOccurrenceLabel(group, data, fields)
    const gravity = calculationGravityLabel(group, data)
    if (articleNumber === '15') {
      const tipoAbuso = art15AbuseTypeLabel(data, fields, group.codiceCasistica)
      if (tipoAbuso) dettaglio.push(`- Tipo di abuso: ${tipoAbuso}`)
    }
    if (articleNumber === '17') {
      const tipoComunicazione = art17CommunicationTypeLabel(data, fields, group.codiceCasistica)
      if (tipoComunicazione) dettaglio.push(`- Tipo comunicazione: ${tipoComunicazione}`)
    }
    if (occurrence) dettaglio.push(`- Occorrenza: ${occurrence}`)
    if (gravity) dettaglio.push(`- Grado di gravità: ${gravity}`)

    ;(group.voci || []).forEach(voce => {
      const parametro = voce.parametro || null
      const categoria = String(parametro?.categoria_parametro || '').toUpperCase()
      const codice = String(parametro?.codice_parametro || voce.codiceParametro || '').toUpperCase()
      const amount = voceAppliedAmount(voce)
      const voceDetailLines = calculationDetailLinesForVoce(group, voce, data)
      voceDetailLines.forEach(line => dettaglio.push(`- ${line}`))
      if (normalizeArticleNumber(group.articoloViolato) === '30' && ['ATTREZZATURA', 'RIMBORSO', 'CAUZIONE'].includes(categoria)) {
        attrezzatureDettaglio.push(...voceDetailLines)
      }


      if (categoria === 'RIDUZIONE') {
        const n = parseNumberInput(parametro?.valore_num)
        if (n != null && Number.isFinite(n)) {
          if (codice.includes('PERCENTUALE') || n <= 100) riduzionePercentuale = n
          else riduzioneImporto = n
        }
        return
      }

      if (amount == null || !Number.isFinite(amount)) return
      if (categoria === 'SANZIONE') sanzioneBase += amount
      else if (categoria === 'RISARCIMENTO') risarcimentoDanni += amount
      else if (categoria === 'RIMBORSO' || categoria === 'ATTREZZATURA') rimborsoAttrezzature += amount
      else if (categoria === 'CAUZIONE') cauzioneDecurtata += amount
      else if (categoria === 'SPESE') speseNotificaAutomatica += amount
    })
    dettaglio.push('')
  })

  const speseManuali = parseNumberInput(pickAttrCI(previousDraft || {}, ['sanzione_spese_notifica']))
  const speseNotifica = speseManuali != null && Number.isFinite(speseManuali)
    ? Math.max(0, speseManuali)
    : speseNotificaAutomatica

  // Gli importi e il dettaglio dell'Art. 30 costituiscono uno snapshot tecnico
  // definito nella fase AGR/TEC. La fase amministrativa deve applicarli senza
  // ricostruirli dai parametri correnti, che contengono valori unitari.
  const art30Snapshot = { ...(data || {}), ...(previousDraft || {}) }
  const art30SnapshotDetail = String(pickAttrCI(art30Snapshot, ['attrezzature_rimborso_dettaglio']) || '')
  const art30SnapshotGrossRaw = pickAttrCI(art30Snapshot, ['attrezzature_rimborso_importo'])
  const art30SnapshotCauzioneRaw = pickAttrCI(art30Snapshot, ['attrezzature_cauzione_decurtata'])
  const art30SnapshotNettoRaw = pickAttrCI(art30Snapshot, ['attrezzature_importo_netto'])
  const art30SnapshotGross = parseNumberInput(art30SnapshotGrossRaw)
  const art30SnapshotCauzione = parseNumberInput(art30SnapshotCauzioneRaw)
  const art30Selections = parseArt30EquipmentSelections(art30Snapshot)
  const art30DetailGross = Array.from(art30Selections.values()).reduce((sum, item) => sum + (Number(item.importo) || 0), 0)
  const hasArt30Snapshot = !!art30SnapshotDetail.trim() ||
    (art30SnapshotGrossRaw != null && art30SnapshotGrossRaw !== '') ||
    (art30SnapshotCauzioneRaw != null && art30SnapshotCauzioneRaw !== '') ||
    (art30SnapshotNettoRaw != null && art30SnapshotNettoRaw !== '')

  if (hasArt30Snapshot) {
    const calculatedRimborsoAttrezzature = rimborsoAttrezzature
    const calculatedCauzioneDecurtata = cauzioneDecurtata
    rimborsoAttrezzature = art30SnapshotGross != null && Number.isFinite(art30SnapshotGross)
      ? Math.max(0, art30SnapshotGross)
      : (art30DetailGross > 0 ? Math.max(0, art30DetailGross) : calculatedRimborsoAttrezzature)
    cauzioneDecurtata = art30CauzioneSelected(art30Snapshot)
      ? (art30SnapshotCauzione != null && Number.isFinite(art30SnapshotCauzione)
          ? Math.max(0, art30SnapshotCauzione)
          : calculatedCauzioneDecurtata)
      : 0
  }

  const importoNettoAttrezzature = Math.max(0, rimborsoAttrezzature - cauzioneDecurtata)
  const sanzioneRidotta = riduzioneImporto != null
    ? riduzioneImporto
    : riduzionePercentuale != null
      ? sanzioneBase * (riduzionePercentuale / 100)
      : null
  const sanzionePerTotale = sanzioneRidotta != null ? sanzioneRidotta : sanzioneBase
  const totale = sanzionePerTotale + risarcimentoDanni + importoNettoAttrezzature + speseNotifica
  const user = String(profile.fullName || profile.username || '').trim()


  const currentCalcDate = pickAttrCI(previousDraft, ['sanzione_calcolata_il'])
  const currentCalcUser = String(pickAttrCI(previousDraft, ['sanzione_calcolata_da']) || '').trim()

  return {
    sanzione_importo_base: roundMoneyValue(sanzioneBase),
    sanzione_importo_ridotta: sanzioneRidotta != null ? roundMoneyValue(sanzioneRidotta) : null,
    risarcimento_danni_importo: roundMoneyValue(risarcimentoDanni),
    sanzione_spese_notifica: roundMoneyValue(speseNotifica),
    attrezzature_rimborso_importo: roundMoneyValue(rimborsoAttrezzature),
    attrezzature_cauzione_decurtata: roundMoneyValue(cauzioneDecurtata),
    attrezzature_importo_netto: roundMoneyValue(importoNettoAttrezzature),
    attrezzature_rimborso_dettaglio: art30SnapshotDetail.trim() ? art30SnapshotDetail : attrezzatureDettaglio.join('\n'),
    pagamento_importo_totale: roundMoneyValue(totale),
    sanzione_dettaglio_calcolo: dettaglio.join('\n'),
    sanzione_calcolata_il: currentCalcDate || Date.now(),
    sanzione_calcolata_da: currentCalcUser || user
  }
}

function amountFromDraft (data: Record<string, any>, fieldName: string): number {
  const n = parseNumberInput(pickAttrCI(data, [fieldName]))
  return n != null && Number.isFinite(n) ? n : 0
}

function normalizeTipoAttoAmmCode (raw: any): string {
  const value = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (value === 'VERBALE_MISTO') return 'VERBALE_RISARCIMENTO'
  if (value.includes('ARCHIV')) return 'ARCHIVIAZIONE'
  if (value.includes('VERBALE') && (value.includes('MIST') || value.includes('RISARC') || value.includes('RIMBORS'))) return 'VERBALE_RISARCIMENTO'
  if (value.includes('RIMBORS') && value.includes('RISARC')) return 'RIMBORSO_RISARCIMENTO'
  if (value.includes('RIMBORS')) return 'RIMBORSO'
  if (value.includes('RISARC') || value.includes('DANN')) return 'RISARCIMENTO_DANNI'
  if (value.includes('VERBALE')) return 'VERBALE'
  return value
}

function tipoAttoAmmCode (data: Record<string, any>): string {
  return normalizeTipoAttoAmmCode(pickAttrCI(data || {}, ['tipo_atto_amm']))
}

function tipoAttoAmmPrevedeVerbale (data: Record<string, any>): boolean {
  const code = tipoAttoAmmCode(data || {})
  return code === 'VERBALE' || code === 'VERBALE_RISARCIMENTO'
}

function tipoAttoAmmTitolo (data: Record<string, any>): string {
  const code = tipoAttoAmmCode(data || {})
  if (code === 'RIMBORSO') return 'Richiesta di rimborso'
  if (code === 'RISARCIMENTO_DANNI') return 'Richiesta di risarcimento danni'
  if (code === 'RIMBORSO_RISARCIMENTO') return 'Richiesta di rimborso e risarcimento danni'
  if (code === 'VERBALE_RISARCIMENTO') return 'Verbale misto'
  if (code === 'ARCHIVIAZIONE') return 'Archiviazione / non luogo a procedere'
  return 'Verbale amministrativo'
}

function buildAutomaticAttoAmministrativo (data: Record<string, any>): Record<string, any> {
  const d = data || {}
  const sanzioneBase = amountFromDraft(d, 'sanzione_importo_base')
  const sanzioneRidotta = amountFromDraft(d, 'sanzione_importo_ridotta')
  const sanzione = sanzioneRidotta > 0 ? sanzioneRidotta : sanzioneBase
  const rimborso = amountFromDraft(d, 'attrezzature_importo_netto')
  const risarcimento = amountFromDraft(d, 'risarcimento_danni_importo')
  const hasSanzione = sanzione > 0
  const hasRimborso = rimborso > 0
  const hasRisarcimento = risarcimento > 0

  let tipo = 'ARCHIVIAZIONE'
  if (hasSanzione && (hasRimborso || hasRisarcimento)) tipo = 'VERBALE_RISARCIMENTO'
  else if (hasSanzione) tipo = 'VERBALE'
  else if (hasRimborso && hasRisarcimento) tipo = 'RIMBORSO_RISARCIMENTO'
  else if (hasRimborso) tipo = 'RIMBORSO'
  else if (hasRisarcimento) tipo = 'RISARCIMENTO_DANNI'

  const nRapporto = String(pickAttrCI(d, ['numero_rapporto_tecnico', 'n_rapporto', 'numero_rapporto', 'codice_rapporto', 'cod_pratica', 'objectid', 'OBJECTID']) || '').trim()
  const rapportoSuffix = nRapporto ? ` n. ${nRapporto}` : ''
  let oggetto = `Archiviazione del procedimento amministrativo conseguente al rapporto tecnico${rapportoSuffix}`
  if (tipo === 'VERBALE') {
    oggetto = `Verbale amministrativo conseguente al rapporto tecnico${rapportoSuffix}`
  } else if (tipo === 'RIMBORSO') {
    oggetto = `Richiesta di rimborso conseguente al rapporto tecnico${rapportoSuffix}`
  } else if (tipo === 'RISARCIMENTO_DANNI') {
    oggetto = `Richiesta di risarcimento danni conseguente al rapporto tecnico${rapportoSuffix}`
  } else if (tipo === 'RIMBORSO_RISARCIMENTO') {
    oggetto = `Richiesta di rimborso e risarcimento danni conseguente al rapporto tecnico${rapportoSuffix}`
  } else if (tipo === 'VERBALE_RISARCIMENTO') {
    const richiesta = hasRimborso && hasRisarcimento
      ? 'richiesta di rimborso e risarcimento danni'
      : hasRimborso
        ? 'richiesta di rimborso'
        : 'richiesta di risarcimento danni'
    oggetto = `Verbale amministrativo con ${richiesta} conseguente al rapporto tecnico${rapportoSuffix}`
  }

  return {
    tipo_atto_amm: tipo,
    oggetto_atto_amm: oggetto
  }
}

function buildDefaultAdminNote (key: string, data: Record<string, any>): string {
  const nRapporto = String(pickAttrCI(data || {}, ['n_rapporto', 'numero_rapporto', 'codice_rapporto', 'cod_pratica']) || '').trim()
  const rapporto = nRapporto ? ` n. ${nRapporto}` : ''
  if (key === 'completezza') return `Verificata la completezza del rapporto approvato${rapporto} e della documentazione disponibile ai fini della predisposizione dell’atto amministrativo.`
  if (key === 'notifica') return `Predisposta la bozza dell’atto amministrativo; restano da completare protocollazione, notifica e registrazione dell'avviso di pagamento.`
  if (key === 'integrazione') return `Dalla verifica amministrativa emergono elementi da integrare prima della chiusura dell'istruttoria.`
  if (key === 'ri') return `Istruttoria amministrativa predisposta per la successiva verifica del RI_AMM.`
  return ''
}

function NoteAmministrativeQuickActions (props: { data: Record<string, any>, canEdit: boolean, onApply: (text: string) => void }) {
  const actions = [
    { key: 'completezza', label: 'Rapporto completo' },
    { key: 'notifica', label: 'Bozza e adempimenti successivi' },
    { key: 'integrazione', label: 'Da integrare' },
    { key: 'ri', label: 'Da verificare RI_AMM' }
  ]
  const st = useAdminStyle()
  return (
    <div style={{ display: 'grid', gap: 4, width: '100%' }}>
      <label style={{ color: st.formLabelColor || '#334155', fontSize: Number(st.formLabelFontSize ?? 15), fontWeight: Number(st.formLabelFontWeight ?? 600) as any, marginBottom: Number(st.formLabelMarginBottom ?? 3) }}>Casistica note</label>
      <select
        disabled={!props.canEdit}
        value=''
        onChange={e => {
          const key = e.target.value
          if (!key) return
          props.onApply(buildDefaultAdminNote(key, props.data || {}))
        }}
        onKeyDown={blurOnEnter}
        style={inputStyleFrom(st, !props.canEdit)}
      >
        <option value=''>- Seleziona -</option>
        {actions.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
      </select>
    </div>
  )
}

function displayAdminFieldValue (data: Record<string, any>, fields: LayerFieldInfo[], fieldName: string, emptyLabel = '—'): string {
  const lf = getFieldInfo(fields, fieldName)
  const raw = pickAttrCI(data || {}, [lf?.name || fieldName, fieldName])
  if (raw == null || raw === '') return emptyLabel
  if (lf?.domain?.codedValues || getFallbackDomainOptions(fieldName).length) return domainLabel(lf, raw, fieldName)
  if (looksLikeDateField(fieldName)) return formatDateValue(raw)
  if (MONEY_FIELDS.has(fieldName)) return `${formatMoney(raw)} €`
  return String(raw)
}

function StatusSummaryItem (props: { label: string, value: React.ReactNode, hint?: string, tone?: 'normal' | 'auto' | 'warn' | 'total' }) {
  const st = useAdminStyle()
  const tone = props.tone || 'normal'
  const total = tone === 'total'
  const borderColor = total
    ? (st.statusSummaryTotalBorderColor || '#0d3b66')
    : tone === 'warn'
      ? (st.statusSummaryWarnBorderColor || '#fed7aa')
      : tone === 'auto'
        ? (st.statusSummaryAutoBorderColor || '#bfdbfe')
        : (st.statusSummaryNormalBorderColor || '#c5d9f1')
  const bg = total
    ? (st.statusSummaryTotalBg || st.formCardHeaderBg || 'linear-gradient(90deg, #0d3b66, #155e9d)')
    : tone === 'warn'
      ? (st.statusSummaryWarnBg || '#fff7ed')
      : tone === 'auto'
        ? (st.statusSummaryAutoBg || '#f5f9ff')
        : (st.statusSummaryNormalBg || '#f8fbff')
  const labelColor = total ? (st.statusSummaryTotalLabelColor || 'rgba(255,255,255,0.86)') : (st.statusSummaryLabelColor || '#6b7280')
  const valueColor = total ? (st.statusSummaryTotalValueColor || st.formCardHeaderColor || '#fff') : (st.statusSummaryValueColor || '#111827')
  const hintColor = total ? (st.statusSummaryTotalHintColor || 'rgba(255,255,255,0.78)') : (st.statusSummaryHintColor || '#6b7280')
  return (
    <div style={{ border: `${Number(st.statusSummaryBorderWidth ?? 1)}px solid ${borderColor}`, background: bg, borderRadius: Number(st.formCardBorderRadius ?? 8), padding: '9px 11px', minWidth: 0 }}>
      <div style={{ color: labelColor, fontSize: adminLabelFontSize(st), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.25, marginBottom: 4 }}>{props.label}</div>
      <div style={{ color: valueColor, fontSize: total ? Math.max(16, Number(st.amountFontSize ?? 16)) : adminFieldFontSize(st), fontWeight: 800, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{props.value || '—'}</div>
      {props.hint && <div style={{ marginTop: 4, color: hintColor, fontSize: adminLabelFontSize(st), lineHeight: 1.35 }}>{props.hint}</div>}
    </div>
  )
}

function AttoAmministrativoSummary (props: { data: Record<string, any>, fields: LayerFieldInfo[] }) {
  const d = props.data || {}
  return (
    <Section title='Atto amministrativo'>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        <StatusSummaryItem label='Tipo atto' value={displayAdminFieldValue(d, props.fields, 'tipo_atto_amm', 'Da determinare automaticamente')} tone='auto' hint='Dato calcolato dal sistema; non è un campo da compilare.' />
        <StatusSummaryItem label='Oggetto' value={displayAdminFieldValue(d, props.fields, 'oggetto_atto_amm', 'Da determinare automaticamente')} tone='auto' hint='Sarà riportato nel documento senza digitazione manuale.' />
      </div>
    </Section>
  )
}


function AttestazioneConformitaSummary (props: { data: Record<string, any>, fields: LayerFieldInfo[] }) {
  const st = useAdminStyle()
  const d = props.data || {}
  const note = String(pickAttrCI(d, ['note_atto_amm']) || '').trim()
  const tecnico = displayAdminFieldValue(d, props.fields, 'ti_amm_assegnato_nome', displayAdminFieldValue(d, props.fields, 'ti_amm_assegnato_username'))
  const dataTrasmissione = displayAdminFieldValue(d, props.fields, 'dt_esito_TI_AMM') || displayAdminFieldValue(d, props.fields, 'dt_stato_RI_AMM')
  return (
    <Section title='Attestazione di conformità'>
      {note ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', gap: 10 }}>
            <StatusSummaryItem label='Tecnico istruttore' value={tecnico || '—'} tone='auto' />
            <StatusSummaryItem label='Data trasmissione al Responsabile istruttoria' value={dataTrasmissione || '—'} tone='auto' />
          </div>
          <div style={{ border: `1px solid ${st.formWorkflowBadgeBorderColor || '#d8e6f7'}`, background: st.formWorkflowBadgeBg || '#ffffff', borderRadius: 9, padding: 10 }}>
            <div style={{ color: st.formWorkflowBadgeTitleColor || '#0d3b66', fontWeight: 900, fontSize: adminLabelFontSize(st), marginBottom: 5 }}>Testo dell’attestazione</div>
            <div style={{ color: st.formWorkflowBadgeValueColor || '#111827', fontSize: Number(st.formFieldFontSize ?? 15), lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{note}</div>
          </div>
        </div>
      ) : (
        <InfoBox kind='warn'>Attestazione di conformità non ancora acquisita. Verrà richiesta obbligatoriamente nel popup di trasmissione al Responsabile istruttoria.</InfoBox>
      )}
    </Section>
  )
}

function QuantificazioneAutomaticaSummary (props: { data: Record<string, any>, fields: LayerFieldInfo[] }) {
  const d = props.data || {}
  return (
    <Section title='Riepilogo economico automatico'>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        <StatusSummaryItem label='Sanzione base' value={displayAdminFieldValue(d, props.fields, 'sanzione_importo_base')} tone='auto' />
        <StatusSummaryItem label='Sanzione ridotta' value={displayAdminFieldValue(d, props.fields, 'sanzione_importo_ridotta')} tone='auto' />
        <StatusSummaryItem label='Risarcimento danni' value={displayAdminFieldValue(d, props.fields, 'risarcimento_danni_importo')} tone='auto' />
        <StatusSummaryItem label='Rimborso attrezzature netto' value={displayAdminFieldValue(d, props.fields, 'attrezzature_importo_netto')} tone='auto' />
        <StatusSummaryItem label='Spese notifica' value={displayAdminFieldValue(d, props.fields, 'sanzione_spese_notifica')} tone='auto' />
        <StatusSummaryItem label='Totale da pagare' value={displayAdminFieldValue(d, props.fields, 'pagamento_importo_totale')} tone='total' />
      </div>
      <div style={{ marginTop: 10 }}>
        <StatusSummaryItem label='Dettaglio calcolo' value={displayAdminFieldValue(d, props.fields, 'sanzione_dettaglio_calcolo')} tone='auto' />
      </div>
    </Section>
  )
}



function PracticeDetailBadge (props: { title: string, rows: Array<{ label: string, value: React.ReactNode, highlight?: boolean }> }) {
  const st = useAdminStyle()
  return (
    <div style={{
      background: st.formWorkflowBadgeBg || '#ffffff',
      border: `${Number(st.formWorkflowBadgeBorderWidth ?? 1)}px solid ${st.formWorkflowBadgeBorderColor || '#d8e6f7'}`,
      borderRadius: Number(st.formCardBorderRadius ?? 8),
      padding: '10px 12px',
      minWidth: 0
    }}>
      <div style={{ color: st.formWorkflowBadgeTitleColor || st.formInnerHeaderColor || '#0f4c81', fontSize: Number(st.formInnerHeaderFontSize ?? 14), fontWeight: 900, marginBottom: 6, overflowWrap: 'anywhere' }}>{props.title}</div>
      <div style={{ display: 'grid', gap: 4 }}>
        {props.rows.map((row, idx) => (
          <div key={`${row.label}-${idx}`} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 6, alignItems: 'baseline', minWidth: 0 }}>
            <span style={{ color: st.formWorkflowBadgeLabelColor || '#6b7280', fontSize: Number(st.formLabelFontSize ?? 15), fontWeight: Number(st.formLabelFontWeight ?? 600) as any, whiteSpace: 'nowrap' }}>{row.label}:</span>
            <span style={{ color: row.highlight ? (st.formWorkflowBadgeHighlightColor || '#2563eb') : (st.formWorkflowBadgeValueColor || '#111827'), fontSize: Number(st.formFieldFontSize ?? 15), fontWeight: row.highlight ? 800 : 600, overflowWrap: 'anywhere' }}>{row.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PracticePhaseGroup (props: { title: string, items: Array<{ title: string, rows: Array<{ label: string, value: React.ReactNode, highlight?: boolean }> }> }) {
  const st = useAdminStyle()
  return (
    <div style={{
      border: `${Number(st.formPhaseCardBorderWidth ?? 1)}px solid ${st.formPhaseCardBorderColor || '#d7e3f2'}`,
      borderRadius: Number(st.formCardBorderRadius ?? 8),
      background: st.formPhaseCardBg || '#f8fbff',
      padding: 10,
      minWidth: 0
    }}>
      <div style={{ color: st.formPhaseCardTitleColor || st.formInnerHeaderColor || '#0f4c81', fontSize: Number(st.formInnerHeaderFontSize ?? 14), fontWeight: 950, marginBottom: 8 }}>{props.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: 10 }}>
        {props.items.map(item => <PracticeDetailBadge key={item.title} title={item.title} rows={item.rows} />)}
      </div>
    </div>
  )
}

function compactValue (data: Record<string, any>, fields: LayerFieldInfo[], fieldName: string, fallback = '—'): string {
  return displayAdminFieldValue(data || {}, fields || [], fieldName, fallback)
}

function esitoTecnicoValue (data: Record<string, any>, fields: LayerFieldInfo[]): string {
  const lf = getFieldInfo(fields, 'esito_DT')
  const raw = pickAttrCI(data || {}, [lf?.name || 'esito_DT', 'esito_DT'])
  if (raw == null || raw === '') return 'Approvato'
  if (String(raw) === '2') return 'Approvato'
  if (String(raw) === '1') return 'Integrazione richiesta'
  if (String(raw) === '3') return 'Respinto'
  return domainLabel(lf, raw, 'esito_DT')
}

function CompactPracticeHeader (props: { title: string, data: Record<string, any>, fields: LayerFieldInfo[], profile: { role: string, label: string, fullName: string, username: string }, hasDsForSave: boolean, summaryFields: any[], labelSize: number, valueSize: number }) {
  const st = useAdminStyle()
  const d = props.data || {}
  const oid = pickOidFromData(d, 'OBJECTID')
  const rapporto = getReportCode(d, oid != null ? Number(oid) : null)
  const tiAmmAssegnato = String(pickAttrCI(d, ['ti_amm_assegnato_nome', 'ti_amm_assegnato_username']) || '—')
  const faseTecnicaDetails = [
    {
      title: 'Rapporto',
      rows: [
        { label: 'Rapporto', value: rapporto, highlight: true },
        { label: 'Data rilevazione', value: compactValue(d, props.fields, 'data_rilevazione') }
      ]
    },
    {
      title: 'Competenza',
      rows: [
        { label: 'Area', value: compactValue(d, props.fields, 'area_cod') },
        { label: 'Settore', value: compactValue(d, props.fields, 'settore_cod') },
        { label: 'Ufficio di zona', value: compactValue(d, props.fields, 'ufficio_zona') }
      ]
    },
    {
      title: 'Istruttoria tecnica',
      rows: [
        { label: 'Esito', value: esitoTecnicoValue(d, props.fields) },
        { label: 'Data', value: compactValue(d, props.fields, 'dt_esito_DT') }
      ]
    }
  ]
  const faseAmministrativaDetails = [
    {
      title: 'Stato TI AMM',
      rows: [
        { label: 'Stato', value: compactValue(d, props.fields, 'stato_TI_AMM') },
        { label: 'Data', value: compactValue(d, props.fields, 'dt_presa_in_carico_TI_AMM') },
        { label: 'Assegnato a', value: tiAmmAssegnato }
      ]
    },
    {
      title: 'Stato RI AMM',
      rows: [
        { label: 'Stato', value: compactValue(d, props.fields, 'stato_RI_AMM') },
        { label: 'Data', value: compactValue(d, props.fields, 'dt_stato_RI_AMM') }
      ]
    },
    {
      title: 'Direttore d\'Area',
      rows: [
        { label: 'Stato', value: compactValue(d, props.fields, 'stato_DA') },
        { label: 'Data stato', value: compactValue(d, props.fields, 'dt_stato_DA') },
        { label: 'Esito', value: compactValue(d, props.fields, 'esito_DA') },
        { label: 'Data esito', value: compactValue(d, props.fields, 'dt_esito_DA') }
      ]
    }
  ]
  return (
    <Section title='Istruttoria amministrativa'>
      <details style={{ border: `${Number(st.formExpandableCardBorderWidth ?? 1)}px solid ${st.formExpandableCardBorderColor || '#e5e7eb'}`, borderRadius: 10, background: st.formExpandableCardBg || '#f9fafb', padding: 10 }}>
        <summary style={{ cursor: 'pointer', color: st.formInnerHeaderColor || '#0f4c81', fontSize: Number(st.formInnerHeaderFontSize ?? 14), fontWeight: 900 }}>Dettagli pratica e workflow</summary>
        <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
          <PracticePhaseGroup title='Fase tecnica' items={faseTecnicaDetails} />
          <PracticePhaseGroup title='Fase amministrativa' items={faseAmministrativaDetails} />
        </div>
      </details>
    </Section>
  )
}

function PostApprovalLockedBox () {
  return (
    <InfoBox kind='warn'>
      La compilazione di questa sezione sarà disponibile dopo l’approvazione del Direttore d’Area.
    </InfoBox>
  )
}

function PostNotificationLockedBox () {
  return (
    <InfoBox kind='warn'>
      La compilazione di questa sezione sarà disponibile solo dopo che la notifica risulta perfezionata con esito “Notificata” o “Compiuta giacenza”.
    </InfoBox>
  )
}


function trasgressoreField (fields: LayerFieldInfo[], candidates: string[]): string | null {
  for (const name of candidates) {
    const f = getFieldInfo(fields, name)
    if (f) return f.name
  }
  return null
}

function TrasgressoreAmmSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  const fields = props.fields || []
  const rawTipo = String(pickAttrCI(d, ['tipologia_soggetto']) || '').toUpperCase()
  const ragioneSociale = String(pickAttrCI(d, ['ragione_sociale']) || '').trim()
  const piva = String(pickAttrCI(d, ['piva', 'partita_iva']) || '').trim()
  const isPg = rawTipo.includes('GIUR') || rawTipo === 'PG' || !!ragioneSociale || !!piva

  const mk = (name: string, label: string, kind: AdminFieldKind = 'text', full = false): AdminField => ({ group: 'trasgressore', name, label, kind, full })
  const existingField = (candidates: string[], label: string, kind: AdminFieldKind = 'text', full = false): AdminField | null => {
    const name = trasgressoreField(fields, candidates)
    return name ? mk(name, label, kind, full) : null
  }
  const existingFields = (defs: Array<[string[], string, AdminFieldKind?, boolean?]>): AdminField[] => defs
    .map(def => existingField(def[0], def[1], def[2] || 'text', !!def[3]))
    .filter(Boolean) as AdminField[]

  const tipoField = existingField(['tipologia_soggetto'], 'Tipologia soggetto', 'domain')
  const idItems: AdminField[] = []
  if (tipoField) idItems.push(tipoField)
  if (isPg) {
    idItems.push(...existingFields([
      [['ragione_sociale'], 'Ragione sociale', 'text', true],
      [['piva', 'partita_iva'], 'P. IVA']
    ]))
  } else {
    idItems.push(...existingFields([
      [['cognome'], 'Cognome'],
      [['nome'], 'Nome'],
      [['codice_fiscale', 'cf'], 'Codice fiscale']
    ]))
  }

  const indirizzoItems = existingFields([
    [['via'], 'Via/P.zza'],
    [['civico', 'numero_civico'], 'N. civico'],
    [['citta', 'comune'], 'Città'],
    [['provincia'], 'Provincia'],
    [['cap'], 'CAP'],
    [['stato'], 'Stato'],
    [['telefono'], 'Telefono'],
    [['cellulare'], 'Cellulare'],
    [['email', 'e_mail'], 'E-mail'],
    [['pec'], 'PEC']
  ])

  const qualificaItems = existingFields([
    [['qualifica_fondo'], 'Qualifica rispetto al fondo', 'domain']
  ])

  const domRaw = pickAttrCI(d, ['dom_notifica_uguale'])
  const domicilioCoincide = domRaw == null || domRaw === '' || String(domRaw) === '1' || String(domRaw).toLowerCase() === 'si' || String(domRaw).toLowerCase() === 'sì' || String(domRaw).toLowerCase() === 'true'
  const domicilioItems: AdminField[] = []
  const domUguale = existingField(['dom_notifica_uguale'], 'Coincide con residenza/sede legale', 'domain')
  if (domUguale) domicilioItems.push(domUguale)
  if (!domicilioCoincide) {
    domicilioItems.push(...existingFields([
      [['dom_notifica_via'], 'Via/P.zza'],
      [['dom_notifica_civico'], 'N. civico'],
      [['dom_notifica_citta'], 'Città'],
      [['dom_notifica_provincia'], 'Provincia'],
      [['dom_notifica_cap'], 'CAP'],
      [['dom_notifica_stato'], 'Stato']
    ]))
  }

  const rlItems: AdminField[] = []
  if (isPg) {
    rlItems.push(...existingFields([
      [['rl_cognome'], 'Cognome'],
      [['rl_nome'], 'Nome'],
      [['rl_cf'], 'Codice fiscale'],
      [['rl_carica'], 'Carica', 'domain']
    ]))
    const rlDomRaw = pickAttrCI(d, ['rl_dom_notifica'])
    const rlDomPresente = String(rlDomRaw || '0') === '1' || String(rlDomRaw || '').toLowerCase() === 'si' || String(rlDomRaw || '').toLowerCase() === 'sì' || String(rlDomRaw || '').toLowerCase() === 'true'
    const rlDom = existingField(['rl_dom_notifica'], 'Domicilio notifiche del rappresentante', 'domain')
    if (rlDom) rlItems.push(rlDom)
    if (rlDomPresente) {
      rlItems.push(...existingFields([
        [['rl_dom_via'], 'Via/P.zza'],
        [['rl_dom_civico'], 'N. civico'],
        [['rl_dom_citta'], 'Città'],
        [['rl_dom_provincia'], 'Provincia'],
        [['rl_dom_cap'], 'CAP'],
        [['rl_dom_stato'], 'Stato']
      ]))
    }
  }

  const noteItems = existingFields([
    [['note_anagrafica'], 'Annotazioni del tecnico istruttore', 'textarea', true]
  ])

  const renderReadOnlyLayout = (items: AdminField[], emptyText: string) => items.length > 0 ? (
    <AdminFieldsLayout items={items} draft={d} fields={fields} canEdit={false} onChange={() => {}} />
  ) : (
    <InfoBox kind='warn'>{emptyText}</InfoBox>
  )

  return (
    <>
      <InfoBox kind='warn'>
        I dati del trasgressore sono riportati in sola lettura. Eventuali inesattezze devono essere segnalate al Responsabile istruttoria amministrativa, affinché sia valutato il rimando all’Area di provenienza per la rettifica.
      </InfoBox>

      <Section title='Dati identificativi'>
        {renderReadOnlyLayout(idItems, 'Campi identificativi del trasgressore non disponibili nella fonte dati.')}
      </Section>

      <Section title='Residenza / sede'>
        {renderReadOnlyLayout(indirizzoItems, 'Dati di residenza/sede non disponibili nella fonte dati.')}
      </Section>

      <Section title='Qualifica'>
        {renderReadOnlyLayout(qualificaItems, 'Qualifica rispetto al fondo non disponibile nella fonte dati.')}
      </Section>

      <Section title='Domicilio per le notifiche'>
        {domicilioItems.length > 0 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <AdminFieldsLayout items={domicilioItems} draft={d} fields={fields} canEdit={false} onChange={() => {}} />
            {domicilioCoincide && <InfoBox>Il domicilio per le notifiche coincide con la residenza/sede legale.</InfoBox>}
          </div>
        ) : (
          <InfoBox kind='warn'>Dati del domicilio per le notifiche non disponibili nella fonte dati.</InfoBox>
        )}
      </Section>

      {isPg && (
        <Section title='Rappresentante legale'>
          {renderReadOnlyLayout(rlItems, 'Dati del rappresentante legale non disponibili nella fonte dati.')}
        </Section>
      )}

      <Section title='Annotazioni'>
        {renderReadOnlyLayout(noteItems, 'Annotazioni del tecnico istruttore non disponibili nella fonte dati.')}
      </Section>
    </>
  )
}

function ProtocolloNotificaGuidataSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  const definitivo = isVerbaleDefinitivo(d)
  const hasVerbale = tipoAttoAmmPrevedeVerbale(d)
  const protocolloNumero = pickAttrCI(d, ['protocollo_verbale_numero'])
  const protocolloData = pickAttrCI(d, ['protocollo_verbale_data'])
  const protocolloCompleto = hasAdminValue(protocolloNumero) && hasAdminValue(protocolloData)
  const esito = notificaEsitoCode(d)
  const perfezionata = isNotificaPerfezionata(d)
  const daRipetere = isNotificaDaRipetere(d)
  const canEditProtocollo = props.canEdit && definitivo
  const canEditNotifica = canEditProtocollo && protocolloCompleto
  const statoProtocollo = protocolloCompleto ? 'Registrato' : 'Da completare'
  const statoNotifica = esito ? displayAdminFieldValue(d, props.fields, 'notifica_esito') : 'Da registrare'

  return (
    <Section title='Protocollo e notifica'>
      {!definitivo && <InfoBox kind='warn'>{hasVerbale ? 'Protocollo e notifica vanno compilati solo dopo che il Direttore d’Area ha approvato l’istruttoria e il sistema ha assegnato numero e data del verbale.' : 'Protocollo e notifica vanno compilati solo dopo che il Direttore d’Area ha approvato l’atto amministrativo.'}</InfoBox>}

      <div style={{ marginTop: definitivo ? 0 : 14, display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
          <StatusSummaryItem label='Protocollo dell’atto' value={statoProtocollo} tone={protocolloCompleto ? 'auto' : 'warn'} />
          <StatusSummaryItem label='Stato della notifica' value={statoNotifica} tone={perfezionata ? 'auto' : 'warn'} />
        </div>

        <div>
          <div style={{ fontWeight: 900, color: '#0f4c81', marginBottom: 8 }}>Protocollo dell’atto</div>
          <AdminFieldsGrid
            group='notifica'
            draft={d}
            fields={props.fields}
            canEdit={canEditProtocollo}
            onChange={props.onChange}
            fieldNames={PROTOCOLLO_ATTO_FIELDS}
          />
        </div>

        <div>
          <div style={{ fontWeight: 900, color: '#0f4c81', marginBottom: 8 }}>Notifica dell’atto</div>
          {!protocolloCompleto && definitivo && <InfoBox kind='warn'>Completare numero e data di protocollo prima di registrare la notifica.</InfoBox>}
          <div style={{ marginTop: !protocolloCompleto && definitivo ? 10 : 0 }}>
            <AdminFieldsGrid
              group='notifica'
              draft={d}
              fields={props.fields}
              canEdit={canEditNotifica}
              onChange={props.onChange}
              fieldNames={NOTIFICA_ATTO_FIELDS}
            />
          </div>
        </div>

        {esito === 'DA_NOTIFICARE' && <InfoBox>Atto protocollato e ancora da notificare. Le fasi successive restano bloccate.</InfoBox>}
        {daRipetere && <InfoBox kind='warn'>La notifica non risulta perfezionata. Registrare gli estremi del tentativo e procedere con una nuova notifica; le fasi successive restano bloccate.</InfoBox>}
        {esito === 'ALTRO' && <InfoBox kind='warn'>Specificare dettagliatamente l’esito negli estremi della notifica. Le fasi successive restano bloccate finché non viene registrato un esito conclusivo.</InfoBox>}
        {perfezionata && <InfoBox kind='ok'>Notifica perfezionata. Le funzioni post-notifica sono disponibili.</InfoBox>}
        {protocolloCompleto && <InfoBox>Le ricevute PEC, la relata, l’avviso di ricevimento o altra documentazione probatoria devono essere caricati nella scheda Allegati.</InfoBox>}
      </div>
    </Section>
  )
}

function PagamentoGuidatoSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, canEditSpeseNotifica: boolean, onChange: (name: string, value: any) => void }) {
  const st = useAdminStyle()
  const d = props.data || {}
  const mode = getPaymentMode(d, props.fields)
  const snapshot = getPaymentSnapshot(d, props.fields)
  const showPagoPa = mode === 'PAGOPA' || mode === 'MISTO'
  const showBonifico = mode === 'BONIFICO' || mode === 'MISTO'
  const showAltro = mode === 'ALTRO'
  const statusMismatch = !!snapshot.status && !!snapshot.suggestedStatus && snapshot.status !== snapshot.suggestedStatus
  const notificationComplete = isNotificaPerfezionata(d)
  return (
    <Section title='Pagamento'>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, alignItems: 'stretch' }}>
          <SpeseNotificaEditor data={d} fields={props.fields} canEdit={props.canEditSpeseNotifica} onChange={props.onChange} />
          <StatusSummaryItem label='Totale da pagare' value={formatEuroText(snapshot.total)} tone='total' />
          <StatusSummaryItem label='Importo incassato' value={formatEuroText(snapshot.paid)} />
          <StatusSummaryItem label='Importo residuo' value={formatEuroText(snapshot.residual)} tone={snapshot.residual > 0 ? 'warn' : 'auto'} />
        </div>

        <div>
          <div style={{ fontWeight: 900, color: '#0f4c81', marginBottom: 8 }}>Istruzioni di pagamento</div>
          <AdminFieldsGrid
            group='pagamento'
            draft={d}
            fields={props.fields}
            canEdit={props.canEdit}
            onChange={props.onChange}
            fieldNames={['pagamento_modalita', 'pagamento_scadenza']}
          />
        </div>

        {!mode && <InfoBox kind='warn'>Selezionare la modalità di pagamento: pagoPA, bonifico bancario, pagamento misto o altro.</InfoBox>}

        {showPagoPa && <details open style={{ border: `${Number(st.formExpandableCardBorderWidth ?? 1)}px solid ${st.formExpandableCardBorderColor || '#e5e7eb'}`, borderRadius: 10, background: st.formExpandableCardBg || '#f9fafb', padding: 10 }}>
          <summary style={{ cursor: 'pointer', color: st.formInnerHeaderColor || '#0f4c81', fontSize: Number(st.formInnerHeaderFontSize ?? 14), fontWeight: 900 }}>Dati pagoPA</summary>
          <div style={{ marginTop: 10 }}>
            <AdminFieldsGrid group='pagamento' draft={d} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} fieldNames={['pagopa_iuv', 'pagopa_codice_avviso']} />
          </div>
        </details>}

        {showBonifico && <details open style={{ border: `${Number(st.formExpandableCardBorderWidth ?? 1)}px solid ${st.formExpandableCardBorderColor || '#e5e7eb'}`, borderRadius: 10, background: st.formExpandableCardBg || '#f9fafb', padding: 10 }}>
          <summary style={{ cursor: 'pointer', color: st.formInnerHeaderColor || '#0f4c81', fontSize: Number(st.formInnerHeaderFontSize ?? 14), fontWeight: 900 }}>Dati bonifico bancario</summary>
          <div style={{ marginTop: 10 }}>
            <AdminFieldsGrid group='bonifico' draft={d} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
          </div>
        </details>}

        {showAltro && <InfoBox>Indicare nel campo note le istruzioni complete per il pagamento.</InfoBox>}

        <div>
          <div style={{ fontWeight: 900, color: '#0f4c81', marginBottom: 8 }}>Monitoraggio del pagamento</div>
          <AdminFieldsGrid
            group='pagamento'
            draft={d}
            fields={props.fields}
            canEdit={props.canEdit}
            onChange={props.onChange}
            fieldNames={['pagamento_stato', 'pagamento_note']}
          />
        </div>

        {snapshot.total > 0 && !notificationComplete && <InfoBox>Le istruzioni possono essere predisposte dopo l’approvazione dell’atto. Il termine di pagamento diventa operativo dopo il perfezionamento della notifica.</InfoBox>}
        {notificationComplete && snapshot.residual > 0 && <InfoBox kind='ok'>Notifica perfezionata. Il pagamento è in monitoraggio fino all’incasso integrale o alla scadenza del termine.</InfoBox>}
        {statusMismatch && <InfoBox kind='warn'>Lo stato registrato non è coerente con i dati disponibili. Stato coerente: <strong>{paymentStatusDisplay(snapshot.suggestedStatus, props.fields)}</strong>.</InfoBox>}
      </div>
    </Section>
  )
}

function ChiusuraIstruttoriaSummary (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onFillClose: () => void, completionIssues: string[] }) {
  const d = props.data || {}
  const definitivo = isVerbaleDefinitivo(d)
  const issues = props.completionIssues || []
  const ready = issues.length === 0
  const chiusa = hasAdminValue(pickAttrCI(d, ['istruttoria_amm_chiusa_il']))
  return (
    <Section title='Completamento istruttoria amministrativa'>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
        <StatusSummaryItem label='Istruttoria chiusa il' value={displayAdminFieldValue(d, props.fields, 'istruttoria_amm_chiusa_il')} />
        <StatusSummaryItem label='Istruttoria chiusa da' value={displayAdminFieldValue(d, props.fields, 'istruttoria_amm_chiusa_da')} />
      </div>
      <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
        {issues.length > 0 && <InfoBox kind='warn'>
          <div>Procedura ancora da completare:</div>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            {issues.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </InfoBox>}
        {issues.length === 0 && <InfoBox kind='ok'>Dati amministrativi completi. La chiusura può essere compilata; le trasmissioni di workflow restano gestite da gii-azioni.</InfoBox>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button type='button' disabled={!props.canEdit || !ready || chiusa} onClick={props.onFillClose} style={secondaryButtonStyle(!props.canEdit || !ready || chiusa)}>Chiudi istruttoria amministrativa</button>
        </div>
      </div>
    </Section>
  )
}

function RicorsoPostNotificaSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  return (
    <>
      <Section title='Post-notifica'>
        <AdminFieldsGrid group='post_notifica' draft={d} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
      </Section>
      <Section title='Ricorso / riesame post-notifica'>
        <InfoBox>
          Registrare qui l&apos;eventuale ricorso o istanza presentata dopo la notifica. L&apos;esito del CdA è gestito nella scheda dedicata.
        </InfoBox>
        <div style={{ marginTop: 12 }}>
          <AdminFieldsGrid group='ricorso' draft={d} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
        </div>
      </Section>
    </>
  )
}

function EsitoCdaSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  return (
    <Section title='Esito CdA'>
      <InfoBox>
        Registrare l&apos;esito del CdA e gli estremi dell&apos;atto comunicato al RI AMM. Se l&apos;esito richiede una nuova lavorazione, la riapertura va gestita nella scheda Riapertura.
      </InfoBox>
      <div style={{ marginTop: 12 }}>
        <AdminFieldsGrid group='cda' draft={d} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
      </div>
    </Section>
  )
}

function RiaperturaAmmSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void, role: string }) {
  const d = props.data || {}
  const role = String(props.role || '').toUpperCase()
  const canCompile = props.canEdit && (role === 'RI_AMM' || role === 'ADMIN')
  return (
    <Section title='Riapertura amministrativa'>
      <InfoBox kind={canCompile ? 'info' : 'warn'}>
        La riapertura è di competenza del RI AMM, su indicazione del DA a seguito della decisione del CdA. Questa scheda registra gli estremi; il nuovo ciclo di lavorazione sarà gestito con il workflow dedicato.
      </InfoBox>
      <div style={{ marginTop: 12 }}>
        <AdminFieldsGrid group='riapertura' draft={d} fields={props.fields} canEdit={canCompile} onChange={props.onChange} />
      </div>
    </Section>
  )
}

function DefinizionePraticaSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  const snapshot = getPaymentSnapshot(d, props.fields)
  const incassoDate = hasAdminValue(pickAttrCI(d, ['pagamento_data_incasso']))
  const incassoDetails = hasAdminValue(pickAttrCI(d, ['pagamento_estremi_incasso']))
  const hasPartialIncassoData = snapshot.paid > 0 || incassoDate || incassoDetails
  const incassoIncomplete = hasPartialIncassoData && !(snapshot.paid > 0 && incassoDate && incassoDetails)
  const overpaid = snapshot.paid > snapshot.total + 0.005 && snapshot.total > 0

  const onIncassoChange = (name: string, value: any) => {
    props.onChange(name, value)
    if (String(name).toLowerCase() !== 'pagamento_importo_incassato') return
    const next = { ...d, [name]: value }
    const total = Math.max(0, parseNumberInput(pickAttrCI(next, ['pagamento_importo_totale'])) || 0)
    const paid = Math.max(0, parseNumberInput(value) || 0)
    const statusField = realFieldName(props.fields, 'pagamento_stato') || 'pagamento_stato'
    if (total > 0 && paid >= total - 0.005) {
      props.onChange(statusField, 'PAGATO')
    } else if (paid > 0) {
      props.onChange(statusField, 'PARZIALE')
    } else if (['PAGATO', 'PARZIALE'].includes(paymentStatusCode(next))) {
      props.onChange(statusField, suggestedPaymentStatusCode({ ...next, pagamento_stato: null }, props.fields))
    }
  }

  return (
    <>
      <Section title='Incasso'>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatusSummaryItem label='Totale da pagare' value={formatEuroText(snapshot.total)} tone='total' />
          <StatusSummaryItem label='Importo incassato' value={formatEuroText(snapshot.paid)} />
          <StatusSummaryItem label='Importo residuo' value={formatEuroText(snapshot.residual)} tone={snapshot.residual > 0 ? 'warn' : 'auto'} />
          <StatusSummaryItem label='Stato pagamento' value={paymentStatusDisplay(snapshot.status, props.fields)} />
        </div>
        <AdminFieldsGrid group='incasso' draft={d} fields={props.fields} canEdit={props.canEdit} onChange={onIncassoChange} />
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {incassoIncomplete && <InfoBox kind='warn'>Per registrare un incasso indicare insieme importo, data ed estremi del pagamento.</InfoBox>}
          {overpaid && <InfoBox kind='warn'>L’importo incassato supera il totale dovuto. Verificare il dato o indicare nelle note l’eventuale eccedenza.</InfoBox>}
          {!incassoIncomplete && snapshot.paid > 0 && snapshot.residual > 0 && <InfoBox>Pagamento parziale registrato. Residuo ancora dovuto: <strong>{formatEuroText(snapshot.residual)}</strong>.</InfoBox>}
          {!incassoIncomplete && snapshot.total > 0 && snapshot.residual === 0 && <InfoBox kind='ok'>Pagamento integrale registrato.</InfoBox>}
        </div>
      </Section>
      <Section title='Definizione pratica'>
        <InfoBox>
          La definizione della pratica è distinta dalla chiusura dell&apos;istruttoria amministrativa. Usarla solo dopo pagamento, esito ricorso, archiviazione, annullamento o avvio a riscossione.
        </InfoBox>
        <div style={{ marginTop: 12 }}>
          <AdminFieldsGrid group='definizione' draft={d} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
        </div>
      </Section>
    </>
  )
}

function hasAdminValue (v: any): boolean {
  return v != null && String(v).trim() !== ''
}

function buildVoceLabel (raccordo: RegolamentoRaccordo, parametro?: SanzioneParametro | null): string {
  const cat = String(parametro?.categoria_parametro || '').toUpperCase()
  const fromRaccordo = voceDescriptionFromRaccordo(raccordo.descrizione)
  const fromParametro = sentenceFirst(stripNormPrefix(parametro?.descrizione || ''))
  const candidate = fromRaccordo || fromParametro
  const norm = normalizeToken(candidate)

  if (cat === 'SANZIONE') {
    const paramCode = String(parametro?.codice_parametro || '').toUpperCase()
    const gravitaMatch = paramCode.match(/SANZIONE\.ART42\.GRAVITA\.([1-4])$/)
    if (gravitaMatch) return `Sanzione pecuniaria - grado di gravità ${gravitaMatch[1]}`
    if (paramCode.startsWith('SANZIONE.ART41.')) {
      if (String(raccordo.codice_casistica || '').toUpperCase().includes('RECIDIVA')) return 'Sanzione pecuniaria - recidiva'
      return 'Sanzione pecuniaria'
    }
    if (norm.includes('SANZIONEFISSA') || norm.includes('MANCATORISPETTOLIMITI')) return 'Sanzione pecuniaria'
    if (norm.includes('IMPORTOMINIMO')) return 'Sanzione pecuniaria variabile - importo minimo'
    if (norm.includes('IMPORTOMASSIMO')) return 'Sanzione pecuniaria variabile - importo massimo'
    if (norm.includes('GRADODIGRAVITA1')) return 'Sanzione pecuniaria - grado di gravità 1'
    if (norm.includes('GRADODIGRAVITA2')) return 'Sanzione pecuniaria - grado di gravità 2'
    if (norm.includes('GRADODIGRAVITA3')) return 'Sanzione pecuniaria - grado di gravità 3'
    if (norm.includes('GRADODIGRAVITA4')) return 'Sanzione pecuniaria - grado di gravità 4'
    if (norm.includes('EUROPERETTARO')) return 'Sanzione pecuniaria per ettaro irrigato'
    return candidate || 'Sanzione pecuniaria'
  }

  if (cat === 'RISARCIMENTO') {
    if (norm.includes('RIMBORSOSPESAINTERVENTO')) return 'Rimborso spesa intervento'
    if (norm.includes('RISARCIMENTODANNI')) return 'Risarcimento danni'
    return candidate || 'Risarcimento da quantificare'
  }

  if (cat === 'ATTREZZATURA') return candidate || fromParametro || 'Rimborso attrezzatura'
  if (cat === 'CAUZIONE') return candidate || fromParametro || 'Cauzione'
  if (cat === 'TERMINE') return candidate || fromParametro || 'Termine / scadenza'
  if (cat === 'SPESE') return candidate || fromParametro || 'Spese'
  if (cat === 'RIDUZIONE') return candidate || fromParametro || 'Riduzione'
  if (cat === 'RIMBORSO') return candidate || fromParametro || 'Rimborso'
  return candidate || fromParametro || 'Voce applicabile'
}

function buildSanzioneGroups (
  casistiche: string[],
  raccordi: RegolamentoRaccordo[],
  parametri: SanzioneParametro[],
  articoli: RegolamentoArticolo[],
  data?: any,
  noteRows: NotaSpeseDetailRow[] = []
): SanzioneConsultivaGroup[] {
  const wanted = new Set(casistiche)
  const paramByCode = new Map(parametri.map(p => [p.codice_parametro, p]))
  const artByCode = new Map<string, RegolamentoArticolo>()
  articoli.forEach(article => {
    const rawCode = String(article.codice_articolo || '').trim().toUpperCase()
    const articleNumber = normalizeArticleNumber(rawCode || article.numero_articolo)
    if (rawCode) artByCode.set(rawCode, article)
    if (articleNumber) {
      artByCode.set(articleNumber, article)
      artByCode.set(`ART${articleNumber}`, article)
    }
  })
  const selectedRaccordi = raccordi.filter(r => wanted.has(r.codice_casistica))
  const pieListaCount = selectedRaccordi.filter(r => isPieListaParametro(paramByCode.get(r.codice_parametro) || null)).length
  const art30EquipmentSelections = parseArt30EquipmentSelections(data || {})
  const art30Equipment = new Set(art30EquipmentSelections.keys())
  const art30CauzioneImporto = Math.max(0, parseNumberInput(pickAttrCI(data || {}, ['attrezzature_cauzione_decurtata'])) || 0)
  const groups = new Map<string, SanzioneConsultivaGroup>()

  selectedRaccordi.forEach(r => {
    let parametro = paramByCode.get(r.codice_parametro) || null
    const pCode = String(r.codice_parametro || '').toUpperCase()
    const raccordoArt30 = isArt30CaseCode(r.codice_casistica)
    const raccordoArt30Kind = raccordoArt30
      ? art30EquipmentKindFromText(`${r.codice_parametro} ${r.descrizione} ${parametro?.descrizione || ''}`)
      : null

    // Per l'Art. 30 i raccordi identificano esclusivamente la tipologia e il
    // riferimento normativo. Codice, descrizione e importo applicati alla pratica
    // devono provenire sempre dallo snapshot tecnico congelato dal TI, anche quando
    // ATT-001...ATT-004 esistono nella tabella dei parametri correnti.
    if (raccordoArt30Kind) {
      const selection = art30EquipmentSelections.get(raccordoArt30Kind)
      if (!selection) return
      parametro = {
        codice_parametro: selection.codice || r.codice_parametro,
        categoria_parametro: 'ATTREZZATURA',
        valore_num: selection.importo,
        valore_testo: '',
        anno_riferimento: null,
        data_validita_da: null,
        data_validita_a: null,
        descrizione: selection.descrizione || ART30_EQUIPMENT_META[raccordoArt30Kind].label,
        note: 'Snapshot tecnico Art. 30'
      }
    }

    const articleForCase = getViolationArticleFromCase(r.codice_casistica)
    const grado = getGravitaForArticle(data || {}, articleForCase)
    if (pCode.includes('SANZIONE.ART42.GRAVITA.')) {
      const m = pCode.match(/GRAVITA\.(MIN|MAX|[1-4])$/)
      const suffix = m ? m[1] : ''
      if (grado) {
        if (suffix !== grado) return
      } else if (!['MIN', 'MAX'].includes(suffix)) {
        return
      }
    }

    let g = groups.get(r.codice_casistica)
    if (!g) {
      const articolo1617 = r.codice_casistica.includes('C114') ? selectedArticle1617(data || {}) : ''
      const articoloViolato = articolo1617 || r.articolo_violato
      const articoliViolati = splitArticleCodes(articoloViolato).map(c => artByCode.get(c)).filter(Boolean) as RegolamentoArticolo[]
      const articoliSanzione = splitArticleCodes(r.articolo_sanzione).map(c => artByCode.get(c)).filter(Boolean) as RegolamentoArticolo[]
      g = {
        codiceCasistica: r.codice_casistica,
        descrizione: raccordoMainDescription(r.descrizione),
        articoloViolato,
        articoloSanzione: r.articolo_sanzione,
        articoliViolati,
        articoliSanzione,
        voci: []
      }
      groups.set(r.codice_casistica, g)
    }

    if (isArt30CaseCode(r.codice_casistica)) {
      const categoria = String(parametro?.categoria_parametro || '').toUpperCase()
      if (categoria === 'ATTREZZATURA' || categoria === 'RIMBORSO') {
        const kind = art30EquipmentKindFromText(`${r.codice_parametro} ${r.descrizione} ${parametro?.descrizione || ''}`)
        if (!kind || !art30Equipment.has(kind)) return
      }
      if (categoria === 'CAUZIONE' && !art30CauzioneSelected(data || {})) return
    }

    const voceLabel = buildVoceLabel(r, parametro)
    if (!g.voci.some(v => v.codiceParametro === r.codice_parametro && v.descrizione === voceLabel && v.articoloSanzione === r.articolo_sanzione)) {
      const voceArticoliSanzione = splitArticleCodes(r.articolo_sanzione).map(c => artByCode.get(c)).filter(Boolean) as RegolamentoArticolo[]
      const noteTotalForCase = isPieListaParametro(parametro) ? notaSpeseTotalForCase(noteRows, r.codice_casistica, data || {}) : null
      const nsValue = isPieListaParametro(parametro)
        ? formatEuroText(noteTotalForCase != null ? noteTotalForCase : (pieListaCount === 1 ? (parseEuroTextValue(getNotaSpeseValueText(data || {})) || 0) : 0))
        : ''
      const art15Value = pCode.includes('SANZIONE.ART41') ? art15CalculatedValueText(data || {}, r.codice_casistica, parametro) : ''
      const comunicazioneTardivaValue = r.codice_casistica.includes('C114') && pCode.includes('EURO_HA')
        ? comunicazioneTardivaCalculatedValueText(data || {}, parametro)
        : ''
      const isArt30 = isArt30CaseCode(r.codice_casistica)
      const art30Categoria = String(parametro?.categoria_parametro || '').toUpperCase()
      const art30Kind = isArt30 && ['ATTREZZATURA', 'RIMBORSO'].includes(art30Categoria)
        ? art30EquipmentKindFromText(`${r.codice_parametro} ${r.descrizione} ${parametro?.descrizione || ''}`)
        : null
      const art30EquipmentValue = art30Kind ? art30EquipmentSelections.get(art30Kind)?.importo : null
      const art30CauzioneValue = isArt30 && art30Categoria === 'CAUZIONE' && art30CauzioneImporto > 0
        ? art30CauzioneImporto
        : null
      g.voci.push({
        codiceParametro: r.codice_parametro,
        descrizione: voceLabel,
        articoloSanzione: r.articolo_sanzione,
        articoliSanzione: voceArticoliSanzione,
        parametro,
        valueOverride: nsValue || art15Value || comunicazioneTardivaValue || (art30CauzioneValue != null ? formatEuroText(art30CauzioneValue) : '') || (art30EquipmentValue != null ? formatEuroText(art30EquipmentValue) : '')
      })
    }
  })

  const art30Group = Array.from(groups.values()).find(group => isArt30CaseCode(group.codiceCasistica))
  const art30NoteTotal = art30Group ? notaSpeseTotalForCase(noteRows, art30Group.codiceCasistica, data || {}) : null
  if (art30Group && art30NoteTotal != null && Number.isFinite(art30NoteTotal)) {
    const alreadyPresent = art30Group.voci.some(voce => isPieListaParametro(voce.parametro) || String(voce.codiceParametro || '').toUpperCase() === 'NOTA_SPESE.C104')
    if (!alreadyPresent) {
      const syntheticParam: SanzioneParametro = {
        codice_parametro: 'NOTA_SPESE.C104',
        categoria_parametro: 'RISARCIMENTO',
        valore_num: null,
        valore_testo: 'A piè di lista',
        anno_riferimento: null,
        data_validita_da: null,
        data_validita_a: null,
        descrizione: 'Rimborso spese a piè di lista',
        note: ''
      }
      art30Group.voci.push({
        codiceParametro: syntheticParam.codice_parametro,
        descrizione: 'Rimborso spese a piè di lista',
        articoloSanzione: art30Group.articoloSanzione,
        articoliSanzione: art30Group.articoliSanzione,
        parametro: syntheticParam,
        valueOverride: formatEuroText(art30NoteTotal)
      })
    }
  }

  const result = Array.from(groups.values())
  result.forEach(group => {
    if (normalizeArticleNumber(group.articoloViolato) === '30') {
      group.voci = [...group.voci].sort((a, b) => art30VoceOrder(a) - art30VoceOrder(b))
    }
  })

  return result.sort((a, b) => {
    const an = firstArticleNumberFromCodes(a.articoloViolato)
    const bn = firstArticleNumberFromCodes(b.articoloViolato)
    if (an !== bn) return an - bn
    return String(a.codiceCasistica || '').localeCompare(String(b.codiceCasistica || ''), 'it')
  })
}


function articleTitleLine (article?: RegolamentoArticolo | null, fallback?: string): string {
  if (article) {
    const code = formatArticleCode(article.codice_articolo)
    if (normalizeArticleNumber(article.codice_articolo || article.numero_articolo) === '41') {
      return 'Art. 41 — Sanzioni per prelievi abusivi e per inosservanza termini'
    }
    return article.titolo_articolo ? `${code} — ${article.titolo_articolo}` : code
  }
  return formatArticleFallback(fallback)
}

function articleListTitle (articles: RegolamentoArticolo[], fallback: string): string {
  const list = Array.isArray(articles) ? articles.filter(Boolean) : []
  if (!list.length) return formatArticleFallback(fallback)
  return list.map(a => articleTitleLine(a)).join('; ')
}

function violationNormSummary (group: SanzioneConsultivaGroup): string {
  const article = formatArticleFallback(group.articoloViolato)
  const descr = displayViolationTitle(group)
  return descr ? `Norma violata: ${article} — ${descr}` : `Norma violata: ${article}`
}

function normArticleColors (st: Record<string, any>, variant: 'violata' | 'sanzionatoria') {
  const isViolata = variant === 'violata'
  return {
    title: isViolata ? (st.normViolataArticleTitleColor || '#111827') : (st.normSanzionatoriaArticleTitleColor || '#111827'),
    text: isViolata ? (st.normViolataArticleTextColor || '#374151') : (st.normSanzionatoriaArticleTextColor || '#374151'),
    meta: isViolata ? (st.normViolataArticleMetaColor || '#6b7280') : (st.normSanzionatoriaArticleMetaColor || '#6b7280')
  }
}

function articleDetailsByRole (role: string, articles: RegolamentoArticolo[], variant: 'violata' | 'sanzionatoria' = 'violata') {
  const st = useAdminStyle()
  const c = normArticleColors(st, variant)
  const list = Array.isArray(articles) ? articles.filter(Boolean) : []
  if (!list.length) return <div style={{ color: c.meta, fontSize: adminLabelFontSize(st) }}>Testo regolamentare non disponibile nelle tabelle configurate.</div>
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {list.map(article => (
        <div key={`${role}-${article.codice_articolo}`} style={{ display: 'grid', gap: 4 }}>
          {article.testo_articolo && <div style={{ color: c.text, fontSize: adminFieldFontSize(st), lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{article.testo_articolo}</div>}
          {(article.atto_regolamento || article.anno_riferimento) && <div style={{ color: c.meta, fontSize: adminLabelFontSize(st) }}>{[article.atto_regolamento, article.anno_riferimento ? `Anno ${article.anno_riferimento}` : ''].filter(Boolean).join(' · ')}</div>}
        </div>
      ))}
    </div>
  )
}

function groupVociBySanzioneArticle (group: SanzioneConsultivaGroup, voci: SanzioneConsultivaVoce[]): Array<{ key: string, articles: RegolamentoArticolo[], fallback: string, voci: SanzioneConsultivaVoce[] }> {
  const map = new Map<string, { key: string, articles: RegolamentoArticolo[], fallback: string, voci: SanzioneConsultivaVoce[] }>()
  ;(voci || []).forEach((voce, idx) => {
    const fallback = voce.articoloSanzione || group.articoloSanzione || ''
    const articles = (voce.articoliSanzione && voce.articoliSanzione.length ? voce.articoliSanzione : group.articoliSanzione) || []
    const key = articles.length ? articles.map(a => a.codice_articolo).join('|') : (fallback || `missing-${idx}`)
    const existing = map.get(key)
    if (existing) {
      existing.voci.push(voce)
    } else {
      map.set(key, { key, articles, fallback, voci: [voce] })
    }
  })
  return Array.from(map.values())
}


type NormToggleVariant = 'violata' | 'sanzionatoria'

function NormToggleBox (props: { title: string, variant: NormToggleVariant, children: any, amount?: string }) {
  const st = useAdminStyle()
  const [open, setOpen] = React.useState(false)
  const isViolata = props.variant === 'violata'
  const normViolataBodyBg = String(st.normViolataBodyBg || '').trim().toLowerCase()
  const palette = isViolata
    ? {
        background: st.normViolataCardBg || '#eff6ff',
        border: st.normViolataBorderColor || '#93c5fd',
        borderWidth: Number(st.normViolataBorderWidth ?? 1),
        header: st.normViolataHeaderBg || '#dbeafe',
        text: st.normViolataHeaderTextColor || '#0f172a',
        arrow: st.normViolataArrowColor || '#1d4ed8',
        body: (!normViolataBodyBg || normViolataBodyBg === '#fff' || normViolataBodyBg === '#ffffff' || normViolataBodyBg === '#dbeafe') ? '#f8fbff' : st.normViolataBodyBg
      }
    : {
        background: st.normSanzionatoriaCardBg || '#fff7f7',
        border: st.normSanzionatoriaBorderColor || '#fecaca',
        borderWidth: Number(st.normSanzionatoriaBorderWidth ?? 1),
        header: st.normSanzionatoriaHeaderBg || '#fee2e2',
        text: st.normSanzionatoriaHeaderTextColor || '#7f1d1d',
        arrow: st.normSanzionatoriaArrowColor || '#b91c1c',
        body: st.normSanzionatoriaBodyBg || '#fffafa'
      }

  if (!isViolata) {
    return (
      <div style={{ border: `${palette.borderWidth}px solid ${palette.border}`, background: 'transparent', borderRadius: 8, overflow: 'hidden' }}>
        <button
          type='button'
          onClick={() => setOpen(!open)}
          style={{
            width: '100%',
            border: 0,
            background: 'transparent',
            color: palette.text,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 9px',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: Number(st.formFieldFontSize ?? 15),
            fontWeight: 800,
            lineHeight: 1.35
          }}
          aria-expanded={open}
        >
          <span aria-hidden='true' style={{ color: palette.arrow, fontSize: 10, fontWeight: 900, lineHeight: 1, width: 12, display: 'inline-flex', justifyContent: 'center' }}>{open ? '▼' : '▶'}</span>
          <span>{props.title}</span>
        </button>
        {open && (
          <div style={{ padding: '8px 10px', borderTop: `${palette.borderWidth}px solid ${palette.border}`, background: palette.body }}>
            {props.children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ border: `${palette.borderWidth}px solid ${palette.border}`, background: palette.background, borderRadius: 9, overflow: 'hidden' }}>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          border: 0,
          background: palette.header,
          color: palette.text,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: Number(st.formFieldFontSize ?? 15),
          fontWeight: 900,
          lineHeight: 1.35
        }}
        aria-expanded={open}
      >
        <span aria-hidden='true' style={{ color: palette.arrow, fontSize: 11, fontWeight: 900, lineHeight: 1, width: 14, display: 'inline-flex', justifyContent: 'center', flex: '0 0 auto' }}>{open ? '▼' : '▶'}</span>
        <span style={{ minWidth: 0, flex: '1 1 auto' }}>{props.title}</span>
        {props.amount && <span style={{ flex: '0 0 auto', marginLeft: 12, whiteSpace: 'nowrap', fontWeight: 900 }}>{props.amount}</span>}
      </button>
      {open && (
        <div style={{ padding: '8px 10px', borderTop: `1px solid ${palette.border}`, background: palette.body }}>
          {props.children}
        </div>
      )}
    </div>
  )
}

function ParametriNormeTable (props: { groups: SanzioneConsultivaGroup[] }) {
  const st = useAdminStyle()
  const groups = Array.isArray(props.groups) ? props.groups : []
  if (!groups.length) return null

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {groups.map(group => {
        const voci = group.voci.length
          ? group.voci
          : [{ codiceParametro: `${group.codiceCasistica}-empty`, descrizione: 'Voce applicabile', articoloSanzione: group.articoloSanzione, articoliSanzione: group.articoliSanzione, parametro: null }]
        const sanzioneBlocks = groupVociBySanzioneArticle(group, voci)
        return (
          <div key={group.codiceCasistica} style={{ border: `${Number(st.normGroupBorderWidth ?? 1)}px solid ${st.normGroupBorderColor || '#93c5fd'}`, background: st.normGroupBg || '#ffffff', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
            <NormToggleBox variant='violata' title={violationNormSummary(group)}>
              {articleDetailsByRole('Norma violata', group.articoliViolati, 'violata')}
            </NormToggleBox>

            <div style={{ display: 'grid', gap: 8, padding: '2px 0 0 0' }}>
              {sanzioneBlocks.map(block => (
                <div key={block.key} style={{ display: 'grid', gap: 6, borderTop: `1px solid ${st.normBlockSeparatorColor || '#cbd5e1'}`, paddingTop: 8 }}>
                  <NormToggleBox variant='sanzionatoria' title={`Norma sanzionatoria: ${articleListTitle(block.articles, block.fallback)}`}>
                    {articleDetailsByRole('Norma sanzionatoria', block.articles, 'sanzionatoria')}
                  </NormToggleBox>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BasicViolationsOnly (props: { data: any, layerFields: LayerFieldInfo[], message?: string }) {
  const st = useAdminStyle()
  const rows = buildViolationRows(props.data || {}, props.layerFields || [])
  const descrizione = firstViolationValue(props.data || {}, props.layerFields || [], ['descrizione_fatti'])
  const circostanze = firstViolationValue(props.data || {}, props.layerFields || [], ['circostanze'])
  return (
    <Section title='Violazioni contestate'>
      {props.message && <InfoBox kind='warn'>{props.message}</InfoBox>}
      {rows.length === 0 ? (
        <InfoBox kind='warn'>Nessuna violazione contestata rilevata nei dati della pratica.</InfoBox>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(row => (
            <div key={row.key} style={{ border: '1px solid #dbeafe', background: '#f8fafc', borderRadius: 11, padding: 11, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: '#0d3b66', color: '#fff', borderRadius: 999, padding: '5px 10px', fontWeight: 800, fontSize: Number(st.formFieldFontSize ?? 15) }}>{row.label}</span>
                <span style={{ color: '#166534', fontSize: Number(st.formFieldFontSize ?? 15), fontWeight: 800 }}>Contestata</span>
              </div>
              {row.details.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
                  {row.details.map((d, idx) => (
                    <div key={`${row.key}-${d.label}-${idx}`} style={{ fontSize: Number(st.formFieldFontSize ?? 15) }}>
                      <span style={{ color: '#6b7280', fontWeight: 800 }}>{d.label}: </span>
                      <span style={{ color: '#111827', fontWeight: 650 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: adminLabelFontSize(st) }}>Nessun dettaglio tecnico aggiuntivo valorizzato.</div>
              )}
            </div>
          ))}
        </div>
      )}
      {(descrizione || circostanze) && (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {descrizione && <InfoBox><strong>Descrizione fatti:</strong><br />{descrizione}</InfoBox>}
          {circostanze && <InfoBox><strong>Circostanze:</strong><br />{circostanze}</InfoBox>}
        </div>
      )}
    </Section>
  )
}

function useSanzioneConsultivaState (cfg: any, data: any, layerFields: LayerFieldInfo[]): SanzioneConsultivaLoadState {
  const parametriUrl = normalizeLookupTableUrl(cfg.parametriSanzioniUrl)
  const articoliUrl = normalizeLookupTableUrl(cfg.regolamentoArticoliUrl)
  const raccordiUrl = normalizeLookupTableUrl(cfg.regolamentoRaccordiUrl)
  const urlsReady = !!parametriUrl && !!articoliUrl && !!raccordiUrl
  const casistiche = React.useMemo(() => deriveSanzioneCasistiche(data || {}, layerFields || []), [data, layerFields])
  const [state, setState] = React.useState<{ loading: boolean, error: string, groups: SanzioneConsultivaGroup[] }>({ loading: false, error: '', groups: [] })

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!urlsReady || !casistiche.length) {
        setState({ loading: false, error: '', groups: [] })
        return
      }
      setState({ loading: true, error: '', groups: [] })
      try {
        const refMs = getSanzioneReferenceDate(data || {})
        const [paramRows, artRows, raccordiRows, noteRows] = await Promise.all([
          queryActiveTableRows<any>(parametriUrl, ['codice_parametro ASC']),
          queryActiveTableRows<any>(articoliUrl, ['numero_articolo ASC']),
          queryActiveTableRows<any>(raccordiUrl, ['codice_casistica ASC']),
          queryNotaSpeseDetailRowsForPractice(data || {}).catch(() => [] as NotaSpeseDetailRow[])
        ])
        const parametri = paramRows.map(normalizeParam).filter(p => p.codice_parametro && isRowValidAt(p, refMs))
        const articoli = artRows.map(normalizeArticle).filter(a => a.codice_articolo && isRowValidAt(a, refMs))
        const raccordi = raccordiRows.map(normalizeRaccordo).filter(r => r.codice_casistica && isRowValidAt(r, refMs))
        const groups = buildSanzioneGroups(casistiche, raccordi, parametri, articoli, data || {}, noteRows)
        if (!cancelled) setState({ loading: false, error: '', groups })
      } catch (e: any) {
        if (!cancelled) setState({ loading: false, error: e?.message || String(e), groups: [] })
      }
    }
    load()
    return () => { cancelled = true }
  }, [urlsReady, parametriUrl, articoliUrl, raccordiUrl, casistiche.join('|'), data])

  return {
    loading: state.loading,
    error: state.error,
    groups: state.groups,
    urlsReady,
    casistiche
  }
}


function SpeseNotificaEditor (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void }) {
  const st = useAdminStyle()
  const fieldName = realFieldName(props.fields, 'sanzione_spese_notifica') || 'sanzione_spese_notifica'
  const raw = pickAttrCI(props.data || {}, [fieldName, 'sanzione_spese_notifica'])
  const fieldExists = !!getFieldInfo(props.fields, 'sanzione_spese_notifica')
  const readonly = !props.canEdit || !fieldExists || getFieldInfo(props.fields, 'sanzione_spese_notifica')?.editable === false
  const [focused, setFocused] = React.useState(false)
  const [textValue, setTextValue] = React.useState(raw == null || raw === '' ? '' : formatMoney(raw))

  React.useEffect(() => {
    if (focused) return
    setTextValue(raw == null || raw === '' ? '' : formatMoney(raw))
  }, [raw, focused])

  const commitValue = (value: string) => {
    const n = parseNumberInput(value)
    if (n == null) {
      props.onChange(fieldName, null)
      setTextValue('')
      return
    }
    const rounded = roundMoneyValue(n)
    props.onChange(fieldName, rounded)
    setTextValue(formatMoney(rounded))
  }

  return (
    <div style={{ border: `1px solid ${st.formCardBorderColor || '#c6d7ea'}`, background: '#ffffff', borderRadius: Number(st.formCardBorderRadius ?? 8), padding: '9px 11px', minWidth: 0 }}>
      <div style={{ color: st.formLabelColor || '#334155', fontSize: Number(st.formLabelFontSize ?? 15), fontWeight: Number(st.formLabelFontWeight ?? 600) as any, marginBottom: Number(st.formLabelMarginBottom ?? 3) }}>Spese di notifica</div>
      <input
        type='text'
        inputMode='decimal'
        value={textValue}
        disabled={readonly}
        onFocus={() => setFocused(true)}
        onChange={e => {
          const next = e.target.value.replace(/[^0-9.,]/g, '')
          setTextValue(next)
          if (!next.trim()) {
            props.onChange(fieldName, null)
            return
          }
          const n = parseNumberInput(next)
          if (n != null) props.onChange(fieldName, roundMoneyValue(n))
        }}
        onBlur={() => {
          setFocused(false)
          commitValue(textValue)
        }}
        onKeyDown={e => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          setFocused(false)
          commitValue(e.currentTarget.value)
          e.currentTarget.blur()
        }}
        style={{ ...inputStyleFrom(st, readonly), background: readonly ? (st.formFieldDisabledBg || '#e7eef7') : '#ffffff' }}
        placeholder='0,00'
      />
      <div style={{ marginTop: 4, color: '#6b7280', fontSize: adminLabelFontSize(st), lineHeight: 1.35 }}>Concorre al totale da pagare.</div>
    </div>
  )
}


function sanitizeImportDetailForDisplay (raw: any): string {
  const text = String(raw ?? '')
    .replace(/\s*\((?:SANZIONE|RISARCIMENTO|RIMBORSO|ATTREZZATURA|CAUZIONE|SPESE|RIDUZIONE|TERMINE|TESTO)\.[A-Z0-9._-]+\)(?=\s*:)/gi, '')
    .replace(/^Quantificazione automatica (?:della sanzione|degli importi) sulla base del rapporto approvato e delle tabelle regolamentari configurate\.\s*$/gim, '')
    .replace(/^Gli importi principali sono calcolati automaticamente; le spese di notifica possono essere inserite dall['’]operatore amministrativo e concorrono al totale\.\s*$/gim, '')
    .replace(/[ \t]+:/g, ':')
    .replace(/\r/g, '')
  return text
    .replace(/^Riepilogo (?:automatico|importi)\s*$[\s\S]*$/im, '')
    .replace(/^Totali complessivi\s*$[\s\S]*$/im, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isArticleSubtotalLine (line: string): boolean {
  const text = String(line || '').trim()
  return /^Totale(?:\s+Art\.\s*\d+[A-Za-z]?)?(?:\s*:|\s+[-−]?\s*\d)/i.test(text)
}

function articleLabelFromDetailTitle (title: string): string {
  const match = String(title || '').match(/^(Art\.\s*\d+[A-Za-z]?)/i)
  return match ? match[1].replace(/Art\.\s*/i, 'Art. ') : ''
}

function normalizeImportDetailMoneyText (raw: string): string {
  const value = String(raw || '').trim()
  const match = value.match(/^([-−]?\s*\d+(?:\.\d{3})*,\d{2})\s*€(\s*\/\s*ha)?$/i)
  if (!match) return value.replace(/^−/, '-')
  const n = parseNumberInput(match[1])
  if (n == null || !Number.isFinite(n)) return value.replace(/^−/, '-')
  const euro = formatEuroText(n)
  return match[2] ? euro.replace(/\s*€$/, ' €/ha') : euro
}

function splitImportDetailMoneyLine (line: string): { label: string, amount: string } | null {
  const text = String(line || '').trim()
  const match = text.match(/^(.*?)([-−]?\s*\d+(?:\.\d{3})*,\d{2}\s*€(?:\s*\/\s*ha)?)\s*$/i)
  if (!match) return null
  const label = match[1].replace(/[:=]?\s*$/, '').trim()
  const amount = normalizeImportDetailMoneyText(match[2])
  if (!label || !amount) return null
  return { label, amount }
}

function normalizeImportDetailLineText (line: string): string {
  const text = String(line || '').replace(/^[•·\-]\s*/, '').trim()
  const parts = splitImportDetailMoneyLine(text)
  if (!parts) return text.replace(/^Cauzione\s+decurtata\s*:/i, 'Decurtazione cauzione:')
  let label = parts.label.replace(/^Cauzione\s+decurtata$/i, 'Decurtazione cauzione').replace(/^Cauzione\s+da\s+detrarre$/i, 'Decurtazione cauzione')
  let amount = parts.amount
  if (/decurtazione\s+cauzione/i.test(label) && !/^[-−]/.test(amount)) amount = `-${amount}`
  return `${label}: ${amount}`
}

function normalizeImportDetailLines (details: string[], title: string, data?: any, fields?: LayerFieldInfo[]): string[] {
  const articleLabel = articleLabelFromDetailTitle(title)
  const articleNumber = normalizeArticleNumber(articleLabel)
  const clean = details
    .map(line => normalizeImportDetailLineText(line))
    .filter(line => line && !/^Norma\s+(violata|sanzionatoria)\s*:/i.test(line))

  if (articleNumber === '15' && !clean.some(line => /^Tipo\s+di\s+abuso\s*:/i.test(line))) {
    const tipoAbuso = art15AbuseTypeLabel(data || {}, fields || [], '')
    if (tipoAbuso) clean.unshift(`Tipo di abuso: ${tipoAbuso}`)
  }
  if (articleNumber === '17' && !clean.some(line => /^Tipo\s+comunicazione\s*:/i.test(line))) {
    const tipoComunicazione = art17CommunicationTypeLabel(data || {}, fields || [], '')
    if (tipoComunicazione) clean.unshift(`Tipo comunicazione: ${tipoComunicazione}`)
  }

  const existingTotalIndex = clean.findIndex(isArticleSubtotalLine)
  if (existingTotalIndex >= 0 && articleLabel) {
    clean[existingTotalIndex] = clean[existingTotalIndex].replace(/^Totale(?:\s+Art\.\s*\d+[A-Za-z]?)?\s*:/i, `Totale ${articleLabel}:`)
  }
  return clean
}


function articleSubtotalFromDetails (details: string[]): { index: number, amount: string } | null {
  const list = Array.isArray(details) ? details : []
  for (let i = 0; i < list.length; i++) {
    const line = String(list[i] || '').trim()
    if (!isArticleSubtotalLine(line)) continue
    const parts = splitImportDetailMoneyLine(line)
    if (parts?.amount) return { index: i, amount: parts.amount }

    const amountMatch = line.match(/([-−]?\s*\d+(?:\.\d{3})*,\d{2}\s*€(?:\s*\/\s*ha)?)\s*$/i)
    if (amountMatch) {
      const amount = normalizeImportDetailMoneyText(amountMatch[1])
      if (amount) return { index: i, amount }
    }
  }

  let total = 0
  let foundAmount = false
  for (const raw of list) {
    const parts = splitImportDetailMoneyLine(raw)
    if (!parts?.amount) continue
    if (/\/\s*ha\b/i.test(parts.amount)) continue
    const n = parseNumberInput(parts.amount.replace(/€/g, ''))
    if (n == null || !Number.isFinite(n)) continue
    total += n
    foundAmount = true
  }

  return foundAmount ? { index: -1, amount: formatEuroText(total) } : null
}

function matchingNormGroupsForDetailTitle (title: string, groups?: SanzioneConsultivaGroup[]): SanzioneConsultivaGroup[] {
  const articleLabel = articleLabelFromDetailTitle(title)
  const articleNumber = normalizeArticleNumber(articleLabel)
  if (!articleNumber) return []
  const list = Array.isArray(groups) ? groups : []
  return list.filter(group => normalizeArticleNumber(group.articoloViolato) === articleNumber)
}

function DettaglioImportiContent (props: { value: any, data?: any, fields?: LayerFieldInfo[], groups?: SanzioneConsultivaGroup[] }) {
  const st = useAdminStyle()
  const source = sanitizeImportDetailForDisplay(props.value)
  if (!source) return <span>—</span>
  const lines = source.split('\n').map(line => line.trim())
  const isSectionTitle = (line: string) => /^Art\.\s*\d+[A-Za-z]?(?:\s*[-–—]\s*.+)?$/i.test(line)
  const groups: Array<{ title: string, details: string[] }> = []
  let current: { title: string, details: string[] } | null = null
  lines.forEach(line => {
    if (!line) return
    if (isSectionTitle(line)) {
      current = { title: line, details: [] }
      groups.push(current)
      return
    }
    if (current) current.details.push(line)
  })
  if (!groups.length) return <div style={{ whiteSpace: 'pre-wrap' }}>{source}</div>
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {groups.map((group, groupIndex) => {
        const details = normalizeImportDetailLines(group.details, group.title, props.data, props.fields)
        const subtotal = articleSubtotalFromDetails(details)
        const visibleDetails = subtotal && subtotal.index >= 0 ? details.filter((_, idx) => idx !== subtotal.index) : details
        const normGroups = matchingNormGroupsForDetailTitle(group.title, props.groups)
        return (
          <div
            key={`${group.title}-${groupIndex}`}
            style={{
              display: 'grid',
              gap: 8,
              border: `${Number(st.normGroupBorderWidth ?? 1)}px solid ${st.normGroupBorderColor || '#93c5fd'}`,
              borderRadius: 10,
              background: st.normGroupBg || '#ffffff',
              padding: 10
            }}
          >
            {normGroups.length === 0 && <div style={{ fontWeight: 900 }}>{group.title}</div>}
            {normGroups.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {normGroups.map((normGroup, normIndex) => (
                  <React.Fragment key={`${group.title}-norm-${normGroup.codiceCasistica}-${normIndex}`}>
                    <NormToggleBox variant='violata' title={violationNormSummary(normGroup)} amount={subtotal?.amount}>
                      {articleDetailsByRole('Norma violata', normGroup.articoliViolati, 'violata')}
                    </NormToggleBox>
                    {groupVociBySanzioneArticle(normGroup, normGroup.voci).map(block => (
                      <NormToggleBox key={`${normGroup.codiceCasistica}-${block.key}`} variant='sanzionatoria' title={`Norma sanzionatoria: ${articleListTitle(block.articles, block.fallback)}`}>
                        {articleDetailsByRole('Norma sanzionatoria', block.articles, 'sanzionatoria')}
                      </NormToggleBox>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
            {visibleDetails.length > 0 && (
              <ul style={{ margin: '2px 0 0 34px', padding: 0 }}>
                {visibleDetails.map((detail, detailIndex) => {
                  const moneyLine = splitImportDetailMoneyLine(detail)
                  const isTotal = isArticleSubtotalLine(detail) || /^Totale da pagare\s*:/i.test(detail)
                  return (
                    <li key={`${groupIndex}-${detailIndex}`} style={{ marginTop: detailIndex === 0 ? 0 : 2, fontWeight: isTotal ? 900 : 400 }}>
                      {moneyLine ? (
                        <span>
                          <span>{moneyLine.label}: </span>
                          <span style={{ whiteSpace: 'nowrap', fontWeight: 400 }}>{moneyLine.amount}</span>
                        </span>
                      ) : detail}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}


function Art30SnapshotSummary (props: { data: Record<string, any> }) {
  const st = useAdminStyle()
  const d = props.data || {}
  const selections = parseArt30EquipmentSelections(d)
  const rows = ART30_EQUIPMENT_ORDER
    .map(kind => ({ kind, selection: selections.get(kind) }))
    .filter(item => !!item.selection) as Array<{ kind: Art30EquipmentKind, selection: Art30EquipmentSelection }>
  const lordo = moneyAttr(d, 'attrezzature_rimborso_importo')
  const cauzione = moneyAttr(d, 'attrezzature_cauzione_decurtata')
  const netto = moneyAttr(d, 'attrezzature_importo_netto')
  const rawDetail = String(pickAttrCI(d, ['attrezzature_rimborso_dettaglio']) || '').trim()
  const hasData = rows.length > 0 || !!rawDetail || lordo > 0 || cauzione > 0 || netto > 0
  if (!hasData) return null

  const gridColumns = 'minmax(78px, 0.75fr) minmax(190px, 1.65fr) minmax(68px, 0.55fr) minmax(105px, 0.85fr) minmax(105px, 0.85fr)'
  const headStyle: React.CSSProperties = {
    padding: '7px 8px',
    fontSize: adminLabelFontSize(st),
    fontWeight: 900,
    color: st.formInnerHeaderColor || '#0f4c81',
    background: st.formInnerHeaderBg || '#eaf3fb',
    borderBottom: `1px solid ${st.formCardBorderColor || '#c6d7ea'}`,
    minWidth: 0
  }
  const cellStyle: React.CSSProperties = {
    padding: '7px 8px',
    fontSize: Number(st.formFieldFontSize ?? 15),
    color: '#111827',
    minWidth: 0,
    overflowWrap: 'anywhere',
    borderBottom: `1px solid ${st.formCardBorderColor || '#d8e6f7'}`
  }

  return (
    <details
      open
      style={{
        border: `${Number(st.formExpandableCardBorderWidth ?? 1)}px solid ${st.formExpandableCardBorderColor || '#c6d7ea'}`,
        borderRadius: 10,
        background: st.formExpandableCardBg || '#f9fafb',
        padding: 10
      }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 900, color: st.formInnerHeaderColor || '#0f4c81', fontSize: Number(st.formInnerHeaderFontSize ?? 14) }}>
        Riepilogo rimborsi attrezzature e cauzione
      </summary>

      <div style={{ marginTop: 10 }}>
        {rows.length > 0 ? (
          <div style={{ border: `1px solid ${st.formCardBorderColor || '#c6d7ea'}`, borderRadius: Number(st.formCardBorderRadius ?? 8), overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridColumns }}>
              <div style={headStyle}>Codice</div>
              <div style={headStyle}>Attrezzatura</div>
              <div style={{ ...headStyle, textAlign: 'right' }}>Quantità</div>
              <div style={{ ...headStyle, textAlign: 'right' }}>Valore unitario</div>
              <div style={{ ...headStyle, textAlign: 'right' }}>Importo</div>
            </div>
            {rows.map((item, index) => {
              const row = item.selection
              const bg = index % 2 === 0 ? '#f7fbff' : '#ffffff'
              return (
                <div key={item.kind} style={{ display: 'grid', gridTemplateColumns: gridColumns, background: bg }}>
                  <div style={cellStyle}>{row.codice || '—'}</div>
                  <div style={{ ...cellStyle, fontWeight: 700 }}>{row.descrizione || ART30_EQUIPMENT_META[item.kind].label}</div>
                  <div style={{ ...cellStyle, textAlign: 'right' }}>{Number(row.quantita || 0).toLocaleString('it-IT', { maximumFractionDigits: 2 })}</div>
                  <div style={{ ...cellStyle, textAlign: 'right' }}>{row.valoreUnitario != null ? formatEuroAmount(row.valoreUnitario) : '—'}</div>
                  <div style={{ ...cellStyle, textAlign: 'right', fontWeight: 800 }}>{formatEuroAmount(row.importo)}</div>
                </div>
              )
            })}
            {cauzione > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: gridColumns, background: rows.length % 2 === 0 ? '#f7fbff' : '#ffffff' }}>
                <div style={cellStyle}>—</div>
                <div style={{ ...cellStyle, fontWeight: 700 }}>Decurtazione della cauzione</div>
                <div style={{ ...cellStyle, textAlign: 'right' }}>—</div>
                <div style={{ ...cellStyle, textAlign: 'right' }}>—</div>
                <div style={{ ...cellStyle, textAlign: 'right', fontWeight: 900, color: '#b42318' }}>− {formatEuroAmount(cauzione)}</div>
              </div>
            )}
          </div>
        ) : (
          <InfoBox>{rawDetail}</InfoBox>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, gap: 10, marginTop: 10 }}>
          <StatusSummaryItem label='Rimborso lordo' value={formatEuroAmount(lordo)} tone='auto' />
          <StatusSummaryItem label='Cauzione decurtata' value={formatEuroAmount(cauzione)} tone={cauzione > 0 ? 'warn' : 'auto'} />
          <StatusSummaryItem label='Rimborso netto' value={formatEuroAmount(netto)} tone='total' />
        </div>
      </div>
    </details>
  )
}

function ParametriSanzionatoriSection (props: { loadState: SanzioneConsultivaLoadState, data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void }) {
  const st = useAdminStyle()
  const { loadState } = props
  const urlsReady = loadState.urlsReady
  const casistiche = loadState.casistiche || []
  const loading = loadState.loading
  const error = loadState.error
  const groups = loadState.groups || []
  const d = props.data || {}
  const sanzioneDovuta = sanzioneDovutaAmount(d)
  const rimborsoNetto = rimborsoNettoAmount(d)
  const risarcimentoDanni = risarcimentoDanniAmount(d)
  const speseNotifica = moneyAttr(d, 'sanzione_spese_notifica')
  const totaleAtto = sanzioneDovuta + rimborsoNetto + risarcimentoDanni + speseNotifica

  return (
    <>
      <Section title='Importi totali'>
        {!urlsReady && (
          <InfoBox kind='warn'>Configurare in Builder gli URL di GII_PARAMETRI_SANZIONI, GII_REGOLAMENTO_ARTICOLI e GII_REGOLAMENTO_RACCORDI.</InfoBox>
        )}
        {urlsReady && casistiche.length === 0 && (
          <InfoBox kind='warn'>Nessuna casistica sanzionatoria rilevata dai dati della pratica.</InfoBox>
        )}
        {urlsReady && casistiche.length > 0 && loading && <InfoBox>Caricamento parametri sanzionatori…</InfoBox>}
        {urlsReady && error && <InfoBox kind='warn'>Errore caricamento parametri sanzionatori: {error}</InfoBox>}
        {urlsReady && !loading && !error && casistiche.length > 0 && groups.length === 0 && (
          <InfoBox kind='warn'>Sono presenti violazioni contestate, ma non risultano raccordi attivi nelle tabelle configurate.</InfoBox>
        )}
        {urlsReady && groups.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 10 }}>
            <StatusSummaryItem label='Sanzione dovuta' value={formatEuroAmount(sanzioneDovuta)} tone='auto' />
            <StatusSummaryItem label='Rimborso attrezzature' value={formatEuroAmount(rimborsoNetto)} tone='auto' />
            <StatusSummaryItem label='Rimborso spese/risarcimento danni' value={formatEuroAmount(risarcimentoDanni)} tone='auto' />
            <StatusSummaryItem label='Spese di notifica' value={formatEuroAmount(speseNotifica)} tone='auto' />
            <StatusSummaryItem label='Totale da pagare' value={formatEuroAmount(totaleAtto)} tone='total' />
          </div>
        )}
      </Section>

      {urlsReady && !loading && !error && groups.length > 0 && (
        <Section title='Dettaglio contestazioni'>
          <div style={{ color: '#111827', fontSize: Number(st.formFieldFontSize ?? 15), lineHeight: 1.5, overflowWrap: 'anywhere' }}>
            <DettaglioImportiContent value={pickAttrCI(d, ['sanzione_dettaglio_calcolo'])} data={d} fields={props.fields} groups={groups} />
          </div>
        </Section>
      )}
    </>
  )
}


function SanzioniConsultiveSection (props: { loadState: SanzioneConsultivaLoadState, data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void }) {
  return <ParametriSanzionatoriSection loadState={props.loadState} data={props.data} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
}

function pdfFieldValue (data: any, fields: LayerFieldInfo[], name: string, opts?: { money?: boolean }): string {
  const raw = pickAttrCI(data, [name])
  if (raw == null || raw === '') return ''
  if (opts?.money) {
    const n = typeof raw === 'number' ? raw : parseNumberInput(raw)
    return n != null ? formatEuroText(n) : String(raw)
  }
  const lf = getFieldInfo(fields, name)
  if (lf?.domain?.codedValues) {
    const label = domainLabel(lf, raw)
    return label === '—' ? '' : label
  }
  if (looksLikeDateField(name)) {
    const d = formatDateValue(raw)
    return d === '—' ? '' : d
  }
  const v = formatValue(raw)
  return v === '—' ? '' : v
}

function joinParts (...parts: string[]): string {
  return parts.map(p => String(p || '').trim()).filter(Boolean).join(' ')
}

function firstTextAttr (data: any, names: string[]): string {
  for (const name of names) {
    const value = String(pickAttrCI(data || {}, [name]) || '').trim()
    if (value) return value
  }
  return ''
}

function buildVerbaleViolationsText (data: any, fields: LayerFieldInfo[]): string {
  const rows = buildViolationRows(data || {}, fields || [])
    .map((row, index) => ({ row, index }))
    .sort((a, b) => Number(normalizeArticleNumber(a.row.label) || Number.MAX_SAFE_INTEGER) - Number(normalizeArticleNumber(b.row.label) || Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(item => item.row)
  if (!rows.length) return ''
  return rows.map(row => {
    const lines = [row.label, ...row.details.map(d => `• ${d.label}: ${d.value}`)]
    return lines.join('\n')
  }).join('\n\n')
}

function buildVerbalePdfMap (data: any, fields: LayerFieldInfo[], profile: { username: string, fullName: string }): Record<string, string> {
  const d = data || {}
  const oid = pickAttrCI(d, ['OBJECTID', 'objectid', 'ObjectId', 'FID'])
  const oidNumber = oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null
  const nRapporto = normalizeReportCode(pickAttrCI(d, [
    'numero_rapporto_tecnico', 'NUMERO_RAPPORTO_TECNICO', 'Numero_rapporto_tecnico',
    'n_rapporto', 'numero_rapporto', 'codice_rapporto'
  ]), oidNumber)
  const nRilevazione = normalizeRilevazioneCodeForAmm(d, oidNumber)
  const dataApprovazioneRapporto = pdfFieldValue(d, fields, 'dt_esito_DT') || pdfFieldValue(d, fields, 'data_rapporto_tecnico')
  const nomeTrasgressore = String(pickAttrCI(d, ['nome']) || '').trim()
  const cognomeTrasgressore = String(pickAttrCI(d, ['cognome']) || '').trim()
  const ragioneSociale = String(pickAttrCI(d, ['ragione_sociale']) || '').trim()
  const isPg = String(pickAttrCI(d, ['tipologia_soggetto']) || '').toUpperCase().includes('GIUR') || !!ragioneSociale
  const trasgressore = isPg
    ? ragioneSociale
    : joinParts(cognomeTrasgressore, nomeTrasgressore)
  const cfPiva = isPg ? String(pickAttrCI(d, ['piva']) || '').trim() : String(pickAttrCI(d, ['codice_fiscale']) || '').trim()
  const indirizzo = joinParts(String(pickAttrCI(d, ['via']) || ''), String(pickAttrCI(d, ['civico']) || ''))
  const comuneCap = joinParts(String(pickAttrCI(d, ['citta', 'comune']) || ''), String(pickAttrCI(d, ['cap']) || ''))
  const contatti = [String(pickAttrCI(d, ['email']) || '').trim(), String(pickAttrCI(d, ['telefono']) || '').trim(), String(pickAttrCI(d, ['cellulare']) || '').trim()].filter(Boolean).join(' / ')
  const area = pdfFieldValue(d, fields, 'area_cod') || String(pickAttrCI(d, ['area_label', 'area']) || '')
  const settore = pdfFieldValue(d, fields, 'settore_cod') || String(pickAttrCI(d, ['settore_label', 'settore']) || '')
  const rawTipoAtto = String(pickAttrCI(d, ['tipo_atto_amm']) || '').trim()
  const tipoAttoLabel = pdfFieldValue(d, fields, 'tipo_atto_amm') || rawTipoAtto
  const tiAmmNome = firstTextAttr(d, ['ti_amm_assegnato_nome', 'ti_amm_assegnato_username'])
  const riAmmNome = firstTextAttr(d, [
    'ri_amm_nome', 'ri_amm_username',
    'responsabile_istruttoria_amm_nome', 'responsabile_istruttoria_amm_username',
    'istruttoria_amm_chiusa_da'
  ])
  const daNome = firstTextAttr(d, [
    'da_nome', 'da_username',
    'direttore_area_nome', 'direttore_area_username',
    'direttore_amm_nome', 'direttore_amm_username',
    'dt_amm_nome', 'dt_amm_username',
    'atto_approvato_da', 'approvato_da', 'istruttoria_amm_approvata_da'
  ])
  const approvatoDa = isDaApprovalComplete(d)
  return {
    objectid: oid != null ? String(oid) : '',
    pratica: '',
    n_rilevazione: nRilevazione,
    n_rapporto: nRapporto,
    data_rilevazione: pdfFieldValue(d, fields, 'data_rilevazione'),
    data_approvazione_rapporto: dataApprovazioneRapporto,
    area,
    settore,
    ufficio_zona: pdfFieldValue(d, fields, 'ufficio_zona'),
    tecnico_rilevatore: String(pickAttrCI(d, ['tecnico_rilevatore']) || ''),
    ti_amm: String(pickAttrCI(d, ['ti_amm_assegnato_nome', 'ti_amm_assegnato_username']) || ''),
    trasgressore_tipo: isPg ? 'PG' : 'PF',
    trasgressore,
    cf_piva: cfPiva,
    indirizzo,
    comune_cap: comuneCap,
    pec: String(pickAttrCI(d, ['pec']) || ''),
    contatti,
    violazioni: buildVerbaleViolationsText(d, fields),
    descrizione_fatti: String(pickAttrCI(d, ['descrizione_fatti']) || ''),
    tipo_atto_amm: rawTipoAtto,
    tipo_atto_amm_label: tipoAttoLabel,
    atto_approvato: isDaApprovalComplete(d) ? '1' : '0',
    protocollo_istanza_numero: String(pickAttrCI(d, ['protocollo_istanza_numero']) || ''),
    protocollo_istanza_data: pdfFieldValue(d, fields, 'protocollo_istanza_data'),
    oggetto_atto_amm: String(pickAttrCI(d, ['oggetto_atto_amm']) || ''),
    note_atto_amm: String(pickAttrCI(d, ['note_atto_amm']) || ''),
    numero_verbale: verbaleNumberValue(d, oid),
    data_verbale: hasAdminValue(pickAttrCI(d, ['data_verbale'])) ? pdfFieldValue(d, fields, 'data_verbale') : displayVerbaleApprovalDate(d, fields),
    protocollo_verbale: String(pickAttrCI(d, ['protocollo_verbale_numero']) || ''),
    protocollo_verbale_data: pdfFieldValue(d, fields, 'protocollo_verbale_data'),
    notifica_tipo: pdfFieldValue(d, fields, 'notifica_tipo'),
    notifica_data: pdfFieldValue(d, fields, 'notifica_data'),
    notifica_esito: pdfFieldValue(d, fields, 'notifica_esito'),
    notifica_estremi: String(pickAttrCI(d, ['notifica_estremi']) || ''),
    sanzione_importo_base: pdfFieldValue(d, fields, 'sanzione_importo_base', { money: true }),
    sanzione_importo_ridotta: pdfFieldValue(d, fields, 'sanzione_importo_ridotta', { money: true }),
    risarcimento_danni_importo: pdfFieldValue(d, fields, 'risarcimento_danni_importo', { money: true }),
    sanzione_spese_notifica: pdfFieldValue(d, fields, 'sanzione_spese_notifica', { money: true }),
    attrezzature_cauzione_presente: pdfFieldValue(d, fields, 'attrezzature_cauzione_presente'),
    attrezzature_rimborso_importo: pdfFieldValue(d, fields, 'attrezzature_rimborso_importo', { money: true }),
    attrezzature_cauzione_decurtata: pdfFieldValue(d, fields, 'attrezzature_cauzione_decurtata', { money: true }),
    attrezzature_importo_netto: pdfFieldValue(d, fields, 'attrezzature_importo_netto', { money: true }),
    attrezzature_rimborso_dettaglio: String(pickAttrCI(d, ['attrezzature_rimborso_dettaglio']) || ''),
    attrezzature_note: String(pickAttrCI(d, ['attrezzature_note']) || ''),
    pagamento_importo_totale: pdfFieldValue(d, fields, 'pagamento_importo_totale', { money: true }),
    pagamento_scadenza: pdfFieldValue(d, fields, 'pagamento_scadenza'),
    pagamento_modalita: pdfFieldValue(d, fields, 'pagamento_modalita'),
    pagamento_stato: pdfFieldValue(d, fields, 'pagamento_stato'),
    pagamento_note: String(pickAttrCI(d, ['pagamento_note']) || ''),
    pagopa_iuv: String(pickAttrCI(d, ['pagopa_iuv']) || ''),
    pagopa_codice_avviso: String(pickAttrCI(d, ['pagopa_codice_avviso']) || ''),
    bonifico_iban: String(pickAttrCI(d, ['bonifico_iban_snapshot']) || ''),
    bonifico_intestatario: String(pickAttrCI(d, ['bonifico_intestatario_snapshot']) || ''),
    bonifico_causale: String(pickAttrCI(d, ['bonifico_causale']) || ''),
    bonifico_cro_trn: String(pickAttrCI(d, ['bonifico_cro_trn']) || ''),
    bonifico_data_accredito: pdfFieldValue(d, fields, 'bonifico_data_accredito'),
    tipo_abuso_art15: art15AbuseTypeLabel(d, fields, ''),
    tipo_comunicazione_art17: art17CommunicationTypeLabel(d, fields, ''),
    sanzione_dettaglio_calcolo: String(pickAttrCI(d, ['sanzione_dettaglio_calcolo']) || ''),
    sanzione_calcolata_il: pdfFieldValue(d, fields, 'sanzione_calcolata_il'),
    sanzione_calcolata_da: String(pickAttrCI(d, ['sanzione_calcolata_da']) || ''),
    verbale_pdf_generato_il: pdfFieldValue(d, fields, 'verbale_pdf_generato_il'),
    verbale_pdf_generato_da: String(pickAttrCI(d, ['verbale_pdf_generato_da']) || ''),
    istruttoria_amm_chiusa_il: pdfFieldValue(d, fields, 'istruttoria_amm_chiusa_il'),
    istruttoria_amm_chiusa_da: String(pickAttrCI(d, ['istruttoria_amm_chiusa_da']) || ''),
    amm_iter_compilazione_nome: tiAmmNome || String(pickAttrCI(d, ['verbale_pdf_generato_da']) || ''),
    amm_iter_compilazione_presa: pdfFieldValue(d, fields, 'dt_presa_in_carico_TI_AMM'),
    amm_iter_compilazione_data: pdfFieldValue(d, fields, 'dt_esito_TI_AMM') || pdfFieldValue(d, fields, 'sanzione_calcolata_il') || pdfFieldValue(d, fields, 'verbale_pdf_generato_il'),
    amm_iter_supervisione_nome: riAmmNome,
    amm_iter_supervisione_presa: pdfFieldValue(d, fields, 'dt_presa_in_carico_RI_AMM'),
    amm_iter_supervisione_data: pdfFieldValue(d, fields, 'dt_esito_RI_AMM') || pdfFieldValue(d, fields, 'istruttoria_amm_chiusa_il'),
    amm_iter_approvazione_nome: daNome,
    amm_iter_approvazione_presa: pdfFieldValue(d, fields, 'dt_presa_in_carico_DA') || pdfFieldValue(d, fields, 'dt_stato_DA'),
    amm_iter_approvazione_data: approvatoDa ? (pdfFieldValue(d, fields, 'dt_esito_DA') || displayVerbaleApprovalDate(d, fields)) : '',
    data_generazione: new Date().toLocaleString('it-IT'),
    generato_da: profile.fullName || profile.username || ''
  }
}

function verbalePdfFileName (map: Record<string, string>): string {
  const prefix = getVerbalePdfFilePrefix(map) || 'proposta_contestazione'
  const base = String(map.n_rapporto || map.objectid || prefix).replace(/[^a-zA-Z0-9_-]/g, '_')
  return `${prefix}_${base || prefix}.pdf`
}

function buildVerbalePdfGenerationMeta (profile: { username: string, fullName: string }): Record<string, any> {
  return {
    verbale_pdf_generato_il: Date.now(),
    verbale_pdf_generato_da: String(profile.fullName || profile.username || '').trim()
  }
}

async function buildVerbalePdfBlob (data: any, fields: LayerFieldInfo[], profile: { username: string, fullName: string }): Promise<{ blob: Blob, fileName: string }> {
  const map = buildVerbalePdfMap(data, fields, profile)
  const bytes = await buildVerbalePdf(map)
  const fileName = verbalePdfFileName(map)
  return { blob: new Blob([bytes as any], { type: 'application/pdf' }), fileName }
}

function makePdfUrl (blob: Blob, fileName: string): string {
  return `${URL.createObjectURL(blob)}#${fileName}`
}

function revokePdfUrl (url?: string | null): void {
  if (!url) return
  try { URL.revokeObjectURL(String(url).split('#')[0]) } catch {}
}

function downloadBlobFile (blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => { try { URL.revokeObjectURL(url) } catch {} }, 1500)
}

function ViolationsSection (props: { data: any, layerFields: LayerFieldInfo[] }) {
  const st = useAdminStyle()
  const rows = buildViolationRows(props.data || {}, props.layerFields || [])
  const descrizione = firstViolationValue(props.data || {}, props.layerFields || [], ['descrizione_fatti'])
  const circostanze = firstViolationValue(props.data || {}, props.layerFields || [], ['circostanze'])
  return (
    <Section title='Violazioni contestate'>
      {rows.length === 0 ? (
        <InfoBox kind='warn'>Nessuna violazione contestata rilevata nei dati della pratica.</InfoBox>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {rows.map(row => (
            <div key={row.key} style={{ border: '1px solid #dbeafe', background: '#f8fafc', borderRadius: 11, padding: 11, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ background: '#0d3b66', color: '#fff', borderRadius: 999, padding: '5px 10px', fontWeight: 800, fontSize: Number(st.formFieldFontSize ?? 15) }}>{row.label}</span>
                <span style={{ color: '#166534', fontSize: Number(st.formFieldFontSize ?? 15), fontWeight: 800 }}>Contestata</span>
              </div>
              {row.details.length > 0 ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  {row.details.map((d, idx) => (
                    <div key={`${row.key}-${d.label}-${idx}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 0.8fr) minmax(0, 1.2fr)', gap: 8, fontSize: Number(st.formFieldFontSize ?? 15) }}>
                      <div style={{ color: '#6b7280', fontWeight: 800 }}>{d.label}</div>
                      <div style={{ color: '#111827', fontWeight: 650, overflowWrap: 'anywhere' }}>{d.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: adminLabelFontSize(st) }}>Nessun dettaglio tecnico aggiuntivo valorizzato.</div>
              )}
            </div>
          ))}
        </div>
      )}
      {(descrizione || circostanze) && (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {descrizione && <InfoBox><strong>Descrizione fatti:</strong><br />{descrizione}</InfoBox>}
          {circostanze && <InfoBox><strong>Circostanze:</strong><br />{circostanze}</InfoBox>}
        </div>
      )}
    </Section>
  )
}

function DatiGeneraliAmmSection (props: { title: string, data: Record<string, any>, fields: LayerFieldInfo[], profile: { role: string, label: string, fullName: string, username: string }, hasDsForSave: boolean, summaryFields: any[], labelSize: number, valueSize: number }) {
  const st = useAdminStyle()
  const d = props.data || {}
  const oid = pickOidFromData(d, 'OBJECTID')
  const rapporto = getReportCode(d, oid != null ? Number(oid) : null)
  const verbaleDefinitivo = isVerbaleDefinitivo(d)
  const hasVerbale = tipoAttoAmmPrevedeVerbale(d)
  const verbaleNotificato = isVerbaleNotificato(d)
  const tecnicoIstruttoreTecnico = String(pickAttrCI(d, ['ti_assegnato_nome', 'ti_assegnato_username', 'tecnico_istruttore_nome', 'tecnico_istruttore', 'istruttore_tecnico_nome', 'istruttore_tecnico']) || '—')
  const panelStyle: React.CSSProperties = { border: '1px solid #dbeafe', background: '#f8fafc', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }
  const panelTitleStyle: React.CSSProperties = { color: st.formInnerHeaderColor || '#0f4c81', fontSize: Number(st.formInnerHeaderFontSize ?? 14), fontWeight: 900, letterSpacing: 0.2, textTransform: 'uppercase' }
  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }

  return (
    <>
      <CompactPracticeHeader
        title={props.title}
        data={d}
        fields={props.fields}
        profile={props.profile}
        hasDsForSave={props.hasDsForSave}
        summaryFields={props.summaryFields}
        labelSize={props.labelSize}
        valueSize={props.valueSize}
      />
      <Section title='Dati generali'>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={panelStyle}>
            <div style={panelTitleStyle}>Fase tecnica</div>
            <div style={gridStyle}>
              <StatusSummaryItem label='Numero rapporto tecnico' value={rapporto} tone='auto' />
              <StatusSummaryItem label='Data rapporto tecnico' value={displayAdminFieldValue(d, props.fields, 'data_rapporto_tecnico')} tone={hasAdminValue(pickAttrCI(d, ['data_rapporto_tecnico'])) ? 'auto' : 'warn'} />
              <StatusSummaryItem label='Approvazione DT' value={displayAdminFieldValue(d, props.fields, 'dt_esito_DT')} tone={hasAdminValue(pickAttrCI(d, ['dt_esito_DT'])) ? 'auto' : 'warn'} />
              <StatusSummaryItem label='Area tecnica di provenienza' value={displayAdminFieldValue(d, props.fields, 'area_cod')} tone='auto' />
              <StatusSummaryItem label='Settore' value={displayAdminFieldValue(d, props.fields, 'settore_cod')} tone='auto' />
              <StatusSummaryItem label='Ufficio di zona' value={displayAdminFieldValue(d, props.fields, 'ufficio_zona')} tone='auto' />
              <StatusSummaryItem label='Tecnico istruttore' value={tecnicoIstruttoreTecnico} tone='auto' />
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelTitleStyle}>Fase amministrativa</div>
            <div style={gridStyle}>
              {hasVerbale && <StatusSummaryItem label='Numero verbale' value={displayVerbaleNumber(d, props.fields, oid)} tone={hasAdminValue(verbaleNumberValue(d, oid)) ? 'auto' : 'warn'} />}
              <StatusSummaryItem label='Data approvazione' value={displayVerbaleApprovalDate(d, props.fields)} tone={hasAdminValue(verbaleApprovalDateValue(d)) ? 'auto' : 'warn'} />
              <StatusSummaryItem label='Stato' value={verbaleDefinitivo ? 'Definitivo' : 'In corso di istruttoria'} tone={verbaleDefinitivo ? 'auto' : 'warn'} />
              <StatusSummaryItem label='Notifica' value={verbaleNotificato ? displayAdminFieldValue(d, props.fields, 'notifica_data') : 'Non registrata'} tone={verbaleNotificato ? 'auto' : 'warn'} />
              <StatusSummaryItem label='Tecnico istruttore' value={displayAdminFieldValue(d, props.fields, 'ti_amm_assegnato_nome', displayAdminFieldValue(d, props.fields, 'ti_amm_assegnato_username'))} tone='auto' />
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}

function VerbaleInlinePreviewSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], profile: { username: string, fullName: string }, hasSelection: boolean }) {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null)
  const [pdfFileName, setPdfFileName] = React.useState('proposta-contestazione.pdf')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const signature = React.useMemo(() => {
    try {
      return JSON.stringify({ data: props.data || {}, fields: (props.fields || []).map(f => f.name), user: props.profile?.username || '' })
    } catch {
      return String(Date.now())
    }
  }, [props.data, props.fields, props.profile])

  React.useEffect(() => {
    let cancelled = false
    if (!props.hasSelection) {
      setPdfUrl(prev => { revokePdfUrl(prev); return null })
      setError(null)
      setLoading(false)
      return () => { cancelled = true }
    }

    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const { blob, fileName } = await buildVerbalePdfBlob(props.data || {}, props.fields || [], props.profile || { username: '', fullName: '' })
        if (cancelled) return
        const url = makePdfUrl(blob, fileName)
        setPdfFileName(fileName)
        setPdfUrl(prev => {
          revokePdfUrl(prev)
          return url
        })
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [signature, props.hasSelection])

  React.useEffect(() => {
    return () => { revokePdfUrl(pdfUrl) }
  }, [pdfUrl])

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, borderRadius: 12, overflow: 'hidden' }}>
      <AnteprimaPdfViewer
        url={pdfUrl}
        fileName={pdfFileName}
        title='Anteprima proposta di contestazione'
        subtitle={pdfFileName}
        loading={loading}
        error={error}
        emptyText='Nessun dato disponibile per l&apos;anteprima della proposta.'
      />
    </div>
  )
}

function AllegatiAmmSection (props: { oid: number | null, ds: any, layerUrl?: string, canEdit: boolean }) {
  const st = useAdminStyle()
  const oid = props.oid != null && Number.isFinite(Number(props.oid)) ? Number(props.oid) : null
  const [items, setItems] = React.useState<AmmAttachmentInfo[]>([])
  const [loadedOid, setLoadedOid] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<AmmAttachmentInfo | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [inputKey, setInputKey] = React.useState(0)

  const resolveAttachmentLayer = React.useCallback(async () => {
    const layer = await resolveLayerForEdit(props.ds, props.layerUrl)
    const layerUrl = normalizeEditLayerUrl(props.layerUrl || layer?.url || getDataSourceUrl(props.ds))
    return { layer, layerUrl }
  }, [props.ds, props.layerUrl])

  const load = React.useCallback(async () => {
    if (!oid) {
      setItems([])
      setLoadedOid(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      if (!layer && !layerUrl) throw new Error('FeatureLayer non disponibile per gli allegati.')
      const list = await queryAmmAttachments(layer, oid, layerUrl)
      setItems(list)
      setLoadedOid(oid)
    } catch (e: any) {
      setItems([])
      setLoadedOid(oid)
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [oid, resolveAttachmentLayer])

  React.useEffect(() => {
    if (oid && loadedOid !== oid) void load()
  }, [oid, loadedOid, load])

  React.useEffect(() => {
    let cancelled = false
    setPreviewUrl(prev => { revokePdfUrl(prev); return null })
    if (!selected || !oid) {
      setPreviewLoading(false)
      return () => { cancelled = true }
    }
    setPreviewLoading(true)
    ;(async () => {
      try {
        const { layerUrl } = await resolveAttachmentLayer()
        const url = await buildAttachmentPreviewUrl(selected, oid, layerUrl)
        if (!cancelled) setPreviewUrl(url)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e))
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selected, oid, resolveAttachmentLayer])

  React.useEffect(() => {
    return () => { revokePdfUrl(previewUrl) }
  }, [previewUrl])

  const upload = React.useCallback(async (files: File[]) => {
    if (!oid || !files.length || !props.canEdit) return
    setBusy(true)
    setError(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      await addAmmAttachments(layer, oid, files, layerUrl)
      setInputKey(k => k + 1)
      await load()
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }, [oid, props.canEdit, resolveAttachmentLayer, load])

  const remove = React.useCallback(async (att: AmmAttachmentInfo) => {
    if (!oid || !att?.id || !props.canEdit) return
    const ok = window.confirm(`Eliminare l'allegato "${att.name || att.id}"?`)
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      await deleteAmmAttachment(layer, oid, Number(att.id), layerUrl)
      if (selected?.id === att.id) setSelected(null)
      await load()
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }, [oid, props.canEdit, resolveAttachmentLayer, load, selected])

  const headerBg = st.formCardHeaderBg || '#0d3b66'
  const headerColor = st.formCardHeaderColor || '#fff'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', height: '100%', border: `1px solid ${st.formCardBorderColor || '#c5d9f1'}`, borderRadius: Number(st.formCardBorderRadius ?? 10), background: '#fff', overflow: 'hidden' }}>
      <div style={{ flex: '0 0 auto', padding: '8px 12px', background: headerBg, color: headerColor, fontWeight: 800, fontSize: Number(st.formCardHeaderFontSize ?? 14) }}>
        ALLEGATI
      </div>

      {!oid ? (
        <div style={{ flex: '1 1 auto', minHeight: 0, padding: 12 }}>
          <InfoBox kind='warn'>Selezionare una pratica prima di consultare o caricare gli allegati.</InfoBox>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, flex: '1 1 auto', minHeight: 0, padding: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800, fontSize: Number(st.formInnerHeaderFontSize ?? 14), color: st.formInnerHeaderColor || '#0f4c81' }}>Elenco allegati</div>
              <label style={{ minHeight: 36, height: 36, boxSizing: 'border-box', padding: '0 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: (!props.canEdit || busy) ? '#e5e7eb' : '#f8fbff', color: (!props.canEdit || busy) ? '#9ca3af' : '#111827', fontSize: adminFieldFontSize(st), fontWeight: 600, cursor: (!props.canEdit || busy) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, whiteSpace: 'nowrap' }}>
                Scegli file
                <input
                  key={inputKey}
                  type='file'
                  multiple
                  disabled={!props.canEdit || busy}
                  style={{ display: 'none' }}
                  onChange={e => {
                    const files = Array.from(e.currentTarget.files || [])
                    if (files.length) void upload(files)
                  }}
                />
              </label>
            </div>

            {error && <div style={{ flex: '0 0 auto', color: '#b42318', fontSize: adminLabelFontSize(st), fontWeight: 700 }}>{error}</div>}
            {loading ? (
              <div style={{ flex: '0 0 auto', color: '#6b7280', fontSize: adminLabelFontSize(st) }}>Caricamento allegati…</div>
            ) : items.length ? (
              <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'grid', alignContent: 'start', gap: 8, paddingRight: 2 }}>
                {items.map(att => {
                  const active = selected?.id === att.id
                  return (
                    <div key={att.id} onClick={() => setSelected(active ? null : att)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${active ? '#2563eb' : 'rgba(0,0,0,0.08)'}`, background: active ? '#eff6ff' : '#fff', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: Number(st.formFieldFontSize ?? 15), color: '#111827', wordBreak: 'break-word' }}>{att.name || `Allegato #${att.id}`}</div>
                        <div style={{ fontSize: adminLabelFontSize(st), color: '#64748b' }}>{formatAttachmentBytes(att.size)}{att.contentType ? ` • ${att.contentType}` : ''}</div>
                      </div>
                      <button type='button' disabled={!props.canEdit || busy} onClick={e => { e.preventDefault(); e.stopPropagation(); void remove(att) }} style={secondaryButtonStyle(!props.canEdit || busy)}>Elimina</button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ flex: '0 0 auto', color: '#6b7280', fontSize: adminLabelFontSize(st) }}>Nessun allegato.</div>
            )}
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, background: '#282828', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: selected ? 'flex-start' : 'center', overflow: 'hidden', minHeight: 0 }}>
            {!selected ? (
              <div style={{ fontSize: adminLabelFontSize(st), color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>Seleziona un allegato per visualizzare l&apos;anteprima</div>
            ) : previewLoading ? (
              <div style={{ fontSize: adminLabelFontSize(st), color: 'rgba(255,255,255,0.55)' }}>Caricamento anteprima…</div>
            ) : previewUrl ? (() => {
              const ct = String(selected.contentType || '').toLowerCase()
              if (ct.startsWith('image/')) return <img src={previewUrl} alt={selected.name || ''} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 6, objectFit: 'contain', flex: '1 1 auto', minHeight: 0 }} />
              if (ct === 'application/pdf') return <iframe src={previewUrl} title={selected.name || 'PDF'} style={{ width: '100%', flex: '1 1 auto', minHeight: 0, border: 'none', borderRadius: 6 }} />
              return <div style={{ fontSize: adminLabelFontSize(st), color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>Anteprima non disponibile per questo tipo di file.</div>
            })() : (
              <div style={{ fontSize: adminLabelFontSize(st), color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>Anteprima non disponibile per questo tipo di file.</div>
            )}
            {selected && (
              <div style={{ flex: '0 0 auto', marginTop: 8, fontSize: adminLabelFontSize(st), color: 'rgba(255,255,255,0.78)', textAlign: 'center', wordBreak: 'break-word' }}>
                {selected.name || `Allegato #${selected.id}`}{selected.contentType ? ` • ${selected.contentType}` : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DataSourceSelectionBridge (props: {
  widgetId: string
  uds: any
  dsKey: string
  onUpdate: (dsKey: string, state: SelectedState) => void
}) {
  const { widgetId, uds, dsKey, onUpdate } = props
  return (
    <DataSourceComponent useDataSource={uds} widgetId={widgetId}>
      {(ds: any) => <SelectionWatcher ds={ds} dsKey={dsKey} onUpdate={onUpdate} />}
    </DataSourceComponent>
  )
}

function SelectionWatcher (props: {
  ds: any
  dsKey: string
  onUpdate: (dsKey: string, state: SelectedState) => void
}): any {
  const { ds, dsKey, onUpdate } = props

  React.useEffect(() => {
    try { ds?.setListenSelection?.(true) } catch {}
  }, [ds])

  let selected = ds?.getSelectedRecords?.() || []
  if (!selected || selected.length === 0) {
    const recs = ds?.getRecords?.() || []
    if (recs && recs.length) selected = recs
  }

  const r0 = selected.length ? selected[0] : null
  const idFieldName = String(ds?.getIdField?.() || 'OBJECTID')
  const baseData = r0?.getData ? r0.getData() : null
  const oid = pickOidFromData(baseData, idFieldName)
  const layerUrl = getDataSourceUrl(ds)
  const [fullData, setFullData] = React.useState<any | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setFullData(null)
    const load = async () => {
      if (!ds || oid == null || !Number.isFinite(Number(oid))) return
      try {
        const q: any = {
          where: `${idFieldName}=${Number(oid)}`,
          outFields: ['*'],
          returnGeometry: false,
          pageSize: 1
        }
        const res: any = await (ds?.query ? ds.query(q) : null)
        let rec: any = null
        if (Array.isArray(res)) rec = res[0]
        else if (Array.isArray(res?.records)) rec = res.records[0]
        else if (Array.isArray(res?.data?.records)) rec = res.data.records[0]
        const data = rec?.getData ? rec.getData() : (rec?.data || rec?.attributes || null)
        if (!cancelled && data) setFullData(data)
      } catch {
        // Nessun fallback diretto a FeatureLayer: evitiamo nuove chiamate potenzialmente invasive.
      }
    }
    load()
    return () => { cancelled = true }
  }, [ds, oid, idFieldName])

  const data = fullData ? { ...(baseData || {}), ...(fullData || {}) } : baseData
  const sig = `${layerUrl}|${oid ?? ''}|${data ? Object.keys(data).length : 0}`

  React.useEffect(() => {
    onUpdate(dsKey, {
      ds,
      oid,
      idFieldName,
      layerUrl,
      data: oid != null && Number.isFinite(Number(oid)) ? data : null,
      source: 'datasource',
      sig
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsKey, ds, oid, idFieldName, layerUrl, sig])

  return null
}


function inputStyleFrom (st: Record<string, any>, disabled?: boolean): React.CSSProperties {
  const h = Number(st.formFieldHeight ?? 32)
  const fieldHeight = Number.isFinite(h) && h > 0 ? h : 32
  const fontSize = Number(st.formFieldFontSize ?? 15)
  return {
    width: '100%',
    boxSizing: 'border-box',
    height: fieldHeight,
    minHeight: fieldHeight,
    border: `${Number(st.formFieldBorderWidth ?? 1)}px solid ${st.formFieldBorderColor || '#bfcede'}`,
    borderRadius: Number(st.formFieldBorderRadius ?? 7),
    padding: `0 ${Number(st.formFieldPaddingX ?? 9)}px`,
    fontSize,
    lineHeight: `${Math.max(16, fieldHeight - 2)}px`,
    color: disabled ? (st.formFieldDisabledColor || '#64748b') : (st.formFieldColor || '#0f172a'),
    background: disabled ? (st.formFieldDisabledBg || '#e7eef7') : (st.formFieldBg || '#f8fbff'),
    outline: 'none'
  }
}

function blurOnEnter (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>): void {
  if (e.key !== 'Enter') return
  e.preventDefault()
  e.currentTarget.blur()
}

function TextInput (props: { value: any, disabled?: boolean, placeholder?: string, onChange: (v: string) => void }) {
  const st = useAdminStyle()
  return <input type='text' value={props.value ?? ''} disabled={props.disabled} placeholder={props.placeholder || ''} onChange={e => props.onChange(e.target.value)} onKeyDown={blurOnEnter} style={inputStyleFrom(st, props.disabled)} />
}

function TextArea (props: { value: any, disabled?: boolean, placeholder?: string, onChange: (v: string) => void }) {
  const st = useAdminStyle()
  return <textarea value={props.value ?? ''} disabled={props.disabled} placeholder={props.placeholder || ''} onChange={e => props.onChange(e.target.value)} rows={4} style={{ ...inputStyleFrom(st, props.disabled), height: 'auto', padding: `6px ${Number(st.formFieldPaddingX ?? 9)}px`, resize: 'vertical', minHeight: 88, lineHeight: 1.35 }} />
}

function NumberInput (props: { value: any, disabled?: boolean, money?: boolean, onChange: (v: number | null) => void }) {
  const st = useAdminStyle()
  const [focused, setFocused] = React.useState(false)
  const [textValue, setTextValue] = React.useState(() => {
    if (props.value == null || props.value === '') return ''
    return props.money ? formatMoney(props.value) : String(props.value)
  })

  React.useEffect(() => {
    if (focused) return
    if (props.value == null || props.value === '') {
      setTextValue('')
      return
    }
    setTextValue(props.money ? formatMoney(props.value) : String(props.value))
  }, [props.value, props.money, focused])

  const commit = (value: string) => {
    const n = parseNumberInput(value)
    props.onChange(n)
    if (n == null) {
      setTextValue('')
      return
    }
    setTextValue(props.money ? formatMoney(n) : String(n))
  }

  return (
    <input
      type='text'
      inputMode='decimal'
      value={textValue}
      disabled={props.disabled}
      onFocus={() => setFocused(true)}
      onChange={e => {
        const next = e.currentTarget.value.replace(/[^0-9.,-]/g, '')
        setTextValue(next)
        if (!next.trim()) {
          props.onChange(null)
          return
        }
        const n = parseNumberInput(next)
        if (n != null) props.onChange(n)
      }}
      onBlur={e => {
        setFocused(false)
        commit(e.currentTarget.value)
      }}
      onKeyDown={e => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        setFocused(false)
        commit(e.currentTarget.value)
        e.currentTarget.blur()
      }}
      style={inputStyleFrom(st, props.disabled)}
      placeholder='0,00'
    />
  )
}

function inputStyle (disabled?: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d1d5db',
    borderRadius: 9,
    padding: '8px 10px',
    fontSize: 15,
    color: disabled ? '#6b7280' : '#111827',
    background: disabled ? '#f3f4f6' : '#fff',
    outline: 'none'
  }
}

function NoteCasisticaSelect (props: { fieldName: string, disabled?: boolean, onApply: (text: string) => void }) {
  const st = useAdminStyle()
  const options = getNoteCasistiche(props.fieldName)
  if (!options.length) return null
  return (
    <div style={{ display: 'grid', gap: 4, width: '100%' }}>
      <label style={{ color: st.formLabelColor || '#334155', fontSize: Number(st.formLabelFontSize ?? 15), fontWeight: Number(st.formLabelFontWeight ?? 600) as any, marginBottom: Number(st.formLabelMarginBottom ?? 3) }}>Casistica note</label>
      <select
        disabled={props.disabled}
        value=''
        onChange={e => {
          const key = e.currentTarget.value
          if (!key) return
          const opt = options.find(o => o.key === key)
          if (opt?.text) props.onApply(opt.text)
        }}
        onKeyDown={blurOnEnter}
        style={inputStyleFrom(st, props.disabled)}
      >
        <option value=''>- Seleziona -</option>
        {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </div>
  )
}

function FieldEditor (props: {
  field: AdminField
  draft: Record<string, any>
  fields: LayerFieldInfo[]
  canEdit: boolean
  onChange: (name: string, value: any) => void
}) {
  const { field, draft, fields, canEdit, onChange } = props
  const st = useAdminStyle()
  const lf = getFieldInfo(fields, field.name)
  const exists = !!lf
  const real = lf?.name || field.name
  const raw = pickAttrCI(draft, [real, field.name])
  const systemCalculated = isSystemCalculatedAdminField(field.name)
  const readonly = field.readonly || systemCalculated || !canEdit || !exists || lf?.editable === false
  const options = getDomainOptions(lf)
  const effectiveOptions: Array<{ code: any, name: string }> = options.length ? options : getFallbackDomainOptions(field.name)
  const miss = !exists

  const label = (
    <div style={{ color: st.formLabelColor || '#334155', fontSize: Number(st.formLabelFontSize ?? 15), fontWeight: Number(st.formLabelFontWeight ?? 600) as any, marginBottom: Number(st.formLabelMarginBottom ?? 3), display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{field.label}</span>
      {systemCalculated && !miss && <span style={{ color: '#1d4ed8', fontWeight: 800, fontSize: Math.max(13, adminLabelFontSize(st) - 2) }}>automatico</span>}
      {miss && <span style={{ color: '#b45309', fontWeight: 700, fontSize: Math.max(13, adminLabelFontSize(st) - 2) }}>campo assente</span>}
    </div>
  )

  let control: React.ReactNode = null
  if (field.kind === 'textarea') {
    const noteCases = getNoteCasistiche(field.name)
    if (noteCases.length > 0) {
      return (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: ADMIN_NOTE_CASES_COLUMN, gap: 10, alignItems: 'start', width: '100%' }}>
            <NoteCasisticaSelect fieldName={field.name} disabled={readonly} onApply={text => onChange(real, text)} />
            <div style={{ minWidth: 0, width: '100%' }}>
              {label}
              <TextArea value={raw ?? ''} disabled={readonly} placeholder={field.placeholder} onChange={v => onChange(real, v || null)} />
            </div>
          </div>
        </div>
      )
    }
    control = <TextArea value={raw ?? ''} disabled={readonly} placeholder={field.placeholder} onChange={v => onChange(real, v || null)} />
  } else if (field.kind === 'date' || field.kind === 'readonly-date') {
    control = <input type='date' value={dateInputValue(raw)} disabled={readonly} onChange={e => onChange(real, fromDateInputValue(e.target.value))} onKeyDown={blurOnEnter} style={inputStyleFrom(st, readonly)} />
  } else if (field.kind === 'number') {
    control = <NumberInput value={raw} disabled={readonly} money={MONEY_FIELDS.has(field.name)} onChange={v => onChange(real, v)} />
  } else if (field.kind === 'domain') {
    const emptyOptionLabel = field.placeholder || '- Seleziona -'
    control = (
      <select value={raw ?? ''} disabled={readonly} onChange={e => onChange(real, e.target.value || null)} onKeyDown={blurOnEnter} style={inputStyleFrom(st, readonly)}>
        <option value=''>{emptyOptionLabel}</option>
        {effectiveOptions.map(o => <option key={String(o.code)} value={String(o.code)}>{o.name}</option>)}
      </select>
    )
  } else {
    control = <TextInput value={raw ?? ''} disabled={readonly} placeholder={field.placeholder} onChange={v => onChange(real, v || null)} />
  }

  return (
    <div style={{ gridColumn: field.full ? '1 / -1' : undefined }}>
      {label}
      {control}
    </div>
  )
}

function AdminFieldsLayout (props: {
  items: AdminField[]
  draft: Record<string, any>
  fields: LayerFieldInfo[]
  canEdit: boolean
  onChange: (name: string, value: any) => void
}) {
  const rows: React.ReactNode[] = []
  let compact: AdminField[] = []

  const flushCompact = () => {
    if (!compact.length) return
    const key = `compact-${rows.length}`
    const fields = compact
    compact = []
    rows.push(
      <div key={key} style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', alignItems: 'start', gap: 12 }}>
        {fields.map(f => <FieldEditor key={f.name} field={f} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />)}
      </div>
    )
  }

  props.items.forEach(f => {
    if (f.full || f.kind === 'textarea') {
      flushCompact()
      rows.push(
        <FieldEditor key={f.name} field={f} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
      )
    } else {
      compact.push(f)
    }
  })
  flushCompact()

  return <div style={{ display: 'grid', gap: 12, width: '100%' }}>{rows}</div>
}

function AdminFormSection (props: {
  title: string
  group: AdminField['group']
  draft: Record<string, any>
  fields: LayerFieldInfo[]
  canEdit: boolean
  onChange: (name: string, value: any) => void
  fieldNames?: string[]
  children?: React.ReactNode
}) {
  const wanted = Array.isArray(props.fieldNames) && props.fieldNames.length ? new Set(props.fieldNames.map(String)) : null
  const items = ADMIN_FIELDS.filter(f => f.group === props.group && (!wanted || wanted.has(f.name)))
  return (
    <Section title={props.title}>
      <AdminFieldsLayout items={items} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
      {props.children}
    </Section>
  )
}

function AdminFieldsGrid (props: {
  group: AdminField['group']
  draft: Record<string, any>
  fields: LayerFieldInfo[]
  canEdit: boolean
  onChange: (name: string, value: any) => void
  fieldNames?: string[]
}) {
  const wanted = Array.isArray(props.fieldNames) && props.fieldNames.length ? new Set(props.fieldNames.map(String)) : null
  const items = ADMIN_FIELDS.filter(f => f.group === props.group && (!wanted || wanted.has(f.name)))
  return (
    <AdminFieldsLayout items={items} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
  )
}

function PaymentModeInfo (props: { mode: PaymentMode }) {
  const { mode } = props
  if (!mode) {
    return <div style={{ marginTop: 12 }}><InfoBox kind='warn'>Selezionare la modalità di pagamento per visualizzare i campi specifici.</InfoBox></div>
  }
  if (mode === 'PAGOPA') {
    return <div style={{ marginTop: 12 }}><InfoBox>Modalità selezionata: pagoPA. Per ora sono visibili IUV e codice avviso; il caricamento del PDF bollettino sarà gestito come fase dedicata.</InfoBox></div>
  }
  if (mode === 'BONIFICO') {
    return <div style={{ marginTop: 12 }}><InfoBox>Modalità selezionata: bonifico. Sono visibili solo i campi bancari.</InfoBox></div>
  }
  if (mode === 'MISTO') {
    return <div style={{ marginTop: 12 }}><InfoBox>Modalità selezionata: misto. Sono visibili sia i campi pagoPA sia i campi bonifico.</InfoBox></div>
  }
  return <div style={{ marginTop: 12 }}><InfoBox>Modalità selezionata: altro. È visibile il campo note pagamento.</InfoBox></div>
}

function changedAttrs (fields: LayerFieldInfo[], initial: Record<string, any>, draft: Record<string, any>): Record<string, any> {
  const attrs: Record<string, any> = {}
  for (const f of ADMIN_FIELDS) {
    const real = realFieldName(fields, f.name)
    if (!real) continue
    const before = pickAttrCI(initial, [real, f.name])
    const after = pickAttrCI(draft, [real, f.name])
    const b = before == null || before === '' ? null : before
    const a = after == null || after === '' ? null : after
    if (String(b ?? '') !== String(a ?? '')) attrs[real] = a
  }
  return attrs
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...asJs(props.config) }
  const useDs: any[] = asJs(props.useDataSources) || []
  const [states, setStates] = React.useState<Record<string, SelectedState>>({})
  const [intentState, setIntentState] = React.useState<SelectedState>(() => {
    const editIntent = readEditIntent()
    if (editIntent) return selectionStateFromIntent(editIntent, 'editIntent')
    return selectionStateFromIntent(readSelectionIntent(), 'selection')
  })
  const [profile, setProfile] = React.useState(() => readUserProfile())
  const [layerFields, setLayerFields] = React.useState<LayerFieldInfo[]>([])
  const [draft, setDraft] = React.useState<Record<string, any>>({})
  const [initialDraft, setInitialDraft] = React.useState<Record<string, any>>({})
  const [automaticValues, setAutomaticValues] = React.useState<Record<string, any>>({})
  const [saving, setSaving] = React.useState(false)
  const [dialog, setDialog] = React.useState<{ kind: 'ok' | 'err' | 'warn', title: string, text: string } | null>(null)
  const [verbalePreviewOpen, setVerbalePreviewOpen] = React.useState(false)
  const [verbalePreviewLoading, setVerbalePreviewLoading] = React.useState(false)
  const [verbalePreviewError, setVerbalePreviewError] = React.useState<string | null>(null)
  const [verbalePreviewUrl, setVerbalePreviewUrl] = React.useState<string | null>(null)
  const [verbalePreviewFileName, setVerbalePreviewFileName] = React.useState('proposta-contestazione.pdf')
  const [activeAmmSection, setActiveAmmSection] = React.useState<AmmSectionKey>(AMM_DEFAULT_SECTION)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [pageVisible, setPageVisible] = React.useState(false)

  React.useEffect(() => {
    const check = () => {
      const el = rootRef.current
      const visible = !!(el && el.offsetWidth > 0 && el.offsetHeight > 0)
      setPageVisible(prev => prev === visible ? prev : visible)
    }
    const id = window.setInterval(check, 300)
    check()
    return () => window.clearInterval(id)
  }, [])

  React.useEffect(() => {
    return () => { revokePdfUrl(verbalePreviewUrl) }
  }, [verbalePreviewUrl])

  React.useEffect(() => {
    if (!pageVisible) return
    if (!VALID_AMM_SECTIONS.has(activeAmmSection)) return
    persistAmmSection(activeAmmSection)
    broadcastAmmSection(activeAmmSection)
  }, [pageVisible, activeAmmSection])

  React.useEffect(() => {
    const sync = () => {
      const editIntent = readEditIntent()
      if (editIntent) setIntentState(selectionStateFromIntent(editIntent, 'editIntent'))
      else setIntentState(selectionStateFromIntent(readSelectionIntent(), 'selection'))
      setProfile(readUserProfile())
    }
    sync()
    window.addEventListener('gii-edit-intent-changed', sync as EventListener)
    window.addEventListener('gii-selection-changed', sync as EventListener)
    window.addEventListener('gii:userLoaded', sync as EventListener)
    window.addEventListener('focus', sync as EventListener)
    return () => {
      window.removeEventListener('gii-edit-intent-changed', sync as EventListener)
      window.removeEventListener('gii-selection-changed', sync as EventListener)
      window.removeEventListener('gii:userLoaded', sync as EventListener)
      window.removeEventListener('focus', sync as EventListener)
    }
  }, [])

  React.useEffect(() => {
    const applyRequestedSection = (forcedSection?: any) => {
      const requested = getRequestedAmmSection(forcedSection)
      if (!requested) return
      persistAmmSection(requested)
      setActiveAmmSection(prev => prev === requested ? prev : requested)
    }
    const onExternalSectionChange = (evt: any) => applyRequestedSection(evt?.detail?.section)
    const onUrlChange = () => applyRequestedSection()
    applyRequestedSection()
    window.addEventListener('hashchange', onUrlChange)
    window.addEventListener('popstate', onUrlChange)
    window.addEventListener('gii:edit-section-change', onExternalSectionChange as EventListener)
    window.addEventListener('focus', onUrlChange as EventListener)
    return () => {
      window.removeEventListener('hashchange', onUrlChange)
      window.removeEventListener('popstate', onUrlChange)
      window.removeEventListener('gii:edit-section-change', onExternalSectionChange as EventListener)
      window.removeEventListener('focus', onUrlChange as EventListener)
    }
  }, [])

  const onDsUpdate = React.useCallback((dsKey: string, state: SelectedState) => {
    setStates(prev => ({ ...prev, [dsKey]: state }))
  }, [])

  const dsStatesAll = Object.values(states || {}).filter(s => !!s?.ds)
  const dsStatesWithSelection = dsStatesAll.filter(s => s?.oid != null && s?.data)
  const configuredDsState = dsStatesAll[0] || null
  const configuredDs = configuredDsState?.ds || null

  // La pratica da mostrare arriva prima di tutto dall'intent impostato da gii-azioni.
  // La fonte dati usata per salvare deve invece essere solo quella collegata esplicitamente in Builder.
  const activeSelection = (intentState?.oid != null || intentState?.data) ? intentState : (dsStatesWithSelection[0] || null)
  const active = activeSelection ? { ...activeSelection, ds: activeSelection.ds || configuredDs } : (configuredDsState || null)
  const data = activeSelection?.data || null
  const oid = activeSelection?.oid ?? (data ? pickOidFromData(data, activeSelection?.idFieldName || 'OBJECTID') : null)
  const hasSelection = !!data || (oid != null && Number.isFinite(Number(oid)))
  const roleAllowed = isAllowedAdminRole(profile.role)
  const title = buildPracticeTitle(cfg, data || {}, oid)
  const titleParts = buildPracticeTitleParts(data || {}, oid)
  const hasDsForSave = !!configuredDs
  const currentRole = String(profile.role || '').toUpperCase()
  const canEdit = roleAllowed && ['TI_AMM', 'ADMIN'].includes(currentRole) && hasDsForSave
  const canEditAttoNotes = canEdit
  const sanzioniConsultive = useSanzioneConsultivaState(cfg, data || {}, layerFields)
  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      const ds = active?.ds
      if (!ds) {
        if (!cancelled) setLayerFields([])
        return
      }
      const f = await readLayerFields(ds)
      if (!cancelled) setLayerFields(f)
    }
    load()
    return () => { cancelled = true }
  }, [active?.ds, active?.layerUrl])

  React.useEffect(() => {
    const base = data || {}
    const requestedSection = getRequestedAmmSection()
    const nextSection = requestedSection || AMM_DEFAULT_SECTION
    setDraft({ ...base })
    setInitialDraft({ ...base })
    setAutomaticValues({})
    setActiveAmmSection(nextSection)
    persistAmmSection(nextSection)
    broadcastAmmSection(nextSection)
    clearExplicitAmmSectionRequest()
  }, [active?.sig])

  React.useEffect(() => {
    if (!hasSelection || sanzioniConsultive.loading || sanzioniConsultive.error) {
      setAutomaticValues({})
      return
    }
    const base = { ...(data || {}), ...(draft || {}) }
    const calculated = buildAutomaticSanzioneCalculation(sanzioniConsultive.groups || [], data || base || {}, layerFields, profile, base)
    const automaticAtto = buildAutomaticAttoAmministrativo({ ...(data || {}), ...base, ...calculated })
    const next: Record<string, any> = {}
    Object.entries({ ...calculated, ...automaticAtto }).forEach(([name, value]) => {
      if (isSystemCalculatedAdminField(name)) next[name] = value
    })
    setAutomaticValues(next)
  }, [hasSelection, sanzioniConsultive.loading, sanzioniConsultive.error, sanzioniConsultive.groups, data, draft, layerFields, profile])

  const viewData = React.useMemo(() => ({ ...(draft || data || {}), ...automaticValues }), [draft, data, automaticValues])
  const headerVerbaleDefinitivo = isVerbaleDefinitivo(viewData || {})
  const headerHasVerbale = tipoAttoAmmPrevedeVerbale(viewData || {})
  const verbaleNotificato = isVerbaleNotificato(viewData || {})
  const canEditPostApproval = canEdit && headerVerbaleDefinitivo
  const canEditPostNotification = canEdit && headerVerbaleDefinitivo && verbaleNotificato

  const onFieldChange = React.useCallback((name: string, value: any) => {
    setDraft(prev => ({ ...(prev || {}), [name]: value }))
  }, [])

  const pendingAttrs = React.useMemo(() => changedAttrs(layerFields, initialDraft, draft), [layerFields, initialDraft, draft])
  const isDirty = Object.keys(pendingAttrs).length > 0

  const logLayerRef = React.useRef<any | null>(null)

  const getLogLayer = React.useCallback(async () => {
    if (logLayerRef.current) return logLayerRef.current
    try {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const fl = new FeatureLayer({ url: LOG_EVENTI_CICLI_URL, outFields: ['*'] })
      if (typeof fl?.load === 'function') { try { await fl.load() } catch {} }
      logLayerRef.current = fl
      return fl
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Layer log non disponibile:', e)
      return null
    }
  }, [])

  const findOpenAmmCycle = React.useCallback(async (parentGlobalId: string, roleForLog: string) => {
    const logLayer = await getLogLayer()
    if (!parentGlobalId || !roleForLog || !logLayer?.queryFeatures) return null
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `(${parentGlobalIdWhereForLog(parentGlobalId)}) AND ruolo_competente = ${sqlQuote(roleForLog)} AND stato_record = 'APERTO'`
    q.outFields = ['*']
    q.returnGeometry = false
    q.num = 1
    const oidField = String(logLayer.objectIdField || 'OBJECTID')
    q.orderByFields = ['numero_ciclo_ruolo DESC', `${oidField} DESC`]
    const res = await logLayer.queryFeatures(q)
    return res?.features?.[0] || null
  }, [getLogLayer])

  const getNextAmmCycleNumber = React.useCallback(async (parentGlobalId: string, roleForLog: string): Promise<number> => {
    const logLayer = await getLogLayer()
    if (!parentGlobalId || !roleForLog || !logLayer?.queryFeatures) return 1
    const q = logLayer.createQuery ? logLayer.createQuery() : {}
    q.where = `(${parentGlobalIdWhereForLog(parentGlobalId)}) AND ruolo_competente = ${sqlQuote(roleForLog)}`
    q.outFields = ['numero_ciclo_ruolo']
    q.returnGeometry = false
    q.num = 1
    const oidField = String(logLayer.objectIdField || 'OBJECTID')
    q.orderByFields = ['numero_ciclo_ruolo DESC', `${oidField} DESC`]
    try {
      const res = await logLayer.queryFeatures(q)
      const lastNum = Number(res?.features?.[0]?.attributes?.numero_ciclo_ruolo || 0)
      return Number.isFinite(lastNum) && lastNum > 0 ? lastNum + 1 : 1
    } catch {
      return 1
    }
  }, [getLogLayer])

  const upsertAmmCycleAudit = React.useCallback(async (prevAttrs: Record<string, any>, nextAttrs: Record<string, any>, changedFieldNames: string[]) => {
    const roleForLog = String(profile.role || '').trim().toUpperCase()
    if (roleForLog !== 'TI_AMM' && roleForLog !== 'RI_AMM') return 0

    const parentGlobalId = String(
      pickAttrCI(nextAttrs, ['GlobalID', 'globalid', 'GLOBALID']) ||
      pickAttrCI(prevAttrs, ['GlobalID', 'globalid', 'GLOBALID']) ||
      pickAttrCI(data, ['GlobalID', 'globalid', 'GLOBALID']) ||
      ''
    ).trim()
    if (!parentGlobalId || oid == null) {
      console.warn('[GII_LOG_EVENTI_CICLI] Audit amministrativo saltato: parent_globalid non disponibile.', { roleForLog, oid })
      return 0
    }

    const delta = buildAuditDeltaMaps(prevAttrs, nextAttrs, changedFieldNames)
    if (Object.keys(delta.oldMap).length === 0) return 0

    const logLayer = await getLogLayer()
    if (!logLayer?.applyEdits) return 0

    const username = String(profile.username || '').trim()
    const sessionId = `${roleForLog.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    let openFeature = await findOpenAmmCycle(parentGlobalId, roleForLog)
    if (!openFeature?.attributes) {
      const nextNum = await getNextAmmCycleNumber(parentGlobalId, roleForLog)
      const addAttrs = filterAttrsForLayer({
        parent_globalid: parentGlobalId,
        parent_objectid: oid,
        numero_ciclo_ruolo: nextNum,
        ruolo_competente: roleForLog,
        utente_operatore: username,
        stato_record: 'APERTO',
        evento_apertura: 'PRESA_IN_CARICO',
        dt_apertura: Date.now(),
        area: 'AMM',
        settore: '',
        fase: roleForLog,
        session_id: sessionId,
        num_campi_modificati: 0,
        campi_modificati: '',
        valori_prima_json: '',
        valori_dopo_json: '',
        riepilogo_ciclo: ''
      }, (logLayer.fields || []).map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false })))
      try {
        const addRes = await logLayer.applyEdits({ addFeatures: [{ attributes: addAttrs }] })
        const add = addRes?.addFeatureResults?.[0] || addRes?.addResults?.[0] || null
        if (add?.error) throw new Error(add.error.message || JSON.stringify(add.error))
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Errore creazione ciclo audit amministrativo:', e)
      }
      openFeature = await findOpenAmmCycle(parentGlobalId, roleForLog)
    }

    if (!openFeature?.attributes) return 0
    const attrs = openFeature.attributes || {}
    const existingOld = parseJsonObject(attrs.valori_prima_json)
    const existingNew = parseJsonObject(attrs.valori_dopo_json)
    const merged = mergeAuditCycleMaps(existingOld, existingNew, delta.oldMap, delta.newMap)
    const num = merged.fields.length
    const logFields = (logLayer.fields || []).map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
    const updAttrs = filterAttrsForLayer({
      [String(logLayer.objectIdField || 'OBJECTID')]: getLogObjectIdValue(attrs, logLayer),
      utente_operatore: username || attrs.utente_operatore || '',
      area: 'AMM',
      settore: attrs.settore || '',
      session_id: sessionId,
      num_campi_modificati: num,
      campi_modificati: merged.fields.join(', '),
      valori_prima_json: num > 0 ? JSON.stringify(merged.oldMap) : '',
      valori_dopo_json: num > 0 ? JSON.stringify(merged.newMap) : ''
    }, logFields)
    try {
      const updRes = await logLayer.applyEdits({ updateFeatures: [{ attributes: updAttrs }] })
      const upd = updRes?.updateFeatureResults?.[0] || updRes?.updateResults?.[0] || null
      if (upd?.error) throw new Error(upd.error.message || JSON.stringify(upd.error))
      try { window.dispatchEvent(new CustomEvent('gii-log-eventi-cicli-changed', { detail: { source: 'gii-editing-amm', oid, role: roleForLog, ts: Date.now() } })) } catch {}
      return num
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Errore aggiornamento audit ciclo amministrativo:', e)
      return 0
    }
  }, [data, findOpenAmmCycle, getLogLayer, getNextAmmCycleNumber, oid, profile.role, profile.username])

  const handleReset = () => {
    setDraft({ ...(initialDraft || {}) })
  }


  const getCompletionIssues = React.useCallback((source: Record<string, any>): string[] => {
    const current = source || {}
    const issues: string[] = []
    if (!isVerbaleDefinitivo(current)) issues.push(tipoAttoAmmPrevedeVerbale(current)
      ? 'Proposta: verbale non ancora definitivo; numero e data saranno assegnati dopo l’approvazione del Direttore d’Area.'
      : 'Proposta: documento non ancora definitivo; è necessaria l’approvazione del Direttore d’Area.')
    if (!hasAdminValue(pickAttrCI(current, ['note_atto_amm']))) issues.push('Attestazione di conformità: attestazione non ancora acquisita.')
    const protocolloNumero = pickAttrCI(current, ['protocollo_verbale_numero'])
    const protocolloData = pickAttrCI(current, ['protocollo_verbale_data'])
    const notificaTipo = pickAttrCI(current, ['notifica_tipo'])
    const notificaData = pickAttrCI(current, ['notifica_data'])
    const notificaEsito = notificaEsitoCode(current)
    const notificaEstremi = pickAttrCI(current, ['notifica_estremi'])

    if (!hasAdminValue(protocolloNumero)) issues.push('Protocollo: indicare il numero di protocollo dell’atto.')
    if (!hasAdminValue(protocolloData)) issues.push('Protocollo: indicare la data di protocollo dell’atto.')

    if (!notificaEsito) {
      issues.push('Notifica: indicare l’esito della notifica.')
    } else if (notificaEsito === 'DA_NOTIFICARE') {
      issues.push('Notifica: l’atto risulta ancora da notificare.')
    } else {
      if (!hasAdminValue(notificaTipo)) issues.push('Notifica: indicare il tipo di notifica.')
      if (!hasAdminValue(notificaData)) issues.push('Notifica: indicare la data della notifica o del tentativo effettuato.')
      if (!hasAdminValue(notificaEstremi)) issues.push('Notifica: indicare gli estremi della notifica o del tentativo effettuato.')
      if (isNotificaDaRipetere(current)) issues.push('Notifica: la notifica non risulta perfezionata e deve essere ripetuta.')
      if (notificaEsito === 'ALTRO') issues.push('Notifica: registrare un esito conclusivo per proseguire con la fase post-notifica.')
    }

    const approvalMs = dateMsOrNull(verbaleApprovalDateValue(current))
    const protocolloMs = dateMsOrNull(protocolloData)
    const notificaMs = dateMsOrNull(notificaData)
    if (approvalMs != null && protocolloMs != null && protocolloMs < approvalMs) issues.push('Protocollo: la data non può precedere l’approvazione dell’atto.')
    if (protocolloMs != null && notificaMs != null && notificaMs < protocolloMs) issues.push('Notifica: la data non può precedere la data di protocollo dell’atto.')
    const totale = parseNumberInput(pickAttrCI(current, ['pagamento_importo_totale'])) || 0
    if (totale > 0) {
      const mode = getPaymentMode(current, layerFields)
      if (!mode) issues.push('Pagamento: indicare la modalità di pagamento.')
      if (!hasAdminValue(pickAttrCI(current, ['pagamento_scadenza']))) issues.push('Pagamento: indicare la scadenza pagamento.')
      if (!hasAdminValue(pickAttrCI(current, ['pagamento_stato']))) issues.push('Pagamento: indicare lo stato pagamento.')
      if (mode === 'PAGOPA' || mode === 'MISTO') {
        if (!hasAdminValue(pickAttrCI(current, ['pagopa_iuv']))) issues.push('Pagamento: indicare l’IUV pagoPA.')
        if (!hasAdminValue(pickAttrCI(current, ['pagopa_codice_avviso']))) issues.push('Pagamento: indicare il codice avviso pagoPA.')
      }
      if (mode === 'BONIFICO' || mode === 'MISTO') {
        if (!hasAdminValue(pickAttrCI(current, ['bonifico_iban_snapshot']))) issues.push('Pagamento: indicare l’IBAN bonifico.')
        if (!hasAdminValue(pickAttrCI(current, ['bonifico_intestatario_snapshot']))) issues.push('Pagamento: indicare l’intestatario conto bonifico.')
        if (!hasAdminValue(pickAttrCI(current, ['bonifico_causale']))) issues.push('Pagamento: indicare la causale bonifico.')
      }
      if (mode === 'ALTRO' && !hasAdminValue(pickAttrCI(current, ['pagamento_note']))) issues.push('Pagamento: compilare le note pagamento per la modalità Altro.')

      const paymentStatus = paymentStatusCode(current)
      const paid = Math.max(0, parseNumberInput(pickAttrCI(current, ['pagamento_importo_incassato'])) || 0)
      const incassoData = pickAttrCI(current, ['pagamento_data_incasso'])
      const incassoEstremi = pickAttrCI(current, ['pagamento_estremi_incasso'])
      const hasAnyIncasso = paid > 0 || hasAdminValue(incassoData) || hasAdminValue(incassoEstremi)
      if (hasAnyIncasso) {
        if (!(paid > 0)) issues.push('Pagamento: indicare l’importo incassato.')
        if (!hasAdminValue(incassoData)) issues.push('Pagamento: indicare la data dell’incasso.')
        if (!hasAdminValue(incassoEstremi)) issues.push('Pagamento: indicare gli estremi dell’incasso.')
      }
      if (paid > totale + 0.005) issues.push('Pagamento: l’importo incassato supera il totale dovuto.')
      if (paymentStatus === 'PAGATO' && paid < totale - 0.005) issues.push('Pagamento: lo stato Pagato richiede l’incasso integrale.')
      if (paymentStatus === 'PARZIALE' && !(paid > 0 && paid < totale - 0.005)) issues.push('Pagamento: lo stato Pagato parzialmente richiede un importo incassato inferiore al totale dovuto.')
      if (paymentStatus === 'NOTIFICATO' && !isNotificaPerfezionata(current)) issues.push('Pagamento: lo stato Notificato richiede una notifica perfezionata.')
      const paymentDeadlineMs = dateMsOrNull(pickAttrCI(current, ['pagamento_scadenza']))
      if (notificaMs != null && paymentDeadlineMs != null && paymentDeadlineMs < notificaMs) issues.push('Pagamento: la scadenza non può precedere la data di notifica.')
      if (paymentStatus === 'SCADUTO' && paymentDeadlineMs != null && paymentDeadlineMs >= new Date().setHours(0, 0, 0, 0)) issues.push('Pagamento: lo stato Scaduto non è coerente con la scadenza indicata.')
    }
    return issues
  }, [layerFields])

  const completionIssues = React.useMemo(() => getCompletionIssues(viewData || {}), [getCompletionIssues, viewData])

  const fillCloseMeta = () => {
    if (!canEdit) return
    const current = { ...(draft || data || {}), ...automaticValues }
    const issues = getCompletionIssues(current)
    if (issues.length) {
      setDialog({ kind: 'warn', title: 'Campi obbligatori mancanti', text: `Non è possibile chiudere l’istruttoria amministrativa. Completare i seguenti campi:\n- ${issues.join('\n- ')}` })
      return
    }
    const now = Date.now()
    const closeMeta = {
      istruttoria_amm_chiusa_il: now,
      istruttoria_amm_chiusa_da: profile.fullName || profile.username || ''
    }
    setDraft(prev => ({
      ...(prev || {}),
      ...closeMeta
    }))
  }

  const handleVerbaleDownload = React.useCallback(() => {
    const base = { ...(draft || data || {}), ...automaticValues }
    if (!hasSelection || !base) return
    const stamp = buildVerbalePdfGenerationMeta(profile)
    const source = { ...base, ...stamp }
    ;(async () => {
      try {
        const { blob, fileName } = await buildVerbalePdfBlob(source, layerFields, profile)
        downloadBlobFile(blob, fileName)
        setDialog({ kind: 'ok', title: 'PDF dell’atto generato', text: 'Il PDF è stato scaricato.' })
      } catch (e: any) {
        setDialog({ kind: 'err', title: 'Errore PDF dell’atto', text: e?.message || String(e) })
      }
    })()
  }, [automaticValues, canEdit, data, draft, hasSelection, layerFields, profile])

  const handleVerbalePreview = React.useCallback(() => {
    const source = { ...(draft || data || {}), ...automaticValues }
    if (!hasSelection || !source) return
    setVerbalePreviewOpen(true)
    setVerbalePreviewLoading(true)
    setVerbalePreviewError(null)
    ;(async () => {
      try {
        const { blob, fileName } = await buildVerbalePdfBlob(source, layerFields, profile)
        const url = makePdfUrl(blob, fileName)
        setVerbalePreviewFileName(fileName)
        setVerbalePreviewUrl(prev => {
          revokePdfUrl(prev)
          return url
        })
      } catch (e: any) {
        setVerbalePreviewError(e?.message || String(e))
      } finally {
        setVerbalePreviewLoading(false)
      }
    })()
  }, [automaticValues, data, draft, hasSelection, layerFields, profile])

  const closeVerbalePreview = React.useCallback(() => {
    setVerbalePreviewOpen(false)
    setVerbalePreviewLoading(false)
    setVerbalePreviewError(null)
  }, [])

  const handleSave = async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di salvare.' })
      return
    }
    if (!active?.ds) {
      setDialog({ kind: 'err', title: 'Fonte dati non disponibile', text: 'Collegare al widget la vista amministrativa in Builder prima di salvare.' })
      return
    }
    if (!roleAllowed) {
      setDialog({ kind: 'err', title: 'Profilo non abilitato', text: 'Il profilo rilevato non è abilitato alla fase amministrativa.' })
      return
    }
    if (!canEdit) {
      setDialog({ kind: 'warn', title: 'Scheda in sola lettura', text: 'Il profilo corrente può consultare la scheda, ma non modificarla.' })
      return
    }
    const attrs = changedAttrs(layerFields, initialDraft, draft)
    Object.entries(automaticValues || {}).forEach(([name, value]) => {
      if (name === 'numero_verbale' || name === 'data_verbale') return
      const real = realFieldName(layerFields, name)
      if (!real) return
      const before = pickAttrCI(initialDraft, [real, name])
      if (!sameDraftValue(before, value, name)) attrs[real] = value == null || value === '' ? null : value
    })
    if (!Object.keys(attrs).length) {
      setDialog({ kind: 'warn', title: 'Nessuna modifica', text: 'Non risultano modifiche da salvare.' })
      return
    }

    setSaving(true)
    try {
      const layer = await resolveLayerForEdit(active.ds, active.layerUrl || configuredDsState?.layerUrl || getDataSourceUrl(configuredDs))
      if (!layer?.applyEdits) throw new Error('Layer non disponibile per applyEdits. Verificare che la vista amministrativa collegata al widget abbia un URL FeatureServer valido e consenta l’editing.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch { } }
      const fields = layer?.fields?.length ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false })) : layerFields
      const idName = realFieldName(fields, active.idFieldName) || active.idFieldName || 'OBJECTID'
      let prevRecordAttrs = { ...(initialDraft || {}) }
      try {
        const liveAttrs = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (liveAttrs && Object.keys(liveAttrs).length) prevRecordAttrs = liveAttrs
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Impossibile rileggere il record amministrativo prima del salvataggio:', e)
      }
      const cleanAttrs = filterAttrsForLayer({ [idName]: Number(oid), ...attrs }, fields)
      const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
      const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
      const err = upd?.error
      const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
      if (!ok) {
        const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
        throw new Error(detail)
      }
      await upsertAmmCycleAudit(prevRecordAttrs, { ...prevRecordAttrs, ...attrs }, Object.keys(attrs))
      await refreshDs(active.ds)
      const next = { ...(initialDraft || {}), ...attrs }
      setInitialDraft(next)
      setDraft(next)
      setDialog({ kind: 'ok', title: 'Bozza salvata', text: 'Dati amministrativi salvati.' })
      try {
        window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm' } }))
      } catch { }
    } catch (e: any) {
      setDialog({ kind: 'err', title: 'Errore salvataggio', text: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }

  const handleCloseAdmin = React.useCallback(() => {
    if (saving || isDirty) return
    try { delete (window as any).__giiEdit } catch { try { ;(window as any).__giiEdit = null } catch {} }
    try { sessionStorage.removeItem('GII_EDIT_INTENT') } catch {}
    const elencoPageId = resolvePageId('page_3') || resolvePageId('Elenco pratiche') || resolvePageId('Elenco Rapporti') || resolvePageId('elenco-pratiche') || resolvePageId('elenco-rapporti') || resolvePageId('Elenco')
    try {
      if (elencoPageId) {
        UrlManager.getInstance().changePage(elencoPageId)
        return
      }
    } catch {}
    try { window.history.back() } catch {}
  }, [saving, isDirty])

  const adminStyle = React.useMemo(() => {
    const merged: Record<string, any> = { ...ADMIN_STYLE_DEFAULTS, ...cfg }
    return {
      ...merged,
      formLabelFontSize: adminLabelFontSize(merged),
      formFieldFontSize: adminFieldFontSize(merged),
      formInnerHeaderFontSize: adminInnerHeaderFontSize(merged),
      formCardHeaderFontSize: Math.max(14, Number(merged.formCardHeaderFontSize ?? 14) || 14),
      titleFontSize: Math.max(18, Number(merged.titleFontSize ?? 18) || 18),
      subtitleFontSize: Math.max(15, Number(merged.subtitleFontSize ?? 15) || 15),
      msgFontSize: Math.max(15, Number(merged.msgFontSize ?? 15) || 15),
      valueFontSize: adminFieldFontSize(merged)
    }
  }, [cfg])

  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    boxSizing: 'border-box',
    background: String(adminStyle.maskBg || '#eef4fb'),
    border: `${Number(adminStyle.maskBorderWidth ?? 1)}px solid ${adminStyle.maskBorderColor || '#cbd8e6'}`,
    borderRadius: Number(adminStyle.maskBorderRadius ?? 10),
    padding: Number(adminStyle.maskInnerPadding ?? 12),
    overflow: 'hidden',
    color: '#111827',
    fontFamily: 'inherit',
    fontSize: Number(adminStyle.formFieldFontSize ?? 15),
    position: 'relative',
    zIndex: hasSelection ? 1001 : 'auto'
  }

  // Stesso schema del gii-editing-ti:
  // - contenitore tab = flex child a tutta altezza disponibile;
  // - schede ordinarie = scroll verticale interno;
  // - schede full-height, come Anteprima e Allegati = nessuno scroll generale, layout interno a tutta altezza.
  const baseTabContentStyle: React.CSSProperties = {
    flex: '1 1 auto',
    minHeight: 0
  }

  const activeContentStyle: React.CSSProperties = (activeAmmSection === 'anteprima' || activeAmmSection === 'allegati')
    ? {
        ...baseTabContentStyle,
        overflow: 'hidden',
        padding: 0
      }
    : {
        ...baseTabContentStyle,
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'contain',
        scrollbarGutter: 'stable',
        padding: '12px 2px 2px 2px'
      }

  const editBtnBase: React.CSSProperties = {
    padding: '7px 16px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 700,
    fontSize: adminFieldFontSize(adminStyle),
    cursor: saving ? 'not-allowed' : 'pointer'
  }
  const saveDisabled = saving || !isDirty || !canEdit
  const cancelDisabled = saving || !isDirty
  const closeDisabled = saving || isDirty

  const verbalePreviewModal = verbalePreviewOpen ? createPortal(
    <div
      data-gii-global-popup-root='1'
      style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(0,0,0,0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, pointerEvents: 'auto' }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <div
        role='dialog'
        aria-modal='true'
        data-gii-global-popup-dialog='1'
        style={{ width: 'calc(100vw - 28px)', height: 'calc(100vh - 28px)', maxWidth: 1920, maxHeight: 1200, borderRadius: 14, boxShadow: '0 20px 70px rgba(0,0,0,0.32)', overflow: 'hidden', position: 'relative', zIndex: 2147483647 }}
        onClick={(e) => { e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
      >
        <AnteprimaPdfViewer
          url={verbalePreviewUrl}
          fileName={verbalePreviewFileName}
          title='Anteprima proposta di contestazione'
          subtitle={verbalePreviewFileName}
          loading={verbalePreviewLoading}
          error={verbalePreviewError}
          emptyText='Nessun dato disponibile per l&apos;anteprima della proposta.'
          onDownload={handleVerbaleDownload}
          onClose={closeVerbalePreview}
        />
      </div>
    </div>,
    document.body
  ) : null

  return (
    <AdminStyleCtx.Provider value={adminStyle}>
    <div ref={rootRef} data-gii-editing-amm-root='1' style={wrapperStyle}>
      {useDs.map((uds: any, idx: number) => {
        const dsKey = String(uds?.dataSourceId || uds?.mainDataSourceId || `ds_${idx}`)
        return <DataSourceSelectionBridge key={dsKey} widgetId={props.id} uds={uds} dsKey={dsKey} onUpdate={onDsUpdate} />
      })}

      {dialog && <BlockingDialog kind={dialog.kind} title={dialog.title} text={dialog.text} onClose={() => setDialog(null)} />}
      {verbalePreviewModal}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '8px 0', borderBottom: `1px solid ${cfg.dividerColor || '#cbd8e6'}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: Number(adminStyle.titleFontSize || 18), fontWeight: Number(cfg.titleFontWeight || 700) as any, color: '#111827', lineHeight: 1.25 }}>
              {hasSelection ? (<>{titleParts.prefix}<span style={{ color: '#2563eb', fontWeight: Number(cfg.titleFontWeight || 700) as any }}>{titleParts.reportCode}</span></>) : 'Istruttoria amministrativa'}
            </div>
            {hasSelection && !headerVerbaleDefinitivo && (
              <div style={{ marginTop: 3, color: '#b42318', fontSize: adminLabelFontSize(adminStyle), fontWeight: 850, lineHeight: 1.3 }}>
                {headerHasVerbale ? 'Numero e data saranno assegnati dopo l’approvazione del Direttore d’Area.' : 'Il documento diventerà definitivo dopo l’approvazione del Direttore d’Area.'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type='button' disabled={saveDisabled} onClick={handleSave}
              style={{
                ...editBtnBase,
                border: '1px solid rgba(0,0,0,0.18)',
                background: saveDisabled ? '#e5e7eb' : '#1a7f37',
                color: saveDisabled ? '#9ca3af' : '#fff',
                cursor: saveDisabled ? 'not-allowed' : 'pointer'
              }}>
              {saving ? 'Salvataggio bozza…' : 'Salva bozza'}
            </button>
            <button type='button' disabled={cancelDisabled} onClick={handleReset}
              style={{
                ...editBtnBase,
                border: '1px solid rgba(0,0,0,0.24)',
                background: cancelDisabled ? '#e5e7eb' : '#d92d20',
                color: cancelDisabled ? '#9ca3af' : '#fff',
                cursor: cancelDisabled ? 'not-allowed' : 'pointer'
              }}>
              Annulla
            </button>
            <button type='button' disabled={closeDisabled} onClick={handleCloseAdmin}
              title={isDirty ? 'Salvare o annullare le modifiche prima di chiudere.' : undefined}
              style={{
                ...editBtnBase,
                border: '1px solid rgba(0,0,0,0.24)',
                background: closeDisabled ? '#e5e7eb' : '#1d4ed8',
                color: closeDisabled ? '#9ca3af' : '#fff',
                cursor: closeDisabled ? 'not-allowed' : 'pointer'
              }}>
              Chiudi
            </button>
          </div>
        </div>

        <div style={activeContentStyle}>

        {!roleAllowed && (
          <InfoBox kind='warn'>
            Questo widget è destinato alla fase amministrativa. Il profilo rilevato non è TI_AMM, RI_AMM, DA o ADMIN.
          </InfoBox>
        )}

        {!hasSelection && (
          <InfoBox kind='warn'>
            Nessuna pratica selezionata. Selezionare una pratica dall’elenco prima di aprire la scheda amministrativa.
          </InfoBox>
        )}

        {hasSelection && (
          <>
            <div style={{ display: 'grid', gap: Number(adminStyle.formSectionGap ?? 10), minHeight: (activeAmmSection === 'anteprima' || activeAmmSection === 'allegati') ? '100%' : undefined, height: (activeAmmSection === 'anteprima' || activeAmmSection === 'allegati') ? '100%' : undefined, alignContent: (activeAmmSection === 'anteprima' || activeAmmSection === 'allegati') ? 'stretch' : 'start' }} data-gii-editing-amm-section={activeAmmSection}>
              {activeAmmSection === 'trasgressore' && (
                <TrasgressoreAmmSection
                  data={viewData || {}}
                  fields={layerFields}
                  canEdit={canEdit}
                  onChange={onFieldChange}
                />
              )}

              {activeAmmSection === 'dati_generali' && (
                <DatiGeneraliAmmSection
                  title={title}
                  data={viewData || {}}
                  fields={layerFields}
                  profile={profile}
                  hasDsForSave={hasDsForSave}
                  summaryFields={Array.isArray(cfg.summaryFields) ? cfg.summaryFields : []}
                  labelSize={Number(cfg.labelFontSize || adminStyle.formLabelFontSize || 15)}
                  valueSize={Number(cfg.valueFontSize || adminStyle.formFieldFontSize || 15)}
                />
              )}

              {activeAmmSection === 'atto' && (
                <>
                  <SanzioniConsultiveSection loadState={sanzioniConsultive} data={viewData || {}} fields={layerFields} canEdit={false} onChange={onFieldChange} />

                  {!hasDsForSave && (
                    <InfoBox kind='warn'>
                      Fonte dati amministrativa non collegata. Collegare la vista amministrativa al widget in Builder per abilitare il salvataggio.
                    </InfoBox>
                  )}

                  {hasDsForSave && roleAllowed && !canEdit && (
                    <InfoBox kind='info'>
                      Scheda in sola lettura per il profilo corrente. La compilazione è abilitata per TI_AMM e ADMIN.
                    </InfoBox>
                  )}

                  <AttestazioneConformitaSummary
                    data={viewData || {}}
                    fields={layerFields}
                  />
                </>
              )}

              {activeAmmSection === 'pagamento' && (
                <>
                  {!headerVerbaleDefinitivo && <PostApprovalLockedBox />}
                  <PagamentoGuidatoSection data={viewData || {}} fields={layerFields} canEdit={canEditPostApproval} canEditSpeseNotifica={canEditPostApproval} onChange={onFieldChange} />
                </>
              )}

              {activeAmmSection === 'notifica' && (
                <>
                  {!headerVerbaleDefinitivo && <PostApprovalLockedBox />}
                  <ProtocolloNotificaGuidataSection data={viewData || {}} fields={layerFields} canEdit={canEditPostApproval} onChange={onFieldChange} />
                  <ChiusuraIstruttoriaSummary data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} onFillClose={fillCloseMeta} completionIssues={completionIssues} />
                </>
              )}

              {activeAmmSection === 'ricorso' && (
                <>
                  {!canEditPostNotification && <PostNotificationLockedBox />}
                  <RicorsoPostNotificaSection data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} onChange={onFieldChange} />
                </>
              )}

              {activeAmmSection === 'cda' && (
                <>
                  {!canEditPostNotification && <PostNotificationLockedBox />}
                  <EsitoCdaSection data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} onChange={onFieldChange} />
                </>
              )}

              {activeAmmSection === 'riapertura' && (
                <>
                  {!canEditPostNotification && <PostNotificationLockedBox />}
                  <RiaperturaAmmSection data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} onChange={onFieldChange} role={profile.role} />
                </>
              )}

              {activeAmmSection === 'definizione' && (
                <>
                  {!canEditPostNotification && <PostNotificationLockedBox />}
                  <DefinizionePraticaSection data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} onChange={onFieldChange} />
                </>
              )}

              {activeAmmSection === 'allegati' && (
                <AllegatiAmmSection
                  oid={oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null}
                  ds={active?.ds}
                  layerUrl={active?.layerUrl || configuredDsState?.layerUrl || getDataSourceUrl(configuredDs)}
                  canEdit={canEdit}
                />
              )}

              {activeAmmSection === 'anteprima' && (
                <VerbaleInlinePreviewSection
                  data={viewData || {}}
                  fields={layerFields}
                  profile={profile}
                  hasSelection={hasSelection}
                />
              )}
            </div>

          </>
        )}
      </div>
      <DirtyNavigationLockOverlay active={pageVisible && hasSelection} targetRef={rootRef} />
    </div>
    </AdminStyleCtx.Provider>
  )
}

function primaryButtonStyle (disabled?: boolean): React.CSSProperties {
  return {
    border: '1px solid #0d3b66',
    background: disabled ? '#9ca3af' : '#0d3b66',
    color: '#fff',
    borderRadius: 9,
    padding: '8px 14px',
    fontWeight: 800,
    fontSize: 15,
    cursor: disabled ? 'not-allowed' : 'pointer'
  }
}

function secondaryButtonStyle (disabled?: boolean): React.CSSProperties {
  return {
    border: '1px solid #cbd5e1',
    background: disabled ? '#f3f4f6' : '#fff',
    color: disabled ? '#9ca3af' : '#0f172a',
    borderRadius: 9,
    padding: '8px 12px',
    fontWeight: 700,
    fontSize: 15,
    cursor: disabled ? 'not-allowed' : 'pointer'
  }
}

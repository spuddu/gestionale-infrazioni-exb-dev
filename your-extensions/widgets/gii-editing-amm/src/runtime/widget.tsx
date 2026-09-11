/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, DataSourceComponent, UrlManager, getAppStore } from 'jimu-core'
import { buildVerbalePdfBlob } from '../../../_shared/gii-anteprime/documenti-amministrativi/proposta-contestazione/proposta-contestazione-data-map'
import { replacePropostaContestazionePdfAttachment } from '../../../_shared/gii-anteprime/documenti-amministrativi/proposta-contestazione/proposta-contestazione-attachment-store'
import { buildBozzaDeterminazioneDocx, getBozzaDeterminazioneDocxFileName } from '../../../_shared/gii-anteprime/documenti-amministrativi/bozza-determinazione/bozza-determinazione-docx-builder'
import { buildBozzaDeterminazioneMap } from '../../../_shared/gii-anteprime/documenti-amministrativi/bozza-determinazione/bozza-determinazione-map'
import { ensureNsdJsonOnlyQueryFormat } from '../../../_shared/gii-anteprime/nsd-query-format-fix'
import GiiAnteprimaPanel from '../../../_shared/gii-anteprime/anteprima-panel'
import { buildFascicoloItems, type FascicoloPdfItem } from '../../../_shared/gii-anteprime/fascicolo-builder'
import { FASCICOLO_MAP_DEFAULTS, DEFAULT_PRINT_SERVICE_URL } from '../../../_shared/gii-anteprime/fascicolo-map-defaults'
import { computeReqPoint } from '../../../_shared/gii-anteprime/req-point'
import GiiAttachmentViewer, { GII_ATTACHMENT_KEYWORDS, getGiiAttachmentKind, filterGiiAttachmentsForAdministrativeFascicolo, isGiiApprovedBozzaReferenceAttachment, isGiiBozzaDeterminazionePdfAttachment, isGiiLegacyBozzaDeterminazioneWordAttachment, isGiiPropostaContestazionePdfAttachment, isGiiAttoContestazionePdfAttachment, isGiiProtocolloFascicoloManifestAttachment, isGiiProtocolloAttoManifestAttachment, isGiiProtocolloFascicoloPdfAttachment, giiAttachmentKeywordValue, pickLatestGiiAttachment } from '../../../_shared/gii-anteprime/allegati/gii-attachment-viewer'
import type { IMConfig, SummaryFieldConfig } from '../config'
import { defaultConfig } from '../config'
import { createPortal } from 'react-dom'
import { ensureAttivitaCorrentiJsonOnlyQueryFormat } from '../../../_shared/gii-alerts/attivita-correnti-query-format-fix'
import { isPracticeAssignedToCurrentIa } from '../../../_shared/gii-access/ia-assignment'
import { getGiiPracticeContextStamp, isGiiPracticeContextStampCurrent, isGiiPracticePayloadCurrent, isGiiPracticeSelectionContextCurrent, stampGiiPracticePayload } from '../../../_shared/gii-selection/practice-context'

const LOG_EVENTI_CICLI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_LOG_EVENTI_CICLI/FeatureServer/0'
const GII_ATTIVITA_CORRENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_ATTIVITA_CORRENTI/FeatureServer/0'
const GII_UTENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_utenti/FeatureServer/0'
const GII_VIEW_PAGAMENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_PAGAMENTI/FeatureServer/0'
const GII_VIEW_EDIT_PAGAMENTI_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EDIT_PAGAMENTI/FeatureServer/0'
const NOTA_SPESE_DETTAGLIO_VIEW_URL = 'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_VIEW_EB_NOTA_SPESE_DETTAGLIO/FeatureServer/0'

function loadEsriModule<T = any> (path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try { req([path], (mod: T) => resolve(mod), (err: any) => reject(err)) } catch (e) { reject(e) }
  })
}


type AmmUtenteCached = {
  username: string
  nome: string
  cognome: string
  titolo: string
  area?: number | null
  settore?: number | null
  ruolo_cod?: string
  area_cod?: string
  settore_cod?: string
}
type AttoParticipantIdentity = { nome: string; cognome: string; titolo: string }

const AMM_AREA_NUM: Record<string, number> = { AMM: 1, AGR: 2, TEC: 3 }
const AMM_SETTORE_NUM: Record<string, number> = { CR: 1, GI: 2, D1: 3, D2: 4, D3: 5, D4: 6, D5: 7, D6: 8, DS: 9 }
const AMM_AREA_COD_FROM_NUM: Record<number, string> = { 1: 'AMM', 2: 'AGR', 3: 'TEC' }
const AMM_SETTORE_COD_FROM_NUM: Record<number, string> = { 1: 'CR', 2: 'GI', 3: 'D1', 4: 'D2', 5: 'D3', 6: 'D4', 7: 'D5', 8: 'D6', 9: 'DS' }

function normalizeAmmUtentiRuoloCod (v: any): string {
  const s = String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (!s) return ''
  return s
}

function normalizeAmmUtentiAreaCod (v: any): string {
  const s = String(v ?? '').trim().toUpperCase()
  if (!s) return ''
  const n = Number(s)
  if (Number.isFinite(n) && AMM_AREA_COD_FROM_NUM[n]) return AMM_AREA_COD_FROM_NUM[n]
  if (s.includes('AMMIN')) return 'AMM'
  if (s.includes('AGR')) return 'AGR'
  if (s.includes('TEC')) return 'TEC'
  return AMM_AREA_NUM[s] != null ? s : s
}

function normalizeAmmUtentiSettoreCod (v: any): string {
  const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (!s) return ''
  const n = Number(s)
  if (Number.isFinite(n) && AMM_SETTORE_COD_FROM_NUM[n]) return AMM_SETTORE_COD_FROM_NUM[n]
  const distretto = s.match(/DISTRETTO([1-6])/)
  if (distretto) return `D${distretto[1]}`
  if (s.includes('DRENO') || s.includes('SCOLO')) return 'DS'
  if (s.includes('CATASTO') || s.includes('RUOLI')) return 'CR'
  if (s.includes('GESTIONEIRRIGUA')) return 'GI'
  return AMM_SETTORE_NUM[s] != null ? s : s
}

async function loadAmmUtentiRowsForAtto (): Promise<AmmUtenteCached[]> {
  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: GII_UTENTI_URL })
    if (typeof fl?.load === 'function') await fl.load()
    const res = await fl.queryFeatures({
      where: `(tipo_record IS NULL OR tipo_record = 'UTENTE')`,
      outFields: ['username', 'nome', 'cognome', 'titolo', 'area', 'settore', 'ruolo_cod', 'area_cod', 'settore_cod'],
      returnGeometry: false
    })
    return (res?.features || []).map((f: any) => {
      const a = f?.attributes || {}
      return {
        username: String(a.username || '').trim(),
        nome: String(a.nome || '').trim(),
        cognome: String(a.cognome || '').trim(),
        titolo: String(a.titolo || '').trim(),
        area: a.area ?? null,
        settore: a.settore ?? null,
        ruolo_cod: normalizeAmmUtentiRuoloCod(a.ruolo_cod),
        area_cod: normalizeAmmUtentiAreaCod(a.area_cod || a.area),
        settore_cod: normalizeAmmUtentiSettoreCod(a.settore_cod || a.settore)
      }
    }).filter((row: AmmUtenteCached) => !!row.username)
  } catch (e) {
    console.warn('[GII-Editing-AMM] Errore lettura anagrafica GII_utenti per Atto:', e)
    return []
  }
}

async function loadUniqueAmmRoleUsername (roleRaw: string, areaRaw = 'AMM'): Promise<string> {
  const role = normalizeAmmUtentiRuoloCod(roleRaw)
  const area = normalizeAmmUtentiAreaCod(areaRaw)
  const rows = await loadAmmUtentiRowsForAtto()
  const usernames = Array.from(new Set(
    rows
      .filter(row => normalizeAmmUtentiRuoloCod(row.ruolo_cod) === role && (!area || normalizeAmmUtentiAreaCod(row.area_cod ?? row.area) === area))
      .map(row => String(row.username || '').trim())
      .filter(Boolean)
  ))
  return usernames.length === 1 ? usernames[0] : ''
}

function attoParticipantIdentity (entry: AmmUtenteCached | null | undefined): AttoParticipantIdentity {
  return {
    nome: String(entry?.nome || '').trim(),
    cognome: String(entry?.cognome || '').trim(),
    titolo: String(entry?.titolo || '').trim()
  }
}

function hasAttoParticipantName (entry: AttoParticipantIdentity): boolean {
  return !!entry.nome && !!entry.cognome
}

/**
 * I soggetti autorizzati a firmare l'Atto non coincidono necessariamente con
 * il DA corrente. La fonte di verità è la Rubrica dei firmatari gestita dal RIA:
 * un nominativo può essere contemporaneamente un utente del gestionale oppure
 * un record puramente anagrafico, quindi non filtriamo per tipo_record.
 */
async function loadAuthorizedAttoSignerIdentities (): Promise<AttoParticipantIdentity[]> {
  try {
    const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
    const fl = new FeatureLayer({ url: GII_UTENTI_URL })
    if (typeof fl?.load === 'function') await fl.load()
    const res = await fl.queryFeatures({
      where: `firmatario = 1`,
      outFields: ['OBJECTID', 'nome', 'cognome', 'titolo', 'full_name', 'firmatario'],
      returnGeometry: false
    })
    const identities = (res?.features || [])
      .map((f: any) => {
        const a = f?.attributes || {}
        return {
          nome: String(a?.nome || '').trim(),
          cognome: String(a?.cognome || '').trim(),
          titolo: String(a?.titolo || '').trim()
        } as AttoParticipantIdentity
      })
      .filter(hasAttoParticipantName)

    return Array.from(new Map(identities.map(identity => {
      const key = `${normalizeAttoSignerIdentityText(identity.nome)}|${normalizeAttoSignerIdentityText(identity.cognome)}`
      return [key, identity] as const
    })).values())
  } catch (e) {
    console.warn('[GII-Editing-AMM] Errore lettura Rubrica firmatari per verifica firma Atto:', e)
    throw new Error('Non è stato possibile leggere la Rubrica dei firmatari autorizzati. Il documento non è stato acquisito.')
  }
}

async function resolveAttoParticipants (
  attrs: Record<string, any>,
  profile: { username: string }
): Promise<{ da: AttoParticipantIdentity; ria: AttoParticipantIdentity; ia: AttoParticipantIdentity }> {
  // Si legge sempre l'anagrafica corrente dalla tabella utenti: le sigle e la
  // firma devono riflettere immediatamente eventuali cambi di DA/RIA/IA.
  // La tabella può contenere più profili per lo stesso username, quindi si
  // lavora sull'elenco dei record e non su una mappa username -> singolo profilo.
  const rows = await loadAmmUtentiRowsForAtto()
  const empty = (): AttoParticipantIdentity => ({ nome: '', cognome: '', titolo: '' })

  const byUsername = (username: any): AttoParticipantIdentity => {
    const user = String(username ?? '').trim().toLowerCase()
    if (!user) return empty()
    const matches = rows.filter(row => row.username.toLowerCase() === user)
    const withName = matches.find(row => !!row.nome && !!row.cognome)
    return attoParticipantIdentity(withName || matches[0])
  }

  const uniqueByRole = (role: string, area = 'AMM'): AttoParticipantIdentity => {
    const matches = rows.filter(row => {
      const r = normalizeAmmUtentiRuoloCod(row.ruolo_cod)
      const a = normalizeAmmUtentiAreaCod(row.area_cod ?? row.area)
      return r === role && (!area || a === area) && !!row.nome && !!row.cognome
    })
    const unique = Array.from(new Map(
      matches.map(row => {
        const identity = attoParticipantIdentity(row)
        const key = `${identity.nome.toLowerCase()}|${identity.cognome.toLowerCase()}|${identity.titolo.toUpperCase()}`
        return [key, identity] as const
      })
    ).values())
    return unique.length === 1 ? unique[0] : empty()
  }

  const iaUsername = String(pickAttrCI(attrs, ['ia_assegnato_username']) || profile.username || '').trim()

  const daUsername = String(pickAttrCI(attrs, [
    'da_username', 'direttore_area_username', 'direttore_amm_username', 'dt_amm_username'
  ]) || '').trim()
  const directDa = byUsername(daUsername)
  const directIa = byUsername(iaUsername)

  return {
    da: hasAttoParticipantName(directDa) ? directDa : uniqueByRole('DA', 'AMM'),
    ria: uniqueByRole('RIA', 'AMM'),
    ia: directIa
  }
}


type AmmDeterminaEmailRecipients = { to: string, cc: string[] }

function isValidAmmEmailAddress (value: any): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim())
}

function assignedIaUsername (attrs: Record<string, any>): string {
  return String(pickAttrCI(attrs || {}, [
    'ia_assegnato_username'
  ]) || '').trim()
}

/**
 * Restituisce l'indirizzo e-mail dell'Istruttore amministrativo assegnato alla pratica.
 * Il mittente non viene mai ricavato dall'utente attualmente collegato: anche un
 * ADMIN che prepara il file deve usare l'indirizzo dell'Istruttore amministrativo assegnato.
 */
async function loadAssignedIaSenderEmail (attrs: Record<string, any>): Promise<string> {
  const username = assignedIaUsername(attrs)
  if (!username) {
    console.warn('[GII_EMAIL] Mittente non risolvibile: alla pratica non risulta assegnato alcun IA.')
    throw new Error('L’indirizzo e-mail del mittente non è disponibile. Contattare l’amministratore del sistema.')
  }

  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url: GII_UTENTI_URL })
  if (typeof fl?.load === 'function') await fl.load()
  const res = await fl.queryFeatures({
    where: `(tipo_record IS NULL OR tipo_record = 'UTENTE')`,
    outFields: ['OBJECTID', 'username', 'email', 'area', 'ruolo_cod', 'area_cod'],
    returnGeometry: false
  })
  const key = username.toLowerCase()
  const rows = (res?.features || [])
    .map((f: any) => f?.attributes || {})
    .filter((a: any) => String(a?.username || '').trim().toLowerCase() === key)

  if (!rows.length) {
    console.warn('[GII_EMAIL] Mittente non risolvibile: utente assegnato non presente in GII_utenti.', { username })
    throw new Error('L’indirizzo e-mail del mittente non è disponibile. Contattare l’amministratore del sistema.')
  }

  // Se lo stesso account ha più profili, privilegiamo quello di Istruttore amministrativo;
  // l'indirizzo, comunque, deve essere univoco per l'account.
  const preferred = rows.filter((a: any) =>
    normalizeAmmUtentiRuoloCod(a?.ruolo_cod) === 'IA' &&
    normalizeAmmUtentiAreaCod(a?.area_cod ?? a?.area) === 'AMM'
  )
  const candidates = preferred.length ? preferred : rows
  const emails = Array.from(new Set(candidates
    .map((a: any) => String(a?.email || '').trim().toLowerCase())
    .filter(Boolean)))

  if (!emails.length) {
    console.warn('[GII_EMAIL] Mittente privo di indirizzo e-mail.', { username })
    throw new Error('L’indirizzo e-mail del mittente non è disponibile. Contattare l’amministratore del sistema.')
  }
  if (emails.length > 1) {
    console.warn('[GII_EMAIL] Mittente con più indirizzi e-mail configurati.', { username, emails })
    throw new Error('I dati del mittente non sono configurati correttamente. Contattare l’amministratore del sistema.')
  }
  const email = emails[0]
  if (!isValidAmmEmailAddress(email)) {
    console.warn('[GII_EMAIL] Indirizzo e-mail del mittente non valido.', { username, email })
    throw new Error('I dati del mittente non sono configurati correttamente. Contattare l’amministratore del sistema.')
  }
  return email
}

/**
 * Legge il destinatario del protocollo direttamente dalla Rubrica in GII_utenti.
 */
async function loadAmmProtocolloEmailRecipient (): Promise<string> {
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url: GII_UTENTI_URL })
  if (typeof fl?.load === 'function') await fl.load()
  const res = await fl.queryFeatures({
    where: `tipo_record = 'RUBRICA'`,
    outFields: ['OBJECTID', 'full_name', 'email', 'uso_email'],
    returnGeometry: false
  })
  const rows = (res?.features || []).map((f: any) => f?.attributes || {})
  const matches = rows.filter((a: any) => String(a?.uso_email || '').trim().toUpperCase() === 'PROTOCOLLO_A')
  if (matches.length === 0) {
    console.warn('[GII_EMAIL] Destinatario protocollo non configurato (PROTOCOLLO_A).')
    throw new Error('L’indirizzo e-mail del protocollo non è disponibile. Contattare l’amministratore del sistema.')
  }
  if (matches.length > 1) {
    console.warn('[GII_EMAIL] Destinatario protocollo non univoco (PROTOCOLLO_A).', { count: matches.length })
    throw new Error('I dati del destinatario del protocollo non sono configurati correttamente. Contattare l’amministratore del sistema.')
  }
  const email = String(matches[0]?.email || '').trim().toLowerCase()
  if (!isValidAmmEmailAddress(email)) {
    console.warn('[GII_EMAIL] Indirizzo e-mail del protocollo non valido.', { email })
    throw new Error('I dati del destinatario del protocollo non sono configurati correttamente. Contattare l’amministratore del sistema.')
  }
  return email
}

/**
 * Legge i destinatari della determina direttamente dalla Rubrica in GII_utenti.
 * Non usa cache: una modifica effettuata da RIA deve essere efficace già alla
 * successiva generazione del file .eml, senza refresh o ripubblicazioni.
 */
async function loadAmmDeterminaEmailRecipients (): Promise<AmmDeterminaEmailRecipients> {
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const fl = new FeatureLayer({ url: GII_UTENTI_URL })
  if (typeof fl?.load === 'function') await fl.load()
  const res = await fl.queryFeatures({
    where: `tipo_record = 'RUBRICA'`,
    outFields: ['OBJECTID', 'full_name', 'email', 'uso_email'],
    returnGeometry: false
  })
  const rows = (res?.features || []).map((f: any) => f?.attributes || {})
  const main = rows.filter((a: any) => String(a?.uso_email || '').trim().toUpperCase() === 'DETERMINA_A')
  if (main.length === 0) {
    console.warn('[GII_EMAIL] Destinatario Direttore non configurato (DETERMINA_A).')
    throw new Error('L’indirizzo e-mail del Direttore non è disponibile. Contattare l’amministratore del sistema.')
  }
  if (main.length > 1) {
    console.warn('[GII_EMAIL] Destinatario Direttore non univoco (DETERMINA_A).', { count: main.length })
    throw new Error('I dati del destinatario del Direttore non sono configurati correttamente. Contattare l’amministratore del sistema.')
  }
  const to = String(main[0]?.email || '').trim().toLowerCase()
  if (!isValidAmmEmailAddress(to)) {
    console.warn('[GII_EMAIL] Indirizzo e-mail del Direttore non valido.', { email: to })
    throw new Error('I dati del destinatario del Direttore non sono configurati correttamente. Contattare l’amministratore del sistema.')
  }
  const seen = new Set<string>([to])
  const cc: string[] = []
  for (const a of rows) {
    if (String(a?.uso_email || '').trim().toUpperCase() !== 'DETERMINA_CC') continue
    const email = String(a?.email || '').trim().toLowerCase()
    if (!email || seen.has(email)) continue
    if (!isValidAmmEmailAddress(email)) {
      const name = String(a?.full_name || '').trim()
      console.warn('[GII_EMAIL] Indirizzo in copia conoscenza non valido.', { name, email })
      throw new Error('Uno degli indirizzi e-mail in copia conoscenza non è configurato correttamente. Contattare l’amministratore del sistema.')
    }
    seen.add(email)
    cc.push(email)
  }
  return { to, cc }
}

type RoleCode = 'IA' | 'RIA' | 'ADMIN' | string

type SelectedState = {
  ds?: any | null
  dsId?: string
  oid: number | null
  idFieldName: string
  layerUrl: string
  data: any | null
  readOnly?: boolean
  readOnlyMessage?: string
  source: 'datasource' | 'editIntent' | 'selection' | 'none'
  sig: string
}

type EditIntentInfo = {
  oid: number | null
  dsId?: string
  layerUrl?: string
  idFieldName?: string
  data?: any | null
  readOnly?: boolean
  readOnlyMessage?: string
  operationalRole?: string
  ts?: number
}

type IaAccessStatus = 'idle' | 'checking' | 'allowed' | 'denied' | 'error'

type IaAccessState = {
  status: IaAccessStatus
  selectionKey: string
  data: any | null
  message: string
  checkedAt: number
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
  categoriaCosto: string
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
  group: 'trasgressore' | 'contestazioni_importi' | 'verbale' | 'notifica' | 'sanzione' | 'attrezzature' | 'pagamento' | 'bonifico' | 'chiusura' | 'post_notifica' | 'ricorso' | 'cda' | 'riapertura' | 'definizione' | 'incasso'
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
  { group: 'trasgressore', name: 'via', label: 'Via/Piazza/Località', kind: 'text' },
  { group: 'trasgressore', name: 'civico', label: 'Civico', kind: 'text' },
  { group: 'trasgressore', name: 'comune', label: 'Comune', kind: 'text' },
  { group: 'trasgressore', name: 'citta', label: 'Comune', kind: 'text' },
  { group: 'trasgressore', name: 'cap', label: 'CAP', kind: 'text' },
  { group: 'trasgressore', name: 'pec', label: 'PEC', kind: 'text' },
  { group: 'trasgressore', name: 'email', label: 'E-mail', kind: 'text' },
  { group: 'trasgressore', name: 'telefono', label: 'Telefono', kind: 'text' },
  { group: 'trasgressore', name: 'cellulare', label: 'Cellulare', kind: 'text' },

  { group: 'contestazioni_importi', name: 'tipo_atto_amm', label: 'Tipo atto amministrativo (automatico)', kind: 'domain', readonly: true },
  { group: 'contestazioni_importi', name: 'oggetto_atto_amm', label: 'Oggetto atto amministrativo (automatico)', kind: 'text', full: true, readonly: true },
  { group: 'verbale', name: 'protocollo_fascicolo_numero', label: 'N. protocollo fascicolo', kind: 'text', readonly: true },
  { group: 'verbale', name: 'protocollo_fascicolo_data', label: 'Data protocollo fascicolo', kind: 'date', readonly: true },
  { group: 'verbale', name: 'accertamento_numero', label: 'Numero accertamento', kind: 'text' },
  { group: 'verbale', name: 'accertamento_data', label: 'Data accertamento', kind: 'date' },
  { group: 'verbale', name: 'note_atto_amm', label: 'Note amministrative', kind: 'textarea', full: true },

  { group: 'notifica', name: 'protocollo_atto_accertamento_numero', label: 'N. protocollo accertamento', kind: 'text', readonly: true },
  { group: 'notifica', name: 'protocollo_atto_accertamento_data', label: 'Data protocollo accertamento', kind: 'date', readonly: true },
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
  { group: 'attrezzature', name: 'attrezzature_risarcimento_importo', label: 'Risarcimento attrezzatura', kind: 'number' },
  { group: 'attrezzature', name: 'attrezzature_cauzione_decurtata', label: 'Cauzione decurtata', kind: 'number' },
  { group: 'attrezzature', name: 'attrezzature_importo_netto', label: 'Importo netto attrezzature', kind: 'number' },
  { group: 'attrezzature', name: 'attrezzature_risarcimento_dettaglio', label: 'Dettaglio risarcimento attrezzatura', kind: 'textarea', full: true, placeholder: 'Indicare attrezzature, quantità e importi.' },
  { group: 'attrezzature', name: 'attrezzature_note', label: 'Note risarcimento attrezzatura', kind: 'textarea', full: true },

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
  { group: 'cda', name: 'cda_estremi_atto', label: 'Estremi atto/determina comunicata al Responsabile dell’istruttoria amministrativa', kind: 'text', full: true },
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

const ADMIN_WORKFLOW_SAVE_FIELDS = [
  'esito_IA',
  'dt_esito_IA',
  'note_IA',
  'note_atto_amm',
  'stato_IA',
  'dt_stato_IA',
  'determinazione_stato'
]

type NoteCasisticaOption = { key: string; label: string; text: string }

const NOTE_FIELD_CASES: Record<string, NoteCasisticaOption[]> = {
  attrezzature_note: [
    { key: 'cauzione_detratta', label: 'Cauzione detratta', text: 'La cauzione versata è stata detratta dall’importo del rimborso attrezzature.' },
    { key: 'rimborso_integrale', label: 'Rimborso integrale', text: 'Il rimborso attrezzature è stato quantificato integralmente sulla base degli elementi disponibili.' },
    { key: 'verifica_documentale', label: 'Da documentazione agli atti', text: 'Il rimborso attrezzature è stato determinato sulla base della documentazione agli atti.' }
  ],
  pagamento_note: [
    { key: 'pagopa_allegato', label: 'Avviso pagoPA allegato', text: 'Il pagamento dovrà essere effettuato mediante l’avviso pagoPA allegato all’atto di accertamento.' },
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
    { key: 'atto', label: 'Termine da atto', text: 'Termine per la presentazione del ricorso indicato nell’atto notificato.' },
    { key: 'notifica', label: 'Termine dalla notifica', text: 'Termine per la presentazione del ricorso decorrente dalla data di notifica dell’atto.' },
    { key: 'atto_notificato', label: 'Termine da atto notificato', text: 'Termine individuato sulla base delle indicazioni contenute nell’atto notificato.' },
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
  'attrezzature_risarcimento_importo',
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
const PROTOCOLLO_ATTO_FIELDS = ['protocollo_atto_accertamento_numero', 'protocollo_atto_accertamento_data']
const PROTOCOLLO_FASCICOLO_FIELDS = ['protocollo_fascicolo_numero', 'protocollo_fascicolo_data']
const TRASMESSA_FIRMA_DA_STATE = 'TRASMESSA_FIRMA_DA'
const DETERMINAZIONE_DOMAIN_STATES = new Set(['BOZZA', 'TRASMESSA_RIA', 'VALIDATA_RIA', 'TRASMESSA_FIRMA_DA', 'ADOTTATA', 'NON_SOTTOSCRITTA'])
// Il DOCX generato dal gestionale è una copia di lavoro locale e non viene più
// caricato nel fascicolo. Il riconoscimento di bozza/proposta è centralizzato nello
// shared attachment viewer, così editor e viewer usano la stessa regola.
const NOTIFICA_ATTO_FIELDS = ['notifica_tipo', 'notifica_data', 'notifica_esito', 'notifica_estremi']

const SYSTEM_CALCULATED_ADMIN_FIELDS = new Set([
  'tipo_atto_amm',
  'oggetto_atto_amm',
  'accertamento_numero',
  'accertamento_data',
  'sanzione_importo_base',
  'sanzione_importo_ridotta',
  'risarcimento_danni_importo',
  'sanzione_dettaglio_calcolo',
  'sanzione_calcolata_il',
  'sanzione_calcolata_da',
  'attrezzature_risarcimento_importo',
  'attrezzature_cauzione_decurtata',
  'attrezzature_importo_netto',
  'attrezzature_risarcimento_dettaglio',
  'pagamento_importo_totale'
])

// Questi valori restano consultabili/calcolati nella scheda amministrativa,
// ma non devono essere risalvati dall’IA: costituiscono lo snapshot tecnico
// dell'Art. 30 già definito nella fase AGR/TEC.
const ADMIN_AUTOMATIC_VALUES_NOT_PERSISTED_BY_IA = new Set([
  'attrezzature_risarcimento_importo',
  'attrezzature_cauzione_decurtata',
  'attrezzature_importo_netto',
  'attrezzature_risarcimento_dettaglio'
])

function isSystemCalculatedAdminField (name: string): boolean {
  return SYSTEM_CALCULATED_ADMIN_FIELDS.has(String(name || ''))
}

function shouldPersistAutomaticAdminValue (name: string): boolean {
  return !ADMIN_AUTOMATIC_VALUES_NOT_PERSISTED_BY_IA.has(String(name || ''))
}

type PaymentMode = '' | 'PAGOPA' | 'BONIFICO' | 'MISTO' | 'ALTRO'

type AmmSectionKey = 'trasgressore' | 'contestazioni_importi' | 'verifica_istruttoria' | 'pagamento' | 'notifica' | 'anteprima' | 'allegati' | 'dati_generali' | 'ricorso' | 'cda' | 'riapertura' | 'definizione'

const AMM_DEFAULT_SECTION: AmmSectionKey = 'trasgressore'
const VALID_AMM_SECTIONS = new Set(['trasgressore', 'contestazioni_importi', 'verifica_istruttoria', 'pagamento', 'notifica', 'anteprima', 'allegati', 'dati_generali', 'ricorso', 'cda', 'riapertura', 'definizione'])

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
    case 'verbale':
    case 'predisposizione-verbale':
      return 'contestazioni_importi'
    case 'verifica':
    case 'verifica-istruttoria':
    case 'esito-verifica':
      return 'verifica_istruttoria'
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
      const parsedIntent = rawIntent ? JSON.parse(rawIntent) : null
      const source = parsedIntent && isGiiPracticePayloadCurrent(parsedIntent) ? String(parsedIntent?.source || '') : ''
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
  await ensureNsdJsonOnlyQueryFormat()
  const fl = await getLookupLayer(NOTA_SPESE_DETTAGLIO_VIEW_URL)
  const q: any = {
    where: variants.map(value => `parent_globalid = ${sqlQuote(value)}`).join(' OR '),
    outFields: ['OBJECTID', 'ordine', 'codice_casistica', 'categoria_costo', 'codice_voce_snapshot', 'descrizione_snapshot', 'importo_riga'],
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
      categoriaCosto: String(pickAttrCI(attrs, ['categoria_costo']) || '').trim().toUpperCase(),
      codiceVoce: String(pickAttrCI(attrs, ['codice_voce_snapshot']) || '').trim(),
      descrizione: String(pickAttrCI(attrs, ['descrizione_snapshot']) || '').trim(),
      importoRiga: parseNumberInput(pickAttrCI(attrs, ['importo_riga'])) || 0
    }
  }).filter((row: NotaSpeseDetailRow) => !!row.codiceCasistica)
}

type AmmNsCatPdf = 'AT' | 'PR' | 'RU' | 'SL' | 'PF'
type AmmNsRowPdf = {
  objectid: number
  categoria_costo: AmmNsCatPdf
  origine_voce_snapshot: string
  codice_voce_snapshot: string
  descrizione_snapshot: string
  unita_misura_snapshot: string
  prezzo_unitario_snapshot: number
  quantita: number
  importo_riga: number
  anno_prezzario_snapshot?: number | null
  ordine: number
  note: string
}
type AmmNsSummaryPdf = {
  totaleAT: number
  totalePR: number
  totaleRU: number
  totaleSL: number
  totalePF: number
  percentualeSpeseGenerali: number
  importoSpeseGenerali: number
  totaleComplessivo: number
}
type AmmNotaSpesePdfGroup = { codiceCasistica: string; label: string; rows: Record<AmmNsCatPdf, AmmNsRowPdf[]>; summary: AmmNsSummaryPdf }
const AMM_NS_PDF_CATS: AmmNsCatPdf[] = ['AT', 'PR', 'RU', 'SL', 'PF']
const AMM_NS_PDF_CASISTICA_META: Record<string, { label: string; order: number }> = {
  C101_DANNI_OPERE: { label: 'Danni alle opere consortili', order: 10 },
  C102_MANOMISSIONI: { label: 'Manomissioni e alterazioni', order: 20 },
  C103_PRELIEVI_ABUSIVI: { label: 'Prelievi non autorizzati', order: 30 },
  C104_ATTREZZATURE_DANNEGGIATE: { label: 'Rimborso/sostituzione attrezzature', order: 40 },
  C105_ALTRO: { label: 'Altre spese a piè di lista', order: 90 }
}

function emptyAmmNsRowsForPdf (): Record<AmmNsCatPdf, AmmNsRowPdf[]> {
  return { AT: [], PR: [], RU: [], SL: [], PF: [] }
}

function ammNsSummaryForPdf (rows: Record<AmmNsCatPdf, AmmNsRowPdf[]>, percentualeSpeseGenerali: number): AmmNsSummaryPdf {
  const sumCat = (cat: AmmNsCatPdf): number => (rows[cat] || []).reduce((sum, r) => sum + (Number(r.importo_riga) || 0), 0)
  const totaleAT = sumCat('AT')
  const totalePR = sumCat('PR')
  const totaleRU = sumCat('RU')
  const totaleSL = sumCat('SL')
  const totalePF = sumCat('PF')
  const imponibile = totaleAT + totalePR + totaleRU + totaleSL + totalePF
  const pct = Number.isFinite(percentualeSpeseGenerali) ? percentualeSpeseGenerali : 15
  const importoSpeseGenerali = imponibile * pct / 100
  return { totaleAT, totalePR, totaleRU, totaleSL, totalePF, percentualeSpeseGenerali: pct, importoSpeseGenerali, totaleComplessivo: imponibile + importoSpeseGenerali }
}

function ammNotaSpeseGroupsForPdf (rawRows: any[], percentualeSpeseGenerali: number): AmmNotaSpesePdfGroup[] {
  const byCode = new Map<string, Record<AmmNsCatPdf, AmmNsRowPdf[]>>()
  for (const r of rawRows || []) {
    const cat = String(pickAttrCI(r, ['categoria_costo']) || '').toUpperCase() as AmmNsCatPdf
    if (!AMM_NS_PDF_CATS.includes(cat)) continue
    const code = String(pickAttrCI(r, ['codice_casistica']) || '').trim() || '__NON_COLLEGATA__'
    if (!byCode.has(code)) byCode.set(code, emptyAmmNsRowsForPdf())
    byCode.get(code)![cat].push({
      objectid: Number(pickAttrCI(r, ['OBJECTID', 'objectid']) || 0),
      categoria_costo: cat,
      origine_voce_snapshot: String(pickAttrCI(r, ['origine_voce_snapshot']) || ''),
      codice_voce_snapshot: String(pickAttrCI(r, ['codice_voce_snapshot']) || ''),
      descrizione_snapshot: String(pickAttrCI(r, ['descrizione_snapshot']) || ''),
      unita_misura_snapshot: String(pickAttrCI(r, ['unita_misura_snapshot']) || ''),
      prezzo_unitario_snapshot: Number(pickAttrCI(r, ['prezzo_unitario_snapshot']) || 0),
      quantita: Number(pickAttrCI(r, ['quantita']) || 0),
      importo_riga: Number(pickAttrCI(r, ['importo_riga']) || 0),
      anno_prezzario_snapshot: pickAttrCI(r, ['anno_prezzario_snapshot']) == null ? null : Number(pickAttrCI(r, ['anno_prezzario_snapshot'])),
      ordine: Number(pickAttrCI(r, ['ordine']) || 0),
      note: String(pickAttrCI(r, ['note']) || '')
    })
  }
  return Array.from(byCode.entries())
    .map(([code, rows]) => ({
      codiceCasistica: code,
      label: AMM_NS_PDF_CASISTICA_META[code]?.label || (code === '__NON_COLLEGATA__' ? 'Nota spese non collegata a violazione' : 'Nota spese collegata'),
      rows,
      summary: ammNsSummaryForPdf(rows, percentualeSpeseGenerali)
    }))
    .filter(g => g.summary.totaleComplessivo > 0)
    .sort((a, b) => {
      const ao = AMM_NS_PDF_CASISTICA_META[a.codiceCasistica]?.order ?? 999
      const bo = AMM_NS_PDF_CASISTICA_META[b.codiceCasistica]?.order ?? 999
      if (ao !== bo) return ao - bo
      return a.label.localeCompare(b.label, 'it')
    })
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
    const fromWindowRaw: any = (window as any).__giiEdit || null
    const fromStorageRaw: any = safeJsonParse(sessionStorage.getItem('GII_EDIT_INTENT'))
    const fromWindow: any = fromWindowRaw && isGiiPracticePayloadCurrent(fromWindowRaw) ? fromWindowRaw : null
    const fromStorage: any = fromStorageRaw && isGiiPracticePayloadCurrent(fromStorageRaw) ? fromStorageRaw : null
    const j: any = fromWindow || fromStorage || null
    if (!j) {
      try { delete (window as any).__giiEdit } catch {}
      try { sessionStorage.removeItem('GII_EDIT_INTENT') } catch {}
      return null
    }
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
      readOnly: j?.readOnly === true || String(j?.readOnly || '').toLowerCase() === 'true',
      readOnlyMessage: String(j?.readOnlyMessage || '').trim(),
      operationalRole: String(j?.operationalRole || '').trim(),
      ts: Number(j?.ts || Date.now())
    }
  } catch {
    return null
  }
}

function readSelectionIntent (): EditIntentInfo | null {
  try {
    const mem: any = (window as any).__giiSelection || null
    const sel: any = mem && isGiiPracticePayloadCurrent(mem) ? mem : null
    if (!sel && !isGiiPracticeSelectionContextCurrent()) return null
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
      readOnly: sel?.readOnly === true || String(sel?.readOnly || '').toLowerCase() === 'true',
      readOnlyMessage: String(sel?.readOnlyMessage || '').trim(),
      ts: Number(sel?.ts || 0)
    }
  } catch {
    return null
  }
}

function selectionStateFromIntent (intent: EditIntentInfo | null, source: 'editIntent' | 'selection'): SelectedState {
  if (!intent) return { ds: null, oid: null, idFieldName: 'OBJECTID', layerUrl: '', data: null, readOnly: false, readOnlyMessage: '', source: 'none', sig: 'none' }
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
    readOnly: intent.readOnly === true,
    readOnlyMessage: String(intent.readOnlyMessage || '').trim(),
    source,
    sig: `${source}|${layerUrl}|${oid ?? ''}|${Number(intent.ts || 0)}`
  }
}

function normalizeRole (v: any): string {
  return String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
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
    const editCtx: any = (() => {
      try {
        const mem: any = (window as any).__giiEdit || null
        if (mem && isGiiPracticePayloadCurrent(mem)) return mem
        const stored: any = safeJsonParse(sessionStorage.getItem('GII_EDIT_INTENT'))
        return stored && isGiiPracticePayloadCurrent(stored) ? stored : null
      } catch { return null }
    })()
    const selectionCtx: any = (() => {
      try {
        const mem: any = (window as any).__giiSelection || null
        return mem && isGiiPracticePayloadCurrent(mem) ? mem : null
      } catch { return null }
    })()
    const contextualRole = normalizeRole(
      editCtx?.operationalRole ||
      selectionCtx?.operationalRole ||
      sessionStorage.getItem('GII_SELECTED_OPERATIONAL_ROLE') ||
      ''
    )
    let role = ['IA', 'RIA', 'DA', 'ADMIN'].includes(contextualRole)
      ? contextualRole
      : normalizeRole(info?.profiloCod || info?.profilo_cod || info?.ruoloCod || info?.ruolo_cod)
    const area = normalizeArea(info?.areaCod || info?.area_cod || info?.areaLabel || info?.area)
    if (!role && (info?.isWorkflowAdmin || info?.isAdmin)) role = 'ADMIN'
    const username = String(info?.username || (window as any).__giiUser?.username || '').trim()
    const fullName = String(info?.fullName || info?.full_name || username || '').trim()
    const label = String(info?.profiloLabel || info?.ruoloFull || role || '').trim()
    return { role, username, fullName, label }
  } catch {
    return { role: '', username: '', fullName: '', label: '' }
  }
}

function currentUserIsWorkflowAdmin (): boolean {
  try {
    const info: any = (window as any).__giiUserRole || {}
    return !!(info?.isWorkflowAdmin || info?.isAdmin) ||
      normalizeRole(info?.profiloCod || info?.profilo_cod || info?.ruoloCod || info?.ruolo_cod) === 'ADMIN'
  } catch {
    return false
  }
}

function userProfileIdentityKey (profile: { role?: any, username?: any, fullName?: any, label?: any }): string {
  return [
    String(profile?.username || '').trim().toLowerCase(),
    String(profile?.role || '').trim().toUpperCase(),
    String(profile?.fullName || '').trim().toLowerCase(),
    String(profile?.label || '').trim().toLowerCase()
  ].join('|')
}

function emptySelectedState (): SelectedState {
  return {
    ds: null,
    oid: null,
    idFieldName: 'OBJECTID',
    layerUrl: '',
    data: null,
    readOnly: false,
    readOnlyMessage: '',
    source: 'none',
    sig: 'none'
  }
}

function clearDataSourceSelection (ds: any): void {
  if (!ds) return
  try { ds.clearSelection?.() } catch {}
  try { ds.selectRecordsByIds?.([]) } catch {}
  try { ds.setSelectedRecords?.([]) } catch {}
}

function isAllowedAdminRole (role: string): boolean {
  return ['IA', 'RIA', 'DA', 'ADMIN'].includes(String(role || '').toUpperCase())
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
  return /(^dt_|data|_data|date|scadenza|_il$)/i.test(String(name || ''))
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
  if (fieldName === 'determinazione_stato') {
    return [
      { code: 'BOZZA', name: 'Bozza predisposta' },
      { code: 'TRASMESSA_RIA', name: "Trasmessa al Responsabile dell'istruttoria amministrativa" },
      { code: 'VALIDATA_RIA', name: "Validata dal Responsabile dell'istruttoria amministrativa" },
      { code: 'TRASMESSA_FIRMA_DA', name: 'Trasmessa alla firma del Direttore Area AA. GG. e P.F.' },
      { code: 'ADOTTATA', name: 'Determinazione adottata' },
      { code: 'NON_SOTTOSCRITTA', name: 'Determinazione non sottoscritta' }
    ]
  }
  if (fieldName === 'tipo_atto_amm') {
    return [
      { code: 'VERBALE', name: 'Atto di accertamento' },
      { code: 'RISARCIMENTO_DANNI', name: 'Richiesta risarcimento danni' },
      { code: 'VERBALE_RISARCIMENTO', name: 'Atto di accertamento con rimborso/risarcimento' },
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
  if (/^stato_(IA|RIA|DA)$/i.test(fieldName)) {
    return [
      { code: 0, name: 'Non attivo' },
      { code: 1, name: 'Da prendere in carico' },
      { code: 2, name: 'Presa in carico' },
      { code: 3, name: 'Integrazione richiesta' },
      { code: 4, name: 'Trasmesso' },
      { code: 5, name: 'Respinto' }
    ]
  }
  if (/^esito_(IA|RIA|DA|DT)$/i.test(fieldName)) {
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


async function resolveHistoricalAmmOperatorName (usernameRaw: any, roleRaw = ''): Promise<string> {
  const username = String(usernameRaw ?? '').trim()
  if (!username) return ''
  const key = username.toLowerCase()
  const role = normalizeAmmUtentiRuoloCod(roleRaw)
  const rows = await loadAmmUtentiRowsForAtto()
  const matches = rows.filter(row => String(row.username || '').trim().toLowerCase() === key)
  const preferred = role ? matches.filter(row => normalizeAmmUtentiRuoloCod(row.ruolo_cod) === role) : matches
  const candidates = preferred.length ? preferred : matches
  for (const row of candidates) {
    const fullName = [String(row.nome || '').trim(), String(row.cognome || '').trim()].filter(Boolean).join(' ').trim()
    if (fullName) return fullName
  }
  return username
}

const HISTORICAL_RIA_NAME_PROMISE_CACHE = new Map<string, Promise<string>>()
const HISTORICAL_RIA_NAME_VALUE_CACHE = new Map<string, string>()

function historicalRiaLookupKey (parentGlobalIdRaw: any, revisionRaw: any = ''): string {
  const parentGlobalId = String(parentGlobalIdRaw ?? '').trim().replace(/[{}]/g, '').toLowerCase()
  const revision = normalizeAuditComparable(revisionRaw)
  return parentGlobalId ? `${parentGlobalId}|${revision}` : ''
}

function cachedHistoricalRiaOperatorName (parentGlobalIdRaw: any, revisionRaw: any = ''): string {
  const key = historicalRiaLookupKey(parentGlobalIdRaw, revisionRaw)
  return key ? (HISTORICAL_RIA_NAME_VALUE_CACHE.get(key) || '') : ''
}

async function loadLatestHistoricalRiaOperatorName (parentGlobalIdRaw: any, revisionRaw: any = ''): Promise<string> {
  const parentGlobalId = String(parentGlobalIdRaw ?? '').trim()
  if (!parentGlobalId) return ''
  const key = historicalRiaLookupKey(parentGlobalId, revisionRaw)
  const cachedValue = key ? HISTORICAL_RIA_NAME_VALUE_CACHE.get(key) : ''
  if (cachedValue) return cachedValue
  const cachedPromise = key ? HISTORICAL_RIA_NAME_PROMISE_CACHE.get(key) : null
  if (cachedPromise) return await cachedPromise

  const promise = (async () => {
    try {
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const fl = new FeatureLayer({ url: LOG_EVENTI_CICLI_URL, outFields: ['*'] })
      if (typeof fl?.load === 'function') { try { await fl.load() } catch {} }
      if (!fl?.queryFeatures) return ''
      const q = fl.createQuery ? fl.createQuery() : {}
      q.where = `(${parentGlobalIdWhereForLog(parentGlobalId)}) AND ruolo_competente = 'RIA' AND stato_record = 'CHIUSO'`
      q.outFields = ['utente_operatore', 'dt_chiusura']
      q.returnGeometry = false
      q.num = 1
      const oidField = String(fl.objectIdField || 'OBJECTID')
      q.orderByFields = ['dt_chiusura DESC', `${oidField} DESC`]
      const res = await fl.queryFeatures(q)
      const username = String(res?.features?.[0]?.attributes?.utente_operatore || '').trim()
      return await resolveHistoricalAmmOperatorName(username, 'RIA')
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Impossibile risolvere il Responsabile storico dell’istruttoria amministrativa:', e)
      return ''
    }
  })()

  if (key) HISTORICAL_RIA_NAME_PROMISE_CACHE.set(key, promise)
  const name = await promise
  if (key) {
    HISTORICAL_RIA_NAME_PROMISE_CACHE.delete(key)
    if (name) HISTORICAL_RIA_NAME_VALUE_CACHE.set(key, name)
  }
  return name
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

// Cache condivisa del record selezionato, usata dai widget di elenco/azioni/editing
// per mantenere coerenti selezione e dati subito dopo un salvataggio. Non contiene
// logica di anteprima: il fascicolo viene gestito esclusivamente dagli editor.
type SelectedFeatureCacheEntry = {
  layerUrl: string
  oid: number
  idFieldName: string
  data: any
  ts: number
  source: 'edit' | 'list' | 'detail' | 'azioni'
}

function getSelectedFeatureCacheBucket (): Record<string, SelectedFeatureCacheEntry> {
  try {
    const w: any = window as any
    w.__giiSelectedFeatureCache = w.__giiSelectedFeatureCache || {}
    return w.__giiSelectedFeatureCache
  } catch {
    return {}
  }
}

function getSelectedFeatureCacheKey (layerUrl: string, oid: any): string {
  return `${String(layerUrl || '').trim()}::${Number(oid)}`
}

function writeSelectedFeatureCache (
  layerUrl: string,
  oid: any,
  idFieldName: string,
  data: any,
  source: 'edit' | 'list' | 'detail' | 'azioni'
): SelectedFeatureCacheEntry | null {
  try {
    const oidNum = Number(oid)
    const url = String(layerUrl || '').trim()
    if (!url || !Number.isFinite(oidNum) || !data || typeof data !== 'object') return null
    const key = getSelectedFeatureCacheKey(url, oidNum)
    const bucket = getSelectedFeatureCacheBucket()
    const prev: any = bucket[key]
    const now = Date.now()
    const holdMs = 15000
    let nextData = { ...(data || {}) }
    let nextSource: 'edit' | 'list' | 'detail' | 'azioni' = source
    let nextTs = now
    if (prev && prev.source === 'edit' && source !== 'edit' && (now - Number(prev.ts || 0) < holdMs)) {
      nextData = { ...(data || {}), ...(prev.data || {}) }
      nextSource = 'edit'
      nextTs = Number(prev.ts || now)
    }
    const next: SelectedFeatureCacheEntry = {
      layerUrl: url,
      oid: oidNum,
      idFieldName: String(idFieldName || prev?.idFieldName || 'OBJECTID') || 'OBJECTID',
      data: nextData,
      ts: nextTs,
      source: nextSource
    }
    bucket[key] = next
    return next
  } catch {
    return null
  }
}

function invalidateRuntimeProxyCache (layerUrl?: string | null) {
  try {
    const url = String(layerUrl || '').trim()
    if (!url) {
      try { delete (window as any).__giiRuntimeDsProxyCache } catch {}
      return
    }
    try {
      const bucket = (window as any).__giiRuntimeDsProxyCache
      if (bucket && typeof bucket === 'object') delete bucket[url]
    } catch {}
  } catch {}
}

const EDIT_LAYER_CACHE: Record<string, any> = {}

function clearEditingAmmSessionCaches (): void {
  for (const key of Object.keys(EDIT_LAYER_CACHE)) {
    const layer = EDIT_LAYER_CACHE[key]
    try { layer?.destroy?.() } catch {}
    delete EDIT_LAYER_CACHE[key]
  }
}

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

async function queryPointGeometryForAmm (ds: any, oid: number, idFieldName: string, layerUrlHint?: string): Promise<any | null> {
  if (!Number.isFinite(oid) || oid <= 0) return null
  try {
    const layer = await resolveLayerForEdit(ds, layerUrlHint)
    if (!layer || typeof layer.queryFeatures !== 'function') return null
    const field = String(idFieldName || 'OBJECTID').trim() || 'OBJECTID'
    const res = await layer.queryFeatures({ where: `${field} = ${oid}`, outFields: [field], returnGeometry: true, num: 1 })
    const feat = (res?.features || [])[0]
    const geom = feat?.geometry
    // Coordinate (0,0) o assenti = nessun punto per questa pratica (violazione che non lo
    // richiede: geometria impostata automaticamente a zero). Stesso criterio già in uso in
    // gii-azioni — non ci si basa su req_point, che per le pratiche da survey può non essere
    // compilato pur essendoci un punto reale.
    const gx = Number(geom?.x ?? geom?.longitude)
    const gy = Number(geom?.y ?? geom?.latitude)
    if (!Number.isFinite(gx) || !Number.isFinite(gy) || (gx === 0 && gy === 0)) return null
    return geom
  } catch {
    return null
  }
}

type AmmAttachmentInfo = { id: number; name?: string; size?: number; contentType?: string; url?: string; keywords?: string; created?: number; creationDate?: number; createdAt?: number; lastEditDate?: number; editDate?: number; uploadedAt?: number }

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

function formatDateTimeValue (v: any): string {
  const d = toDateObj(v)
  if (!d) return '—'
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

function parseBozzaAttachmentFileCreatedAt (att: AmmAttachmentInfo | null | undefined): number | null {
  const direct = Number(att?.uploadedAt ?? att?.created ?? att?.creationDate ?? att?.createdAt ?? att?.lastEditDate ?? att?.editDate)
  if (Number.isFinite(direct) && direct > 0) return direct
  const kw = String(att?.keywords || '').trim()
  const m = kw.match(/(?:^|[|;\s])fileCreatedAt=(\d{10,})/i) || kw.match(/(?:^|[|;\s])uploadedAt=(\d{10,})/i)
  if (m) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

function formatBozzaAttachmentFileCreatedAt (att: AmmAttachmentInfo | null | undefined): string {
  const ts = parseBozzaAttachmentFileCreatedAt(att)
  return ts ? formatDateTimeValue(ts) : '—'
}

function bozzaPdfAttachmentKeywords (fileCreatedAt = Date.now(), extraKeywords = ''): string {
  const base = `${GII_ATTACHMENT_KEYWORDS.bozzaDeterminazione}|fileCreatedAt=${fileCreatedAt}`
  const extra = String(extraKeywords || '').trim().replace(/^\|+|\|+$/g, '')
  return extra ? `${base}|${extra}` : base
}

function isVerifiedFinalBozzaAttachment (att: AmmAttachmentInfo | null | undefined): boolean {
  const keywords = String(att?.keywords || '')
  return /(?:^|\|)finalVerifiedAgainstApproved=1(?:\||$)/i.test(keywords) ||
    /(?:^|\|)finalVerifiedAgainstPractice=1(?:\||$)/i.test(keywords)
}

function hasAmmAttachmentKeywordFlag (att: AmmAttachmentInfo | null | undefined, flag: string): boolean {
  const wanted = `${String(flag || '').trim().toLowerCase()}=1`
  if (wanted === '=1') return false
  return String(att?.keywords || '')
    .split(/[|;\s]+/)
    .some(part => String(part || '').trim().toLowerCase() === wanted)
}

function ammAttachmentKeywordValue (att: AmmAttachmentInfo | null | undefined, key: string): string {
  const wanted = String(key || '').trim().toLowerCase()
  if (!wanted) return ''
  for (const part of String(att?.keywords || '').split(/[|;\s]+/)) {
    const item = String(part || '').trim()
    const at = item.indexOf('=')
    if (at <= 0) continue
    if (item.slice(0, at).trim().toLowerCase() === wanted) return item.slice(at + 1).trim()
  }
  return ''
}

function isOfficialDeterminationAttachment (att: AmmAttachmentInfo | null | undefined): boolean {
  return !!att && isGiiBozzaDeterminazionePdfAttachment(att) &&
    hasAmmAttachmentKeywordFlag(att, 'official') && (
      hasAmmAttachmentKeywordFlag(att, 'officialCopy') ||
      hasAmmAttachmentKeywordFlag(att, 'signedByDa') // compatibilità con allegati archiviati in precedenza
    )
}

function isSignedAttoContestazioneAttachment (att: AmmAttachmentInfo | null | undefined): boolean {
  return !!att && isGiiAttoContestazionePdfAttachment(att) && (
    hasAmmAttachmentKeywordFlag(att, 'attoFirmatoDa') ||
    hasAmmAttachmentKeywordFlag(att, 'attoFirmato')
  )
}

function isAttoDaFirmareAttachment (att: AmmAttachmentInfo | null | undefined): boolean {
  // La versione da inviare al Direttore non coincide con la bozza approvata dal RIA:
  // deve essere il PDF pulito, rigenerato dall’IA senza filigrana e verificato
  // automaticamente contro il contenuto approvato.
  return !!att &&
    isGiiAttoContestazionePdfAttachment(att) &&
    !isSignedAttoContestazioneAttachment(att) &&
    hasAmmAttachmentKeywordFlag(att, 'attoDaFirmare') &&
    hasAmmAttachmentKeywordFlag(att, 'verifiedAgainstRia')
}

const GII_PAGOPA_ATTACHMENT_KEYWORD = 'GII_AMM_PAGOPA'

function isGiiPagoPaAttachment (att: AmmAttachmentInfo | null | undefined): boolean {
  if (!att) return false
  const keywords = String((att as any)?.keywords || '').toUpperCase()
  const name = String(att?.name || '').toLowerCase()
  return keywords.includes(GII_PAGOPA_ATTACHMENT_KEYWORD) || /(?:pagopa|pago[_ -]?pa)/i.test(name)
}

function extractPagoPaDeadlineMs (textRaw: string): number {
  const text = String(textRaw || '')
    .replace(/[\u00a0\u2000-\u200f\u2028-\u202f\u2060\ufeff]/g, ' ')
    .replace(/\s+/g, ' ')
  const patterns = [
    /(?:data\s+di\s+scadenza|data\s+scadenza|scadenza|entro\s+il)\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})/i,
    /(?:scade\s+il|pagare\s+entro)\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})/i
  ]
  let raw = ''
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) { raw = m[1]; break }
  }
  if (!raw) throw new Error('Nel bollettino pagoPA non è stata individuata una data di scadenza riconoscibile.')
  const parts = raw.split(/[\/.\-]/).map(v => Number(v))
  const [day, month, year] = parts
  if (!day || !month || !year) throw new Error('La data di scadenza letta dal bollettino pagoPA non è valida.')
  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    throw new Error('La data di scadenza letta dal bollettino pagoPA non è valida.')
  }
  return dt.getTime()
}


type GiiPaymentPosition = {
  objectId: number
  globalId: string
  attributes: Record<string, any>
  attachments: AmmAttachmentInfo[]
}

type GiiPagoPaExtractedData = {
  scadenzaMs: number | null
  importo: number | null
  iuv: string
  codiceAvviso: string
}

const GII_PAYMENT_DOCUMENT_KEYWORD = 'GII_PAGAMENTO_DOCUMENTO'
const GII_PAYMENT_LAYER_CACHE: Record<string, any> = {}

function giiPaymentLayerUrl (editable: boolean): string {
  return editable ? GII_VIEW_EDIT_PAGAMENTI_URL : GII_VIEW_PAGAMENTI_URL
}

async function getGiiPaymentLayer (editable: boolean): Promise<any> {
  const url = giiPaymentLayerUrl(editable)
  const cached = GII_PAYMENT_LAYER_CACHE[url]
  if (cached) return cached
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  const layer = new FeatureLayer({ url, outFields: ['*'] })
  if (typeof layer?.load === 'function') await layer.load()
  GII_PAYMENT_LAYER_CACHE[url] = layer
  return layer
}

function giiPaymentPracticeWhere (raw: any): string {
  const variants = globalIdVariantsForLog(raw)
  return variants.length ? variants.map(value => `pratica_globalid = ${sqlQuote(value)}`).join(' OR ') : '1=0'
}

function giiPaymentObjectId (attrs: Record<string, any>, oidField = 'OBJECTID'): number {
  const raw = pickAttrCI(attrs || {}, [oidField, 'OBJECTID'])
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

async function queryGiiPaymentPositions (practiceGlobalId: any, editableAccess: boolean, includeAttachments = true): Promise<GiiPaymentPosition[]> {
  const gid = String(practiceGlobalId ?? '').trim()
  if (!gid) return []
  const layer = await getGiiPaymentLayer(editableAccess)
  const url = giiPaymentLayerUrl(editableAccess)
  const oidField = String(layer?.objectIdField || 'OBJECTID')
  const globalIdField = String(layer?.globalIdField || 'GlobalID')
  const result = await layer.queryFeatures({
    where: giiPaymentPracticeWhere(gid),
    outFields: ['*'],
    returnGeometry: false,
    orderByFields: ['piano_pagamento ASC', 'numero_rata ASC', `${oidField} ASC`]
  })
  const rows: GiiPaymentPosition[] = []
  for (const feature of (result?.features || [])) {
    const attrs = { ...(feature?.attributes || {}) }
    const objectId = giiPaymentObjectId(attrs, oidField)
    if (!objectId) continue
    let attachments: AmmAttachmentInfo[] = []
    if (includeAttachments) {
      try { attachments = await queryAmmAttachments(layer, objectId, url) } catch { attachments = [] }
    }
    rows.push({
      objectId,
      globalId: String(pickAttrCI(attrs, [globalIdField, 'GlobalID']) || '').trim(),
      attributes: attrs,
      attachments
    })
  }
  return rows.sort((a, b) => {
    const ta = String(pickAttrCI(a.attributes, ['tipo_posizione']) || '').toUpperCase()
    const tb = String(pickAttrCI(b.attributes, ['tipo_posizione']) || '').toUpperCase()
    if (ta !== tb) {
      if (ta === 'UNICA_SOLUZIONE') return -1
      if (tb === 'UNICA_SOLUZIONE') return 1
    }
    const pa = String(pickAttrCI(a.attributes, ['piano_pagamento']) || '')
    const pb = String(pickAttrCI(b.attributes, ['piano_pagamento']) || '')
    if (pa !== pb) return pa.localeCompare(pb, 'it')
    return (Number(pickAttrCI(a.attributes, ['numero_rata'])) || 0) - (Number(pickAttrCI(b.attributes, ['numero_rata'])) || 0)
  })
}

function throwPaymentEditFailure (result: any, actionLabel: string): void {
  const buckets = [result?.addFeatureResults, result?.updateFeatureResults, result?.deleteFeatureResults, result?.addResults, result?.updateResults, result?.deleteResults]
  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue
    for (const row of bucket) {
      if (row?.error || row?.success === false) {
        const err = row?.error || {}
        throw new Error(`${actionLabel}: ${String(err?.message || err?.description || 'operazione non riuscita')}`)
      }
    }
  }
}

async function addGiiPaymentPositions (attributesList: Array<Record<string, any>>): Promise<void> {
  if (!attributesList.length) return
  const layer = await getGiiPaymentLayer(true)
  const result = await layer.applyEdits({ addFeatures: attributesList.map(attributes => ({ attributes })) })
  throwPaymentEditFailure(result, 'Creazione delle posizioni di pagamento non riuscita')
}

async function updateGiiPaymentPosition (objectId: number, attrs: Record<string, any>): Promise<void> {
  if (!objectId) return
  const layer = await getGiiPaymentLayer(true)
  const oidField = String(layer?.objectIdField || 'OBJECTID')
  const result = await layer.applyEdits({ updateFeatures: [{ attributes: { ...attrs, [oidField]: objectId } }] })
  throwPaymentEditFailure(result, 'Aggiornamento della posizione di pagamento non riuscito')
}

async function giiPaymentDeleteGraphics (layer: any, objectIds: number[]): Promise<any[]> {
  const Graphic = await loadEsriModule<any>('esri/Graphic')
  const oidField = String(layer?.objectIdField || 'OBJECTID')
  return objectIds
    .filter(objectId => Number.isFinite(Number(objectId)) && Number(objectId) > 0)
    .map(objectId => new Graphic({ attributes: { [oidField]: Number(objectId) } }))
}

async function replaceGiiPaymentPositions (positions: GiiPaymentPosition[], attributesList: Array<Record<string, any>>): Promise<void> {
  const layer = await getGiiPaymentLayer(true)
  // FeatureLayer.applyEdits richiede Graphic reali per deleteFeatures. Passare
  // semplici oggetti { objectId } può generare internamente "getAttribute is not a function".
  const deleteFeatures = await giiPaymentDeleteGraphics(layer, positions.map(row => row.objectId))
  const result = await layer.applyEdits({
    deleteFeatures,
    addFeatures: attributesList.map(attributes => ({ attributes }))
  }, { rollbackOnFailureEnabled: true })
  throwPaymentEditFailure(result, 'Ricreazione delle posizioni di pagamento non riuscita')
}

function giiPaymentModeForPosition (practiceMode: PaymentMode): string | null {
  if (practiceMode === 'PAGOPA') return 'PAGOPA'
  if (practiceMode === 'BONIFICO') return 'BONIFICO'
  // Per MISTO e ALTRO la modalità effettiva appartiene alla singola posizione
  // (pagoPA, bonifico, bollettino postale o altra modalità).
  return null
}

function giiPaymentInstallmentAmounts (totalRaw: any, rateCount: number): number[] {
  const total = Math.max(0, parseNumberInput(totalRaw) || 0)
  const count = Math.max(0, Math.trunc(Number(rateCount) || 0))
  if (count <= 0) return []
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / count)
  let remainder = cents - (base * count)
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const value = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
    out.push(value / 100)
  }
  return out
}

function buildGiiPaymentPlanAttributes (
  practiceGlobalId: string,
  practiceMode: PaymentMode,
  totalRaw: any,
  rateCountRaw: number,
  username: string
): Array<Record<string, any>> {
  const total = Math.max(0, parseNumberInput(totalRaw) || 0)
  if (!(total > 0)) return []
  const rateCount = Math.max(0, Math.trunc(Number(rateCountRaw) || 0))
  if (rateCount === 1 || rateCount < 0) throw new Error('Il numero di rate deve essere 0 oppure almeno 2.')
  const now = Date.now()
  const mode = giiPaymentModeForPosition(practiceMode)
  const baseAudit = {
    pratica_globalid: practiceGlobalId,
    modalita_pagamento: mode,
    stato_pagamento: 'DA_PAGARE',
    creato_il: now,
    creato_da: username || null,
    aggiornato_il: now,
    aggiornato_da: username || null
  }
  const rows: Array<Record<string, any>> = [{
    ...baseAudit,
    tipo_posizione: 'UNICA_SOLUZIONE',
    piano_pagamento: 'UNICA',
    numero_rata: null,
    numero_rate: 1,
    importo_dovuto: roundMoneyValue(total),
    scadenza: null,
    tipo_riferimento: null,
    riferimento_pagamento: null,
    tipo_riferimento_secondario: null,
    riferimento_secondario: null,
    importo_pagato: null,
    data_pagamento: null,
    note: null
  }]
  if (rateCount >= 2) {
    const amounts = giiPaymentInstallmentAmounts(total, rateCount)
    for (let i = 0; i < rateCount; i++) {
      rows.push({
        ...baseAudit,
        tipo_posizione: 'RATA',
        piano_pagamento: `RATE_${rateCount}`,
        numero_rata: i + 1,
        numero_rate: rateCount,
        importo_dovuto: amounts[i],
        scadenza: null,
        tipo_riferimento: null,
        riferimento_pagamento: null,
        tipo_riferimento_secondario: null,
        riferimento_secondario: null,
        importo_pagato: null,
        data_pagamento: null,
        note: null
      })
    }
  }
  return rows
}

function giiPaymentRateCount (positions: GiiPaymentPosition[]): number {
  const rateRows = positions.filter(row => String(pickAttrCI(row.attributes, ['tipo_posizione']) || '').toUpperCase() === 'RATA')
  if (!rateRows.length) return 0
  const declared = Math.max(...rateRows.map(row => Number(pickAttrCI(row.attributes, ['numero_rate'])) || 0))
  return declared > 0 ? declared : rateRows.length
}

function giiPaymentReferenceValue (attrs: Record<string, any>, typeWanted: string): string {
  const wanted = String(typeWanted || '').toUpperCase()
  const type1 = String(pickAttrCI(attrs, ['tipo_riferimento']) || '').toUpperCase()
  const type2 = String(pickAttrCI(attrs, ['tipo_riferimento_secondario']) || '').toUpperCase()
  if (type1 === wanted) return String(pickAttrCI(attrs, ['riferimento_pagamento']) || '').trim()
  if (type2 === wanted) return String(pickAttrCI(attrs, ['riferimento_secondario']) || '').trim()
  return ''
}

function giiPaymentPositionLabel (attrs: Record<string, any>): string {
  const type = String(pickAttrCI(attrs, ['tipo_posizione']) || '').toUpperCase()
  if (type === 'UNICA_SOLUZIONE') return 'Unica soluzione'
  if (type === 'RATA') {
    const n = Number(pickAttrCI(attrs, ['numero_rata'])) || 0
    const total = Number(pickAttrCI(attrs, ['numero_rate'])) || 0
    return n > 0 && total > 0 ? `Rata ${n} di ${total}` : (n > 0 ? `Rata ${n}` : 'Rata')
  }
  return domainLabel(null, pickAttrCI(attrs, ['tipo_posizione']))
}

function giiPaymentModeLabel (codeRaw: any): string {
  const code = String(codeRaw || '').toUpperCase()
  if (code === 'PAGOPA') return 'pagoPA'
  if (code === 'BONIFICO') return 'Bonifico'
  if (code === 'BOLLETTINO') return 'Bollettino postale'
  if (code === 'ALTRO') return 'Altro'
  return code || 'Da definire'
}

const GII_PAYMENT_EDITABLE_FIELDS = [
  'modalita_pagamento',
  'importo_dovuto',
  'scadenza',
  'tipo_riferimento',
  'riferimento_pagamento',
  'tipo_riferimento_secondario',
  'riferimento_secondario',
  'note'
]

function giiPaymentComparableValue (fieldName: string, raw: any): any {
  if (fieldName === 'importo_dovuto') return parseNumberInput(raw)
  if (fieldName === 'scadenza') return dateMsOrNull(raw)
  return String(raw ?? '').trim()
}

function giiPaymentDraftChanged (saved: Record<string, any>, draft: Record<string, any>): boolean {
  return GII_PAYMENT_EDITABLE_FIELDS.some(name =>
    giiPaymentComparableValue(name, pickAttrCI(saved || {}, [name])) !==
    giiPaymentComparableValue(name, pickAttrCI(draft || {}, [name]))
  )
}

function giiPaymentActivePositions (positions: GiiPaymentPosition[]): GiiPaymentPosition[] {
  return positions.filter(row => String(pickAttrCI(row.attributes, ['stato_pagamento']) || '').toUpperCase() !== 'ANNULLATO')
}

function giiPaymentValidationIssues (positions: GiiPaymentPosition[], totalRaw: any, practiceMode: PaymentMode): string[] {
  const total = Math.max(0, parseNumberInput(totalRaw) || 0)
  if (!(total > 0)) return []
  const active = giiPaymentActivePositions(positions)
  const issues: string[] = []
  if (!active.length) return ['Configurare le posizioni di pagamento.']
  const unica = active.filter(row => String(pickAttrCI(row.attributes, ['tipo_posizione']) || '').toUpperCase() === 'UNICA_SOLUZIONE')
  if (unica.length !== 1) issues.push('Deve essere presente una sola posizione in unica soluzione.')
  const expectedMode = giiPaymentModeForPosition(practiceMode)
  for (const row of active) {
    const attrs = row.attributes || {}
    const label = giiPaymentPositionLabel(attrs)
    const mode = String(pickAttrCI(attrs, ['modalita_pagamento']) || '').toUpperCase()
    const amount = Math.max(0, parseNumberInput(pickAttrCI(attrs, ['importo_dovuto'])) || 0)
    if (!mode) issues.push(`${label}: indicare la modalità di pagamento.`)
    if (expectedMode && mode && mode !== expectedMode) issues.push(`${label}: la modalità non è coerente con quella stabilita nell’Atto.`)
    if (!(amount > 0)) issues.push(`${label}: indicare l’importo dovuto.`)
    if (!hasAdminValue(pickAttrCI(attrs, ['scadenza']))) issues.push(`${label}: indicare la scadenza.`)
    if (mode === 'PAGOPA') {
      if (!giiPaymentReferenceValue(attrs, 'IUV')) issues.push(`${label}: indicare l’IUV.`)
      if (!giiPaymentReferenceValue(attrs, 'CODICE_AVVISO')) issues.push(`${label}: indicare il codice avviso.`)
      if (!row.attachments.length) issues.push(`${label}: caricare il relativo avviso pagoPA.`)
    }
    if (mode === 'BOLLETTINO' && !row.attachments.length) issues.push(`${label}: caricare il relativo bollettino.`)
  }
  if (unica.length === 1) {
    const amount = Math.max(0, parseNumberInput(pickAttrCI(unica[0].attributes, ['importo_dovuto'])) || 0)
    if (Math.abs(amount - total) > 0.009) issues.push(`L’importo dell’unica soluzione deve essere ${formatEuroText(total)}.`)
  }
  const rateRows = active.filter(row => String(pickAttrCI(row.attributes, ['tipo_posizione']) || '').toUpperCase() === 'RATA')
  const byPlan = new Map<string, GiiPaymentPosition[]>()
  for (const row of rateRows) {
    const plan = String(pickAttrCI(row.attributes, ['piano_pagamento']) || '').trim() || 'RATE'
    const list = byPlan.get(plan) || []
    list.push(row)
    byPlan.set(plan, list)
  }
  for (const [plan, rows] of byPlan) {
    const declared = Math.max(...rows.map(row => Number(pickAttrCI(row.attributes, ['numero_rate'])) || 0))
    if (declared < 2 || rows.length !== declared) issues.push(`${plan}: il numero delle rate non coincide con le posizioni presenti.`)
    const nums = rows.map(row => Number(pickAttrCI(row.attributes, ['numero_rata'])) || 0).sort((a, b) => a - b)
    if (declared >= 2 && nums.some((n, idx) => n !== idx + 1)) issues.push(`${plan}: la numerazione delle rate non è completa.`)
    const sum = roundMoneyValue(rows.reduce((acc, row) => acc + Math.max(0, parseNumberInput(pickAttrCI(row.attributes, ['importo_dovuto'])) || 0), 0))
    if (Math.abs(sum - total) > 0.009) issues.push(`${plan}: la somma delle rate deve essere ${formatEuroText(total)}.`)
  }
  return Array.from(new Set(issues))
}

function earliestGiiPaymentDeadline (positions: GiiPaymentPosition[]): number | null {
  const deadlines = giiPaymentActivePositions(positions)
    .map(row => dateMsOrNull(pickAttrCI(row.attributes, ['scadenza'])))
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b)
  return deadlines.length ? deadlines[0] : null
}

function extractPagoPaStructuredData (textRaw: string): GiiPagoPaExtractedData {
  const text = String(textRaw || '')
    .replace(/[\u00a0\u2000-\u200f\u2028-\u202f\u2060\ufeff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  let scadenzaMs: number | null = null
  try { scadenzaMs = extractPagoPaDeadlineMs(text) } catch {}

  const refMatch = (patterns: RegExp[]): string => {
    for (const re of patterns) {
      const m = text.match(re)
      if (m?.[1]) return String(m[1]).replace(/[\s.\-]+/g, '').trim()
    }
    return ''
  }

  let iuv = refMatch([
    /(?:\bI\.?\s*U\.?\s*V\.?\b|identificativo\s+univoco\s+(?:di\s+)?versamento)\s*(?:n(?:umero)?\.?|codice)?\s*[:\-]?\s*([0-9][0-9\s.\-]{8,34})/i,
    /(?:identificativo\s+pagamento|id\s+versamento)\s*[:\-]?\s*([0-9][0-9\s.\-]{8,34})/i
  ])
  let codiceAvviso = refMatch([
    /(?:codice|numero)\s+(?:dell[’']?\s*)?(?:di\s+)?avviso\s*[:\-]?\s*([0-9][0-9\s.\-]{10,34})/i,
    /avviso\s+(?:di\s+pagamento\s+)?(?:n(?:umero)?\.?|codice)\s*[:\-]?\s*([0-9][0-9\s.\-]{10,34})/i
  ])

  // Negli avvisi pagoPA il numero avviso è normalmente di 18 cifre e contiene
  // l'IUV dopo la cifra ausiliaria. Usiamo questa derivazione solo come fallback
  // quando il PDF non espone una label IUV separata.
  if (!iuv && /^\d{18}$/.test(codiceAvviso)) iuv = codiceAvviso.slice(1)

  if (!codiceAvviso) {
    const longNums = Array.from(text.matchAll(/(?:^|\D)(\d(?:[\s.\-]*\d){17})(?!\d)/g))
      .map(m => String(m[1] || '').replace(/[\s.\-]+/g, ''))
      .filter(v => /^\d{18}$/.test(v))
    if (longNums.length === 1) {
      codiceAvviso = longNums[0]
      if (!iuv) iuv = codiceAvviso.slice(1)
    }
  }

  let importo: number | null = null
  const amountPatterns = [
    /(?:importo\s+(?:da\s+pagare|dovuto|totale)?|totale\s+(?:da\s+pagare|dovuto)|quanto\s+(?:devi\s+)?pagare)\s*[:\-]?\s*(?:€|eur|euro)?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+[.,][0-9]{2})/i,
    /(?:€|eur|euro)\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+[.,][0-9]{2})/i,
    /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+[.,][0-9]{2})\s*(?:€|eur|euro)/i
  ]
  for (const re of amountPatterns) {
    const m = text.match(re)
    if (!m?.[1]) continue
    const value = parseNumberInput(m[1])
    if (value != null && value >= 0) { importo = roundMoneyValue(value); break }
  }
  return { scadenzaMs, importo, iuv, codiceAvviso }
}

type GiiPagoPaBatchPlanItem = {
  file: File
  parsed: GiiPagoPaExtractedData
  attributes: Record<string, any>
}

function buildGiiPagoPaBatchPlan (
  parsedFiles: Array<{ file: File, parsed: GiiPagoPaExtractedData }>,
  practiceGlobalId: string,
  totalRaw: any,
  username: string
): GiiPagoPaBatchPlanItem[] {
  const total = Math.max(0, parseNumberInput(totalRaw) || 0)
  const totalCents = Math.round(total * 100)
  if (!(totalCents > 0)) throw new Error('Il totale da pagare non è disponibile.')
  if (!parsedFiles.length) throw new Error('Selezionare almeno un avviso pagoPA.')

  const normalized = parsedFiles.map(entry => {
    const name = String(entry.file?.name || 'avviso pagoPA')
    const amount = entry.parsed.importo
    if (amount == null || !(amount > 0)) throw new Error(`“${name}”: importo non riconosciuto.`)
    if (entry.parsed.scadenzaMs == null) throw new Error(`“${name}”: scadenza non riconosciuta.`)
    if (!entry.parsed.iuv) throw new Error(`“${name}”: IUV non riconosciuto.`)
    if (!entry.parsed.codiceAvviso) throw new Error(`“${name}”: codice avviso non riconosciuto.`)
    return { ...entry, amountCents: Math.round(amount * 100) }
  })

  const duplicateValues = (values: string[], label: string) => {
    const seen = new Set<string>()
    for (const raw of values) {
      const value = String(raw || '').trim()
      if (!value) continue
      if (seen.has(value)) throw new Error(`${label} duplicato nel gruppo di avvisi: ${value}.`)
      seen.add(value)
    }
  }
  duplicateValues(normalized.map(v => v.parsed.iuv), 'IUV')
  duplicateValues(normalized.map(v => v.parsed.codiceAvviso), 'Codice avviso')

  const unicaCandidates = normalized.filter(v => v.amountCents === totalCents)
  if (unicaCandidates.length !== 1) {
    throw new Error(`Deve essere presente un solo avviso in unica soluzione di ${formatEuroText(total)}; ne sono stati riconosciuti ${unicaCandidates.length}.`)
  }
  const unica = unicaCandidates[0]
  const rates = normalized.filter(v => v !== unica)
  if (rates.length === 1) throw new Error('Il gruppo contiene una sola rata oltre all’unica soluzione. Un piano rateale deve contenere almeno 2 rate.')

  if (rates.length >= 2) {
    const rateSum = rates.reduce((sum, row) => sum + row.amountCents, 0)
    if (rateSum !== totalCents) {
      throw new Error(`La somma delle rate (${formatEuroText(rateSum / 100)}) non coincide con il totale dovuto (${formatEuroText(total)}).`)
    }
    // Le rate devono rappresentare una ripartizione uniforme del totale; quando
    // i centesimi non sono divisibili esattamente è ammesso il normale scarto di 1 centesimo.
    const expected = giiPaymentInstallmentAmounts(total, rates.length).map(v => Math.round(v * 100)).sort((a, b) => a - b)
    const actual = rates.map(v => v.amountCents).sort((a, b) => a - b)
    if (expected.length !== actual.length || expected.some((value, idx) => value !== actual[idx])) {
      throw new Error(`Gli importi delle ${rates.length} rate non corrispondono alla ripartizione del totale dovuto. È ammesso soltanto l’eventuale scarto di 1 centesimo dovuto all’arrotondamento.`)
    }
  }

  rates.sort((a, b) => {
    const da = Number(a.parsed.scadenzaMs) || 0
    const db = Number(b.parsed.scadenzaMs) || 0
    if (da !== db) return da - db
    return String(a.file.name || '').localeCompare(String(b.file.name || ''), 'it')
  })

  const now = Date.now()
  const base = {
    pratica_globalid: practiceGlobalId,
    modalita_pagamento: 'PAGOPA',
    stato_pagamento: 'DA_PAGARE',
    creato_il: now,
    creato_da: username || null,
    aggiornato_il: now,
    aggiornato_da: username || null,
    importo_pagato: null,
    data_pagamento: null,
    note: null
  }
  const toItem = (entry: typeof unica, type: 'UNICA_SOLUZIONE' | 'RATA', index: number, count: number): GiiPagoPaBatchPlanItem => ({
    file: entry.file,
    parsed: entry.parsed,
    attributes: {
      ...base,
      tipo_posizione: type,
      piano_pagamento: type === 'UNICA_SOLUZIONE' ? 'UNICA' : `RATE_${count}`,
      numero_rata: type === 'RATA' ? index : null,
      numero_rate: type === 'RATA' ? count : 1,
      importo_dovuto: roundMoneyValue(entry.amountCents / 100),
      scadenza: entry.parsed.scadenzaMs,
      tipo_riferimento: 'IUV',
      riferimento_pagamento: entry.parsed.iuv,
      tipo_riferimento_secondario: 'CODICE_AVVISO',
      riferimento_secondario: entry.parsed.codiceAvviso
    }
  })

  return [toItem(unica, 'UNICA_SOLUZIONE', 0, 1), ...rates.map((entry, idx) => toItem(entry, 'RATA', idx + 1, rates.length))]
}

function giiPaymentDocumentKeywords (row: GiiPaymentPosition, modeRaw: any): string {
  return [
    GII_PAYMENT_DOCUMENT_KEYWORD,
    `paymentGlobalId=${encodeURIComponent(String(row.globalId || ''))}`,
    `paymentObjectId=${Number(row.objectId) || 0}`,
    `paymentMode=${encodeURIComponent(String(modeRaw || ''))}`,
    `fileCreatedAt=${Date.now()}`
  ].join('|')
}

function dispatchGiiPaymentsChanged (practiceGlobalId: any): void {
  try {
    window.dispatchEvent(new CustomEvent('gii-pagamenti-changed', { detail: { practiceGlobalId: String(practiceGlobalId || ''), ts: Date.now() } }))
  } catch {}
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
      url: a?.url,
      keywords: a?.keywords,
      created: Number(a?.created),
      creationDate: Number(a?.creationDate),
      createdAt: Number(a?.createdAt),
      lastEditDate: Number(a?.lastEditDate),
      editDate: Number(a?.editDate),
      uploadedAt: Number(a?.uploadedAt)
    }))
    .filter(a => Number.isFinite(a.id) && a.id > 0)
}

function isBozzaDeterminazioneSpecialAttachment (att: AmmAttachmentInfo | null | undefined): boolean {
  return isGiiBozzaDeterminazionePdfAttachment(att as any) || isGiiLegacyBozzaDeterminazioneWordAttachment(att as any)
}

async function deleteBozzaDeterminazioneAttachments (layer: any, oid: number, layerUrl: string): Promise<void> {
  if (!oid || !layerUrl) return
  const all = await queryAmmAttachments(layer, oid, layerUrl)
  const bozze = all.filter(isBozzaDeterminazioneSpecialAttachment)
  for (const att of bozze) {
    const id = Number(att.id)
    if (Number.isFinite(id) && id > 0) await deleteAmmAttachment(layer, oid, id, layerUrl)
  }
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

async function addAmmAttachments (layer: any, oid: number, files: File[], layerUrl: string, keywords?: string): Promise<number[]> {
  if (!oid || !Array.isArray(files) || files.length === 0) return []
  if (!layerUrl) throw new Error('Allegati non disponibili.')

  const addedIds: number[] = []
  const token = await getEsriTokenForUrl(layerUrl)
  for (const file of files) {
    const fd = new FormData()
    fd.append('attachment', file)
    fd.append('f', 'json')
    if (keywords) fd.append('keywords', keywords)
    if (token) fd.append('token', token)
    const resp = await fetch(`${layerUrl}/${Number(oid)}/addAttachment`, { method: 'POST', body: fd })
    const json: any = await resp.json().catch(() => ({}))
    const addRes = json?.addAttachmentResult || json
    if (!resp.ok || addRes?.error || json?.error) {
      throw new Error(String(addRes?.error?.message || json?.error?.message || `HTTP ${resp.status}`))
    }
    const addedId = Number(addRes?.objectId ?? addRes?.id ?? addRes?.attachmentId)
    if (Number.isFinite(addedId) && addedId > 0) addedIds.push(addedId)
  }
  return addedIds
}

async function deleteAmmAttachment (layer: any, oid: number, attachmentId: number, layerUrl: string): Promise<void> {
  if (!oid || !attachmentId) return
  if (!layerUrl) throw new Error('Allegati non disponibili.')

  const token = await getEsriTokenForUrl(layerUrl)
  const fd = new FormData()
  fd.append('f', 'json')
  fd.append('attachmentIds', String(attachmentId))
  if (token) fd.append('token', token)
  const resp = await fetch(`${layerUrl}/${Number(oid)}/deleteAttachments`, { method: 'POST', body: fd })
  const json: any = await resp.json().catch(() => ({}))
  const result = Array.isArray(json?.deleteAttachmentResults) ? json.deleteAttachmentResults[0] : null
  const err = json?.error || result?.error || null
  if (!resp.ok || err || result?.success === false) {
    throw new Error(String(err?.description || err?.message || `HTTP ${resp.status}`))
  }
}


async function updateAmmAttachmentFile (
  oid: number,
  attachmentId: number,
  file: File,
  layerUrl: string
): Promise<void> {
  if (!oid || !attachmentId || !file) throw new Error('Allegato non disponibile per la sostituzione.')
  if (!layerUrl) throw new Error('Allegati non disponibili.')

  const token = await getEsriTokenForUrl(layerUrl)
  const fd = new FormData()
  fd.append('attachmentId', String(attachmentId))
  fd.append('attachment', file)
  fd.append('f', 'json')
  if (token) fd.append('token', token)
  const resp = await fetch(`${layerUrl}/${Number(oid)}/updateAttachment`, { method: 'POST', body: fd, cache: 'no-store' })
  const json: any = await resp.json().catch(() => ({}))
  const result = json?.updateAttachmentResult || json
  const err = json?.error || result?.error || null
  if (!resp.ok || err || result?.success === false) {
    throw new Error(String(err?.description || err?.message || `HTTP ${resp.status}`))
  }
}

function protocolloFascicoloSnapshotKeywords (
  item: ProtocolloFascicoloManifestItem,
  protocol: OfficialProtocolMetadata,
  batchCreatedAt: number
): string {
  return [
    GII_ATTACHMENT_KEYWORDS.protocolloFascicoloPdf,
    `protocolDocKey=${encodeURIComponent(String(item.docKey || ''))}`,
    `protocolDocIndex=${Number(item.index) || 0}`,
    `protocolNumber=${encodeURIComponent(String(protocol.numero || ''))}`,
    `protocolDate=${new Date(protocol.dataMs).toISOString().slice(0, 10)}`,
    `protocolBatch=${Number(batchCreatedAt) || Date.now()}`,
    `fileCreatedAt=${Date.now()}`
  ].join('|')
}

function protocolloFriendlyPdfName (item: ProtocolloFascicoloManifestItem, fallback: string): string {
  const original = String(item.sourceAttachmentName || '').trim()
  const raw = original || String(fallback || '').trim() || `${item.docKey}.pdf`
  const base = raw.replace(/\.[^.]+$/, '').replace(/_protocollat[oa]$/i, '').trim() || String(item.docKey || 'documento')
  return sanitizeEmailFileName(`${base}_protocollato.pdf`, 'documento_protocollato.pdf')
}

function normalizeProtocolloReturnFileName (value: any): string {
  return String(value || '')
    .replace(/^.*[\\/]/, '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
}


function protocolloFascicoloManifestKeywords (createdAt: number): string {
  return `${GII_ATTACHMENT_KEYWORDS.protocolloFascicoloManifest}|fileCreatedAt=${createdAt}`
}

async function saveProtocolloFascicoloManifest (
  layer: any,
  oid: number,
  layerUrl: string,
  manifest: ProtocolloFascicoloManifest
): Promise<void> {
  const before = await queryAmmAttachments(layer, oid, layerUrl)
  const oldManifests = before.filter(att => isGiiProtocolloFascicoloManifestAttachment(att as any))
  const createdAt = Number(manifest.createdAt) || Date.now()
  const file = new File(
    [JSON.stringify(manifest, null, 2)],
    `gii_protocollo_fascicolo_manifest_${Number(oid)}_${createdAt}.json`,
    { type: 'application/json', lastModified: createdAt }
  )
  const ids = await addAmmAttachments(layer, oid, [file], layerUrl, protocolloFascicoloManifestKeywords(createdAt))
  const keepId = Number(ids?.[0])
  if (!Number.isFinite(keepId) || keepId <= 0) {
    throw new Error('Impossibile registrare la composizione del fascicolo trasmesso al protocollo.')
  }
  for (const att of oldManifests) {
    const id = Number(att.id)
    if (!Number.isFinite(id) || id <= 0 || id === keepId) continue
    try { await deleteAmmAttachment(layer, oid, id, layerUrl) } catch {}
  }
}

async function loadProtocolloFascicoloManifest (
  layer: any,
  oid: number,
  layerUrl: string
): Promise<ProtocolloFascicoloManifest> {
  const all = await queryAmmAttachments(layer, oid, layerUrl)
  const manifestAtt = pickLatestGiiAttachment(
    all.filter(att => isGiiProtocolloFascicoloManifestAttachment(att as any)) as any[]
  ) as AmmAttachmentInfo | null
  if (!manifestAtt) {
    throw new Error('Non è disponibile la composizione del fascicolo trasmesso al protocollo. Predisporre nuovamente la trasmissione.')
  }
  const blob = await fetchAmmAttachmentBlobForPdf(manifestAtt, oid, layerUrl)
  let parsed: any = null
  try { parsed = JSON.parse(await blob.text()) } catch {}
  const items = Array.isArray(parsed?.items) ? parsed.items : []
  if (Number(parsed?.version) !== 1 || Number(parsed?.oid) !== Number(oid) || !items.length) {
    throw new Error('La composizione registrata del fascicolo trasmesso al protocollo non è valida.')
  }
  const normalizedItems: ProtocolloFascicoloManifestItem[] = items.map((item: any, idx: number) => ({
    index: Number.isFinite(Number(item?.index)) ? Math.trunc(Number(item.index)) : idx,
    fileName: String(item?.fileName || '').trim(),
    docKey: String(item?.docKey || '').trim(),
    sourceAttachmentId: Number.isFinite(Number(item?.sourceAttachmentId)) ? Number(item.sourceAttachmentId) : undefined,
    sourceAttachmentKind: String(item?.sourceAttachmentKind || '') === 'administrative' ? 'administrative' : (String(item?.sourceAttachmentKind || '') === 'technical' ? 'technical' : undefined),
    sourceStore: String(item?.sourceStore || '') === 'payment' ? 'payment' : (String(item?.sourceStore || '') === 'practice' ? 'practice' : undefined),
    sourceParentOid: Number.isFinite(Number(item?.sourceParentOid)) ? Number(item.sourceParentOid) : undefined,
    sourceAttachmentName: String(item?.sourceAttachmentName || '').trim() || undefined,
    sourceAttachmentKeywords: String(item?.sourceAttachmentKeywords || '').trim() || undefined
  })).filter((item: ProtocolloFascicoloManifestItem) => !!item.fileName && !!item.docKey)
  if (!normalizedItems.length) throw new Error('La composizione registrata del fascicolo trasmesso al protocollo è vuota.')
  return {
    version: 1,
    oid: Number(oid),
    reportCode: String(parsed?.reportCode || ''),
    createdAt: Number(parsed?.createdAt) || 0,
    items: normalizedItems.sort((a, b) => a.index - b.index)
  }
}

function protocolloAttoManifestKeywords (createdAt: number): string {
  return `${GII_ATTACHMENT_KEYWORDS.protocolloAttoManifest}|fileCreatedAt=${createdAt}`
}

async function saveProtocolloAttoManifest (
  layer: any,
  oid: number,
  layerUrl: string,
  manifest: ProtocolloFascicoloManifest
): Promise<void> {
  const before = await queryAmmAttachments(layer, oid, layerUrl)
  const oldManifests = before.filter(att => isGiiProtocolloAttoManifestAttachment(att as any))
  const createdAt = Number(manifest.createdAt) || Date.now()
  const file = new File(
    [JSON.stringify(manifest, null, 2)],
    `gii_protocollo_atto_manifest_${Number(oid)}_${createdAt}.json`,
    { type: 'application/json', lastModified: createdAt }
  )
  const ids = await addAmmAttachments(layer, oid, [file], layerUrl, protocolloAttoManifestKeywords(createdAt))
  const keepId = Number(ids?.[0])
  if (!Number.isFinite(keepId) || keepId <= 0) {
    throw new Error('Impossibile registrare la composizione della trasmissione dell’Atto al protocollo.')
  }
  for (const att of oldManifests) {
    const id = Number(att.id)
    if (!Number.isFinite(id) || id <= 0 || id === keepId) continue
    try { await deleteAmmAttachment(layer, oid, id, layerUrl) } catch {}
  }
}

async function loadProtocolloAttoManifest (
  layer: any,
  oid: number,
  layerUrl: string
): Promise<ProtocolloFascicoloManifest> {
  const all = await queryAmmAttachments(layer, oid, layerUrl)
  const manifestAtt = pickLatestGiiAttachment(
    all.filter(att => isGiiProtocolloAttoManifestAttachment(att as any)) as any[]
  ) as AmmAttachmentInfo | null
  if (!manifestAtt) {
    throw new Error('Non è disponibile la composizione della trasmissione dell’Atto al protocollo. Predisporre nuovamente l’e-mail.')
  }
  const blob = await fetchAmmAttachmentBlobForPdf(manifestAtt, oid, layerUrl)
  let parsed: any = null
  try { parsed = JSON.parse(await blob.text()) } catch {}
  const items = Array.isArray(parsed?.items) ? parsed.items : []
  if (Number(parsed?.version) !== 1 || Number(parsed?.oid) !== Number(oid) || !items.length) {
    throw new Error('La composizione registrata della trasmissione dell’Atto al protocollo non è valida.')
  }
  const normalizedItems: ProtocolloFascicoloManifestItem[] = items.map((item: any, idx: number) => ({
    index: Number.isFinite(Number(item?.index)) ? Math.trunc(Number(item.index)) : idx,
    fileName: String(item?.fileName || '').trim(),
    docKey: String(item?.docKey || '').trim(),
    sourceAttachmentId: Number.isFinite(Number(item?.sourceAttachmentId)) ? Number(item.sourceAttachmentId) : undefined,
    sourceAttachmentKind: String(item?.sourceAttachmentKind || '') === 'administrative' ? 'administrative' : (String(item?.sourceAttachmentKind || '') === 'technical' ? 'technical' : undefined),
    sourceStore: String(item?.sourceStore || '') === 'payment' ? 'payment' : (String(item?.sourceStore || '') === 'practice' ? 'practice' : undefined),
    sourceParentOid: Number.isFinite(Number(item?.sourceParentOid)) ? Number(item.sourceParentOid) : undefined,
    sourceAttachmentName: String(item?.sourceAttachmentName || '').trim() || undefined,
    sourceAttachmentKeywords: String(item?.sourceAttachmentKeywords || '').trim() || undefined
  })).filter((item: ProtocolloFascicoloManifestItem) => !!item.fileName && !!item.docKey)
  if (!normalizedItems.length) throw new Error('La composizione registrata della trasmissione dell’Atto al protocollo è vuota.')
  return {
    version: 1,
    oid: Number(oid),
    reportCode: String(parsed?.reportCode || ''),
    createdAt: Number(parsed?.createdAt) || 0,
    items: normalizedItems.sort((a, b) => a.index - b.index)
  }
}


async function replaceBozzaDeterminazionePdfAttachment (layer: any, oid: number, file: File, layerUrl: string, extraKeywords = ''): Promise<AmmAttachmentInfo[]> {
  if (!oid || !file) return []
  if (!layerUrl) throw new Error('Documento non disponibile.')

  // Prima di aggiungere una nuova versione sanifichiamo eventuali duplicati
  // preesistenti, conservando la copia più recente. In questo modo un vecchio
  // errore non viene moltiplicato dalle sostituzioni successive.
  let before = await queryAmmAttachments(layer, oid, layerUrl)
  let beforePdfs = before.filter(isGiiBozzaDeterminazionePdfAttachment)
  if (beforePdfs.length > 1) {
    const keepExisting = pickLatestGiiAttachment(beforePdfs as any[]) as AmmAttachmentInfo | null
    if (keepExisting) {
      for (const att of beforePdfs) {
        if (Number(att.id) === Number(keepExisting.id)) continue
        await deleteAmmAttachment(layer, oid, Number(att.id), layerUrl)
      }
      before = await queryAmmAttachments(layer, oid, layerUrl)
      beforePdfs = before.filter(isGiiBozzaDeterminazionePdfAttachment)
      if (beforePdfs.length > 1) throw new Error('Impossibile ripulire le copie duplicate del PDF della Determinazione.')
    }
  }

  const beforeIds = new Set(before.map(att => Number(att.id)).filter(id => Number.isFinite(id) && id > 0))
  const fileCreatedAt = Number((file as any)?.lastModified) || Date.now()
  const addedIds = await addAmmAttachments(layer, oid, [file], layerUrl, bozzaPdfAttachmentKeywords(fileCreatedAt, extraKeywords))
  const afterAdd = await queryAmmAttachments(layer, oid, layerUrl)
  const pdfAfterAdd = afterAdd.filter(isGiiBozzaDeterminazionePdfAttachment)
  const addedIdSet = new Set(addedIds.filter(id => Number.isFinite(Number(id)) && Number(id) > 0).map(id => Number(id)))
  let keepIds = new Set<number>(Array.from(addedIdSet))

  if (keepIds.size === 0) {
    const newIds = pdfAfterAdd
      .map(att => Number(att.id))
      .filter(id => Number.isFinite(id) && id > 0 && !beforeIds.has(id))
    keepIds = new Set(newIds)
  }
  if (keepIds.size === 0 && pdfAfterAdd.length > 0) {
    const maxId = Math.max(...pdfAfterAdd.map(att => Number(att.id)).filter(id => Number.isFinite(id) && id > 0))
    if (Number.isFinite(maxId) && maxId > 0) keepIds.add(maxId)
  }

  if (keepIds.size === 0) throw new Error('PDF caricato, ma il nuovo allegato non è stato identificato.')

  try {
    // La nuova copia sostituisce la precedente. Se una cancellazione fallisce,
    // rimuoviamo la copia appena aggiunta: meglio conservare il documento vecchio
    // che lasciare più PDF concorrenti nello stesso slot.
    for (const att of afterAdd) {
      const id = Number(att.id)
      if (!Number.isFinite(id) || id <= 0) continue
      if (isGiiBozzaDeterminazionePdfAttachment(att) && !keepIds.has(id)) {
        await deleteAmmAttachment(layer, oid, id, layerUrl)
      } else if (isGiiLegacyBozzaDeterminazioneWordAttachment(att)) {
        await deleteAmmAttachment(layer, oid, id, layerUrl)
      }
    }
  } catch (e) {
    for (const id of keepIds) {
      try { await deleteAmmAttachment(layer, oid, id, layerUrl) } catch {}
    }
    throw e
  }

  const finalList = await queryAmmAttachments(layer, oid, layerUrl)
  const finalBozzaPdfs = finalList.filter(isGiiBozzaDeterminazionePdfAttachment)
  if (finalBozzaPdfs.length !== 1) {
    if (finalBozzaPdfs.length > 1) {
      for (const id of keepIds) {
        try { await deleteAmmAttachment(layer, oid, id, layerUrl) } catch {}
      }
    }
    throw new Error(
      finalBozzaPdfs.length > 1
        ? 'Sostituzione del PDF non completata: risultano ancora più copie della Determinazione. La nuova copia è stata annullata.'
        : 'Sostituzione del PDF non completata: nella sezione Determinazione non risulta alcun PDF.'
    )
  }
  const finalPdfId = Number(finalBozzaPdfs[0]?.id)
  if (!Number.isFinite(finalPdfId) || !keepIds.has(finalPdfId)) {
    throw new Error('Sostituzione del PDF non completata: il documento rimasto nello slot non corrisponde al nuovo PDF caricato.')
  }
  return finalBozzaPdfs
}

async function rotateImageAttachmentFile (blob: Blob, fileName: string, rotationDeg: number): Promise<File> {
  const contentType = String(blob.type || '').toLowerCase()
  const lowerName = String(fileName || '').toLowerCase()
  const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg') || /\.(jpe?g)$/i.test(lowerName)
  const isPng = contentType.includes('png') || /\.png$/i.test(lowerName)
  if (!isJpeg && !isPng) throw new Error('La rotazione è disponibile solo per immagini JPEG o PNG.')
  if (typeof document === 'undefined') throw new Error('Rotazione immagine non disponibile in questo ambiente.')

  let source: any = null
  let sourceUrl = ''
  let closeSource = () => {}
  try {
    const createBitmap = (window as any)?.createImageBitmap
    if (typeof createBitmap === 'function') {
      source = await createBitmap(blob, { imageOrientation: 'from-image' }).catch((): null => null)
      if (source) closeSource = () => { try { source.close?.() } catch {} }
    }
    if (!source) {
      sourceUrl = URL.createObjectURL(blob)
      source = await new Promise<HTMLImageElement | null>(resolve => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = sourceUrl
      })
      closeSource = () => { try { if (sourceUrl) URL.revokeObjectURL(sourceUrl) } catch {} }
    }
    if (!source) throw new Error('Immagine non leggibile.')

    const srcW = Math.max(1, Math.round(Number(source.width || source.naturalWidth) || 0))
    const srcH = Math.max(1, Math.round(Number(source.height || source.naturalHeight) || 0))
    if (!srcW || !srcH) throw new Error('Dimensioni immagine non valide.')

    const normalizedRotation = ((Math.round(rotationDeg / 90) * 90) % 360 + 360) % 360
    if (normalizedRotation === 0) {
      return new File([blob], fileName || `allegato.${isJpeg ? 'jpg' : 'png'}`, { type: isJpeg ? 'image/jpeg' : 'image/png' })
    }

    const canvas = document.createElement('canvas')
    const swap = normalizedRotation === 90 || normalizedRotation === 270
    canvas.width = swap ? srcH : srcW
    canvas.height = swap ? srcW : srcH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Rotazione immagine non disponibile.')
    if (normalizedRotation === 90) {
      ctx.translate(canvas.width, 0)
      ctx.rotate(Math.PI / 2)
    } else if (normalizedRotation === 180) {
      ctx.translate(canvas.width, canvas.height)
      ctx.rotate(Math.PI)
    } else if (normalizedRotation === 270) {
      ctx.translate(0, canvas.height)
      ctx.rotate(-Math.PI / 2)
    }
    ctx.drawImage(source, 0, 0, srcW, srcH)

    const outType = isJpeg ? 'image/jpeg' : 'image/png'
    const rotatedBlob = await canvasToBlobForAmmEdit(canvas, outType, isJpeg ? 0.92 : undefined)
    return new File([rotatedBlob], fileName || `allegato_ruotato.${isJpeg ? 'jpg' : 'png'}`, { type: outType })
  } finally {
    closeSource()
  }
}


async function buildAttachmentPreviewUrl (att: AmmAttachmentInfo, oid: number, layerUrl: string): Promise<string | null> {
  const ct = String(att?.contentType || '').toLowerCase()
  const name = String(att?.name || '').toLowerCase()
  const hasDerivedPdfPreview = !!String((att as any)?.previewUrl || '').trim()
  const canPreviewDirect = hasDerivedPdfPreview || ct.startsWith('image/') || ct === 'application/pdf' || /\.(pdf|jpe?g|png|gif|webp|bmp|tif?f)$/i.test(name)
  if (!canPreviewDirect) return null
  const raw = hasDerivedPdfPreview ? String((att as any)?.previewUrl || '').trim() : attachmentRawUrl(att, oid, layerUrl)
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

async function openAmmAttachmentInNewTab (att: AmmAttachmentInfo, oid: number, layerUrl: string): Promise<void> {
  const raw = attachmentRawUrl(att, oid, layerUrl)
  if (!raw) throw new Error('URL allegato non disponibile.')
  const token = await getEsriTokenForUrl(layerUrl || raw)
  let url = raw
  if (token && /^https?:/i.test(url) && !/[?&]token=/.test(url)) {
    url = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  }
  const resp = await fetch(url, { credentials: 'same-origin' })
  if (!resp.ok) throw new Error(`Apertura allegato fallita (HTTP ${resp.status}).`)
  const blob = await resp.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => {
    try { URL.revokeObjectURL(blobUrl) } catch {}
  }, 60000)
}

async function updateAmmAttachment (oid: number, attachmentId: number, file: File, layerUrl: string): Promise<void> {
  if (!oid || !attachmentId || !file) return
  if (!layerUrl) throw new Error('Allegati non disponibili.')
  const fd = new FormData()
  fd.append('f', 'json')
  const token = await getEsriTokenForUrl(layerUrl)
  if (token) fd.append('token', token)
  fd.append('attachmentId', String(Number(attachmentId)))
  fd.append('attachment', file)
  const resp = await fetch(`${layerUrl}/${Number(oid)}/updateAttachment`, { method: 'POST', body: fd })
  const json = await resp.json().catch((_err: unknown): null => null)
  if (!resp.ok || json?.error) throw new Error(json?.error?.message || `Sostituzione allegato fallita (HTTP ${resp.status}).`)
  const result = json?.updateAttachmentResult || json
  if (result?.success === false) throw new Error(result?.error?.description || result?.error?.message || 'Sostituzione allegato non riuscita.')
}

async function downloadAmmAttachmentFile (att: AmmAttachmentInfo, oid: number, layerUrl: string, fileNameOverride?: string): Promise<void> {
  const raw = attachmentRawUrl(att, oid, layerUrl)
  if (!raw) throw new Error('URL allegato non disponibile.')
  const token = await getEsriTokenForUrl(layerUrl || raw)
  let url = raw
  if (token && /^https?:/i.test(url) && !/[?&]token=/.test(url)) {
    url = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  }
  const resp = await fetch(url, { credentials: 'same-origin' })
  if (!resp.ok) throw new Error(`Download allegato fallito (HTTP ${resp.status}).`)
  const blob = await resp.blob()
  downloadBlobFile(blob, fileNameOverride || att.name || `allegato-${att.id}`)
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


async function refreshDs (ds: any, widgetId: string): Promise<void> {
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
      const q = d.getCurrentQueryParams?.() || {}
      if (d.clearSourceRecords) d.clearSourceRecords()
      if (d.addVersion) d.addVersion()
      if (d.load) await d.load(q, { widgetId, refresh: true })
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
  actionBarBg: '#ffffff',
  actionBarBorderColor: '#e5e7eb',
  actionBarBorderWidth: 1,
  actionBarBorderRadius: 10,
  actionBarPaddingX: 12,
  actionBarPaddingY: 10,
  actionBarTitleColor: '#111827',
  actionBarTitleFontSize: 14,
  actionBarButtonGap: 10,
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


type BozzaIconName = 'check' | 'edit' | 'upload' | 'send' | 'mail' | 'download' | 'trash' | 'protocol'

function BozzaActionIcon (props: { name: BozzaIconName, size?: number }): React.ReactElement {
  const size = Number(props.size || 24)
  if (props.name === 'check') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M20 6L9 17l-5-5'/>
      </svg>
    )
  }
  if (props.name === 'edit') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
      </svg>
    )
  }
  if (props.name === 'upload') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
        <path d='M17 8l-5-5-5 5'/>
        <path d='M12 3v12'/>
      </svg>
    )
  }
  if (props.name === 'send') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M22 2L11 13'/>
        <path d='M22 2l-7 20-4-9-9-4 20-7z'/>
      </svg>
    )
  }
  if (props.name === 'protocol') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M8 2h7l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z'/>
        <path d='M15 2v5h5'/>
        <rect x='11' y='13' width='11' height='7' rx='1.8'/>
        <text x='16.5' y='18.1' textAnchor='middle' fontSize='5.4' fontWeight='700' fontFamily='Arial, Helvetica, sans-serif' fill='currentColor' stroke='none'>N°</text>
      </svg>
    )
  }
  if (props.name === 'mail') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'/>
        <path d='M22 6l-10 7L2 6'/>
      </svg>
    )
  }
  if (props.name === 'trash') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M3 6h18'/>
        <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
        <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
        <path d='M10 11v6'/>
        <path d='M14 11v6'/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/>
      <path d='M7 10l5 5 5-5'/>
      <path d='M12 15V3'/>
    </svg>
  )
}

function bozzaIconButtonStyle (opts?: { danger?: boolean, disabled?: boolean }): React.CSSProperties {
  const disabled = !!opts?.disabled
  const danger = !!opts?.danger
  return {
    width: 40,
    height: 40,
    padding: 0,
    boxSizing: 'border-box',
    borderRadius: 8,
    border: `2px solid ${disabled ? '#e5e7eb' : (danger ? 'rgba(185,28,28,0.72)' : '#0d3b66')}`,
    background: disabled ? '#e5e7eb' : '#fff',
    color: disabled ? '#9ca3af' : (danger ? '#b91c1c' : '#0d3b66'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    lineHeight: 1
  }
}

function bozzaActionButtonStyle (opts?: { disabled?: boolean }): React.CSSProperties {
  const disabled = !!opts?.disabled
  return {
    height: 40,
    padding: '0 12px',
    boxSizing: 'border-box',
    borderRadius: 8,
    border: `2px solid ${disabled ? '#e5e7eb' : '#0d3b66'}`,
    background: disabled ? '#e5e7eb' : '#fff',
    color: disabled ? '#9ca3af' : '#0d3b66',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flex: '0 0 auto',
    lineHeight: 1,
    fontWeight: 800,
    fontSize: 13
  }
}

function NextActionPulse (props?: { floating?: boolean, title?: string }) {
  const floating = !!props?.floating
  return (
    <>
      <style>{`
        @keyframes gii-next-action-pulse {
          0%, 100% { transform: scale(0.82); opacity: 0.58; box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.24); }
          50% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.18); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gii-next-action-pulse { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <span
        className='gii-next-action-pulse'
        title={props?.title || 'Azione successiva'}
        aria-hidden='true'
        style={{
          width: 9,
          height: 9,
          borderRadius: 999,
          background: '#dc2626',
          border: '2px solid #fff',
          boxSizing: 'content-box',
          flex: '0 0 auto',
          ...(floating ? { position: 'absolute', top: -4, right: -4, zIndex: 4 } : {}),
          animation: 'gii-next-action-pulse 1.65s ease-in-out infinite'
        }}
      />
    </>
  )
}

function SectionInfoButton (props: { text?: React.ReactNode, title?: string }) {
  const st = useAdminStyle()
  const [open, setOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)
  const [popupPos, setPopupPos] = React.useState<{ top: number, left: number, width: number } | null>(null)

  const updatePopupPosition = React.useCallback(() => {
    if (typeof window === 'undefined') return
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const width = Math.min(360, Math.max(260, window.innerWidth - 32))
    let left = rect.right - width
    if (left < 16) left = 16
    if (left + width > window.innerWidth - 16) left = Math.max(16, window.innerWidth - width - 16)
    const top = Math.min(rect.bottom + 8, Math.max(16, window.innerHeight - 80))
    setPopupPos({ top, left, width })
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!open || !props.text) return
    updatePopupPosition()
    const onMove = () => updatePopupPosition()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, props.text, updatePopupPosition])

  if (!props.text) return null

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(v => !v)
    window.setTimeout(updatePopupPosition, 0)
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
      <button
        ref={buttonRef}
        type='button'
        title={props.title || 'Informazioni'}
        aria-label={props.title || 'Informazioni'}
        onClick={toggle}
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          border: 'none',
          background: 'transparent',
          color: '#ffffff',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          lineHeight: 1,
          textTransform: 'none'
        }}
      >
        <svg
          aria-hidden='true'
          focusable='false'
          viewBox='0 0 512 512'
          width='18'
          height='18'
          style={{ display: 'block', flex: '0 0 auto' }}
        >
          <path fill='currentColor' d='M256,0C114.6,0,0,114.6,0,256s114.6,256,256,256,256-114.6,256-256S397.4,0,256,0ZM256,482.8c-125.3,0-226.8-101.5-226.8-226.8S130.7,29.2,256,29.2s226.8,101.5,226.8,226.8-101.5,226.8-226.8,226.8Z' />
          <path fill='currentColor' d='M306.5,195.8l-112.2,10.9-4,14.4,22.1,3.1c14.4,2.7,17.3,6.6,14.1,17.8l-36.1,131.5c-9.5,34,5.2,50,39.7,50s57.7-9.6,71.8-22.6l4.3-15.8c-9.8,6.6-24.2,9.4-33.7,9.4-13.5,0-18.4-7.3-14.9-20.3l49-178.4Z' />
          <path fill='currentColor' d='M268.6,84.7c-24.7,0-44.6,19.9-44.6,44.6s19.9,44.6,44.6,44.6,44.6-19.9,44.6-44.6-19.9-44.6-44.6-44.6Z' />
        </svg>

      </button>
      {open && popupPos && (
        <div
          role='note'
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          style={{
            position: 'fixed',
            top: popupPos.top,
            left: popupPos.left,
            zIndex: 2147483000,
            width: popupPos.width,
            maxWidth: 'calc(100vw - 32px)',
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #cbd8e6',
            borderRadius: Number(st.formCardBorderRadius ?? 8),
            boxShadow: '0 12px 34px rgba(15,23,42,0.18)',
            padding: '10px 12px',
            fontSize: adminFieldFontSize(st),
            fontWeight: 500,
            lineHeight: 1.35,
            letterSpacing: 0,
            textTransform: 'none',
            whiteSpace: 'normal',
            overflowWrap: 'break-word'
          }}
        >
          {props.text}
        </div>
      )}
    </span>
  )
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


function ConfirmActionDialog (props: { title: string, text: string, confirmLabel?: string, saving?: boolean, danger?: boolean, onCancel: () => void, onConfirm: () => void }) {
  const st = useAdminStyle()
  const confirmBg = props.danger ? '#b42318' : '#0d3b66'
  return (
    <div style={{ position: 'fixed', zIndex: 2147483000, inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role='dialog' aria-modal='true' style={{ width: 'min(620px, 100%)', background: '#fff', borderRadius: 14, boxShadow: '0 18px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ background: props.danger ? '#fff1f0' : '#eff6ff', color: props.danger ? '#b42318' : '#0d3b66', padding: '14px 16px', fontWeight: 900, fontSize: Math.max(18, adminFieldFontSize(st)), borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{props.title}</div>
        <div style={{ padding: 16, color: '#111827', fontSize: adminFieldFontSize(st), lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{props.text}</div>
        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type='button' disabled={!!props.saving} onClick={props.onCancel} style={{ border: '1px solid #94a3b8', background: '#fff', color: '#334155', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>Annulla</button>
          <button type='button' disabled={!!props.saving} onClick={props.onConfirm} style={{ border: `1px solid ${confirmBg}`, background: props.saving ? '#e5e7eb' : confirmBg, color: props.saving ? '#9ca3af' : '#fff', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>{props.saving ? 'Operazione in corso…' : (props.confirmLabel || 'Conferma')}</button>
        </div>
      </div>
    </div>
  )
}


function PaymentPlanConfirmDialog (props: { currentCount: number, rateCount: number, saving?: boolean, onCancel: () => void, onConfirm: () => void }) {
  const st = useAdminStyle()
  const nextCount = props.rateCount >= 2 ? props.rateCount + 1 : 1
  return (
    <div style={{ position: 'fixed', zIndex: 2147483000, inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role='dialog' aria-modal='true' style={{ width: 'min(620px, 100%)', background: '#fff', borderRadius: 14, boxShadow: '0 18px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ background: '#eff6ff', color: '#0d3b66', padding: '14px 16px', fontWeight: 900, fontSize: Math.max(18, adminFieldFontSize(st)), borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Ricreare le posizioni di pagamento</div>
        <div style={{ padding: 16, color: '#111827', fontSize: adminFieldFontSize(st), lineHeight: 1.45 }}>
          Le {props.currentCount} posizioni attuali, ancora prive di documenti e incassi, saranno sostituite con {nextCount} {nextCount === 1 ? 'posizione' : 'posizioni'}: {props.rateCount >= 2 ? `unica soluzione + ${props.rateCount} rate` : 'unica soluzione'}.
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type='button' disabled={!!props.saving} onClick={props.onCancel} style={{ border: '1px solid #94a3b8', background: '#fff', color: '#334155', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>Annulla</button>
          <button type='button' disabled={!!props.saving} onClick={props.onConfirm} style={{ border: '1px solid #0d3b66', background: props.saving ? '#e5e7eb' : '#0d3b66', color: props.saving ? '#9ca3af' : '#fff', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>{props.saving ? 'Aggiornamento in corso…' : 'Ricrea posizioni'}</button>
        </div>
      </div>
    </div>
  )
}


function AttestationConfirmDialog (props: { note: string, saving?: boolean, onCancel: () => void, onConfirm: () => void }) {
  const st = useAdminStyle()
  return (
    <div style={{ position: 'fixed', zIndex: 2147483000, inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role='dialog' aria-modal='true' style={{ width: 'min(620px, 100%)', background: '#fff', borderRadius: 14, boxShadow: '0 18px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ background: '#eff6ff', color: '#0d3b66', padding: '14px 16px', fontWeight: 900, fontSize: Math.max(18, adminFieldFontSize(st)), borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Apponi visto di conformità</div>
        <div style={{ padding: 16, color: '#111827', fontSize: adminFieldFontSize(st), lineHeight: 1.45 }}>
          <div style={{ marginBottom: 10 }}>
            Confermando, il visto di conformità sarà registrato sulla pratica e la Proposta di contestazione sarà generata e aggiunta al fascicolo.
          </div>
          <div style={{ border: '1px solid #c5d9f1', background: '#f8fbff', borderRadius: 9, padding: 10 }}>
            <div style={{ color: '#0d3b66', fontWeight: 900, fontSize: adminLabelFontSize(st), marginBottom: 5 }}>Testo visto</div>
            <div style={{ color: '#111827', fontSize: adminFieldFontSize(st), lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{props.note || '—'}</div>
          </div>
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type='button' disabled={!!props.saving} onClick={props.onCancel} style={{ border: '1px solid #94a3b8', background: '#fff', color: '#334155', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>Annulla</button>
          <button type='button' disabled={!!props.saving} onClick={props.onConfirm} style={{ border: '1px solid #1a7f37', background: props.saving ? '#e5e7eb' : '#1a7f37', color: props.saving ? '#9ca3af' : '#fff', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>{props.saving ? 'Apposizione in corso…' : 'Conferma'}</button>
        </div>
      </div>
    </div>
  )
}



function TransmitBozzaConfirmDialog (props: { saving?: boolean, reopenCycle?: boolean, onCancel: () => void, onConfirm: () => void }) {
  const st = useAdminStyle()
  return (
    <div style={{ position: 'fixed', zIndex: 2147483000, inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role='dialog' aria-modal='true' style={{ width: 'min(620px, 100%)', background: '#fff', borderRadius: 14, boxShadow: '0 18px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ background: props.reopenCycle ? '#fff7ed' : '#eff6ff', color: props.reopenCycle ? '#9a3412' : '#0d3b66', padding: '14px 16px', fontWeight: 900, fontSize: Math.max(18, adminFieldFontSize(st)), borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          {props.reopenCycle ? 'Apri un nuovo ciclo di verifica' : 'Conferma trasmissione fascicolo'}
        </div>
        <div style={{ padding: 16, color: '#111827', fontSize: adminFieldFontSize(st), lineHeight: 1.45 }}>
          {props.reopenCycle
            ? 'La pratica risulta già approvata dal Responsabile e il protocollo del fascicolo è stato registrato. Confermando verrà aperto un nuovo ciclo di verifica: l’approvazione corrente del Responsabile dell’istruttoria amministrativa e i dati di protocollo del fascicolo saranno invalidati. La bozza PDF corrente sarà trasmessa nuovamente al Responsabile.'
            : 'Confermando, il fascicolo istruttorio contenente la Proposta di contestazione e la bozza PDF della determinazione sarà trasmesso al Responsabile dell’istruttoria amministrativa per la verifica. Dopo la trasmissione la bozza non sarà più liberamente modificabile dall’Istruttore amministrativo, salvo rimando.'}
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type='button' disabled={!!props.saving} onClick={props.onCancel} style={{ border: '1px solid #94a3b8', background: '#fff', color: '#334155', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>Annulla</button>
          <button type='button' disabled={!!props.saving} onClick={props.onConfirm} style={{ border: `1px solid ${props.reopenCycle ? '#c2410c' : '#1a7f37'}`, background: props.saving ? '#e5e7eb' : (props.reopenCycle ? '#c2410c' : '#1a7f37'), color: props.saving ? '#9ca3af' : '#fff', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>{props.saving ? 'Trasmissione in corso…' : (props.reopenCycle ? 'Apri nuovo ciclo e trasmetti' : 'Conferma trasmissione')}</button>
        </div>
      </div>
    </div>
  )
}


function DeleteBozzaConfirmDialog (props: { saving?: boolean, finalPdf?: boolean, onCancel: () => void, onConfirm: () => void }) {
  const st = useAdminStyle()
  return (
    <div style={{ position: 'fixed', zIndex: 2147483000, inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role='dialog' aria-modal='true' style={{ width: 'min(600px, 100%)', background: '#fff', borderRadius: 14, boxShadow: '0 18px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '14px 16px', fontWeight: 900, fontSize: Math.max(18, adminFieldFontSize(st)), borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          {props.finalPdf ? 'Elimina PDF della determinazione' : 'Elimina PDF'}
        </div>
        <div style={{ padding: 16, color: '#111827', fontSize: adminFieldFontSize(st), lineHeight: 1.45 }}>
          {props.finalPdf
            ? 'Confermando verrà eliminato esclusivamente il PDF della determinazione attualmente caricato. L’approvazione del Responsabile dell’istruttoria amministrativa, i dati di protocollo e il riferimento interno della versione approvata resteranno invariati. La predisposizione dell’e-mail al Direttore verrà nuovamente bloccata finché non sarà caricato e verificato un nuovo PDF della determinazione.'
            : 'Confermando verrà eliminato esclusivamente il PDF attualmente caricato. Il Word di lavoro, il visto e lo stato della pratica resteranno invariati. Sarà quindi possibile generare nuovamente il Word oppure caricare un nuovo PDF.'}
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type='button' disabled={!!props.saving} onClick={props.onCancel} style={{ border: '1px solid #94a3b8', background: '#fff', color: '#334155', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>Annulla</button>
          <button type='button' disabled={!!props.saving} onClick={props.onConfirm} style={{ border: '1px solid #b91c1c', background: props.saving ? '#e5e7eb' : '#b91c1c', color: props.saving ? '#9ca3af' : '#fff', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>{props.saving ? 'Eliminazione in corso…' : 'Elimina PDF'}</button>
        </div>
      </div>
    </div>
  )
}

function UndoAttestationConfirmDialog (props: { saving?: boolean, onCancel: () => void, onConfirm: () => void }) {
  const st = useAdminStyle()
  return (
    <div style={{ position: 'fixed', zIndex: 2147483000, inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div role='dialog' aria-modal='true' style={{ width: 'min(620px, 100%)', background: '#fff', borderRadius: 14, boxShadow: '0 18px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ background: '#fff7ed', color: '#9a3412', padding: '14px 16px', fontWeight: 900, fontSize: Math.max(18, adminFieldFontSize(st)), borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Annulla visto di conformità</div>
        <div style={{ padding: 16, color: '#111827', fontSize: adminFieldFontSize(st), lineHeight: 1.45 }}>
          Confermando, il visto sarà rimosso e la scheda tornerà alla fase di verifica. I successivi adempimenti amministrativi saranno nuovamente bloccati finché non verrà apposto un nuovo visto.
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type='button' disabled={!!props.saving} onClick={props.onCancel} style={{ border: '1px solid #94a3b8', background: '#fff', color: '#334155', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>Annulla</button>
          <button type='button' disabled={!!props.saving} onClick={props.onConfirm} style={{ border: '1px solid #b45309', background: props.saving ? '#e5e7eb' : '#b45309', color: props.saving ? '#9ca3af' : '#fff', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: adminFieldFontSize(st), cursor: props.saving ? 'not-allowed' : 'pointer' }}>{props.saving ? 'Operazione in corso…' : 'Conferma annullamento'}</button>
        </div>
      </div>
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

function normalizeSectorCodeForAmm (value: any): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const upper = raw.toUpperCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ')
  const direct = upper.match(/(D[1-6]|DS|CR|GI)/)
  if (direct) return direct[1]
  const distretto = upper.match(/DISTRETTO\s*([1-6])/) || upper.match(/D\.?\s*([1-6])/)
  if (distretto) return `D${distretto[1]}`
  if (/DRENO|SCOLO|TECNICO/.test(upper)) return 'DS'
  if (/CATASTO|RUOLI|SERVIZI TERRITORIALI/.test(upper)) return 'CR'
  if (/GESTIONE IRRIGUA/.test(upper)) return 'GI'
  return ''
}

function settoreCodeFromUfficioAmm (value: any): string {
  const upper = String(value || '').toUpperCase()
  if (!upper) return ''
  if (/QUARTU|VILLAPUTZU|MURAVERA|SAN SPERATE/.test(upper)) return 'D1'
  if (/SERRAMANNA|PIMPISU/.test(upper)) return 'D2'
  if (/SAN GAVINO|VILLACIDRO/.test(upper)) return 'D3'
  if (/SAN GIOVANNI SUERGIU|MASAINAS|BASSO SULCIS/.test(upper)) return 'D4'
  if (/SENORB/.test(upper)) return 'D5'
  if (/IGLESIAS|SILIQUA|VILLASOR|CIXERRI/.test(upper)) return 'D6'
  return ''
}

function normalizeRilevazioneCodeForAmm (data: any, oid: number | null): string {
  const d = data || {}
  const stored = cleanReportCodeText(pickAttrCI(d, ['numero_rilevazione', 'Numero_rilevazione', 'NUMERO_RILEVAZIONE', 'cod_pratica', 'Cod_pratica', 'COD_PRATICA', 'numero_rapporto', 'Numero_rapporto', 'NUMERO_RAPPORTO']))
  const raw = stored.toUpperCase().replace(/_/g, '-').replace(/\s+/g, '-')
  const op = pickAttrCI(d, ['origine_pratica', 'Origine_pratica', 'ORIGINE_PRATICA'])
  let prefix = (op === 2 || op === '2' || String(op || '').toUpperCase() === 'IT') ? 'IT' : 'TR'
  let oidPart = oid != null && Number.isFinite(Number(oid)) ? String(Number(oid)) : ''
  let settore = normalizeSectorCodeForAmm(pickAttrCI(d, ['settore_cod', 'Settore_cod', 'SETTORE_COD', 'settore', 'Settore', 'SETTORE'])) || settoreCodeFromUfficioAmm(pickAttrCI(d, ['ufficio_zona', 'Ufficio_zona', 'UFFICIO_ZONA']))

  let m = raw.match(/^(TR|IT)-?(\d+)(?:-([A-Z0-9]+))?$/i)
  if (m) {
    prefix = m[1].toUpperCase()
    oidPart = m[2]
    if (!settore && m[3]) settore = normalizeSectorCodeForAmm(m[3]) || m[3].toUpperCase()
  } else {
    m = raw.match(/^(\d+)-?(TR|IT)(?:-([A-Z0-9]+))?$/i)
    if (m) {
      oidPart = m[1]
      prefix = m[2].toUpperCase()
      if (!settore && m[3]) settore = normalizeSectorCodeForAmm(m[3]) || m[3].toUpperCase()
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
    if (/^(TR|IT)-?\d+(?:-[A-Z0-9]+)?$/.test(normalized) || /^\d+-?(TR|IT)(?:-[A-Z0-9]+)?$/.test(normalized)) return ''
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

function isDeterminazioneAdottata (data: Record<string, any>): boolean {
  const d = data || {}
  const stato = String(pickAttrCI(d, ['determinazione_stato']) || '').trim().toUpperCase()
  return stato === 'ADOTTATA' || (hasAdminValue(pickAttrCI(d, ['determinazione_numero'])) && hasAdminValue(pickAttrCI(d, ['determinazione_data'])))
}

function determinationWorkflowState (data: Record<string, any>): string {
  const d = data || {}
  const raw = String(pickAttrCI(d, ['determinazione_stato']) || '').trim().toUpperCase()
  if (DETERMINAZIONE_DOMAIN_STATES.has(raw)) return raw
  if (!raw) return ''

  // Compatibilità non distruttiva con pratiche già avanzate usando vecchi valori
  // intermedi non appartenenti al dominio del Feature Layer. Il codice corrente
  // non li riscrive né li usa più: ricostruisce la fase dai milestone persistenti.
  const adottata = isDeterminazioneAdottata(d)
  const esitoRia = parseNumberInput(pickAttrCI(d, ['esito_RIA']))
  const statoRia = parseNumberInput(pickAttrCI(d, ['stato_RIA']))

  // Prima dell'adozione il timestamp di trasmissione alla firma identifica in modo
  // univoco il milestone TRASMESSA_FIRMA_DA. Dopo l'adozione lo stesso timestamp
  // appartiene invece alla Determinazione già conclusa e non deve falsare il ciclo Atto.
  if (!adottata && hasAdminValue(pickAttrCI(d, ['determinazione_trasmessa_firma_il']))) {
    return TRASMESSA_FIRMA_DA_STATE
  }
  if (esitoRia === 2) return 'VALIDATA_RIA'
  if (esitoRia === 1) return 'BOZZA'
  if (adottata && (statoRia === 1 || statoRia === 2)) return 'TRASMESSA_RIA'
  return ''
}

function isIaVistoActionPending (data: Record<string, any>): boolean {
  const d = data || {}
  if (isDeterminazioneAdottata(d)) return false
  const esitoIa = parseNumberInput(pickAttrCI(d, ['esito_IA']))
  const esitoRia = parseNumberInput(pickAttrCI(d, ['esito_RIA']))
  // Il nuovo ciclo riparte dal visto quando il IA non ha ancora attestato
  // la conformità oppure quando il RIA ha richiesto una nuova verifica.
  // Finché questo passaggio è pendente nessun indicatore delle fasi successive
  // deve sopravvivere dal ciclo precedente.
  return esitoIa !== 2 || esitoRia === 1
}

function verbaleApprovalDateValue (data: Record<string, any>): any {
  const d = data || {}
  return pickAttrCI(d, ['accertamento_data']) || pickAttrCI(d, ['determinazione_data']) || pickAttrCI(d, ['determinazione_registrata_il']) || pickAttrCI(d, ['determinazione_trasmessa_firma_il'])
}

function displayVerbaleApprovalDate (data: Record<string, any>, fields: LayerFieldInfo[]): string {
  const d = data || {}
  const value = verbaleApprovalDateValue(d)
  if (!hasAdminValue(value)) return '—'
  const fieldName = hasAdminValue(pickAttrCI(d, ['accertamento_data']))
    ? 'accertamento_data'
    : hasAdminValue(pickAttrCI(d, ['determinazione_data']))
      ? 'determinazione_data'
      : hasAdminValue(pickAttrCI(d, ['determinazione_registrata_il']))
        ? 'determinazione_registrata_il'
        : 'determinazione_trasmessa_firma_il'
  const lf = getFieldInfo(fields, fieldName)
  if (lf?.domain?.codedValues || getFallbackDomainOptions(fieldName).length) return domainLabel(lf, value, fieldName)
  return formatDateValue(value)
}

function verbaleNumberValue (data: Record<string, any>, oid?: any): string {
  const d = data || {}
  return String(pickAttrCI(d, ['accertamento_numero']) || '').trim()
}

function displayVerbaleNumber (data: Record<string, any>, fields: LayerFieldInfo[], oid?: any, emptyLabel = '—'): string {
  const current = verbaleNumberValue(data || {}, oid)
  if (current) return displayAdminFieldValue(data || {}, fields, 'accertamento_numero', emptyLabel)
  return emptyLabel
}

function isVerbaleDefinitivo (data: Record<string, any>): boolean {
  const d = data || {}
  return hasAdminValue(verbaleNumberValue(d)) && hasAdminValue(pickAttrCI(d, ['accertamento_data']))
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
  const titleParts = buildPracticeTitleParts(data || {}, oid)
  return titleParts.full
}

function buildPracticeTitleParts (data: any, oid: number | null): { prefix: string, reportCode: string, full: string } {
  const d = data || {}
  const reportCode = getReportCode(d, oid)
  const prefix = reportCode
    ? 'Fascicolo documentale della pratica relativa al Rapporto tecnico n. '
    : 'Fascicolo documentale della pratica'
  return { prefix, reportCode, full: reportCode ? `${prefix}${reportCode}` : prefix }
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
  '34': 'Mancato rispetto delle distanze dalle opere consortili',
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
  return dateMsOrNull(pickAttrCI(d, ['accertamento_data', 'protocollo_atto_accertamento_data', 'notifica_data', 'data_rilevazione'])) || Date.now()
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
  const s = String(raw || '').trim().toUpperCase()
  const rcp = s.match(/^RCP0*(\d{1,2})$/i)
  if (rcp) return `Punto ${Number(rcp[1])}`
  const article = normalizeArticleNumber(s)
  return article ? `Art. ${article}` : s
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
  kind: Art30EquipmentKind
  codice: string
  descrizione: string
  valoreUnitario: number | null
  importo: number
}

const ART30_EQUIPMENT_ORDER: Art30EquipmentKind[] = ['tessera', 'curve', 'sifoni', 'paratoie']

function parseArt30EquipmentSelections (data: Record<string, any>): Art30EquipmentSelection[] {
  const out: Art30EquipmentSelection[] = []
  const raw = String(pickAttrCI(data || {}, ['attrezzature_risarcimento_dettaglio']) || '')
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    if (/Stato:\s*Recuperabile\b/i.test(text)) continue
    const kind = art30EquipmentKindFromText(text)
    if (!kind) continue
    const statoMatch = text.match(/Stato:\s*(Non recuperabile|Recuperabile)/i)
    if (!statoMatch) continue
    const cutIdx = text.search(/\s+—\s+Valore unitario:/i)
    const prefix = cutIdx >= 0 ? text.slice(0, cutIdx).trim() : text
    const codeMatch = prefix.match(/^(.*?)\s+—\s+Codice:\s*(.+)$/i)
    const descrizione = String(codeMatch?.[1] || prefix || ART30_EQUIPMENT_META[kind].label).trim()
    const codice = String(codeMatch?.[2] || '').trim()
    const valoreMatch = text.match(/Valore unitario:\s*([0-9.,]+)/i)
    const valoreUnitario = parseNumberInput(valoreMatch?.[1])
    if (valoreUnitario != null && valoreUnitario >= 0) {
      out.push({ kind, codice, descrizione: descrizione || ART30_EQUIPMENT_META[kind].label, valoreUnitario, importo: valoreUnitario })
      continue
    }
    const legacyAmount = parseEuroTextValue(text)
    if (legacyAmount != null && legacyAmount >= 0) {
      out.push({ kind, codice, descrizione: descrizione || ART30_EQUIPMENT_META[kind].label, valoreUnitario: legacyAmount, importo: legacyAmount })
    }
  }
  return out
}

// Più righe possono condividere lo stesso tipo (es. due tessere): questo aggrega per tipo,
// sommando gli importi e contando le unità, per i riepiloghi che mostrano una riga per tipo.
function groupArt30SelectionsByKind (selections: Art30EquipmentSelection[]): Map<Art30EquipmentKind, { codice: string, descrizione: string, quantita: number, valoreUnitario: number | null, importo: number }> {
  const map = new Map<Art30EquipmentKind, { codice: string, descrizione: string, quantita: number, valoreUnitario: number | null, importo: number }>()
  selections.forEach(item => {
    const cur = map.get(item.kind)
    if (!cur) {
      map.set(item.kind, { codice: item.codice, descrizione: item.descrizione, quantita: 1, valoreUnitario: item.valoreUnitario, importo: item.importo })
    } else {
      cur.quantita += 1
      cur.importo += item.importo
    }
  })
  return map
}

type NotaSpeseCaseSummary = {
  baseSpese: number
  speseGenerali: number
  risarcimentoAttrezzature: number
  totale: number
  rows: number
}

function notaSpeseSummaryForCase (noteRows: NotaSpeseDetailRow[], codiceCasistica: string, data: Record<string, any>): NotaSpeseCaseSummary | null {
  const acceptedCodes = normalizedCaseCodes(codiceCasistica)
  const rows = (noteRows || []).filter(row => acceptedCodes.has(String(row.codiceCasistica || '').trim().toUpperCase()))
  if (!rows.length) return null

  // Le righe RA (risarcimento attrezzature Art. 30) sono già nette e non
  // concorrono alla base delle spese generali. È la stessa regola usata nella
  // Nota spese tecnica e nel dettaglio pratica.
  const baseSpese = rows
    .filter(row => String(row.categoriaCosto || '').toUpperCase() !== 'RA')
    .reduce((sum, row) => sum + (Number.isFinite(row.importoRiga) ? row.importoRiga : 0), 0)
  const risarcimentoAttrezzature = rows
    .filter(row => String(row.categoriaCosto || '').toUpperCase() === 'RA')
    .reduce((sum, row) => sum + (Number.isFinite(row.importoRiga) ? row.importoRiga : 0), 0)

  const configuredPercentage = parseNumberInput(pickAttrCI(data || {}, ['ns_spese_generali_perc']))
  const percentage = configuredPercentage != null && Number.isFinite(configuredPercentage) ? configuredPercentage : 15
  const speseGenerali = baseSpese * percentage / 100
  return {
    baseSpese: roundMoneyValue(baseSpese),
    speseGenerali: roundMoneyValue(speseGenerali),
    risarcimentoAttrezzature: roundMoneyValue(risarcimentoAttrezzature),
    totale: roundMoneyValue(baseSpese + speseGenerali + risarcimentoAttrezzature),
    rows: rows.length
  }
}

function notaSpeseTotalForCase (noteRows: NotaSpeseDetailRow[], codiceCasistica: string, data: Record<string, any>): number | null {
  const summary = notaSpeseSummaryForCase(noteRows, codiceCasistica, data)
  if (!summary) return null
  // Per l'Art. 30 le righe RA vengono esposte e conteggiate separatamente come
  // risarcimento attrezzature; la voce a piè di lista comprende soltanto le
  // altre spese e le relative spese generali.
  if (isArt30CaseCode(codiceCasistica)) return roundMoneyValue(summary.baseSpese + summary.speseGenerali)
  return summary.totale
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
    if (codice === 'NOTA_SPESE.C104') lines.push(`Nota spese: ${formatEuroText(value)}`)
    else if (article === '8' || article === '30') lines.push(`Rimborso spese a piè di lista: ${formatEuroText(value)}`)
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
    const label = codice === 'NOTA_SPESE.C104.RA' ? 'Risarcimento attrezzature' : art30EquipmentLineLabel(voce)
    if (value != null && Number.isFinite(value)) lines.push(`${label}: ${formatEuroText(value)}`)
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
    const normaViolata = articleListTitle(group.articoliViolati || [], group.articoloViolato)
    if (normaViolata && normaViolata !== '—') {
      dettaglio.push(`- Norma violata: ${normaViolata}`)
    }
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
  const art30SnapshotDetail = String(pickAttrCI(art30Snapshot, ['attrezzature_risarcimento_dettaglio']) || '')
  const art30SnapshotGrossRaw = pickAttrCI(art30Snapshot, ['attrezzature_risarcimento_importo'])
  const art30SnapshotCauzioneRaw = pickAttrCI(art30Snapshot, ['attrezzature_cauzione_decurtata'])
  const art30SnapshotNettoRaw = pickAttrCI(art30Snapshot, ['attrezzature_importo_netto'])
  const art30SnapshotGross = parseNumberInput(art30SnapshotGrossRaw)
  const art30SnapshotCauzione = parseNumberInput(art30SnapshotCauzioneRaw)
  const art30Selections = parseArt30EquipmentSelections(art30Snapshot)
  const art30DetailGross = art30Selections.reduce((sum, item) => sum + (Number(item.importo) || 0), 0)
  const hasArt30Snapshot = !!art30SnapshotDetail.trim() ||
    (art30SnapshotGrossRaw != null && art30SnapshotGrossRaw !== '') ||
    (art30SnapshotCauzioneRaw != null && art30SnapshotCauzioneRaw !== '') ||
    (art30SnapshotNettoRaw != null && art30SnapshotNettoRaw !== '')
  const hasArt30RealRaRowsInGroups = validGroups.some(group =>
    isArt30CaseCode(group.codiceCasistica) &&
    (group.voci || []).some(voce => String(voce.codiceParametro || '').toUpperCase() === 'NOTA_SPESE.C104.RA')
  )

  if (hasArt30Snapshot && !hasArt30RealRaRowsInGroups) {
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
    attrezzature_risarcimento_importo: roundMoneyValue(rimborsoAttrezzature),
    attrezzature_cauzione_decurtata: roundMoneyValue(cauzioneDecurtata),
    attrezzature_importo_netto: roundMoneyValue(importoNettoAttrezzature),
    attrezzature_risarcimento_dettaglio: art30SnapshotDetail.trim() ? art30SnapshotDetail : attrezzatureDettaglio.join('\n'),
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
    oggetto = `Atto di accertamento e contestazione conseguente al rapporto tecnico${rapportoSuffix}`
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
    oggetto = `Atto di accertamento e contestazione con ${richiesta} conseguente al rapporto tecnico${rapportoSuffix}`
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
  if (key === 'ri') return `Istruttoria amministrativa predisposta per la successiva verifica del Responsabile dell’istruttoria amministrativa.`
  return ''
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

function isPropostaContestazioneApprovedByRia (data: Record<string, any>): boolean {
  const d = data || {}
  // L'esito RIA appartiene sempre al ciclo corrente: ogni nuova trasmissione
  // IA → RIA lo azzera prima di rigenerare la Proposta in stato BOZZA.
  // Per questo l'approvazione corrente è identificata direttamente da esito_RIA = 2.
  return parseNumberInput(pickAttrCI(d, ['esito_RIA'])) === 2
}

function isBozzaDeterminazioneValidataDaRia (data: Record<string, any>): boolean {
  const d = data || {}
  const statoBozza = determinationWorkflowState(d)
  return isPropostaContestazioneApprovedByRia(d) &&
    (statoBozza === 'VALIDATA_RIA' || statoBozza === TRASMESSA_FIRMA_DA_STATE)
}

function isBozzaDeterminazioneRimandataDaRia (data: Record<string, any>): boolean {
  const d = data || {}
  if (isDeterminazioneAdottata(d)) return false
  if (isBozzaDeterminazioneValidataDaRia(d)) return false
  const statoBozza = determinationWorkflowState(d)
  const statoIa = parseNumberInput(pickAttrCI(d, ['stato_IA']))
  const esitoRia = parseNumberInput(pickAttrCI(d, ['esito_RIA']))
  const iaRiaperto = statoIa === 1 || statoIa === 2
  const statoCompatibileConRimando = statoBozza === 'BOZZA_DA_RETTIFICARE' || statoBozza === 'BOZZA' || statoBozza === ''
  return iaRiaperto && esitoRia === 1 && statoCompatibileConRimando
}

function isBozzaDeterminazioneRientrataDaRia (data: Record<string, any>): boolean {
  const d = data || {}
  return isBozzaDeterminazioneValidataDaRia(d) || isBozzaDeterminazioneRimandataDaRia(d)
}


function IaVerificationSummary (props: {
  data: Record<string, any>
  savedData: Record<string, any>
  fields: LayerFieldInfo[]
  canEdit: boolean
  role: string
  saving?: boolean
  onChange: (name: string, value: any) => void
  onApplyAttestation: (note: string) => void
  onUndoAttestation: () => void
  onGenerateBozzaDeterminazioneWord: () => void
  onDeleteBozzaDeterminazione: () => boolean | Promise<boolean>
  onTransmitBozzaDeterminazioneRia: () => void
  onPrepareEmailDirettore: () => void
  onPrepareEmailProtocollo: () => void
  onGenerateAttoContestazioneWord: () => void
  attoCleanWordGeneratedAfterApproval?: boolean
  attoDirettoreEmailPrepared?: boolean
  onTransmitAttoContestazioneRia: () => void
  onPrepareEmailAttoDirettore: () => void
  onPrepareEmailAttoProtocollo: () => void
  oid: number | null
  ds: any
  layerUrl?: string
  bozzaRefreshKey?: string
  actionBarTarget?: HTMLElement | null
  workflowScope?: 'approvazione' | 'notifica'
}) {
  const st = useAdminStyle()
  const d = props.data || {}
  const role = String(props.role || '').toUpperCase()
  const esitoRaw = pickAttrCI(d, ['esito_IA'])
  const esitoCode = parseNumberInput(esitoRaw)
  const hasEsito = esitoCode != null
  const iaHaAttestatoConformita = esitoCode === 2
  const esitoLabel = esitoCode === 1
    ? 'Da integrare/rettificare'
    : esitoCode === 2
      ? 'Conforme'
      : esitoCode === 3
        ? 'Respinta'
        : (hasAdminValue(esitoRaw) ? String(esitoRaw) : '')
  const note = String(pickAttrCI(d, ['note_IA', 'note_atto_amm']) || '').trim()
  const riaEsitoRaw = pickAttrCI(d, ['esito_RIA'])
  const riaEsitoCode = parseNumberInput(riaEsitoRaw)
  const riaNote = String(pickAttrCI(d, ['note_RIA']) || '').trim()
  const riaNoteClean = cleanAmmInfoText(riaNote)
  const riaHaRimandatoProposta = isBozzaDeterminazioneRimandataDaRia(d)
  const riaRimandoReasonFromTiNote = (note.match(/Motivazione\s+del\s+rimando\s*:\s*([\s\S]+)$/i)?.[1] || '').trim()
  const riaHaRichiestoIntegrazioni = riaHaRimandatoProposta || (riaEsitoCode === 1 && !isBozzaDeterminazioneValidataDaRia(d) && !iaHaAttestatoConformita)
  const riaHaApprovato = !riaHaRichiestoIntegrazioni && (riaEsitoCode === 2 || isBozzaDeterminazioneValidataDaRia(d))
  const riaRimandoReason = riaHaRichiestoIntegrazioni ? (riaNoteClean || riaRimandoReasonFromTiNote) : ''
  const riaApprovalNote = riaHaApprovato ? riaNoteClean : ''
  const showRiaConsequenceInsideTiBox = esitoCode === 1 || riaHaRichiestoIntegrazioni || riaHaApprovato
  const iaSummaryTitle = riaHaRimandatoProposta
    ? 'Rientro all’Istruttore amministrativo'
    : 'Visto di conformità dell’Istruttore amministrativo'
  const noteLabel = esitoCode === 1 || riaHaRichiestoIntegrazioni
    ? 'Integrazioni/rettifiche proposte'
    : 'Visto di conformità'
  const iaNoteText = normalizeAmmWorkflowText(note) || '—'
  const riaApprovalNoteIsStandard = (() => {
    const txt = riaApprovalNote.toLowerCase().replace(/\s+/g, ' ').trim()
    return !!txt && txt.includes('si approva l’istruttoria amministrativa') && txt.includes('restituzione della pratica all’istruttore amministrativo')
  })()
  const attoContestazioneOutcomeCycle = isDeterminazioneAdottata(d) && attoContestazioneWorkflowState(d) !== ''
  const riaApprovalOutcomeText = attoContestazioneOutcomeCycle
    ? 'Atto di contestazione approvato. Pratica restituita all’Istruttore amministrativo per la trasmissione al Direttore.'
    : 'Istruttoria amministrativa approvata. Pratica restituita per la protocollazione del fascicolo e il completamento della determinazione.'
  const riaReturnOutcomeText = attoContestazioneOutcomeCycle
    ? 'Richieste integrazioni o rettifiche all’Atto di contestazione. Pratica restituita all’Istruttore amministrativo per le modifiche necessarie.'
    : 'Richieste integrazioni o rettifiche alla Proposta di contestazione e/o alla bozza di determinazione. Pratica restituita per le modifiche necessarie.'
  const riaRejectedOutcomeText = attoContestazioneOutcomeCycle
    ? 'Atto di contestazione non approvato. Pratica restituita per i conseguenti adempimenti.'
    : 'Istruttoria amministrativa non approvata. Pratica restituita per i conseguenti adempimenti.'
  const riaConsequenceText = riaHaApprovato
    ? riaApprovalOutcomeText
    : riaReturnOutcomeText
  const riaConsequenceAction = riaHaRichiestoIntegrazioni
    ? (attoContestazioneOutcomeCycle
        ? 'Apportare le modifiche richieste alla bozza dell’Atto e predisporre il nuovo PDF prima di ritrasmetterlo al Responsabile.'
        : 'A seguito delle modifiche è necessario apporre un nuovo visto di conformità; la Proposta di contestazione sarà rigenerata prima della predisposizione della nuova bozza.')
    : ''
  const riaConsequenceDetailLabel = riaHaApprovato ? 'Note del Responsabile: ' : 'Motivazione del rimando: '
  const riaConsequenceDetail = riaHaApprovato
    ? (riaApprovalNoteIsStandard ? '' : riaApprovalNote)
    : riaRimandoReason
  const tecnico = displayAdminFieldValue(d, props.fields, 'ia_assegnato_nome', displayAdminFieldValue(d, props.fields, 'ia_assegnato_username'))
  const dataEsitoRaw = pickAttrCI(d, ['dt_esito_IA']) || pickAttrCI(d, ['dt_stato_IA'])
  const dataEsito = formatDateTimeValue(dataEsitoRaw)
  // La verifica del Responsabile si riferisce al ciclo amministrativo corrente.
  // Dopo un rimando RIA va ricondotta al blocco delle integrazioni/rettifiche
  // dell’IA, così causa, esito e azione successiva restano nello stesso contesto.
  const hasRiaEsito = !showRiaConsequenceInsideTiBox && (iaHaAttestatoConformita || riaHaRimandatoProposta) && (riaEsitoCode != null || hasAdminValue(riaEsitoRaw))
  const riaEsitoLabel = riaEsitoCode === 1
    ? 'Integrazioni/rettifiche richieste'
    : riaEsitoCode === 2
      ? (attoContestazioneOutcomeCycle ? 'Atto di contestazione approvato' : 'Istruttoria amministrativa approvata')
      : riaEsitoCode === 3
        ? (attoContestazioneOutcomeCycle ? 'Atto di contestazione non approvato' : 'Istruttoria amministrativa non approvata')
        : (hasAdminValue(riaEsitoRaw) ? String(riaEsitoRaw) : '')
  const riaNoteTitle = riaEsitoCode === 1
    ? (attoContestazioneOutcomeCycle ? 'Richiesta di integrazioni/rettifiche dell’Atto' : 'Richiesta di integrazioni/rettifiche')
    : riaEsitoCode === 2
      ? (attoContestazioneOutcomeCycle ? 'Approvazione dell’Atto di contestazione' : 'Approvazione dell’istruttoria amministrativa')
      : 'Esito della verifica del Responsabile'
  const riaNoteText = riaEsitoCode === 1
    ? `${riaReturnOutcomeText}${riaNoteClean ? `\n\nMotivazione: ${riaNoteClean}` : ''}`
    : riaEsitoCode === 3
      ? `${riaRejectedOutcomeText}${riaNoteClean ? `\n\nMotivazione: ${riaNoteClean}` : ''}`
      : `${riaApprovalOutcomeText}${riaNoteClean ? `\n\nNote: ${riaNoteClean}` : ''}`
  const riaParentGlobalId = String(pickAttrCI(d, ['GlobalID', 'globalid', 'GLOBALID']) || '').trim()
  const riaDataEsitoRaw = pickAttrCI(d, ['dt_esito_RIA']) || pickAttrCI(d, ['dt_stato_RIA'])
  const [riaNome, setRiaNome] = React.useState(() => cachedHistoricalRiaOperatorName(riaParentGlobalId, riaDataEsitoRaw))
  React.useEffect(() => {
    let cancelled = false
    const cachedName = cachedHistoricalRiaOperatorName(riaParentGlobalId, riaDataEsitoRaw)
    if (cachedName) setRiaNome(cachedName)
    if (!riaParentGlobalId || (!riaHaApprovato && !riaHaRichiestoIntegrazioni && !hasAdminValue(riaEsitoRaw))) {
      if (!cachedName) setRiaNome('')
      return () => { cancelled = true }
    }
    void loadLatestHistoricalRiaOperatorName(riaParentGlobalId, riaDataEsitoRaw).then(name => {
      if (!cancelled && name) setRiaNome(name)
    })
    return () => { cancelled = true }
  }, [riaParentGlobalId, riaHaApprovato, riaHaRichiestoIntegrazioni, riaEsitoCode, riaDataEsitoRaw])
  const riaDataEsito = formatDateTimeValue(riaDataEsitoRaw)
  const showRiaOutcomeAsPrimary = riaHaRichiestoIntegrazioni || riaHaApprovato
  const primarySummaryTitle = showRiaOutcomeAsPrimary
    ? 'Esito del Responsabile dell’istruttoria amministrativa'
    : iaSummaryTitle
  const primaryEsitoLabel = showRiaOutcomeAsPrimary
    ? (riaHaApprovato ? (attoContestazioneOutcomeCycle ? 'Atto di contestazione approvato' : 'Istruttoria amministrativa approvata') : 'Integrazioni/rettifiche richieste')
    : (esitoLabel || '—')
  const primaryOperatoreLabel = showRiaOutcomeAsPrimary
    ? 'Responsabile dell’istruttoria amministrativa'
    : 'Istruttore amministrativo'
  const primaryOperatoreValue = showRiaOutcomeAsPrimary
    ? cleanAmmOperatorLabel(riaNome)
    : cleanAmmOperatorLabel(tecnico)
  const primaryDateLabel = showRiaOutcomeAsPrimary
    ? (riaHaApprovato ? 'Data e ora approvazione' : 'Data e ora esito')
    : (esitoCode === 2 ? 'Data e ora visto' : 'Data e ora esito')
  const primaryDateValue = showRiaOutcomeAsPrimary ? riaDataEsito : dataEsito
  const primaryTone = showRiaOutcomeAsPrimary
    ? (riaHaApprovato ? 'auto' : 'warn')
    : (esitoCode === 1 ? 'warn' : 'auto')
  const hasIaVerification = hasEsito || !!note
  const hasPrimaryVerification = hasIaVerification || showRiaOutcomeAsPrimary
  const hasVerification = hasPrimaryVerification || hasRiaEsito
  const determinazioneAdottata = isDeterminazioneAdottata(props.savedData || d)
  const attoCycleStartedForDetermination = isDeterminazioneAdottata(props.savedData || d) && attoContestazioneWorkflowState(props.savedData || d) !== ''
  const determinazioneCorrectionLocked =
    attoCycleStartedForDetermination ||
    hasAdminValue(pickAttrCI(props.savedData || {}, ['accertamento_data'])) ||
    hasAdminValue(pickAttrCI(props.savedData || {}, ['protocollo_atto_accertamento_numero'])) ||
    hasAdminValue(pickAttrCI(props.savedData || {}, ['protocollo_atto_accertamento_data'])) ||
    hasAdminValue(pickAttrCI(props.savedData || {}, ['notifica_data']))
  const canEditDetermination = props.canEdit && (role === 'IA' || role === 'ADMIN') && !determinazioneCorrectionLocked
  const bozzaRientrataDaRia = isBozzaDeterminazioneRientrataDaRia(d)
  const showIaInfo = role === 'IA' && props.canEdit
  const vistoActionPending = showIaInfo && isIaVistoActionPending(d)
  const attestazioneButtonTitle = riaHaRimandatoProposta || esitoCode === 1
    ? 'Riappone visto di conformità e rigenera la Proposta'
    : 'Apponi visto di conformità'

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {hasVerification && (
        <Section
          title='VERIFICA ISTRUTTORIA AMMINISTRATIVA'
          right={<SectionInfoButton text={showIaInfo ? 'Il visto avvia la predisposizione della determinazione.' : null} title='Informazioni verifica istruttoria amministrativa' />}
          bodyStyle={{ padding: 8 }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {hasPrimaryVerification && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ color: st.formWorkflowBadgeTitleColor || '#0d3b66', fontWeight: 900, fontSize: Number(st.formSectionTitleSize ?? 14), textTransform: 'uppercase', letterSpacing: 0.2 }}>{primarySummaryTitle}</div>
                <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', gap: 10 }}>
                  <StatusSummaryItem label='Esito' value={primaryEsitoLabel || '—'} tone={primaryTone as any} />
                  <StatusSummaryItem label={primaryOperatoreLabel} value={primaryOperatoreValue || '—'} tone='auto' />
                  <StatusSummaryItem label={primaryDateLabel} value={primaryDateValue || '—'} tone='auto' />
                </div>
                <div style={{ border: `1px solid ${st.formWorkflowBadgeBorderColor || '#d8e6f7'}`, background: st.formWorkflowBadgeBg || '#ffffff', borderRadius: 9, padding: 10 }}>
                  {!showRiaOutcomeAsPrimary && (
                    <div style={{ color: st.formWorkflowBadgeTitleColor || '#0d3b66', fontWeight: 900, fontSize: adminLabelFontSize(st), marginBottom: 5 }}>{noteLabel}</div>
                  )}
                  {showRiaOutcomeAsPrimary ? (
                    <div style={{ display: 'grid', gap: 6, color: st.formWorkflowBadgeValueColor || '#111827', fontSize: Number(st.formFieldFontSize ?? 15), lineHeight: 1.45 }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{riaConsequenceText}</div>
                      {riaConsequenceDetail && (
                        <div style={{ whiteSpace: 'pre-wrap' }}><span style={{ fontWeight: 800 }}>{riaConsequenceDetailLabel}</span>{riaConsequenceDetail}</div>
                      )}
                      {riaConsequenceAction && (
                        <div style={{ whiteSpace: 'pre-wrap' }}><span style={{ fontWeight: 800 }}>Adempimento conseguente: </span>{riaConsequenceAction}</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: st.formWorkflowBadgeValueColor || '#111827', fontSize: Number(st.formFieldFontSize ?? 15), lineHeight: 1.45, whiteSpace: 'pre-wrap' }}><AmmWorkflowText text={iaNoteText} /></div>
                  )}
                </div>
              </div>
            )}
            {hasRiaEsito && (
              <div style={{ display: 'grid', gap: 8, borderTop: hasPrimaryVerification ? `1px solid ${st.formWorkflowBadgeBorderColor || '#d8e6f7'}` : 'none', paddingTop: hasPrimaryVerification ? 10 : 0 }}>
                <div style={{ color: st.formWorkflowBadgeTitleColor || '#0d3b66', fontWeight: 900, fontSize: Number(st.formSectionTitleSize ?? 14), textTransform: 'uppercase', letterSpacing: 0.2 }}>Verifica del Responsabile istruttoria amministrativa</div>
                <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', gap: 10 }}>
                  <StatusSummaryItem label='Esito' value={riaEsitoLabel || '—'} tone={riaEsitoCode === 1 || riaEsitoCode === 3 ? 'warn' : 'auto'} />
                  <StatusSummaryItem label='Responsabile dell’istruttoria amministrativa' value={riaNome || '—'} tone='auto' />
                  <StatusSummaryItem label={riaEsitoCode === 2 ? 'Data e ora approvazione' : 'Data e ora esito'} value={riaDataEsito || '—'} tone='auto' />
                </div>
                <div style={{ border: `1px solid ${st.formWorkflowBadgeBorderColor || '#d8e6f7'}`, background: st.formWorkflowBadgeBg || '#ffffff', borderRadius: 9, padding: 10 }}>
                  <div style={{ color: st.formWorkflowBadgeTitleColor || '#0d3b66', fontWeight: 900, fontSize: adminLabelFontSize(st), marginBottom: 5 }}>{riaNoteTitle}</div>
                  <div style={{ color: st.formWorkflowBadgeValueColor || '#111827', fontSize: Number(st.formFieldFontSize ?? 15), lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{riaNoteText}</div>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      <PostAttestazioneIaWorkSection
        data={d}
        savedData={props.savedData}
        fields={props.fields}
        canEdit={props.canEdit && (role === 'IA' || role === 'ADMIN')}
        role={role}
        showIaInfo={showIaInfo}
        saving={!!props.saving}
        onChange={props.onChange}
        actionBarTarget={props.actionBarTarget}
        vistoActionPending={vistoActionPending}
        attestazioneButtonTitle={attestazioneButtonTitle}
        onApplyAttestation={props.onApplyAttestation}
        onGenerateBozzaDeterminazioneWord={props.onGenerateBozzaDeterminazioneWord}
        onDeleteBozzaDeterminazione={props.onDeleteBozzaDeterminazione}
        onTransmitBozzaDeterminazioneRia={props.onTransmitBozzaDeterminazioneRia}
        onPrepareEmailDirettore={props.onPrepareEmailDirettore}
        onPrepareEmailProtocollo={props.onPrepareEmailProtocollo}
        onGenerateAttoContestazioneWord={props.onGenerateAttoContestazioneWord}
        attoCleanWordGeneratedAfterApproval={props.attoCleanWordGeneratedAfterApproval}
        attoDirettoreEmailPrepared={props.attoDirettoreEmailPrepared}
        onTransmitAttoContestazioneRia={props.onTransmitAttoContestazioneRia}
        onPrepareEmailAttoDirettore={props.onPrepareEmailAttoDirettore}
        onPrepareEmailAttoProtocollo={props.onPrepareEmailAttoProtocollo}
        canEditDetermination={canEditDetermination}
        oid={props.oid}
        ds={props.ds}
        layerUrl={props.layerUrl}
        suppressActionGuide={vistoActionPending}
        workflowScope={props.workflowScope || 'approvazione'}
        bozzaRefreshKey={[
          props.oid ?? '',
          pickAttrCI(d, ['dt_esito_IA']) ?? '',
          pickAttrCI(d, ['esito_RIA']) ?? '',
          pickAttrCI(d, ['dt_esito_RIA']) ?? '',
          pickAttrCI(d, ['determinazione_stato']) ?? '',
          pickAttrCI(d, ['dt_bozza_determinazione']) ?? '',
          pickAttrCI(d, ['bozza_determinazione_da']) ?? '',
          props.bozzaRefreshKey ?? ''
        ].join('|')}
      />
    </div>
  )
}



function workflowTimestamp (value: any): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : 0
}

// Il ciclo dell'Atto di accertamento è successivo e distinto da quello della
// Determinazione. Non deve quindi usare determinazione_stato come contenitore di
// stati temporanei. Dopo l'adozione, la fase dell'Atto viene ricostruita dai
// timestamp/stati del nodo RIA, che vengono aggiornati dal relativo passaggio IA↔RIA.
function attoContestazioneWorkflowState (data: Record<string, any>): string {
  const d = data || {}
  if (!isDeterminazioneAdottata(d)) return ''

  const registeredAt = workflowTimestamp(pickAttrCI(d, ['determinazione_registrata_il']))
  const riaStateAt = workflowTimestamp(pickAttrCI(d, ['dt_stato_RIA']))
  const riaOutcomeAt = workflowTimestamp(pickAttrCI(d, ['dt_esito_RIA']))
  const giiA = String(pickAttrCI(d, ['GII_a', 'gii_a']) || '').trim().toUpperCase().replace(/_/g, '-').replace(/\s+/g, '')
  const giiTrasm = parseNumberInput(pickAttrCI(d, ['GII_trasm', 'gii_trasm']))

  const touchedAfterAdoption = registeredAt > 0
    ? Math.max(riaStateAt, riaOutcomeAt) > registeredAt
    : (giiA === 'RIA' && giiTrasm === 1)
  if (!touchedAfterAdoption) return ''

  const esitoRia = parseNumberInput(pickAttrCI(d, ['esito_RIA']))
  const statoRia = parseNumberInput(pickAttrCI(d, ['stato_RIA']))
  if (esitoRia === 2) return 'VALIDATA_RIA'
  if (esitoRia === 1 || esitoRia === 3) return 'BOZZA'
  if (statoRia === 1 || statoRia === 2) return 'TRASMESSA_RIA'
  return 'BOZZA'
}

type AdminBozzaWorkflowMessageKind = 'RIA_APPROVED' | 'RIA_VERIFYING'

function adminBozzaWorkflowMessageForRole (kind: AdminBozzaWorkflowMessageKind, roleRaw: string): string {
  const role = String(roleRaw || '').trim().toUpperCase()
  const isIa = role === 'IA'

  if (kind === 'RIA_APPROVED') {
    return isIa
      ? 'La verifica amministrativa è stata approvata. Trasmettere gli elaborati del fascicolo al protocollo; al rientro selezionare insieme tutti i PDF protocollati. Il gestionale verificherà il fascicolo, leggerà automaticamente numero e data di protocollo e sostituirà ciascun elaborato con la relativa versione protocollata.'
      : 'La verifica amministrativa è stata approvata. La pratica è stata restituita all’Istruttore amministrativo per il completamento degli adempimenti successivi.'
  }

  return isIa
    ? 'Il fascicolo istruttorio è stato trasmesso al Responsabile dell’istruttoria amministrativa per la verifica e non può essere modificato in questa fase.'
    : 'Il fascicolo istruttorio è in fase di verifica amministrativa e non può essere modificato in questa fase.'
}

function PostAttestazioneIaWorkSection (props: {
  data: Record<string, any>
  savedData: Record<string, any>
  fields: LayerFieldInfo[]
  canEdit: boolean
  role: string
  showIaInfo?: boolean
  saving: boolean
  onChange: (name: string, value: any) => void
  actionBarTarget?: HTMLElement | null
  vistoActionPending?: boolean
  attestazioneButtonTitle?: string
  onApplyAttestation: (note: string) => void
  onGenerateBozzaDeterminazioneWord: () => void
  onDeleteBozzaDeterminazione: () => boolean | Promise<boolean>
  onTransmitBozzaDeterminazioneRia: () => void
  onPrepareEmailDirettore: () => void
  onPrepareEmailProtocollo: () => void
  onGenerateAttoContestazioneWord: () => void
  attoCleanWordGeneratedAfterApproval?: boolean
  attoDirettoreEmailPrepared?: boolean
  onTransmitAttoContestazioneRia: () => void
  onPrepareEmailAttoDirettore: () => void
  onPrepareEmailAttoProtocollo: () => void
  canEditDetermination?: boolean
  oid: number | null
  ds: any
  layerUrl?: string
  bozzaRefreshKey?: string
  suppressActionGuide?: boolean
  workflowScope?: 'approvazione' | 'notifica'
}) {
  const st = useAdminStyle()
  const workflowScope = props.workflowScope || 'approvazione'
  const showDeterminationWorkflow = workflowScope === 'approvazione'
  const showAttoWorkflow = workflowScope === 'notifica'
  const d = props.data || {}
  const saved = props.savedData || {}
  const oid = props.oid != null && Number.isFinite(Number(props.oid)) ? Number(props.oid) : null
  const riaVerifyingMessage = adminBozzaWorkflowMessageForRole('RIA_VERIFYING', props.role)
  const iaEsitoCode = parseNumberInput(pickAttrCI(d, ['esito_IA']))
  const iaHaAttestatoConformita = iaEsitoCode === 2
  const iaHaRichiestoIntegrazioni = iaEsitoCode === 1
  const riaHaApprovatoProposta = isPropostaContestazioneApprovedByRia(d) || isDeterminazioneAdottata(d)
  const riaHaRimandatoProposta = isBozzaDeterminazioneRimandataDaRia(d)
  const vistoDaRinnovareDopoRimando = iaHaRichiestoIntegrazioni || riaHaRimandatoProposta
  const protocolloFascicoloOk = hasAdminValue(pickAttrCI(d, ['protocollo_fascicolo_numero'])) && hasAdminValue(pickAttrCI(d, ['protocollo_fascicolo_data']))
  const protocolloFascicoloSalvatoOk =
    hasAdminValue(pickAttrCI(saved, ['protocollo_fascicolo_numero'])) &&
    hasAdminValue(pickAttrCI(saved, ['protocollo_fascicolo_data']))
  const currentStatoBozzaCode = determinationWorkflowState(d)
  const emailDirettorePreparata = currentStatoBozzaCode === TRASMESSA_FIRMA_DA_STATE
  // Numero e data possono essere compilati dall'IA prima dell'acquisizione del PDF ufficiale.
  // In questa fase non devono, da soli, far avanzare il workflow come "ADOTTATA".
  // Numero e data salvati della Determinazione sono il riferimento stabile che chiude
  // definitivamente l'iter approvativo. Eventuali vecchi valori intermedi fuori dominio
  // vengono ricondotti ai milestone persistenti senza essere riutilizzati dal codice corrente.
  const determinazioneAdottata = currentStatoBozzaCode === 'ADOTTATA' || isDeterminazioneAdottata(saved)
  const determinationNumberRaw = pickAttrCI(d, ['determinazione_numero'])
  const determinationDateRaw = pickAttrCI(d, ['determinazione_data'])
  const savedDeterminationNumberRaw = pickAttrCI(saved, ['determinazione_numero'])
  const savedDeterminationDateRaw = pickAttrCI(saved, ['determinazione_data'])
  const determinationDraftComplete = hasAdminValue(determinationNumberRaw) && hasAdminValue(determinationDateRaw)
  const determinationDraftDirty =
    !sameDraftValue(savedDeterminationNumberRaw, determinationNumberRaw, 'determinazione_numero') ||
    !sameDraftValue(savedDeterminationDateRaw, determinationDateRaw, 'determinazione_data')
  const determinationYear = (() => {
    const ms = dateMsOrNull(determinationDateRaw)
    return ms != null ? new Date(ms).getFullYear() : null
  })()
  const determinationNumberText = String(determinationNumberRaw ?? '').trim()
  const derivedAccertamentoNumber = determinationDraftComplete && determinationYear && /^\d+$/.test(determinationNumberText)
    ? `A-${Number(determinationNumberText)}/${determinationYear}`
    : ''
  const determinationLocked =
    (isDeterminazioneAdottata(saved) && attoContestazioneWorkflowState(saved) !== '') ||
    hasAdminValue(pickAttrCI(saved, ['accertamento_data'])) ||
    hasAdminValue(pickAttrCI(saved, ['protocollo_atto_accertamento_numero'])) ||
    hasAdminValue(pickAttrCI(saved, ['protocollo_atto_accertamento_data'])) ||
    hasAdminValue(pickAttrCI(saved, ['notifica_data']))
  const determinationSectionVisible = emailDirettorePreparata || determinazioneAdottata || hasAdminValue(savedDeterminationNumberRaw) || hasAdminValue(savedDeterminationDateRaw)
  const canEditDetermination = !!props.canEditDetermination && determinationSectionVisible && !determinationLocked && !props.saving
  const attoFinaleNumero = String(pickAttrCI(d, ['accertamento_numero']) || '').trim()
  const attoBozzaPdfFilePart = String(attoFinaleNumero || oid || 'pratica').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'pratica'
  const attoBozzaPdfFileName = `bozza_atto_${attoBozzaPdfFilePart}.pdf`
  const attoWorkflow = showAttoWorkflow && isDeterminazioneAdottata(d) && !!attoFinaleNumero
  const attoWorkflowLocked =
    hasAdminValue(pickAttrCI(saved, ['protocollo_atto_accertamento_numero'])) ||
    hasAdminValue(pickAttrCI(saved, ['protocollo_atto_accertamento_data'])) ||
    hasAdminValue(pickAttrCI(saved, ['notifica_data']))
  const attoState = attoWorkflow ? attoContestazioneWorkflowState(d) : ''
  const attoWordGenerated = attoWorkflow && ['BOZZA', 'TRASMESSA_RIA', 'VALIDATA_RIA'].includes(attoState)
  const attoTransmittedRia = attoWorkflow && attoState === 'TRASMESSA_RIA'
  const attoApprovedRia = attoWorkflow && attoState === 'VALIDATA_RIA'
  const attoEmailDirettorePreparata = attoWorkflow && !!props.attoDirettoreEmailPrepared
  const tipoAttoFinaleLabel = displayAdminFieldValue(d, props.fields, 'tipo_atto_amm')
  const roleCode = String(props.role || '').trim().toUpperCase()
  const [paymentTableHasRows, setPaymentTableHasRows] = React.useState<boolean | null>(null)
  const [paymentTableReady, setPaymentTableReady] = React.useState<boolean | null>(null)
  React.useEffect(() => {
    setPaymentTableHasRows(null)
    setPaymentTableReady(null)
  }, [oid])
  // Una bozza è realmente generata solo dopo la produzione del Word.
  // Lo stato BOZZA viene impostato già al momento del visto e indica soltanto
  // l'apertura del ciclo: non deve quindi sbloccare prematuramente il caricamento PDF.
  const iaVistoAt = workflowTimestamp(pickAttrCI(d, ['dt_esito_IA']))
  const wordGeneratedAt = workflowTimestamp(pickAttrCI(d, ['dt_bozza_determinazione']))
  const approvalAt = workflowTimestamp(pickAttrCI(d, ['dt_esito_RIA']))
  const hasBozzaGenerated = wordGeneratedAt > 0 && (iaVistoAt <= 0 || wordGeneratedAt >= iaVistoAt)
  const bozzaRimandataDaRia = isBozzaDeterminazioneRimandataDaRia(d)
  const bozzaValidataDaRia = isBozzaDeterminazioneValidataDaRia(d)
  const bozzaRientrataDaRia = bozzaValidataDaRia || bozzaRimandataDaRia

  // Una bozza approvata non è una bozza "riaperta": dopo l'approvazione RIA
  // genera/carica/trasmetti al RIA devono restare bloccati. Si riaprono
  // automaticamente soltanto dopo un vero rimando. Un nuovo ciclo volontario
  // può essere avviato con "Rigenera bozza" solo dopo che il protocollo del
  // ciclo corrente è stato effettivamente registrato e salvato.
  const bozzaInLavorazioneIa = !attoWorkflow && (currentStatoBozzaCode === 'BOZZA' || bozzaRimandataDaRia)
  const postApprovalProtocolSaved = bozzaValidataDaRia && protocolloFascicoloSalvatoOk
  const canGenerateBozzaDeterminazione =
    props.canEdit &&
    !determinazioneAdottata &&
    iaHaAttestatoConformita &&
    !vistoDaRinnovareDopoRimando &&
    (bozzaInLavorazioneIa || postApprovalProtocolSaved)
  const bozzaAlreadyTransmitted = !!currentStatoBozzaCode && !bozzaInLavorazioneIa
  const determinationDisplayStateCode = determinazioneAdottata
    ? 'ADOTTATA'
    : (currentStatoBozzaCode || pickAttrCI(d, ['determinazione_stato']))
  const statoBozza = displayAdminFieldValue(
    { ...d, determinazione_stato: determinationDisplayStateCode },
    props.fields,
    'determinazione_stato',
    hasBozzaGenerated ? 'Bozza predisposta' : 'Non generata'
  )
  const dataGenerazione = displayAdminFieldValue(d, props.fields, 'dt_bozza_determinazione')
  const generataDa = displayAdminFieldValue(d, props.fields, 'bozza_determinazione_da')
  const determinationPdfFileName = sanitizeEmailFileName(`determinazione_${getReportCode(d, oid) || String(oid || '')}.pdf`, 'determinazione.pdf')
  const [bozzaAttachments, setBozzaAttachments] = React.useState<AmmAttachmentInfo[]>([])
  const [attoAttachments, setAttoAttachments] = React.useState<AmmAttachmentInfo[]>([])
  const [pagopaAttachments, setPagopaAttachments] = React.useState<AmmAttachmentInfo[]>([])
  const [protocolloManifestAvailable, setProtocolloManifestAvailable] = React.useState(false)
  const [attachmentsLoadedOid, setAttachmentsLoadedOid] = React.useState<number | null>(null)
  const [attachmentsLoading, setAttachmentsLoading] = React.useState(false)
  const [attachmentsBusy, setAttachmentsBusy] = React.useState(false)
  const [attachmentsError, setAttachmentsError] = React.useState<string | null>(null)
  const [attachmentsErrorSection, setAttachmentsErrorSection] = React.useState<'bozza' | 'atto' | 'protocollo'>('bozza')
  const [attachmentsInfo, setAttachmentsInfo] = React.useState<string | null>(null)
  const [protocolloImportResult, setProtocolloImportResult] = React.useState<{
    numero: string
    dataMs: number
    items: Array<{ docKey: string, fileName: string }>
  } | null>(null)
  const [inputKey, setInputKey] = React.useState(0)
  const [confirmDeleteBozza, setConfirmDeleteBozza] = React.useState(false)

  const resolveAttachmentLayer = React.useCallback(async () => {
    const layer = await resolveLayerForEdit(props.ds, props.layerUrl)
    const layerUrl = normalizeEditLayerUrl(props.layerUrl || layer?.url || getDataSourceUrl(props.ds))
    return { layer, layerUrl }
  }, [props.ds, props.layerUrl])

  const loadBozzaAttachments = React.useCallback(async () => {
    if (!oid) {
      setBozzaAttachments([])
      setAttoAttachments([])
      setPagopaAttachments([])
      setProtocolloManifestAvailable(false)
      setAttachmentsLoadedOid(null)
      setAttachmentsError(null)
      return
    }
    setAttachmentsLoading(true)
    setAttachmentsError(null)
    setAttachmentsInfo(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      if (!layer && !layerUrl) throw new Error('Allegati non disponibili.')
      let all = await queryAmmAttachments(layer, oid, layerUrl)
      let determinationPdfs = all.filter(isGiiBozzaDeterminazionePdfAttachment)

      // Una Determinazione adottata deve avere un solo PDF corrente nello slot.
      // Le vecchie versioni potevano lasciare duplicati quando l'aggiunta riusciva
      // ma una cancellazione successiva falliva. Conserviamo la copia ufficiale più
      // recente (preferendo quella con numero/data coerenti) e rimuoviamo le altre.
      const canRepairDeterminationAttachments = props.canEdit || roleCode === 'IA' || roleCode === 'ADMIN'
      if (canRepairDeterminationAttachments && isDeterminazioneAdottata(saved) && determinationPdfs.length > 1) {
        const expectedNumber = String(pickAttrCI(saved, ['determinazione_numero']) || '').trim()
        const expectedDate = dateInputValue(pickAttrCI(saved, ['determinazione_data']))
        const exactOfficial = determinationPdfs.filter(att =>
          isOfficialDeterminationAttachment(att) &&
          (!expectedNumber || ammAttachmentKeywordValue(att, 'detNumber') === expectedNumber) &&
          (!expectedDate || ammAttachmentKeywordValue(att, 'detDate') === expectedDate)
        )
        const official = determinationPdfs.filter(isOfficialDeterminationAttachment)
        const keep = pickLatestGiiAttachment((exactOfficial.length ? exactOfficial : (official.length ? official : determinationPdfs)) as any[]) as AmmAttachmentInfo | null
        let cleanupFailed = false
        if (keep) {
          for (const att of determinationPdfs) {
            if (Number(att.id) === Number(keep.id)) continue
            try { await deleteAmmAttachment(layer, oid, Number(att.id), layerUrl) } catch { cleanupFailed = true }
          }
          all = await queryAmmAttachments(layer, oid, layerUrl)
          determinationPdfs = all.filter(isGiiBozzaDeterminazionePdfAttachment)
          if (cleanupFailed && determinationPdfs.length > 1) {
            setAttachmentsError('Sono presenti più copie del PDF della Determinazione. La pulizia automatica non è stata completata; riprovare a riaprire la pratica.')
          }
        }
      }

      // Anche se la pulizia fisica non è consentita o non riesce, una Determinazione
      // adottata viene presentata come un unico documento corrente: non mostriamo
      // copie concorrenti della stessa Determinazione nel fascicolo.
      if (isDeterminazioneAdottata(saved) && determinationPdfs.length > 1) {
        const expectedNumber = String(pickAttrCI(saved, ['determinazione_numero']) || '').trim()
        const expectedDate = dateInputValue(pickAttrCI(saved, ['determinazione_data']))
        const exactOfficial = determinationPdfs.filter(att =>
          isOfficialDeterminationAttachment(att) &&
          (!expectedNumber || ammAttachmentKeywordValue(att, 'detNumber') === expectedNumber) &&
          (!expectedDate || ammAttachmentKeywordValue(att, 'detDate') === expectedDate)
        )
        const official = determinationPdfs.filter(isOfficialDeterminationAttachment)
        const current = pickLatestGiiAttachment((exactOfficial.length ? exactOfficial : (official.length ? official : determinationPdfs)) as any[]) as AmmAttachmentInfo | null
        if (current) determinationPdfs = [current]
      }

      setBozzaAttachments(determinationPdfs)
      setAttoAttachments(all.filter(isGiiAttoContestazionePdfAttachment))
      setPagopaAttachments(all.filter(isGiiPagoPaAttachment))
      setProtocolloManifestAvailable(all.some(att => isGiiProtocolloFascicoloManifestAttachment(att as any)))
      setAttachmentsLoadedOid(oid)
    } catch (e: any) {
      setBozzaAttachments([])
      setAttoAttachments([])
      setPagopaAttachments([])
      setProtocolloManifestAvailable(false)
      setAttachmentsLoadedOid(oid)
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsLoading(false)
    }
  }, [oid, props.canEdit, resolveAttachmentLayer, roleCode, saved])

  React.useEffect(() => {
    if (oid && attachmentsLoadedOid !== oid) void loadBozzaAttachments()
  }, [oid, attachmentsLoadedOid, loadBozzaAttachments])

  React.useEffect(() => {
    setProtocolloImportResult(null)
  }, [oid])

  React.useEffect(() => {
    // Quando il visto viene riapposto dopo un rimando o quando cambia lo stato della bozza,
    // il parent aggiorna i campi amministrativi ma non può accedere allo stato locale
    // della bozza PDF. Azzerando il marker, il viewer rilegge gli allegati reali.
    setAttachmentsLoadedOid(null)
  }, [props.bozzaRefreshKey])

  const attachmentsResolved = !oid || (attachmentsLoadedOid === oid && !attachmentsLoading)
  const rawDeterminationState = String(pickAttrCI(d, ['determinazione_stato']) || '').trim().toUpperCase()
  const hasLegacyNonDomainDeterminationState = !!rawDeterminationState && !DETERMINAZIONE_DOMAIN_STATES.has(rawDeterminationState)

  // La trasmissione al protocollo non è uno stato della Determinazione: è attestata
  // dal manifest allegato alla pratica. Numero/data restano gli unici dati del FL
  // relativi all'esito della protocollazione.
  const fascicoloTrasmessoAlProtocollo = protocolloManifestAvailable
  const protocolloFascicoloInAttesaRientro =
    riaHaApprovatoProposta &&
    fascicoloTrasmessoAlProtocollo &&
    !protocolloFascicoloSalvatoOk

  // Compatibilità con pratiche avviate prima del manifest: un vecchio valore fuori
  // dominio segnala che il ciclo era già avanzato, ma la nuova e-mail va ricreata
  // per registrare la composizione del fascicolo senza introdurre nuovi pseudo-stati.
  const legacyProtocolloTransmissionNeedsRebuild =
    riaHaApprovatoProposta &&
    !protocolloFascicoloSalvatoOk &&
    attachmentsResolved &&
    !protocolloManifestAvailable &&
    hasLegacyNonDomainDeterminationState
  const propostaUfficialeDaAcquisire = protocolloFascicoloInAttesaRientro
  const canEditProtocolloFascicolo =
    props.canEdit &&
    riaHaApprovatoProposta &&
    !vistoDaRinnovareDopoRimando &&
    protocolloFascicoloInAttesaRientro
  const riaApprovedMessage = roleCode === 'IA'
    ? (protocolloFascicoloSalvatoOk
        ? 'I dati di protocollo del fascicolo sono stati registrati. È possibile procedere all’aggiornamento della determinazione.'
        : (fascicoloTrasmessoAlProtocollo
            ? 'Il fascicolo è stato predisposto per il protocollo. Selezionare insieme tutti i PDF restituiti dal protocollo: gli elaborati saranno riconosciuti e sostituiti automaticamente e verranno letti numero e data di protocollo. Salvare quindi i dati per proseguire.'
            : 'La verifica amministrativa è stata approvata. Trasmettere gli elaborati del fascicolo al protocollo; al rientro selezionare insieme tutti i PDF protocollati. Il gestionale verificherà il fascicolo, leggerà automaticamente numero e data di protocollo e sostituirà ciascun elaborato con la relativa versione protocollata.'))
    : adminBozzaWorkflowMessageForRole('RIA_APPROVED', props.role)
  const hasBozzaPdfCaricata = bozzaAttachments.length > 0
  const verifiedFinalPdfCaricato = bozzaAttachments.some(isVerifiedFinalBozzaAttachment)
  const officialDeterminationPdf = bozzaAttachments.find(isOfficialDeterminationAttachment) || null
  // Compatibilità con determinazioni archiviate prima dell'introduzione della keyword
  // officialCopy: se la pratica è già ADOTTATA, il PDF corrente dello slot è
  // comunque il documento archiviato da sostituire in caso di errore materiale.
  const archivedDeterminationPdf = officialDeterminationPdf || (determinazioneAdottata
    ? (pickLatestGiiAttachment(bozzaAttachments as any[]) as AmmAttachmentInfo | null)
    : null)
  // Dal momento in cui è presente la copia ufficiale (o la pratica è già adottata
  // e lo slot contiene il documento archiviato), il PDF non deve più essere
  // presentato come "bozza". Lo slot tecnico resta lo stesso, ma semanticamente
  // il documento è la Determinazione acquisita.
  const determinationPdfIsOfficial = !!officialDeterminationPdf || (determinazioneAdottata && !!archivedDeterminationPdf)
  const officialDeterminationMatchesDraft = !!officialDeterminationPdf &&
    ammAttachmentKeywordValue(officialDeterminationPdf, 'detNumber') === determinationNumberText &&
    ammAttachmentKeywordValue(officialDeterminationPdf, 'detDate') === dateInputValue(determinationDateRaw)
  // Dopo la predisposizione dell'e-mail al DA il PDF ufficiale resta da acquisire.
  const determinazioneUfficialeDaAcquisire = emailDirettorePreparata && !officialDeterminationMatchesDraft
  // Dopo l'adozione l'IA può correggere esclusivamente un errore materiale di archiviazione:
  // il nuovo PDF sostituisce quello già presente senza riaprire alcun ciclo istruttorio.
  // La sostituzione resta disponibile finché l'Atto non è stato a sua volta adottato/protocollato/notificato.
  const canReplaceArchivedDeterminationPdf =
    roleCode === 'IA' &&
    props.canEdit &&
    determinazioneAdottata &&
    !!archivedDeterminationPdf &&
    !hasAdminValue(pickAttrCI(saved, ['accertamento_data'])) &&
    !hasAdminValue(pickAttrCI(saved, ['protocollo_atto_accertamento_numero'])) &&
    !hasAdminValue(pickAttrCI(saved, ['protocollo_atto_accertamento_data'])) &&
    !hasAdminValue(pickAttrCI(saved, ['notifica_data'])) &&
    !props.saving &&
    !attachmentsBusy
  const canUploadOfficialDeterminationPdf = determinazioneUfficialeDaAcquisire || canReplaceArchivedDeterminationPdf

  // Un PDF già caricato chiude la fase di preparazione manuale.
  // Prima dell'approvazione restano solo Trasmetti/Elimina. Dopo l'approvazione
  // la versione verificata dal RIA è cristallizzata: il successivo PDF definitivo
  // può essere prodotto soltanto dal flusso controllato post-protocollo e, una volta
  // verificato, non può più essere eliminato o sostituito liberamente.
  const canPreparePdfSlot =
    !hasBozzaPdfCaricata ||
    (postApprovalProtocolSaved && !verifiedFinalPdfCaricato)

  const actionDisabled =
    !attachmentsResolved ||
    !props.canEdit ||
    !canGenerateBozzaDeterminazione ||
    !canPreparePdfSlot ||
    props.saving ||
    attachmentsBusy

  // Il PDF può essere caricato solo dopo la generazione del Word della fase corrente.
  // Prima dell'approvazione deve essere successivo al visto IA; dopo
  // l'approvazione deve essere una nuova generazione successiva all'esito RIA.
  const wordReadyForPdf = postApprovalProtocolSaved
    ? (approvalAt > 0 && wordGeneratedAt > approvalAt)
    : hasBozzaGenerated

  const uploadBozzaPdf = React.useCallback(async (file: File | null) => {
    if (!file || !oid || !props.canEdit || props.saving || attachmentsBusy || !canGenerateBozzaDeterminazione || !wordReadyForPdf) return
    const originalName = String(file.name || '').trim()
    setAttachmentsErrorSection('bozza')
    if (!/\.pdf$/i.test(originalName)) {
      setAttachmentsError(postApprovalProtocolSaved ? 'Caricare la determinazione in formato PDF.' : 'Caricare la bozza in formato PDF.')
      return
    }
    setAttachmentsBusy(true)
    setAttachmentsError(null)
    setAttachmentsInfo(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      let extraKeywords = ''
      let verificationMode: 'approved' | 'structured' = 'approved'

      if (postApprovalProtocolSaved) {
        const protocolNumber = pickAttrCI(saved, ['protocollo_fascicolo_numero'])
        const protocolDate = pickAttrCI(saved, ['protocollo_fascicolo_data'])

        // Controllo preferenziale: impronta del PDF esatto trasmesso a RIA.
        let approvedReference = await loadApprovedBozzaReferencePayload(layer, oid, layerUrl)
        if (!approvedReference) {
          const freshAttachments = await queryAmmAttachments(layer, oid, layerUrl)
          const legacyCandidates = freshAttachments.filter(isGiiBozzaDeterminazionePdfAttachment)
          const legacyApproved = pickLatestGiiAttachment(legacyCandidates as any[]) as AmmAttachmentInfo | null
          if (legacyApproved) {
            const legacyBlob = await fetchAmmAttachmentBlobForPdf(legacyApproved, oid, layerUrl)
            approvedReference = await replaceApprovedBozzaReferenceAttachment(layer, oid, layerUrl, legacyBlob)
          }
        }

        let verifiedHash = ''
        let strictError: any = null
        if (approvedReference) {
          try {
            const verified = await verifyFinalPdfAgainstApprovedReference(approvedReference, file, protocolNumber, protocolDate)
            verifiedHash = verified.approvedTextSha256 || ''
          } catch (e) {
            strictError = e
          }
        }

        // Per i riferimenti storici o per i PDF in cui Word/PDF.js cambia l'ordine
        // del testo estratto a causa dell'impaginazione, proviamo il confronto diretto
        // con il PDF approvato, se è ancora presente.
        if (!verifiedHash) {
          try {
            const freshAttachments = await queryAmmAttachments(layer, oid, layerUrl)
            const approvedPdf = pickLatestGiiAttachment(freshAttachments.filter(isGiiBozzaDeterminazionePdfAttachment) as any[]) as AmmAttachmentInfo | null
            if (approvedPdf) {
              const approvedBlob = await fetchAmmAttachmentBlobForPdf(approvedPdf, oid, layerUrl)
              const verified = await verifyFinalPdfAgainstApproved(approvedBlob, file, protocolNumber, protocolDate)
              verifiedHash = verified.approvedTextSha256 || ''
            }
          } catch (e) {
            if (!strictError) strictError = e
          }
        }

        if (verifiedHash) {
          extraKeywords = [
            'finalVerifiedAgainstApproved=1',
            `verifiedAt=${Date.now()}`,
            `approvedTextSha256=${verifiedHash}`
          ].filter(Boolean).join('|')
        } else {
          // Ultimo controllo, pensato proprio per il Word definitivo rigenerato dal
          // gestionale dopo la protocollazione. Il confronto hash integrale può
          // risultare diverso pur a contenuto invariato (impaginazione, ordine di
          // estrazione PDF.js, spezzature di pagina). Verifichiamo quindi in modo
          // strutturale tutti i riferimenti sostanziali della pratica e gli estremi
          // della Proposta protocollata. Non vengono accettati PDF con filigrana BOZZA.
          const candidate = await extractPdfVerificationContent(file)
          try {
            verifyDefinitiveDeterminationAgainstPractice(candidate, d, props.fields, oid, protocolNumber, protocolDate)
          } catch (structuredError) {
            throw strictError || structuredError
          }
          verificationMode = 'structured'
          extraKeywords = [
            'finalVerifiedAgainstPractice=1',
            'verificationMode=structured',
            `verifiedAt=${Date.now()}`
          ].join('|')
        }
      }

      const attachmentFile = postApprovalProtocolSaved
        ? new File(
            [file],
            sanitizeEmailFileName(`determinazione_${getReportCode(d, oid) || String(oid)}.pdf`, `determinazione_${String(oid)}.pdf`),
            { type: file.type || 'application/pdf', lastModified: Number(file.lastModified) || Date.now() }
          )
        : file
      const updatedBozzaAttachments = await replaceBozzaDeterminazionePdfAttachment(layer, oid, attachmentFile, layerUrl, extraKeywords)
      setBozzaAttachments(updatedBozzaAttachments)
      setAttachmentsLoadedOid(oid)
      setInputKey(k => k + 1)

      if (postApprovalProtocolSaved) setAttachmentsInfo(null)
    } catch (e: any) {
      setAttachmentsErrorSection('bozza')
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsBusy(false)
    }
  }, [attachmentsBusy, canGenerateBozzaDeterminazione, d, oid, postApprovalProtocolSaved, props.canEdit, props.fields, props.saving, resolveAttachmentLayer, saved, wordReadyForPdf])



  const uploadProtocolloFascicolo = React.useCallback(async (selectedFiles: File[]) => {
    const files = Array.from(selectedFiles || []).filter(Boolean)
    if (!files.length || !oid || !propostaUfficialeDaAcquisire || !props.canEdit || props.saving || attachmentsBusy) return
    if (files.some(file => !/\.pdf$/i.test(String(file.name || '')))) {
      setAttachmentsError('Caricare esclusivamente i PDF del fascicolo restituiti dal protocollo.')
      return
    }

    setAttachmentsBusy(true)
    setAttachmentsErrorSection('protocollo')
    setAttachmentsError(null)
    setAttachmentsInfo(null)
    setProtocolloImportResult(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      const manifest = await loadProtocolloFascicoloManifest(layer, oid, layerUrl)
      const expectedByName = new Map<string, ProtocolloFascicoloManifestItem>()
      for (const item of manifest.items) {
        const key = normalizeProtocolloReturnFileName(item.fileName)
        if (!key || expectedByName.has(key)) {
          throw new Error('La composizione registrata del fascicolo contiene nomi file non univoci. Predisporre nuovamente la trasmissione al protocollo.')
        }
        expectedByName.set(key, item)
      }

      const selectedByName = new Map<string, File>()
      for (const file of files) {
        const key = normalizeProtocolloReturnFileName(file.name)
        if (!key || selectedByName.has(key)) {
          throw new Error(`Il file "${file.name}" è stato selezionato più di una volta.`)
        }
        selectedByName.set(key, file)
      }

      const missing = manifest.items.filter(item => !selectedByName.has(normalizeProtocolloReturnFileName(item.fileName)))
      const unexpected = files.filter(file => !expectedByName.has(normalizeProtocolloReturnFileName(file.name)))
      if (missing.length || unexpected.length) {
        const parts: string[] = []
        if (missing.length) parts.push(`mancano ${missing.length} elaborat${missing.length === 1 ? 'o' : 'i'}: ${missing.map(x => x.fileName).join(', ')}`)
        if (unexpected.length) parts.push(`non riconosciut${unexpected.length === 1 ? 'o' : 'i'}: ${unexpected.map(x => x.name).join(', ')}`)
        throw new Error(`Il fascicolo selezionato non coincide con quello trasmesso al protocollo (${parts.join('; ')}).`)
      }

      const ordered = manifest.items.map(item => ({
        item,
        file: selectedByName.get(normalizeProtocolloReturnFileName(item.fileName))!
      }))
      const contents = await Promise.all(ordered.map(entry => extractPdfVerificationContent(entry.file)))
      const protocol = extractConsensusOfficialProtocol(contents)

      // La Proposta resta il controllo documentale più forte: deve corrispondere
      // alla versione approvata già presente nel fascicolo, a parte il timbro di protocollo.
      const propostaIndex = ordered.findIndex(entry => entry.item.docKey === 'proposta')
      if (propostaIndex < 0) throw new Error('La composizione del fascicolo trasmesso non contiene la Proposta di contestazione.')
      const currentAttachments = await queryAmmAttachments(layer, oid, layerUrl)
      const currentProposta = pickLatestGiiAttachment(
        currentAttachments.filter(isGiiPropostaContestazionePdfAttachment) as any[]
      ) as AmmAttachmentInfo | null
      if (!currentProposta) throw new Error('La Proposta di contestazione presente nel fascicolo non è disponibile per il confronto.')
      const currentPropostaBlob = await fetchAmmAttachmentBlobForPdf(currentProposta, oid, layerUrl)
      const currentPropostaContent = await extractPdfVerificationContent(currentPropostaBlob)
      const returnedPropostaContent = contents[propostaIndex]
      if (
        !currentPropostaContent.text ||
        !returnedPropostaContent?.text ||
        !candidatePreservesApprovedPdfText(currentPropostaContent.text, returnedPropostaContent.text)
      ) {
        throw new Error('La Proposta protocollata non corrisponde alla Proposta presente nel fascicolo. Nessun elaborato è stato acquisito.')
      }

      // Preflight: tutti gli allegati già presenti devono essere ancora identificabili
      // prima di iniziare qualsiasi sostituzione.
      const genericEntries = ordered.filter(entry => entry.item.docKey.startsWith('allegato:'))
      const genericSources = new Map<number, { att: AmmAttachmentInfo; originalBlob: Blob }>()
      for (const entry of genericEntries) {
        const sourceId = Number(entry.item.sourceAttachmentId)
        const source = currentAttachments.find(att => Number(att.id) === sourceId)
        if (!Number.isFinite(sourceId) || sourceId <= 0 || !source) {
          throw new Error(`L’allegato "${entry.item.sourceAttachmentName || entry.item.fileName}" non è più disponibile nella pratica. Nessun elaborato è stato acquisito.`)
        }
        genericSources.set(sourceId, {
          att: source,
          originalBlob: await fetchAmmAttachmentBlobForPdf(source, oid, layerUrl)
        })
      }

      const snapshotEntries = ordered.filter(entry =>
        entry.item.docKey === 'rapporto' ||
        entry.item.docKey === 'mappa' ||
        entry.item.docKey.startsWith('nota_spese:')
      )
      const newSnapshotIds: number[] = []
      const oldSnapshotIds = currentAttachments
        .filter(att => isGiiProtocolloFascicoloPdfAttachment(att as any))
        .filter(att => snapshotEntries.some(entry => giiAttachmentKeywordValue(att as any, 'protocolDocKey') === entry.item.docKey))
        .map(att => Number(att.id))
        .filter(id => Number.isFinite(id) && id > 0)

      const updatedGenericIds: number[] = []
      let propostaMutationStarted = false
      try {
        // Rapporto, Note spese e Mappa non erano allegati persistenti: archiviamo
        // le versioni protocollate come snapshot interne usate dal viewer.
        for (const entry of snapshotEntries) {
          const snapshotFile = new File(
            [entry.file],
            protocolloFriendlyPdfName(entry.item, entry.file.name),
            { type: 'application/pdf', lastModified: Date.now() }
          )
          const ids = await addAmmAttachments(
            layer,
            oid,
            [snapshotFile],
            layerUrl,
            protocolloFascicoloSnapshotKeywords(entry.item, protocol, manifest.createdAt)
          )
          const addedId = Number(ids?.[0])
          if (!Number.isFinite(addedId) || addedId <= 0) {
            throw new Error(`Non è stato possibile archiviare l’elaborato protocollato "${entry.item.fileName}".`)
          }
          newSnapshotIds.push(addedId)
        }

        // Gli allegati esistenti vengono sostituiti sullo stesso attachment ID:
        // classificazione e riferimenti logici rimangono invariati.
        for (const entry of genericEntries) {
          const sourceId = Number(entry.item.sourceAttachmentId)
          const source = genericSources.get(sourceId)!.att
          const replacement = new File(
            [entry.file],
            protocolloFriendlyPdfName(entry.item, source.name || entry.file.name),
            { type: 'application/pdf', lastModified: Date.now() }
          )
          await updateAmmAttachmentFile(oid, sourceId, replacement, layerUrl)
          updatedGenericIds.push(sourceId)
        }

        const propostaEntry = ordered[propostaIndex]
        const propostaFile = new File(
          [propostaEntry.file],
          protocolloFriendlyPdfName(propostaEntry.item, propostaEntry.file.name),
          { type: 'application/pdf', lastModified: Date.now() }
        )
        propostaMutationStarted = true
        await replacePropostaContestazionePdfAttachment(layer, oid, propostaFile, layerUrl, 'APPROVED')
      } catch (mutationError) {
        // Se una sostituzione intermedia fallisce, ripristiniamo gli allegati generici
        // già aggiornati e rimuoviamo le snapshot appena create.
        if (propostaMutationStarted) {
          try {
            const rollbackProposta = new File(
              [currentPropostaBlob],
              String(currentProposta.name || 'proposta_contestazione.pdf'),
              { type: String(currentProposta.contentType || currentPropostaBlob.type || 'application/pdf'), lastModified: Date.now() }
            )
            await updateAmmAttachmentFile(oid, Number(currentProposta.id), rollbackProposta, layerUrl)
          } catch {}
        }
        for (const sourceId of [...updatedGenericIds].reverse()) {
          const original = genericSources.get(sourceId)
          if (!original) continue
          try {
            const rollbackFile = new File(
              [original.originalBlob],
              String(original.att.name || `allegato_${sourceId}`),
              { type: String(original.att.contentType || original.originalBlob.type || 'application/octet-stream'), lastModified: Date.now() }
            )
            await updateAmmAttachmentFile(oid, sourceId, rollbackFile, layerUrl)
          } catch {}
        }
        for (const id of newSnapshotIds) {
          try { await deleteAmmAttachment(layer, oid, id, layerUrl) } catch {}
        }
        throw mutationError
      }

      // Le vecchie snapshot possono essere eliminate solo dopo la riuscita completa.
      for (const id of oldSnapshotIds) {
        if (newSnapshotIds.includes(id)) continue
        try { await deleteAmmAttachment(layer, oid, id, layerUrl) } catch {}
      }

      props.onChange('protocollo_fascicolo_numero', protocol.numero)
      props.onChange('protocollo_fascicolo_data', protocol.dataMs)

      // Aggiorniamo lo stato locale degli allegati senza passare dal reload automatico:
      // loadBozzaAttachments() azzera attachmentsInfo e faceva sparire immediatamente
      // il riscontro dell'acquisizione appena conclusa.
      const allAfter = await queryAmmAttachments(layer, oid, layerUrl)
      setBozzaAttachments(allAfter.filter(isGiiBozzaDeterminazionePdfAttachment))
      setAttoAttachments(allAfter.filter(isGiiAttoContestazionePdfAttachment))
      setPagopaAttachments(allAfter.filter(isGiiPagoPaAttachment))
      setProtocolloManifestAvailable(allAfter.some(att => isGiiProtocolloFascicoloManifestAttachment(att as any)))
      setAttachmentsLoadedOid(oid)

      setProtocolloImportResult({
        numero: protocol.numero,
        dataMs: protocol.dataMs,
        items: ordered.map(entry => ({
          docKey: String(entry.item.docKey || ''),
          fileName: String(entry.item.sourceAttachmentName || entry.item.fileName || entry.file.name || '').trim()
        }))
      })
      setAttachmentsInfo(
        `Fascicolo protocollato acquisito: ${ordered.length} elaborati riconosciuti e sostituiti. ` +
        `Protocollo ${protocol.numero} del ${new Date(protocol.dataMs).toLocaleDateString('it-IT')} letto automaticamente. Salvare i dati per proseguire.`
      )
      setInputKey(k => k + 1)
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsBusy(false)
    }
  }, [attachmentsBusy, oid, propostaUfficialeDaAcquisire, props, resolveAttachmentLayer])

  const uploadDeterminazioneUfficiale = React.useCallback(async (file: File | null) => {
    if (!file || !oid || !canUploadOfficialDeterminationPdf || !props.canEdit || props.saving || attachmentsBusy) return
    if (!/\.pdf$/i.test(String(file.name || ''))) {
      setAttachmentsError('Caricare la determinazione ufficiale in formato PDF.')
      return
    }
    setAttachmentsBusy(true)
    setAttachmentsError(null)
    setAttachmentsInfo(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      const candidateContent = await extractPdfVerificationContent(file)
      if (!candidateContent.text) throw new Error('Non è stato possibile leggere il contenuto della copia PDF conforme della determinazione ufficiale.')
      // La copia PDF conforme può differire dalla bozza inviata al DA per la normale
      // anonimizzazione/redazione della Segreteria. Verifichiamo quindi gli elementi
      // sostanziali della pratica, non l'identità testuale del documento.
      verifyOfficialDeterminationAgainstPractice(candidateContent.text, d, props.fields, oid)
      const meta = extractOfficialDeterminationMetadata(candidateContent.text)
      const extractedDateKey = dateInputValue(meta.dataMs)
      // Normalizziamo anche il nome fisico dell'allegato: il file acquisito non è
      // più una bozza, anche se l'utente lo ha esportato da Word con un vecchio nome.
      const officialFile = new File(
        [file],
        determinationPdfFileName,
        {
          type: String(file.type || 'application/pdf'),
          lastModified: Number(file.lastModified) || Date.now()
        }
      )
      await replaceBozzaDeterminazionePdfAttachment(
        layer,
        oid,
        officialFile,
        layerUrl,
        `official=1|officialCopy=1|officialAt=${Date.now()}|detNumber=${meta.numero}|detDate=${extractedDateKey}`
      )
      // Gli estremi ufficiali sono acquisiti dalla copia PDF conforme, non digitati a mano.
      // Il controllo al salvataggio verifica poi che questi valori non siano stati alterati
      // rispetto ai metadati estratti e registrati nelle keywords dell'allegato.
      props.onChange('determinazione_numero', String(meta.numero))
      props.onChange('determinazione_data', meta.dataMs)
      setAttachmentsInfo(`${canReplaceArchivedDeterminationPdf ? 'PDF ufficiale sostituito' : 'Determinazione ufficiale acquisita'}: n. ${meta.numero} del ${new Date(meta.dataMs).toLocaleDateString('it-IT')}. Numero e data sono stati letti automaticamente dalla copia PDF conforme${canReplaceArchivedDeterminationPdf ? '; se sono cambiati, usare Salva per aggiornare gli estremi registrati.' : '; usare Salva per registrarli e completare i controlli di unicità.'}`)
      setBozzaAttachments(await queryAmmAttachments(layer, oid, layerUrl).then(allAfter => allAfter.filter(isGiiBozzaDeterminazionePdfAttachment)))
      setAttachmentsLoadedOid(oid)
      setInputKey(k => k + 1)
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsBusy(false)
    }
  }, [attachmentsBusy, canReplaceArchivedDeterminationPdf, canUploadOfficialDeterminationPdf, d, determinationPdfFileName, oid, props, resolveAttachmentLayer])

  const downloadBozzaPdf = React.useCallback(async (att: AmmAttachmentInfo) => {
    if (!att || !oid || attachmentsBusy) return
    setAttachmentsBusy(true)
    setAttachmentsError(null)
    try {
      const { layerUrl } = await resolveAttachmentLayer()
      await downloadAmmAttachmentFile(att, oid, layerUrl, determinationPdfIsOfficial ? determinationPdfFileName : undefined)
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsBusy(false)
    }
  }, [attachmentsBusy, determinationPdfFileName, determinationPdfIsOfficial, oid, resolveAttachmentLayer])

  const attoFirmatoAttachments = attoAttachments.filter(isSignedAttoContestazioneAttachment)
  const attoDaFirmareAttachments = attoAttachments.filter(isAttoDaFirmareAttachment)
  const hasAttoPdfCaricato = attoAttachments.length > 0
  const hasAttoFirmato = attoFirmatoAttachments.length > 0
  const hasAttoDaFirmare = attoDaFirmareAttachments.length > 0
  const protocolloAttoCompleto =
    hasAdminValue(pickAttrCI(saved, ['protocollo_atto_accertamento_numero'])) &&
    hasAdminValue(pickAttrCI(saved, ['protocollo_atto_accertamento_data']))
  const attoInLavorazioneIa = attoWorkflow && (attoState === '' || attoState === 'BOZZA')
  const paymentModeForAtto = getPaymentMode(d, props.fields)
  const attoPreDraftReady = !!paymentModeForAtto && hasAdminValue(pickAttrCI(d, ['notifica_tipo']))
  const legacyAttoPostFirmaPaymentReady = hasAdminValue(pickAttrCI(d, ['pagamento_scadenza'])) &&
    (!['PAGOPA', 'MISTO'].includes(paymentModeForAtto) || pagopaAttachments.length > 0)
  const attoPostFirmaPaymentReady = paymentTableHasRows === true
    ? paymentTableReady === true
    : paymentTableHasRows === false
      ? legacyAttoPostFirmaPaymentReady
      : false
  const attoRichiedeVersionePulita = attoApprovedRia && !hasAttoDaFirmare && !hasAttoFirmato
  const attoCleanWordGeneratedAfterApproval = !!props.attoCleanWordGeneratedAfterApproval
  const canGenerateAttoContestazioneWord =
    props.canEdit &&
    attoWorkflow &&
    !attoWorkflowLocked &&
    (attoInLavorazioneIa || attoRichiedeVersionePulita) &&
    (attoRichiedeVersionePulita || !hasAttoPdfCaricato) &&
    (attoRichiedeVersionePulita || attoPreDraftReady) &&
    !determinationDraftDirty &&
    !props.saving &&
    !attachmentsBusy
  const canUploadSignedAtto =
    (attoEmailDirettorePreparata || hasAttoDaFirmare || hasAttoFirmato) &&
    hasAttoPdfCaricato &&
    !protocolloAttoCompleto
  const canUploadAttoContestazione =
    props.canEdit &&
    attoWorkflow &&
    !attoWorkflowLocked &&
    (
      (attoState === 'BOZZA' && attoWordGenerated && !hasAttoPdfCaricato) ||
      (attoApprovedRia && hasAttoPdfCaricato && !hasAttoDaFirmare && !hasAttoFirmato) ||
      canUploadSignedAtto
    ) &&
    !props.saving &&
    !attachmentsBusy
  const canDeleteAttoContestazione =
    props.canEdit &&
    attoWorkflow &&
    hasAttoPdfCaricato &&
    attoState === 'BOZZA' &&
    !attoWorkflowLocked &&
    !props.saving &&
    !attachmentsBusy
  const canTransmitAttoContestazione =
    props.canEdit &&
    attoWorkflow &&
    attoState === 'BOZZA' &&
    hasAttoPdfCaricato &&
    !attoWorkflowLocked &&
    !props.saving &&
    !attachmentsBusy
  const canPrepareEmailAttoDirettore =
    props.canEdit &&
    attoWorkflow &&
    attoApprovedRia &&
    hasAttoDaFirmare &&
    !hasAttoFirmato &&
    !attoWorkflowLocked &&
    !props.saving &&
    !attachmentsBusy
  const canPrepareEmailAttoProtocollo =
    props.canEdit &&
    attoWorkflow &&
    hasAttoFirmato &&
    attoPostFirmaPaymentReady &&
    !protocolloAttoCompleto &&
    !attoWorkflowLocked &&
    !props.saving &&
    !attachmentsBusy

  const deletePagoPaPdf = React.useCallback(async (att: AmmAttachmentInfo) => {
    if (!att || !oid || !props.canEdit || protocolloAttoCompleto || props.saving || attachmentsBusy) return
    setAttachmentsBusy(true)
    setAttachmentsErrorSection('atto')
    setAttachmentsError(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      await deleteAmmAttachment(layer, oid, Number(att.id), layerUrl)
      const allAfter = await queryAmmAttachments(layer, oid, layerUrl)
      const remaining = allAfter.filter(isGiiPagoPaAttachment)
      setPagopaAttachments(remaining)
      if (!remaining.length) props.onChange('pagamento_scadenza', null)
      setAttachmentsLoadedOid(oid)
      setInputKey(k => k + 1)
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsBusy(false)
    }
  }, [attachmentsBusy, oid, props, protocolloAttoCompleto, resolveAttachmentLayer])

  const uploadAttoContestazionePdf = React.useCallback(async (file: File | null) => {
    if (!file || !oid || !canUploadAttoContestazione) return
    const originalName = String(file.name || '').trim()
    if (!/\.pdf$/i.test(originalName)) {
      setAttachmentsErrorSection('atto')
      setAttachmentsError('Caricare il documento in formato PDF.')
      return
    }
    setAttachmentsBusy(true)
    setAttachmentsErrorSection('atto')
    setAttachmentsError(null)
    setAttachmentsInfo(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      if (!layer && !layerUrl) throw new Error('Documento non disponibile per il caricamento.')
      const now = Date.now()

      if (attoEmailDirettorePreparata || hasAttoDaFirmare || hasAttoFirmato) {
        // Un solo slot documentale: la versione firmata sostituisce quella inviata
        // al DA; la successiva copia protocollata sostituisce a sua volta la firmata.
        const allBefore = await queryAmmAttachments(layer, oid, layerUrl)
        const currentAtto = pickLatestGiiAttachment(allBefore.filter(isGiiAttoContestazionePdfAttachment) as any[]) as AmmAttachmentInfo | null
        if (!currentAtto) throw new Error('La versione corrente dell’Atto non è disponibile per la verifica.')
        const currentBlob = await fetchAmmAttachmentBlobForPdf(currentAtto, oid, layerUrl)
        const currentSigned = isSignedAttoContestazioneAttachment(currentAtto) || await pdfContainsDigitalSignature(currentBlob)
        const candidateContent = await extractPdfVerificationContent(file)
        const signerIdentityBypass = roleCode === 'ADMIN' || currentUserIsWorkflowAdmin()
        const authorizedSigners = signerIdentityBypass ? [] : await loadAuthorizedAttoSignerIdentities()

        let protocolMeta: OfficialProtocolMetadata | null = null
        if (currentSigned) protocolMeta = extractOfficialProtocolMetadata(candidateContent.protocolSearchText || candidateContent.text)

        if (!currentSigned) {
          await verifySignedAttoAgainstUnsigned(currentBlob, file, authorizedSigners, signerIdentityBypass)
        } else {
          const currentContent = await extractPdfVerificationContent(currentBlob)
          if (!currentContent.text || !candidateContent.text || (!approvedAttoContentMatches(currentContent.text, candidateContent.text) && !candidatePreservesApprovedPdfText(currentContent.text, candidateContent.text))) {
            throw new Error('Il PDF caricato non corrisponde all’Atto firmato già acquisito. Il documento non è stato sostituito.')
          }
          if (!(await pdfContainsDigitalSignature(file))) {
            throw new Error('La copia ufficiale deve conservare la firma digitale del Direttore.')
          }
          await verifyAttoDigitalSignerIdentity(file, authorizedSigners, signerIdentityBypass)
        }

        const official = !!protocolMeta
        const fileName = originalName || `atto_accertamento_${String(attoFinaleNumero || oid).replace(/[^a-zA-Z0-9_-]/g, '_')}${official ? '_protocollato' : '_firmato'}.pdf`
        const uploadFile = file.name === fileName ? file : new File([file], fileName, { type: file.type || 'application/pdf', lastModified: file.lastModified || now })
        const ids = await addAmmAttachments(layer, oid, [uploadFile], layerUrl, `${GII_ATTACHMENT_KEYWORDS.attoContestazione}|attoFirmato=1|${official ? 'officialProtocolled=1' : 'signedByDa=1'}|fileCreatedAt=${now}`)
        const keepId = Number(ids?.[0])
        if (!Number.isFinite(keepId) || keepId <= 0) throw new Error('PDF caricato, ma documento non identificabile.')
        for (const oldAtt of allBefore.filter(isGiiAttoContestazionePdfAttachment)) {
          const oldId = Number(oldAtt.id)
          if (Number.isFinite(oldId) && oldId > 0 && oldId !== keepId) {
            try { await deleteAmmAttachment(layer, oid, oldId, layerUrl) } catch {}
          }
        }

        if (protocolMeta) {
          props.onChange('protocollo_atto_accertamento_numero', protocolMeta.numero)
          props.onChange('protocollo_atto_accertamento_data', protocolMeta.dataMs)
          setAttachmentsInfo(`Atto ufficiale acquisito. Protocollo ${protocolMeta.numero} del ${new Date(protocolMeta.dataMs).toLocaleDateString('it-IT')} letto automaticamente. La copia protocollata ha sostituito quella firmata; salvare i dati per proseguire.`)
        } else {
          setAttachmentsInfo('Atto firmato digitalmente acquisito. La versione firmata ha sostituito quella non firmata; ora può essere trasmessa al protocollo.')
        }
        const allAfter = await queryAmmAttachments(layer, oid, layerUrl)
        setAttoAttachments(allAfter.filter(isGiiAttoContestazionePdfAttachment))
      } else if (attoApprovedRia) {
        // Dopo l'approvazione del Responsabile, il PDF approvato dal RIA è la
        // fonte di verità. La versione successiva può differire soltanto per la
        // rimozione della filigrana BOZZA; ogni altra modifica richiede un nuovo ciclo.
        const allBefore = await queryAmmAttachments(layer, oid, layerUrl)
        // La fonte di verità è il PDF effettivamente trasmesso al RIA. Prima di
        // ricadere sul più recente, preferiamo la copia di bozza con il nome canonico
        // atteso e scartiamo eventuali versioni già derivate (da firmare/firmate).
        // Questo evita che residui di cicli precedenti vengano usati come riferimento.
        const approvedCandidates = allBefore
          .filter(isGiiAttoContestazionePdfAttachment)
          .filter(att => !isAttoDaFirmareAttachment(att) && !isSignedAttoContestazioneAttachment(att))
        const exactNamedApprovedCandidates = approvedCandidates.filter(att =>
          String(att?.name || '').trim().toLocaleLowerCase('it-IT') === attoBozzaPdfFileName.toLocaleLowerCase('it-IT')
        )
        const approvedPdf = pickLatestGiiAttachment((exactNamedApprovedCandidates.length ? exactNamedApprovedCandidates : approvedCandidates) as any[]) as AmmAttachmentInfo | null
        if (!approvedPdf) throw new Error('La versione approvata dell’Atto di accertamento non è disponibile.')
        const approvedBlob = await fetchAmmAttachmentBlobForPdf(approvedPdf, oid, layerUrl)
        // Il controllo post-RIA deve essere effettuato direttamente contro il PDF
        // realmente approvato, che in questa fase è ancora nello slot dell'Atto.
        // Non usiamo come blocco un hash storico: un riferimento creato con una
        // precedente versione dell'algoritmo potrebbe generare falsi negativi.
        const [approvedContent, candidateContent] = await Promise.all([
          extractPdfVerificationContent(approvedBlob),
          extractPdfVerificationContent(file)
        ])
        if (!approvedContent.text || !candidateContent.text) {
          throw new Error('Non è stato possibile verificare il contenuto del PDF dell’Atto.')
        }
        if (/\bBOZZA\b/i.test(candidateContent.text)) {
          throw new Error('Il PDF contiene ancora la filigrana BOZZA.')
        }
        if (!approvedAttoContentMatches(approvedContent.text, candidateContent.text)) {
          throw new Error('Il PDF caricato contiene differenze rispetto all’Atto approvato dal Responsabile dell’istruttoria amministrativa. Il file non è stato acquisito.')
        }

        // Manteniamo comunque il riferimento tecnico aggiornato a fini di audit e
        // compatibilità, ma non è più lui a decidere l'esito del caricamento.
        try { await replaceApprovedAttoReferenceAttachment(layer, oid, layerUrl, approvedBlob) } catch {}
        const fileName = originalName || `atto_accertamento_${String(attoFinaleNumero || oid).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
        const uploadFile = file.name === fileName ? file : new File([file], fileName, { type: file.type || 'application/pdf', lastModified: file.lastModified || now })
        const ids = await addAmmAttachments(layer, oid, [uploadFile], layerUrl, `${GII_ATTACHMENT_KEYWORDS.attoContestazione}|attoDaFirmare=1|verifiedAgainstRia=1|fileCreatedAt=${now}`)
        const keepId = Number(ids?.[0])
        if (!Number.isFinite(keepId) || keepId <= 0) throw new Error('PDF caricato, ma documento non identificabile.')
        for (const oldAtt of allBefore.filter(isGiiAttoContestazionePdfAttachment)) {
          const oldId = Number(oldAtt.id)
          if (Number.isFinite(oldId) && oldId > 0 && oldId !== keepId) {
            try { await deleteAmmAttachment(layer, oid, oldId, layerUrl) } catch {}
          }
        }
        const allAfter = await queryAmmAttachments(layer, oid, layerUrl)
        setAttoAttachments(allAfter.filter(isGiiAttoContestazionePdfAttachment))
        setAttachmentsInfo('PDF verificato: corrisponde alla versione approvata dal Responsabile ed è pronto per essere sottoposto alla firma digitale del Direttore.')
      } else {
        if (originalName.toLocaleLowerCase('it-IT') !== attoBozzaPdfFileName.toLocaleLowerCase('it-IT')) {
          throw new Error(`Il PDF selezionato non corrisponde all’Atto atteso. Caricare il file “${attoBozzaPdfFileName}”, ottenuto dal Word generato dal gestionale.`)
        }
        const fileName = attoBozzaPdfFileName
        const uploadFile = file.name === fileName ? file : new File([file], fileName, { type: file.type || 'application/pdf', lastModified: file.lastModified || now })
        const addedIds = await addAmmAttachments(layer, oid, [uploadFile], layerUrl, `${GII_ATTACHMENT_KEYWORDS.attoContestazione}|fileCreatedAt=${now}`)
        const newId = Number(addedIds?.[0])
        if (!Number.isFinite(newId) || newId <= 0) throw new Error('PDF caricato, ma documento non identificabile.')
        const all = await queryAmmAttachments(layer, oid, layerUrl)
        setAttoAttachments(all.filter(isGiiAttoContestazionePdfAttachment))
      }
      setAttachmentsLoadedOid(oid)
      setInputKey(k => k + 1)
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsBusy(false)
    }
  }, [attoApprovedRia, attoBozzaPdfFileName, attoEmailDirettorePreparata, attoFinaleNumero, canUploadAttoContestazione, d, hasAttoDaFirmare, hasAttoFirmato, oid, props, resolveAttachmentLayer, roleCode])

  const uploadProtocolloAttoBatch = React.useCallback(async (selectedFiles: File[]) => {
    const files = Array.from(selectedFiles || []).filter(Boolean)
    if (!files.length || !oid || !hasAttoFirmato || protocolloAttoCompleto || !props.canEdit || props.saving || attachmentsBusy) return
    if (files.some(file => !/\.pdf$/i.test(String(file.name || '')))) {
      setAttachmentsErrorSection('atto')
      setAttachmentsError('Caricare esclusivamente i PDF restituiti dal protocollo.')
      return
    }

    setAttachmentsBusy(true)
    setAttachmentsErrorSection('atto')
    setAttachmentsError(null)
    setAttachmentsInfo(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      const manifest = await loadProtocolloAttoManifest(layer, oid, layerUrl)
      const expectedByName = new Map<string, ProtocolloFascicoloManifestItem>()
      for (const item of manifest.items) {
        const key = normalizeProtocolloReturnFileName(item.fileName)
        if (!key || expectedByName.has(key)) {
          throw new Error('La composizione registrata della trasmissione al protocollo contiene nomi file non univoci. Predisporre nuovamente l’e-mail.')
        }
        expectedByName.set(key, item)
      }

      const selectedByName = new Map<string, File>()
      for (const file of files) {
        const key = normalizeProtocolloReturnFileName(file.name)
        if (!key || selectedByName.has(key)) throw new Error(`Il file “${file.name}” è stato selezionato più di una volta.`)
        selectedByName.set(key, file)
      }
      const missing = manifest.items.filter(item => !selectedByName.has(normalizeProtocolloReturnFileName(item.fileName)))
      const unexpected = files.filter(file => !expectedByName.has(normalizeProtocolloReturnFileName(file.name)))
      if (missing.length || unexpected.length) {
        const parts: string[] = []
        if (missing.length) parts.push(`mancano ${missing.length} file: ${missing.map(x => x.fileName).join(', ')}`)
        if (unexpected.length) parts.push(`non riconosciuti: ${unexpected.map(x => x.name).join(', ')}`)
        throw new Error(`I documenti selezionati non coincidono con quelli trasmessi al protocollo (${parts.join('; ')}).`)
      }

      const ordered = manifest.items.map(item => ({ item, file: selectedByName.get(normalizeProtocolloReturnFileName(item.fileName))! }))
      const returnedContents = await Promise.all(ordered.map(entry => extractPdfVerificationContent(entry.file)))
      const protocol = extractConsensusOfficialProtocol(returnedContents)
      const allBefore = await queryAmmAttachments(layer, oid, layerUrl)

      type ProtocolloSourceSnapshot = {
        key: string
        att: AmmAttachmentInfo
        blob: Blob
        sourceId: number
        parentOid: number
        layerUrl: string
      }
      const sourceKeyForItem = (item: ProtocolloFascicoloManifestItem): string => {
        const store = item.sourceStore === 'payment' ? 'payment' : 'practice'
        const parentOid = store === 'payment' ? Number(item.sourceParentOid) : Number(oid)
        return `${store}:${parentOid}:${Number(item.sourceAttachmentId)}`
      }
      const sourceByKey = new Map<string, ProtocolloSourceSnapshot>()
      const paymentAttachmentsByParent = new Map<number, AmmAttachmentInfo[]>()
      const paymentLayer = ordered.some(entry => entry.item.sourceStore === 'payment') ? await getGiiPaymentLayer(true) : null
      for (const entry of ordered) {
        const sourceId = Number(entry.item.sourceAttachmentId)
        const store = entry.item.sourceStore === 'payment' ? 'payment' : 'practice'
        const parentOid = store === 'payment' ? Number(entry.item.sourceParentOid) : Number(oid)
        if (!Number.isFinite(sourceId) || sourceId <= 0 || !Number.isFinite(parentOid) || parentOid <= 0) {
          throw new Error(`Il riferimento al documento originale “${entry.item.sourceAttachmentName || entry.item.fileName}” non è valido.`)
        }
        let sourceList: AmmAttachmentInfo[]
        let sourceLayerUrl: string
        if (store === 'payment') {
          sourceLayerUrl = GII_VIEW_EDIT_PAGAMENTI_URL
          if (!paymentAttachmentsByParent.has(parentOid)) {
            paymentAttachmentsByParent.set(parentOid, await queryAmmAttachments(paymentLayer, parentOid, sourceLayerUrl))
          }
          sourceList = paymentAttachmentsByParent.get(parentOid) || []
        } else {
          sourceLayerUrl = layerUrl
          sourceList = allBefore
        }
        const source = sourceList.find(att => Number(att.id) === sourceId) || null
        if (!source) throw new Error(`Il documento originale “${entry.item.sourceAttachmentName || entry.item.fileName}” non è più disponibile.`)
        const key = sourceKeyForItem(entry.item)
        if (!sourceByKey.has(key)) {
          sourceByKey.set(key, {
            key,
            att: source,
            blob: await fetchAmmAttachmentBlobForPdf(source, parentOid, sourceLayerUrl),
            sourceId,
            parentOid,
            layerUrl: sourceLayerUrl
          })
        }
      }

      const attoIndex = ordered.findIndex(entry => entry.item.docKey === 'atto_accertamento')
      if (attoIndex < 0) throw new Error('La trasmissione registrata non contiene l’Atto di accertamento firmato.')
      const attoSource = sourceByKey.get(sourceKeyForItem(ordered[attoIndex].item))
      if (!attoSource) throw new Error('L’Atto firmato presente nella pratica non è disponibile per il confronto.')
      const attoSourceContent = await extractPdfVerificationContent(attoSource.blob)
      const returnedAttoContent = returnedContents[attoIndex]
      if (
        !attoSourceContent.text ||
        !returnedAttoContent?.text ||
        (!approvedAttoContentMatches(attoSourceContent.text, returnedAttoContent.text) && !candidatePreservesApprovedPdfText(attoSourceContent.text, returnedAttoContent.text) && !candidateContainsSourcePdfTokens(attoSourceContent.text, returnedAttoContent.text))
      ) {
        throw new Error('L’Atto protocollato non corrisponde all’Atto firmato trasmesso. Nessun documento è stato acquisito.')
      }
      if (!(await pdfContainsDigitalSignature(ordered[attoIndex].file))) {
        throw new Error('L’Atto restituito dal protocollo non conserva la firma digitale.')
      }
      const signerIdentityBypass = roleCode === 'ADMIN' || currentUserIsWorkflowAdmin()
      const authorizedSigners = signerIdentityBypass ? [] : await loadAuthorizedAttoSignerIdentities()
      await verifyAttoDigitalSignerIdentity(ordered[attoIndex].file, authorizedSigners, signerIdentityBypass)

      // Per gli altri documenti controlliamo, quando il testo è estraibile, che il
      // contenuto precedente sia interamente conservato. La seconda segnatura può
      // soltanto aggiungere testo di protocollo sul margine opposto.
      for (let i = 0; i < ordered.length; i++) {
        if (i === attoIndex) continue
        const source = sourceByKey.get(sourceKeyForItem(ordered[i].item))
        if (!source) continue
        const sourceContent = await extractPdfVerificationContent(source.blob)
        const returnedContent = returnedContents[i]
        if (sourceContent.text && returnedContent?.text && !candidateContainsSourcePdfTokens(sourceContent.text, returnedContent.text)) {
          throw new Error(`Il documento protocollato “${ordered[i].item.fileName}” non corrisponde al file trasmesso. Nessun documento è stato acquisito.`)
        }
      }

      const updatedKeys: string[] = []
      try {
        for (const entry of ordered) {
          const key = sourceKeyForItem(entry.item)
          const source = sourceByKey.get(key)!
          const replacement = new File(
            [entry.file],
            String(entry.item.sourceAttachmentName || source.att.name || entry.file.name),
            { type: 'application/pdf', lastModified: Date.now() }
          )
          await updateAmmAttachmentFile(source.parentOid, source.sourceId, replacement, source.layerUrl)
          updatedKeys.push(key)
        }
      } catch (mutationError) {
        for (const key of [...updatedKeys].reverse()) {
          const source = sourceByKey.get(key)
          if (!source) continue
          try {
            const rollback = new File(
              [source.blob],
              String(source.att.name || `allegato_${source.sourceId}.pdf`),
              { type: String(source.att.contentType || source.blob.type || 'application/pdf'), lastModified: Date.now() }
            )
            await updateAmmAttachmentFile(source.parentOid, source.sourceId, rollback, source.layerUrl)
          } catch {}
        }
        throw mutationError
      }

      props.onChange('protocollo_atto_accertamento_numero', protocol.numero)
      props.onChange('protocollo_atto_accertamento_data', protocol.dataMs)
      const allAfter = await queryAmmAttachments(layer, oid, layerUrl)
      setAttoAttachments(allAfter.filter(isGiiAttoContestazionePdfAttachment))
      setPagopaAttachments(allAfter.filter(isGiiPagoPaAttachment))
      if (manifest.items.some(item => item.sourceStore === 'payment')) dispatchGiiPaymentsChanged(pickAttrCI(d, ['GlobalID', 'globalid']))
      setAttachmentsLoadedOid(oid)
      setInputKey(k => k + 1)
      setAttachmentsInfo(
        `Protocollazione acquisita: ${ordered.length} documenti riconosciuti e aggiornati. ` +
        `Protocollo ${protocol.numero} del ${new Date(protocol.dataMs).toLocaleDateString('it-IT')} letto automaticamente. Salvare i dati per proseguire.`
      )
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsBusy(false)
    }
  }, [attachmentsBusy, hasAttoFirmato, oid, props, protocolloAttoCompleto, resolveAttachmentLayer, roleCode])

  const downloadAttoContestazionePdf = React.useCallback(async (att: AmmAttachmentInfo) => {
    if (!att || !oid || attachmentsBusy) return
    setAttachmentsBusy(true)
    setAttachmentsErrorSection('atto')
    setAttachmentsError(null)
    try {
      const { layerUrl } = await resolveAttachmentLayer()
      await downloadAmmAttachmentFile(att, oid, layerUrl)
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsBusy(false)
    }
  }, [attachmentsBusy, oid, resolveAttachmentLayer])

  const deleteAttoContestazionePdf = React.useCallback(async (att: AmmAttachmentInfo) => {
    if (!att || !oid || !canDeleteAttoContestazione) return
    setAttachmentsBusy(true)
    setAttachmentsErrorSection('atto')
    setAttachmentsError(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      await deleteAmmAttachment(layer, oid, Number(att.id), layerUrl)
      const all = await queryAmmAttachments(layer, oid, layerUrl)
      setAttoAttachments(all.filter(isGiiAttoContestazionePdfAttachment))
      setAttachmentsLoadedOid(oid)
      setInputKey(k => k + 1)
    } catch (e: any) {
      setAttachmentsError(e?.message || String(e))
    } finally {
      setAttachmentsBusy(false)
    }
  }, [canDeleteAttoContestazione, oid, resolveAttachmentLayer])

  const canUploadBozza =
    attachmentsResolved &&
    props.canEdit &&
    (
      propostaUfficialeDaAcquisire ||
      determinazioneUfficialeDaAcquisire ||
      ((bozzaInLavorazioneIa || postApprovalProtocolSaved) && canGenerateBozzaDeterminazione && wordReadyForPdf && canPreparePdfSlot)
    ) &&
    !props.saving &&
    !attachmentsBusy

  const canDeleteWorkingPdf =
    !attoWorkflow &&
    bozzaInLavorazioneIa &&
    !riaHaApprovatoProposta

  // L'eliminazione manuale è consentita esclusivamente mentre il PDF è ancora
  // una bozza di lavoro dell’IA e non è stato approvato dal RIA. Dopo la
  // trasmissione al Responsabile e, a maggior ragione, dopo l'approvazione, il PDF
  // resta cristallizzato. Un contenuto diverso richiede un nuovo ciclo di verifica.
  const canDeleteBozza =
    props.canEdit &&
    hasBozzaPdfCaricata &&
    canDeleteWorkingPdf &&
    !props.saving &&
    !attachmentsBusy
  const canTransmitBozza =
    attachmentsResolved &&
    props.canEdit &&
    bozzaInLavorazioneIa &&
    !riaHaApprovatoProposta &&
    iaHaAttestatoConformita &&
    !vistoDaRinnovareDopoRimando &&
    hasBozzaGenerated &&
    hasBozzaPdfCaricata &&
    !props.saving &&
    !attachmentsBusy
  const canPrepareEmailProtocollo = props.canEdit && riaHaApprovatoProposta && !vistoDaRinnovareDopoRimando && !protocolloFascicoloOk && (!fascicoloTrasmessoAlProtocollo || legacyProtocolloTransmissionNeedsRebuild) && !props.saving && !attachmentsBusy
  const canPrepareEmailDirettore = props.canEdit && riaHaApprovatoProposta && !vistoDaRinnovareDopoRimando && protocolloFascicoloSalvatoOk && hasBozzaGenerated && hasBozzaPdfCaricata && verifiedFinalPdfCaricato && !props.saving && !attachmentsBusy

  // Un solo comando e-mail nella barra Azioni: prima serve per trasmettere il fascicolo
  // al protocollo, poi (dopo la protocollazione) per predisporre l'e-mail al Direttore.
  const emailActionIsProtocollo = (!fascicoloTrasmessoAlProtocollo || legacyProtocolloTransmissionNeedsRebuild) && !protocolloFascicoloOk && !protocolloFascicoloSalvatoOk && !emailDirettorePreparata
  const emailActionDisabled = emailActionIsProtocollo ? !canPrepareEmailProtocollo : !canPrepareEmailDirettore
  const emailActionTitle = emailActionIsProtocollo
    ? (legacyProtocolloTransmissionNeedsRebuild
        ? 'Ricrea e-mail al protocollo con la nuova composizione del fascicolo'
        : (protocolloFascicoloOk ? 'Fascicolo già protocollato' : (fascicoloTrasmessoAlProtocollo ? 'Fascicolo già trasmesso al protocollo' : 'Trasmetti fascicolo al protocollo')))
    : (!protocolloFascicoloSalvatoOk
        ? (fascicoloTrasmessoAlProtocollo
            ? (protocolloFascicoloOk
                ? 'Fascicolo già trasmesso al protocollo. Salvare numero e data di protocollo per proseguire'
                : 'Fascicolo già trasmesso al protocollo. Registrare e salvare numero e data di protocollo per proseguire')
            : 'Registrare e salvare numero e data di protocollo prima di predisporre l’e-mail al Direttore')
        : (!verifiedFinalPdfCaricato
            ? 'Fascicolo già trasmesso al protocollo. Caricare e verificare il PDF della determinazione prima di predisporre l’e-mail al Direttore'
            : (emailDirettorePreparata
                ? 'E-mail al Direttore già predisposta. Prepara nuovamente l’e-mail'
                : 'Prepara e-mail al Direttore')))
  const emailActionPulseTitle = emailActionIsProtocollo
    ? 'Azione successiva: trasmetti il fascicolo al protocollo'
    : 'Azione successiva: prepara l’e-mail al Direttore'

  // Guida IA: una sola indicazione alla volta, sempre derivata dalle stesse
  // condizioni che abilitano realmente i comandi della fase corrente.
  const guideEnabled =
    String(props.role || '').toUpperCase() === 'IA' &&
    props.canEdit &&
    !props.saving &&
    !attachmentsBusy &&
    attachmentsResolved &&
    !props.suppressActionGuide &&
    (showDeterminationWorkflow || (showAttoWorkflow && attoWorkflow))
  const definitiveWordGeneratedAfterApproval = postApprovalProtocolSaved && approvalAt > 0 && wordGeneratedAt > approvalAt

  type IaNextAction = 'GENERATE_WORD' | 'UPLOAD_PDF' | 'TRANSMIT_RIA' | 'SEND_PROTOCOLLO' | 'EMAIL_DIRETTORE' | null
  let nextIaAction: IaNextAction = null
  if (guideEnabled && attoWorkflow) {
    if (attoInLavorazioneIa) {
      if (!attoWordGenerated && canGenerateAttoContestazioneWord) nextIaAction = 'GENERATE_WORD'
      else if (!hasAttoPdfCaricato && canUploadAttoContestazione) nextIaAction = 'UPLOAD_PDF'
      else if (canTransmitAttoContestazione) nextIaAction = 'TRANSMIT_RIA'
    } else if (attoApprovedRia) {
      if (!hasAttoDaFirmare && !hasAttoFirmato) {
        if (!attoCleanWordGeneratedAfterApproval && canGenerateAttoContestazioneWord) nextIaAction = 'GENERATE_WORD'
        else if (canUploadAttoContestazione) nextIaAction = 'UPLOAD_PDF'
      } else if (hasAttoDaFirmare && !hasAttoFirmato) {
        if (!attoEmailDirettorePreparata && canPrepareEmailAttoDirettore) nextIaAction = 'EMAIL_DIRETTORE'
        else if (attoEmailDirettorePreparata && canUploadSignedAtto) nextIaAction = 'UPLOAD_PDF'
      } else if (hasAttoFirmato && canPrepareEmailAttoProtocollo) {
        nextIaAction = 'SEND_PROTOCOLLO'
      }
    }
  } else if (guideEnabled && !determinazioneAdottata && iaHaAttestatoConformita && !vistoDaRinnovareDopoRimando) {
    if (propostaUfficialeDaAcquisire || determinazioneUfficialeDaAcquisire) {
      nextIaAction = 'UPLOAD_PDF'
    } else if (!riaHaApprovatoProposta && bozzaInLavorazioneIa) {
      if (!hasBozzaGenerated) nextIaAction = 'GENERATE_WORD'
      else if (!hasBozzaPdfCaricata) nextIaAction = 'UPLOAD_PDF'
      else if (canTransmitBozza) nextIaAction = 'TRANSMIT_RIA'
    } else if (riaHaApprovatoProposta) {
      if (canPrepareEmailProtocollo) nextIaAction = 'SEND_PROTOCOLLO'
      else if (postApprovalProtocolSaved) {
        if (!definitiveWordGeneratedAfterApproval) nextIaAction = 'GENERATE_WORD'
        else if (!verifiedFinalPdfCaricato) nextIaAction = 'UPLOAD_PDF'
        else if (canPrepareEmailDirettore && !emailDirettorePreparata) nextIaAction = 'EMAIL_DIRETTORE'
      }
    }
  }

  const preApprovalGuideText = nextIaAction === 'GENERATE_WORD' && !riaHaApprovatoProposta
    ? 'Il visto di conformità è stato apposto. Generare la bozza Word della determinazione.'
    : nextIaAction === 'UPLOAD_PDF' && !riaHaApprovatoProposta
      ? 'La bozza Word è stata generata. Predisporre il PDF e caricarlo nella pratica.'
      : nextIaAction === 'TRANSMIT_RIA'
        ? 'PDF pronto. Trasmettere il fascicolo per la verifica.'
        : ''

  const generateBozzaButtonLabel = postApprovalProtocolSaved
    ? 'Aggiorna determinazione'
    : (hasBozzaGenerated ? 'Rigenera bozza' : 'Genera bozza')

  // Tooltip coerenti con lo stato dei comandi: quando un'azione è stata completata
  // e il relativo pulsante resta visibile ma disabilitato, il tooltip lo dichiara
  // esplicitamente invece di riproporre l'azione come se fosse ancora da eseguire.
  const generateBozzaActionTitle = props.saving
    ? 'Generazione in corso…'
    : (actionDisabled && hasBozzaPdfCaricata
        ? (postApprovalProtocolSaved ? 'Determinazione già aggiornata' : 'Bozza Word già generata')
        : generateBozzaButtonLabel)
  const uploadBozzaActionTitle = attachmentsBusy
    ? 'Caricamento…'
    : (postApprovalProtocolSaved
        ? (verifiedFinalPdfCaricato
            ? 'PDF della determinazione già caricato e verificato'
            : (hasBozzaPdfCaricata ? 'PDF della determinazione già caricato' : 'Carica PDF della determinazione e verifica corrispondenza'))
        : (hasBozzaPdfCaricata ? 'Bozza PDF già caricata' : 'Carica bozza PDF'))
  const transmitBozzaActionTitle = bozzaAlreadyTransmitted && !vistoDaRinnovareDopoRimando
    ? (riaHaApprovatoProposta
        ? 'Fascicolo già approvato'
        : 'Fascicolo già trasmesso per la verifica')
    : 'Trasmetti fascicolo al Responsabile'

  const generateActionDisabled = !attachmentsResolved || (attoWorkflow ? !canGenerateAttoContestazioneWord : actionDisabled)
  const attoPreparationBlockReason = attoWorkflow && attoInLavorazioneIa && !attoPreDraftReady
    ? (!paymentModeForAtto
        ? 'Definire prima la modalità di pagamento nella scheda Notifica'
        : (!hasAdminValue(pickAttrCI(d, ['notifica_tipo']))
            ? 'Definire prima la modalità prevista per la notifica'
            : 'Completare i dati necessari alla predisposizione dell’Atto'))
    : ''
  const generateActionTitle = attoWorkflow
    ? (attoWorkflowLocked
        ? 'Atto non modificabile in questa fase'
        : (attoPreparationBlockReason
            ? attoPreparationBlockReason
            : (attoRichiedeVersionePulita
                ? (attoCleanWordGeneratedAfterApproval ? 'Rigenera Atto senza filigrana' : 'Genera Atto senza filigrana')
                : (hasAttoPdfCaricato ? 'Bozza PDF dell’Atto già caricata' : (attoWordGenerated ? 'Rigenera bozza Word dell’Atto' : 'Genera bozza Word dell’Atto')))))
    : generateBozzaActionTitle
  const uploadActionDisabled = !attachmentsResolved || (attoWorkflow ? !canUploadAttoContestazione : !canUploadBozza)
  const uploadActionTitle = attoWorkflow
    ? ((attoEmailDirettorePreparata || hasAttoDaFirmare || hasAttoFirmato)
        ? (hasAttoFirmato ? 'Carica insieme i PDF restituiti dal protocollo' : 'Carica il PDF firmato digitalmente dal Direttore')
        : (attoApprovedRia
            ? (hasAttoDaFirmare
                ? 'PDF pronto per la firma'
                : 'Carica PDF senza filigrana')
            : (hasAttoPdfCaricato ? 'Bozza PDF dell’Atto di accertamento già caricata' : (attoWordGenerated ? 'Carica la bozza PDF dell’Atto di accertamento' : 'Generare prima il Word in bozza dell’Atto di accertamento'))))
    : (propostaUfficialeDaAcquisire
        ? 'Carica fascicolo protocollato'
        : (determinazioneUfficialeDaAcquisire
            ? 'Carica determinazione firmata e acquisisci gli estremi'
            : uploadBozzaActionTitle))
  const transmitActionDisabled = !attachmentsResolved || (attoWorkflow ? !canTransmitAttoContestazione : !canTransmitBozza)
  const transmitActionTitle = attoWorkflow
    ? (attoTransmittedRia ? 'Atto già trasmesso per la verifica' : (attoApprovedRia ? 'Atto già approvato' : 'Trasmetti Atto per la verifica'))
    : transmitBozzaActionTitle
  const contextualEmailIsProtocollo = !attoWorkflow && emailActionIsProtocollo
  const contextualEmailIsAttoProtocollo = attoWorkflow && hasAttoFirmato
  const contextualEmailDisabled = attoWorkflow
    ? (contextualEmailIsAttoProtocollo ? !canPrepareEmailAttoProtocollo : !canPrepareEmailAttoDirettore)
    : emailActionDisabled
  const contextualEmailTitle = attoWorkflow
    ? (contextualEmailIsAttoProtocollo
        ? (!hasAttoFirmato
            ? 'Caricare prima l’Atto firmato digitalmente dal Direttore'
            : (protocolloAttoCompleto ? 'Protocollo dell’Atto già registrato' : 'Trasmetti l’Atto firmato al protocollo'))
        : (attoApprovedRia
            ? (hasAttoDaFirmare ? 'Prepara e-mail dell’Atto di accertamento al Direttore' : 'Caricare prima la versione senza filigrana')
            : 'L’Atto deve essere approvato prima dell’invio al Direttore'))
    : emailActionTitle
  const contextualEmailPulseTitle = attoWorkflow
    ? (contextualEmailIsAttoProtocollo ? 'Azione successiva: trasmetti l’Atto firmato al protocollo' : 'Azione successiva: prepara l’e-mail dell’Atto di accertamento al Direttore')
    : emailActionPulseTitle

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {showDeterminationWorkflow && confirmDeleteBozza && (
        <DeleteBozzaConfirmDialog
          saving={props.saving || attachmentsBusy}
          finalPdf={verifiedFinalPdfCaricato}
          onCancel={() => setConfirmDeleteBozza(false)}
          onConfirm={async () => {
            const deleted = await props.onDeleteBozzaDeterminazione()
            setConfirmDeleteBozza(false)
            if (deleted) {
              setBozzaAttachments([])
              setAttachmentsLoadedOid(oid)
              setAttachmentsError(null)
              setAttachmentsInfo(null)
              setInputKey(k => k + 1)
            }
          }}
        />
      )}
      {showDeterminationWorkflow && (
      <AdminFormSection
        title='Protocollazione fascicolo'
        right={<SectionInfoButton text={props.showIaInfo ? 'Selezionare insieme tutti i PDF restituiti dal protocollo per sostituire gli elaborati del fascicolo e registrarne automaticamente gli estremi.' : null} title='Informazioni protocollazione fascicolo' />}
        group='verbale'
        draft={d}
        fields={props.fields}
        canEdit={canEditProtocolloFascicolo}
        onChange={props.onChange}
        fieldNames={PROTOCOLLO_FASCICOLO_FIELDS}
      >
        {attachmentsError && attachmentsErrorSection === 'protocollo' && (
          <div style={{ marginTop: 10 }}><InfoBox kind='warn'>{attachmentsError}</InfoBox></div>
        )}
        {protocolloImportResult && (
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <InfoBox kind='ok'>
              {`Acquisizione completata. ${protocolloImportResult.items.length} elaborati riconosciuti e sostituiti. Protocollo n. ${protocolloImportResult.numero} del ${new Date(protocolloImportResult.dataMs).toLocaleDateString('it-IT')}. Numero e data sono stati compilati automaticamente; premere Salva per registrarli nella pratica.`}
            </InfoBox>
            <div style={{ border: '1px solid #d8e6f7', borderRadius: 8, background: '#f8fbff', padding: 8, display: 'grid', gap: 5 }}>
              <div style={{ fontWeight: 800, color: '#0d3b66', fontSize: 13 }}>Elaborati acquisiti</div>
              {protocolloImportResult.items.map((item, index) => (
                <div key={`${item.docKey}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#334155' }}>
                  <span aria-hidden='true' style={{ color: '#15803d', fontWeight: 900 }}>✓</span>
                  <span style={{ overflowWrap: 'anywhere' }}>{item.fileName || item.docKey || `Elaborato ${index + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminFormSection>
      )}
      {showDeterminationWorkflow && (
      <Section
        title='Determinazione'
        right={<SectionInfoButton text={props.showIaInfo ? 'Il documento approvato può essere sostituito solo tramite il flusso controllato post-protocollo.' : null} title='Informazioni determinazione' />}
        bodyStyle={{ padding: 10 }}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gap: 10 }}>
              {preApprovalGuideText && <InfoBox>{preApprovalGuideText}</InfoBox>}
              <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', gap: 10 }}>
                {hasBozzaGenerated && <StatusSummaryItem label='Generata il' value={dataGenerazione || '—'} tone='auto' />}
                {hasBozzaGenerated && <StatusSummaryItem label='Generata da' value={generataDa || '—'} tone='auto' />}
                <StatusSummaryItem label='Stato documento' value={statoBozza} tone={hasBozzaGenerated ? 'auto' : 'warn'} />
              </div>
              {attachmentsError && attachmentsErrorSection === 'bozza' && <InfoBox kind='warn'>{attachmentsError}</InfoBox>}
              {hasBozzaGenerated && hasBozzaPdfCaricata && (
                <div style={{ border: '1px solid #d8e6f7', borderRadius: 8, padding: 8, background: '#f8fbff', display: 'grid', gap: 6 }}>
                  <div style={{ fontWeight: 800, color: '#0d3b66', fontSize: 13 }}>{determinationPdfIsOfficial ? 'PDF della determinazione' : 'PDF della bozza'}</div>
                  {bozzaAttachments.map(att => (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 13, color: '#334155', border: '1px solid #e5edf7', borderRadius: 7, background: '#fff', padding: '7px 8px' }}>
                      <div style={{ minWidth: 0, display: 'grid', gap: 2 }}>
                        <div style={{ fontWeight: 800, color: '#1f2937', overflowWrap: 'anywhere' }}>{determinationPdfIsOfficial ? determinationPdfFileName : (att.name || `Allegato ${att.id}`)}</div>
                        <div style={{ color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span>{formatAttachmentBytes(att.size)}</span>
                          <span aria-hidden='true'>•</span>
                          <span>Creato il {formatBozzaAttachmentFileCreatedAt(att)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                        <button
                          type='button'
                          title={props.saving ? 'Salvataggio in corso…' : 'Scarica PDF'}
                          aria-label={props.saving ? 'Salvataggio in corso…' : 'Scarica PDF'}
                          disabled={attachmentsBusy || props.saving}
                          onClick={() => { void downloadBozzaPdf(att) }}
                          style={bozzaIconButtonStyle({ disabled: attachmentsBusy || props.saving })}
                        >
                          <BozzaActionIcon name='download' size={24} />
                        </button>
                        <button
                          type='button'
                          title={canDeleteBozza
                            ? 'Elimina PDF'
                            : (riaHaApprovatoProposta
                                ? 'PDF non eliminabile dopo l’approvazione del Responsabile dell’istruttoria amministrativa'
                                : (bozzaAlreadyTransmitted
                                    ? 'PDF non eliminabile durante la verifica del Responsabile dell’istruttoria amministrativa'
                                    : 'Elimina PDF'))}
                          aria-label={canDeleteBozza ? 'Elimina PDF' : 'PDF non eliminabile in questa fase'}
                          disabled={!canDeleteBozza}
                          onClick={() => setConfirmDeleteBozza(true)}
                          style={bozzaIconButtonStyle({ danger: true, disabled: !canDeleteBozza })}
                        >
                          <BozzaActionIcon name='trash' size={24} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!verifiedFinalPdfCaricato && !determinazioneAdottata && !vistoDaRinnovareDopoRimando && riaHaApprovatoProposta && bozzaRientrataDaRia ? (
                <InfoBox kind='warn'>
                  {riaApprovedMessage}
                </InfoBox>
              ) : (!vistoDaRinnovareDopoRimando && bozzaAlreadyTransmitted && !riaHaApprovatoProposta) ? (
                <InfoBox>
                  {riaVerifyingMessage}
                </InfoBox>
              ) : null}
            </div>
        </div>
      </Section>
      )}

      {showDeterminationWorkflow && determinationSectionVisible && (
        <Section
          title='Esito determinazione'
          right={<SectionInfoButton text={props.showIaInfo ? 'Acquisire la copia PDF conforme della determinazione ufficiale: numero e data vengono letti automaticamente dal documento.' : null} title='Informazioni esito determinazione' />}
          bodyStyle={{ padding: 10 }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {emailDirettorePreparata && determinazioneUfficialeDaAcquisire && (
              <InfoBox>Acquisire la copia PDF conforme della determinazione ufficiale. Numero e data saranno letti automaticamente dal documento.</InfoBox>
            )}
            {emailDirettorePreparata && officialDeterminationMatchesDraft && (
              <InfoBox kind='ok'>Copia PDF conforme acquisita. Numero e data sono stati letti automaticamente dal documento; salvare per registrare la determinazione adottata.</InfoBox>
            )}
            {determinazioneAdottata && (
              <InfoBox kind='ok'>Determina adottata e registrata.</InfoBox>
            )}
            {canReplaceArchivedDeterminationPdf && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label
                  title='Carica PDF ufficiale della determinazione'
                  aria-label='Carica PDF ufficiale della determinazione'
                  style={{
                    ...bozzaIconButtonStyle({ disabled: attachmentsBusy || props.saving }),
                    width: 'auto',
                    minWidth: 116,
                    padding: '0 12px',
                    gap: 7,
                    margin: 0,
                    fontWeight: 800,
                    fontSize: 13
                  }}
                >
                  <BozzaActionIcon name='upload' size={21} />
                  <span>Carica PDF</span>
                  <input
                    key={`det-official-${inputKey}`}
                    type='file'
                    disabled={attachmentsBusy || props.saving}
                    accept='.pdf,application/pdf'
                    style={{ display: 'none' }}
                    onChange={e => { void uploadDeterminazioneUfficiale(e.target.files?.[0] || null) }}
                  />
                </label>
                <span style={{ color: '#64748b', fontSize: 12 }}>
                  Il nuovo PDF sostituisce quello archiviato senza riaprire l’istruttoria.
                </span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', gap: 12 }}>
              <FieldEditor
                field={{ group: 'verbale', name: 'determinazione_numero', label: 'Numero determinazione', kind: 'text', readonly: true }}
                draft={d}
                fields={props.fields}
                canEdit={canEditDetermination}
                onChange={props.onChange}
              />
              <FieldEditor
                field={{ group: 'verbale', name: 'determinazione_data', label: 'Data determinazione', kind: 'date', readonly: true }}
                draft={d}
                fields={props.fields}
                canEdit={canEditDetermination}
                onChange={props.onChange}
              />
              <FieldEditor
                field={{ group: 'verbale', name: 'accertamento_numero', label: 'Numero Atto di accertamento', kind: 'text', readonly: true }}
                draft={{
                  ...d,
                  [realFieldName(props.fields, 'accertamento_numero') || 'accertamento_numero']:
                    derivedAccertamentoNumber || pickAttrCI(d, ['accertamento_numero']) || pickAttrCI(saved, ['accertamento_numero'])
                }}
                fields={props.fields}
                canEdit={false}
                onChange={props.onChange}
              />
            </div>
            {determinationDraftComplete && !/^\d+$/.test(determinationNumberText) && (
              <InfoBox kind='warn'>Il numero della determinazione deve contenere esclusivamente cifre.</InfoBox>
            )}
          </div>
        </Section>
      )}

      {showAttoWorkflow && attoWorkflow && (
        <Section
          title='Atto di accertamento'
          bodyStyle={{ padding: 10 }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {attoState === 'BOZZA' && !hasAttoPdfCaricato && (
              <InfoBox>Convertire il Word in PDF mantenendo il nome “{attoBozzaPdfFileName}” e caricarlo per la verifica.</InfoBox>
            )}
            {attoState === 'BOZZA' && hasAttoPdfCaricato && (
              <InfoBox>Atto pronto per la verifica.</InfoBox>
            )}
            {attoTransmittedRia && (
              <InfoBox>Atto in corso di verifica.</InfoBox>
            )}
            {attoRichiedeVersionePulita && (
              <InfoBox kind='ok'>Atto approvato. Predisporre e caricare la versione senza filigrana.</InfoBox>
            )}
            {attoEmailDirettorePreparata && !hasAttoFirmato && (
              <InfoBox kind='ok'>E-mail per il Direttore preparata. In attesa dell’Atto firmato.</InfoBox>
            )}
            {hasAttoFirmato && !protocolloAttoCompleto && (
              <InfoBox kind='ok'>Atto firmato acquisito. Procedere con l’invio al protocollo.</InfoBox>
            )}
            {protocolloAttoCompleto && (
              <InfoBox kind='ok'>Protocollo registrato. Procedere con la notifica.</InfoBox>
            )}
            {attoWorkflowLocked && (
              <InfoBox kind='warn'>L’Atto non è più modificabile perché è stata avviata la fase successiva di protocollazione/notifica.</InfoBox>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', gap: 12 }}>
              <StatusSummaryItem label='Tipo atto' value={tipoAttoFinaleLabel} tone='auto' />
              <FieldEditor
                field={{ group: 'verbale', name: 'accertamento_numero', label: 'Numero Atto di accertamento', kind: 'text', readonly: true }}
                draft={d}
                fields={props.fields}
                canEdit={false}
                onChange={props.onChange}
              />
              <StatusSummaryItem
                label='Stato'
                value={protocolloAttoCompleto
                  ? 'Protocollato'
                  : hasAttoFirmato
                    ? 'Firmato dal Direttore - da protocollare'
                    : attoEmailDirettorePreparata
                      ? 'In attesa della firma del Direttore'
                      : attoApprovedRia
                        ? (hasAttoDaFirmare ? 'Approvato - versione senza filigrana pronta' : 'Approvato - da predisporre versione senza filigrana')
                        : attoTransmittedRia
                          ? 'In verifica dal Responsabile'
                          : hasAttoPdfCaricato
                            ? 'PDF caricato'
                            : attoWordGenerated
                              ? 'Word generato'
                              : 'Da predisporre'}
                tone={(attoApprovedRia || attoEmailDirettorePreparata || hasAttoFirmato || protocolloAttoCompleto) ? 'auto' : 'warn'}
              />
            </div>
            {attachmentsError && attachmentsErrorSection === 'atto' && <InfoBox kind='warn'>{attachmentsError}</InfoBox>}
            {hasAttoPdfCaricato && (
              <div style={{ border: '1px solid #d8e6f7', borderRadius: 8, padding: 8, background: '#f8fbff', display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 800, color: '#0d3b66', fontSize: 13 }}>Documenti dell’Atto di accertamento</div>
                {attoAttachments.map(att => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 13, color: '#334155', border: '1px solid #e5edf7', borderRadius: 7, background: '#fff', padding: '7px 8px' }}>
                    <div style={{ minWidth: 0, display: 'grid', gap: 2 }}>
                      <div style={{ fontWeight: 800, color: '#1f2937', overflowWrap: 'anywhere' }}>{att.name || `Atto ${att.id}`}</div>
                      <div style={{ color: isSignedAttoContestazioneAttachment(att) ? '#166534' : '#64748b', fontSize: 12, fontWeight: isSignedAttoContestazioneAttachment(att) ? 800 : 500 }}>
                        {isSignedAttoContestazioneAttachment(att) ? 'Atto firmato digitalmente' : (attoEmailDirettorePreparata ? 'Versione approvata inviata al Direttore' : 'PDF dell’Atto')}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <span>{formatAttachmentBytes(att.size)}</span>
                        <span aria-hidden='true'>•</span>
                        <span>Creato il {formatBozzaAttachmentFileCreatedAt(att)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                      <button
                        type='button'
                        title={isSignedAttoContestazioneAttachment(att) ? 'Scarica Atto firmato' : 'Scarica PDF dell’Atto'}
                        aria-label={isSignedAttoContestazioneAttachment(att) ? 'Scarica Atto firmato' : 'Scarica PDF dell’Atto'}
                        disabled={attachmentsBusy || props.saving}
                        onClick={() => { void downloadAttoContestazionePdf(att) }}
                        style={bozzaIconButtonStyle({ disabled: attachmentsBusy || props.saving })}
                      >
                        <BozzaActionIcon name='download' size={24} />
                      </button>
                      <button
                        type='button'
                        title={canDeleteAttoContestazione ? 'Elimina bozza PDF dell’Atto' : 'PDF non eliminabile in questa fase'}
                        aria-label={canDeleteAttoContestazione ? 'Elimina bozza PDF dell’Atto' : 'PDF non eliminabile in questa fase'}
                        disabled={!canDeleteAttoContestazione}
                        onClick={() => { void deleteAttoContestazionePdf(att) }}
                        style={bozzaIconButtonStyle({ danger: true, disabled: !canDeleteAttoContestazione })}
                      >
                        <BozzaActionIcon name='trash' size={24} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hasAttoFirmato && (
              <div style={{ marginTop: 12, border: '1px solid #b8cfe8', borderRadius: 8, padding: 10, background: '#fff', display: 'grid', gap: 10, overflow: 'hidden' }}>
                <div style={{ margin: '-10px -10px 0', padding: '7px 10px', fontWeight: 900, color: '#0f4c81', background: '#eaf3fb', borderBottom: '1px solid #b8cfe8', textTransform: 'uppercase', fontSize: 12 }}>Dati di pagamento</div>
                <GiiPaymentDocumentsPanel
                  data={d}
                  fields={props.fields}
                  canEdit={props.canEdit}
                  role={roleCode}
                  disabled={attachmentsBusy || props.saving || protocolloAttoCompleto}
                  onChange={props.onChange}
                  onPresenceChange={setPaymentTableHasRows}
                  onReadyChange={setPaymentTableReady}
                />
                {paymentTableHasRows === false && pagopaAttachments.length > 0 && (
                  <div style={{ borderTop: '1px solid #dbe7f3', paddingTop: 10, display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Bollettino già acquisito nella gestione precedente</div>
                    <StatusSummaryItem label='Scadenza pagamento' value={displayAdminFieldValue(d, props.fields, 'pagamento_scadenza', '—')} tone={hasAdminValue(pickAttrCI(d, ['pagamento_scadenza'])) ? 'auto' : 'warn'} />
                    {pagopaAttachments.map(att => (
                      <div key={`pagopa-legacy-${att.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '1px solid #e5edf7', borderRadius: 7, background: '#fff', padding: '7px 8px' }}>
                        <div style={{ minWidth: 0, fontSize: 12, color: '#64748b', overflowWrap: 'anywhere' }}>{att.name || `Allegato ${att.id}`}</div>
                        <button
                          type='button'
                          title='Elimina bollettino pagoPA'
                          aria-label='Elimina bollettino pagoPA'
                          disabled={attachmentsBusy || props.saving || protocolloAttoCompleto}
                          onClick={() => { void deletePagoPaPdf(att) }}
                          style={bozzaIconButtonStyle({ danger: true, disabled: attachmentsBusy || props.saving || protocolloAttoCompleto })}
                        >
                          <BozzaActionIcon name='trash' size={24} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {props.actionBarTarget && createPortal(
        <div style={{
          position: 'relative',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxSizing: 'border-box',
          width: '100%',
          minHeight: 0,
          background: String(st.actionBarBg || '#ffffff'),
          border: `${Number(st.actionBarBorderWidth ?? 1)}px solid ${String(st.actionBarBorderColor || '#e5e7eb')}`,
          borderRadius: Number(st.actionBarBorderRadius ?? 10),
          padding: `${Number(st.actionBarPaddingY ?? 10)}px ${Number(st.actionBarPaddingX ?? 12)}px`
        }}>
          <div style={{ fontSize: Number(st.actionBarTitleFontSize ?? 14), fontWeight: 700, color: String(st.actionBarTitleColor || '#111827') }}>Azioni</div>
          <div style={{ display: 'flex', gap: Number(st.actionBarButtonGap ?? 10), flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
            {showDeterminationWorkflow && props.showIaInfo && (
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                {props.vistoActionPending && !props.saving && <NextActionPulse floating title='Azione successiva: apponi il visto di conformità' />}
                <button
                  type='button'
                  title={props.vistoActionPending
                    ? (props.attestazioneButtonTitle || 'Apponi visto di conformità')
                    : 'Visto di conformità già apposto'}
                  aria-label={props.vistoActionPending
                    ? (props.attestazioneButtonTitle || 'Apponi visto di conformità')
                    : 'Visto di conformità già apposto'}
                  disabled={!props.vistoActionPending || !!props.saving}
                  onClick={() => props.onApplyAttestation('A seguito della verifica svolta, si attesta la conformità della pratica sotto il profilo istruttorio-amministrativo.')}
                  style={bozzaIconButtonStyle({ disabled: !props.vistoActionPending || !!props.saving })}
                >
                  <BozzaActionIcon name='check' size={24} />
                </button>
              </span>
            )}

            <span style={{ position: 'relative', display: 'inline-flex' }}>
              {nextIaAction === 'GENERATE_WORD' && <NextActionPulse floating title={attoWorkflow ? (attoApprovedRia ? 'Azione successiva: genera l’Atto senza filigrana' : 'Azione successiva: genera la bozza Word dell’Atto') : `Azione successiva: ${generateBozzaButtonLabel}`} />}
              <button
                type='button'
                title={generateActionTitle}
                aria-label={generateActionTitle}
                disabled={generateActionDisabled}
                onClick={attoWorkflow ? props.onGenerateAttoContestazioneWord : props.onGenerateBozzaDeterminazioneWord}
                style={bozzaIconButtonStyle({ disabled: generateActionDisabled })}
              >
                <BozzaActionIcon name='edit' size={24} />
              </button>
            </span>

            <span style={{ position: 'relative', display: 'inline-flex' }}>
              {nextIaAction === 'UPLOAD_PDF' && <NextActionPulse floating title={attoWorkflow
                ? (attoEmailDirettorePreparata ? (hasAttoFirmato ? 'Azione successiva: carica insieme i PDF restituiti dal protocollo' : 'Azione successiva: carica l’Atto firmato digitalmente dal Direttore') : 'Azione successiva: carica il PDF dell’Atto')
                : (propostaUfficialeDaAcquisire
                    ? 'Azione successiva: carica il fascicolo protocollato'
                    : (postApprovalProtocolSaved ? 'Azione successiva: carica il PDF della determinazione' : 'Azione successiva: carica la bozza PDF'))} />}
              <label
                title={uploadActionTitle}
                aria-label={uploadActionTitle}
                aria-disabled={uploadActionDisabled}
                style={{ ...bozzaIconButtonStyle({ disabled: uploadActionDisabled }), margin: 0 }}
              >
                <BozzaActionIcon name='upload' size={24} />
                <input
                  key={inputKey}
                  type='file'
                  multiple={(!!propostaUfficialeDaAcquisire && !attoWorkflow) || (attoWorkflow && hasAttoFirmato && !protocolloAttoCompleto)}
                  disabled={uploadActionDisabled}
                  accept='.pdf,application/pdf'
                  style={{ display: 'none' }}
                  onChange={e => {
                    const selectedFiles = Array.from(e.target.files || [])
                    const file = selectedFiles[0] || null
                    if (attoWorkflow && hasAttoFirmato && !protocolloAttoCompleto) void uploadProtocolloAttoBatch(selectedFiles)
                    else if (attoWorkflow) void uploadAttoContestazionePdf(file)
                    else if (propostaUfficialeDaAcquisire) void uploadProtocolloFascicolo(selectedFiles)
                    else if (determinazioneUfficialeDaAcquisire) void uploadDeterminazioneUfficiale(file)
                    else void uploadBozzaPdf(file)
                  }}
                />
              </label>
            </span>

            <span style={{ position: 'relative', display: 'inline-flex' }}>
              {nextIaAction === 'TRANSMIT_RIA' && <NextActionPulse floating title={attoWorkflow ? 'Azione successiva: trasmetti l’Atto al Responsabile' : 'Azione successiva: trasmetti il fascicolo al Responsabile'} />}
              <button
                type='button'
                title={transmitActionTitle}
                aria-label={transmitActionTitle}
                disabled={transmitActionDisabled}
                onClick={attoWorkflow ? props.onTransmitAttoContestazioneRia : props.onTransmitBozzaDeterminazioneRia}
                style={bozzaIconButtonStyle({ disabled: transmitActionDisabled })}
              >
                <BozzaActionIcon name='send' size={24} />
              </button>
            </span>

            <span style={{ position: 'relative', display: 'inline-flex' }}>
              {(nextIaAction === 'SEND_PROTOCOLLO' || nextIaAction === 'EMAIL_DIRETTORE') && (
                <NextActionPulse floating title={contextualEmailPulseTitle} />
              )}
              <button
                type='button'
                title={contextualEmailTitle}
                aria-label={contextualEmailTitle}
                disabled={contextualEmailDisabled}
                onClick={attoWorkflow ? (contextualEmailIsAttoProtocollo ? props.onPrepareEmailAttoProtocollo : props.onPrepareEmailAttoDirettore) : (contextualEmailIsProtocollo ? props.onPrepareEmailProtocollo : props.onPrepareEmailDirettore)}
                style={bozzaIconButtonStyle({ disabled: contextualEmailDisabled })}
              >
                <BozzaActionIcon name='mail' size={24} />
              </button>
            </span>

          </div>
        </div>,
        props.actionBarTarget
      )}
    </div>
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
  const iaAssegnato = String(pickAttrCI(d, ['ia_assegnato_nome', 'ia_assegnato_username']) || '—')
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
      title: 'Stato Istruttore amministrativo',
      rows: [
        { label: 'Stato', value: compactValue(d, props.fields, 'stato_IA') },
        { label: 'Data', value: compactValue(d, props.fields, 'dt_presa_in_carico_IA') },
        { label: 'Assegnato a', value: iaAssegnato }
      ]
    },
    {
      title: 'Stato Responsabile istruttoria amministrativa',
      rows: [
        { label: 'Stato', value: compactValue(d, props.fields, 'stato_RIA') },
        { label: 'Data', value: compactValue(d, props.fields, 'dt_stato_RIA') }
      ]
    },
    {
      title: 'Determinazione autorizzativa',
      rows: [
        { label: 'Stato', value: compactValue(d, props.fields, 'determinazione_stato') },
        { label: 'Numero', value: compactValue(d, props.fields, 'determinazione_numero') },
        { label: 'Data', value: compactValue(d, props.fields, 'determinazione_data') },
        { label: 'Trasmissione firma', value: compactValue(d, props.fields, 'determinazione_trasmessa_firma_il') }
      ]
    }
  ]
  return (
    <Section title='Istruttoria amministrativa'>
      <details style={{ border: `${Number(st.formExpandableCardBorderWidth ?? 1)}px solid ${st.formExpandableCardBorderColor || '#e5e7eb'}`, borderRadius: 10, background: st.formExpandableCardBg || '#f9fafb', padding: 10 }}>
        <summary style={{ cursor: 'pointer', color: st.formInnerHeaderColor || '#0f4c81', fontSize: Number(st.formInnerHeaderFontSize ?? 14), fontWeight: 900 }}>Dettagli pratica e iter</summary>
        <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
          <PracticePhaseGroup title='Fase tecnica' items={faseTecnicaDetails} />
          <PracticePhaseGroup title='Fase amministrativa' items={faseAmministrativaDetails} />
        </div>
      </details>
    </Section>
  )
}

const POST_APPROVAL_INFO = 'La compilazione di questa scheda sarà disponibile dopo la registrazione di numero e data dell’atto di accertamento e contestazione.'
const POST_NOTIFICATION_INFO = 'La compilazione di questa scheda sarà disponibile solo dopo che la notifica risulta perfezionata con esito “Notificata” o “Compiuta giacenza”.'
const READONLY_RECTIFICATION_SUFFIX = 'Eventuali inesattezze devono essere segnalate al Responsabile istruttoria amministrativa, affinché sia valutato il rimando all’Area di provenienza per la rettifica.'
const TRASGRESSORE_ANAGRAFICA_READONLY_INFO = `I dati anagrafici del trasgressore sono riportati in sola lettura. ${READONLY_RECTIFICATION_SUFFIX}`
const RESIDENZA_READONLY_INFO = `I dati della residenza sono riportati in sola lettura. ${READONLY_RECTIFICATION_SUFFIX}`
const SEDE_LEGALE_READONLY_INFO = `I dati della sede legale sono riportati in sola lettura. ${READONLY_RECTIFICATION_SUFFIX}`
const DOMICILIO_NOTIFICA_READONLY_INFO = `I dati del domicilio per le notifiche sono riportati in sola lettura. ${READONLY_RECTIFICATION_SUFFIX}`
const RAPPRESENTANTE_LEGALE_READONLY_INFO = `I dati del rappresentante legale sono riportati in sola lettura. ${READONLY_RECTIFICATION_SUFFIX}`
const ANNOTAZIONI_TI_READONLY_INFO = `Le annotazioni dell’istruttore tecnico sono riportate in sola lettura. ${READONLY_RECTIFICATION_SUFFIX}`
const PAYMENT_MODE_INFO = 'Selezionare la modalità di pagamento: pagoPA, bonifico bancario, pagamento misto o altro.'
const PROTOCOLLO_NOTIFICA_INFO = 'Numero e data di protocollo vengono registrati dopo il rientro dell’Atto firmato e la trasmissione al protocollo. Gli estremi della notifica si compilano solo dopo la protocollazione.'
const RIAPERTURA_INFO = 'La riapertura è di competenza del Responsabile dell’istruttoria amministrativa, su indicazione del Direttore dell’Area Affari Generali e Programmazione Finanziaria a seguito della decisione del CdA. Questa scheda registra gli estremi; la nuova lavorazione sarà gestita secondo l’iter previsto.'

function trasgressoreField (fields: LayerFieldInfo[], candidates: string[]): string | null {
  for (const name of candidates) {
    const f = getFieldInfo(fields, name)
    if (f) return f.name
  }
  return null
}


function TrasgressoreAmmSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, showReadOnlyInfo?: boolean, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  const fields = props.fields || []
  const rawTipo = String(pickAttrCI(d, ['tipologia_soggetto']) || '').toUpperCase()
  const ragioneSociale = String(pickAttrCI(d, ['ragione_sociale']) || '').trim()
  const piva = String(pickAttrCI(d, ['piva', 'partita_iva']) || '').trim()
  const isPg = rawTipo.includes('GIUR') || rawTipo === 'PG' || !!ragioneSociale || !!piva
  const mainAddressTitle = isPg ? 'Sede legale' : 'Residenza'
  const mainAddressRef = isPg ? 'la sede legale' : 'la residenza'
  const st = useAdminStyle()

  const mk = (name: string, label: string, kind: AdminFieldKind = 'text', full = false): AdminField => ({ group: 'trasgressore', name, label, kind, full })
  const existingField = (candidates: string[], label: string, kind: AdminFieldKind = 'text', full = false): AdminField | null => {
    const name = trasgressoreField(fields, candidates)
    return name ? mk(name, label, kind, full) : null
  }

  const labelStyle: React.CSSProperties = {
    color: st.formLabelColor || '#334155',
    fontSize: Math.max(13, Number(st.formLabelFontSize ?? 15) - 1),
    fontWeight: Number(st.formLabelFontWeight ?? 600) as any,
    marginBottom: 3,
    lineHeight: 1.2
  }
  const valueStyle: React.CSSProperties = {
    color: '#375623',
    fontSize: Number(st.formFieldFontSize ?? 15),
    fontWeight: 400,
    fontStyle: 'italic',
    lineHeight: 1.2,
    minHeight: 0,
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap'
  }
  const fieldHeight = Math.max(24, Number(st.formFieldHeight ?? 32) || 32)
  const valueBoxStyle: React.CSSProperties = {
    border: `${Number(st.formFieldBorderWidth ?? 1)}px solid #b8d4b0`,
    background: '#e8f0e9',
    borderRadius: Number(st.formFieldBorderRadius ?? 7),
    padding: `0 ${Number(st.formFieldPaddingX ?? 9)}px`,
    minHeight: fieldHeight,
    minWidth: 0,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    cursor: 'default'
  }
  const noteBoxStyle: React.CSSProperties = {
    ...valueBoxStyle,
    padding: `6px ${Number(st.formFieldPaddingX ?? 9)}px`,
    alignItems: 'flex-start',
    minHeight: 220,
    alignSelf: 'stretch'
  }

  const fieldValue = (field: AdminField): string => {
    const value = displayAdminFieldValue(d, fields, field.name)
    if (['email', 'e_mail', 'pec'].includes(field.name.toLowerCase())) return value === '—' ? value : value.toLocaleLowerCase('it-IT')
    return value
  }

  const ReadOnlyField: React.FC<{ field: AdminField, note?: boolean }> = (props) => (
    <div style={{ minWidth: 0, gridColumn: props.field.full ? '1 / -1' : undefined }}>
      <div style={labelStyle}>{props.field.label}</div>
      <div style={props.note ? noteBoxStyle : valueBoxStyle}>
        <div style={valueStyle}>{fieldValue(props.field)}</div>
      </div>
    </div>
  )

  const renderRow = (key: React.Key, columns: string, rowFields: Array<AdminField | null>, gap = 12): React.ReactNode => {
    const hasVisible = rowFields.some(Boolean)
    if (!hasVisible) return null
    return (
      <div key={key} style={{ display: 'grid', gridTemplateColumns: columns, gap, minWidth: 0, maxWidth: '100%' }}>
        {rowFields.map((field, i) => field ? <ReadOnlyField key={`${String(key)}-${field.name}`} field={field} /> : <div key={`${String(key)}-${i}`} />)}
      </div>
    )
  }

  const renderCardRows = (title: string, rows: React.ReactNode[], cardStyle?: React.CSSProperties, right?: React.ReactNode) => {
    const visibleRows = rows.filter(Boolean)
    if (visibleRows.length <= 0) return null
    return (
      <Section title={title} cardStyle={cardStyle} right={right}>
        <div style={{ display: 'grid', gap: 12 }}>{visibleRows}</div>
      </Section>
    )
  }

  const tipoField = existingField(['tipologia_soggetto'], 'Tipologia soggetto', 'domain')
  const qualificaField = existingField(['qualifica_fondo'], 'Qualifica rispetto al fondo', 'domain')
  const nomeField = existingField(['nome'], 'Nome')
  const cognomeField = existingField(['cognome'], 'Cognome')
  const cfField = existingField(['codice_fiscale', 'cf'], 'Codice fiscale')
  const ragioneSocialeField = existingField(['ragione_sociale'], 'Ragione sociale', 'text', true)
  const pivaField = existingField(['piva', 'partita_iva'], 'P. IVA')

  const trasgressoreRows = [
    renderRow('tipo-qualifica', '1fr 1fr', [tipoField, qualificaField]),
    isPg
      ? renderRow('pg', '2fr 1fr', [ragioneSocialeField, pivaField])
      : renderRow('pf', '1fr 1fr 1fr', [nomeField, cognomeField, cfField])
  ]

  const indirizzoRows = [
    renderRow('indirizzo-1', '4fr 1fr', [existingField(['via'], 'Via/Piazza/Località'), existingField(['civico', 'numero_civico'], 'N. civico')]),
    renderRow('indirizzo-2', '2fr 0.8fr 1fr 1.4fr', [existingField(['citta', 'comune'], 'Città'), existingField(['provincia'], 'Provincia'), existingField(['cap'], 'CAP'), existingField(['stato'], 'Stato')]),
    renderRow('indirizzo-3', '1fr 1fr 1fr 1fr', [existingField(['telefono'], 'Telefono'), existingField(['cellulare'], 'Cellulare'), existingField(['email', 'e_mail'], 'E-mail'), existingField(['pec'], 'PEC')])
  ]

  const domRaw = pickAttrCI(d, ['dom_notifica_uguale'])
  const domicilioCoincide = domRaw == null || domRaw === '' || String(domRaw) === '1' || String(domRaw).toLowerCase() === 'si' || String(domRaw).toLowerCase() === 'sì' || String(domRaw).toLowerCase() === 'true'
  const domicilioRows = [
    renderRow('dom-0', '1fr 2fr', [existingField(['dom_notifica_uguale'], `Coincide con ${mainAddressRef}`, 'domain'), null])
  ]
  if (!domicilioCoincide) {
    domicilioRows.push(
      renderRow('dom-1', '4fr 1fr', [existingField(['dom_notifica_via'], 'Via/Piazza/Località'), existingField(['dom_notifica_civico'], 'N. civico')]),
      renderRow('dom-2', '2fr 0.8fr 1fr 1.4fr', [existingField(['dom_notifica_citta'], 'Città'), existingField(['dom_notifica_provincia'], 'Provincia'), existingField(['dom_notifica_cap'], 'CAP'), existingField(['dom_notifica_stato'], 'Stato')])
    )
  } else {
    domicilioRows.push(<InfoBox key='dom-info'>Il domicilio per le notifiche coincide con {mainAddressRef}.</InfoBox>)
  }

  const rlDomRaw = pickAttrCI(d, ['rl_dom_notifica'])
  const rlDomPresente = String(rlDomRaw || '0') === '1' || String(rlDomRaw || '').toLowerCase() === 'si' || String(rlDomRaw || '').toLowerCase() === 'sì' || String(rlDomRaw || '').toLowerCase() === 'true'
  const rappresentanteRows: React.ReactNode[] = []
  if (isPg) {
    rappresentanteRows.push(
      renderRow('rl-1', '1fr 1fr 1fr', [existingField(['rl_nome'], 'Nome'), existingField(['rl_cognome'], 'Cognome'), existingField(['rl_cf'], 'Codice fiscale')]),
      renderRow('rl-2', '2fr 1fr', [existingField(['rl_carica'], 'Carica', 'domain'), existingField(['rl_dom_notifica'], 'Domicilio notifiche del rappresentante', 'domain')])
    )
    if (rlDomPresente) {
      rappresentanteRows.push(
        renderRow('rl-3', '4fr 1fr', [existingField(['rl_dom_via'], 'Via/Piazza/Località'), existingField(['rl_dom_civico'], 'N. civico')]),
        renderRow('rl-4', '2fr 0.8fr 1fr 1.4fr', [existingField(['rl_dom_citta'], 'Città'), existingField(['rl_dom_provincia'], 'Provincia'), existingField(['rl_dom_cap'], 'CAP'), existingField(['rl_dom_stato'], 'Stato')])
      )
    }
  }

  const noteField = existingField(['note_anagrafica'], 'Annotazioni dell’istruttore tecnico', 'textarea', true)
  const showReadOnlyInfo = props.showReadOnlyInfo !== false
  const sectionInfoButton = (text: React.ReactNode, title: string) => (
    showReadOnlyInfo ? <SectionInfoButton text={text} title={title} /> : null
  )
  const mainAddressInfo = isPg ? SEDE_LEGALE_READONLY_INFO : RESIDENZA_READONLY_INFO

  const rightColumn = noteField ? (
    <Section
      title='Annotazioni dell’istruttore tecnico'
      right={sectionInfoButton(ANNOTAZIONI_TI_READONLY_INFO, 'Informazioni annotazioni dell’istruttore tecnico')}
      cardStyle={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}
    >
      <ReadOnlyField field={noteField} note />
    </Section>
  ) : null

  const leftColumn = (
    <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
      {renderCardRows('Trasgressore', trasgressoreRows, undefined, sectionInfoButton(TRASGRESSORE_ANAGRAFICA_READONLY_INFO, 'Informazioni dati anagrafici trasgressore'))}
      {renderCardRows(mainAddressTitle, indirizzoRows, undefined, sectionInfoButton(mainAddressInfo, `Informazioni ${mainAddressTitle.toLowerCase()}`))}
      {renderCardRows('Domicilio per le notifiche', domicilioRows, undefined, sectionInfoButton(DOMICILIO_NOTIFICA_READONLY_INFO, 'Informazioni domicilio per le notifiche'))}
      {isPg && renderCardRows('Rappresentante legale', rappresentanteRows, undefined, sectionInfoButton(RAPPRESENTANTE_LEGALE_READONLY_INFO, 'Informazioni rappresentante legale'))}
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 66%) minmax(0, 34%)', gap: 12, alignItems: 'stretch', minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>{leftColumn}</div>
        <div style={{ minWidth: 0 }}>{rightColumn}</div>
      </div>
    </div>
  )
}

function ProtocolloNotificaGuidataSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, showContextualInfo?: boolean, sectionInfo?: React.ReactNode, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  const definitivo = isDeterminazioneAdottata(d) && hasAdminValue(pickAttrCI(d, ['accertamento_numero']))
  const hasVerbale = tipoAttoAmmPrevedeVerbale(d)
  const protocolloNumero = pickAttrCI(d, ['protocollo_atto_accertamento_numero'])
  const protocolloData = pickAttrCI(d, ['protocollo_atto_accertamento_data'])
  const protocolloCompleto = hasAdminValue(protocolloNumero) && hasAdminValue(protocolloData)
  const esito = notificaEsitoCode(d)
  const perfezionata = isNotificaPerfezionata(d)
  const daRipetere = isNotificaDaRipetere(d)
  const canEditProtocollo = props.canEdit && definitivo && protocolloCompleto
  const canEditNotifica = canEditProtocollo && protocolloCompleto
  const statoProtocollo = protocolloCompleto ? 'Registrato' : 'Da completare'
  const statoNotifica = esito ? displayAdminFieldValue(d, props.fields, 'notifica_esito') : 'Da registrare'

  // Numero e data di protocollo esistono solo dopo il rientro della copia protocollata.
  // Prima di quel momento questa sezione non appartiene ancora al lavoro dell'IA.
  if (!protocolloCompleto) return null

  return (
    <Section title='Protocollo e notifica' right={<SectionInfoButton text={props.showContextualInfo && definitivo && !protocolloCompleto ? PROTOCOLLO_NOTIFICA_INFO : null} title='Informazioni protocollo e notifica' />}>

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
          <div>
            <AdminFieldsGrid
              group='notifica'
              draft={d}
              fields={props.fields}
              canEdit={canEditNotifica}
              onChange={props.onChange}
              fieldNames={NOTIFICA_ATTO_FIELDS.filter(name => name !== 'notifica_tipo')}
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


function GiiPaymentDocumentsPanel (props: {
  data: Record<string, any>
  fields: LayerFieldInfo[]
  canEdit: boolean
  role: string
  disabled?: boolean
  onChange: (name: string, value: any) => void
  onReadyChange?: (ready: boolean | null) => void
  onPresenceChange?: (hasRows: boolean | null) => void
}) {
  const st = useAdminStyle()
  const data = props.data || {}
  const role = String(props.role || '').trim().toUpperCase()
  const editableAccess = role === 'IA' || role === 'ADMIN'
  const canMutate = !!props.canEdit && editableAccess && !props.disabled
  const practiceGlobalId = String(pickAttrCI(data, ['GlobalID', 'globalid']) || '').trim()
  const practiceMode = getPaymentMode(data, props.fields)
  const total = Math.max(0, parseNumberInput(pickAttrCI(data, ['pagamento_importo_totale'])) || 0)
  const [positions, setPositions] = React.useState<GiiPaymentPosition[]>([])
  const [drafts, setDrafts] = React.useState<Record<number, Record<string, any>>>({})
  const [rateInput, setRateInput] = React.useState('0')
  const [loadedGid, setLoadedGid] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)
  const [inputKey, setInputKey] = React.useState(0)
  const [confirmPlanRateCount, setConfirmPlanRateCount] = React.useState<number | null>(null)
  const [pendingPagoPaBatch, setPendingPagoPaBatch] = React.useState<GiiPagoPaBatchPlanItem[] | null>(null)
  const [deleteDocumentTarget, setDeleteDocumentTarget] = React.useState<{ row: GiiPaymentPosition, att: AmmAttachmentInfo } | null>(null)
  const rateTouchedRef = React.useRef(false)

  const buildDrafts = React.useCallback((rows: GiiPaymentPosition[]) => {
    const next: Record<number, Record<string, any>> = {}
    for (const row of rows) next[row.objectId] = { ...(row.attributes || {}) }
    setDrafts(next)
  }, [])

  const publishState = React.useCallback((rows: GiiPaymentPosition[]) => {
    const hasRows = rows.length > 0
    props.onPresenceChange?.(hasRows)
    props.onReadyChange?.(hasRows ? giiPaymentValidationIssues(rows, total, practiceMode).length === 0 : null)
  }, [practiceMode, props.onPresenceChange, props.onReadyChange, total])

  const reload = React.useCallback(async () => {
    if (!practiceGlobalId) {
      setPositions([])
      setDrafts({})
      setLoadedGid('')
      props.onPresenceChange?.(null)
      props.onReadyChange?.(null)
      return [] as GiiPaymentPosition[]
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await queryGiiPaymentPositions(practiceGlobalId, editableAccess, true)
      setPositions(rows)
      buildDrafts(rows)
      setLoadedGid(practiceGlobalId)
      if (!rateTouchedRef.current) setRateInput(String(giiPaymentRateCount(rows)))
      publishState(rows)
      return rows
    } catch (e: any) {
      setPositions([])
      setDrafts({})
      setLoadedGid(practiceGlobalId)
      props.onPresenceChange?.(null)
      props.onReadyChange?.(null)
      setError(e?.message || String(e))
      return [] as GiiPaymentPosition[]
    } finally {
      setLoading(false)
    }
  }, [buildDrafts, editableAccess, practiceGlobalId, props.onPresenceChange, props.onReadyChange, publishState])

  React.useEffect(() => {
    rateTouchedRef.current = false
    setPositions([])
    setDrafts({})
    setLoadedGid('')
    setError(null)
    setInfo(null)
    setRateInput('0')
    setConfirmPlanRateCount(null)
    setPendingPagoPaBatch(null)
    setDeleteDocumentTarget(null)
  }, [practiceGlobalId])

  React.useEffect(() => {
    if (practiceGlobalId && loadedGid !== practiceGlobalId) void reload()
  }, [loadedGid, practiceGlobalId, reload])

  React.useEffect(() => {
    const handler = (event: Event) => {
      const gid = String((event as CustomEvent)?.detail?.practiceGlobalId || '').trim()
      if (!gid || globalIdVariantsForLog(gid).some(v => globalIdVariantsForLog(practiceGlobalId).includes(v))) void reload()
    }
    window.addEventListener('gii-pagamenti-changed', handler as EventListener)
    return () => window.removeEventListener('gii-pagamenti-changed', handler as EventListener)
  }, [practiceGlobalId, reload])

  const syncPracticeSummary = React.useCallback((rows: GiiPaymentPosition[]) => {
    const deadline = earliestGiiPaymentDeadline(rows)
    props.onChange('pagamento_scadenza', deadline)
    const complete = rows.length > 0 && giiPaymentValidationIssues(rows, total, practiceMode).length === 0
    const current = String(pickAttrCI(data, ['pagamento_stato']) || '').trim().toUpperCase()
    if (!['NOTIFICATO', 'PARZIALE', 'PAGATO', 'SCADUTO', 'ANNULLATO'].includes(current)) {
      props.onChange('pagamento_stato', complete ? 'GENERATO' : 'DA_GENERARE')
    }
  }, [data, practiceMode, props, total])

  const executePlan = React.useCallback(async (n: number) => {
    if (!practiceGlobalId || !canMutate || busy) return
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const profile = readUserProfile()
      const rows = buildGiiPaymentPlanAttributes(practiceGlobalId, practiceMode, total, n, profile.username)
      if (positions.length) await replaceGiiPaymentPositions(positions, rows)
      else await addGiiPaymentPositions(rows)
      rateTouchedRef.current = false
      const updated = await reload()
      const expectedCount = n >= 2 ? n + 1 : 1
      if (updated.length !== expectedCount || giiPaymentRateCount(updated) !== n) {
        throw new Error('Le posizioni sono state registrate, ma la configurazione riletta non coincide con il piano richiesto. Aggiornare la scheda e riprovare.')
      }
      syncPracticeSummary(updated)
      setInfo(n >= 2
        ? `Piano predisposto: unica soluzione + ${n} rate (${n + 1} posizioni di pagamento).`
        : 'Piano predisposto: pagamento in unica soluzione.')
      dispatchGiiPaymentsChanged(practiceGlobalId)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
      setConfirmPlanRateCount(null)
    }
  }, [busy, canMutate, positions, practiceGlobalId, practiceMode, reload, syncPracticeSummary, total])

  const applyPlan = React.useCallback(async () => {
    if (!practiceGlobalId || !canMutate || busy) return
    setError(null)
    setInfo(null)
    try {
      if (!practiceMode) throw new Error('Definire prima la modalità di pagamento nella sezione Preparazione dell’Atto e della notifica.')
      if (!(total > 0)) throw new Error('Il totale da pagare non è disponibile.')
      const n = Number(rateInput)
      if (!Number.isInteger(n) || n < 0 || n === 1) throw new Error('Indicare 0 per la sola unica soluzione oppure un numero di rate pari almeno a 2.')
      const protectedRows = positions.filter(row =>
        (parseNumberInput(pickAttrCI(row.attributes, ['importo_pagato'])) || 0) > 0 ||
        hasAdminValue(pickAttrCI(row.attributes, ['data_pagamento']))
      )
      if (protectedRows.length) throw new Error('Il piano non può essere ricreato perché sono già presenti dati di pagamento.')
      if (positions.length) {
        setConfirmPlanRateCount(n)
        return
      }
      await executePlan(n)
    } catch (e: any) {
      setError(e?.message || String(e))
    }
  }, [busy, canMutate, executePlan, positions, practiceGlobalId, practiceMode, rateInput, total])

  const setDraftField = React.useCallback((objectId: number, name: string, value: any) => {
    setDrafts(prev => ({ ...prev, [objectId]: { ...(prev[objectId] || {}), [name]: value } }))
  }, [])

  const savePosition = React.useCallback(async (row: GiiPaymentPosition) => {
    if (!row?.objectId || !canMutate || busy) return
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      const draft = drafts[row.objectId] || row.attributes || {}
      const profile = readUserProfile()
      const attrs: Record<string, any> = {
        modalita_pagamento: String(pickAttrCI(draft, ['modalita_pagamento']) || '').trim() || null,
        importo_dovuto: parseNumberInput(pickAttrCI(draft, ['importo_dovuto'])),
        scadenza: dateMsOrNull(pickAttrCI(draft, ['scadenza'])),
        tipo_riferimento: String(pickAttrCI(draft, ['tipo_riferimento']) || '').trim() || null,
        riferimento_pagamento: String(pickAttrCI(draft, ['riferimento_pagamento']) || '').trim() || null,
        tipo_riferimento_secondario: String(pickAttrCI(draft, ['tipo_riferimento_secondario']) || '').trim() || null,
        riferimento_secondario: String(pickAttrCI(draft, ['riferimento_secondario']) || '').trim() || null,
        note: String(pickAttrCI(draft, ['note']) || '').trim() || null,
        aggiornato_il: Date.now(),
        aggiornato_da: profile.username || null
      }
      if (!(Number(attrs.importo_dovuto) > 0)) throw new Error(`${giiPaymentPositionLabel(row.attributes)}: indicare un importo dovuto maggiore di zero.`)
      await updateGiiPaymentPosition(row.objectId, attrs)
      const updated = await reload()
      syncPracticeSummary(updated)
      setInfo(`${giiPaymentPositionLabel(row.attributes)} aggiornata.`)
      dispatchGiiPaymentsChanged(practiceGlobalId)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }, [busy, canMutate, drafts, practiceGlobalId, reload, syncPracticeSummary])

  const executePagoPaBatch = React.useCallback(async (plan: GiiPagoPaBatchPlanItem[]) => {
    if (!plan.length || !practiceGlobalId || !canMutate || busy) return
    setBusy(true)
    setError(null)
    setInfo(null)
    const layer = await getGiiPaymentLayer(true)
    const oidField = String(layer?.objectIdField || 'OBJECTID')
    let newObjectIds: number[] = []
    try {
      const temporaryAttrs = plan.map(item => ({ ...item.attributes, stato_pagamento: 'ANNULLATO' }))
      const addResult = await layer.applyEdits({ addFeatures: temporaryAttrs.map(attributes => ({ attributes })) }, { rollbackOnFailureEnabled: true })
      throwPaymentEditFailure(addResult, 'Creazione delle posizioni pagoPA non riuscita')
      const addRows = Array.isArray(addResult?.addFeatureResults) ? addResult.addFeatureResults : (Array.isArray(addResult?.addResults) ? addResult.addResults : [])
      newObjectIds = addRows.map((row: any) => Number(row?.objectId)).filter((oid: number) => Number.isFinite(oid) && oid > 0)
      if (newObjectIds.length !== plan.length) throw new Error('Le nuove posizioni sono state create, ma non è stato possibile identificarle tutte.')

      for (let i = 0; i < plan.length; i++) {
        const oid = newObjectIds[i]
        const syntheticRow: GiiPaymentPosition = { objectId: oid, globalId: '', attributes: plan[i].attributes, attachments: [] }
        const ids = await addAmmAttachments(layer, oid, [plan[i].file], GII_VIEW_EDIT_PAGAMENTI_URL, giiPaymentDocumentKeywords(syntheticRow, 'PAGOPA'))
        if (!Number.isFinite(Number(ids?.[0])) || Number(ids?.[0]) <= 0) throw new Error(`Non è stato possibile associare “${plan[i].file.name}” alla relativa posizione.`)
      }

      const oldDeleteFeatures = await giiPaymentDeleteGraphics(layer, positions.map(row => row.objectId))
      const finalResult = await layer.applyEdits({
        updateFeatures: newObjectIds.map(oid => ({ attributes: { [oidField]: oid, stato_pagamento: 'DA_PAGARE', aggiornato_il: Date.now(), aggiornato_da: readUserProfile().username || null } })),
        deleteFeatures: oldDeleteFeatures
      }, { rollbackOnFailureEnabled: true })
      throwPaymentEditFailure(finalResult, 'Sostituzione delle posizioni pagoPA non riuscita')

      const updated = await reload()
      syncPracticeSummary(updated)
      setInputKey(k => k + 1)
      const rateCount = plan.filter(item => String(item.attributes.tipo_posizione || '').toUpperCase() === 'RATA').length
      setInfo(rateCount
        ? `Avvisi pagoPA acquisiti: unica soluzione + ${rateCount} rate (${plan.length} avvisi).`
        : 'Avviso pagoPA acquisito: pagamento in unica soluzione.')
      dispatchGiiPaymentsChanged(practiceGlobalId)
    } catch (e: any) {
      if (newObjectIds.length) {
        try {
          const cleanupGraphics = await giiPaymentDeleteGraphics(layer, newObjectIds)
          await layer.applyEdits({ deleteFeatures: cleanupGraphics }, { rollbackOnFailureEnabled: true })
        } catch {}
      }
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
      setPendingPagoPaBatch(null)
    }
  }, [busy, canMutate, positions, practiceGlobalId, reload, syncPracticeSummary])

  const preparePagoPaBatch = React.useCallback(async (files: File[]) => {
    if (!files.length || !practiceGlobalId || !canMutate || busy) return
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (practiceMode !== 'PAGOPA') throw new Error('Il caricamento automatico multiplo è disponibile quando la modalità di pagamento della pratica è pagoPA.')
      const notPdf = files.find(file => !/\.pdf$/i.test(String(file?.name || '')))
      if (notPdf) throw new Error(`“${notPdf.name}” non è un PDF.`)
      const parsedFiles: Array<{ file: File, parsed: GiiPagoPaExtractedData }> = []
      for (const file of files) {
        const content = await extractPdfVerificationContent(file)
        if (!content.text) throw new Error(`“${file.name}”: non è stato possibile leggere il contenuto del PDF.`)
        parsedFiles.push({ file, parsed: extractPagoPaStructuredData(content.text) })
      }
      const plan = buildGiiPagoPaBatchPlan(parsedFiles, practiceGlobalId, total, readUserProfile().username)
      const protectedRows = positions.filter(row =>
        (parseNumberInput(pickAttrCI(row.attributes, ['importo_pagato'])) || 0) > 0 ||
        hasAdminValue(pickAttrCI(row.attributes, ['data_pagamento']))
      )
      if (protectedRows.length) throw new Error('Gli avvisi non possono essere sostituiti perché risultano già registrati dati di pagamento.')
      setBusy(false)
      if (positions.length) setPendingPagoPaBatch(plan)
      else await executePagoPaBatch(plan)
    } catch (e: any) {
      setError(e?.message || String(e))
      setBusy(false)
      setInputKey(k => k + 1)
    }
  }, [busy, canMutate, executePagoPaBatch, positions, practiceGlobalId, practiceMode, total])

  const uploadPositionDocument = React.useCallback(async (row: GiiPaymentPosition, file: File | null) => {
    if (!file || !row?.objectId || !canMutate || busy) return
    setError(null)
    setInfo(null)
    if (!/\.pdf$/i.test(String(file.name || ''))) { setError('Caricare il documento di pagamento in formato PDF.'); return }
    setBusy(true)
    try {
      const draft = drafts[row.objectId] || row.attributes || {}
      const mode = String(pickAttrCI(draft, ['modalita_pagamento']) || '').trim().toUpperCase()
      if (!mode) throw new Error(`${giiPaymentPositionLabel(row.attributes)}: indicare prima la modalità di pagamento.`)
      const layer = await getGiiPaymentLayer(true)
      const before = await queryAmmAttachments(layer, row.objectId, GII_VIEW_EDIT_PAGAMENTI_URL)
      const ids = await addAmmAttachments(layer, row.objectId, [file], GII_VIEW_EDIT_PAGAMENTI_URL, giiPaymentDocumentKeywords(row, mode))
      const keepId = Number(ids?.[0])
      if (!Number.isFinite(keepId) || keepId <= 0) throw new Error('Documento caricato, ma allegato non identificabile.')
      for (const old of before) {
        const oldId = Number(old.id)
        if (Number.isFinite(oldId) && oldId > 0 && oldId !== keepId) {
          try { await deleteAmmAttachment(layer, row.objectId, oldId, GII_VIEW_EDIT_PAGAMENTI_URL) } catch {}
        }
      }
      const updated = await reload()
      syncPracticeSummary(updated)
      setInputKey(k => k + 1)
      setInfo(`${giiPaymentPositionLabel(row.attributes)}: documento acquisito.`)
      dispatchGiiPaymentsChanged(practiceGlobalId)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }, [busy, canMutate, drafts, practiceGlobalId, reload, syncPracticeSummary])

  const confirmDeletePositionDocument = React.useCallback(async () => {
    const target = deleteDocumentTarget
    if (!target?.row?.objectId || !target?.att?.id || !canMutate || busy) return
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const layer = await getGiiPaymentLayer(true)
      await deleteAmmAttachment(layer, target.row.objectId, Number(target.att.id), GII_VIEW_EDIT_PAGAMENTI_URL)
      const updated = await reload()
      syncPracticeSummary(updated)
      setInputKey(k => k + 1)
      dispatchGiiPaymentsChanged(practiceGlobalId)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
      setDeleteDocumentTarget(null)
    }
  }, [busy, canMutate, deleteDocumentTarget, practiceGlobalId, reload, syncPracticeSummary])

  const deletePositionDocument = React.useCallback((row: GiiPaymentPosition, att: AmmAttachmentInfo) => {
    if (!row?.objectId || !att?.id || !canMutate || busy) return
    setDeleteDocumentTarget({ row, att })
  }, [busy, canMutate])

  const downloadPositionDocument = React.useCallback(async (row: GiiPaymentPosition, att: AmmAttachmentInfo) => {
    if (!row?.objectId || !att?.id || busy) return
    setBusy(true)
    setError(null)
    try { await downloadAmmAttachmentFile(att, row.objectId, giiPaymentLayerUrl(editableAccess)) }
    catch (e: any) { setError(e?.message || String(e)) }
    finally { setBusy(false) }
  }, [busy, editableAccess])

  const issues = giiPaymentValidationIssues(positions, total, practiceMode)
  const currentRateCount = giiPaymentRateCount(positions)
  const hasUnsavedPositionChanges = practiceMode === 'PAGOPA' ? false : positions.some(row =>
    giiPaymentDraftChanged(row.attributes || {}, drafts[row.objectId] || row.attributes || {})
  )
  const ratePlanInputChanged = practiceMode === 'PAGOPA' ? false : (positions.length > 0 && String(rateInput).trim() !== String(currentRateCount))
  const hasUnsavedPaymentChanges = hasUnsavedPositionChanges || ratePlanInputChanged
  React.useEffect(() => {
    if (hasUnsavedPaymentChanges) props.onReadyChange?.(false)
  }, [hasUnsavedPaymentChanges, props.onReadyChange])

  const refOptions = [
    { code: '', name: '—' }, { code: 'IUV', name: 'IUV' }, { code: 'CODICE_AVVISO', name: 'Codice avviso' },
    { code: 'TRN', name: 'TRN' }, { code: 'CRO', name: 'CRO' }, { code: 'ALTRO', name: 'Altro' }
  ]
  const modeOptions = [
    { code: '', name: '—' }, { code: 'PAGOPA', name: 'pagoPA' }, { code: 'BONIFICO', name: 'Bonifico' },
    { code: 'BOLLETTINO', name: 'Bollettino postale' }, { code: 'ALTRO', name: 'Altro' }
  ]
  const fieldHeight = Math.max(24, Number(st.formFieldHeight ?? 32) || 32)
  const inputStyle = inputStyleFrom(st, !canMutate)
  const labelStyle: React.CSSProperties = {
    color: st.formLabelColor || '#334155', fontSize: Number(st.formLabelFontSize ?? 15),
    fontWeight: Number(st.formLabelFontWeight ?? 600) as any, marginBottom: Number(st.formLabelMarginBottom ?? 3), lineHeight: 1.2
  }
  const paymentFieldStyle: React.CSSProperties = { display: 'grid', alignContent: 'start', minWidth: 0 }
  const paymentActionButtonStyle = (disabled?: boolean): React.CSSProperties => ({
    ...bozzaActionButtonStyle({ disabled }), height: fieldHeight, minHeight: fieldHeight, boxSizing: 'border-box',
    borderRadius: Number(st.formFieldBorderRadius ?? 7), fontSize: Math.max(13, Number(st.formFieldFontSize ?? 15) - 2), lineHeight: 1
  })

  if (!practiceGlobalId) return <InfoBox kind='warn'>GlobalID della pratica non disponibile: le posizioni di pagamento non possono essere collegate.</InfoBox>
  if (!(total > 0)) return <InfoBox>Per questa pratica non risulta alcun importo da pagare.</InfoBox>

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {confirmPlanRateCount != null && practiceMode !== 'PAGOPA' && (
        <PaymentPlanConfirmDialog currentCount={positions.length} rateCount={confirmPlanRateCount} saving={busy} onCancel={() => setConfirmPlanRateCount(null)} onConfirm={() => { void executePlan(confirmPlanRateCount) }} />
      )}
      {pendingPagoPaBatch && (
        <ConfirmActionDialog
          title='Sostituire gli avvisi pagoPA'
          text={`Le ${positions.length} posizioni attuali e i relativi documenti saranno sostituiti con i ${pendingPagoPaBatch.length} avvisi appena selezionati. Il sistema ricostruirà automaticamente unica soluzione e rate.`}
          confirmLabel='Sostituisci avvisi'
          saving={busy}
          onCancel={() => { setPendingPagoPaBatch(null); setInputKey(k => k + 1) }}
          onConfirm={() => { void executePagoPaBatch(pendingPagoPaBatch) }}
        />
      )}
      {deleteDocumentTarget && (
        <ConfirmActionDialog
          title='Eliminare il documento'
          text={`Eliminare il documento “${deleteDocumentTarget.att.name || deleteDocumentTarget.att.id}” dalla posizione ${giiPaymentPositionLabel(deleteDocumentTarget.row.attributes)}?`}
          confirmLabel='Elimina'
          danger
          saving={busy}
          onCancel={() => setDeleteDocumentTarget(null)}
          onConfirm={() => { void confirmDeletePositionDocument() }}
        />
      )}

      {practiceMode === 'PAGOPA' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(280px, 1fr)', gap: 10, alignItems: 'center' }}>
          <label style={{ ...paymentActionButtonStyle(!canMutate || busy || loading), margin: 0, cursor: !canMutate || busy || loading ? 'not-allowed' : 'pointer', justifySelf: 'start' }}>
            Carica avvisi pagoPA
            <input
              key={`payment-batch-${inputKey}`}
              type='file'
              accept='application/pdf,.pdf'
              multiple
              disabled={!canMutate || busy || loading}
              style={{ display: 'none' }}
              onChange={e => { const files = Array.from(e.currentTarget.files || []); void preparePagoPaBatch(files) }}
            />
          </label>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.35 }}>
            Selezionare insieme tutti gli avvisi prodotti: uno per l’unica soluzione e, se previste, tutte le rate. Il sistema legge importi, scadenze, IUV e codici avviso e costruisce automaticamente il piano.
            {positions.length > 0 && <><br/><strong>Configurazione corrente:</strong> {currentRateCount >= 2 ? `unica soluzione + ${currentRateCount} rate (${positions.length} avvisi)` : 'unica soluzione'}.</>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `${ADMIN_COMPACT_FIELD_MAX_WIDTH}px auto minmax(280px, 1fr)`, gridTemplateRows: `auto ${fieldHeight}px`, columnGap: 10, rowGap: Number(st.formLabelMarginBottom ?? 3), alignItems: 'center' }}>
          <span style={{ ...labelStyle, marginBottom: 0, gridColumn: '1', gridRow: '1' }}>Numero rate concesse</span>
          <input type='number' min={0} step={1} value={rateInput} disabled={!canMutate || busy || loading} onChange={e => { rateTouchedRef.current = true; setRateInput(e.target.value) }} style={{ ...inputStyle, gridColumn: '1', gridRow: '2' }} />
          <button type='button' disabled={!canMutate || busy || loading || !practiceMode} onClick={() => { void applyPlan() }} style={{ ...paymentActionButtonStyle(!canMutate || busy || loading || !practiceMode), gridColumn: '2', gridRow: '2' }}>{positions.length ? 'Aggiorna piano' : 'Imposta piano'}</button>
          <div style={{ gridColumn: '3', gridRow: '2', fontSize: 12, color: '#64748b', lineHeight: 1.35, alignSelf: 'center' }}>0 = sola unica soluzione. Con 2 rate vengono create 3 posizioni: unica soluzione + rata 1/2 + rata 2/2.</div>
        </div>
      )}

      {loading && <InfoBox>Caricamento delle posizioni di pagamento…</InfoBox>}
      {error && <InfoBox kind='warn'>{error}</InfoBox>}
      {info && <InfoBox kind='ok'>{info}</InfoBox>}
      {!loading && positions.length === 0 && <InfoBox kind='warn'>{practiceMode === 'PAGOPA' ? 'Caricare gli avvisi pagoPA prima della trasmissione dell’Atto al protocollo.' : 'Configurare le posizioni di pagamento prima della trasmissione dell’Atto al protocollo.'}</InfoBox>}

      {positions.map(row => {
        const draft = drafts[row.objectId] || row.attributes || {}
        const mode = String(pickAttrCI(draft, ['modalita_pagamento']) || '')
        const pagoPaAuto = practiceMode === 'PAGOPA' && mode === 'PAGOPA'
        const modeEditable = !pagoPaAuto && (practiceMode === 'MISTO' || practiceMode === 'ALTRO')
        const fieldDisabled = !canMutate || busy || pagoPaAuto
        return (
          <div key={`payment-position-${row.objectId}`} style={{ border: '1px solid #dbe7f3', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '7px 10px', background: '#f5f9fd', borderBottom: '1px solid #dbe7f3', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontWeight: 900, color: '#0f4c81' }}>{giiPaymentPositionLabel(row.attributes)}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{giiPaymentModeLabel(mode || pickAttrCI(row.attributes, ['modalita_pagamento']))}</div>
            </div>
            <div style={{ padding: 10, display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 10, alignItems: 'end' }}>
                <label style={paymentFieldStyle}><span style={labelStyle}>Modalità</span><select value={mode} disabled={fieldDisabled || !modeEditable} onChange={e => setDraftField(row.objectId, 'modalita_pagamento', e.target.value)} style={{ ...inputStyleFrom(st, fieldDisabled || !modeEditable), cursor: fieldDisabled || !modeEditable ? 'not-allowed' : 'pointer' }}>{modeOptions.map(opt => <option key={opt.code || 'blank'} value={opt.code}>{opt.name}</option>)}</select></label>
                <label style={paymentFieldStyle}><span style={labelStyle}>Importo dovuto</span><input type='number' min={0} step='0.01' value={pickAttrCI(draft, ['importo_dovuto']) ?? ''} disabled={fieldDisabled} onChange={e => setDraftField(row.objectId, 'importo_dovuto', e.target.value)} style={inputStyleFrom(st, fieldDisabled)} /></label>
                <label style={paymentFieldStyle}><span style={labelStyle}>Scadenza</span><input type='date' value={dateInputValue(pickAttrCI(draft, ['scadenza']))} disabled={fieldDisabled} onChange={e => setDraftField(row.objectId, 'scadenza', fromDateInputValue(e.target.value))} style={inputStyleFrom(st, fieldDisabled)} /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 10, alignItems: 'end' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(145px, 0.65fr) minmax(200px, 1.35fr)', gap: 10, alignItems: 'end' }}>
                  <label style={paymentFieldStyle}><span style={labelStyle}>Tipo riferimento</span><select value={String(pickAttrCI(draft, ['tipo_riferimento']) || '')} disabled={fieldDisabled} onChange={e => setDraftField(row.objectId, 'tipo_riferimento', e.target.value)} style={inputStyleFrom(st, fieldDisabled)}>{refOptions.map(opt => <option key={opt.code || 'blank'} value={opt.code}>{opt.name}</option>)}</select></label>
                  <label style={paymentFieldStyle}><span style={labelStyle}>Riferimento</span><input type='text' value={String(pickAttrCI(draft, ['riferimento_pagamento']) || '')} disabled={fieldDisabled} onChange={e => setDraftField(row.objectId, 'riferimento_pagamento', e.target.value)} style={inputStyleFrom(st, fieldDisabled)} /></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(145px, 0.65fr) minmax(200px, 1.35fr)', gap: 10, alignItems: 'end' }}>
                  <label style={paymentFieldStyle}><span style={labelStyle}>Tipo riferimento 2</span><select value={String(pickAttrCI(draft, ['tipo_riferimento_secondario']) || '')} disabled={fieldDisabled} onChange={e => setDraftField(row.objectId, 'tipo_riferimento_secondario', e.target.value)} style={inputStyleFrom(st, fieldDisabled)}>{refOptions.map(opt => <option key={opt.code || 'blank'} value={opt.code}>{opt.name}</option>)}</select></label>
                  <label style={paymentFieldStyle}><span style={labelStyle}>Riferimento 2</span><input type='text' value={String(pickAttrCI(draft, ['riferimento_secondario']) || '')} disabled={fieldDisabled} onChange={e => setDraftField(row.objectId, 'riferimento_secondario', e.target.value)} style={inputStyleFrom(st, fieldDisabled)} /></label>
                </div>
              </div>

              {!pagoPaAuto && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button type='button' disabled={!canMutate || busy} onClick={() => { void savePosition(row) }} style={paymentActionButtonStyle(!canMutate || busy)}>Aggiorna</button>
                  {(mode === 'PAGOPA' || mode === 'BOLLETTINO') && (
                    <label style={{ ...paymentActionButtonStyle(!canMutate || busy), margin: 0, cursor: !canMutate || busy ? 'not-allowed' : 'pointer' }}>
                      {mode === 'PAGOPA' ? 'Carica avviso pagoPA' : 'Carica bollettino'}
                      <input key={`payment-file-${row.objectId}-${inputKey}`} type='file' accept='application/pdf,.pdf' disabled={!canMutate || busy} style={{ display: 'none' }} onChange={e => { void uploadPositionDocument(row, e.target.files?.[0] || null) }} />
                    </label>
                  )}
                </div>
              )}

              {row.attachments.map(att => (
                <div key={`payment-att-${row.objectId}-${att.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '1px solid #e5edf7', borderRadius: 7, padding: '7px 8px' }}>
                  <div style={{ minWidth: 0, fontSize: 12, color: '#475569', overflowWrap: 'anywhere' }}>{att.name || `Documento ${att.id}`}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button type='button' title='Scarica documento' aria-label='Scarica documento' disabled={busy} onClick={() => { void downloadPositionDocument(row, att) }} style={bozzaIconButtonStyle({ disabled: busy })}><BozzaActionIcon name='download' size={22} /></button>
                    <button type='button' title='Elimina documento' aria-label='Elimina documento' disabled={!canMutate || busy} onClick={() => deletePositionDocument(row, att)} style={bozzaIconButtonStyle({ danger: true, disabled: !canMutate || busy })}><BozzaActionIcon name='trash' size={22} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {!loading && positions.length > 0 && hasUnsavedPaymentChanges && <InfoBox kind='warn'>Sono presenti modifiche alle posizioni non ancora registrate. Usare Aggiorna oppure applicare il nuovo piano prima di proseguire.</InfoBox>}
      {!loading && positions.length > 0 && !hasUnsavedPaymentChanges && issues.length === 0 && <InfoBox kind='ok'>Posizioni di pagamento complete e coerenti con il totale da pagare.</InfoBox>}
      {!loading && positions.length > 0 && !hasUnsavedPaymentChanges && issues.length > 0 && (
        <InfoBox kind='warn'><strong>Dati di pagamento da completare.</strong><div style={{ marginTop: 4 }}>{issues.slice(0, 4).map((issue, idx) => <div key={`payment-issue-${idx}`}>• {issue}</div>)}</div>{issues.length > 4 && <div>• …e altri {issues.length - 4} controlli.</div>}</InfoBox>
      )}
    </div>
  )
}

function PreparazioneNotificaAttoSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  const statoAtto = attoContestazioneWorkflowState(d)
  const attoLocked = ['TRASMESSA_RIA', 'VALIDATA_RIA', TRASMESSA_FIRMA_DA_STATE].includes(statoAtto) ||
    hasAdminValue(pickAttrCI(d, ['protocollo_atto_accertamento_numero'])) ||
    hasAdminValue(pickAttrCI(d, ['protocollo_atto_accertamento_data'])) ||
    hasAdminValue(pickAttrCI(d, ['notifica_data']))
  const canEditPreparation = props.canEdit && isDeterminazioneAdottata(d) && !attoLocked
  const snapshot = getPaymentSnapshot(d, props.fields)
  const paymentModeDefined = !!getPaymentMode(d, props.fields)
  const notificaTipoDefined = hasAdminValue(pickAttrCI(d, ['notifica_tipo']))
  const attentionFieldName = canEditPreparation
    ? (!paymentModeDefined ? 'pagamento_modalita' : (!notificaTipoDefined ? 'notifica_tipo' : null))
    : null

  return (
    <Section title='Preparazione dell’Atto e della notifica'>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', gap: 10, alignItems: 'stretch' }}>
          <StatusSummaryItem label='Totale da pagare' value={formatEuroText(snapshot.total)} tone='total' />
          <StatusSummaryItem label='Modalità di notifica prevista' value={displayAdminFieldValue(d, props.fields, 'notifica_tipo', 'Da definire')} tone={hasAdminValue(pickAttrCI(d, ['notifica_tipo'])) ? 'auto' : 'warn'} />
        </div>

        <div>
          <div style={{ fontWeight: 900, color: '#0f4c81', marginBottom: 8 }}>Dati da definire prima della bozza</div>
          <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', gap: 12, alignItems: 'start' }}>
            <AdminFieldsGrid
              group='pagamento'
              draft={d}
              fields={props.fields}
              canEdit={canEditPreparation}
              onChange={props.onChange}
              fieldNames={['pagamento_modalita']}
              attentionFieldName={attentionFieldName}
            />
            <SpeseNotificaEditor data={d} fields={props.fields} canEdit={canEditPreparation} onChange={props.onChange} />
          </div>
        </div>

        <AdminFieldsGrid
          group='notifica'
          draft={d}
          fields={props.fields}
          canEdit={canEditPreparation}
          onChange={props.onChange}
          fieldNames={['notifica_tipo']}
          attentionFieldName={attentionFieldName}
        />
      </div>
    </Section>
  )
}

function PagamentoGuidatoSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, canEditSpeseNotifica: boolean, showContextualInfo?: boolean, sectionInfo?: React.ReactNode, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  const snapshot = getPaymentSnapshot(d, props.fields)
  const notificationComplete = isNotificaPerfezionata(d)
  const statusMismatch = !!snapshot.status && !!snapshot.suggestedStatus && snapshot.status !== snapshot.suggestedStatus
  return (
    <Section title='Pagamento' right={<SectionInfoButton text={props.showContextualInfo && props.canEdit ? 'La modalità e le istruzioni di pagamento sono già definite nella fase Notifica e riportate nell’Atto. Questa scheda registra esclusivamente l’esecuzione del pagamento.' : null} title='Informazioni pagamento' />}>
      <div style={{ display: 'grid', gap: 12 }}>
        {!notificationComplete && <InfoBox kind='warn'>Il monitoraggio del pagamento sarà disponibile dopo il perfezionamento della notifica.</InfoBox>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, alignItems: 'stretch' }}>
          <StatusSummaryItem label='Modalità stabilita nell’Atto' value={displayAdminFieldValue(d, props.fields, 'pagamento_modalita', '—')} tone='auto' />
          <StatusSummaryItem label='Scadenza' value={displayAdminFieldValue(d, props.fields, 'pagamento_scadenza', '—')} tone='auto' />
          <StatusSummaryItem label='Totale da pagare' value={formatEuroText(snapshot.total)} tone='total' />
          <StatusSummaryItem label='Importo incassato' value={formatEuroText(snapshot.paid)} />
          <StatusSummaryItem label='Importo residuo' value={formatEuroText(snapshot.residual)} tone={snapshot.residual > 0 ? 'warn' : 'auto'} />
        </div>

        <div>
          <div style={{ fontWeight: 900, color: '#0f4c81', marginBottom: 8 }}>Monitoraggio del pagamento</div>
          <AdminFieldsGrid
            group='pagamento'
            draft={d}
            fields={props.fields}
            canEdit={props.canEdit && notificationComplete}
            onChange={props.onChange}
            fieldNames={['pagamento_stato', 'pagamento_note']}
          />
        </div>

        {notificationComplete && snapshot.residual > 0 && <InfoBox kind='ok'>Notifica perfezionata. Il pagamento è in monitoraggio fino all’incasso integrale o alla scadenza del termine.</InfoBox>}
        {statusMismatch && <InfoBox kind='warn'>Lo stato registrato non è coerente con i dati disponibili. Stato coerente: <strong>{paymentStatusDisplay(snapshot.suggestedStatus, props.fields)}</strong>.</InfoBox>}
      </div>
    </Section>
  )
}

function ChiusuraIstruttoriaSummary (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, sectionInfo?: React.ReactNode, onFillClose: () => void, completionIssues: string[] }) {
  const d = props.data || {}
  const definitivo = isVerbaleDefinitivo(d)
  const issues = props.completionIssues || []
  const ready = issues.length === 0
  const chiusa = hasAdminValue(pickAttrCI(d, ['istruttoria_amm_chiusa_il']))
  return (
    <Section title='Completamento istruttoria amministrativa'>
      <div style={{ display: 'grid', gridTemplateColumns: ADMIN_COMPACT_GRID_COLUMNS, justifyContent: 'start', gap: 10 }}>
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
        {issues.length === 0 && <InfoBox kind='ok'>Dati amministrativi completi. La chiusura può essere compilata; le trasmissioni dell’iter restano gestite dal comando “Gestisci istruttoria”.</InfoBox>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button type='button' disabled={!props.canEdit || !ready || chiusa} onClick={props.onFillClose} style={secondaryButtonStyle(!props.canEdit || !ready || chiusa)}>Chiudi istruttoria amministrativa</button>
        </div>
      </div>
    </Section>
  )
}

function RicorsoPostNotificaSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, sectionInfo?: React.ReactNode, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  const infoButton = (_title: string): React.ReactNode => null
  return (
    <>
      <Section title='Post-notifica' right={infoButton('Informazioni post-notifica')}>
        <AdminFieldsGrid group='post_notifica' draft={d} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
      </Section>
      <Section title='Ricorso / riesame post-notifica' right={infoButton('Informazioni ricorso')}>
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

function EsitoCdaSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, sectionInfo?: React.ReactNode, onChange: (name: string, value: any) => void }) {
  const d = props.data || {}
  return (
    <Section title='Esito CdA'>
      <InfoBox>
        Registrare l&apos;esito del CdA e gli estremi dell&apos;atto comunicato al Responsabile dell’istruttoria amministrativa. Se l&apos;esito richiede una nuova lavorazione, la riapertura va gestita nella scheda Riapertura.
      </InfoBox>
      <div style={{ marginTop: 12 }}>
        <AdminFieldsGrid group='cda' draft={d} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} />
      </div>
    </Section>
  )
}

function RiaperturaAmmSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, showContextualInfo?: boolean, sectionInfo?: React.ReactNode, onChange: (name: string, value: any) => void, role: string }) {
  const d = props.data || {}
  const role = String(props.role || '').toUpperCase()
  const canCompile = props.canEdit && (role === 'RIA' || role === 'ADMIN')
  return (
    <Section title='Riapertura amministrativa' right={<SectionInfoButton text={props.showContextualInfo ? RIAPERTURA_INFO : null} title='Informazioni riapertura' />}>
      <div style={{ marginTop: 12 }}>
        <AdminFieldsGrid group='riapertura' draft={d} fields={props.fields} canEdit={canCompile} onChange={props.onChange} />
      </div>
    </Section>
  )
}

function DefinizionePraticaSection (props: { data: Record<string, any>, fields: LayerFieldInfo[], canEdit: boolean, sectionInfo?: React.ReactNode, onChange: (name: string, value: any) => void }) {
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
    const isRcp = /^RCP0*\d{1,2}$/i.test(rawCode)
    const articleNumber = isRcp ? '' : normalizeArticleNumber(rawCode || article.numero_articolo)
    if (rawCode) artByCode.set(rawCode, article)
    if (articleNumber) {
      artByCode.set(articleNumber, article)
      artByCode.set(`ART${articleNumber}`, article)
    }
  })
  const selectedRaccordi = raccordi.filter(r => wanted.has(r.codice_casistica))
  const pieListaCount = selectedRaccordi.filter(r => isPieListaParametro(paramByCode.get(r.codice_parametro) || null)).length
  const art30EquipmentSelections = parseArt30EquipmentSelections(data || {})
  const art30Equipment = new Set(art30EquipmentSelections.map(item => item.kind))
  const art30CauzioneImporto = Math.max(0, parseNumberInput(pickAttrCI(data || {}, ['attrezzature_cauzione_decurtata'])) || 0)
  const art30NoteSummary = notaSpeseSummaryForCase(noteRows, 'C104_DANNEGGIAMENTO_PERDITA_ATTREZZATURE', data || {})
  const hasArt30RealRaRows = (art30NoteSummary?.risarcimentoAttrezzature || 0) > 0
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
    // devono provenire sempre dallo snapshot tecnico congelato dall'IT, anche quando
    // ATT-001...ATT-004 esistono nella tabella dei parametri correnti.
    const suppressArt30SnapshotVoce = !!raccordoArt30Kind && hasArt30RealRaRows
    if (raccordoArt30Kind && !hasArt30RealRaRows) {
      const matches = art30EquipmentSelections.filter(item => item.kind === raccordoArt30Kind)
      if (matches.length === 0) return
      const totalImporto = matches.reduce((sum, item) => sum + (Number(item.importo) || 0), 0)
      parametro = {
        codice_parametro: matches[0].codice || r.codice_parametro,
        categoria_parametro: 'ATTREZZATURA',
        valore_num: totalImporto,
        valore_testo: '',
        anno_riferimento: null,
        data_validita_da: null,
        data_validita_a: null,
        descrizione: matches[0].descrizione || ART30_EQUIPMENT_META[raccordoArt30Kind].label,
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

    // Il gruppo deve comunque esistere per mostrare l'Art. 30; si sopprime solo
    // la vecchia voce economica ricostruita dallo snapshot quando sono presenti
    // righe RA reali nella Nota spese.
    if (suppressArt30SnapshotVoce) return

    if (isArt30CaseCode(r.codice_casistica)) {
      const categoria = String(parametro?.categoria_parametro || '').toUpperCase()
      if (isPieListaParametro(parametro) && art30NoteSummary && roundMoneyValue(art30NoteSummary.baseSpese + art30NoteSummary.speseGenerali) <= 0) return
      if (categoria === 'ATTREZZATURA' || categoria === 'RIMBORSO') {
        const kind = art30EquipmentKindFromText(`${r.codice_parametro} ${r.descrizione} ${parametro?.descrizione || ''}`)
        if (!kind || !art30Equipment.has(kind)) return
      }
      if (categoria === 'CAUZIONE' && (hasArt30RealRaRows || !art30CauzioneSelected(data || {}))) return
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
      const art30EquipmentMatches = art30Kind ? art30EquipmentSelections.filter(item => item.kind === art30Kind) : []
      const art30EquipmentValue = art30EquipmentMatches.length > 0 ? art30EquipmentMatches.reduce((sum, item) => sum + (Number(item.importo) || 0), 0) : null
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
  if (art30Group) {
    const exactSummary = notaSpeseSummaryForCase(noteRows, art30Group.codiceCasistica, data || {})
    const eligibleNotaSpeseGroups = Array.from(groups.values()).filter(group => ['8', '27', '30', '39'].includes(normalizeArticleNumber(group.articoloViolato)))
    const overallFallback = eligibleNotaSpeseGroups.length === 1 && normalizeArticleNumber(eligibleNotaSpeseGroups[0].articoloViolato) === '30'
      ? normalizeNotaSpeseAmount(numericAttr(data || {}, ['ns_totale_complessivo']))
      : null

    // Righe RA reali: importo già netto (eventuale cauzione già decurtata) e
    // senza maggiorazione per spese generali. Vengono esposte esplicitamente.
    if (exactSummary && exactSummary.risarcimentoAttrezzature > 0) {
      const syntheticRa: SanzioneParametro = {
        codice_parametro: 'NOTA_SPESE.C104.RA',
        categoria_parametro: 'ATTREZZATURA',
        valore_num: null,
        valore_testo: '',
        anno_riferimento: null,
        data_validita_da: null,
        data_validita_a: null,
        descrizione: 'Risarcimento attrezzature da Nota spese',
        note: ''
      }
      art30Group.voci.push({
        codiceParametro: syntheticRa.codice_parametro,
        descrizione: syntheticRa.descrizione,
        articoloSanzione: art30Group.articoloSanzione,
        articoliSanzione: art30Group.articoliSanzione,
        parametro: syntheticRa,
        valueOverride: formatEuroText(exactSummary.risarcimentoAttrezzature)
      })
    }

    // Le altre voci di Nota spese (AT/PR/RU/SL/PF) concorrono con le spese
    // generali. Se il dettaglio non è leggibile ma l'Art. 30 è l'unica violazione
    // della pratica che può avere Nota spese, usa in sicurezza il totale salvato
    // sul rapporto come fallback, evitando che l'importo scompaia dall'istruttoria.
    const nonRaTotal = exactSummary
      ? roundMoneyValue(exactSummary.baseSpese + exactSummary.speseGenerali)
      : (overallFallback != null && Number.isFinite(overallFallback) && !hasArt30RealRaRows ? roundMoneyValue(overallFallback) : null)

    if (nonRaTotal != null && nonRaTotal > 0) {
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
          descrizione: 'Nota spese',
          note: ''
        }
        art30Group.voci.push({
          codiceParametro: syntheticParam.codice_parametro,
          descrizione: 'Nota spese',
          articoloSanzione: art30Group.articoloSanzione,
          articoliSanzione: art30Group.articoliSanzione,
          parametro: syntheticParam,
          valueOverride: formatEuroText(nonRaTotal)
        })
      }
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
    return article.titolo_articolo ? `${code} — ${article.titolo_articolo}` : code
  }
  return formatArticleFallback(fallback)
}

function articleListTitle (articles: RegolamentoArticolo[], fallback: string): string {
  const list = Array.isArray(articles) ? articles.filter(Boolean) : []
  if (!list.length) return formatArticleFallback(fallback)
  return list.map(a => articleTitleLine(a)).join('; ')
}

function violationNormTitle (group: SanzioneConsultivaGroup): string {
  return `Norma violata: ${articleListTitle(group.articoliViolati, group.articoloViolato)}`
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
  const palette = isViolata
    ? {
        background: st.normViolataCardBg || '#eff6ff',
        border: st.normViolataBorderColor || '#93c5fd',
        borderWidth: Number(st.normViolataBorderWidth ?? 1),
        header: st.normViolataHeaderBg || '#dbeafe',
        text: st.normViolataHeaderTextColor || '#0f172a',
        arrow: st.normViolataArrowColor || '#1d4ed8',
        body: st.normViolataBodyBg || '#f8fbff'
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
      <div style={{ border: `${palette.borderWidth}px solid ${palette.border}`, background: palette.background, borderRadius: 8, overflow: 'hidden' }}>
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
            gap: 6,
            padding: '8px 10px',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: Number(st.formFieldFontSize ?? 15),
            fontWeight: 800,
            lineHeight: 1.35
          }}
          aria-expanded={open}
        >
          <span aria-hidden='true' style={{ color: palette.arrow, fontSize: 11, fontWeight: 900, lineHeight: 1, width: 14, display: 'inline-flex', justifyContent: 'center', flex: '0 0 auto' }}>{open ? '▼' : '▶'}</span>
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
    <div style={{ minWidth: 0, width: '100%', maxWidth: ADMIN_COMPACT_FIELD_MAX_WIDTH }}>
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
        style={{ ...inputStyleFrom(st, readonly), background: '#ffffff' }}
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
                    <div style={{ color: st.formFieldColor || '#0f172a', fontSize: Number(st.formFieldFontSize ?? 15), fontWeight: 900, lineHeight: 1.35, padding: '1px 2px 0' }}>
                      {displayViolationTitle(normGroup)}
                    </div>
                    <NormToggleBox variant='violata' title={violationNormTitle(normGroup)}>
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
            {subtotal?.amount && (
              <div
                style={{
                  marginTop: 2,
                  padding: '8px 10px 0 34px',
                  borderTop: '1px solid #dbe4ee',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 16,
                  fontWeight: 900
                }}
              >
                <span>Totale contestato per la violazione</span>
                <span style={{ whiteSpace: 'nowrap' }}>{subtotal.amount}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
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
          <InfoBox kind='warn'>Configurazione incompleta. Contattare l’amministratore.</InfoBox>
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
            <StatusSummaryItem label='Risarcimento attrezzatura' value={formatEuroAmount(rimborsoNetto)} tone='auto' />
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

function firstTextAttr (data: any, names: string[]): string {
  for (const name of names) {
    const value = String(pickAttrCI(data || {}, [name]) || '').trim()
    if (value) return value
  }
  return ''
}

function cleanAmmOperatorLabel (value: any): string {
  let s = String(value || '').trim()
  if (!s) return ''
  s = s.replace(/^\s*(IA|RIA|DA|RIT[-_\s]?(AGR|TEC)|IT[-_\s]?(AGR|TEC))\s*[-–—:]\s*/i, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function cleanAmmInfoText (value: any): string {
  let s = String(value || '').trim()
  if (!s) return ''
  return s
}

function normalizeAmmWorkflowText (value: any): string {
  const s = cleanAmmInfoText(value)
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]*\n[ \t]*(Motivazione\s+del\s+rimando\s*:)/gi, '\n$1')
    .trim()
  return s
}

function AmmWorkflowText (props: { text: string }) {
  const text = normalizeAmmWorkflowText(props.text)
  const match = text.match(/([\s\S]*?)(Motivazione\s+del\s+rimando\s*:)([\s\S]*)$/i)
  if (!match) return <>{text || '—'}</>
  return (
    <>
      {match[1]}
      <span style={{ fontWeight: 800 }}>{match[2]}</span>
      {match[3]}
    </>
  )
}



async function buildBozzaDeterminazioneDocxBlob (data: any, fields: LayerFieldInfo[], profile: { username: string, fullName: string }): Promise<{ blob: Blob, fileName: string }> {
  const map = buildBozzaDeterminazioneMap(data, profile)
  // La filigrana BOZZA segue il ciclo amministrativo reale: resta presente
  // fino all'approvazione RIA e ricompare automaticamente dopo un rimando.
  const watermarkBozza = !isPropostaContestazioneApprovedByRia(data)
  const bytes = await buildBozzaDeterminazioneDocx(map, { watermarkBozza })
  const fileName = getBozzaDeterminazioneDocxFileName(map)
  return { blob: new Blob([bytes as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), fileName }
}


let _ammPdfJsVerificationPromise: Promise<any> | null = null

function loadAmmPdfJsForVerification (): Promise<any> {
  if (!_ammPdfJsVerificationPromise) {
    // Experience Builder: includiamo il worker nel bundle principale, come il viewer condiviso.
    _ammPdfJsVerificationPromise = Promise.all([
      // @ts-ignore - dichiarazioni legacy pdfjs non sempre risolte dal TS di ExB.
      import('pdfjs-dist/legacy/build/pdf.js'),
      // @ts-ignore - dichiarazioni legacy pdfjs non sempre risolte dal TS di ExB.
      import('pdfjs-dist/legacy/build/pdf.worker.entry.js')
    ]).then(([pdfjs]) => pdfjs)
  }
  return _ammPdfJsVerificationPromise
}

type PdfVerificationContent = {
  text: string
  protocolSearchText: string
  protocolReferences: Array<{ numero: string, data: string }>
}

function normalizePdfVerificationText (value: any): string {
  let s = String(value ?? '')
  try { s = s.normalize('NFKC') } catch {}
  return s
    .replace(/\u00ad/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const PROPOSTA_PROTOCOL_REF_RE = /(Proposta\s+di\s+contestazione(?:(?!Proposta\s+di\s+contestazione).){0,320}?\bprot\.?\s*n\.?\s*)([^\s,;]+)(\s+del\s+)([^\s,;]+)/gi

function canonicalizeApprovedDeterminationText (value: string): string {
  // La filigrana BOZZA è una protezione visiva della copia sottoposta al RIA e
  // non fa parte del contenuto amministrativo approvato. La ignoriamo quindi nel
  // confronto tra la bozza approvata e il successivo PDF pulito.
  const normalized = normalizePdfVerificationText(value).replace(/\bBOZZA\b/gi, '').replace(/\s+/g, ' ').trim()
  return normalized.replace(
    PROPOSTA_PROTOCOL_REF_RE,
    (_all, prefix, _numero, separator, _data) => `${prefix}§PROTOCOLLO_FASCICOLO§${separator}§DATA_PROTOCOLLO_FASCICOLO§`
  )
}

function extractPropostaProtocolReferences (value: string): Array<{ numero: string, data: string }> {
  const normalized = normalizePdfVerificationText(value)
  const refs: Array<{ numero: string, data: string }> = []
  const re = new RegExp(PROPOSTA_PROTOCOL_REF_RE.source, PROPOSTA_PROTOCOL_REF_RE.flags)
  let match: RegExpExecArray | null = null
  while ((match = re.exec(normalized)) != null) {
    refs.push({
      numero: String(match[2] || '').replace(/[.,;:]+$/g, '').trim(),
      data: String(match[4] || '').replace(/[.,;:]+$/g, '').trim()
    })
    if (match.index === re.lastIndex) re.lastIndex++
  }
  return refs
}

async function extractPdfVerificationContent (blob: Blob): Promise<PdfVerificationContent> {
  const pdfjs = await loadAmmPdfJsForVerification()
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data: bytes })
  const pdf = await loadingTask.promise
  const pages: string[] = []
  const protocolPages: string[] = []
  try {
    for (let pageNo = 1; pageNo <= Number(pdf?.numPages || 0); pageNo++) {
      const page = await pdf.getPage(pageNo)
      const content = await page.getTextContent()
      const parts: string[] = []
      const records: Array<{ str: string; x: number; y: number }> = []
      for (const item of (content?.items || [])) {
        const str = String((item as any)?.str || '')
        if (str) {
          parts.push(str)
          const tr = Array.isArray((item as any)?.transform) ? (item as any).transform : []
          records.push({
            str,
            x: Number(tr?.[4]) || 0,
            y: Number(tr?.[5]) || 0
          })
        }
        if ((item as any)?.hasEOL) parts.push(' ')
      }
      const raw = parts.join(' ')
      pages.push(raw)

      // Il timbro di protocollo può essere scritto verticalmente sul margine.
      // PDF.js conserva le coordinate dei frammenti ma l'ordine dell'array non è
      // necessariamente quello di lettura. Manteniamo il testo normale per i
      // confronti documentali e costruiamo, solo per la ricerca del protocollo,
      // ulteriori ordinamenti spaziali della stessa pagina.
      const byRows = [...records]
        .sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x)
        .map(r => r.str)
        .join(' ')
      const byColumns = [...records]
        .sort((a, b) => Math.abs(a.x - b.x) > 2 ? a.x - b.x : b.y - a.y)
        .map(r => r.str)
        .join(' ')
      const byColumnsReverse = [...records]
        .sort((a, b) => Math.abs(a.x - b.x) > 2 ? b.x - a.x : b.y - a.y)
        .map(r => r.str)
        .join(' ')
      const byColumnsBottomUp = [...records]
        .sort((a, b) => Math.abs(a.x - b.x) > 2 ? a.x - b.x : a.y - b.y)
        .map(r => r.str)
        .join(' ')
      const byColumnsReverseBottomUp = [...records]
        .sort((a, b) => Math.abs(a.x - b.x) > 2 ? b.x - a.x : a.y - b.y)
        .map(r => r.str)
        .join(' ')
      protocolPages.push([raw, byRows, byColumns, byColumnsReverse, byColumnsBottomUp, byColumnsReverseBottomUp].filter(Boolean).join(' '))
    }
  } finally {
    try { await loadingTask.destroy?.() } catch {}
    try { await pdf.destroy?.() } catch {}
  }
  const text = normalizePdfVerificationText(pages.join(' '))
  const protocolSearchText = normalizePdfVerificationText(protocolPages.join(' '))
  return { text, protocolSearchText, protocolReferences: extractPropostaProtocolReferences(text) }
}


const IT_MONTH_INDEX: Record<string, number> = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11
}

function parseItalianAdministrativeDate (raw: any): number | null {
  const text = normalizePdfVerificationText(raw).replace(/[.,;:]+$/g, '').trim()
  if (!text) return null
  let m = text.match(/\b(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2]) - 1
    const day = Number(m[3])
    const d = new Date(year, month, day)
    return Number.isFinite(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day ? d.getTime() : null
  }
  m = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/)
  if (m) {
    let year = Number(m[3])
    if (year < 100) year += 2000
    const d = new Date(year, Number(m[2]) - 1, Number(m[1]))
    return Number.isFinite(d.getTime()) && d.getFullYear() === year && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[1]) ? d.getTime() : null
  }
  m = text.toLowerCase().match(/\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})\b/)
  if (m) {
    const month = IT_MONTH_INDEX[m[2]]
    const year = Number(m[3])
    const d = new Date(year, month, Number(m[1]))
    return Number.isFinite(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === Number(m[1]) ? d.getTime() : null
  }
  return null
}

function uniqueAdministrativeMatches<T> (items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const k = key(item)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}

type OfficialProtocolMetadata = { numero: string, dataMs: number, dataRaw: string }

function extractOfficialProtocolCandidates (textValue: string): OfficialProtocolMetadata[] {
  const text = normalizePdfVerificationText(textValue)
  const matches: OfficialProtocolMetadata[] = []
  const datePattern = String.raw`(?:\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})|(?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})|(?:\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4})`

  // Timbro marginale restituito dal protocollo CBSM. Esempio reale:
  //   CBSM - 0 - 1 - 2026-09-09 - 0012958
  // I due valori intermedi sono codici del sistema di protocollo; gli estremi
  // utili alla pratica sono la data ISO e l'ultimo valore, cioè il numero.
  const cbsmStampPattern = /\bCBSM\s*[-–—]\s*\d+\s*[-–—]\s*\d+\s*[-–—]\s*(\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})\s*[-–—]\s*([A-Z0-9][A-Z0-9._\/-]{2,40})\b/gi
  let cbsmMatch: RegExpExecArray | null = null
  while ((cbsmMatch = cbsmStampPattern.exec(text)) != null) {
    const dataRaw = String(cbsmMatch[1] || '').trim()
    const numero = String(cbsmMatch[2] || '').replace(/[.,;:]+$/g, '').trim()
    const dataMs = parseItalianAdministrativeDate(dataRaw)
    if (numero && dataMs != null) matches.push({ numero, dataMs, dataRaw })
    if (cbsmMatch.index === cbsmStampPattern.lastIndex) cbsmStampPattern.lastIndex++
  }

  const strictPatterns = [
    new RegExp(String.raw`\bprotocollo\s*(?:generale\s*)?(?:n(?:umero)?\.?|n[°º])?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{1,40})\s*(?:del|data)\s*(${datePattern})`, 'gi'),
    new RegExp(String.raw`\bprot\.?\s*(?:n(?:umero)?\.?|n[°º])?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{1,40})\s*(?:del|data)\s*(${datePattern})`, 'gi')
  ]
  for (const re of strictPatterns) {
    let m: RegExpExecArray | null = null
    while ((m = re.exec(text)) != null) {
      const numero = String(m[1] || '').replace(/[.,;:]+$/g, '').trim()
      const dataRaw = String(m[2] || '').trim()
      const dataMs = parseItalianAdministrativeDate(dataRaw)
      if (numero && dataMs != null) matches.push({ numero, dataMs, dataRaw })
      if (m.index === re.lastIndex) re.lastIndex++
    }
  }

  // Fallback spaziale: il timbro laterale può arrivare da PDF.js come una
  // sequenza di frammenti separati. Per ogni occorrenza "Prot./Protocollo"
  // analizziamo una finestra locale e cerchiamo indipendentemente numero e data.
  const protocolHead = /\b(?:protocollo|prot\.?)(?=\s|[:#\-]|$)/gi
  let head: RegExpExecArray | null = null
  while ((head = protocolHead.exec(text)) != null) {
    const from = Math.max(0, head.index - 80)
    const to = Math.min(text.length, head.index + 420)
    const windowText = text.slice(from, to)

    const dateRe = new RegExp(datePattern, 'gi')
    const dates: Array<{ raw: string; ms: number; index: number }> = []
    let dm: RegExpExecArray | null = null
    while ((dm = dateRe.exec(windowText)) != null) {
      const raw = String(dm[0] || '').trim()
      const ms = parseItalianAdministrativeDate(raw)
      if (ms != null) dates.push({ raw, ms, index: dm.index })
      if (dm.index === dateRe.lastIndex) dateRe.lastIndex++
    }

    const numberPatterns = [
      /\b(?:n(?:umero)?\.?|n[°º])\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{1,40})/gi,
      /\b(?:protocollo|prot\.?)\s*(?:generale|interno|esterno|entrata|uscita|registrazione)?\s*[:#-]?\s*([0-9][A-Z0-9._\/-]{2,40})/gi
    ]
    const numbers: Array<{ raw: string; index: number }> = []
    for (const nr of numberPatterns) {
      let nm: RegExpExecArray | null = null
      while ((nm = nr.exec(windowText)) != null) {
        const raw = String(nm[1] || '').replace(/[.,;:]+$/g, '').trim()
        if (raw && /\d/.test(raw) && !/^\d{1,2}$/.test(raw)) numbers.push({ raw, index: nm.index })
        if (nm.index === nr.lastIndex) nr.lastIndex++
      }
    }

    for (const number of numbers) {
      if (!dates.length) continue
      const nearest = [...dates].sort((a, b) => Math.abs(a.index - number.index) - Math.abs(b.index - number.index))[0]
      if (nearest) matches.push({ numero: number.raw, dataMs: nearest.ms, dataRaw: nearest.raw })
    }
    if (head.index === protocolHead.lastIndex) protocolHead.lastIndex++
  }

  return uniqueAdministrativeMatches(matches, x => `${normalizeProtocolVerificationValue(x.numero)}|${new Date(x.dataMs).toISOString().slice(0, 10)}`)
}

function extractOfficialProtocolMetadata (textValue: string): OfficialProtocolMetadata {
  const unique = extractOfficialProtocolCandidates(textValue)
  if (unique.length === 0) throw new Error('Nel PDF non sono stati riconosciuti in modo affidabile il numero e la data di protocollo.')
  if (unique.length > 1) throw new Error('Nel PDF sono presenti più riferimenti di protocollo. Non è possibile individuare automaticamente quello ufficiale senza ambiguità.')
  return unique[0]
}

function extractConsensusOfficialProtocol (contents: PdfVerificationContent[]): OfficialProtocolMetadata {
  const validContents = (contents || []).filter(Boolean)
  if (!validContents.length) throw new Error('Nessun PDF disponibile per la lettura del protocollo.')

  const occurrences = new Map<string, { meta: OfficialProtocolMetadata; files: Set<number> }>()
  validContents.forEach((content, fileIndex) => {
    const sourceText = content.protocolSearchText || content.text
    const candidates = extractOfficialProtocolCandidates(sourceText)
    const seenInFile = new Set<string>()
    for (const candidate of candidates) {
      const key = `${normalizeProtocolVerificationValue(candidate.numero)}|${new Date(candidate.dataMs).toISOString().slice(0, 10)}`
      if (!key || seenInFile.has(key)) continue
      seenInFile.add(key)
      const current = occurrences.get(key) || { meta: candidate, files: new Set<number>() }
      current.files.add(fileIndex)
      occurrences.set(key, current)
    }
  })

  if (!occurrences.size) {
    throw new Error('Nei PDF caricati non sono stati riconosciuti in modo affidabile il numero e la data di protocollo.')
  }

  const ranked = Array.from(occurrences.values()).sort((a, b) => b.files.size - a.files.size)
  const best = ranked[0]
  const second = ranked[1]
  const required = validContents.length === 1 ? 1 : Math.max(2, Math.floor(validContents.length / 2) + 1)

  if (!best || best.files.size < required) {
    throw new Error('Gli estremi di protocollo non risultano coerenti tra gli elaborati caricati.')
  }
  if (second && second.files.size === best.files.size) {
    throw new Error('Sono stati riconosciuti più riferimenti di protocollo con la stessa affidabilità. Verificare i PDF caricati.')
  }
  return best.meta
}


type OfficialDeterminationMetadata = { numero: number, dataMs: number, anno: number }

const IT_DAY_WORDS: Record<string, number> = {
  uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
  undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17,
  diciotto: 18, diciannove: 19, venti: 20, ventuno: 21, ventidue: 22, ventitre: 23, ventitré: 23,
  ventiquattro: 24, venticinque: 25, ventisei: 26, ventisette: 27, ventotto: 28, ventinove: 29,
  trenta: 30, trentuno: 31
}

function parseItalianAdministrativeDay (raw: any): number | null {
  const text = String(raw ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/[._-]+$/g, '')
  if (/^\d{1,2}$/.test(text)) {
    const n = Number(text)
    return n >= 1 && n <= 31 ? n : null
  }
  const compact = text.replace(/[\s-]+/g, '')
  return IT_DAY_WORDS[compact] ?? null
}

function canonicalizeOfficialDeterminationComparisonText (value: string): string {
  let text = normalizePdfVerificationText(value).replace(/\bBOZZA\b/gi, '').replace(/\s+/g, ' ').trim()
  // Numero della determinazione: nella copia inviata al Direttore può essere ancora vuoto,
  // mentre nel PDF ufficiale è valorizzato. È una delle sole variazioni ammesse.
  text = text.replace(
    /(\bDETERMINAZIONE\s+DIRIGENZIALE\s+N[°º.]?\s*)(?:\d{1,9})?\s*\/\s*(\d{4})\b/i,
    (_all, prefix, year) => `${prefix}§NUMERO_DETERMINAZIONE§/${year}`
  )
  // Data di adozione: nel template è lasciata in bianco e viene compilata sul documento
  // ufficiale. Mascheriamo esclusivamente giorno e mese della formula iniziale dell'atto.
  text = text.replace(
    /(\bL[’']anno\b.{0,120}?\bil\s+giorno\s+)(?:_+|\d{1,2}|[A-Za-zÀ-ÖØ-öø-ÿ-]+)(\s+del\s+mese\s+di\s+)(?:_+|[A-Za-zÀ-ÖØ-öø-ÿ-]+)/i,
    (_all, prefix, separator) => `${prefix}§GIORNO_DETERMINAZIONE§${separator}§MESE_DETERMINAZIONE§`
  )
  return text
}

function extractOfficialDeterminationMetadata (textValue: string): OfficialDeterminationMetadata {
  const text = normalizePdfVerificationText(textValue)
  const headerMatches: Array<{ numero: number, anno: number, index: number, end: number }> = []
  const headerRe = /\bDETERMINAZIONE\s+DIRIGENZIALE\s+N[°º.]?\s*(\d{1,9})\s*\/\s*(\d{4})\b/gi
  let hm: RegExpExecArray | null = null
  while ((hm = headerRe.exec(text)) != null) {
    const numero = Number(hm[1])
    const anno = Number(hm[2])
    if (Number.isSafeInteger(numero) && numero > 0 && anno >= 2000 && anno <= 2200) {
      headerMatches.push({ numero, anno, index: hm.index, end: headerRe.lastIndex })
    }
    if (hm.index === headerRe.lastIndex) headerRe.lastIndex++
  }
  const uniqueHeaders = uniqueAdministrativeMatches(headerMatches, x => `${x.numero}|${x.anno}`)
  if (uniqueHeaders.length === 0) {
    throw new Error('Nel PDF non è stato riconosciuto l’estremo della determinazione nell’intestazione “DETERMINAZIONE DIRIGENZIALE N° …/…”.')
  }
  if (uniqueHeaders.length > 1) {
    throw new Error('Nel PDF sono presenti più intestazioni di determinazione. Non è possibile individuare automaticamente quella ufficiale senza ambiguità.')
  }

  const header = uniqueHeaders[0]
  // La data propria della determinazione è cercata soltanto nella formula iniziale
  // “L’anno … il giorno … del mese di …”, così non vengono scambiate per la data
  // dell’atto le numerose date di leggi e determinazioni richiamate nelle premesse.
  const localText = text.slice(header.index, Math.min(text.length, header.index + 1200))
  const adoption = localText.match(/\bL[’']anno\b.{0,140}?\bil\s+giorno\s+([0-9]{1,2}|[A-Za-zÀ-ÖØ-öø-ÿ-]+)\s+del\s+mese\s+di\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/i)
  if (!adoption) {
    throw new Error('Nel PDF non è stata riconosciuta la data della determinazione nella formula iniziale “L’anno … il giorno … del mese di …”.')
  }
  const day = parseItalianAdministrativeDay(adoption[1])
  const month = IT_MONTH_INDEX[String(adoption[2] || '').toLowerCase()]
  if (day == null || month == null) throw new Error('La data della determinazione presente nel PDF non è leggibile in modo affidabile.')
  const date = new Date(header.anno, month, day)
  if (date.getFullYear() !== header.anno || date.getMonth() !== month || date.getDate() !== day) {
    throw new Error('La data della determinazione presente nel PDF non è valida.')
  }
  return { numero: header.numero, dataMs: date.getTime(), anno: header.anno }
}


async function sha256BlobHex (blob: Blob): Promise<string> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return ''
  }
}

async function pdfContainsDigitalSignature (blob: Blob): Promise<boolean> {
  // Preferiamo l'API PDF.js quando disponibile; le versioni di PDF.js incluse
  // nelle diverse release di Experience Builder non espongono sempre getSignatures.
  try {
    const pdfjs = await loadAmmPdfJsForVerification()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const loadingTask = pdfjs.getDocument({ data: bytes })
    const pdf = await loadingTask.promise
    try {
      if (typeof pdf?.getSignatures === 'function') {
        const signatures = await pdf.getSignatures()
        if (Array.isArray(signatures) && signatures.length > 0) return true
      }
    } finally {
      try { await loadingTask.destroy?.() } catch {}
      try { await pdf.destroy?.() } catch {}
    }
  } catch {
    // Fallback strutturale sotto.
  }

  // Fallback compatibile con le versioni PDF.js precedenti: una firma PDF/PAdES
  // contiene una signature dictionary con ByteRange e Type/SubFilter di firma.
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const raw = new TextDecoder('latin1').decode(bytes)
    const hasByteRange = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\]/i.test(raw)
    const hasSignatureDictionary = /\/Type\s*\/Sig\b/i.test(raw) || /\/SubFilter\s*\/(?:adbe\.pkcs7\.detached|ETSI\.CAdES\.detached|ETSI\.RFC3161)\b/i.test(raw)
    return hasByteRange && hasSignatureDictionary
  } catch {
    return false
  }
}


type AttoSignatureSignerIdentity = {
  candidates: string[]
  source: 'pdfjs' | 'certificate' | 'pdf-dictionary' | 'mixed' | 'none'
}

function normalizeAttoSignerIdentityText (value: any): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b(?:DOTT|DOTTSSA|DOTT\.SSA|DR|D\.SSA|ING|ARCH|AVV|GEOM|SIG|SIGRA|SIG\.RA)\.?\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function expectedAttoSignerMatchesCandidate (candidateRaw: any, expected: AttoParticipantIdentity): boolean {
  const candidate = normalizeAttoSignerIdentityText(candidateRaw)
  const nome = normalizeAttoSignerIdentityText(expected?.nome)
  const cognome = normalizeAttoSignerIdentityText(expected?.cognome)
  if (!candidate || !nome || !cognome) return false

  const candidateTokens = new Set(candidate.split(' ').filter(Boolean))
  const expectedTokens = [...nome.split(' '), ...cognome.split(' ')].filter(Boolean)
  return expectedTokens.length > 0 && expectedTokens.every(token => candidateTokens.has(token))
}

function decodePdfLiteralSignerName (value: string): string {
  return String(value || '')
    .replace(/\\([\\()])/g, '$1')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .trim()
}

function readDerLength (bytes: Uint8Array, offset: number): { length: number, valueStart: number } | null {
  if (offset < 0 || offset >= bytes.length) return null
  const first = bytes[offset]
  if ((first & 0x80) === 0) return { length: first, valueStart: offset + 1 }
  const count = first & 0x7f
  if (count <= 0 || count > 4 || offset + count >= bytes.length) return null
  let length = 0
  for (let i = 0; i < count; i++) length = (length * 256) + bytes[offset + 1 + i]
  return { length, valueStart: offset + 1 + count }
}

function decodeDerSignerString (bytes: Uint8Array, tagOffset: number): string {
  const tag = bytes[tagOffset]
  const supported = new Set([0x0c, 0x13, 0x14, 0x16, 0x1e]) // UTF8, Printable, T61, IA5, BMP
  if (!supported.has(tag)) return ''
  const info = readDerLength(bytes, tagOffset + 1)
  if (!info || info.length <= 0 || info.length > 512 || info.valueStart + info.length > bytes.length) return ''
  const part = bytes.slice(info.valueStart, info.valueStart + info.length)
  try {
    if (tag === 0x1e) {
      let out = ''
      for (let i = 0; i + 1 < part.length; i += 2) out += String.fromCharCode((part[i] << 8) | part[i + 1])
      return out.replace(/[\u0000-\u001f]+/g, ' ').trim()
    }
    const encoding = tag === 0x0c ? 'utf-8' : 'latin1'
    return new TextDecoder(encoding as any).decode(part).replace(/[\u0000-\u001f]+/g, ' ').trim()
  } catch {
    return ''
  }
}

function extractDerAttributeStrings (bytes: Uint8Array, oidLastByte: number): string[] {
  // X.509 subject attributes used by qualified certificates:
  // 2.5.4.3 = commonName, 2.5.4.4 = surname, 2.5.4.42 = givenName.
  const oid = [0x06, 0x03, 0x55, 0x04, oidLastByte]
  const out: string[] = []
  for (let i = 0; i <= bytes.length - oid.length; i++) {
    let matches = true
    for (let j = 0; j < oid.length; j++) {
      if (bytes[i + j] !== oid[j]) { matches = false; break }
    }
    if (!matches) continue
    const from = i + oid.length
    const to = Math.min(bytes.length, from + 20)
    for (let k = from; k < to; k++) {
      if (![0x0c, 0x13, 0x14, 0x16, 0x1e].includes(bytes[k])) continue
      const value = decodeDerSignerString(bytes, k)
      if (value) out.push(value)
      break
    }
  }
  return out
}

function pdfSignatureObjectContext (raw: string, byteRangeIndex: number): { start: number; end: number; text: string } {
  // Nei PDF firmati reali /Contents può essere molto grande e /ByteRange può
  // trovarsi decine di KB dopo /Name e l'inizio del dictionary /Sig. Cercare in
  // una piccola finestra attorno a /ByteRange rende quindi invisibile proprio il
  // certificato che dobbiamo leggere. Ricostruiamo invece l'intero oggetto firma.
  const maxSpan = 500000
  let marker = raw.lastIndexOf('/Type /Sig', byteRangeIndex)
  if (marker < 0 || byteRangeIndex - marker > maxSpan) marker = raw.lastIndexOf('/Filter /Adobe.PPKLite', byteRangeIndex)
  if (marker < 0 || byteRangeIndex - marker > maxSpan) marker = raw.lastIndexOf('/SubFilter', byteRangeIndex)

  let start = marker >= 0 ? raw.lastIndexOf('<<', marker) : -1
  if (start < 0 || byteRangeIndex - start > maxSpan) start = Math.max(0, byteRangeIndex - maxSpan)

  const endObj = raw.indexOf('endobj', byteRangeIndex)
  const end = endObj >= 0 && endObj - start <= maxSpan
    ? endObj
    : Math.min(raw.length, byteRangeIndex + maxSpan)
  return { start, end, text: raw.slice(start, end) }
}

function hexSignatureContentsNearByteRange (raw: string, byteRangeIndex: number): Uint8Array[] {
  const sig = pdfSignatureObjectContext(raw, byteRangeIndex)
  const context = sig.text
  const matches: Uint8Array[] = []
  const re = /\/Contents\s*</g
  let m: RegExpExecArray | null = null
  while ((m = re.exec(context)) != null) {
    const absoluteHexStart = sig.start + re.lastIndex
    const absoluteHexEnd = raw.indexOf('>', absoluteHexStart)
    if (absoluteHexEnd < 0 || absoluteHexEnd > sig.end || absoluteHexEnd - absoluteHexStart > 300000) continue
    const hex = raw.slice(absoluteHexStart, absoluteHexEnd).replace(/\s+/g, '')
    if (!/^[0-9A-Fa-f]{64,}$/.test(hex)) continue
    const usable = hex.length % 2 === 0 ? hex : hex.slice(0, -1)
    const bytes = new Uint8Array(usable.length / 2)
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(usable.slice(i * 2, i * 2 + 2), 16)
    matches.push(bytes)
  }
  return matches
}

function collectPdfJsSignerCandidates (signature: any): string[] {
  const out: string[] = []
  const add = (value: any) => {
    const s = String(value ?? '').trim()
    if (s) out.push(s)
  }
  add(signature?.signerName)
  add(signature?.commonName)
  add(signature?.name)
  add(signature?.subject?.commonName)
  add(signature?.subject?.CN)
  add(signature?.certificate?.commonName)
  add(signature?.certificate?.subject?.commonName)
  add(signature?.certificate?.subject?.CN)
  const given = String(signature?.subject?.givenName ?? signature?.certificate?.subject?.givenName ?? '').trim()
  const surname = String(signature?.subject?.surname ?? signature?.certificate?.subject?.surname ?? '').trim()
  if (given && surname) out.push(`${given} ${surname}`)
  return out
}

async function extractAttoDigitalSignatureSignerIdentity (blob: Blob): Promise<AttoSignatureSignerIdentity> {
  const candidates: string[] = []
  let pdfJsFound = false
  let certificateFound = false
  let dictionaryFound = false

  // PDF.js recenti espongono direttamente signerName. Lo usiamo quando disponibile,
  // ma non dipendiamo da questa API perché Experience Builder può includere release precedenti.
  try {
    const pdfjs = await loadAmmPdfJsForVerification()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const loadingTask = pdfjs.getDocument({ data: bytes })
    const pdf = await loadingTask.promise
    try {
      if (typeof pdf?.getSignatures === 'function') {
        const signatures = await pdf.getSignatures()
        for (const signature of Array.isArray(signatures) ? signatures : []) {
          const found = collectPdfJsSignerCandidates(signature)
          if (found.length) {
            pdfJsFound = true
            candidates.push(...found)
          }
        }
      }
    } finally {
      try { await loadingTask.destroy?.() } catch {}
      try { await pdf.destroy?.() } catch {}
    }
  } catch {}

  // Fallback compatibile con PDF.js legacy: leggiamo esclusivamente i dictionary di firma
  // e il PKCS#7/CAdES contenuto in /Contents. Non cerchiamo il nome nel testo visibile del PDF.
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const raw = new TextDecoder('latin1').decode(bytes)
    const byteRangeRe = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\]/gi
    let br: RegExpExecArray | null = null
    while ((br = byteRangeRe.exec(raw)) != null) {
      const context = pdfSignatureObjectContext(raw, br.index).text
      const literalName = context.match(/\/Name\s*\(([^)]{1,512})\)/i)
      if (literalName?.[1]) {
        const decoded = decodePdfLiteralSignerName(literalName[1])
        if (decoded) { dictionaryFound = true; candidates.push(decoded) }
      }
      const hexName = context.match(/\/Name\s*<([0-9A-Fa-f]{4,1024})>/i)
      if (hexName?.[1] && hexName[1].length % 2 === 0) {
        try {
          const h = hexName[1]
          const nameBytes = new Uint8Array(h.length / 2)
          for (let i = 0; i < nameBytes.length; i++) nameBytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
          const decoded = new TextDecoder('utf-8').decode(nameBytes).replace(/\u0000/g, '').trim()
          if (decoded) { dictionaryFound = true; candidates.push(decoded) }
        } catch {}
      }

      for (const cmsBytes of hexSignatureContentsNearByteRange(raw, br.index)) {
        const commonNames = extractDerAttributeStrings(cmsBytes, 0x03)
        const surnames = extractDerAttributeStrings(cmsBytes, 0x04)
        const givenNames = extractDerAttributeStrings(cmsBytes, 0x2a)
        if (commonNames.length || surnames.length || givenNames.length) certificateFound = true
        candidates.push(...commonNames)
        for (const given of givenNames) {
          for (const surname of surnames) candidates.push(`${given} ${surname}`)
        }
      }
      if (br.index === byteRangeRe.lastIndex) byteRangeRe.lastIndex++
    }
  } catch {}

  const unique = Array.from(new Map(
    candidates
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .map(value => [normalizeAttoSignerIdentityText(value), value] as const)
      .filter(([key]) => !!key)
  ).values())

  const sources = [pdfJsFound, certificateFound, dictionaryFound].filter(Boolean).length
  return {
    candidates: unique,
    source: sources > 1 ? 'mixed' : (pdfJsFound ? 'pdfjs' : (certificateFound ? 'certificate' : (dictionaryFound ? 'pdf-dictionary' : 'none')))
  }
}

async function verifyAttoDigitalSignerIdentity (
  signedBlob: Blob,
  authorizedSigners: AttoParticipantIdentity[],
  adminBypass: boolean
): Promise<void> {
  if (adminBypass) return
  const allowed = (authorizedSigners || []).filter(hasAttoParticipantName)
  if (!allowed.length) {
    throw new Error('Nessun firmatario autorizzato risulta censito nella Rubrica dei firmatari. Il documento non è stato acquisito.')
  }

  const signer = await extractAttoDigitalSignatureSignerIdentity(signedBlob)
  if (!signer.candidates.length) {
    throw new Error('La firma digitale è presente, ma non è stato possibile leggere l’identità del firmatario dal certificato. Il documento non è stato acquisito.')
  }
  const matched = allowed.some(expected =>
    signer.candidates.some(candidate => expectedAttoSignerMatchesCandidate(candidate, expected))
  )
  if (!matched) {
    throw new Error('Il PDF risulta firmato da un soggetto non presente nella Rubrica dei firmatari autorizzati. Il documento non è stato acquisito.')
  }
}

function pdfVerificationTokens (value: string): string[] {
  return normalizePdfVerificationText(value)
    .replace(/\bBOZZA\b/gi, ' ')
    .toLowerCase()
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
}

function stripAttoBozzaWatermarkArtifacts (value: any): string {
  // Word può esporre la filigrana VML come parola intera oppure come lettere
  // separate/riordinate nel layer testuale del PDF. Queste varianti non fanno parte
  // del contenuto amministrativo approvato e non devono influenzarne l'impronta.
  return normalizePdfVerificationText(value)
    .replace(/\bBOZZA\b/gi, ' ')
    .replace(/\bB(?:[^0-9A-ZÀ-ÖØ-Þ]+)O(?:[^0-9A-ZÀ-ÖØ-Þ]+)Z(?:[^0-9A-ZÀ-ÖØ-Þ]+)Z(?:[^0-9A-ZÀ-ÖØ-Þ]+)A\b/gi, ' ')
    .replace(/\bA(?:[^0-9A-ZÀ-ÖØ-Þ]+)Z(?:[^0-9A-ZÀ-ÖØ-Þ]+)Z(?:[^0-9A-ZÀ-ÖØ-Þ]+)O(?:[^0-9A-ZÀ-ÖØ-Þ]+)B\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function attoApprovedSemanticRegion (value: any): string {
  // Il blocco MOD. INVIO e i piè di pagina sono elementi di impaginazione del
  // modello Word e possono essere restituiti da PDF.js in punti diversi tra la
  // copia con filigrana e quella pulita. La parte sottoposta all'approvazione RIA
  // viene quindi ancorata al destinatario/oggetto e termina con i saluti: include
  // integralmente riferimenti, fatti, violazioni, importi, pagamento e avvertenze.
  const normalized = stripAttoBozzaWatermarkArtifacts(value)
  const lower = normalized.toLocaleLowerCase('it-IT')
  const starts = [
    lower.indexOf('egr. sig.'),
    lower.indexOf('egr sig.'),
    lower.indexOf('spett.le'),
    lower.indexOf('spett le'),
    lower.indexOf('atto di accertamento')
  ].filter(index => index >= 0)
  const start = starts.length ? Math.min(...starts) : 0
  const endAnchor = lower.lastIndexOf('distinti saluti')
  const end = endAnchor >= start ? endAnchor + 'distinti saluti'.length : normalized.length
  return normalized.slice(start, end).trim()
}

function canonicalizeApprovedAttoText (value: any): string {
  // Confronto testuale robusto alle differenze di impaginazione/segmentazione PDF:
  // manteniamo l'ordine del contenuto amministrativo, ma eliminiamo spaziatura,
  // punteggiatura e separazioni introdotte dal motore PDF. In questo modo, ad es.,
  // "A-252" e "A - 252" oppure una parola spezzata a fine riga producono la stessa
  // impronta, mentre ogni modifica a lettere o numeri resta rilevabile.
  return attoApprovedSemanticRegion(value)
    .toLocaleLowerCase('it-IT')
    .replace(/[^0-9a-zà-öø-ÿ]+/gi, '')
}

function approvedAttoContentMatches (approvedText: string, candidateText: string): boolean {
  const approved = canonicalizeApprovedAttoText(approvedText)
  const candidate = canonicalizeApprovedAttoText(candidateText)
  if (!approved || !candidate) return false
  if (approved === candidate) return true

  // In alcuni PDF Word/PDF.js espone la filigrana VML "BOZZA" come singole lettere
  // inserite nel flusso testuale invece che come parola continua. Accettiamo quindi
  // esclusivamente il caso in cui, rimuovendo dal testo approvato un numero limitato
  // di lettere che compongono esattamente una o più occorrenze di BOZZA, si ottenga
  // il candidato pulito. Nessun'altra differenza viene tollerata.
  let ci = 0
  const extras: string[] = []
  for (let ai = 0; ai < approved.length; ai++) {
    const ch = approved[ai]
    if (ci < candidate.length && ch === candidate[ci]) {
      ci++
    } else {
      extras.push(ch)
    }
  }
  if (ci !== candidate.length || !extras.length || extras.length > 30) return false
  const counts = extras.reduce<Record<string, number>>((acc, ch) => {
    acc[ch] = (acc[ch] || 0) + 1
    return acc
  }, {})
  if (Object.keys(counts).some(ch => !['b', 'o', 'z', 'a'].includes(ch))) return false
  const k = counts.b || 0
  if (k <= 0 || k > 6) return false
  return (counts.o || 0) === k && (counts.a || 0) === k && (counts.z || 0) === k * 2 && extras.length === k * 5
}

function candidatePreservesApprovedPdfText (approvedText: string, candidateText: string): boolean {
  const approvedCanonical = normalizePdfVerificationText(approvedText).replace(/\bBOZZA\b/gi, '').replace(/\s+/g, ' ').trim()
  const candidateCanonical = normalizePdfVerificationText(candidateText).replace(/\bBOZZA\b/gi, '').replace(/\s+/g, ' ').trim()
  if (!approvedCanonical || !candidateCanonical) return false
  if (approvedCanonical === candidateCanonical) return true

  // Una firma PAdES visibile può aggiungere una piccola quantità di testo
  // (firmatario/data) senza alterare il contenuto approvato. Accettiamo quindi
  // solo testo aggiuntivo limitato, mantenendo tutti i token approvati nello stesso ordine.
  const approved = pdfVerificationTokens(approvedCanonical)
  const candidate = pdfVerificationTokens(candidateCanonical)
  if (!approved.length || candidate.length < approved.length) return false
  let approvedIndex = 0
  let extras = 0
  for (const token of candidate) {
    if (approvedIndex < approved.length && token === approved[approvedIndex]) approvedIndex++
    else extras++
  }
  if (approvedIndex !== approved.length) return false
  const maxExtras = Math.max(40, Math.ceil(approved.length * 0.12))
  return extras <= maxExtras
}

function candidateContainsSourcePdfTokens (sourceText: string, candidateText: string): boolean {
  const sourceTokens = pdfVerificationTokens(normalizePdfVerificationText(sourceText).replace(/\bBOZZA\b/gi, ' '))
  const candidateTokens = pdfVerificationTokens(normalizePdfVerificationText(candidateText).replace(/\bBOZZA\b/gi, ' '))
  if (!sourceTokens.length || candidateTokens.length < sourceTokens.length) return false
  const counts = new Map<string, number>()
  for (const token of candidateTokens) counts.set(token, (counts.get(token) || 0) + 1)
  for (const token of sourceTokens) {
    const n = counts.get(token) || 0
    if (n <= 0) return false
    if (n === 1) counts.delete(token)
    else counts.set(token, n - 1)
  }
  return true
}



function normalizeDeterminationCheckText (value: any): string {
  return normalizePdfVerificationText(value)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function pdfContainsReportReference (textValue: string, reportCode: string): boolean {
  const text = normalizeDeterminationCheckText(textValue).replace(/\s+/g, '')
  const code = normalizeDeterminationCheckText(reportCode).replace(/\s+/g, '')
  return !!code && text.includes(code)
}

function pdfContainsProtocolReference (textValue: string, protocolNumber: any, protocolDate: any): boolean {
  const number = String(protocolNumber ?? '').trim()
  const date = toDateObj(protocolDate)
  if (!number || !date) return true
  const text = normalizeDeterminationCheckText(textValue)
  const numberNorm = normalizeDeterminationCheckText(number).replace(/\s+/g, '')
  const compactText = text.replace(/\s+/g, '')
  const dateVariants = [
    date.toLocaleDateString('it-IT'),
    `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
    `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
  ].map(v => normalizeDeterminationCheckText(v).replace(/\s+/g, ''))
  return compactText.includes(numberNorm) && dateVariants.some(v => v && compactText.includes(v))
}

function pdfContainsViolationSet (textValue: string, data: any, fields: LayerFieldInfo[]): boolean {
  const expected = buildViolationRows(data || {}, fields || [])
    .map(row => normalizeArticleNumber(row?.label))
    .filter(Boolean)
  if (!expected.length) return true
  const text = normalizeDeterminationCheckText(textValue)
  // Il builder usa "violazione dell’art. 8" quando c’è un solo articolo e
  // "violazione degli artt. 8 e 12" quando gli articoli sono più di uno.
  // La vecchia regex riconosceva soltanto il secondo caso e rendeva inutilizzabile
  // il controllo strutturale proprio per le pratiche con una sola violazione.
  const matches = Array.from(text.matchAll(/violazione\s+(?:dell['’]\s*art\.?|degli\s+artt?\.?)\s*([^.;]{1,120})/gi))
  if (!matches.length) return false
  for (const match of matches) {
    const found = new Set((String(match[1] || '').match(/\b\d{1,2}\b/g) || []).map(n => String(Number(n))))
    if (expected.every(n => found.has(n))) return true
  }
  return false
}

function pdfContainsTotalAmount (textValue: string, data: any): boolean {
  const total = Math.max(0, parseNumberInput(pickAttrCI(data || {}, ['pagamento_importo_totale'])) || 0)
  if (!(total > 0)) return true
  const text = normalizeDeterminationCheckText(textValue)
  const amountIt = total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const escaped = amountIt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\./g, '[.]?')
  const re = new RegExp(`importo\\s+complessivo[^€]{0,80}€?\\s*${escaped}`, 'i')
  return re.test(text)
}

function pdfContainsCoreDeterminationDisposition (textValue: string): boolean {
  const text = normalizeDeterminationCheckText(textValue)
  const required = [
    'di prendere atto del rapporto tecnico di rilevazione',
    'di approvare la proposta di contestazione',
    'di disporre che si proceda alla contestazione'
  ]
  return required.every(anchor => text.includes(anchor))
}

function verifyOfficialDeterminationAgainstPractice (textValue: string, data: any, fields: LayerFieldInfo[], oid: number | null): void {
  const reportCode = getReportCode(data || {}, oid)
  if (reportCode && !pdfContainsReportReference(textValue, reportCode)) {
    throw new Error(`Il PDF caricato non contiene il riferimento alla pratica ${reportCode}. Il documento non è stato acquisito.`)
  }
  const protocolNumber = pickAttrCI(data || {}, ['protocollo_fascicolo_numero'])
  const protocolDate = pickAttrCI(data || {}, ['protocollo_fascicolo_data'])
  if (!pdfContainsProtocolReference(textValue, protocolNumber, protocolDate)) {
    throw new Error('Il PDF caricato non contiene gli estremi della Proposta protocollata registrati nella pratica. Il documento non è stato acquisito.')
  }
  if (!pdfContainsViolationSet(textValue, data, fields)) {
    throw new Error('Nel PDF non è stato riconosciuto lo stesso insieme di articoli contestati presente nella pratica. Il documento non è stato acquisito.')
  }
  if (!pdfContainsTotalAmount(textValue, data)) {
    throw new Error('Nel PDF non è stato riconosciuto l’importo complessivo registrato nella pratica. Il documento non è stato acquisito.')
  }
  if (!pdfContainsCoreDeterminationDisposition(textValue)) {
    throw new Error('Nel PDF non è stato riconosciuto il dispositivo essenziale della determinazione approvata. Il documento non è stato acquisito.')
  }
}

function verifyDefinitiveDeterminationAgainstPractice (
  candidate: PdfVerificationContent,
  data: any,
  fields: LayerFieldInfo[],
  oid: number | null,
  protocolNumber: any,
  protocolDate: any
): void {
  if (!candidate?.text) {
    throw new Error('Non è stato possibile estrarre il testo necessario per verificare il PDF della determinazione.')
  }
  if (/\bBOZZA\b/i.test(candidate.text)) {
    throw new Error('Il PDF contiene ancora la filigrana BOZZA.')
  }

  const expectedNumber = normalizeProtocolVerificationValue(protocolNumber)
  const expectedDate = normalizeProtocolVerificationValue(protocolDateForVerification(protocolDate))
  if (!expectedNumber || !expectedDate) {
    throw new Error('Numero e data del protocollo fascicolo devono essere salvati prima della verifica del PDF della determinazione.')
  }

  // Nel documento definitivo il riferimento della Proposta è presente due volte
  // (premesse e dispositivo). Verifichiamo tutte le occorrenze individuate, così
  // un eventuale riferimento discordante non può passare inosservato.
  if (candidate.protocolReferences.length === 0) {
    throw new Error('Nel PDF della determinazione non è stato individuato il riferimento al protocollo della Proposta di contestazione.')
  }
  const invalidReference = candidate.protocolReferences.find(ref =>
    normalizeProtocolVerificationValue(ref.numero) !== expectedNumber ||
    normalizeProtocolVerificationValue(ref.data) !== expectedDate
  )
  if (invalidReference) {
    throw new Error(
      `Il PDF della determinazione non riporta correttamente il protocollo fascicolo. Atteso: n. ${String(protocolNumber || '').trim()} del ${protocolDateForVerification(protocolDate)}.`
    )
  }

  // Il riferimento hash della vecchia bozza resta il controllo preferenziale.
  // Quando però il PDF definitivo deriva dal Word rigenerato dopo il protocollo,
  // la diversa impaginazione/conversione può cambiare l'ordine del testo estratto
  // da PDF.js pur lasciando invariato il contenuto amministrativo. In quel caso
  // usiamo i riferimenti sostanziali e il dispositivo generati dalla stessa pratica.
  verifyOfficialDeterminationAgainstPractice(candidate.text, data, fields, oid)
}


async function verifySignedAttoAgainstUnsigned (unsignedBlob: Blob, signedFile: File, authorizedSigners: AttoParticipantIdentity[], adminBypass: boolean): Promise<void> {
  const [unsignedContent, signedContent, unsignedHash, signedHash, signaturePresent] = await Promise.all([
    extractPdfVerificationContent(unsignedBlob),
    extractPdfVerificationContent(signedFile),
    sha256BlobHex(unsignedBlob),
    sha256BlobHex(signedFile),
    pdfContainsDigitalSignature(signedFile)
  ])
  if (!unsignedContent.text || !signedContent.text) {
    throw new Error('Non è stato possibile verificare il contenuto dell’Atto firmato.')
  }
  if (/\bBOZZA\b/i.test(signedContent.text)) {
    throw new Error('Il PDF firmato contiene ancora la dicitura BOZZA. Caricare il documento definitivo firmato dal Direttore.')
  }
  if (!approvedAttoContentMatches(unsignedContent.text, signedContent.text) && !candidatePreservesApprovedPdfText(unsignedContent.text, signedContent.text)) {
    throw new Error('Il PDF firmato contiene differenze rispetto all’Atto approvato e inviato al Direttore. Il file non è stato caricato.')
  }
  if (unsignedHash && signedHash && unsignedHash === signedHash) {
    throw new Error('Il file caricato coincide con il PDF inviato al Direttore e non risulta firmato. Caricare il documento restituito con firma digitale.')
  }
  if (!signaturePresent) {
    throw new Error('Nel PDF non è stata rilevata una firma digitale. Caricare il documento firmato digitalmente dal Direttore.')
  }
  await verifyAttoDigitalSignerIdentity(signedFile, authorizedSigners, adminBypass)
}

async function sha256Hex (value: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(String(value || ''))
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return ''
  }
}

function normalizeProtocolVerificationValue (value: any): string {
  return normalizePdfVerificationText(value).replace(/\s+/g, '').replace(/[.,;:]+$/g, '').toLowerCase()
}

function protocolDateForVerification (value: any): string {
  const d = toDateObj(value)
  return d ? d.toLocaleDateString('it-IT') : String(value ?? '').trim()
}

function firstPdfTextDifference (approvedCanonical: string, candidateCanonical: string): string {
  const a = normalizePdfVerificationText(approvedCanonical)
  const b = normalizePdfVerificationText(candidateCanonical)
  const max = Math.min(a.length, b.length)
  let at = 0
  while (at < max && a.charCodeAt(at) === b.charCodeAt(at)) at++
  const start = Math.max(0, at - 70)
  const endA = Math.min(a.length, at + 120)
  const endB = Math.min(b.length, at + 120)
  const approvedExcerpt = a.slice(start, endA)
  const candidateExcerpt = b.slice(start, endB)
  return `Versione approvata: “…${approvedExcerpt}…”\nPDF caricato: “…${candidateExcerpt}…”`
}


type ApprovedBozzaReferencePayload = {
  version: 1
  oid: number
  canonicalTextSha256: string
  capturedAt: number
}


type ApprovedAttoReferencePayload = {
  version: 1
  oid: number
  documentKind: 'ATTO_CONTESTAZIONE'
  canonicalTextSha256: string
  capturedAt: number
}

function isAttoApprovedReferenceAttachment (item: AmmAttachmentInfo | null | undefined): boolean {
  if (!item || !isGiiApprovedBozzaReferenceAttachment(item as any)) return false
  const kind = giiAttachmentKeywordValue(item as any, 'documentKind').trim().toUpperCase()
  const name = String(item?.name || '').trim().toLowerCase()
  return kind === 'ATTO_CONTESTAZIONE' || /^gii_riferimento_atto_ria_\d+\.json$/i.test(name)
}

function approvedAttoReferenceKeywords (capturedAt = Date.now()): string {
  return `${GII_ATTACHMENT_KEYWORDS.approvedBozzaReference}|documentKind=ATTO_CONTESTAZIONE|capturedAt=${capturedAt}`
}

async function buildApprovedAttoReferencePayload (blob: Blob, oid: number): Promise<ApprovedAttoReferencePayload> {
  const extracted = await extractPdfVerificationContent(blob)
  if (!extracted.text) throw new Error('Non è stato possibile acquisire il riferimento del PDF dell’Atto trasmesso.')
  const canonical = canonicalizeApprovedAttoText(extracted.text)
  const canonicalTextSha256 = await sha256Hex(canonical)
  if (!canonical || !canonicalTextSha256) throw new Error('Non è stato possibile acquisire il riferimento del PDF dell’Atto trasmesso.')
  return {
    version: 1,
    oid: Number(oid),
    documentKind: 'ATTO_CONTESTAZIONE',
    canonicalTextSha256,
    capturedAt: Date.now()
  }
}

async function replaceApprovedAttoReferenceAttachment (
  layer: any,
  oid: number,
  layerUrl: string,
  approvedPdfBlob: Blob
): Promise<ApprovedAttoReferencePayload> {
  const payload = await buildApprovedAttoReferencePayload(approvedPdfBlob, oid)
  const before = await queryAmmAttachments(layer, oid, layerUrl)
  const oldRefs = before.filter(att => isAttoApprovedReferenceAttachment(att as AmmAttachmentInfo))
  const file = new File(
    [JSON.stringify(payload)],
    `gii_riferimento_atto_ria_${Number(oid)}.json`,
    { type: 'application/json', lastModified: payload.capturedAt }
  )
  const ids = await addAmmAttachments(layer, oid, [file], layerUrl, approvedAttoReferenceKeywords(payload.capturedAt))
  const keepId = Number(ids?.[0])
  if (!Number.isFinite(keepId) || keepId <= 0) throw new Error('Non è stato possibile completare la trasmissione dell’Atto.')
  for (const att of oldRefs) {
    const id = Number(att.id)
    if (Number.isFinite(id) && id > 0 && id !== keepId) {
      try { await deleteAmmAttachment(layer, oid, id, layerUrl) } catch {}
    }
  }
  return payload
}

async function loadApprovedAttoReferencePayload (
  layer: any,
  oid: number,
  layerUrl: string
): Promise<ApprovedAttoReferencePayload | null> {
  const all = await queryAmmAttachments(layer, oid, layerUrl)
  const refs = all.filter(att => isAttoApprovedReferenceAttachment(att as AmmAttachmentInfo))
    .sort((a: any, b: any) => Number(b?.id || 0) - Number(a?.id || 0))
  for (const ref of refs) {
    try {
      const blob = await fetchAmmAttachmentBlobForPdf(ref as AmmAttachmentInfo, oid, layerUrl)
      const parsed: any = JSON.parse(await blob.text())
      const hash = String(parsed?.canonicalTextSha256 || '').trim().toLowerCase()
      if (String(parsed?.documentKind || '').trim().toUpperCase() !== 'ATTO_CONTESTAZIONE') continue
      if (!/^[a-f0-9]{64}$/.test(hash)) continue
      return {
        version: 1,
        oid: Number(parsed?.oid || oid),
        documentKind: 'ATTO_CONTESTAZIONE',
        canonicalTextSha256: hash,
        capturedAt: Number(parsed?.capturedAt || 0)
      }
    } catch {}
  }
  return null
}

async function verifyAttoAgainstApprovedReference (
  approvedReference: ApprovedAttoReferencePayload,
  candidateFile: File
): Promise<void> {
  const candidate = await extractPdfVerificationContent(candidateFile)
  if (!candidate.text) throw new Error('Non è stato possibile verificare il contenuto del PDF dell’Atto.')
  if (/\bBOZZA\b/i.test(candidate.text)) throw new Error('Il PDF contiene ancora la filigrana BOZZA.')
  const canonical = canonicalizeApprovedAttoText(candidate.text)
  const hash = await sha256Hex(canonical)
  if (!hash || hash.toLowerCase() !== String(approvedReference.canonicalTextSha256 || '').toLowerCase()) {
    throw new Error('Il PDF caricato contiene differenze rispetto all’Atto approvato dal Responsabile dell’istruttoria amministrativa. Il file non è stato acquisito.')
  }
}

function approvedBozzaReferenceKeywords (capturedAt = Date.now()): string {
  return `${GII_ATTACHMENT_KEYWORDS.approvedBozzaReference}|capturedAt=${capturedAt}`
}

async function buildApprovedBozzaReferencePayload (blob: Blob, oid: number): Promise<ApprovedBozzaReferencePayload> {
  const extracted = await extractPdfVerificationContent(blob)
  if (!extracted.text) throw new Error('Non è stato possibile verificare il PDF trasmesso.')
  const canonical = canonicalizeApprovedDeterminationText(extracted.text)
  const canonicalTextSha256 = await sha256Hex(canonical)
  if (!canonicalTextSha256) throw new Error('Non è stato possibile verificare il PDF trasmesso.')
  return {
    version: 1,
    oid: Number(oid),
    canonicalTextSha256,
    capturedAt: Date.now()
  }
}

async function replaceApprovedBozzaReferenceAttachment (
  layer: any,
  oid: number,
  layerUrl: string,
  approvedPdfBlob: Blob
): Promise<ApprovedBozzaReferencePayload> {
  const payload = await buildApprovedBozzaReferencePayload(approvedPdfBlob, oid)
  const before = await queryAmmAttachments(layer, oid, layerUrl)
  const oldRefs = before.filter(att => isGiiApprovedBozzaReferenceAttachment(att as any) && !isAttoApprovedReferenceAttachment(att as AmmAttachmentInfo))
  const file = new File(
    [JSON.stringify(payload)],
    `gii_riferimento_bozza_ria_${Number(oid)}.json`,
    { type: 'application/json', lastModified: payload.capturedAt }
  )
  const ids = await addAmmAttachments(layer, oid, [file], layerUrl, approvedBozzaReferenceKeywords(payload.capturedAt))
  const keepId = Number(ids?.[0])
  if (!Number.isFinite(keepId) || keepId <= 0) {
    throw new Error('Non è stato possibile completare la trasmissione.')
  }

  // Rimuove soltanto riferimenti interni precedenti. I documenti del fascicolo
  // non vengono mai toccati da questa operazione.
  for (const att of oldRefs) {
    const id = Number(att.id)
    if (Number.isFinite(id) && id > 0 && id !== keepId) {
      try { await deleteAmmAttachment(layer, oid, id, layerUrl) } catch {}
    }
  }
  return payload
}

async function loadApprovedBozzaReferencePayload (
  layer: any,
  oid: number,
  layerUrl: string
): Promise<ApprovedBozzaReferencePayload | null> {
  const all = await queryAmmAttachments(layer, oid, layerUrl)
  const refs = all.filter(att => isGiiApprovedBozzaReferenceAttachment(att as any) && !isAttoApprovedReferenceAttachment(att as AmmAttachmentInfo))
  const latest = pickLatestGiiAttachment(refs as any[]) as AmmAttachmentInfo | null
  if (!latest) return null
  try {
    const blob = await fetchAmmAttachmentBlobForPdf(latest, oid, layerUrl)
    const raw = await blob.text()
    const parsed: any = JSON.parse(raw)
    const hash = String(parsed?.canonicalTextSha256 || '').trim().toLowerCase()
    if (!/^[a-f0-9]{64}$/.test(hash)) return null
    return {
      version: 1,
      oid: Number(parsed?.oid || oid),
      canonicalTextSha256: hash,
      capturedAt: Number(parsed?.capturedAt || 0)
    }
  } catch {
    return null
  }
}

async function verifyFinalPdfAgainstApprovedReference (
  approvedReference: ApprovedBozzaReferencePayload,
  candidateFile: File,
  protocolNumber: any,
  protocolDate: any
): Promise<{ approvedTextSha256: string }> {
  const candidate = await extractPdfVerificationContent(candidateFile)
  if (!candidate.text) {
    throw new Error('Non è stato possibile estrarre il testo necessario per verificare il PDF della determinazione.')
  }
  if (/\bBOZZA\b/i.test(candidate.text)) {
    throw new Error('Il PDF contiene ancora la filigrana BOZZA.')
  }

  const expectedNumber = normalizeProtocolVerificationValue(protocolNumber)
  const expectedDate = normalizeProtocolVerificationValue(protocolDateForVerification(protocolDate))
  if (!expectedNumber || !expectedDate) {
    throw new Error('Numero e data del protocollo fascicolo devono essere salvati prima della verifica del PDF della determinazione.')
  }

  if (candidate.protocolReferences.length === 0) {
    throw new Error('Nel PDF della determinazione non è stato individuato il riferimento al protocollo della Proposta di contestazione.')
  }

  const invalidReference = candidate.protocolReferences.find(ref =>
    normalizeProtocolVerificationValue(ref.numero) !== expectedNumber ||
    normalizeProtocolVerificationValue(ref.data) !== expectedDate
  )
  if (invalidReference) {
    throw new Error(
      `Il PDF della determinazione non riporta correttamente il protocollo fascicolo. Atteso: n. ${String(protocolNumber || '').trim()} del ${protocolDateForVerification(protocolDate)}.`
    )
  }

  const candidateCanonical = canonicalizeApprovedDeterminationText(candidate.text)
  const candidateHash = await sha256Hex(candidateCanonical)
  const approvedHash = String(approvedReference?.canonicalTextSha256 || '').trim().toLowerCase()

  if (!candidateHash || candidateHash.toLowerCase() !== approvedHash) {
    throw new Error(
      'Il PDF della determinazione contiene differenze rispetto alla versione approvata dal Responsabile dell’istruttoria amministrativa diverse dal numero e dalla data di protocollo. Il file non è stato caricato. Per modificare il contenuto approvato utilizzare Rimanda e predisporre una nuova bozza da sottoporre a verifica.'
    )
  }

  return { approvedTextSha256: approvedHash }
}

async function verifyFinalPdfAgainstApproved (
  approvedBlob: Blob,
  candidateFile: File,
  protocolNumber: any,
  protocolDate: any
): Promise<{ approvedTextSha256: string }> {
  const [approved, candidate] = await Promise.all([
    extractPdfVerificationContent(approvedBlob),
    extractPdfVerificationContent(candidateFile)
  ])

  if (!approved.text || !candidate.text) {
    throw new Error('Non è stato possibile estrarre il testo necessario per verificare i due PDF.')
  }
  if (/\bBOZZA\b/i.test(candidate.text)) {
    throw new Error('Il PDF contiene ancora la filigrana BOZZA.')
  }

  const expectedNumber = normalizeProtocolVerificationValue(protocolNumber)
  const expectedDate = normalizeProtocolVerificationValue(protocolDateForVerification(protocolDate))
  if (!expectedNumber || !expectedDate) {
    throw new Error('Numero e data del protocollo fascicolo devono essere salvati prima della verifica del PDF della determinazione.')
  }

  if (candidate.protocolReferences.length === 0) {
    throw new Error('Nel PDF della determinazione non è stato individuato il riferimento al protocollo della Proposta di contestazione.')
  }

  const invalidReference = candidate.protocolReferences.find(ref =>
    normalizeProtocolVerificationValue(ref.numero) !== expectedNumber ||
    normalizeProtocolVerificationValue(ref.data) !== expectedDate
  )
  if (invalidReference) {
    throw new Error(
      `Il PDF della determinazione non riporta correttamente il protocollo fascicolo. Atteso: n. ${String(protocolNumber || '').trim()} del ${protocolDateForVerification(protocolDate)}.`
    )
  }

  const approvedCanonical = canonicalizeApprovedDeterminationText(approved.text)
  const candidateCanonical = canonicalizeApprovedDeterminationText(candidate.text)

  if (approvedCanonical !== candidateCanonical) {
    throw new Error(
      'Il PDF della determinazione contiene differenze rispetto alla versione approvata dal Responsabile dell’istruttoria amministrativa diverse dal numero e dalla data di protocollo. Il file non è stato caricato. Per modificare il contenuto approvato utilizzare Rimanda e predisporre una nuova bozza da sottoporre a verifica.\n' +
      firstPdfTextDifference(approvedCanonical, candidateCanonical)
    )
  }

  return { approvedTextSha256: await sha256Hex(approvedCanonical) }
}

async function fetchAmmAttachmentBlobForPdf (att: AmmAttachmentInfo, oid: number, layerUrl: string): Promise<Blob> {
  const raw = attachmentRawUrl(att, oid, layerUrl)
  if (!raw) throw new Error('URL allegato non disponibile.')
  const token = await getEsriTokenForUrl(layerUrl || raw)
  let url = raw
  if (token && /^https?:/i.test(url) && !/[?&]token=/.test(url)) {
    url = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  }
  const resp = await fetch(url, { credentials: 'same-origin' })
  if (!resp.ok) throw new Error(`Caricamento allegato fallito (HTTP ${resp.status}).`)
  return await resp.blob()
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


type EmailDraftAttachment = { blob: Blob; fileName: string; contentType?: string }

type ProtocolloFascicoloManifestItem = {
  index: number
  fileName: string
  docKey: string
  sourceAttachmentId?: number
  sourceAttachmentKind?: 'technical' | 'administrative'
  sourceStore?: 'practice' | 'payment'
  sourceParentOid?: number
  sourceAttachmentName?: string
  sourceAttachmentKeywords?: string
}

type ProtocolloFascicoloManifest = {
  version: 1
  oid: number
  reportCode: string
  createdAt: number
  items: ProtocolloFascicoloManifestItem[]
}

type ProtocolloFascicoloEmailAttachment = EmailDraftAttachment & ProtocolloFascicoloManifestItem


function sanitizeEmailHeaderText (value: any): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim()
}

function sanitizeEmailFileName (value: any, fallback = 'allegato'): string {
  const raw = sanitizeEmailHeaderText(value) || fallback
  return raw.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() || fallback
}

function splitBase64Lines (value: string): string {
  return String(value || '').replace(/(.{1,76})/g, '$1\r\n').trimEnd()
}

function utf8Base64 (value: string): string {
  const bytes = new TextEncoder().encode(String(value ?? ''))
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function blobBase64 (blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function encodeMimeHeader (value: any): string {
  const clean = sanitizeEmailHeaderText(value)
  if (!clean) return ''
  return /^[ -~]*$/.test(clean) ? clean : `=?UTF-8?B?${utf8Base64(clean)}?=`
}

async function downloadEmailDraftWithAttachments (opts: { from: string, to: string, cc?: string[], subject: string, body: string, attachments: EmailDraftAttachment[], fileName: string }): Promise<void> {
  const from = sanitizeEmailHeaderText(opts.from)
  const to = sanitizeEmailHeaderText(opts.to)
  const subject = sanitizeEmailHeaderText(opts.subject)
  if (!isValidAmmEmailAddress(from)) throw new Error('Indirizzo e-mail del mittente non valido.')
  const boundary = `gii_${Date.now()}_${Math.random().toString(16).slice(2)}`
  const cc = Array.from(new Set((opts.cc || []).map(v => sanitizeEmailHeaderText(v)).filter(Boolean)))
  const lines: string[] = [
    `From: ${from}`,
    `To: ${to}`,
    ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []),
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    splitBase64Lines(utf8Base64(String(opts.body || '')))
  ]
  for (const att of opts.attachments || []) {
    if (!att?.blob) continue
    const fileName = sanitizeEmailFileName(att.fileName, 'allegato')
    const contentType = sanitizeEmailHeaderText(att.contentType || att.blob.type || 'application/octet-stream') || 'application/octet-stream'
    const base64 = await blobBase64(att.blob)
    lines.push(
      `--${boundary}`,
      `Content-Type: ${contentType}; name="${fileName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${fileName}"`,
      '',
      splitBase64Lines(base64)
    )
  }
  lines.push(`--${boundary}--`, '')
  const eml = new Blob([lines.join('\r\n')], { type: 'message/rfc822;charset=utf-8' })
  downloadBlobFile(eml, sanitizeEmailFileName(opts.fileName, 'email.eml'))
}

async function buildEmailAttachmentFromAmmAttachment (att: AmmAttachmentInfo, oid: number, layerUrl: string): Promise<EmailDraftAttachment> {
  const blob = await fetchAmmAttachmentBlobForPdf(att, oid, layerUrl)
  return {
    blob,
    fileName: sanitizeEmailFileName(att.name || `allegato-${att.id}`),
    contentType: String(att.contentType || blob.type || 'application/octet-stream')
  }
}

function DatiGeneraliAmmSection (props: { title: string, data: Record<string, any>, fields: LayerFieldInfo[], profile: { role: string, label: string, fullName: string, username: string }, hasDsForSave: boolean, summaryFields: any[], labelSize: number, valueSize: number }) {
  const st = useAdminStyle()
  const d = props.data || {}
  const oid = pickOidFromData(d, 'OBJECTID')
  const rapporto = getReportCode(d, oid != null ? Number(oid) : null)
  const verbaleDefinitivo = isVerbaleDefinitivo(d)
  const hasVerbale = tipoAttoAmmPrevedeVerbale(d)
  const verbaleNotificato = isVerbaleNotificato(d)
  const istruttoreTecnico = String(pickAttrCI(d, ['it_assegnato_nome', 'it_assegnato_username']) || '—')
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
              <StatusSummaryItem label='Istruttore tecnico' value={istruttoreTecnico} tone='auto' />
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelTitleStyle}>Fase amministrativa</div>
            <div style={gridStyle}>
              {hasVerbale && <StatusSummaryItem label='Numero atto' value={displayVerbaleNumber(d, props.fields, oid)} tone={hasAdminValue(verbaleNumberValue(d, oid)) ? 'auto' : 'warn'} />}
              <StatusSummaryItem label='Data approvazione' value={displayVerbaleApprovalDate(d, props.fields)} tone={hasAdminValue(verbaleApprovalDateValue(d)) ? 'auto' : 'warn'} />
              <StatusSummaryItem label='Stato' value={verbaleDefinitivo ? 'Definitivo' : 'In corso di istruttoria'} tone={verbaleDefinitivo ? 'auto' : 'warn'} />
              <StatusSummaryItem label='Notifica' value={verbaleNotificato ? displayAdminFieldValue(d, props.fields, 'notifica_data') : 'Non registrata'} tone={verbaleNotificato ? 'auto' : 'warn'} />
              <StatusSummaryItem label='Istruttore amministrativo' value={displayAdminFieldValue(d, props.fields, 'ia_assegnato_nome', displayAdminFieldValue(d, props.fields, 'ia_assegnato_username'))} tone='auto' />
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}


async function createProtocolloFascicoloHeadlessMapView (target: any | null): Promise<{ view: any; dispose: () => void } | null> {
  if (!target || typeof document === 'undefined') return null
  const container = document.createElement('div')
  container.setAttribute('data-gii-protocollo-map', '1')
  Object.assign(container.style, {
    position: 'fixed',
    left: '-20000px',
    top: '0',
    width: '900px',
    height: '1200px',
    opacity: '0.01',
    pointerEvents: 'none',
    zIndex: '-1'
  } as any)
  document.body.appendChild(container)

  let view: any = null
  const dispose = () => {
    try { view?.destroy?.() } catch {}
    try { container.remove() } catch {}
  }

  try {
    const [MapView, Map, WebMap, FeatureLayer] = await Promise.all([
      loadEsriModule<any>('esri/views/MapView'),
      loadEsriModule<any>('esri/Map'),
      loadEsriModule<any>('esri/WebMap').catch((): null => null),
      loadEsriModule<any>('esri/layers/FeatureLayer')
    ])
    const cfg: any = { ...FASCICOLO_MAP_DEFAULTS }
    let map: any = null
    if (WebMap && String(cfg.webMapItemId || '').trim()) {
      try {
        map = new WebMap({ portalItem: { id: String(cfg.webMapItemId).trim() } })
        if (typeof map?.loadAll === 'function') await map.loadAll()
      } catch {
        map = new Map({ basemap: String(cfg.basemap || 'satellite') })
      }
    } else {
      map = new Map({ basemap: String(cfg.basemap || 'satellite') })
    }

    const localizationUrl = String(cfg.mapLayerUrl || '').trim()
    if (localizationUrl && map) {
      try {
        const allLayers: any[] = map?.allLayers?.toArray?.() || map?.layers?.toArray?.() || []
        const normalized = (value: any) => String(value || '').split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase()
        if (!allLayers.some(layer => normalized(layer?.url) === normalized(localizationUrl))) {
          map.layers?.add?.(new FeatureLayer({
            url: localizationUrl,
            id: String(cfg.mapLayerId || '') || undefined,
            title: String(cfg.mapLayerTitle || '') || undefined
          }))
        }
      } catch {}
    }

    try { if (typeof map?.loadAll === 'function') await map.loadAll() } catch {}
    view = new MapView({
      container,
      map,
      center: target,
      scale: 1000,
      ui: { components: [] }
    })
    await view.when()
    return { view, dispose }
  } catch (e) {
    dispose()
    return null
  }
}

async function buildProtocolloAttoFascicoloEmailAttachments (
  oid: number,
  layer: any,
  layerUrl: string
): Promise<ProtocolloFascicoloEmailAttachment[]> {
  // La seconda protocollazione non ricostruisce né fonde il fascicolo: riusa
  // esattamente i PDF già protocollati nella prima fase, uno per uno. La nuova
  // segnatura di protocollo in uscita viene quindi apposta sul lato opposto senza
  // perdere quella di entrata già presente.
  const firstManifest = await loadProtocolloFascicoloManifest(layer, oid, layerUrl)
  const attachments = await queryAmmAttachments(layer, oid, layerUrl)
  const resolved: ProtocolloFascicoloEmailAttachment[] = []

  for (const item of firstManifest.items) {
    let source: AmmAttachmentInfo | null = null

    if (item.docKey === 'proposta') {
      source = pickLatestGiiAttachment(
        attachments.filter(att => isGiiPropostaContestazionePdfAttachment(att as any)) as any[]
      ) as AmmAttachmentInfo | null
    } else if (item.docKey.startsWith('allegato:')) {
      const sourceId = Number(item.sourceAttachmentId)
      source = Number.isFinite(sourceId) && sourceId > 0
        ? (attachments.find(att => Number(att.id) === sourceId) || null)
        : null
    } else {
      source = pickLatestGiiAttachment(
        attachments
          .filter(att => isGiiProtocolloFascicoloPdfAttachment(att as any))
          .filter(att => giiAttachmentKeywordValue(att as any, 'protocolDocKey') === item.docKey) as any[]
      ) as AmmAttachmentInfo | null
    }

    if (!source) {
      throw new Error(`L’elaborato già protocollato “${item.sourceAttachmentName || item.fileName}” non è disponibile nella pratica.`)
    }
    const sourceName = String(source.name || item.sourceAttachmentName || item.fileName || `${item.docKey}.pdf`).trim()
    if (!/\.pdf$/i.test(sourceName) && !String(source.contentType || '').toLowerCase().includes('pdf')) {
      throw new Error(`L’elaborato “${sourceName}” non è disponibile in formato PDF.`)
    }

    resolved.push({
      blob: await fetchAmmAttachmentBlobForPdf(source, oid, layerUrl),
      contentType: 'application/pdf',
      fileName: sourceName || `${item.docKey}.pdf`,
      index: resolved.length,
      docKey: `fascicolo:${item.docKey}`,
      sourceAttachmentId: Number(source.id),
      sourceAttachmentKind: item.sourceAttachmentKind,
      sourceAttachmentName: sourceName,
      sourceAttachmentKeywords: String(source.keywords || '') || undefined
    })
  }

  return resolved
}


async function buildProtocolloFascicoloEmailAttachments (
  oid: number,
  ds: any,
  layerUrl: string,
  opts: {
    nsConfig?: { detailUrl?: string, parametriUrl?: string, parametroCode?: string }
    mapView?: any | null
    requireMap?: boolean
  } = {}
): Promise<ProtocolloFascicoloEmailAttachment[]> {
  // Il Protocollo riceve un PDF distinto per ogni elaborato. Il builder condiviso
  // produce Rapporto, Note spese, Mappa e allegati generici nello stesso ordine del viewer.
  const fascicoloItems = await buildFascicoloItems({
    oid,
    selection: {
      includeTecnici: true,
      includeMappa: !!opts.requireMap,
      includeRapporto: true,
      includeNotaSpese: true
    },
    notaSpeseConfig: opts.nsConfig,
    mapConfig: opts.requireMap && opts.mapView
      ? {
          view: opts.mapView,
          printServiceUrl: DEFAULT_PRINT_SERVICE_URL,
          mapLocalizationLayerUrl: String(FASCICOLO_MAP_DEFAULTS.mapLayerUrl || '')
        }
      : undefined,
    fileNamePrefix: 'fascicolo_protocollo'
  })

  if (opts.requireMap && !fascicoloItems.some(item => item.docKey === 'mappa')) {
    throw new Error('L’elaborato cartografico previsto per la pratica non è stato generato. La trasmissione al protocollo è stata annullata.')
  }

  const layer = await resolveLayerForEdit(ds, layerUrl)
  const attachments = await queryAmmAttachments(layer, oid, layerUrl)
  const propostaAtt = pickLatestGiiAttachment<AmmAttachmentInfo>(attachments.filter(att => isGiiPropostaContestazionePdfAttachment(att as any)))
  if (!propostaAtt) {
    throw new Error('PDF della Proposta di contestazione non disponibile. Impossibile predisporre il fascicolo da protocollare.')
  }

  const propostaBlob = await fetchAmmAttachmentBlobForPdf(propostaAtt, oid, layerUrl)
  const rawItems: Array<FascicoloPdfItem & { sourceAttachmentName?: string }> = [
    ...fascicoloItems,
    {
      blob: propostaBlob,
      fileName: String(propostaAtt.name || 'proposta_contestazione.pdf'),
      docKey: 'proposta',
      sourceAttachmentId: Number(propostaAtt.id),
      sourceAttachmentName: String(propostaAtt.name || 'proposta_contestazione.pdf')
    }
  ]

  return rawItems.map((item, index) => {
    const order = String(index + 1).padStart(2, '0')
    const cleanName = sanitizeEmailFileName(item.fileName || `${item.docKey}.pdf`, `${item.docKey}.pdf`)
      .replace(/\.pdf$/i, '')
    return {
      blob: item.blob,
      contentType: 'application/pdf',
      fileName: `${order}_${cleanName}.pdf`,
      index,
      docKey: item.docKey,
      sourceAttachmentId: item.sourceAttachmentId,
      sourceAttachmentKind: item.sourceAttachmentKind,
      sourceAttachmentName: item.sourceAttachmentName,
      sourceAttachmentKeywords: item.sourceAttachmentKeywords
    }
  })
}


function FascicoloAmmPreviewSection (props: {
  data: Record<string, any>
  liveRefreshVersion?: number
  role?: string
  nsConfig?: { detailUrl?: string, parametriUrl?: string, parametroCode?: string }
  hasSelection: boolean
  oid: number | null
  ds: any
  idFieldName?: string
  layerUrl?: string
  viewerBackgroundColor?: string
  pdfHeaderBackgroundColor?: string
  pdfPageAreaBackgroundColor?: string
  pdfThumbnailsBackgroundColor?: string
  pdfToolbarBackgroundColor?: string
  sidebarBackgroundColor?: string
  sidebarBorderColor?: string
  sidebarBorderWidth?: number
  borderRadius?: number
}) {
  const oid = props.oid != null && Number.isFinite(Number(props.oid)) ? Number(props.oid) : null
  const layerUrl = normalizeEditLayerUrl(props.layerUrl || getDataSourceUrl(props.ds))


  // Editing-amm non interroga mai la geometria nelle query dei dati (returnGeometry: false
  // ovunque): per la mappa headless serve un'interrogazione mirata sul solo punto, quando
  // si apre l'anteprima. Nessun widget Mappa collegato — resta un'interrogazione puntuale.
  //
  // La disponibilità è decisa da computeReqPoint (ricalcolato dagli attributi correnti della
  // violazione, non dal campo salvato req_point — vedi _shared/gii-anteprime/req-point.ts):
  // per le pratiche da survey req_point può non essere compilato pur avendo coordinate reali,
  // ma se la violazione non richiede un punto (es. Art.8) il punto non va comunque mostrato.
  // Il filtro (0,0) dentro queryPointGeometryForAmm resta come ulteriore rete di sicurezza.
  const [ammMapTarget, setAmmMapTarget] = React.useState<any | null>(null)
  React.useEffect(() => {
    if (!props.hasSelection || oid == null || computeReqPoint(props.data) !== 1) { setAmmMapTarget(null); return }
    let cancelled = false
    void queryPointGeometryForAmm(props.ds, oid, props.idFieldName || 'OBJECTID', layerUrl).then(geom => {
      if (!cancelled) setAmmMapTarget(geom)
    }).catch(() => { if (!cancelled) setAmmMapTarget(null) })
    return () => { cancelled = true }
  }, [props.hasSelection, oid, props.ds, props.idFieldName, layerUrl, props.data])

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, borderRadius: Number(props.borderRadius ?? 8), overflow: 'hidden', display: 'flex', flexDirection: 'column', background: props.viewerBackgroundColor || '#282828' }}>
      <GiiAnteprimaPanel
        data={props.hasSelection ? (props.data || {}) : {}}
        mode='edit'
        ds={props.ds}
        oid={oid}
        layerUrlHint={layerUrl}
        mapConfig={{}}
        mapTarget={ammMapTarget}
        notaSpeseConfig={props.nsConfig}
        canSeeAmministrativi={true}
        role={props.role}
        refreshKey={props.liveRefreshVersion}
        viewerBackgroundColor={props.viewerBackgroundColor}
        pdfHeaderBackgroundColor={props.pdfHeaderBackgroundColor}
        pdfPageAreaBackgroundColor={props.pdfPageAreaBackgroundColor}
        pdfThumbnailsBackgroundColor={props.pdfThumbnailsBackgroundColor}
        pdfToolbarBackgroundColor={props.pdfToolbarBackgroundColor}
        sidebarBackgroundColor={props.sidebarBackgroundColor}
        sidebarBorderColor={props.sidebarBorderColor}
        sidebarBorderWidth={props.sidebarBorderWidth}
      />

    </div>
  )
}


function isAdministrativeGenericAttachment (att: AmmAttachmentInfo | null | undefined): boolean {
  return getGiiAttachmentKind(att as any) === 'administrative'
}

function decorateAmmAttachmentForAllegatiSection (att: AmmAttachmentInfo): AmmAttachmentInfo & { groupTitle?: string; readOnly?: boolean; readOnlyReason?: string } {
  const kind = getGiiAttachmentKind(att as any)
  if (kind === 'administrative') {
    return { ...att, groupTitle: 'Allegati amministrativi' }
  }
  return {
    ...att,
    groupTitle: 'Allegati tecnici',
    readOnly: true
  }
}

function sortAmmAttachmentForAllegatiSection (a: AmmAttachmentInfo, b: AmmAttachmentInfo): number {
  const ka = getGiiAttachmentKind(a as any) === 'technical' ? 0 : 1
  const kb = getGiiAttachmentKind(b as any) === 'technical' ? 0 : 1
  if (ka !== kb) return ka - kb
  const ca = Number((a as any)?.created ?? (a as any)?.creationDate ?? (a as any)?.uploadedAt ?? a.id) || 0
  const cb = Number((b as any)?.created ?? (b as any)?.creationDate ?? (b as any)?.uploadedAt ?? b.id) || 0
  return ca - cb
}

function AllegaiaSection (props: {
  oid: number | null,
  ds: any,
  layerUrl?: string,
  canEdit: boolean,
  selectedAttachmentId: number | string | null,
  onSelectedAttachmentChange: (item: AmmAttachmentInfo | null) => void,
  rotationDeg: number,
  onRotateLeft: () => void,
  onRotateRight: () => void,
  onRotationConfirmed: () => void,
  practiceContextRevision: number
}) {
  const st = useAdminStyle()
  const oid = props.oid != null && Number.isFinite(Number(props.oid)) ? Number(props.oid) : null
  const [items, setItems] = React.useState<AmmAttachmentInfo[]>([])
  const [loadedOid, setLoadedOid] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [inputKey, setInputKey] = React.useState(0)
  const [deleteTarget, setDeleteTarget] = React.useState<AmmAttachmentInfo | null>(null)
  const loadSeqRef = React.useRef(0)

  React.useEffect(() => {
    loadSeqRef.current += 1
    setItems([])
    setLoadedOid(null)
    setLoading(false)
    setBusy(false)
    setError(null)
    setInputKey(k => k + 1)
    setDeleteTarget(null)
    props.onSelectedAttachmentChange(null)
    props.onRotationConfirmed()
  }, [oid, props.practiceContextRevision])

  const resolveAttachmentLayer = React.useCallback(async () => {
    const layer = await resolveLayerForEdit(props.ds, props.layerUrl)
    const layerUrl = normalizeEditLayerUrl(props.layerUrl || layer?.url || getDataSourceUrl(props.ds))
    return { layer, layerUrl }
  }, [props.ds, props.layerUrl])

  const load = React.useCallback(async () => {
    const targetOid = oid
    const operationContextStamp = getGiiPracticeContextStamp()
    const loadSeq = ++loadSeqRef.current
    const isCurrent = () => loadSeq === loadSeqRef.current && isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!targetOid) {
      if (isCurrent()) {
        setItems([])
        setLoadedOid(null)
        setError(null)
      }
      return
    }
    if (!isCurrent()) return
    setLoading(true)
    setError(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      if (!isCurrent()) return
      if (!layer && !layerUrl) throw new Error('Allegati non disponibili.')
      const list = await queryAmmAttachments(layer, targetOid, layerUrl)
      if (!isCurrent()) return
      const visible = (filterGiiAttachmentsForAdministrativeFascicolo(list as any) as AmmAttachmentInfo[])
        .slice()
        .sort(sortAmmAttachmentForAllegatiSection)
        .map(decorateAmmAttachmentForAllegatiSection)
      setItems(visible)
      setLoadedOid(targetOid)
    } catch (e: any) {
      if (!isCurrent()) return
      setItems([])
      setLoadedOid(targetOid)
      setError(e?.message || String(e))
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [oid, resolveAttachmentLayer, props.practiceContextRevision])

  React.useEffect(() => {
    if (oid && loadedOid !== oid) void load()
  }, [oid, loadedOid, load])

  const upload = React.useCallback(async (files: File[]) => {
    const targetOid = oid
    const operationContextStamp = getGiiPracticeContextStamp()
    const isCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!targetOid || !files.length || !props.canEdit || !isCurrent()) return
    setBusy(true)
    setError(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      if (!isCurrent()) return
      await addAmmAttachments(layer, targetOid, files, layerUrl, `${GII_ATTACHMENT_KEYWORDS.administrative}|fileCreatedAt=${Date.now()}`)
      if (!isCurrent()) return
      setInputKey(k => k + 1)
      await load()
    } catch (e: any) {
      if (isCurrent()) setError(e?.message || String(e))
    } finally {
      if (isCurrent()) setBusy(false)
    }
  }, [oid, props.canEdit, resolveAttachmentLayer, load, props.practiceContextRevision])

  const replace = React.useCallback(async (att: AmmAttachmentInfo, file: File) => {
    const targetOid = oid
    const operationContextStamp = getGiiPracticeContextStamp()
    const isCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!targetOid || !att?.id || !file || !props.canEdit || !isCurrent()) return
    if (!isAdministrativeGenericAttachment(att)) { setError('Gli allegati tecnici sono consultabili ma non modificabili dai ruoli amministrativi.'); return }
    setBusy(true)
    setError(null)
    try {
      const { layerUrl } = await resolveAttachmentLayer()
      if (!isCurrent()) return
      await updateAmmAttachment(targetOid, Number(att.id), file, layerUrl)
      if (!isCurrent()) return
      setInputKey(k => k + 1)
      await load()
    } catch (e: any) {
      if (isCurrent()) setError(e?.message || String(e))
    } finally {
      if (isCurrent()) setBusy(false)
    }
  }, [oid, props.canEdit, resolveAttachmentLayer, load, props.practiceContextRevision])

  const confirmRemove = React.useCallback(async () => {
    const att = deleteTarget
    const targetOid = oid
    const operationContextStamp = getGiiPracticeContextStamp()
    const isCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!targetOid || !att?.id || !props.canEdit || !isCurrent()) return
    setBusy(true)
    setError(null)
    try {
      const { layer, layerUrl } = await resolveAttachmentLayer()
      if (!isCurrent()) return
      await deleteAmmAttachment(layer, targetOid, Number(att.id), layerUrl)
      if (!isCurrent()) return
      await load()
    } catch (e: any) {
      if (isCurrent()) setError(e?.message || String(e))
    } finally {
      if (isCurrent()) setBusy(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, oid, props.canEdit, resolveAttachmentLayer, load, props.practiceContextRevision])

  const remove = React.useCallback((att: AmmAttachmentInfo) => {
    const targetOid = oid
    if (!targetOid || !att?.id || !props.canEdit) return
    if (!isAdministrativeGenericAttachment(att)) { setError('Gli allegati tecnici sono consultabili ma non eliminabili dai ruoli amministrativi.'); return }
    setDeleteTarget(att)
  }, [oid, props.canEdit])

  const open = React.useCallback(async (att: AmmAttachmentInfo) => {
    const targetOid = oid
    const operationContextStamp = getGiiPracticeContextStamp()
    const isCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!targetOid || !att?.id || !isCurrent()) return
    setError(null)
    try {
      const { layerUrl } = await resolveAttachmentLayer()
      if (!isCurrent()) return
      await openAmmAttachmentInNewTab(att, targetOid, layerUrl)
    } catch (e: any) {
      if (isCurrent()) setError(e?.message || String(e))
    }
  }, [oid, resolveAttachmentLayer, props.practiceContextRevision])

  const buildPreview = React.useCallback(async (att: AmmAttachmentInfo): Promise<string | null> => {
    const targetOid = oid
    const operationContextStamp = getGiiPracticeContextStamp()
    if (!targetOid || !att?.id || !isGiiPracticeContextStampCurrent(operationContextStamp)) return null
    const { layerUrl } = await resolveAttachmentLayer()
    if (!isGiiPracticeContextStampCurrent(operationContextStamp)) return null
    return await buildAttachmentPreviewUrl(att, targetOid, layerUrl)
  }, [oid, resolveAttachmentLayer, props.practiceContextRevision])

  const isRotatableAmmAttachment = React.useCallback((att: { name?: string; contentType?: string }) => {
    const ct = String(att?.contentType || '').toLowerCase()
    const name = String(att?.name || '').toLowerCase()
    return ct.includes('jpeg') || ct.includes('jpg') || ct.includes('png') || /\.(jpe?g|png)$/i.test(name)
  }, [])

  const confirmAmmRotation = React.useCallback(async () => {
    const targetOid = oid
    const operationContextStamp = getGiiPracticeContextStamp()
    const isCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    const normalizedRotation = ((Math.round(props.rotationDeg / 90) * 90) % 360 + 360) % 360
    if (!targetOid || !props.canEdit || props.selectedAttachmentId == null || normalizedRotation === 0 || !isCurrent()) return
    const att = items.find((it: any) => String(it?.id) === String(props.selectedAttachmentId))
    if (!att || !isRotatableAmmAttachment(att)) return
    if (!isAdministrativeGenericAttachment(att)) { setError('Gli allegati tecnici sono consultabili ma non modificabili dai ruoli amministrativi.'); return }
    setBusy(true)
    setError(null)
    try {
      const previewBlobUrl = await buildPreview(att)
      if (!isCurrent()) return
      if (!previewBlobUrl) throw new Error('Anteprima non disponibile per la rotazione.')
      const resp = await fetch(String(previewBlobUrl).split('#')[0])
      if (!isCurrent()) return
      if (!resp.ok) throw new Error(`Caricamento immagine fallito (HTTP ${resp.status}).`)
      const blob = await resp.blob()
      if (!isCurrent()) return
      const file = await rotateImageAttachmentFile(blob, att.name || `allegato_${att.id}.jpg`, normalizedRotation)
      if (!isCurrent()) return
      const { layerUrl } = await resolveAttachmentLayer()
      if (!isCurrent()) return
      await updateAmmAttachment(targetOid, Number(att.id), file, layerUrl)
      if (!isCurrent()) return
      setInputKey(k => k + 1)
      await load()
      if (isCurrent()) props.onRotationConfirmed()
    } catch (e: any) {
      if (isCurrent()) setError(e?.message || String(e))
    } finally {
      if (isCurrent()) setBusy(false)
    }
  }, [oid, props.canEdit, props.selectedAttachmentId, props.rotationDeg, props.onRotationConfirmed, props.practiceContextRevision, items, isRotatableAmmAttachment, buildPreview, resolveAttachmentLayer, load])

  return (
    <>
      {deleteTarget && (
        <ConfirmActionDialog
          title='Eliminare l’allegato'
          text={`Eliminare l’allegato “${deleteTarget.name || deleteTarget.id}”?`}
          confirmLabel='Elimina'
          danger
          saving={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => { void confirmRemove() }}
        />
      )}
    <GiiAttachmentViewer
      oidAvailable={!!oid}
      noOidMessage='Selezionare una pratica prima di consultare o caricare gli allegati.'
      items={items as any}
      loading={loading}
      busy={busy}
      error={error}
      canEdit={props.canEdit}
      uploadLabel='Carica allegato'
      uploadInputKey={inputKey}
      onUpload={upload}
      selectedItemId={props.selectedAttachmentId}
      onSelectedItemChange={props.onSelectedAttachmentChange as any}
      onOpen={open as any}
      onReplace={replace as any}
      onDelete={remove as any}
      buildPreviewUrl={buildPreview as any}
      rotationDeg={props.rotationDeg}
      rotationBusy={busy}
      canConfirmRotation={props.canEdit && (((Math.round(props.rotationDeg / 90) * 90) % 360 + 360) % 360) !== 0}
      onRotateLeft={props.onRotateLeft}
      onRotateRight={props.onRotateRight}
      onConfirmRotation={() => { void confirmAmmRotation() }}
      formatBytes={formatAttachmentBytes}
      labelFontSize={adminLabelFontSize(st)}
      headerFontSize={Number(st.formCardHeaderFontSize ?? 14)}
      headerBg={st.formCardHeaderBg || '#0d3b66'}
      headerColor={st.formCardHeaderColor || '#fff'}
      headerBorderColor={st.formCardBorderColor || '#c5d9f1'}
      borderRadius={Number(st.formCardBorderRadius ?? 10)}
      innerHeaderColor={st.formInnerHeaderColor || '#0f4c81'}
    />
    </>
  )}

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

  const idFieldName = String(ds?.getIdField?.() || 'OBJECTID')
  let selected = ds?.getSelectedRecords?.() || []
  if (!selected || selected.length === 0) {
    // Non assumere mai che il primo record caricato sia quello scelto. Dopo un
    // cambio account il datasource può conservare per qualche istante i record
    // della sessione precedente. Il fallback è ammesso soltanto se esiste un OID
    // esplicito nel contesto corrente e il record coincide realmente.
    const expectedIntent = readEditIntent() || readSelectionIntent()
    const expectedOid = expectedIntent?.oid != null && Number.isFinite(Number(expectedIntent.oid))
      ? Number(expectedIntent.oid)
      : null
    const recs = ds?.getRecords?.() || []
    if (expectedOid != null && Array.isArray(recs)) {
      const matching = recs.find((record: any) => {
        const recordData = record?.getData ? record.getData() : (record?.data || record?.attributes || null)
        const recordOid = pickOidFromData(recordData, idFieldName)
        return recordOid != null && Number(recordOid) === expectedOid
      })
      selected = matching ? [matching] : []
    } else {
      selected = []
    }
  }

  const r0 = selected.length ? selected[0] : null
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
  const normalColor = st.formFieldColor || '#0f172a'
  const disabledColor = st.formFieldDisabledColor || '#1f2937'
  const normalBg = st.formFieldBg || '#f8fbff'
  const disabledBg = st.formFieldDisabledBg || '#e8edf3'
  const normalBorder = st.formFieldBorderColor || '#bfcede'
  const disabledBorder = st.formFieldDisabledBorderColor || '#cbd5e1'
  return {
    width: '100%',
    boxSizing: 'border-box',
    height: fieldHeight,
    minHeight: fieldHeight,
    border: `${Number(st.formFieldBorderWidth ?? 1)}px solid ${disabled ? disabledBorder : normalBorder}`,
    borderRadius: Number(st.formFieldBorderRadius ?? 7),
    padding: `0 ${Number(st.formFieldPaddingX ?? 9)}px`,
    fontSize,
    lineHeight: `${Math.max(16, fieldHeight - 2)}px`,
    color: disabled ? disabledColor : normalColor,
    background: disabled ? disabledBg : normalBg,
    opacity: 1,
    WebkitTextFillColor: disabled ? disabledColor : normalColor,
    outline: 'none',
    cursor: disabled ? 'default' : undefined
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
    border: disabled ? '1px solid #cbd5e1' : '1px solid #d1d5db',
    borderRadius: 9,
    padding: '8px 10px',
    fontSize: 15,
    color: disabled ? '#1f2937' : '#111827',
    background: disabled ? '#e8edf3' : '#fff',
    opacity: 1,
    WebkitTextFillColor: disabled ? '#1f2937' : '#111827',
    outline: 'none',
    cursor: disabled ? 'default' : undefined
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
  attention?: boolean
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
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <span>{field.label}</span>
        {props.attention && <NextActionPulse title='Dato da compilare' />}
      </span>
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
  attentionFieldName?: string | null
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
        {fields.map(f => <FieldEditor key={f.name} field={f} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} attention={props.attentionFieldName === f.name} />)}
      </div>
    )
  }

  props.items.forEach(f => {
    if (f.full || f.kind === 'textarea') {
      flushCompact()
      rows.push(
        <FieldEditor key={f.name} field={f} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} attention={props.attentionFieldName === f.name} />
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
  intro?: React.ReactNode
  right?: React.ReactNode
  children?: React.ReactNode
  attentionFieldName?: string | null
}) {
  const wanted = Array.isArray(props.fieldNames) && props.fieldNames.length ? new Set(props.fieldNames.map(String)) : null
  const items = ADMIN_FIELDS.filter(f => f.group === props.group && (!wanted || wanted.has(f.name)))
  return (
    <Section title={props.title} right={props.right}>
      {props.intro && <div style={{ marginBottom: 10 }}>{props.intro}</div>}
      <AdminFieldsLayout items={items} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} attentionFieldName={props.attentionFieldName} />
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
  attentionFieldName?: string | null
}) {
  const wanted = Array.isArray(props.fieldNames) && props.fieldNames.length ? new Set(props.fieldNames.map(String)) : null
  const items = ADMIN_FIELDS.filter(f => f.group === props.group && (!wanted || wanted.has(f.name)))
  return (
    <AdminFieldsLayout items={items} draft={props.draft} fields={props.fields} canEdit={props.canEdit} onChange={props.onChange} attentionFieldName={props.attentionFieldName} />
  )
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
  for (const name of ADMIN_WORKFLOW_SAVE_FIELDS) {
    const real = realFieldName(fields, name)
    if (!real) continue
    const before = pickAttrCI(initial, [real, name])
    const after = pickAttrCI(draft, [real, name])
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
  const [practiceContextRevision, setPracticeContextRevision] = React.useState(0)
  const [iaAccess, setIaAccess] = React.useState<IaAccessState>({
    status: 'idle',
    selectionKey: '',
    data: null,
    message: '',
    checkedAt: 0
  })
  const iaAccessSeqRef = React.useRef(0)
  const statesRef = React.useRef<Record<string, SelectedState>>({})
  const [layerFields, setLayerFields] = React.useState<LayerFieldInfo[]>([])
  const [draft, setDraft] = React.useState<Record<string, any>>({})
  const [liveRefreshVersion, setLiveRefreshVersion] = React.useState(0)
  const [attoCleanWordGeneratedMarker, setAttoCleanWordGeneratedMarker] = React.useState<{ oid: number, generatedAt: number } | null>(() => {
    try {
      const raw = window.sessionStorage.getItem('GII_ATTO_CLEAN_WORD_GENERATED')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const markerOid = Number(parsed?.oid)
      const generatedAt = Number(parsed?.generatedAt || parsed?.ts || 0)
      return Number.isFinite(markerOid) && markerOid > 0
        ? { oid: markerOid, generatedAt: Number.isFinite(generatedAt) && generatedAt > 0 ? generatedAt : Date.now() }
        : null
    } catch {
      return null
    }
  })
  const [attoDirettoreEmailPreparedMarker, setAttoDirettoreEmailPreparedMarker] = React.useState<{ oid: number, preparedAt: number } | null>(() => {
    try {
      const raw = window.sessionStorage.getItem('GII_ATTO_EMAIL_DA_PREPARED')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const markerOid = Number(parsed?.oid)
      const preparedAt = Number(parsed?.preparedAt || parsed?.ts || 0)
      return Number.isFinite(markerOid) && markerOid > 0
        ? { oid: markerOid, preparedAt: Number.isFinite(preparedAt) && preparedAt > 0 ? preparedAt : Date.now() }
        : null
    } catch {
      return null
    }
  })
  const [initialDraft, setInitialDraft] = React.useState<Record<string, any>>({})
  const [automaticValues, setAutomaticValues] = React.useState<Record<string, any>>({})
  const [saving, setSaving] = React.useState(false)
  const [dialog, setDialog] = React.useState<{ kind: 'ok' | 'err' | 'warn', title: string, text: string } | null>(null)
  const [pendingAttestationText, setPendingAttestationText] = React.useState<string | null>(null)
  const [pendingUndoAttestation, setPendingUndoAttestation] = React.useState(false)
  const [confirmTransmitBozza, setConfirmTransmitBozza] = React.useState(false)
  const [confirmTransmitReopensCycle, setConfirmTransmitReopensCycle] = React.useState(false)
  const [ammPreviewAttachment, setAmmPreviewAttachment] = React.useState<{ id: number; name?: string; contentType?: string } | null>(null)
  const [ammPreviewRotationDeg, setAmmPreviewRotationDeg] = React.useState(0)
  const [activeAmmSection, setActiveAmmSection] = React.useState<AmmSectionKey>(() => getRequestedAmmSection() || AMM_DEFAULT_SECTION)
  const [verificationActionBarTarget, setVerificationActionBarTarget] = React.useState<HTMLDivElement | null>(null)
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
    statesRef.current = states
  }, [states])

  React.useEffect(() => {
    if (!pageVisible) return
    if (!VALID_AMM_SECTIONS.has(activeAmmSection)) return
    persistAmmSection(activeAmmSection)
    broadcastAmmSection(activeAmmSection)
  }, [pageVisible, activeAmmSection])

  React.useEffect(() => {
    const onPracticeContextReset = () => {
      iaAccessSeqRef.current += 1
      for (const state of Object.values(statesRef.current || {})) clearDataSourceSelection(state?.ds)
      clearEditingAmmSessionCaches()
      setPracticeContextRevision(value => value + 1)
      setStates({})
      setIntentState(emptySelectedState())
      setProfile(readUserProfile())
      setIaAccess({ status: 'idle', selectionKey: '', data: null, message: '', checkedAt: 0 })
      setLayerFields([])
      setDraft({})
      setInitialDraft({})
      setAutomaticValues({})
      setLiveRefreshVersion(0)
      setAttoDirettoreEmailPreparedMarker(null)
      try { window.sessionStorage.removeItem('GII_ATTO_EMAIL_DA_PREPARED') } catch {}
      setDialog(null)
      setPendingAttestationText(null)
      setPendingUndoAttestation(false)
      setConfirmTransmitBozza(false)
      setAmmPreviewAttachment(null)
      setAmmPreviewRotationDeg(0)
    }
    window.addEventListener('gii-practice-context-reset', onPracticeContextReset)
    return () => window.removeEventListener('gii-practice-context-reset', onPracticeContextReset)
  }, [])

  React.useEffect(() => {
    const sync = () => {
      const editIntent = readEditIntent()
      if (editIntent) setIntentState(selectionStateFromIntent(editIntent, 'editIntent'))
      else setIntentState(selectionStateFromIntent(readSelectionIntent(), 'selection'))
      const nextProfile = readUserProfile()
      setProfile(prev => userProfileIdentityKey(prev) === userProfileIdentityKey(nextProfile) ? prev : nextProfile)
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

  // La pratica candidata arriva prima di tutto dall'intent impostato da gii-azioni.
  // Per il IA i dati candidati servono soltanto a localizzare il record: nessun
  // contenuto viene mostrato prima della verifica aggiornata sul servizio.
  const candidateSelection = (intentState?.oid != null || intentState?.data) ? intentState : (dsStatesWithSelection[0] || null)
  const candidateDs = candidateSelection?.ds || configuredDs
  const candidateData = candidateSelection?.data || null
  const candidateOid = candidateSelection?.oid ?? (candidateData ? pickOidFromData(candidateData, candidateSelection?.idFieldName || 'OBJECTID') : null)
  const candidateHasSelection = !!candidateData || (candidateOid != null && Number.isFinite(Number(candidateOid)))
  const currentRole = String(profile.role || '').toUpperCase()
  const isIaProfile = currentRole === 'IA'
  const profileIdentity = userProfileIdentityKey(profile)
  const candidateLayerUrl = normalizeEditLayerUrl(candidateSelection?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
  const candidateVerificationDs = candidateLayerUrl ? null : candidateDs
  const candidateSelectionKey = candidateHasSelection
    ? [profileIdentity, candidateSelection?.sig || '', candidateLayerUrl, Number(candidateOid), practiceContextRevision].join('|')
    : ''
  const candidateRiaParentGlobalId = String(pickAttrCI(candidateData || {}, ['GlobalID', 'globalid', 'GLOBALID']) || '').trim()
  const candidateRiaOutcomeRevision = pickAttrCI(candidateData || {}, ['dt_esito_RIA', 'dt_stato_RIA'])
  const candidateHasRiaOutcome = hasAdminValue(pickAttrCI(candidateData || {}, ['esito_RIA'])) || hasAdminValue(candidateRiaOutcomeRevision)

  // Precarica il nominativo storico del RIA mentre viene verificato l'accesso alla pratica:
  // quando la scheda Iter viene renderizzata il nome è normalmente già disponibile, evitando
  // il passaggio visibile da “—” al nominativo qualche secondo dopo.
  React.useEffect(() => {
    if (!candidateRiaParentGlobalId || !candidateHasRiaOutcome) return
    void loadLatestHistoricalRiaOperatorName(candidateRiaParentGlobalId, candidateRiaOutcomeRevision)
  }, [candidateRiaParentGlobalId, candidateHasRiaOutcome, candidateRiaOutcomeRevision])

  React.useEffect(() => {
    const seq = ++iaAccessSeqRef.current
    if (!isIaProfile || !candidateHasSelection || candidateOid == null || !Number.isFinite(Number(candidateOid))) {
      setIaAccess(prev => prev.status === 'idle' && !prev.selectionKey
        ? prev
        : { status: 'idle', selectionKey: '', data: null, message: '', checkedAt: 0 })
      return
    }

    setIaAccess({
      status: 'checking',
      selectionKey: candidateSelectionKey,
      data: null,
      message: '',
      checkedAt: 0
    })

    let cancelled = false
    const verify = async () => {
      try {
        const layer = await resolveLayerForEdit(candidateVerificationDs, candidateLayerUrl)
        if (!layer) throw new Error('Pratica non disponibile.')
        const idFieldName = String(layer.objectIdField || candidateSelection?.idFieldName || 'OBJECTID').trim() || 'OBJECTID'
        const liveAttrs = await queryCurrentLayerAttrsByOid(layer, idFieldName, Number(candidateOid))
        if (cancelled || seq !== iaAccessSeqRef.current) return
        if (!liveAttrs || !Object.keys(liveAttrs).length) {
          setIaAccess({
            status: 'error',
            selectionKey: candidateSelectionKey,
            data: null,
            message: 'La pratica non è più disponibile.',
            checkedAt: Date.now()
          })
          return
        }
        if (!isPracticeAssignedToCurrentIa(liveAttrs, profile)) {
          setIaAccess({
            status: 'denied',
            selectionKey: candidateSelectionKey,
            data: null,
            message: 'Accesso alla pratica non consentito.',
            checkedAt: Date.now()
          })
          return
        }
        writeSelectedFeatureCache(candidateLayerUrl, candidateOid, idFieldName, liveAttrs, 'detail')
        setIaAccess({
          status: 'allowed',
          selectionKey: candidateSelectionKey,
          data: liveAttrs,
          message: '',
          checkedAt: Date.now()
        })
      } catch {
        if (cancelled || seq !== iaAccessSeqRef.current) return
        setIaAccess({
          status: 'error',
          selectionKey: candidateSelectionKey,
          data: null,
          message: 'Impossibile verificare l’accesso alla pratica.',
          checkedAt: Date.now()
        })
      }
    }
    void verify()
    return () => { cancelled = true }
  }, [candidateHasSelection, candidateLayerUrl, candidateOid, candidateSelection?.idFieldName, candidateSelectionKey, candidateVerificationDs, isIaProfile, practiceContextRevision, profileIdentity])

  const iaAccessRequired = isIaProfile && candidateHasSelection
  const iaAccessAllowed = !iaAccessRequired || (
    iaAccess.status === 'allowed' &&
    iaAccess.selectionKey === candidateSelectionKey &&
    !!iaAccess.data
  )
  const activeSelection = isIaProfile
    ? (iaAccessAllowed && candidateSelection
        ? { ...candidateSelection, data: iaAccess.data, sig: `${candidateSelection.sig}|verified:${iaAccess.checkedAt}` }
        : null)
    : candidateSelection
  const active = activeSelection ? { ...activeSelection, ds: activeSelection.ds || configuredDs } : (isIaProfile ? null : (configuredDsState || null))
  const data = activeSelection?.data || null
  const oid = activeSelection?.oid ?? (data ? pickOidFromData(data, activeSelection?.idFieldName || 'OBJECTID') : null)
  const hasSelection = !!data || (oid != null && Number.isFinite(Number(oid)))
  const roleAllowed = isAllowedAdminRole(profile.role)
  const title = buildPracticeTitle(cfg, data || {}, oid)
  const titleParts = buildPracticeTitleParts(data || {}, oid)
  const headerTitleParts = titleParts
  const showHeaderProcedureNote = activeAmmSection !== 'anteprima'
  const hasDsForSave = !!configuredDs
  const openedInConsultation = activeSelection?.readOnly === true
  const roleCanEditData = ['IA', 'ADMIN'].includes(currentRole)
  const draftOid = pickOidFromData(draft || {}, active?.idFieldName || 'OBJECTID')
  const draftBelongsToSelection = oid != null && draftOid != null && Number(draftOid) === Number(oid)
  const editStateData = draftBelongsToSelection && Object.keys(draft || {}).length ? draft : (data || {})
  const iaWorkflowState = currentRole === 'IA' ? parseNumberInput(pickAttrCI(editStateData || {}, ['stato_IA', 'STATO_IA'])) : null
  const iaAssignedToCurrentUser = currentRole === 'IA' && isPracticeAssignedToCurrentIa(editStateData || {}, profile)
  const iaIsCurrentOperativeAssignee = currentRole === 'IA' && iaWorkflowState === 2 && iaAssignedToCurrentUser
  const assignedToOtherUser = currentRole === 'IA' && !iaAssignedToCurrentUser
  const dataEditBlockedByRole = roleAllowed && !roleCanEditData
  const dataEditBlockedByOtherUser = roleCanEditData && ((openedInConsultation && !iaIsCurrentOperativeAssignee) || assignedToOtherUser)
  const readOnlyBannerBaseMessage = dataEditBlockedByRole
    ? 'Modifica dati non consentita per il tuo ruolo.'
    : (dataEditBlockedByOtherUser ? 'Modifica dati non abilitata. La pratica risulta in carico presso un altro utente.' : '')
  const showContextualSectionInfo = roleAllowed && roleCanEditData && !dataEditBlockedByRole && !dataEditBlockedByOtherUser
  const canEdit = roleAllowed && roleCanEditData && hasDsForSave && !dataEditBlockedByOtherUser
  const canRepairAdoptedDetermination = roleAllowed && roleCanEditData && hasDsForSave
  const adoptedDeterminationRepairRef = React.useRef('')
  React.useEffect(() => {
    if (!canRepairAdoptedDetermination || !data || oid == null || !Number.isFinite(Number(oid))) return
    const rawState = String(pickAttrCI(data, ['determinazione_stato']) || '').trim().toUpperCase()
    const hasRegisteredDetermination =
      hasAdminValue(pickAttrCI(data, ['determinazione_numero'])) &&
      hasAdminValue(pickAttrCI(data, ['determinazione_data']))
    if (!hasRegisteredDetermination || rawState === 'ADOTTATA') return
    const repairKey = `${Number(oid)}|${rawState}`
    if (adoptedDeterminationRepairRef.current === repairKey) return
    adoptedDeterminationRepairRef.current = repairKey
    let cancelled = false
    const repair = async () => {
      try {
        const layer = await resolveLayerForEdit(active?.ds, active?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
        if (!layer?.applyEdits) return
        if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
        const fields = layer?.fields?.length
          ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
          : layerFields
        const idName = realFieldName(fields, active?.idFieldName) || active?.idFieldName || 'OBJECTID'
        const stateField = realFieldName(fields, 'determinazione_stato')
        if (!stateField) return
        const updateAttrs = filterAttrsForLayer({ [idName]: Number(oid), [stateField]: 'ADOTTATA' }, fields)
        const result = await layer.applyEdits({ updateFeatures: [{ attributes: updateAttrs }] })
        const upd = result?.updateFeatureResults?.[0] || result?.updateResults?.[0] || null
        if (cancelled || upd?.error) return
        setDraft(prev => ({ ...(prev || {}), [stateField]: 'ADOTTATA' }))
        setInitialDraft(prev => ({ ...(prev || {}), [stateField]: 'ADOTTATA' }))
        setIaAccess(prev => prev.data ? { ...prev, data: { ...(prev.data || {}), [stateField]: 'ADOTTATA' } } : prev)
        try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm-repair-determinazione-adottata', ts: Date.now() } })) } catch {}
      } catch {
        adoptedDeterminationRepairRef.current = ''
      }
    }
    void repair()
    return () => { cancelled = true }
  }, [active?.ds, active?.idFieldName, active?.layerUrl, canRepairAdoptedDetermination, configuredDs, configuredDsState, data, layerFields, oid])
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
    setAmmPreviewAttachment(null)
    setAmmPreviewRotationDeg(0)
    setActiveAmmSection(nextSection)
    persistAmmSection(nextSection)
    broadcastAmmSection(nextSection)
    clearExplicitAmmSectionRequest()
  }, [active?.sig])

  React.useEffect(() => {
    let cancelled = false
    const refreshLiveRecord = async () => {
      if (currentRole === 'IA') return
      if (!active?.ds || oid == null || !Number.isFinite(Number(oid))) return
      try {
        const layer = await resolveLayerForEdit(active.ds, active.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
        if (!layer) return
        const idName = String(active.idFieldName || layer.objectIdField || 'OBJECTID')
        const liveAttrs = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (cancelled || !liveAttrs || !Object.keys(liveAttrs).length) return
        setDraft(prev => ({ ...(prev || {}), ...liveAttrs }))
        setInitialDraft(prev => ({ ...(prev || {}), ...liveAttrs }))
        setLiveRefreshVersion(v => v + 1)
      } catch { }
    }
    void refreshLiveRecord()
    return () => { cancelled = true }
  }, [active?.sig, configuredDs, configuredDsState, currentRole, oid])

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
  const canEditPostApproval = canEdit && isDeterminazioneAdottata(viewData || {})
  const canEditPostNotification = canEdit && verbaleNotificato
  const readOnlySheetInfo = React.useMemo(() => {
    if (!hasSelection || readOnlyBannerBaseMessage) return ''
    if (activeAmmSection === 'notifica' && !isDeterminazioneAdottata(viewData || {})) return 'La fase Notifica è disponibile dopo la registrazione della determinazione adottata.'
    if (activeAmmSection === 'pagamento' && !canEditPostNotification) return POST_NOTIFICATION_INFO
        if (['ricorso', 'cda', 'riapertura', 'definizione'].includes(activeAmmSection)) {
      if (!canEditPostNotification) return POST_NOTIFICATION_INFO
    }
    return ''
  }, [hasSelection, readOnlyBannerBaseMessage, activeAmmSection, canEditPostNotification, viewData])
  const readOnlyBannerMessage = [readOnlyBannerBaseMessage, readOnlySheetInfo].filter(Boolean).join(' ')
  const [readOnlyBannerMounted, setReadOnlyBannerMounted] = React.useState(false)
  const [readOnlyBannerOpen, setReadOnlyBannerOpen] = React.useState(false)
  const readOnlyBannerTimersRef = React.useRef<number[]>([])
  const clearReadOnlyBannerTimers = React.useCallback(() => {
    readOnlyBannerTimersRef.current.forEach(id => { try { window.clearTimeout(id) } catch {} })
    readOnlyBannerTimersRef.current = []
  }, [])
  const showReadOnlyBanner = React.useCallback(() => {
    clearReadOnlyBannerTimers()
    if (!readOnlyBannerMessage) {
      setReadOnlyBannerOpen(false)
      setReadOnlyBannerMounted(false)
      return
    }
    setReadOnlyBannerMounted(true)
    const openTimer = window.setTimeout(() => setReadOnlyBannerOpen(true), 20)
    const closeTimer = window.setTimeout(() => setReadOnlyBannerOpen(false), 4000)
    readOnlyBannerTimersRef.current = [openTimer, closeTimer]
  }, [clearReadOnlyBannerTimers, readOnlyBannerMessage])
  React.useEffect(() => {
    if (readOnlyBannerMessage) showReadOnlyBanner()
    else {
      clearReadOnlyBannerTimers()
      setReadOnlyBannerOpen(false)
      setReadOnlyBannerMounted(false)
    }
    return clearReadOnlyBannerTimers
  }, [readOnlyBannerMessage, showReadOnlyBanner, clearReadOnlyBannerTimers])

  const onFieldChange = React.useCallback((name: string, value: any) => {
    setDraft(prev => ({ ...(prev || {}), [name]: value }))
  }, [])

  const pendingAttrs = React.useMemo(() => changedAttrs(layerFields, initialDraft, draft), [layerFields, initialDraft, draft])
  const generalIsDirty = Object.keys(pendingAttrs).length > 0
  const determinationIsDirty =
    !sameDraftValue(pickAttrCI(initialDraft, ['determinazione_numero']), pickAttrCI(draft, ['determinazione_numero']), 'determinazione_numero') ||
    !sameDraftValue(pickAttrCI(initialDraft, ['determinazione_data']), pickAttrCI(draft, ['determinazione_data']), 'determinazione_data')
  const isDirty = generalIsDirty || determinationIsDirty

  const logLayerRef = React.useRef<any | null>(null)
  const attivitaLayerRef = React.useRef<any | null>(null)

  React.useEffect(() => {
    logLayerRef.current = null
    attivitaLayerRef.current = null
  }, [practiceContextRevision])

  const getAttivitaLayer = React.useCallback(async () => {
    if (attivitaLayerRef.current?.applyEdits) return attivitaLayerRef.current
    try {
      await ensureAttivitaCorrentiJsonOnlyQueryFormat()
      const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
      const fl = new FeatureLayer({ url: GII_ATTIVITA_CORRENTI_URL, outFields: ['*'] })
      if (typeof fl?.load === 'function') { try { await fl.load() } catch {} }
      attivitaLayerRef.current = fl
      return fl
    } catch (e) {
      console.warn('[GII_ATTIVITA_CORRENTI] Layer attività non disponibile:', e)
      return null
    }
  }, [])

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
    if (roleForLog !== 'IA' && roleForLog !== 'RIA') return 0

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


  const closeIaBozzaDeterminazioneCycle = React.useCallback(async (prevAttrs: Record<string, any>, nextAttrs: Record<string, any>, changedFieldNames: string[]) => {
    const parentGlobalId = String(
      pickAttrCI(nextAttrs, ['GlobalID', 'globalid', 'GLOBALID']) ||
      pickAttrCI(prevAttrs, ['GlobalID', 'globalid', 'GLOBALID']) ||
      pickAttrCI(data, ['GlobalID', 'globalid', 'GLOBALID']) ||
      ''
    ).trim()
    if (!parentGlobalId || oid == null) {
      console.warn('[GII_LOG_EVENTI_CICLI] Chiusura ciclo IA bozza determinazione saltata: parent_globalid non disponibile.', { oid })
      return 0
    }

    const logLayer = await getLogLayer()
    if (!logLayer?.applyEdits) return 0

    const now = Date.now()
    const roleForLog = 'IA'
    const username = String(profile.username || pickAttrCI(nextAttrs, ['bozza_determinazione_da']) || '').trim()
    const destUsername = await loadUniqueAmmRoleUsername('RIA', 'AMM')
    const logFields = (logLayer.fields || []).map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
    const delta = buildAuditDeltaMaps(prevAttrs, nextAttrs, changedFieldNames)
    const num = Object.keys(delta.oldMap).length
    const baseAttrs: Record<string, any> = {
      parent_globalid: parentGlobalId,
      parent_objectid: oid,
      ruolo_competente: roleForLog,
      utente_operatore: username,
      stato_record: 'CHIUSO',
      evento_apertura: 'PRESA_IN_CARICO',
      evento_chiusura: 'FASCICOLO_TRASMESSO_VERIFICA',
      dt_chiusura: now,
      area: 'AMM',
      settore: 'CR',
      fase: roleForLog,
      ruolo_destinatario: 'RIA',
      utente_destinatario: destUsername,
      note_chiusura: 'Fascicolo trasmesso al Responsabile dell’istruttoria amministrativa per la verifica.',
      num_campi_modificati: num,
      campi_modificati: num > 0 ? Object.keys(delta.oldMap).join(', ') : '',
      valori_prima_json: num > 0 ? JSON.stringify(delta.oldMap) : '',
      valori_dopo_json: num > 0 ? JSON.stringify(delta.newMap) : '',
      riepilogo_ciclo: 'Fascicolo trasmesso al Responsabile dell’istruttoria amministrativa per la verifica.'
    }

    try {
      const openFeature = await findOpenAmmCycle(parentGlobalId, roleForLog)
      if (openFeature?.attributes) {
        const updateAttrs = filterAttrsForLayer({
          ...baseAttrs,
          [String(logLayer.objectIdField || 'OBJECTID')]: getLogObjectIdValue(openFeature.attributes, logLayer),
          utente_operatore: username || openFeature.attributes.utente_operatore || '',
          dt_apertura: openFeature.attributes.dt_apertura || null,
          numero_ciclo_ruolo: openFeature.attributes.numero_ciclo_ruolo || null,
          session_id: openFeature.attributes.session_id || `ia-bozza-${now}`
        }, logFields)
        const res = await logLayer.applyEdits({ updateFeatures: [{ attributes: updateAttrs }] })
        const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
        if (upd?.error) throw new Error(upd.error.message || JSON.stringify(upd.error))
      } else {
        const nextNum = await getNextAmmCycleNumber(parentGlobalId, roleForLog)
        const addAttrs = filterAttrsForLayer({
          ...baseAttrs,
          numero_ciclo_ruolo: nextNum,
          dt_apertura: Number(pickAttrCI(nextAttrs, ['dt_presa_in_carico_IA', 'dt_stato_IA'])) || now,
          session_id: `ia-bozza-${now}-${Math.random().toString(36).slice(2, 8)}`
        }, logFields)
        const res = await logLayer.applyEdits({ addFeatures: [{ attributes: addAttrs }] })
        const add = res?.addFeatureResults?.[0] || res?.addResults?.[0] || null
        if (add?.error) throw new Error(add.error.message || JSON.stringify(add.error))
      }
      try { window.dispatchEvent(new CustomEvent('gii-log-eventi-cicli-changed', { detail: { source: 'gii-editing-amm-bozza-determinazione-trasmessa', oid, role: roleForLog, ts: now } })) } catch {}
      return 1
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Errore chiusura ciclo IA bozza determinazione:', e)
      return 0
    }
  }, [data, findOpenAmmCycle, getLogLayer, getNextAmmCycleNumber, oid, profile.username])



  const closeIaAttoContestazioneCycle = React.useCallback(async (prevAttrs: Record<string, any>, nextAttrs: Record<string, any>, changedFieldNames: string[]) => {
    const parentGlobalId = String(
      pickAttrCI(nextAttrs, ['GlobalID', 'globalid', 'GLOBALID']) ||
      pickAttrCI(prevAttrs, ['GlobalID', 'globalid', 'GLOBALID']) ||
      pickAttrCI(data, ['GlobalID', 'globalid', 'GLOBALID']) ||
      ''
    ).trim()
    if (!parentGlobalId || oid == null) {
      console.warn('[GII_LOG_EVENTI_CICLI] Chiusura ciclo IA Atto di contestazione saltata: parent_globalid non disponibile.', { oid })
      return 0
    }

    const logLayer = await getLogLayer()
    if (!logLayer?.applyEdits) return 0

    const now = Date.now()
    const roleForLog = 'IA'
    const username = String(profile.username || '').trim()
    const destUsername = await loadUniqueAmmRoleUsername('RIA', 'AMM')
    const logFields = (logLayer.fields || []).map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
    const delta = buildAuditDeltaMaps(prevAttrs, nextAttrs, changedFieldNames)
    const num = Object.keys(delta.oldMap).length
    const baseAttrs: Record<string, any> = {
      parent_globalid: parentGlobalId,
      parent_objectid: oid,
      ruolo_competente: roleForLog,
      utente_operatore: username,
      stato_record: 'CHIUSO',
      evento_apertura: 'PRESA_IN_CARICO',
      evento_chiusura: 'ATTO_ACCERTAMENTO_TRASMESSO_VERIFICA',
      dt_chiusura: now,
      area: 'AMM',
      settore: 'CR',
      fase: roleForLog,
      ruolo_destinatario: 'RIA',
      utente_destinatario: destUsername,
      note_chiusura: 'Atto di accertamento trasmesso al Responsabile dell’istruttoria amministrativa per la verifica.',
      num_campi_modificati: num,
      campi_modificati: num > 0 ? Object.keys(delta.oldMap).join(', ') : '',
      valori_prima_json: num > 0 ? JSON.stringify(delta.oldMap) : '',
      valori_dopo_json: num > 0 ? JSON.stringify(delta.newMap) : '',
      riepilogo_ciclo: 'Atto di accertamento trasmesso al Responsabile dell’istruttoria amministrativa per la verifica.'
    }

    try {
      const openFeature = await findOpenAmmCycle(parentGlobalId, roleForLog)
      if (openFeature?.attributes) {
        const existingOld = parseJsonObject(openFeature.attributes.valori_prima_json)
        const existingNew = parseJsonObject(openFeature.attributes.valori_dopo_json)
        const merged = mergeAuditCycleMaps(existingOld, existingNew, delta.oldMap, delta.newMap)
        const mergedNum = merged.fields.length
        const updateAttrs = filterAttrsForLayer({
          ...baseAttrs,
          [String(logLayer.objectIdField || 'OBJECTID')]: getLogObjectIdValue(openFeature.attributes, logLayer),
          utente_operatore: username || openFeature.attributes.utente_operatore || '',
          dt_apertura: openFeature.attributes.dt_apertura || null,
          numero_ciclo_ruolo: openFeature.attributes.numero_ciclo_ruolo || null,
          session_id: openFeature.attributes.session_id || `ia-atto-${now}`,
          num_campi_modificati: mergedNum,
          campi_modificati: mergedNum > 0 ? merged.fields.join(', ') : '',
          valori_prima_json: mergedNum > 0 ? JSON.stringify(merged.oldMap) : '',
          valori_dopo_json: mergedNum > 0 ? JSON.stringify(merged.newMap) : ''
        }, logFields)
        const res = await logLayer.applyEdits({ updateFeatures: [{ attributes: updateAttrs }] })
        const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
        if (upd?.error) throw new Error(upd.error.message || JSON.stringify(upd.error))
      } else {
        const nextNum = await getNextAmmCycleNumber(parentGlobalId, roleForLog)
        const addAttrs = filterAttrsForLayer({
          ...baseAttrs,
          numero_ciclo_ruolo: nextNum,
          dt_apertura: Number(pickAttrCI(prevAttrs, ['dt_presa_in_carico_IA', 'dt_stato_IA'])) || now,
          session_id: `ia-atto-${now}-${Math.random().toString(36).slice(2, 8)}`
        }, logFields)
        const res = await logLayer.applyEdits({ addFeatures: [{ attributes: addAttrs }] })
        const add = res?.addFeatureResults?.[0] || res?.addResults?.[0] || null
        if (add?.error) throw new Error(add.error.message || JSON.stringify(add.error))
      }
      try { window.dispatchEvent(new CustomEvent('gii-log-eventi-cicli-changed', { detail: { source: 'gii-editing-amm-atto-contestazione-trasmesso', oid, role: roleForLog, ts: now } })) } catch {}
      return 1
    } catch (e) {
      console.warn('[GII_LOG_EVENTI_CICLI] Errore chiusura ciclo IA Atto di contestazione:', e)
      return 0
    }
  }, [data, findOpenAmmCycle, getLogLayer, getNextAmmCycleNumber, oid, profile.username])


  const deleteCurrentAmmActivitiesForRole = React.useCallback(async (roleRaw: string, sourceAttrs?: Record<string, any>, excludeKey?: string) => {
    try {
      const layer = await getAttivitaLayer()
      if (!layer?.queryFeatures || !layer?.applyEdits) return
      const merged = { ...(data || {}), ...(sourceAttrs || {}) }
      const parentGlobalId = String(pickAttrCI(merged, ['globalid', 'GlobalID', 'GLOBALID', 'global_id']) || '').trim()
      const oidFromAttrs = pickAttrCI(merged, [String(layer.objectIdField || 'OBJECTID'), 'OBJECTID', 'ObjectID', 'ObjectId', 'objectId', 'objectid'])
      const oidNumber = Number.isFinite(Number(oidFromAttrs)) ? Number(oidFromAttrs) : (oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null)
      const ruoloDest = String(roleRaw || '').trim().toUpperCase()
      if (!ruoloDest) return

      const targetParts: string[] = []
      if (parentGlobalId) targetParts.push(`(${parentGlobalIdWhereForLog(parentGlobalId)})`)
      if (oidNumber != null) targetParts.push(`parent_objectid = ${oidNumber}`)
      if (!targetParts.length) return

      const parts: string[] = [
        `tipo_attivita = 'PRESA_IN_CARICO'`,
        `destinatario_ruolo = ${sqlQuote(ruoloDest)}`,
        `(${targetParts.join(' OR ')})`
      ]
      const keepKey = String(excludeKey || '').trim()
      if (keepKey) parts.push(`chiave_attivita <> ${sqlQuote(keepKey)}`)

      const q = layer.createQuery ? layer.createQuery() : {}
      q.where = parts.join(' AND ')
      q.outFields = [String(layer.objectIdField || 'OBJECTID')]
      q.returnGeometry = false
      const found = await layer.queryFeatures(q)
      const oidField = String(layer.objectIdField || 'OBJECTID')
      const deletes = (found?.features || [])
        .map((f: any) => pickAttrCI(f?.attributes || {}, [oidField, 'OBJECTID', 'ObjectID', 'ObjectId', 'objectId', 'objectid']))
        .filter((v: any) => v != null)
        .map((objectId: any) => ({ objectId }))
      if (deletes.length) await layer.applyEdits({ deleteFeatures: deletes })
    } catch (e) {
      console.warn('[GII_ATTIVITA_CORRENTI] Errore eliminazione attività corrente amministrativa:', e)
    }
  }, [data, getAttivitaLayer, oid])


  const createRiaBozzaDeterminazioneActivity = React.useCallback(async (overrideAttrs: Record<string, any>) => {
    try {
      const layer = await getAttivitaLayer()
      if (!layer?.applyEdits) return
      const now = Date.now()
      const overrideHasGlobalId = !!String(pickAttrCI(overrideAttrs || {}, ['globalid', 'GlobalID', 'GLOBALID', 'global_id']) || '').trim()
      const merged = overrideHasGlobalId ? { ...(overrideAttrs || {}) } : { ...(data || {}), ...(overrideAttrs || {}) }
      const parentGlobalId = String(pickAttrCI(merged, ['globalid', 'GlobalID', 'GLOBALID', 'global_id']) || '').trim()
      if (!parentGlobalId) {
        console.warn('[GII_ATTIVITA_CORRENTI] Attività bozza determinazione saltata: GlobalID pratica non disponibile.', { oid })
        return
      }
      const oidFromMerged = pickAttrCI(merged, ['OBJECTID', 'ObjectID', 'ObjectId', 'objectId', 'objectid'])
      const oidNumber = Number.isFinite(Number(oidFromMerged)) ? Number(oidFromMerged) : (oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null)
      const numeroRapporto = getReportCode(merged, oidNumber)
      const destUsername = await loadUniqueAmmRoleUsername('RIA', 'AMM')
      const mittente = String(profile.fullName || profile.username || 'Istruttore amministrativo').trim()
      const key = `${parentGlobalId}|PRESA_IN_CARICO|FASCICOLO_TRASMESSO_VERIFICA|RIA|AMM||${destUsername}`
      const attrs: Record<string, any> = {
        chiave_attivita: key,
        parent_globalid: parentGlobalId,
        parent_objectid: oidNumber,
        numero_rapporto: numeroRapporto,
        tipo_attivita: 'PRESA_IN_CARICO',
        sottotipo_attivita: 'FASCICOLO_TRASMESSO_VERIFICA',
        titolo: 'Fascicolo da verificare',
        messaggio: `Fascicolo istruttorio della pratica n. ${numeroRapporto || '—'} da prendere in carico per la verifica.\nMittente: ${mittente}`,
        destinatario_ruolo: 'RIA',
        destinatario_area: 'AMM',
        destinatario_settore: 'CR',
        destinatario_ufficio_id: null,
        destinatario_ufficio_zona: null,
        destinatario_username: destUsername || null,
        origine_evento: 'FASCICOLO_TRASMESSO_VERIFICA',
        priorita: 'INFO',
        data_attivazione: now,
        creato_il: now,
        creato_da: String(profile.username || ''),
        aggiornato_il: now,
        aggiornato_da: String(profile.username || '')
      }
      const activityFields = (layer.fields || []).map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
      const cleanAttrs = filterAttrsForLayer(attrs, activityFields)
      await deleteCurrentAmmActivitiesForRole('IA', merged)
      await deleteCurrentAmmActivitiesForRole('RIA', merged, key)
      const chiaveField = realFieldName(activityFields, 'chiave_attivita') || 'chiave_attivita'
      const chiaveValue = cleanAttrs[chiaveField]
      let existingOid: any = null
      if (layer.queryFeatures && chiaveValue) {
        try {
          const q = layer.createQuery ? layer.createQuery() : {}
          q.where = `${chiaveField} = ${sqlQuote(String(chiaveValue))}`
          q.outFields = ['*']
          q.returnGeometry = false
          q.num = 1
          const found = await layer.queryFeatures(q)
          const existing = found?.features?.[0]?.attributes || null
          existingOid = existing ? pickAttrCI(existing, [String(layer.objectIdField || 'OBJECTID'), 'OBJECTID', 'objectid', 'ObjectId', 'objectId']) : null
        } catch {}
      }
      if (existingOid != null) {
        const oidField = String(layer.objectIdField || 'OBJECTID')
        await layer.applyEdits({ updateFeatures: [{ attributes: { ...cleanAttrs, [oidField]: existingOid } }] })
      } else {
        await layer.applyEdits({ addFeatures: [{ attributes: cleanAttrs }] })
      }
      try { window.dispatchEvent(new CustomEvent('gii-alerts-refresh', { detail: { source: 'gii-editing-amm-bozza-ria', key, oid, ts: now } })) } catch {}
    } catch (e) {
      console.warn('[GII_ATTIVITA_CORRENTI] Errore creazione attività bozza determinazione:', e)
    }
  }, [data, deleteCurrentAmmActivitiesForRole, getAttivitaLayer, oid, profile.fullName, profile.username])

  const createRiaAttoContestazioneActivity = React.useCallback(async (overrideAttrs: Record<string, any>) => {
    try {
      const layer = await getAttivitaLayer()
      if (!layer?.applyEdits) return
      const now = Date.now()
      const overrideHasGlobalId = !!String(pickAttrCI(overrideAttrs || {}, ['globalid', 'GlobalID', 'GLOBALID', 'global_id']) || '').trim()
      const merged = overrideHasGlobalId ? { ...(overrideAttrs || {}) } : { ...(data || {}), ...(overrideAttrs || {}) }
      const parentGlobalId = String(pickAttrCI(merged, ['globalid', 'GlobalID', 'GLOBALID', 'global_id']) || '').trim()
      if (!parentGlobalId) {
        console.warn('[GII_ATTIVITA_CORRENTI] Attività Atto di contestazione saltata: GlobalID pratica non disponibile.', { oid })
        return
      }
      const oidFromMerged = pickAttrCI(merged, ['OBJECTID', 'ObjectID', 'ObjectId', 'objectId', 'objectid'])
      const oidNumber = Number.isFinite(Number(oidFromMerged)) ? Number(oidFromMerged) : (oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null)
      const numeroRapporto = getReportCode(merged, oidNumber)
      const destUsername = await loadUniqueAmmRoleUsername('RIA', 'AMM')
      const mittente = String(profile.fullName || profile.username || 'Istruttore amministrativo').trim()
      const key = `${parentGlobalId}|PRESA_IN_CARICO|ATTO_ACCERTAMENTO_TRASMESSO_VERIFICA|RIA|AMM||${destUsername}`
      const attrs: Record<string, any> = {
        chiave_attivita: key,
        parent_globalid: parentGlobalId,
        parent_objectid: oidNumber,
        numero_rapporto: numeroRapporto,
        tipo_attivita: 'PRESA_IN_CARICO',
        sottotipo_attivita: 'ATTO_ACCERTAMENTO_TRASMESSO_VERIFICA',
        titolo: 'Atto di accertamento da verificare',
        messaggio: `Atto di accertamento della pratica n. ${numeroRapporto || '—'} da prendere in carico per la verifica.\nMittente: ${mittente}`,
        destinatario_ruolo: 'RIA',
        destinatario_area: 'AMM',
        destinatario_settore: 'CR',
        destinatario_ufficio_id: null,
        destinatario_ufficio_zona: null,
        destinatario_username: destUsername || null,
        origine_evento: 'ATTO_ACCERTAMENTO_TRASMESSO_VERIFICA',
        priorita: 'INFO',
        data_attivazione: now,
        creato_il: now,
        creato_da: String(profile.username || ''),
        aggiornato_il: now,
        aggiornato_da: String(profile.username || '')
      }
      const activityFields = (layer.fields || []).map((f: any) => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
      const cleanAttrs = filterAttrsForLayer(attrs, activityFields)
      await deleteCurrentAmmActivitiesForRole('IA', merged)
      await deleteCurrentAmmActivitiesForRole('RIA', merged, key)
      const chiaveField = realFieldName(activityFields, 'chiave_attivita') || 'chiave_attivita'
      const chiaveValue = cleanAttrs[chiaveField]
      let existingOid: any = null
      if (layer.queryFeatures && chiaveValue) {
        try {
          const q = layer.createQuery ? layer.createQuery() : {}
          q.where = `${chiaveField} = ${sqlQuote(String(chiaveValue))}`
          q.outFields = ['*']
          q.returnGeometry = false
          q.num = 1
          const found = await layer.queryFeatures(q)
          const existing = found?.features?.[0]?.attributes || null
          existingOid = existing ? pickAttrCI(existing, [String(layer.objectIdField || 'OBJECTID'), 'OBJECTID', 'objectid', 'ObjectId', 'objectId']) : null
        } catch {}
      }
      if (existingOid != null) {
        const oidField = String(layer.objectIdField || 'OBJECTID')
        await layer.applyEdits({ updateFeatures: [{ attributes: { ...cleanAttrs, [oidField]: existingOid } }] })
      } else {
        await layer.applyEdits({ addFeatures: [{ attributes: cleanAttrs }] })
      }
      try { window.dispatchEvent(new CustomEvent('gii-alerts-refresh', { detail: { source: 'gii-editing-amm-atto-ria', key, oid, ts: now } })) } catch {}
    } catch (e) {
      console.warn('[GII_ATTIVITA_CORRENTI] Errore creazione attività Atto di contestazione:', e)
    }
  }, [data, deleteCurrentAmmActivitiesForRole, getAttivitaLayer, oid, profile.fullName, profile.username])

  const handleApponiAttestazioneIa = React.useCallback(async (noteInput: string) => {
    setPendingAttestationText(null)
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di apporre il visto di conformità.' })
      return
    }
    if (!active?.ds) {
      setDialog({ kind: 'err', title: 'Operazione non disponibile', text: 'Configurazione non disponibile. Contattare l’amministratore.' })
      return
    }
    if (String(profile.role || '').toUpperCase() !== 'IA') {
      setDialog({ kind: 'warn', title: 'Profilo non abilitato', text: 'Operazione non consentita per il profilo corrente.' })
      return
    }
    if (!canEdit) {
      setDialog({ kind: 'warn', title: 'Scheda in sola lettura', text: 'La pratica non è attualmente modificabile dal profilo corrente.' })
      return
    }

    const operationContextStamp = getGiiPracticeContextStamp()
    const operationContextIsCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!operationContextIsCurrent()) return false
    setSaving(true)
    try {
      const layer = await resolveLayerForEdit(active.ds, active.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
      if (!layer?.applyEdits) throw new Error('Configurazione non disponibile. Contattare l’amministratore.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
      const layerUrl = normalizeEditLayerUrl(active.layerUrl || (configuredDsState as any)?.layerUrl || layer?.url || getDataSourceUrl(configuredDs))
      const fields = layer?.fields?.length ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false })) : layerFields
      const idName = realFieldName(fields, active.idFieldName) || active.idFieldName || 'OBJECTID'
      const base = { ...(initialDraft || {}), ...(draft || {}) }
      if (isDeterminazioneAdottata(base)) {
        setDialog({ kind: 'warn', title: 'Flusso bloccato', text: 'La determinazione risulta già approvata/adottata. Non è più possibile riapporre il visto o riaprire il flusso di approvazione della Proposta.' })
        return
      }
      const now = Date.now()
      const attrs: Record<string, any> = { [idName]: Number(oid) }
      const put = (name: string, value: any) => {
        const real = realFieldName(fields, name)
        if (real) attrs[real] = value
      }
      const defaultAttestationNote = 'A seguito della verifica svolta, si attesta la conformità della pratica sotto il profilo istruttorio-amministrativo.'
      const requestedAttestationNote = String(noteInput || '').trim()
      const note = /motivazione\s+del\s+rimando|integrazion|rettific/i.test(requestedAttestationNote)
        ? defaultAttestationNote
        : (requestedAttestationNote || defaultAttestationNote)
      put('esito_IA', 2)
      put('dt_esito_IA', now)
      put('note_IA', note)

      // Ogni nuovo visto apre la fase di predisposizione della bozza del ciclo
      // corrente. È indispensabile riportare esplicitamente lo stato a BOZZA:
      // altrimenti può sopravvivere uno stato avanzato del ciclo precedente
      // e tutti i comandi IA restano erroneamente bloccati.
      put('determinazione_stato', 'BOZZA')

      // Il visto dell’IA non apre alcun nodo operativo RIA: l'unico invio
      // al Responsabile avviene con "Trasmetti fascicolo al Responsabile".
      // Chiudiamo quindi eventuali stati/attività RIA residui creati da versioni
      // precedenti o da prove intermedie del flusso.
      put('stato_RIA', 4)
      put('dt_stato_RIA', null)
      put('dt_presa_in_carico_RIA', null)
      put('esito_RIA', null)
      put('dt_esito_RIA', null)
      put('note_RIA', null)

      // Il nuovo visto apre un nuovo ciclo: il protocollo del fascicolo precedente
      // non può restare valido nella nuova versione.
      put('protocollo_fascicolo_numero', null)
      put('protocollo_fascicolo_data', null)

      // Si azzerano soltanto i metadati della vecchia bozza. NON va azzerato
      // determinazione_stato, che poche righe sopra è stato impostato a BOZZA.
      // Lo stato apre il nuovo ciclo, mentre data/autore verranno valorizzati soltanto
      // dalla successiva generazione effettiva del Word.
      put('dt_bozza_determinazione', null)
      put('bozza_determinazione_da', null)

      // Il visto non trasferisce ancora la pratica: il Istruttore amministrativo
      // deve predisporre/caricare la bozza e poi trasmettere il fascicolo istruttorio
      // al Responsabile dell’istruttoria amministrativa con l’apposito pulsante interno.

      let prevRecordAttrs = { ...(initialDraft || {}) }
      try {
        const liveAttrs = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (liveAttrs && Object.keys(liveAttrs).length) prevRecordAttrs = liveAttrs
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Impossibile rileggere il record amministrativo prima del visto di conformità:', e)
      }

      const cleanAttrs = filterAttrsForLayer(attrs, fields)
      if (!operationContextIsCurrent()) return
      const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
      const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
      const err = upd?.error
      const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
      if (!ok) {
        const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
        throw new Error(detail)
      }

      const propostaBlob = await buildVerbalePdfBlob({ ...base, ...cleanAttrs, ...automaticValues }, fields, { username: profile.username, fullName: profile.fullName })
      const propostaFile = new File([propostaBlob.blob], propostaBlob.fileName, { type: 'application/pdf', lastModified: now })
      await replacePropostaContestazionePdfAttachment(layer, Number(oid), propostaFile, layerUrl, 'DRAFT')
      await deleteBozzaDeterminazioneAttachments(layer, Number(oid), layerUrl)

      const changedFieldNames = Object.keys(cleanAttrs).filter(k => k !== idName)
      const nextRecordAttrs = { ...prevRecordAttrs, ...cleanAttrs }
      await upsertAmmCycleAudit(prevRecordAttrs, nextRecordAttrs, changedFieldNames)
      await deleteCurrentAmmActivitiesForRole('RIA', nextRecordAttrs)
      if (operationContextIsCurrent()) await refreshDs(active.ds, props.id)
      if (!operationContextIsCurrent()) return
      const next = { ...nextRecordAttrs }
      setInitialDraft(next)
      setDraft(next)
      setDialog({ kind: 'ok', title: 'Visto apposto', text: 'Visto apposto. Predisporre la determinazione.' })
      try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm-attestazione-conformita' } })) } catch {}
      try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: Number(oid), source: 'gii-editing-amm-attestazione-conformita', ts: Date.now() } })) } catch {}
      try { window.dispatchEvent(new CustomEvent('gii-alerts-refresh', { detail: { oid: Number(oid), source: 'gii-editing-amm-attestazione-conformita', ts: Date.now() } })) } catch {}
    } catch (e: any) {
      if (operationContextIsCurrent()) setDialog({ kind: 'err', title: 'Errore visto di conformità', text: e?.message || String(e) })
    } finally {
      if (operationContextIsCurrent()) setSaving(false)
    }
  }, [active, automaticValues, canEdit, configuredDs, configuredDsState, deleteCurrentAmmActivitiesForRole, hasSelection, initialDraft, draft, layerFields, oid, profile.fullName, profile.role, profile.username, refreshDs, upsertAmmCycleAudit])

  const handleUndoAttestazioneIa = React.useCallback(async () => {
    setPendingUndoAttestation(false)
    setDialog({
      kind: 'warn',
      title: 'Comando non disponibile',
      text: 'Operazione non disponibile da questa scheda.'
    })
  }, [])

  const handleReset = () => {
    setDraft({ ...(initialDraft || {}) })
  }


  const getCompletionIssues = React.useCallback((source: Record<string, any>): string[] => {
    const current = source || {}
    const issues: string[] = []
    if (tipoAttoAmmPrevedeVerbale(current) && !hasAdminValue(verbaleNumberValue(current))) issues.push('Atto di accertamento: numero interno non disponibile.')
    if (!hasAdminValue(pickAttrCI(current, ['esito_IA'])) || !hasAdminValue(pickAttrCI(current, ['note_IA', 'note_atto_amm']))) issues.push('Esito verifica dell’Istruttore amministrativo: esito o note non ancora acquisiti.')
    const protocolloNumero = pickAttrCI(current, ['protocollo_atto_accertamento_numero'])
    const protocolloData = pickAttrCI(current, ['protocollo_atto_accertamento_data'])
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

    const approvalMs = dateMsOrNull(pickAttrCI(current, ['determinazione_data']))
    const protocolloMs = dateMsOrNull(protocolloData)
    const notificaMs = dateMsOrNull(notificaData)
    if (approvalMs != null && protocolloMs != null && protocolloMs < approvalMs) issues.push('Protocollo: la data non può precedere la data della determinazione adottata.')
    if (protocolloMs != null && notificaMs != null && notificaMs < protocolloMs) issues.push('Notifica: la data non può precedere la data di protocollo dell’atto.')
    const totale = parseNumberInput(pickAttrCI(current, ['pagamento_importo_totale'])) || 0
    if (totale > 0) {
      const mode = getPaymentMode(current, layerFields)
      if (!mode) issues.push('Pagamento: indicare la modalità di pagamento.')
      if (!hasAdminValue(pickAttrCI(current, ['pagamento_scadenza']))) issues.push('Pagamento: indicare la scadenza pagamento.')
      if (!hasAdminValue(pickAttrCI(current, ['pagamento_stato']))) issues.push('Pagamento: indicare lo stato pagamento.')
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
      if (paymentStatus === 'PARZIALE' && !(paid > 0 && paid < totale - 0.005)) issues.push('Pagamento: verificare l’importo incassato.')
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

  const buildBozzaDeterminazioneSource = React.useCallback((source?: Record<string, any>) => {
    return source ? { ...(data || {}), ...(source || {}), ...automaticValues } : { ...(data || {}), ...(draft || {}), ...automaticValues }
  }, [automaticValues, data, draft])

  const handleGenerateBozzaDeterminazioneWord = async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di generare la bozza Word della determinazione.' })
      return
    }
    if (!active?.ds) {
      setDialog({ kind: 'err', title: 'Operazione non disponibile', text: 'Configurazione non disponibile. Contattare l’amministratore.' })
      return
    }
    if (!roleAllowed) {
      setDialog({ kind: 'err', title: 'Profilo non abilitato', text: 'Il profilo rilevato non è abilitato alla fase amministrativa.' })
      return
    }
    if (!canEdit) {
      setDialog({ kind: 'warn', title: 'Scheda in sola lettura', text: 'Il profilo corrente può consultare la scheda, ma non generare la bozza.' })
      return
    }
    const base = buildBozzaDeterminazioneSource()
    if (isDeterminazioneAdottata(base)) {
      setDialog({ kind: 'warn', title: 'Flusso bloccato', text: 'La determinazione è già approvata o adottata.' })
      return
    }
    const esitoIa = parseNumberInput(pickAttrCI(base, ['esito_IA']))
    if (esitoIa !== 2) {
      setDialog({ kind: 'warn', title: 'Visto mancante', text: 'Apporre il visto di conformità prima di generare la bozza di determinazione.' })
      return
    }
    const propostaApprovataRia = isPropostaContestazioneApprovedByRia(base)
    if (propostaApprovataRia && (!hasAdminValue(pickAttrCI(base, ['protocollo_fascicolo_numero'])) || !hasAdminValue(pickAttrCI(base, ['protocollo_fascicolo_data'])))) {
      setDialog({ kind: 'warn', title: 'Protocollo fascicolo incompleto', text: 'Acquisire prima il fascicolo protocollato.' })
      return
    }
    const currentStato = determinationWorkflowState(base)
    const bozzaRientrataDaRia = isBozzaDeterminazioneRientrataDaRia(base)
    if (currentStato && currentStato !== 'BOZZA' && !bozzaRientrataDaRia) {
      setDialog({ kind: 'warn', title: 'Bozza già avanzata', text: 'La determinazione non è modificabile nella fase corrente.' })
      return
    }

    const operationContextStamp = getGiiPracticeContextStamp()
    const operationContextIsCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!operationContextIsCurrent()) return
    setSaving(true)
    try {
      const { blob, fileName } = await buildBozzaDeterminazioneDocxBlob(base, layerFields, profile)
      if (!operationContextIsCurrent()) return
      downloadBlobFile(blob, fileName)

      const layer = await resolveLayerForEdit(active.ds, active.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
      if (!layer?.applyEdits) throw new Error('Configurazione non disponibile. Contattare l’amministratore.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch { } }
      const fields = layer?.fields?.length ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false })) : layerFields
      const idName = realFieldName(fields, active.idFieldName) || active.idFieldName || 'OBJECTID'
      const currentDeterminationState = determinationWorkflowState(base)
      const postApprovalDefinitiveUpdate =
        isPropostaContestazioneApprovedByRia(base) &&
        hasAdminValue(pickAttrCI(base, ['protocollo_fascicolo_numero'])) &&
        hasAdminValue(pickAttrCI(base, ['protocollo_fascicolo_data']))

      const nextDraft: Record<string, any> = {
        ...(draft || {}),

        // Generare/aggiornare il Word non apre un nuovo ciclo.
        // Dopo l'approvazione e il protocollo si conserva integralmente lo stato
        // corrente; nelle fasi di lavorazione iniziali/rimandate si mantiene BOZZA.
        determinazione_stato: postApprovalDefinitiveUpdate
          ? (currentDeterminationState || 'VALIDATA_RIA')
          : 'BOZZA'
      }
      if (realFieldName(fields, 'dt_bozza_determinazione')) nextDraft.dt_bozza_determinazione = Date.now()
      if (realFieldName(fields, 'bozza_determinazione_da')) nextDraft.bozza_determinazione_da = profile.fullName || profile.username || ''
      const attrs: Record<string, any> = {}
      ;['determinazione_stato', 'dt_bozza_determinazione', 'bozza_determinazione_da'].forEach(name => {
        const real = realFieldName(fields, name)
        if (!real) return
        const value = pickAttrCI(nextDraft, [real, name])
        if (value !== undefined) attrs[real] = value == null || value === '' ? null : value
      })
      let prevRecordAttrs = { ...(initialDraft || {}) }
      try {
        const liveAttrs = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (liveAttrs && Object.keys(liveAttrs).length) prevRecordAttrs = liveAttrs
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Impossibile rileggere il record amministrativo prima della generazione bozza determinazione:', e)
      }
      const cleanAttrs = filterAttrsForLayer({ [idName]: Number(oid), ...attrs }, fields)
      if (Object.keys(cleanAttrs).some(k => k !== idName)) {
        if (!operationContextIsCurrent()) return
        const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
        const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
        const err = upd?.error
        const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
        if (!ok) {
          const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
          throw new Error(detail)
        }
        const changedFieldNames = Object.keys(cleanAttrs).filter(k => k !== idName)
        await upsertAmmCycleAudit(prevRecordAttrs, { ...prevRecordAttrs, ...cleanAttrs }, changedFieldNames)
        if (operationContextIsCurrent()) await refreshDs(active.ds, props.id)
        if (!operationContextIsCurrent()) return
        const savedAttrs = { ...cleanAttrs }
        delete savedAttrs[idName]
        setInitialDraft(prev => ({ ...(prev || {}), ...savedAttrs }))
        setDraft(prev => ({ ...(prev || {}), ...savedAttrs }))
      }

      // La generazione del Word è deliberatamente non distruttiva:
      // il PDF già presente resta nel fascicolo finché il IA non carica
      // esplicitamente una nuova versione.
      setDialog({
        kind: 'ok',
        title: postApprovalDefinitiveUpdate ? 'Bozza Word definitiva aggiornata' : 'Bozza Word generata',
        text: postApprovalDefinitiveUpdate
          ? 'È stata generata la copia Word aggiornata con i dati correnti della pratica. L’approvazione del Responsabile dell’istruttoria amministrativa, il protocollo del fascicolo e il PDF già caricato restano invariati. Caricare un nuovo PDF solo se si intende sostituire il documento corrente.'
          : 'È stata generata la copia Word di lavoro. Il PDF eventualmente già caricato resta invariato finché non viene sostituito esplicitamente con un nuovo PDF.'
      })
      try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm-bozza-determinazione-word' } })) } catch {}
    } catch (e: any) {
      if (operationContextIsCurrent()) setDialog({ kind: 'err', title: 'Errore generazione bozza Word', text: e?.message || String(e) })
    } finally {
      if (operationContextIsCurrent()) setSaving(false)
    }
  }

  const handleDeleteBozzaDeterminazione = async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di eliminare il PDF.' })
      return false
    }
    if (!active?.ds) {
      setDialog({ kind: 'err', title: 'Operazione non disponibile', text: 'Configurazione non disponibile. Contattare l’amministratore.' })
      return false
    }
    if (!roleAllowed) {
      setDialog({ kind: 'err', title: 'Profilo non abilitato', text: 'Il profilo rilevato non è abilitato alla fase amministrativa.' })
      return false
    }
    if (!canEdit) {
      setDialog({ kind: 'warn', title: 'Scheda in sola lettura', text: 'Il profilo corrente può consultare la scheda, ma non eliminare il PDF.' })
      return false
    }

    const base = buildBozzaDeterminazioneSource()
    const currentStato = determinationWorkflowState(base)
    const bozzaRimandataDaResponsabile = isBozzaDeterminazioneRimandataDaRia(base)
    const bozzaInLavorazione =
      currentStato === 'BOZZA' ||
      bozzaRimandataDaResponsabile

    const operationContextStamp = getGiiPracticeContextStamp()
    const operationContextIsCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!operationContextIsCurrent()) return false

    setSaving(true)
    try {
      const layer = await resolveLayerForEdit(
        active.ds,
        active.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs)
      )
      const layerUrl = normalizeEditLayerUrl(
        active.layerUrl ||
        (configuredDsState as any)?.layerUrl ||
        layer?.url ||
        getDataSourceUrl(active.ds) ||
        getDataSourceUrl(configuredDs)
      )
      if (!layerUrl) throw new Error('Documento non disponibile.')

      const allAttachments = await queryAmmAttachments(layer, Number(oid), layerUrl)
      const pdfs = allAttachments.filter(att => isGiiBozzaDeterminazionePdfAttachment(att as any))
      if (!pdfs.length) {
        setDialog({ kind: 'warn', title: 'PDF non presente', text: 'Non risulta alcun PDF della determinazione da eliminare.' })
        return false
      }

      const approved = isPropostaContestazioneApprovedByRia(base)
      const canDeleteCurrentPdf = bozzaInLavorazione && !approved

      if (!canDeleteCurrentPdf) {
        setDialog({
          kind: 'warn',
          title: 'PDF non eliminabile in questa fase',
          text: approved
            ? 'Il PDF è cristallizzato dopo l’approvazione del Responsabile dell’istruttoria amministrativa e non può essere eliminato o sostituito liberamente. Il PDF della determinazione può essere prodotto esclusivamente dal flusso controllato post-protocollo; per modificare il contenuto approvato è necessario aprire un nuovo ciclo di verifica con il Responsabile dell’istruttoria amministrativa.'
            : 'Il PDF non può essere eliminato mentre la pratica è in verifica presso il Responsabile dell’istruttoria amministrativa. Se il Responsabile rimanda la pratica, il nuovo ciclo tornerà modificabile.'
        })
        return false
      }

      if (!operationContextIsCurrent()) return false
      for (const att of pdfs) {
        const attId = Number(att.id)
        if (Number.isFinite(attId) && attId > 0) {
          await deleteAmmAttachment(layer, Number(oid), attId, layerUrl)
        }
      }

      if (!operationContextIsCurrent()) return true
      setDialog({
        kind: 'ok',
        title: 'Bozza PDF eliminata',
        text: 'Il PDF è stato eliminato. Il Word di lavoro, il visto e lo stato della pratica restano invariati; è possibile generare nuovamente il Word oppure caricare un nuovo PDF.'
      })
      try {
        window.dispatchEvent(new CustomEvent('gii:record-updated', {
          detail: {
            oid: Number(oid),
            source: 'gii-editing-amm-pdf-determinazione-eliminato',
            ts: Date.now()
          }
        }))
      } catch {}
      return true
    } catch (e: any) {
      if (operationContextIsCurrent()) {
        setDialog({ kind: 'err', title: 'Errore eliminazione PDF', text: e?.message || String(e) })
      }
      return false
    } finally {
      if (operationContextIsCurrent()) setSaving(false)
    }
  }

  const handleTransmitBozzaDeterminazioneRia = async (confirmed = false) => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di trasmettere il fascicolo.' })
      return
    }
    if (!active?.ds) {
      setDialog({ kind: 'err', title: 'Operazione non disponibile', text: 'Configurazione non disponibile. Contattare l’amministratore.' })
      return
    }
    if (!roleAllowed) {
      setDialog({ kind: 'err', title: 'Profilo non abilitato', text: 'Il profilo rilevato non è abilitato alla fase amministrativa.' })
      return
    }
    if (!canEdit) {
      setDialog({ kind: 'warn', title: 'Scheda in sola lettura', text: 'Il profilo corrente può consultare la scheda, ma non trasmettere il fascicolo.' })
      return
    }

    const previewBase = buildBozzaDeterminazioneSource()
    if (isPropostaContestazioneApprovedByRia(previewBase)) {
      setDialog({
        kind: 'warn',
        title: 'Verifica amministrativa già approvata',
        text: 'La verifica amministrativa è già conclusa. Per modificare il contenuto approvato utilizzare Rimanda; la pratica tornerà quindi nella fase di predisposizione della nuova bozza.'
      })
      return
    }

    if (!confirmed) {
      setConfirmTransmitReopensCycle(false)
      setConfirmTransmitBozza(true)
      return
    }

    const operationContextStamp = getGiiPracticeContextStamp()
    setSaving(true)
    try {
      const layer = await resolveLayerForEdit(active.ds, active.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
      if (!layer?.applyEdits) throw new Error('Configurazione non disponibile. Contattare l’amministratore.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch { } }
      const layerUrl = normalizeEditLayerUrl(active.layerUrl || (configuredDsState as any)?.layerUrl || layer?.url || getDataSourceUrl(configuredDs))
      const fields = layer?.fields?.length ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false })) : layerFields
      const idName = realFieldName(fields, active.idFieldName) || active.idFieldName || 'OBJECTID'
      const base = buildBozzaDeterminazioneSource()
      if (isDeterminazioneAdottata(base)) {
        setDialog({ kind: 'warn', title: 'Flusso bloccato', text: 'La determinazione risulta già approvata/adottata. Non è più possibile riaprire il flusso di approvazione della Proposta.' })
        return
      }
      const esitoIa = parseNumberInput(pickAttrCI(base, ['esito_IA']))
      if (esitoIa !== 2) {
        setDialog({ kind: 'warn', title: 'Visto mancante', text: 'Apporre il visto di conformità prima di trasmettere il fascicolo al Responsabile dell’istruttoria amministrativa.' })
        return
      }
      const propostaGiaApprovataRia = isPropostaContestazioneApprovedByRia(base)
      if (propostaGiaApprovataRia) {
        setDialog({
          kind: 'warn',
          title: 'Verifica amministrativa già approvata',
          text: 'La verifica amministrativa è già conclusa. Per modificare il contenuto approvato utilizzare Rimanda.'
        })
        return
      }
      const statoCorrente = determinationWorkflowState(base)
      const bozzaRientrataDaRia = isBozzaDeterminazioneRientrataDaRia(base)
      if (statoCorrente && statoCorrente !== 'BOZZA' && !bozzaRientrataDaRia) {
        setDialog({ kind: 'warn', title: 'Fascicolo già trasmesso', text: 'Il fascicolo istruttorio risulta già trasmesso o avanzato nella fase successiva.' })
        return
      }

      const attachments = await queryAmmAttachments(layer, Number(oid), layerUrl)
      if (!isGiiPracticeContextStampCurrent(operationContextStamp)) return
      const bozzaPdfs = attachments.filter(isGiiBozzaDeterminazionePdfAttachment)
      if (!bozzaPdfs.length) {
        setDialog({ kind: 'warn', title: 'Bozza PDF non caricata', text: 'Caricare la bozza PDF prima di trasmettere il fascicolo al Responsabile dell’istruttoria amministrativa.' })
        return
      }

      // Il riferimento di verifica viene acquisito dall'esatto PDF che sta per
      // essere trasmesso a RIA. In questo modo l'approvazione successiva è
      // verificabile anche se il PDF materiale verrà poi sostituito dal definitivo.
      const bozzaTrasmessa = pickLatestGiiAttachment(bozzaPdfs as any[]) as AmmAttachmentInfo | null
      if (!bozzaTrasmessa) throw new Error('Bozza PDF da trasmettere non identificabile.')
      const bozzaTrasmessaBlob = await fetchAmmAttachmentBlobForPdf(bozzaTrasmessa, Number(oid), layerUrl)
      await replaceApprovedBozzaReferenceAttachment(layer, Number(oid), layerUrl, bozzaTrasmessaBlob)

      const now = Date.now()
      const attrs: Record<string, any> = { [idName]: Number(oid) }
      const put = (name: string, value: any) => {
        const real = realFieldName(fields, name)
        if (real) attrs[real] = value
      }
      put('determinazione_stato', 'TRASMESSA_RIA')
      put('stato_IA', 4)
      put('dt_stato_IA', now)
      put('stato_RIA', 1)
      put('dt_stato_RIA', now)
      put('dt_presa_in_carico_RIA', null)
      put('esito_RIA', null)
      put('dt_esito_RIA', null)
      put('note_RIA', null)


      // La trasmissione del fascicolo al Responsabile dell’istruttoria amministrativa
      // è un vero passaggio operativo: dopo il salvataggio la pratica deve uscire
      // dalla scheda “In attesa mia” dell’Istruttore amministrativo e
      // comparire tra quelle in attesa di altri. Aggiorniamo anche i campi di
      // routing sintetico letti dall’elenco, senza introdurre un invio separato.
      put('GII_da', 'IA-AMM')
      put('GII_a', 'RIA')
      put('GII_dt', now)
      put('GII_trasm', 1)
      put('GII_rim', 0)
      put('GII_arch', 0)

      // Ogni trasmissione a RIA apre un nuovo ciclo di verifica della versione corrente.
      // La Proposta deve quindi tornare sempre allo stato BOZZA: gli esiti RIA appena
      // azzerati vengono inclusi nella mappa dati usata dallo stesso builder condiviso.
      const propostaDraftBlob = await buildVerbalePdfBlob({ ...base, ...attrs, ...automaticValues }, fields, { username: profile.username, fullName: profile.fullName })
      const propostaDraftFile = new File([propostaDraftBlob.blob], propostaDraftBlob.fileName, { type: 'application/pdf', lastModified: now })

      let prevRecordAttrs = { ...(initialDraft || {}) }
      try {
        const liveAttrs = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (liveAttrs && Object.keys(liveAttrs).length) prevRecordAttrs = liveAttrs
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Impossibile rileggere il record amministrativo prima della trasmissione bozza determinazione:', e)
      }

      const cleanAttrs = filterAttrsForLayer(attrs, fields)
      if (!isGiiPracticeContextStampCurrent(operationContextStamp)) return
      const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
      const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
      const err = upd?.error
      const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
      if (!ok) {
        const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
        throw new Error(detail)
      }

      await replacePropostaContestazionePdfAttachment(layer, Number(oid), propostaDraftFile, layerUrl, 'DRAFT')

      const changedFieldNames = Object.keys(cleanAttrs).filter(k => k !== idName)
      const nextRecordAttrs = { ...prevRecordAttrs, ...cleanAttrs }
      await upsertAmmCycleAudit(prevRecordAttrs, nextRecordAttrs, changedFieldNames)
      await closeIaBozzaDeterminazioneCycle(prevRecordAttrs, nextRecordAttrs, changedFieldNames)
      await createRiaBozzaDeterminazioneActivity(nextRecordAttrs)
      if (!isGiiPracticeContextStampCurrent(operationContextStamp)) return
      try {
        sessionStorage.setItem('GII_AFTER_WORKFLOW_NAV', JSON.stringify(stampGiiPracticePayload({
          oid: Number(oid),
          source: 'FASCICOLO_TRASMESSO_VERIFICA',
          targetRoleTab: 'attesa_altri',
          ts: Date.now()
        }, operationContextStamp)))
      } catch {}
      await refreshDs(active.ds, props.id)
      if (!isGiiPracticeContextStampCurrent(operationContextStamp)) return
      const next = { ...nextRecordAttrs }
      setInitialDraft(next)
      setDraft(next)
      setDialog({ kind: 'ok', title: 'Fascicolo trasmesso', text: 'Fascicolo trasmesso per la verifica.' })
      try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm-bozza-determinazione-trasmessa' } })) } catch {}
      try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: Number(oid), source: 'gii-editing-amm-bozza-determinazione-trasmessa', ts: Date.now() } })) } catch {}
      try { window.dispatchEvent(new CustomEvent('gii-alerts-refresh', { detail: { oid: Number(oid), source: 'gii-editing-amm-bozza-determinazione-trasmessa', ts: Date.now() } })) } catch {}
    } catch (e: any) {
      if (isGiiPracticeContextStampCurrent(operationContextStamp)) setDialog({ kind: 'err', title: 'Errore trasmissione fascicolo', text: e?.message || String(e) })
    } finally {
      if (isGiiPracticeContextStampCurrent(operationContextStamp)) setSaving(false)
    }
  }


  const getEmailAttachmentContext = React.useCallback(async (): Promise<{ layer: any, layerUrl: string, attachments: AmmAttachmentInfo[] }> => {
    if (!active?.ds || oid == null || !Number.isFinite(Number(oid))) throw new Error('Fonte dati o pratica non disponibile.')
    const layer = await resolveLayerForEdit(active.ds, active.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
    const layerUrl = normalizeEditLayerUrl(active.layerUrl || (configuredDsState as any)?.layerUrl || layer?.url || getDataSourceUrl(configuredDs))
    if (!layerUrl) throw new Error('Allegati non disponibili.')
    const attachments = await queryAmmAttachments(layer, Number(oid), layerUrl)
    return { layer, layerUrl, attachments }
  }, [active, configuredDs, configuredDsState, oid])

  const handlePrepareEmailProtocollo = React.useCallback(async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di preparare l’e-mail.' })
      return
    }
    if (!canEdit) {
      setDialog({ kind: 'warn', title: 'Scheda in sola lettura', text: 'Il profilo corrente può consultare la scheda, ma non predisporre l’e-mail di trasmissione al protocollo.' })
      return
    }
    const base = buildBozzaDeterminazioneSource()
    if (!isPropostaContestazioneApprovedByRia(base)) {
      setDialog({ kind: 'warn', title: 'Approvazione mancante', text: 'La Proposta deve essere approvata prima dell’invio al protocollo.' })
      return
    }
    if (hasAdminValue(pickAttrCI(base, ['protocollo_fascicolo_numero'])) && hasAdminValue(pickAttrCI(base, ['protocollo_fascicolo_data']))) {
      setDialog({ kind: 'warn', title: 'Protocollo già registrato', text: 'Numero e data del protocollo fascicolo risultano già compilati. Non è necessario predisporre una nuova trasmissione al protocollo.' })
      return
    }
    setSaving(true)
    try {
      const { layer, layerUrl, attachments } = await getEmailAttachmentContext()
      if (attachments.some(att => isGiiProtocolloFascicoloManifestAttachment(att as any))) {
        setDialog({ kind: 'warn', title: 'Fascicolo già predisposto', text: 'La composizione della trasmissione corrente è già registrata. Attendere il rientro dei documenti protocollati.' })
        return
      }
      const numero = getReportCode(base, Number(oid))
      const requireMap = computeReqPoint(base) === 1
      const mapTarget = requireMap
        ? await queryPointGeometryForAmm(active?.ds, Number(oid), active?.idFieldName || 'OBJECTID', layerUrl)
        : null
      if (requireMap && !mapTarget) {
        throw new Error('La pratica richiede l’elaborato cartografico, ma non è disponibile una geometria valida. La trasmissione al protocollo è stata annullata.')
      }

      const mapSession = requireMap ? await createProtocolloFascicoloHeadlessMapView(mapTarget) : null
      if (requireMap && !mapSession) {
        throw new Error('Non è stato possibile predisporre l’elaborato cartografico. La trasmissione al protocollo è stata annullata.')
      }

      let protocolloAttachments: ProtocolloFascicoloEmailAttachment[] = []
      try {
        protocolloAttachments = await buildProtocolloFascicoloEmailAttachments(Number(oid), active?.ds, layerUrl, {
          nsConfig: {
            detailUrl: String((cfg as any).nsNotaSpeseDettaglioUrl || ''),
            parametriUrl: String((cfg as any).nsParametriUrl || ''),
            parametroCode: String((cfg as any).nsParametroCode || 'SPESE_GENERALI_PERC')
          },
          mapView: mapSession?.view || null,
          requireMap
        })
      } finally {
        try { mapSession?.dispose?.() } catch {}
      }

      const manifest: ProtocolloFascicoloManifest = {
        version: 1,
        oid: Number(oid),
        reportCode: String(numero || ''),
        createdAt: Date.now(),
        items: protocolloAttachments.map(att => ({
          index: att.index,
          fileName: att.fileName,
          docKey: att.docKey,
          sourceAttachmentId: att.sourceAttachmentId,
          sourceAttachmentKind: att.sourceAttachmentKind,
          sourceStore: att.sourceStore,
          sourceParentOid: att.sourceParentOid,
          sourceAttachmentName: att.sourceAttachmentName,
          sourceAttachmentKeywords: att.sourceAttachmentKeywords
        }))
      }
      await saveProtocolloFascicoloManifest(layer, Number(oid), layerUrl, manifest)

      const subject = `Protocollazione fascicolo - Rapporto tecnico n. ${numero || '—'}`
      const bodyLines = [
        `Si trasmettono in allegato gli elaborati del fascicolo relativo al Rapporto tecnico n. ${numero || '—'}, ai fini della protocollazione.`,
        '',
        'Cordiali saluti.'
      ]
      const protocolloTo = await loadAmmProtocolloEmailRecipient()
      const senderEmail = await loadAssignedIaSenderEmail(base)
      await downloadEmailDraftWithAttachments({
        from: senderEmail,
        to: protocolloTo,
        subject,
        body: bodyLines.join('\n'),
        attachments: protocolloAttachments,
        fileName: `email_protocollo_${String(numero || oid).replace(/[^a-zA-Z0-9_-]/g, '_')}.eml`
      })

      // La predisposizione al protocollo non modifica determinazione_stato: il manifest
      // appena salvato è il milestone persistente della trasmissione e resta separato
      // dal dominio della Determinazione.
      setLiveRefreshVersion(v => v + 1)
      try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm-manifest-protocollo', ts: Date.now() } })) } catch {}

      setDialog({ kind: 'ok', title: 'E-mail preparata', text: 'E-mail al protocollo predisposta. La composizione del fascicolo è stata registrata.' })
    } catch (e: any) {
      setDialog({ kind: 'err', title: 'Impossibile preparare l’e-mail', text: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }, [active, buildBozzaDeterminazioneSource, canEdit, getEmailAttachmentContext, hasSelection, initialDraft, layerFields, oid, profile, props.id])

  const handlePrepareEmailDirettore = React.useCallback(async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di preparare l’e-mail.' })
      return
    }
    if (!canEdit) {
      setDialog({ kind: 'warn', title: 'Scheda in sola lettura', text: 'Il profilo corrente può consultare la scheda, ma non predisporre l’e-mail al Direttore.' })
      return
    }
    const base = buildBozzaDeterminazioneSource()
    if (!isPropostaContestazioneApprovedByRia(base)) {
      setDialog({ kind: 'warn', title: 'Approvazione mancante', text: 'La Proposta deve essere approvata prima dell’invio al Direttore.' })
      return
    }
    if (!hasAdminValue(pickAttrCI(base, ['protocollo_fascicolo_numero'])) || !hasAdminValue(pickAttrCI(base, ['protocollo_fascicolo_data']))) {
      setDialog({ kind: 'warn', title: 'Protocollo fascicolo incompleto', text: 'Acquisire prima il fascicolo protocollato.' })
      return
    }
    const protocolloFascicoloSalvato =
      hasAdminValue(pickAttrCI(initialDraft, ['protocollo_fascicolo_numero'])) &&
      hasAdminValue(pickAttrCI(initialDraft, ['protocollo_fascicolo_data']))
    if (!protocolloFascicoloSalvato) {
      setDialog({ kind: 'warn', title: 'Protocollo fascicolo non salvato', text: 'Salvare prima gli estremi di protocollo.' })
      return
    }

    setSaving(true)
    try {
      const { layer, layerUrl, attachments } = await getEmailAttachmentContext()
      const bozzaAtt = pickLatestGiiAttachment<AmmAttachmentInfo>(attachments.filter(att => isGiiBozzaDeterminazionePdfAttachment(att as any)))
      if (!bozzaAtt) {
        setDialog({ kind: 'warn', title: 'PDF della determinazione non caricato', text: 'Caricare prima il PDF della determinazione.' })
        return
      }
      if (!isVerifiedFinalBozzaAttachment(bozzaAtt)) {
        setDialog({ kind: 'warn', title: 'PDF della determinazione non verificato', text: 'Il PDF della determinazione deve essere verificato prima dell’invio al Direttore.' })
        return
      }
      const propostaAtt = pickLatestGiiAttachment<AmmAttachmentInfo>(attachments.filter(att => isGiiPropostaContestazionePdfAttachment(att as any)))
      if (!propostaAtt) {
        setDialog({ kind: 'warn', title: 'Proposta di contestazione non disponibile', text: 'Proposta di contestazione non disponibile.' })
        return
      }
      const emailAttachments: EmailDraftAttachment[] = [
        await buildEmailAttachmentFromAmmAttachment(bozzaAtt, Number(oid), layerUrl),
        await buildEmailAttachmentFromAmmAttachment(propostaAtt, Number(oid), layerUrl)
      ]
      const numero = getReportCode(base, Number(oid))
      const subject = `Bozza di determinazione - Rapporto tecnico n. ${numero || '—'}`
      const bodyLines = [
        `Si trasmette in allegato, per le valutazioni di competenza, la bozza di determinazione relativa al Rapporto tecnico n. ${numero || '—'}.`,
        '',
        'Cordiali saluti.'
      ]
      const recipients = await loadAmmDeterminaEmailRecipients()
      const senderEmail = await loadAssignedIaSenderEmail(base)
      await downloadEmailDraftWithAttachments({
        from: senderEmail,
        to: recipients.to,
        cc: recipients.cc,
        subject,
        body: bodyLines.join('\n'),
        attachments: emailAttachments,
        fileName: `email_direttore_${String(numero || oid).replace(/[^a-zA-Z0-9_-]/g, '_')}.eml`
      })

      // La generazione del .eml è l'ultimo evento verificabile internamente prima
      // dell'esito esterno della determinazione. Registriamo quindi soltanto che
      // l'e-mail è stata predisposta: non assumiamo che sia stata effettivamente inviata.
      if (!layer?.applyEdits) throw new Error('E-mail generata, ma non è stato possibile aggiornare la pratica.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
      const editFields = layer?.fields?.length
        ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
        : layerFields
      const idName = realFieldName(editFields, active?.idFieldName) || active?.idFieldName || 'OBJECTID'
      const statoField = realFieldName(editFields, 'determinazione_stato')
      const trasmessaFirmaIlField = realFieldName(editFields, 'determinazione_trasmessa_firma_il')
      const trasmessaFirmaDaField = realFieldName(editFields, 'determinazione_trasmessa_firma_da')
      if (!statoField) throw new Error('E-mail generata, ma non è stato possibile aggiornare la pratica.')

      let prevRecordAttrs = { ...(initialDraft || {}) }
      try {
        const liveAttrs = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (liveAttrs && Object.keys(liveAttrs).length) prevRecordAttrs = liveAttrs
      } catch {}

      const transmissionNow = Date.now()
      const transmissionBy = String(profile.fullName || profile.username || '').trim()
      const updateValues: Record<string, any> = {
        [idName]: Number(oid),
        [statoField]: TRASMESSA_FIRMA_DA_STATE
      }
      if (trasmessaFirmaIlField) updateValues[trasmessaFirmaIlField] = transmissionNow
      if (trasmessaFirmaDaField) updateValues[trasmessaFirmaDaField] = transmissionBy || null
      const updateAttrs = filterAttrsForLayer(updateValues, editFields)
      const editResult = await layer.applyEdits({ updateFeatures: [{ attributes: updateAttrs }] })
      const upd = editResult?.updateFeatureResults?.[0] || editResult?.updateResults?.[0] || null
      const updErr = upd?.error
      const updOk = !updErr && (upd?.success === true || upd?.objectId != null || upd?.success == null)
      if (!updOk) {
        const detail = updErr ? `${updErr.code ?? ''}: ${updErr.message ?? ''}` : JSON.stringify(editResult)
        throw new Error(`E-mail generata, ma registrazione della predisposizione al Direttore non riuscita: ${detail}`)
      }

      const nextEmailState = { ...prevRecordAttrs, ...updateAttrs }
      await upsertAmmCycleAudit(
        prevRecordAttrs,
        nextEmailState,
        [statoField, trasmessaFirmaIlField, trasmessaFirmaDaField].filter(Boolean) as string[]
      )
      await refreshDs(active.ds, props.id)
      setInitialDraft(prev => ({ ...(prev || {}), ...updateAttrs }))
      setDraft(prev => ({ ...(prev || {}), ...updateAttrs }))
      try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm-email-direttore-preparata', ts: Date.now() } })) } catch {}

      setDialog({ kind: 'ok', title: 'E-mail preparata', text: 'E-mail per il Direttore preparata.' })
    } catch (e: any) {
      setDialog({ kind: 'err', title: 'Impossibile preparare l’e-mail', text: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }, [active, buildBozzaDeterminazioneSource, canEdit, getEmailAttachmentContext, hasSelection, initialDraft, layerFields, oid, profile, props.id])

  const handleGenerateAttoContestazioneWord = React.useCallback(async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di generare la bozza Word dell’Atto.' })
      return
    }
    if (!canEdit || !(currentRole === 'IA' || currentRole === 'ADMIN')) {
      setDialog({ kind: 'warn', title: 'Operazione non consentita', text: 'Operazione non consentita per il profilo corrente.' })
      return
    }
    if (isDirty) {
      setDialog({ kind: 'warn', title: 'Modifiche non salvate', text: 'Salvare o annullare le modifiche prima di proseguire.' })
      return
    }

    const operationContextStamp = getGiiPracticeContextStamp()
    const operationContextIsCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!operationContextIsCurrent()) return
    setSaving(true)
    try {
      const layer = await resolveLayerForEdit(active?.ds, active?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
      if (!layer?.applyEdits) throw new Error('Configurazione non disponibile. Contattare l’amministratore.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
      const fields = layer?.fields?.length
        ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
        : layerFields
      const idName = realFieldName(fields, active?.idFieldName) || active?.idFieldName || 'OBJECTID'
      let liveAttrs = { ...(initialDraft || {}) }
      try {
        const current = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (current && Object.keys(current).length) liveAttrs = current
      } catch {}

      if (!isDeterminazioneAdottata(liveAttrs)) throw new Error('Registrare prima numero e data della determinazione adottata.')
      const paymentModeForAtto = getPaymentMode(liveAttrs, fields)
      if (!paymentModeForAtto) throw new Error('Definire prima la modalità di pagamento nella scheda Notifica.')
      if (!hasAdminValue(pickAttrCI(liveAttrs, ['notifica_tipo']))) throw new Error('Definire prima la modalità prevista per la notifica.')
      const numeroAtto = String(pickAttrCI(liveAttrs, ['accertamento_numero']) || '').trim()
      if (!numeroAtto) throw new Error('Numero dell’Atto non disponibile. Registrare prima gli estremi della determinazione.')
      if (
        hasAdminValue(pickAttrCI(liveAttrs, ['protocollo_atto_accertamento_numero'])) ||
        hasAdminValue(pickAttrCI(liveAttrs, ['protocollo_atto_accertamento_data'])) ||
        hasAdminValue(pickAttrCI(liveAttrs, ['notifica_data']))
      ) throw new Error('L’Atto non può essere modificato dopo l’avvio della protocollazione o della notifica.')

      const statoCorrente = attoContestazioneWorkflowState(liveAttrs)
      const postRiApproved = statoCorrente === 'VALIDATA_RIA'
      if (!['', 'BOZZA', 'VALIDATA_RIA'].includes(statoCorrente)) {
        throw new Error(statoCorrente === 'TRASMESSA_RIA'
          ? 'L’Atto è in corso di verifica.'
          : 'L’Atto non è modificabile nella fase corrente.')
      }

      const layerUrl = normalizeEditLayerUrl(layer?.url || active?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
      const existingAttachments = await queryAmmAttachments(layer, Number(oid), layerUrl)
      const existingAttoPdfs = existingAttachments.filter(isGiiAttoContestazionePdfAttachment)
      if (existingAttoPdfs.length && !postRiApproved) {
        throw new Error('Eliminare prima il PDF già presente.')
      }

      // Il builder dell’Atto e il relativo template DOCX sono volutamente caricati
      // soltanto quando l’utente richiede la generazione Word. Il template della
      // carta intestata è pesante e non deve partecipare al caricamento iniziale
      // del widget, altrimenti un problema nel modulo documentale può impedire
      // l’avvio dell’intero gii-editing-amm.
      const attoDocxModule = await import('../../../_shared/gii-anteprime/documenti-amministrativi/atto-contestazione/atto-contestazione-docx-builder')
      const participants = await resolveAttoParticipants(liveAttrs, { username: profile.username })
      const bytes = await attoDocxModule.buildAttoContestazioneDocx(
        liveAttrs,
        fields,
        { username: profile.username, fullName: profile.fullName },
        // Prima della verifica RIA la filigrana identifica inequivocabilmente la
        // copia di lavoro. Dopo l'approvazione generiamo invece lo stesso Word pulito,
        // che il IA convertirà esternamente in PDF per la fase successiva.
        { watermarkBozza: !postRiApproved, participants }
      )
      if (!operationContextIsCurrent()) return
      const blob = new Blob([bytes as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      downloadBlobFile(blob, attoDocxModule.getAttoContestazioneDocxFileName(liveAttrs))

      const now = Date.now()
      const attrs: Record<string, any> = { [idName]: Number(oid) }
      const put = (name: string, value: any) => {
        const real = realFieldName(fields, name)
        if (real) attrs[real] = value
      }
      if (!postRiApproved) {
        // L'Atto apre un nuovo ciclo RIA senza riaprire la Determinazione:
        // determinazione_stato resta definitivamente ADOTTATA.
        put('stato_RIA', 4)
        put('dt_stato_RIA', now)
        put('dt_presa_in_carico_RIA', null)
        put('esito_RIA', null)
        put('dt_esito_RIA', null)
        put('note_RIA', null)
      }

      const cleanAttrs = filterAttrsForLayer(attrs, fields)
      if (Object.keys(cleanAttrs).some(k => k !== idName)) {
        const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
        const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
        const err = upd?.error
        const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
        if (!ok) {
          const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
          throw new Error(detail)
        }
      }


      const next = { ...liveAttrs, ...cleanAttrs }
      const changedFields = Object.keys(cleanAttrs).filter(k => k !== idName)
      if (changedFields.length) await upsertAmmCycleAudit(liveAttrs, next, changedFields)
      if (postRiApproved) {
        // La generazione riuscita della versione pulita è l'evento che fa avanzare
        // la guida a "Carica PDF". Non dipendiamo da dt_esito_RIA, che può non
        // essere presente o ancora sincronizzato nel viewData corrente.
        const marker = { oid: Number(oid), generatedAt: Date.now() }
        setAttoCleanWordGeneratedMarker(marker)
        try { window.sessionStorage.setItem('GII_ATTO_CLEAN_WORD_GENERATED', JSON.stringify(marker)) } catch {}
      }
      if (operationContextIsCurrent()) await refreshDs(active.ds, props.id)
      if (!operationContextIsCurrent()) return
      setInitialDraft(next)
      setDraft(next)
      setLiveRefreshVersion(v => v + 1)
      try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm-atto-word', ts: now } })) } catch {}
      setDialog({
        kind: 'ok',
        title: postRiApproved ? 'Versione Word senza filigrana generata' : 'Bozza Word dell’Atto di accertamento generata',
        text: postRiApproved
          ? 'È stata generata la versione Word dell’Atto senza filigrana, mantenendo invariato il contenuto approvato dal Responsabile. Convertirla in PDF e caricarla con la normale azione di caricamento; il gestionale la confronterà con la versione approvata prima di sostituirla.'
          : 'È stata generata la bozza Word dell’Atto di accertamento con filigrana BOZZA. Aprirla in Word, completare o modificare il testo, quindi convertirla in PDF e caricarla per la verifica del Responsabile.'
      })
    } catch (e: any) {
      if (operationContextIsCurrent()) setDialog({ kind: 'err', title: 'Generazione bozza Atto non riuscita', text: e?.message || String(e) })
    } finally {
      if (operationContextIsCurrent()) setSaving(false)
    }
  }, [active, canEdit, configuredDs, configuredDsState, currentRole, hasSelection, initialDraft, isDirty, layerFields, oid, profile.fullName, profile.username, props.id, refreshDs, upsertAmmCycleAudit])

  const handleTransmitAttoContestazioneRia = React.useCallback(async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di trasmettere l’Atto.' })
      return
    }
    if (!canEdit || !(currentRole === 'IA' || currentRole === 'ADMIN')) {
      setDialog({ kind: 'warn', title: 'Operazione non consentita', text: 'Operazione non consentita per il profilo corrente.' })
      return
    }
    if (isDirty) {
      setDialog({ kind: 'warn', title: 'Modifiche non salvate', text: 'Salvare o annullare le modifiche presenti nella scheda prima di trasmettere l’Atto.' })
      return
    }

    const operationContextStamp = getGiiPracticeContextStamp()
    const operationContextIsCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!operationContextIsCurrent()) return
    setSaving(true)
    try {
      const layer = await resolveLayerForEdit(active?.ds, active?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
      if (!layer?.applyEdits) throw new Error('Configurazione non disponibile. Contattare l’amministratore.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
      const fields = layer?.fields?.length
        ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
        : layerFields
      const idName = realFieldName(fields, active?.idFieldName) || active?.idFieldName || 'OBJECTID'
      let liveAttrs = { ...(initialDraft || {}) }
      try {
        const current = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (current && Object.keys(current).length) liveAttrs = current
      } catch {}
      if (!isDeterminazioneAdottata(liveAttrs)) throw new Error('La determinazione adottata non risulta registrata.')
      if (attoContestazioneWorkflowState(liveAttrs) !== 'BOZZA') throw new Error('L’Atto non è nella fase di predisposizione.')

      const layerUrl = normalizeEditLayerUrl(layer?.url || active?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
      const attachments = await queryAmmAttachments(layer, Number(oid), layerUrl)
      const attoPdf = pickLatestGiiAttachment(attachments.filter(isGiiAttoContestazionePdfAttachment) as any[]) as AmmAttachmentInfo | null
      if (!attoPdf) throw new Error('Caricare prima il PDF dell’Atto.')

      // Congeliamo l'impronta dell'esatto PDF che viene trasmesso al RIA. È questo
      // documento, e non una successiva ricerca "dell'ultimo allegato", a diventare
      // la fonte di verità per la verifica della versione senza filigrana.
      const attoPdfBlob = await fetchAmmAttachmentBlobForPdf(attoPdf, Number(oid), layerUrl)
      await replaceApprovedAttoReferenceAttachment(layer, Number(oid), layerUrl, attoPdfBlob)

      const now = Date.now()
      const attrs: Record<string, any> = { [idName]: Number(oid) }
      const put = (name: string, value: any) => {
        const real = realFieldName(fields, name)
        if (real) attrs[real] = value
      }
      // La trasmissione dell'Atto non modifica lo stato della Determinazione,
      // che resta ADOTTATA per tutto il ciclo successivo.
      put('stato_IA', 4)
      put('dt_stato_IA', now)
      put('stato_RIA', 1)
      put('dt_stato_RIA', now)
      put('dt_presa_in_carico_RIA', null)
      put('esito_RIA', null)
      put('dt_esito_RIA', null)
      put('note_RIA', null)
      put('GII_da', 'IA-AMM')
      put('GII_a', 'RIA')
      put('GII_dt', now)
      put('GII_trasm', 1)
      put('GII_rim', 0)
      put('GII_arch', 0)

      const cleanAttrs = filterAttrsForLayer(attrs, fields)
      const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
      const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
      const err = upd?.error
      const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
      if (!ok) {
        const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
        throw new Error(detail)
      }
      const next = { ...liveAttrs, ...cleanAttrs }
      const changed = Object.keys(cleanAttrs).filter(k => k !== idName)
      await upsertAmmCycleAudit(liveAttrs, next, changed)
      await closeIaAttoContestazioneCycle(liveAttrs, next, changed)
      await createRiaAttoContestazioneActivity(next)
      // Un nuovo invio al RIA apre un nuovo ciclo: l'eventuale marker della
      // precedente versione pulita non deve sopravvivere alla nuova approvazione.
      setAttoCleanWordGeneratedMarker(null)
      try { window.sessionStorage.removeItem('GII_ATTO_CLEAN_WORD_GENERATED') } catch {}
      setAttoDirettoreEmailPreparedMarker(null)
      try { window.sessionStorage.removeItem('GII_ATTO_EMAIL_DA_PREPARED') } catch {}
      if (!operationContextIsCurrent()) return
      try {
        sessionStorage.setItem('GII_AFTER_WORKFLOW_NAV', JSON.stringify(stampGiiPracticePayload({
          oid: Number(oid),
          source: 'ATTO_CONTESTAZIONE_TRASMESSO',
          targetRoleTab: 'attesa_altri',
          ts: Date.now()
        }, operationContextStamp)))
      } catch {}
      await refreshDs(active.ds, props.id)
      if (!operationContextIsCurrent()) return
      setInitialDraft(next)
      setDraft(next)
      setDialog({ kind: 'ok', title: 'Atto trasmesso', text: 'Atto trasmesso per la verifica.' })
      try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm-atto-trasmesso', ts: now } })) } catch {}
      try { window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: Number(oid), source: 'gii-editing-amm-atto-trasmesso', ts: now } })) } catch {}
      try { window.dispatchEvent(new CustomEvent('gii-alerts-refresh', { detail: { oid: Number(oid), source: 'gii-editing-amm-atto-trasmesso', ts: now } })) } catch {}
    } catch (e: any) {
      if (operationContextIsCurrent()) setDialog({ kind: 'err', title: 'Trasmissione Atto non riuscita', text: e?.message || String(e) })
    } finally {
      if (operationContextIsCurrent()) setSaving(false)
    }
  }, [active, canEdit, closeIaAttoContestazioneCycle, configuredDs, configuredDsState, createRiaAttoContestazioneActivity, currentRole, hasSelection, initialDraft, isDirty, layerFields, oid, profile.username, props.id, refreshDs, upsertAmmCycleAudit])

  const handlePrepareEmailAttoDirettore = React.useCallback(async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di predisporre l’e-mail dell’Atto di accertamento.' })
      return
    }
    if (!canEdit || !(currentRole === 'IA' || currentRole === 'ADMIN')) {
      setDialog({ kind: 'warn', title: 'Operazione non consentita', text: 'Operazione non consentita per il profilo corrente.' })
      return
    }
    if (isDirty) {
      setDialog({ kind: 'warn', title: 'Modifiche non salvate', text: 'Salvare o annullare le modifiche presenti nella scheda prima di predisporre l’e-mail.' })
      return
    }
    setSaving(true)
    try {
      const { layer, layerUrl, attachments } = await getEmailAttachmentContext()
      if (!layer?.applyEdits) throw new Error('Configurazione non disponibile. Contattare l’amministratore.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch {} }
      const fields = layer?.fields?.length
        ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
        : layerFields
      const idName = realFieldName(fields, active?.idFieldName) || active?.idFieldName || 'OBJECTID'
      let liveAttrs = { ...(initialDraft || {}) }
      try {
        const current = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (current && Object.keys(current).length) liveAttrs = current
      } catch {}
      const stato = attoContestazioneWorkflowState(liveAttrs)
      if (stato !== 'VALIDATA_RIA') throw new Error('L’Atto deve essere approvato prima dell’invio al Direttore.')
      const attoAtt = pickLatestGiiAttachment(attachments.filter(isGiiAttoContestazionePdfAttachment) as any[]) as AmmAttachmentInfo | null
      if (!attoAtt) throw new Error('PDF dell’Atto di accertamento non disponibile.')
      if (!isAttoDaFirmareAttachment(attoAtt)) {
        throw new Error('Caricare prima la versione senza filigrana.')
      }
      const attoBlob = await fetchAmmAttachmentBlobForPdf(attoAtt, Number(oid), layerUrl)
      const attoContent = await extractPdfVerificationContent(attoBlob)
      if (/\bBOZZA\b/i.test(attoContent.text || '')) {
        throw new Error('Il PDF contiene ancora la filigrana BOZZA.')
      }

      const emailAttachments: EmailDraftAttachment[] = [await buildEmailAttachmentFromAmmAttachment(attoAtt, Number(oid), layerUrl)]
      const numeroRapporto = getReportCode(liveAttrs, Number(oid))
      const numeroAtto = String(pickAttrCI(liveAttrs, ['accertamento_numero']) || '').trim()
      const subject = `Atto di accertamento ${numeroAtto || ''} - Rapporto tecnico n. ${numeroRapporto || '—'}`.trim()
      const body = [
        `Si trasmette in allegato, per la firma digitale, l’Atto di accertamento ${numeroAtto || ''} relativo al Rapporto tecnico n. ${numeroRapporto || '—'}, già verificato e approvato dal Responsabile dell’istruttoria amministrativa.`,
        '',
        'Cordiali saluti.'
      ].join('\n')
      const recipients = await loadAmmDeterminaEmailRecipients()
      const senderEmail = await loadAssignedIaSenderEmail(liveAttrs)
      await downloadEmailDraftWithAttachments({
        from: senderEmail,
        to: recipients.to,
        cc: recipients.cc,
        subject,
        body,
        attachments: emailAttachments,
        fileName: `email_atto_${String(numeroAtto || numeroRapporto || oid).replace(/[^a-zA-Z0-9_-]/g, '_')}.eml`
      })

      // La predisposizione dell'e-mail è un evento operativo del ciclo dell'Atto,
      // non uno stato della Determinazione. Manteniamo quindi ADOTTATA e memorizziamo
      // soltanto un marker di sessione per far avanzare la guida al caricamento firma.
      const now = Date.now()
      const marker = { oid: Number(oid), preparedAt: now }
      setAttoDirettoreEmailPreparedMarker(marker)
      try { window.sessionStorage.setItem('GII_ATTO_EMAIL_DA_PREPARED', JSON.stringify(marker)) } catch {}
      try { window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm-email-atto-direttore', ts: now } })) } catch {}
      setDialog({ kind: 'ok', title: 'E-mail preparata', text: 'E-mail per il Direttore preparata. In attesa dell’Atto firmato.' })
    } catch (e: any) {
      setDialog({ kind: 'err', title: 'Impossibile preparare l’e-mail', text: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }, [active, canEdit, currentRole, getEmailAttachmentContext, hasSelection, initialDraft, isDirty, layerFields, oid, props.id, refreshDs, upsertAmmCycleAudit])


  const handlePrepareEmailAttoProtocollo = React.useCallback(async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di predisporre l’e-mail al protocollo.' })
      return
    }
    if (!canEdit || !(currentRole === 'IA' || currentRole === 'ADMIN')) {
      setDialog({ kind: 'warn', title: 'Operazione non consentita', text: 'Operazione non consentita per il profilo corrente.' })
      return
    }
    if (isDirty) {
      setDialog({ kind: 'warn', title: 'Modifiche non salvate', text: 'Salvare le modifiche presenti nella scheda prima di predisporre l’e-mail al protocollo.' })
      return
    }

    setSaving(true)
    try {
      const { layer, layerUrl, attachments } = await getEmailAttachmentContext()
      if (typeof layer?.load === 'function') { try { await layer.load() } catch {} }
      const fields = layer?.fields?.length
        ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false }))
        : layerFields
      const idName = realFieldName(fields, active?.idFieldName) || active?.idFieldName || 'OBJECTID'
      let liveAttrs = { ...(initialDraft || {}) }
      try {
        const current = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (current && Object.keys(current).length) liveAttrs = current
      } catch {}

      const numeroAtto = String(pickAttrCI(liveAttrs, ['accertamento_numero']) || '').trim()
      if (!numeroAtto) throw new Error('Numero dell’Atto di accertamento non disponibile.')
      const protocolloNumero = pickAttrCI(liveAttrs, ['protocollo_atto_accertamento_numero'])
      const protocolloData = pickAttrCI(liveAttrs, ['protocollo_atto_accertamento_data'])
      if (hasAdminValue(protocolloNumero) && hasAdminValue(protocolloData)) {
        throw new Error('Il protocollo dell’Atto di accertamento risulta già registrato.')
      }

      const paymentMode = getPaymentMode(liveAttrs, fields)
      const paymentPracticeGlobalId = String(pickAttrCI(liveAttrs, ['GlobalID', 'globalid']) || '').trim()
      const paymentPositions = paymentPracticeGlobalId
        ? await queryGiiPaymentPositions(paymentPracticeGlobalId, true, true)
        : []
      const usePaymentTable = paymentPositions.length > 0
      const pagoPaAttachments = attachments.filter(isGiiPagoPaAttachment)
      if (usePaymentTable) {
        const paymentIssues = giiPaymentValidationIssues(paymentPositions, pickAttrCI(liveAttrs, ['pagamento_importo_totale']), paymentMode)
        if (paymentIssues.length) {
          throw new Error(`Completare le posizioni di pagamento prima della trasmissione al protocollo. ${paymentIssues[0]}`)
        }
      } else {
        // Compatibilità con pratiche già avviate prima dell'introduzione di GII_PAGAMENTI.
        if (!hasAdminValue(pickAttrCI(liveAttrs, ['pagamento_scadenza']))) {
          throw new Error('Completare la scadenza del pagamento prima della trasmissione al protocollo.')
        }
        if (['PAGOPA', 'MISTO'].includes(paymentMode) && !pagoPaAttachments.length) {
          throw new Error('Caricare il bollettino pagoPA prima della trasmissione al protocollo.')
        }
      }

      const signedAtt = pickLatestGiiAttachment(attachments.filter(isSignedAttoContestazioneAttachment) as any[]) as AmmAttachmentInfo | null
      if (!signedAtt) throw new Error('PDF firmato digitalmente dal Direttore non disponibile.')
      const signedBlob = await fetchAmmAttachmentBlobForPdf(signedAtt, Number(oid), layerUrl)
      if (!(await pdfContainsDigitalSignature(signedBlob))) {
        throw new Error('Caricare il PDF firmato digitalmente.')
      }
      const signerIdentityBypass = currentRole === 'ADMIN' || currentUserIsWorkflowAdmin()
      const authorizedSigners = signerIdentityBypass ? [] : await loadAuthorizedAttoSignerIdentities()
      await verifyAttoDigitalSignerIdentity(signedBlob, authorizedSigners, signerIdentityBypass)

      const numeroRapporto = getReportCode(liveAttrs, Number(oid))

      // Seconda protocollazione: nessun PDF unico. Inviamo l'Atto firmato, gli
      // eventuali bollettini e, uno per uno, gli stessi PDF del fascicolo già
      // protocollati nella prima fase. La segnatura in uscita viene apposta sul
      // margine opposto e i file restano individualmente riconoscibili.
      const rawProtocolloAttachments: ProtocolloFascicoloEmailAttachment[] = []
      const attoEmailAttachment = await buildEmailAttachmentFromAmmAttachment(signedAtt, Number(oid), layerUrl)
      rawProtocolloAttachments.push({
        ...attoEmailAttachment,
        index: rawProtocolloAttachments.length,
        docKey: 'atto_accertamento',
        sourceAttachmentId: Number(signedAtt.id),
        sourceAttachmentName: String(signedAtt.name || attoEmailAttachment.fileName || 'atto_accertamento.pdf'),
        sourceAttachmentKeywords: String(signedAtt.keywords || '') || undefined
      })

      if (usePaymentTable) {
        for (const position of giiPaymentActivePositions(paymentPositions)) {
          for (const att of position.attachments.filter(item => /\.pdf$/i.test(String(item.name || '')) || String(item.contentType || '').toLowerCase().includes('pdf'))) {
            const emailAtt = await buildEmailAttachmentFromAmmAttachment(att, position.objectId, GII_VIEW_EDIT_PAGAMENTI_URL)
            rawProtocolloAttachments.push({
              ...emailAtt,
              index: rawProtocolloAttachments.length,
              docKey: `pagamento:${String(position.globalId || position.objectId)}:${Number(att.id)}`,
              sourceAttachmentId: Number(att.id),
              sourceStore: 'payment',
              sourceParentOid: position.objectId,
              sourceAttachmentName: String(att.name || emailAtt.fileName || `pagamento_${position.objectId}_${Number(att.id)}.pdf`),
              sourceAttachmentKeywords: String(att.keywords || '') || undefined
            })
          }
        }
      } else {
        for (const att of pagoPaAttachments) {
          const emailAtt = await buildEmailAttachmentFromAmmAttachment(att, Number(oid), layerUrl)
          rawProtocolloAttachments.push({
            ...emailAtt,
            index: rawProtocolloAttachments.length,
            docKey: `pagopa:${Number(att.id)}`,
            sourceAttachmentId: Number(att.id),
            sourceStore: 'practice',
            sourceParentOid: Number(oid),
            sourceAttachmentName: String(att.name || emailAtt.fileName || `pagopa_${Number(att.id)}.pdf`),
            sourceAttachmentKeywords: String(att.keywords || '') || undefined
          })
        }
      }

      const fascicoloEmailAttachments = await buildProtocolloAttoFascicoloEmailAttachments(Number(oid), layer, layerUrl)
      rawProtocolloAttachments.push(...fascicoloEmailAttachments)

      const protocolloAttachments: ProtocolloFascicoloEmailAttachment[] = rawProtocolloAttachments.map((att, index) => {
        const order = String(index + 1).padStart(2, '0')
        const fallback = `${att.docKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
        const cleanName = sanitizeEmailFileName(att.fileName || fallback, fallback).replace(/\.pdf$/i, '')
        return {
          ...att,
          index,
          fileName: `${order}_${cleanName}.pdf`
        }
      })

      const attoManifest: ProtocolloFascicoloManifest = {
        version: 1,
        oid: Number(oid),
        reportCode: String(numeroRapporto || ''),
        createdAt: Date.now(),
        items: protocolloAttachments.map(att => ({
          index: att.index,
          fileName: att.fileName,
          docKey: att.docKey,
          sourceAttachmentId: att.sourceAttachmentId,
          sourceAttachmentKind: att.sourceAttachmentKind,
          sourceStore: att.sourceStore,
          sourceParentOid: att.sourceParentOid,
          sourceAttachmentName: att.sourceAttachmentName,
          sourceAttachmentKeywords: att.sourceAttachmentKeywords
        }))
      }
      await saveProtocolloAttoManifest(layer, Number(oid), layerUrl, attoManifest)

      const subject = `Protocollazione Atto di accertamento ${numeroAtto} - Rapporto tecnico n. ${numeroRapporto || '—'}`
      const body = [
        `Si trasmettono in allegato l’Atto di accertamento ${numeroAtto} relativo al Rapporto tecnico n. ${numeroRapporto || '—'}, firmato digitalmente dal Direttore, gli eventuali documenti di pagamento e gli elaborati del fascicolo già protocollati, ai fini della protocollazione in uscita per la successiva notificazione al trasgressore.`,
        '',
        'Cordiali saluti.'
      ].join('\n')
      const protocolloTo = await loadAmmProtocolloEmailRecipient()
      const senderEmail = await loadAssignedIaSenderEmail(liveAttrs)
      await downloadEmailDraftWithAttachments({
        from: senderEmail,
        to: protocolloTo,
        subject,
        body,
        attachments: protocolloAttachments,
        fileName: `email_protocollo_atto_${String(numeroAtto || numeroRapporto || oid).replace(/[^a-zA-Z0-9_-]/g, '_')}.eml`
      })

      setDialog({
        kind: 'ok',
        title: 'E-mail preparata',
        text: `Il file .eml per il protocollo è stato generato con ${protocolloAttachments.length} PDF distinti. Al rientro selezionare insieme tutti i PDF restituiti dal protocollo: il gestionale li riconoscerà tramite il manifest, aggiornerà i rispettivi documenti e acquisirà automaticamente numero e data di protocollo.`
      })
    } catch (e: any) {
      setDialog({ kind: 'err', title: 'Impossibile preparare l’e-mail', text: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }, [active, canEdit, cfg, currentRole, getEmailAttachmentContext, hasSelection, initialDraft, isDirty, layerFields, oid])

  const handleSave = async () => {
    if (!hasSelection || oid == null || !Number.isFinite(Number(oid))) {
      setDialog({ kind: 'warn', title: 'Nessuna pratica selezionata', text: 'Selezionare una pratica prima di salvare.' })
      return
    }
    if (!active?.ds) {
      setDialog({ kind: 'err', title: 'Operazione non disponibile', text: 'Configurazione non disponibile. Contattare l’amministratore.' })
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

    // Se una pratica storica contiene un valore non appartenente al dominio,
    // il primo salvataggio utile lo riallinea al milestone reale già persistito.
    // Nessun nuovo valore fuori dominio viene mai scritto.
    const stateSourceForMigration = { ...(initialDraft || {}), ...(draft || {}) }
    const rawStateForMigration = String(pickAttrCI(stateSourceForMigration, ['determinazione_stato']) || '').trim().toUpperCase()
    const normalizedStateForMigration = determinationWorkflowState(stateSourceForMigration)
    const stateFieldForMigration = realFieldName(layerFields, 'determinazione_stato')
    if (isDeterminazioneAdottata(initialDraft || {}) && rawStateForMigration !== 'ADOTTATA') {
      // Ripara anche le pratiche già toccate dal vecchio ciclo dell'Atto, che poteva
      // riportare impropriamente determinazione_stato a BOZZA/TRASMESSA_RIA/VALIDATA_RIA.
      if (stateFieldForMigration) attrs[stateFieldForMigration] = 'ADOTTATA'
    } else if (rawStateForMigration && !DETERMINAZIONE_DOMAIN_STATES.has(rawStateForMigration) && DETERMINAZIONE_DOMAIN_STATES.has(normalizedStateForMigration)) {
      if (stateFieldForMigration) attrs[stateFieldForMigration] = normalizedStateForMigration
    }

    Object.entries(automaticValues || {}).forEach(([name, value]) => {
      if (!shouldPersistAutomaticAdminValue(name)) return
      const real = realFieldName(layerFields, name)
      if (!real) return
      const before = pickAttrCI(initialDraft, [real, name])
      if (!sameDraftValue(before, value, name)) attrs[real] = value == null || value === '' ? null : value
    })
    if (!Object.keys(attrs).length && !determinationIsDirty) {
      setDialog({ kind: 'warn', title: 'Nessuna modifica', text: 'Non risultano modifiche da salvare.' })
      return
    }

    const operationContextStamp = getGiiPracticeContextStamp()
    const operationContextIsCurrent = () => isGiiPracticeContextStampCurrent(operationContextStamp)
    if (!operationContextIsCurrent()) return
    setSaving(true)
    try {
      const layer = await resolveLayerForEdit(active.ds, active.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
      if (!layer?.applyEdits) throw new Error('Configurazione non disponibile. Contattare l’amministratore.')
      if (typeof layer.load === 'function') { try { await layer.load() } catch { } }
      const fields = layer?.fields?.length ? (layer.fields as any[]).map(f => ({ name: String(f.name), type: String(f.type || ''), alias: String(f.alias || f.name), domain: f.domain || null, editable: f.editable !== false })) : layerFields
      const idName = realFieldName(fields, active.idFieldName) || active.idFieldName || 'OBJECTID'
      let determinationSaveMeta: { derivedAccertamentoNumber: string, wasAlreadyAdopted: boolean } | null = null
      if (determinationIsDirty) {
        if (!(currentRole === 'IA' || currentRole === 'ADMIN')) {
          throw new Error('Operazione non consentita per il profilo corrente.')
        }
        const statoCorrente = determinationWorkflowState(initialDraft || {})
        // Distinguere la prima registrazione dalla semplice correzione dell'archivio.
        // Una determina è già adottata anche quando il workflow è proseguito alle fasi
        // dell'Atto e determinazione_stato non contiene più letteralmente ADOTTATA:
        // numero + data registrati sono la fonte stabile per riconoscerla.
        const wasAlreadyAdopted = isDeterminazioneAdottata(initialDraft || {})
        if (!wasAlreadyAdopted && statoCorrente !== TRASMESSA_FIRMA_DA_STATE) {
          throw new Error('Predisporre prima l’e-mail al Direttore.')
        }
        if (hasAdminValue(pickAttrCI(initialDraft, ['accertamento_data'])) ||
            hasAdminValue(pickAttrCI(initialDraft, ['protocollo_atto_accertamento_numero'])) ||
            hasAdminValue(pickAttrCI(initialDraft, ['protocollo_atto_accertamento_data'])) ||
            hasAdminValue(pickAttrCI(initialDraft, ['notifica_data']))) {
          throw new Error('I dati della determina non possono essere modificati dopo la formalizzazione dell’Atto di accertamento.')
        }

        const numberText = String(pickAttrCI(draft, ['determinazione_numero']) ?? '').trim()
        const dateMs = dateMsOrNull(pickAttrCI(draft, ['determinazione_data']))
        if (!numberText || !/^\d+$/.test(numberText)) throw new Error('Inserire il numero della determinazione utilizzando esclusivamente cifre.')
        if (dateMs == null) throw new Error('Inserire la data della determinazione.')
        const determinationNumber = Number(numberText)
        if (!Number.isSafeInteger(determinationNumber) || determinationNumber <= 0) throw new Error('Inserire un numero di determinazione valido e maggiore di zero.')
        const determinationYear = new Date(dateMs).getFullYear()
        if (!Number.isFinite(determinationYear) || determinationYear < 2000 || determinationYear > 2200) throw new Error('La data della determinazione non è valida.')

        // Numero e data diventano definitivi solo dopo l'acquisizione della copia PDF conforme
        // che riporta esattamente gli stessi estremi. I metadati verificati sono
        // conservati nelle keywords dell'allegato per impedire modifiche dei campi tra
        // la verifica del PDF e il salvataggio della determinazione adottata.
        const determinationLayerUrl = normalizeEditLayerUrl(
          layer?.url || active.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs)
        )
        const determinationAttachments = await queryAmmAttachments(layer, Number(oid), determinationLayerUrl)
        const expectedDateKey = dateInputValue(dateMs)
        const matchingOfficialPdf = determinationAttachments.find(att =>
          isOfficialDeterminationAttachment(att) &&
          ammAttachmentKeywordValue(att, 'detNumber') === String(determinationNumber) &&
          ammAttachmentKeywordValue(att, 'detDate') === expectedDateKey
        )
        if (!matchingOfficialPdf) {
          throw new Error(
            `Caricare prima la copia PDF conforme della determinazione e verificarne gli estremi (n. ${determinationNumber} del ${new Date(dateMs).toLocaleDateString('it-IT')}).`
          )
        }

        const numberField = realFieldName(fields, 'determinazione_numero')
        const dateField = realFieldName(fields, 'determinazione_data')
        const stateField = realFieldName(fields, 'determinazione_stato')
        const registeredAtField = realFieldName(fields, 'determinazione_registrata_il')
        const registeredByField = realFieldName(fields, 'determinazione_registrata_da')
        const accertamentoNumberField = realFieldName(fields, 'accertamento_numero')
        if (!numberField || !dateField || !stateField || !accertamentoNumberField) {
          throw new Error('Non è stato possibile registrare la determina.')
        }
        if (!layer?.queryFeatures) throw new Error('Non è stato possibile verificare la determina.')

        const numberInfo = getFieldInfo(fields, numberField)
        const numericField = /integer|smallinteger|double|single|oid/i.test(String(numberInfo?.type || ''))
        const numberSql = numericField ? String(determinationNumber) : sqlQuote(String(determinationNumber))
        const duplicateQuery = layer.createQuery ? layer.createQuery() : {}
        duplicateQuery.where = `${numberField} = ${numberSql} AND ${idName} <> ${Number(oid)}`
        duplicateQuery.outFields = Array.from(new Set(
          [idName, numberField, dateField, accertamentoNumberField, 'numero_rapporto_tecnico', 'numero_rapporto', 'numero_rilevazione', 'cod_pratica']
            .map(name => realFieldName(fields, name))
            .filter(Boolean) as string[]
        ))
        duplicateQuery.returnGeometry = false
        const duplicateResult = await layer.queryFeatures(duplicateQuery)
        const duplicate = (duplicateResult?.features || []).find((feature: any) => {
          const duplicateAttrs = feature?.attributes || {}
          const otherDateMs = dateMsOrNull(pickAttrCI(duplicateAttrs, [dateField, 'determinazione_data']))
          return otherDateMs != null && new Date(otherDateMs).getFullYear() === determinationYear
        })
        if (duplicate) {
          const duplicateAttrs = duplicate?.attributes || {}
          const duplicateOid = Number(pickAttrCI(duplicateAttrs, [idName, 'OBJECTID']))
          const reportCode = getReportCode(duplicateAttrs, Number.isFinite(duplicateOid) ? duplicateOid : null)
          throw new Error(`La determinazione n. ${determinationNumber}/${determinationYear} risulta già associata${reportCode ? ` alla pratica ${reportCode}` : ' a un’altra pratica'}. Verificare i dati inseriti.`)
        }

        const derivedAccertamentoNumber = `A-${determinationNumber}/${determinationYear}`
        attrs[numberField] = numericField ? determinationNumber : String(determinationNumber)
        attrs[dateField] = dateMs
        attrs[accertamentoNumberField] = derivedAccertamentoNumber
        if (!wasAlreadyAdopted) {
          // Solo la prima registrazione conclude il ciclo della determinazione.
          // La sostituzione del PDF archiviato non deve riportare indietro o alterare
          // lo stato del workflow dell'Atto eventualmente già in corso.
          attrs[stateField] = 'ADOTTATA'
          if (registeredAtField) attrs[registeredAtField] = Date.now()
          if (registeredByField) attrs[registeredByField] = profile.fullName || profile.username || ''
        }
        determinationSaveMeta = { derivedAccertamentoNumber, wasAlreadyAdopted }
      }
      let prevRecordAttrs = { ...(initialDraft || {}) }
      try {
        const liveAttrs = await queryCurrentLayerAttrsByOid(layer, idName, Number(oid))
        if (liveAttrs && Object.keys(liveAttrs).length) prevRecordAttrs = liveAttrs
      } catch (e) {
        console.warn('[GII_LOG_EVENTI_CICLI] Impossibile rileggere il record amministrativo prima del salvataggio:', e)
      }
      const cleanAttrs = filterAttrsForLayer({ [idName]: Number(oid), ...attrs }, fields)
      if (!operationContextIsCurrent()) return
      const res = await layer.applyEdits({ updateFeatures: [{ attributes: cleanAttrs }] })
      const upd = res?.updateFeatureResults?.[0] || res?.updateResults?.[0] || null
      const err = upd?.error
      const ok = !err && (upd?.success === true || upd?.objectId != null || upd?.success == null)
      if (!ok) {
        const detail = err ? `${err.code ?? ''}: ${err.message ?? ''}` : JSON.stringify(res)
        throw new Error(detail)
      }
      await upsertAmmCycleAudit(prevRecordAttrs, { ...prevRecordAttrs, ...attrs }, Object.keys(attrs))
      if (operationContextIsCurrent()) await refreshDs(active.ds, props.id)
      if (!operationContextIsCurrent()) return
      const next = { ...(initialDraft || {}), ...attrs }
      const sharedSelectionLayerUrl = String(sessionStorage.getItem('GII_SELECTED_LAYER_URL') || '').trim()
      const nextLayerUrl = sharedSelectionLayerUrl || normalizeEditLayerUrl(layer?.url || active.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs))
      writeSelectedFeatureCache(nextLayerUrl, Number(oid), idName, next, 'edit')
      invalidateRuntimeProxyCache(nextLayerUrl)
      setInitialDraft(next)
      setDraft(next)
      if (determinationSaveMeta) {
        setDialog({
          kind: 'ok',
          title: determinationSaveMeta.wasAlreadyAdopted ? 'Dati determina aggiornati' : 'Determina registrata',
          text: `${determinationSaveMeta.wasAlreadyAdopted ? 'I dati della determinazione sono stati aggiornati' : 'La determinazione adottata è stata registrata'}. Numero Atto di accertamento assegnato automaticamente: ${determinationSaveMeta.derivedAccertamentoNumber}.`
        })
      } else {
        setDialog({ kind: 'ok', title: 'Bozza salvata', text: 'Dati amministrativi salvati.' })
      }
      try {
        window.dispatchEvent(new CustomEvent('gii:record-updated', { detail: { oid: Number(oid), source: 'gii-editing-amm' } }))
      } catch { }
      try {
        window.dispatchEvent(new CustomEvent('gii-force-refresh-selection', { detail: { oid: Number(oid), layerUrl: nextLayerUrl } }))
      } catch { }
    } catch (e: any) {
      if (operationContextIsCurrent()) setDialog({ kind: 'err', title: determinationIsDirty ? 'Registrazione determina non riuscita' : 'Errore salvataggio', text: e?.message || String(e) })
    } finally {
      if (operationContextIsCurrent()) setSaving(false)
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

  const adminStyle = React.useMemo<Record<string, any>>(() => {
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

  const workflowHasSeparateActionPanel = hasSelection && (activeAmmSection === 'verifica_istruttoria' || activeAmmSection === 'notifica')

  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    boxSizing: 'border-box',
    background: workflowHasSeparateActionPanel ? 'transparent' : String(adminStyle.maskBg || '#eef4fb'),
    border: workflowHasSeparateActionPanel ? 'none' : `${Number(adminStyle.maskBorderWidth ?? 1)}px solid ${adminStyle.maskBorderColor || '#cbd8e6'}`,
    borderRadius: workflowHasSeparateActionPanel ? 0 : Number(adminStyle.maskBorderRadius ?? 10),
    padding: workflowHasSeparateActionPanel ? 0 : Number(adminStyle.maskInnerPadding ?? 12),
    overflow: 'hidden',
    color: '#111827',
    fontFamily: 'inherit',
    fontSize: Number(adminStyle.formFieldFontSize ?? 15),
    position: 'relative',
    zIndex: hasSelection ? 1001 : 'auto'
  }

  const verificationMainPanelStyle: React.CSSProperties = {
    flex: '1 1 auto',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    background: String(adminStyle.maskBg || '#eef4fb'),
    border: `${Number(adminStyle.maskBorderWidth ?? 1)}px solid ${adminStyle.maskBorderColor || '#cbd8e6'}`,
    borderRadius: Number(adminStyle.maskBorderRadius ?? 10),
    padding: Number(adminStyle.maskInnerPadding ?? 12),
    overflow: 'hidden'
  }

  // Stesso schema del gii-editing-tec:
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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    boxSizing: 'border-box',
    lineHeight: 'normal',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: saving ? 'not-allowed' : 'pointer'
  }
  const saveDisabled = saving || !isDirty || !canEdit
  const cancelDisabled = saving || !isDirty
  const closeDisabled = saving || isDirty
  const toolbarDeterminationState = determinationWorkflowState({ ...(initialDraft || {}), ...(draft || {}) })
  const protocolDraftComplete = hasAdminValue(pickAttrCI(draft, ['protocollo_fascicolo_numero'])) && hasAdminValue(pickAttrCI(draft, ['protocollo_fascicolo_data']))
  const protocolSavedComplete = hasAdminValue(pickAttrCI(initialDraft, ['protocollo_fascicolo_numero'])) && hasAdminValue(pickAttrCI(initialDraft, ['protocollo_fascicolo_data']))
  const determinationToolbarNumberText = String(pickAttrCI(draft, ['determinazione_numero']) ?? '').trim()
  const determinationToolbarDateMs = dateMsOrNull(pickAttrCI(draft, ['determinazione_data']))
  const determinationToolbarComplete = /^\d+$/.test(determinationToolbarNumberText) && determinationToolbarDateMs != null
  const iaVistoGuidePending = currentRole === 'IA' && canEdit && isIaVistoActionPending(viewData || {})
  // La guida di salvataggio appartiene esclusivamente all'Iter approvativo.
  // Dopo la separazione Iter/Notifica non deve "trapelare" sulla scheda Notifica.
  const iterToolbarGuideActive = activeAmmSection === 'verifica_istruttoria'
  const pulseSaveProtocol = iterToolbarGuideActive && currentRole === 'IA' && !iaVistoGuidePending && !saveDisabled && protocolDraftComplete && !protocolSavedComplete
  const pulseSaveDetermination = iterToolbarGuideActive && currentRole === 'IA' && !iaVistoGuidePending && !saveDisabled && determinationIsDirty && determinationToolbarComplete && (toolbarDeterminationState === TRASMESSA_FIRMA_DA_STATE || toolbarDeterminationState === 'ADOTTATA')
  const pulseSave = pulseSaveDetermination || pulseSaveProtocol
  const pulseSaveTitle = pulseSaveDetermination ? 'Azione successiva: salva numero e data della determina' : 'Azione successiva: salva numero e data di protocollo'

  const readOnlyInfoButton = readOnlyBannerMessage ? (
    <button
      type='button'
      title='Informazioni sulla modifica dati'
      aria-label='Informazioni sulla modifica dati'
      onClick={() => {
        if (readOnlyBannerOpen) {
          clearReadOnlyBannerTimers()
          setReadOnlyBannerOpen(false)
        } else showReadOnlyBanner()
      }}
      style={{
        flex: '0 0 22px',
        width: 22,
        height: 22,
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: '#b42318',
        cursor: 'pointer',
        padding: 0,
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg width='22' height='22' viewBox='0 0 512 512' aria-hidden='true' focusable='false' style={{ display: 'block' }}>
        <path fill='#b42318' d='M256,0C114.6,0,0,114.6,0,256s114.6,256,256,256,256-114.6,256-256S397.4,0,256,0Z' />
        <path fill='#ffffff' d='M306.5,195.8l-112.2,10.9-4,14.4,22.1,3.1c14.4,2.7,17.3,6.6,14.1,17.8l-36.1,131.5c-9.5,34,5.2,50,39.7,50s57.7-9.6,71.8-22.6l4.3-15.8c-9.8,6.6-24.2,9.4-33.7,9.4-13.5,0-18.4-7.3-14.9-20.3l49-178.4h-.1Z' />
        <path fill='#ffffff' d='M268.6,84.7c-24.7,0-44.6,19.9-44.6,44.6s19.9,44.6,44.6,44.6,44.6-19.9,44.6-44.6-19.9-44.6-44.6-44.6Z' />
      </svg>
    </button>
  ) : null


  // Pareggia lo spazio sotto la riga titolo/pulsanti (padding-bottom toolbar + suo border-bottom 1px)
  // con quello sopra (border + padding del contenitore esterno), così il blocco non risulta
  // visivamente più vicino al bordo superiore della card che a quello inferiore.
  const toolbarBottomPad = Math.max(0, Number(adminStyle.maskBorderWidth ?? 1) + Number(adminStyle.maskInnerPadding ?? 12) - 1)

  if (iaAccessRequired && !iaAccessAllowed) {
    const accessMessage = iaAccess.status === 'denied'
      ? 'Accesso alla pratica non consentito.'
      : (iaAccess.status === 'error'
          ? (iaAccess.message || 'Impossibile verificare l’accesso alla pratica.')
          : 'Verifica accesso alla pratica…')
    const accessColor = iaAccess.status === 'checking' || iaAccess.status === 'idle' ? '#334155' : '#7a1c1c'
    return (
      <AdminStyleCtx.Provider value={adminStyle}>
        <div ref={rootRef} data-gii-editing-amm-root='1' style={wrapperStyle}>
          {useDs.map((uds: any, idx: number) => {
            const dsKey = String(uds?.dataSourceId || uds?.mainDataSourceId || `ds_${idx}`)
            return <DataSourceSelectionBridge key={`${dsKey}:${practiceContextRevision}`} widgetId={props.id} uds={uds} dsKey={dsKey} onUpdate={onDsUpdate} />
          })}
          <div style={{
            flex: '1 1 auto',
            minHeight: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 24,
            boxSizing: 'border-box',
            color: accessColor,
            fontSize: 14,
            fontWeight: 700
          }}>
            {accessMessage}
          </div>
        </div>
      </AdminStyleCtx.Provider>
    )
  }

  return (
    <AdminStyleCtx.Provider value={adminStyle}>
    <div ref={rootRef} data-gii-editing-amm-root='1' style={wrapperStyle}>
      {useDs.map((uds: any, idx: number) => {
        const dsKey = String(uds?.dataSourceId || uds?.mainDataSourceId || `ds_${idx}`)
        return <DataSourceSelectionBridge key={`${dsKey}:${practiceContextRevision}`} widgetId={props.id} uds={uds} dsKey={dsKey} onUpdate={onDsUpdate} />
      })}

      {dialog && <BlockingDialog kind={dialog.kind} title={dialog.title} text={dialog.text} onClose={() => setDialog(null)} />}
      {pendingAttestationText != null && (
        <AttestationConfirmDialog
          note={pendingAttestationText}
          saving={saving}
          onCancel={() => setPendingAttestationText(null)}
          onConfirm={() => {
            const note = pendingAttestationText
            setPendingAttestationText(null)
            handleApponiAttestazioneIa(note)
          }}
        />
      )}
      {pendingUndoAttestation && (
        <UndoAttestationConfirmDialog
          saving={saving}
          onCancel={() => setPendingUndoAttestation(false)}
          onConfirm={handleUndoAttestazioneIa}
        />
      )}
      {confirmTransmitBozza && (
        <TransmitBozzaConfirmDialog
          saving={saving}
          reopenCycle={confirmTransmitReopensCycle}
          onCancel={() => {
            setConfirmTransmitBozza(false)
            setConfirmTransmitReopensCycle(false)
          }}
          onConfirm={() => {
            setConfirmTransmitBozza(false)
            setConfirmTransmitReopensCycle(false)
            void handleTransmitBozzaDeterminazioneRia(true)
          }}
        />
      )}
      <div style={workflowHasSeparateActionPanel ? verificationMainPanelStyle : { display: 'contents' }}>
        <div style={{
          flex: '0 0 auto',
          position: 'relative',
          padding: hasSelection && readOnlyBannerMessage && readOnlyBannerMounted ? (readOnlyBannerOpen ? `48px 0 ${toolbarBottomPad}px` : `0 0 ${toolbarBottomPad}px`) : `0 0 ${toolbarBottomPad}px`,
          borderBottom: `1px solid ${cfg.dividerColor || '#cbd8e6'}`,
          transition: 'padding 280ms ease'
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            minHeight: hasSelection && readOnlyBannerMessage && readOnlyBannerMounted ? 36 : undefined
          }}>
            {hasSelection && readOnlyBannerMessage && readOnlyBannerMounted && (
              <div style={{
                position: 'absolute',
                // Da chiuso: quadrato 36x36 centrato sulla riga reale (qualunque sia la sua altezza).
                // Da aperto: stessa posizione di prima (zona padding-top:48 sopra la riga), spostandolo
                // sopra il bordo superiore della riga della stessa misura del padding-top aggiunto al toolbar.
                top: readOnlyBannerOpen ? -48 : '50%',
                transform: readOnlyBannerOpen ? 'none' : 'translateY(-50%)',
                left: 0,
                right: readOnlyBannerOpen ? 0 : 'auto',
                width: readOnlyBannerOpen ? 'auto' : 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: readOnlyBannerOpen ? '6px 10px 6px 6px' : '6px',
                border: '1px solid #fb923c',
                borderRadius: readOnlyBannerOpen ? adminStyle.maskBorderRadius : 8,
                background: '#fff7ed',
                color: '#b42318',
                boxSizing: 'border-box',
                overflow: 'hidden',
                zIndex: 2,
                transition: 'top 280ms ease, transform 280ms ease, width 280ms ease, background-color 220ms ease, border-color 220ms ease'
              }}>
                {readOnlyInfoButton}
                <span style={{
                  fontSize: Math.max(12, adminLabelFontSize(adminStyle)),
                  fontWeight: 700,
                  lineHeight: 1.35,
                  whiteSpace: 'nowrap',
                  opacity: readOnlyBannerOpen ? 1 : 0,
                  transform: readOnlyBannerOpen ? 'translateX(0)' : 'translateX(-8px)',
                  maxWidth: readOnlyBannerOpen ? 'calc(100% - 40px)' : 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'opacity 220ms ease, transform 220ms ease'
                }}>
                  {readOnlyBannerMessage}
                </span>
              </div>
            )}
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: hasSelection && readOnlyBannerMessage && readOnlyBannerMounted ? 44 : 0, transition: 'padding-left 220ms ease' }}>
              <div style={{ fontSize: Number(adminStyle.titleFontSize || 18), fontWeight: Number(cfg.titleFontWeight || 700) as any, color: '#111827', lineHeight: 1.25 }}>
                {hasSelection ? (<>{headerTitleParts.prefix}{headerTitleParts.reportCode ? <span style={{ color: '#2563eb', fontWeight: Number(cfg.titleFontWeight || 700) as any }}>{headerTitleParts.reportCode}</span> : null}</>) : 'Istruttoria amministrativa'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                {pulseSave && <NextActionPulse floating title={pulseSaveTitle} />}
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
              </span>
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
        </div>

        <div style={activeContentStyle}>


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
                  showReadOnlyInfo={showContextualSectionInfo}
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

              {activeAmmSection === 'contestazioni_importi' && (
                <>
                  <SanzioniConsultiveSection loadState={sanzioniConsultive} data={viewData || {}} fields={layerFields} canEdit={false} onChange={onFieldChange} />

                  {!hasDsForSave && (
                    <InfoBox kind='warn'>
                      Configurazione non disponibile. Contattare l’amministratore.
                    </InfoBox>
                  )}

                </>
              )}

              {activeAmmSection === 'verifica_istruttoria' && (
                <>
                  <IaVerificationSummary
                    data={viewData || {}}
                    savedData={initialDraft || {}}
                    fields={layerFields}
                    canEdit={canEdit}
                    role={currentRole}
                    saving={saving}
                    onChange={onFieldChange}
                    onApplyAttestation={setPendingAttestationText}
                    onUndoAttestation={() => setPendingUndoAttestation(true)}
                    onGenerateBozzaDeterminazioneWord={handleGenerateBozzaDeterminazioneWord}
                    onDeleteBozzaDeterminazione={handleDeleteBozzaDeterminazione}
                    onTransmitBozzaDeterminazioneRia={handleTransmitBozzaDeterminazioneRia}
                    onPrepareEmailDirettore={handlePrepareEmailDirettore}
                    onPrepareEmailProtocollo={handlePrepareEmailProtocollo}
                    onGenerateAttoContestazioneWord={handleGenerateAttoContestazioneWord}
                    attoCleanWordGeneratedAfterApproval={
                      !!attoCleanWordGeneratedMarker &&
                      Number(oid) === attoCleanWordGeneratedMarker.oid &&
                      attoContestazioneWorkflowState(viewData || {}) === 'VALIDATA_RIA'
                    }
                    attoDirettoreEmailPrepared={
                      !!attoDirettoreEmailPreparedMarker &&
                      Number(oid) === attoDirettoreEmailPreparedMarker.oid
                    }
                    onTransmitAttoContestazioneRia={handleTransmitAttoContestazioneRia}
                    onPrepareEmailAttoDirettore={handlePrepareEmailAttoDirettore}
                    onPrepareEmailAttoProtocollo={handlePrepareEmailAttoProtocollo}
                    oid={oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null}
                    ds={(active as any)?.ds}
                    layerUrl={(active as any)?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs)}
                    actionBarTarget={verificationActionBarTarget}
                    workflowScope='approvazione'
                    bozzaRefreshKey={String(liveRefreshVersion)}
                  />
                </>
              )}

              {activeAmmSection === 'pagamento' && (
                <PagamentoGuidatoSection data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} canEditSpeseNotifica={canEditPostNotification} showContextualInfo={showContextualSectionInfo} onChange={onFieldChange} />
              )}

              {activeAmmSection === 'notifica' && (
                <>
                  <PreparazioneNotificaAttoSection data={viewData || {}} fields={layerFields} canEdit={canEditPostApproval} onChange={onFieldChange} />
                  <PostAttestazioneIaWorkSection
                    data={viewData || {}}
                    savedData={initialDraft || {}}
                    fields={layerFields}
                    canEdit={canEdit && (currentRole === 'IA' || currentRole === 'ADMIN')}
                    role={currentRole}
                    showIaInfo={currentRole === 'IA' && canEdit}
                    saving={saving}
                    onChange={onFieldChange}
                    actionBarTarget={verificationActionBarTarget}
                    vistoActionPending={false}
                    onApplyAttestation={setPendingAttestationText}
                    onGenerateBozzaDeterminazioneWord={handleGenerateBozzaDeterminazioneWord}
                    onDeleteBozzaDeterminazione={handleDeleteBozzaDeterminazione}
                    onTransmitBozzaDeterminazioneRia={handleTransmitBozzaDeterminazioneRia}
                    onPrepareEmailDirettore={handlePrepareEmailDirettore}
                    onPrepareEmailProtocollo={handlePrepareEmailProtocollo}
                    onGenerateAttoContestazioneWord={handleGenerateAttoContestazioneWord}
                    attoCleanWordGeneratedAfterApproval={
                      !!attoCleanWordGeneratedMarker &&
                      Number(oid) === attoCleanWordGeneratedMarker.oid &&
                      attoContestazioneWorkflowState(viewData || {}) === 'VALIDATA_RIA'
                    }
                    attoDirettoreEmailPrepared={
                      !!attoDirettoreEmailPreparedMarker &&
                      Number(oid) === attoDirettoreEmailPreparedMarker.oid
                    }
                    onTransmitAttoContestazioneRia={handleTransmitAttoContestazioneRia}
                    onPrepareEmailAttoDirettore={handlePrepareEmailAttoDirettore}
                    onPrepareEmailAttoProtocollo={handlePrepareEmailAttoProtocollo}
                    canEditDetermination={false}
                    oid={oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null}
                    ds={(active as any)?.ds}
                    layerUrl={(active as any)?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs)}
                    workflowScope='notifica'
                    bozzaRefreshKey={[
                      oid ?? '',
                      pickAttrCI(viewData || {}, ['determinazione_stato']) ?? '',
                      pickAttrCI(viewData || {}, ['dt_esito_RIA']) ?? '',
                      pickAttrCI(viewData || {}, ['protocollo_atto_accertamento_numero']) ?? '',
                      pickAttrCI(viewData || {}, ['protocollo_atto_accertamento_data']) ?? ''
                    ].join('|')}
                  />
                  <ProtocolloNotificaGuidataSection data={viewData || {}} fields={layerFields} canEdit={canEditPostApproval} showContextualInfo={showContextualSectionInfo} onChange={onFieldChange} />
                  <ChiusuraIstruttoriaSummary
                    data={viewData || {}}
                    fields={layerFields}
                    canEdit={canEditPostNotification}
                    sectionInfo={null}
                    onFillClose={fillCloseMeta}
                    completionIssues={completionIssues}
                  />
                </>
              )}

              {activeAmmSection === 'ricorso' && (
                <RicorsoPostNotificaSection data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} onChange={onFieldChange} />
              )}

              {activeAmmSection === 'cda' && (
                <EsitoCdaSection data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} onChange={onFieldChange} />
              )}

              {activeAmmSection === 'riapertura' && (
                <RiaperturaAmmSection data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} showContextualInfo={showContextualSectionInfo} onChange={onFieldChange} role={profile.role} />
              )}

              {activeAmmSection === 'definizione' && (
                <DefinizionePraticaSection data={viewData || {}} fields={layerFields} canEdit={canEditPostNotification} onChange={onFieldChange} />
              )}

              {activeAmmSection === 'allegati' && (
                <AllegaiaSection
                  oid={oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null}
                  ds={(active as any)?.ds}
                  layerUrl={(active as any)?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs)}
                  canEdit={canEdit}
                  selectedAttachmentId={ammPreviewAttachment?.id ?? null}
                  onSelectedAttachmentChange={(item) => {
                    setAmmPreviewRotationDeg(0)
                    setAmmPreviewAttachment(item ? { id: Number(item.id), name: item.name, contentType: item.contentType } : null)
                  }}
                  rotationDeg={ammPreviewRotationDeg}
                  onRotateLeft={() => setAmmPreviewRotationDeg(v => v - 90)}
                  onRotateRight={() => setAmmPreviewRotationDeg(v => v + 90)}
                  onRotationConfirmed={() => setAmmPreviewRotationDeg(0)}
                  practiceContextRevision={practiceContextRevision}
                />
              )}

              {activeAmmSection === 'anteprima' && (
                <FascicoloAmmPreviewSection
                  data={viewData || {}}
                  liveRefreshVersion={liveRefreshVersion}
                  role={currentRole}
                  nsConfig={{
                    detailUrl: String((cfg as any).nsNotaSpeseDettaglioUrl || ''),
                    parametriUrl: String((cfg as any).nsParametriUrl || ''),
                    parametroCode: String((cfg as any).nsParametroCode || 'SPESE_GENERALI_PERC')
                  }}
                  hasSelection={hasSelection}
                  oid={oid != null && Number.isFinite(Number(oid)) ? Number(oid) : null}
                  ds={(active as any)?.ds}
                  idFieldName={String((active as any)?.idFieldName || 'OBJECTID')}
                  layerUrl={(active as any)?.layerUrl || (configuredDsState as any)?.layerUrl || getDataSourceUrl(configuredDs)}
                  viewerBackgroundColor={String((cfg as any).anteprimaViewerBg || '#282828')}
                  pdfHeaderBackgroundColor={String((cfg as any).anteprimaPdfHeaderBg || '#282828')}
                  pdfPageAreaBackgroundColor={String((cfg as any).anteprimaPdfAreaBg || '#282828')}
                  pdfThumbnailsBackgroundColor={String((cfg as any).anteprimaPdfThumbnailsBg || '#1f1f1f')}
                  pdfToolbarBackgroundColor={String((cfg as any).anteprimaPdfToolbarBg || '#3c3c3c')}
                  sidebarBackgroundColor={String((cfg as any).anteprimaSidebarBg || '#eef4fb')}
                  sidebarBorderColor={String((cfg as any).anteprimaSidebarBorderColor || '#b8c7d9')}
                  sidebarBorderWidth={Number((cfg as any).anteprimaSidebarBorderWidth ?? 1)}
                  borderRadius={Number(adminStyle.formCardBorderRadius ?? 8)}
                />
              )}
            </div>

          </>
        )}
      </div>
      </div>

      {hasSelection && (activeAmmSection === 'verifica_istruttoria' || activeAmmSection === 'notifica') && (
        <div
          data-gii-editing-amm-workflow-actions-footer='1'
          style={{
            flex: '0 0 auto',
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 0 0 0'
          }}
        >
          <div ref={setVerificationActionBarTarget} />
        </div>
      )}

      <DirtyNavigationLockOverlay active={pageVisible && hasSelection} targetRef={rootRef} />
    </div>
    </AdminStyleCtx.Provider>
  )
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

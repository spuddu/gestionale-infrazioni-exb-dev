/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import { useState, useEffect } from 'react'

const { Fragment } = React

const SERVICE_URL =
  'https://services2.arcgis.com/vH5RykSdaAwiEGOJ/arcgis/rest/services/GII_uteniti/FeatureServer/0'

// ── loadEsriModule (AMD require) ───────────────────────────────────────────
function loadEsriModule<T = any>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = (window as any).require
    if (!req) { reject(new Error('AMD require non disponibile')); return }
    try {
      req([path], (mod: T) => resolve(mod), (err: any) => reject(err))
    } catch (e) { reject(e) }
  })
}

// ── Mappa gruppo → Group ID AGOL ──────────────────────────────────────────
const GROUP_MAP: Record<string, string> = {
  'GII_AGR_D1_TR': '5f7a1c6083024ed6912642dea33df836',
  'GII_AGR_D1_TI': 'd2538065685a4e278418d9d4ee63b4f5',
  'GII_AGR_D1_RZ': '77e930cf78684ec28554cb47e09de22c',
  'GII_AGR_D2_TR': 'be5397892089463f9de53c39bfe867d5',
  'GII_AGR_D2_TI': 'b69f51f2b4dc48e5bcd945a0e006a521',
  'GII_AGR_D2_RZ': '80a5260795cf43cca065815fe6e868ab',
  'GII_AGR_D3_TR': 'e8b70407a2cd4f79936d95e4ee2d66d8',
  'GII_AGR_D3_TI': 'd9df51a9ad09458cb7d6677101f8a64c',
  'GII_AGR_D3_RZ': '6bc744628d2742e082d319d302cae2ef',
  'GII_AGR_D4_TR': '98a0edc68f1e4eb3ac06991862407082',
  'GII_AGR_D4_TI': '56a0e66617cc4bbb9415e520f503ad32',
  'GII_AGR_D4_RZ': '40c17e737f5d40cbbdfe0fe28f702446',
  'GII_AGR_D5_TR': 'd0b21d5c77d54f71a951162c102337bf',
  'GII_AGR_D5_TI': '8c201a0905ff4cb7999f375d21962acb',
  'GII_AGR_D5_RZ': '29c74c75fe724258809b2bcaf27d7e21',
  'GII_AGR_D6_TR': 'd4f997fcc65140b585f9784f36b82efb',
  'GII_AGR_D6_TI': 'f82bc26c62cf49328fc101f83121d1a7',
  'GII_AGR_D6_RZ': '62e5ca9cb9e04de7b446cf97d287b815',
  'GII_AGR_DIR': 'efd1d706a54249c785fc2d85fa8a672b',
  'GII_AGR_RI': '4eb266a8da414fe6a47bc16f66c58e6a',
  'GII_AMM_DIR': '317c399ad1984c4392a6341d129fda89',
  'GII_AMM_RI': '73ab7007181c447a89ba5a91f417acb0',
  'GII_AMM_TI': '51d72060aa0540ab9b707fadb2dcca50',
  'GII_TEC_DIR': '720b7ca166d5465e884ea3ad684029b8',
  'GII_TEC_DS_RZ': '7ff515bb66894ee79ce70a9b8f248b94',
  'GII_TEC_DS_TI': 'f204e16c17ff47a3984bedd5b6d4a6d9',
  'GII_TEC_DS_TR': 'ca0fd1f481014871bee270a89bf53bcb',
  'GII_TEC_RI': 'e0cde3526baf4215811c211c7fda43fb',
}

const AGOL_PORTAL = 'https://cbsm-hub.maps.arcgis.com'
const CLIENT_ID   = '1t9qSylui7Nt4Hca'

// Ottieni token dalla sessione ExB tramite esriId
async function getAGOLToken(clientSecret: string): Promise<string> {
  try {
    // Prova prima con esriId (IdentityManager) già autenticato in ExB
    const esriId = await loadEsriModule<any>('esri/identity/IdentityManager')
    const creds = esriId.credentials as any[]
    if (creds?.length) {
      // Cerca credenziale per il portale
      const cred = creds.find((c: any) =>
        c.server && c.server.includes('cbsm-hub.maps.arcgis.com')
      ) ?? creds[0]
      if (cred?.token) return cred.token
    }
    // Fallback: genera token con client credentials OAuth2
    const body = new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: clientSecret,
      grant_type:    'client_credentials',
      f:             'json',
    })
    const res  = await fetch(`${AGOL_PORTAL}/sharing/rest/oauth2/token`, { method: 'POST', body })
    const json = await res.json()
    return json.access_token ?? ''
  } catch (e) {
    console.error('getAGOLToken error:', e)
    return ''
  }
}

// Aggiungi utente a un gruppo AGOL
async function addUserToGroup(username: string, gruppo: string, token: string): Promise<void> {
  const groupId = GROUP_MAP[gruppo]
  if (!groupId) return  // gruppo non mappato, ignora
  const body = new URLSearchParams({ users: username, f: 'json', token })
  const res = await fetch(`${AGOL_PORTAL}/sharing/rest/community/groups/${groupId}/addUsers`, {
    method: 'POST', body,
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`addUsers: ${json.errors[0].message}`)
}

// Rimuovi utente da un gruppo AGOL
async function removeUserFromGroup(username: string, gruppo: string, token: string): Promise<void> {
  const groupId = GROUP_MAP[gruppo]
  if (!groupId) return
  const body = new URLSearchParams({ users: username, f: 'json', token })
  const res = await fetch(`${AGOL_PORTAL}/sharing/rest/community/groups/${groupId}/removeUsers`, {
    method: 'POST', body,
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`removeUsers: ${json.errors[0].message}`)
}

// ── Domini (tutti Integer) ─────────────────────────────────────────────────
const RUOLI = [
  { label: 'TR', value: 1 },
  { label: 'TI', value: 2 },
  { label: 'RZ', value: 3 },
  { label: 'RI', value: 4 },
  { label: 'DT', value: 5 },
  { label: 'DA', value: 6 },
]

const AREE = [
  { label: 'AMM', value: 1 },
  { label: 'AGR', value: 2 },
  { label: 'TEC', value: 3 },
]

const SETTORI = [
  { label: 'CR', value: 1 },
  { label: 'GI', value: 2 },
  { label: 'D1', value: 3 },
  { label: 'D2', value: 4 },
  { label: 'D3', value: 5 },
  { label: 'D4', value: 6 },
  { label: 'D5', value: 7 },
  { label: 'D6', value: 8 },
  { label: 'DS', value: 9 },
]

interface Ufficio { label: string; value: number; aree: number[]; settori: number[] }

const UFFICI: Ufficio[] = [
  { label: 'Cagliari',                               value: 1,  aree: [1,2], settori: [1,2] },
  { label: 'Quartucciu (loc. Is Forreddus)',         value: 2,  aree: [2],   settori: [3]   },
  { label: 'Muravera',                               value: 3,  aree: [2],   settori: [3]   },
  { label: 'Villaputzu',                             value: 4,  aree: [2],   settori: [3]   },
  { label: 'San Sperate',                            value: 5,  aree: [2],   settori: [3]   },
  { label: 'Serramanna (loc. Pimpisu)',              value: 6,  aree: [2],   settori: [4]   },
  { label: 'San Gavino Monreale',                    value: 7,  aree: [2],   settori: [5]   },
  { label: 'Villacidro',                             value: 8,  aree: [2],   settori: [5]   },
  { label: 'San Giovanni Suergiu (loc. Sa Carabia)',value: 9,  aree: [2],   settori: [6]   },
  { label: 'Masainas',                               value: 10, aree: [2],   settori: [6]   },
  { label: 'Senorbì',                                value: 11, aree: [2],   settori: [7]   },
  { label: 'Iglesias (loc. Sa Stoia)',               value: 12, aree: [2],   settori: [8]   },
  { label: 'Siliqua',                                value: 13, aree: [2],   settori: [8]   },
  { label: 'Cagliari (TEC)',                         value: 14, aree: [3],   settori: [9]   },
  { label: 'Villasor',                               value: 15, aree: [3],   settori: [9]   },
  { label: 'San Giovanni Suergiu (loc. Is Samis)',  value: 16, aree: [3],   settori: [9]   },
]

// ── Regole cascata ─────────────────────────────────────────────────────────
function getAreePerRuolo(ruolo: number): number[] {
  switch (ruolo) {
    case 1: return [2, 3]        // TR
    case 2: return [1, 2, 3]     // TI
    case 3: return [2, 3]        // RZ
    case 4: return [1, 2, 3]     // RI
    case 5: return [2, 3]        // DT
    case 6: return [1]           // DA
    default: return []
  }
}

function getSettoriPerRuoloArea(ruolo: number, area: number): number[] {
  if (ruolo === 5 || ruolo === 6) return []          // DT, DA → nessun settore
  if (ruolo === 4) {                                  // RI → settore fisso per area
    if (area === 1) return [1]                        // AMM → CR
    if (area === 2) return [2]                        // AGR → GI
    if (area === 3) return [9]                        // TEC → DS
    return []
  }
  if (ruolo === 2 && area === 1) return [1]           // TI + AMM → CR
  if (area === 2) return [3, 4, 5, 6, 7, 8]          // AGR → D1-D6
  if (area === 3) return [9]                          // TEC → DS
  return []
}

function getUfficiPerAreaSettore(area: number, settore: number): Ufficio[] {
  return UFFICI.filter(u => u.aree.includes(area) && u.settori.includes(settore))
}

function calcolaGruppo(ruolo: number, area: number, settore: number): string {
  const r = RUOLI.find(x => x.value === ruolo)?.label ?? ''
  const a = AREE.find(x => x.value === area)?.label ?? ''
  const s = SETTORI.find(x => x.value === settore)?.label ?? ''
  if (a === 'AGR') {
    if (['TR','TI','RZ'].includes(r)) return `GII_AGR_${s}_${r}`
    if (r === 'RI') return 'GII_AGR_RI'
    if (r === 'DT') return 'GII_AGR_DIR'
  }
  if (a === 'TEC') {
    if (['TR','TI','RZ'].includes(r)) return `GII_TEC_${s}_${r}`
    if (r === 'RI') return 'GII_TEC_RI'
    if (r === 'DT') return 'GII_TEC_DIR'
  }
  if (a === 'AMM') {
    if (r === 'DA') return 'GII_AMM_DIR'
    if (r === 'TI') return 'GII_AMM_TI'
    if (r === 'RI') return 'GII_AMM_RI'
  }
  return ''
}

// ── Tipi ───────────────────────────────────────────────────────────────────
interface UtenteForm {
  objectid?: number
  username: string
  full_name: string
  ruolo: number | null
  area: number | null
  settore: number | null
  ufficio: number | null
  gruppo: string
  gruppo_precedente: string  // usato da PA per rimozione dal vecchio gruppo
}

interface UtenteRecord {
  objectid: number
  username: string
  full_name: string
  ruolo: number | null
  area: number | null
  settore: number | null
  ufficio: number | null
  gruppo: string
  gruppo_precedente: string
}

const emptyForm = (): UtenteForm => ({
  username: '', full_name: '',
  ruolo: null, area: null, settore: null, ufficio: null,
  gruppo: '', gruppo_precedente: '',
})

// ── FeatureLayer ───────────────────────────────────────────────────────────
let _fl: any = null

async function getFL(): Promise<any> {
  if (_fl) return _fl
  const FeatureLayer = await loadEsriModule<any>('esri/layers/FeatureLayer')
  _fl = new FeatureLayer({ url: SERVICE_URL })
  await _fl.load().catch(() => {})
  return _fl
}

async function fetchUtenti(): Promise<UtenteRecord[]> {
  const fl = await getFL()
  const res = await fl.queryFeatures({
    where: '1=1',
    outFields: ['OBJECTID','username','full_name','ruolo','area','settore','ufficio','gruppo','gruppo_precedente'],
    returnGeometry: false,
  })
  return (res.features ?? []).map((f: any) => {
    const a = f.attributes
    return {
      objectid:  a.OBJECTID ?? a.objectid,
      username:  a.username  ?? '',
      full_name: a.full_name ?? '',
      ruolo:     a.ruolo   != null ? Number(a.ruolo)   : null,
      area:      a.area    != null ? Number(a.area)    : null,
      settore:   a.settore != null ? Number(a.settore) : null,
      ufficio:   a.ufficio != null ? Number(a.ufficio) : null,
      gruppo:    a.gruppo  ?? '',
    }
  })
}

async function saveUtente(form: UtenteForm): Promise<void> {
  const fl = await getFL()
  const attrs: any = {
    username:          form.username,
    full_name:         form.full_name,
    ruolo:             form.ruolo,
    area:              form.area,
    settore:           form.settore,
    ufficio:           form.ufficio,
    gruppo:            form.gruppo || null,
    gruppo_precedente: form.gruppo_precedente || null,
  }
  if (form.objectid != null) {
    attrs.OBJECTID = form.objectid
    const res = await fl.applyEdits({ updateFeatures: [{ attributes: attrs }] })
    if (res.updateFeatureResults?.[0]?.error)
      throw new Error(res.updateFeatureResults[0].error.description)
  } else {
    const res = await fl.applyEdits({ addFeatures: [{ attributes: attrs }] })
    if (res.addFeatureResults?.[0]?.error)
      throw new Error(res.addFeatureResults[0].error.description)
  }
}

async function deleteUtente(objectid: number): Promise<void> {
  const fl = await getFL()
  const queryRes = await fl.queryFeatures({
    objectIds: [objectid],
    outFields: ['OBJECTID'],
    returnGeometry: false,
  })
  const feature = queryRes.features?.[0]
  if (!feature) throw new Error('Feature non trovata')
  const res = await fl.applyEdits({ deleteFeatures: [feature] })
  if (res.deleteFeatureResults?.[0]?.error)
    throw new Error(res.deleteFeatureResults[0].error.description)
}

// ── Export CSV ────────────────────────────────────────────────────────────
function exportCSV(utenti: UtenteRecord[]): void {
  const labelOf = (list: { label: string; value: number }[], val: number | null) =>
    val != null ? (list.find(x => x.value === val)?.label ?? '') : ''

  const rows = utenti.map(u => {
    const area    = labelOf(AREE,    u.area)
    const settore = labelOf(SETTORI, u.settore)
    const ufficio = labelOf(UFFICI,  u.ufficio)
    const ruolo   = labelOf(RUOLI,   u.ruolo)
    // id_ufficio: valore numerico (codice ufficio)
    const id_uff  = u.ufficio ?? ''
    const gruppo  = u.gruppo ?? ''
    // Escaping celle con virgole
    const esc = (v: any) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    return [u.username, u.full_name, area, settore, ufficio, ruolo, id_uff, gruppo]
      .map(esc).join(',')
  })

  const csv = ['username,full_name,area_cod,settore_cod,ufficio,ruolo,id_ufficio,gruppo', ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'utenti.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── CSS ────────────────────────────────────────────────────────────────────
const styles = `
  .ggu { font-family: Arial, sans-serif; font-size: 13px; padding: 12px; height: 100%; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; }
  .ggu-title { font-size: 15px; font-weight: bold; color: #1F4E79; border-bottom: 2px solid #1F4E79; padding-bottom: 6px; margin: 0; }
  .ggu-form { background: #f5f9ff; border: 1px solid #c5d9f1; border-radius: 6px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ggu-field { display: flex; flex-direction: column; gap: 3px; }
  .ggu-label { font-size: 11px; font-weight: bold; color: #1F4E79; }
  .ggu-input, .ggu-select { width: 100%; padding: 5px 8px; border: 1px solid #aac4e0; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fff; }
  .ggu-input:focus, .ggu-select:focus { outline: none; border-color: #1F4E79; }
  .ggu-input:disabled, .ggu-select:disabled { background: #e8f0e9; color: #375623; font-style: italic; border-color: #b8d4b0; }
  .ggu-btns { display: flex; gap: 8px; grid-column: 1 / -1; padding-top: 4px; }
  .ggu-btn { padding: 6px 18px; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: bold; }
  .ggu-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .ggu-btn-save { background: #1F4E79; color: #fff; }
  .ggu-btn-save:hover:not(:disabled) { background: #16375a; }
  .ggu-btn-cancel { background: #e0e0e0; color: #333; }
  .ggu-btn-cancel:hover:not(:disabled) { background: #ccc; }
  .ggu-btn-new { background: #375623; color: #fff; }
  .ggu-btn-new:hover { background: #264018; }
  .ggu-btn-export { background: #1B6584; color: #fff; }
  .ggu-btn-export:hover:not(:disabled) { background: #134d63; }
  .ggu-table-wrap { flex: 1; overflow-y: auto; border: 1px solid #c5d9f1; border-radius: 6px; min-height: 0; }
  .ggu-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .ggu-table th { background: #1F4E79; color: #fff; padding: 7px 8px; text-align: left; position: sticky; top: 0; z-index: 1; white-space: nowrap; }
  .ggu-table td { padding: 6px 8px; border-bottom: 1px solid #e0eaf4; vertical-align: middle; }
  .ggu-table tbody tr:nth-child(odd) td { background: #f5f9ff; }
  .ggu-table tbody tr:nth-child(even) td { background: #ffffff; }
  .ggu-table tr:hover td { background: #ddeeff; }
  .ggu-table tr.ggu-sel td { background: #d0e4f7; }
  .ggu-act { cursor: pointer; font-size: 11px; padding: 2px 8px; border-radius: 3px; border: none; margin-right: 4px; font-weight: bold; }
  .ggu-act-edit { background: #1B6584; color: #fff; }
  .ggu-act-del { background: #c00; color: #fff; }
  .ggu-msg { padding: 7px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .ggu-msg-ok { background: #e2efda; color: #375623; border: 1px solid #b8d4b0; }
  .ggu-msg-err { background: #fce4e4; color: #c00; border: 1px solid #f5b8b8; }
  .ggu-gruppo { font-family: monospace; font-size: 11px; background: #e2efda; padding: 2px 6px; border-radius: 3px; color: #375623; white-space: nowrap; }
  .ggu-empty { text-align: center; color: #888; padding: 20px; font-style: italic; }
`

// ── Widget ─────────────────────────────────────────────────────────────────
export default function Widget(props: AllWidgetProps<IMConfig>) {
  const [utenti, setUtenti]   = useState<UtenteRecord[]>([])
  const [form, setForm]       = useState<UtenteForm>(emptyForm())
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try { setUtenti(await fetchUtenti()) }
    catch (e: any) { showMsg('Errore caricamento: ' + (e?.message ?? e), false) }
    setLoading(false)
  }

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  // ── Cascata ───────────────────────────────────────────────────────────────
  const onRuoloChange = (val: number | null) => {
    const aree = val ? getAreePerRuolo(val) : []
    const areaAuto = aree.length === 1 ? aree[0] : null
    const settori = val && areaAuto ? getSettoriPerRuoloArea(val, areaAuto) : []
    const settoreAuto = settori.length === 1 ? settori[0] : null
    const isCalgliari = val && (val === 4 || val === 5 || val === 6 || (val === 2 && areaAuto === 1))
    const ufficioAuto = isCalgliari ? 1 : null
    const gr = val && areaAuto ? calcolaGruppo(val, areaAuto, settoreAuto ?? 0) : ''
    setForm(f => ({ ...f, ruolo: val, area: areaAuto, settore: settoreAuto, ufficio: ufficioAuto, gruppo: gr }))
  }

  const onAreaChange = (val: number | null) => {
    if (!form.ruolo) return
    const settori = val ? getSettoriPerRuoloArea(form.ruolo, val) : []
    const settoreAuto = settori.length === 1 ? settori[0] : null
    const isCagliari = form.ruolo === 4 || form.ruolo === 5 || form.ruolo === 6 || (form.ruolo === 2 && val === 1)
    const ufficioAuto = isCagliari ? 1 : null
    const gr = form.ruolo && val ? calcolaGruppo(form.ruolo, val, settoreAuto ?? 0) : ''
    setForm(f => ({ ...f, area: val, settore: settoreAuto, ufficio: ufficioAuto, gruppo: gr }))
  }

  const onSettoreChange = (val: number | null) => {
    if (!form.ruolo || !form.area) return
    const uffici = val ? getUfficiPerAreaSettore(form.area, val) : []
    const ufficioAuto = uffici.length === 1 ? uffici[0].value : null
    const gr = form.ruolo && form.area && val ? calcolaGruppo(form.ruolo, form.area, val) : ''
    setForm(f => ({ ...f, settore: val, ufficio: ufficioAuto, gruppo: gr }))
  }

  const onUfficioChange = (val: number | null) => {
    setForm(f => ({ ...f, ufficio: val }))
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const onNew = () => { setForm(emptyForm()); setEditing(true) }

  const onEdit = (u: UtenteRecord) => {
    setForm({
      objectid:          u.objectid,
      username:          u.username,
      full_name:         u.full_name,
      ruolo:             u.ruolo,
      area:              u.area,
      settore:           u.settore,
      ufficio:           u.ufficio,
      gruppo:            u.gruppo,
      gruppo_precedente: u.gruppo,  // salva il gruppo attuale → PA lo userà per la rimozione
    })
    setEditing(true)
  }

  const onCancel = () => { setForm(emptyForm()); setEditing(false) }

  const onSave = async () => {
    if (!form.username.trim())  { showMsg('Username obbligatorio', false); return }
    if (!form.full_name.trim()) { showMsg('Nome completo obbligatorio', false); return }
    if (!form.ruolo)            { showMsg('Ruolo obbligatorio', false); return }
    if (!form.area)             { showMsg('Area obbligatoria', false); return }
    const settoriPrevisti = getSettoriPerRuoloArea(form.ruolo, form.area)
    if (settoriPrevisti.length > 0 && !form.settore) { showMsg('Settore obbligatorio', false); return }
    if (!form.ufficio)          { showMsg('Ufficio obbligatorio', false); return }
    setSaving(true)
    try {
      const token = await getAGOLToken(props.config?.clientSecret ?? '')
      const isUpdate = form.objectid != null

      if (isUpdate && form.gruppo_precedente && form.gruppo_precedente !== form.gruppo) {
        // Modifica: rimuovi dal vecchio gruppo e aggiungi al nuovo
        await removeUserFromGroup(form.username, form.gruppo_precedente, token)
        await addUserToGroup(form.username, form.gruppo, token)
      } else if (!isUpdate) {
        // Nuovo record: aggiungi al gruppo
        await addUserToGroup(form.username, form.gruppo, token)
      }

      await saveUtente(form)
      showMsg(form.objectid ? 'Utente aggiornato' : 'Utente aggiunto', true)
      setEditing(false); setForm(emptyForm()); await load()
    } catch (e: any) { showMsg('Errore: ' + (e?.message ?? e), false) }
    setSaving(false)
  }

  const onDelete = async (u: UtenteRecord) => {
    if (!window.confirm(`Eliminare l'utente "${u.username}"?`)) return
    setSaving(true)
    try {
      const token = await getAGOLToken(props.config?.clientSecret ?? '')
      if (u.gruppo) await removeUserFromGroup(u.username, u.gruppo, token)
      await deleteUtente(u.objectid)
      showMsg('Utente eliminato', true)
      await load()
    } catch (e: any) { showMsg('Errore: ' + (e?.message ?? e), false) }
    setSaving(false)
  }

  // ── Opzioni combo filtrate ────────────────────────────────────────────────
  const areeDisp    = form.ruolo ? AREE.filter(a => getAreePerRuolo(form.ruolo!).includes(a.value)) : []
  const settoriDisp = form.ruolo && form.area ? SETTORI.filter(s => getSettoriPerRuoloArea(form.ruolo!, form.area!).includes(s.value)) : []
  const ufficiDisp  = form.area && form.settore ? getUfficiPerAreaSettore(form.area, form.settore) : []

  const isAreaAuto     = areeDisp.length === 1
  const isSettoreFisso = !!form.ruolo && (
    form.ruolo === 5 || form.ruolo === 6 ||
    form.ruolo === 4 ||
    (form.ruolo === 2 && form.area === 1)
  )
  const isUfficioFisso = !!form.ruolo && (
    form.ruolo === 4 || form.ruolo === 5 || form.ruolo === 6 ||
    (form.ruolo === 2 && form.area === 1)
  )

  const labelOf = (list: { label: string; value: number }[], val: number | null) =>
    val != null ? (list.find(x => x.value === val)?.label ?? '') : ''

  return (
    <Fragment>
      <style>{styles}</style>
      <div className="ggu">
        <div className="ggu-title">GII – Gestione Utenti</div>

        {msg && <div className={`ggu-msg ${msg.ok ? 'ggu-msg-ok' : 'ggu-msg-err'}`}>{msg.text}</div>}

        {!editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ggu-btn ggu-btn-new" onClick={onNew}>+ Nuovo utente</button>
            <button className="ggu-btn ggu-btn-export" onClick={() => exportCSV(utenti)}
              disabled={utenti.length === 0}>⬇ Esporta utenti.csv</button>
          </div>
        )}

        {editing && (
          <div className="ggu-form">
            <div className="ggu-field">
              <div className="ggu-label">Username *</div>
              <input className="ggu-input" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Nome completo *</div>
              <input className="ggu-input" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Ruolo *</div>
              <select className="ggu-select" value={form.ruolo ?? ''}
                onChange={e => onRuoloChange(e.target.value ? Number(e.target.value) : null)}>
                <option value="">— seleziona —</option>
                {RUOLI.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Area *</div>
              <select className="ggu-select" value={form.area ?? ''}
                disabled={!form.ruolo || isAreaAuto}
                onChange={e => onAreaChange(e.target.value ? Number(e.target.value) : null)}>
                <option value="">— seleziona —</option>
                {areeDisp.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Settore</div>
              {isSettoreFisso
                ? <input className="ggu-input" disabled value={labelOf(SETTORI, form.settore) || '—'} />
                : <select className="ggu-select" value={form.settore ?? ''}
                    disabled={!form.area || settoriDisp.length === 0}
                    onChange={e => onSettoreChange(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— seleziona —</option>
                    {settoriDisp.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
              }
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Ufficio *</div>
              {isUfficioFisso
                ? <input className="ggu-input" disabled value="Cagliari" />
                : <select className="ggu-select" value={form.ufficio ?? ''}
                    disabled={!form.settore || ufficiDisp.length === 0}
                    onChange={e => onUfficioChange(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— seleziona —</option>
                    {ufficiDisp.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
              }
            </div>
            <div className="ggu-field">
              <div className="ggu-label">Gruppo</div>
              <input className="ggu-input" disabled value={form.gruppo} />
            </div>
            <div className="ggu-btns">
              <button className="ggu-btn ggu-btn-save" onClick={onSave} disabled={saving}>
                {saving ? 'Salvataggio...' : form.objectid ? 'Aggiorna' : 'Salva'}
              </button>
              <button className="ggu-btn ggu-btn-cancel" onClick={onCancel} disabled={saving}>Annulla</button>
            </div>
          </div>
        )}

        <div className="ggu-table-wrap">
          {loading
            ? <div className="ggu-empty">Caricamento...</div>
            : (
              <table className="ggu-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Nome</th>
                    <th>Ruolo</th>
                    <th>Area</th>
                    <th>Settore</th>
                    <th>Ufficio</th>
                    <th>Gruppo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {utenti.length === 0 && (
                    <tr><td colSpan={8} className="ggu-empty">Nessun utente presente</td></tr>
                  )}
                  {utenti.map(u => (
                    <tr key={u.objectid} className={form.objectid === u.objectid ? 'ggu-sel' : ''}>
                      <td>{u.username}</td>
                      <td>{u.full_name}</td>
                      <td>{labelOf(RUOLI, u.ruolo)}</td>
                      <td>{labelOf(AREE, u.area)}</td>
                      <td>{labelOf(SETTORI, u.settore)}</td>
                      <td>{labelOf(UFFICI, u.ufficio)}</td>
                      <td><span className="ggu-gruppo">{u.gruppo}</span></td>
                      <td>
                        <button className="ggu-act ggu-act-edit" onClick={() => onEdit(u)}>✎</button>
                        <button className="ggu-act ggu-act-del" onClick={() => onDelete(u)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </Fragment>
  )
}

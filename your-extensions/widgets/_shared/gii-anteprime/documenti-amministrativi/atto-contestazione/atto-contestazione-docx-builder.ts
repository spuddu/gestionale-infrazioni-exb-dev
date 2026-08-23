import { buildVerbalePdfMap } from '../proposta-contestazione/proposta-contestazione-data-map'
import { ATTO_CONTESTAZIONE_TEMPLATE_DOCX_B64 } from './atto-contestazione-template'

type ZipEntry = { name: string, data: Uint8Array }
export type AttoParticipantIdentity = {
  nome?: string
  cognome?: string
  titolo?: string
}

export type AttoContestazioneDocxOptions = {
  watermarkBozza?: boolean
  participants?: {
    da?: AttoParticipantIdentity
    riAmm?: AttoParticipantIdentity
    tiAmm?: AttoParticipantIdentity
  }
}

function clean (v: any): string { return String(v ?? '').trim() }
function escXml (v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
function safeFilePart (value: string): string {
  return clean(value || 'pratica').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'pratica'
}
function base64ToBytes (b64: string): Uint8Array {
  const g: any = globalThis as any
  const bin = typeof atob === 'function' ? atob(b64) : (g.Buffer ? g.Buffer.from(b64, 'base64').toString('binary') : '')
  if (!bin) throw new Error('Decodifica base64 non disponibile nel browser corrente.')
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function readU16 (data: Uint8Array, off: number): number { return data[off] | (data[off + 1] << 8) }
function readU32 (data: Uint8Array, off: number): number { return (data[off] | (data[off + 1] << 8) | (data[off + 2] << 16) | (data[off + 3] << 24)) >>> 0 }
function u16 (value: number): number[] { return [value & 0xff, (value >>> 8) & 0xff] }
function u32 (value: number): number[] { return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff] }
function concatBytes (parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0))
  let off = 0
  parts.forEach(p => { out.set(p, off); off += p.length })
  return out
}
function crc32 (data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}
function utf8 (value: string): Uint8Array { return new TextEncoder().encode(value) }
function readUtf8 (data: Uint8Array): string { return new TextDecoder('utf-8').decode(data) }
function readZipStored (data: Uint8Array): ZipEntry[] {
  const entries: ZipEntry[] = []
  const decoder = new TextDecoder('utf-8')
  let off = 0
  while (off + 4 <= data.length) {
    const sig = readU32(data, off)
    if (sig === 0x02014b50 || sig === 0x06054b50) break
    if (sig !== 0x04034b50) break
    const method = readU16(data, off + 8)
    const compressedSize = readU32(data, off + 18)
    const uncompressedSize = readU32(data, off + 22)
    const nameLen = readU16(data, off + 26)
    const extraLen = readU16(data, off + 28)
    const nameStart = off + 30
    const name = decoder.decode(data.slice(nameStart, nameStart + nameLen))
    const dataStart = nameStart + nameLen + extraLen
    const dataEnd = dataStart + compressedSize
    if (method !== 0 || compressedSize !== uncompressedSize) throw new Error(`Template DOCX non compatibile: ${name}.`)
    entries.push({ name, data: data.slice(dataStart, dataEnd) })
    off = dataEnd
  }
  return entries
}
function buildZipStored (entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  entries.forEach(entry => {
    const name = enc.encode(entry.name)
    const data = entry.data
    const crc = crc32(data)
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)])
    locals.push(local, name, data)
    const central = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)])
    centrals.push(central, name)
    offset += local.length + name.length + data.length
  })
  const centralBytes = concatBytes(centrals)
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(centralBytes.length), ...u32(offset), ...u16(0)])
  return concatBytes([...locals, centralBytes, end])
}

function tokenTextXml (value: string): string {
  const lines = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (!lines.length) return '<w:t></w:t>'
  return lines.map((line, index) => `${index ? '<w:br/>' : ''}<w:t xml:space="preserve">${escXml(line)}</w:t>`).join('')
}
function replaceToken (xml: string, token: string, value: string): string {
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rx = new RegExp(`<w:t([^>]*)>${escapedToken}<\\/w:t>`, 'g')
  return xml.replace(rx, tokenTextXml(value))
}
function pickAttrCI (obj: any, names: string[]): any {
  if (!obj) return undefined
  for (const n of names) if (obj[n] !== undefined) return obj[n]
  const keys = Object.keys(obj)
  for (const n of names) {
    const found = keys.find(k => k.toLowerCase() === n.toLowerCase())
    if (found) return obj[found]
  }
  return undefined
}
function euroLine (label: string, value: string): string {
  const cleanValue = clean(value)
  return cleanValue && cleanValue !== '—' ? `${label}: ${cleanValue}` : ''
}
function actTitle (m: Record<string, string>): string {
  const n = clean(m.accertamento_numero) || 'A-___/____'
  const tipo = clean(m.tipo_atto_amm).toUpperCase()
  if (tipo === 'RIMBORSO') return `Richiesta di rimborso n. ${n}`
  if (tipo === 'RISARCIMENTO_DANNI') return `Richiesta di risarcimento danni n. ${n}`
  if (tipo === 'RIMBORSO_RISARCIMENTO') return `Richiesta di rimborso e risarcimento danni n. ${n}`
  if (tipo === 'ARCHIVIAZIONE') return `Comunicazione di archiviazione n. ${n}`
  if (tipo === 'VERBALE_RISARCIMENTO') return `Atto di accertamento e contestazione n. ${n} con richiesta di rimborso e/o risarcimento danni`
  return `Atto di accertamento e contestazione n. ${n}`
}
function introText (m: Record<string, string>): string {
  const detNum = clean(m.determinazione_numero) || '___'
  const detData = clean(m.determinazione_data) || '________'
  const rapporto = clean(m.n_rapporto) || '___'
  const rapportoData = clean(m.data_rilevazione) || clean(m.data_approvazione_rapporto) || '________'
  return `Con determinazione del Direttore dell’Area Affari Generali e Programmazione Finanziaria n. ${detNum} del ${detData}, adottata all’esito dell’istruttoria relativa al Rapporto tecnico di rilevazione n. ${rapporto}${rapportoData ? ` del ${rapportoData}` : ''}, è stata disposta la definizione del procedimento nei termini di seguito indicati. Con il presente atto si comunica e, ove previsto, si contesta formalmente quanto accertato.`
}
function paymentText (m: Record<string, string>): string {
  const total = clean(m.pagamento_importo_totale)
  const modalita = clean(m.pagamento_modalita)
  const scadenza = clean(m.pagamento_scadenza)
  const lines: string[] = ['Modalità e termini di pagamento']
  if (total) lines.push(`Importo complessivo dovuto: ${total}.`)
  if (modalita) lines.push(`Modalità: ${modalita}.`)
  if (scadenza) lines.push(`Scadenza: ${scadenza}.`)
  if (clean(m.pagopa_iuv)) lines.push(`IUV pagoPA: ${clean(m.pagopa_iuv)}.`)
  if (clean(m.pagopa_codice_avviso)) lines.push(`Codice avviso pagoPA: ${clean(m.pagopa_codice_avviso)}.`)
  if (clean(m.bonifico_iban)) lines.push(`IBAN: ${clean(m.bonifico_iban)}.`)
  if (clean(m.bonifico_intestatario)) lines.push(`Intestatario: ${clean(m.bonifico_intestatario)}.`)
  if (clean(m.bonifico_causale)) lines.push(`Causale: ${clean(m.bonifico_causale)}.`)
  if (lines.length === 1) lines.push('[DA COMPLETARE PRIMA DELLA NOTIFICA]')
  return lines.join('\n')
}
const TITLE_LABELS: Record<string, string> = {
  SIG: 'Sig.',
  SIGRA: 'Sig.ra',
  DOTT: 'Dott.',
  DOTTSSA: 'Dott.ssa',
  ING: 'Ing.',
  ARCH: 'Arch.',
  GEOM: 'Geom.',
  RAG: 'Rag.',
  AVV: 'Avv.',
  PROF: 'Prof.',
  PROFSSA: 'Prof.ssa',
  PER_AGR: 'Per. Agr.',
  PER_IND: 'Per. Ind.'
}

function personInitials (person?: AttoParticipantIdentity): string {
  const words = [clean(person?.nome), clean(person?.cognome)]
    .join(' ')
    .match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) || []
  return words.map(word => `${word.charAt(0).toUpperCase()}.`).join('')
}

function personDisplayName (person?: AttoParticipantIdentity, withTitle = false): string {
  const nome = clean(person?.nome)
  const cognome = clean(person?.cognome)
  const fullName = [nome, cognome].filter(Boolean).join(' ')
  if (!fullName) return ''
  if (!withTitle) return fullName
  const code = clean(person?.titolo).toUpperCase()
  const title = TITLE_LABELS[code] || ''
  return [title, fullName].filter(Boolean).join(' ')
}

function conditionalLastPageField (text: string, bold = false): string {
  const runPr = `<w:rPr><w:rFonts w:ascii="Bookman Old Style" w:hAnsi="Bookman Old Style"/>${bold ? '<w:b/>' : ''}<w:sz w:val="16"/><w:szCs w:val="16"/><w:lang w:val="it-IT"/></w:rPr>`
  const safe = escXml(text).replace(/"/g, '&quot;')
  return [
    `<w:r>${runPr}<w:fldChar w:fldCharType="begin"/></w:r>`,
    `<w:r>${runPr}<w:instrText xml:space="preserve"> IF </w:instrText></w:r>`,
    `<w:r>${runPr}<w:fldChar w:fldCharType="begin"/></w:r>`,
    `<w:r>${runPr}<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>`,
    `<w:r>${runPr}<w:fldChar w:fldCharType="end"/></w:r>`,
    `<w:r>${runPr}<w:instrText xml:space="preserve"> = </w:instrText></w:r>`,
    `<w:r>${runPr}<w:fldChar w:fldCharType="begin"/></w:r>`,
    `<w:r>${runPr}<w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>`,
    `<w:r>${runPr}<w:fldChar w:fldCharType="end"/></w:r>`,
    `<w:r>${runPr}<w:instrText xml:space="preserve"> &quot;${safe}&quot; &quot;&quot; </w:instrText></w:r>`,
    `<w:r>${runPr}<w:fldChar w:fldCharType="separate"/></w:r>`,
    `<w:r>${runPr}<w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`,
    `<w:r>${runPr}<w:fldChar w:fldCharType="end"/></w:r>`
  ].join('')
}
function buildLastPageFooter (tokens: Record<string, string>): string {
  const da = clean(tokens['{{SIGLA_DA}}'])
  const ri = clean(tokens['{{SIGLA_RI_AMM}}'])
  const ti = clean(tokens['{{SIGLA_TI_AMM}}'])
  const areaLine = 'AREA AA.GG. e PROGRAMMAZIONE FINANZIARIA'
  const mailLine = 'cbsm@cbsm.it  –  cbsm@pec.cbsm.it'
  const tab = '<w:r><w:tab/></w:r>'
  const space = '<w:r><w:t xml:space="preserve"> </w:t></w:r>'
  const spaces12 = '<w:r><w:t xml:space="preserve">            </w:t></w:r>'

  // Replica la struttura del piè di pagina della carta intestata originale:
  // riga 1: D.Area + sigla  |  AREA AA.GG. e PROGRAMMAZIONE FINANZIARIA
  // riga 2: C.Sett. + sigla |  cbsm@cbsm.it – cbsm@pec.cbsm.it
  // riga 3: Coll. + sigla
  // I tab sono lasciati fuori dai campi IF: sulle pagine non finali restano
  // privi di testo e quindi non producono alcun contenuto visibile.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>` +
      `${conditionalLastPageField('D.Area', false)}${tab}${conditionalLastPageField(da, true)}` +
      `${tab}${tab}${tab}${conditionalLastPageField(areaLine, true)}` +
    `</w:p>` +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>` +
      `${conditionalLastPageField('C.Sett.', false)}${space}${tab}${conditionalLastPageField(ri, true)}${space}` +
      `${tab}${tab}${tab}${spaces12}${conditionalLastPageField(mailLine, true)}` +
    `</w:p>` +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>` +
      `${conditionalLastPageField('Coll.       ', false)}${conditionalLastPageField(ti, true)}` +
    `</w:p>` +
    `</w:ftr>`
}
function buildTokens (data: any, fields: any[], profile: { username: string, fullName: string }, options?: AttoContestazioneDocxOptions): Record<string, string> {
  const m = buildVerbalePdfMap(data, fields as any, profile)
  const isPg = clean(m.trasgressore_tipo).toUpperCase() === 'PG'
  const amounts = [
    euroLine('Sanzione pecuniaria', clean(m.sanzione_importo_base) || clean(m.sanzione_importo_ridotta)),
    euroLine('Rimborso attrezzature', clean(m.attrezzature_importo_netto) || clean(m.attrezzature_risarcimento_importo)),
    euroLine('Risarcimento danni', clean(m.risarcimento_danni_importo)),
    euroLine('Spese di notifica', clean(m.sanzione_spese_notifica)),
    euroLine('Totale dovuto', clean(m.pagamento_importo_totale))
  ].filter(Boolean)
  // Firma e sigle derivano esclusivamente dai campi anagrafici strutturati
  // nome/cognome/titolo della tabella GII_utenti. Non si usa mai full_name,
  // username, ruolo o altre etichette come fonte delle iniziali.
  const da = options?.participants?.da
  const riAmm = options?.participants?.riAmm
  const tiAmm = options?.participants?.tiAmm
  const daDisplayName = personDisplayName(da, true)
  return {
    '{{DEST_FORMULA}}': isPg ? 'Spett.le' : 'Egr. Sig.',
    '{{DEST_NOME}}': clean(m.trasgressore).toUpperCase() || '________________________',
    '{{DEST_CF_PIVA}}': clean(m.cf_piva) ? `${isPg ? 'P. IVA' : 'Codice fiscale'}: ${clean(m.cf_piva)}` : '',
    '{{DEST_PEC}}': clean(m.pec),
    '{{DEST_INDIRIZZO}}': clean(m.indirizzo),
    '{{DEST_COMUNE_CAP}}': clean(m.comune_cap),
    '{{OGGETTO}}': actTitle(m),
    '{{RIFERIMENTI}}': `Rapporto tecnico di rilevazione n. ${clean(m.n_rapporto) || '—'} – Determinazione n. ${clean(m.determinazione_numero) || '—'} del ${clean(m.determinazione_data) || '—'}`,
    '{{INTRODUZIONE}}': introText(m),
    '{{FATTI}}': `Fatti accertati\n${clean(m.descrizione_fatti) || '[DA COMPLETARE]'}`,
    '{{VIOLAZIONI}}': `Violazioni contestate\n${clean(m.violazioni) || '[DA COMPLETARE]'}`,
    '{{IMPORTI}}': `Importi\n${amounts.length ? amounts.join('\n') : 'Nessun importo da corrispondere.'}`,
    '{{PAGAMENTO}}': paymentText(m),
    '{{AVVERTENZE}}': 'Avvertenze e strumenti di tutela\n[DA COMPLETARE/VERIFICARE PRIMA DELLA NOTIFICA]',
    '{{SIGLA_DA}}': personInitials(da),
    '{{SIGLA_RI_AMM}}': personInitials(riAmm),
    '{{SIGLA_TI_AMM}}': personInitials(tiAmm),
    '{{DA_NOME}}': daDisplayName ? `(${daDisplayName})` : '(________________________)'
  }
}
function addBozzaWatermarkToHeader (xml: string): string {
  if (!xml || xml.includes('GII_BOZZA_ATTO_WATERMARK')) return xml
  const watermark = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:pict><v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e"><v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas><v:path textpathok="t" o:connecttype="custom"/><v:textpath on="t" fitshape="t"/><o:lock v:ext="edit" text="t" shapetype="t"/></v:shapetype><v:shape id="GII_BOZZA_ATTO_WATERMARK" o:spid="_x0000_s2050" type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:350pt;height:130pt;rotation:326;z-index:-251654144;mso-position-horizontal:center;mso-position-horizontal-relative:page;mso-position-vertical:center;mso-position-vertical-relative:page" o:allowincell="f" fillcolor="#C0C0C0" stroked="f"><v:fill opacity="0.50"/><v:textpath style="font-family:&quot;Calibri&quot;;font-size:1pt;font-weight:normal;letter-spacing:0" string="BOZZA"/><w10:wrap anchorx="page" anchory="page"/></v:shape></w:pict></w:r></w:p>`
  return xml.replace('</w:hdr>', `${watermark}</w:hdr>`)
}
function patchCoreProps (xml: string, generatedBy: string): string {
  const by = clean(generatedBy) || 'Gestionale Infrazioni Irrigue'
  const now = new Date().toISOString()
  return xml
    .replace(/<dc:creator>[\s\S]*?<\/dc:creator>/, `<dc:creator>${escXml(by)}</dc:creator>`)
    .replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/, `<cp:lastModifiedBy>${escXml(by)}</cp:lastModifiedBy>`)
    .replace(/<dcterms:modified[^>]*>[\s\S]*?<\/dcterms:modified>/, `<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>`)
}

export function getAttoContestazioneDocxFileName (data: any): string {
  const n = clean(pickAttrCI(data, ['accertamento_numero'])) || clean(pickAttrCI(data, ['numero_rapporto_tecnico'])) || clean(pickAttrCI(data, ['OBJECTID'])) || 'pratica'
  return `bozza_atto_${safeFilePart(n)}.docx`
}

export async function buildAttoContestazioneDocx (data: any, fields: any[], profile: { username: string, fullName: string }, options?: AttoContestazioneDocxOptions): Promise<Uint8Array> {
  const entries = readZipStored(base64ToBytes(ATTO_CONTESTAZIONE_TEMPLATE_DOCX_B64))
  const tokens = buildTokens(data, fields, profile, options)
  const patched = entries.map(entry => {
    if (entry.name === 'word/document.xml') {
      let xml = readUtf8(entry.data)
      Object.entries(tokens).forEach(([token, value]) => { xml = replaceToken(xml, token, value) })
      return { name: entry.name, data: utf8(xml) }
    }
    if (entry.name === 'docProps/core.xml') return { name: entry.name, data: utf8(patchCoreProps(readUtf8(entry.data), profile.fullName || profile.username)) }
    if (/^word\/footer\d+\.xml$/i.test(entry.name)) return { name: entry.name, data: utf8(buildLastPageFooter(tokens)) }
    if (options?.watermarkBozza !== false && /^word\/header\d+\.xml$/i.test(entry.name)) return { name: entry.name, data: utf8(addBozzaWatermarkToHeader(readUtf8(entry.data))) }
    return entry
  })
  return buildZipStored(patched)
}

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'
import { createPortal } from 'react-dom'

const MAX_TEXT = 8000
const labels = {
  soggetti: 'Soggetti e attribuzioni', date_luoghi: 'Date, orari e luoghi', quantita: 'Quantità e superfici',
  opere_attrezzature: 'Opere, codici e attrezzature', circostanze: 'Azioni, circostanze e negazioni', violazioni: 'Violazioni e riferimenti normativi'
}
const categories = Object.keys(labels) as Array<keyof typeof labels>
type Check = { esito: 'invariato' | 'variato' | 'incerto'; dettaglio: string }
type Review = {
  version: number; originale: string; testo_revisionato: string; request_id: string
  controlli: Record<keyof typeof labels, Check>; ambiguita: string[]
  elementi_protetti_invariati: boolean; accettabile: boolean
}

export function validReview (v: any, original: string): v is Review {
  return v?.version === 1 && v.originale === original && typeof v.request_id === 'string'
    && typeof v.testo_revisionato === 'string' && !!v.testo_revisionato.trim() && v.testo_revisionato.length <= MAX_TEXT
    && typeof v.accettabile === 'boolean' && typeof v.elementi_protetti_invariati === 'boolean'
    && Array.isArray(v.ambiguita) && v.ambiguita.length <= 50 && v.ambiguita.every((s: any) => typeof s === 'string')
    && !!v.controlli && Object.keys(v.controlli).length === Object.keys(labels).length
    && categories.every(k => ['invariato', 'variato', 'incerto'].includes(v.controlli[k]?.esito) && typeof v.controlli[k]?.dettaglio === 'string')
}

// Confronto testuale, non semantico. Memoria limitata anche per testi lunghi.
export function diffWords (a: string, b: string): { original: Array<{ text: string; changed: boolean }>; revised: Array<{ text: string; changed: boolean }> } {
  const x = a.match(/\s+|[^\s]+/g) || []; const y = b.match(/\s+|[^\s]+/g) || []
  if (x.length * y.length > 1000000) return {
    original: [{ text: a, changed: a !== b }], revised: [{ text: b, changed: a !== b }]
  }
  const width = y.length + 1
  const lcs = new Uint16Array((x.length + 1) * width)
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) {
    lcs[i * width + j] = x[i] === y[j] ? 1 + lcs[(i + 1) * width + j + 1] : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1])
  }
  const original: Array<{ text: string; changed: boolean }> = []; const revised: Array<{ text: string; changed: boolean }> = []
  let i = 0; let j = 0
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) {
      original.push({ text: x[i++], changed: false }); revised.push({ text: y[j++], changed: false })
    } else if (i < x.length && (j === y.length || lcs[(i + 1) * width + j] >= lcs[i * width + j + 1])) {
      original.push({ text: x[i++], changed: true })
    } else revised.push({ text: y[j++], changed: true })
  }
  return { original, revised }
}

type Props = {
  enabled: boolean; endpoint: string; value: string; contextKey: string; maxLength: number
  cfg: any; getToken: () => Promise<string>
  captureContext: () => (() => boolean)
  onAccept: (text: string) => void
}

export default function AiReview (p: Props) {
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [review, setReview] = React.useState<Review | null>(null)
  const [showDiff, setShowDiff] = React.useState(true)
  const request = React.useRef<{ controller: AbortController; seq: number } | null>(null)
  const sequence = React.useRef(0)
  const snapshotGuard = React.useRef<(() => boolean) | null>(null)
  const live = React.useRef(p); live.current = p
  const dialogRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const titleId = React.useMemo(() => `gii-ai-title-${Math.random().toString(36).slice(2)}`, [])
  const maxLength = Math.min(MAX_TEXT, p.maxLength > 0 ? p.maxLength : MAX_TEXT)
  const cancel = React.useCallback(() => {
    sequence.current++
    request.current?.controller.abort(); request.current = null
    snapshotGuard.current = null
    setBusy(false); setReview(null)
  }, [])

  React.useLayoutEffect(() => {
    cancel(); setError('')
    return () => { sequence.current++; request.current?.controller.abort() }
  }, [p.value, p.contextKey, p.enabled, p.endpoint, cancel])

  React.useEffect(() => {
    if (!review) return
    const dialog = dialogRef.current
    const first = dialog?.querySelector<HTMLElement>('button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); cancel(); triggerRef.current?.focus(); return }
      if (e.key !== 'Tab') return
      const focusables = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]') || [])
      const index = focusables.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && index <= 0) { e.preventDefault(); focusables[focusables.length - 1]?.focus() }
      else if (!e.shiftKey && (index === focusables.length - 1 || index < 0)) { e.preventDefault(); focusables[0]?.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('keydown', onKey, true); triggerRef.current?.focus() }
  }, [review, cancel])

  const requestReview = async () => {
    if (request.current || !live.current.enabled || !p.value.trim() || p.value.length > maxLength) return
    setError('')
    let endpoint: URL
    try {
      endpoint = new URL(p.endpoint.trim())
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error()
    } catch { setError('Il servizio di revisione deve essere configurato con un indirizzo HTTPS valido.'); return }
    const original = p.value; const contextKey = p.contextKey
    const contextStillCurrent = p.captureContext()
    const controller = new AbortController(); const seq = ++sequence.current
    request.current = { controller, seq }; setBusy(true)
    const stillCurrent = () => seq === sequence.current && live.current.enabled && live.current.value === original
      && live.current.contextKey === contextKey && live.current.endpoint === p.endpoint && contextStillCurrent()
    const timer = window.setTimeout(() => controller.abort(), 125000)
    try {
      const token = await p.getToken()
      if (!stillCurrent() || controller.signal.aborted) return
      if (!token) throw new Error('SESSION')
      const res = await fetch(endpoint.toString(), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ testo: original }), signal: controller.signal,
        credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer'
      })
      if (!res.ok) {
        if (res.status === 401) throw new Error('SESSION')
        if (res.status === 403) throw new Error('FORBIDDEN')
        if (res.status === 429) throw new Error('LIMIT')
        throw new Error('SERVICE')
      }
      const json = await res.json()
      if (!stillCurrent()) return
      if (!validReview(json, original)) throw new Error('RESPONSE')
      snapshotGuard.current = stillCurrent
      setShowDiff(true); setReview(json)
    } catch (e) {
      if (seq !== sequence.current || !stillCurrent()) return
      const code = (e as Error)?.message
      setError(code === 'SESSION' ? 'Sessione ArcGIS non disponibile o scaduta. Accedi nuovamente e riprova.'
        : code === 'FORBIDDEN' ? 'Accesso al servizio non consentito. Verificare la configurazione e l’abilitazione IT.'
          : code === 'LIMIT' ? 'Revisione già in corso o limite del servizio raggiunto. Riprova più tardi.'
            : controller.signal.aborted ? 'Tempo di attesa scaduto. Il testo originale è stato mantenuto.'
              : 'Revisione non disponibile. Il testo originale è stato mantenuto. Riprova più tardi.')
    } finally {
      window.clearTimeout(timer)
      if (request.current?.seq === seq) { request.current = null; setBusy(false) }
    }
  }

  const button: React.CSSProperties = {
    background: '#0d3b66', color: '#ffffff', border: '1px solid #0d3b66',
    borderRadius: p.cfg.btnBorderRadius ?? 8, padding: `${p.cfg.btnPaddingY ?? 8}px ${p.cfg.btnPaddingX ?? 16}px`,
    fontFamily: 'inherit', fontSize: p.cfg.btnFontSize ?? 13, fontWeight: p.cfg.btnFontWeight ?? 600, cursor: 'pointer'
  }
  const canAccept = !!review && review.accettabile && review.elementi_protetti_invariati && review.ambiguita.length === 0
    && categories.every(k => review.controlli[k].esito === 'invariato')
    && review.testo_revisionato.length <= maxLength && p.enabled && review.originale === p.value
  const diff = React.useMemo(() => review ? diffWords(review.originale, review.testo_revisionato) : null, [review])
  if (!p.enabled) return null
  return <div style={{ marginTop: 7 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <button ref={triggerRef} type='button' onClick={requestReview} disabled={busy || !p.value.trim() || p.value.length > maxLength}
        style={{ ...button, opacity: busy || !p.value.trim() || p.value.length > maxLength ? 0.55 : 1 }}>
        {busy ? 'Revisione in corso…' : 'Revisione redazionale'}
      </button>
      {busy && <button type='button' onClick={cancel} style={{ ...button, color: '#0d3b66', background: '#fff' }}>Annulla revisione</button>}
    </div>
    <div role='status' aria-live='polite' style={{ fontSize: '0.95em', marginTop: 5 }}>
      {busy ? 'L’assistente sta revisionando il testo e confrontando i fatti.' : 'L’assistente propone una revisione della forma. Sarai tu a scegliere se utilizzarla.'}
    </div>
    {p.value.length > maxLength && <div role='alert'>Il testo supera il limite di {maxLength} caratteri per la revisione.</div>}
    {error && <div role='alert' style={{ marginTop: 6, color: '#b42318' }}>{error}</div>}
    {review && createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 2147483000, background: 'rgba(15,23,42,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div ref={dialogRef} role='dialog' aria-modal='true' aria-labelledby={titleId}
        style={{ width: 1080, maxWidth: '100%', maxHeight: '92vh', overflow: 'auto', background: p.cfg.formCardBg || '#f8fbff', color: p.cfg.formFieldColor || '#0f172a', fontFamily: 'inherit', fontSize: p.cfg.formFieldFontSize || 13, borderRadius: p.cfg.formCardBorderRadius ?? 8, boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
        <div style={{ background: p.cfg.formCardHeaderBg || '#0d3b66', color: p.cfg.formCardHeaderColor || '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <strong id={titleId}>Revisione redazionale del rapporto</strong>
          <button type='button' aria-label='Chiudi revisione e mantieni originale' onClick={cancel} style={{ ...button, borderColor: 'currentColor', background: 'transparent', color: 'inherit' }}>Chiudi</button>
        </div>
        <div style={{ padding: 16 }}>
          <p style={{ marginTop: 0 }}>Confronta i due testi prima di accettare. I controlli automatici possono non rilevare tutte le variazioni di significato.</p>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}><input type='checkbox' checked={showDiff} onChange={e => setShowDiff(e.target.checked)}/>Evidenzia le differenze testuali</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 14 }}>
            {(['original', 'revised'] as const).map(side => <section key={side} style={{ minWidth: 0 }}>
              <strong>{side === 'original' ? 'Testo originale' : 'Proposta revisionata'}</strong>
              <div tabIndex={0} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6, padding: 12, marginTop: 6, minHeight: 150, maxHeight: '38vh', overflow: 'auto', border: `1px solid ${p.cfg.formFieldBorderColor || '#bfcede'}`, borderRadius: p.cfg.formFieldBorderRadius ?? 7, background: p.cfg.formFieldBg || '#fff' }}>
                {diff?.[side].map((part, i) => <span key={i} style={showDiff && part.changed ? { background: side === 'original' ? '#fee2e2' : '#dcfce7', color: '#0f172a', textDecoration: side === 'original' ? 'line-through' : undefined } : undefined}>{part.text}</span>)}
              </div>
            </section>)}
          </div>
          <p><strong>Confronto automatico dei contenuti</strong></p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Numeri, codici e unità: {review.elementi_protetti_invariati ? 'nessuna differenza letterale rilevata' : 'differenze rilevate — accettazione bloccata'}.</li>
            {categories.map(k => <li key={k} style={{ marginTop: 4 }}>
              <strong>{labels[k]}:</strong> {review.controlli[k].esito === 'invariato' ? 'nessuna variazione rilevata' : review.controlli[k].esito === 'variato' ? 'possibile variazione' : 'da chiarire'}.
              {' '}{review.controlli[k].dettaglio}
            </li>)}
          </ul>
          {review.ambiguita.length > 0 && <div style={{ color: '#b42318' }}><strong>Passaggi da chiarire nel testo originale</strong><ul>{review.ambiguita.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
          {!canAccept && <p role='alert' style={{ color: '#b42318' }}>La proposta non può essere applicata: sono presenti differenze, dubbi o un limite di lunghezza. Verifica il testo originale e richiedi una nuova revisione.</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <button type='button' onClick={cancel} style={{ ...button, background: '#fff', color: '#0d3b66' }}>Mantieni originale</button>
            <button type='button' disabled={!canAccept || review.testo_revisionato === review.originale} style={{ ...button, opacity: canAccept && review.testo_revisionato !== review.originale ? 1 : 0.55 }} onClick={() => {
              if (!canAccept || !snapshotGuard.current?.() || !live.current.enabled || live.current.value !== review.originale) {
                cancel(); setError('Il testo o la pratica sono cambiati. Richiedi una nuova revisione.'); return
              }
              p.onAccept(review.testo_revisionato); cancel()
            }}>Usa testo revisionato</button>
          </div>
          {review.testo_revisionato === review.originale && <p role='status'>L’assistente non ha proposto modifiche al testo.</p>}
          <p style={{ marginBottom: 0 }}>Il testo accettato entra nella bozza. Usa <strong>Salva</strong> nel rapporto per registrarlo.</p>
        </div>
      </div>
    </div>, document.body)}
  </div>
}

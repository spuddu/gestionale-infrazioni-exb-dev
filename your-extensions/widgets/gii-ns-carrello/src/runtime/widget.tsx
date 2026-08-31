/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps, getAppStore, UrlManager } from 'jimu-core'
import { createPortal } from 'react-dom'
import type { IMConfig } from '../config'

const { Fragment } = React


type RecordActionButtonProps = {
  onClick: (event: any) => void
  disabled?: boolean
  title?: string
  ariaLabel?: string
  marginRight?: number
}

function recordActionStyle (color: string, disabled: boolean, marginRight = 0): React.CSSProperties {
  return {
    border: 'none',
    background: 'transparent',
    color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: 28,
    height: 28,
    padding: 0,
    boxSizing: 'border-box',
    marginRight,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    opacity: disabled ? 0.45 : 1
  }
}

function RecordEditButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Modifica'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#1F4E79', disabled, props.marginRight ?? 4)}>
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
      </svg>
    </button>
  )
}

function RecordDeleteButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Elimina'
  const ariaLabel = props.ariaLabel || title
  return (
    <button type='button' disabled={disabled} onClick={props.onClick} title={title} aria-label={ariaLabel} style={recordActionStyle('#b42318', disabled, props.marginRight ?? 0)}>
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M3 6h18'/>
        <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
        <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
        <path d='M10 11v6'/>
        <path d='M14 11v6'/>
      </svg>
    </button>
  )
}


function AggiungiIcon () {
  return (
    <svg width={34} height={34} viewBox='2 2 20 20' aria-hidden='true' focusable='false'>
      <path d='M21 13.1V19c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-4' fill='none' stroke='#fff' strokeWidth='1.1' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M3 15V5c0-1.1.9-2 2-2h5.9' fill='none' stroke='#fff' strokeWidth='1.1' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M16.5 3v9' fill='none' stroke='#fff' strokeWidth='1.1' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M12 7.5h9' fill='none' stroke='#fff' strokeWidth='1.1' strokeLinecap='round' strokeLinejoin='round'/>
    </svg>
  )
}

function SvuotaElencoIcon () {
  return (
    <svg width={34} height={34} viewBox='2 2 20 20' aria-hidden='true' focusable='false'>
      <path d='M3 8.7v-4c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v5' fill='none' stroke='#0d3b66' strokeWidth='1.1' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M10.9 20.7H5c-1.1 0-2-.9-2-2v-10' fill='none' stroke='#0d3b66' strokeWidth='1.1' strokeLinecap='round' strokeLinejoin='round'/>
      <circle cx='6.8' cy='6.9' r='0.76' fill='#0d3b66'/>
      <circle cx='6.8' cy='11.7' r='0.76' fill='#0d3b66'/>
      <circle cx='6.8' cy='16.5' r='0.76' fill='#0d3b66'/>
      <line x1='10' y1='6.9' x2='16.8' y2='6.9' stroke='#0d3b66' strokeWidth='0.93' strokeLinecap='round'/>
      <line x1='10' y1='11.7' x2='12.6' y2='11.7' stroke='#0d3b66' strokeWidth='0.93' strokeLinecap='round'/>
      <line x1='10' y1='16.5' x2='10.6' y2='16.5' stroke='#0d3b66' strokeWidth='0.93' strokeLinecap='round'/>
      <path d='M12.9 13.8h8.1' fill='none' stroke='#b42318' strokeWidth='0.82' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M15.1 13.8v-.9c0-.5.4-.9.9-.9h1.8c.5 0 .9.4.9.9v.9' fill='none' stroke='#b42318' strokeWidth='0.82' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M20.1 13.8l-.5 6.3c0 .5-.4.9-.9.9h-3.6c-.5 0-.9-.4-.9-.9l-.5-6.3' fill='none' stroke='#b42318' strokeWidth='0.82' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M16 16.1v2.7' fill='none' stroke='#b42318' strokeWidth='0.82' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M17.8 16.1v2.7' fill='none' stroke='#b42318' strokeWidth='0.82' strokeLinecap='round' strokeLinejoin='round'/>
    </svg>
  )
}

const cartIconButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  minWidth: 34,
  minHeight: 34,
  padding: 0,
  border: 'none',
  background: 'transparent',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  cursor: 'pointer'
}

const GII_NS_CART_KEY = 'GII_NS_CART'
const GII_NS_RETURN_KEY = 'GII_NS_RETURN_PAGE'

type CartItem = {
  codice_prezzario: string
  codice_voce: string
  famiglia: string
  descrizione: string
  unita_misura: string
  prezzo_unitario: number
  anno_riferimento: number
}

function cartItemKey (item: CartItem): string {
  return `${item.codice_prezzario}::${item.codice_voce}`
}

function num (v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function money (n: any, d = 2): string { return num(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }) }

const FAMIGLIA_SHORT: Record<string, string> = {
  AT: 'Attrezz./Trasp.',
  PR: 'Mat. costruz.',
  RU: 'Risorse umane',
  SL: 'Semilavorati',
  PF: 'Prod. finiti'
}

const ORIGINE_SHORT: Record<string, string> = {
  REGIONALE: 'REG',
  INTERNO: 'INT',
  NUOVI_PREZZI: 'NP'
}

function resolvePageId (slug: string): string {
  if (!slug) return ''
  try {
    const appState = getAppStore()?.getState()
    const pages = appState?.appConfig?.pages
    if (!pages) return ''
    const norm = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, '')
    const target = norm(slug)
    let found = ''
    Object.keys(pages).forEach((pid) => {
      const label = pages[pid]?.label || ''
      if (norm(label) === target || norm(pid) === target) found = pid
    })
    return found
  } catch { return '' }
}

const BAR_STYLE = `
.gnc-bar { display:flex; flex-direction:column; font-size:13px; }
.gnc-header { display:flex; align-items:center; justify-content:flex-end; gap:10px; padding:10px 14px; flex-wrap:wrap; }
.gnc-badge { display:inline-flex; align-items:center; gap:5px; padding:7px 18px; border:2px solid #4aa3ff; border-radius:999px; font-size:13px; font-weight:700; background:transparent; color:#fff; box-sizing:border-box; }
.gnc-btn { padding:7px 18px; border:2px solid transparent; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; box-sizing:border-box; }
.gnc-btn:disabled { opacity:0.5; cursor:not-allowed; }
.gnc-btn-add { background: #2464b8; color:#fff; border-color:#2464b8; }
.gnc-btn-add:hover:not(:disabled) { background:#295f92; border-color:#295f92; }
.gnc-btn-clear { background: #b45309; color:#fff; border-color:#b45309; }
.gnc-btn-clear:hover:not(:disabled) { background:#92400e; border-color:#92400e; }
.gnc-btn-clear:disabled { background:#aa8263; border-color:#aa8263; }
.gnc-btn-confirm { background:#328c54; color:#fff; border-color:#328c54; }
.gnc-btn-confirm:hover:not(:disabled) { background: #28753f; border-color:#28753f; }
.gnc-btn-cancel { background:#d92d20; color:#fff; border-color:#d92d20; }
.gnc-btn-cancel:hover:not(:disabled) { background:#b42318; border-color:#b42318; }
.gnc-btn-remove { background:#c00; color:#fff; padding:2px 7px; border:none; border-radius:3px; font-size:13px; font-weight:700; cursor:pointer; }
.gnc-dd-table { width:100%; border-collapse:collapse; font-size:14px; table-layout:fixed; }
.gnc-dd-table th { background:#eaf2ff; color:#1F4E79; padding:4px 8px; text-align:left; position:sticky; top:0; z-index:1; font-weight:700; white-space:nowrap; font-size:14px; }
.gnc-dd-table td { padding:4px 8px; border-bottom:1px solid #e6eef7; vertical-align:middle; }
.gnc-dd-table tbody tr:nth-child(odd) td { background:#f9fbff; }
.gnc-msg { padding:5px 12px; border-radius:4px; font-size:12px; font-weight:700; }
.gnc-msg-ok { border:1px solid #b8d4b0; background:#e2efda; color:#375623; }
.gnc-msg-err { border:1px solid #f5b8b8; background:#fce4e4; color:#c00; }
.gnc-muted { color:#6b7280; }
`

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const cfg: any = props.config || {}
  const returnPageSlug = String(cfg.returnPageSlug || 'modifica-rapporto').trim()
  const barBg = String(cfg.barBg || '#ffffff')
  const barBorderColor = String(cfg.barBorderColor || '#c5d9f1')

  const [cart, setCart] = React.useState<CartItem[]>([])
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [confirmClear, setConfirmClear] = React.useState(false)
  const [listOpen, setListOpen] = React.useState(false)

  const barRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [dropdownTop, setDropdownTop] = React.useState(0)

  React.useEffect(() => {
    if (!msg) return
    const t = window.setTimeout(() => setMsg(null), 4000)
    return () => window.clearTimeout(t)
  }, [msg])

  const cartKeys = React.useMemo(() => new Set(cart.map(cartItemKey)), [cart])
  const cartCodes = React.useMemo(() => new Set(cart.map((c) => c.codice_voce)), [cart])

  React.useEffect(() => {
    ;(window as any).__giiNsCartCodes = cartCodes
    try { window.dispatchEvent(new CustomEvent('gii-ns-cart-change')) } catch {}
    return () => { ;(window as any).__giiNsCartCodes = null }
  }, [cartCodes])

  React.useEffect(() => {
    if (cart.length === 0) return
    const bar = barRef.current
    if (!bar) return
    setDropdownTop(bar.getBoundingClientRect().bottom)
  }, [listOpen, cart.length])

  React.useEffect(() => {
    if (!listOpen) return
    const onClick = (e: MouseEvent) => {
      const dd = dropdownRef.current
      const br = barRef.current
      if (dd && dd.contains(e.target as Node)) return
      if (br && br.contains(e.target as Node)) return
      setListOpen(false)
    }
    window.addEventListener('mousedown', onClick, true)
    return () => window.removeEventListener('mousedown', onClick, true)
  }, [listOpen])

  const onAdd = React.useCallback(() => {
    const sel = (window as any).__giiPrezzarioSelectedRow
    if (!sel || !sel.codice_voce) {
      setMsg({ ok: false, text: 'Nessuna voce selezionata nel prezzario.' })
      return
    }
    if (!sel.famiglia) {
      setMsg({ ok: false, text: 'La voce selezionata non ha una famiglia assegnata.' })
      return
    }
    const item: CartItem = {
      codice_prezzario: String(sel.codice_prezzario || ''),
      codice_voce: String(sel.codice_voce || ''),
      famiglia: String(sel.famiglia || '').toUpperCase(),
      descrizione: String(sel.descrizione || ''),
      unita_misura: String(sel.unita_misura || ''),
      prezzo_unitario: num(sel.prezzo_unitario),
      anno_riferimento: num(sel.anno_riferimento)
    }
    const key = cartItemKey(item)
    if (cartKeys.has(key)) {
      setMsg({ ok: false, text: `La voce ${item.codice_voce} è già nel carrello.` })
      return
    }
    setCart((prev) => [...prev, item])
    setMsg({ ok: true, text: `Aggiunta: ${item.codice_voce}` })
  }, [cartKeys])

  const onRemoveByKey = React.useCallback((key: string) => {
    setCart((prev) => prev.filter((item) => cartItemKey(item) !== key))
  }, [])

  const onClearAll = React.useCallback(() => {
    if (cart.length === 0) return
    setConfirmClear(true)
  }, [cart.length])

  const clearCartState = React.useCallback(() => {
    setCart([])
    setConfirmClear(false)
    setListOpen(false)
    try {
      ;(window as any).__giiNsCartCodes = new Set<string>()
      window.dispatchEvent(new CustomEvent('gii-ns-cart-change'))
    } catch {}
  }, [])

  const doClearAll = React.useCallback(() => {
    clearCartState()
    setMsg({ ok: true, text: 'Elenco svuotato.' })
  }, [clearCartState])

  const doNavigateBack = React.useCallback((): boolean => {
    setListOpen(false)
    let targetPageId = ''
    try { targetPageId = sessionStorage.getItem(GII_NS_RETURN_KEY) || '' } catch {}
    if (!targetPageId) targetPageId = resolvePageId(returnPageSlug)
    if (!targetPageId) {
      setMsg({ ok: false, text: `Pagina di ritorno non trovata. Configura lo slug "${returnPageSlug}" nel pannello setting.` })
      return false
    }
    try { sessionStorage.removeItem(GII_NS_RETURN_KEY) } catch {}
    try {
      UrlManager.getInstance().changePage(targetPageId)
      return true
    } catch (e: any) {
      setMsg({ ok: false, text: `Navigazione fallita: ${e?.message || String(e)}` })
      return false
    }
  }, [returnPageSlug])

  const onConfirm = React.useCallback(() => {
    if (cart.length === 0) return
    try { sessionStorage.setItem(GII_NS_CART_KEY, JSON.stringify(cart)) } catch {}
    if (doNavigateBack()) clearCartState()
  }, [cart, doNavigateBack, clearCartState])

  const onCancel = React.useCallback(() => {
    try { sessionStorage.removeItem(GII_NS_CART_KEY) } catch {}
    if (doNavigateBack()) clearCartState()
  }, [doNavigateBack, clearCartState])

  const dropdownPortal = cart.length > 0 && dropdownTop > 0 ? createPortal(
    <div
      ref={dropdownRef}
      aria-hidden={!listOpen}
      style={{
        position: 'fixed',
        top: dropdownTop,
        left: 10,
        right: 10,
        zIndex: 99999,
        background: '#fff',
        borderTop: `2px solid ${barBorderColor}`,
        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        maxHeight: 780,
        overflow: 'auto',
        borderRadius: '0 0 6px 6px',
        padding: '0 8px 0 0',
        clipPath: listOpen ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
        transition: 'clip-path 0.2s ease',
        pointerEvents: listOpen ? 'auto' : 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 14px 6px 8px', background: '#fff' }}>
        <div style={{ width: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button type='button' onClick={onClearAll} title='Svuota elenco' aria-label='Svuota elenco' style={{ ...cartIconButtonStyle, marginRight: 5.4 }}><SvuotaElencoIcon /></button>
        </div>
      </div>
      <table className='gnc-dd-table'>
        <colgroup>
          <col style={{ width: 70 }} />
          <col style={{ width: 200 }} />
          <col />
          <col style={{ width: 100 }} />
          <col style={{ width: 50 }} />
          <col style={{ width: 80 }} />
          <col style={{ width: 44 }} />
        </colgroup>
        <thead>
          <tr>
            <th>Orig.</th>
            <th>Codice</th>
            <th>Descrizione</th>
            <th>Famiglia</th>
            <th>UM</th>
            <th style={{ textAlign: 'right' }}>Prezzo</th>
            <th style={{ padding: '0 14px 0 0' }}></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item) => {
            const key = cartItemKey(item)
            return (
              <tr key={key}>
                <td><span className='gnc-muted' style={{ fontSize: 13 }}>{ORIGINE_SHORT[item.codice_prezzario] || item.codice_prezzario}{item.anno_riferimento ? ` ${item.anno_riferimento}` : ''}</span></td>
                <td style={{ fontWeight: 700, fontSize: 14 }}>{item.codice_voce}</td>
                <td title={item.descrizione} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descrizione}</td>
                <td><span style={{ fontSize: 13 }}>{FAMIGLIA_SHORT[item.famiglia] || item.famiglia}</span></td>
                <td>{item.unita_misura || '—'}</td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{money(item.prezzo_unitario, 4)}</td>
                <td style={{ padding: '0 14px 0 0', textAlign: 'right' }}><RecordDeleteButton onClick={() => onRemoveByKey(key)} title='Rimuovi voce' ariaLabel='Rimuovi voce' /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>,
    document.body
  ) : null

  const confirmPortal = confirmClear ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div role='dialog' aria-modal='true' data-gii-global-popup-dialog='1' style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Svuotare l'elenco?</div>
        <div style={{ fontSize: 15, color: '#4b5563', marginBottom: 20 }}>Verranno rimosse {cart.length} {cart.length === 1 ? 'voce' : 'voci'}.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type='button' onClick={doClearAll} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#d13438', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Sì, svuota</button>
          <button type='button' onClick={() => setConfirmClear(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#111827', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Annulla</button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <Fragment>
      <style>{BAR_STYLE}</style>
      <div ref={barRef} className='gnc-bar' style={{ background: barBg, border: `1px solid ${barBorderColor}`, borderRadius: 6, margin: 10 }}>
        <div className='gnc-header'>
          {msg && <span className={`gnc-msg ${msg.ok ? 'gnc-msg-ok' : 'gnc-msg-err'}`} style={{ marginRight: 'auto' }}>{msg.text}</span>}
          <button type='button' onClick={onAdd} title='Aggiungi' aria-label='Aggiungi' style={cartIconButtonStyle}><AggiungiIcon /></button>
          <span className='gnc-badge' onClick={() => { if (cart.length > 0) setListOpen((p) => !p) }} style={{ cursor: cart.length > 0 ? 'pointer' : 'default' }} title={cart.length > 0 ? (listOpen ? 'Chiudi elenco' : 'Mostra voci aggiunte') : ''}>Voci aggiunte: {cart.length} {cart.length > 0 ? (listOpen ? '▲' : '▼') : ''}</span>
          <button className='gnc-btn gnc-btn-confirm' onClick={onConfirm} disabled={cart.length === 0}>Conferma ({cart.length})</button>
          <button className='gnc-btn gnc-btn-cancel' onClick={onCancel}>Annulla</button>
        </div>
      </div>
      {dropdownPortal}
      {confirmPortal}
    </Fragment>
  )
}

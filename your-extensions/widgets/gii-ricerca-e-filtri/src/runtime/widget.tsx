/** @jsx jsx */
import { React, jsx, css, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetProps<IMConfig>

type MetaOption = { value: string, label: string }

type MetaState = {
  ready: boolean
  viewName: string | null
  totaleCaricati: number
  totaleVisibili: number
  uffici: MetaOption[]
  statiSintetici: MetaOption[]
}

type FormState = {
  testo: string
  statoSintetico: string
  ufficio: string
  periodoPreset: 'tutti' | 'oggi' | 'ultimi7' | 'ultimi30' | 'meseCorrente'
  sortKey: 'objectid_DESC' | 'objectid_ASC' | 'data_rilevazione_DESC' | 'data_rilevazione_ASC'
}

const DEFAULT_META: MetaState = {
  ready: false,
  viewName: null,
  totaleCaricati: 0,
  totaleVisibili: 0,
  uffici: [],
  statiSintetici: []
}

const DEFAULT_FORM: FormState = {
  testo: '',
  statoSintetico: '',
  ufficio: '',
  periodoPreset: 'tutti',
  sortKey: 'objectid_DESC'
}

function asJs<T = any>(v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
}

function txt(v: any): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function buildDetail(form: FormState) {
  const [ordinaPer, ordinaDir] = form.sortKey.startsWith('data_rilevazione')
    ? ['data_rilevazione', form.sortKey.endsWith('_ASC') ? 'ASC' : 'DESC']
    : ['objectid', form.sortKey.endsWith('_ASC') ? 'ASC' : 'DESC']

  return {
    source: 'gii-ricerca-e-filtri',
    ts: Date.now(),
    testo: txt(form.testo).trim(),
    statoSintetico: txt(form.statoSintetico).trim() || null,
    ufficio: txt(form.ufficio).trim() || null,
    periodoPreset: form.periodoPreset,
    ordinaPer,
    ordinaDir
  }
}

export default function Widget(props: Props) {
  const cfg = { ...defaultConfig, ...(asJs<any>(props.config) || {}) }
  const [meta, setMeta] = React.useState<MetaState>(DEFAULT_META)
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM)
  const debounceMs = Math.max(0, Number(cfg.debounceMs || 250))

  const emitCurrent = React.useCallback((next: FormState) => {
    window.dispatchEvent(new CustomEvent('gii:ricerca-e-filtri-change', { detail: buildDetail(next) }))
  }, [])

  React.useEffect(() => {
    const onMeta = (evt: any) => {
      const d = evt?.detail || {}
      setMeta({
        ready: !!d.ready,
        viewName: d.viewName || null,
        totaleCaricati: Number(d.totaleCaricati || 0),
        totaleVisibili: Number(d.totaleVisibili || 0),
        uffici: Array.isArray(d.uffici) ? d.uffici : [],
        statiSintetici: Array.isArray(d.statiSintetici) ? d.statiSintetici : []
      })
    }

    window.addEventListener('gii:ricerca-e-filtri-meta', onMeta as any)
    return () => window.removeEventListener('gii:ricerca-e-filtri-meta', onMeta as any)
  }, [])

  React.useEffect(() => {
    const onUserLoaded = () => {
      setForm(DEFAULT_FORM)
      emitCurrent(DEFAULT_FORM)
    }
    window.addEventListener('gii:userLoaded', onUserLoaded as any)
    return () => window.removeEventListener('gii:userLoaded', onUserLoaded as any)
  }, [emitCurrent])

  React.useEffect(() => {
    emitCurrent(DEFAULT_FORM)
  }, [emitCurrent])

  React.useEffect(() => {
    const t = window.setTimeout(() => emitCurrent(form), debounceMs)
    return () => window.clearTimeout(t)
  }, [form, debounceMs, emitCurrent])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const styles = css`
    width: 100%;
    box-sizing: border-box;

    .wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      min-height: 100%;
      padding: 10px 12px;
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 10px;
      background: #ffffff;
      box-sizing: border-box;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .grow {
      flex: 1 1 260px;
      min-width: 220px;
    }

    .ctrl {
      height: 38px;
      min-width: 140px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid rgba(0,0,0,0.14);
      background: #fff;
      color: #111827;
      font-size: 13px;
      box-sizing: border-box;
      outline: none;
    }

    .ctrl:focus {
      border-color: #2f6fed;
      box-shadow: 0 0 0 2px rgba(47,111,237,0.12);
    }

    .ctrl:disabled {
      background: #f8fafc;
      color: #9ca3af;
      cursor: not-allowed;
    }

    .resetBtn {
      height: 38px;
      padding: 0 14px;
      border-radius: 10px;
      border: 1px solid #2f6fed;
      background: #2f6fed;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .resetBtn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      color: #6b7280;
      font-size: 11px;
      line-height: 1.4;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(47,111,237,0.08);
      color: #1d4ed8;
      font-weight: 600;
    }
  `

  const isDirty = JSON.stringify(form) !== JSON.stringify(DEFAULT_FORM)
  const disableDependent = !meta.ready

  return (
    <div css={styles}>
      <div className='wrap'>
        <div className='toolbar'>
          <input
            className='ctrl grow'
            type='text'
            value={form.testo}
            placeholder={txt(cfg.placeholderRicerca || defaultConfig.placeholderRicerca)}
            onChange={(e) => setField('testo', e.currentTarget.value)}
          />

          {cfg.mostraStato !== false && (
            <select
              className='ctrl'
              value={form.statoSintetico}
              onChange={(e) => setField('statoSintetico', e.currentTarget.value)}
              disabled={disableDependent || meta.statiSintetici.length === 0}
            >
              <option value=''>Stato: tutti</option>
              {meta.statiSintetici.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          )}

          {cfg.mostraUfficio !== false && (
            <select
              className='ctrl'
              value={form.ufficio}
              onChange={(e) => setField('ufficio', e.currentTarget.value)}
              disabled={disableDependent || meta.uffici.length === 0}
            >
              <option value=''>Ufficio: tutti</option>
              {meta.uffici.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          )}

          {cfg.mostraPeriodo !== false && (
            <select
              className='ctrl'
              value={form.periodoPreset}
              onChange={(e) => setField('periodoPreset', e.currentTarget.value as FormState['periodoPreset'])}
            >
              <option value='tutti'>Periodo: tutti</option>
              <option value='oggi'>Periodo: oggi</option>
              <option value='ultimi7'>Periodo: ultimi 7 giorni</option>
              <option value='ultimi30'>Periodo: ultimi 30 giorni</option>
              <option value='meseCorrente'>Periodo: questo mese</option>
            </select>
          )}

          {cfg.mostraOrdinamento !== false && (
            <select
              className='ctrl'
              value={form.sortKey}
              onChange={(e) => setField('sortKey', e.currentTarget.value as FormState['sortKey'])}
            >
              <option value='objectid_DESC'>Ordina: n. rapporto ↓</option>
              <option value='objectid_ASC'>Ordina: n. rapporto ↑</option>
              <option value='data_rilevazione_DESC'>Ordina: data rilev. ↓</option>
              <option value='data_rilevazione_ASC'>Ordina: data rilev. ↑</option>
            </select>
          )}

          <button
            type='button'
            className='resetBtn'
            disabled={!isDirty}
            onClick={() => setForm(DEFAULT_FORM)}
          >
            Reimposta
          </button>
        </div>

        <div className='meta'>
          <span className='pill'>{meta.ready ? 'Filtri attivi' : 'In attesa elenco…'}</span>
          {meta.viewName && <span>Vista: {meta.viewName}</span>}
          <span>Pratiche visibili: {meta.totaleVisibili}</span>
          {meta.totaleCaricati !== meta.totaleVisibili && <span>Set base: {meta.totaleCaricati}</span>}
        </div>
      </div>
    </div>
  )
}

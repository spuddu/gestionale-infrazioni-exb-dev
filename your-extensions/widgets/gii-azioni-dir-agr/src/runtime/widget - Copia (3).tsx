/** @jsx jsx */
import { React, jsx, type AllWidgetProps, DataSourceComponent } from 'jimu-core'
import { Button, TextArea } from 'jimu-ui'
import type { IMConfig } from '../config'

type MsgKind = 'info' | 'ok' | 'err'
type Msg = { kind: MsgKind; text: string }

type SelState = {
  ds: any
  oid: number | null
  idFieldName: string
  data: any | null
  sig: string
}

function unwrapJsapiLayer (maybe: any) {
  return (maybe && (maybe.layer || maybe)) || null
}

function pickOidFromData (data: any, idFieldName: string) {
  if (!data) return null
  if (idFieldName && data[idFieldName] != null) return data[idFieldName]
  return data.OBJECTID ?? data.ObjectId ?? data.objectid ?? data.objectId ?? null
}

function filterAttrsToLayerFields (attrs: Record<string, any>, layer: any) {
  const fields = (layer?.fields || []) as Array<{ name: string }>
  if (!fields.length) return attrs
  const allow = new Set(fields.map(f => String(f.name)))
  const out: Record<string, any> = {}
  for (const k of Object.keys(attrs)) {
    if (allow.has(k)) out[k] = attrs[k]
  }
  return out
}

async function refreshRootAndDerived (ds: any) {
  if (!ds) return
  let root = ds
  try { while (root && root.belongToDataSource) root = root.belongToDataSource } catch {}

  const list: any[] = []
  if (root) list.push(root)

  try {
    const derived = root?.getAllDerivedDataSources ? root.getAllDerivedDataSources() : []
    if (derived && derived.length) list.push(...derived)
  } catch {}

  for (const d of list) {
    try {
      const q = d.getCurrentQueryParams ? d.getCurrentQueryParams() : null
      if (d.clearSourceRecords) d.clearSourceRecords()
      if (d.addVersion) d.addVersion()
      if (d.load) {
        if (q) await d.load(q)
        else await d.load()
      }
    } catch {}
  }
}

async function tryClearSelection (ds: any) {
  if (!ds) return
  try {
    if (typeof ds.selectRecordsByIds === 'function') {
      // many DS implement this signature
      await ds.selectRecordsByIds([])
      return
    }
  } catch {}
  try {
    if (typeof ds.clearSelection === 'function') {
      ds.clearSelection()
      return
    }
  } catch {}
  try {
    if (typeof ds.setSelectedRecords === 'function') {
      ds.setSelectedRecords([])
    }
  } catch {}
}

function msgStyle (kind: MsgKind): React.CSSProperties {
  if (kind === 'ok') return { fontSize: 13, color: '#1a7f37', whiteSpace: 'nowrap' }
  if (kind === 'err') return { fontSize: 13, color: '#b42318', whiteSpace: 'nowrap' }
  return { fontSize: 13, color: '#4b5563', whiteSpace: 'nowrap' }
}

function getUdsKey (uds: any, idx: number) {
  return String(
    uds?.dataSourceId ??
    uds?.mainDataSourceId ??
    uds?.rootDataSourceId ??
    uds?.outputDataSourceId ??
    `ds_${idx}`
  )
}

function DataSourceSelectionBridge (props: {
  widgetId: string
  uds: any
  dsKey: string
  watchFields: string[]
  onUpdate: (dsKey: string, state: SelState) => void
}) {
  const { widgetId, uds, dsKey, watchFields, onUpdate } = props

  return (
    <DataSourceComponent useDataSource={uds} widgetId={widgetId}>
      {(ds: any) => (
        <SelectionWatcher
          ds={ds}
          dsKey={dsKey}
          watchFields={watchFields}
          onUpdate={onUpdate}
        />
      )}
    </DataSourceComponent>
  )
}

function SelectionWatcher (props: {
  ds: any
  dsKey: string
  watchFields: string[]
  onUpdate: (dsKey: string, state: SelState) => void
}) {
  const { ds, dsKey, watchFields, onUpdate } = props

  React.useEffect(() => {
    try { ds?.setListenSelection?.(true) } catch {}
  }, [ds])

  const selected = ds?.getSelectedRecords?.() || []
  const r0 = selected.length ? selected[0] : null
  const data = r0?.getData ? r0.getData() : null

  const idFieldName = ds?.getIdField ? ds.getIdField() : 'OBJECTID'
  const oidRaw = pickOidFromData(data, idFieldName)
  const oid = oidRaw != null ? Number(oidRaw) : null

  const sigParts: string[] = []
  sigParts.push(String(oid ?? ''))
  for (const f of watchFields) {
    sigParts.push(String(data?.[f] ?? ''))
  }
  const sig = sigParts.join('|')

  React.useEffect(() => {
    onUpdate(dsKey, {
      ds,
      oid: (oid != null && Number.isFinite(oid)) ? oid : null,
      idFieldName,
      data: (oid != null && Number.isFinite(oid)) ? data : null,
      sig
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsKey, ds, idFieldName, sig])

  return null
}

function DetailRow (props: { label: string; value: any }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <div style={{ width: 180, fontSize: 12, color: '#6b7280' }}>{props.label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-word' }}>
        {props.value != null && props.value !== '' ? String(props.value) : '—'}
      </div>
    </div>
  )
}

// domini
const PRESA_DA_PRENDERE = 1
const PRESA_IN_CARICO = 2

const STATO_DA_PRENDERE = 1
const STATO_PRESA_IN_CARICO = 2
const STATO_INTEGRAZIONE = 3
const STATO_APPROVATA = 4
const STATO_RESPINTA = 5

const ESITO_INTEGRAZIONE = 1
const ESITO_APPROVATA = 2
const ESITO_RESPINTA = 3

function mapEsitoToStato (esito: number): number | null {
  if (esito === ESITO_INTEGRAZIONE) return STATO_INTEGRAZIONE
  if (esito === ESITO_APPROVATA) return STATO_APPROVATA
  if (esito === ESITO_RESPINTA) return STATO_RESPINTA
  return null
}

type Pending = null | 'INTEGRAZIONE'

function ActionsPanel (props: {
  active: { key: string; state: SelState } | null
  roleCode: string
  buttonText: string
}) {
  const { active, roleCode, buttonText } = props
  const role = String(roleCode || 'DT').trim().toUpperCase()

  const presaField = `presa_in_carico_${role}`
  const dtPresaField = `dt_presa_in_carico_${role}`

  const statoField = `stato_${role}`
  const dtStatoField = `dt_stato_${role}`

  const esitoField = `esito_${role}`
  const dtEsitoField = `dt_esito_${role}`

  const noteField = `note_${role}`

  const statoDAField = 'stato_DA'
  const dtStatoDAField = 'dt_stato_DA'
  const presaDAField = 'presa_in_carico_DA'

  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg] = React.useState<Msg | null>({ kind: 'info', text: 'Selezionare una riga.' })

  // 🔒 lock: blocca la pagina finché non fai un’azione o Annulla
  const [isLocked, setIsLocked] = React.useState(false)

  // ⚙️ “integrazione” è l’unico caso in cui abilitiamo le note prima di salvare
  const [pending, setPending] = React.useState<Pending>(null)

  // NOTE auto-resize (con scrollbar oltre max)
  const [noteDraft, setNoteDraft] = React.useState('')
  const noteRef = React.useRef<any>(null)
  const NOTE_MIN_H = 110
  const NOTE_MAX_H = 240
  const autoResizeNote = React.useCallback((el: any) => {
    if (!el) return
    try {
      el.style.height = 'auto'
      const next = Math.min(el.scrollHeight || NOTE_MIN_H, NOTE_MAX_H)
      el.style.height = `${next}px`
      el.style.overflowY = (el.scrollHeight > NOTE_MAX_H) ? 'auto' : 'hidden'
    } catch {}
  }, [])

  const selectionKey = active?.state?.oid != null ? `${active.key}:${active.state.oid}` : null
  const selectionKeyRef = React.useRef<string | null>(selectionKey)
  React.useEffect(() => { selectionKeyRef.current = selectionKey }, [selectionKey])

  const ds = active?.state?.ds
  const data = active?.state?.data || null
  const oid = active?.state?.oid ?? null
  const hasSel = oid != null && Number.isFinite(oid)

  const presaVal = data ? data[presaField] : null
  const statoVal = data ? data[statoField] : null
  const esitoVal = data ? data[esitoField] : null
  const noteVal = data ? data[noteField] : null
  const statoDAVal = data ? data[statoDAField] : null

  const presaNum = (presaVal != null && String(presaVal) !== '') ? Number(presaVal) : null
  const statoNum = (statoVal != null && String(statoVal) !== '') ? Number(statoVal) : null
  const statoDANum = (statoDAVal != null && String(statoDAVal) !== '') ? Number(statoDAVal) : null

  // blocca DT se già trasmesso a DA (DA ha uno stato valorizzato)
  const lockedByTransmit = (role === 'DT') && (statoDANum != null && statoDANum >= 1)

  // quando cambio selezione: entro in “modalità operativa” (lock), resetto pending e ricarico note
  React.useEffect(() => {
    if (!selectionKey) {
      setMsg({ kind: 'info', text: 'Selezionare una riga.' })
      setIsLocked(false)
      setPending(null)
      setNoteDraft('')
      return
    }

    setMsg(null)
    setLoading(false)
    setPending(null)

    const v = (data && data[noteField] != null) ? String(data[noteField]) : ''
    setNoteDraft(v)

    // ✅ lock appena seleziono un record
    setIsLocked(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey])

  // auto-resize quando cambiano note o selezione
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      autoResizeNote(noteRef.current)
    }, 0)
    return () => window.clearTimeout(t)
  }, [noteDraft, selectionKey, autoResizeNote])

  const noteEnabled = isLocked && pending === 'INTEGRAZIONE' && !loading && !lockedByTransmit

  const canTakeInCharge =
    hasSel &&
    !loading &&
    isLocked &&
    !lockedByTransmit &&
    (presaNum == null || presaNum === PRESA_DA_PRENDERE) &&
    (statoNum == null || statoNum === STATO_DA_PRENDERE)

  const canSetEsito =
    hasSel &&
    !loading &&
    isLocked &&
    !lockedByTransmit &&
    presaNum === PRESA_IN_CARICO &&
    statoNum === STATO_PRESA_IN_CARICO

  const canTrasmetti =
    role === 'DT' &&
    hasSel &&
    !loading &&
    isLocked &&
    !lockedByTransmit &&
    (statoNum === STATO_INTEGRAZIONE || statoNum === STATO_APPROVATA || statoNum === STATO_RESPINTA) &&
    (statoDANum == null || statoDANum === 0)

  const runApplyEdits = async (attributesIn: Record<string, any>, okText: string) => {
    if (!ds) throw new Error('DataSource non disponibile.')
    if (typeof ds.createJSAPILayerByDataSource !== 'function') {
      throw new Error('DataSource non compatibile: manca createJSAPILayerByDataSource().')
    }

    const startKey = selectionKeyRef.current
    setLoading(true)
    setMsg({ kind: 'info', text: 'Aggiorno…' })

    const jsapi = await ds.createJSAPILayerByDataSource()
    const layer = unwrapJsapiLayer(jsapi)
    if (!layer) throw new Error('Layer JSAPI non disponibile.')

    if (typeof layer.load === 'function') await layer.load()
    if (typeof layer.applyEdits !== 'function') throw new Error('applyEdits non disponibile sul layer.')

    const oidField = (ds.getIdField && ds.getIdField()) || layer.objectIdField || 'OBJECTID'
    const oidNow = oid
    if (oidNow == null || !Number.isFinite(oidNow)) throw new Error('OID non valido.')

    const attrs = filterAttrsToLayerFields({ [oidField]: oidNow, ...attributesIn }, layer)

    const res = await layer.applyEdits({ updateFeatures: [{ attributes: attrs }] })
    const r = res?.updateFeatureResults?.[0]
    const succeeded =
      (r?.success === true) ||
      (r?.success == null && (r?.error == null)) ||
      (r?.error == null && r?.objectId != null)

    if (!succeeded) {
      const err = r?.error
      const detail = err
        ? `code=${err.code ?? ''} name=${err.name ?? ''} message=${err.message ?? ''}`
        : JSON.stringify(r || res)
      throw new Error(detail)
    }

    // se nel frattempo la selezione è cambiata, non mostrare messaggi “stale”
    if (selectionKeyRef.current !== startKey) {
      setMsg(null)
      setLoading(false)
      return
    }

    setMsg({ kind: 'ok', text: okText })
    await refreshRootAndDerived(ds)

    window.setTimeout(() => {
      if (selectionKeyRef.current === startKey) setMsg(null)
    }, 5000)

    setLoading(false)
  }

  const unlock = () => {
    setPending(null)
    setIsLocked(false)
    setLoading(false)
  }

  const onAnnulla = async () => {
    try {
      unlock()
      setMsg(null)
      await tryClearSelection(ds)
    } catch {
      // anche se non riesco a svuotare, almeno sblocco
      unlock()
    }
  }

  const onTakeInCharge = async () => {
    try {
      await runApplyEdits(
        {
          [presaField]: PRESA_IN_CARICO,
          [dtPresaField]: Date.now(),
          [statoField]: STATO_PRESA_IN_CARICO,
          [dtStatoField]: Date.now()
        },
        'Presa in carico salvata.'
      )
      unlock()
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
      setLoading(false)
    }
  }

  const onStartIntegrazione = () => {
    setPending('INTEGRAZIONE')
    // focus + resize
    window.setTimeout(() => {
      try { noteRef.current?.focus?.() } catch {}
      autoResizeNote(noteRef.current)
    }, 0)
    setMsg({ kind: 'info', text: 'Inserisci la nota di integrazione e poi clicca “Conferma integrazione”.' })
  }

  const onConfirmIntegrazione = async () => {
    const t = noteDraft.trim()
    if (!t) {
      setMsg({ kind: 'err', text: 'Inserire una nota per richiedere integrazione.' })
      try { noteRef.current?.focus?.() } catch {}
      return
    }

    try {
      const stato = mapEsitoToStato(ESITO_INTEGRAZIONE) // => 3
      await runApplyEdits(
        {
          [esitoField]: ESITO_INTEGRAZIONE,
          [dtEsitoField]: Date.now(),
          [statoField]: stato ?? STATO_INTEGRAZIONE,
          [dtStatoField]: Date.now(),
          [noteField]: t
        },
        'Integrazione richiesta salvata.'
      )
      unlock()
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
      setLoading(false)
    }
  }

  const onSetEsito = async (esito: number, label: string) => {
    try {
      const stato = mapEsitoToStato(esito)
      const upd: Record<string, any> = {
        [esitoField]: esito,
        [dtEsitoField]: Date.now()
      }
      if (stato != null) {
        upd[statoField] = stato
        upd[dtStatoField] = Date.now()
      }
      await runApplyEdits(upd, `Esito salvato: ${label}.`)
      unlock()
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
      setLoading(false)
    }
  }

  const onTrasmetti = async () => {
    try {
      await runApplyEdits(
        {
          [statoDAField]: STATO_DA_PRENDERE,
          [dtStatoDAField]: Date.now(),
          [presaDAField]: PRESA_DA_PRENDERE
        },
        'Trasmesso a DA.'
      )
      unlock()
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}` })
      setLoading(false)
    }
  }

  // overlay blocco pagina (ma il pannello resta cliccabile perché ha zIndex superiore)
  const showOverlay = isLocked && hasSel

  return (
    <div>
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.10)',
            zIndex: 1000
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1001, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Dettaglio + Azioni ({role})</div>
          {msg && <div style={msgStyle(msg.kind)} title={msg.text}>{msg.text}</div>}
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <DetailRow label='N.pratica (OID)' value={oid} />
          <DetailRow label={presaField} value={presaVal} />
          <DetailRow label={statoField} value={statoVal} />
          <DetailRow label={esitoField} value={esitoVal} />
          <DetailRow label={statoDAField} value={statoDAVal} />
        </div>

        <div style={{ height: 1, background: '#e5e7eb', margin: '2px 0' }} />

        {/* barra “modalità operativa” */}
        {hasSel && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {isLocked
                ? 'Modalità operativa: completa un’azione oppure Annulla per uscire.'
                : 'Libero: puoi cambiare selezione o avviare un’azione (verrai bloccato durante l’operazione).'}
            </div>
            {isLocked && (
              <Button onClick={onAnnulla} disabled={loading}>
                Annulla
              </Button>
            )}
          </div>
        )}

        <div style={{ fontSize: 14, fontWeight: 700 }}>Azioni</div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button type='primary' onClick={onTakeInCharge} disabled={!canTakeInCharge}>
            {loading ? 'Aggiorno…' : buttonText}
          </Button>

          {/* Integrazione: 2 step (abilita note -> conferma) */}
          {pending !== 'INTEGRAZIONE' ? (
            <Button
              onClick={onStartIntegrazione}
              disabled={!canSetEsito || loading}
            >
              Integrazione
            </Button>
          ) : (
            <Button
              type='primary'
              onClick={onConfirmIntegrazione}
              disabled={!canSetEsito || loading}
            >
              Conferma integrazione
            </Button>
          )}

          <Button onClick={() => onSetEsito(ESITO_APPROVATA, 'Approvata')} disabled={!canSetEsito || loading}>
            Approva
          </Button>

          <Button onClick={() => onSetEsito(ESITO_RESPINTA, 'Respinta')} disabled={!canSetEsito || loading}>
            Respingi
          </Button>

          {role === 'DT' && (
            <Button onClick={onTrasmetti} disabled={!canTrasmetti || loading}>
              Trasmetti a DA
            </Button>
          )}
        </div>

        <div style={{ height: 1, background: '#e5e7eb', margin: '2px 0' }} />

        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Note</div>
            {pending === 'INTEGRAZIONE' && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                (obbligatorie per integrazione)
              </div>
            )}
          </div>

          <TextArea
            ref={noteRef as any}
            value={noteDraft}
            onChange={(e: any) => {
              const v = String(e?.target?.value ?? '')
              setNoteDraft(v)
              autoResizeNote(e?.target)
            }}
            placeholder={pending === 'INTEGRAZIONE' ? 'Scrivi la richiesta di integrazione…' : 'Le note sono disponibili solo per integrazione.'}
            style={{ width: '100%', minHeight: NOTE_MIN_H, maxHeight: NOTE_MAX_H, overflowY: 'hidden', resize: 'none' }}
            disabled={!noteEnabled}
          />

          {lockedByTransmit && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Bloccato perché già trasmesso a DA.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const roleCode = ((props.config as any)?.roleCode ? (props.config as any).roleCode : 'DT').trim().toUpperCase()
  const buttonText = (props.config as any)?.buttonText ? (props.config as any).buttonText : 'Prendi in carico'

  if (!props.useDataSources || !props.useDataSources.length) {
    return <div className='p-2'>Configura il data source nelle impostazioni del widget.</div>
  }

  const watchFields = [
    `presa_in_carico_${roleCode}`,
    `stato_${roleCode}`,
    `esito_${roleCode}`,
    `note_${roleCode}`,
    'presa_in_carico_DA',
    'stato_DA'
  ]

  const [selByKey, setSelByKey] = React.useState<Record<string, SelState>>({})

  const onUpdate = React.useCallback((dsKey: string, state: SelState) => {
    setSelByKey(prev => {
      const old = prev[dsKey]
      if (old && old.sig === state.sig && old.ds === state.ds && old.idFieldName === state.idFieldName) return prev
      return { ...prev, [dsKey]: state }
    })
  }, [])

  // “active” = la data view che in questo momento ha una selezione non vuota
  const active = React.useMemo(() => {
    for (let i = 0; i < props.useDataSources.length; i++) {
      const key = getUdsKey(props.useDataSources[i], i)
      const st = selByKey[key]
      if (st && st.oid != null) return { key, state: st }
    }
    return null
  }, [props.useDataSources, selByKey])

  return (
    <div className='p-2'>
      {props.useDataSources.map((uds: any, idx: number) => {
        const key = getUdsKey(uds, idx)
        return (
          <DataSourceSelectionBridge
            key={key}
            widgetId={props.id}
            uds={uds}
            dsKey={key}
            watchFields={watchFields}
            onUpdate={onUpdate}
          />
        )
      })}

      <ActionsPanel active={active} roleCode={roleCode} buttonText={buttonText} />
    </div>
  )
}

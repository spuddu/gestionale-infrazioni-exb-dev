/** @jsx jsx */
import { React, jsx, type AllWidgetProps, DataSourceComponent } from 'jimu-core'
import { Button } from 'jimu-ui'
import type { IMConfig } from '../config'

type MsgKind = 'info' | 'ok' | 'err'
type Msg = { kind: MsgKind; text: string; refOid?: number | null }

function unwrapJsapiLayer (maybe: any) {
  return (maybe && (maybe.layer || maybe)) || null
}

function pickOidFromData (data: any, idFieldName: string) {
  if (!data) return null
  if (idFieldName && data[idFieldName] != null) return data[idFieldName]
  return data.OBJECTID ?? data.ObjectId ?? data.objectid ?? data.objectId ?? null
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

function msgStyle (kind: MsgKind): React.CSSProperties {
  if (kind === 'ok') return { fontSize: 13, color: '#1a7f37', whiteSpace: 'nowrap' }
  if (kind === 'err') return { fontSize: 13, color: '#b42318', whiteSpace: 'nowrap' }
  return { fontSize: 13, color: '#4b5563', whiteSpace: 'nowrap' }
}

function Inner (props: { ds: any; roleSuffix: string; buttonText: string }) {
  const { ds, roleSuffix, buttonText } = props

  const presaField = `presa_in_carico_${roleSuffix}`
  const dtPresaField = `dt_presa_in_carico_${roleSuffix}`

  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg] = React.useState<Msg | null>({ kind: 'info', text: 'Selezionare una riga.', refOid: null })

  // Snapshot “stabile” per evitare flicker
  const [snap, setSnap] = React.useState<{
    oid: number | null
    presaVal: any
    idFieldName: string
  }>({ oid: null, presaVal: null, idFieldName: 'OBJECTID' })

  // ✅ ref per leggere sempre l’ultimo snapshot nei timeout
  const snapRef = React.useRef(snap)
  React.useEffect(() => { snapRef.current = snap }, [snap])

  // Lettura live
  try { ds.setListenSelection && ds.setListenSelection(true) } catch {}
  const selected = ds.getSelectedRecords ? (ds.getSelectedRecords() || []) : []
  const r0 = selected.length ? selected[0] : null
  const data = r0?.getData ? r0.getData() : {}

  const idFieldName = ds.getIdField ? ds.getIdField() : 'OBJECTID'
  const liveOidRaw = pickOidFromData(data, idFieldName)
  const liveOid = liveOidRaw != null ? Number(liveOidRaw) : null
  const livePresaVal = data ? data[presaField] : null

  // ✅ Aggiorna snapshot quando arriva un OID valido
  React.useEffect(() => {
    if (liveOid != null && Number.isFinite(liveOid)) {
      setSnap({ oid: liveOid, presaVal: livePresaVal, idFieldName })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveOid, livePresaVal, idFieldName])

  // ✅ FIX: se la selezione sparisce (es. cambio filtro nell’elenco) allora “sgancia”
  // (con micro-delay per evitare flicker durante transizioni)
  React.useEffect(() => {
    if (selected.length > 0) return

    const t = window.setTimeout(() => {
      setSnap(prev => {
        if (prev.oid == null) return prev
        return { oid: null, presaVal: null, idFieldName }
      })
      setMsg(prev => {
        if (prev?.kind === 'ok') return prev
        return { kind: 'info', text: 'Selezionare una riga.', refOid: null }
      })
    }, 200)

    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.length, idFieldName])

  // === Regole messaggi UX ===
  const lastOidRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    const currOid = snap.oid

    // Se cambia record, azzera i messaggi ok/err
    if (lastOidRef.current != null && currOid != null && lastOidRef.current !== currOid) {
      setMsg(null) // riga selezionata => nessun messaggio
    }
    lastOidRef.current = currOid

    // Se non c'è selezione: mostra "Selezionare una riga." SOLO se non stiamo mostrando un OK recente
    if (currOid == null) {
      setMsg(prev => {
        if (prev?.kind === 'ok') return prev
        return { kind: 'info', text: 'Selezionare una riga.', refOid: null }
      })
    } else {
      // Se c'è selezione e non stiamo caricando e il messaggio è "info", nascondilo
      setMsg(prev => {
        if (loading) return prev
        if (!prev) return null
        if (prev.kind === 'info') return null
        return prev
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.oid])

  const canRun = snap.oid != null && Number(snap.presaVal) === 1 && !loading

  const onClick = async () => {
    // Se la selezione è “in transizione”, non editare
    if (liveOid != null && snap.oid != null && liveOid !== snap.oid) {
      setMsg({ kind: 'info', text: 'Selezione in aggiornamento…', refOid: null })
      return
    }

    setLoading(true)
    setMsg({ kind: 'info', text: 'Aggiorno…', refOid: snap.oid ?? null })

    try {
      if (!ds || typeof ds.createJSAPILayerByDataSource !== 'function') {
        throw new Error('DataSource non compatibile: manca createJSAPILayerByDataSource().')
      }

      const jsapi = await ds.createJSAPILayerByDataSource()
      const layer = unwrapJsapiLayer(jsapi)
      if (!layer) throw new Error('Layer JSAPI non disponibile.')

      if (typeof layer.load === 'function') await layer.load()
      if (typeof layer.applyEdits !== 'function') throw new Error('applyEdits non disponibile sul layer.')

      const oidField = (ds.getIdField && ds.getIdField()) || layer.objectIdField || 'OBJECTID'
      const oid = snap.oid
      if (oid == null || !Number.isFinite(oid)) throw new Error('OID non valido.')

      const attributes: any = {
        [oidField]: oid,
        [presaField]: 2,
        [dtPresaField]: Date.now()
      }

      const res = await layer.applyEdits({ updateFeatures: [{ attributes }] })

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

      setMsg({ kind: 'ok', text: 'Presa in carico salvata.', refOid: oid })

      await refreshRootAndDerived(ds)

      setTimeout(() => {
        setMsg(prev => {
          if (!prev) return prev
          if (prev.kind !== 'ok') return prev

          const currOid = snapRef.current.oid
          return (currOid != null)
            ? null
            : { kind: 'info', text: 'Selezionare una riga.', refOid: null }
        })
      }, 5000)
    } catch (e: any) {
      const txt = e?.message ? String(e.message) : String(e)
      setMsg({ kind: 'err', text: `Errore salvataggio: ${txt}`, refOid: snap.oid ?? null })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 13 }}>
        N.pratica: <span style={{ fontWeight: 700 }}>{snap.oid != null ? String(snap.oid) : '—'}</span>
      </div>

      <Button type='primary' onClick={onClick} disabled={!canRun}>
        {loading ? 'Aggiorno…' : buttonText}
      </Button>

      {msg && (
        <div style={msgStyle(msg.kind)} title={msg.text}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const roleSuffix = ((props.config as any)?.roleSuffix ? (props.config as any).roleSuffix : 'DIR_AGR').trim().toUpperCase()
  const buttonText = (props.config as any)?.buttonText ? (props.config as any).buttonText : 'Prendi in carico'

  if (!props.useDataSources || !props.useDataSources.length) {
    return <div className='p-2'>Configura il data source nelle impostazioni del widget.</div>
  }

  return (
    <div className='p-2'>
      <DataSourceComponent useDataSource={props.useDataSources[0]} widgetId={props.id}>
        {(ds: any) => <Inner ds={ds} roleSuffix={roleSuffix} buttonText={buttonText} />}
      </DataSourceComponent>
    </div>
  )
}

import {
  React,
  css,
  type DataRecord,
  DataSourceComponent,
  type DataSource,
  DataSourceStatus
} from 'jimu-core'

import { Button, Alert, Loading, Modal, ModalHeader, ModalBody, ModalFooter } from 'jimu-ui'
import type { AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetProps<IMConfig>

type MsgKind = 'info' | 'success' | 'error'
interface MsgState {
  kind: MsgKind
  text: string
}

type TakeResult = { ok: true } | { ok: false; error: string }
function isTakeError (r: TakeResult): r is { ok: false; error: string } { return r.ok === false }

function num (v: any, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
function txt (v: any): string {
  if (v === null || v === undefined) return ''
  return String(v)
}
function formatDateIt (v: any): string {
  if (v === null || v === undefined || v === '') return ''
  let d: Date | null = null
  if (typeof v === 'number') d = new Date(v)
  else if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) d = new Date(t)
  } else if (v instanceof Date) d = v
  if (!d || Number.isNaN(d.getTime())) return txt(v)
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(d)
}

async function presaInCaricoByObjectId (args: {
  ds: DataSource
  objectId: number
  fieldStato: string
  fieldData: string
  valorePresa: number
}): Promise<TakeResult> {
  const { ds, objectId, fieldStato, fieldData, valorePresa } = args

  const layer: any =
    (ds as any).layer ??
    (ds as any).getLayer?.() ??
    (ds as any).getOriginDataSource?.()?.getLayer?.()

  if (!layer || typeof layer.applyEdits !== 'function') {
    return { ok: false, error: 'Layer/applyEdits non disponibili (view? permessi?).' }
  }

  const nowIso = new Date().toISOString()
  const updates = [{
    attributes: {
      OBJECTID: objectId,
      [fieldStato]: valorePresa,
      [fieldData]: nowIso
    }
  }]

  try {
    const res = await layer.applyEdits({ updateFeatures: updates })
    const upd = res?.updateFeatureResults?.[0]
    const hasErr = !!upd?.error
    const hasId = upd?.objectId != null
    if (!hasErr && hasId) return { ok: true }
    return { ok: false, error: upd?.error?.message || 'applyEdits non riuscito.' }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

// ✅ Forza updateQueryParams + load quando cambia la query (ExB 1.19)
function QueryApplier (props: { ds: DataSource, query: any, signature: string, widgetId: string }) {
  const lastSig = React.useRef<string>('')

  React.useEffect(() => {
    const dsAny: any = props.ds
    if (!dsAny) return
    if (props.signature === lastSig.current) return
    lastSig.current = props.signature

    let canceled = false
    ;(async () => {
      try {
        dsAny.updateQueryParams?.(props.query, props.widgetId)
        if (typeof dsAny.load === 'function') await dsAny.load()
        else if (typeof dsAny.refresh === 'function') dsAny.refresh()
      } catch {
        // silenzioso
      }
    })()

    return () => { canceled = true }
  }, [props.ds, props.signature, props.widgetId])

  return null
}

export default function Widget (props: Props): React.ReactElement {
  const base: any = (defaultConfig as any)?.asMutable
    ? (defaultConfig as any).asMutable({ deep: true })
    : defaultConfig

  const over: any = (props.config as any)?.asMutable
    ? (props.config as any).asMutable({ deep: true })
    : (props.config ?? {})

  const cfg: any = {
    ...base,
    ...over,
    colWidths: {
      ...(base?.colWidths || {}),
      ...(over?.colWidths || {})
    }
  }

  const useData = props.useDataSources?.[0]

  const [msg, setMsg] = React.useState<MsgState | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pendingOid, setPendingOid] = React.useState<number | null>(null)

  // ------- query params
  const where = txt(cfg.whereClause || '1=1').trim() || '1=1'
  const pageSize = num(cfg.pageSize, 50)
  const orderByField = txt(cfg.orderByField || '').trim()
  const orderByDir = (txt(cfg.orderByDir || 'ASC').toUpperCase() === 'DESC') ? 'DESC' : 'ASC'

  const query = React.useMemo(() => {
    return {
      where,
      outFields: ['*'],
      pageSize,
      orderByFields: orderByField ? [`${orderByField} ${orderByDir}`] : []
    } as any
  }, [where, pageSize, orderByField, orderByDir])

  const querySig = `${where}::${pageSize}::${orderByField}::${orderByDir}`

  // ------- layout
  const showHeader = cfg.showHeader !== false
  const colW = cfg.colWidths || {}
  const wPratica = num(colW.pratica, 140)
  const wData = num(colW.data, 140)
  const wUfficio = num(colW.ufficio, 180)
  const wStato = num(colW.stato, 220)
  const wDtPresa = num(colW.dt_presa, 180)
  const wBtn = num(cfg.btnWidth, 160)

  const gap = num(cfg.gap, 12)
  const padFirst = num(cfg.paddingLeftFirstCol, 0)

  const colsCount = 6
  const minWidth = wPratica + wData + wUfficio + wStato + wDtPresa + wBtn + gap * (colsCount - 1)
  const gridCols = `${wPratica}px ${wData}px ${wUfficio}px ${wStato}px ${wDtPresa}px ${wBtn}px`

  // ------- chip format
  const chipRadius = num(cfg.statoChipRadius, 999)
  const chipPadX = num(cfg.statoChipPadX, 10)
  const chipPadY = num(cfg.statoChipPadY, 4)
  const chipBorderW = num(cfg.statoChipBorderW, 1)

  const chipFontWeight = num(cfg.statoChipFontWeight, 600)
  const chipFontSize = num(cfg.statoChipFontSize, 12)
  const chipFontStyle = (txt(cfg.statoChipFontStyle || 'normal') === 'italic') ? 'italic' : 'normal'
  const chipTextTransform = txt(cfg.statoChipTextTransform || 'none')
  const chipLetterSpacing = num(cfg.statoChipLetterSpacing, 0)

  const styles = css`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;

    .topMsg { padding: 8px 12px; }
    .viewport { flex: 1; min-height: 0; overflow: auto; }

    /* no inset a sinistra */
    .content { min-width: ${minWidth}px; padding: 0 !important; margin: 0 !important; }

    .headerWrap {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bs-body-bg, #fff);
      border-bottom: 1px solid rgba(0,0,0,0.08);
      padding: 12px 0 !important;
      margin: 0 !important;
    }

    .gridRow {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;
      padding: 0 !important;
      margin: 0 !important;
    }

    .rows { display: flex; flex-direction: column; }

    .row {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;
      padding: 10px 0 !important;
      margin: 0 !important;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      cursor: pointer;
    }

    .row.even { background: ${txt(cfg.zebraEvenBg || '#ffffff')}; }
    .row.odd  { background: ${txt(cfg.zebraOddBg || '#fbfbfb')}; }
    .row:hover { background: ${txt(cfg.hoverBg || '#f2f6ff')}; }

    .row.selected {
      outline: ${num(cfg.selectedBorderWidth, 2)}px solid ${txt(cfg.selectedBorderColor || '#2f6fed')};
      outline-offset: -${num(cfg.selectedBorderWidth, 2)}px;
      background: ${txt(cfg.selectedBg || '#eaf2ff')};
    }

    .cell {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-sizing: border-box;
      padding-left: 0 !important;
      padding-right: 0 !important;
      margin: 0 !important;
      text-align: left;
    }

    .headerCell {
      font-weight: 600;
      font-size: 0.85rem;
      color: rgba(0,0,0,0.7);
      padding-left: 0 !important;
      padding-right: 0 !important;
      margin: 0 !important;
    }

    .first { padding-left: ${padFirst}px !important; }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: ${chipPadY}px ${chipPadX}px;
      border-radius: ${chipRadius}px;
      border: ${chipBorderW}px solid rgba(0,0,0,0.12);

      /* ✅ formato testo configurabile */
      font-weight: ${chipFontWeight};
      font-size: ${chipFontSize}px;
      font-style: ${chipFontStyle};
      text-transform: ${chipTextTransform};
      letter-spacing: ${chipLetterSpacing}px;

      line-height: 1;
      white-space: nowrap;
    }

    .btnCell { display: flex; align-items: center; justify-content: flex-start; }
    .btnCell .jimu-btn { width: ${wBtn}px; min-width: ${wBtn}px; justify-content: center; }

    .empty { padding: 14px; color: rgba(0,0,0,0.65); }
  `

  const openConfirmFor = (oid: number, ds: DataSource) => {
    try {
      const all = (ds.getRecords?.() ?? []) as DataRecord[]
      const found = all.find(r => Number(r.getData?.()?.OBJECTID) === oid)
      if (found) ds.selectRecordById?.(found.getId())
    } catch {}
    setPendingOid(oid)
    setConfirmOpen(true)
  }

  const doTake = async (ds: DataSource, oid: number) => {
    const fieldStato = txt(cfg.fieldStatoPresa || 'presa_in_carico_DIR_AGR')
    const fieldData = txt(cfg.fieldDataPresa || 'dt_presa_in_carico_DIR_AGR')
    const valorePresa = num(cfg.valorePresa, 2)

    const res = await presaInCaricoByObjectId({ ds, objectId: oid, fieldStato, fieldData, valorePresa })

    if (isTakeError(res)) {
      const prefix = txt(cfg.msgErrorPrefix || 'Errore salvataggio: ')
      setMsg({ kind: 'error', text: `${prefix}${res.error}` })
    } else {
      setMsg({ kind: 'success', text: txt(cfg.msgSuccess || 'Presa in carico salvata.') })
    }

    try { (ds as any).refresh?.() } catch {}
  }

  const getChipStyle = (statoNum: number | null) => {
    const daPrendere = num(cfg.valoreDaPrendere, 1)
    const presa = num(cfg.valorePresa, 2)

    if (statoNum === daPrendere) {
      return {
        background: txt(cfg.statoBgDaPrendere || '#fff7e6'),
        color: txt(cfg.statoTextDaPrendere || '#7a4b00'),
        borderColor: txt(cfg.statoBorderDaPrendere || '#ffd18a')
      } as React.CSSProperties
    }

    if (statoNum === presa) {
      return {
        background: txt(cfg.statoBgPresa || '#eaf7ef'),
        color: txt(cfg.statoTextPresa || '#1f6b3a'),
        borderColor: txt(cfg.statoBorderPresa || '#9ad2ae')
      } as React.CSSProperties
    }

    return {
      background: txt(cfg.statoBgAltro || '#f2f2f2'),
      color: txt(cfg.statoTextAltro || '#333333'),
      borderColor: txt(cfg.statoBorderAltro || '#d0d0d0')
    } as React.CSSProperties
  }

  if (!useData) {
    return <div css={styles} className='empty'>{txt(cfg.errorNoDs || 'Configura la fonte dati del widget.')}</div>
  }

  return (
    <DataSourceComponent useDataSource={useData} query={query} widgetId={props.id}>
      {(ds, info) => {
        const status = info?.status ?? ds.getStatus?.() ?? DataSourceStatus.NotReady
        const isLoading = status === DataSourceStatus.Loading

        const recs = (ds.getRecords?.() ?? []) as DataRecord[]
        const selected = (ds.getSelectedRecords?.() ?? []) as DataRecord[]
        const selectedOid = selected?.[0]?.getData?.()?.OBJECTID
        const selectedOidNum = selectedOid != null ? Number(selectedOid) : null

        const fieldPratica = txt(cfg.fieldPratica || 'objectid')
        const fieldDataRil = txt(cfg.fieldDataRilevazione || 'data_rilevazione')
        const fieldUfficio = txt(cfg.fieldUfficio || 'ufficio_zona')
        const fieldStato = txt(cfg.fieldStatoPresa || 'presa_in_carico_DIR_AGR')
        const fieldDtPresa = txt(cfg.fieldDataPresa || 'dt_presa_in_carico_DIR_AGR')

        const daPrendere = num(cfg.valoreDaPrendere, 1)
        const presa = num(cfg.valorePresa, 2)

        const labelDaPrendere = txt(cfg.labelDaPrendere || 'Da prendere in carico')
        const labelPresa = txt(cfg.labelPresa || 'Presa in carico')

        const btnOn = txt(cfg.labelBtnTakeAttivo || 'Prendi in carico')
        const btnOff = txt(cfg.labelBtnTakeDisattivo || 'Già in carico')

        return (
          <div css={styles}>
            {/* ✅ forza applicazione ordine/filtro quando cambiano */}
            <QueryApplier ds={ds} query={query} signature={querySig} widgetId={props.id} />

            {msg && (
              <div className='topMsg'>
                <Alert
                  form='basic'
                  type={msg.kind === 'success' ? 'success' : msg.kind === 'error' ? 'error' : 'info'}
                  text={msg.text}
                  withIcon
                  closable
                  onClose={() => setMsg(null)}
                />
              </div>
            )}

            <div className='viewport'>
              <div className='content'>
                {showHeader && (
                  <div className='headerWrap'>
                    <div className='gridRow'>
                      <div className='cell headerCell first'>{txt(cfg.headerPratica || 'N. pratica')}</div>
                      <div className='cell headerCell'>{txt(cfg.headerData || 'Data rilevazione')}</div>
                      <div className='cell headerCell'>{txt(cfg.headerUfficio || 'Ufficio')}</div>
                      <div className='cell headerCell'>{txt(cfg.headerStato || 'Stato pratica')}</div>
                      <div className='cell headerCell'>{txt(cfg.headerDtPresa || 'Dt. presa')}</div>
                      <div className='cell headerCell'>{txt(cfg.headerAzioni || 'Azioni')}</div>
                    </div>
                  </div>
                )}

                {isLoading && <Loading />}

                {!isLoading && (!recs || recs.length === 0) && (
                  <div className='empty'>{txt(cfg.emptyMessage || 'Nessun record trovato (view/filtro/permessi).')}</div>
                )}

                {!isLoading && recs && recs.length > 0 && (
                  <div className='rows'>
                    {recs.map((r, idx) => {
                      const d = r.getData?.() || {}
                      const oid = Number(d.OBJECTID)

                      const pratica = txt(d[fieldPratica])
                      const dataRil = formatDateIt(d[fieldDataRil])
                      const ufficio = txt(d[fieldUfficio])

                      const statoRaw = d[fieldStato]
                      const statoNum = Number(statoRaw)
                      const statoLabel =
                        statoNum === daPrendere ? labelDaPrendere
                          : statoNum === presa ? labelPresa
                            : txt(statoRaw)

                      const dtPresa = formatDateIt(d[fieldDtPresa])

                      const selectedRow = selectedOidNum != null && Number.isFinite(oid) && oid === selectedOidNum
                      const even = idx % 2 === 0
                      const canTake = Number.isFinite(statoNum) && statoNum === daPrendere

                      return (
                        <div
                          key={r.getId?.() || `${oid}-${idx}`}
                          className={`row ${even ? 'even' : 'odd'} ${selectedRow ? 'selected' : ''}`}
                          onClick={() => {
                            try { ds.selectRecordById?.(r.getId()) } catch {}
                          }}
                        >
                          <div className='cell first' title={pratica}>{pratica}</div>
                          <div className='cell' title={dataRil}>{dataRil}</div>
                          <div className='cell' title={ufficio}>{ufficio}</div>

                          <div className='cell' title={statoLabel}>
                            <span className='chip' style={getChipStyle(Number.isFinite(statoNum) ? statoNum : null)}>
                              {statoLabel}
                            </span>
                          </div>

                          <div className='cell' title={dtPresa}>{dtPresa}</div>

                          <div className='cell btnCell'>
                            <Button
                              size='sm'
                              type='primary'
                              disabled={!canTake}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!Number.isFinite(oid)) {
                                  setMsg({ kind: 'error', text: 'OBJECTID non valido.' })
                                  return
                                }
                                setMsg(null)
                                openConfirmFor(oid, ds)
                              }}
                            >
                              {canTake ? btnOn : btnOff}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <Modal isOpen={confirmOpen} toggle={() => setConfirmOpen(false)} centered>
              <ModalHeader toggle={() => setConfirmOpen(false)}>
                {txt(cfg.confirmTitle || 'Conferma')}
              </ModalHeader>
              <ModalBody>
                {txt(cfg.confirmMessage || 'Vuoi prendere in carico questa pratica?')}
              </ModalBody>
              <ModalFooter>
                <Button
                  type='primary'
                  onClick={async () => {
                    setConfirmOpen(false)
                    const oid = pendingOid
                    setPendingOid(null)
                    if (oid == null) {
                      setMsg({ kind: 'error', text: 'Nessun record selezionato.' })
                      return
                    }
                    await doTake(ds, oid)
                  }}
                >
                  {txt(cfg.confirmYes || 'Sì')}
                </Button>
                <Button
                  type='tertiary'
                  onClick={() => {
                    setConfirmOpen(false)
                    setPendingOid(null)
                  }}
                >
                  {txt(cfg.confirmNo || 'No')}
                </Button>
              </ModalFooter>
            </Modal>
          </div>
        )
      }}
    </DataSourceComponent>
  )
}

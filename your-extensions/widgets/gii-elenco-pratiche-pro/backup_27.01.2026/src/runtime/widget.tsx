import {
  React,
  css,
  type DataRecord,
  DataSourceComponent,
  type DataSource,
  DataSourceStatus
} from 'jimu-core'

import {
  Button,
  Alert,
  Loading,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Icon
} from 'jimu-ui'

import ResetOutlined from 'jimu-icons/svg/outlined/editor/reset.svg'
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

type SortDir = 'ASC' | 'DESC'
type SortItem = { field: string, dir: SortDir }

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

function compareValues (a: any, b: any): number {
  const aNull = (a === null || a === undefined || a === '')
  const bNull = (b === null || b === undefined || b === '')
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b

  const aStr = String(a)
  const bStr = String(b)
  const aDate = Date.parse(aStr)
  const bDate = Date.parse(bStr)
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate

  return aStr.localeCompare(bStr, 'it', { numeric: true, sensitivity: 'base' })
}

function sortRecords (recs: DataRecord[], sort: SortItem[]): DataRecord[] {
  if (!sort || sort.length === 0) return recs
  const copy = [...recs]
  copy.sort((ra, rb) => {
    const da = ra.getData?.() || {}
    const db = rb.getData?.() || {}
    for (const s of sort) {
      const cmp = compareValues(da[s.field], db[s.field])
      if (cmp !== 0) return (s.dir === 'ASC' ? cmp : -cmp)
    }
    return 0
  })
  return copy
}

function sortSig (s: SortItem[]): string {
  return (s || []).map(x => `${x.field}:${x.dir}`).join('|')
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

  // Default sort dal pannello contenuti (single-field)
  const defaultSort: SortItem[] = React.useMemo(() => {
    const f = txt(cfg.orderByField || '').trim()
    if (!f) return []
    const dir: SortDir = (txt(cfg.orderByDir || 'ASC').toUpperCase() === 'DESC') ? 'DESC' : 'ASC'
    return [{ field: f, dir }]
  }, [cfg.orderByField, cfg.orderByDir])

  const defaultSortSignature = React.useMemo(() => sortSig(defaultSort), [defaultSort])
  const [sortState, setSortState] = React.useState<SortItem[]>(defaultSort)

  React.useEffect(() => {
    setSortState(defaultSort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSortSignature])

  const sortStateSignature = React.useMemo(() => sortSig(sortState), [sortState])
  const isCustomSort = sortStateSignature !== defaultSortSignature

  const toggleSort = (field: string, additive: boolean) => {
    setSortState((prev) => {
      const idx = prev.findIndex(s => s.field === field)

      if (!additive) {
        if (idx === 0 && prev.length === 1) {
          const nextDir: SortDir = prev[0].dir === 'ASC' ? 'DESC' : 'ASC'
          return [{ field, dir: nextDir }]
        }
        return [{ field, dir: 'ASC' }]
      }

      if (idx >= 0) {
        const cur = prev[idx]
        if (cur.dir === 'ASC') {
          const next = [...prev]
          next[idx] = { field, dir: 'DESC' }
          return next
        }
        return prev.filter(s => s.field !== field)
      }

      return [...prev, { field, dir: 'ASC' }]
    })
  }

  const getSortInfo = (field: string): { idx: number, dir?: SortDir } => {
    const idx = sortState.findIndex(s => s.field === field)
    if (idx < 0) return { idx: -1 }
    return { idx, dir: sortState[idx].dir }
  }

  const dsQuery = React.useMemo(() => {
    return {
      where: txt(cfg.whereClause || '1=1').trim() || '1=1',
      outFields: ['*'],
      pageSize: num(cfg.pageSize, 50)
    } as any
  }, [cfg.whereClause, cfg.pageSize])

  // layout
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

  // chip format
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
    .content { min-width: ${minWidth}px; padding: 0 !important; margin: 0 !important; }

    .headerWrap {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bs-body-bg, #fff);
      border-bottom: 1px solid rgba(0,0,0,0.08);
      padding: 6px 0 !important;
      margin: 0 !important;
    }

    .gridRow {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;
      min-height: 32px;
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
      color: rgba(0,0,0,0.72);
      display: flex;
      align-items: center;
      padding-left: 0 !important;
      padding-right: 0 !important;
      margin: 0 !important;
    }

    .first { padding-left: ${padFirst}px !important; }

    .hdrBtn {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      color: inherit;
      font: inherit;
      line-height: 1;
    }
    .hdrBtn:hover { color: rgba(0,0,0,0.9); }
    .hdrBtn:focus { outline: 2px solid rgba(47, 111, 237, 0.35); outline-offset: 2px; border-radius: 6px; }

    .sortBadge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      opacity: 0.8;
    }
    .sortPri {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: rgba(0,0,0,0.07);
      font-weight: 700;
    }

    .actionsHdr {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      white-space: nowrap;
    }

    /* ✅ Reset con icona + testo, senza aumentare header */
    .resetBtn {
      padding: 0 8px !important;
      height: 28px !important;
      min-height: 28px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }
    .resetInner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      line-height: 1;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: ${chipPadY}px ${chipPadX}px;
      border-radius: ${chipRadius}px;
      border: ${chipBorderW}px solid rgba(0,0,0,0.12);
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
    <DataSourceComponent useDataSource={useData} query={dsQuery} widgetId={props.id}>
      {(ds, info) => {
        const status = info?.status ?? ds.getStatus?.() ?? DataSourceStatus.NotReady
        const isLoading = status === DataSourceStatus.Loading

        const recsRaw = (ds.getRecords?.() ?? []) as DataRecord[]
        const recs = sortRecords(recsRaw, sortState)

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

        const Header = (p: { label: string, field?: string, first?: boolean }) => {
          const clickable = !!p.field
          if (!clickable) {
            return <div className={`cell headerCell ${p.first ? 'first' : ''}`}>{p.label}</div>
          }

          const si = getSortInfo(p.field!)
          const isSorted = si.idx >= 0
          const dir = si.dir
          const pri = si.idx + 1

          const badge = isSorted
            ? (
              <span className='sortBadge' title={`Ordinamento #${pri} (${dir})`}>
                <span className='sortPri'>{pri}</span>
                <span aria-hidden>{dir === 'ASC' ? '↑' : '↓'}</span>
              </span>
              )
            : <span className='sortBadge' style={{ opacity: 0.35 }} aria-hidden>↕</span>

          return (
            <div className={`cell headerCell ${p.first ? 'first' : ''}`}>
              <button
                type='button'
                className='hdrBtn'
                title='Click: ordina per questa colonna. Shift+Click: aggiungi ordinamento multiplo.'
                onClick={(e) => toggleSort(p.field!, (e as any).shiftKey === true)}
              >
                <span>{p.label}</span>
                {badge}
              </button>
            </div>
          )
        }

        return (
          <div css={styles}>
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
                      <Header first label={txt(cfg.headerPratica || 'N. pratica')} field={fieldPratica} />
                      <Header label={txt(cfg.headerData || 'Data rilevazione')} field={fieldDataRil} />
                      <Header label={txt(cfg.headerUfficio || 'Ufficio')} field={fieldUfficio} />
                      <Header label={txt(cfg.headerStato || 'Stato pratica')} field={fieldStato} />
                      <Header label={txt(cfg.headerDtPresa || 'Dt. presa')} field={fieldDtPresa} />

                      <div className='cell headerCell'>
                        <div className='actionsHdr'>
                          <span>{txt(cfg.headerAzioni || 'Azioni')}</span>

                          {isCustomSort && (
                            <Button
                              size='sm'
                              type='tertiary'
                              className='resetBtn'
                              onClick={() => setSortState(defaultSort)}
                              title='Ripristina ordinamento di default'
                              aria-label='Reset ordinamento'
                            >
                              <span className='resetInner'>
                                <Icon icon={ResetOutlined} size={14} />
                                <span>Reset</span>
                              </span>
                            </Button>
                          )}
                        </div>
                      </div>
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
                                try { ds.selectRecordById?.(r.getId()) } catch {}
                                setPendingOid(oid)
                                setConfirmOpen(true)
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

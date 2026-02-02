import {
  React,
  css,
  DataSourceComponent,
  DataSourceStatus,
  type DataRecord,
  type DataSource,
  DataSourceManager,
  Immutable
} from 'jimu-core'

import { Button, Alert, Loading } from 'jimu-ui'
import type { AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetProps<IMConfig>

type MsgKind = 'info' | 'success' | 'error'
interface MsgState { kind: MsgKind; text: string }

type SortDir = 'ASC' | 'DESC'
type SortItem = { field: string, dir: SortDir }

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
function asJs<T = any> (v: any): T {
  return v?.asMutable ? v.asMutable({ deep: true }) : v
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

function getDsLabel (useDs: any, fallback: string): string {
  try {
    const ds = DataSourceManager.getInstance().getDataSource(useDs?.dataSourceId)
    const label = ds?.getLabel?.()
    return (label && String(label).trim()) ? String(label) : fallback
  } catch {
    return fallback
  }
}

function trySelectRecord (ds: any, record: DataRecord, recordId: string) {
  try { ds.selectRecordsByIds?.([recordId]) } catch {}
  try { ds.selectRecordById?.(recordId) } catch {}
  try { ds.setSelectedRecords?.([record]) } catch {}
}

function tryClearSelection (ds: any) {
  try { ds.selectRecordsByIds?.([]) } catch {}
  try { ds.clearSelection?.() } catch {}
  try { ds.setSelectedRecords?.([]) } catch {}
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

export default function Widget (props: Props): React.ReactElement {
  const base: any = (defaultConfig as any)?.asMutable
    ? (defaultConfig as any).asMutable({ deep: true })
    : defaultConfig

  const over: any = (props.config as any)?.asMutable
    ? (props.config as any).asMutable({ deep: true })
    : (props.config ?? {})

  const cfg: any = { ...base, ...over }

  // IMPORTANT: passiamo a DataSourceComponent sempre l’oggetto IMMUTABLE originale
  const useDsImm: any = props.useDataSources ?? Immutable([])
  const useDsJs: any[] = asJs(useDsImm) || []
  const hasTabs = useDsJs.length > 1

  const [activeTab, setActiveTab] = React.useState(0)
  const dsRefForClear = React.useRef<any>(null)
  React.useEffect(() => {
    if (activeTab >= useDsJs.length) setActiveTab(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDsJs.length])

  const activeUseDsImm =
    (useDsImm?.get ? useDsImm.get(activeTab) : useDsImm?.[activeTab]) ||
    (useDsImm?.get ? useDsImm.get(0) : useDsImm?.[0])

  const activeUseDsJs = useDsJs[activeTab] || useDsJs[0]

  const [msg, setMsg] = React.useState<MsgState | null>(null)
  const [localSelectedByDs, setLocalSelectedByDs] = React.useState<Record<string, string>>({})

  const dsQuery = React.useMemo(() => {
    return {
      where: txt(cfg.whereClause || '1=1').trim() || '1=1',
      outFields: ['*'],
      pageSize: num(cfg.pageSize, 200)
    } as any
  }, [cfg.whereClause, cfg.pageSize])

  const defaultSort: SortItem[] = React.useMemo(() => {
    const f = txt(cfg.orderByField || '').trim()
    if (!f) return []
    const dir: SortDir = (txt(cfg.orderByDir || 'ASC').toUpperCase() === 'DESC') ? 'DESC' : 'ASC'
    return [{ field: f, dir }]
  }, [cfg.orderByField, cfg.orderByDir])

  const defaultSortSig = React.useMemo(() => sortSig(defaultSort), [defaultSort])
  const [sortState, setSortState] = React.useState<SortItem[]>(defaultSort)

  React.useEffect(() => {
    setSortState((prev) => (sortSig(prev) === defaultSortSig ? defaultSort : prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSortSig])

  const isCustomSort = sortSig(sortState) !== defaultSortSig

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

  const rowGap = num(cfg.rowGap, 8)
  const rowPaddingX = num(cfg.rowPaddingX, 12)
  const rowPaddingY = num(cfg.rowPaddingY, 10)
  const rowMinHeight = num(cfg.rowMinHeight, 44)
  const rowRadius = num(cfg.rowRadius, 12)
  const rowBorderWidth = num(cfg.rowBorderWidth, 1)
  const rowBorderColor = txt(cfg.rowBorderColor || 'rgba(0,0,0,0.08)')

  const colW = cfg.colWidths || {}
  const wPratica = num(colW.pratica, 140)
  const wData = num(colW.data, 140)
  const wUfficio = num(colW.ufficio, 180)
  const wStato = num(colW.stato, 220)
  const wDtPresa = num(colW.dt_presa, 180)
  const wBtn = num(cfg.btnWidth, 160)

  const gap = num(cfg.gap, 12)
  const padFirst = num(cfg.paddingLeftFirstCol, 0)

  const gridCols = `${wPratica}px ${wData}px ${wUfficio}px ${wStato}px ${wDtPresa}px ${wBtn}px`
  const minWidth = wPratica + wData + wUfficio + wStato + wDtPresa + wBtn + gap * 5

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

    .tabBar {
      display: ${hasTabs ? 'flex' : 'none'};
      gap: 6px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      background: var(--bs-body-bg, #fff);
    }
    .tabBtn {
      border: 1px solid rgba(0,0,0,0.12);
      background: rgba(0,0,0,0.02);
      padding: 6px 10px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      white-space: nowrap;
    }
    .tabBtn.active {
      background: rgba(47, 111, 237, 0.12);
      border-color: rgba(47, 111, 237, 0.35);
    }

    .viewport { flex: 1; min-height: 0; overflow: auto; }
    .content { min-width: ${minWidth}px; padding: 10px 12px; }

    .headerWrap {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bs-body-bg, #fff);
      border-bottom: 1px solid rgba(0,0,0,0.08);
      padding: 8px 12px;
      margin: 0 0 10px 0;
    }

    .gridHeader {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;
      min-height: 32px;
    }

    .headerCell {
      display: flex;
      align-items: center;
      min-width: 0;
      font-weight: 700;
      font-size: 12px;
      color: rgba(0,0,0,0.65);
    }

    .hdrBtn {
      width: 100%;
      border: none;
      background: transparent;
      padding: 0;
      margin: 0;
      text-align: left;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      font: inherit;
      line-height: 1;
    }
    .hdrBtn:hover { color: rgba(0,0,0,0.9); }

    .sortBadge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      opacity: 0.85;
    }
    .sortPri {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: rgba(0,0,0,0.07);
      font-weight: 800;
    }

    .actionsHdr {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      white-space: nowrap;
    }

    .resetBtn {
      padding: 0 10px !important;
      height: 28px !important;
      min-height: 28px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      font-size: 12px !important;
      font-weight: 700 !important;
    }

    .first { padding-left: ${padFirst}px; }

    .list { display: flex; flex-direction: column; }

    .rowCard {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;

      padding: ${rowPaddingY}px ${rowPaddingX}px;
      min-height: ${rowMinHeight}px;

      border-radius: ${rowRadius}px;
      border: ${rowBorderWidth}px solid ${rowBorderColor};

      margin-bottom: ${rowGap}px;
      cursor: pointer;
    }
    .rowCard.even { background: ${txt(cfg.zebraEvenBg || '#ffffff')}; }
    .rowCard.odd  { background: ${txt(cfg.zebraOddBg || '#fbfbfb')}; }
    .rowCard:hover { background: ${txt(cfg.hoverBg || '#f2f6ff')}; }

    .rowCard.selected {
      border-color: ${txt(cfg.selectedBorderColor || '#2f6fed')};
      box-shadow: 0 0 0 ${num(cfg.selectedBorderWidth, 2)}px rgba(47,111,237,0.18);
      background: ${txt(cfg.selectedBg || '#eaf2ff')};
    }

    .cell {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      max-width: 100%;
    }

    .btnCell { display: flex; justify-content: flex-start; }
    .btnCell .jimu-btn { width: ${wBtn}px; min-width: ${wBtn}px; justify-content: center; }

    .empty { padding: 14px; color: rgba(0,0,0,0.65); }
  `

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

  const tabLabel = (i: number, useDsJsItem: any) => {
    const tabs = asJs(cfg.filterTabs) || []
    const id = String(useDsJsItem?.dataSourceId || '')
    const found = (tabs || []).find((t: any) => String(t?.dataSourceId || '') === id)
    const label = found?.label ?? tabs?.[i]?.label
    if (label && String(label).trim()) return String(label)
    return getDsLabel(useDsJsItem, `Filtro ${i + 1}`)
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

  if (!activeUseDsImm) {
    return <div css={styles} className='empty'>{txt(cfg.errorNoDs || 'Configura la fonte dati del widget.')}</div>
  }

  const fieldPratica = txt(cfg.fieldPratica || 'objectid')
  const fieldDataRil = txt(cfg.fieldDataRilevazione || 'data_rilevazione')
  const fieldUfficio = txt(cfg.fieldUfficio || 'ufficio_zona')
  const fieldStato = txt(cfg.fieldStatoPresa || 'presa_in_carico_DIR_AGR')
  const fieldDtPresa = txt(cfg.fieldDataPresa || 'dt_presa_in_carico_DIR_AGR')

  const labelDaPrendere = txt(cfg.labelDaPrendere || 'Da prendere in carico')
  const labelPresa = txt(cfg.labelPresa || 'Presa in carico')

  const daPrendere = num(cfg.valoreDaPrendere, 1)
  const presa = num(cfg.valorePresa, 2)

  const btnOn = txt(cfg.labelBtnTakeAttivo || 'Prendi in carico')
  const btnOff = txt(cfg.labelBtnTakeDisattivo || 'Già in carico')

  const Header = (p: { label: string, field?: string, first?: boolean }) => {
    if (!p.field) {
      return <div className={`headerCell ${p.first ? 'first' : ''}`}>{p.label}</div>
    }

    const si = getSortInfo(p.field)
    const isSorted = si.idx >= 0
    const pri = si.idx + 1
    const dir = si.dir

    const badge = isSorted
      ? (
        <span className='sortBadge' title={`Ordinamento #${pri} (${dir})`}>
          <span className='sortPri'>{pri}</span>
          <span aria-hidden>{dir === 'ASC' ? '↑' : '↓'}</span>
        </span>
        )
      : <span className='sortBadge' style={{ opacity: 0.35 }} aria-hidden>↕</span>

    return (
      <div className={`headerCell ${p.first ? 'first' : ''}`}>
        <button
          type='button'
          className='hdrBtn'
          onClick={(e) => toggleSort(p.field!, (e as any).shiftKey === true)}
          title='Click: ordina. Shift+Click: ordinamento multiplo.'
        >
          <span>{p.label}</span>
          {badge}
        </button>
      </div>
    )
  }

  return (
    <div css={styles}>
      {hasTabs && (
        <div className='tabBar'>
          {useDsJs.map((u, i) => (
            <button
              key={u?.dataSourceId || i}
              type='button'
              className={`tabBtn ${i === activeTab ? 'active' : ''}`}
              onClick={() => {
                // Sgancia la selezione dal data source corrente prima di cambiare tab
                if (dsRefForClear.current) {
                  tryClearSelection(dsRefForClear.current)
                }
                
                // Rimuovi la selezione locale per il data source corrente
                const currentDsId = String(activeUseDsJs?.dataSourceId || 'ds')
                setLocalSelectedByDs(prev => {
                  const updated = { ...prev }
                  delete updated[currentDsId]
                  return updated
                })
                
                setActiveTab(i)
                setMsg(null)
              }}
              title={getDsLabel(u, `Filtro ${i + 1}`)}
            >
              {tabLabel(i, u)}
            </button>
          ))}
        </div>
      )}

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
          <DataSourceComponent
            key={activeUseDsJs?.dataSourceId || activeTab}
            useDataSource={activeUseDsImm}
            query={dsQuery}
            widgetId={props.id}
          >
            {(ds: DataSource, info) => {
              // Salva il riferimento al data source per sganciare la selezione al cambio tab
              dsRefForClear.current = ds
              const status = info?.status ?? ds.getStatus?.() ?? DataSourceStatus.NotReady
              const isLoading = status === DataSourceStatus.Loading

              const recsRaw = (ds.getRecords?.() ?? []) as DataRecord[]
              const recs = sortRecords(recsRaw, sortState)

              const selected = (ds.getSelectedRecords?.() ?? []) as DataRecord[]
              const selId = selected?.[0]?.getId?.()

              const dsId = String(activeUseDsJs?.dataSourceId || 'ds')
              const localSel = localSelectedByDs[dsId]
              const selectedId = (selId && String(selId)) || localSel || ''

              if (isLoading) return <Loading />
              if (!recs || recs.length === 0) return <div className='empty'>{txt(cfg.emptyMessage || 'Nessun record trovato.')}</div>

              return (
                <>
                  {cfg.showHeader !== false && (
                    <div className='headerWrap'>
                      <div className='gridHeader'>
                        <Header first label={txt(cfg.headerPratica || 'N. pratica')} field={fieldPratica} />
                        <Header label={txt(cfg.headerData || 'Data rilevazione')} field={fieldDataRil} />
                        <Header label={txt(cfg.headerUfficio || 'Ufficio')} field={fieldUfficio} />
                        <Header label={txt(cfg.headerStato || 'Stato pratica')} field={fieldStato} />
                        <Header label={txt(cfg.headerDtPresa || 'Dt. presa')} field={fieldDtPresa} />

                        <div className='headerCell'>
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
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className='list'>
                    {recs.map((r, idx) => {
                      const d = r.getData?.() || {}
                      const oid = Number(d.OBJECTID)
                      const rid = String(r.getId?.() ?? oid)

                      const pratica = txt(d[fieldPratica])
                      const dataRil = formatDateIt(d[fieldDataRil])
                      const ufficio = txt(d[fieldUfficio])

                      const statoRaw = d[fieldStato]
                      const statoNum = Number(statoRaw)
                      const statoLabel =
                        statoNum === num(cfg.valoreDaPrendere, 1) ? txt(cfg.labelDaPrendere || 'Da prendere in carico')
                          : statoNum === num(cfg.valorePresa, 2) ? txt(cfg.labelPresa || 'Presa in carico')
                            : txt(statoRaw)

                      const dtPresa = formatDateIt(d[fieldDtPresa])

                      const isSel = selectedId && rid === selectedId
                      const even = idx % 2 === 0
                      const canTake = Number.isFinite(statoNum) && statoNum === daPrendere

                      return (
                        <div
                          key={rid}
                          className={`rowCard ${even ? 'even' : 'odd'} ${isSel ? 'selected' : ''}`}
                          onClick={() => {
                            // Se il record è già selezionato, deselezionalo
                            if (isSel) {
                              setLocalSelectedByDs(prev => {
                                const updated = { ...prev }
                                delete updated[dsId]
                                return updated
                              })
                              tryClearSelection(ds as any)
                            } else {
                              // Altrimenti selezionalo
                              setLocalSelectedByDs(prev => ({ ...prev, [dsId]: rid }))
                              trySelectRecord(ds as any, r, rid)
                            }
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
                              onClick={async (e) => {
                                e.stopPropagation()

                                if (!Number.isFinite(oid)) {
                                  setMsg({ kind: 'error', text: 'OBJECTID non valido.' })
                                  return
                                }

                                setMsg(null)
                                setLocalSelectedByDs(prev => ({ ...prev, [dsId]: rid }))
                                trySelectRecord(ds as any, r, rid)

                                const confirmText = txt(cfg.confirmMessage || 'Vuoi prendere in carico questa pratica?')
                                const ok = window.confirm(confirmText)
                                if (!ok) return

                                await doTake(ds, oid)
                              }}
                            >
                              {canTake ? btnOn : btnOff}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            }}
          </DataSourceComponent>
        </div>
      </div>
    </div>
  )
}

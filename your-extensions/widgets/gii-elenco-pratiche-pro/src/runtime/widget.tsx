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

import { Button, Loading } from 'jimu-ui'
import type { AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'

type Props = AllWidgetProps<IMConfig>

type SortDir = 'ASC' | 'DESC'
type SortItem = { field: string, dir: SortDir }

// Campi virtuali (ordinamento su campi calcolati)
const V_STATO = '__stato_sint__'
const V_ULTIMO = '__ultimo_agg__'
const V_PROSSIMA = '__prossima__'

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

function parseToMs (v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime()
  const s = String(v)
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
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

function compareValues (a: any, b: any): number {
  const aNull = (a === null || a === undefined || a === '')
  const bNull = (b === null || b === undefined || b === '')
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b

  const aStr = String(a)
  const bStr = String(b)

  // date?
  const aDate = Date.parse(aStr)
  const bDate = Date.parse(bStr)
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate

  return aStr.localeCompare(bStr, 'it', { numeric: true, sensitivity: 'base' })
}

function sortSig (s: SortItem[]): string {
  return (s || []).map(x => `${x.field}:${x.dir}`).join('|')
}

export default function Widget (props: Props) {
  const cfg: any = (props.config ?? defaultConfig) as any

  const useDsImm: any = props.useDataSources ?? Immutable([])
  const useDsJs: any[] = asJs(useDsImm)

  // Tabs: se hai più data view/DS, le tratto come filtri/tabs
  const hasTabs = useDsJs.length > 1

  const [activeTab, setActiveTab] = React.useState<number>(0)
  const [localSelectedByDs, setLocalSelectedByDs] = React.useState<Record<string, string>>({})
  const dsRefForClear = React.useRef<any>(null)

  // Sort: array (multi sort con Shift+Click)
  const defaultSort: SortItem[] = React.useMemo(() => {
    const f = txt(cfg.orderByField || 'objectid')
    const d = (txt(cfg.orderByDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as SortDir
    return [{ field: f, dir: d }]
  }, [cfg.orderByField, cfg.orderByDir])

  const [sortState, setSortState] = React.useState<SortItem[]>(defaultSort)

  // Se cambia il sort default da settings, riallineo SOLO se l'utente non ha un custom sort
  React.useEffect(() => {
    const isCustom = sortSig(sortState) !== sortSig(defaultSort)
    if (!isCustom) setSortState(defaultSort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortSig(defaultSort)])

  const activeUseDsJs = useDsJs[activeTab] || useDsJs[0]
  // props.useDataSources è un ImmutableArray, ma in TypeScript è tipizzato come array:
  // usare l'indicizzazione ([]) invece di .get() che non esiste su ImmutableArray<T>.
  const udsAny = (props.useDataSources as any) as any[] | undefined
  const activeUseDsImm = udsAny?.[activeTab] ?? udsAny?.[0]

  const whereClause = txt(cfg.whereClause || '1=1')
  const pageSize = num(cfg.pageSize, 200)

  // Query (semplice)
  const dsQuery: any = React.useMemo(() => ({
    where: whereClause,
    pageSize
  }), [whereClause, pageSize])

  // Campi base
  const fieldPratica = txt(cfg.fieldPratica || 'objectid')
  const fieldDataRil = txt(cfg.fieldDataRilevazione || 'data_rilevazione')
  const fieldUfficio = txt(cfg.fieldUfficio || 'ufficio_zona')

  // Campi DT/DA (per calcolo stato/ultimo/prossima)
  const fPresaDT = txt(cfg.fieldPresaDT || 'presa_in_carico_DT')
  const fDtPresaDT = txt(cfg.fieldDtPresaDT || 'dt_presa_in_carico_DT')
  const fStatoDT = txt(cfg.fieldStatoDT || 'stato_DT')
  const fDtStatoDT = txt(cfg.fieldDtStatoDT || 'dt_stato_DT')
  const fEsitoDT = txt(cfg.fieldEsitoDT || 'esito_DT')
  const fDtEsitoDT = txt(cfg.fieldDtEsitoDT || 'dt_esito_DT')

  const fPresaDA = txt(cfg.fieldPresaDA || 'presa_in_carico_DA')
  const fDtPresaDA = txt(cfg.fieldDtPresaDA || 'dt_presa_in_carico_DA')
  const fStatoDA = txt(cfg.fieldStatoDA || 'stato_DA')
  const fDtStatoDA = txt(cfg.fieldDtStatoDA || 'dt_stato_DA')
  const fEsitoDA = txt(cfg.fieldEsitoDA || 'esito_DA')
  const fDtEsitoDA = txt(cfg.fieldDtEsitoDA || 'dt_esito_DA')

  const presaDaPrendere = num(cfg.presaDaPrendereVal, 1)
  const presaPresa = num(cfg.presaPresaVal, 2)

  const statoDaPrendere = num(cfg.statoDaPrendereVal, 1)
  const statoPresa = num(cfg.statoPresaVal, 2)
  const statoIntegrazione = num(cfg.statoIntegrazioneVal, 3)
  const statoApprovata = num(cfg.statoApprovataVal, 4)
  const statoRespinta = num(cfg.statoRespintaVal, 5)

  const esitoIntegrazione = num(cfg.esitoIntegrazioneVal, 1)
  const esitoApprovata = num(cfg.esitoApprovataVal, 2)
  const esitoRespinta = num(cfg.esitoRespintaVal, 3)

  const labelStato = (v: any): string => {
    const n = Number(v)
    if (!Number.isFinite(n)) return txt(v)
    if (n === statoDaPrendere) return txt(cfg.labelStatoDaPrendere || 'Da prendere')
    if (n === statoPresa) return txt(cfg.labelStatoPresa || 'Presa in carico')
    if (n === statoIntegrazione) return txt(cfg.labelStatoIntegrazione || 'Integrazione richiesta')
    if (n === statoApprovata) return txt(cfg.labelStatoApprovata || 'Approvata')
    if (n === statoRespinta) return txt(cfg.labelStatoRespinta || 'Respinta')
    return String(n)
  }

  const labelEsito = (v: any): string => {
    const n = Number(v)
    if (!Number.isFinite(n)) return txt(v)
    if (n === esitoIntegrazione) return txt(cfg.labelEsitoIntegrazione || 'Integrazione richiesta')
    if (n === esitoApprovata) return txt(cfg.labelEsitoApprovata || 'Approvata')
    if (n === esitoRespinta) return txt(cfg.labelEsitoRespinta || 'Respinta')
    return String(n)
  }

  const getChipStyle = (statoNum: number | null) => {
    // sintetico: coloriamo in base a 1/2, altrimenti neutro
    if (statoNum === statoDaPrendere) {
      return {
        background: txt(cfg.statoBgDaPrendere || '#fff7e6'),
        color: txt(cfg.statoTextDaPrendere || '#7a4b00'),
        borderColor: txt(cfg.statoBorderDaPrendere || '#ffd18a')
      }
    }
    if (statoNum === statoPresa) {
      return {
        background: txt(cfg.statoBgPresa || '#eaf7ef'),
        color: txt(cfg.statoTextPresa || '#1f6b3a'),
        borderColor: txt(cfg.statoBorderPresa || '#9ad2ae')
      }
    }
    return {
      background: txt(cfg.statoBgAltro || '#f2f2f2'),
      color: txt(cfg.statoTextAltro || '#333333'),
      borderColor: txt(cfg.statoBorderAltro || '#d0d0d0')
    }
  }

  const computeSintetico = (d: any): { ruolo: 'DA' | 'DT', label: string, statoForChip: number | null } => {
    const hasDA = d[fPresaDA] !== null && d[fPresaDA] !== undefined && d[fPresaDA] !== ''
      || d[fStatoDA] !== null && d[fStatoDA] !== undefined && d[fStatoDA] !== ''
      || d[fEsitoDA] !== null && d[fEsitoDA] !== undefined && d[fEsitoDA] !== ''

    const ruolo: 'DA' | 'DT' = hasDA ? 'DA' : 'DT'

    const stato = Number(hasDA ? d[fStatoDA] : d[fStatoDT])
    const esito = Number(hasDA ? d[fEsitoDA] : d[fEsitoDT])

    // Priorità: esito se valorizzato, altrimenti stato, altrimenti presa
    if (Number.isFinite(esito)) {
      // chip: se esito=app/resp/integ, usiamo "altro" (3/4/5) ma per colore neutro ok
      return { ruolo, label: labelEsito(esito), statoForChip: statoNumFromEsito(esito) }
    }
    if (Number.isFinite(stato)) {
      return { ruolo, label: labelStato(stato), statoForChip: stato }
    }

    const presa = Number(hasDA ? d[fPresaDA] : d[fPresaDT])
    if (Number.isFinite(presa)) {
      if (presa === presaDaPrendere) return { ruolo, label: txt(cfg.labelPresaDaPrendere || 'Da prendere in carico'), statoForChip: statoDaPrendere }
      if (presa === presaPresa) return { ruolo, label: txt(cfg.labelPresaPresa || 'Presa in carico'), statoForChip: statoPresa }
      return { ruolo, label: String(presa), statoForChip: null }
    }

    return { ruolo, label: '—', statoForChip: null }
  }

  // converte esito (1..3) in "stato visuale" per chip (3/4/5)
  const statoNumFromEsito = (esito: number): number => {
    if (esito === esitoIntegrazione) return statoIntegrazione
    if (esito === esitoApprovata) return statoApprovata
    if (esito === esitoRespinta) return statoRespinta
    return statoApprovata
  }

  const computeUltimoAggMs = (d: any): number | null => {
    const candidates = [
      parseToMs(d[fDtPresaDT]),
      parseToMs(d[fDtStatoDT]),
      parseToMs(d[fDtEsitoDT]),
      parseToMs(d[fDtPresaDA]),
      parseToMs(d[fDtStatoDA]),
      parseToMs(d[fDtEsitoDA])
    ].filter(v => v !== null) as number[]
    if (!candidates || candidates.length === 0) return null
    return Math.max(...candidates)
  }

  const computeProssima = (d: any, ruolo: 'DA' | 'DT'): string => {
    const presa = Number(ruolo === 'DA' ? d[fPresaDA] : d[fPresaDT])
    const stato = Number(ruolo === 'DA' ? d[fStatoDA] : d[fStatoDT])
    const esito = Number(ruolo === 'DA' ? d[fEsitoDA] : d[fEsitoDT])

    const tag = ruolo

    // 1) presa in carico
    if (Number.isFinite(presa) && presa === presaDaPrendere) return `Prendere in carico (${tag})`

    // 2) integrazione
    if (Number.isFinite(stato) && stato === statoIntegrazione) return `Gestire integrazione (${tag})`
    if (Number.isFinite(esito) && esito === esitoIntegrazione) return `Gestire integrazione (${tag})`

    // 3) respinta
    if (Number.isFinite(stato) && stato === statoRespinta) return `Verificare respinta (${tag})`
    if (Number.isFinite(esito) && esito === esitoRespinta) return `Verificare respinta (${tag})`

    // 4) approvata
    if (Number.isFinite(stato) && stato === statoApprovata) return `Approvata (${tag})`
    if (Number.isFinite(esito) && esito === esitoApprovata) return `Approvata (${tag})`

    // 5) in carico / da valutare
    if (Number.isFinite(stato) && stato === statoPresa) return `Valutare esito (${tag})`
    if (Number.isFinite(presa) && presa === presaPresa) return `Valutare esito (${tag})`

    // fallback
    return `Verificare stato (${tag})`
  }

  const getSortValue = (r: DataRecord, field: string): any => {
    const d = r.getData?.() || {}
    if (field === V_STATO) {
      const s = computeSintetico(d)
      return s.label
    }
    if (field === V_ULTIMO) return computeUltimoAggMs(d)
    if (field === V_PROSSIMA) {
      const s = computeSintetico(d)
      return computeProssima(d, s.ruolo)
    }
    return d[field]
  }

  const sortRecords = (recs: DataRecord[], sort: SortItem[]): DataRecord[] => {
    if (!sort || sort.length === 0) return recs
    const copy = [...recs]
    copy.sort((ra, rb) => {
      for (const s of sort) {
        const a = getSortValue(ra, s.field)
        const b = getSortValue(rb, s.field)
        const cmp = compareValues(a, b)
        if (cmp !== 0) return (s.dir === 'ASC' ? cmp : -cmp)
      }
      return 0
    })
    return copy
  }

  const toggleSort = (field: string, multi: boolean) => {
    setSortState(prev => {
      const p = [...prev]
      const idx = p.findIndex(x => x.field === field)
      if (idx >= 0) {
        const cur = p[idx]
        const nextDir: SortDir = cur.dir === 'ASC' ? 'DESC' : 'ASC'
        p[idx] = { field, dir: nextDir }
        return multi ? p : [p[idx]]
      }
      const next: SortItem = { field, dir: 'ASC' }
      return multi ? [...p, next] : [next]
    })
  }

  const isCustomSort = sortSig(sortState) !== sortSig(defaultSort)

  // layout
  const gap = num(cfg.gap, 12)
  const padFirst = num(cfg.paddingLeftFirstCol, 0)

  const wPratica = num(cfg.colWidths?.pratica, 120)
  const wData = num(cfg.colWidths?.data, 150)
  const wStato = num(cfg.colWidths?.stato, 220)
  const wUff = num(cfg.colWidths?.ufficio, 170)
  const wUlt = num(cfg.colWidths?.ultimo, 170)
  const wPross = num(cfg.colWidths?.prossima, 240)

  const gridCols = `${wPratica}px ${wData}px ${wStato}px ${wUff}px ${wUlt}px ${wPross}px`
  const minWidth = wPratica + wData + wStato + wUff + wUlt + wPross + (gap * 5) + 24

  const rowGap = num(cfg.rowGap, 8)
  const rowPaddingX = num(cfg.rowPaddingX, 12)
  const rowPaddingY = num(cfg.rowPaddingY, 10)
  const rowMinHeight = num(cfg.rowMinHeight, 44)
  const rowRadius = num(cfg.rowRadius, 12)
  const rowBorderWidth = num(cfg.rowBorderWidth, 1)
  const rowBorderColor = txt(cfg.rowBorderColor || 'rgba(0,0,0,0.08)')

  const chipRadius = num(cfg.statoChipRadius, 999)
  const chipPadX = num(cfg.statoChipPadX, 10)
  const chipPadY = num(cfg.statoChipPadY, 4)
  const chipBorderW = num(cfg.statoChipBorderW, 1)
  const chipFontWeight = num(cfg.statoChipFontWeight, 600)
  const chipFontSize = num(cfg.statoChipFontSize, 12)
  const chipFontStyle = (cfg.statoChipFontStyle === 'italic' ? 'italic' : 'normal') as any
  const chipTextTransform = (['none', 'uppercase', 'lowercase', 'capitalize'].includes(cfg.statoChipTextTransform) ? cfg.statoChipTextTransform : 'none') as any
  const chipLetterSpacing = num(cfg.statoChipLetterSpacing, 0)

  const styles = css`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;

    .tabBar {
      display: ${hasTabs ? 'flex' : 'none'};
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      background: var(--bs-body-bg, #fff);
    }
    .tabBtn {
      border: 1px solid rgba(0,0,0,0.12);
      background: rgba(0,0,0,0.02);
      color: #111827;
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      white-space: nowrap;
    }
    .tabBtn.active {
      background: #eaf2ff;
      border-color: #2f6fed;
      color: #1d4ed8;
    }

    .viewport { flex: 1; min-height: 0; overflow: auto; }
    .content { min-width: ${minWidth}px; padding: 0 12px 10px; }

    .headerWrap {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bs-body-bg, #fff);
      border-bottom: 1px solid rgba(0,0,0,0.08);
      padding: 6px 12px;
      margin: 0 0 8px 0;
    }

    .gridHeader {
      display: grid;
      grid-template-columns: ${gridCols};
      column-gap: ${gap}px;
      align-items: center;
      min-height: 28px;
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

    .empty { padding: 14px; color: rgba(0,0,0,0.65); }
  `

  const tabLabel = (i: number, u: any): string => {
    const labelFromCfg = (cfg.filterTabs || [])?.find((x: any) => String(x?.dataSourceId || '') === String(u?.dataSourceId || ''))?.label
    const fromDs = getDsLabel(u, `Filtro ${i + 1}`)
    return txt(labelFromCfg || fromDs || `Filtro ${i + 1}`)
  }

  const Header = (p: { label: string, field: string, first?: boolean }) => {
    const idx = sortState.findIndex(x => x.field === p.field)
    const item = idx >= 0 ? sortState[idx] : null
    const dir = item?.dir

    const badge = item
      ? (
        <span className='sortBadge' aria-hidden>
          <span className='sortPri'>{idx + 1}</span>
          <span>{dir === 'ASC' ? '↑' : '↓'}</span>
        </span>
        )
      : <span className='sortBadge' style={{ opacity: 0.35 }} aria-hidden>↕</span>

    return (
      <div className={`headerCell ${p.first ? 'first' : ''}`}>
        <button
          type='button'
          className='hdrBtn'
          onClick={(e) => toggleSort(p.field, (e as any).shiftKey === true)}
          title='Click: ordina. Shift+Click: ordinamento multiplo.'
        >
          <span>{p.label}</span>
          {badge}
        </button>
      </div>
    )
  }

  const maskOuterOffset = Number.isFinite(Number(cfg.maskOuterOffset)) ? Number(cfg.maskOuterOffset) : 12
  const maskInnerPadding = Number.isFinite(Number(cfg.maskInnerPadding)) ? Number(cfg.maskInnerPadding) : 8
  const maskBg = String(cfg.maskBg ?? '#ffffff')
  const maskBorderColor = String(cfg.maskBorderColor ?? 'rgba(0,0,0,0.12)')
  const maskBorderWidth = Number.isFinite(Number(cfg.maskBorderWidth)) ? Number(cfg.maskBorderWidth) : 1
  const maskRadius = Number.isFinite(Number(cfg.maskRadius)) ? Number(cfg.maskRadius) : 12

  if (!activeUseDsImm) {
    return <div style={{ padding: 12 }}>{txt(cfg.errorNoDs || 'Configura la fonte dati del widget.')}</div>
  }

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: maskOuterOffset }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          border: `${maskBorderWidth}px solid ${maskBorderColor}`,
          borderRadius: maskRadius,
          background: maskBg,
          padding: maskInnerPadding,
          overflow: 'hidden'
        }}
      >
        <div css={styles} style={{ width: '100%', height: '100%' }}>
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
                  }}
                  title={getDsLabel(u, `Filtro ${i + 1}`)}
                >
                  {tabLabel(i, u)}
                </button>
              ))}
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
                  // Salva riferimento per clear selection su cambio tab
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
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
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

                          <div className='gridHeader'>
                            <Header first label={txt(cfg.headerPratica || 'N. pratica')} field={fieldPratica} />
                            <Header label={txt(cfg.headerData || 'Data rilev.')} field={fieldDataRil} />
                            <Header label={txt(cfg.headerStato || 'Stato sintetico')} field={V_STATO} />
                            <Header label={txt(cfg.headerUfficio || 'Ufficio')} field={fieldUfficio} />
                            <Header label={txt(cfg.headerUltimoAgg || 'Ultimo agg.')} field={V_ULTIMO} />
                            <Header label={txt(cfg.headerProssima || 'Prossima azione')} field={V_PROSSIMA} />
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

                          const sintetico = computeSintetico(d)
                          const statoLabel = txt(sintetico.label)
                          const statoChipNum = sintetico.statoForChip

                          const ultimoMs = computeUltimoAggMs(d)
                          const ultimo = ultimoMs ? formatDateIt(ultimoMs) : '—'

                          const prossima = computeProssima(d, sintetico.ruolo)

                          const isSel = selectedId && rid === selectedId
                          const even = idx % 2 === 0

                          return (
                            <div
                              key={rid}
                              className={`rowCard ${even ? 'even' : 'odd'} ${isSel ? 'selected' : ''}`}
                              onClick={() => {
                                if (isSel) {
                                  setLocalSelectedByDs(prev => {
                                    const updated = { ...prev }
                                    delete updated[dsId]
                                    return updated
                                  })
                                  tryClearSelection(ds as any)
                                } else {
                                  setLocalSelectedByDs(prev => ({ ...prev, [dsId]: rid }))
                                  trySelectRecord(ds as any, r, rid)
                                }
                              }}
                            >
                              <div className='cell first' title={pratica}>{pratica}</div>
                              <div className='cell' title={dataRil}>{dataRil}</div>

                              <div className='cell' title={statoLabel}>
                                <span className='chip' style={getChipStyle(Number.isFinite(Number(statoChipNum)) ? Number(statoChipNum) : null)}>
                                  {statoLabel}
                                </span>
                              </div>

                              <div className='cell' title={ufficio}>{ufficio}</div>
                              <div className='cell' title={ultimo}>{ultimo}</div>
                              <div className='cell' title={prossima}>{prossima}</div>
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
      </div>
    </div>
  )
}

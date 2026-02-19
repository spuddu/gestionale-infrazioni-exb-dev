/** @jsx jsx */
import { React, AllWidgetProps, jsx, DataSourceManager, IMDataSourceInfo } from 'jimu-core'
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis'
import FeatureLayer from 'esri/layers/FeatureLayer'
import Graphic from 'esri/Graphic'

interface State {
  practiceRecords: any[]
  isLoading: boolean
  giiUserRole: any
  activeRoleTab: string
  activeDataSourceTab: string | null
}

export default class Widget extends React.PureComponent<AllWidgetProps<any>, State> {
  private dataSourceManager: DataSourceManager
  private mapView: JimuMapView = null
  private userRoleCheckInterval: any = null

  constructor(props) {
    super(props)
    this.dataSourceManager = DataSourceManager.getInstance()
    this.state = {
      practiceRecords: [],
      isLoading: true,
      giiUserRole: null,
      activeRoleTab: 'tutte',
      activeDataSourceTab: null
    }
  }

  async componentDidMount() {
    this.startUserRoleCheck()
    await this.loadAllPractices()
  }

  componentWillUnmount() {
    if (this.userRoleCheckInterval) {
      clearInterval(this.userRoleCheckInterval)
    }
  }

  componentDidUpdate(prevProps: any, prevState: State) {
    if (this.state.giiUserRole && !prevState.giiUserRole) {
      this.loadAllPractices()
    }
  }

  startUserRoleCheck = () => {
    const checkRole = () => {
      const roleFromWindow = (window as any).__giiUserRole
      if (roleFromWindow && JSON.stringify(roleFromWindow) !== JSON.stringify(this.state.giiUserRole)) {
        console.log('📋 Elenco: rilevato ruolo da window:', roleFromWindow)
        this.setState({ giiUserRole: roleFromWindow })
      }
    }
    checkRole()
    this.userRoleCheckInterval = setInterval(checkRole, 2000)
  }

  getDataSourceForRole = (): string | null => {
    const { giiUserRole } = this.state
    if (!giiUserRole) return null

    const ruolo = giiUserRole.ruolo
    const settore = giiUserRole.settore
    const area = giiUserRole.area

    // RZ (1), TI (2), DT (3) → usa vista del settore
    if (ruolo >= 1 && ruolo <= 3) {
      if (area === 1) {
        // AGR
        if (settore === 1) return 'dataSource_39' // D1
        if (settore === 2) return 'dataSource_38' // D2
        if (settore === 3) return 'dataSource_37' // D3
        if (settore === 4) return 'dataSource_36' // D4
        if (settore === 5) return 'dataSource_35' // D5
        if (settore === 6) return 'dataSource_34' // D6
      } else if (area === 2) {
        // TEC
        return 'dataSource_33' // TEC_DS
      }
    }

    // RI AGR (4), DIR AGR (5)
    if (ruolo === 4 || ruolo === 5) {
      return 'dataSource_41' // GII_VIEW_EB_AGR
    }

    // RI TEC (6), DIR TEC (7)
    if (ruolo === 6 || ruolo === 7) {
      return 'dataSource_40' // GII_VIEW_EB_TEC
    }

    // AMM (8)
    if (ruolo === 8) {
      return 'dataSource_32' // GII_VIEW_EB_AMM_ALL
    }

    // ADMIN (99)
    if (ruolo === 99) {
      return 'dataSource_31' // GII_VIEW_EB_ADMIN
    }

    return null
  }

  loadAllPractices = async () => {
    this.setState({ isLoading: true })
    const { useDataSources } = this.props

    if (!useDataSources || useDataSources.length === 0) {
      console.warn('⚠️ Nessun data source configurato')
      this.setState({ isLoading: false })
      return
    }

    const allRecords = []
    const targetDsId = this.getDataSourceForRole()

    if (targetDsId) {
      const uds = useDataSources.find(u => u.dataSourceId === targetDsId)
      
      if (uds) {
        const ds = this.dataSourceManager.getDataSource(uds.dataSourceId)
        if (ds) {
          try {
            console.log(`📊 Carico pratiche da: ${targetDsId}`)
            const queryResult = await (ds as any).query({
              where: '1=1',
              outFields: ['*'],
              returnGeometry: false,
              num: 1000
            })
            if (queryResult?.records) {
              allRecords.push(...queryResult.records.map(r => ({
                ...r.feature.attributes,
                _dataSourceId: uds.dataSourceId,
                _dataSourceLabel: targetDsId
              })))
            }
          } catch (err) {
            console.error(`❌ Errore caricamento ${uds.dataSourceId}:`, err)
          }
        } else {
          console.warn(`⚠️ Datasource ${targetDsId} non trovato`)
        }
      } else {
        console.warn(`⚠️ Datasource ${targetDsId} non configurato nell'app`)
      }
    } else {
      console.warn('⚠️ Ruolo non rilevato o non valido')
    }

    console.log(`✅ Caricate ${allRecords.length} pratiche`)
    this.setState({
      practiceRecords: allRecords,
      isLoading: false
    })
  }

  handlePracticeClick = (practice: any) => {
    const { config } = this.props
    if (config?.linkedWidgetId && practice.OBJECTID) {
      const msgAction = {
        type: 'PRACTICE_SELECTED',
        practiceId: practice.OBJECTID,
        practiceData: practice
      }
      console.log('📤 Pubblicato:', msgAction)
    }

    if (this.mapView && practice.Latitudine && practice.Longitudine) {
      this.mapView.view.goTo({
        center: [practice.Longitudine, practice.Latitudine],
        zoom: 16
      })

      const layer = this.mapView.view.map.layers.find(l => l.id === practice._dataSourceId) as FeatureLayer
      if (layer) {
        const graphic = new Graphic({
          geometry: {
            type: 'point',
            longitude: practice.Longitudine,
            latitude: practice.Latitudine
          } as any
        })
        this.mapView.view.whenLayerView(layer).then(layerView => {
          this.mapView.view.popup.open({
            features: [graphic],
            location: graphic.geometry as any
          })
        })
      }
    }
  }

  onActiveViewChange = (jmv: JimuMapView) => {
    if (jmv) {
      this.mapView = jmv
    }
  }

  getFilteredRecords = () => {
    const { practiceRecords, activeRoleTab, giiUserRole } = this.state
    const config = this.props.config || {}
    const statoRuoloField = config.statoRuoloField

    let filtered = [...practiceRecords]

    const hasTabs = giiUserRole && statoRuoloField
    if (hasTabs) {
      const ruoloLabel = giiUserRole.ruoloLabel
      const statoField = `stato_${ruoloLabel}`

      if (activeRoleTab === 'attesa_mia') {
        filtered = filtered.filter(p => {
          const n = p[statoField]
          return n === 0 || n === 1 || n === 3
        })
      } else if (activeRoleTab === 'attesa_altri') {
        filtered = filtered.filter(p => {
          const n = p[statoField]
          return n === 2 || n === 4
        })
      }
    }

    return filtered
  }

  sortRecords = (records: any[]) => {
    const { giiUserRole } = this.state
    const config = this.props.config || {}
    const statoRuoloField = config.statoRuoloField

    if (!giiUserRole || !statoRuoloField) return records

    const ruoloLabel = giiUserRole.ruoloLabel
    const statoField = `stato_${ruoloLabel}`

    return records.slice().sort((a, b) => {
      const aStato = a[statoField] ?? 999
      const bStato = b[statoField] ?? 999

      const aInAttesa = aStato === 0 || aStato === 1 || aStato === 3
      const bInAttesa = bStato === 0 || bStato === 1 || bStato === 3

      if (aInAttesa && !bInAttesa) return -1
      if (!aInAttesa && bInAttesa) return 1

      const aDate = a.Data_rilevazione ? new Date(a.Data_rilevazione).getTime() : 0
      const bDate = b.Data_rilevazione ? new Date(b.Data_rilevazione).getTime() : 0
      return bDate - aDate
    })
  }

  render() {
    const { config, useMapWidgetIds } = this.props
    const { isLoading, practiceRecords, giiUserRole, activeRoleTab } = this.state

    const hasTabs = giiUserRole && config?.statoRuoloField
    const filteredRecords = this.getFilteredRecords()
    const sortedRecords = this.sortRecords(filteredRecords)

    return (
      <div className="widget-elenco-pratiche-pro">
        <div className="elenco-header">
          <h3>Elenco rapporti di rilevazione</h3>
          <div className="counters">
            <div className="counter">
              <span>Totali:</span>
              <strong>{practiceRecords.length}</strong>
            </div>
          </div>
        </div>

        {hasTabs && (
          <div className="role-tabs">
            <button
              className={activeRoleTab === 'tutte' ? 'active' : ''}
              onClick={() => this.setState({ activeRoleTab: 'tutte' })}
            >
              👤 {giiUserRole.ruoloLabel}
            </button>
            <button
              className={activeRoleTab === 'tutte' ? 'active' : ''}
              onClick={() => this.setState({ activeRoleTab: 'tutte' })}
            >
              Tutte le pratiche {practiceRecords.length}
            </button>
            <button
              className={activeRoleTab === 'attesa_mia' ? 'active' : ''}
              onClick={() => this.setState({ activeRoleTab: 'attesa_mia' })}
            >
              In attesa mia
            </button>
            <button
              className={activeRoleTab === 'attesa_altri' ? 'active' : ''}
              onClick={() => this.setState({ activeRoleTab: 'attesa_altri' })}
            >
              In attesa altri
            </button>
          </div>
        )}

        <div className="practices-list">
          {isLoading && <div className="loading">Caricamento pratiche...</div>}
          {!isLoading && sortedRecords.length === 0 && (
            <div className="no-data">Nessuna pratica trovata</div>
          )}
          {!isLoading && sortedRecords.map((practice, idx) => (
            <div key={idx} className="practice-item" onClick={() => this.handlePracticeClick(practice)}>
              <div className="practice-header">
                <span className="practice-number">{practice.N_pratica || '—'}</span>
                <span className="practice-date">{practice.Data_rilevazione || '—'}</span>
                <span className="practice-status">{practice.Stato_sintetico || 'Non definito'}</span>
              </div>
              <div className="practice-details">
                <span>Ufficio: {practice.Ufficio || '—'}</span>
                <span>Ultimo agg: {practice.Ultimo_agg || '—'}</span>
              </div>
            </div>
          ))}
        </div>

        {useMapWidgetIds && useMapWidgetIds.length > 0 && (
          <JimuMapViewComponent
            useMapWidgetId={useMapWidgetIds[0]}
            onActiveViewChange={this.onActiveViewChange}
          />
        )}
      </div>
    )
  }
}
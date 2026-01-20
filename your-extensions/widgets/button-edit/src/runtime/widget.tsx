import { React, ReactRedux, type AllWidgetProps } from 'jimu-core'
import { Button } from 'jimu-ui'

// ID del widget "Modifica"
const EDIT_WIDGET_ID = 'widget_97'

export default function Widget (props: AllWidgetProps<any>) {

  // sorgente dati collegata dal Builder
  const useDs = props.useDataSources?.[0]
  if (!useDs) {
    return <div className="p-2">Collega una sorgente dati</div>
  }

  const dsId = useDs.dataSourceId

  // selezione reale dalla tabella
  const selectedIds: string[] =
    ReactRedux.useSelector(
      (state: any) => state?.dataSourcesInfo?.[dsId]?.selectedIds
    ) || []

  const enabled = selectedIds.length > 0

  // all'avvio: nasconde il widget Modifica
  React.useEffect(() => {
    const editWidget = document.querySelector(
      `[data-widgetid="${EDIT_WIDGET_ID}"]`
    ) as HTMLElement | null

    if (editWidget) {
      editWidget.style.display = 'none'
    }
  }, [])

  const onClick = () => {
    if (!enabled) return

    // mostra il widget Modifica
    const editWidget = document.querySelector(
      `[data-widgetid="${EDIT_WIDGET_ID}"]`
    ) as HTMLElement | null

    if (editWidget) {
      editWidget.style.display = 'block'
    }

    // nasconde la tabella (prima tabella trovata)
    const tableWidget = document.querySelector(
      '.jimu-widget-table'
    )?.closest('[data-widgetid]') as HTMLElement | null

    if (tableWidget) {
      tableWidget.style.display = 'none'
    }
  }

  return (
    <div className="p-2">
      <Button
        type="primary"
        disabled={!enabled}
        onClick={onClick}
      >
        Modifica
      </Button>
    </div>
  )
}

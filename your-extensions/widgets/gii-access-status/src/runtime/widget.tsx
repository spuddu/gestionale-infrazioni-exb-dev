/** @jsx jsx */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import { defaultConfig, type Config, type IMConfig } from '../config'

type AccessGateStatus = 'checking' | 'allowed' | 'denied'
interface AccessGateState {
  status: AccessGateStatus
  message: string
}

const ACCESS_GATE_EVENT = 'gii:accessGate'
const FALLBACK_DENIED_MESSAGE = "Account non abilitato per l'accesso al gestionale."

function readAccessGateState(): AccessGateState {
  try {
    const raw = (window as any).__giiAccessGate
    if (raw?.status === 'denied') {
      return { status: 'denied', message: String(raw.message || FALLBACK_DENIED_MESSAGE) }
    }
    if (raw?.status === 'allowed') return { status: 'allowed', message: '' }
  } catch { }
  return { status: 'checking', message: '' }
}

function toPlainConfig(config: IMConfig | undefined): Config {
  const raw: any = config as any
  const mutable = raw?.asMutable ? raw.asMutable({ deep: true }) : (raw || {})
  return { ...defaultConfig, ...mutable }
}

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const [state, setState] = React.useState<AccessGateState>(() => readAccessGateState())
  const cfg = toPlainConfig(props.config)

  React.useEffect(() => {
    const sync = (event?: Event) => {
      const detail = (event as CustomEvent)?.detail
      if (detail?.status === 'denied') {
        setState({ status: 'denied', message: String(detail.message || FALLBACK_DENIED_MESSAGE) })
        return
      }
      setState(readAccessGateState())
    }

    sync()
    window.addEventListener(ACCESS_GATE_EVENT, sync as EventListener)
    return () => window.removeEventListener(ACCESS_GATE_EVENT, sync as EventListener)
  }, [])

  const denied = state.status === 'denied'
  const title = denied ? cfg.deniedTitle : cfg.checkingTitle
  const titleColor = denied ? cfg.deniedTitleColor : cfg.checkingTitleColor

  const deniedMessage = String(cfg.deniedMessage || state.message || FALLBACK_DENIED_MESSAGE)

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', alignItems: cfg.textAlign === 'left' ? 'flex-start' : cfg.textAlign === 'right' ? 'flex-end' : 'center',
      justifyContent: cfg.verticalAlign,
      textAlign: cfg.textAlign,
      pointerEvents: 'none'
    }}>
      <div style={{
        color: titleColor,
        fontFamily: cfg.titleFontFamily || 'inherit',
        fontSize: cfg.titleFontSize,
        fontWeight: cfg.titleFontWeight,
        lineHeight: cfg.titleLineHeight
      }}>
        {title}
      </div>

      {denied && cfg.showDeniedMessage && (
        <div style={{
          marginTop: cfg.messageGap,
          color: cfg.deniedMessageColor,
          fontFamily: cfg.messageFontFamily || 'inherit',
          fontSize: cfg.messageFontSize,
          fontWeight: cfg.messageFontWeight,
          lineHeight: cfg.messageLineHeight,
          maxWidth: cfg.messageMaxWidth,
          width: '100%'
        }}>
          {deniedMessage}
        </div>
      )}
    </div>
  )
}

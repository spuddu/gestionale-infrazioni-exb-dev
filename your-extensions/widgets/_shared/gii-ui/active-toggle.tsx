/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx } from 'jimu-core'

export type GiiActiveToggleProps = {
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  activeLabel?: string
  inactiveLabel?: string
  ariaLabel?: string
  title?: string
}

const TRACK_WIDTH = 34
const TRACK_HEIGHT = 18
const KNOB_SIZE = 14
const INSET = 2
const TRAVEL = TRACK_WIDTH - (INSET * 2) - KNOB_SIZE

export default function GiiActiveToggle (props: GiiActiveToggleProps) {
  const {
    checked,
    onChange,
    disabled = false,
    activeLabel = 'Attivo',
    inactiveLabel = 'Disattivato',
    ariaLabel = 'Stato attivo/disattivo',
    title
  } = props

  const stateLabel = checked ? activeLabel : inactiveLabel
  const stateColor = checked ? '#16d97f' : '#f0144f'

  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={`${ariaLabel}: ${stateLabel}`}
      title={title || stateLabel}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange?.(!checked) }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        flex: '0 0 auto',
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        padding: 0,
        margin: 0,
        border: 0,
        borderRadius: 999,
        background: stateColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.48 : 1,
        transition: 'background-color 160ms ease, opacity 160ms ease',
        verticalAlign: 'middle',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)'
      }}
    >
      <span
        aria-hidden='true'
        style={{
          position: 'absolute',
          left: INSET,
          top: INSET,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateX(${checked ? TRAVEL : 0}px)`,
          transition: 'transform 160ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.20)'
        }}
      >
        {checked ? (
          <svg width='9' height='9' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <path d='M3 8.2L6.4 11.4L13 4.8' stroke={stateColor} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        ) : (
          <svg width='9' height='9' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <path d='M4 4L12 12M12 4L4 12' stroke={stateColor} strokeWidth='2' strokeLinecap='round' />
          </svg>
        )}
      </span>
    </button>
  )
}

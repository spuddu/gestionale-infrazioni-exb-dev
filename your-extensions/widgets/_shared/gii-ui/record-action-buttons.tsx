/** @jsx jsx */
import { React, jsx } from 'jimu-core'

export type RecordActionButtonProps = {
  onClick: (event: any) => void
  disabled?: boolean
  title?: string
  ariaLabel?: string
  marginRight?: number
}

const baseStyle = (color: string, disabled: boolean, marginRight = 0): React.CSSProperties => ({
  border: 'none',
  background: 'transparent',
  color,
  cursor: disabled ? 'not-allowed' : 'pointer',
  padding: 4,
  marginRight,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: disabled ? 0.45 : 1
})

export function RecordEditButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Modifica'
  const ariaLabel = props.ariaLabel || title
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={props.onClick}
      title={title}
      aria-label={ariaLabel}
      style={baseStyle('#1F4E79', disabled, props.marginRight ?? 4)}
    >
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
      </svg>
    </button>
  )
}

export function RecordDeleteButton (props: RecordActionButtonProps) {
  const disabled = !!props.disabled
  const title = props.title || 'Elimina'
  const ariaLabel = props.ariaLabel || title
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={props.onClick}
      title={title}
      aria-label={ariaLabel}
      style={baseStyle('#b42318', disabled, props.marginRight ?? 0)}
    >
      <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
        <path d='M3 6h18'/>
        <path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>
        <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/>
        <path d='M10 11v6'/>
        <path d='M14 11v6'/>
      </svg>
    </button>
  )
}

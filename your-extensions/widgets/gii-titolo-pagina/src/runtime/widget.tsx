/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { React, jsx, type AllWidgetProps } from 'jimu-core'
import type { IMConfig } from '../config'
import { defaultConfig } from '../config'
import { GiiPageTitle } from '../../../_shared/gii-ui/page-title'

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const cfg: any = { ...defaultConfig, ...(props.config as any) }
  const pad = `${Number(cfg.paddingTop || 0)}px ${Number(cfg.paddingRight || 0)}px ${Number(cfg.paddingBottom || 0)}px ${Number(cfg.paddingLeft || 0)}px`
  const titleOverride = String(cfg.titleOverride || '').trim()
  const descriptionOverride = String(cfg.descriptionOverride || '').trim()
  const showDescription = cfg.showDescription !== false
  return (
    <div style={{ width:'100%', height:'100%', boxSizing:'border-box', padding:pad, overflow:'hidden' }}>
      <GiiPageTitle
        showSubtitle={showDescription}
        showDivider={cfg.showTitleDivider !== false}
        title={titleOverride || undefined}
        subtitle={showDescription ? (descriptionOverride || undefined) : ''}
        titleColor={String(cfg.titleColor || '#1F4E79')}
        titleFontSize={Number(cfg.titleFontSize || 18)}
        titleFontWeight={Number(cfg.titleFontWeight || 800)}
        subtitleColor={String(cfg.subtitleColor || '#475569')}
        subtitleFontSize={Number(cfg.subtitleFontSize || 14)}
        iconSize={Number(cfg.iconSize || 23)}
        iconGap={Number(cfg.iconGap || 9)}
        dividerColor={String(cfg.dividerColor || '#1F4E79')}
        dividerWidth={Math.max(0, Number(cfg.dividerWidth ?? 2))}
        dividerPaddingBottom={Number(cfg.dividerPaddingBottom ?? 6)}
      />
    </div>
  )
}

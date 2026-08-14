/**
 * ToolsManagerCard — the `settings.plugin.item` card for the tools-manager.
 *
 * Renders a collapsible card with the full tool tree grouped by source plugin.
 * Each tool row has a toggle button to enable/disable the tool globally.
 * The card reads/writes through the `/tools-manager/api/list|set` HTTP route.
 *
 * @module dsh-tools-manager/client/ToolsManagerCard
 */

import { useState, type ReactNode } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-web-react'
import {
  ToolsManagerCardController,
  type ToolsManagerCardState,
  type PluginGroupRow,
  type ToolRow,
} from './store.ts'
import type { ToolsManagerKey } from './locales.ts'
import styles from './ToolsManagerCard.module.css'

/** Injected dependencies of {@link ToolsManagerCard} (slot `inject`). */
export interface ToolsManagerCardInjected {
  controller: ToolsManagerCardController
  useSnapshot: SnapshotSelectorHook<ToolsManagerCardState>
}

/** Props the renderer binds for the card. */
export type ToolsManagerCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'tools-manager'>
  & InjectFace<ToolsManagerCardInjected>

/**
 * Render the tools-manager card inside the plugin-config section.
 * @param props - slot-delivered injected dependencies and the synthesized t seat.
 * @returns the card.
 */
export function ToolsManagerCard(props: ToolsManagerCardProps): ReactNode {
  const { controller, useSnapshot, t } = props
  const state = useSnapshot(snapshot => snapshot)

  if (state.status === 'idle') void controller.load()

  const [userOpen, setUserOpen] = useState(false)
  const degraded = state.status === 'ready' && !state.available
  const open = userOpen || degraded

  const title = t('title')
  const header = (
    <button
      type="button"
      className={styles.header}
      aria-expanded={open}
      aria-label={`${t(open ? 'collapse' : 'expand')}: ${title}`}
      onClick={() => { if (!degraded) setUserOpen(!userOpen) }}
    >
      <span className={styles.headText}>
        <span className={styles.name}>{title}</span>
        <span className={styles.description}>{t('intro')}</span>
      </span>
      <IconChevronDownOutline14
        className={open ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
      />
    </button>
  )

  let body: ReactNode
  if (degraded) {
    body = (
      <div className={styles.body}>
        <p className={styles.notice} role="status">{t('namespaceUnavailable')}</p>
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.retry}
            onClick={() => { void controller.load() }}
          >
            {t('retry')}
          </button>
        </div>
      </div>
    )
  } else if (state.status === 'loading' || !state.available) {
    body = <div className={styles.body}><p className={styles.loading}>{t('loading')}</p></div>
  } else {
    body = (
      <div className={styles.body}>
        {state.plugins.length === 0 ? (
          <p className={styles.noTools}>{t('noTools')}</p>
        ) : (
          <div className={styles.tree}>
            {state.plugins.map(group => (
              <ToolGroupView
                key={group.name}
                group={group}
                t={t}
                pendingToggle={state.pendingToggle}
                onToggle={(toolName, disabled) => { controller.toggle(toolName, disabled) }}
              />
            ))}
          </div>
        )}
        {state.toggleError ? (
          <p className={styles.toggleError} role="status">{state.toggleError}</p>
        ) : null}
      </div>
    )
  }

  return (
    <li className={open ? `${styles.card} ${styles.cardOpen}` : styles.card}>
      {header}
      {open ? body : null}
    </li>
  )
}

/** Render one plugin group and its tool rows. */
function ToolGroupView(props: {
  group: PluginGroupRow
  t: (key: ToolsManagerKey) => string
  pendingToggle: string | undefined
  onToggle: (toolName: string, disabled: boolean) => void
}): ReactNode {
  const { group, t, pendingToggle, onToggle } = props
  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        {group.name} <span className={styles.toolDesc}>({group.tools.length})</span>
      </div>
      {group.tools.map(tool => (
        <ToolRowView
          key={tool.name}
          tool={tool}
          t={t}
          pending={pendingToggle === tool.name}
          onToggle={() => { onToggle(tool.name, !tool.disabled) }}
        />
      ))}
    </div>
  )
}

/** Render one tool row with its toggle button. */
function ToolRowView(props: {
  tool: ToolRow
  t: (key: ToolsManagerKey) => string
  pending: boolean
  onToggle: () => void
}): ReactNode {
  const { tool, t, pending, onToggle } = props
  return (
    <div className={styles.toolRow}>
      <div className={styles.toolInfo}>
        <div className={styles.toolName}>{tool.name}</div>
        {tool.description ? <div className={styles.toolDesc}>{tool.description}</div> : null}
      </div>
      <div className={styles.toggle}>
        <button
          type="button"
          className={`${styles.toggleButton} ${tool.disabled ? styles.toggleOff : styles.toggleOn}`}
          disabled={pending}
          onClick={onToggle}
        >
          {tool.disabled ? t('enable') : t('disable')}
        </button>
        <span className={styles.toggleLabel}>
          {tool.disabled ? t('disabled') : t('enabled')}
        </span>
      </div>
    </div>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'tools-manager': ToolsManagerKey
  }
}

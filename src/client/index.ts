/**
 * dsh-tools-manager — browser half.
 *
 * Registers a dedicated top-level settings tab「工具管理」through the
 * `settings.section` slot (same pattern as dsh-mcp-manager's「MCP」tab),
 * rather than a card inside the shared「插件配置」page.
 *
 * The panel reads/writes the tool tree through the host gateway
 * `/tools-manager/api/list|set` HTTP channel.
 *
 * Export discipline: the client half value-imports ONLY the frozen platform
 * module table (CLIENT_EXTERNALS); every other `@deepseek-ai/*` import is
 * type-only (erased at build) — values arrive via cordis injection.
 *
 * @module @huanlin/dsh-plugin-tools-manager/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { ToolsManagerPanel } from './ToolsManagerPanel.tsx'

export type { ToolsManagerPanelProps } from './ToolsManagerPanel.tsx'

/** Required services (cordis fiber inject). Only `slots` — the settings.section
 *  slot is declared by the shell; no locale/connection needed (inline styles +
 *  hardcoded zh labels, matching dsh-mcp-manager's approach). */
export const inject = ['slots']

/**
 * Register the tools-manager panel as a top-level settings tab.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register({
      name: 'settings.section',
      id: 'dsh-tools-manager',
      order: 62, // after MCP (61)
      label: () => '工具管理',
      inject: () => ({}),
    }, ToolsManagerPanel))
}

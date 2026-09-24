/**
 * dsh-tools-manager — browser half.
 *
 * Registers this bundle's row configuration card into the Plugins page's
 * `plugins.row.config` keyed slot (declared by ui-plugin-manager): the
 * `tools-manager` row on the bundle's page gains a configure control that
 * opens the tool tree card. The standalone Settings-panel tab mount is
 * retired — since dsh 0.1.7-alpha.1 a third-party plugin's shared
 * configuration entry lives on its bundle row, never in the Settings panel.
 *
 * Key discipline: see `./row-config-key.ts` — the key is
 * `<package name>#<row id>` with the row id verbatim from `cordis.patch.yml`;
 * the page matches it by exact string.
 *
 * Data channel: the card keeps the self-built `/tools-manager/api/list|set`
 * HTTP route (the live tool tree the host attributes — names, descriptions,
 * plugin grouping — is view data the entry Config does not carry).
 * `configForms` is used only as the lifecycle gate: the registration lives
 * while the Host serves the entry's config (`whileServed`), so a stopped row
 * loses its configure control instead of opening a dead page.
 *
 * Export discipline: the client half value-imports ONLY the frozen platform
 * module table (CLIENT_EXTERNALS); every other `@deepseek-ai/*` import is
 * type-only (erased at build) — values arrive via cordis injection.
 *
 * @module @huanlin/dsh-plugin-tools-manager/client
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.slots Context merge (SlotRegistry) — the runtime
// service lives in ui-renderer since the client-runtime split (v0.1.2-alpha.1).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the ctx.configForms Context merge (ConfigFormsApi) — the
// whileServed lifecycle gate below.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the SlotMap merge declaring 'plugins.row.config' (the
// keyed slot this plugin registers into).
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { ToolsManagerPanel } from './ToolsManagerPanel.tsx'
import { ENTRY_ID, ROW_KEY } from './row-config-key.ts'

export type { ToolsManagerPanelProps } from './ToolsManagerPanel.tsx'

/** Required services (cordis fiber inject): `slots` (the composition root)
 * and `configForms` (ui-settings), whose whileServed gates the registration
 * on the Host serving this entry's config. No locale — the card's copy is
 * hardcoded zh, matching dsh-mcp-manager's approach. */
export const inject = ['slots', 'configForms']

/**
 * Register the tools-manager card on this bundle's row while the Host serves
 * the entry's config; the row's configure control follows that lifetime.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () =>
      ctx.slots.inject('plugins.row.config', function* () {
        yield ctx.slots.register({
          name: 'plugins.row.config',
          key: ROW_KEY,
          inject: () => ({}),
        }, ToolsManagerPanel)
      })),
    'tools-manager: plugin row config',
  )
}

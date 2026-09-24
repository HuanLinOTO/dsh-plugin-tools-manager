/**
 * settings.ts — host-side bridge between the `tools-manager` entry Config and
 * the plugin's other halves (policy + gateway + registry).
 *
 * Since DSH 0.1.7 (DSH-0.1.7-RC1-04) settings no longer live in a namespace
 * registry: the old namespace-registration API is gone. The plugin declares a
 * Cordis `Config` (see `config.ts`, field `disabled` marked `.volatile()`) whose value
 * persists per profile in `cordis.patch.yml` under the entry id
 * (`tools-manager`). The Loader passes `apply` a live `Volatile<string[]>`
 * reference, so `source()` reads `.get()` on every call and always serves the
 * latest committed value — no in-process watcher or remount needed.
 *
 * `configure({ auto: false })` opts the entry out of the schema-generated
 * settings page: this plugin ships its own configuration card on its bundle
 * row in the Plugins page (`plugins.row.config`, client half) and manages
 * its own presentation. Headless assemblies without a settings provider
 * still load the plugin from the composition seed.
 *
 * @module dsh-tools-manager/settings
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the `ctx.settings` Context merge (SettingsForms).
import type {} from '@deepseek-ai/dsh-settings'
import { type EntryConfig, type ResolvedConfig, resolveConfig } from './config.js'

/** Profile entry id under which the disabled-tool list persists (cordis.patch.yml). */
export const SETTINGS_NAMESPACE = 'tools-manager'

/** Read face the gateway and policy consume. */
export interface ToolsManagerSettingsBridge {
  /** The current resolved config, read from the live volatile reference. */
  source(): ResolvedConfig
}

/**
 * Install the `tools-manager` entry's settings presentation policy and return
 * the bridge.
 *
 * The settings service is reached through `ctx.inject(['settings'], ...)` so a
 * composition without a settings provider still loads the plugin (seed-only,
 * no persistence). The bridge reads the config reference cordis handed to
 * `apply`; the Loader updates that reference in place on a committed edit.
 * @param ctx - host context.
 * @param entry - the entry's volatile Cordis config.
 * @returns the bridge the gateway and policy consume.
 */
export function installToolsManagerSettings(ctx: Context, entry: EntryConfig): ToolsManagerSettingsBridge {
  ctx.inject(['settings'], (sctx) => {
    sctx.effect(() => sctx.settings.configure({ auto: false }, ctx.fiber))
  })

  return {
    source: () => resolveConfig({ disabled: entry.disabled?.get() }),
  }
}

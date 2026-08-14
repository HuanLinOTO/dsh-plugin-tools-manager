/**
 * settings.ts — host-side bridge between the `tools-manager` settings namespace
 * and the plugin's other halves (policy + gateway + registry).
 *
 * The composition `Config` (cordis.patch.yml) is the first-boot seed; once the
 * `ctx.settings` service mounts, the user-editable layer takes over and the
 * disabled set tracks every committed change. Headless assemblies without a
 * settings provider fall back to the composition config (no persistence, no
 * live reload).
 *
 * The bridge mirrors `dsh-interpreters/src/settings.ts`: a `source()` thunk the
 * gateway and policy read in-process, plus an `onChange()` subscription the
 * host entry uses to rebuild the disabled set on every committed change.
 *
 * @module dsh-tools-manager/settings
 */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import { Config, type Config as ConfigType, type ResolvedConfig } from './config.js'
import { resolveConfig } from './config.js'

/** Settings namespace under which the disabled-tool list persists. */
export const SETTINGS_NAMESPACE = settingsNamespace('tools-manager')

/**
 * Mirror of the dsh-settings internal `isUnloading` guard. The cordis const
 * enum for fiber state is erased at compile time, so the literal states are
 * matched numerically: 4 = DISPOSED, 5 = UNLOADING.
 */
function isUnloading(ctx: Context): boolean {
  const state = (ctx as unknown as { fiber?: { state?: number } }).fiber?.state
  return state === 4 || state === 5
}

/** Read face the gateway and policy consume. */
export interface ToolsManagerSettingsBridge {
  /** The current resolved config (composition seed while settings is absent). */
  source(): ResolvedConfig
  /** Observe committed changes to the resolved config. */
  onChange(callback: () => void): void
}

/**
 * Install the `tools-manager` settings namespace and return the bridge.
 *
 * The settings service is reached through `ctx.inject(['settings'], ...)` so a
 * composition without a settings provider still loads the plugin (entry-source
 * fallback, no persistence). Multi-fiber dedupe is handled by catching the
 * `"already registered"` rejection.
 * @param ctx - host context.
 * @param entry - composition-layer config (cordis.patch.yml seed).
 * @returns the bridge the gateway and policy consume.
 */
export function installToolsManagerSettings(ctx: Context, entry: ConfigType): ToolsManagerSettingsBridge {
  const listeners = new Set<() => void>()
  let source = (): ResolvedConfig => resolveConfig(entry)
  const notify = (): void => {
    for (const listener of [...listeners]) listener()
  }

  ctx.inject(['settings'], (sctx) => {
    let scope: SettingsScope<ConfigType> | undefined
    try {
      scope = sctx.settings.register(SETTINGS_NAMESPACE, Config, { base: entry as never })
    } catch (error) {
      // Multi-fiber dedupe: the first registration owns the namespace; later
      // fibers stay on the entry source and emit no notifications of their own.
      if (!(error instanceof Error) || !error.message.includes('already registered')) throw error
      ctx.logger('tools-manager').debug('settings namespace already registered — entry-source fallback')
      return
    }
    source = () => resolveConfig(scope!.get())
    sctx.effect(() => () => {
      if (isUnloading(ctx)) return
      source = () => resolveConfig(entry)
      notify()
    })
    notify()
    scope.watch(() => {
      if (isUnloading(ctx)) return
      notify()
    })
  })

  return {
    source: () => source(),
    onChange: (cb) => { listeners.add(cb) },
  }
}

/**
 * config.ts — profile-owned Config schema and resolved config shape.
 *
 * Since dsh 0.1.7-rc.1 (DSH-0.1.7-RC1-04) there is no separate settings
 * namespace: the composition `Config` (cordis.patch.yml) is the first-boot
 * seed AND the profile-owned store. Fields a settings form may edit are marked
 * `.volatile()`, so the Loader hands `apply` a live {@link Volatile} reference
 * whose `.get()` always returns the latest committed value — no remount.
 *
 * Values persist per profile in `cordis.patch.yml` under the entry id
 * (`tools-manager`); the old `$DSH_HOME/settings.yaml` section is imported
 * once by the host settings service.
 *
 * @module dsh-tools-manager/config
 */

import z from '@deepseek-ai/schemastery'
import type { Volatile } from '@deepseek-ai/cordis'

/** Composition schema-input shape (all fields optional at the boundary). */
export interface Config {
  disabled?: readonly string[]
}

/**
 * The volatile Cordis config the Loader passes to `apply`: the editable
 * `disabled` field is a stable reference read through `.get()`.
 */
export interface EntryConfig {
  /** Live disabled-tool-name list; `.get()` returns the latest accepted value. */
  disabled: Volatile<string[]>
}

/** Fully-resolved config with fallbacks applied. */
export interface ResolvedConfig {
  disabled: string[]
}

/**
 * Schemastery schema for the plugin's profile-owned Config.
 *
 * `disabled` is `.volatile()`: the settings service enumerates the entry's
 * volatile fields for the configuration form, and a committed edit updates the
 * running reference in place.
 */
export const Config = z.object({
  disabled: z.array(z.string()).default([]).volatile().description('Globally disabled tool names; hidden from the model and denied at execution.'),
}) as unknown as z<EntryConfig>

/**
 * Resolve config with fallbacks for missing / invalid values.
 * @param config - a plain config patch (composition seed or a read of the
 *   volatile reference via `.get()`).
 * @returns a fully-populated {@link ResolvedConfig}.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  const disabled = Array.isArray(config.disabled)
    ? config.disabled.filter((name): name is string => typeof name === 'string' && name !== '')
    : []
  return { disabled }
}

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
import type { Context } from '@deepseek-ai/cordis';
import { type Config as ConfigType, type ResolvedConfig } from './config.js';
/** Settings namespace under which the disabled-tool list persists. */
export declare const SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Read face the gateway and policy consume. */
export interface ToolsManagerSettingsBridge {
    /** The current resolved config (composition seed while settings is absent). */
    source(): ResolvedConfig;
    /** Observe committed changes to the resolved config. */
    onChange(callback: () => void): void;
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
export declare function installToolsManagerSettings(ctx: Context, entry: ConfigType): ToolsManagerSettingsBridge;

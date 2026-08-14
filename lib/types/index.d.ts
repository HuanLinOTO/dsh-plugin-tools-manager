/**
 * index.ts — dsh-tools-manager host plugin entry.
 *
 * Wires together three halves:
 *   - `ToolRegistry` attributes each registered tool to its source plugin by
 *     snapshot-diffing `ctx.tools.schemas()` on every `tools/change`.
 *   - `installPolicy` installs the two-layer enable/disable gate:
 *     `system-prompt/assemble` hides disabled tools from the model, and
 *     `ctx.tools.guard()` denies their execution. Both read the same
 *     `disabled` set so the two layers can never drift.
 *   - `registerHttpGateway` exposes `/tools-manager/api/list|set` for the
 *     browser settings card.
 *
 * The disabled set persists through the `tools-manager` settings namespace in
 * `$DSH_HOME/settings.yaml`; runtime edits update the in-memory set and the
 * next assembly / guard call reads the fresh value — no restart needed.
 *
 * @module @huanlin/dsh-plugin-tools-manager
 */
import type { Context } from '@deepseek-ai/cordis';
import { type Config } from './config.js';
export { Config, resolveConfig, type ResolvedConfig } from './config.js';
export { registerHttpGateway, type ToolsManagerTreeView, type PluginGroupView, type ToolRowView } from './gateway.js';
export { installPolicy, filterTools, disabledReason, DISABLED_REASON_PREFIX } from './policy.js';
export { ToolRegistry, type ToolEntry, type PluginGroup, BASELINE_GROUP, UNKNOWN_GROUP } from './registry.js';
export { SETTINGS_NAMESPACE, type ToolsManagerSettingsBridge } from './settings.js';
export declare const name = "tools-manager";
export declare const inject: string[];
/**
 * Plugin body: build the registry, install the policy, register the HTTP
 * gateway, and keep the disabled set in sync with settings changes.
 * @param ctx - host context carrying `tools`, `webServer`, and `systemPrompt`.
 * @param config - resolved composition config (seed).
 */
export declare function apply(ctx: Context, config?: Config): void;

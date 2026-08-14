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
import { registerHttpGateway } from './gateway.js';
import { installPolicy } from './policy.js';
import { ToolRegistry } from './registry.js';
import { installToolsManagerSettings } from './settings.js';
export { Config, resolveConfig } from './config.js';
export { registerHttpGateway } from './gateway.js';
export { installPolicy, filterTools, disabledReason, DISABLED_REASON_PREFIX } from './policy.js';
export { ToolRegistry, BASELINE_GROUP, UNKNOWN_GROUP } from './registry.js';
export { SETTINGS_NAMESPACE } from './settings.js';
export const name = 'tools-manager';
export const inject = ['tools', 'webServer', 'systemPrompt'];
/**
 * Plugin body: build the registry, install the policy, register the HTTP
 * gateway, and keep the disabled set in sync with settings changes.
 * @param ctx - host context carrying `tools`, `webServer`, and `systemPrompt`.
 * @param config - resolved composition config (seed).
 */
export function apply(ctx, config = {}) {
    ctx.logger('tools-manager').info('apply() called, config=', JSON.stringify(config));
    const bridge = installToolsManagerSettings(ctx, config);
    const disabledSet = () => new Set(bridge.source().disabled);
    const registry = new ToolRegistry(ctx);
    const disposePolicy = installPolicy(ctx, disabledSet);
    registerHttpGateway(ctx, registry, bridge);
    ctx.logger('tools-manager').info('registry + policy + gateway installed');
    ctx.effect(() => () => {
        disposePolicy();
        registry.dispose();
    }, 'tools-manager: cleanup');
}

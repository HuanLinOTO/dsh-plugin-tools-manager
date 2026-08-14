/**
 * gateway.ts — host-side HTTP gateway exposing the tool tree + disabled set
 * to the browser through a self-hosted `/tools-manager/api` route.
 *
 * Mirrors the dsh-interpreters / dsh-better-sidebar pattern: `ctx.webServer.
 * register` claims a prefix route, the handler reads/writes the settings seam
 * in-process (no wire-layer allowlist gate), and the browser reaches it
 * through `fetch('/tools-manager/api/<method>')`.
 *
 * Route shape:
 *   POST /tools-manager/api/list
 *     → { ok: true, value: { plugins: [{ name, tools: [{ name, description, disabled }] }] } }
 *   POST /tools-manager/api/set  body: { toolName, disabled }
 *     → { ok: true, value: { plugins: [...] } }   (refreshed full tree)
 * Errors carry { ok: false, error: { code, message } }.
 *
 * @module dsh-tools-manager/gateway
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ToolRegistry } from './registry.js';
import type { ToolsManagerSettingsBridge } from './settings.js';
/** Minimal settings service face: the `update` method the gateway calls in-process. */
interface SettingsService {
    update(namespace: unknown, patch: Record<string, unknown>): Promise<void>;
}
/** Wire view of one tool row in the tree. */
export interface ToolRowView {
    name: string;
    description: string;
    disabled: boolean;
}
/** Wire view of one plugin group in the tree. */
export interface PluginGroupView {
    name: string;
    tools: ToolRowView[];
}
/** Wire view returned by both `list` and `set`: the full refreshed tree. */
export interface ToolsManagerTreeView {
    plugins: PluginGroupView[];
}
/**
 * Register the `/tools-manager/api` HTTP route on the host's web server.
 *
 * The route reads the tool tree from the registry and reads/writes the
 * disabled set through the settings bridge. The settings service is optional:
 * when absent, `list` still works (degraded to entry-source disabled set) and
 * `set` returns a clear error.
 * @param ctx - host context carrying `webServer`.
 * @param registry - the tool attribution registry.
 * @param bridge - the settings bridge the route reads through.
 */
export declare function registerHttpGateway(ctx: Context, registry: ToolRegistry, bridge: ToolsManagerSettingsBridge): void;
/**
 * Handle the `set` method: validate the patch, write the user layer, return
 * the refreshed tree.
 * @param body - the parsed JSON body from the request.
 * @param settings - the live settings service (undefined when unavailable).
 * @param registry - the tool attribution registry.
 * @param bridge - the settings bridge for reading the source.
 * @returns the refreshed tree view.
 * @throws when the settings service is unavailable or the body is invalid.
 */
export declare function handleSet(body: unknown, settings: SettingsService | undefined, registry: ToolRegistry, bridge: ToolsManagerSettingsBridge): Promise<ToolsManagerTreeView>;
/** Validated patch for the `set` endpoint. */
interface SetPatch {
    toolName: string;
    disabled: boolean;
}
/**
 * Extract and validate the `set` patch from the request body.
 *
 * JSON wire boundary: the body must be `{ toolName: string, disabled: boolean }`.
 * Unknown keys are dropped; missing or mistyped fields produce a 400-style
 * error (thrown as an Error, caught by the handler and returned as
 * `internal`).
 * @param body - the parsed JSON body.
 * @returns the normalized patch.
 * @throws when the body is missing required fields or has wrong types.
 */
export declare function extractSetPatch(body: unknown): SetPatch;
/**
 * Build the full tree view from the registry + bridge.
 * @param registry - the tool attribution registry.
 * @param bridge - the settings bridge (for the disabled set).
 * @returns the tree view with each tool tagged `disabled`.
 */
export declare function buildView(registry: ToolRegistry, bridge: ToolsManagerSettingsBridge): ToolsManagerTreeView;
export {};

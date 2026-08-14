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
import { SETTINGS_NAMESPACE } from './settings.js';
/** HTTP route prefix owning every tools-manager API request. */
const API_PREFIX = '/tools-manager/api';
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
export function registerHttpGateway(ctx, registry, bridge) {
    let settings;
    ctx.inject(['settings'], (sctx) => {
        settings = sctx.settings;
        return () => { settings = undefined; };
    });
    ctx.effect(() => ctx.webServer.register({
        kind: 'prefix',
        path: API_PREFIX,
        handler: async (req, res) => {
            if (req.method !== 'POST') {
                writeJson(res, 405, envelopeError('method-not-allowed', 'POST only'));
                return;
            }
            const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname;
            const method = pathname.startsWith(`${API_PREFIX}/`)
                ? pathname.slice(`${API_PREFIX}/`.length)
                : undefined;
            if (method === undefined || method.includes('/')) {
                writeJson(res, 404, envelopeError('not-found', 'unknown tools-manager API method'));
                return;
            }
            try {
                const body = await readJsonBody(req);
                if (method === 'list') {
                    const view = buildView(registry, bridge);
                    writeJson(res, 200, envelopeOk(view));
                }
                else if (method === 'set') {
                    const view = await handleSet(body, settings, registry, bridge);
                    writeJson(res, 200, envelopeOk(view));
                }
                else {
                    writeJson(res, 404, envelopeError('not-found', `unknown tools-manager API method "${method}"`));
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                writeJson(res, 500, envelopeError('internal', message));
            }
        },
    }), 'tools-manager: /tools-manager/api routes');
}
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
export async function handleSet(body, settings, registry, bridge) {
    const patch = extractSetPatch(body);
    if (settings === undefined) {
        throw new Error('tools-manager: settings service is unavailable — the disabled set cannot be written');
    }
    const current = bridge.source();
    let nextDisabled;
    if (patch.disabled === true) {
        if (!current.disabled.includes(patch.toolName)) {
            nextDisabled = [...current.disabled, patch.toolName];
        }
        else {
            nextDisabled = [...current.disabled];
        }
    }
    else {
        nextDisabled = current.disabled.filter(name => name !== patch.toolName);
    }
    await settings.update(SETTINGS_NAMESPACE, { disabled: nextDisabled });
    return buildView(registry, bridge);
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
export function extractSetPatch(body) {
    if (!isObject(body)) {
        throw new Error('tools-manager: set body must be a JSON object { toolName, disabled }');
    }
    const toolName = Reflect.get(body, 'toolName');
    const disabled = Reflect.get(body, 'disabled');
    if (typeof toolName !== 'string' || toolName === '') {
        throw new Error('tools-manager: set body `toolName` must be a non-empty string');
    }
    if (typeof disabled !== 'boolean') {
        throw new Error('tools-manager: set body `disabled` must be a boolean');
    }
    return { toolName, disabled };
}
/**
 * Build the full tree view from the registry + bridge.
 * @param registry - the tool attribution registry.
 * @param bridge - the settings bridge (for the disabled set).
 * @returns the tree view with each tool tagged `disabled`.
 */
export function buildView(registry, bridge) {
    const disabledSet = new Set(bridge.source().disabled);
    const groups = registry.getTree();
    return {
        plugins: groups.map(group => ({
            name: group.name,
            tools: group.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                disabled: disabledSet.has(tool.name),
            })),
        })),
    };
}
/** Read and parse a JSON body from a node:http request. */
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString('utf8');
    if (text === '')
        return {};
    return JSON.parse(text);
}
/** Write a JSON response envelope. */
function writeJson(res, status, body) {
    const json = JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(json);
}
/** Build a success envelope. */
function envelopeOk(value) {
    return { ok: true, value };
}
/** Build an error envelope. */
function envelopeError(code, message) {
    return { ok: false, error: { code, message } };
}
/** Narrow unknown to a non-null object. */
function isObject(value) {
    return typeof value === 'object' && value !== null;
}

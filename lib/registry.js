/**
 * registry.ts — tool-to-plugin attribution registry.
 *
 * ## Attribution challenge
 *
 * dsh-tools' `ctx.tools.schemas()` returns only `{ name, description,
 * parameters }` — there is **no source-plugin field**. The `ToolRuntime`
 * internally tracks which scope (fiber) registered each tool via
 * `ScopedLayers`, but that mapping is private and scope keys are opaque
 * objects, not plugin names.
 *
 * ## Approach (zero source-code modification)
 *
 * Two mechanisms work together:
 *
 * 1. **`internal/plugin` + `internal/status`** — tracks which plugin is
 *    currently loading (fiber created → `apply()` running → ACTIVE). The
 *    pending-stack top is the best attribution candidate for any tool
 *    registered during that window.
 *
 * 2. **Wrap `ctx.tools.register`** — intercepts every registration call to
 *    capture the tool name + current pending-plugin attribution at the exact
 *    moment of registration, rather than inferring it later from a
 *    `tools/change` diff. This is more precise for concurrent loads.
 *
 * 3. **`ctx.registry.values()`** — enumerates all loaded plugin runtimes
 *    (name + fibers), so we can list known plugin names in the tree even
 *    when we cannot attribute specific tools to them.
 *
 * ## Known limitations
 *
 * - **Baseline tools**: tools registered before this plugin loaded cannot be
 *   attributed to their source plugin — their `internal/plugin` event fired
 *   before we subscribed. They fall to {@link BASELINE_GROUP}.
 * - **Async registration**: a plugin that registers tools after `apply()`
 *   returns (e.g. in a `setTimeout` or async callback) may have already left
 *   the pending stack — those tools fall to {@link UNKNOWN_GROUP}.
 * - **Concurrent loads**: the most recently created pending fiber wins.
 *
 * @module dsh-tools-manager/registry
 */
/** Group name for tools registered before this plugin loaded. */
export const BASELINE_GROUP = '(baseline)';
/** Group name for tools whose source plugin could not be determined. */
export const UNKNOWN_GROUP = '(unknown)';
/**
 * Fiber lifecycle states (cordis `FiberState` const enum, erased at compile
 * time). Matched numerically: 0 PENDING, 1 LOADING, 2 ACTIVE, 3 FAILED,
 * 4 DISPOSED, 5 UNLOADING.
 */
const STATE_ACTIVE = 2;
const STATE_FAILED = 3;
const STATE_DISPOSED = 4;
/**
 * The tool-to-plugin attribution registry.
 *
 * Construction is an effect: it wraps `ctx.tools.register`, registers
 * `internal/plugin`, `internal/status`, and `tools/change` listeners on the
 * supplied context. All listeners are fibre-scoped effects and auto-clean
 * on unload.
 */
export class ToolRegistry {
    ctx;
    /** pluginName → tools (preserves registration order). */
    byPlugin = new Map();
    /** toolName → pluginName (reverse index for fast removal). */
    toolToPlugin = new Map();
    /** Last schemas() snapshot (name → entry), used for removal detection. */
    lastSnapshot = new Map();
    /** Stack of plugin names whose fibres are still loading (not yet ACTIVE/FAILED/DISPOSED). */
    pendingPlugins = [];
    /** Original register method, restored on dispose. */
    originalRegister;
    /** Dispose callback for the register wrapper. */
    restoreRegister;
    constructor(ctx) {
        this.ctx = ctx;
        this.snapshotBaseline();
        this.wrapRegister();
        ctx.on('internal/plugin', (fiber) => this.onPluginEvent(fiber));
        ctx.on('internal/status', (fiber) => this.onStatusEvent(fiber));
        ctx.on('tools/change', () => this.reconcile());
    }
    /**
     * Wrap `ctx.tools.register` to capture attribution at registration time.
     *
     * When a plugin calls `ctx.tools.register(def)`, the wrapped method checks
     * the pending-stack top (the plugin currently in its `apply()`) and records
     * the tool name → plugin name mapping immediately. This is more precise
     * than the `tools/change` diff for concurrent loads, and catches tools
     * that are registered and then quickly unregistered before `tools/change`
     * fires.
     */
    wrapRegister() {
        const tools = this.ctx.tools;
        if (typeof tools.register !== 'function')
            return;
        this.originalRegister = tools.register.bind(tools);
        const self = this;
        const wrapped = function (definition) {
            // Capture attribution at the exact moment of registration.
            const def = definition;
            const toolName = def?.name;
            if (typeof toolName === 'string') {
                const owner = self.currentLoadingPlugin() ?? UNKNOWN_GROUP;
                self.recordAttribution(toolName, owner);
            }
            return self.originalRegister(definition);
        };
        tools.register = wrapped;
        this.restoreRegister = () => {
            if (self.originalRegister !== undefined) {
                tools.register = self.originalRegister;
            }
        };
    }
    /**
     * The plugin currently in its `apply()` (pending-stack top), or undefined.
     * @returns the name of the most recently created loading plugin.
     */
    currentLoadingPlugin() {
        return this.pendingPlugins.length > 0
            ? this.pendingPlugins[this.pendingPlugins.length - 1]
            : undefined;
    }
    /**
     * Record a tool name → plugin name attribution (called from the wrapped
     * register). Overwrites any previous attribution for this tool.
     */
    recordAttribution(toolName, owner) {
        const prevOwner = this.toolToPlugin.get(toolName);
        if (prevOwner !== undefined && prevOwner !== owner) {
            this.removeToolFromGroup(toolName, prevOwner);
        }
        this.toolToPlugin.set(toolName, owner);
        // Don't push to byPlugin here — the tools/change reconcile will add the
        // entry when it appears in schemas(). We just record the attribution
        // so reconcile knows where to put it.
        this.pendingAttribution = this.pendingAttribution.set(toolName, owner);
    }
    /** Tool names whose attribution was captured by the register wrapper, awaiting reconcile. */
    pendingAttribution = new Map();
    /**
     * Take the initial schemas() snapshot and attribute every visible tool to
     * {@link BASELINE_GROUP}. Also enumerate loaded plugins via ctx.registry
     * so their names appear as empty groups in the tree (informational).
     */
    snapshotBaseline() {
        const schemas = this.readSchemas();
        const map = new Map();
        const entries = [];
        for (const s of schemas) {
            const entry = { name: s.name, description: s.description, parameters: s.parameters };
            map.set(s.name, entry);
            entries.push(entry);
            this.toolToPlugin.set(s.name, BASELINE_GROUP);
        }
        this.lastSnapshot = map;
        if (entries.length > 0)
            this.byPlugin.set(BASELINE_GROUP, entries);
        // Enumerate loaded plugins so their names appear as groups (even if empty).
        this.enumerateLoadedPlugins();
    }
    /**
     * Enumerate all loaded plugin runtimes via `ctx.registry.values()` and
     * register their names as (possibly empty) groups in the tree. This gives
     * the user visibility into all loaded plugins, even when we cannot
     * attribute specific tools to them.
     */
    enumerateLoadedPlugins() {
        const registry = this.ctx.registry;
        if (registry === undefined || typeof registry.values !== 'function')
            return;
        try {
            for (const runtime of registry.values()) {
                const name = runtime.name;
                if (name === undefined || name === 'root')
                    continue;
                // Check if any fiber of this runtime is still active.
                const hasActive = runtime.fibers.some(f => f.uid !== null && f.state !== STATE_DISPOSED);
                if (!hasActive)
                    continue;
                // Register as an empty group if not already present.
                if (!this.byPlugin.has(name)) {
                    this.byPlugin.set(name, []);
                }
            }
        }
        catch {
            // Registry enumeration is best-effort; failures are non-fatal.
        }
    }
    /**
     * `internal/plugin` fires on fibre creation (uid just assigned) and on
     * disposal (uid cleared). Creation pushes the name onto the pending stack;
     * disposal is also handled by `internal/status` (DISPOSED), so this path
     * only guards against a missing status event.
     */
    onPluginEvent(fiber) {
        if (fiber.uid !== null) {
            // Created: push onto pending stack (deduped — a restart fires creation
            // again before the old DISPOSED clears).
            if (!this.pendingPlugins.includes(fiber.name)) {
                this.pendingPlugins.push(fiber.name);
            }
            // Register as an empty group so it appears in the tree immediately.
            if (!this.byPlugin.has(fiber.name) && fiber.name !== 'root') {
                this.byPlugin.set(fiber.name, []);
            }
        }
        else {
            this.removeFromPending(fiber.name);
        }
    }
    /**
     * `internal/status` fires on every state transition. When a fibre reaches
     * ACTIVE, FAILED, or DISPOSED it is no longer "pending" — its apply() has
     * finished (or thrown) and tools registered during apply() have already
     * fired their `tools/change`.
     */
    onStatusEvent(fiber) {
        if (fiber.state === STATE_ACTIVE || fiber.state === STATE_FAILED || fiber.state === STATE_DISPOSED) {
            this.removeFromPending(fiber.name);
        }
        // On DISPOSED, also drop the plugin's group from the tree — its tools
        // auto-unregister via effect cleanup, so the next tools/change reconcile
        // will remove them, but the empty group lingers unless we clear it here.
        if (fiber.state === STATE_DISPOSED) {
            this.byPlugin.delete(fiber.name);
        }
        // On ACTIVE, re-enumerate plugins to catch any that loaded while we
        // were processing.
        if (fiber.state === STATE_ACTIVE) {
            this.enumerateLoadedPlugins();
        }
    }
    /** Remove a plugin name from the pending stack (preserves order of the rest). */
    removeFromPending(name) {
        if (this.pendingPlugins.length === 0)
            return;
        this.pendingPlugins = this.pendingPlugins.filter(n => n !== name);
    }
    /**
     * Diff the current `ctx.tools.schemas()` against the last snapshot and
     * update the attribution map.
     *
     * New tools → attributed via pending attribution (from register wrapper)
     *   or pending-stack top, or {@link UNKNOWN_GROUP}.
     * Removed tools → deleted from the map and from their plugin group.
     * Existing tools → description / parameters refreshed in place.
     */
    reconcile() {
        const schemas = this.readSchemas();
        const current = new Map();
        for (const s of schemas) {
            current.set(s.name, { name: s.name, description: s.description, parameters: s.parameters });
        }
        // Added or changed tools.
        for (const [name, entry] of current) {
            const prev = this.lastSnapshot.get(name);
            if (prev === undefined) {
                this.attributeNew(name, entry);
            }
            else {
                this.refreshExisting(name, entry);
            }
        }
        // Removed tools.
        for (const [name] of this.lastSnapshot) {
            if (!current.has(name)) {
                this.removeTool(name);
            }
        }
        this.lastSnapshot = current;
    }
    /** Attribute a newly registered tool using pending attribution or pending-stack top. */
    attributeNew(name, entry) {
        // Prefer the attribution captured by the register wrapper (most precise).
        const pendingOwner = this.pendingAttribution.get(name);
        const owner = pendingOwner ?? this.currentLoadingPlugin() ?? UNKNOWN_GROUP;
        this.pendingAttribution.delete(name);
        // If the tool was previously attributed (e.g. re-registered after a
        // dispose/reload), remove it from its old group first.
        const prevOwner = this.toolToPlugin.get(name);
        if (prevOwner !== undefined && prevOwner !== owner) {
            this.removeToolFromGroup(name, prevOwner);
        }
        const list = this.byPlugin.get(owner) ?? [];
        list.push(entry);
        this.byPlugin.set(owner, list);
        this.toolToPlugin.set(name, owner);
    }
    /** Refresh an existing tool's description/parameters in its current group. */
    refreshExisting(name, entry) {
        const owner = this.toolToPlugin.get(name);
        if (owner === undefined) {
            // Previously unseen but in the snapshot — attribute now.
            this.attributeNew(name, entry);
            return;
        }
        const list = this.byPlugin.get(owner);
        if (list === undefined)
            return;
        const idx = list.findIndex(e => e.name === name);
        if (idx >= 0) {
            list[idx] = entry;
        }
        else {
            list.push(entry);
        }
    }
    /** Remove a tool from the attribution map and its plugin group. */
    removeTool(name) {
        const owner = this.toolToPlugin.get(name);
        if (owner === undefined)
            return;
        this.removeToolFromGroup(name, owner);
        this.toolToPlugin.delete(name);
        this.pendingAttribution.delete(name);
    }
    /** Remove a tool from one specific plugin group (helper). */
    removeToolFromGroup(name, owner) {
        const list = this.byPlugin.get(owner);
        if (list === undefined)
            return;
        const idx = list.findIndex(e => e.name === name);
        if (idx >= 0)
            list.splice(idx, 1);
        // Don't delete empty groups — they may represent loaded plugins with
        // no tools yet (from enumerateLoadedPlugins / internal/plugin).
    }
    /** Read `ctx.tools.schemas()` and narrow to the fields we use. */
    readSchemas() {
        const schemas = this.ctx.tools.schemas();
        return Array.isArray(schemas) ? schemas : [];
    }
    /**
     * The attribution tree: one entry per plugin group, in insertion order,
     * each carrying its tools in registration order.
     * @returns a snapshot of the current tree.
     */
    getTree() {
        return [...this.byPlugin.entries()].map(([name, tools]) => ({
            name,
            tools: tools.map(t => ({ ...t })),
        }));
    }
    /**
     * The set of disabled tool names (delegated to {@link ToolPolicy} via the
     * host entry). Exposed for the gateway to tag each tool row with its
     * disabled state.
     */
    isDisabled(name, disabled) {
        return disabled.has(name);
    }
    /** Restore the original register method and clean up listeners. */
    dispose() {
        this.restoreRegister?.();
    }
}

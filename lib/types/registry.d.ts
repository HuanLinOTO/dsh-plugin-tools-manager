/**
 * registry.ts — tool-to-plugin attribution registry.
 *
 * Attributions each registered tool to the plugin that registered it, using a
 * snapshot-diff algorithm over `ctx.tools.schemas()`:
 *   1. A baseline snapshot is taken at construction (tools registered before
 *      this plugin loaded are attributed to `BASELINE_GROUP`).
 *   2. `internal/plugin` pushes a plugin name onto a pending stack when a
 *      fiber is created; `internal/status` pops it when the fiber reaches a
 *      terminal state (ACTIVE / FAILED / DISPOSED).
 *   3. `tools/change` fires (unfiltered) on register / unregister / restriction
 *      change. The handler diffs the current schemas() against the last
 *      snapshot: new tools are attributed to the current pending-stack top;
 *      removed tools are deleted from the map.
 *
 * Precision boundaries (documented as Known Limitations):
 *   - A plugin that registers tools asynchronously after apply() returns may
 *     have already left the pending stack — those tools fall to
 *     {@link UNKNOWN_GROUP}.
 *   - Concurrent plugin loads: the most recently created pending fiber wins.
 *
 * @module dsh-tools-manager/registry
 */
import type { Context } from '@deepseek-ai/cordis';
/** Group name for tools registered before this plugin loaded. */
export declare const BASELINE_GROUP = "(baseline)";
/** Group name for tools whose source plugin could not be determined. */
export declare const UNKNOWN_GROUP = "(unknown)";
/** A tool's name, description, and parameter schema — the projection from `ctx.tools.schemas()`. */
export interface ToolEntry {
    readonly name: string;
    readonly description: string;
    readonly parameters: unknown;
}
/** One plugin group in the tree: its display name and the tools attributed to it. */
export interface PluginGroup {
    readonly name: string;
    readonly tools: ToolEntry[];
}
/**
 * The tool-to-plugin attribution registry.
 *
 * Construction is an effect: it registers `internal/plugin`,
 * `internal/status`, and `tools/change` listeners on the supplied context.
 * All listeners are fibre-scoped effects and auto-clean on unload.
 */
export declare class ToolRegistry {
    private readonly ctx;
    /** pluginName → tools (preserves registration order). */
    private readonly byPlugin;
    /** toolName → pluginName (reverse index for fast removal). */
    private readonly toolToPlugin;
    /** Last schemas() snapshot (name → entry). */
    private lastSnapshot;
    /** Stack of plugin names whose fibres are still loading (not yet ACTIVE/FAILED/DISPOSED). */
    private pendingPlugins;
    constructor(ctx: Context);
    /**
     * Take the initial schemas() snapshot and attribute every visible tool to
     * {@link BASELINE_GROUP}.
     */
    private snapshotBaseline;
    /**
     * `internal/plugin` fires on fibre creation (uid just assigned) and on
     * disposal (uid cleared). Creation pushes the name onto the pending stack;
     * disposal is also handled by `internal/status` (DISPOSED), so this path
     * only guards against a missing status event.
     */
    private onPluginEvent;
    /**
     * `internal/status` fires on every state transition. When a fibre reaches
     * ACTIVE, FAILED, or DISPOSED it is no longer "pending" — its apply() has
     * finished (or thrown) and tools registered during apply() have already
     * fired their `tools/change`.
     */
    private onStatusEvent;
    /** Remove a plugin name from the pending stack (preserves order of the rest). */
    private removeFromPending;
    /**
     * Diff the current `ctx.tools.schemas()` against the last snapshot and
     * update the attribution map.
     *
     * New tools → attributed to the pending-stack top (most recently created
     * loading plugin), or {@link UNKNOWN_GROUP} when the stack is empty.
     * Removed tools → deleted from the map and from their plugin group.
     * Existing tools → description / parameters refreshed in place.
     */
    private reconcile;
    /** Attribute a newly registered tool to the pending-stack top or unknown group. */
    private attributeNew;
    /** Refresh an existing tool's description/parameters in its current group. */
    private refreshExisting;
    /** Remove a tool from the attribution map and its plugin group. */
    private removeTool;
    /** Remove a tool from one specific plugin group (helper). */
    private removeToolFromGroup;
    /** Read `ctx.tools.schemas()` and narrow to the fields we use. */
    private readSchemas;
    /**
     * The attribution tree: one entry per plugin group, in insertion order,
     * each carrying its tools in registration order.
     * @returns a snapshot of the current tree.
     */
    getTree(): PluginGroup[];
    /**
     * The set of disabled tool names (delegated to {@link ToolPolicy} via the
     * host entry). Exposed for the gateway to tag each tool row with its
     * disabled state.
     */
    isDisabled(name: string, disabled: ReadonlySet<string>): boolean;
}

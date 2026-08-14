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

import type { Context, Fiber } from '@deepseek-ai/cordis'

/** Group name for tools registered before this plugin loaded. */
export const BASELINE_GROUP = '(baseline)'

/** Group name for tools whose source plugin could not be determined. */
export const UNKNOWN_GROUP = '(unknown)'

/** A tool's name, description, and parameter schema — the projection from `ctx.tools.schemas()`. */
export interface ToolEntry {
  readonly name: string
  readonly description: string
  readonly parameters: unknown
}

/** One plugin group in the tree: its display name and the tools attributed to it. */
export interface PluginGroup {
  readonly name: string
  readonly tools: ToolEntry[]
}

/** A minimal schema entry returned by `ctx.tools.schemas()`. */
interface ToolSchemaEntry {
  readonly name: string
  readonly description: string
  readonly parameters: unknown
}

/** A minimal fiber shape — the cordis const enum for state is erased at compile time. */
interface FiberLike {
  readonly name: string
  readonly state: number
  readonly uid: number | null
}

/**
 * Fibre lifecycle states (cordis `FiberState` const enum, erased at compile
 * time). Matched numerically: 0 PENDING, 1 LOADING, 2 ACTIVE, 3 FAILED,
 * 4 DISPOSED, 5 UNLOADING.
 */
const STATE_ACTIVE = 2
const STATE_FAILED = 3
const STATE_DISPOSED = 4

/**
 * The tool-to-plugin attribution registry.
 *
 * Construction is an effect: it registers `internal/plugin`,
 * `internal/status`, and `tools/change` listeners on the supplied context.
 * All listeners are fibre-scoped effects and auto-clean on unload.
 */
export class ToolRegistry {
  private readonly ctx: Context
  /** pluginName → tools (preserves registration order). */
  private readonly byPlugin = new Map<string, ToolEntry[]>()
  /** toolName → pluginName (reverse index for fast removal). */
  private readonly toolToPlugin = new Map<string, string>()
  /** Last schemas() snapshot (name → entry). */
  private lastSnapshot = new Map<string, ToolEntry>()
  /** Stack of plugin names whose fibres are still loading (not yet ACTIVE/FAILED/DISPOSED). */
  private pendingPlugins: string[] = []

  constructor(ctx: Context) {
    this.ctx = ctx

    this.snapshotBaseline()

    ctx.on('internal/plugin', (fiber: Fiber) => this.onPluginEvent(fiber as unknown as FiberLike))
    ctx.on('internal/status', (fiber: Fiber) => this.onStatusEvent(fiber as unknown as FiberLike))
    ctx.on('tools/change', () => this.reconcile())
  }

  /**
   * Take the initial schemas() snapshot and attribute every visible tool to
   * {@link BASELINE_GROUP}.
   */
  private snapshotBaseline(): void {
    const schemas = this.readSchemas()
    const map = new Map<string, ToolEntry>()
    const entries: ToolEntry[] = []
    for (const s of schemas) {
      const entry: ToolEntry = { name: s.name, description: s.description, parameters: s.parameters }
      map.set(s.name, entry)
      entries.push(entry)
      this.toolToPlugin.set(s.name, BASELINE_GROUP)
    }
    this.lastSnapshot = map
    if (entries.length > 0) this.byPlugin.set(BASELINE_GROUP, entries)
  }

  /**
   * `internal/plugin` fires on fibre creation (uid just assigned) and on
   * disposal (uid cleared). Creation pushes the name onto the pending stack;
   * disposal is also handled by `internal/status` (DISPOSED), so this path
   * only guards against a missing status event.
   */
  private onPluginEvent(fiber: FiberLike): void {
    if (fiber.uid !== null) {
      // Created: push onto pending stack (deduped — a restart fires creation
      // again before the old DISPOSED clears).
      if (!this.pendingPlugins.includes(fiber.name)) {
        this.pendingPlugins.push(fiber.name)
      }
    } else {
      this.removeFromPending(fiber.name)
    }
  }

  /**
   * `internal/status` fires on every state transition. When a fibre reaches
   * ACTIVE, FAILED, or DISPOSED it is no longer "pending" — its apply() has
   * finished (or thrown) and tools registered during apply() have already
   * fired their `tools/change`.
   */
  private onStatusEvent(fiber: FiberLike): void {
    if (fiber.state === STATE_ACTIVE || fiber.state === STATE_FAILED || fiber.state === STATE_DISPOSED) {
      this.removeFromPending(fiber.name)
    }
    // On DISPOSED, also drop the plugin's group from the tree — its tools
    // auto-unregister via effect cleanup, so the next tools/change reconcile
    // will remove them, but the empty group lingers unless we clear it here.
    if (fiber.state === STATE_DISPOSED) {
      this.byPlugin.delete(fiber.name)
    }
  }

  /** Remove a plugin name from the pending stack (preserves order of the rest). */
  private removeFromPending(name: string): void {
    if (this.pendingPlugins.length === 0) return
    this.pendingPlugins = this.pendingPlugins.filter(n => n !== name)
  }

  /**
   * Diff the current `ctx.tools.schemas()` against the last snapshot and
   * update the attribution map.
   *
   * New tools → attributed to the pending-stack top (most recently created
   * loading plugin), or {@link UNKNOWN_GROUP} when the stack is empty.
   * Removed tools → deleted from the map and from their plugin group.
   * Existing tools → description / parameters refreshed in place.
   */
  private reconcile(): void {
    const schemas = this.readSchemas()
    const current = new Map<string, ToolEntry>()
    for (const s of schemas) {
      current.set(s.name, { name: s.name, description: s.description, parameters: s.parameters })
    }

    // Added or changed tools.
    for (const [name, entry] of current) {
      const prev = this.lastSnapshot.get(name)
      if (prev === undefined) {
        this.attributeNew(name, entry)
      } else {
        this.refreshExisting(name, entry)
      }
    }

    // Removed tools.
    for (const [name] of this.lastSnapshot) {
      if (!current.has(name)) {
        this.removeTool(name)
      }
    }

    this.lastSnapshot = current
  }

  /** Attribute a newly registered tool to the pending-stack top or unknown group. */
  private attributeNew(name: string, entry: ToolEntry): void {
    const top = this.pendingPlugins.length > 0
      ? this.pendingPlugins[this.pendingPlugins.length - 1]
      : undefined
    const owner: string = top ?? UNKNOWN_GROUP
    // If the tool was previously attributed (e.g. re-registered after a
    // dispose/reload), remove it from its old group first.
    const prevOwner = this.toolToPlugin.get(name)
    if (prevOwner !== undefined && prevOwner !== owner) {
      this.removeToolFromGroup(name, prevOwner)
    }
    const list = this.byPlugin.get(owner) ?? []
    list.push(entry)
    this.byPlugin.set(owner, list)
    this.toolToPlugin.set(name, owner)
  }

  /** Refresh an existing tool's description/parameters in its current group. */
  private refreshExisting(name: string, entry: ToolEntry): void {
    const owner = this.toolToPlugin.get(name)
    if (owner === undefined) {
      // Previously unseen but in the snapshot — attribute now.
      this.attributeNew(name, entry)
      return
    }
    const list = this.byPlugin.get(owner)
    if (list === undefined) return
    const idx = list.findIndex(e => e.name === name)
    if (idx >= 0) {
      list[idx] = entry
    } else {
      list.push(entry)
    }
  }

  /** Remove a tool from the attribution map and its plugin group. */
  private removeTool(name: string): void {
    const owner = this.toolToPlugin.get(name)
    if (owner === undefined) return
    this.removeToolFromGroup(name, owner)
    this.toolToPlugin.delete(name)
  }

  /** Remove a tool from one specific plugin group (helper). */
  private removeToolFromGroup(name: string, owner: string): void {
    const list = this.byPlugin.get(owner)
    if (list === undefined) return
    const idx = list.findIndex(e => e.name === name)
    if (idx >= 0) list.splice(idx, 1)
    if (list.length === 0 && owner !== BASELINE_GROUP) this.byPlugin.delete(owner)
  }

  /** Read `ctx.tools.schemas()` and narrow to the fields we use. */
  private readSchemas(): ToolSchemaEntry[] {
    const schemas = this.ctx.tools.schemas() as ToolSchemaEntry[]
    return Array.isArray(schemas) ? schemas : []
  }

  /**
   * The attribution tree: one entry per plugin group, in insertion order,
   * each carrying its tools in registration order.
   * @returns a snapshot of the current tree.
   */
  getTree(): PluginGroup[] {
    return [...this.byPlugin.entries()].map(([name, tools]) => ({
      name,
      tools: tools.map(t => ({ ...t })),
    }))
  }

  /**
   * The set of disabled tool names (delegated to {@link ToolPolicy} via the
   * host entry). Exposed for the gateway to tag each tool row with its
   * disabled state.
   */
  isDisabled(name: string, disabled: ReadonlySet<string>): boolean {
    return disabled.has(name)
  }
}

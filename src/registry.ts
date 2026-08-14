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
 * 2. **`tools/change` diff** — on every registry mutation, the registry
 *    diffs `ctx.tools.schemas()` against its last snapshot; new tools are
 *    attributed to the current pending-stack top (or {@link UNKNOWN_GROUP}
 *    when no plugin is pending).
 *
 * 3. **`ctx.registry.values()`** — enumerates all loaded plugin runtimes
 *    (name + fibers), so we can list known plugin names in the tree even
 *    when we cannot attribute specific tools to them.
 *
 * `ctx.tools.register` is deliberately NOT wrapped: the Cordis traceable
 * proxy rebinds `this.ctx` to each caller's context on every property
 * access, which is how `scopeOf(this.ctx)` routes a registration to the
 * correct scope layer. Monkey-patching the method (e.g. `.bind(proxy)`)
 * pins `this.ctx` to this plugin's unscoped context, collapsing every
 * scoped registration onto the global layer and producing "already
 * registered" collisions when agent presets mount their tool rows.
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

/** A minimal Plugin.Runtime shape from ctx.registry. */
interface PluginRuntimeLike {
  name?: string
  fibers: ReadonlyArray<{ name: string; state: number; uid: number | null }>
}

/** A minimal ctx.registry shape. */
interface RegistryLike {
  values(): Iterable<PluginRuntimeLike>
}

/**
 * Fiber lifecycle states (cordis `FiberState` const enum, erased at compile
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
  /** Last schemas() snapshot (name → entry), used for removal detection. */
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
   * The plugin currently in its `apply()` (pending-stack top), or undefined.
   * @returns the name of the most recently created loading plugin.
   */
  private currentLoadingPlugin(): string | undefined {
    return this.pendingPlugins.length > 0
      ? this.pendingPlugins[this.pendingPlugins.length - 1]
      : undefined
  }

  /**
   * Take the initial schemas() snapshot and attribute every visible tool to
   * {@link BASELINE_GROUP}. Also enumerate loaded plugins via ctx.registry
   * so their names appear as empty groups in the tree (informational).
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

    // Enumerate loaded plugins so their names appear as groups (even if empty).
    this.enumerateLoadedPlugins()
  }

  /**
   * Enumerate all loaded plugin runtimes via `ctx.registry.values()` and
   * register their names as (possibly empty) groups in the tree. This gives
   * the user visibility into all loaded plugins, even when we cannot
   * attribute specific tools to them.
   */
  private enumerateLoadedPlugins(): void {
    const registry = (this.ctx as unknown as { registry?: RegistryLike }).registry
    if (registry === undefined || typeof registry.values !== 'function') return
    try {
      for (const runtime of registry.values()) {
        const name = runtime.name
        if (name === undefined || name === 'root') continue
        // Check if any fiber of this runtime is still active.
        const hasActive = runtime.fibers.some(f => f.uid !== null && f.state !== STATE_DISPOSED)
        if (!hasActive) continue
        // Register as an empty group if not already present.
        if (!this.byPlugin.has(name)) {
          this.byPlugin.set(name, [])
        }
      }
    } catch {
      // Registry enumeration is best-effort; failures are non-fatal.
    }
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
      // Register as an empty group so it appears in the tree immediately.
      if (!this.byPlugin.has(fiber.name) && fiber.name !== 'root') {
        this.byPlugin.set(fiber.name, [])
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
    // On ACTIVE, re-enumerate plugins to catch any that loaded while we
    // were processing.
    if (fiber.state === STATE_ACTIVE) {
      this.enumerateLoadedPlugins()
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
   * New tools → attributed via pending attribution (from register wrapper)
   *   or pending-stack top, or {@link UNKNOWN_GROUP}.
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

  /** Attribute a newly registered tool using pending attribution or pending-stack top. */
  private attributeNew(name: string, entry: ToolEntry): void {
    // Attribute to the plugin currently in its apply() (pending-stack top),
    // or UNKNOWN_GROUP when no plugin is pending.
    const owner: string = this.currentLoadingPlugin() ?? UNKNOWN_GROUP

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
    // Don't delete empty groups — they may represent loaded plugins with
    // no tools yet (from enumerateLoadedPlugins / internal/plugin).
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

  /**
   * No-op disposal hook. All listeners are registered through `ctx.on()`
   * (fibre-scoped effects) and auto-clean on unload; there is no manually
   * installed wrapper to restore.
   */
  dispose(): void {
    // intentionally empty — listeners are fibre-scoped effects.
  }
}

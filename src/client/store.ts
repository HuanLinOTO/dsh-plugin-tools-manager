/**
 * store.ts — the tools-manager card's state over the `/tools-manager/api` route.
 *
 * The store reads the full tool tree via `/tools-manager/api/list` and writes
 * individual tool toggles via `/tools-manager/api/set`. State publishes through
 * a `SnapshotStore` so the card binds a selector hook via `bindSnapshotSelector`.
 *
 * @module dsh-tools-manager/client/store
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** One tool row in the tree. */
export interface ToolRow {
  name: string
  description: string
  disabled: boolean
}

/** One plugin group in the tree. */
export interface PluginGroupRow {
  name: string
  tools: ToolRow[]
}

/** Wire view from `/tools-manager/api/list|set`. */
interface TreeView {
  plugins: PluginGroupRow[]
}

/** Standard JSON response envelope from the HTTP route. */
interface ApiEnvelope {
  ok?: boolean
  value?: TreeView
  error?: { code?: string; message?: string }
}

/** Card state published through the snapshot store. */
export interface ToolsManagerCardState {
  status: 'idle' | 'loading' | 'ready'
  loaded: boolean
  available: boolean
  plugins: PluginGroupRow[]
  /** Tool currently being toggled (name), if any. */
  pendingToggle: string | undefined
  /** Last toggle error message, if any. */
  toggleError: string | undefined
}

/** Initial empty state. */
function initialState(): ToolsManagerCardState {
  return {
    status: 'idle',
    loaded: false,
    available: false,
    plugins: [],
    pendingToggle: undefined,
    toggleError: undefined,
  }
}

/**
 * The card's stateful controller over the tools-manager HTTP route.
 *
 * The store publishes through a `SnapshotStore` because slot components read
 * through a snapshot selector; the HTTP read and local toggles both change
 * underneath, and every projection is rebuilt from the two together.
 */
export class ToolsManagerCardController {
  readonly store: SnapshotStore<ToolsManagerCardState>
  loaded = false
  private generation = 0

  constructor() {
    this.store = createSnapshotStore<ToolsManagerCardState>(initialState())
    void this.load()
  }

  /**
   * Read the full tool tree from the Host HTTP route and publish it.
   * @returns settlement after the read.
   */
  async load(): Promise<void> {
    const gen = ++this.generation
    this.store.update((s) => { s.status = 'loading' })

    let tree: TreeView | undefined
    try {
      const response = await fetch('/tools-manager/api/list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      if (response.ok) {
        const parsed: ApiEnvelope | null = await response.json().catch(() => null)
        if (parsed?.ok === true && parsed.value !== undefined) {
          tree = parsed.value
        }
      }
    } catch {
      // Channel unreachable: leave the card unavailable; not a hard error.
    }
    if (gen !== this.generation) return

    if (tree === undefined) {
      this.store.update((s) => {
        s.status = 'ready'
        s.available = false
      })
      return
    }
    this.loaded = true
    this.store.update((s) => {
      s.status = 'ready'
      s.available = true
      s.plugins = tree!.plugins
      s.pendingToggle = undefined
      s.toggleError = undefined
    })
  }

  /**
   * Toggle one tool's disabled state and refresh the tree.
   * @param toolName - the tool to toggle.
   * @param disabled - the new disabled state.
   */
  toggle(toolName: string, disabled: boolean): void {
    void this.doToggle(toolName, disabled)
  }

  private async doToggle(toolName: string, disabled: boolean): Promise<void> {
    const gen = ++this.generation
    this.store.update((s) => {
      s.pendingToggle = toolName
      s.toggleError = undefined
    })
    try {
      const response = await fetch('/tools-manager/api/set', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toolName, disabled }),
      })
      if (gen !== this.generation) return
      if (!response.ok) {
        const parsed: ApiEnvelope | null = await response.json().catch(() => null)
        const message = parsed?.error?.message ?? `HTTP ${response.status}`
        this.store.update((s) => { s.toggleError = message; s.pendingToggle = undefined })
        return
      }
      const parsed: ApiEnvelope | null = await response.json().catch(() => null)
      if (parsed?.ok !== true || parsed.value === undefined) {
        const message = parsed?.error?.message ?? 'unknown error'
        this.store.update((s) => { s.toggleError = message; s.pendingToggle = undefined })
        return
      }
      this.store.update((s) => {
        s.plugins = parsed.value!.plugins
        s.pendingToggle = undefined
        s.toggleError = undefined
      })
    } catch (error) {
      if (gen !== this.generation) return
      this.store.update((s) => {
        s.toggleError = error instanceof Error ? error.message : String(error)
        s.pendingToggle = undefined
      })
    }
  }
}

/** Refresh the store only after its first load (background invalidation gate). */
export function refreshIfLoaded(controller: ToolsManagerCardController): void {
  if (controller.loaded) void controller.load()
}

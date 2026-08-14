/**
 * store.ts — the tools-manager card's state over the `/tools-manager/api` route.
 *
 * The store reads the full tool tree via `/tools-manager/api/list` and writes
 * individual tool toggles via `/tools-manager/api/set`. State publishes through
 * a `SnapshotStore` so the card binds a selector hook via `bindSnapshotSelector`.
 *
 * @module dsh-tools-manager/client/store
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** Initial empty state. */
function initialState() {
    return {
        status: 'idle',
        loaded: false,
        available: false,
        plugins: [],
        pendingToggle: undefined,
        toggleError: undefined,
    };
}
/**
 * The card's stateful controller over the tools-manager HTTP route.
 *
 * The store publishes through a `SnapshotStore` because slot components read
 * through a snapshot selector; the HTTP read and local toggles both change
 * underneath, and every projection is rebuilt from the two together.
 */
export class ToolsManagerCardController {
    store;
    loaded = false;
    generation = 0;
    constructor() {
        this.store = createSnapshotStore(initialState());
        void this.load();
    }
    /**
     * Read the full tool tree from the Host HTTP route and publish it.
     * @returns settlement after the read.
     */
    async load() {
        const gen = ++this.generation;
        this.store.update((s) => { s.status = 'loading'; });
        let tree;
        try {
            const response = await fetch('/tools-manager/api/list', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: '{}',
            });
            if (response.ok) {
                const parsed = await response.json().catch(() => null);
                if (parsed?.ok === true && parsed.value !== undefined) {
                    tree = parsed.value;
                }
            }
        }
        catch {
            // Channel unreachable: leave the card unavailable; not a hard error.
        }
        if (gen !== this.generation)
            return;
        if (tree === undefined) {
            this.store.update((s) => {
                s.status = 'ready';
                s.available = false;
            });
            return;
        }
        this.loaded = true;
        this.store.update((s) => {
            s.status = 'ready';
            s.available = true;
            s.plugins = tree.plugins;
            s.pendingToggle = undefined;
            s.toggleError = undefined;
        });
    }
    /**
     * Toggle one tool's disabled state and refresh the tree.
     * @param toolName - the tool to toggle.
     * @param disabled - the new disabled state.
     */
    toggle(toolName, disabled) {
        void this.doToggle(toolName, disabled);
    }
    async doToggle(toolName, disabled) {
        const gen = ++this.generation;
        this.store.update((s) => {
            s.pendingToggle = toolName;
            s.toggleError = undefined;
        });
        try {
            const response = await fetch('/tools-manager/api/set', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ toolName, disabled }),
            });
            if (gen !== this.generation)
                return;
            if (!response.ok) {
                const parsed = await response.json().catch(() => null);
                const message = parsed?.error?.message ?? `HTTP ${response.status}`;
                this.store.update((s) => { s.toggleError = message; s.pendingToggle = undefined; });
                return;
            }
            const parsed = await response.json().catch(() => null);
            if (parsed?.ok !== true || parsed.value === undefined) {
                const message = parsed?.error?.message ?? 'unknown error';
                this.store.update((s) => { s.toggleError = message; s.pendingToggle = undefined; });
                return;
            }
            this.store.update((s) => {
                s.plugins = parsed.value.plugins;
                s.pendingToggle = undefined;
                s.toggleError = undefined;
            });
        }
        catch (error) {
            if (gen !== this.generation)
                return;
            this.store.update((s) => {
                s.toggleError = error instanceof Error ? error.message : String(error);
                s.pendingToggle = undefined;
            });
        }
    }
}
/** Refresh the store only after its first load (background invalidation gate). */
export function refreshIfLoaded(controller) {
    if (controller.loaded)
        void controller.load();
}

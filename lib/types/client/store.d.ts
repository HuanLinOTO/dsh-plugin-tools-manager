/**
 * store.ts — the tools-manager card's state over the `/tools-manager/api` route.
 *
 * The store reads the full tool tree via `/tools-manager/api/list` and writes
 * individual tool toggles via `/tools-manager/api/set`. State publishes through
 * a `SnapshotStore` so the card binds a selector hook via `bindSnapshotSelector`.
 *
 * @module dsh-tools-manager/client/store
 */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** One tool row in the tree. */
export interface ToolRow {
    name: string;
    description: string;
    disabled: boolean;
}
/** One plugin group in the tree. */
export interface PluginGroupRow {
    name: string;
    tools: ToolRow[];
}
/** Card state published through the snapshot store. */
export interface ToolsManagerCardState {
    status: 'idle' | 'loading' | 'ready';
    loaded: boolean;
    available: boolean;
    plugins: PluginGroupRow[];
    /** Tool currently being toggled (name), if any. */
    pendingToggle: string | undefined;
    /** Last toggle error message, if any. */
    toggleError: string | undefined;
}
/**
 * The card's stateful controller over the tools-manager HTTP route.
 *
 * The store publishes through a `SnapshotStore` because slot components read
 * through a snapshot selector; the HTTP read and local toggles both change
 * underneath, and every projection is rebuilt from the two together.
 */
export declare class ToolsManagerCardController {
    readonly store: SnapshotStore<ToolsManagerCardState>;
    loaded: boolean;
    private generation;
    constructor();
    /**
     * Read the full tool tree from the Host HTTP route and publish it.
     * @returns settlement after the read.
     */
    load(): Promise<void>;
    /**
     * Toggle one tool's disabled state and refresh the tree.
     * @param toolName - the tool to toggle.
     * @param disabled - the new disabled state.
     */
    toggle(toolName: string, disabled: boolean): void;
    private doToggle;
}
/** Refresh the store only after its first load (background invalidation gate). */
export declare function refreshIfLoaded(controller: ToolsManagerCardController): void;

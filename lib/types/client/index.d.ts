/**
 * dsh-tools-manager — browser half.
 *
 * Registers the `tools-manager` card into the shell-declared
 * `settings.plugin.item` slot (the plugin-config settings page). The card's
 * store reads/writes the tool tree through the host gateway
 * `/tools-manager/api/list|set` HTTP channel, and keeps fresh on pushed
 * invalidations.
 *
 * Export discipline: the client half value-imports ONLY the frozen platform
 * module table (CLIENT_EXTERNALS); every other `@deepseek-ai/*` import is
 * type-only (erased at build) — values arrive via cordis injection.
 *
 * @module @huanlin/dsh-plugin-tools-manager/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type ToolsManagerKey } from './locales.ts';
export type { ToolsManagerCardInjected, ToolsManagerCardProps } from './ToolsManagerCard.tsx';
export type { ToolsManagerKey } from './locales.ts';
export type { ToolsManagerCardState, ToolsManagerCardController, ToolRow, PluginGroupRow } from './store.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'tools-manager': ToolsManagerKey;
    }
}
/** Required services (cordis fiber inject). */
export declare const inject: string[];
/**
 * Register the tools-manager card once the `settings.plugin.item` declaration
 * is on the ledger, wire its store to the connection, and keep it fresh on
 * every pushed invalidation.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;

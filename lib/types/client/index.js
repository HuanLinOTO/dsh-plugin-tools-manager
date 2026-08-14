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
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react';
import { ToolsManagerCard } from "./ToolsManagerCard.js";
import { ToolsManagerCardController, refreshIfLoaded } from "./store.js";
import { en, NS, zh } from "./locales.js";
/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'connection'];
/**
 * Register the tools-manager card once the `settings.plugin.item` declaration
 * is on the ledger, wire its store to the connection, and keep it fresh on
 * every pushed invalidation.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'tools-manager: dictionaries');
    const controller = new ToolsManagerCardController();
    const useSnapshot = bindSnapshotSelector(controller.store);
    ctx.effect(() => {
        let pending = false;
        const refresh = () => {
            if (pending)
                return;
            pending = true;
            queueMicrotask(() => {
                pending = false;
                refreshIfLoaded(controller);
            });
        };
        const disposers = [ctx.on('connection/reset', refresh)];
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'tools-manager: pushed invalidations');
    ctx.slots.inject('settings.plugin.item', function* () {
        yield ctx.slots.register({
            name: 'settings.plugin.item',
            id: 'dsh-tools-manager',
            order: 60, // after interpreters (50)
            locale: NS,
            inject: () => ({ controller, useSnapshot }),
        }, ToolsManagerCard);
    });
}

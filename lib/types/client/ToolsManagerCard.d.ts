/**
 * ToolsManagerCard — the `settings.plugin.item` card for the tools-manager.
 *
 * Renders a collapsible card with the full tool tree grouped by source plugin.
 * Each tool row has a toggle button to enable/disable the tool globally.
 * The card reads/writes through the `/tools-manager/api/list|set` HTTP route.
 *
 * @module dsh-tools-manager/client/ToolsManagerCard
 */
import { type ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-web-react';
import { ToolsManagerCardController, type ToolsManagerCardState } from './store.ts';
import type { ToolsManagerKey } from './locales.ts';
/** Injected dependencies of {@link ToolsManagerCard} (slot `inject`). */
export interface ToolsManagerCardInjected {
    controller: ToolsManagerCardController;
    useSnapshot: SnapshotSelectorHook<ToolsManagerCardState>;
}
/** Props the renderer binds for the card. */
export type ToolsManagerCardProps = PropsRuntime<'settings.plugin.item'> & PropsLocale<'tools-manager'> & InjectFace<ToolsManagerCardInjected>;
/**
 * Render the tools-manager card inside the plugin-config section.
 * @param props - slot-delivered injected dependencies and the synthesized t seat.
 * @returns the card.
 */
export declare function ToolsManagerCard(props: ToolsManagerCardProps): ReactNode;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'tools-manager': ToolsManagerKey;
    }
}

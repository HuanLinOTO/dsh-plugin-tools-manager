import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ToolsManagerCard — the `settings.plugin.item` card for the tools-manager.
 *
 * Renders a collapsible card with the full tool tree grouped by source plugin.
 * Each tool row has a toggle button to enable/disable the tool globally.
 * The card reads/writes through the `/tools-manager/api/list|set` HTTP route.
 *
 * @module dsh-tools-manager/client/ToolsManagerCard
 */
import { useState } from 'react';
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import styles from './ToolsManagerCard.module.css';
/**
 * Render the tools-manager card inside the plugin-config section.
 * @param props - slot-delivered injected dependencies and the synthesized t seat.
 * @returns the card.
 */
export function ToolsManagerCard(props) {
    const { controller, useSnapshot, t } = props;
    const state = useSnapshot(snapshot => snapshot);
    if (state.status === 'idle')
        void controller.load();
    const [userOpen, setUserOpen] = useState(false);
    const degraded = state.status === 'ready' && !state.available;
    const open = userOpen || degraded;
    const title = t('title');
    const header = (_jsxs("button", { type: "button", className: styles.header, "aria-expanded": open, "aria-label": `${t(open ? 'collapse' : 'expand')}: ${title}`, onClick: () => { if (!degraded)
            setUserOpen(!userOpen); }, children: [_jsxs("span", { className: styles.headText, children: [_jsx("span", { className: styles.name, children: title }), _jsx("span", { className: styles.description, children: t('intro') })] }), _jsx(IconChevronDownOutline14, { className: open ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron })] }));
    let body;
    if (degraded) {
        body = (_jsxs("div", { className: styles.body, children: [_jsx("p", { className: styles.notice, role: "status", children: t('namespaceUnavailable') }), _jsx("div", { className: styles.footer, children: _jsx("button", { type: "button", className: styles.retry, onClick: () => { void controller.load(); }, children: t('retry') }) })] }));
    }
    else if (state.status === 'loading' || !state.available) {
        body = _jsx("div", { className: styles.body, children: _jsx("p", { className: styles.loading, children: t('loading') }) });
    }
    else {
        body = (_jsxs("div", { className: styles.body, children: [state.plugins.length === 0 ? (_jsx("p", { className: styles.noTools, children: t('noTools') })) : (_jsx("div", { className: styles.tree, children: state.plugins.map(group => (_jsx(ToolGroupView, { group: group, t: t, pendingToggle: state.pendingToggle, onToggle: (toolName, disabled) => { controller.toggle(toolName, disabled); } }, group.name))) })), state.toggleError ? (_jsx("p", { className: styles.toggleError, role: "status", children: state.toggleError })) : null] }));
    }
    return (_jsxs("li", { className: open ? `${styles.card} ${styles.cardOpen}` : styles.card, children: [header, open ? body : null] }));
}
/** Render one plugin group and its tool rows. */
function ToolGroupView(props) {
    const { group, t, pendingToggle, onToggle } = props;
    return (_jsxs("div", { className: styles.group, children: [_jsxs("div", { className: styles.groupHeader, children: [group.name, " ", _jsxs("span", { className: styles.toolDesc, children: ["(", group.tools.length, ")"] })] }), group.tools.map(tool => (_jsx(ToolRowView, { tool: tool, t: t, pending: pendingToggle === tool.name, onToggle: () => { onToggle(tool.name, !tool.disabled); } }, tool.name)))] }));
}
/** Render one tool row with its toggle button. */
function ToolRowView(props) {
    const { tool, t, pending, onToggle } = props;
    return (_jsxs("div", { className: styles.toolRow, children: [_jsxs("div", { className: styles.toolInfo, children: [_jsx("div", { className: styles.toolName, children: tool.name }), tool.description ? _jsx("div", { className: styles.toolDesc, children: tool.description }) : null] }), _jsxs("div", { className: styles.toggle, children: [_jsx("button", { type: "button", className: `${styles.toggleButton} ${tool.disabled ? styles.toggleOff : styles.toggleOn}`, disabled: pending, onClick: onToggle, children: tool.disabled ? t('enable') : t('disable') }), _jsx("span", { className: styles.toggleLabel, children: tool.disabled ? t('disabled') : t('enabled') })] })] }));
}

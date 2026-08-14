/**
 * policy.ts — global tool enable/disable, two layers consistent.
 *
 * One `disabled: Set<string>` drives both seams so the model-visible schema
 * and the execution gate can never drift:
 *
 *   | Layer            | Seam                          | Effect |
 *   |------------------|-------------------------------|--------|
 *   | Hidden (model)   | `system-prompt/assemble`      | Filter `assembly.tools`, return transformed assembly |
 *   | Denied (execute) | `ctx.tools.guard()` (plain)   | Return a denial reason for disabled tools |
 *
 * `restrict()` is intentionally NOT used: it requires a scoped ctx and cannot
 * express a process-global filter. `guard()` is monotonic and applies to
 * every agent's calls; `system-prompt/assemble` is a waterfall that can
 * transform `assembly.tools` and delegate the rest to downstream listeners.
 *
 * @module dsh-tools-manager/policy
 */
import type { Context } from '@deepseek-ai/cordis';
/** Canonical denial reason returned by the guard for a disabled tool. */
export declare const DISABLED_REASON_PREFIX = "tool is disabled by tools-manager:";
/**
 * Build the canonical denial reason string for a disabled tool.
 * @param toolName - the disabled tool's name.
 * @returns the reason handed to {@link ToolGuard}.
 */
export declare function disabledReason(toolName: string): string;
/**
 * Install the two-layer enable/disable policy.
 *
 * Both layers read the same `disabled` thunk so they stay consistent across
 * settings changes without any extra notification wiring: the host entry
 * swaps the thunk's backing store in place when settings commit, and the
 * next assembly / guard call reads the fresh value.
 * @param ctx - host context carrying `tools` and `systemPrompt`.
 * @param disabled - a thunk returning the current disabled-name set.
 * @returns the disposer that removes both layers.
 */
export declare function installPolicy(ctx: Context, disabled: () => ReadonlySet<string>): () => void;
/**
 * Pure helper: filter a tool schema list by a disabled-name set.
 * Exported for unit tests so the filter logic can be exercised without
 * spinning up a cordis context.
 * @param tools - the input tool schemas.
 * @param disabled - the disabled-name set.
 * @returns the input list with disabled tools removed.
 */
export declare function filterTools<T extends {
    name: string;
}>(tools: readonly T[], disabled: ReadonlySet<string>): T[];

/**
 * config.ts — composition-layer schema and resolved config shape.
 *
 * The composition `Config` (cordis.patch.yml) is the first-boot seed; the
 * settings user layer composes on top of it at runtime. `resolveConfig`
 * normalises any combination of partial source values into a fully-populated
 * {@link ResolvedConfig}.
 *
 * @module dsh-tools-manager/config
 */
import z from 'schemastery';
/** Schemastery schema for the composition entry and the `tools-manager` settings namespace. */
export const Config = z.object({
    disabled: z.array(z.string()).default([]).description('Globally disabled tool names; hidden from the model and denied at execution.'),
});
/**
 * Resolve config with fallbacks for missing / invalid values.
 * @param config - raw config from cordis.yml or settings scope.
 * @returns a fully-populated {@link ResolvedConfig}.
 */
export function resolveConfig(config) {
    const disabled = Array.isArray(config.disabled)
        ? config.disabled.filter((name) => typeof name === 'string' && name !== '')
        : [];
    return { disabled };
}

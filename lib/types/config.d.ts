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
/** Composition + user-layer config shape (all fields optional at the boundary). */
export interface Config {
    disabled?: string[];
}
/** Fully-resolved config with fallbacks applied. */
export interface ResolvedConfig {
    disabled: string[];
}
/** Schemastery schema for the composition entry and the `tools-manager` settings namespace. */
export declare const Config: z<Config>;
/**
 * Resolve config with fallbacks for missing / invalid values.
 * @param config - raw config from cordis.yml or settings scope.
 * @returns a fully-populated {@link ResolvedConfig}.
 */
export declare function resolveConfig(config: Config): ResolvedConfig;

/**
 * Row-config key material for the Plugins page registration.
 *
 * `plugins.row.config` is a keyed slot: the Plugins page matches the key by
 * exact string — `<package name>#<row id>` with the row id taken verbatim
 * from the `id` of the insert row in `cordis.patch.yml` (the page's host
 * side pushes `rowId: row.id`; a drifted key leaves the row silently without
 * a configure control). Three identifiers must stay one value `tools-manager`:
 * the patch row id, the host plugin's exported `name`, and the settings entry
 * id the gateway writes through (`settings.update('tools-manager', …)`).
 *
 * Kept in a dependency-free leaf module so `tests/row-config-key.spec.ts` can
 * pin it against `cordis.patch.yml` without pulling the client bundle graph.
 *
 * @module dsh-tools-manager/client/row-config-key
 */

/** The bundle's package name (peer of the `name` in `cordis.patch.yml`). */
export const PACKAGE_NAME = '@huanlin/dsh-plugin-tools-manager'

/** The row id the bundle's `cordis.patch.yml` insert row declares; doubles as
 * the host plugin `name` and the settings entry id. */
export const ENTRY_ID = 'tools-manager'

/** `plugins.row.config` key: the bundle's package name `#` the row id. */
export const ROW_KEY = `${PACKAGE_NAME}#${ENTRY_ID}`

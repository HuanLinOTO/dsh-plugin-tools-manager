/**
 * Key-discipline guard for the `plugins.row.config` registration.
 *
 * The Plugins page matches the keyed slot by exact string
 * (`<package name>#<row id>`, the row id verbatim from `cordis.patch.yml`);
 * a drifted key leaves the row silently without a configure control. These
 * tests pin the three identifiers that must stay one value: the patch row
 * id, the host plugin's exported `name` / settings entry id, and the key
 * derived from them.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ENTRY_ID, PACKAGE_NAME, ROW_KEY } from '../src/client/row-config-key.ts'
import { SETTINGS_NAMESPACE } from '../src/settings.ts'
import { name as hostName } from '../src/index.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('plugins.row.config key discipline', () => {
  it('the key is the package name # the row id', () => {
    expect(ROW_KEY).toBe(`${PACKAGE_NAME}#${ENTRY_ID}`)
    expect(ROW_KEY).toBe('@huanlin/dsh-plugin-tools-manager#tools-manager')
  })

  it('the row id is the id the cordis.patch.yml insert row declares verbatim', () => {
    const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
    // The bundle layer inserts exactly one plugin row: `- id: <id>`.
    const ids = [...patch.matchAll(/^\s*- id:\s*(\S+)\s*$/gm)].map(match => match[1])
    expect(ids).toEqual([ENTRY_ID])
  })

  it('the patch row names this package (the Loader resolves it from profile node_modules)', () => {
    const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name: string }
    expect(pkg.name).toBe(PACKAGE_NAME)
    expect(patch).toContain(`name: '${PACKAGE_NAME}'`)
  })

  it('the host plugin name and the settings entry id equal the row id', () => {
    expect(hostName).toBe(ENTRY_ID)
    expect(SETTINGS_NAMESPACE).toBe(ENTRY_ID)
  })
})

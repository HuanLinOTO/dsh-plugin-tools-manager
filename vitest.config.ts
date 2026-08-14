import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

/**
 * Resolve the dsh source tree the dev-time link farm was built from — the
 * same order as interpreters' vitest config ($DSH_SOURCE_DIR first, then
 * $DSH_HOME/source/current, then the default home location).
 */
function resolveSourceRoot(): string {
  const candidates = [
    process.env.DSH_SOURCE_DIR,
    process.env.DSH_HOME ? join(process.env.DSH_HOME, 'source', 'current') : undefined,
    join(homedir(), '.dsh', 'source', 'current'),
  ].filter((candidate): candidate is string => candidate !== undefined)
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return ''
}

const sourceRoot = resolveSourceRoot()

export default defineConfig({
  resolve: {
    alias: sourceRoot
      ? [
          {
            find: '@deepseek-ai/dsh-client-runtime/client',
            replacement: join(sourceRoot, 'packages', 'client', 'runtime', 'src', 'client', 'index.ts'),
          },
        ]
      : [],
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    pool: 'forks',
  },
})

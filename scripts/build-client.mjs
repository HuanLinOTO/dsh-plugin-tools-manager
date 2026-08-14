#!/usr/bin/env node
/**
 * Client bundle build for dsh-tools-manager (mirror of dsh-interpreters'
 * scripts/build-client.mjs): emits the closure-factory CJS artifact the dsh
 * web loader consumes —
 * `window.__ModuleLoader__.load({ id: '@huanlin/dsh-plugin-tools-manager', factory: (require) => {
 *   return module.exports; } })`.
 */

import { build } from 'esbuild'
import { transform } from 'lightningcss'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const ID = '@huanlin/dsh-plugin-tools-manager'
const ENTRY = 'src/client/index.ts'
const OUT_FILE = 'lib/client.js'

const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-client-runtime/client',
]

const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'
const CSS_NAMESPACE = 'dsh-css-modules'

const result = await build({
  entryPoints: [ENTRY],
  outfile: OUT_FILE,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  external: [...CLIENT_EXTERNALS],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
  plugins: [{
    name: 'dsh-client-bundle-purity',
    setup(build) {
      build.onResolve({ filter: /^@deepseek-ai\// }, (args) => {
        if (CLIENT_EXTERNALS.includes(args.path)) return undefined
        throw new Error(
          `client bundle purity: "${args.path}" is not a platform module (CLIENT_EXTERNALS) — `
          + 'cross-plugin value imports are forbidden; collaborate through cordis services (type-only imports are erased and never reach this gate)',
        )
      })
    },
  }, {
    name: 'dsh-css-modules-inline',
    setup(build) {
      build.onResolve({ filter: /\.module\.css$/ }, (args) => {
        return { path: CSS_VIRTUAL_PREFIX + join(args.resolveDir, args.path) + CSS_VIRTUAL_SUFFIX, namespace: CSS_NAMESPACE }
      })
      build.onLoad({ filter: /^\0dsh-css:/, namespace: CSS_NAMESPACE }, (args) => {
        const fileId = args.path.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
        const source = readFileSync(fileId)
        const { code, exports: cssExports } = transform({
          filename: fileId,
          code: source,
          cssModules: { pattern: '[hash]_[local]' },
          minify: true,
        })
        const classMap = {}
        for (const [local, exp] of Object.entries(cssExports ?? {}).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) classMap[local] = exp.name
        const tagId = `${ID}/${basename(fileId)}`
        const contents = [
          `const css = ${JSON.stringify(code.toString())};`,
          `const tagId = ${JSON.stringify(tagId)};`,
          `if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {`,
          `  const tag = document.createElement('style');`,
          `  tag.dataset.plugin = ${JSON.stringify(ID)};`,
          `  tag.dataset.pluginCss = tagId;`,
          `  tag.textContent = css;`,
          `  document.head.appendChild(tag);`,
          `}`,
          `export default ${JSON.stringify(classMap)};`,
        ].join('\n')
        return { loader: 'js', contents, watchFiles: [fileId] }
      })
    },
  }],
})

if (result.errors.length > 0) {
  throw new Error(`client bundle build failed:\n${result.errors.map((e) => e.text).join('\n')}`)
}

const bundleText = readFileSync(OUT_FILE, 'utf8')
  .replace(/^\/\/ dsh-css-modules:\x00[^\n]*\n/gm, '')
writeFileSync(OUT_FILE, bundleText)
if (!bundleText.includes('window.__ModuleLoader__.load(') || !bundleText.includes(JSON.stringify(ID))) {
  throw new Error('client bundle contract: the closure-factory load handoff with the plugin id is missing')
}
for (const match of bundleText.matchAll(/require\(\s*["'](@deepseek-ai\/[^"']+)["']\s*\)/g)) {
  const specifier = match[1]
  if (!CLIENT_EXTERNALS.includes(specifier)) {
    throw new Error(`client bundle contract: "${specifier}" VALUE import survived the purity gate`)
  }
}
if (bundleText.includes('import.meta') || /(^|\n)\s*(import|export)\s/.test(bundleText)) {
  throw new Error('client bundle contract: emitted bundle contains import.meta / ESM statements — the classic-script loader would fail to parse it')
}
if (bundleText.includes('\u0000')) {
  throw new Error('client bundle contract: emitted bundle contains a NUL byte — esbuild virtual-module comment not stripped')
}

console.log(`build-client: ${ENTRY} -> ${OUT_FILE} (closure-factory CJS)`)

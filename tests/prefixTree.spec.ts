/**
 * prefixTree.spec.ts — unit tests for the prefix tree builder.
 *
 * Tests:
 *   - buildPrefixTree: splits on `__` and `_` correctly
 *   - buildPrefixTree: groups tools with shared prefixes
 *   - buildPrefixTree: handles tools with no separator
 *   - collectLeafNames: gathers all tool names under a node
 *   - countLeaves: counts total and disabled leaves
 *
 * @module dsh-tools-manager/tests/prefixTree
 */

import { describe, it, expect } from 'vitest'
import { buildPrefixTree, collectLeafNames, countLeaves, type TreeNode } from '../src/client/prefixTree.ts'

describe('buildPrefixTree', () => {
  it('groups MCP tools by `__` namespace', () => {
    const tree = buildPrefixTree([
      { name: 'mcp__github__create_issue', description: 'a', disabled: false },
      { name: 'mcp__github__list_repos', description: 'b', disabled: false },
      { name: 'mcp__filesystem__read_file', description: 'c', disabled: true },
    ])
    // Top level: one node "mcp"
    expect(tree).toHaveLength(1)
    const mcp = tree[0]!
    expect(mcp.kind).toBe('node')
    if (mcp.kind !== 'node') return
    expect(mcp.label).toBe('mcp')
    // children sorted alphabetically: filesystem, github
    expect(mcp.children).toHaveLength(2)
    const filesystem = mcp.children[0]!
    expect(filesystem.kind).toBe('node')
    if (filesystem.kind !== 'node') return
    expect(filesystem.label).toBe('filesystem')

    const github = mcp.children[1]!
    expect(github.kind).toBe('node')
    if (github.kind !== 'node') return
    expect(github.label).toBe('github')
    // children sorted alphabetically: create_issue, list_repos
    expect(github.children).toHaveLength(2)
    if (github.children[0]!.kind === 'leaf') {
      expect(github.children[0]!.name).toBe('mcp__github__create_issue')
    }
  })

  it('splits single-underscore tools into prefix groups', () => {
    const tree = buildPrefixTree([
      { name: 'run_python', description: 'py', disabled: false },
      { name: 'run_node', description: 'nd', disabled: false },
      { name: 'web_search', description: 'ws', disabled: false },
      { name: 'web_fetch', description: 'wf', disabled: true },
    ])
    // Top level: "run" and "web" nodes
    expect(tree).toHaveLength(2)
    const run = tree[0]!
    expect(run.kind).toBe('node')
    if (run.kind !== 'node') return
    expect(run.label).toBe('run')
    expect(run.children).toHaveLength(2) // python, node

    const web = tree[1]!
    expect(web.kind).toBe('node')
    if (web.kind !== 'node') return
    expect(web.label).toBe('web')
    expect(web.children).toHaveLength(2) // search, fetch
  })

  it('places tools with no separator as top-level leaves', () => {
    const tree = buildPrefixTree([
      { name: 'bash', description: 'shell', disabled: false },
      { name: 'edit', description: 'editor', disabled: true },
    ])
    expect(tree).toHaveLength(2)
    expect(tree[0]!.kind).toBe('leaf')
    expect(tree[1]!.kind).toBe('leaf')
  })

  it('sorts internal nodes before leaves, then alphabetically', () => {
    const tree = buildPrefixTree([
      { name: 'zebra_tool', description: 'z', disabled: false },
      { name: 'alpha', description: 'a', disabled: false },
      { name: 'beta_tool', description: 'b', disabled: false },
    ])
    // "beta" node comes before "zebra" node (both internal), then "alpha" leaf
    expect(tree[0]!.kind).toBe('node')
    expect(tree[1]!.kind).toBe('node')
    expect(tree[2]!.kind).toBe('leaf')
    if (tree[0]!.kind === 'node') expect(tree[0]!.label).toBe('beta')
    if (tree[1]!.kind === 'node') expect(tree[1]!.label).toBe('zebra')
    if (tree[2]!.kind === 'leaf') expect(tree[2]!.name).toBe('alpha')
  })

  it('handles empty input', () => {
    expect(buildPrefixTree([])).toEqual([])
  })

  it('handles mixed `__` and `_` separators', () => {
    const tree = buildPrefixTree([
      { name: 'mcp__my_server__do_thing', description: 'x', disabled: false },
    ])
    // mcp → my → server → do_thing (last segment kept whole)
    let node: TreeNode | undefined = tree[0]
    expect(node?.kind).toBe('node')
    if (node?.kind === 'node') {
      expect(node.label).toBe('mcp')
      node = node.children[0]
    }
    expect(node?.kind).toBe('node')
    if (node?.kind === 'node') {
      expect(node.label).toBe('my')
      node = node.children[0]
    }
    expect(node?.kind).toBe('node')
    if (node?.kind === 'node') {
      expect(node.label).toBe('server')
      node = node.children[0]
    }
    expect(node?.kind).toBe('leaf')
    if (node?.kind === 'leaf') {
      expect(node.name).toBe('mcp__my_server__do_thing')
    }
  })
})

describe('collectLeafNames', () => {
  it('collects all tool names from a node', () => {
    const tree = buildPrefixTree([
      { name: 'mcp__github__create_issue', description: 'a', disabled: false },
      { name: 'mcp__github__list_repos', description: 'b', disabled: false },
      { name: 'mcp__filesystem__read_file', description: 'c', disabled: false },
    ])
    const mcpNode = tree[0]!
    const names = collectLeafNames(mcpNode)
    expect(names.sort()).toEqual(['mcp__filesystem__read_file', 'mcp__github__create_issue', 'mcp__github__list_repos'])
  })

  it('returns a single-element array for a leaf', () => {
    const tree = buildPrefixTree([
      { name: 'bash', description: 'sh', disabled: false },
    ])
    expect(collectLeafNames(tree[0]!)).toEqual(['bash'])
  })
})

describe('countLeaves', () => {
  it('counts total and disabled leaves under a node', () => {
    const tree = buildPrefixTree([
      { name: 'mcp__github__create_issue', description: 'a', disabled: false },
      { name: 'mcp__github__list_repos', description: 'b', disabled: true },
      { name: 'mcp__filesystem__read_file', description: 'c', disabled: true },
    ])
    const mcpNode = tree[0]!
    const counts = countLeaves(mcpNode)
    expect(counts.total).toBe(3)
    expect(counts.disabled).toBe(2)
  })

  it('returns {total:1, disabled:0/1} for a leaf', () => {
    const tree = buildPrefixTree([
      { name: 'enabledtool', description: 'a', disabled: false },
      { name: 'disabledtool', description: 'b', disabled: true },
    ])
    // Sorted alphabetically: disabledtool (d) < enabledtool (e)
    expect(countLeaves(tree[0]!)).toEqual({ total: 1, disabled: 1 }) // disabledtool
    expect(countLeaves(tree[1]!)).toEqual({ total: 1, disabled: 0 }) // enabledtool
  })
})

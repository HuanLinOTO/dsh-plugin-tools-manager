/**
 * registry.spec.ts — unit tests for the ToolRegistry attribution engine.
 *
 * Tests the snapshot-diff attribution algorithm without a real cordis context:
 * the registry's constructor registers listeners on `ctx`, but the tests drive
 * `reconcile()` indirectly by emitting `tools/change` through a mock ctx, and
 * drive `internal/plugin` / `internal/status` the same way.
 *
 * @module dsh-tools-manager/tests/registry
 */

import { describe, it, expect, vi } from 'vitest'
import { ToolRegistry, BASELINE_GROUP, UNKNOWN_GROUP } from '../src/registry.ts'

/**
 * Minimal mock ctx: captures `on()` registrations so tests can fire events,
 * and returns a controllable `tools.schemas()`.
 */
interface MockCtx {
  on: (event: string, cb: (...args: unknown[]) => void) => () => void
  tools: { schemas: () => unknown[] }
  logger: { info: (...args: unknown[]) => void; debug: (...args: unknown[]) => void; warn: (...args: unknown[]) => void }
}

function makeMockCtx(initialSchemas: unknown[] = []): MockCtx & { fire: (event: string, ...args: unknown[]) => void } {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>()
  const schemas = [...initialSchemas]
  return {
    on: (event: string, cb: (...args: unknown[]) => void) => {
      const list = listeners.get(event) ?? []
      list.push(cb)
      listeners.set(event, list)
      return () => {
        const l = listeners.get(event)
        if (l) {
          const idx = l.indexOf(cb)
          if (idx >= 0) l.splice(idx, 1)
        }
      }
    },
    tools: { schemas: () => [...schemas] },
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
    fire: (event: string, ...args: unknown[]) => {
      const list = listeners.get(event) ?? []
      for (const cb of list) cb(...args)
    },
  }
}

/** Swap the schemas() return value and fire `tools/change`. */
function setSchemas(ctx: MockCtx & { fire: (event: string, ...args: unknown[]) => void }, schemas: unknown[]): void {
  ctx.tools.schemas = () => [...schemas]
  ctx.fire('tools/change')
}

describe('ToolRegistry baseline', () => {
  it('attributes pre-existing tools to the baseline group', () => {
    const ctx = makeMockCtx([
      { name: 'run_python', description: 'python', parameters: {} },
      { name: 'run_node', description: 'node', parameters: {} },
    ])
    const reg = new ToolRegistry(ctx as never)

    const tree = reg.getTree()
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe(BASELINE_GROUP)
    expect(tree[0].tools.map(t => t.name)).toEqual(['run_python', 'run_node'])
  })

  it('handles an empty baseline', () => {
    const ctx = makeMockCtx([])
    const reg = new ToolRegistry(ctx as never)
    expect(reg.getTree()).toEqual([])
  })
})

describe('ToolRegistry attribution on tools/change', () => {
  it('attributes new tools to the pending plugin (stack top)', () => {
    const ctx = makeMockCtx([])
    const reg = new ToolRegistry(ctx as never)

    // Simulate a plugin fiber being created (pushed onto pending stack).
    ctx.fire('internal/plugin', { name: 'my-plugin', state: 1, uid: 1 })
    // Tools registered during apply():
    setSchemas(ctx, [
      { name: 'tool_a', description: 'a', parameters: {} },
      { name: 'tool_b', description: 'b', parameters: {} },
    ])
    // Plugin finishes loading → ACTIVE
    ctx.fire('internal/status', { name: 'my-plugin', state: 2, uid: 1 })

    const tree = reg.getTree()
    const group = tree.find(g => g.name === 'my-plugin')
    expect(group).toBeDefined()
    expect(group!.tools.map(t => t.name)).toEqual(['tool_a', 'tool_b'])
  })

  it('attributes tools to unknown group when no plugin is pending', () => {
    const ctx = makeMockCtx([])
    const reg = new ToolRegistry(ctx as never)

    // No internal/plugin fired — tools appear out of band.
    setSchemas(ctx, [{ name: 'mystery_tool', description: 'm', parameters: {} }])

    const tree = reg.getTree()
    const group = tree.find(g => g.name === UNKNOWN_GROUP)
    expect(group).toBeDefined()
    expect(group!.tools.map(t => t.name)).toEqual(['mystery_tool'])
  })

  it('removes tools from their group when unregistered', () => {
    const ctx = makeMockCtx([
      { name: 'baseline_tool', description: 'b', parameters: {} },
    ])
    const reg = new ToolRegistry(ctx as never)

    ctx.fire('internal/plugin', { name: 'my-plugin', state: 1, uid: 1 })
    setSchemas(ctx, [
      { name: 'baseline_tool', description: 'b', parameters: {} },
      { name: 'tool_a', description: 'a', parameters: {} },
    ])
    ctx.fire('internal/status', { name: 'my-plugin', state: 2, uid: 1 })

    // tool_a unregistered
    setSchemas(ctx, [{ name: 'baseline_tool', description: 'b', parameters: {} }])

    const tree = reg.getTree()
    const myGroup = tree.find(g => g.name === 'my-plugin')
    expect(myGroup).toBeUndefined() // empty group deleted
    const baseGroup = tree.find(g => g.name === BASELINE_GROUP)
    expect(baseGroup!.tools.map(t => t.name)).toEqual(['baseline_tool'])
  })

  it('refreshes description/parameters of an existing tool in place', () => {
    const ctx = makeMockCtx([
      { name: 'tool_a', description: 'old desc', parameters: { old: true } },
    ])
    const reg = new ToolRegistry(ctx as never)

    setSchemas(ctx, [
      { name: 'tool_a', description: 'new desc', parameters: { new: true } },
    ])

    const tree = reg.getTree()
    const tool = tree[0].tools[0]
    expect(tool.description).toBe('new desc')
    expect(tool.parameters).toEqual({ new: true })
  })
})

describe('ToolRegistry plugin disposal', () => {
  it('clears a plugin group on DISPOSED status', () => {
    const ctx = makeMockCtx([])
    const reg = new ToolRegistry(ctx as never)

    ctx.fire('internal/plugin', { name: 'my-plugin', state: 1, uid: 1 })
    setSchemas(ctx, [{ name: 'tool_a', description: 'a', parameters: {} }])
    ctx.fire('internal/status', { name: 'my-plugin', state: 2, uid: 1 })

    // Plugin disposed: its tools auto-unregister via effect cleanup, then
    // internal/status fires DISPOSED.
    setSchemas(ctx, [])
    ctx.fire('internal/status', { name: 'my-plugin', state: 4, uid: null })

    const tree = reg.getTree()
    expect(tree.find(g => g.name === 'my-plugin')).toBeUndefined()
  })
})

describe('ToolRegistry isDisabled', () => {
  it('returns true for tools in the disabled set', () => {
    const ctx = makeMockCtx([])
    const reg = new ToolRegistry(ctx as never)
    const set = new Set(['tool_a'])
    expect(reg.isDisabled('tool_a', set)).toBe(true)
    expect(reg.isDisabled('tool_b', set)).toBe(false)
  })
})

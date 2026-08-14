/**
 * policy.spec.ts — unit tests for the global enable/disable policy.
 *
 * Tests:
 *   - filterTools: removes disabled tools, preserves the rest
 *   - filterTools: empty disabled set is a no-op (returns a copy)
 *   - disabledReason: canonical reason string
 *   - installPolicy: registers a system-prompt/assemble listener and a guard
 *   - guard denies disabled tools and allows the rest
 *   - assemble listener filters disabled tools from the final assembly
 *
 * @module dsh-tools-manager/tests/policy
 */

import { describe, it, expect, vi } from 'vitest'
import { filterTools, disabledReason, DISABLED_REASON_PREFIX, installPolicy } from '../src/policy.ts'

describe('filterTools', () => {
  it('removes disabled tools from the list', () => {
    const tools = [
      { name: 'tool_a', description: 'a' },
      { name: 'tool_b', description: 'b' },
      { name: 'tool_c', description: 'c' },
    ]
    const disabled = new Set(['tool_b'])
    const result = filterTools(tools, disabled)
    expect(result.map(t => t.name)).toEqual(['tool_a', 'tool_c'])
  })

  it('returns a copy when the disabled set is empty', () => {
    const tools = [{ name: 'tool_a', description: 'a' }]
    const result = filterTools(tools, new Set())
    expect(result).toEqual(tools)
    expect(result).not.toBe(tools) // a copy, not the same reference
  })

  it('returns an empty array when all tools are disabled', () => {
    const tools = [{ name: 'tool_a' }, { name: 'tool_b' }]
    const disabled = new Set(['tool_a', 'tool_b'])
    expect(filterTools(tools, disabled)).toEqual([])
  })
})

describe('disabledReason', () => {
  it('produces the canonical reason string', () => {
    const reason = disabledReason('my_tool')
    expect(reason).toBe(`${DISABLED_REASON_PREFIX} "my_tool"`)
  })

  it('JSON-encodes the tool name (handles special characters)', () => {
    const reason = disabledReason('tool "quoted"')
    expect(reason).toContain('"tool \\"quoted\\""')
  })
})

describe('installPolicy', () => {
  /**
   * Minimal mock ctx capturing `on()` and `tools.guard()` registrations so
   * tests can drive the assembled listener and the guard callback directly.
   */
  function makeMockCtx(): {
    ctx: unknown
    fireAssemble: (assembly: { tools: Array<{ name: string }> }, nextResult?: { tools: Array<{ name: string }> }) => Promise<{ tools: Array<{ name: string }> }>
    guard: (exec: { name: string }) => string | undefined
  } {
    let assembleListener: ((assembly: { tools: Array<{ name: string }> }, context: unknown, next: () => Promise<{ tools: Array<{ name: string }> }>) => Promise<{ tools: Array<{ name: string }> }>) | undefined
    let guardCb: ((exec: Readonly<{ name: string }>) => string | undefined) | undefined
    return {
      ctx: {
        on: (event: string, cb: typeof assembleListener) => {
          if (event === 'system-prompt/assemble') assembleListener = cb
          return () => { assembleListener = undefined }
        },
        tools: {
          guard: (g: typeof guardCb) => {
            guardCb = g
            return () => { guardCb = undefined }
          },
        },
        logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
      },
      fireAssemble: async (assembly, nextResult) => {
        if (assembleListener === undefined) throw new Error('no assemble listener registered')
        const next = () => Promise.resolve(nextResult ?? assembly)
        return assembleListener(assembly, undefined, next)
      },
      guard: (exec) => {
        if (guardCb === undefined) throw new Error('no guard registered')
        return guardCb(exec)
      },
    }
  }

  it('registers both an assemble listener and a guard', () => {
    const { ctx } = makeMockCtx()
    const dispose = installPolicy(ctx as never, () => new Set())
    expect(dispose).toBeTypeOf('function')
    dispose()
  })

  it('guard denies disabled tools and allows the rest', () => {
    const { ctx, guard } = makeMockCtx()
    const disabled = () => new Set(['secret_tool'])
    installPolicy(ctx as never, disabled)

    expect(guard({ name: 'secret_tool' })).toContain('disabled by tools-manager')
    expect(guard({ name: 'safe_tool' })).toBeUndefined()
  })

  it('guard returns undefined when the disabled set is empty', () => {
    const { ctx, guard } = makeMockCtx()
    installPolicy(ctx as never, () => new Set())
    expect(guard({ name: 'any_tool' })).toBeUndefined()
  })

  it('assemble listener filters disabled tools from the final result', async () => {
    const { ctx, fireAssemble } = makeMockCtx()
    const disabled = () => new Set(['hidden_tool'])
    installPolicy(ctx as never, disabled)

    const assembly = { tools: [{ name: 'visible_tool' }, { name: 'hidden_tool' }] }
    const result = await fireAssemble(assembly)
    expect(result.tools.map(t => t.name)).toEqual(['visible_tool'])
  })

  it('assemble listener delegates unchanged when disabled set is empty', async () => {
    const { ctx, fireAssemble } = makeMockCtx()
    installPolicy(ctx as never, () => new Set())

    const assembly = { tools: [{ name: 'tool_a' }, { name: 'tool_b' }] }
    const result = await fireAssemble(assembly, { tools: [{ name: 'tool_a' }, { name: 'tool_b' }, { name: 'tool_c' }] })
    // No filtering; downstream result passes through.
    expect(result.tools.map(t => t.name)).toEqual(['tool_a', 'tool_b', 'tool_c'])
  })

  it('assemble listener filters from the downstream result, not the input', async () => {
    const { ctx, fireAssemble } = makeMockCtx()
    const disabled = () => new Set(['hidden'])
    installPolicy(ctx as never, disabled)

    // Downstream listener ADDED a tool named 'hidden' — we must filter it
    // from the final result even though it wasn't in the input assembly.
    const assembly = { tools: [{ name: 'visible' }] }
    const result = await fireAssemble(assembly, { tools: [{ name: 'visible' }, { name: 'hidden' }] })
    expect(result.tools.map(t => t.name)).toEqual(['visible'])
  })

  it('disposer removes both layers', () => {
    const { ctx, guard } = makeMockCtx()
    const dispose = installPolicy(ctx as never, () => new Set(['x']))
    dispose()
    // Guard should no longer deny after disposal (guardCb was cleared).
    expect(() => guard({ name: 'x' })).toThrow('no guard registered')
  })
})

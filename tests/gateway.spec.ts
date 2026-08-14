/**
 * gateway.spec.ts — unit tests for the tools-manager HTTP gateway.
 *
 * Tests:
 *   - extractSetPatch: accepts valid { toolName, disabled }
 *   - extractSetPatch: rejects missing/mistyped fields
 *   - handleSet: throws when settings service is unavailable
 *   - handleSet: adds a tool to the disabled set when disabled=true
 *   - handleSet: removes a tool from the disabled set when disabled=false
 *   - handleSet: no-op when disabling an already-disabled tool
 *   - buildView: tags each tool row with disabled state
 *
 * @module dsh-tools-manager/tests/gateway
 */

import { describe, it, expect, vi } from 'vitest'
import { extractSetPatch, handleSet, buildView, type ToolsManagerTreeView } from '../src/gateway.ts'
import type { ToolRegistry, PluginGroup } from '../src/registry.ts'
import type { ToolsManagerSettingsBridge } from '../src/settings.ts'

/** Build a mock registry with a controllable tree. */
function registryOf(groups: PluginGroup[]): ToolRegistry {
  return {
    getTree: () => groups,
    isDisabled: vi.fn((name: string, set: ReadonlySet<string>) => set.has(name)),
  } as unknown as ToolRegistry
}

/** Build a mock bridge with a controllable source. */
function bridgeOf(disabled: string[]): ToolsManagerSettingsBridge {
  return {
    source: () => ({ disabled }),
    onChange: () => {},
  }
}

/** Build a mock settings service with a controllable update. */
function settingsWith(update: (ns: string, patch: Record<string, unknown>) => Promise<void>): unknown {
  return { update: vi.fn(update) }
}

describe('extractSetPatch', () => {
  it('accepts a valid { toolName, disabled } body', () => {
    const patch = extractSetPatch({ toolName: 'my_tool', disabled: true })
    expect(patch).toEqual({ toolName: 'my_tool', disabled: true })
  })

  it('accepts disabled=false', () => {
    const patch = extractSetPatch({ toolName: 'my_tool', disabled: false })
    expect(patch.disabled).toBe(false)
  })

  it('rejects a non-object body', () => {
    expect(() => extractSetPatch(null)).toThrow('must be a JSON object')
    expect(() => extractSetPatch('string')).toThrow('must be a JSON object')
    expect(() => extractSetPatch(42)).toThrow('must be a JSON object')
    expect(() => extractSetPatch(undefined)).toThrow('must be a JSON object')
  })

  it('rejects a missing toolName', () => {
    expect(() => extractSetPatch({ disabled: true })).toThrow('toolName')
  })

  it('rejects an empty toolName', () => {
    expect(() => extractSetPatch({ toolName: '', disabled: true })).toThrow('toolName')
  })

  it('rejects a non-string toolName', () => {
    expect(() => extractSetPatch({ toolName: 123, disabled: true })).toThrow('toolName')
  })

  it('rejects a non-boolean disabled', () => {
    expect(() => extractSetPatch({ toolName: 'x', disabled: 'yes' })).toThrow('disabled')
    expect(() => extractSetPatch({ toolName: 'x', disabled: 1 })).toThrow('disabled')
    expect(() => extractSetPatch({ toolName: 'x' })).toThrow('disabled')
  })
})

describe('handleSet', () => {
  it('throws when the settings service is unavailable', async () => {
    const registry = registryOf([])
    const bridge = bridgeOf([])
    await expect(handleSet({ toolName: 'x', disabled: true }, undefined, registry, bridge))
      .rejects.toThrow('settings service is unavailable')
  })

  it('adds a tool to the disabled set when disabled=true', async () => {
    let stored: Record<string, unknown> = {}
    const settings = settingsWith(async (_ns: string, patch: Record<string, unknown>) => {
      stored = patch
    })
    const registry = registryOf([])
    const bridge = bridgeOf(['existing_disabled'])
    const result = await handleSet({ toolName: 'new_tool', disabled: true }, settings as never, registry, bridge)
    expect(stored).toEqual({ disabled: ['existing_disabled', 'new_tool'] })
    expect(result).toBeDefined()
  })

  it('removes a tool from the disabled set when disabled=false', async () => {
    let stored: Record<string, unknown> = {}
    const settings = settingsWith(async (_ns: string, patch: Record<string, unknown>) => {
      stored = patch
    })
    const registry = registryOf([])
    const bridge = bridgeOf(['tool_a', 'tool_b', 'tool_c'])
    await handleSet({ toolName: 'tool_b', disabled: false }, settings as never, registry, bridge)
    expect(stored).toEqual({ disabled: ['tool_a', 'tool_c'] })
  })

  it('is a no-op when disabling an already-disabled tool', async () => {
    let stored: Record<string, unknown> = {}
    const settings = settingsWith(async (_ns: string, patch: Record<string, unknown>) => {
      stored = patch
    })
    const registry = registryOf([])
    const bridge = bridgeOf(['already_disabled'])
    await handleSet({ toolName: 'already_disabled', disabled: true }, settings as never, registry, bridge)
    expect(stored).toEqual({ disabled: ['already_disabled'] })
  })

  it('is a no-op when enabling a tool that is not disabled', async () => {
    let stored: Record<string, unknown> = {}
    const settings = settingsWith(async (_ns: string, patch: Record<string, unknown>) => {
      stored = patch
    })
    const registry = registryOf([])
    const bridge = bridgeOf([])
    await handleSet({ toolName: 'not_disabled', disabled: false }, settings as never, registry, bridge)
    expect(stored).toEqual({ disabled: [] })
  })

  it('returns the refreshed tree view after writing', async () => {
    const settings = settingsWith(async () => {})
    const registry = registryOf([
      { name: 'plugin-a', tools: [{ name: 'tool_1', description: 'one', parameters: {} }] },
    ])
    const bridge = bridgeOf([])
    const result = await handleSet({ toolName: 'tool_1', disabled: true }, settings as never, registry, bridge)
    expect(result.plugins).toHaveLength(1)
    expect(result.plugins[0].tools[0].disabled).toBe(false) // bridge still returns [] until settings.update reflects
  })
})

describe('buildView', () => {
  it('tags each tool row with its disabled state', () => {
    const registry = registryOf([
      {
        name: 'plugin-a',
        tools: [
          { name: 'tool_1', description: 'one', parameters: {} },
          { name: 'tool_2', description: 'two', parameters: {} },
        ],
      },
      {
        name: 'plugin-b',
        tools: [{ name: 'tool_3', description: 'three', parameters: {} }],
      },
    ])
    const bridge = bridgeOf(['tool_2'])
    const view: ToolsManagerTreeView = buildView(registry, bridge)
    expect(view.plugins).toHaveLength(2)
    expect(view.plugins[0].name).toBe('plugin-a')
    expect(view.plugins[0].tools[0].disabled).toBe(false)
    expect(view.plugins[0].tools[1].disabled).toBe(true)
    expect(view.plugins[1].tools[0].disabled).toBe(false)
  })

  it('returns an empty plugins array when the tree is empty', () => {
    const registry = registryOf([])
    const bridge = bridgeOf([])
    expect(buildView(registry, bridge)).toEqual({ plugins: [] })
  })
})

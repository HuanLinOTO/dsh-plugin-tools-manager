/**
 * ToolsManagerPanel — the top-level settings tab panel for tool management.
 *
 * Renders the full tool tree grouped by source plugin, with a toggle button
 * on each tool row to globally enable/disable it. Reads/writes through the
 * `/tools-manager/api/list|set` HTTP route.
 *
 * UI design language aligns with dsh-mcp-manager's Panel (inline styles,
 * --dsw-alias-* CSS variables, Button/Pill from dsh-client-ui-primitives).
 *
 * @module dsh-tools-manager/client/ToolsManagerPanel
 */

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Button, Pill } from '@deepseek-ai/dsh-client-ui-primitives'

/** One tool row in the tree. */
interface ToolRow {
  name: string
  description: string
  disabled: boolean
}

/** One plugin group in the tree. */
interface PluginGroupRow {
  name: string
  tools: ToolRow[]
}

/** Wire view from `/tools-manager/api/list|set`. */
interface TreeView {
  plugins: PluginGroupRow[]
}

/** Standard JSON response envelope from the HTTP route. */
interface ApiEnvelope {
  ok?: boolean
  value?: TreeView
  error?: { code?: string; message?: string }
}

/** Props the renderer binds for the panel. */
export interface ToolsManagerPanelProps {
  // settings.section slot delivers no inject face — the panel is self-contained.
}

/* ---- Design language (aligned with dsh-mcp-manager / official settings pages) ---- */
const sectionStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720,
  color: 'var(--dsw-alias-label-primary)',
}
const titleStyle: CSSProperties = {
  margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 500,
  color: 'var(--dsw-alias-label-primary)',
}
const introStyle: CSSProperties = {
  margin: 0, fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-tertiary)',
}
const rowsStyle: CSSProperties = {
  margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8,
}
const groupCardStyle: CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12,
  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
}
const groupHeaderStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, minHeight: 24,
  fontSize: 14, fontWeight: 500, color: 'var(--dsw-alias-label-primary)',
}
const toolListStyle: CSSProperties = {
  margin: '4px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 0,
}
const toolRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 12,
  padding: '8px 0', borderTop: '1px solid var(--dsw-alias-border-l1)',
}
const toolInfoStyle: CSSProperties = {
  flex: 1, minWidth: 0,
}
const toolNameStyle: CSSProperties = {
  fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'ui-monospace, monospace',
}
const toolDescStyle: CSSProperties = {
  fontSize: 12, lineHeight: '18px', color: 'var(--dsh-alias-label-tertiary, var(--dsw-alias-label-tertiary))',
  marginTop: 2, wordBreak: 'break-word',
}
const toggleStyle: CSSProperties = {
  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
}
const errorStyle: CSSProperties = {
  margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-state-error-primary)',
}
const emptyStyle: CSSProperties = {
  margin: '12px 0', fontSize: 14, color: 'var(--dsw-alias-label-tertiary)',
}
const metaStyle: CSSProperties = {
  fontSize: 11, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary)',
  fontFamily: 'ui-monospace, monospace',
}

/** Settings tab panel body. */
export function ToolsManagerPanel(_props: ToolsManagerPanelProps): ReactNode {
  const [plugins, setPlugins] = useState<PluginGroupRow[]>([])
  const [error, setError] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pendingTool, setPendingTool] = useState<string | undefined>(undefined)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/tools-manager/api/list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      const body = (await res.json()) as ApiEnvelope
      if (body.ok === true && body.value !== undefined) {
        setPlugins(body.value.plugins)
        setError(undefined)
      } else {
        setError(body.error?.message ?? '加载失败')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  /** Toggle one tool's disabled state. */
  const toggle = useCallback(async (toolName: string, disabled: boolean): Promise<void> => {
    setBusy(true)
    setPendingTool(toolName)
    setError(undefined)
    try {
      const res = await fetch('/tools-manager/api/set', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toolName, disabled }),
      })
      const body = (await res.json()) as ApiEnvelope
      if (body.ok === true && body.value !== undefined) {
        setPlugins(body.value.plugins)
      } else {
        setError(body.error?.message ?? '切换失败')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
      setPendingTool(undefined)
    }
  }, [])

  const totalTools = plugins.reduce((sum, g) => sum + g.tools.length, 0)
  const disabledCount = plugins.reduce((sum, g) => sum + g.tools.filter(t => t.disabled).length, 0)

  return (
    <section style={sectionStyle}>
      <h2 style={titleStyle}>工具管理</h2>
      <p style={introStyle}>
        按来源插件分组列出全部已注册工具。禁用的工具对模型不可见且执行被拒（两层一致），跨会话持久化。
      </p>
      <p style={metaStyle}>
        共 {plugins.length} 个插件 · {totalTools} 个工具 · {disabledCount} 个已禁用
      </p>

      {error !== undefined && <p style={errorStyle}>{error}</p>}

      {loading
        ? <p style={introStyle}>加载中…</p>
        : plugins.length === 0
          ? <p style={emptyStyle}>当前没有已注册的工具。</p>
          : (
            <div style={rowsStyle}>
              {plugins.map(group => (
                <div key={group.name} style={groupCardStyle}>
                  <div style={groupHeaderStyle}>
                    <span>{group.name}</span>
                    <Pill>{group.tools.length} 工具</Pill>
                  </div>
                  <div style={toolListStyle}>
                    {group.tools.map(tool => (
                      <div key={tool.name} style={toolRowStyle}>
                        <div style={toolInfoStyle}>
                          <div style={toolNameStyle}>{tool.name}</div>
                          {tool.description ? <div style={toolDescStyle}>{tool.description}</div> : null}
                        </div>
                        <div style={toggleStyle}>
                          {tool.disabled
                            ? <Pill>已禁用</Pill>
                            : <Pill active>已启用</Pill>}
                          <Button
                            onClick={() => void toggle(tool.name, !tool.disabled)}
                            disabled={busy && pendingTool === tool.name}
                          >
                            {tool.disabled ? '启用' : '禁用'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
    </section>
  )
}

/**
 * ToolsManagerPanel — the top-level settings tab panel for tool management.
 *
 * Renders tools as a **collapsible prefix tree** (built from tool names split
 * on `__` and `_`). Internal nodes show an aggregate enable/disable count and
 * act as a batch toggle for all descendant tools. Leaf nodes are the actual
 * tools with individual enable/disable buttons.
 *
 * Reads/writes through the `/tools-manager/api/list|set` HTTP route.
 *
 * @module dsh-tools-manager/client/ToolsManagerPanel
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Button, Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  buildPrefixTree,
  collectLeafNames,
  countLeaves,
  type TreeNode,
} from './prefixTree.ts'

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

/* ---- Design language ---- */
const sectionStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 12,
  color: 'var(--dsw-alias-label-primary)',
}
const titleStyle: CSSProperties = {
  margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 500,
  color: 'var(--dsw-alias-label-primary)',
}
const introStyle: CSSProperties = {
  margin: 0, fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-tertiary)',
}
const treeStyle: CSSProperties = {
  margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 2,
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

/* ---- Node styles ---- */
/** One internal node row: clickable header + collapsible children. */
const nodeHeaderStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 8px', cursor: 'pointer', borderRadius: 6,
  userSelect: 'none',
}
const nodeLabelStyle: CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'ui-monospace, monospace',
}
const nodeActionsStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto',
}
const childrenStyle = (depth: number): CSSProperties => ({
  marginLeft: depth === 0 ? 0 : 16,
  borderLeft: depth === 0 ? 'none' : '1px solid var(--dsw-alias-border-l1)',
  paddingLeft: depth === 0 ? 0 : 4,
  display: 'flex', flexDirection: 'column', gap: 1,
})

/* ---- Leaf styles ---- */
const leafRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 8,
  padding: '6px 8px', borderRadius: 6,
}
const leafInfoStyle: CSSProperties = {
  flex: 1, minWidth: 0,
}
const leafNameStyle: CSSProperties = {
  fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'ui-monospace, monospace',
  wordBreak: 'break-all',
}
const leafDescStyle: CSSProperties = {
  fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)',
  marginTop: 2, wordBreak: 'break-word',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}
const leafToggleStyle: CSSProperties = {
  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
}

/** Chevron character — rotates when open. */
function Chevron({ open }: { open: boolean }): ReactNode {
  return (
    <span style={{
      display: 'inline-block',
      transition: 'transform 0.15s ease',
      transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      fontSize: 10, lineHeight: 1,
      color: 'var(--dsw-alias-label-tertiary)',
      width: 12, textAlign: 'center',
    }}>▶</span>
  )
}

/** Settings tab panel body. */
export function ToolsManagerPanel(_props: ToolsManagerPanelProps): ReactNode {
  const [plugins, setPlugins] = useState<PluginGroupRow[]>([])
  const [error, setError] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pendingTools, setPendingTools] = useState<Set<string>>(new Set())

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

  /** Toggle a single tool. */
  const toggleOne = useCallback(async (toolName: string, disabled: boolean): Promise<void> => {
    setBusy(true)
    setPendingTools(prev => new Set(prev).add(toolName))
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
      setPendingTools(prev => { const next = new Set(prev); next.delete(toolName); return next })
    }
  }, [])

  /** Batch-toggle all descendant tools under a prefix node. */
  const toggleNode = useCallback(async (node: TreeNode): Promise<void> => {
    const names = collectLeafNames(node)
    if (names.length === 0) return
    const toolMap = new Map<string, boolean>()
    for (const g of plugins) {
      for (const t of g.tools) toolMap.set(t.name, t.disabled)
    }
    const anyEnabled = names.some(n => toolMap.get(n) !== true)
    const targetDisabled = anyEnabled
    const toToggle = names.filter(n => toolMap.get(n) !== targetDisabled)
    if (toToggle.length === 0) return

    setBusy(true)
    setPendingTools(prev => { const next = new Set(prev); for (const n of toToggle) next.add(n); return next })
    setError(undefined)
    try {
      let lastBody: ApiEnvelope | undefined
      for (const name of toToggle) {
        const res = await fetch('/tools-manager/api/set', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ toolName: name, disabled: targetDisabled }),
        })
        lastBody = (await res.json()) as ApiEnvelope
        if (lastBody.ok !== true) {
          setError(lastBody.error?.message ?? `批量切换失败: ${name}`)
          break
        }
      }
      if (lastBody?.ok === true && lastBody.value !== undefined) {
        setPlugins(lastBody.value.plugins)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
      setPendingTools(prev => { const next = new Set(prev); for (const n of toToggle) next.delete(n); return next })
    }
  }, [plugins])

  const allTools = useMemo(() => {
    const tools: ToolRow[] = []
    for (const g of plugins) tools.push(...g.tools)
    return tools
  }, [plugins])

  const tree = useMemo(() => buildPrefixTree(allTools), [allTools])
  const totalTools = allTools.length
  const disabledCount = allTools.filter(t => t.disabled).length

  return (
    <section style={sectionStyle}>
      <h2 style={titleStyle}>工具管理</h2>
      <p style={introStyle}>
        按工具名前缀分组的可折叠树。点击节点展开/折叠，内部节点支持批量启停子工具。禁用的工具对模型不可见且执行被拒，跨会话持久化。
      </p>
      <p style={metaStyle}>
        共 {plugins.length} 个插件 · {totalTools} 个工具 · {disabledCount} 个已禁用
      </p>

      {error !== undefined && <p style={errorStyle}>{error}</p>}

      {loading
        ? <p style={introStyle}>加载中…</p>
        : totalTools === 0
          ? <p style={emptyStyle}>当前没有已注册的工具。</p>
          : (
            <div style={treeStyle}>
              {tree.map(node => (
                <TreeEntry
                  key={node.kind === 'node' ? node.prefix : node.name}
                  node={node}
                  depth={0}
                  pendingTools={pendingTools}
                  busy={busy}
                  onToggleTool={toggleOne}
                  onToggleNode={toggleNode}
                />
              ))}
            </div>
          )}
    </section>
  )
}

/** Render one tree entry (internal node or leaf). */
function TreeEntry(props: {
  node: TreeNode
  depth: number
  pendingTools: Set<string>
  busy: boolean
  onToggleTool: (toolName: string, disabled: boolean) => void
  onToggleNode: (node: TreeNode) => void
}): ReactNode {
  const { node, depth, pendingTools, busy, onToggleTool, onToggleNode } = props

  if (node.kind === 'leaf') {
    const pending = pendingTools.has(node.name)
    return (
      <div style={leafRowStyle}>
        <div style={leafInfoStyle}>
          <div style={leafNameStyle}>{node.name}</div>
          {node.description ? <div style={leafDescStyle}>{node.description}</div> : null}
        </div>
        <div style={leafToggleStyle}>
          {node.disabled
            ? <Pill>已禁用</Pill>
            : <Pill active>已启用</Pill>}
          <Button
            onClick={() => onToggleTool(node.name, !node.disabled)}
            disabled={busy && pending}
          >
            {node.disabled ? '启用' : '禁用'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PrefixNodeEntry
      node={node}
      depth={depth}
      pendingTools={pendingTools}
      busy={busy}
      onToggleTool={onToggleTool}
      onToggleNode={onToggleNode}
    />
  )
}

/** A collapsible internal node with batch toggle. */
function PrefixNodeEntry(props: {
  node: TreeNode
  depth: number
  pendingTools: Set<string>
  busy: boolean
  onToggleTool: (toolName: string, disabled: boolean) => void
  onToggleNode: (node: TreeNode) => void
}): ReactNode {
  const { node, depth, pendingTools, busy, onToggleTool, onToggleNode } = props
  const [open, setOpen] = useState(depth < 1)

  if (node.kind !== 'node') return null

  const counts = countLeaves(node)
  const allDisabled = counts.disabled === counts.total
  const anyEnabled = counts.disabled < counts.total
  const nodePending = collectLeafNames(node).some(n => pendingTools.has(n))

  const statusPill = allDisabled
    ? <Pill>全部已禁用</Pill>
    : <Pill active>{counts.total - counts.disabled}/{counts.total}</Pill>

  return (
    <div>
      <div
        style={nodeHeaderStyle}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--dsw-alias-bg-module-platform, rgba(0,0,0,0.04))' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <Chevron open={open} />
        <span style={nodeLabelStyle}>{node.label}</span>
        <div style={nodeActionsStyle}>
          {statusPill}
          <Button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleNode(node) }}
            disabled={busy && nodePending}
          >
            {anyEnabled ? '全部禁用' : '全部启用'}
          </Button>
        </div>
      </div>
      {open && (
        <div style={childrenStyle(depth)}>
          {node.children.map(child => (
            <TreeEntry
              key={child.kind === 'node' ? child.prefix : child.name}
              node={child}
              depth={depth + 1}
              pendingTools={pendingTools}
              busy={busy}
              onToggleTool={onToggleTool}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

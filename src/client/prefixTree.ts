/**
 * prefixTree.ts — build a collapsible prefix tree from flat tool names.
 *
 * Splits each tool name on `__` (double underscore, used by MCP and other
 * namespaced tools) and `_` (single underscore, for tools like `run_python`).
 * Nodes are either internal (prefix segments) or leaves (actual tools).
 *
 * Example:
 *   mcp__github__create_issue → mcp → github → create_issue (leaf)
 *   mcp__github__list_repos   → mcp → github → list_repos (leaf)
 *   run_python                → run → python (leaf)
 *   run_node                  → run → node (leaf)
 *   web_search                → web → search (leaf)
 *
 * @module dsh-tools-manager/client/prefixTree
 */

/** A leaf node — an actual tool with a toggle. */
export interface ToolLeaf {
  readonly kind: 'leaf'
  readonly name: string
  readonly description: string
  readonly disabled: boolean
}

/** An internal node — a prefix segment with children. */
export interface PrefixNode {
  readonly kind: 'node'
  /** The full prefix path leading to this node (e.g. `mcp__github`). */
  readonly prefix: string
  /** The display label for this node (the last segment, e.g. `github`). */
  readonly label: string
  readonly children: TreeNode[]
}

export type TreeNode = ToolLeaf | PrefixNode

/**
 * Split a tool name into prefix segments.
 *
 * Strategy:
 *   1. Split on `__` (MCP namespacing) to get major namespaces.
 *   2. For intermediate segments, split on `_` for finer granularity.
 *   3. The LAST segment (the leaf tool name) is kept whole — it's the tool's
 *      identity, not a prefix to split further.
 *
 * Examples:
 *   `mcp__github__create_issue` → ['mcp', 'github', 'create_issue']
 *   `mcp__my_server__do_thing`  → ['mcp', 'my', 'server', 'do_thing']
 *   `run_python`                → ['run', 'python']
 *   `web_search`                → ['web', 'search']
 *   `bash`                      → ['bash']
 */
function splitToolName(name: string): string[] {
  const parts = name.split('__')
  if (parts.length > 1) {
    const result: string[] = []
    for (let i = 0; i < parts.length; i++) {
      if (i === 0) {
        // Top-level namespace (e.g. "mcp") — keep as-is.
        if (parts[i] !== '') result.push(parts[i]!)
      } else if (i === parts.length - 1) {
        // Last segment — the leaf tool name. Keep whole, don't split on `_`.
        if (parts[i] !== '') result.push(parts[i]!)
      } else {
        // Intermediate sub-namespace — split on `_` for finer granularity.
        const sub = parts[i]!.split('_').filter(s => s !== '')
        result.push(...sub)
      }
    }
    return result
  }
  // No `__` — split on `_` for tools like `run_python`, `web_search`.
  const sub = name.split('_').filter(s => s !== '')
  return sub.length > 0 ? sub : [name]
}

/**
 * Build a prefix tree from a flat list of tools.
 * @param tools - the flat tool list from the API.
 * @returns top-level tree nodes, sorted alphabetically by label.
 */
export function buildPrefixTree(tools: ReadonlyArray<{ name: string; description: string; disabled: boolean }>): TreeNode[] {
  const root: Branch = { children: new Map() }

  for (const tool of tools) {
    const segments = splitToolName(tool.name)
    let current = root
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!
      const isLast = i === segments.length - 1
      if (isLast) {
        current.children.set(segment, {
          kind: 'leaf',
          name: tool.name,
          description: tool.description,
          disabled: tool.disabled,
        })
      } else {
        let child = current.children.get(segment)
        if (child === undefined || child.kind === 'leaf') {
          const branch: Branch = { children: new Map() }
          child = { kind: 'branch', prefix: segments.slice(0, i + 1).join('_'), label: segment, branch }
          current.children.set(segment, child)
        }
        if (child.kind === 'branch') {
          current = child.branch
        }
      }
    }
  }

  return convertBranchToNodes(root)
}

/** Internal branch representation during construction. */
interface Branch {
  children: Map<string, BranchChild>
}

/** A child of a branch — either a sub-branch or a leaf. */
type BranchChild =
  | { kind: 'branch'; prefix: string; label: string; branch: Branch }
  | ToolLeaf

/** Convert the internal branch representation to the public TreeNode array. */
function convertBranchToNodes(branch: Branch): TreeNode[] {
  const nodes: TreeNode[] = []
  for (const [, child] of branch.children) {
    if (child.kind === 'leaf') {
      nodes.push(child)
    } else {
      nodes.push({
        kind: 'node',
        prefix: child.prefix,
        label: child.label,
        children: convertBranchToNodes(child.branch),
      })
    }
  }
  // Sort: internal nodes first (alphabetical), then leaves (alphabetical).
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'node' ? -1 : 1
    const aLabel = a.kind === 'node' ? a.label : a.name
    const bLabel = b.kind === 'node' ? b.label : b.name
    return aLabel < bLabel ? -1 : aLabel > bLabel ? 1 : 0
  })
  return nodes
}

/**
 * Collect all leaf tool names under a tree node (including nested).
 * @param node - the tree node to collect from.
 * @returns all tool names under this node.
 */
export function collectLeafNames(node: TreeNode): string[] {
  if (node.kind === 'leaf') return [node.name]
  const names: string[] = []
  for (const child of node.children) {
    names.push(...collectLeafNames(child))
  }
  return names
}

/**
 * Count leaves and disabled leaves under a node.
 * @param node - the tree node.
 * @returns `{ total, disabled }` counts.
 */
export function countLeaves(node: TreeNode): { total: number; disabled: number } {
  if (node.kind === 'leaf') {
    return { total: 1, disabled: node.disabled ? 1 : 0 }
  }
  let total = 0
  let disabled = 0
  for (const child of node.children) {
    const counts = countLeaves(child)
    total += counts.total
    disabled += counts.disabled
  }
  return { total, disabled }
}

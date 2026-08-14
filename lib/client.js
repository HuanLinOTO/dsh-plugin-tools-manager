window.__ModuleLoader__.load({ id: "@huanlin/dsh-plugin-tools-manager", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/ToolsManagerPanel.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/prefixTree.ts
function splitToolName(name) {
  const parts = name.split("__");
  if (parts.length > 1) {
    const result = [];
    for (let i = 0; i < parts.length; i++) {
      if (i === 0) {
        if (parts[i] !== "") result.push(parts[i]);
      } else if (i === parts.length - 1) {
        if (parts[i] !== "") result.push(parts[i]);
      } else {
        const sub2 = parts[i].split("_").filter((s) => s !== "");
        result.push(...sub2);
      }
    }
    return result;
  }
  const sub = name.split("_").filter((s) => s !== "");
  return sub.length > 0 ? sub : [name];
}
function buildPrefixTree(tools) {
  const root = { children: /* @__PURE__ */ new Map() };
  for (const tool of tools) {
    const segments = splitToolName(tool.name);
    let current = root;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      if (isLast) {
        current.children.set(segment, {
          kind: "leaf",
          name: tool.name,
          description: tool.description,
          disabled: tool.disabled
        });
      } else {
        let child = current.children.get(segment);
        if (child === void 0 || child.kind === "leaf") {
          const branch = { children: /* @__PURE__ */ new Map() };
          child = { kind: "branch", prefix: segments.slice(0, i + 1).join("_"), label: segment, branch };
          current.children.set(segment, child);
        }
        if (child.kind === "branch") {
          current = child.branch;
        }
      }
    }
  }
  return convertBranchToNodes(root);
}
function convertBranchToNodes(branch) {
  const nodes = [];
  for (const [, child] of branch.children) {
    if (child.kind === "leaf") {
      nodes.push(child);
    } else {
      nodes.push({
        kind: "node",
        prefix: child.prefix,
        label: child.label,
        children: convertBranchToNodes(child.branch)
      });
    }
  }
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "node" ? -1 : 1;
    const aLabel = a.kind === "node" ? a.label : a.name;
    const bLabel = b.kind === "node" ? b.label : b.name;
    return aLabel < bLabel ? -1 : aLabel > bLabel ? 1 : 0;
  });
  return nodes;
}
function collectLeafNames(node) {
  if (node.kind === "leaf") return [node.name];
  const names = [];
  for (const child of node.children) {
    names.push(...collectLeafNames(child));
  }
  return names;
}
function countLeaves(node) {
  if (node.kind === "leaf") {
    return { total: 1, disabled: node.disabled ? 1 : 0 };
  }
  let total = 0;
  let disabled = 0;
  for (const child of node.children) {
    const counts = countLeaves(child);
    total += counts.total;
    disabled += counts.disabled;
  }
  return { total, disabled };
}

// src/client/ToolsManagerPanel.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var sectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  maxWidth: 720,
  color: "var(--dsw-alias-label-primary)"
};
var titleStyle = {
  margin: 0,
  fontSize: 16,
  lineHeight: "24px",
  fontWeight: 500,
  color: "var(--dsw-alias-label-primary)"
};
var introStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: "22px",
  color: "var(--dsw-alias-label-tertiary)"
};
var treeContainerStyle = {
  margin: "12px 0 0",
  display: "flex",
  flexDirection: "column",
  gap: 4
};
var errorStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: "18px",
  color: "var(--dsw-alias-state-error-primary)"
};
var emptyStyle = {
  margin: "12px 0",
  fontSize: 14,
  color: "var(--dsw-alias-label-tertiary)"
};
var metaStyle = {
  fontSize: 11,
  lineHeight: "16px",
  color: "var(--dsw-alias-label-tertiary)",
  fontFamily: "ui-monospace, monospace"
};
var leafRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "4px 0 4px 28px"
  // indent under the disclosure chevron
};
var leafInfoStyle = {
  flex: 1,
  minWidth: 0
};
var leafNameStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--dsw-alias-label-primary)",
  fontFamily: "ui-monospace, monospace"
};
var leafDescStyle = {
  fontSize: 12,
  lineHeight: "18px",
  color: "var(--dsw-alias-label-tertiary)",
  marginTop: 2,
  wordBreak: "break-word"
};
var toggleStyle = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 6
};
var nodeActionsStyle = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginLeft: "auto"
};
function ToolsManagerPanel(_props) {
  const [plugins, setPlugins] = (0, import_react.useState)([]);
  const [error, setError] = (0, import_react.useState)(void 0);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [pendingTools, setPendingTools] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const refresh = (0, import_react.useCallback)(async () => {
    try {
      const res = await fetch("/tools-manager/api/list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      });
      const body = await res.json();
      if (body.ok === true && body.value !== void 0) {
        setPlugins(body.value.plugins);
        setError(void 0);
      } else {
        setError(body.error?.message ?? "\u52A0\u8F7D\u5931\u8D25");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void refresh();
  }, [refresh]);
  const toggleOne = (0, import_react.useCallback)(async (toolName, disabled) => {
    setBusy(true);
    setPendingTools((prev) => new Set(prev).add(toolName));
    setError(void 0);
    try {
      const res = await fetch("/tools-manager/api/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toolName, disabled })
      });
      const body = await res.json();
      if (body.ok === true && body.value !== void 0) {
        setPlugins(body.value.plugins);
      } else {
        setError(body.error?.message ?? "\u5207\u6362\u5931\u8D25");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
      setPendingTools((prev) => {
        const next = new Set(prev);
        next.delete(toolName);
        return next;
      });
    }
  }, []);
  const toggleNode = (0, import_react.useCallback)(async (node) => {
    const names = collectLeafNames(node);
    if (names.length === 0) return;
    const toolMap = /* @__PURE__ */ new Map();
    for (const g of plugins) {
      for (const t of g.tools) toolMap.set(t.name, t.disabled);
    }
    const anyEnabled = names.some((n) => toolMap.get(n) !== true);
    const targetDisabled = anyEnabled;
    const toToggle = names.filter((n) => toolMap.get(n) !== targetDisabled);
    if (toToggle.length === 0) return;
    setBusy(true);
    setPendingTools((prev) => {
      const next = new Set(prev);
      for (const n of toToggle) next.add(n);
      return next;
    });
    setError(void 0);
    try {
      let lastBody;
      for (const name of toToggle) {
        const res = await fetch("/tools-manager/api/set", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ toolName: name, disabled: targetDisabled })
        });
        lastBody = await res.json();
        if (lastBody.ok !== true) {
          setError(lastBody.error?.message ?? `\u6279\u91CF\u5207\u6362\u5931\u8D25: ${name}`);
          break;
        }
      }
      if (lastBody?.ok === true && lastBody.value !== void 0) {
        setPlugins(lastBody.value.plugins);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
      setPendingTools((prev) => {
        const next = new Set(prev);
        for (const n of toToggle) next.delete(n);
        return next;
      });
    }
  }, [plugins]);
  const allTools = (0, import_react.useMemo)(() => {
    const tools = [];
    for (const g of plugins) tools.push(...g.tools);
    return tools;
  }, [plugins]);
  const tree = (0, import_react.useMemo)(() => buildPrefixTree(allTools), [allTools]);
  const totalTools = allTools.length;
  const disabledCount = allTools.filter((t) => t.disabled).length;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: sectionStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: titleStyle, children: "\u5DE5\u5177\u7BA1\u7406" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: introStyle, children: "\u6309\u5DE5\u5177\u540D\u524D\u7F00\u5206\u7EC4\u7684\u53EF\u6298\u53E0\u6811\u3002\u5185\u90E8\u8282\u70B9\u663E\u793A\u805A\u5408\u72B6\u6001\u5E76\u652F\u6301\u6279\u91CF\u542F\u505C\u5B50\u5DE5\u5177\u3002\u7981\u7528\u7684\u5DE5\u5177\u5BF9\u6A21\u578B\u4E0D\u53EF\u89C1\u4E14\u6267\u884C\u88AB\u62D2\uFF0C\u8DE8\u4F1A\u8BDD\u6301\u4E45\u5316\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: metaStyle, children: [
      "\u5171 ",
      plugins.length,
      " \u4E2A\u63D2\u4EF6 \xB7 ",
      totalTools,
      " \u4E2A\u5DE5\u5177 \xB7 ",
      disabledCount,
      " \u4E2A\u5DF2\u7981\u7528"
    ] }),
    error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: errorStyle, children: error }),
    loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: introStyle, children: "\u52A0\u8F7D\u4E2D\u2026" }) : totalTools === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: emptyStyle, children: "\u5F53\u524D\u6CA1\u6709\u5DF2\u6CE8\u518C\u7684\u5DE5\u5177\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: treeContainerStyle, children: tree.map((node) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      TreeEntry,
      {
        node,
        depth: 0,
        pendingTools,
        busy,
        onToggleTool: toggleOne,
        onToggleNode: toggleNode
      },
      node.kind === "node" ? node.prefix : node.name
    )) })
  ] });
}
function TreeEntry(props) {
  const { node, depth, pendingTools, busy, onToggleTool, onToggleNode } = props;
  if (node.kind === "leaf") {
    const pending = pendingTools.has(node.name);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: leafRowStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: leafInfoStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: leafNameStyle, children: node.name }),
        node.description ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: leafDescStyle, children: node.description }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: toggleStyle, children: [
        node.disabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Pill, { children: "\u5DF2\u7981\u7528" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Pill, { active: true, children: "\u5DF2\u542F\u7528" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            onClick: () => onToggleTool(node.name, !node.disabled),
            disabled: busy && pending,
            children: node.disabled ? "\u542F\u7528" : "\u7981\u7528"
          }
        )
      ] })
    ] });
  }
  const counts = countLeaves(node);
  const allDisabled = counts.disabled === counts.total;
  const anyEnabled = counts.disabled < counts.total;
  const nodePending = collectLeafNames(node).some((n) => pendingTools.has(n));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    PrefixNodeEntry,
    {
      node,
      depth,
      counts,
      allDisabled,
      anyEnabled,
      nodePending,
      pendingTools,
      busy,
      onToggleTool,
      onToggleNode
    }
  );
}
function PrefixNodeEntry(props) {
  const { node, depth, counts, allDisabled, anyEnabled, nodePending, pendingTools, busy, onToggleTool, onToggleNode } = props;
  const [open, setOpen] = (0, import_react.useState)(depth < 1);
  const statusPill = allDisabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Pill, { children: "\u5168\u90E8\u5DF2\u7981\u7528" }) : anyEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_dsh_client_ui_primitives.Pill, { active: true, children: [
    counts.total - counts.disabled,
    "/",
    counts.total,
    " \u5DF2\u542F\u7528"
  ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_dsh_client_ui_primitives.Pill, { children: [
    counts.total,
    " \u4E2A\u5DE5\u5177"
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_dsh_client_ui_primitives.DisclosureRow,
    {
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 14, fontFamily: "ui-monospace, monospace", color: "var(--dsw-alias-label-secondary)" }, children: node.label }),
      title: "",
      open,
      expandable: true,
      onToggle: () => setOpen(!open),
      expandOnRowClick: true,
      collapsedContent: statusPill,
      keepContentWhenOpen: true,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 2, paddingLeft: 4 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: nodeActionsStyle, children: [
          statusPill,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              onClick: () => onToggleNode(node),
              disabled: busy && nodePending,
              children: anyEnabled ? "\u5168\u90E8\u7981\u7528" : "\u5168\u90E8\u542F\u7528"
            }
          )
        ] }),
        node.children.map((child) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          TreeEntry,
          {
            node: child,
            depth: depth + 1,
            pendingTools,
            busy,
            onToggleTool,
            onToggleNode
          },
          child.kind === "node" ? child.prefix : child.name
        ))
      ] })
    }
  );
}

// src/client/index.ts
var inject = ["slots"];
function apply(ctx) {
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dsh-tools-manager",
    order: 62,
    // after MCP (61)
    label: () => "\u5DE5\u5177\u7BA1\u7406",
    inject: () => ({})
  }, ToolsManagerPanel));
}
return module.exports; } });

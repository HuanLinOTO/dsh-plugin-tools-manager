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
var rowsStyle = {
  margin: "12px 0 0",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8
};
var groupCardStyle = {
  border: "1px solid var(--dsw-alias-border-l2)",
  borderRadius: 12,
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 6
};
var groupHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minHeight: 24,
  fontSize: 14,
  fontWeight: 500,
  color: "var(--dsw-alias-label-primary)"
};
var toolListStyle = {
  margin: "4px 0 0",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 0
};
var toolRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "8px 0",
  borderTop: "1px solid var(--dsw-alias-border-l1)"
};
var toolInfoStyle = {
  flex: 1,
  minWidth: 0
};
var toolNameStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--dsw-alias-label-primary)",
  fontFamily: "ui-monospace, monospace"
};
var toolDescStyle = {
  fontSize: 12,
  lineHeight: "18px",
  color: "var(--dsh-alias-label-tertiary, var(--dsw-alias-label-tertiary))",
  marginTop: 2,
  wordBreak: "break-word"
};
var toggleStyle = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 6
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
function ToolsManagerPanel(_props) {
  const [plugins, setPlugins] = (0, import_react.useState)([]);
  const [error, setError] = (0, import_react.useState)(void 0);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [pendingTool, setPendingTool] = (0, import_react.useState)(void 0);
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
  const toggle = (0, import_react.useCallback)(async (toolName, disabled) => {
    setBusy(true);
    setPendingTool(toolName);
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
      setPendingTool(void 0);
    }
  }, []);
  const totalTools = plugins.reduce((sum, g) => sum + g.tools.length, 0);
  const disabledCount = plugins.reduce((sum, g) => sum + g.tools.filter((t) => t.disabled).length, 0);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: sectionStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: titleStyle, children: "\u5DE5\u5177\u7BA1\u7406" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: introStyle, children: "\u6309\u6765\u6E90\u63D2\u4EF6\u5206\u7EC4\u5217\u51FA\u5168\u90E8\u5DF2\u6CE8\u518C\u5DE5\u5177\u3002\u7981\u7528\u7684\u5DE5\u5177\u5BF9\u6A21\u578B\u4E0D\u53EF\u89C1\u4E14\u6267\u884C\u88AB\u62D2\uFF08\u4E24\u5C42\u4E00\u81F4\uFF09\uFF0C\u8DE8\u4F1A\u8BDD\u6301\u4E45\u5316\u3002" }),
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
    loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: introStyle, children: "\u52A0\u8F7D\u4E2D\u2026" }) : plugins.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: emptyStyle, children: "\u5F53\u524D\u6CA1\u6709\u5DF2\u6CE8\u518C\u7684\u5DE5\u5177\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: rowsStyle, children: plugins.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: groupCardStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: groupHeaderStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: group.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_dsh_client_ui_primitives.Pill, { children: [
          group.tools.length,
          " \u5DE5\u5177"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: toolListStyle, children: group.tools.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: toolRowStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: toolInfoStyle, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: toolNameStyle, children: tool.name }),
          tool.description ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: toolDescStyle, children: tool.description }) : null
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: toggleStyle, children: [
          tool.disabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Pill, { children: "\u5DF2\u7981\u7528" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Pill, { active: true, children: "\u5DF2\u542F\u7528" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              onClick: () => void toggle(tool.name, !tool.disabled),
              disabled: busy && pendingTool === tool.name,
              children: tool.disabled ? "\u542F\u7528" : "\u7981\u7528"
            }
          )
        ] })
      ] }, tool.name)) })
    ] }, group.name)) })
  ] });
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

window.__ModuleLoader__.load({ id: "@huanlin/dsh-plugin-tools-manager", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_dsh_client_web_react = require("@deepseek-ai/dsh-client-web-react");

// src/client/ToolsManagerCard.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

var css = ".JRRTRq_card{border:1px solid var(--dsh-color-border,#e2e2e2);background:var(--dsh-color-surface,#fff);border-radius:8px;list-style:none;overflow:hidden}.JRRTRq_cardOpen{border-radius:8px}.JRRTRq_header{cursor:pointer;text-align:left;width:100%;font:inherit;background:0 0;border:none;align-items:center;gap:8px;padding:12px 16px;display:flex}.JRRTRq_header:hover{background:var(--dsh-color-surface-hover,#f5f5f5)}.JRRTRq_headText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.JRRTRq_name{color:var(--dsh-color-text,#1a1a1a);font-size:14px;font-weight:600}.JRRTRq_description{color:var(--dsh-color-text-secondary,#666);text-overflow:ellipsis;white-space:nowrap;font-size:12px;overflow:hidden}.JRRTRq_chevron{color:var(--dsh-color-text-secondary,#666);flex-shrink:0;transition:transform .15s}.JRRTRq_chevronOpen{transform:rotate(180deg)}.JRRTRq_body{border-top:1px solid var(--dsh-color-border,#e2e2e2);padding:0 16px 16px}.JRRTRq_notice{background:var(--dsh-color-surface-warning,#fff3cd);color:var(--dsh-color-text,#1a1a1a);border-radius:4px;margin:12px 0;padding:8px 12px;font-size:13px}.JRRTRq_footer{justify-content:flex-end;gap:8px;margin-top:12px;display:flex}.JRRTRq_retry{border:1px solid var(--dsh-color-border,#e2e2e2);background:var(--dsh-color-surface,#fff);cursor:pointer;font:inherit;border-radius:4px;padding:6px 16px;font-size:13px}.JRRTRq_retry:hover{background:var(--dsh-color-surface-hover,#f5f5f5)}.JRRTRq_tree{margin-top:8px}.JRRTRq_group{margin-bottom:12px}.JRRTRq_groupHeader{color:var(--dsh-color-text-secondary,#666);border-bottom:1px solid var(--dsh-color-border-light,#f0f0f0);margin-bottom:4px;padding:4px 0;font-size:13px;font-weight:600}.JRRTRq_toolRow{border-bottom:1px solid var(--dsh-color-border-light,#f5f5f5);align-items:flex-start;gap:12px;padding:8px 0;display:flex}.JRRTRq_toolRow:last-child{border-bottom:none}.JRRTRq_toolInfo{flex:1;min-width:0}.JRRTRq_toolName{color:var(--dsh-color-text,#1a1a1a);font-size:13px;font-weight:500;font-family:var(--dsh-font-mono,monospace)}.JRRTRq_toolDesc{color:var(--dsh-color-text-secondary,#666);word-break:break-word;margin-top:2px;font-size:12px;line-height:1.4}.JRRTRq_toggle{flex-direction:column;flex-shrink:0;align-items:center;gap:2px;display:flex}.JRRTRq_toggleButton{border:1px solid var(--dsh-color-border,#e2e2e2);background:var(--dsh-color-surface,#fff);cursor:pointer;font:inherit;border-radius:4px;min-width:60px;padding:4px 12px;font-size:12px}.JRRTRq_toggleButton:disabled{opacity:.5;cursor:not-allowed}.JRRTRq_toggleOn{background:var(--dsh-color-success-light,#d4edda);border-color:var(--dsh-color-success,#28a745);color:var(--dsh-color-success,#155724)}.JRRTRq_toggleOff{background:var(--dsh-color-danger-light,#f8d7da);border-color:var(--dsh-color-danger,#dc3545);color:var(--dsh-color-danger,#721c24)}.JRRTRq_toggleLabel{color:var(--dsh-color-text-secondary,#666);font-size:11px}.JRRTRq_toggleError{color:var(--dsh-color-danger,#dc3545);margin-top:8px;font-size:12px}.JRRTRq_noTools,.JRRTRq_loading{text-align:center;color:var(--dsh-color-text-secondary,#666);padding:16px 0;font-size:13px}";
var tagId = "@huanlin/dsh-plugin-tools-manager/ToolsManagerCard.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@huanlin/dsh-plugin-tools-manager";
  tag.dataset.pluginCss = tagId;
  tag.textContent = css;
  document.head.appendChild(tag);
}
var ToolsManagerCard_module_css_default = { "body": "JRRTRq_body", "card": "JRRTRq_card", "cardOpen": "JRRTRq_cardOpen", "chevron": "JRRTRq_chevron", "chevronOpen": "JRRTRq_chevronOpen", "description": "JRRTRq_description", "footer": "JRRTRq_footer", "group": "JRRTRq_group", "groupHeader": "JRRTRq_groupHeader", "headText": "JRRTRq_headText", "header": "JRRTRq_header", "loading": "JRRTRq_loading", "name": "JRRTRq_name", "noTools": "JRRTRq_noTools", "notice": "JRRTRq_notice", "retry": "JRRTRq_retry", "toggle": "JRRTRq_toggle", "toggleButton": "JRRTRq_toggleButton", "toggleError": "JRRTRq_toggleError", "toggleLabel": "JRRTRq_toggleLabel", "toggleOff": "JRRTRq_toggleOff", "toggleOn": "JRRTRq_toggleOn", "toolDesc": "JRRTRq_toolDesc", "toolInfo": "JRRTRq_toolInfo", "toolName": "JRRTRq_toolName", "toolRow": "JRRTRq_toolRow", "tree": "JRRTRq_tree" };

// src/client/ToolsManagerCard.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function ToolsManagerCard(props) {
  const { controller, useSnapshot, t } = props;
  const state = useSnapshot((snapshot) => snapshot);
  if (state.status === "idle") void controller.load();
  const [userOpen, setUserOpen] = (0, import_react.useState)(false);
  const degraded = state.status === "ready" && !state.available;
  const open = userOpen || degraded;
  const title = t("title");
  const header = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      type: "button",
      className: ToolsManagerCard_module_css_default.header,
      "aria-expanded": open,
      "aria-label": `${t(open ? "collapse" : "expand")}: ${title}`,
      onClick: () => {
        if (!degraded) setUserOpen(!userOpen);
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: ToolsManagerCard_module_css_default.headText, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: ToolsManagerCard_module_css_default.name, children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: ToolsManagerCard_module_css_default.description, children: t("intro") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.IconChevronDownOutline14,
          {
            className: open ? `${ToolsManagerCard_module_css_default.chevron} ${ToolsManagerCard_module_css_default.chevronOpen}` : ToolsManagerCard_module_css_default.chevron
          }
        )
      ]
    }
  );
  let body;
  if (degraded) {
    body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: ToolsManagerCard_module_css_default.body, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: ToolsManagerCard_module_css_default.notice, role: "status", children: t("namespaceUnavailable") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: ToolsManagerCard_module_css_default.footer, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: ToolsManagerCard_module_css_default.retry,
          onClick: () => {
            void controller.load();
          },
          children: t("retry")
        }
      ) })
    ] });
  } else if (state.status === "loading" || !state.available) {
    body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: ToolsManagerCard_module_css_default.body, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: ToolsManagerCard_module_css_default.loading, children: t("loading") }) });
  } else {
    body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: ToolsManagerCard_module_css_default.body, children: [
      state.plugins.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: ToolsManagerCard_module_css_default.noTools, children: t("noTools") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: ToolsManagerCard_module_css_default.tree, children: state.plugins.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        ToolGroupView,
        {
          group,
          t,
          pendingToggle: state.pendingToggle,
          onToggle: (toolName, disabled) => {
            controller.toggle(toolName, disabled);
          }
        },
        group.name
      )) }),
      state.toggleError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: ToolsManagerCard_module_css_default.toggleError, role: "status", children: state.toggleError }) : null
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: open ? `${ToolsManagerCard_module_css_default.card} ${ToolsManagerCard_module_css_default.cardOpen}` : ToolsManagerCard_module_css_default.card, children: [
    header,
    open ? body : null
  ] });
}
function ToolGroupView(props) {
  const { group, t, pendingToggle, onToggle } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: ToolsManagerCard_module_css_default.group, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: ToolsManagerCard_module_css_default.groupHeader, children: [
      group.name,
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: ToolsManagerCard_module_css_default.toolDesc, children: [
        "(",
        group.tools.length,
        ")"
      ] })
    ] }),
    group.tools.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ToolRowView,
      {
        tool,
        t,
        pending: pendingToggle === tool.name,
        onToggle: () => {
          onToggle(tool.name, !tool.disabled);
        }
      },
      tool.name
    ))
  ] });
}
function ToolRowView(props) {
  const { tool, t, pending, onToggle } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: ToolsManagerCard_module_css_default.toolRow, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: ToolsManagerCard_module_css_default.toolInfo, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: ToolsManagerCard_module_css_default.toolName, children: tool.name }),
      tool.description ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: ToolsManagerCard_module_css_default.toolDesc, children: tool.description }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: ToolsManagerCard_module_css_default.toggle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: `${ToolsManagerCard_module_css_default.toggleButton} ${tool.disabled ? ToolsManagerCard_module_css_default.toggleOff : ToolsManagerCard_module_css_default.toggleOn}`,
          disabled: pending,
          onClick: onToggle,
          children: tool.disabled ? t("enable") : t("disable")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: ToolsManagerCard_module_css_default.toggleLabel, children: tool.disabled ? t("disabled") : t("enabled") })
    ] })
  ] });
}

// src/client/store.ts
var import_client = require("@deepseek-ai/dsh-client-runtime/client");
function initialState() {
  return {
    status: "idle",
    loaded: false,
    available: false,
    plugins: [],
    pendingToggle: void 0,
    toggleError: void 0
  };
}
var ToolsManagerCardController = class {
  constructor() {
    __publicField(this, "store");
    __publicField(this, "loaded", false);
    __publicField(this, "generation", 0);
    this.store = (0, import_client.createSnapshotStore)(initialState());
    void this.load();
  }
  /**
   * Read the full tool tree from the Host HTTP route and publish it.
   * @returns settlement after the read.
   */
  async load() {
    const gen = ++this.generation;
    this.store.update((s) => {
      s.status = "loading";
    });
    let tree;
    try {
      const response = await fetch("/tools-manager/api/list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      });
      if (response.ok) {
        const parsed = await response.json().catch(() => null);
        if (parsed?.ok === true && parsed.value !== void 0) {
          tree = parsed.value;
        }
      }
    } catch {
    }
    if (gen !== this.generation) return;
    if (tree === void 0) {
      this.store.update((s) => {
        s.status = "ready";
        s.available = false;
      });
      return;
    }
    this.loaded = true;
    this.store.update((s) => {
      s.status = "ready";
      s.available = true;
      s.plugins = tree.plugins;
      s.pendingToggle = void 0;
      s.toggleError = void 0;
    });
  }
  /**
   * Toggle one tool's disabled state and refresh the tree.
   * @param toolName - the tool to toggle.
   * @param disabled - the new disabled state.
   */
  toggle(toolName, disabled) {
    void this.doToggle(toolName, disabled);
  }
  async doToggle(toolName, disabled) {
    const gen = ++this.generation;
    this.store.update((s) => {
      s.pendingToggle = toolName;
      s.toggleError = void 0;
    });
    try {
      const response = await fetch("/tools-manager/api/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toolName, disabled })
      });
      if (gen !== this.generation) return;
      if (!response.ok) {
        const parsed2 = await response.json().catch(() => null);
        const message = parsed2?.error?.message ?? `HTTP ${response.status}`;
        this.store.update((s) => {
          s.toggleError = message;
          s.pendingToggle = void 0;
        });
        return;
      }
      const parsed = await response.json().catch(() => null);
      if (parsed?.ok !== true || parsed.value === void 0) {
        const message = parsed?.error?.message ?? "unknown error";
        this.store.update((s) => {
          s.toggleError = message;
          s.pendingToggle = void 0;
        });
        return;
      }
      this.store.update((s) => {
        s.plugins = parsed.value.plugins;
        s.pendingToggle = void 0;
        s.toggleError = void 0;
      });
    } catch (error) {
      if (gen !== this.generation) return;
      this.store.update((s) => {
        s.toggleError = error instanceof Error ? error.message : String(error);
        s.pendingToggle = void 0;
      });
    }
  }
};
function refreshIfLoaded(controller) {
  if (controller.loaded) void controller.load();
}

// src/client/locales.ts
var NS = "tools-manager";
var zh = {
  title: "\u5DE5\u5177\u7BA1\u7406",
  intro: "\u6309\u6765\u6E90\u63D2\u4EF6\u5206\u7EC4\u5217\u51FA\u5168\u90E8\u5DF2\u6CE8\u518C\u5DE5\u5177\uFF0C\u652F\u6301\u5168\u5C40\u542F\u505C\u5355\u4E2A\u5DE5\u5177\u3002",
  pluginGroup: "\u63D2\u4EF6",
  unknownPlugin: "\uFF08\u672A\u77E5\u6765\u6E90\uFF09",
  baselinePlugin: "\uFF08\u542F\u52A8\u524D\u6CE8\u518C\uFF09",
  noTools: "\u5F53\u524D\u6CA1\u6709\u5DF2\u6CE8\u518C\u7684\u5DE5\u5177\u3002",
  loading: "\u52A0\u8F7D\u4E2D\u2026",
  loadFailed: "\u52A0\u8F7D\u5DE5\u5177\u5217\u8868\u5931\u8D25\u3002",
  disable: "\u7981\u7528",
  enable: "\u542F\u7528",
  disabled: "\u5DF2\u7981\u7528",
  enabled: "\u5DF2\u542F\u7528",
  expand: "\u5C55\u5F00",
  collapse: "\u6536\u8D77",
  namespaceUnavailable: "\u5DE5\u5177\u7BA1\u7406\u901A\u9053\u5F53\u524D\u4E0D\u53EF\u7528\u3002\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
  retry: "\u91CD\u8BD5"
};
var en = {
  title: "Tools Manager",
  intro: "Lists all registered tools grouped by source plugin. Toggle a tool to globally enable/disable it.",
  pluginGroup: "Plugin",
  unknownPlugin: "(unknown source)",
  baselinePlugin: "(registered at startup)",
  noTools: "No tools are currently registered.",
  loading: "Loading\u2026",
  loadFailed: "Failed to load the tool list.",
  disable: "Disable",
  enable: "Enable",
  disabled: "Disabled",
  enabled: "Enabled",
  expand: "Show",
  collapse: "Hide",
  namespaceUnavailable: "The tools-manager channel is unavailable. Please retry later.",
  retry: "Retry"
};

// src/client/index.ts
var inject = ["slots", "locale", "connection"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "tools-manager: dictionaries");
  const controller = new ToolsManagerCardController();
  const useSnapshot = (0, import_dsh_client_web_react.bindSnapshotSelector)(controller.store);
  ctx.effect(() => {
    let pending = false;
    const refresh = () => {
      if (pending) return;
      pending = true;
      queueMicrotask(() => {
        pending = false;
        refreshIfLoaded(controller);
      });
    };
    const disposers = [ctx.on("connection/reset", refresh)];
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "tools-manager: pushed invalidations");
  ctx.slots.inject("settings.plugin.item", function* () {
    yield ctx.slots.register({
      name: "settings.plugin.item",
      id: "dsh-tools-manager",
      order: 60,
      // after interpreters (50)
      locale: NS,
      inject: () => ({ controller, useSnapshot })
    }, ToolsManagerCard);
  });
}
return module.exports; } });

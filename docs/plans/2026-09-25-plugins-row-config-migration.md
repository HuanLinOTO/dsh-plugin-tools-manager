# 设置入口 → 插件页行配置迁移（dsh-plugin-tools-manager）

- 日期：2026-09-25
- 范围：client 半 UI 挂载面；host 半持久化（volatile Config / settings 桥 / gateway 写通道）零改动
- 动机：对齐舰队形态（dsh-plugin-preface-context / yet-another-subagent）。0.1.7-alpha.1 起 `settings.plugin.item` 退役，第三方插件的共享配置入口是 **Plugins 页的 `plugins.row.config`**（ui-plugin-manager 声明）；独立 `settings.section` Tab 形态随之退役。

## 契约要点（DSH 0.1.7-rc.1，已考证）

| 项 | 值 |
|---|---|
| slot | `plugins.row.config`，kind `keyed`、scope `root` |
| key | `<包名>#<行 id>`，行 id = `cordis.patch.yml` insert 行 `id` **逐字透传**（host `rows.push({ rowId: row.id })`；页面 `rowConfigKey()` 精确字符串匹配，写错即静默无入口） |
| 本插件 key | `@huanlin/dsh-plugin-tools-manager#tools-manager` |
| owner props | `PluginConfigViewProps { view: 'summary' \| 'page', form?: ConfigPageForm }`；行停用时 `form` 为 undefined |
| 页面职责 | 页面自画标题/图标/面包屑；贡献只画字段与文案（卡片不再输出页级 `<h2>`） |

三 id 一致性（写进 `src/client/row-config-key.ts` 注释并由 `tests/row-config-key.spec.ts` 固化）：

```
cordis.patch.yml insert 行 id = host 插件导出 name = settings entry id（gateway settings.update 第一参）= 'tools-manager'
```

## 改动

1. `src/client/index.ts`：`settings.section` 注册 → `ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('plugins.row.config', function* () { yield ctx.slots.register({ name, key, inject }, ToolsManagerPanel) }))`（`ctx.effect` 包裹，preface-context 同款）；`inject` 服务面 `['slots']` → `['slots', 'configForms']`。
2. `src/client/row-config-key.ts`（新）：`PACKAGE_NAME` / `ENTRY_ID` / `ROW_KEY` 派生，依赖零值导入，供测试固化。
3. `src/client/ToolsManagerPanel.tsx`：改为行配置卡片——
   - `view: 'summary'` → 一行简介（页面把它作为行描述兜底渲染）；
   - `view: 'page'` + `form === undefined` → 「行已停用/Host 未供配置」不可用提示；
   - `view: 'page'` + form → 原交互树（去掉页级 `<h2>`，标题/面包屑归页面）。
4. `package.json`：peer 新增 `@deepseek-ai/dsh-client-ui-plugin-manager`（type-only，^0.1.7-rc.1，optional）；`dsh.client.inject` 信息边补 renderer / ui-settings / ui-plugin-manager；description 措辞 settings card → Plugins-page row config card。
5. host 半仅注释随行为更真（`src/settings.ts`、`src/index.ts` 头注释里的挂载面描述）；逻辑零改动。
6. `tests/row-config-key.spec.ts`（新，4 用例）：key 派生、patch 行 id 逐字一致、行 name 指向本包、host `name`/`SETTINGS_NAMESPACE` 等于行 id。

## 数据通道取舍

**沿用自建 HTTP（`/tools-manager/api/list|set`），不改走 `props.form`**：

- 卡片的视图数据是 host `ToolRegistry` 归因出的**活工具树**（工具名/描述/来源插件分组），entry Config（`disabled: string[]`）不携带这些，改走 form 需把整棵树塞进持久化 schema——错误层次（view 数据 ≠ 持久化状态）。
- 写路径 `set` 经 host 端 `settings.update('tools-manager', { disabled })` 已迁移完毕且有测试；改走 form 需重写为 `mutate(ops, revision)` 批量编辑模型，改动面更大。
- `form` 仍被消费，但只作**可用性门**（`view:'page'` 且 form 缺失 → 不可用态）；注册生命周期由 `configForms.whileServed` 门控（行停用 → 配置入口随之消失，优于打开死页）。舰队先例：yet-another-subagent 自建数据层（RPC）+ keyed row config；preface-context 则是 form 驱动卡片 + whileServed——本插件取两者并集：whileServed 门控（preface-context 形态）+ 自建数据层（yet-another-subagent 形态）。

## 验证

```powershell
pnpm typecheck   # host 面（client 面仍由 esbuild 构建覆盖，同 2026-09-23 状态）
pnpm test        # 5 spec / 49 tests（原 45 + key 门禁 4）
pnpm run build   # tsc host + build-client.mjs（client bundle 纯度门 + __ModuleLoader__ 契约）
```

grep 门禁：`src/` 内 `settings\.section` 零匹配；`settings.register|settingsScope|dsh-settings-file` 零匹配；无 default 导出。

## 残余风险

- 未在真实 host 冒烟（禁止 `dsh web` 由人执行）：行配置入口出现、summary 兜底渲染、行停用后入口消失三项待实机复核。
- client 面仍不在 `pnpm typecheck` 内（历史状态；2026-09-23 已用临时 client tsconfig 对 registry 类型树校验过，本次改动沿用该口径，未新增 tsconfig）。

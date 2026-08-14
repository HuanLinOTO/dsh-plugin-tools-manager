# dsh-tools-manager

DSH 插件：以 tree 形式列出「插件 → 工具」，并支持全局启停单个工具。

- **Tree 列出工具**：按来源插件分组，展示每个插件注册的全部工具（name / description）。
- **全局启停**：对任意工具一键禁用/启用，跨会话持久化，立即生效（模型不可见 + 执行被拒，两层一致）。
- **UI 入口**：设置页「插件配置」分区卡片（`settings.plugin.item` slot）。

## 架构

### 工具来源归属（tree 数据基础）

- **归因算法**（零源码修改）：
  1. 启动时快照 `ctx.tools.schemas()` 作基线，归到 `(baseline)` 分组。
  2. 监听 Cordis `internal/plugin`（`fiber.name` = 插件名）→ 维护 `pendingPlugins` 栈。
  3. 监听 `tools/change`（register/unregister/restriction 均触发，unfiltered）→ 对 `ctx.tools.schemas()` 做 diff：
     - 新增工具 → 归因到栈顶（最近加载）插件；
     - 移除工具 → 从归属表删除。
  4. 插件卸载（`internal/status` DISPOSED）→ 其工具随 effect 自动注销，diff 自然移除。

### 全局启停（两层一致，缺一不可）

| 层 | 缝 | 实现 |
|---|---|---|
| 隐藏（模型不可见） | `system-prompt/assemble`（waterfall） | 过滤 `assembly.tools` 中 disabled 工具，返回变换后的 assembly |
| 拒执行（防绕过） | 全局 `ctx.tools.guard()`（plain ctx） | disabled 工具返回 reason（如 `tool "X" is disabled by tools-manager: "X"`） |

- 同一个 `disabled: Set<string>` 驱动两层，保证 prompt 与执行语义一致。
- 覆盖场景：模型直调（guard 兜底）、run_code SDK 子调用（guard 兜底）、隐藏后模型不再发起。
- 不依赖 `ctx.tools.restrict()`（其强制 scoped ctx，不能做全局过滤）。

### 持久化

- `ctx.settings.register('tools-manager', Config)` → 存 `$DSH_HOME/settings.yaml`，跨会话生效。
- `Config`：`{ disabled: string[] }`（Schemastery schema，默认 `[]`）。
- 设置变更即时应用（guard/assemble 读同一份 `disabled` 状态，无需重启）。

### Host↔Client 通道

- 宿主 HTTP 路由：`ctx.webServer.register({ kind: 'prefix', path: '/tools-manager/api', handler })`。
- 接口（JSON envelope）：
  - `POST /tools-manager/api/list` → `{ ok, value: { plugins: [{ name, tools: [{ name, description, disabled }] }] } }`
  - `POST /tools-manager/api/set` body `{ toolName, disabled }` → `{ ok, value: { plugins: [...] } }`
  - 错误：`{ ok: false, error: { code, message } }`

## 开发

```sh
pnpm install          # 安装依赖（link: 指向 ~/.dsh/source/current/）
pnpm run typecheck    # tsc --noEmit
pnpm test             # vitest run
pnpm run build        # tsc (host) + build-client.mjs (client bundle) + tsc (types)
```

### 目录结构

```
src/
├── index.ts              # Host 入口：name, inject, apply（registry + policy + gateway）
├── config.ts             # Config schema (schemastery), ResolvedConfig, resolveConfig
├── registry.ts           # ToolRegistry: 归因 diff（internal/plugin + tools/change）
├── policy.ts             # installPolicy: system-prompt/assemble 过滤 + tools.guard
├── settings.ts           # installToolsManagerSettings: 注册 namespace，返回 bridge
├── gateway.ts            # registerHttpGateway: /tools-manager/api 前缀路由（list/set）
└── client/
    ├── index.ts          # Client 入口：settings.plugin.item slot 注册
    ├── store.ts          # ToolsManagerCardController: fetch 调用 + SnapshotStore
    ├── ToolsManagerCard.tsx  # 配置卡片组件（tree + 开关）
    ├── ToolsManagerCard.module.css
    └── locales.ts        # i18n (zh + en)
```

## 运行

### 本地安装

```sh
dsh plugin --profile web add "link:D:/Projects/deepseek-harness/dsh-tools-manager"
```

### 配置

默认配置（`cordis.patch.yml`）：

```yaml
disabled: []    # 预置禁用的工具名列表（默认空）
```

运行时通过设置页「插件配置」分区的卡片修改，持久化到 `$DSH_HOME/settings.yaml`。

## 检查

```sh
pnpm run typecheck && pnpm test && pnpm run build
```

验证 `lib/` 产物：
- `lib/index.js` — host bundle（ESM）
- `lib/client.js` — client bundle（CJS，`window.__ModuleLoader__.load` 包裹）
- `lib/types/` — TypeScript 声明文件
- `cordis.patch.yml` — bundle 配置层

## 已知边界

| 风险 | 影响 | 缓解 |
|---|---|---|
| 归因偏移（插件运行期动态注册工具） | tree 中工具挂错插件 | 记录 Known Limitations；`list` 接口对未归属工具归到 `(unknown)` 分组 |
| `system-prompt/assemble` 多监听时序 | 其他插件也可能变换 tools | 本项目过滤只删 disabled，`next()` 委托其余；序靠后仍正确 |
| guard 与 assemble 双层不同步 | 隐藏与拒执行不一致 | 单一 `disabled` 状态源；单测断言两缝读同一状态 |
| settings 服务缺失 | 启停不持久 | 降级为内存态（仅本次运行生效），`set` 返回明确错误 |
| `run_code` 模式 | 模型经 SDK 子调用禁用工具 | guard 全局兜底拒绝；文档说明"禁用=执行不可达" |

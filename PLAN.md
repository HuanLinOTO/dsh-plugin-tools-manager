# DSH Tools 管理插件 · 开发计划（PLAN）

> 定位：以 **tree 形式列出「插件 → 工具」**，并支持 **全局启停** 单个工具。
> 零源码修改，bundle 形式发布（遵循 `plugin-development-guide.md`）。
> 前置调研结论见 `outline.yaml` / `fields.yaml`，本计划直接落到实现。

---

## 1. 命名与仓库

| 项 | 值 |
|---|---|
| 目录/仓库 | `dsh-tools-manager`（`D:\Projects\deepseek-harness\dsh-tools-manager`） |
| 包名 | `@huanlin/dsh-plugin-tools-manager` |
| 版本 | `0.1.0` |
| 发布 | `dsh-external` 组织 **private** 仓库；预构建 `lib/` 入库（client 插件必选） |

---

## 2. 功能需求（本次范围）

1. **Tree 列出工具**：按来源插件分组，展示每个插件注册的全部工具（name / description / 参数概览）。
2. **全局启停**：对任意工具一键禁用/启用，跨会话持久化，立即生效（模型不可见 + 执行被拒，两层一致）。
3. UI 入口：设置页「插件配置」分区卡片（`settings.plugin.item` slot）。

不做（后续迭代）：审批策略管理、使用审计统计、会话级过滤。

---

## 3. 技术方案（机制已代码级确认）

### 3.1 工具来源归属（tree 数据基础）

- **归因算法**（零源码修改下的可行方案）：
  1. 启动时快照 `ctx.tools.schemas()` 作基线。
  2. 监听 Cordis `internal/plugin`（`fiber.name` = 插件名）→ 维护 `pendingPlugins` 栈。
  3. 监听 `tools/change`（register/unregister/restriction 均触发，unfiltered）→ 对 `ctx.tools.schemas()` 做 diff：
     - 新增工具 → 归因到栈顶（最近加载）插件；
     - 移除工具 → 从归属表删除。
  4. 插件卸载（`fiber.dispose` 配对）→ 其工具随 effect 自动注销，diff 自然移除。
- **精度边界**（已记录，作为 Known Limitations）：
  - 插件运行期动态注册工具：归因可能偏移到"当前栈顶"；
  - 并发加载窗口内：以最近加载者为准。
- **数据结构**：
  ```ts
  interface ToolEntry { name: string; description: string; parameters: JsonSchemaNode }
  // pluginName -> tools（保持注册顺序）
  // toolName -> { entry, pluginName, disabled: boolean }
  ```

### 3.2 全局启停（两层一致，缺一不可）

| 层 | 缝 | 实现 |
|---|---|---|
| 隐藏（模型不可见） | `system-prompt/assemble`（waterfall） | 过滤 `assembly.tools` 中 disabled 工具，返回变换后的 assembly |
| 拒执行（防绕过） | 全局 `ctx.tools.guard()`（plain ctx） | disabled 工具返回 reason（如 `tool "X" is disabled by tools-manager`） |

- 同一个 `disabled: Set<string>` 驱动两层，保证 prompt 与执行语义一致。
- 覆盖场景：模型直调（guard 兜底）、run_code SDK 子调用（guard 兜底）、隐藏后模型不再发起。
- 不依赖 `ctx.tools.restrict()`（其强制 scoped ctx，不能做全局过滤）。

### 3.3 持久化

- `ctx.settings.register('tools-manager', Config)` → 存 `$DSH_HOME/settings.yaml`，跨会话生效。
- `Config`：`{ disabled: string[] }`（Schemastery schema，默认 `[]`）。
- 设置变更即时应用（guard/assemble 读同一份 `disabled` 状态，无需重启）。

### 3.4 Host↔Client 通道

- 宿主 HTTP 路由：`ctx.webServer.register({ kind: 'prefix', path: '/tools-manager/api', handler })`。
- ⚠️ 不使用 typertRemote（SRC discovery 不 claim 插件服务端点，已确认的坑）。
- 接口（JSON envelope，仿 dsh-interpreters）：
  - `POST /tools-manager/api/list` → `{ ok, value: { plugins: [{ name, tools: [{ name, description, disabled }] }] } }`
  - `POST /tools-manager/api/set` body `{ toolName, disabled }` → `{ ok, value: { plugins: [...] } }`（返回刷新后的全量 tree）
  - 错误：`{ ok: false, error: { code, message } }`

---

## 4. 工程结构（文件清单）

```
dsh-tools-manager/
├── src/
│   ├── index.ts              # 入口：name / inject / Config / apply
│   ├── registry.ts           # 工具归属 registry（internal/plugin + tools/change diff）
│   ├── policy.ts             # 全局启停：system-prompt/assemble 过滤 + tools.guard
│   ├── settings.ts           # ctx.settings 命名空间注册与读取
│   ├── gateway.ts            # /tools-manager/api 前缀路由（list/set）
│   └── client/
│       ├── index.ts          # client 入口：settings.plugin.item slot 注册
│       ├── store.ts          # SnapshotStore + fetch 调用
│       ├── components/
│       │   ├── ToolsTree.tsx # 插件 → 工具 tree + 开关
│       │   └── ToolRow.tsx   # 单工具行（name/description/switch）
│       └── locales.ts        # zh/en
├── tests/
│   ├── registry.spec.ts      # 归因 diff（新增/移除/插件卸载）
│   ├── policy.spec.ts        # assemble 过滤 + guard 拒绝（含一致性）
│   ├── gateway.spec.ts       # list/set 契约 + 错误路径
│   └── loader.e2e.ts         # 真实组合（Loader + cordis.yml）preflight
├── cordis.patch.yml          # insert 行（id/name/config）
├── package.json              # dsh.bundle.patch + peerDeps + scripts
├── tsconfig.json / tsconfig.build.json
├── scripts/build-client.mjs  # esbuild 打包 client bundle（照 dsh-interpreters）
├── vitest.config.ts
└── README.md                 # 开发/运行/检查三节
```

### 关键声明

```yaml
# cordis.patch.yml
- insert:
    - id: tools-manager
      name: '@huanlin/dsh-plugin-tools-manager'
      config:
        disabled: []          # 预置禁用（可选，默认空）
```

```jsonc
// package.json 要点
{
  "name": "@huanlin/dsh-plugin-tools-manager",
  "main": "./lib/index.js",
  "exports": { ".": {...}, "./client": {...} },
  "files": ["lib/", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" }, "client": { "platform": "web" } },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1-rc.1",
    "@deepseek-ai/dsh-tools": "^0.0.1-rc.1",
    "@deepseek-ai/dsh-system-prompt": "^0.0.1-rc.1",
    "@deepseek-ai/dsh-settings": "^0.0.1-rc.1",
    "@deepseek-ai/dsh-host-webserver": "^0.0.1-rc.1",
    "@deepseek-ai/dsh-client-runtime": "^0.0.1-rc.1",
    "@deepseek-ai/dsh-client-ui-settings-plugins": "^0.0.1-rc.1",
    "@deepseek-ai/dsh-client-ui-slots": "^0.0.1-rc.1",
    "@deepseek-ai/dsh-client-web-react": "^0.0.1-rc.1",
    "@deepseek-ai/dsh-client-connection": "^0.0.1-rc.1",
    "@deepseek-ai/dsh-client-locale": "^0.0.1-rc.1",
    "react": "^18.2.0",
    "schemastery": "^3.18.0"
  }
}
```

---

## 5. 实现步骤（里程碑）

| # | 里程碑 | 内容 | 验收 |
|---|---|---|---|
| M1 | host 核心 | 脚手架（package.json/tsconfig/cordis.patch.yml）+ `registry.ts` 归属 + `policy.ts` 启停 | 单测：归因 diff、assemble 过滤、guard 拒绝全绿 |
| M2 | 网关+持久化 | `settings.ts` + `gateway.ts`（list/set） | 单测：list 契约、set 持久化、错误路径 |
| M3 | client UI | `settings.plugin.item` 卡片：tree + 开关 + fetch 通道 | 浏览器手测：开关即时生效、重启后状态保留 |
| M4 | 测试+合规+发布 | `loader.e2e.ts` 真实组合；合规自检（§10 清单）；`gh repo create --private` + 发布 | e2e 绿；合规清单全勾；private 仓库确认 |

开发循环：`pnpm typecheck` → `pnpm test` → `pnpm build` → `dsh plugin --profile web add link:...`（重启 web 由人工执行）。

---

## 6. 测试计划

| 层 | 覆盖 |
|---|---|
| Unit（vitest） | 归因 diff（新增/移除/卸载）、assemble 过滤（disabled 移除 + 其余保留）、guard 拒绝（reason + 非 disabled 放行）、gateway 契约（list/set/envelope/404） |
| 真实组合 | `loader.e2e.ts`：Loader + 测试 cordis.yml 挂载插件，断言 `ctx.tools.schemas()` 不含 disabled、执行被拒（`INVALID_ARGS`/guard reason） |
| 手测（web） | 设置卡片渲染、开关即时生效、重启保留、`run_code` 子调用被拒 |

---

## 7. 合规自检（发布前逐项勾）

- [ ] 零源码 patch（未改 `dsh/` 任何文件）
- [ ] B1/B2/B3：`dsh.bundle.patch` + 自带 `cordis.patch.yml`（insert 行 name 用包名）
- [ ] F1：`files` 含 `lib/` + `cordis.patch.yml`
- [ ] F2：peerDependencies 含 cordis + 用到的 `@deepseek-ai/*`（不用 devDeps 冒充）
- [ ] F3：typecheck / test / build 三 script 齐全
- [ ] A4：Config 用 Schemastery schema
- [ ] A6：不导出 default
- [ ] C4/C9：工具返回规范 JSON（本项目不注册模型工具，不适用）
- [ ] G：Unit + 真实组合 preflight
- [ ] README 含开发/运行/检查三节
- [ ] 发布 `--private`（内测红线）

---

## 8. 风险与已知边界

| 风险 | 影响 | 缓解 |
|---|---|---|
| 归因偏移（插件运行期动态注册工具） | tree 中工具挂错插件 | 记录 Known Limitations；`list` 接口对未归属工具归到 `(unknown)` 分组 |
| `system-prompt/assemble` 多监听时序 | 其他插件也可能变换 tools | 本项目过滤只删 disabled，`next()` 委托其余；序靠后仍正确 |
| guard 与 assemble 双层不同步 | 隐藏与拒执行不一致 | 单一 `disabled` 状态源；单测断言两缝读同一状态 |
| settings 服务缺失 | 启停不持久 | 降级为内存态（仅本次运行生效），`set` 返回明确错误 |
| `run_code` 模式 | 模型经 SDK 子调用禁用工具 | guard 全局兜底拒绝；文档说明"禁用=执行不可达" |

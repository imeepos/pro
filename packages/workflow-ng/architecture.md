# Workflow NG Architecture

## 愿景与范围
- 将 `@pro/workflow-core` 的画布协议、AST 编译器与运行时能力可视化呈现，不修改核心包。
- 支持节点拖拽、连线、属性配置、版本管理等低代码体验，最终输出符合 `workflow-core` 规范的 JSON。
- 作为前后端共享的 UI SDK，被 `apps/web` 和 `apps/admin` 嵌入，提供统一的工作流画布体验。

## 技术栈选择
- **框架**：Angular 17（已有项目栈，便于与现有应用整合）。
- **语言**：TypeScript 5.x，开启严格模式；ESLint + Prettier 继承仓库规范。
- **包管理**：pnpm；构建由 `ng-packagr` 输出可复用库。
- **状态管理**：NgRx Store + Signals（Store 处理全局画布状态，Signals 管理组件内的高频 UI 状态）。
- **拖拽与渲染**：Angular CDK DragDrop、SVG + Canvas 混合渲染；复杂连线使用 `@ngrx/svg` 或自定义路径计算。
- **表单**：Angular Reactive Forms + Zod (通过 `@pro/types` zod schema) 做配置校验。
- **通信**：RxJS event bus；与后端/NestJS 交互使用 `@pro/sdk`.
- **样式**：Tailwind CSS + PostCSS；主题遵循设计系统。
- **图标**：Lucide + 自制端口/控制图标。
- **测试**：Jest + Testing Library for Angular；Playwright 做端到端交互测试。

## 包目录规划
```
packages/workflow-ng/
├─ src/
│  ├─ public-api.ts
│  ├─ lib/
│  │  ├─ core/                # 无状态工具：坐标、几何、策略、常量
│  │  ├─ data-access/         # NgRx store、effects、selectors、facades
│  │  ├─ services/            # BlueprintService、CanvasSerializer 等
│  │  ├─ components/          # 可视化组件（按照功能域拆分子目录）
│  │  ├─ overlays/            # 上下文菜单、快捷面板
│  │  ├─ forms/               # 节点/连线配置表单
│  │  ├─ guards/              # 进入/离开画布前的校验 hook
│  │  ├─ utils/               # 通用工具（Throttle、Keybinding 等）
│  │  └─ tokens/              # InjectionToken 定义
│  ├─ styles/                 # Tailwind 配置、mixins
│  └─ environments/           # 可选环境配置
├─ __stories__/               # Storybook 文档，展示组件状态
├─ __tests__/                 # 集中测试资源（unit、integration）
└─ architecture.md            # 本文档
```

## 模块划分
- `WorkflowCanvasModule`：公开给业务应用使用的顶层模块，导出 Shell 组件与服务。
- `CanvasStoreModule`：封装 NgRx store、effects，定义 `WorkflowState`、`SelectionState`、`HistoryState`。
- `BlueprintModule`：加载 `@pro/workflow-core` 提供的蓝图、端口类型；支持动态注册。
- `InteractionModule`：拖拽、连线、框选、缩放等交互策略。
- `InspectorModule`：节点与连线的配置表单、校验提示。
- `DiagnosticsModule`：运行时日志、校验错误、性能面板。
- `CollaborationModule`（可选）：多人协作、光标同步扩展。

## 组件树
```
<pro-workflow-canvas-shell>
├─ <pro-workflow-toolbar>         // 保存、撤销、放大缩小、布局
├─ <pro-workflow-body>
│  ├─ <pro-workflow-node-palette>     // 节点库 / 搜索
│  ├─ <pro-workflow-viewport>         // 主画布 (SVG/Canvas)
│  │  ├─ <pro-workflow-grid>
│  │  ├─ <pro-workflow-edge-layer>
│  │  ├─ <pro-workflow-node-layer>
│  │  └─ <pro-workflow-mini-map>
│  └─ <pro-workflow-inspector>        // 属性/端口/连接配置
└─ <pro-workflow-event-overlay>   // 快捷键提示、上下文菜单、快捷输入
```
- `node-palette`：读取蓝图列表，拖拽创建节点；支持分组和搜索。
- `node-layer`：每个节点组件承担渲染、端口展示、选中状态、拖动处理。
- `edge-layer`：负责贝塞尔曲线绘制、条件/优先级装饰、连线高亮。
- `inspector`：动态读取节点 schema，生成表单并实时校验。
- `event-overlay`：集中处理右键菜单、快捷操作、快捷键提示。

## 状态模型
```ts
interface WorkflowState {
  canvas: WorkflowCanvasModel;          // 源自 workflow-core 文档
  blueprintCatalog: Record<string, NodeBlueprint>;
  selection: SelectionState;            // 当前选中的节点/连线
  viewport: ViewportState;              // 缩放、偏移
  interaction: InteractionState;        // 正在拖拽/连线/框选
  diagnostics: DiagnosticEntry[];
  history: HistoryState;                // undo/redo stacks
}

interface SelectionState {
  nodes: string[];
  edges: string[];
  focusPort?: { nodeId: string; portId: string };
}
```
- Store 中 `canvas` 是唯一真源，所有操作都生成 `CanvasCommand`（addNode、connectNodes、updatePort 等）。
- 通过 `HistoryState` 管理撤销重做；采用命令模式，所有命令都可记录。
- `viewport` 由 Signals 管理，在高频操作时避免 Store 频繁 dispatch，必要时才同步 Store。

## 交互流程
1. **拖拽节点**：palette 发出 `createNode` 命令 → Store 生成节点 ID、默认端口 → viewport 渲染。
2. **连线**：拖拽端口 → 启动连线草图 → 松开端口触发 `connectNodes` 命令，校验 `PortKind` 与 `dataType` → 合法则生成 `CanvasEdge`。
3. **属性配置**：inspector 使用表单绑定 Store 中节点配置，实时校验（Zod + JSON Schema），不合法时不能保存。
4. **上下文菜单**：提供复制、粘贴、分组、折叠子图等操作。
5. **键盘快捷键**：统一由 `KeybindingService` 注册（例如 Ctrl+S 保存、Ctrl+Z 撤销）。
6. **视图控制**：滚轮/触控板缩放，按住空格拖动画布，mini map 便于快速定位。
7. **校验提示**：GraphValidator（来自 workflow-core 编译器）在前端运行，实时高亮无效连接或缺失端口。

## 数据流与核心服务
- `BlueprintService`：从 `workflow-core` 或远程 API 加载蓝图；支持懒加载、缓存、热更新。
- `CanvasSerializer`：将 Store 中的状态序列化为 `WorkflowCanvasModel`，用于保存/下载。
- `CoreIntegrationService`：
  - 调用 `@pro/workflow-core` 的 `WorkflowCompiler` 进行本地编译，返回 AST 与诊断。
  - 调用 `WorkflowExecutor` 进行沙箱运行，提供“预演”能力。
- `PersistenceService`：封装 CRUD API（加载版本、保存草稿、发布上线）；支持自动保存和冲突检测。
- `CollaborationGateway`（扩展）：使用 WebSocket/SignalR 同步画布操作，基于 Operational Transform 或 CRDT。

## 校验与提示
- 即时校验：节点必须满足必填端口；连线类型匹配；禁止自环或重复连线。
- 编译校验：调用 workflow-core 的 GraphValidator 得到详细错误；错误在画布上高亮。
- 发布校验：保存前必须通过编译；若存在警告需用户确认。
- 诊断面板：展示错误、警告、编译耗时、执行模拟结果。

## 可视化细节
- 节点卡片：显示名称、类型徽章、端口列表；状态染色（默认、选中、错误）。
- 端口：输入端在左、输出端在右；数据端口用圆点，控制端口用菱形；hover 时显示数据类型。
- 连线：贝塞尔曲线，自带箭头；控制连线以虚线表示；条件表达式以标签展示。
- Mini Map：SVG 缩略图，支持拖拽视窗。
- 网格与对齐：背景网格 + 节点吸附，确保布局整齐。

## 日志与可观察性
- `TelemetryService` 推送关键事件（节点创建、发布、编译失败等）到 `@pro/logger`。
- 记录用户交互时长、失败率，为产品优化提供数据。
- 支持在诊断面板查看操作历史。

## 测试策略
- **单元测试**：组件和 Store reducers 使用 Jest + Testing Library。
- **集成测试**：利用 Spectator/Testing Library 模拟节点创建、连线、保存流程。
- **端到端测试**：Playwright 覆盖关键用户路径（拖拽、连接、保存、预演）。
- **可访问性测试**：axe-core 检测，确保无障碍（键盘操作、ARIA 标签）。
- **视觉回归**：利用 Percy 或 Chromatic，对 Storybook 中的节点状态做视觉对比。

## 性能与优化
- 使用虚拟化技术处理大图：只渲染视窗范围内的节点/连线。
- 节点/连线组件尽量无状态，使用 Signals 与 `OnPush` 策略。
- 连线计算缓存：针对同源端口的路径缓存结果。
- 事件节流/去抖：拖拽、缩放、鼠标移动等操作做 16ms 节流。

## 无障碍与国际化
- 所有操作提供键盘替代路径（Tab/Enter 选择端口，回车创建连接）。
- ARIA 标签描述节点与端口，提醒使用者当前状态。
- 文案国际化：使用 `@ngx-translate`，默认中文，支持英文切换。
- 对色盲友好：色彩对比达标，提供高对比度主题。

## 集成与发布
- `WorkflowCanvasComponent` 通过 @Input/@Output 与宿主应用交互；提供 `FormControl` 适配器便于表单集成。
- 在 `apps/web` / `apps/admin` 中以懒加载模块形式引入，减少首屏成本。
- 版本发布由 `ng-packagr` 输出库，`package.json` 指向 `fesm2022`、`esm2022`。
- 提供 Storybook 文档站点供产品/设计预览交互。

## 实施路线图
1. **基础设施**：搭建模块、Store、Service 骨架；接入 Tailwind 和 CDK。
2. **节点最小链路**：实现节点拖拽、位置管理、保存 JSON。
3. **连线与校验**：完成连线交互、类型校验、错误提示。
4. **属性配置**：Inspector 表单、Zod 校验、命令式更新。
5. **编译与预演**：对接 workflow-core 编译器和执行器，支持预演。
6. **诊断与历史**：加入历史记录、诊断面板、日志打点。
7. **多人协作**（可选）：实现协作网关、冲突解决、权限控制。
8. **完善测试**：补足单测、E2E、视觉回归，准备公开文档和 Storybook。

借助上述方案，`workflow-ng` 将成为一个高内聚、可移植的前端画布库，为现有系统提供优雅的工作流可视化能力。*** End Patch

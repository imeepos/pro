# Workflow Canvas Redesign

## 面向产品伙伴的直观说明
- 你可以把「工作流画布」想成一个拼乐高的空间：每个节点就是一个乐高砖，代表一个业务步骤（比如“获取文章”“调用大模型”“输出总结”）。
- 节点上有不同的“插槽”（端口），类似乐高的凸起或凹槽，用来传递数据或者控制执行顺序。把插槽连起来，就定义了执行流程。
- 整个画布会被保存成 JSON 文档，后端读取后能准确知道“先做哪个节点”“节点需要什么数据”“结果往哪里流”。
- 运行时会像指挥官一样读取这份文档，按顺序触发节点；每个节点执行完毕，会把结果交给下一个节点。
- 如果某个节点失败，我们会记录原因并决定是否重试，保证流程的可靠性。

## 使用的技术栈
- **语言与运行环境**：TypeScript（严格的类型系统）运行在 Node.js 20。
- **包管理与构建**：pnpm（轻量高速的包管理），搭配 Turbo 做多包协同构建。
- **核心库**：`@pro/workflow-core` 自研执行引擎；依赖 `@pro/core` 进行依赖注入、类型注册。
- **数据格式**：所有画布与 AST 信息都使用 JSON 保存，方便存储与网络传输。
- **运行框架**：后端服务基于 NestJS，可直接加载执行引擎；前端画布可使用 Angular 或其它框架，只要遵守 JSON 协议即可。

## 目录规划
`workflow-core` 只承担「画布协议 + AST 编译 + 执行引擎」的职责，不混入 UI 代码：

- `packages/workflow-core/src/canvas`：画布协议相关定义，包含 `CanvasNode`/`CanvasEdge` 类型、示例 JSON 以及节点蓝图注册表。
- `packages/workflow-core/src/compiler`：将画布 JSON 编译为 AST 的流水线模块，例如 `canvas-normalizer.ts`、`graph-validator.ts`、`ast-assembler.ts`。
- `packages/workflow-core/src/runtime`：执行阶段需要的调度器、数据流管理器、执行上下文与日志器。
- `packages/workflow-core/src/nodes`：内置节点实现（如 Input、Output、Noop）及其运行时代码，未来可按领域扩展子目录。
- `packages/workflow-core/__tests__`：按照功能域分组的单元测试与端到端测试，覆盖编译和执行完整链路。
- `packages/workflow-core/examples`（新建）：“从画布到执行”的示例 JSON 与使用说明，帮助非技术成员验证流程。

如需前端画布，可在独立包（例如 `packages/workflow-ng`）中实现。该前端通过读取 `workflow-core` 暴露的蓝图和类型生成 UI，不反向依赖核心包的任何运行时代码，从而维持单一职责。

## 设计愿景
- 画布是 workflow-core 的唯一权威输入，后端依据它重建 AST 与运行时所需全部信息。
- AST 只保留运行所需的节点、端口、连线和调度语义，任何派生信息都在构建时计算而不是长期存储。
- 输入节点与输出节点严格定义数据边界，所有业务节点通过显式端口连通，实现 input -> output 的可追踪数据流。
- 执行器围绕节点端口契约运行，调度器只关注依赖图和状态，错误处理与日志成为理解系统的叙事。

## 领域语言
画布描述的是一组节点与它们的端口，通过连线表达数据和控制依赖。下面的核心模型构成画布协议（输出为 JSON，可直接写入或读取数据库）：

```ts
type WorkflowVersion = `${number}.${number}.${number}`;

type NodeKind = 'input' | 'output' | 'transform' | 'branch' | 'composite';
type PortDirection = 'input' | 'output';
type PortKind = 'data' | 'control';
type PortArity = 'single' | 'variadic';

interface CanvasPortSignature {
  id: string;
  name: string;
  direction: PortDirection;
  kind: PortKind;
  dataType: string;      // 使用 @pro/types 中的类型别名
  arity: PortArity;
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

interface CanvasNode {
  id: string;
  kind: NodeKind;
  type: string;          // 运行时节点类型唯一标识，如 'http.fetch'、'llm.prompt'
  name: string;
  ports: CanvasPortSignature[];
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface CanvasEdge {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
  constraints?: {
    expression?: string;   // 控制流条件，解析为逻辑表达式
    priority?: number;     // 用于多输入排序
  };
}

interface WorkflowCanvasModel {
  id: string;
  name: string;
  version: WorkflowVersion;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  metadata?: Record<string, unknown>;
}
```

### 节点分类
- `input`：将执行上下文映射到数据端口，例如读取流程入参、环境变量或上游事件。
- `output`：汇聚最后的结果，决定写回调用方的数据格式。
- `transform`：纯函数节点，只依赖输入端口数据，产生新的输出。
- `branch`：基于数据或状态做控制流分支，产出多个控制端口。
- `composite`：封装子图或可复用组件，对外表现为单节点。

### 端口规范
- 每个端口由方向、数据类型、基数（单值/多值）和是否必填组成。
- 多值输入 (`variadic`) 会在编译为 AST 时展开为数组聚合，写入节点实例属性。
- 数据类型字符串使用统一 Schema（如 `types.WorkflowDataType`），方便运行时验证。

### 连线语义
- 数据连线：将 `from` 节点指定输出端口绑定到目标节点输入端口，触发数据复制或聚合。
- 控制连线：只有 `constraints.expression` 时生效，表达式在源节点输出数据上求值，决定下游是否激活。
- 所有连线都必须指向目标端口，禁止模糊映射，从根本上保证 input -> output 的可追踪性。

### 节点蓝图注册表
每种节点类型通过蓝图声明自身端口、配置表单与运行时执行器：

```ts
interface NodeBlueprint {
  type: string;
  kind: NodeKind;
  label: string;
  ports: CanvasPortSignature[];
  schema: Record<string, unknown>;           // JSON Schema 校验 config
  createRuntime(): NodeRuntime<any, any>;
}
```

`NodeRegistry` 暴露 `register(blueprint)` 与 `get(type)`，画布加载时读取注册表渲染节点列表，编译时利用蓝图构建 AST，并确保运行时有对应执行器。

## AST 结构
AST 是可执行的最小表达：节点实例化后的属性、端口绑定和调度元信息。

```ts
interface WorkflowMetadata {
  version: WorkflowVersion;
  createdBy?: string;
  createdAt?: string;
  tags?: string[];
}

interface WorkflowGraphAst extends Ast {
  type: 'WorkflowGraphAst';
  name: string;
  metadata: WorkflowMetadata;
  nodes: WorkflowNodeAst[];
  edges: WorkflowEdgeAst[];
}

interface WorkflowNodeAst extends Ast {
  type: string;
  kind: NodeKind;
  displayName: string;
  ports: WorkflowPortAst[];
  config: Record<string, unknown>;
  runtime: string;   // 对应蓝图 type，运行时通过它定位执行器
}

interface WorkflowPortAst {
  id: string;
  name: string;
  direction: PortDirection;
  kind: PortKind;
  arity: PortArity;
  dataType: string;
  propertyKey: string;   // 节点实例上的属性名
}

interface PortBindingAst {
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
  condition?: string;
  priority?: number;
}

interface WorkflowEdgeAst extends IEdge {
  id: string;
  binding: PortBindingAst;
}
```

为兼容现有的数据流处理器，`AstAssembler` 会同时将 `binding.fromPort` 与 `binding.toPort` 写入 `fromProperty` / `toProperty` 字段，保留向后兼容能力。

### 输入与输出节点
- `InputNodeAst`：继承 `WorkflowNodeAst`，默认只有输出端口，将 `ExecutionContext.payload` 里的键映射到端口，运行时无需外部连线即可产生初始数据。
- `OutputNodeAst`：只有输入端口，聚合所有上游输出。执行后将数据写入 `ExecutionResult.output`，成为工作流可观察的终点。

### AST 构建示例
```ts
const compiler = new WorkflowCompiler(nodeRegistry);

const ast = compiler.compile({
  id: 'wf_01',
  name: 'Summarize Article',
  version: '1.0.0',
  nodes: [...],
  edges: [...]
});

// 生成的 AST 包含严格的端口绑定：
ast.edges[0].binding // -> { fromNode: 'input', fromPort: 'article', toNode: 'llm', toPort: 'prompt' }
```

## 运行时设计

### 节点运行时契约
```ts
interface ExecutionContext {
  workflowId: string;
  runId: string;
  payload: Record<string, unknown>;
  logger: WorkflowLogger;
  get(name: string): unknown;            // 读取上下文扩展
  set(name: string, value: unknown): void;
  emit(event: WorkflowEvent): void;      // 发布执行事件
}

interface NodeExecutionResult<TState = unknown> {
  state: IAstStates;
  output?: Record<string, unknown>;
  transition?: 'next' | 'skip';
  internalState?: TState;
  diagnostics?: WorkflowDiagnostic[];
}

interface NodeRuntime<TInput = Record<string, unknown>, TState = unknown> {
  readonly type: string;
  initialize?(context: ExecutionContext): Promise<void> | void;
  resolveInput(bindings: PortBindingAst[], context: ExecutionContext): Promise<TInput> | TInput;
  execute(input: TInput, context: ExecutionContext): Promise<NodeExecutionResult<TState>>;
  finalize?(result: NodeExecutionResult<TState>, context: ExecutionContext): Promise<void> | void;
}
```

### 执行生命周期
1. **hydrate**：调度器读取 `InputNodeAst`，构建初始输出映射。
2. **validate**：运行 `GraphValidator`（无环检测、端口兼容性、必填端口检查）。
3. **schedule**：`WorkflowScheduler` 根据依赖分析选择可执行节点，同步更新 `state`。
4. **resolve**：通过 `resolveInput` 将所有上游输出映射到节点属性（保持属性名 = 端口 `propertyKey`）。
5. **execute**：调用节点运行时，捕获结果、错误与诊断信息。
6. **propagate**：`DataFlowManager` 根据 `PortBindingAst` 分发输出，更新下游节点入参。
7. **finalize**：可选清理、事件发布；若 `OutputNodeAst` 完成，则汇总结果返回。

### 调度策略
- 使用 `DependencyAnalyzer` 生成拓扑层，每一层内节点在满足端口就绪后并行执行。
- `priority` 决定多输入的顺序；`condition` 决定是否激活下游。
- 调度器保持幂等：节点状态一旦为 `success` 不会重复执行，除非显式复位。

### 数据分发与上下文
- `PortBindingAst` 指定 `propertyKey`，运行时将输出字典通过 `propertyKey` 写入目标节点实例，实现 input -> output 映射。
- `variadic` 输入在 `resolveInput` 内聚合为数组，匹配多路输入需求。
- `ExecutionContext` 可挂载运行标记（如 `retryCount`），提供给所有节点。

### 错误处理哲学
- 节点运行时返回 `state: 'fail'` 时，调度器停止所有依赖该节点的子图，并将错误写入诊断。
- 支持 `NoRetryError` 判定不可重试，其余错误默认进入指数退避重试策略。
- `OutputNodeAst` 在失败时仍收集故障上下文，使调用者理解流程失败原因。

### 日志与事件
- `WorkflowLogger` 保持结构化日志：`workflowId`, `runId`, `nodeId`, `port`。
- `emit(event)` 生成时间线事件，可供监控和可视化回放。
- 仅对关键阶段记录日志，避免噪音；每条日志都是系统叙事的一部分。

## 画布到 AST 的编译流程
1. **CanvasNormalizer**：清洗画布 JSON，补全缺失的端口 ID、排序连线。
2. **BlueprintResolver**：使用 `NodeRegistry` 将每个节点映射到蓝图，生成 `WorkflowPortAst` 和默认配置。
3. **GraphValidator**：
   - 检查图是否有环。
   - 校验每条连线的 `fromPort` 与 `toPort` 是否存在且类型兼容。
   - 确保所有必填输入端口都被满足，或有默认值。
4. **AstAssembler**：构造 `WorkflowNodeAst` / `WorkflowEdgeAst`，将 `CanvasEdge` 转为 `PortBindingAst`，同步写入 `propertyKey`。
5. **RuntimeLinker**：记录每个节点对应的运行时 `type`，供执行阶段从容器解析。
6. **Serializer**：输出 `WorkflowGraphAst` JSON，可存入数据库或作为执行快照。

## 可扩展性
- **节点插件**：第三方包可调用 `NodeRegistry.register` 注入新节点；运行时通过依赖注入解析对应执行器。
- **端口类型解析器**：允许注册自定义 `dataType` 验证器，支持结构化 Schema。
- **图级 Hook**：暴露 `beforeCompile`, `afterCompile`, `beforeExecute`, `afterExecute` 钩子，用于埋点、审计或动态注入配置。
- **子图嵌套**：`composite` 节点持有内部 `WorkflowGraphAst`，通过端口映射将输入输出穿透。

## 实施路线图
1. **阶段一：类型与蓝图**
   - 引入 `Canvas*` 与 `Workflow*` 类型定义。
   - 构建 `NodeRegistry` 与基础蓝图（Input/Output/Noop）。
   - 提供编译期类型守卫与单元测试。
2. **阶段二：AST 编译器**
   - 实现 `CanvasNormalizer`, `GraphValidator`, `AstAssembler`。
   - 输出稳定 JSON，与现有 `createWorkflowGraphAst` 对齐。
3. **阶段三：运行时整合**
   - 扩展 `WorkflowScheduler` 以理解 `PortBindingAst`。
   - 重写 `DataFlowManager`，使其使用端口 ID 而非属性猜测。
   - 实现输入/输出节点运行时，完善 `ExecutionContext`。
4. **阶段四：错误与观察性**
   - 引入诊断结构、重试策略、结构化日志。
   - 提供事件流 API 与示例消费方。
5. **阶段五：测试与文档**
   - 添加端到端测试：编译画布 -> 执行 -> 校验结果。
   - 更新 README、示例、故事化日志样例。

## 余留问题与后续动作
- 定义 `dataType` 体系与 Schema 校验器的落地方案（可复用 @pro/types）。
- 决定 `expression` 的解析标准（推荐 JSONLogic 或自研 DSL）。
- 评估子图嵌套在执行器中的隔离策略（命名空间、上下文隔离）。
- 与前端同步端口与连线协议，确保画布协议与后端编译器版本一致。

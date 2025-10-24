# @pro/workflow-core

DAG工作流执行引擎核心包 - 基于状态机和访问者模式的无框架依赖工作流引擎。

## 特性

- 🔧 **框架无关**: 纯TypeScript实现，无外部依赖
- 🚀 **高性能**: 支持并行执行和智能调度
- 🎯 **类型安全**: 完整的TypeScript类型支持
- 🔌 **可扩展**: 基于访问者模式的插件架构
- ⚡ **DAG执行**: 支持有向无环图工作流
- 🛡️ **错误处理**: 完善的错误处理和恢复机制

## 核心概念

### 工作流节点
工作流由多个节点组成，每个节点代表一个执行单元。

### 执行边
边定义了节点之间的依赖关系和执行顺序。

### 访问者模式
通过访问者模式实现节点的具体执行逻辑。

## 基础用法

```typescript
import { WorkflowBuilder, WorkflowExecutor } from '@pro/workflow-core';

// 构建工作流
const workflow = new WorkflowBuilder()
  .addNode('start', { type: 'start' })
  .addNode('process', { type: 'process' })
  .addEdge('start', 'process')
  .build();

// 执行工作流
const executor = new WorkflowExecutor();
const result = await executor.execute(workflow);
```

## API 文档

详细的API文档将在代码实现完成后补充。

## 许可证

MIT
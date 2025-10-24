# @pro/workflow-core

一个框架无关的DAG工作流执行引擎核心包，提供优雅、高效、可扩展的工作流管理能力。

## 特性

- 🎯 **框架无关**: 纯TypeScript实现，无外部依赖
- 🔄 **DAG支持**: 完整的有向无环图工作流
- ⚡ **并行执行**: 高效的节点并行处理
- 🏛️ **访问者模式**: 可扩展的节点执行架构
- 📊 **状态管理**: 完整的节点状态生命周期
- 🛡️ **错误处理**: 优雅的错误处理和恢复机制
- 🔧 **工具丰富**: 完整的工具函数集合
- 📝 **类型安全**: 完整的TypeScript类型支持

## 安装

```bash
npm install @pro/workflow-core
# 或
pnpm add @pro/workflow-core
```

## 快速开始

### 基本工作流构建

```typescript
import { createWorkflow, executeWorkflow } from '@pro/workflow-core';

// 创建工作流
const workflow = createWorkflow('示例工作流')
    .http('https://api.example.com/data')
    .transform(data => data.results)
    .when(results => results.length > 0)
    .custom(async (inputs, context) => {
        // 自定义处理逻辑
        return { processed: true };
    })
    .build();

// 执行工作流
const result = await executeWorkflow(workflow);
console.log('工作流结果:', result);
```

### 复杂工作流示例

```typescript
import {
    createWorkflow,
    parallel,
    branch,
    executeWorkflow,
    WorkflowConfig
} from '@pro/workflow-core';

// 配置执行选项
const config: WorkflowConfig = {
    maxConcurrency: 5,
    timeout: 60000,
    retryAttempts: 3
};

// 创建并行分支
const dataProcessingBranch = createWorkflow('数据处理分支')
    .http('https://api.example.com/users')
    .transform(users => users.filter(u => u.active))
    .custom(async (inputs) => {
        return { processedUsers: inputs.result };
    });

const analyticsBranch = createWorkflow('分析分支')
    .http('https://api.example.com/analytics')
    .transform(data => data.metrics)
    .custom(async (inputs) => {
        return { analytics: inputs.result };
    });

// 创建条件分支
const notificationBranch = createWorkflow('通知分支')
    .custom(async (inputs) => {
        await sendNotification(inputs.data);
        return { notified: true };
    });

const errorBranch = createWorkflow('错误处理分支')
    .custom(async (inputs) => {
        await logError(inputs.error);
        return { logged: true };
    });

// 主工作流
const mainWorkflow = createWorkflow('主工作流')
    .parallel(dataProcessingBranch, analyticsBranch)
    .branch(
        createWorkflow('条件判断')
            .when(data => data.success)
            .then(notificationBranch.id),
        errorBranch
    )
    .build();

// 执行工作流
try {
    const result = await executeWorkflow(mainWorkflow, {}, config);
    console.log('执行成功:', result.state);
} catch (error) {
    console.error('执行失败:', error);
}
```

## 核心概念

### 节点类型

#### HttpRequestNode
执行HTTP请求的节点
```typescript
.http('https://api.example.com', 'POST', { 'Authorization': 'Bearer token' })
```

#### DataTransformNode
数据转换节点
```typescript
.transform(data => data.filter(item => item.active))
```

#### ConditionNode
条件判断节点
```typescript
.when(data => data.length > 0)
```

#### LoopNode
循环节点
```typescript
.loop(data => data.hasMore, 10) // 最大循环10次
```

#### CustomFunctionNode
自定义函数节点
```typescript
.custom(async (inputs, context) => {
    const result = await process(inputs.data);
    return { result };
})
```

### 工作流构建

#### 连接节点
```typescript
const workflow = createWorkflow()
    .http('https://api.example.com')
    .then('transformNode') // 连接到转换节点
    .transform(data => data.results)
    .build();
```

#### 并行执行
```typescript
const branch1 = createWorkflow().http('https://api1.com');
const branch2 = createWorkflow().http('https://api2.com');

const workflow = createWorkflow()
    .parallel(branch1, branch2) // 并行执行
    .build();
```

#### 条件分支
```typescript
const successBranch = createWorkflow().transform(data => data.success);
const failBranch = createWorkflow().transform(data => data.error);

const workflow = createWorkflow()
    .branch(successBranch, failBranch) // 条件分支
    .build();
```

### 执行配置

```typescript
const config: WorkflowConfig = {
    maxConcurrency: 10,    // 最大并发数
    timeout: 300000,       // 超时时间(ms)
    retryAttempts: 3       // 重试次数
};

const result = await executeWorkflow(workflow, context, config);
```

## 工具函数

### 工作流分析

```typescript
import {
    findCriticalPath,
    calculateWorkflowStats,
    validateWorkflow,
    toDotFormat
} from '@pro/workflow-core';

// 查找关键路径
const criticalPath = findCriticalPath(workflow);

// 计算统计信息
const stats = calculateWorkflowStats(workflow);
console.log('节点数量:', stats.totalNodes);
console.log('平均分支因子:', stats.avgBranchingFactor);

// 验证工作流
const validation = validateWorkflow(workflow);
if (!validation.isValid) {
    console.error('验证错误:', validation.errors);
}

// 生成DOT格式(可用于Graphviz可视化)
const dotFormat = toDotFormat(workflow);
```

### 错误处理

```typescript
import {
    ErrorFactory,
    globalErrorHandler,
    globalRecoveryManager
} from '@pro/workflow-core';

// 添加错误监听器
globalErrorHandler.addListener((error) => {
    console.error('工作流错误:', error.getFullDescription());
});

// 配置错误恢复策略
globalRecoveryManager.setConfig('WORKFLOW_TIMEOUT_ERROR', {
    strategy: 'RETRY',
    maxRetries: 3,
    retryDelay: 2000
});
```

## API 文档

### 核心类

#### WorkflowBuilder
工作流构建器，提供流畅的API来构建DAG工作流。

#### WorkflowExecutor
工作流执行器，负责调度和执行工作流节点。

#### WorkflowGraphAst
工作流图的抽象语法树表示。

### 工厂函数

- `createWorkflow(name?: string): WorkflowBuilder` - 创建工作流构建器
- `executeWorkflow(workflow, context?, config?): Promise<WorkflowGraphAst>` - 执行工作流

### 节点工厂函数

- `createHttpRequestNode(url, method?, headers?)` - 创建HTTP请求节点
- `createDataTransformNode(transformFn)` - 创建数据转换节点
- `createConditionNode(conditionFn)` - 创建条件判断节点
- `createLoopNode(loopCondition, maxIterations?)` - 创建循环节点
- `createCustomFunctionNode(executeFn)` - 创建自定义函数节点

## 最佳实践

### 1. 工作流设计

- **保持单一职责**: 每个节点完成单一功能
- **避免过深的依赖**: 合理设计工作流深度
- **使用并行**: 独立的操作使用并行执行
- **错误处理**: 为关键节点添加错误处理

### 2. 性能优化

- **控制并发数**: 根据系统资源设置合适的并发数
- **设置超时**: 避免无限等待
- **重试策略**: 为网络操作设置合理的重试策略

### 3. 调试技巧

- **使用验证**: 在构建后验证工作流
- **分析关键路径**: 了解工作流的瓶颈
- **监控状态**: 观察节点状态变化

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 完整的DAG工作流支持
- 框架无关设计
- 丰富的工具函数
- 完善的错误处理
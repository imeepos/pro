# @pro/workflow

> DAG 工作流执行引擎 - 支持状态机模式、访问者模式和并行执行

## 特性

- 🎯 **DAG 工作流**：基于有向无环图的工作流定义
- ⚡ **并行执行**：自动识别可并行执行的节点
- 🎨 **访问者模式**：可扩展的节点处理机制
- 🔄 **状态机**：清晰的状态转移逻辑（pending → running → success/fail）
- 💉 **依赖注入**：完整的 NestJS 集成
- 🛡️ **类型安全**：完整的 TypeScript 类型支持

## 安装

```bash
pnpm add @pro/workflow
```

## 快速开始

### 1. 在 NestJS 应用中导入模块

```typescript
import { Module } from '@nestjs/common';
import { WorkflowModule } from '@pro/workflow';

@Module({
  imports: [
    WorkflowModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

### 2. 使用工作流服务

```typescript
import { Injectable } from '@nestjs/common';
import {
  WorkflowBuilderService,
  WorkflowExecutorService,
  createPlaywrightAst,
  createHtmlParserAst,
} from '@pro/workflow';

@Injectable()
export class MyService {
  constructor(
    private readonly builder: WorkflowBuilderService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  async runWorkflow() {
    // 创建节点
    const fetchNode = createPlaywrightAst({
      url: 'https://example.com',
      ua: 'Mozilla/5.0...',
      cookies: '',
    });

    const parseNode = createHtmlParserAst();

    // 构建工作流
    const workflow = this.builder
      .createBuilder()
      .addAst(fetchNode)
      .addAst(parseNode)
      .addEdge({
        from: fetchNode.id,
        to: parseNode.id,
        fromProperty: 'html',
        toProperty: 'html',
      })
      .build('my-workflow');

    // 执行工作流
    const result = await this.executor.execute(workflow);

    return result;
  }
}
```

## 核心概念

### 节点（Node）

节点是工作流的基本单位，每个节点都有：
- **状态**：pending、running、success、fail
- **输入**：使用 `@Input()` 装饰器标记
- **输出**：使用 `@Output()` 装饰器标记

### 边（Edge）

边定义了节点之间的数据流向：

```typescript
{
  from: 'node1-id',
  to: 'node2-id',
  fromProperty: 'output',  // 源节点的输出属性
  toProperty: 'input',     // 目标节点的输入属性
}
```

### 访问者（Visitor）

访问者负责执行节点的具体逻辑：

```typescript
import { ExecutorVisitor, Context } from '@pro/workflow';

export class CustomVisitor extends ExecutorVisitor {
  async visitCustomNode(ast: CustomNodeAst, ctx: Context) {
    // 自定义处理逻辑
    ast.state = 'success';
    return ast;
  }
}
```

## 自定义节点

### 创建自定义 AST 节点

```typescript
import { Ast, Input, Output, Visitor, Context } from '@pro/workflow';

export class CustomDataProcessorAst extends Ast {
  @Input() data: any;
  @Output() processedData: any;

  type = 'CustomDataProcessor' as const;

  async visit(visitor: Visitor, ctx: Context) {
    return visitor.visitCustomDataProcessor(this, ctx);
  }
}
```

### 扩展访问者

```typescript
import { ExecutorVisitor, Context } from '@pro/workflow';
import { CustomDataProcessorAst } from './custom-node';

export class MyExecutorVisitor extends ExecutorVisitor {
  async visitCustomDataProcessor(
    ast: CustomDataProcessorAst,
    ctx: Context,
  ): Promise<any> {
    // 处理数据
    ast.processedData = this.processData(ast.data);
    ast.state = 'success';
    return ast;
  }

  private processData(data: any) {
    // 自定义数据处理逻辑
    return data;
  }
}
```

## 高级用法

### 异步配置

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkflowModule } from '@pro/workflow';

@Module({
  imports: [
    WorkflowModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        isGlobal: true,
        customVisitors: [], // 自定义访问者
      }),
    }),
  ],
})
export class AppModule {}
```

### 使用装饰器

```typescript
import { WorkflowNode, WorkflowVisitor } from '@pro/workflow';

@WorkflowNode('MyCustomNode')
export class MyCustomNodeAst extends Ast {
  // 节点实现
}

@WorkflowVisitor()
export class MyCustomVisitor extends ExecutorVisitor {
  // 访问者实现
}
```

## API 文档

### WorkflowModule

#### `forRoot(options?)`

同步配置模块。

**选项：**
- `isGlobal?: boolean` - 是否为全局模块（默认：false）
- `customVisitors?: Type<any>[]` - 自定义访问者数组

#### `forRootAsync(options)`

异步配置模块。

**选项：**
- `isGlobal?: boolean`
- `useFactory?: (...args) => WorkflowModuleOptions`
- `useClass?: Type<WorkflowOptionsFactory>`
- `useExisting?: Type<WorkflowOptionsFactory>`
- `inject?: any[]`

### WorkflowExecutorService

#### `execute(state, context?, visitor?)`

执行完整工作流直到结束。

**参数：**
- `state: INode` - 工作流状态节点
- `context?: Context` - 执行上下文（默认：{}）
- `visitor?: Visitor` - 自定义访问者（默认：内置 ExecutorVisitor）

**返回：** `Promise<INode>` - 最终状态节点

#### `executeOnce(state, context?, visitor?)`

执行单次工作流迭代。

### WorkflowBuilderService

#### `createBuilder()`

创建新的工作流构建器。

**返回：** `WorkflowBuilder`

#### `build(name, nodes, edges)`

快速构建工作流。

**参数：**
- `name: string` - 工作流名称
- `nodes: INode[]` - 节点数组
- `edges: IEdge[]` - 边数组

**返回：** `WorkflowGraphAst`

## 设计哲学

本包遵循 **Code Artisan** 哲学：

- **存在即合理**：每个 API 都有不可替代的价值
- **优雅即简约**：最小化的 API 表面积
- **性能即艺术**：高效执行，优雅设计
- **类型安全**：充分利用 TypeScript

## 许可证

MIT

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解详情。

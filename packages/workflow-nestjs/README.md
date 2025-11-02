# @pro/workflow-nestjs

NestJS工作流模块集成包 - 为NestJS框架提供DAG工作流支持。

## 特性

- 🏗️ **模块化**: 完整的NestJS模块支持
- 🔧 **依赖注入**: 集成NestJS依赖注入系统
- ⚡ **装饰器**: 丰富的装饰器支持
- 🔄 **异步配置**: 支持异步模块配置
- 🌍 **全局模块**: 可配置为全局模块
- 🎯 **类型安全**: 完整的TypeScript类型支持

## 基础用法

### 同步配置

```typescript
import { Module } from '@nestjs/common';
import { WorkflowModule } from '@pro/workflow-nestjs';

@Module({
  imports: [
    WorkflowModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

### 异步配置

```typescript
import { Module } from '@nestjs/common';
import { WorkflowModule } from '@pro/workflow-nestjs';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    WorkflowModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        isGlobal: true,
        // 其他配置选项
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 使用服务

```typescript
import { Controller, Get } from '@nestjs/common';
import { WorkflowBuilderService, WorkflowExecutorService } from '@pro/workflow-nestjs';

@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly builder: WorkflowBuilderService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  @Get()
  async executeWorkflow() {
    const workflow = this.builder
      .addNode('start', { type: 'start' })
      .addNode('process', { type: 'process' })
      .addEdge('start', 'process')
      .build();

    return this.executor.execute(workflow);
  }
}
```

## 装饰器

### @WorkflowNode

标记类为工作流节点：

```typescript
import { WorkflowNode } from '@pro/workflow-nestjs';

@WorkflowNode('custom-node')
export class CustomNode {
  // 节点实现
}
```

### @WorkflowVisitor

标记类为工作流访问者：

```typescript
import { WorkflowVisitor, VisitMethod } from '@pro/workflow-nestjs';

@WorkflowVisitor()
export class CustomVisitor {
  @VisitMethod('custom-node')
  async visitCustomNode(node: CustomNode, context: any) {
    // 访问者实现
  }
}
```

## API 文档

详细的API文档将在代码实现完成后补充。

## 许可证

MIT
# @pro/workflow-ng

Angular工作流服务集成包 - 为Angular框架提供DAG工作流支持。

## 特性

- 🎨 **组件化**: 丰富的Angular组件支持
- 🔄 **响应式**: 基于RxJS的响应式编程
- 🏗️ **模块化**: 完整的Angular模块支持
- 📊 **状态管理**: 内置工作流状态管理
- 🎯 **类型安全**: 完整的TypeScript类型支持
- ⚡ **性能优化**: 支持OnPush变更检测策略

## 基础用法

### 导入模块

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { WorkflowNgModule } from '@pro/workflow-ng';

@NgModule({
  imports: [
    BrowserModule,
    WorkflowNgModule.forRoot(),
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### 使用服务

```typescript
import { Component } from '@angular/core';
import { WorkflowBuilderService, WorkflowExecutorService } from '@pro/workflow-ng';

@Component({
  selector: 'app-workflow',
  template: `
    <button (click)="executeWorkflow()">执行工作流</button>
    <div *ngIf="result$ | async as result">
      执行结果: {{ result }}
    </div>
  `,
})
export class WorkflowComponent {
  result$ = new BehaviorSubject<any>(null);

  constructor(
    private readonly builder: WorkflowBuilderService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  executeWorkflow() {
    const workflow = this.builder
      .addNode('start', { type: 'start' })
      .addNode('process', { type: 'process' })
      .addEdge('start', 'process')
      .build();

    this.executor.execute(workflow).subscribe({
      next: (result) => this.result$.next(result),
      error: (error) => console.error('工作流执行失败:', error),
    });
  }
}
```

### 工作流可视化组件

```typescript
import { Component } from '@angular/core';
import { WorkflowVisualizationComponent } from '@pro/workflow-ng';

@Component({
  selector: 'app-workflow-viz',
  template: `
    <workflow-visualization
      [workflow]="workflow"
      [executionState]="executionState"
      (nodeClick)="onNodeClick($event)"
    ></workflow-visualization>
  `,
})
export class WorkflowVisualizationComponent {
  workflow: any;
  executionState: any;

  onNodeClick(node: any) {
    console.log('节点点击:', node);
  }
}
```

## 服务

### WorkflowBuilderService
工作流构建服务，提供流畅的API来构建DAG工作流。

### WorkflowExecutorService
工作流执行服务，支持异步执行和状态监控。

### WorkflowStateService
工作流状态管理服务，提供响应式的状态管理。

## 组件

### WorkflowVisualizationComponent
工作流可视化组件，用于展示工作流图和执行状态。

### WorkflowEditorComponent
工作流编辑器组件，支持拖拽式工作流编辑。

### WorkflowMonitorComponent
工作流监控组件，用于监控工作流执行情况。

## API 文档

详细的API文档将在代码实现完成后补充。

## 许可证

MIT
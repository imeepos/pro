# @pro/workflow-react

React-based workflow canvas editor powered by ReactFlow，为现代Web应用提供强大的可视化工作流编辑能力。

## 🎨 特性

- **可视化编辑器**: 基于ReactFlow的直观拖拽式工作流设计
- **丰富的节点库**: 内置数据处理、网络爬虫、监控等多种节点类型
- **模板系统**: 预置工作流模板，快速创建常见业务场景
- **实时执行监控**: 工作流执行状态实时可视化
- **版本管理**: 完整的版本控制和回滚功能
- **项目组织**: 本地项目存储和管理
- **导入导出**: 支持JSON格式的工作流导入导出
- **批量操作**: 高效的项目批量管理功能

## 🚀 快速开始

### 安装

```bash
pnpm add @pro/workflow-react
```

### 基础使用

```tsx
import React from 'react';
import { WorkflowCanvas } from '@pro/workflow-react';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <WorkflowCanvas />
    </div>
  );
}
```

### 配置后端API

```tsx
import { WorkflowCanvas } from '@pro/workflow-react';

function App() {
  const apiConfig = {
    baseUrl: process.env.REACT_APP_WORKFLOW_API_URL || 'http://localhost:3000',
    apiKey: process.env.REACT_APP_WORKFLOW_API_KEY,
    timeout: 30000,
    retryAttempts: 3
  };

  return (
    <WorkflowCanvas apiConfig={apiConfig} />
  );
}
```

## 📚 核心概念

### 工作流 (Workflow)
由节点(Node)和边(Edge)组成的有向图，代表一个完整的业务流程。

### 节点 (Node)
工作流的基本执行单元，每个节点代表一个特定的操作或任务。

### 边 (Edge)
连接节点的线，表示数据流或控制流的传递方向。

### 蓝图 (Blueprint)
节点的类型定义，包含节点的输入输出端口和配置模式。

## 🎯 组件架构

### 核心组件

- **WorkflowCanvas**: 主画布组件，提供工作流编辑环境
- **NodePalette**: 节点面板，展示可用的节点类型
- **Inspector**: 属性面板，编辑节点配置
- **Toolbar**: 工具栏，提供文件操作和工具
- **ExecutionMonitor**: 执行监控面板，实时显示执行状态

### 功能组件

- **TemplateSelector**: 模板选择器，从预置模板创建工作流
- **ProjectManager**: 项目管理器，管理本地工作流项目
- **VersionManager**: 版本管理器，管理工作流版本历史
- **WorkflowConfig**: 工作流配置，设置执行参数和环境变量
- **ExecutionHistory**: 执行历史，查看历史执行记录和日志

## 🔧 高级配置

### 自定义节点类型

```tsx
import { extendedNodeBlueprints } from '@pro/workflow-react';

// 添加自定义节点蓝图
extendedNodeBlueprints['MyCustomNode'] = {
  id: 'MyCustomNode',
  name: '自定义节点',
  category: '自定义',
  description: '我的自定义节点',
  icon: '⚙️',
  ports: {
    input: [
      { id: 'input', name: '输入', kind: 'data', dataType: 'any', required: true }
    ],
    output: [
      { id: 'output', name: '输出', kind: 'data', dataType: 'any' }
    ]
  },
  configSchema: {
    param1: { type: 'string', label: '参数1', required: true },
    param2: { type: 'number', label: '参数2', default: 42 }
  }
};
```

### 自定义模板

```tsx
import { workflowTemplates } from '@pro/workflow-react';

// 添加自定义模板
workflowTemplates.push({
  id: 'my-template',
  name: '我的模板',
  description: '自定义工作流模板',
  category: 'custom',
  tags: ['custom', 'template'],
  blueprint: {
    nodes: [
      {
        id: 'start',
        blueprintId: 'MyCustomNode',
        position: { x: 100, y: 100 },
        config: { param1: 'hello', param2: 123 }
      }
    ],
    edges: []
  }
});
```

### 后端API集成

```tsx
import { WorkflowApiAdapter } from '@pro/workflow-react';

const apiAdapter = new WorkflowApiAdapter({
  baseUrl: 'http://your-api-server.com',
  apiKey: 'your-api-key',
  timeout: 30000,
  retryAttempts: 3
});

// 执行工作流
const executionId = await apiAdapter.executeWorkflow(
  nodes,
  edges,
  {
    timeout: 300000,
    parallelism: 4,
    environment: {
      API_KEY: 'your-secret-key'
    }
  },
  {
    onProgress: (progress) => console.log('进度:', progress),
    onNodeUpdate: (nodeId, status, result) => console.log('节点更新:', nodeId, status),
    onComplete: (response) => console.log('执行完成:', response),
    onError: (error) => console.error('执行失败:', error)
  }
);
```

## 📊 状态管理

使用Zustand进行状态管理，主要状态包括：

```tsx
interface WorkflowStore {
  // 核心状态
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  blueprints: Record<string, NodeBlueprint>;

  // 工作流信息
  workflowInfo: {
    name?: string;
    description?: string;
    version?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  // 执行状态
  executionState: {
    isRunning: boolean;
    executionId?: string;
    progress: number;
    currentNodeIds: string[];
    completedNodeIds: string[];
    errorNodeIds: string[];
    logs: Array<{
      timestamp: string;
      nodeId: string;
      level: 'info' | 'warn' | 'error';
      message: string;
    }>;
  };
}
```

## 🔄 工作流生命周期

### 1. 创建阶段
- 从模板创建或手动设计工作流
- 配置节点参数和连接关系
- 设置工作流级别配置

### 2. 验证阶段
- 自动验证工作流结构完整性
- 检查节点配置合法性
- 验证数据流连接正确性

### 3. 执行阶段
- 提交工作流到后端执行引擎
- 实时监控执行状态和进度
- 处理执行结果和异常

### 4. 管理阶段
- 保存工作流版本
- 导入导出工作流
- 管理执行历史和日志

## 🎨 样式定制

### CSS变量

```css
:root {
  --workflow-primary-color: #3b82f6;
  --workflow-success-color: #10b981;
  --workflow-error-color: #ef4444;
  --workflow-warning-color: #f59e0b;
  --workflow-background: #f3f4f6;
  --workflow-border: #d1d5db;
}
```

### 主题定制

```tsx
import { WorkflowCanvas } from '@pro/workflow-react';

function ThemedApp() {
  return (
    <div className="dark-theme">
      <WorkflowCanvas />
    </div>
  );
}
```

## 📱 响应式设计

组件支持响应式布局：

- **桌面端**: 完整的三栏布局 (节点面板 + 画布 + 属性面板)
- **平板端**: 可折叠的侧边栏布局
- **移动端**: 全屏画布，浮动工具栏

## 🔒 安全考虑

### 敏感数据处理
- 自动识别和加密敏感配置字段
- 支持环境变量引用
- 安全的API密钥管理

### 输入验证
- 严格的工作流结构验证
- 节点配置模式验证
- XSS和注入攻击防护

## 🚀 性能优化

### 渲染优化
- 虚拟化大型工作流渲染
- 节点懒加载和缓存
- 优化的重渲染策略

### 内存管理
- 自动清理执行日志
- 限制历史记录数量
- 组件卸载时资源清理

## 🐛 故障排除

### 常见问题

1. **节点无法连接**
   - 检查端口类型是否匹配
   - 确认端口方向正确
   - 验证数据类型兼容性

2. **工作流执行失败**
   - 检查后端API连接
   - 验证节点配置完整性
   - 查看详细错误日志

3. **项目无法保存**
   - 检查浏览器存储权限
   - 确认存储空间充足
   - 清理过期项目

### 调试模式

```tsx
// 启用调试模式
localStorage.setItem('workflow-debug', 'true');
```

## 🤝 贡献指南

### 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建项目
pnpm build
```

### 代码规范

- 使用TypeScript进行类型检查
- 遵循ESLint和Prettier配置
- 编写单元测试覆盖核心功能
- 提交前运行类型检查和测试

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [ReactFlow 官方文档](https://reactflow.dev/)
- [Zustand 状态管理](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/)

## 📞 支持

如有问题或建议，请通过以下方式联系：

- 创建 GitHub Issue
- 发送邮件至 support@example.com
- 查看文档中心 docs.example.com
# BLE Mesh 网络拓扑可视化组件

## 概述

BLE Mesh网络拓扑可视化Dashboard是一个专门用于展示和管理BLE Mesh网络拓扑结构的React组件集合。它提供了直观的网络图形化展示、设备状态监控和交互式操作功能。

## 功能特性

### 🔗 双面板拓扑展示
- **BLE Mesh Reachability（可达性视图）**：显示复杂的多跳连接关系
- **BLE Mesh Node Assignment（节点分配视图）**：显示简化的直连关系

### 🎯 交互式网络图表
- 基于vis-network的高性能网络可视化
- 支持拖拽、缩放、悬停等交互操作
- 实时节点选择和高亮显示
- 自适应布局和物理引擎

### 📊 设备状态面板
- 实时设备状态监控（在线/离线）
- 详细设备信息展示
- 支持多种设备类型（Echo、Node、Gateway等）
- 最后在线时间跟踪

### 🔍 搜索与过滤
- 按Customer ID搜索设备
- 实时数据刷新功能
- 错误处理和加载状态

## 组件结构

```
src/components/biz/
├── BleMeshTopologyDashboard.tsx    # 主Dashboard组件
├── BleMeshNetworkChart.tsx         # 网络图表组件
├── DeviceStatusPanel.tsx           # 设备状态面板
└── index.ts                       # 导出文件
```

## 使用方法

### 基础使用

```tsx
import { BleMeshTopologyDashboard } from '@/components/biz';

function App() {
  return (
    <div className="h-screen">
      <BleMeshTopologyDashboard />
    </div>
  );
}
```

### 单独使用子组件

```tsx
import { BleMeshNetworkChart, DeviceStatusPanel } from '@/components/biz';

function CustomTopology() {
  const [selectedDevice, setSelectedDevice] = useState(null);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <BleMeshNetworkChart
          type="reachability"
          onDeviceSelect={setSelectedDevice}
        />
      </div>
      <div>
        <DeviceStatusPanel selectedDevice={selectedDevice} />
      </div>
    </div>
  );
}
```

## API 接口

### BleMeshTopologyDashboard Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| className | string | '' | 自定义CSS类名 |

### BleMeshNetworkChart Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| type | 'reachability' \| 'assignment' | - | 拓扑类型 |
| isLoading | boolean | false | 加载状态 |
| onDeviceSelect | (device: DeviceInfo \| null) => void | - | 设备选择回调 |
| onRefresh | () => void | - | 刷新回调 |
| customerId | string | 'demo' | 客户ID |

### DeviceStatusPanel Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| selectedDevice | DeviceInfo \| null | null | 选中的设备信息 |
| isLoading | boolean | false | 加载状态 |

## 数据类型

### BleMeshNode

```typescript
interface BleMeshNode {
  id: string;
  label: string;
  nodeType: 'echo' | 'node';
  parent: string[];
  position?: { x: number; y: number; };
  properties?: {
    friendlyName?: string;
    deviceType?: string;
    firmwareVersion?: string;
    connectivity?: string;
    gatewayNodeIds?: string[];
    description?: string;
  };
}
```

### DeviceInfo

```typescript
interface DeviceInfo {
  id: string;
  friendlyName: string;
  nodeType: 'ECHO' | 'NODE' | 'GATEWAY' | 'IOT_DEVICE' | 'IOT_CLOUD' | 'CLOUD' | 'APPLIANCE';
  deviceType?: string;
  firmwareVersion?: string;
  connectivity?: string;
  gatewayNodeIds?: string[];
  description?: string;
  status?: 'online' | 'offline' | 'unknown';
  lastSeen?: string;
}
```

## Mock 数据

项目包含完整的Mock数据服务，支持：

- 可达性拓扑数据模拟
- 节点分配拓扑数据模拟
- 设备详细信息模拟
- 实时数据刷新模拟

Mock API 端点：
- `GET /api/ble-mesh/topology` - 获取拓扑数据
- `GET /api/ble-mesh/device/:deviceId` - 获取设备详情
- `POST /api/ble-mesh/refresh` - 刷新数据
- `GET /api/ble-mesh/customer/:customerId` - 客户设备搜索

## 样式定制

组件使用Tailwind CSS构建，支持完全的样式定制：

```tsx
<BleMeshTopologyDashboard className="bg-gray-100 rounded-lg shadow-lg" />
```

### 主题变量

- Echo节点：红色 (#FF4A55)
- 普通节点：蓝色 (#1DC7EA)
- 连接线：灰色 (#9CA3AF)
- 在线状态：绿色
- 离线状态：红色

## 访问路由

组件已集成到应用路由中：

- 路径：`/ble-mesh-topology`
- 导航菜单：侧边栏 "BLE Mesh拓扑"

## 技术依赖

- **vis-network**: 网络图可视化库
- **vis-data**: 数据管理库
- **lucide-react**: 图标库
- **framer-motion**: 动画库
- **tailwindcss**: 样式框架

## 性能优化

- 使用React.useCallback减少重复渲染
- vis-network物理引擎优化
- 懒加载和错误边界
- 内存泄漏防护（组件卸载时清理网络实例）

## 错误处理

- API请求失败自动降级到Mock数据
- 网络图初始化失败的错误提示
- 设备数据缺失的安全处理
- 类型安全的边界检查

## 开发调试

1. 启动开发服务器：`pnpm dev`
2. 访问：`http://localhost:3001/ble-mesh-topology`
3. 打开浏览器开发者工具查看网络请求和组件状态
4. Mock数据会自动响应所有API请求

## 扩展指南

### 添加新的设备类型

1. 更新 `DeviceInfo` 接口的 `nodeType` 联合类型
2. 在 `DeviceStatusPanel` 中添加对应的渲染逻辑
3. 更新Mock数据以包含新的设备类型

### 自定义网络布局

1. 修改 `BleMeshNetworkChart` 中的 `options` 配置
2. 调整 `physics` 和 `layout` 参数
3. 可以添加自定义的节点形状和样式

### 集成实际API

1. 替换 `src/services/api/bleMesh.ts` 中的API端点
2. 更新请求格式以匹配后端API
3. 保持响应数据格式与类型定义一致
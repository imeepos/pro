# 大屏编辑器数据源配置系统

参考openDataV的DataSlotter机制实现的Angular版本数据源配置系统。

## 功能概述

### 1. 核心架构

- **数据模式枚举** (`DataMode`)
  - `SELF`: 组件自有静态数据
  - `API`: API接口数据
  - `WEBSOCKET`: WebSocket实时数据
  - `GLOBAL`: 全局共享数据

- **数据源类型** (`DataSourceType`)
  - `DEMO`: 示例数据（用于演示和测试）
  - `STATIC`: 静态JSON数据
  - `API`: HTTP API接口
  - `WEBSOCKET`: WebSocket实时连接
  - `GLOBAL`: 全局数据源

### 2. DataSlotter状态管理系统

基于Akita状态管理实现的数据插槽系统：

- **DataSlotterStore**: 存储数据插槽和全局数据
- **DataSlotterQuery**: 查询数据插槽状态
- **DataSlotterService**: 管理数据插件注册、连接和数据流

### 3. 数据插件系统

#### 3.1 DemoData插件
- 提供静态JSON数据编辑
- 支持数据预览和调试
- 适用于原型开发和测试

#### 3.2 API数据插件
- 支持GET、POST、PUT、DELETE、PATCH方法
- 可配置请求头和请求体
- 支持定时自动刷新
- 错误处理和重试机制

#### 3.3 WebSocket数据插件
- 支持ws://和wss://协议
- 自动重连机制（可配置重连间隔和最大次数）
- JSON数据自动解析
- 连接状态监控

### 4. 数据配置面板

**DataModuleComponent**: 统一的数据配置界面
- 数据源类型选择器
- 动态加载对应的配置组件
- 实时数据预览
- 错误信息显示
- 一键刷新功能

## 文件结构

```
apps/admin/src/app/features/screens/editor/
├── models/
│   ├── data-source.enum.ts          # 数据源枚举定义
│   ├── data-source.model.ts         # 数据源模型接口
│   └── component.model.ts           # 扩展组件模型（添加dataSlotId）
├── data-slotter/
│   ├── data-slotter.store.ts        # Akita Store
│   ├── data-slotter.query.ts        # Akita Query
│   └── data-slotter.service.ts      # 核心服务
├── data-plugins/
│   ├── demo/
│   │   ├── demo-data.handler.ts
│   │   ├── demo-data-config.component.ts
│   │   └── demo-data.plugin.ts
│   ├── api/
│   │   ├── api-data.handler.ts
│   │   ├── api-data-config.component.ts
│   │   └── api-data.plugin.ts
│   ├── websocket/
│   │   ├── websocket-data.handler.ts
│   │   ├── websocket-data-config.component.ts
│   │   └── websocket-data.plugin.ts
│   └── data-plugin-initializer.service.ts
└── data-module/
    └── data-module.component.ts     # 数据配置面板主组件
```

## 使用方法

### 1. 注册数据插件

插件在`DataPluginInitializerService`中自动注册：

```typescript
@Injectable({ providedIn: 'root' })
export class DataPluginInitializerService {
  constructor(private dataSlotterService: DataSlotterService) {
    this.registerAllPlugins();
  }

  private registerAllPlugins(): void {
    this.dataSlotterService.registerPlugin(DemoDataPlugin);
    this.dataSlotterService.registerPlugin(ApiDataPlugin);
    this.dataSlotterService.registerPlugin(WebSocketDataPlugin);
  }
}
```

### 2. 创建数据插槽

```typescript
const slotId = this.dataSlotterService.createDataSlot(componentId, {
  type: DataSourceType.API,
  mode: DataMode.API,
  url: 'https://api.example.com/data',
  method: RequestMethod.GET,
  options: {}
});
```

### 3. 订阅数据变化

```typescript
const slot = this.dataSlotterQuery.getEntity(slotId);
slot.data$.subscribe(response => {
  if (response.status === DataStatus.SUCCESS) {
    console.log('Data:', response.data);
  } else if (response.status === DataStatus.ERROR) {
    console.error('Error:', response.error);
  }
});
```

### 4. 更新数据配置

```typescript
this.dataSlotterService.updateDataConfig(slotId, newConfig);
```

### 5. 移除数据插槽

```typescript
this.dataSlotterService.removeDataSlot(slotId);
```

## 扩展新的数据插件

### 1. 创建Handler

```typescript
@Injectable({ providedIn: 'root' })
export class CustomDataHandler implements DataInstance {
  async connect(acceptor: DataAcceptor, options?: any): Promise<void> {
    // 实现数据连接逻辑
  }

  async getRespData(options?: any): Promise<DataResponse> {
    // 实现数据获取逻辑
  }

  async debug(acceptor: DataAcceptor): Promise<void> {
    // 实现调试逻辑
  }

  disconnect?(): void {
    // 实现断开连接逻辑
  }
}
```

### 2. 创建配置组件

```typescript
@Component({
  selector: 'app-custom-data-config',
  standalone: true,
  template: `
    <!-- 配置界面 -->
  `
})
export class CustomDataConfigComponent implements OnInit {
  @Input() slot!: DataSlot;
  // 实现配置界面
}
```

### 3. 注册插件

```typescript
export const CustomDataPlugin: DataPlugin = {
  type: DataSourceType.CUSTOM,
  name: '自定义数据源',
  component: CustomDataConfigComponent,
  handler: CustomDataHandler,
  useTo: 'COMPONENT',
  getDefaultConfig: () => ({
    type: DataSourceType.CUSTOM,
    mode: DataMode.SELF,
    options: {}
  })
};
```

### 4. 在初始化服务中注册

```typescript
this.dataSlotterService.registerPlugin(CustomDataPlugin);
```

## 特性

- ✅ 插件化架构，易于扩展
- ✅ 基于RxJS的响应式数据流
- ✅ TypeScript类型安全
- ✅ 自动重连和错误处理
- ✅ 实时数据预览
- ✅ 支持全局数据共享
- ✅ 完整的生命周期管理
- ✅ 与Akita状态管理深度集成

## 技术栈

- Angular 20 (Standalone Components)
- Akita (状态管理)
- RxJS (响应式编程)
- TypeScript (类型安全)
- HttpClient (HTTP请求)
- WebSocket API (实时通信)

## 参考

- openDataV DataSlotter: `/home/ubuntu/worktrees/pro/openDataV/packages/designer/src/state/data.ts`
- openDataV DataModule: `/home/ubuntu/worktrees/pro/openDataV/packages/designer/src/pane/RightSideBar/DataModule/`

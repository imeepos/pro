# Admin 管理后台

基于 Angular 20 的现代化管理后台系统，提供数据可视化、系统管理和实时监控功能。

## 🚀 快速开始

### 环境要求
- Node.js >= 20.0.0
- Bun >= 1.3.0

### 开发命令

```bash
# 进入目录
cd apps/admin

# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 类型检查
bun run typecheck

# 代码构建
bun run build

# 运行测试
bun run test

# 代码检查
bun run lint
```

## 🏗️ 技术架构

### 核心技术栈
- **框架**: Angular 20 + Standalone Components
- **UI 库**: TailwindCSS + Flowbite
- **状态管理**: Akita
- **数据可视化**: 自定义图表系统 + 高德地图
- **实时通信**: Socket.IO
- **组件库**: Gridster2 (拖拽布局)

### 项目结构
```
src/
├── app/
│   ├── core/                 # 核心模块
│   │   ├── guards/          # 路由守卫
│   │   ├── interceptors/    # HTTP 拦截器
│   │   ├── services/        # 核心服务
│   │   └── layout/          # 布局组件
│   ├── features/            # 功能模块
│   │   ├── auth/           # 认证模块
│   │   ├── dashboard/      # 仪表板
│   │   ├── events/         # 事件管理
│   │   ├── weibo/          # 微博管理
│   │   ├── jd/             # 京东管理
│   │   ├── media-type/     # 媒体类型
│   │   ├── screens/        # 大屏编辑器
│   │   └── api-keys/       # API 密钥管理
│   ├── shared/             # 共享组件
│   └── state/              # 状态管理
├── environments/           # 环境配置
└── assets/                # 静态资源
```

## 🔧 核心功能

### 1. 认证授权
- JWT Token 认证
- 自动 Token 刷新
- 路由权限控制
- 用户状态管理

### 2. 大屏编辑器
- 拖拽式组件布局
- 实时数据绑定
- 组件配置管理
- 预览发布功能

### 3. 数据可视化
- 自定义图表组件
- 实时数据更新
- 响应式布局
- 主题定制

### 4. 系统管理
- 用户管理
- 权限配置
- API 密钥管理
- 系统监控

## 🎨 组件系统

### 大屏组件
- `weibo-logged-in-users-card`: 微博已登录用户统计
- `test-simple`: 测试组件

### 共享组件
- 表单组件
- 数据表格
- 文件上传
- 图表组件

## 📡 实时通信

### WebSocket 连接
- 自动重连机制
- JWT 认证
- 事件订阅管理
- 连接状态监控

### 数据更新
- 微博用户统计实时更新
- 事件状态变更推送
- 系统状态监控

## 🔧 开发配置

### 环境变量
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  amapApiKey: 'YOUR_AMAP_KEY',
  tokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  timeout: 30000
};
```

### 依赖注入配置
- SkerSDK: API 接口封装
- TokenStorageService: Token 管理
- HttpClientService: HTTP 客户端
- WebSocketManager: WebSocket 管理

## 📦 构建部署

### Docker 构建
```bash
# 构建镜像
docker build -t pro-admin:latest .

# 运行容器
docker run -p 4201:80 pro-admin:latest
```

### 生产部署
```bash
# 构建生产版本
bun run build:prod

# 部署到静态服务器
# dist/ 目录可直接部署
```

## 🧪 测试

### 单元测试
```bash
# 运行所有测试
bun run test

# 监听模式
bun run test:watch

# 覆盖率报告
bun run test:coverage
```

### E2E 测试
```bash
# 运行端到端测试
bun run e2e
```

## 🐛 调试

### 开发工具
- Angular DevTools
- Redux DevTools (Akita)
- Console 日志系统

### 常见问题
1. **WebSocket 连接失败**: 检查后端服务状态和 Token 有效性
2. **组件加载异常**: 检查依赖注入配置和组件注册
3. **API 调用错误**: 检查网络连接和权限配置

## 📈 性能优化

### 代码分割
- 路由级别懒加载
- 组件按需加载
- 第三方库分离

### 缓存策略
- HTTP 缓存配置
- 静态资源缓存
- Service Worker (可选)

## 🤝 贡献指南

1. 遵循 Angular 代码规范
2. 编写单元测试
3. 更新相关文档
4. 提交前进行类型检查

## 📄 许可证

UNLICENSED - 仅供内部使用
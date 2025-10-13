# Web 前端应用

基于 Angular 20 的现代化前端应用，提供数据展示、用户交互和实时更新功能。

## 🚀 快速开始

### 环境要求
- Node.js >= 20.0.0
- pnpm >= 9.0.0

### 开发命令

```bash
# 进入目录
cd apps/web

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 类型检查
pnpm run typecheck

# 代码构建
pnpm run build

# 运行测试
pnpm run test

# 代码检查
pnpm run lint
```

## 🏗️ 技术架构

### 核心技术栈
- **框架**: Angular 20 + Standalone Components
- **UI 库**: TailwindCSS
- **状态管理**: Akita
- **实时通信**: Socket.IO
- **认证**: JWT + Token 刷新机制

### 项目结构
```
src/
├── app/
│   ├── core/                 # 核心模块
│   │   ├── guards/          # 路由守卫
│   │   ├── interceptors/    # HTTP 拦截器
│   │   ├── services/        # 核心服务
│   │   └── state/           # 状态管理
│   ├── features/            # 功能模块
│   │   ├── auth/           # 认证模块
│   │   ├── screen/         # 大屏展示
│   │   └── api-key-management/ # API 密钥管理
│   └── shared/             # 共享组件
├── environments/           # 环境配置
└── assets/                # 静态资源
```

## 🔧 核心功能

### 1. 用户认证
- JWT Token 认证
- 自动 Token 刷新
- 路由权限控制
- 登录状态持久化

### 2. 大屏展示
- 数据可视化展示
- 实时数据更新
- 响应式设计
- 交互式界面

### 3. API 管理
- API 密钥生成
- 权限配置管理
- 使用统计监控

## 🎨 组件系统

### 展示组件
- `weibo-logged-in-users-card`: 微博已登录用户统计
- 数据图表组件
- 状态指示器

### 共享组件
- 表单组件
- 加载指示器
- 错误处理组件

## 📡 实时通信

### WebSocket 连接
```typescript
// 自动连接管理
const wsManager = inject(WebSocketManager);
const wsService = wsManager.connectToNamespace(config);

// 事件监听
wsService.on('weibo:logged-in-users:update').subscribe(stats => {
  // 处理数据更新
});
```

### 数据更新
- 自动重连机制
- 事件订阅管理
- 连接状态监控

## 🔧 开发配置

### 环境变量
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://xxx:3000/api',
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
docker build -t pro-web:latest .

# 运行容器
docker run -p 4200:80 pro-web:latest
```

### 生产部署
```bash
# 构建生产版本
pnpm run build:prod

# 部署到静态服务器
# dist/ 目录可直接部署
```

## 🧪 测试

### 单元测试
```bash
# 运行所有测试
pnpm run test

# 监听模式
pnpm run test:watch

# 覆盖率报告
pnpm run test:coverage
```

### E2E 测试
```bash
# 运行端到端测试
pnpm run e2e
```

## 🔐 安全特性

### 认证机制
- JWT Token 认证
- 自动 Token 刷新
- 安全存储 (httpOnly cookies 可选)

### 数据保护
- HTTPS 强制使用
- XSS 防护
- CSRF 保护

## 📈 性能优化

### 代码分割
- 路由级别懒加载
- 组件按需加载
- 第三方库分离

### 缓存策略
- HTTP 缓存配置
- 静态资源缓存
- Service Worker 配置

## 🐛 调试

### 开发工具
- Angular DevTools
- Redux DevTools (Akita)
- Network 面板监控

### 常见问题
1. **WebSocket 连接失败**: 检查后端服务状态和 Token 有效性
2. **认证失败**: 检查 Token 存储和刷新机制
3. **API 调用错误**: 检查网络连接和权限配置

## 🤝 贡献指南

1. 遵循 Angular 代码规范
2. 编写单元测试
3. 更新相关文档
4. 提交前进行类型检查

## 📄 许可证

UNLICENSED - 仅供内部使用
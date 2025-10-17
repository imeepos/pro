# Angular Vite 构建优化 - 快速开始

## 核心理念

Angular 20 已经内置了 Vite 支持。我们不需要创建 `vite.config.ts`，只需优化 `angular.json` 配置即可获得最佳性能。

## 已完成的优化

### 1. admin 应用优化

**配置文件：** `/home/ubuntu/worktrees/pro/apps/admin/angular.json`

#### 生产构建优化
```json
"optimization": {
  "scripts": true,
  "styles": {
    "minify": true,
    "inlineCritical": true  // 关键 CSS 内联
  },
  "fonts": true
},
"buildOptimizer": true,
"aot": true,
"extractLicenses": true
```

#### 开发服务器优化
```json
"serve": {
  "options": {
    "port": 4201
  }
}
```

#### 构建结果
- **开发构建时间：** ~26 秒
- **初始包大小：** 4.49 MB（开发模式）
- **懒加载路由：** 35+ 个 chunk 文件

### 2. web 应用优化

**配置文件：** `/home/ubuntu/worktrees/pro/apps/web/angular.json`

#### 生产构建优化
```json
"optimization": {
  "scripts": true,
  "styles": {
    "minify": true,
    "inlineCritical": true
  },
  "fonts": true
},
"buildOptimizer": true,
"aot": true,
"extractLicenses": true
```

#### Bundle 限制
```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "500kb",
    "maximumError": "1mb"
  }
]
```

#### 构建结果
- **开发构建时间：** ~6.6 秒
- **初始包大小：** 2.54 MB（开发模式）
- **懒加载路由：** 7 个 chunk 文件

## 新的 npm 脚本

### admin 应用

```bash
# 开发模式（快速启动，完整 sourcemap）
pnpm run dev

# 生产模式预览（测试优化效果）
pnpm run start

# 生产构建（完全优化）
pnpm run build

# 开发构建（快速验证）
pnpm run build:dev

# 包体积分析（性能优化利器）
pnpm run build:analyze
```

### web 应用

```bash
# 开发模式
pnpm run dev

# 生产模式预览
pnpm run start

# 生产构建
pnpm run build

# 开发构建
pnpm run build:dev

# 包体积分析
pnpm run build:analyze
```

## 快速验证

### 1. 类型检查

```bash
# admin 应用
cd /home/ubuntu/worktrees/pro/apps/admin
pnpm run typecheck

# web 应用
cd /home/ubuntu/worktrees/pro/apps/web
pnpm run typecheck
```

**结果：** ✅ 全部通过

### 2. 开发构建

```bash
# admin 应用
cd /home/ubuntu/worktrees/pro/apps/admin
pnpm run build:dev

# web 应用
cd /home/ubuntu/worktrees/pro/apps/web
pnpm run build:dev
```

**结果：** ✅ 构建成功

### 3. 生产构建（测试优化效果）

```bash
# admin 应用
cd /home/ubuntu/worktrees/pro/apps/admin
pnpm run build

# web 应用
cd /home/ubuntu/worktrees/pro/apps/web
pnpm run build
```

## 关键优化点

### 1. 关键 CSS 内联

生产构建会自动提取首屏关键 CSS 并内联到 HTML 中，减少首屏渲染时间。

```json
"styles": {
  "minify": true,
  "inlineCritical": true  // 这是关键
}
```

### 2. 特殊依赖处理

对于运行时加载的外部库，优先通过脚本注入或懒加载避免 Vite 预打包。

```json
"prebundle": {}

> 更新：地图加载器已改为由 `@pro/components` 运行时注入，无需再将 `@amap/amap-jsapi-loader` 置于 `exclude` 列表。
```

### 3. 命名 Chunk

开发模式使用命名 chunk 便于调试：

```json
"development": {
  "namedChunks": true
}
```

生产模式禁用命名 chunk 减小体积：

```json
"production": {
  "namedChunks": false
}
```

## 性能监控

### 包体积分析

```bash
# 生成并分析包体积
cd /home/ubuntu/worktrees/pro/apps/admin
pnpm run build:analyze

# 或手动分析
pnpm run build -- --stats-json
npx webpack-bundle-analyzer dist/admin/stats.json
```

这会打开一个交互式的可视化界面，显示：
- 每个包的大小和占比
- 依赖关系
- 重复的模块

### 构建时间对比

```bash
# 测试构建时间
time pnpm run build
```

### 检查输出文件

```bash
# 查看 admin 构建产物
ls -lh /home/ubuntu/worktrees/pro/apps/admin/dist/admin/browser/

# 查看 web 构建产物
ls -lh /home/ubuntu/worktrees/pro/apps/web/dist/web/browser/
```

## 常见问题

### Q1: 为什么没有 vite.config.ts？

**A:** Angular CLI 已经内置了 Vite 支持，并做了最优配置。直接修改 Vite 配置会失去 Angular 的优化和兼容性保证。

### Q2: 如何自定义 Vite 配置？

**A:** 99% 的场景通过 `angular.json` 优化即可。如果确实需要自定义 Vite 配置，参考 `/home/ubuntu/worktrees/pro/docs/VITE_MIGRATION_GUIDE.md` 的方案二。

### Q3: prebundle.exclude 的作用是什么？

**A:** Vite 在开发模式会预打包依赖以提升性能。但某些动态加载的库（如高德地图）不应该被预打包，需要排除。

### Q4: 生产构建失败怎么办？

**A:** 首先运行 `pnpm run typecheck` 检查类型错误，然后查看构建日志中的错误信息。

## 下一步优化

### 1. 代码分割

使用路由懒加载（已实现）：

```typescript
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule)
  }
];
```

### 2. 图片优化

推荐使用 WebP 格式，并通过 CDN 加载：

```typescript
export const environment = {
  cdnUrl: 'https://cdn.example.com',
  getImageUrl: (path: string) => `${environment.cdnUrl}/images/${path}`
};
```

### 3. 第三方库优化

按需导入，避免导入整个库：

```typescript
// ❌ 错误
import * as _ from 'lodash';

// ✅ 正确
import debounce from 'lodash/debounce';
```

### 4. 环境变量管理

创建 `.env` 文件：

```bash
# .env.development
VITE_API_URL=http://localhost:3000

# .env.production
VITE_API_URL=https://api.production.com
```

## 文档索引

- **完整指南：** `/home/ubuntu/worktrees/pro/docs/VITE_MIGRATION_GUIDE.md`
- **快速开始：** `/home/ubuntu/worktrees/pro/docs/VITE_QUICK_START.md`（本文档）

## 总结

这次优化的核心哲学是：**存在即合理，优雅即简约**。

我们没有引入额外的配置文件，没有增加复杂的构建脚本，只是让 Angular CLI 发挥其应有的性能。

这就是代码艺术家的方式：最小的改动，最大的效果。

---

**最后更新：** 2025-10-16
**适用版本：** Angular 20+

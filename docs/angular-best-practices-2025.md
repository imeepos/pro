# Angular 2025 企业级完整工具链

> 基于社区最佳实践，构建现代化、高性能的 Angular 应用

---

## 核心框架层

### Angular 19 新特性

```json
{
  "@angular/core": "^19.x",
  "@angular/cli": "^19.x"
}
```

**关键特性**：
- ✅ **Signals** - 新一代响应式原语，取代 RxJS 作为首选
- ✅ **Zoneless 变化检测** - 性能提升 30%
- ✅ **Vite/esbuild 构建** - 构建速度提升 40-60%，包体积减少 30KB
- ✅ **Material 3 设计系统** - 增强的主题定制能力

---

## UI 组件库方案

### 方案 A：现代极简风格（推荐新项目）

```bash
# 基础 UI 框架
pnpm add @angular/material @angular/cdk

# 样式系统
pnpm add tailwindcss @tailwindcss/postcss

# 补充组件库
pnpm add flowbite-angular
```

**适用场景**：
- 现代化 Web 应用
- 注重性能和包体积
- 需要高度自定义的设计系统

**优势**：
- Material 3 + Tailwind 完美结合
- 打包体积小（Material ~150KB）
- 与 Signals 深度集成
- 官方维护，持续更新

---

### 方案 B：企业数据密集型

#### PrimeNG - 功能最全面

```bash
pnpm add primeng primeicons
```

**特点**：
- 90+ 组件（最丰富的组件库）
- 专业数据表格、图表、日历
- 内置主题设计器
- 优秀的文档和示例

**适用场景**：
- 数据密集型应用
- 复杂的业务表单
- 需要大量现成组件快速开发

---

#### NG-ZORRO - 企业级 Ant Design

```bash
pnpm add ng-zorro-antd
```

**特点**：
- Alibaba Ant Design 设计语言
- 60+ 企业级组件
- 适合亚洲市场审美
- 优秀的国际化支持

**适用场景**：
- 后台管理系统
- B2B 企业应用
- 信息密集型界面

---

## 数据获取与状态管理

### 数据获取层

#### TanStack Query（推荐）

```bash
pnpm add @tanstack/angular-query-experimental
```

**核心优势**：
- 基于 Signals 的响应式 API
- 协议无关（REST/GraphQL/任何 Promise）
- 自动缓存和后台重新获取
- Stale-while-revalidate 策略
- 13KB gzip 极小体积

**基础用法**：

```typescript
import { injectQuery } from '@tanstack/angular-query-experimental';

@Component({
  template: `
    @if (query.isPending()) {
      <div>Loading...</div>
    } @else if (query.isError()) {
      <div>Error: {{ query.error().message }}</div>
    } @else {
      <div>{{ query.data() }}</div>
    }
  `
})
export class UserComponent {
  query = injectQuery(() => ({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json())
  }));
}
```

---

#### GraphQL 集成（可选）

```bash
pnpm add graphql graphql-request
pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript
```

**TanStack Query + GraphQL 模式**：

```typescript
import { GraphQLClient } from 'graphql-request';
import { injectQuery } from '@tanstack/angular-query-experimental';

const client = new GraphQLClient('https://api.example.com/graphql');

export class UserService {
  getUser(userId: string) {
    return injectQuery(() => ({
      queryKey: ['user', userId],
      queryFn: () => client.request(GetUserDocument, { id: userId })
    }));
  }
}
```

---

### 状态管理层

#### 决策矩阵

| 应用规模 | 推荐方案 | 原因 |
|---------|---------|------|
| 小型应用 | `signal()` + `computed()` | 内置，零依赖 |
| 中型应用 | `@ngrx/signals` | 官方 Signal Store |
| 大型企业 | `NgRx` | 成熟的 Redux 模式 |
| 快速开发 | `NGXS` | 更少样板代码 |

---

#### Signal Store（推荐中小型应用）

```bash
pnpm add @ngrx/signals
```

```typescript
import { signalStore, withState, withMethods } from '@ngrx/signals';

export const UserStore = signalStore(
  { providedIn: 'root' },
  withState({ users: [], loading: false }),
  withMethods((store) => ({
    async loadUsers() {
      patchState(store, { loading: true });
      const users = await fetchUsers();
      patchState(store, { users, loading: false });
    }
  }))
);
```

---

#### NgRx（企业级应用）

```bash
pnpm add @ngrx/store @ngrx/effects @ngrx/entity @ngrx/store-devtools
```

**适用场景**：
- 复杂的状态依赖关系
- 需要时间旅行调试
- 多团队协作的大型项目

---

## 表单与验证

### 动态表单构建器

```bash
pnpm add @ngx-formly/core @ngx-formly/material
```

**核心优势**：
- JSON 驱动的表单定义
- 内置验证和条件渲染
- 减少 80% 表单样板代码

**示例**：

```typescript
import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';

@Component({
  selector: 'app-user-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <formly-form [form]="form" [fields]="fields" [model]="model"></formly-form>
      <button type="submit">Submit</button>
    </form>
  `
})
export class UserFormComponent {
  form = new FormGroup({});
  model = {};
  fields: FormlyFieldConfig[] = [
    {
      key: 'email',
      type: 'input',
      props: {
        label: 'Email',
        required: true,
      },
      validators: {
        validation: ['email']
      }
    },
    {
      key: 'age',
      type: 'input',
      props: {
        type: 'number',
        label: 'Age',
        min: 18,
      }
    }
  ];

  submit() {
    console.log(this.model);
  }
}
```

---

### 运行时验证

```bash
pnpm add zod
```

**Zod + Angular Forms**：

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
  password: z.string().min(8)
});

type User = z.infer<typeof userSchema>;

// 表单验证
function validateUser(data: unknown): User {
  return userSchema.parse(data); // 抛出错误如果验证失败
}
```

---

## 工具函数库

### 日期处理

```bash
# 推荐：date-fns（Tree-shakable）
pnpm add date-fns

# 或：dayjs（更小体积 2KB）
pnpm add dayjs
```

**date-fns 示例**：

```typescript
import { format, addDays, isBefore } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const formatted = format(new Date(), 'PPP', { locale: zhCN });
// "2025年10月16日"

const nextWeek = addDays(new Date(), 7);
```

**为什么不用 moment.js**：
- ❌ 包体积过大（67KB）
- ❌ 已停止维护
- ❌ 不支持 Tree-shaking

---

### 通用工具

```bash
# Lodash（ES 模块版本）
pnpm add lodash-es

# 国际化
pnpm add @ngx-translate/core @ngx-translate/http-loader

# UUID 生成
pnpm add uuid

# 数字格式化
pnpm add numeral
```

---

## 测试工具链

### 单元测试

```bash
# 现代方案：Vitest（推荐）
pnpm add -D vitest @analogjs/vite-plugin-angular

# 或保持默认：Jasmine + Karma
```

**Vitest 配置**：

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts']
  }
});
```

---

### 组件测试

```bash
pnpm add -D @testing-library/angular
```

**用户行为驱动测试**：

```typescript
import { render, screen, fireEvent } from '@testing-library/angular';
import { UserComponent } from './user.component';

test('should display user name', async () => {
  await render(UserComponent, {
    componentProperties: { user: { name: 'John' } }
  });

  expect(screen.getByText('John')).toBeInTheDocument();
});

test('should call onClick when button clicked', async () => {
  const onClick = jest.fn();
  await render(UserComponent, {
    componentProperties: { onClick }
  });

  fireEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});
```

---

### E2E 测试

```bash
# Playwright（2025 推荐）
pnpm add -D @playwright/test
```

**Playwright 测试**：

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('http://localhost:4200/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/.*dashboard/);
});
```

---

## Monorepo 与构建工具

### Nx 工作空间

```bash
npx create-nx-workspace@latest pro-workspace \
  --preset=angular-monorepo \
  --bundler=vite \
  --style=scss \
  --routing=true \
  --standaloneApi=true
```

**项目结构**：

```
pro-workspace/
├── apps/
│   ├── web/              # 公共网站
│   ├── admin/            # 管理后台
│   └── mobile/           # 移动端
├── libs/
│   ├── shared/
│   │   ├── ui/           # 共享 UI 组件
│   │   ├── utils/        # 工具函数
│   │   └── data-access/  # API 服务
│   ├── feature/
│   │   ├── auth/         # 认证功能
│   │   └── user/         # 用户管理
│   └── types/            # TypeScript 类型定义
├── nx.json
└── package.json
```

---

### Nx 核心概念

#### 1. 项目边界（Barrel 文件）

```typescript
// libs/shared/ui/src/index.ts
export * from './lib/button/button.component';
export * from './lib/card/card.component';
// 只有通过 index.ts 导出的才是公共 API
```

#### 2. 智能缓存

```bash
# 只构建受影响的项目
nx affected:build

# 只测试受影响的项目
nx affected:test
```

#### 3. 依赖图可视化

```bash
nx graph
```

---

## 代码质量工具

### ESLint + Prettier

```bash
pnpm add -D eslint @angular-eslint/schematics
pnpm add -D prettier eslint-config-prettier
pnpm add -D @typescript-eslint/eslint-plugin
pnpm add -D eslint-plugin-rxjs
```

**eslint.config.js**：

```javascript
import angular from '@angular-eslint/eslint-plugin';
import typescript from '@typescript-eslint/eslint-plugin';
import rxjs from 'eslint-plugin-rxjs';

export default [
  {
    files: ['**/*.ts'],
    plugins: { angular, typescript, rxjs },
    rules: {
      '@angular-eslint/directive-selector': ['error', {
        type: 'attribute',
        prefix: 'app',
        style: 'camelCase'
      }],
      'rxjs/no-async-subscribe': 'error',
      'rxjs/no-ignored-observable': 'error'
    }
  }
];
```

---

### Git Hooks

```bash
pnpm add -D husky lint-staged
npx husky init
```

**.husky/pre-commit**：

```bash
#!/bin/sh
npx lint-staged
```

**package.json**：

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.html": [
      "prettier --write"
    ]
  }
}
```

---

## 性能监控与分析

### 打包分析

```bash
# 分析打包体积
ng build --stats-json
npx webpack-bundle-analyzer dist/*/stats.json
```

---

### 运行时监控

```bash
pnpm add @sentry/angular
```

**Sentry 配置**：

```typescript
import * as Sentry from '@sentry/angular';

Sentry.init({
  dsn: 'YOUR_DSN',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});
```

---

## 完整 package.json 模板

```json
{
  "name": "pro-angular-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "nx serve",
    "build": "nx build --configuration=production",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "nx lint",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@angular/animations": "^19.0.0",
    "@angular/common": "^19.0.0",
    "@angular/compiler": "^19.0.0",
    "@angular/core": "^19.0.0",
    "@angular/forms": "^19.0.0",
    "@angular/material": "^19.0.0",
    "@angular/cdk": "^19.0.0",
    "@angular/platform-browser": "^19.0.0",
    "@angular/platform-browser-dynamic": "^19.0.0",
    "@angular/router": "^19.0.0",
    "@tanstack/angular-query-experimental": "^5.59.0",
    "@ngrx/signals": "^18.1.0",
    "@ngx-formly/core": "^6.3.0",
    "@ngx-formly/material": "^6.3.0",
    "tailwindcss": "^4.0.0",
    "date-fns": "^4.1.0",
    "lodash-es": "^4.17.21",
    "zod": "^3.23.8",
    "rxjs": "^7.8.1",
    "tslib": "^2.8.1"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^19.0.0",
    "@angular/cli": "^19.0.0",
    "@angular/compiler-cli": "^19.0.0",
    "@nx/angular": "^20.2.0",
    "@nx/workspace": "^20.2.0",
    "@playwright/test": "^1.49.0",
    "@testing-library/angular": "^17.3.0",
    "@types/lodash-es": "^4.17.12",
    "vitest": "^3.0.0",
    "@analogjs/vite-plugin-angular": "^1.11.0",
    "eslint": "^9.16.0",
    "@angular-eslint/schematics": "^19.0.0",
    "prettier": "^3.4.2",
    "husky": "^9.1.7",
    "lint-staged": "^15.2.11",
    "typescript": "~5.6.0"
  }
}
```

---

## 开发工作流

```bash
# 启动开发服务器
nx serve web

# 运行测试（监听模式）
nx test web --watch

# 运行 E2E 测试
nx e2e web-e2e

# 构建生产版本
nx build web --configuration=production

# 代码检查
nx lint web

# 格式化代码
nx format:write

# 查看依赖图
nx graph

# 清理缓存
nx reset
```

---

## 最佳实践总结

### 1. 优先使用 Signals
```typescript
// ✅ 推荐
const count = signal(0);
const doubled = computed(() => count() * 2);

// ❌ 避免（除非必要）
count$ = new BehaviorSubject(0);
doubled$ = this.count$.pipe(map(c => c * 2));
```

---

### 2. 使用 Standalone Components
```typescript
// ✅ 推荐
@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `...`
})
export class UserComponent {}
```

---

### 3. 懒加载路由
```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component')
  }
];
```

---

### 4. OnPush 变化检测
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

---

### 5. Track By 函数
```typescript
@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
}
```

---

## 资源链接

- [Angular 官方文档](https://angular.dev)
- [TanStack Query Angular](https://tanstack.com/query/latest/docs/framework/angular/overview)
- [Nx 文档](https://nx.dev)
- [Angular Material](https://material.angular.io)
- [PrimeNG](https://primeng.org)
- [NG-ZORRO](https://ng.ant.design)

---

**最后更新**：2025年10月
**维护者**：Pro Team

# Angular 快速启动指南

> 从零到生产的完整启动模板

---

## 快速选择

### 方案 A：Angular CLI（简单项目）
```bash
# 创建新项目
npx @angular/cli@latest new my-app \
  --routing \
  --style=scss \
  --standalone

cd my-app
pnpm install
pnpm start
```

### 方案 B：Nx Monorepo（推荐）
```bash
# 创建 Nx 工作空间
npx create-nx-workspace@latest my-workspace \
  --preset=angular-monorepo \
  --appName=web \
  --bundler=vite \
  --style=scss \
  --routing=true \
  --standaloneApi=true

cd my-workspace
pnpm install
pnpm nx serve web
```

---

## 完整项目初始化

### 1. 创建项目（Nx + Vite）

```bash
# 创建工作空间
npx create-nx-workspace@latest pro-workspace \
  --preset=angular-monorepo \
  --appName=web \
  --bundler=vite \
  --style=scss \
  --routing=true \
  --standaloneApi=true \
  --e2eTestRunner=playwright

cd pro-workspace
```

---

### 2. 安装 UI 库

#### 方案 A：Material + Tailwind
```bash
# Angular Material
pnpm nx add @angular/material

# Tailwind CSS
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Flowbite（可选）
pnpm add flowbite-angular
```

**配置 Tailwind**：

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./apps/**/src/**/*.{html,ts}",
    "./libs/**/src/**/*.{html,ts}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
```

```scss
/* apps/web/src/styles.scss */
@use '@angular/material' as mat;
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

@include mat.core();
```

---

#### 方案 B：PrimeNG
```bash
pnpm add primeng primeicons
```

**配置**：
```typescript
// apps/web/src/app/app.config.ts
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations()
  ]
};
```

```scss
/* apps/web/src/styles.scss */
@import "primeng/resources/themes/lara-light-blue/theme.css";
@import "primeng/resources/primeng.css";
@import "primeicons/primeicons.css";
```

---

### 3. 安装数据获取库

```bash
# TanStack Query
pnpm add @tanstack/angular-query-experimental

# GraphQL（可选）
pnpm add graphql graphql-request

# GraphQL Code Generator（可选）
pnpm add -D @graphql-codegen/cli \
  @graphql-codegen/typescript \
  @graphql-codegen/typescript-operations \
  @graphql-codegen/typescript-graphql-request
```

**配置 TanStack Query**：

```typescript
// apps/web/src/app/app.config.ts
import { provideAngularQuery, QueryClient } from '@tanstack/angular-query-experimental';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAngularQuery(new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 分钟
          gcTime: 5 * 60 * 1000, // 5 分钟
          retry: 3,
          refetchOnWindowFocus: true
        }
      }
    }))
  ]
};
```

---

### 4. 安装状态管理

```bash
# Signal Store（推荐）
pnpm add @ngrx/signals

# 或 NgRx（大型应用）
pnpm add @ngrx/store @ngrx/effects @ngrx/entity @ngrx/store-devtools
```

---

### 5. 安装工具库

```bash
# 日期处理
pnpm add date-fns

# 工具函数
pnpm add lodash-es
pnpm add -D @types/lodash-es

# 验证
pnpm add zod

# UUID
pnpm add uuid
pnpm add -D @types/uuid

# 国际化
pnpm add @ngx-translate/core @ngx-translate/http-loader
```

---

### 6. 安装表单库

```bash
pnpm add @ngx-formly/core @ngx-formly/material
```

**配置 Formly**：

```typescript
// apps/web/src/app/app.config.ts
import { provideFormly } from '@ngx-formly/core';
import { provideFormlyMaterial } from '@ngx-formly/material';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFormly(),
    provideFormlyMaterial()
  ]
};
```

---

### 7. 配置测试工具

#### Vitest（单元测试）
```bash
pnpm add -D vitest @analogjs/vite-plugin-angular @vitest/ui
```

**vitest.config.ts**：
```typescript
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

---

#### Playwright（E2E 测试）
```bash
# 通常已在创建 workspace 时安装
pnpm exec playwright install
```

---

### 8. 配置代码质量工具

```bash
# ESLint
pnpm add -D @angular-eslint/schematics
pnpm nx g @angular-eslint/schematics:add-eslint-to-project web

# Prettier
pnpm add -D prettier eslint-config-prettier

# Husky + lint-staged
pnpm add -D husky lint-staged
pnpm exec husky init
```

**创建 .prettierrc**：
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
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
    ],
    "*.{scss,css}": [
      "prettier --write"
    ]
  }
}
```

---

### 9. 配置环境变量

**创建环境文件**：
```typescript
// apps/web/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  graphqlUrl: 'http://localhost:3000/graphql'
};

// apps/web/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.example.com',
  graphqlUrl: 'https://api.example.com/graphql'
};
```

---

## 项目结构

### 推荐的 Nx 结构

```
pro-workspace/
├── apps/
│   ├── web/                      # 主应用
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── app.component.ts
│   │   │   │   ├── app.config.ts
│   │   │   │   └── app.routes.ts
│   │   │   ├── environments/
│   │   │   ├── assets/
│   │   │   ├── styles.scss
│   │   │   └── main.ts
│   │   └── project.json
│   └── web-e2e/                  # E2E 测试
│
├── libs/
│   ├── shared/
│   │   ├── ui/                   # 共享 UI 组件
│   │   │   ├── button/
│   │   │   ├── card/
│   │   │   └── index.ts
│   │   ├── utils/                # 工具函数
│   │   │   ├── date/
│   │   │   ├── string/
│   │   │   └── index.ts
│   │   ├── data-access/          # API 服务
│   │   │   ├── api.service.ts
│   │   │   ├── graphql.service.ts
│   │   │   └── index.ts
│   │   └── types/                # TypeScript 类型
│   │       └── index.ts
│   │
│   └── feature/
│       ├── auth/                 # 认证功能
│       │   ├── data-access/
│       │   ├── ui/
│       │   └── feature/
│       └── user/                 # 用户管理
│           ├── data-access/
│           ├── ui/
│           └── feature/
│
├── nx.json
├── package.json
├── tsconfig.base.json
└── .eslintrc.json
```

---

## 创建库命令

```bash
# 创建 UI 组件库
pnpm nx g @nx/angular:library ui \
  --directory=shared \
  --standalone \
  --changeDetection=OnPush

# 创建数据访问库
pnpm nx g @nx/angular:library data-access \
  --directory=shared \
  --standalone

# 创建功能模块
pnpm nx g @nx/angular:library feature-auth \
  --directory=feature/auth \
  --routing \
  --lazy \
  --standalone
```

---

## 生成组件命令

```bash
# 生成 standalone 组件
pnpm nx g @nx/angular:component button \
  --project=shared-ui \
  --standalone \
  --changeDetection=OnPush \
  --style=scss

# 生成服务
pnpm nx g @nx/angular:service api \
  --project=shared-data-access

# 生成守卫
pnpm nx g @nx/angular:guard auth \
  --project=feature-auth-feature
```

---

## package.json 完整模板

```json
{
  "name": "pro-workspace",
  "version": "1.0.0",
  "license": "MIT",
  "scripts": {
    "dev": "nx serve web",
    "build": "nx build web --configuration=production",
    "test": "nx test web",
    "test:watch": "nx test web --watch",
    "test:e2e": "nx e2e web-e2e",
    "lint": "nx run-many --target=lint --all",
    "format": "nx format:write",
    "format:check": "nx format:check",
    "affected:build": "nx affected --target=build",
    "affected:test": "nx affected --target=test",
    "graph": "nx graph",
    "prepare": "husky"
  },
  "dependencies": {
    "@angular/animations": "^19.0.0",
    "@angular/cdk": "^19.0.0",
    "@angular/common": "^19.0.0",
    "@angular/compiler": "^19.0.0",
    "@angular/core": "^19.0.0",
    "@angular/forms": "^19.0.0",
    "@angular/material": "^19.0.0",
    "@angular/platform-browser": "^19.0.0",
    "@angular/platform-browser-dynamic": "^19.0.0",
    "@angular/router": "^19.0.0",
    "@ngrx/signals": "^18.1.0",
    "@ngx-formly/core": "^6.3.0",
    "@ngx-formly/material": "^6.3.0",
    "@tanstack/angular-query-experimental": "^5.59.0",
    "date-fns": "^4.1.0",
    "graphql": "^16.9.0",
    "graphql-request": "^7.1.0",
    "lodash-es": "^4.17.21",
    "rxjs": "^7.8.1",
    "tailwindcss": "^4.0.0",
    "tslib": "^2.8.1",
    "uuid": "^11.0.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@analogjs/vite-plugin-angular": "^1.11.0",
    "@angular-devkit/build-angular": "^19.0.0",
    "@angular-eslint/eslint-plugin": "^19.0.0",
    "@angular-eslint/eslint-plugin-template": "^19.0.0",
    "@angular-eslint/template-parser": "^19.0.0",
    "@angular/cli": "^19.0.0",
    "@angular/compiler-cli": "^19.0.0",
    "@graphql-codegen/cli": "^5.0.3",
    "@graphql-codegen/typescript": "^4.1.2",
    "@graphql-codegen/typescript-graphql-request": "^6.2.0",
    "@graphql-codegen/typescript-operations": "^4.4.2",
    "@nx/angular": "^20.2.0",
    "@nx/eslint": "^20.2.0",
    "@nx/jest": "^20.2.0",
    "@nx/playwright": "^20.2.0",
    "@nx/vite": "^20.2.0",
    "@nx/workspace": "^20.2.0",
    "@playwright/test": "^1.49.0",
    "@types/lodash-es": "^4.17.12",
    "@types/uuid": "^10.0.0",
    "@vitest/ui": "^3.0.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.16.0",
    "eslint-config-prettier": "^9.1.0",
    "husky": "^9.1.7",
    "lint-staged": "^15.2.11",
    "nx": "^20.2.0",
    "postcss": "^8.4.49",
    "prettier": "^3.4.2",
    "typescript": "~5.6.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

---

## 常用开发命令

### 开发服务器
```bash
# 启动开发服务器
pnpm nx serve web

# 指定端口
pnpm nx serve web --port=4300

# 打开浏览器
pnpm nx serve web --open
```

---

### 构建
```bash
# 开发构建
pnpm nx build web

# 生产构建
pnpm nx build web --configuration=production

# 分析打包体积
pnpm nx build web --configuration=production --stats-json
npx webpack-bundle-analyzer dist/apps/web/stats.json
```

---

### 测试
```bash
# 单元测试
pnpm nx test web

# 监听模式
pnpm nx test web --watch

# 覆盖率
pnpm nx test web --coverage

# E2E 测试
pnpm nx e2e web-e2e

# 交互模式
pnpm nx e2e web-e2e --ui
```

---

### 代码质量
```bash
# Lint
pnpm nx lint web

# 修复 Lint 问题
pnpm nx lint web --fix

# 格式化所有文件
pnpm nx format:write

# 检查格式
pnpm nx format:check
```

---

### Affected 命令
```bash
# 只构建受影响的项目
pnpm nx affected:build

# 只测试受影响的项目
pnpm nx affected:test

# 查看受影响的项目
pnpm nx affected:graph
```

---

### 依赖图
```bash
# 可视化项目依赖
pnpm nx graph

# 查看特定项目的依赖
pnpm nx graph --focus=web
```

---

## GraphQL Code Generator 配置

**codegen.yml**：
```yaml
schema: http://localhost:3000/graphql
documents: 'libs/**/src/**/*.graphql'
generates:
  libs/shared/data-access/src/lib/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-graphql-request
    config:
      fetcher: graphql-request
      skipTypename: false
      enumsAsTypes: true
```

**package.json**：
```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.yml",
    "codegen:watch": "graphql-codegen --config codegen.yml --watch"
  }
}
```

---

## Docker 配置（生产部署）

**Dockerfile**：
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build web --configuration=production

FROM nginx:alpine
COPY --from=builder /app/dist/apps/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**：
```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

---

## CI/CD 配置（GitHub Actions）

**.github/workflows/ci.yml**：
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm nx format:check

      - run: pnpm nx affected:lint --base=origin/main

      - run: pnpm nx affected:test --base=origin/main --coverage

      - run: pnpm nx affected:build --base=origin/main --configuration=production

      - run: pnpm nx affected:e2e --base=origin/main

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: dist/.playwright/apps/web-e2e/playwright-report/
          retention-days: 30
```

---

## VSCode 配置

**.vscode/settings.json**：
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["class:\\s*?[\"'`]([^\"'`]*).*?,", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

**.vscode/extensions.json**：
```json
{
  "recommendations": [
    "angular.ng-template",
    "nrwl.angular-console",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "graphql.vscode-graphql",
    "ms-playwright.playwright"
  ]
}
```

---

## 快速检查清单

- [ ] 安装 Node.js 20+
- [ ] 安装 pnpm：`corepack enable pnpm`
- [ ] 创建 Nx 工作空间
- [ ] 安装 UI 库（Material/PrimeNG）
- [ ] 配置 Tailwind CSS
- [ ] 安装 TanStack Query
- [ ] 配置 Signal Store 或 NgRx
- [ ] 安装 Formly
- [ ] 配置测试工具（Vitest + Playwright）
- [ ] 配置 ESLint + Prettier
- [ ] 配置 Husky + lint-staged
- [ ] 配置环境变量
- [ ] 配置 CI/CD
- [ ] 创建 Docker 配置

---

## 故障排查

### 常见问题

**问题 1：端口被占用**
```bash
# 查找占用端口的进程
lsof -ti:4200

# 杀死进程
kill -9 $(lsof -ti:4200)
```

---

**问题 2：依赖安装失败**
```bash
# 清理缓存
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml

# 重新安装
pnpm install
```

---

**问题 3：Nx 缓存问题**
```bash
# 清理 Nx 缓存
pnpm nx reset
```

---

**问题 4：TypeScript 错误**
```bash
# 检查类型
pnpm nx run web:typecheck

# 重新构建类型
pnpm tsc --build --force
```

---

## 下一步

1. 阅读 [Angular 最佳实践](./angular-best-practices-2025.md)
2. 查看 [技术选型对比](./angular-toolchain-comparison.md)
3. 开始开发第一个功能模块

---

**最后更新**：2025年10月
**维护者**：Pro Team

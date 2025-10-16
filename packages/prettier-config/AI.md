# @pro/prettier-config

## 本质 (Essence)

统一的代码格式化配置包，为 Pro monorepo 提供一致、优雅的代码风格规范。每个配置选项都有其存在价值，消除代码格式的认知负担，让开发者专注于逻辑本身。

## 架构设计 (Architecture)

### 配置文件结构

```
@pro/prettier-config/
├── index.js          # 基础配置 - 适用于所有项目
├── backend.js        # 后端服务专用配置
├── frontend.js       # 前端应用专用配置
├── docs.js          # 文档文件专用配置
├── json.js          # JSON 文件专用配置
└── markdown.js      # Markdown 文件专用配置
```

### 设计哲学

**存在即合理** - 每个配置项存在都有明确目的
**优雅即简约** - 配置自我说明，无需注释
**一致性原则** - 整个 monorepo 保持统一风格

## 配置规则详解 (Configuration Rules)

### 基础配置 (index.js)

适用范围：工具包、通用库、共享代码

| 配置项 | 值 | 理由 |
|--------|-----|------|
| `semi` | `true` | 分号明确语句结束，消除 ASI 歧义 |
| `trailingComma` | `'all'` | 减少 Git diff 噪音，便于版本控制 |
| `singleQuote` | `true` | 更简洁，JSON 字符串无需转义 |
| `printWidth` | `100` | 适中宽度，平衡可读性与信息密度 |
| `tabWidth` | `2` | 标准缩进，紧凑而清晰 |
| `useTabs` | `false` | 空格保证跨编辑器一致性 |
| `arrowParens` | `'always'` | 明确参数边界，TypeScript 类型更清晰 |
| `bracketSpacing` | `true` | 对象字面量增加呼吸空间 |
| `endOfLine` | `'lf'` | Unix 风格，跨平台一致 |

### 后端配置 (backend.js)

适用范围：NestJS 服务、Node.js 应用、API 服务器

**核心特点**：
- `printWidth: 120` - 后端逻辑复杂，允许更宽的行
- `tabWidth: 4` - 更深的缩进层次，明确代码层级
- 针对 `.spec.ts`、`.e2e-spec.ts` 等测试文件优化
- 支持 Docker、配置文件、数据库迁移文件

**典型文件类型**：
```
*.ts, *.js          # TypeScript/JavaScript
*.spec.ts          # 单元测试
*.e2e-spec.ts      # E2E 测试
*.dto.ts           # 数据传输对象
*.entity.ts        # 数据库实体
*.module.ts        # NestJS 模块
Dockerfile         # Docker 配置
```

### 前端配置 (frontend.js)

适用范围：Angular 应用、React 应用、Vue 应用

**核心特点**：
- `printWidth: 100` - 标准宽度，适合组件结构
- `tabWidth: 2` - 前端嵌套较深，保持紧凑
- JSX/TSX 特殊处理
- HTML/CSS 优化格式化

**典型文件类型**：
```
*.component.ts     # Angular 组件
*.component.html   # Angular 模板
*.component.scss   # 组件样式
*.service.ts       # Angular 服务
*.tsx, *.jsx       # React 组件
*.css, *.scss      # 样式文件
```

### 文档配置 (docs.js)

适用范围：README、API 文档、教程

**核心特点**：
- `printWidth: 80` - 提高阅读舒适度
- `proseWrap: 'always'` - 自动换行，适应不同屏幕

**典型文件类型**：
```
README.md          # 项目说明
API.md            # API 文档
CONTRIBUTING.md   # 贡献指南
CHANGELOG.md      # 更新日志
```

### JSON 配置 (json.js)

适用范围：package.json、tsconfig.json 等配置文件

**核心特点**：
- `singleQuote: false` - JSON 标准要求双引号
- `trailingComma: 'none'` - JSON 标准不允许尾随逗号

### Markdown 配置 (markdown.js)

适用范围：Markdown 文档专用

**核心特点**：
- 保留内容语义
- 兼容各种渲染器
- 不破坏特殊格式

## 使用指南 (Usage Guide)

### 快速开始

**步骤 1：安装依赖**
```bash
pnpm add -D prettier @pro/prettier-config
```

**步骤 2：选择配置方式**

#### 方式 A：package.json（推荐）
```json
{
  "prettier": "@pro/prettier-config"
}
```

#### 方式 B：.prettierrc
```
"@pro/prettier-config"
```

#### 方式 C：专用配置
```json
{
  "prettier": "@pro/prettier-config/backend"
}
```

**步骤 3：添加格式化脚本**
```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### 项目应用场景

| 项目类型 | 推荐配置 | 示例 |
|---------|---------|------|
| 后端服务 | `backend.js` | apps/api, apps/broker, apps/cleaner |
| 前端应用 | `frontend.js` | apps/web, apps/admin |
| 工具包 | `index.js` | packages/logger, packages/utils |
| 文档项目 | `docs.js` | docs/ 目录 |

### 实际配置示例

**apps/api/package.json** (后端服务)
```json
{
  "name": "@pro/api",
  "prettier": "@pro/prettier-config/backend",
  "scripts": {
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\""
  }
}
```

**apps/web/package.json** (前端应用)
```json
{
  "name": "@pro/web",
  "prettier": "@pro/prettier-config/frontend",
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,html,scss}\"",
    "format:check": "prettier --check \"src/**/*.{ts,html,scss}\""
  }
}
```

**packages/logger/package.json** (工具包)
```json
{
  "name": "@pro/logger",
  "prettier": "@pro/prettier-config",
  "scripts": {
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\""
  }
}
```

## 集成方案 (Integrations)

### 与 ESLint 集成

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@pro/eslint-config',
    'prettier'  // 必须放在最后，关闭与 Prettier 冲突的规则
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error'
  }
};
```

### 与 Git Hooks 集成

使用 husky + lint-staged 在提交前自动格式化：

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,md,yml,yaml,css,scss}": [
      "prettier --write"
    ]
  }
}
```

### IDE 集成

**VS Code (.vscode/settings.json)**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "prettier.requireConfig": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**WebStorm/IntelliJ**
- Settings → Languages & Frameworks → Prettier
- ✓ On code reformat
- ✓ On save
- Prettier package: `node_modules/prettier`

## 文件类型支持 (File Type Support)

### 完整支持列表

| 类别 | 文件扩展名 | 说明 |
|------|-----------|------|
| TypeScript | `.ts`, `.tsx` | TypeScript 源文件 |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | JavaScript 源文件 |
| JSON | `.json`, `.jsonc` | JSON 配置文件 |
| Markdown | `.md`, `.mdx` | Markdown 文档 |
| YAML | `.yml`, `.yaml` | YAML 配置文件 |
| CSS | `.css`, `.scss`, `.sass`, `.less` | 样式文件 |
| HTML | `.html`, `.htm` | HTML 模板 |
| Angular | `.component.ts`, `.component.html` | Angular 组件 |
| GraphQL | `.graphql`, `.gql` | GraphQL schema |
| Dockerfile | `Dockerfile`, `*.dockerfile` | Docker 配置 |

## 最佳实践 (Best Practices)

### 原则一：统一配置，分级应用

- **monorepo 根目录**：使用基础配置
- **后端服务**：使用 backend 配置
- **前端应用**：使用 frontend 配置
- **文档目录**：使用 docs 配置

### 原则二：自动化优于手动

- 配置 Git hooks，提交前自动格式化
- 启用 IDE 保存时格式化
- CI/CD 中添加格式检查

### 原则三：格式化与 Lint 分离

```bash
# 先格式化，再 lint
pnpm format && pnpm lint

# CI 中的检查顺序
pnpm format:check && pnpm lint
```

### 原则四：忽略不需要格式化的文件

创建 `.prettierignore`：
```
# 构建产物
dist/
build/
*.min.js

# 依赖
node_modules/
pnpm-lock.yaml

# 生成代码
*.generated.ts
graphql/generated/

# 特殊文件
.env
.env.*
```

## 快速参考 (Quick Reference)

### 常用命令

```bash
# 格式化所有文件
prettier --write .

# 检查格式（不修改）
prettier --check .

# 格式化特定目录
prettier --write "src/**/*.ts"

# 格式化特定文件类型
prettier --write "**/*.{ts,js,json,md}"

# 显示哪些文件会被格式化
prettier --list-different .
```

### 配置选择决策树

```
项目类型判断
├─ 是后端服务？
│  └─ 使用 @pro/prettier-config/backend
├─ 是前端应用？
│  └─ 使用 @pro/prettier-config/frontend
├─ 是纯文档？
│  └─ 使用 @pro/prettier-config/docs
└─ 是工具包/库？
   └─ 使用 @pro/prettier-config
```

### 配置对比速查表

| 配置项 | base | backend | frontend | docs |
|--------|------|---------|----------|------|
| printWidth | 100 | 120 | 100 | 80 |
| tabWidth | 2 | 4 | 2 | 2 |
| semi | true | true | true | true |
| singleQuote | true | true | true | true |
| trailingComma | all | all | all | all |
| proseWrap | preserve | preserve | preserve | always |

## 故障排查 (Troubleshooting)

### 问题：格式化不生效

**检查清单**：
1. 确认已安装 `prettier` 依赖
2. 确认配置文件正确引用 `@pro/prettier-config`
3. 清除 IDE 缓存并重启
4. 检查 `.prettierignore` 是否误排除了文件

### 问题：与 ESLint 冲突

**解决方案**：
1. 安装 `eslint-config-prettier` 关闭冲突规则
2. 确保 `prettier` 在 ESLint extends 数组最后
3. 移除 ESLint 中的格式化规则

### 问题：特定文件不想格式化

**解决方案**：
```javascript
// 文件顶部添加注释
// prettier-ignore

// 或忽略特定代码块
// prettier-ignore
const ugly = {a:1,b:2,c:3};
```

## 维护指南 (Maintenance)

### 配置文件状态

当前 `@pro/prettier-config` 包已定义但配置文件尚未实现：

**已有**：
- ✓ package.json（定义了配置文件入口）
- ✓ README.md（详细说明配置规则）

**待创建**：
- ✗ index.js
- ✗ backend.js
- ✗ frontend.js
- ✗ docs.js
- ✗ json.js
- ✗ markdown.js

### 实现建议

基于 README 描述，各配置文件应包含：

**index.js（基础配置）**
```javascript
module.exports = {
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
};
```

**backend.js**
```javascript
module.exports = {
  ...require('./index'),
  printWidth: 120,
  tabWidth: 4,
};
```

**frontend.js**
```javascript
module.exports = {
  ...require('./index'),
  printWidth: 100,
  tabWidth: 2,
};
```

## 版本管理 (Versioning)

- **主版本号**：破坏性配置变更（如改变缩进宽度）
- **次版本号**：新增配置文件或选项
- **修订版本号**：Bug 修复、文档更新

## 相关资源 (Resources)

- [Prettier 官方文档](https://prettier.io/docs/en/)
- [Prettier 配置选项](https://prettier.io/docs/en/options.html)
- [Pro Monorepo 架构文档](../../README.md)

---

**核心理念**：格式化是消除认知负担的艺术，统一的风格让代码自我说明，让开发者专注于创造价值。

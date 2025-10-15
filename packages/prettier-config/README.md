# @pro/prettier-config

优雅统一的 Prettier 配置包，为 Pro monorepo 提供一致的代码格式化规范。

## 设计哲学

**存在即合理** - 每个配置项都有其不可替代的存在价值
**优雅即简约** - 配置应该自我说明，无需额外注释
**一致性原则** - 在整个项目中保持统一的代码风格

## 配置概览

### 基础配置 (`index.js`)

统一的基础配置，适用于整个 monorepo：

- **分号**: 启用 - 明确语句结束，减少歧义
- **尾随逗号**: `all` - 便于版本控制，减少合并冲突
- **引号**: 单引号 - 更简洁，JSON 字符串无需转义
- **行宽**: 100 字符 - 适中的宽度，保证可读性
- **缩进**: 2 空格 - 平衡可读性与紧凑性

### 专用配置

#### 后端服务 (`backend.js`)

适用于 NestJS、Node.js 等后端服务：

```javascript
// 在你的 package.json 中添加
"prettier": "@pro/prettier-config/backend"
```

**特点**：
- 更宽的行宽（120 字符）- 适应复杂的后端逻辑
- 更大的缩进（4 空格）- 明确显示代码层级
- 针对 TypeScript 接口和测试文件的优化

#### 前端应用 (`frontend.js`)

适用于 Angular、React 等前端框架：

```javascript
// 在你的 package.json 中添加
"prettier": "@pro/prettier-config/frontend"
```

**特点**：
- 标准 100 字符行宽 - 适合 UI 组件结构
- JSX 和 HTML 优化格式化
- 支持各种前端文件类型（TypeScript、CSS、SCSS 等）

#### 文档文件 (`docs.js`)

适用于 Markdown、README 等文档：

```javascript
// 在你的 package.json 中添加
"prettier": "@pro/prettier-config/docs"
```

**特点**：
- 80 字符行宽 - 提高阅读舒适度
- 自动换行 - 适应不同屏幕尺寸
- 针对各类文档文件的专门优化

#### JSON 文件 (`json.js`)

适用于各种 JSON 配置文件：

```javascript
// 在你的 package.json 中添加
"prettier": "@pro/prettier-config/json"
```

**特点**：
- 严格遵循 JSON 标准
- 双引号，无尾随逗号
- 针对不同类型配置文件的优化

#### Markdown 文件 (`markdown.js`)

专门的 Markdown 格式化配置：

```javascript
// 在你的 package.json 中添加
"prettier": "@pro/prettier-config/markdown"
```

**特点**：
- 内容优先，不改变文档语义
- 兼容各种 Markdown 渲染器
- 针对不同类型 Markdown 文件的优化

## 使用方法

### 1. 安装依赖

```bash
pnpm add -D prettier @pro/prettier-config
```

### 2. 在项目中配置

#### 方法一：package.json

```json
{
  "prettier": "@pro/prettier-config"
}
```

#### 方法二：.prettierrc.js

```javascript
module.exports = require('@pro/prettier-config');
```

#### 方法三：使用专用配置

```javascript
// 后端服务
module.exports = require('@pro/prettier-config/backend');

// 前端应用
module.exports = require('@pro/prettier-config/frontend');

// 文档文件
module.exports = require('@pro/prettier-config/docs');
```

### 3. 添加格式化脚本

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

## 配置文件类型支持

### 通用支持
- JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- JSON (`.json`, `.jsonc`)
- Markdown (`.md`)
- YAML (`.yml`, `.yaml`)
- CSS/SCSS/Less (`.css`, `.scss`, `.sass`, `.less`)

### 专用支持
- **后端**: 测试文件、配置文件、Docker 文件、数据库迁移文件
- **前端**: Angular 模板、React 组件、样式文件、Storybook 文件
- **文档**: README、API 文档、教程、更新日志、贡献指南

## 最佳实践

### 1. 与 ESLint 集成

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@pro/eslint-config',
    'prettier'  // 必须放在最后
  ],
  rules: {
    'prettier/prettier': 'error'
  }
};
```

### 2. Git Hooks

使用 husky 和 lint-staged：

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### 3. IDE 集成

#### VS Code

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "prettier.configPath": "node_modules/@pro/prettier-config/index.js"
}
```

## 项目应用示例

### 后端服务 (apps/api)

```json
{
  "prettier": "@pro/prettier-config/backend"
}
```

### 前端应用 (apps/web)

```json
{
  "prettier": "@pro/prettier-config/frontend"
}
```

### 工具包 (packages/*)

```json
{
  "prettier": "@pro/prettier-config"
}
```

## 维护指南

### 添加新的配置选项

1. 确保配置选项有明确的存在价值
2. 添加详细的中文注释说明其用途
3. 考虑对现有项目的影响
4. 更新相关文档

### 版本更新

- 主版本号：破坏性变更
- 次版本号：新功能添加
- 修订版本号：Bug 修复和文档更新

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交变更（遵循项目的代码格式化规范）
4. 创建 Pull Request

## 许可证

MIT License
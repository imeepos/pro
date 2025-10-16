# @pro/eslint-config

统一的 ESLint 配置包，专为 Pro monorepo 设计，提供优雅而严格的代码规范。

## 设计哲学

**存在即合理** - 每一条规则都有其存在的必要性和不可替代的作用。

**优雅即简约** - 代码应该自文档化，通过精心的结构和命名来解释自身。

**性能即艺术** - 在追求代码优雅的同时，不牺牲执行性能。

## 配置类型

### 基础配置 (`index.js`)

核心配置，包含通用的 TypeScript、安全性和代码质量规则。

```javascript
module.exports = require('@pro/eslint-config');
```

### NestJS 后端服务配置 (`nestjs.js`)

专为 NestJS 应用设计，包含装饰器、依赖注入、模块化等最佳实践。

```javascript
module.exports = require('@pro/eslint-config/nestjs');
```

**特性:**
- 装饰器使用规范
- 依赖注入模式检查
- 异步处理严格验证
- 模块化代码组织
- Jest 测试环境支持

### Angular 前端应用配置 (`angular.js`)

专为 Angular 应用设计，涵盖组件、服务、指令、管道等。

```javascript
module.exports = require('@pro/eslint-config/angular');
```

**特性:**
- 组件和指令命名规范
- 模板语法检查
- RxJS 最佳实践
- 可访问性规则
- 生命周期钩子验证

### Node.js 工具包配置 (`node.js`)

适用于 Node.js 库和工具包，强调类型安全和性能。

```javascript
module.exports = require('@pro/eslint-config/node');
```

**特性:**
- CommonJS/ESM 模块支持
- 异步操作严格检查
- 安全漏洞防护
- 性能优化规则
- 错误处理规范

### TypeScript 严格配置 (`typescript.js`)

最严格的 TypeScript 配置，适用于类型敏感的项目。

```javascript
module.exports = require('@pro/eslint-config/typescript');
```

**特性:**
- 严格的类型检查
- 命名约定强制执行
- 高级 TypeScript 特性验证
- 复杂度控制
- 代码质量监控

## 使用方法

### 1. 安装依赖

```bash
pnpm add -D @pro/eslint-config eslint typescript
```

### 2. 创建 `.eslintrc.js` 文件

#### NestJS 应用示例

```javascript
module.exports = require('@pro/eslint-config/nestjs');
```

#### Angular 应用示例

```javascript
module.exports = require('@pro/eslint-config/angular');
```

#### Node.js 包示例

```javascript
module.exports = require('@pro/eslint-config/node');
```

#### TypeScript 严格模式示例

```javascript
module.exports = require('@pro/eslint-config/typescript');
```

### 3. 自定义配置

如果需要自定义规则，可以扩展现有配置：

```javascript
const config = require('@pro/eslint-config/nestjs');

module.exports = {
  ...config,
  rules: {
    ...config.rules,
    // 自定义规则
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
```

## 核心规则说明

### 类型安全

- `@typescript-eslint/no-explicit-any`: 警告使用 `any` 类型
- `@typescript-eslint/prefer-nullish-coalescing`: 使用 `??` 替代 `||`
- `@typescript-eslint/prefer-optional-chain`: 使用可选链操作符

### 代码质量

- `complexity`: 控制函数复杂度
- `max-depth`: 限制嵌套深度
- `max-lines`: 限制文件行数
- `prefer-const`: 优先使用 const 声明

### 安全性

- `security/*`: 检测常见安全漏洞
- `no-eval`: 禁止使用 eval
- `no-implied-eval`: 禁止隐式 eval

### 异步处理

- `@typescript-eslint/await-thenable`: 检查无效的 await
- `@typescript-eslint/no-floating-promises`: 必须处理 Promise

## 文件类型处理

配置包会根据文件类型自动调整规则：

- `*.spec.ts`, `*.test.ts`: 测试文件，放宽部分规则
- `*.config.ts`: 配置文件，允许 require 和 console
- `*.d.ts`: 类型定义文件，关闭类型检查规则
- `*.html`: Angular 模板文件，应用模板规则

## 性能考虑

- 使用 TypeScript 项目引用，提高解析性能
- 按需加载插件，减少启动时间
- 智能缓存配置，避免重复计算
- 文件级别规则覆盖，精确控制

## 最佳实践

1. **选择合适的配置**: 根据项目类型选择对应的配置文件
2. **逐步迁移**: 新项目使用严格配置，老项目逐步收紧规则
3. **团队协作**: 保持团队内 ESLint 配置一致性
4. **持续集成**: 在 CI/CD 流程中集成 ESLint 检查

## 故障排除

### TypeScript 项目未找到

确保在项目根目录有 `tsconfig.json` 文件，并且正确配置了 `include` 和 `exclude`。

### 规则冲突

如果遇到规则冲突，可以在项目配置中覆盖：

```javascript
module.exports = {
  ...require('@pro/eslint-config/nestjs'),
  rules: {
    // 覆盖特定规则
    'security/detect-object-injection': 'off',
  },
};
```

### 性能问题

如果 ESLint 运行缓慢，可以：

1. 检查 `tsconfig.json` 配置，确保不包含过多文件
2. 使用 `--cache` 选项启用缓存
3. 在 CI 环境中使用并行处理

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个配置包。请确保：

1. 新规则有明确的必要性说明
2. 遵循现有的代码风格
3. 添加相应的测试用例
4. 更新文档说明

## 版本历史

- **1.0.0**: 初始版本，包含基础的 TypeScript、NestJS、Angular、Node.js 配置
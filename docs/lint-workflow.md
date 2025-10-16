# Lint Workflow 2025.10

我们为整个工作区引入了统一的 ESLint 平台化配置，以保证前后端项目共享同一套极简而可扩展的约束。下面是当前的使用方式与后续迁移建议。

## 新的配置架构

- `packages/eslint-config/factory.js` 提供 `createTypeScriptConfig` 工厂，自动：
  - 探测常见的 `tsconfig.*.json`，构造 `parserOptions.project`
  - 注入 `@typescript-eslint` 的 flat `recommended` 配置（可按需开启 type-aware 规则）
  - 统一忽略目录：`dist/**`、`coverage/**`、`node_modules/**` 等
  - 设置基础规则（默认放宽 `any`/`console` 等限制，关注“存在即合理”场景）
- `packages/eslint-config/index.js` 默认导出 TypeScript 通用配置，同时暴露工厂函数用于定制。
- 额外细分预设：
  - `@pro/eslint-config/angular.js`：针对 Angular 应用，忽略 HTML 模板、环境文件与 GraphQL 代码生成结果。
  - `@pro/eslint-config/nestjs.js`：为 NestJS 服务准备的轻量 preset（暂未在生产项目中启用）。
  - `@pro/eslint-config/node.js` / `typescript.js`：适用于纯 Node/库场景的基础 preset。

## 已完成的迁移

| 项目 | 说明 | 命令 |
| --- | --- | --- |
| `apps/bugger-web` | 使用 `eslint.config.mjs` 引入 Angular preset，保留 `pnpm run lint/build` 工作流 | `pnpm run --filter=@pro/bugger-web lint` |
| `apps/web` | 同样切换到 Angular preset，并将 `package.json` 的 `lint` 脚本改为直接调用 ESLint | `pnpm run --filter=@pro/web lint` |

两套前端均通过 `pnpm run … lint` 和 `pnpm run … build` 验证。注意：`apps/web` 仍会在构建时提示历史存在的 bundle 预算与可选链警告，这些将在后续性能/模板优化中处理。

## 待迁移的目标

1. **后端服务（NestJS）**
   - `apps/api`、`apps/broker`、`apps/cleaner`… 目前还使用旧的 `eslint` 命令。
   - 启用 `@pro/eslint-config/nestjs.js` 前，需要清理大量 `any`、未使用导入/参数、空 `async` 方法等问题。建议逐个模块推进，结合 `@typescript-eslint` 的自动修复能力。

2. **库包**
   - `packages/utils`、`packages/components` 等可以改用 `@pro/eslint-config/typescript.js` 或按需调用工厂函数。
   - 在迁移过程中，如果需要更严格的规则（如开启 type-aware 套件），可在项目级别通过 `createTypeScriptConfig({ typeAware: true, rules: { … } })` 进行扩展。

## 常见注意事项

- **ESM 配置警告**：Angular 应用的 `eslint.config.js` 是 ESM 写法，但 `package.json` 未声明 `"type": "module"`。短期内可忽略，或者将配置文件改名为 `.mjs`。
- **构建预算告警**：`apps/web` 的主 bundle (~805 kB) 超过默认 500 kB，后续可通过懒加载/按需裁剪或调整 `angular.json` 中的 budget。
- **GraphQL 代码生成**：`@pro/web` 使用 GraphQL codegen，相关输出已在 Angular preset 的 `ignores` 中排除，避免 ESLint 针对自动生成文件报噪声。

## 下一步建议

1. 按功能模块为 `apps/api` 开启新的 lint preset，优先治理认证、微博子系统中遗留的 `any`/未使用变量。
2. 为所有 Angular 项目在 `package.json` 中统一声明 `"type": "module"` 或将 `eslint.config.js` 改为 `.mjs`，消除运行期警告。
3. 在 CI 中替换旧的 `ng lint` 命令，统一改用 `pnpm run --filter=<target> lint`，确保共享规则真正生效。

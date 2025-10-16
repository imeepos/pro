# Web 应用重构蓝图

## 指导哲学
- 沿用《angular-best-practices-2025.md》提出的信号优先、GraphQL 优先、极简架构准则。
- 参考《angular-quick-start.md》的 Vite 构建、TanStack Query 与 Tailwind 组合范式。
- 遵循《angular-toolchain-comparison.md》对组件库与性能的权衡：保持 Flowbite/Material 极简组合，拒绝臃肿依赖。

## 已完成的第一阶段
- 引入 `GraphqlGateway` 与 `ScreenService`，直接消费 API GraphQL 接口，彻底移除 `@pro/sdk` 依赖。
- 为 WebSocket 组件保留 `@pro/components` 能力，同时通过本地 `screen.types.ts`、`weibo.types.ts` 澄清领域模型。
- 在 `app.config.ts` 提供 TanStack Query 默认配置，统一未来的数据获取策略。
- `HomeComponent`、`ScreenDisplayComponent` 改用 GraphQL 数据源，消除 `toPromise` 旧写法，确保资源释放与错误可追踪。
- `HomeComponent` 现以 TanStack Query 驱动已发布/默认屏幕数据流，利用响应式副作用保持大屏装配与错误提示一致。
- `pnpm` 依赖对齐：新增 `@tanstack/angular-query-experimental`、`graphql-request`，移除无用 SDK。

## 第二阶段（进行中）
1. **GraphQL 代码生成**
   - ✅ 落地 `@graphql-codegen`，生成强类型操作并替换手写字符串查询。
   - ✅ 构建共享 `schema.gql`，与 API 仓库保持同步。
2. **状态与信号改造**
   - ✅ `ScreenDisplayComponent` 与 `HomeComponent` 同步进入 TanStack Query + GraphQL Gateway 数据流，保留轮播/回退逻辑并支持实时同步。
   - ✅ 微博与事件组件改用 `WeiboDataService`、`EventDataService` 注入，统一走 GraphQL 访问层。
   - ✅ 用 Angular Signals 重写登录状态，`AuthSignalStore` + Signals `AuthQuery` 完成 Akita 退场。
   - ✅ 建立 `ScreenSignalStore`，现已贯通首页与大屏展示，统一轮播、默认屏幕与加载状态。
3. **错误与埋点统一**
   - ✅ 在 `GraphqlGateway` 中扩展错误语义与自动重试策略。
   - ✅ 前端引入结构化记录器，沿用 `@pro/logger` 语料（`service/scope/level/msg/context`），Web 端日志现与后端格式一致。

## 第三阶段（规划）
1. **UI 体验焕新**
   - 基于 Material 3 + Tailwind 设计系统重塑全局样式层。
   - 拆分超大组件，形成 `screen/`、`home/` 的小型可组合展示单元。
2. **性能审计**
   - 打通路由级懒加载与资源预取，确保首屏小于 120KB。
   - 引入响应式 `@angular/platform-browser` 性能分析，在 CI 中监控。
3. **测试矩阵**
   - 添加 GraphQL 数据访问层的契约测试。
   - 为关键组件补齐 Cypress/Playwright 冒烟用例，保障动态拼装逻辑。
   - ✅ 补齐 `ScreenSignalStore` 与 `GraphqlGateway` 的单元测试覆盖，确保状态同步与重试语义稳定。
   - ✅ 增补 `StructuredLogger` 单元测试，验证作用域继承与日志级别阈值。

## 净化收尾
- 删除遗留 `sdk` 接口引用，统一类型来源。
- 保持 `docs/` 与实现同步，所有阶段任务完成后更新该蓝图。

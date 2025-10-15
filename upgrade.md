# apps/api GraphQL Upgrade Plan

## Current Context
- NestJS REST service with modular domains (`auth`, `user`, `weibo`, `jd`, `screens`, `events`, `media-type`, `dashboard`, `notifications`).
- TypeORM is the data layer, with validation pipes, exception filters, and transform interceptors applied globally.
- Global prefix `api` and CORS are configured in `main.ts`.

## Migration Goals
- Introduce a typed GraphQL API that aligns with the existing domain modules while preserving TypeScript type safety.
- Reuse TypeORM entities, validation rules, guards, and interceptors to avoid duplicated logic.
- Allow incremental adoption so REST endpoints can coexist until consumers finish migrating.
- Maintain performance discipline and clear observability throughout the transition.

## Option Analysis

### Option A · Nest GraphQL (ApolloDriver)
- Use `@nestjs/graphql` with `@nestjs/apollo` and `@apollo/server`.
- Code-first workflow keeps schema close to TypeScript models via decorators, easing reuse of DTOs and guards.
- Mature tooling for federation, persisted queries, caching, and tracing; aligns with Nest's dependency injection.
- Overhead: Apollo ecosystem is heavier and may introduce additional memory footprint; needs schema governance.

### Option B · Nest GraphQL (MercuriusDriver)
- Use `@nestjs/graphql` with `@nestjs/mercurius` and `mercurius` on top of Fastify.
- Lighter runtime, excellent subscription performance, native support for envelop and GraphQL Yoga plugins.
- Requires switching Nest application adapter to Fastify or running a hybrid bridge; migration cost is higher because the current REST stack is Express-based.

### Option C · Standalone GraphQL Gateway
- Create an independent GraphQL server (Apollo, Helix, Yoga) that calls existing REST endpoints.
- Minimal changes inside `apps/api`, but doubles validation, error handling, and serialization logic.
- Adds network hops and complicates authentication; long-term maintenance burden is significant.

## Third-party Building Blocks
- `@nestjs/graphql` — Nest integration layer.
- `@nestjs/apollo` or `@nestjs/mercurius` — framework-specific drivers.
- `graphql` — core specification library (required by any driver).
- `class-transformer` / `class-validator` — already in use; continue leveraging via DTO decorators.
- `@nestjs/passport` and existing guards — reused for authorization on resolvers.
- Optional: `@apollo/server-plugin-landing-page-disabled`, `apollo-server-plugin-base` for production hardening; `dataloader` for batching TypeORM access.

## Recommended Direction
- Adopt Option A (Nest GraphQL with ApolloDriver) using the code-first approach.
- Keeps the current Express platform and reuses module wiring, interceptors, and providers.
- Minimizes disruption while offering the richest ecosystem for federation or persisted queries if required later.

## Upgrade Phases
1. **Infrastructure Preparation**
   - Add GraphQL dependencies and enable the `GraphQLModule` in `AppModule` with ApolloDriver.
   - Configure schema generation to emit SDL files into `apps/api/schema.graphql` for visibility.
   - Expose GraphQL endpoint under `/graphql`, disable playground in production, and wire health check to remain at `/health`.
2. **Cross-cutting Concerns**
   - Wrap existing global pipes, filters, and interceptors for GraphQL contexts (e.g., map `HttpExceptionFilter` to `GqlExceptionFilter`).
   - Ensure authentication guards implement `GqlExecutionContext`.
   - Set up request-scoped logging and tracing using `@pro/logger`.
3. **Domain Module Conversion**
   - Migrate each REST controller to a resolver in priority order (`auth` → `user` → remaining modules).
   - Reuse existing DTOs by decorating them with `@ObjectType`, `@InputType`, and field metadata.
   - Introduce dedicated resolvers per aggregate root with precise query/mutation naming.
4. **Data Access Optimization**
   - Add `DataLoader` instances per entity to batch TypeORM calls when resolving nested fields.
   - Review pagination patterns (`findAndCount`) and expose Relay-style connections or tailored payloads.
5. **Incremental Rollout**
   - Keep REST controllers during transition; feature-flag GraphQL endpoints per client group.
   - Document schema changes and provide migration guides to frontend teams.
   - Once consumers migrate, deprecate REST routes module by module.
6. **Quality Gates**
   - Extend unit and e2e tests with resolver coverage (`@nestjs/testing`, `supertest-graphql` or `graphql-request`).
   - Update CI pipelines to run GraphQL schema linting and breaking-change detection (e.g., `graphql-inspector`).

## Risk Mitigation
- **Schema Sprawl**: Establish naming conventions and review schema diffs before merge.
- **N+1 Queries**: Enforce DataLoader usage in code reviews and monitor database metrics.
- **Auth Surface**: Validate every resolver path with guards and build integration tests around critical flows.
- **Performance Regression**: Benchmark REST vs GraphQL endpoints using `autocannon` or `k6`, tune caching and pagination strategy accordingly.

## Current Progress
- ✅ Phase 1 infrastructure bootstrapped: Apollo GraphQL wired into `AppModule` with code-first schema emission.
- ✅ Phase 2 groundwork: global interceptors/filters and authentication guards now honor `GqlExecutionContext`, GraphQL-aware exception handling introduced.
- ✅ Phase 3 momentum: `UserModule` and `AuthModule` now expose GraphQL schemas that reuse existing DTOs, services, and guards while covering login/register/refresh/logout/me flows.
- ✅ Per-request DataLoader context established with `userById` batching and resolvers refactored to consume it, eliminating early N+1 patterns for identity lookups.
- ✅ API Key management migrated to GraphQL with typed inputs, paginated listings, ownership guards, regeneration semantics, and a new `apiKeyById` loader to preserve batching discipline.
- ✅ Screens domain now served via GraphQL with JSON-aware layout/component models, guarded CRUD mutations, offset pagination parity, and resolver-level creator hydration through the shared `userById` DataLoader.
- ✅ Dashboard queries ("stats" 与 "recent activities") 已迁移为 GraphQL 查询，沿用服务层聚合逻辑并以枚举刻画动态类别，为前端提供一致的数据语义。
- ✅ 标签体系以 GraphQL Resolver 呈现：提供分页、热门榜、详情及 CRUD 变更，同时复用 DTO 校验并暴露使用次数等元数据。
- ✅ 事件类型与行业类型转换为 GraphQL 查询/变更接口，补齐输入注解与模型映射，保留排序/状态元数据约束。
- ✅ 事件主体模块完成 GraphQL 化：涵盖分页筛选、地图与附近检索、标签增删、上下架流程，模型联动类型/行业/标签/附件并保持服务层数据契约。
- ✅ 通知模块以 GraphQL Mutation 包装 WebSocket 广播能力，新增 Notification 输入/输出模型，允许面向用户或全局广播同时复用既有 Gateway。
- ✅ 统一 GraphQL 分页：通过通用 Offset Connection 工厂和转换工具，将 API Key、Screens、Events、Tags 等模块收敛到一致的连接结构，补齐 PageInfo 语义。
- ✅ 新增事件域 DataLoader（事件类型 / 行业类型 / 标签）并在 Resolver 层按需分发，消除跨实体 N+1。
- ✅ GraphQL 附件上传采用「预签名 URL + 确认」双阶段流程，支持去重复用、严格权限校验及凭证过期治理，保留与现有 MinIO 存储策略的兼容性。
- ✅ MediaType 模块迁移为 GraphQL：提供分页 Connection、详情查询与 CRUD Mutations，沿用状态枚举与排序逻辑，复用统一分页工具。
- ✅ Weibo 账户与搜索任务迁移至 GraphQL，覆盖列表/详情/统计/状态切换等操作，并保留内部 token 校验与批量调度能力。
- ✅ 京东账号管理模块完成 GraphQL 化：提供账号列表分页、健康检查、批量巡检与统计查询。
- ✅ 配置中心暴露 GraphQL 查询与缓存治理：可按枚举类型获取配置值、清理缓存并查询缓存占用，逻辑复用现有服务层。
- ✅ 京东扫码登录支持 GraphQL 会话创建与状态查询，允许前端通过轮询获取二维码与状态事件，为后续 Subscription 改造铺垫。
- ✅ 微博扫码登录同样提供 GraphQL 会话管理能力，支持轮询二维码与状态事件，逐步摆脱单一 REST SSE 依赖。
- ✅ 京东/微博 REST SSE 登录端点完全下线，标准化为 GraphQL Mutation + Subscription 流程。
- ✅ WebSocket Subscriptions 已启用，京东/微博扫码登录可通过 `jdLoginEvents`/`weiboLoginEvents` 实时获取事件流，默认回放当前会话的最新事件。
- ✅ 健康检查暴露 GraphQL 查询（`health`），补齐监控面向 GraphQL 客户端的入口。
- ✅ 为 GraphQL Auth 能力补充 e2e 测试，覆盖注册/登录/刷新/注销的主要流程。
- ✅ dashboard、screens、media-type、auth、api-key、user、config、weibo-search-task 等模块已清理 REST 控制器，GraphQL 成为唯一入口。
- ✅ 健康检查 REST 探针下线，启动流程移除全局 REST 前缀，仅保留 GraphQL `health` 查询作为存活检测；历史 `/api/*` 路径统一返回 410 并提示迁移。
- ✅ 新增 GraphQL 迁移指引文档（`docs/graphql-migration.md`），集中说明登录、健康与附件等核心流程。
- ⏭️ Next focus: plan REST shutdown sequencing and align client migrations with the stabilized GraphQL contract.

### REST 模块盘点
- 已存在等价 GraphQL 能力的 REST 控制器：无（REST 控制器已全部移除）。
- 仍需迁移的 REST 入口：无，但需通知历史客户端改用 GraphQL 查询或订阅。
- 附件上传、事件类型 / 行业类型 / 事件主体、dashboard、screens、media-type、auth、api-key、user、config、weibo-search-tasks、健康探针等模块的 REST 控制器已移除，全部以 GraphQL 提供服务。

### REST 下线分阶段策略
1. **准备期**
   - 为所有 GraphQL 解析器补充契约测试，确保与 REST 行为一致；在日志中标记 REST 调用来源，便于统计仍在使用的客户端。
  - 对 REST 控制器输出 `Deprecation` 响应头，并在 `upgrade.md`/内部公告中披露下线时间线。（SSE 登录接口已完成移除）
2. **迁移期**
  - 针对仍在使用的 REST 探针设计替代方案，并同步客户端更新；GraphQL 附件/事件方案可作为迁移参考，持续更新客户端使用指南。
   - 在 CI/CD 中阻止新的 REST 入口合入，强制新功能基于 GraphQL。
3. **收敛期**
   - 对迁移完成的模块启用 feature flag：默认返回 410/redirect 指向 GraphQL，必要时允许灰度恢复。
   - 观察错误率、性能指标 1-2 周，确认无回退需求后移除对应 REST 控制器。
  - 用同样方式最终下线剩余模块（健康探针等）并关闭 REST 网关配置。

### 后续 TODO
- [ ] 协调前端完成对 `jdLoginEvents`/`weiboLoginEvents` 订阅通道的接入，并补齐相关文档。
- [ ] 制定健康探针的迁移计划，明确替换的 GraphQL 接口与时间表。
- [ ] 编写 GraphQL 合约测试（`supertest-graphql`）覆盖关键路径，支撑 REST 下线验证。

## GraphQL 附件上传方案

### 现状与约束
- REST 路径 `POST /events/:eventId/attachments` 通过 Multer 接收文件、校验后写入 MinIO，并在 DB 中维护 MD5 去重与排序。
- 当前流程由 API 服务中转大文件，容易阻塞 Node.js 资源；需要迁移为前端直传对象存储的模式。
- 仍需保留 `AttachmentService` 中的校验逻辑与去重策略，确保历史数据兼容。

### 目标方案（两阶段上传）
1. **请求上传凭证（GraphQL Mutation）**
   - 输入：`eventId`, 文件元信息（`fileName`, `mimeType`, `size` 等）。
   - 处理：复用现有 `validateFile`、计算 MD5（可由前端提供或服务端生成临时 hash），生成对象键 `shared/<hash>/hash.ext`。
   - 输出：预签名 PUT URL (`uploadUrl`)、到期时间、必须携带的 headers、`objectKey`，以及服务器侧需要的 `uploadToken`。
   - 存储：在 Redis/DB 记录 `{uploadToken, eventId, objectKey, expiresAt, userId}`，防止越权。
2. **前端直传 MinIO**
   - 客户端以 `uploadUrl` 上传文件，遵守大小与 MIME 限制，成功后返回 200/204。
3. **确认附件（GraphQL Mutation）**
   - 输入：`uploadToken`, `fileName`, `mimeType`, `size`（可选）、`md5`。
   - 处理：校验 token 与用户身份、确认对象存在 (`statObject`)、复用或新增 `EventAttachmentEntity`，并触发排序逻辑。
   - 输出：GraphQL `EventAttachment` 模型。

### 安全与清理
- 预签名 URL 过期时间建议 5~10 分钟，超时需重新申请。
- 定期任务清理未确认的上传 token 和孤立对象（可在 confirm 失败后触发异步删除）。
- 日志记录 `requestUpload` 与 `confirm` 行为，便于追踪问题。

### 开发步骤
1. 新建 GraphQL DTO/Model（`RequestAttachmentUploadInput`, `RequestAttachmentUploadPayload`, `ConfirmAttachmentInput`）。
2. 调整 `AttachmentService`：抽离校验与预签名逻辑，新增 `createUploadIntent`、`confirmUploadIntent`。
3. 添加存储上传 token 的仓储（Redis 或 `attachment_upload_token` 表），并实现过期清理。
4. 更新前端：改为直传 MinIO，上传完成后调用 `confirmAttachment`，同时处理失败重试与凭证过期刷新。

## Success Criteria
- GraphQL schema mirrors existing business capabilities with strict typing and no duplicated domain logic.
- REST endpoints remain stable until formally sunset, avoiding disruption to current consumers.
- Testing and monitoring confirm parity on correctness, latency, and resource consumption.

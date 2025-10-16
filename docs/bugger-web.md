# Bugger Web 重构蓝图

> 以代码为笔墨，循序打磨 Bug 守护者的前端体验。

## 现状速写

- 项目根基：Angular 20 独立应用，Tailwind 打底，依赖 `@pro/types` 共享领域模型。
- 数据访问：已从 Apollo Client 迁移至 `graphql-request`，并在应用注入层引入 `@tanstack/angular-query-experimental` 的 `QueryClient` 基座，呼应《docs/angular-best-practices-2025.md》中“TanStack Query + GraphQL”组合的推荐。
- 工具链：仍沿用 Angular CLI 构建，符合《docs/angular-quick-start.md》所述“CLI 简洁流”方案；UI 组件尚未统一，后续可参考《docs/angular-toolchain-comparison.md》中的 Material + Tailwind 组合继续精简。

## 阶段一：基础设施净化（已完成）

- 去除 `@pro/sdk` 依赖，全面拥抱 GraphQL API，保持前后端契约透明。
- 替换 Apollo 套件，使用 `graphql-request` + 独立 `GraphQLClient`，并在服务层集中处理错误映射，让 `BugError` 叙述业务语义。
- 统一 TypeScript 类型解析范围，限制为 Jasmine，解决历史遗留的 Jest/Jasmine 冲突。

## 阶段二：数据获取与状态叙事（进行中）

1. **逐步引入 TanStack Query 信号化数据流**  
   - ✅ `BugListComponent`、`BugDetailComponent`、`DashboardComponent` 已迁移至 `injectQuery`/`injectMutation`，信号驱动渲染与缓存失效。  
   - 在剩余业务模块推广相同模式，确保查询、分页、乐观更新的语义统一。  
   - 通过 Query Client 的缓存策略实现乐观更新、分页状态持久化，以及后台刷新。

2. **专属 GraphQL 请求层**  
   - ✅ `BugService` 抽象为纯 Promise API，并集中处理 GraphQL → `BugError` 的映射。  
   - 提炼 Query Helpers，为复杂查询（统计、仪表盘）定义明确的调用入口。

3. **细腻的错误体验**  
   - 在组件层捕获 `BugError`，交由通知中心讲述友好文案。  
   - 对网络抖动场景增加退避重试与离线提示，呼应“错误处理如为人处世的哲学”。

## 阶段三：界面与交互的轻盈化（规划中）

- 选择 Material 3 + Tailwind 的混合策略（参考工具链对比指南），将重复的表单与 Badge 样式抽象为共享指令或小组件。
- 引入受控的主题系统，确保暗色模式、品牌色定制与可访问性指标协同。
- 重新设计通知、加载与空状态组件，让每一次反馈都成为故事的一部分。

## 阶段四：性能、观测与可维护性（规划中）

- 借助浏览器性能指标构建轻量监控面板，对列表查询、图表渲染等关键路径进行量化，以“性能即艺术”为尺。  
- 使用 ESLint + Angular ESLint Signals 规则，约束未来代码继续沿着简约之路前行。  
- 结合 Turbo 构建缓存与细粒度模块拆分，降低 CI 构建耗时。

---

沿着这条路径，我们将把 Bugger Web 打磨成既优雅又高效的前端作品：数据层透明、交互自然、性能稳健。每一次重构迭代，都是向数字时代文化遗产迈出的新一步。

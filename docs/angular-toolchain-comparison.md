# Angular 技术选型对比指南

> 帮助团队快速做出最优技术决策

---

## UI 组件库对比

### 核心指标对比表

| 指标 | Angular Material | PrimeNG | NG-ZORRO | Flowbite Angular |
|------|-----------------|---------|----------|------------------|
| **组件数量** | ~40 | 90+ | 60+ | 20+ |
| **包体积** | ~150KB | ~300KB | ~250KB | ~50KB |
| **设计风格** | Material 3 | 自定义主题 | Ant Design | Tailwind |
| **主题定制** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **文档质量** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **社区活跃度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **企业级支持** | 官方 | 商业版 | 社区 | 社区 |
| **学习曲线** | 低 | 中 | 中 | 低 |
| **TypeScript** | ✅ 完整 | ✅ 完整 | ✅ 完整 | ✅ 完整 |
| **Tree-shaking** | ✅ | ✅ | ✅ | ✅ |
| **Signals 支持** | ✅ 原生 | ⚠️ 部分 | ⚠️ 部分 | ✅ 原生 |

---

### 详细对比

#### Angular Material

**优势**：
- ✅ 官方维护，与 Angular 版本同步更新
- ✅ Material 3 设计系统，现代化美观
- ✅ 完整的 CDK（Component Dev Kit）底层库
- ✅ 最佳的 Signals 集成
- ✅ 无缝的 Accessibility（无障碍）支持

**劣势**：
- ❌ 组件数量相对较少
- ❌ 数据表格功能较弱（需要自己实现）
- ❌ 设计风格固定（Material Design）

**最佳使用场景**：
- 现代化 SaaS 产品
- 面向消费者的 Web 应用
- 注重设计一致性的项目
- 需要与 Google 生态集成

**示例项目**：Gmail、Google Drive、YouTube Studio

---

#### PrimeNG

**优势**：
- ✅ 组件最全面（90+ 组件）
- ✅ 专业的数据表格（排序、过滤、分页、虚拟滚动）
- ✅ 丰富的图表组件（基于 Chart.js）
- ✅ 内置主题设计器（PrimeNG Designer）
- ✅ 商业支持可选（PrimeNG Pro）

**劣势**：
- ❌ 包体积较大
- ❌ 默认主题较老旧（需要定制）
- ❌ Signals 支持不完整

**最佳使用场景**：
- 企业管理后台
- 数据密集型应用（BI、报表）
- 需要快速开发的项目
- 复杂的业务表单

**示例项目**：ERP 系统、CRM 系统、数据可视化平台

---

#### NG-ZORRO

**优势**：
- ✅ Ant Design 设计语言（阿里巴巴）
- ✅ 适合亚洲市场审美
- ✅ 信息密集型界面设计优秀
- ✅ 优秀的国际化（i18n）支持
- ✅ 完整的 TypeScript 类型定义

**劣势**：
- ❌ 社区主要在中国（英文文档相对薄弱）
- ❌ 相比 React 版本功能略滞后
- ❌ 某些组件 API 与 Angular 习惯不一致

**最佳使用场景**：
- B2B 企业应用
- 后台管理系统
- 中国市场项目
- 金融、电商行业

**示例项目**：阿里云控制台、蚂蚁金服内部系统

---

#### Flowbite Angular

**优势**：
- ✅ 完全基于 Tailwind CSS
- ✅ 包体积最小
- ✅ 高度可定制
- ✅ 原生 Signals 支持

**劣势**：
- ❌ 组件数量较少
- ❌ 生态较新，社区较小
- ❌ 复杂组件需要自己实现

**最佳使用场景**：
- 已使用 Tailwind CSS 的项目
- 需要完全自定义 UI 的应用
- 注重性能和包体积
- 现代化设计风格

---

### 选型决策树

```
是否已确定设计系统？
├─ Material Design → Angular Material
├─ Ant Design → NG-ZORRO
├─ Tailwind → Flowbite Angular
└─ 自定义 → PrimeNG（主题定制）

是否数据密集型应用？
├─ 是 → PrimeNG（最强数据表格）
└─ 否 → 根据设计风格选择

是否需要快速开发？
├─ 是 → PrimeNG（组件最全）
└─ 否 → Angular Material（最佳实践）

包体积是否敏感？
├─ 是 → Angular Material / Flowbite
└─ 否 → PrimeNG

是否面向亚洲市场？
├─ 是 → NG-ZORRO
└─ 否 → Angular Material
```

---

## 数据获取库对比

### TanStack Query vs Apollo Client

| 特性 | TanStack Query | Apollo Client |
|------|----------------|---------------|
| **协议支持** | REST/GraphQL/任意 | 仅 GraphQL |
| **包体积** | 13KB | 40KB+ |
| **缓存策略** | 查询键扁平缓存 | 规范化图缓存 |
| **学习曲线** | 低 | 中高 |
| **Signals 集成** | ✅ 原生 | ⚠️ 通过适配器 |
| **订阅支持** | ⚠️ 需要额外实现 | ✅ 原生 WebSocket |
| **DevTools** | ✅ 优秀 | ✅ 优秀 |
| **后台重新获取** | ✅ 自动 | ⚠️ 需要配置 |
| **乐观更新** | ✅ | ✅ |
| **社区支持** | React 社区强大 | GraphQL 社区强大 |

---

### 详细对比

#### TanStack Query

**核心优势**：
```typescript
// 极简 API
const query = injectQuery(() => ({
  queryKey: ['users'],
  queryFn: fetchUsers
}));

// 自动类型推导
const data = query.data(); // 类型安全
```

**适用场景**：
- ✅ REST API 为主的应用
- ✅ 需要灵活切换数据源
- ✅ 注重开发体验和性能
- ✅ 团队不熟悉 GraphQL

**社区反馈**：
> "从 Apollo 迁移到 TanStack Query 后，样板代码减少了 60%，包体积减少了 30KB"

---

#### Apollo Client

**核心优势**：
```typescript
// 规范化缓存自动同步
this.apollo.query({
  query: GET_USER
});

// 更新一处，所有引用自动更新
this.apollo.mutate({
  mutation: UPDATE_USER,
  update: (cache, { data }) => {
    // 自动更新缓存中的所有 User 引用
  }
});
```

**适用场景**：
- ✅ GraphQL 为核心架构
- ✅ 需要实时订阅（WebSocket）
- ✅ 复杂的实体关系图
- ✅ 团队已投入 GraphQL 生态

**企业采用**：
- Airbnb
- The New York Times
- Twitch
- PayPal

---

### 选型建议

```
是否使用 GraphQL？
├─ 否 → TanStack Query
└─ 是 ↓

是否需要实时订阅？
├─ 是 → Apollo Client
└─ 否 ↓

实体关系是否复杂？
├─ 是 → Apollo Client（规范化缓存）
└─ 否 → TanStack Query（更简单）

团队是否熟悉 GraphQL？
├─ 否 → TanStack Query（学习曲线低）
└─ 是 → 两者都可
```

---

## 状态管理对比

### 方案对比表

| 方案 | 适用规模 | 学习曲线 | 样板代码 | DevTools | Signals |
|------|---------|---------|---------|---------|---------|
| **signal() + computed()** | 小型 | 极低 | 无 | ❌ | ✅ 原生 |
| **Signal Store** | 中型 | 低 | 少 | ⚠️ | ✅ 原生 |
| **NGXS** | 中大型 | 中 | 少 | ✅ | ⚠️ 适配 |
| **NgRx** | 大型 | 高 | 多 | ✅ | ⚠️ 适配 |
| **Akita** | 中大型 | 中 | 中 | ✅ | ❌ |

---

### 详细对比

#### signal() + computed()（内置）

**示例**：
```typescript
@Injectable({ providedIn: 'root' })
export class CounterStore {
  private count = signal(0);

  readonly value = this.count.asReadonly();
  readonly doubled = computed(() => this.count() * 2);

  increment() {
    this.count.update(v => v + 1);
  }
}
```

**适用场景**：
- 单一组件状态
- 简单的全局状态（< 5 个字段）
- 原型项目

**优势**：
- ✅ 零依赖
- ✅ 性能最优
- ✅ 类型推导完美

**劣势**：
- ❌ 无 DevTools
- ❌ 缺乏结构化
- ❌ 难以扩展

---

#### Signal Store（@ngrx/signals）

**示例**：
```typescript
export const UserStore = signalStore(
  { providedIn: 'root' },
  withState({ users: [], loading: false }),
  withComputed(({ users }) => ({
    count: computed(() => users().length)
  })),
  withMethods((store) => ({
    async load() {
      patchState(store, { loading: true });
      const users = await fetchUsers();
      patchState(store, { users, loading: false });
    }
  }))
);
```

**适用场景**：
- 功能模块状态（Feature State）
- 中小型应用（< 20 个 store）
- 团队希望拥抱 Signals

**优势**：
- ✅ 官方推荐（NgRx 团队）
- ✅ 原生 Signals
- ✅ 灵活的组合式 API
- ✅ 类型安全

**劣势**：
- ⚠️ 生态较新（2024 发布）
- ⚠️ DevTools 支持有限

---

#### NGXS

**示例**：
```typescript
@State<UserStateModel>({
  name: 'users',
  defaults: { users: [], loading: false }
})
@Injectable()
export class UserState {
  @Action(LoadUsers)
  async loadUsers(ctx: StateContext<UserStateModel>) {
    ctx.patchState({ loading: true });
    const users = await this.api.getUsers();
    ctx.patchState({ users, loading: false });
  }

  @Selector()
  static users(state: UserStateModel) {
    return state.users;
  }
}
```

**适用场景**：
- 快速开发的中大型项目
- 团队不喜欢 Redux 样板代码
- 需要完整的 DevTools

**优势**：
- ✅ 样板代码少（相比 NgRx）
- ✅ 装饰器语法直观
- ✅ 完整的 DevTools
- ✅ 插件生态丰富

**劣势**：
- ⚠️ Signals 集成不完善
- ⚠️ 社区小于 NgRx

---

#### NgRx

**示例**：
```typescript
// Actions
export const loadUsers = createAction('[User] Load Users');
export const loadUsersSuccess = createAction(
  '[User] Load Users Success',
  props<{ users: User[] }>()
);

// Reducer
export const userReducer = createReducer(
  initialState,
  on(loadUsers, state => ({ ...state, loading: true })),
  on(loadUsersSuccess, (state, { users }) => ({
    ...state,
    users,
    loading: false
  }))
);

// Effects
@Injectable()
export class UserEffects {
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsers),
      switchMap(() => this.api.getUsers().pipe(
        map(users => loadUsersSuccess({ users }))
      ))
    )
  );
}

// Selector
export const selectUsers = createSelector(
  selectUserState,
  state => state.users
);
```

**适用场景**：
- 大型企业应用（> 50 个 store）
- 多团队协作
- 需要严格的架构约束
- 复杂的状态依赖

**优势**：
- ✅ 最成熟的解决方案
- ✅ 完整的 DevTools（时间旅行）
- ✅ 严格的单向数据流
- ✅ 丰富的生态（Entity、Router、Effects）

**劣势**：
- ❌ 样板代码最多
- ❌ 学习曲线陡峭
- ⚠️ Signals 集成需要适配器

**企业采用**：
- Microsoft
- VMware
- SAP

---

### 状态管理选型决策

```
应用规模
├─ 小型（< 10 组件）→ signal() + computed()
├─ 中型（10-50 组件）→ Signal Store
└─ 大型（> 50 组件）→ NgRx / NGXS

团队偏好
├─ 喜欢 Redux 模式 → NgRx
├─ 喜欢简洁语法 → NGXS
└─ 拥抱新特性 → Signal Store

是否需要时间旅行调试？
├─ 是 → NgRx
└─ 否 → Signal Store / NGXS

是否多团队协作？
├─ 是 → NgRx（架构约束强）
└─ 否 → 灵活选择
```

---

## 测试框架对比

### 单元测试

| 框架 | 速度 | 配置复杂度 | 现代化 | Angular 支持 |
|------|------|-----------|--------|-------------|
| **Vitest** | ⚡ 最快 | 低 | ✅ 最新 | ✅ 需插件 |
| **Jest** | 快 | 中 | ✅ | ✅ |
| **Jasmine + Karma** | 慢 | 高 | ❌ | ✅ 默认 |

**推荐**：Vitest（新项目） / Jest（迁移成本低）

---

### E2E 测试

| 框架 | 速度 | 调试体验 | 跨浏览器 | 稳定性 |
|------|------|---------|---------|--------|
| **Playwright** | ⚡ 最快 | ⭐⭐⭐⭐⭐ | ✅ 完整 | ⭐⭐⭐⭐⭐ |
| **Cypress** | 快 | ⭐⭐⭐⭐ | ⚠️ 部分 | ⭐⭐⭐⭐ |
| **Protractor** | 慢 | ⭐⭐ | ❌ | ⭐⭐ (已弃用) |

**推荐**：Playwright（2025 官方推荐）

---

## 日期库对比

| 库 | 体积 | Tree-shakable | 不可变 | i18n |
|------|------|--------------|--------|------|
| **date-fns** | ~13KB | ✅ | ✅ | ✅ 90+ 语言 |
| **dayjs** | 2KB | ✅ | ✅ | ✅ 插件 |
| **moment.js** | 67KB | ❌ | ❌ | ✅ |
| **Luxon** | ~20KB | ⚠️ | ✅ | ✅ |

**推荐**：date-fns（功能全面） / dayjs（极小体积）

---

## Monorepo 工具对比

| 特性 | Nx | Turborepo | Lerna |
|------|----|-----------|----|
| **智能缓存** | ✅ 本地+云 | ✅ 本地+云 | ❌ |
| **任务编排** | ✅ 强大 | ✅ | ⚠️ 基础 |
| **代码生成** | ✅ Schematics | ❌ | ❌ |
| **依赖图** | ✅ 可视化 | ⚠️ CLI | ❌ |
| **Angular 支持** | ✅ 原生 | ⚠️ 通用 | ⚠️ 通用 |
| **学习曲线** | 中 | 低 | 低 |

**推荐**：Nx（Angular 项目首选）

---

## 最终推荐技术栈

### 现代 SaaS 应用
```
UI: Angular Material + Tailwind
数据: TanStack Query
状态: Signal Store
表单: Formly + Zod
测试: Vitest + Playwright
构建: Nx + Vite
```

---

### 企业管理后台
```
UI: PrimeNG 或 NG-ZORRO
数据: TanStack Query 或 Apollo Client
状态: NgRx 或 NGXS
表单: Formly + class-validator
测试: Jest + Playwright
构建: Nx
```

---

### 快速原型开发
```
UI: Angular Material
数据: TanStack Query
状态: signal() + computed()
表单: Reactive Forms
测试: Jasmine + Karma（默认）
构建: Angular CLI
```

---

**最后更新**：2025年10月
**维护者**：Pro Team

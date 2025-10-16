# Akita 到 @ngrx/signals Signal Store 迁移方案

> **代码艺术家的哲学**: 每一次重构都是一次升华，从 Akita 到 Signal Store 不是简单的替换，而是拥抱 Angular 新时代响应式原语的艺术转型。

## 📋 目录

- [迁移动机](#迁移动机)
- [架构对比分析](#架构对比分析)
- [迁移策略](#迁移策略)
- [详细迁移步骤](#详细迁移步骤)
- [代码示例](#代码示例)
- [测试策略](#测试策略)
- [注意事项](#注意事项)

---

## 迁移动机

### 为什么迁移？

**存在即合理 (Existence Implies Necessity)** - 迁移的每个理由都不可或缺：

1. **原生 Angular Signals 集成**
   - Signal Store 基于 Angular 16+ 的原生 Signals
   - 自动的变更检测优化，无需手动管理订阅
   - 更小的 bundle size，更好的 tree-shaking

2. **更优雅的 API 设计**
   - 函数式组合，告别类继承的繁琐
   - 声明式状态定义，代码即文档
   - TypeScript 类型推断更完善，减少手动类型标注

3. **现代化响应式模式**
   - Signals 的细粒度响应式更新
   - Computed values 自动追踪依赖
   - Effect 与 Angular 生命周期完美整合

4. **社区趋势与长期维护**
   - Akita 维护逐渐减少，Signal Store 是 Angular 官方推荐方向
   - NgRx 团队的持续支持和生态系统

---

## 架构对比分析

### Akita 架构模式

```
┌─────────────────────────────────────────────────┐
│              Component (组件层)                  │
│  - 注入 Query 获取状态流                          │
│  - 注入 Service 执行业务逻辑                      │
│  - 手动订阅 Observable                           │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼──────────────┬────────────────────┐
│   Query (查询层)            │  Service (服务层)   │
│  - 继承 Query/QueryEntity  │  - 注入 Store       │
│  - 定义 Observables        │  - 业务逻辑         │
│  - 派生查询 (computed)     │  - HTTP 调用        │
│  - 同步 getter             │  - 状态更新         │
└─────────────┬──────────────┴────────┬───────────┘
              │                        │
              │    ┌───────────────────▼────────┐
              └────►   Store (存储层)            │
                   │  - 继承 Store/EntityStore  │
                   │  - 定义初始状态             │
                   │  - 状态更新方法             │
                   └────────────────────────────┘
```

**Akita 的特点**：
- 三层分离：Store → Query → Service
- 基于 RxJS Observable
- 类继承模式
- 需要手动管理订阅生命周期

### Signal Store 架构模式

```
┌─────────────────────────────────────────────────┐
│              Component (组件层)                  │
│  - 注入 Store 实例                               │
│  - 直接访问 signals (自动订阅)                   │
│  - 调用 methods 执行业务逻辑                     │
│  - 无需手动订阅和清理                            │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│          Signal Store (统一状态层)               │
│  ┌───────────────────────────────────────────┐  │
│  │  withState()      - 状态定义              │  │
│  │  withComputed()   - 派生状态 (自动追踪)  │  │
│  │  withMethods()    - 业务逻辑 + 状态更新  │  │
│  │  withHooks()      - 生命周期              │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Signal Store 的优势**：
- 单一职责：一个 Store 统一管理状态和逻辑
- 基于原生 Signals，自动响应式
- 函数式组合模式
- 自动管理订阅，无需 takeUntil/unsubscribe

---

## 迁移策略

### 渐进式迁移原则

**优雅即简约 (Elegance is Simplicity)** - 采用增量、可控的迁移路径：

1. **按特性模块迁移**
   - 不是一次性替换所有状态管理
   - 从独立性强的模块开始（如 Tags, MediaTypes）
   - 核心模块（Auth, Events）最后迁移

2. **新旧并存期**
   - Akita 和 Signal Store 可以共存
   - 使用 Adapter 模式桥接（如有必要）
   - 确保迁移过程中系统稳定运行

3. **迁移优先级**
   ```
   Priority 1 (Low Risk): Tags, MediaTypes, EventTypes, IndustryTypes
   Priority 2 (Medium Risk): Screens, WeiboSearchTasks
   Priority 3 (High Risk): Events, Auth
   Priority 4 (Complex): Canvas (Feature-level state)
   ```

4. **测试覆盖优先**
   - 迁移前：为现有 Akita 代码添加测试
   - 迁移后：确保测试通过
   - 回归测试：验证业务逻辑不变

---

## 详细迁移步骤

### Phase 1: 准备工作

#### 1.1 安装依赖

```bash
# 安装 @ngrx/signals
pnpm add @ngrx/signals@latest --filter @pro/admin

# 验证 Angular 版本 (需要 >= 16.0.0)
# 当前项目应该已经满足
```

#### 1.2 创建迁移工具函数

```typescript
// apps/admin/src/app/core/utils/signal-store-helpers.ts

import { computed, Signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * 将 Observable 转换为 Signal（用于迁移过渡期）
 * 注意：这是临时工具，最终应移除所有 Observable
 */
export function toSignalFromObservable<T>(
  observable: Observable<T>,
  initialValue: T,
  destroy$: Subject<void>
): Signal<T> {
  let value = initialValue;
  observable.pipe(takeUntil(destroy$)).subscribe(v => value = v);
  return computed(() => value);
}
```

---

### Phase 2: 模式转换

#### 2.1 简单状态迁移模式

**Akita 模式** (3 个文件):

```typescript
// auth.store.ts
export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'auth' })
export class AuthStore extends Store<AuthState> {
  constructor() {
    super({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null
    });
  }
}

// auth.query.ts
@Injectable({ providedIn: 'root' })
export class AuthQuery extends Query<AuthState> {
  currentUser$ = this.select(state => state.user);
  isAuthenticated$ = this.select(state => state.isAuthenticated);
  loading$ = this.select(state => state.loading);
  error$ = this.select(state => state.error);

  constructor(protected override store: AuthStore) {
    super(store);
  }

  get currentUser(): UserProfile | null {
    return this.getValue().user;
  }
}

// auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private store = inject(AuthStore);
  private query = inject(AuthQuery);

  login(dto: LoginDto): Observable<AuthResponse> {
    this.store.update({ loading: true, error: null });
    return this.api.login(dto).pipe(
      tap(response => {
        this.store.update({
          user: response.user,
          isAuthenticated: true,
          loading: false
        });
      }),
      catchError(error => {
        this.store.update({ error: error.message, loading: false });
        return throwError(() => error);
      })
    );
  }
}
```

**Signal Store 模式** (1 个文件):

```typescript
// auth.store.ts
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

export const AuthStore = signalStore(
  { providedIn: 'root' },

  // 状态定义
  withState(initialState),

  // 派生状态 (Computed)
  withComputed(({ user, isAuthenticated }) => ({
    // 自动类型推断，无需手动标注
    userDisplayName: computed(() => {
      const u = user();
      return u ? u.userId : 'Guest';
    }),

    // 可以组合多个 signals
    isReady: computed(() => !isAuthenticated() || user() !== null)
  })),

  // 业务逻辑 (Methods)
  withMethods((store) => {
    const gateway = inject(GraphqlGateway);
    const tokenStorage = inject(TokenStorageService);
    const router = inject(Router);

    return {
      // rxMethod: 处理 Observable 流
      login: rxMethod<LoginDto>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap((dto) =>
            gateway.request(LoginDocument, { input: dto }).pipe(
              tap((result) => {
                const response = toAuthResponse(result.login);
                tokenStorage.setToken(response.accessToken);
                tokenStorage.setRefreshToken(response.refreshToken);

                patchState(store, {
                  user: convertUserToProfile(response.user),
                  isAuthenticated: true,
                  loading: false,
                  error: null
                });

                router.navigate(['/']);
              }),
              catchError((error) => {
                patchState(store, {
                  loading: false,
                  error: error.message
                });
                return of(null);
              })
            )
          )
        )
      ),

      // 同步方法
      logout(): void {
        tokenStorage.clearTokens();
        patchState(store, initialState);
        router.navigate(['/login']);
      },

      // 私有辅助方法
      _clearError(): void {
        patchState(store, { error: null });
      }
    };
  })
);

// 辅助函数 (纯函数，与 Store 解耦)
function toAuthResponse(gqlResponse: any): AuthResponse {
  return {
    accessToken: gqlResponse.accessToken,
    refreshToken: gqlResponse.refreshToken,
    user: toDomainUser(gqlResponse.user)
  };
}

function convertUserToProfile(user: User): UserProfile {
  return { userId: user.id };
}
```

**迁移要点**：
- **3 合 1**: Store + Query + Service → 单个 Signal Store
- **Observable → Signal**: `currentUser$` → `store.user()`
- **select → computed**: 派生逻辑移到 `withComputed`
- **update → patchState**: `store.update()` → `patchState(store, ...)`
- **副作用处理**: 使用 `rxMethod` 处理异步流

---

#### 2.2 Entity 状态迁移模式

**Akita EntityStore 模式**:

```typescript
// events.store.ts
export interface EventsState extends EntityState<Event> {
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'events' })
export class EventsStore extends EntityStore<EventsState> {
  constructor() {
    super({
      loading: false,
      error: null,
      total: 0,
      page: 1,
      limit: 20
    });
  }
}

// events.query.ts
@Injectable({ providedIn: 'root' })
export class EventsQuery extends QueryEntity<EventsState> {
  events$ = this.selectAll();
  loading$ = this.select(state => state.loading);

  get events(): Event[] {
    return this.getAll();
  }
}

// events.service.ts
loadEvents(params: EventQueryParams): Observable<void> {
  this.store.update({ loading: true, error: null });

  return this.gateway.request(...).pipe(
    tap(result => {
      this.store.set(result.data);
      this.store.update({ total: result.total, loading: false });
    })
  );
}

createEvent(dto: CreateEventDto): Observable<Event> {
  return this.gateway.request(...).pipe(
    tap(event => this.store.add(event))
  );
}

updateEvent(id: string, dto: UpdateEventDto): Observable<Event> {
  return this.gateway.request(...).pipe(
    tap(event => this.store.update(id, event))
  );
}

deleteEvent(id: string): Observable<void> {
  return this.gateway.request(...).pipe(
    tap(() => this.store.remove(id))
  );
}
```

**Signal Store Entity 模式**:

```typescript
// events.store.ts
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { withEntities, addEntity, updateEntity, removeEntity, setAllEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

interface EventsState {
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

const initialState: EventsState = {
  loading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20
};

export const EventsStore = signalStore(
  { providedIn: 'root' },

  // Entity 状态 + 自定义状态
  withEntities<Event>(),
  withState(initialState),

  // 派生状态
  withComputed(({ entities, total }) => ({
    // entities() 返回 Entity 字典对象
    eventsList: computed(() => Object.values(entities())),

    // 分页相关计算
    hasMore: computed(() => Object.keys(entities()).length < total()),

    // 过滤查询
    publishedEvents: computed(() =>
      Object.values(entities()).filter(e => e.status === EventStatus.PUBLISHED)
    )
  })),

  // 业务逻辑
  withMethods((store) => {
    const gateway = inject(GraphqlGateway);

    return {
      loadEvents: rxMethod<EventQueryParams>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap((params) =>
            gateway.request(EventsDocument, { filter: params }).pipe(
              tap((result) => {
                const events = result.events.edges.map(e => toDomainEvent(e.node));

                patchState(
                  store,
                  setAllEntities(events),
                  {
                    total: result.events.totalCount,
                    page: params.page || 1,
                    loading: false
                  }
                );
              }),
              catchError((error) => {
                patchState(store, { loading: false, error: error.message });
                return of(null);
              })
            )
          )
        )
      ),

      createEvent: rxMethod<CreateEventDto>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          switchMap((dto) =>
            gateway.request(CreateEventDocument, { input: dto }).pipe(
              tap((result) => {
                const event = toSimpleEvent(result.createEvent);
                patchState(
                  store,
                  addEntity(event),
                  { loading: false }
                );
              }),
              catchError((error) => {
                patchState(store, { loading: false, error: error.message });
                return of(null);
              })
            )
          )
        )
      ),

      updateEvent: rxMethod<{ id: string; dto: UpdateEventDto }>(
        pipe(
          switchMap(({ id, dto }) =>
            gateway.request(UpdateEventDocument, { id, input: dto }).pipe(
              tap((result) => {
                const event = toSimpleEvent(result.updateEvent);
                patchState(store, updateEntity({ id, changes: event }));
              })
            )
          )
        )
      ),

      deleteEvent: rxMethod<string>(
        pipe(
          switchMap((id) =>
            gateway.request(RemoveEventDocument, { id }).pipe(
              tap(() => patchState(store, removeEntity(id)))
            )
          )
        )
      ),

      // 业务方法
      publishEvent: rxMethod<string>(
        pipe(
          switchMap((id) =>
            gateway.request(PublishEventDocument, { id }).pipe(
              tap((result) => {
                patchState(
                  store,
                  updateEntity({
                    id,
                    changes: { status: toDomainEventStatus(result.publishEvent.status) }
                  })
                );
              })
            )
          )
        )
      )
    };
  })
);
```

**Entity 迁移要点**：
- **withEntities**: 替代 `EntityState`，提供 `entities()` signal
- **Entity 操作函数**:
  - `store.set()` → `setAllEntities()`
  - `store.add()` → `addEntity()`
  - `store.update(id, changes)` → `updateEntity({ id, changes })`
  - `store.remove(id)` → `removeEntity(id)`
- **访问实体**:
  - `query.getAll()` → `Object.values(store.entities())`
  - `query.getEntity(id)` → `store.entities()[id]`

---

#### 2.3 复杂状态迁移（Canvas Store）

**Akita 模式** (Canvas 编辑器):

```typescript
// canvas.store.ts
export interface CanvasState {
  componentData: ComponentItem[];
  activeComponentId: string | null;
  selectedComponentIds: string[];
  scale: number;
  isDirty: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  // ... 更多状态
}

// canvas.query.ts - 复杂的派生查询
export class CanvasQuery extends Query<CanvasState> {
  activeComponent$ = this.select(state =>
    state.componentData.find(comp => comp.id === state.activeComponentId)
  );

  selectedComponents$ = this.select(state =>
    state.componentData.filter(comp => state.selectedComponentIds.includes(comp.id))
  );

  showSaveError$ = this.select([
    state => state.saveStatus,
    state => state.lastSaveError
  ]).pipe(
    map(([saveStatus, error]) => saveStatus === 'error' && error !== null)
  );

  canRetry$ = this.select([...]).pipe(/* 复杂逻辑 */);
}
```

**Signal Store 模式**:

```typescript
// canvas.store.ts
import { signalStore, withState, withComputed, withMethods, withHooks } from '@ngrx/signals';

interface CanvasState {
  name: string;
  thumbnail: string;
  editMode: EditMode;
  canvasStyle: CanvasStyle;
  componentData: ComponentItem[];
  activeComponentId: string | null;
  selectedComponentIds: string[];
  scale: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  darkTheme: boolean;
  showMarkLine: boolean;
  isDirty: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error' | 'retrying';
  lastSaveError: SaveError | null;
  retryCount: number;
  isOnline: boolean;
  networkStatus: 'online' | 'offline' | 'checking';
  isFullscreen: boolean;
  isShowCoordinates: boolean;
}

export const CanvasStore = signalStore(
  { providedIn: 'root' },

  withState<CanvasState>({
    name: '',
    thumbnail: '',
    editMode: 'edit',
    canvasStyle: {
      width: 1920,
      height: 1080,
      background: '#ffffff',
      className: '',
      dataAttrs: {},
      description: ''
    },
    componentData: [],
    activeComponentId: null,
    selectedComponentIds: [],
    scale: 1,
    showGrid: true,
    snapToGrid: false,
    gridSize: 10,
    darkTheme: false,
    showMarkLine: true,
    isDirty: false,
    saveStatus: 'saved',
    lastSaveError: null,
    retryCount: 0,
    isOnline: navigator.onLine,
    networkStatus: 'online',
    isFullscreen: false,
    isShowCoordinates: false
  }),

  // 复杂派生状态
  withComputed((state) => {
    const {
      componentData,
      activeComponentId,
      selectedComponentIds,
      saveStatus,
      lastSaveError,
      retryCount
    } = state;

    return {
      // 查找活动组件
      activeComponent: computed(() => {
        const id = activeComponentId();
        return componentData().find(comp => comp.id === id) ?? null;
      }),

      // 查找选中组件
      selectedComponents: computed(() => {
        const ids = selectedComponentIds();
        return componentData().filter(comp => ids.includes(comp.id));
      }),

      // 是否显示保存错误
      showSaveError: computed(() => {
        return saveStatus() === 'error' && lastSaveError() !== null;
      }),

      // 是否正在重试
      isRetrying: computed(() => saveStatus() === 'retrying'),

      // 是否可以重试
      canRetry: computed(() => {
        const status = saveStatus();
        const error = lastSaveError();
        const count = retryCount();

        if (status !== 'error' || !error || !error.retryable) {
          return false;
        }
        return count < 3;
      }),

      // 用户友好的错误消息
      userFriendlyErrorMessage: computed(() => {
        const error = lastSaveError();
        const count = retryCount();

        if (!error) return '';

        let message = error.message;
        if (count > 0) {
          message += ` (已重试 ${count} 次)`;
        }

        if (error.retryable && count < 3) {
          message += ' 系统将自动重试。';
        } else if (!error.retryable) {
          message += ' 请重新登录后再试。';
        } else {
          message += ' 请手动重试或检查网络。';
        }

        return message;
      })
    };
  }),

  // 业务方法
  withMethods((store) => ({
    // 组件操作
    addComponent(component: ComponentItem): void {
      patchState(store, {
        componentData: [...store.componentData(), component],
        isDirty: true
      });
    },

    updateComponent(id: string, changes: Partial<ComponentItem>): void {
      patchState(store, {
        componentData: store.componentData().map(comp =>
          comp.id === id ? { ...comp, ...changes } : comp
        ),
        isDirty: true
      });
    },

    removeComponent(id: string): void {
      patchState(store, {
        componentData: store.componentData().filter(comp => comp.id !== id),
        activeComponentId: store.activeComponentId() === id ? null : store.activeComponentId(),
        isDirty: true
      });
    },

    // 选择操作
    setActiveComponent(id: string | null): void {
      patchState(store, { activeComponentId: id });
    },

    setSelectedComponents(ids: string[]): void {
      patchState(store, { selectedComponentIds: ids });
    },

    // 画布操作
    setScale(scale: number): void {
      patchState(store, { scale: Math.max(0.1, Math.min(5, scale)) });
    },

    toggleGrid(): void {
      patchState(store, { showGrid: !store.showGrid() });
    },

    toggleSnapToGrid(): void {
      patchState(store, { snapToGrid: !store.snapToGrid() });
    },

    // 保存相关
    setSaveStatus(status: CanvasState['saveStatus']): void {
      patchState(store, { saveStatus: status });
    },

    setSaveError(error: SaveError | null): void {
      patchState(store, {
        lastSaveError: error,
        saveStatus: error ? 'error' : 'saved'
      });
    },

    incrementRetryCount(): void {
      patchState(store, { retryCount: store.retryCount() + 1 });
    },

    resetRetryCount(): void {
      patchState(store, { retryCount: 0 });
    },

    // 网络状态
    setNetworkStatus(isOnline: boolean): void {
      patchState(store, {
        isOnline,
        networkStatus: isOnline ? 'online' : 'offline'
      });
    }
  })),

  // 生命周期钩子
  withHooks({
    onInit(store) {
      // 监听网络状态
      const updateOnlineStatus = () => {
        patchState(store, {
          isOnline: navigator.onLine,
          networkStatus: navigator.onLine ? 'online' : 'offline'
        });
      };

      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);

      // 自动保存逻辑（如果需要）
      // effect(() => {
      //   if (store.isDirty() && store.saveStatus() === 'unsaved') {
      //     // 触发自动保存
      //   }
      // });
    },

    onDestroy() {
      // 清理事件监听器
      window.removeEventListener('online', () => {});
      window.removeEventListener('offline', () => {});
    }
  })
);
```

**复杂状态迁移要点**：
- **withHooks**: 生命周期管理，替代构造函数和 ngOnDestroy
- **effect**: 副作用追踪（自动保存、网络状态监听等）
- **computed 组合**: 多个 signal 自动追踪依赖
- **不可变更新**: 使用扩展运算符更新数组和对象

---

### Phase 3: 组件迁移

#### 3.1 Akita 组件模式

```typescript
@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events-list.component.html'
})
export class EventsListComponent implements OnInit, OnDestroy {
  events: Event[] = [];
  loading = false;
  error: string | null = null;
  total = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private eventsService: EventsService,
    private eventsQuery: EventsQuery
  ) {}

  ngOnInit(): void {
    // 手动订阅多个 Observable
    this.eventsQuery.events$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(events => {
      this.events = events;
    });

    this.eventsQuery.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });

    this.eventsQuery.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.error = error;
    });

    this.eventsQuery.total$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(total => {
      this.total = total;
    });

    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvents(): void {
    this.eventsService.loadEvents(this.filterParams).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      error: (error) => console.error('加载失败:', error)
    });
  }

  deleteEvent(id: string): void {
    this.eventsService.deleteEvent(id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.toastService.success('删除成功'),
      error: (error) => this.toastService.error(`删除失败: ${error.message}`)
    });
  }
}
```

#### 3.2 Signal Store 组件模式

```typescript
@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events-list.component.html'
})
export class EventsListComponent implements OnInit {
  // 注入 Store 实例
  readonly eventsStore = inject(EventsStore);

  // 局部状态
  filterParams: EventQueryParams = {
    page: 1,
    pageSize: 20
  };

  // 无需 destroy$，无需 ngOnDestroy

  ngOnInit(): void {
    // 直接调用 store 方法，rxMethod 会自动处理订阅
    this.loadEvents();
  }

  loadEvents(): void {
    // rxMethod 接受参数，自动处理订阅生命周期
    this.eventsStore.loadEvents(this.filterParams);
  }

  deleteEvent(id: string): void {
    // 无需手动订阅，rxMethod 内部处理
    this.eventsStore.deleteEvent(id);
  }
}
```

#### 3.3 模板迁移

**Akita 模板**:

```html
<div class="events-list">
  <!-- 使用组件属性 -->
  <div *ngIf="loading" class="loading">加载中...</div>
  <div *ngIf="error" class="error">{{ error }}</div>

  <div class="events-grid">
    <div *ngFor="let event of events" class="event-card">
      <h3>{{ event.eventName }}</h3>
      <button (click)="deleteEvent(event.id)">删除</button>
    </div>
  </div>

  <div class="pagination">
    总计: {{ total }} 条
  </div>
</div>
```

**Signal Store 模板**:

```html
<div class="events-list">
  <!-- 使用 signal 函数调用 -->
  <div *ngIf="eventsStore.loading()" class="loading">加载中...</div>
  <div *ngIf="eventsStore.error()" class="error">{{ eventsStore.error() }}</div>

  <div class="events-grid">
    <!-- 使用 computed signal -->
    <div *ngFor="let event of eventsStore.eventsList()" class="event-card">
      <h3>{{ event.eventName }}</h3>
      <button (click)="deleteEvent(event.id)">删除</button>
    </div>
  </div>

  <div class="pagination">
    总计: {{ eventsStore.total() }} 条
  </div>
</div>
```

**组件迁移要点**：
- **移除订阅管理**: 无需 `destroy$`, `takeUntil`, `ngOnDestroy`
- **直接访问 signals**: `store.loading()` 代替 `this.loading`
- **自动变更检测**: Signal 变化自动触发 UI 更新
- **模板语法**: 所有 signal 访问都需要 `()`

---

## 代码示例

### 示例 1: 简单 CRUD Store (Tags)

#### Before (Akita - 3 files, ~100 lines)

```typescript
// tags.store.ts
@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'tags' })
export class TagsStore extends EntityStore<TagsState> {
  constructor() {
    super({ loading: false, error: null, total: 0 });
  }
}

// tags.query.ts
@Injectable({ providedIn: 'root' })
export class TagsQuery extends QueryEntity<TagsState> {
  tags$ = this.selectAll();
  loading$ = this.select('loading');
  // ...
}

// tags.service.ts
@Injectable({ providedIn: 'root' })
export class TagsService {
  loadTags(): Observable<void> {
    this.store.update({ loading: true });
    return this.api.getTags().pipe(
      tap(tags => this.store.set(tags))
    );
  }
}
```

#### After (Signal Store - 1 file, ~80 lines)

```typescript
// tags.store.ts
export const TagsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Tag>(),
  withState({ loading: false, error: null, total: 0 }),

  withComputed(({ entities }) => ({
    tagsList: computed(() => Object.values(entities())),
    tagsCount: computed(() => Object.keys(entities()).length)
  })),

  withMethods((store) => {
    const gateway = inject(GraphqlGateway);

    return {
      loadTags: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            gateway.request(TagsDocument).pipe(
              tap((result) => {
                patchState(
                  store,
                  setAllEntities(result.tags.edges.map(e => toTag(e.node))),
                  { loading: false, total: result.tags.totalCount }
                );
              })
            )
          )
        )
      ),

      createTag: rxMethod<CreateTagDto>(
        pipe(
          switchMap((dto) =>
            gateway.request(CreateTagDocument, { input: dto }).pipe(
              tap((result) => patchState(store, addEntity(toTag(result.createTag))))
            )
          )
        )
      )
    };
  })
);

// 组件使用
@Component({...})
export class TagsComponent {
  readonly tagsStore = inject(TagsStore);

  ngOnInit() {
    this.tagsStore.loadTags();
  }
}

// 模板使用
<div *ngFor="let tag of tagsStore.tagsList()">
  {{ tag.tagName }}
</div>
```

**收益**：
- **代码减少**: 3 个文件 → 1 个文件，100 行 → 80 行
- **类型安全**: 自动推断，减少手动类型标注
- **响应式**: 自动订阅，无需 takeUntil

---

### 示例 2: 认证 Store (Auth)

#### Before (Akita)

```typescript
// auth.store.ts (15 lines)
@StoreConfig({ name: 'auth' })
export class AuthStore extends Store<AuthState> {
  constructor() {
    super({ user: null, isAuthenticated: false, loading: false, error: null });
  }
}

// auth.query.ts (25 lines)
export class AuthQuery extends Query<AuthState> {
  currentUser$ = this.select('user');
  isAuthenticated$ = this.select('isAuthenticated');
  // ...
}

// auth.service.ts (200 lines)
export class AuthService {
  login(dto: LoginDto): Observable<AuthResponse> {
    this.store.update({ loading: true });
    // 复杂逻辑
  }
  // ...
}

// 组件使用
export class HeaderComponent implements OnDestroy {
  currentUser$: Observable<UserProfile | null>;
  private destroy$ = new Subject<void>();

  constructor(private authQuery: AuthQuery) {
    this.currentUser$ = this.authQuery.currentUser$;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// 模板
<div>{{ (currentUser$ | async)?.userId }}</div>
```

#### After (Signal Store)

```typescript
// auth.store.ts (150 lines，统一文件)
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  }),

  withComputed(({ user, isAuthenticated }) => ({
    userDisplayName: computed(() => user()?.userId ?? 'Guest'),
    isReady: computed(() => !isAuthenticated() || user() !== null)
  })),

  withMethods((store) => {
    const gateway = inject(GraphqlGateway);
    const tokenStorage = inject(TokenStorageService);
    const router = inject(Router);

    return {
      login: rxMethod<LoginDto>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap((dto) =>
            gateway.request(LoginDocument, { input: dto }).pipe(
              tap((result) => {
                const response = toAuthResponse(result.login);
                tokenStorage.setToken(response.accessToken);

                patchState(store, {
                  user: convertUserToProfile(response.user),
                  isAuthenticated: true,
                  loading: false
                });

                router.navigate(['/']);
              }),
              catchError((error) => {
                patchState(store, { loading: false, error: error.message });
                return of(null);
              })
            )
          )
        )
      ),

      logout(): void {
        tokenStorage.clearTokens();
        patchState(store, { user: null, isAuthenticated: false });
        router.navigate(['/login']);
      },

      restoreAuthSession: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          switchMap(() => {
            const token = tokenStorage.getToken();
            if (!token || isTokenExpired(token)) {
              return of(null);
            }

            return gateway.request(MeDocument).pipe(
              tap((result) => {
                patchState(store, {
                  user: convertUserToProfile(toDomainUser(result.me)),
                  isAuthenticated: true,
                  loading: false
                });
              }),
              catchError(() => {
                tokenStorage.clearTokens();
                patchState(store, { loading: false });
                return of(null);
              })
            );
          })
        )
      )
    };
  })
);

// 组件使用 - 大幅简化
export class HeaderComponent {
  readonly authStore = inject(AuthStore);
  // 无需 destroy$, 无需 ngOnDestroy
}

// 模板 - 更简洁
<div>{{ authStore.user()?.userId }}</div>
<div>{{ authStore.userDisplayName() }}</div>
```

**收益**：
- **订阅管理**: 无需 destroy$, takeUntil, async pipe
- **统一管理**: 状态 + 查询 + 业务逻辑在一个文件
- **类型推断**: computed 自动推断返回类型
- **更好的性能**: 细粒度响应式更新

---

### 示例 3: 复杂 Feature Store (Canvas Editor)

#### Before (Akita)

```typescript
// canvas.query.ts - 复杂的派生查询
export class CanvasQuery extends Query<CanvasState> {
  // 多个 Observable
  componentData$ = this.select('componentData');
  activeComponentId$ = this.select('activeComponentId');

  // 组合查询
  activeComponent$ = this.select(state =>
    state.componentData.find(c => c.id === state.activeComponentId)
  );

  selectedComponents$ = this.select(state =>
    state.componentData.filter(c => state.selectedComponentIds.includes(c.id))
  );

  // 复杂的派生逻辑
  showSaveError$ = this.select([
    state => state.saveStatus,
    state => state.lastSaveError
  ]).pipe(
    map(([status, error]) => status === 'error' && error !== null)
  );

  canRetry$ = this.select([...]).pipe(/* 复杂计算 */);

  // 同步 getter
  getComponentById(id: string): ComponentItem | undefined {
    return this.getValue().componentData.find(c => c.id === id);
  }
}

// canvas.service.ts
export class CanvasService {
  addComponent(component: ComponentItem): void {
    const current = this.query.getValue().componentData;
    this.store.update({ componentData: [...current, component] });
  }

  updateComponent(id: string, changes: Partial<ComponentItem>): void {
    const updated = this.query.getValue().componentData.map(c =>
      c.id === id ? { ...c, ...changes } : c
    );
    this.store.update({ componentData: updated });
  }
}

// 组件使用
export class CanvasEditorComponent implements OnDestroy {
  activeComponent$: Observable<ComponentItem | undefined>;
  showSaveError$: Observable<boolean>;
  private destroy$ = new Subject<void>();

  constructor(
    private canvasQuery: CanvasQuery,
    private canvasService: CanvasService
  ) {
    this.activeComponent$ = this.canvasQuery.activeComponent$;
    this.showSaveError$ = this.canvasQuery.showSaveError$;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onComponentUpdate(id: string, changes: any) {
    this.canvasService.updateComponent(id, changes);
  }
}

// 模板
<div *ngIf="activeComponent$ | async as component">
  {{ component.name }}
</div>
<div *ngIf="showSaveError$ | async">
  保存失败!
</div>
```

#### After (Signal Store)

```typescript
// canvas.store.ts - 统一管理
export const CanvasStore = signalStore(
  { providedIn: 'root' },

  withState<CanvasState>({ /* ... */ }),

  // 所有派生状态，自动追踪依赖
  withComputed((state) => {
    const { componentData, activeComponentId, selectedComponentIds } = state;

    return {
      // 简单查找
      activeComponent: computed(() => {
        const id = activeComponentId();
        return componentData().find(c => c.id === id) ?? null;
      }),

      // 过滤查询
      selectedComponents: computed(() => {
        const ids = selectedComponentIds();
        return componentData().filter(c => ids.includes(c.id));
      }),

      // 复杂组合
      showSaveError: computed(() => {
        return state.saveStatus() === 'error' && state.lastSaveError() !== null;
      }),

      canRetry: computed(() => {
        const status = state.saveStatus();
        const error = state.lastSaveError();
        const count = state.retryCount();

        if (status !== 'error' || !error || !error.retryable) {
          return false;
        }
        return count < 3;
      }),

      // 派生辅助方法 (通过 computed 实现)
      getComponentById: (id: string) => computed(() =>
        componentData().find(c => c.id === id)
      )
    };
  }),

  // 所有业务方法
  withMethods((store) => ({
    addComponent(component: ComponentItem): void {
      patchState(store, {
        componentData: [...store.componentData(), component],
        isDirty: true
      });
    },

    updateComponent(id: string, changes: Partial<ComponentItem>): void {
      patchState(store, {
        componentData: store.componentData().map(c =>
          c.id === id ? { ...c, ...changes } : c
        ),
        isDirty: true
      });
    },

    removeComponent(id: string): void {
      patchState(store, {
        componentData: store.componentData().filter(c => c.id !== id),
        activeComponentId: store.activeComponentId() === id
          ? null
          : store.activeComponentId()
      });
    },

    setActiveComponent(id: string | null): void {
      patchState(store, { activeComponentId: id });
    }
  })),

  // 生命周期钩子
  withHooks({
    onInit(store) {
      // 监听网络状态
      const handleOnline = () => {
        patchState(store, { isOnline: true, networkStatus: 'online' });
      };
      const handleOffline = () => {
        patchState(store, { isOnline: false, networkStatus: 'offline' });
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
  })
);

// 组件使用 - 极度简化
export class CanvasEditorComponent {
  readonly canvasStore = inject(CanvasStore);
  // 无需任何额外代码!

  onComponentUpdate(id: string, changes: any) {
    this.canvasStore.updateComponent(id, changes);
  }
}

// 模板 - 简洁直观
<div *ngIf="canvasStore.activeComponent() as component">
  {{ component.name }}
</div>
<div *ngIf="canvasStore.showSaveError()">
  保存失败!
</div>
<div *ngIf="canvasStore.canRetry()">
  <button (click)="retry()">重试</button>
</div>
```

**收益**：
- **代码集中**: Query + Service → 单一 Store
- **依赖追踪**: computed 自动追踪，无需手动 combineLatest
- **性能优化**: 细粒度更新，只有依赖变化才重新计算
- **生命周期**: withHooks 统一管理副作用

---

## 测试策略

### Akita 测试

```typescript
describe('EventsService', () => {
  let service: EventsService;
  let store: EventsStore;
  let query: EventsQuery;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventsService, EventsStore, EventsQuery]
    });

    service = TestBed.inject(EventsService);
    store = TestBed.inject(EventsStore);
    query = TestBed.inject(EventsQuery);
  });

  it('should load events', (done) => {
    service.loadEvents({ page: 1, pageSize: 20 }).subscribe(() => {
      query.events$.subscribe(events => {
        expect(events.length).toBeGreaterThan(0);
        done();
      });
    });
  });
});
```

### Signal Store 测试

```typescript
describe('EventsStore', () => {
  let store: InstanceType<typeof EventsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(EventsStore);
  });

  it('should load events', async () => {
    // 触发加载
    store.loadEvents({ page: 1, pageSize: 20 });

    // 等待异步完成
    await waitFor(() => !store.loading());

    // 直接断言 signal 值
    expect(store.eventsList().length).toBeGreaterThan(0);
    expect(store.total()).toBeGreaterThan(0);
  });

  it('should compute derived state', () => {
    // 测试 computed signals
    patchState(store, setAllEntities([
      { id: '1', status: EventStatus.PUBLISHED, /* ... */ },
      { id: '2', status: EventStatus.DRAFT, /* ... */ }
    ]));

    expect(store.publishedEvents().length).toBe(1);
    expect(store.eventsList().length).toBe(2);
  });

  it('should handle errors', async () => {
    // Mock 错误响应
    jest.spyOn(gateway, 'request').mockReturnValue(
      throwError(() => new Error('Network error'))
    );

    store.loadEvents({ page: 1 });

    await waitFor(() => !store.loading());

    expect(store.error()).toBe('加载事件列表失败');
  });
});

// 辅助函数
async function waitFor(predicate: () => boolean, timeout = 5000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
```

**测试收益**：
- **同步测试**: 直接访问 signal 值，无需订阅
- **更少样板代码**: 无需管理订阅清理
- **类型安全**: TypeScript 自动推断测试中的类型

---

## 注意事项

### 1. 性能考虑

**优雅即简约 (Elegance is Simplicity)**

- **Signal 读取开销**: 虽然轻量，但在紧密循环中频繁调用 signal 函数会有微小开销
  ```typescript
  // 避免
  for (let i = 0; i < 10000; i++) {
    const value = store.someSignal(); // 每次循环都调用
  }

  // 推荐
  const value = store.someSignal(); // 调用一次
  for (let i = 0; i < 10000; i++) {
    // 使用 value
  }
  ```

- **Computed 记忆化**: computed 会自动缓存结果，只在依赖变化时重新计算
  ```typescript
  withComputed((state) => ({
    // 这个计算很昂贵，但只在 componentData 变化时执行
    sortedComponents: computed(() =>
      [...state.componentData()].sort((a, b) => a.order - b.order)
    )
  }))
  ```

### 2. 迁移中的常见陷阱

- **忘记调用 signal 函数**:
  ```typescript
  // 错误
  if (store.loading) { /* ... */ }

  // 正确
  if (store.loading()) { /* ... */ }
  ```

- **在模板中过度计算**:
  ```typescript
  // 避免 (每次变更检测都计算)
  <div>{{ store.items().filter(i => i.active).length }}</div>

  // 推荐 (使用 computed)
  withComputed(({ items }) => ({
    activeItemsCount: computed(() => items().filter(i => i.active).length)
  }))

  <div>{{ store.activeItemsCount() }}</div>
  ```

- **rxMethod 的订阅管理**:
  ```typescript
  // rxMethod 不需要手动订阅
  // 错误
  this.store.loadEvents(params).subscribe(); // rxMethod 返回 void

  // 正确
  this.store.loadEvents(params); // 直接调用即可
  ```

### 3. 与 RxJS 的互操作

Signal Store 与 RxJS 完美共存：

```typescript
withMethods((store) => {
  const dataService = inject(DataService);

  return {
    // rxMethod 处理 Observable 流
    loadData: rxMethod<string>(
      pipe(
        debounceTime(300),
        switchMap((query) => dataService.search(query)),
        tap((results) => patchState(store, { results }))
      )
    ),

    // 也可以使用 toObservable 将 signal 转为 Observable
    setupAutoSave: () => {
      const isDirty$ = toObservable(store.isDirty);

      isDirty$
        .pipe(
          filter(dirty => dirty),
          debounceTime(2000),
          switchMap(() => dataService.save(store.data()))
        )
        .subscribe(() => {
          patchState(store, { isDirty: false });
        });
    }
  };
})
```

### 4. SSR 和 Hydration 考虑

- Signal Store 与 Angular SSR 完全兼容
- 确保在 `withHooks.onInit` 中初始化浏览器特定的逻辑

```typescript
withHooks({
  onInit(store) {
    // 检查是否在浏览器环境
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        patchState(store, { isOnline: true });
      });
    }
  }
})
```

### 5. DevTools 调试

- 使用 Redux DevTools Extension:
  ```typescript
  import { withDevtools } from '@angular-architects/ngrx-toolkit';

  export const EventsStore = signalStore(
    { providedIn: 'root' },
    withDevtools('events'), // 添加 DevTools 支持
    withState(initialState),
    // ...
  );
  ```

- 或者使用 Angular DevTools 的 Signal debugging

---

## 迁移时间表

### 阶段 1: 低风险模块 (1-2 周)
- Tags Store
- MediaTypes Store
- EventTypes Store
- IndustryTypes Store

### 阶段 2: 中等复杂度 (2-3 周)
- Screens Store
- WeiboSearchTasks Store

### 阶段 3: 核心模块 (3-4 周)
- Events Store
- Auth Store (最后迁移，依赖广泛)

### 阶段 4: Feature-level Stores (2 周)
- Canvas Store (复杂状态)
- DataSlotter Store

### 阶段 5: 清理和优化 (1 周)
- 移除 Akita 依赖
- 全面回归测试
- 性能优化
- 文档更新

**总计**: 9-12 周（可并行进行部分工作）

---

## 总结

**你写的不是代码，是数字时代的文化遗产，是艺术品 (You don't write code—you create cultural heritage for the digital age, you create art).**

从 Akita 到 Signal Store 的迁移不仅仅是技术栈的更新，更是代码艺术的升华：

1. **存在即合理**: 每个 Store 的结构都经过深思熟虑，每个 computed 都有其不可替代的价值
2. **优雅即简约**: 从 3 个文件合并为 1 个，从复杂的订阅管理到自动的响应式
3. **性能即艺术**: 细粒度的 Signal 更新机制，让性能优化成为天然属性
4. **代码即文档**: 函数式组合的 API，让代码结构本身就讲述了业务逻辑

这份迁移方案追求的不是简单的功能替换，而是通过 Signal Store 的优雅设计，让状态管理成为一件赏心悦目的艺术品。每一行代码都值得品味，每一个 computed 都是精心雕琢的杰作。

**愿你的重构之旅，如同艺术家的创作，既有理性的严谨，又有诗意的美感。**

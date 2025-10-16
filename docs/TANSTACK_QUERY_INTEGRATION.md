# GraphQL + TanStack Query 优雅集成方案

> 代码即艺术，每一行都诠释存在的必然性

## 一、技术架构分析

### 当前技术栈
- **Frontend Framework**: Angular 20 (Signals 架构)
- **GraphQL Client**: graphql-request v7.1.0
- **Code Generation**: GraphQL Code Generator (client preset)
- **State Management**: Akita (部分使用)
- **Query Library**: 待集成 @tanstack/angular-query-experimental v5.59

### 现有架构模式
```
GraphQL 定义 (*.graphql)
    ↓
GraphQL Code Generator (client preset)
    ↓
生成类型化 Documents + Types
    ↓
GraphqlGateway (手动封装)
    ↓
Service 层 (from(promise).pipe(...))
    ↓
组件使用 Observable
```

### 现有问题识别
1. **重复性劳动**: 每个 service 都重复实现 loading/error 状态管理
2. **缓存缺失**: 无数据缓存，相同请求重复发送
3. **状态割裂**: Akita Store 与请求状态分离管理
4. **样板代码**: finalize、catchError、tap 等 RxJS 操作符大量重复
5. **优化困难**: 缺少后台重取、窗口聚焦重取等现代化特性

---

## 二、TanStack Query 集成架构

### 核心设计原则

**存在即合理** - 只引入必要抽象，不过度设计
**优雅即简约** - API 应自解释，无需冗余文档
**性能即艺术** - 利用 TanStack Query 的缓存和优化能力
**错误处理如人生哲学** - 错误是改进信号，不是障碍

### 架构分层

```
┌─────────────────────────────────────────┐
│         组件层 (Component)               │
│   使用 injectQuery / injectMutation     │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      查询封装层 (Query Hooks)            │
│   类型安全的 injectEventsQuery 等        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│     GraphQL 客户端层 (GraphQL Client)    │
│   基于 graphql-request 的请求函数        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  GraphQL Code Generator (generated/)    │
│   TypedDocumentNode + TypeScript Types  │
└─────────────────────────────────────────┘
```

### 技术栈集成

```typescript
// 依赖关系链
@tanstack/angular-query-experimental (Query 管理)
    ↓
graphql-request (GraphQL 请求)
    ↓
@graphql-typed-document-node/core (类型安全)
    ↓
Generated Types (graphql.ts, gql.ts)
```

---

## 三、配置文件清单

### 3.1 依赖配置

#### apps/admin/package.json (已具备)
```json
{
  "dependencies": {
    "@angular/core": "^20.0.0",
    "graphql": "^16.11.0",
    "graphql-request": "^7.1.0"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^6.0.0",
    "@graphql-codegen/client-preset": "^5.0.3",
    "@graphql-typed-document-node/core": "^3.2.0"
  }
}
```

#### 需要添加的依赖
```bash
# 在 apps/admin 目录下执行
pnpm add @tanstack/angular-query-experimental@^5.59.0
pnpm add @tanstack/angular-query-devtools-experimental@^5.59.0 -D
```

### 3.2 GraphQL Code Generator 配置

#### apps/admin/codegen.ts (已配置，无需修改)
```typescript
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/apps/api/schema.graphql',
  documents: [
    'src/app/core/graphql/auth.graphql',
    'src/app/core/graphql/user.graphql',
    'src/app/core/graphql/event.graphql',
    // ... 其他 GraphQL 文档
    'src/app/**/*.ts' // 支持内联查询
  ],
  ignoreNoDocuments: false,
  generates: {
    'src/app/core/graphql/generated/': {
      preset: 'client', // ✓ 最佳选择：自动生成 TypedDocumentNode
      config: {
        scalars: {
          DateTime: 'string',
          JSONObject: 'Record<string, unknown>'
        }
      }
    }
  }
};

export default config;
```

**设计说明**:
- `preset: 'client'` 生成类型安全的 TypedDocumentNode，完美契合 TanStack Query
- 无需额外插件，保持配置简洁
- 自动生成的 `graphql.ts` 包含完整类型定义

---

## 四、核心代码实现

### 4.1 QueryClient 配置

#### apps/admin/src/app/app.config.ts
```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { QueryClient, provideAngularQuery } from '@tanstack/angular-query-experimental';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAngularQuery(
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 分钟内数据视为新鲜
            gcTime: 1000 * 60 * 30, // 30 分钟后清理缓存
            refetchOnWindowFocus: true, // 窗口聚焦时重取
            retry: (failureCount, error) => {
              // 优雅的重试策略
              if (error instanceof Error && error.message.includes('401')) {
                return false; // 认证错误不重试
              }
              return failureCount < 2; // 最多重试 2 次
            }
          },
          mutations: {
            retry: false // 变更操作不自动重试
          }
        }
      })
    )
  ]
};
```

**设计哲学**:
- **staleTime**: 避免过度请求，平衡实时性与性能
- **retry**: 错误即信号，智能判断而非盲目重试
- **refetchOnWindowFocus**: 用户回到应用时数据保持新鲜

### 4.2 GraphQL Client 封装

#### apps/admin/src/app/core/graphql/client.ts
```typescript
import { inject } from '@angular/core';
import { GraphQLClient } from 'graphql-request';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';

export function createGraphQLClient(): GraphQLClient {
  const tokenStorage = inject(TokenStorageService);

  return new GraphQLClient(resolveGraphQLEndpoint(), {
    headers: () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      const token = tokenStorage.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return headers;
    }
  });
}

export async function executeGraphQL<TResult, TVariables>(
  client: GraphQLClient,
  document: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables
): Promise<TResult> {
  return client.request(document, variables as any);
}

function resolveGraphQLEndpoint(): string {
  const explicitUrl = environment.graphqlUrl?.trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '');
  }

  const base = environment.apiUrl.replace(/\/+$/, '');

  if (base.endsWith('/graphql')) {
    return base;
  }

  if (base.endsWith('/api')) {
    return `${base.replace(/\/api$/, '')}/graphql`;
  }

  return `${base}/graphql`;
}
```

**设计说明**:
- `createGraphQLClient()` 使用 Angular DI 系统，自动注入 token
- `executeGraphQL()` 提供类型安全的执行接口
- endpoint 解析逻辑优雅，处理多种配置场景

### 4.3 查询封装模式

#### apps/admin/src/app/core/queries/events.query.ts
```typescript
import { inject } from '@angular/core';
import { injectQuery, injectMutation, queryOptions } from '@tanstack/angular-query-experimental';
import { createGraphQLClient, executeGraphQL } from '../graphql/client';
import {
  EventsDocument,
  EventsQuery,
  EventsQueryVariables,
  EventDocument,
  EventQuery,
  EventQueryVariables,
  CreateEventDocument,
  CreateEventMutation,
  CreateEventMutationVariables,
  UpdateEventDocument,
  UpdateEventMutation,
  UpdateEventMutationVariables,
  RemoveEventDocument,
  PublishEventDocument,
  ArchiveEventDocument
} from '../graphql/generated/graphql';

// ============= Query Options Factory =============

export function eventsQueryOptions(variables?: EventsQueryVariables) {
  const client = createGraphQLClient();

  return queryOptions({
    queryKey: ['events', variables] as const,
    queryFn: () => executeGraphQL(client, EventsDocument, variables)
  });
}

export function eventDetailQueryOptions(id: string) {
  const client = createGraphQLClient();

  return queryOptions({
    queryKey: ['event', id] as const,
    queryFn: () => executeGraphQL(client, EventDocument, { id })
  });
}

// ============= Query Hooks =============

export function injectEventsQuery(variables?: EventsQueryVariables) {
  return injectQuery(() => eventsQueryOptions(variables));
}

export function injectEventDetailQuery(id: string) {
  return injectQuery(() => eventDetailQueryOptions(id));
}

// ============= Mutation Hooks =============

export function injectCreateEventMutation() {
  const client = createGraphQLClient();

  return injectMutation(() => ({
    mutationFn: (variables: CreateEventMutationVariables) =>
      executeGraphQL(client, CreateEventDocument, variables)
  }));
}

export function injectUpdateEventMutation() {
  const client = createGraphQLClient();

  return injectMutation(() => ({
    mutationFn: (variables: UpdateEventMutationVariables) =>
      executeGraphQL(client, UpdateEventDocument, variables)
  }));
}

export function injectRemoveEventMutation() {
  const client = createGraphQLClient();

  return injectMutation(() => ({
    mutationFn: (variables: { id: string }) =>
      executeGraphQL(client, RemoveEventDocument, variables)
  }));
}

export function injectPublishEventMutation() {
  const client = createGraphQLClient();

  return injectMutation(() => ({
    mutationFn: (variables: { id: string }) =>
      executeGraphQL(client, PublishEventDocument, variables)
  }));
}

export function injectArchiveEventMutation() {
  const client = createGraphQLClient();

  return injectMutation(() => ({
    mutationFn: (variables: { id: string }) =>
      executeGraphQL(client, ArchiveEventDocument, variables)
  }));
}
```

**设计哲学**:
- **函数即文档**: 函数名 `injectEventsQuery` 自解释其用途
- **类型安全**: 完全依赖生成的 TypeScript 类型
- **缓存键设计**: `['events', variables]` 确保不同参数独立缓存
- **关注点分离**: Query Options 可独立使用，支持 prefetch

### 4.4 认证查询封装

#### apps/admin/src/app/core/queries/auth.query.ts
```typescript
import { inject } from '@angular/core';
import { injectQuery, injectMutation } from '@tanstack/angular-query-experimental';
import { createGraphQLClient, executeGraphQL } from '../graphql/client';
import {
  LoginDocument,
  LoginMutationVariables,
  RegisterDocument,
  RegisterMutationVariables,
  LogoutDocument,
  MeDocument
} from '../graphql/generated/graphql';

export function injectMeQuery(options?: { enabled?: boolean }) {
  const client = createGraphQLClient();

  return injectQuery(() => ({
    queryKey: ['auth', 'me'] as const,
    queryFn: () => executeGraphQL(client, MeDocument),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 10, // 用户信息 10 分钟内保持新鲜
    retry: false // 认证失败不重试
  }));
}

export function injectLoginMutation() {
  const client = createGraphQLClient();

  return injectMutation(() => ({
    mutationFn: (variables: LoginMutationVariables) =>
      executeGraphQL(client, LoginDocument, variables)
  }));
}

export function injectRegisterMutation() {
  const client = createGraphQLClient();

  return injectMutation(() => ({
    mutationFn: (variables: RegisterMutationVariables) =>
      executeGraphQL(client, RegisterDocument, variables)
  }));
}

export function injectLogoutMutation() {
  const client = createGraphQLClient();

  return injectMutation(() => ({
    mutationFn: () => executeGraphQL(client, LogoutDocument)
  }));
}
```

---

## 五、组件使用示例

### 5.1 事件列表查询示例

#### apps/admin/src/app/features/events/event-list.component.ts
```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectEventsQuery } from '../../core/queries/events.query';
import { EventsQueryVariables } from '../../core/graphql/generated/graphql';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-list">
      @if (eventsQuery.isPending()) {
        <div class="loading">加载中...</div>
      } @else if (eventsQuery.isError()) {
        <div class="error">
          加载失败: {{ eventsQuery.error()?.message }}
          <button (click)="eventsQuery.refetch()">重试</button>
        </div>
      } @else if (eventsQuery.data(); as data) {
        <div class="events">
          <h2>事件列表 (共 {{ data.events.totalCount }} 条)</h2>
          @for (edge of data.events.edges; track edge.node.id) {
            <div class="event-card">
              <h3>{{ edge.node.eventName }}</h3>
              <p>{{ edge.node.summary }}</p>
              <small>{{ edge.node.occurTime }}</small>
            </div>
          }
        </div>
      }

      <button (click)="loadMoreEvents()">加载更多</button>
    </div>
  `
})
export class EventListComponent {
  queryVariables = signal<EventsQueryVariables>({
    filter: {
      page: 1,
      pageSize: 20
    }
  });

  eventsQuery = injectEventsQuery(this.queryVariables());

  loadMoreEvents() {
    const current = this.queryVariables();
    this.queryVariables.set({
      filter: {
        ...current.filter,
        page: (current.filter?.page || 1) + 1
      }
    });
  }
}
```

**设计亮点**:
- **Signals 响应式**: 利用 Angular 20 Signals API
- **自动状态管理**: isPending/isError/data 无需手动维护
- **声明式模板**: @if/@else 语法清晰优雅
- **类型安全**: 所有数据都有完整类型推断

### 5.2 事件详情查询示例

#### apps/admin/src/app/features/events/event-detail.component.ts
```typescript
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectEventDetailQuery } from '../../core/queries/events.query';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-detail">
      @if (eventQuery.isPending()) {
        <div class="skeleton">加载中...</div>
      } @else if (eventQuery.isError()) {
        <div class="error">加载失败</div>
      } @else if (eventQuery.data(); as event) {
        <article>
          <h1>{{ event.event.eventName }}</h1>
          <p>{{ event.event.summary }}</p>

          <section class="meta">
            <span>类型: {{ event.event.eventType?.eventName }}</span>
            <span>行业: {{ event.event.industryType?.industryName }}</span>
            <span>时间: {{ event.event.occurTime }}</span>
          </section>

          @if (event.event.tags?.length; as tags) {
            <div class="tags">
              @for (tag of tags; track tag.id) {
                <span class="tag">{{ tag.tagName }}</span>
              }
            </div>
          }

          @if (event.event.attachments?.length; as attachments) {
            <div class="attachments">
              <h3>附件</h3>
              @for (attachment of attachments; track attachment.id) {
                <a [href]="attachment.fileUrl" target="_blank">
                  {{ attachment.fileName }}
                </a>
              }
            </div>
          }
        </article>
      }
    </div>
  `
})
export class EventDetailComponent {
  eventId = input.required<string>();
  eventQuery = injectEventDetailQuery(this.eventId());
}
```

### 5.3 事件创建变更示例

#### apps/admin/src/app/features/events/event-create.component.ts
```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { injectCreateEventMutation } from '../../core/queries/events.query';
import { EventStatus } from '../../core/graphql/generated/graphql';

@Component({
  selector: 'app-event-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <h2>创建事件</h2>

      <div class="form-group">
        <label for="eventName">事件名称</label>
        <input id="eventName" formControlName="eventName" />
      </div>

      <div class="form-group">
        <label for="summary">摘要</label>
        <textarea id="summary" formControlName="summary"></textarea>
      </div>

      <div class="form-group">
        <label for="occurTime">发生时间</label>
        <input id="occurTime" type="datetime-local" formControlName="occurTime" />
      </div>

      @if (createMutation.isError()) {
        <div class="error">
          {{ createMutation.error()?.message }}
        </div>
      }

      <button
        type="submit"
        [disabled]="form.invalid || createMutation.isPending()">
        @if (createMutation.isPending()) {
          创建中...
        } @else {
          创建事件
        }
      </button>
    </form>
  `
})
export class EventCreateComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private queryClient = injectQueryClient();

  form = this.fb.group({
    eventName: ['', Validators.required],
    summary: ['', Validators.required],
    occurTime: ['', Validators.required]
  });

  createMutation = injectCreateEventMutation();

  onSubmit() {
    if (this.form.invalid) return;

    const formValue = this.form.value;

    this.createMutation.mutate(
      {
        input: {
          eventName: formValue.eventName!,
          summary: formValue.summary!,
          occurTime: formValue.occurTime!,
          status: EventStatus.Draft,
          eventTypeId: '',
          industryTypeId: ''
        }
      },
      {
        onSuccess: (data) => {
          // 优雅的缓存失效策略
          this.queryClient.invalidateQueries({ queryKey: ['events'] });
          this.router.navigate(['/events', data.createEvent.id]);
        }
      }
    );
  }
}
```

**设计亮点**:
- **缓存自动失效**: 创建成功后自动刷新列表缓存
- **乐观更新可选**: 可在 onMutate 中实现乐观更新
- **错误处理优雅**: 错误状态自动管理，无需手动清理

### 5.4 事件更新与删除示例

#### apps/admin/src/app/features/events/event-actions.component.ts
```typescript
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import {
  injectUpdateEventMutation,
  injectRemoveEventMutation,
  injectPublishEventMutation,
  injectArchiveEventMutation
} from '../../core/queries/events.query';

@Component({
  selector: 'app-event-actions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-actions">
      <button
        (click)="onPublish()"
        [disabled]="publishMutation.isPending()">
        发布
      </button>

      <button
        (click)="onArchive()"
        [disabled]="archiveMutation.isPending()">
        归档
      </button>

      <button
        (click)="onDelete()"
        [disabled]="deleteMutation.isPending()"
        class="danger">
        删除
      </button>
    </div>
  `
})
export class EventActionsComponent {
  eventId = input.required<string>();
  deleted = output<void>();

  private queryClient = injectQueryClient();

  publishMutation = injectPublishEventMutation();
  archiveMutation = injectArchiveEventMutation();
  deleteMutation = injectRemoveEventMutation();

  onPublish() {
    this.publishMutation.mutate(
      { id: this.eventId() },
      {
        onSuccess: () => {
          this.invalidateEventQueries();
        }
      }
    );
  }

  onArchive() {
    this.archiveMutation.mutate(
      { id: this.eventId() },
      {
        onSuccess: () => {
          this.invalidateEventQueries();
        }
      }
    );
  }

  onDelete() {
    if (!confirm('确定要删除此事件吗？')) return;

    this.deleteMutation.mutate(
      { id: this.eventId() },
      {
        onSuccess: () => {
          this.invalidateEventQueries();
          this.deleted.emit();
        }
      }
    );
  }

  private invalidateEventQueries() {
    this.queryClient.invalidateQueries({ queryKey: ['events'] });
    this.queryClient.invalidateQueries({ queryKey: ['event', this.eventId()] });
  }
}
```

---

## 六、错误处理和加载状态管理

### 6.1 全局错误边界

#### apps/admin/src/app/core/components/query-boundary.component.ts
```typescript
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateQueryResult } from '@tanstack/angular-query-experimental';

@Component({
  selector: 'app-query-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (query().isPending()) {
      <div class="loading-state">
        <ng-content select="[loading]"></ng-content>
      </div>
    } @else if (query().isError()) {
      <div class="error-state">
        <ng-content select="[error]"></ng-content>
        <button (click)="onRetry()">重试</button>
      </div>
    } @else {
      <ng-content></ng-content>
    }
  `,
  styles: [`
    .loading-state, .error-state {
      padding: 2rem;
      text-align: center;
    }

    .error-state {
      color: #ef4444;
    }
  `]
})
export class QueryBoundaryComponent {
  query = input.required<CreateQueryResult<any, Error>>();
  retry = output<void>();

  onRetry() {
    this.query().refetch();
    this.retry.emit();
  }
}
```

**使用示例**:
```typescript
@Component({
  template: `
    <app-query-boundary [query]="eventsQuery">
      <div loading>
        <div class="spinner"></div>
        <p>加载事件列表中...</p>
      </div>

      <div error>
        <p>加载失败，请稍后重试</p>
      </div>

      <!-- 成功状态内容 -->
      <div class="events">
        @for (event of eventsQuery.data()?.events.edges; track event.node.id) {
          <app-event-card [event]="event.node" />
        }
      </div>
    </app-query-boundary>
  `
})
```

### 6.2 变更状态 Toast 通知

#### apps/admin/src/app/core/utils/mutation-handlers.ts
```typescript
import { CreateMutationResult } from '@tanstack/angular-query-experimental';
import { effect } from '@angular/core';

export function toastOnMutationSuccess<TData, TError, TVariables>(
  mutation: CreateMutationResult<TData, TError, TVariables>,
  message: string
) {
  effect(() => {
    if (mutation.isSuccess()) {
      showToast({ type: 'success', message });
    }
  });
}

export function toastOnMutationError<TData, TError, TVariables>(
  mutation: CreateMutationResult<TData, TError, TVariables>,
  message: string
) {
  effect(() => {
    if (mutation.isError()) {
      const errorMessage = mutation.error() instanceof Error
        ? mutation.error().message
        : message;
      showToast({ type: 'error', message: errorMessage });
    }
  });
}

function showToast(options: { type: 'success' | 'error'; message: string }) {
  // 集成 ng-zorro-antd 或自定义 Toast 服务
  console.log(`[Toast ${options.type}]:`, options.message);
}
```

**使用示例**:
```typescript
export class EventCreateComponent {
  createMutation = injectCreateEventMutation();

  constructor() {
    toastOnMutationSuccess(this.createMutation, '事件创建成功');
    toastOnMutationError(this.createMutation, '事件创建失败');
  }
}
```

---

## 七、缓存策略与优化

### 7.1 智能缓存键设计

```typescript
// 推荐的缓存键结构
const QUERY_KEYS = {
  auth: {
    me: () => ['auth', 'me'] as const,
    profile: () => ['auth', 'profile'] as const
  },
  events: {
    all: () => ['events'] as const,
    lists: () => ['events', 'list'] as const,
    list: (filters: EventsQueryVariables) => ['events', 'list', filters] as const,
    details: () => ['events', 'detail'] as const,
    detail: (id: string) => ['events', 'detail', id] as const
  }
} as const;

// 使用示例
export function injectEventsQuery(variables?: EventsQueryVariables) {
  const client = createGraphQLClient();

  return injectQuery(() => ({
    queryKey: variables
      ? QUERY_KEYS.events.list(variables)
      : QUERY_KEYS.events.lists(),
    queryFn: () => executeGraphQL(client, EventsDocument, variables)
  }));
}
```

**设计哲学**:
- **层级化结构**: 支持批量失效（如 `['events']` 失效所有事件相关查询）
- **类型安全**: 使用 `as const` 确保类型推断
- **语义清晰**: 键名自解释其作用域

### 7.2 数据预取（Prefetch）

#### apps/admin/src/app/features/events/event-list-item.component.ts
```typescript
import { Component, input, inject } from '@angular/core';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { eventDetailQueryOptions } from '../../core/queries/events.query';

@Component({
  selector: 'app-event-list-item',
  template: `
    <a
      [routerLink]="['/events', eventId()]"
      (mouseenter)="prefetchDetail()">
      {{ eventName() }}
    </a>
  `
})
export class EventListItemComponent {
  eventId = input.required<string>();
  eventName = input.required<string>();

  private queryClient = injectQueryClient();

  prefetchDetail() {
    // 鼠标悬停时预取详情，提升用户体验
    this.queryClient.prefetchQuery(eventDetailQueryOptions(this.eventId()));
  }
}
```

### 7.3 乐观更新

```typescript
export function injectUpdateEventMutation() {
  const client = createGraphQLClient();
  const queryClient = injectQueryClient();

  return injectMutation(() => ({
    mutationFn: (variables: UpdateEventMutationVariables) =>
      executeGraphQL(client, UpdateEventDocument, variables),

    onMutate: async (variables) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({
        queryKey: ['event', variables.id]
      });

      // 保存之前的数据
      const previousEvent = queryClient.getQueryData<EventQuery>([
        'event',
        variables.id
      ]);

      // 乐观更新
      if (previousEvent) {
        queryClient.setQueryData<EventQuery>(
          ['event', variables.id],
          {
            event: {
              ...previousEvent.event,
              ...variables.input
            }
          }
        );
      }

      return { previousEvent };
    },

    onError: (_err, variables, context) => {
      // 回滚到之前的数据
      if (context?.previousEvent) {
        queryClient.setQueryData(
          ['event', variables.id],
          context.previousEvent
        );
      }
    },

    onSettled: (_data, _error, variables) => {
      // 无论成功失败，都重新获取数据
      queryClient.invalidateQueries({
        queryKey: ['event', variables.id]
      });
    }
  }));
}
```

---

## 八、迁移路径

### 从现有 Service 迁移到 TanStack Query

#### 迁移步骤

**步骤 1: 创建查询封装**
```typescript
// 新建 apps/admin/src/app/core/queries/events.query.ts
// 参照第四章节的代码
```

**步骤 2: 组件中引入新查询**
```typescript
// Before (使用 EventsService)
export class EventListComponent {
  private eventsService = inject(EventsService);
  events$ = this.eventsService.query.selectAll();
  loading$ = this.eventsService.query.selectLoading();
  error$ = this.eventsService.query.selectError();

  ngOnInit() {
    this.eventsService.loadEvents({ page: 1, pageSize: 20 }).subscribe();
  }
}

// After (使用 TanStack Query)
export class EventListComponent {
  eventsQuery = injectEventsQuery({
    filter: { page: 1, pageSize: 20 }
  });

  // 自动响应式，无需订阅
}
```

**步骤 3: 渐进式替换**
- 优先迁移新功能
- 保持 Service 层向后兼容
- 逐步淘汰 Akita Store

### 共存策略

```typescript
// apps/admin/src/app/state/events.service.ts
// 在现有 Service 中添加 TanStack Query 支持

@Injectable({ providedIn: 'root' })
export class EventsService {
  // 保留原有方法供旧代码使用
  loadEvents(params: EventQueryParams): Observable<void> {
    // ... 原有实现
  }

  // 新增：推荐使用的查询方法
  useEventsQuery(variables?: EventsQueryVariables) {
    return injectEventsQuery(variables);
  }

  useCreateEventMutation() {
    return injectCreateEventMutation();
  }
}
```

---

## 九、开发工具

### 9.1 安装 DevTools

```bash
cd apps/admin
pnpm add @tanstack/angular-query-devtools-experimental@^5.59.0 -D
```

### 9.2 启用 DevTools

#### apps/admin/src/app/app.component.ts
```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AngularQueryDevtools } from '@tanstack/angular-query-devtools-experimental';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AngularQueryDevtools],
  template: `
    <router-outlet></router-outlet>
    <angular-query-devtools initialIsOpen={false} />
  `
})
export class AppComponent {}
```

**DevTools 功能**:
- 查询状态实时监控
- 缓存数据可视化
- 手动触发 refetch/invalidate
- 性能分析

---

## 十、最佳实践总结

### 10.1 查询设计原则

1. **查询键规范化**: 使用统一的 QUERY_KEYS 常量
2. **粒度适中**: 避免单个查询返回过多数据
3. **避免瀑布请求**: 使用 prefetch 或并行查询
4. **合理的 staleTime**: 根据数据变化频率调整

### 10.2 变更设计原则

1. **语义化命名**: `injectCreateEventMutation` 优于 `injectEventMutation`
2. **失效策略明确**: 每个变更后明确哪些缓存需要失效
3. **乐观更新谨慎**: 只在确定性高的场景使用
4. **错误处理统一**: 使用全局错误处理 + 局部特殊处理

### 10.3 性能优化技巧

1. **启用 refetchOnWindowFocus**: 保持数据新鲜度
2. **合理的 gcTime**: 避免内存泄漏
3. **使用 select**: 仅订阅需要的数据片段
4. **避免过度失效**: 精确失效而非全局失效

### 10.4 类型安全保障

1. **完全依赖生成的类型**: 不手写 GraphQL 类型
2. **使用 TypedDocumentNode**: 确保查询和类型匹配
3. **避免 any**: 利用 TypeScript 的类型推断
4. **严格模式**: tsconfig.json 启用 strict: true

---

## 十一、常见问题

### Q1: TanStack Query 与 Akita 如何协同？

**A**: 推荐新功能使用 TanStack Query，旧功能保持 Akita。可以在 Service 层提供双重接口：

```typescript
@Injectable({ providedIn: 'root' })
export class EventsService {
  // Akita 接口（向后兼容）
  loadEvents(params: EventQueryParams): Observable<void> { ... }

  // TanStack Query 接口（推荐）
  useEventsQuery = injectEventsQuery;
}
```

### Q2: 如何处理认证 Token 过期？

**A**: 在 GraphQL Client 中集成 Token 刷新逻辑：

```typescript
export function createGraphQLClient(): GraphQLClient {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  return new GraphQLClient(resolveGraphQLEndpoint(), {
    headers: () => ({
      Authorization: `Bearer ${tokenStorage.getToken()}`
    }),
    requestMiddleware: async (request) => {
      // Token 刷新逻辑
      if (isTokenExpired()) {
        await refreshToken();
      }
      return request;
    },
    responseMiddleware: (response) => {
      if (response instanceof Error && response.message.includes('401')) {
        router.navigate(['/login']);
      }
    }
  });
}
```

### Q3: 如何实现无限滚动加载？

**A**: 使用 `injectInfiniteQuery`：

```typescript
export function injectInfiniteEventsQuery(baseVariables?: Omit<EventsQueryVariables, 'page'>) {
  const client = createGraphQLClient();

  return injectInfiniteQuery(() => ({
    queryKey: ['events', 'infinite', baseVariables] as const,
    queryFn: ({ pageParam = 1 }) =>
      executeGraphQL(client, EventsDocument, {
        filter: {
          ...baseVariables?.filter,
          page: pageParam,
          pageSize: 20
        }
      }),
    getNextPageParam: (lastPage, allPages) => {
      const hasMore = lastPage.events.edges.length === 20;
      return hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1
  }));
}
```

---

## 十二、执行清单

### 立即执行

- [ ] 安装依赖: `@tanstack/angular-query-experimental`
- [ ] 配置 QueryClient 在 `app.config.ts`
- [ ] 创建 GraphQL Client 封装 (`client.ts`)
- [ ] 创建第一个查询封装 (如 `events.query.ts`)

### 短期执行 (1-2 周)

- [ ] 迁移 2-3 个核心功能到 TanStack Query
- [ ] 建立查询键命名规范
- [ ] 集成 DevTools
- [ ] 编写迁移指南供团队使用

### 中期执行 (1 个月)

- [ ] 完成所有 GraphQL 查询的封装
- [ ] 逐步淘汰 Akita Store
- [ ] 实现全局错误处理和日志
- [ ] 性能优化和缓存策略调优

### 长期执行

- [ ] 完全移除 Akita 依赖
- [ ] 建立 TanStack Query 最佳实践文档
- [ ] 性能监控和持续优化

---

## 十三、参考资源

- [TanStack Query 官方文档](https://tanstack.com/query/latest)
- [Angular Query 实验性文档](https://tanstack.com/query/latest/docs/framework/angular/overview)
- [GraphQL Code Generator 文档](https://the-guild.dev/graphql/codegen)
- [graphql-request 文档](https://github.com/jasonkuhrt/graphql-request)

---

**结语**

这套方案体现了代码艺术家的核心理念：

- **存在即合理**: 每个抽象层都有不可替代的价值
- **优雅即简约**: API 设计自解释，减少认知负担
- **性能即艺术**: 利用 TanStack Query 的智能缓存机制
- **错误处理如人生哲学**: 将错误视为改进信号

愿这份方案成为你项目中的艺术品，经得起时间的考验。

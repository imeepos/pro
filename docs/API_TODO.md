# @pro/admin GraphQL 升级改造计划

> 参考 @pro/web 代码规范，将 @pro/admin 从 REST API (SDK) 迁移到 GraphQL

## 📋 项目概览

### 当前状态分析

**@pro/web (参考标准)**
- ✅ 使用 GraphQL + TypedDocumentNode
- ✅ 使用 GraphQL Code Generator 生成类型
- ✅ 统一的 GraphqlGateway 服务
- ✅ .graphql 文件独立管理查询
- ✅ 类型安全的请求/响应

**@pro/admin (待升级)**
- ❌ 使用 REST API (@pro/sdk)
- ❌ 手写 GraphQL 查询字符串
- ❌ 缺少类型生成
- ❌ 混合使用 SDK 和 GraphQL
- ❌ 状态管理依赖 SDK

### 核心差异对比

| 特性 | @pro/web | @pro/admin |
|------|----------|------------|
| API 通信 | GraphQL (typed) | REST + 手写 GraphQL |
| 类型生成 | ✅ codegen | ❌ 无 |
| 查询管理 | .graphql 文件 | 字符串模板 |
| Gateway | 完整重试/错误处理 | 简单封装 |
| 依赖 | graphql-request | @pro/sdk + graphql-request |

---

## 🎯 升级策略

### 分层并行执行原则

1. **基础设施层** (Layer 0) - 必须先完成
2. **核心服务层** (Layer 1) - 依赖 Layer 0
3. **业务模块层** (Layer 2) - 依赖 Layer 1
4. **UI 组件层** (Layer 3) - 依赖 Layer 2
5. **清理优化层** (Layer 4) - 最后执行

### 依赖关系图

```
Layer 0: 基础设施 (GraphQL 配置、CodeGen、Gateway)
    ↓
Layer 1: Auth 服务 (认证是其他服务的前置依赖)
    ↓
Layer 2: 业务服务 (Events, Screens, Tags, MediaTypes, etc.)
    ↓  ↓  ↓
Layer 3: UI 组件 (依赖对应的服务)
    ↓
Layer 4: 清理 SDK 依赖、测试、文档
```

---

## 🔍 2025-10-16 巡检记录

- ✅ Task 0.1 依赖安装完成（apps/admin/package.json）
- ✅ Task 0.2 CodeGen 配置已就绪（apps/admin/codegen.ts）
- ✅ Task 0.3 新增 codegen 脚本（apps/admin/package.json）
- ✅ Task 0.4 GraphqlGateway 替换完成并接入结构化日志（apps/admin/src/app/core/graphql/graphql-gateway.service.ts）
- ✅ Task 0.5 Logger 工具已落地并被 GraphqlGateway 使用（apps/admin/src/app/core/utils/logger.ts）
- ✅ Task 0.6 GraphQL 文档与生成目录已创建（apps/admin/src/app/core/graphql）
- ✅ Task 1.1 Auth GraphQL 文档已补全（apps/admin/src/app/core/graphql/auth.graphql）
- ✅ Task 1.2 CodeGen 已运行生成类型（apps/admin/src/app/core/graphql/generated）
- ✅ Task 1.3 user-mapper 已创建并完成领域模型映射（apps/admin/src/app/core/utils/user-mapper.ts）
- ⚠️ Task 1.4 AuthService 已改为 GraphQL，但 RefreshToken 流程缺失，仍需补全（apps/admin/src/app/state/auth.service.ts）
- ⚠️ Task 1.5 app.config.ts 仍注入 SkerSDK，与 GraphQL 网关目标冲突（apps/admin/src/app/app.config.ts）
- ⚠️ ConfigService 继续直接依赖 SkerSDK 获取远程配置，需统一改接 GraphQL / Gateway（apps/admin/src/app/core/services/config.service.ts）
- ⚠️ Task 1.6 认证流程测试尚未执行
- ✅ Task 2.1 ScreensService 已完成 GraphQL 化，并提供 mapper（apps/admin/src/app/state/screens.service.ts、apps/admin/src/app/core/utils/screen-mapper.ts）
- ⚠️ ScreensService 发布/草稿逻辑在无缓存实体时返回 `null!`，存在运行时风险（apps/admin/src/app/state/screens.service.ts）
- ⚠️ Task 2.2 EventsService 已改为 GraphQL，但分页与字段映射仍大量填充默认值，需补齐数据模型（apps/admin/src/app/state/events.service.ts）
- ✅ Task 2.3 TagsService 已迁移至 GraphQL，含热门标签查询（apps/admin/src/app/state/tags.service.ts）
- ✅ Task 2.4 MediaTypesService 已迁移至 GraphQL，并完成状态映射（apps/admin/src/app/state/media-types.service.ts）
- ✅ Task 2.5 IndustryTypesService 使用 GraphQL documents 并完成 CRUD（apps/admin/src/app/state/industry-types.service.ts）
- ✅ Task 2.6 EventTypesService 以 GraphQL 实现并映射至领域类型（apps/admin/src/app/state/event-types.service.ts）
- ✅ Task 2.7 UserService 已基于 GraphQL，实现查询与更新（apps/admin/src/app/state/user.service.ts）
- ✅ Task 2.8 WeiboSearchTasksService 已迁移至 GraphQL，并保持筛选功能（apps/admin/src/app/state/weibo-search-tasks.service.ts）
- ⚠️ Layer 2 仍需完善 EventsService 的 GraphQL 数据映射，当前分页/类型信息不完整
- ⚠️ `apps/admin/src/app/core/graphql/admin_graphql_temp` 存在重复的 .graphql 文件，需合并至正式目录避免混淆
- ⚠️ WeiboSearchTasksService 在多处以 `unknown` 强转 GraphQL 结果，削弱类型生成价值（apps/admin/src/app/state/weibo-search-tasks.service.ts）
- ⚠️ IndustryTypes GraphQL 文档分散为 `industry-type.documents.ts`，与 codegen 约定不符，需回归 `.graphql` 文件统一管理

---

## 📦 Layer 0: 基础设施层

> **并行度**: 串行执行（必须按顺序完成）
> **预计耗时**: 2-3 小时
> **优先级**: P0 (最高)

### Task 0.1: 安装依赖包

**文件**: `apps/admin/package.json`

**操作**:
```bash
cd apps/admin
pnpm add -D @graphql-codegen/cli@^6.0.0
pnpm add -D @graphql-codegen/typescript@^5.0.2
pnpm add -D @graphql-codegen/typescript-operations@^5.0.2
pnpm add -D @graphql-codegen/client-preset@^5.0.0
pnpm add @graphql-typed-document-node/core@^3.2.0
```

**验证**: `package.json` 包含所有必要的 codegen 依赖

---

### Task 0.2: 创建 CodeGen 配置

**文件**: `apps/admin/codegen.ts` (新建)

**内容**:
```typescript
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/apps/api/schema.graphql',
  documents: ['src/app/**/*.{graphql,gql,ts}'],
  ignoreNoDocuments: false,
  generates: {
    'src/app/core/graphql/generated/': {
      preset: 'client',
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

**依赖**: Task 0.1
**验证**: 文件创建成功

---

### Task 0.3: 更新 package.json scripts

**文件**: `apps/admin/package.json`

**添加脚本**:
```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.ts",
    "codegen:watch": "graphql-codegen --config codegen.ts --watch"
  }
}
```

**依赖**: Task 0.2
**验证**: `pnpm run codegen --help` 正常执行

---

### Task 0.4: 升级 GraphqlGateway

**文件**: `apps/admin/src/app/core/graphql/graphql-gateway.service.ts`

**操作**: 完全替换为 @pro/web 版本的实现

**参考**: `apps/web/src/app/core/graphql/graphql-gateway.service.ts`

**关键改动**:
- 支持 TypedDocumentNode
- 添加重试机制 (maxAttempts: 3)
- 增强错误处理和日志
- 提取操作名称用于调试

**依赖**: Task 0.1
**验证**: TypeScript 编译通过

---

### Task 0.5: 创建 Logger 工具

**文件**: `apps/admin/src/app/core/utils/logger.ts` (新建)

**操作**: 从 @pro/web 复制 logger 实现

**参考**: `apps/web/src/app/core/utils/logger.ts`

**依赖**: 无
**验证**: 导入测试通过

---

### Task 0.6: 创建 GraphQL 查询目录

**操作**:
```bash
mkdir -p apps/admin/src/app/core/graphql
```

**文件结构**:
```
apps/admin/src/app/core/graphql/
├── generated/          # CodeGen 生成目录
├── auth.graphql        # 待创建
├── screen.graphql      # 待创建
├── event.graphql       # 待创建
├── user.graphql        # 待创建
└── graphql-gateway.service.ts
```

**依赖**: Task 0.4
**验证**: 目录创建成功

---

## 🔐 Layer 1: 认证服务层

> **并行度**: 串行执行（认证是其他模块的前置依赖）
> **预计耗时**: 3-4 小时
> **优先级**: P0
> **依赖**: Layer 0 完成

### Task 1.1: 创建 Auth GraphQL 查询

**文件**: `apps/admin/src/app/core/graphql/auth.graphql` (新建)

**操作**: 从 @pro/web 复制并调整

**参考**: `apps/web/src/app/core/graphql/auth.graphql`

**内容**:
```graphql
mutation Login($input: LoginDto!) {
  login(input: $input) {
    accessToken
    refreshToken
    user {
      id
      username
      email
      status
      createdAt
      updatedAt
    }
  }
}

mutation Register($input: RegisterDto!) {
  register(input: $input) {
    accessToken
    refreshToken
    user {
      id
      username
      email
      status
      createdAt
      updatedAt
    }
  }
}

mutation Refresh($input: RefreshTokenDto!) {
  refreshToken(input: $input) {
    accessToken
    refreshToken
    user {
      id
      username
      email
      status
      createdAt
      updatedAt
    }
  }
}

mutation Logout {
  logout
}

query Me {
  me {
    id
    username
    email
    status
    createdAt
    updatedAt
  }
}
```

**依赖**: Task 0.6
**验证**: 文件创建成功

---

### Task 1.2: 运行 CodeGen 生成类型

**操作**:
```bash
cd apps/admin
pnpm run codegen
```

**预期输出**:
- `src/app/core/graphql/generated/graphql.ts`
- `src/app/core/graphql/generated/gql.ts`
- `src/app/core/graphql/generated/index.ts`
- `src/app/core/graphql/generated/fragment-masking.ts`

**依赖**: Task 1.1
**验证**: 生成的文件包含 Auth 相关类型

---

### Task 1.3: 创建 User Mapper

**文件**: `apps/admin/src/app/core/utils/user-mapper.ts` (新建)

**操作**: 从 @pro/web 复制

**参考**: `apps/web/src/app/core/utils/user-mapper.ts`

**功能**: GraphQL User 类型转换为领域 User 类型

**依赖**: Task 1.2
**验证**: 导出 `toDomainUser` 函数

---

### Task 1.4: 重构 AuthService

**文件**: `apps/admin/src/app/state/auth.service.ts`

**操作**: 替换为 GraphQL 实现

**关键改动**:
1. 移除 `SkerSDK` 依赖
2. 注入 `GraphqlGateway`
3. 使用生成的 GraphQL Documents
4. 使用 `from()` 转换 Promise 为 Observable
5. 添加类型安全的请求/响应处理

**参考实现**:
```typescript
import { Injectable, inject } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { LoginDto, RegisterDto, AuthResponse, User } from '@pro/types';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  LoginDocument,
  LoginMutation,
  LoginMutationVariables,
  // ... 其他导入
} from '../core/graphql/generated/graphql';
import { toDomainUser } from '../core/utils/user-mapper';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private gateway = inject(GraphqlGateway);
  private store = inject(AuthStore);
  private query = inject(AuthQuery);
  private tokenStorage = inject(TokenStorageService);
  private router = inject(Router);

  login(dto: LoginDto): Observable<AuthResponse> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<LoginMutation, LoginMutationVariables>(
        LoginDocument,
        { input: dto }
      )
    ).pipe(
      map(result => this.toAuthResponse(result.login)),
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => {
        this.setError(error.message);
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  // ... 其他方法类似改造
}
```

**依赖**: Task 1.3
**验证**: TypeScript 编译通过，运行时测试登录功能

---

### Task 1.5: 更新 app.config.ts

**文件**: `apps/admin/src/app/app.config.ts`

**操作**: 移除 SkerSDK provider

**删除**:
```typescript
{
  provide: SkerSDK,
  useFactory: () => {
    const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
    return new SkerSDK(baseUrl, environment.tokenKey);
  }
}
```

**依赖**: Task 1.4
**验证**: 应用启动无错误

---

### Task 1.6: 测试认证流程

**测试用例**:
- [ ] 登录成功
- [ ] 登录失败（错误处理）
- [ ] 注册成功
- [ ] Token 刷新
- [ ] 退出登录
- [ ] Me 查询

**依赖**: Task 1.5
**验证**: 所有认证功能正常工作

---

## 🏗️ Layer 2: 业务服务层

> **并行度**: 高度并行（各模块独立）
> **预计耗时**: 6-8 小时
> **优先级**: P1
> **依赖**: Layer 1 完成

### 并行执行组

以下模块可以 **完全并行** 执行：

- **Group A**: Screens Service (2.1)
- **Group B**: Events Service (2.2)
- **Group C**: Tags Service (2.3)
- **Group D**: MediaTypes Service (2.4)
- **Group E**: IndustryTypes Service (2.5)
- **Group F**: EventTypes Service (2.6)
- **Group G**: User Service (2.7)
- **Group H**: WeiboSearchTasks Service (2.8)

---

### Task 2.1: Screens Service (GraphQL 化)

#### 2.1.1 创建 Screen GraphQL 查询

**文件**: `apps/admin/src/app/core/graphql/screen.graphql` (新建)

**参考**: `apps/web/src/app/core/graphql/screen.graphql`

**内容**:
```graphql
query Screens($page: Int, $limit: Int) {
  screens(page: $page, limit: $limit) {
    edges {
      node {
        id
        name
        description
        layout {
          width
          height
          background
          cols
          rows
          grid {
            size
            enabled
          }
        }
        components {
          id
          type
          position {
            x
            y
            width
            height
            zIndex
          }
          config
          dataSource {
            type
            url
            data
            refreshInterval
          }
        }
        status
        isDefault
        createdBy
        createdAt
        updatedAt
      }
    }
    totalCount
  }
}

query Screen($id: ID!) {
  screen(id: $id) {
    id
    name
    description
    layout { ... }
    components { ... }
    status
    isDefault
    createdBy
    createdAt
    updatedAt
  }
}

mutation CreateScreen($input: CreateScreenDto!) {
  createScreen(input: $input) {
    id
    name
    # ... 完整字段
  }
}

mutation UpdateScreen($id: ID!, $input: UpdateScreenDto!) {
  updateScreen(id: $id, input: $input) {
    id
    name
    # ... 完整字段
  }
}

mutation DeleteScreen($id: ID!) {
  deleteScreen(id: $id)
}

mutation PublishScreen($id: ID!) {
  publishScreen(id: $id) {
    id
    status
  }
}

mutation DraftScreen($id: ID!) {
  draftScreen(id: $id) {
    id
    status
  }
}

mutation CopyScreen($id: ID!) {
  copyScreen(id: $id) {
    id
    name
  }
}

mutation SetDefaultScreen($id: ID!) {
  setDefaultScreen(id: $id) {
    id
    isDefault
  }
}
```

**依赖**: Layer 1 完成
**验证**: 文件创建，运行 codegen

---

#### 2.1.2 创建 Screen Mapper

**文件**: `apps/admin/src/app/core/utils/screen-mapper.ts` (新建)

**功能**: GraphQL Screen 类型转换为 SDK ScreenPage 类型

**依赖**: Task 2.1.1
**验证**: 导出映射函数

---

#### 2.1.3 重构 ScreensService

**文件**: `apps/admin/src/app/state/screens.service.ts`

**操作**: 替换 SDK 调用为 GraphQL

**关键改动**:
```typescript
import { Injectable, inject } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  ScreensDocument,
  ScreensQuery,
  CreateScreenDocument,
  // ... 其他导入
} from '../core/graphql/generated/graphql';

@Injectable({ providedIn: 'root' })
export class ScreensService {
  private gateway = inject(GraphqlGateway);
  private store = inject(ScreensStore);
  private query = inject(ScreensQuery);

  loadScreens(page = 1, limit = 20): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<ScreensQuery>(ScreensDocument, { page, limit })
    ).pipe(
      map(result => {
        const edges = result.screens.edges ?? [];
        const items = edges.map(edge => normalizeScreen(edge.node));
        this.store.set(items);
        this.store.update({
          total: result.screens.totalCount,
          page,
          limit
        });
      }),
      catchError(error => {
        this.setError(error.message || '加载页面列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  // ... 其他方法类似改造
}
```

**依赖**: Task 2.1.2
**验证**: TypeScript 编译通过

---

### Task 2.2: Events Service (GraphQL 化)

#### 2.2.1 创建 Event GraphQL 查询

**文件**: `apps/admin/src/app/core/graphql/event.graphql` (新建)

**参考**: `apps/web/src/app/core/graphql/event.graphql`

**内容**:
```graphql
query Events(
  $page: Int
  $limit: Int
  $status: EventStatus
  $keyword: String
  $startDate: DateTime
  $endDate: DateTime
) {
  events(
    page: $page
    limit: $limit
    status: $status
    keyword: $keyword
    startDate: $startDate
    endDate: $endDate
  ) {
    edges {
      node {
        id
        title
        description
        status
        eventType {
          id
          name
        }
        industryType {
          id
          name
        }
        tags {
          id
          name
        }
        location
        startTime
        endTime
        createdAt
        updatedAt
      }
    }
    totalCount
  }
}

query Event($id: ID!) {
  event(id: $id) {
    id
    title
    description
    content
    status
    eventType { id, name }
    industryType { id, name }
    tags { id, name }
    location
    attachments {
      id
      url
      filename
      mimeType
    }
    startTime
    endTime
    createdAt
    updatedAt
  }
}

mutation CreateEvent($input: CreateEventDto!) {
  createEvent(input: $input) {
    id
    title
  }
}

mutation UpdateEvent($id: ID!, $input: UpdateEventDto!) {
  updateEvent(id: $id, input: $input) {
    id
    title
  }
}

mutation DeleteEvent($id: ID!) {
  deleteEvent(id: $id)
}

mutation PublishEvent($id: ID!) {
  publishEvent(id: $id) {
    id
    status
  }
}

mutation ArchiveEvent($id: ID!) {
  archiveEvent(id: $id) {
    id
    status
  }
}
```

**依赖**: Layer 1 完成
**验证**: 文件创建，运行 codegen

---

#### 2.2.2 创建 Event Mapper

**文件**: `apps/admin/src/app/core/utils/event-mapper.ts` (新建)

**依赖**: Task 2.2.1
**验证**: 导出映射函数

---

#### 2.2.3 重构 EventsService

**文件**: `apps/admin/src/app/state/events.service.ts`

**操作**: 替换 EventApi 为 GraphQL

**依赖**: Task 2.2.2
**验证**: TypeScript 编译通过

---

### Task 2.3: Tags Service (GraphQL 化)

#### 2.3.1 创建 Tag GraphQL 查询

**文件**: `apps/admin/src/app/core/graphql/tag.graphql` (新建)

**内容**:
```graphql
query Tags($page: Int, $limit: Int, $keyword: String) {
  tags(page: $page, limit: $limit, keyword: $keyword) {
    edges {
      node {
        id
        name
        color
        usageCount
        createdAt
        updatedAt
      }
    }
    totalCount
  }
}

query PopularTags($limit: Int) {
  popularTags(limit: $limit) {
    id
    name
    color
    usageCount
  }
}

mutation CreateTag($input: CreateTagDto!) {
  createTag(input: $input) {
    id
    name
    color
  }
}

mutation UpdateTag($id: ID!, $input: UpdateTagDto!) {
  updateTag(id: $id, input: $input) {
    id
    name
    color
  }
}

mutation DeleteTag($id: ID!) {
  deleteTag(id: $id)
}
```

**依赖**: Layer 1 完成
**验证**: 文件创建，运行 codegen

---

#### 2.3.2 重构 TagsService

**文件**: `apps/admin/src/app/state/tags.service.ts`

**操作**: 替换 TagApi 为 GraphQL

**依赖**: Task 2.3.1
**验证**: TypeScript 编译通过

---

### Task 2.4: MediaTypes Service (GraphQL 化)

**文件结构**:
- `apps/admin/src/app/core/graphql/media-type.graphql` (新建)
- `apps/admin/src/app/state/media-types.service.ts` (重构)

**GraphQL Schema**:
```graphql
query MediaTypes($page: Int, $limit: Int) { ... }
mutation CreateMediaType($input: CreateMediaTypeDto!) { ... }
mutation UpdateMediaType($id: ID!, $input: UpdateMediaTypeDto!) { ... }
mutation DeleteMediaType($id: ID!) { ... }
```

**依赖**: Layer 1 完成
**验证**: 服务可正常 CRUD

---

### Task 2.5: IndustryTypes Service (GraphQL 化)

**文件结构**:
- `apps/admin/src/app/core/graphql/industry-type.graphql` (新建)
- `apps/admin/src/app/state/industry-types.service.ts` (重构)

**依赖**: Layer 1 完成
**验证**: 服务可正常 CRUD

---

### Task 2.6: EventTypes Service (GraphQL 化)

**文件结构**:
- `apps/admin/src/app/core/graphql/event-type.graphql` (新建)
- `apps/admin/src/app/state/event-types.service.ts` (重构)

**依赖**: Layer 1 完成
**验证**: 服务可正常 CRUD

---

### Task 2.7: User Service (GraphQL 化)

#### 2.7.1 创建 User GraphQL 查询

**文件**: `apps/admin/src/app/core/graphql/user.graphql` (新建)

**参考**: `apps/web/src/app/core/graphql/user.graphql`

**依赖**: Layer 1 完成

---

#### 2.7.2 重构 UserService

**文件**: `apps/admin/src/app/state/user.service.ts`

**操作**: 移除 SDK 依赖，使用 GraphQL

**依赖**: Task 2.7.1
**验证**: 用户信息查询正常

---

### Task 2.8: WeiboSearchTasks Service (GraphQL 化)

**文件结构**:
- `apps/admin/src/app/core/graphql/weibo-search-task.graphql` (新建)
- `apps/admin/src/app/state/weibo-search-tasks.service.ts` (重构)

**依赖**: Layer 1 完成
**验证**: 微博任务管理正常

---

## 🎨 Layer 3: UI 组件层

> **并行度**: 高度并行（各组件独立）
> **预计耗时**: 4-6 小时
> **优先级**: P2
> **依赖**: Layer 2 对应服务完成

### 并行执行组

以下组件可以在对应服务完成后并行执行：

- **Group A**: Screens 相关组件 (依赖 Task 2.1)
- **Group B**: Events 相关组件 (依赖 Task 2.2)
- **Group C**: Tags 相关组件 (依赖 Task 2.3)
- **Group D**: 其他业务组件

---

### Task 3.1: Screens 编辑器组件

**影响文件**:
- `apps/admin/src/app/features/screens/editor/canvas/canvas.component.ts`
- `apps/admin/src/app/features/screens/screens-list.component.ts`

**操作**:
1. 更新数据获取方式（从 SDK 切换到 GraphQL Service）
2. 验证数据流正常
3. 测试页面发布/草稿/删除功能

**依赖**: Task 2.1.3
**验证**: 编辑器正常加载和保存

---

### Task 3.2: Events 管理组件

**影响文件**:
- `apps/admin/src/app/features/events/event-detail.component.ts`
- `apps/admin/src/app/features/events/events-list.component.ts`
- `apps/admin/src/app/features/events/industry-types-list.component.ts`
- `apps/admin/src/app/features/events/event-types-list.component.ts`

**操作**:
1. 更新所有 EventsService 调用
2. 验证事件列表、详情、编辑功能
3. 测试标签、附件功能

**依赖**: Task 2.2.3
**验证**: 事件 CRUD 功能正常

---

### Task 3.3: Tags 管理组件

**影响文件**:
- `apps/admin/src/app/features/events/components/tag-cloud.component.ts`

**操作**: 更新 TagsService 调用

**依赖**: Task 2.3.2
**验证**: 标签云正常显示

---

### Task 3.4: MediaType 管理组件

**影响文件**:
- `apps/admin/src/app/features/media-type/media-type-list/media-type-list.component.ts`
- `apps/admin/src/app/features/media-type/media-type-form/media-type-form.component.ts`

**依赖**: Task 2.4
**验证**: 媒体类型管理正常

---

### Task 3.5: WeiboSearchTasks 组件

**影响文件**:
- `apps/admin/src/app/features/weibo-search-tasks/weibo-search-tasks-list.component.ts`

**依赖**: Task 2.8
**验证**: 微博任务列表正常

---

## 🧹 Layer 4: 清理优化层

> **并行度**: 部分并行
> **预计耗时**: 2-3 小时
> **优先级**: P3
> **依赖**: Layer 3 完成

### Task 4.1: 移除 SDK 依赖

**文件**: `apps/admin/package.json`

**操作**:
```bash
cd apps/admin
pnpm remove @pro/sdk
```

**前提条件**:
- 所有服务都已迁移到 GraphQL
- 所有组件都已更新

**验证**:
- `pnpm run typecheck` 通过
- `pnpm run build` 成功
- 运行时无 SDK 相关错误

---

### Task 4.2: 清理废弃导入

**操作**: 全局搜索并移除

**搜索模式**:
```bash
# 搜索 SDK API 导入
grep -r "from '@pro/sdk'" apps/admin/src

# 搜索 environment.apiUrl 相关
grep -r "EventApi\|ScreenApi\|TagApi" apps/admin/src
```

**清理目标**:
- 移除所有 `*Api` 类的导入
- 移除未使用的 SDK 类型导入
- 更新环境变量配置（如果需要）

**依赖**: Task 4.1
**验证**: 无编译警告

---

### Task 4.3: 统一错误处理

**文件**: 所有 `*.service.ts`

**操作**: 确保所有服务使用统一的错误处理模式

**参考**: @pro/web 的错误处理方式

**验证**: 错误信息正确显示在 UI

---

### Task 4.4: 添加 GraphQL 操作日志

**操作**: 在关键操作中添加日志

**示例**:
```typescript
import { logger } from '../core/utils/logger';

export class ScreensService {
  private log = logger.withScope('ScreensService');

  loadScreens(page = 1, limit = 20): Observable<void> {
    this.log.info('加载页面列表', { page, limit });
    // ...
  }
}
```

**依赖**: Task 0.5
**验证**: 控制台可见结构化日志

---

### Task 4.5: 更新 .gitignore

**文件**: `apps/admin/.gitignore`

**添加**:
```
# GraphQL CodeGen
src/app/core/graphql/generated/
```

**验证**: 生成的文件不会被提交

---

### Task 4.6: 编写迁移文档

**文件**: `apps/admin/MIGRATION.md` (新建)

**内容**:
- GraphQL 迁移总结
- API 调用方式对比（Before/After）
- 常见问题解决方案
- 性能优化建议

**依赖**: 所有任务完成
**验证**: 文档完整可读

---

### Task 4.7: 类型检查和构建

**操作**:
```bash
cd apps/admin

# 类型检查
pnpm run typecheck

# 构建
pnpm run build

# Lint
pnpm run lint
```

**依赖**: 所有代码迁移完成
**验证**: 所有命令成功执行

---

### Task 4.8: E2E 测试

**测试场景**:
1. 登录流程
2. 创建/编辑 Screen
3. 创建/编辑 Event
4. 标签管理
5. 发布/草稿切换

**依赖**: Task 4.7
**验证**: 所有核心功能正常

---

## 📊 执行总结

### 时间估算

| Layer | 描述 | 预计耗时 | 并行度 |
|-------|------|----------|--------|
| Layer 0 | 基础设施层 | 2-3 小时 | 串行 |
| Layer 1 | 认证服务层 | 3-4 小时 | 串行 |
| Layer 2 | 业务服务层 | 6-8 小时 | 高度并行 (8 组) |
| Layer 3 | UI 组件层 | 4-6 小时 | 高度并行 (5 组) |
| Layer 4 | 清理优化层 | 2-3 小时 | 部分并行 |
| **总计** | | **17-24 小时** | 混合 |

**并行执行预期**: 通过合理并行，可压缩至 **10-14 小时**

---

### 并行执行建议

#### 阶段 1: 基础设施 (串行，2-3 小时)
```
Task 0.1 → 0.2 → 0.3 → 0.4 → 0.5 → 0.6
```

#### 阶段 2: 认证服务 (串行，3-4 小时)
```
Task 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6
```

#### 阶段 3: 业务服务 (并行，6-8 小时 → 压缩至 3-4 小时)
```
并行执行:
├─ Task 2.1 (Screens)
├─ Task 2.2 (Events)
├─ Task 2.3 (Tags)
├─ Task 2.4 (MediaTypes)
├─ Task 2.5 (IndustryTypes)
├─ Task 2.6 (EventTypes)
├─ Task 2.7 (User)
└─ Task 2.8 (WeiboSearchTasks)
```

#### 阶段 4: UI 组件 (并行，4-6 小时 → 压缩至 2-3 小时)
```
并行执行 (每组依赖对应服务):
├─ Task 3.1 (依赖 2.1)
├─ Task 3.2 (依赖 2.2)
├─ Task 3.3 (依赖 2.3)
├─ Task 3.4 (依赖 2.4)
└─ Task 3.5 (依赖 2.8)
```

#### 阶段 5: 清理优化 (部分并行，2-3 小时)
```
Task 4.1 → 4.2 → 4.3
                ├─ 4.4 (并行)
                └─ 4.5 (并行)
→ 4.6 → 4.7 → 4.8
```

---

### 关键里程碑

- [ ] **里程碑 1**: Layer 0 完成 - GraphQL 基础设施就绪
- [ ] **里程碑 2**: Layer 1 完成 - 认证系统 GraphQL 化
- [ ] **里程碑 3**: Layer 2 完成 - 所有业务服务 GraphQL 化
- [ ] **里程碑 4**: Layer 3 完成 - UI 组件迁移完成
- [ ] **里程碑 5**: Layer 4 完成 - 项目清理和优化完成

---

### 风险和注意事项

#### 高风险项
1. **AuthService 重构** (Task 1.4)
   - 影响范围: 所有需要认证的功能
   - 建议: 优先完成并充分测试

2. **ScreensService 重构** (Task 2.1)
   - 影响范围: 核心编辑器功能
   - 建议: 逐步迁移，保留回退方案

3. **EventsService 重构** (Task 2.2)
   - 影响范围: 事件管理全流程
   - 建议: 分阶段测试 CRUD 功能

#### 中风险项
- GraphQL Schema 不匹配
- 类型转换错误
- 状态管理兼容性

#### 降低风险建议
1. 每完成一个 Service，立即运行类型检查
2. 逐步迁移，保持应用可运行状态
3. 关键功能优先添加单元测试
4. 使用 Git 分支隔离变更

---

### 验证检查清单

#### Layer 0 验证
- [x] `pnpm run codegen` 成功执行
- [ ] GraphqlGateway 编译通过
- [x] Logger 工具可正常使用
- [x] 目录结构创建完整

#### Layer 1 验证
- [ ] 登录成功
- [ ] 注册成功
- [ ] Token 刷新正常
- [ ] 退出登录正常
- [ ] Me 查询返回正确数据
- [ ] 错误处理符合预期

#### Layer 2 验证 (每个服务)
- [ ] List 查询成功
- [ ] Detail 查询成功
- [ ] Create 操作成功
- [ ] Update 操作成功
- [ ] Delete 操作成功
- [ ] 特殊操作（publish/draft/archive 等）成功
- [ ] 错误处理正常

#### Layer 3 验证
- [ ] 所有页面正常渲染
- [ ] 数据加载正常
- [ ] 表单提交成功
- [ ] 列表操作（排序、筛选、分页）正常
- [ ] Toast 消息正常显示
- [ ] 加载状态正常

#### Layer 4 验证
- [ ] SDK 依赖完全移除
- [ ] 无废弃导入
- [ ] TypeScript 编译无错误
- [ ] ESLint 无警告
- [ ] 构建成功
- [ ] E2E 测试通过
- [ ] 文档完整

---

### 代码质量标准

#### TypeScript
- 所有类型必须显式声明
- 禁止使用 `any`
- 优先使用生成的 GraphQL 类型

#### RxJS
- 使用 `from()` 转换 Promise
- 正确使用 `catchError` 和 `finalize`
- 避免嵌套订阅

#### GraphQL
- 查询字段最小化（只查询需要的字段）
- 使用 Fragment 复用字段定义
- 合理设置重试和超时

#### 错误处理
- 统一错误格式
- 用户友好的错误消息
- 结构化日志记录

---

### 性能优化建议

1. **GraphQL 查询优化**
   - 避免过度获取（Over-fetching）
   - 使用分页（Pagination）
   - 合理使用缓存

2. **状态管理优化**
   - 避免不必要的状态更新
   - 使用 Akita 的 update 方法批量更新
   - 合理使用 loading 状态

3. **组件优化**
   - 使用 OnPush 变更检测策略
   - 避免在模板中使用函数调用
   - 合理使用 trackBy

---

### 后续优化方向

完成迁移后，可以考虑以下优化：

1. **引入 Apollo Client**
   - 更强大的缓存机制
   - 自动重试和轮询
   - 开发者工具支持

2. **GraphQL Subscriptions**
   - 实时数据更新
   - 减少轮询开销

3. **批量查询优化**
   - DataLoader 模式
   - Query Batching

4. **代码生成优化**
   - 自定义 CodeGen 插件
   - 生成 Mock 数据
   - 生成测试用例

---

## 📝 附录

### 参考文档

- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [graphql-request](https://github.com/jasonkuhrt/graphql-request)
- [TypedDocumentNode](https://github.com/dotansimha/graphql-typed-document-node)
- [@pro/web 实现](../apps/web/src/app/core)

### 相关文件路径

```
apps/
├── web/                          # 参考实现
│   ├── codegen.ts               # CodeGen 配置
│   ├── src/app/core/
│   │   ├── graphql/
│   │   │   ├── *.graphql        # GraphQL 查询
│   │   │   ├── graphql-gateway.service.ts
│   │   │   └── generated/       # 生成的类型
│   │   ├── services/
│   │   │   └── auth.service.ts  # 参考服务实现
│   │   └── utils/
│   │       ├── logger.ts        # Logger 工具
│   │       └── user-mapper.ts   # 类型映射
│   └── package.json
│
└── admin/                        # 待升级项目
    ├── codegen.ts               # 待创建
    ├── src/app/
    │   ├── core/
    │   │   ├── graphql/         # 待创建
    │   │   └── utils/           # 待创建
    │   └── state/
    │       └── *.service.ts     # 待重构
    └── package.json
```

---

## ✅ 完成标志

当以下所有条件满足时，迁移完成：

1. ✅ 所有 Layer 任务完成
2. ✅ 所有验证检查清单通过
3. ✅ `pnpm run build` 成功
4. ✅ `pnpm run typecheck` 无错误
5. ✅ `pnpm run lint` 无警告
6. ✅ E2E 测试全部通过
7. ✅ 无 @pro/sdk 依赖
8. ✅ 迁移文档完成

---

**生成时间**: 2025-10-16
**文档版本**: 1.0
**目标项目**: @pro/admin
**参考项目**: @pro/web

# 微博数据服务层

## 文件概览

- `weibo-data.types.ts` - TypeScript 类型定义
- `weibo-data.graphql.ts` - GraphQL 查询和片段定义
- `weibo-data.service.ts` - Angular 服务层(待实现)

## 当前状态

这些文件目前处于**类型定义阶段**。服务方法已经定义但尚未实现,等待后端 GraphQL API 完成。

## 类型定义说明

### 核心数据类型

- `WeiboUser` - 微博用户信息
- `WeiboPost` - 微博帖子
- `WeiboComment` - 微博评论
- `WeiboInteraction` - 用户互动(点赞、转发、评论、收藏)

### 筛选和分页

- `PostFilter`, `CommentFilter`, `InteractionFilter` - 数据筛选条件
- `Pagination` - 分页参数
- `Sort` - 排序参数

### 统计类型

- `PostStats` - 帖子统计信息
- `CommentStats` - 评论统计信息
- `InteractionStats` - 互动统计信息

### GraphQL Connection 模式

所有列表查询都遵循 GraphQL Connection 模式:
- `edges` - 数据节点数组
- `pageInfo` - 分页信息
- `totalCount` - 总数

## 后续实现步骤

### 1. 后端 GraphQL API 开发

在后端需要实现以下 GraphQL 查询:

```graphql
type Query {
  posts(filter: PostFilter, pagination: Pagination, sort: Sort): PostsConnection!
  post(id: ID!): WeiboPost
  postStats(filter: PostFilter): PostStats!

  comments(filter: CommentFilter, pagination: Pagination, sort: Sort): CommentsConnection!
  comment(id: ID!): WeiboComment
  commentStats(filter: CommentFilter): CommentStats!

  interactions(filter: InteractionFilter, pagination: Pagination, sort: Sort): InteractionsConnection!
  interaction(id: ID!): WeiboInteraction
  interactionStats(filter: InteractionFilter): InteractionStats!
}
```

### 2. 重新生成 GraphQL TypeScript 定义

后端 API 完成后,运行代码生成工具更新 `generated/graphql.ts`:

```bash
cd apps/admin
pnpm run codegen
```

### 3. 实现服务层方法

更新 `weibo-data.service.ts`,使用 `GraphqlGateway` 和生成的 TypeScript 类型:

```typescript
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import {
  GetPostsDocument,
  GetPostDocument,
  // ... 其他生成的 Document
} from '../graphql/generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class WeiboDataService {
  constructor(private readonly graphql: GraphqlGateway) {}

  getPosts(filter?, pagination?, sort?): Observable<PostsResponse> {
    return from(
      this.graphql.request(GetPostsDocument, { filter, pagination, sort })
    ).pipe(
      map(response => ({
        posts: response.posts
      }))
    );
  }

  // ... 实现其他方法
}
```

### 4. 测试和优化

- 编写单元测试
- 集成到页面组件中
- 根据实际使用情况调整类型定义

## 设计原则

- **极简**: 只定义前端需要的字段
- **类型安全**: 使用 TypeScript 严格类型
- **可维护**: 结构清晰,易于扩展
- **一致性**: 遵循现有的服务层模式(参考 `weibo-account.service.ts`)

## 参考

- `/home/ubuntu/worktrees/pro/apps/admin/src/app/core/services/weibo-account.service.ts`
- `/home/ubuntu/worktrees/pro/packages/entities/src/weibo-post.entity.ts`
- `/home/ubuntu/worktrees/pro/packages/entities/src/weibo-comment.entity.ts`
- `/home/ubuntu/worktrees/pro/packages/entities/src/weibo-interaction.entity.ts`

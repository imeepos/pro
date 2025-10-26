# PostDetailWorkflow - 帖子详情工作流

## 概述

PostDetailWorkflow 是一个基于 DAG（有向无环图）的工作流，用于抓取微博帖子的完整详情数据，包括帖子内容、评论、点赞等信息。

## 架构设计

### DAG 结构

```
FetchPostDetailAst (抓取详情)
    │
    ├──> FetchCommentsAst (抓取评论)
    │         │
    │         └──> SavePostDetailAst (保存数据)
    │
    └──> FetchLikesAst (抓取点赞)
              │
              └──> SavePostDetailAst (保存数据)
```

**执行策略**: FetchPostDetailAst 完成后，FetchCommentsAst 和 FetchLikesAst 并行执行，最后所有数据汇总到 SavePostDetailAst 保存。

### AST 节点

#### 1. FetchPostDetailAst
- **功能**: 抓取帖子详情
- **输入**:
  - `postId` - 帖子ID
  - `cookies` - 认证Cookie（可选）
  - `headers` - 请求头（可选）
- **输出**:
  - `detail` - 帖子详情数据
  - `authorId` - 作者用户ID

#### 2. FetchCommentsAst
- **功能**: 抓取评论列表（支持分页）
- **输入**:
  - `postId` - 帖子ID
  - `uid` - 用户ID（从详情中获取）
  - `maxPages` - 最大抓取页数（默认5页）
  - `cookies`, `headers` - 认证信息
- **输出**:
  - `comments` - 评论列表
  - `totalComments` - 评论总数

#### 3. FetchLikesAst
- **功能**: 抓取点赞信息
- **输入**:
  - `postId` - 帖子ID
  - `maxUsers` - 最大点赞用户数（默认100）
  - `cookies`, `headers` - 认证信息
- **输出**:
  - `likes` - 点赞用户列表
  - `totalLikes` - 点赞总数

#### 4. SavePostDetailAst
- **功能**: 保存所有数据到MongoDB
- **输入**:
  - `postId` - 帖子ID
  - `detail` - 帖子详情
  - `comments` - 评论列表
  - `likes` - 点赞列表
  - `metadata` - 额外元数据
- **输出**:
  - `rawDataId` - MongoDB文档ID
  - `success` - 保存是否成功

## 使用方法

### 方式一：直接执行工作流

```typescript
import { executePostDetailWorkflow } from '@pro/workflow-nestjs'

const result = await executePostDetailWorkflow(
  { postId: '5087617097861302' },
  { maxCommentPages: 3, maxLikeUsers: 50 }
)

console.log(result)
// {
//   success: true,
//   rawDataId: '507f1f77bcf86cd799439011',
//   authorId: '1195230310'
// }
```

### 方式二：创建工作流实例

```typescript
import { createPostDetailWorkflow } from '@pro/workflow-nestjs'
import { execute } from '@pro/workflow-core'

const workflow = createPostDetailWorkflow(
  { postId: '5087617097861302', metadata: { keyword: '国庆' } },
  { maxCommentPages: 5 }
)

const result = await execute(workflow)
```

### 方式三：与 MainSearchWorkflow 集成

```typescript
// 在 MainSearchWorkflow 中调用
const postIds = extractPostIds(html)

for (const postId of postIds) {
  const result = await executePostDetailWorkflow(
    {
      postId,
      metadata: { keyword, discoveredAt: new Date() }
    }
  )

  if (result.success && result.authorId) {
    // 触发 UserProfileWorkflow（Agent 3 实现）
    await executeUserProfileWorkflow({ userId: result.authorId })
  }
}
```

## 配置参数

```typescript
interface PostDetailWorkflowConfig {
  maxCommentPages?: number  // 最大评论页数，默认 5
  maxLikeUsers?: number     // 最大点赞用户数，默认 100
}

interface PostDetailWorkflowInput {
  postId: string
  metadata?: Record<string, any>  // 自定义元数据
}
```

## 数据保存格式

保存到 MongoDB 的数据结构：

```typescript
{
  sourceType: 'WEIBO_API_JSON',
  sourceUrl: 'https://weibo.com/detail/5087617097861302',
  rawContent: JSON.stringify({
    detail: { ... },      // WeiboStatusDetailResponse
    comments: [ ... ],    // WeiboCommentEntity[]
    likes: [ ... ]        // WeiboStatusAttitude[]
  }),
  metadata: {
    postId: '5087617097861302',
    commentCount: 150,
    likeCount: 50,
    keyword: '国庆',      // 自定义字段
    discoveredAt: '2025-10-25T00:00:00.000Z'
  }
}
```

## 错误处理

工作流采用优雅降级策略：

- 评论抓取失败：不影响详情和点赞，继续执行
- 点赞抓取失败：不影响详情和评论，继续执行
- 详情抓取失败：整个工作流失败（因为详情是核心数据）

```typescript
// 每个节点都有独立的状态
node.state // 'pending' | 'running' | 'success' | 'fail'

// 部分失败示例
{
  success: true,  // SavePostDetailAst 成功
  rawDataId: '...',
  // 但某些节点可能失败（例如评论抓取）
}
```

## 性能优化

1. **并行执行**: FetchCommentsAst 和 FetchLikesAst 并行抓取
2. **分页控制**: 通过 `maxCommentPages` 限制评论抓取量
3. **数量限制**: 通过 `maxLikeUsers` 限制点赞用户数
4. **原始保存**: 不做数据清洗，直接保存原始JSON

## 与其他工作流的集成接口

### 输入接口（从 MainSearchWorkflow）

```typescript
// MainSearchWorkflow 输出帖子ID列表
const postIds: string[] = parseSearchResultHtml(html)

// 传递给 PostDetailWorkflow
for (const postId of postIds) {
  await executePostDetailWorkflow({ postId })
}
```

### 输出接口（给 UserProfileWorkflow）

```typescript
// PostDetailWorkflow 输出作者ID
const { authorId } = await executePostDetailWorkflow({ postId })

// 传递给 UserProfileWorkflow（Agent 3 实现）
if (authorId) {
  await executeUserProfileWorkflow({ userId: authorId })
}
```

## 实现文件列表

- `/packages/workflow-nestjs/src/workflows/post-detail.ast.ts` - AST节点定义
- `/packages/workflow-nestjs/src/workflows/post-detail.visitor.ts` - Visitor实现
- `/packages/workflow-nestjs/src/workflows/post-detail.workflow.ts` - 工作流编排
- `/packages/workflow-nestjs/src/workflows/index.ts` - 导出接口

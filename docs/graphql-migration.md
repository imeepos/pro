# GraphQL 迁移指引

## Endpoint 与协议
- GraphQL 统一入口：`POST /graphql`
- Subscription 使用 `graphql-ws` 协议，WebSocket URL 示例：`ws://<host>/graphql`
- 所有历史 REST `/api/*` 路径现返回 `410 Gone`，响应体包含迁移提示与原始路径

## 健康检查
```graphql
query Health {
  health {
    status
    timestamp
  }
}
```
> 返回值 `status` 固定为 `healthy`，`timestamp` 为 ISO8601 时间戳

## 认证 / 授权
### 注册 / 登录
```graphql
mutation Register($input: RegisterDto!) {
  register(input: $input) {
    accessToken
    refreshToken
    user { id username email }
  }
}

mutation Login($input: LoginDto!) {
  login(input: $input) {
    accessToken
    refreshToken
  }
}
```

### 刷新 / 注销
```graphql
mutation Refresh($input: RefreshTokenDto!) {
  refreshToken(input: $input) {
    accessToken
    refreshToken
  }
}

mutation Logout {
  logout
}
```

### 当前用户
```graphql
query Me {
  me { id username email }
}
```

## 京东 / 微博登录
- 创建登录会话（Mutation）：`startJdLogin` / `startWeiboLogin`
- 查询会话状态（Query）：`jdLoginSession` / `weiboLoginSession`
- 实时事件（Subscription）：`jdLoginEvents` / `weiboLoginEvents`

### Subscription 快速上手
```ts
import { createClient } from 'graphql-ws';

const wsClient = createClient({ url: 'ws://localhost:3000/graphql' });

const unsubscribe = wsClient.subscribe(
  {
    query: `subscription ($sessionId: String!) {
      weiboLoginEvents(sessionId: $sessionId) {
        type
        data
      }
    }`,
    variables: { sessionId: 'xxx' },
  },
  {
    next: ({ data }) => console.log('event', data?.weiboLoginEvents),
    error: (err) => console.error(err),
    complete: () => console.log('completed'),
  },
);

// 调用 unsubscribe() 结束订阅
```


## 统一分页
- 所有列表遵循 Offset Connection：
  ```graphql
  query Example($filter: XXXQueryDto) {
    xs(filter: $filter) {
      edges { cursor node { ... } }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      totalCount
    }
  }
  ```

## 附件上传
1. `requestEventAttachmentUpload` 获取预签名上传凭证
2. 客户端直传 MinIO
3. `confirmEventAttachmentUpload` 确认附件并落库

## 迁移建议
1. 更新所有客户端改用 GraphQL Query/Mutation，与 Subscription 结合完成实时场景
2. 健康探针与监控改为调用 `health` 查询
3. 若需历史 REST 调试，可在响应 410 内容中查阅原路径并对照 GraphQL 模型

## REST → GraphQL 对照速查

| 历史 REST Path | GraphQL 等价操作 | 备注 |
| --- | --- | --- |
| `POST /api/auth/register` | `register(input: RegisterDto!)` | 返回 accessToken / refreshToken / user |
| `POST /api/auth/login` | `login(input: LoginDto!)` | 同上 |
| `POST /api/auth/refresh` | `refreshToken(input: RefreshTokenDto!)` | 刷新双 token |
| `POST /api/auth/logout` | `logout` | Mutation，需携带 Bearer Token |
| `GET /api/auth/profile` | `me` | Query，返回当前用户模型 |
| `GET /api/dashboard/stats` | `dashboardStats` | GraphQL Query，保留原聚合逻辑 |
| `GET /api/dashboard/recent-activities` | `dashboardRecentActivities` | GraphQL Query |
| `GET /api/screens` | `screens` Connection | 支持分页 / 过滤 |
| `POST /api/screens` | `createScreen` | Mutation 对应原创建接口 |
| `POST /api/weibo/login/start` | `startWeiboLogin` + `weiboLoginEvents` | Mutation 创建会话，Subscription 监听事件 |
| `POST /api/jd/login/start` | `startJdLogin` + `jdLoginEvents` | 同上 |
| `POST /api/events/:id/attachments` | `requestEventAttachmentUpload` + `confirmEventAttachmentUpload` | 双阶段直传流程 |
| 其余 `/api/*` | 对应模块 GraphQL Query/Mutation | 详见本文各章节 |

> 如遇未列出的历史接口，可参考 GraphQL Schema 或联系后端同事获取具体映射。

# WebSocket JWT 认证验证指南

## 修复概述

已成功修复 WebSocket GraphQL JWT 认证问题，确保 `connection_init` 消息中的 JWT Token 能够被正确提取和验证。

## 修复内容

### 1. GraphQL WebSocket 配置优化 (`/home/ubuntu/worktrees/pro/apps/api/src/app.module.ts`)

- **修复类型兼容性**：`onConnect` 处理器现在返回包含 `context` 属性的对象，符合 `graphql-ws` 的类型要求
- **改进错误处理**：提供具体的认证失败错误信息
- **上下文传递优化**：确保 WebSocket 连接的认证上下文能够正确传递到 GraphQL 解析器

### 2. WebSocket 认证服务增强 (`/home/ubuntu/worktrees/pro/apps/api/src/auth/services/graphql-ws-auth.service.ts`)

- **详细错误信息**：区分不同类型的认证错误（缺少授权、格式无效、Token过期等）
- **Token 黑名单检查**：防止已撤销的 Token 被使用
- **异常处理优化**：提供用户友好的错误消息

### 3. 上下文创建器改进 (`/home/ubuntu/worktrees/pro/apps/api/src/auth/utils/graphql-ws-context.util.ts`)

- **错误传播**：确保认证错误能够正确传播到上层
- **上下文结构一致性**：WebSocket 和 HTTP 连接使用相同的上下文结构

### 4. 类型定义更新 (`/home/ubuntu/worktrees/pro/apps/api/src/common/utils/context.utils.ts`)

- **WebSocket 支持**：为 `AugmentedRequest` 类型添加 `websocket` 和 `connectionParams` 属性

## 使用方法

### 客户端连接示例

```javascript
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'ws://localhost:3000/graphql',
  connectionParams: {
    // 提供 Bearer Token 进行认证
    authorization: 'Bearer YOUR_JWT_TOKEN_HERE'
  },
});
```

### 连接流程

1. **连接建立**：客户端建立 WebSocket 连接
2. **发送 connection_init**：客户端发送带有 `authorization` 的 `connection_init` 消息
3. **Token 验证**：服务器提取并验证 JWT Token
4. **上下文创建**：创建包含用户信息的 GraphQL 上下文
5. **连接确认**：认证成功后发送 `connection_ack` 消息

### 错误处理

- **缺少授权**：`WebSocket连接缺少授权信息`
- **格式无效**：`WebSocket连接授权格式无效，期望 Bearer Token`
- **Token过期**：`Token已过期，请重新登录`
- **Token黑名单**：`Token已失效，请重新登录`
- **格式错误**：`Token格式无效`

## 验证步骤

1. **启动API服务**：
   ```bash
   cd /home/ubuntu/worktrees/pro/apps/api
   pnpm run start:dev
   ```

2. **使用有效Token连接**：
   - 首先通过登录获取有效的 JWT Token
   - 使用该 Token 建立 WebSocket 连接
   - 验证连接成功且能够执行需要认证的操作

3. **使用无效Token连接**：
   - 使用无效的 Token 连接
   - 验证连接被拒绝并收到适当的错误信息

4. **使用过期Token连接**：
   - 使用已过期的 Token 连接
   - 验证连接被拒绝并收到 "Token已过期" 错误

## 向后兼容性

- **HTTP API 认证**：完全保持不变，现有的 HTTP 认证逻辑不受影响
- **现有 JWT 配置**：保持一致，使用相同的 JWT 密钥和验证逻辑
- **GraphQL 解析器**：无需修改，继续使用现有的认证检查

## 安全特性

- **Token 验证**：完整的 JWT 签名验证
- **过期检查**：拒绝过期的 Token
- **黑名单机制**：支持 Token 撤销
- **错误信息安全**：不泄露敏感的认证细节

## 性能优化

- **高效验证**：使用优化的 JWT 验证流程
- **缓存机制**：Redis 黑名单检查性能优化
- **异步处理**：非阻塞的认证流程

这个修复确保了 WebSocket 连接具有与 HTTP API 相同级别的安全性和一致性，为实时 GraphQL 功能提供了可靠的身份验证基础。
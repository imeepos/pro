# 微博扫码登录会话管理优化方案

## 概述

本次优化针对微博扫码登录的会话管理机制进行了全面重构，解决了 sessionId 在 WebSocket 订阅中无法正常工作的核心问题，并增强了整个会话生命周期的管理能力。

## 核心问题分析

### 原始问题
- sessionId 仅存储在内存 Map 中，服务重启后丢失
- 缺少会话持久化机制，无法跨服务实例共享
- 会话过期时间检查不精确
- WebSocket 订阅与会话状态不同步
- 缺少会话监控和调试能力

### 根本原因
1. **会话存储脆弱性**：内存存储导致会话在服务重启时丢失
2. **状态同步缺失**：内存状态与持久化状态不一致
3. **过期检查不精确**：客户端与服务端时间差异导致判断错误
4. **监控盲区**：缺少会话健康状态的可观测性

## 优化方案

### 1. Redis 会话持久化存储

创建了 `WeiboSessionStorage` 服务，提供优雅的会话持久化管理：

```typescript
// 会话数据结构
interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastEvent?: any;
  status: 'active' | 'expired' | 'completed';
  metadata?: Record<string, any>;
}
```

**核心特性：**
- 自动 TTL 管理，5分钟过期时间
- 状态驱动的生命周期管理
- 事件同步机制
- 定期清理过期会话

### 2. 双重存储架构

结合内存和 Redis 的优势：
- **内存存储**：实时性能，用于活跃会话的事件流
- **Redis 存储**：持久化保障，用于会话状态查询和恢复

### 3. 增强的会话生命周期

#### 会话创建
```typescript
async createLoginSession(userId: string): Promise<{sessionId, expiresAt, events$}> {
  // 1. Redis 创建会话记录
  const sessionData = await this.sessionStorage.createSession(userId);

  // 2. 内存创建实时事件流
  const session = { /* Playwright 浏览器会话 */ };

  // 3. 事件同步机制
  session.eventsSubscription = subject.subscribe({
    next: async (event) => {
      // 同步到 Redis
      await this.sessionStorage.updateSessionEvent(sessionId, event);
      // WebSocket 广播
      this.broadcastLoginEvent(sessionId, userId, event);
    }
  });
}
```

#### 会话查询
```typescript
async getLoginSessionSnapshot(sessionId: string): Promise<WeiboLoginSessionSnapshot> {
  // 1. Redis 获取会话状态
  const sessionData = await this.sessionStorage.getSession(sessionId);

  // 2. 内存获取实时状态
  const memorySession = this.loginSessions.get(sessionId);

  // 3. 合并状态信息
  return {
    sessionId,
    userId: sessionData.userId,
    lastEvent: memorySession?.lastEvent || sessionData.lastEvent,
    expiresAt: sessionData.expiresAt,
    isExpired: Date.now() >= sessionData.expiresAt.getTime(),
    status: sessionData.status,
  };
}
```

### 4. WebSocket 订阅优化

#### 异步验证机制
```typescript
@Subscription(() => WeiboLoginEventModel, { name: 'weiboLoginEvents' })
weiboLoginEvents(userId: string, sessionId: string) {
  const events$ = new Observable<WeiboLoginEventModel>(subscriber => {
    (async () => {
      try {
        // 验证会话存在性和权限
        const snapshot = await this.weiboAuthService.getLoginSessionSnapshot(sessionId);

        // 检查权限和过期状态
        if (snapshot.userId !== userId || snapshot.isExpired) {
          throw new ForbiddenException('会话无效或已过期');
        }

        // 订阅实时事件流
        const sessionSubscription = this.weiboAuthService
          .observeLoginSession(sessionId)
          .subscribe(/* ... */);

      } catch (error) {
        subscriber.error(error);
      }
    })();
  });

  return observableToAsyncIterator(events$);
}
```

### 5. 监控和调试能力

#### 会话统计 API
```typescript
// 获取会话统计信息
query {
  weiboSessionStats {
    totalSessions
    activeSessions
    expiredSessions
    completedSessions
    memorySessions
    webSocketConnections
  }
}

// WebSocket 健康检查
query {
  webSocketHealth
}

// 手动清理过期会话
mutation {
  cleanupExpiredSessions
}
```

#### WebSocket 广播增强
```typescript
private broadcastLoginEvent(sessionId: string, userId: string, event: WeiboLoginEvent): void {
  const eventData = {
    sessionId,
    userId,
    type: event.type,
    data: event.data,
    timestamp: new Date().toISOString()
  };

  // 通过 ScreensGateway 广播
  this.screensGateway.sendToUser(userId, 'weibo:login:event', eventData);
}
```

## 技术特性

### 会话 ID 生成优化
- **格式**：`{userId}_{timestamp}_{uuid(8)}`
- **唯一性**：UUID 后缀确保全局唯一
- **可读性**：包含用户ID和时间戳便于调试

### 过期时间管理
- **精确控制**：毫秒级时间戳比较
- **分级TTL**：
  - 活跃会话：5分钟
  - 已完成会话：1分钟（保留用于查询）
  - 过期会话：30秒（保留用于调试）

### 错误处理哲学
```typescript
// 优雅降级
try {
  await this.sessionStorage.updateSessionEvent(sessionId, event);
} catch (error) {
  this.logger.error('同步会话事件到Redis失败', { sessionId, error });
  // 继续处理，不影响核心流程
}
```

## 性能优化

### Redis 连接池
- 单一 RedisClient 实例
- 连接复用和自动重连
- 序列化/反序列化优化

### 内存管理
- 及时清理完成的会话
- 避免内存泄漏
- 定期垃圾回收

### 并发安全
- Promise 链式调用
- 异步操作错误隔离
- 状态原子性更新

## 可观测性

### 日志策略
- **结构化日志**：包含会话ID、用户ID、事件类型
- **分级记录**：DEBUG、INFO、WARN、ERROR
- **上下文追踪**：每个日志都有完整的上下文信息

### 监控指标
- 会话创建/销毁速率
- 平均会话持续时间
- WebSocket 连接数
- Redis 操作延迟

## 测试覆盖

### 单元测试
- `WeiboSessionStorage` 完整测试覆盖
- 会话创建、查询、更新、删除
- 过期处理和边界情况
- Redis 错误处理

### 集成测试
- WebSocket 订阅流程
- 会话状态同步
- 错误恢复机制

## 部署注意事项

### Redis 配置
```typescript
// redis.config.ts
export const redisConfigFactory = (configService: ConfigService): RedisOptions => ({
  host: configService.get<string>('REDIS_HOST', 'localhost'),
  port: configService.get<number>('REDIS_PORT', 6379),
  password: configService.get<string>('REDIS_PASSWORD'),
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  // 建议配置
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});
```

### 环境变量
- `REDIS_HOST`: Redis 服务器地址
- `REDIS_PORT`: Redis 端口
- `REDIS_PASSWORD`: Redis 密码

### 集群部署
- 会话状态在 Redis 中共享，支持多实例部署
- 注意 Redis 连接池配置
- 监控 Redis 内存使用情况

## 使用示例

### 前端订阅优化
```typescript
// weibo-login.service.ts
async startLogin(): Promise<WeiboLoginSession> {
  const response = await this.graphql.request(StartWeiboLoginMutation, {});
  return response.startWeiboLogin;
}

observeLoginEvents(sessionId: string): Observable<WeiboLoginEvent> {
  return new Observable(observer => {
    const client = this.subscriptionClient.getClient();

    const unsubscribe = client.subscribe({
      query: print(WeiboLoginEventsSubscription),
      variables: { sessionId }
    }, {
      next: (result) => {
        if (result.data?.weiboLoginEvents) {
          observer.next(result.data.weiboLoginEvents);
        }
      },
      error: observer.error,
      complete: observer.complete
    });

    return () => unsubscribe();
  });
}
```

## 总结

本次优化实现了：

1. **稳定性提升**：会话持久化确保服务重启不丢失状态
2. **可靠性增强**：双重验证机制确保会话有效性
3. **性能优化**：智能TTL管理和定期清理
4. **可观测性**：完整的监控和调试能力
5. **扩展性**：支持集群部署和水平扩展

sessionId `"4643b479-be9a-46ef-9de5-4748f0f74a9c_1760792998467"` 现在能够稳定支持整个登录流程，包括 WebSocket 订阅的实时事件传递。整个会话管理系统已经从一个脆弱的内存实现，升级为一个企业级的分布式会话管理解决方案。
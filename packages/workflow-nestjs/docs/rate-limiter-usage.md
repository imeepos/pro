# RateLimiterService 使用文档

## 概述

RateLimiterService 使用 Redis Sorted Set 实现滑动窗口算法，提供精准的速率限制功能。

## 滑动窗口算法原理

### 算法说明

1. **时间戳记录**: 每次请求记录当前时间戳到 Redis Sorted Set
2. **窗口清理**: 删除窗口外的旧记录（当前时间 - 窗口大小）
3. **计数检查**: 统计当前窗口内的请求数
4. **限流判断**: 若超过限制则拒绝，否则允许并记录

### 时间复杂度

- `zremrangebyscore`: O(log N + M)，N 是集合大小，M 是删除元素数
- `zcard`: O(1)
- `zadd`: O(log N)

平均每次检查: **O(log N)**，高效且精准

### 与固定窗口的区别

```
固定窗口（有突刺问题）:
|---- 窗口1 ----||---- 窗口2 ----|
  50 req         50 req
          ^^^^^^ 这里可能有 100 req/s 突刺

滑动窗口（平滑限流）:
|=========== 60s 窗口 ===========|
                |=========== 60s 窗口 ===========|
```

## 预设策略

```typescript
RATE_LIMIT_CONFIGS.ACCOUNT  // 账号: 30次/分钟
RATE_LIMIT_CONFIGS.GLOBAL   // 全局: 100次/分钟
RATE_LIMIT_CONFIGS.IP       // IP: 50次/分钟
RATE_LIMIT_CONFIGS.STRICT   // 严格: 10次/分钟
```

## 使用示例

### 基本用法

```typescript
const result = await rateLimiter.checkRateLimit(
  'account:123',
  RATE_LIMIT_CONFIGS.ACCOUNT
);

if (result.allowed) {
  // 执行请求
} else {
  // 等待或拒绝
  console.log(`超限，${result.current}/${result.limit}，重置于 ${result.resetAt}`);
}
```

### 等待重置

```typescript
if (!result.allowed) {
  const waitMs = result.resetAt.getTime() - Date.now();
  if (waitMs > 0 && waitMs < 60000) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
    // 重试请求
  }
}
```

### 自定义策略

```typescript
const customConfig: RateLimitConfig = {
  limit: 5,        // 5次
  windowMs: 10000  // 10秒
};

await rateLimiter.checkRateLimit('custom-key', customConfig);
```

### 查询状态（不消费配额）

```typescript
const status = await rateLimiter.getStatus(
  'account:123',
  RATE_LIMIT_CONFIGS.ACCOUNT
);

console.log(`剩余: ${status.remaining}/${config.limit}`);
```

### 重置限制

```typescript
await rateLimiter.reset('account:123');
```

## 错误处理

服务采用优雅降级策略：

```typescript
try {
  // Redis 操作
} catch (error) {
  logger.error('速率限制检查失败', { key, error });
  // 默认允许通过，避免服务中断
  return { allowed: true, ... };
}
```

## 性能特性

### 内存占用

每个时间窗口约占用：
- 每次请求: ~50 bytes (score + member)
- 30次/分钟: ~1.5KB
- 自动过期: 窗口时间 × 2

### 并发安全

Redis 原子操作保证并发安全：
- `zremrangebyscore`: 原子删除
- `zcard`: 原子计数
- `zadd`: 原子添加

### 分布式支持

基于 Redis 实现，天然支持分布式环境下的统一限流。

## 与 AccountHealthService 协作

```typescript
// 1. 选择最佳健康账号
const account = await accountHealth.getBestHealthAccount();

// 2. 检查速率限制
const rateLimitResult = await rateLimiter.checkRateLimit(
  `account:${account.id}`,
  RATE_LIMIT_CONFIGS.ACCOUNT
);

if (!rateLimitResult.allowed) {
  // 等待或使用其他账号
}

// 3. 执行请求

// 4. 扣减健康度
await accountHealth.deductHealth(account.id, 1);
```

## 监控建议

### 关键指标

```typescript
// 限流触发率
const hitRate = rejectedCount / totalCount;

// 平均等待时间
const avgWait = totalWaitMs / waitCount;

// 当前使用率
const usage = result.current / config.limit;
```

### 日志示例

```
[RateLimiter] 账号超过速率限制 | accountId=123 | current=31/30 | resetAt=2025-10-26T12:35:00Z
[RateLimiter] 速率限制检查失败 | key=account:123 | error=Redis connection timeout
```

## 最佳实践

1. **分层限流**: 结合账号、IP、全局三层限流
2. **动态调整**: 根据平台响应调整 limit 值
3. **监控告警**: 限流触发率超过 10% 时告警
4. **优雅等待**: 短时间等待（< 60s）而非直接拒绝
5. **降级策略**: Redis 故障时允许通过，避免服务中断

# @pro/redis

## Package Overview

**Purpose**: Redis operations wrapper providing type-safe, elegant abstraction over ioredis

**Core Philosophy**: Minimal, purposeful Redis client that handles JSON serialization/deserialization automatically while exposing essential Redis operations through a clean, fluent interface.

**Key Features**:
- Automatic JSON serialization/deserialization
- Type-safe generic get operations
- Pipeline support for atomic batch operations
- Sorted Set operations (ZSET)
- Hash operations (HASH)
- TTL and expiration management
- Key pattern matching

---

## Directory Structure

```
packages/redis/
├── src/
│   └── index.ts           # Complete implementation (RedisClient + RedisPipeline)
├── package.json
├── tsconfig.json
├── tsconfig.types.json
└── tsup.config.ts
```

**Single-File Architecture**: The entire package exists in one elegantly crafted file (`index.ts`), embodying the principle of 存在即合理 (Existence Implies Necessity).

---

## Core Exports

### RedisClient

**Location**: `/home/ubuntu/worktrees/pro/packages/redis/src/index.ts`

The primary class for all Redis operations.

```typescript
export class RedisClient {
  constructor(options: RedisOptions | string)

  // Basic Operations
  async get<T = string>(key: string): Promise<T | null>
  async set(key: string, value: any, ttl?: number): Promise<void>
  async del(key: string): Promise<void>
  async exists(key: string): Promise<boolean>

  // Sorted Set Operations
  async zincrby(key: string, increment: number, member: string): Promise<number>
  async zrangebyscore(key: string, min: number, max: number, withScores?: boolean): Promise<string[]>

  // Hash Operations
  async hmset(key: string, data: Record<string, any>): Promise<string>

  // Expiration Operations
  async expire(key: string, seconds: number): Promise<number>
  async ttl(key: string): Promise<number>

  // Key Operations
  async keys(pattern: string): Promise<string[]>

  // Pipeline Operations
  pipeline(): RedisPipeline

  // Connection Management
  async close(): Promise<void>
}
```

### RedisPipeline

**Location**: `/home/ubuntu/worktrees/pro/packages/redis/src/index.ts`

Fluent interface for atomic batch operations.

```typescript
class RedisPipeline {
  zincrby(key: string, increment: number, member: string): RedisPipeline
  expire(key: string, seconds: number): RedisPipeline
  hmset(key: string, data: Record<string, any>): RedisPipeline
  async exec(): Promise<[Error | null, any][]>
}
```

---

## Connection Management Patterns

### Pattern 1: Direct Instantiation (Common)

```typescript
import { RedisClient } from '@pro/redis';

// String connection URL
const redis = new RedisClient('redis://localhost:6379');

// Object configuration
const redis = new RedisClient({
  host: 'localhost',
  port: 6379,
  password: 'secret',
  db: 0
});
```

### Pattern 2: NestJS Service Integration

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClient } from '@pro/redis';

@Injectable()
export class MyService {
  private redisClient: RedisClient;

  constructor(private configService: ConfigService) {
    this.redisClient = new RedisClient({
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
      password: configService.get('REDIS_PASSWORD'),
      db: configService.get('REDIS_DB', 0)
    });
  }
}
```

### Pattern 3: Health Check on Init

```typescript
@Injectable()
export class StatsService implements OnModuleInit {
  constructor(private readonly redisClient: RedisClient) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.redisClient.set('test:connection', 'ok', 10);
      await this.redisClient.del('test:connection');
      console.log('Redis connection successful');
    } catch (error) {
      console.error('Redis connection failed', error);
      throw error;
    }
  }
}
```

---

## Usage Examples

### 1. Basic Caching

```typescript
// Store string or object (auto-serialized)
await redis.set('user:123', { id: 123, name: 'Alice' }, 3600);

// Retrieve with type inference
const user = await redis.get<{ id: number; name: string }>('user:123');

// Check existence
const exists = await redis.exists('user:123');

// Delete
await redis.del('user:123');
```

**Elegance Note**: The `get<T>` method automatically handles JSON parsing, falling back to raw string if parsing fails. No explicit serialization logic clutters your code.

### 2. Statistics with Sorted Sets

```typescript
// Increment counter (atomic operation)
const newScore = await redis.zincrby('stats:views', 1, 'page:home');

// Get range by score
const topPages = await redis.zrangebyscore('stats:views', 0, '+inf');

// Get range with scores
const pagesWithScores = await redis.zrangebyscore('stats:views', 0, '+inf', true);
```

**Real-world Usage**: Weibo hourly statistics tracking (see `/home/ubuntu/worktrees/pro/apps/api/src/weibo/weibo-hourly-stats.service.ts`)

### 3. Hash Operations

```typescript
// Store structured data
await redis.hmset('user:123:profile', {
  username: 'alice',
  email: 'alice@example.com',
  lastLogin: new Date().toISOString()
});

// Set expiration
await redis.expire('user:123:profile', 7200);
```

### 4. TTL Management

```typescript
// Set key with TTL
await redis.set('session:abc', { userId: 123 }, 1800);

// Check remaining TTL
const remainingTTL = await redis.ttl('session:abc');

// Extend expiration
await redis.expire('session:abc', 3600);
```

### 5. Pattern Matching

```typescript
// Find all keys matching pattern
const sessionKeys = await redis.keys('session:*');
const statsKeys = await redis.keys('stats:views:*');
```

**Warning**: `keys()` is blocking and should not be used in production for large keyspaces. Prefer SCAN in production environments (not currently implemented in this package).

### 6. Pipeline for Atomic Batch Operations

```typescript
// Execute multiple operations atomically
const results = await redis.pipeline()
  .zincrby('stats:views', 10, 'page:home')
  .expire('stats:views', 86400)
  .hmset('stats:metadata', { updated: Date.now() })
  .exec();

// Check results
results.forEach(([error, result]) => {
  if (error) console.error('Pipeline operation failed', error);
});
```

**Real-world Usage**: Hourly stats recording with metadata (see `/home/ubuntu/worktrees/pro/apps/api/src/weibo/weibo-hourly-stats.service.ts:54-65`)

### 7. Token Blacklisting (Auth Pattern)

```typescript
// Blacklist revoked tokens
const TOKEN_BLACKLIST_PREFIX = 'blacklist:';
const tokenId = 'jwt-token-id';

await redis.set(
  `${TOKEN_BLACKLIST_PREFIX}${tokenId}`,
  'revoked',
  3600 // Expires when token would expire
);

// Check if token is blacklisted
const isBlacklisted = await redis.exists(`${TOKEN_BLACKLIST_PREFIX}${tokenId}`);
```

**Real-world Usage**: JWT token management (see `/home/ubuntu/worktrees/pro/apps/api/src/auth/auth.service.ts`)

### 8. Statistics Aggregation Pattern

```typescript
interface ConsumerStats {
  totalMessages: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  avgProcessingTime: number;
  lastProcessedAt?: Date;
}

// Retrieve stats
const stats = await redis.get<ConsumerStats>('weibo:consumer:stats');

// Update with TTL
await redis.set('weibo:consumer:stats', stats, 30 * 24 * 60 * 60); // 30 days

// Store processing time samples
const processingTimes = await redis.get<number[]>('weibo:consumer:stats:processing_times') || [];
processingTimes.push(newProcessingTime);
await redis.set('weibo:consumer:stats:processing_times', processingTimes, 30 * 24 * 60 * 60);
```

**Real-world Usage**: Consumer statistics tracking (see `/home/ubuntu/worktrees/pro/apps/api/src/weibo/weibo-stats-redis.service.ts`)

---

## Quick Reference Guide

### Common Operations

| Operation | Method | Example |
|-----------|--------|---------|
| Store value | `set(key, value, ttl?)` | `redis.set('key', 'value', 60)` |
| Retrieve value | `get<T>(key)` | `redis.get<User>('user:1')` |
| Delete key | `del(key)` | `redis.del('key')` |
| Check existence | `exists(key)` | `redis.exists('key')` |
| Increment score | `zincrby(key, incr, member)` | `redis.zincrby('scores', 1, 'player1')` |
| Get range | `zrangebyscore(key, min, max)` | `redis.zrangebyscore('scores', 0, 100)` |
| Store hash | `hmset(key, data)` | `redis.hmset('user:1', { name: 'Alice' })` |
| Set expiration | `expire(key, seconds)` | `redis.expire('key', 3600)` |
| Get TTL | `ttl(key)` | `redis.ttl('key')` |
| Find keys | `keys(pattern)` | `redis.keys('user:*')` |
| Batch operations | `pipeline()` | `redis.pipeline().set(...).exec()` |
| Close connection | `close()` | `redis.close()` |

### TTL Constants

```typescript
const ONE_MINUTE = 60;
const ONE_HOUR = 3600;
const ONE_DAY = 86400;
const ONE_WEEK = 604800;
const ONE_MONTH = 2592000;  // 30 days
```

### Key Naming Conventions

Follow Redis best practices with colon-separated namespaces:

```
{domain}:{entity}:{id}:{field}

Examples:
- auth:session:abc123
- stats:hourly:views:2025-10-16
- cache:user:profile:123
- blacklist:token:xyz789
- weibo:consumer:stats
```

---

## Design Philosophy

### 存在即合理 (Existence Implies Necessity)

Every method in `RedisClient` serves a unique, irreplaceable purpose:

- **`get<T>`**: Type-safe retrieval with automatic JSON parsing
- **`set`**: Universal storage with optional TTL
- **`zincrby`**: Atomic counter increments (critical for statistics)
- **`zrangebyscore`**: Range queries for time-series data
- **`hmset`**: Structured data storage without separate serialization
- **`pipeline`**: Atomic batch operations for data consistency

No redundant methods. No unnecessary abstractions. Each operation is chosen for real-world necessity.

### 优雅即简约 (Elegance is Simplicity)

**Automatic Serialization**: The package handles JSON conversion transparently:

```typescript
// You write this
await redis.set('user', { id: 1, name: 'Alice' });
const user = await redis.get<User>('user');

// Not this verbose alternative
await redis.set('user', JSON.stringify({ id: 1, name: 'Alice' }));
const userData = await redis.get('user');
const user = JSON.parse(userData) as User;
```

**Fluent Pipeline Interface**: Chainable operations read like prose:

```typescript
await redis.pipeline()
  .zincrby('stats', 1, 'view')
  .expire('stats', 3600)
  .hmset('metadata', { updated: Date.now() })
  .exec();
```

### 性能即艺术 (Performance is Art)

- **Atomic Operations**: `zincrby` for lock-free counters
- **Pipeline Support**: Batch operations reduce network round-trips
- **Automatic Type Inference**: Generic `get<T>` eliminates runtime type checking
- **Connection Pooling**: Delegates to ioredis's battle-tested connection management

---

## Integration Points

### Used By

1. **API Service** (`/home/ubuntu/worktrees/pro/apps/api`)
   - Authentication & token blacklisting
   - Weibo statistics tracking
   - Session management

2. **Other Services** (potential)
   - Any service requiring distributed caching
   - Rate limiting implementations
   - Real-time analytics

### Dependencies

- **ioredis**: ^5.8.1 (battle-tested Redis client)

---

## Best Practices

### 1. Always Set TTL for Temporary Data

```typescript
// Good: Prevents memory leaks
await redis.set('session:abc', sessionData, 1800);

// Bad: Indefinite storage
await redis.set('session:abc', sessionData);
```

### 2. Use Type Parameters

```typescript
// Good: Type-safe
const user = await redis.get<User>('user:123');
console.log(user.name); // TypeScript knows this exists

// Bad: Loses type information
const user = await redis.get('user:123');
console.log(user.name); // TypeScript error
```

### 3. Handle Null Returns

```typescript
const user = await redis.get<User>('user:123');
if (!user) {
  // Handle cache miss
  const user = await database.findUser(123);
  await redis.set('user:123', user, 3600);
}
```

### 4. Use Pipeline for Related Operations

```typescript
// Good: Atomic and efficient
await redis.pipeline()
  .set('counter', 1)
  .expire('counter', 60)
  .exec();

// Bad: Two network round-trips, not atomic
await redis.set('counter', 1);
await redis.expire('counter', 60);
```

### 5. Graceful Error Handling

```typescript
try {
  await redis.set('key', value);
} catch (error) {
  logger.error('Redis operation failed', error);
  // Fallback logic or degrade gracefully
}
```

### 6. Health Checks on Init

```typescript
async onModuleInit(): Promise<void> {
  try {
    await this.redisClient.set('test:connection', 'ok', 10);
    await this.redisClient.del('test:connection');
    this.logger.log('Redis connected');
  } catch (error) {
    this.logger.error('Redis connection failed', error);
    throw error;
  }
}
```

---

## Limitations & Future Considerations

### Current Limitations

1. **No SCAN Support**: `keys()` is blocking; not suitable for large keyspaces
2. **No Pub/Sub**: Currently focuses on storage/cache operations
3. **No Lua Scripts**: Advanced atomic operations require raw ioredis access
4. **No Connection Events**: No hooks for reconnection, error events
5. **No Cluster Support**: Single-node Redis only

### When to Use Raw ioredis

For operations not supported by `RedisClient`:

```typescript
import { RedisClient } from '@pro/redis';
import { Redis } from 'ioredis';

// Access underlying client if needed
const client = new Redis(config);
await client.scan(0, 'MATCH', 'pattern:*', 'COUNT', 100);
```

---

## Testing

### Connection Test Pattern

```typescript
describe('RedisClient', () => {
  let redis: RedisClient;

  beforeAll(() => {
    redis = new RedisClient('redis://localhost:6379');
  });

  afterAll(async () => {
    await redis.close();
  });

  it('should set and get value', async () => {
    await redis.set('test:key', 'value', 10);
    const result = await redis.get('test:key');
    expect(result).toBe('value');
  });

  it('should handle JSON serialization', async () => {
    const obj = { id: 1, name: 'Test' };
    await redis.set('test:obj', obj, 10);
    const result = await redis.get<typeof obj>('test:obj');
    expect(result).toEqual(obj);
  });
});
```

---

## Summary

**@pro/redis** is a purposeful, elegant abstraction over ioredis that eliminates boilerplate while preserving Redis's power. Every method exists for a reason, proven by real-world usage in the codebase.

**When to use this package**:
- Caching user sessions, API responses, computed data
- Distributed counters and statistics
- Token blacklisting and temporary data
- Time-series data with sorted sets
- Atomic batch operations with pipelines

**When to use raw ioredis**:
- Pub/Sub messaging
- Redis Streams
- Lua scripting
- SCAN operations for large keyspaces
- Advanced cluster operations

---

**Package Location**: `/home/ubuntu/worktrees/pro/packages/redis`

**Main Export**: `/home/ubuntu/worktrees/pro/packages/redis/src/index.ts`

**Real-world Examples**:
- `/home/ubuntu/worktrees/pro/apps/api/src/weibo/weibo-stats-redis.service.ts`
- `/home/ubuntu/worktrees/pro/apps/api/src/weibo/weibo-hourly-stats.service.ts`
- `/home/ubuntu/worktrees/pro/apps/api/src/auth/auth.service.ts`

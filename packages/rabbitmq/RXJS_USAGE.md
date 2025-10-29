# RxJS Queue Manager 使用指南

基于 RxJS 的优雅消息队列管理器，支持生产者/消费者分离架构和所有 RxJS 操作符。

## 核心概念

### 双 Observable 架构

```typescript
interface QueueManager<T> {
  producer: QueueProducer<T>;  // 生产者（Observer）
  consumer$: Observable<MessageEnvelope<T>>;  // 消费者（Observable）
  queueName: string;
  dlqName: string;
}
```

## 基础用法

### 1. 创建队列管理器

```typescript
import { useQueue } from '@pro/rabbitmq';

interface WeiboTask {
  keyword: string;
  page: number;
  startDate: Date;
}

const queue = useQueue<WeiboTask>('weibo_crawl_queue');
```

### 2. 生产者：推送消息

```typescript
// 单条推送
queue.producer.next({
  keyword: 'AI技术',
  page: 1,
  startDate: new Date()
});

// 批量推送（性能优化）
const result = await queue.producer.nextBatch([
  { keyword: 'AI', page: 1, startDate: new Date() },
  { keyword: 'ML', page: 1, startDate: new Date() },
  { keyword: 'DeepLearning', page: 1, startDate: new Date() },
]);

console.log(`成功: ${result.successCount}, 失败: ${result.failureCount}`);
```

### 3. 消费者：订阅消息流

```typescript
queue.consumer$.subscribe({
  next: (envelope) => {
    console.log('收到消息:', envelope.message);
    console.log('消息ID:', envelope.metadata.messageId);
    console.log('重试次数:', envelope.metadata.retryCount);
    // 自动 ACK
  },
  error: (err) => console.error('订阅错误:', err)
});
```

## RxJS 操作符示例

### 消息过滤和转换

```typescript
import { filter, map, tap } from 'rxjs/operators';

queue.consumer$.pipe(
  // 过滤：只处理第一页
  filter(env => env.message.page === 1),

  // 转换：提取关键词
  map(env => env.message.keyword),

  // 日志
  tap(keyword => console.log('处理关键词:', keyword))
).subscribe(keyword => {
  // 处理关键词
  processKeyword(keyword);
});
```

### 错误处理和重试

```typescript
import { catchError, retry, retryWhen, delay, take } from 'rxjs/operators';
import { throwError } from 'rxjs';

queue.consumer$.pipe(
  map(env => {
    // 可能抛出错误的处理逻辑
    if (!env.message.keyword) {
      throw new Error('无效的关键词');
    }
    return processTask(env.message);
  }),

  // 简单重试：失败后重试 3 次
  retry(3),

  // 高级重试：带延迟的重试
  retryWhen(errors =>
    errors.pipe(
      delay(1000), // 延迟 1 秒
      take(3)      // 最多重试 3 次
    )
  ),

  // 错误捕获
  catchError(err => {
    console.error('处理失败:', err);
    return throwError(() => err);
  })
).subscribe();
```

### 并发控制

```typescript
import { mergeMap, concatMap, exhaustMap } from 'rxjs/operators';

// mergeMap: 并发处理，最多同时处理 5 个任务
queue.consumer$.pipe(
  mergeMap(env => processTask(env.message), 5)
).subscribe();

// concatMap: 顺序处理，保证顺序
queue.consumer$.pipe(
  concatMap(env => processTask(env.message))
).subscribe();

// exhaustMap: 忽略新任务直到当前任务完成
queue.consumer$.pipe(
  exhaustMap(env => processTask(env.message))
).subscribe();
```

### 背压控制

```typescript
import { bufferTime, throttleTime, debounceTime } from 'rxjs/operators';

// 批量处理：每 5 秒批量处理一次
queue.consumer$.pipe(
  bufferTime(5000),
  filter(batch => batch.length > 0),
  tap(batch => console.log(`批量处理 ${batch.length} 条消息`)),
  mergeMap(batch => processBatch(batch.map(env => env.message)))
).subscribe();

// 节流：每秒最多处理一条
queue.consumer$.pipe(
  throttleTime(1000),
  map(env => env.message)
).subscribe(message => processMessage(message));

// 防抖：300ms 内无新消息才处理
queue.consumer$.pipe(
  debounceTime(300),
  map(env => env.message)
).subscribe(message => processMessage(message));
```

## 手动 ACK 模式

当需要精确控制消息确认时，使用手动 ACK 模式：

```typescript
const queue = useQueue<WeiboTask>('weibo_crawl_queue', {
  manualAck: true  // 启用手动 ACK
});

queue.consumer$.pipe(
  tap(envelope => {
    try {
      // 处理消息
      processMessage(envelope.message);

      // 成功：手动 ACK
      envelope.ack();
    } catch (error) {
      console.error('处理失败:', error);

      // 失败：手动 NACK
      if (error instanceof NoRetryError) {
        envelope.nack(false);  // 不重新入队，进入死信队列
      } else {
        envelope.nack(true);   // 重新入队，稍后重试
      }
    }
  })
).subscribe();
```

## 完整示例：微博爬虫任务处理

```typescript
import { useQueue } from '@pro/rabbitmq';
import { filter, map, mergeMap, retry, bufferTime, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface WeiboTask {
  keyword: string;
  page: number;
  startDate: Date;
}

// 创建队列管理器
const queue = useQueue<WeiboTask>('weibo_crawl_queue');

// 生产者：推送任务
async function scheduleTask(keyword: string) {
  // 单条推送
  queue.producer.next({
    keyword,
    page: 1,
    startDate: new Date()
  });

  console.log(`已推送任务: ${keyword}`);
}

// 消费者：处理任务
queue.consumer$.pipe(
  // 1. 过滤：跳过无效任务
  filter(env => {
    const valid = env.message.keyword && env.message.page > 0;
    if (!valid) {
      console.warn('跳过无效任务:', env.message);
      env.nack(false); // 不重试
    }
    return valid;
  }),

  // 2. 转换：添加时间戳
  map(env => ({
    ...env.message,
    receivedAt: new Date(),
    messageId: env.metadata.messageId
  })),

  // 3. 并发控制：最多同时处理 5 个任务
  mergeMap(async (task) => {
    console.log(`开始处理: ${task.keyword}, page: ${task.page}`);

    // 模拟爬取逻辑
    const result = await crawlWeibo(task.keyword, task.page);

    return { task, result };
  }, 5),

  // 4. 错误处理：失败重试 3 次
  retry(3),

  // 5. 批量入库：每 10 秒或 100 条批量保存
  bufferTime(10000),
  filter(batch => batch.length > 0),

  // 6. 日志
  tap(batch => console.log(`批量保存 ${batch.length} 条结果`)),

  // 7. 保存到数据库
  mergeMap(async (batch) => {
    try {
      await saveToDB(batch.map(item => item.result));
      console.log(`成功保存 ${batch.length} 条数据`);
    } catch (error) {
      console.error('保存失败:', error);
      throw error;
    }
  }),

  // 8. 最终错误捕获
  catchError(err => {
    console.error('处理流程错误:', err);
    // 记录到监控系统
    reportToMonitoring(err);
    return of(null); // 继续处理
  })
).subscribe({
  next: () => console.log('批次处理完成'),
  error: (err) => console.error('订阅错误:', err),
  complete: () => console.log('消费者已关闭')
});

// 模拟爬取函数
async function crawlWeibo(keyword: string, page: number) {
  // 实际爬取逻辑
  return { keyword, page, data: [] };
}

// 保存到数据库
async function saveToDB(results: any[]) {
  // 实际保存逻辑
}

// 上报监控
function reportToMonitoring(error: Error) {
  // 实际监控逻辑
}
```

## 高级特性

### 1. 动态配置预取数量

```typescript
const queue = useQueue<WeiboTask>('weibo_crawl_queue', {
  prefetchCount: 10  // 一次预取 10 条消息
});
```

### 2. 获取队列信息

```typescript
console.log('主队列:', queue.queueName);
console.log('死信队列:', queue.dlqName);
```

### 3. 优雅关闭

```typescript
const subscription = queue.consumer$.subscribe(...);

// 关闭时取消订阅，自动停止消费
subscription.unsubscribe();

// 关闭生产者
queue.producer.complete();
```

## 设计理念

### 存在即合理
- `producer`: 生产消息的 Observer
- `consumer$`: 消费消息的 Observable
- `MessageEnvelope`: 封装消息和控制接口
- `ack/nack`: 手动确认控制

### 优雅即简约
- 标准 RxJS 接口，无学习曲线
- 代码即文档，清晰表达意图
- 类型安全，编译时检查

### 性能即艺术
- 批量推送优化网络往返
- RxJS 操作符实现高效的流处理
- 预取数量可配置

### 错误处理如为人处世的哲学
- 自动 ACK/NACK 管理
- 灵活的重试策略
- 优雅的错误传播

## 总结

RxJS Queue Manager 将 RabbitMQ 的强大功能与 RxJS 的响应式编程完美结合，提供：

- ✅ 生产者/消费者分离
- ✅ 支持所有 RxJS 操作符
- ✅ 类型安全
- ✅ 自动资源管理
- ✅ 灵活的 ACK 控制
- ✅ 优雅的错误处理

这是一个真正的艺术品级消息队列管理器。🎨

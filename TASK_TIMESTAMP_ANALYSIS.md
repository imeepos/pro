# 任务时间戳异常分析报告

## 观察到的异常数据

```
- 所有任务的 nextRunAt: 2025-10-16T16:18:10.528Z（2天前）
- 当前时间: 2025-10-18 03:34:00（推测）
- 所有 45 个任务都有相同的 nextRunAt 值
- 所有任务状态都是 PENDING
```

## 根本原因分析

### 1. **nextRunAt 时间设置逻辑**

#### 设置位置一：Broker 任务调度器 (task-scanner-scheduler.service.ts)

**首次抓取和增量抓取时设置**（第 214-234 行）：
```typescript
if (task.needsInitialCrawl) {
  subTask = this.createInitialSubTask(task);
  // 首次抓取完成后等待一个抓取间隔再进行下次扫描
  nextRunTime = new Date(Date.now() + parseInterval(task.crawlInterval));
} else if (task.isHistoricalCrawlCompleted) {
  // 历史回溯已完成，进入增量模式
  subTask = this.createIncrementalSubTask(task);
  nextRunTime = new Date(Date.now() + parseInterval(task.crawlInterval));
}
```

**更新到数据库**（第 289-299 行）：
```typescript
if (nextRunTime) {
  await this.taskRepository.update(task.id, {
    nextRunAt: nextRunTime,
  });
}
```

**问题**：只在成功发布消息后更新 `nextRunAt`，但如果 Crawler 处理失败或没有正确更新状态，`nextRunAt` 会永久停留在过去。

---

#### 设置位置二：Crawler 完成后通过消息队列更新

**首次抓取完成**（search-crawler.service.ts 第 672-680 行）：
```typescript
// 历史数据回溯完成
await this.publishTaskStatusUpdate({
  taskId,
  status: 'running',
  currentCrawlTime: start,
  latestCrawlTime: result.firstPostTime,
  nextRunAt: new Date(Date.now() + this.parseInterval('1h')), // 硬编码 1 小时
  progress: 100,
  updatedAt: new Date()
});
```

**增量抓取完成**（第 688-694 行）：
```typescript
await this.publishTaskStatusUpdate({
  taskId,
  status: 'running',
  latestCrawlTime: result.firstPostTime,
  nextRunAt: new Date(Date.now() + this.parseInterval('1h')), // 硬编码 1 小时
  updatedAt: new Date()
});
```

**严重问题**：Crawler 硬编码使用 `1h` 间隔，完全忽略任务配置的 `crawlInterval` 字段！

---

### 2. **时间更新失败的场景**

#### 场景1：Crawler 宕机或重启
- Broker 发布了子任务消息
- Crawler 从队列中取出消息开始处理
- **Crawler 在抓取过程中宕机/重启**
- 子任务永远不会完成，不会发送状态更新消息
- `nextRunAt` 停留在 Broker 最初设置的时间（2天前）

#### 场景2：消息队列丢失
- Crawler 完成抓取，调用 `publishTaskStatusUpdate`
- **RabbitMQ 发布失败或消息丢失**
- API 服务的 Consumer 永远收不到状态更新
- `nextRunAt` 没有被更新到数据库

#### 场景3：API Consumer 处理失败
- Crawler 成功发布状态更新消息
- API Consumer 收到消息但处理时数据库操作失败
- 例如：连接超时、死锁、权限问题
- 消息被 ACK 后丢弃，`nextRunAt` 未更新

---

### 3. **为什么所有任务都是相同时间戳？**

**批量创建任务场景**：
- 管理员在某个时刻（2025-10-16 16:18:10）批量创建了 45 个任务
- 初始 `nextRunAt` 都设置为当前时间
- 这些任务随后被 Broker 扫描并调度
- **某个系统级故障导致所有任务的状态更新都失败**
  - 可能是 Crawler 服务整体宕机
  - 可能是 RabbitMQ 连接中断
  - 可能是 API 服务的 Consumer 未启动

---

## 问题的影响

### 直接影响
1. **任务积压**：45 个任务全部停留在 PENDING 状态
2. **重复调度风险**：每次 Broker 扫描都会尝试重新调度这些任务
3. **资源浪费**：可能产生大量重复的子任务消息

### 潜在风险
1. **消息队列堆积**：如果 Crawler 一直未处理，队列可能堆积大量消息
2. **数据库负载**：Broker 每分钟查询这些"过期"任务
3. **数据一致性**：任务状态与实际执行状态不一致

---

## 修复建议

### 短期修复（立即执行）

#### 1. 重置僵尸任务的时间戳
```sql
-- 查找所有过期的 PENDING 任务（nextRunAt 早于 5 分钟前）
UPDATE weibo_search_tasks
SET
  next_run_at = NOW() + INTERVAL '30 seconds',
  error_message = '系统检测到时间戳异常，已自动重置',
  updated_at = NOW()
WHERE
  status = 'pending'
  AND enabled = true
  AND next_run_at < NOW() - INTERVAL '5 minutes';
```

#### 2. 检查系统服务状态
```bash
# 检查 Crawler 是否正常运行
docker ps | grep crawler

# 检查 RabbitMQ 连接状态
docker logs pro-crawler-1 | grep -i "rabbitmq"
docker logs pro-api-1 | grep -i "consumer"

# 检查消息队列堆积情况
docker exec -it pro-rabbitmq-1 rabbitmqctl list_queues
```

---

### 中期优化（1-2天内）

#### 1. **修复 Crawler 硬编码问题**
在 Crawler 服务中，从 SubTaskMessage 传递 `crawlInterval`：

```typescript
// apps/broker/src/weibo/task-scanner-scheduler.service.ts
private createInitialSubTask(task: WeiboSearchTaskEntity): SubTaskMessage {
  return {
    taskId: task.id,
    keyword: task.keyword,
    start,
    end,
    isInitialCrawl: true,
    weiboAccountId: task.weiboAccountId,
    enableAccountRotation: task.enableAccountRotation,
    crawlInterval: task.crawlInterval, // 新增：传递间隔配置
  };
}

// apps/crawler/src/weibo/search-crawler.service.ts
private async handleInitialCrawlResult(message: SubTaskMessage, result: CrawlResult) {
  const interval = this.parseInterval(message.crawlInterval || '1h');
  await this.publishTaskStatusUpdate({
    taskId,
    status: 'running',
    currentCrawlTime: start,
    latestCrawlTime: result.firstPostTime,
    nextRunAt: new Date(Date.now() + interval), // 使用任务配置的间隔
    progress: 100,
    updatedAt: new Date()
  });
}
```

#### 2. **增加消息发布重试机制**
```typescript
private async publishTaskStatusUpdate(statusUpdate: any, maxRetries = 3): Promise<void> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await this.rabbitMQClient.publish(this.rabbitmqConfig.queues.statusQueue, statusUpdate);
      this.logger.log(`任务状态更新发布成功 (尝试 ${attempt + 1}/${maxRetries})`);
      return;
    } catch (error) {
      attempt++;
      this.logger.warn(`发布失败，重试 ${attempt}/${maxRetries}`, error);
      if (attempt >= maxRetries) {
        this.logger.error(`发布任务状态更新最终失败: taskId=${statusUpdate.taskId}`, error);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 指数退避
    }
  }
}
```

---

### 长期优化（架构改进）

#### 1. **任务健康检查机制**（已实现但未启用）
TaskMonitor 已经有超时检测逻辑（第 81-174 行），但可能未正确触发：

```typescript
// apps/broker/src/weibo/task-monitor.service.ts
private async checkTimeoutTasks(now: Date): Promise<void> {
  const timeoutThreshold = new Date(now.getTime() - TASK_TIMEOUT); // 30分钟

  const timeoutTasks = await this.taskRepository.find({
    where: {
      status: WeiboSearchTaskStatus.RUNNING,
      updatedAt: LessThan(timeoutThreshold),
    },
  });

  // 处理超时任务...
}
```

**问题**：只检查 `RUNNING` 状态，不检查 `PENDING` 状态的僵尸任务。

**改进**：增加对 PENDING 任务的过期检测：
```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async checkStalePendingTasks(): Promise<void> {
  const overdueThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10分钟

  const staleTasks = await this.taskRepository.find({
    where: {
      status: WeiboSearchTaskStatus.PENDING,
      enabled: true,
      nextRunAt: LessThan(overdueThreshold),
    },
  });

  if (staleTasks.length > 0) {
    this.logger.warn(`发现 ${staleTasks.length} 个过期的 PENDING 任务，重置时间戳`);

    for (const task of staleTasks) {
      const retryDelay = this.calculateRetryInterval(task.retryCount);
      await this.taskRepository.update(task.id, {
        nextRunAt: new Date(Date.now() + retryDelay),
        errorMessage: '任务超时未执行，已自动重新调度',
        retryCount: task.retryCount + 1,
      });
    }
  }
}
```

#### 2. **数据库直接回写机制**
Crawler 除了发送消息外，直接更新数据库作为兜底：

```typescript
// apps/crawler 需要依赖 TypeORM 和 WeiboSearchTaskEntity
private async handleTaskResult(message: SubTaskMessage, result: CrawlResult) {
  try {
    // 方案1：通过消息队列更新（主要方式）
    await this.publishTaskStatusUpdate(...);

    // 方案2：直接写数据库（兜底方式）
    setTimeout(async () => {
      // 2秒后检查消息是否被处理
      const task = await this.taskRepository.findOne({ where: { id: message.taskId } });
      if (task && task.updatedAt < new Date(Date.now() - 2000)) {
        // 消息未被处理，直接更新数据库
        this.logger.warn(`消息队列未更新任务，直接写数据库: taskId=${message.taskId}`);
        await this.taskRepository.update(message.taskId, {
          nextRunAt: new Date(Date.now() + this.parseInterval(message.crawlInterval)),
          latestCrawlTime: result.firstPostTime,
          updatedAt: new Date(),
        });
      }
    }, 2000);
  } catch (error) {
    this.logger.error('任务结果处理失败', error);
  }
}
```

#### 3. **监控告警**
- 添加 Prometheus 指标：`weibo_tasks_overdue_count`
- 当过期任务超过 10 个时触发告警
- 监控消息队列的消费延迟

---

## 执行计划

### 立即执行（今天）
1. 运行 SQL 重置所有过期任务的 `nextRunAt`
2. 检查 Crawler 和 API Consumer 服务状态
3. 清理 RabbitMQ 中堆积的消息（如果有）

### 本周内
1. 修复 Crawler 硬编码 `1h` 的问题
2. 在 TaskMonitor 中增加 PENDING 任务过期检测
3. 测试消息发布失败的降级逻辑

### 下周
1. 实施数据库直接回写兜底机制
2. 增加监控指标和告警规则
3. 编写操作手册：如何处理任务时间戳异常

---

## 测试验证

### 测试场景1：Crawler 宕机
1. 创建测试任务
2. 停止 Crawler 服务
3. 等待 Broker 调度任务
4. 验证 TaskMonitor 是否在 10 分钟后重置任务

### 测试场景2：消息队列故障
1. 创建测试任务
2. 模拟 RabbitMQ 发布失败
3. 验证 Crawler 是否有重试机制
4. 验证数据库是否有兜底更新

### 测试场景3：正常流程
1. 创建不同 `crawlInterval` 的任务（10m, 30m, 1h）
2. 验证 `nextRunAt` 是否按配置正确更新
3. 验证多次执行后时间戳的准确性

---

## 总结

### 核心问题
1. **Crawler 硬编码问题**：忽略任务的 `crawlInterval` 配置，统一使用 1 小时
2. **缺乏兜底机制**：完全依赖消息队列更新状态，没有超时保护
3. **监控盲区**：只监控 RUNNING 任务超时，不检查 PENDING 任务过期

### 优先级
1. **P0**：立即重置僵尸任务时间戳（SQL 脚本）
2. **P1**：修复 Crawler 硬编码，尊重 `crawlInterval` 配置
3. **P2**：增加 PENDING 任务过期检测和自动重置
4. **P3**：实施数据库直接回写兜底机制

### 预期效果
- 消除任务时间戳停滞问题
- 提升系统容错能力
- 减少人工干预需求

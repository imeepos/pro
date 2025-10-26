import { Injectable, Logger } from '@nestjs/common';
import { RedisClient } from '@pro/redis';

export interface QueueTask {
  id: string;
  data: any;
  priority: number;
}

@Injectable()
export class PriorityQueueService {
  private readonly queuePrefix = 'workflow:priority-queue:';
  private readonly logger = new Logger(PriorityQueueService.name);

  constructor(
    private readonly redis: RedisClient,
  ) {}

  async enqueue(
    queueName: string,
    task: QueueTask
  ): Promise<void> {
    const queueKey = this.queuePrefix + queueName;
    const taskData = JSON.stringify(task.data);

    await this.redis.zadd(queueKey, task.priority, `${task.id}:${taskData}`);

    this.logger.debug('任务入队', {
      queueName,
      taskId: task.id,
      priority: task.priority,
    });
  }

  async dequeue(queueName: string): Promise<QueueTask | null> {
    const queueKey = this.queuePrefix + queueName;
    const result = await this.redis.zpopmax(queueKey);

    if (!result) {
      return null;
    }

    const parts = result.member.split(':', 2);
    const taskId = parts[0];
    const taskDataJson = parts[1];

    if (!taskId || !taskDataJson) {
      return null;
    }

    try {
      const data = JSON.parse(taskDataJson);

      this.logger.debug('任务出队', {
        queueName,
        taskId,
        priority: result.score,
      });

      return {
        id: taskId,
        data,
        priority: result.score,
      };
    } catch (error) {
      this.logger.error('解析任务数据失败', {
        queueName,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }

  async peek(queueName: string): Promise<QueueTask | null> {
    const queueKey = this.queuePrefix + queueName;
    const results = await this.redis.zrevrange(queueKey, 0, 0, true);

    if (results.length < 2) {
      return null;
    }

    const member = results[0];
    const scoreStr = results[1];

    if (!member || !scoreStr) {
      return null;
    }

    const parts = member.split(':', 2);
    const taskId = parts[0];
    const taskDataJson = parts[1];

    if (!taskId || !taskDataJson) {
      return null;
    }

    const priority = Number.parseFloat(scoreStr);

    try {
      const data = JSON.parse(taskDataJson);

      return {
        id: taskId,
        data,
        priority,
      };
    } catch {
      return null;
    }
  }

  async size(queueName: string): Promise<number> {
    const queueKey = this.queuePrefix + queueName;
    return await this.redis.zcard(queueKey);
  }

  async clear(queueName: string): Promise<void> {
    const queueKey = this.queuePrefix + queueName;
    await this.redis.del(queueKey);

    this.logger.log('清空队列', { queueName });
  }

  async remove(queueName: string, taskId: string): Promise<boolean> {
    const queueKey = this.queuePrefix + queueName;
    const allMembers = await this.redis.zrange(queueKey, 0, -1);

    for (const member of allMembers) {
      if (member.startsWith(`${taskId}:`)) {
        const removed = await this.redis.zrem(queueKey, member);
        if (removed > 0) {
          this.logger.debug('移除任务', { queueName, taskId });
          return true;
        }
      }
    }

    return false;
  }

  async updatePriority(
    queueName: string,
    taskId: string,
    newPriority: number
  ): Promise<boolean> {
    const queueKey = this.queuePrefix + queueName;
    const allResults = await this.redis.zrange(queueKey, 0, -1, true);

    for (let i = 0; i < allResults.length; i += 2) {
      const member = allResults[i];

      if (member && member.startsWith(`${taskId}:`)) {
        await this.redis.zadd(queueKey, newPriority, member);

        this.logger.debug('更新任务优先级', {
          queueName,
          taskId,
          newPriority,
        });

        return true;
      }
    }

    return false;
  }
}

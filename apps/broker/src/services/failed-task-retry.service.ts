import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService } from '@pro/rabbitmq';
import { FailedTaskEntity } from '@pro/entities';

@Injectable()
export class FailedTaskRetryService {
  private readonly logger = new Logger(FailedTaskRetryService.name);

  constructor(
    @InjectRepository(FailedTaskEntity)
    private readonly failedTaskRepo: Repository<FailedTaskEntity>,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async retryFailedTask(taskId: number, operator: string): Promise<void> {
    const task = await this.failedTaskRepo.findOne({ where: { id: taskId } });

    if (!task) {
      throw new Error(`失败任务不存在: ${taskId}`);
    }

    if (task.status === 'retried') {
      this.logger.warn(`任务已重试过: ${taskId}`);
      return;
    }

    try {
      const messageBody = JSON.parse(task.messageBody);

      await this.rabbitMQ.publish(task.originalQueue as any, messageBody);

      task.status = 'retried';
      task.retriedAt = new Date();
      task.retriedBy = operator;
      await this.failedTaskRepo.save(task);

      this.logger.log(`成功重试失败任务`, {
        taskId,
        operator,
        originalQueue: task.originalQueue,
      });
    } catch (error) {
      this.logger.error(`重试失败任务出错`, {
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async ignoreFailedTask(taskId: number, operator: string): Promise<void> {
    const task = await this.failedTaskRepo.findOne({ where: { id: taskId } });

    if (!task) {
      throw new Error(`失败任务不存在: ${taskId}`);
    }

    task.status = 'ignored';
    task.retriedBy = operator;
    await this.failedTaskRepo.save(task);

    this.logger.log(`已忽略失败任务: ${taskId}`, { operator });
  }

  async getFailedTasks(status?: string, limit = 100) {
    const query = this.failedTaskRepo
      .createQueryBuilder('task')
      .orderBy('task.failed_at', 'DESC')
      .take(limit);

    if (status) {
      query.where('task.status = :status', { status });
    }

    return await query.getMany();
  }

  async getFailedTaskStats() {
    const stats = await this.failedTaskRepo
      .createQueryBuilder('task')
      .select('task.original_queue', 'queue')
      .addSelect('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.original_queue')
      .addGroupBy('task.status')
      .getRawMany();

    return stats;
  }
}

import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { CleanTaskInput } from './dto/clean-task.input';
import { AnalyzeTaskInput } from './dto/analyze-task.input';
import { AggregateTaskInput } from './dto/aggregate-task.input';
import { TaskResult } from './dto/task-result.type';
import { TaskPriority } from '@pro/types';

/**
 * 任务触发 Resolver
 *
 * 设计哲学：
 * - 职责单一：只负责手动触发任务，不处理业务逻辑
 * - 优雅降级：即使消息发布失败，也返回友好的错误信息而非抛出异常
 * - 日志完整：记录每次触发操作，便于审计和调试
 */
@Resolver()
export class TasksResolver {
  private readonly logger = new Logger(TasksResolver.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  @Mutation(() => TaskResult, { description: '手动触发数据清洗任务' })
  async triggerCleanTask(
    @Args('input') input: CleanTaskInput,
  ): Promise<TaskResult> {
    this.logger.log(`接收清洗任务触发请求: ${input.rawDataId}`);

    const event = {
      rawDataId: input.rawDataId,
      sourceType: input.sourceType,
      priority: input.priority || TaskPriority.NORMAL,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    const success = await this.rabbitMQService.publishCleanTask(event);

    if (success) {
      return {
        success: true,
        message: `清洗任务已成功发布到队列`,
        taskId: input.rawDataId,
      };
    } else {
      return {
        success: false,
        message: `清洗任务发布失败，请查看日志或稍后重试`,
        taskId: input.rawDataId,
      };
    }
  }

  @Mutation(() => TaskResult, { description: '手动触发数据分析任务' })
  async triggerAnalyzeTask(
    @Args('input') input: AnalyzeTaskInput,
  ): Promise<TaskResult> {
    this.logger.log(
      `接收分析任务触发请求: ${input.dataId} (${input.dataType})`,
    );

    const event = {
      dataId: input.dataId,
      dataType: input.dataType,
      analysisTypes: input.analysisTypes,
      context: {
        taskId: input.taskId ? parseInt(input.taskId, 10) : undefined,
        keyword: input.keyword,
      },
      createdAt: new Date().toISOString(),
    };

    const success = await this.rabbitMQService.publishAnalyzeTask(event);

    if (success) {
      return {
        success: true,
        message: `分析任务已成功发布到队列 (${input.analysisTypes.join(', ')})`,
        taskId: input.dataId,
      };
    } else {
      return {
        success: false,
        message: `分析任务发布失败，请查看日志或稍后重试`,
        taskId: input.dataId,
      };
    }
  }

  @Mutation(() => TaskResult, { description: '手动触发数据聚合任务' })
  async triggerAggregateTask(
    @Args('input') input: AggregateTaskInput,
  ): Promise<TaskResult> {
    this.logger.log(
      `接收聚合任务触发请求: ${input.windowType} (${input.startTime} ~ ${input.endTime})`,
    );

    const event = {
      windowType: input.windowType,
      startTime: input.startTime,
      endTime: input.endTime,
      metrics: input.metrics,
      filters: {
        keyword: input.keyword,
      },
      config: {
        topN: input.topN || 10,
        forceRecalculate: input.forceRecalculate || false,
      },
      createdAt: new Date().toISOString(),
    };

    const success = await this.rabbitMQService.publishAggregateTask(event);

    if (success) {
      return {
        success: true,
        message: `聚合任务已成功发布到队列 (${input.metrics.join(', ')})`,
        taskId: `${input.windowType}_${input.startTime}_${input.endTime}`,
      };
    } else {
      return {
        success: false,
        message: `聚合任务发布失败，请查看日志或稍后重试`,
      };
    }
  }
}

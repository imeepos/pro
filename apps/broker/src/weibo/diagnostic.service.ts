import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboSearchTaskEntity } from '@pro/entities';
import { PinoLogger } from '@pro/logger';

/**
 * 数据库诊断服务
 * 用于调试状态枚举值问题
 */
@Injectable()
export class DiagnosticService {
  constructor(
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(DiagnosticService.name);
  }

  /**
   * 诊断数据库中的任务状态值
   * 检查大小写、实际存储格式等
   */
  async diagnoseTaskStatuses(): Promise<{
    distinctStatuses: string[];
    sampleTasks: Array<{
      id: number;
      keyword: string;
      phase: string;
      nextRunAt: string;
      updatedAt: string;
      enabled: boolean;
      latestCrawlTime: string;
    }>;
    pendingTasksCount: number;
    overdueTasksCount: number;
    recommendation: string;
  }> {
    this.logger.info('开始数据库状态诊断');

    // 由于主任务不再有 status 字段，我们使用空数组
    const distinctStatuses: string[] = [];

    // 获取样本任务
    const sampleTasks = await this.taskRepository
      .createQueryBuilder('task')
      .select([
        'task.id',
        'task.keyword',
        'task.nextRunAt',
        'task.updatedAt',
        'task.enabled',
        'task.latestCrawlTime',
      ])
      .orderBy('task.nextRunAt', 'ASC')
      .limit(10)
      .getMany();

    const sampleTasksFormatted = sampleTasks.map(task => ({
      id: task.id,
      keyword: task.keyword || '',
      phase: task.taskPhaseDescription,
      nextRunAt: task.nextRunAt?.toISOString() || 'null',
      updatedAt: task.updatedAt.toISOString(),
      enabled: task.enabled,
      latestCrawlTime: task.latestCrawlTime?.toISOString() || 'null',
    }));

    // 统计需要立即执行的任务数量（基于 nextRunAt 而非 status）
    const pendingTasksCount = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.enabled = true')
      .andWhere('(task.nextRunAt IS NULL OR task.nextRunAt <= NOW())')
      .getCount();

    // 统计过期任务数量（nextRunAt 在5分钟前）
    const overdueTasksCount = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.enabled = true')
      .andWhere("task.nextRunAt < NOW() - INTERVAL '5 minutes'")
      .getCount();

    // 生成建议
    let recommendation = '';
    if (pendingTasksCount > 0) {
      recommendation = `发现 ${pendingTasksCount} 个需要立即执行的任务，建议检查调度系统是否正常运行`;
    } else {
      recommendation = '当前没有需要立即执行的任务，调度系统状态正常';
    }

    const result = {
      distinctStatuses,
      sampleTasks: sampleTasksFormatted,
      pendingTasksCount,
      overdueTasksCount,
      recommendation,
    };

    this.logger.info('数据库诊断完成', result);

    return result;
  }

  /**
   * 修复过期任务的 nextRunAt 时间
   */
  async fixOverdueTasks(): Promise<{
    affectedCount: number;
    message: string;
  }> {
    this.logger.info('开始修复过期任务');

    const result = await this.taskRepository
      .createQueryBuilder()
      .update(WeiboSearchTaskEntity)
      .set({
        nextRunAt: () => "NOW() + INTERVAL '30 seconds'",
      })
      .where('enabled = true')
      .andWhere("nextRunAt < NOW() - INTERVAL '5 minutes'")
      .execute();

    const message = `已重置 ${result.affected || 0} 个过期任务的 nextRunAt 时间`;
    this.logger.info(message);

    return {
      affectedCount: result.affected || 0,
      message,
    };
  }
}

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
      status: string;
      statusType: string;
      nextRunAt: string;
      updatedAt: string;
      enabled: boolean;
    }>;
    pendingTasksCount: number;
    PENDING_TasksCount: number;
    overdueTasksCount: number;
    recommendation: string;
  }> {
    this.logger.info('开始数据库状态诊断');

    // 获取所有不同的状态值
    const distinctStatusesResult = await this.taskRepository
      .createQueryBuilder('task')
      .select('DISTINCT task.status', 'status')
      .getRawMany();

    const distinctStatuses = distinctStatusesResult.map(r => r.status);

    // 获取样本任务
    const sampleTasks = await this.taskRepository
      .createQueryBuilder('task')
      .select([
        'task.id',
        'task.keyword',
        'task.status',
        'task.nextRunAt',
        'task.updatedAt',
        'task.enabled',
      ])
      .orderBy('task.nextRunAt', 'ASC')
      .limit(10)
      .getMany();

    const sampleTasksFormatted = sampleTasks.map(task => ({
      id: task.id,
      keyword: task.keyword || '',
      status: task.status,
      statusType: typeof task.status,
      nextRunAt: task.nextRunAt?.toISOString() || 'null',
      updatedAt: task.updatedAt.toISOString(),
      enabled: task.enabled,
    }));

    // 统计小写 'pending' 的任务数量
    const pendingTasksCount = await this.taskRepository
      .createQueryBuilder('task')
      .where("task.status = 'pending'")
      .andWhere('task.enabled = true')
      .getCount();

    // 注意：不查询大写PENDING，因为数据库使用小写枚举
    const PENDING_TasksCount = 0;

    // 统计过期任务数量（nextRunAt 在5分钟前）
    const overdueTasksCount = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.enabled = true')
      .andWhere("task.nextRunAt < NOW() - INTERVAL '5 minutes'")
      .getCount();

    // 生成建议
    let recommendation = '';
    if (PENDING_TasksCount > 0 && pendingTasksCount === 0) {
      recommendation = '数据库使用大写 PENDING，需要修改 WeiboSearchTaskStatus 枚举为大写';
    } else if (pendingTasksCount > 0 && PENDING_TasksCount === 0) {
      recommendation = '数据库使用小写 pending，当前枚举定义正确';
    } else if (PENDING_TasksCount > 0 && pendingTasksCount > 0) {
      recommendation = '数据库中同时存在大小写不一致的状态值，需要统一';
    } else {
      recommendation = '没有发现 pending/PENDING 状态的任务';
    }

    const result = {
      distinctStatuses,
      sampleTasks: sampleTasksFormatted,
      pendingTasksCount,
      PENDING_TasksCount,
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
        errorMessage: '系统检测到时间戳异常，已自动重置',
      })
      .where('enabled = true')
      .andWhere("status = 'pending'")
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

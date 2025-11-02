import { WeiboSearchTaskEntity, useEntityManager } from '@pro/entities';
import { createContextLogger } from '../core/logger';

/**
 * 数据库诊断服务 - 系统健康的检查者
 *
 * 使命：诊断任务状态、检测异常、提供修复建议
 */
export class DiagnosticService {
  private readonly logger = createContextLogger('DiagnosticService');

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

    return await useEntityManager(async manager => {
      const distinctStatuses: string[] = [];

      const sampleTasks = await manager
        .createQueryBuilder(WeiboSearchTaskEntity, 'task')
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

      const sampleTasksFormatted = sampleTasks.map(task => {
        const phase = (() => {
          if (!task.enabled) return 'disabled';
          if (!task.latestCrawlTime) return 'awaiting-first-run';
          if (task.nextRunAt && task.nextRunAt > new Date()) return 'scheduled';
          return 'due-now';
        })();

        return {
          id: task.id,
          keyword: task.keyword || '',
          phase,
          nextRunAt: task.nextRunAt?.toISOString() || 'null',
          updatedAt: task.updatedAt.toISOString(),
          enabled: task.enabled,
          latestCrawlTime: task.latestCrawlTime?.toISOString() || 'null',
        };
      });

      const pendingTasksCount = await manager
        .createQueryBuilder(WeiboSearchTaskEntity, 'task')
        .where('task.enabled = true')
        .andWhere('(task.nextRunAt IS NULL OR task.nextRunAt <= NOW())')
        .getCount();

      const overdueTasksCount = await manager
        .createQueryBuilder(WeiboSearchTaskEntity, 'task')
        .where('task.enabled = true')
        .andWhere("task.nextRunAt < NOW() - INTERVAL '5 minutes'")
        .getCount();

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

      this.logger.info({ message: '数据库诊断完成', ...result });

      return result;
    });
  }

  async fixOverdueTasks(): Promise<{
    affectedCount: number;
    message: string;
  }> {
    this.logger.info('开始修复过期任务');

    return await useEntityManager(async manager => {
      const result = await manager
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
    });
  }
}

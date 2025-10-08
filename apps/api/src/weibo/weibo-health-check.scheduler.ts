import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WeiboHealthCheckService } from './weibo-health-check.service';

/**
 * 微博账号健康检查定时任务调度器
 * 每小时自动检查所有活跃账号的状态
 */
@Injectable()
export class WeiboHealthCheckScheduler {
  private readonly logger = new Logger(WeiboHealthCheckScheduler.name);

  constructor(private readonly healthCheckService: WeiboHealthCheckService) {}

  /**
   * 定时执行健康检查
   * 每小时执行一次 (分钟=0, 每小时)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHealthCheck() {
    this.logger.log('定时健康检查任务开始执行...');

    try {
      const summary = await this.healthCheckService.checkAllAccounts();

      this.logger.log(
        `定时健康检查完成 - ` +
          `总计: ${summary.total}, ` +
          `已检查: ${summary.checked}, ` +
          `状态变更: ${summary.statusChanged}, ` +
          `活跃: ${summary.active}, ` +
          `过期: ${summary.expired}, ` +
          `受限: ${summary.restricted}, ` +
          `封禁: ${summary.banned}`,
      );
    } catch (error) {
      this.logger.error('定时健康检查执行失败', error);
    }
  }
}

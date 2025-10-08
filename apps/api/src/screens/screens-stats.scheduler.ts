import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScreensGateway } from './screens.gateway';
import { WeiboAccountService } from '../weibo/weibo-account.service';

/**
 * 大屏统计数据定时推送调度器
 * 定时推送微博用户统计数据到所有连接的客户端
 */
@Injectable()
export class ScreensStatsScheduler {
  private readonly logger = new Logger(ScreensStatsScheduler.name);

  constructor(
    private readonly screensGateway: ScreensGateway,
    private readonly weiboAccountService: WeiboAccountService,
  ) {}

  /**
   * 定时推送微博已登录用户统计
   * 每分钟执行一次，确保大屏数据实时更新
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async pushWeiboLoggedInUsersStats() {
    try {
      const stats = await this.weiboAccountService.getLoggedInUsersStats();

      this.screensGateway.broadcastWeiboLoggedInUsersUpdate(stats);

      this.logger.log(
        `推送微博用户统计: 总计=${stats.total}, 今日新增=${stats.todayNew}, 在线=${stats.online}`,
      );
    } catch (error) {
      this.logger.error('推送微博用户统计失败', error);
    }
  }
}

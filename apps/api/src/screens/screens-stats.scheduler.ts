import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PubSubService } from '../common/pubsub/pubsub.service';
import { SUBSCRIPTION_EVENTS } from './constants/subscription-events';
import { WeiboAccountEntity, WeiboAccountStatus, useEntityManager } from '@pro/entities';
import { MoreThanOrEqual } from 'typeorm';

/**
 * 大屏统计数据定时推送调度器
 * 定时推送微博用户统计数据到所有连接的客户端
 */
@Injectable()
export class ScreensStatsScheduler {
  private readonly logger = new Logger(ScreensStatsScheduler.name);

  constructor(
    private readonly pubSub: PubSubService,
  ) {}

  /**
   * 定时推送微博已登录用户统计
   * 每分钟执行一次，确保大屏数据实时更新
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async pushWeiboLoggedInUsersStats() {
    try {
      const stats = await useEntityManager(async (m) => {
        const repo = m.getRepository(WeiboAccountEntity);

        const total = await repo.count();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayNew = await repo.count({
          where: {
            createdAt: MoreThanOrEqual(today),
          },
        });

        const online = await repo.count({
          where: {
            status: WeiboAccountStatus.ACTIVE,
          },
        });

        return { total, todayNew, online };
      });

      await this.pubSub.publish(SUBSCRIPTION_EVENTS.WEIBO_LOGGED_IN_USERS_UPDATE, stats);

      this.logger.log(
        `推送微博用户统计: 总计=${stats.total}, 今日新增=${stats.todayNew}, 在线=${stats.online}`,
      );
    } catch (error) {
      this.logger.error('推送微博用户统计失败', error);
    }
  }
}

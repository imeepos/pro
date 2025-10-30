import { Injectable, root } from '@pro/core';
import { RedisClient } from '@pro/redis';
import { useEntityManager, WeiboAccountEntity } from '@pro/entities';
import { WeiboAccountStatus } from '@pro/types';

@Injectable()
export class WeiboAccountInitService {
  private readonly healthKey = 'weibo:account:health';
  private readonly initialHealthScore = 100;
  private readonly redis: RedisClient;

  constructor() {
    this.redis = root.get(RedisClient);
  }

  async syncAccountsToRedis(): Promise<void> {
    const activeAccounts = await useEntityManager(async m => {
      return m.find(WeiboAccountEntity, {
        where: { status: WeiboAccountStatus.ACTIVE },
      })
    })

    if (activeAccounts.length === 0) {
      return;
    }

    const pipeline = this.redis.pipeline();
    let syncCount = 0;

    for (const account of activeAccounts) {
      const member = account.id.toString();
      const existingScore = await this.redis.zscore(this.healthKey, member);

      if (existingScore === null) {
        pipeline.zadd(
          this.healthKey,
          this.initialHealthScore,
          member
        );
        syncCount++;
      }
    }

    if (syncCount > 0) {
      await pipeline.exec();
      console.log(`[WeiboAccountInitService] 已同步 ${syncCount} 个账号到健康度队列`);
    }
  }
}

import { Injectable } from '@pro/core';
import { useEntityManager, WeiboAccountEntity, WeiboAccountStatus } from '@pro/entities';
import { AccountHealthService } from './account-health.service';

export interface AccountAlert {
  accountId: number;
  accountName: string;
  alertType: 'low_health' | 'banned' | 'expired' | 'suspicious';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

@Injectable()
export class AccountAlertService {
  private readonly lowHealthThreshold = 10;
  private readonly criticalHealthThreshold = 5;

  constructor(
    private readonly healthService: AccountHealthService,
  ) { }

  async checkAccountHealth(): Promise<AccountAlert[]> {
    const alerts: AccountAlert[] = [];
    const healthData = await this.healthService.getAllAccountsHealth();

    for (const { accountId, score } of healthData) {
      if (score >= this.lowHealthThreshold) {
        continue;
      }
      const account = await useEntityManager(async m => {
        return m.findOne(WeiboAccountEntity, {
          where: { id: accountId },
        })
      })
      if (!account) {
        continue;
      }

      const severity =
        score < this.criticalHealthThreshold ? 'critical' : 'high';

      alerts.push({
        accountId: account.id,
        accountName: account.weiboNickname || `账号${account.id}`,
        alertType: 'low_health',
        message: `账号健康度过低: ${score}`,
        severity,
        timestamp: new Date(),
      });
    }


    const bannedAccounts = await useEntityManager(async m => {
      return m.find(WeiboAccountEntity, {
        where: { status: WeiboAccountStatus.BANNED },
      })
    })

    for (const account of bannedAccounts) {
      alerts.push({
        accountId: account.id,
        accountName: account.weiboNickname || `账号${account.id}`,
        alertType: 'banned',
        message: `账号已被封禁`,
        severity: 'critical',
        timestamp: new Date(),
      });
    }

    return alerts;
  }

}

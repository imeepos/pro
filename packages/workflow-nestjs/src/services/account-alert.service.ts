import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboAccountEntity, WeiboAccountStatus } from '@pro/entities';
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
  private readonly logger = new Logger(AccountAlertService.name);
  private readonly lowHealthThreshold = 10;
  private readonly criticalHealthThreshold = 5;

  constructor(
    @InjectRepository(WeiboAccountEntity)
    private readonly accountRepo: Repository<WeiboAccountEntity>,
    private readonly healthService: AccountHealthService,
  ) {}

  async checkAccountHealth(): Promise<AccountAlert[]> {
    const alerts: AccountAlert[] = [];
    const healthData = await this.healthService.getAllAccountsHealth();

    for (const { accountId, score } of healthData) {
      if (score >= this.lowHealthThreshold) {
        continue;
      }

      const account = await this.accountRepo.findOne({
        where: { id: accountId },
      });

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

      if (severity === 'critical') {
        this.logger.error(`账号健康度严重不足`, {
          accountId: account.id,
          health: score,
        });
      } else {
        this.logger.warn(`账号健康度偏低`, {
          accountId: account.id,
          health: score,
        });
      }
    }

    const bannedAccounts = await this.accountRepo.find({
      where: { status: WeiboAccountStatus.BANNED },
    });

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

  async alertLowHealth(accountId: number): Promise<void> {
    const score = await this.healthService.getHealthScore(accountId);

    if (score === null) {
      return;
    }

    if (score < this.criticalHealthThreshold) {
      this.logger.error(`账号健康度严重不足，建议立即补充`, {
        accountId,
        health: score,
      });
    } else if (score < this.lowHealthThreshold) {
      this.logger.warn(`账号健康度偏低，建议关注`, {
        accountId,
        health: score,
      });
    }
  }

  async monitorAccounts(): Promise<void> {
    const alerts = await this.checkAccountHealth();

    if (alerts.length > 0) {
      this.logger.warn(`检测到 ${alerts.length} 个账号异常`, {
        criticalCount: alerts.filter((a) => a.severity === 'critical').length,
        highCount: alerts.filter((a) => a.severity === 'high').length,
      });
    }
  }
}

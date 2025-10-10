import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface WeiboAccount {
  id: number;
  nickname: string;
  cookies: any[];
  status: 'active' | 'banned' | 'expired';
  usageCount: number;
  lastUsedAt?: Date;
}

interface ApiWeiboAccount {
  id: number;
  weiboUid: string;
  weiboNickname: string;
  status: string;
  cookies: string;
}

@Injectable()
export class WeiboAccountService implements OnModuleInit {
  private readonly logger = new Logger(WeiboAccountService.name);
  private accounts: Map<number, WeiboAccount> = new Map();
  private currentIndex = 0;
  private apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL', 'http://api:3000');
  }

  async onModuleInit() {
    this.logger.log('微博账号服务初始化中...');
    await this.loadAccountsFromApi();
    this.logger.log(`微博账号服务初始化完成，加载了 ${this.accounts.size} 个账号`);
  }

  /**
   * 从API服务加载微博账号
   */
  private async loadAccountsFromApi(): Promise<void> {
    try {
      this.logger.debug(`从 ${this.apiUrl} 获取微博账号列表`);

      // 使用内部接口获取包含cookies的完整账号信息
      const response = await firstValueFrom(
        this.httpService.post<{accounts: ApiWeiboAccount[]}>(
          `${this.apiUrl}/weibo/internal/accounts/with-cookies`,
          {},
          {
            timeout: 10000,
            headers: {
              'X-Internal-Service': 'crawler',
              'Authorization': `Bearer ${this.configService.get<string>('INTERNAL_API_TOKEN', 'internal-token')}`
            }
          }
        )
      );

      const apiAccounts = response.data.accounts || [];
      this.accounts.clear();

      for (const apiAccount of apiAccounts) {
        let cookies = [];
        try {
          cookies = JSON.parse(apiAccount.cookies);
        } catch (error) {
          this.logger.warn(`解析账号 ${apiAccount.id} 的cookies失败:`, error.message);
          continue;
        }

        // 只加载active状态的账号
        if (apiAccount.status === 'active') {
          this.accounts.set(apiAccount.id, {
            id: apiAccount.id,
            nickname: apiAccount.weiboNickname || `账号${apiAccount.id}`,
            cookies,
            status: apiAccount.status as any,
            usageCount: 0,
            lastUsedAt: undefined
          });
        }
      }

      this.logger.log(`成功加载 ${this.accounts.size} 个active状态的微博账号`);
    } catch (error) {
      this.logger.error('从API加载微博账号失败:', error.message);

      // 如果API失败，尝试从环境变量加载（fallback）
      this.loadAccountsFromEnv();
    }
  }

  /**
   * 从环境变量加载账号（fallback机制）
   */
  private loadAccountsFromEnv(): void {
    this.logger.warn('API加载失败，尝试从环境变量加载账号');

    const accounts = this.configService.get<string>('WEIBO_ACCOUNTS');
    if (accounts) {
      try {
        const parsedAccounts = JSON.parse(accounts);
        this.accounts.clear();

        for (const acc of parsedAccounts) {
          if (acc.status === 'active') {
            this.accounts.set(acc.id, {
              id: acc.id,
              nickname: acc.nickname || `Account${acc.id}`,
              cookies: acc.cookies || [],
              status: acc.status || 'active',
              usageCount: acc.usageCount || 0,
              lastUsedAt: acc.lastUsedAt ? new Date(acc.lastUsedAt) : undefined
            });
          }
        }

        this.logger.log(`从环境变量加载了 ${this.accounts.size} 个账号`);
      } catch (error) {
        this.logger.error('解析微博账号配置失败:', error.message);
      }
    } else {
      this.logger.error('环境变量 WEIBO_ACCOUNTS 未配置');
    }
  }

  /**
   * 刷新账号列表（用于定期更新）
   */
  async refreshAccounts(): Promise<void> {
    this.logger.log('刷新微博账号列表...');
    await this.loadAccountsFromApi();
  }

  async getAvailableAccount(accountId?: number): Promise<WeiboAccount | null> {
    if (accountId) {
      const account = this.accounts.get(accountId);
      return (account && account.status === 'active') ? account : null;
    }

    const activeAccounts = Array.from(this.accounts.values()).filter(acc => acc.status === 'active');
    if (activeAccounts.length === 0) {
      this.logger.warn('没有可用的微博账号，尝试刷新账号列表...');
      await this.refreshAccounts();

      // 刷新后再次检查
      const refreshedAccounts = Array.from(this.accounts.values()).filter(acc => acc.status === 'active');
      if (refreshedAccounts.length === 0) {
        this.logger.error('刷新后仍然没有可用的微博账号');
        return null;
      }

      const account = refreshedAccounts[this.currentIndex % refreshedAccounts.length];
      this.currentIndex = (this.currentIndex + 1) % refreshedAccounts.length;

      account.usageCount += 1;
      account.lastUsedAt = new Date();

      return account;
    }

    const account = activeAccounts[this.currentIndex % activeAccounts.length];
    this.currentIndex = (this.currentIndex + 1) % activeAccounts.length;

    account.usageCount += 1;
    account.lastUsedAt = new Date();

    this.logger.debug(`选择微博账号: ${account.nickname} (ID: ${account.id}), 使用次数: ${account.usageCount}`);
    return account;
  }

  async markAccountBanned(accountId: number): Promise<void> {
    const account = this.accounts.get(accountId);
    if (account) {
      account.status = 'banned';
      this.logger.warn(`标记账号 ${account.nickname} (ID: ${accountId}) 为banned状态`);

      // 通知API服务更新账号状态
      try {
        await firstValueFrom(
          this.httpService.post(
            `${this.apiUrl}/weibo/internal/accounts/${accountId}/mark-banned`,
            {},
            {
              headers: {
                'X-Internal-Service': 'crawler',
                'Authorization': `Bearer ${this.configService.get<string>('INTERNAL_API_TOKEN', 'internal-token')}`
              }
            }
          )
        );
        this.logger.debug(`已通知API服务标记账号 ${accountId} 为banned状态`);
      } catch (error) {
        this.logger.error(`通知API服务标记账号 ${accountId} 失败:`, error.message);
      }
    }
  }

  async getAccountStats(): Promise<{
    total: number;
    active: number;
    banned: number;
    expired: number;
  }> {
    const accounts = Array.from(this.accounts.values());
    const stats = {
      total: accounts.length,
      active: 0,
      banned: 0,
      expired: 0
    };

    accounts.forEach(account => {
      stats[account.status]++;
    });

    return stats;
  }

  async resetUsageCount(): Promise<void> {
    this.accounts.forEach(account => {
      account.usageCount = 0;
    });
    this.logger.debug('已重置所有账号的使用计数');
  }
}
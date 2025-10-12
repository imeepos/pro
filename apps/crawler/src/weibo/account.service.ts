import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { WeiboAccountEntity, WeiboAccountStatus } from '@pro/entities';

export interface WeiboAccount {
  id: number;
  nickname: string;
  cookies: any[];
  status: WeiboAccountStatus;
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

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(WeiboAccountEntity)
    private readonly weiboAccountRepo: Repository<WeiboAccountEntity>,
  ) {}

  async onModuleInit() {
    this.logger.log('微博账号服务初始化中...');
    await this.loadAccountsFromDatabase();
    this.logger.log(`微博账号服务初始化完成，加载了 ${this.accounts.size} 个账号`);
  }

  /**
   * 从数据库加载微博账号
   */
  private async loadAccountsFromDatabase(): Promise<void> {
    try {
      this.logger.debug('从数据库获取微博账号列表');

      // 查询所有active状态的微博账号
      const dbAccounts = await this.weiboAccountRepo.find({
        where: { status: WeiboAccountStatus.ACTIVE },
        order: { lastCheckAt: 'ASC' }, // 优先使用最近检查过的账号
      });

      this.accounts.clear();

      for (const dbAccount of dbAccounts) {
        let cookies = [];
        try {
          cookies = JSON.parse(dbAccount.cookies);
        } catch (error) {
          this.logger.warn(`解析账号 ${dbAccount.id} 的cookies失败:`, error.message);
          continue;
        }

        this.accounts.set(dbAccount.id, {
          id: dbAccount.id,
          nickname: dbAccount.weiboNickname || `账号${dbAccount.id}`,
          cookies,
          status: dbAccount.status,
          usageCount: 0,
          lastUsedAt: undefined
        });
      }

      this.logger.log(`成功从数据库加载 ${this.accounts.size} 个active状态的微博账号`);
    } catch (error) {
      this.logger.error('从数据库加载微博账号失败:', error.message);
      this.logger.error('数据库连接错误:', error.stack);

      // 如果数据库连接失败，尝试从环境变量加载（fallback）
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
    await this.loadAccountsFromDatabase();
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
      account.status = WeiboAccountStatus.BANNED;
      this.logger.warn(`标记账号 ${account.nickname} (ID: ${accountId}) 为banned状态`);

      // 直接更新数据库
      try {
        await this.weiboAccountRepo.update(accountId, {
          status: WeiboAccountStatus.BANNED
        });
        this.logger.debug(`已更新数据库中账号 ${accountId} 为banned状态`);
      } catch (error) {
        this.logger.error(`更新数据库标记账号 ${accountId} 失败:`, error.message);
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
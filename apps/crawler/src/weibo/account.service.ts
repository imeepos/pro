import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WeiboAccount {
  id: number;
  nickname: string;
  cookies: any[];
  status: 'active' | 'banned' | 'expired';
  usageCount: number;
  lastUsedAt?: Date;
}

@Injectable()
export class WeiboAccountService {
  private accounts: WeiboAccount[] = [];
  private currentIndex = 0;

  constructor(private readonly configService: ConfigService) {
    this.initializeAccounts();
  }

  private initializeAccounts(): void {
    const accounts = this.configService.get<string>('WEIBO_ACCOUNTS');
    if (accounts) {
      try {
        const parsedAccounts = JSON.parse(accounts);
        this.accounts = parsedAccounts.map((acc: any, index: number) => ({
          id: acc.id || index + 1,
          nickname: acc.nickname || `Account${index + 1}`,
          cookies: acc.cookies || [],
          status: acc.status || 'active',
          usageCount: acc.usageCount || 0,
          lastUsedAt: acc.lastUsedAt ? new Date(acc.lastUsedAt) : undefined
        }));
      } catch (error) {
        console.error('解析微博账号配置失败:', error);
      }
    }
  }

  async getAvailableAccount(accountId?: number): Promise<WeiboAccount | null> {
    if (accountId) {
      const account = this.accounts.find(acc => acc.id === accountId && acc.status === 'active');
      return account || null;
    }

    const activeAccounts = this.accounts.filter(acc => acc.status === 'active');
    if (activeAccounts.length === 0) {
      return null;
    }

    const account = activeAccounts[this.currentIndex % activeAccounts.length];
    this.currentIndex = (this.currentIndex + 1) % activeAccounts.length;

    account.usageCount += 1;
    account.lastUsedAt = new Date();

    return account;
  }

  async markAccountBanned(accountId: number): Promise<void> {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (account) {
      account.status = 'banned';
    }
  }

  async getAccountStats(): Promise<{
    total: number;
    active: number;
    banned: number;
    expired: number;
  }> {
    const stats = {
      total: this.accounts.length,
      active: 0,
      banned: 0,
      expired: 0
    };

    this.accounts.forEach(account => {
      stats[account.status]++;
    });

    return stats;
  }

  async resetUsageCount(): Promise<void> {
    this.accounts.forEach(account => {
      account.usageCount = 0;
    });
  }
}
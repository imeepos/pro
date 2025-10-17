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
    const initStartTime = Date.now();

    this.logger.debug('微博账号服务开始初始化');

    try {
      await this.loadAccountsFromDatabase();

      const initDuration = Date.now() - initStartTime;
      const stats = await this.getAccountStats();

      this.logger.log('微博账号服务初始化完成', {
        initTimeMs: initDuration,
        stats,
        hasActiveAccounts: stats.active > 0
      });

      if (stats.active === 0) {
        this.logger.warn('警告：没有可用的微博账号', {
          totalAccounts: stats.total,
          bannedAccounts: stats.banned,
          expiredAccounts: stats.expired
        });
      }

    } catch (error) {
      const initDuration = Date.now() - initStartTime;
      this.logger.error('微博账号服务初始化失败', {
        initTimeMs: initDuration,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * 从数据库加载微博账号
   */
  private async loadAccountsFromDatabase(): Promise<void> {
    const loadStartTime = Date.now();
    let loadedAccounts = 0;
    let skippedAccounts = 0;
    let invalidCookiesAccounts = 0;

    try {
      this.logger.debug('开始从数据库加载微博账号');

      // 查询所有active状态的微博账号
      const dbAccounts = await this.weiboAccountRepo.find({
        where: { status: WeiboAccountStatus.ACTIVE },
        order: { lastCheckAt: 'ASC' }, // 优先使用最近检查过的账号
      });

      this.logger.debug('数据库查询完成', {
        totalDbAccounts: dbAccounts.length,
        activeStatus: WeiboAccountStatus.ACTIVE
      });

      this.accounts.clear();

      for (const dbAccount of dbAccounts) {
        let cookies = [];
        try {
          cookies = JSON.parse(dbAccount.cookies);

          // 验证cookies的基本结构
          if (!Array.isArray(cookies) || cookies.length === 0) {
            this.logger.warn('账号cookies格式无效', {
              accountId: dbAccount.id,
              nickname: dbAccount.weiboNickname,
              cookiesType: typeof cookies,
              cookiesLength: Array.isArray(cookies) ? cookies.length : 0
            });
            invalidCookiesAccounts++;
            skippedAccounts++;
            continue;
          }

        } catch (error) {
          this.logger.warn('解析账号cookies失败', {
            accountId: dbAccount.id,
            nickname: dbAccount.weiboNickname,
            error: error instanceof Error ? error.message : '未知错误',
            cookiesPreview: dbAccount.cookies?.substring(0, 100)
          });
          invalidCookiesAccounts++;
          skippedAccounts++;
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

        loadedAccounts++;

        this.logger.debug('账号加载成功', {
          accountId: dbAccount.id,
          nickname: dbAccount.weiboNickname,
          cookiesCount: cookies.length,
          lastCheckAt: dbAccount.lastCheckAt?.toISOString()
        });
      }

      const loadDuration = Date.now() - loadStartTime;

      this.logger.log('数据库账号加载完成', {
        loadTimeMs: loadDuration,
        totalDbAccounts: dbAccounts.length,
        loadedAccounts,
        skippedAccounts,
        invalidCookiesAccounts,
        successRate: dbAccounts.length > 0 ? Math.round((loadedAccounts / dbAccounts.length) * 100) : 0
      });

    } catch (error) {
      const loadDuration = Date.now() - loadStartTime;
      this.logger.error('从数据库加载微博账号失败', {
        loadTimeMs: loadDuration,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        errorCode: this.classifyDatabaseError(error)
      });

      // 如果数据库连接失败，尝试从环境变量加载（fallback）
      this.logger.warn('启用环境变量fallback机制');
      this.loadAccountsFromEnv();
    }
  }

  /**
   * 从环境变量加载账号（fallback机制）
   */
  private loadAccountsFromEnv(): void {
    const envLoadStartTime = Date.now();

    this.logger.warn('使用环境变量fallback机制加载账号');

    try {
      const accountsEnv = this.configService.get<string>('WEIBO_ACCOUNTS');

      if (!accountsEnv) {
        this.logger.error('环境变量 WEIBO_ACCOUNTS 未配置', {
          envVarName: 'WEIBO_ACCOUNTS',
          configured: false
        });
        return;
      }

      let parsedAccounts: any[];
      try {
        parsedAccounts = JSON.parse(accountsEnv);
      } catch (parseError) {
        this.logger.error('解析环境变量中的微博账号配置失败', {
          envVarLength: accountsEnv.length,
          envVarPreview: accountsEnv.substring(0, 200),
          error: parseError instanceof Error ? parseError.message : '未知错误'
        });
        return;
      }

      if (!Array.isArray(parsedAccounts)) {
        this.logger.error('环境变量配置格式错误，应该是数组', {
          actualType: typeof parsedAccounts,
          expectedType: 'array'
        });
        return;
      }

      this.accounts.clear();
      let loadedAccounts = 0;
      let skippedAccounts = 0;

      for (const acc of parsedAccounts) {
        // 验证账号对象的基本结构
        if (!acc || typeof acc !== 'object' || !acc.id) {
          this.logger.warn('跳过无效的账号配置', {
            accountData: acc,
            reason: 'missing_id_or_invalid_object'
          });
          skippedAccounts++;
          continue;
        }

        // 只加载active状态的账号
        if (acc.status === 'active') {
          this.accounts.set(acc.id, {
            id: acc.id,
            nickname: acc.nickname || `Account${acc.id}`,
            cookies: acc.cookies || [],
            status: acc.status || 'active',
            usageCount: acc.usageCount || 0,
            lastUsedAt: acc.lastUsedAt ? new Date(acc.lastUsedAt) : undefined
          });

          loadedAccounts++;

          this.logger.debug('从环境变量加载账号成功', {
            accountId: acc.id,
            nickname: acc.nickname,
            hasCookies: !!(acc.cookies && acc.cookies.length > 0),
            cookiesCount: acc.cookies?.length || 0
          });

        } else {
          this.logger.debug('跳过非active状态的账号', {
            accountId: acc.id,
            status: acc.status
          });
          skippedAccounts++;
        }
      }

      const envLoadDuration = Date.now() - envLoadStartTime;

      this.logger.log('环境变量账号加载完成', {
        loadTimeMs: envLoadDuration,
        totalEnvAccounts: parsedAccounts.length,
        loadedAccounts,
        skippedAccounts,
        finalAccountsCount: this.accounts.size
      });

      if (this.accounts.size === 0) {
        this.logger.error('环境变量中也没有可用的active账号', {
          totalEnvAccounts: parsedAccounts.length,
          activeAccountsCount: loadedAccounts
        });
      }

    } catch (error) {
      const envLoadDuration = Date.now() - envLoadStartTime;
      this.logger.error('环境变量加载过程发生异常', {
        loadTimeMs: envLoadDuration,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });
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
    const resetStartTime = Date.now();
    const totalAccounts = this.accounts.size;

    this.accounts.forEach(account => {
      account.usageCount = 0;
    });

    const resetDuration = Date.now() - resetStartTime;

    this.logger.debug('账号使用计数重置完成', {
      resetTimeMs: resetDuration,
      totalAccounts
    });
  }

  private classifyDatabaseError(error: any): string {
    if (!error) return 'UNKNOWN_DB_ERROR';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('econnrefused') || errorMessage.includes('connection')) {
      return 'DB_CONNECTION_ERROR';
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
      return 'DB_TIMEOUT_ERROR';
    }

    if (errorMessage.includes('enotfound') || errorMessage.includes('dns')) {
      return 'DB_DNS_ERROR';
    }

    if (errorMessage.includes('login') || errorMessage.includes('authentication') ||
        errorMessage.includes('password') || errorMessage.includes('auth')) {
      return 'DB_AUTH_ERROR';
    }

    if (errorMessage.includes('table') || errorMessage.includes('column') ||
        errorMessage.includes('sql') || errorMessage.includes('query')) {
      return 'DB_QUERY_ERROR';
    }

    return 'UNKNOWN_DB_ERROR';
  }

  // 获取账号使用的详细统计信息
  getAccountUsageStats(): Array<{
    accountId: number;
    nickname: string;
    usageCount: number;
    lastUsedAt?: Date;
    status: string;
    hasCookies: boolean;
    cookiesCount: number;
  }> {
    return Array.from(this.accounts.values()).map(account => ({
      accountId: account.id,
      nickname: account.nickname,
      usageCount: account.usageCount,
      lastUsedAt: account.lastUsedAt,
      status: account.status,
      hasCookies: !!(account.cookies && account.cookies.length > 0),
      cookiesCount: account.cookies?.length || 0
    })).sort((a, b) => b.usageCount - a.usageCount); // 按使用次数降序排列
  }

  // 检查账号健康状况
  async checkAccountsHealth(): Promise<{
    totalAccounts: number;
    healthyAccounts: number;
    unhealthyAccounts: number;
    healthDetails: Array<{
      accountId: number;
      nickname: string;
      isHealthy: boolean;
      issues: string[];
    }>;
  }> {
    const accounts = Array.from(this.accounts.values());
    let healthyAccounts = 0;

    const healthDetails = accounts.map(account => {
      const issues: string[] = [];

      // 检查cookies
      if (!account.cookies || account.cookies.length === 0) {
        issues.push('no_cookies');
      }

      // 检查使用频率
      if (account.usageCount > 100) {
        issues.push('high_usage');
      }

      // 检查最后使用时间
      if (account.lastUsedAt) {
        const daysSinceLastUse = (Date.now() - account.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastUse > 7) {
          issues.push('not_used_recently');
        }
      }

      const isHealthy = issues.length === 0;
      if (isHealthy) {
        healthyAccounts++;
      }

      return {
        accountId: account.id,
        nickname: account.nickname,
        isHealthy,
        issues
      };
    });

    return {
      totalAccounts: accounts.length,
      healthyAccounts,
      unhealthyAccounts: accounts.length - healthyAccounts,
      healthDetails
    };
  }
}
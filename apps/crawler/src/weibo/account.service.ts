import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { WeiboAccountEntity } from '@pro/entities';
import { WeiboAccountStatus } from '@pro/types';

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

    this.logger.log('👤 微博账号服务开始初始化', {
      startTime: new Date(initStartTime).toISOString(),
      nodeVersion: process.version,
      environment: this.configService.get('NODE_ENV', 'development')
    });

    try {
      await this.loadAccountsFromDatabase();

      const initDuration = Date.now() - initStartTime;
      const stats = await this.getAccountStats();
      const healthStatus = await this.checkAccountsHealth();

      this.logger.log('✅ 微博账号服务初始化完成', {
        initTimeMs: initDuration,
        initTimeFormatted: this.formatDuration(initDuration),
        stats,
        health: {
          healthyAccounts: healthStatus.healthyAccounts,
          unhealthyAccounts: healthStatus.unhealthyAccounts,
          healthRate: Math.round((healthStatus.healthyAccounts / stats.total) * 100)
        },
        hasActiveAccounts: stats.active > 0,
        loadStrategy: this.accounts.size > 0 ? 'database' : 'fallback'
      });

      if (stats.active === 0) {
        this.logger.error('❌ 严重警告：没有可用的微博账号', {
          totalAccounts: stats.total,
          bannedAccounts: stats.banned,
          expiredAccounts: stats.expired,
          inactiveAccounts: stats.total - stats.active - stats.banned - stats.expired,
          recommendation: '请检查数据库中的账号状态或配置环境变量'
        });
      } else if (healthStatus.unhealthyAccounts > 0) {
        this.logger.warn('⚠️ 账号健康检查发现问题', {
          unhealthyAccounts: healthStatus.unhealthyAccounts,
          healthIssues: healthStatus.healthDetails
            .filter(detail => !detail.isHealthy)
            .map(detail => ({ accountId: detail.accountId, issues: detail.issues }))
        });
      }

    } catch (error) {
      const initDuration = Date.now() - initStartTime;
      this.logger.error('💥 微博账号服务初始化失败', {
        initTimeMs: initDuration,
        initTimeFormatted: this.formatDuration(initDuration),
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyInitError(error),
        stack: error instanceof Error ? error.stack : undefined,
        fallbackAvailable: !!this.configService.get('WEIBO_ACCOUNTS')
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
    const requestStartTime = Date.now();

    this.logger.debug('🔍 开始获取可用账号', {
      requestedAccountId: accountId,
      totalAccounts: this.accounts.size,
      currentIndex: this.currentIndex,
      timestamp: new Date().toISOString()
    });

    if (accountId) {
      const account = this.accounts.get(accountId);
      const isAvailable = account && account.status === 'active';

      this.logger.debug(`${isAvailable ? '✅' : '❌'} 指定账号可用性检查`, {
        accountId,
        nickname: account?.nickname,
        status: account?.status,
        usageCount: account?.usageCount || 0,
        isAvailable
      });

      return isAvailable ? account : null;
    }

    const activeAccounts = Array.from(this.accounts.values()).filter(acc => acc.status === 'active');

    if (activeAccounts.length === 0) {
      this.logger.warn('⚠️ 没有可用的微博账号，尝试刷新账号列表...', {
        totalAccounts: this.accounts.size,
        accountStatuses: Array.from(this.accounts.values()).map(acc => ({
          id: acc.id,
          nickname: acc.nickname,
          status: acc.status,
          usageCount: acc.usageCount
        }))
      });

      const refreshStartTime = Date.now();
      await this.refreshAccounts();
      const refreshDuration = Date.now() - refreshStartTime;

      // 刷新后再次检查
      const refreshedAccounts = Array.from(this.accounts.values()).filter(acc => acc.status === 'active');
      if (refreshedAccounts.length === 0) {
        this.logger.error('❌ 刷新后仍然没有可用的微博账号', {
          refreshDuration,
          accountsAfterRefresh: this.accounts.size,
          accountStatusesAfterRefresh: Array.from(this.accounts.values()).map(acc => ({
            id: acc.id,
            nickname: acc.nickname,
            status: acc.status
          }))
        });
        return null;
      }

      this.logger.log('✅ 账号刷新成功，继续获取可用账号', {
        refreshDuration,
        newActiveAccountsCount: refreshedAccounts.length
      });

      const account = refreshedAccounts[this.currentIndex % refreshedAccounts.length];
      this.currentIndex = (this.currentIndex + 1) % refreshedAccounts.length;

      account.usageCount += 1;
      account.lastUsedAt = new Date();

      this.logger.debug('🎯 账号分配完成（刷新后）', {
        accountId: account.id,
        nickname: account.nickname,
        usageCount: account.usageCount,
        lastUsedAt: account.lastUsedAt?.toISOString(),
        rotationIndex: this.currentIndex - 1,
        requestDuration: Date.now() - requestStartTime
      });

      return account;
    }

    const account = activeAccounts[this.currentIndex % activeAccounts.length];
    this.currentIndex = (this.currentIndex + 1) % activeAccounts.length;

    account.usageCount += 1;
    account.lastUsedAt = new Date();

    this.logger.debug('🎯 账号分配完成', {
      accountId: account.id,
      nickname: account.nickname,
      usageCount: account.usageCount,
      lastUsedAt: account.lastUsedAt?.toISOString(),
      rotationIndex: this.currentIndex - 1,
      activeAccountsCount: activeAccounts.length,
      requestDuration: Date.now() - requestStartTime,
      usageBalance: this.calculateUsageBalance(activeAccounts)
    });

    return account;
  }

  async markAccountBanned(accountId: number): Promise<void> {
    const banStartTime = Date.now();
    const account = this.accounts.get(accountId);

    if (account) {
      const previousStatus = account.status;
      account.status = WeiboAccountStatus.BANNED;

      this.logger.warn('🚫 标记账号为banned状态', {
        accountId,
        nickname: account.nickname,
        previousStatus,
        newStatus: WeiboAccountStatus.BANNED,
        usageCount: account.usageCount,
        lastUsedAt: account.lastUsedAt?.toISOString(),
        banTime: new Date().toISOString(),
        banReason: 'detected_by_crawler'
      });

      // 直接更新数据库
      try {
        const dbUpdateStart = Date.now();
        await this.weiboAccountRepo.update(accountId, {
          status: WeiboAccountStatus.BANNED
        });
        const dbUpdateDuration = Date.now() - dbUpdateStart;

        this.logger.log('✅ 数据库更新成功', {
          accountId,
          updateDuration: dbUpdateDuration,
          totalBanDuration: Date.now() - banStartTime
        });

        // 更新统计信息
        const stats = await this.getAccountStats();
        this.logger.log('📊 账号状态统计更新', {
          stats,
          bannedRate: Math.round((stats.banned / stats.total) * 100),
          activeRate: Math.round((stats.active / stats.total) * 100)
        });

      } catch (error) {
        const dbUpdateDuration = Date.now() - banStartTime;
        this.logger.error('❌ 数据库更新失败', {
          accountId,
          updateDuration: dbUpdateDuration,
          error: error instanceof Error ? error.message : '未知错误',
          errorType: this.classifyDatabaseError(error),
          accountStatusInMemory: account.status,
          needsManualSync: true
        });
      }
    } else {
      this.logger.warn('⚠️ 尝试标记不存在的账号为banned', {
        accountId,
        availableAccountIds: Array.from(this.accounts.keys()),
        totalAccounts: this.accounts.size
      });
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

  /**
   * 格式化持续时间
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * 计算使用平衡度
   */
  private calculateUsageBalance(activeAccounts: WeiboAccount[]): {
    minUsage: number;
    maxUsage: number;
    averageUsage: number;
    balanceScore: number; // 0-100, 100表示完全平衡
  } {
    if (activeAccounts.length === 0) {
      return { minUsage: 0, maxUsage: 0, averageUsage: 0, balanceScore: 100 };
    }

    const usages = activeAccounts.map(acc => acc.usageCount);
    const minUsage = Math.min(...usages);
    const maxUsage = Math.max(...usages);
    const averageUsage = usages.reduce((sum, usage) => sum + usage, 0) / usages.length;

    // 计算平衡度：最大值和最小值的差异越小，平衡度越高
    const balanceScore = maxUsage > minUsage
      ? Math.round(((1 - (maxUsage - minUsage) / maxUsage) * 100))
      : 100;

    return {
      minUsage,
      maxUsage,
      averageUsage: Math.round(averageUsage),
      balanceScore
    };
  }

  /**
   * 分类初始化错误
   */
  private classifyInitError(error: any): string {
    if (!error) return 'UNKNOWN_INIT_ERROR';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('database') || errorMessage.includes('connection') ||
        errorMessage.includes('econnrefused')) {
      return 'DATABASE_CONNECTION_ERROR';
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
      return 'DATABASE_TIMEOUT_ERROR';
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('password') ||
        errorMessage.includes('login')) {
      return 'DATABASE_AUTH_ERROR';
    }

    if (errorMessage.includes('parse') || errorMessage.includes('json')) {
      return 'ACCOUNT_PARSE_ERROR';
    }

    return 'UNKNOWN_INIT_ERROR';
  }

  /**
   * 获取账号使用报告
   */
  async getAccountUsageReport(): Promise<{
    summary: {
      totalAccounts: number;
      activeAccounts: number;
      totalUsage: number;
      averageUsage: number;
      healthRate: number;
    };
    usageDistribution: Array<{
      accountId: number;
      nickname: string;
      usageCount: number;
      usagePercentage: number;
      lastUsedAt?: Date;
      healthScore: number;
    }>;
    trends: {
      mostUsed: Array<{ accountId: number; nickname: string; usageCount: number }>;
      leastUsed: Array<{ accountId: number; nickname: string; usageCount: number }>;
      recentlyActive: Array<{ accountId: number; nickname: string; lastUsedAt: Date }>;
      inactive: Array<{ accountId: number; nickname: string; daysSinceLastUse: number }>;
    };
    recommendations: string[];
  }> {
    const accounts = Array.from(this.accounts.values());
    const stats = await this.getAccountStats();
    const healthStatus = await this.checkAccountsHealth();

    const totalUsage = accounts.reduce((sum, acc) => sum + acc.usageCount, 0);
    const averageUsage = accounts.length > 0 ? totalUsage / accounts.length : 0;

    // 使用分布
    const usageDistribution = accounts.map(account => {
      const healthDetail = healthStatus.healthDetails.find(detail => detail.accountId === account.id);
      return {
        accountId: account.id,
        nickname: account.nickname,
        usageCount: account.usageCount,
        usagePercentage: totalUsage > 0 ? Math.round((account.usageCount / totalUsage) * 100) : 0,
        lastUsedAt: account.lastUsedAt,
        healthScore: healthDetail?.isHealthy ? 100 : Math.max(0, 100 - (healthDetail?.issues.length || 0) * 25)
      };
    }).sort((a, b) => b.usageCount - a.usageCount);

    // 趋势分析
    const mostUsed = usageDistribution.slice(0, 5);
    const leastUsed = usageDistribution.slice(-5).reverse();

    const recentlyActive = accounts
      .filter(acc => acc.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
      .slice(0, 5)
      .map(acc => ({
        accountId: acc.id,
        nickname: acc.nickname,
        lastUsedAt: acc.lastUsedAt!
      }));

    const now = Date.now();
    const inactive = accounts
      .filter(acc => !acc.lastUsedAt || (now - acc.lastUsedAt.getTime()) > 7 * 24 * 60 * 60 * 1000) // 7天未使用
      .map(acc => ({
        accountId: acc.id,
        nickname: acc.nickname,
        daysSinceLastUse: acc.lastUsedAt ? Math.floor((now - acc.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24)) : 999
      }))
      .sort((a, b) => b.daysSinceLastUse - a.daysSinceLastUse)
      .slice(0, 5);

    // 生成建议
    const recommendations: string[] = [];

    if (stats.active === 0) {
      recommendations.push('严重：没有可用账号，请立即检查账号配置');
    } else if (stats.active < 3) {
      recommendations.push('可用账号数量较少，建议增加更多账号以提高稳定性');
    }

    const balance = this.calculateUsageBalance(accounts.filter(acc => acc.status === 'active'));
    if (balance.balanceScore < 50) {
      recommendations.push('账号使用不均衡，建议调整轮换策略');
    }

    if (inactive.length > 0) {
      recommendations.push(`发现 ${inactive.length} 个长期未使用的账号，建议检查或清理`);
    }

    if (healthStatus.unhealthyAccounts > healthStatus.healthyAccounts) {
      recommendations.push('不健康的账号数量较多，建议检查账号状态和配置');
    }

    const maxUsage = Math.max(...accounts.map(acc => acc.usageCount));
    if (maxUsage > 200) {
      recommendations.push('部分账号使用次数过多，建议增加更多账号进行负载均衡');
    }

    return {
      summary: {
        totalAccounts: accounts.length,
        activeAccounts: stats.active,
        totalUsage,
        averageUsage: Math.round(averageUsage),
        healthRate: Math.round((healthStatus.healthyAccounts / accounts.length) * 100)
      },
      usageDistribution,
      trends: {
        mostUsed,
        leastUsed,
        recentlyActive,
        inactive
      },
      recommendations
    };
  }
}
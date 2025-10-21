import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { WeiboAccountEntity } from '@pro/entities';
import { WeiboAccountStatus } from '@pro/types';
import { BrowserService } from '../browser/browser.service';
import { DurationFormatter } from '@pro/crawler-utils';

export interface WeiboAccount {
  id: number;
  nickname: string;
  cookies: any[];
  status: WeiboAccountStatus;
  usageCount: number;
  lastUsedAt?: Date;
  // 新增MediaCrawler风格的账号健康度指标
  healthScore: number;
  lastValidatedAt?: Date;
  consecutiveFailures: number;
  totalSuccesses: number;
  averageResponseTime: number;
  bannedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  priority: number; // 账号优先级，数字越小优先级越高
  // Cookie完整性指标
  cookieExpiryTime?: Date;
  cookieValidationHash?: string;
}

interface ApiWeiboAccount {
  id: number;
  weiboUid: string;
  weiboNickname: string;
  status: string;
  cookies: string;
}

// Cookie验证结果接口
interface CookieValidationResult {
  isValid: boolean;
  loginStatus: boolean;
  responseTime: number;
  errorType?: string;
  errorMessage?: string;
  apiEndpoint?: string;
  statusCode?: number;
  expiresAt?: Date;
}

// 账号健康检查结果接口
interface AccountHealthCheckResult {
  accountId: number;
  isHealthy: boolean;
  healthScore: number;
  issues: string[];
  recommendations: string[];
  validationDetails: {
    cookieStatus: 'valid' | 'expired' | 'invalid' | 'missing';
    lastCheckTime: Date;
    responseTime: number;
    consecutiveFailures: number;
    bannedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

// 智能轮换策略配置
interface RotationStrategy {
  algorithm: 'round_robin' | 'weighted_random' | 'health_based' | 'load_balanced';
  healthThreshold: number;
  maxConsecutiveFailures: number;
  rotationInterval: number; // 分钟
  prioritizeHealthyAccounts: boolean;
}

// 负载均衡指标
interface LoadBalancingMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  accountUtilization: Array<{
    accountId: number;
    usagePercentage: number;
    healthScore: number;
    lastUsedAt: Date;
  }>;
}

@Injectable()
export class WeiboAccountService implements OnModuleInit {
  private readonly logger = new Logger(WeiboAccountService.name);
  private accounts: Map<number, WeiboAccount> = new Map();
  private currentIndex = 0;

  // MediaCrawler风格的智能管理属性
  private rotationStrategy: RotationStrategy = {
    algorithm: 'health_based',
    healthThreshold: 70,
    maxConsecutiveFailures: 3,
    rotationInterval: 5,
    prioritizeHealthyAccounts: true
  };

  private loadBalancingMetrics: LoadBalancingMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    accountUtilization: []
  };

  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheckTime = 0;
  private readonly WEIBO_API_BASE = 'https://m.weibo.cn';
  private readonly PONG_ENDPOINT = '/api/config';
  private readonly COOKIE_VALIDATION_TIMEOUT = 10000; // 10秒

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(WeiboAccountEntity)
    private readonly weiboAccountRepo: Repository<WeiboAccountEntity>,
    private readonly browserService: BrowserService,
  ) {}

  async onModuleInit() {
    const initStartTime = Date.now();

    this.logger.log('👤 微博账号服务开始初始化', {
      startTime: new Date(initStartTime).toISOString(),
      nodeVersion: process.version,
      environment: this.configService.get('NODE_ENV', 'development'),
      rotationStrategy: this.rotationStrategy,
      features: ['cookie_validation', 'health_monitoring', 'smart_rotation', 'load_balancing']
    });

    try {
      await this.loadAccountsFromDatabase();

      const initDuration = Date.now() - initStartTime;
      const stats = await this.getAccountStats();
      const healthStatus = await this.checkAccountsHealth();

      // 启动定期健康检查 - MediaCrawler风格
      this.startPeriodicHealthCheck();

      this.logger.log('✅ 微博账号服务初始化完成', {
        initTimeMs: initDuration,
        initTimeFormatted: DurationFormatter.format(initDuration),
        stats,
        health: {
          healthyAccounts: healthStatus.healthyAccounts,
          unhealthyAccounts: healthStatus.unhealthyAccounts,
          healthRate: Math.round((healthStatus.healthyAccounts / stats.total) * 100)
        },
        hasActiveAccounts: stats.active > 0,
        loadStrategy: this.accounts.size > 0 ? 'database' : 'fallback',
        smartFeatures: {
          rotationAlgorithm: this.rotationStrategy.algorithm,
          healthCheckEnabled: !!this.healthCheckInterval,
          cookieValidationEnabled: true,
          loadBalancingEnabled: true
        }
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
        initTimeFormatted: DurationFormatter.format(initDuration),
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
          lastUsedAt: undefined,
          // MediaCrawler风格的智能初始化
          healthScore: 100,
          lastValidatedAt: undefined,
          consecutiveFailures: 0,
          totalSuccesses: 0,
          averageResponseTime: 0,
          bannedRiskLevel: 'low',
          priority: dbAccount.id,
          cookieExpiryTime: this.calculateCookieExpiry(cookies),
          cookieValidationHash: this.generateCookieValidationHash(cookies)
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
            lastUsedAt: acc.lastUsedAt ? new Date(acc.lastUsedAt) : undefined,
            // MediaCrawler风格的智能初始化
            healthScore: 100,
            lastValidatedAt: undefined,
            consecutiveFailures: 0,
            totalSuccesses: 0,
            averageResponseTime: 0,
            bannedRiskLevel: 'low',
            priority: acc.id,
            cookieExpiryTime: this.calculateCookieExpiry(acc.cookies || []),
            cookieValidationHash: this.generateCookieValidationHash(acc.cookies || [])
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

    const balance = this.calculateUsageBalance(accounts.filter(acc => acc.status === WeiboAccountStatus.ACTIVE));
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

  // ==================== MediaCrawler风格的智能管理方法 ====================

  /**
   * 基于MediaCrawler的pong()方法实现Cookie验证
   * 这是数字时代的Cookie验证艺术品
   */
  async validateCookie(account: WeiboAccount): Promise<CookieValidationResult> {
    const validationStartTime = Date.now();

    this.logger.debug('🔍 开始Cookie有效性验证', {
      accountId: account.id,
      nickname: account.nickname,
      cookieCount: account.cookies.length,
      hasValidationHash: !!account.cookieValidationHash,
      lastValidatedAt: account.lastValidatedAt?.toISOString()
    });

    const result: CookieValidationResult = {
      isValid: false,
      loginStatus: false,
      responseTime: 0,
      apiEndpoint: this.WEIBO_API_BASE + this.PONG_ENDPOINT
    };

    try {
      // 首先检查Cookie的基本结构
      if (!account.cookies || account.cookies.length === 0) {
        result.errorType = 'missing_cookies';
        result.errorMessage = '账号没有有效的Cookie';
        this.logger.warn('Cookie验证失败 - 缺少Cookie', {
          accountId: account.id,
          nickname: account.nickname
        });
        return result;
      }

      // 检查Cookie是否过期
      if (account.cookieExpiryTime && new Date() > account.cookieExpiryTime) {
        result.errorType = 'expired_cookies';
        result.errorMessage = 'Cookie已过期';
        result.expiresAt = account.cookieExpiryTime;
        this.logger.warn('Cookie验证失败 - Cookie已过期', {
          accountId: account.id,
          nickname: account.nickname,
          expiryTime: account.cookieExpiryTime.toISOString()
        });
        return result;
      }

      // 使用BrowserService创建反检测浏览器上下文进行验证
      const browserContext = await this.browserService.createContext(account.id, account.cookies, {
        userAgent: this.generateRealisticUserAgent(),
        fingerprint: this.generateRealisticFingerprint()
      });

      const page = await browserContext.newPage();

      try {
        // 导航到微博配置接口 - MediaCrawler的pong()策略
        const responseStartTime = Date.now();
        const response = await page.goto(
          this.WEIBO_API_BASE + this.PONG_ENDPOINT,
          {
            waitUntil: 'networkidle',
            timeout: this.COOKIE_VALIDATION_TIMEOUT
          }
        );

        result.responseTime = Date.now() - responseStartTime;

        if (!response || !response.ok()) {
          result.statusCode = response?.status();
          result.errorType = 'http_error';
          result.errorMessage = `HTTP ${result.statusCode}: ${response?.statusText()}`;

          this.logger.warn('Cookie验证失败 - HTTP错误', {
            accountId: account.id,
            statusCode: result.statusCode,
            responseTime: result.responseTime
          });

          return result;
        }

        // 解析响应内容检查登录状态
        const responseText = await response.text();
        let responseData: any;

        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          result.errorType = 'response_parse_error';
          result.errorMessage = '响应内容解析失败';

          this.logger.warn('Cookie验证失败 - 响应解析错误', {
            accountId: account.id,
            responsePreview: responseText.substring(0, 200)
          });

          return result;
        }

        // MediaCrawler风格：检查login字段
        if (responseData && responseData.login === true) {
          result.isValid = true;
          result.loginStatus = true;

          this.logger.log('✅ Cookie验证成功', {
            accountId: account.id,
            nickname: account.nickname,
            responseTime: result.responseTime,
            validationDuration: Date.now() - validationStartTime
          });
        } else {
          result.errorType = 'not_logged_in';
          result.errorMessage = responseData?.msg || '登录状态无效';

          this.logger.warn('Cookie验证失败 - 登录状态无效', {
            accountId: account.id,
            nickname: account.nickname,
            responseData: responseData,
            responseTime: result.responseTime
          });
        }

      } finally {
        await page.close();
        await this.browserService.closeContext(account.id);
      }

    } catch (error) {
      result.responseTime = Date.now() - validationStartTime;
      result.errorType = 'validation_exception';
      result.errorMessage = error instanceof Error ? error.message : '未知验证错误';

      this.logger.error('Cookie验证异常', {
        accountId: account.id,
        nickname: account.nickname,
        error: result.errorMessage,
        responseTime: result.responseTime,
        errorType: this.classifyValidationError(error)
      });
    }

    return result;
  }

  /**
   * 启动定期健康检查
   */
  private startPeriodicHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const intervalMs = this.rotationStrategy.rotationInterval * 60 * 1000; // 转换为毫秒

    this.logger.log('🔄 启动定期健康检查', {
      intervalMinutes: this.rotationStrategy.rotationInterval,
      intervalMs,
      algorithm: this.rotationStrategy.algorithm,
      healthThreshold: this.rotationStrategy.healthThreshold
    });

    this.healthCheckInterval = setInterval(async () => {
      try {
        this.lastHealthCheckTime = Date.now();
        await this.performPeriodicHealthCheck();
      } catch (error) {
        this.logger.error('定期健康检查失败', {
          error: error instanceof Error ? error.message : '未知错误',
          lastCheckTime: new Date(this.lastHealthCheckTime).toISOString()
        });
      }
    }, intervalMs);

    // 立即执行一次健康检查
    this.performPeriodicHealthCheck().catch(error => {
      this.logger.error('初始健康检查失败', { error: error.message });
    });
  }

  /**
   * 执行定期健康检查
   */
  private async performPeriodicHealthCheck(): Promise<void> {
    const healthCheckStartTime = Date.now();

    this.logger.debug('🏥 开始执行定期健康检查', {
      totalAccounts: this.accounts.size,
      checkStartTime: new Date(healthCheckStartTime).toISOString()
    });

    const healthResults: AccountHealthCheckResult[] = [];
    const accounts = Array.from(this.accounts.values());

    for (const account of accounts) {
      try {
        const healthResult = await this.checkAccountHealth(account);
        healthResults.push(healthResult);

        // 更新账号健康度指标
        this.updateAccountHealthMetrics(account, healthResult);

      } catch (error) {
        this.logger.error('账号健康检查异常', {
          accountId: account.id,
          nickname: account.nickname,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    const healthCheckDuration = Date.now() - healthCheckStartTime;
    const healthyAccounts = healthResults.filter(r => r.isHealthy).length;
    const unhealthyAccounts = healthResults.length - healthyAccounts;

    this.logger.log('🏥 定期健康检查完成', {
      duration: healthCheckDuration,
      totalAccounts: accounts.length,
      healthyAccounts,
      unhealthyAccounts,
      healthRate: accounts.length > 0 ? Math.round((healthyAccounts / accounts.length) * 100) : 0,
      averageHealthScore: this.calculateAverageHealthScore(),
      checkTime: new Date().toISOString()
    });

    // 如果不健康的账号过多，发出警告
    if (unhealthyAccounts > accounts.length * 0.3) {
      this.logger.warn('⚠️ 发现较多不健康账号，可能需要人工干预', {
        unhealthyAccounts,
        totalAccounts: accounts.length,
        unhealthyRate: Math.round((unhealthyAccounts / accounts.length) * 100),
        recommendations: [
          '检查账号Cookie有效性',
          '考虑更新账号配置',
          '检查网络连接状态',
          '验证目标网站访问状态'
        ]
      });
    }
  }

  /**
   * 检查单个账号的健康状态
   */
  private async checkAccountHealth(account: WeiboAccount): Promise<AccountHealthCheckResult> {
    const healthCheckStartTime = Date.now();

    const result: AccountHealthCheckResult = {
      accountId: account.id,
      isHealthy: true,
      healthScore: 100,
      issues: [],
      recommendations: [],
      validationDetails: {
        cookieStatus: 'valid',
        lastCheckTime: new Date(),
        responseTime: 0,
        consecutiveFailures: account.consecutiveFailures,
        bannedRiskLevel: account.bannedRiskLevel
      }
    };

    // 1. 检查Cookie有效性
    const cookieValidation = await this.validateCookie(account);
    result.validationDetails.responseTime = cookieValidation.responseTime;

    if (!cookieValidation.isValid) {
      result.isHealthy = false;
      result.healthScore -= 40;
      result.issues.push(`Cookie验证失败: ${cookieValidation.errorMessage || '未知错误'}`);
      result.recommendations.push('更新账号Cookie或重新登录');

      if (cookieValidation.errorType === 'expired_cookies') {
        result.validationDetails.cookieStatus = 'expired';
      } else if (cookieValidation.errorType === 'missing_cookies') {
        result.validationDetails.cookieStatus = 'missing';
      } else {
        result.validationDetails.cookieStatus = 'invalid';
      }
    }

    // 2. 检查连续失败次数
    if (account.consecutiveFailures > this.rotationStrategy.maxConsecutiveFailures) {
      result.isHealthy = false;
      result.healthScore -= 30;
      result.issues.push(`连续失败次数过多: ${account.consecutiveFailures}`);
      result.recommendations.push('暂时停用此账号，检查问题原因');
    }

    // 3. 检查响应时间
    if (cookieValidation.responseTime > 8000) {
      result.isHealthy = false;
      result.healthScore -= 20;
      result.issues.push(`响应时间过长: ${cookieValidation.responseTime}ms`);
      result.recommendations.push('检查网络连接或更换账号');
    }

    // 4. 检查banned风险等级
    if (account.bannedRiskLevel === 'high' || account.bannedRiskLevel === 'critical') {
      result.isHealthy = false;
      result.healthScore -= account.bannedRiskLevel === 'critical' ? 50 : 30;
      result.issues.push(`账号封禁风险: ${account.bannedRiskLevel}`);
      result.recommendations.push('降低此账号使用频率或暂停使用');
    }

    // 5. 检查使用频率
    if (account.usageCount > 500) {
      result.healthScore -= 10;
      result.issues.push('使用频率过高，可能影响账号安全');
      result.recommendations.push('增加更多账号进行负载均衡');
    }

    // 确保健康分数在合理范围内
    result.healthScore = Math.max(0, Math.min(100, result.healthScore));

    const healthCheckDuration = Date.now() - healthCheckStartTime;

    this.logger.debug('账号健康检查完成', {
      accountId: account.id,
      nickname: account.nickname,
      isHealthy: result.isHealthy,
      healthScore: result.healthScore,
      issuesCount: result.issues.length,
      checkDuration: healthCheckDuration,
      responseTime: cookieValidation.responseTime
    });

    return result;
  }

  /**
   * 更新账号健康度指标
   */
  private updateAccountHealthMetrics(account: WeiboAccount, healthResult: AccountHealthCheckResult): void {
    account.healthScore = healthResult.healthScore;
    account.lastValidatedAt = healthResult.validationDetails.lastCheckTime;

    // 如果验证成功，重置连续失败计数
    if (healthResult.validationDetails.cookieStatus === 'valid') {
      account.consecutiveFailures = 0;
      account.totalSuccesses++;
    } else {
      account.consecutiveFailures++;
    }

    // 更新平均响应时间
    if (healthResult.validationDetails.responseTime > 0) {
      account.averageResponseTime = this.calculateMovingAverage(
        account.averageResponseTime,
        healthResult.validationDetails.responseTime,
        account.totalSuccesses
      );
    }

    // 更新banned风险等级
    account.bannedRiskLevel = this.assessBannedRiskLevel(account);

    this.logger.debug('账号健康指标已更新', {
      accountId: account.id,
      healthScore: account.healthScore,
      consecutiveFailures: account.consecutiveFailures,
      totalSuccesses: account.totalSuccesses,
      averageResponseTime: account.averageResponseTime,
      bannedRiskLevel: account.bannedRiskLevel
    });
  }

  /**
   * 智能账号轮换策略 - MediaCrawler风格
   */
  async getOptimalAccount(preferredAccountId?: number): Promise<WeiboAccount | null> {
    const requestStartTime = Date.now();

    this.logger.debug('🎯 开始智能账号选择', {
      requestedAccountId: preferredAccountId,
      algorithm: this.rotationStrategy.algorithm,
      healthThreshold: this.rotationStrategy.healthThreshold,
      totalAccounts: this.accounts.size
    });

    this.loadBalancingMetrics.totalRequests++;

    try {
      // 如果指定了账号ID，优先检查该账号
      if (preferredAccountId) {
        const account = this.accounts.get(preferredAccountId);
        if (account && this.isAccountSuitableForUse(account)) {
          this.recordAccountUsage(account);
          this.loadBalancingMetrics.successfulRequests++;

          this.logger.log('✅ 指定账号分配成功', {
            accountId: account.id,
            nickname: account.nickname,
            healthScore: account.healthScore,
            selectionDuration: Date.now() - requestStartTime
          });

          return account;
        } else {
          this.logger.warn('指定账号不适合使用', {
            accountId: preferredAccountId,
            accountExists: !!account,
            isSuitable: account ? this.isAccountSuitableForUse(account) : false
          });
        }
      }

      // 根据轮换策略选择最优账号
      let selectedAccount: WeiboAccount | null = null;

      switch (this.rotationStrategy.algorithm) {
        case 'health_based':
          selectedAccount = await this.selectAccountByHealth();
          break;
        case 'weighted_random':
          selectedAccount = await this.selectAccountByWeightedRandom();
          break;
        case 'load_balanced':
          selectedAccount = await this.selectAccountByLoadBalancing();
          break;
        case 'round_robin':
        default:
          selectedAccount = await this.selectAccountByRoundRobin();
          break;
      }

      if (selectedAccount) {
        this.recordAccountUsage(selectedAccount);
        this.loadBalancingMetrics.successfulRequests++;

        this.logger.log('✅ 智能账号分配成功', {
          accountId: selectedAccount.id,
          nickname: selectedAccount.nickname,
          algorithm: this.rotationStrategy.algorithm,
          healthScore: selectedAccount.healthScore,
          selectionDuration: Date.now() - requestStartTime,
          selectionReason: this.getAccountSelectionReason(selectedAccount)
        });

        return selectedAccount;
      } else {
        this.loadBalancingMetrics.failedRequests++;
        this.logger.error('❌ 没有找到合适的账号', {
          algorithm: this.rotationStrategy.algorithm,
          totalAccounts: this.accounts.size,
          healthyAccounts: Array.from(this.accounts.values()).filter(acc => acc.healthScore >= this.rotationStrategy.healthThreshold).length,
          selectionDuration: Date.now() - requestStartTime
        });

        return null;
      }

    } catch (error) {
      this.loadBalancingMetrics.failedRequests++;
      this.logger.error('智能账号选择失败', {
        error: error instanceof Error ? error.message : '未知错误',
        selectionDuration: Date.now() - requestStartTime
      });

      return null;
    }
  }

  /**
   * 基于健康度选择账号
   */
  private async selectAccountByHealth(): Promise<WeiboAccount | null> {
    const healthyAccounts = Array.from(this.accounts.values())
      .filter(account => this.isAccountSuitableForUse(account))
      .sort((a, b) => {
        // 优先按健康分数排序，然后按优先级排序
        if (b.healthScore !== a.healthScore) {
          return b.healthScore - a.healthScore;
        }
        return a.priority - b.priority;
      });

    return healthyAccounts.length > 0 ? healthyAccounts[0] : null;
  }

  /**
   * 基于加权随机选择账号
   */
  private async selectAccountByWeightedRandom(): Promise<WeiboAccount | null> {
    const suitableAccounts = Array.from(this.accounts.values())
      .filter(account => this.isAccountSuitableForUse(account));

    if (suitableAccounts.length === 0) {
      return null;
    }

    // 计算权重（基于健康分数和使用频率）
    const weights = suitableAccounts.map(account => {
      let weight = account.healthScore;

      // 使用次数越少，权重越高
      const usagePenalty = Math.min(account.usageCount * 2, 50);
      weight += Math.max(0, 50 - usagePenalty);

      return Math.max(weight, 1);
    });

    // 加权随机选择
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < suitableAccounts.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return suitableAccounts[i];
      }
    }

    return suitableAccounts[suitableAccounts.length - 1];
  }

  /**
   * 基于负载均衡选择账号
   */
  private async selectAccountByLoadBalancing(): Promise<WeiboAccount | null> {
    const suitableAccounts = Array.from(this.accounts.values())
      .filter(account => this.isAccountSuitableForUse(account))
      .sort((a, b) => {
        // 优先选择使用次数少的账号
        if (a.usageCount !== b.usageCount) {
          return a.usageCount - b.usageCount;
        }

        // 然后按健康分数排序
        if (a.healthScore !== b.healthScore) {
          return b.healthScore - a.healthScore;
        }

        // 最后按优先级排序
        return a.priority - b.priority;
      });

    return suitableAccounts.length > 0 ? suitableAccounts[0] : null;
  }

  /**
   * 轮询选择账号
   */
  private async selectAccountByRoundRobin(): Promise<WeiboAccount | null> {
    const suitableAccounts = Array.from(this.accounts.values())
      .filter(account => this.isAccountSuitableForUse(account))
      .sort((a, b) => a.priority - b.priority);

    if (suitableAccounts.length === 0) {
      return null;
    }

    const selectedAccount = suitableAccounts[this.currentIndex % suitableAccounts.length];
    this.currentIndex = (this.currentIndex + 1) % suitableAccounts.length;

    return selectedAccount;
  }

  /**
   * 检查账号是否适合使用
   */
  private isAccountSuitableForUse(account: WeiboAccount): boolean {
    // 检查基本状态
    if (account.status !== WeiboAccountStatus.ACTIVE) {
      return false;
    }

    // 检查健康分数
    if (account.healthScore < this.rotationStrategy.healthThreshold) {
      return false;
    }

    // 检查连续失败次数
    if (account.consecutiveFailures > this.rotationStrategy.maxConsecutiveFailures) {
      return false;
    }

    // 检查banned风险等级
    if (account.bannedRiskLevel === 'critical') {
      return false;
    }

    // 检查Cookie是否存在
    if (!account.cookies || account.cookies.length === 0) {
      return false;
    }

    // 检查Cookie是否过期
    if (account.cookieExpiryTime && new Date() > account.cookieExpiryTime) {
      return false;
    }

    return true;
  }

  /**
   * 记录账号使用情况
   */
  private recordAccountUsage(account: WeiboAccount): void {
    account.usageCount++;
    account.lastUsedAt = new Date();

    // 更新负载均衡指标
    this.loadBalancingMetrics.averageResponseTime = this.calculateMovingAverage(
      this.loadBalancingMetrics.averageResponseTime,
      account.averageResponseTime,
      this.loadBalancingMetrics.successfulRequests
    );
  }

  // ==================== 辅助方法 ====================

  /**
   * 生成真实的User-Agent
   */
  private generateRealisticUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ];

    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * 生成真实的浏览器指纹
   */
  private generateRealisticFingerprint(): any {
    return {
      screenResolution: { width: 1920, height: 1080 },
      timezone: 'Asia/Shanghai',
      language: ['zh-CN', 'zh', 'en'],
      platform: 'Win32',
      webglFingerprint: true,
      canvasFingerprint: true
    };
  }

  /**
   * 计算Cookie过期时间
   */
  private calculateCookieExpiry(cookies: any[]): Date | undefined {
    const expiryCookie = cookies.find(cookie =>
      cookie.name.toLowerCase().includes('expire') ||
      cookie.name.toLowerCase().includes('session')
    );

    if (expiryCookie && expiryCookie.expires) {
      return new Date(expiryCookie.expires);
    }

    // 默认30天后过期
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  /**
   * 生成Cookie验证哈希
   */
  private generateCookieValidationHash(cookies: any[]): string {
    const cookieString = cookies
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join(';');

    // 简单的哈希算法，实际项目中应该使用更强的哈希
    let hash = 0;
    for (let i = 0; i < cookieString.length; i++) {
      const char = cookieString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * 计算移动平均值
   */
  private calculateMovingAverage(currentAverage: number, newValue: number, count: number): number {
    if (count === 0) {
      return newValue;
    }
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  /**
   * 评估账号banned风险等级
   */
  private assessBannedRiskLevel(account: WeiboAccount): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // 连续失败次数增加风险
    riskScore += Math.min(account.consecutiveFailures * 10, 30);

    // 使用频率增加风险
    if (account.usageCount > 500) riskScore += 15;
    if (account.usageCount > 1000) riskScore += 15;

    // 健康分数低增加风险
    if (account.healthScore < 50) riskScore += 20;
    if (account.healthScore < 30) riskScore += 20;

    // 响应时间增加风险
    if (account.averageResponseTime > 5000) riskScore += 10;
    if (account.averageResponseTime > 8000) riskScore += 10;

    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'medium';
    return 'low';
  }

  /**
   * 计算平均健康分数
   */
  private calculateAverageHealthScore(): number {
    const accounts = Array.from(this.accounts.values());
    if (accounts.length === 0) return 0;

    const totalHealthScore = accounts.reduce((sum, account) => sum + account.healthScore, 0);
    return Math.round(totalHealthScore / accounts.length);
  }

  /**
   * 获取账号选择原因
   */
  private getAccountSelectionReason(account: WeiboAccount): string {
    const reasons = [];

    if (account.healthScore >= 90) reasons.push('健康度优秀');
    else if (account.healthScore >= 70) reasons.push('健康度良好');

    if (account.usageCount < 10) reasons.push('使用频率低');
    if (account.consecutiveFailures === 0) reasons.push('无连续失败');
    if (account.bannedRiskLevel === 'low') reasons.push('封禁风险低');

    return reasons.join(', ') || '综合评估最优';
  }

  /**
   * 分类验证错误
   */
  private classifyValidationError(error: any): string {
    if (!error) return 'UNKNOWN_VALIDATION_ERROR';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return 'VALIDATION_TIMEOUT';
    }

    if (errorMessage.includes('network') || errorMessage.includes('网络')) {
      return 'NETWORK_ERROR';
    }

    if (errorMessage.includes('blocked') || errorMessage.includes('blocked')) {
      return 'ACCESS_BLOCKED';
    }

    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return 'ACCESS_FORBIDDEN';
    }

    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return 'AUTHENTICATION_FAILED';
    }

    return 'UNKNOWN_VALIDATION_ERROR';
  }

  // ==================== 公共API方法 ====================

  /**
   * 获取智能账号（替代原有的getAvailableAccount）
   */
  async getAvailableAccount(accountId?: number): Promise<WeiboAccount | null> {
    return this.getOptimalAccount(accountId);
  }

  /**
   * 手动验证账号Cookie
   */
  async validateAccountCookie(accountId: number): Promise<CookieValidationResult | null> {
    const account = this.accounts.get(accountId);
    if (!account) {
      this.logger.warn('账号不存在', { accountId });
      return null;
    }

    return this.validateCookie(account);
  }

  /**
   * 获取负载均衡报告
   */
  async getLoadBalancingReport(): Promise<{
    metrics: LoadBalancingMetrics;
    accountsHealth: Array<{
      accountId: number;
      nickname: string;
      healthScore: number;
      usageCount: number;
      bannedRiskLevel: string;
      isSuitable: boolean;
    }>;
    recommendations: string[];
  }> {
    const accountsHealth = Array.from(this.accounts.values()).map(account => ({
      accountId: account.id,
      nickname: account.nickname,
      healthScore: account.healthScore,
      usageCount: account.usageCount,
      bannedRiskLevel: account.bannedRiskLevel,
      isSuitable: this.isAccountSuitableForUse(account)
    }));

    const recommendations = this.generateLoadBalancingRecommendations();

    return {
      metrics: { ...this.loadBalancingMetrics },
      accountsHealth,
      recommendations
    };
  }

  /**
   * 生成负载均衡建议
   */
  private generateLoadBalancingRecommendations(): string[] {
    const recommendations: string[] = [];
    const accounts = Array.from(this.accounts.values());
    const suitableAccounts = accounts.filter(acc => this.isAccountSuitableForUse(acc));

    if (suitableAccounts.length < 3) {
      recommendations.push('可用账号数量较少，建议增加更多账号');
    }

    const averageUsage = accounts.reduce((sum, acc) => sum + acc.usageCount, 0) / accounts.length;
    const highUsageAccounts = accounts.filter(acc => acc.usageCount > averageUsage * 1.5);

    if (highUsageAccounts.length > 0) {
      recommendations.push('部分账号使用频率过高，建议优化负载均衡策略');
    }

    const successRate = this.loadBalancingMetrics.totalRequests > 0
      ? (this.loadBalancingMetrics.successfulRequests / this.loadBalancingMetrics.totalRequests) * 100
      : 0;

    if (successRate < 80) {
      recommendations.push('账号请求成功率较低，建议检查账号健康状态');
    }

    if (this.loadBalancingMetrics.averageResponseTime > 5000) {
      recommendations.push('平均响应时间较长，建议优化网络或账号配置');
    }

    return recommendations;
  }

  /**
   * 停止定期健康检查
   */
  async stopPeriodicHealthCheck(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;

      this.logger.log('定期健康检查已停止');
    }
  }

  /**
   * 重新开始定期健康检查
   */
  async restartPeriodicHealthCheck(): Promise<void> {
    await this.stopPeriodicHealthCheck();
    this.startPeriodicHealthCheck();
  }
}

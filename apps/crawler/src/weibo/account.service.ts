import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { WeiboAccountEntity } from '@pro/entities';
import { WeiboAccountStatus } from '@pro/types';
import { BrowserService } from '../browser/browser.service';
import { WeiboAccountSelector, AccountSelectionAlgorithm } from './account.selector';
import { DurationFormatter } from '@pro/crawler-utils';
import { RedisClient } from '@pro/redis';

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
export interface CookieValidationResult {
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
export interface AccountHealthCheckResult {
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
export interface RotationStrategy {
  algorithm: AccountSelectionAlgorithm;
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
  private readonly redisHealthKey = 'weibo:account:health';
  private readonly redisMetricsPrefix = 'weibo:account';

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

  private readonly WEIBO_API_BASE = 'https://m.weibo.cn';
  private readonly PONG_ENDPOINT = '/api/config';
  private readonly COOKIE_VALIDATION_TIMEOUT = 10000; // 10秒

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(WeiboAccountEntity)
    private readonly weiboAccountRepo: Repository<WeiboAccountEntity>,
    private readonly browserService: BrowserService,
    private readonly redis: RedisClient,
    private readonly accountSelector: WeiboAccountSelector,
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
          redisHealthSyncEnabled: true,
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
    const parseNumericMetric = (value: string | undefined): number => {
      const parsed = Number.parseInt(value ?? '', 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

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
        const cookies = this.extractCookies(dbAccount.cookies, {
          accountId: dbAccount.id,
          nickname: dbAccount.weiboNickname,
          context: 'initial_load'
        });

        if (!cookies) {
          invalidCookiesAccounts++;
          skippedAccounts++;
          continue;
        }

        const member = dbAccount.id.toString();
        const redisScore = await this.redis.zscore(this.redisHealthKey, member);
        const metrics = await this.redis.hgetall(this.redisMetricsKey(dbAccount.id));

        const normalizedHealthScore = typeof redisScore === 'number' && !Number.isNaN(redisScore)
          ? redisScore
          : 100;
        const usageCount = parseNumericMetric(metrics?.usageCount);
        const consecutiveFailures = parseNumericMetric(metrics?.consecutiveFailures);
        const totalSuccesses = parseNumericMetric(metrics?.totalSuccesses);
        const lastValidatedAtMs = Number.parseInt(metrics?.lastValidatedAt ?? '', 10);
        const lastValidatedAt = Number.isNaN(lastValidatedAtMs) ? undefined : new Date(lastValidatedAtMs);
        const lastUsedAtMs = Number.parseInt(metrics?.lastUsedAt ?? '', 10);
        const lastUsedAt = Number.isNaN(lastUsedAtMs) ? undefined : new Date(lastUsedAtMs);

        this.accounts.set(dbAccount.id, {
          id: dbAccount.id,
          nickname: dbAccount.weiboNickname || `账号${dbAccount.id}`,
          cookies,
          status: dbAccount.status,
          usageCount,
          lastUsedAt,
          // MediaCrawler风格的智能初始化
          healthScore: normalizedHealthScore,
          lastValidatedAt,
          consecutiveFailures,
          totalSuccesses,
          averageResponseTime: 0,
          bannedRiskLevel: 'low',
          priority: dbAccount.id,
          cookieExpiryTime: this.calculateCookieExpiry(cookies),
          cookieValidationHash: this.generateCookieValidationHash(cookies)
        });

        if (redisScore === null || Number.isNaN(redisScore)) {
          await this.redis.zadd(this.redisHealthKey, normalizedHealthScore, member);
        }

        if (!metrics || Object.keys(metrics).length === 0) {
          await this.redis.hmset(this.redisMetricsKey(dbAccount.id), {
            consecutiveFailures: 0,
            totalSuccesses: 0,
            usageCount: 0,
          });
        }

        loadedAccounts++;

        this.logger.debug('账号加载成功', {
          accountId: dbAccount.id,
          nickname: dbAccount.weiboNickname,
          cookiesCount: cookies.length,
          lastCheckAt: dbAccount.lastCheckAt?.toISOString(),
          redisHealthScore: normalizedHealthScore
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

  private extractCookies(
    rawCookies: unknown,
    details: { accountId: number; nickname?: string | null; context: 'initial_load' | 'refresh' },
  ): any[] | null {
    if (!rawCookies) {
      this.logger.warn('账号cookies缺失', {
        accountId: details.accountId,
        nickname: details.nickname,
        context: details.context
      });
      return null;
    }

    if (Array.isArray(rawCookies)) {
      return rawCookies;
    }

    try {
      const parsed = JSON.parse(String(rawCookies));
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.logger.warn('账号cookies格式无效', {
          accountId: details.accountId,
          nickname: details.nickname,
          cookiesType: typeof parsed,
          cookiesLength: Array.isArray(parsed) ? parsed.length : 0,
          context: details.context
        });
        return null;
      }
      return parsed;
    } catch (error) {
      this.logger.warn('解析账号cookies失败', {
        accountId: details.accountId,
        nickname: details.nickname,
        error: error instanceof Error ? error.message : '未知错误',
        cookiesPreview: typeof rawCookies === 'string' ? rawCookies.substring(0, 100) : undefined,
        context: details.context
      });
      return null;
    }
  }

  private async refreshAccountsFromDatabase(): Promise<void> {
    const refreshStartTime = Date.now();
    let addedAccounts = 0;
    let updatedAccounts = 0;
    let removedAccounts = 0;
    let skippedAccounts = 0;

    try {
      const dbAccounts = await this.weiboAccountRepo.find({
        where: { status: WeiboAccountStatus.ACTIVE },
        order: { lastCheckAt: 'ASC' }
      });

      const activeAccountIds = new Set<number>();

      for (const dbAccount of dbAccounts) {
        activeAccountIds.add(dbAccount.id);
        const cookies = this.extractCookies(dbAccount.cookies, {
          accountId: dbAccount.id,
          nickname: dbAccount.weiboNickname,
          context: 'refresh'
        });

        if (!cookies) {
          if (this.accounts.delete(dbAccount.id)) {
            removedAccounts++;
          }
          skippedAccounts++;
          continue;
        }

        const existingAccount = this.accounts.get(dbAccount.id);

        if (existingAccount) {
          existingAccount.nickname = dbAccount.weiboNickname || `账号${dbAccount.id}`;
          existingAccount.status = dbAccount.status;
          existingAccount.cookies = cookies;
          existingAccount.cookieExpiryTime = this.calculateCookieExpiry(cookies);
          existingAccount.cookieValidationHash = this.generateCookieValidationHash(cookies);
          existingAccount.priority = dbAccount.id;
          updatedAccounts++;
        } else {
          const member = dbAccount.id.toString();
          const redisScore = await this.redis.zscore(this.redisHealthKey, member);
          const metrics = await this.redis.hgetall(this.redisMetricsKey(dbAccount.id));
          const parseMetric = (value: string | undefined): number => {
            const parsed = Number.parseInt(value ?? '', 10);
            return Number.isNaN(parsed) ? 0 : parsed;
          };
          const normalizedHealthScore = typeof redisScore === 'number' && !Number.isNaN(redisScore)
            ? redisScore
            : 100;
          const usageCount = parseMetric(metrics?.usageCount);
          const consecutiveFailures = parseMetric(metrics?.consecutiveFailures);
          const totalSuccesses = parseMetric(metrics?.totalSuccesses);
          const lastValidatedAtMs = Number.parseInt(metrics?.lastValidatedAt ?? '', 10);
          const lastValidatedAt = Number.isNaN(lastValidatedAtMs) ? undefined : new Date(lastValidatedAtMs);
          const lastUsedAtMs = Number.parseInt(metrics?.lastUsedAt ?? '', 10);
          const lastUsedAt = Number.isNaN(lastUsedAtMs) ? undefined : new Date(lastUsedAtMs);

          this.accounts.set(dbAccount.id, {
            id: dbAccount.id,
            nickname: dbAccount.weiboNickname || `账号${dbAccount.id}`,
            cookies,
            status: dbAccount.status,
            usageCount,
            lastUsedAt,
            healthScore: normalizedHealthScore,
            lastValidatedAt,
            consecutiveFailures,
            totalSuccesses,
            averageResponseTime: 0,
            bannedRiskLevel: 'low',
            priority: dbAccount.id,
            cookieExpiryTime: this.calculateCookieExpiry(cookies),
            cookieValidationHash: this.generateCookieValidationHash(cookies)
          });

          if (redisScore === null || Number.isNaN(redisScore)) {
            await this.redis.zadd(this.redisHealthKey, normalizedHealthScore, member);
          }

          if (!metrics || Object.keys(metrics).length === 0) {
            await this.redis.hmset(this.redisMetricsKey(dbAccount.id), {
              consecutiveFailures: 0,
              totalSuccesses: 0,
              usageCount: 0,
            });
          }

          addedAccounts++;
        }
      }

      for (const accountId of Array.from(this.accounts.keys())) {
        if (!activeAccountIds.has(accountId)) {
          this.accounts.delete(accountId);
          removedAccounts++;
        }
      }

      const refreshDuration = Date.now() - refreshStartTime;
      this.logger.debug('数据库账号刷新完成', {
        refreshTimeMs: refreshDuration,
        addedAccounts,
        updatedAccounts,
        removedAccounts,
        skippedAccounts,
        totalAccounts: this.accounts.size
      });
    } catch (error) {
      const refreshDuration = Date.now() - refreshStartTime;
      this.logger.error('刷新账号列表失败', {
        refreshTimeMs: refreshDuration,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        errorCode: this.classifyDatabaseError(error)
      });
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

        // 与Admin服务保持一致：优先检查ok字段
        const apiOkValue = responseData?.ok;
        const apiAcknowledgedSession = apiOkValue === 1;
        const loginConfirmed = responseData?.data?.login === true;

        if (apiAcknowledgedSession) {
          result.isValid = true;
          result.loginStatus = loginConfirmed || apiAcknowledgedSession;

          this.logger.log('✅ Cookie验证成功 - 接口返回ok', {
            accountId: account.id,
            nickname: account.nickname,
            responseTime: result.responseTime,
            validationDuration: Date.now() - validationStartTime,
            apiOkValue,
            loginConfirmed
          });
        } else {
          result.errorType = 'not_logged_in';
          result.errorMessage = responseData?.msg || '登录状态无效';

          this.logger.warn('Cookie验证失败 - 接口未确认登录', {
            accountId: account.id,
            nickname: account.nickname,
            responseTime: result.responseTime,
            apiOkValue,
            apiAcknowledgedSession,
            loginConfirmed,
            responseData
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
   * 智能账号轮换策略 - 优先使用 Redis 中的健康度排行
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
      if (preferredAccountId) {
        const account = this.accounts.get(preferredAccountId);
        if (account) {
          if (this.isAccountSuitableForUse(account)) {
            await this.recordAccountUsage(account);
            this.loadBalancingMetrics.successfulRequests++;

            this.logger.log('✅ 指定账号分配成功', {
              accountId: account.id,
              nickname: account.nickname,
              healthScore: account.healthScore,
              selectionDuration: Date.now() - requestStartTime
            });

            return account;
          }

          this.logger.warn('指定账号不适合使用', {
            accountId: preferredAccountId,
            accountExists: true,
            isSuitable: false
          });
        } else {
          this.logger.warn('指定账号不存在', {
            accountId: preferredAccountId
          });
        }
      }

      const topEntries = await this.redis.zrevrange(this.redisHealthKey, 0, 9, true);
      const redisCandidates: Array<{ id: number; score: number }> = [];

      for (let index = 0; index < topEntries.length; index += 2) {
        const idValue = topEntries[index];
        const scoreValue = topEntries[index + 1];
        if (idValue === undefined || scoreValue === undefined) {
          continue;
        }

        const id = Number.parseInt(idValue, 10);
        const score = Number.parseFloat(scoreValue);

        if (Number.isNaN(id) || Number.isNaN(score)) {
          continue;
        }

        redisCandidates.push({ id, score });
      }

      if (redisCandidates.length > 0) {
        this.logger.debug('Redis 健康度排行', { candidates: redisCandidates });

        for (const candidate of redisCandidates) {
          const account = this.accounts.get(candidate.id);
          if (!account) {
            continue;
          }

          account.healthScore = candidate.score;

          if (this.isAccountSuitableForUse(account)) {
            await this.recordAccountUsage(account);
            this.loadBalancingMetrics.successfulRequests++;

            this.logger.log('✅ 智能账号分配成功', {
              accountId: account.id,
              nickname: account.nickname,
              algorithm: 'redis_sorted_set',
              healthScore: account.healthScore,
              selectionDuration: Date.now() - requestStartTime
            });

            return account;
          }
        }
      }

      const accountsArray = Array.from(this.accounts.values());
      const suitableAccounts = accountsArray.filter(account => this.isAccountSuitableForUse(account));

      const accountSnapshots = accountsArray.map(account => ({
        accountId: account.id,
        nickname: account.nickname,
        healthScore: account.healthScore,
        status: account.status,
        consecutiveFailures: account.consecutiveFailures,
        bannedRiskLevel: account.bannedRiskLevel,
        cookieExpiryTime: account.cookieExpiryTime?.toISOString(),
        cookieCount: account.cookies?.length || 0
      }));

      this.logger.debug('📊 账号健康快照', {
        totalAccounts: accountsArray.length,
        suitableAccounts: suitableAccounts.length,
        healthThreshold: this.rotationStrategy.healthThreshold,
        accounts: accountSnapshots
      });

      const selectedAccount = this.accountSelector.select(
        suitableAccounts,
        this.rotationStrategy.algorithm,
      );

      if (selectedAccount) {
        await this.recordAccountUsage(selectedAccount);
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
      }

      const fallbackAccount = this.accountSelector.select(
        accountsArray,
        'health_based'
      );

      if (fallbackAccount) {
        await this.recordAccountUsage(fallbackAccount);
        this.loadBalancingMetrics.successfulRequests++;

        this.logger.warn('⚠️ 没有达到健康阈值的账号，启用最佳账号降级策略', {
          fallbackAccountId: fallbackAccount.id,
          fallbackHealthScore: fallbackAccount.healthScore,
          selectionDuration: Date.now() - requestStartTime,
          healthThreshold: this.rotationStrategy.healthThreshold
        });

        return fallbackAccount;
      }

      this.loadBalancingMetrics.failedRequests++;
      this.logger.error('❌ 没有找到任何可用账号', {
        algorithm: this.rotationStrategy.algorithm,
        totalAccounts: accountsArray.length,
        healthyAccounts: suitableAccounts.length,
        selectionDuration: Date.now() - requestStartTime,
        redisCandidates
      });

      return null;
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
   * 检查账号是否适合使用
   */
  private isAccountSuitableForUse(account: WeiboAccount): boolean {
    const exclusionReasons: string[] = [];

    if (account.status !== WeiboAccountStatus.ACTIVE) {
      exclusionReasons.push(`账号状态为${account.status}`);
    }

    if (account.healthScore < this.rotationStrategy.healthThreshold) {
      exclusionReasons.push(`健康分数低于阈值(${account.healthScore}/${this.rotationStrategy.healthThreshold})`);
    }

    if (account.consecutiveFailures > this.rotationStrategy.maxConsecutiveFailures) {
      exclusionReasons.push(`连续失败${account.consecutiveFailures}次`);
    }

    if (account.bannedRiskLevel === 'critical') {
      exclusionReasons.push('封禁风险处于critical级别');
    }

    if (!account.cookies || account.cookies.length === 0) {
      exclusionReasons.push('缺少有效Cookie');
    }

    if (account.cookieExpiryTime && new Date() > account.cookieExpiryTime) {
      exclusionReasons.push('Cookie已过期');
    }

    if (exclusionReasons.length > 0) {
      this.logger.debug('账号暂不可用', {
        accountId: account.id,
        nickname: account.nickname,
        reasons: exclusionReasons,
        healthScore: account.healthScore,
        consecutiveFailures: account.consecutiveFailures,
        bannedRiskLevel: account.bannedRiskLevel,
        cookieCount: account.cookies?.length || 0,
        cookieExpiryTime: account.cookieExpiryTime?.toISOString(),
        lastValidatedAt: account.lastValidatedAt?.toISOString()
      });
      return false;
    }

    return true;
  }

  /**
   * 记录账号使用情况
   */
  private async recordAccountUsage(account: WeiboAccount): Promise<void> {
    account.usageCount++;
    account.lastUsedAt = new Date();
    account.consecutiveFailures = 0;

    const pipeline = this.redis.pipeline();
    pipeline.zincrby(this.redisHealthKey, -1, account.id.toString());
    pipeline.hset(this.redisMetricsKey(account.id), 'usageCount', account.usageCount);
    pipeline.hset(this.redisMetricsKey(account.id), 'lastUsedAt', Date.now());
    await pipeline.exec();

    account.healthScore = Math.max(0, account.healthScore - 1);

    // 更新负载均衡指标
    this.loadBalancingMetrics.averageResponseTime = this.calculateMovingAverage(
      this.loadBalancingMetrics.averageResponseTime,
      account.averageResponseTime,
      this.loadBalancingMetrics.successfulRequests
    );
  }

  /**
   * 记录账号请求成功
   */
  async recordAccountSuccess(accountId: number): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      return;
    }

    account.consecutiveFailures = 0;
    account.totalSuccesses++;

    const pipeline = this.redis.pipeline();
    pipeline.hset(this.redisMetricsKey(accountId), 'consecutiveFailures', 0);
    pipeline.hset(this.redisMetricsKey(accountId), 'totalSuccesses', account.totalSuccesses);
    await pipeline.exec();

    this.logger.debug('记录账号成功', {
      accountId,
      totalSuccesses: account.totalSuccesses,
    });
  }

  /**
   * 记录账号请求失败
   */
  async recordAccountFailure(accountId: number): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      return;
    }

    account.consecutiveFailures++;

    const pipeline = this.redis.pipeline();
    pipeline.zincrby(this.redisHealthKey, -5, accountId.toString());
    pipeline.hset(this.redisMetricsKey(accountId), 'consecutiveFailures', account.consecutiveFailures);
    await pipeline.exec();

    account.healthScore = Math.max(0, account.healthScore - 5);

    this.logger.warn('记录账号失败', {
      accountId,
      consecutiveFailures: account.consecutiveFailures,
      healthScore: account.healthScore,
    });
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

  private redisMetricsKey(accountId: number): string {
    return `${this.redisMetricsPrefix}:${accountId}:metrics`;
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

  formatCookieString(rawCookies: unknown): string {
    if (!Array.isArray(rawCookies)) {
      return '';
    }

    const serialized = rawCookies
      .filter(
        (cookie): cookie is { name: string; value: string } =>
          Boolean(cookie) &&
          typeof cookie === 'object' &&
          typeof (cookie as any).name === 'string' &&
          typeof (cookie as any).value === 'string'
      )
      .map((cookie) => `${cookie.name}=${cookie.value}`);

    return serialized.join('; ');
  }

  async markAccountNeedsReview(accountId: number, reason: string): Promise<void> {
    const account = this.accounts.get(accountId);

    if (!account) {
      this.logger.warn('尝试标记不存在的账号为待检查状态', {
        accountId,
        reason
      });
      return;
    }

    const previousStatus = account.status;
    const reviewStatus = previousStatus === WeiboAccountStatus.BANNED ? previousStatus : WeiboAccountStatus.RESTRICTED;

    account.status = reviewStatus;
    account.consecutiveFailures = Math.max(
      account.consecutiveFailures,
      this.rotationStrategy.maxConsecutiveFailures + 1
    );
    account.healthScore = Math.max(
      0,
      Math.min(account.healthScore, this.rotationStrategy.healthThreshold - 10)
    );
    account.lastValidatedAt = new Date();

    this.logger.warn('账号已标记为需要人工检查', {
      accountId,
      nickname: account.nickname,
      previousStatus,
      newStatus: reviewStatus,
      reason,
      cookiesCount: account.cookies?.length ?? 0,
      consecutiveFailures: account.consecutiveFailures,
      healthScore: account.healthScore
    });

    try {
      await this.weiboAccountRepo.update(accountId, {
        status: reviewStatus,
        lastCheckAt: new Date()
      });
    } catch (error) {
      this.logger.error('更新账号检查状态时发生错误', {
        accountId,
        reason,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
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
}

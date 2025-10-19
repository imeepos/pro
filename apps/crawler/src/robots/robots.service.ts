import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrawlerConfig } from '../config/crawler.interface';

export interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

export interface ParsedRobots {
  rules: RobotsRule[];
  sitemaps: string[];
  lastModified?: Date;
  contentType?: string;
  contentHash?: string;
}

export interface RobotsCache {
  content: ParsedRobots;
  lastFetched: Date;
  url: string;
  etag?: string;
  lastModified?: string;
  accessCount: number;
  errorCount: number;
  healthScore: number;
}

export interface DomainRequestStats {
  domain: string;
  totalRequests: number;
  successfulRequests: number;
  blockedRequests: number;
  lastRequestTime: number;
  averageResponseTime: number;
  crawlDelayCompliance: number;
  robotsRespectScore: number;
  priority: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name);
  private cache = new Map<string, RobotsCache>();
  private domainStats = new Map<string, DomainRequestStats>();
  private globalRequestHistory: Array<{ domain: string; timestamp: number; allowed: boolean; responseTime: number }> = [];

  constructor(
    private readonly configService: ConfigService,
    @Inject('CRAWLER_CONFIG') private readonly crawlerConfig: CrawlerConfig,
  ) {
    this.initializeDomainPriorities();
  }

  private initializeDomainPriorities(): void {
    const prioritizedDomains = [
      'weibo.com', 'weibo.cn',
      's.weibo.com',
      'm.weibo.cn'
    ];

    prioritizedDomains.forEach((domain, index) => {
      this.domainStats.set(domain, {
        domain,
        totalRequests: 0,
        successfulRequests: 0,
        blockedRequests: 0,
        lastRequestTime: 0,
        averageResponseTime: 0,
        crawlDelayCompliance: 1.0,
        robotsRespectScore: 1.0,
        priority: prioritizedDomains.length - index,
        healthStatus: 'healthy'
      });
    });
  }

  async isUrlAllowed(url: string): Promise<boolean> {
    const startTime = Date.now();

    if (!this.crawlerConfig.robots.enabled) {
      this.recordDomainRequest(url, true, Date.now() - startTime);
      return true;
    }

    try {
      const { hostname, pathname } = new URL(url);
      const domain = this.extractDomain(hostname);

      // 更新域名统计
      this.updateDomainStats(domain);

      // 检查域名健康状态
      const domainHealth = this.getDomainHealth(domain);
      if (domainHealth.healthStatus === 'critical') {
        this.logger.warn(`域名 ${domain} 健康状态危险，暂时阻止请求`, {
          url: this.sanitizeUrl(url),
          healthStatus: domainHealth.healthStatus,
          blockedRequests: domainHealth.blockedRequests,
          successRate: this.calculateDomainSuccessRate(domain)
        });
        this.recordDomainRequest(url, false, Date.now() - startTime);
        return false;
      }

      const robotsUrl = `https://${hostname}/robots.txt`;
      const robots = await this.getRobotsContent(robotsUrl);

      const responseTime = Date.now() - startTime;

      if (!robots) {
        this.logger.debug(`无法获取 ${domain} 的 robots.txt，使用默认策略`, {
          url: this.sanitizeUrl(url),
          responseTime,
          strategy: 'allow_by_default'
        });
        this.recordDomainRequest(url, true, responseTime);
        return true;
      }

      const isAllowed = this.checkUrlAllowed(pathname, robots);

      // 记录robots.txt遵守情况
      this.recordRobotsCompliance(domain, isAllowed, robots);

      // 记录请求结果
      this.recordDomainRequest(url, isAllowed, responseTime);

      this.logger.debug(`robots.txt 检查完成`, {
        domain,
        url: this.sanitizeUrl(url),
        allowed: isAllowed,
        responseTime,
        crawlDelay: this.findRelevantRule(robots.rules)?.crawlDelay,
        cacheHit: this.cache.has(robotsUrl)
      });

      return isAllowed;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.warn(`robots.txt 规则检查失败`, {
        url: this.sanitizeUrl(url),
        error: error.message,
        responseTime,
        fallback: 'allow_by_default'
      });
      this.recordDomainRequest(url, true, responseTime);
      return true;
    }
  }

  async getCrawlDelay(url: string): Promise<number> {
    const startTime = Date.now();

    if (!this.crawlerConfig.robots.enabled || !this.crawlerConfig.robots.respectCrawlDelay) {
      return this.crawlerConfig.requestDelay.min / 1000;
    }

    try {
      const { hostname } = new URL(url);
      const domain = this.extractDomain(hostname);
      const robotsUrl = `https://${hostname}/robots.txt`;

      const robots = await this.getRobotsContent(robotsUrl);
      const responseTime = Date.now() - startTime;

      let baseDelay = this.crawlerConfig.robots.fallbackDelay;

      if (robots) {
        const relevantRule = this.findRelevantRule(robots.rules);
        const robotsDelay = relevantRule?.crawlDelay;

        if (robotsDelay) {
          baseDelay = robotsDelay;
          this.logger.debug(`使用 robots.txt 指定的延迟`, {
            domain,
            specifiedDelay: robotsDelay,
            userAgent: relevantRule?.userAgent
          });
        }
      }

      // 应用智能延迟调整
      const adjustedDelay = this.applyIntelligentDelayAdjustment(domain, baseDelay);

      this.logger.debug(`智能延迟计算完成`, {
        domain,
        baseDelay,
        adjustedDelay,
        adjustmentFactor: adjustedDelay / baseDelay,
        domainHealth: this.getDomainHealth(domain).healthStatus,
        responseTime
      });

      return adjustedDelay;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.warn(`智能延迟计算失败`, {
        url: this.sanitizeUrl(url),
        error: error.message,
        responseTime,
        fallback: this.crawlerConfig.robots.fallbackDelay
      });
      return this.crawlerConfig.robots.fallbackDelay;
    }
  }

  private async getRobotsContent(robotsUrl: string): Promise<ParsedRobots | null> {
    const cached = this.cache.get(robotsUrl);

    // 智能缓存检查
    if (cached && this.isCacheValid(cached)) {
      // 增加访问计数
      cached.accessCount++;
      this.updateCacheHealthScore(cached);

      this.logger.debug(`robots.txt 缓存命中`, {
        url: robotsUrl,
        age: Date.now() - cached.lastFetched.getTime(),
        accessCount: cached.accessCount,
        healthScore: cached.healthScore
      });

      return cached.content;
    }

    try {
      const fetchStartTime = Date.now();

      // 构建智能请求头，模仿MediaCrawler的反检测策略
      const headers = this.buildIntelligentHeaders(cached);

      const response = await fetch(robotsUrl, {
        headers,
        signal: AbortSignal.timeout(15000), // 增加超时时间
      });

      const fetchDuration = Date.now() - fetchStartTime;

      if (!response.ok) {
        this.logger.warn(`robots.txt 获取失败`, {
          url: robotsUrl,
          status: response.status,
          statusText: response.statusText,
          fetchDuration,
          errorType: this.classifyHttpError(response.status)
        });

        // 更新错误统计
        if (cached) {
          cached.errorCount++;
          this.updateCacheHealthScore(cached);
        }

        return null;
      }

      const text = await response.text();
      const contentHash = this.generateContentHash(text);

      // 检查内容是否变化
      const contentChanged = !cached || cached.content.contentHash !== contentHash;

      const parsed = this.parseRobotsText(text);
      parsed.contentHash = contentHash;

      // 智能缓存策略
      const cacheEntry: RobotsCache = {
        content: parsed,
        lastFetched: new Date(),
        url: robotsUrl,
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
        accessCount: cached ? cached.accessCount + 1 : 1,
        errorCount: 0,
        healthScore: 1.0
      };

      this.cache.set(robotsUrl, cacheEntry);

      this.logger.log(`robots.txt 更新完成`, {
        url: robotsUrl,
        fetchDuration,
        contentSize: text.length,
        contentChanged,
        rulesCount: parsed.rules.length,
        sitemapsCount: parsed.sitemaps.length,
        cacheSize: this.cache.size
      });

      return parsed;
    } catch (error) {
      this.logger.warn(`robots.txt 获取异常`, {
        url: robotsUrl,
        error: error.message,
        errorType: error.name,
        hasCache: !!cached
      });

      if (cached) {
        cached.errorCount++;
        this.updateCacheHealthScore(cached);

        // 如果缓存仍然可用，返回缓存内容
        if (cached.healthScore > 0.3) {
          this.logger.warn(`使用过期缓存作为降级方案`, {
            url: robotsUrl,
            cacheAge: Date.now() - cached.lastFetched.getTime(),
            healthScore: cached.healthScore
          });
          return cached.content;
        }
      }

      return null;
    }
  }

  private isCacheValid(cache: RobotsCache): boolean {
    return Date.now() - cache.lastFetched.getTime() < this.crawlerConfig.robots.cacheTimeout;
  }

  private parseRobotsText(text: string): ParsedRobots {
    const lines = text.split('\n').map(line => line.trim());
    const robots: ParsedRobots = {
      rules: [],
      sitemaps: [],
    };

    let currentRule: Partial<RobotsRule> | null = null;

    for (const line of lines) {
      // 跳过空行和注释
      if (!line || line.startsWith('#')) {
        continue;
      }

      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (!key || value === undefined) {
        continue;
      }

      const normalizedKey = key.toLowerCase().trim();

      switch (normalizedKey) {
        case 'user-agent':
          // 保存之前的规则（如果有的话）
          if (currentRule && currentRule.userAgent) {
            robots.rules.push(currentRule as RobotsRule);
          }
          // 开始新规则
          currentRule = {
            userAgent: value.toLowerCase(),
            allow: [],
            disallow: [],
          };
          break;

        case 'disallow':
          if (currentRule && value) {
            currentRule.disallow!.push(value);
          }
          break;

        case 'allow':
          if (currentRule && value) {
            currentRule.allow!.push(value);
          }
          break;

        case 'crawl-delay':
          if (currentRule && value) {
            const delay = parseFloat(value);
            if (!isNaN(delay) && delay > 0) {
              currentRule.crawlDelay = delay;
            }
          }
          break;

        case 'sitemap':
          if (value) {
            robots.sitemaps.push(value);
          }
          break;
      }
    }

    // 保存最后一个规则
    if (currentRule && currentRule.userAgent) {
      robots.rules.push(currentRule as RobotsRule);
    }

    return robots;
  }

  private checkUrlAllowed(pathname: string, robots: ParsedRobots): boolean {
    const relevantRule = this.findRelevantRule(robots.rules);

    if (!relevantRule) {
      return true; // 没有相关规则，默认允许
    }

    // 按长度排序，更具体的规则优先
    const disallowPaths = relevantRule.disallow
      .filter(path => path.length > 0)
      .sort((a, b) => b.length - a.length);

    const allowPaths = relevantRule.allow
      .filter(path => path.length > 0)
      .sort((a, b) => b.length - a.length);

    // 首先检查 Disallow 规则
    for (const disallowPath of disallowPaths) {
      if (this.pathMatches(pathname, disallowPath)) {
        // 如果匹配了 Disallow，再检查是否有 Allow 规则覆盖
        for (const allowPath of allowPaths) {
          if (this.pathMatches(pathname, allowPath)) {
            return true; // Allow 规则优先
          }
        }
        return false; // 被 Disallow 阻止
      }
    }

    return true; // 没有 Disallow 匹配，允许访问
  }

  private findRelevantRule(rules: RobotsRule[]): RobotsRule | null {
    const userAgent = this.crawlerConfig.robots.userAgent.toLowerCase();

    // 1. 寻找完全匹配的 User-Agent
    let exactMatch = rules.find(rule => rule.userAgent === userAgent);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. 寻找 * 匹配
    let wildcardMatch = rules.find(rule => rule.userAgent === '*');
    if (wildcardMatch) {
      return wildcardMatch;
    }

    // 3. 寻找包含匹配（例如 ProCrawler 匹配 pro*）
    let partialMatch = rules.find(rule =>
      rule.userAgent === '*' ||
      userAgent.includes(rule.userAgent) ||
      rule.userAgent.includes(userAgent)
    );

    return partialMatch || null;
  }

  private pathMatches(pathname: string, rulePath: string): boolean {
    // 处理通配符
    if (rulePath.includes('*')) {
      const regex = new RegExp(
        '^' + rulePath.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );
      return regex.test(pathname);
    }

    // 精确匹配或前缀匹配
    if (rulePath === '/') {
      return true; // 根路径阻止所有
    }

    if (rulePath === pathname) {
      return true; // 精确匹配
    }

    if (pathname.startsWith(rulePath)) {
      return true; // 前缀匹配
    }

    return false;
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.log('robots.txt 缓存已清空');
  }

  getCacheInfo(): Array<{ url: string; lastFetched: Date; age: number; healthScore: number; accessCount: number }> {
    return Array.from(this.cache.values()).map(cache => ({
      url: cache.url,
      lastFetched: cache.lastFetched,
      age: Date.now() - cache.lastFetched.getTime(),
      healthScore: cache.healthScore,
      accessCount: cache.accessCount
    }));
  }

  // 新增智能辅助方法

  private extractDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }

  private updateDomainStats(domain: string): void {
    if (!this.domainStats.has(domain)) {
      this.domainStats.set(domain, {
        domain,
        totalRequests: 0,
        successfulRequests: 0,
        blockedRequests: 0,
        lastRequestTime: 0,
        averageResponseTime: 0,
        crawlDelayCompliance: 1.0,
        robotsRespectScore: 1.0,
        priority: 1,
        healthStatus: 'healthy'
      });
    }

    const stats = this.domainStats.get(domain)!;
    stats.lastRequestTime = Date.now();
  }

  private getDomainHealth(domain: string): DomainRequestStats {
    return this.domainStats.get(domain) || {
      domain,
      totalRequests: 0,
      successfulRequests: 0,
      blockedRequests: 0,
      lastRequestTime: 0,
      averageResponseTime: 0,
      crawlDelayCompliance: 1.0,
      robotsRespectScore: 1.0,
      priority: 1,
      healthStatus: 'healthy'
    };
  }

  private calculateDomainSuccessRate(domain: string): number {
    const stats = this.getDomainHealth(domain);
    return stats.totalRequests > 0 ? stats.successfulRequests / stats.totalRequests : 1.0;
  }

  private recordDomainRequest(url: string, allowed: boolean, responseTime: number): void {
    try {
      const { hostname } = new URL(url);
      const domain = this.extractDomain(hostname);

      const stats = this.getDomainHealth(domain);
      stats.totalRequests++;

      if (allowed) {
        stats.successfulRequests++;
      } else {
        stats.blockedRequests++;
      }

      // 更新平均响应时间
      stats.averageResponseTime = (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) / stats.totalRequests;

      // 更新健康状态
      const successRate = this.calculateDomainSuccessRate(domain);
      if (successRate < 0.5 || stats.blockedRequests > 10) {
        stats.healthStatus = 'critical';
      } else if (successRate < 0.8 || stats.blockedRequests > 5) {
        stats.healthStatus = 'warning';
      } else {
        stats.healthStatus = 'healthy';
      }

      // 记录到全局历史
      this.globalRequestHistory.push({
        domain,
        timestamp: Date.now(),
        allowed,
        responseTime
      });

      // 保持历史记录大小
      if (this.globalRequestHistory.length > 10000) {
        this.globalRequestHistory = this.globalRequestHistory.slice(-5000);
      }

    } catch (error) {
      this.logger.warn(`记录域名请求统计失败`, { url, error: error.message });
    }
  }

  private recordRobotsCompliance(domain: string, allowed: boolean, robots: ParsedRobots): void {
    const stats = this.getDomainHealth(domain);

    // 根据robots.txt规则复杂度调整遵守评分
    const ruleComplexity = robots.rules.length;
    const hasCrawlDelay = robots.rules.some(rule => rule.crawlDelay !== undefined);

    if (allowed && ruleComplexity > 0) {
      stats.robotsRespectScore = Math.min(1.0, stats.robotsRespectScore + 0.01);
    } else if (!allowed && ruleComplexity > 0) {
      stats.robotsRespectScore = Math.max(0.0, stats.robotsRespectScore - 0.02);
    }

    if (hasCrawlDelay) {
      stats.crawlDelayCompliance = Math.min(1.0, stats.crawlDelayCompliance + 0.01);
    }
  }

  private applyIntelligentDelayAdjustment(domain: string, baseDelay: number): number {
    const stats = this.getDomainHealth(domain);
    let adjustmentFactor = 1.0;

    // 基于健康状态调整
    switch (stats.healthStatus) {
      case 'critical':
        adjustmentFactor *= 3.0;
        break;
      case 'warning':
        adjustmentFactor *= 1.5;
        break;
      case 'healthy':
        if (stats.successfulRequests > 20) {
          adjustmentFactor *= 0.8; // 成功率高时可以稍微减少延迟
        }
        break;
    }

    // 基于robots.txt遵守情况调整
    if (stats.robotsRespectScore < 0.5) {
      adjustmentFactor *= 1.5; // 遵守情况差时增加延迟
    }

    // 基于平均响应时间调整
    if (stats.averageResponseTime > 10000) {
      adjustmentFactor *= 1.3;
    } else if (stats.averageResponseTime < 2000 && stats.totalRequests > 10) {
      adjustmentFactor *= 0.9;
    }

    // 基于域名优先级调整
    adjustmentFactor *= (1.0 + (stats.priority - 1) * 0.1);

    // 确保延迟在合理范围内
    const minDelay = this.crawlerConfig.requestDelay.min / 1000;
    const maxDelay = this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs / 1000;

    const adjustedDelay = baseDelay * adjustmentFactor;
    return Math.max(minDelay, Math.min(maxDelay, adjustedDelay));
  }

  private buildIntelligentHeaders(cached?: RobotsCache): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.crawlerConfig.userAgent,
      'Accept': 'text/plain,text/plain;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };

    // 添加条件请求头
    if (cached) {
      if (cached.etag) {
        headers['If-None-Match'] = cached.etag;
      }
      if (cached.lastModified) {
        headers['If-Modified-Since'] = cached.lastModified;
      }
    }

    return headers;
  }

  private generateContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
  }

  private updateCacheHealthScore(cache: RobotsCache): void {
    const totalAccess = cache.accessCount + cache.errorCount;
    const successRate = totalAccess > 0 ? cache.accessCount / totalAccess : 1.0;

    // 基于成功率和错误次数计算健康分数
    cache.healthScore = successRate * (1.0 - Math.min(cache.errorCount * 0.1, 0.9));

    // 考虑缓存年龄
    const age = Date.now() - cache.lastFetched.getTime();
    const ageFactor = Math.max(0, 1.0 - (age / this.crawlerConfig.robots.cacheTimeout));

    cache.healthScore *= ageFactor;
  }

  private classifyHttpError(status: number): string {
    if (status === 404) return 'not_found';
    if (status === 403) return 'forbidden';
    if (status === 429) return 'rate_limited';
    if (status >= 500) return 'server_error';
    if (status >= 400) return 'client_error';
    return 'unknown';
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const sanitized = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      return sanitized.length > 100 ? sanitized.substring(0, 100) + '...' : sanitized;
    } catch {
      return url.length > 100 ? url.substring(0, 100) + '...' : url;
    }
  }

  // 公共方法：获取域名统计信息
  getDomainStats(): DomainRequestStats[] {
    return Array.from(this.domainStats.values())
      .sort((a, b) => b.priority - a.priority);
  }

  // 公共方法：获取全局请求统计
  getGlobalRequestStats(): {
    totalRequests: number;
    successfulRequests: number;
    blockedRequests: number;
    averageResponseTime: number;
    topDomains: Array<{ domain: string; requests: number; successRate: number }>;
  } {
    const totalRequests = this.globalRequestHistory.length;
    const successfulRequests = this.globalRequestHistory.filter(r => r.allowed).length;
    const blockedRequests = totalRequests - successfulRequests;

    const averageResponseTime = totalRequests > 0
      ? this.globalRequestHistory.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests
      : 0;

    // 统计域名访问情况
    const domainCounts = new Map<string, { count: number; successCount: number }>();
    this.globalRequestHistory.forEach(request => {
      const stats = domainCounts.get(request.domain) || { count: 0, successCount: 0 };
      stats.count++;
      if (request.allowed) {
        stats.successCount++;
      }
      domainCounts.set(request.domain, stats);
    });

    const topDomains = Array.from(domainCounts.entries())
      .map(([domain, stats]) => ({
        domain,
        requests: stats.count,
        successRate: stats.count > 0 ? stats.successCount / stats.count : 0
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      totalRequests,
      successfulRequests,
      blockedRequests,
      averageResponseTime,
      topDomains
    };
  }

  // 公共方法：智能缓存清理
  performIntelligentCacheCleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    let totalHealthScore = 0;

    for (const [url, cache] of this.cache.entries()) {
      const age = now - cache.lastFetched.getTime();
      const isExpired = age > this.crawlerConfig.robots.cacheTimeout;
      const isUnhealthy = cache.healthScore < 0.3;
      const isUnused = cache.accessCount < 5 && age > this.crawlerConfig.robots.cacheTimeout / 2;

      if (isExpired || isUnhealthy || isUnused) {
        this.cache.delete(url);
        cleanedCount++;
        this.logger.debug(`清理缓存条目`, {
          url,
          reason: isExpired ? 'expired' : isUnhealthy ? 'unhealthy' : 'unused',
          age,
          healthScore: cache.healthScore,
          accessCount: cache.accessCount
        });
      } else {
        totalHealthScore += cache.healthScore;
      }
    }

    const averageHealthScore = this.cache.size > 0 ? totalHealthScore / this.cache.size : 1.0;

    this.logger.log(`智能缓存清理完成`, {
      cleanedCount,
      remainingCount: this.cache.size,
      averageHealthScore: Math.round(averageHealthScore * 100) / 100
    });
  }
}
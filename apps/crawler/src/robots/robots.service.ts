import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrawlerConfig } from '../config/crawler.interface';

export interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number; // 秒
}

export interface ParsedRobots {
  rules: RobotsRule[];
  sitemaps: string[];
  lastModified?: Date;
}

export interface RobotsCache {
  content: ParsedRobots;
  lastFetched: Date;
  url: string;
}

@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name);
  private cache = new Map<string, RobotsCache>();

  constructor(
    private readonly configService: ConfigService,
    @Inject('CRAWLER_CONFIG') private readonly crawlerConfig: CrawlerConfig,
  ) {}

  async isUrlAllowed(url: string): Promise<boolean> {
    if (!this.crawlerConfig.robots.enabled) {
      return true;
    }

    try {
      const { hostname, pathname } = new URL(url);
      const robotsUrl = `https://${hostname}/robots.txt`;

      const robots = await this.getRobotsContent(robotsUrl);
      if (!robots) {
        return true; // 无法获取 robots.txt 时默认允许
      }

      return this.checkUrlAllowed(pathname, robots);
    } catch (error) {
      this.logger.warn(`检查 ${url} 的 robots.txt 规则失败:`, error.message);
      return true; // 出错时默认允许
    }
  }

  async getCrawlDelay(url: string): Promise<number> {
    if (!this.crawlerConfig.robots.enabled || !this.crawlerConfig.robots.respectCrawlDelay) {
      return this.crawlerConfig.requestDelay.min / 1000; // 转换为秒
    }

    try {
      const { hostname } = new URL(url);
      const robotsUrl = `https://${hostname}/robots.txt`;

      const robots = await this.getRobotsContent(robotsUrl);
      if (!robots) {
        return this.crawlerConfig.robots.fallbackDelay;
      }

      const relevantRule = this.findRelevantRule(robots.rules);
      return relevantRule?.crawlDelay || this.crawlerConfig.robots.fallbackDelay;
    } catch (error) {
      this.logger.warn(`获取 ${url} 的 crawl-delay 失败:`, error.message);
      return this.crawlerConfig.robots.fallbackDelay;
    }
  }

  private async getRobotsContent(robotsUrl: string): Promise<ParsedRobots | null> {
    // 检查缓存
    const cached = this.cache.get(robotsUrl);
    if (cached && this.isCacheValid(cached)) {
      return cached.content;
    }

    try {
      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': this.crawlerConfig.userAgent,
        },
        signal: AbortSignal.timeout(10000), // 10秒超时
      });

      if (!response.ok) {
        this.logger.warn(`获取 robots.txt 失败: ${robotsUrl} - ${response.status}`);
        return null;
      }

      const text = await response.text();
      const parsed = this.parseRobotsText(text);

      // 缓存结果
      this.cache.set(robotsUrl, {
        content: parsed,
        lastFetched: new Date(),
        url: robotsUrl,
      });

      return parsed;
    } catch (error) {
      this.logger.warn(`获取 robots.txt 内容失败: ${robotsUrl}`, error.message);
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

  getCacheInfo(): Array<{ url: string; lastFetched: Date; age: number }> {
    return Array.from(this.cache.values()).map(cache => ({
      url: cache.url,
      lastFetched: cache.lastFetched,
      age: Date.now() - cache.lastFetched.getTime(),
    }));
  }
}
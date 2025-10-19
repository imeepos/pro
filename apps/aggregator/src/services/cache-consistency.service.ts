import { Injectable } from '@nestjs/common';
import { Logger } from '@pro/logger';
import { CacheService } from './cache.service';
import { TransactionContext } from './transaction.service';

export interface CacheInvalidationRule {
  patterns: string[];
  condition?: (data: any) => boolean;
  description: string;
}

export interface CacheInvalidationPlan {
  patterns: string[];
  reason: string;
  timestamp: Date;
}

@Injectable()
export class CacheConsistencyService {
  private invalidationRules: Map<string, CacheInvalidationRule> = new Map();
  private pendingInvalidations: Map<string, CacheInvalidationPlan[]> = new Map();

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: Logger,
  ) {
    this.initializeRules();
  }

  private initializeRules(): void {
    this.registerRule('hourly-stats-update', {
      patterns: [
        'stats:hourly:*',
        'stats:realtime:*',
        'stats:window:*',
      ],
      description: '小时统计更新时清理相关缓存',
    });

    this.registerRule('daily-stats-update', {
      patterns: [
        'stats:daily:*',
        'stats:window:*',
        'stats:archive:*',
      ],
      description: '日度统计更新时清理相关缓存',
    });

    this.registerRule('keyword-stats-change', {
      patterns: [
        'stats:*:{keyword}:*',
      ],
      condition: (data) => data.keyword && data.significantChange,
      description: '关键词统计显著变化时的缓存清理',
    });
  }

  registerRule(key: string, rule: CacheInvalidationRule): void {
    this.invalidationRules.set(key, rule);
    this.logger.debug('缓存一致性规则已注册', { key, rule: rule.description });
  }

  async scheduleInvalidation(
    transactionId: string,
    ruleKey: string,
    data: any = {},
  ): Promise<void> {
    const rule = this.invalidationRules.get(ruleKey);
    if (!rule) {
      this.logger.warn('未找到缓存失效规则', { ruleKey });
      return;
    }

    if (rule.condition && !rule.condition(data)) {
      this.logger.debug('缓存失效条件不满足', { ruleKey, data });
      return;
    }

    const patterns = this.expandPatterns(rule.patterns, data);
    const plan: CacheInvalidationPlan = {
      patterns,
      reason: rule.description,
      timestamp: new Date(),
    };

    if (!this.pendingInvalidations.has(transactionId)) {
      this.pendingInvalidations.set(transactionId, []);
    }

    this.pendingInvalidations.get(transactionId)!.push(plan);

    this.logger.debug('缓存失效已调度', {
      transactionId,
      ruleKey,
      patterns,
    });
  }

  async executeInvalidations(transactionId: string): Promise<void> {
    const plans = this.pendingInvalidations.get(transactionId);
    if (!plans || plans.length === 0) {
      return;
    }

    const allPatterns = new Set<string>();
    for (const plan of plans) {
      plan.patterns.forEach(pattern => allPatterns.add(pattern));
    }

    const uniquePatterns = Array.from(allPatterns);
    let totalInvalidated = 0;

    for (const pattern of uniquePatterns) {
      try {
        const count = await this.cacheService.invalidate(pattern);
        totalInvalidated += count;
      } catch (error) {
        this.logger.warn('缓存失效操作失败', {
          pattern,
          error: error.message,
        });
      }
    }

    this.pendingInvalidations.delete(transactionId);

    this.logger.log('事务缓存一致性维护完成', {
      transactionId,
      patterns: uniquePatterns.length,
      invalidatedKeys: totalInvalidated,
      plans: plans.length,
    });
  }

  async rollbackInvalidations(transactionId: string): Promise<void> {
    const plans = this.pendingInvalidations.get(transactionId);
    if (plans) {
      this.pendingInvalidations.delete(transactionId);
      this.logger.debug('缓存失效计划已回滚', {
        transactionId,
        plannedInvalidations: plans.length,
      });
    }
  }

  async warmupCache(
    patterns: string[],
    dataProvider: (pattern: string) => Promise<any>,
  ): Promise<void> {
    const entries = [];

    for (const pattern of patterns) {
      try {
        const data = await dataProvider(pattern);
        if (data) {
          entries.push({
            key: pattern,
            value: data,
            layer: 'hourly' as const,
          });
        }
      } catch (error) {
        this.logger.warn('缓存预热数据获取失败', {
          pattern,
          error: error.message,
        });
      }
    }

    if (entries.length > 0) {
      await this.cacheService.warmup(entries);
      this.logger.log('缓存预热完成', {
        patterns: patterns.length,
        warmedEntries: entries.length,
      });
    }
  }

  async verifyConsistency(
    pattern: string,
    dbDataProvider: () => Promise<any>,
  ): Promise<{ consistent: boolean; cacheData?: any; dbData?: any }> {
    try {
      const cacheData = await this.cacheService.get(pattern);
      const dbData = await dbDataProvider();

      const consistent = this.compareData(cacheData, dbData);

      if (!consistent) {
        this.logger.warn('缓存数据不一致', {
          pattern,
          hasCache: !!cacheData,
          hasDbData: !!dbData,
        });
      }

      return { consistent, cacheData, dbData };
    } catch (error) {
      this.logger.error('缓存一致性检查失败', {
        pattern,
        error: error.message,
      });
      return { consistent: false };
    }
  }

  createTransactionHook() {
    return {
      onCommit: async (transactionId: string) => {
        await this.executeInvalidations(transactionId);
      },
      onRollback: async (transactionId: string) => {
        await this.rollbackInvalidations(transactionId);
      },
      scheduleInvalidation: (ruleKey: string, data?: any) => {
        return this.scheduleInvalidation(`tx-${Date.now()}`, ruleKey, data);
      },
    };
  }

  private expandPatterns(patterns: string[], data: any = {}): string[] {
    return patterns.map(pattern => {
      let expanded = pattern;
      for (const [key, value] of Object.entries(data)) {
        expanded = expanded.replace(`{${key}}`, String(value));
      }
      return expanded;
    });
  }

  private compareData(cacheData: any, dbData: any): boolean {
    if (!cacheData && !dbData) return true;
    if (!cacheData || !dbData) return false;

    try {
      return JSON.stringify(cacheData) === JSON.stringify(dbData);
    } catch {
      return false;
    }
  }

  getMetrics(): {
    totalRules: number;
    pendingTransactions: number;
    totalPendingInvalidations: number;
  } {
    const totalPendingInvalidations = Array.from(this.pendingInvalidations.values())
      .reduce((sum, plans) => sum + plans.length, 0);

    return {
      totalRules: this.invalidationRules.size,
      pendingTransactions: this.pendingInvalidations.size,
      totalPendingInvalidations,
    };
  }
}
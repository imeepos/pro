import { Injectable, OnInit, OnDestroy } from '@pro/core';
import { Logger } from '@pro/logger';
import {
  ErrorDetails,
  ErrorMetrics,
  ErrorPattern,
  ErrorAlert,
  EnhancedError,
  ErrorSeverity,
  ErrorCategory,
  ErrorDomain,
} from './types/index';
import { ErrorClassificationService } from './classifiers/index';
import {
  RecoveryStrategyRegistry,
  RecoveryExecutor,
  RecoveryExecution,
} from './recovery/index';

interface ErrorRecord {
  readonly error: ErrorDetails;
  readonly timestamp: Date;
  readonly resolved: boolean;
  readonly recoveryExecution?: RecoveryExecution;
}

@Injectable()
export class ErrorHandlerService implements OnInit, OnDestroy {
  private readonly classification = new ErrorClassificationService();
  private readonly recoveryRegistry = new RecoveryStrategyRegistry();
  private readonly recoveryExecutor = new RecoveryExecutor();
  private readonly errorHistory: ErrorRecord[] = [];
  private readonly patternCache = new Map<string, ErrorPattern>();
  private readonly activeAlerts = new Map<string, ErrorAlert>();
  private readonly maxHistorySize = 10000;

  constructor(private readonly logger: Logger) { }

  async onInit(): Promise<void> {
    this.setupErrorPatternAnalysis();
    this.logger.info('错误处理服务已初始化');
  }

  onDestroy(): void {
    this.errorHistory.length = 0;
    this.patternCache.clear();
    this.activeAlerts.clear();
    this.logger.info('错误处理服务已清理');
  }

  async handle(error: Error, context?: Partial<ErrorDetails>): Promise<EnhancedError> {
    try {
      const enhancedError = this.classifyError(error, context);
      await this.processError(enhancedError);
      return enhancedError;
    } catch (processingError) {
      this.logger.error({ err: processingError }, '错误处理过程中发生异常');
      return EnhancedError.fromError(error, context);
    }
  }

  private classifyError(error: Error, context?: Partial<ErrorDetails>): EnhancedError {
    let enhancedError = this.classification.classify(error);

    if (context) {
      enhancedError = new EnhancedError({
        ...enhancedError.details,
        ...context,
      });
    }

    this.logger.debug({
      code: enhancedError.details.code,
      category: enhancedError.details.category,
      domain: enhancedError.details.domain,
      severity: enhancedError.details.severity,
    }, '错误已分类');

    return enhancedError;
  }

  private async processError(error: EnhancedError): Promise<void> {
    // 记录错误
    this.recordError(error.details);

    // 更新错误模式
    this.updateErrorPattern(error.details);

    // 检查是否需要告警
    await this.checkForAlerts(error.details);

    // 尝试恢复
    await this.attemptRecovery(error.details);

    // 记录指标
    this.updateMetrics(error.details);
  }

  private recordError(error: ErrorDetails): void {
    const record: ErrorRecord = {
      error,
      timestamp: new Date(),
      resolved: false,
    };

    this.errorHistory.push(record);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    this.logger.error({
      code: error.code,
      message: error.message,
      fingerprint: error.fingerprint,
      context: error.context,
    }, '错误已记录');
  }

  private updateErrorPattern(error: ErrorDetails): void {
    const existing = this.patternCache.get(error.fingerprint);

    if (existing) {
      const updated: ErrorPattern = {
        ...existing,
        occurrences: existing.occurrences + 1,
        lastSeen: new Date(),
        associatedOperations: Array.from(new Set([
          ...existing.associatedOperations,
          error.context.operation || 'unknown',
        ])),
      };
      this.patternCache.set(error.fingerprint, updated);
    } else {
      const newPattern: ErrorPattern = {
        signature: error.fingerprint,
        occurrences: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        recoverySuccess: 0,
        recoveryFailure: 0,
        associatedOperations: [error.context.operation || 'unknown'],
      };
      this.patternCache.set(error.fingerprint, newPattern);
    }

    this.logger.debug({
      fingerprint: error.fingerprint,
      occurrences: this.patternCache.get(error.fingerprint)?.occurrences,
    }, '错误模式已更新');
  }

  private async checkForAlerts(error: ErrorDetails): Promise<void> {
    const pattern = this.patternCache.get(error.fingerprint);
    if (!pattern) return;

    const shouldAlert = this.shouldCreateAlert(error, pattern);
    if (!shouldAlert) return;

    const alertId = `${error.fingerprint}-${Date.now()}`;
    const alert: ErrorAlert = {
      id: alertId,
      title: `${error.category.toUpperCase()}: ${error.code}`,
      description: `错误模式检测: ${pattern.occurrences} 次发生`,
      severity: error.severity,
      timestamp: new Date(),
      resolved: false,
      errorPattern: pattern,
      recommendedActions: this.generateRecommendations(error, pattern),
    };

    this.activeAlerts.set(alertId, alert);

    this.logger.warn({
      alertId,
      title: alert.title,
      occurrences: pattern.occurrences,
      severity: error.severity,
    }, '错误告警已创建');

    await this.sendAlert(alert);
  }

  private shouldCreateAlert(error: ErrorDetails, pattern: ErrorPattern): boolean {
    // 基于严重程度的告警阈值
    const thresholds = {
      [ErrorSeverity.CRITICAL]: 1,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.MEDIUM]: 10,
      [ErrorSeverity.LOW]: 50,
    };

    const threshold = thresholds[error.severity];
    return pattern.occurrences >= threshold;
  }

  private generateRecommendations(error: ErrorDetails, pattern: ErrorPattern): string[] {
    const recommendations: string[] = [];

    if (error.domain === ErrorDomain.DATABASE) {
      recommendations.push('检查数据库连接池配置');
      recommendations.push('监控数据库性能指标');
    }

    if (error.domain === ErrorDomain.CACHE) {
      recommendations.push('检查缓存服务状态');
      recommendations.push('考虑缓存降级策略');
    }

    if (error.domain === ErrorDomain.NETWORK) {
      recommendations.push('检查网络连接稳定性');
      recommendations.push('验证外部服务可用性');
    }

    if (pattern.occurrences > 100) {
      recommendations.push('考虑代码重构以解决根本问题');
    }

    return recommendations;
  }

  private async sendAlert(alert: ErrorAlert): Promise<void> {
    // 这里可以集成各种告警渠道：邮件、钉钉、微信等
    this.logger.warn({
      description: alert.description,
      severity: alert.severity,
      recommendations: alert.recommendedActions,
    }, `告警: ${alert.title}`);
  }

  private async attemptRecovery(error: ErrorDetails): Promise<void> {
    const strategy = this.recoveryRegistry.findStrategy(error);
    if (!strategy) {
      this.logger.debug({ code: error.code }, '未找到适用的恢复策略');
      return;
    }

    this.logger.info({
      description: strategy.description,
      errorCode: error.code,
    }, `执行恢复策略: ${strategy.name}`);

    try {
      const execution = await this.recoveryExecutor.execute(strategy, error);
      this.updateRecoveryMetrics(error.fingerprint, execution);

      this.logger.info({
        strategy: strategy.name,
        actionsExecuted: execution.actions.length,
        successfulActions: execution.actions.filter(a => a.status === 'success').length,
      }, '恢复策略执行完成');
    } catch (recoveryError) {
      this.logger.error({ err: recoveryError }, '恢复策略执行失败');
      this.updateRecoveryMetrics(error.fingerprint, null, true);
    }
  }

  private updateRecoveryMetrics(
    fingerprint: string,
    _execution: RecoveryExecution | null,
    failed: boolean = false
  ): void {
    const pattern = this.patternCache.get(fingerprint);
    if (!pattern) return;

    const updated: ErrorPattern = {
      ...pattern,
      recoverySuccess: failed ? pattern.recoverySuccess : pattern.recoverySuccess + 1,
      recoveryFailure: failed ? pattern.recoveryFailure + 1 : pattern.recoveryFailure,
    };

    this.patternCache.set(fingerprint, updated);
  }

  private updateMetrics(error: ErrorDetails): void {
    // 指标更新逻辑
    this.logger.debug({
      category: error.category,
      domain: error.domain,
      severity: error.severity,
    }, '错误指标已更新');
  }

  private setupErrorPatternAnalysis(): void {
    // 定期分析错误模式
    setInterval(() => {
      this.analyzeErrorPatterns();
    }, 5 * 60 * 1000); // 每5分钟分析一次
  }

  private analyzeErrorPatterns(): void {
    const recentErrors = this.errorHistory.filter(
      record => Date.now() - record.timestamp.getTime() < 60 * 60 * 1000 // 最近1小时
    );

    if (recentErrors.length === 0) return;

    const errorRate = recentErrors.length / 60; // 每分钟错误数
    if (errorRate > 10) {
      this.logger.warn({
        errorRate: `${errorRate.toFixed(2)}/min`,
        recentErrorCount: recentErrors.length,
      }, '检测到高错误率');
    }

    // 分析错误趋势
    this.analyzeTrends(recentErrors);
  }

  private analyzeTrends(errors: ErrorRecord[]): void {
    const categoryCounts = new Map<ErrorCategory, number>();
    const domainCounts = new Map<ErrorDomain, number>();

    for (const record of errors) {
      const { category, domain } = record.error;
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }

    this.logger.debug({
      categoryBreakdown: Object.fromEntries(categoryCounts),
      domainBreakdown: Object.fromEntries(domainCounts),
    }, '错误趋势分析');
  }

  getMetrics(): ErrorMetrics {
    const recentErrors = this.errorHistory.filter(
      record => Date.now() - record.timestamp.getTime() < 60 * 60 * 1000
    );

    const categoryBreakdown: Record<ErrorCategory, number> = {} as any;
    const domainBreakdown: Record<ErrorDomain, number> = {} as any;
    const severityBreakdown: Record<ErrorSeverity, number> = {} as any;

    for (const record of recentErrors) {
      const { category, domain, severity } = record.error;
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      domainBreakdown[domain] = (domainBreakdown[domain] || 0) + 1;
      severityBreakdown[severity] = (severityBreakdown[severity] || 0) + 1;
    }

    const successfulRecoveries = Array.from(this.patternCache.values())
      .reduce((sum, pattern) => sum + pattern.recoverySuccess, 0);

    const failedRecoveries = Array.from(this.patternCache.values())
      .reduce((sum, pattern) => sum + pattern.recoveryFailure, 0);

    return {
      errorCount: recentErrors.length,
      errorRate: recentErrors.length / 60,
      averageResolutionTime: 0, // 需要额外计算
      successfulRecoveries,
      failedRecoveries,
      categoryBreakdown,
      domainBreakdown,
      severityBreakdown,
    };
  }

  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.patternCache.values());
  }

  getActiveAlerts(): ErrorAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    const resolved: ErrorAlert = { ...alert, resolved: true };
    this.activeAlerts.set(alertId, resolved);

    this.logger.info({
      title: alert.title,
    }, `告警已解决: ${alertId}`);

    return true;
  }
}
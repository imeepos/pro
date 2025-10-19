import {
  ErrorDomain,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  RecoveryAction,
  ErrorDetails,
} from '../types/index';

export interface RetryConfig {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffType: 'exponential' | 'linear' | 'fixed';
  readonly jitterFactor: number;
}

export class RecoveryStrategyBuilder {
  private name: string = '';
  private description: string = '';
  private actions: RecoveryAction[] = [];
  private applicabilityTest: (error: ErrorDetails) => boolean = () => true;
  private escalationTest: (attemptCount: number) => boolean = () => false;

  static create(): RecoveryStrategyBuilder {
    return new RecoveryStrategyBuilder();
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.description = description;
    return this;
  }

  addRetryAction(config: RetryConfig): this {
    this.actions.push({
      type: 'retry',
      description: `重试最多 ${config.maxAttempts} 次，使用 ${config.backoffType} 退避策略`,
      canRetry: true,
      maxAttempts: config.maxAttempts,
      delayMs: config.baseDelayMs,
    });
    return this;
  }

  addFallbackAction(description: string, fallbackFn: () => Promise<void>): this {
    this.actions.push({
      type: 'fallback',
      description,
      canRetry: false,
      immediateAction: fallbackFn,
    });
    return this;
  }

  addCircuitBreakerAction(description: string): this {
    this.actions.push({
      type: 'circuit_break',
      description,
      canRetry: false,
    });
    return this;
  }

  addNotificationAction(description: string, notifyFn: () => Promise<void>): this {
    this.actions.push({
      type: 'notify',
      description,
      canRetry: false,
      immediateAction: notifyFn,
    });
    return this;
  }

  addEscalationAction(description: string, escalateFn: () => Promise<void>): this {
    this.actions.push({
      type: 'escalate',
      description,
      canRetry: false,
      immediateAction: escalateFn,
    });
    return this;
  }

  forErrors(test: (error: ErrorDetails) => boolean): this {
    this.applicabilityTest = test;
    return this;
  }

  forDomain(domain: ErrorDomain): this {
    return this.forErrors(error => error.domain === domain);
  }

  forCategory(category: ErrorCategory): this {
    return this.forErrors(error => error.category === category);
  }

  forSeverity(severity: ErrorSeverity): this {
    return this.forErrors(error => error.severity === severity);
  }

  escalateAfter(attempts: number): this {
    this.escalationTest = (attemptCount: number) => attemptCount >= attempts;
    return this;
  }

  build(): RecoveryStrategy {
    if (!this.name) {
      throw new Error('恢复策略必须有名称');
    }

    return {
      name: this.name,
      description: this.description,
      actions: [...this.actions],
      isApplicable: this.applicabilityTest,
      shouldEscalate: this.escalationTest,
    };
  }
}

export class RecoveryStrategyRegistry {
  private readonly strategies = new Map<string, RecoveryStrategy>();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    // 数据库错误恢复策略
    this.register(
      RecoveryStrategyBuilder.create()
        .withName('database-connection-recovery')
        .withDescription('数据库连接失败恢复策略')
        .addRetryAction({
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          backoffType: 'exponential',
          jitterFactor: 0.1,
        })
        .addCircuitBreakerAction('触发数据库熔断器')
        .addNotificationAction('通知运维团队', async () => {
          // 实际的通知逻辑
        })
        .forDomain(ErrorDomain.DATABASE)
        .escalateAfter(3)
        .build()
    );

    // 缓存错误恢复策略
    this.register(
      RecoveryStrategyBuilder.create()
        .withName('cache-degradation')
        .withDescription('缓存降级策略')
        .addFallbackAction('使用本地缓存或直接查询数据库', async () => {
          // 缓存降级逻辑
        })
        .addNotificationAction('记录缓存故障', async () => {
          // 记录缓存故障
        })
        .forDomain(ErrorDomain.CACHE)
        .build()
    );

    // 网络错误恢复策略
    this.register(
      RecoveryStrategyBuilder.create()
        .withName('network-retry')
        .withDescription('网络请求重试策略')
        .addRetryAction({
          maxAttempts: 5,
          baseDelayMs: 2000,
          maxDelayMs: 30000,
          backoffType: 'exponential',
          jitterFactor: 0.2,
        })
        .addFallbackAction('使用备用服务或缓存数据', async () => {
          // 备用服务逻辑
        })
        .forDomain(ErrorDomain.NETWORK)
        .escalateAfter(5)
        .build()
    );

    // 验证错误恢复策略
    this.register(
      RecoveryStrategyBuilder.create()
        .withName('validation-response')
        .withDescription('数据验证错误响应策略')
        .addNotificationAction('返回详细验证错误信息', async () => {
          // 验证错误处理
        })
        .forDomain(ErrorDomain.VALIDATION)
        .build()
    );

    // 认证错误恢复策略
    this.register(
      RecoveryStrategyBuilder.create()
        .withName('authentication-handling')
        .withDescription('认证错误处理策略')
        .addNotificationAction('记录安全事件', async () => {
          // 安全事件记录
        })
        .addEscalationAction('触发安全警报', async () => {
          // 安全警报
        })
        .forDomain(ErrorDomain.AUTHENTICATION)
        .build()
    );

    // 高严重性错误策略
    this.register(
      RecoveryStrategyBuilder.create()
        .withName('critical-error-handling')
        .withDescription('关键错误处理策略')
        .addNotificationAction('立即通知值班人员', async () => {
          // 紧急通知
        })
        .addEscalationAction('触发应急响应流程', async () => {
          // 应急响应
        })
        .forSeverity(ErrorSeverity.CRITICAL)
        .escalateAfter(1)
        .build()
    );
  }

  register(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  findStrategy(error: ErrorDetails): RecoveryStrategy | null {
    for (const strategy of this.strategies.values()) {
      if (strategy.isApplicable(error)) {
        return strategy;
      }
    }
    return null;
  }

  getAllStrategies(): RecoveryStrategy[] {
    return Array.from(this.strategies.values());
  }

  getStrategy(name: string): RecoveryStrategy | null {
    return this.strategies.get(name) || null;
  }
}

export class RetryCalculator {
  static calculateDelay(
    attempt: number,
    config: RetryConfig
  ): number {
    let delay: number;

    switch (config.backoffType) {
      case 'exponential':
        delay = config.baseDelayMs * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = config.baseDelayMs * attempt;
        break;
      case 'fixed':
      default:
        delay = config.baseDelayMs;
        break;
    }

    // 应用抖动
    if (config.jitterFactor > 0) {
      const jitter = delay * config.jitterFactor * (Math.random() - 0.5);
      delay += jitter;
    }

    // 限制最大延迟
    return Math.min(delay, config.maxDelayMs);
  }

  static shouldRetry(attempt: number, config: RetryConfig): boolean {
    return attempt <= config.maxAttempts;
  }
}

export interface RecoveryExecution {
  readonly strategy: RecoveryStrategy;
  readonly error: ErrorDetails;
  readonly attemptCount: number;
  readonly startTime: Date;
  readonly actions: RecoveryActionExecution[];
}

export interface RecoveryActionExecution {
  readonly action: RecoveryAction;
  status: 'pending' | 'running' | 'success' | 'failure';
  startTime?: Date;
  endTime?: Date;
  result?: unknown;
  error?: Error;
}

export class RecoveryExecutor {
  async execute(
    strategy: RecoveryStrategy,
    error: ErrorDetails,
    attemptCount: number = 1
  ): Promise<RecoveryExecution> {
    const execution: RecoveryExecution = {
      strategy,
      error,
      attemptCount,
      startTime: new Date(),
      actions: strategy.actions.map(action => ({
        action,
        status: 'pending',
      })),
    };

    for (const actionExecution of execution.actions) {
      await this.executeAction(actionExecution);

      // 如果是重试动作失败，停止执行后续动作
      if (actionExecution.action.type === 'retry' && actionExecution.status === 'failure') {
        break;
      }
    }

    return execution;
  }

  private async executeAction(execution: RecoveryActionExecution): Promise<void> {
    const { action } = execution;

    execution.status = 'running';
    execution.startTime = new Date();

    try {
      if (action.immediateAction) {
        execution.result = await action.immediateAction();
      }

      if (action.delayMs && action.delayMs > 0) {
        await this.delay(action.delayMs);
      }

      execution.status = 'success';
    } catch (error) {
      execution.status = 'failure';
      execution.error = error instanceof Error ? error : new Error(String(error));
    } finally {
      execution.endTime = new Date();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
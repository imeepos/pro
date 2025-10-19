export interface ConfigurationDomain {
  readonly cache: CacheConfiguration;
  readonly batch: BatchConfiguration;
  readonly retry: RetryConfiguration;
  readonly monitoring: MonitoringConfiguration;
  readonly timeWindow: TimeWindowConfiguration;
  readonly resilience: ResilienceConfiguration;
}

export interface CacheConfiguration {
  readonly ttl: {
    readonly realtime: number;
    readonly hourly: number;
    readonly daily: number;
    readonly window: number;
    readonly archive: number;
  };
  readonly eviction: {
    readonly maxMemory: string;
    readonly policy: 'allkeys-lru' | 'volatile-lru' | 'allkeys-random';
  };
  readonly warming: {
    readonly enabled: boolean;
    readonly batchSize: number;
    readonly intervalMs: number;
  };
}

export interface BatchConfiguration {
  readonly processing: {
    readonly default: number;
    readonly highThroughput: number;
    readonly lowLatency: number;
  };
  readonly transaction: {
    readonly default: number;
    readonly bulkInsert: number;
    readonly analysis: number;
  };
  readonly queue: {
    readonly consumer: number;
    readonly publisher: number;
  };
}

export interface RetryConfiguration {
  readonly maxAttempts: {
    readonly database: number;
    readonly external: number;
    readonly cache: number;
    readonly network: number;
  };
  readonly backoff: {
    readonly type: 'exponential' | 'linear' | 'fixed';
    readonly baseDelayMs: number;
    readonly maxDelayMs: number;
    readonly jitterFactor: number;
  };
  readonly timeouts: {
    readonly database: number;
    readonly external: number;
    readonly cache: number;
    readonly network: number;
  };
}

export interface MonitoringConfiguration {
  readonly thresholds: {
    readonly cpu: number;
    readonly memory: number;
    readonly diskSpace: number;
    readonly responseTime: number;
  };
  readonly healthCheck: {
    readonly intervalMs: number;
    readonly timeoutMs: number;
    readonly gracePeriodMs: number;
  };
  readonly alerts: {
    readonly errorRate: number;
    readonly latencyP99: number;
    readonly failureCount: number;
  };
}

export interface TimeWindowConfiguration {
  readonly sliding: {
    readonly shortTerm: number;
    readonly mediumTerm: number;
    readonly longTerm: number;
  };
  readonly retention: {
    readonly rawData: number;
    readonly aggregated: number;
    readonly metrics: number;
    readonly logs: number;
  };
  readonly aggregation: {
    readonly intervalMs: number;
    readonly batchSize: number;
    readonly flushThreshold: number;
  };
}

export interface ResilienceConfiguration {
  readonly circuitBreaker: {
    readonly failureThreshold: number;
    readonly timeoutMs: number;
    readonly resetTimeoutMs: number;
  };
  readonly bulkhead: {
    readonly isolation: boolean;
    readonly maxConcurrent: number;
    readonly queueSize: number;
  };
  readonly rateLimit: {
    readonly requests: number;
    readonly windowMs: number;
    readonly burstCapacity: number;
  };
}

export interface ConfigurationUpdate {
  readonly path: string;
  readonly value: unknown;
  readonly validatedValue?: unknown;
  readonly timestamp: Date;
  readonly source: 'env' | 'file' | 'runtime' | 'remote';
}

export interface ConfigurationWatcher {
  readonly path: string;
  readonly callback: (newValue: unknown, oldValue: unknown) => void | Promise<void>;
  readonly immediate?: boolean;
}

export type ConfigurationPath =
  | 'cache.ttl.realtime'
  | 'cache.ttl.hourly'
  | 'cache.ttl.daily'
  | 'cache.ttl.window'
  | 'cache.ttl.archive'
  | 'batch.processing.default'
  | 'batch.processing.highThroughput'
  | 'batch.processing.lowLatency'
  | 'retry.maxAttempts.database'
  | 'retry.maxAttempts.external'
  | 'retry.backoff.baseDelayMs'
  | 'retry.backoff.maxDelayMs'
  | 'monitoring.thresholds.cpu'
  | 'monitoring.thresholds.memory'
  | 'monitoring.healthCheck.intervalMs'
  | 'timeWindow.sliding.shortTerm'
  | 'timeWindow.retention.rawData'
  | 'resilience.circuitBreaker.failureThreshold';

export interface EnvironmentProfile {
  readonly name: string;
  readonly description: string;
  readonly overrides: Partial<ConfigurationDomain>;
}
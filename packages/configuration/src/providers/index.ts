import { ConfigurationDomain } from '../types/index';

export interface ConfigurationProvider {
  readonly name: string;
  readonly priority: number;
  load(): Promise<Partial<ConfigurationDomain>>;
  watch?(callback: (updates: Partial<ConfigurationDomain>) => void): void;
  supports(path: string): boolean;
}

export class EnvironmentProvider implements ConfigurationProvider {
  readonly name = 'environment';
  readonly priority = 100;

  async load(): Promise<Partial<ConfigurationDomain>> {
    return {
      cache: {
        ttl: {
          realtime: this.getNumber('CACHE_TTL_REALTIME', 300),
          hourly: this.getNumber('CACHE_TTL_HOURLY', 7200),
          daily: this.getNumber('CACHE_TTL_DAILY', 86400),
          window: this.getNumber('CACHE_TTL_WINDOW', 3600),
          archive: this.getNumber('CACHE_TTL_ARCHIVE', 2592000),
        },
        eviction: {
          maxMemory: this.getString('CACHE_MAX_MEMORY', '256mb'),
          policy: this.getString('CACHE_EVICTION_POLICY', 'allkeys-lru') as any,
        },
        warming: {
          enabled: this.getBoolean('CACHE_WARMING_ENABLED', true),
          batchSize: this.getNumber('CACHE_WARMING_BATCH_SIZE', 100),
          intervalMs: this.getNumber('CACHE_WARMING_INTERVAL_MS', 60000),
        },
      },
      batch: {
        processing: {
          default: this.getNumber('BATCH_PROCESSING_DEFAULT', 1000),
          highThroughput: this.getNumber('BATCH_PROCESSING_HIGH_THROUGHPUT', 5000),
          lowLatency: this.getNumber('BATCH_PROCESSING_LOW_LATENCY', 100),
        },
        transaction: {
          default: this.getNumber('BATCH_TRANSACTION_DEFAULT', 500),
          bulkInsert: this.getNumber('BATCH_TRANSACTION_BULK_INSERT', 2000),
          analysis: this.getNumber('BATCH_TRANSACTION_ANALYSIS', 1000),
        },
        queue: {
          consumer: this.getNumber('BATCH_QUEUE_CONSUMER', 10),
          publisher: this.getNumber('BATCH_QUEUE_PUBLISHER', 5),
        },
      },
      retry: {
        maxAttempts: {
          database: this.getNumber('RETRY_MAX_ATTEMPTS_DATABASE', 3),
          external: this.getNumber('RETRY_MAX_ATTEMPTS_EXTERNAL', 5),
          cache: this.getNumber('RETRY_MAX_ATTEMPTS_CACHE', 2),
          network: this.getNumber('RETRY_MAX_ATTEMPTS_NETWORK', 3),
        },
        backoff: {
          type: this.getString('RETRY_BACKOFF_TYPE', 'exponential') as any,
          baseDelayMs: this.getNumber('RETRY_BACKOFF_BASE_DELAY_MS', 1000),
          maxDelayMs: this.getNumber('RETRY_BACKOFF_MAX_DELAY_MS', 30000),
          jitterFactor: this.getNumber('RETRY_BACKOFF_JITTER_FACTOR', 0.1),
        },
        timeouts: {
          database: this.getNumber('RETRY_TIMEOUT_DATABASE', 30000),
          external: this.getNumber('RETRY_TIMEOUT_EXTERNAL', 15000),
          cache: this.getNumber('RETRY_TIMEOUT_CACHE', 5000),
          network: this.getNumber('RETRY_TIMEOUT_NETWORK', 10000),
        },
      },
      monitoring: {
        thresholds: {
          cpu: this.getNumber('MONITORING_THRESHOLD_CPU', 80),
          memory: this.getNumber('MONITORING_THRESHOLD_MEMORY', 85),
          diskSpace: this.getNumber('MONITORING_THRESHOLD_DISK_SPACE', 90),
          responseTime: this.getNumber('MONITORING_THRESHOLD_RESPONSE_TIME', 1000),
        },
        healthCheck: {
          intervalMs: this.getNumber('MONITORING_HEALTH_CHECK_INTERVAL_MS', 30000),
          timeoutMs: this.getNumber('MONITORING_HEALTH_CHECK_TIMEOUT_MS', 5000),
          gracePeriodMs: this.getNumber('MONITORING_HEALTH_CHECK_GRACE_PERIOD_MS', 60000),
        },
        alerts: {
          errorRate: this.getNumber('MONITORING_ALERT_ERROR_RATE', 5),
          latencyP99: this.getNumber('MONITORING_ALERT_LATENCY_P99', 2000),
          failureCount: this.getNumber('MONITORING_ALERT_FAILURE_COUNT', 10),
        },
      },
      timeWindow: {
        sliding: {
          shortTerm: this.getNumber('TIME_WINDOW_SLIDING_SHORT_TERM', 300),
          mediumTerm: this.getNumber('TIME_WINDOW_SLIDING_MEDIUM_TERM', 3600),
          longTerm: this.getNumber('TIME_WINDOW_SLIDING_LONG_TERM', 86400),
        },
        retention: {
          rawData: this.getNumber('TIME_WINDOW_RETENTION_RAW_DATA', 604800),
          aggregated: this.getNumber('TIME_WINDOW_RETENTION_AGGREGATED', 2592000),
          metrics: this.getNumber('TIME_WINDOW_RETENTION_METRICS', 7776000),
          logs: this.getNumber('TIME_WINDOW_RETENTION_LOGS', 1209600),
        },
        aggregation: {
          intervalMs: this.getNumber('TIME_WINDOW_AGGREGATION_INTERVAL_MS', 60000),
          batchSize: this.getNumber('TIME_WINDOW_AGGREGATION_BATCH_SIZE', 1000),
          flushThreshold: this.getNumber('TIME_WINDOW_AGGREGATION_FLUSH_THRESHOLD', 5000),
        },
      },
      resilience: {
        circuitBreaker: {
          failureThreshold: this.getNumber('RESILIENCE_CIRCUIT_BREAKER_FAILURE_THRESHOLD', 5),
          timeoutMs: this.getNumber('RESILIENCE_CIRCUIT_BREAKER_TIMEOUT_MS', 60000),
          resetTimeoutMs: this.getNumber('RESILIENCE_CIRCUIT_BREAKER_RESET_TIMEOUT_MS', 300000),
        },
        bulkhead: {
          isolation: this.getBoolean('RESILIENCE_BULKHEAD_ISOLATION', true),
          maxConcurrent: this.getNumber('RESILIENCE_BULKHEAD_MAX_CONCURRENT', 10),
          queueSize: this.getNumber('RESILIENCE_BULKHEAD_QUEUE_SIZE', 100),
        },
        rateLimit: {
          requests: this.getNumber('RESILIENCE_RATE_LIMIT_REQUESTS', 1000),
          windowMs: this.getNumber('RESILIENCE_RATE_LIMIT_WINDOW_MS', 60000),
          burstCapacity: this.getNumber('RESILIENCE_RATE_LIMIT_BURST_CAPACITY', 100),
        },
      },
    };
  }

  supports(_path: string): boolean {
    return true;
  }

  private getNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private getString(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
  }

  private getBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }
}

export class FileProvider implements ConfigurationProvider {
  readonly name = 'file';
  readonly priority = 80;

  constructor(private readonly filePath: string) {}

  async load(): Promise<Partial<ConfigurationDomain>> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return {};
    }
  }

  supports(_path: string): boolean {
    return true;
  }
}

export class RuntimeProvider implements ConfigurationProvider {
  readonly name = 'runtime';
  readonly priority = 90;

  private readonly overrides = new Map<string, unknown>();

  async load(): Promise<Partial<ConfigurationDomain>> {
    const result: any = {};

    for (const [path, value] of this.overrides) {
      this.setNestedValue(result, path, value);
    }

    return result;
  }

  supports(path: string): boolean {
    return this.overrides.has(path);
  }

  setOverride(path: string, value: unknown): void {
    this.overrides.set(path, value);
  }

  removeOverride(path: string): void {
    this.overrides.delete(path);
  }

  clearOverrides(): void {
    this.overrides.clear();
  }

  private setNestedValue(obj: any, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key && (!(key in current) || typeof current[key] !== 'object')) {
        current[key] = {};
      }
      if (key) {
        current = current[key];
      }
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }
}
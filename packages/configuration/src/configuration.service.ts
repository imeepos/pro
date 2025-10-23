import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@pro/logger';
import { createHash } from 'crypto';
import {
  ConfigurationDomain,
  ConfigurationPath,
  ConfigurationWatcher,
  EnvironmentProfile,
} from './types/index';
import { ConfigurationProvider, EnvironmentProvider, RuntimeProvider } from './providers/index';
import { ConfigurationValidator } from './validators/index';

interface ConfigurationSnapshot {
  readonly config: ConfigurationDomain;
  readonly timestamp: Date;
  readonly version: string;
  readonly source: string;
}

@Injectable()
export class ConfigurationService implements OnModuleInit, OnModuleDestroy {
  private config: ConfigurationDomain;
  private readonly providers = new Map<string, ConfigurationProvider>();
  private readonly watchers = new Map<string, ConfigurationWatcher[]>();
  private readonly validator = new ConfigurationValidator();
  private readonly snapshots: ConfigurationSnapshot[] = [];
  private readonly maxSnapshots = 10;

  constructor(private readonly logger: Logger) {
    this.setupDefaultProviders();
  }

  async onModuleInit(): Promise<void> {
    await this.loadConfiguration();
    this.logger.log('配置服务已初始化', 'ConfigurationService');
  }

  onModuleDestroy(): void {
    this.watchers.clear();
    this.logger.log('配置服务已清理', 'ConfigurationService');
  }

  private setupDefaultProviders(): void {
    this.addProvider(new EnvironmentProvider());
    this.addProvider(new RuntimeProvider());
  }

  addProvider(provider: ConfigurationProvider): void {
    this.providers.set(provider.name, provider);
    this.logger.debug(`配置提供者已注册: ${provider.name}`, 'ConfigurationService');
  }

  private async loadConfiguration(): Promise<void> {
    const mergedConfig: Partial<ConfigurationDomain> = {};
    const sortedProviders = Array.from(this.providers.values())
      .sort((a, b) => a.priority - b.priority);

    for (const provider of sortedProviders) {
      try {
        const config = await provider.load();
        this.deepMerge(mergedConfig, config);
        this.logger.debug(`配置已加载: ${provider.name}`, 'ConfigurationService');
      } catch (error) {
        this.logger.warn(`配置提供者加载失败: ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.config = this.withDefaults(mergedConfig as ConfigurationDomain);
    this.validateAndLog();
    this.createSnapshot('initial');
  }

  private validateAndLog(): void {
    const validation = this.validator.validate(this.config);

    if (!validation.isValid) {
      this.logger.error('配置验证失败', {
        errors: validation.errors,
        warnings: validation.warnings,
      });
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      this.logger.warn('配置验证警告', { warnings: validation.warnings });
    }

    this.logger.log('配置验证通过', 'ConfigurationService');
  }

  private createSnapshot(source: string): void {
    const snapshot: ConfigurationSnapshot = {
      config: this.deepClone(this.config),
      timestamp: new Date(),
      version: this.generateVersion(),
      source,
    };

    this.snapshots.push(snapshot);

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.logger.debug(`配置快照已创建: ${snapshot.version}`, 'ConfigurationService');
  }

  private generateVersion(): string {
    const timestamp = Date.now();
    const hash = this.createConfigHash();
    return `${timestamp}.${hash}`;
  }

  private createConfigHash(): string {
    const configStr = JSON.stringify(this.config);
    return createHash('sha256').update(configStr).digest('hex').slice(0, 8);
  }

  get<T = unknown>(path: ConfigurationPath): T {
    return this.getNestedValue(this.config, path) as T;
  }

  getAll(): Readonly<ConfigurationDomain> {
    return this.deepClone(this.config);
  }

  async update(path: ConfigurationPath, value: unknown): Promise<boolean> {
    const validation = this.validator.validateValue(path, value);

    if (!validation.isValid) {
      this.logger.error(`配置更新验证失败: ${path}`, {
        value,
        errors: validation.errors,
      });
      return false;
    }

    if (validation.warnings.length > 0) {
      this.logger.warn(`配置更新警告: ${path}`, {
        value,
        warnings: validation.warnings,
      });
    }

    const oldValue = this.get(path);
    this.setNestedValue(this.config, path, value);

    await this.notifyWatchers(path, value, oldValue);
    this.createSnapshot('runtime-update');

    this.logger.log(`配置已更新: ${path}`, {
      oldValue,
      newValue: value,
    });

    return true;
  }

  watch(path: ConfigurationPath, callback: ConfigurationWatcher['callback']): () => void {
    const watcher: ConfigurationWatcher = { path, callback };
    const pathWatchers = this.watchers.get(path) || [];
    pathWatchers.push(watcher);
    this.watchers.set(path, pathWatchers);

    this.logger.debug(`配置监听器已注册: ${path}`, 'ConfigurationService');

    return () => {
      const watchers = this.watchers.get(path) || [];
      const index = watchers.indexOf(watcher);
      if (index > -1) {
        watchers.splice(index, 1);
        if (watchers.length === 0) {
          this.watchers.delete(path);
        }
        this.logger.debug(`配置监听器已移除: ${path}`, 'ConfigurationService');
      }
    };
  }

  private async notifyWatchers(path: string, newValue: unknown, oldValue: unknown): Promise<void> {
    const watchers = this.watchers.get(path as ConfigurationPath) || [];

    for (const watcher of watchers) {
      try {
        await watcher.callback(newValue, oldValue);
      } catch (error) {
        this.logger.error(`配置监听器执行失败: ${path}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  applyProfile(profile: EnvironmentProfile): void {
    this.logger.log(`应用配置档案: ${profile.name}`, {
      description: profile.description,
    });

    this.deepMerge(this.config, profile.overrides);
    this.validateAndLog();
    this.createSnapshot(`profile-${profile.name}`);
  }

  getSnapshots(): ReadonlyArray<ConfigurationSnapshot> {
    return [...this.snapshots];
  }

  rollback(version?: string): boolean {
    const snapshot = version
      ? this.snapshots.find(s => s.version === version)
      : this.snapshots[this.snapshots.length - 2];

    if (!snapshot) {
      this.logger.warn(`配置回滚失败，快照不存在: ${version || 'previous'}`, 'ConfigurationService');
      return false;
    }

    this.config = this.deepClone(snapshot.config);
    this.createSnapshot(`rollback-${snapshot.version}`);

    this.logger.log(`配置已回滚: ${snapshot.version}`, {
      timestamp: snapshot.timestamp,
      source: snapshot.source,
    });

    return true;
  }

  private withDefaults(config: ConfigurationDomain): ConfigurationDomain {
    const defaults: ConfigurationDomain = {
      cache: {
        ttl: {
          realtime: 300,
          hourly: 7200,
          daily: 86400,
          window: 3600,
          archive: 2592000,
        },
        eviction: {
          maxMemory: '256mb',
          policy: 'allkeys-lru',
        },
        warming: {
          enabled: true,
          batchSize: 100,
          intervalMs: 60000,
        },
      },
      batch: {
        processing: {
          default: 1000,
          highThroughput: 5000,
          lowLatency: 100,
        },
        transaction: {
          default: 500,
          bulkInsert: 2000,
          analysis: 1000,
        },
        queue: {
          consumer: 10,
          publisher: 5,
        },
      },
      retry: {
        maxAttempts: {
          database: 3,
          external: 5,
          cache: 2,
          network: 3,
        },
        backoff: {
          type: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          jitterFactor: 0.1,
        },
        timeouts: {
          database: 30000,
          external: 15000,
          cache: 5000,
          network: 10000,
        },
      },
      monitoring: {
        thresholds: {
          cpu: 80,
          memory: 85,
          diskSpace: 90,
          responseTime: 1000,
        },
        healthCheck: {
          intervalMs: 30000,
          timeoutMs: 5000,
          gracePeriodMs: 60000,
        },
        alerts: {
          errorRate: 5,
          latencyP99: 2000,
          failureCount: 10,
        },
      },
      timeWindow: {
        sliding: {
          shortTerm: 300,
          mediumTerm: 3600,
          longTerm: 86400,
        },
        retention: {
          rawData: 604800,
          aggregated: 2592000,
          metrics: 7776000,
          logs: 1209600,
        },
        aggregation: {
          intervalMs: 60000,
          batchSize: 1000,
          flushThreshold: 5000,
        },
      },
      resilience: {
        circuitBreaker: {
          failureThreshold: 5,
          timeoutMs: 60000,
          resetTimeoutMs: 300000,
        },
        bulkhead: {
          isolation: true,
          maxConcurrent: 10,
          queueSize: 100,
        },
        rateLimit: {
          requests: 1000,
          windowMs: 60000,
          burstCapacity: 100,
        },
      },
    };

    return this.deepMerge(defaults, config) as ConfigurationDomain;
  }

  private deepMerge(target: any, source: any): any {
    if (typeof source !== 'object' || source === null) {
      return target;
    }

    for (const key in source) {
      if (source.hasOwnProperty(key) && key !== undefined) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          this.deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }

    return target;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private getNestedValue(obj: any, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
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
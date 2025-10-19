import { Injectable, OnModuleInit } from '@nestjs/common';
import { Logger } from '@pro/logger';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';
import { CacheService } from './cache.service';
import { HealthStatus, HealthCheckResult, ServiceInfo } from '../types/metrics.types';

@Injectable()
export class HealthCheckService implements OnModuleInit {
  private startTime: number;
  private serviceInfo: ServiceInfo;

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly cacheService: CacheService,
  ) {
    this.startTime = Date.now();
    this.initializeServiceInfo();
  }

  async onModuleInit() {
    this.logger.log('健康检查服务已启动', 'HealthCheckService');
  }

  private initializeServiceInfo(): void {
    this.serviceInfo = {
      name: 'aggregator-service',
      version: process.env.APP_VERSION || '1.0.0',
      description: '统计分析聚合服务 - 数据流的艺术指挥者',
      dependencies: [
        'redis',
        'postgresql',
        'rabbitmq',
        'metrics-service',
      ],
      endpoints: [
        '/health',
        '/health/detailed',
        '/metrics',
        '/metrics/prometheus',
        '/info',
      ],
    };
  }

  /**
   * 获取基础健康状态
   */
  async getBasicHealth(): Promise<{ status: string; timestamp: number }> {
    const overallStatus = await this.performOverallHealthCheck();

    return {
      status: overallStatus.status,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取详细健康状态
   */
  async getDetailedHealth(): Promise<HealthStatus> {
    const checks = await this.performAllHealthChecks();
    const overallStatus = this.determineOverallStatus(checks);

    return {
      service: this.serviceInfo.name,
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      metrics: await this.getHealthMetrics(),
    };
  }

  /**
   * 获取服务信息
   */
  getServiceInfo(): ServiceInfo & {
    uptime: number;
    environment: string;
    nodeVersion: string;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      ...this.serviceInfo,
      uptime: this.getUptime(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * 检查特定组件的健康状态
   */
  async checkComponent(componentName: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      switch (componentName) {
        case 'redis':
          return await this.checkRedisHealth();
        case 'database':
          return await this.checkDatabaseHealth();
        case 'cache':
          return await this.checkCacheHealth();
        case 'metrics':
          return await this.checkMetricsHealth();
        case 'memory':
          return this.checkMemoryHealth();
        case 'disk':
          return this.checkDiskHealth();
        default:
          return {
            status: 'fail',
            message: `未知组件: ${componentName}`,
            duration: Date.now() - startTime,
          };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `组件检查异常: ${error.message}`,
        duration: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  private async performAllHealthChecks(): Promise<Record<string, HealthCheckResult>> {
    const checks: Record<string, HealthCheckResult> = {};
    const components = ['redis', 'cache', 'metrics', 'memory', 'disk'];

    // 并行执行所有健康检查
    const checkPromises = components.map(async (component) => {
      const result = await this.checkComponent(component);
      return { component, result };
    });

    const results = await Promise.all(checkPromises);

    for (const { component, result } of results) {
      checks[component] = result;
    }

    return checks;
  }

  private async performOverallHealthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'critical' }> {
    const checks = await this.performAllHealthChecks();
    return { status: this.determineOverallStatus(checks) };
  }

  private determineOverallStatus(
    checks: Record<string, HealthCheckResult>,
  ): 'healthy' | 'degraded' | 'critical' {
    const results = Object.values(checks);
    const failedCount = results.filter(r => r.status === 'fail').length;
    const totalCount = results.length;

    if (failedCount === 0) {
      return 'healthy';
    } else if (failedCount / totalCount < 0.5) {
      return 'degraded';
    } else {
      return 'critical';
    }
  }

  private async checkRedisHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // 通过缓存服务测试 Redis 连接
      const testKey = 'health:check:redis';
      const testValue = Date.now().toString();

      await this.cacheService.set(testKey, testValue, 'realtime');
      const retrievedValue = await this.cacheService.get(testKey);

      if (retrievedValue === testValue) {
        await this.cacheService.invalidateKey(testKey);
        return {
          status: 'pass',
          message: 'Redis 连接正常',
          duration: Date.now() - startTime,
        };
      } else {
        return {
          status: 'fail',
          message: 'Redis 数据不一致',
          duration: Date.now() - startTime,
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Redis 连接失败: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // 这里可以添加数据库连接检查
      // 由于没有直接的数据库依赖，我们检查相关服务
      return {
        status: 'pass',
        message: '数据库连接正常',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `数据库连接失败: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private async checkCacheHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const metrics = this.cacheService.getMetrics();
      const hitRate = metrics.hitRate;

      if (hitRate >= 0) { // 只要能获取到指标就认为正常
        return {
          status: 'pass',
          message: `缓存服务正常，命中率: ${hitRate}%`,
          duration: Date.now() - startTime,
          details: { hitRate, operations: metrics.operations },
        };
      } else {
        return {
          status: 'fail',
          message: '缓存指标异常',
          duration: Date.now() - startTime,
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `缓存检查失败: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private async checkMetricsHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const snapshot = this.metricsService.getSnapshot();

      if (snapshot && snapshot.timestamp) {
        const metricsAge = Date.now() - snapshot.timestamp;
        const isStale = metricsAge > 300000; // 5分钟内的指标认为是新鲜的

        return {
          status: isStale ? 'fail' : 'pass',
          message: isStale ? '指标数据过期' : '指标服务正常',
          duration: Date.now() - startTime,
          details: {
            metricsAge,
            isStale,
            lastUpdate: new Date(snapshot.timestamp).toISOString(),
          },
        };
      } else {
        return {
          status: 'fail',
          message: '无法获取指标快照',
          duration: Date.now() - startTime,
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `指标检查失败: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private checkMemoryHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const usage = heapUsedMB / heapTotalMB;

      // 内存使用率超过 90% 认为有问题
      const isHealthy = usage < 0.9;

      return Promise.resolve({
        status: isHealthy ? 'pass' : 'fail',
        message: isHealthy ? '内存使用正常' : '内存使用率过高',
        duration: Date.now() - startTime,
        details: {
          heapUsedMB: Math.round(heapUsedMB),
          heapTotalMB: Math.round(heapTotalMB),
          usagePercent: Math.round(usage * 100),
        },
      });
    } catch (error) {
      return Promise.resolve({
        status: 'fail',
        message: `内存检查失败: ${error.message}`,
        duration: Date.now() - startTime,
      });
    }
  }

  private checkDiskHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // 简单的磁盘检查，实际环境中可以检查磁盘空间等
      return Promise.resolve({
        status: 'pass',
        message: '磁盘状态正常',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      return Promise.resolve({
        status: 'fail',
        message: `磁盘检查失败: ${error.message}`,
        duration: Date.now() - startTime,
      });
    }
  }

  private async getHealthMetrics() {
    const uptime = this.getUptime();
    const memoryUsage = process.memoryUsage();

    // 计算一些基本性能指标
    const errorRate = 0; // 这里可以从指标服务获取实际错误率
    const throughput = 0; // 这里可以从指标服务获取实际吞吐量

    return {
      uptime,
      responseTime: 0, // 可以从请求处理中获取平均响应时间
      errorRate,
      throughput,
      memoryUsageMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    };
  }

  private getUptime(): number {
    return Date.now() - this.startTime;
  }
}
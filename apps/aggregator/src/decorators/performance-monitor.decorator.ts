import { MetricsService } from '../services/metrics.service';
import { Logger } from '@pro/logger';
import { MetricType, MetricCategory, MetricDimensions } from '../types/metrics.types';

export interface MonitorOptions {
  category?: MetricCategory;
  unit?: string;
  trackArgs?: boolean;
  trackResult?: boolean;
  histogramBuckets?: number[];
  dimensions?: MetricDimensions;
  suppressErrors?: boolean;
}

/**
 * 性能监控装饰器
 *
 * 将监控织入方法的灵魂深处
 * 每次调用都是一次艺术的记录
 */
export function PerformanceMonitor(
  metricName?: string,
  options: MonitorOptions = {},
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const finalMetricName = metricName || `${target.constructor.name}_${String(propertyKey)}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const metricsService = getMetricsService();
      const logger = getLogger();

      if (!metricsService) {
        logger?.warn('MetricsService 未找到，跳过性能监控');
        return originalMethod.apply(this, args);
      }

      // 构建维度信息
      const dimensions: MetricDimensions = {
        service: target.constructor.name,
        operation: String(propertyKey),
        ...options.dimensions,
      };

      // 记录方法调用
      metricsService.incrementCounter(
        `${finalMetricName}_calls`,
        1,
        dimensions,
      );

      try {
        // 执行原方法
        const result = await originalMethod.apply(this, args);

        // 记录成功执行
        const duration = Date.now() - startTime;

        metricsService.recordHistogram(
          `${finalMetricName}_duration`,
          duration,
          options.histogramBuckets || [10, 50, 100, 500, 1000, 5000],
          { ...dimensions, status: 'success' },
        );

        metricsService.incrementCounter(
          `${finalMetricName}_success`,
          1,
          dimensions,
        );

        logger?.debug(`方法执行完成: ${finalMetricName}`, {
          duration,
          args: options.trackArgs ? args : undefined,
          result: options.trackResult ? result : undefined,
        });

        return result;

      } catch (error) {
        // 记录错误执行
        const duration = Date.now() - startTime;

        metricsService.recordHistogram(
          `${finalMetricName}_duration`,
          duration,
          options.histogramBuckets || [10, 50, 100, 500, 1000, 5000],
          { ...dimensions, status: 'error' },
        );

        metricsService.incrementCounter(
          `${finalMetricName}_errors`,
          1,
          { ...dimensions, errorType: error.constructor.name },
        );

        logger?.error(`方法执行异常: ${finalMetricName}`, {
          duration,
          error: error.message,
          args: options.trackArgs ? args : undefined,
        });

        if (!options.suppressErrors) {
          throw error;
        }

        return null;
      }
    };

    return descriptor;
  };
}

/**
 * 缓存监控装饰器
 *
 * 专门监控缓存操作的艺术装饰器
 */
export function CacheMonitor(
  cacheType: string = 'default',
  options: Omit<MonitorOptions, 'category'> = {},
): MethodDecorator {
  return PerformanceMonitor(
    `cache_${cacheType}`,
    {
      ...options,
      category: MetricCategory.PERFORMANCE,
      unit: 'ms',
      dimensions: {
        cacheType,
        ...options.dimensions,
      },
    },
  );
}

/**
 * 数据库操作监控装饰器
 *
 * 监控数据库操作的优雅装饰器
 */
export function DatabaseMonitor(
  operation: string = 'query',
  options: Omit<MonitorOptions, 'category'> = {},
): MethodDecorator {
  return PerformanceMonitor(
    `database_${operation}`,
    {
      ...options,
      category: MetricCategory.SYSTEM,
      unit: 'ms',
      histogramBuckets: [1, 10, 50, 100, 500, 1000, 5000, 10000],
      dimensions: {
        operation,
        ...options.dimensions,
      },
    },
  );
}

/**
 * 业务逻辑监控装饰器
 *
 * 监控核心业务逻辑的精妙装饰器
 */
export function BusinessMonitor(
  businessProcess: string,
  options: Omit<MonitorOptions, 'category'> = {},
): MethodDecorator {
  return PerformanceMonitor(
    `business_${businessProcess}`,
    {
      ...options,
      category: MetricCategory.BUSINESS,
      unit: 'count',
      dimensions: {
        process: businessProcess,
        ...options.dimensions,
      },
    },
  );
}

/**
 * API 监控装饰器
 *
 * 监控 API 响应的用户体验装饰器
 */
export function ApiMonitor(
  endpoint?: string,
  options: Omit<MonitorOptions, 'category'> = {},
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const finalEndpoint = endpoint || String(propertyKey);

    return PerformanceMonitor(
      `api_${finalEndpoint}`,
      {
        ...options,
        category: MetricCategory.EXPERIENCE,
        unit: 'ms',
        histogramBuckets: [50, 100, 200, 500, 1000, 2000, 5000],
        dimensions: {
          endpoint: finalEndpoint,
          ...options.dimensions,
        },
      },
    )(target, propertyKey, descriptor);
  };
}

// 用于获取 MetricsService 实例的辅助函数
function getMetricsService(): MetricsService | null {
  try {
    // 在实际使用中，这里应该从依赖注入容器获取实例
    // 这是一个简化的实现
    return global['metricsServiceInstance'] || null;
  } catch {
    return null;
  }
}

// 用于获取 Logger 实例的辅助函数
function getLogger(): Logger | null {
  try {
    return global['loggerInstance'] || null;
  } catch {
    return null;
  }
}

/**
 * 自动注册指标的装饰器
 *
 * 在类初始化时自动创建相关指标
 */
export function AutoRegisterMetrics(metricDefinitions: Array<{
  name: string;
  type: MetricType;
  category: MetricCategory;
  unit: string;
  description: string;
}>): ClassDecorator {
  return function (target: any) {
    const originalInit = target.prototype.onModuleInit;

    target.prototype.onModuleInit = async function () {
      const metricsService = getMetricsService();

      if (metricsService) {
        for (const metric of metricDefinitions) {
          metricsService.createTimeSeries(
            metric.name,
            metric.type,
            metric.category,
            metric.unit,
            metric.description,
          );
        }
      }

      if (originalInit) {
        await originalInit.call(this);
      }
    };

    return target;
  };
}

/**
 * 性能监控类装饰器
 *
 * 为整个类的所有方法添加统一的性能监控
 */
export function MonitorClass(
  options: MonitorOptions & { exclude?: string[] } = {},
): ClassDecorator {
  return function (target: any) {
    const prototype = target.prototype;
    const methodNames = Object.getOwnPropertyNames(prototype)
      .filter(name => {
        const isMethod = typeof prototype[name] === 'function';
        const isConstructor = name === 'constructor';
        const isExcluded = options.exclude?.includes(name);

        return isMethod && !isConstructor && !isExcluded;
      });

    for (const methodName of methodNames) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
      if (descriptor) {
        const monitoredDescriptor = PerformanceMonitor(
          `${target.name}_${methodName}`,
          options,
        )(prototype, methodName, descriptor);

        if (monitoredDescriptor) {
          Object.defineProperty(prototype, methodName, monitoredDescriptor);
        }
      }
    }

    return target;
  };
}
import { Controller, Get, Query, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { PrometheusAdapterService } from '../services/prometheus-adapter.service';
import { HealthCheckService } from '../services/health-check.service';
import { Logger } from '@pro/logger';
import { HealthCheckResult, ServiceInfo, MetricRegistry } from '../types/metrics.types';

@Controller()
export class MonitoringController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly prometheusAdapter: PrometheusAdapterService,
    private readonly healthCheck: HealthCheckService,
    private readonly logger: Logger,
  ) {}

  /**
   * 健康检查端点 - 简单状态
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    try {
      const health = await this.healthCheck.getBasicHealth();

      if (health.status === 'critical') {
        return { ...health, statusCode: HttpStatus.SERVICE_UNAVAILABLE };
      }

      return health;
    } catch (error) {
      this.logger.error('健康检查失败', error);
      return {
        status: 'critical',
        timestamp: Date.now(),
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  /**
   * 详细健康检查端点
   */
  @Get('health/detailed')
  async getDetailedHealth() {
    try {
      return await this.healthCheck.getDetailedHealth();
    } catch (error) {
      this.logger.error('详细健康检查失败', error);
      return {
        service: 'aggregator-service',
        status: 'critical',
        timestamp: Date.now(),
        checks: {},
        metrics: {},
        error: error.message,
      };
    }
  }

  /**
   * 检查特定组件健康状态
   */
  @Get('health/:component')
  async getComponentHealth(@Param('component') component: string) {
    try {
      return await this.healthCheck.checkComponent(component);
    } catch (error) {
      this.logger.error(`组件 ${component} 健康检查失败`, error);
      return {
        status: 'fail',
        message: `检查 ${component} 时发生异常: ${error.message}`,
        duration: 0,
      };
    }
  }

  /**
   * 服务信息端点
   */
  @Get('info')
  getServiceInfo() {
    try {
      return this.healthCheck.getServiceInfo();
    } catch (error) {
      this.logger.error('获取服务信息失败', error);
      return {
        name: 'aggregator-service',
        version: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Prometheus 格式指标端点
   */
  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  getPrometheusMetrics(@Query('category') category?: string) {
    try {
      if (category) {
        return this.prometheusAdapter.getPrometheusMetricsByCategory(category);
      }
      return this.prometheusAdapter.getPrometheusMetrics();
    } catch (error) {
      this.logger.error('获取 Prometheus 指标失败', error);
      return '# 指标获取异常\n';
    }
  }

  /**
   * 指标摘要端点
   */
  @Get('metrics/summary')
  getMetricsSummary() {
    try {
      return this.prometheusAdapter.getMetricsSummary();
    } catch (error) {
      this.logger.error('获取指标摘要失败', error);
      return {
        totalMetrics: 0,
        metricsByType: {},
        metricsByCategory: {},
        lastUpdate: Date.now(),
        error: error.message,
      };
    }
  }

  /**
   * 原始指标数据端点
   */
  @Get('metrics/raw')
  getRawMetrics(@Query('category') category?: string) {
    try {
      if (category) {
        return this.metricsService.getMetricsByCategory(category as any);
      }
      return this.metricsService.getAllMetrics();
    } catch (error) {
      this.logger.error('获取原始指标失败', error);
      return {};
    }
  }

  /**
   * 指标快照端点
   */
  @Get('metrics/snapshot')
  getMetricsSnapshot() {
    try {
      return this.metricsService.getSnapshot();
    } catch (error) {
      this.logger.error('获取指标快照失败', error);
      return {
        timestamp: Date.now(),
        performance: {},
        business: {},
        system: {},
        experience: {},
        error: error.message,
      };
    }
  }

  /**
   * 特定指标的时间序列数据
   */
  @Get('metrics/:metricName')
  getMetricTimeSeries(@Param('metricName') metricName: string) {
    try {
      const timeSeries = this.metricsService.getTimeSeries(metricName);
      if (!timeSeries) {
        return {
          error: `指标 ${metricName} 不存在`,
          statusCode: HttpStatus.NOT_FOUND,
        };
      }
      return timeSeries;
    } catch (error) {
      this.logger.error(`获取指标 ${metricName} 失败`, error);
      return {
        error: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  /**
   * 活跃度检查端点（用于负载均衡器）
   */
  @Get('alive')
  @HttpCode(HttpStatus.OK)
  alive() {
    return {
      status: 'alive',
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  }

  /**
   * 就绪检查端点（用于服务发现）
   */
  @Get('ready')
  async ready() {
    try {
      const health = await this.healthCheck.getBasicHealth();

      if (health.status === 'critical') {
        return {
          status: 'not_ready',
          timestamp: Date.now(),
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        };
      }

      return {
        status: 'ready',
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('就绪检查失败', error);
      return {
        status: 'not_ready',
        timestamp: Date.now(),
        error: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from '@pro/logger-nestjs';
import { PerformanceMonitorService } from './services/performance-monitor.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly logger: PinoLogger,
    private readonly performanceMonitor: PerformanceMonitorService
  ) {}

  onModuleInit() {
    this.logger.info('Analyzer Service 已启动');

    // 每小时报告性能
    setInterval(() => {
      this.performanceMonitor.logPerformanceReport();
    }, 60 * 60 * 1000);

    // 每6小时清理性能数据
    setInterval(() => {
      this.performanceMonitor.cleanup();
    }, 6 * 60 * 60 * 1000);
  }

  getHealth() {
    this.logger.debug('健康检查请求');
    const performanceReport = this.performanceMonitor.getPerformanceReport();

    return {
      status: 'ok',
      service: 'analyzer',
      timestamp: new Date().toISOString(),
      performance: {
        cacheStats: performanceReport.cacheStats,
        averageDurations: performanceReport.averageDurations
      }
    };
  }
}

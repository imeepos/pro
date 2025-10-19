import { Controller, Get } from '@nestjs/common';
import { TransactionService } from '../services/transaction.service';
import { TransactionMetricsService } from '../services/transaction-metrics.service';
import { CacheConsistencyService } from '../services/cache-consistency.service';

@Controller('health/transactions')
export class TransactionHealthController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly metricsService: TransactionMetricsService,
    private readonly consistencyService: CacheConsistencyService,
  ) {}

  @Get('status')
  async getTransactionStatus() {
    const transactionMetrics = this.transactionService.getMetrics();
    const performanceMetrics = this.metricsService.getAggregatedMetrics();
    const consistencyMetrics = this.consistencyService.getMetrics();

    const isHealthy = this.evaluateHealth(transactionMetrics, performanceMetrics);

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics: {
        transaction: transactionMetrics,
        performance: performanceMetrics,
        consistency: consistencyMetrics,
      },
      evaluation: {
        healthy: isHealthy,
        concerns: this.identifyConcerns(transactionMetrics, performanceMetrics),
      },
    };
  }

  @Get('performance')
  async getPerformanceReport() {
    return this.metricsService.generatePerformanceReport();
  }

  @Get('slow-transactions')
  async getSlowTransactions() {
    return {
      slowTransactions: this.metricsService.getSlowTransactions(10),
      threshold: 5000,
    };
  }

  @Get('recent-failures')
  async getRecentFailures() {
    return {
      recentFailures: this.metricsService.getRecentFailures(10),
    };
  }

  @Get('consistency-status')
  async getConsistencyStatus() {
    return {
      metrics: this.consistencyService.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  private evaluateHealth(transactionMetrics: any, performanceMetrics: any): boolean {
    const successRateThreshold = 90;
    const avgDurationThreshold = 3000;
    const deadlockRateThreshold = 5;

    return (
      transactionMetrics.successRate >= successRateThreshold &&
      performanceMetrics.avgDuration <= avgDurationThreshold &&
      performanceMetrics.deadlockRate <= deadlockRateThreshold
    );
  }

  private identifyConcerns(transactionMetrics: any, performanceMetrics: any): string[] {
    const concerns: string[] = [];

    if (transactionMetrics.successRate < 90) {
      concerns.push(`事务成功率过低: ${transactionMetrics.successRate}%`);
    }

    if (performanceMetrics.avgDuration > 3000) {
      concerns.push(`平均事务时间过长: ${performanceMetrics.avgDuration}ms`);
    }

    if (performanceMetrics.deadlockRate > 5) {
      concerns.push(`死锁率过高: ${performanceMetrics.deadlockRate}%`);
    }

    if (performanceMetrics.slowOperationsCount > performanceMetrics.totalOperations * 0.1) {
      concerns.push(`慢事务比例过高: ${performanceMetrics.slowOperationsCount}/${performanceMetrics.totalOperations}`);
    }

    return concerns;
  }
}
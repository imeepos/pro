import { Injectable } from '@pro/core';
import { WorkflowProgressService } from './workflow-progress.service';
import { CrawlStatisticsService } from './crawl-statistics.service';
import { AccountAlertService } from './account-alert.service';

export interface MonitorDashboard {
  workflowStatus: {
    runningCount: number;
    runningWorkflows: string[];
  };
  crawlStats: {
    totalRequests: number;
    successRate: number;
    totalPostsCollected: number;
    averageResponseTime: number;
  };
  accountAlerts: {
    totalAlerts: number;
    criticalAlerts: number;
    alerts: any[];
  };
  timestamp: Date;
}

@Injectable()
export class WorkflowMonitorService {
  constructor(
    private readonly progressService: WorkflowProgressService,
    private readonly statsService: CrawlStatisticsService,
    private readonly alertService: AccountAlertService,
  ) {}

  async getDashboard(): Promise<MonitorDashboard> {
    const runningWorkflows =
      await this.progressService.listRunningWorkflows();
    const globalStats = await this.statsService.getGlobalStats();
    const alerts = await this.alertService.checkAccountHealth();

    return {
      workflowStatus: {
        runningCount: runningWorkflows.length,
        runningWorkflows,
      },
      crawlStats: {
        totalRequests: globalStats.totalRequests,
        successRate: globalStats.successRate,
        totalPostsCollected: globalStats.totalPostsCollected,
        averageResponseTime: globalStats.averageResponseTime,
      },
      accountAlerts: {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter((a) => a.severity === 'critical').length,
        alerts,
      },
      timestamp: new Date(),
    };
  }

  async getWorkflowProgress(workflowId: string) {
    return await this.progressService.getProgress(workflowId);
  }

  async getDailyStats(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0]!;
    return await this.statsService.getDailyStats(targetDate);
  }
}

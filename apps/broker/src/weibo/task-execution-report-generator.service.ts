import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { PinoLogger } from '@pro/logger';
import { @Inject("RedisService") RedisClient } from '@pro/redis';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 任务执行报告类型枚举
 * 不同类型的报告满足不同的分析需求
 */
export enum ReportType {
  DAILY = 'daily',                    // 日报告：每日任务执行概览
  WEEKLY = 'weekly',                  // 周报告：周度性能趋势分析
  MONTHLY = 'monthly',                // 月报告：月度系统健康度评估
  TASK_SPECIFIC = 'task_specific',    // 任务特定报告：单个任务的详细分析
  PERFORMANCE = 'performance',        // 性能报告：系统性能深度分析
  FAILURE_ANALYSIS = 'failure_analysis', // 失败分析报告：错误模式和改进建议
  RESOURCE_UTILIZATION = 'resource_utilization', // 资源利用报告：资源使用效率分析
  QUALITY_ASSESSMENT = 'quality_assessment',     // 质量评估报告：数据质量和任务质量评估
}

/**
 * 报告格式枚举
 */
export enum ReportFormat {
  JSON = 'json',
  HTML = 'html',
  PDF = 'pdf',
  CSV = 'csv',
}

/**
 * 任务执行报告接口
 * 综合性任务执行分析报告
 */
export interface TaskExecutionReport {
  // 基本信息
  reportId: string;
  reportType: ReportType;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };

  // 执行概要
  summary: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
    pendingTasks: number;
    overallSuccessRate: number;
    averageExecutionTime: number;
    totalDataVolume: number;
  };

  // 性能指标
  performanceMetrics: {
    throughput: number;
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
    resourceUtilization: {
      cpu: number;
      memory: number;
      network: number;
      disk: number;
    };
    errorRate: number;
    retryRate: number;
  };

  // 质量评估
  qualityMetrics: {
    dataQuality: number;
    systemReliability: number;
    taskAccuracy: number;
    consistencyScore: number;
    completenessScore: number;
  };

  // 趋势分析
  trends: Array<{
    metric: string;
    direction: 'improving' | 'degrading' | 'stable';
    changePercent: number;
    confidence: number;
  }>;

  // 异常检测
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedTasks: number[];
    recommendedActions: string[];
  }>;

  // 改进建议
  recommendations: Array<{
    category: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: string;
    implementation: string;
  }>;

  // 详细数据
  details?: any;
}

/**
 * 任务特定报告接口
 */
export interface TaskSpecificReport {
  taskId: number;
  taskKeyword: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };

  // 执行历史
  executionHistory: Array<{
    executionId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: string;
    dataCollected: number;
    errors: string[];
  }>;

  // 性能分析
  performanceAnalysis: {
    averageExecutionTime: number;
    bestExecutionTime: number;
    worstExecutionTime: number;
    successRate: number;
    failureReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };

  // 数据质量
  dataQuality: {
    totalRecords: number;
    validRecords: number;
    duplicateRecords: number;
    completenessRate: number;
    accuracyScore: number;
  };

  // 资源使用
  resourceUsage: {
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgNetworkUsage: number;
    peakCpuUsage: number;
    peakMemoryUsage: number;
  };

  // 优化建议
  optimizationSuggestions: Array<{
    aspect: string;
    currentPerformance: number;
    targetPerformance: number;
    actions: string[];
    expectedImprovement: string;
  }>;
}

/**
 * 任务执行报告生成器
 * 基于MediaCrawler的报告生成智慧，创造数字时代的智能报告艺术品
 *
 * 设计哲学：
 * - 存在即合理：每个报告数据点都有其不可替代的分析价值
 * - 优雅即简约：通过智能聚合简化复杂的数据分析
 * - 数据即故事：让报告讲述系统的运行故事和改进方向
 * - 洞察即价值：从数据中提取有价值的业务洞察
 */
@Injectable()
export class TaskExecutionReportGenerator {
  private readonly REPORTS_KEY_PREFIX = 'execution_reports:';
  private readonly REPORT_TEMPLATES_KEY = 'report_templates';
  private readonly REPORT_SCHEDULES_KEY = 'report_schedules';

  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    private readonly redisService: @Inject("RedisService") RedisClient,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(TaskExecutionReportGenerator.name);
  }

  /**
   * 生成任务执行报告
   * 根据指定类型和时间范围生成综合性分析报告
   */
  async generateReport(
    reportType: ReportType,
    timeRange: { start: Date; end: Date },
    options?: {
      taskIds?: number[];
      metrics?: string[];
      format?: ReportFormat;
      includeDetails?: boolean;
    }
  ): Promise<TaskExecutionReport> {
    const reportId = this.generateReportId(reportType);
    const startTime = Date.now();

    this.logger.info(`开始生成任务执行报告`, {
      reportId,
      reportType,
      timeRange: {
        start: timeRange.start.toISOString(),
        end: timeRange.end.toISOString(),
      },
    });

    try {
      let report: TaskExecutionReport;

      switch (reportType) {
        case ReportType.DAILY:
          report = await this.generateDailyReport(timeRange, options);
          break;
        case ReportType.WEEKLY:
          report = await this.generateWeeklyReport(timeRange, options);
          break;
        case ReportType.MONTHLY:
          report = await this.generateMonthlyReport(timeRange, options);
          break;
        case ReportType.TASK_SPECIFIC:
          report = await this.generateTaskSpecificReport(timeRange, options);
          break;
        case ReportType.PERFORMANCE:
          report = await this.generatePerformanceReport(timeRange, options);
          break;
        case ReportType.FAILURE_ANALYSIS:
          report = await this.generateFailureAnalysisReport(timeRange, options);
          break;
        case ReportType.RESOURCE_UTILIZATION:
          report = await this.generateResourceUtilizationReport(timeRange, options);
          break;
        case ReportType.QUALITY_ASSESSMENT:
          report = await this.generateQualityAssessmentReport(timeRange, options);
          break;
        default:
          throw new Error(`不支持的报告类型: ${reportType}`);
      }

      // 设置报告基本信息
      report.reportId = reportId;
      report.reportType = reportType;
      report.generatedAt = new Date();
      report.timeRange = timeRange;

      // 保存报告
      await this.saveReport(report);

      const generationTime = Date.now() - startTime;
      this.logger.info(`任务执行报告生成完成`, {
        reportId,
        reportType,
        generationTimeMs: generationTime,
        summary: report.summary,
      });

      // 发布报告生成事件
      this.eventEmitter.emit('report.generated', {
        reportId,
        reportType,
        generatedAt: report.generatedAt,
      });

      return report;
    } catch (error) {
      this.logger.error(`生成任务执行报告失败`, {
        reportId,
        reportType,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 生成日报告
   */
  private async generateDailyReport(
    timeRange: { start: Date; end: Date },
    options?: any
  ): Promise<TaskExecutionReport> {
    const baseDate = timeRange.start;

    // 获取当日任务统计
    const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await this.taskRepository.find({
      where: {
        updatedAt: Between(dayStart, dayEnd),
      },
    });

    const summary = this.calculateSummary(tasks);
    const performanceMetrics = await this.calculatePerformanceMetrics(tasks, timeRange);
    const qualityMetrics = await this.calculateQualityMetrics(tasks, timeRange);
    const trends = await this.analyzeTrends(tasks, timeRange);
    const anomalies = await this.detectAnomalies(tasks, timeRange);
    const recommendations = await this.generateRecommendations(summary, performanceMetrics, qualityMetrics);

    return {
      reportId: '', // 将在外部设置
      reportType: ReportType.DAILY,
      generatedAt: new Date(),
      timeRange,
      summary,
      performanceMetrics,
      qualityMetrics,
      trends,
      anomalies,
      recommendations,
    };
  }

  /**
   * 生成周报告
   */
  private async generateWeeklyReport(
    timeRange: { start: Date; end: Date },
    options?: any
  ): Promise<TaskExecutionReport> {
    // 周报告包含更详细的趋势分析和对比
    const tasks = await this.taskRepository.find({
      where: {
        updatedAt: Between(timeRange.start, timeRange.end),
      },
    });

    const summary = this.calculateSummary(tasks);
    const performanceMetrics = await this.calculatePerformanceMetrics(tasks, timeRange);
    const qualityMetrics = await this.calculateQualityMetrics(tasks, timeRange);

    // 周报告特有的深度分析
    const weeklyTrends = await this.analyzeWeeklyTrends(tasks, timeRange);
    const weeklyComparison = await this.compareWithPreviousPeriod(tasks, timeRange, 7 * 24 * 60 * 60 * 1000);
    const weeklyAnomalies = await this.detectWeeklyAnomalies(tasks, timeRange);
    const weeklyRecommendations = await this.generateWeeklyRecommendations(summary, performanceMetrics, weeklyComparison);

    return {
      reportId: '',
      reportType: ReportType.WEEKLY,
      generatedAt: new Date(),
      timeRange,
      summary,
      performanceMetrics,
      qualityMetrics,
      trends: weeklyTrends,
      anomalies: weeklyAnomalies,
      recommendations: weeklyRecommendations,
      details: {
        weeklyComparison,
      },
    };
  }

  /**
   * 生成月报告
   */
  private async generateMonthlyReport(
    timeRange: { start: Date; end: Date },
    options?: any
  ): Promise<TaskExecutionReport> {
    const tasks = await this.taskRepository.find({
      where: {
        updatedAt: Between(timeRange.start, timeRange.end),
      },
    });

    const summary = this.calculateSummary(tasks);
    const performanceMetrics = await this.calculatePerformanceMetrics(tasks, timeRange);
    const qualityMetrics = await this.calculateQualityMetrics(tasks, timeRange);

    // 月报告包含长期趋势分析和战略建议
    const monthlyTrends = await this.analyzeMonthlyTrends(tasks, timeRange);
    const strategicInsights = await this.generateStrategicInsights(tasks, timeRange);
    const capacityPlanning = await this.performCapacityPlanning(tasks, timeRange);
    const monthlyRecommendations = await this.generateStrategicRecommendations(summary, performanceMetrics, strategicInsights);

    return {
      reportId: '',
      reportType: ReportType.MONTHLY,
      generatedAt: new Date(),
      timeRange,
      summary,
      performanceMetrics,
      qualityMetrics,
      trends: monthlyTrends,
      anomalies: [], // 月报告更关注长期趋势而非短期异常
      recommendations: monthlyRecommendations,
      details: {
        strategicInsights,
        capacityPlanning,
      },
    };
  }

  /**
   * 生成任务特定报告
   */
  private async generateTaskSpecificReport(
    timeRange: { start: Date; end: Date },
    options?: any
  ): Promise<TaskExecutionReport> {
    if (!options?.taskIds || options.taskIds.length === 0) {
      throw new Error('任务特定报告需要指定taskIds');
    }

    const tasks = await this.taskRepository.find({
      where: {
        id: In(options.taskIds),
        updatedAt: Between(timeRange.start, timeRange.end),
      },
    });

    const summary = this.calculateSummary(tasks);
    const performanceMetrics = await this.calculatePerformanceMetrics(tasks, timeRange);
    const qualityMetrics = await this.calculateQualityMetrics(tasks, timeRange);

    // 任务特定分析
    const taskSpecificAnalysis = await this.performTaskSpecificAnalysis(tasks, timeRange);
    const taskComparisons = await this.compareTasks(tasks, timeRange);
    const taskOptimization = await this.generateTaskOptimizationSuggestions(tasks);

    return {
      reportId: '',
      reportType: ReportType.TASK_SPECIFIC,
      generatedAt: new Date(),
      timeRange,
      summary,
      performanceMetrics,
      qualityMetrics,
      trends: [], // 任务特定报告不包含系统级趋势
      anomalies: taskSpecificAnalysis.anomalies,
      recommendations: taskOptimization,
      details: {
        taskAnalysis: taskSpecificAnalysis,
        comparisons: taskComparisons,
      },
    };
  }

  /**
   * 生成性能报告
   */
  private async generatePerformanceReport(
    timeRange: { start: Date; end: Date },
    options?: any
  ): Promise<TaskExecutionReport> {
    const tasks = await this.taskRepository.find({
      where: {
        updatedAt: Between(timeRange.start, timeRange.end),
      },
    });

    const summary = this.calculateSummary(tasks);
    const performanceMetrics = await this.calculateDetailedPerformanceMetrics(tasks, timeRange);
    const qualityMetrics = await this.calculateQualityMetrics(tasks, timeRange);

    // 性能专项分析
    const performanceTrends = await this.analyzePerformanceTrends(tasks, timeRange);
    const bottlenecks = await this.identifyPerformanceBottlenecks(tasks, timeRange);
    const performanceOptimization = await this.generatePerformanceOptimizationRecommendations(performanceMetrics, bottlenecks);

    return {
      reportId: '',
      reportType: ReportType.PERFORMANCE,
      generatedAt: new Date(),
      timeRange,
      summary,
      performanceMetrics,
      qualityMetrics,
      trends: performanceTrends,
      anomalies: bottlenecks.map(b => ({
        type: 'performance_bottleneck',
        severity: b.severity,
        description: b.description,
        affectedTasks: b.affectedTasks,
        recommendedActions: b.recommendedActions,
      })),
      recommendations: performanceOptimization,
      details: {
        bottlenecks,
      },
    };
  }

  /**
   * 生成失败分析报告
   */
  private async generateFailureAnalysisReport(
    timeRange: { start: Date; end: Date },
    options?: any
  ): Promise<TaskExecutionReport> {
    const tasks = await this.taskRepository.find({
      where: {
        updatedAt: Between(timeRange.start, timeRange.end),
      },
    });

    const failedTasks = tasks.filter(task =>
      task.status === WeiboSearchTaskStatus.FAILED ||
      task.status === WeiboSearchTaskStatus.TIMEOUT
    );

    const summary = this.calculateSummary(tasks);
    const performanceMetrics = await this.calculatePerformanceMetrics(tasks, timeRange);
    const qualityMetrics = await this.calculateQualityMetrics(tasks, timeRange);

    // 失败分析专项
    const failurePatterns = await this.analyzeFailurePatterns(failedTasks, timeRange);
    const rootCauseAnalysis = await this.performRootCauseAnalysis(failedTasks);
    const failurePrevention = await this.generateFailurePreventionRecommendations(failurePatterns, rootCauseAnalysis);

    return {
      reportId: '',
      reportType: ReportType.FAILURE_ANALYSIS,
      generatedAt: new Date(),
      timeRange,
      summary,
      performanceMetrics,
      qualityMetrics,
      trends: [], // 失败分析关注模式而非趋势
      anomalies: failurePatterns.map(pattern => ({
        type: 'failure_pattern',
        severity: pattern.frequency > 0.1 ? 'high' : pattern.frequency > 0.05 ? 'medium' : 'low',
        description: pattern.description,
        affectedTasks: pattern.affectedTasks,
        recommendedActions: pattern.recommendedActions,
      })),
      recommendations: failurePrevention,
      details: {
        failurePatterns,
        rootCauseAnalysis,
      },
    };
  }

  /**
   * 生成资源利用报告
   */
  private async generateResourceUtilizationReport(
    timeRange: { start: Date; end: Date },
    options?: any
  ): Promise<TaskExecutionReport> {
    const tasks = await this.taskRepository.find({
      where: {
        updatedAt: Between(timeRange.start, timeRange.end),
      },
    });

    const summary = this.calculateSummary(tasks);
    const performanceMetrics = await this.calculatePerformanceMetrics(tasks, timeRange);
    const qualityMetrics = await this.calculateQualityMetrics(tasks, timeRange);

    // 资源利用分析
    const resourceUtilization = await this.analyzeResourceUtilization(tasks, timeRange);
    const resourceOptimization = await this.generateResourceOptimizationRecommendations(resourceUtilization);
    const capacityAnalysis = await this.performResourceCapacityAnalysis(resourceUtilization);

    return {
      reportId: '',
      reportType: ReportType.RESOURCE_UTILIZATION,
      generatedAt: new Date(),
      timeRange,
      summary,
      performanceMetrics,
      qualityMetrics,
      trends: resourceUtilization.trends,
      anomalies: resourceUtilization.anomalies,
      recommendations: resourceOptimization,
      details: {
        resourceUtilization,
        capacityAnalysis,
      },
    };
  }

  /**
   * 生成质量评估报告
   */
  private async generateQualityAssessmentReport(
    timeRange: { start: Date; end: Date },
    options?: any
  ): Promise<TaskExecutionReport> {
    const tasks = await this.taskRepository.find({
      where: {
        updatedAt: Between(timeRange.start, timeRange.end),
      },
    });

    const summary = this.calculateSummary(tasks);
    const performanceMetrics = await this.calculatePerformanceMetrics(tasks, timeRange);
    const qualityMetrics = await this.calculateDetailedQualityMetrics(tasks, timeRange);

    // 质量专项分析
    const qualityTrends = await this.analyzeQualityTrends(tasks, timeRange);
    const qualityIssues = await this.identifyQualityIssues(tasks, timeRange);
    const qualityImprovement = await this.generateQualityImprovementRecommendations(qualityMetrics, qualityIssues);

    return {
      reportId: '',
      reportType: ReportType.QUALITY_ASSESSMENT,
      generatedAt: new Date(),
      timeRange,
      summary,
      performanceMetrics,
      qualityMetrics,
      trends: qualityTrends,
      anomalies: qualityIssues.map(issue => ({
        type: 'quality_issue',
        severity: issue.severity,
        description: issue.description,
        affectedTasks: issue.affectedTasks,
        recommendedActions: issue.recommendedActions,
      })),
      recommendations: qualityImprovement,
      details: {
        qualityIssues,
      },
    };
  }

  /**
   * 计算任务统计摘要
   */
  private calculateSummary(tasks: WeiboSearchTaskEntity[]) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === WeiboSearchTaskStatus.PENDING && t.retryCount === 0).length;
    const failedTasks = tasks.filter(t => t.status === WeiboSearchTaskStatus.FAILED).length;
    const runningTasks = tasks.filter(t => t.status === WeiboSearchTaskStatus.RUNNING).length;
    const pendingTasks = tasks.filter(t => t.status === WeiboSearchTaskStatus.PENDING).length;

    const overallSuccessRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      runningTasks,
      pendingTasks,
      overallSuccessRate,
      averageExecutionTime: 0, // 需要从性能数据中计算
      totalDataVolume: 0, // 需要从数据统计中获取
    };
  }

  /**
   * 计算性能指标
   */
  private async calculatePerformanceMetrics(
    tasks: WeiboSearchTaskEntity[],
    timeRange: { start: Date; end: Date }
  ) {
    // 这里应该从性能收集器服务获取实际的性能数据
    // 为了简化，返回模拟数据
    return {
      throughput: 0,
      latency: {
        p50: 0,
        p95: 0,
        p99: 0,
      },
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        network: 0,
        disk: 0,
      },
      errorRate: 0,
      retryRate: 0,
    };
  }

  /**
   * 计算质量指标
   */
  private async calculateQualityMetrics(
    tasks: WeiboSearchTaskEntity[],
    timeRange: { start: Date; end: Date }
  ) {
    return {
      dataQuality: 0,
      systemReliability: 0,
      taskAccuracy: 0,
      consistencyScore: 0,
      completenessScore: 0,
    };
  }

  /**
   * 分析趋势
   */
  private async analyzeTrends(
    tasks: WeiboSearchTaskEntity[],
    timeRange: { start: Date; end: Date }
  ) {
    return [];
  }

  /**
   * 检测异常
   */
  private async detectAnomalies(
    tasks: WeiboSearchTaskEntity[],
    timeRange: { start: Date; end: Date }
  ) {
    return [];
  }

  /**
   * 生成改进建议
   */
  private async generateRecommendations(
    summary: any,
    performanceMetrics: any,
    qualityMetrics: any
  ) {
    return [];
  }

  // 辅助方法（简化实现）

  private generateReportId(reportType: ReportType): string {
    return `${reportType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveReport(report: TaskExecutionReport): Promise<void> {
    const reportKey = `${this.REPORTS_KEY_PREFIX}${report.reportId}`;
    await this.redisService.setex(
      reportKey,
      30 * 24 * 60 * 60, // 30天过期
      JSON.stringify(report)
    );
  }

  private async analyzeWeeklyTrends(tasks: WeiboSearchTaskEntity[], timeRange: any) { return []; }
  private async compareWithPreviousPeriod(tasks: WeiboSearchTaskEntity[], timeRange: any, periodMs: number) { return {}; }
  private async detectWeeklyAnomalies(tasks: WeiboSearchTaskEntity[], timeRange: any) { return []; }
  private async generateWeeklyRecommendations(summary: any, performance: any, comparison: any) { return []; }
  private async analyzeMonthlyTrends(tasks: WeiboSearchTaskEntity[], timeRange: any) { return []; }
  private async generateStrategicInsights(tasks: WeiboSearchTaskEntity[], timeRange: any) { return {}; }
  private async performCapacityPlanning(tasks: WeiboSearchTaskEntity[], timeRange: any) { return {}; }
  private async generateStrategicRecommendations(summary: any, performance: any, insights: any) { return []; }
  private async performTaskSpecificAnalysis(tasks: WeiboSearchTaskEntity[], timeRange: any) { return { anomalies: [] }; }
  private async compareTasks(tasks: WeiboSearchTaskEntity[], timeRange: any) { return {}; }
  private async generateTaskOptimizationSuggestions(tasks: WeiboSearchTaskEntity[]) { return []; }
  private async calculateDetailedPerformanceMetrics(tasks: WeiboSearchTaskEntity[], timeRange: any) { return this.calculatePerformanceMetrics(tasks, timeRange); }
  private async analyzePerformanceTrends(tasks: WeiboSearchTaskEntity[], timeRange: any) { return []; }
  private async identifyPerformanceBottlenecks(tasks: WeiboSearchTaskEntity[], timeRange: any) { return []; }
  private async generatePerformanceOptimizationRecommendations(performance: any, bottlenecks: any) { return []; }
  private async analyzeFailurePatterns(tasks: WeiboSearchTaskEntity[], timeRange: any) { return []; }
  private async performRootCauseAnalysis(tasks: WeiboSearchTaskEntity[]) { return {}; }
  private async generateFailurePreventionRecommendations(patterns: any, rootCause: any) { return []; }
  private async analyzeResourceUtilization(tasks: WeiboSearchTaskEntity[], timeRange: any) { return { trends: [], anomalies: [] }; }
  private async generateResourceOptimizationRecommendations(utilization: any) { return []; }
  private async performResourceCapacityAnalysis(utilization: any) { return {}; }
  private async calculateDetailedQualityMetrics(tasks: WeiboSearchTaskEntity[], timeRange: any) { return this.calculateQualityMetrics(tasks, timeRange); }
  private async analyzeQualityTrends(tasks: WeiboSearchTaskEntity[], timeRange: any) { return []; }
  private async identifyQualityIssues(tasks: WeiboSearchTaskEntity[], timeRange: any) { return []; }
  private async generateQualityImprovementRecommendations(quality: any, issues: any) { return []; }

  /**
   * 获取报告
   */
  async getReport(reportId: string): Promise<TaskExecutionReport | null> {
    const reportKey = `${this.REPORTS_KEY_PREFIX}${reportId}`;
    const reportData = await this.redisService.get(reportKey);
    return reportData ? JSON.parse(reportData) : null;
  }

  /**
   * 列出报告
   */
  async listReports(
    reportType?: ReportType,
    limit: number = 50
  ): Promise<Array<{ reportId: string; reportType: ReportType; generatedAt: Date }>> {
    const pattern = reportType
      ? `${this.REPORTS_KEY_PREFIX}${reportType}_*`
      : `${this.REPORTS_KEY_PREFIX}*`;

    const keys = await this.redisService.keys(pattern);
    const reports = [];

    for (const key of keys.slice(0, limit)) {
      const reportData = await this.redisService.get(key);
      if (reportData) {
        const report = JSON.parse(reportData);
        reports.push({
          reportId: report.reportId,
          reportType: report.reportType,
          generatedAt: new Date(report.generatedAt),
        });
      }
    }

    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  /**
   * 删除报告
   */
  async deleteReport(reportId: string): Promise<boolean> {
    const reportKey = `${this.REPORTS_KEY_PREFIX}${reportId}`;
    const result = await this.redisService.del(reportKey);
    return result > 0;
  }
}
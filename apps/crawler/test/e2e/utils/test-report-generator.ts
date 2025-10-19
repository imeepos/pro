import * as fs from 'fs';
import * as path from 'path';
import { TestStateManager, TestUtils } from '../setup';

/**
 * 测试报告生成器 - 数字时代的测试结果艺术品
 * 生成详细、美观、全面的测试报告，展现测试的优雅和价值
 */

export interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: string;
  details?: any;
  metrics?: {
    requests?: number;
   成功率?: number;
    performance?: any;
    memory?: number;
    cpu?: number;
  };
}

export interface TestSuiteReport {
  suiteName: string;
  sessionId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  environment: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
    successRate: number;
  };
  testResults: TestResult[];
  performanceMetrics: {
    averageTestDuration: number;
    slowestTest: { name: string; duration: number };
    fastestTest: { name: string; duration: number };
    totalMemoryUsed: number;
    peakMemoryUsage: number;
  };
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    affectedTests: string[];
  }>;
  recommendations: string[];
}

export class TestReportGenerator {
  private readonly reportDir: string;
  private readonly templatesDir: string;

  constructor(reportDir: string = './test/reports') {
    this.reportDir = reportDir;
    this.templatesDir = path.join(__dirname, 'templates');
    this.ensureDirectories();
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  /**
   * 生成完整测试套件报告
   */
  async generateSuiteReport(
    suiteName: string,
    sessionId: string,
    testResults: TestResult[]
  ): Promise<TestSuiteReport> {
    const stateManager = TestStateManager.getInstance();
    const session = stateManager.getTestSession(sessionId);

    if (!session) {
      throw new Error(`Test session not found: ${sessionId}`);
    }

    const startTime = new Date(session.startTime);
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // 计算汇总统计
    const summary = this.calculateSummary(testResults);

    // 计算性能指标
    const performanceMetrics = this.calculatePerformanceMetrics(testResults);

    // 分析问题
    const issues = this.analyzeIssues(testResults);

    // 生成建议
    const recommendations = this.generateRecommendations(summary, issues, performanceMetrics);

    const report: TestSuiteReport = {
      suiteName,
      sessionId,
      startTime,
      endTime,
      duration,
      environment: 'test',
      summary,
      testResults,
      performanceMetrics,
      issues,
      recommendations
    };

    // 保存报告
    await this.saveReport(report);

    return report;
  }

  /**
   * 计算测试汇总统计
   */
  private calculateSummary(testResults: TestResult[]) {
    const summary = {
      total: testResults.length,
      passed: testResults.filter(r => r.status === 'passed').length,
      failed: testResults.filter(r => r.status === 'failed').length,
      skipped: testResults.filter(r => r.status === 'skipped').length,
      pending: testResults.filter(r => r.status === 'pending').length,
      successRate: 0
    };

    summary.successRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;

    return summary;
  }

  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(testResults: TestResult[]) {
    const durations = testResults.map(r => r.duration).filter(d => d > 0);

    if (durations.length === 0) {
      return {
        averageTestDuration: 0,
        slowestTest: { name: 'N/A', duration: 0 },
        fastestTest: { name: 'N/A', duration: 0 },
        totalMemoryUsed: 0,
        peakMemoryUsage: 0
      };
    }

    const averageTestDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    const slowestTest = testResults.reduce((slowest, current) =>
      current.duration > slowest.duration ? current : slowest
    , testResults[0]);

    const fastestTest = testResults.reduce((fastest, current) =>
      current.duration < fastest.duration ? current : fastest
    , testResults[0]);

    // 计算内存使用统计
    const memoryUsages = testResults
      .map(r => r.metrics?.memory)
      .filter(m => m !== undefined && m > 0) as number[];

    const totalMemoryUsed = memoryUsages.reduce((sum, m) => sum + m, 0);
    const peakMemoryUsage = memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0;

    return {
      averageTestDuration: Math.round(averageTestDuration),
      slowestTest: { name: slowestTest.testName, duration: slowestTest.duration },
      fastestTest: { name: fastestTest.testName, duration: fastestTest.duration },
      totalMemoryUsed: Math.round(totalMemoryUsed),
      peakMemoryUsage: Math.round(peakMemoryUsage)
    };
  }

  /**
   * 分析测试问题
   */
  private analyzeIssues(testResults: TestResult[]) {
    const issues: any[] = [];

    // 分析失败的测试
    const failedTests = testResults.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      issues.push({
        severity: failedTests.length > testResults.length * 0.2 ? 'high' : 'medium',
        type: 'test_failures',
        description: `${failedTests.length} 个测试失败`,
        affectedTests: failedTests.map(t => t.testName)
      });
    }

    // 分析性能问题
    const slowTests = testResults.filter(r => r.duration > 30000); // 超过30秒
    if (slowTests.length > 0) {
      issues.push({
        severity: 'medium',
        type: 'performance_issues',
        description: `${slowTests.length} 个测试执行时间过长`,
        affectedTests: slowTests.map(t => t.testName)
      });
    }

    // 分析内存问题
    const highMemoryTests = testResults.filter(r => r.metrics?.memory && r.metrics.memory > 200);
    if (highMemoryTests.length > 0) {
      issues.push({
        severity: 'medium',
        type: 'memory_issues',
        description: `${highMemoryTests.length} 个测试内存使用过高`,
        affectedTests: highMemoryTests.map(t => t.testName)
      });
    }

    // 分析错误模式
    const errorPatterns = this.analyzeErrorPatterns(failedTests);
    issues.push(...errorPatterns);

    return issues;
  }

  /**
   * 分析错误模式
   */
  private analyzeErrorPatterns(failedTests: TestResult[]) {
    const patterns: any[] = [];
    const errorGroups = new Map<string, string[]>();

    failedTests.forEach(test => {
      if (test.error) {
        const errorType = this.classifyError(test.error);
        if (!errorGroups.has(errorType)) {
          errorGroups.set(errorType, []);
        }
        errorGroups.get(errorType)!.push(test.testName);
      }
    });

    errorGroups.forEach((tests, errorType) => {
      patterns.push({
        severity: tests.length > 3 ? 'high' : 'medium',
        type: 'error_pattern',
        description: `${tests.length} 个测试出现相同错误类型: ${errorType}`,
        affectedTests: tests
      });
    });

    return patterns;
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('timeout') || errorLower.includes('超时')) {
      return 'timeout_error';
    }

    if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('网络')) {
      return 'network_error';
    }

    if (errorLower.includes('assertion') || errorLower.includes('断言')) {
      return 'assertion_error';
    }

    if (errorLower.includes('memory') || errorLower.includes('内存')) {
      return 'memory_error';
    }

    if (errorLower.includes('account') || errorLower.includes('账号')) {
      return 'account_error';
    }

    return 'unknown_error';
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(summary: any, issues: any[], performance: any): string[] {
    const recommendations: string[] = [];

    // 基于成功率的建议
    if (summary.successRate < 80) {
      recommendations.push('测试成功率较低，建议检查测试环境和配置');
    }

    if (summary.successRate < 60) {
      recommendations.push('测试成功率过低，建议优先修复失败的测试用例');
    }

    // 基于性能的建议
    if (performance.averageTestDuration > 20000) {
      recommendations.push('平均测试执行时间过长，建议优化测试用例或增加并行度');
    }

    if (performance.peakMemoryUsage > 300) {
      recommendations.push('测试内存使用峰值过高，建议检查内存泄漏问题');
    }

    // 基于问题的建议
    issues.forEach(issue => {
      switch (issue.type) {
        case 'test_failures':
          recommendations.push('检查失败的测试用例，修复相关功能或更新测试预期');
          break;
        case 'performance_issues':
          recommendations.push('优化性能较差的测试用例，考虑异步处理或减少等待时间');
          break;
        case 'memory_issues':
          recommendations.push('检查内存使用过高的测试，确保资源正确释放');
          break;
        case 'error_pattern':
          recommendations.push(`关注 ${issue.description}，可能存在系统性问题`);
          break;
      }
    });

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push('测试表现良好，继续保持代码质量');
    }

    recommendations.push('定期运行测试套件以保持代码质量');
    recommendations.push('考虑将测试集成到CI/CD流水线中');

    return recommendations;
  }

  /**
   * 保存报告到文件
   */
  private async saveReport(report: TestSuiteReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFileName = `${report.suiteName}_${timestamp}.json`;
    const htmlFileName = `${report.suiteName}_${timestamp}.html`;

    // 保存JSON报告
    const jsonPath = path.join(this.reportDir, jsonFileName);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

    // 生成并保存HTML报告
    const htmlContent = this.generateHtmlReport(report);
    const htmlPath = path.join(this.reportDir, htmlFileName);
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

    console.log(`📊 测试报告已生成:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  /**
   * 生成HTML报告
   */
  private generateHtmlReport(report: TestSuiteReport): string {
    const { suiteName, summary, performanceMetrics, issues, recommendations, testResults } = report;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${suiteName} - 测试报告</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .content {
            padding: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .summary-card .value {
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
            margin: 0;
        }
        .summary-card.success { border-left-color: #28a745; }
        .summary-card.warning { border-left-color: #ffc107; }
        .summary-card.danger { border-left-color: #dc3545; }
        .summary-card.info { border-left-color: #17a2b8; }

        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }

        .test-results {
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-skipped { color: #ffc107; font-weight: bold; }
        .status-pending { color: #17a2b8; font-weight: bold; }

        .issues {
            margin-top: 20px;
        }
        .issue {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 10px;
        }
        .issue.high { background: #f8d7da; border-color: #f5c6cb; }
        .issue.critical { background: #f8d7da; border-color: #dc3545; }
        .issue.medium { background: #fff3cd; border-color: #ffeaa7; }
        .issue.low { background: #d1ecf1; border-color: #bee5eb; }

        .recommendations {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
            padding: 20px;
        }
        .recommendations ul {
            margin: 0;
            padding-left: 20px;
        }
        .recommendations li {
            margin-bottom: 8px;
        }

        .performance-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .perf-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #17a2b8;
        }
        .perf-card h4 {
            margin: 0 0 10px 0;
            color: #495057;
        }
        .perf-card .value {
            font-size: 1.8em;
            font-weight: bold;
            color: #17a2b8;
        }

        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${suiteName}</h1>
            <p>测试执行报告 - ${report.startTime.toLocaleString('zh-CN')}</p>
        </div>

        <div class="content">
            <div class="summary">
                <div class="summary-card">
                    <h3>总测试数</h3>
                    <p class="value">${summary.total}</p>
                </div>
                <div class="summary-card success">
                    <h3>通过</h3>
                    <p class="value">${summary.passed}</p>
                </div>
                <div class="summary-card danger">
                    <h3>失败</h3>
                    <p class="value">${summary.failed}</p>
                </div>
                <div class="summary-card warning">
                    <h3>跳过</h3>
                    <p class="value">${summary.skipped}</p>
                </div>
                <div class="summary-card info">
                    <h3>成功率</h3>
                    <p class="value">${summary.successRate}%</p>
                </div>
                <div class="summary-card">
                    <h3>执行时间</h3>
                    <p class="value">${Math.round(report.duration / 1000)}s</p>
                </div>
            </div>

            <div class="section">
                <h2>性能指标</h2>
                <div class="performance-grid">
                    <div class="perf-card">
                        <h4>平均测试时间</h4>
                        <div class="value">${performanceMetrics.averageTestDuration}ms</div>
                    </div>
                    <div class="perf-card">
                        <h4>最慢测试</h4>
                        <div class="value">${performanceMetrics.slowestTest.name}</div>
                        <small>${performanceMetrics.slowestTest.duration}ms</small>
                    </div>
                    <div class="perf-card">
                        <h4>最快测试</h4>
                        <div class="value">${performanceMetrics.fastestTest.name}</div>
                        <small>${performanceMetrics.fastestTest.duration}ms</small>
                    </div>
                    <div class="perf-card">
                        <h4>峰值内存使用</h4>
                        <div class="value">${performanceMetrics.peakMemoryUsage}MB</div>
                    </div>
                </div>
            </div>

            ${issues.length > 0 ? `
            <div class="section">
                <h2>发现的问题</h2>
                <div class="issues">
                    ${issues.map(issue => `
                        <div class="issue ${issue.severity}">
                            <strong>${issue.type}</strong> - ${issue.description}
                            <br><small>影响测试: ${issue.affectedTests.join(', ')}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h2>改进建议</h2>
                <div class="recommendations">
                    <ul>
                        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <div class="section">
                <h2>详细测试结果</h2>
                <div class="test-results">
                    <table>
                        <thead>
                            <tr>
                                <th>测试名称</th>
                                <th>状态</th>
                                <th>执行时间</th>
                                <th>内存使用</th>
                                <th>错误信息</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testResults.map(test => `
                                <tr>
                                    <td>${test.testName}</td>
                                    <td class="status-${test.status}">${test.status}</td>
                                    <td>${test.duration}ms</td>
                                    <td>${test.metrics?.memory || 'N/A'}MB</td>
                                    <td>${test.error || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>报告生成时间: ${new Date().toLocaleString('zh-CN')} | 会话ID: ${report.sessionId}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 生成执行摘要
   */
  generateExecutiveSummary(report: TestSuiteReport): string {
    const { suiteName, summary, performanceMetrics, issues } = report;

    let summaryText = `
# ${suiteName} - 测试执行摘要

## 总体概况
- **执行时间**: ${Math.round(report.duration / 1000)}秒
- **总测试数**: ${summary.total}
- **通过率**: ${summary.successRate}%
- **成功率评级**: ${this.getSuccessRateGrade(summary.successRate)}

## 性能表现
- **平均测试时间**: ${performanceMetrics.averageTestDuration}ms
- **峰值内存使用**: ${performanceMetrics.peakMemoryUsage}MB
- **性能评级**: ${this.getPerformanceGrade(performanceMetrics.averageTestDuration)}

## 发现的问题
`;

    if (issues.length === 0) {
      summaryText += '- ✅ 未发现严重问题\n';
    } else {
      issues.forEach(issue => {
        summaryText += `- ${issue.severity.toUpperCase()}: ${issue.description}\n`;
      });
    }

    summaryText += `
## 建议优先级
1. ${report.recommendations[0] || '继续监控测试表现'}
2. ${report.recommendations[1] || '保持当前的测试质量'}
3. ${report.recommendations[2] || '定期执行回归测试'}

---
*报告生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

    return summaryText;
  }

  /**
   * 获取成功率等级
   */
  private getSuccessRateGrade(successRate: number): string {
    if (successRate >= 95) return '优秀 (A)';
    if (successRate >= 85) return '良好 (B)';
    if (successRate >= 70) return '及格 (C)';
    if (successRate >= 50) return '需要改进 (D)';
    return '不合格 (F)';
  }

  /**
   * 获取性能等级
   */
  private getPerformanceGrade(averageDuration: number): string {
    if (averageDuration < 5000) return '优秀 (A)';
    if (averageDuration < 10000) return '良好 (B)';
    if (averageDuration < 20000) return '及格 (C)';
    if (averageDuration < 30000) return '需要改进 (D)';
    return '不合格 (F)';
  }

  /**
   * 生成趋势分析报告
   */
  generateTrendAnalysis(historicalReports: TestSuiteReport[]): string {
    if (historicalReports.length < 2) {
      return '需要至少2个测试报告才能进行趋势分析。';
    }

    const latest = historicalReports[historicalReports.length - 1];
    const previous = historicalReports[historicalReports.length - 2];

    const successRateChange = latest.summary.successRate - previous.summary.successRate;
    const durationChange = latest.duration - previous.duration;
    const performanceChange = latest.performanceMetrics.averageTestDuration - previous.performanceMetrics.averageTestDuration;

    let trend = '# 测试趋势分析\n\n';

    trend += `## 成功率趋势\n`;
    trend += `- 当前: ${latest.summary.successRate}%\n`;
    trend += `- 上次: ${previous.summary.successRate}%\n`;
    trend += `- 变化: ${successRateChange > 0 ? '+' : ''}${successRateChange.toFixed(1)}%\n`;
    trend += `- 趋势: ${successRateChange > 0 ? '📈 上升' : successRateChange < 0 ? '📉 下降' : '➡️ 稳定'}\n\n`;

    trend += `## 执行时间趋势\n`;
    trend += `- 当前: ${Math.round(latest.duration / 1000)}秒\n`;
    trend += `- 上次: ${Math.round(previous.duration / 1000)}秒\n`;
    trend += `- 变化: ${durationChange > 0 ? '+' : ''}${Math.round(durationChange / 1000)}秒\n`;
    trend += `- 趋势: ${durationChange > 0 ? '📈 增长' : durationChange < 0 ? '📉 改善' : '➡️ 稳定'}\n\n`;

    trend += `## 性能趋势\n`;
    trend += `- 当前平均: ${latest.performanceMetrics.averageTestDuration}ms\n`;
    trend += `- 上次平均: ${previous.performanceMetrics.averageTestDuration}ms\n`;
    trend += `- 变化: ${performanceChange > 0 ? '+' : ''}${performanceChange.toFixed(0)}ms\n`;
    trend += `- 趋势: ${performanceChange > 0 ? '📈 变慢' : performanceChange < 0 ? '📉 提升' : '➡️ 稳定'}\n\n`;

    // 总体评估
    trend += `## 总体评估\n`;
    if (successRateChange >= 0 && durationChange <= 0 && performanceChange <= 0) {
      trend += `✅ **积极趋势**: 成功率提升，执行时间改善，性能提升\n`;
    } else if (successRateChange < 0 || durationChange > 0 || performanceChange > 0) {
      trend += `⚠️ **需要关注**: 发现性能或成功率下降趋势\n`;
    } else {
      trend += `➡️ **稳定**: 各项指标保持稳定\n`;
    }

    return trend;
  }
}
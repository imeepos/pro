/**
 * 端到端测试统一入口
 * 数字时代业务流程的集成验证入口
 */

// 导出测试基类
export { E2EBusinessFlowTestBase } from './e2e-business-flow-test-base.js';

// 导出各个测试套件
export { HistoricalDataBackfillE2ETest } from './historical-data-backfill.test.js';
export { RealTimeDataMonitoringE2ETest } from './real-time-data-monitoring.test.js';
export { MultiAccountConcurrentCrawlingE2ETest } from './multi-account-concurrent-crawling.test.js';
export { ExceptionRecoveryE2ETest } from './exception-recovery.test.js';
export { DataQualityAssuranceE2ETest } from './data-quality-assurance.test.js';

// 导出配置
export {
  E2ETestConfig,
  TestSuiteConfigs,
  getTestSuiteConfig,
  getEnvironmentConfig,
  getPerformanceConfig,
  getQualityConfig,
  getMonitoringConfig,
  getReportingConfig,
  validateConfig,
  adaptConfigForEnvironment,
} from './config/e2e-test.config.js';

// 导出类型定义
export type {
  E2ETestValidationResult,
  BusinessDataSnapshot,
  SystemMetrics,
  FlowEvent,
} from './e2e-business-flow-test-base.js';

/**
 * 端到端测试套件注册表
 */
export const E2ETestSuites = {
  HistoricalDataBackfill: {
    class: 'HistoricalDataBackfillE2ETest',
    name: '历史数据回溯端到端测试',
    file: './historical-data-backfill.test.js',
    description: '验证从任务创建到数据入库的完整历史数据处理链路',
  },
  RealTimeDataMonitoring: {
    class: 'RealTimeDataMonitoringE2ETest',
    name: '实时数据监控端到端测试',
    file: './real-time-data-monitoring.test.js',
    description: '验证增量数据监控的完整流程，确保数据时效性',
  },
  MultiAccountConcurrentCrawling: {
    class: 'MultiAccountConcurrentCrawlingE2ETest',
    name: '多账号并发爬取端到端测试',
    file: './multi-account-concurrent-crawling.test.js',
    description: '验证多账号同时工作的完整流程，确保账号池管理和任务分配',
  },
  ExceptionRecovery: {
    class: 'ExceptionRecoveryE2ETest',
    name: '异常恢复端到端测试',
    file: './exception-recovery.test.js',
    description: '验证各种异常情况下的完整恢复流程，确保系统韧性和故障恢复能力',
  },
  DataQualityAssurance: {
    class: 'DataQualityAssuranceE2ETest',
    name: '数据质量保证端到端测试',
    file: './data-quality-assurance.test.js',
    description: '验证从爬取到最终数据质量的完整验证流程，确保数据在各阶段的准确性',
  },
} as const;

/**
 * 获取所有可用的测试套件名称
 */
export function getAvailableTestSuites(): string[] {
  return Object.keys(E2ETestSuites);
}

/**
 * 获取测试套件信息
 */
export function getTestSuiteInfo(suiteName: keyof typeof E2ETestSuites) {
  return E2ETestSuites[suiteName];
}

/**
 * 验证测试套件是否存在
 */
export function isValidTestSuite(suiteName: string): suiteName is keyof typeof E2ETestSuites {
  return suiteName in E2ETestSuites;
}

/**
 * 端到端测试元数据
 */
export const E2ETestMetadata = {
  version: '1.0.0',
  description: '微博爬虫系统端到端测试套件',
  author: 'Claude Code Artisan',
  created: '2024-01-20',
  lastUpdated: '2024-01-20',
  totalSuites: Object.keys(E2ETestSuites).length,
  supportedEnvironments: ['development', 'staging', 'ci'],
  requiredServices: [
    'PostgreSQL',
    'Redis',
    'RabbitMQ',
    'MongoDB',
    'MinIO',
    'Elasticsearch',
  ],
  minimumRequirements: {
    node: '>=18.0.0',
    docker: '>=20.0.0',
    memory: '4GB',
    disk: '10GB',
  },
};
/**
 * 端到端测试配置文件
 * 数字时代测试的精密仪器 - 确保每个测试都精确可靠
 */

import { TestEnvironmentConfig } from '../types/test-types.js';

/**
 * 端到端测试配置
 */
export const E2ETestConfig: {
  // 环境配置
  environment: TestEnvironmentConfig;

  // 测试配置
  test: {
    timeout: number;
    retries: number;
    parallel: number;
    slowThreshold: number;
  };

  // 数据配置
  data: {
    scale: {
      small: number;
      medium: number;
      large: number;
    };
    retention: {
      logs: number; // 天数
      reports: number; // 天数
      coverage: number; // 天数
    };
  };

  // 性能基准
  performance: {
    maxResponseTime: number; // 毫秒
    maxMemoryUsage: number; // MB
    maxCPUUsage: number; // 百分比
    minThroughput: number; // 记录/秒
  };

  // 质量标准
  quality: {
    minAccuracy: number; // 百分比
    minCompleteness: number; // 百分比
    minConsistency: number; // 百分比
    maxAnomalyRate: number; // 百分比
  };

  // 故障注入配置
  faultInjection: {
    enabled: boolean;
    networkFailure: {
      probability: number;
      duration: number; // 毫秒
    };
    accountBan: {
      probability: number;
      recoveryTime: number; // 毫秒
    };
    databaseFailure: {
      probability: number;
      recoveryTime: number; // 毫秒
    };
  };

  // 监控配置
  monitoring: {
    enabled: boolean;
    metrics: {
      collection: boolean;
      reporting: boolean;
      alerting: boolean;
    };
    thresholds: {
      errorRate: number; // 百分比
      latency: number; // 毫秒
      memoryUsage: number; // 百分比
    };
  };

  // 报告配置
  reporting: {
    enabled: boolean;
    formats: ['json', 'html', 'markdown'];
    coverage: {
      enabled: boolean;
      threshold: number; // 百分比
    };
    artifacts: {
      logs: boolean;
      screenshots: boolean;
      networkLogs: boolean;
    };
  };
} = {
  // 环境配置
  environment: {
    docker: {
      enabled: true,
      composeFile: 'docker-compose.e2e.yml',
      services: ['postgres', 'redis', 'rabbitmq', 'mongodb', 'minio', 'elasticsearch'],
    },
    database: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5433'),
      username: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_NAME || 'weibo_crawler_e2e',
      timeout: 60000,
    },
    redis: {
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: parseInt(process.env.TEST_REDIS_PORT || '6380'),
      db: parseInt(process.env.TEST_REDIS_DB || '1'),
    },
    rabbitmq: {
      url: process.env.TEST_RABBITMQ_URL || 'amqp://test:test@localhost:5673/',
      exchanges: ['weibo.crawl', 'weibo.clean', 'weibo.analyze', 'weibo.monitor'],
      queues: [
        'crawl.tasks', 'clean.tasks', 'analyze.tasks',
        'crawl.status', 'clean.status', 'analyze.status',
        'monitor.alerts', 'monitor.metrics'
      ],
    },
    mongodb: {
      uri: process.env.TEST_MONGODB_URI || 'mongodb://test:test@localhost:27018',
      database: process.env.TEST_MONGODB_NAME || 'weibo_raw_e2e',
    },
    minio: {
      endpoint: process.env.TEST_MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.TEST_MINIO_PORT || '9001'),
      accessKey: process.env.TEST_MINIO_ACCESS_KEY || 'test',
      secretKey: process.env.TEST_MINIO_SECRET_KEY || 'testtest',
      useSSL: false,
    },
  },

  // 测试配置
  test: {
    timeout: parseInt(process.env.TEST_TIMEOUT || '600000'), // 10分钟
    retries: parseInt(process.env.TEST_RETRIES || '2'),
    parallel: parseInt(process.env.TEST_PARALLEL || '4'),
    slowThreshold: 30000, // 30秒
  },

  // 数据配置
  data: {
    scale: {
      small: 100,      // 小规模测试数据量
      medium: 1000,    // 中规模测试数据量
      large: 10000,    // 大规模测试数据量
    },
    retention: {
      logs: 7,      // 保留7天的日志
      reports: 30,  // 保留30天的报告
      coverage: 14, // 保留14天的覆盖率数据
    },
  },

  // 性能基准
  performance: {
    maxResponseTime: 30000,    // 最大响应时间30秒
    maxMemoryUsage: 2048,      // 最大内存使用2GB
    maxCPUUsage: 80,           // 最大CPU使用率80%
    minThroughput: 10,         // 最小吞吐量10记录/秒
  },

  // 质量标准
  quality: {
    minAccuracy: 95,        // 最小准确率95%
    minCompleteness: 90,    // 最小完整性90%
    minConsistency: 95,     // 最小一致性95%
    maxAnomalyRate: 5,      // 最大异常率5%
  },

  // 故障注入配置
  faultInjection: {
    enabled: process.env.FAULT_INJECTION_ENABLED === 'true',
    networkFailure: {
      probability: 0.05,    // 5%的网络故障概率
      duration: 30000,      // 故障持续30秒
    },
    accountBan: {
      probability: 0.02,    // 2%的账号封禁概率
      recoveryTime: 60000,  // 恢复时间60秒
    },
    databaseFailure: {
      probability: 0.01,    // 1%的数据库故障概率
      recoveryTime: 30000,  // 恢复时间30秒
    },
  },

  // 监控配置
  monitoring: {
    enabled: true,
    metrics: {
      collection: true,
      reporting: true,
      alerting: true,
    },
    thresholds: {
      errorRate: 5,        // 错误率阈值5%
      latency: 10000,      // 延迟阈值10秒
      memoryUsage: 80,     // 内存使用阈值80%
    },
  },

  // 报告配置
  reporting: {
    enabled: true,
    formats: ['json', 'html', 'markdown'],
    coverage: {
      enabled: process.env.COVERAGE_ENABLED === 'true',
      threshold: 80,       // 覆盖率阈值80%
    },
    artifacts: {
      logs: true,
      screenshots: false,  // 端到端测试通常不需要截图
      networkLogs: true,
    },
  },
};

/**
 * 测试套件特定配置
 */
export const TestSuiteConfigs = {
  historicalDataBackfill: {
    name: '历史数据回溯端到端测试',
    description: '验证从任务创建到数据入库的完整历史数据处理链路',
    timeout: 600000,       // 10分钟
    dataScale: 'large' as const,
    parallelism: 2,        // 历史数据测试使用较少并行
    requirements: {
      database: true,
      redis: true,
      rabbitmq: true,
      mongodb: true,
      minio: true,
    },
  },

  realTimeDataMonitoring: {
    name: '实时数据监控端到端测试',
    description: '验证增量数据监控的完整流程，确保数据时效性',
    timeout: 300000,       // 5分钟
    dataScale: 'medium' as const,
    parallelism: 4,
    requirements: {
      database: true,
      redis: true,
      rabbitmq: true,
      mongodb: true,
    },
  },

  multiAccountConcurrentCrawling: {
    name: '多账号并发爬取端到端测试',
    description: '验证多账号同时工作的完整流程，确保账号池管理和任务分配',
    timeout: 480000,       // 8分钟
    dataScale: 'medium' as const,
    parallelism: 6,        // 并发测试需要更多并行
    requirements: {
      database: true,
      redis: true,
      rabbitmq: true,
      mongodb: true,
    },
  },

  exceptionRecovery: {
    name: '异常恢复端到端测试',
    description: '验证各种异常情况下的完整恢复流程，确保系统韧性',
    timeout: 720000,       // 12分钟
    dataScale: 'small' as const,
    parallelism: 2,
    requirements: {
      database: true,
      redis: true,
      rabbitmq: true,
      mongodb: true,
    },
    faultInjection: true,  // 异常恢复测试需要故障注入
  },

  dataQualityAssurance: {
    name: '数据质量保证端到端测试',
    description: '验证从爬取到最终数据质量的完整验证流程',
    timeout: 360000,       // 6分钟
    dataScale: 'medium' as const,
    parallelism: 4,
    requirements: {
      database: true,
      redis: true,
      rabbitmq: true,
      mongodb: true,
      elasticsearch: true,
    },
  },
};

/**
 * 获取测试套件配置
 */
export function getTestSuiteConfig(suiteName: keyof typeof TestSuiteConfigs) {
  return TestSuiteConfigs[suiteName];
}

/**
 * 获取环境变量配置
 */
export function getEnvironmentConfig(): TestEnvironmentConfig {
  return E2ETestConfig.environment;
}

/**
 * 获取性能基准配置
 */
export function getPerformanceConfig() {
  return E2ETestConfig.performance;
}

/**
 * 获取质量标准配置
 */
export function getQualityConfig() {
  return E2ETestConfig.quality;
}

/**
 * 获取监控配置
 */
export function getMonitoringConfig() {
  return E2ETestConfig.monitoring;
}

/**
 * 获取报告配置
 */
export function getReportingConfig() {
  return E2ETestConfig.reporting;
}

/**
 * 验证配置完整性
 */
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证必需的环境变量
  const requiredEnvVars = [
    'TEST_DB_HOST',
    'TEST_DB_PORT',
    'TEST_DB_USER',
    'TEST_DB_PASSWORD',
    'TEST_DB_NAME',
    'TEST_REDIS_HOST',
    'TEST_REDIS_PORT',
    'TEST_RABBITMQ_URL',
    'TEST_MONGODB_URI',
    'TEST_MINIO_ENDPOINT',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`缺少必需的环境变量: ${envVar}`);
    }
  }

  // 验证配置值的有效性
  if (E2ETestConfig.test.timeout <= 0) {
    errors.push('测试超时时间必须大于0');
  }

  if (E2ETestConfig.test.parallel <= 0) {
    errors.push('并行度必须大于0');
  }

  if (E2ETestConfig.performance.maxResponseTime <= 0) {
    errors.push('最大响应时间必须大于0');
  }

  if (E2ETestConfig.quality.minAccuracy < 0 || E2ETestConfig.quality.minAccuracy > 100) {
    errors.push('最小准确率必须在0-100之间');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 根据环境动态调整配置
 */
export function adaptConfigForEnvironment(): void {
  const isCI = process.env.CI === 'true';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isCI) {
    // CI环境配置调整
    E2ETestConfig.test.parallel = Math.min(E2ETestConfig.test.parallel, 2);
    E2ETestConfig.test.timeout = Math.max(E2ETestConfig.test.timeout, 900000); // 至少15分钟
    E2ETestConfig.reporting.coverage.enabled = true;
  } else if (isDevelopment) {
    // 开发环境配置调整
    E2ETestConfig.test.timeout = Math.max(E2ETestConfig.test.timeout, 1800000); // 30分钟
    E2ETestConfig.monitoring.enabled = true;
    E2ETestConfig.reporting.artifacts.logs = true;
  }

  // 根据可用资源调整并行度
  const availableMemory = require('os').totalmem();
  const memoryGB = availableMemory / (1024 * 1024 * 1024);

  if (memoryGB < 4) {
    E2ETestConfig.test.parallel = 1;
  } else if (memoryGB < 8) {
    E2ETestConfig.test.parallel = Math.min(E2ETestConfig.test.parallel, 2);
  }
}

/**
 * 导出配置验证器
 */
export { validateConfig as configValidator };

/**
 * 导出配置适配器
 */
export { adaptConfigForEnvironment as configAdapter };
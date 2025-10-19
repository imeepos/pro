/**
 * 微博爬取核心集成测试配置
 *
 * 这个配置文件定义了核心集成测试的运行参数和Mock数据配置，
 * 确保测试环境的一致性和可重复性。
 */

export const CORE_TEST_CONFIG = {
  // 测试超时配置
  timeout: {
    default: 30000, // 30秒
    slow: 60000,    // 60秒
    verySlow: 120000 // 120秒
  },

  // 重试配置
  retry: {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2
  },

  // Mock数据配置
  mockData: {
    // 搜索结果配置
    searchResults: {
      minPages: 1,
      maxPages: 5,
      itemsPerPage: 10,
      contentLength: { min: 20, max: 500 }
    },

    // 用户信息配置
    userInfo: {
      followingCountRange: { min: 10, max: 10000 },
      followersCountRange: { min: 50, max: 1000000 },
      weiboCountRange: { min: 0, max: 100000 }
    },

    // 互动数据配置
    interactions: {
      likeCountRange: { min: 0, max: 50000 },
      repostCountRange: { min: 0, max: 10000 },
      commentCountRange: { min: 0, max: 5000 }
    },

    // 媒体文件配置
    media: {
      maxImages: 9,
      maxVideos: 3,
      imageDomains: ['wx1.sinaimg.cn', 'wx2.sinaimg.cn', 'wx3.sinaimg.cn', 'wx4.sinaimg.cn'],
      videoDomains: ['video.weibo.com', 'f.us.sinaimg.cn']
    }
  },

  // 测试环境配置
  environment: {
    headless: true,
    slowMo: 0,
    devtools: false,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },

  // 网络配置
  network: {
    offline: false,
    // 在测试中拦截不必要的资源以提高性能
    blockedResources: [
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.css',
      '**/*.woff',
      '**/*.woff2'
    ]
  },

  // 数据库配置
  database: {
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    logging: false,
    dropSchema: true
  },

  // 质量验证配置
  qualityValidation: {
    // 数据质量阈值
    thresholds: {
      completeness: 0.8,    // 80%的完整性
      accuracy: 0.9,        // 90%的准确性
      consistency: 0.85,    // 85%的一致性
      freshness: 0.7        // 70%的新鲜度
    },

    // 重复检测阈值
    duplication: {
      exactMatch: 1.0,      // 100%匹配
      highSimilarity: 0.9,  // 90%相似度
      mediumSimilarity: 0.8, // 80%相似度
      lowSimilarity: 0.6    // 60%相似度
    },

    // 内容长度限制
    contentLength: {
      min: 1,
      max: 10000
    },

    // URL格式验证
    urlValidation: {
      protocols: ['http', 'https'],
      maxLength: 2048,
      allowedDomains: [
        'weibo.com',
        'sina.com.cn',
        'sinaimg.cn',
        'video.weibo.com'
      ]
    }
  },

  // 性能基准
  performance: {
    // 页面加载时间基准（毫秒）
    pageLoadTime: {
      fast: 2000,     // 2秒以内
      normal: 5000,   // 5秒以内
      slow: 10000     // 10秒以内
    },

    // 内存使用基准（字节）
    memoryUsage: {
      low: 100 * 1024 * 1024,      // 100MB
      normal: 500 * 1024 * 1024,    // 500MB
      high: 1024 * 1024 * 1024      // 1GB
    },

    // 并发限制
    concurrency: {
      maxPages: 10,
      maxContexts: 5,
      maxBrowsers: 2
    }
  },

  // 错误处理配置
  errorHandling: {
    // 重试策略
    retryStrategies: {
      networkError: { attempts: 3, delay: 1000 },
      timeoutError: { attempts: 2, delay: 2000 },
      parseError: { attempts: 1, delay: 0 },
      authError: { attempts: 0, delay: 0 }
    },

    // 错误分类
    errorCategories: {
      transient: ['timeout', 'network', 'rate_limit'],
      permanent: ['auth', 'forbidden', 'not_found'],
      retryable: ['timeout', 'network', 'server_error']
    }
  },

  // 监控和报告配置
  monitoring: {
    // 启用性能监控
    enablePerformanceMonitoring: true,

    // 启用错误追踪
    enableErrorTracking: true,

    // 生成详细报告
    generateDetailedReports: true,

    // 报告输出格式
    reportFormats: ['json', 'html', 'junit'],

    // 截图配置
    screenshots: {
      takeOnFailure: true,
      takeOnSuccess: false,
      fullPage: true
    }
  }
};

/**
 * 测试数据生成器配置
 */
export const TEST_DATA_GENERATOR_CONFIG = {
  // 日期范围
  dateRange: {
    start: new Date('2023-01-01'),
    end: new Date(),
    timezone: 'Asia/Shanghai'
  },

  // 语言和地区
  locale: 'zh-CN',

  // 种子值用于可重复的测试数据
  seed: 12345,

  // 内容模板
  contentTemplates: {
    weibo: [
      '今天天气真好，适合出去走走#{topic}',
      '分享一个有趣的发现：{content} #{topic}',
      '{content} @{mention} 你怎么看？',
      '刚刚看到{content}，觉得很值得分享',
      '{content} #话题# @提及用户'
    ],

    comments: [
      '说得好！',
      '支持楼主的观点',
      '这个想法很有意思',
      '学习了，谢谢分享',
      '我有不同的看法...'
    ]
  },

  // 用户名生成规则
  usernamePatterns: [
    'user_{number}',
    'test_user_{number}',
    '微博用户_{number}',
    '测试账号_{number}'
  ],

  // 图片URL模式
  imageUrlPatterns: [
    'https://wx{subdomain}.sinaimg.cn/mw2000/{id}.jpg',
    'https://wx{subdomain}.sinaimg.cn/large/{id}.jpg',
    'https://wx{subdomain}.sinaimg.cn/orj360/{id}.jpg'
  ]
};

/**
 * 环境特定配置
 */
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'test';

  switch (env) {
    case 'development':
      return {
        ...CORE_TEST_CONFIG,
        environment: {
          ...CORE_TEST_CONFIG.environment,
          headless: false,
          devtools: true,
          slowMo: 100
        },
        monitoring: {
          ...CORE_TEST_CONFIG.monitoring,
          generateDetailedReports: true,
          screenshots: {
            ...CORE_TEST_CONFIG.monitoring.screenshots,
            takeOnSuccess: true
          }
        }
      };

    case 'ci':
      return {
        ...CORE_TEST_CONFIG,
        timeout: {
          default: 60000,
          slow: 120000,
          verySlow: 300000
        },
        environment: {
          ...CORE_TEST_CONFIG.environment,
          headless: true,
          devtools: false
        },
        monitoring: {
          ...CORE_TEST_CONFIG.monitoring,
          generateDetailedReports: false,
          reportFormats: ['junit']
        }
      };

    case 'test':
    default:
      return CORE_TEST_CONFIG;
  }
};

/**
 * 获取测试配置
 */
export const getTestConfig = () => {
  return getEnvironmentConfig();
};

/**
 * 验证测试配置
 */
export const validateTestConfig = (config: typeof CORE_TEST_CONFIG) => {
  const errors: string[] = [];

  // 验证超时配置
  if (config.timeout.default <= 0) {
    errors.push('Default timeout must be positive');
  }

  if (config.timeout.slow <= config.timeout.default) {
    errors.push('Slow timeout must be greater than default timeout');
  }

  if (config.timeout.verySlow <= config.timeout.slow) {
    errors.push('Very slow timeout must be greater than slow timeout');
  }

  // 验证重试配置
  if (config.retry.maxAttempts <= 0) {
    errors.push('Max retry attempts must be positive');
  }

  if (config.retry.delay < 0) {
    errors.push('Retry delay must be non-negative');
  }

  // 验证质量阈值
  Object.entries(config.qualityValidation.thresholds).forEach(([key, value]) => {
    if (value < 0 || value > 1) {
      errors.push(`Quality threshold ${key} must be between 0 and 1`);
    }
  });

  // 验证性能基准
  if (config.performance.pageLoadTime.fast >= config.performance.pageLoadTime.normal) {
    errors.push('Fast page load time must be less than normal');
  }

  if (config.performance.pageLoadTime.normal >= config.performance.pageLoadTime.slow) {
    errors.push('Normal page load time must be less than slow');
  }

  return errors;
};

export default CORE_TEST_CONFIG;
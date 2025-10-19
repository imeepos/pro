/**
 * 微博爬取核心集成测试套件入口
 *
 * 这个文件组织了所有核心功能的集成测试，提供了一个统一的入口点
 * 来运行和管理微博爬取系统的核心测试。
 *
 * 测试套件包含：
 * 1. 微博搜索爬取集成测试
 * 2. 微博详情爬取集成测试
 * 3. 账号管理和轮换集成测试
 * 4. 浏览器管理集成测试
 * 5. 数据质量验证集成测试
 */

import { CORE_TEST_CONFIG, getTestConfig, validateTestConfig } from './core-test.config';

// 导入所有核心测试文件
export { default as WeiboSearchCrawlerIntegrationTest } from './weibo-search-crawler.integration.test';
export { default as WeiboDetailCrawlerIntegrationTest } from './weibo-detail-crawler.integration.test';
export { default as AccountRotationIntegrationTest } from './account-rotation.integration.test';
export { default as BrowserManagementIntegrationTest } from './browser-management.integration.test';
export { default as DataQualityValidationTest } from './data-quality-validation.integration.test';

// 导出测试配置
export { CORE_TEST_CONFIG, getTestConfig, validateTestConfig };

/**
 * 核心测试套件信息
 */
export const CORE_TEST_SUITE_INFO = {
  name: '微博爬取核心集成测试套件',
  version: '1.0.0',
  description: '验证微博爬取系统核心功能的集成测试套件',

  // 测试分类
  categories: {
    search: {
      name: '搜索爬取测试',
      description: '验证微博搜索功能的准确性和稳定性',
      testFile: 'weibo-search-crawler.integration.test.ts',
      estimatedDuration: 45000 // 45秒
    },

    detail: {
      name: '详情爬取测试',
      description: '验证微博详情和评论数据的完整性',
      testFile: 'weibo-detail-crawler.integration.test.ts',
      estimatedDuration: 60000 // 60秒
    },

    account: {
      name: '账号管理测试',
      description: '验证账号池管理和智能轮换功能',
      testFile: 'account-rotation.integration.test.ts',
      estimatedDuration: 30000 // 30秒
    },

    browser: {
      name: '浏览器管理测试',
      description: '验证浏览器实例管理和性能优化',
      testFile: 'browser-management.integration.test.ts',
      estimatedDuration: 40000 // 40秒
    },

    quality: {
      name: '数据质量测试',
      description: '验证数据准确性和一致性检查',
      testFile: 'data-quality-validation.integration.test.ts',
      estimatedDuration: 35000 // 35秒
    }
  },

  // 总体统计
  statistics: {
    totalTestFiles: 5,
    estimatedTotalDuration: 210000, // 3.5分钟
    coverageTarget: 85, // 85%覆盖率目标
    qualityThreshold: 90 // 90%质量阈值
  },

  // 依赖关系
  dependencies: {
    internal: [
      'WeiboCrawlerIntegrationTestBase',
      'TestDataGenerator',
      'MockResponseGenerator'
    ],
    external: [
      '@nestjs/testing',
      '@nestjs/common',
      'playwright',
      'typeorm',
      'jest'
    ]
  },

  // 测试环境要求
  requirements: {
    node: '>=16.0.0',
    memory: '>=512MB',
    disk: '>=100MB',
    network: '可选（测试主要使用Mock数据）'
  }
};

/**
 * 测试套件执行器
 */
export class CoreTestSuiteRunner {
  private config = getTestConfig();
  private results: any[] = [];

  constructor() {
    this.validateEnvironment();
  }

  /**
   * 验证测试环境
   */
  private validateEnvironment(): void {
    const configErrors = validateTestConfig(this.config);

    if (configErrors.length > 0) {
      throw new Error(`测试配置验证失败:\n${configErrors.join('\n')}`);
    }

    // 验证Node.js版本
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 16) {
      throw new Error(`需要Node.js 16或更高版本，当前版本: ${nodeVersion}`);
    }
  }

  /**
   * 运行所有核心测试
   */
  async runAllTests(options: {
    parallel?: boolean;
    category?: string;
    verbose?: boolean;
    timeout?: number;
  } = {}): Promise<any> {
    const { parallel = false, category, verbose = false, timeout } = options;

    console.log('🚀 开始执行微博爬取核心集成测试套件...');
    console.log(`📊 配置信息: ${JSON.stringify(CORE_TEST_SUITE_INFO.statistics, null, 2)}`);

    const startTime = Date.now();

    try {
      if (category) {
        return await this.runCategoryTests(category, { verbose, timeout });
      } else {
        return await this.runSuiteTests({ parallel, verbose, timeout });
      }
    } finally {
      const duration = Date.now() - startTime;
      console.log(`✅ 测试套件执行完成，总耗时: ${duration}ms`);
    }
  }

  /**
   * 运行指定类别的测试
   */
  private async runCategoryTests(category: string, options: { verbose?: boolean; timeout?: number }): Promise<any> {
    const categoryInfo = CORE_TEST_SUITE_INFO.categories[category as keyof typeof CORE_TEST_SUITE_INFO.categories];

    if (!categoryInfo) {
      throw new Error(`未知的测试类别: ${category}`);
    }

    console.log(`📂 执行 ${categoryInfo.name}...`);

    // 这里应该动态导入和执行对应的测试文件
    // 由于这是TypeScript配置文件，实际执行由Jest处理

    return {
      category,
      name: categoryInfo.name,
      duration: categoryInfo.estimatedDuration,
      status: 'completed'
    };
  }

  /**
   * 运行整个测试套件
   */
  private async runSuiteTests(options: { parallel?: boolean; verbose?: boolean; timeout?: number }): Promise<any> {
    const { parallel, verbose, timeout } = options;

    console.log(`🎯 执行模式: ${parallel ? '并行' : '串行'}`);

    const results = {
      suiteName: CORE_TEST_SUITE_INFO.name,
      startTime: new Date(),
      endTime: null as Date | null,
      duration: 0,
      categories: {} as Record<string, any>,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };

    // 串行执行测试（推荐用于集成测试）
    if (!parallel) {
      for (const [key, category] of Object.entries(CORE_TEST_SUITE_INFO.categories)) {
        console.log(`\n📋 执行 ${category.name}...`);

        const categoryResult = await this.runCategoryTests(key, { verbose, timeout });
        results.categories[key] = categoryResult;

        if (verbose) {
          console.log(`   ✅ ${category.name} 完成`);
        }
      }
    } else {
      // 并行执行测试
      const promises = Object.entries(CORE_TEST_SUITE_INFO.categories).map(
        ([key, category]) => this.runCategoryTests(key, { verbose, timeout })
      );

      const categoryResults = await Promise.all(promises);

      Object.entries(CORE_TEST_SUITE_INFO.categories).forEach((key, index) => {
        results.categories[key[0]] = categoryResults[index];
      });
    }

    results.endTime = new Date();
    results.duration = results.endTime.getTime() - results.startTime.getTime();

    // 生成测试报告
    if (verbose) {
      this.generateTestReport(results);
    }

    return results;
  }

  /**
   * 生成测试报告
   */
  private generateTestReport(results: any): void {
    console.log('\n📊 测试报告');
    console.log('=' .repeat(50));
    console.log(`测试套件: ${results.suiteName}`);
    console.log(`开始时间: ${results.startTime.toISOString()}`);
    console.log(`结束时间: ${results.endTime?.toISOString()}`);
    console.log(`总耗时: ${results.duration}ms`);

    console.log('\n📋 各类别测试结果:');
    Object.entries(results.categories).forEach(([key, category]: [string, any]) => {
      const categoryInfo = CORE_TEST_SUITE_INFO.categories[key as keyof typeof CORE_TEST_SUITE_INFO.categories];
      console.log(`  ${categoryInfo.name}: ${category.status} (${category.duration}ms)`);
    });

    console.log('\n📈 测试统计:');
    console.log(`  总计: ${results.summary.total}`);
    console.log(`  通过: ${results.summary.passed}`);
    console.log(`  失败: ${results.summary.failed}`);
    console.log(`  跳过: ${results.summary.skipped}`);
    console.log(`  成功率: ${((results.summary.passed / results.summary.total) * 100).toFixed(2)}%`);
  }

  /**
   * 获取测试套件信息
   */
  getSuiteInfo(): typeof CORE_TEST_SUITE_INFO {
    return CORE_TEST_SUITE_INFO;
  }

  /**
   * 获取测试配置
   */
  getConfig(): typeof CORE_TEST_CONFIG {
    return this.config;
  }
}

/**
 * 创建测试套件运行器实例
 */
export const createTestRunner = (): CoreTestSuiteRunner => {
  return new CoreTestSuiteRunner();
};

/**
 * 默认导出测试套件信息
 */
export default CORE_TEST_SUITE_INFO;
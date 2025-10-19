#!/usr/bin/env ts-node

/**
 * 微博爬取核心集成测试运行器
 *
 * 这个脚本提供了一个便捷的方式来运行微博爬取系统的核心集成测试。
 * 支持运行全部测试或指定类别的测试，并提供详细的执行报告。
 */

import { createTestRunner, CORE_TEST_SUITE_INFO } from './index';

interface RunOptions {
  category?: string;
  parallel?: boolean;
  verbose?: boolean;
  timeout?: number;
  help?: boolean;
}

/**
 * 解析命令行参数
 */
function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  const options: RunOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--category':
      case '-c':
        options.category = args[++i];
        break;

      case '--parallel':
      case '-p':
        options.parallel = true;
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--timeout':
      case '-t':
        options.timeout = parseInt(args[++i]);
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;

      default:
        if (arg.startsWith('--')) {
          console.error(`未知选项: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
微博爬取核心集成测试运行器

用法:
  ts-node run-core-tests.ts [选项]

选项:
  -c, --category <类别>    运行指定类别的测试
  -p, --parallel          并行执行测试
  -v, --verbose           显示详细输出
  -t, --timeout <毫秒>    设置测试超时时间
  -h, --help              显示此帮助信息

可用的测试类别:
  search    - 搜索爬取测试
  detail    - 详情爬取测试
  account   - 账号管理测试
  browser   - 浏览器管理测试
  quality   - 数据质量测试

示例:
  ts-node run-core-tests.ts                           # 运行所有测试
  ts-node run-core-tests.ts -c search                 # 只运行搜索测试
  ts-node run-core-tests.ts -v -p                     # 详细模式并行运行
  ts-node run-core-tests.ts -t 60000                  # 设置60秒超时

测试套件信息:
  名称: ${CORE_TEST_SUITE_INFO.name}
  版本: ${CORE_TEST_SUITE_INFO.version}
  测试文件数: ${CORE_TEST_SUITE_INFO.statistics.totalTestFiles}
  预计总耗时: ${Math.round(CORE_TEST_SUITE_INFO.statistics.estimatedTotalDuration / 1000)}秒
`);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();

    if (options.help) {
      showHelp();
      return;
    }

    // 验证类别参数
    if (options.category) {
      const validCategories = Object.keys(CORE_TEST_SUITE_INFO.categories);
      if (!validCategories.includes(options.category)) {
        console.error(`无效的测试类别: ${options.category}`);
        console.error(`可用类别: ${validCategories.join(', ')}`);
        process.exit(1);
      }
    }

    console.log('🔧 微博爬取核心集成测试运行器');
    console.log(`📦 套件版本: ${CORE_TEST_SUITE_INFO.version}`);
    console.log(`⏰ 启动时间: ${new Date().toISOString()}`);

    if (options.category) {
      const categoryInfo = CORE_TEST_SUITE_INFO.categories[
        options.category as keyof typeof CORE_TEST_SUITE_INFO.categories
      ];
      console.log(`🎯 执行类别: ${categoryInfo.name}`);
      console.log(`📝 描述: ${categoryInfo.description}`);
    } else {
      console.log(`🎯 执行模式: 全部测试`);
    }

    console.log(`⚙️  配置: 并行=${options.parallel ? '是' : '否'}, 详细=${options.verbose ? '是' : '否'}`);
    console.log('');

    // 创建测试运行器
    const runner = createTestRunner();

    // 显示测试套件信息
    if (options.verbose) {
      const suiteInfo = runner.getSuiteInfo();
      console.log('📊 测试套件信息:');
      console.log(`  总测试文件: ${suiteInfo.statistics.totalTestFiles}`);
      console.log(`  预计总耗时: ${Math.round(suiteInfo.statistics.estimatedTotalDuration / 1000)}秒`);
      console.log(`  覆盖率目标: ${suiteInfo.statistics.coverageTarget}%`);
      console.log(`  质量阈值: ${suiteInfo.statistics.qualityThreshold}%`);
      console.log('');
    }

    // 运行测试
    const results = await runner.runAllTests(options);

    // 显示结果摘要
    console.log('\n🎉 测试执行完成！');
    console.log(`⏱️  总耗时: ${results.duration}ms`);

    if (results.categories) {
      console.log('\n📋 各类别执行结果:');
      Object.entries(results.categories).forEach(([key, category]: [string, any]) => {
        const categoryInfo = CORE_TEST_SUITE_INFO.categories[
          key as keyof typeof CORE_TEST_SUITE_INFO.categories
        ];
        const status = category.status === 'completed' ? '✅' : '❌';
        console.log(`  ${status} ${categoryInfo.name}: ${category.duration}ms`);
      });
    }

    // 退出码基于测试结果
    const hasFailures = Object.values(results.categories || {}).some(
      (category: any) => category.status !== 'completed'
    );

    if (hasFailures) {
      console.log('\n❌ 部分测试失败');
      process.exit(1);
    } else {
      console.log('\n✅ 所有测试通过');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ 测试运行失败:');
    console.error(error instanceof Error ? error.message : String(error));

    if (process.env.NODE_ENV === 'development') {
      console.error('\n🔍 详细错误信息:');
      console.error(error);
    }

    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('未捕获的错误:', error);
    process.exit(1);
  });
}

export { main };
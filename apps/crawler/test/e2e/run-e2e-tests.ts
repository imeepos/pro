#!/usr/bin/env ts-node

/**
 * 端到端测试执行脚本
 * 使用方法: npx ts-node test/e2e/run-e2e-tests.ts [options]
 */

import { E2ETestRunner, TestExecutionConfig } from './utils/test-runner';
import { Logger } from '@pro/logger';

interface CliOptions {
  parallel?: boolean;
  concurrency?: number;
  continueOnFailure?: boolean;
  suites?: string;
  categories?: string;
  noReports?: boolean;
  outputDir?: string;
  retry?: boolean;
  maxRetries?: number;
  help?: boolean;
  verbose?: boolean;
}

function parseArguments(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--parallel':
      case '-p':
        options.parallel = true;
        break;
      case '--concurrency':
      case '-c':
        options.concurrency = parseInt(args[++i]) || 3;
        break;
      case '--continue-on-failure':
      case '-f':
        options.continueOnFailure = true;
        break;
      case '--suites':
      case '-s':
        options.suites = args[++i];
        break;
      case '--categories':
      case '-t':
        options.categories = args[++i];
        break;
      case '--no-reports':
      case '-n':
        options.noReports = true;
        break;
      case '--output-dir':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--retry':
      case '-r':
        options.retry = true;
        break;
      case '--max-retries':
        options.maxRetries = parseInt(args[++i]) || 2;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
🧪 微博爬取系统端到端测试执行器

使用方法:
  npx ts-node test/e2e/run-e2e-tests.ts [options]

选项:
  -p, --parallel              并行执行测试套件
  -c, --concurrency <num>      最大并发数 (默认: 3)
  -f, --continue-on-failure    遇到失败时继续执行
  -s, --suites <names>         指定要执行的测试套件 (逗号分隔)
  -t, --categories <types>     指定要执行的测试类别 (逗号分隔)
  -n, --no-reports             不生成测试报告
  -o, --output-dir <path>      指定报告输出目录 (默认: ./test/reports)
  -r, --retry                  失败时重试测试
  --max-retries <num>          最大重试次数 (默认: 2)
  -v, --verbose                详细输出
  -h, --help                   显示帮助信息

可用的测试套件:
  - complete-data-flow     完整数据流程集成测试
  - performance-stress    性能压力测试套件
  - error-recovery        错误恢复和故障转移测试
  - data-consistency      数据一致性验证测试
  - monitoring-alerting   监控和告警系统测试

可用的测试类别:
  - integration           集成测试
  - performance           性能测试
  - recovery              恢复测试
  - consistency           一致性测试
  - monitoring            监控测试

示例:
  # 运行所有测试 (串行)
  npx ts-node test/e2e/run-e2e-tests.ts

  # 并行运行所有测试
  npx ts-node test/e2e/run-e2e-tests.ts --parallel --concurrency 5

  # 只运行集成测试和性能测试
  npx ts-node test/e2e/run-e2e-tests.ts --categories integration,performance

  # 只运行特定的测试套件
  npx ts-node test/e2e/run-e2e-tests.ts --suites complete-data-flow,performance-stress

  # 详细输出并生成报告
  npx ts-node test/e2e/run-e2e-tests.ts --verbose --output-dir ./reports

  # 失败时重试并继续执行
  npx ts-node test/e2e/run-e2e-tests.ts --retry --continue-on-failure
`);
}

async function main(): Promise<void> {
  const options = parseArguments();

  if (options.help) {
    printHelp();
    return;
  }

  const logger = new Logger('E2ETestRunner');

  try {
    console.log('🎭 启动微博爬取系统端到端测试执行器');
    console.log('='.repeat(60));

    // 显示配置信息
    if (options.verbose) {
      console.log('📋 测试配置:');
      console.log(`   并行执行: ${options.parallel || false}`);
      console.log(`   最大并发: ${options.concurrency || 3}`);
      console.log(`   继续失败: ${options.continueOnFailure || false}`);
      console.log(`   生成报告: ${!options.noReports}`);
      console.log(`   失败重试: ${options.retry || false}`);
      console.log(`   最大重试: ${options.maxRetries || 2}`);

      if (options.suites) {
        console.log(`   指定套件: ${options.suites}`);
      }

      if (options.categories) {
        console.log(`   指定类别: ${options.categories}`);
      }

      console.log(`   输出目录: ${options.outputDir || './test/reports'}`);
      console.log('');
    }

    // 构建配置
    const config: TestExecutionConfig = {
      parallel: options.parallel || false,
      maxConcurrency: options.concurrency || 3,
      continueOnFailure: options.continueOnFailure || false,
      generateReports: !options.noReports,
      outputDir: options.outputDir || './test/reports',
      selectedSuites: options.suites ? options.suites.split(',').map(s => s.trim()) : undefined,
      selectedCategories: options.categories ? options.categories.split(',').map(c => c.trim()) : undefined,
      retryFailures: options.retry || false,
      maxRetries: options.maxRetries || 2
    };

    // 创建测试运行器
    const testRunner = new E2ETestRunner();

    // 记录开始时间
    const startTime = Date.now();

    // 执行测试
    await testRunner.runAllTests(config);

    // 计算总执行时间
    const totalTime = Date.now() - startTime;

    console.log('');
    console.log('✅ 所有测试执行完成!');
    console.log(`⏱️ 总执行时间: ${Math.round(totalTime / 1000)}秒`);

    if (!options.noReports) {
      console.log(`📊 测试报告已生成到: ${config.outputDir}`);
    }

  } catch (error) {
    console.error('❌ 测试执行失败:', error);

    if (options.verbose) {
      console.error('');
      console.error('详细错误信息:');
      console.error(error);
    }

    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n🛑 收到中断信号，正在停止测试...');
  process.exit(0);
});

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}
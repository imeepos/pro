import 'reflect-metadata';
import { connectMongoDB } from '@pro/mongodb';
import { logger } from './core/logger';
import { SimpleIntervalScheduler } from './weibo/simple-interval-scheduler.service';
import { AggregateSchedulerService } from './services/aggregate-scheduler.service';
import { SimpleTaskMonitor } from './weibo/simple-task-monitor.service';
import { WeiboAccountHealthScheduler } from './weibo/account-health-scheduler.service';
import { DlqConsumer } from './consumers/dlq.consumer';
import { AccountInitService } from './services/account-init.service';
import { DiagnosticService } from './weibo/diagnostic.service';

/**
 * Broker 应用启动 - 优雅的诞生
 *
 * 启动哲学：
 * - 每一步都有其存在的意义
 * - 错误处理优雅且信息丰富
 * - 启动过程透明且可控
 *
 * 使命：将静态代码转化为动态服务，赋予任务调度以生命
 */

// 存储所有服务实例，便于优雅关闭
const services = {
  intervalScheduler: null as SimpleIntervalScheduler | null,
  aggregateScheduler: null as AggregateSchedulerService | null,
  taskMonitor: null as SimpleTaskMonitor | null,
  accountHealthScheduler: null as WeiboAccountHealthScheduler | null,
  dlqConsumer: null as DlqConsumer | null,
};

async function bootstrap() {
  const bootstrapStart = Date.now();

  console.log('🚀 启动 Broker 服务 - 任务调度之心');

  try {
    // 连接 MongoDB - 数据之源
    logger.info('连接 MongoDB...');
    await connectMongoDB();
    logger.info('MongoDB 连接成功');

    // 初始化账号健康度队列
    logger.info('初始化微博账号健康度队列...');
    const accountInitService = new AccountInitService();
    await accountInitService.init();

    // 创建所有服务实例
    logger.info('创建服务实例...');
    services.intervalScheduler = new SimpleIntervalScheduler();
    services.aggregateScheduler = new AggregateSchedulerService();
    services.taskMonitor = new SimpleTaskMonitor();
    services.accountHealthScheduler = new WeiboAccountHealthScheduler();
    services.dlqConsumer = new DlqConsumer();

    // 启动所有调度器
    logger.info('启动调度器...');
    services.intervalScheduler.start();
    services.aggregateScheduler.start();
    services.taskMonitor.start();
    services.accountHealthScheduler.start();
    services.dlqConsumer.start();

    const totalDuration = Date.now() - bootstrapStart;

    // 启动成功 - 新生的宣告
    logger.info(`✨ Broker 服务已优雅启动，总启动时间: ${totalDuration}ms`);
    logger.info('🎯 任务调度中心开始运行');

    // 详细的启动信息
    logger.debug({
      totalBootstrapTime: `${totalDuration}ms`,
      environment: process.env.NODE_ENV || 'development',
      processId: process.pid,
      nodeVersion: process.version,
    });

    console.log(`\n🎉 Broker 服务就绪！`);
    console.log(`⏱️  启动耗时: ${totalDuration}ms\n`);

    // 设置优雅关闭
    setupGracefulShutdown();

  } catch (error) {
    const bootstrapDuration = Date.now() - bootstrapStart;
    console.error(`\n💔 Broker 服务启动失败 (${bootstrapDuration}ms):`);
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);

    logger.error({
      message: 'Broker 服务启动失败',
      error: error.message,
      stack: error.stack,
      duration: bootstrapDuration,
    });

    process.exit(1);
  }
}

/**
 * 优雅关闭 - 有尊严的退场
 */
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);
    logger.info(`收到 ${signal} 信号，开始优雅关闭`);

    try {
      // 停止所有调度器
      if (services.intervalScheduler) {
        services.intervalScheduler.stop();
      }
      if (services.aggregateScheduler) {
        services.aggregateScheduler.stop();
      }
      if (services.taskMonitor) {
        services.taskMonitor.stop();
      }
      if (services.accountHealthScheduler) {
        services.accountHealthScheduler.stop();
      }

      logger.info('所有调度器已停止');
      console.log('✅ 所有调度器已优雅关闭');

      process.exit(0);
    } catch (error) {
      logger.error({
        message: '优雅关闭时发生错误',
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * 应用启动 - 命运的召唤
 */
bootstrap().catch((error) => {
  console.error('🚨 Bootstrap 过程发生致命错误:', error);
  logger.error({
    message: 'Bootstrap 致命错误',
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

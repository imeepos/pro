import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@pro/logger';
import { BrokerModule } from './broker.module';

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
async function bootstrap() {
  const bootstrapStart = Date.now();

  // 控制台输出 - 服务启动的第一声问候
  console.log('🚀 启动 Broker 服务 - 任务调度之心');

  try {
    // 创建应用实例 - 从蓝图到现实
    const app = await NestFactory.create(BrokerModule);

    // 配置验证管道 - 数据的守护者
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,        // 只接受已定义的属性
        transform: true,        // 自动类型转换
        forbidNonWhitelisted: true, // 拒绝未知属性
      }),
    );

    // 启用优雅关闭 - 有尊严的退场
    app.enableShutdownHooks();

    // 获取配置服务 - 系统的神经中枢
    const config = app.get(ConfigService);
    const logger = app.get(Logger);
    const port = config.get('PORT', 3003);

    // 启动 HTTP 服务器 - 服务的门户
    logger.debug('准备开启服务之门');
    const serverStart = Date.now();
    await app.listen(port);
    const serverDuration = Date.now() - serverStart;

    const totalDuration = Date.now() - bootstrapStart;

    // 启动成功 - 新生的宣告
    logger.log(`✨ Broker 服务已优雅启动，端口: ${port}`, 'Bootstrap');
    logger.log(`🎯 任务调度中心开始运行，总启动时间: ${totalDuration}ms`, 'Bootstrap');

    // 详细的启动信息 - 透明的自我介绍
    logger.debug('📊 启动统计', {
      port,
      serverStartTime: `${serverDuration}ms`,
      totalBootstrapTime: `${totalDuration}ms`,
      environment: config.get('NODE_ENV', 'development'),
      processId: process.pid,
      nodeVersion: process.version,
    });

    console.log(`\n🎉 Broker 服务就绪！`);
    console.log(`📍 服务地址: http://localhost:${port}`);
    console.log(`💓 健康检查: http://localhost:${port}/health`);
    console.log(`📈 统计信息: http://localhost:${port}/broker/stats`);
    console.log(`⏱️  启动耗时: ${totalDuration}ms\n`);

  } catch (error) {
    // 启动失败 - 优雅的告别
    const bootstrapDuration = Date.now() - bootstrapStart;
    console.error(`\n💔 Broker 服务启动失败 (${bootstrapDuration}ms):`);
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);

    // 记录到日志系统（如果可用）
    if (error.message?.includes('logger')) {
      console.error('日志系统初始化失败，使用控制台输出');
    }

    process.exit(1);
  }
}

/**
 * 应用启动 - 命运的召唤
 */
bootstrap().catch((error) => {
  console.error('🚨 Bootstrap 过程发生致命错误:', error);
  process.exit(1);
});

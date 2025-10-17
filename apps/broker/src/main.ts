import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@pro/logger';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BrokerModule } from './broker.module';

/**
 * Bootstrap Broker 应用
 * 任务调度中心启动入口
 */
async function bootstrap() {
  const bootstrapStart = Date.now();
  console.log('启动 Broker 服务 - 任务调度中心...');

  const app = await NestFactory.create(BrokerModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 启用优雅关闭
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const logger = app.get(Logger);
  const port = config.get('PORT', 3003);

  // Swagger 文档配置（可选，需要时启用）
  /*
  const configSwagger = new DocumentBuilder()
    .setTitle('Broker API')
    .setDescription('微博搜索任务调度中心 API 文档')
    .setVersion('1.0')
    .addTag('broker')
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api/docs', app, document);
  */

  logger.debug('开始启动 HTTP 服务器');
  const serverStart = Date.now();
  await app.listen(port);
  const serverDuration = Date.now() - serverStart;

  const totalBootstrapDuration = Date.now() - bootstrapStart;

  logger.log(`Broker 服务已启动，端口: ${port}`, 'Bootstrap');
  logger.log(`任务调度中心正在运行... 启动耗时: ${totalBootstrapDuration}ms`, 'Bootstrap');
  logger.debug('启动详情', {
    port,
    serverStartTimeMs: serverDuration,
    totalBootstrapTimeMs: totalBootstrapDuration,
    nodeEnv: config.get('NODE_ENV', 'development')
  });
}

bootstrap().catch((error) => {
  console.error('Broker 服务启动失败:', error);
  process.exit(1);
});

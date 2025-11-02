import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@pro/logger-nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const bootstrapStart = Date.now();
  console.log('启动 Analyzer 服务 - 智能分析层...');

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const logger = app.get(Logger);
  const port = config.get('PORT', 3005);

  logger.debug('开始启动 HTTP 服务器');
  const serverStart = Date.now();
  await app.listen(port);
  const serverDuration = Date.now() - serverStart;

  const totalBootstrapDuration = Date.now() - bootstrapStart;

  logger.log(`Analyzer 服务已启动，端口: ${port}`, 'Bootstrap');
  logger.log(`智能分析层正在运行... 启动耗时: ${totalBootstrapDuration}ms`, 'Bootstrap');
  logger.debug('启动详情', {
    port,
    serverStartTimeMs: serverDuration,
    totalBootstrapTimeMs: totalBootstrapDuration,
    nodeEnv: config.get('NODE_ENV', 'development'),
  });
}

bootstrap().catch(error => {
  console.error('Analyzer 服务启动失败:', error);
  process.exit(1);
});

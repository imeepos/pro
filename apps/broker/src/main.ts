import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BrokerModule } from './broker.module';

/**
 * Bootstrap Broker 应用
 * 任务调度中心启动入口
 */
async function bootstrap() {
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

  // Swagger 文档配置（可选，需要时启用）
  /*
  const config = new DocumentBuilder()
    .setTitle('Broker API')
    .setDescription('微博搜索任务调度中心 API 文档')
    .setVersion('1.0')
    .addTag('broker')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  */

  const config = app.get(ConfigService);
  const port = config.get('PORT', 3003);
  await app.listen(port);

  console.log(`Broker 服务已启动，端口: ${port}`);
  // console.log(`API 文档地址: http://localhost:${port}/api/docs`);
  console.log('任务调度中心正在运行...');
}

bootstrap().catch((error) => {
  console.error('Broker 服务启动失败:', error);
  process.exit(1);
});
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*', credentials: true });

  const swagger = new DocumentBuilder()
    .setTitle('Bug守护者 API')
    .setDescription('企业级Bug追踪管理系统')
    .setVersion('1.0')
    .addTag('bugs')
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get('PORT', 3001);
  await app.listen(port);

  console.log(`🐛 Bug守护者服务运行在 http://localhost:${port}`);
  console.log(`📚 API文档: http://localhost:${port}/api/docs`);
}
bootstrap();
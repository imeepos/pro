import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*', credentials: true });

  const port = config.get('PORT', 3001);
  await app.listen(port);

  console.log(`🐛 Bug守护者服务运行在 http://localhost:${port}`);
  console.log(`🚀 GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
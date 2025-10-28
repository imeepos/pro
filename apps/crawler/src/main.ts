import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@pro/logger';
import { connectMongoDB } from '@pro/mongodb';
import { AppModule } from './app.module';

async function bootstrap() {
  await connectMongoDB();

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(Logger);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`Crawler service is running on port ${port}`, 'Bootstrap');
}
bootstrap();

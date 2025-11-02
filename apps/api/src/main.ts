import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { root } from '@pro/core';
import { RabbitMQService, registerMqQueues } from '@pro/rabbitmq';
import { MongodbModule } from '@pro/mongodb';
import {} from '@pro/core'
async function bootstrap() {

  console.log({
    RabbitMQService,
    MongodbModule
  })
  await root.init();
  // 注册消息队列配置
  registerMqQueues();

  const app = await NestFactory.create(AppModule);

  // 将 NestJS 提供的服务桥接到 @pro/core 的 root injector
  const configService = app.get(ConfigService);
  root.set([{ provide: ConfigService, useValue: configService }]);

  app.useGlobalPipes(new ValidationPipe());

  app.useGlobalFilters(new HttpExceptionFilter(), new GraphqlExceptionFilter());

  app.useGlobalInterceptors(new TransformInterceptor());

  app.use('/api', (req: Request, res: Response) => {
    res.status(410).json({
      message: 'REST 接口已下线，请改用 GraphQL /graphql 端点',
      path: req.path,
    });
  });

  app.enableCors({
    origin: '*',
    credentials: true,
  });
  await app.listen(configService.get('PORT', 3000), '0.0.0.0');
}
bootstrap();

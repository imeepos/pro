import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ConfigService } from '@nestjs/config';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

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
  await app.listen(config.get('PORT', 3000), '0.0.0.0');
}
bootstrap();

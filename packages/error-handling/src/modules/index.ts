import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ErrorHandlerService } from '../error-handler.service';
import { ErrorHandlingMiddleware } from '../middleware/index';

@Global()
@Module({
  providers: [ErrorHandlerService],
  exports: [ErrorHandlerService],
})
export class ErrorHandlingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ErrorHandlingMiddleware)
      .forRoutes('*');
  }
}
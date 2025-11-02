import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadGatewayException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, throwError, of, lastValueFrom } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { Logger } from '@pro/logger-nestjs';
import { TransactionService, TransactionContext } from '../services/transaction.service';
import { TRANSACTIONAL_METADATA_KEY, TransactionalConfig } from '../decorators/transactional.decorator';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly transactionService: TransactionService,
    private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): ReturnType<CallHandler['handle']> {
    const transactionalConfig = this.reflector.get<TransactionalConfig>(
      TRANSACTIONAL_METADATA_KEY,
      context.getHandler(),
    );

    if (!transactionalConfig) {
      return next.handle();
    }

    const methodName = context.getHandler().name;
    const className = context.getClass().name;
    const operationId = `${className}.${methodName}`;

    this.logger.debug('事务拦截器启动', {
      operation: operationId,
      config: transactionalConfig,
    });

    return from(
      this.transactionService.executeInTransaction(
        async (transactionContext: TransactionContext) => {
          const request = context.switchToHttp().getRequest();
          request.transactionContext = transactionContext;

          const handler$ = next.handle() as unknown as Observable<unknown>;
          return lastValueFrom(handler$);
        },
        transactionalConfig,
      )
    ).pipe(
      switchMap(result => {
        if (!result.success) {
          this.logger.error('事务执行失败', {
            operation: operationId,
            attempts: result.attempts,
            duration: result.duration,
            error: result.error?.message,
          });

          return throwError(
            () => new BadGatewayException({
              message: '数据操作暂时不可用，请稍后重试',
              operation: operationId,
              attempts: result.attempts,
            })
          );
        }

        this.logger.debug('事务执行成功', {
          operation: operationId,
          attempts: result.attempts,
          duration: result.duration,
        });

        return of(result.data);
      }),
      catchError(error => {
        this.logger.error('事务拦截器异常', {
          operation: operationId,
          error: error.message,
        });
        return throwError(() => error);
      })
    ) as unknown as ReturnType<CallHandler['handle']>;
  }
}

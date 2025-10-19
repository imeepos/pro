import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ErrorHandlerService } from '../error-handler.service';
import { ErrorContext } from '../types/index';

interface ExtendedRequest extends Request {
  errorContext?: Partial<ErrorContext>;
  errorHandler?: ErrorHandlerService;
  user?: { id?: string };
  sessionID?: string;
}

@Injectable()
export class ErrorHandlingMiddleware implements NestMiddleware {
  constructor(private readonly errorHandler: ErrorHandlerService) {}

  use(req: ExtendedRequest, res: Response, next: NextFunction): void {
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    // 增强请求上下文
    req.errorContext = this.createErrorContext(req);

    // 拦截响应以捕获错误
    res.send = function(body: any) {
      if (res.statusCode >= 400) {
        const error = new Error(body?.message || 'HTTP Error');
        // 异步处理错误，不影响响应
        setImmediate(() => {
          req.errorHandler?.handle(error, { context: req.errorContext });
        });
      }
      return originalSend(body);
    };

    res.json = function(body: any) {
      if (res.statusCode >= 400) {
        const error = new Error(body?.message || 'HTTP Error');
        setImmediate(() => {
          req.errorHandler?.handle(error, { context: req.errorContext });
        });
      }
      return originalJson(body);
    };

    // 保存错误处理器引用
    req.errorHandler = this.errorHandler;

    next();
  }

  private createErrorContext(req: ExtendedRequest): Partial<ErrorContext> {
    return {
      userId: req.user?.id || undefined,
      sessionId: req.sessionID || undefined,
      requestId: (req.headers['x-request-id'] as string) || undefined,
      operation: `${req.method} ${req.path}`,
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        query: req.query,
        body: req.method === 'POST' ? req.body : undefined,
      },
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'unknown',
      service: 'middleware',
      version: '1.0.0',
    };
  }
}

export function createErrorHandlingMiddleware(errorHandler: ErrorHandlerService) {
  return (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const middleware = new ErrorHandlingMiddleware(errorHandler);
    middleware.use(req, res, next);
  };
}
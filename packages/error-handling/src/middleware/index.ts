import { Injectable } from '@pro/core';
import { Request, Response, NextFunction } from 'express';
import { ErrorHandlerService } from '../error-handler.service';
import { ErrorContext } from '../types/index';

interface ExtendedRequest extends Request {
  errorContext?: ErrorContext;
  errorHandler?: ErrorHandlerService;
  user?: { id?: string };
  sessionID?: string;
}

@Injectable()
export class ErrorHandlingMiddleware {
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
          const context = req.errorContext;
          req.errorHandler?.handle(error, context ? { context } : undefined);
        });
      }
      return originalSend(body);
    };

    res.json = function(body: any) {
      if (res.statusCode >= 400) {
        const error = new Error(body?.message || 'HTTP Error');
        setImmediate(() => {
          const context = req.errorContext;
          req.errorHandler?.handle(error, context ? { context } : undefined);
        });
      }
      return originalJson(body);
    };

    // 保存错误处理器引用
    req.errorHandler = this.errorHandler;

    next();
  }

  private createErrorContext(req: ExtendedRequest): ErrorContext {
    const userId = req.user?.id;
    const sessionId = req.sessionID;
    const requestId = req.headers['x-request-id'] as string;
    const userAgent = req.headers['user-agent'];
    const body = req.method === 'POST' ? req.body : undefined;

    const context: ErrorContext = {
      operation: `${req.method} ${req.path}`,
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'unknown',
      service: 'middleware',
      version: '1.0.0',
    };

    // 为可选字段添加值时需要明确分配
    const metadata: Record<string, unknown> = {
      ip: req.ip,
      query: req.query,
    };
    if (userAgent) metadata.userAgent = userAgent;
    if (body) metadata.body = body;

    return {
      ...context,
      ...(userId && { userId }),
      ...(sessionId && { sessionId }),
      ...(requestId && { requestId }),
      metadata,
    };
  }
}

export function createErrorHandlingMiddleware(errorHandler: ErrorHandlerService) {
  return (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const middleware = new ErrorHandlingMiddleware(errorHandler);
    middleware.use(req, res, next);
  };
}
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    // 跳过 204 No Content 响应
    if (statusCode === 204) {
      return next.handle();
    }

    // 跳过 SSE 响应（Content-Type: text/event-stream）
    const contentType = response.getHeader('Content-Type');
    if (contentType && contentType.includes('text/event-stream')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

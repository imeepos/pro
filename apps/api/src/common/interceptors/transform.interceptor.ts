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
  intercept(context: ExecutionContext, next: CallHandler): ReturnType<CallHandler['handle']> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;
    const stream = next.handle();

    // 跳过 204 No Content 响应
    if (statusCode === 204) {
      return stream;
    }

    // 跳过 SSE 响应（Content-Type: text/event-stream）
    const contentType = response.getHeader('Content-Type');
    const isEventStream = Array.isArray(contentType)
      ? contentType.some(value => value.includes('text/event-stream'))
      : typeof contentType === 'string' && contentType.includes('text/event-stream');

    if (isEventStream) {
      return stream;
    }

    const apiStream = stream as unknown as Observable<unknown>;

    const transformed = apiStream.pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );

    return transformed as unknown as ReturnType<CallHandler['handle']>;
  }
}

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard, IAuthGuard } from '@nestjs/passport';
import { resolveRequest } from '../../common/utils/context.utils';

/**
 * API Key 认证守卫
 * 支持从 X-API-Key 请求头或查询参数中提取 API Key
 */
@Injectable()
export class ApiKeyAuthGuard extends AuthGuard('api-key') {
  getRequest(context: ExecutionContext) {
    return resolveRequest(context);
  }

  canActivate(context: ExecutionContext): ReturnType<IAuthGuard['canActivate']> {
    return super.canActivate(context);
  }

  // 重写请求提取逻辑，支持多种来源
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = resolveRequest(context);

    const headerValue = request.headers['x-api-key'];
    const headerKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    const queryKey = this.resolveFromQuery(request.query);
    const resolvedKey = headerKey ?? queryKey;

    if (resolvedKey) {
      request.apiKey = resolvedKey;
    }

    return super.handleRequest(err, user, info, context);
  }

  private resolveFromQuery(query: Record<string, unknown>) {
    const candidates = [query['apiKey'], query['api_key']];

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        return candidate;
      }

      if (Array.isArray(candidate) && candidate.length > 0) {
        const [first] = candidate;
        if (typeof first === 'string') {
          return first;
        }
      }
    }

    return undefined;
  }
}

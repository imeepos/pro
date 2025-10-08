import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 标准 JWT 认证守卫
 * 从 Authorization header 中提取 Bearer token
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

/**
 * SSE JWT 认证守卫
 * 支持从 query 参数中提取 token（因为 EventSource 不支持自定义 headers）
 */
@Injectable()
export class JwtSseAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.query?.token;

    // 如果 query 中有 token 且 header 中没有，则从 query 中提取
    if (token && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${token}`;
    }

    return super.canActivate(context);
  }
}

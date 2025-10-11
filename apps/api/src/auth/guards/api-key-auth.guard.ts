import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * API Key 认证守卫
 * 支持从 X-API-Key 请求头或查询参数中提取 API Key
 */
@Injectable()
export class ApiKeyAuthGuard extends AuthGuard('api-key') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // 重写请求提取逻辑，支持多种来源
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // 尝试从请求头获取
    let apiKey = request.headers['x-api-key'];

    // 如果请求头没有，尝试从查询参数获取
    if (!apiKey) {
      apiKey = request.query?.apiKey || request.query?.api_key;
    }

    // 将API Key存储到请求中，便于后续使用
    request.apiKey = apiKey;

    return super.handleRequest(err, user, info, context);
  }
}
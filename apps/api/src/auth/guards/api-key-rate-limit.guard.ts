import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * API Key 创建频率限制守卫
 * 限制用户创建API Key的频率，防止滥用
 */
@Injectable()
export class ApiKeyRateLimitGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('用户未认证');
    }

    const cacheKey = `api-key-rate-limit:${user.userId}`;
    const currentCount = await this.cacheManager.get<number>(cacheKey) || 0;

    // 限制每小时最多创建5个API Key
    const MAX_HOURLY_CREATIONS = 5;
    const ONE_HOUR_IN_SECONDS = 3600;

    if (currentCount >= MAX_HOURLY_CREATIONS) {
      throw new ForbiddenException(
        `API Key创建频率过高，请稍后再试。每小时最多创建${MAX_HOURLY_CREATIONS}个API Key。`
      );
    }

    // 增加计数器
    await this.cacheManager.set(cacheKey, currentCount + 1, ONE_HOUR_IN_SECONDS);

    return true;
  }
}
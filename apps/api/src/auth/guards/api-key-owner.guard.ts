import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from '@pro/entities';

/**
 * API Key 所有者守卫
 * 确保用户只能操作自己的API Key
 */
@Injectable()
export class ApiKeyOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const apiKeyId = request.params.id || request.params.keyId;

    if (!user || !user.userId) {
      throw new ForbiddenException('用户未认证');
    }

    if (!apiKeyId) {
      // 如果没有提供API Key ID，说明是不需要检查所有权的操作
      return true;
    }

    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: parseInt(apiKeyId) },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    if (apiKey.userId !== user.userId) {
      throw new ForbiddenException('无权限操作此API Key');
    }

    // 将API Key对象添加到请求中，供后续使用
    request.apiKey = apiKey;

    return true;
  }
}
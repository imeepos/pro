import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ApiKeyEntity, useEntityManager } from '@pro/entities';
import { resolveRequest } from '../../common/utils/context.utils';

/**
 * API Key 所有者守卫
 * 确保用户只能操作自己的API Key
 */
@Injectable()
export class ApiKeyOwnerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = resolveRequest(context);
    const gqlArgs = this.tryGetGraphqlArgs(context);
    const user = request.user as { userId?: string } | undefined;
    const apiKeyId =
      request.params?.id ??
      request.params?.keyId ??
      gqlArgs?.id ??
      gqlArgs?.keyId;

    if (!user?.userId) {
      throw new ForbiddenException('用户未认证');
    }

    if (!apiKeyId) {
      // 如果没有提供API Key ID，说明是不需要检查所有权的操作
      return true;
    }

    const apiKey = await useEntityManager(async (manager) => {
      return await manager.findOne(ApiKeyEntity, {
        where: { id: Number(apiKeyId) },
      });
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

  private tryGetGraphqlArgs(context: ExecutionContext) {
    try {
      return GqlExecutionContext.create(context).getArgs<Record<string, any>>();
    } catch (error) {
      return {} as Record<string, any>;
    }
  }
}

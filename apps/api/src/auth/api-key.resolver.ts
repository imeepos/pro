import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ApiKeyService } from './api-key.service';
import type { ApiKeyEntity } from '@pro/entities';
import {
  ApiKeyConnection,
  ApiKeyQueryDto,
  ApiKeyResponseDto,
  ApiKeyStatsDto,
  ApiKeySummaryStatsDto,
  CreateApiKeyDto,
  RegenerateApiKeyDto,
  UpdateApiKeyDto,
} from './dto/api-key.dto';
import { ApiKeyOwnerGuard } from './guards/api-key-owner.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AugmentedRequest } from '../common/utils/context.utils';
import { GraphqlLoaders } from '../common/dataloaders/types';
import { buildOffsetConnection } from '../common/utils/pagination.utils';
import { CompositeAuthGuard } from './guards/composite-auth.guard';

@Resolver()
@UseGuards(CompositeAuthGuard)
export class ApiKeyResolver {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Query(() => ApiKeyConnection, { name: 'apiKeys' })
  async listApiKeys(
    @CurrentUser('userId') userId: string,
    @Args('filter', { type: () => ApiKeyQueryDto, nullable: true }) filter?: ApiKeyQueryDto,
  ): Promise<ApiKeyConnection> {
    const query = Object.assign(new ApiKeyQueryDto(), filter);
    const result = await this.apiKeyService.getUserApiKeysPaginated(userId, query);
    return buildOffsetConnection(result.items, {
      total: result.total,
      page: result.page,
      pageSize: result.limit,
    });
  }

  @Query(() => ApiKeyResponseDto, { name: 'apiKey' })
  @UseGuards(ApiKeyOwnerGuard)
  async getApiKey(
    @Args('id', { type: () => Int }) id: number,
    @Context('req') req: AugmentedRequest,
    @Context('loaders') loaders: GraphqlLoaders,
  ) {
    if (req.apiKey && this.isApiKeyEntity(req.apiKey)) {
      return this.apiKeyService.toResponse(req.apiKey);
    }

    const apiKey = await loaders.apiKeyById.load(id);

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    return apiKey;
  }

  @Query(() => ApiKeyStatsDto, { name: 'apiKeyStats' })
  @UseGuards(ApiKeyOwnerGuard)
  async getApiKeyStats(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
  ) {
    return this.apiKeyService.getApiKeyStats(userId, id);
  }

  @Query(() => ApiKeySummaryStatsDto, { name: 'apiKeySummary' })
  async getApiKeySummary(@CurrentUser('userId') userId: string) {
    return this.apiKeyService.getUserApiKeysSummaryStats(userId);
  }

  @Mutation(() => ApiKeyResponseDto, { name: 'createApiKey' })
  async createApiKey(
    @CurrentUser('userId') userId: string,
    @Args('input', { type: () => CreateApiKeyDto }) input: CreateApiKeyDto,
    @Context('req') req: AugmentedRequest,
  ) {
    const clientIp = req.ip as string | undefined;
    return this.apiKeyService.createApiKey(userId, input, clientIp);
  }

  @Mutation(() => ApiKeyResponseDto, { name: 'updateApiKey' })
  @UseGuards(ApiKeyOwnerGuard)
  async updateApiKey(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('input', { type: () => UpdateApiKeyDto }) input: UpdateApiKeyDto,
  ) {
    return this.apiKeyService.updateApiKey(userId, id, input);
  }

  @Mutation(() => Boolean, { name: 'disableApiKey' })
  @UseGuards(ApiKeyOwnerGuard)
  async disableApiKey(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
  ) {
    await this.apiKeyService.disableApiKey(userId, id);
    return true;
  }

  @Mutation(() => Boolean, { name: 'enableApiKey' })
  @UseGuards(ApiKeyOwnerGuard)
  async enableApiKey(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
  ) {
    await this.apiKeyService.enableApiKey(userId, id);
    return true;
  }

  @Mutation(() => Boolean, { name: 'removeApiKey' })
  @UseGuards(ApiKeyOwnerGuard)
  async removeApiKey(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
  ) {
    await this.apiKeyService.deleteApiKey(userId, id);
    return true;
  }

  @Mutation(() => RegenerateApiKeyDto, { name: 'regenerateApiKey' })
  @UseGuards(ApiKeyOwnerGuard)
  async regenerateApiKey(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
    @Context('req') req: AugmentedRequest,
  ) {
    const clientIp = req.ip;
    const newKey = await this.apiKeyService.regenerateApiKey(userId, id, clientIp);

    return {
      key: newKey,
      warning: '请立即保存此API Key，页面刷新后将无法再次查看完整密钥',
    } satisfies RegenerateApiKeyDto;
  }

  private isApiKeyEntity(value: unknown): value is ApiKeyEntity {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<ApiKeyEntity>;
    return typeof candidate.id === 'number' && typeof candidate.key === 'string';
  }
}

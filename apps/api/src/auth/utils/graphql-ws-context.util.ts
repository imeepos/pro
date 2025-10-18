import { GraphqlWsAuthService } from '../services/graphql-ws-auth.service';
import { AugmentedRequest, GraphqlContext } from '../../common/utils/context.utils';
import { JwtPayload } from '@pro/types';
import { GraphqlLoaders } from '../../common/dataloaders/types';
import { UserLoader } from '../../user/user.loader';
import { ApiKeyLoader } from '../api-key.loader';
import { EventTypeLoader } from '../../events/event-type.loader';
import { IndustryTypeLoader } from '../../events/industry-type.loader';
import { TagLoader } from '../../events/tag.loader';

/**
 * WebSocket 连接上下文创建器
 * 处理 graphql-ws 连接的认证和上下文创建
 */
export class GraphqlWsContextCreator {
  constructor(
    private readonly wsAuthService: GraphqlWsAuthService,
    private readonly userLoader: UserLoader,
    private readonly apiKeyLoader: ApiKeyLoader,
    private readonly eventTypeLoader: EventTypeLoader,
    private readonly industryTypeLoader: IndustryTypeLoader,
    private readonly tagLoader: TagLoader,
  ) {}

  /**
   * 创建 WebSocket 连接上下文
   */
  async createConnectionContext(
    connectionParams: any,
    websocket: any,
    context: any,
  ): Promise<GraphqlContext> {
    try {
      // 认证连接，会抛出具体错误信息
      const user = await this.wsAuthService.authenticateConnection(connectionParams);

      // 创建增强的请求对象
      const request: AugmentedRequest = {
        headers: {},
        user,
        websocket,
        connectionParams,
      } as any;

      // 创建 GraphQL 上下文，包含所有必要的 loaders
      return {
        req: request,
        res: {} as any, // WebSocket 连接没有 Response 对象
        loaders: {
          userById: this.userLoader.create(),
          apiKeyById: this.apiKeyLoader.create(() => {
            return user?.userId;
          }),
          eventTypeById: this.eventTypeLoader.create(),
          industryTypeById: this.industryTypeLoader.create(),
          tagById: this.tagLoader.createById(),
          tagsByEventId: this.tagLoader.createByEventId(),
        } satisfies GraphqlLoaders,
      };
    } catch (error) {
      // 重新抛出认证错误，让上层处理
      throw error;
    }
  }
}
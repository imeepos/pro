import { randomUUID } from 'crypto';
import { GraphqlWsAuthService } from '../services/graphql-ws-auth.service';
import { AugmentedRequest, GraphqlContext } from '../../common/utils/context.utils';
import { GraphqlLoaders } from '../../common/dataloaders/types';
import { UserLoader } from '../../user/user.loader';
import { ApiKeyLoader } from '../api-key.loader';
import { EventTypeLoader } from '../../events/event-type.loader';
import { IndustryTypeLoader } from '../../events/industry-type.loader';
import { TagLoader } from '../../events/tag.loader';
import { ConnectionGatekeeper, ConnectionRateLimitException } from '../services/connection-gatekeeper.service';

const GATEKEEPER_LEASE_TOKEN = Symbol('graphqlWsLease');

export const mapConnectionParamsToHeaders = (connectionParams: Record<string, unknown> | undefined) => {
  const headers: Record<string, string> = {};

  if (!connectionParams) {
    return headers;
  }

  const authorization = extractAuthorizationToken(connectionParams);
  if (authorization) {
    headers.authorization = authorization;
  }

  const apiKey = extractApiKey(connectionParams);
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  return headers;
};

const extractAuthorizationToken = (connectionParams: Record<string, unknown>) => {
  const token = connectionParams['authorization'];
  return typeof token === 'string' ? token : undefined;
};

const extractApiKey = (connectionParams: Record<string, unknown>) => {
  const candidates = ['x-api-key', 'apiKey', 'api_key'] as const;

  for (const key of candidates) {
    const value = connectionParams[key];

    if (typeof value === 'string') {
      return value;
    }
  }

  return undefined;
};

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
    private readonly connectionGatekeeper: ConnectionGatekeeper,
  ) {}

  /**
   * 创建 WebSocket 连接上下文
   */
  async createConnectionContext(
    connectionParams: any,
    websocket: any,
    context: any,
  ): Promise<GraphqlContext> {
    const clientIp = this.resolveClientIp(websocket, context);
    this.connectionGatekeeper.assertHandshakeAllowed(clientIp, 'graphql');

    try {
      // 认证连接，会抛出具体错误信息
      const user = await this.wsAuthService.authenticateConnection(connectionParams);
      const headers = mapConnectionParamsToHeaders(connectionParams);
      const connectionId = this.ensureConnectionId(websocket);
      const release = this.connectionGatekeeper.openLease(connectionId, {
        ip: clientIp,
        userId: user?.userId,
        namespace: 'graphql',
      });
      this.attachReleaseHook(websocket, release);

      // 创建增强的请求对象
      const request: AugmentedRequest = {
        headers,
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
      if (!(error instanceof ConnectionRateLimitException)) {
        this.connectionGatekeeper.recordHandshakeFailure(clientIp, 'graphql');
      }
      // 重新抛出认证错误，让上层处理
      throw error;
    }
  }

  private resolveClientIp(websocket: any, context: any): string | undefined {
    const forwarded = context?.connectionParams?.['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim();
    }

    const requestIp = context?.extra?.request?.headers?.['x-forwarded-for'];
    if (typeof requestIp === 'string') {
      return requestIp.split(',')[0]?.trim();
    }

    const socketAddress =
      context?.extra?.socket?.remoteAddress ??
      websocket?.socket?.remoteAddress ??
      websocket?._socket?.remoteAddress;

    return socketAddress ?? undefined;
  }

  private ensureConnectionId(websocket: any): string {
    if (websocket?.[GATEKEEPER_LEASE_TOKEN]?.connectionId) {
      return websocket[GATEKEEPER_LEASE_TOKEN].connectionId;
    }

    const connectionId = randomUUID();

    if (!websocket[GATEKEEPER_LEASE_TOKEN]) {
      websocket[GATEKEEPER_LEASE_TOKEN] = {};
    }

    websocket[GATEKEEPER_LEASE_TOKEN].connectionId = connectionId;
    return connectionId;
  }

  private attachReleaseHook(websocket: any, release: () => void): void {
    const container = websocket[GATEKEEPER_LEASE_TOKEN] ?? {};

    if (!container.releaseAttached) {
      websocket.once?.('close', release);
      websocket.once?.('error', release);
      container.releaseAttached = true;
    }

    container.release = release;
    websocket[GATEKEEPER_LEASE_TOKEN] = container;
  }
}

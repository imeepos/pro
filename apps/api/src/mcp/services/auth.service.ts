import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyService } from '../../auth/api-key.service';
import { AugmentedRequest } from '../../common/utils/context.utils';
import type { ApiKeyEntity, UserEntity } from '@pro/entities';

interface AuthenticatedPrincipal {
  request: AugmentedRequest;
  apiKey: ApiKeyEntity;
  user: UserEntity;
}

@Injectable()
export class McpAuthService {
  private readonly configurationKey = 'MCP_GRAPHQL_API_KEY';

  constructor(
    private readonly configService: ConfigService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async buildAuthenticatedRequest(): Promise<AuthenticatedPrincipal> {
    const apiKey = this.resolveApiKeyFromConfig();
    const validation = await this.apiKeyService.validateApiKey(apiKey);
    const request = this.composeRequestSkeleton(apiKey, validation.user, validation.apiKey);
    return {
      request,
      apiKey: validation.apiKey,
      user: validation.user,
    };
  }

  private resolveApiKeyFromConfig(): string {
    const apiKey = this.configService.get<string>(this.configurationKey);
    if (!apiKey) {
      throw new UnauthorizedException(`MCP 工具未配置 ${this.configurationKey}`);
    }
    return apiKey;
  }

  private composeRequestSkeleton(
    rawKey: string,
    user: UserEntity,
    apiKeyEntity: ApiKeyEntity,
  ): AugmentedRequest {
    const lowerCaseHeaders: Record<string, string> = {
      'x-api-key': rawKey,
    };

    const buildHeaderAccessor = () => {
      function accessor(name: 'set-cookie'): string[];
      function accessor(name: string): string;
      function accessor(name: string): string | string[] {
        const normalized = name.toLowerCase();
        if (normalized === 'set-cookie') {
          return [];
        }
        return lowerCaseHeaders[normalized] ?? '';
      }
      return accessor as AugmentedRequest['get'];
    };

    const requestHeaderAccessor = buildHeaderAccessor();

    const request = {
      method: 'POST',
      url: '/mcp/tools/execute_graphql_query',
      originalUrl: '/mcp/tools/execute_graphql_query',
      path: '/mcp/tools/execute_graphql_query',
      headers: lowerCaseHeaders,
      hostname: 'localhost',
      protocol: 'http',
      ip: '127.0.0.1',
      secure: false,
      query: {},
      body: {},
      get: requestHeaderAccessor,
      header: requestHeaderAccessor,
      user: {
        userId: user.id,
        username: user.username,
        email: user.email,
        permissions: apiKeyEntity.permissions ?? [],
      },
      apiKey: apiKeyEntity,
      connectionParams: undefined,
      websocket: undefined,
    } as unknown as AugmentedRequest;

    return request;
  }
}

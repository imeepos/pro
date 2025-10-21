import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { GraphqlWsAuthService } from '../services/graphql-ws-auth.service';
import { AugmentedRequest, GraphqlContext } from '../../common/utils/context.utils';
import { GraphqlLoaders } from '../../common/dataloaders/types';
import { UserLoader } from '../../user/user.loader';
import { ApiKeyLoader } from '../api-key.loader';
import { EventTypeLoader } from '../../events/event-type.loader';
import { IndustryTypeLoader } from '../../events/industry-type.loader';
import { TagLoader } from '../../events/tag.loader';
import { ConnectionGatekeeper, ConnectionRateLimitException } from '../services/connection-gatekeeper.service';
import { ConnectionMetricsService } from '../../monitoring/connection-metrics.service';

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

export class GraphqlWsContextCreator {
  private readonly logger = new Logger('GraphqlWsHandshake');

  constructor(
    private readonly wsAuthService: GraphqlWsAuthService,
    private readonly userLoader: UserLoader,
    private readonly apiKeyLoader: ApiKeyLoader,
    private readonly eventTypeLoader: EventTypeLoader,
    private readonly industryTypeLoader: IndustryTypeLoader,
    private readonly tagLoader: TagLoader,
    private readonly connectionGatekeeper: ConnectionGatekeeper,
    private readonly connectionMetrics: ConnectionMetricsService,
  ) {}

  async createConnectionContext(
    connectionParams: any,
    websocket: any,
    context: any,
  ): Promise<GraphqlContext> {
    const params = this.normalizeParams(connectionParams);
    const connectionId = this.ensureConnectionId(websocket);
    const clientIp = this.resolveClientIp(websocket, context);
    const sessionFingerprint = this.resolveSessionFingerprint(params);
    this.logger.log(
      `[${connectionId}] connection_init ip=${clientIp ?? 'unknown'} fingerprint=${sessionFingerprint ?? 'unknown'} auth=${
        typeof params.authorization === 'string' ? 'present' : 'absent'
      } apikey=${extractApiKey(params) ? 'present' : 'absent'}`,
    );

    try {
      this.connectionGatekeeper.assertHandshakeAllowed(clientIp, 'graphql');
      const user = await this.wsAuthService.authenticateConnection(params);
      const headers = mapConnectionParamsToHeaders(params);
      const connectedAt = Date.now();
      const release = this.connectionGatekeeper.openLease(connectionId, {
        ip: clientIp,
        userId: user?.userId,
        namespace: 'graphql',
      });
      this.connectionMetrics.recordConnectionOpened('graphql', 'graphql-ws');
      this.attachReleaseHook(websocket, release, connectedAt, user?.userId);
      this.logger.log(
        `[${connectionId}] connection_ack viewer=${user?.userId ?? 'anonymous'} fingerprint=${sessionFingerprint ?? 'unknown'}`,
      );

      const request: AugmentedRequest = {
        headers,
        user,
        websocket,
        connectionParams: params,
      } as any;

      return {
        req: request,
        res: {} as any,
        loaders: {
          userById: this.userLoader.create(),
          apiKeyById: this.apiKeyLoader.create(() => user?.userId),
          eventTypeById: this.eventTypeLoader.create(),
          industryTypeById: this.industryTypeLoader.create(),
          tagById: this.tagLoader.createById(),
          tagsByEventId: this.tagLoader.createByEventId(),
        } satisfies GraphqlLoaders,
      };
    } catch (error) {
      this.handleConnectionError(error, connectionId, clientIp, sessionFingerprint);
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

  private attachReleaseHook(websocket: any, release: () => void, connectedAt: number, viewerId?: string): void {
    const container = websocket[GATEKEEPER_LEASE_TOKEN] ?? {};
    container.startedAt = connectedAt;
    container.viewerId = viewerId;

    let closed = false;

    const finalize = () => {
      if (closed) {
        return;
      }
      closed = true;
      const finishedAt = Date.now();
      const durationMs = Math.max(finishedAt - connectedAt, 0);
      this.connectionMetrics.recordConnectionClosed('graphql', 'graphql-ws', durationMs);
      release();
      this.logger.log(
        `[${container.connectionId ?? 'unknown'}] connection_closed viewer=${container.viewerId ?? 'unknown'} duration=${durationMs}ms`,
      );
    };

    if (!container.releaseAttached) {
      websocket.once?.('close', finalize);
      websocket.once?.('error', finalize);
      container.releaseAttached = true;
    }

    container.release = finalize;
    websocket[GATEKEEPER_LEASE_TOKEN] = container;
  }

  private resolveAuthFailureCode(cause: unknown): string {
    const message = cause instanceof Error ? cause.message : String(cause ?? 'unknown');

    if (/缺少授权|missing authorization/i.test(message)) {
      return 'missing_authorization';
    }

    if (/格式无效|invalid format/i.test(message)) {
      return 'invalid_token_format';
    }

    if (/过期|expired/i.test(message)) {
      return 'token_expired';
    }

    if (/失效|revoked/i.test(message)) {
      return 'token_revoked';
    }

    return 'authentication_failed';
  }

  private handleConnectionError(
    error: unknown,
    connectionId: string,
    clientIp: string | undefined,
    sessionFingerprint: string | undefined,
  ) {
    const message = error instanceof Error ? error.message : String(error ?? 'unknown');
    this.logger.warn(
      `[${connectionId}] connection_rejected ip=${clientIp ?? 'unknown'} fingerprint=${sessionFingerprint ?? 'unknown'} reason=${message}`,
    );

    if (error instanceof ConnectionRateLimitException) {
      this.connectionMetrics.recordRejection('graphql', 'rate_limited');
      return;
    }

    this.connectionGatekeeper.recordHandshakeFailure(clientIp, 'graphql');
    this.connectionMetrics.recordAuthFailure('graphql', this.resolveAuthFailureCode(error));
    this.connectionMetrics.recordRejection('graphql', 'auth_failed');
  }

  private resolveSessionFingerprint(connectionParams: Record<string, unknown>): string | undefined {
    const fingerprintCandidate = connectionParams['sessionFingerprint'] ?? connectionParams['fingerprint'];
    if (typeof fingerprintCandidate !== 'string') {
      return undefined;
    }

    const trimmed = fingerprintCandidate.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeParams(connectionParams: any): Record<string, unknown> {
    if (connectionParams && typeof connectionParams === 'object') {
      return connectionParams as Record<string, unknown>;
    }

    return {};
  }
}

import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@pro/types';
import { RedisClient } from '@pro/redis';

export type ViewerTokenVerificationStatus = 'valid' | 'blacklisted' | 'expired' | 'invalid';

export interface ViewerTokenVerificationInput {
  token: string;
  secret: string;
  jwtService: JwtService;
  redisClient: RedisClient;
  blacklistKeyPrefix: string;
}

export interface ViewerTokenVerificationResult {
  status: ViewerTokenVerificationStatus;
  payload?: JwtPayload;
  expiresAt?: string;
  blacklistTtlSeconds?: number;
  reason?: string;
  tokenFingerprint: string;
}

export const fingerprintToken = (token: string): string => {
  const hash = createHash('sha256').update(token).digest('hex');
  return `${hash.slice(0, 12)}…${hash.slice(-4)}`;
};

export async function verifyViewerToken({
  token,
  secret,
  jwtService,
  redisClient,
  blacklistKeyPrefix,
}: ViewerTokenVerificationInput): Promise<ViewerTokenVerificationResult> {
  const trimmed = token.trim();
  const tokenFingerprint = fingerprintToken(trimmed);
  const blacklistKey = `${blacklistKeyPrefix}${trimmed}`;

  const isBlacklisted = await redisClient.exists(blacklistKey);
  if (isBlacklisted) {
    const ttl = await redisClient.ttl(blacklistKey);
    return {
      status: 'blacklisted',
      blacklistTtlSeconds: ttl > 0 ? ttl : undefined,
      reason: 'Token is present in Redis blacklist',
      tokenFingerprint,
    };
  }

  try {
    const payload = jwtService.verify<JwtPayload>(trimmed, { secret });
    const expiresAt = resolveExpiration(payload);

    return {
      status: 'valid',
      payload,
      expiresAt,
      tokenFingerprint,
    };
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError') {
      return {
        status: 'expired',
        payload: error?.payload,
        expiresAt: resolveExpiration(error?.payload),
        reason: 'Token expired',
        tokenFingerprint,
      };
    }

    return {
      status: 'invalid',
      reason: error?.message ?? 'Token verification failed',
      tokenFingerprint,
    };
  }
}

const resolveExpiration = (payload?: JwtPayload): string | undefined => {
  const expiresAt = payload?.exp;
  if (!expiresAt) {
    return undefined;
  }

  const expiresAtMs = Number(expiresAt) * 1000;
  if (Number.isNaN(expiresAtMs)) {
    return undefined;
  }

  return new Date(expiresAtMs).toISOString();
};

import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisClient } from '@pro/redis';
import { redisConfigFactory } from '../src/config';
import { TOKEN_BLACKLIST_PREFIX } from '../src/auth/services/graphql-ws-auth.service';
import { verifyViewerToken } from '../src/auth/utils/viewer-token.verifier';

async function main() {
  const token = process.argv[2];

  if (!token) {
    console.error('Usage: pnpm ts-node scripts/verify-viewer-token.ts <jwt-token>');
    process.exitCode = 1;
    return;
  }

  const config = new ConfigService(process.env as Record<string, unknown>);
  const secret = config.get<string>('JWT_SECRET', 'your-jwt-secret-change-in-production');
  const redisClient = new RedisClient(redisConfigFactory(config));
  const jwtService = new JwtService({});

  try {
    const result = await verifyViewerToken({
      token,
      secret,
      jwtService,
      redisClient,
      blacklistKeyPrefix: TOKEN_BLACKLIST_PREFIX,
    });

    const payload = result.payload ?? {};
    const printable = {
      status: result.status,
      tokenFingerprint: result.tokenFingerprint,
      viewerId: (payload as any)?.userId,
      expiresAt: result.expiresAt,
      blacklistTtlSeconds: result.blacklistTtlSeconds,
      reason: result.reason,
    };

    console.log(JSON.stringify(printable, null, 2));
  } catch (error) {
    console.error(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await redisClient.close().catch(() => undefined);
  }
}

main();

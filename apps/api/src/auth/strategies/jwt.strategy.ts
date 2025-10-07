import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@pro/types';
import { RedisClient } from '@pro/redis';
import { getRedisConfig } from '../../config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private redisClient: RedisClient;
  private readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:';

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
      passReqToCallback: true,
    });
    this.redisClient = new RedisClient(getRedisConfig());
  }

  async validate(req: any, payload: JwtPayload): Promise<JwtPayload> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (token) {
      const isBlacklisted = await this.redisClient.exists(
        `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
      );

      if (isBlacklisted) {
        throw new UnauthorizedException('Token 已失效');
      }
    }

    return payload;
  }
}

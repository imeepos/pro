import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@pro/types';
import { RedisClient } from '@pro/redis';
import { ConfigService } from '@nestjs/config';
import { root } from '@pro/core';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:';

  private get redis() {
    return root.get(RedisClient);
  }

  constructor(@Inject() private readonly config: ConfigService) {
    super({
      // 支持从 Authorization header 或 URL query 参数提取 token
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => req.query?.token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', 'your-jwt-secret-change-in-production'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload): Promise<JwtPayload> {
    const token =
      ExtractJwt.fromAuthHeaderAsBearerToken()(req) || req.query?.token;

    if (token) {
      const isBlacklisted = await this.redis.exists(
        `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
      );

      if (isBlacklisted) {
        throw new UnauthorizedException('Token 已失效');
      }
    }

    return payload;
  }
}

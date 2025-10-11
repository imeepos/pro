import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@pro/types';
import { RedisClient } from '@pro/redis';
import { redisConfigFactory } from '../../config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private redisClient: RedisClient;
  private readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:';

  constructor(@Inject() private readonly config: ConfigService) {
    super({
      // 支持从 Authorization header 或 URL query 参数提取 token
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => req.query?.token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', 'ymm-123456'),
      passReqToCallback: true,
    });
    this.redisClient = new RedisClient(redisConfigFactory(config));
  }

  async validate(req: any, payload: JwtPayload): Promise<JwtPayload> {
    const token =
      ExtractJwt.fromAuthHeaderAsBearerToken()(req) || req.query?.token;

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

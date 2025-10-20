import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const jwtConfigFactory = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_SECRET', 'your-jwt-secret-change-in-production'),
  signOptions: {
    expiresIn: configService.get<any>('JWT_ACCESS_EXPIRES_IN', '1h'),
  },
});

export const createJwtConfig = () => ({
  inject: [ConfigService],
  useFactory: jwtConfigFactory,
});

export const getRefreshTokenExpiresIn = (configService: ConfigService): string =>
  configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

export const getAccessTokenExpiresIn = (configService: ConfigService): string =>
  configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1h');

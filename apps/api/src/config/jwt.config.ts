import { JwtModuleOptions } from '@nestjs/jwt';

export const getJwtConfig = (): JwtModuleOptions => ({
  secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
  signOptions: {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
  } as any,
});

export const getRefreshTokenExpiresIn = (): string =>
  process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const getAccessTokenExpiresIn = (): string =>
  process.env.JWT_ACCESS_EXPIRES_IN || '1h';

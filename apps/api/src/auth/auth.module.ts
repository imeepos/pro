import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthController } from './auth.controller';
import { ApiKeyController } from './api-key.controller';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { ApiKeyOwnerGuard } from './guards/api-key-owner.guard';
import { ApiKeyRateLimitGuard } from './guards/api-key-rate-limit.guard';
import { UserEntity } from '../entities/user.entity';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { getJwtConfig } from '../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, ApiKeyEntity]),
    PassportModule,
    JwtModule.register(getJwtConfig()),
    CacheModule.register(),
  ],
  controllers: [AuthController, ApiKeyController],
  providers: [
    AuthService,
    ApiKeyService,
    JwtStrategy,
    ApiKeyStrategy,
    ApiKeyOwnerGuard,
    ApiKeyRateLimitGuard,
  ],
  exports: [AuthService, ApiKeyService],
})
export class AuthModule {}

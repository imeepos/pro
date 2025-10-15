import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { ApiKeyController } from './api-key.controller';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { ApiKeyOwnerGuard } from './guards/api-key-owner.guard';
import { UserEntity, ApiKeyEntity } from '@pro/entities';
import { createJwtConfig } from '../config';
import { AuthResolver } from './auth.resolver';
import { ApiKeyResolver } from './api-key.resolver';
import { ApiKeyLoader } from './api-key.loader';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, ApiKeyEntity]),
    PassportModule,
    JwtModule.registerAsync(createJwtConfig()),
  ],
  controllers: [AuthController, ApiKeyController],
  providers: [
    AuthService,
    ApiKeyService,
    JwtStrategy,
    ApiKeyStrategy,
    ApiKeyOwnerGuard,
    AuthResolver,
    ApiKeyResolver,
    ApiKeyLoader,
  ],
  exports: [AuthService, ApiKeyService, ApiKeyLoader],
})
export class AuthModule {}

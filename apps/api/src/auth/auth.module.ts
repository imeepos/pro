import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { UserEntity } from '../entities/user.entity';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { getJwtConfig } from '../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, ApiKeyEntity]),
    PassportModule,
    JwtModule.register(getJwtConfig()),
  ],
  controllers: [AuthController],
  providers: [AuthService, ApiKeyService, JwtStrategy, ApiKeyStrategy],
  exports: [AuthService, ApiKeyService],
})
export class AuthModule {}

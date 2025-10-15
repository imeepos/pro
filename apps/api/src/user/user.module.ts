import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserEntity } from '@pro/entities';
import { UserResolver } from './user.resolver';
import { UserLoader } from './user.loader';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UserController],
  providers: [UserService, UserResolver, UserLoader],
  exports: [UserService, UserLoader],
})
export class UserModule {}

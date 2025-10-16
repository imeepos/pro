import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserEntity } from '@pro/entities';
import { UserResolver } from './user.resolver';
import { UserLoader } from './user.loader';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [],
  providers: [UserService, UserResolver, UserLoader],
  exports: [UserService, UserLoader],
})
export class UserModule {}

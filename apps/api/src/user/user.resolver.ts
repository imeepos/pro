import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UserModel } from './models/user.model';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto';
import { GraphqlLoaders } from '../common/dataloaders/types';

@Resolver(() => UserModel)
@UseGuards(JwtAuthGuard)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => [UserModel], { name: 'users' })
  async findUsers() {
    return this.userService.findAll();
  }

  @Query(() => UserModel, { name: 'user' })
  async findUser(
    @Args('id', { type: () => String }) id: string,
    @Context('loaders') loaders: GraphqlLoaders,
  ) {
    const user = await loaders.userById.load(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  @Mutation(() => UserModel, { name: 'updateUser' })
  async updateUser(
    @Args('id', { type: () => String }) id: string,
    @Args('input', { type: () => UpdateUserDto }) input: UpdateUserDto,
  ) {
    return this.userService.update(id, input);
  }

  @Mutation(() => Boolean, { name: 'removeUser' })
  async removeUser(@Args('id', { type: () => String }) id: string) {
    await this.userService.remove(id);
    return true;
  }
}

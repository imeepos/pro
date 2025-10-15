import { BadRequestException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { AuthPayload } from './models/auth.model';
import { UserModel } from '../user/models/user.model';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AugmentedRequest } from '../common/utils/context.utils';
import { GraphqlLoaders } from '../common/dataloaders/types';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload, { name: 'register' })
  async register(@Args('input', { type: () => RegisterDto }) input: RegisterDto) {
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayload, { name: 'login' })
  async login(@Args('input', { type: () => LoginDto }) input: LoginDto) {
    return this.authService.login(input);
  }

  @Mutation(() => AuthPayload, { name: 'refreshToken' })
  async refresh(@Args('input', { type: () => RefreshTokenDto }) input: RefreshTokenDto) {
    return this.authService.refreshToken(input);
  }

  @Mutation(() => Boolean, { name: 'logout' })
  @UseGuards(JwtAuthGuard)
  async logout(@Context('req') req: AugmentedRequest) {
    const authorization = req.headers.authorization;
    const token = authorization?.replace(/^Bearer\\s+/i, '');

    if (!token) {
      throw new BadRequestException('无效的 Token');
    }

    await this.authService.logout(token);
    return true;
  }

  @Query(() => UserModel, { name: 'me' })
  @UseGuards(JwtAuthGuard)
  async me(
    @CurrentUser('userId') userId: string,
    @Context('loaders') loaders: GraphqlLoaders,
  ) {
    if (!userId) {
      throw new UnauthorizedException('用户不存在');
    }

    const user = await loaders.userById.load(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return user;
  }
}

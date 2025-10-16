import { UseGuards } from '@nestjs/common';
import { Args, Context, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ScreensService } from './screens.service';
import { CreateScreenDto, UpdateScreenDto } from './dto';
import { ScreenModel, ScreenConnection, mapScreenEntityToModel } from './models/screen.model';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GraphqlLoaders } from '../common/dataloaders/types';
import { UserModel } from '../user/models/user.model';
import { User } from '@pro/types';
import { buildOffsetConnection } from '../common/utils/pagination.utils';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

@Resolver(() => ScreenModel)
@UseGuards(CompositeAuthGuard)
export class ScreensResolver {
  constructor(private readonly screensService: ScreensService) {}

  @Query(() => ScreenConnection, { name: 'screens' })
  async screens(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<ScreenConnection> {
    const currentPage = page ?? 1;
    const pageSize = limit ?? 10;

    const result = await this.screensService.findAll(currentPage, pageSize, userId);
    const nodes = result.items.map(mapScreenEntityToModel);
    return buildOffsetConnection(nodes, {
      total: result.total,
      page: result.page,
      pageSize: result.limit,
    });
  }

  @Query(() => ScreenConnection, { name: 'publishedScreens' })
  async publishedScreens(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<ScreenConnection> {
    const currentPage = page ?? 1;
    const pageSize = limit ?? 10;

    const result = await this.screensService.findPublished(currentPage, pageSize, userId);
    const nodes = result.items.map(mapScreenEntityToModel);
    return buildOffsetConnection(nodes, {
      total: result.total,
      page: result.page,
      pageSize: result.limit,
    });
  }

  @Query(() => ScreenModel, { name: 'screen' })
  async screen(@Args('id', { type: () => ID }) id: string): Promise<ScreenModel> {
    const screen = await this.screensService.findOne(id);
    return mapScreenEntityToModel(screen);
  }

  @Query(() => ScreenModel, { name: 'defaultScreen' })
  async defaultScreen(@CurrentUser('userId') userId: string): Promise<ScreenModel> {
    const screen = await this.screensService.getDefault(userId);
    return mapScreenEntityToModel(screen);
  }

  @Mutation(() => ScreenModel, { name: 'createScreen' })
  async createScreen(
    @Args('input', { type: () => CreateScreenDto }) input: CreateScreenDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ScreenModel> {
    const screen = await this.screensService.create(input, userId);
    return mapScreenEntityToModel(screen);
  }

  @Mutation(() => ScreenModel, { name: 'updateScreen' })
  async updateScreen(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateScreenDto }) input: UpdateScreenDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ScreenModel> {
    const screen = await this.screensService.update(id, input, userId);
    return mapScreenEntityToModel(screen);
  }

  @Mutation(() => Boolean, { name: 'removeScreen' })
  async removeScreen(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<boolean> {
    await this.screensService.remove(id, userId);
    return true;
  }

  @Mutation(() => ScreenModel, { name: 'copyScreen' })
  async copyScreen(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ScreenModel> {
    const screen = await this.screensService.copy(id, userId);
    return mapScreenEntityToModel(screen);
  }

  @Mutation(() => ScreenModel, { name: 'publishScreen' })
  async publishScreen(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ScreenModel> {
    const screen = await this.screensService.publish(id, userId);
    return mapScreenEntityToModel(screen);
  }

  @Mutation(() => ScreenModel, { name: 'draftScreen' })
  async draftScreen(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ScreenModel> {
    const screen = await this.screensService.draft(id, userId);
    return mapScreenEntityToModel(screen);
  }

  @Mutation(() => ScreenModel, { name: 'setDefaultScreen' })
  async setDefaultScreen(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ScreenModel> {
    const screen = await this.screensService.setDefault(id, userId);
    return mapScreenEntityToModel(screen);
  }

  @ResolveField(() => UserModel, { nullable: true })
  async creator(
    @Parent() screen: ScreenModel,
    @Context('loaders') loaders: GraphqlLoaders,
  ): Promise<UserModel | null> {
    if (!screen.createdBy) {
      return null;
    }

    const user = await loaders.userById.load(screen.createdBy);
    if (!user) {
      return null;
    }

    return mapUserToModel(user);
  }
}

const mapUserToModel = (user: User): UserModel => ({
  id: user.id,
  username: user.username,
  email: user.email,
  status: user.status,
  createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
  updatedAt: user.updatedAt instanceof Date ? user.updatedAt : new Date(user.updatedAt),
});

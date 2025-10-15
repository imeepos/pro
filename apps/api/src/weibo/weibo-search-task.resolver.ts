import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeiboSearchTaskService } from './weibo-search-task.service';
import {
  WeiboSearchTaskConnection,
  WeiboSearchTaskModel,
  mapWeiboSearchTaskEntityToModel,
} from './models/weibo-search-task.model';
import {
  CreateWeiboSearchTaskDto,
  UpdateWeiboSearchTaskDto,
  QueryTaskDto,
  PauseTaskDto,
  ResumeTaskDto,
  RunNowTaskDto,
} from './dto/weibo-search-task.dto';
import { buildOffsetConnection } from '../common/utils/pagination.utils';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Field, ObjectType } from '@nestjs/graphql';

@Resolver(() => WeiboSearchTaskModel)
@UseGuards(JwtAuthGuard)
export class WeiboSearchTaskResolver {
  constructor(private readonly weiboSearchTaskService: WeiboSearchTaskService) {}

  @Query(() => WeiboSearchTaskConnection, { name: 'weiboSearchTasks' })
  async tasks(
    @CurrentUser('userId') userId: string,
    @Args('filter', { type: () => QueryTaskDto, nullable: true }) filter?: QueryTaskDto,
  ): Promise<WeiboSearchTaskConnection> {
    const query = Object.assign(new QueryTaskDto(), filter);
    const result = await this.weiboSearchTaskService.findAll(userId, query);
    const nodes = result.tasks.map(mapWeiboSearchTaskEntityToModel);

    return buildOffsetConnection(nodes, {
      total: result.total,
      page: result.page,
      pageSize: result.limit,
    });
  }

  @Query(() => WeiboSearchTaskModel, { name: 'weiboSearchTask' })
  async task(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<WeiboSearchTaskModel> {
    const entity = await this.weiboSearchTaskService.findOne(userId, id);
    return mapWeiboSearchTaskEntityToModel(entity);
  }

  @Mutation(() => WeiboSearchTaskModel, { name: 'createWeiboSearchTask' })
  async createTask(
    @CurrentUser('userId') userId: string,
    @Args('input', { type: () => CreateWeiboSearchTaskDto }) input: CreateWeiboSearchTaskDto,
  ): Promise<WeiboSearchTaskModel> {
    const entity = await this.weiboSearchTaskService.create(userId, input);
    return mapWeiboSearchTaskEntityToModel(entity);
  }

  @Mutation(() => WeiboSearchTaskModel, { name: 'updateWeiboSearchTask' })
  async updateTask(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('input', { type: () => UpdateWeiboSearchTaskDto }) input: UpdateWeiboSearchTaskDto,
  ): Promise<WeiboSearchTaskModel> {
    const entity = await this.weiboSearchTaskService.update(userId, id, input);
    return mapWeiboSearchTaskEntityToModel(entity);
  }

  @Mutation(() => Boolean, { name: 'removeWeiboSearchTask' })
  async removeTask(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    await this.weiboSearchTaskService.delete(userId, id);
    return true;
  }

  @Mutation(() => WeiboSearchTaskModel, { name: 'pauseWeiboSearchTask' })
  async pauseTask(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('input', { type: () => PauseTaskDto, nullable: true }) input?: PauseTaskDto,
  ): Promise<WeiboSearchTaskModel> {
    const entity = await this.weiboSearchTaskService.pause(userId, id, input);
    return mapWeiboSearchTaskEntityToModel(entity);
  }

  @Mutation(() => WeiboSearchTaskModel, { name: 'resumeWeiboSearchTask' })
  async resumeTask(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('input', { type: () => ResumeTaskDto, nullable: true }) input?: ResumeTaskDto,
  ): Promise<WeiboSearchTaskModel> {
    const entity = await this.weiboSearchTaskService.resume(userId, id, input);
    return mapWeiboSearchTaskEntityToModel(entity);
  }

  @Mutation(() => WeiboSearchTaskModel, { name: 'runWeiboSearchTaskNow' })
  async runNow(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('input', { type: () => RunNowTaskDto, nullable: true }) input?: RunNowTaskDto,
  ): Promise<WeiboSearchTaskModel> {
    const entity = await this.weiboSearchTaskService.runNow(userId, id, input);
    return mapWeiboSearchTaskEntityToModel(entity);
  }

  @Mutation(() => Int, { name: 'pauseAllWeiboSearchTasks' })
  async pauseAll(@CurrentUser('userId') userId: string): Promise<number> {
    return this.weiboSearchTaskService.pauseAllTasks(userId);
  }

  @Mutation(() => Int, { name: 'resumeAllWeiboSearchTasks' })
  async resumeAll(@CurrentUser('userId') userId: string): Promise<number> {
    return this.weiboSearchTaskService.resumeAllTasks(userId);
  }

  @Query(() => WeiboSearchTaskStatsModel, { name: 'weiboSearchTaskStats' })
  async stats(@CurrentUser('userId') userId: string): Promise<WeiboSearchTaskStatsModel> {
    return this.weiboSearchTaskService.getTaskStats(userId);
  }
}

@ObjectType('WeiboSearchTaskStats')
class WeiboSearchTaskStatsModel {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  enabled: number;

  @Field(() => Int)
  running: number;

  @Field(() => Int)
  paused: number;

  @Field(() => Int)
  failed: number;

  @Field(() => Int)
  completed: number;
}

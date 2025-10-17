import { Args, Mutation, Query, Resolver, ID, ResolveField, Parent } from '@nestjs/graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { BugModel } from './models/bug.model';
import { BugCommentModel } from './models/bug-comment.model';
import { BugAttachmentModel } from './models/bug-attachment.model';
import { BugStatisticsModel } from './models/bug-statistics.model';
import { BugsPaginationModel } from './models/bugs-pagination.model';
import { BugService } from './bug.service';
import { BugCommentService } from './bug-comment.service';
import { BugAttachmentService } from './bug-attachment.service';
import {
  CreateBugInput,
  UpdateBugInput,
  BugFiltersInput,
  CreateBugCommentInput,
  UpdateBugStatusInput,
  AssignBugInput,
} from './dto/bug.input';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver(() => BugModel)
@UseGuards(CompositeAuthGuard)
export class BugResolver {
  private readonly logger = new Logger(BugResolver.name);

  constructor(
    private readonly bugService: BugService,
    private readonly commentService: BugCommentService,
    private readonly attachmentService: BugAttachmentService,
  ) {}

  @Mutation(() => BugModel, { name: 'createBug' })
  async createBug(
    @CurrentUser('userId') userId: string,
    @Args('input') input: CreateBugInput
  ): Promise<BugModel> {
    this.logger.log(`创建Bug: ${input.title}`);
    return this.bugService.create({
      ...input,
      reporterId: userId,
    });
  }

  @Query(() => BugsPaginationModel, { name: 'bugs' })
  async findBugs(
    @CurrentUser('userId') userId: string,
    @Args('filters', { nullable: true }) filters?: BugFiltersInput
  ): Promise<BugsPaginationModel> {
    this.logger.log(`查询Bug列表: ${JSON.stringify(filters)}`);
    return this.bugService.findAll(filters || {});
  }

  @Query(() => BugStatisticsModel, { name: 'bugStatistics' })
  async getBugStatistics(@CurrentUser('userId') userId: string): Promise<BugStatisticsModel> {
    this.logger.log('获取Bug统计信息');
    return this.bugService.getStatistics();
  }

  @Query(() => BugModel, { name: 'bug' })
  async findBug(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => ID }) id: string
  ): Promise<BugModel> {
    this.logger.log(`获取Bug详情: ${id}`);
    return this.bugService.findOne(id);
  }

  @Mutation(() => BugModel, { name: 'updateBug' })
  async updateBug(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateBugInput,
  ): Promise<BugModel> {
    this.logger.log(`更新Bug: ${id}`);
    return this.bugService.update(id, input);
  }

  @Mutation(() => Boolean, { name: 'removeBug' })
  async removeBug(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => ID }) id: string
  ): Promise<boolean> {
    this.logger.log(`删除Bug: ${id}`);
    await this.bugService.remove(id);
    return true;
  }

  @Mutation(() => BugCommentModel, { name: 'addBugComment' })
  async addComment(
    @CurrentUser('userId') userId: string,
    @Args('bugId', { type: () => ID }) bugId: string,
    @Args('input') input: CreateBugCommentInput,
  ): Promise<BugCommentModel> {
    this.logger.log(`为Bug ${bugId} 添加评论`);
    return this.commentService.create(bugId, input);
  }

  @Query(() => [BugCommentModel], { name: 'bugComments' })
  async getBugComments(
    @CurrentUser('userId') userId: string,
    @Args('bugId', { type: () => ID }) bugId: string
  ): Promise<BugCommentModel[]> {
    this.logger.log(`获取Bug ${bugId} 的评论`);
    return this.commentService.findByBugId(bugId);
  }

  @Mutation(() => BugModel, { name: 'updateBugStatus' })
  async updateStatus(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateBugStatusInput,
  ): Promise<BugModel> {
    this.logger.log(`更新Bug ${id} 状态为: ${input.status}`);
    return this.bugService.updateStatus(id, input.status, input.comment);
  }

  @Mutation(() => BugModel, { name: 'assignBug' })
  async assignBug(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: AssignBugInput,
  ): Promise<BugModel> {
    this.logger.log(`分配Bug ${id} 给用户: ${input.assigneeId}`);
    return this.bugService.assign(id, input.assigneeId);
  }

  @ResolveField(() => [BugCommentModel])
  async comments(@Parent() bug: BugModel): Promise<BugCommentModel[]> {
    return this.commentService.findByBugId(bug.id);
  }

  @ResolveField(() => [BugAttachmentModel])
  async attachments(@Parent() bug: BugModel): Promise<BugAttachmentModel[]> {
    return this.attachmentService.findByBugId(bug.id);
  }
}

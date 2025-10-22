import { UseGuards, NotFoundException } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PinoLogger } from '@pro/logger';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';
import { WeiboPostDataService } from './weibo-post-data.service';
import { WeiboCommentDataService } from './weibo-comment-data.service';
import { WeiboInteractionDataService } from './weibo-interaction-data.service';
import {
  PostFilterDto,
  CommentFilterDto,
  InteractionFilterDto,
  PaginationDto,
  SortDto,
} from './dto/weibo-data.dto';
import {
  WeiboPostConnection,
  WeiboPostModel,
  PostStatsModel,
  WeiboCommentConnection,
  WeiboCommentModel,
  CommentStatsModel,
  WeiboInteractionConnection,
  WeiboInteractionModel,
  InteractionStatsModel,
} from './models/weibo-data.model';

@Resolver()
@UseGuards(CompositeAuthGuard)
export class WeiboDataResolver {
  constructor(
    private readonly logger: PinoLogger,
    private readonly postService: WeiboPostDataService,
    private readonly commentService: WeiboCommentDataService,
    private readonly interactionService: WeiboInteractionDataService,
  ) {
    this.logger.setContext(WeiboDataResolver.name);
  }

  @Query(() => WeiboPostConnection)
  async weiboPosts(
    @Args('filter', { nullable: true }) filter?: PostFilterDto,
    @Args('pagination', { nullable: true }) pagination?: PaginationDto,
    @Args('sort', { nullable: true }) sort?: SortDto,
  ): Promise<WeiboPostConnection> {
    return this.postService.findPosts(filter, pagination, sort);
  }

  @Query(() => WeiboPostModel)
  async weiboPost(@Args('id') id: string): Promise<WeiboPostModel> {
    const post = await this.postService.findPostById(id);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }
    return this.postService['toModel'](post);
  }

  @Query(() => PostStatsModel)
  async weiboPostStats(
    @Args('filter', { nullable: true }) filter?: PostFilterDto,
  ): Promise<PostStatsModel> {
    return this.postService.getPostStats(filter);
  }

  @Query(() => WeiboCommentConnection)
  async weiboComments(
    @Args('filter', { nullable: true }) filter?: CommentFilterDto,
    @Args('pagination', { nullable: true }) pagination?: PaginationDto,
    @Args('sort', { nullable: true }) sort?: SortDto,
  ): Promise<WeiboCommentConnection> {
    return this.commentService.findComments(filter, pagination, sort);
  }

  @Query(() => WeiboCommentModel)
  async weiboComment(@Args('id') id: string): Promise<WeiboCommentModel> {
    const comment = await this.commentService.findCommentById(id);
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }
    return this.commentService['toModel'](comment);
  }

  @Query(() => CommentStatsModel)
  async weiboCommentStats(
    @Args('filter', { nullable: true }) filter?: CommentFilterDto,
  ): Promise<CommentStatsModel> {
    return this.commentService.getCommentStats(filter);
  }

  @Query(() => WeiboInteractionConnection)
  async weiboInteractions(
    @Args('filter', { nullable: true }) filter?: InteractionFilterDto,
    @Args('pagination', { nullable: true }) pagination?: PaginationDto,
    @Args('sort', { nullable: true }) sort?: SortDto,
  ): Promise<WeiboInteractionConnection> {
    return this.interactionService.findInteractions(filter, pagination, sort);
  }

  @Query(() => WeiboInteractionModel)
  async weiboInteraction(@Args('id') id: string): Promise<WeiboInteractionModel> {
    const interaction = await this.interactionService.findInteractionById(id);
    return this.interactionService['toModel'](interaction);
  }

  @Query(() => InteractionStatsModel)
  async weiboInteractionStats(
    @Args('filter', { nullable: true }) filter?: InteractionFilterDto,
  ): Promise<InteractionStatsModel> {
    return this.interactionService.getInteractionStats(filter);
  }
}

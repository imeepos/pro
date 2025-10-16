import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TagService } from './tag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { TagConnection, TagModel, mapTagEntityToModel } from './models/tag.model';
import { buildOffsetConnection } from '../common/utils/pagination.utils';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

@Resolver(() => TagModel)
@UseGuards(CompositeAuthGuard)
export class TagResolver {
  constructor(private readonly tagService: TagService) {}

  @Query(() => TagConnection, { name: 'tags' })
  async findAll(
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true }) pageSize?: number,
    @Args('keyword', { type: () => String, nullable: true }) keyword?: string,
  ): Promise<TagConnection> {
    const currentPage = page ?? 1;
    const currentPageSize = pageSize ?? 20;
    const pagination = await this.tagService.findAll(currentPage, currentPageSize, keyword);
    const nodes = pagination.items.map(mapTagEntityToModel);
    return buildOffsetConnection(nodes, {
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  }

  @Query(() => [TagModel], { name: 'popularTags' })
  async findPopular(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<TagModel[]> {
    const tags = await this.tagService.findPopular(limit ?? 20);
    return tags.map(mapTagEntityToModel);
  }

  @Query(() => TagModel, { name: 'tag' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<TagModel> {
    const tag = await this.tagService.findOne(id);
    return mapTagEntityToModel(tag);
  }

  @Mutation(() => TagModel, { name: 'createTag' })
  async create(@Args('input', { type: () => CreateTagDto }) input: CreateTagDto): Promise<TagModel> {
    const tag = await this.tagService.create(input);
    return mapTagEntityToModel(tag);
  }

  @Mutation(() => TagModel, { name: 'updateTag' })
  async update(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateTagDto }) input: UpdateTagDto,
  ): Promise<TagModel> {
    const tag = await this.tagService.update(id, input);
    return mapTagEntityToModel(tag);
  }

  @Mutation(() => Boolean, { name: 'removeTag' })
  async remove(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.tagService.remove(id);
    return true;
  }
}

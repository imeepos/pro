import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MediaTypeService } from './media-type.service';
import {
  CreateMediaTypeDto,
  QueryMediaTypeDto,
  UpdateMediaTypeDto,
} from './dto';
import {
  MediaTypeConnection,
  MediaTypeModel,
  mapMediaTypeEntityToModel,
} from './models/media-type.model';
import { buildOffsetConnection } from '../common/utils/pagination.utils';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

@Resolver(() => MediaTypeModel)
@UseGuards(CompositeAuthGuard)
export class MediaTypeResolver {
  constructor(private readonly mediaTypeService: MediaTypeService) {}

  @Query(() => MediaTypeConnection, { name: 'mediaTypes' })
  async mediaTypes(
    @Args('filter', { type: () => QueryMediaTypeDto, nullable: true }) filter?: QueryMediaTypeDto,
  ): Promise<MediaTypeConnection> {
    const dto = Object.assign(new QueryMediaTypeDto(), filter);
    const { list, total, page = 1, pageSize = 10 } = await this.mediaTypeService.findAll(dto);
    const nodes = list.map(mapMediaTypeEntityToModel);
    return buildOffsetConnection(nodes, {
      total,
      page: page ?? 1,
      pageSize: pageSize ?? 10,
    });
  }

  @Query(() => MediaTypeModel, { name: 'mediaType' })
  async mediaType(@Args('id', { type: () => Int }) id: number): Promise<MediaTypeModel> {
    const entity = await this.mediaTypeService.findOne(id);
    return mapMediaTypeEntityToModel(entity);
  }

  @Mutation(() => MediaTypeModel, { name: 'createMediaType' })
  async createMediaType(
    @Args('input', { type: () => CreateMediaTypeDto }) input: CreateMediaTypeDto,
  ): Promise<MediaTypeModel> {
    const entity = await this.mediaTypeService.create(input);
    return mapMediaTypeEntityToModel(entity);
  }

  @Mutation(() => MediaTypeModel, { name: 'updateMediaType' })
  async updateMediaType(
    @Args('id', { type: () => Int }) id: number,
    @Args('input', { type: () => UpdateMediaTypeDto }) input: UpdateMediaTypeDto,
  ): Promise<MediaTypeModel> {
    const entity = await this.mediaTypeService.update(id, input);
    return mapMediaTypeEntityToModel(entity);
  }

  @Mutation(() => Boolean, { name: 'removeMediaType' })
  async removeMediaType(@Args('id', { type: () => Int }) id: number): Promise<boolean> {
    await this.mediaTypeService.remove(id);
    return true;
  }
}

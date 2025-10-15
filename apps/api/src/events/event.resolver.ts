import { UseGuards } from '@nestjs/common';
import { Args, Context, Float, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { EventService } from './event.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateEventDto,
  EventMapQueryDto,
  EventQueryDto,
  UpdateEventDto,
} from './dto/event.dto';
import {
  EventConnection,
  EventMapPointModel,
  EventModel,
  mapEventEntityToMapPoint,
  mapEventEntityToModel,
} from './models/event.model';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { buildOffsetConnection } from '../common/utils/pagination.utils';
import { GraphqlLoaders } from '../common/dataloaders/types';
import { EventTypeModel, mapEventTypeEntityToModel } from './models/event-type.model';
import { IndustryTypeModel, mapIndustryTypeEntityToModel } from './models/industry-type.model';
import { TagModel, mapTagEntityToModel } from './models/tag.model';

@Resolver(() => EventModel)
@UseGuards(JwtAuthGuard)
export class EventResolver {
  constructor(private readonly eventService: EventService) {}

  @Query(() => EventConnection, { name: 'events' })
  async events(
    @Args('filter', { type: () => EventQueryDto, nullable: true }) filter?: EventQueryDto,
  ): Promise<EventConnection> {
    const { page = 1, pageSize = 20, ...rest } = filter ?? {};
    const result = await this.eventService.findAll({
      ...rest,
      page,
      pageSize,
    });

    const nodes = result.items.map(mapEventEntityToModel);
    return buildOffsetConnection(nodes, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  }

  @Query(() => [EventMapPointModel], { name: 'eventsForMap' })
  async eventsForMap(
    @Args('filter', { type: () => EventMapQueryDto, nullable: true }) filter?: EventMapQueryDto,
  ): Promise<EventMapPointModel[]> {
    const events = await this.eventService.findForMap(filter ?? {});
    return events.map(mapEventEntityToMapPoint);
  }

  @Query(() => [EventModel], { name: 'eventsNearby' })
  async eventsNearby(
    @Args('longitude', { type: () => Float }) longitude: number,
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('radius', { type: () => Float }) radius: number,
  ): Promise<EventModel[]> {
    const events = await this.eventService.findNearby(longitude, latitude, radius);
    return events.map(mapEventEntityToModel);
  }

  @Query(() => [EventModel], { name: 'eventsByTag' })
  async eventsByTag(@Args('tagId', { type: () => ID }) tagId: string): Promise<EventModel[]> {
    const events = await this.eventService.findByTag(tagId);
    return events.map(mapEventEntityToModel);
  }

  @Query(() => EventModel, { name: 'event' })
  async event(@Args('id', { type: () => ID }) id: string): Promise<EventModel> {
    const event = await this.eventService.findOne(id);
    return mapEventEntityToModel(event);
  }

  @Mutation(() => EventModel, { name: 'createEvent' })
  async createEvent(
    @Args('input', { type: () => CreateEventDto }) input: CreateEventDto,
    @CurrentUser('userId') userId: string,
  ): Promise<EventModel> {
    const event = await this.eventService.create(input, userId);
    return mapEventEntityToModel(event);
  }

  @Mutation(() => EventModel, { name: 'updateEvent' })
  async updateEvent(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateEventDto }) input: UpdateEventDto,
    @CurrentUser('userId') userId: string,
  ): Promise<EventModel> {
    const event = await this.eventService.update(id, input, userId);
    return mapEventEntityToModel(event);
  }

  @Mutation(() => Boolean, { name: 'removeEvent' })
  async removeEvent(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<boolean> {
    await this.eventService.remove(id, userId);
    return true;
  }

  @Mutation(() => EventModel, { name: 'publishEvent' })
  async publishEvent(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<EventModel> {
    const event = await this.eventService.publish(id, userId);
    return mapEventEntityToModel(event);
  }

  @Mutation(() => EventModel, { name: 'archiveEvent' })
  async archiveEvent(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<EventModel> {
    const event = await this.eventService.archive(id, userId);
    return mapEventEntityToModel(event);
  }

  @Mutation(() => EventModel, { name: 'addTagsToEvent' })
  async addTagsToEvent(
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('tagIds', { type: () => [ID] }) tagIds: string[],
  ): Promise<EventModel> {
    await this.eventService.addTagsToEvent(eventId, tagIds);
    const event = await this.eventService.findOne(eventId);
    return mapEventEntityToModel(event);
  }

  @Mutation(() => Boolean, { name: 'removeTagFromEvent' })
  async removeTagFromEvent(
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('tagId', { type: () => ID }) tagId: string,
  ): Promise<boolean> {
    await this.eventService.removeTagFromEvent(eventId, tagId);
    return true;
  }

  @ResolveField(() => EventTypeModel, { nullable: true })
  async eventType(
    @Parent() event: EventModel,
    @Context('loaders') loaders: GraphqlLoaders,
  ): Promise<EventTypeModel | null> {
    if (event.eventType) {
      return event.eventType;
    }

    const entity = await loaders.eventTypeById.load(event.eventTypeId);
    return entity ? mapEventTypeEntityToModel(entity) : null;
  }

  @ResolveField(() => IndustryTypeModel, { nullable: true })
  async industryType(
    @Parent() event: EventModel,
    @Context('loaders') loaders: GraphqlLoaders,
  ): Promise<IndustryTypeModel | null> {
    if (event.industryType) {
      return event.industryType;
    }

    const entity = await loaders.industryTypeById.load(event.industryTypeId);
    return entity ? mapIndustryTypeEntityToModel(entity) : null;
  }

  @ResolveField(() => [TagModel])
  async tags(
    @Parent() event: EventModel,
    @Context('loaders') loaders: GraphqlLoaders,
  ): Promise<TagModel[]> {
    if (event.tags && event.tags.length > 0) {
      return event.tags;
    }

    const tagEntities = await loaders.tagsByEventId.load(event.id);
    return tagEntities.map(mapTagEntityToModel);
  }
}

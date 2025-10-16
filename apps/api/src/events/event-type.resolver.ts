import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { EventTypeService } from './event-type.service';
import { CreateEventTypeDto, UpdateEventTypeDto } from './dto/event-type.dto';
import { EventTypeModel, mapEventTypeEntityToModel } from './models/event-type.model';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

@Resolver(() => EventTypeModel)
@UseGuards(CompositeAuthGuard)
export class EventTypeResolver {
  constructor(private readonly eventTypeService: EventTypeService) {}

  @Query(() => [EventTypeModel], { name: 'eventTypes' })
  async findAll(): Promise<EventTypeModel[]> {
    const types = await this.eventTypeService.findAll();
    return types.map(mapEventTypeEntityToModel);
  }

  @Query(() => EventTypeModel, { name: 'eventType' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<EventTypeModel> {
    const type = await this.eventTypeService.findOne(id);
    return mapEventTypeEntityToModel(type);
  }

  @Mutation(() => EventTypeModel, { name: 'createEventType' })
  async create(
    @Args('input', { type: () => CreateEventTypeDto }) input: CreateEventTypeDto,
  ): Promise<EventTypeModel> {
    const type = await this.eventTypeService.create(input);
    return mapEventTypeEntityToModel(type);
  }

  @Mutation(() => EventTypeModel, { name: 'updateEventType' })
  async update(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateEventTypeDto }) input: UpdateEventTypeDto,
  ): Promise<EventTypeModel> {
    const type = await this.eventTypeService.update(id, input);
    return mapEventTypeEntityToModel(type);
  }

  @Mutation(() => Boolean, { name: 'removeEventType' })
  async remove(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.eventTypeService.remove(id);
    return true;
  }
}

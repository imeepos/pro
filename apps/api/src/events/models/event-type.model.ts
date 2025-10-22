import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { EventTypeEntity } from '@pro/entities';

@ObjectType('EventType')
export class EventTypeModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  eventCode: string;

  @Field(() => String)
  eventName: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Int)
  status: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const mapEventTypeEntityToModel = (entity: EventTypeEntity): EventTypeModel => ({
  id: entity.id,
  eventCode: entity.eventCode,
  eventName: entity.eventName,
  description: entity.description ?? undefined,
  sortOrder: entity.sortOrder,
  status: entity.status,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

import { Field, GraphQLISODateTime, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { MediaTypeEntity, MediaTypeStatus } from '@pro/entities';
import { createOffsetConnectionType } from '../../common/models/pagination.model';

registerEnumType(MediaTypeStatus, {
  name: 'MediaTypeStatus',
  description: '媒体类型状态',
});

@ObjectType('MediaType')
export class MediaTypeModel {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  typeCode: string;

  @Field(() => String)
  typeName: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int)
  sort: number;

  @Field(() => MediaTypeStatus)
  status: MediaTypeStatus;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export class MediaTypeConnection extends createOffsetConnectionType(MediaTypeModel, 'MediaType') {}

export const mapMediaTypeEntityToModel = (entity: MediaTypeEntity): MediaTypeModel => ({
  id: entity.id,
  typeCode: entity.typeCode,
  typeName: entity.typeName,
  description: entity.description ?? undefined,
  sort: entity.sort,
  status: entity.status,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import { TagEntity } from '@pro/entities';
import { createOffsetConnectionType } from '../../common/models/pagination.model';

@ObjectType('Tag')
export class TagModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  tagName: string;

  @Field(() => String)
  tagColor: string;

  @Field(() => Int)
  usageCount: number;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

const TagConnectionBase = createOffsetConnectionType(TagModel, 'Tag');

@ObjectType()
export class TagConnection extends TagConnectionBase {}

export const mapTagEntityToModel = (tag: TagEntity): TagModel => ({
  id: tag.id,
  tagName: tag.tagName,
  tagColor: tag.tagColor,
  usageCount: tag.usageCount,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt,
});

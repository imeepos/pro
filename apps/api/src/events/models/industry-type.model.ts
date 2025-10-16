import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import { IndustryTypeEntity } from '@pro/entities';

@ObjectType('IndustryType')
export class IndustryTypeModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  industryCode: string;

  @Field(() => String)
  industryName: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Int)
  status: number;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export const mapIndustryTypeEntityToModel = (entity: IndustryTypeEntity): IndustryTypeModel => ({
  id: entity.id,
  industryCode: entity.industryCode,
  industryName: entity.industryName,
  description: entity.description ?? undefined,
  sortOrder: entity.sortOrder,
  status: entity.status,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

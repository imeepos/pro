import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

import { WeiboSearchTaskEntity } from '@pro/entities';

import { createOffsetConnectionType } from '../../common/models/pagination.model';

@ObjectType('WeiboSearchTask')
export class WeiboSearchTaskModel {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  keyword: string;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => String)
  crawlInterval: string;

  @Field(() => GraphQLISODateTime)
  startDate: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  latestCrawlTime?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  nextRunAt?: Date;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

const WeiboSearchTaskConnectionBase = createOffsetConnectionType(
  WeiboSearchTaskModel,
  'WeiboSearchTask',
);

@ObjectType()
export class WeiboSearchTaskConnection extends WeiboSearchTaskConnectionBase {}

export const mapWeiboSearchTaskEntityToModel = (
  entity: WeiboSearchTaskEntity,
): WeiboSearchTaskModel => ({
  id: entity.id,
  keyword: entity.keyword,
  enabled: entity.enabled,
  crawlInterval: entity.crawlInterval,
  startDate: entity.startDate,
  latestCrawlTime: entity.latestCrawlTime ?? undefined,
  nextRunAt: entity.nextRunAt ?? undefined,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});


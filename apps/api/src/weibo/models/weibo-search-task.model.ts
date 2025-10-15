import { Field, GraphQLISODateTime, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { createOffsetConnectionType } from '../../common/models/pagination.model';

registerEnumType(WeiboSearchTaskStatus, {
  name: 'WeiboSearchTaskStatus',
  description: '微博搜索任务状态',
});

@ObjectType('WeiboSearchTask')
export class WeiboSearchTaskModel {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  keyword: string;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => WeiboSearchTaskStatus)
  status: WeiboSearchTaskStatus;

  @Field(() => GraphQLISODateTime)
  startDate: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  nextRunAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  latestCrawlTime?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  currentCrawlTime?: Date;

  @Field(() => Int)
  progress: number;

  @Field(() => Int)
  totalSegments: number;

  @Field(() => Int)
  retryCount: number;

  @Field(() => Int)
  maxRetries: number;

  @Field(() => String, { nullable: true })
  errorMessage?: string;

  @Field(() => Boolean)
  enableAccountRotation: boolean;

  @Field(() => Int, { nullable: true })
  weiboAccountId?: number;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

export class WeiboSearchTaskConnection extends createOffsetConnectionType(WeiboSearchTaskModel, 'WeiboSearchTask') {}

export const mapWeiboSearchTaskEntityToModel = (entity: WeiboSearchTaskEntity): WeiboSearchTaskModel => ({
  id: entity.id,
  keyword: entity.keyword,
  enabled: entity.enabled,
  status: entity.status,
  startDate: entity.startDate,
  nextRunAt: entity.nextRunAt ?? undefined,
  latestCrawlTime: entity.latestCrawlTime ?? undefined,
  currentCrawlTime: entity.currentCrawlTime ?? undefined,
  progress: entity.progress,
  totalSegments: entity.totalSegments,
  retryCount: entity.retryCount,
  maxRetries: entity.maxRetries,
  errorMessage: entity.errorMessage ?? undefined,
  enableAccountRotation: entity.enableAccountRotation,
  weiboAccountId: entity.weiboAccountId ?? undefined,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

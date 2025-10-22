import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

import { WeiboSubTaskEntity } from '@pro/entities';

import { createOffsetConnectionType } from '../../common/models/pagination.model';

@ObjectType('WeiboSubTask')
export class WeiboSubTaskModel {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  taskId: number;

  @Field(() => JSON)
  metadata: Record<string, unknown>;

  @Field(() => String)
  type: string;

  @Field(() => String)
  status: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

const WeiboSubTaskConnectionBase = createOffsetConnectionType(
  WeiboSubTaskModel,
  'WeiboSubTask',
);

@ObjectType()
export class WeiboSubTaskConnection extends WeiboSubTaskConnectionBase {}

export const mapWeiboSubTaskEntityToModel = (
  entity: WeiboSubTaskEntity,
): WeiboSubTaskModel => ({
  id: entity.id,
  taskId: entity.taskId,
  metadata: entity.metadata,
  type: entity.type,
  status: entity.status,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
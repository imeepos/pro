import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { WeiboAccountEntity, WeiboAccountStatus } from '@pro/entities';
import { createOffsetConnectionType } from '../../common/models/pagination.model';

@ObjectType('WeiboAccount')
export class WeiboAccountModel {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  nickname: string;

  @Field(() => String, { nullable: true })
  avatar?: string;

  @Field(() => String)
  uid: string;

  @Field(() => String)
  status: WeiboAccountStatus;

  @Field(() => Boolean)
  hasCookies: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastCheckAt?: Date;
}

export class WeiboAccountConnection extends createOffsetConnectionType(WeiboAccountModel, 'WeiboAccount') {}

export const mapWeiboAccountEntityToModel = (entity: WeiboAccountEntity): WeiboAccountModel => ({
  id: entity.id,
  nickname: entity.weiboNickname ?? entity.weiboUid,
  avatar: entity.weiboAvatar ?? undefined,
  uid: entity.weiboUid,
  status: entity.status,
  hasCookies: Boolean(entity.cookies && entity.cookies.length > 0),
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
  lastCheckAt: entity.lastCheckAt ?? undefined,
});

import { Field, ID, ObjectType } from '@nestjs/graphql';
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

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  lastCheckAt?: Date;
}

const WeiboAccountConnectionBase = createOffsetConnectionType(WeiboAccountModel, 'WeiboAccount');

@ObjectType()
export class WeiboAccountConnection extends WeiboAccountConnectionBase {}

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

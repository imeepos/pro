import { Field, GraphQLISODateTime, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { WeiboLoginEvent, WeiboLoginEventType, WeiboLoginSessionSnapshot } from '../weibo-auth.service';

export enum WeiboLoginEventTypeEnum {
  Qrcode = 'qrcode',
  Status = 'status',
  Scanned = 'scanned',
  Success = 'success',
  Expired = 'expired',
  Error = 'error',
}

registerEnumType(WeiboLoginEventTypeEnum, {
  name: 'WeiboLoginEventType',
  description: '微博扫码登录事件类型',
});

@ObjectType('WeiboLoginEvent')
export class WeiboLoginEventModel {
  @Field(() => WeiboLoginEventTypeEnum)
  type: WeiboLoginEventTypeEnum;

  @Field(() => GraphQLJSONObject, { nullable: true })
  data?: Record<string, unknown>;
}

@ObjectType('WeiboLoginSession')
export class WeiboLoginSessionModel {
  @Field(() => String)
  sessionId: string;

  @Field(() => GraphQLISODateTime)
  expiresAt: Date;

  @Field(() => Boolean)
  expired: boolean;

  @Field(() => WeiboLoginEventModel, { nullable: true })
  lastEvent?: WeiboLoginEventModel;
}

const mapEventType = (type: WeiboLoginEventType): WeiboLoginEventTypeEnum => {
  switch (type) {
    case 'qrcode':
      return WeiboLoginEventTypeEnum.Qrcode;
    case 'status':
      return WeiboLoginEventTypeEnum.Status;
    case 'scanned':
      return WeiboLoginEventTypeEnum.Scanned;
    case 'success':
      return WeiboLoginEventTypeEnum.Success;
    case 'expired':
      return WeiboLoginEventTypeEnum.Expired;
    case 'error':
    default:
      return WeiboLoginEventTypeEnum.Error;
  }
};

export const mapWeiboLoginEventToModel = (event: WeiboLoginEvent): WeiboLoginEventModel => ({
  type: mapEventType(event.type),
  data: event.data ?? undefined,
});

export const mapWeiboLoginSnapshotToModel = (snapshot: WeiboLoginSessionSnapshot): WeiboLoginSessionModel => ({
  sessionId: snapshot.sessionId,
  expiresAt: snapshot.expiresAt,
  expired: snapshot.isExpired,
  lastEvent: snapshot.lastEvent ? mapWeiboLoginEventToModel(snapshot.lastEvent) : undefined,
});

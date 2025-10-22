import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { WeiboLoginEventType } from '@pro/types';
import { WeiboLoginEvent, WeiboLoginEventType as WeiboLoginEventTypeString, WeiboLoginSessionSnapshot } from '../weibo-auth.service';

registerEnumType(WeiboLoginEventType, {
  name: 'WeiboLoginEventType',
  description: '微博扫码登录事件类型',
});

@ObjectType('WeiboLoginEvent')
export class WeiboLoginEventModel {
  @Field(() => WeiboLoginEventType)
  type: WeiboLoginEventType;

  @Field(() => GraphQLJSONObject, { nullable: true })
  data?: Record<string, unknown>;
}

@ObjectType('WeiboLoginSession')
export class WeiboLoginSessionModel {
  @Field(() => String)
  sessionId: string;

  @Field(() => Date)
  expiresAt: Date;

  @Field(() => Boolean)
  expired: boolean;

  @Field(() => WeiboLoginEventModel, { nullable: true })
  lastEvent?: WeiboLoginEventModel;
}

const mapEventType = (type: WeiboLoginEventTypeString): WeiboLoginEventType => {
  switch (type) {
    case 'qrcode':
      return WeiboLoginEventType.Qrcode;
    case 'status':
      return WeiboLoginEventType.Status;
    case 'scanned':
      return WeiboLoginEventType.Scanned;
    case 'success':
      return WeiboLoginEventType.Success;
    case 'expired':
      return WeiboLoginEventType.Expired;
    case 'error':
    default:
      return WeiboLoginEventType.Error;
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

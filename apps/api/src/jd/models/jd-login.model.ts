import { Field, GraphQLISODateTime, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { JdLoginEventType } from '@pro/types';
import { JdLoginEvent, JdLoginEventType as JdLoginEventTypeString, JdLoginSessionSnapshot } from '../jd-auth.service';

registerEnumType(JdLoginEventType, {
  name: 'JdLoginEventType',
  description: '京东扫码登录事件类型',
});

@ObjectType('JdLoginEvent')
export class JdLoginEventModel {
  @Field(() => JdLoginEventType)
  type: JdLoginEventType;

  @Field(() => GraphQLJSONObject, { nullable: true })
  data?: Record<string, unknown>;
}

@ObjectType('JdLoginSession')
export class JdLoginSessionModel {
  @Field(() => String)
  sessionId: string;

  @Field(() => GraphQLISODateTime)
  expiresAt: Date;

  @Field(() => Boolean)
  expired: boolean;

  @Field(() => JdLoginEventModel, { nullable: true })
  lastEvent?: JdLoginEventModel;
}

const mapEventType = (type: JdLoginEventTypeString): JdLoginEventType => {
  switch (type) {
    case 'qrcode':
      return JdLoginEventType.Qrcode;
    case 'status':
      return JdLoginEventType.Status;
    case 'scanned':
      return JdLoginEventType.Scanned;
    case 'success':
      return JdLoginEventType.Success;
    case 'expired':
      return JdLoginEventType.Expired;
    case 'error':
    default:
      return JdLoginEventType.Error;
  }
};

export const mapJdLoginEventToModel = (event: JdLoginEvent): JdLoginEventModel => ({
  type: mapEventType(event.type),
  data: event.data ?? undefined,
});

export const mapJdLoginSnapshotToModel = (snapshot: JdLoginSessionSnapshot): JdLoginSessionModel => ({
  sessionId: snapshot.sessionId,
  expiresAt: snapshot.expiresAt,
  expired: snapshot.isExpired,
  lastEvent: snapshot.lastEvent ? mapJdLoginEventToModel(snapshot.lastEvent) : undefined,
});

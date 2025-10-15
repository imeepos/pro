import { Field, GraphQLISODateTime, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { JdLoginEvent, JdLoginEventType, JdLoginSessionSnapshot } from '../jd-auth.service';

export enum JdLoginEventTypeEnum {
  Qrcode = 'qrcode',
  Status = 'status',
  Scanned = 'scanned',
  Success = 'success',
  Expired = 'expired',
  Error = 'error',
}

registerEnumType(JdLoginEventTypeEnum, {
  name: 'JdLoginEventType',
  description: '京东扫码登录事件类型',
});

@ObjectType('JdLoginEvent')
export class JdLoginEventModel {
  @Field(() => JdLoginEventTypeEnum)
  type: JdLoginEventTypeEnum;

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

const mapEventType = (type: JdLoginEventType): JdLoginEventTypeEnum => {
  switch (type) {
    case 'qrcode':
      return JdLoginEventTypeEnum.Qrcode;
    case 'status':
      return JdLoginEventTypeEnum.Status;
    case 'scanned':
      return JdLoginEventTypeEnum.Scanned;
    case 'success':
      return JdLoginEventTypeEnum.Success;
    case 'expired':
      return JdLoginEventTypeEnum.Expired;
    case 'error':
    default:
      return JdLoginEventTypeEnum.Error;
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

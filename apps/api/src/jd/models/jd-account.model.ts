import { Field, GraphQLISODateTime, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { JdAccountStatus } from '@pro/types';
import { createOffsetConnectionType } from '../../common/models/pagination.model';
import { JdAccountSummary } from '../jd-account.service';

registerEnumType(JdAccountStatus, {
  name: 'JdAccountStatus',
  description: '京东账号当前状态',
});

@ObjectType('JdAccount')
export class JdAccountModel {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  jdUid: string;

  @Field(() => String, { nullable: true })
  jdNickname?: string;

  @Field(() => String, { nullable: true })
  jdAvatar?: string;

  @Field(() => JdAccountStatus)
  status: JdAccountStatus;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastCheckAt?: Date;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;
}

const JdAccountConnectionBase = createOffsetConnectionType(JdAccountModel, 'JdAccount');

@ObjectType()
export class JdAccountConnection extends JdAccountConnectionBase {}

@ObjectType('JdAccountStats')
export class JdAccountStatsModel {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  todayNew: number;

  @Field(() => Int)
  online: number;
}

@ObjectType('JdAccountCheckResult')
export class JdAccountCheckResultModel {
  @Field(() => Int)
  accountId: number;

  @Field(() => String)
  jdUid: string;

  @Field(() => JdAccountStatus)
  oldStatus: JdAccountStatus;

  @Field(() => JdAccountStatus)
  newStatus: JdAccountStatus;

  @Field(() => Boolean)
  statusChanged: boolean;

  @Field(() => String)
  message: string;

  @Field(() => GraphQLISODateTime)
  checkedAt: Date;
}

@ObjectType('JdAccountCheckSummary')
export class JdAccountCheckSummaryModel {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  checked: number;

  @Field(() => [JdAccountCheckResultModel])
  results: JdAccountCheckResultModel[];
}

export const mapJdAccountSummaryToModel = (summary: JdAccountSummary): JdAccountModel => ({
  id: summary.id,
  jdUid: summary.jdUid,
  jdNickname: summary.jdNickname,
  jdAvatar: summary.jdAvatar,
  status: summary.status,
  lastCheckAt: summary.lastCheckAt,
  createdAt: summary.createdAt,
});

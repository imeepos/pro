import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('WeiboLoggedInUsersStats')
export class WeiboLoggedInUsersStatsModel {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  todayNew: number;

  @Field(() => Int)
  online: number;
}

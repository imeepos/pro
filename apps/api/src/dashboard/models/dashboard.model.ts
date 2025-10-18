import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { DashboardActivityType } from '@pro/types';
import { DashboardStats, RecentActivity } from '../dto/dashboard.dto';

registerEnumType(DashboardActivityType, {
  name: 'DashboardActivityType',
  description: '仪表盘最近动态类别',
});

@ObjectType('DashboardStats')
export class DashboardStatsModel implements DashboardStats {
  @Field(() => Int)
  totalScreens: number;

  @Field(() => Int)
  totalEvents: number;

  @Field(() => Int)
  totalWeiboAccounts: number;

  @Field(() => Int)
  totalSearchTasks: number;
}

@ObjectType('DashboardActivity')
export class DashboardActivityModel implements RecentActivity {
  @Field(() => DashboardActivityType)
  type: DashboardActivityType;

  @Field(() => String)
  message: string;

  @Field(() => String)
  time: string;

  @Field(() => String, { nullable: true })
  entityId?: string;
}

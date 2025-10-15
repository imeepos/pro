import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardActivityModel, DashboardActivityType, DashboardStatsModel } from './models/dashboard.model';
import { RecentActivity } from './dto/dashboard.dto';

@Resolver()
@UseGuards(JwtAuthGuard)
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => DashboardStatsModel, { name: 'dashboardStats' })
  async stats(@CurrentUser('userId') userId: string): Promise<DashboardStatsModel> {
    return this.dashboardService.getStats(userId);
  }

  @Query(() => [DashboardActivityModel], { name: 'dashboardRecentActivities' })
  async recentActivities(
    @CurrentUser('userId') userId: string,
  ): Promise<DashboardActivityModel[]> {
    const activities = await this.dashboardService.getRecentActivities(userId);
    return activities.map(mapRecentActivityToModel);
  }
}

const mapRecentActivityToModel = (activity: RecentActivity): DashboardActivityModel => ({
  ...activity,
  type: activity.type as DashboardActivityType,
});

import { Observable, from } from 'rxjs';
import { GraphQLClient } from '../client/graphql-client.js';
import { DashboardStats, RecentActivity } from '../types/dashboard.types.js';

interface DashboardStatsResponse {
  dashboardStats: DashboardStats;
}

interface DashboardRecentActivitiesResponse {
  dashboardRecentActivities: RecentActivity[];
}

export class DashboardApi {
  private client: GraphQLClient;

  constructor(baseUrl?: string, tokenKey?: string) {
    if (!baseUrl) {
      throw new Error(`DashboardApi missing base url`);
    }
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  async getStats(): Promise<DashboardStats> {
    const query = `
      query DashboardStats {
        dashboardStats {
          totalScreens
          totalEvents
          totalWeiboAccounts
          totalSearchTasks
        }
      }
    `;

    const response = await this.client.query<DashboardStatsResponse>(query);
    return response.dashboardStats;
  }

  async getRecentActivities(): Promise<RecentActivity[]> {
    const query = `
      query DashboardRecentActivities {
        dashboardRecentActivities {
          type
          message
          time
          entityId
        }
      }
    `;

    const response = await this.client.query<DashboardRecentActivitiesResponse>(query);
    return response.dashboardRecentActivities;
  }

  getStats$ = (): Observable<DashboardStats> => {
    return from(this.getStats());
  };

  getRecentActivities$ = (): Observable<RecentActivity[]> => {
    return from(this.getRecentActivities());
  };
}

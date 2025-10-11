import { Observable } from 'rxjs';
import { HttpClient } from '../client/http-client.js';
import { DashboardStats, RecentActivity } from '../types/dashboard.types.js';

/**
 * Dashboard API 接口封装
 */
export class DashboardApi {
  private readonly http: HttpClient;

  constructor(baseUrl?: string, tokenKey?: string) {
    this.http = new HttpClient(baseUrl || 'http://localhost:3000', tokenKey);
  }

  /**
   * 获取 Dashboard 统计数据
   */
  async getStats(): Promise<DashboardStats> {
    return this.http.get<DashboardStats>('/api/dashboard/stats');
  }

  /**
   * 获取最近活动数据
   */
  async getRecentActivities(): Promise<RecentActivity[]> {
    return this.http.get<RecentActivity[]>('/api/dashboard/recent-activities');
  }

  /**
   * 获取 Dashboard 统计数据 (Observable 版本)
   */
  getStats$ = (): Observable<DashboardStats> => {
    return new Observable<DashboardStats>(subscriber => {
      this.getStats()
        .then(result => {
          subscriber.next(result);
          subscriber.complete();
        })
        .catch(error => {
          subscriber.error(error);
        });
    });
  };

  /**
   * 获取最近活动数据 (Observable 版本)
   */
  getRecentActivities$ = (): Observable<RecentActivity[]> => {
    return new Observable<RecentActivity[]>(subscriber => {
      this.getRecentActivities()
        .then(result => {
          subscriber.next(result);
          subscriber.complete();
        })
        .catch(error => {
          subscriber.error(error);
        });
    });
  };
}
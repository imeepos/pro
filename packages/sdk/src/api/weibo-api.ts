import { Observable } from 'rxjs';
import { HttpClient } from '../client/http-client';
import { getApiUrl } from '@pro/config';
import { LoggedInUsersStats } from '../types/weibo.types';

/**
 * 微博 API 接口封装
 */
export class WeiboApi {
  private http: HttpClient;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = getApiUrl();
    this.http = new HttpClient(this.baseUrl);
  }

  /**
   * 获取已登录用户统计信息
   */
  getLoggedInUsersStats(): Observable<LoggedInUsersStats> {
    return new Observable<LoggedInUsersStats>((subscriber) => {
      this.http.get<LoggedInUsersStats>('/api/weibo/logged-in-users/stats')
        .then((data) => {
          subscriber.next(data);
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }
}
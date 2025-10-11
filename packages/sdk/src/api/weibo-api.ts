import { Observable } from 'rxjs';
import { HttpClient } from '../client/http-client.js';
import { LoggedInUsersStats } from '../types/weibo.types.js';

/**
 * 微博 API 接口封装
 */
export class WeiboApi {
  private http: HttpClient;
  private readonly baseUrl: string;

  constructor(baseUrl?: string, tokenKey?: string) {
    this.baseUrl = baseUrl || 'http://localhost:3000';
    this.http = new HttpClient(this.baseUrl, tokenKey);
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
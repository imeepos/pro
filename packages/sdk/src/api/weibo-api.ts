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

    if (!this.isValidUrl(this.baseUrl)) {
      throw new Error(`无效的 baseUrl: ${this.baseUrl}，必须是有效的 HTTP/HTTPS URL`);
    }

    this.http = new HttpClient(this.baseUrl, tokenKey);
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
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
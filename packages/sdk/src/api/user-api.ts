import { HttpClient } from '../client/http-client';
import { User } from '@pro/types';
import { fromPromise } from '../utils/observable-adapter';
import { Observable } from 'rxjs';

/**
 * 用户 API 接口封装
 */
export class UserApi {
  private http: HttpClient;
  private readonly baseUrl: string;

  constructor(baseUrl?: string, tokenKey?: string) {
    this.baseUrl = baseUrl || 'http://localhost:3000';
    this.http = new HttpClient(this.baseUrl, tokenKey);
  }

  /**
   * 获取用户信息
   */
  getUserInfo(id: string): Observable<User> {
    const promise = this.http.get<User>(`/api/users/${id}`);
    return fromPromise(promise);
  }

  /**
   * 更新用户信息
   */
  updateUserInfo(id: string, data: Partial<User>): Observable<User> {
    const promise = this.http.put<User>(`/api/users/${id}`, data);
    return fromPromise(promise);
  }
}
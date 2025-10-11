import { Observable, from } from 'rxjs';
import { HttpClient } from '../client/http-client.js';
import { IAuthService } from '../auth.interface.js';
import { LoginDto, RegisterDto, AuthResponse, UserProfile } from '@pro/types';

/**
 * 认证 API 接口封装
 * 将 AuthApiService 功能迁移到 SDK 中
 */
export class AuthApi implements IAuthService {
  private http: HttpClient;

  constructor(baseUrl?: string, tokenKey?: string) {
    const apiBaseUrl = baseUrl || 'http://localhost:3000';
    this.http = new HttpClient(apiBaseUrl, tokenKey);
  }

  /**
   * 用户登录
   */
  login(dto: LoginDto): Observable<AuthResponse> {
    return from(this.http.post<AuthResponse>('/api/auth/login', dto));
  }

  /**
   * 用户注册
   */
  register(dto: RegisterDto): Observable<AuthResponse> {
    return from(this.http.post<AuthResponse>('/api/auth/register', dto));
  }

  /**
   * 用户登出
   */
  logout(): Observable<void> {
    return from(this.http.post<void>('/api/auth/logout', {}));
  }

  /**
   * 刷新访问令牌
   */
  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return from(this.http.post<AuthResponse>('/api/auth/refresh', { refreshToken }));
  }

  /**
   * 获取用户个人资料
   */
  getProfile(): Observable<UserProfile> {
    return from(this.http.get<UserProfile>('/api/auth/profile'));
  }
}
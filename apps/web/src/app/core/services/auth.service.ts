import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IAuthService } from '@pro/sdk';
import { LoginDto, RegisterDto, AuthResponse, UserProfile } from '@pro/types';
import { HttpClientService } from './http-client.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements IAuthService {
  constructor(private httpClient: HttpClientService) {}

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.httpClient.post<AuthResponse>('/auth/login', dto);
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    return this.httpClient.post<AuthResponse>('/auth/register', dto);
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>('/auth/logout');
  }

  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return this.httpClient.post<AuthResponse>('/auth/refresh', { refreshToken });
  }

  getProfile(): Observable<UserProfile> {
    return this.httpClient.get<UserProfile>('/auth/profile');
  }
}

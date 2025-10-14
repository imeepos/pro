import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, finalize, of, map } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthQuery } from './auth.query';
import { SkerSDK } from '@pro/sdk';
import { TokenStorageService } from '../core/services/token-storage.service';
import { LoginDto, RegisterDto, AuthResponse, User, UserProfile } from '@pro/types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sdk = inject(SkerSDK);
  private store = inject(AuthStore);
  private query = inject(AuthQuery);
  private tokenStorage = inject(TokenStorageService);
  private router = inject(Router);

  login(dto: LoginDto): Observable<AuthResponse> {
    this.setLoading(true);
    this.setError(null);

    return this.sdk.auth.login(dto).pipe(
      tap(response => {
        const actualResponse = (response as any).data || response;
        this.handleAuthSuccess(actualResponse);
      }),
      catchError(error => {
        this.setError(error.message);
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    this.setLoading(true);
    this.setError(null);

    return this.sdk.auth.register(dto).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      catchError(error => {
        this.setError(error.message);
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  logout(): void {
    this.setLoading(true);

    this.sdk.auth.logout().subscribe({
      complete: () => {
        this.handleLogout();
      },
      error: () => {
        this.handleLogout();
      }
    });
  }

  restoreAuthSession(): Observable<boolean> {
    const token = this.tokenStorage.getToken();

    if (!token) {
      return of(false);
    }

    if (this.isTokenExpired(token)) {
      this.clearExpiredTokens();
      return of(false);
    }

    this.setLoading(true);
    this.setError(null);

    return this.sdk.auth.getProfile().pipe(
      tap(user => {
        this.store.update({
          user: user,
          isAuthenticated: true,
          error: null,
          loading: false
        });
      }),
      catchError(error => {
        console.warn('[Auth] 认证状态恢复失败:', error);
        this.clearExpiredTokens();
        this.store.update({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null
        });
        return of(false);
      }),
      finalize(() => this.setLoading(false)),
      map(() => true)
    );
  }

  private clearExpiredTokens(): void {
    this.tokenStorage.clearTokens();
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  private convertUserToProfile(user: User): UserProfile {
    return {
      userId: user.id
    };
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.tokenStorage.setToken(response.accessToken);
    this.tokenStorage.setRefreshToken(response.refreshToken);

    const userProfile = this.convertUserToProfile(response.user);

    this.store.update({
      user: userProfile,
      isAuthenticated: true,
      error: null
    });

    this.router.navigate(['/']);
  }

  private handleLogout(): void {
    this.tokenStorage.clearTokens();

    this.store.update({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null
    });

    this.router.navigate(['/login']);
  }

  private setLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private setError(error: string | null): void {
    this.store.update({ error });
  }
}

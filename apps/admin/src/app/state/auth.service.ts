import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, finalize, of, map, from } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthQuery } from './auth.query';
import { TokenStorageService } from '../core/services/token-storage.service';
import { LoginDto, RegisterDto, AuthResponse, User, UserProfile } from '@pro/types';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';

const LOGIN_MUTATION = /* GraphQL */ `
  mutation Login($input: LoginDto!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        status
        createdAt
        updatedAt
      }
    }
  }
`;

const REGISTER_MUTATION = /* GraphQL */ `
  mutation Register($input: RegisterDto!) {
    register(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        status
        createdAt
        updatedAt
      }
    }
  }
`;

const REFRESH_MUTATION = /* GraphQL */ `
  mutation Refresh($input: RefreshTokenDto!) {
    refreshToken(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        status
        createdAt
        updatedAt
      }
    }
  }
`;

const LOGOUT_MUTATION = /* GraphQL */ `
  mutation Logout {
    logout
  }
`;

const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      username
      email
      status
      createdAt
      updatedAt
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private gateway = inject(GraphqlGateway);
  private store = inject(AuthStore);
  private query = inject(AuthQuery);
  private tokenStorage = inject(TokenStorageService);
  private router = inject(Router);

  login(dto: LoginDto): Observable<AuthResponse> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<{ login: AuthResponse }>(LOGIN_MUTATION, { input: dto })
    ).pipe(
      map(result => result.login),
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

  register(dto: RegisterDto): Observable<AuthResponse> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<{ register: AuthResponse }>(REGISTER_MUTATION, { input: dto })
    ).pipe(
      map(result => result.register),
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

    from(this.gateway.request<{ logout: boolean }>(LOGOUT_MUTATION)).subscribe({
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

    return from(this.gateway.request<{ me: User }>(ME_QUERY)).pipe(
      tap(result => {
        this.store.update({
          user: this.convertUserToProfile(result.me),
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

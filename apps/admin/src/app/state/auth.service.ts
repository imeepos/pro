import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, finalize, of, map, from } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthQuery } from './auth.query';
import { TokenStorageService } from '../core/services/token-storage.service';
import { LoginDto, RegisterDto, AuthResponse, User, UserProfile } from '@pro/types';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  LoginDocument,
  LoginMutation,
  LoginMutationVariables,
  RegisterDocument,
  RegisterMutation,
  RegisterMutationVariables,
  LogoutDocument,
  LogoutMutation,
  LogoutMutationVariables,
  MeDocument,
  MeQuery,
  MeQueryVariables
} from '../core/graphql/generated/graphql';
import { toDomainUser } from '../core/utils/user-mapper';

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
      this.gateway.request<LoginMutation, LoginMutationVariables>(
        LoginDocument,
        { input: dto }
      )
    ).pipe(
      map(result => this.toAuthResponse(result.login)),
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
      this.gateway.request<RegisterMutation, RegisterMutationVariables>(
        RegisterDocument,
        { input: dto }
      )
    ).pipe(
      map(result => this.toAuthResponse(result.register)),
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

    from(
      this.gateway.request<LogoutMutation, LogoutMutationVariables>(LogoutDocument)
    ).subscribe({
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

    return from(
      this.gateway.request<MeQuery, MeQueryVariables>(MeDocument)
    ).pipe(
      tap(result => {
        const domainUser = toDomainUser(result.me);
        this.store.update({
          user: this.convertUserToProfile(domainUser),
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

  private toAuthResponse(gqlResponse: { accessToken: string; refreshToken: string; user: { id: string; username: string; email: string; status: any; createdAt: string; updatedAt: string } }): AuthResponse {
    return {
      accessToken: gqlResponse.accessToken,
      refreshToken: gqlResponse.refreshToken,
      user: toDomainUser(gqlResponse.user)
    };
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

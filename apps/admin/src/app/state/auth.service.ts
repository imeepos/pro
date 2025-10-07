import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, finalize } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthQuery } from './auth.query';
import { AuthApiService } from '../core/services/auth-api.service';
import { TokenStorageService } from '../core/services/token-storage.service';
import { LoginDto, RegisterDto, AuthResponse } from '@pro/types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private store: AuthStore,
    private query: AuthQuery,
    private authApi: AuthApiService,
    private tokenStorage: TokenStorageService,
    private router: Router
  ) {}

  login(dto: LoginDto): Observable<AuthResponse> {
    this.setLoading(true);
    this.setError(null);

    return this.authApi.login(dto).pipe(
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

    return this.authApi.register(dto).pipe(
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

    this.authApi.logout().subscribe({
      complete: () => {
        this.handleLogout();
      },
      error: () => {
        this.handleLogout();
      }
    });
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.tokenStorage.setToken(response.accessToken);
    this.tokenStorage.setRefreshToken(response.refreshToken);

    this.store.update({
      user: response.user,
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

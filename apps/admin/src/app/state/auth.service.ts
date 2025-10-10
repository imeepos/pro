import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, finalize } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthQuery } from './auth.query';
import { SkerSDK } from '@pro/sdk';
import { TokenStorageService } from '../core/services/token-storage.service';
import { LoginDto, RegisterDto, AuthResponse } from '@pro/types';

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

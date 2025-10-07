import { Injectable } from '@angular/core';
import { tap, catchError, of } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthQuery } from './auth.query';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { LoginDto, RegisterDto } from '@pro/types';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  constructor(
    private authStore: AuthStore,
    private authQuery: AuthQuery,
    private authService: AuthService,
    private tokenStorage: TokenStorageService,
    private router: Router
  ) {}

  login(dto: LoginDto) {
    this.authStore.update({ loading: true, error: null });

    return this.authService.login(dto).pipe(
      tap(response => {
        this.tokenStorage.setToken(response.accessToken);
        this.tokenStorage.setRefreshToken(response.refreshToken);
        this.authStore.update({
          user: response.user,
          isAuthenticated: true,
          loading: false,
          error: null
        });
        this.router.navigate(['/']);
      }),
      catchError(error => {
        this.authStore.update({
          loading: false,
          error: error.error?.message || '登录失败'
        });
        return of(null);
      })
    );
  }

  register(dto: RegisterDto) {
    this.authStore.update({ loading: true, error: null });

    return this.authService.register(dto).pipe(
      tap(response => {
        this.tokenStorage.setToken(response.accessToken);
        this.tokenStorage.setRefreshToken(response.refreshToken);
        this.authStore.update({
          user: response.user,
          isAuthenticated: true,
          loading: false,
          error: null
        });
        this.router.navigate(['/']);
      }),
      catchError(error => {
        this.authStore.update({
          loading: false,
          error: error.error?.message || '注册失败'
        });
        return of(null);
      })
    );
  }

  logout() {
    this.authStore.update({ loading: true, error: null });

    return this.authService.logout().pipe(
      tap(() => {
        this.tokenStorage.clearAll();
        this.authStore.update({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null
        });
        this.router.navigate(['/login']);
      }),
      catchError(() => {
        this.tokenStorage.clearAll();
        this.authStore.update({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null
        });
        this.router.navigate(['/login']);
        return of(null);
      })
    );
  }

  checkAuth() {
    const token = this.tokenStorage.getToken();
    if (token) {
      this.authStore.update({ loading: true });
      this.authService.getProfile().pipe(
        tap((profile) => {
          this.authStore.update({
            user: {
              id: profile.userId,
              username: '',
              email: '',
              status: 'active' as any,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            isAuthenticated: true,
            loading: false,
            error: null
          });
        }),
        catchError(() => {
          this.tokenStorage.clearAll();
          this.authStore.update({
            user: null,
            isAuthenticated: false,
            loading: false,
            error: null
          });
          return of(null);
        })
      ).subscribe();
    }
  }
}

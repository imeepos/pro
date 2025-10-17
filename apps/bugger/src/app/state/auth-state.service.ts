import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap, catchError, of } from 'rxjs';
import { AuthSignalStore } from './auth.signal-store';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { LoginDto, RegisterDto } from '@pro/types';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private authStore = inject(AuthSignalStore);
  private authService = inject(AuthService);
  private tokenStorage = inject(TokenStorageService);
  private router = inject(Router);

  login(dto: LoginDto) {
    this.authStore.patch({ loading: true, error: null });

    return this.authService.login(dto).pipe(
      tap(response => {
        this.tokenStorage.setToken(response.accessToken);
        this.tokenStorage.setRefreshToken(response.refreshToken);
        this.authStore.patch({
          user: response.user,
          isAuthenticated: true,
          loading: false,
          error: null
        });
        this.router.navigate(['/']);
      }),
      catchError(error => {
        this.authStore.patch({
          loading: false,
          error: error.message || '登录失败'
        });
        return of(null);
      })
    );
  }

  register(dto: RegisterDto) {
    this.authStore.patch({ loading: true, error: null });

    return this.authService.register(dto).pipe(
      tap(response => {
        this.tokenStorage.setToken(response.accessToken);
        this.tokenStorage.setRefreshToken(response.refreshToken);
        this.authStore.patch({
          user: response.user,
          isAuthenticated: true,
          loading: false,
          error: null
        });
        this.router.navigate(['/']);
      }),
      catchError(error => {
        this.authStore.patch({
          loading: false,
          error: error.message || '注册失败'
        });
        return of(null);
      })
    );
  }

  logout() {
    this.authStore.patch({ loading: true, error: null });

    return this.authService.logout().pipe(
      tap(() => {
        this.tokenStorage.clearAll();
        this.authStore.patch({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null
        });
        this.router.navigate(['/login']);
      }),
      catchError(() => {
        this.tokenStorage.clearAll();
        this.authStore.patch({
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
    if (!token) {
      this.tokenStorage.clearAll();
      this.authStore.patch({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      });
      return of(null);
    }

    this.authStore.patch({ loading: true });
    return this.authService.getProfile().pipe(
      tap(user => {
        this.authStore.patch({
          user,
          isAuthenticated: true,
          loading: false,
          error: null
        });
      }),
      catchError(() => {
        this.tokenStorage.clearAll();
        this.authStore.patch({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null
        });
        return of(null);
      })
    );
  }
}

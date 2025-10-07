import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenStorageService } from '../services/token-storage.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const refreshToken = tokenStorage.getRefreshToken();

        if (refreshToken && !req.url.includes('/auth/refresh')) {
          return authService.refreshToken(refreshToken).pipe(
            switchMap((response) => {
              tokenStorage.setToken(response.accessToken);
              tokenStorage.setRefreshToken(response.refreshToken);

              const cloned = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.accessToken}`
                }
              });

              return next(cloned);
            }),
            catchError(() => {
              tokenStorage.clearAll();
              router.navigate(['/login']);
              return throwError(() => error);
            })
          );
        } else {
          tokenStorage.clearAll();
          router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    })
  );
};

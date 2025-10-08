import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenStorageService } from '../services/token-storage.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        tokenStorage.clearTokens();
        router.navigate(['/login']);
      }

      const errorMessage = error.error?.message || error.message || '发生未知错误';

      return throwError(() => new Error(errorMessage));
    })
  );
};

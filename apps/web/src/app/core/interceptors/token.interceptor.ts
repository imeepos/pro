import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { TokenStorageService } from '../services/token-storage.service';

function isTokenExpired(token: string): boolean {
  try {
    const payload = jwtDecode(token) as { exp?: number };
    if (!payload || !payload.exp) {
      return true;
    }
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true;
  }
}

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const token = tokenStorage.getToken();

  if (token && !isTokenExpired(token)) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};

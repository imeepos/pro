import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthQuery } from '../../state/auth.query';
import { TokenStorageService } from '../services/token-storage.service';
import { isTokenExpired } from '@pro/utils';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authQuery = inject(AuthQuery);
  const tokenStorage = inject(TokenStorageService);

  const token = tokenStorage.getToken();

  if (!token || isTokenExpired(token)) {
    router.navigate(['/login']);
    return false;
  }

  if (!authQuery.isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

export const loginGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authQuery = inject(AuthQuery);
  const tokenStorage = inject(TokenStorageService);

  const token = tokenStorage.getToken();

  if (token && !isTokenExpired(token) && authQuery.isAuthenticated) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

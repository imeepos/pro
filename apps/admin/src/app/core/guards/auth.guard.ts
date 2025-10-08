import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';
import { isTokenExpired } from '@pro/utils';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);

  const token = tokenStorage.getToken();

  if (!token || isTokenExpired(token)) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

export const loginGuard: CanActivateFn = () => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);

  const token = tokenStorage.getToken();

  // 仅基于 Token 判断，避免与 Store 状态同步产生竞态条件
  if (token && !isTokenExpired(token)) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthQuery } from '../state/auth.query';

export const authGuard: CanActivateFn = () => {
  const authQuery = inject(AuthQuery);
  const router = inject(Router);

  if (authQuery.isAuthenticated) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

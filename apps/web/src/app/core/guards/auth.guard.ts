import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthQuery } from '../state/auth.query';
import { AuthStateService } from '../state/auth-state.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authQuery = inject(AuthQuery);
  const authStateService = inject(AuthStateService);
  const router = inject(Router);

  // 如果已经认证，直接通过
  if (authQuery.isAuthenticated) {
    return true;
  }

  // 如果有token但未认证，尝试恢复认证状态
  return authStateService.checkAuth().pipe(
    take(1),
    map(() => {
      if (authQuery.isAuthenticated) {
        return true;
      }
      router.navigate(['/login']);
      return false;
    })
  );
};

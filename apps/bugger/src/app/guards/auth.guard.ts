import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSignalStore } from '../state/auth.signal-store';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthSignalStore);
  const router = inject(Router);

  return authStore.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      }

      router.navigate(['/login']);
      return false;
    })
  );
};
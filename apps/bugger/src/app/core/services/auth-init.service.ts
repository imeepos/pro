import { Injectable } from '@angular/core';
import { AuthStateService } from '../../state/auth-state.service';

@Injectable({
  providedIn: 'root'
})
export class AuthInitService {
  constructor(private authStateService: AuthStateService) {}

  initializeAuth(): Promise<void> {
    return new Promise((resolve) => {
      this.authStateService.checkAuth().subscribe({
        next: () => resolve(),
        error: () => resolve()
      });
    });
  }
}
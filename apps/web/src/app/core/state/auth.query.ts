import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '@pro/types';
import { AuthSignalStore } from './auth.signal-store';
import { AuthState } from './auth.state';

@Injectable({ providedIn: 'root' })
export class AuthQuery {
  currentUser$ = this.store.user$;
  isAuthenticated$ = this.store.isAuthenticated$;
  loading$ = this.store.loading$;
  error$ = this.store.error$;

  constructor(private readonly store: AuthSignalStore) {}

  get currentUser(): User | null {
    return this.store.user();
  }

  get isAuthenticated(): boolean {
    return this.store.isAuthenticated();
  }

  select<T>(project: (state: AuthState) => T): Observable<T> {
    return this.store.select(project);
  }

  snapshot(): AuthState {
    return this.store.getValue();
  }
}

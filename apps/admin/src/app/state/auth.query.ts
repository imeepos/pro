import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { AuthStore, AuthState } from './auth.store';
import { Observable } from 'rxjs';
import { User } from '@pro/types';

@Injectable({ providedIn: 'root' })
export class AuthQuery extends Query<AuthState> {
  currentUser$: Observable<User | null> = this.select(state => state.user);
  isAuthenticated$: Observable<boolean> = this.select(state => state.isAuthenticated);
  loading$: Observable<boolean> = this.select(state => state.loading);
  error$: Observable<string | null> = this.select(state => state.error);

  constructor(protected override store: AuthStore) {
    super(store);
  }

  get currentUser(): User | null {
    return this.getValue().user;
  }

  get isAuthenticated(): boolean {
    return this.getValue().isAuthenticated;
  }
}

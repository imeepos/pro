import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';
import { UserProfile } from '@pro/types';

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export function createInitialState(): AuthState {
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'auth' })
export class AuthStore extends Store<AuthState> {
  constructor() {
    super(createInitialState());
  }
}

import { User } from '@pro/types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export function createInitialAuthState(): AuthState {
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  };
}

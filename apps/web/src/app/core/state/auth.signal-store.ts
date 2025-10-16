import { Injectable, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthState, createInitialAuthState } from './auth.state';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthSignalStore {
  private readonly state = signal<AuthState>(createInitialAuthState());

  readonly snapshot = computed(() => this.state());
  readonly user = computed(() => this.state().user);
  readonly isAuthenticated = computed(() => this.state().isAuthenticated);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  readonly user$ = toObservable(this.user);
  readonly isAuthenticated$ = toObservable(this.isAuthenticated);
  readonly loading$ = toObservable(this.loading);
  readonly error$ = toObservable(this.error);

  reset(): void {
    this.state.set(createInitialAuthState());
  }

  patch(patch: Partial<AuthState>): void {
    this.state.update(current => ({
      ...current,
      ...patch
    }));
  }

  getValue(): AuthState {
    return this.state();
  }

  select<TResult>(project: (state: AuthState) => TResult): Observable<TResult> {
    const selection = computed(() => project(this.state()));
    return toObservable(selection);
  }
}

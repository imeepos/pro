import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JwtAuthService {
  private readonly tokenSubject = new BehaviorSubject<string | null>(null);
  private refreshPromise: Promise<string> | null = null;

  get token$(): Observable<string> {
    return this.tokenSubject.asObservable().pipe(
      filter(Boolean),
      distinctUntilChanged()
    );
  }

  get currentToken(): string | null {
    return this.tokenSubject.value;
  }

  setToken(token: string): void {
    this.tokenSubject.next(token);
  }

  clearToken(): void {
    this.tokenSubject.next(null);
  }

  async refreshToken(refreshCallback?: () => Promise<string>): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!refreshCallback) {
      throw new Error('Token refresh callback is required');
    }

    this.refreshPromise = this.executeTokenRefresh(refreshCallback);

    try {
      const newToken = await this.refreshPromise;
      this.setToken(newToken);
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async executeTokenRefresh(callback: () => Promise<string>): Promise<string> {
    try {
      return await callback();
    } catch (error) {
      this.clearToken();
      throw error;
    }
  }
}
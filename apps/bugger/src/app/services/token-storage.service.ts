import { Injectable } from '@angular/core';
import { TokenStorage } from '@pro/types';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService implements TokenStorage {
  private readonly tokenKey = 'bugger_access_token';
  private readonly refreshTokenKey = 'bugger_refresh_token';

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.refreshTokenKey, token);
  }

  clearRefreshToken(): void {
    localStorage.removeItem(this.refreshTokenKey);
  }

  clearAll(): void {
    this.clearToken();
    this.clearRefreshToken();
  }
}

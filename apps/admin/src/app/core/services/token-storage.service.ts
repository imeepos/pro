import { Injectable } from '@angular/core';
import { getConfig } from '@pro/config';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private readonly tokenKey: string;
  private readonly refreshTokenKey: string;

  constructor() {
    const config = getConfig();
    this.tokenKey = config.tokenKey;
    this.refreshTokenKey = config.refreshTokenKey;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.refreshTokenKey, token);
  }

  clearTokens(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
}

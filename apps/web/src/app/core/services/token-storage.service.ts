import { Injectable } from '@angular/core';
import { ITokenStorage } from '@pro/sdk';
import { getConfig } from '@pro/config';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService implements ITokenStorage {
  private readonly tokenKey = getConfig().tokenKey;
  private readonly refreshTokenKey = getConfig().refreshTokenKey;

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

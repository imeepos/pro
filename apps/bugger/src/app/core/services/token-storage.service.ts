import { Injectable } from '@angular/core';
import { TokenStorage } from '@pro/types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService implements TokenStorage {
  private readonly tokenKey = environment.tokenKey;
  private readonly refreshTokenKey = environment.refreshTokenKey;

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

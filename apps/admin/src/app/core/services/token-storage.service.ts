import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private readonly tokenKey: string;
  private readonly refreshTokenKey: string;

  constructor() {
    this.tokenKey = environment.tokenKey;
    this.refreshTokenKey = environment.refreshTokenKey;
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

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  clearRefreshToken(): void {
    localStorage.removeItem(this.refreshTokenKey);
  }
}

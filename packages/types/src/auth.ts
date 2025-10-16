export interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clearRefreshToken(): void;
  clearAll(): void;
}

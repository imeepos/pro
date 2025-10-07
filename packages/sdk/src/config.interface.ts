export interface SDKConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ITokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clearRefreshToken(): void;
}

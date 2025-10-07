export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  apiUrl: string;
}

export const defaultConfig: AppConfig = {
  port: 3000,
  env: 'development',
  apiUrl: 'http://localhost:3000',
};

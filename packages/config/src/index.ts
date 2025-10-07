export interface IEnvironmentConfig {
  apiBaseUrl: string;
  tokenKey: string;
  refreshTokenKey: string;
  timeout: number;
}

type Environment = 'development' | 'production' | 'test';

const configs: Record<Environment, IEnvironmentConfig> = {
  development: {
    apiBaseUrl: 'http://localhost:3000/api',
    tokenKey: 'access_token',
    refreshTokenKey: 'refresh_token',
    timeout: 30000,
  },
  production: {
    apiBaseUrl: '/api',
    tokenKey: 'access_token',
    refreshTokenKey: 'refresh_token',
    timeout: 10000,
  },
  test: {
    apiBaseUrl: 'http://localhost:3000/api',
    tokenKey: 'test_access_token',
    refreshTokenKey: 'test_refresh_token',
    timeout: 5000,
  },
};

const currentEnv = (): Environment => {
  const env = process.env['NODE_ENV'] as Environment;
  return env && env in configs ? env : 'development';
};

export const getConfig = (): IEnvironmentConfig => configs[currentEnv()];

export const getApiUrl = (): string => getConfig().apiBaseUrl;

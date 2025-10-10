export interface IEnvironmentConfig {
  apiBaseUrl: string;
  tokenKey: string;
  refreshTokenKey: string;
  timeout: number;
}

type Environment = 'development' | 'production' | 'test';

const configs: Record<Environment, IEnvironmentConfig> = {
  development: {
    apiBaseUrl: 'http://localhost:3000',
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
  // 在浏览器环境中，process.env 可能未定义
  // 检查是否在浏览器环境且 process.env 可用
  if (typeof process !== 'undefined' && process.env) {
    const env = process.env['NODE_ENV'] as Environment;
    return env && env in configs ? env : 'development';
  }

  // 在浏览器环境中，检查是否有其他方式确定环境
  // 默认使用 development，除非明确设置为 production
  if (typeof window !== 'undefined') {
    // 检查是否在生产环境（通过hostname或其他方式）
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'production';
    }
  }

  return 'development';
};

export const getConfig = (): IEnvironmentConfig => configs[currentEnv()];

export const getApiUrl = (): string => getConfig().apiBaseUrl;

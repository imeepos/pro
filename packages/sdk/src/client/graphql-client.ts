import { AuthConfig, AuthMode, DEFAULT_AUTH_CONFIG } from '../types/auth-config';

interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLRequestOptions {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export class GraphQLClient {
  private readonly endpoint: string;
  private readonly config: AuthConfig;

  constructor(baseUrl: string, tokenKey: string = 'access_token', authMode: AuthMode = AuthMode.JWT) {
    this.endpoint = `${baseUrl}/graphql`;
    this.config = {
      ...DEFAULT_AUTH_CONFIG,
      tokenKey,
      mode: authMode,
    };
  }

  /**
   * 创建 JWT 认证的客户端
   */
  static withJwt(baseUrl: string, tokenKey: string = 'access_token'): GraphQLClient {
    return new GraphQLClient(baseUrl, tokenKey, AuthMode.JWT);
  }

  /**
   * 创建 API Key 认证的客户端
   */
  static withApiKey(baseUrl: string, tokenKey: string = 'api_key'): GraphQLClient {
    return new GraphQLClient(baseUrl, tokenKey, AuthMode.API_KEY);
  }

  /**
   * 创建自动模式认证的客户端
   */
  static withAutoAuth(baseUrl: string, tokenKey: string = 'access_token'): GraphQLClient {
    return new GraphQLClient(baseUrl, tokenKey, AuthMode.AUTO);
  }

  /**
   * 使用自定义配置创建客户端
   */
  static withConfig(baseUrl: string, config: AuthConfig): GraphQLClient {
    const mergedConfig = { ...DEFAULT_AUTH_CONFIG, ...config };
    const client = new GraphQLClient(baseUrl, mergedConfig.tokenKey, mergedConfig.mode);
    // 通过类型断言来设置合并后的配置
    (client as any).config = mergedConfig;
    return client;
  }

  async request<T>(options: GraphQLRequestOptions): Promise<T> {
    const { query, variables, operationName } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 根据认证模式添加认证头
    this.addAuthHeaders(headers);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
        operationName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((err) => err.message).join(', ');
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL');
    }

    return result.data;
  }

  /**
   * 根据认证模式添加相应的认证头
   */
  private addAuthHeaders(headers: Record<string, string>): void {
    switch (this.config.mode) {
      case AuthMode.JWT:
        this.addJwtHeaders(headers);
        break;
      case AuthMode.API_KEY:
        this.addApiKeyHeaders(headers);
        break;
      case AuthMode.AUTO:
        this.addAutoAuthHeaders(headers);
        break;
      default:
        this.addJwtHeaders(headers);
    }
  }

  /**
   * 添加 JWT 认证头
   */
  private addJwtHeaders(headers: Record<string, string>): void {
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  /**
   * 添加 API Key 认证头
   */
  private addApiKeyHeaders(headers: Record<string, string>): void {
    const apiKey = this.getToken();
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
  }

  /**
   * 自动选择认证方式并添加相应头
   */
  private addAutoAuthHeaders(headers: Record<string, string>): void {
    const jwtToken = this.getToken('access_token');
    const apiKey = this.getToken('api_key');

    // 优先使用 JWT
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    } else if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
  }

  query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ query, variables });
  }

  mutate<T>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ query: mutation, variables });
  }

  private getToken(tokenKey?: string): string | null {
    const key = tokenKey || this.config.tokenKey;

    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }
}

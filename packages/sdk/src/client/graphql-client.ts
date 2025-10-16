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
  private readonly tokenKey: string;

  constructor(baseUrl: string, tokenKey: string = 'access_token') {
    this.endpoint = `${baseUrl}/graphql`;
    this.tokenKey = tokenKey;
  }

  async request<T>(options: GraphQLRequestOptions): Promise<T> {
    const { query, variables, operationName } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

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

  query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ query, variables });
  }

  mutate<T>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ query: mutation, variables });
  }

  private getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }
}

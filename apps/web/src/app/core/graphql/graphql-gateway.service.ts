import { Injectable } from '@angular/core';
import { GraphQLClient } from 'graphql-request';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';
import { logger } from '../utils/logger';

type GraphqlVariables = Record<string, unknown> | undefined;

@Injectable({
  providedIn: 'root'
})
export class GraphqlGateway {
  private readonly endpoint = this.resolveEndpoint();

  constructor(private readonly tokenStorage: TokenStorageService) {}

  async request<T>(query: string, variables?: GraphqlVariables): Promise<T> {
    const client = new GraphQLClient(this.endpoint, {
      headers: this.buildHeaders()
    });

    try {
      return await client.request<T>(query, variables);
    } catch (error) {
      logger.error('[GraphqlGateway] 请求失败', {
        message: (error as Error).message,
        variables
      });
      throw error;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const token = this.tokenStorage.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private resolveEndpoint(): string {
    const explicitUrl = environment.graphqlUrl?.trim();
    if (explicitUrl) {
      return explicitUrl.replace(/\/+$/, '');
    }

    const base = environment.apiUrl.replace(/\/+$/, '');

    if (base.endsWith('/graphql')) {
      return base;
    }

    if (base.endsWith('/api')) {
      return `${base.replace(/\/api$/, '')}/graphql`;
    }

    return `${base}/graphql`;
  }
}

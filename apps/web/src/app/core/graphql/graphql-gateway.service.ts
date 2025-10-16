import { Injectable } from '@angular/core';
import { GraphQLClient } from 'graphql-request';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Kind, OperationDefinitionNode } from 'graphql';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';
import { logger } from '../utils/logger';

@Injectable({
  providedIn: 'root'
})
export class GraphqlGateway {
  private readonly endpoint = this.resolveEndpoint();

  constructor(private readonly tokenStorage: TokenStorageService) {}

  async request<TResult, TVariables extends Record<string, unknown> = Record<string, never>>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables?: TVariables
  ): Promise<TResult> {
    const client = new GraphQLClient(this.endpoint, {
      headers: this.buildHeaders()
    });

    try {
      return await client.request<TResult>(
        document,
        variables as Record<string, unknown> | undefined
      );
    } catch (error) {
      logger.error('[GraphqlGateway] 请求失败', {
        message: (error as Error).message,
        operation: this.lookupOperation(document),
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

  private lookupOperation(document: TypedDocumentNode<unknown, any>): string | undefined {
    const operation = document.definitions.find(
      (definition): definition is OperationDefinitionNode =>
        definition.kind === Kind.OPERATION_DEFINITION && Boolean(definition.name)
    );

    return operation?.name?.value;
  }
}

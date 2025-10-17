import { Injectable } from '@angular/core';
import { ClientError, GraphQLClient } from 'graphql-request';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Kind, OperationDefinitionNode } from 'graphql';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';
import { logger } from '../utils/logger';

@Injectable({
  providedIn: 'root'
})
export class GraphqlGateway {
  private readonly endpoint = environment.graphqlEndpoint;
  private readonly maxAttempts = 3;
  private readonly log = logger.withScope('GraphqlGateway', {
    endpoint: this.endpoint
  });

  constructor(private readonly tokenStorage: TokenStorageService) {}

  async request<TResult, TVariables extends Record<string, unknown> = Record<string, never>>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables?: TVariables
  ): Promise<TResult> {
    const client = new GraphQLClient(this.endpoint, {
      headers: this.buildHeaders()
    });

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const vars = variables ?? ({} as TVariables);
        // @ts-expect-error - graphql-request type inference issue with optional variables
        return await client.request(document, vars);
      } catch (error) {
        const context = this.buildErrorContext(error, document, variables, attempt);

        if (attempt < this.maxAttempts && this.shouldRetry(error)) {
          this.log.warn('请求重试', context);
          await this.delay(150 * attempt);
          continue;
        }

        this.log.error('请求失败', context);
        throw error;
      }
    }

    throw new Error('GraphQL 请求已耗尽重试次数');
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


  private lookupOperation(document: TypedDocumentNode<unknown, any>): string | undefined {
    const operation = document.definitions.find(
      (definition): definition is OperationDefinitionNode =>
        definition.kind === Kind.OPERATION_DEFINITION && Boolean(definition.name)
    );

    return operation?.name?.value;
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof ClientError) {
      return error.response.status >= 500;
    }

    return true;
  }

  private buildErrorContext<TVariables extends Record<string, unknown> | undefined>(
    error: unknown,
    document: TypedDocumentNode<unknown, TVariables>,
    variables: TVariables | undefined,
    attempt: number
  ): Record<string, unknown> {
    const baseContext: Record<string, unknown> = {
      message: (error as Error).message,
      operation: this.lookupOperation(document),
      attempt,
      maxAttempts: this.maxAttempts
    };

    if (variables && Object.keys(variables).length > 0) {
      baseContext['variables'] = variables;
    }

    if (error instanceof ClientError) {
      baseContext['status'] = error.response.status;
      baseContext['graphQLErrors'] = error.response.errors?.map(({ message, path, extensions }) => ({
        message,
        path,
        code: extensions?.['code']
      }));
    }

    return baseContext;
  }

  private delay(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }
}

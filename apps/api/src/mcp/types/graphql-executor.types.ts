import { OperationTypeNode, SourceLocation } from 'graphql';

export interface GraphqlExecutorError {
  message: string;
  path?: readonly (string | number)[];
  locations?: readonly SourceLocation[];
  extensions?: Record<string, unknown>;
}

export interface GraphqlExecutorMeta {
  subscriptionEvents?: number;
  subscriptionWindowMs?: number;
  truncated?: boolean;
}

export interface GraphqlExecutorResponse {
  operation: OperationTypeNode;
  durationMs: number;
  data: unknown;
  errors?: GraphqlExecutorError[];
  meta?: GraphqlExecutorMeta;
}

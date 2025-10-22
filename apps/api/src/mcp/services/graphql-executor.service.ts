import { Injectable, Logger } from '@nestjs/common';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import {
  DocumentNode,
  ExecutionArgs,
  ExecutionResult,
  GraphQLError,
  OperationTypeNode,
  execute,
  getOperationAST,
  parse,
  subscribe,
  validate,
} from 'graphql';
import { GraphqlExecutorResponse } from '../types/graphql-executor.types';
import { McpAuthService } from './auth.service';
import { GraphqlContext } from '../../common/utils/context.utils';
import { UserLoader } from '../../user/user.loader';
import { ApiKeyLoader } from '../../auth/api-key.loader';
import { EventTypeLoader } from '../../events/event-type.loader';
import { IndustryTypeLoader } from '../../events/industry-type.loader';
import { TagLoader } from '../../events/tag.loader';

interface GraphqlExecutionPayload {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

const isAsyncIterable = <T>(source: unknown): source is AsyncIterable<T> => {
  if (!source || typeof source !== 'object') {
    return false;
  }
  return typeof (source as AsyncIterable<T>)[Symbol.asyncIterator] === 'function';
};

@Injectable()
export class GraphqlExecutorService {
  private readonly logger = new Logger(GraphqlExecutorService.name);
  private readonly subscriptionEventLimit = 50;
  private readonly subscriptionTimeoutMs = 5000;
  private readonly defaultOperation: OperationTypeNode = OperationTypeNode.QUERY;

  constructor(
    private readonly schemaHost: GraphQLSchemaHost,
    private readonly authService: McpAuthService,
    private readonly userLoader: UserLoader,
    private readonly apiKeyLoader: ApiKeyLoader,
    private readonly eventTypeLoader: EventTypeLoader,
    private readonly industryTypeLoader: IndustryTypeLoader,
    private readonly tagLoader: TagLoader,
  ) {}

  async execute(payload: GraphqlExecutionPayload): Promise<GraphqlExecutorResponse> {
    const start = Date.now();
    let document: DocumentNode;
    try {
      document = this.prepareDocument(payload.query);
    } catch (error) {
      if (error instanceof GraphQLError) {
        return this.composeResponse(this.defaultOperation, start, null, this.formatErrors([error]));
      }
      throw error;
    }
    const operationType = this.resolveOperationType(document, payload.operationName);
    const principal = await this.authService.buildAuthenticatedRequest();
    const context = this.composeContext(principal.request);

    const errors = this.validateDocument(document);
    if (errors.length > 0) {
      return this.composeResponse(operationType, start, undefined, this.formatErrors(errors));
    }

    if (operationType === OperationTypeNode.SUBSCRIPTION) {
      const subscriptionResult = await this.executeSubscription(document, payload, context);
      return this.composeResponse(
        operationType,
        start,
        subscriptionResult.data,
        subscriptionResult.errors,
        subscriptionResult.meta,
      );
    }

    const executionResult = await this.executeOperation(document, payload, context);
    const formattedExecutionErrors = executionResult.errors
      ? this.formatErrors(executionResult.errors)
      : undefined;

    return this.composeResponse(
      operationType,
      start,
      executionResult.data,
      formattedExecutionErrors,
    );
  }

  private prepareDocument(query: string): DocumentNode {
    return parse(query, {
      noLocation: false,
    });
  }

  private resolveOperationType(document: DocumentNode, operationName?: string): OperationTypeNode {
    const operationAst = getOperationAST(document, operationName ?? undefined);
    return operationAst?.operation ?? this.defaultOperation;
  }

  private validateDocument(document: DocumentNode): readonly GraphQLError[] {
    return validate(this.schemaHost.schema, document);
  }

  private async executeOperation(
    document: DocumentNode,
    payload: GraphqlExecutionPayload,
    context: GraphqlContext,
  ): Promise<ExecutionResult> {
    const executionArgs: ExecutionArgs = {
      schema: this.schemaHost.schema,
      document,
      variableValues: payload.variables ?? {},
      operationName: payload.operationName,
      contextValue: context,
    };

    const result = await execute(executionArgs);

    if (result.errors?.length) {
      this.logger.warn('GraphQL 执行出现错误', {
        operationName: payload.operationName,
        errors: this.describeErrors(result.errors),
      });
    }

    return result;
  }

  private async executeSubscription(
    document: DocumentNode,
    payload: GraphqlExecutionPayload,
    context: GraphqlContext,
  ): Promise<{
    data?: unknown;
    errors?: GraphqlExecutorResponse['errors'];
    meta?: GraphqlExecutorResponse['meta'];
  }> {
    const executionArgs: ExecutionArgs = {
      schema: this.schemaHost.schema,
      document,
      variableValues: payload.variables ?? {},
      operationName: payload.operationName,
      contextValue: context,
    };

    const subscription = await subscribe(executionArgs);

    if (!isAsyncIterable<ExecutionResult>(subscription)) {
      const errors = subscription.errors ? this.formatErrors(subscription.errors) : undefined;
      return { errors };
    }

    const events: ExecutionResult['data'][] = [];
    const collectedErrors: GraphQLError[] = [];
    const startedAt = Date.now();

    let truncated = false;

    for await (const event of subscription) {
      if (event.errors?.length) {
        collectedErrors.push(...event.errors);
      }
      if (event.data) {
        events.push(event.data);
      }

      const timeElapsed = Date.now() - startedAt;
      if (events.length >= this.subscriptionEventLimit || timeElapsed >= this.subscriptionTimeoutMs) {
        truncated = true;
        break;
      }
    }

    return {
      data: {
        events,
      },
      errors: collectedErrors.length ? this.formatErrors(collectedErrors) : undefined,
      meta: {
        subscriptionEvents: events.length,
        subscriptionWindowMs: Date.now() - startedAt,
        truncated: truncated ? true : undefined,
      },
    };
  }

  private composeContext(request: GraphqlContext['req']): GraphqlContext {
    const loaders = {
      userById: this.userLoader.create(),
      apiKeyById: this.apiKeyLoader.create(() => request.user?.userId),
      eventTypeById: this.eventTypeLoader.create(),
      industryTypeById: this.industryTypeLoader.create(),
      tagById: this.tagLoader.createById(),
      tagsByEventId: this.tagLoader.createByEventId(),
    };

    return {
      req: request,
      res: this.createResponseStub(),
      loaders,
    };
  }

  private createResponseStub(): GraphqlContext['res'] {
    const headers: Record<string, string> = {};

    return {
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      statusCode: 200,
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      json(payload: unknown) {
        return payload;
      },
    } as unknown as GraphqlContext['res'];
  }

  private composeResponse(
    operation: OperationTypeNode | undefined,
    startedAt: number,
    data?: unknown,
    errors?: GraphqlExecutorResponse['errors'],
    meta?: GraphqlExecutorResponse['meta'],
  ): GraphqlExecutorResponse {
    const finishedAt = Date.now();
    const resolvedOperation: OperationTypeNode = operation ?? this.defaultOperation;

    return {
      operation: resolvedOperation,
      durationMs: finishedAt - startedAt,
      data: data ?? null,
      errors: errors?.length ? errors : undefined,
      meta,
    };
  }

  private formatErrors(errors: readonly GraphQLError[]): GraphqlExecutorResponse['errors'] {
    return errors.map((error) => ({
      message: error.message,
      path: error.path,
      locations: error.locations,
      extensions: error.extensions ? { ...error.extensions } : undefined,
    }));
  }

  private describeErrors(errors: readonly GraphQLError[]): string[] {
    return errors.map((error) => `${error.message}${error.path ? ` @ ${error.path.join('.')}` : ''}`);
  }
}

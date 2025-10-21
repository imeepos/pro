import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request, Response } from 'express';
import type { ApiKeyEntity } from '@pro/entities';
import { GraphqlLoaders } from '../dataloaders/types';

export type AugmentedRequest = Request & {
  apiKey?: string | ApiKeyEntity;
  websocket?: any;
  connectionParams?: any;
};

export interface GraphqlContext {
  req: AugmentedRequest;
  res: Response;
  loaders: GraphqlLoaders;
  authenticationError?: boolean;
  error?: string;
}

export const resolveRequest = (context: ExecutionContext): AugmentedRequest => {
  if (context.getType() === 'http') {
    return context.switchToHttp().getRequest<AugmentedRequest>();
  }

  const { req } = GqlExecutionContext.create(context).getContext<GraphqlContext>();
  return req;
};

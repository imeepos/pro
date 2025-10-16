import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { GraphqlLoaders } from '../dataloaders/types';

export type AugmentedRequest = Request & {
  apiKey?: unknown;
};

export interface GraphqlContext {
  req: AugmentedRequest;
  res: Response;
  loaders: GraphqlLoaders;
}

export const resolveRequest = (context: ExecutionContext): AugmentedRequest => {
  if (context.getType() === 'http') {
    return context.switchToHttp().getRequest<AugmentedRequest>();
  }

  const { req } = GqlExecutionContext.create(context).getContext<GraphqlContext>();
  return req;
};

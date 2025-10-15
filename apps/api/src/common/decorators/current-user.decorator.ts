import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { resolveRequest } from '../utils/context.utils';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext) => {
    const request = resolveRequest(context);
    const user = request.user as Record<string, unknown> | undefined;

    if (!data) {
      return user;
    }

    return user?.[data];
  },
);

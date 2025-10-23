interface SerializedErrorDetails {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedErrorDetails;
  details?: Record<string, unknown>;
}

export function serializeError(error: unknown): SerializedErrorDetails {
  if (error instanceof Error) {
    const base: SerializedErrorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    if (error.cause) {
      base.cause = serializeError(error.cause);
    }

    const extraKeys = Object.keys(error).filter(
      key => !['name', 'message', 'stack', 'cause'].includes(key),
    );

    if (extraKeys.length > 0) {
      const errorRecord = error as unknown as Record<string, unknown>;
      base.details = extraKeys.reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = errorRecord[key];
        return acc;
      }, {});
    }

    return base;
  }

  if (typeof error === 'object' && error !== null) {
    return {
      name: 'NonErrorObject',
      message: '非 Error 对象',
      details: error as Record<string, unknown>,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

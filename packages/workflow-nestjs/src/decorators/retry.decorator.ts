export interface RetryOptions {
  maxAttempts?: number;
  backoff?: 'fixed' | 'exponential' | 'linear';
  delay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  backoff: 'exponential',
  delay: 1000,
  maxDelay: 30000,
  shouldRetry: () => true,
  onRetry: () => {},
};

export function Retry(options: RetryOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: any;

      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          if (attempt === config.maxAttempts) {
            throw error;
          }

          if (!config.shouldRetry(error)) {
            throw error;
          }

          config.onRetry(error, attempt);

          const delayMs = calculateDelay(
            config.backoff,
            config.delay,
            attempt,
            config.maxDelay
          );

          await sleep(delayMs);
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}

function calculateDelay(
  backoff: 'fixed' | 'exponential' | 'linear',
  baseDelay: number,
  attempt: number,
  maxDelay: number
): number {
  let delay: number;

  switch (backoff) {
    case 'exponential':
      delay = baseDelay * Math.pow(2, attempt - 1);
      break;
    case 'linear':
      delay = baseDelay * attempt;
      break;
    case 'fixed':
    default:
      delay = baseDelay;
  }

  return Math.min(delay, maxDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

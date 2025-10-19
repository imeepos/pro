import {
  ErrorCategory,
  ErrorDomain,
  ErrorSeverity,
  ErrorDetails,
  EnhancedError,
} from '../types/index';

export interface ErrorClassifier {
  readonly name: string;
  readonly priority: number;
  classify(error: Error): Partial<ErrorDetails> | null;
}

export class DatabaseErrorClassifier implements ErrorClassifier {
  readonly name = 'database';
  readonly priority = 100;

  classify(error: Error): Partial<ErrorDetails> | null {
    const message = error.message.toLowerCase();

    if (this.isConnectionError(message)) {
      return {
        code: 'DB_CONNECTION_FAILED',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.INFRASTRUCTURE,
        domain: ErrorDomain.DATABASE,
      };
    }

    if (this.isTimeoutError(message)) {
      return {
        code: 'DB_OPERATION_TIMEOUT',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.PERFORMANCE,
        domain: ErrorDomain.DATABASE,
      };
    }

    if (this.isDeadlockError(message)) {
      return {
        code: 'DB_DEADLOCK_DETECTED',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.BUSINESS,
        domain: ErrorDomain.DATABASE,
      };
    }

    if (this.isConstraintViolation(message)) {
      return {
        code: 'DB_CONSTRAINT_VIOLATION',
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        domain: ErrorDomain.DATABASE,
      };
    }

    if (this.isDatabaseError(message)) {
      return {
        code: 'DB_GENERAL_ERROR',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.INFRASTRUCTURE,
        domain: ErrorDomain.DATABASE,
      };
    }

    return null;
  }

  private isConnectionError(message: string): boolean {
    return /connection|connect|econnrefused|etimedout/i.test(message);
  }

  private isTimeoutError(message: string): boolean {
    return /timeout|time.*out|query.*timeout/i.test(message);
  }

  private isDeadlockError(message: string): boolean {
    return /deadlock|lock.*wait.*timeout/i.test(message);
  }

  private isConstraintViolation(message: string): boolean {
    return /constraint|duplicate.*key|foreign.*key|unique.*violation/i.test(message);
  }

  private isDatabaseError(message: string): boolean {
    return /database|postgres|mysql|sql|typeorm/i.test(message);
  }
}

export class CacheErrorClassifier implements ErrorClassifier {
  readonly name = 'cache';
  readonly priority = 90;

  classify(error: Error): Partial<ErrorDetails> | null {
    const message = error.message.toLowerCase();

    if (this.isConnectionError(message)) {
      return {
        code: 'CACHE_CONNECTION_FAILED',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.INFRASTRUCTURE,
        domain: ErrorDomain.CACHE,
      };
    }

    if (this.isMemoryError(message)) {
      return {
        code: 'CACHE_MEMORY_EXHAUSTED',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.PERFORMANCE,
        domain: ErrorDomain.CACHE,
      };
    }

    if (this.isCacheError(message)) {
      return {
        code: 'CACHE_OPERATION_FAILED',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.INFRASTRUCTURE,
        domain: ErrorDomain.CACHE,
      };
    }

    return null;
  }

  private isConnectionError(message: string): boolean {
    return /redis|cache.*connection|econnrefused/i.test(message) &&
           /connection|connect|refused/i.test(message);
  }

  private isMemoryError(message: string): boolean {
    return /memory|out.*of.*memory|oom/i.test(message);
  }

  private isCacheError(message: string): boolean {
    return /redis|cache|memcached/i.test(message);
  }
}

export class NetworkErrorClassifier implements ErrorClassifier {
  readonly name = 'network';
  readonly priority = 80;

  classify(error: Error): Partial<ErrorDetails> | null {
    const message = error.message.toLowerCase();

    if (this.isTimeoutError(message)) {
      return {
        code: 'NETWORK_TIMEOUT',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.EXTERNAL,
        domain: ErrorDomain.NETWORK,
      };
    }

    if (this.isConnectionRefused(message)) {
      return {
        code: 'NETWORK_CONNECTION_REFUSED',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.EXTERNAL,
        domain: ErrorDomain.NETWORK,
      };
    }

    if (this.isDnsError(message)) {
      return {
        code: 'NETWORK_DNS_RESOLUTION_FAILED',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.EXTERNAL,
        domain: ErrorDomain.NETWORK,
      };
    }

    if (this.isNetworkError(message)) {
      return {
        code: 'NETWORK_GENERAL_ERROR',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.EXTERNAL,
        domain: ErrorDomain.NETWORK,
      };
    }

    return null;
  }

  private isTimeoutError(message: string): boolean {
    return /timeout|request.*timeout|socket.*timeout/i.test(message);
  }

  private isConnectionRefused(message: string): boolean {
    return /econnrefused|connection.*refused/i.test(message);
  }

  private isDnsError(message: string): boolean {
    return /enotfound|dns|getaddrinfo/i.test(message);
  }

  private isNetworkError(message: string): boolean {
    return /network|socket|http|https|fetch|axios/i.test(message);
  }
}

export class ValidationErrorClassifier implements ErrorClassifier {
  readonly name = 'validation';
  readonly priority = 70;

  classify(error: Error): Partial<ErrorDetails> | null {
    const message = error.message.toLowerCase();

    if (this.isValidationError(message)) {
      return {
        code: 'VALIDATION_ERROR',
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        domain: ErrorDomain.VALIDATION,
      };
    }

    if (this.isSchemaError(message)) {
      return {
        code: 'SCHEMA_VALIDATION_ERROR',
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        domain: ErrorDomain.VALIDATION,
      };
    }

    return null;
  }

  private isValidationError(message: string): boolean {
    return /validation|invalid|required|must.*be|should.*be/i.test(message);
  }

  private isSchemaError(message: string): boolean {
    return /schema|joi|ajv|class-validator/i.test(message);
  }
}

export class AuthenticationErrorClassifier implements ErrorClassifier {
  readonly name = 'authentication';
  readonly priority = 110;

  classify(error: Error): Partial<ErrorDetails> | null {
    const message = error.message.toLowerCase();

    if (this.isAuthenticationError(message)) {
      return {
        code: 'AUTHENTICATION_FAILED',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SECURITY,
        domain: ErrorDomain.AUTHENTICATION,
      };
    }

    if (this.isAuthorizationError(message)) {
      return {
        code: 'AUTHORIZATION_DENIED',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SECURITY,
        domain: ErrorDomain.AUTHORIZATION,
      };
    }

    if (this.isTokenError(message)) {
      return {
        code: 'TOKEN_INVALID',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SECURITY,
        domain: ErrorDomain.AUTHENTICATION,
      };
    }

    return null;
  }

  private isAuthenticationError(message: string): boolean {
    return /unauthorized|authentication|login|credentials/i.test(message);
  }

  private isAuthorizationError(message: string): boolean {
    return /forbidden|authorization|access.*denied|permission/i.test(message);
  }

  private isTokenError(message: string): boolean {
    return /token|jwt|expired|invalid.*token/i.test(message);
  }
}

export class ErrorClassificationService {
  private readonly classifiers: ErrorClassifier[] = [];

  constructor() {
    this.registerDefaultClassifiers();
  }

  private registerDefaultClassifiers(): void {
    this.addClassifier(new AuthenticationErrorClassifier());
    this.addClassifier(new DatabaseErrorClassifier());
    this.addClassifier(new CacheErrorClassifier());
    this.addClassifier(new NetworkErrorClassifier());
    this.addClassifier(new ValidationErrorClassifier());
  }

  addClassifier(classifier: ErrorClassifier): void {
    this.classifiers.push(classifier);
    this.classifiers.sort((a, b) => b.priority - a.priority);
  }

  classify(error: Error): EnhancedError {
    let classification: Partial<ErrorDetails> = {};

    for (const classifier of this.classifiers) {
      const result = classifier.classify(error);
      if (result) {
        classification = { ...classification, ...result };
        break;
      }
    }

    if (Object.keys(classification).length === 0) {
      classification = {
        code: 'UNCLASSIFIED_ERROR',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.BUSINESS,
        domain: ErrorDomain.BUSINESS_LOGIC,
      };
    }

    return new EnhancedError({
      message: error.message,
      cause: error,
      ...classification,
    });
  }
}
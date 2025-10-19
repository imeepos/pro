export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  INFRASTRUCTURE = 'infrastructure',
  BUSINESS = 'business',
  VALIDATION = 'validation',
  EXTERNAL = 'external',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  CONFIGURATION = 'configuration',
}

export enum ErrorDomain {
  DATABASE = 'database',
  CACHE = 'cache',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_API = 'external_api',
  FILE_SYSTEM = 'file_system',
  MESSAGING = 'messaging',
}

export interface ErrorContext {
  readonly userId?: string;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly operation?: string;
  readonly resource?: string;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly environment: string;
  readonly service: string;
  readonly version: string;
}

export interface ErrorDetails {
  readonly code: string;
  readonly message: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly domain: ErrorDomain;
  readonly context: ErrorContext;
  readonly cause?: Error;
  readonly recovery?: RecoveryStrategy;
  readonly fingerprint: string;
}

export interface RecoveryAction {
  readonly type: 'retry' | 'fallback' | 'circuit_break' | 'notify' | 'escalate';
  readonly description: string;
  readonly canRetry: boolean;
  readonly immediateAction?: () => Promise<void>;
  readonly delayMs?: number;
  readonly maxAttempts?: number;
}

export interface RecoveryStrategy {
  readonly name: string;
  readonly description: string;
  readonly actions: RecoveryAction[];
  readonly isApplicable: (error: ErrorDetails) => boolean;
  readonly shouldEscalate: (attemptCount: number) => boolean;
}

export interface ErrorMetrics {
  readonly errorCount: number;
  readonly errorRate: number;
  readonly averageResolutionTime: number;
  readonly successfulRecoveries: number;
  readonly failedRecoveries: number;
  readonly categoryBreakdown: Record<ErrorCategory, number>;
  readonly domainBreakdown: Record<ErrorDomain, number>;
  readonly severityBreakdown: Record<ErrorSeverity, number>;
}

export interface ErrorPattern {
  readonly signature: string;
  readonly occurrences: number;
  readonly firstSeen: Date;
  readonly lastSeen: Date;
  readonly recoverySuccess: number;
  readonly recoveryFailure: number;
  readonly associatedOperations: string[];
}

export interface ErrorAlert {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: ErrorSeverity;
  readonly timestamp: Date;
  readonly resolved: boolean;
  readonly errorPattern: ErrorPattern;
  readonly recommendedActions: string[];
}

export class EnhancedError extends Error {
  public readonly details: ErrorDetails;

  constructor(details: Partial<ErrorDetails> & { message: string }) {
    super(details.message);
    this.name = 'EnhancedError';

    const defaultContext = this.createDefaultContext();
    const finalDetails = {
      code: details.code || 'UNKNOWN_ERROR',
      message: details.message,
      severity: details.severity || ErrorSeverity.MEDIUM,
      category: details.category || ErrorCategory.BUSINESS,
      domain: details.domain || ErrorDomain.BUSINESS_LOGIC,
      context: details.context || defaultContext,
      fingerprint: details.fingerprint || this.generateFingerprint(details.message),
    };

    this.details = {
      ...finalDetails,
      ...(details.cause && { cause: details.cause }),
      ...(details.recovery && { recovery: details.recovery }),
    } as ErrorDetails;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedError);
    }
  }

  private createDefaultContext(): ErrorContext {
    return {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'unknown',
      service: process.env.SERVICE_NAME || 'unknown',
      version: process.env.SERVICE_VERSION || '1.0.0',
    };
  }

  private generateFingerprint(message: string): string {
    const crypto = require('crypto');
    const normalized = message.replace(/\d+/g, '#').replace(/['"]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  static fromError(error: Error, overrides?: Partial<ErrorDetails>): EnhancedError {
    if (error instanceof EnhancedError) {
      return error;
    }

    return new EnhancedError({
      message: error.message,
      cause: error,
      ...overrides,
    });
  }

  withContext(context: Partial<ErrorContext>): EnhancedError {
    return new EnhancedError({
      ...this.details,
      context: { ...this.details.context, ...context },
    });
  }

  withRecovery(recovery: RecoveryStrategy): EnhancedError {
    return new EnhancedError({
      ...this.details,
      recovery,
    });
  }

  isSimilarTo(other: ErrorDetails): boolean {
    return this.details.fingerprint === other.fingerprint;
  }

  shouldRetry(): boolean {
    return this.details.recovery?.actions.some(action => action.canRetry) ?? false;
  }

  getRetryAction(): RecoveryAction | undefined {
    return this.details.recovery?.actions.find(action => action.type === 'retry');
  }
}
# @pro/logger

Unified Pino-based logging infrastructure for the Pro monorepo. This package provides production-ready logging with multiple output targets, context-aware serialization, and environment-specific formatting.

## Purpose

Standardize logging across all NestJS microservices with intelligent routing: pretty console output in development, structured JSON logs in production, and dedicated error log files.

## Architecture

```
@pro/logger/
├── src/
│   ├── index.ts              # Public API exports
│   └── logger.config.ts      # Configuration factory
├── package.json              # Dependencies: pino, nestjs-pino, pino-pretty
└── tsconfig.json             # CommonJS compilation target
```

## Core Exports

### Factory Function
```typescript
createLoggerConfig(options: LoggerOptions): any
```

### Re-exported from nestjs-pino
```typescript
PinoLogger                    // Service for dependency injection
Logger                        // Decorator for controller/service injection
LoggerModule                  // NestJS module for initialization
LoggerModuleAsyncParams       // Type for async configuration
```

## Configuration Interface

```typescript
interface LoggerOptions {
  serviceName: string;        // Required: Service identifier for log messages
  logLevel?: string;          // Optional: Override default log level
  logDir?: string;            // Optional: Directory for file logs (default: './logs')
  enablePretty?: boolean;     // Optional: Enable pretty printing (default: true)
}
```

## Logging Behavior

### Environment Detection
- **Development** (`NODE_ENV !== 'production'`):
  - Level: `debug`
  - Targets: Pretty console + error file
  - Output: Colorized, human-readable format

- **Production** (`NODE_ENV === 'production'`):
  - Level: `info`
  - Targets: JSON file + error file
  - Output: Structured JSON for log aggregation

### Output Targets

1. **Pretty Console** (Development only)
   - Target: `pino-pretty`
   - Level: `debug`
   - Format: `[serviceName] {msg}`
   - Features: Colorization, timestamp translation

2. **Error Log File** (Always)
   - Target: `pino/file`
   - Level: `error`
   - Path: `{logDir}/{serviceName}-error.log`
   - Auto-creates directories

3. **Info Log File** (Production only)
   - Target: `pino/file`
   - Level: `info`
   - Path: `{logDir}/{serviceName}.log`
   - Captures all non-error production logs

### Request/Response Serialization

```typescript
// HTTP request serialization (strips headers for privacy)
req: {
  id,                // Request correlation ID
  method,            // HTTP method
  url,               // Request URL
  remoteAddress,     // Client IP
  remotePort         // Client port
}

// HTTP response serialization (minimal footprint)
res: {
  statusCode         // HTTP status code only
}
```

## Usage Patterns

### Module Integration

```typescript
import { LoggerModule, createLoggerConfig } from '@pro/logger';

@Module({
  imports: [
    LoggerModule.forRoot(createLoggerConfig({
      serviceName: '@pro/api',           // Required
      logLevel: 'debug',                 // Optional override
      logDir: './logs',                  // Optional custom path
      enablePretty: true,                // Optional toggle
    })),
  ],
})
export class AppModule {}
```

### Service Injection

```typescript
import { PinoLogger } from '@pro/logger';

@Injectable()
export class TaskScannerScheduler {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(TaskScannerScheduler.name);
  }

  async processTask(taskId: string) {
    this.logger.debug({ taskId }, 'Processing task');

    try {
      // Business logic
      this.logger.info({ taskId }, 'Task completed');
    } catch (error) {
      this.logger.error({ taskId, error }, 'Task failed');
    }
  }
}
```

### Logging Methods

```typescript
logger.trace(obj?, msg?)      // Verbose debugging
logger.debug(obj?, msg?)      // Development debugging
logger.info(obj?, msg?)       // Informational messages
logger.warn(obj?, msg?)       // Warning conditions
logger.error(obj?, msg?)      // Error conditions
logger.fatal(obj?, msg?)      // Fatal errors requiring immediate attention
```

### Context Setting

```typescript
// Set logger context for namespaced logging
logger.setContext('ServiceName');

// Context appears in all subsequent log messages
logger.info('Operation started');  // [ServiceName] Operation started
```

## Real-World Examples

### API Service
```typescript
// apps/api/src/app.module.ts
LoggerModule.forRoot(createLoggerConfig({
  serviceName: '@pro/api',
}))
```

### Broker Service
```typescript
// apps/broker/src/broker.module.ts
LoggerModule.forRoot(createLoggerConfig({
  serviceName: '@pro/broker',
}))
```

### Crawler Service
```typescript
// apps/crawler/src/app.module.ts
LoggerModule.forRoot(createLoggerConfig({
  serviceName: '@pro/crawler',
}))
```

### Cleaner Service
```typescript
// apps/cleaner/src/app.module.ts
LoggerModule.forRoot(createLoggerConfig({
  serviceName: '@pro/cleaner',
}))
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| pino | ^9.13.1 | Fast JSON logger |
| nestjs-pino | ^4.4.1 | NestJS integration |
| pino-http | ^10.5.0 | HTTP request logging |
| pino-pretty | ^13.1.2 | Development formatting |

## Design Principles

**存在即合理 (Existence Implies Necessity)**
- Every log target serves a distinct purpose
- No redundant configuration options
- Minimal API surface: one factory function

**优雅即简约 (Elegance is Simplicity)**
- Single `createLoggerConfig` call for all services
- Environment-aware behavior without explicit flags
- Automatic directory creation for log files

**性能即艺术 (Performance is Art)**
- Pino: fastest Node.js logger
- Structured logging for efficient parsing
- Zero overhead in production (no pretty printing)

**日志是思想的表达 (Logs Express Thought)**
- Context-aware messages via `setContext()`
- Structured data in first parameter
- Human message in second parameter
- Dedicated error files for failure investigation

## Quick Reference

```typescript
// Import
import { LoggerModule, createLoggerConfig, PinoLogger } from '@pro/logger';

// Module setup
LoggerModule.forRoot(createLoggerConfig({ serviceName: '@pro/service' }))

// Service usage
constructor(private readonly logger: PinoLogger) {
  this.logger.setContext(MyService.name);
}

// Logging patterns
this.logger.debug({ data }, 'Debug message');
this.logger.info({ data }, 'Info message');
this.logger.warn({ data }, 'Warning message');
this.logger.error({ error, context }, 'Error message');
```

## File Locations

| File | Purpose |
|------|---------|
| `/home/ubuntu/worktrees/pro/packages/logger/src/index.ts` | Public API exports |
| `/home/ubuntu/worktrees/pro/packages/logger/src/logger.config.ts` | Configuration factory |
| `/home/ubuntu/worktrees/pro/packages/logger/package.json` | Package metadata and dependencies |

---

**Package Type**: Infrastructure / Logging
**Target Environment**: NestJS Microservices
**Build Output**: CommonJS (dist/)

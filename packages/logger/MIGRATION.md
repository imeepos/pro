# Migration Guide: @pro/logger Refactoring

## Overview

`@pro/logger` has been refactored to be framework-agnostic. NestJS-specific functionality has been moved to `@pro/logger-nestjs`.

## What Changed

### @pro/logger (Framework-Agnostic)

Now exports:
- `createLogger(options)` - Creates a standard Pino logger instance
- `createLoggerConfig(options)` - Creates Pino configuration object
- `Logger` - Type export from Pino
- `LoggerOptions` - Configuration options interface

Removed:
- `LoggerModule` - Moved to `@pro/logger-nestjs`
- `PinoLogger` - Moved to `@pro/logger-nestjs`
- `LoggerModuleAsyncParams` - Moved to `@pro/logger-nestjs`

### @pro/logger-nestjs (New Package)

Exports all NestJS-specific functionality:
- `LoggerModule` - NestJS module
- `PinoLogger` - Injectable logger service
- `Logger` - NestJS logger adapter
- `LoggerModuleAsyncParams` - Async configuration type
- `createLoggerConfig(options)` - NestJS-compatible config creator

## Migration Steps

### For NestJS Applications

1. Install the new package:
```bash
pnpm add @pro/logger-nestjs
```

2. Update imports in all files:
```typescript
// Before
import { LoggerModule, createLoggerConfig, PinoLogger } from '@pro/logger';

// After
import { LoggerModule, createLoggerConfig, PinoLogger } from '@pro/logger-nestjs';
```

3. No code changes needed - the API remains the same

### For Non-NestJS Applications

Use `@pro/logger` directly:

```typescript
import { createLogger } from '@pro/logger';

const logger = createLogger({
  serviceName: 'my-service',
  logLevel: 'info'
});

logger.info('Application started');
```

## Why This Change?

1. **Separation of Concerns**: Pure logging logic is separated from framework-specific code
2. **Reusability**: `@pro/logger` can now be used in any Node.js application
3. **Clarity**: Clear distinction between framework-agnostic and NestJS-specific functionality
4. **Maintainability**: Each package has a single, well-defined purpose

## Need Help?

If you encounter any issues during migration, check:
1. All imports are updated to use `@pro/logger-nestjs` in NestJS apps
2. The package is properly installed in your app's dependencies
3. TypeScript compilation succeeds without errors

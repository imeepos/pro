# @pro/logger

Framework-agnostic Pino logger package for Pro monorepo.

## Installation

```bash
pnpm add @pro/logger
```

## Usage

### Create Logger Instance

```typescript
import { createLogger } from '@pro/logger';

const logger = createLogger({
  serviceName: 'my-service',
  logLevel: 'info',
  logDir: './logs',
  enablePretty: true
});

logger.info('Service started');
logger.error({ err: error }, 'Operation failed');
```

### Create Logger Configuration

For frameworks that require Pino configuration objects:

```typescript
import { createLoggerConfig } from '@pro/logger';

const config = createLoggerConfig({
  serviceName: 'my-service',
  logLevel: 'info',
  logDir: './logs',
  enablePretty: true
});
```

## API

### `createLogger(options)`

Creates and returns a Pino logger instance.

**Options:**
- `serviceName: string` - Name of your service (required)
- `logLevel?: string` - Log level (defaults to 'debug' in dev, 'info' in production)
- `logDir?: string` - Directory for log files (defaults to './logs')
- `enablePretty?: boolean` - Enable pretty printing in development (defaults to true)

**Returns:** `Logger` - Standard Pino logger instance

### `createLoggerConfig(options)`

Creates a Pino configuration object.

**Options:** Same as `createLogger`

**Returns:** `LoggerOptions` - Pino configuration object

## Features

- Development mode: Pretty-printed colored output
- Production mode: JSON logs to files
- Error logs: Always written to `{serviceName}-error.log`
- Info logs: Written to `{serviceName}.log` in production
- Framework-agnostic: Works with any Node.js application

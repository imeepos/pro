# @pro/logger-nestjs

NestJS adapter for Pro logging infrastructure. This package provides NestJS-specific logging functionality built on top of `@pro/logger`.

## Installation

```bash
pnpm add @pro/logger-nestjs
```

## Usage

### Module Configuration

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule, createLoggerConfig } from '@pro/logger-nestjs';

@Module({
  imports: [
    LoggerModule.forRoot(
      createLoggerConfig({
        serviceName: 'my-service',
        logLevel: 'info',
        logDir: './logs',
        enablePretty: true
      })
    ),
  ],
})
export class AppModule {}
```

### Using Logger in Services

```typescript
import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger-nestjs';

@Injectable()
export class MyService {
  constructor(private readonly logger: PinoLogger) {}

  doSomething() {
    this.logger.info('Doing something');
    this.logger.error({ err: error }, 'Operation failed');
  }
}
```

### Bootstrap Configuration

```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from '@pro/logger-nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  app.useLogger(app.get(Logger));

  await app.listen(3000);
}

bootstrap();
```

## API

### `createLoggerConfig(options)`

Creates NestJS-compatible logger configuration.

**Options:**
- `serviceName: string` - Name of your service (required)
- `logLevel?: string` - Log level (defaults to 'debug' in dev, 'info' in production)
- `logDir?: string` - Directory for log files (defaults to './logs')
- `enablePretty?: boolean` - Enable pretty printing in development (defaults to true)

**Returns:** Configuration object for `LoggerModule.forRoot()`

### Exported Types and Classes

- `LoggerModule` - NestJS module for logger
- `PinoLogger` - Injectable logger service
- `Logger` - NestJS-compatible logger adapter
- `LoggerModuleAsyncParams` - Type for async module configuration

## Migration from @pro/logger

If your NestJS application is currently using `@pro/logger`, update imports:

```typescript
// Before
import { LoggerModule, createLoggerConfig, PinoLogger } from '@pro/logger';

// After
import { LoggerModule, createLoggerConfig, PinoLogger } from '@pro/logger-nestjs';
```

Note: `@pro/logger` is now framework-agnostic and should only be used in non-NestJS applications.

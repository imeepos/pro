# @pro/eslint-config

## Overview

A unified ESLint configuration factory for the Pro monorepo, designed to enforce code quality, type safety, and architectural consistency across TypeScript projects. This package provides specialized configurations for different project types: NestJS backend services, Angular frontend applications, Node.js libraries, and strict TypeScript projects.

**Location**: `/home/ubuntu/worktrees/pro/packages/eslint-config`

**Purpose**: Centralize linting rules and ensure consistency across all workspace packages and applications.

## Architecture

### Factory Pattern

The package uses a factory function `createTypeScriptConfig` to generate ESLint configurations dynamically based on project context:

```javascript
function createTypeScriptConfig(options = {})
```

This factory:
- Discovers TypeScript project files automatically
- Applies appropriate parser and plugin configurations
- Merges recommended rules with custom overrides
- Handles type-aware linting when tsconfig is available

### Configuration Presets

| Preset | Entry Point | Use Case |
|--------|-------------|----------|
| Base | `index.js` | Default TypeScript configuration |
| NestJS | `nestjs.js` | Backend services with decorators and DI |
| Angular | `angular.js` | Frontend applications with components |
| Node | `node.js` | Libraries and utility packages |
| TypeScript | `typescript.js` | Type-strict libraries |

## Core Rules Rationale

### Type Safety Rules (Pragmatic Approach)

```javascript
'@typescript-eslint/no-explicit-any': 'off'
'@typescript-eslint/no-unsafe-*': 'off'
```

**Philosophy**: In a large monorepo with mixed codebases at different maturity levels, strict type safety rules create friction during migration and rapid development. These rules are disabled to allow pragmatic development while relying on TypeScript's compiler for critical type checking.

### Unused Variables

```javascript
'@typescript-eslint/no-unused-vars': ['error', {
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_'
}]
```

**Rationale**: Enforce variable usage while allowing intentional ignores via underscore prefix convention. This prevents dead code accumulation while supporting interface implementations that require unused parameters.

### Disabled Promise Rules

```javascript
'@typescript-eslint/no-floating-promises': 'off'
'@typescript-eslint/no-misused-promises': 'off'
```

**Context**: Backend services frequently fire-and-forget async operations (logging, metrics, background tasks). Strict promise handling rules create noise without value in these scenarios.

### Console Statements

```javascript
'no-console': 'off'
```

**Rationale**: The monorepo uses structured logging packages (`@pro/logger`). Console statements serve as legitimate debugging tools during development and are removed via build optimizations in production.

## Configuration Options

### Factory Options

```typescript
interface ConfigOptions {
  tsconfigRootDir?: string;        // Root directory for tsconfig resolution
  sourceType?: 'module' | 'script'; // ECMAScript module type
  projectFiles?: string[];          // Additional tsconfig files to consider
  project?: boolean | string[];     // Enable/disable or specify project files
  ignores?: string[];               // Additional glob patterns to ignore
  rules?: Record<string, any>;      // Rule overrides
  typeAware?: boolean;              // Enable type-aware linting (requires tsconfig)
  ecmaVersion?: number | 'latest';  // ECMAScript version
}
```

### Default Ignored Patterns

```javascript
[
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/tmp/**',
  '**/.turbo/**',
  '**/.angular/**',
]
```

### TypeScript Project Discovery

The factory attempts to find TypeScript configuration files in this order:

1. `tsconfig.eslint.json` (dedicated ESLint config)
2. `tsconfig.app.json` (application config)
3. `tsconfig.lib.json` (library config)
4. `tsconfig.spec.json` (test config)
5. `tsconfig.worker.json` (worker config)
6. `tsconfig.server.json` (server config)
7. `tsconfig.json` (main config)
8. `tsconfig.base.json` (base config)

**Why this order?** Prioritizes specialized configs over generic ones, enabling fine-grained control per project type.

## Usage Patterns

### NestJS Backend Service

```javascript
// apps/api/eslint.config.js
module.exports = require('@pro/eslint-config/nestjs');
```

**Characteristics**:
- Searches for `tsconfig.build.json`, `tsconfig.json`, `tsconfig.app.json`
- Ignores JavaScript files (TypeScript-only backend)
- Warns on `any` usage (backend services benefit from stricter typing)

### Angular Frontend Application

```javascript
// apps/admin/eslint.config.js
module.exports = require('@pro/eslint-config/angular');
```

**Characteristics**:
- Ignores HTML templates and generated GraphQL files
- Disables type-aware rules (performance optimization for large Angular projects)
- Searches for Angular-specific tsconfig files

### Node.js Library Package

```javascript
// packages/utils/eslint.config.js
module.exports = require('@pro/eslint-config/node');
```

**Characteristics**:
- Searches for `tsconfig.node.json` and `tsconfig.json`
- Enables module-based linting
- Minimal configuration for maximum compatibility

### Custom Configuration

```javascript
const { createTypeScriptConfig } = require('@pro/eslint-config/factory');

module.exports = createTypeScriptConfig({
  projectFiles: ['tsconfig.custom.json'],
  ignores: ['**/*.generated.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'complexity': ['warn', 15],
  },
});
```

## Integration with Monorepo Tools

### Turbo Integration

ESLint configurations work seamlessly with Turborepo's caching:

```json
{
  "tasks": {
    "lint": {
      "dependsOn": ["^lint"],
      "cache": true,
      "inputs": ["src/**/*.ts", "eslint.config.js", ".eslintrc.js"]
    }
  }
}
```

### TypeScript Project References

When using TypeScript project references, ensure ESLint can find all referenced projects:

```javascript
module.exports = createTypeScriptConfig({
  projectFiles: [
    'tsconfig.json',
    'packages/*/tsconfig.json',
  ],
});
```

## Performance Considerations

### Type-Aware Linting Trade-offs

Type-aware rules provide deeper analysis but significantly increase linting time:

- **Enabled**: 30-60s for full monorepo lint
- **Disabled**: 5-10s for full monorepo lint

**Angular preset disables type-aware linting** (`typeAware: false`) because:
1. Angular projects are typically large with many files
2. TypeScript compiler already provides type checking
3. CI/CD pipelines benefit from faster linting feedback

### Caching Strategy

Enable ESLint's built-in cache for development:

```json
{
  "scripts": {
    "lint": "eslint --cache --cache-location .eslintcache"
  }
}
```

## Common Issues and Solutions

### Issue: "Parsing error: Cannot find module 'typescript'"

**Cause**: Missing peer dependency

**Solution**:
```bash
pnpm add -D typescript eslint
```

### Issue: "Parsing error: ESLint was configured to run on `<file>` using `parserOptions.project`"

**Cause**: File is not included in any discovered tsconfig

**Solution**: Either:
1. Add file to tsconfig `include` array
2. Add pattern to `ignores` option
3. Create dedicated `tsconfig.eslint.json`:

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*", "scripts/**/*"]
}
```

### Issue: Slow linting performance

**Solutions**:
1. Disable type-aware linting for large projects
2. Reduce tsconfig `include` scope
3. Enable ESLint cache
4. Use `--max-warnings 0` in CI to fail fast

## Package Dependencies

### Core Dependencies

- `@typescript-eslint/eslint-plugin`: TypeScript-specific linting rules
- `@typescript-eslint/parser`: TypeScript parser for ESLint
- `eslint-config-prettier`: Disables rules that conflict with Prettier
- `eslint-plugin-prettier`: Runs Prettier as an ESLint rule

### Peer Dependencies

- `eslint`: ^9.17.0 (required)
- `typescript`: ^5.0.0 (required)

### Optional Peer Dependencies

- `@angular-eslint/*`: For Angular projects
- `eslint-plugin-import`: For import/export validation
- `eslint-plugin-jsdoc`: For JSDoc comment validation
- `eslint-plugin-security`: For security vulnerability detection
- `eslint-plugin-prefer-arrow`: For arrow function enforcement

## Quick Reference

### Import Configurations

```javascript
// Base TypeScript
require('@pro/eslint-config')

// NestJS backend
require('@pro/eslint-config/nestjs')

// Angular frontend
require('@pro/eslint-config/angular')

// Node.js library
require('@pro/eslint-config/node')

// Strict TypeScript
require('@pro/eslint-config/typescript')

// Custom factory
const { createTypeScriptConfig } = require('@pro/eslint-config/factory')
```

### Common Commands

```bash
# Lint project
pnpm eslint .

# Lint with auto-fix
pnpm eslint . --fix

# Lint specific files
pnpm eslint src/**/*.ts

# Lint with cache
pnpm eslint --cache .

# Check for unused disable directives
pnpm eslint --report-unused-disable-directives .
```

## Philosophy Alignment

This configuration package embodies the Code Artisan principles:

**存在即合理 (Existence Implies Necessity)**: Every disabled rule represents a conscious decision based on monorepo requirements. No rule is disabled arbitrarily.

**优雅即简约 (Elegance is Simplicity)**: The factory pattern eliminates duplication across preset configurations. Each preset is a thin specialization layer.

**性能即艺术 (Performance is Art)**: Type-aware linting is selectively disabled where it provides diminishing returns, balancing thoroughness with developer experience.

**错误处理如为人处世的哲学 (Error Handling as Life Philosophy)**: Configuration discovery gracefully degrades when tsconfig files are missing, allowing linting to proceed with basic rules rather than failing completely.

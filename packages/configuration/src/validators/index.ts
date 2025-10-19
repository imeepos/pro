import { ConfigurationDomain, ConfigurationPath } from '../types/index';

export interface ValidationRule<T = unknown> {
  readonly name: string;
  validate(value: T, path: string): ValidationResult;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export class ConfigurationValidator {
  private readonly rules = new Map<string, ValidationRule[]>();

  constructor() {
    this.setupDefaultRules();
  }

  addRule(path: string | RegExp, rule: ValidationRule): void {
    const key = path instanceof RegExp ? path.source : path;
    const existing = this.rules.get(key) || [];
    this.rules.set(key, [...existing, rule]);
  }

  validate(config: ConfigurationDomain): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.validateRecursive(config, '', errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateValue(path: ConfigurationPath, value: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rules = this.getApplicableRules(path);
    for (const rule of rules) {
      const result = rule.validate(value, path);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateRecursive(
    obj: any,
    basePath: string,
    errors: string[],
    warnings: string[]
  ): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = basePath ? `${basePath}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        this.validateRecursive(value, currentPath, errors, warnings);
      } else {
        const rules = this.getApplicableRules(currentPath);
        for (const rule of rules) {
          const result = rule.validate(value, currentPath);
          errors.push(...result.errors);
          warnings.push(...result.warnings);
        }
      }
    }
  }

  private getApplicableRules(path: string): ValidationRule[] {
    const rules: ValidationRule[] = [];

    for (const [pattern, ruleList] of this.rules) {
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regex = new RegExp(pattern.slice(1, -1));
        if (regex.test(path)) {
          rules.push(...ruleList);
        }
      } else if (pattern === path) {
        rules.push(...ruleList);
      }
    }

    return rules;
  }

  private setupDefaultRules(): void {
    this.addRule(/\.ttl\./, new PositiveNumberRule());
    this.addRule(/\.timeout/, new PositiveNumberRule());
    this.addRule(/\.delay/, new PositiveNumberRule());
    this.addRule(/\.interval/, new PositiveNumberRule());
    this.addRule(/\.threshold/, new PercentageRule());
    this.addRule(/\.maxAttempts/, new IntegerRangeRule(1, 10));
    this.addRule(/\.batchSize/, new IntegerRangeRule(1, 10000));

    this.addRule('cache.eviction.policy', new EnumRule(['allkeys-lru', 'volatile-lru', 'allkeys-random']));
    this.addRule('retry.backoff.type', new EnumRule(['exponential', 'linear', 'fixed']));
    this.addRule('cache.eviction.maxMemory', new MemorySizeRule());
  }
}

export class PositiveNumberRule implements ValidationRule<number> {
  readonly name = 'positive-number';

  validate(value: number, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${path}: 必须是有效数字`);
    } else if (value <= 0) {
      errors.push(`${path}: 必须是正数`);
    } else if (value > Number.MAX_SAFE_INTEGER) {
      warnings.push(`${path}: 值过大，可能导致精度丢失`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}

export class PercentageRule implements ValidationRule<number> {
  readonly name = 'percentage';

  validate(value: number, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${path}: 必须是有效数字`);
    } else if (value < 0 || value > 100) {
      errors.push(`${path}: 必须在 0-100 范围内`);
    } else if (value > 95) {
      warnings.push(`${path}: 阈值过高，可能影响系统稳定性`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}

export class IntegerRangeRule implements ValidationRule<number> {
  readonly name = 'integer-range';

  constructor(
    private readonly min: number,
    private readonly max: number
  ) {}

  validate(value: number, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${path}: 必须是有效数字`);
    } else if (!Number.isInteger(value)) {
      errors.push(`${path}: 必须是整数`);
    } else if (value < this.min || value > this.max) {
      errors.push(`${path}: 必须在 ${this.min}-${this.max} 范围内`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}

export class EnumRule implements ValidationRule<string> {
  readonly name = 'enum';

  constructor(private readonly allowedValues: string[]) {}

  validate(value: string, path: string): ValidationResult {
    const errors: string[] = [];

    if (typeof value !== 'string') {
      errors.push(`${path}: 必须是字符串`);
    } else if (!this.allowedValues.includes(value)) {
      errors.push(`${path}: 必须是以下值之一: ${this.allowedValues.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors, warnings: [] };
  }
}

export class MemorySizeRule implements ValidationRule<string> {
  readonly name = 'memory-size';

  validate(value: string, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof value !== 'string') {
      errors.push(`${path}: 必须是字符串`);
    } else {
      const pattern = /^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/i;
      const match = value.match(pattern);

      if (!match) {
        errors.push(`${path}: 格式错误，应为 "数字+单位" (如: 256mb, 1gb)`);
      } else {
        const [, size, unit] = match;
        const numericValue = parseFloat(size || '0');

        if (numericValue <= 0) {
          errors.push(`${path}: 大小必须为正数`);
        } else if (unit && unit.toLowerCase() === 'gb' && numericValue > 32) {
          warnings.push(`${path}: 内存配置过大，请确认系统资源充足`);
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}
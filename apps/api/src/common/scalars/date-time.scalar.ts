import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, type ValueNode } from 'graphql';

type AcceptedInput = Date | string | number | null | undefined;

@Scalar('DateTime', () => Date)
export class DateTimeScalar implements CustomScalar<AcceptedInput, Date> {
  readonly description = '宽容且可靠的日期时间标量';

  serialize(value: AcceptedInput): string {
    return this.normalize(value).toISOString();
  }

  parseValue(value: AcceptedInput): Date {
    return this.normalize(value);
  }

  parseLiteral(ast: ValueNode): Date {
    switch (ast.kind) {
      case Kind.STRING:
        return this.normalize(ast.value);
      case Kind.INT:
      case Kind.FLOAT:
        return this.normalize(Number(ast.value));
      case Kind.NULL:
        return new Date();
      default:
        throw new TypeError(
          `无法解析的 DateTime AST 类型: ${ast.kind}`,
        );
    }
  }

  private normalize(value: AcceptedInput): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const milliseconds = value >= 1e12 ? value : value * 1000;
      const numericDate = new Date(milliseconds);
      if (!Number.isNaN(numericDate.getTime())) {
        return numericDate;
      }
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return new Date();
      }

      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        return this.normalize(numeric);
      }

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
      throw new TypeError(`无效的 DateTime 字符串: ${trimmed}`);
    }

    if (value === null || value === undefined) {
      return new Date();
    }

    throw new TypeError(`不支持的 DateTime 类型: ${typeof value}`);
  }
}

import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

type DlqMessageModelInit = {
  id?: string;
  queueName?: string;
  content?: unknown;
  failedAt?: Date | string | number | null;
  retryCount?: number;
  errorMessage?: string | null;
};

@ObjectType('DlqMessage')
export class DlqMessageModel {
  @Field(() => String)
  id: string;

  @Field(() => String)
  queueName: string;

  @Field(() => GraphQLJSON, { nullable: true })
  content?: unknown;

  @Field(() => Date)
  failedAt: Date = new Date();

  @Field(() => Int)
  retryCount: number;

  @Field(() => String, { nullable: true })
  errorMessage?: string;

  constructor(init?: DlqMessageModelInit) {
    if (!init) {
      return;
    }

    const { failedAt, ...rest } = init;
    Object.assign(this, rest);
    this.failedAt = this.coerceToDate(failedAt);
  }

  private coerceToDate(value: Date | string | number | null | undefined): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const timestamp = value >= 1e12 ? value : value * 1000;
      const numericDate = new Date(timestamp);
      if (!Number.isNaN(numericDate.getTime())) {
        return numericDate;
      }
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        const asNumber = Number(trimmed);
        if (!Number.isNaN(asNumber)) {
          return this.coerceToDate(asNumber);
        }

        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return new Date();
  }
}

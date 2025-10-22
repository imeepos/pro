import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { DateTimeScalar } from '../../common/scalars/date-time.scalar';

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
  private failureMoment: Date = new Date();

  constructor(init?: DlqMessageModelInit) {
    if (init) {
      Object.assign(this, init);
    }
  }

  @Field(() => String)
  id: string;

  @Field(() => String)
  queueName: string;

  @Field(() => GraphQLJSON, { nullable: true })
  content?: unknown;

  @Field(() => DateTimeScalar)
  get failedAt(): Date {
    return this.failureMoment;
  }

  set failedAt(value: Date | string | number | null | undefined) {
    this.failureMoment = this.coerceToDate(value);
  }

  @Field(() => Int)
  retryCount: number;

  @Field(() => String, { nullable: true })
  errorMessage?: string;

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

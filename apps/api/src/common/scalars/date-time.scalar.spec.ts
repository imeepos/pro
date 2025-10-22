import { Kind } from 'graphql';
import { DateTimeScalar } from './date-time.scalar';

describe('DateTimeScalar', () => {
  const scalar = new DateTimeScalar();

  it('serializes Date instances to ISO strings', () => {
    const date = new Date('2023-11-12T13:14:15.123Z');
    expect(scalar.serialize(date)).toBe(date.toISOString());
  });

  it('parses numeric seconds into Date', () => {
    const seconds = 1_700_000_000;
    const parsed = scalar.parseValue(seconds);
    expect(parsed.getTime()).toBe(seconds * 1000);
  });

  it('parses ISO literals from AST', () => {
    const literal = {
      kind: Kind.STRING,
      value: '2022-02-03T04:05:06.789Z',
    } as const;

    const result = scalar.parseLiteral(literal);
    expect(result.toISOString()).toBe(literal.value);
  });

  it('rejects invalid strings', () => {
    expect(() => scalar.parseValue('not-a-date')).toThrow(
      /无效的 DateTime 字符串/,
    );
  });
});

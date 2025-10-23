import { DlqManagerService } from '../dlq-manager.service';

const timestamp = (dateString: string): Date => new Date(dateString);

const createLogger = () => ({
  debug: jest.fn<void, [string]>(),
  warn: jest.fn<void, [string]>(),
  error: jest.fn<void, [string]>(),
});

const createService = (logger = createLogger()) => {
  const service = new DlqManagerService(
    {
      url: 'amqp://localhost',
    },
    { logger },
  );

  return { service, logger };
};

describe('DlqManagerService timestamp resolution', () => {
  it('returns existing Date instance untouched', () => {
    const { service, logger } = createService();
    const value = timestamp('2024-01-02T03:04:05.678Z');

    const result = (service as any).resolveFailureTime({ time: value });

    expect(result).toBe(value);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('[DLQ] 解析失败时间'),
    );
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('时间戳为有效 Date 实例'),
    );
  });

  it('parses numeric seconds and converts to milliseconds', () => {
    const { service, logger } = createService();
    const seconds = 1_695_000_000;

    const result = (service as any).resolveFailureTime({ time: seconds });

    expect(result.getTime()).toBe(seconds * 1000);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('数值时间戳解析'),
    );
  });

  it('parses numeric string timestamps', () => {
    const { service, logger } = createService();
    const seconds = '1695000000';

    const result = (service as any).resolveFailureTime({ time: seconds });

    expect(result.getTime()).toBe(Number(seconds) * 1000);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('字符串数字时间戳解析'),
    );
  });

  it('parses ISO strings gracefully', () => {
    const { service, logger } = createService();
    const isoValue = '2023-05-06T07:08:09.123Z';

    const result = (service as any).resolveFailureTime({ time: isoValue });

    expect(result.toISOString()).toBe(isoValue);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('ISO 字符串解析'),
    );
  });

  it('falls back to current time when value is missing', () => {
    const { service, logger } = createService();

    const before = Date.now();
    const result = (service as any).resolveFailureTime({});
    const after = Date.now();

    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after + 5);
    expect(logger.warn).toHaveBeenCalledWith(
      '[DLQ] x-death 缺少 time 值，使用当前时间',
    );
  });

  it('logs error and falls back when parsing fails', () => {
    const { service, logger } = createService();

    const before = Date.now();
    const result = (service as any).resolveFailureTime({ time: { invalid: true } });
    const after = Date.now();

    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after + 5);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('未知时间戳类型'),
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('无法解析死信消息时间'),
    );
  });
});

describe('DlqManagerService diagnostics', () => {
  it('exposes default connection status gracefully', () => {
    const { service } = createService();

    const status = service.getConnectionStatus();

    expect(status.connected).toBe(false);
    expect(status.target).toBe('amqp://localhost/');
    expect(status.lastError).toBeUndefined();
  });

  it('sanitizes connection target without leaking credentials', () => {
    const service = new DlqManagerService(
      {
        url: 'amqp://guest:secret@127.0.0.1:5672/%2Fanalytics',
      },
      { logger: createLogger() },
    );

    const status = service.getConnectionStatus();

    expect(status.target).toBe('amqp://guest@127.0.0.1:5672/analytics');
    expect(status.target.includes('secret')).toBe(false);
  });
});

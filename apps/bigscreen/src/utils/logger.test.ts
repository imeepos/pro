import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, logger } from './logger';

describe('Logger', () => {
  let mockConsole: {
    log: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockConsole = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Mock console methods
    vi.stubGlobal('console', {
      ...console,
      log: mockConsole.log,
      warn: mockConsole.warn,
      error: mockConsole.error,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create logger with source', () => {
      const testLogger = createLogger('TestComponent');
      expect(testLogger).toBeDefined();
      expect(typeof testLogger.debug).toBe('function');
      expect(typeof testLogger.info).toBe('function');
      expect(typeof testLogger.warn).toBe('function');
      expect(typeof testLogger.error).toBe('function');
    });

    it('should create logger with default source', () => {
      const testLogger = createLogger();
      expect(testLogger).toBeDefined();
    });
  });

  describe('Logger functionality', () => {
    let testLogger: ReturnType<typeof createLogger>;

    beforeEach(() => {
      testLogger = createLogger('TestLogger');
    });

    describe('debug', () => {
      it('should log debug message', () => {
        testLogger.debug('Test debug message');
        expect(mockConsole.log).toHaveBeenCalled();
      });

      it('should log debug message with data', () => {
        testLogger.debug('Test debug message', { key: 'value' });
        expect(mockConsole.log).toHaveBeenCalled();
      });
    });

    describe('info', () => {
      it('should log info message', () => {
        testLogger.info('Test info message');
        expect(mockConsole.log).toHaveBeenCalled();
      });
    });

    describe('warn', () => {
      it('should log warn message', () => {
        testLogger.warn('Test warn message');
        expect(mockConsole.warn).toHaveBeenCalled();
      });
    });

    describe('error', () => {
      it('should log error message', () => {
        testLogger.error('Test error message');
        expect(mockConsole.error).toHaveBeenCalled();
      });

      it('should log error message with error object', () => {
        const error = new Error('Test error');
        testLogger.error('Test error message', error);
        expect(mockConsole.error).toHaveBeenCalled();
      });
    });
  });

  describe('Global logger', () => {
    it('should provide global logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });
});
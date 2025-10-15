/**
 * 统一日志系统
 * 提供结构化日志记录，支持不同环境下的日志级别控制
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  source?: string;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, source, timestamp } = entry;
    const levelName = LogLevel[level];
    const sourcePrefix = source ? `[${source}]` : '';
    return `${timestamp} ${levelName} ${sourcePrefix} ${message}`;
  }

  private createLogEntry(level: LogLevel, message: string, data?: unknown, source?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      source
    };
  }

  debug(message: string, data?: unknown, source?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, data, source);
    
    if (this.isDevelopment) {
      console.debug(this.formatMessage(entry), data || '');
    }
  }

  info(message: string, data?: unknown, source?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, data, source);
    
    if (this.isDevelopment) {
      console.info(this.formatMessage(entry), data || '');
    }
  }

  warn(message: string, data?: unknown, source?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, data, source);
    
    console.warn(this.formatMessage(entry), data || '');
  }

  error(message: string, error?: Error | unknown, source?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, error, source);
    
    console.error(this.formatMessage(entry), error || '');
    
    // 在生产环境可以添加错误上报逻辑
    if (!this.isDevelopment && error instanceof Error) {
      this.reportError(error, message, source);
    }
  }

  private reportError(error: Error, message: string, source?: string): void {
    // 这里可以集成错误监控服务，如 Sentry, LogRocket 等
    // 暂时只在控制台记录
    if (this.isDevelopment) {
      console.error('Error Report:', { error, message, source });
    }
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 创建带源标识的日志记录器
   */
  withSource(source: string) {
    return {
      debug: (message: string, data?: unknown) => this.debug(message, data, source),
      info: (message: string, data?: unknown) => this.info(message, data, source),
      warn: (message: string, data?: unknown) => this.warn(message, data, source),
      error: (message: string, error?: Error | unknown) => this.error(message, error, source)
    };
  }
}

// 导出单例实例
export const logger = new Logger();

// 导出便捷方法
export const { debug, info, warn, error } = logger;

// 导出源特定日志记录器工厂
export const createLogger = (source: string = 'App') => logger.withSource(source);

// 导出Logger类用于测试
export { Logger };

export default logger;
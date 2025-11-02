import pino from 'pino';

/**
 * 日志是思想的表达 - 简洁而有力的叙事工具
 *
 * 设计哲学：
 * - 每条日志都讲述系统的故事
 * - 拒绝冗余，只记录有意义的事件
 * - 结构化输出，便于分析和追踪
 *
 * 使命：成为系统的声音和记忆
 */

const logLevel = process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  name: '@pro/broker',
  level: logLevel,
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,
});

/**
 * 创建上下文日志器 - 为不同模块赋予独特的声音
 */
export const createContextLogger = (context: string) => {
  return logger.child({ context });
};

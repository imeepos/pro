import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 合并 Tailwind CSS 类名
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化数字
export function formatNumber(num: number | undefined | null): string {
  // 处理空值情况
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }

  // 确保是数字类型
  const numValue = Number(num);

  if (numValue >= 1000000) {
    return (numValue / 1000000).toFixed(1) + 'M';
  }
  if (numValue >= 1000) {
    return (numValue / 1000).toFixed(1) + 'K';
  }
  return numValue.toString();
}

// 格式化百分比
export function formatPercentage(num: number | undefined | null): string {
  // 处理空值情况
  if (num === undefined || num === null || isNaN(num)) {
    return '0.0%';
  }

  const numValue = Number(num);
  return `${(numValue * 100).toFixed(1)}%`;
}

// 格式化时间
export function formatTime(time: string | Date): string {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
}

// 相对时间
export function formatRelativeTime(time: string | Date): string {
  return dayjs(time).fromNow();
}

// 获取情感颜色
export function getSentimentColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-400';
    case 'negative':
      return 'text-red-400';
    case 'neutral':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

// 获取情感背景色
export function getSentimentBgColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
  switch (sentiment) {
    case 'positive':
      return 'bg-green-500/20';
    case 'negative':
      return 'bg-red-500/20';
    case 'neutral':
      return 'bg-gray-500/20';
    default:
      return 'bg-gray-500/20';
  }
}

// 获取趋势图标
export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return '↗';
    case 'down':
      return '↘';
    case 'stable':
      return '→';
    default:
      return '→';
  }
}

// 获取趋势颜色
export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'text-green-400';
    case 'down':
      return 'text-red-400';
    case 'stable':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

// 防抖函数
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 生成随机 ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// 深拷贝
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone((obj as Record<string, unknown>)[key]);
      }
    }
    return clonedObj as T;
  }
  return obj;
}

// 计算增长率
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// 获取时间范围的毫秒数
export function getTimeRangeMs(range: '1h' | '6h' | '24h' | '7d' | '30d'): number {
  switch (range) {
    case '1h':
      return 60 * 60 * 1000;
    case '6h':
      return 6 * 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

// 截断文本
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// 验证 URL
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// 导出统一日志系统
export { logger, debug, info, warn, error, createLogger, LogLevel } from './logger';

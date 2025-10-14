import { formatDate, debounce, sleep } from './common.js';

describe('Common Utils', () => {
  describe('formatDate', () => {
    it('应该使用默认格式正确格式化日期', () => {
      const date = new Date('2025-01-11T15:30:45');
      const formatted = formatDate(date);

      expect(formatted).toBe('2025-01-11 15:30:45');
    });

    it('应该使用自定义格式正确格式化日期', () => {
      const date = new Date('2025-01-11T15:30:45');

      expect(formatDate(date, 'y-MM-dd')).toBe('2025-01-11');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2025-01-11'); // 向后兼容
      expect(formatDate(date, 'HH:mm:ss')).toBe('15:30:45');
      expect(formatDate(date, 'y/MM/dd HH:mm')).toBe('2025/01/11 15:30');
      expect(formatDate(date, 'YYYY/MM/DD HH:mm')).toBe('2025/01/11 15:30'); // 向后兼容
    });

    it('应该正确处理个位数的月份和日期', () => {
      const date = new Date('2025-01-05T08:05:03');
      const formatted = formatDate(date);

      expect(formatted).toBe('2025-01-05 08:05:03');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('应该延迟函数执行', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该在连续调用时重置计时器', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      jest.advanceTimersByTime(50);
      debouncedFn();
      jest.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该传递参数给原函数', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2');
      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });

  describe('sleep', () => {
    it('应该返回一个 Promise', () => {
      const result = sleep(100);
      expect(result).toBeInstanceOf(Promise);
    });

    it('应该在指定时间后 resolve', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });
});

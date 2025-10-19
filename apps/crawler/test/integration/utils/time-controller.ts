/**
 * 时间控制器
 * 为测试提供精确的时间控制能力
 */
import { TimeControlOptions } from '../types/test-types.js';

/**
 * 时间控制器 - 测试时间的数字指挥家
 * 每一毫秒都可以被精确控制，每一刻都有其存在的意义
 */
export class TimeController {
  private frozenTime: Date | null = null;
  private timeOffset: number = 0;
  private timeSpeed: number = 1;
  private originalDate: typeof Date;
  private originalNow: () => number;
  private originalPerformanceNow: () => number;

  constructor() {
    // 保存原始时间函数
    this.originalDate = Date;
    this.originalNow = Date.now;
    this.originalPerformanceNow = performance.now.bind(performance);
  }

  /**
   * 冻结时间
   * 让时间停止流动，创造稳定的时间环境
   */
  freeze(frozenAt: Date = new Date()): void {
    this.frozenTime = frozenAt;
    this.replaceDateImplementation();
  }

  /**
   * 解冻时间
   * 让时间重新开始流动
   */
  unfreeze(): void {
    this.frozenTime = null;
    this.restoreDateImplementation();
  }

  /**
   * 时间旅行到指定时刻
   */
  travelTo(targetTime: Date): void {
    if (this.frozenTime) {
      this.frozenTime = targetTime;
    } else {
      const now = new Date();
      this.timeOffset = targetTime.getTime() - now.getTime();
      this.replaceDateImplementation();
    }
  }

  /**
   * 时间旅行指定毫秒数
   */
  travelBy(milliseconds: number): void {
    const currentTime = this.getCurrentTime();
    const targetTime = new Date(currentTime.getTime() + milliseconds);
    this.travelTo(targetTime);
  }

  /**
   * 获取当前时间
   * 根据当前的时间控制状态返回相应的时间
   */
  getCurrentTime(): Date {
    if (this.frozenTime) {
      return new Date(this.frozenTime);
    }

    const now = this.originalNow();
    const adjustedTime = now + this.timeOffset;
    return new Date(adjustedTime);
  }

  /**
   * 设置时间流逝速度
   * speed > 1: 时间加快
   * speed < 1: 时间减慢
   * speed = 0: 时间停止
   */
  setSpeed(speed: number): void {
    if (speed <= 0) {
      throw new Error('时间速度必须大于0');
    }

    this.timeSpeed = speed;
    this.replaceDateImplementation();
  }

  /**
   * 获取当前时间戳
   */
  now(): number {
    return this.getCurrentTime().getTime();
  }

  /**
   * 获取性能时间戳
   * 考虑时间速度调整的性能计时器
   */
  performanceNow(): number {
    if (this.timeSpeed !== 1) {
      const originalNow = this.originalPerformanceNow();
      return originalNow * this.timeSpeed;
    }
    return this.originalPerformanceNow();
  }

  /**
   * 重置所有时间控制
   * 恢复到正常的时间流逝状态
   */
  reset(): void {
    this.unfreeze();
    this.timeOffset = 0;
    this.timeSpeed = 1;
    this.restoreDateImplementation();
  }

  /**
   * 检查时间是否被冻结
   */
  isFrozen(): boolean {
    return this.frozenTime !== null;
  }

  /**
   * 获取时间偏移量
   */
  getTimeOffset(): number {
    return this.timeOffset;
  }

  /**
   * 获取时间速度
   */
  getTimeSpeed(): number {
    return this.timeSpeed;
  }

  /**
   * 创建定时器，支持时间控制
   */
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const adjustedDelay = delay / this.timeSpeed;
    return setTimeout(callback, adjustedDelay);
  }

  /**
   * 创建间隔器，支持时间控制
   */
  setInterval(callback: () => void, interval: number): NodeJS.Timeout {
    const adjustedInterval = interval / this.timeSpeed;
    return setInterval(callback, adjustedInterval);
  }

  /**
   * 等待指定时间
   */
  async sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
      this.setTimeout(resolve, milliseconds);
    });
  }

  /**
   * 等待直到指定条件满足
   */
  async waitUntil(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = this.now();
    const endTime = startTime + timeout;

    while (this.now() < endTime) {
      if (await condition()) {
        return;
      }
      await this.sleep(interval);
    }

    throw new Error(`等待超时: ${timeout}ms`);
  }

  /**
   * 替换Date实现
   */
  private replaceDateImplementation(): void {
    const self = this;

    // 创建自定义Date构造函数
    const CustomDate = function(this: any, ...args: any[]) {
      if (args.length === 0) {
        return self.getCurrentTime();
      }

      if (args.length === 1) {
        const arg = args[0];
        if (typeof arg === 'string') {
          return new self.originalDate(arg);
        }
        if (typeof arg === 'number') {
          const adjustedTime = arg / self.timeSpeed - self.timeOffset;
          return new self.originalDate(adjustedTime);
        }
      }

      // 对于其他参数，创建一个新Date并调整时间
      const originalDate = new (self.originalDate.bind(self.originalDate) as any)(...args);
      const adjustedTime = originalDate.getTime() / self.timeSpeed + self.timeOffset;
      return new self.originalDate(adjustedTime);
    } as any;

    // 复制静态方法和属性
    CustomDate.now = () => self.now();
    CustomDate.parse = self.originalDate.parse;
    CustomDate.UTC = self.originalDate.UTC;
    CustomDate.prototype = self.originalDate.prototype;

    // 替换全局Date
    (global as any).Date = CustomDate;

    // 替换performance.now
    if (typeof performance !== 'undefined') {
      performance.now = () => self.performanceNow();
    }
  }

  /**
   * 恢复原始Date实现
   */
  private restoreDateImplementation(): void {
    (global as any).Date = this.originalDate;
    if (typeof performance !== 'undefined') {
      performance.now = this.originalPerformanceNow;
    }
  }

  /**
   * 创建时间快照
   * 用于保存和恢复时间状态
   */
  createSnapshot(): TimeSnapshot {
    return {
      frozenTime: this.frozenTime ? new Date(this.frozenTime) : null,
      timeOffset: this.timeOffset,
      timeSpeed: this.timeSpeed,
    };
  }

  /**
   * 恢复时间快照
   */
  restoreSnapshot(snapshot: TimeSnapshot): void {
    this.reset();

    if (snapshot.frozenTime) {
      this.freeze(snapshot.frozenTime);
    } else {
      this.timeOffset = snapshot.timeOffset;
      this.timeSpeed = snapshot.timeSpeed;
      if (snapshot.timeOffset !== 0 || snapshot.timeSpeed !== 1) {
        this.replaceDateImplementation();
      }
    }
  }
}

/**
 * 时间快照接口
 */
export interface TimeSnapshot {
  frozenTime: Date | null;
  timeOffset: number;
  timeSpeed: number;
}

/**
 * 时间装饰器
 * 为测试方法提供时间控制功能
 */
export function timeControl(options: TimeControlOptions = {}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const timeController = new TimeController();

    descriptor.value = async function(...args: any[]) {
      const snapshot = timeController.createSnapshot();

      try {
        if (options.freeze !== false) {
          timeController.freeze();
        }

        if (options.offset) {
          timeController.travelBy(options.offset);
        }

        if (options.speed) {
          timeController.setSpeed(options.speed);
        }

        return await originalMethod.apply(this, args);
      } finally {
        timeController.restoreSnapshot(snapshot);
      }
    };

    return descriptor;
  };
}
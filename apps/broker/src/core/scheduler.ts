/**
 * 调度器抽象基类 - 定时任务的优雅载体
 *
 * 存在即合理：
 * - 封装 setInterval 的生命周期管理
 * - 提供统一的启停接口
 * - 优雅处理错误和异常
 *
 * 使命：赋予定时任务以秩序与尊严
 */
export abstract class Scheduler {
  private timerId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    protected readonly intervalMs: number,
    protected readonly name: string
  ) {}

  /**
   * 调度任务的核心逻辑 - 子类必须实现
   */
  protected abstract execute(): Promise<void>;

  /**
   * 启动调度器 - 生命的开始
   */
  start(): void {
    if (this.isRunning) {
      console.warn(`[${this.name}] 调度器已在运行，忽略重复启动`);
      return;
    }

    console.log(`[${this.name}] 启动调度器，间隔: ${this.intervalMs}ms`);
    this.isRunning = true;

    // 立即执行一次
    this.safeExecute();

    // 设置定时任务
    this.timerId = setInterval(() => {
      this.safeExecute();
    }, this.intervalMs);
  }

  /**
   * 停止调度器 - 优雅的告别
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log(`[${this.name}] 停止调度器`);
    this.isRunning = false;

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * 安全执行 - 错误处理的守护者
   */
  private async safeExecute(): Promise<void> {
    try {
      await this.execute();
    } catch (error) {
      console.error(`[${this.name}] 调度任务执行失败:`, error);
    }
  }
}

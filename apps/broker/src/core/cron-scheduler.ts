import * as cron from 'node-cron';

/**
 * Cron 调度器抽象基类 - 基于 cron 表达式的定时任务
 *
 * 存在即合理：
 * - 封装 node-cron 的生命周期管理
 * - 支持精确的 cron 表达式（分钟级、小时级、日级）
 * - 优雅处理错误和异常
 *
 * 使命：赋予 cron 任务以秩序与尊严
 */
export abstract class CronScheduler {
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(
    protected readonly cronExpression: string,
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
      console.warn(`[${this.name}] Cron 调度器已在运行，忽略重复启动`);
      return;
    }

    console.log(`[${this.name}] 启动 Cron 调度器，表达式: ${this.cronExpression}`);
    this.isRunning = true;

    this.task = cron.schedule(this.cronExpression, () => {
      this.safeExecute();
    });
  }

  /**
   * 停止调度器 - 优雅的告别
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log(`[${this.name}] 停止 Cron 调度器`);
    this.isRunning = false;

    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  /**
   * 手动触发执行 - 用于测试或补偿任务
   */
  async manualTrigger(): Promise<void> {
    console.log(`[${this.name}] 手动触发执行`);
    await this.safeExecute();
  }

  /**
   * 安全执行 - 错误处理的守护者
   */
  private async safeExecute(): Promise<void> {
    try {
      await this.execute();
    } catch (error) {
      console.error(`[${this.name}] Cron 任务执行失败:`, error);
    }
  }
}

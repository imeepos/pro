import { Injectable, Logger } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { RawDataService } from './raw-data.service';
import { CleanTaskFactory } from '../tasks/clean-task-factory';
import { CleanTaskMessage } from '../tasks/clean-task-message';
import { CleanTaskResult } from '../tasks/base-task';
import { WeiboPersistenceService } from './weibo-persistence.service';

@Injectable()
export class CleanerService {
  private readonly logger = new Logger(CleanerService.name);

  constructor(
    private readonly rawDataService: RawDataService,
    private readonly taskFactory: CleanTaskFactory,
    private readonly weiboPersistence: WeiboPersistenceService,
    private readonly taskLogger: PinoLogger,
  ) {}

  async execute(message: CleanTaskMessage): Promise<CleanTaskResult> {
    const rawData = await this.rawDataService.getRawDataById(message.rawDataId);
    if (!rawData) {
      throw new Error(`原始数据不存在: ${message.rawDataId}`);
    }

    const task = this.taskFactory.createTask(message);
    this.taskLogger.setContext(task.name);
    this.taskLogger.assign({
      task: task.name,
      rawDataId: message.rawDataId,
      sourceType: message.sourceType,
    });

    this.logger.debug(`执行清洗任务: ${task.name}`, {
      rawDataId: message.rawDataId,
      sourceType: message.sourceType,
    });

    const context = {
      message,
      rawData,
      logger: this.taskLogger,
      clock: () => new Date(),
      helpers: {
        weibo: this.weiboPersistence,
      },
    };

    return task.run(context);
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from '@pro/logger';
import { AnalysisResultEntity } from '@pro/entities';
import { RabbitMQService, CleanedDataEvent, AnalysisResultEvent } from '../rabbitmq/rabbitmq.service';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import { NLPAnalysisService } from '../services/nlp-analysis.service';
import { LLMAnalysisService } from '../services/llm-analysis.service';

@Injectable()
export class AnalysisQueueConsumer implements OnModuleInit {
  private readonly prefetchCount: number;

  constructor(
    @InjectRepository(AnalysisResultEntity)
    private readonly analysisResultRepository: Repository<AnalysisResultEntity>,
    private readonly rabbitmqService: RabbitMQService,
    private readonly sentimentService: SentimentAnalysisService,
    private readonly nlpService: NLPAnalysisService,
    private readonly llmService: LLMAnalysisService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.prefetchCount = this.configService.get<number>('SENTIMENT_BATCH_SIZE', 10);
  }

  async onModuleInit(): Promise<void> {
    this.logger.info('初始化分析队列消费者', 'AnalysisQueueConsumer');

    const client = this.rabbitmqService.getClient();
    const queueName = this.rabbitmqService.getCleanedDataQueue();

    await client.consume(
      queueName,
      async (message: CleanedDataEvent) => {
        await this.handleMessage(message);
      },
      {
        prefetchCount: this.prefetchCount,
      },
    );

    this.logger.info(`分析队列消费者已启动，队列: ${queueName}`, 'AnalysisQueueConsumer');
  }

  private async handleMessage(message: CleanedDataEvent): Promise<void> {
    const taskStart = Date.now();

    this.logger.info(
      `开始处理分析任务: 任务ID=${message.taskId}, 数据ID=${message.dataId}, 类型=${message.dataType}`,
      'AnalysisQueueConsumer',
    );

    try {
      const sentimentResult = await this.sentimentService.analyzeSentiment(message.content);

      const nlpResult = await this.nlpService.analyzeText(message.content);

      const llmResult = await this.llmService.analyzeLLM(message.content);

      const analysisResult = this.analysisResultRepository.create({
        dataId: message.dataId,
        dataType: message.dataType,
        sentimentResult,
        nlpResult,
        llmResult,
      });

      const savedResult = await this.analysisResultRepository.save(analysisResult);

      const resultEvent: AnalysisResultEvent = {
        taskId: message.taskId,
        dataId: message.dataId,
        dataType: message.dataType,
        analysisId: savedResult.id,
        sentimentLabel: sentimentResult.label,
        keywords: nlpResult.keywords.slice(0, 5),
        timestamp: new Date(),
      };

      await this.rabbitmqService.publishAnalysisResult(resultEvent);

      const taskDuration = Date.now() - taskStart;
      this.logger.info(
        `分析任务完成: 任务ID=${message.taskId}, 数据ID=${message.dataId}, 分析ID=${savedResult.id}, 耗时 ${taskDuration}ms`,
        'AnalysisQueueConsumer',
      );
    } catch (error) {
      const taskDuration = Date.now() - taskStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('分析任务失败', {
        taskId: message.taskId,
        dataId: message.dataId,
        dataType: message.dataType,
        error: errorMessage,
        stack: errorStack,
        durationMs: taskDuration,
      });
      throw error;
    }
  }
}

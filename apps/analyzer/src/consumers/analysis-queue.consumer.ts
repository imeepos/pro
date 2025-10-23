import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from '@pro/logger';
import { AnalysisResultEntity, ModelProvider } from '@pro/entities';
import { RabbitMQService, CleanedDataEvent, AnalysisResultEvent } from '../rabbitmq/rabbitmq.service';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import { NLPAnalysisService } from '../services/nlp-analysis.service';
import { LLMAnalysisService } from '../services/llm-analysis.service';
import { PerformanceMonitorService } from '../services/performance-monitor.service';

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
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    const batchSize = this.configService.get('SENTIMENT_BATCH_SIZE', '10');
    this.prefetchCount = typeof batchSize === 'number' ? batchSize : parseInt(batchSize, 10);
  }

  async onModuleInit(): Promise<void> {
    this.logger.info('初始化分析队列消费者', 'AnalysisQueueConsumer');

    await this.rabbitmqService.waitForConnection();

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
    const sessionId = `${message.taskId}-${message.dataId}-${Date.now()}`;
    this.performanceMonitor.startTask(sessionId, 'comprehensive_analysis');

    this.logger.info(
      `开始处理分析任务: 任务ID=${message.taskId}, 数据ID=${message.dataId}, 类型=${message.dataType}, 会话ID=${sessionId}`,
      'AnalysisQueueConsumer',
    );

    try {
      const [sentimentResult, nlpResult] = await Promise.all([
        this.performanceMonitor.measureAsync(
          sessionId,
          'sentiment_analysis',
          () => this.sentimentService.analyzeSentiment(message.content)
        ),
        this.performanceMonitor.measureAsync(
          sessionId,
          'nlp_analysis',
          () => this.nlpService.analyzeText(message.content)
        ),
      ]);

      const llmAnalysisPrompt = this.buildLLMPrompt(message, sentimentResult, nlpResult);
      const llmResult = await this.performanceMonitor.measureAsync(
        sessionId,
        'llm_analysis',
        () => this.llmService.analyzeLLM(message.content, llmAnalysisPrompt)
      );

      const analysisResult = this.analysisResultRepository.create({
        sessionId,
        dataId: message.dataId,
        dataType: message.dataType,
        primaryModelProvider: ModelProvider.DEEPSEEK,
        sentimentResult,
        nlpResult,
        llmResult,
      });

      const savedResult = await this.performanceMonitor.measureAsync(
        sessionId,
        'database_save',
        () => this.analysisResultRepository.save(analysisResult)
      );

      const resultEvent: AnalysisResultEvent = {
        taskId: message.taskId,
        dataId: message.dataId,
        dataType: message.dataType,
        analysisId: savedResult.id,
        sentimentLabel: sentimentResult.label,
        keywords: nlpResult.keywords.slice(0, 5).map((kw: any) => kw.word),
        timestamp: new Date(),
      };

      await this.performanceMonitor.measureAsync(
        sessionId,
        'rabbitmq_publish',
        () => this.rabbitmqService.publishAnalysisResult(resultEvent)
      );

      const metrics = this.performanceMonitor.completeTask(sessionId);

      this.logger.info(
        `分析任务完成: 任务ID=${message.taskId}, 数据ID=${message.dataId}, 分析ID=${savedResult.id}, 总耗时 ${metrics.totalDuration}ms`,
        'AnalysisQueueConsumer',
        {
          metrics: {
            total: metrics.totalDuration,
            sentiment: metrics.operations.sentiment_analysis?.duration,
            nlp: metrics.operations.nlp_analysis?.duration,
            llm: metrics.operations.llm_analysis?.duration,
            database: metrics.operations.database_save?.duration
          }
        }
      );
    } catch (error) {
      const metrics = this.performanceMonitor.failTask(sessionId, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('分析任务失败', {
        taskId: message.taskId,
        dataId: message.dataId,
        dataType: message.dataType,
        sessionId,
        error: errorMessage,
        stack: errorStack,
        metrics: {
          total: metrics.totalDuration,
          failedAt: metrics.failedOperation
        }
      });
      throw error;
    }
  }

  private buildLLMPrompt(
    message: CleanedDataEvent,
    sentimentResult: any,
    nlpResult: any
  ): string {
    return `请对以下${message.dataType === 'post' ? '帖子' : '评论'}内容进行深度分析：

内容：${message.content}

参考信息：
- 情感分析结果：${sentimentResult.label}（置信度：${sentimentResult.confidence}）
- 关键词：${nlpResult.keywords.slice(0, 5).map((kw: any) => kw.word).join('、')}

请从以下维度进行分析：
1. 内容主题和核心观点
2. 情感表达的细节和层次
3. 潜在的用户意图和需求
4. 内容的社会影响和传播价值
5. 可能的后续行为预测

请以结构化的JSON格式返回分析结果，包含深度洞察和推理过程。`;
  }
}

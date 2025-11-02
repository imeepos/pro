import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from '@pro/logger-nestjs';
import { LLMAnalysisResult, ModelProvider, AnalysisModelConfig, AnalysisCapability } from '@pro/entities';
import OpenAI from 'openai';

@Injectable()
export class LLMAnalysisService {
  private readonly enabled: boolean;
  private readonly deepseekClient: OpenAI | null;
  private readonly modelConfig: AnalysisModelConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.enabled = this.configService.get<boolean>('analyzer.analysis.enableLLM', false);

    if (this.enabled) {
      this.deepseekClient = this.createDeepSeekClient();
      this.modelConfig = this.createModelConfig();
    } else {
      this.deepseekClient = null;
      this.modelConfig = this.createDefaultModelConfig();
    }
  }

  private createDeepSeekClient(): OpenAI | null {
    try {
      const apiKey = this.configService.get<string>('analyzer.deepseek.apiKey');
      const baseURL = this.configService.get<string>('analyzer.deepseek.baseURL');

      if (!apiKey) {
        this.logger.warn('DeepSeek API密钥未配置，LLM分析将不可用');
        return null;
      }

      return new OpenAI({
        apiKey,
        baseURL,
        timeout: this.configService.get<number>('analyzer.deepseek.timeout', 30000),
        maxRetries: this.configService.get<number>('analyzer.deepseek.maxRetries', 3),
      });
    } catch (error) {
      this.logger.error('DeepSeek客户端初始化失败', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  private createModelConfig(): AnalysisModelConfig {
    return {
      provider: ModelProvider.DEEPSEEK,
      modelName: this.configService.get<string>('analyzer.deepseek.model', 'deepseek-chat'),
      version: '1.0.0',
      capabilities: [
        AnalysisCapability.SENTIMENT,
        AnalysisCapability.ENTITY_EXTRACTION,
        AnalysisCapability.TOPIC_MODELING,
        AnalysisCapability.REASONING,
        AnalysisCapability.SUMMARIZATION,
        AnalysisCapability.INTENT_DETECTION,
      ],
      temperature: 0.7,
      maxTokens: 2048,
    };
  }

  private createDefaultModelConfig(): AnalysisModelConfig {
    return {
      provider: ModelProvider.INTERNAL,
      modelName: 'disabled',
      version: '0.0.0',
      capabilities: [],
    };
  }

  async analyzeLLM(text: string, prompt: string = '请深入分析以下文本内容'): Promise<LLMAnalysisResult> {
    const startTime = Date.now();

    if (!this.enabled || !this.deepseekClient) {
      this.logger.debug('LLM分析未启用或客户端不可用');
      return this.createDisabledResult();
    }

    this.logger.debug('启动DeepSeek分析', {
      textLength: text.length,
      promptLength: prompt.length,
      model: this.modelConfig.modelName,
    });

    try {
      const response = await this.performAnalysis(text, prompt);
      const processingTimeMs = Date.now() - startTime;

      this.logger.info('DeepSeek分析完成', {
        processingTimeMs,
        tokensUsed: response.usage?.total_tokens,
      });

      return this.parseAnalysisResult(response, processingTimeMs);
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      this.logger.error('DeepSeek分析失败', {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs,
        textLength: text.length,
      });

      return {
        status: 'error',
        errorMessage: `分析失败: ${error instanceof Error ? error.message : String(error)}`,
        complexity: { level: 'simple', score: 0 },
        processingTimeMs,
      };
    }
  }

  private async performAnalysis(text: string, prompt: string) {
    const systemPrompt = `你是一位专业的文本分析专家。请对提供的文本进行深度分析，
并以JSON格式返回结构化的分析结果。分析应包括：
1. 内容摘要
2. 关键洞察点
3. 用户意图识别
4. 复杂度评估

请确保分析准确、客观且具有实用价值。`;

    return await this.deepseekClient!.chat.completions.create({
      model: this.modelConfig.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${prompt}\n\n文本内容：\n${text}` },
      ],
      temperature: this.modelConfig.temperature ?? 0.7,
      max_tokens: this.modelConfig.maxTokens ?? 2048,
      response_format: { type: 'json_object' },
    });
  }

  private parseAnalysisResult(response: any, processingTimeMs: number): LLMAnalysisResult {
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('响应内容为空');
      }

      const parsed = JSON.parse(content);

      return {
        status: 'completed',
        summary: parsed.summary || parsed.摘要 || '分析完成，但未能提取摘要',
        insights: this.extractInsights(parsed),
        intentions: this.extractIntentions(parsed),
        complexity: this.assessComplexity(parsed),
        processingTimeMs,
      };
    } catch (error) {
      this.logger.warn('解析DeepSeek响应失败，使用默认结果', { error: error instanceof Error ? error.message : String(error) });

      return {
        status: 'completed',
        summary: '分析已完成，但结果解析遇到问题',
        complexity: { level: 'moderate', score: 50 },
        processingTimeMs,
        errorMessage: `结果解析警告: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private extractInsights(parsed: any): string[] {
    return parsed.insights || parsed.洞察 || parsed.关键发现 || ['文本已完成分析处理'];
  }

  private extractIntentions(parsed: any) {
    const intentions = parsed.intentions || parsed.意图 || parsed.用户意图 || [];

    return intentions.map((intention: any) => ({
      type: intention.type || intention.类型 || 'unknown',
      confidence: intention.confidence || intention.置信度 || 0.5,
      description: intention.description || intention.描述 || '',
    }));
  }

  private assessComplexity(parsed: any) {
    const complexity = parsed.complexity || parsed.复杂度 || {};

    return {
      level: complexity.level || complexity.级别 || 'moderate',
      score: complexity.score || complexity.分数 || 50,
    } as { level: 'simple' | 'moderate' | 'complex'; score: number };
  }

  private createDisabledResult(): LLMAnalysisResult {
    return {
      status: 'not_implemented',
      complexity: { level: 'simple', score: 0 },
    };
  }
}
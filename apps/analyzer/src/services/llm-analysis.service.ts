import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from '@pro/logger';
import { LLMAnalysisResult } from '@pro/entities';

@Injectable()
export class LLMAnalysisService {
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.enabled = this.configService.get<boolean>('ENABLE_LLM', false);
  }

  async analyzeLLM(text: string, prompt: string = '分析以下文本'): Promise<LLMAnalysisResult> {
    if (!this.enabled) {
      this.logger.debug('LLM 分析未启用');
      return {
        status: 'not_implemented',
      };
    }

    this.logger.debug('开始 LLM 分析', {
      textLength: text.length,
      promptLength: prompt.length,
    });

    return {
      status: 'not_implemented',
      errorMessage: 'LLM integration not yet implemented',
    };
  }
}

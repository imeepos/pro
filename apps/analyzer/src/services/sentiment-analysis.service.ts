import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { SentimentAnalysisResult } from '@pro/entities';

@Injectable()
export class SentimentAnalysisService {
  constructor(private readonly logger: PinoLogger) {}

  async analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
    const startTime = Date.now();

    this.logger.debug('开始情感分析', {
      textLength: text.length,
    });

    const result = this.performSentimentAnalysis(text);

    const duration = Date.now() - startTime;
    this.logger.debug('情感分析完成', {
      label: result.label,
      score: result.score,
      keywordCount: result.keywords.length,
      durationMs: duration,
    });

    return result;
  }

  private performSentimentAnalysis(text: string): SentimentAnalysisResult {
    const positiveWords = ['好', '棒', '赞', '优秀', '喜欢', '支持', '感谢'];
    const negativeWords = ['差', '烂', '垃圾', '失望', '讨厌', '反对', '批评'];

    const lowerText = text.toLowerCase();
    let score = 0;
    const keywords: string[] = [];

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) {
        score += 0.3;
        keywords.push(word);
      }
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) {
        score -= 0.3;
        keywords.push(word);
      }
    });

    score = Math.max(-1, Math.min(1, score));

    let label: 'positive' | 'neutral' | 'negative';
    if (score > 0.2) {
      label = 'positive';
    } else if (score < -0.2) {
      label = 'negative';
    } else {
      label = 'neutral';
    }

    return {
      score,
      label,
      keywords: keywords.slice(0, 5),
    };
  }
}

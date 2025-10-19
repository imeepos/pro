import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { NLPAnalysisResult } from '@pro/entities';

@Injectable()
export class NLPAnalysisService {
  constructor(private readonly logger: PinoLogger) {}

  async analyzeText(text: string): Promise<NLPAnalysisResult> {
    const startTime = Date.now();

    this.logger.debug('开始 NLP 分析', {
      textLength: text.length,
    });

    const result = this.performNLPAnalysis(text);

    const duration = Date.now() - startTime;
    this.logger.debug('NLP 分析完成', {
      keywordCount: result.keywords.length,
      topicCount: result.topics.length,
      entityCount: result.entities.length,
      durationMs: duration,
    });

    return result;
  }

  private performNLPAnalysis(text: string): NLPAnalysisResult {
    const keywords = this.extractKeywords(text);
    const topics = this.extractTopics(text);
    const entities = this.extractEntities(text);

    return {
      keywords,
      topics,
      entities,
    };
  }

  private extractKeywords(text: string): string[] {
    const words = text.split(/[\s,。,、，！!？?;；：:]+/).filter(w => w.length > 1);
    const wordFrequency = new Map<string, number>();

    words.forEach(word => {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    });

    return Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];

    const topicPatterns = [
      { pattern: /科技|技术|AI|人工智能/, topic: '科技' },
      { pattern: /经济|金融|市场|股票/, topic: '经济' },
      { pattern: /娱乐|电影|音乐|明星/, topic: '娱乐' },
      { pattern: /体育|运动|比赛|球队/, topic: '体育' },
      { pattern: /政治|政府|政策|法律/, topic: '政治' },
    ];

    topicPatterns.forEach(({ pattern, topic }) => {
      if (pattern.test(text)) {
        topics.push(topic);
      }
    });

    return topics;
  }

  private extractEntities(text: string): Array<{ type: string; value: string; confidence: number }> {
    const entities: Array<{ type: string; value: string; confidence: number }> = [];

    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern);
    if (urls) {
      urls.forEach(url => {
        entities.push({
          type: 'URL',
          value: url,
          confidence: 1.0,
        });
      });
    }

    const mentionPattern = /@[\u4e00-\u9fa5a-zA-Z0-9_-]+/g;
    const mentions = text.match(mentionPattern);
    if (mentions) {
      mentions.forEach(mention => {
        entities.push({
          type: 'MENTION',
          value: mention,
          confidence: 0.9,
        });
      });
    }

    return entities;
  }
}

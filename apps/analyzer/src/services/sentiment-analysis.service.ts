import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { SentimentAnalysisResult } from '@pro/entities';
import * as natural from 'natural';
// import * as franc from 'franc-min';
import { PerformanceMonitorService } from './performance-monitor.service';

@Injectable()
export class SentimentAnalysisService {
  private readonly cache = new Map<string, SentimentAnalysisResult>();
  private readonly positiveWords: string[];
  private readonly negativeWords: string[];
  private readonly intensifiers: string[];
  private readonly negators: string[];
  private readonly emotionPatterns: Record<string, { patterns: RegExp[]; weight: number }>;

  constructor(
    private readonly logger: PinoLogger,
    private readonly performanceMonitor: PerformanceMonitorService
  ) {
    this.positiveWords = [
      '好', '棒', '赞', '优秀', '喜欢', '支持', '感谢', '满意', '完美', '推荐',
      '精彩', '美丽', '漂亮', '舒服', '开心', '快乐', '高兴', '兴奋', '激动',
      '温暖', '贴心', '体贴', '友善', '热情', '积极', '正面', '值得', '信任',
      '专业', '出色', '杰出', '卓越', '惊艳', '震撼', '感动', '温馨', '舒适'
    ];

    this.negativeWords = [
      '差', '烂', '垃圾', '失望', '讨厌', '反对', '批评', '糟糕', '可怕', '恶心',
      '愤怒', '生气', '烦躁', '郁闷', '沮丧', '悲伤', '痛苦', '困扰', '麻烦',
      '问题', '错误', '失败', '无聊', '无趣', '浪费', '坑爹', '欺骗', '虚假',
      '黑心', '坏', '恶', '毒', '害', '骗', '抢', '偷', '假', '劣质'
    ];

    this.intensifiers = ['非常', '很', '特别', '极其', '相当', '十分', '超级', '巨', '超', '真的'];
    this.negators = ['不', '没', '无', '非', '未', '别', '勿', '莫', '绝不', '从不'];

    this.emotionPatterns = {
      joy: {
        patterns: [/[😀😁😂🤣😃😄😅😆😊😋😎😍🥰😘]/g, /哈哈|呵呵|嘿嘿/g],
        weight: 0.8
      },
      anger: {
        patterns: [/[😠😡🤬😤]/g, /气死|愤怒|火大|怒了/g],
        weight: 0.9
      },
      sadness: {
        patterns: [/[😢😭😰😨😧]/g, /哭了|难过|伤心|痛苦/g],
        weight: 0.7
      },
      fear: {
        patterns: [/[😱😨😰🙄]/g, /害怕|恐怖|可怕|担心/g],
        weight: 0.6
      },
      surprise: {
        patterns: [/[😲😯😮]/g, /惊讶|震惊|意外|没想到/g],
        weight: 0.5
      },
      disgust: {
        patterns: [/[🤢🤮😷]/g, /恶心|讨厌|厌恶|反感/g],
        weight: 0.8
      }
    };
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
    const timer = this.performanceMonitor.startTimer('sentiment-analysis');
    const textHash = this.hashText(text);

    if (this.cache.has(textHash)) {
      this.performanceMonitor.recordCacheHit('sentiment');
      this.logger.debug('使用缓存的情感分析结果');
      timer(true, { cached: true, textLength: text.length });
      return this.cache.get(textHash)!;
    }

    this.performanceMonitor.recordCacheMiss('sentiment');
    this.logger.debug('开始情感分析', {
      textLength: text.length,
    });

    try {
      const result = this.performAdvancedSentimentAnalysis(text);

      this.logger.debug('情感分析完成', {
        label: result.label,
        score: result.score,
        // confidence: result.confidence,
        keywordCount: result.keywords.length,
      });

      this.cache.set(textHash, result);
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      timer(true, {
        textLength: text.length,
        label: result.label
      });

      return result;
    } catch (error) {
      timer(false, { textLength: text.length, error: String(error) });
      throw error;
    }
  }

  private performAdvancedSentimentAnalysis(text: string): SentimentAnalysisResult {
    const cleanText = this.preprocessText(text);
    const tokens = new natural.WordTokenizer().tokenize(cleanText) || [];

    // const languageDetection = this.detectLanguage(text);
    const emotions = this.analyzeEmotions(text);
    const polarity = this.calculatePolarity(tokens);
    const { score, confidence, keywords } = this.calculateSentimentScore(tokens, text);

    let label: 'positive' | 'neutral' | 'negative';
    if (score > 0.1) {
      label = 'positive';
    } else if (score < -0.1) {
      label = 'negative';
    } else {
      label = 'neutral';
    }

    return {
      score,
      confidence,
      label,
      keywords,
      emotions,
      polarity
    } as SentimentAnalysisResult;
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // private detectLanguage(text: string): { detected: string; confidence: number } {
  //   const detected = (franc as any)(text);
  //   return {
  //     detected: detected === 'cmn' ? 'zh-CN' : detected,
  //     confidence: detected === 'cmn' ? 0.9 : 0.7
  //   };
  // }

  private analyzeEmotions(text: string) {
    const emotions = {
      joy: 0,
      anger: 0,
      sadness: 0,
      fear: 0,
      surprise: 0,
      disgust: 0
    };

    for (const [emotion, config] of Object.entries(this.emotionPatterns)) {
      let emotionScore = 0;
      for (const pattern of config.patterns) {
        const matches = text.match(pattern);
        if (matches) {
          emotionScore += matches.length * config.weight;
        }
      }
      emotions[emotion as keyof typeof emotions] = Math.min(emotionScore / 10, 1);
    }

    return emotions;
  }

  private calculatePolarity(tokens: string[]): { positive: number; negative: number; neutral: number } {
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (const token of tokens) {
      if (token && this.positiveWords.includes(token)) {
        positiveCount++;
      } else if (token && this.negativeWords.includes(token)) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    }

    const total = Math.max(tokens.length, 1);
    return {
      positive: positiveCount / total,
      negative: negativeCount / total,
      neutral: neutralCount / total
    };
  }

  private calculateSentimentScore(tokens: string[], _originalText?: string): {
    score: number;
    confidence: number;
    keywords: string[];
  } {
    let score = 0;
    let totalWeight = 0;
    const keywords: string[] = [];
    let intensifierMultiplier = 1;
    let negatorMultiplier = 1;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const prevToken = i > 0 ? tokens[i - 1] : '';

      if (prevToken && this.intensifiers.includes(prevToken)) {
        intensifierMultiplier = 1.5;
      }

      if (prevToken && this.negators.includes(prevToken)) {
        negatorMultiplier = -1;
      }

      if (token && this.positiveWords.includes(token)) {
        const weight = 0.5 * intensifierMultiplier * negatorMultiplier;
        score += weight;
        totalWeight += Math.abs(weight);
        keywords.push(token);
      } else if (token && this.negativeWords.includes(token)) {
        const weight = -0.5 * intensifierMultiplier * negatorMultiplier;
        score += weight;
        totalWeight += Math.abs(weight);
        keywords.push(token);
      }

      intensifierMultiplier = 1;
      negatorMultiplier = 1;
    }

    if (totalWeight === 0) {
      return { score: 0, confidence: 0.3, keywords: [] };
    }

    const normalizedScore = Math.max(-1, Math.min(1, score / Math.sqrt(tokens.length)));
    const confidence = Math.min(0.95, 0.5 + (totalWeight / tokens.length) * 0.5);

    return {
      score: normalizedScore,
      confidence,
      keywords: keywords.slice(0, 5)
    };
  }

  private hashText(text: string): string {
    let hash = 0;
    if (text.length === 0) return hash.toString();
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}
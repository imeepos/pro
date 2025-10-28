import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger-nestjs';
import { NLPAnalysisResult } from '@pro/entities';
import * as natural from 'natural';
import * as franc from 'franc-min';
import { createHash } from 'crypto';
import { PerformanceMonitorService } from './performance-monitor.service';
import { SegmentTokenizerService } from './segment-tokenizer.service';
import { CorpusStatisticsService } from './corpus-statistics.service';

@Injectable()
export class NLPAnalysisService {
  private readonly cache = new Map<string, NLPAnalysisResult>();
  private readonly cacheCapacity = 300;
  private readonly topicPatterns: Array<{ pattern: RegExp; name: string; keywords: string[] }>;
  private readonly entityPatterns: Record<string, RegExp>;

  constructor(
    private readonly logger: PinoLogger,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly segmentTokenizer: SegmentTokenizerService,
    private readonly corpusStatistics: CorpusStatisticsService
  ) {
    this.topicPatterns = [
      {
        pattern: /科技|技术|AI|人工智能|机器学习|深度学习|算法|编程|代码|软件|硬件|互联网|5G|区块链/,
        name: '科技',
        keywords: ['科技', '技术', 'AI', '人工智能', '算法', '编程']
      },
      {
        pattern: /经济|金融|市场|股票|投资|财经|GDP|通胀|货币|银行|保险|基金/,
        name: '经济',
        keywords: ['经济', '金融', '市场', '投资', '股票']
      },
      {
        pattern: /娱乐|电影|音乐|明星|综艺|电视剧|游戏|直播|短视频|网红/,
        name: '娱乐',
        keywords: ['娱乐', '电影', '音乐', '明星', '游戏']
      },
      {
        pattern: /体育|运动|比赛|球队|足球|篮球|网球|奥运|世界杯|健身|马拉松/,
        name: '体育',
        keywords: ['体育', '运动', '比赛', '足球', '篮球']
      },
      {
        pattern: /政治|政府|政策|法律|法规|选举|国际|外交|军事|社会/,
        name: '政治',
        keywords: ['政治', '政府', '政策', '法律', '社会']
      },
      {
        pattern: /教育|学校|大学|学生|老师|课程|考试|培训|知识|学习/,
        name: '教育',
        keywords: ['教育', '学校', '学生', '学习', '考试']
      },
      {
        pattern: /健康|医疗|疾病|药物|医院|医生|养生|营养|锻炼|心理/,
        name: '健康',
        keywords: ['健康', '医疗', '医生', '养生', '营养']
      },
      {
        pattern: /旅游|旅行|景点|酒店|美食|文化|历史|艺术|博物馆|风景/,
        name: '旅游',
        keywords: ['旅游', '旅行', '景点', '美食', '文化']
      }
    ];

    this.entityPatterns = {
      PERSON: /[\u4e00-\u9fa5]{2,4}(?:先生|女士|老师|教授|博士|院士|主席|总裁|CEO|经理)|@[\u4e00-\u9fa5a-zA-Z0-9_-]+/g,
      LOCATION: /[\u4e00-\u9fa5]{2,10}(?:省|市|县|区|镇|街道|路|大学|中学|小学|医院|公园|广场)|北京|上海|广州|深圳|杭州|南京|武汉|成都/g,
      ORGANIZATION: /[\u4e00-\u9fa5]{2,20}(?:公司|集团|有限公司|股份|企业|机构|组织|协会|基金会|大学|学院|医院)/g,
      DATE: /\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日|今天|昨天|明天|上周|下周|本月|下月|去年|明年/g,
      TIME: /\d{1,2}:\d{2}|\d{1,2}点\d{1,2}分?|上午|下午|晚上|凌晨|中午|傍晚/g,
      URL: /https?:\/\/[^\s]+|www\.[^\s]+/g,
      MENTION: /@[\u4e00-\u9fa5a-zA-Z0-9_-]+/g,
      HASHTAG: /#[\u4e00-\u9fa5a-zA-Z0-9_-]+#?/g
    };
  }

  async analyzeText(text: string): Promise<NLPAnalysisResult> {
    const timer = this.performanceMonitor.startTimer('nlp-analysis');
    const textHash = this.hashText(text);

    const cached = this.readFromCache(textHash);
    if (cached) {
      this.performanceMonitor.recordCacheHit('nlp');
      this.logger.debug('使用缓存的NLP分析结果');
      timer(true, { cached: true, textLength: text.length });
      return cached;
    }

    this.performanceMonitor.recordCacheMiss('nlp');
    this.logger.debug('开始 NLP 分析', {
      textLength: text.length,
    });

    try {
      const result = this.performAdvancedNLPAnalysis(text);

      this.logger.debug('NLP 分析完成', {
        keywordCount: result.keywords.length,
        topicCount: result.topics.length,
        entityCount: result.entities.length,
        language: result.language.detected,
      });

      this.writeThroughCache(textHash, result);

      timer(true, {
        textLength: text.length,
        keywordCount: result.keywords.length,
        topicCount: result.topics.length,
        entityCount: result.entities.length
      });

      return result;
    } catch (error) {
      timer(false, { textLength: text.length, error: String(error) });
      throw error;
    }
  }

  private performAdvancedNLPAnalysis(text: string): NLPAnalysisResult {
    const language = this.detectLanguage(text);
    const keywords = this.extractAdvancedKeywords(text);
    const topics = this.extractTopics(text);
    const entities = this.extractEntities(text);
    const summary = this.generateSummary(text, keywords);

    return {
      keywords,
      topics,
      entities,
      language,
      summary
    };
  }

  private detectLanguage(text: string): { detected: string; confidence: number } {
    const detected = (franc as any)(text);
    const confidence = detected === 'cmn' ? 0.95 : (detected === 'eng' ? 0.9 : 0.7);

    return {
      detected: detected === 'cmn' ? 'zh-CN' : (detected === 'eng' ? 'en-US' : detected),
      confidence
    };
  }

  private extractAdvancedKeywords(text: string): Array<{ word: string; weight: number; pos?: string }> {
    const cleanText = this.preprocessText(text);

    // 使用中文分词
    const chineseWords = this.segmentTokenizer.words(cleanText, {
      stripPunctuation: true,
      stripStopword: true,
      convertSynonym: true,
    });
    const chineseKeywords = this.calculateTfIdf(chineseWords);

    // 使用英文分词处理混合文本
    const englishTokens = new natural.WordTokenizer().tokenize(cleanText) || [];
    const englishKeywords = this.calculateTfIdf(englishTokens);

    // 合并中英文关键词
    const allKeywords = [...chineseKeywords, ...englishKeywords];

    // 去重并排序
    const keywordMap = new Map<string, { weight: number; pos?: string }>();
    allKeywords.forEach(kw => {
      if (keywordMap.has(kw.word)) {
        const existing = keywordMap.get(kw.word)!;
        existing.weight = Math.max(existing.weight, kw.weight);
      } else {
        keywordMap.set(kw.word, kw.pos ? { weight: kw.weight, pos: kw.pos } : { weight: kw.weight });
      }
    });

    return Array.from(keywordMap.entries())
      .map(([word, data]) => ({ word, ...data }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 15);
  }

  private calculateTfIdf(tokens: string[]): Array<{ word: string; weight: number; pos?: string }> {
    if (tokens.length === 0) return [];

    // 过滤停用词和短词
    const stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看',
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be',
      'emm', 'emmm', '233', 'orz', 'lol', '哈哈', '哈哈哈', '呵呵', '哈哈~'
    ]);
    const filteredTokens = tokens.filter(token =>
      token.length > 1 &&
      !stopWords.has(token.toLowerCase()) &&
      !/^\d+$/.test(token)
    );

    // 计算词频
    const termFreq = new Map<string, number>();
    filteredTokens.forEach(token => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });

    // 计算 TF-IDF 权重
    const totalTerms = filteredTokens.length;
    const keywords: Array<{ word: string; weight: number; pos?: string }> = [];

    termFreq.forEach((freq, term) => {
      const tf = freq / totalTerms;
      const idf = this.corpusStatistics.idf(term);
      const weight = tf * idf;

      if (weight > 0.001) {
        const pos = this.getPartOfSpeech(term);
        keywords.push(pos ? {
          word: term,
          weight: Math.round(weight * 1000) / 1000,
          pos
        } : {
          word: term,
          weight: Math.round(weight * 1000) / 1000
        });
      }
    });

    this.corpusStatistics.recordDocument(filteredTokens);

    return keywords.sort((a, b) => b.weight - a.weight);
  }

  private getPartOfSpeech(word: string): string | undefined {
    // 简单的词性标注
    if (/[\u4e00-\u9fa5]/.test(word)) {
      // 中文词性标注规则
      if (/[的地得]$/.test(word)) return 'ADV';
      if (/[了着过]$/.test(word)) return 'VERB';
      if (/[性质化]$/.test(word)) return 'ADJ';
      return 'NOUN';
    } else {
      // 英文词性标注
      if (word.endsWith('ing') || word.endsWith('ed')) return 'VERB';
      if (word.endsWith('ly')) return 'ADV';
      if (word.endsWith('ful') || word.endsWith('less')) return 'ADJ';
      return 'NOUN';
    }
  }

  private extractTopics(text: string): Array<{ name: string; confidence: number; keywords: string[] }> {
    const topics: Array<{ name: string; confidence: number; keywords: string[] }> = [];

    this.topicPatterns.forEach(({ pattern, name, keywords }) => {
      const matches = text.match(pattern);
      if (matches) {
        const confidence = Math.min(0.95, matches.length * 0.2 + 0.3);
        const matchedKeywords = matches.slice(0, 5);
        topics.push({
          name,
          confidence: Math.round(confidence * 100) / 100,
          keywords: [...new Set([...matchedKeywords, ...keywords.slice(0, 3)])]
        });
      }
    });

    return topics.sort((a, b) => b.confidence - a.confidence);
  }

  private extractEntities(text: string): Array<{
    type: 'PERSON' | 'LOCATION' | 'ORGANIZATION' | 'DATE' | 'TIME' | 'URL' | 'MENTION' | 'HASHTAG' | 'OTHER';
    value: string;
    confidence: number;
    startIndex?: number;
    endIndex?: number;
  }> {
    const entities: Array<{
      type: 'PERSON' | 'LOCATION' | 'ORGANIZATION' | 'DATE' | 'TIME' | 'URL' | 'MENTION' | 'HASHTAG' | 'OTHER';
      value: string;
      confidence: number;
      startIndex?: number;
      endIndex?: number;
    }> = [];

    Object.entries(this.entityPatterns).forEach(([type, pattern]) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: type as any,
          value: match[0],
          confidence: this.calculateEntityConfidence(type, match[0]),
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    });

    // 去重
    const uniqueEntities = entities.filter((entity, index, self) =>
      index === self.findIndex(e => e.value === entity.value && e.type === entity.type)
    );

    return uniqueEntities
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20);
  }

  private calculateEntityConfidence(type: string, value: string): number {
    const baseConfidence = {
      URL: 0.95,
      MENTION: 0.9,
      HASHTAG: 0.9,
      DATE: 0.85,
      TIME: 0.8,
      PERSON: 0.7,
      LOCATION: 0.75,
      ORGANIZATION: 0.7
    };

    let confidence = (baseConfidence as any)[type] || 0.6;

    // 根据长度调整置信度
    if (value.length < 2) confidence *= 0.5;
    if (value.length > 10) confidence *= 0.9;

    return Math.round(confidence * 100) / 100;
  }

  private generateSummary(text: string, keywords: Array<{ word: string; weight: number }>): {
    keyPhrases: string[];
    textLength: number;
    readability: number;
  } {
    // const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 5);
    const keyPhrases = this.extractKeyPhrases(text, keywords);
    const readability = this.calculateReadability(text);

    return {
      keyPhrases: keyPhrases.slice(0, 5),
      textLength: text.length,
      readability: Math.round(readability * 100) / 100
    };
  }

  private extractKeyPhrases(text: string, keywords: Array<{ word: string; weight: number }>): string[] {
    const keywordSet = new Set(keywords.map(kw => kw.word));
    const phrases: string[] = [];

    // 提取包含关键词的短语
    const sentences = text.split(/[，。！？,.!?；;]+/);
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/);
      if (words.length >= 2 && words.length <= 8) {
        const hasKeyword = words.some(word => keywordSet.has(word));
        if (hasKeyword) {
          phrases.push(sentence.trim());
        }
      }
    });

    return phrases.slice(0, 10);
  }

  private calculateReadability(text: string): number {
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/[\s，。！？,.!?；;]+/).filter(w => w.trim().length > 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = text.replace(/\s/g, '').length / words.length;

    // 简化的可读性计算
    let readability = 100;
    if (avgWordsPerSentence > 15) readability -= (avgWordsPerSentence - 15) * 2;
    if (avgCharsPerWord > 5) readability -= (avgCharsPerWord - 5) * 3;

    return Math.max(0, Math.min(100, readability)) / 100;
  }

  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }

  private hashText(text: string): string {
    return createHash('sha1').update(text, 'utf8').digest('hex');
  }

  private readFromCache(key: string): NLPAnalysisResult | undefined {
    const cached = this.cache.get(key);
    if (!cached) {
      return undefined;
    }

    this.cache.delete(key);
    this.cache.set(key, cached);
    return cached;
  }

  private writeThroughCache(key: string, value: NLPAnalysisResult): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    if (this.cache.size >= this.cacheCapacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
  }
}

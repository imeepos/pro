import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { Logger } from '@pro/logger';
import { createHash } from 'crypto';
import * as cheerio from 'cheerio';

/**
 * 微博内容解析器 - 融合MediaCrawler智慧的数字艺术品
 * 每一行代码都承载着对数据完整性和解析优雅性的追求
 * 创造数字时代的数据解析文化遗产
 */

// 基于MediaCrawler的数据结构定义
export interface WeiboSearchResult {
  cards: WeiboCard[];
  errno?: number;
  msg?: string;
  total_number?: number;
}

export interface WeiboCard {
  card_type: number;
  card_group?: WeiboCard[];
  mblog?: WeiboMblog;
  scheme?: string;
  show_type?: number;
}

export interface WeiboMblog {
  id: string;
  mid: string;
  created_at: string;
  text: string;
  source: string;
  user: WeiboUser;
  reposts_count: number;
  comments_count: number;
  attitudes_count: number;
  isLongText: boolean;
  pic_urls?: WeiboPic[];
  pics?: WeiboPic[];
  retweeted_status?: WeiboMblog;
  geo?: WeiboGeo;
  topics?: WeiboTopic[];
  region_name?: string;
  bid?: string;
  url?: string;
  raw_text?: string;
  page_info?: WeiboPageInfo;
  custom_icons?: WeiboCustomIcon[];
  comments?: any[]; // 评论数据
  name?: string; // 用户名称字段
  isTop?: boolean; // 是否置顶
  additional?: any;
}

export interface WeiboUser {
  id: string;
  screen_name: string;
  profile_image_url: string;
  profile_url: string;
  verified: boolean;
  verified_type: number;
  verified_reason: string;
  close_blue_v: boolean;
  description: string;
  gender: string;
  mbtype: number;
  urank: number;
  mbrank: number;
  follow_me: boolean;
  following: boolean;
  followers_count: number;
  friends_count: number;
  statuses_count: number;
  location: string;
  avatar_large: string;
  avatar_hd: string;
  verify_scheme: string;
  online_status: number;
  block_app: number;
  block_word: number;
  user_ability: number;
  like: boolean;
  like_me: boolean;
  badge?: any;
  icon?: any;
  ptype: number;
  alipay_id?: string;
  live_status?: number;
  special_follow?: boolean;
  v_plus_member?: number;
 星球号?: string;
  planet_video?: boolean;
}

export interface WeiboPic {
  pid: string;
  url: string;
  size: string;
  geo?: WeiboGeo;
  large?: WeiboPicSize;
  original?: WeiboPicSize;
  thumbnail?: WeiboPicSize;
  bmiddle?: WeiboPicSize;
  mw2000?: WeiboPicSize;
  largegif?: WeiboPicSize;
  video?: string;
  object_type?: string;
  videoSrc?: string;
}

export interface WeiboPicSize {
  url: string;
  width: number;
  height: number;
  cut_type?: number;
  quality?: string;
}

export interface WeiboGeo {
  coordinates?: [number, number];
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  poiid?: string;
  detail?: any;
}

export interface WeiboTopic {
  name: string;
  url?: string;
  topic_url?: string;
  actionlog?: any;
}

export interface WeiboPageInfo {
  type?: string;
  page_id?: string;
  object_type?: string;
  title?: string;
  summary?: string;
  content1?: string;
  content2?: string;
  media_info?: any;
  icons?: any;
  page_pic?: any;
  page_url?: string;
  play_count?: number;
  author?: string;
  source?: string;
}

export interface WeiboCustomIcon {
  icon_type?: string;
  icon_title?: string;
  icon_url?: string;
  navigation_url?: string;
  navigation_type?: string;
  actionlog?: any;
}

// 解析后的结构化数据
export interface ParsedWeiboContent {
  posts: ParsedWeiboPost[];
  users: ParsedWeiboUser[];
  comments: ParsedWeiboComment[];
  media: ParsedMediaItem[];
  metadata: ParsedWeiboMetadata;
}

export interface ParsedWeiboPost {
  id: string;
  mid: string;
  bid: string;
  content: {
    raw: string;
    cleaned: string;
    html: string;
    hashtags: string[];
    mentions: string[];
    links: string[];
    emojis: string[];
  };
  author: {
    id: string;
    username: string;
    screenName: string;
  };
  metrics: {
    reposts: number;
    comments: number;
    likes: number;
    views?: number;
  };
  timing: {
    createdAt: Date;
    createdAtStandard: string;
    relativeTime?: string;
    timezone?: string;
  };
  media: {
    images: ParsedMediaItem[];
    videos: ParsedMediaItem[];
    articles?: ParsedMediaItem[];
  };
  location?: {
    name: string;
    coordinates?: [number, number];
    address?: string;
  };
  source: {
    name: string;
    url?: string;
  };
  interaction: {
    isRepost: boolean;
    originalPost?: ParsedWeiboPost;
    repostChain?: string[];
  };
  engagement: {
    isHot?: boolean;
    isPinned?: boolean;
    isTop?: boolean;
    tags?: string[];
  };
  quality: {
    score: number;
    issues: string[];
    completeness: number;
  };
}

export interface ParsedWeiboUser {
  id: string;
  profile: {
    username: string;
    screenName: string;
    description: string;
    avatar: string;
    avatarHd: string;
    cover?: string;
  };
  verification: {
    isVerified: boolean;
    verifiedType: number;
    verifiedReason: string;
    verificationLevel: 'none' | 'yellow' | 'blue' | 'red';
  };
  statistics: {
    followers: number;
    following: number;
    posts: number;
    likes?: number;
  };
  demographics: {
    gender: 'male' | 'female' | 'unknown';
    location: string;
    timezone?: string;
    language?: string;
  };
  activity: {
    status: 'active' | 'inactive' | 'suspended';
    lastActive?: Date;
    accountType: string;
    membershipLevel: number;
  };
  social: {
    isFollowing: boolean;
    isFollowed: boolean;
    isBlocked: boolean;
    relationship?: string;
  };
  influence: {
    influenceScore: number;
    categories: string[];
    tags?: string[];
  };
}

export interface ParsedWeiboComment {
  id: string;
  postId: string;
  content: {
    raw: string;
    cleaned: string;
    mentions: string[];
    hashtags: string[];
    emotions: string[];
  };
  author: {
    id: string;
    username: string;
    screenName: string;
    avatar?: string;
  };
  timing: {
    createdAt: Date;
    createdAtStandard: string;
    relativeTime?: string;
  };
  engagement: {
    likes: number;
    replies: number;
    isHot?: boolean;
  };
  interaction: {
    replyToCommentId?: string;
    replyToUserId?: string;
    thread: CommentThreadNode[];
    depth: number;
  };
  quality: {
    score: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    spamScore: number;
  };
}

export interface ParsedMediaItem {
  id: string;
  type: 'image' | 'video' | 'gif' | 'article' | 'live';
  url: {
    original: string;
    thumbnail?: string;
    medium?: string;
    large?: string;
  };
  metadata: {
    width?: number;
    height?: number;
    size?: number;
    format?: string;
    duration?: number;
    quality?: string;
  };
  analysis: {
    dominantColors?: string[];
    faces?: number;
    text?: string;
    tags?: string[];
    safeScore?: number;
  };
}

export interface ParsedWeiboMetadata {
  parsing: {
    timestamp: Date;
    version: string;
    method: string;
    sourceType: string;
  };
  quality: {
    overallScore: number;
    completeness: number;
    freshness: number;
    reliability: number;
  };
  statistics: {
    totalPosts: number;
    totalUsers: number;
    totalComments: number;
    totalMedia: number;
    processingTime: number;
  };
  filters: {
    searchType: string;
    keywords: string[];
    timeRange?: { start: Date; end: Date };
    contentType?: string[];
  };
}

export interface CommentThreadNode {
  commentId: string;
  authorId: string;
  content: string;
  timestamp: Date;
  depth: number;
}

export interface WeiboParsingOptions {
  extractFullContent: boolean;
  includeMediaAnalysis: boolean;
  calculateQualityScores: boolean;
  standardizeTimestamps: boolean;
  extractEmotions: boolean;
  buildCommentThreads: boolean;
  maxMediaItems: number;
  maxCommentDepth: number;
  qualityThreshold: number;
}

@Injectable()
export class WeiboContentParser {
  private readonly DEFAULT_OPTIONS: WeiboParsingOptions = {
    extractFullContent: true,
    includeMediaAnalysis: true,
    calculateQualityScores: true,
    standardizeTimestamps: true,
    extractEmotions: true,
    buildCommentThreads: true,
    maxMediaItems: 50,
    maxCommentDepth: 5,
    qualityThreshold: 0.7
  };

  // MediaCrawler启发的解析常量
  private readonly CONTENT_SIMILARITY_THRESHOLD = 0.85;
  private readonly MAX_CONTENT_LENGTH = 100000;
  private readonly DEFAULT_TIMEZONE = 'Asia/Shanghai';
  private readonly HASHTAG_PATTERN = /#([^#\s]+)#/g;
  private readonly MENTION_PATTERN = /@([^\s\u4e00-\u9fa5]+)/g;
  private readonly URL_PATTERN = /https?:\/\/[^\s]+/g;
  private readonly EMOJI_PATTERN = /\[[^\]]+\]/g;

  constructor(
    private readonly logger: Logger
  ) {}

  /**
   * 创造性的微博内容解析艺术 - 主入口方法
   * 每一次解析都是对数据完整性和优雅性的完美追求
   */
  async parseWeiboContent(
    rawData: string | object,
    options: Partial<WeiboParsingOptions> = {}
  ): Promise<ParsedWeiboContent> {
    const parsingStartTime = Date.now();
    const parseId = this.generateParseId();
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

    this.logger.log('🎨 开始创作微博内容解析艺术品', {
      parseId,
      dataType: typeof rawData,
      options: mergedOptions,
      timestamp: new Date().toISOString()
    }, 'WeiboContentParser');

    try {
      // 1. 数据预处理和标准化
      const standardizedData = await this.preprocessData(rawData, parseId);

      // 2. 内容智能解析 - 基于MediaCrawler的filter_search_result_card逻辑
      const filteredCards = this.filterSearchResultCards(standardizedData, parseId);

      // 3. 结构化数据提取
      const parsedContent = await this.extractStructuredData(filteredCards, mergedOptions, parseId);

      // 4. 数据质量评估和增强
      const enhancedContent = await this.enhanceDataQuality(parsedContent, mergedOptions, parseId);

      // 5. 生成解析元数据
      const metadata = await this.generateParsingMetadata(standardizedData, enhancedContent, parsingStartTime, parseId);

      const finalResult: ParsedWeiboContent = {
        ...enhancedContent,
        metadata
      };

      const parsingDuration = Date.now() - parsingStartTime;

      this.logger.log('🎉 微博内容解析艺术品创作完成', {
        parseId,
        stats: {
          posts: finalResult.posts.length,
          users: finalResult.users.length,
          comments: finalResult.comments.length,
          media: finalResult.media.length,
          qualityScore: metadata.quality.overallScore
        },
        processingTime: parsingDuration,
        throughput: Math.round((rawData.toString().length / 1024) / (parsingDuration / 1000) * 100) / 100,
        timestamp: new Date().toISOString()
      }, 'WeiboContentParser');

      return finalResult;

    } catch (error) {
      const parsingDuration = Date.now() - parsingStartTime;

      this.logger.error('💥 微博内容解析艺术品创作失败', {
        parseId,
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyParsingError(error),
        processingTime: parsingDuration,
        stack: error instanceof Error ? error.stack : undefined
      }, 'WeiboContentParser');

      throw this.enhanceParsingError(error, parseId);
    }
  }

  /**
   * 数据预处理和标准化 - 数据的艺术性净化
   */
  private async preprocessData(rawData: string | object, parseId: string): Promise<WeiboSearchResult> {
    const preprocessStartTime = Date.now();

    try {
      let weiboData: WeiboSearchResult;

      if (typeof rawData === 'string') {
        weiboData = JSON.parse(rawData);
      } else {
        weiboData = rawData as WeiboSearchResult;
      }

      // 数据完整性验证
      if (!weiboData || !Array.isArray(weiboData.cards)) {
        throw new Error('无效的微博数据结构：缺少cards数组');
      }

      // 数据标准化
      const standardizedData = {
        ...weiboData,
        cards: weiboData.cards.filter(card => card !== null && typeof card === 'object')
      };

      this.logger.debug('✨ 数据预处理完成', {
        parseId,
        cardsCount: standardizedData.cards.length,
        processingTime: Date.now() - preprocessStartTime
      }, 'WeiboContentParser');

      return standardizedData;

    } catch (error) {
      this.logger.error('❌ 数据预处理失败', {
        parseId,
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - preprocessStartTime
      }, 'WeiboContentParser');

      throw new Error(`数据预处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 过滤搜索结果卡片 - 基于MediaCrawler的filter_search_result_card智慧
   */
  private filterSearchResultCards(data: WeiboSearchResult, parseId: string): WeiboCard[] {
    const filterStartTime = Date.now();
    const validCards: WeiboCard[] = [];

    try {
      // 主卡片处理 - MediaCrawler的核心逻辑
      for (const card of data.cards) {
        if (card.card_type === 9 && card.mblog) {
          validCards.push(card);
        }

        // 嵌套卡片组处理
        if (card.card_group && Array.isArray(card.card_group)) {
          for (const subCard of card.card_group) {
            if (subCard.card_type === 9 && subCard.mblog) {
              validCards.push(subCard);
            }
          }
        }
      }

      // 高级过滤 - 移除重复和无效内容
      const deduplicatedCards = this.deduplicateCards(validCards);

      // 质量过滤 - 基于内容质量评分
      const qualityFilteredCards = deduplicatedCards.filter(card => {
        if (!card.mblog) return false;

        const qualityScore = this.assessCardQuality(card);
        return qualityScore >= 0.3; // 最低质量阈值
      });

      this.logger.debug('🔍 搜索结果卡片过滤完成', {
        parseId,
        originalCards: data.cards.length,
        validCards: validCards.length,
        deduplicatedCards: deduplicatedCards.length,
        qualityFilteredCards: qualityFilteredCards.length,
        processingTime: Date.now() - filterStartTime
      }, 'WeiboContentParser');

      return qualityFilteredCards;

    } catch (error) {
      this.logger.error('❌ 搜索结果卡片过滤失败', {
        parseId,
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - filterStartTime
      }, 'WeiboContentParser');

      return []; // 失败时返回空数组，不影响后续处理
    }
  }

  /**
   * 卡片去重 - 智能重复检测
   */
  private deduplicateCards(cards: WeiboCard[]): WeiboCard[] {
    const seenMids = new Set<string>();
    const uniqueCards: WeiboCard[] = [];

    for (const card of cards) {
      if (card.mblog && card.mblog.mid) {
        const mid = card.mblog.mid;
        if (!seenMids.has(mid)) {
          seenMids.add(mid);
          uniqueCards.push(card);
        }
      }
    }

    return uniqueCards;
  }

  /**
   * 评估卡片质量 - 数据的艺术性鉴赏
   */
  private assessCardQuality(card: WeiboCard): number {
    if (!card.mblog) return 0;

    let score = 0.5; // 基础分数

    const mblog = card.mblog;

    // 内容完整性评分
    if (mblog.text && mblog.text.trim().length > 0) {
      score += 0.2;
    }

    // 用户信息完整性评分
    if (mblog.user && mblog.user.screen_name) {
      score += 0.1;
    }

    // 时间信息完整性评分
    if (mblog.created_at) {
      score += 0.1;
    }

    // 媒体内容加分
    if (mblog.pics && mblog.pics.length > 0) {
      score += 0.05;
    }

    // 互动数据加分
    if (mblog.reposts_count > 0 || mblog.comments_count > 0 || mblog.attitudes_count > 0) {
      score += 0.05;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 结构化数据提取 - 数据的艺术性重构
   */
  private async extractStructuredData(
    cards: WeiboCard[],
    options: WeiboParsingOptions,
    parseId: string
  ): Promise<Omit<ParsedWeiboContent, 'metadata'>> {
    const extractStartTime = Date.now();

    const posts: ParsedWeiboPost[] = [];
    const users: Map<string, ParsedWeiboUser> = new Map();
    const comments: ParsedWeiboComment[] = [];
    const media: ParsedMediaItem[] = [];

    try {
      for (const card of cards) {
        if (!card.mblog) continue;

        const mblog = card.mblog;

        // 解析微博帖子
        const post = await this.parseWeiboPost(mblog, options, parseId);
        if (post) {
          posts.push(post);

          // 解析作者信息
          if (mblog.user) {
            const user = await this.parseWeiboUser(mblog.user, options, parseId);
            if (user && !users.has(user.id)) {
              users.set(user.id, user);
            }
          }

          // 解析媒体内容
          if (options.includeMediaAnalysis && mblog.pics) {
            const mediaItems = await this.parseMediaContent(mblog.pics, post.id, options, parseId);
            media.push(...mediaItems);
          }

          // 解析评论数据（如果存在）
          if (mblog.comments && Array.isArray(mblog.comments)) {
            const commentItems = await this.parseComments(mblog.comments, post.id, options, parseId);
            comments.push(...commentItems);
          }
        }
      }

      const result = {
        posts,
        users: Array.from(users.values()),
        comments,
        media
      };

      this.logger.debug('🏗️ 结构化数据提取完成', {
        parseId,
        posts: posts.length,
        users: users.size,
        comments: comments.length,
        media: media.length,
        processingTime: Date.now() - extractStartTime
      }, 'WeiboContentParser');

      return result;

    } catch (error) {
      this.logger.error('❌ 结构化数据提取失败', {
        parseId,
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - extractStartTime
      }, 'WeiboContentParser');

      throw error;
    }
  }

  /**
   * 解析微博帖子 - 帖子的艺术性解析
   */
  private async parseWeiboPost(
    mblog: WeiboMblog,
    options: WeiboParsingOptions,
    parseId: string
  ): Promise<ParsedWeiboPost | null> {
    try {
      const content = this.parsePostContent(mblog.text || '', mblog.raw_text);

      const post: ParsedWeiboPost = {
        id: mblog.id,
        mid: mblog.mid,
        bid: mblog.bid || mblog.id,
        content,
        author: {
          id: mblog.user?.id || '',
          username: mblog.user?.screen_name || '',
          screenName: mblog.user?.screen_name || ''
        },
        metrics: {
          reposts: mblog.reposts_count || 0,
          comments: mblog.comments_count || 0,
          likes: mblog.attitudes_count || 0
        },
        timing: {
          createdAt: this.parseTimestamp(mblog.created_at),
          createdAtStandard: this.standardizeTimestamp(mblog.created_at),
          relativeTime: this.calculateRelativeTime(mblog.created_at)
        },
        media: {
          images: [],
          videos: []
        },
        source: {
          name: this.extractSourceName(mblog.source),
          url: mblog.url
        },
        interaction: {
          isRepost: !!mblog.retweeted_status,
          originalPost: mblog.retweeted_status ? await this.parseWeiboPost(mblog.retweeted_status, options, parseId) : undefined
        },
        engagement: {
          isHot: this.isHotPost(mblog),
          isPinned: this.isPinnedPost(mblog)
        },
        quality: {
          score: this.calculatePostQuality(mblog),
          issues: this.detectPostIssues(mblog),
          completeness: this.calculatePostCompleteness(mblog)
        }
      };

      // 位置信息处理
      if (mblog.geo || mblog.region_name) {
        post.location = this.parseLocation(mblog.geo, mblog.region_name);
      }

      // 话题标签处理
      if (mblog.topics) {
        post.content.hashtags = [...post.content.hashtags, ...mblog.topics.map(t => t.name)];
      }

      return post;

    } catch (error) {
      this.logger.warn('⚠️ 微博帖子解析失败', {
        parseId,
        postId: mblog.id,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboContentParser');

      return null;
    }
  }

  /**
   * 解析帖子内容 - 内容的艺术性处理
   */
  private parsePostContent(text: string, rawText?: string): ParsedWeiboPost['content'] {
    const content = rawText || text;

    return {
      raw: content,
      cleaned: this.cleanText(content),
      html: this.parseHtmlContent(content),
      hashtags: this.extractHashtags(content),
      mentions: this.extractMentions(content),
      links: this.extractLinks(content),
      emojis: this.extractEmojis(content)
    };
  }

  /**
   * 文本清理 - MediaCrawler启发的净化艺术
   */
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&nbsp;/g, ' ') // 替换空格实体
      .replace(/&lt;/g, '<') // 替换小于号实体
      .replace(/&gt;/g, '>') // 替换大于号实体
      .replace(/&amp;/g, '&') // 替换和号实体
      .replace(/\s+/g, ' ') // 合并空白字符
      .trim();
  }

  /**
   * HTML内容解析
   */
  private parseHtmlContent(text: string): string {
    const $ = cheerio.load(text);
    return $.html();
  }

  /**
   * 提取话题标签
   */
  private extractHashtags(text: string): string[] {
    const matches = text.match(this.HASHTAG_PATTERN);
    return matches ? matches.map(tag => tag.replace(/#/g, '')) : [];
  }

  /**
   * 提取提及用户
   */
  private extractMentions(text: string): string[] {
    const matches = text.match(this.MENTION_PATTERN);
    return matches ? matches.map(mention => mention.substring(1)) : [];
  }

  /**
   * 提取链接
   */
  private extractLinks(text: string): string[] {
    const matches = text.match(this.URL_PATTERN);
    return matches || [];
  }

  /**
   * 提取表情符号
   */
  private extractEmojis(text: string): string[] {
    const matches = text.match(this.EMOJI_PATTERN);
    return matches || [];
  }

  /**
   * 解析时间戳 - 基于MediaCrawler的时间处理智慧
   */
  private parseTimestamp(timeStr: string): Date {
    if (!timeStr) return new Date();

    try {
      // 处理各种时间格式
      if (timeStr.includes('刚刚') || timeStr.includes('现在')) {
        return new Date();
      }

      if (timeStr.includes('分钟前')) {
        const minutes = parseInt(timeStr.replace(/[^0-9]/g, '')) || 1;
        return new Date(Date.now() - minutes * 60 * 1000);
      }

      if (timeStr.includes('小时前')) {
        const hours = parseInt(timeStr.replace(/[^0-9]/g, '')) || 1;
        return new Date(Date.now() - hours * 60 * 60 * 1000);
      }

      if (timeStr.includes('天前')) {
        const days = parseInt(timeStr.replace(/[^0-9]/g, '')) || 1;
        return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }

      // 处理标准日期格式
      const standardFormats = [
        'YYYY-MM-DD HH:mm:ss',
        'YYYY/MM/DD HH:mm:ss',
        'MM-DD HH:mm:ss',
        'MM月DD日 HH:mm',
        'YYYY年MM月DD日 HH:mm:ss'
      ];

      for (const format of standardFormats) {
        const date = this.tryParseDate(timeStr, format);
        if (date) return date;
      }

      // 默认返回当前时间
      return new Date();

    } catch (error) {
      this.logger.warn('⚠️ 时间戳解析失败', {
        timeStr,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboContentParser');

      return new Date();
    }
  }

  /**
   * 尝试解析日期
   */
  private tryParseDate(timeStr: string, format: string): Date | null {
    // 这里应该使用专门的日期解析库，如dayjs或moment
    // 简化实现，实际应用中需要更复杂的日期解析逻辑
    try {
      return new Date(timeStr);
    } catch {
      return null;
    }
  }

  /**
   * 标准化时间戳
   */
  private standardizeTimestamp(timeStr: string): string {
    const date = this.parseTimestamp(timeStr);
    return date.toISOString();
  }

  /**
   * 计算相对时间
   */
  private calculateRelativeTime(timeStr: string): string {
    const date = this.parseTimestamp(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString();
  }

  /**
   * 解析用户信息 - 用户的艺术性画像
   */
  private async parseWeiboUser(
    userData: WeiboUser,
    options: WeiboParsingOptions,
    parseId: string
  ): Promise<ParsedWeiboUser | null> {
    try {
      const user: ParsedWeiboUser = {
        id: userData.id,
        profile: {
          username: userData.screen_name,
          screenName: userData.screen_name,
          description: userData.description || '',
          avatar: userData.profile_image_url,
          avatarHd: userData.avatar_hd || userData.profile_image_url
        },
        verification: {
          isVerified: userData.verified,
          verifiedType: userData.verified_type,
          verifiedReason: userData.verified_reason || '',
          verificationLevel: this.determineVerificationLevel(userData.verified_type)
        },
        statistics: {
          followers: userData.followers_count || 0,
          following: userData.friends_count || 0,
          posts: userData.statuses_count || 0
        },
        demographics: {
          gender: this.parseGender(userData.gender),
          location: userData.location || ''
        },
        activity: {
          status: this.determineAccountStatus(userData),
          accountType: this.determineAccountType(userData),
          membershipLevel: userData.mbrank || 0
        },
        social: {
          isFollowing: userData.following || false,
          isFollowed: userData.follow_me || false,
          isBlocked: false // 需要额外数据
        },
        influence: {
          influenceScore: this.calculateInfluenceScore(userData),
          categories: this.determineUserCategories(userData)
        }
      };

      return user;

    } catch (error) {
      this.logger.warn('⚠️ 用户信息解析失败', {
        parseId,
        userId: userData.id,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboContentParser');

      return null;
    }
  }

  /**
   * 确定认证等级
   */
  private determineVerificationLevel(verifiedType: number): 'none' | 'yellow' | 'blue' | 'red' {
    if (verifiedType === 0) return 'yellow';
    if (verifiedType === 1) return 'blue';
    if (verifiedType >= 2 && verifiedType <= 7) return 'red';
    return 'none';
  }

  /**
   * 解析性别
   */
  private parseGender(gender: string): 'male' | 'female' | 'unknown' {
    if (gender === 'm') return 'male';
    if (gender === 'f') return 'female';
    return 'unknown';
  }

  /**
   * 确定账户状态
   */
  private determineAccountStatus(userData: WeiboUser): 'active' | 'inactive' | 'suspended' {
    // 基于各种指标判断账户状态
    const hasRecentActivity = userData.statuses_count > 0;
    const isVerified = userData.verified;

    if (isVerified && hasRecentActivity) return 'active';
    if (!hasRecentActivity) return 'inactive';
    return 'active';
  }

  /**
   * 确定账户类型
   */
  private determineAccountType(userData: WeiboUser): string {
    if (userData.verified) return 'verified';
    if (userData.mbtype > 0) return 'vip';
    return 'normal';
  }

  /**
   * 计算影响力分数
   */
  private calculateInfluenceScore(userData: WeiboUser): number {
    let score = 0;

    // 粉丝数权重
    const followers = userData.followers_count || 0;
    if (followers > 1000000) score += 50;
    else if (followers > 100000) score += 40;
    else if (followers > 10000) score += 30;
    else if (followers > 1000) score += 20;
    else if (followers > 100) score += 10;

    // 认证权重
    if (userData.verified) score += 30;

    // 活跃度权重
    const posts = userData.statuses_count || 0;
    if (posts > 10000) score += 20;
    else if (posts > 1000) score += 15;
    else if (posts > 100) score += 10;

    return Math.min(score, 100);
  }

  /**
   * 确定用户分类
   */
  private determineUserCategories(userData: WeiboUser): string[] {
    const categories: string[] = [];

    if (userData.verified) categories.push('verified');
    if (userData.followers_count > 100000) categories.push('influencer');
    if (userData.mbtype > 0) categories.push('vip');
    if (userData.verified_reason) {
      const reason = userData.verified_reason.toLowerCase();
      if (reason.includes('媒体') || reason.includes('media')) categories.push('media');
      if (reason.includes('企业') || reason.includes('company')) categories.push('enterprise');
      if (reason.includes('政府') || reason.includes('government')) categories.push('government');
    }

    return categories;
  }

  /**
   * 解析媒体内容 - 媒体的艺术性处理
   */
  private async parseMediaContent(
    pics: WeiboPic[],
    postId: string,
    options: WeiboParsingOptions,
    parseId: string
  ): Promise<ParsedMediaItem[]> {
    const mediaItems: ParsedMediaItem[] = [];

    try {
      for (const pic of pics.slice(0, options.maxMediaItems)) {
        const mediaItem = await this.parseSingleMediaItem(pic, postId, options, parseId);
        if (mediaItem) {
          mediaItems.push(mediaItem);
        }
      }

      this.logger.debug('📸 媒体内容解析完成', {
        parseId,
        postId,
        totalPics: pics.length,
        processedItems: mediaItems.length
      }, 'WeiboContentParser');

      return mediaItems;

    } catch (error) {
      this.logger.error('❌ 媒体内容解析失败', {
        parseId,
        postId,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboContentParser');

      return [];
    }
  }

  /**
   * 解析单个媒体项
   */
  private async parseSingleMediaItem(
    pic: WeiboPic,
    postId: string,
    options: WeiboParsingOptions,
    parseId: string
  ): Promise<ParsedMediaItem | null> {
    try {
      const mediaItem: ParsedMediaItem = {
        id: pic.pid,
        type: this.determineMediaType(pic),
        url: {
          original: pic.url,
          thumbnail: pic.thumbnail?.url,
          medium: pic.bmiddle?.url,
          large: pic.large?.url
        },
        metadata: {
          width: pic.large?.width || pic.bmiddle?.width,
          height: pic.large?.height || pic.bmiddle?.height,
          format: this.extractImageFormat(pic.url)
        },
        analysis: {}
      };

      // 如果启用媒体分析
      if (options.includeMediaAnalysis) {
        mediaItem.analysis = await this.analyzeMediaItem(pic, options, parseId);
      }

      return mediaItem;

    } catch (error) {
      this.logger.warn('⚠️ 单个媒体项解析失败', {
        parseId,
        postId,
        picId: pic.pid,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboContentParser');

      return null;
    }
  }

  /**
   * 确定媒体类型
   */
  private determineMediaType(pic: WeiboPic): ParsedMediaItem['type'] {
    if (pic.video || pic.object_type === 'video') return 'video';
    if (pic.largegif) return 'gif';
    return 'image';
  }

  /**
   * 提取图片格式
   */
  private extractImageFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  /**
   * 分析媒体项
   */
  private async analyzeMediaItem(
    pic: WeiboPic,
    options: WeiboParsingOptions,
    parseId: string
  ): Promise<ParsedMediaItem['analysis']> {
    // 这里可以集成图像分析服务
    // 简化实现，返回基础分析结果
    return {
      dominantColors: ['#000000', '#FFFFFF'], // 示例颜色
      faces: 0, // 示例人脸数
      tags: ['image'], // 示例标签
      safeScore: 1.0 // 示例安全分数
    };
  }

  /**
   * 解析评论 - 评论的艺术性处理
   */
  private async parseComments(
    comments: any[],
    postId: string,
    options: WeiboParsingOptions,
    parseId: string
  ): Promise<ParsedWeiboComment[]> {
    const parsedComments: ParsedWeiboComment[] = [];

    try {
      for (const commentData of comments) {
        const comment = await this.parseSingleComment(commentData, postId, options, parseId);
        if (comment) {
          parsedComments.push(comment);
        }
      }

      // 构建评论线程（如果启用）
      if (options.buildCommentThreads) {
        this.buildCommentThreads(parsedComments);
      }

      return parsedComments;

    } catch (error) {
      this.logger.error('❌ 评论解析失败', {
        parseId,
        postId,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboContentParser');

      return [];
    }
  }

  /**
   * 解析单个评论
   */
  private async parseSingleComment(
    commentData: any,
    postId: string,
    options: WeiboParsingOptions,
    parseId: string
  ): Promise<ParsedWeiboComment | null> {
    try {
      const comment: ParsedWeiboComment = {
        id: commentData.id,
        postId,
        content: {
          raw: commentData.text,
          cleaned: this.cleanText(commentData.text),
          mentions: this.extractMentions(commentData.text),
          hashtags: this.extractHashtags(commentData.text),
          emotions: this.extractEmojis(commentData.text)
        },
        author: {
          id: commentData.user?.id || '',
          username: commentData.user?.name || commentData.user?.screen_name || '',
          screenName: commentData.user?.screen_name || '',
          avatar: commentData.user?.profile_image_url
        },
        timing: {
          createdAt: this.parseTimestamp(commentData.created_at),
          createdAtStandard: this.standardizeTimestamp(commentData.created_at),
          relativeTime: this.calculateRelativeTime(commentData.created_at)
        },
        engagement: {
          likes: commentData.like_count || 0,
          replies: 0 // 需要额外计算
        },
        interaction: {
          replyToCommentId: commentData.reply_id,
          thread: [], // 初始线程为空
          depth: 1 // 初始深度
        },
        quality: {
          score: this.calculateCommentQuality(commentData),
          sentiment: this.analyzeCommentSentiment(commentData.text),
          spamScore: this.calculateSpamScore(commentData)
        }
      };

      return comment;

    } catch (error) {
      this.logger.warn('⚠️ 单个评论解析失败', {
        parseId,
        postId,
        commentId: commentData.id,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboContentParser');

      return null;
    }
  }

  /**
   * 构建评论线程
   */
  private buildCommentThreads(comments: ParsedWeiboComment[]): void {
    // 按回复关系构建评论树
    const commentMap = new Map<string, ParsedWeiboComment>();

    // 创建映射
    for (const comment of comments) {
      commentMap.set(comment.id, comment);
    }

    // 构建线程
    for (const comment of comments) {
      if (comment.interaction.replyToCommentId) {
        const parentComment = commentMap.get(comment.interaction.replyToCommentId);
        if (parentComment) {
          comment.interaction.depth = parentComment.interaction.depth + 1;
        }
      }
    }
  }

  /**
   * 计算评论质量分数
   */
  private calculateCommentQuality(commentData: any): number {
    let score = 0.5;

    if (commentData.text && commentData.text.length > 10) score += 0.2;
    if (commentData.like_count > 0) score += 0.1;
    if (commentData.user && commentData.user.verified) score += 0.1;
    if (commentData.text && !this.containsSpamKeywords(commentData.text)) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * 分析评论情感
   */
  private analyzeCommentSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // 简化的情感分析
    const positiveKeywords = ['好', '棒', '赞', '喜欢', '支持', '优秀', '完美'];
    const negativeKeywords = ['差', '烂', '讨厌', '反对', '垃圾', '糟糕', '失望'];

    const lowerText = text.toLowerCase();

    const positiveCount = positiveKeywords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeKeywords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * 计算垃圾评论分数
   */
  private calculateSpamScore(commentData: any): number {
    let score = 0;

    const text = commentData.text || '';

    // 检查重复字符
    if (/(.)\1{5,}/.test(text)) score += 0.3;

    // 检查垃圾关键词
    if (this.containsSpamKeywords(text)) score += 0.4;

    // 检查纯数字或符号
    if (/^[\d\s\W]+$/.test(text)) score += 0.2;

    // 检查过长或过短
    if (text.length < 2 || text.length > 500) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * 检查垃圾关键词
   */
  private containsSpamKeywords(text: string): boolean {
    const spamKeywords = ['加微信', '代刷', '代购', '兼职', '赚钱', '二维码', '链接'];
    const lowerText = text.toLowerCase();
    return spamKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * 提取来源名称
   */
  private extractSourceName(source: string): string {
    if (!source) return '未知来源';

    // 移除HTML标签
    const cleanSource = source.replace(/<[^>]*>/g, '');

    // 提取客户端名称
    const match = cleanSource.match(/([^<>\s]+)/);
    return match ? match[1] : cleanSource;
  }

  /**
   * 解析位置信息
   */
  private parseLocation(geo?: WeiboGeo, regionName?: string): ParsedWeiboPost['location'] {
    if (geo) {
      return {
        name: geo.address || regionName || '',
        coordinates: geo.coordinates,
        address: geo.address
      };
    }

    if (regionName) {
      return {
        name: regionName,
        address: regionName
      };
    }

    return undefined;
  }

  /**
   * 判断是否为热门帖子
   */
  private isHotPost(mblog: WeiboMblog): boolean {
    const totalEngagement = (mblog.reposts_count || 0) +
                           (mblog.comments_count || 0) +
                           (mblog.attitudes_count || 0);
    return totalEngagement > 1000;
  }

  /**
   * 判断是否为置顶帖子
   */
  private isPinnedPost(mblog: WeiboMblog): boolean {
    // 基于某些特征判断是否为置顶帖子
    return mblog.isTop === true;
  }

  /**
   * 计算帖子质量分数
   */
  private calculatePostQuality(mblog: WeiboMblog): number {
    let score = 0.5;

    // 内容长度评分
    if (mblog.text && mblog.text.length > 20) score += 0.1;
    if (mblog.text && mblog.text.length > 100) score += 0.1;

    // 媒体内容评分
    if (mblog.pics && mblog.pics.length > 0) score += 0.1;

    // 互动评分
    const engagement = (mblog.reposts_count || 0) +
                      (mblog.comments_count || 0) +
                      (mblog.attitudes_count || 0);
    if (engagement > 10) score += 0.1;
    if (engagement > 100) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * 检测帖子问题
   */
  private detectPostIssues(mblog: WeiboMblog): string[] {
    const issues: string[] = [];

    if (!mblog.text || mblog.text.trim().length === 0) {
      issues.push('内容为空');
    }

    if (mblog.text && mblog.text.length < 5) {
      issues.push('内容过短');
    }

    if (!mblog.user) {
      issues.push('缺少用户信息');
    }

    if (!mblog.created_at) {
      issues.push('缺少时间信息');
    }

    return issues;
  }

  /**
   * 计算帖子完整性
   */
  private calculatePostCompleteness(mblog: WeiboMblog): number {
    let completeness = 0;
    let totalFields = 6;

    if (mblog.text && mblog.text.length > 0) completeness++;
    if (mblog.user) completeness++;
    if (mblog.created_at) completeness++;
    if (mblog.source) completeness++;
    if (mblog.pics && mblog.pics.length > 0) completeness++;
    if (mblog.reposts_count !== undefined ||
        mblog.comments_count !== undefined ||
        mblog.attitudes_count !== undefined) completeness++;

    return completeness / totalFields;
  }

  /**
   * 数据质量增强 - 数据的艺术性提升
   */
  private async enhanceDataQuality(
    content: Omit<ParsedWeiboContent, 'metadata'>,
    options: WeiboParsingOptions,
    parseId: string
  ): Promise<Omit<ParsedWeiboContent, 'metadata'>> {
    if (!options.calculateQualityScores) {
      return content;
    }

    const enhanceStartTime = Date.now();

    try {
      // 增强帖子质量
      for (const post of content.posts) {
        post.quality.score = this.calculatePostQualityScore(post);
        post.quality.issues = this.detectPostQualityIssues(post);
      }

      // 增强用户质量
      for (const user of content.users) {
        user.influence.influenceScore = this.calculateUserInfluenceScore(user);
      }

      // 增强评论质量
      for (const comment of content.comments) {
        comment.quality.score = this.calculateCommentQualityScore(comment);
      }

      this.logger.debug('✨ 数据质量增强完成', {
        parseId,
        postsEnhanced: content.posts.length,
        usersEnhanced: content.users.length,
        commentsEnhanced: content.comments.length,
        processingTime: Date.now() - enhanceStartTime
      }, 'WeiboContentParser');

      return content;

    } catch (error) {
      this.logger.error('❌ 数据质量增强失败', {
        parseId,
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - enhanceStartTime
      }, 'WeiboContentParser');

      return content; // 失败时返回原始内容
    }
  }

  /**
   * 计算帖子质量分数
   */
  private calculatePostQualityScore(post: ParsedWeiboPost): number {
    let score = post.quality.score;

    // 内容质量加分
    if (post.content.cleaned.length > 50) score += 0.1;
    if (post.content.hashtags.length > 0) score += 0.05;
    if (post.content.mentions.length > 0) score += 0.05;

    // 互动质量加分
    if (post.metrics.likes > post.metrics.comments) score += 0.05;
    if (post.metrics.reposts > 0) score += 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * 检测帖子质量问题
   */
  private detectPostQualityIssues(post: ParsedWeiboPost): string[] {
    const issues: string[] = [];

    if (post.content.cleaned.length < 10) {
      issues.push('内容过短');
    }

    if (post.metrics.comments === 0 && post.metrics.likes === 0) {
      issues.push('缺乏互动');
    }

    if (post.author.username === '' || post.author.id === '') {
      issues.push('作者信息不完整');
    }

    return issues;
  }

  /**
   * 计算用户影响力分数
   */
  private calculateUserInfluenceScore(user: ParsedWeiboUser): number {
    return user.influence.influenceScore;
  }

  /**
   * 计算评论质量分数
   */
  private calculateCommentQualityScore(comment: ParsedWeiboComment): number {
    return comment.quality.score;
  }

  /**
   * 生成解析元数据 - 解析过程的艺术性记录
   */
  private async generateParsingMetadata(
    originalData: WeiboSearchResult,
    enhancedContent: Omit<ParsedWeiboContent, 'metadata'>,
    startTime: number,
    parseId: string
  ): Promise<ParsedWeiboMetadata> {
    const processingTime = Date.now() - startTime;

    return {
      parsing: {
        timestamp: new Date(),
        version: '1.0.0',
        method: 'MediaCrawler-inspired-weibo-parser',
        sourceType: 'weibo-search-results'
      },
      quality: {
        overallScore: this.calculateOverallQualityScore(enhancedContent),
        completeness: this.calculateOverallCompleteness(enhancedContent),
        freshness: this.calculateDataFreshness(enhancedContent),
        reliability: this.calculateDataReliability(enhancedContent)
      },
      statistics: {
        totalPosts: enhancedContent.posts.length,
        totalUsers: enhancedContent.users.length,
        totalComments: enhancedContent.comments.length,
        totalMedia: enhancedContent.media.length,
        processingTime
      },
      filters: {
        searchType: 'default',
        keywords: [], // 从原始数据中提取
        contentType: ['post', 'user', 'comment', 'media']
      }
    };
  }

  /**
   * 计算整体质量分数
   */
  private calculateOverallQualityScore(content: Omit<ParsedWeiboContent, 'metadata'>): number {
    if (content.posts.length === 0) return 0;

    const totalPostScore = content.posts.reduce((sum, post) => sum + post.quality.score, 0);
    const averagePostScore = totalPostScore / content.posts.length;

    return Math.round(averagePostScore * 100) / 100;
  }

  /**
   * 计算整体完整性
   */
  private calculateOverallCompleteness(content: Omit<ParsedWeiboContent, 'metadata'>): number {
    let totalCompleteness = 0;
    let itemCount = 0;

    for (const post of content.posts) {
      totalCompleteness += post.quality.completeness;
      itemCount++;
    }

    return itemCount > 0 ? totalCompleteness / itemCount : 0;
  }

  /**
   * 计算数据新鲜度
   */
  private calculateDataFreshness(content: Omit<ParsedWeiboContent, 'metadata'>): number {
    if (content.posts.length === 0) return 0;

    const now = new Date();
    const totalFreshness = content.posts.reduce((sum, post) => {
      const hoursDiff = (now.getTime() - post.timing.createdAt.getTime()) / (1000 * 60 * 60);
      const freshnessScore = Math.max(0, 1 - (hoursDiff / 24)); // 24小时内为新鲜
      return sum + freshnessScore;
    }, 0);

    return totalFreshness / content.posts.length;
  }

  /**
   * 计算数据可靠性
   */
  private calculateDataReliability(content: Omit<ParsedWeiboContent, 'metadata'>): number {
    if (content.posts.length === 0) return 0;

    // 基于用户认证状态、内容完整性等计算可靠性
    const verifiedUserRatio = content.users.filter(user => user.verification.isVerified).length / content.users.length;
    const averageCompleteness = this.calculateOverallCompleteness(content);

    return (verifiedUserRatio * 0.6) + (averageCompleteness * 0.4);
  }

  /**
   * 生成解析ID
   */
  private generateParseId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `parse_${timestamp}_${random}`;
  }

  /**
   * 分类解析错误
   */
  private classifyParsingError(error: any): string {
    if (!error) return 'UNKNOWN_PARSING_ERROR';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('json') || errorMessage.includes('parse')) {
      return 'JSON_PARSE_ERROR';
    }

    if (errorMessage.includes('invalid') || errorMessage.includes('missing')) {
      return 'DATA_VALIDATION_ERROR';
    }

    if (errorMessage.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }

    if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      return 'MEMORY_ERROR';
    }

    return 'UNKNOWN_PARSING_ERROR';
  }

  /**
   * 增强解析错误信息
   */
  private enhanceParsingError(error: any, parseId: string): Error {
    const enhancedError = new Error(
      `微博内容解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    );

    enhancedError.name = 'EnhancedWeiboParsingError';
    (enhancedError as any).parseId = parseId;
    (enhancedError as any).originalError = error;
    (enhancedError as any).errorType = this.classifyParsingError(error);

    return enhancedError;
  }
}
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'playwright';
import * as cheerio from 'cheerio';
import { BrowserService } from '../browser/browser.service';
import { WeiboAccountService, WeiboAccount } from './account.service';
import { RawDataService } from '../raw-data/raw-data.service';
import { SourceType } from '@pro/types';
import { WeiboConfig } from '../config/crawler.interface';

// 定义接口（临时解决方案）
export interface VideoInfo {
  url: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface LocationInfo {
  name: string;
  address: string;
  longitude: number;
  latitude: number;
}

export interface WeiboNoteDetail {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  publishTime: Date;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  images: string[];
  videos: VideoInfo[];
  topics: string[];
  mentions: string[];
  location?: LocationInfo;
  isOriginal: boolean;
  sourceNoteId?: string;
  rawHtml: string;
  crawledAt: Date;
}

// 追踪上下文接口定义
export interface TraceContext {
  traceId: string;
  taskId: number;
  keyword: string;
  startTime: Date;
}

export class TraceGenerator {
  static generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `trace_${timestamp}_${randomStr}`;
  }

  static createTraceContext(taskId: number, keyword: string): TraceContext {
    return {
      traceId: this.generateTraceId(),
      taskId,
      keyword,
      startTime: new Date()
    };
  }
}

/**
 * 微博详情爬取服务 - 深度挖掘单条微博的完整信息
 * 每一条微博都是数字时代的社会记忆碎片，值得被完整保存
 */
@Injectable()
export class WeiboDetailCrawlerService {
  private readonly logger = new Logger(WeiboDetailCrawlerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly browserService: BrowserService,
    private readonly accountService: WeiboAccountService,
    private readonly rawDataService: RawDataService,
    @Inject('WEIBO_CONFIG') private readonly weiboConfig: WeiboConfig
  ) {}

  /**
   * 根据帖子ID获取详情 - 灵感源自MediaCrawler的get_note_info_by_id
   * 这不仅是一次数据获取，更是对数字记忆的完整保存
   */
  async getNoteDetailById(
    noteId: string,
    account?: WeiboAccount,
    traceContext?: TraceContext
  ): Promise<WeiboNoteDetail | null> {
    const startTime = Date.now();
    const detailTraceId = traceContext || TraceGenerator.createTraceContext(0, `note_${noteId}`);

    this.logger.log('🔍 开始获取微博详情', {
      traceId: detailTraceId.traceId,
      noteId,
      accountId: account?.id,
      startTime: new Date().toISOString()
    });

    let page: Page | null = null;
    let usedAccount: WeiboAccount | null = account || null;

    try {
      // 获取可用账号（如果未提供）
      if (!usedAccount) {
        usedAccount = await this.accountService.getAvailableAccount();
        if (!usedAccount) {
          throw new Error('无可用微博账号进行详情爬取');
        }
      }

      // 创建页面实例
      page = await this.browserService.createPage(usedAccount.id, usedAccount.cookies);

      // 构建详情页URL
      const detailUrl = this.buildDetailUrl(noteId);

      this.logger.debug('📄 访问微博详情页', {
        traceId: detailTraceId.traceId,
        noteId,
        detailUrl
      });

      // 访问详情页
      await page.goto(detailUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 等待页面加载完成
      await page.waitForSelector('[id*="M_"]', { timeout: 15000 });

      // 获取页面HTML
      const html = await page.content();
      const $ = cheerio.load(html);

      // 提取微博详情信息
      const noteDetail = this.extractNoteDetail($, noteId, html);

      if (noteDetail) {
        // 保存原始数据
        await this.saveDetailRawData(noteId, html, usedAccount.id, detailTraceId);

        const duration = Date.now() - startTime;
        this.logger.log('✅ 微博详情获取成功', {
          traceId: detailTraceId.traceId,
          noteId,
          authorName: noteDetail.authorName,
          contentLength: noteDetail.content.length,
          imagesCount: noteDetail.images.length,
          videosCount: noteDetail.videos.length,
          duration,
          crawledAt: noteDetail.crawledAt.toISOString()
        });

        return noteDetail;
      } else {
        throw new Error('未能解析出微博详情信息');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('❌ 微博详情获取失败', {
        traceId: detailTraceId.traceId,
        noteId,
        accountId: usedAccount?.id,
        duration,
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyDetailError(error)
      });
      return null;
    } finally {
      // 清理资源
      if (page && usedAccount) {
        try {
          await this.browserService.closeContext(usedAccount.id);
        } catch (cleanupError) {
          this.logger.error('清理浏览器资源失败', {
            traceId: detailTraceId.traceId,
            accountId: usedAccount.id,
            error: cleanupError instanceof Error ? cleanupError.message : '未知错误'
          });
        }
      }
    }
  }

  /**
   * 批量获取微博详情 - 高效的批量处理艺术
   */
  async batchGetNoteDetails(
    noteIds: string[],
    account?: WeiboAccount,
    maxConcurrency: number = 3
  ): Promise<{ noteId: string; detail: WeiboNoteDetail | null }[]> {
    this.logger.log('📦 开始批量获取微博详情', {
      totalNotes: noteIds.length,
      maxConcurrency,
      accountId: account?.id
    });

    const results: { noteId: string; detail: WeiboNoteDetail | null }[] = [];
    const chunks = this.chunkArray(noteIds, maxConcurrency);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      this.logger.debug(`处理第 ${i + 1}/${chunks.length} 批次`, {
        batchSize: chunk.length,
        noteIds: chunk
      });

      const chunkPromises = chunk.map(async (noteId) => {
        const detail = await this.getNoteDetailById(noteId, account);
        return { noteId, detail };
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // 批次间延迟，避免过于频繁的请求
      if (i < chunks.length - 1) {
        await this.randomDelay(2000, 5000);
      }
    }

    const successCount = results.filter(r => r.detail !== null).length;
    this.logger.log('📦 批量详情获取完成', {
      totalNotes: noteIds.length,
      successCount,
      failureCount: noteIds.length - successCount,
      successRate: Math.round((successCount / noteIds.length) * 100)
    });

    return results;
  }

  /**
   * 构建微博详情页URL
   */
  private buildDetailUrl(noteId: string): string {
    return `${this.weiboConfig.baseUrl}/${noteId}`;
  }

  /**
   * 从HTML中提取微博详情 - 解析数字记忆的艺术
   */
  private extractNoteDetail($: cheerio.CheerioAPI, noteId: string, html: string): WeiboNoteDetail | null {
    try {
      // 查找主要的微博容器
      const noteContainer = $(`[id*="M_"], [data-mid="${noteId}"]`).first();
      if (noteContainer.length === 0) {
        // 尝试其他可能的选择器
        const alternativeContainer = $('.WB_detail').first();
        if (alternativeContainer.length === 0) {
          this.logger.warn('未找到微博详情容器');
          return null;
        }
      }

      // 提取作者信息
      const authorName = this.extractText($, noteContainer, '.W_f14, .W_text a[usercard]');
      const authorId = this.extractAttribute($, noteContainer, '.W_f14, .W_text a[usercard]', 'usercard')?.replace('id=', '') || '';
      const authorAvatar = this.extractAttribute($, noteContainer, '.W_face img', 'src') || '';

      // 提取内容
      const content = this.extractText($, noteContainer, '.WB_text');

      // 提取时间信息
      const publishTimeText = this.extractAttribute($, noteContainer, '.W_text a[date]', 'date');
      const publishTime = publishTimeText ? new Date(parseInt(publishTimeText) * 1000) : new Date();

      // 提取互动数据
      const likeCount = this.extractNumber($, noteContainer, '.W_ficon:nth-child(1) .pos');
      const repostCount = this.extractNumber($, noteContainer, '.W_ficon:nth-child(2) .pos');
      const commentCount = this.extractNumber($, noteContainer, '.W_ficon:nth-child(3) .pos');

      // 提取图片
      const images = this.extractImages($, noteContainer);

      // 提取视频
      const videos = this.extractVideos($, noteContainer);

      // 提取话题和提及
      const topics = this.extractTopics(content);
      const mentions = this.extractMentions(content);

      // 提取位置信息
      const location = this.extractLocation($, noteContainer);

      // 判断是否为原创
      const isOriginal = noteContainer.find('.WB_expand').length === 0;

      // 提取转发源
      let sourceNoteId: string | undefined;
      if (!isOriginal) {
        sourceNoteId = this.extractAttribute($, noteContainer, '.WB_expand a', 'href')?.match(/\/(\w+)$/)?.[1];
      }

      return {
        id: noteId,
        content: content.trim(),
        authorId,
        authorName: authorName || '未知用户',
        authorAvatar,
        publishTime,
        likeCount,
        repostCount,
        commentCount,
        images,
        videos,
        topics,
        mentions,
        location,
        isOriginal,
        sourceNoteId,
        rawHtml: html,
        crawledAt: new Date()
      };

    } catch (error) {
      this.logger.error('解析微博详情失败', {
        noteId,
        error: error instanceof Error ? error.message : '未知错误'
      });
      return null;
    }
  }

  /**
   * 提取文本内容
   */
  private extractText($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>, selector: string): string {
    return container.find(selector).first().text().trim();
  }

  /**
   * 提取属性值
   */
  private extractAttribute($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>, selector: string, attribute: string): string | undefined {
    return container.find(selector).first().attr(attribute);
  }

  /**
   * 提取数字信息
   */
  private extractNumber($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>, selector: string): number {
    const text = this.extractText($, container, selector);
    const number = text.replace(/[^\d]/g, '');
    return number ? parseInt(number) : 0;
  }

  /**
   * 提取图片链接
   */
  private extractImages($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>): string[] {
    const images: string[] = [];
    container.find('.WB_pic img').each((_, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      if (src && !images.includes(src)) {
        images.push(src);
      }
    });
    return images;
  }

  /**
   * 提取视频信息
   */
  private extractVideos($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>): VideoInfo[] {
    const videos: VideoInfo[] = [];
    container.find('.WB_video, .WB_media_video').each((_, element) => {
      const videoElement = $(element);
      const videoUrl = videoElement.find('video source').attr('src') || videoElement.attr('data-video-src');
      const thumbnailUrl = videoElement.find('img').attr('src') || videoElement.attr('data-cover');

      if (videoUrl) {
        videos.push({
          url: videoUrl,
          thumbnailUrl: thumbnailUrl || '',
          duration: 0, // 需要进一步解析
          width: 0,
          height: 0,
          size: 0,
          format: 'mp4'
        });
      }
    });
    return videos;
  }

  /**
   * 提取话题标签
   */
  private extractTopics(content: string): string[] {
    const topicRegex = /#([^#]+)#/g;
    const topics: string[] = [];
    let match;
    while ((match = topicRegex.exec(content)) !== null) {
      topics.push(match[1]);
    }
    return topics;
  }

  /**
   * 提取用户提及
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@([^\s@]+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }

  /**
   * 提取位置信息
   */
  private extractLocation($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>): LocationInfo | undefined {
    const locationElement = container.find('.W_icon_bicon, .WB_from a[href*="place"]');
    if (locationElement.length > 0) {
      const locationText = locationElement.text().trim();
      const locationHref = locationElement.attr('href');

      if (locationText) {
        return {
          name: locationText,
          address: locationText,
          longitude: 0, // 需要进一步地理编码
          latitude: 0
        };
      }
    }
    return undefined;
  }

  /**
   * 保存详情原始数据
   */
  private async saveDetailRawData(
    noteId: string,
    html: string,
    accountId: number,
    traceContext: TraceContext
  ): Promise<void> {
    try {
      await this.rawDataService.create({
        sourceType: SourceType.WEIBO_HTML,
        sourceUrl: this.buildDetailUrl(noteId),
        rawContent: html,
        metadata: {
          noteId,
          accountId,
          crawledAt: new Date(),
          traceId: traceContext.traceId
        }
      });
    } catch (error) {
      this.logger.error('保存详情原始数据失败', {
        noteId,
        accountId,
        traceId: traceContext.traceId,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 数组分块工具 - 批量处理的优雅实现
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 随机延迟 - 模拟人类行为的艺术
   */
  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 分类详情爬取错误 - 每个错误都是优化的机会
   */
  private classifyDetailError(error: any): string {
    if (!error) return 'UNKNOWN';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return 'DETAIL_TIMEOUT';
    }

    if (errorMessage.includes('selector') || errorMessage.includes('element')) {
      return 'ELEMENT_NOT_FOUND';
    }

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return 'NOTE_NOT_FOUND';
    }

    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return 'ACCESS_DENIED';
    }

    if (errorMessage.includes('login') || errorMessage.includes('auth')) {
      return 'AUTH_ERROR';
    }

    return 'UNKNOWN_DETAIL_ERROR';
  }
}
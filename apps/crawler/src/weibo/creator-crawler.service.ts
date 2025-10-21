import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'playwright';
import * as cheerio from 'cheerio';
import { BrowserService } from '../browser/browser.service';
import { WeiboAccountService, WeiboAccount } from './account.service';
import { RawDataService } from '../raw-data/raw-data.service';
import { SourceType } from '@pro/types';
import { WeiboConfig } from '../config/crawler.interface';
import { TraceGenerator } from './trace.generator';
import { TraceContext } from './types';

// 定义接口（临时解决方案）
export interface WeiboNoteSummary {
  id: string;
  content: string;
  publishTime: Date;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  hasImages: boolean;
  hasVideo: boolean;
  isOriginal: boolean;
}

export interface WeiboCreatorDetail {
  id: string;
  nickname: string;
  avatar: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  verificationType?: string;
  location?: string;
  gender?: string;
  birthday?: string;
  registrationDate?: Date;
  lastActiveTime?: Date;
  notes: WeiboNoteSummary[];
  rawProfileHtml: string;
  crawledAt: Date;
}

/**
 * 微博创作者爬取服务 - 探索用户的完整作品和轨迹
 * 每个创作者都是数字时代的独特声音，值得被完整记录
 */
@Injectable()
export class WeiboCreatorCrawlerService {
  private readonly logger = new Logger(WeiboCreatorCrawlerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly browserService: BrowserService,
    private readonly accountService: WeiboAccountService,
    private readonly rawDataService: RawDataService,
    @Inject('WEIBO_CONFIG') private readonly weiboConfig: WeiboConfig
  ) {}

  /**
   * 根据创作者ID获取详细信息 - 灵感源自MediaCrawler的get_creator_info_by_id
   * 这不仅是数据收集，更是对数字身份的完整画像
   */
  async getCreatorInfoById(
    creatorId: string,
    account?: WeiboAccount,
    traceContext?: TraceContext
  ): Promise<WeiboCreatorDetail | null> {
    const startTime = Date.now();
    const creatorTraceId = traceContext || TraceGenerator.createTraceContext(0, `creator_${creatorId}`);

    this.logger.log('🎨 开始获取创作者信息', {
      traceId: creatorTraceId.traceId,
      creatorId,
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
          throw new Error('无可用微博账号进行创作者信息爬取');
        }
      }

      // 创建页面实例
      page = await this.browserService.createPage(usedAccount.id, usedAccount.cookies);

      // 构建创作者主页URL
      const profileUrl = this.buildProfileUrl(creatorId);

      this.logger.debug('👤 访问创作者主页', {
        traceId: creatorTraceId.traceId,
        creatorId,
        profileUrl
      });

      // 访问创作者主页
      await page.goto(profileUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 等待页面加载完成
      await page.waitForSelector('.WB_innerwrap, .PCD_user_header', { timeout: 15000 });

      // 获取页面HTML
      const html = await page.content();
      const $ = cheerio.load(html);

      // 提取创作者详细信息
      const creatorDetail = this.extractCreatorDetail($, creatorId, html);

      if (creatorDetail) {
        // 保存原始数据
        await this.saveCreatorRawData(creatorId, html, usedAccount.id, creatorTraceId);

        const duration = Date.now() - startTime;
        this.logger.log('✅ 创作者信息获取成功', {
          traceId: creatorTraceId.traceId,
          creatorId,
          nickname: creatorDetail.nickname,
          followersCount: creatorDetail.followersCount,
          postsCount: creatorDetail.postsCount,
          verified: creatorDetail.verified,
          duration,
          crawledAt: creatorDetail.crawledAt.toISOString()
        });

        return creatorDetail;
      } else {
        throw new Error('未能解析出创作者信息');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('❌ 创作者信息获取失败', {
        traceId: creatorTraceId.traceId,
        creatorId,
        accountId: usedAccount?.id,
        duration,
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyCreatorError(error)
      });
      return null;
    } finally {
      // 清理资源
      if (page && usedAccount) {
        try {
          await this.browserService.closeContext(usedAccount.id);
        } catch (cleanupError) {
          this.logger.error('清理浏览器资源失败', {
            traceId: creatorTraceId.traceId,
            accountId: usedAccount.id,
            error: cleanupError instanceof Error ? cleanupError.message : '未知错误'
          });
        }
      }
    }
  }

  /**
   * 获取创作者的所有作品 - 灵感源自MediaCrawler的get_all_notes_by_creator_id
   * 建立创作者作品的完整时间序列索引
   */
  async getAllNotesByCreatorId(
    creatorId: string,
    maxPages: number = 10,
    account?: WeiboAccount
  ): Promise<WeiboNoteSummary[]> {
    this.logger.log('📚 开始获取创作者所有作品', {
      creatorId,
      maxPages,
      accountId: account?.id
    });

    const notes: WeiboNoteSummary[] = [];
    let usedAccount: WeiboAccount | null = account || null;

    try {
      // 获取可用账号（如果未提供）
      if (!usedAccount) {
        usedAccount = await this.accountService.getAvailableAccount();
        if (!usedAccount) {
          throw new Error('无可用微博账号进行作品爬取');
        }
      }

      // 创建页面实例
      const page = await this.browserService.createPage(usedAccount.id, usedAccount.cookies);

      // 逐页爬取
      for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
        try {
          const pageUrl = this.buildProfilePageUrl(creatorId, currentPage);

          this.logger.debug('📄 获取创作者作品页', {
            creatorId,
            page: currentPage,
            pageUrl
          });

          await page.goto(pageUrl, {
            waitUntil: 'networkidle',
            timeout: 25000
          });

          await page.waitForSelector('.WB_feed .WB_detail', { timeout: 10000 });

          const html = await page.content();
          const $ = cheerio.load(html);

          // 提取当前页的微博摘要
          const pageNotes = this.extractNoteSummaries($);
          notes.push(...pageNotes);

          this.logger.debug('✅ 作品页处理完成', {
            creatorId,
            page: currentPage,
            notesCount: pageNotes.length,
            totalNotes: notes.length
          });

          // 检查是否还有更多内容
          if (pageNotes.length === 0 || this.isLastPage($)) {
            this.logger.log('🏁 创作者作品已全部获取', {
              creatorId,
              finalPage: currentPage - 1,
              totalNotes: notes.length
            });
            break;
          }

          // 页面间延迟
          await this.randomDelay(2000, 4000);

        } catch (pageError) {
          this.logger.error('❌ 作品页获取失败', {
            creatorId,
            page: currentPage,
            error: pageError instanceof Error ? pageError.message : '未知错误'
          });
          continue;
        }
      }

      // 清理资源
      await this.browserService.closeContext(usedAccount.id);

      this.logger.log('📚 创作者作品获取完成', {
        creatorId,
        totalNotes: notes.length,
        pagesProcessed: Math.min(maxPages, Math.ceil(notes.length / 20)) // 假设每页约20条
      });

      return notes;

    } catch (error) {
      this.logger.error('❌ 创作者作品获取失败', {
        creatorId,
        accountId: usedAccount?.id,
        error: error instanceof Error ? error.message : '未知错误'
      });
      return notes; // 返回已获取的作品
    }
  }

  /**
   * 构建创作者主页URL
   */
  private buildProfileUrl(creatorId: string): string {
    return `${this.weiboConfig.baseUrl}/u/${creatorId}`;
  }

  /**
   * 构建创作者作品分页URL
   */
  private buildProfilePageUrl(creatorId: string, page: number): string {
    return `${this.weiboConfig.baseUrl}/p/${page + 1}${page > 1 ? `?page=${page}` : ''}`;
  }

  /**
   * 从HTML中提取创作者详细信息 - 构建数字身份画像
   */
  private extractCreatorDetail($: cheerio.CheerioAPI, creatorId: string, html: string): WeiboCreatorDetail | null {
    try {
      // 提取基本信息
      const nickname = this.extractText($, $('.PCD_user_header'), '.uname .tt, .PCD_user_header .name');
      const avatar = this.extractAttribute($, $('.PCD_user_header'), '.avatar img', 'src') || '';
      const bio = this.extractText($, $('.PCD_user_header'), '.pc_txt .info, .PCD_user_header .intro');

      // 提取粉丝数据
      const followersText = this.extractText($, $('.PCD_user_header'), '.follower strong, .PCD_user_header .follow_count');
      const followingText = this.extractText($, $('.PCD_user_header'), '.following strong, .PCD_user_header .fans_count');
      const postsText = this.extractText($, $('.PCD_user_header'), '.weibo strong, .PCD_user_header .weibo_count');

      const followersCount = this.parseNumber(followersText);
      const followingCount = this.parseNumber(followingText);
      const postsCount = this.parseNumber(postsText);

      // 提取认证信息
      const verifiedElement = $('.icon_approve, .PCD_user_header .verify');
      const verified = verifiedElement.length > 0;
      const verificationType = verified ? this.extractText($, verifiedElement, '') : undefined;

      // 提取位置信息
      const location = this.extractText($, $('.PCD_user_header'), '.pc_txt .label, .PCD_user_header .location');

      // 提取性别信息
      const genderElement = $('.pc_icon .W_icon_female, .pc_icon .W_icon_male');
      let gender: string | undefined;
      if (genderElement.hasClass('W_icon_female')) {
        gender = '女';
      } else if (genderElement.hasClass('W_icon_male')) {
        gender = '男';
      }

      // 提取其他信息
      const birthday = this.extractText($, $('.PCD_user_header'), '.pc_txt .W_fl');
      const registrationDateText = this.extractText($, $('.PCD_user_header'), '.pc_txt:contains("注册时间")');
      const registrationDate = registrationDateText ? this.parseRegistrationDate(registrationDateText) : undefined;

      // 获取最近的作品摘要
      const notes = this.extractNoteSummaries($);

      return {
        id: creatorId,
        nickname: nickname || '未知用户',
        avatar,
        bio,
        followersCount,
        followingCount,
        postsCount,
        verified,
        verificationType,
        location,
        gender,
        birthday,
        registrationDate,
        lastActiveTime: notes.length > 0 ? notes[0].publishTime : undefined,
        notes,
        rawProfileHtml: html,
        crawledAt: new Date()
      };

    } catch (error) {
      this.logger.error('解析创作者信息失败', {
        creatorId,
        error: error instanceof Error ? error.message : '未知错误'
      });
      return null;
    }
  }

  /**
   * 提取微博摘要信息
   */
  private extractNoteSummaries($: cheerio.CheerioAPI): WeiboNoteSummary[] {
    const summaries: WeiboNoteSummary[] = [];

    $('.WB_feed .WB_detail').each((_, element) => {
      const noteElement = $(element);

      try {
        // 提取微博ID
        const noteId = this.extractNoteId(noteElement);
        if (!noteId) return;

        // 提取内容
        const content = this.extractText($, noteElement, '.WB_text');

        // 提取时间
        const timeElement = noteElement.find('.W_text a[date]');
        const timestamp = timeElement.attr('date');
        const publishTime = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();

        // 提取互动数据
        const likeCount = this.extractInteractionCount(noteElement, 0);
        const repostCount = this.extractInteractionCount(noteElement, 1);
        const commentCount = this.extractInteractionCount(noteElement, 2);

        // 检查媒体内容
        const hasImages = noteElement.find('.WB_pic img').length > 0;
        const hasVideo = noteElement.find('.WB_video, .WB_media_video').length > 0;

        // 判断是否为原创
        const isOriginal = noteElement.find('.WB_expand').length === 0;

        summaries.push({
          id: noteId,
          content: content.trim(),
          publishTime,
          likeCount,
          repostCount,
          commentCount,
          hasImages,
          hasVideo,
          isOriginal
        });

      } catch (error) {
        this.logger.warn('解析微博摘要失败', {
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    });

    return summaries;
  }

  /**
   * 提取微博ID
   */
  private extractNoteId(noteElement: cheerio.Cheerio<any>): string | null {
    // 尝试多种方式获取微博ID
    const mid = noteElement.attr('mid');
    if (mid) return mid;

    const idMatch = noteElement.attr('id')?.match(/M_(\w+)/);
    if (idMatch) return idMatch[1];

    const hrefMatch = noteElement.find('.W_text a').attr('href')?.match(/\/comment\/(\w+)/);
    if (hrefMatch) return hrefMatch[1];

    return null;
  }

  /**
   * 提取互动数据
   */
  private extractInteractionCount(noteElement: cheerio.Cheerio<any>, index: number): number {
    const actionElement = noteElement.find('.WB_row_line .WB_row_r4').eq(index);
    const text = actionElement.text();
    const number = text.replace(/[^\d]/g, '');
    return number ? parseInt(number) : 0;
  }

  /**
   * 解析数字（处理万、亿等单位）
   */
  private parseNumber(text: string): number {
    if (!text) return 0;

    const cleanText = text.replace(/[^\d.万千]/g, '');
    const number = parseFloat(cleanText);

    if (text.includes('万')) {
      return Math.round(number * 10000);
    } else if (text.includes('千')) {
      return Math.round(number * 1000);
    } else if (text.includes('亿')) {
      return Math.round(number * 100000000);
    }

    return Math.round(number);
  }

  /**
   * 解析注册日期
   */
  private parseRegistrationDate(text: string): Date | undefined {
    const dateMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return undefined;
  }

  /**
   * 检查是否为最后一页
   */
  private isLastPage($: cheerio.CheerioAPI): boolean {
    // 检查是否有"下一页"按钮
    const nextButton = $('.page.next').length === 0;
    // 检查是否有更多内容提示
    const noMore = $('.empty_tip, .no_more').length > 0;

    return nextButton || noMore;
  }

  /**
   * 保存创作者原始数据
   */
  private async saveCreatorRawData(
    creatorId: string,
    html: string,
    accountId: number,
    traceContext: TraceContext
  ): Promise<void> {
    try {
      await this.rawDataService.create({
        sourceType: SourceType.WEIBO_NOTE_DETAIL,
        sourceUrl: this.buildProfileUrl(creatorId),
        rawContent: html,
        metadata: {
          creatorId,
          accountId,
          crawledAt: new Date(),
          traceId: traceContext.traceId
        }
      });
    } catch (error) {
      this.logger.error('保存创作者原始数据失败', {
        creatorId,
        accountId,
        traceId: traceContext.traceId,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 随机延迟
   */
  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
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
   * 分类创作者爬取错误
   */
  private classifyCreatorError(error: any): string {
    if (!error) return 'UNKNOWN';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return 'CREATOR_TIMEOUT';
    }

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return 'CREATOR_NOT_FOUND';
    }

    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return 'ACCESS_DENIED';
    }

    if (errorMessage.includes('login') || errorMessage.includes('auth')) {
      return 'AUTH_ERROR';
    }

    if (errorMessage.includes('suspended') || errorMessage.includes('banned')) {
      return 'CREATOR_SUSPENDED';
    }

    return 'UNKNOWN_CREATOR_ERROR';
  }
}

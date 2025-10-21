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
export interface WeiboComment {
  id: string;
  noteId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  publishTime: Date;
  likeCount: number;
  replyCount: number;
  parentCommentId?: string;
  subComments?: WeiboComment[];
  rawHtml: string;
  crawledAt: Date;
}

/**
 * 微博评论爬取服务 - 提取社会互动的数据化呈现
 * 每条评论都是社会对话的数字痕迹，值得被完整保存
 */
@Injectable()
export class WeiboCommentCrawlerService {
  private readonly logger = new Logger(WeiboCommentCrawlerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly browserService: BrowserService,
    private readonly accountService: WeiboAccountService,
    private readonly rawDataService: RawDataService,
    @Inject('WEIBO_CONFIG') private readonly weiboConfig: WeiboConfig
  ) {}

  /**
   * 获取微博的所有评论 - 灵感源自MediaCrawler的get_note_all_comments
   * 构建完整的评论树，捕捉社会互动的全貌
   */
  async getAllCommentsByNoteId(
    noteId: string,
    maxDepth: number = 3,
    maxComments: number = 1000,
    account?: WeiboAccount
  ): Promise<WeiboComment[]> {
    const startTime = Date.now();
    const commentTraceId = TraceGenerator.createTraceContext(0, `comments_${noteId}`);

    this.logger.log('💬 开始获取微博评论', {
      traceId: commentTraceId.traceId,
      noteId,
      maxDepth,
      maxComments,
      accountId: account?.id,
      startTime: new Date().toISOString()
    });

    let usedAccount: WeiboAccount | null = account || null;
    const allComments: WeiboComment[] = [];

    try {
      // 获取可用账号（如果未提供）
      if (!usedAccount) {
        usedAccount = await this.accountService.getAvailableAccount();
        if (!usedAccount) {
          throw new Error('无可用微博账号进行评论爬取');
        }
      }

      // 创建页面实例
      const page = await this.browserService.createPage(usedAccount.id, usedAccount.cookies);

      // 构建评论页URL
      const commentUrl = this.buildCommentUrl(noteId);

      this.logger.debug('📄 访问微博评论页', {
        traceId: commentTraceId.traceId,
        noteId,
        commentUrl
      });

      // 访问评论页
      await page.goto(commentUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 等待评论加载
      await page.waitForSelector('.list_li, .WB_feed', { timeout: 15000 });

      // 获取根级评论
      const rootComments = await this.getRootComments(page, noteId, maxComments, commentTraceId);
      allComments.push(...rootComments);

      this.logger.log('🌳 根级评论获取完成', {
        traceId: commentTraceId.traceId,
        noteId,
        rootCommentsCount: rootComments.length,
        maxDepth
      });

      // 递归获取子评论
      if (maxDepth > 1) {
        for (let i = 0; i < rootComments.length && allComments.length < maxComments; i++) {
          const rootComment = rootComments[i];

          if (rootComment.replyCount > 0) {
            this.logger.debug('🔽 开始获取子评论', {
              traceId: commentTraceId.traceId,
              noteId,
              parentCommentId: rootComment.id,
              replyCount: rootComment.replyCount,
              currentDepth: 2
            });

            const subComments = await this.getSubComments(
              page,
              noteId,
              rootComment.id,
              2,
              maxDepth,
              maxComments - allComments.length,
              commentTraceId
            );

            rootComment.subComments = subComments;
            allComments.push(...subComments);

            this.logger.debug('✅ 子评论获取完成', {
              traceId: commentTraceId.traceId,
              noteId,
              parentCommentId: rootComment.id,
              subCommentsCount: subComments.length,
              totalComments: allComments.length
            });
          }

          // 适当延迟避免请求过频
          if (i < rootComments.length - 1) {
            await this.randomDelay(1000, 2000);
          }
        }
      }

      // 清理资源
      await this.browserService.closeContext(usedAccount.id);

      const duration = Date.now() - startTime;
      this.logger.log('💬 微博评论获取完成', {
        traceId: commentTraceId.traceId,
        noteId,
        totalComments: allComments.length,
        rootComments: rootComments.length,
        maxDepthReached: this.calculateMaxDepthReached(allComments),
        duration,
        commentsPerSecond: Math.round((allComments.length / duration) * 1000)
      });

      return allComments;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('❌ 微博评论获取失败', {
        traceId: commentTraceId.traceId,
        noteId,
        accountId: usedAccount?.id,
        duration,
        totalComments: allComments.length,
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyCommentError(error)
      });
      return allComments; // 返回已获取的评论
    }
  }

  /**
   * 获取根级评论
   */
  private async getRootComments(
    page: Page,
    noteId: string,
    maxComments: number,
    traceContext: TraceContext
  ): Promise<WeiboComment[]> {
    const rootComments: WeiboComment[] = [];
    let currentPage = 1;
    const maxPages = Math.ceil(maxComments / 20); // 假设每页20条评论

    while (currentPage <= maxPages && rootComments.length < maxComments) {
      try {
        // 如果不是第一页，需要导航到对应页
        if (currentPage > 1) {
          const pageUrl = this.buildCommentPageUrl(noteId, currentPage);
          await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForSelector('.list_li', { timeout: 10000 });
        }

        const html = await page.content();
        const $ = cheerio.load(html);

        // 提取当前页的评论
        const pageComments = this.extractCommentsFromPage($, noteId, undefined);

        rootComments.push(...pageComments);

        this.logger.debug('📄 评论页处理完成', {
          traceId: traceContext.traceId,
          noteId,
          page: currentPage,
          commentsCount: pageComments.length,
          totalRootComments: rootComments.length
        });

        // 检查是否还有更多评论
        if (pageComments.length === 0 || this.isLastCommentPage($)) {
          break;
        }

        currentPage++;

        // 页面间延迟
        await this.randomDelay(1500, 3000);

      } catch (pageError) {
        this.logger.error('❌ 评论页获取失败', {
          traceId: traceContext.traceId,
          noteId,
          page: currentPage,
          error: pageError instanceof Error ? pageError.message : '未知错误'
        });
        break;
      }
    }

    return rootComments.slice(0, maxComments);
  }

  /**
   * 递归获取子评论 - 灵感源自MediaCrawler的get_comments_all_sub_comments
   */
  private async getSubComments(
    page: Page,
    noteId: string,
    parentCommentId: string,
    currentDepth: number,
    maxDepth: number,
    remainingComments: number,
    traceContext: TraceContext
  ): Promise<WeiboComment[]> {
    if (currentDepth > maxDepth || remainingComments <= 0) {
      return [];
    }

    const subComments: WeiboComment[] = [];

    try {
      // 点击展开子评论
      await this.expandSubComments(page, parentCommentId);

      // 等待子评论加载
      await page.waitForTimeout(2000);

      // 获取包含子评论的HTML
      const html = await page.content();
      const $ = cheerio.load(html);

      // 查找当前父评论下的子评论
      const subCommentSelector = `.comment_child_${parentCommentId} .list_li, [data-parentid="${parentCommentId}"] .list_li`;
      $(subCommentSelector).each((_, element) => {
        if (subComments.length >= remainingComments) return false;

        const subComment = this.extractSingleComment($, $(element), noteId, parentCommentId);
        if (subComment) {
          subComments.push(subComment);
        }
      });

      // 如果需要继续深入，递归处理有回复的子评论
      if (currentDepth < maxDepth) {
        for (const subComment of subComments) {
          if (subComment.replyCount > 0 && subComments.length < remainingComments) {
            const deeperComments = await this.getSubComments(
              page,
              noteId,
              subComment.id,
              currentDepth + 1,
              maxDepth,
              remainingComments - subComments.length,
              traceContext
            );

            subComment.subComments = deeperComments;
            subComments.push(...deeperComments);
          }
        }
      }

    } catch (error) {
      this.logger.warn('⚠️ 子评论获取失败', {
        traceId: traceContext.traceId,
        noteId,
        parentCommentId,
        currentDepth,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }

    return subComments.slice(0, remainingComments);
  }

  /**
   * 从页面提取评论
   */
  private extractCommentsFromPage(
    $: cheerio.CheerioAPI,
    noteId: string,
    parentCommentId?: string
  ): WeiboComment[] {
    const comments: WeiboComment[] = [];

    $('.list_li, .WB_feed_type').each((_, element) => {
      const commentElement = $(element);
      const comment = this.extractSingleComment($, commentElement, noteId, parentCommentId);
      if (comment) {
        comments.push(comment);
      }
    });

    return comments;
  }

  /**
   * 提取单条评论
   */
  private extractSingleComment(
    $: cheerio.CheerioAPI,
    commentElement: cheerio.Cheerio<any>,
    noteId: string,
    parentCommentId?: string
  ): WeiboComment | null {
    try {
      // 提取评论ID
      const commentId = this.extractCommentId(commentElement);
      if (!commentId) return null;

      // 提取评论内容
      const content = this.extractText(commentElement, '.comment_txt, .WB_text');

      // 提取作者信息
      const authorName = this.extractText(commentElement, '.comment_name, .W_f14');
      const authorId = this.extractAuthorId(commentElement);
      const authorAvatar = this.extractAttribute(commentElement, '.W_face img, .comment_avatar img', 'src') || '';

      // 提取时间
      const timeElement = commentElement.find('.W_text a[date], .comment_time');
      const timestamp = timeElement.attr('date');
      const publishTime = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();

      // 提取互动数据
      const likeCount = this.extractNumber(commentElement, '.W_ficon .pos, .comment_like');
      const replyCount = this.extractReplyCount(commentElement);

      return {
        id: commentId,
        noteId,
        content: content.trim(),
        authorId,
        authorName: authorName || '匿名用户',
        authorAvatar,
        publishTime,
        likeCount,
        replyCount,
        parentCommentId,
        subComments: [], // 将在递归过程中填充
        rawHtml: commentElement.html() || '',
        crawledAt: new Date()
      };

    } catch (error) {
      this.logger.warn('解析单条评论失败', {
        error: error instanceof Error ? error.message : '未知错误'
      });
      return null;
    }
  }

  /**
   * 提取评论ID
   */
  private extractCommentId(commentElement: cheerio.Cheerio<any>): string | null {
    // 尝试多种方式获取评论ID
    const commentId = commentElement.attr('comment_id');
    if (commentId) return commentId;

    const idMatch = commentElement.attr('id')?.match(/comment_(\w+)/);
    if (idMatch) return idMatch[1];

    const dataId = commentElement.attr('data-id');
    if (dataId) return dataId;

    return null;
  }

  /**
   * 提取作者ID
   */
  private extractAuthorId(commentElement: cheerio.Cheerio<any>): string {
    const usercard = commentElement.find('[usercard]').attr('usercard');
    if (usercard) {
      const idMatch = usercard.match(/id=(\w+)/);
      return idMatch ? idMatch[1] : '';
    }

    const href = commentElement.find('a[href*="/u/"]').attr('href');
    if (href) {
      const idMatch = href.match(/\/u\/(\w+)/);
      return idMatch ? idMatch[1] : '';
    }

    return '';
  }

  /**
   * 提取回复数量
   */
  private extractReplyCount(commentElement: cheerio.Cheerio<any>): number {
    const replyText = commentElement.find('.comment_reply, .WB_rtip').text();
    const numberMatch = replyText.match(/(\d+)/);
    return numberMatch ? parseInt(numberMatch[1]) : 0;
  }

  /**
   * 展开子评论
   */
  private async expandSubComments(page: Page, parentCommentId: string): Promise<void> {
    try {
      // 查找展开子评论的按钮
      const expandSelectors = [
        `.comment_child_${parentCommentId} .comment_more`,
        `[data-parentid="${parentCommentId}"] .comment_expand`,
        `.expand_reply_${parentCommentId}`
      ];

      for (const selector of expandSelectors) {
        const expandButton = page.locator(selector);
        if (await expandButton.isVisible()) {
          await expandButton.click();
          await page.waitForTimeout(1500);
          break;
        }
      }
    } catch (error) {
      // 展开失败不影响主流程
      this.logger.debug('子评论展开失败', {
        parentCommentId,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 构建评论页URL
   */
  private buildCommentUrl(noteId: string): string {
    return `${this.weiboConfig.baseUrl}/comment/${noteId}`;
  }

  /**
   * 构建评论分页URL
   */
  private buildCommentPageUrl(noteId: string, page: number): string {
    return `${this.weiboConfig.baseUrl}/comment/${noteId}?page=${page}`;
  }

  /**
   * 检查是否为最后一页评论
   */
  private isLastCommentPage($: cheerio.CheerioAPI): boolean {
    const nextButton = $('.page.next').length === 0;
    const noMore = $('.empty_tip, .no_more_comment').length > 0;
    return nextButton || noMore;
  }

  /**
   * 计算实际达到的最大深度
   */
  private calculateMaxDepthReached(comments: WeiboComment[]): number {
    let maxDepth = 0;

    const calculateDepth = (commentList: WeiboComment[], currentDepth: number) => {
      maxDepth = Math.max(maxDepth, currentDepth);
      commentList.forEach(comment => {
        if (comment.subComments && comment.subComments.length > 0) {
          calculateDepth(comment.subComments, currentDepth + 1);
        }
      });
    };

    calculateDepth(comments, 1);
    return maxDepth;
  }

  /**
   * 保存评论原始数据
   */
  private async saveCommentRawData(
    noteId: string,
    html: string,
    accountId: number,
    traceContext: TraceContext
  ): Promise<void> {
    try {
      await this.rawDataService.create({
        sourceType: SourceType.WEIBO_COMMENT,
        sourceUrl: this.buildCommentUrl(noteId),
        rawContent: html,
        metadata: {
          noteId,
          accountId,
          crawledAt: new Date(),
          traceId: traceContext.traceId
        }
      });
    } catch (error) {
      this.logger.error('保存评论原始数据失败', {
        noteId,
        accountId,
        traceId: traceContext.traceId,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 工具方法：提取文本
   */
  private extractText(element: cheerio.Cheerio<any>, selector: string): string {
    return element.find(selector).first().text().trim();
  }

  /**
   * 工具方法：提取属性
   */
  private extractAttribute(element: cheerio.Cheerio<any>, selector: string, attribute: string): string | undefined {
    return element.find(selector).first().attr(attribute);
  }

  /**
   * 工具方法：提取数字
   */
  private extractNumber(element: cheerio.Cheerio<any>, selector: string): number {
    const text = this.extractText(element, selector);
    const number = text.replace(/[^\d]/g, '');
    return number ? parseInt(number) : 0;
  }

  /**
   * 随机延迟
   */
  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 分类评论爬取错误
   */
  private classifyCommentError(error: any): string {
    if (!error) return 'UNKNOWN';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return 'COMMENT_TIMEOUT';
    }

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return 'COMMENT_NOT_FOUND';
    }

    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return 'ACCESS_DENIED';
    }

    if (errorMessage.includes('login') || errorMessage.includes('auth')) {
      return 'AUTH_ERROR';
    }

    if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
      return 'RATE_LIMIT_ERROR';
    }

    return 'UNKNOWN_COMMENT_ERROR';
  }
}

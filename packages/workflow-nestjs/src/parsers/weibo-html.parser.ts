import * as cheerio from 'cheerio';
import { Injectable } from '@pro/core';

export interface ParsedSearchResult {
  postIds: string[];
  hasNextPage: boolean;
  lastPostTime: Date | null;
  totalCount: number;
}

@Injectable()
export class WeiboHtmlParser {
  constructor() {}

  parseSearchResultHtml(html: string): ParsedSearchResult {
    try {
      const $ = cheerio.load(html);

      const postIds = this.extractPostIds($);
      const hasNextPage = this.hasNextPage($);
      const lastPostTime = this.extractLastPostTime($);
      const totalCount = this.extractTotalCount($);
      return {
        postIds,
        hasNextPage,
        lastPostTime,
        totalCount,
      };
    } catch (error) {
      return {
        postIds: [],
        hasNextPage: false,
        lastPostTime: null,
        totalCount: 0,
      };
    }
  }

  private extractPostIds($: cheerio.CheerioAPI): string[] {
    const postIds: string[] = [];

    // 从详情链接中提取 mid，格式：//weibo.com/:uid/:mid
    $('div.card').each((_index: number, element: any) => {
      const $card = $(element);

      // 查找所有可能的详情链接
      const detailLinks = $card.find('p.from a, div.func a[href*="/weibo.com/"]');

      detailLinks.each((_i: number, link: any) => {
        const href = $(link).attr('href');
        if (href) {
          // 匹配格式：//weibo.com/:uid/:mid 或 //:uid/:mid
          const match = href.match(/\/\/weibo\.com\/\d+\/([A-Za-z0-9]+)/);
          if (match && match[1]) {
            const mid = match[1];
            // 过滤掉无效的 mid（太短或包含问号）
            if (mid.length > 5 && !mid.includes('?') && !postIds.includes(mid)) {
              postIds.push(mid);
            }
          }
        }
      });
    });

    // 如果上面的方法没有找到，尝试备用方法：从 action-data 或 mid 属性中提取
    if (postIds.length === 0) {
      $('div[action-type="feed_list_item"]').each((_index: number, element: any) => {
        const mid = $(element).attr('mid');
        if (mid && !postIds.includes(mid)) {
          postIds.push(mid);
        }
      });
    }

    return [...new Set(postIds)];
  }

  private hasNextPage($: cheerio.CheerioAPI): boolean {
    const nextPageLink = $('a.next');
    if (nextPageLink.length > 0) {
      return true;
    }

    const pageLinks = $('div.m-page a');
    if (pageLinks.length > 0) {
      const lastLink = pageLinks.last();
      const text = lastLink.text().trim();
      return text === '下一页' || text.includes('next');
    }

    return false;
  }

  private extractLastPostTime($: cheerio.CheerioAPI): Date | null {
    // 查找所有卡片中的时间信息
    const timeElements = $('div.card p.from a').filter((_i: number, el: any) => {
      const href = $(el).attr('href');
      // 只取详情链接，过滤掉超话链接等
      if (!href) {
        return false;
      }
      return href.includes('/weibo.com/') && /\/\d+\/[A-Za-z0-9]+/.test(href);
    });

    if (timeElements.length === 0) {
      return null;
    }

    const lastTimeElement = timeElements.last();
    const timeText = lastTimeElement.text().trim();

    return this.parseTimeText(timeText);
  }

  private parseTimeText(timeText: string): Date | null {
    if (!timeText) {
      return null;
    }

    const now = new Date();

    // 处理 "N分钟前"
    if (timeText.includes('分钟前')) {
      const minutes = Number.parseInt(timeText, 10);
      if (Number.isFinite(minutes)) {
        return new Date(now.getTime() - minutes * 60 * 1000);
      }
    }

    // 处理 "N小时前"
    if (timeText.includes('小时前')) {
      const hours = Number.parseInt(timeText, 10);
      if (Number.isFinite(hours)) {
        return new Date(now.getTime() - hours * 60 * 60 * 1000);
      }
    }

    // 处理 "今天 HH:MM"
    if (timeText.includes('今天')) {
      const match = timeText.match(/(\d{1,2}):(\d{2})/);
      if (match && match[1] && match[2]) {
        const result = new Date(now);
        result.setHours(Number.parseInt(match[1], 10));
        result.setMinutes(Number.parseInt(match[2], 10));
        result.setSeconds(0);
        result.setMilliseconds(0);
        return result;
      }
    }

    // 处理 "10月27日 21:24" 格式（带时间）
    if (timeText.includes('月') && timeText.includes('日')) {
      const match = timeText.match(/(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/);
      if (match && match[1] && match[2]) {
        const month = Number.parseInt(match[1], 10);
        const day = Number.parseInt(match[2], 10);
        const hour = match[3] ? Number.parseInt(match[3], 10) : 0;
        const minute = match[4] ? Number.parseInt(match[4], 10) : 0;

        const result = new Date(now.getFullYear(), month - 1, day, hour, minute, 0, 0);

        // 如果日期是未来的（比如在12月解析1月的日期），说明是去年的
        if (result > now) {
          result.setFullYear(now.getFullYear() - 1);
        }

        return result;
      }
    }

    // 处理 ISO 格式日期
    const isoMatch = timeText.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) {
      return new Date(isoMatch[0]);
    }

    return null;
  }

  private extractTotalCount($: cheerio.CheerioAPI): number {
    // 方法1：从顶部统计信息提取 "找到 XXX 条"
    const countText = $('span.s-text2').first().text();
    let match = countText.match(/找到\s*([\d,]+)\s*条/);

    if (match && match[1]) {
      return Number.parseInt(match[1].replace(/,/g, ''), 10);
    }

    // 方法2：从分页信息推算总数（最大页码 × 每页数量）
    const pageLinks = $('div.m-page ul li a');
    let maxPage = 0;

    pageLinks.each((_i: number, link: any) => {
      const text = $(link).text().trim();
      const pageMatch = text.match(/第(\d+)页/);
      if (pageMatch && pageMatch[1]) {
        const page = Number.parseInt(pageMatch[1], 10);
        if (page > maxPage) {
          maxPage = page;
        }
      }
    });

    // 如果找到最大页码，假设每页10-20条（这里用保守估计）
    if (maxPage > 0) {
      // 保守估计：最大页 × 10
      // 实际可能更多，但至少能表明有数据
      return maxPage * 10;
    }

    // 方法3：如果有微博卡片，至少返回卡片数量
    const cardCount = $('div.card').length;
    if (cardCount > 0) {
      return cardCount;
    }

    return 0;
  }
}

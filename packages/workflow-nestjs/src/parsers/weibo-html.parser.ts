import * as cheerio from 'cheerio';
import { PinoLogger } from '@pro/logger';
import { Injectable } from '@nestjs/common';

export interface ParsedSearchResult {
  postIds: string[];
  hasNextPage: boolean;
  lastPostTime: Date | null;
  totalCount: number;
}

@Injectable()
export class WeiboHtmlParser {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(WeiboHtmlParser.name);
  }

  parseSearchResultHtml(html: string): ParsedSearchResult {
    try {
      const $ = cheerio.load(html);

      const postIds = this.extractPostIds($);
      const hasNextPage = this.hasNextPage($);
      const lastPostTime = this.extractLastPostTime($);
      const totalCount = this.extractTotalCount($);

      this.logger.debug('HTML解析完成', {
        postIdsCount: postIds.length,
        hasNextPage,
        lastPostTime,
        totalCount,
      });

      return {
        postIds,
        hasNextPage,
        lastPostTime,
        totalCount,
      };
    } catch (error) {
      this.logger.error('HTML解析失败', {
        error: error instanceof Error ? error.message : String(error),
      });

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

    $('div[action-type="feed_list_item"]').each((_index: number, element: any) => {
      const mid = $(element).attr('mid');
      if (mid) {
        postIds.push(mid);
      }
    });

    $('div.card-wrap').each((_index: number, element: any) => {
      const mid = $(element).attr('mid');
      if (mid && !postIds.includes(mid)) {
        postIds.push(mid);
      }
    });

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
    const timeElements = $('p.from a');

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

    if (timeText.includes('分钟前')) {
      const minutes = Number.parseInt(timeText, 10);
      if (Number.isFinite(minutes)) {
        return new Date(now.getTime() - minutes * 60 * 1000);
      }
    }

    if (timeText.includes('小时前')) {
      const hours = Number.parseInt(timeText, 10);
      if (Number.isFinite(hours)) {
        return new Date(now.getTime() - hours * 60 * 60 * 1000);
      }
    }

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

    if (timeText.includes('月') && timeText.includes('日')) {
      const match = timeText.match(/(\d{1,2})月(\d{1,2})日/);
      if (match && match[1] && match[2]) {
        const result = new Date(now.getFullYear(),
          Number.parseInt(match[1], 10) - 1,
          Number.parseInt(match[2], 10)
        );
        return result;
      }
    }

    const isoMatch = timeText.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) {
      return new Date(isoMatch[0]);
    }

    return null;
  }

  private extractTotalCount($: cheerio.CheerioAPI): number {
    const countText = $('span.s-text2').first().text();
    const match = countText.match(/找到\s*([\d,]+)\s*条/);

    if (match && match[1]) {
      return Number.parseInt(match[1].replace(/,/g, ''), 10);
    }

    return 0;
  }
}

import * as cheerio from 'cheerio';
import { Injectable } from '@pro/core';

export interface ParsedSearchResult {
  posts: { mid: string, uid: string, postAt: Date | null }[];
  hasNextPage: boolean;
  lastPostTime: Date | null;
  totalCount: number;
  nextPageLink: string | undefined;
  currentPage: number;
  totalPage: number;
}

@Injectable()
export class WeiboHtmlParser {
  constructor() { }

  parseSearchResultHtml(html: string): ParsedSearchResult {
    try {
      // 检测登录失效：多特征检测（兼容新旧版本登录页面）
      const isLoginPage =
        html.includes('passport.weibo.com/sso/signin') ||  // 旧版登录页
        html.includes('h5.sinaimg.cn/m/login/') ||          // 新版登录页资源
        html.includes('<title>登录 - 微博</title>') ||      // 登录页标题
        html.includes('扫描二维码登录');                      // 登录页面文本

      if (isLoginPage) {
        console.log('[WeiboHtmlParser] 检测到登录失效（登录页面）');
        throw new Error('LOGIN_EXPIRED');
      }

      console.log(`[WeiboHtmlParser] 开始解析 HTML，长度: ${html.length}`);

      const $ = cheerio.load(html);

      const posts = this.extractPostsInfo($);
      const postIds = posts.map((p) => p.mid);

      console.log(`[WeiboHtmlParser] 提取到 ${posts.length} 条微博`);

      // 从 posts 数组中找出最早的时间（即最后一条微博的时间）
      const lastPostTime = posts.reduce<Date | null>((earliest, post) => {
        if (!post.postAt) return earliest;
        if (!earliest) return post.postAt;
        return post.postAt < earliest ? post.postAt : earliest;
      }, null);

      const totalCount = this.extractTotalCount(postIds);
      const nextPageLink = this.extractNextPageLink($);
      const currentPage = this.extractCurrentPage($);
      const totalPage = this.extractTotalPage($);

      console.log(`[WeiboHtmlParser] 分页信息: currentPage=${currentPage}, totalPage=${totalPage}, nextPageLink=${nextPageLink}`);

      // 修复逻辑：只有在有 posts 且有 nextPageLink 时才认为有下一页
      const hasNextPage = posts.length > 0 && !!nextPageLink && currentPage < totalPage;

      console.log(`[WeiboHtmlParser] hasNextPage=${hasNextPage}`);

      return {
        posts,
        hasNextPage,
        lastPostTime,
        totalCount,
        nextPageLink,
        currentPage,
        totalPage,
      };
    } catch (error) {
      // 如果是登录失效错误，向上抛出
      if (error instanceof Error && error.message === 'LOGIN_EXPIRED') {
        throw error;
      }

      console.error('[WeiboHtmlParser] 解析失败:', error);

      // 其他解析错误返回空结果
      return {
        posts: [],
        hasNextPage: false,
        lastPostTime: null,
        totalCount: 0,
        nextPageLink: undefined,
        currentPage: 1,
        totalPage: 0,
      };
    }
  }

  private extractPostsInfo($: cheerio.CheerioAPI): Array<{ uid: string; mid: string; postAt: Date | null }> {
    const posts: Array<{ uid: string; mid: string; postAt: Date | null }> = [];
    const seenMids = new Set<string>();

    // 策略1（主）：从详情链接提取 mid、uid 和 postAt
    // 格式：//weibo.com/:uid/:mid
    $('div.card').each((_index: number, element: any) => {
      const $card = $(element);

      // 正确的选择器：div.from > a（不是 p.from a）
      const detailLink = $card.find('div.from > a[href*="/weibo.com/"]').first();
      const href = detailLink.attr('href');

      if (href) {
        // 匹配格式：//weibo.com/:uid/:mid
        // 示例：//weibo.com/7838912856/Qb83goWjj?refer_flag=1001030103_
        const match = href.match(/\/\/weibo\.com\/(\d+)\/([A-Za-z0-9]+)/);

        if (match && match[1] && match[2]) {
          const uid = match[1];
          const mid = match[2];

          // 去重检查
          if (!seenMids.has(mid)) {
            seenMids.add(mid);

            // 提取时间信息（从同一个 a 标签的文本）
            const timeText = detailLink.text().trim();
            const postAt = this.parseTimeText(timeText);

            posts.push({ uid, mid, postAt });
          }
        }
      }
    });

    // 策略2（备用）：从 div[mid] 属性提取（数字型ID）
    if (posts.length === 0) {
      $('div[action-type="feed_list_item"]').each((_index: number, element: any) => {
        const $item = $(element);
        const mid = $item.attr('mid');

        if (mid && !seenMids.has(mid)) {
          seenMids.add(mid);

          // 尝试从用户链接提取 uid
          const userLink = $item.find('div.avator a, a.name').first().attr('href');
          const uidMatch = userLink?.match(/\/\/weibo\.com\/(\d+)/);
          const uid = uidMatch?.[1] || '';

          // 提取时间
          const timeElement = $item.find('div.from > a').first();
          const timeText = timeElement.text().trim();
          const postAt = this.parseTimeText(timeText);

          posts.push({ uid, mid, postAt });
        }
      });
    }

    return posts;
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

    // 处理 "昨天 HH:MM"
    if (timeText.includes('昨天')) {
      const match = timeText.match(/(\d{1,2}):(\d{2})/);
      if (match && match[1] && match[2]) {
        const result = new Date(now);
        result.setDate(result.getDate() - 1);
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

  private extractTotalCount(postIds: string[]): number {
    // 直接返回当前页抓取到的数量
    return postIds.length;
  }

  private extractNextPageLink($: cheerio.CheerioAPI): string | undefined {
    // 从 a.next 提取下一页链接
    const nextLink = $('div.m-page a.next').attr('href');
    if (nextLink) {
      return nextLink.startsWith('http') ? nextLink : `https://s.weibo.com${nextLink}`;
    }
    return undefined;
  }

  private extractCurrentPage($: cheerio.CheerioAPI): number {
    // 方法1：从 .pagenum 提取
    const pageText = $('div.m-page .pagenum').first().text();
    const match = pageText.match(/第(\d+)页/);
    if (match && match[1]) {
      return Number.parseInt(match[1], 10);
    }

    // 方法2：从 .s-scroll 中查找 .cur 类
    const curPageText = $('div.m-page .s-scroll li.cur a').text();
    const curMatch = curPageText.match(/第(\d+)页/);
    if (curMatch && curMatch[1]) {
      return Number.parseInt(curMatch[1], 10);
    }

    return 1; // 默认第1页
  }

  private extractTotalPage($: cheerio.CheerioAPI): number {
    let maxPage = 0;

    // 从分页列表中提取所有页码
    $('div.m-page .s-scroll li a').each((_i: number, link: any) => {
      const text = $(link).text().trim();
      const match = text.match(/第(\d+)页/);
      if (match && match[1]) {
        const page = Number.parseInt(match[1], 10);
        if (page > maxPage) {
          maxPage = page;
        }
      }
    });

    return maxPage;
  }
}

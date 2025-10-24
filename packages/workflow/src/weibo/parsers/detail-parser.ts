import * as cheerio from 'cheerio';
import { WeiboDetailInfo } from '../types';

/**
 * 微博详情链接解析器
 * 专门负责从HTML中提取微博详情页面的链接信息
 */
export class WeiboDetailParser {
  /**
   * 从帖子元素中提取详情链接
   * 遍历所有帖子元素，提取每个帖子的详情链接信息
   */
  extractDetailLinks($: cheerio.CheerioAPI): WeiboDetailInfo[] {
    const detailInfos: WeiboDetailInfo[] = [];

    $('.card-wrap').each((_, element) => {
      const $post = $(element);
      const detailLink = $post.find('.from a').attr('href') || $post.find('.content a').attr('href');
      const detailInfo = this.parseDetailLink(detailLink);
      detailInfos.push(detailInfo);
    });

    return detailInfos;
  }

  /**
   * 解析单个详情链接
   * 从链接中提取用户ID和微博ID，构建完整的详情URL
   */
  parseDetailLink(detailLink?: string): WeiboDetailInfo {
    if (!detailLink) {
      return { detailUrl: null, uid: null, mid: null };
    }

    const weiboPattern = /\/(\w+)\/(\w+)(?:\?.*)?$/;
    const match = detailLink.match(weiboPattern);

    if (match) {
      const uid = match[1];
      const mid = match[2];
      const detailUrl = `https://weibo.com/${uid}/${mid}`;

      return { detailUrl, uid, mid };
    }

    return { detailUrl: detailLink, uid: null, mid: null };
  }

  /**
   * 批量提取详情链接
   * 从HTML字符串中直接提取所有详情链接
   */
  extractDetailLinksFromHtml(html: string): WeiboDetailInfo[] {
    const $ = cheerio.load(html);
    return this.extractDetailLinks($);
  }
}
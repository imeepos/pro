import * as cheerio from 'cheerio';
import { WeiboPost, WeiboDetailInfo, DeviceLocationInfo } from '../types';
import { WeiboTimeParser } from '../utils/time-parser';

/**
 * 微博帖子解析器
 * 负责从HTML中提取微博帖子信息，每个方法都有其不可替代的职责
 */
export class WeiboPostParser {
  /**
   * 解析微博帖子列表
   * 从HTML中提取所有帖子的结构化信息
   */
  parsePosts($: cheerio.CheerioAPI): WeiboPost[] {
    const posts: WeiboPost[] = [];

    $('.card-wrap').each((index, element) => {
      const $post = $(element);
      const content = $post.find('.txt').text().trim();

      // 只有包含内容的帖子才进行解析
      if (content) {
        const post = this.parseSinglePost($post, index, content);
        posts.push(post);
      }
    });

    return posts;
  }

  /**
   * 解析单个微博帖子
   * 提取帖子的完整信息，包括内容、作者、互动数据等
   */
  private parseSinglePost($post: cheerio.Cheerio<any>, _index: number, content: string): WeiboPost {
    const author = $post.find('.name').text().trim();
    const time = $post.find('.from').text().trim();
    const parsedTime = WeiboTimeParser.parse(time);

    const reposts = this.extractInteractionCount($post, '.card-act li:first-child');
    const comments = this.extractInteractionCount($post, '.card-act li:nth-child(2)');
    const likes = this.extractInteractionCount($post, '.card-act li:last-child');

    const detailLink = $post.find('.from a').attr('href') || $post.find('.content a').attr('href');
    const { detailUrl, uid, mid } = this.extractDetailInfo(detailLink);
    const { device, location, source } = this.extractDeviceAndLocationInfo(time);

    return {
      content,
      author,
      time,
      parsedTime,
      reposts,
      comments,
      likes,
      detailUrl,
      uid,
      mid,
      device,
      location,
      source
    };
  }

  /**
   * 提取互动数据
   * 从指定的选择器中提取数字形式的互动数据
   */
  private extractInteractionCount($post: cheerio.Cheerio<any>, selector: string): number {
    const text = $post.find(selector).text();
    const count = text.replace(/[^0-9]/g, '') || '0';
    return parseInt(count);
  }

  /**
   * 提取微博详情信息
   * 从详情链接中解析出用户ID和微博ID
   */
  private extractDetailInfo(detailLink?: string): WeiboDetailInfo {
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
   * 提取设备和位置信息
   * 从时间文本中解析出设备类型、地理位置和来源信息
   */
  private extractDeviceAndLocationInfo(timeText: string): DeviceLocationInfo {
    if (!timeText) {
      return { device: null, location: null, source: null };
    }

    const fromPattern = /来自\s*([^\n\r]+)/;
    const match = timeText.match(fromPattern);

    if (!match) {
      return { device: null, location: null, source: null };
    }

    const fromInfo = match[1].trim();
    let device: string | null = null;
    let location: string | null = null;
    let source: string | null = null;

    // 设备类型识别
    const devicePatterns = [
      /iPhone\s+\d+.*/,           // iPhone 系列
      /Xiaomi\s+\d+/,             // 小米系列
      /HUAWEI\s+\w+/,             // 华为系列
      /OPPO\s+\w+/,               // OPPO系列
      /vivo\s+\w+/,               // vivo系列
      /iPad.*/,                    // iPad系列
      /Mac.*/,                     // Mac系列
      /Android.*/,                 // Android设备
      /微博视频号/,                 // 微博视频号
      /微博直播/,                   // 微博直播
      /微博客户端/,                 // 微博客户端
      /网页版/,                     // 网页版
      /小程序/                      // 小程序
    ];

    // 地理位置识别
    const locationPatterns = [
      /北京/, /上海/, /广州/, /深圳/, /杭州/, /成都/, /武汉/, /南京/, /西安/, /重庆/,
      /天津/, /苏州/, /郑州/, /长沙/, /青岛/, /沈阳/, /大连/, /宁波/, /厦门/, /福州/
    ];

    // 来源识别
    const sourcePatterns = [
      /超话$/, /话题$/, /频道$/
    ];

    // 检查设备类型
    for (const pattern of devicePatterns) {
      if (pattern.test(fromInfo)) {
        device = fromInfo;
        break;
      }
    }

    // 检查地理位置
    for (const pattern of locationPatterns) {
      if (pattern.test(fromInfo)) {
        location = fromInfo;
        break;
      }
    }

    // 检查来源
    for (const pattern of sourcePatterns) {
      if (pattern.test(fromInfo)) {
        source = fromInfo;
        break;
      }
    }

    // 如果都没有匹配，默认设为来源
    if (!device && !location && !source) {
      source = fromInfo;
    }

    return { device, location, source };
  }
}
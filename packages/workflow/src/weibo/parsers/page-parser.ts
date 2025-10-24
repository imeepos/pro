import * as cheerio from 'cheerio';

/**
 * 微博页码解析器
 * 负责从HTML中提取分页相关信息，包括当前页码和下一页链接
 */
export class WeiboPageParser {
  /**
   * 解析当前页码
   * 从分页组件中提取当前页码信息
   */
  parseCurrentPage($: cheerio.CheerioAPI): number {
    const currentPageText = $('.s-scroll .page .current').text().trim();

    if (currentPageText) {
      const pageMatch = currentPageText.match(/(\d+)/);
      if (pageMatch) {
        return parseInt(pageMatch[1]);
      }
    }

    // 如果没有找到明确的页码，默认为第一页
    return 1;
  }

  /**
   * 解析下一页地址
   * 提取下一页的链接地址，处理相对路径和绝对路径
   */
  parseNextPageUrl($: cheerio.CheerioAPI, currentUrl?: string): string | null {
    const nextPageLink = $('a.next').attr('href') || $('.page .next').attr('href');

    if (nextPageLink) {
      return this.normalizeUrl(nextPageLink, currentUrl);
    }

    return null;
  }

  /**
   * 解析最大页码
   * 从分页组件中智能提取最大页码数字
   */
  parseMaxPage($: cheerio.CheerioAPI): number {
    // 收集所有分页链接中的数字
    const pageNumbers: number[] = [];

    // 扫描常见的分页选择器
    const selectors = [
      '.s-scroll .page a',
      '.page a',
      '.pagelist a',
      'a[href*="page="]'
    ];

    selectors.forEach(selector => {
      $(selector).each((_, element) => {
        const text = $(element).text().trim();

        // 匹配纯数字页码
        if (/^\d+$/.test(text)) {
          pageNumbers.push(parseInt(text));
        }

        // 从href中提取page参数
        const href = $(element).attr('href');
        if (href) {
          const pageMatch = href.match(/page=(\d+)/);
          if (pageMatch) {
            pageNumbers.push(parseInt(pageMatch[1]));
          }
        }
      });
    });

    // 返回最大页码，若无法解析则返回50作为合理默认值
    return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 50;
  }

  /**
   * 规范化URL
   * 将相对路径转换为绝对路径
   */
  private normalizeUrl(url: string, baseUrl?: string): string {
    if (url.startsWith('/') && baseUrl) {
      return new URL(url, baseUrl).href;
    }
    return url;
  }
}
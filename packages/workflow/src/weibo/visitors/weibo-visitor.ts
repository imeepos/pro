import * as cheerio from 'cheerio';
import { HtmlParserAst, EmptyVisitor } from '../../ast';
import { WeiboPostParser } from '../parsers/post-parser';
import { WeiboPageParser } from '../parsers/page-parser';

/**
 * 微博专用的访问者实现
 * 专门处理微博相关的HTML解析任务，职责单一且明确
 */
export class WeiboVisitor extends EmptyVisitor {
  private postParser: WeiboPostParser;
  private pageParser: WeiboPageParser;

  constructor() {
    super();
    this.postParser = new WeiboPostParser();
    this.pageParser = new WeiboPageParser();
  }

  /**
   * 访问HTML解析AST节点
   * 专门处理微博页面的HTML解析任务
   */
  async visitHtmlParserAst(ast: HtmlParserAst): Promise<any> {
    if (!ast.html) {
      ast.state = 'fail';
      return ast;
    }

    try {
      const $ = cheerio.load(ast.html);

      // 使用专门的解析器处理不同部分
      const posts = this.postParser.parsePosts($);
      if (posts.length > 0) {
        const currentPage = this.pageParser.parseCurrentPage($);
        const nextPageUrl = this.pageParser.parseNextPageUrl($, ast.url);
        const maxPage = this.pageParser.parseMaxPage($);
        const minTime = posts[posts.length - 1].parsedTime!
        ast.posts = posts;
        ast.currentPage = currentPage;
        ast.nextPageUrl = nextPageUrl;
        ast.maxPage = maxPage;
        ast.minDate = minTime;
        ast.state = 'success';
        // if (ast.currentPage < ast.maxPage) {
        //   // 发送事件到mq
        //   await ctx.send('weibo_page', {
        //     keyword: `国庆`,
        //     url: ast.nextPageUrl,
        //     start: ast.start,
        //     end: ast.minDate
        //   })
        // } else {
        //   await ctx.send('weibo_search', {
        //     keyword: `国庆`,
        //     start: ast.start,
        //     end: ast.minDate
        //   })
        // }
        // if (ast.posts && ast.posts.length > 0) {
        //   await Promise.all(ast.posts.map(async post => {
        //     ctx.send(`weibo_detail`, {
        //       keyword: `国庆`,
        //       mid: post.mid
        //     })
        //   }))
        // }
        return ast;
      }
      ast.state = 'success';
      return ast;
    } catch (error) {
      console.error('微博HTML解析失败:', error);
      ast.state = 'fail';
      return ast;
    }
  }
}
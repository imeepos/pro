import { Handler, HtmlParserAst, Visitor, NoRetryError } from '@pro/workflow-core';
import { Inject, Injectable } from '@pro/core';
import { WeiboHtmlParser } from './parsers/weibo-html.parser';

@Handler(HtmlParserAst)
@Injectable()
export class HtmlParserAstVisitor {
  constructor(@Inject(WeiboHtmlParser) private readonly parser: WeiboHtmlParser) { }

  async visit(ast: HtmlParserAst, _ctx: Visitor): Promise<HtmlParserAst> {
    ast.state = 'running';

    if (!ast.html) {
      ast.state = 'fail';
      throw new Error('HtmlParserAst: html 字段为空');
    }

    try {
      const result = this.parser.parseSearchResultHtml(ast.html);
      // 提取循环所需属性到顶层，便于条件边检查
      ast.hasNextPage = result.hasNextPage;
      ast.nextPageLink = result.nextPageLink;

      // 默认重置为 false，避免保留上一次的值
      ast.hasNextSearch = false;
      ast.nextEndDate = undefined;

      // 判断是否需要缩小日期范围继续搜索
      // 两种情况会触发：
      // 1. 当前页达到50页封顶 → 数据量大，必须缩小日期范围
      // 2. 无下一页 + 时间差>=1小时 → 当前范围爬完但还有更早数据
      if (result.lastPostTime && ast.startDate) {
        const lastPostTime = new Date(result.lastPostTime);
        const startDate = new Date(ast.startDate);
        const timeGapMs = lastPostTime.getTime() - startDate.getTime();
        const isMaxPage = result.currentPage === 50;
        const hasTimeGap = timeGapMs >= 1 * 60 * 60 * 1000;

        if (isMaxPage || (!result.hasNextPage && hasTimeGap)) {
          ast.hasNextSearch = true;
          ast.nextEndDate = lastPostTime;
        }
      }

      ast.result = result;
      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';

      // 如果是登录失效错误，抛出 NoRetryError 避免死循环
      if (error instanceof Error && error.message === 'LOGIN_EXPIRED') {
        throw new NoRetryError('账号登录已失效，需要重新登录', error);
      }

      throw error;
    }

    return ast;
  }
}

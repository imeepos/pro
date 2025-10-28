import { Handler, HtmlParserAst, Visitor } from '@pro/workflow-core';
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
      console.log(`---------------------`)
      console.log('[HtmlParserAst] Parse result:', result)
      console.log(`---------------------`)

      // 提取循环所需属性到顶层，便于条件边检查
      ast.hasNextPage = result.hasNextPage;
      ast.nextPageLink = result.nextPageLink;

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
          console.log('[HtmlParserAst] Time window switch triggered:', {
            isMaxPage,
            hasNextPage: result.hasNextPage,
            hasTimeGap,
            timeGapMs,
            nextEndDate: lastPostTime.toISOString(),
            startDate: startDate.toISOString()
          });
        } else {
          console.log('[HtmlParserAst] Time window switch NOT triggered:', {
            isMaxPage,
            hasNextPage: result.hasNextPage,
            hasTimeGap,
            timeGapMs,
            lastPostTime: lastPostTime.toISOString(),
            startDate: startDate.toISOString()
          });
        }
      }

      ast.result = result;
      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      throw error;
    }

    return ast;
  }
}

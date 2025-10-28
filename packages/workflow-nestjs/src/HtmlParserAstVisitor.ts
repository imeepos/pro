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
      // 提取循环所需属性到顶层，便于条件边检查
      ast.hasNextPage = result.hasNextPage;
      ast.nextPageLink = result.nextPageLink;
      if (result.lastPostTime && ast.startDate) {
        const lastPostTime = new Date(result.lastPostTime!)
        const startDate = new Date(ast.startDate!)
        const decTime = lastPostTime.getTime() - startDate.getTime()
        if (decTime >= 1 * 60 * 60 * 1000) {
          ast.hasNextSearch = true;
          ast.nextEndDate = lastPostTime;
        }
      }

      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      throw error;
    }

    return ast;
  }
}

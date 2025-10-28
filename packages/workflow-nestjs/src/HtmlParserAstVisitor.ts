import { Handler, HtmlParserAst, Visitor } from '@pro/workflow-core';
import { Inject, Injectable } from '@pro/core';
import { WeiboHtmlParser } from './parsers/weibo-html.parser';

@Handler(HtmlParserAst)
@Injectable()
export class HtmlParserAstVisitor {
  constructor(@Inject(WeiboHtmlParser) private readonly parser: WeiboHtmlParser) {}

  async visit(ast: HtmlParserAst, _ctx: Visitor): Promise<HtmlParserAst> {
    ast.state = 'running';

    if (!ast.html) {
      ast.state = 'fail';
      throw new Error('HtmlParserAst: html 字段为空');
    }

    try {
      ast.result = this.parser.parseSearchResultHtml(ast.html);

      // 提取循环所需属性到顶层，便于条件边检查
      ast.hasNextPage = ast.result.hasNextPage;
      ast.nextPageLink = ast.result.nextPageLink;

      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      throw error;
    }

    return ast;
  }
}

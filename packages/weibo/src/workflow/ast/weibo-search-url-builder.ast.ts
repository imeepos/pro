import { Ast, Input, Output, WorkflowNode, Context } from '@pro/workflow';

/**
 * 微博搜索 URL 构建节点
 *
 * 根据关键词、时间范围和搜索类型构建微博搜索 URL
 */
@WorkflowNode('WeiboSearchUrlBuilder')
export class WeiboSearchUrlBuilderAst extends Ast {
  @Input() keyword!: string;
  @Input() start!: Date;
  @Input() end!: Date;
  @Input() page?: number;
  @Input() searchType?: string;

  @Output() url!: string;

  type = 'WeiboSearchUrlBuilderAst' as const;

  visit(visitor: any, ctx: Context): Promise<any> {
    return visitor.visit(this, ctx);
  }
}

export function createWeiboSearchUrlBuilderAst(options: {
  keyword: string;
  start: Date;
  end: Date;
  page?: number;
  searchType?: string;
  id?: string;
  state?: any;
}) {
  const ast = new WeiboSearchUrlBuilderAst();
  ast.keyword = options.keyword;
  ast.start = options.start;
  ast.end = options.end;
  ast.page = options.page;
  ast.searchType = options.searchType;
  if (options.id) ast.id = options.id;
  if (options.state) ast.state = options.state;
  return ast;
}

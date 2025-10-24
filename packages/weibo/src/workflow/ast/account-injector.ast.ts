import { Ast, Input, Output, WorkflowNode, Context } from '@pro/workflow';

/**
 * 账号注入节点
 *
 * 为请求注入微博账号的 Cookie 和 Headers
 */
@WorkflowNode('AccountInjector')
export class AccountInjectorAst extends Ast {
  @Input() url?: string;
  @Input() taskId?: number;
  @Input() taskName?: string;

  @Output() cookies!: string;
  @Output() headers!: Record<string, string>;
  @Output() selectedAccountId?: number;

  type = 'AccountInjectorAst' as const;

  visit(visitor: any, ctx: Context): Promise<any> {
    return visitor.visit(this, ctx);
  }
}

export function createAccountInjectorAst(options: {
  url?: string;
  taskId?: number;
  taskName?: string;
  id?: string;
  state?: any;
} = {}) {
  const ast = new AccountInjectorAst();
  ast.url = options.url;
  ast.taskId = options.taskId;
  ast.taskName = options.taskName;
  if (options.id) ast.id = options.id;
  ast.state = options.state || 'pending';
  return ast;
}

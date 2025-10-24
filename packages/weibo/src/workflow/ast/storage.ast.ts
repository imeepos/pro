import { Ast, Input, Output, WorkflowNode, Context } from '@pro/workflow';

/**
 * 存储节点
 *
 * 将爬取的原始数据存储到 MongoDB
 */
@WorkflowNode('Storage')
export class StorageAst extends Ast {
  @Input() storageType?: string;
  @Input() platform?: string;
  @Input() url?: string;
  @Input() raw?: string;
  @Input() metadata?: Record<string, unknown>;

  @Output() stored?: boolean;

  type = 'StorageAst' as const;

  visit(visitor: any, ctx: Context): Promise<any> {
    return visitor.visit(this, ctx);
  }
}

export function createStorageAst(options: {
  type?: string;
  platform?: string;
  url?: string;
  raw?: string;
  metadata?: Record<string, unknown>;
  id?: string;
  state?: any;
} = {}) {
  const ast = new StorageAst();
  ast.storageType = options.type;
  ast.platform = options.platform;
  ast.url = options.url;
  ast.raw = options.raw;
  ast.metadata = options.metadata;
  if (options.id) ast.id = options.id;
  ast.state = options.state || 'pending';
  return ast;
}

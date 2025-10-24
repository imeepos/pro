import { Injectable } from '@nestjs/common';
import {
  Ast,
  Context,
  ExecutorVisitor,
  WORKFLOW_NODE_METADATA,
  getVisitMethods,
} from '@pro/workflow';
import { WeiboWorkflowVisitor } from '@pro/weibo';

type NodeHandler = (ast: Ast, ctx: Context) => Promise<any>;

@Injectable()
export class CrawlerWorkflowVisitor extends ExecutorVisitor {
  private readonly handlers = new Map<string, NodeHandler>();

  constructor(private readonly weiboVisitor: WeiboWorkflowVisitor) {
    super();
    this.registerVisitor(weiboVisitor);
  }

  async visit(ast: Ast, ctx: Context): Promise<any> {
    const nodeType = this.resolveNodeType(ast);
    if (nodeType) {
      const handler = this.handlers.get(nodeType);
      if (handler) {
        return handler(ast, ctx);
      }
    }

    return super.visit(ast, ctx);
  }

  private registerVisitor(visitor: object): void {
    const methods = getVisitMethods(visitor.constructor);
    methods.forEach(({ nodeType, methodName }) => {
      const method = (visitor as Record<string, NodeHandler>)[methodName as string];
      if (typeof method === 'function') {
        this.handlers.set(nodeType, method.bind(visitor));
      }
    });
  }

  private resolveNodeType(ast: Ast): string | undefined {
    const decoratorType = Reflect.getMetadata(WORKFLOW_NODE_METADATA, ast.constructor);
    return decoratorType || ast.type;
  }
}

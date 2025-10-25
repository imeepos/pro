import { Injectable } from '@nestjs/common';
import { WorkflowVisitor, VisitMethod, type Context } from '@pro/workflow';
import type { AccountInjectorAst } from '../ast/account-injector.ast.js';
import type { StorageAst } from '../ast/storage.ast.js';

/**
 * 微博工作流访问者
 *
 * 实现微博业务节点的具体执行逻辑
 */
@Injectable()
@WorkflowVisitor()
export class WeiboWorkflowVisitor {

  /**
   * 访问账号注入节点
   */
  @VisitMethod('AccountInjector')
  async visitAccountInjector(ast: AccountInjectorAst, ctx: Context) {
    const weiboAccountService = ctx.weiboAccountService;

    if (!weiboAccountService) {
      ast.state = 'fail';
      throw new Error('weiboAccountService 未在 context 中提供');
    }

    const request: { headers: Record<string, string> } = { headers: {} };
    const selection = await weiboAccountService.injectCookies(request, {
      taskId: ast.taskId,
      taskName: ast.taskName,
    });

    ast.cookies = request.headers?.Cookie || '';
    ast.headers = request.headers;
    ast.userAgent = request.headers?.['User-Agent'] || request.headers?.['user-agent'] || '';
    ast.selectedAccountId = selection?.id;
    ast.state = 'success';
    return ast;
  }

  /**
   * 访问存储节点
   */
  @VisitMethod('Storage')
  async visitStorage(ast: StorageAst, ctx: Context) {
    const storage = ctx.storage;

    if (!storage) {
      ast.state = 'fail';
      throw new Error('storage 未在 context 中提供');
    }

    const { storageType, platform, url, raw, metadata } = ast;

    if (!storageType || !platform || !url || !raw) {
      ast.state = 'fail';
      throw new Error('缺少必要存储参数: storageType, platform, url, raw');
    }

    const stored = await storage.store({
      type: storageType,
      platform,
      url,
      raw,
      metadata,
    });

    ast.stored = stored;
    ast.state = 'success';
    return ast;
  }
}

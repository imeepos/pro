import { Injectable } from '@nestjs/common';
import { WorkflowVisitor, VisitMethod, type Context } from '@pro/workflow';
import type { WeiboSearchUrlBuilderAst } from '../ast/weibo-search-url-builder.ast.js';
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
   * 访问微博搜索 URL 构建节点
   */
  @VisitMethod('WeiboSearchUrlBuilder')
  async visitWeiboSearchUrlBuilder(ast: WeiboSearchUrlBuilderAst, ctx: Context) {
    const { keyword, start, end, page = 1, searchType = 'DEFAULT' } = ast;
    const weiboConfig = ctx.weiboConfig;

    if (!keyword || !start || !end) {
      ast.state = 'fail';
      throw new Error('缺少必要参数: keyword, start, end');
    }

    const endpointKey: Record<string, string> = {
      DEFAULT: 'default',
      REAL_TIME: 'realTime',
      POPULAR: 'popular',
      VIDEO: 'video',
      USER: 'user',
      TOPIC: 'topic',
    };

    const base =
      weiboConfig?.searchEndpoints?.[endpointKey[searchType] || 'default'] ||
      'https://s.weibo.com/weibo';
    const params = new URLSearchParams({ q: keyword, page: String(page) });

    if (searchType === 'REAL_TIME') {
      params.set('type', 'realtime');
      params.set('nodup', '1');
    } else if (searchType === 'POPULAR') {
      params.set('sort', 'hot');
      params.set('xsort', 'hot');
    } else {
      const formatDate = (date: Date) => [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
        String(date.getHours()).padStart(2, '0'),
      ].join('-');
      params.set('timescope', `custom:${formatDate(start)}:${formatDate(end)}`);
    }

    ast.url = `${base}?${params.toString()}`;
    ast.state = 'success';
    return ast;
  }

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
